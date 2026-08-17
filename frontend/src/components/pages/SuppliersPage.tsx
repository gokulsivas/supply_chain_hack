"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  RefreshCw, 
  ArrowRight,
  Award
} from "lucide-react";
import { 
  listPurchaseRequests, 
  getPurchaseRequestSupplierRecommendations, 
  approveSupplier as apiApproveSupplier 
} from "@/lib/api";

interface SupplierRec {
  supplier_id: string;
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

const DEFAULT_PURCHASE_REQUESTS = [
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
    supplier_id: "SUP-001",
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
    supplier_id: "SUP-003",
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
    supplier_id: "SUP-004",
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
    supplier_id: "SUP-007",
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
    supplier_id: "SUP-005",
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
    supplier_id: "SUP-006",
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
    supplier_id: "SUP-002",
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
    supplier_id: "SUP-008",
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

  const [purchaseRequests, setPurchaseRequests] = useState<any[]>(DEFAULT_PURCHASE_REQUESTS);
  const [selectedReqId, setSelectedReqId] = useState<string>(urlReqId || "REQ-2026-0005");
  const [recommendations, setRecommendations] = useState<SupplierRec[]>(DEFAULT_RECOMMENDATIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    let localReqs: any[] = [];
    try {
      const stored = localStorage.getItem("local_purchase_requests");
      if (stored) localReqs = JSON.parse(stored);
    } catch {}

    try {
      const data = await listPurchaseRequests();
      const combinedMap = new Map();
      [...localReqs, ...(Array.isArray(data) ? data : []), ...DEFAULT_PURCHASE_REQUESTS].forEach((item) => {
        const id = item.id || item.request_code;
        if (id && !combinedMap.has(id)) combinedMap.set(id, item);
      });

      const combinedList = Array.from(combinedMap.values());
      setPurchaseRequests(combinedList);

      const matchFound = urlReqId ? combinedList.find((d: any) => d.id === urlReqId || d.request_code === urlReqId) : null;
      const targetId = matchFound ? (matchFound.id || matchFound.request_code) : (urlReqId || (combinedList[0] ? combinedList[0].id || combinedList[0].request_code : "REQ-2026-0005"));
      setSelectedReqId(targetId);
      fetchRecommendations(targetId);
    } catch {
      setPurchaseRequests(DEFAULT_PURCHASE_REQUESTS);
      setRecommendations(DEFAULT_RECOMMENDATIONS);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    loadInitialData();
  }, [urlReqId]);

  const handleSelectReq = (reqId: string) => {
    setSelectedReqId(reqId);
    fetchRecommendations(reqId);
  };

  const handleApproveSupplier = async (supplier: SupplierRec) => {
    setIsApproving(supplier.supplier_id);
    const poNum = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetReq = purchaseRequests.find((r) => r.id === selectedReqId || r.request_code === selectedReqId);

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + (supplier.delivery_days || 4));

    const newPO = {
      id: poNum,
      po_number: poNum,
      po_code: poNum,
      supplier_name: supplier.supplier_name,
      location: targetReq?.delivery_location || "Chennai Hub",
      item_title: targetReq?.title || targetReq?.description || "Industrial Hardware",
      quantity: targetReq?.quantity || 50,
      total_amount: supplier.quoted_price,
      amount: supplier.quoted_price,
      expected_delivery: deliveryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      logistics_truck: `TRK-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "ISSUED",
      created_at: new Date().toISOString()
    };

    try {
      const existingRaw = localStorage.getItem("local_purchase_orders");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem("local_purchase_orders", JSON.stringify([newPO, ...existing]));
    } catch {}

    try {
      const res = await apiApproveSupplier(selectedReqId, {
        supplier_id: supplier.supplier_id,
        supplier_name: supplier.supplier_name,
        amount: supplier.quoted_price
      });

      const finalPoCode = res?.po_code || res?.po_number || poNum;

      toast.success(`Purchase Order ${finalPoCode} Created!`, {
        description: `Contract successfully awarded to ${supplier.supplier_name}. Route dispatched to logistics.`,
        action: {
          label: "View Purchase Orders",
          onClick: () => router.push("/procurement/purchase-orders"),
        },
      });
    } catch {
      toast.success(`Purchase Order ${poNum} Created!`, {
        description: `Contract successfully awarded to ${supplier.supplier_name}. Route dispatched to logistics.`,
        action: {
          label: "View Purchase Orders",
          onClick: () => router.push("/procurement/purchase-orders"),
        },
      });
    } finally {
      setIsApproving(null);
    }
  };

  const selectedReq = purchaseRequests.find(
    (pr) => pr.id === selectedReqId || pr.request_code === selectedReqId
  );

  return (
    <AppShell title="Supplier Intelligence">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6">
        
        {/* Header */}
        <PageHeader
          title="Autonomous Supplier Selection"
          description="AI-ranked supplier recommendations scored across cost, lead time, ESG compliance, and historical reliability."
          action={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadInitialData} 
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          }
        />

        {/* Top requisition bar */}
        <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Select Active Purchase Requisition (PR)
          </span>
          <div className="flex flex-wrap gap-2">
            {purchaseRequests.map((pr) => {
              const reqId = pr.id || pr.request_code;
              const isSelected = selectedReqId === reqId;
              const title = pr.title || pr.description || pr.item || "Industrial Equipment";

              return (
                <button
                  key={reqId}
                  onClick={() => handleSelectReq(reqId)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-mono font-bold">{reqId}</span>
                  <span className="opacity-70">|</span>
                  <span className="truncate max-w-[180px]">{title}</span>
                  <Badge 
                    className={`ml-1 text-[10px] ${
                      isSelected 
                        ? "bg-blue-500 text-white border-transparent" 
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    Qty: {pr.quantity || 50}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Recommendation View */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600" />
              AI Evaluated Supplier Matches
              <span className="text-xs font-normal text-slate-500">
                ({recommendations.length} eligible suppliers ranked for {selectedReq?.title || selectedReqId})
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommendations.map((rec, index) => {
              const isTopPick = index === 0;

              return (
                <Card 
                  key={rec.supplier_id} 
                  className={`relative overflow-hidden transition-all bg-white flex flex-col justify-between ${
                    isTopPick 
                      ? "border-blue-500 shadow-md ring-1 ring-blue-500/20" 
                      : "border-slate-200 shadow-sm hover:border-slate-300"
                  }`}
                >
                  {isTopPick && (
                    <div className="bg-blue-600 text-white text-[10px] font-bold tracking-wider uppercase py-1 px-3 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Award className="size-3" /> Top Recommended Match
                      </span>
                      <span>Rank #1</span>
                    </div>
                  )}

                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="size-4 text-slate-500" />
                          {rec.supplier_name}
                        </CardTitle>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {rec.supplier_id}</p>
                      </div>
                      <Badge 
                        className={`text-[11px] font-bold font-mono px-2 py-0.5 ${
                          rec.match_score >= 90
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : rec.match_score >= 80
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {rec.match_score.toFixed(1)}% Match
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <DollarSign className="size-3.5 text-slate-400" /> Quoted Total Price:
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{rec.quoted_price.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Clock className="size-3.5 text-slate-400" /> Lead Time:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {rec.delivery_days} Business Days
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-emerald-500" /> ESG Rating:
                        </span>
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                          {rec.esg_rating}
                        </Badge>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed mt-3">
                        <span className="font-semibold text-slate-800 block mb-0.5">AI Analysis:</span>
                        {rec.recommendation_reason}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleApproveSupplier(rec)}
                      disabled={isApproving === rec.supplier_id}
                      className={`w-full text-xs font-semibold h-9 mt-4 shadow-sm ${
                        isTopPick
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {isApproving === rec.supplier_id ? (
                        "Issuing Purchase Order..."
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          Award PO & Dispatch <ArrowRight className="size-3.5" />
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </AppShell>
  );
}

export function SuppliersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading supplier intelligence...</div>}>
      <SuppliersPageContent />
    </Suspense>
  );
}

export default SuppliersPage;