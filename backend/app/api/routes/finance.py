"""
Finance API Routes — PR2: Invoices, 3-Way Matching, and Touchless Payments
"""

from typing import List
from datetime import datetime, timezone, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.procurement import PurchaseOrder, Supplier
from app.models.finance import Invoice, GoodsReceipt, ThreeWayMatchResult, PaymentRecord
from app.services.matching_service import execute_three_way_match

router = APIRouter(prefix="/finance", tags=["finance"])


def _ensure_demo_invoices(db: Session):
    """Seed baseline invoices linked to POs if none exist."""
    existing = db.query(Invoice).first()
    if not existing:
        pos = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.supplier), joinedload(PurchaseOrder.items)).all()
        for po in pos:
            inv_total = float(po.total_amount)
            inv = Invoice(
                id=str(uuid.uuid4()),
                invoice_number=f"INV-2026-{po.po_code.split('-')[-1]}",
                supplier_id=po.supplier_id,
                purchase_order_id=po.id,
                status="MATCHED",
                subtotal=inv_total,
                tax=round(inv_total * 0.18, 2),
                total_amount=round(inv_total * 1.18, 2),
                currency="INR",
                ocr_confidence=0.99,
                line_items=[{
                    "description": po.items[0].product.name if po.items and po.items[0].product else "Procured Goods",
                    "quantity": po.items[0].quantity if po.items else 50,
                    "unit_price": float(po.items[0].unit_price) if po.items else 1000.0,
                    "total": inv_total
                }],
                due_date=datetime.now(timezone.utc) + timedelta(days=30)
            )
            db.add(inv)
            db.flush()

            # Execute initial 3-way match
            execute_three_way_match(db, inv.id)

            # Auto-create pending payment record
            pay = PaymentRecord(
                id=str(uuid.uuid4()),
                payment_reference=f"PAY-TXN-{int(datetime.now().timestamp())}-{po.po_code.split('-')[-1]}",
                invoice_id=inv.id,
                gross_amount=inv.total_amount,
                discount_amount=round(inv.total_amount * 0.02, 2),  # 2% early discount
                net_paid_amount=round(inv.total_amount * 0.98, 2),
                currency="INR",
                status="SCHEDULED",
                notes="Eligible for 2% Early Settlement Rebate"
            )
            db.add(pay)
        db.commit()


@router.get("/invoices")
def list_invoices(db: Session = Depends(get_db)):
    _ensure_demo_invoices(db)
    invoices = db.query(Invoice).options(
        joinedload(Invoice.supplier), 
        joinedload(Invoice.purchase_order),
        joinedload(Invoice.payment)
    ).order_by(Invoice.created_at.desc()).all()

    return [{
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "supplier_id": inv.supplier_id,
        "supplier_name": inv.supplier.name if inv.supplier else "Verified Supplier",
        "po_id": inv.purchase_order_id,
        "po_number": inv.purchase_order.po_code if inv.purchase_order else "N/A",
        "status": inv.status.lower(),
        "lines": inv.line_items,
        "subtotal": inv.subtotal,
        "tax": inv.tax,
        "total_amount": inv.total_amount,
        "currency": inv.currency,
        "ocr_confidence": inv.ocr_confidence,
        "invoice_date": inv.created_at.isoformat(),
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "payment_status": inv.payment.status.lower() if inv.payment else "pending",
        "created_at": inv.created_at.isoformat()
    } for inv in invoices]


