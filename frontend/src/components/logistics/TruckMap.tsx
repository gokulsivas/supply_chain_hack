"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TruckPosition } from "@/types/logistics";

// ── Custom marker icons ─────────────────────────────────────────────
const truckIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Auto-adjust bounds when route changes ───────────────────────────
function MapBoundsAdjuster({
  origin,
  dest,
  current,
}: {
  origin: [number, number];
  dest: [number, number];
  current: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    try {
      const bounds = L.latLngBounds([origin, dest, current]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
    } catch {}
  }, [origin[0], origin[1], dest[0], dest[1], current[0], current[1], map]);

  return null;
}

// ── Animated marker sub-component ──────────────────────────────────
interface AnimatedMarkerProps {
  lat: number;
  lng: number;
  children?: React.ReactNode;
}

function AnimatedMarker({ lat, lng, children }: AnimatedMarkerProps) {
  const markerRef = useRef<L.Marker>(null);
  const map = useMap();

  useEffect(() => {
    if (markerRef.current) {
      const newPos: [number, number] = [lat, lng];
      markerRef.current.setLatLng(newPos);
      map.panTo(newPos, { animate: true, duration: 0.8 });
    }
  }, [lat, lng, map]);

  return (
    <Marker ref={markerRef} position={[lat, lng]} icon={truckIcon}>
      {children}
    </Marker>
  );
}

// ── Coordinate Dictionary with Comprehensive Indian Cities ───────────
const CITY_COORDS: Record<string, [number, number]> = {
  chennai: [13.0827, 80.2707],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  mumbai: [19.0760, 72.8777],
  delhi: [28.7041, 77.1025],
  "delhi ncr": [28.7041, 77.1025],
  "new delhi": [28.6139, 77.2090],
  hyderabad: [17.3850, 78.4867],
  pune: [18.5204, 73.8567],
  coimbatore: [11.0168, 76.9558],
  kolkata: [22.5726, 88.3639],
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

function getCoords(cityName?: string, fallback: [number, number] = [13.0827, 80.2707]): [number, number] {
  if (!cityName) return fallback;
  const lower = cityName.toLowerCase().trim();
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key)) return coords;
  }
  // Deterministic fallback for any unseen Indian location
  let h = 0;
  for (let i = 0; i < lower.length; i++) {
    h = (h << 5) - h + lower.charCodeAt(i);
    h |= 0;
  }
  const lat = 12.0 + (Math.abs(h) % 1500) / 100.0;
  const lng = 74.0 + (Math.floor(Math.abs(h) / 1500) % 1400) / 100.0;
  return [Number(lat.toFixed(4)), Number(lng.toFixed(4))];
}

interface TruckMapProps {
  truck: TruckPosition;
}

export default function TruckMap({ truck }: TruckMapProps) {
  const shipment = truck.shipment;
  const isArrived = truck.status === "ARRIVED" || truck.status === "IN_YARD" || truck.status === "DOCKED" || truck.status === "DELIVERED";
  const isDelayed = truck.delay_minutes > 0;

  const routeColor = isArrived ? "#10b981" : isDelayed ? "#f59e0b" : "#2563eb";

  const originName = shipment?.origin_location || (truck as any).origin_name || "Chennai Facility";
  const destName = shipment?.destination_location || (truck as any).dest_name || "Balurghat Hub";

  const [originLat, originLng] = getCoords(originName, [13.0827, 80.2707]);
  const [destLat, destLng] = getCoords(destName, [25.2214, 88.7667]);

  const currentLat = truck.current_lat || originLat;
  const currentLng = truck.current_lng || originLng;

  return (
    <div className="flex flex-col gap-2 h-full min-h-[380px]">
      <div className="w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-border relative z-0 shadow-xs">
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={6}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsAdjuster
            origin={[originLat, originLng]}
            dest={[destLat, destLng]}
            current={[currentLat, currentLng]}
          />

          <Marker position={[originLat, originLng]} icon={truckIcon}>
            <Popup>
              <strong>Origin:</strong> {originName}
            </Popup>
          </Marker>

          <Marker position={[destLat, destLng]} icon={truckIcon}>
            <Popup>
              <strong>Destination:</strong> {destName}
            </Popup>
          </Marker>

          <AnimatedMarker lat={currentLat} lng={currentLng}>
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">{truck.truck_code} ({truck.trailer_id})</p>
                <p>Status: <span className="font-semibold">{truck.status}</span></p>
                <p>Progress: <span className="font-semibold">{truck.progress_percent}%</span></p>
                <p>Telemetry: {currentLat.toFixed(4)}, {currentLng.toFixed(4)}</p>
                {truck.delay_minutes > 0 && (
                  <p className="text-red-600 font-semibold">⚠ Delayed by {truck.delay_minutes} min</p>
                )}
              </div>
            </Popup>
          </AnimatedMarker>

          <Polyline
            positions={[
              [originLat, originLng],
              [currentLat, currentLng],
              [destLat, destLng],
            ]}
            color={routeColor}
            weight={5}
            opacity={0.85}
            dashArray={isArrived ? undefined : "8, 8"}
          />
        </MapContainer>
      </div>

      <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between px-3 py-2 bg-slate-50 rounded-lg border">
        <div>
          <span className="font-medium text-foreground">Live Telemetry:</span>{" "}
          {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
        </div>
        <div>
          <span className="font-medium text-foreground">Route Corridor:</span>{" "}
          {originName} → {destName}
        </div>
      </div>
    </div>
  );
}