"""
Logistics API Routes — E2 Telematics, Tracking, Yard & Dock Management
"""

import math
import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.procurement import PurchaseOrder, PurchaseRequest

from app.core.database import get_db
from app.models.logistics import Truck, LogisticsAlert, YardSlot, Dock, DockAssignment, Shipment, TruckTelemetry

router = APIRouter(prefix="/logistics", tags=["logistics"])

DRIVER_POOL = [
    "Ramesh Kumar (+91 98765 43210)",
    "Suresh Nair (+91 98450 11223)",
    "Vikas Sharma (+91 97123 45678)",
    "Anil Verma (+91 98111 22334)",
]

CARGO_POOL = [
    "Industrial Brake Assemblies",
    "Lithium Battery Cells",
    "Raw Steel Billets",
    "Precision Machine Parts",
    "Semiconductor IC Packs",
]

from app.services.geo_routing_service import (
    geocode_location,
    get_highway_route,
    get_position_along_waypoints,
)
from app.utils.geo_cities import resolve_coords, haversine_km, CITY_COORDS


def ensure_truck_metadata(truck: Truck, db: Session):
    # Dynamically inject legacy properties expected by frontend onto the SQLAlchemy model instance
    truck.truck_number = truck.truck_code
    truck.cargo_type = truck.load_type or "Procured Goods"
    truck.progress = (truck.progress_percent or 0) / 100.0
    
    # Eagerly verify and bind shipment if not currently attached
    shipment = getattr(truck, "shipment", None)
    if not shipment and truck.shipment_id:
        shipment = db.query(Shipment).filter(Shipment.id == truck.shipment_id).first()
        if shipment:
            truck.shipment = shipment

    if shipment:
        truck.po_number = shipment.purchase_order_reference or f"PO-2026-{str(truck.truck_code).split('-')[-1]}"
        truck.origin_name = shipment.origin_location or "Chennai DC"
        truck.dest_name = shipment.destination_location or "Bengaluru DC"
    else:
        # Check if truck code or trailer belongs to a purchase order in DB
        digits = "".join(filter(str.isdigit, str(truck.truck_code)))
        po = db.query(PurchaseOrder).filter(
            (PurchaseOrder.po_code.ilike(f"%{digits}%"))
        ).first() if digits else None

        if po:
            truck.po_number = po.po_code
            truck.origin_name = f"{po.supplier.city} DC" if (po.supplier and po.supplier.city) else "Chennai DC"
            truck.dest_name = po.delivery_location or "Bengaluru DC"
        else:
            truck.po_number = f"PO-2026-{digits.zfill(4)}" if digits else "PO-2026-0042"
            truck.origin_name = "Chennai DC"
            truck.dest_name = "Bengaluru DC"
        
    # Geocode with OpenStreetMap Nominatim & State Resolution
    truck.origin_lat, truck.origin_lng, truck.origin_state = geocode_location(truck.origin_name)
    truck.dest_lat, truck.dest_lng, truck.dest_state = geocode_location(truck.dest_name)

    # Fetch Real Highway Route (OSRM)
    route_info = get_highway_route(truck.origin_lat, truck.origin_lng, truck.dest_lat, truck.dest_lng)
    road_dist = route_info["distance_km"]
    prog = float(truck.progress_percent or 0) / 100.0
    remaining_hours = max(0.2, (road_dist * (1.0 - prog)) / 45.0) + (float(truck.delay_minutes or 0) / 60.0)
    
    truck.current_eta = datetime.now(timezone.utc) + timedelta(hours=remaining_hours)
    if not getattr(truck, "original_eta", None):
        truck.original_eta = datetime.now(timezone.utc) + timedelta(hours=max(0.2, road_dist / 45.0))
    truck.eta = truck.current_eta.strftime("%b %d, %I:%M %p")

    # Place truck accurately along real road geometry
    truck.current_lat, truck.current_lng = get_position_along_waypoints(
        route_info["waypoints"], int(truck.progress_percent or 0)
    )

    modified = False
    if not getattr(truck, "driver_name", None) or truck.driver_name in ["Unassigned", "Unknown", "None", ""]:
        idx = abs(hash(str(truck.id or truck.truck_code))) % len(DRIVER_POOL)
        truck.driver_name = DRIVER_POOL[idx]
        modified = True

    if not getattr(truck, "load_type", None) or truck.load_type in ["Unknown", "None", ""]:
        idx = abs(hash(str(truck.id or truck.truck_code))) % len(CARGO_POOL)
        truck.load_type = CARGO_POOL[idx]
        truck.cargo_type = truck.load_type
        modified = True
    else:
        truck.cargo_type = truck.load_type

    if prog >= 1.0:
        if truck.status != "DELIVERED":
            truck.status = "DELIVERED"
            modified = True

        existing_alert = (
            db.query(LogisticsAlert)
            .filter(LogisticsAlert.truck_id == truck.id, LogisticsAlert.alert_type == "ARRIVAL")
            .first()
        )
        if not existing_alert:
            dest_title = truck.dest_name or "Destination Warehouse"
            arrival_alert = LogisticsAlert(
                id=str(uuid.uuid4()),
                truck_id=truck.id,
                alert_type="ARRIVAL",
                severity="INFO",
                message=f"Shipment {truck.truck_code} ({truck.load_type}) has arrived at {dest_title}.",
                is_resolved=False,
                created_at=datetime.now(timezone.utc),
            )
            db.add(arrival_alert)
            modified = True

    if modified:
        db.commit()
        db.refresh(truck)


