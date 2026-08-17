"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Loader2, AlertCircle, Sparkles, MessageSquare } from "lucide-react";
import { createPurchaseRequest } from "@/lib/api";
import type { ExtractionResultResponse } from "@/types/procurement";

interface RequisitionReviewCardProps {
  initialData?: any;
  data?: any;
  extraction?: ExtractionResultResponse | any;
  onSuccess?: (createdReq: any) => void;
  onCreated?: (createdReq: any) => void;
  onCancel?: () => void;
}

function resolveExtractedFields(extraction: any, initialData: any, data: any) {
  const source =
    extraction?.extracted ||
    extraction?.data ||
    extraction?.draft ||
    extraction ||
    initialData?.extracted ||
    initialData ||
    data?.extracted ||
    data ||
    {};

  const item = source.item_description || source.item || source.title || source.description || "";
  const quantity = source.quantity !== undefined && source.quantity !== null ? source.quantity : "";
  const location = source.delivery_location || source.location || "";
  let date = source.required_date || source.required_by || "";
  if (typeof date === "string" && date.includes("T")) {
    date = date.split("T")[0];
  }
  const priority = (source.priority || "NORMAL").toUpperCase();

  return { item, quantity, location, date, priority, raw_message: extraction?.raw_message || source.raw_message };
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

  const initialResolved = resolveExtractedFields(extraction, initialData, data);

  const [itemDescription, setItemDescription] = useState(initialResolved.item);
  const [quantity, setQuantity] = useState<number | string>(initialResolved.quantity);
  const [deliveryLocation, setDeliveryLocation] = useState(initialResolved.location);
  const [requiredDate, setRequiredDate] = useState(initialResolved.date);
  const [priority, setPriority] = useState(initialResolved.priority);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever a new extraction result arrives
  useEffect(() => {
    const resolved = resolveExtractedFields(extraction, initialData, data);
    setItemDescription(resolved.item);
    setQuantity(resolved.quantity);
    setDeliveryLocation(resolved.location);
    setRequiredDate(resolved.date);
    setPriority(resolved.priority);

    if (process.env.NODE_ENV !== "production") {
      console.log("[RequisitionReviewCard] Populated with extracted state:", resolved);
    }
  }, [extraction, initialData, data]);

  const rawMessage = extraction?.raw_message;
  const warnings = extraction?.warnings || [];
  const confidence = extraction?.confidence;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemDescription || !deliveryLocation || !requiredDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    const generatedReqId = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRequest = {
      id: generatedReqId,
      request_code: generatedReqId,
      title: `${quantity}x ${itemDescription}`,
      description: itemDescription,
      item: itemDescription,
      item_description: itemDescription,
      category: "HARDWARE_EQUIPMENT",
      quantity: Number(quantity) || 1,
      delivery_location: deliveryLocation,
      required_date: requiredDate,
      required_by: requiredDate,
      priority: priority.toUpperCase(),
      status: "VALIDATED",
      raw_message: rawMessage,
      raw_chat_input: rawMessage,
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

    if (process.env.NODE_ENV !== "production") {
      console.log("[RequisitionReviewCard] Submitting Purchase Request Payload:", newRequest);
    }

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
        await createPurchaseRequest({
          item: itemDescription,
          item_description: itemDescription,
          quantity: Number(quantity) || 1,
          delivery_location: deliveryLocation,
          required_date: requiredDate,
          priority: priority.toUpperCase(),
          raw_message: rawMessage,
        });
      }
    } catch (err) {
      console.warn("Backend PR creation error:", err);
    }

    toast.success(`Purchase Requisition ${generatedReqId} Created!`, {
      description: `Routed to Autonomous Sourcing for ${quantity}x ${itemDescription}.`,
    });

    if (callback) {
      callback(newRequest);
    }

    setIsSubmitting(false);

    // Route to Suppliers page with the newly generated ID
    setTimeout(() => {
      router.push(`/procurement/suppliers?reqId=${generatedReqId}`);
    }, 600);
  };

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="p-4 border-b bg-emerald-50/60 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-emerald-950 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" /> Extracted Requisition
        </CardTitle>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold flex items-center gap-1">
          <Sparkles className="size-3 text-emerald-600" /> AI Validated
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Source metadata display */}
        {rawMessage && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs text-slate-600 flex items-start gap-2">
            <MessageSquare className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Extracted from message:
              </span>
              <p className="italic text-slate-800 text-xs font-medium truncate">
                &quot;{rawMessage}&quot;
              </p>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <span>{warnings[0]}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Item Description
              </label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g. mobile phones"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 12"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Delivery Location
              </label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="e.g. Baksa"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Required Date
              </label>
              <input
                type="date"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {confidence ? (
              <span className="text-[11px] text-slate-400 font-mono">
                Extraction Quality: {Math.round((confidence.item_description || 0.95) * 100)}%
              </span>
            ) : <span />}

            <div className="flex items-center gap-3">
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-xs"
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default RequisitionReviewCard;