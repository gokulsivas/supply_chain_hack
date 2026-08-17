"use client";

import React from "react";
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, Building2, Package, Truck, Info, ExternalLink, AlertTriangle } from "lucide-react";

interface PODetailDrawerProps {
  order: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Safely format a date string, returning a fallback if invalid. */
function safeDateFormat(dateStr: unknown, fmt: string, fallback = "—"): string {
  if (!dateStr || typeof dateStr !== "string") return fallback;
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : fallback;
  } catch {
    return fallback;
  }
}

/** Safely format currency in INR with safe fallback */
function safeAmount(amount: unknown): string {
  if (amount == null || amount === "") return "—";
  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) return "—";
  return "₹" + num.toLocaleString("en-IN");
}

function getStatusVariant(statusStr?: string): StatusVariant {
  const upper = (statusStr || "").toUpperCase();
  if (upper === "ISSUED" || upper === "APPROVED" || upper === "DELIVERED" || upper === "PAID") return "success";
  if (upper === "PENDING" || upper === "PENDING_SOURCING" || upper === "IN_REVIEW") return "warning";
  if (upper === "CANCELLED" || upper === "REJECTED" || upper === "FAILED") return "critical";
  if (upper === "IN_TRANSIT" || upper === "PROCESSING") return "info";
  return "neutral";
}

export function PODetailDrawer({ order, isOpen, onClose }: PODetailDrawerProps) {
  if (!order) return null;

  const poCode = (order.po_code as string) || (order.po_number as string) || (order.id as string) || "PO Details";
  const statusStr = (order.status as string) || "ISSUED";
  const statusVariant = getStatusVariant(statusStr);

  const supplierObj = typeof order.supplier === "object" && order.supplier !== null ? (order.supplier as Record<string, unknown>) : null;
  const supplierName =
    (supplierObj?.name as string) ||
    (order.supplier_name as string) ||
    (typeof order.supplier === "string" ? order.supplier : null);
  const supplierCode = (supplierObj?.supplier_code as string) || (order.supplier_code as string);
  const supplierCity = (supplierObj?.city as string) || (order.supplier_city as string);

  const location = (order.delivery_location as string) || (order.location as string) || "—";
  const deliveryDate = (order.expected_delivery_date as string) || (order.expected_delivery as string);

  const truckObj = typeof order.truck === "object" && order.truck !== null ? (order.truck as Record<string, unknown>) : null;
  const truckCode =
    (truckObj?.truck_code as string) ||
    (order.logistics_truck as string) ||
    (order.truck_id as string);

  const shipmentObj = typeof order.shipment === "object" && order.shipment !== null ? (order.shipment as Record<string, unknown>) : null;
  const shipmentCode = (shipmentObj?.shipment_code as string) || null;

  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto bg-card border-l border-border p-6">
        <SheetHeader className="mb-6">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <SheetTitle className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
                {poCode}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Issued order telematics and settlement record
              </SheetDescription>
            </div>
            <StatusBadge
              status={statusVariant}
              label={statusStr.replace("_", " ")}
              className="text-[10px] uppercase font-bold py-0.5 px-2 shrink-0 tracking-wider"
            />
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Supplier Info */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Supplier Details
            </h3>
            <div className="bg-muted/40 p-4 rounded-none border border-border flex items-start gap-3">
              <Building2 className="size-4 text-primary mt-0.5 shrink-0" />
              {supplierName ? (
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm">{supplierName}</p>
                  {supplierCode && <p className="text-xs font-mono text-muted-foreground mt-0.5">{supplierCode}</p>}
                  {supplierCity && <p className="text-xs text-muted-foreground mt-0.5">{supplierCity}</p>}
                  {order.recommendation_score != null && (
                    <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-none border border-primary/20">
                      <Info className="size-3" />
                      AI Score: {Number(order.recommendation_score).toFixed(1)}/100
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                  <p className="text-xs font-medium">Supplier information unavailable for this order.</p>
                </div>
              )}
            </div>
          </section>

          {/* Logistics & Delivery */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Logistics &amp; Fulfillment
            </h3>
            <div className="bg-muted/40 p-4 rounded-none border border-border space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Delivery Destination</p>
                  <p className="text-foreground font-semibold mt-0.5">{location}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Expected Arrival</p>
                  <p className="text-foreground font-semibold mt-0.5">{safeDateFormat(deliveryDate, "PPP")}</p>
                </div>
              </div>

              {shipmentCode && (
                <div className="flex items-start gap-2.5 pt-2 border-t border-border">
                  <Package className="size-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Linked Shipment</p>
                    <p className="text-foreground font-mono font-semibold mt-0.5">
                      {shipmentCode}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5 pt-2 border-t border-border">
                <Truck className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">Assigned Fleet Vehicle</p>
                  {truckCode ? (
                    <div className="mt-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-foreground text-sm">{truckCode}</span>
                        <StatusBadge status="info" label="IN TRANSIT" className="text-[10px] py-0 px-1.5 font-bold" />
                      </div>
                      <Link href={`/logistics/tracking?query=${encodeURIComponent(truckCode)}`} className="block mt-1">
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 h-8 rounded-none cursor-pointer">
                          Track Live Corridor <ExternalLink className="size-3" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic mt-0.5">Pending fleet allocation</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <Separator className="border-border/60" />

          {/* Line Items & Totals */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Financial Summary
            </h3>
            {items.length > 0 && (
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const productObj = typeof item.product === "object" && item.product !== null ? (item.product as Record<string, unknown>) : null;
                  const productName = (productObj?.name as string) || (item.item_title as string) || `Procured Item #${idx + 1}`;
                  const key = (item.id as string) || `item-${idx}`;

                  return (
                    <div key={key} className="flex justify-between items-start text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-foreground">{productName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.quantity != null ? String(item.quantity) : "1"} × {safeAmount(item.unit_price || item.price)}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-foreground">{safeAmount(item.line_total || item.total)}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t-2 border-border/80">
              <span className="font-semibold text-foreground text-sm">Contract Total</span>
              <span className="font-mono font-extrabold text-xl text-primary">
                {safeAmount(order.total_amount ?? order.amount)}
              </span>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default PODetailDrawer;