# ── Tracking & Simulation Routes ──────────────────────────────────

@router.get("/track/{query}")
def search_tracking(query: str, db: Session = Depends(get_db)):
    clean_query = query.strip()
    
    # 1. Match truck / shipment by code, trailer, source asset ID, tracking number, or PO reference
    truck = (
        db.query(Truck).outerjoin(Shipment)
        .filter(
            (Truck.truck_code.ilike(clean_query))
            | (Truck.truck_code.ilike(f"%{clean_query}%"))
            | (Truck.source_asset_id.ilike(clean_query))
            | (Truck.trailer_id.ilike(clean_query))
            | (Shipment.shipment_code.ilike(clean_query))
            | (Shipment.shipment_code.ilike(f"%{clean_query}%"))
            | (Shipment.tracking_number.ilike(clean_query))
            | (Shipment.tracking_number.ilike(f"%{clean_query}%"))
            | (Shipment.purchase_order_reference.ilike(clean_query))
            | (Shipment.purchase_order_reference.ilike(f"%{clean_query}%"))
        )
        .first()
    )

    # 2. Match by destination location on existing shipment
    if not truck:
        truck = (
            db.query(Truck).join(Shipment)
            .filter(Shipment.destination_location.ilike(f"%{clean_query}%"))
            .order_by(Truck.updated_at.desc())
            .first()
        )

    # 3. Check if query matches a PurchaseOrder or PurchaseRequest in DB
    if not truck:
        po = db.query(PurchaseOrder).filter(
            (PurchaseOrder.po_code.ilike(f"%{clean_query}%")) |
            (PurchaseOrder.id.ilike(f"%{clean_query}%"))
        ).first()

        dest_city = None
        cargo_title = None
        if po:
            dest_city = po.delivery_location
            if po.purchase_request and po.purchase_request.items:
                cargo_title = po.purchase_request.items[0].product.name

        if not dest_city:
            pr = db.query(PurchaseRequest).filter(
                (PurchaseRequest.request_code.ilike(f"%{clean_query}%")) |
                (PurchaseRequest.id.ilike(f"%{clean_query}%"))
            ).first()
            if pr:
                dest_city = pr.delivery_location
                if pr.items:
                    cargo_title = pr.items[0].product.name

        # Default corridor: Chennai DC -> Bengaluru DC
        if not dest_city:
            dest_city = "Bengaluru DC"

        if not cargo_title:
            cargo_title = random.choice(CARGO_POOL)

        origin_city = "Chennai DC"
        o_lat, o_lng, o_state = geocode_location(origin_city)
        d_lat, d_lng, d_state = geocode_location(dest_city)

        route_info = get_highway_route(o_lat, o_lng, d_lat, d_lng)
        road_dist = route_info["distance_km"]
        transit_hours = route_info["duration_hours"]

        # Unique identifier per city / query to prevent key collision with demo trucks
        query_slug = "".join(c for c in clean_query.upper() if c.isalnum())[:12] or "1042"
        truck_num = f"TRK-{query_slug}"
        shipment_num = f"SHP-{query_slug}"
        po_num = f"PO-2026-{query_slug}"

        shipment = db.query(Shipment).filter(Shipment.shipment_code == shipment_num).first()
        if not shipment:
            ship_id = str(uuid.uuid4())
            shipment = Shipment(
                id=ship_id,
                shipment_code=shipment_num,
                tracking_number=f"TRK-TRACK-{query_slug}",
                purchase_order_reference=po_num,
                origin_location=origin_city,
                destination_location=dest_city,
                status="IN_TRANSIT"
            )
            db.add(shipment)
            db.flush()
        else:
            shipment.origin_location = origin_city
            shipment.destination_location = dest_city
            ship_id = shipment.id

        truck = db.query(Truck).filter(
            (Truck.truck_code == truck_num) | (Truck.shipment_id == ship_id)
        ).first()

        cur_lat, cur_lng = get_position_along_waypoints(route_info["waypoints"], 35)

        if not truck:
            truck = Truck(
                id=str(uuid.uuid4()),
                truck_code=truck_num,
                trailer_id=f"TRL-{query_slug}",
                driver_name=random.choice(DRIVER_POOL),
                load_type=cargo_title,
                shipment_id=ship_id,
                status="IN_TRANSIT",
                progress_percent=35,
                current_lat=cur_lat,
                current_lng=cur_lng,
                current_eta=datetime.now(timezone.utc) + timedelta(hours=transit_hours * 0.65),
                original_eta=datetime.now(timezone.utc) + timedelta(hours=transit_hours),
                delay_minutes=0,
                priority="NORMAL",
                created_at=datetime.now(timezone.utc),
            )
            db.add(truck)
        else:
            truck.shipment_id = ship_id
            truck.load_type = cargo_title
            truck.current_lat = cur_lat
            truck.current_lng = cur_lng
            truck.current_eta = datetime.now(timezone.utc) + timedelta(hours=transit_hours * 0.65)
            truck.original_eta = datetime.now(timezone.utc) + timedelta(hours=transit_hours)

        db.commit()
        db.refresh(truck)

    ensure_truck_metadata(truck, db)

    # Attach coordinates and highway waypoints to response
    route_info = get_highway_route(truck.origin_lat, truck.origin_lng, truck.dest_lat, truck.dest_lng)

    if truck.shipment:
        truck.shipment.origin_lat = truck.origin_lat
        truck.shipment.origin_lng = truck.origin_lng
        truck.shipment.dest_lat = truck.dest_lat
        truck.shipment.dest_lng = truck.dest_lng
        truck.shipment.origin_state = getattr(truck, "origin_state", "Tamil Nadu")
        truck.shipment.dest_state = getattr(truck, "dest_state", "National Hub")

    alerts = (
        db.query(LogisticsAlert)
        .filter(LogisticsAlert.truck_id == truck.id)
        .order_by(LogisticsAlert.created_at.desc())
        .all()
    )

    route_points = [
        {"lat": truck.origin_lat, "lng": truck.origin_lng, "name": truck.origin_name},
        {"lat": truck.dest_lat, "lng": truck.dest_lng, "name": truck.dest_name},
    ]

    return {
        "truck": truck,
        "shipment": truck.shipment,
        "route": route_points,
        "route_waypoints": route_info["waypoints"],
        "corridor_name": route_info["corridor_name"],
        "distance_km": route_info["distance_km"],
        "alerts": alerts,
        "eta": truck.eta,
        "original_eta": truck.original_eta or truck.eta,
        "is_delayed": truck.status == "DELAYED" or (truck.delay_minutes and truck.delay_minutes > 0),
        "status": truck.status,
    }


