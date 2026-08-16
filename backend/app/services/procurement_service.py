import re
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.procurement import Product, PurchaseRequest, PurchaseRequestItem
from app.models.user import User
from app.schemas.procurement import CreatePurchaseRequestRequest

def find_or_create_product(db: Session, name: str) -> Product:
    raw_name = name.strip().lower()
    
    # 1. Fuzzy match against standard catalog categories
    if any(k in raw_name for k in ["packag", "pallet", "box", "carton", "material"]):
        target_sku = "PACKAGING_MATERIAL"
    elif any(k in raw_name for k in ["laptop", "computer", "notebook", "pc"]):
        target_sku = "LAPTOP"
    elif any(k in raw_name for k in ["scanner", "barcode", "reader"]):
        target_sku = "BARCODE_SCANNER"
    else:
        target_sku = re.sub(r"[^A-Z0-9]+", "_", name.strip().upper()).strip("_")
        if not target_sku:
            target_sku = "ITEM"

    # 2. Check if product already exists in DB
    product = db.query(Product).filter(
        (Product.sku == target_sku) | (func.lower(Product.name) == raw_name)
    ).first()

    if not product:
        product = Product(sku=target_sku, name=name.strip(), unit="unit")
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