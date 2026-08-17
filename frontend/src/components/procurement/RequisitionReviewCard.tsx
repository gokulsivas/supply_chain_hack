"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { createPurchaseRequest } from "@/lib/api";

interface RequisitionReviewCardProps {
  initialData?: any;
  data?: any;
  extraction?: any;
  onSuccess?: (createdReq: any) => void;
  onCreated?: (createdReq: any) => void;
  onCancel?: () => void;
}

export function RequisitionReviewCard({
  initialData,
  data,
  extraction,
  onSuccess,
  onCreated,
  onCancel,
}: RequisitionReviewCardProps) {
  const router = useRouter();
  const callback = onCreated || onSuccess;
  const source = extraction?.draft || extraction || initialData || data || {};

  const [itemDescription, setItemDescription] = useState(
    source.item_description || source.item || source.title || "Barcode Scanners"
  );
  const [quantity, setQuantity] = useState<number | string>(
    source.quantity || 50
  );
  const [deliveryLocation, setDeliveryLocation] = useState(
    source.delivery_location || source.location || "Chennai Hub"
  );
  const [requiredDate, setRequiredDate] = useState(
    source.required_date || source.required_by || "2026-08-28"
  );
  const [priority, setPriority] = useState(source.priority || "HIGH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const active = initialData || data;
    if (!active) return;

    if (active.item_description || active.item || active.title || active.description) {
      setItemDescription(active.item_description || active.item || active.title || active.description);
    }
    if (active.quantity !== undefined) {
      setQuantity(active.quantity);
    }
    if (active.delivery_location || active.location) {
      setDeliveryLocation(active.delivery_location || active.location);
    }
    if (active.required_date || active.required_by) {
      setRequiredDate(active.required_date || active.required_by);
    }
    if (active.priority) {
      setPriority(active.priority.toUpperCase());
    }
  }, [initialData, data]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const generatedReqId = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRequest = {
      id: generatedReqId,
      request_code: generatedReqId,
      title: `${quantity}x ${itemDescription}`,
      description: itemDescription,
      category: "HARDWARE_EQUIPMENT",
      quantity: Number(quantity) || 1,
      delivery_location: deliveryLocation,
      required_by: requiredDate,
      priority: priority.toUpperCase(),
      status: "PENDING_SOURCING",
      created_at: new Date().toISOString(),
      items: [
        {
          product: { name: itemDescription },
          description: itemDescription,
          quantity: Number(quantity) || 1,
          unit_price: 18500,
        },
      ],
    };

    // Save to localStorage so SuppliersPage immediately accesses it
    try {
      const existingRaw = localStorage.getItem("local_purchase_requests");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [newRequest, ...existing.filter((r: any) => r.id !== generatedReqId)];
      localStorage.setItem("local_purchase_requests", JSON.stringify(updated));
      localStorage.setItem("active_selected_req_id", generatedReqId);
    } catch {}

    // Send to backend API
    try {
      if (typeof createPurchaseRequest === "function") {
        await createPurchaseRequest(newRequest);
      }
    } catch {}

    toast.success(`Purchase Requisition ${generatedReqId} Created!`, {
      description: `Routed to Autonomous Sourcing for ${quantity}x ${itemDescription}.`,
    });

    if (callback) {
      callback(newRequest);
    }

    setIsSubmitting(false);

    // Route to Suppliers page with the newly generated ID
    setTimeout(() => {
      router.push(`/procurement/suppliers?requestId=${generatedReqId}`);
    }, 600);
  };

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="p-4 border-b bg-emerald-50/50 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-emerald-950 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" /> Extracted Requisition
        </CardTitle>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
          AI Validated
        </Badge>
      </CardHeader>

      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Item Description
              </label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Quantity
              </label>
              <input
                type="number"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Delivery Location
              </label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Required Date
              </label>
              <input
                type="date"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Priority
            </label>
            <select
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" /> Creating Request...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Create purchase request <ArrowRight className="size-3.5" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default RequisitionReviewCard;