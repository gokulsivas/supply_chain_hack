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
import { Info, Truck, FileCheck, Loader2 } from "lucide-react";
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

  // Initial fetch of pending PRs
  useEffect(() => {
    async function loadRequests() {
      try {
        const allRequests = await listPurchaseRequests();
        const pendingRequests = allRequests.filter(r => r.status === "VALIDATED" || r.status === "APPROVED");
        setRequests(pendingRequests);
      } catch (err) {
        toast.error("Failed to load purchase requests");
      }
    }
    loadRequests();
  }, []);

  // Fetch recommendations when a PR is selected
  useEffect(() => {
    if (!selectedRequestId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        
        // Auto-select the top recommendation (is_recommended === true)
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
      
      toast.success(`Purchase Order ${po.po_code} generated successfully!`);
      
      // Update PR list to remove approved one if it was VALIDATED
      setRequests(prev => prev.filter(r => r.id !== selectedRequestId));
      
    } catch (err) {
      setShowConfirm(false);
      const isConflict = err instanceof Error && "status" in err && (err as { status: number }).status === 409;
      if (isConflict) {
        toast.error("A Purchase Order has already been generated for this request.");
      } else {
        toast.error(err instanceof Error && "detail" in err ? (err as { detail: string }).detail : "Failed to approve supplier");
      }
    } finally {
      setIsApproving(false);
    }
  };

  const selectedSupplier = recommendations.find(r => r.supplier.id === selectedSupplierId);

  return (
    <AppShell title="Supplier recommendations">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        <PageHeader 
          title="Supplier recommendations"
          description="Compare eligible suppliers using cost, quality, delivery, capacity, and lead time."
        />

        {successData ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 p-4 rounded-full">
                <FileCheck className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">Order Confirmed!</h2>
              <p className="text-green-800">
                Purchase Order <strong className="text-green-950">{successData.po_code}</strong> has been issued.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
              <div className="bg-white/60 px-4 py-2 rounded-md border border-green-200 shadow-sm">
                <span className="text-slate-500">Shipment:</span> <span className="font-semibold text-slate-900">{successData.shipment_code}</span>
              </div>
              <div className="bg-white/60 px-4 py-2 rounded-md border border-green-200 shadow-sm">
                <span className="text-slate-500">Truck:</span> <span className="font-semibold text-slate-900">{successData.truck_code}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/logistics/tracking?query=${successData.truck_code}`}>
                <Button className="w-full sm:w-auto flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Track Shipment
                </Button>
              </Link>
              <Link href="/procurement/purchase-orders">
                <Button variant="outline" className="w-full sm:w-auto">
                  View all orders
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700 mb-3">Select Purchase Request</label>
              <Select value={selectedRequestId || ""} onValueChange={(val) => setSelectedRequestId(val)}>
                <SelectTrigger className="w-full md:w-2/3 lg:w-1/2">
                  <SelectValue placeholder="Choose a pending request..." />
                </SelectTrigger>
                <SelectContent>
                  {requests.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center">No pending requests found</div>
                  ) : (
                    requests.map(pr => (
                      <SelectItem key={pr.id} value={pr.id}>
                        <span className="font-medium text-slate-900 mr-2">{pr.request_code}</span>
                        <span className="text-slate-500">
                          {pr.items[0]?.quantity}x {pr.items[0]?.product.name || "Unknown"}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedRequestId && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-slate-900">Ranked Suppliers</h2>
                  <div className="flex items-center gap-2 text-xs font-medium bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full border border-blue-100">
                    <Info className="w-3.5 h-3.5" />
                    <span>Weighting: Cost (30%), Quality (25%), Delivery (20%), Capacity (15%), Lead (10%)</span>
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
                  <div className="pt-6 border-t flex justify-end">
                    <Button 
                      size="lg" 
                      onClick={() => setShowConfirm(true)}
                      disabled={!selectedSupplierId || isApproving}
                    >
                      {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Approve supplier and create PO
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
            <DialogTitle>Confirm Supplier Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{selectedSupplier?.supplier.name}</strong>? 
              This action will instantly generate a Purchase Order and dispatch a linked Shipment and Truck.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isApproving}>Cancel</Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm & Generate PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
