import urllib.request
import json
base_url = "http://127.0.0.1:8000"
def get(path):
    with urllib.request.urlopen(base_url + path) as response:
        return json.loads(response.read().decode('utf-8'))

track1 = get("/api/logistics/track/TRK-1042")
print("TrackingSearchResponse:")
print(json.dumps(track1, indent=2))

alerts = get("/api/logistics/alerts")
print("\nLogisticsAlertResponse (first item):")
if alerts:
    print(json.dumps(alerts[0], indent=2))
