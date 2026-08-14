from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.procurement import PurchaseRequest, PurchaseOrder, PurchaseOrderItem
from app.schemas.supplier_po import (
    SupplierRecommendationsResponse,
    ApproveSupplierRequest,
    PurchaseOrderResponse
)
from app.services.supplier_service import calculate_supplier_recommendations
from app.services.purchase_order_service import approve_supplier_and_create_po

router = APIRouter(prefix="/procurement", tags=["procurement"])

@router.get(
    "/purchase-requests/{request_id}/supplier-recommendations",
    response_model=SupplierRecommendationsResponse,
    summary="Get ranked supplier recommendations for a PR"
)
def get_supplier_recommendations(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
        
    if pr.requested_by_user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to view recommendations for this PR")
        
    if not pr.items:
        raise HTTPException(status_code=400, detail="Purchase request has no items")
        
    return calculate_supplier_recommendations(db, pr)


@router.post(
    "/purchase-requests/{request_id}/approve-supplier",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Approve supplier and generate PO"
)
def approve_supplier(
    request_id: str,
    payload: ApproveSupplierRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
        
    if pr.requested_by_user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to approve supplier for this PR")
        
    try:
        po = approve_supplier_and_create_po(db, pr, payload.supplier_id)
        
        # Load fully populated response
        po = db.query(PurchaseOrder).options(
            joinedload(PurchaseOrder.supplier),
            joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product)
        ).filter(PurchaseOrder.id == po.id).first()
        
        # For the response to map to PurchaseOrderResponse, we also need shipment and truck
        # The PO schema expects `shipment` and `truck` which are implicitly linked in DB
        # We need to explicitly load or join them
        return _format_po_response(db, po)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # 409 handled automatically via HTTPException in service layer


@router.get(
    "/purchase-orders",
    response_model=List[PurchaseOrderResponse],
    summary="List purchase orders"
)
def list_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product),
        joinedload(PurchaseOrder.purchase_request)
    )
    
    if current_user.role != "ADMIN":
        query = query.filter(PurchaseOrder.purchase_request.has(requested_by_user_id=current_user.id))
        
    pos = query.order_by(PurchaseOrder.created_at.desc()).all()
    return [_format_po_response(db, po) for po in pos]


@router.get(
    "/purchase-orders/{po_id}",
    response_model=PurchaseOrderResponse,
    summary="Get specific purchase order"
)
def get_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product),
        joinedload(PurchaseOrder.purchase_request)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    if current_user.role != "ADMIN" and po.purchase_request.requested_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this PO")
        
    return _format_po_response(db, po)


def _format_po_response(db: Session, po: PurchaseOrder):
    from app.models.logistics import Shipment, Truck
    
    # We can retrieve the shipment directly since it links by PO ID
    shipment = db.query(Shipment).filter(Shipment.purchase_order_id == po.id).first()
    truck = None
    if shipment:
        truck = db.query(Truck).filter(Truck.shipment_id == shipment.id).first()
        
    po_dict = {
        "id": po.id,
        "po_code": po.po_code,
        "purchase_request_id": po.purchase_request_id,
        "total_amount": float(po.total_amount),
        "delivery_location": po.delivery_location,
        "expected_delivery_date": po.expected_delivery_date,
        "status": po.status,
        "recommendation_score": po.recommendation_score,
        "created_at": po.created_at,
        "supplier": po.supplier,
        "items": po.items,
        "shipment": shipment,
        "truck": truck
    }
    return po_dict
