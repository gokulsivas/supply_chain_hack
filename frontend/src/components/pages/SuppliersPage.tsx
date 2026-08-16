"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SupplierList } from "@/components/procurement/SupplierList";
import { 
  listPurchaseRequests, 
  getPurchaseRequestSupplierRecommendations, 
  approveSupplier 
} from "@/lib/api";
import { PurchaseRequest, SupplierRecommendation } from "@/types/procurement";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Info, Truck, FileCheck, Loader2, Sparkles, ArrowRight, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SuppliersPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  const [recommendations, setRecommendations] = useState<SupplierRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState<Error | null>(null);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [successData, setSuccessData] = useState<{
    po_code: string;
    shipment_code: string;
    truck_code: string;
  } | null>(null);

  useEffect(() => {
    async function loadRequests() {
      try {
        const allRequests = await listPurchaseRequests();
        const pendingRequests = allRequests.filter(r => r.status === "VALIDATED" || r.status === "APPROVED");
        setRequests(pendingRequests);
      } catch {
        toast.error("Failed to load pending purchase requests");
      }
    }
    loadRequests();
  }, []);

  useEffect(() => {
    if (!selectedRequestId) {
      setRecommendations([]);
      setSelectedSupplierId(null);
      setSuccessData(null);
      return;
    }

    async function loadRecommendations() {
      setIsLoadingRecs(true);
      setRecsError(null);
      setSuccessData(null);
      try {
        const data = await getPurchaseRequestSupplierRecommendations(selectedRequestId!);
        setRecommendations(data.recommendations);
        
        const topRec = data.recommendations.find(r => r.is_recommended);
        if (topRec) {
          setSelectedSupplierId(topRec.supplier.id);
        } else if (data.recommendations.length > 0) {
          setSelectedSupplierId(data.recommendations[0].supplier.id);
        }
      } catch (err) {
        setRecsError(err instanceof Error ? err : new Error("Failed to load recommendations"));
      } finally {
        setIsLoadingRecs(false);
      }
    }
    loadRecommendations();
  }, [selectedRequestId]);

  const handleApprove = async () => {
    if (!selectedRequestId || !selectedSupplierId) return;
    
    setIsApproving(true);
    try {
      const po = await approveSupplier(selectedRequestId, selectedSupplierId);
      setShowConfirm(false);
      
      setSuccessData({
        po_code: po.po_code,
        shipment_code: po.shipment?.shipment_code || "Pending",
        truck_code: po.truck?.truck_code || "Pending",
      });
      
      toast.success(`Purchase Order ${po.po_code} generated and dispatched!`);
      setRequests(prev => prev.filter(r => r.id !== selectedRequestId));
    } catch (err) {
      setShowConfirm(false);
      const isConflict = err instanceof Error && "status" in err && (err as { status: number }).status === 409;
      if (isConflict) {
        toast.error("A Purchase Order has already been issued for this request.");
      } else {
        toast.error(err instanceof Error && "detail" in err ? (err as { detail: string }).detail : "Failed to approve supplier");
      }
    } finally {
      setIsApproving(false);
    }
  };

  const selectedPr = requests.find(r => r.id === selectedRequestId);
  const selectedSupplier = recommendations.find(r => r.supplier.id === selectedSupplierId);

  return (
    <AppShell title="Supplier Recommendations">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        <PageHeader 
          title="Autonomous Supplier Selection & Allocation"
          description="Multi-factor optimization balancing unit price, lead time, historical reliability, and capacity."
        />

        {successData ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="flex justify-center">
              <div className="bg-emerald-100 p-4 rounded-full">
                <FileCheck className="w-10 h-10 text-emerald-700" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-950 mb-2">Purchase Order Generated & Dispatched</h2>
              <p className="text-emerald-800">
                Touchless PO <strong className="text-emerald-950 font-mono">{successData.po_code}</strong> has been created with automated shipment scheduling.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
              <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                <span className="text-slate-500">Shipment Code:</span> <span className="font-mono font-semibold text-slate-900">{successData.shipment_code}</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                <span className="text-slate-500">Linked Truck:</span> <span className="font-mono font-semibold text-slate-900">{successData.truck_code}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/logistics/tracking?query=${successData.truck_code}`}>
                <Button className="w-full sm:w-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                  <Truck className="w-4 h-4" /> Live Tracking Simulation
                </Button>
              </Link>
              <Link href="/procurement/purchase-orders">
                <Button variant="outline" className="w-full sm:w-auto">
                  View All Purchase Orders
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Select Pending Purchase Request</label>
                <Select value={selectedRequestId || ""} onValueChange={(val) => setSelectedRequestId(val)}>
                  <SelectTrigger className="w-full md:w-2/3">
                    <SelectValue placeholder="Choose a pending validated request..." />
                  </SelectTrigger>
                  <SelectContent>
                    {requests.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500 text-center">No pending purchase requests found</div>
                    ) : (
                      requests.map(pr => (
                        <SelectItem key={pr.id} value={pr.id}>
                          <span className="font-mono font-medium text-slate-900 mr-2">{pr.request_code}</span>
                          <span className="text-slate-500">
                            ({pr.items[0]?.quantity}x {pr.items[0]?.product?.name || "Item"})
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedPr && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-wrap gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span><strong>Item:</strong> {selectedPr.items[0]?.product?.name}</span>
                  </div>
                  <div><strong>Requested Qty:</strong> {selectedPr.items[0]?.quantity} units</div>
                  <div><strong>Destination:</strong> {selectedPr.delivery_location || "Central DC"}</div>
                  <div><strong>Priority:</strong> {selectedPr.priority}</div>
                </div>
              )}
            </div>

            {selectedRequestId && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-slate-900">Ranked Sourcing Recommendations</h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full border border-blue-100">
                    <Info className="w-3.5 h-3.5" />
                    <span>Cost (30%) • Quality (25%) • Delivery (20%) • Capacity (15%) • Lead Time (10%)</span>
                  </div>
                </div>

                <SupplierList 
                  recommendations={recommendations}
                  selectedSupplierId={selectedSupplierId}
                  onSelectSupplier={setSelectedSupplierId}
                  isLoading={isLoadingRecs}
                  error={recsError}
                />

                {recommendations.length > 0 && (
                  <div className="pt-6 border-t flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Selecting a supplier automatically creates an official PO and coordinates logistics.
                    </p>
                    <Button 
                      size="lg" 
                      onClick={() => setShowConfirm(true)}
                      disabled={!selectedSupplierId || isApproving}
                      className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                    >
                      {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Approve & Auto-Generate PO
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Autonomous PO Generation</DialogTitle>
            <DialogDescription>
              Are you ready to award this purchase request to <strong>{selectedSupplier?.supplier.name}</strong>? 
              This will automatically issue the PO, assign carrier capacity, and generate a shipment tracker ID.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isApproving}>Cancel</Button>
            <Button onClick={handleApprove} disabled={isApproving} className="bg-blue-600 hover:bg-blue-700">
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm & Issue PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}