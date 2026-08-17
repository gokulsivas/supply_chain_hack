"""
Pydantic v2 schemas for logistics API responses & smart logistics telemetry.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Position / Truck ──────────────────────────────────────────────

class TruckPositionResponse(BaseModel):
    """Live truck position, telemetry, and ETA data."""

    id: str
    truck_code: str
    trailer_id: str
    driver_name: Optional[str] = None
    status: str
    priority: str = "NORMAL"
    load_type: Optional[str] = None

    current_lat: float
    current_lng: float
    display_lat: Optional[float] = None
    display_lng: Optional[float] = None
    progress_percent: int = 0

    origin_name: Optional[str] = None
    dest_name: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None

    original_eta: Optional[datetime] = None
    current_eta: Optional[datetime] = None
    delay_minutes: int = 0

    shipment_id: Optional[str] = None
    updated_at: Optional[datetime] = None

    # Telemetry fields from Smart Logistics Dataset
    source_asset_id: Optional[str] = None
    inventory_level: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    traffic_status: Optional[str] = None
    waiting_time: Optional[float] = None
    logistics_delay_reason: Optional[str] = None
    asset_utilization: Optional[float] = None
    demand_forecast: Optional[float] = None
    is_delayed: Optional[bool] = False
    latest_telemetry_timestamp: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Telemetry History ─────────────────────────────────────────────

class TruckTelemetryResponse(BaseModel):
    """Time-series telemetry event record."""

    id: str
    truck_id: Optional[str] = None
    source_timestamp: datetime
    source_asset_id: str
    source_latitude: float
    source_longitude: float
    display_latitude: Optional[float] = None
    display_longitude: Optional[float] = None
    inventory_level: Optional[float] = None
    shipment_status: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    traffic_status: Optional[str] = None
    waiting_time: Optional[float] = None
    logistics_delay_reason: Optional[str] = None
    asset_utilization: Optional[float] = None
    demand_forecast: Optional[float] = None
    logistics_delay: bool = False
    user_transaction_amount: Optional[float] = None
    user_purchase_frequency: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Alert ─────────────────────────────────────────────────────────

class LogisticsAlertResponse(BaseModel):
    """An unresolved operational alert."""

    id: str
    truck_id: Optional[str] = None
    alert_type: str
    severity: str
    message: str
    is_resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Shipment ──────────────────────────────────────────────────────

class ShipmentInfoResponse(BaseModel):
    """Shipment header information with resolved corridor coordinates."""

    id: str
    shipment_code: str
    tracking_number: str
    purchase_order_reference: str
    origin_location: str
    destination_location: str
    origin_state: Optional[str] = None
    dest_state: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Route Coordinates ─────────────────────────────────────────────

class RoutePoint(BaseModel):
    """A geo-coordinate point on the route corridor."""
    lat: float
    lng: float
    name: Optional[str] = None


# ── Composite tracking response ───────────────────────────────────

class TrackingSearchResponse(BaseModel):
    """Full tracking result: shipment + truck + alerts + real road route."""

    shipment: Optional[ShipmentInfoResponse] = None
    truck: Optional[TruckPositionResponse] = None
    alerts: list[LogisticsAlertResponse] = Field(default_factory=list)
    route: list[RoutePoint] = Field(default_factory=list)
    route_waypoints: list[list[float]] = Field(default_factory=list)
    corridor_name: Optional[str] = None
    distance_km: Optional[float] = None
    eta: Optional[str] = None
    original_eta: Optional[str] = None
    is_delayed: bool = False
    status: Optional[str] = None


# ── Analytics Summary ─────────────────────────────────────────────

class LogisticsAnalyticsSummaryResponse(BaseModel):
    """Aggregated operational intelligence from smart logistics dataset."""

    total_tracked_assets: int
    in_transit_count: int
    delivered_count: int
    delayed_count: int
    logistics_delay_rate: float
    average_waiting_time: float
    average_asset_utilization: float
    average_temperature: float
    average_humidity: float
    traffic_status_distribution: Dict[str, int]
    delay_reason_distribution: Dict[str, int]
    total_inventory: float
    average_demand_forecast: float
    total_transaction_amount: float
    average_purchase_frequency: float
