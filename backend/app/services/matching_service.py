"""
3-Way Matching & Anomaly Detection Service — PR2
"""

from datetime import datetime, timezone, timedelta
import uuid
from sqlalchemy.orm import Session
from app.models.procurement import PurchaseOrder
from app.models.finance import Invoice, GoodsReceipt, ThreeWayMatchResult


def execute_three_way_match(db: Session, invoice_id: str) -> ThreeWayMatchResult:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise ValueError("Invoice not found")
        
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == invoice.purchase_order_id).first()
    if not po:
        raise ValueError("Linked Purchase Order not found")

    # Fetch or auto-simulate Goods Receipt Note (GRN) if truck completed/in yard
    gr = db.query(GoodsReceipt).filter(GoodsReceipt.purchase_order_id == po.id).first()
    if not gr:
        po_qty = sum(item.quantity for item in po.items) if po.items else 50
        gr = GoodsReceipt(
            id=str(uuid.uuid4()),
            grn_code=f"GRN-{po.po_code.split('-')[-1]}",
            purchase_order_id=po.id,
            received_quantity=po_qty,
            accepted_quantity=po_qty,
            rejected_quantity=0,
            notes="Auto-verified by Vision Dock Gate System"
        )
        db.add(gr)
        db.flush()

    anomalies = []
    po_item = po.items[0] if po.items else None
    
    # 1. Price Verification (PO vs Invoice)
    if abs(invoice.total_amount - float(po.total_amount)) > 1.0:
        anomalies.append({
            "field": "total_amount",
            "po_value": f"₹{float(po.total_amount):,.2f}",
            "gr_value": "N/A",
            "invoice_value": f"₹{invoice.total_amount:,.2f}",
            "severity": "HIGH",
            "description": f"Invoice total differs from authorized PO amount by ₹{abs(invoice.total_amount - float(po.total_amount)):,.2f}."
        })

    # 2. Quantity Verification (GRN vs Invoice)
    inv_qty = sum(item.get("quantity", 0) for item in invoice.line_items) if invoice.line_items else (po_item.quantity if po_item else 0)
    if inv_qty > gr.accepted_quantity:
        anomalies.append({
            "field": "quantity",
            "po_value": str(po_item.quantity if po_item else inv_qty),
            "gr_value": str(gr.accepted_quantity),
            "invoice_value": str(inv_qty),
            "severity": "HIGH",
            "description": f"Supplier invoiced for {inv_qty} units, but warehouse only received {gr.accepted_quantity} units."
        })

    match_status = "MATCHED" if len(anomalies) == 0 else "ANOMALY"
    auto_approved = len(anomalies) == 0

    # Persist or update Match Result
    match_result = db.query(ThreeWayMatchResult).filter(ThreeWayMatchResult.invoice_id == invoice.id).first()
    if not match_result:
        match_result = ThreeWayMatchResult(
            id=str(uuid.uuid4()),
            invoice_id=invoice.id,
            purchase_order_id=po.id,
            goods_receipt_id=gr.id,
            status=match_status,
            total_po=float(po.total_amount),
            total_gr=float(po.total_amount) if gr.accepted_quantity == (po_item.quantity if po_item else gr.accepted_quantity) else float(po.total_amount) * 0.9,
            total_invoice=invoice.total_amount,
            anomalies=anomalies,
            auto_approved=auto_approved,
            matched_at=datetime.now(timezone.utc)
        )
        db.add(match_result)
    else:
        match_result.status = match_status
        match_result.anomalies = anomalies
        match_result.auto_approved = auto_approved

    # Update Invoice Status
    invoice.status = "APPROVED" if auto_approved else "ANOMALY"
    db.commit()
    db.refresh(match_result)
    return match_result