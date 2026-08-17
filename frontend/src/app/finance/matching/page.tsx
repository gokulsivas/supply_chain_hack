"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  PackageCheck,
  Receipt,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface MatchingDocument {
  id: string;
  invoice_number: string;
  supplier_name: string;
  po_number: string;
  grn_code: string;
  ocr_confidence: number;
  po_amount: number;
  invoice_amount: number;
  verified_quantity: string;
  has_anomaly: boolean;
  anomaly_text?: string;
}

const DEFAULT_MATCHING_DATA: MatchingDocument[] = [
  {
    id: "inv-2026-4090",
    invoice_number: "INV-2026-4090",
    supplier_name: "Precision Tech Components",
    po_number: "PO-2026-4090",
    grn_code: "GRN-0045",
    ocr_confidence: 99.2,
    po_amount: 1560000,
    invoice_amount: 1560000,
    verified_quantity: "100% Units Accepted (50/50)",
    has_anomaly: false,
  },
  {
    id: "inv-2026-0003",
    invoice_number: "INV-2026-0003",
    supplier_name: "Prime Systems",
    po_number: "PO-2026-0003",
    grn_code: "GRN-0043",
    ocr_confidence: 99.4,
    po_amount: 2500000,
    invoice_amount: 2500000,
    verified_quantity: "100% Units Accepted (100/100)",
    has_anomaly: false,
  },
  {
    id: "inv-2026-0001",
    invoice_number: "INV-2026-0001",
    supplier_name: "Prime Systems",
    po_number: "PO-2026-0001",
    grn_code: "GRN-0042",
    ocr_confidence: 99.0,
    po_amount: 2950000,
    invoice_amount: 2950000,
    verified_quantity: "100% Units Accepted",
    has_anomaly: false,
  },
  {
    id: "inv-2026-0002",
    invoice_number: "INV-2026-0002",
    supplier_name: "Prime Systems",
    po_number: "PO-2026-0002",
    grn_code: "GRN-0039",
    ocr_confidence: 99.0,
    po_amount: 70000,
    invoice_amount: 82600,
    verified_quantity: "92% Units Accepted (Variance)",
    has_anomaly: true,
    anomaly_text: "[PRICE_MISMATCH] Billed unit price ₹82,600 exceeds purchase order contracted ceiling of ₹70,000 (18% variance).",
  },
];

