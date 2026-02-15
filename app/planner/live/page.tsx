"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import RouteBoard from "@/components/planner/RouteBoard";
import MapPanel from "@/components/planner/MapPanel";
import UnassignedPanel from "@/components/planner/UnassignedPanel";
import { Button } from "@/components/ui/button";
import { PlannerStateProvider, usePlannerState } from "@/hooks/usePlannerState";
import { useLiveToday, usePublishedPlan, usePublishPlan } from "@/lib/api/planner";
import { normalizePublishedPlan } from "@/lib/planner/normalizePlan";
import { formatDate } from "@/lib/utils/dates";

type ProgressState = "done" | "current" | "upcoming" | "failed";
type StatusFilter = "all" | ProgressState;

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
  vehicle_id?: string;
  vehicle_type?: string;
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

type LiveDeliveryRow = LiveDelivery & {
  route_key: string;
  vehicle_label: string;
  driver_name: string;
};

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function vehicleLabel(route: LiveRoute): string {
  const type = (route.vehicle_type || "vehicle").toString().toUpperCase();
  return route.vehicle_id ? `${type} ${route.vehicle_id}` : type;
}

function statusShellClass(state: ProgressState): string {
  if (state === "done") return "border-emerald-200 bg-emerald-50/85";
  if (state === "current") return "border-amber-300 bg-amber-50/85";
  if (state === "failed") return "border-rose-300 bg-rose-50/85";
  return "border-steel-200 bg-steel-50/85";
}

