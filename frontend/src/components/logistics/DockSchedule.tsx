import type { DockResponse } from "@/types/logistics";
import { DockSlot } from "./DockSlot";
import { cn } from "@/lib/utils";
import React from "react";

interface DockScheduleProps {
  docks: DockResponse[];
  className?: string;
  renderAction?: (dock: DockResponse) => React.ReactNode;
}

export function DockSchedule({ docks, className, renderAction }: DockScheduleProps) {
  if (docks.length === 0) {
    return (
      <div className={cn("p-8 text-center text-muted-foreground bg-muted/20 rounded-none border border-dashed border-border/80 text-xs", className)}>
        No docks found in the schedule.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Desktop Header */}
      <div className="hidden sm:flex items-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="w-48 shrink-0">Dock</div>
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>Suitability</div>
          <div>Current Allocation</div>
        </div>
        {renderAction && <div className="w-24 shrink-0 text-right">Action</div>}
      </div>

      {/* Dock List */}
      {docks.map((dock) => (
        <DockSlot
          key={dock.id}
          dock={dock}
          action={renderAction ? renderAction(dock) : undefined}
        />
      ))}
    </div>
  );
}

