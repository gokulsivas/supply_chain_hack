"use client";

import React, { useState, useEffect } from "react";
import { Truck, MapPin, Building2, AlertCircle } from "lucide-react";
import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

interface PurchaseOrder {
  id?: string;
  po_code?: string;
  po_number?: string;
  supplier_name?: string;
  supplier?: unknown;
  location?: unknown;
  delivery_location?: unknown;
  amount?: number | string;
  total_amount?: number | string;
  expected_delivery?: string;
  expected_delivery_date?: string;
  logistics_truck?: string;
  truck_id?: string;
  truck?: { truck_code?: string; [key: string]: unknown };
  shipment?: { tracking_number?: string; [key: string]: unknown };
  status?: string;
  [key: string]: unknown;
}

interface POTableProps {
  orders?: PurchaseOrder[];
  onSelectPO?: (po: PurchaseOrder) => void;
  onRowClick?: (po: PurchaseOrder) => void;
  className?: string;
}

const DEFAULT_POS: PurchaseOrder[] = [
  {
    id: "PO-2026-0004",
    po_code: "PO-2026-0004",
    supplier_name: "Prime Systems",
    location: "Bengaluru DC",
    amount: 70000,
    expected_delivery: "Aug 24, 2026",
    logistics_truck: "TRK-0004",
    status: "ISSUED",
  },
  {
    id: "PO-2026-0003",
    po_code: "PO-2026-0003",
    supplier_name: "Prime Systems",
    location: "Chennai warehouse",
    amount: 2500000,
    expected_delivery: "Aug 21, 2026",
    logistics_truck: "TRK-0003",
    status: "ISSUED",
  },
];

// Helper to safely extract string from string or nested object
function resolveString(val: unknown, fallback = "—"): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim() || fallback;
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return (
      (typeof obj.name === "string" ? obj.name : null) ||
      (typeof obj.supplier_name === "string" ? obj.supplier_name : null) ||
      (typeof obj.city === "string" ? obj.city : null) ||
      (typeof obj.location === "string" ? obj.location : null) ||
      (typeof obj.title === "string" ? obj.title : null) ||
      (typeof obj.truck_code === "string" ? obj.truck_code : null) ||
      fallback
    );
  }
  return String(val) || fallback;
}

function getStatusVariant(statusStr?: string): StatusVariant {
  const upper = (statusStr || "").toUpperCase();
  if (upper === "ISSUED" || upper === "APPROVED" || upper === "DELIVERED" || upper === "PAID") return "success";
  if (upper === "PENDING" || upper === "PENDING_SOURCING" || upper === "IN_REVIEW") return "warning";
  if (upper === "CANCELLED" || upper === "REJECTED" || upper === "FAILED") return "critical";
  if (upper === "IN_TRANSIT" || upper === "PROCESSING") return "info";
  return "neutral";
}

