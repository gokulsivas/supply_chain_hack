import { cn } from "@/lib/utils";
import type { YardSlotResponse } from "@/types/logistics";
import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import { Truck } from "lucide-react";
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
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">{slot.slot_code}</h3>
        <StatusBadge 
          status={getStatusVariant(slot.status)} 
          label={slot.status} 
        />
      </div>
      
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Truck className="size-4 shrink-0" />
          <span className={cn("font-medium", isOccupied ? "text-foreground" : "")}>
            {isOccupied ? displayTruckCode : "No truck assigned"}
          </span>
        </div>
        
        {slot.appointment_time && (
          <div className="text-xs text-muted-foreground ml-5.5 pl-0.5">
            Appt: {format(new Date(slot.appointment_time), "MMM d, h:mm a")}
          </div>
        )}
      </div>
    </div>
  );
}
