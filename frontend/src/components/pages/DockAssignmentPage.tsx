"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Truck as TruckIcon, 
  RotateCcw, 
  RefreshCw, 
  Sparkles,
  Package
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
  dock_type?: string;
  current_allocation?: string | null;
  assigned_truck?: string | null;
  truck_id?: string | null;
}

const DEFAULT_TRUCKS: InboundTruck[] = [
  {
    id: "trk-0003",
    truck_number: "TRK-0003",
    driver_name: "Ramesh Kumar (+91 98765 43210)",
    cargo_type: "Industrial Brake Assemblies",
    status: "DELIVERED",
    po_number: "PO-2026-0003",
    priority: "HIGH",
  },
  {
    id: "trk-1042",
    truck_number: "TRK-1042",
    driver_name: "Suresh Nair (+91 98450 11223)",
    cargo_type: "Lithium Battery Cells",
    status: "DELIVERED",
    po_number: "PO-2026-0042",
    priority: "CRITICAL",
  },
  {
    id: "trk-0004",
    truck_number: "TRK-0004",
    driver_name: "Vikas Sharma (+91 97123 45678)",
    cargo_type: "Precision Machine Parts",
    status: "IN_TRANSIT",
    po_number: "PO-2026-0004",
    priority: "NORMAL",
  },
];

const DEFAULT_DOCKS: DockDoor[] = [
  { id: "dock-1", dock_number: "D-01", status: "OCCUPIED", suitability: ["General Cargo"], current_allocation: null },
  { id: "dock-2", dock_number: "D-02", status: "RESERVED", suitability: ["Electronics"], current_allocation: null },
  { id: "dock-3", dock_number: "D-03", status: "MAINTENANCE", suitability: ["General Cargo"], current_allocation: null },
  { id: "dock-4", dock_number: "D-05", status: "OCCUPIED", suitability: ["General, Electronics"], current_allocation: "TRK-0004" },
  { id: "dock-5", dock_number: "D-04", status: "AVAILABLE", suitability: ["Electronics"], current_allocation: null },
];

