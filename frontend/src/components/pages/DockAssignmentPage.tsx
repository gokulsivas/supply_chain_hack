"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  getTrucks, 
  listDocks, 
  assignDockDoor, 
  releaseDockDoor, 
  resetLogisticsDemo, 
  isApiError 
} from "@/lib/api";
import { 
  Truck as TruckIcon, 
  RotateCcw, 
  RefreshCw, 
  Sparkles,
  Package,
  ArrowRight,
  Loader2
} from "lucide-react";

interface InboundTruck {
  id: string;
  truck_number?: string;
  truck_code?: string;
  code?: string;
  driver_name?: string;
  cargo_type?: string;
  load_type?: string;
  status?: string;
  po_number?: string;
  priority?: string;
}

interface DockDoor {
  id: string;
  dock_number?: string;
  dock_code?: string;
  name?: string;
  code?: string;
  door_number?: string;
  status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" | string;
  suitability?: string[] | string;
  suitable_load_types?: string;
  dock_type?: string;
  current_allocation?: string | null;
  assigned_truck?: string | null;
  truck_id?: string | null;
  current_truck_id?: string | null;
}

interface RecommendationData {
  dockId: string;
  dockNumber: string;
  confidence: number;
  reason: string;
}

const DEFAULT_TRUCKS: InboundTruck[] = [
  {
    id: "trk-1042",
    truck_number: "TRK-1042",
    driver_name: "Rajan Kumar (+91 98450 11223)",
    cargo_type: "Enterprise Laptops",
    load_type: "Enterprise Laptops",
    status: "ARRIVED",
    po_number: "PO-2026-0042",
    priority: "HIGH",
  },
  {
    id: "trk-1055",
    truck_number: "TRK-1055",
    driver_name: "Suresh Patel (+91 98765 43210)",
    cargo_type: "Barcode Scanners",
    load_type: "Barcode Scanners",
    status: "IN_TRANSIT",
    po_number: "PO-2026-0055",
    priority: "NORMAL",
  },
  {
    id: "trk-1063",
    truck_number: "TRK-1063",
    driver_name: "Anita Singh (+91 97123 45678)",
    cargo_type: "Industrial Packaging",
    load_type: "Industrial Packaging",
    status: "ARRIVED",
    po_number: "PO-2026-0063",
    priority: "NORMAL",
  },
];

const DEFAULT_DOCKS: DockDoor[] = [
  { id: "dock-1", dock_code: "D-01", status: "OCCUPIED", suitable_load_types: "General", current_allocation: null },
  { id: "dock-2", dock_code: "D-02", status: "RESERVED", suitable_load_types: "Electronics", current_allocation: null },
  { id: "dock-3", dock_code: "D-03", status: "MAINTENANCE", suitable_load_types: "General", current_allocation: null },
  { id: "dock-4", dock_code: "D-05", status: "OCCUPIED", suitable_load_types: "General, Electronics", current_allocation: "TRK-0004" },
  { id: "dock-5", dock_code: "D-04", status: "AVAILABLE", suitable_load_types: "Electronics", current_allocation: null },
];

