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
  TrendingUp, 
  Truck, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  DollarSign, 
  Layers, 
  Leaf, 
  Award, 
  RefreshCw, 
  Zap 
} from "lucide-react";

interface AnalyticsData {
  logistics: {
    total_trucks: number;
    in_transit: number;
    delayed: number;
    delivered: number;
    otif_rate: number;
    avg_transit_delay_mins: number;
    active_alerts_count: number;
  };
  procurement_finance: {
    total_invoiced_amount: number;
    total_settled_amount: number;
    touchless_ap_rate: number;
    early_discounts_captured: number;
    potential_discounts: number;
    discount_realization_rate: number;
    avg_cycle_time_reduction: string;
    total_pos: number;
    total_requests: number;
    anomaly_rate: number;
  };
  supplier_matrix: Array<{
    id: string;
    name: string;
    category: string;
    overall_score: number;
    reliability_score: number;
    quality_score: number;
    cost_index: number;
    sustainability_score: number;
    tier: string;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE}/analytics/summary`);
      setData(res.data);
    } catch {
      toast.error("Failed to load live analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const logistics = data?.logistics || {
    total_trucks: 5,
    in_transit: 3,
    delayed: 1,
    delivered: 1,
    otif_rate: 94.2,
    avg_transit_delay_mins: 8.5,
    active_alerts_count: 1,
  };

  const fin = data?.procurement_finance || {
    total_invoiced_amount: 1450000,
    total_settled_amount: 1421000,
    touchless_ap_rate: 88.5,
    early_discounts_captured: 29000,
    potential_discounts: 32000,
    discount_realization_rate: 90.6,
    avg_cycle_time_reduction: "92.4%",
    total_pos: 8,
    total_requests: 12,
    anomaly_rate: 5.2,
  };

  const suppliers = data?.supplier_matrix || [];

  return (
    <AppShell title="Control Tower Analytics">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        <PageHeader 
          title="Executive Control Tower & Operational Intelligence"
          description="Holistic performance telemetry combining E2 fleet tracking reliability with PR2 autonomous AP efficiency."
          action={
            <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={isLoading}>
              <RefreshCw className={`size-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh Intelligence
            </Button>
          }
        />

        {/* ── Top Executive KPI Ribbon ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fleet OTIF Delivery Rate</p>
                <p className="text-3xl font-extrabold text-slate-900">{logistics.otif_rate}%</p>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <TrendingUp className="size-3.5" /> +3.8% vs. Baseline
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl text-blue-600">
                <Truck className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Touchless AP Automation</p>
                <p className="text-3xl font-extrabold text-emerald-600">{fin.touchless_ap_rate}%</p>
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Sparkles className="size-3.5 text-amber-500" /> Autonomous 3-Way Match
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-emerald-600">
                <ShieldCheck className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Early Discount Captured</p>
                <p className="text-3xl font-extrabold text-slate-900">₹{fin.early_discounts_captured.toLocaleString()}</p>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <DollarSign className="size-3.5" /> {fin.discount_realization_rate}% Realization
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl text-amber-600">
                <DollarSign className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cycle Time Reduction</p>
                <p className="text-3xl font-extrabold text-indigo-600">{fin.avg_cycle_time_reduction}</p>
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="size-3.5" /> Cut from 72h to 4m
                </p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl text-indigo-600">
                <Zap className="size-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Dual Control Tower Panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="size-4 text-blue-600" />
                    E2: In-Transit Fleet & Telematics Telemetry
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Live GPS tracking status and transit compliance.
                  </CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  {logistics.total_trucks} Active Trucks
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">On-Schedule Transit Rate</span>
                    <span className="font-bold text-emerald-600">{logistics.otif_rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${logistics.otif_rate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">Average Transit Delay</span>
                    <span className="font-bold text-amber-600">+{logistics.avg_transit_delay_mins} mins</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: "25%" }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                  <div className="text-xl font-bold text-blue-700">{logistics.in_transit}</div>
                  <div className="text-[11px] font-semibold text-blue-600">In-Transit</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                  <div className="text-xl font-bold text-amber-700">{logistics.delayed}</div>
                  <div className="text-[11px] font-semibold text-amber-600">Delayed Alerts</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                  <div className="text-xl font-bold text-emerald-700">{logistics.delivered}</div>
                  <div className="text-[11px] font-semibold text-emerald-600">Delivered</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="size-4 text-emerald-600" />
                    PR2: Autonomous P2P & Financial Health
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Reconciliation accuracy and rebate capture.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                  {fin.touchless_ap_rate}% Touchless
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">Dynamic Discount Realization</span>
                    <span className="font-bold text-emerald-600">{fin.discount_realization_rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${fin.discount_realization_rate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">Invoice Discrepancy Rate</span>
                    <span className="font-bold text-rose-600">{fin.anomaly_rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${Math.max(fin.anomaly_rate * 5, 8)}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-xl font-bold text-slate-900">₹{(fin.total_settled_amount / 100000).toFixed(1)}L</div>
                  <div className="text-[11px] font-semibold text-slate-600">Settled Funds</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                  <div className="text-xl font-bold text-emerald-700">₹{(fin.early_discounts_captured / 1000).toFixed(0)}k</div>
                  <div className="text-[11px] font-semibold text-emerald-600">Rebates Saved</div>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                  <div className="text-xl font-bold text-indigo-700">{fin.total_pos}</div>
                  <div className="text-[11px] font-semibold text-indigo-600">Auto POs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Supplier Performance Matrix ── */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="size-4 text-amber-500" />
              Supplier Multi-Factor Benchmark & ESG Scorecard
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Rankings weighted by Reliability (35%), Quality (30%), Cost (20%), and Sustainability (15%).
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-700 border-b">
                <tr>
                  <th className="px-6 py-3.5">Supplier Partner</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Reliability (35%)</th>
                  <th className="px-6 py-3.5">Quality (30%)</th>
                  <th className="px-6 py-3.5">Cost Efficiency (20%)</th>
                  <th className="px-6 py-3.5">ESG Score (15%)</th>
                  <th className="px-6 py-3.5 text-right">Composite Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {suppliers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`size-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                        }`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Tier {s.tier}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">{s.category}</td>
                    <td className="px-6 py-4 font-semibold text-blue-600">{s.reliability_score}%</td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">{s.quality_score}%</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{100 - s.cost_index}%</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-semibold text-emerald-700">
                        <Leaf className="size-3.5" />
                        {s.sustainability_score}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge className={`font-bold text-xs ${
                        s.overall_score >= 90 
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      }`}>
                        {s.overall_score} / 100
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}