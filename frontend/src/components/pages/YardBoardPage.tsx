"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
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

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      try {
        const [yardData, alertsData] = await Promise.all([
          getYard(),
          listDockAlerts()
        ]);
        if (isMounted) {
          setSlots(yardData);
          setAlerts(alertsData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(isApiError(err) ? err.detail : "Failed to load yard data.");
          setLoading(false);
        }
      }
    };

    fetchAsync();

    return () => {
      isMounted = false;
    };
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
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6 px-4 sm:px-6 pb-12"
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Yard Management &amp; Trailer Positions
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time monitoring of inbound trailers, parking bay status, and dwell-time allocation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset} 
              disabled={resetting || loading}
              className="text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5"
            >
              <RotateCcw className={`size-3.5 ${resetting ? "animate-spin" : ""}`} />
              Reset Demo
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData} 
              disabled={loading || resetting}
              className="text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
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
          <div className="text-center p-12 border border-dashed border-border/80 rounded-none text-muted-foreground bg-muted/20 text-xs">
            No yard slots found.
          </div>
        )}
      </motion.div>
    </AppShell>
  );
}

