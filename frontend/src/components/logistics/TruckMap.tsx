"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ShipmentInfo, TruckPosition, RoutePoint } from "@/types/logistics";

// ── Marker Icon Definitions ──────────────────────────────────────────

// Custom vehicle pointer with glowing animation and truck icon
const truckDivIcon = typeof window !== "undefined"
  ? L.divIcon({
      className: "!bg-transparent !border-0",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transform: translate(-10px, -10px);">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(37, 99, 235, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -16],
    })
  : ({} as L.DivIcon);

// Origin depot marker
const originDivIcon = typeof window !== "undefined"
  ? L.divIcon({
      className: "!bg-transparent !border-0",
      html: `
        <div style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #10b981; border: 2.5px solid #ffffff; box-shadow: 0 3px 6px rgba(0,0,0,0.3); color: white; font-size: 11px; font-weight: 800; font-family: ui-sans-serif, system-ui, sans-serif;">
          A
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -16],
    })
  : ({} as L.DivIcon);

// Destination hub marker
const destDivIcon = typeof window !== "undefined"
  ? L.divIcon({
      className: "!bg-transparent !border-0",
      html: `
        <div style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #ef4444; border: 2.5px solid #ffffff; box-shadow: 0 3px 6px rgba(0,0,0,0.3); color: white; font-size: 11px; font-weight: 800; font-family: ui-sans-serif, system-ui, sans-serif;">
          B
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -16],
    })
  : ({} as L.DivIcon);

// Fallback coordinate constants
const ORIGIN_LAT = 13.0827;
const ORIGIN_LNG = 80.2707;
const DEST_LAT = 12.9716;
const DEST_LNG = 77.5946;

const CITY_COORDS: Record<string, [number, number]> = {
  chennai: [13.0827, 80.2707],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  mumbai: [19.076, 72.8777],
  delhi: [28.7041, 77.1025],
  kolkata: [22.5726, 88.3639],
  hyderabad: [17.385, 78.4867],
  pune: [18.5204, 73.8567],
  ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873],
  kochi: [9.9312, 76.2673],
  cochin: [9.9312, 76.2673],
  balurghat: [25.2214, 88.7667],
  baksa: [26.6873, 91.5984],
  guwahati: [26.1445, 91.7362],
  siliguri: [26.7271, 88.3953],
  patna: [25.5941, 85.1376],
  bhubaneswar: [20.2961, 85.8245],
  lucknow: [26.8467, 80.9462],
  chandigarh: [30.7333, 76.7794],
  surat: [21.1702, 72.8311],
  indore: [22.7196, 75.8577],
  nagpur: [21.1458, 79.0882],
  visakhapatnam: [17.6868, 83.2185],
  vizag: [17.6868, 83.2185],
  madurai: [9.9252, 78.1198],
  trichy: [10.7905, 78.7047],
  ranchi: [23.3441, 85.3096],
  jamshedpur: [22.8046, 86.2029],
};

function resolveCoords(
  explicitLat: number | null | undefined,
  explicitLng: number | null | undefined,
  cityName: string | null | undefined,
  fallback: [number, number]
): [number, number] {
  if (
    typeof explicitLat === "number" &&
    isFinite(explicitLat) &&
    typeof explicitLng === "number" &&
    isFinite(explicitLng) &&
    (explicitLat !== 0 || explicitLng !== 0)
  ) {
    return [explicitLat, explicitLng];
  }

  if (cityName) {
    const lower = cityName.toLowerCase().trim();
    for (const [key, coords] of Object.entries(CITY_COORDS)) {
      if (lower.includes(key)) return coords;
    }
  }

  return fallback;
}

// Auto-adjust bounds when selected truck changes
function MapBoundsAdjuster({
  originLat,
  originLng,
  destLat,
  destLng,
  truckId,
}: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  truckId?: string;
}) {
  const map = useMap();
  const prevTruckIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevTruckIdRef.current !== truckId) {
      prevTruckIdRef.current = truckId;
      try {
        const bounds = L.latLngBounds([
          [originLat, originLng],
          [destLat, destLng],
        ]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
      } catch {}
    }
  }, [originLat, originLng, destLat, destLng, truckId, map]);

  return null;
}

// Live animated pointer that glides smoothly as telematics update
function AnimatedTruckMarker({
  lat,
  lng,
  icon,
  truckCode,
  status,
  progress,
}: {
  lat: number;
  lng: number;
  icon: L.Icon | L.DivIcon;
  truckCode?: string;
  status?: string;
  progress?: number;
}) {
  const map = useMap();

  useEffect(() => {
    try {
      if (map && typeof map.panTo === "function") {
        const newPos = L.latLng(lat, lng);
        map.panTo(newPos, { animate: true, duration: 0.5 });
      }
    } catch {}
  }, [lat, lng, map]);

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
        <div className="text-xs font-semibold">
          <span className="text-blue-600 font-bold">{truckCode || "Truck"}</span> ({progress ?? 0}%)
        </div>
      </Tooltip>
      <Popup>
        <div className="text-xs space-y-1 p-1">
          <p className="font-bold text-sm text-blue-600">{truckCode || "Active Vehicle"}</p>
          <p><span className="font-semibold">Status:</span> {status}</p>
          <p><span className="font-semibold">Progress:</span> {progress}%</p>
          <p><span className="font-semibold">Position:</span> {lat.toFixed(4)}° N, {lng.toFixed(4)}° E</p>
        </div>
      </Popup>
    </Marker>
  );
}

