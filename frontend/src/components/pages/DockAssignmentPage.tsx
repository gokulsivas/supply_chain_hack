"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { 
  listDocks, 
  listDockAssignments, 
  listTrucks, 
  releaseDock, 
  resetLogisticsDemo, 
  isApiError 
} from "@/lib/api";
import type { 
  DockResponse, 
  DockAssignmentResponse, 
  TruckPosition 
} from "@/types/logistics";
import { DockSchedule } from "@/components/logistics/DockSchedule";
import { DockRecommendationCard } from "@/components/logistics/DockRecommendationCard";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function DockAssignmentPage() {
  const [docks, setDocks] = useState<DockResponse[]>([]);
  const [assignments, setAssignments] = useState<DockAssignmentResponse[]>([]);
  const [trucks, setTrucks] = useState<TruckPosition[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docksData, assignData, trucksData] = await Promise.all([
        listDocks(),
        listDockAssignments(),
        listTrucks()
      ]);
      setDocks(docksData);
      setAssignments(assignData);
      
      // Only keep trucks that aren't already docked/departed
      const assignableTrucks = trucksData.filter(t => t.status !== "DEPARTED");
      setTrucks(assignableTrucks);
    } catch (err) {
      setError(isApiError(err) ? err.detail : "Failed to load dock data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset the E2 logistics demo state?")) {
      return;
    }
    
    setResetting(true);
    try {
      await resetLogisticsDemo();
      toast.success("Demo reset to presentation baseline.");
      setSelectedTruckId("");
      await loadData();
    } catch (err) {
      toast.error(isApiError(err) ? err.detail : "Failed to reset demo.");
    } finally {
      setResetting(false);
    }
  };

  const handleRelease = async (dockId: string) => {
    if (!window.confirm("Are you sure you want to release this dock?")) {
      return;
    }

    setReleasingId(dockId);
    try {
      await releaseDock(dockId);
      toast.success("Dock released successfully.");
      await loadData();
    } catch (err) {
      toast.error(isApiError(err) ? err.detail : "Failed to release dock.");
    } finally {
      setReleasingId(null);
    }
  };

  const handleAssigned = () => {
    setSelectedTruckId("");
    loadData();
  };

  // Render action for dock schedule
  const renderDockAction = (dock: DockResponse) => {
    const hasActiveAssignment = assignments.some(a => a.dock_id === dock.id && a.status === "ASSIGNED");
    const hasRealAllocation = Boolean(dock.current_truck_id || dock.current_truck || hasActiveAssignment);

    if (!hasRealAllocation) return <span className="text-muted-foreground text-xs">—</span>;

    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => handleRelease(dock.id)}
        disabled={releasingId === dock.id}
      >
        {releasingId === dock.id ? <Loader2 className="size-3 animate-spin" /> : "Release"}
      </Button>
    );
  };

  return (
    <AppShell title="Dock assignment">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dock door assignment</h1>
            <p className="text-muted-foreground">Recommend and assign dock doors using load suitability, priority, and availability.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assignment panel */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h2 className="text-lg font-semibold border-b pb-2">Assign Truck</h2>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="truck-select" className="text-sm font-medium">Select inbound truck</label>
              <select
                id="truck-select"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Choose a truck --</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.truck_code} ({t.status}) - {t.load_type || "No load"}
                  </option>
                ))}
              </select>
            </div>

            {selectedTruckId && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <DockRecommendationCard 
                  truckId={selectedTruckId} 
                  onAssigned={handleAssigned} 
                />
              </div>
            )}
          </div>

          {/* Schedule board */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-lg font-semibold border-b pb-2">Dock Schedule</h2>
            {loading && docks.length === 0 ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DockSchedule docks={docks} renderAction={renderDockAction} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
