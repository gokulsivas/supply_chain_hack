"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Truck as TruckIcon,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  Package,
  Layers,
  Zap,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";

// Dynamically import Leaflet map elements to prevent Next.js SSR hydration errors
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

interface TelemetryTruck {
  id: string;
  truck_number: string;
  trailer_id: string;
  driver_name: string;
  cargo_type: string;
  po_number: string;
  shipment_id: string;
  status: "IN_TRANSIT" | "DELAYED" | "DELIVERED" | "DEPARTED";
  progress: number;
  origin_name: string;
  dest_name: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  current_lat: number;
  current_lng: number;
  eta: string;
  original_eta: string;
  delay_minutes: number;
  priority: string;
  last_updated?: string;
}

const DRIVER_POOL = [
  "Ramesh Kumar (+91 98765 43210)",
  "Suresh Nair (+91 98450 11223)",
  "Vikas Sharma (+91 97123 45678)",
  "Anil Verma (+91 98111 22334)"
];

const CARGO_POOL = [
  "Industrial Brake Assemblies",
  "Lithium Battery Cells",
  "Raw Steel Billets",
  "Precision Machine Parts",
  "Semiconductor IC Packs"
];

function generateSeedTruck(code: string): TelemetryTruck {
  const clean = code.trim().toUpperCase();
  const digits = clean.replace(/\D/g, "") || "1042";
  const num = clean.startsWith("TRK-") ? clean : `TRK-${digits.padStart(4, "0")}`;
  const hash = Math.abs(num.split("").reduce((a, b) => a + b.charCodeAt(0), 0));

  const o_lat = 12.9716, o_lng = 77.5946; // Bengaluru
  const d_lat = 13.0827, d_lng = 80.2707; // Chennai
  const prog = 0.35;

  return {
    id: `trk-${digits}`,
    truck_number: num,
    trailer_id: `TRL-${digits.padStart(5, "0")}`,
    driver_name: DRIVER_POOL[hash % DRIVER_POOL.length],
    cargo_type: CARGO_POOL[hash % CARGO_POOL.length],
    po_number: `PO-2026-${digits.padStart(4, "0")}`,
    shipment_id: `SHP-PO-${digits.padStart(4, "0")}`,
    status: "IN_TRANSIT",
    progress: prog,
    origin_name: "Bengaluru Facility",
    dest_name: "Chennai DC Central",
    origin_lat: o_lat,
    origin_lng: o_lng,
    dest_lat: d_lat,
    dest_lng: d_lng,
    current_lat: Number((o_lat + (d_lat - o_lat) * prog).toFixed(4)),
    current_lng: Number((o_lng + (d_lng - o_lng) * prog).toFixed(4)),
    eta: "Aug 21, 04:30 PM",
    original_eta: "Aug 21, 03:00 PM",
    delay_minutes: 0,
    priority: "NORMAL",
    last_updated: new Date().toLocaleTimeString(),
  };
}

