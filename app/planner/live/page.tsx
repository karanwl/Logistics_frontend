"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useLiveToday } from "@/lib/api/planner";

type ProgressState = "done" | "current" | "upcoming" | "failed";

type LiveDelivery = {
  delivery_id: string;
  job_name: string;
  sales_order?: string;
  status: ProgressState;
  status_label: string;
  status_time?: string;
  med_skid?: number;
  small_skid?: number;
  large_skid?: number;
  door?: number;
  frame?: number;
  exp_frame?: number;
  box?: number;
};

type LiveRoute = {
  route_key: string;
  driver_name: string;
  total_stops: number;
  done_stops: number;
  current_stops: number;
  upcoming_stops: number;
  failed_stops: number;
  completion_pct: number;
  last_completed_at?: string;
  deliveries: LiveDelivery[];
};

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function stateClasses(state: ProgressState): string {
  if (state === "done") return "bg-emerald-50 border-emerald-200 text-emerald-900";
  if (state === "current") return "bg-amber-50 border-amber-300 text-amber-900";
  if (state === "failed") return "bg-rose-50 border-rose-300 text-rose-900";
  return "bg-steel-50 border-steel-200 text-steel-700";
}

function contentLine(delivery: LiveDelivery): string {
  const chunks: string[] = [];
  if (Number(delivery.door || 0) > 0) chunks.push(`Door ${delivery.door}`);
  if (Number(delivery.frame || 0) > 0) chunks.push(`Frame ${delivery.frame}`);
  if (Number(delivery.exp_frame || 0) > 0) chunks.push(`Exp ${delivery.exp_frame}`);
  if (Number(delivery.med_skid || 0) > 0) chunks.push(`Med ${delivery.med_skid}`);
  if (Number(delivery.small_skid || 0) > 0) chunks.push(`Small ${delivery.small_skid}`);
  if (Number(delivery.large_skid || 0) > 0) chunks.push(`Large ${delivery.large_skid}`);
  if (Number(delivery.box || 0) > 0) chunks.push(`Box ${delivery.box}`);
  return chunks.join(" | ") || "No items";
}

