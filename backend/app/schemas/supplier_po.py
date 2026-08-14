from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class SupplierResponse(BaseModel):
    id: str
    supplier_code: str
    name: str
    city: Optional[str] = None
    quality_score: float
    delivery_score: float
    capacity_score: float
    lead_time_days: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class SupplierScoreBreakdown(BaseModel):
    cost_score: float
    quality_score: float
    delivery_score: float
    capacity_score: float
    lead_time_score: float
    overall_score: float
    reasons: List[str]

class SupplierRecommendationResponse(BaseModel):
    supplier: SupplierResponse
    product_id: str
    unit_price: float
    available_capacity: int
    lead_time_days: int
    score_breakdown: SupplierScoreBreakdown
    is_recommended: bool

class SupplierRecommendationsResponse(BaseModel):
    purchase_request_id: str
    request_code: str
    recommendations: List[SupplierRecommendationResponse]

class ApproveSupplierRequest(BaseModel):
    supplier_id: str

class PurchaseOrderItemResponse(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    line_total: float

    model_config = ConfigDict(from_attributes=True)

class POShipmentSummary(BaseModel):
    id: str
    shipment_code: str
    tracking_number: str
    status: str

    model_config = ConfigDict(from_attributes=True)

class POTruckSummary(BaseModel):
    id: str
    truck_code: str
    trailer_id: str
    status: str
    current_eta: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderResponse(BaseModel):
    id: str
    po_code: str
    purchase_request_id: str
    total_amount: float
    delivery_location: str
    expected_delivery_date: datetime
    status: str
    recommendation_score: Optional[float] = None
    created_at: datetime
    
    supplier: SupplierResponse
    items: List[PurchaseOrderItemResponse]
    shipment: Optional[POShipmentSummary] = None
    truck: Optional[POTruckSummary] = None

    model_config = ConfigDict(from_attributes=True)
