from sqlalchemy.orm import Session
from app.models.procurement import Product, Supplier, SupplierProduct

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
    db.flush()

    # 3. Seed SupplierProducts
    # Laptops
    _get_or_create_sp(db, s1.id, laptop.id, 48000, 500, 5)
    _get_or_create_sp(db, s2.id, laptop.id, 46000, 800, 7)
    _get_or_create_sp(db, s3.id, laptop.id, 50000, 300, 4)

    # Scanners
    _get_or_create_sp(db, s1.id, scanner.id, 12000, 1000, 3)
    _get_or_create_sp(db, s2.id, scanner.id, 11000, 1500, 5)
    _get_or_create_sp(db, s3.id, scanner.id, 14000, 500, 2)

    # Packaging
    _get_or_create_sp(db, s1.id, packaging.id, 2500, 100, 10)
    _get_or_create_sp(db, s2.id, packaging.id, 2200, 200, 14)
    _get_or_create_sp(db, s3.id, packaging.id, 2800, 50, 7)

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
