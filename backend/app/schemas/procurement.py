from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, constr, conint


class Priority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class PurchaseRequestStatus(str, Enum):
    DRAFT = "DRAFT"
    VALIDATED = "VALIDATED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class RequisitionChatRequest(BaseModel):
    message: str = Field(..., min_length=5, max_length=1000)


class ExtractedRequisition(BaseModel):
    item: str = Field(..., min_length=1)
    item_description: Optional[str] = None
    quantity: int = Field(..., gt=0, le=100000)
    delivery_location: str = Field(..., min_length=1)
    required_date: date
    priority: Priority = Priority.NORMAL

    def model_post_init(self, __context: Any) -> None:
        if not self.item_description and self.item:
            self.item_description = self.item
        elif self.item_description and not self.item:
            self.item = self.item_description


class ExtractionResultResponse(BaseModel):
    raw_message: str
    extracted: Optional[ExtractedRequisition] = None
    is_valid: bool = False
    validation_errors: Optional[Dict[str, Any]] = None
    confidence: Optional[Dict[str, float]] = None
    missing_fields: Optional[List[str]] = Field(default_factory=list)
    warnings: Optional[List[str]] = Field(default_factory=list)


class CreatePurchaseRequestRequest(BaseModel):
    item: Optional[str] = None
    item_description: Optional[str] = None
    quantity: int = Field(..., gt=0, le=100000)
    delivery_location: str = Field(..., min_length=1)
    required_date: date
    priority: Priority = Priority.NORMAL
    raw_message: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.item and self.item_description:
            self.item = self.item_description
        elif not self.item_description and self.item:
            self.item_description = self.item


class ProductResponse(BaseModel):
    id: str
    sku: str
    name: str
    unit: str

    model_config = {"from_attributes": True}


class PurchaseRequestItemResponse(BaseModel):
    id: str
    product: ProductResponse
    quantity: int

    model_config = {"from_attributes": True}


class PurchaseRequestResponse(BaseModel):
    id: str
    request_code: str
    requested_by_user_id: str
    delivery_location: str
    required_date: datetime
    priority: str
    status: str
    raw_chat_input: Optional[str] = None
    extracted_json: Optional[Dict[str, Any]] = None
    items: List[PurchaseRequestItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