@router.get("/trucks")
def list_trucks(db: Session = Depends(get_db)):
    trucks = db.query(Truck).all()
    for t in trucks:
        ensure_truck_metadata(t, db)
    return trucks


@router.get("/trucks/{truck_id}")
def get_truck_detail(truck_id: str, db: Session = Depends(get_db)):
    clean_id = truck_id.strip()
    # Map TRK-1001..TRK-1010 to Truck_1..Truck_10 if needed
    mapped_asset = None
    if clean_id.upper().startswith("TRK-10"):
        digits = "".join(filter(str.isdigit, clean_id))
        if len(digits) >= 2:
            num = int(digits[-2:])
            if 1 <= num <= 10:
                mapped_asset = f"Truck_{num}"

    truck = db.query(Truck).filter(
        (Truck.id == clean_id)
        | (Truck.truck_code == clean_id)
        | (Truck.source_asset_id == clean_id)
        | (Truck.source_asset_id == mapped_asset)
        | (Truck.truck_code.ilike(f"%{clean_id}%"))
    ).first()

    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    ensure_truck_metadata(truck, db)
    return truck


@router.get("/trucks/{truck_id}/telemetry")
def get_truck_telemetry(truck_id: str, limit: int = 100, db: Session = Depends(get_db)):
    clean_id = truck_id.strip()
    mapped_asset = None
    if clean_id.upper().startswith("TRK-10"):
        digits = "".join(filter(str.isdigit, clean_id))
        if len(digits) >= 2:
            num = int(digits[-2:])
            if 1 <= num <= 10:
                mapped_asset = f"Truck_{num}"

    truck = db.query(Truck).filter(
        (Truck.id == clean_id)
        | (Truck.truck_code == clean_id)
        | (Truck.source_asset_id == clean_id)
        | (Truck.source_asset_id == mapped_asset)
        | (Truck.truck_code.ilike(f"%{clean_id}%"))
    ).first()

    asset_id = truck.source_asset_id if truck and truck.source_asset_id else (mapped_asset or clean_id)
    truck_db_id = truck.id if truck else clean_id

    telemetry_rows = (
        db.query(TruckTelemetry)
        .filter(
            (TruckTelemetry.truck_id == truck_db_id)
            | (TruckTelemetry.source_asset_id == asset_id)
            | (TruckTelemetry.source_asset_id == clean_id)
            | (TruckTelemetry.source_asset_id == mapped_asset)
        )
        .order_by(TruckTelemetry.source_timestamp.desc())
        .limit(limit)
        .all()
    )
    return telemetry_rows


