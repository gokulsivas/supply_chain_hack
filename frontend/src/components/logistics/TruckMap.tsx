"use client";

import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ShipmentInfo, TruckPosition } from "@/types/logistics";

const customMarker = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const ORIGIN_LAT = 13.0827;
const ORIGIN_LNG = 80.2707;
const DEST_LAT = 12.9716;
const DEST_LNG = 77.5946;

interface TruckMapProps {
  truck: TruckPosition;
  shipment: ShipmentInfo;
}

export default function TruckMap({ truck, shipment }: TruckMapProps) {
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
          
          {/* Origin Marker */}
          <Marker position={[ORIGIN_LAT, ORIGIN_LNG]} icon={customMarker}>
            <Popup>
              <strong>Origin:</strong> {shipment.origin_location} (Chennai DC)
            </Popup>
          </Marker>
          
          {/* Destination Marker */}
          <Marker position={[DEST_LAT, DEST_LNG]} icon={customMarker}>
            <Popup>
              <strong>Destination:</strong> {shipment.destination_location} (Bengaluru Hub)
            </Popup>
          </Marker>
          
          {/* Active Vehicle Marker */}
          <Marker position={[truck.current_lat, truck.current_lng]} icon={customMarker}>
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">{truck.truck_code} ({truck.trailer_id})</p>
                <p>Status: <span className="font-semibold">{truck.status}</span></p>
                <p>Progress: <span className="font-semibold">{truck.progress_percent}%</span></p>
                <p>Coordinates: {truck.current_lat.toFixed(4)}, {truck.current_lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
          
          {/* Highway Route Polyline */}
          <Polyline 
            positions={[
              [ORIGIN_LAT, ORIGIN_LNG], 
              [truck.current_lat, truck.current_lng],
              [DEST_LAT, DEST_LNG]
            ]} 
            color="#2563eb"
            weight={5}
            opacity={0.85}
            dashArray={truck.status === "ARRIVED" ? undefined : "8, 8"}
          />
        </MapContainer>
      </div>
      
      <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between px-1 bg-slate-50 p-2 rounded-lg border">
        <div>
          <span className="font-medium text-foreground">Live Telemetry:</span> {truck.current_lat.toFixed(4)}° N, {truck.current_lng.toFixed(4)}° E
        </div>
        <div>
          <span className="font-medium text-foreground">Corridor:</span> {shipment.origin_location} &rarr; {shipment.destination_location}
        </div>
      </div>
    </div>
  );
}