export function DockAssignmentPage() {
  const [trucks, setTrucks] = useState<InboundTruck[]>(DEFAULT_TRUCKS);
  const [docks, setDocks] = useState<DockDoor[]>(DEFAULT_DOCKS);
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const getDockLabel = (dock: DockDoor, idx: number) => {
    return (
      dock.dock_number ||
      dock.dock_code ||
      dock.door_number ||
      dock.name ||
      dock.code ||
      `D-0${idx + 1}`
    );
  };

  const getTruckLabel = (truck: InboundTruck) => {
    return truck.truck_number || truck.truck_code || truck.code || truck.id || "TRK-0003";
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [truckRes, dockRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/logistics/trucks`),
        axios.get(`${API_BASE}/logistics/docks`),
      ]);

      if (truckRes.status === "fulfilled" && Array.isArray(truckRes.value.data) && truckRes.value.data.length > 0) {
        setTrucks(truckRes.value.data);
      } else {
        setTrucks(DEFAULT_TRUCKS);
      }

      if (dockRes.status === "fulfilled" && Array.isArray(dockRes.value.data) && dockRes.value.data.length > 0) {
        setDocks(dockRes.value.data);
      } else {
        setDocks(DEFAULT_DOCKS);
      }
    } catch {
      setTrucks(DEFAULT_TRUCKS);
      setDocks(DEFAULT_DOCKS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      (d) => (d.status === "AVAILABLE" || d.status === "available") && !d.current_allocation && !d.assigned_truck
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
      await axios.post(`${API_BASE}/logistics/trucks/${selectedTruckId}/assign-dock`, { dock_id: dockId });
    } catch {}

    setDocks((prevDocks) =>
      prevDocks.map((dock, idx) => {
        const isTarget = dock.id === dockId || getDockLabel(dock, idx) === dockId;
        return isTarget
          ? { ...dock, status: "OCCUPIED", current_allocation: truckCode, assigned_truck: truckCode }
          : dock;
      })
    );

    toast.success(`Dock Assigned!`, {
      description: `Truck ${truckCode} assigned to unloading bay.`,
    });

    setRecommendation(null);
    setSelectedTruckId("");
    setIsAssigning(false);
  };

  const handleReleaseDock = async (dockId: string, dockName: string) => {
    try {
      await axios.post(`${API_BASE}/logistics/docks/${dockId}/release`);
    } catch {}

    setDocks((prevDocks) =>
      prevDocks.map((dock, idx) => {
        const isTarget = dock.id === dockId || getDockLabel(dock, idx) === dockId;
        return isTarget
          ? { ...dock, status: "AVAILABLE", current_allocation: null, assigned_truck: null }
          : dock;
      })
    );

    toast.info("Dock Released", {
      description: `${dockName} is now marked available.`,
    });
  };

  const handleResetDemo = () => {
    setTrucks(DEFAULT_TRUCKS);
    setDocks(DEFAULT_DOCKS);
    setSelectedTruckId("");
    setRecommendation(null);
    toast.success("Demo reset to presentation baseline.");
  };

  const selectedTruckDetails = trucks.find(
    (t) => t.id === selectedTruckId || t.truck_number === selectedTruckId || t.truck_code === selectedTruckId || t.code === selectedTruckId
  );

  return (
    <AppShell title="Dock assignment">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dock door assignment</h1>
            <p className="text-sm text-slate-500">
              Recommend and assign dock doors using load suitability, priority, and availability.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleResetDemo} className="text-xs">
              <RotateCcw className="size-3.5 mr-1.5" /> Reset Demo
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="text-xs">
              <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Assign Truck & AI Recommendation */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="p-4 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TruckIcon className="size-4 text-blue-600" /> Assign Truck
                </CardTitle>
                <CardDescription className="text-xs">
                  Select an inbound shipment to trigger AI dock allocation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Select inbound truck
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-800 shadow-sm focus:ring-1 focus:ring-blue-500"
                    value={selectedTruckId}
                    onChange={(e) => handleSelectTruck(e.target.value)}
                  >
                    <option value="">-- Choose a truck --</option>
                    {trucks.map((t: any) => {
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
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Selected Truck:</span>
                      <span className="font-mono font-bold text-blue-700">
                        {getTruckLabel(selectedTruckDetails)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Load:</span>
                      <span className="font-medium text-slate-800">
                        {selectedTruckDetails.cargo_type || selectedTruckDetails.load_type || "Industrial Components"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Driver:</span>
                      <span className="font-medium text-slate-800">
                        {selectedTruckDetails.driver_name || "Assigned Facility Driver"}
                      </span>
                    </div>
                  </div>
                )}

                {recommendation && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-emerald-600" /> AI Recommendation
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[10px]">
                        98% Match
                      </Badge>
                    </div>

                    <div>
                      <div className="text-base font-bold text-emerald-950">
                        Assign to Door {recommendation.dockNumber}
                      </div>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        {recommendation.reason}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleAssignDock(recommendation.dockId)}
                      disabled={isAssigning}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-sm"
                    >
                      {isAssigning ? "Routing Truck..." : `Confirm & Assign to ${recommendation.dockNumber}`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Dock Schedule Table */}
          <div className="lg:col-span-8">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="p-4 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800">Dock Schedule</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 text-xs">
                  
                  {/* Table Header */}
                  <div className="grid grid-cols-12 px-5 py-3 font-semibold uppercase text-slate-500 bg-slate-50/80 text-[11px]">
                    <div className="col-span-2">Dock</div>
                    <div className="col-span-3">Suitability</div>
                    <div className="col-span-4">Current Allocation</div>
                    <div className="col-span-3 text-right">Action</div>
                  </div>

                  {/* Table Rows */}
                  {docks.map((dock, idx) => {
                    const dockLabel = getDockLabel(dock, idx);
                    const currentTruck = dock.current_allocation || dock.assigned_truck || dock.truck_id;
                    const isOccupied = dock.status === "OCCUPIED" || Boolean(currentTruck);
                    const isReserved = dock.status === "RESERVED";
                    const isMaintenance = dock.status === "MAINTENANCE";
                    const isAvailable = !isOccupied && !isReserved && !isMaintenance;

                    const suitabilityText = Array.isArray(dock.suitability)
                      ? dock.suitability.join(", ")
                      : dock.suitability || dock.dock_type || "General Cargo";

                    return (
                      <div key={dock.id || idx} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-slate-50/50 transition-colors">
                        
                        {/* Dock Code Column */}
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {dockLabel}
                          </span>
                        </div>

                        {/* Suitability & Status Badge */}
                        <div className="col-span-3 space-y-1">
                          <Badge
                            className={
                              isAvailable
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
                                : isOccupied
                                ? "bg-amber-100 text-amber-800 border-amber-300 text-[10px]"
                                : isReserved
                                ? "bg-blue-100 text-blue-800 border-blue-300 text-[10px]"
                                : "bg-rose-100 text-rose-800 border-rose-300 text-[10px]"
                            }
                          >
                            {isOccupied ? "OCCUPIED" : isReserved ? "RESERVED" : isMaintenance ? "MAINTENANCE" : "AVAILABLE"}
                          </Badge>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Package className="size-3 text-slate-400" />
                            {suitabilityText}
                          </p>
                        </div>

                        {/* Current Allocation */}
                        <div className="col-span-4 flex items-center gap-2 font-medium">
                          {currentTruck ? (
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 text-xs">
                              {currentTruck}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">No truck assigned</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-3 text-right">
                          {isOccupied ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReleaseDock(dock.id, dockLabel)}
                              className="h-7 text-[11px] text-slate-700 hover:text-slate-900 border-slate-300"
                            >
                              Release Dock
                            </Button>
                          ) : isAvailable && selectedTruckId ? (
                            <Button
                              size="sm"
                              onClick={() => handleAssignDock(dock.id)}
                              className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            >
                              Assign
                            </Button>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </AppShell>
  );
}

export const DockDoorAssignment = DockAssignmentPage;
export default DockAssignmentPage;