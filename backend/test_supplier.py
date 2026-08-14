import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"
EMAIL = f"test_{int(datetime.now().timestamp())}@cognizant.com"
PASSWORD = "password123"

def print_section(title: str):
    print(f"\n{'-'*10} {title} {'-'*10}")

def main():
    session = requests.Session()

    # 1. Register & Login
    print_section("Auth")
    res = session.post(f"{BASE_URL}/auth/register", json={
        "email": EMAIL,
        "password": PASSWORD,
        "name": "Test User",
        "role": "USER"
    })
    print("Register:", res.status_code)

    res = session.post(f"{BASE_URL}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    print("Login:", res.status_code)
    token = res.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})

    # 2. Create PR
    print_section("Create PR")
    res = session.post(f"{BASE_URL}/procurement/purchase-requests", json={
        "item": "Laptop",
        "quantity": 50,
        "delivery_location": "Bangalore",
        "required_date": "2026-08-20",
        "priority": "HIGH"
    })
    print("Create PR status:", res.status_code)
    pr = res.json()
    pr_id = pr["id"]
    print("PR ID:", pr_id)

    # 3. Get Recommendations
    print_section("Get Recommendations")
    res = session.get(f"{BASE_URL}/procurement/purchase-requests/{pr_id}/supplier-recommendations")
    print("Recs status:", res.status_code)
    recs = res.json()
    print("Number of recs:", len(recs["recommendations"]))
    if recs["recommendations"]:
        best_rec = recs["recommendations"][0]
        print("Best supplier:", best_rec["supplier"]["name"])
        print("Score:", best_rec["score_breakdown"]["overall_score"])
        print("Reasons:", best_rec["score_breakdown"]["reasons"])
    else:
        print("No recommendations found!")
        return

    # 4. Approve Supplier
    print_section("Approve Supplier & Create PO")
    res = session.post(f"{BASE_URL}/procurement/purchase-requests/{pr_id}/approve-supplier", json={
        "supplier_id": best_rec["supplier"]["id"]
    })
    print("Approve status:", res.status_code)
    po = res.json()
    po_id = po["id"]
    print("PO Code:", po["po_code"])
    print("PO Status:", po["status"])
    print("Supplier:", po["supplier"]["name"])
    print("Total Amount:", po["total_amount"])
    
    shipment = po.get("shipment")
    if shipment:
        print("Linked Shipment Code:", shipment["shipment_code"])
        
    truck = po.get("truck")
    if truck:
        print("Linked Truck Code:", truck["truck_code"])

    # 5. Duplicate Approval test
    print_section("Duplicate Approval Test")
    res = session.post(f"{BASE_URL}/procurement/purchase-requests/{pr_id}/approve-supplier", json={
        "supplier_id": best_rec["supplier"]["id"]
    })
    print("Duplicate approve status:", res.status_code, "(Expect 409)")

    # 6. List POs
    print_section("List POs")
    res = session.get(f"{BASE_URL}/procurement/purchase-orders")
    print("List POs status:", res.status_code)
    print("PO count:", len(res.json()))

    # 7. Check Truck in Logistics
    print_section("Check E2 Logistics Endpoint")
    if truck:
        truck_code = truck["truck_code"]
        res = session.get(f"{BASE_URL}/logistics/track/{truck_code}")
        print("Track status:", res.status_code)
        if res.status_code == 200:
            track_data = res.json()
            print("Track Truck Status:", track_data["truck"]["status"])
            print("Track Shipment Location:", track_data["shipment"]["origin_location"])
    
    print("\nAll done.")

if __name__ == "__main__":
    main()
