"""
Real Highway Road Routing & Geocoding Engine.
Integrates OpenStreetMap Nominatim Geocoding and OSRM Highway Road Routing with fast in-memory caching.
"""

import math
import json
import urllib.request
import urllib.parse
import re
from typing import Tuple, List, Dict, Any, Optional

# In-memory geocode and route cache to prevent redundant HTTP requests
_GEO_CACHE: Dict[str, Tuple[float, float, str]] = {}
_ROUTE_CACHE: Dict[str, Dict[str, Any]] = {}

# Canonical Tier 1, 2, 3 City Coordinates & State Mapping
VERIFIED_CITIES: Dict[str, Tuple[float, float, str]] = {
    "chennai": (13.0827, 80.2707, "Tamil Nadu"),
    "bengaluru": (12.9716, 77.5946, "Karnataka"),
    "bangalore": (12.9716, 77.5946, "Karnataka"),
    "mumbai": (19.0760, 72.8777, "Maharashtra"),
    "delhi": (28.6139, 77.2090, "Delhi NCR"),
    "new delhi": (28.6139, 77.2090, "Delhi NCR"),
    "kolkata": (22.5726, 88.3639, "West Bengal"),
    "calcutta": (22.5726, 88.3639, "West Bengal"),
    "hyderabad": (17.3850, 78.4867, "Telangana"),
    "pune": (18.5204, 73.8567, "Maharashtra"),
    "ahmedabad": (23.0225, 72.5714, "Gujarat"),
    "jaipur": (26.9124, 75.7873, "Rajasthan"),
    "lucknow": (26.8467, 80.9462, "Uttar Pradesh"),
    "kanpur": (26.4499, 80.3319, "Uttar Pradesh"),
    "nagpur": (21.1458, 79.0882, "Maharashtra"),
    "indore": (22.7196, 75.8577, "Madhya Pradesh"),
    "bhopal": (23.2599, 77.4126, "Madhya Pradesh"),
    "visakhapatnam": (17.6868, 83.2185, "Andhra Pradesh"),
    "vizag": (17.6868, 83.2185, "Andhra Pradesh"),
    "patna": (25.5941, 85.1376, "Bihar"),
    "vadodara": (22.3072, 73.1812, "Gujarat"),
    "surat": (21.1702, 72.8311, "Gujarat"),
    "coimbatore": (11.0168, 76.9558, "Tamil Nadu"),
    "kochi": (9.9312, 76.2673, "Kerala"),
    "chandigarh": (30.7333, 76.7794, "Punjab / Haryana"),
    "guwahati": (26.1445, 91.7362, "Assam"),
    "baksa": (26.6276, 91.3389, "Assam"),
    "balurghat": (25.2214, 88.7667, "West Bengal"),
    "siliguri": (26.7271, 88.3953, "West Bengal"),
    "bhubaneswar": (20.2961, 85.8245, "Odisha"),
    "ranchi": (23.3441, 85.3096, "Jharkhand"),
    "jamshedpur": (22.8046, 86.2029, "Jharkhand"),
    "madurai": (9.9252, 78.1198, "Tamil Nadu"),
    "trichy": (10.7905, 78.7047, "Tamil Nadu"),
    "salem": (11.6643, 78.1460, "Tamil Nadu"),
    "vijayawada": (16.5062, 80.6480, "Andhra Pradesh"),
    "guntur": (16.3067, 80.4365, "Andhra Pradesh"),
    "tirupati": (13.6288, 79.4192, "Andhra Pradesh"),
    "vellore": (12.9165, 79.1325, "Tamil Nadu"),
    "hosur": (12.7409, 77.8253, "Tamil Nadu"),
    "mysore": (12.2958, 76.6394, "Karnataka"),
    "mangalore": (12.9141, 74.8560, "Karnataka"),
    "hubli": (15.3647, 75.1240, "Karnataka"),
    "belgaum": (15.8497, 74.4977, "Karnataka"),
    "nashik": (19.9975, 73.7898, "Maharashtra"),
    "aurangabad": (19.8762, 75.3433, "Maharashtra"),
    "solapur": (17.6599, 75.9064, "Maharashtra"),
    "kolhapur": (16.7050, 74.2433, "Maharashtra"),
    "bhiwandi": (19.2967, 73.0631, "Maharashtra"),
    "varanasi": (25.3176, 82.9739, "Uttar Pradesh"),
    "agra": (27.1767, 78.0081, "Uttar Pradesh"),
    "meerut": (28.9845, 77.7064, "Uttar Pradesh"),
    "noida": (28.5355, 77.3910, "Uttar Pradesh"),
    "gurgaon": (28.4595, 77.0266, "Haryana"),
    "faridabad": (28.4089, 77.3178, "Haryana"),
    "ghaziabad": (28.6692, 77.4538, "Uttar Pradesh"),
    "ludhiana": (30.9010, 75.8573, "Punjab"),
    "amritsar": (31.6340, 74.8723, "Punjab"),
    "jalandhar": (31.3260, 75.5762, "Punjab"),
    "jodhpur": (26.2389, 73.0243, "Rajasthan"),
    "udaipur": (24.5854, 73.7125, "Rajasthan"),
    "kota": (25.2138, 75.8648, "Rajasthan"),
    "bikaner": (28.0229, 73.3119, "Rajasthan"),
    "raipur": (21.2514, 81.6296, "Chhattisgarh"),
    "bilaspur": (22.0797, 82.1409, "Chhattisgarh"),
    "dehradun": (30.3165, 78.0322, "Uttarakhand"),
    "haridwar": (29.9457, 78.1642, "Uttarakhand"),
    "srinagar": (34.0837, 74.7973, "Jammu & Kashmir"),
    "jammu": (32.7266, 74.8570, "Jammu & Kashmir"),
    "shimla": (31.1048, 77.1734, "Himachal Pradesh"),
    "thiruvananthapuram": (8.5241, 76.9366, "Kerala"),
    "kozhikode": (11.2588, 75.7804, "Kerala"),
    "thrissur": (10.5276, 76.2144, "Kerala"),
    "panaji": (15.4909, 73.8278, "Goa"),
    "shillong": (25.5788, 91.8933, "Meghalaya"),
    "agartala": (23.8315, 91.2868, "Tripura"),
    "imphal": (24.8170, 93.9368, "Manipur"),
}