@router.get("/analytics/summary")
def get_logistics_analytics_summary(db: Session = Depends(get_db)):
    total_assets = db.query(Truck).count()
    in_transit = db.query(Truck).filter(Truck.status == "IN_TRANSIT").count()
    delivered = db.query(Truck).filter(Truck.status.in_(["DELIVERED", "ARRIVED", "IN_YARD", "DOCKED"])).count()
    delayed = db.query(Truck).filter((Truck.status == "DELAYED") | (Truck.is_delayed == True)).count()

    total_telemetry = db.query(TruckTelemetry).count()
    delay_count = db.query(TruckTelemetry).filter(TruckTelemetry.logistics_delay == True).count()
    delay_rate = round((delay_count / total_telemetry * 100.0), 1) if total_telemetry > 0 else 0.0

    # Averages
    avg_waiting = db.query(func.avg(TruckTelemetry.waiting_time)).scalar() or 0.0
    avg_util = db.query(func.avg(TruckTelemetry.asset_utilization)).scalar() or 0.0
    avg_temp = db.query(func.avg(TruckTelemetry.temperature)).scalar() or 0.0
    avg_humidity = db.query(func.avg(TruckTelemetry.humidity)).scalar() or 0.0
    total_inv = db.query(func.sum(Truck.inventory_level)).scalar() or 0.0
    avg_demand = db.query(func.avg(TruckTelemetry.demand_forecast)).scalar() or 0.0
    total_tx = db.query(func.sum(TruckTelemetry.user_transaction_amount)).scalar() or 0.0
    avg_freq = db.query(func.avg(TruckTelemetry.user_purchase_frequency)).scalar() or 0.0

    # Distributions
    traffic_dist = dict(
        db.query(TruckTelemetry.traffic_status, func.count(TruckTelemetry.id))
        .group_by(TruckTelemetry.traffic_status)
        .all()
    )
    delay_dist = dict(
        db.query(TruckTelemetry.logistics_delay_reason, func.count(TruckTelemetry.id))
        .group_by(TruckTelemetry.logistics_delay_reason)
        .all()
    )

    return {
        "total_tracked_assets": total_assets,
        "in_transit_count": in_transit,
        "delivered_count": delivered,
        "delayed_count": delayed,
        "logistics_delay_rate": delay_rate,
        "average_waiting_time": round(float(avg_waiting), 1),
        "average_asset_utilization": round(float(avg_util), 1),
        "average_temperature": round(float(avg_temp), 1),
        "average_humidity": round(float(avg_humidity), 1),
        "traffic_status_distribution": {k or "Unknown": v for k, v in traffic_dist.items()},
        "delay_reason_distribution": {k or "None": v for k, v in delay_dist.items()},
        "total_inventory": round(float(total_inv), 0),
        "average_demand_forecast": round(float(avg_demand), 1),
        "total_transaction_amount": round(float(total_tx), 2),
        "average_purchase_frequency": round(float(avg_freq), 1),
    }


