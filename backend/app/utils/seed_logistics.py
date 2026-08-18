"""
Seed logistics demo data.

Route: Chennai supplier → Bengaluru warehouse (≈ 348 km, ~6 h drive)

Trucks seeded:
  TRK-1042 / TRL-8821  — DELAYED  65 % progress, 45 min delay     ← primary demo truck
  TRK-1055 / TRL-9034  — IN_TRANSIT 35 % progress, on-time
  TRK-1063 / TRL-7712  — ARRIVED  100 % progress

Each truck has a corresponding Shipment.
A DELAY LogisticsAlert is created for TRK-1042.

Yard slots: Y-01 to Y-08
Docks: D-01 to D-05
A DOCK_UNAVAILABLE alert is created for D-03.

Safety: only inserts when the shipments table is empty.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.logistics import AlertSeverity, AlertType, LogisticsAlert, Shipment, Truck, YardSlot, Dock

# ── Route waypoints (Chennai → Bengaluru) ────────────────────────
ORIGIN_LAT = 13.0827
ORIGIN_LNG = 80.2707
DEST_LAT = 12.9716
DEST_LNG = 77.5946


def _lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation: t ∈ [0, 1]."""
    return a + (b - a) * t


def _position_at(progress_pct: int) -> tuple[float, float]:
    """Return (lat, lng) for a given progress percentage along the route."""
    t = max(0.0, min(1.0, progress_pct / 100.0))
    return _lerp(ORIGIN_LAT, DEST_LAT, t), _lerp(ORIGIN_LNG, DEST_LNG, t)


def _future(hours: float, extra_minutes: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=hours, minutes=extra_minutes)


# ── Seed records ──────────────────────────────────────────────────

_SHIPMENTS = [
    dict(
        id="shp-1042-0000-0000-000000000001",
        shipment_code="SHP-1001",
        tracking_number="TRK-TRACK-1042",
        purchase_order_reference="PO-2026-0042",
        origin_location="Chennai, Tamil Nadu",
        destination_location="Bengaluru, Karnataka",
        status="IN_TRANSIT",
    ),
    dict(
        id="shp-1055-0000-0000-000000000002",
        shipment_code="SHP-1002",
        tracking_number="TRK-TRACK-1055",
        purchase_order_reference="PO-2026-0055",
        origin_location="Chennai, Tamil Nadu",
        destination_location="Bengaluru, Karnataka",
        status="IN_TRANSIT",
    ),
    dict(
        id="shp-1063-0000-0000-000000000003",
        shipment_code="SHP-1003",
        tracking_number="TRK-TRACK-1063",
        purchase_order_reference="PO-2026-0063",
        origin_location="Chennai, Tamil Nadu",
        destination_location="Bengaluru, Karnataka",
        status="ARRIVED",
    ),
]

_TRUCK_ID_1042 = "trk-1042-0000-0000-000000000001"
_TRUCK_ID_1055 = "trk-1055-0000-0000-000000000002"
_TRUCK_ID_1063 = "trk-1063-0000-0000-000000000003"


def _truck_records() -> list[dict]:
    lat42, lng42 = _position_at(65)
    lat55, lng55 = _position_at(35)
    lat63, lng63 = _position_at(100)

    # TRK-1042: delayed 45 min
    orig_eta_42 = _future(2.0)
    curr_eta_42 = _future(2.0, extra_minutes=45)

    # TRK-1055: on-time
    orig_eta_55 = _future(4.0)
    curr_eta_55 = _future(4.0)

    # TRK-1063: arrived — ETAs in the past
    arrived_at = datetime.now(timezone.utc) - timedelta(hours=1)

    return [
        dict(
            id=_TRUCK_ID_1042,
            truck_code="TRK-1042",
            trailer_id="TRL-8821",
            shipment_id="shp-1042-0000-0000-000000000001",
            driver_name="Rajan Kumar",
            status="DELAYED",
            current_lat=lat42,
            current_lng=lng42,
            progress_percent=65,
            original_eta=orig_eta_42,
            current_eta=curr_eta_42,
            delay_minutes=45,
            load_type="Electronics",
            priority="HIGH",
        ),
        dict(
            id=_TRUCK_ID_1055,
            truck_code="TRK-1055",
            trailer_id="TRL-9034",
            shipment_id="shp-1055-0000-0000-000000000002",
            driver_name="Suresh Patel",
            status="IN_TRANSIT",
            current_lat=lat55,
            current_lng=lng55,
            progress_percent=35,
            original_eta=orig_eta_55,
            current_eta=curr_eta_55,
            delay_minutes=0,
            load_type="Automotive Parts",
            priority="NORMAL",
        ),
        dict(
            id=_TRUCK_ID_1063,
            truck_code="TRK-1063",
            trailer_id="TRL-7712",
            shipment_id="shp-1063-0000-0000-000000000003",
            driver_name="Anita Singh",
            status="ARRIVED",
            current_lat=lat63,
            current_lng=lng63,
            progress_percent=100,
            original_eta=arrived_at,
            current_eta=arrived_at,
            delay_minutes=0,
            load_type="Industrial Packaging",
            priority="NORMAL",
        ),
    ]


_ALERT_ID_1042 = "alt-1042-0000-0000-000000000001"
_ALERT_ID_D03 = "alt-d03-0000-0000-000000000000"