export function DockAssignmentPage() {
  const [trucks, setTrucks] = useState<InboundTruck[]>(DEFAULT_TRUCKS);
  const [docks, setDocks] = useState<DockDoor[]>(DEFAULT_DOCKS);
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getDockLabel = (dock: DockDoor, idx: number) => {
    return (
      dock.dock_code ||
      dock.dock_number ||
      dock.door_number ||
      dock.name ||
      dock.code ||
      `D-${String(idx + 1).padStart(2, "0")}`
    );
  };

  const getTruckLabel = (truck: InboundTruck) => {
    return truck.truck_number || truck.truck_code || truck.code || truck.id || "TRK-1042";
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    let localPOs: Record<string, unknown>[] = [];
    try {
      const stored = localStorage.getItem("local_purchase_orders");
      if (stored) localPOs = JSON.parse(stored);
    } catch {}

    const localTrucks: InboundTruck[] = localPOs.map((po) => ({
      id: String(po.logistics_truck || `trk-${po.id}`),
      truck_number: String(po.logistics_truck || `TRK-${po.id}`),
      driver_name: "Assigned Fleet Driver",
      cargo_type: String(po.item_title || po.item || "Procured Equipment"),
      load_type: String(po.item_title || po.item || "Procured Equipment"),
      status: "IN_TRANSIT",
      po_number: String(po.po_code || po.po_number || po.id),
      priority: "HIGH",
    }));

    try {
      const [truckRes, dockRes] = await Promise.allSettled([
        getTrucks(),
        listDocks(),
      ]);

      const combinedMap = new Map<string, InboundTruck>();
      localTrucks.forEach((t) => combinedMap.set(t.truck_number || t.id, t));

      if (truckRes.status === "fulfilled" && Array.isArray(truckRes.value) && truckRes.value.length > 0) {
        truckRes.value.forEach((t: Record<string, unknown>) => {
          const key = String(t.truck_number || t.truck_code || t.id);
          if (key && !combinedMap.has(key)) combinedMap.set(key, t as unknown as InboundTruck);
        });
      }

      DEFAULT_TRUCKS.forEach((t) => {
        const key = t.truck_number || t.id;
        if (key && !combinedMap.has(key)) combinedMap.set(key, t);
      });

      setTrucks(Array.from(combinedMap.values()));

      if (dockRes.status === "fulfilled" && Array.isArray(dockRes.value) && dockRes.value.length > 0) {
        setDocks(dockRes.value);
      } else {
        setDocks(DEFAULT_DOCKS);
      }
    } catch {
      setTrucks(DEFAULT_TRUCKS);
      setDocks(DEFAULT_DOCKS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      let localPOs: Record<string, unknown>[] = [];
      try {
        const stored = localStorage.getItem("local_purchase_orders");
        if (stored) localPOs = JSON.parse(stored);
      } catch {}

      const localTrucks: InboundTruck[] = localPOs.map((po) => ({
        id: String(po.logistics_truck || `trk-${po.id}`),
        truck_number: String(po.logistics_truck || `TRK-${po.id}`),
        driver_name: "Assigned Fleet Driver",
        cargo_type: String(po.item_title || po.item || "Procured Equipment"),
        load_type: String(po.item_title || po.item || "Procured Equipment"),
        status: "IN_TRANSIT",
        po_number: String(po.po_code || po.po_number || po.id),
        priority: "HIGH",
      }));

      try {
        const [truckRes, dockRes] = await Promise.allSettled([
          getTrucks(),
          listDocks(),
        ]);

        const combinedMap = new Map<string, InboundTruck>();
        localTrucks.forEach((t) => combinedMap.set(t.truck_number || t.id, t));

        if (truckRes.status === "fulfilled" && Array.isArray(truckRes.value) && truckRes.value.length > 0) {
          truckRes.value.forEach((t: Record<string, unknown>) => {
            const key = String(t.truck_number || t.truck_code || t.id);
            if (key && !combinedMap.has(key)) combinedMap.set(key, t as unknown as InboundTruck);
          });
        }

        DEFAULT_TRUCKS.forEach((t) => {
          const key = t.truck_number || t.id;
          if (key && !combinedMap.has(key)) combinedMap.set(key, t);
        });

        if (isMounted) {
          setTrucks(Array.from(combinedMap.values()));
          if (dockRes.status === "fulfilled" && Array.isArray(dockRes.value) && dockRes.value.length > 0) {
            setDocks(dockRes.value);
          } else {
            setDocks(DEFAULT_DOCKS);
          }
        }
      } catch {
        if (isMounted) {
          setTrucks(DEFAULT_TRUCKS);
          setDocks(DEFAULT_DOCKS);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectTruck = (truckId: string) => {
    setSelectedTruckId(truckId);
    if (!truckId) {
      setRecommendation(null);
      return;
    }

    const selectedTruck = trucks.find(
      (t) => t.id === truckId || t.truck_number === truckId || t.truck_code === truckId || t.code === truckId
    );

    const availableDock = docks.find(
      (d) => (d.status === "AVAILABLE" || d.status === "available") && !d.current_allocation && !d.assigned_truck && !d.current_truck_id
    );

    if (availableDock && selectedTruck) {
      const dockName = getDockLabel(availableDock, docks.indexOf(availableDock));
      setRecommendation({
        dockId: availableDock.id,
        dockNumber: dockName,
        confidence: 0.98,
        reason: `Optimal automated match for ${selectedTruck.cargo_type || selectedTruck.load_type || "Industrial Cargo"}. Bay has active unloading clearance.`,
      });
    } else {
      setRecommendation(null);
    }
  };

  const handleAssignDock = async (dockId: string) => {
    if (!selectedTruckId) {
      toast.error("Please select an inbound truck first");
      return;
    }

    setIsAssigning(true);
    const chosenTruck = trucks.find(
      (t) => t.id === selectedTruckId || t.truck_number === selectedTruckId || t.truck_code === selectedTruckId || t.code === selectedTruckId
    );
    const truckCode = chosenTruck ? getTruckLabel(chosenTruck) : "TRK-0003";

    try {
      await assignDockDoor(selectedTruckId, dockId);
      toast.success(`Dock Assigned!`, {
        description: `Truck ${truckCode} assigned to unloading bay.`,
      });
      setRecommendation(null);
      setSelectedTruckId("");
      await loadData();
    } catch (err) {
      toast.error(isApiError(err) ? err.detail : "Failed to assign dock.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReleaseDock = async (dockId: string, dockName: string) => {
    setReleasingId(dockId);
    try {
      await releaseDockDoor(dockId);
      toast.info("Dock Released", {
        description: `${dockName} is now marked available.`,
      });
      await loadData();
    } catch (err) {
      toast.error(isApiError(err) ? err.detail : "Failed to release dock.");
    } finally {
      setReleasingId(null);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Are you sure you want to reset the E2 logistics demo state? This will clear all assignments.")) {
      return;
    }

    setIsLoading(true);
    try {
      await resetLogisticsDemo();
      toast.success("Demo reset to presentation baseline.");
      setSelectedTruckId("");
      setRecommendation(null);
      await loadData();
    } catch (err) {
      toast.error(isApiError(err) ? err.detail : "Failed to reset demo.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTruckDetails = trucks.find(
    (t) => t.id === selectedTruckId || t.truck_number === selectedTruckId || t.truck_code === selectedTruckId || t.code === selectedTruckId
  );

  return (
    <AppShell title="Dock assignment">

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
              Autonomous Dock Door Assignment
            </h1>
            <p className="text-xs text-muted-foreground">
              Recommend and assign dock doors using load suitability, priority, and real-time bay availability.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetDemo} 
              className="text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Reset Demo
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData} 
              disabled={isLoading} 
              className="text-xs h-8 px-3 shadow-2xs font-semibold gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Assign Truck & AI Recommendation */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border border-border shadow-xs bg-card rounded-none">
              <CardHeader className="p-4 border-b border-border bg-muted/40">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TruckIcon className="size-4 text-primary" /> Assign Inbound Truck
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Select an inbound shipment to trigger AI dock allocation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Select Inbound Vehicle
                  </label>
                  <select
                    className="w-full h-9 px-3 rounded-none border border-border bg-background text-xs font-medium text-foreground shadow-2xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    value={selectedTruckId}
                    onChange={(e) => handleSelectTruck(e.target.value)}
                  >
                    <option value="">-- Choose a truck --</option>
                    {trucks.map((t) => {
                      const code = getTruckLabel(t);
                      const load = t.cargo_type || t.load_type || "Industrial Cargo";
                      const status = t.status || "DELIVERED";
                      return (
                        <option key={t.id || code} value={t.id || code}>
                          {code} — ({status}) • {load}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedTruckDetails && (
                  <div className="bg-muted/40 border border-border rounded-none p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Selected Truck:</span>
                      <span className="font-mono font-bold text-primary">
                        {getTruckLabel(selectedTruckDetails)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Cargo Type:</span>
                      <span className="font-medium text-foreground">
                        {selectedTruckDetails.cargo_type || selectedTruckDetails.load_type || "Industrial Components"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Driver:</span>
                      <span className="font-medium text-foreground truncate max-w-[180px]">
                        {selectedTruckDetails.driver_name || "Assigned Facility Driver"}
                      </span>
                    </div>
                  </div>
                )}

                {recommendation && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-none p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" /> AI Recommendation
                      </span>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-mono text-[10px] font-bold rounded-none">
                        98% Match
                      </Badge>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                        Assign to Door {recommendation.dockNumber}
                      </div>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed font-medium">
                        {recommendation.reason}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleAssignDock(recommendation.dockId)}
                      disabled={isAssigning}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8.5 shadow-xs flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                    >
                      {isAssigning ? "Routing Truck..." : `Confirm & Assign to ${recommendation.dockNumber}`}
                      {!isAssigning && <ArrowRight className="size-3.5" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Dock Schedule Table */}
          <div className="lg:col-span-8">
            <Card className="border border-border shadow-xs bg-card rounded-none overflow-hidden">
              <CardHeader className="p-4 border-b border-border bg-muted/40">
                <CardTitle className="text-sm font-bold text-foreground">Dock Schedule &amp; Bay Allocation</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Current door occupancy, cargo compatibility, and active turnaround status.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-muted-foreground">
                    <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-24">Dock</th>
                        <th className="px-4 py-3 font-semibold">Suitability &amp; Status</th>
                        <th className="px-4 py-3 font-semibold">Current Allocation</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-normal">
                      {docks.map((dock, idx) => {
                        const dockLabel = getDockLabel(dock, idx);
                        const currentTruck = dock.current_allocation || dock.assigned_truck || dock.truck_id || dock.current_truck_id;
                        const isOccupied = dock.status === "OCCUPIED" || Boolean(currentTruck);
                        const isReserved = dock.status === "RESERVED";
                        const isMaintenance = dock.status === "MAINTENANCE";
                        const isAvailable = !isOccupied && !isReserved && !isMaintenance;

                        const suitabilityText = Array.isArray(dock.suitability)
                          ? dock.suitability.join(", ")
                          : dock.suitable_load_types || dock.suitability || dock.dock_type || "General Cargo";

                        return (
                          <tr key={dock.id || idx} className="hover:bg-muted/30 transition-colors">
                            
                            {/* Dock Code Column */}
                            <td className="px-4 py-3.5 font-mono font-bold text-foreground text-sm">
                              {dockLabel}
                            </td>

                            {/* Suitability & Status Badge */}
                            <td className="px-4 py-3.5 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    isAvailable
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold rounded-none"
                                      : isOccupied
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold rounded-none"
                                      : isReserved
                                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[10px] font-semibold rounded-none"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-semibold rounded-none"
                                  }
                                >
                                  {isOccupied ? "OCCUPIED" : isReserved ? "RESERVED" : isMaintenance ? "MAINTENANCE" : "AVAILABLE"}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Package className="size-3 text-muted-foreground/70 shrink-0" />
                                <span>{suitabilityText}</span>
                              </p>
                            </td>

                            {/* Current Allocation */}
                            <td className="px-4 py-3.5">
                              {currentTruck ? (
                                <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-none border border-primary/20 text-xs inline-flex items-center gap-1">
                                  <TruckIcon className="size-3 text-primary shrink-0" />
                                  {currentTruck}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60 text-xs font-normal">No truck assigned</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5 text-right">
                              {isOccupied ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={releasingId === dock.id || isAssigning}
                                  onClick={() => handleReleaseDock(dock.id, dockLabel)}
                                  className="h-7 px-2.5 text-[11px] text-foreground hover:bg-muted/60 font-medium rounded-none cursor-pointer"
                                >
                                  {releasingId === dock.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                                  Release Dock
                                </Button>
                              ) : isAvailable && selectedTruckId ? (
                                <Button
                                  size="sm"
                                  disabled={isAssigning || releasingId !== null}
                                  onClick={() => handleAssignDock(dock.id)}
                                  className="h-7 px-3 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-2xs rounded-none cursor-pointer"
                                >
                                  {isAssigning ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                                  Assign
                                </Button>
                              ) : (
                                <span className="text-muted-foreground/40 text-xs font-mono">—</span>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

      </motion.div>
    </AppShell>
  );
}

export const DockDoorAssignment = DockAssignmentPage;
export default DockAssignmentPage;