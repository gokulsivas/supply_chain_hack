"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getYard, listDockAlerts, resetLogisticsDemo, isApiError } from "@/lib/api";
import type { YardSlotResponse, DockAlertResponse } from "@/types/logistics";
import { YardGrid } from "@/components/logistics/YardGrid";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function YardBoardPage() {
  const [slots, setSlots] = useState<YardSlotResponse[]>([]);
  const [alerts, setAlerts] = useState<DockAlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [yardData, alertsData] = await Promise.all([
        getYard(),
        listDockAlerts()
      ]);
      setSlots(yardData);
      setAlerts(alertsData);
    } catch (err) {
      setError(isApiError(err) ? err.detail : "Failed to load yard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset the E2 logistics demo state? This will clear all assignments.")) {
      return;
    }
    
    setResetting(true);
    try {
      await resetLogisticsDemo();
      toast.success("Demo reset to presentation baseline.");
      await loadData();
    } catch (err) {
      toast.error(isApiError(err) ? err.detail : "Failed to reset demo.");
    } finally {
      setResetting(false);
    }
  };

  const severityToStatus = (severity: string): "info" | "warning" | "critical" | "success" | "neutral" => {
    switch (severity.toUpperCase()) {
      case "INFO": return "info";
      case "WARNING": return "warning";
      case "CRITICAL": return "critical";
      default: return "neutral";
    }
  };

  return (
    <AppShell title="Yard management">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Yard status board</h1>
            <p className="text-muted-foreground">Monitor inbound trailers, yard positions, and scheduled arrivals.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting || loading}>
              <RotateCcw className="size-4 mr-2" />
              Reset Demo
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading || resetting}>
              <RefreshCw className={cn("size-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <AlertBanner status="critical" title="Error" description={error} />
        )}

        {alerts.length > 0 && (
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                status={severityToStatus(alert.severity)}
                title={alert.message}
                dismissible={false}
              />
            ))}
          </div>
        )}

        {loading && slots.length === 0 ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : slots.length > 0 ? (
          <YardGrid slots={slots} />
        ) : (
          <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground bg-muted/20">
            No yard slots found.
          </div>
        )}
      </div>
    </AppShell>
  );
}

// Quick helper to avoid importing cn recursively if I missed it
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
