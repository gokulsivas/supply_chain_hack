"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  DollarSign,
  AlertOctagon,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
  Receipt
} from "lucide-react";

interface PaymentRecord {
  id: string;
  payment_ref: string;
  supplier_name: string;
  invoice_number: string;
  po_number: string;
  gross_amount: number;
  discount_rate: number;
  discount_amount: number;
  net_payable: number;
  status: "READY_FOR_RELEASE" | "PAID" | "BLOCKED";
  settled_at?: string;
}

const DEFAULT_PAYMENTS: PaymentRecord[] = [
  {
    id: "pay-0001",
    payment_ref: "TXN-2026-8801",
    supplier_name: "Precision Tech Components",
    invoice_number: "INV-2026-4090",
    po_number: "PO-2026-4090",
    gross_amount: 1560000,
    discount_rate: 2.0,
    discount_amount: 31200,
    net_payable: 1528800,
    status: "READY_FOR_RELEASE",
  },
  {
    id: "pay-0003",
    payment_ref: "TXN-2026-8803",
    supplier_name: "Prime Systems",
    invoice_number: "INV-2026-0003",
    po_number: "PO-2026-0003",
    gross_amount: 2500000,
    discount_rate: 2.0,
    discount_amount: 50000,
    net_payable: 2450000,
    status: "READY_FOR_RELEASE",
  },
  {
    id: "pay-0002",
    payment_ref: "TXN-2026-8802",
    supplier_name: "Prime Systems",
    invoice_number: "INV-2026-0001",
    po_number: "PO-2026-0001",
    gross_amount: 2950000,
    discount_rate: 2.0,
    discount_amount: 59000,
    net_payable: 2891000,
    status: "READY_FOR_RELEASE",
  },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>(DEFAULT_PAYMENTS);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = () => {
    // Read newly generated local POs to build matching payable records
    let localPOs: any[] = [];
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) localPOs = JSON.parse(stored);
    } catch {}

    const localPayments: PaymentRecord[] = localPOs.map((po, index) => {
      const poNum = po.po_code || po.po_number || po.id;
      const invNum = poNum.replace("PO-", "INV-");
      const gross = Number(po.amount || po.total_amount || 1560000);
      const discount = Math.round(gross * 0.02);
      return {
        id: `pay-${poNum.toLowerCase()}`,
        payment_ref: `TXN-2026-${Math.floor(8000 + Math.random() * 1000)}`,
        supplier_name: po.supplier_name || "Precision Tech Components",
        invoice_number: invNum,
        po_number: poNum,
        gross_amount: gross,
        discount_rate: 2.0,
        discount_amount: discount,
        net_payable: gross - discount,
        status: "READY_FOR_RELEASE",
      };
    });

    const combinedMap = new Map<string, PaymentRecord>();
    localPayments.forEach((p) => combinedMap.set(p.invoice_number, p));
    DEFAULT_PAYMENTS.forEach((p) => {
      if (!combinedMap.has(p.invoice_number)) combinedMap.set(p.invoice_number, p);
    });

    // Check if any had been marked paid previously
    try {
      const paidMapRaw = localStorage.getItem("settled_payment_ids");
      if (paidMapRaw) {
        const paidIds = JSON.parse(paidMapRaw);
        combinedMap.forEach((val, key) => {
          if (paidIds.includes(val.id) || paidIds.includes(val.payment_ref)) {
            val.status = "PAID";
          }
        });
      }
    } catch {}

    setPayments(Array.from(combinedMap.values()));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReleaseSingle = (record: PaymentRecord) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === record.id
          ? { ...p, status: "PAID", settled_at: new Date().toLocaleTimeString() }
          : p
      )
    );

    try {
      const existingPaid = JSON.parse(localStorage.getItem("settled_payment_ids") || "[]");
      localStorage.setItem("settled_payment_ids", JSON.stringify([...existingPaid, record.id, record.payment_ref]));
    } catch {}

    toast.success(`Payment Settled: ${record.payment_ref}`, {
      description: `₹${record.net_payable.toLocaleString("en-IN")} remitted to ${record.supplier_name}. Early discount captured: ₹${record.discount_amount.toLocaleString("en-IN")}.`,
    });
  };

  const handleAutoReleaseAll = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setPayments((prev) =>
        prev.map((p) => ({ ...p, status: "PAID", settled_at: new Date().toLocaleTimeString() }))
      );

      try {
        const allIds = payments.map((p) => p.id);
        localStorage.setItem("settled_payment_ids", JSON.stringify(allIds));
      } catch {}

      toast.success("Touchless Batch Settlement Complete!", {
        description: `All eligible 3-way matched invoices executed with 2% dynamic discounting.`,
      });
      setIsProcessing(false);
    }, 600);
  };

  const totalSettled = payments
    .filter((p) => p.status === "PAID")
    .reduce((acc, p) => acc + p.net_payable, 0);

  const scheduledForRelease = payments
    .filter((p) => p.status === "READY_FOR_RELEASE")
    .reduce((acc, p) => acc + p.net_payable, 0);

  const totalDiscounts = payments
    .filter((p) => p.status === "PAID")
    .reduce((acc, p) => acc + p.discount_amount, 0);

  return (
    <AppShell title="Autonomous Payments">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Autonomous Payment Execution &amp; Dynamic Discounting
            </h1>
            <p className="text-sm text-slate-500">
              Touchless payment release for verified 3-way matched invoices with dynamic early-settlement rebates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs"
            >
              <RefreshCw className="size-3.5 mr-1.5" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleAutoReleaseAll}
              disabled={isProcessing || scheduledForRelease === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
            >
              <Zap className="size-3.5 mr-1.5" /> Touchless Auto-Release All Matched
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Settled (Paid)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  ₹{totalSettled.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">100% Touchless Delivery</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                <ShieldCheck className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled for Release</p>
                <p className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                  ₹{scheduledForRelease.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-blue-600 font-medium mt-0.5">Ready for Automated Execution</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-600">
                <CreditCard className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Early Discounts Captured</p>
                <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">
                  ₹{totalDiscounts.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">2% Dynamic Rebates Applied</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-600">
                <DollarSign className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blocked / On Hold</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">0</p>
                <p className="text-[11px] text-slate-400 mt-0.5">3-Way Match Discrepancy</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-500">
                <AlertOctagon className="size-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Corporate Payment Queue Table */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800">
              Corporate Payment &amp; Remittance Queue
            </CardTitle>
            <p className="text-xs text-slate-500">
              Real-time status of payment settlements, dynamic discounts, and automated treasury rails.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              
              {/* Table Header */}
              <div className="grid grid-cols-12 px-5 py-3 font-semibold text-slate-700 bg-slate-50/75 text-[11px]">
                <div className="col-span-2">PAYMENT REFERENCE</div>
                <div className="col-span-2">BENEFICIARY SUPPLIER</div>
                <div className="col-span-2">LINKED INVOICES / PO</div>
                <div className="col-span-1">GROSS AMOUNT</div>
                <div className="col-span-2">EARLY DISCOUNT (2%)</div>
                <div className="col-span-1">NET PAYABLE</div>
                <div className="col-span-1 text-center">STATUS</div>
                <div className="col-span-1 text-right">ACTIONS</div>
              </div>

              {/* Table Rows */}
              {payments.map((rec) => {
                const isPaid = rec.status === "PAID";

                return (
                  <div
                    key={rec.id}
                    className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="col-span-2 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      <Receipt className="size-3.5 text-slate-400" />
                      <span>{rec.payment_ref}</span>
                    </div>

                    <div className="col-span-2 font-semibold text-slate-800">
                      {rec.supplier_name}
                    </div>

                    <div className="col-span-2 space-y-0.5">
                      <div className="font-mono text-blue-600 font-semibold text-[11px]">{rec.invoice_number}</div>
                      <div className="font-mono text-slate-400 text-[10px]">{rec.po_number}</div>
                    </div>

                    <div className="col-span-1 font-mono text-slate-600">
                      ₹{rec.gross_amount.toLocaleString("en-IN")}
                    </div>

                    <div className="col-span-2 font-mono text-emerald-700 font-semibold">
                      - ₹{rec.discount_amount.toLocaleString("en-IN")}{" "}
                      <span className="text-[10px] bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded ml-1">
                        -2% Early
                      </span>
                    </div>

                    <div className="col-span-1 font-mono font-bold text-slate-900">
                      ₹{rec.net_payable.toLocaleString("en-IN")}
                    </div>

                    <div className="col-span-1 text-center">
                      <Badge
                        className={
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold"
                            : "bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold"
                        }
                      >
                        {isPaid ? "PAID" : "READY"}
                      </Badge>
                    </div>

                    <div className="col-span-1 text-right">
                      {isPaid ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="size-3.5" /> Settled
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleReleaseSingle(rec)}
                          className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                        >
                          Release
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}