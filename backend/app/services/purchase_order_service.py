from datetime import datetime, timezone, timedelta
import uuid

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.procurement import PurchaseRequest, PurchaseOrder, PurchaseOrderItem, Supplier
from app.models.logistics import Shipment, Truck
from app.services.supplier_service import calculate_supplier_recommendations

def next_purchase_order_code(db: Session) -> str:
    """Generate PO-2026-0001 format string."""
    year = datetime.utcnow().year
    prefix = f"PO-{year}-"
    last_po = db.query(PurchaseOrder).filter(PurchaseOrder.po_code.like(f"{prefix}%")).order_by(PurchaseOrder.po_code.desc()).first()
    
    if last_po:
        last_num = int(last_po.po_code.split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1
        
    return f"{prefix}{next_num:04d}"

def approve_supplier_and_create_po(db: Session, purchase_request: PurchaseRequest, supplier_id: str) -> PurchaseOrder:
    if purchase_request.status not in ("VALIDATED", "APPROVED"):
        raise ValueError(f"Cannot approve supplier for PR in status {purchase_request.status}")
        
    if purchase_request.purchase_order is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Purchase order already exists for this request"
        )
        
    recs = calculate_supplier_recommendations(db, purchase_request)
    
    selected_rec = next((r for r in recs.recommendations if r.supplier.id == supplier_id), None)
    if not selected_rec:
        raise ValueError("Selected supplier is not eligible or active.")
        
    supplier = db.query(Supplier).get(supplier_id)
    if not supplier:
        raise ValueError("Supplier not found.")

    # 1. Update PR
    purchase_request.recommended_supplier_id = supplier_id
    purchase_request.supplier_recommendation_json = recs.model_dump(mode="json")
    purchase_request.status = "APPROVED"

    # 2. Create PO
    po_code = next_purchase_order_code(db)
    po = PurchaseOrder(
        po_code=po_code,
        purchase_request_id=purchase_request.id,
        supplier_id=supplier_id,
        total_amount=selected_rec.unit_price * selected_rec.available_capacity, # Will fix capacity to actual qty below
        delivery_location=purchase_request.delivery_location,
        expected_delivery_date=datetime.now(timezone.utc) + timedelta(days=selected_rec.lead_time_days),
        status="ISSUED",
        recommendation_score=selected_rec.score_breakdown.overall_score
    )
    
    # Pr item
    pr_item = purchase_request.items[0]
    po.total_amount = selected_rec.unit_price * pr_item.quantity
    db.add(po)
    db.flush()
    
    po_item = PurchaseOrderItem(
        purchase_order_id=po.id,
        product_id=pr_item.product_id,
        quantity=pr_item.quantity,
        unit_price=selected_rec.unit_price,
        line_total=selected_rec.unit_price * pr_item.quantity
    )
    db.add(po_item)
    db.flush()

    # 3. Create Shipment
    ship_uuid = str(uuid.uuid4())
    shipment_code = f"SHP-PO-{po_code.split('-')[-1]}"
    tracking_number = f"TRK-PO-{po_code.split('-')[-1]}"
    
    origin = supplier.city if supplier.city else "Supplier facility"
    
    shipment = Shipment(
        id=ship_uuid,
        shipment_code=shipment_code,
        tracking_number=tracking_number,
        purchase_order_reference=po_code,
        purchase_order_id=po.id,
        origin_location=origin,
        destination_location=purchase_request.delivery_location,
        status="IN_TRANSIT"
    )
    db.add(shipment)
    db.flush()
    
    # 4. Create Truck
    truck_code = f"TRK-{po_code.split('-')[-1]}"
    trailer_id = f"TRL-{po_code.split('-')[-1]}0"
    
    eta = datetime.now(timezone.utc) + timedelta(days=selected_rec.lead_time_days)
    
    truck = Truck(
        truck_code=truck_code,
        trailer_id=trailer_id,
        shipment_id=shipment.id,
        status="ASSIGNED",
        current_lat=13.0827, # generic demo origin
        current_lng=80.2707,
        progress_percent=0,
        original_eta=eta,
        current_eta=eta,
        delay_minutes=0,
        priority=purchase_request.priority
    )
    db.add(truck)
    
    db.commit()
    db.refresh(po)
    
    return po
