"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { normalizePublishedPlan } from "@/lib/planner/normalizePlan";
import { formatDate } from "@/lib/utils/dates";
import {
  useManualPlan,
  useManualPlansList,
  usePublishedPlan,
  usePublishedPlansList
} from "@/lib/api/planner";

type VehicleFilter = "all" | "truck" | "van";

type PlanMetrics = {
  routeCount: number;
  vehicleCount: number;
  totalDistanceM: number;
  totalTimeS: number;
  totalStops: number;
  deliveryStops: number;
  deliveryCount: number;
};

const EMPTY_METRICS: PlanMetrics = {
  routeCount: 0,
  vehicleCount: 0,
  totalDistanceM: 0,
  totalTimeS: 0,
  totalStops: 0,
  deliveryStops: 0,
  deliveryCount: 0
};

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeVehicleType(value: unknown): "truck" | "van" {
  const normalized = asText(value).toLowerCase();
  return normalized === "van" ? "van" : "truck";
}

function stopGroups(route: any): any[][] {
  if (!Array.isArray(route?.stops)) return [];
  return route.stops.map((stop: any) => (Array.isArray(stop) ? stop : [stop]));
}

function deliveryStopsInRoute(route: any): number {
  let count = 0;
  for (const group of stopGroups(route)) {
    const hasDelivery = group.some((item: any) => asText(item?.type).toLowerCase() === "delivery");
    if (hasDelivery) count += 1;
  }
  return count;
}

function deliveryIdsInRoute(route: any): Set<string> {
  const ids = new Set<string>();
  for (const group of stopGroups(route)) {
    for (const item of group) {
      if (asText(item?.type).toLowerCase() !== "delivery") continue;
      const id = asText(item?.id || item?.delivery_id);
      if (id) ids.add(id);
    }
  }
  return ids;
}

