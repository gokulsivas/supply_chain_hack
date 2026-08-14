import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.logistics import Dock, Truck, LogisticsAlert, AlertType, AlertSeverity
from app.schemas.yard_dock import DockRecommendationResponse, DockResponse

def get_dock_recommendation(truck_id: str, db: Session) -> DockRecommendationResponse:
    """Calculate the best available dock for a truck."""
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise ValueError(f"Truck {truck_id} not found.")

    available_docks = db.query(Dock).filter(Dock.status == "AVAILABLE").all()

    if not available_docks:
        # Create or reuse DOCK_UNAVAILABLE alert
        existing_alert = db.query(LogisticsAlert).filter(
            LogisticsAlert.truck_id == truck.id,
            LogisticsAlert.alert_type == AlertType.DOCK_UNAVAILABLE,
            LogisticsAlert.is_resolved == False  # noqa: E712
        ).first()

        if not existing_alert:
            alert = LogisticsAlert(
                id=str(uuid.uuid4()),
                truck_id=truck.id,
                alert_type=AlertType.DOCK_UNAVAILABLE,
                severity=AlertSeverity.WARNING,
                message=f"No available docks for truck {truck.truck_code}.",
                is_resolved=False
            )
            db.add(alert)
            db.commit()

        return DockRecommendationResponse(
            recommended_dock=None,
            score=0.0,
            reason="No docks are currently available.",
            alternatives=[]
        )

    scored_docks = []
    for dock in available_docks:
        score = 50.0  # Base score for being available
        
        # Load type match bonus
        if truck.load_type and truck.load_type.lower() in dock.suitable_load_types.lower():
            score += 30.0
            
        # Priority bonus
        if truck.priority in ["HIGH", "URGENT", "CRITICAL"]:
            score += 20.0

        scored_docks.append((score, dock))

    # Sort descending by score, then by dock_code to be deterministic
    scored_docks.sort(key=lambda x: (-x[0], x[1].dock_code))

    best_score, best_dock = scored_docks[0]
    alternatives = [DockResponse.model_validate(d) for s, d in scored_docks[1:]]
    
    priority_text = "high-priority " if truck.priority in ["HIGH", "CRITICAL"] else ""
    load_text = f"supports {truck.load_type} loads" if truck.load_type else "is available"

    reason = f"{best_dock.dock_code} is available, {load_text}, and is the highest-scoring available dock for this {priority_text}arrival."

    return DockRecommendationResponse(
        recommended_dock=DockResponse.model_validate(best_dock),
        score=best_score,
        reason=reason,
        alternatives=alternatives
    )