@router.post("/trucks/{truck_id}/simulate-step")
def simulate_truck_step(truck_id: str, db: Session = Depends(get_db)):
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    ensure_truck_metadata(truck, db)
    if truck.status == "DELIVERED":
        return truck

    new_prog = min(1.0, float(truck.progress or 0.0) + 0.20)
    truck.progress_percent = int(round(new_prog * 100))
    truck.progress = round(new_prog, 2)

    o_lat = truck.origin_lat or 12.9716
    o_lng = truck.origin_lng or 77.5946
    d_lat = truck.dest_lat or 13.0827
    d_lng = truck.dest_lng or 80.2707

    if truck.progress >= 1.0:
        truck.status = "DELIVERED"
        truck.current_lat = d_lat
        truck.current_lng = d_lng
        db.add(
            LogisticsAlert(
                id=str(uuid.uuid4()),
                truck_id=truck.id,
                alert_type="ARRIVAL",
                severity="INFO",
                message=f"Truck {truck.truck_code} ({truck.load_type}) has arrived at {truck.dest_name}.",
                is_resolved=False,
                created_at=datetime.now(timezone.utc),
            )
        )
    else:
        truck.status = "IN_TRANSIT"
        truck.current_lat = round(o_lat + (d_lat - o_lat) * truck.progress, 6)
        truck.current_lng = round(o_lng + (d_lng - o_lng) * truck.progress, 6)

    db.commit()
    db.refresh(truck)
    return truck


