"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ScanText, 
  ArrowUpRight, 
  Layers, 
  Receipt,
  Building2,
  RefreshCw,
  Eye,
  CreditCard
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

interface InvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  po_id: string | null;
  po_number: string;
  status: "pending_review" | "matched" | "anomaly" | "approved" | "paid";
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total_amount: number;
  currency: string;
  ocr_confidence: number;
  invoice_date: string;
  due_date: string | null;
  payment_status: "pending" | "scheduled" | "settled" | "on_hold";
  created_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE}/finance/invoices`);
      setInvoices(res.data);
    } catch {
      toast.error("Failed to load invoice records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Summary Metrics
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.total_amount, 0);
  const matchedCount = invoices.filter(inv => inv.status === "matched" || inv.status === "paid").length;
  const anomalyCount = invoices.filter(inv => inv.status === "anomaly").length;
  const avgOcrConfidence = invoices.length
    ? ((invoices.reduce((acc, inv) => acc + inv.ocr_confidence, 0) / invoices.length) * 100).toFixed(1)
    : "98.5";

  return (
    <AppShell title="Invoices">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        <PageHeader 
          title="Digital Invoice Ingestion & OCR Processing"
          description="Autonomous OCR parsing, PO metadata binding, and line-item level reconciliation."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={isLoading}>
                <RefreshCw className={`size-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Link href="/finance/matching">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5">
                  <Layers className="size-4" /> Go to 3-Way Matcher
                </Button>
              </Link>
            </div>
          }
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Total Invoiced Amount</p>
                <p className="text-2xl font-bold text-slate-900">₹{totalInvoiced.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">{invoices.length} Total Extracted Documents</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl text-slate-700">
                <FileText className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Avg OCR Confidence</p>
                <p className="text-2xl font-bold text-blue-600">{avgOcrConfidence}%</p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                  <ScanText className="size-3" /> Autonomous Extraction
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl text-blue-700">
                <ScanText className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">3-Way Matched</p>
                <p className="text-2xl font-bold text-emerald-600">{matchedCount}</p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="size-3" /> Ready / Released
                </p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-xl text-emerald-700">
                <CheckCircle2 className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Discrepancies / Anomalies</p>
                <p className="text-2xl font-bold text-rose-600">{anomalyCount}</p>
                <p className="text-[10px] text-rose-600 flex items-center gap-0.5">
                  <AlertTriangle className="size-3" /> Requires AP Intervention
                </p>
              </div>
              <div className="bg-rose-100 p-3 rounded-xl text-rose-700">
                <AlertTriangle className="size-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Records Table */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base font-bold text-slate-900">Ingested Supplier Invoices</CardTitle>
            <CardDescription className="text-xs text-slate-500">Digitized records from incoming supplier shipments and OCR pipelines.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-700 border-b">
                <tr>
                  <th className="px-6 py-3.5">Invoice #</th>
                  <th className="px-6 py-3.5">Supplier</th>
                  <th className="px-6 py-3.5">Linked PO</th>
                  <th className="px-6 py-3.5">OCR Confidence</th>
                  <th className="px-6 py-3.5">Total Amount</th>
                  <th className="px-6 py-3.5">Matching Status</th>
                  <th className="px-6 py-3.5">Payment</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">{inv.supplier_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-blue-600 font-medium">
                      {inv.po_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${inv.ocr_confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-medium text-slate-700">
                          {(inv.ocr_confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{inv.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {inv.status === "matched" || inv.status === "paid" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                          <CheckCircle2 className="size-3 mr-1" /> 100% MATCH
                        </Badge>
                      ) : inv.status === "anomaly" ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="size-3 mr-1" /> DISCREPANCY
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                          <Clock className="size-3 mr-1" /> PENDING
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
                        inv.payment_status === "settled" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : inv.payment_status === "on_hold"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {inv.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-8"
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <Eye className="size-3.5 mr-1" /> View OCR
                      </Button>
                      <Link href="/finance/matching">
                        <Button 
                          size="sm" 
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
                        >
                          Match <ArrowUpRight className="size-3 ml-0.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* OCR Line Item Extraction Modal */}
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          {selectedInvoice && (
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Receipt className="size-5" />
                  <DialogTitle className="text-lg font-bold">OCR Digitized Invoice: {selectedInvoice.invoice_number}</DialogTitle>
                </div>
                <DialogDescription className="text-xs">
                  Automated computer vision text extraction & tax cross-referencing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border font-mono">
                  <div>
                    <span className="text-slate-500 block">Supplier:</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.supplier_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Purchase Order:</span>
                    <span className="font-bold text-blue-600">{selectedInvoice.po_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">OCR Confidence:</span>
                    <span className="font-bold text-emerald-600">{(selectedInvoice.ocr_confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Match Status:</span>
                    <span className="font-bold uppercase text-slate-900">{selectedInvoice.status}</span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase border-b">
                      <tr>
                        <th className="p-2">Item Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-600">
                      {selectedInvoice.lines?.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium text-slate-900">{line.description}</td>
                          <td className="p-2 text-right">{line.quantity}</td>
                          <td className="p-2 text-right">₹{line.unit_price?.toLocaleString()}</td>
                          <td className="p-2 text-right font-bold text-slate-900">₹{line.total?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Tax Breakdown */}
                <div className="bg-slate-50 p-3 rounded-lg border space-y-1 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST / Tax (18%):</span>
                    <span>₹{selectedInvoice.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t pt-1">
                    <span>Grand Total:</span>
                    <span className="text-blue-600">₹{selectedInvoice.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-2 flex gap-2">
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
                <Link href="/finance/matching">
                  <Button className="bg-blue-600 text-white">
                    Proceed to 3-Way Match
                  </Button>
                </Link>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AppShell>
  );
}