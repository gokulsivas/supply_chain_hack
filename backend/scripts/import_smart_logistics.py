"""
Smart Logistics Dataset Importer & Telemetry Pipeline
Idempotent ETL script to ingest smart_logistics_dataset.csv into PostgreSQL.
"""

import os
import sys
import csv
import uuid
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.core.database import SessionLocal, engine
from app.core.schema_bootstrap import bootstrap_schema
from app.models.logistics import Truck, Shipment, TruckTelemetry, LogisticsAlert

# Realistic demo routes for the 10 assets in the Smart Logistics dataset
ASSET_ROUTE_CONFIG: Dict[str, Dict[str, Any]] = {
    "Truck_1": {
        "code": "TRK-1001",
        "trailer": "TRL-8821",
        "driver": "Ramesh Kumar (+91 98765 43210)",
        "load_type": "Enterprise Laptops",
        "origin": "Chennai DC",
        "origin_coords": (13.0827, 80.2707),
        "destination": "Bengaluru Hub",
        "dest_coords": (12.9716, 77.5946),
        "po_ref": "PO-2026-0001",
    },
    "Truck_2": {
        "code": "TRK-1002",
        "trailer": "TRL-8822",
        "driver": "Suresh Nair (+91 98450 11223)",
        "load_type": "Lithium Battery Cells",
        "origin": "Mumbai DC",
        "origin_coords": (19.0760, 72.8777),
        "destination": "Pune Logistics Park",
        "dest_coords": (18.5204, 73.8567),
        "po_ref": "PO-2026-0002",
    },
    "Truck_3": {
        "code": "TRK-1003",
        "trailer": "TRL-8823",
        "driver": "Vikas Sharma (+91 97123 45678)",
        "load_type": "Industrial Packaging",
        "origin": "Kolkata DC",
        "origin_coords": (22.5726, 88.3639),
        "destination": "Balurghat Hub",
        "dest_coords": (25.2214, 88.7667),
        "po_ref": "PO-2026-0003",
    },
    "Truck_4": {
        "code": "TRK-1004",
        "trailer": "TRL-8824",
        "driver": "Anil Verma (+91 98111 22334)",
        "load_type": "Barcode Scanners",
        "origin": "Delhi NCR Facility",
        "origin_coords": (28.7041, 77.1025),
        "destination": "Jaipur Warehouse",
        "dest_coords": (26.9124, 75.7873),
        "po_ref": "PO-2026-0004",
    },
    "Truck_5": {
        "code": "TRK-1005",
        "trailer": "TRL-8825",
        "driver": "Pooja Hegde (+91 98222 33445)",
        "load_type": "Precision CNC Components",
        "origin": "Hyderabad Central DC",
        "origin_coords": (17.3850, 78.4867),
        "destination": "Visakhapatnam Port Hub",
        "dest_coords": (17.6868, 83.2185),
        "po_ref": "PO-2026-0005",
    },
    "Truck_6": {
        "code": "TRK-1006",
        "trailer": "TRL-8826",
        "driver": "Rajesh Gupta (+91 99333 44556)",
        "load_type": "Optic Fiber Cables",
        "origin": "Ahmedabad DC",
        "origin_coords": (23.0225, 72.5714),
        "destination": "Surat Logistics Bay",
        "dest_coords": (21.1702, 72.8311),
        "po_ref": "PO-2026-0006",
    },
    "Truck_7": {
        "code": "TRK-1007",
        "trailer": "TRL-8827",
        "driver": "Kavita Rao (+91 99444 55667)",
        "load_type": "Cold Chain Pharmaceuticals",
        "origin": "Guwahati DC",
        "origin_coords": (26.1445, 91.7362),
        "destination": "Baksa Facility",
        "dest_coords": (26.6873, 91.5984),
        "po_ref": "PO-2026-0007",
    },
    "Truck_8": {
        "code": "TRK-1008",
        "trailer": "TRL-8828",
        "driver": "Mohan Lal (+91 99555 66778)",
        "load_type": "Automotive Sensors",
        "origin": "Coimbatore DC",
        "origin_coords": (11.0168, 76.9558),
        "destination": "Kochi Marine Terminal",
        "dest_coords": (9.9312, 76.2673),
        "po_ref": "PO-2026-0008",
    },
    "Truck_9": {
        "code": "TRK-1009",
        "trailer": "TRL-8829",
        "driver": "Deepak Sen (+91 99666 77889)",
        "load_type": "Server Racks & PSUs",
        "origin": "Patna DC",
        "origin_coords": (25.5941, 85.1376),
        "destination": "Ranchi Central Warehouse",
        "dest_coords": (23.3441, 85.3096),
        "po_ref": "PO-2026-0009",
    },
    "Truck_10": {
        "code": "TRK-1010",
        "trailer": "TRL-8830",
        "driver": "Simran Kaur (+91 99777 88990)",
        "load_type": "Heavy Power Inverters",
        "origin": "Chandigarh DC",
        "origin_coords": (30.7333, 76.7794),
        "destination": "Lucknow Cargo Terminal",
        "dest_coords": (26.8467, 80.9462),
        "po_ref": "PO-2026-0010",
    },
}

