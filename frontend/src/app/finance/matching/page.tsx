"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
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
  Building2
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

function getInitialMatchingData(queryInvoiceId: string | null): { docs: MatchingDocument[]; selectedId: string } {
  let localPOs: Record<string, unknown>[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) localPOs = JSON.parse(stored);
    } catch {}
  }

  const localDocs: MatchingDocument[] = localPOs.map((po) => {
    const poNum = String(po.po_code || po.po_number || po.id || "PO-2026-0001");
    const invNum = poNum.replace("PO-", "INV-");
    const amt = Number(po.amount || po.total_amount || 1560000);
    return {
      id: invNum.toLowerCase(),
      invoice_number: invNum,
      supplier_name: String(po.supplier_name || "Precision Tech Components"),
      po_number: poNum,
      grn_code: "GRN-0045",
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
  let selected = allDocs[0]?.invoice_number || "INV-2026-0001";
  if (queryInvoiceId) {
    const match = allDocs.find(
      (d) => d.invoice_number === queryInvoiceId || d.id === queryInvoiceId || d.po_number === queryInvoiceId
    );
    if (match) {
      selected = match.invoice_number;
    }
  }

  return { docs: allDocs, selectedId: selected };
}

function MatchingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryInvoiceId = searchParams ? (searchParams.get("invoiceId") || searchParams.get("id")) : null;

  const [documents, setDocuments] = useState<MatchingDocument[]>(() => getInitialMatchingData(queryInvoiceId).docs);
  const [selectedInvId, setSelectedInvId] = useState<string>(() => getInitialMatchingData(queryInvoiceId).selectedId);

  const activeDoc = documents.find((d) => d.invoice_number === selectedInvId) || documents[0];

  const handleToggleAnomaly = () => {
    if (!activeDoc) return;
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
    if (!activeDoc) return;
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
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6 px-4 sm:px-6 pb-12"
      >
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Autonomous 3-Way Matching &amp; OCR Verification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simultaneous touchless reconciliation of Purchase Orders (PO), Goods Receipts (GRN), and Supplier Invoices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReRunMatch}
              className="text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Re-run Match
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAnomaly}
              className={`text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5 ${
                activeDoc?.has_anomaly
                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  : "border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <ShieldAlert className="size-3.5" />
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
                className={`p-3.5 rounded-none border transition-all cursor-pointer bg-card relative ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-xs"
                    : "border-border/80 hover:border-border shadow-2xs hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-foreground">
                    {doc.invoice_number}
                  </span>
                  <Badge
                    className={`text-[10px] uppercase font-semibold ${
                      doc.has_anomaly
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {doc.has_anomaly ? "ANOMALY" : "100% MATCH"}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground truncate mb-2">
                  <Building2 className="size-3 shrink-0 opacity-70" />
                  <span className="truncate">{doc.supplier_name}</span>
                </div>

                <div className="text-[11px] space-y-1 text-muted-foreground border-t border-border/60 pt-2 font-medium">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/80">Linked PO:</span>
                    <span className="font-mono font-semibold text-primary">{doc.po_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/80">Amount:</span>
                    <span className="font-mono font-bold text-foreground">
                      ₹{doc.invoice_amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/80">OCR Quality:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{doc.ocr_confidence}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3-Way Triangulation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: PO */}
          <Card className="border border-border/80 shadow-xs bg-card rounded-none overflow-hidden">
            <CardHeader className="p-4 border-b border-border/60 bg-blue-500/10 dark:bg-blue-950/20 flex flex-row items-center gap-2.5">
              <div className="p-2 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <FileCheck className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">1. Authorized PO</CardTitle>
                <p className="text-[11px] text-muted-foreground">Contractual Baseline</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">PO Reference:</span>
                <span className="font-mono font-bold text-primary">{activeDoc?.po_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Authorized Total:</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  ₹{activeDoc?.po_amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  Approved by Procurement
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: GRN */}
          <Card className="border border-border/80 shadow-xs bg-card rounded-none overflow-hidden">
            <CardHeader className="p-4 border-b border-border/60 bg-emerald-500/10 dark:bg-emerald-950/20 flex flex-row items-center gap-2.5">
              <div className="p-2 rounded-none bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <PackageCheck className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">2. Goods Receipt (GRN)</CardTitle>
                <p className="text-[11px] text-muted-foreground">Physical Delivery Verification</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">GRN Code:</span>
                <span className="font-mono font-bold text-foreground">{activeDoc?.grn_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Verified Quantity:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{activeDoc?.verified_quantity}</span>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  Vision Dock Confirmed
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Supplier Invoice */}
          <Card className="border border-border/80 shadow-xs bg-card rounded-none overflow-hidden">
            <CardHeader className="p-4 border-b border-border/60 bg-purple-500/10 dark:bg-purple-950/20 flex flex-row items-center gap-2.5">
              <div className="p-2 rounded-none bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Receipt className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">3. Supplier Invoice</CardTitle>
                <p className="text-[11px] text-muted-foreground">Extracted via Intelligent OCR</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-mono font-bold text-foreground">{activeDoc?.invoice_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Billed Total:</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  ₹{activeDoc?.invoice_amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 text-[10px] font-semibold">
                  OCR Parsed ({activeDoc?.ocr_confidence}% Accuracy)
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status / Action Footer Banner */}
        {activeDoc?.has_anomaly ? (
          <div className="p-4 rounded-none bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">Discrepancy Anomaly Detected</p>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5 font-medium">
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap shrink-0 shadow-xs"
            >
              Approve AP Override
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                  3-Way Reconciliation Complete — 100% Match
                </p>
                <p className="text-emerald-800 dark:text-emerald-300 mt-0.5 font-medium">
                  Zero variance across Contractual PO, Dock Gate Receipt, and Ingested OCR Invoice. Ready for automated payment release.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/finance/payments")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs whitespace-nowrap flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              Proceed to Payments <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}

      </motion.div>
    </AppShell>
  );
}

export default function MatchingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-xs">Loading 3-way reconciliation...</div>}>
      <MatchingPageContent />
    </Suspense>
  );
}