interface TruckMapProps {
  truck: TruckPosition;
  shipment?: ShipmentInfo | null;
  route?: RoutePoint[];
  route_waypoints?: [number, number][];
  corridor_name?: string | null;
  distance_km?: number | null;
}

export default function TruckMap({
  truck,
  shipment,
  route_waypoints,
}: TruckMapProps) {
  if (!truck) {
    return (
      <div className="flex flex-col gap-2 h-full min-h-[300px]">
        <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden border border-border relative z-0 flex items-center justify-center bg-slate-50 text-xs text-muted-foreground">
          No truck position data available.
        </div>
      </div>
    );
  }

  const activeShipment = shipment || truck.shipment;

  const originName =
    activeShipment?.origin_location || truck.origin_name || "Chennai Facility";
  const destName =
    activeShipment?.destination_location || truck.dest_name || "Bengaluru Hub";

  const [originLat, originLng] = resolveCoords(
    activeShipment?.origin_lat ?? truck.origin_lat,
    activeShipment?.origin_lng ?? truck.origin_lng,
    originName,
    [ORIGIN_LAT, ORIGIN_LNG]
  );

  const [destLat, destLng] = resolveCoords(
    activeShipment?.dest_lat ?? truck.dest_lat,
    activeShipment?.dest_lng ?? truck.dest_lng,
    destName,
    [DEST_LAT, DEST_LNG]
  );

  const currentLat =
    typeof truck.current_lat === "number" && isFinite(truck.current_lat) && truck.current_lat !== 0
      ? truck.current_lat
      : originLat;
  const currentLng =
    typeof truck.current_lng === "number" && isFinite(truck.current_lng) && truck.current_lng !== 0
      ? truck.current_lng
      : originLng;

  const isArrived =
    truck.status === "ARRIVED" ||
    truck.status === "IN_YARD" ||
    truck.status === "DOCKED" ||
    truck.status === "DELIVERED";

  const isDelayed = Boolean(truck.delay_minutes && truck.delay_minutes > 0);
  const routeColor = isArrived ? "#10b981" : isDelayed ? "#ea580c" : "#2563eb";

  return (
    <div className="flex flex-col gap-2 h-full min-h-[300px]">
      <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden border border-border relative z-0">
        <MapContainer
          key={`${truck.id || truck.truck_code}`}
          center={[currentLat, currentLng]}
          zoom={8}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsAdjuster
            originLat={originLat}
            originLng={originLng}
            destLat={destLat}
            destLng={destLng}
            truckId={truck.id || truck.truck_code}
          />

          {/* Highway corridor waypoints if available */}
          {route_waypoints && route_waypoints.length > 1 && (
            <Polyline
              positions={route_waypoints as [number, number][]}
              color="#94a3b8"
              weight={3}
              opacity={0.65}
              dashArray="6, 6"
            />
          )}

          {/* Active Live Connected Route: Origin -> Moving Truck -> Destination */}
          <Polyline
            positions={[
              [originLat, originLng],
              [currentLat, currentLng],
              [destLat, destLng],
            ]}
            color={routeColor}
            weight={5}
            opacity={0.9}
            dashArray={isArrived ? undefined : "8, 8"}
          />

          {/* Origin Marker */}
          <Marker position={[originLat, originLng]} icon={originDivIcon}>
            <Tooltip direction="top" offset={[0, -14]}>
              <span className="font-semibold text-xs">Origin: {originName}</span>
            </Tooltip>
            <Popup>
              <div className="text-xs">
                <strong>Origin Depot:</strong> {originName}
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker */}
          <Marker position={[destLat, destLng]} icon={destDivIcon}>
            <Tooltip direction="top" offset={[0, -14]}>
              <span className="font-semibold text-xs">Destination: {destName}</span>
            </Tooltip>
            <Popup>
              <div className="text-xs">
                <strong>Destination Hub:</strong> {destName}
              </div>
            </Popup>
          </Marker>

          {/* Moving Truck Marker */}
          <AnimatedTruckMarker
            lat={currentLat}
            lng={currentLng}
            icon={truckDivIcon}
            truckCode={truck.truck_code}
            status={truck.status}
            progress={truck.progress_percent}
          />
        </MapContainer>
      </div>

      {/* Accessible textual fallback */}
      <div className="text-xs text-muted-foreground flex flex-col gap-1 sm:flex-row sm:justify-between px-1">
        <div>
          <span className="font-medium text-foreground">Current position:</span>{" "}
          {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E ({truck.progress_percent ?? 0}% completed)
        </div>
        <div>
          <span className="font-medium text-foreground">Origin:</span> {originName} &rarr;{" "}
          <span className="font-medium text-foreground">Dest:</span> {destName}
        </div>
      </div>
    </div>
  );
}