function computePlanMetrics(plan: any, vehicle: VehicleFilter): PlanMetrics {
  const routes = Array.isArray(plan?.routes) ? plan.routes : [];
  const filteredRoutes = routes.filter((route: any) =>
    vehicle === "all" ? true : normalizeVehicleType(route?.vehicle_type) === vehicle
  );

  if (!filteredRoutes.length) return { ...EMPTY_METRICS };

  const deliveryIds = new Set<string>();
  let totalDistanceM = 0;
  let totalTimeS = 0;
  let totalStops = 0;
  let deliveryStops = 0;

  for (const route of filteredRoutes) {
    totalDistanceM += asNumber(route?.total_distance_m);
    totalTimeS += asNumber(route?.total_time_s);
    totalStops += stopGroups(route).length;
    deliveryStops += deliveryStopsInRoute(route);
    for (const id of deliveryIdsInRoute(route)) {
      deliveryIds.add(id);
    }
  }

  return {
    routeCount: filteredRoutes.length,
    vehicleCount: filteredRoutes.length,
    totalDistanceM,
    totalTimeS,
    totalStops,
    deliveryStops,
    deliveryCount: deliveryIds.size
  };
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (!Number.isFinite(km) || km <= 0) return "0 km";
  if (km >= 100) return `${Math.round(km)} km`;
  return `${Math.round(km * 10) / 10} km`;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function deltaText(value: number, formatter: (value: number) => string): string {
  if (value === 0) return "No change";
  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatter(Math.abs(value))}`;
}

function safeDate(value: unknown): string {
  const text = asText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export default function PlannerDashboardPage() {
  const today = useMemo(() => formatDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>("all");

  const manualListQuery = useManualPlansList();
  const publishedListQuery = usePublishedPlansList();

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    dates.add(today);
    for (const item of (manualListQuery.data?.items || []) as any[]) {
      const date = safeDate(item?.plan_date);
      if (date) dates.add(date);
    }
    for (const item of (publishedListQuery.data?.items || []) as any[]) {
      const date = safeDate(item?.plan_date);
      if (date) dates.add(date);
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [manualListQuery.data?.items, publishedListQuery.data?.items, today]);

  useEffect(() => {
    if (!availableDates.length) return;
    if (!availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const manualQuery = useManualPlan(selectedDate);
  const publishedQuery = usePublishedPlan(selectedDate);

  const manualPlan = useMemo(() => normalizePublishedPlan(manualQuery.data), [manualQuery.data]);
  const publishedPlan = useMemo(() => normalizePublishedPlan(publishedQuery.data), [publishedQuery.data]);

  const manualMetrics = useMemo(
    () => computePlanMetrics(manualPlan, vehicleFilter),
    [manualPlan, vehicleFilter]
  );
  const publishedMetrics = useMemo(
    () => computePlanMetrics(publishedPlan, vehicleFilter),
    [publishedPlan, vehicleFilter]
  );

  const distanceDelta = publishedMetrics.totalDistanceM - manualMetrics.totalDistanceM;
  const timeDelta = publishedMetrics.totalTimeS - manualMetrics.totalTimeS;
  const stopsDelta = publishedMetrics.deliveryStops - manualMetrics.deliveryStops;

  const loading = manualQuery.isLoading || publishedQuery.isLoading;

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="text-xl font-semibold">Plan Dashboard</div>
              <div className="card-subtitle">
                Compare Manual vs Published plans by date and vehicle type.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-steel-500">Date</label>
              <DatePickerInput value={selectedDate} onChange={(value) => setSelectedDate(value)} />
              <label className="text-xs text-steel-500">Vehicle</label>
              <select
                className="h-9 rounded-md border border-steel-200 bg-white px-2 text-xs"
                value={vehicleFilter}
                onChange={(event) => setVehicleFilter(event.target.value as VehicleFilter)}
              >
                <option value="all">All Vehicles</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
              </select>
            </div>
          </div>
          <div className="text-xs text-steel-500">
            Loaded date {selectedDate}. Manual source: {asText(manualQuery.data?.source || "--")} | Published source:{" "}
            {asText(publishedQuery.data?.source || "--")}
          </div>
          {loading ? <div className="mt-2 text-xs text-steel-500">Loading plan metrics...</div> : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="card xl:col-span-5">
            <div className="card-header">
              <div>
                <div className="text-lg font-semibold">Manual</div>
                <div className="card-subtitle">Saved manual plan metrics.</div>
              </div>
            </div>
            <MetricsGrid metrics={manualMetrics} />
          </section>

          <section className="card xl:col-span-5">
            <div className="card-header">
              <div>
                <div className="text-lg font-semibold">Published</div>
                <div className="card-subtitle">Published/active plan metrics.</div>
              </div>
            </div>
            <MetricsGrid metrics={publishedMetrics} />
          </section>

          <section className="card xl:col-span-2">
            <div className="card-header">
              <div>
                <div className="text-lg font-semibold">Delta</div>
                <div className="card-subtitle">Published minus Manual.</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-steel-500">Distance</div>
                <div className="font-semibold">{deltaText(distanceDelta, formatDistance)}</div>
              </div>
              <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-steel-500">Time</div>
                <div className="font-semibold">{deltaText(timeDelta, formatDuration)}</div>
              </div>
              <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-steel-500">Delivery Stops</div>
                <div className="font-semibold">
                  {stopsDelta > 0 ? "+" : ""}
                  {stopsDelta}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function MetricsGrid({ metrics }: { metrics: PlanMetrics }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCell label="Routes" value={String(metrics.routeCount)} />
      <MetricCell label="Vehicles" value={String(metrics.vehicleCount)} />
      <MetricCell label="Deliveries" value={String(metrics.deliveryCount)} />
      <MetricCell label="Distance" value={formatDistance(metrics.totalDistanceM)} />
      <MetricCell label="Duration" value={formatDuration(metrics.totalTimeS)} />
      <MetricCell label="Delivery Stops" value={String(metrics.deliveryStops)} />
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-steel-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

