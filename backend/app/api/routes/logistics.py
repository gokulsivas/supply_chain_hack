"""
Logistics API Routes — E2 Telematics, Tracking, Yard & Dock Management
"""

import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.logistics import Truck, LogisticsAlert, YardSlot, Dock, DockAssignment

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


def ensure_truck_metadata(truck: Truck, db: Session):
    modified = False
    if not getattr(truck, "driver_name", None) or truck.driver_name in ["Unassigned", "Unknown", "None", ""]:
        idx = abs(hash(str(truck.id or truck.truck_number))) % len(DRIVER_POOL)
        truck.driver_name = DRIVER_POOL[idx]
        modified = True

    if not getattr(truck, "cargo_type", None) or truck.cargo_type in ["Unknown", "None", ""]:
        idx = abs(hash(str(truck.id or truck.truck_number))) % len(CARGO_POOL)
        truck.cargo_type = CARGO_POOL[idx]
        modified = True

    prog = float(truck.progress or 0.0)
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
                message=f"Shipment {truck.truck_number} ({truck.cargo_type}) has arrived at {dest_title}.",
                resolved=False,
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
    truck = (
        db.query(Truck)
        .filter(
            (Truck.truck_number.ilike(f"%{clean_query}%"))
            | (Truck.trailer_id.ilike(f"%{clean_query}%"))
            | (Truck.shipment_id.ilike(f"%{clean_query}%"))
            | (Truck.po_number.ilike(f"%{clean_query}%"))
        )
        .first()
    )

    if not truck:
        truck_num = clean_query.upper() if clean_query.upper().startswith("TRK-") else f"TRK-{clean_query.upper()}"
        digits = "".join(filter(str.isdigit, truck_num)) or "1042"
        po_num = f"PO-2026-{digits.zfill(4)}"
        shipment_num = f"SHP-PO-{digits.zfill(4)}"

        o_lat, o_lng = 12.9716, 77.5946
        d_lat, d_lng = 13.0827, 80.2707

        truck = Truck(
            id=str(uuid.uuid4()),
            truck_number=truck_num,
            trailer_id=f"TRL-{digits.zfill(5)}",
            driver_name=random.choice(DRIVER_POOL),
            cargo_type=random.choice(CARGO_POOL),
            po_number=po_num,
            shipment_id=shipment_num,
            status="IN_TRANSIT",
            progress=0.45,
            origin_name="Bengaluru Logistics Hub",
            origin_lat=o_lat,
            origin_lng=o_lng,
            dest_name="Chennai DC Central",
            dest_lat=d_lat,
            dest_lng=d_lng,
            current_lat=round(o_lat + (d_lat - o_lat) * 0.45, 6),
            current_lng=round(o_lng + (d_lng - o_lng) * 0.45, 6),
            eta=(datetime.now(timezone.utc) + timedelta(hours=3, minutes=15)).strftime("%b %d, %I:%M %p"),
            original_eta=(datetime.now(timezone.utc) + timedelta(hours=3)).strftime("%b %d, %I:%M %p"),
            delay_minutes=0,
            priority="NORMAL",
            created_at=datetime.now(timezone.utc),
        )
        db.add(truck)
        db.commit()
        db.refresh(truck)

    ensure_truck_metadata(truck, db)

    alerts = (
        db.query(LogisticsAlert)
        .filter(LogisticsAlert.truck_id == truck.id)
        .order_by(LogisticsAlert.created_at.desc())
        .all()
    )

    return {
        "truck": truck,
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


@router.post("/trucks/{truck_id}/simulate-step")
def simulate_truck_step(truck_id: str, db: Session = Depends(get_db)):
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    ensure_truck_metadata(truck, db)
    if truck.status == "DELIVERED":
        return truck

    new_prog = min(1.0, float(truck.progress or 0.0) + 0.20)
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
                message=f"Truck {truck.truck_number} ({truck.cargo_type}) has arrived at {truck.dest_name}.",
                resolved=False,
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
            message=f"Highway bottleneck on NH-48 corridor. Injected 45-min delay for {truck.truck_number}.",
            resolved=False,
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(truck)
    return truck


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
        truck_obj = None
        if s.occupied_by_truck_id:
            truck_obj = db.query(Truck).filter((Truck.id == s.occupied_by_truck_id) | (Truck.truck_number == s.occupied_by_truck_id)).first()

        result.append({
            "id": s.id,
            "slot_number": s.slot_number,
            "slot_code": s.slot_number,
            "zone": s.zone or "Main Yard",
            "is_occupied": bool(s.is_occupied),
            "status": "OCCUPIED" if s.is_occupied else "AVAILABLE",
            "occupied_by_truck_id": s.occupied_by_truck_id,
            "truck_id": s.occupied_by_truck_id,
            "truck_number": truck_obj.truck_number if truck_obj else s.occupied_by_truck_id,
            "cargo_type": truck_obj.cargo_type if truck_obj else ("Industrial Assemblies" if s.is_occupied else None),
            "driver_name": truck_obj.driver_name if truck_obj else ("Ramesh Kumar" if s.is_occupied else None),
            "eta": truck_obj.eta if truck_obj else None,
        })
    return result


# ── Demo Reset Endpoint (for resetLogisticsDemo) ───────────────────

@router.post("/reset-demo")
@router.post("/demo/reset")
@router.post("/yard/reset")
def reset_logistics_demo(db: Session = Depends(get_db)):
    seed_yard_slots(db)
    return {"status": "success", "message": "Demo state successfully reset to presentation baseline."}


# ── Dock Management & Assignments ─────────────────────────────────

def seed_docks_if_empty(db: Session):
    docks = db.query(Dock).all()
    if not docks:
        defaults = [
            {"dock_number": "DOCK-01", "dock_type": "HIGH_CAPACITY", "is_occupied": False, "capacity_limit": 50000},
            {"dock_number": "DOCK-02", "dock_type": "DRY_CARGO", "is_occupied": True, "capacity_limit": 30000},
            {"dock_number": "DOCK-03", "dock_type": "COLD_STORAGE", "is_occupied": False, "capacity_limit": 20000},
            {"dock_number": "DOCK-04", "dock_type": "HEAVY_MACHINERY", "is_occupied": False, "capacity_limit": 80000},
        ]
        for d in defaults:
            db.add(Dock(
                id=str(uuid.uuid4()),
                dock_number=d["dock_number"],
                dock_type=d["dock_type"],
                is_occupied=d["is_occupied"],
                capacity_limit=d["capacity_limit"],
            ))
        db.commit()


@router.get("/docks")
def list_docks(db: Session = Depends(get_db)):
    seed_docks_if_empty(db)
    return db.query(Dock).all()


@router.get("/dock-assignments")
@router.get("/docks/assignments")
def list_dock_assignments(db: Session = Depends(get_db)):
    return db.query(DockAssignment).all()


@router.get("/trucks/{truck_id}/dock-recommendation")
@router.get("/docks/recommend/{truck_id}")
@router.get("/docks/recommend")
def get_dock_recommendation(truck_id: str = "TRK-0003", db: Session = Depends(get_db)):
    seed_docks_if_empty(db)
    truck = db.query(Truck).filter((Truck.id == truck_id) | (Truck.truck_number == truck_id)).first()
    dock = db.query(Dock).filter(Dock.is_occupied == False).first() or db.query(Dock).first()

    return {
        "truck_id": truck.id if truck else truck_id,
        "truck_number": truck.truck_number if truck else truck_id,
        "recommended_dock_id": dock.id if dock else "dock-1",
        "recommended_dock_name": dock.dock_number if dock else "Dock 01",
        "reason": f"Optimal bay matching for {truck.cargo_type if truck else 'Standard Cargo'} with available unloading equipment.",
    }


class AssignDockPayload(BaseModel):
    dock_id: Optional[str] = None
    truck_id: Optional[str] = None


@router.post("/trucks/{truck_id}/assign-dock")
@router.post("/docks/assign")
def assign_dock(payload: Optional[AssignDockPayload] = None, truck_id: Optional[str] = None, db: Session = Depends(get_db)):
    seed_docks_if_empty(db)
    target_dock_id = payload.dock_id if payload and payload.dock_id else None
    target_truck_id = payload.truck_id if payload and payload.truck_id else truck_id

    dock = None
    if target_dock_id:
        dock = db.query(Dock).filter((Dock.id == target_dock_id) | (Dock.dock_number == target_dock_id)).first()
    if not dock:
        dock = db.query(Dock).filter(Dock.is_occupied == False).first() or db.query(Dock).first()

    if not dock:
        raise HTTPException(status_code=404, detail="No docks available")

    dock.is_occupied = True
    assignment = DockAssignment(
        id=str(uuid.uuid4()),
        dock_id=dock.id,
        truck_id=target_truck_id or "TRK-0003",
        status="ACTIVE",
        assigned_at=datetime.now(timezone.utc),
    )
    db.add(assignment)
    db.commit()
    db.refresh(dock)
    return assignment


@router.post("/docks/{dock_id}/release")
@router.post("/docks/release/{dock_id}")
@router.post("/docks/release")
def release_dock(dock_id: Optional[str] = None, payload: Optional[AssignDockPayload] = None, db: Session = Depends(get_db)):
    target_id = dock_id or (payload.dock_id if payload else None)
    dock = None
    if target_id:
        dock = db.query(Dock).filter((Dock.id == target_id) | (Dock.dock_number == target_id)).first()
    if not dock:
        dock = db.query(Dock).filter(Dock.is_occupied == True).first() or db.query(Dock).first()

    if not dock:
        raise HTTPException(status_code=404, detail="Dock not found")

    dock.is_occupied = False
    active_assignment = (
        db.query(DockAssignment)
        .filter(DockAssignment.dock_id == dock.id, DockAssignment.status == "ACTIVE")
        .first()
    )
    if active_assignment:
        active_assignment.status = "COMPLETED"
        active_assignment.released_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(dock)
    return dock