import urllib.request
import urllib.error
import json

base_url = "http://127.0.0.1:8000"

def get(path):
    req = urllib.request.Request(base_url + path)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def post(path):
    req = urllib.request.Request(base_url + path, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

print("1. GET /health")
status, body = get("/health")
print(f"Status: {status}\n")

print("2. GET /api/logistics/trucks")
status, trucks = get("/api/logistics/trucks")
print(f"Status: {status}, Truck Count: {len(trucks)}\n")

print("3. GET /api/logistics/track/TRK-1042")
status, track1 = get("/api/logistics/track/TRK-1042")
print(f"Status: {status}, Truck Code: {track1.get('truck', {}).get('truck_code')}\n")

print("4. GET /api/logistics/track/TRL-8821")
status, track2 = get("/api/logistics/track/TRL-8821")
print(f"Status: {status}, Trailer ID: {track2.get('truck', {}).get('trailer_id')}\n")

print("5. GET /api/logistics/track/PO-2026-0042")
status, track3 = get("/api/logistics/track/PO-2026-0042")
print(f"Status: {status}, PO Ref: {track3.get('shipment', {}).get('purchase_order_reference')}\n")

print("6. GET unknown tracking query")
status, track_unknown = get("/api/logistics/track/UNKNOWN-XYZ-123")
print(f"Status: {status}, Response: {track_unknown}\n")

print("7. GET /api/logistics/alerts")
status, alerts = get("/api/logistics/alerts")
print(f"Status: {status}, Alerts Count: {len(alerts)}\n")

print("8. Extract truck ID from trucks response")
# Let's pick TRK-1055 because it's IN_TRANSIT and at 35% progress
target_truck = next((t for t in trucks if t["truck_code"] == "TRK-1055"), trucks[0])
truck_id = target_truck["id"]
initial_progress = target_truck["progress_percent"]
initial_lat = target_truck["current_lat"]
initial_lng = target_truck["current_lng"]
print(f"Selected Truck ID: {truck_id}, Initial Progress: {initial_progress}%\n")

print("10. POST /api/logistics/trucks/{truck_id}/simulate-step")
status, simulated_truck = post(f"/api/logistics/trucks/{truck_id}/simulate-step")
new_progress = simulated_truck["progress_percent"]
new_lat = simulated_truck["current_lat"]
print(f"Status: {status}, New Progress: {new_progress}%, New Lat: {new_lat}\n")

print("11. Confirm changed progress")
if new_progress != initial_progress or new_lat != initial_lat:
    print("SUCCESS: Progress/Position changed\n")
else:
    print("FAILED: Progress/Position did not change\n")

print("12. POST /api/logistics/simulate-all")
status, all_simulated = post("/api/logistics/simulate-all")
print(f"Status: {status}, Trucks returned: {len(all_simulated)}\n")

print("14. GET /openapi.json")
status, openapi = get("/openapi.json")
paths = openapi.get("paths", {})
logistics_paths = [p for p in paths if p.startswith("/api/logistics")]
print(f"Status: {status}, Logistics Routes Count: {len(logistics_paths)}")
for p in logistics_paths:
    print(f"  {p}")