function statusLabelClass(state: ProgressState): string {
  if (state === "done") return "text-emerald-800";
  if (state === "current") return "text-amber-900";
  if (state === "failed") return "text-rose-900";
  return "text-steel-700";
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

function flattenLiveRows(routes: LiveRoute[]): LiveDeliveryRow[] {
  const rows: LiveDeliveryRow[] = [];
  for (const route of routes) {
    const label = vehicleLabel(route);
    for (const delivery of route.deliveries || []) {
      rows.push({
        ...delivery,
        route_key: route.route_key,
        vehicle_label: label,
        driver_name: route.driver_name || "Unassigned"
      });
    }
  }
  return rows;
}

export default function PlannerLiveProgressPage() {
  const liveQuery = useLiveToday();
  const today = useMemo(() => formatDate(new Date()), []);
  const planQuery = usePublishedPlan(today);

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

  return (
    <AppShell>
      <PlannerStateProvider>
        <LiveOperationsWorkspace
          today={today}
          summary={summary}
          routes={routes}
          liveQuery={liveQuery}
          planQuery={planQuery}
        />
      </PlannerStateProvider>
    </AppShell>
  );
}

function LiveOperationsWorkspace({
  today,
  summary,
  routes,
  liveQuery,
  planQuery
}: {
  today: string;
  summary: any;
  routes: LiveRoute[];
  liveQuery: any;
  planQuery: any;
}) {
  const { plan, setPlan } = usePlannerState();
  const publish = usePublishPlan();

  const [editMode, setEditMode] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedRouteKey, setSelectedRouteKey] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const selectedDate = String(planQuery.data?.plan_date || today);
  const source = String(planQuery.data?.source || "published_plans");
  const canEdit = Boolean(planQuery.data?.published) && selectedDate === today;

  useEffect(() => {
    if (!planQuery.data || !planQuery.data.published) {
      setPlan(null);
      return;
    }
    setPlan(normalizePublishedPlan(planQuery.data));
  }, [planQuery.data, setPlan]);

  useEffect(() => {
    if (selectedRouteKey === "all") return;
    const stillExists = routes.some((route) => route.route_key === selectedRouteKey);
    if (!stillExists) {
      setSelectedRouteKey("all");
    }
  }, [routes, selectedRouteKey]);

  const allRows = useMemo(() => flattenLiveRows(routes), [routes]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (selectedRouteKey !== "all" && row.route_key !== selectedRouteKey) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!needle) return true;
      const hay = `${row.delivery_id} ${row.job_name} ${row.sales_order || ""} ${row.driver_name} ${row.vehicle_label}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [allRows, search, selectedRouteKey, statusFilter]);

  const selectedRoute = useMemo(() => {
    if (selectedRouteKey === "all") return null;
    return routes.find((route) => route.route_key === selectedRouteKey) || null;
  }, [routes, selectedRouteKey]);

  const saveChanges = async () => {
    if (!selectedDate || !plan || !canEdit) return;
    setSaveMessage("Saving changes...");
    try {
      await publish.mutateAsync({
        routes: plan.routes || [],
        deliveries: plan.deliveries || [],
        meta: plan.meta || {},
        fleet: (plan.meta as any)?.fleet || {},
        plan_date: selectedDate,
        driver_profiles: (plan as any)?.driver_profiles || []
      } as any);
      setSaveMessage("Changes saved. Drivers were notified.");
      liveQuery.refetch();
      planQuery.refetch();
    } catch (error: any) {
      setSaveMessage(error?.message || "Failed to save changes.");
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card !p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Live Operations Workspace</div>
            <div className="card-subtitle">
              Track live delivery execution and edit today&apos;s route plan in one screen.
            </div>
            <div className="mt-1 text-xs text-steel-500">
              Date {liveQuery.data?.date || today}
              {liveQuery.data?.last_status_update_at ? ` | Last status update ${liveQuery.data.last_status_update_at}` : ""}
              {source === "deliveries" ? " | Source: delivery-backed live plan" : ""}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-steel-200 bg-steel-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-steel-600">
              Auto Refresh 10s
            </div>
            <Button variant="outline" onClick={() => liveQuery.refetch()}>
              Refresh Live
            </Button>
            <Button variant="outline" onClick={() => planQuery.refetch()}>
              Reload Plan
            </Button>
            <Button variant={editMode ? "default" : "outline"} onClick={() => setEditMode((value) => !value)} disabled={!canEdit}>
              {editMode ? "Editing Enabled" : "Enable Editing"}
            </Button>
            <Button variant="secondary" onClick={saveChanges} disabled={!canEdit || !editMode || !plan || publish.isPending}>
              {publish.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900">Done</div>
            <div className="text-base font-semibold text-emerald-800">{summary.done}</div>
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">Current</div>
            <div className="text-base font-semibold text-amber-800">{summary.current}</div>
          </div>
          <div className="rounded-lg border border-steel-200 bg-steel-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-steel-700">Upcoming</div>
            <div className="text-base font-semibold text-steel-700">{summary.upcoming}</div>
          </div>
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-900">Failed</div>
            <div className="text-base font-semibold text-rose-800">{summary.failed}</div>
          </div>
          <div className="rounded-lg border border-ink-900/20 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-steel-600">Completion</div>
            <div className="text-base font-semibold text-ink-900">{summary.completion_pct}%</div>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-steel-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ink-900 to-accent"
            style={{ width: `${Math.max(0, Math.min(100, Number(summary.completion_pct) || 0))}%` }}
          />
        </div>

        {!canEdit ? (
          <div className="mt-3 text-xs text-steel-500">
            Editing is only enabled for today ({today}). Loaded plan date: {selectedDate}.
          </div>
        ) : null}
        {saveMessage ? <div className="mt-2 text-xs text-steel-500">{saveMessage}</div> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {planQuery.isLoading ? (
            <section className="card">
              <div className="empty-state">Loading today&apos;s editable plan...</div>
            </section>
          ) : !planQuery.data?.published ? (
            <section className="card">
              <div className="empty-state">No published/live plan is available for today yet.</div>
            </section>
          ) : (
            <RouteBoard editable={editMode && canEdit} />
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <MapPanel />
            <UnassignedPanel />
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <section className="card !p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="panel-title">Vehicle Feed</div>
              <div className="text-xs text-steel-500">{routes.length} vehicles</div>
            </div>

            {liveQuery.isLoading ? (
              <div className="empty-state">Loading live routes...</div>
            ) : routes.length === 0 ? (
              <div className="empty-state">No live routes found for today.</div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selectedRouteKey === "all"
                      ? "border-ink-900/40 bg-ink-900 text-white"
                      : "border-steel-200 bg-white/70 text-ink-900 hover:border-steel-300"
                  }`}
                  onClick={() => setSelectedRouteKey("all")}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide">All Vehicles</div>
                  <div className={`text-[11px] ${selectedRouteKey === "all" ? "text-white/80" : "text-steel-500"}`}>
                    {allRows.length} deliveries visible
                  </div>
                </button>

                <div className="max-h-[19rem] space-y-2 overflow-y-auto pr-1 scroll-area">
                  {routes.map((route) => {
                    const active = selectedRouteKey === route.route_key;
                    const current = (route.deliveries || []).find((delivery) => delivery.status === "current");
                    return (
                      <button
                        key={route.route_key}
                        type="button"
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          active
                            ? "border-accent/60 bg-accent/10"
                            : "border-steel-200 bg-white/70 hover:border-steel-300"
                        }`}
                        onClick={() => setSelectedRouteKey(route.route_key)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold uppercase tracking-wide text-steel-500">
                              {vehicleLabel(route)}
                            </div>
                            <div className="truncate text-sm font-semibold text-ink-900">{route.driver_name || "Unassigned"}</div>
                          </div>
                          <div className="rounded-md border border-steel-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-steel-700">
                            {route.completion_pct}%
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-steel-500">
                          Done {route.done_stops} | Current {route.current_stops} | Upcoming {route.upcoming_stops} | Failed {route.failed_stops}
                        </div>
                        {current ? (
                          <div className="mt-1 truncate text-[11px] text-amber-800">
                            Current: #{current.delivery_id} {current.job_name}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="card !p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="panel-title">Delivery Feed</div>
              <div className="text-xs text-steel-500">
                {selectedRoute ? `${vehicleLabel(selectedRoute)}` : "All vehicles"}
              </div>
            </div>

            <div className="mb-2 grid gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by delivery, job, SO, driver..."
                className="h-9 rounded-lg border border-steel-200 bg-white/80 px-3 text-sm text-ink-900"
              />
              <div className="flex flex-wrap gap-1">
                {(["all", "current", "upcoming", "done", "failed"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStatusFilter(item)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                      statusFilter === item
                        ? "border-ink-900/50 bg-ink-900 text-white"
                        : "border-steel-200 bg-white/80 text-steel-600 hover:border-steel-300"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {liveQuery.isLoading ? (
              <div className="empty-state">Loading deliveries...</div>
            ) : filteredRows.length === 0 ? (
              <div className="empty-state">No deliveries match the current filter.</div>
            ) : (
              <div className="max-h-[38rem] space-y-2 overflow-y-auto pr-1 scroll-area">
                {filteredRows.map((row) => (
                  <article
                    key={`${row.route_key}:${row.delivery_id}`}
                    className={`rounded-lg border px-3 py-2 ${statusShellClass(row.status)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          #{row.delivery_id} {row.job_name}
                        </div>
                        <div className="truncate text-[11px] text-steel-500">
                          {row.vehicle_label} | {row.driver_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-semibold uppercase tracking-wide ${statusLabelClass(row.status)}`}>
                          {row.status_label || row.status}
                        </div>
                        <div className="text-[11px] text-steel-500">{asText(row.status_time) || "--"}</div>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-steel-600">
                      {asText(row.sales_order) ? `SO ${row.sales_order} | ` : ""}
                      {contentLine(row)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