export function TrackingPage() {
  const [searchQuery, setSearchQuery] = useState("TRK-0003");
  const [truck, setTruck] = useState<TelemetryTruck | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const autoSimRef = useRef<NodeJS.Timeout | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  // Load Leaflet map CSS and setup icons on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        setLeafletLoaded(true);
      });
    }
  }, []);

  const handleTrack = async (targetQuery = searchQuery) => {
    const q = targetQuery.trim();
    if (!q) return;
    setIsLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/logistics/track/${encodeURIComponent(q)}`);
      if (res.data?.truck) {
        const t = res.data.truck;
        const progress = t.progress || 0.0;
        const isDeliv = t.status === "DELIVERED" || progress >= 1.0;

        const sanitizedTruck: TelemetryTruck = {
          ...t,
          driver_name: t.driver_name && t.driver_name !== "Unassigned" ? t.driver_name : DRIVER_POOL[0],
          cargo_type: t.cargo_type && t.cargo_type !== "Unknown" ? t.cargo_type : CARGO_POOL[0],
          status: isDeliv ? "DELIVERED" : t.status,
          last_updated: new Date().toLocaleTimeString(),
        };

        setTruck(sanitizedTruck);

        let fetchedAlerts = res.data.alerts || [];
        if (isDeliv && !fetchedAlerts.some((a: any) => a.alert_type === "ARRIVAL")) {
          fetchedAlerts = [
            {
              id: `arr-${Date.now()}`,
              alert_type: "ARRIVAL",
              severity: "INFO",
              message: `Shipment ${sanitizedTruck.truck_number} has successfully arrived at ${sanitizedTruck.dest_name}. Geofence check-in complete.`,
            },
            ...fetchedAlerts,
          ];
        }
        setAlerts(fetchedAlerts);
        setIsLoading(false);
        return;
      }
    } catch {
      // Graceful fallback for dynamic unseeded IDs
    }

    const fallback = generateSeedTruck(q);
    setTruck(fallback);
    setAlerts([
      {
        id: "alt-init",
        alert_type: "INFO",
        severity: "INFO",
        message: `Telemetry stream active for ${fallback.truck_number}. Real-time GPS coordinates broadcasting along NH-48 corridor.`,
      },
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    handleTrack("TRK-0003");
  }, []);

  // Simulation step execution
  const executeStep = () => {
    setTruck((prev) => {
      if (!prev) return null;
      const currentProg = prev.progress || 0.0;
      if (currentProg >= 1.0) {
        setIsAutoSimulating(false);
        return prev;
      }

      const nextProg = Math.min(1.0, currentProg + 0.15);
      const isReached = nextProg >= 1.0;

      const o_lat = prev.origin_lat || 12.9716;
      const o_lng = prev.origin_lng || 77.5946;
      const d_lat = prev.dest_lat || 13.0827;
      const d_lng = prev.dest_lng || 80.2707;

      const updated: TelemetryTruck = {
        ...prev,
        progress: Number(nextProg.toFixed(2)),
        status: isReached ? "DELIVERED" : prev.status,
        current_lat: isReached ? d_lat : Number((o_lat + (d_lat - o_lat) * nextProg).toFixed(4)),
        current_lng: isReached ? d_lng : Number((o_lng + (d_lng - o_lng) * nextProg).toFixed(4)),
        last_updated: new Date().toLocaleTimeString(),
      };

      if (isReached) {
        setIsAutoSimulating(false);
        const arrivalAlert = {
          id: `arr-${Date.now()}`,
          alert_type: "ARRIVAL",
          severity: "INFO",
          message: `🎯 Truck ${prev.truck_number} (${prev.cargo_type}) has reached ${prev.dest_name}. Geofencing trigger confirmed arrival.`,
        };
        setAlerts((a) => [arrivalAlert, ...a]);
        toast.success("🎯 Destination Reached!", {
          description: `Truck ${prev.truck_number} arrived at ${prev.dest_name}. Ready for dock check-in.`,
        });
      }

      return updated;
    });
  };

  // Auto-simulate timer hook
  useEffect(() => {
    if (isAutoSimulating) {
      autoSimRef.current = setInterval(() => {
        executeStep();
      }, 1500);
    } else if (autoSimRef.current) {
      clearInterval(autoSimRef.current);
    }
    return () => {
      if (autoSimRef.current) clearInterval(autoSimRef.current);
    };
  }, [isAutoSimulating]);

  const handleInjectDelay = () => {
    if (!truck) return;
    setTruck((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: "DELAYED",
        delay_minutes: (prev.delay_minutes || 0) + 45,
        last_updated: new Date().toLocaleTimeString(),
      };
    });

    const delayAlert = {
      id: `dly-${Date.now()}`,
      alert_type: "DELAY",
      severity: "WARNING",
      message: `Traffic congestion on NH-48 corridor. Injected 45-minute delay to ${truck.truck_number}.`,
    };
    setAlerts((prev) => [delayAlert, ...prev]);
    toast.warning("Delay Injected (+45 Mins)", {
      description: "Recalculated dynamic arrival schedule.",
    });
  };

  const handleResetRoute = () => {
    if (!truck) return;
    setIsAutoSimulating(false);
    const resetTruck = generateSeedTruck(truck.truck_number);
    resetTruck.progress = 0.1;
    resetTruck.status = "IN_TRANSIT";
    setTruck(resetTruck);
    setAlerts([
      {
        id: `rst-${Date.now()}`,
        alert_type: "INFO",
        severity: "INFO",
        message: `Simulation reset to origin facility for ${resetTruck.truck_number}.`,
      },
    ]);
    toast.info("Route simulation reset to origin");
  };

  const progressPercent = Math.min(100, Math.round((truck?.progress || 0) * 100));
  const isDelivered = truck?.status === "DELIVERED" || progressPercent >= 100;
  const isDelayed = truck?.status === "DELAYED" || (truck?.delay_minutes && truck.delay_minutes > 0);

  const routeCoordinates: [number, number][] = truck
    ? [
        [truck.origin_lat || 12.9716, truck.origin_lng || 77.5946],
        [truck.current_lat || 12.9716, truck.current_lng || 77.5946],
        [truck.dest_lat || 13.0827, truck.dest_lng || 80.2707],
      ]
    : [];

  return (
    <AppShell title="Live Fleet Tracking">
      {/* Leaflet CSS Inject */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        
        {/* ── Search Bar & Quick Picks ── */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrack();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Truck Code, Trailer, Shipment, or PO Number (e.g. TRK-0003)"
                  className="pl-9 bg-slate-50 border-slate-200 text-sm font-medium"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6">
                {isLoading ? "Searching..." : "Track"}
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
              <span className="font-semibold text-slate-700">Quick Track Demo:</span>
              {["TRK-0003", "TRK-0004", "TRK-1042", "TRK-1055", "SHP-1001", "PO-2026-0042"].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setSearchQuery(code);
                    handleTrack(code);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-slate-200 transition-colors font-mono font-medium text-[11px]"
                >
                  {code}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {truck && (
          <>
            {/* ── Top Ribbon: ETA & Operational Details ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* ETA & Progress Bar */}
              <Card className="border-slate-200 shadow-sm bg-white md:col-span-5 flex flex-col justify-between">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock className="size-3.5" /> Estimated Time of Arrival
                    </span>
                    <Badge
                      className={
                        isDelivered
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs"
                          : isDelayed
                          ? "bg-rose-100 text-rose-800 border-rose-300 font-bold text-xs"
                          : "bg-blue-100 text-blue-800 border-blue-300 font-bold text-xs"
                      }
                    >
                      {isDelivered ? "DELIVERED" : isDelayed ? "DELAYED" : "IN-TRANSIT"}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {isDelivered ? "ARRIVED ON-SITE" : truck.eta || "Aug 21, 10:57 AM"}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Original ETA: {truck.original_eta || "Aug 21, 12:04 PM"}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1"><MapPin className="size-3 text-slate-400" /> Origin</span>
                      <span className="font-bold text-blue-600">{progressPercent}%</span>
                      <span className="flex items-center gap-1">Destination <MapPin className="size-3 text-blue-600" /></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isDelivered ? "bg-emerald-500" : isDelayed ? "bg-amber-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Operational Telemetry Details */}
              <Card className="border-slate-200 shadow-sm bg-white md:col-span-7">
                <CardHeader className="py-3 px-5 border-b bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Operational Telematics
                    </CardTitle>
                    {/* Live Simulation Buttons */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={isAutoSimulating ? "destructive" : "default"}
                        className="h-7 text-[11px] px-2.5 font-semibold"
                        onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                      >
                        {isAutoSimulating ? (
                          <>
                            <Pause className="size-3 mr-1" /> Pause Auto
                          </>
                        ) : (
                          <>
                            <Play className="size-3 mr-1" /> Auto Simulate
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
                        onClick={executeStep}
                        disabled={isDelivered}
                      >
                        <Zap className="size-3 mr-1 text-blue-600" /> Step
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50 border-rose-200"
                        onClick={handleInjectDelay}
                      >
                        <AlertTriangle className="size-3 mr-1" /> Delay
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] px-1.5 text-slate-500"
                        onClick={handleResetRoute}
                      >
                        <RotateCcw className="size-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-3 gap-y-4 gap-x-2 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Truck Code</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{truck.truck_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Trailer ID</span>
                    <span className="font-mono text-slate-700">{truck.trailer_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Driver</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1">
                      <User className="size-3 text-slate-500" />
                      {truck.driver_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Shipment Code</span>
                    <span className="font-mono text-slate-700">{truck.shipment_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">PO Reference</span>
                    <span className="font-mono font-bold text-blue-600">{truck.po_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Priority</span>
                    <span className="font-bold text-slate-900 uppercase">{truck.priority || "NORMAL"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Load Type</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1">
                      <Package className="size-3 text-slate-500" />
                      {truck.cargo_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Coordinates</span>
                    <span className="font-mono text-slate-700">
                      {truck.current_lat?.toFixed(4)}, {truck.current_lng?.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Last Updated</span>
                    <span className="font-mono text-slate-600">{truck.last_updated}</span>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* ── Bottom Section: Interactive Map + Active Alerts ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Interactive OpenStreetMap Container */}
              <Card className="border-slate-200 shadow-sm bg-white md:col-span-8 overflow-hidden">
                <div className="h-[380px] w-full relative z-0">
                  {leafletLoaded && typeof window !== "undefined" ? (
                    <MapContainer
                      center={[truck.current_lat || 12.9716, truck.current_lng || 77.5946]}
                      zoom={7}
                      scrollWheelZoom={false}
                      className="h-full w-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      
                      {/* Origin Marker */}
                      <Marker position={[truck.origin_lat || 12.9716, truck.origin_lng || 77.5946]}>
                        <Popup>
                          <b>Origin:</b> {truck.origin_name}
                        </Popup>
                      </Marker>

                      {/* Moving Current Truck Position */}
                      <Marker position={[truck.current_lat || 12.9716, truck.current_lng || 77.5946]}>
                        <Popup>
                          <b>{truck.truck_number}</b><br />
                          Driver: {truck.driver_name}<br />
                          Status: {truck.status} ({progressPercent}%)
                        </Popup>
                      </Marker>

                      {/* Destination Marker */}
                      <Marker position={[truck.dest_lat || 13.0827, truck.dest_lng || 80.2707]}>
                        <Popup>
                          <b>Destination:</b> {truck.dest_name}
                        </Popup>
                      </Marker>

                      {/* Route Polyline */}
                      <Polyline
                        positions={routeCoordinates}
                        color={isDelivered ? "#10b981" : isDelayed ? "#f59e0b" : "#2563eb"}
                        weight={4}
                        dashArray={isDelivered ? undefined : "6, 8"}
                      />
                    </MapContainer>
                  ) : (
                    <div className="h-full w-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-medium">
                      Loading GPS Telemetry Map...
                    </div>
                  )}
                </div>
              </Card>

              {/* Active Alerts Panel */}
              <Card className="border-slate-200 shadow-sm bg-white md:col-span-4 flex flex-col">
                <CardHeader className="py-3 px-5 border-b bg-slate-50/50">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    Active Alerts ({alerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto max-h-[320px] divide-y divide-slate-100">
                  {alerts.length === 0 ? (
                    <div className="text-xs text-slate-500 py-6 text-center">
                      No critical active alerts. Shipment is moving along designated GPS corridor.
                    </div>
                  ) : (
                    alerts.map((alt: any, idx: number) => (
                      <div key={alt.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5 text-xs">
                        {alt.alert_type === "ARRIVAL" ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : alt.alert_type === "DELAY" ? (
                          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="size-4 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900 leading-snug">{alt.message}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Type: {alt.alert_type} • Severity: {alt.severity || "NORMAL"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default TrackingPage;