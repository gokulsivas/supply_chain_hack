"""
Comprehensive Test Suite for AI Procurement Assistant Extraction Flow
Tests all reproduction cases, deterministic fallbacks, date calculations, and PostgreSQL persistence.
"""

from datetime import datetime, date, timedelta, timezone
from app.services.gemini_service import (
    extract_requisition_from_message,
    deterministic_extract,
    calculate_relative_date,
    get_kolkata_now
)
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.procurement import PurchaseRequest, Product
from app.schemas.procurement import CreatePurchaseRequestRequest
from app.services.procurement_service import create_purchase_request

def test_extraction_flow():
    print("=" * 60)
    print("STEP 8 / REQUIRED TEST CASES VALIDATION")
    print("=" * 60)

    kolkata_now = get_kolkata_now()
    ref_date = kolkata_now.date()
    print(f"Current Reference Date (Asia/Kolkata): {ref_date} ({kolkata_now.strftime('%A')})")

    # TEST 1: Reproduction Case
    t1_msg = "I need 12 mobile phones for Baksa by next Tuesday"
    print(f"\n[Test 1] Input: '{t1_msg}'")
    res1 = extract_requisition_from_message(t1_msg)
    ext1 = res1.extracted
    print("Extracted:", ext1)
    
    assert ext1 is not None, "Test 1: Extracted object is None"
    assert "mobile phone" in ext1.item.lower(), f"Test 1: Expected item 'mobile phones', got '{ext1.item}'"
    assert ext1.quantity == 12, f"Test 1: Expected quantity 12, got {ext1.quantity}"
    assert "baksa" in ext1.delivery_location.lower(), f"Test 1: Expected location 'Baksa', got '{ext1.delivery_location}'"
    assert ext1.required_date.weekday() == 1, f"Test 1: Expected required_date to be a Tuesday (weekday 1), got {ext1.required_date.weekday()}"
    assert ext1.required_date >= ref_date, f"Test 1: Date cannot be in the past: {ext1.required_date}"
    assert ext1.priority == "NORMAL", f"Test 1: Priority must be NORMAL, got '{ext1.priority}'"
    print(">>> Test 1 PASSED!")

    # TEST 2: Urgent Barcode Scanners
    t2_msg = "Urgently procure 50 barcode scanners for Chennai by next Friday."
    print(f"\n[Test 2] Input: '{t2_msg}'")
    res2 = extract_requisition_from_message(t2_msg)
    ext2 = res2.extracted
    print("Extracted:", ext2)
    
    assert ext2 is not None, "Test 2: Extracted object is None"
    assert "barcode scanner" in ext2.item.lower(), f"Test 2: Expected item 'barcode scanners', got '{ext2.item}'"
    assert ext2.quantity == 50, f"Test 2: Expected quantity 50, got {ext2.quantity}"
    assert "chennai" in ext2.delivery_location.lower(), f"Test 2: Expected location 'Chennai', got '{ext2.delivery_location}'"
    assert ext2.required_date.weekday() == 4, f"Test 2: Expected required_date to be a Friday (weekday 4), got {ext2.required_date.weekday()}"
    assert ext2.priority == "HIGH", f"Test 2: Priority must be HIGH, got '{ext2.priority}'"
    print(">>> Test 2 PASSED!")

    # TEST 3: Packaging Material Next Month
    t3_msg = "Need 25 pallets of packaging material at Bengaluru DC next month."
    print(f"\n[Test 3] Input: '{t3_msg}'")
    res3 = extract_requisition_from_message(t3_msg)
    ext3 = res3.extracted
    print("Extracted:", ext3)
    
    assert ext3 is not None, "Test 3: Extracted object is None"
    assert "packaging material" in ext3.item.lower() or "pallet" in ext3.item.lower(), f"Test 3: Expected item containing 'packaging material', got '{ext3.item}'"
    assert ext3.quantity == 25, f"Test 3: Expected quantity 25, got {ext3.quantity}"
    assert "bengaluru" in ext3.delivery_location.lower() or "bangalore" in ext3.delivery_location.lower(), f"Test 3: Expected location 'Bengaluru', got '{ext3.delivery_location}'"
    assert ext3.required_date >= ref_date + timedelta(days=20), f"Test 3: Expected next month date, got '{ext3.required_date}'"
    assert ext3.priority == "NORMAL", f"Test 3: Priority must be NORMAL, got '{ext3.priority}'"
    print(">>> Test 3 PASSED!")

    # TEST 4: Database Persistence & Verification in PostgreSQL
    print("\n[Test 4] Database Persistence Verification")
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            user = User(
                email="procurement@antigravity.internal",
                name="Procurement Officer",
                role=UserRole.PROCUREMENT_USER,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        payload = CreatePurchaseRequestRequest(
            item=ext1.item,
            item_description=ext1.item,
            quantity=ext1.quantity,
            delivery_location=ext1.delivery_location,
            required_date=ext1.required_date,
            priority=ext1.priority,
            raw_message=t1_msg
        )

        pr = create_purchase_request(db, user, payload)
        print(f"Created Purchase Request ID: {pr.id}, Code: {pr.request_code}")

        # Query back from DB
        db_pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr.id).first()
        assert db_pr is not None, "Database record was not found"
        assert db_pr.delivery_location == "Baksa", f"Expected Baksa, got {db_pr.delivery_location}"
        assert db_pr.priority == "NORMAL", f"Expected NORMAL, got {db_pr.priority}"
        assert db_pr.items[0].product.name == "mobile phones", f"Expected 'mobile phones', got {db_pr.items[0].product.name}"
        assert db_pr.items[0].quantity == 12, f"Expected 12, got {db_pr.items[0].quantity}"
        assert db_pr.required_date.date() == ext1.required_date, f"Expected {ext1.required_date}, got {db_pr.required_date.date()}"

        print(f"Verified Database Row:")
        print(f"  - Request Code: {db_pr.request_code}")
        print(f"  - Item: {db_pr.items[0].product.name}")
        print(f"  - Quantity: {db_pr.items[0].quantity}")
        print(f"  - Location: {db_pr.delivery_location}")
        print(f"  - Required Date: {db_pr.required_date.date()}")
        print(f"  - Priority: {db_pr.priority}")
        print(">>> Test 4 (Database Persistence) PASSED!")
    finally:
        db.close()

    print("\n" + "=" * 60)
    print("ALL TEST CASES COMPLETED AND VERIFIED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_extraction_flow()
