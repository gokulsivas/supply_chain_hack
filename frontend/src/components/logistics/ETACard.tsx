import { format, parseISO } from "date-fns";
import { Clock, Truck, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { TruckPosition } from "@/types/logistics";

interface ETACardProps {
  truck: TruckPosition;
  className?: string;
}

export function ETACard({ truck, className }: ETACardProps) {
  const isDelayed = truck.delay_minutes > 0;
  
  const currentEtaDate = truck.current_eta ? parseISO(truck.current_eta) : null;
  const originalEtaDate = truck.original_eta ? parseISO(truck.original_eta) : null;
  
  const formattedEta = currentEtaDate ? format(currentEtaDate, "MMM d, h:mm a") : "Unknown";
  const formattedOriginalEta = originalEtaDate ? format(originalEtaDate, "MMM d, h:mm a") : "Unknown";

  let statusVariant: "success" | "warning" | "critical" | "info" | "neutral" = "info";
  if (truck.status === "ARRIVED") statusVariant = "success";
  else if (isDelayed) statusVariant = "critical";
  else if (truck.status === "IN_TRANSIT") statusVariant = "info";

  return (
    <div className={cn("bg-card border border-border rounded-xl p-5 flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
          Estimated Time of Arrival
        </h3>
        <StatusBadge 
          status={statusVariant} 
          label={truck.status.replace("_", " ")} 
        />
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-bold tracking-tight text-foreground">
          {formattedEta}
        </div>
        
        {isDelayed && (
          <div className="text-sm font-medium text-destructive flex items-center gap-1.5 mt-1">
            <span className="flex size-1.5 rounded-full bg-destructive" aria-hidden="true"></span>
            Delayed by {truck.delay_minutes} minutes
          </div>
        )}
        
        {currentEtaDate && originalEtaDate && formattedEta !== formattedOriginalEta && (
          <div className="text-xs text-muted-foreground mt-1">
            Original ETA: {formattedOriginalEta}
          </div>
        )}
      </div>

      <div className="space-y-2 mt-2">
        <div className="flex justify-between text-xs font-medium text-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-muted-foreground" aria-hidden="true" />
            <span>Origin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck className="size-3 text-primary" aria-hidden="true" />
            <span className="tabular-nums">{truck.progress_percent}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Destination</span>
            <MapPin className="size-3 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
        
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={truck.progress_percent} aria-valuemin={0} aria-valuemax={100}>
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out", 
              truck.status === "ARRIVED" ? "bg-[oklch(0.56_0.18_142)]" : "bg-primary",
              isDelayed && truck.status !== "ARRIVED" ? "bg-[oklch(0.58_0.24_27)]" : ""
            )}
            style={{ width: `${truck.progress_percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
