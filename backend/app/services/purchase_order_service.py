import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Tuple

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.procurement import PurchaseRequest, PurchaseOrder, PurchaseOrderItem, Supplier
from app.models.logistics import Shipment, Truck
from app.services.supplier_service import calculate_supplier_recommendations

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
    "cochin": (9.9312, 76.2673),
    "balurghat": (25.2214, 88.7667),
    "baksa": (26.6873, 91.5984),
    "guwahati": (26.1445, 91.7362),
    "siliguri": (26.7271, 88.3953),
    "patna": (25.5941, 85.1376),
    "bhubaneswar": (20.2961, 85.8245),
    "lucknow": (26.8467, 80.9462),
    "chandigarh": (30.7333, 76.7794),
    "surat": (21.1702, 72.8311),
    "indore": (22.7196, 75.8577),
    "nagpur": (21.1458, 79.0882),
    "visakhapatnam": (17.6868, 83.2185),
    "vizag": (17.6868, 83.2185),
    "madurai": (9.9252, 78.1198),
    "trichy": (10.7905, 78.7047),
    "ranchi": (23.3441, 85.3096),
    "jamshedpur": (22.8046, 86.2029),
}

def resolve_coords(city_name: str, default: Tuple[float, float] = (13.0827, 80.2707)) -> Tuple[float, float]:
    if not city_name:
        return default
    c = str(city_name).lower().strip()
    for k, v in CITY_COORDS.items():
        if k in c:
            return v
    # Deterministic fallback coordinate within Indian territory based on city hash
    h = abs(hash(c))
    lat = 12.0 + (h % 1500) / 100.0  # 12.0 to 27.0 N
    lng = 74.0 + ((h // 1500) % 1400) / 100.0  # 74.0 to 88.0 E
    return (round(lat, 4), round(lng, 4))

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c * 1.25, 1)  # 1.25 factor for highway road winding distance

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

    pr_item = purchase_request.items[0] if purchase_request.items else None
    product_name = pr_item.product.name if pr_item and pr_item.product else "Procured Goods"
    qty = pr_item.quantity if pr_item else 1

    # 1. Update PR Status & Snapshot in Database
    purchase_request.recommended_supplier_id = supplier_id
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
        supplier_id=supplier_id,
        total_amount=selected_rec.unit_price * qty,
        delivery_location=destination,
        expected_delivery_date=eta_datetime,
        status="ISSUED",
        recommendation_score=selected_rec.score_breakdown.overall_score
    )
    db.add(po)
    db.flush()
    
    # 3. Persist PO Line Item
    if pr_item:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=pr_item.product_id,
            quantity=qty,
            unit_price=selected_rec.unit_price,
            line_total=selected_rec.unit_price * qty
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