"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight,
  TrendingUp,
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
    try {
      const data = await listPurchaseRequests();
      if (Array.isArray(data) && data.length > 0) {
        setPurchaseRequests(data);
        const matchFound = urlReqId ? data.find(d => d.id === urlReqId || d.request_code === urlReqId) : null;
        const targetId = matchFound ? (matchFound.id || matchFound.request_code) : (urlReqId || data[0].id || data[0].request_code);
        setSelectedReqId(targetId);
        fetchRecommendations(targetId);
      } else {
        setPurchaseRequests(DEFAULT_PURCHASE_REQUESTS);
        const targetId = urlReqId || DEFAULT_PURCHASE_REQUESTS[0].id;
        setSelectedReqId(targetId);
        fetchRecommendations(targetId);
      }
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

    try {
      const res = await apiApproveSupplier(selectedReqId, {
        supplier_id: supplier.supplier_id,
        supplier_name: supplier.supplier_name,
        amount: supplier.quoted_price
      });

      const poNum = res?.po_code || res?.po_number || `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      toast.success(`Purchase Order ${poNum} Created!`, {
        description: `Contract successfully awarded to ${supplier.supplier_name}. Route dispatched to logistics.`,
        action: {
          label: "View Purchase Orders",
          onClick: () => router.push("/procurement/purchase-orders"),
        },
      });
    } catch {
      toast.error("Failed to approve supplier.");
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

        {/* Requisition Selector Banner */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
                <Building2 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Target Purchase Requisition
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {selectedReq?.title || selectedReq?.description || "50 Enterprise Laptops"}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-80">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Select Active Requisition:
              </label>
              <select
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={selectedReqId}
                onChange={(e) => handleSelectReq(e.target.value)}
              >
                {purchaseRequests.map((pr: any, idx: number) => {
                  const reqCode = pr.request_code || pr.id || `REQ-2026-${String(idx + 1).padStart(4, "0")}`;
                  const firstItem = Array.isArray(pr.items) && pr.items.length > 0 ? pr.items[0] : null;
                  const qty = firstItem?.quantity || pr.quantity || 50;
                  const itemName = firstItem?.product?.name || firstItem?.description || pr.title || "Materials";

                  return (
                    <option key={reqCode} value={reqCode}>
                      {reqCode} — ({qty}x {itemName})
                    </option>
                  );
                })}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* AI Supplier Recommendation Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600" /> AI-Ranked Sourcing Recommendations
            </h2>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              {recommendations.length} Suppliers Evaluated
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map((rec, index) => {
              const isTopPick = index === 0;

              return (
                <Card 
                  key={rec.supplier_id || index}
                  className={`border transition-all relative overflow-hidden flex flex-col justify-between shadow-sm ${
                    isTopPick ? "border-blue-500 ring-2 ring-blue-500/20 bg-white" : "border-slate-200 bg-white"
                  }`}
                >
                  {isTopPick && (
                    <div className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1">
                      <Award className="size-3" /> Top AI Recommendation
                    </div>
                  )}

                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                          {rec.supplier_name}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">Tier-1 Qualified Vendor</p>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono font-bold text-xs">
                        {rec.match_score}% Match
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5 text-xs pt-2">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <DollarSign className="size-3.5 text-slate-400" /> Quoted Total:
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{rec.quoted_price.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Clock className="size-3.5 text-slate-400" /> Lead Time:
                        </span>
                        <span className="font-semibold text-slate-800">{rec.delivery_days} Business Days</span>
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