_ALERT_RECORDS = [
    dict(
        id=_ALERT_ID_1042,
        truck_id=_TRUCK_ID_1042,
        alert_type=AlertType.DELAY,
        severity=AlertSeverity.CRITICAL,
        message="TRK-1042 is delayed by 45 minutes due to heavy traffic near Krishnagiri.",
        is_resolved=False,
    ),
    dict(
        id=_ALERT_ID_D03,
        truck_id=_TRUCK_ID_1042,
        alert_type=AlertType.DOCK_UNAVAILABLE,
        severity=AlertSeverity.WARNING,
        message="Dock D-03 is unavailable due to maintenance.",
        is_resolved=False,
    ),
]

_YARD_SLOTS = [
    dict(id="ys-01-0000-0000-000000000000", slot_code="Y-01", status="OCCUPIED", truck_id=_TRUCK_ID_1063),
    dict(id="ys-02-0000-0000-000000000000", slot_code="Y-02", status="RESERVED", truck_id=_TRUCK_ID_1042),
    dict(id="ys-03-0000-0000-000000000000", slot_code="Y-03", status="AVAILABLE", truck_id=None),
    dict(id="ys-04-0000-0000-000000000000", slot_code="Y-04", status="AVAILABLE", truck_id=None),
    dict(id="ys-05-0000-0000-000000000000", slot_code="Y-05", status="OCCUPIED", truck_id=None),
    dict(id="ys-06-0000-0000-000000000000", slot_code="Y-06", status="AVAILABLE", truck_id=None),
    dict(id="ys-07-0000-0000-000000000000", slot_code="Y-07", status="AVAILABLE", truck_id=None),
    dict(id="ys-08-0000-0000-000000000000", slot_code="Y-08", status="AVAILABLE", truck_id=None),
]

_DOCKS = [
    dict(id="dk-01-0000-0000-000000000000", dock_code="D-01", status="OCCUPIED", suitable_load_types="General", current_truck_id=None),
    dict(id="dk-02-0000-0000-000000000000", dock_code="D-02", status="RESERVED", suitable_load_types="Electronics", current_truck_id=None),
    dict(id="dk-03-0000-0000-000000000000", dock_code="D-03", status="MAINTENANCE", suitable_load_types="General", current_truck_id=None),
    dict(id="dk-04-0000-0000-000000000000", dock_code="D-04", status="AVAILABLE", suitable_load_types="Electronics", current_truck_id=None),
    dict(id="dk-05-0000-0000-000000000000", dock_code="D-05", status="AVAILABLE", suitable_load_types="General, Electronics", current_truck_id=None),
]

# ── Public callable ───────────────────────────────────────────────

def seed_logistics(db: Session) -> None:
    """Insert demo logistics records if the shipments table is empty."""
    existing_shipments = db.query(Shipment).first()
    if existing_shipments is None:
        # Insert shipments
        for s in _SHIPMENTS:
            db.add(Shipment(**s))
        db.flush()  # make FKs available

        # Insert trucks
        for t in _truck_records():
            db.add(Truck(**t))
        db.flush()
        
        # Insert alerts
        for a in _ALERT_RECORDS:
            if a["id"] == _ALERT_ID_D03:
                continue
            db.add(LogisticsAlert(**a))
        db.flush()

    existing_yard = db.query(YardSlot).first()
    if existing_yard is None:
        # Insert Yard Slots
        for y in _YARD_SLOTS:
            db.add(YardSlot(**y))
        db.flush()
        
    existing_docks = db.query(Dock).first()
    if existing_docks is None:
        # Insert Docks
        for d in _DOCKS:
            db.add(Dock(**d))
        db.flush()
        
        # Insert the D03 alert specifically
        db.add(LogisticsAlert(**next(a for a in _ALERT_RECORDS if a["id"] == _ALERT_ID_D03)))
    
    db.commit()
    print("[seed_logistics] Demo logistics data inserted or verified.")

def reset_logistics(db: Session) -> None:
    """Reset the seeded E2 demo logistics state to the presentation baseline."""
    from app.models.logistics import DockAssignment

    truck_ids = [_TRUCK_ID_1042, _TRUCK_ID_1055, _TRUCK_ID_1063]

    # Delete all dock assignments for demo trucks
    db.query(DockAssignment).filter(DockAssignment.truck_id.in_(truck_ids)).delete(synchronize_session=False)

    # Delete all alerts for demo trucks
    db.query(LogisticsAlert).filter(LogisticsAlert.truck_id.in_(truck_ids)).delete(synchronize_session=False)

    # Reset Trucks (set all DB trucks to active IN_TRANSIT with pending progress)
    all_trucks = db.query(Truck).all()
    for truck in all_trucks:
        truck.status = "IN_TRANSIT"
        truck.delay_minutes = 0
        truck.progress_percent = random.randint(15, 45)
        truck.progress = round(truck.progress_percent / 100.0, 2)
        truck.updated_at = datetime.now(timezone.utc)

    # Reset Yard Slots
    yard_data = {y["id"]: y for y in _YARD_SLOTS}
    for yard in db.query(YardSlot).filter(YardSlot.id.in_(list(yard_data.keys()))).all():
        data = yard_data[yard.id]
        yard.status = data["status"]
        yard.truck_id = data["truck_id"]
        yard.updated_at = datetime.now(timezone.utc)

    # Reset Docks
    dock_data = {d["id"]: d for d in _DOCKS}
    for dock in db.query(Dock).filter(Dock.id.in_(list(dock_data.keys()))).all():
        data = dock_data[dock.id]
        dock.status = data["status"]
        dock.current_truck_id = data["current_truck_id"]
        dock.updated_at = datetime.now(timezone.utc)

    # Recreate the initial alerts
    for a in _ALERT_RECORDS:
        db.add(LogisticsAlert(**a))

    db.commit()
    print("[reset_logistics] Demo logistics state reset successfully.")

