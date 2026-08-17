"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ShipmentInfo, TruckPosition } from "@/types/logistics";

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

// ── TruckMap ────────────────────────────────────────────────────────

interface TruckMapProps {
  truck: TruckPosition;
}

export default function TruckMap({ truck }: TruckMapProps) {
  const shipment = truck.shipment;
  const isArrived = truck.status === "ARRIVED" || truck.status === "IN_YARD" || truck.status === "DOCKED";
  const isDelayed = truck.delay_minutes > 0;

  const routeColor = isArrived ? "#10b981" : isDelayed ? "#f59e0b" : "#2563eb";

  const originLat = 13.0827;
  const originLng = 80.2707;
  const destLat = 12.9716;
  const destLng = 77.5946;

  return (
    <div className="flex flex-col gap-2 h-full min-h-[360px]">
      <div className="w-full h-full min-h-[360px] rounded-xl overflow-hidden border border-border relative z-0 shadow-sm">
        <MapContainer
          center={[truck.current_lat, truck.current_lng]}
          zoom={8}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={[originLat, originLng]} icon={truckIcon}>
            <Popup>
              <strong>Origin:</strong> {shipment?.origin_location ?? "Chennai DC"}
            </Popup>
          </Marker>

          <Marker position={[destLat, destLng]} icon={truckIcon}>
            <Popup>
              <strong>Destination:</strong> {shipment?.destination_location ?? "Bengaluru Hub"}
            </Popup>
          </Marker>

          <AnimatedMarker lat={truck.current_lat} lng={truck.current_lng}>
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">{truck.truck_code} ({truck.trailer_id})</p>
                <p>Status: <span className="font-semibold">{truck.status}</span></p>
                <p>Progress: <span className="font-semibold">{truck.progress_percent}%</span></p>
                <p>Coordinates: {truck.current_lat.toFixed(4)}, {truck.current_lng.toFixed(4)}</p>
                {truck.delay_minutes > 0 && (
                  <p className="text-red-600 font-semibold">⚠ Delayed by {truck.delay_minutes} min</p>
                )}
              </div>
            </Popup>
          </AnimatedMarker>

          <Polyline
            positions={[
              [originLat, originLng],
              [truck.current_lat, truck.current_lng],
              [destLat, destLng],
            ]}
            color={routeColor}
            weight={5}
            opacity={0.85}
            dashArray={isArrived ? undefined : "8, 8"}
          />
        </MapContainer>
      </div>

      <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between px-1 bg-slate-50 p-2 rounded-lg border">
        <div>
          <span className="font-medium text-foreground">Live Telemetry:</span>{" "}
          {truck.current_lat.toFixed(4)}° N, {truck.current_lng.toFixed(4)}° E
        </div>
        <div>
          <span className="font-medium text-foreground">Corridor:</span>{" "}
          {shipment?.origin_location ?? "Chennai DC"} → {shipment?.destination_location ?? "Bengaluru Hub"}
        </div>
      </div>
    </div>
  );
}