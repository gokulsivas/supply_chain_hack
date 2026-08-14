"""
Pydantic v2 schemas for logistics API responses.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Position / Truck ──────────────────────────────────────────────

class TruckPositionResponse(BaseModel):
    """Live truck position and ETA data."""

    id: str
    truck_code: str
    trailer_id: str
    driver_name: Optional[str]
    status: str
    priority: str
    load_type: Optional[str]

    current_lat: float
    current_lng: float
    progress_percent: int

    original_eta: Optional[datetime]
    current_eta: Optional[datetime]
    delay_minutes: int

    shipment_id: str
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Alert ─────────────────────────────────────────────────────────

class LogisticsAlertResponse(BaseModel):
    """An unresolved operational alert."""

    id: str
    truck_id: Optional[str]
    alert_type: str
    severity: str
    message: str
    is_resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Shipment ──────────────────────────────────────────────────────

class ShipmentInfoResponse(BaseModel):
    """Shipment header information."""

    id: str
    shipment_code: str
    tracking_number: str
    purchase_order_reference: str
    origin_location: str
    destination_location: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Composite tracking response ───────────────────────────────────

class TrackingSearchResponse(BaseModel):
    """Full tracking result: shipment + truck + alerts."""

    shipment: ShipmentInfoResponse
    truck: TruckPositionResponse
    alerts: list[LogisticsAlertResponse] = Field(default_factory=list)