export default function MatchingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryInvoiceId = searchParams ? searchParams.get("invoiceId") : null;

  const [documents, setDocuments] = useState<MatchingDocument[]>(DEFAULT_MATCHING_DATA);
  const [selectedInvId, setSelectedInvId] = useState<string>("INV-2026-0001");
  const [isInjecting, setIsInjecting] = useState(false);

  useEffect(() => {
    // Check localStorage for newly created POs/Invoices to dynamically populate cards
    let localPOs: any[] = [];
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) localPOs = JSON.parse(stored);
    } catch {}

    const localDocs: MatchingDocument[] = localPOs.map((po) => {
      const poNum = po.po_code || po.po_number || po.id;
      const invNum = poNum.replace("PO-", "INV-");
      const amt = Number(po.amount || po.total_amount || 1560000);
      return {
        id: invNum.toLowerCase(),
        invoice_number: invNum,
        supplier_name: po.supplier_name || "Precision Tech Components",
        po_number: poNum,
        grn_code: `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
        ocr_confidence: 99.1,
        po_amount: amt,
        invoice_amount: amt,
        verified_quantity: "100% Units Accepted",
        has_anomaly: false,
      };
    });

    const combinedMap = new Map<string, MatchingDocument>();
    localDocs.forEach((d) => combinedMap.set(d.invoice_number, d));
    DEFAULT_MATCHING_DATA.forEach((d) => {
      if (!combinedMap.has(d.invoice_number)) combinedMap.set(d.invoice_number, d);
    });

    const allDocs = Array.from(combinedMap.values());
    setDocuments(allDocs);

    if (queryInvoiceId && combinedMap.has(queryInvoiceId)) {
      setSelectedInvId(queryInvoiceId);
    } else if (allDocs.length > 0) {
      setSelectedInvId(allDocs[0].invoice_number);
    }
  }, [queryInvoiceId]);

  const activeDoc = documents.find((d) => d.invoice_number === selectedInvId) || documents[0];

  const handleToggleAnomaly = () => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.invoice_number === activeDoc.invoice_number) {
          const nextAnomalyState = !doc.has_anomaly;
          return {
            ...doc,
            has_anomaly: nextAnomalyState,
            invoice_amount: nextAnomalyState ? doc.po_amount + 450000 : doc.po_amount,
            anomaly_text: nextAnomalyState
              ? `[TOTAL_AMOUNT] Invoice total differs from authorized PO amount by ₹450,000.00.`
              : undefined,
          };
        }
        return doc;
      })
    );

    if (!activeDoc.has_anomaly) {
      toast.error("Discrepancy Injected", {
        description: "Invoice amount inflated by ₹4,50,000 for exception testing.",
      });
    } else {
      toast.success("Anomaly Resolved", {
        description: "Re-run match complete. Zero variance detected across 3 data sources.",
      });
    }
  };

  const handleReRunMatch = () => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.invoice_number === activeDoc.invoice_number) {
          return {
            ...doc,
            has_anomaly: false,
            invoice_amount: doc.po_amount,
            anomaly_text: undefined,
          };
        }
        return doc;
      })
    );
    toast.success("Reconciliation Verified", {
      description: "100% 3-Way Match confirmed. Auto-approval released.",
    });
  };

  return (
    <AppShell title="3-Way Matching & Invoicing">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Autonomous 3-Way Matching &amp; OCR Verification
            </h1>
            <p className="text-sm text-slate-500">
              Simultaneous touchless reconciliation of Purchase Orders (PO), Goods Receipts (GRN), and Supplier Invoices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReRunMatch}
              className="text-xs font-semibold"
            >
              <RotateCcw className="size-3.5 mr-1.5" /> Re-run Match
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAnomaly}
              className={`text-xs font-semibold ${
                activeDoc?.has_anomaly
                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  : "border-amber-300 text-amber-700 hover:bg-amber-50"
              }`}
            >
              <ShieldAlert className="size-3.5 mr-1.5" />
              {activeDoc?.has_anomaly ? "Resolve Anomaly" : "Inject Discrepancy Anomaly"}
            </Button>
          </div>
        </div>

        {/* Invoice Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {documents.map((doc) => {
            const isSelected = doc.invoice_number === selectedInvId;

            return (
              <div
                key={doc.invoice_number}
                onClick={() => setSelectedInvId(doc.invoice_number)}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white relative ${
                  isSelected
                    ? "border-blue-600 ring-2 ring-blue-500/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {doc.invoice_number}
                  </span>
                  <Badge
                    className={`text-[10px] uppercase font-bold ${
                      doc.has_anomaly
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {doc.has_anomaly ? "ANOMALY" : "100% MATCH"}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 truncate mb-2">{doc.supplier_name}</p>

                <div className="text-[11px] space-y-1 text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Linked PO:</span>
                    <span className="font-mono font-semibold text-blue-600">{doc.po_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{doc.invoice_amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">OCR Confidence:</span>
                    <span className="font-mono text-emerald-600 font-bold">{doc.ocr_confidence}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3-Way Triangulation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: PO */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 border-b bg-blue-50/40 flex flex-row items-center gap-2">
              <FileCheck className="size-4 text-blue-600" />
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">1. Authorized PO</CardTitle>
                <p className="text-[11px] text-slate-500">Contractual Baseline</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">PO Reference:</span>
                <span className="font-mono font-bold text-blue-600">{activeDoc?.po_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Authorized Total:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹{activeDoc?.po_amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="pt-1">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  Approved by Procurement
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: GRN */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 border-b bg-emerald-50/40 flex flex-row items-center gap-2">
              <PackageCheck className="size-4 text-emerald-600" />
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">2. Goods Receipt (GRN)</CardTitle>
                <p className="text-[11px] text-slate-500">Physical Delivery Verification</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">GRN Code:</span>
                <span className="font-mono font-bold text-slate-800">{activeDoc?.grn_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Verified Quantity:</span>
                <span className="font-semibold text-emerald-700">{activeDoc?.verified_quantity}</span>
              </div>
              <div className="pt-1">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  Vision Dock Confirmed
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Supplier Invoice */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 border-b bg-purple-50/40 flex flex-row items-center gap-2">
              <Receipt className="size-4 text-purple-600" />
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">3. Supplier Invoice</CardTitle>
                <p className="text-[11px] text-slate-500">Extracted via Intelligent OCR</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">{activeDoc?.invoice_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Billed Total:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹{activeDoc?.invoice_amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="pt-1">
                <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                  OCR Parsed ({activeDoc?.ocr_confidence}% Accuracy)
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status / Action Footer Banner */}
        {activeDoc?.has_anomaly ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 text-sm">Discrepancy Anomaly Detected</p>
                <p className="text-amber-700 mt-0.5 font-medium">
                  {activeDoc.anomaly_text ||
                    `[TOTAL_AMOUNT] Invoice total differs from authorized PO amount by ₹${Math.abs(
                      activeDoc.invoice_amount - activeDoc.po_amount
                    ).toLocaleString("en-IN")}.`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleReRunMatch}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap"
            >
              Approve AP Override
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900 text-sm">
                  3-Way Reconciliation Complete — 100% Match
                </p>
                <p className="text-emerald-700 mt-0.5">
                  Zero variance across Contractual PO, Dock Gate Receipt, and Ingested OCR Invoice. Ready for automated payment release.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/finance/payments")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs whitespace-nowrap flex items-center gap-1.5"
            >
              Proceed to Payments <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}

      </div>
    </AppShell>
  );
}