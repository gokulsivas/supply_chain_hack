import re
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.procurement import Product, PurchaseRequest, PurchaseRequestItem
from app.models.user import User
from app.schemas.procurement import CreatePurchaseRequestRequest

def find_or_create_product(db: Session, name: str) -> Product:
    sku_base = re.sub(r"[^A-Z0-9]+", "-", name.strip().upper()).strip("-")
    if not sku_base:
        sku_base = "ITEM"
    
    product = db.query(Product).filter(Product.sku == sku_base).first()
    if not product:
        product = Product(sku=sku_base, name=name.strip())
        db.add(product)
        db.commit()
        db.refresh(product)
    
    return product

def next_purchase_request_code(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"REQ-{year}-"
    
    last_req = (
        db.query(PurchaseRequest)
        .filter(PurchaseRequest.request_code.like(f"{prefix}%"))
        .order_by(PurchaseRequest.request_code.desc())
        .first()
    )
    
    if last_req:
        try:
            last_num = int(last_req.request_code.split("-")[-1])
            next_num = last_num + 1
        except ValueError:
            next_num = 1
    else:
        next_num = 1
        
    return f"{prefix}{next_num:04d}"

def create_purchase_request(db: Session, current_user: User, payload: CreatePurchaseRequestRequest) -> PurchaseRequest:
    product = find_or_create_product(db, payload.item)
    
    # In a fully robust app, we'd do this atomically or handle concurrent sequence generation safely
    req_code = next_purchase_request_code(db)
    
    pr = PurchaseRequest(
        request_code=req_code,
        requested_by_user_id=current_user.id,
        delivery_location=payload.delivery_location,
        required_date=payload.required_date,
        priority=payload.priority,
        status="VALIDATED",
        raw_chat_input=payload.raw_message,
        extracted_json=payload.model_dump(mode="json")
    )
    db.add(pr)
    db.flush()
    
    item = PurchaseRequestItem(
        purchase_request_id=pr.id,
        product_id=product.id,
        quantity=payload.quantity
    )
    db.add(item)
    
    db.commit()
    db.refresh(pr)
    return pr
