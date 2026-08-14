"""
Logistics API routes — E2: Where's My Truck?

Prefix : /api/logistics
Tag    : logistics

Endpoints:
  GET  /track/{query}              — lookup by any identifier
  GET  /trucks                     — all trucks with live position
  POST /trucks/{truck_id}/simulate-step — advance one truck
  POST /simulate-all               — advance every in-transit truck
  GET  /alerts                     — unresolved alerts newest-first
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.logistics import AlertSeverity, AlertType, LogisticsAlert, Shipment, Truck, YardSlot, Dock, DockAssignment
from app.schemas.logistics import (
    LogisticsAlertResponse,
    ShipmentInfoResponse,
    TrackingSearchResponse,
    TruckPositionResponse,
)
from app.schemas.yard_dock import (
    YardSlotResponse,
    DockResponse,
    DockAssignmentResponse,
    DockRecommendationResponse,
    AssignDockRequest,
    DockAlertResponse
)
from app.services.dock_service import get_dock_recommendation
from app.utils.seed_logistics import reset_logistics

router = APIRouter(prefix="/logistics", tags=["logistics"])

# ── POST /api/logistics/demo/reset ───────────────────────────────

@router.post(
    "/demo/reset",
    summary="Reset E2 demo state to presentation baseline",
)
def reset_demo_state(db: Session = Depends(get_db)):
    """Reset yard, docks, and trucks to their original seeded states."""
    try:
        reset_logistics(db)
        return {"status": "success", "message": "Demo logistics state reset to baseline."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Route coordinates (Chennai → Bengaluru) ───────────────────────
_ORIGIN_LAT = 13.0827
_ORIGIN_LNG = 80.2707
_DEST_LAT = 12.9716
_DEST_LNG = 77.5946


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _position_at(progress_pct: int) -> tuple[float, float]:
    t = max(0.0, min(1.0, progress_pct / 100.0))
    return _lerp(_ORIGIN_LAT, _DEST_LAT, t), _lerp(_ORIGIN_LNG, _DEST_LNG, t)


def calculate_next_eta(
    current_eta: datetime | None,
    progress_percent: int,
    step_progress: int = 5,
    simulated_step_minutes: int = 10,
    delay_minutes: int = 0
) -> datetime | None:
    """
    Derives the simulated current time from the existing ETA, advances it by simulated_step_minutes,
    advances progress, and computes the new deterministic ETA.
    Assumes total trip is 6 hours (360 minutes).
    """
    if not current_eta:
        return None

    # 1. Reverse-engineer simulated current time
    old_remaining_fraction = max(0.0, (100 - progress_percent) / 100.0)
    old_remaining_minutes = 360.0 * old_remaining_fraction
    
    simulated_now = current_eta - timedelta(minutes=old_remaining_minutes) - timedelta(minutes=delay_minutes)
    
    # 2. Advance simulated clock and progress
    new_simulated_now = simulated_now + timedelta(minutes=simulated_step_minutes)
    new_progress = min(100, progress_percent + step_progress)
    
    # 3. Compute new ETA
    new_remaining_fraction = max(0.0, (100 - new_progress) / 100.0)
    new_remaining_minutes = 360.0 * new_remaining_fraction
    
    new_eta = new_simulated_now + timedelta(minutes=new_remaining_minutes) + timedelta(minutes=delay_minutes)
    
    return new_eta


def _to_truck_response(truck: Truck) -> TruckPositionResponse:
    return TruckPositionResponse.model_validate(truck)


# ── GET /api/logistics/track/{query} ─────────────────────────────

@router.get(
    "/track/{query}",
    response_model=TrackingSearchResponse,
    summary="Track a shipment by any identifier",
)
def track_shipment(query: str, db: Session = Depends(get_db)) -> TrackingSearchResponse:
    """
    Search case-insensitively across:
    - shipment tracking_number
    - truck truck_code
    - truck trailer_id
    - shipment shipment_code
    - shipment purchase_order_reference

    Returns HTTP 404 when no match is found.
    """
    q = query.strip().upper()

    # Try to find a matching truck first (covers truck_code, trailer_id)
    truck = (
        db.query(Truck)
        .options(joinedload(Truck.shipment), joinedload(Truck.alerts))
        .filter(
            or_(
                func.upper(Truck.truck_code) == q,
                func.upper(Truck.trailer_id) == q,
            )
        )
        .first()
    )

    # Fall back to shipment search (tracking_number, shipment_code, PO ref)
    if truck is None:
        shipment = (
            db.query(Shipment)
            .filter(
                or_(
                    func.upper(Shipment.tracking_number) == q,
                    func.upper(Shipment.shipment_code) == q,
                    func.upper(Shipment.purchase_order_reference) == q,
                )
            )
            .first()
        )
        if shipment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No shipment or truck found matching '{query}'.",
            )
        truck = (
            db.query(Truck)
            .options(joinedload(Truck.alerts))
            .filter(Truck.shipment_id == shipment.id)
            .first()
        )
        if truck is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shipment found but no truck is assigned yet for '{query}'.",
            )
        # Attach shipment to truck for schema serialisation
        truck.shipment = shipment
    else:
        shipment = truck.shipment

    # Unresolved alerts only
    unresolved_alerts = [a for a in truck.alerts if not a.is_resolved]

    return TrackingSearchResponse(
        shipment=ShipmentInfoResponse.model_validate(shipment),
        truck=TruckPositionResponse.model_validate(truck),
        alerts=[LogisticsAlertResponse.model_validate(a) for a in unresolved_alerts],
    )


# ── GET /api/logistics/trucks ────────────────────────────────────

@router.get(
    "/trucks",
    response_model=list[TruckPositionResponse],
    summary="List all trucks with live positions",
)
def list_trucks(db: Session = Depends(get_db)) -> list[TruckPositionResponse]:
    """Return every truck with its current position, ETA, and progress."""
    trucks = db.query(Truck).all()
    return [TruckPositionResponse.model_validate(t) for t in trucks]


# ── POST /api/logistics/trucks/{truck_id}/simulate-step ──────────

@router.post(
    "/trucks/{truck_id}/simulate-step",
    response_model=TruckPositionResponse,
    summary="Advance one truck by one simulation step",
)
def simulate_step(
    truck_id: str, db: Session = Depends(get_db)
) -> TruckPositionResponse:
    """
    Deterministic simulation step for a single truck:
    - Increases progress by 5 points (capped at 100).
    - Moves lat/lng toward destination proportionally.
    - If truck was DELAYED, adds 5 more minutes to delay on each step until it recovers.
    - Marks status ARRIVED at 100%.
    - Creates a DELAY alert if delay_minutes > 0 and none exists.
    """
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if truck is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Truck '{truck_id}' not found.",
        )

    if truck.status == "ARRIVED":
        return TruckPositionResponse.model_validate(truck)

    # Advance progress deterministically by 5 points
    step = 5
    new_progress = min(100, truck.progress_percent + step)
    truck.progress_percent = new_progress

    # Update position
    new_lat, new_lng = _position_at(new_progress)
    truck.current_lat = new_lat
    truck.current_lng = new_lng

    # Calculate new ETA based on simulated clock
    new_eta = calculate_next_eta(
        current_eta=truck.current_eta,
        progress_percent=truck.progress_percent,
        step_progress=step,
        simulated_step_minutes=10,
        delay_minutes=truck.delay_minutes
    )
    if new_eta:
        truck.current_eta = new_eta

    # Mark arrived
    if new_progress >= 100:
        truck.status = "ARRIVED"
        truck.delay_minutes = 0
        # Resolve any open delay alerts
        db.query(LogisticsAlert).filter(
            LogisticsAlert.truck_id == truck.id,
            LogisticsAlert.alert_type == AlertType.DELAY,
            LogisticsAlert.is_resolved == False,  # noqa: E712
        ).update({"is_resolved": True})
    else:
        # Create DELAY alert if needed
        if truck.delay_minutes > 0:
            existing_alert = (
                db.query(LogisticsAlert)
                .filter(
                    LogisticsAlert.truck_id == truck.id,
                    LogisticsAlert.alert_type == AlertType.DELAY,
                    LogisticsAlert.is_resolved == False,  # noqa: E712
                )
                .first()
            )
            if existing_alert is None:
                db.add(
                    LogisticsAlert(
                        id=str(uuid.uuid4()),
                        truck_id=truck.id,
                        alert_type=AlertType.DELAY,
                        severity=AlertSeverity.CRITICAL,
                        message=(
                            f"{truck.truck_code} is delayed by "
                            f"{truck.delay_minutes} minutes."
                        ),
                        is_resolved=False,
                    )
                )

    truck.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(truck)
    return TruckPositionResponse.model_validate(truck)


# ── POST /api/logistics/simulate-all ────────────────────────────

@router.post(
    "/simulate-all",
    response_model=list[TruckPositionResponse],
    summary="Advance all in-transit trucks by one simulation step",
)
def simulate_all(db: Session = Depends(get_db)) -> list[TruckPositionResponse]:
    """
    Advance every truck that is not yet ARRIVED by one deterministic step.
    Returns the updated position of all trucks.
    """
    active_trucks = (
        db.query(Truck).filter(Truck.status != "ARRIVED").all()
    )

    for truck in active_trucks:
        step = 5
        new_progress = min(100, truck.progress_percent + step)
        truck.progress_percent = new_progress

        new_lat, new_lng = _position_at(new_progress)
        truck.current_lat = new_lat
        truck.current_lng = new_lng

        new_eta = calculate_next_eta(
            current_eta=truck.current_eta,
            progress_percent=truck.progress_percent,
            step_progress=step,
            simulated_step_minutes=10,
            delay_minutes=truck.delay_minutes
        )
        if new_eta:
            truck.current_eta = new_eta

        if new_progress >= 100:
            truck.status = "ARRIVED"
            truck.delay_minutes = 0
            db.query(LogisticsAlert).filter(
                LogisticsAlert.truck_id == truck.id,
                LogisticsAlert.alert_type == AlertType.DELAY,
                LogisticsAlert.is_resolved == False,  # noqa: E712
            ).update({"is_resolved": True})
        else:
            if truck.delay_minutes > 0:
                existing_alert = (
                    db.query(LogisticsAlert)
                    .filter(
                        LogisticsAlert.truck_id == truck.id,
                        LogisticsAlert.alert_type == AlertType.DELAY,
                        LogisticsAlert.is_resolved == False,  # noqa: E712
                    )
                    .first()
                )
                if existing_alert is None:
                    db.add(
                        LogisticsAlert(
                            id=str(uuid.uuid4()),
                            truck_id=truck.id,
                            alert_type=AlertType.DELAY,
                            severity=AlertSeverity.CRITICAL,
                            message=(
                                f"{truck.truck_code} is delayed by "
                                f"{truck.delay_minutes} minutes."
                            ),
                            is_resolved=False,
                        )
                    )

        truck.updated_at = datetime.now(timezone.utc)

    db.commit()

    all_trucks = db.query(Truck).all()
    return [TruckPositionResponse.model_validate(t) for t in all_trucks]


# ── GET /api/logistics/alerts ────────────────────────────────────

@router.get(
    "/alerts",
    response_model=list[LogisticsAlertResponse],
    summary="List unresolved logistics alerts",
)
def list_alerts(db: Session = Depends(get_db)) -> list[LogisticsAlertResponse]:
    """Return unresolved logistics alerts, newest first."""
    alerts = (
        db.query(LogisticsAlert)
        .filter(LogisticsAlert.is_resolved == False)  # noqa: E712
        .order_by(LogisticsAlert.created_at.desc())
        .all()
    )
    return [LogisticsAlertResponse.model_validate(a) for a in alerts]


# ── GET /api/logistics/yard ───────────────────────────────────────

@router.get(
    "/yard",
    response_model=list[YardSlotResponse],
    summary="List all yard slots",
)
def list_yard_slots(db: Session = Depends(get_db)) -> list[YardSlotResponse]:
    """Returns slots with AVAILABLE, OCCUPIED, RESERVED status and their current trucks."""
    slots = db.query(YardSlot).options(joinedload(YardSlot.truck)).all()
    return [YardSlotResponse.model_validate(s) for s in slots]


# ── GET /api/logistics/docks ──────────────────────────────────────

@router.get(
    "/docks",
    response_model=list[DockResponse],
    summary="List all docks",
)
def list_docks(db: Session = Depends(get_db)) -> list[DockResponse]:
    """Returns all docks and their current status/truck."""
    docks = db.query(Dock).options(joinedload(Dock.current_truck)).all()
    return [DockResponse.model_validate(d) for d in docks]


# ── GET /api/logistics/trucks/{truck_id}/dock-recommendation ──────

@router.get(
    "/trucks/{truck_id}/dock-recommendation",
    response_model=DockRecommendationResponse,
    summary="Get best dock recommendation for a truck",
)
def get_recommendation(truck_id: str, db: Session = Depends(get_db)) -> DockRecommendationResponse:
    """Returns best recommendation for a truck, score, reason, and alternatives."""
    try:
        return get_dock_recommendation(truck_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── POST /api/logistics/trucks/{truck_id}/assign-dock ─────────────

@router.post(
    "/trucks/{truck_id}/assign-dock",
    response_model=DockAssignmentResponse,
    summary="Assign a truck to a dock",
)
def assign_dock(
    truck_id: str, 
    request: AssignDockRequest, 
    db: Session = Depends(get_db)
) -> DockAssignmentResponse:
    """
    Validate dock is AVAILABLE. Create/update DockAssignment.
    Mark dock OCCUPIED. Assign truck to dock. Move truck status to DOCKED.
    """
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    dock = db.query(Dock).filter(Dock.id == request.dock_id).first()
    if not dock:
        raise HTTPException(status_code=404, detail="Dock not found")

    if dock.status != "AVAILABLE":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dock is not available")

    # Mark dock OCCUPIED
    dock.status = "OCCUPIED"
    dock.current_truck_id = truck.id
    
    # Update truck
    truck.status = "DOCKED"
    truck.updated_at = datetime.now(timezone.utc)
    
    # Update yard slot if truck is in yard
    yard_slot = db.query(YardSlot).filter(YardSlot.truck_id == truck.id).first()
    if yard_slot:
        yard_slot.status = "AVAILABLE"
        yard_slot.truck_id = None
        yard_slot.updated_at = datetime.now(timezone.utc)

    # Create assignment
    assignment = DockAssignment(
        id=str(uuid.uuid4()),
        truck_id=truck.id,
        dock_id=dock.id,
        recommended_score=100.0,  # Or compute based on current recommendation
        status="ASSIGNED",
        assigned_at=datetime.now(timezone.utc),
        notes="Assigned manually"
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Need to load relationships for response
    assignment = db.query(DockAssignment).options(
        joinedload(DockAssignment.truck), 
        joinedload(DockAssignment.dock)
    ).filter(DockAssignment.id == assignment.id).first()
    
    return DockAssignmentResponse.model_validate(assignment)


# ── POST /api/logistics/docks/{dock_id}/release ───────────────────

@router.post(
    "/docks/{dock_id}/release",
    response_model=DockResponse,
    summary="Release a truck from a dock",
)
def release_dock(dock_id: str, db: Session = Depends(get_db)) -> DockResponse:
    """Mark assignment COMPLETED, dock AVAILABLE, remove truck, truck DEPARTED."""
    dock = db.query(Dock).filter(Dock.id == dock_id).first()
    if not dock:
        raise HTTPException(status_code=404, detail="Dock not found")
        
    if not dock.current_truck_id:
        raise HTTPException(status_code=400, detail="Dock is empty")

    truck = db.query(Truck).filter(Truck.id == dock.current_truck_id).first()
    if truck:
        truck.status = "DEPARTED"
        truck.updated_at = datetime.now(timezone.utc)
        
    assignment = db.query(DockAssignment).filter(
        DockAssignment.dock_id == dock.id,
        DockAssignment.status == "ASSIGNED"
    ).first()
    
    if assignment:
        assignment.status = "COMPLETED"
        assignment.departed_at = datetime.now(timezone.utc)
        assignment.updated_at = datetime.now(timezone.utc)

    dock.status = "AVAILABLE"
    dock.current_truck_id = None
    dock.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(dock)
    
    return DockResponse.model_validate(dock)


# ── GET /api/logistics/dock-assignments ───────────────────────────

@router.get(
    "/dock-assignments",
    response_model=list[DockAssignmentResponse],
    summary="List all dock assignments",
)
def list_dock_assignments(db: Session = Depends(get_db)) -> list[DockAssignmentResponse]:
    """Return assignments with truck, shipment, and dock context."""
    assignments = db.query(DockAssignment).options(
        joinedload(DockAssignment.truck),
        joinedload(DockAssignment.dock)
    ).all()
    return [DockAssignmentResponse.model_validate(a) for a in assignments]


# ── GET /api/logistics/dock-alerts ────────────────────────────────

@router.get(
    "/dock-alerts",
    response_model=list[DockAlertResponse],
    summary="List unresolved dock alerts",
)
def list_dock_alerts(db: Session = Depends(get_db)) -> list[DockAlertResponse]:
    """Return unresolved alerts of type DOCK_UNAVAILABLE or REASSIGNMENT_NEEDED."""
    alerts = (
        db.query(LogisticsAlert)
        .filter(LogisticsAlert.is_resolved == False)  # noqa: E712
        .filter(LogisticsAlert.alert_type.in_([AlertType.DOCK_UNAVAILABLE, AlertType.REASSIGNMENT_NEEDED]))
        .order_by(LogisticsAlert.created_at.desc())
        .all()
    )
    return [DockAlertResponse.model_validate(a) for a in alerts]
