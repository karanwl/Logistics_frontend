import { z } from "zod";

export const deliverySchema = z.object({
  id: z.string(),
  job_name: z.string(),
  job_address: z.string(),
  sales_order: z.string().optional(),
  packing_slip: z.string().optional(),
  driver: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  door: z.number().optional(),
  frame: z.number().optional(),
  exp_frame: z.number().optional(),
  med_skid: z.number().optional(),
  small_skid: z.number().optional(),
  large_skid: z.number().optional(),
  box: z.number().optional(),
  requires_truck: z.boolean().optional(),
  pickup: z.boolean().optional(),
  requires_empty_truck: z.boolean().optional(),
  window_start: z.string().optional(),
  window_end: z.string().optional(),
  capacity_units: z.number().optional()
});

export const routeStopItemSchema = z.object({
  type: z.enum(["delivery", "depot"]),
  id: z.string().optional(),
  job_name: z.string().optional(),
  part_no: z.number().optional(),
  qty: z.number().optional(),
  units: z.number().optional(),
  med_skid: z.number().optional(),
  small_skid: z.number().optional(),
  large_skid: z.number().optional(),
  door: z.number().optional(),
  frame: z.number().optional(),
  exp_frame: z.number().optional(),
  box: z.number().optional(),
  label: z.string().optional()
});

export const routeSchema = z.object({
  vehicle_id: z.union([z.number(), z.string()]),
  vehicle_type: z.string(),
  skids: z.number().optional(),
  total_distance_m: z.number().optional(),
  total_time_s: z.number().optional(),
  stops: z.array(z.array(routeStopItemSchema)),
  stop_times: z.array(z.object({
    arrival_hhmm: z.string().optional(),
    departure_hhmm: z.string().optional(),
    arrival_s: z.number().optional(),
    departure_s: z.number().optional(),
    stop_units: z.number().optional(),
    stop_units_signed: z.number().optional()
  })).optional(),
  stop_nodes: z.array(z.number()).optional()
});

export const planSchema = z.object({
  deliveries: z.array(deliverySchema),
  routes: z.array(routeSchema),
  geocode_failures: z.array(z.any()).optional(),
  meta: z.record(z.any()).optional(),
  target_date: z.string().optional()
});

export const solveJobSchema = z.object({
  job_id: z.string(),
  status: z.enum(["queued", "running", "success", "failed"]),
  created_at: z.string().optional(),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  error: z.string().optional(),
  result: planSchema.optional().nullable()
});