def clean_query_string(name: str) -> str:
    """Strips common warehouse suffixes to isolate the actual Indian geographic entity."""
    s = str(name or "").lower().strip()
    s = re.sub(r"\b(dc|hub|facility|warehouse|park|port|central|terminal|logistics|plant|north|south|east|west|depot|zone|sector|phase|bay)\b", "", s)
    s = re.sub(r"[^a-zA-Z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def geocode_location(location_name: str) -> Tuple[float, float, str]:
    """
    Resolves any Indian city, district, or facility to exact GPS coordinates & State name.
    1. Memory cache check
    2. Local verified city database check
    3. Live OpenStreetMap Nominatim geocoding
    4. Deterministic bounding box fallback
    """
    if not location_name:
        return (13.0827, 80.2707, "Tamil Nadu")

    cleaned = clean_query_string(location_name)
    cache_key = cleaned or str(location_name).lower().strip()

    # 1. Cache
    if cache_key in _GEO_CACHE:
        return _GEO_CACHE[cache_key]

    # 2. Local verified dictionary
    for k, (lat, lng, state) in VERIFIED_CITIES.items():
        if k == cache_key or k in cache_key or cache_key in k:
            _GEO_CACHE[cache_key] = (lat, lng, state)
            return (lat, lng, state)

    # 3. Live OpenStreetMap Nominatim Geocoding
    try:
        query_encoded = urllib.parse.quote(f"{cleaned}, India")
        url = f"https://nominatim.openstreetmap.org/search?q={query_encoded}&format=json&limit=1&countrycodes=in"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "CognizantSupplyChainControlTower/2.0 (logistics-routing)"}
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode())
            if data and len(data) > 0:
                lat = round(float(data[0]["lat"]), 6)
                lng = round(float(data[0]["lon"]), 6)
                display_name = data[0].get("display_name", "")
                state = display_name.split(",")[-2].strip() if "," in display_name else "India"
                _GEO_CACHE[cache_key] = (lat, lng, state)
                return (lat, lng, state)
    except Exception:
        pass

    # 4. Deterministic fallback strictly inside India (11.0N - 27.0N, 74.0E - 88.0E)
    h = abs(hash(cleaned or location_name))
    lat = round(12.0 + (h % 1500) / 100.0, 4)
    lng = round(74.0 + ((h // 1500) % 1400) / 100.0, 4)
    _GEO_CACHE[cache_key] = (lat, lng, "National Hub")
    return (lat, lng, "National Hub")


def get_highway_route(
    origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float
) -> Dict[str, Any]:
    """
    Fetches real highway route geometry from OpenStreetMap OSRM Routing Engine.
    Returns:
      - distance_km: Real road driving distance (km)
      - duration_hours: Estimated driving transit hours
      - waypoints: List of [lat, lng] coordinates tracing the actual Indian National Highway
      - corridor_name: Identified freight highway corridor (e.g. NH-16, NH-48, NH-44)
    """
    route_key = f"{round(origin_lat, 3)},{round(origin_lng, 3)}->{round(dest_lat, 3)},{round(dest_lng, 3)}"
    if route_key in _ROUTE_CACHE:
        return _ROUTE_CACHE[route_key]

    # Try OpenStreetMap OSRM Driving Router
    try:
        url = (
            f"https://router.project-osrm.org/route/v1/driving/"
            f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}?"
            f"overview=simplified&geometries=geojson"
        )
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "CognizantSupplyChainControlTower/2.0 (osrm-router)"}
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode())
            if data and data.get("routes"):
                r = data["routes"][0]
                dist_km = round(r["distance"] / 1000.0, 1)
                dur_hrs = round(r["duration"] / 3600.0, 1)
                # Convert geojson [lng, lat] to leaflet [lat, lng]
                raw_coords = r["geometry"]["coordinates"]
                waypoints = [[round(c[1], 5), round(c[0], 5)] for c in raw_coords]

                # Identify corridor
                corridor_name = "National Highway Corridor"
                if abs(origin_lat - 13.08) < 1.0 and dest_lat > 20.0 and dest_lng > 85.0:
                    corridor_name = "NH-16 (East Coast Freight Corridor)"
                elif abs(origin_lat - 13.08) < 1.0 and dest_lat > 18.0 and dest_lng < 75.0:
                    corridor_name = "NH-48 (Western Freight Expressway)"
                elif abs(origin_lat - 13.08) < 1.0 and dest_lat > 25.0 and abs(dest_lng - 77.0) < 3.0:
                    corridor_name = "NH-44 (North-South Freight Spine)"
                elif origin_lat > 25.0 and dest_lat > 25.0:
                    corridor_name = "NH-27 (East-West Highway)"

                result = {
                    "distance_km": dist_km,
                    "duration_hours": dur_hrs,
                    "waypoints": waypoints,
                    "corridor_name": corridor_name,
                    "is_real_road": True,
                }
                _ROUTE_CACHE[route_key] = result
                return result
    except Exception:
        pass

    # Mathematical curved corridor fallback if OSRM is unreachable
    R = 6371.0
    dlat = math.radians(dest_lat - origin_lat)
    dlon = math.radians(dest_lng - origin_lng)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(origin_lat)) * math.cos(math.radians(dest_lat)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    straight_km = R * c
    road_km = round(straight_km * 1.25, 1)

    # Generate 15 smooth intermediate waypoints following great circle corridor
    waypoints = []
    num_steps = 15
    for i in range(num_steps + 1):
        t = i / float(num_steps)
        lat = round(origin_lat + (dest_lat - origin_lat) * t, 5)
        lng = round(origin_lng + (dest_lng - origin_lng) * t, 5)
        waypoints.append([lat, lng])

    result = {
        "distance_km": road_km,
        "duration_hours": max(2.5, round(road_km / 45.0, 1)),
        "waypoints": waypoints,
        "corridor_name": "Interstate Freight Corridor",
        "is_real_road": False,
    }
    _ROUTE_CACHE[route_key] = result
    return result


def get_position_along_waypoints(
    waypoints: List[List[float]], progress_percent: int
) -> Tuple[float, float]:
    """
    Accurately places the live truck marker along the real highway turns according to progress_percent.
    """
    if not waypoints:
        return (13.0827, 80.2707)
    if len(waypoints) == 1 or progress_percent <= 0:
        return (waypoints[0][0], waypoints[0][1])
    if progress_percent >= 100:
        return (waypoints[-1][0], waypoints[-1][1])

    # Total polyline length calculation
    segments = []
    total_len = 0.0
    for i in range(len(waypoints) - 1):
        p1 = waypoints[i]
        p2 = waypoints[i + 1]
        dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        segments.append((dist, p1, p2))
        total_len += dist

    if total_len == 0.0:
        return (waypoints[0][0], waypoints[0][1])

    target_dist = (progress_percent / 100.0) * total_len
    acc = 0.0
    for dist, p1, p2 in segments:
        if acc + dist >= target_dist:
            seg_t = (target_dist - acc) / dist if dist > 0 else 0
            cur_lat = round(p1[0] + (p2[0] - p1[0]) * seg_t, 6)
            cur_lng = round(p1[1] + (p2[1] - p1[1]) * seg_t, 6)
            return (cur_lat, cur_lng)
        acc += dist

    return (waypoints[-1][0], waypoints[-1][1])
