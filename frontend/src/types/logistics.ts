export interface ShipmentInfo {
  id: string;
  shipment_code: string;
  tracking_number: string;
  purchase_order_reference: string;
  origin_location: string;
  destination_location: string;
  status: string;
  created_at: string;
  updated_at: string;
  shipment?: ShipmentInfo | null;
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
  progress_percent: number;
  original_eta: string | null;
  current_eta: string | null;
  delay_minutes: number;
  shipment_id: string;
  updated_at: string;
  shipment?: ShipmentInfo | null;
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
  alerts: LogisticsAlert[];
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