@router.post("/matching/{invoice_id}/execute")
def trigger_three_way_match(invoice_id: str, db: Session = Depends(get_db)):
    try:
        match_result = execute_three_way_match(db, invoice_id)
        invoice = db.query(Invoice).options(joinedload(Invoice.supplier), joinedload(Invoice.purchase_order)).filter(Invoice.id == invoice_id).first()
        
        return {
            "id": match_result.id,
            "po_id": match_result.purchase_order_id,
            "po_number": invoice.purchase_order.po_code if invoice and invoice.purchase_order else "PO-2026",
            "goods_receipt_id": match_result.goods_receipt_id,
            "invoice_id": match_result.invoice_id,
            "invoice_number": invoice.invoice_number if invoice else "INV-2026",
            "supplier_name": invoice.supplier.name if invoice and invoice.supplier else "Prime Systems",
            "status": match_result.status.lower(),
            "anomalies": match_result.anomalies,
            "total_po": match_result.total_po,
            "total_gr": match_result.total_gr,
            "total_invoice": match_result.total_invoice,
            "currency": "INR",
            "auto_approved": match_result.auto_approved,
            "matched_at": match_result.matched_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/matching/{invoice_id}/inject-anomaly")
def inject_matching_anomaly(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.total_amount = round(invoice.total_amount * 1.15, 2)
    
    # Put linked payment on hold
    payment = db.query(PaymentRecord).filter(PaymentRecord.invoice_id == invoice.id).first()
    if payment:
        payment.status = "ON_HOLD"
        payment.notes = "Payment blocked: 3-Way Match discrepancy detected"

    db.commit()
    return execute_three_way_match(db, invoice_id)


# ── Payments Endpoints ───────────────────────────────────────────

@router.get("/payments")
def list_payments(db: Session = Depends(get_db)):
    """List all scheduled, settled, and on-hold payment records."""
    _ensure_demo_invoices(db)
    payments = db.query(PaymentRecord).options(
        joinedload(PaymentRecord.invoice).joinedload(Invoice.supplier),
        joinedload(PaymentRecord.invoice).joinedload(Invoice.purchase_order),
        joinedload(PaymentRecord.invoice).joinedload(Invoice.match_result)
    ).order_by(PaymentRecord.created_at.desc()).all()

    return [{
        "id": p.id,
        "payment_reference": p.payment_reference,
        "invoice_id": p.invoice_id,
        "invoice_number": p.invoice.invoice_number if p.invoice else "INV-2026",
        "po_number": p.invoice.purchase_order.po_code if p.invoice and p.invoice.purchase_order else "N/A",
        "supplier_name": p.invoice.supplier.name if p.invoice and p.invoice.supplier else "Supplier",
        "gross_amount": p.gross_amount,
        "discount_amount": p.discount_amount,
        "net_paid_amount": p.net_paid_amount,
        "currency": p.currency,
        "status": p.status.lower(),
        "payment_method": p.payment_method,
        "match_status": p.invoice.match_result.status.lower() if p.invoice and p.invoice.match_result else "matched",
        "due_date": p.invoice.due_date.isoformat() if p.invoice and p.invoice.due_date else None,
        "settled_at": p.settled_at.isoformat() if p.settled_at else None,
        "notes": p.notes,
        "created_at": p.created_at.isoformat()
    } for p in payments]


@router.post("/payments/{payment_id}/release")
def release_payment(payment_id: str, apply_discount: bool = True, db: Session = Depends(get_db)):
    """Execute touchless corporate payment release for a single invoice."""
    payment = db.query(PaymentRecord).options(joinedload(PaymentRecord.invoice)).filter(PaymentRecord.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.status == "SETTLED":
        return {"status": "already_settled", "payment_reference": payment.payment_reference}

    # Execute settlement
    if not apply_discount:
        payment.discount_amount = 0.0
        payment.net_paid_amount = payment.gross_amount

    payment.status = "SETTLED"
    payment.settled_at = datetime.now(timezone.utc)
    payment.notes = f"Settled via Automated Bank Gateway (Txn Ref: {payment.payment_reference})"
    
    if payment.invoice:
        payment.invoice.status = "PAID"

    db.commit()
    db.refresh(payment)

    return {
        "status": "success",
        "payment_reference": payment.payment_reference,
        "net_amount": payment.net_paid_amount,
        "discount_saved": payment.discount_amount,
        "settled_at": payment.settled_at.isoformat()
    }


@router.post("/payments/auto-release-all")
def auto_release_all_matched_payments(db: Session = Depends(get_db)):
    """Autonomous touchless payment release for all 100% matched invoices."""
    _ensure_demo_invoices(db)
    
    eligible = db.query(PaymentRecord).join(Invoice).join(ThreeWayMatchResult).filter(
        PaymentRecord.status != "SETTLED",
        ThreeWayMatchResult.status == "MATCHED"
    ).all()

    released_count = 0
    total_discounts_captured = 0.0

    for p in eligible:
        p.status = "SETTLED"
        p.settled_at = datetime.now(timezone.utc)
        p.notes = "Autonomous Touchless Release (100% 3-Way Match Verified)"
        p.invoice.status = "PAID"
        released_count += 1
        total_discounts_captured += p.discount_amount

    db.commit()

    return {
        "status": "success",
        "released_count": released_count,
        "total_discounts_captured": total_discounts_captured,
        "message": f"Successfully auto-released {released_count} verified payments."
    }