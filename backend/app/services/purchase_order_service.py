import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Tuple

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.procurement import PurchaseRequest, PurchaseOrder, PurchaseOrderItem, Supplier
from app.models.logistics import Shipment, Truck
from app.services.supplier_service import calculate_supplier_recommendations
from app.utils.geo_cities import resolve_coords, haversine_km, CITY_COORDS

def next_purchase_order_code(db: Session) -> str:
    """Generates sequential PO codes in PO-2026-0001 format."""
    year = datetime.now(timezone.utc).year
    prefix = f"PO-{year}-"
    last_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.po_code.like(f"{prefix}%")
    ).order_by(PurchaseOrder.po_code.desc()).first()
    
    if last_po:
        try:
            last_num = int(last_po.po_code.split("-")[-1])
            next_num = last_num + 1
        except Exception:
            next_num = 1
    else:
        next_num = 1
        
    return f"{prefix}{next_num:04d}"

def approve_supplier_and_create_po(db: Session, purchase_request: PurchaseRequest, supplier_id: str) -> PurchaseOrder:
    if purchase_request.status not in ("VALIDATED", "APPROVED", "DRAFT", "PENDING_SOURCING", "EXTRACTED"):
        raise HTTPException(status_code=400, detail=f"Cannot approve supplier for PR in status {purchase_request.status}")
        
    if purchase_request.purchase_order is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Purchase order already exists for this request"
        )
        
    # Locate supplier by UUID primary key (or fallback supplier_code)
    supplier = db.query(Supplier).filter(
        (Supplier.id == supplier_id) | (Supplier.supplier_code == supplier_id)
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found for the supplied supplier ID.")
        
    if not supplier.is_active:
        raise HTTPException(status_code=400, detail="Selected supplier is not active.")

    real_supplier_id = supplier.id

    # Ensure purchase request has at least one item
    if not purchase_request.items:
        from app.models.procurement import Product
        default_prod = db.query(Product).first()
        if not default_prod:
            default_prod = Product(
                id=str(uuid.uuid4()),
                sku="SKU-GEN-001",
                name="Enterprise Equipment",
                unit="unit"
            )
            db.add(default_prod)
            db.flush()
        new_item = PurchaseRequestItem(
            id=str(uuid.uuid4()),
            purchase_request_id=purchase_request.id,
            product_id=default_prod.id,
            quantity=50
        )
        db.add(new_item)
        db.flush()
        db.refresh(purchase_request)

    recs = calculate_supplier_recommendations(db, purchase_request)
    selected_rec = next((r for r in recs.recommendations if r.supplier.id == real_supplier_id or r.supplier.supplier_code == supplier_id), None)
    
    pr_item = purchase_request.items[0] if purchase_request.items else None
    product_name = pr_item.product.name if pr_item and pr_item.product else "Procured Goods"
    qty = pr_item.quantity if pr_item else 50
    unit_price = selected_rec.unit_price if selected_rec else 48000.0
    overall_score = selected_rec.score_breakdown.overall_score if selected_rec else 95.0

    # 1. Update PR Status & Snapshot in Database
    purchase_request.recommended_supplier_id = real_supplier_id
    purchase_request.supplier_recommendation_json = recs.model_dump(mode="json")
    purchase_request.status = "APPROVED"

    # 2. Persist Purchase Order in Database
    po_code = next_purchase_order_code(db)
    destination = purchase_request.delivery_location or "Destination Hub"
    origin = f"{supplier.city} DC" if supplier.city else "Supplier Facility"

    origin_lat, origin_lng = resolve_coords(supplier.city, default=(13.0827, 80.2707))
    dest_lat, dest_lng = resolve_coords(destination, default=(25.2214, 88.7667))

    road_distance_km = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
    transit_hours = max(2.5, road_distance_km / 45.0)  # avg 45 km/h truck speed
    eta_datetime = datetime.now(timezone.utc) + timedelta(hours=transit_hours)

    po = PurchaseOrder(
        po_code=po_code,
        purchase_request_id=purchase_request.id,
        supplier_id=real_supplier_id,
        total_amount=unit_price * qty,
        delivery_location=destination,
        expected_delivery_date=eta_datetime,
        status="ISSUED",
        recommendation_score=overall_score
    )
    db.add(po)
    db.flush()
    
    # 3. Persist PO Line Item
    if pr_item:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=pr_item.product_id,
            quantity=qty,
            unit_price=unit_price,
            line_total=unit_price * qty
        )
        db.add(po_item)
        db.flush()

    # 4. Create Linked Shipment (E2 Integration)
    ship_num = po_code.split('-')[-1]
    shipment_code = f"SHP-PO-{ship_num}"
    tracking_number = f"TRK-PO-{ship_num}"
    
    shipment = Shipment(
        id=str(uuid.uuid4()),
        shipment_code=shipment_code,
        tracking_number=tracking_number,
        purchase_order_reference=po_code,
        purchase_order_id=po.id,
        origin_location=origin,
        destination_location=destination,
        status="IN_TRANSIT"
    )
    db.add(shipment)
    db.flush()
    
    # 5. Create Linked Truck (E2 Real-Time Simulation)
    truck = Truck(
        id=str(uuid.uuid4()),
        truck_code=f"TRK-{ship_num}",
        trailer_id=f"TRL-{ship_num}0",
        shipment_id=shipment.id,
        status="IN_TRANSIT",
        load_type=f"{qty}x {product_name}",
        driver_name="Assigned Fleet Driver",
        current_lat=origin_lat,
        current_lng=origin_lng,
        progress_percent=10,
        original_eta=eta_datetime,
        current_eta=eta_datetime,
        delay_minutes=0,
        priority=purchase_request.priority or "NORMAL",
        created_at=datetime.now(timezone.utc)
    )
    db.add(truck)
    
    db.commit()
    db.refresh(po)
    return po