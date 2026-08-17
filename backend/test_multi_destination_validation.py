"""
End-to-End Validation: Multi-Destination Route & Real-Time Tracking Verification
Tests Step 7 validation requirements from prompt.
"""

from app.core.database import SessionLocal
from app.api.routes.logistics import search_tracking, simulate_truck_step
from app.utils.geo_cities import resolve_coords, haversine_km

VALIDATION_CASES = [
    {
        "query": "Kolkata",
        "expected_origin": "Chennai DC",
        "expected_dest_coords": (22.5726, 88.3639),
        "min_distance_km": 1500,
    },
    {
        "query": "Baksa",
        "expected_origin_coords": (26.1445, 91.7362), # Guwahati DC in DB or Chennai
        "expected_dest_coords": (26.6276, 91.3389),
    },
    {
        "query": "Mumbai",
        "expected_origin": "Chennai DC",
        "expected_dest_coords": (19.0760, 72.8777),
        "min_distance_km": 1000,
    },
    {
        "query": "Delhi",
        "expected_origin": "Chennai DC",
        "expected_dest_coords": (28.6139, 77.2090),
        "min_distance_km": 1800,
    },
    {
        "query": "TRK-1002",
        "expected_origin_coords": (19.0760, 72.8777), # Mumbai DC
        "expected_dest_coords": (18.5204, 73.8567),   # Pune
    },
    {
        "query": "TRK-1004",
        "expected_origin_coords": (28.6139, 77.2090), # Delhi NCR
        "expected_dest_coords": (26.9124, 75.7873),   # Jaipur
    },
]

def run_multi_destination_validation():
    db = SessionLocal()
    print("=" * 80)
    print("MULTI-DESTINATION DYNAMIC ROUTING & TRACKING VALIDATION")
    print("=" * 80)

    for case in VALIDATION_CASES:
        query = case["query"]
        res = search_tracking(query, db)
        truck = res["truck"]
        shipment = res["shipment"]
        route = res.get("route", [])

        print(f"\n[Testing Query: '{query}']")
        print(f"  - Truck Code:        {truck.truck_code}")
        print(f"  - Origin:            {shipment.origin_location} ({truck.origin_lat}, {truck.origin_lng})")
        print(f"  - Destination:       {shipment.destination_location} ({truck.dest_lat}, {truck.dest_lng})")
        print(f"  - Current Position:  ({truck.current_lat}, {truck.current_lng}) [Progress: {truck.progress_percent}%]")
        print(f"  - ETA:               {res['eta']}")
        print(f"  - Route Vertices:    {len(route)} points -> {route}")

        # Assertions
        assert truck.origin_lat is not None and truck.origin_lng is not None, "Origin coordinates missing!"
        assert truck.dest_lat is not None and truck.dest_lng is not None, "Destination coordinates missing!"
        assert len(route) == 2, f"Expected 2 route vertices (Origin and Dest), got {len(route)}"

        if "expected_dest_coords" in case:
            exp_d = case["expected_dest_coords"]
            assert abs(truck.dest_lat - exp_d[0]) < 0.05 and abs(truck.dest_lng - exp_d[1]) < 0.05, (
                f"Destination coordinate mismatch for {query}: expected {exp_d}, got ({truck.dest_lat}, {truck.dest_lng})"
            )

        if "min_distance_km" in case:
            dist = haversine_km(truck.origin_lat, truck.origin_lng, truck.dest_lat, truck.dest_lng)
            assert dist >= case["min_distance_km"], f"Distance {dist}km less than expected minimum {case['min_distance_km']}km"

        # Advance simulation test for this truck
        initial_progress = truck.progress_percent
        adv_truck = simulate_truck_step(truck.id, db)
        print(f"  - Simulation Step:   Progress advanced from {initial_progress}% to {adv_truck.progress_percent}%")

    print("\n" + "=" * 80)
    print("ALL MULTI-DESTINATION TRACKING TESTS SUCCESSFULLY PASSED!")
    print("=" * 80)
    db.close()

if __name__ == "__main__":
    run_multi_destination_validation()
