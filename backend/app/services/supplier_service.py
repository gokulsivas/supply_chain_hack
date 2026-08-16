from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.procurement import PurchaseRequest, Supplier, SupplierProduct
from app.schemas.supplier_po import (
    SupplierRecommendationsResponse, 
    SupplierRecommendationResponse, 
    SupplierScoreBreakdown, 
    SupplierResponse
)

def calculate_supplier_recommendations(db: Session, purchase_request: PurchaseRequest) -> SupplierRecommendationsResponse:
    """
    Computes multi-factor ranked supplier recommendations from PostgreSQL/SQLite.
    Balances unit price, quality rating, on-time delivery rate, capacity, and lead time.
    """
    if not purchase_request.items:
        raise ValueError("Purchase request has no items.")
    
    pr_item = purchase_request.items[0]
    requested_qty = pr_item.quantity
    product_id = pr_item.product_id

    # 1. Fetch active suppliers offering this product with sufficient capacity
    supplier_products = db.query(SupplierProduct).join(Supplier).filter(
        and_(
            SupplierProduct.product_id == product_id,
            Supplier.is_active == True,
            SupplierProduct.available_capacity >= requested_qty
        )
    ).all()

    if not supplier_products:
        return SupplierRecommendationsResponse(
            purchase_request_id=purchase_request.id,
            request_code=purchase_request.request_code,
            recommendations=[]
        )

    # 2. Benchmarks for relative normalization
    min_price = float(min(sp.unit_price for sp in supplier_products))
    
    def get_lead_time(sp: SupplierProduct) -> int:
        return sp.lead_time_days if sp.lead_time_days is not None else (sp.supplier.lead_time_days or 7)

    min_lead_time = float(min(get_lead_time(sp) for sp in supplier_products))

    recommendations = []

    for sp in supplier_products:
        supplier = sp.supplier
        price = float(sp.unit_price)
        lead_time = float(get_lead_time(sp))
        capacity = sp.available_capacity

        # 3. Normalized scores (0 to 100)
        cost_score = (min_price / price * 100.0) if price > 0 else 100.0
        quality_score = float(supplier.quality_score or 85.0)
        delivery_score = float(supplier.delivery_score or 90.0)
        capacity_score = min((capacity / requested_qty) * 100.0, 100.0) if requested_qty > 0 else 100.0
        lead_time_score = (min_lead_time / lead_time * 100.0) if lead_time > 0 else 100.0

        # 4. Multi-Factor Formula (PR2 Specification)
        overall_score = (
            (cost_score * 0.30) +
            (quality_score * 0.25) +
            (delivery_score * 0.20) +
            (capacity_score * 0.15) +
            (lead_time_score * 0.10)
        )

        # 5. Explainable AI Decision Rationale
        reasons = []
        if cost_score >= 99.0:
            reasons.append("Best Market Quote (Lowest Unit Price)")
        else:
            reasons.append(f"Price Competitiveness: {cost_score:.1f}% relative to lowest quote")

        if quality_score >= 90:
            reasons.append(f"High Reliability: Quality Rating {quality_score:.0f}/100")
        else:
            reasons.append(f"Standard Quality Rating: {quality_score:.0f}/100")

        if delivery_score >= 90:
            reasons.append(f"Historical On-Time Delivery Rate: {delivery_score:.0f}%")

        if int(lead_time) == int(min_lead_time):
            reasons.append(f"Fastest Fulfillment: {int(lead_time)} business days")
        else:
            est_date = (datetime.now(timezone.utc) + timedelta(days=lead_time)).strftime('%b %d')
            reasons.append(f"Lead Time: {int(lead_time)} days (Est. arrival: {est_date})")

        breakdown = SupplierScoreBreakdown(
            cost_score=round(cost_score, 2),
            quality_score=round(quality_score, 2),
            delivery_score=round(delivery_score, 2),
            capacity_score=round(capacity_score, 2),
            lead_time_score=round(lead_time_score, 2),
            overall_score=round(overall_score, 2),
            reasons=reasons
        )

        recommendations.append(SupplierRecommendationResponse(
            supplier=SupplierResponse.model_validate(supplier),
            product_id=sp.product_id,
            unit_price=price,
            available_capacity=capacity,
            lead_time_days=int(lead_time),
            score_breakdown=breakdown,
            is_recommended=False
        ))

    # 6. Rank descending by total score
    recommendations.sort(key=lambda x: x.score_breakdown.overall_score, reverse=True)

    if recommendations:
        recommendations[0].is_recommended = True

    return SupplierRecommendationsResponse(
        purchase_request_id=purchase_request.id,
        request_code=purchase_request.request_code,
        recommendations=recommendations
    )