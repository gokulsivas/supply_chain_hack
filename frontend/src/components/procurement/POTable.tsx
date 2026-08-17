import React from "react";
import { PurchaseOrderResponse } from "@/types/procurement";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO, isValid } from "date-fns";
import { MapPin, Calendar, Truck, Package, AlertTriangle } from "lucide-react";

interface POTableProps {
  orders: PurchaseOrderResponse[];
  onRowClick: (order: PurchaseOrderResponse) => void;
}

/** Safely format a date string, returning "—" if invalid. */
function safeDateFormat(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : "—";
  } catch {
    return "—";
  }
}

/** Safely format a currency amount, returning "—" if missing. */
function safeAmount(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return "$" + amount.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export function POTable({ orders, onRowClick }: POTableProps) {
  if (orders.length === 0) return null;

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block border rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead>PO Code</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead>Logistics</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((po) => (
              <TableRow
                key={po.id}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => onRowClick(po)}
              >
                <TableCell className="font-medium text-primary">{po.po_code ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    {po.supplier ? (
                      <span className="font-medium">{po.supplier.name}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Supplier unavailable
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{po.delivery_location ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {safeAmount(po.total_amount)}
                </TableCell>
                <TableCell>
                  {safeDateFormat(po.expected_delivery_date, "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {po.truck ? (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Truck className="w-4 h-4 text-primary" />
                      <span>{po.truck.truck_code ?? "—"}</span>
                    </div>
                  ) : po.shipment ? (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>{po.shipment.shipment_code ?? "—"}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm italic">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={po.status === "ISSUED" ? "success" : "neutral"}
                    label={po.status ?? "UNKNOWN"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {orders.map((po) => (
          <Card
            key={po.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onRowClick(po)}
          >
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-primary text-lg">{po.po_code ?? "—"}</h3>
                  {po.supplier ? (
                    <p className="text-sm font-medium text-slate-900 mt-1">{po.supplier.name}</p>
                  ) : (
                    <p className="flex items-center gap-1 text-amber-600 text-sm font-medium mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Supplier unavailable
                    </p>
                  )}
                </div>
                <StatusBadge
                  status={po.status === "ISSUED" ? "success" : "neutral"}
                  label={po.status ?? "UNKNOWN"}
                />
              </div>

              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Package className="w-4 h-4" />
                    <span>Amount</span>
                  </div>
                  <span className="font-medium">{safeAmount(po.total_amount)}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>Expected</span>
                  </div>
                  <span className="font-medium">{safeDateFormat(po.expected_delivery_date, "MMM d, yyyy")}</span>
                </div>

                <div className="flex flex-col gap-1 col-span-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span>Delivery</span>
                  </div>
                  <span className="font-medium truncate">{po.delivery_location ?? "—"}</span>
                </div>

                <div className="flex flex-col gap-1 col-span-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Truck className="w-4 h-4" />
                    <span>Logistics</span>
                  </div>
                  {po.truck ? (
                    <span className="font-medium text-primary">{po.truck.truck_code} ({po.truck.status})</span>
                  ) : po.shipment ? (
                    <span className="font-medium text-slate-700">{po.shipment.shipment_code}</span>
                  ) : (
                    <span className="text-slate-400 italic">Pending assignment</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
