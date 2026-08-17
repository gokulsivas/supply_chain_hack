import React from "react";
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import { PurchaseOrderResponse } from "@/types/procurement";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, Building2, Package, Truck, Info, ExternalLink, AlertTriangle } from "lucide-react";

interface PODetailDrawerProps {
  order: PurchaseOrderResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Safely format a date string, returning a fallback if invalid. */
function safeDateFormat(dateStr: string | null | undefined, fmt: string, fallback = "—"): string {
  if (!dateStr) return fallback;
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : fallback;
  } catch {
    return fallback;
  }
}

/** Safely format currency, returning "—" if missing. */
function safeAmount(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return "$" + amount.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export function PODetailDrawer({ order, isOpen, onClose }: PODetailDrawerProps) {
  if (!order) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <SheetTitle className="text-2xl">{order.po_code ?? "—"}</SheetTitle>
              <SheetDescription>
                Created on {safeDateFormat(order.created_at, "PPP")}
              </SheetDescription>
            </div>
            <StatusBadge
              status={order.status === "ISSUED" ? "success" : "neutral"}
              label={order.status ?? "UNKNOWN"}
            />
          </div>
        </SheetHeader>

        <div className="space-y-8">
          {/* Supplier Info */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Supplier Details</h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
              {order.supplier ? (
                <div>
                  <p className="font-semibold text-slate-900">{order.supplier.name}</p>
                  <p className="text-sm text-slate-600">{order.supplier.supplier_code}</p>
                  <p className="text-sm text-slate-600 mt-1">{order.supplier.city ?? "—"}</p>
                  {order.recommendation_score != null && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                      <Info className="w-3.5 h-3.5" />
                      Recommendation Score: {order.recommendation_score.toFixed(1)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-sm font-medium">Supplier information unavailable for this order.</p>
                </div>
              )}
            </div>
          </section>

          {/* Logistics & Delivery */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Logistics &amp; Delivery</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Delivery Location</p>
                  <p className="text-slate-900">{order.delivery_location ?? "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Expected Delivery</p>
                  <p className="text-slate-900">{safeDateFormat(order.expected_delivery_date, "PPP")}</p>
                </div>
              </div>

              {order.shipment && (
                <div className="flex items-start gap-3 pt-2">
                  <Package className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Linked Shipment</p>
                    <p className="text-slate-900 font-medium">{order.shipment.shipment_code ?? "—"}</p>
                  </div>
                </div>
              )}

              {order.truck ? (
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="w-full">
                    <p className="text-sm font-medium text-slate-500">Assigned Truck</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-slate-900 font-medium">{order.truck.truck_code ?? "—"}</p>
                      <StatusBadge
                        status={order.truck.status === "ASSIGNED" ? "info" : "neutral"}
                        label={order.truck.status ?? "UNKNOWN"}
                      />
                    </div>
                    {order.truck.truck_code && (
                      <Link href={`/logistics/tracking?query=${order.truck.truck_code}`} className="block mt-3">
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          Track Shipment <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Assigned Truck</p>
                    <p className="text-slate-400 italic">Pending assignment</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Line Items */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Order Items</h3>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-slate-900">{item.product?.name ?? "Unknown Product"}</p>
                      <p className="text-sm text-slate-500">
                        {item.quantity != null ? item.quantity : "?"} × {safeAmount(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-bold text-slate-900">{safeAmount(item.line_total)}</p>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-slate-200">
                  <span className="font-bold text-slate-900">Total Amount</span>
                  <span className="font-bold text-xl text-primary">{safeAmount(order.total_amount)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No line items available.</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