def normalize_status(raw_status: str) -> str:
    s = (raw_status or "").strip().lower()
    if "transit" in s:
        return "IN_TRANSIT"
    elif "deliver" in s:
        return "DELIVERED"
    elif "delay" in s:
        return "DELAYED"
    elif "yard" in s or "dock" in s or "arrive" in s:
        return "ARRIVED"
    return "IN_TRANSIT"

def parse_iso_or_custom_timestamp(ts_str: str) -> datetime:
    ts_str = ts_str.strip()
    try:
        dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
        return dt.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    try:
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return datetime.now(timezone.utc)

def find_dataset_csv_path() -> str:
    possible_paths = [
        r"D:\GOKUL-UG\Placements\Cognizant\Hackathon\data\smart_logistics_dataset.csv",
        os.path.join(BASE_DIR, "..", "data", "smart_logistics_dataset.csv"),
        os.path.join(BASE_DIR, "data", "smart_logistics_dataset.csv"),
        os.path.join(BASE_DIR, "smart_logistics_dataset.csv"),
        "smart_logistics_dataset.csv"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return os.path.abspath(p)
    raise FileNotFoundError("smart_logistics_dataset.csv could not be found.")

def run_import(csv_path: Optional[str] = None):
    print("=" * 70)
    print("SMART LOGISTICS DATASET IMPORTER")
    print("=" * 70)

    # 1. Bootstrap schema to ensure tables and columns exist
    bootstrap_schema(engine)

    if not csv_path:
        csv_path = find_dataset_csv_path()
    print(f"Reading dataset from: {csv_path}")

    db = SessionLocal()

    report = {
        "rows_read": 0,
        "rows_imported": 0,
        "rows_skipped": 0,
        "rows_rejected": 0,
        "trucks_created_updated": 0,
        "shipments_created_updated": 0,
        "telemetry_rows_inserted": 0,
        "rejection_reasons": []
    }

    try:
        # Load existing telemetry deduplication keys
        existing_telemetry = db.query(TruckTelemetry.source_asset_id, TruckTelemetry.source_timestamp).all()
        existing_keys = set((r[0], r[1]) for r in existing_telemetry)

        # Parse CSV
        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            report["rows_read"] = len(rows)

        print(f"Parsed {len(rows)} raw rows from CSV.")

        # Organize telemetry per asset to identify latest record
        asset_records: Dict[str, List[Dict[str, Any]]] = {}
        for row_idx, r in enumerate(rows, start=1):
            asset_id = r.get("Asset_ID", "").strip()
            ts_str = r.get("Timestamp", "").strip()

            if not asset_id or not ts_str:
                report["rows_rejected"] += 1
                report["rejection_reasons"].append(f"Row {row_idx}: Missing Asset_ID or Timestamp")
                continue

            try:
                lat = float(r.get("Latitude", 0.0))
                lng = float(r.get("Longitude", 0.0))
            except ValueError:
                report["rows_rejected"] += 1
                report["rejection_reasons"].append(f"Row {row_idx}: Invalid Latitude/Longitude numbers")
                continue

            if lat < -90.0 or lat > 90.0 or lng < -180.0 or lng > 180.0:
                report["rows_rejected"] += 1
                report["rejection_reasons"].append(f"Row {row_idx}: Out-of-bounds coordinates ({lat}, {lng})")
                continue

            ts = parse_iso_or_custom_timestamp(ts_str)

            inv = float(r.get("Inventory_Level", 0.0)) if r.get("Inventory_Level") else None
            temp = float(r.get("Temperature", 0.0)) if r.get("Temperature") else None
            humidity = float(r.get("Humidity", 0.0)) if r.get("Humidity") else None
            traffic = r.get("Traffic_Status", "").strip() or None
            waiting = float(r.get("Waiting_Time", 0.0)) if r.get("Waiting_Time") else None
            tx_amount = float(r.get("User_Transaction_Amount", 0.0)) if r.get("User_Transaction_Amount") else None
            tx_freq = float(r.get("User_Purchase_Frequency", 0.0)) if r.get("User_Purchase_Frequency") else None
            delay_reason = r.get("Logistics_Delay_Reason", "").strip() or "None"
            utilization = float(r.get("Asset_Utilization", 0.0)) if r.get("Asset_Utilization") else None
            demand = float(r.get("Demand_Forecast", 0.0)) if r.get("Demand_Forecast") else None
            is_delay = str(r.get("Logistics_Delay", "0")).strip() in ("1", "true", "True")
            status = normalize_status(r.get("Shipment_Status", ""))

            parsed_row = {
                "source_timestamp": ts,
                "source_asset_id": asset_id,
                "source_latitude": lat,
                "source_longitude": lng,
                "inventory_level": inv,
                "shipment_status": status,
                "temperature": temp,
                "humidity": humidity,
                "traffic_status": traffic,
                "waiting_time": waiting,
                "logistics_delay_reason": delay_reason,
                "asset_utilization": utilization,
                "demand_forecast": demand,
                "logistics_delay": is_delay,
                "user_transaction_amount": tx_amount,
                "user_purchase_frequency": tx_freq,
            }

            if asset_id not in asset_records:
                asset_records[asset_id] = []
            asset_records[asset_id].append(parsed_row)

        # 2. Upsert Trucks and Shipments for each distinct Asset
        truck_map: Dict[str, Truck] = {}

        for asset_id, records in asset_records.items():
            records.sort(key=lambda x: x["source_timestamp"])
            latest = records[-1]

            cfg = ASSET_ROUTE_CONFIG.get(asset_id, {
                "code": f"TRK-{asset_id.replace('Truck_', '10')}",
                "trailer": f"TRL-{asset_id.replace('Truck_', '88')}",
                "driver": "Assigned Fleet Driver",
                "load_type": "Procured Goods",
                "origin": "Chennai DC",
                "origin_coords": (13.0827, 80.2707),
                "destination": "Bengaluru Hub",
                "dest_coords": (12.9716, 77.5946),
                "po_ref": f"PO-2026-{asset_id.replace('Truck_', '00')}",
            })

            shipment = db.query(Shipment).filter(Shipment.shipment_code == f"SHP-{cfg['code']}").first()
            if not shipment:
                shipment = Shipment(
                    id=str(uuid.uuid4()),
                    shipment_code=f"SHP-{cfg['code']}",
                    tracking_number=f"TRK-TRACK-{cfg['code']}",
                    purchase_order_reference=cfg["po_ref"],
                    origin_location=cfg["origin"],
                    destination_location=cfg["destination"],
                    status=latest["shipment_status"],
                )
                db.add(shipment)
                db.flush()
                report["shipments_created_updated"] += 1
            else:
                shipment.status = latest["shipment_status"]
                report["shipments_created_updated"] += 1

            # Determine progress and display coordinates along realistic corridor
            o_lat, o_lng = cfg["origin_coords"]
            d_lat, d_lng = cfg["dest_coords"]
            if latest["shipment_status"] == "DELIVERED":
                prog = 100
                disp_lat, disp_lng = d_lat, d_lng
            elif latest["shipment_status"] == "DELAYED":
                prog = 45
                disp_lat = round(o_lat + (d_lat - o_lat) * 0.45, 6)
                disp_lng = round(o_lng + (d_lng - o_lng) * 0.45, 6)
            else:
                prog = 65
                disp_lat = round(o_lat + (d_lat - o_lat) * 0.65, 6)
                disp_lng = round(o_lng + (d_lng - o_lng) * 0.65, 6)

            truck = db.query(Truck).filter(
                (Truck.source_asset_id == asset_id)
                | (Truck.truck_code == cfg["code"])
                | (Truck.trailer_id == cfg["trailer"])
            ).first()

            if not truck:
                truck = Truck(
                    id=str(uuid.uuid4()),
                    truck_code=cfg["code"],
                    trailer_id=cfg["trailer"],
                    shipment_id=shipment.id,
                    driver_name=cfg["driver"],
                    load_type=cfg["load_type"],
                    status=latest["shipment_status"],
                    current_lat=disp_lat,
                    current_lng=disp_lng,
                    display_lat=disp_lat,
                    display_lng=disp_lng,
                    progress_percent=prog,
                    source_asset_id=asset_id,
                    inventory_level=latest["inventory_level"],
                    temperature=latest["temperature"],
                    humidity=latest["humidity"],
                    traffic_status=latest["traffic_status"],
                    waiting_time=latest["waiting_time"],
                    logistics_delay_reason=latest["logistics_delay_reason"],
                    asset_utilization=latest["asset_utilization"],
                    demand_forecast=latest["demand_forecast"],
                    is_delayed=latest["logistics_delay"],
                    latest_telemetry_timestamp=latest["source_timestamp"],
                    delay_minutes=45 if latest["logistics_delay"] else 0,
                    priority="HIGH" if latest["logistics_delay"] else "NORMAL",
                )
                db.add(truck)
                db.flush()
                report["trucks_created_updated"] += 1
            else:
                truck.status = latest["shipment_status"]
                truck.current_lat = disp_lat
                truck.current_lng = disp_lng
                truck.display_lat = disp_lat
                truck.display_lng = disp_lng
                truck.progress_percent = prog
                truck.source_asset_id = asset_id
                truck.inventory_level = latest["inventory_level"]
                truck.temperature = latest["temperature"]
                truck.humidity = latest["humidity"]
                truck.traffic_status = latest["traffic_status"]
                truck.waiting_time = latest["waiting_time"]
                truck.logistics_delay_reason = latest["logistics_delay_reason"]
                truck.asset_utilization = latest["asset_utilization"]
                truck.demand_forecast = latest["demand_forecast"]
                truck.is_delayed = latest["logistics_delay"]
                truck.latest_telemetry_timestamp = latest["source_timestamp"]
                truck.delay_minutes = 45 if latest["logistics_delay"] else 0
                if shipment:
                    truck.shipment_id = shipment.id
                report["trucks_created_updated"] += 1

            truck_map[asset_id] = truck

        # 3. Batch Insert Telemetry Records (Idempotent)
        telemetry_to_insert = []
        for asset_id, records in asset_records.items():
            truck = truck_map.get(asset_id)
            cfg = ASSET_ROUTE_CONFIG.get(asset_id)
            o_lat, o_lng = cfg["origin_coords"] if cfg else (13.0827, 80.2707)
            d_lat, d_lng = cfg["dest_coords"] if cfg else (12.9716, 77.5946)

            for rec in records:
                key = (rec["source_asset_id"], rec["source_timestamp"])
                if key in existing_keys:
                    report["rows_skipped"] += 1
                    continue

                # Compute display coordinate interpolation
                disp_lat = round(o_lat + (d_lat - o_lat) * 0.5, 6)
                disp_lng = round(o_lng + (d_lng - o_lng) * 0.5, 6)

                telemetry = TruckTelemetry(
                    id=str(uuid.uuid4()),
                    truck_id=truck.id if truck else None,
                    source_timestamp=rec["source_timestamp"],
                    source_asset_id=rec["source_asset_id"],
                    source_latitude=rec["source_latitude"],
                    source_longitude=rec["source_longitude"],
                    display_latitude=disp_lat,
                    display_longitude=disp_lng,
                    inventory_level=rec["inventory_level"],
                    shipment_status=rec["shipment_status"],
                    temperature=rec["temperature"],
                    humidity=rec["humidity"],
                    traffic_status=rec["traffic_status"],
                    waiting_time=rec["waiting_time"],
                    logistics_delay_reason=rec["logistics_delay_reason"],
                    asset_utilization=rec["asset_utilization"],
                    demand_forecast=rec["demand_forecast"],
                    logistics_delay=rec["logistics_delay"],
                    user_transaction_amount=rec["user_transaction_amount"],
                    user_purchase_frequency=rec["user_purchase_frequency"],
                )
                telemetry_to_insert.append(telemetry)
                existing_keys.add(key)
                report["telemetry_rows_inserted"] += 1
                report["rows_imported"] += 1

        if telemetry_to_insert:
            db.bulk_save_objects(telemetry_to_insert)

        db.commit()

        print("\n" + "=" * 70)
        print("IMPORT COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print(f"Total Rows Read:          {report['rows_read']}")
        print(f"Rows Newly Imported:      {report['rows_imported']}")
        print(f"Rows Skipped (Existing):  {report['rows_skipped']}")
        print(f"Rows Rejected:            {report['rows_rejected']}")
        print(f"Trucks Created/Updated:   {report['trucks_created_updated']}")
        print(f"Shipments Created/Updated:{report['shipments_created_updated']}")
        print(f"Telemetry Rows Inserted:  {report['telemetry_rows_inserted']}")
        if report["rejection_reasons"]:
            print(f"Rejection Reasons Sample: {report['rejection_reasons'][:5]}")
        print("=" * 70)

        return report

    except Exception as e:
        db.rollback()
        print(f"ERROR during import: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_import()