export default function PlannerLiveProgressPage() {
  const liveQuery = useLiveToday();
  const [selectedRouteKey, setSelectedRouteKey] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      liveQuery.refetch();
    }, 10000);
    return () => clearInterval(timer);
  }, [liveQuery.refetch]);

  const summary = liveQuery.data?.summary || {
    done: 0,
    current: 0,
    upcoming: 0,
    failed: 0,
    total: 0,
    completion_pct: 0
  };
  const routes: LiveRoute[] = Array.isArray(liveQuery.data?.routes) ? liveQuery.data.routes : [];

  useEffect(() => {
    if (!routes.length) {
      setSelectedRouteKey("");
      return;
    }
    if (!selectedRouteKey || !routes.some((route) => route.route_key === selectedRouteKey)) {
      setSelectedRouteKey(routes[0].route_key);
    }
  }, [routes, selectedRouteKey]);

  const selectedRoute = routes.find((route) => route.route_key === selectedRouteKey) ?? routes[0] ?? null;
  const selectedCurrentStop = selectedRoute?.deliveries.find((delivery) => delivery.status === "current");

  return (
    <AppShell>
      <div className="grid gap-4">
        <section className="card !p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Today&apos;s Live Route Progress</div>
              <div className="card-subtitle">
                Date {liveQuery.data?.date || "business date"}. SQL-backed live feed. Auto-refreshes every 10 seconds.
              </div>
            </div>
            <button
              className="btn btn-secondary h-9 min-h-0 px-3 py-1.5 text-xs"
              onClick={() => {
                liveQuery.refetch();
              }}
            >
              Refresh
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-xs font-semibold text-emerald-900">Done</div>
              <div className="text-sm text-emerald-800">{summary.done}</div>
            </div>
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
              <div className="text-xs font-semibold text-amber-900">Current</div>
              <div className="text-sm text-amber-800">{summary.current}</div>
            </div>
            <div className="rounded-lg border border-steel-200 bg-steel-50 px-3 py-2">
              <div className="text-xs font-semibold text-steel-700">Upcoming</div>
              <div className="text-sm text-steel-600">{summary.upcoming}</div>
            </div>
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2">
              <div className="text-xs font-semibold text-rose-900">Failed</div>
              <div className="text-sm text-rose-800">{summary.failed}</div>
            </div>
          </div>

          <div className="mt-2 text-xs text-steel-500">
            Completion: {summary.completion_pct}% ({summary.done}/{summary.total || 0})
            {liveQuery.data?.last_status_update_at ? ` | Last update ${liveQuery.data.last_status_update_at}` : ""}
          </div>
        </section>

        {liveQuery.isLoading && (
          <section className="card !p-4">
            <div className="empty-state">Loading live route progress...</div>
          </section>
        )}

        {!liveQuery.isLoading && routes.length === 0 && (
          <section className="card !p-4">
            <div className="empty-state">No deliveries found for today.</div>
          </section>
        )}

        {!liveQuery.isLoading && routes.length > 0 && (
          <section className="grid gap-4 xl:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.6fr)]">
            <aside className="card !p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-ink-900">Routes In Motion</div>
                <div className="text-xs text-steel-500">{routes.length} routes</div>
              </div>

              <div className="grid gap-2">
                {routes.map((route) => {
                  const isActive = selectedRoute?.route_key === route.route_key;

                  return (
                    <button
                      key={route.route_key}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        isActive
                          ? "border-ink-900 bg-ink-900 text-white shadow-soft"
                          : "border-steel-200 bg-white/85 text-ink-900 hover:border-steel-300"
                      }`}
                      onClick={() => setSelectedRouteKey(route.route_key)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold">{route.driver_name}</div>
                        <div className={`text-[11px] ${isActive ? "text-white/80" : "text-steel-500"}`}>
                          {route.completion_pct}%
                        </div>
                      </div>
                      <div className={`truncate text-xs ${isActive ? "text-white/80" : "text-steel-500"}`}>
                        {route.total_stops} stops | Done {route.done_stops} | Current {route.current_stops}
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1 text-[11px]">
                        <div className={`rounded-md px-1 py-0.5 text-center ${isActive ? "bg-emerald-300/30" : "bg-emerald-50 text-emerald-700"}`}>
                          {route.done_stops}
                        </div>
                        <div className={`rounded-md px-1 py-0.5 text-center ${isActive ? "bg-amber-300/30" : "bg-amber-50 text-amber-700"}`}>
                          {route.current_stops}
                        </div>
                        <div className={`rounded-md px-1 py-0.5 text-center ${isActive ? "bg-steel-300/35" : "bg-steel-100 text-steel-700"}`}>
                          {route.upcoming_stops}
                        </div>
                        <div className={`rounded-md px-1 py-0.5 text-center ${isActive ? "bg-rose-300/30" : "bg-rose-50 text-rose-700"}`}>
                          {route.failed_stops}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="card !p-4">
              {!selectedRoute ? (
                <div className="empty-state">Select a route to view live stop progression.</div>
              ) : (
                <>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{selectedRoute.driver_name}</div>
                      <div className="card-subtitle">
                        Stops {selectedRoute.total_stops} | Done {selectedRoute.done_stops} | Current {selectedRoute.current_stops}
                        {selectedRoute.last_completed_at ? ` | Last complete ${selectedRoute.last_completed_at}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
                      Done: {selectedRoute.done_stops}
                    </div>
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      Current: {selectedRoute.current_stops}
                    </div>
                    <div className="rounded-lg border border-steel-200 bg-steel-50 px-2 py-1 text-xs text-steel-700">
                      Upcoming: {selectedRoute.upcoming_stops}
                    </div>
                    <div className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-900">
                      Failed: {selectedRoute.failed_stops}
                    </div>
                  </div>

                  <div className="mb-3 rounded-lg border border-steel-100 bg-white/80 px-3 py-2 text-sm">
                    <span className="font-semibold">Current Delivery: </span>
                    {selectedCurrentStop ? `#${selectedCurrentStop.delivery_id} ${selectedCurrentStop.job_name}` : "No active delivery"}
                  </div>

                  {selectedRoute.deliveries.length === 0 ? (
                    <div className="empty-state">No deliveries found for this route.</div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {selectedRoute.deliveries.map((delivery, index) => (
                        <div
                          key={`${selectedRoute.route_key}-${delivery.delivery_id}-${index}`}
                          className={`rounded-lg border px-3 py-2 ${stateClasses(delivery.status)}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                #{delivery.delivery_id} {delivery.job_name}
                              </div>
                              <div className="text-xs opacity-90">
                                {asText(delivery.sales_order) ? `SO ${delivery.sales_order}` : "Sales Order --"}
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <div className="font-semibold">{delivery.status_label || "Upcoming"}</div>
                              <div>{asText(delivery.status_time) || "--"}</div>
                            </div>
                          </div>
                          <div className="mt-1 text-[11px] opacity-85">{contentLine(delivery)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </section>
        )}
      </div>
    </AppShell>
  );
}