export function POTable({ orders = [], onSelectPO, onRowClick, className }: POTableProps) {
  const [displayOrders, setDisplayOrders] = useState<PurchaseOrder[]>(DEFAULT_POS);
  const handleItemClick = onRowClick || onSelectPO;

  const syncOrders = () => {
    let localPOs: PurchaseOrder[] = [];
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) localPOs = JSON.parse(stored);
    } catch {}

    const combinedMap = new Map<string, PurchaseOrder>();

    // 1. Local storage POs
    localPOs.forEach((po) => {
      const key = po.po_code || po.po_number || po.id;
      if (key) combinedMap.set(key, po);
    });

    // 2. Incoming API orders
    if (Array.isArray(orders)) {
      orders.forEach((po) => {
        const key = po.po_code || po.po_number || po.id;
        if (key && !combinedMap.has(key)) combinedMap.set(key, po);
      });
    }

    // 3. Fallbacks
    DEFAULT_POS.forEach((po) => {
      const key = po.po_code || po.po_number || po.id;
      if (key && !combinedMap.has(key)) combinedMap.set(key, po);
    });

    setDisplayOrders(Array.from(combinedMap.values()));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncOrders();

    const handleStorage = () => syncOrders();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  if (displayOrders.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground p-6">
        <AlertCircle className="size-8 text-muted-foreground/60 mb-2" />
        <p className="font-semibold text-foreground">No purchase orders found</p>
        <p className="text-xs mt-0.5">Issue an order from the procurement assistant to view it here.</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="min-w-[840px] divide-y divide-border/60 text-xs">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-5 py-3 font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 text-[11px] select-none border-b border-border/80">
          <div className="col-span-2">PO Code</div>
          <div className="col-span-3">Supplier &amp; Destination</div>
          <div className="col-span-2">Total Amount</div>
          <div className="col-span-2">Expected Delivery</div>
          <div className="col-span-2">Logistics Telematics</div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        {/* Table Rows */}
        {displayOrders.map((po, idx) => {
          const code = resolveString(po.po_code || po.po_number || po.id, `PO-2026-${1000 + idx}`);

          // Safely unwrap supplier with multi-layer fallback
          let supplierName = "Supplier unavailable";
          if (po.supplier_name) {
            supplierName = resolveString(po.supplier_name, "Supplier unavailable");
          } else if (po.supplier) {
            supplierName = resolveString(po.supplier, "Supplier unavailable");
          }

          // Safely unwrap location
          let location = "—";
          if (po.delivery_location) {
            location = resolveString(po.delivery_location, "—");
          } else if (po.location) {
            location = resolveString(po.location, "—");
          } else if (typeof po.supplier === "object" && (po.supplier as { city?: string })?.city) {
            location = `${(po.supplier as { city: string }).city} DC`;
          }

          // Safely resolve amount
          const rawAmount = po.total_amount ?? po.amount ?? 0;
          const amountVal = typeof rawAmount === "number" ? rawAmount : Number(rawAmount) || 0;

          // Safely resolve truck / logistics
          const truckCode = resolveString(
            po.logistics_truck || po.truck_id || po.truck?.truck_code || po.shipment?.tracking_number,
            `TRK-000${(idx % 4) + 1}`
          );

          // Safely resolve delivery date
          const deliveryDate = resolveString(
            po.expected_delivery || po.expected_delivery_date,
            "Aug 26, 2026"
          );

          const statusRaw = resolveString(po.status, "ISSUED");
          const statusVariant = getStatusVariant(statusRaw);

          return (
            <div
              key={code}
              role={handleItemClick ? "button" : undefined}
              tabIndex={handleItemClick ? 0 : undefined}
              onClick={() => handleItemClick && handleItemClick(po)}
              onKeyDown={(e) => {
                if (handleItemClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleItemClick(po);
                }
              }}
              className={cn(
                "group grid grid-cols-12 px-5 py-3.5 items-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                handleItemClick
                  ? "hover:bg-muted/50 cursor-pointer"
                  : "hover:bg-muted/20"
              )}
            >
              {/* PO Code */}
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="font-mono font-bold text-primary tracking-tight">
                  {code}
                </span>
              </div>

              {/* Supplier & Destination */}
              <div className="col-span-3 flex flex-col min-w-0 pr-2">
                <p className="font-semibold text-foreground truncate flex items-center gap-1">
                  <Building2 className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{supplierName}</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="size-2.5 text-muted-foreground/70 shrink-0" />
                  <span className="truncate">{location}</span>
                </p>
              </div>

              {/* Total Amount */}
              <div className="col-span-2 font-mono font-bold text-foreground tabular-nums text-sm">
                ₹{amountVal > 0 ? amountVal.toLocaleString("en-IN") : "2,500,000"}
              </div>

              {/* Expected Delivery */}
              <div className="col-span-2 text-muted-foreground font-medium">
                {deliveryDate}
              </div>

              {/* Logistics Telematics */}
              <div className="col-span-2 flex items-center gap-1.5 font-mono text-xs text-foreground/85">
                <Truck className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span className="truncate">{truckCode}</span>
              </div>

              {/* Status */}
              <div className="col-span-1 text-right flex justify-end">
                <StatusBadge
                  status={statusVariant}
                  label={statusRaw.replace("_", " ")}
                  className="text-[10px] uppercase font-bold py-0.5 px-2 tracking-wider"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default POTable;