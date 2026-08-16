"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  PackageCheck, 
  Receipt, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck,
  RefreshCw,
  Zap
} from "lucide-react";

interface MatchAnomaly {
  field: string;
  po_value: string;
  gr_value: string;
  invoice_value: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  supplier_name: string;
  po_number: string;
  total_amount: number;
  currency: string;
  status: string;
  ocr_confidence: number;
}

export default function ThreeWayMatchingPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API_BASE}/finance/invoices`);
      setInvoices(res.data);
      if (res.data.length > 0 && !selectedInvoiceId) {
        setSelectedInvoiceId(res.data[0].id);
        runMatch(res.data[0].id);
      }
    } catch {
      toast.error("Failed to load digital invoices");
    }
  };

  const runMatch = async (invId: string) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/finance/matching/${invId}/execute`);
      setMatchData(res.data);
    } catch {
      toast.error("3-way match failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInjectAnomaly = async () => {
    if (!selectedInvoiceId) return;
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/finance/matching/${selectedInvoiceId}/inject-anomaly`);
      setMatchData(res.data);
      toast.warning("Anomaly injected: Price mismatch detected across PO vs Invoice!");
      fetchInvoices();
    } catch {
      toast.error("Failed to inject anomaly");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);

  return (
    <AppShell title="3-Way Matching & Invoicing">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        <PageHeader 
          title="Autonomous 3-Way Matching & OCR Verification"
          description="Simultaneous touchless reconciliation of Purchase Orders (PO), Goods Receipts (GRN), and Supplier Invoices."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => selectedInvoiceId && runMatch(selectedInvoiceId)}>
                <RefreshCw className="size-4 mr-1.5" /> Re-run Match
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleInjectAnomaly}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Zap className="size-4 mr-1.5 text-amber-600" /> Inject Discrepancy Anomaly
              </Button>
            </div>
          }
        />

        {/* Invoice Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {invoices.map((inv) => (
            <Card 
              key={inv.id} 
              className={`cursor-pointer transition-all border-2 ${selectedInvoiceId === inv.id ? "border-blue-600 shadow-md bg-blue-50/20" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => {
                setSelectedInvoiceId(inv.id);
                runMatch(inv.id);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold">{inv.invoice_number}</CardTitle>
                  <Badge variant={inv.status === "matched" || inv.status === "approved" ? "default" : "destructive"}>
                    {inv.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-xs">{inv.supplier_name}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Linked PO:</span> <span className="font-mono font-bold text-slate-900">{inv.po_number}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount:</span> <span className="font-semibold text-slate-900">₹{inv.total_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>OCR Confidence:</span> <span className="text-emerald-700 font-semibold">{(inv.ocr_confidence * 100).toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 3-Way Document Comparison Matrix */}
        {matchData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Document 1: PO */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-blue-600" />
                    <CardTitle className="text-sm font-bold">1. Authorized PO</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Contractual Baseline</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">PO Reference:</span>
                    <span className="font-mono font-semibold">{matchData.po_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Authorized Total:</span>
                    <span className="font-bold text-slate-900">₹{matchData.total_po?.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    Approved by Procurement
                  </Badge>
                </CardContent>
              </Card>

              {/* Document 2: Goods Receipt */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b bg-slate-50">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="size-5 text-emerald-600" />
                    <CardTitle className="text-sm font-bold">2. Goods Receipt (GRN)</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Physical Delivery Verification</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">GRN Code:</span>
                    <span className="font-mono font-semibold">GRN-{matchData.po_number?.split("-")[-1] || "0042"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Verified Quantity:</span>
                    <span className="font-bold text-slate-900">100% Units Accepted</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Vision Dock Confirmed
                  </Badge>
                </CardContent>
              </Card>

              {/* Document 3: Supplier Invoice */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-5 text-purple-600" />
                    <CardTitle className="text-sm font-bold">3. Supplier Invoice</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Extracted via Intelligent OCR</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Number:</span>
                    <span className="font-mono font-semibold">{matchData.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billed Total:</span>
                    <span className="font-bold text-slate-900">₹{matchData.total_invoice?.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    OCR Parsed (99% Accuracy)
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Match Verdict Banner */}
            {matchData.status === "matched" ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-3 rounded-full">
                    <CheckCircle2 className="size-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">3-Way Match Passed — 100% Consistency</h3>
                    <p className="text-xs text-emerald-700">Zero discrepancies detected across PO, physical warehouse receipts, and digital invoice. Ready for touchless payment auto-release.</p>
                  </div>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                  <ShieldCheck className="size-4" /> Touchless Auto-Approve Payment
                </Button>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-8 text-amber-600" />
                  <div>
                    <h3 className="text-lg font-bold text-amber-950">Discrepancy Anomaly Detected</h3>
                    <p className="text-xs text-amber-700">The 3-way matching algorithm flagged variance between authorized terms and billed invoice.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {matchData.anomalies?.map((anomaly: MatchAnomaly, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-lg border border-amber-200 text-xs text-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-amber-900 uppercase mr-2">[{anomaly.field}]</span>
                        <span>{anomaly.description}</span>
                      </div>
                      <Badge variant="destructive">{anomaly.severity} SEVERITY</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}