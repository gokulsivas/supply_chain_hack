"""
Sanity Test: Multi-City Coordinate Resolution & Direct Corridor Routing
Verifies Tier-1 & Tier-2 cities resolution and Haversine distances.
"""

from app.utils.geo_cities import resolve_coords, haversine_km, CITY_COORDS

TEST_CITY_PAIRS = [
    ("Mumbai DC", "Delhi NCR Facility"),
    ("Pune Logistics Park", "Ahmedabad Central"),
    ("Kolkata Terminal", "Guwahati DC"),
    ("Jaipur Hub", "Lucknow Cargo Bay"),
    ("Hyderabad Central", "Visakhapatnam Port"),
    ("Coimbatore DC", "Kochi Marine Terminal"),
    ("Chennai DC", "Baksa Facility"),
    ("Bengaluru Hub", "Balurghat DC"),
    ("Surat Warehouse", "Indore Depot"),
    ("Nagpur Industrial", "Varanasi Hub"),
    ("Kanpur Logistics", "Patna DC"),
    ("Bhopal Central", "Ranchi DC"),
    ("Ludhiana Terminal", "Chandigarh Bay"),
    ("Vadodara DC", "Rajkot Warehouse"),
    ("Madurai Hub", "Tiruchirappalli DC"),
    ("Nashik Facility", "Aurangabad Terminal"),
    ("Dehradun Hub", "Haridwar DC"),
]

def run_tests():
    print("=" * 70)
    print(f"MULTI-CITY ROUTING & COORDINATE VERIFICATION ({len(CITY_COORDS)} predefined cities)")
    print("=" * 70)

    for origin_str, dest_str in TEST_CITY_PAIRS:
        o_lat, o_lng = resolve_coords(origin_str)
        d_lat, d_lng = resolve_coords(dest_str)
        dist_km = haversine_km(o_lat, o_lng, d_lat, d_lng)

        print(f"[Route] {origin_str} ({o_lat}, {o_lng}) -> {dest_str} ({d_lat}, {d_lng})")
        print(f"        Driving Distance: {dist_km} km | Est. Transit: {round(dist_km/45.0, 1)} hrs")

        assert (o_lat, o_lng) != (d_lat, d_lng), f"Origin and Destination coordinates should not be identical for {origin_str} -> {dest_str}"
        assert 8.0 <= o_lat <= 36.0 and 68.0 <= o_lng <= 98.0, f"Origin coordinate {o_lat}, {o_lng} out of Indian subcontinent bounds"
        assert 8.0 <= d_lat <= 36.0 and 68.0 <= d_lng <= 98.0, f"Dest coordinate {d_lat}, {d_lng} out of Indian subcontinent bounds"
        assert dist_km > 0, "Distance must be positive"

    print("\n" + "=" * 70)
    print("ALL MULTI-CITY ROUTING & COORDINATE RESOLUTION TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
