"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Loader2, AlertCircle, Sparkles, MessageSquare } from "lucide-react";
import { createPurchaseRequest, extractApiError } from "@/lib/api";
import type { ExtractionResultResponse, PurchaseRequest } from "@/types/procurement";

interface RequisitionReviewCardProps {
  initialData?: Record<string, unknown>;
  data?: Record<string, unknown>;
  extraction?: ExtractionResultResponse | Record<string, unknown>;
  onSuccess?: (createdReq: PurchaseRequest) => void;
  onCreated?: (createdReq: PurchaseRequest) => void;
  onCancel?: () => void;
}

function resolveExtractedFields(
  extraction?: ExtractionResultResponse | Record<string, unknown>,
  initialData?: Record<string, unknown>,
  data?: Record<string, unknown>
) {
  const source =
    (extraction as Record<string, unknown>)?.extracted ||
    (extraction as Record<string, unknown>)?.data ||
    (extraction as Record<string, unknown>)?.draft ||
    extraction ||
    initialData?.extracted ||
    initialData ||
    data?.extracted ||
    data ||
    {};

  const src = source as Record<string, unknown>;
  const item = String(src.item_description || src.item || src.title || src.description || "");
  const quantity = src.quantity !== undefined && src.quantity !== null ? Number(src.quantity) || String(src.quantity) : "";
  const location = String(src.delivery_location || src.location || "");
  let date = String(src.required_date || src.required_by || "");
  if (date.includes("T")) {
    date = date.split("T")[0];
  }
  const priority = String(src.priority || "NORMAL").toUpperCase();

  return { item, quantity, location, date, priority, raw_message: String((extraction as Record<string, unknown>)?.raw_message || src.raw_message || "") };
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

  const [prevExtraction, setPrevExtraction] = useState(extraction);
  const [itemDescription, setItemDescription] = useState(initialResolved.item);
  const [quantity, setQuantity] = useState<number | string>(initialResolved.quantity);
  const [deliveryLocation, setDeliveryLocation] = useState(initialResolved.location);
  const [requiredDate, setRequiredDate] = useState(initialResolved.date);
  const [priority, setPriority] = useState(initialResolved.priority);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever a new extraction prop arrives
  if (extraction !== prevExtraction) {
    setPrevExtraction(extraction);
    const resolved = resolveExtractedFields(extraction, initialData, data);
    setItemDescription(resolved.item);
    setQuantity(resolved.quantity);
    setDeliveryLocation(resolved.location);
    setRequiredDate(resolved.date);
    setPriority(resolved.priority);
  }

  const rawMessage = (extraction as Record<string, unknown>)?.raw_message as string | undefined;
  const warnings = ((extraction as Record<string, unknown>)?.warnings as string[]) || [];
  const confidence = (extraction as Record<string, unknown>)?.confidence as Record<string, number> | undefined;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemDescription || !deliveryLocation || !requiredDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Send to backend API
      const createdPR = (await createPurchaseRequest({
        item: itemDescription,
        item_description: itemDescription,
        quantity: Number(quantity) || 1,
        delivery_location: deliveryLocation,
        required_date: requiredDate,
        priority: priority.toUpperCase(),
        raw_message: rawMessage,
      })) as Record<string, unknown>;

      const reqIdentifier = String(createdPR?.id || createdPR?.request_code || "");
      const displayCode = String(createdPR?.request_code || reqIdentifier);

      // Save to localStorage for quick rehydration
      try {
        const existingRaw = localStorage.getItem("local_purchase_requests");
        const existing = existingRaw ? (JSON.parse(existingRaw) as Array<Record<string, unknown>>) : [];
        const updated = [createdPR, ...existing.filter((r) => r.id !== createdPR.id && r.request_code !== createdPR.request_code)];
        localStorage.setItem("local_purchase_requests", JSON.stringify(updated));
        localStorage.setItem("active_selected_req_id", reqIdentifier);
      } catch {}

      toast.success(`Purchase Requisition ${displayCode} Created!`, {
        description: `Routed to Autonomous Sourcing for ${quantity}x ${itemDescription}.`,
      });

      if (callback) {
        callback(createdPR as unknown as PurchaseRequest);
      } else {
        router.push(`/procurement/suppliers?reqId=${encodeURIComponent(reqIdentifier)}`);
      }
    } catch (err: unknown) {
      toast.error(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-border shadow-xs bg-card rounded-none overflow-hidden">
      <CardHeader className="p-4 border-b border-border bg-emerald-500/10 dark:bg-emerald-950/20 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> Extracted Requisition
        </CardTitle>
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 rounded-none">
          <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" /> AI Validated
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Source metadata display */}
        {rawMessage && (
          <div className="bg-muted/40 border border-border rounded-none p-2.5 text-xs text-muted-foreground flex items-start gap-2.5">
            <MessageSquare className="size-3.5 text-muted-foreground/70 mt-0.5 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider block mb-0.5">
                Extracted from message:
              </span>
              <p className="italic text-foreground text-xs font-medium truncate">
                &quot;{rawMessage}&quot;
              </p>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-none p-2.5 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{warnings[0]}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground/90 block mb-1.5">
                Item Description
              </label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-none border border-input bg-background text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-primary disabled:opacity-50 transition-colors"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g. mobile phones"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/90 block mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                className="w-full h-9 px-3 rounded-none border border-input bg-background text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-primary disabled:opacity-50 transition-colors"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 12"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/90 block mb-1.5">
                Delivery Location
              </label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-none border border-input bg-background text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-primary disabled:opacity-50 transition-colors"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="e.g. Baksa"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/90 block mb-1.5">
                Required Date
              </label>
              <input
                type="date"
                className="w-full h-9 px-3 rounded-none border border-input bg-background text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-primary disabled:opacity-50 transition-colors"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/90 block mb-1.5">
              Priority
            </label>
            <select
              className="w-full h-9 px-3 rounded-none border border-input bg-background text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-primary transition-colors cursor-pointer"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            {confidence ? (
              <span className="text-[11px] text-muted-foreground font-mono font-medium">
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
                  className="text-xs h-9 px-3.5 rounded-none cursor-pointer"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 shadow-xs rounded-none cursor-pointer"
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