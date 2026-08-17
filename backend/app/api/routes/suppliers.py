from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.procurement import PurchaseRequest, PurchaseOrder, PurchaseOrderItem, Supplier
from app.schemas.supplier_po import (
    SupplierRecommendationsResponse,
    ApproveSupplierRequest,
    PurchaseOrderResponse,
    SupplierResponse
)
from app.services.supplier_service import calculate_supplier_recommendations
from app.services.purchase_order_service import approve_supplier_and_create_po

router = APIRouter(prefix="/procurement", tags=["procurement"])
direct_router = APIRouter(prefix="", tags=["suppliers"])

@router.get(
    "/suppliers",
    response_model=List[SupplierResponse],
    summary="List all active suppliers"
)
@direct_router.get(
    "/suppliers",
    response_model=List[SupplierResponse],
    summary="List all active suppliers"
)
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).filter(Supplier.is_active == True).all()

@router.get(
    "/purchase-requests/{request_id}/supplier-recommendations",
    response_model=SupplierRecommendationsResponse,
    summary="Get ranked supplier recommendations for a PR"
)
@router.get(
    "/requests/{request_id}/recommendations",
    response_model=SupplierRecommendationsResponse,
    summary="Get ranked supplier recommendations for a PR (alias)"
)
@router.get(
    "/purchase-requests/{request_id}/recommendations",
    response_model=SupplierRecommendationsResponse,
    summary="Get ranked supplier recommendations for a PR (alias 2)"
)
def get_supplier_recommendations(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = db.query(PurchaseRequest).filter(
        (PurchaseRequest.id == request_id) | (PurchaseRequest.request_code == request_id)
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
        
    return calculate_supplier_recommendations(db, pr)


@router.post(
    "/purchase-requests/{request_id}/approve-supplier",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Approve supplier and generate PO"
)
@router.post(
    "/requests/{request_id}/approve-supplier",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Approve supplier and generate PO (alias)"
)
def approve_supplier(
    request_id: str,
    payload: ApproveSupplierRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = db.query(PurchaseRequest).filter(
        (PurchaseRequest.id == request_id) | (PurchaseRequest.request_code == request_id)
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
        
    po = approve_supplier_and_create_po(db, pr, payload.supplier_id)
    
    # Load fully populated response
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product)
    ).filter(PurchaseOrder.id == po.id).first()
    
    return _format_po_response(db, po)


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
    ).filter(
        (PurchaseOrder.id == po_id) | (PurchaseOrder.po_code == po_id)
    ).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    return _format_po_response(db, po)


def _format_po_response(db: Session, po: PurchaseOrder):
    from app.models.logistics import Shipment, Truck
    
    # Retrieve the shipment matching either direct ID foreign key or purchase_order_reference code
    shipment = db.query(Shipment).filter(
        (Shipment.purchase_order_id == po.id) | (Shipment.purchase_order_reference == po.po_code)
    ).first()
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
