from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.procurement import PurchaseRequest, PurchaseRequestItem

from app.schemas.procurement import (
    RequisitionChatRequest,
    ExtractionResultResponse,
    CreatePurchaseRequestRequest,
    PurchaseRequestResponse
)
from app.services.gemini_service import extract_requisition_from_message, GeminiServiceError
from app.services.procurement_service import create_purchase_request

router = APIRouter(prefix="/procurement", tags=["procurement"])


@router.post(
    "/extract",
    response_model=ExtractionResultResponse,
    summary="Extract purchase request details from natural language",
)
def extract_requisition(
    payload: RequisitionChatRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        return extract_requisition_from_message(payload.message)
    except GeminiServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.post(
    "/purchase-requests",
    response_model=PurchaseRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new purchase request",
)
@router.post(
    "/requests",
    response_model=PurchaseRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new purchase request (alias)",
)
def create_request(
    payload: CreatePurchaseRequestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Server-side validation is automatically handled by FastAPI + CreatePurchaseRequestRequest Pydantic schema
    try:
        pr = create_purchase_request(db, current_user, payload)
        # Load relationships for response model
        pr = db.query(PurchaseRequest).options(
            joinedload(PurchaseRequest.items).joinedload(PurchaseRequestItem.product)
        ).filter(PurchaseRequest.id == pr.id).first()
        return pr
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create purchase request: {str(e)}")


@router.get(
    "/purchase-requests",
    response_model=List[PurchaseRequestResponse],
    summary="List purchase requests for the current user",
)
@router.get(
    "/requests",
    response_model=List[PurchaseRequestResponse],
    summary="List purchase requests for the current user (alias)",
)
def list_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(PurchaseRequest).options(
        joinedload(PurchaseRequest.items).joinedload(PurchaseRequestItem.product)
    )
    
    # Return user's requests or all if admin
    if current_user.role != "ADMIN":
        query = query.filter(PurchaseRequest.requested_by_user_id == current_user.id)
    
    return query.order_by(PurchaseRequest.created_at.desc()).all()


@router.get(
    "/purchase-requests/{request_id}",
    response_model=PurchaseRequestResponse,
    summary="Get a specific purchase request",
)
@router.get(
    "/requests/{request_id}",
    response_model=PurchaseRequestResponse,
    summary="Get a specific purchase request (alias)",
)
def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = db.query(PurchaseRequest).options(
        joinedload(PurchaseRequest.items).joinedload(PurchaseRequestItem.product)
    ).filter(PurchaseRequest.id == request_id).first()
    
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase request not found")
        
    if pr.requested_by_user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase request not found")
        
    return pr
