import type { YardSlotResponse } from "@/types/logistics";
import { YardSlot } from "./YardSlot";
import { cn } from "@/lib/utils";
import { LayoutGrid, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface YardGridProps {
  slots: YardSlotResponse[];
  className?: string;
}

export function YardGrid({ slots, className }: YardGridProps) {
  const total = slots.length;
  const available = slots.filter(s => s.status.toUpperCase() === "AVAILABLE").length;
  const occupied = slots.filter(s => s.status.toUpperCase() === "OCCUPIED").length;
  const reserved = slots.filter(s => s.status.toUpperCase() === "RESERVED").length;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Summary KPI Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3.5 rounded-none border border-border shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-none bg-muted text-foreground">
            <LayoutGrid className="size-4" />
          </div>
          <span className="font-semibold text-xs text-foreground uppercase tracking-wider">Yard Slot Summary</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-none border border-border/60 font-medium">
            <span className="text-muted-foreground">Total Bays:</span>
            <span className="font-mono font-bold text-foreground">{total}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-none border border-emerald-500/20 font-medium">
            <CheckCircle2 className="size-3.5" />
            <span>Available:</span>
            <span className="font-mono font-bold">{available}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-none border border-amber-500/20 font-medium">
            <Clock className="size-3.5" />
            <span>Occupied:</span>
            <span className="font-mono font-bold">{occupied}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-none border border-blue-500/20 font-medium">
            <AlertTriangle className="size-3.5" />
            <span>Reserved:</span>
            <span className="font-mono font-bold">{reserved}</span>
          </div>
        </div>
      </div>

      {/* Grid of Slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {slots.map((slot) => (
          <YardSlot key={slot.id} slot={slot} />
        ))}
      </div>
    </div>
  );
}

