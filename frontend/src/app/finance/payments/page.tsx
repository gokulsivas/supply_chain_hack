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
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  DollarSign, 
  Sparkles, 
  ShieldCheck, 
  Receipt,
  FileCheck,
  Building2,
  RefreshCw,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

interface PaymentItem {
  id: string;
  payment_reference: string;
  invoice_id: string;
  invoice_number: string;
  po_number: string;
  supplier_name: string;
  gross_amount: number;
  discount_amount: number;
  net_paid_amount: number;
  currency: string;
  status: "pending" | "scheduled" | "settled" | "on_hold";
  payment_method: string;
  match_status: "matched" | "partial" | "anomaly";
  due_date: string | null;
  settled_at: string | null;
  notes: string | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReleasingAll, setIsReleasingAll] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentItem | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE}/finance/payments`);
      setPayments(res.data);
    } catch {
      toast.error("Failed to load payment ledger");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleReleaseSingle = async (paymentId: string) => {
    try {
      const res = await axios.post(`${API_BASE}/finance/payments/${paymentId}/release`);
      toast.success(`Payment ${res.data.payment_reference} settled! Captured ₹${res.data.discount_saved?.toLocaleString()} early discount.`);
      fetchPayments();
    } catch {
      toast.error("Payment release failed");
    }
  };

  const handleAutoReleaseAll = async () => {
    setIsReleasingAll(true);
    try {
      const res = await axios.post(`${API_BASE}/finance/payments/auto-release-all`);
      toast.success(res.data.message);
      fetchPayments();
    } catch {
      toast.error("Batch auto-release failed");
    } finally {
      setIsReleasingAll(false);
    }
  };

  // Metrics Calculations
  const totalSettled = payments
    .filter(p => p.status === "settled")
    .reduce((acc, p) => acc + p.net_paid_amount, 0);

  const totalPending = payments
    .filter(p => p.status === "scheduled" || p.status === "pending")
    .reduce((acc, p) => acc + p.net_paid_amount, 0);

  const totalDiscounts = payments
    .filter(p => p.status === "settled")
    .reduce((acc, p) => acc + p.discount_amount, 0);

  const onHoldCount = payments.filter(p => p.status === "on_hold").length;

  return (
    <AppShell title="Autonomous Payments">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        <PageHeader 
          title="Autonomous Payment Execution & Dynamic Discounting"
          description="Touchless payment release for verified 3-way matched invoices with dynamic early-settlement rebates."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchPayments} disabled={isLoading}>
                <RefreshCw className={`size-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button 
                size="sm" 
                onClick={handleAutoReleaseAll}
                disabled={isReleasingAll || totalPending === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                {isReleasingAll ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Touchless Auto-Release All Matched
              </Button>
            </div>
          }
        />

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Total Settled (Paid)</p>
                <p className="text-2xl font-bold text-slate-900">₹{totalSettled.toLocaleString()}</p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="size-3" /> 100% Touchless Delivery
                </p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-xl text-emerald-700">
                <ShieldCheck className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Scheduled for Release</p>
                <p className="text-2xl font-bold text-slate-900">₹{totalPending.toLocaleString()}</p>
                <p className="text-[10px] text-blue-600 flex items-center gap-0.5">
                  <Clock className="size-3" /> Ready for Automated Execution
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl text-blue-700">
                <CreditCard className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Early Discounts Captured</p>
                <p className="text-2xl font-bold text-emerald-700">₹{totalDiscounts.toLocaleString()}</p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                  <Sparkles className="size-3" /> 2% Dynamic Rebates Applied
                </p>
              </div>
              <div className="bg-amber-100 p-3 rounded-xl text-amber-700">
                <DollarSign className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Blocked / On Hold</p>
                <p className="text-2xl font-bold text-slate-900">{onHoldCount}</p>
                <p className="text-[10px] text-rose-600 flex items-center gap-0.5">
                  <AlertOctagon className="size-3" /> 3-Way Match Discrepancy
                </p>
              </div>
              <div className="bg-rose-100 p-3 rounded-xl text-rose-700">
                <AlertOctagon className="size-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table Card */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base font-bold text-slate-900">Corporate Payment & Remittance Queue</CardTitle>
            <CardDescription className="text-xs text-slate-500">Real-time status of payment settlements, discounts, and audit trails.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-700 border-b">
                <tr>
                  <th className="px-6 py-3.5">Payment Reference</th>
                  <th className="px-6 py-3.5">Beneficiary Supplier</th>
                  <th className="px-6 py-3.5">Linked Invoices / PO</th>
                  <th className="px-6 py-3.5">Gross Amount</th>
                  <th className="px-6 py-3.5">Early Discount (2%)</th>
                  <th className="px-6 py-3.5">Net Payable</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-900">
                      {p.payment_reference}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">{p.supplier_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      <span className="text-blue-600 font-semibold">{p.invoice_number}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-slate-500">{p.po_number}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      ₹{p.gross_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-emerald-700 font-semibold">
                      -₹{p.discount_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{p.net_paid_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {p.status === "settled" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                          <CheckCircle2 className="size-3 mr-1" /> SETTLED
                        </Badge>
                      ) : p.status === "on_hold" ? (
                        <Badge variant="destructive">
                          <AlertOctagon className="size-3 mr-1" /> ON HOLD
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                          <Clock className="size-3 mr-1" /> SCHEDULED
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {p.status === "settled" ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-8"
                          onClick={() => setSelectedReceipt(p)}
                        >
                          <Receipt className="size-3.5 mr-1" /> Remittance
                        </Button>
                      ) : p.status === "on_hold" ? (
                        <Button variant="secondary" size="sm" className="text-xs h-8 text-slate-400" disabled>
                          Mismatch Blocked
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                          onClick={() => handleReleaseSingle(p.id)}
                        >
                          Release Payment
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Remittance Advice Modal */}
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          {selectedReceipt && (
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-2 text-emerald-700 mb-1">
                  <FileCheck className="size-5" />
                  <DialogTitle className="text-lg font-bold">Electronic Remittance Advice</DialogTitle>
                </div>
                <DialogDescription className="text-xs">
                  Official automated banking confirmation and settlement proof.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-slate-50 border rounded-xl p-4 space-y-3 text-xs text-slate-700 font-mono">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.payment_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.supplier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Ref:</span>
                  <span className="font-semibold text-slate-900">{selectedReceipt.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Invoice:</span>
                  <span>₹{selectedReceipt.gross_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Early Payment Rebate (2%):</span>
                  <span>-₹{selectedReceipt.discount_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-sm font-bold text-slate-900">
                  <span>Net Settled Amount:</span>
                  <span className="text-emerald-700">₹{selectedReceipt.net_paid_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>Payment Gateway:</span>
                  <span>{selectedReceipt.payment_method}</span>
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button className="w-full" onClick={() => setSelectedReceipt(null)}>
                  Close Remittance
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AppShell>
  );
}