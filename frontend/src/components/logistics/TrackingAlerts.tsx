import { AlertBanner } from "@/components/shared/AlertBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Bell, CheckCircle2 } from "lucide-react";
import type { LogisticsAlert } from "@/types/logistics";
import type { StatusVariant } from "@/components/shared/StatusBadge";

interface TrackingAlertsProps {
  alerts: LogisticsAlert[];
}

export function TrackingAlerts({ alerts }: TrackingAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 h-full">
        <h3 className="text-sm font-semibold tracking-tight text-foreground border-b border-border pb-2 mb-4">
          Active Alerts
        </h3>
        <EmptyState
          icon={CheckCircle2}
          title="No active alerts"
          description="Everything is running smoothly for this shipment."
          className="py-8"
        />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold tracking-tight text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
        Active Alerts
        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
          {alerts.length}
        </span>
      </h3>
      
      <div className="flex flex-col gap-3 overflow-y-auto pr-1">
        {alerts.map((alert) => {
          let statusVariant: StatusVariant = "info";
          if (alert.severity === "CRITICAL") statusVariant = "critical";
          else if (alert.severity === "WARNING") statusVariant = "warning";
          
          return (
            <AlertBanner
              key={alert.id}
              status={statusVariant}
              title={alert.message}
              dismissible={false}
            />
          );
        })}
      </div>
    </div>
  );
}