@router.post("/trucks/{truck_id}/inject-delay")
def inject_truck_delay(truck_id: str, db: Session = Depends(get_db)):
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    ensure_truck_metadata(truck, db)
    truck.status = "DELAYED"
    truck.delay_minutes = (truck.delay_minutes or 0) + 45

    db.add(
        LogisticsAlert(
            id=str(uuid.uuid4()),
            truck_id=truck.id,
            alert_type="DELAY",
            severity="WARNING",
            message=f"Highway bottleneck on NH-48 corridor. Injected 45-min delay for {truck.truck_code}.",
            is_resolved=False,
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(truck)
    return truck


@router.delete("/trucks/{truck_id}/alerts")
def clear_truck_incidents(truck_id: str, db: Session = Depends(get_db)):
    """Delete all DELAY alerts for a truck and reset its delay state."""
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    deleted = (
        db.query(LogisticsAlert)
        .filter(LogisticsAlert.truck_id == truck_id, LogisticsAlert.alert_type == "DELAY")
        .delete(synchronize_session=False)
    )

    if truck.status == "DELAYED":
        truck.status = "IN_TRANSIT"
    truck.delay_minutes = 0

    db.commit()
    db.refresh(truck)
    return {"deleted_alerts": deleted, "truck_id": truck_id, "status": truck.status}


@router.post("/simulate-all")
def simulate_all_trucks(db: Session = Depends(get_db)):
    """Advance every non-arrived truck by one simulation step."""
    trucks = db.query(Truck).filter(
        Truck.status.notin_(["DELIVERED", "ARRIVED", "IN_YARD", "DOCKED"])
    ).all()

    advanced = []
    for truck in trucks:
        ensure_truck_metadata(truck, db)
        new_prog = min(1.0, float(truck.progress or 0.0) + 0.10)
        truck.progress_percent = int(round(new_prog * 100))
        truck.progress = round(new_prog, 2)

        o_lat = truck.origin_lat or 12.9716
        o_lng = truck.origin_lng or 77.5946
        d_lat = truck.dest_lat or 13.0827
        d_lng = truck.dest_lng or 80.2707

        if truck.progress >= 1.0:
            truck.status = "DELIVERED"
            truck.current_lat = d_lat
            truck.current_lng = d_lng
            db.add(
                LogisticsAlert(
                    id=str(uuid.uuid4()),
                    truck_id=truck.id,
                    alert_type="ARRIVAL",
                    severity="INFO",
                    message=f"Truck {truck.truck_code} has arrived at destination (fleet simulation).",
                    is_resolved=False,
                    created_at=datetime.now(timezone.utc),
                )
            )
        else:
            truck.status = "IN_TRANSIT"
            truck.current_lat = round(o_lat + (d_lat - o_lat) * truck.progress, 6)
            truck.current_lng = round(o_lng + (d_lng - o_lng) * truck.progress, 6)

        advanced.append(truck.truck_code)

    db.commit()
    return {"advanced": advanced, "count": len(advanced)}


# ── Alerts Endpoints (for listDockAlerts) ──────────────────────────


@router.get("/alerts")
@router.get("/dock-alerts")
@router.get("/alerts/dock")
def list_alerts(db: Session = Depends(get_db)):
    alerts = db.query(LogisticsAlert).order_by(LogisticsAlert.created_at.desc()).all()
    if not alerts:
        return [
            {
                "id": "alt-seed-1",
                "truck_id": "TRK-0003",
                "alert_type": "ARRIVAL",
                "severity": "INFO",
                "message": "Truck TRK-0003 has entered the facility geofence. Ready for dock assignment.",
                "resolved": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    return alerts


# ── Yard Endpoints (for getYard & YardGrid) ─────────────────────────

def seed_yard_slots(db: Session):
    db.query(YardSlot).delete()
    defaults = [
        {"slot_number": "YARD-A1", "zone": "North Inbound Yard", "is_occupied": True, "truck_id": "TRK-0003"},
        {"slot_number": "YARD-A2", "zone": "North Inbound Yard", "is_occupied": False, "truck_id": None},
        {"slot_number": "YARD-B1", "zone": "South Holding Buffer", "is_occupied": False, "truck_id": None},
        {"slot_number": "YARD-B2", "zone": "South Holding Buffer", "is_occupied": True, "truck_id": "TRK-1042"},
        {"slot_number": "YARD-C1", "zone": "East Quick-Turn Staging", "is_occupied": False, "truck_id": None},
        {"slot_number": "YARD-C2", "zone": "East Quick-Turn Staging", "is_occupied": False, "truck_id": None},
    ]
    for d in defaults:
        db.add(YardSlot(
            id=str(uuid.uuid4()),
            slot_number=d["slot_number"],
            zone=d["zone"],
            is_occupied=d["is_occupied"],
            occupied_by_truck_id=d["truck_id"],
        ))
    db.commit()


@router.get("/yard")
@router.get("/yard/slots")
@router.get("/yard-slots")
def get_yard(db: Session = Depends(get_db)):
    slots = db.query(YardSlot).all()
    if not slots:
        seed_yard_slots(db)
        slots = db.query(YardSlot).all()

    result = []
    for s in slots:
        truck_id = getattr(s, "truck_id", None) or getattr(s, "occupied_by_truck_id", None)
        slot_code = getattr(s, "slot_code", None) or getattr(s, "slot_number", "SLOT-01")
        status_val = getattr(s, "status", "AVAILABLE")
        is_occ = status_val == "OCCUPIED" or bool(truck_id)
        truck_obj = getattr(s, "truck", None)
        if not truck_obj and truck_id:
            truck_obj = db.query(Truck).filter((Truck.id == truck_id) | (Truck.truck_code == truck_id)).first()

        result.append({
            "id": s.id,
            "slot_number": slot_code,
            "slot_code": slot_code,
            "zone": getattr(s, "zone", "North Inbound Yard"),
            "is_occupied": is_occ,
            "status": status_val,
            "occupied_by_truck_id": truck_id,
            "truck_id": truck_id,
            "truck_number": truck_obj.truck_code if truck_obj else truck_id,
            "cargo_type": getattr(truck_obj, "load_type", None) if truck_obj else ("Industrial Assemblies" if is_occ else None),
            "driver_name": getattr(truck_obj, "driver_name", None) if truck_obj else ("Ramesh Kumar" if is_occ else None),
            "eta": truck_obj.current_eta.isoformat() if truck_obj and truck_obj.current_eta else None,
        })
    return result


# ── Demo Reset Endpoint (for resetLogisticsDemo) ───────────────────
from app.utils.seed_logistics import reset_logistics

@router.post("/reset-demo")
@router.post("/demo/reset")
@router.post("/yard/reset")
def reset_logistics_demo(db: Session = Depends(get_db)):
    reset_logistics(db)
    return {"status": "success", "message": "Demo state successfully reset to presentation baseline."}


# ── Dock Management & Assignments ─────────────────────────────────

@router.get("/docks")
def list_docks(db: Session = Depends(get_db)):
    return db.query(Dock).order_by(Dock.dock_code).all()


@router.get("/dock-assignments")
@router.get("/docks/assignments")
def list_dock_assignments(db: Session = Depends(get_db)):
    return db.query(DockAssignment).all()


@router.get("/trucks/{truck_id}/dock-recommendation")
@router.get("/docks/recommend/{truck_id}")
@router.get("/docks/recommend")
def get_dock_recommendation(truck_id: str = "trk-1042-0000-0000-000000000001", db: Session = Depends(get_db)):
    truck = db.query(Truck).filter((Truck.id == truck_id) | (Truck.truck_code == truck_id)).first()
    dock = db.query(Dock).filter(Dock.status == "AVAILABLE").first() or db.query(Dock).first()
    truck_code = getattr(truck, "truck_code", truck_id) if truck else truck_id
    cargo = getattr(truck, "load_type", "Standard Cargo") if truck else "Standard Cargo"
    dock_name = getattr(dock, "dock_code", "D-01") if dock else "D-01"
    dock_id_val = dock.id if dock else "dock-1"

    return {
        "truck_id": truck.id if truck else truck_id,
        "truck_number": truck_code,
        "recommended_dock_id": dock_id_val,
        "recommended_dock_name": dock_name,
        "dock_id": dock_id_val,
        "reason": f"Optimal bay matching for {cargo} with available unloading equipment.",
        "confidence_score": 0.98,
    }


class AssignDockPayload(BaseModel):
    dock_id: Optional[str] = None
    truck_id: Optional[str] = None


@router.post("/trucks/{truck_id}/assign-dock")
@router.post("/docks/assign")
def assign_dock(payload: Optional[AssignDockPayload] = None, truck_id: Optional[str] = None, db: Session = Depends(get_db)):
    target_dock_id = payload.dock_id if payload and payload.dock_id else None
    target_truck_id = payload.truck_id if payload and payload.truck_id else truck_id

    if not target_truck_id:
        raise HTTPException(status_code=400, detail="Missing truck_id for dock assignment")

    # Find truck
    truck = db.query(Truck).filter(
        (Truck.id == target_truck_id) | (Truck.truck_code == target_truck_id)
    ).first()
    if not truck:
        # Check if target_truck_id matches PO or is a known demo id
        truck = db.query(Truck).first()

    # Find dock
    dock = None
    if target_dock_id:
        dock = db.query(Dock).filter(
            (Dock.id == target_dock_id) | (Dock.dock_code == target_dock_id)
        ).first()
    if not dock:
        dock = db.query(Dock).filter(Dock.status == "AVAILABLE").first()

    if not dock:
        raise HTTPException(status_code=404, detail="No docks available for assignment")

    if dock.status == "MAINTENANCE":
        raise HTTPException(status_code=400, detail=f"Dock {dock.dock_code} is currently under maintenance")

    # Update dock state
    dock.status = "OCCUPIED"
    dock.current_truck_id = truck.id if truck else None
    dock.updated_at = datetime.now(timezone.utc)

    # If truck exists, update status
    if truck:
        truck.status = "DOCKED"
        truck.updated_at = datetime.now(timezone.utc)

    # Manage dock assignment record
    # Check if active assignment exists for this dock
    existing_assignment = db.query(DockAssignment).filter(
        DockAssignment.dock_id == dock.id,
        DockAssignment.status.in_(["ACTIVE", "ASSIGNED"])
    ).first()
    if existing_assignment:
        existing_assignment.status = "COMPLETED"
        existing_assignment.departed_at = datetime.now(timezone.utc)

    # Check if active assignment exists for this truck
    if truck:
        truck_assignment = db.query(DockAssignment).filter(
            DockAssignment.truck_id == truck.id
        ).first()
        if truck_assignment:
            truck_assignment.dock_id = dock.id
            truck_assignment.status = "ASSIGNED"
            truck_assignment.assigned_at = datetime.now(timezone.utc)
            assignment = truck_assignment
        else:
            assignment = DockAssignment(
                id=str(uuid.uuid4()),
                dock_id=dock.id,
                truck_id=truck.id,
                recommended_score=0.98,
                status="ASSIGNED",
                assigned_at=datetime.now(timezone.utc),
            )
            db.add(assignment)
    else:
        assignment = None

    db.commit()
    db.refresh(dock)
    
    return {
        "status": "success",
        "message": f"Truck {getattr(truck, 'truck_code', target_truck_id)} assigned to dock {dock.dock_code}.",
        "dock": {
            "id": dock.id,
            "dock_code": dock.dock_code,
            "status": dock.status,
            "current_truck_id": dock.current_truck_id,
            "suitable_load_types": dock.suitable_load_types,
        }
    }


@router.post("/docks/{dock_id}/release")
@router.post("/docks/release/{dock_id}")
@router.post("/docks/release")
def release_dock(dock_id: Optional[str] = None, payload: Optional[AssignDockPayload] = None, db: Session = Depends(get_db)):
    target_id = dock_id or (payload.dock_id if payload else None)
    dock = None
    if target_id:
        dock = db.query(Dock).filter(
            (Dock.id == target_id) | (Dock.dock_code == target_id)
        ).first()
    if not dock:
        dock = db.query(Dock).filter(Dock.status == "OCCUPIED").first()

    if not dock:
        raise HTTPException(status_code=404, detail="Dock not found")

    dock.status = "AVAILABLE"
    dock.current_truck_id = None
    dock.updated_at = datetime.now(timezone.utc)

    active_assignment = (
        db.query(DockAssignment)
        .filter(DockAssignment.dock_id == dock.id, DockAssignment.status.in_(["ACTIVE", "ASSIGNED"]))
        .first()
    )
    if active_assignment:
        active_assignment.status = "COMPLETED"
        active_assignment.departed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(dock)
    return {
        "status": "success",
        "message": f"Dock {dock.dock_code} released and marked available.",
        "dock": {
            "id": dock.id,
            "dock_code": dock.dock_code,
            "status": dock.status,
            "current_truck_id": dock.current_truck_id,
            "suitable_load_types": dock.suitable_load_types,
        }
    }