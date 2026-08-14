import { format, parseISO } from "date-fns";
import type { ShipmentInfo, TruckPosition } from "@/types/logistics";
import { cn } from "@/lib/utils";

interface TruckTrackingDetailsProps {
  truck: TruckPosition;
  shipment: ShipmentInfo;
  className?: string;
}

export function TruckTrackingDetails({ truck, shipment, className }: TruckTrackingDetailsProps) {
  const lastUpdated = truck.updated_at ? format(parseISO(truck.updated_at), "MMM d, h:mm:ss a") : "Unknown";

  return (
    <div className={cn("bg-card border border-border rounded-xl p-5 flex flex-col gap-4", className)}>
      <h3 className="text-sm font-semibold tracking-tight text-foreground border-b border-border pb-2">
        Operational Details
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Truck Code</span>
          <span className="font-semibold text-foreground">{truck.truck_code}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Trailer ID</span>
          <span className="font-semibold text-foreground">{truck.trailer_id}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Driver</span>
          <span className="font-semibold text-foreground">{truck.driver_name || "Unassigned"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Shipment Code</span>
          <span className="font-semibold text-foreground">{shipment.shipment_code}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">PO Reference</span>
          <span className="font-semibold text-foreground">{shipment.purchase_order_reference}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Priority</span>
          <span className="font-semibold text-foreground">{truck.priority}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Load Type</span>
          <span className="font-semibold text-foreground">{truck.load_type || "Unknown"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Coordinates</span>
          <span className="font-semibold text-foreground tabular-nums">
            {truck.current_lat.toFixed(4)}, {truck.current_lng.toFixed(4)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Last Updated</span>
          <span className="font-semibold text-foreground tabular-nums">{lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}
