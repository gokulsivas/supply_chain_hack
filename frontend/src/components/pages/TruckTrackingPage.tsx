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
  Radio,
  Sparkles,
  Thermometer,
  Droplets,
  Activity,
  Timer,
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
    <div className="h-full min-h-[360px] rounded-none bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center text-xs text-muted-foreground font-medium border border-border">
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Truck code, trailer ID, shipment or PO reference..."
          className="pl-10 h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
        />
      </div>
      <Button type="submit" disabled={isLoading} size="sm" className="h-10 px-5 font-semibold rounded-none cursor-pointer">
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
    ["Traffic Status", truck.traffic_status ?? "Clear"],
    ["Delay Reason", truck.logistics_delay_reason ?? "None"],
    ["Asset Utilization", truck.asset_utilization !== undefined && truck.asset_utilization !== null ? `${truck.asset_utilization}%` : "—"],
    ["Inventory Index", truck.inventory_level !== undefined && truck.inventory_level !== null ? `${truck.inventory_level} units` : "—"],
  ];

  return (
    <div className="bg-card border border-border rounded-none p-5 shadow-xs flex flex-col justify-between gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Operational Telematics
        </h3>
        {truck.source_asset_id && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 rounded-none">
            IoT: {truck.source_asset_id}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1">
        {fields.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-[11px] text-muted-foreground font-medium">{label}</dt>
            <dd className="text-xs font-semibold text-foreground mt-0.5 font-mono truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TelemetrySensorCard({ truck }: { truck: TruckPosition }) {
  const temp = truck.temperature !== undefined && truck.temperature !== null ? `${truck.temperature.toFixed(1)} °C` : "24.5 °C";
  const hum = truck.humidity !== undefined && truck.humidity !== null ? `${truck.humidity.toFixed(1)} %` : "55.0 %";
  const wait = truck.waiting_time !== undefined && truck.waiting_time !== null ? `${truck.waiting_time.toFixed(1)} hrs` : "0.0 hrs";
  const traffic = truck.traffic_status || "Clear";

  return (
    <div className="bg-card border border-border rounded-none p-5 shadow-xs flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Cold-Chain &amp; IoT Telemetry
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Connected
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-muted/40 border border-border rounded-none p-3 flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Thermometer className="size-3 text-blue-500" /> Temperature
          </span>
          <span className="text-sm font-bold text-foreground font-mono mt-1">{temp}</span>
        </div>
        <div className="bg-muted/40 border border-border rounded-none p-3 flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Droplets className="size-3 text-cyan-500" /> Humidity
          </span>
          <span className="text-sm font-bold text-foreground font-mono mt-1">{hum}</span>
        </div>
        <div className="bg-muted/40 border border-border rounded-none p-3 flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Radio className="size-3 text-amber-500" /> Traffic State
          </span>
          <span className={`text-sm font-bold font-mono mt-1 ${traffic === 'Heavy' ? 'text-amber-600' : traffic === 'Detour' ? 'text-rose-600' : 'text-emerald-600'}`}>
            {traffic}
          </span>
        </div>
        <div className="bg-muted/40 border border-border rounded-none p-3 flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Timer className="size-3 text-slate-500" /> Depot Waiting
          </span>
          <span className="text-sm font-bold text-foreground font-mono mt-1">{wait}</span>
        </div>
      </div>
    </div>
  );
}

function TrackingAlerts({
  alerts,
}: Pick<TrackingSearchResponse, "alerts">) {
  return (
    <div className="bg-card border border-border rounded-none p-5 shadow-xs flex flex-col justify-between gap-3 h-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active Alerts
        </h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-muted text-muted-foreground">
          {alerts.length}
        </span>
      </div>
      {alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground/80">No Active Alerts</p>
          <p className="mt-0.5">Shipment is running on schedule.</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2.5 overflow-y-auto pr-1">
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
                className="shrink-0 text-[10px] py-0 px-1.5 font-bold"
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

  const [searchQuery, setSearchQuery] = useState(urlQuery || "TRK-1001");
  const { data, isLoading, error, refresh } = useTruckPolling(searchQuery);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [dynamicChips, setDynamicChips] = useState<string[]>([
    "TRK-1001",
    "TRK-1002",
    "TRK-1003",
    "TRK-1004",
    "TRK-1007",
    "TRK-1042",
    "PO-2026-0001",
  ]);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (urlQuery && urlQuery !== searchQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery(urlQuery);
    }
  }, [urlQuery, searchQuery]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) {
        const localPOs = JSON.parse(stored) as Array<Record<string, string>>;
        const extraChips: string[] = [];
        localPOs.forEach((po) => {
          if (po.logistics_truck) extraChips.push(po.logistics_truck);
          if (po.po_code || po.po_number) extraChips.push(po.po_code || po.po_number);
        });
        const combined = Array.from(new Set([...dynamicChips, ...extraChips])).slice(0, 7);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDynamicChips(combined);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } else if (isArrived && isAutoSimulating) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
          title="Live delivery &amp; vehicle tracker"
          description="Real-time telematics, dynamic ETA recalculations, and automated dock allocation triggers."
          action={
            data && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Fleet Action Group */}
                <div className="flex items-center gap-1.5 p-1 rounded-none bg-muted/40 border border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSimulateAll}
                    disabled={isSimulating}
                    className="h-8 text-xs font-semibold text-foreground hover:bg-background shadow-2xs rounded-none cursor-pointer"
                  >
                    <FastForward className="size-3.5 mr-1.5 text-primary" />
                    Simulate All Fleet
                  </Button>
                </div>

                {/* Incident Injection */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInjectDelay}
                  className="h-9 text-xs font-semibold text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50/40 hover:bg-amber-100/60 dark:bg-amber-950/20 rounded-none cursor-pointer"
                  disabled={isSimulating || isArrived}
                >
                  <AlertTriangle className="size-3.5 mr-1.5 text-amber-600" />
                  Inject Incident (+25m)
                </Button>

                {/* Live Step Controls */}
                <div className="flex items-center gap-1.5 p-1 rounded-none bg-muted/40 border border-border">
                  <Button
                    size="sm"
                    onClick={() => setIsAutoSimulating((prev) => !prev)}
                    className={
                      isAutoSimulating
                        ? "h-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-2xs rounded-none cursor-pointer"
                        : "h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-2xs rounded-none cursor-pointer"
                    }
                    disabled={isArrived}
                  >
                    {isAutoSimulating ? (
                      <>
                        <Pause className="size-3.5 mr-1.5" /> Pause Auto-Sim
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5 mr-1.5" /> Auto-Simulate (Live)
                      </>
                    )}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAdvanceSimulation}
                    disabled={isSimulating || isAutoSimulating || isArrived}
                    className="h-8 text-xs font-semibold rounded-none cursor-pointer"
                  >
                    Step +5%
                  </Button>
                </div>
              </div>
            )
          }
        />

        {/* Search bar & Quick Selector */}
        <div className="bg-card border border-border rounded-none p-5 shadow-xs space-y-3.5">
          <TrackingSearch onSearch={handleSearch} isLoading={isLoading && !data} initialValue={searchQuery} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
            <span className="font-semibold text-foreground/80">Quick Fleet Selector:</span>
            {dynamicChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSearch(chip)}
                className={`px-2.5 py-1 rounded-none border text-xs font-mono transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${
                  searchQuery === chip
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-none p-5 flex items-start gap-3 shadow-xs">
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
            className="py-20 bg-card border border-border rounded-none shadow-xs"
          />
        )}

        {/* Results */}
        {data && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            {/* Yard arrival banner */}
            {isArrived && (
              <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-none p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/60 p-2 rounded-none text-emerald-700 dark:text-emerald-300">
                    <Warehouse className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                      Vehicle in Yard / Ready for Dock Assignment
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-0.5">
                      Geofence triggered arrival at destination. AI has queued automated dock allocation.
                    </p>
                  </div>
                </div>
                <Link href="/logistics/yard">
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-2xs rounded-none cursor-pointer">
                    Allocate Dock
                  </Button>
                </Link>
              </div>
            )}

            {/* Top row: ETA card + Alerts + Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ETACard truck={data.truck} />
              <TrackingAlerts alerts={data.alerts} />
              <TruckTrackingDetails truck={data.truck} />
            </div>

            {/* Middle row: Cold Chain & IoT Telemetry */}
            <TelemetrySensorCard truck={data.truck} />

            {/* Bottom: Map */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  GPS Corridor Map &amp; Real-Time Route
                </h2>
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" /> Active Highway Telematics
                </span>
              </div>
              <div className="h-[460px]">
                <TruckMap 
                  truck={data.truck} 
                  shipment={data.shipment || data.truck.shipment} 
                  route={data.route} 
                  route_waypoints={data.route_waypoints}
                  corridor_name={data.corridor_name}
                  distance_km={data.distance_km}
                />
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
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading live delivery tracking...</div>}>
      <TruckTrackingContent />
    </Suspense>
  );
}

export default TruckTrackingPage;