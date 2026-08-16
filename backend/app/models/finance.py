"""
Finance models — PR2: Invoices, Goods Receipts, 3-Way Matching & Touchless Payments
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
    JSON,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class GoodsReceipt(Base):
    """Warehouse Goods Receipt Note (GRN) created when a shipment arrives."""
    __tablename__ = "goods_receipts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    grn_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    purchase_order_id: Mapped[str] = mapped_column(String(36), ForeignKey("purchase_orders.id"), nullable=False)
    received_by: Mapped[str] = mapped_column(String(100), default="Warehouse Dock Scanner")
    received_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    accepted_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    rejected_quantity: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    purchase_order = relationship("PurchaseOrder")


class Invoice(Base):
    """Digital supplier invoice extracted via OCR."""
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    supplier_id: Mapped[str] = mapped_column(String(36), ForeignKey("suppliers.id"), nullable=False)
    purchase_order_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("purchase_orders.id"), nullable=True)
    
    status: Mapped[str] = mapped_column(String(30), default="PENDING_REVIEW")  # PENDING_REVIEW, MATCHED, ANOMALY, APPROVED, PAID
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    
    ocr_confidence: Mapped[float] = mapped_column(Float, default=0.98)
    line_items: Mapped[dict] = mapped_column(JSON, default=list)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    supplier = relationship("Supplier")
    purchase_order = relationship("PurchaseOrder")
    match_result = relationship("ThreeWayMatchResult", back_populates="invoice", uselist=False)
    payment = relationship("PaymentRecord", back_populates="invoice", uselist=False)


class ThreeWayMatchResult(Base):
    """Results of AI 3-way matching analysis."""
    __tablename__ = "three_way_match_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), unique=True, nullable=False)
    purchase_order_id: Mapped[str] = mapped_column(String(36), ForeignKey("purchase_orders.id"), nullable=False)
    goods_receipt_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("goods_receipts.id"), nullable=True)
    
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # MATCHED, PARTIAL, ANOMALY
    total_po: Mapped[float] = mapped_column(Float, nullable=False)
    total_gr: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_invoice: Mapped[float] = mapped_column(Float, nullable=False)
    
    anomalies: Mapped[dict] = mapped_column(JSON, default=list)
    auto_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    matched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="match_result")
    purchase_order = relationship("PurchaseOrder")
    goods_receipt = relationship("GoodsReceipt")


class PaymentRecord(Base):
    """Payment settlement and remittance record."""
    __tablename__ = "payment_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_reference: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), unique=True, nullable=False)
    
    gross_amount: Mapped[float] = mapped_column(Float, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    net_paid_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    
    status: Mapped[str] = mapped_column(String(30), default="PENDING")  # PENDING, SCHEDULED, SETTLED, ON_HOLD
    payment_method: Mapped[str] = mapped_column(String(50), default="NEFT / RTGS Corporate Gateway")
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="payment")