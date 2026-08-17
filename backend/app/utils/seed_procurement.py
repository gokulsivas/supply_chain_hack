from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.procurement import Product, Supplier, SupplierProduct, PurchaseRequest, PurchaseRequestItem, PurchaseOrder, PurchaseOrderItem
from app.models.user import User, UserRole
from app.models.logistics import Shipment
from app.core.security import hash_password

def seed_procurement(db: Session) -> None:
    # 1. Ensure Products exist
    laptop = _get_or_create_product(db, "LAPTOP", "Laptops", "unit")
    scanner = _get_or_create_product(db, "BARCODE_SCANNER", "Barcode Scanners", "unit")
    packaging = _get_or_create_product(db, "PACKAGING_MATERIAL", "Packaging Material", "pallet")
    db.flush()

    # 2. Seed Suppliers
    s1 = _get_or_create_supplier(db, "SUP-001", "TechSource India", "Chennai", 94, 96, 85, 5)
    s2 = _get_or_create_supplier(db, "SUP-002", "Value IT Supplies", "Mumbai", 88, 89, 90, 7)
    s3 = _get_or_create_supplier(db, "SUP-003", "Prime Systems", "Bengaluru", 97, 98, 95, 4)
    s4 = _get_or_create_supplier(db, "SUP-004", "Apex Global Sourcing", "Hyderabad", 95, 94, 92, 3)
    s5 = _get_or_create_supplier(db, "SUP-005", "NexGen Electronics", "Pune", 92, 95, 88, 6)
    s6 = _get_or_create_supplier(db, "SUP-006", "GreenPack Eco Materials", "Coimbatore", 96, 93, 90, 5)
    s7 = _get_or_create_supplier(db, "SUP-007", "Precision Sensor Corp", "Delhi NCR", 98, 97, 94, 3)
    s8 = _get_or_create_supplier(db, "SUP-008", "OmniDirect Industrial", "Kolkata", 89, 91, 95, 8)
    db.flush()

    # 3. Seed SupplierProducts
    # Laptops
    _get_or_create_sp(db, s1.id, laptop.id, 48000, 500, 5)
    _get_or_create_sp(db, s2.id, laptop.id, 46000, 800, 7)
    _get_or_create_sp(db, s3.id, laptop.id, 50000, 300, 4)
    _get_or_create_sp(db, s4.id, laptop.id, 47500, 600, 3)
    _get_or_create_sp(db, s5.id, laptop.id, 49000, 400, 6)
    _get_or_create_sp(db, s8.id, laptop.id, 45500, 1000, 8)

    # Scanners
    _get_or_create_sp(db, s1.id, scanner.id, 12000, 1000, 3)
    _get_or_create_sp(db, s2.id, scanner.id, 11000, 1500, 5)
    _get_or_create_sp(db, s3.id, scanner.id, 14000, 500, 2)
    _get_or_create_sp(db, s4.id, scanner.id, 12500, 800, 3)
    _get_or_create_sp(db, s5.id, scanner.id, 11800, 900, 4)
    _get_or_create_sp(db, s7.id, scanner.id, 13500, 1200, 2)

    # Packaging
    _get_or_create_sp(db, s1.id, packaging.id, 2500, 100, 10)
    _get_or_create_sp(db, s2.id, packaging.id, 2200, 200, 14)
    _get_or_create_sp(db, s3.id, packaging.id, 2800, 50, 7)
    _get_or_create_sp(db, s6.id, packaging.id, 2400, 300, 5)
    _get_or_create_sp(db, s8.id, packaging.id, 2100, 500, 9)

    # 4. Seed baseline Purchase Requests & Purchase Orders if none exist
    _seed_baseline_pos(db, laptop, scanner, packaging, s1, s2, s3)

    db.commit()

def _get_or_create_product(db: Session, sku: str, name: str, unit: str) -> Product:
    p = db.query(Product).filter(Product.sku == sku).first()
    if not p:
        p = Product(sku=sku, name=name, unit=unit)
        db.add(p)
    return p

def _get_or_create_supplier(db: Session, code: str, name: str, city: str, q: float, d: float, c: float, lt: int) -> Supplier:
    s = db.query(Supplier).filter(Supplier.supplier_code == code).first()
    if not s:
        s = Supplier(
            supplier_code=code,
            name=name,
            city=city,
            quality_score=q,
            delivery_score=d,
            capacity_score=c,
            lead_time_days=lt
        )
        db.add(s)
    return s

