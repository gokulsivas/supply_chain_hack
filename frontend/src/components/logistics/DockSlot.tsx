import { cn } from "@/lib/utils";
import type { DockResponse } from "@/types/logistics";
import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import { Truck, Package } from "lucide-react";

interface DockSlotProps {
  dock: DockResponse;
  action?: React.ReactNode;
  className?: string;
}

function getStatusVariant(status: string): StatusVariant {
  switch (status.toUpperCase()) {
    case "AVAILABLE": return "success";
    case "OCCUPIED": return "warning";
    case "RESERVED": return "info";
    case "MAINTENANCE": return "critical";
    default: return "neutral";
  }
}

export function DockSlot({ dock, action, className }: DockSlotProps) {
  const hasRealAllocation = Boolean(dock.current_truck_id || dock.current_truck);
  const displayTruckCode = dock.current_truck?.truck_code || dock.current_truck_id;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-4 rounded-none border border-border/80 bg-card p-4 transition-all hover:shadow-2xs",
        className
      )}
    >
      <div className="flex items-center justify-between sm:w-48 sm:shrink-0 gap-2">
        <h3 className="font-mono font-bold text-foreground text-base">{dock.dock_code}</h3>
        <StatusBadge 
          status={getStatusVariant(dock.status)} 
          label={dock.status} 
        />
      </div>
      
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="size-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate" title={dock.suitable_load_types}>
            {dock.suitable_load_types}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Truck className="size-3.5 shrink-0 text-muted-foreground/70" />
          <span className={cn("font-medium truncate", hasRealAllocation ? "font-mono font-bold text-primary" : "text-muted-foreground/70")}>
            {hasRealAllocation ? displayTruckCode : "No truck assigned"}
          </span>
        </div>
      </div>

      {action && (
        <div className="mt-2 sm:mt-0 sm:ml-auto shrink-0 flex items-center">
          {action}
        </div>
      )}
    </div>
  );
}

