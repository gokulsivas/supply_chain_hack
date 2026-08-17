"""
Logistics models — E2: Where's My Truck?

Tables:
  shipments        — purchase orders with origin/destination/status
  trucks           — live truck state: position, ETA, progress, delays
  logistics_alerts — delay / dock / reassignment alerts
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── Shipment ──────────────────────────────────────────────────────

class Shipment(Base):
    """A freight shipment associated with a purchase order."""

    __tablename__ = "shipments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    shipment_code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    tracking_number: Mapped[str] = mapped_column(
        String(80), unique=True, index=True, nullable=False
    )
    purchase_order_reference: Mapped[str] = mapped_column(
        String(80), index=True, nullable=False
    )
    origin_location: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_location: Mapped[str] = mapped_column(String(255), nullable=False)
    # e.g. PENDING, IN_TRANSIT, ARRIVED, CANCELLED
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="IN_TRANSIT")
    purchase_order_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("purchase_orders.id"), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # back-reference
    truck: Mapped["Truck"] = relationship("Truck", back_populates="shipment", uselist=False)
    purchase_order = relationship("PurchaseOrder", foreign_keys=[purchase_order_id])

    def __repr__(self) -> str:
        return f"<Shipment code={self.shipment_code!r} status={self.status!r}>"


# ── Truck ─────────────────────────────────────────────────────────

class Truck(Base):
    """A truck carrying a shipment — stores live position and ETA."""

    __tablename__ = "trucks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    truck_code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    trailer_id: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    shipment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("shipments.id"), unique=True, nullable=False
    )
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # e.g. IN_TRANSIT, ARRIVED, DOCK_READY, LOADING, DELAYED
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="IN_TRANSIT")

    current_lat: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    current_lng: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    original_eta: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_eta: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delay_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    load_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    # NORMAL, HIGH, CRITICAL
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="NORMAL")

    # Smart Logistics dataset telemetry fields
    source_asset_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    display_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    display_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    inventory_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity: Mapped[float | None] = mapped_column(Float, nullable=True)
    traffic_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    waiting_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    logistics_delay_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    asset_utilization: Mapped[float | None] = mapped_column(Float, nullable=True)
    demand_forecast: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_delayed: Mapped[bool] = mapped_column(Boolean, default=False)
    latest_telemetry_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # relationships
    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="truck")
    alerts: Mapped[list["LogisticsAlert"]] = relationship(
        "LogisticsAlert", back_populates="truck", cascade="all, delete-orphan"
    )
    yard_slot: Mapped["YardSlot"] = relationship("YardSlot", back_populates="truck", uselist=False)
    dock_assignment: Mapped["DockAssignment"] = relationship("DockAssignment", back_populates="truck", uselist=False)
    telemetry: Mapped[list["TruckTelemetry"]] = relationship("TruckTelemetry", back_populates="truck", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Truck code={self.truck_code!r} progress={self.progress_percent}%>"


# ── TruckTelemetry (Smart Logistics History) ────────────────────────

class TruckTelemetry(Base):
    """Historical time-series telemetry imported from Smart Logistics dataset."""

    __tablename__ = "truck_telemetry"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    truck_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trucks.id"), nullable=True, index=True
    )
    source_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    source_asset_id: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )
    source_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    source_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    display_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    display_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    inventory_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    shipment_status: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity: Mapped[float | None] = mapped_column(Float, nullable=True)
    traffic_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    waiting_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    logistics_delay_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    asset_utilization: Mapped[float | None] = mapped_column(Float, nullable=True)
    demand_forecast: Mapped[float | None] = mapped_column(Float, nullable=True)
    logistics_delay: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    user_transaction_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    user_purchase_frequency: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    truck: Mapped["Truck"] = relationship("Truck", back_populates="telemetry")

    def __repr__(self) -> str:
        return f"<TruckTelemetry asset={self.source_asset_id!r} ts={self.source_timestamp} status={self.shipment_status!r}>"


# ── LogisticsAlert ────────────────────────────────────────────────

class AlertType:
    DELAY = "DELAY"
    DOCK_UNAVAILABLE = "DOCK_UNAVAILABLE"
    REASSIGNMENT_NEEDED = "REASSIGNMENT_NEEDED"


class AlertSeverity:
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class LogisticsAlert(Base):
    """An operational alert raised against a truck."""

    __tablename__ = "logistics_alerts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    truck_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trucks.id"), nullable=True, index=True
    )
    alert_type: Mapped[str] = mapped_column(String(40), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(String(512), nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationship
    truck: Mapped["Truck"] = relationship("Truck", back_populates="alerts")

    def __repr__(self) -> str:
        return (
            f"<LogisticsAlert type={self.alert_type!r} "
            f"severity={self.severity!r} resolved={self.is_resolved}>"
        )


# ── Dock ──────────────────────────────────────────────────────────

class Dock(Base):
    """A dock door in the warehouse facility."""

    __tablename__ = "docks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    dock_code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    # AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="AVAILABLE")
    suitable_load_types: Mapped[str] = mapped_column(String(255), nullable=False)
    
    current_truck_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trucks.id"), nullable=True, unique=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # relationships
    current_truck: Mapped["Truck"] = relationship("Truck", foreign_keys=[current_truck_id])
    assignments: Mapped[list["DockAssignment"]] = relationship(
        "DockAssignment", back_populates="dock", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Dock code={self.dock_code!r} status={self.status!r}>"


# ── DockAssignment ────────────────────────────────────────────────

class DockAssignment(Base):
    """A record of a truck assigned to a dock."""

    __tablename__ = "dock_assignments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    truck_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trucks.id"), nullable=False, index=True, unique=True
    )
    dock_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("docks.id"), nullable=False, index=True
    )
    recommended_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    # RECOMMENDED, ASSIGNED, COMPLETED, REASSIGNMENT_NEEDED
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    
    assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    departed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # relationships
    truck: Mapped["Truck"] = relationship("Truck", back_populates="dock_assignment")
    dock: Mapped["Dock"] = relationship("Dock", back_populates="assignments")

    def __repr__(self) -> str:
        return f"<DockAssignment truck_id={self.truck_id!r} dock_id={self.dock_id!r} status={self.status!r}>"


# ── YardSlot ──────────────────────────────────────────────────────

class YardSlot(Base):
    """A parking slot in the yard."""

    __tablename__ = "yard_slots"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    slot_code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    # AVAILABLE, OCCUPIED, RESERVED
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="AVAILABLE")
    
    truck_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trucks.id"), nullable=True, unique=True
    )
    appointment_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # relationships
    truck: Mapped["Truck"] = relationship("Truck", back_populates="yard_slot")

    def __repr__(self) -> str:
        return f"<YardSlot slot_code={self.slot_code!r} status={self.status!r}>"
