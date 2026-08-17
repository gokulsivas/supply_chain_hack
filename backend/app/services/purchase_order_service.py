from datetime import datetime, timezone, timedelta
import uuid

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.procurement import PurchaseRequest, PurchaseOrder, PurchaseOrderItem, Supplier
from app.models.logistics import Shipment, Truck
from app.services.supplier_service import calculate_supplier_recommendations

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
        
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise ValueError("Supplier not found.")

    pr_item = purchase_request.items[0]

    # 1. Update PR Status & Snapshot in Database
    purchase_request.recommended_supplier_id = supplier_id
    purchase_request.supplier_recommendation_json = recs.model_dump(mode="json")
    purchase_request.status = "APPROVED"

    # 2. Persist Purchase Order in Database
    po_code = next_purchase_order_code(db)
    po = PurchaseOrder(
        po_code=po_code,
        purchase_request_id=purchase_request.id,
        supplier_id=supplier_id,
        total_amount=selected_rec.unit_price * pr_item.quantity,
        delivery_location=purchase_request.delivery_location or "Chennai Warehouse DC-1",
        expected_delivery_date=datetime.now(timezone.utc) + timedelta(days=selected_rec.lead_time_days),
        status="ISSUED",
        recommendation_score=selected_rec.score_breakdown.overall_score
    )
    db.add(po)
    db.flush()
    
    # 3. Persist PO Line Item
    po_item = PurchaseOrderItem(
        purchase_order_id=po.id,
        product_id=pr_item.product_id,
        quantity=pr_item.quantity,
        unit_price=selected_rec.unit_price,
        line_total=selected_rec.unit_price * pr_item.quantity
    )
    db.add(po_item)
    db.flush()

CITY_COORDS = {
    "chennai": (13.0827, 80.2707),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.7041, 77.1025),
    "delhi ncr": (28.7041, 77.1025),
    "new delhi": (28.6139, 77.2090),
    "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567),
    "coimbatore": (11.0168, 76.9558),
    "kolkata": (22.5726, 88.3639),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "kochi": (9.9312, 76.2673),
}

def resolve_coords(city_name: str, default=(13.0827, 80.2707)):
    if not city_name:
        return default
    c = city_name.lower()
    for k, v in CITY_COORDS.items():
        if k in c:
            return v
    return default

    # 4. Create Linked Shipment (E2 Integration)
    ship_num = po_code.split('-')[-1]
    shipment_code = f"SHP-PO-{ship_num}"
    tracking_number = f"TRK-PO-{ship_num}"
    origin = f"{supplier.city} DC" if supplier.city else "Supplier Facility"
    destination = purchase_request.delivery_location or po.delivery_location or "Bengaluru DC"
    product_name = pr_item.product.name if pr_item.product else "Procured Equipment"
    
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
    eta = datetime.now(timezone.utc) + timedelta(days=selected_rec.lead_time_days)
    origin_lat, origin_lng = resolve_coords(supplier.city, default=(13.0827, 80.2707))
    
    truck = Truck(
        truck_code=f"TRK-{ship_num}",
        trailer_id=f"TRL-{ship_num}0",
        shipment_id=shipment.id,
        status="ASSIGNED",
        load_type=product_name,
        current_lat=origin_lat,
        current_lng=origin_lng,
        progress_percent=0,
        original_eta=eta,
        current_eta=eta,
        delay_minutes=0,
        priority=purchase_request.priority or "STANDARD"
    )
    db.add(truck)
    
    db.commit()
    db.refresh(po)
    return po