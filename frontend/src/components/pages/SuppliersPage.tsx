"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  ArrowRight,
  Award,
  MapPin,
  Calendar,
  IndianRupee,
  Layers,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { 
  listPurchaseRequests, 
  getPurchaseRequestSupplierRecommendations, 
  approveSupplier as apiApproveSupplier,
  extractApiError
} from "@/lib/api";

interface SupplierRec {
  supplier_id: string;
  supplier_code?: string;
  supplier_name: string;
  match_score: number;
  confidence_score?: number;
  quoted_price: number;
  delivery_days: number;
  esg_rating: string;
  reliability_score?: number;
  recommendation_reason: string;
  risk_level?: string;
}

interface PurchaseRequestItem {
  id?: string;
  request_code?: string;
  title?: string;
  description?: string;
  item?: string;
  category?: string;
  quantity?: number;
  delivery_location?: string;
  required_by?: string;
  priority?: string;
  estimated_budget?: number;
  status?: string;
}

const DEFAULT_PURCHASE_REQUESTS: PurchaseRequestItem[] = [
  {
    id: "REQ-2026-0005",
    request_code: "REQ-2026-0005",
    title: "50 Enterprise Laptops",
    category: "IT_HARDWARE",
    quantity: 50,
    delivery_location: "Bengaluru DC",
    required_by: "2026-08-30",
    priority: "HIGH",
    estimated_budget: 2750000,
    status: "APPROVED"
  },
  {
    id: "REQ-2026-0004",
    request_code: "REQ-2026-0004",
    title: "25 Pallets Industrial Packaging",
    category: "PACKAGING",
    quantity: 25,
    delivery_location: "Chennai Hub",
    required_by: "2026-09-05",
    priority: "NORMAL",
    estimated_budget: 125000,
    status: "PENDING_SOURCING"
  }
];

const DEFAULT_RECOMMENDATIONS: SupplierRec[] = [
  {
    supplier_id: "adac987c-b2fa-4a57-bef3-9692a3017eea",
    supplier_code: "SUP-001",
    supplier_name: "TechSource India (Chennai)",
    match_score: 96.5,
    confidence_score: 0.98,
    quoted_price: 2400000,
    delivery_days: 5,
    esg_rating: "A+",
    reliability_score: 96,
    risk_level: "LOW",
    recommendation_reason: "Best overall balance with lowest total cost, high on-time delivery, and optimal ISO ESG compliance."
  },
  {
    supplier_id: "3790b149-0bf9-46ce-93ce-b0eb5b45e353",
    supplier_code: "SUP-003",
    supplier_name: "Prime Systems (Bengaluru)",
    match_score: 94.2,
    confidence_score: 0.95,
    quoted_price: 2500000,
    delivery_days: 4,
    esg_rating: "A",
    reliability_score: 98,
    risk_level: "LOW",
    recommendation_reason: "Fastest local delivery with highest historical quality rating (98%) and local Bengaluru warehouse hub."
  },
  {
    supplier_id: "4272db15-320e-4c5a-adff-3ea898a0fe9f",
    supplier_code: "SUP-004",
    supplier_name: "Apex Global Sourcing (Hyderabad)",
    match_score: 93.8,
    confidence_score: 0.94,
    quoted_price: 2375000,
    delivery_days: 3,
    esg_rating: "A+",
    reliability_score: 95,
    risk_level: "LOW",
    recommendation_reason: "Ultra-fast 72-hour air dispatch route with enterprise SLA and guaranteed buffer availability."
  },
  {
    supplier_id: "53a99003-64e1-45e1-aaf7-5d5a84ed44fb",
    supplier_code: "SUP-007",
    supplier_name: "Precision Sensor Corp (Delhi NCR)",
    match_score: 91.5,
    confidence_score: 0.93,
    quoted_price: 2550000,
    delivery_days: 3,
    esg_rating: "A+",
    reliability_score: 97,
    risk_level: "LOW",
    recommendation_reason: "ISO-9001 certified components with zero defect tolerance and automated IoT verification."
  },
  {
    supplier_id: "4e978a73-0764-4513-b92a-a2ce7da3ab70",
    supplier_code: "SUP-005",
    supplier_name: "NexGen Electronics (Pune)",
    match_score: 88.0,
    confidence_score: 0.90,
    quoted_price: 2450000,
    delivery_days: 6,
    esg_rating: "A",
    reliability_score: 92,
    risk_level: "LOW",
    recommendation_reason: "Reliable secondary tier-1 supplier with competitive volume discounts."
  },
  {
    supplier_id: "d8087a53-9609-42bf-9ec8-24c0bd8cf33c",
    supplier_code: "SUP-006",
    supplier_name: "GreenPack Eco Materials (Coimbatore)",
    match_score: 86.4,
    confidence_score: 0.89,
    quoted_price: 2350000,
    delivery_days: 5,
    esg_rating: "AAA",
    reliability_score: 96,
    risk_level: "LOW",
    recommendation_reason: "Industry leader in 100% circular recycled materials with highest sustainability benchmark rating."
  },
  {
    supplier_id: "12b9f47d-113a-45a8-a47b-5ca9c6968e8d",
    supplier_code: "SUP-002",
    supplier_name: "Value IT Supplies (Mumbai)",
    match_score: 81.4,
    confidence_score: 0.84,
    quoted_price: 2750000,
    delivery_days: 8,
    esg_rating: "B+",
    reliability_score: 88,
    risk_level: "MEDIUM",
    recommendation_reason: "Standard catalog pricing with higher lead time and secondary road transit."
  },
  {
    supplier_id: "f5b8d47f-797e-48a1-80e9-3c284e670d9d",
    supplier_code: "SUP-008",
    supplier_name: "OmniDirect Industrial (Kolkata)",
    match_score: 79.2,
    confidence_score: 0.82,
    quoted_price: 2275000,
    delivery_days: 9,
    esg_rating: "B+",
    reliability_score: 89,
    risk_level: "MEDIUM",
    recommendation_reason: "Deepest volume rebate structure for bulk freight, best suited for non-urgent replenishments."
  }
];

function SuppliersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlReqId = searchParams.get("reqId") || searchParams.get("id");

  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestItem[]>(DEFAULT_PURCHASE_REQUESTS);
  const [selectedReqId, setSelectedReqId] = useState<string>(urlReqId || "REQ-2026-0005");
  const [recommendations, setRecommendations] = useState<SupplierRec[]>(DEFAULT_RECOMMENDATIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const fetchRecommendations = async (reqId: string) => {
    try {
      const recs = await getPurchaseRequestSupplierRecommendations(reqId);
      if (Array.isArray(recs) && recs.length > 0) {
        setRecommendations(recs);
      } else {
        setRecommendations(DEFAULT_RECOMMENDATIONS);
      }
    } catch {
      setRecommendations(DEFAULT_RECOMMENDATIONS);
    }
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    let localReqs: PurchaseRequestItem[] = [];
    try {
      const stored = localStorage.getItem("local_purchase_requests");
      if (stored) localReqs = JSON.parse(stored);
    } catch {}

    try {
      const data = await listPurchaseRequests();
      const combinedMap = new Map<string, PurchaseRequestItem>();
      [...localReqs, ...(Array.isArray(data) ? data : []), ...DEFAULT_PURCHASE_REQUESTS].forEach((item) => {
        const id = item.id || item.request_code;
        if (id && !combinedMap.has(id)) combinedMap.set(id, item);
      });

      const combinedList = Array.from(combinedMap.values());
      setPurchaseRequests(combinedList);

      const matchFound = urlReqId ? combinedList.find((d) => d.id === urlReqId || d.request_code === urlReqId) : null;
      const targetId = matchFound ? (matchFound.id || matchFound.request_code || "REQ-2026-0005") : (urlReqId || (combinedList[0] ? combinedList[0].id || combinedList[0].request_code || "REQ-2026-0005" : "REQ-2026-0005"));
      setSelectedReqId(targetId);
      await fetchRecommendations(targetId);
    } catch {
      setPurchaseRequests(DEFAULT_PURCHASE_REQUESTS);
      setRecommendations(DEFAULT_RECOMMENDATIONS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      let localReqs: PurchaseRequestItem[] = [];
      try {
        const stored = localStorage.getItem("local_purchase_requests");
        if (stored) localReqs = JSON.parse(stored);
      } catch {}

      try {
        const data = await listPurchaseRequests();
        const combinedMap = new Map<string, PurchaseRequestItem>();
        [...localReqs, ...(Array.isArray(data) ? data : []), ...DEFAULT_PURCHASE_REQUESTS].forEach((item) => {
          const id = item.id || item.request_code;
          if (id && !combinedMap.has(id)) combinedMap.set(id, item);
        });

        const combinedList = Array.from(combinedMap.values());
        if (isMounted) {
          setPurchaseRequests(combinedList);
          const matchFound = urlReqId ? combinedList.find((d) => d.id === urlReqId || d.request_code === urlReqId) : null;
          const targetId = matchFound ? (matchFound.id || matchFound.request_code || "REQ-2026-0005") : (urlReqId || (combinedList[0] ? combinedList[0].id || combinedList[0].request_code || "REQ-2026-0005" : "REQ-2026-0005"));
          setSelectedReqId(targetId);
          await fetchRecommendations(targetId);
        }
      } catch {
        if (isMounted) {
          setPurchaseRequests(DEFAULT_PURCHASE_REQUESTS);
          setRecommendations(DEFAULT_RECOMMENDATIONS);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [urlReqId]);

  const handleSelectReq = (reqId: string) => {
    setSelectedReqId(reqId);
    fetchRecommendations(reqId);
  };

  const handleApproveSupplier = async (supplier: SupplierRec) => {
    if (isApproving) return;
    setIsApproving(supplier.supplier_id);

    const targetReq = purchaseRequests.find((r) => r.id === selectedReqId || r.request_code === selectedReqId);
    const targetReqId = targetReq?.id || targetReq?.request_code || selectedReqId;

    try {
      const res = await apiApproveSupplier(targetReqId, {
        supplier_id: supplier.supplier_id
      });

      const finalPoCode = res?.po_code || res?.po_number || res?.id || "PO-CREATED";

      toast.success(`Purchase Order ${finalPoCode} Created!`, {
        description: `Contract successfully awarded to ${supplier.supplier_name}. Route dispatched to logistics.`,
        action: {
          label: "View Purchase Orders",
          onClick: () => router.push("/procurement/purchase-orders"),
        },
      });

      await loadInitialData();
    } catch (err: unknown) {
      const errorMsg = extractApiError(err);
      toast.error(errorMsg || "Failed to award contract to supplier. Please try again.");
    } finally {
      setIsApproving(null);
    }
  };

  const selectedReq = purchaseRequests.find(
    (pr) => pr.id === selectedReqId || pr.request_code === selectedReqId
  );

  // Keep a compact, uncluttered list of the top 4 active purchase requisitions
  const visiblePurchaseRequests = React.useMemo(() => {
    if (purchaseRequests.length <= 4) return purchaseRequests;
    const selected = purchaseRequests.find((pr) => pr.id === selectedReqId || pr.request_code === selectedReqId);
    const others = purchaseRequests.filter((pr) => pr.id !== selectedReqId && pr.request_code !== selectedReqId);
    return selected ? [selected, ...others.slice(0, 3)] : purchaseRequests.slice(0, 4);
  }, [purchaseRequests, selectedReqId]);

  return (
    <AppShell title="Supplier Intelligence">
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6 px-4 sm:px-6 pb-12"
      >
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Autonomous Supplier Selection
            </h1>
            <p className="text-xs text-muted-foreground">
              AI-ranked supplier recommendations scored across unit cost, lead time, ESG compliance, and historical reliability.
            </p>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadInitialData} 
            disabled={isLoading}
            className="h-8 text-xs self-start sm:self-auto border-border/80 hover:bg-muted/60"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Active Requisition Selection & Context Bar */}
        <Card className="border border-border shadow-xs bg-card rounded-none overflow-hidden">
          <CardHeader className="p-3.5 border-b border-border bg-muted/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" /> Active Purchase Requisitions
              </span>
              <span className="text-[11px] text-muted-foreground">
                Showing {visiblePurchaseRequests.length} of {purchaseRequests.length} active requisitions
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-3.5 space-y-3">
            {/* Requisition Pill Selector */}
            <div className="flex flex-wrap gap-2">
              {visiblePurchaseRequests.map((pr) => {
                const reqId = pr.id || pr.request_code || "REQ-0000";
                const isSelected = selectedReqId === reqId;
                const title = pr.title || pr.description || pr.item || "Industrial Equipment";

                return (
                  <button
                    key={reqId}
                    type="button"
                    onClick={() => handleSelectReq(reqId)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-none border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                        : "bg-muted/30 text-foreground border-border/70 hover:bg-muted/70 hover:border-border"
                    }`}
                  >
                    <span className="font-mono font-bold shrink-0">{pr.request_code || reqId.slice(0, 12)}</span>
                    <span className="opacity-40">|</span>
                    <span className="truncate max-w-[240px] text-left">{title}</span>
                    <Badge 
                      className={`ml-1 text-[10px] py-0 px-1.5 font-mono rounded-none ${
                        isSelected 
                          ? "bg-primary-foreground/20 text-primary-foreground border-transparent" 
                          : "bg-background text-muted-foreground border-border/60"
                      }`}
                    >
                      Qty: {pr.quantity || 50}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Selected Requisition Context Summary Strip */}
            {selectedReq && (
              <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3 text-muted-foreground/80" /> Destination
                  </span>
                  <p className="font-medium text-foreground break-words leading-tight">
                    {selectedReq.delivery_location || "Central Hub (Chennai)"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3 text-muted-foreground/80" /> Target Date
                  </span>
                  <p className="font-medium text-foreground font-mono">
                    {selectedReq.required_by || "2026-08-30"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <IndianRupee className="size-3 text-muted-foreground/80" /> Est. Budget
                  </span>
                  <p className="font-mono font-bold text-foreground">
                    {selectedReq.estimated_budget ? `₹${selectedReq.estimated_budget.toLocaleString("en-IN")}` : "₹27,50,000"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-muted-foreground/80" /> Status
                  </span>
                  <div>
                    <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold rounded-none">
                      {selectedReq.status || "APPROVED"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Recommendation View */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              AI Evaluated Supplier Matches
              <span className="text-xs font-normal text-muted-foreground hidden sm:inline">
                ({recommendations.length} eligible suppliers ranked for {selectedReq?.title || selectedReqId})
              </span>
            </h2>
          </div>

          {/* Supplier Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommendations.map((rec, index) => {
              const isTopPick = index === 0;

              return (
                <Card 
                  key={rec.supplier_id} 
                  className={`relative overflow-hidden transition-all bg-card flex flex-col justify-between rounded-none shadow-xs ${
                    isTopPick 
                      ? "border-primary/80 ring-1 ring-primary/20 shadow-sm" 
                      : "border-border hover:border-border hover:shadow-xs"
                  }`}
                >
                  {isTopPick && (
                    <div className="bg-primary/10 text-primary text-[10px] font-bold tracking-wider uppercase py-1.5 px-4 flex items-center justify-between border-b border-primary/20">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Award className="size-3.5 text-primary" /> Top Recommended Match
                      </span>
                      <span className="font-mono">Rank #1</span>
                    </div>
                  )}

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold text-foreground flex items-start gap-1.5 break-words">
                          <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="break-words leading-snug">{rec.supplier_name}</span>
                        </CardTitle>
                        <p className="text-[11px] font-mono text-muted-foreground mt-1">
                          ID: {rec.supplier_code || rec.supplier_id.slice(0, 8)}
                        </p>
                      </div>

                      <Badge 
                        className={`text-[11px] font-bold font-mono px-2 py-0.5 shrink-0 rounded-none ${
                          rec.match_score >= 90
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : rec.match_score >= 80
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {rec.match_score.toFixed(1)}% Match
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5 text-xs">
                      {/* Price Row */}
                      <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <IndianRupee className="size-3.5 text-muted-foreground/80" /> Quoted Total Price:
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          ₹{rec.quoted_price.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Lead Time Row */}
                      <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-muted-foreground/80" /> Lead Time:
                        </span>
                        <span className="font-semibold text-foreground">
                          {rec.delivery_days} Business Days
                        </span>
                      </div>

                      {/* ESG Rating Row */}
                      <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" /> ESG Rating:
                        </span>
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold rounded-none">
                          {rec.esg_rating}
                        </Badge>
                      </div>

                      {/* Secondary Signals (Reliability & Risk) */}
                      {(rec.reliability_score || rec.risk_level) && (
                        <div className="flex justify-between items-center py-1 border-b border-border/40 text-[11px]">
                          <span className="text-muted-foreground">Reliability / Risk:</span>
                          <div className="flex items-center gap-2">
                            {rec.reliability_score && (
                              <span className="font-mono font-semibold text-foreground">
                                {rec.reliability_score}%
                              </span>
                            )}
                            {rec.risk_level && (
                              <Badge className={`rounded-none text-[9px] ${
                                rec.risk_level === "LOW"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : rec.risk_level === "MEDIUM"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                              }`}>
                                {rec.risk_level}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* AI Justification Box */}
                      <div className="bg-muted/40 border border-border rounded-none p-3 text-[11px] text-muted-foreground leading-relaxed mt-2 break-words">
                        <span className="font-semibold text-foreground block mb-1">AI Analysis &amp; Sourcing Rationale:</span>
                        <p className="leading-normal break-words">{rec.recommendation_reason}</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleApproveSupplier(rec)}
                      disabled={isApproving !== null}
                      className={`w-full text-xs font-semibold h-9 shadow-xs flex items-center justify-center gap-1.5 rounded-none cursor-pointer ${
                        isTopPick
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-foreground hover:bg-foreground/90 text-background"
                      }`}
                    >
                      {isApproving === rec.supplier_id ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Issuing Purchase Order...</span>
                        </>
                      ) : (
                        <>
                          <span>Award PO &amp; Dispatch</span>
                          <ArrowRight className="size-3.5" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      </motion.div>
    </AppShell>
  );
}

export function SuppliersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-xs font-mono">Loading supplier intelligence...</div>}>
      <SuppliersPageContent />
    </Suspense>
  );
}

export default SuppliersPage;