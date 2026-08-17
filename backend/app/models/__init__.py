# Import all models here so that SQLAlchemy's metadata discovers them
# when Base.metadata.create_all() is called from main.py.

from app.models.user import User  # noqa: F401
from app.models.logistics import Shipment, Truck, LogisticsAlert, YardSlot, Dock, DockAssignment, TruckTelemetry  # noqa: F401
from app.models.procurement import Product, PurchaseRequest, PurchaseRequestItem, Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem  # noqa: F401

__all__ = [
    "User", 
    "Shipment", 
    "Truck", 
    "TruckTelemetry",
    "LogisticsAlert", 
    "YardSlot", 
    "Dock", 
    "DockAssignment",
    "Product",
    "PurchaseRequest",
    "PurchaseRequestItem",
    "Supplier",
    "SupplierProduct",
    "PurchaseOrder",
    "PurchaseOrderItem"
]
