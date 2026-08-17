"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { ETACard } from "@/components/logistics/ETACard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search,
  FastForward,
  Play,
  Pause,
  AlertTriangle,
  AlertCircle,
  Warehouse,
} from "lucide-react";
import {
  simulateTruckStep,
  simulateAllTrucks,
  injectTruckDelay,
} from "@/lib/api";
import type { TrackingSearchResponse, TruckPosition } from "@/types/logistics";
import { useTruckPolling } from "@/hooks/useTruckPolling";

// Dynamically import the map to avoid SSR hydration issues
const TruckMap = dynamic(() => import("@/components/logistics/TruckMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[400px] rounded-xl bg-slate-100 flex items-center justify-center text-sm text-slate-500 font-medium border border-border">
      Loading GPS Telemetry Map...
    </div>
  ),
});

interface TrackingSearchProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

function TrackingSearch({ onSearch, isLoading, initialValue }: TrackingSearchProps) {
  const [value, setValue] = useState(initialValue || "TRK-1042");

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Truck code, trailer ID, shipment or PO reference..."
          className="pl-9 h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button type="submit" disabled={isLoading} size="sm" className="h-10 px-5 font-semibold">
        {isLoading ? "Searching..." : "Track"}
      </Button>
    </form>
  );
}

function TruckTrackingDetails({
  truck,
}: {
  truck: TruckPosition;
}) {
  const shipment = truck.shipment;
  const fields: [string, string][] = [
    ["Truck code", truck.truck_code],
    ["Trailer ID", truck.trailer_id],
    ["Driver", truck.driver_name ?? "Unassigned"],
    ["Load type", truck.load_type ?? "Procured Goods"],
    ["Priority", truck.priority],
    ["Shipment", shipment?.shipment_code ?? "No active shipment"],
    ["PO reference", shipment?.purchase_order_reference ?? "—"],
    ["Progress", `${truck.progress_percent}%`],
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">Operational Telematics</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground font-medium">{label}</dt>
            <dd className="text-sm font-semibold text-foreground mt-0.5 font-mono">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TrackingAlerts({
  alerts,
}: Pick<TrackingSearchResponse, "alerts">) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">
        Active Alerts ({alerts.length})
      </h3>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No active alerts. Shipment is running on schedule.
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-start gap-2 text-xs">
              <StatusBadge
                status={
                  alert.severity === "CRITICAL"
                    ? "critical"
                    : alert.severity === "WARNING"
                    ? "warning"
                    : "info"
                }
                label={alert.alert_type}
              />
              <span className="text-foreground leading-snug">{alert.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TruckTrackingContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams ? (searchParams.get("truckId") || searchParams.get("query") || searchParams.get("id") || searchParams.get("po")) : null;

  const [searchQuery, setSearchQuery] = useState(urlQuery || "TRK-1042");
  const { data, isLoading, error, refresh } = useTruckPolling(searchQuery);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [dynamicChips, setDynamicChips] = useState<string[]>(["TRK-1042", "TRK-1055", "TRK-1063", "SHP-1001", "PO-2026-0042"]);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (urlQuery && urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) {
        const localPOs = JSON.parse(stored);
        const extraChips: string[] = [];
        localPOs.forEach((po: any) => {
          if (po.logistics_truck) extraChips.push(po.logistics_truck);
          if (po.po_code || po.po_number) extraChips.push(po.po_code || po.po_number);
        });
        const combined = Array.from(new Set([...dynamicChips, ...extraChips])).slice(0, 7);
        setDynamicChips(combined);
      }
    } catch {}
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsAutoSimulating(false);
  };

  const handleAdvanceSimulation = async () => {
    if (!data?.truck?.id) return;
    setIsSimulating(true);
    try {
      await simulateTruckStep(data.truck.id);
      await refresh();
    } catch (err) {
      console.error("Simulation step error:", err);
      toast.error("Simulation step failed.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleInjectDelay = async () => {
    if (!data?.truck?.id) return;
    try {
      await injectTruckDelay(data.truck.id);
      await refresh();
      toast.warning("Traffic disruption injected! ETA delayed +25 mins.");
    } catch {
      toast.error("Failed to inject delay.");
    }
  };

  const handleSimulateAll = async () => {
    setIsSimulating(true);
    try {
      await simulateAllTrucks();
      await refresh();
      toast.success("All active fleet positions advanced!");
    } catch (err) {
      console.error("Simulation all error:", err);
      toast.error("Fleet simulation failed.");
    } finally {
      setIsSimulating(false);
    }
  };

  // Automated simulation loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const isArrived =
      data?.truck?.status === "ARRIVED" || data?.truck?.status === "IN_YARD" || data?.truck?.status === "DOCKED";

    if (isAutoSimulating && data?.truck?.id && !isArrived) {
      timer = setInterval(async () => {
        try {
          await simulateTruckStep(data.truck.id);
          await refresh();
        } catch {
          setIsAutoSimulating(false);
        }
      }, 2000);
    } else if (isArrived) {
      setIsAutoSimulating(false);
    }
    return () => clearInterval(timer);
  }, [isAutoSimulating, data?.truck?.id, data?.truck?.status, refresh]);

  const truck = data?.truck;
  const isArrived =
    truck?.status === "ARRIVED" || truck?.status === "IN_YARD" || truck?.status === "DOCKED";

  return (
    <AppShell title="Truck Tracking">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
        <PageHeader
          title="Live Delivery & Vehicle Tracker"
          description="Real-time telematics, dynamic ETA recalculations, and automated dock allocation triggers."
          action={
            data && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulateAll}
                  disabled={isSimulating}
                >
                  <FastForward className="size-4 mr-1.5" />
                  Simulate All Fleet
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInjectDelay}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  disabled={isSimulating || isArrived}
                >
                  <AlertTriangle className="size-4 mr-1.5 text-amber-600" />
                  Inject Incident (+25m)
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsAutoSimulating((prev) => !prev)}
                  className={
                    isAutoSimulating
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }
                  disabled={isArrived}
                >
                  {isAutoSimulating ? (
                    <>
                      <Pause className="size-4 mr-1.5" /> Pause Auto-Sim
                    </>
                  ) : (
                    <>
                      <Play className="size-4 mr-1.5" /> Auto-Simulate (Live)
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAdvanceSimulation}
                  disabled={isSimulating || isAutoSimulating || isArrived}
                >
                  Step +5%
                </Button>
              </div>
            )
          }
        />

        {/* Search bar */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <TrackingSearch onSearch={handleSearch} isLoading={isLoading && !data} initialValue={searchQuery} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
            <span className="font-semibold">Quick Track Demo:</span>
            {dynamicChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSearch(chip)}
                className={`px-2.5 py-1 rounded-md border font-mono transition-colors ${
                  searchQuery === chip
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-muted hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-5 flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-sm">Tracking Query Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !data && !error && (
          <div className="py-20 flex justify-center">
            <LoadingSpinner label="Querying logistics telematics..." className="scale-150" />
          </div>
        )}

        {/* Empty/no-query state */}
        {!searchQuery && !isLoading && !error && !data && (
          <EmptyState
            icon={Search}
            title="Search for a shipment or vehicle"
            description="Enter a tracking number, trailer ID, or PO reference above to see live updates."
            className="py-20 bg-card border border-border rounded-xl shadow-sm"
          />
        )}

        {/* Results */}
        {data && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6"
          >
            {/* Yard arrival banner */}
            {isArrived && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Warehouse className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Vehicle in Yard / Ready for Dock Assignment
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Geofence triggered arrival at destination. AI has queued automated dock allocation.
                    </p>
                  </div>
                </div>
                <Link href="/logistics/yard">
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold">
                    Allocate Dock
                  </Button>
                </Link>
              </div>
            )}

            {/* Top row: ETA card + Alerts + Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ETACard truck={data.truck} />
              <TrackingAlerts alerts={data.alerts} />
              <TruckTrackingDetails truck={data.truck} />
            </div>

            {/* Bottom: Map */}
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                GPS Corridor Map &amp; Real-Time Route
              </h2>
              <div className="h-[460px]">
                <TruckMap truck={data.truck} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

export function TruckTrackingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading live delivery tracking...</div>}>
      <TruckTrackingContent />
    </Suspense>
  );
}

export default TruckTrackingPage;