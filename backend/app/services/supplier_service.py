from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.procurement import PurchaseRequest, Supplier, SupplierProduct
from app.schemas.supplier_po import SupplierRecommendationsResponse, SupplierRecommendationResponse, SupplierScoreBreakdown, SupplierResponse

def calculate_supplier_recommendations(db: Session, purchase_request: PurchaseRequest) -> SupplierRecommendationsResponse:
    if not purchase_request.items:
        raise ValueError("Purchase request has no items.")
    
    # We assume 1 item per PR for this demo based on Stage 1 implementation.
    pr_item = purchase_request.items[0]
    requested_qty = pr_item.quantity
    product_id = pr_item.product_id

    # Find eligible supplier products
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

    # Calculate min values for relative scoring
    min_price = float(min(sp.unit_price for sp in supplier_products))
    
    def get_lead_time(sp: SupplierProduct) -> int:
        return sp.lead_time_days if sp.lead_time_days is not None else sp.supplier.lead_time_days

    min_lead_time = float(min(get_lead_time(sp) for sp in supplier_products))

    recommendations = []

    for sp in supplier_products:
        supplier = sp.supplier
        price = float(sp.unit_price)
        lead_time = float(get_lead_time(sp))
        capacity = sp.available_capacity

        # Scores (0-100)
        cost_score = (min_price / price) * 100 if price > 0 else 100
        quality_score = float(supplier.quality_score)
        delivery_score = float(supplier.delivery_score)
        capacity_score = min((capacity / requested_qty) * 100, 100.0) if requested_qty > 0 else 100.0
        lead_time_score = (min_lead_time / lead_time) * 100 if lead_time > 0 else 100

        # Weighted Overall
        overall_score = (
            (cost_score * 0.30) +
            (quality_score * 0.25) +
            (delivery_score * 0.20) +
            (capacity_score * 0.15) +
            (lead_time_score * 0.10)
        )

        reasons = []
        if cost_score == 100:
            reasons.append("Lowest eligible unit price")
        reasons.append(f"Quality score: {quality_score:.0f}/100")
        if capacity_score == 100:
            reasons.append(f"Capacity covers {requested_qty} requested units")
        reasons.append(f"Lead time: {int(lead_time)} days")

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
            is_recommended=False # Will set top one to True later
        ))

    # Sort highest score first
    recommendations.sort(key=lambda x: x.score_breakdown.overall_score, reverse=True)

    if recommendations:
        recommendations[0].is_recommended = True

    return SupplierRecommendationsResponse(
        purchase_request_id=purchase_request.id,
        request_code=purchase_request.request_code,
        recommendations=recommendations
    )
