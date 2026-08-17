"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
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
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2
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

  const fetchAnalytics = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/analytics/summary`);
      setData(res.data);
    } catch {
      toast.error("Failed to load live analytics data");
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    let isMounted = true;
    axios
      .get(`${API_BASE}/analytics/summary`)
      .then((res) => {
        if (isMounted) {
          setData(res.data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error("Failed to load live analytics data");
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [API_BASE]);

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
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 pb-12"
      >
        <PageHeader 
          title="Executive Control Tower & Operational Intelligence"
          description="Holistic performance telemetry combining E2 fleet tracking reliability with PR2 autonomous AP efficiency."
          action={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAnalytics} 
              disabled={isLoading}
              className="text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} /> 
              {isLoading ? "Refreshing..." : "Refresh Intelligence"}
            </Button>
          }
        />

        {/* ── Top Executive KPI Ribbon ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fleet OTIF Delivery Rate</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">{logistics.otif_rate}%</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp className="size-3" /> +3.8% vs. Baseline
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-none text-blue-600 dark:text-blue-400 shrink-0">
                <Truck className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Touchless AP Automation</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{fin.touchless_ap_rate}%</p>
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-500" /> Autonomous 3-Way Match
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-none text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Early Discount Captured</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">₹{fin.early_discounts_captured.toLocaleString()}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <DollarSign className="size-3" /> {fin.discount_realization_rate}% Realization
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-none text-amber-600 dark:text-amber-400 shrink-0">
                <DollarSign className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cycle Time Reduction</p>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-primary">{fin.avg_cycle_time_reduction}</p>
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" /> Cut from 72h to 4m
                </p>
              </div>
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-none text-primary shrink-0">
                <Zap className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Dual Control Tower Panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* E2 Fleet Panel */}
          <Card className="border border-border/80 shadow-xs bg-card rounded-none overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/40 py-3.5 px-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Truck className="size-4 text-blue-600 dark:text-blue-400" />
                    E2: In-Transit Fleet & Telematics Telemetry
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Live GPS tracking status and transit compliance.
                  </CardDescription>
                </div>
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[11px] font-semibold">
                  {logistics.total_trucks} Active Trucks
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-foreground font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-600" /> On-Schedule Transit Rate
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{logistics.otif_rate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(Math.max(logistics.otif_rate, 0), 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-foreground font-medium flex items-center gap-1.5">
                      <Clock className="size-3.5 text-amber-600" /> Average Transit Delay
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+{logistics.avg_transit_delay_mins} mins</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{ width: "25%" }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-none text-center">
                  <div className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400">{logistics.in_transit}</div>
                  <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-300 mt-0.5">In-Transit</div>
                </div>
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-none text-center">
                  <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">{logistics.delayed}</div>
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-300 mt-0.5">Delayed Alerts</div>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-none text-center">
                  <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">{logistics.delivered}</div>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 mt-0.5">Delivered</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PR2 P2P Panel */}
          <Card className="border border-border/80 shadow-xs bg-card rounded-none overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/40 py-3.5 px-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="size-4 text-emerald-600 dark:text-emerald-400" />
                    PR2: Autonomous P2P & Financial Health
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Reconciliation accuracy and rebate capture.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                  {fin.touchless_ap_rate}% Touchless
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-foreground font-medium flex items-center gap-1.5">
                      <Activity className="size-3.5 text-emerald-600" /> Dynamic Discount Realization
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fin.discount_realization_rate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(Math.max(fin.discount_realization_rate, 0), 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-foreground font-medium flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-rose-600" /> Invoice Discrepancy Rate
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{fin.anomaly_rate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-rose-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.max(fin.anomaly_rate * 5, 8)}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-muted/40 border border-border/60 rounded-none text-center">
                  <div className="text-xl font-bold font-mono text-foreground">₹{(fin.total_settled_amount / 100000).toFixed(1)}L</div>
                  <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">Settled Funds</div>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-none text-center">
                  <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">₹{(fin.early_discounts_captured / 1000).toFixed(0)}k</div>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 mt-0.5">Rebates Saved</div>
                </div>
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-none text-center">
                  <div className="text-xl font-bold font-mono text-primary">{fin.total_pos}</div>
                  <div className="text-[11px] font-semibold text-primary/80 mt-0.5">Auto POs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Supplier Performance Matrix ── */}
        <Card className="border border-border/80 shadow-xs bg-card rounded-none overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/40 py-3.5 px-5">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Award className="size-4 text-amber-500" />
              Supplier Multi-Factor Benchmark & ESG Scorecard
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Rankings weighted by Reliability (35%), Quality (30%), Cost (20%), and Sustainability (15%).
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted-foreground">
              <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-foreground border-b border-border/60">
                <tr>
                  <th className="px-5 py-3 font-semibold">Supplier Partner</th>
                  <th className="px-5 py-3 font-semibold">Location / Category</th>
                  <th className="px-5 py-3 font-semibold">Reliability (35%)</th>
                  <th className="px-5 py-3 font-semibold">Quality (30%)</th>
                  <th className="px-5 py-3 font-semibold">Cost Efficiency (20%)</th>
                  <th className="px-5 py-3 font-semibold">ESG Score (15%)</th>
                  <th className="px-5 py-3 text-right font-semibold">Composite Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-normal">
                {suppliers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`size-5.5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          idx === 0 
                            ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30" 
                            : "bg-muted text-muted-foreground border border-border"
                        }`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-xs">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">Tier {s.tier}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-foreground">{s.category}</td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-blue-600 dark:text-blue-400">{s.reliability_score}%</td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{s.quality_score}%</td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-foreground">{100 - s.cost_index}%</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        <Leaf className="size-3.5 shrink-0" />
                        {s.sustainability_score}%
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Badge className={`font-mono font-bold text-[11px] ${
                        s.overall_score >= 90 
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" 
                          : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
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
      </motion.div>
    </AppShell>
  );
}