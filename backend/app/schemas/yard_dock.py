"""
Pydantic v2 schemas for Yard and Dock management.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from app.schemas.logistics import TruckPositionResponse, LogisticsAlertResponse


# ── Yard Slots ────────────────────────────────────────────────────

class YardSlotResponse(BaseModel):
    id: str
    slot_code: str
    status: str
    truck_id: Optional[str]
    appointment_time: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Optional truck info if occupied
    truck: Optional[TruckPositionResponse] = None

    model_config = {"from_attributes": True}


# ── Docks ─────────────────────────────────────────────────────────

class DockResponse(BaseModel):
    id: str
    dock_code: str
    status: str
    suitable_load_types: str
    current_truck_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Optional truck info if occupied
    current_truck: Optional[TruckPositionResponse] = None

    model_config = {"from_attributes": True}


# ── Dock Assignments ──────────────────────────────────────────────

class DockAssignmentResponse(BaseModel):
    id: str
    truck_id: str
    dock_id: str
    recommended_score: float
    status: str
    assigned_at: Optional[datetime]
    departed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    truck: Optional[TruckPositionResponse] = None
    dock: Optional[DockResponse] = None

    model_config = {"from_attributes": True}


class AssignDockRequest(BaseModel):
    dock_id: str = Field(..., description="ID of the dock to assign to the truck")


class DockRecommendationResponse(BaseModel):
    recommended_dock: Optional[DockResponse] = None
    score: float = 0.0
    reason: str
    alternatives: list[DockResponse] = Field(default_factory=list)


# ── Yard Dashboard ────────────────────────────────────────────────

class YardDashboardResponse(BaseModel):
    yard_slots: list[YardSlotResponse]
    docks: list[DockResponse]
    active_assignments: list[DockAssignmentResponse]


# ── Alerts ────────────────────────────────────────────────────────

class DockAlertResponse(LogisticsAlertResponse):
    """Alias for logistics alerts specifically for docks"""
    pass
