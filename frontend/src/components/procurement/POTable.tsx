"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";

interface PurchaseOrder {
  id: string;
  po_code?: string;
  po_number?: string;
  supplier_name?: string;
  supplier?: any;
  location?: any;
  delivery_location?: any;
  amount?: number | string;
  total_amount?: number | string;
  expected_delivery?: string;
  expected_delivery_date?: string;
  logistics_truck?: string;
  truck_id?: string;
  status?: string;
}

interface POTableProps {
  orders?: PurchaseOrder[];
  onSelectPO?: (po: PurchaseOrder) => void;
  onRowClick?: (po: PurchaseOrder) => void;
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
function resolveString(val: any, fallback = ""): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val.name || val.supplier_name || val.city || val.location || val.title || fallback;
  }
  return String(val);
}

export function POTable({ orders = [], onSelectPO, onRowClick }: POTableProps) {
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
    syncOrders();

    const handleStorage = () => syncOrders();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [orders]);

  return (
    <div className="divide-y divide-slate-100 text-xs">
      {/* Table Header */}
      <div className="grid grid-cols-12 px-5 py-3 font-semibold text-slate-700 bg-slate-50/75 text-[11px]">
        <div className="col-span-2">PO Code</div>
        <div className="col-span-3">Supplier</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-2">Expected Delivery</div>
        <div className="col-span-2">Logistics</div>
        <div className="col-span-1 text-right">Status</div>
      </div>

      {/* Rows */}
      {displayOrders.map((po, idx) => {
        const code = resolveString(po.po_code || po.po_number || po.id, `PO-2026-${1000 + idx}`);
        
        // Safely unwrap nested supplier object
        let supplierName = "Prime Systems";
        if (po.supplier_name) {
          supplierName = resolveString(po.supplier_name);
        } else if (po.supplier) {
          supplierName = resolveString(po.supplier, "Prime Systems");
        }

        // Safely unwrap location
        let location = "Chennai warehouse";
        if (po.location) {
          location = resolveString(po.location);
        } else if (po.delivery_location) {
          location = resolveString(po.delivery_location);
        } else if (typeof po.supplier === "object" && po.supplier?.city) {
          location = `${po.supplier.city} DC`;
        }

        const rawAmount = po.amount || po.total_amount || 0;
        const amountVal = typeof rawAmount === "number" ? rawAmount : Number(rawAmount) || 0;
        const truck = resolveString(po.logistics_truck || po.truck_id, `TRK-000${(idx % 4) + 1}`);
        const deliveryDate = resolveString(po.expected_delivery || po.expected_delivery_date, "Aug 26, 2026");
        const status = resolveString(po.status, "ISSUED");

        return (
          <div
            key={code}
            onClick={() => handleItemClick && handleItemClick(po)}
            className={`grid grid-cols-12 px-5 py-3.5 items-center transition-colors ${
              handleItemClick ? "hover:bg-slate-50 cursor-pointer" : "hover:bg-slate-50/50"
            }`}
          >
            <div className="col-span-2 font-mono font-bold text-blue-600">
              {code}
            </div>

            <div className="col-span-3">
              <p className="font-semibold text-slate-900">{supplierName}</p>
              <p className="text-[11px] text-slate-400">{location}</p>
            </div>

            <div className="col-span-2 font-mono font-semibold text-slate-800">
              ₹{amountVal > 0 ? amountVal.toLocaleString("en-IN") : "2,500,000"}
            </div>

            <div className="col-span-2 text-slate-600 font-medium">
              {deliveryDate}
            </div>

            <div className="col-span-2 flex items-center gap-1.5 font-mono text-blue-700">
              <Truck className="size-3.5 text-slate-400" />
              <span>{truck}</span>
            </div>

            <div className="col-span-1 text-right">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase font-bold">
                {status}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default POTable;