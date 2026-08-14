// ── Procurement types ─────────────────────────────────────────────

export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type PurchaseRequestStatus = "DRAFT" | "VALIDATED" | "APPROVED" | "REJECTED";

export interface ExtractedRequisition {
  item: string;
  quantity: number;
  delivery_location: string;
  required_date: string; // YYYY-MM-DD
  priority: Priority;
}

export interface ExtractionResultResponse {
  raw_message: string;
  extracted: ExtractedRequisition | null;
  is_valid: boolean;
  validation_errors: Record<string, string> | null;
}

export interface CreatePurchaseRequestRequest {
  item: string;
  quantity: number;
  delivery_location: string;
  required_date: string; // YYYY-MM-DD
  priority: Priority;
  raw_message?: string | null;
}

export interface ProductResponse {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

export interface PurchaseRequestItem {
  id: string;
  product: ProductResponse;
  quantity: number;
}

export interface PurchaseRequest {
  id: string;
  request_code: string;
  requested_by_user_id: string;
  delivery_location: string;
  required_date: string; // ISO 8601
  priority: Priority;
  status: PurchaseRequestStatus;
  raw_chat_input?: string | null;
  extracted_json?: Record<string, unknown> | null;
  items: PurchaseRequestItem[];
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface SupplierResponse {
  id: string;
  supplier_code: string;
  name: string;
  city: string | null;
  quality_score: number;
  delivery_score: number;
  capacity_score: number;
  lead_time_days: number;
  is_active: boolean;
}

export interface SupplierScoreBreakdown {
  cost_score: number;
  quality_score: number;
  delivery_score: number;
  capacity_score: number;
  lead_time_score: number;
  overall_score: number;
  reasons: string[];
}

export interface SupplierRecommendation {
  supplier: SupplierResponse;
  product_id: string;
  unit_price: number;
  available_capacity: number;
  lead_time_days: number;
  score_breakdown: SupplierScoreBreakdown;
  is_recommended: boolean;
}

export interface SupplierRecommendationsResponse {
  purchase_request_id: string;
  request_code: string;
  recommendations: SupplierRecommendation[];
}

export interface PurchaseOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product?: ProductResponse;
}

export interface POShipmentSummary {
  id: string;
  shipment_code: string;
  tracking_number: string;
  status: string;
}

export interface POTruckSummary {
  id: string;
  truck_code: string;
  trailer_id: string;
  status: string;
  current_eta: string | null;
}

export interface PurchaseOrderResponse {
  id: string;
  po_code: string;
  purchase_request_id: string;
  total_amount: number;
  delivery_location: string;
  expected_delivery_date: string;
  status: string;
  recommendation_score: number | null;
  created_at: string;
  
  supplier: SupplierResponse;
  items: PurchaseOrderItem[];
  shipment: POShipmentSummary | null;
  truck: POTruckSummary | null;
}
