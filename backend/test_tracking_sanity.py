"""
Sanity Test for Dynamic City Routing, Balurghat Location, and Distance-Based ETA Calculation
"""

from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.procurement import PurchaseRequest, Product, Supplier
from app.schemas.procurement import CreatePurchaseRequestRequest
from app.services.procurement_service import create_purchase_request
from app.services.purchase_order_service import approve_supplier_and_create_po, resolve_coords, haversine_km
from app.api.routes.logistics import search_tracking, simulate_truck_step

def test_tracking_and_eta():
    print("=" * 60)
    print("SANITY TEST: DYNAMIC TRUCK TRACKING & ETA")
    print("=" * 60)

    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            user = User(
                email="logistics_test@antigravity.internal",
                name="Logistics Controller",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        supplier = db.query(Supplier).first()
        assert supplier is not None, "Supplier not found in DB"
        print(f"Supplier: {supplier.name} in {supplier.city}")

        # 1. Create Purchase Request with Balurghat destination
        dest_city = "Balurghat"
        req_payload = CreatePurchaseRequestRequest(
            item="mobile phones",
            item_description="mobile phones",
            quantity=12,
            delivery_location=dest_city,
            required_date=datetime.now(timezone.utc).date(),
            priority="NORMAL",
            raw_message=f"I need 12 mobile phones for {dest_city} by next Tuesday"
        )
        pr = create_purchase_request(db, user, req_payload)
        print(f"Created PR {pr.request_code} for {dest_city}")

        # 2. Approve Supplier and Create PO + Shipment + Truck
        po = approve_supplier_and_create_po(db, pr, supplier.id)
        print(f"Created PO {po.po_code} with Delivery Location: {po.delivery_location}")

        # 3. Track using PO Code
        tracking_result = search_tracking(po.po_code, db)
        truck = tracking_result["truck"]
        shipment = truck.shipment

        print(f"\n[Tracking Sanity Verification]")
        print(f"  - Truck Code: {truck.truck_code}")
        print(f"  - Load Type: {truck.load_type}")
        print(f"  - Origin: {shipment.origin_location} ({truck.origin_lat}, {truck.origin_lng})")
        print(f"  - Destination: {shipment.destination_location} ({truck.dest_lat}, {truck.dest_lng})")
        print(f"  - Calculated ETA: {tracking_result['eta']}")

        # Balurghat coordinates check
        balurghat_coords = resolve_coords("Balurghat")
        print(f"  - Balurghat Resolved Coords: {balurghat_coords}")
        assert balurghat_coords == (25.2214, 88.7667), f"Expected (25.2214, 88.7667), got {balurghat_coords}"
        assert truck.dest_lat == 25.2214 and truck.dest_lng == 88.7667, f"Truck dest coordinates mismatch!"
        assert "balurghat" in shipment.destination_location.lower(), f"Expected destination Balurghat, got {shipment.destination_location}"

        # ETA & Distance Check
        dist = haversine_km(truck.origin_lat, truck.origin_lng, truck.dest_lat, truck.dest_lng)
        print(f"  - Road Corridor Distance: {dist} km")
        assert dist > 500, f"Distance between {supplier.city} and Balurghat should be > 500km, got {dist}km"
        assert tracking_result["eta"] is not None, "ETA should be computed!"

        # 4. Simulation Step Test
        print("\n[Simulating Fleet Step...]")
        updated_truck = simulate_truck_step(truck.id, db)
        print(f"  - Advanced Progress: {updated_truck.progress_percent}%")
        print(f"  - Updated Current Coordinates: ({updated_truck.current_lat}, {updated_truck.current_lng})")
        print(f"  - Updated Dynamic ETA: {updated_truck.eta}")

        assert updated_truck.progress_percent > 10, "Progress should increase after simulation step"
        print("\n>>> ALL TRACKING & DYNAMIC ETA SANITY CHECKS PASSED!")
    finally:
        db.close()

if __name__ == "__main__":
    test_tracking_and_eta()
