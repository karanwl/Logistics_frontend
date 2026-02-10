export interface DeliveryDTO {
  id: string;
  job_name: string;
  job_address: string;
  sales_order?: string;
  packing_slip?: string;
  driver?: string;
  lat?: number;
  lon?: number;
  door?: number;
  frame?: number;
  exp_frame?: number;
  med_skid?: number;
  small_skid?: number;
  large_skid?: number;
  box?: number;
  requires_truck?: boolean;
  pickup?: boolean;
  pickup_vehicle?: string;
  requires_empty_truck?: boolean;
  window_start?: string;
  window_end?: string;
  capacity_units?: number;
}

export interface RouteStopItem {
  type: "delivery" | "depot";
  id?: string;
  job_name?: string;
  part_no?: number;
  qty?: number;
  units?: number;
  med_skid?: number;
  small_skid?: number;
  large_skid?: number;
  door?: number;
  frame?: number;
  exp_frame?: number;
  box?: number;
  label?: string;
}

export interface RouteDTO {
  vehicle_id: number | string;
  vehicle_type: string;
  skids?: number;
  total_distance_m?: number;
  total_time_s?: number;
  stops: RouteStopItem[][];
  stop_times?: {
    arrival_hhmm?: string;
    departure_hhmm?: string;
    arrival_s?: number;
    departure_s?: number;
    stop_units?: number;
    stop_units_signed?: number;
  }[];
  stop_nodes?: number[];
}

export interface PlanDTO {
  deliveries: DeliveryDTO[];
  routes: RouteDTO[];
  geocode_failures?: unknown[];
  meta?: Record<string, unknown>;
  target_date?: string;
}

export interface SolveJobDTO {
  job_id: string;
  status: "queued" | "running" | "success" | "failed";
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  error?: string;
  result?: PlanDTO | null;
}