def _get_or_create_sp(db: Session, s_id: str, p_id: str, price: float, cap: int, lt: int):
    sp = db.query(SupplierProduct).filter(
        SupplierProduct.supplier_id == s_id,
        SupplierProduct.product_id == p_id
    ).first()
    if not sp:
        sp = SupplierProduct(
            supplier_id=s_id,
            product_id=p_id,
            unit_price=price,
            available_capacity=cap,
            lead_time_days=lt
        )
        db.add(sp)
    return sp

def _seed_baseline_pos(db: Session, laptop: Product, scanner: Product, packaging: Product, s1: Supplier, s2: Supplier, s3: Supplier):
    # Ensure a default user exists for the requests
    user = db.query(User).first()
    if not user:
        user = User(
            id="usr-demo-0000-0000-000000000001",
            name="Demo Procurement Officer",
            email="demo@cognizant.com",
            password_hash=hash_password("password123"),
            role=UserRole.PROCUREMENT_USER
        )
        db.add(user)
        db.flush()

    # 1. PO-2026-0042 (50 Enterprise Laptops) -> Links to shp-1001 (TRK-1042)
    _create_or_get_seed_po(
        db=db,
        po_code="PO-2026-0042",
        req_code="REQ-2026-0042",
        user_id=user.id,
        supplier=s1,
        product=laptop,
        quantity=50,
        unit_price=48000.0,
        delivery_location="Bengaluru DC",
        days_ahead=3,
        score=96.5,
        status="IN_TRANSIT",
        shipment_id="shp-1042-0000-0000-000000000001"
    )

    # 2. PO-2026-0055 (100 Barcode Scanners) -> Links to shp-1002 (TRK-1055)
    _create_or_get_seed_po(
        db=db,
        po_code="PO-2026-0055",
        req_code="REQ-2026-0055",
        user_id=user.id,
        supplier=s2,
        product=scanner,
        quantity=100,
        unit_price=11000.0,
        delivery_location="Chennai Hub",
        days_ahead=5,
        score=89.2,
        status="IN_TRANSIT",
        shipment_id="shp-1055-0000-0000-000000000002"
    )

    # 3. PO-2026-0063 (25 Pallets Industrial Packaging) -> Links to shp-1003 (TRK-1063)
    _create_or_get_seed_po(
        db=db,
        po_code="PO-2026-0063",
        req_code="REQ-2026-0063",
        user_id=user.id,
        supplier=s3,
        product=packaging,
        quantity=25,
        unit_price=2800.0,
        delivery_location="Bengaluru DC",
        days_ahead=1,
        score=98.0,
        status="DELIVERED",
        shipment_id="shp-1063-0000-0000-000000000003"
    )

def _create_or_get_seed_po(
    db: Session,
    po_code: str,
    req_code: str,
    user_id: str,
    supplier: Supplier,
    product: Product,
    quantity: int,
    unit_price: float,
    delivery_location: str,
    days_ahead: int,
    score: float,
    status: str,
    shipment_id: str
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.po_code == po_code).first()
    if not po:
        req_date = datetime.now(timezone.utc) + timedelta(days=days_ahead)
        pr = db.query(PurchaseRequest).filter(PurchaseRequest.request_code == req_code).first()
        if not pr:
            pr = PurchaseRequest(
                request_code=req_code,
                requested_by_user_id=user_id,
                delivery_location=delivery_location,
                required_date=req_date,
                priority="HIGH" if quantity >= 50 else "NORMAL",
                status="APPROVED",
                recommended_supplier_id=supplier.id
            )
            db.add(pr)
            db.flush()

            pr_item = PurchaseRequestItem(
                purchase_request_id=pr.id,
                product_id=product.id,
                quantity=quantity
            )
            db.add(pr_item)
            db.flush()

        total_amount = float(quantity * unit_price)
        po = PurchaseOrder(
            po_code=po_code,
            purchase_request_id=pr.id,
            supplier_id=supplier.id,
            total_amount=total_amount,
            delivery_location=delivery_location,
            expected_delivery_date=req_date,
            status=status,
            recommendation_score=score
        )
        db.add(po)
        db.flush()

        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price,
            line_total=total_amount
        )
        db.add(po_item)
        db.flush()

    # Link to shipment if shipment exists and not linked
    shipment = db.query(Shipment).filter(
        (Shipment.id == shipment_id) | (Shipment.purchase_order_reference == po_code)
    ).first()
    if shipment and not shipment.purchase_order_id:
        shipment.purchase_order_id = po.id
        db.flush()

    return po
