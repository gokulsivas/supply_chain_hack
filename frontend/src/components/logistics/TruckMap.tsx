"use client";

import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ShipmentInfo, TruckPosition } from "@/types/logistics";

// Fix for Leaflet default marker icons in Next.js
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

// Demo coordinates
const ORIGIN_LAT = 13.0827;
const ORIGIN_LNG = 80.2707;
const DEST_LAT = 12.9716;
const DEST_LNG = 77.5946;

interface TruckMapProps {
  truck: TruckPosition;
  shipment: ShipmentInfo;
}

export default function TruckMap({ truck, shipment }: TruckMapProps) {
  // Ensure the map container takes up the full width/height
  return (
    <div className="flex flex-col gap-2 h-full min-h-[300px]">
      <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden border border-border relative z-0">
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
          <Marker position={[ORIGIN_LAT, ORIGIN_LNG]} icon={customMarker} />
          
          {/* Destination Marker */}
          <Marker position={[DEST_LAT, DEST_LNG]} icon={customMarker} />
          
          {/* Current Truck Marker */}
          <Marker position={[truck.current_lat, truck.current_lng]} icon={customMarker} />
          
          {/* Route line */}
          <Polyline 
            positions={[
              [ORIGIN_LAT, ORIGIN_LNG], 
              [truck.current_lat, truck.current_lng],
              [DEST_LAT, DEST_LNG]
            ]} 
            color="hsl(var(--primary))" 
            weight={4}
            opacity={0.8}
            dashArray={truck.status === "ARRIVED" ? undefined : "10, 10"}
          />
        </MapContainer>
      </div>
      
      {/* Accessible textual fallback */}
      <div className="text-xs text-muted-foreground flex flex-col gap-1 sm:flex-row sm:justify-between px-1">
        <div>
          <span className="font-medium text-foreground">Current position:</span> {truck.current_lat.toFixed(4)}, {truck.current_lng.toFixed(4)}
        </div>
        <div>
          <span className="font-medium text-foreground">Origin:</span> {shipment.origin_location} &rarr; <span className="font-medium text-foreground">Dest:</span> {shipment.destination_location}
        </div>
      </div>
    </div>
  );
}
