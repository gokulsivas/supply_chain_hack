"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ScanLine, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  ExternalLink,
  Building2,
  ArrowUpRight
} from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  supplier_name: string;
  po_number: string;
  ocr_confidence: number;
  total_amount: number;
  matching_status: "MATCHED" | "DISCREPANCY" | "PENDING";
  payment_status: "PENDING" | "PAID";
}

const BASE_INVOICES: Invoice[] = [
  {
    id: "inv-0003",
    invoice_number: "INV-2026-0003",
    supplier_name: "Prime Systems",
    po_number: "PO-2026-0003",
    ocr_confidence: 99.0,
    total_amount: 2500000,
    matching_status: "MATCHED",
    payment_status: "PENDING",
  },
  {
    id: "inv-0001",
    invoice_number: "INV-2026-0001",
    supplier_name: "Prime Systems",
    po_number: "PO-2026-0001",
    ocr_confidence: 99.0,
    total_amount: 2950000,
    matching_status: "MATCHED",
    payment_status: "PENDING",
  },
  {
    id: "inv-0002",
    invoice_number: "INV-2026-0002",
    supplier_name: "Prime Systems",
    po_number: "PO-2026-0002",
    ocr_confidence: 99.0,
    total_amount: 82600,
    matching_status: "DISCREPANCY",
    payment_status: "PENDING",
  }
];

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(BASE_INVOICES);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);

    // Read any dynamic POs created during the demo
    let localPOs: Record<string, unknown>[] = [];
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) localPOs = JSON.parse(stored);
    } catch {}

    const dynamicallyGeneratedInvoices: Invoice[] = localPOs.map((po, index) => {
      const poNum = String(po.po_code || po.po_number || po.id || `PO-2026-000${index + 3}`);
      const invNum = poNum.replace("PO-", "INV-");
      return {
        id: invNum.toLowerCase(),
        invoice_number: invNum,
        supplier_name: String(po.supplier_name || po.supplier || "Prime Systems"),
        po_number: poNum,
        ocr_confidence: 99.0,
        total_amount: Number(po.amount || po.total_amount || 2500000),
        matching_status: "MATCHED",
        payment_status: "PENDING",
      };
    });

    let apiInvoices: Invoice[] = [];
    try {
      const res = await axios.get(`${API_BASE}/finance/invoices`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        apiInvoices = res.data.map((item: Record<string, unknown>) => ({
          id: String(item.id || item.invoice_number),
          invoice_number: String(item.invoice_number || item.id),
          supplier_name: typeof item.supplier === "object" && item.supplier !== null ? String((item.supplier as Record<string, unknown>).name) : String(item.supplier_name || "Prime Systems"),
          po_number: String(item.po_number || item.po_code || "PO-2026-0001"),
          ocr_confidence: Number(item.ocr_confidence || 99.0),
          total_amount: Number(item.total_amount || item.amount || 0),
          matching_status: (item.matching_status as "MATCHED" | "DISCREPANCY" | "PENDING") || (item.status === "MATCHED" ? "MATCHED" : "DISCREPANCY"),
          payment_status: (item.payment_status as "PENDING" | "PAID") || "PENDING",
        }));
      }
    } catch {}

    const combinedMap = new Map<string, Invoice>();

    // 1. Invoices from locally created POs
    dynamicallyGeneratedInvoices.forEach((inv) => combinedMap.set(inv.invoice_number, inv));

    // 2. Base default invoices (guarantees INV-2026-0003 is present)
    BASE_INVOICES.forEach((inv) => {
      if (!combinedMap.has(inv.invoice_number)) combinedMap.set(inv.invoice_number, inv);
    });

    // 3. Invoices from API
    apiInvoices.forEach((inv) => {
      if (!combinedMap.has(inv.invoice_number)) combinedMap.set(inv.invoice_number, inv);
    });

    setInvoices(Array.from(combinedMap.values()));
    setIsLoading(false);
  }, [API_BASE]);

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      let localPOs: Record<string, unknown>[] = [];
      try {
        const stored = localStorage.getItem("local_purchase_orders");
        if (stored) localPOs = JSON.parse(stored);
      } catch {}

      const dynamicallyGeneratedInvoices: Invoice[] = localPOs.map((po, index) => {
        const poNum = String(po.po_code || po.po_number || po.id || `PO-2026-000${index + 3}`);
        const invNum = poNum.replace("PO-", "INV-");
        return {
          id: invNum.toLowerCase(),
          invoice_number: invNum,
          supplier_name: String(po.supplier_name || po.supplier || "Prime Systems"),
          po_number: poNum,
          ocr_confidence: 99.0,
          total_amount: Number(po.amount || po.total_amount || 2500000),
          matching_status: "MATCHED",
          payment_status: "PENDING",
        };
      });

      let apiInvoices: Invoice[] = [];
      try {
        const res = await axios.get(`${API_BASE}/finance/invoices`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          apiInvoices = res.data.map((item: Record<string, unknown>) => ({
            id: String(item.id || item.invoice_number),
            invoice_number: String(item.invoice_number || item.id),
            supplier_name: typeof item.supplier === "object" && item.supplier !== null ? String((item.supplier as Record<string, unknown>).name) : String(item.supplier_name || "Prime Systems"),
            po_number: String(item.po_number || item.po_code || "PO-2026-0001"),
            ocr_confidence: Number(item.ocr_confidence || 99.0),
            total_amount: Number(item.total_amount || item.amount || 0),
            matching_status: (item.matching_status as "MATCHED" | "DISCREPANCY" | "PENDING") || (item.status === "MATCHED" ? "MATCHED" : "DISCREPANCY"),
            payment_status: (item.payment_status as "PENDING" | "PAID") || "PENDING",
          }));
        }
      } catch {}

      const combinedMap = new Map<string, Invoice>();
      dynamicallyGeneratedInvoices.forEach((inv) => combinedMap.set(inv.invoice_number, inv));
      BASE_INVOICES.forEach((inv) => {
        if (!combinedMap.has(inv.invoice_number)) combinedMap.set(inv.invoice_number, inv);
      });
      apiInvoices.forEach((inv) => {
        if (!combinedMap.has(inv.invoice_number)) combinedMap.set(inv.invoice_number, inv);
      });

      if (isMounted) {
        setInvoices(Array.from(combinedMap.values()));
      }
    };

    fetchAsync();

    return () => {
      isMounted = false;
    };
  }, [API_BASE]);

  const totalAmount = invoices.reduce((acc, inv) => acc + inv.total_amount, 0);
  const matchedCount = invoices.filter((i) => i.matching_status === "MATCHED").length;
  const discrepancyCount = invoices.filter((i) => i.matching_status === "DISCREPANCY").length;

  return (
    <AppShell title="Invoices">
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6 px-4 sm:px-6 pb-12"
      >
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Digital Invoice Ingestion &amp; OCR Processing
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Autonomous OCR parsing, PO metadata binding, and line-item level reconciliation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadInvoices}
              disabled={isLoading}
              className="text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/finance/matching")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 px-3.5 shadow-xs flex items-center gap-1.5"
            >
              Go to 3-Way Matcher <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Invoiced Amount</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">{invoices.length} Total Extracted Documents</p>
              </div>
              <div className="p-3 bg-muted/60 rounded-none border border-border/60 text-foreground shrink-0">
                <FileText className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg OCR Confidence</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">99.0%</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Autonomous Extraction</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-none border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                <ScanLine className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">3-Way Matched</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{matchedCount}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Ready / Released</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-none border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Discrepancies / Anomalies</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">{discrepancyCount}</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Requires AP Intervention</p>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-none border border-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Table */}
        <Card className="border border-border/80 shadow-xs bg-card rounded-none overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60 bg-muted/40">
            <CardTitle className="text-sm font-bold text-foreground">Ingested Supplier Invoices</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Digitized records from incoming supplier shipments and OCR pipelines.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-muted-foreground">
                <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-foreground border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Invoice #</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Linked PO</th>
                    <th className="px-4 py-3 font-semibold">OCR Confidence</th>
                    <th className="px-4 py-3 font-semibold">Total Amount</th>
                    <th className="px-4 py-3 font-semibold">Matching Status</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-normal">
                  {invoices.map((inv) => {
                    const isMatched = inv.matching_status === "MATCHED";

                    return (
                      <tr
                        key={inv.invoice_number}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-foreground text-xs">
                          {inv.invoice_number}
                        </td>

                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{inv.supplier_name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => router.push(`/finance/matching?invoiceId=${inv.invoice_number}`)}
                            className="font-mono text-primary hover:underline font-semibold text-left inline-flex items-center gap-1 cursor-pointer"
                          >
                            {inv.po_number}
                            <ArrowUpRight className="size-3 opacity-70" />
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${Math.min(inv.ocr_confidence, 100)}%` }} 
                              />
                            </div>
                            <span className="font-mono text-[11px] font-medium text-muted-foreground">{inv.ocr_confidence}%</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-foreground text-xs">
                          ₹{inv.total_amount.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            className={
                              isMatched
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold whitespace-nowrap"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-semibold whitespace-nowrap"
                            }
                          >
                            {isMatched ? "100% MATCH" : "DISCREPANCY"}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
                            {inv.payment_status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/finance/matching?invoiceId=${inv.invoice_number}`)}
                              className="h-7 px-2.5 text-[11px] text-foreground font-medium"
                            >
                              <Eye className="size-3 mr-1" /> View OCR
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => router.push(`/finance/matching?invoiceId=${inv.invoice_number}`)}
                              className="h-7 px-2.5 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-2xs"
                            >
                              Match ↗
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AppShell>
  );
}