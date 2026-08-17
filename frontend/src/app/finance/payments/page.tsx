"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ShieldCheck,
  Receipt,
  Building2
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

function getInitialPaymentsData(): PaymentRecord[] {
  let localPOs: Record<string, unknown>[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) localPOs = JSON.parse(stored);
    } catch {}
  }

  const localPayments: PaymentRecord[] = localPOs.map((po) => {
    const poNum = String(po.po_code || po.po_number || po.id || "PO-2026-0001");
    const invNum = poNum.replace("PO-", "INV-");
    const gross = Number(po.amount || po.total_amount || 1560000);
    const discount = Math.round(gross * 0.02);
    return {
      id: `pay-${poNum.toLowerCase()}`,
      payment_ref: `TXN-2026-${Math.floor(8000 + Math.random() * 1000)}`,
      supplier_name: String(po.supplier_name || "Precision Tech Components"),
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
  if (typeof window !== "undefined") {
    try {
      const paidMapRaw = localStorage.getItem("settled_payment_ids");
      if (paidMapRaw) {
        const paidIds = JSON.parse(paidMapRaw);
        combinedMap.forEach((val) => {
          if (paidIds.includes(val.id) || paidIds.includes(val.payment_ref)) {
            val.status = "PAID";
          }
        });
      }
    } catch {}
  }

  return Array.from(combinedMap.values());
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>(() => getInitialPaymentsData());
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = useCallback(() => {
    setPayments(getInitialPaymentsData());
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
              Autonomous Payment Execution &amp; Dynamic Discounting
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Touchless payment release for verified 3-way matched invoices with dynamic early-settlement rebates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5"
            >
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleAutoReleaseAll}
              disabled={isProcessing || scheduledForRelease === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3.5 shadow-xs flex items-center gap-1.5"
            >
              <Zap className={`size-3.5 ${isProcessing ? "animate-spin" : ""}`} /> 
              {isProcessing ? "Releasing Batch..." : "Touchless Auto-Release All Matched"}
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Settled (Paid)</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                  ₹{totalSettled.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">100% Touchless Delivery</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-none border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Scheduled for Release</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  ₹{scheduledForRelease.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Ready for Automated Execution</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-none border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                <CreditCard className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Early Discounts Captured</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                  ₹{totalDiscounts.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">2% Dynamic Rebates Applied</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-none border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <DollarSign className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Blocked / On Hold</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">0</p>
                <p className="text-[11px] text-muted-foreground">3-Way Match Discrepancy</p>
              </div>
              <div className="p-3 bg-muted/60 rounded-none border border-border/60 text-muted-foreground shrink-0">
                <AlertOctagon className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Corporate Payment Queue Table */}
        <Card className="border border-border/80 shadow-xs bg-card rounded-none overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60 bg-muted/40">
            <CardTitle className="text-sm font-bold text-foreground">
              Corporate Payment &amp; Remittance Queue
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Real-time status of payment settlements, dynamic discounts, and automated treasury rails.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-muted-foreground">
                <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-foreground border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Payment Reference</th>
                    <th className="px-4 py-3 font-semibold">Beneficiary Supplier</th>
                    <th className="px-4 py-3 font-semibold">Linked Invoices / PO</th>
                    <th className="px-4 py-3 font-semibold">Gross Amount</th>
                    <th className="px-4 py-3 font-semibold">Early Discount (2%)</th>
                    <th className="px-4 py-3 font-semibold">Net Payable</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-normal">
                  {payments.map((rec) => {
                    const isPaid = rec.status === "PAID";

                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Receipt className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{rec.payment_ref}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{rec.supplier_name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-0.5">
                          <div className="font-mono text-primary font-semibold text-[11px]">{rec.invoice_number}</div>
                          <div className="font-mono text-muted-foreground text-[10px]">{rec.po_number}</div>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-muted-foreground">
                          ₹{rec.gross_amount.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          - ₹{rec.discount_amount.toLocaleString("en-IN")}{" "}
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded ml-1 font-sans">
                            -2% Early
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-foreground text-xs">
                          ₹{rec.net_payable.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <Badge
                            className={
                              isPaid
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold"
                                : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold"
                            }
                          >
                            {isPaid ? "PAID" : "READY"}
                          </Badge>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {isPaid ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1 font-mono">
                              <CheckCircle2 className="size-3.5" /> Settled
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleReleaseSingle(rec)}
                              className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                            >
                              Release
                            </Button>
                          )}
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