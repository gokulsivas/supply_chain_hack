"use client";

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
  const isDelayed = Boolean(truck.delay_minutes && truck.delay_minutes > 0);

  const currentEtaDate = truck.current_eta ? parseISO(truck.current_eta) : null;
  const originalEtaDate = truck.original_eta ? parseISO(truck.original_eta) : null;

  const formattedEta = currentEtaDate
    ? format(currentEtaDate, "MMM d, h:mm a")
    : (truck.current_eta || "On Schedule");
  const formattedOriginalEta = originalEtaDate
    ? format(originalEtaDate, "MMM d, h:mm a")
    : (truck.original_eta || "—");

  let statusVariant: "success" | "warning" | "critical" | "info" | "neutral" = "info";
  if (truck.status === "ARRIVED" || truck.status === "DELIVERED" || truck.status === "IN_YARD" || truck.status === "DOCKED") {
    statusVariant = "success";
  } else if (isDelayed) {
    statusVariant = "critical";
  } else if (truck.status === "IN_TRANSIT") {
    statusVariant = "info";
  }

  const originName = truck.shipment?.origin_location || truck.origin_name || "Chennai Facility";
  const destName = truck.shipment?.destination_location || truck.dest_name || "Bengaluru Hub";

  return (
    <div className={cn("bg-card border border-border rounded-none p-5 shadow-xs flex flex-col justify-between gap-4 h-full", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="size-3.5 text-primary" aria-hidden="true" />
          Estimated Arrival
        </h3>
        <StatusBadge
          status={statusVariant}
          label={truck.status.replace("_", " ")}
          className="text-[10px] uppercase font-bold py-0.5 px-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-foreground font-mono leading-none">
          {formattedEta}
        </div>

        {isDelayed ? (
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mt-1.5">
            <span className="flex size-1.5 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
            Delayed +{truck.delay_minutes} min (Traffic incident)
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span className="flex size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Original ETA: {formattedOriginalEta}
          </div>
        )}
      </div>

      <div className="space-y-2 mt-1 pt-3 border-t border-border/60">
        <div className="flex justify-between text-xs font-medium text-foreground">
          <div className="flex items-center gap-1 truncate max-w-[42%] text-muted-foreground">
            <MapPin className="size-3 text-blue-600 shrink-0" aria-hidden="true" />
            <span className="truncate font-semibold text-foreground/90">{originName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-muted/60 rounded-none text-[11px] font-mono font-semibold">
            <Truck className="size-3 text-primary" aria-hidden="true" />
            <span className="tabular-nums">{truck.progress_percent}%</span>
          </div>
          <div className="flex items-center gap-1 truncate max-w-[42%] justify-end text-muted-foreground">
            <span className="truncate font-semibold text-foreground/90">{destName}</span>
            <MapPin className="size-3 text-emerald-600 shrink-0" aria-hidden="true" />
          </div>
        </div>

        <div className="h-2 w-full bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={truck.progress_percent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              truck.status === "ARRIVED" || truck.status === "DELIVERED"
                ? "bg-emerald-500"
                : isDelayed
                ? "bg-rose-500"
                : "bg-primary"
            )}
            style={{ width: `${Math.min(100, Math.max(0, truck.progress_percent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
