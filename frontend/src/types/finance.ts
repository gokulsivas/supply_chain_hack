// ── Finance types ─────────────────────────────────────────────────

export type InvoiceStatus =
  | "pending_review"
  | "matched"
  | "anomaly"
  | "approved"
  | "rejected"
  | "paid";

export interface InvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  po_id: string | null;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total_amount: number;
  currency: string;
  invoice_date: string; // ISO 8601
  due_date: string | null;
  ocr_confidence: number | null; // 0–1
  raw_image_url: string | null;
  created_at: string;
}

export type MatchStatus = "matched" | "partial" | "anomaly" | "unmatched";

export type AnomalySeverity = "low" | "medium" | "high";

export interface MatchAnomaly {
  field: string; // e.g. "unit_price", "quantity"
  po_value: string;
  gr_value: string | null;
  invoice_value: string;
  severity: AnomalySeverity;
  description: string;
}

export interface MatchResult {
  id: string;
  po_id: string;
  po_number: string;
  goods_receipt_id: string | null;
  invoice_id: string;
  invoice_number: string;
  supplier_name: string;
  status: MatchStatus;
  anomalies: MatchAnomaly[];
  total_po: number;
  total_gr: number | null;
  total_invoice: number;
  currency: string;
  matched_at: string; // ISO 8601
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "on_hold";

export interface PaymentApproval {
  id: string;
  invoice_id: string;
  invoice_number: string;
  supplier_name: string;
  amount: number;
  currency: string;
  due_date: string; // ISO 8601
  status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  match_result_id: string | null;
  created_at: string;
}
