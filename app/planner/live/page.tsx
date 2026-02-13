"use client";

import { useEffect, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import { useDeliveries, usePublishedPlan } from "@/lib/api/planner";
import { formatDate } from "@/lib/utils/dates";

type ProgressState = "done" | "current" | "upcoming" | "failed";

type ProgressDelivery = {
  deliveryId: string;
  jobName: string;
  salesOrder: string;
  status: ProgressState;
  statusLabel: string;
  statusTime: string;
};

type ProgressRoute = {
  routeKey: string;
  vehicleLabel: string;
  driverLabel: string;
  distanceLabel: string;
  durationLabel: string;
  deliveries: ProgressDelivery[];
};

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function statusFromDelivery(delivery: any): ProgressState {
  const raw = asText(delivery?.status).toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const deliveredAt = asText(delivery?.delivered_at);
  if (raw === "failed") return "failed";
  if (raw === "delivered" || deliveredAt || Boolean(delivery?.ps_delivered)) return "done";
  if (raw === "en_route" || raw === "arrived") return "current";
  return "upcoming";
}

function statusLabel(delivery: any, status: ProgressState): string {
  const raw = asText(delivery?.status).toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (status === "done") return "Delivered";
  if (status === "failed") return "Failed";
  if (raw === "arrived") return "Arrived";
  if (raw === "en_route") return "En Route";
  return "Upcoming";
}

function statusTime(delivery: any, status: ProgressState): string {
  if (status === "done") {
    return asText(delivery?.delivered_at || delivery?.status_updated_at);
  }
  if (status === "current" || status === "failed") {
    return asText(delivery?.status_updated_at || delivery?.arrived_at);
  }
  return "";
}

function stateClasses(state: ProgressState): string {
  if (state === "done") return "bg-emerald-50 border-emerald-200 text-emerald-900";
  if (state === "current") return "bg-amber-50 border-amber-300 text-amber-900";
  if (state === "failed") return "bg-rose-50 border-rose-300 text-rose-900";
  return "bg-steel-50 border-steel-200 text-steel-700";
}

function percent(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function routeDistanceLabel(route: any): string {
  const meters = Number(route?.total_distance_m ?? route?.distance_m ?? route?.distance);
  if (Number.isNaN(meters) || meters <= 0) return "--";
  const km = meters / 1000;
  if (km >= 100) return `${Math.round(km)} km`;
  return `${Math.round(km * 10) / 10} km`;
}

function routeDurationLabel(route: any): string {
  const seconds = Number(route?.total_time_s ?? route?.time_s ?? route?.duration_s);
  if (Number.isNaN(seconds) || seconds <= 0) return "--";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function routeDriver(route: any): string {
  const profile = route?.driver_profile;
  if (typeof profile === "string" && profile.trim()) return profile.trim();
  if (profile && typeof profile === "object") {
    const name = asText(profile?.name);
    const email = asText(profile?.email);
    if (name) return name;
    if (email) return email;
  }
  const driver = asText(route?.driver);
  return driver || "--";
}

function parseTokenDeliveryId(tokenRaw: unknown): string {
  const token = asText(tokenRaw);
  if (!token) return "";
  if (token.toLowerCase() === "depot" || token.toLowerCase() === "depot - reload") return "";
  return asText(token.split("_Part")[0]);
}

function extractRouteDeliveryOrder(route: any): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const addId = (idRaw: unknown) => {
    const id = asText(idRaw);
    if (!id || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };

  if (Array.isArray(route?.stops)) {
    for (const stopGroup of route.stops) {
      const items = Array.isArray(stopGroup) ? stopGroup : [stopGroup];
      for (const item of items) {
        if (typeof item === "string" || typeof item === "number") {
          addId(parseTokenDeliveryId(item));
          continue;
        }
        if (item && typeof item === "object") {
          const type = asText((item as any).type).toLowerCase();
          if (type === "depot") continue;
          addId((item as any).id ?? (item as any).delivery_id ?? (item as any).job_id);
        }
      }
    }
  } else if (Array.isArray(route?.jobs)) {
    for (const stopGroup of route.jobs) {
      const items = Array.isArray(stopGroup) ? stopGroup : [stopGroup];
      for (const token of items) {
        addId(parseTokenDeliveryId(token));
      }
    }
  }

  return ordered;
}

function normalizeRouteProgress(route: any, liveById: Map<string, any>, planById: Map<string, any>): ProgressRoute {
  const deliveryIds = extractRouteDeliveryOrder(route);
  const deliveries = deliveryIds.map((deliveryId) => {
    const live = liveById.get(deliveryId);
    const plan = planById.get(deliveryId);
    const source = live || plan || {};
    const status = statusFromDelivery(source);
    return {
      deliveryId,
      jobName: asText(source?.job_name || source?.["Job Name"]) || `Delivery ${deliveryId}`,
      salesOrder: asText(source?.sales_order || source?.["Sales Order"]),
      status,
      statusLabel: statusLabel(source, status),
      statusTime: statusTime(source, status)
    };
  });

  if (!deliveries.some((d) => d.status === "current")) {
    const doneCount = deliveries.filter((d) => d.status === "done").length;
    if (doneCount > 0) {
      const nextIdx = deliveries.findIndex((d) => d.status === "upcoming");
      if (nextIdx >= 0) {
        deliveries[nextIdx] = {
          ...deliveries[nextIdx],
          status: "current",
          statusLabel: "Next Up"
        };
      }
    }
  }

  const routeId = asText(route?.vehicle_id ?? route?.v_id ?? route?.vehicleId ?? route?.id);
  const vehicleType = asText((route?.vehicle_type ?? route?.v_type ?? route?.vehicleType) || "vehicle");

  return {
    routeKey: routeId || Math.random().toString(36).slice(2),
    vehicleLabel: `${vehicleType.toUpperCase()} #${routeId || "-"}`,
    driverLabel: routeDriver(route),
    distanceLabel: routeDistanceLabel(route),
    durationLabel: routeDurationLabel(route),
    deliveries
  };
}

function buildLiveMap(deliveries: any[]): Map<string, any> {
  const map = new Map<string, any>();
  for (const item of deliveries || []) {
    const id = asText(item?.delivery_id || item?.id || item?.record_id);
    if (!id) continue;
    map.set(id, item);
  }
  return map;
}

export default function PlannerLiveProgressPage() {
  const today = useMemo(() => formatDate(new Date()), []);
  const planQuery = usePublishedPlan(today);
  const deliveriesQuery = useDeliveries();

  useEffect(() => {
    const timer = setInterval(() => {
      planQuery.refetch();
      deliveriesQuery.refetch();
    }, 15000);
    return () => clearInterval(timer);
  }, [planQuery, deliveriesQuery]);

  const plan = planQuery.data;
  const routes = Array.isArray(plan?.routes) ? plan.routes : [];
  const planDeliveries = Array.isArray(plan?.deliveries) ? plan.deliveries : [];
  const liveDeliveries = Array.isArray(deliveriesQuery.data?.deliveries) ? deliveriesQuery.data?.deliveries : [];

  const liveById = useMemo(() => buildLiveMap(liveDeliveries), [liveDeliveries]);
  const planById = useMemo(() => buildLiveMap(planDeliveries), [planDeliveries]);

  const progressRoutes: ProgressRoute[] = useMemo(
    () => routes.map((route: any) => normalizeRouteProgress(route, liveById, planById)),
    [routes, liveById, planById]
  );

  const doneCount = progressRoutes.reduce(
    (sum: number, route: ProgressRoute) =>
      sum + route.deliveries.filter((d: ProgressDelivery) => d.status === "done").length,
    0
  );
  const currentCount = progressRoutes.reduce(
    (sum: number, route: ProgressRoute) =>
      sum + route.deliveries.filter((d: ProgressDelivery) => d.status === "current").length,
    0
  );
  const upcomingCount = progressRoutes.reduce(
    (sum: number, route: ProgressRoute) =>
      sum + route.deliveries.filter((d: ProgressDelivery) => d.status === "upcoming").length,
    0
  );
  const failedCount = progressRoutes.reduce(
    (sum: number, route: ProgressRoute) =>
      sum + route.deliveries.filter((d: ProgressDelivery) => d.status === "failed").length,
    0
  );
  const total = doneCount + currentCount + upcomingCount + failedCount;

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="text-xl font-semibold">Today&apos;s Live Route Progress</div>
              <div className="card-subtitle">
                Date {today}. Auto-refreshes every 15 seconds.
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                planQuery.refetch();
                deliveriesQuery.refetch();
              }}
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              <div className="font-semibold text-emerald-900">Done</div>
              <div className="text-emerald-800">{doneCount}</div>
            </div>
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
              <div className="font-semibold text-amber-900">Current</div>
              <div className="text-amber-800">{currentCount}</div>
            </div>
            <div className="rounded-lg border border-steel-200 bg-steel-50 px-3 py-2 text-sm">
              <div className="font-semibold text-steel-700">Upcoming</div>
              <div className="text-steel-600">{upcomingCount}</div>
            </div>
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm">
              <div className="font-semibold text-rose-900">Failed</div>
              <div className="text-rose-800">{failedCount}</div>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-3 text-xs text-steel-500">
              Completion: {percent(doneCount, total)} ({doneCount}/{total})
            </div>
          )}
        </section>

        {planQuery.isLoading && (
          <section className="card">
            <div className="empty-state">Loading today&apos;s published route...</div>
          </section>
        )}

        {!planQuery.isLoading && !plan?.published && (
          <section className="card">
            <div className="empty-state">No published plan found for today ({today}).</div>
          </section>
        )}

        {!planQuery.isLoading && plan?.published && progressRoutes.length === 0 && (
          <section className="card">
            <div className="empty-state">No routes found in today&apos;s published plan.</div>
          </section>
        )}

        {progressRoutes.map((route: ProgressRoute) => {
          const routeDone = route.deliveries.filter((d: ProgressDelivery) => d.status === "done").length;
          const routeCurrent = route.deliveries.filter((d: ProgressDelivery) => d.status === "current").length;
          const routeUpcoming = route.deliveries.filter((d: ProgressDelivery) => d.status === "upcoming").length;
          const routeFailed = route.deliveries.filter((d: ProgressDelivery) => d.status === "failed").length;
          const routeCurrentStop = route.deliveries.find((d: ProgressDelivery) => d.status === "current");

          return (
            <section key={route.routeKey} className="card">
              <div className="card-header">
                <div>
                  <div className="text-lg font-semibold">{route.vehicleLabel}</div>
                  <div className="card-subtitle">
                    Driver: {route.driverLabel} | {route.distanceLabel} | {route.durationLabel}
                  </div>
                </div>
                <div className="text-right text-xs text-steel-500">
                  <div>Done: {routeDone}</div>
                  <div>Current: {routeCurrent}</div>
                  <div>Upcoming: {routeUpcoming}</div>
                  {routeFailed > 0 && <div className="text-rose-600">Failed: {routeFailed}</div>}
                </div>
              </div>

              <div className="mb-3 rounded-lg border border-steel-100 bg-white/75 px-3 py-2 text-sm">
                <span className="font-semibold">Current Delivery: </span>
                {routeCurrentStop ? `#${routeCurrentStop.deliveryId} ${routeCurrentStop.jobName}` : "No active delivery"}
              </div>

              {route.deliveries.length === 0 ? (
                <div className="empty-state">No delivery stops found for this route.</div>
              ) : (
                <div className="grid gap-2">
                  {route.deliveries.map((delivery: ProgressDelivery, index: number) => (
                    <div
                      key={`${route.routeKey}-${delivery.deliveryId}-${index}`}
                      className={`rounded-lg border px-3 py-2 ${stateClasses(delivery.status)}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            #{delivery.deliveryId} {delivery.jobName}
                          </div>
                          <div className="text-xs opacity-90">
                            {delivery.salesOrder ? `SO ${delivery.salesOrder}` : "Sales Order --"}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-semibold">{delivery.statusLabel}</div>
                          <div>{delivery.statusTime || "--"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
