"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { TrackingSearch } from "@/components/logistics/TrackingSearch";
import { ETACard } from "@/components/logistics/ETACard";
import { TruckTrackingDetails } from "@/components/logistics/TruckTrackingDetails";
import { TrackingAlerts } from "@/components/logistics/TrackingAlerts";
import { useTruckPolling } from "@/hooks/useTruckPolling";
import { simulateTruckStep, simulateAllTrucks } from "@/lib/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Search, AlertCircle, FastForward, Play } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

// Dynamically import the Leaflet map to prevent SSR issues
const TruckMap = dynamic(() => import("@/components/logistics/TruckMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] rounded-xl border border-border bg-muted flex items-center justify-center">
      <LoadingSpinner label="Loading map..." />
    </div>
  ),
});

export default function TruckTrackingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, error, refresh } = useTruckPolling(searchQuery);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const shouldReduceMotion = useReducedMotion();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAdvanceSimulation = async () => {
    if (!data?.truck.id) return;
    setIsSimulating(true);
    try {
      await simulateTruckStep(data.truck.id);
      await refresh();
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateAll = async () => {
    setIsSimulating(true);
    try {
      await simulateAllTrucks();
      await refresh();
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <AppShell title="Truck tracking">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8 h-full">
        <PageHeader
          title="Live delivery tracker"
          description="Track inbound shipments, trailer status, ETA, and operational alerts."
          action={
            data && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSimulateAll}
                  disabled={isSimulating}
                >
                  <FastForward className="size-4 mr-2" aria-hidden="true" />
                  Simulate all
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleAdvanceSimulation}
                  disabled={isSimulating || data.truck.status === "ARRIVED"}
                >
                  <Play className="size-4 mr-2" aria-hidden="true" />
                  Advance simulation
                </Button>
              </div>
            )
          }
        />

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <TrackingSearch onSearch={handleSearch} isLoading={isLoading && !data} />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-5 flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-sm">Tracking Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {isLoading && !data && !error && (
          <div className="py-20 flex justify-center">
            <LoadingSpinner label="Searching for tracking information..." className="scale-150" />
          </div>
        )}

        {!searchQuery && !isLoading && !error && !data && (
          <EmptyState
            icon={Search}
            title="Search for a shipment"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ETACard truck={data.truck} />
              <TruckTrackingDetails truck={data.truck} shipment={data.shipment} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
              <div className="lg:col-span-2 h-full">
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
