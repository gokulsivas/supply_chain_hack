import { cn } from "@/lib/utils";
import type { YardSlotResponse } from "@/types/logistics";
import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import { Truck, Clock } from "lucide-react";
import { format } from "date-fns";

interface YardSlotProps {
  slot: YardSlotResponse;
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

export function YardSlot({ slot, className }: YardSlotProps) {
  const isOccupied = slot.status.toUpperCase() === "OCCUPIED" || slot.status.toUpperCase() === "RESERVED";
  const displayTruckCode = slot.truck?.truck_code || slot.truck_id || "Empty";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-none border border-border bg-card p-3 transition-all hover:shadow-2xs hover:border-border",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-border/40 pb-2">
        <h3 className="font-mono font-bold text-sm text-foreground tracking-tight">{slot.slot_code}</h3>
        <StatusBadge 
          status={getStatusVariant(slot.status)} 
          label={slot.status} 
        />
      </div>
      
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Truck className="size-3.5 shrink-0" />
          <span className={cn("font-medium truncate", isOccupied ? "font-mono font-bold text-foreground" : "text-muted-foreground/70")}>
            {isOccupied ? displayTruckCode : "No truck"}
          </span>
        </div>
        
        {slot.appointment_time && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
            <Clock className="size-3 shrink-0 text-muted-foreground/70" />
            <span className="truncate">Appt: <span className="font-mono font-medium text-foreground/80">{format(new Date(slot.appointment_time), "MMM d, h:mm a")}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}

