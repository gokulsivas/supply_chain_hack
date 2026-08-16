"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { TrackingSearch } from "@/components/logistics/TrackingSearch";
import { ETACard } from "@/components/logistics/ETACard";
import { TruckTrackingDetails } from "@/components/logistics/TruckTrackingDetails";
import { TrackingAlerts } from "@/components/logistics/TrackingAlerts";
import { useTruckPolling } from "@/hooks/useTruckPolling";
import { simulateTruckStep, simulateAllTrucks, injectTruckDelay } from "@/lib/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Search, AlertCircle, FastForward, Play, Pause, AlertTriangle, Warehouse } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

const TruckMap = dynamic(() => import("@/components/logistics/TruckMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[340px] rounded-xl border border-border bg-muted flex items-center justify-center">
      <LoadingSpinner label="Loading live map..." />
    </div>
  ),
});

export function TruckTrackingPage() {
  const [searchQuery, setSearchQuery] = useState("TRK-1042");
  const { data, isLoading, error, refresh } = useTruckPolling(searchQuery);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  
  const shouldReduceMotion = useReducedMotion();

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
      toast.error("Failed to inject delay");
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
    } finally {
      setIsSimulating(false);
    }
  };

  // Automated Simulation Loop (Ticker)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoSimulating && data?.truck?.id && data.truck.status !== "ARRIVED" && data.truck.status !== "DOCKED") {
      timer = setInterval(async () => {
        try {
          await simulateTruckStep(data.truck.id);
          await refresh();
        } catch {
          setIsAutoSimulating(false);
        }
      }, 2000);
    } else if (data?.truck?.status === "ARRIVED" || data?.truck?.status === "DOCKED") {
      setIsAutoSimulating(false);
    }
    return () => clearInterval(timer);
  }, [isAutoSimulating, data?.truck?.id, data?.truck?.status, refresh]);

  return (
    <AppShell title="Truck Tracking">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8 h-full">
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
                  disabled={isSimulating || data.truck.status === "ARRIVED"}
                >
                  <AlertTriangle className="size-4 mr-1.5 text-amber-600" />
                  Inject Incident (+25m)
                </Button>

                <Button 
                  size="sm" 
                  onClick={() => setIsAutoSimulating(prev => !prev)}
                  className={isAutoSimulating ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                  disabled={data.truck.status === "ARRIVED"}
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
                  disabled={isSimulating || isAutoSimulating || data.truck.status === "ARRIVED"}
                >
                  Step +5%
                </Button>
              </div>
            )
          }
        />

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <TrackingSearch onSearch={handleSearch} isLoading={isLoading && !data} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
            <span className="font-semibold">Quick Track Demo:</span>
            {["TRK-1042", "TRK-1055", "TRL-8821", "SHP-1001", "PO-2026-0042"].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSearch(chip)}
                className="bg-muted hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-md border font-mono transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-5 flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-sm">Tracking Query Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {isLoading && !data && !error && (
          <div className="py-20 flex justify-center">
            <LoadingSpinner label="Querying logistics telematics..." className="scale-150" />
          </div>
        )}

        {!searchQuery && !isLoading && !error && !data && (
          <EmptyState
            icon={Search}
            title="Search for a shipment or vehicle"
            description="Enter a tracking number, trailer ID, or PO reference above to see live updates."
            className="py-20 bg-card border border-border rounded-xl shadow-sm"
          />
        )}

        {data && (
          <motion.div 
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6"
          >
            {/* Arrival & Docking Geofence Banner */}
            {(data.truck.status === "IN_YARD" || data.truck.status === "ARRIVED") && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Warehouse className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Vehicle in Yard / Ready for Dock Assignment</h4>
                    <p className="text-xs text-emerald-700">Geofence triggered: Truck {data.truck.truck_code} has arrived at the facility perimeter.</p>
                  </div>
                </div>
                <Link href="/logistics/docks">
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                    Assign Dock Door
                  </Button>
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ETACard truck={data.truck} />
              <TruckTrackingDetails truck={data.truck} shipment={data.shipment} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[420px]">
              <div className="lg:col-span-2 h-full min-h-[400px]">
                <TruckMap truck={data.truck} shipment={data.shipment} />
              </div>
              <div className="h-full">
                <TrackingAlerts alerts={data.alerts} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

export default TruckTrackingPage;