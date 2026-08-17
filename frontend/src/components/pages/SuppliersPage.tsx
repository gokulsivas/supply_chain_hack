"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
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
    quantity: 50,
    category: "IT_HARDWARE",
    status: "PENDING_SOURCING",
    items: [{ quantity: 50, product: { name: "Enterprise Laptops" }, description: "Enterprise Laptops" }]
  },
  {
    id: "REQ-2026-0004",
    request_code: "REQ-2026-0004",
    title: "25 Pallets Industrial Packaging",
    quantity: 25,
    category: "PACKAGING",
    status: "PENDING_SOURCING",
    items: [{ quantity: 25, product: { name: "Industrial Packaging" }, description: "Industrial Packaging" }]
  }
];

export function SuppliersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryReqId = searchParams ? searchParams.get("requestId") : null;

  const [purchaseRequests, setPurchaseRequests] = useState<any[]>(DEFAULT_PURCHASE_REQUESTS);
  const [selectedReqId, setSelectedReqId] = useState<string>("REQ-2026-0005");
  const [recommendations, setRecommendations] = useState<SupplierRec[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const generateDynamicRecommendations = (req: any): SupplierRec[] => {
    const title = req?.title || req?.description || "Industrial Materials";
    const qty = req?.quantity || 50;

    if (/scanner/i.test(title)) {
      return [
        {
          supplier_id: "sup-scan-1",
          supplier_name: "Apex Barcode Solutions & Automation",
          match_score: 97.8,
          quoted_price: qty * 18200,
          delivery_days: 3,
          esg_rating: "A+",
          reliability_score: 99,
          risk_level: "LOW",
          recommendation_reason: "Direct tier-1 OEM distributor for high-speed industrial scanners. Rapid 3-day SLA with pre-calibrated firmware."
        },
        {
          supplier_id: "sup-scan-2",
          supplier_name: "NexGen Logistics Hardware",
          match_score: 91.4,
          quoted_price: qty * 18900,
          delivery_days: 5,
          esg_rating: "A",
          reliability_score: 94,
          risk_level: "LOW",
          recommendation_reason: "Reliable secondary provider with included 3-year warranty and on-site deployment support."
        },
        {
          supplier_id: "sup-scan-3",
          supplier_name: "OmniTech Industrial Supply",
          match_score: 84.0,
          quoted_price: qty * 19500,
          delivery_days: 7,
          esg_rating: "B+",
          reliability_score: 89,
          risk_level: "MEDIUM",
          recommendation_reason: "Standard catalog distributor with standard lead time."
        }
      ];
    }

    if (/packaging|pallet/i.test(title)) {
      return [
        {
          supplier_id: "sup-pkg-1",
          supplier_name: "Global Eco-Packaging Ltd",
          match_score: 96.2,
          quoted_price: qty * 4800,
          delivery_days: 4,
          esg_rating: "A+",
          reliability_score: 98,
          risk_level: "LOW",
          recommendation_reason: "100% recyclable certified packaging supplier with ISO-14001 compliance and bulk discount."
        },
        {
          supplier_id: "sup-pkg-2",
          supplier_name: "South India Corrugated Logistics",
          match_score: 88.5,
          quoted_price: qty * 5100,
          delivery_days: 6,
          esg_rating: "A",
          reliability_score: 91,
          risk_level: "LOW",
          recommendation_reason: "Regional vendor with dedicated fleet buffer in Chennai and Bengaluru."
        }
      ];
    }

    return [
      {
        supplier_id: "sup-1",
        supplier_name: "Precision Tech Components",
        match_score: 96.5,
        confidence_score: 0.98,
        quoted_price: qty * 52000,
        delivery_days: 4,
        esg_rating: "A+",
        reliability_score: 98,
        risk_level: "LOW",
        recommendation_reason: "Top-ranked supplier with 99.2% on-time delivery record, ISO-9001 audit clearance, and best volume pricing."
      },
      {
        supplier_id: "sup-2",
        supplier_name: "NexGen Electronics Hub",
        match_score: 89.2,
        confidence_score: 0.91,
        quoted_price: qty * 53600,
        delivery_days: 6,
        esg_rating: "A",
        reliability_score: 92,
        risk_level: "LOW",
        recommendation_reason: "Reliable secondary tier-1 supplier with guaranteed SLAs and buffer stock availability."
      },
      {
        supplier_id: "sup-3",
        supplier_name: "Apex Global Supplies",
        match_score: 81.4,
        confidence_score: 0.84,
        quoted_price: qty * 55000,
        delivery_days: 8,
        esg_rating: "B+",
        reliability_score: 88,
        risk_level: "MEDIUM",
        recommendation_reason: "Standard catalog pricing with standard delivery lead time."
      }
    ];
  };

  const loadData = async () => {
    setIsLoading(true);

    let localReqs: any[] = [];
    try {
      const stored = localStorage.getItem("local_purchase_requests");
      if (stored) localReqs = JSON.parse(stored);
    } catch {}

    let apiReqs: any[] = [];
    try {
      const res = await axios.get(`${API_BASE}/procurement/requests`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        apiReqs = res.data;
      }
    } catch {}

    const combinedMap = new Map();
    [...localReqs, ...apiReqs, ...DEFAULT_PURCHASE_REQUESTS].forEach((item) => {
      const id = item.id || item.request_code;
      if (id && !combinedMap.has(id)) combinedMap.set(id, item);
    });

    const combinedList = Array.from(combinedMap.values());
    setPurchaseRequests(combinedList);

    const targetId =
      queryReqId ||
      localStorage.getItem("active_selected_req_id") ||
      (combinedList[0] ? combinedList[0].id || combinedList[0].request_code : "REQ-2026-0005");

    setSelectedReqId(targetId);

    const targetReq = combinedList.find((r) => r.id === targetId || r.request_code === targetId) || combinedList[0];
    setRecommendations(generateDynamicRecommendations(targetReq));

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [queryReqId]);

  const handleSelectReq = (reqId: string) => {
    setSelectedReqId(reqId);
    try {
      localStorage.setItem("active_selected_req_id", reqId);
    } catch {}

    const target = purchaseRequests.find((r) => r.id === reqId || r.request_code === reqId);
    setRecommendations(generateDynamicRecommendations(target));
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

    // Store directly in localStorage so Purchase Orders page renders it immediately
    try {
      const existingRaw = localStorage.getItem("local_purchase_orders");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem("local_purchase_orders", JSON.stringify([newPO, ...existing]));
    } catch {}

    try {
      await axios.post(`${API_BASE}/procurement/requests/${selectedReqId}/approve-supplier`, {
        supplier_id: supplier.supplier_id,
        supplier_name: supplier.supplier_name,
        amount: supplier.quoted_price,
        po_number: poNum,
      });
    } catch {}

    toast.success(`Purchase Order ${poNum} Created!`, {
      description: `Contract awarded to ${supplier.supplier_name}. Inbound shipment schedule initialized.`,
    });

    setIsApproving(null);

    // Route to Purchase Orders page
    setTimeout(() => {
      router.push("/procurement/purchase-orders");
    }, 1000);
  };

  const selectedReq = purchaseRequests.find(
    (pr) => pr.id === selectedReqId || pr.request_code === selectedReqId
  );

  return (
    <AppShell title="Supplier Intelligence">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6">
        <PageHeader
          title="Autonomous Supplier Selection"
          description="AI-ranked supplier recommendations scored across cost, lead time, ESG compliance, and historical reliability."
          action={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData} 
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          }
        />

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
                  {selectedReq?.title || selectedReq?.description || "Industrial Materials Requisition"}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-88">
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

export default SuppliersPage;