import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON, Numeric, Float, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    unit = Column(String, default="unit")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    supplier_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    quality_score = Column(Float, nullable=False, default=50.0)
    delivery_score = Column(Float, nullable=False, default=50.0)
    capacity_score = Column(Float, nullable=False, default=50.0)
    lead_time_days = Column(Integer, nullable=False, default=7)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class SupplierProduct(Base):
    __tablename__ = "supplier_products"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    available_capacity = Column(Integer, nullable=False, default=0)
    lead_time_days = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('supplier_id', 'product_id', name='uq_supplier_product'),)

    supplier = relationship("Supplier", backref="products")
    product = relationship("Product")


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    request_code = Column(String, unique=True, index=True, nullable=False)
    requested_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    delivery_location = Column(String, nullable=False)
    required_date = Column(DateTime(timezone=True), nullable=False)
    priority = Column(String, default="NORMAL")
    status = Column(String, default="DRAFT")
    raw_chat_input = Column(String, nullable=True)
    extracted_json = Column(JSON, nullable=True)
    recommended_supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    supplier_recommendation_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="purchase_requests")
    items = relationship("PurchaseRequestItem", back_populates="purchase_request", cascade="all, delete-orphan")
    recommended_supplier = relationship("Supplier")
    purchase_order = relationship("PurchaseOrder", back_populates="purchase_request", uselist=False)


class PurchaseRequestItem(Base):
    __tablename__ = "purchase_request_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    purchase_request_id = Column(String, ForeignKey("purchase_requests.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    purchase_request = relationship("PurchaseRequest", back_populates="items")
    product = relationship("Product")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    po_code = Column(String, unique=True, index=True, nullable=False)
    purchase_request_id = Column(String, ForeignKey("purchase_requests.id"), unique=True, nullable=False)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)
    delivery_location = Column(String, nullable=False)
    expected_delivery_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="DRAFT")
    recommendation_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    purchase_request = relationship("PurchaseRequest", back_populates="purchase_order")
    supplier = relationship("Supplier")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    purchase_order_id = Column(String, ForeignKey("purchase_orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(14, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")
