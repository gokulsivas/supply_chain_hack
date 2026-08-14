import type { YardSlotResponse } from "@/types/logistics";
import { YardSlot } from "./YardSlot";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-wrap items-center gap-4 text-sm bg-card p-3 rounded-lg border border-border">
        <span className="font-medium text-foreground">Summary:</span>
        <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{total}</span></span>
        <span className="text-[oklch(0.56_0.18_142)]">Available: <span className="font-semibold">{available}</span></span>
        <span className="text-[oklch(0.72_0.18_78)]">Occupied: <span className="font-semibold">{occupied}</span></span>
        <span className="text-[oklch(0.52_0.18_242)]">Reserved: <span className="font-semibold">{reserved}</span></span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {slots.map((slot) => (
          <YardSlot key={slot.id} slot={slot} />
        ))}
      </div>
    </div>
  );
}
