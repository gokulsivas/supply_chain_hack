export interface ShipmentInfo {
  id: string;
  shipment_code: string;
  tracking_number: string;
  purchase_order_reference: string;
  origin_location: string;
  destination_location: string;
  origin_state?: string | null;
  dest_state?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  dest_lat?: number | null;
  dest_lng?: number | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  shipment?: ShipmentInfo | null;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string | null;
}

export interface TruckPosition {
  id: string;
  truck_code: string;
  trailer_id: string;
  driver_name: string | null;
  status: string;
  priority: string;
  load_type: string | null;
  current_lat: number;
  current_lng: number;
  display_lat?: number | null;
  display_lng?: number | null;
  origin_name?: string | null;
  dest_name?: string | null;
  origin_state?: string | null;
  dest_state?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  dest_lat?: number | null;
  dest_lng?: number | null;
  progress_percent: number;
  original_eta: string | null;
  current_eta: string | null;
  delay_minutes: number;
  shipment_id?: string | null;
  updated_at?: string;
  shipment?: ShipmentInfo | null;

  // Smart Logistics Telemetry
  source_asset_id?: string | null;
  inventory_level?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  traffic_status?: string | null;
  waiting_time?: number | null;
  logistics_delay_reason?: string | null;
  asset_utilization?: number | null;
  demand_forecast?: number | null;
  is_delayed?: boolean;
  latest_telemetry_timestamp?: string | null;
}

export interface TruckTelemetry {
  id: string;
  truck_id?: string | null;
  source_timestamp: string;
  source_asset_id: string;
  source_latitude: number;
  source_longitude: number;
  display_latitude?: number | null;
  display_longitude?: number | null;
  inventory_level?: number | null;
  shipment_status?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  traffic_status?: string | null;
  waiting_time?: number | null;
  logistics_delay_reason?: string | null;
  asset_utilization?: number | null;
  demand_forecast?: number | null;
  logistics_delay: boolean;
  user_transaction_amount?: number | null;
  user_purchase_frequency?: number | null;
  created_at?: string;
}

export interface LogisticsAlert {
  id: string;
  truck_id: string;
  alert_type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  is_resolved: boolean;
  created_at: string;
}

export interface TrackingSearchResponse {
  truck: TruckPosition;
  shipment?: ShipmentInfo | null;
  route?: RoutePoint[];
  route_waypoints?: [number, number][];
  corridor_name?: string | null;
  distance_km?: number | null;
  alerts: LogisticsAlert[];
  eta?: string | null;
  original_eta?: string | null;
  is_delayed?: boolean;
  status?: string;
}

export interface LogisticsAnalyticsSummary {
  total_tracked_assets: number;
  in_transit_count: number;
  delivered_count: number;
  delayed_count: number;
  logistics_delay_rate: number;
  average_waiting_time: number;
  average_asset_utilization: number;
  average_temperature: number;
  average_humidity: number;
  traffic_status_distribution: Record<string, number>;
  delay_reason_distribution: Record<string, number>;
  total_inventory: number;
  average_demand_forecast: number;
  total_transaction_amount: number;
  average_purchase_frequency: number;
}

export interface YardSlotResponse {
  id: string;
  slot_code: string;
  status: string;
  truck_id: string | null;
  appointment_time: string | null;
  created_at: string;
  updated_at: string;
  truck?: TruckPosition | null;
}

export interface DockResponse {
  id: string;
  dock_code: string;
  status: string;
  suitable_load_types: string;
  current_truck_id: string | null;
  created_at: string;
  updated_at: string;
  current_truck?: TruckPosition | null;
}

export interface DockAssignmentResponse {
  id: string;
  truck_id: string;
  dock_id: string;
  recommended_score: number;
  status: string;
  assigned_at: string | null;
  departed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  truck?: TruckPosition | null;
  dock?: DockResponse | null;
}

export interface DockRecommendationResponse {
  recommended_dock: DockResponse | null;
  score: number;
  reason: string;
  alternatives: DockResponse[];
}

export type DockAlertResponse = LogisticsAlert;

