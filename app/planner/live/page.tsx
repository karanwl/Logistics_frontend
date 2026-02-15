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
            <section className="card !p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-ink-900">Live Vehicle Routes</div>
                <div className="text-xs text-steel-500">{routes.length} vehicles</div>
              </div>

              <div className="overflow-x-auto">
                <div className="grid grid-flow-col auto-cols-[minmax(20rem,1fr)] items-stretch gap-3 pb-1">
                  {routes.map((route) => {
                    const currentStop = route.deliveries.find((delivery) => delivery.status === "current");
                    const vehicleLabel = route.vehicle_id
                      ? `${(route.vehicle_type || "vehicle").toString().toUpperCase()} ${route.vehicle_id}`
                      : (route.vehicle_type || "vehicle").toString().toUpperCase();

                    return (
                      <article
                        key={route.route_key}
                        className="flex h-[72vh] min-h-[34rem] flex-col rounded-xl border border-steel-200 bg-white/90 p-3"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-steel-500">
                              {vehicleLabel}
                            </div>
                            <div className="truncate text-sm font-semibold text-ink-900">{route.driver_name || "Unassigned"}</div>
                            <div className="truncate text-xs text-steel-500">
                              Stops {route.total_stops} | Done {route.done_stops} | Current {route.current_stops}
                              {route.last_completed_at ? ` | Last complete ${route.last_completed_at}` : ""}
                            </div>
                          </div>
                          <div className="rounded-md border border-steel-200 bg-steel-50 px-2 py-0.5 text-[11px] font-semibold text-steel-700">
                            {route.completion_pct}%
                          </div>
                        </div>

                        <div className="mb-2 grid grid-cols-4 gap-1 text-[11px]">
                          <div className="rounded-md bg-emerald-50 px-1 py-0.5 text-center text-emerald-700">
                            {route.done_stops}
                          </div>
                          <div className="rounded-md bg-amber-50 px-1 py-0.5 text-center text-amber-700">
                            {route.current_stops}
                          </div>
                          <div className="rounded-md bg-steel-100 px-1 py-0.5 text-center text-steel-700">
                            {route.upcoming_stops}
                          </div>
                          <div className="rounded-md bg-rose-50 px-1 py-0.5 text-center text-rose-700">
                            {route.failed_stops}
                          </div>
                        </div>

                        <div className="mb-2 rounded-lg border border-steel-100 bg-white/80 px-2 py-1 text-xs">
                          <span className="font-semibold">Current Delivery: </span>
                          {currentStop ? `#${currentStop.delivery_id} ${currentStop.job_name}` : "No active delivery"}
                        </div>

                        {route.deliveries.length === 0 ? (
                          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-steel-200 text-xs text-steel-500">
                            No deliveries found for this route.
                          </div>
                        ) : (
                          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                            {route.deliveries.map((delivery, index) => (
                              <div
                                key={`${route.route_key}-${delivery.delivery_id}-${index}`}
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
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <LivePlanEditor
            today={today}
            planQuery={planQuery}
            onSaved={() => {
              planQuery.refetch();
              liveQuery.refetch();
            }}
          />
        </div>
      </PlannerStateProvider>
    </AppShell>
  );
}

function LivePlanEditor({
  today,
  planQuery,
  onSaved
}: {
  today: string;
  planQuery: any;
  onSaved: () => void;
}) {
  const { plan, setPlan } = usePlannerState();
  const publish = usePublishPlan();
  const [editMode, setEditMode] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const source = String(planQuery.data?.source || "published_plans");
  const selectedDate = String(planQuery.data?.plan_date || today);
  const canEdit = Boolean(planQuery.data?.published) && selectedDate === today;

  useEffect(() => {
    if (!planQuery.data || !planQuery.data.published) {
      setPlan(null);
      return;
    }
    setPlan(normalizePublishedPlan(planQuery.data));
  }, [planQuery.data, setPlan]);

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
      onSaved();
    } catch (error: any) {
      setSaveMessage(error?.message || "Failed to save changes.");
    }
  };

  if (planQuery.isLoading) {
    return (
      <section className="card !p-4">
        <div className="empty-state">Loading today&apos;s editable plan...</div>
      </section>
    );
  }

  if (!planQuery.data?.published) {
    return (
      <section className="card !p-4">
        <div className="text-sm font-semibold">Live Plan Editor</div>
        <div className="card-subtitle mt-1">No published/live plan is available for today yet.</div>
      </section>
    );
  }

  return (
    <>
      <section className="card !p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Edit Today&apos;s Plan In Live</div>
            <div className="card-subtitle">
              Full route editing for {today} is now handled here. Planner published view is read-only.
            </div>
            {source === "deliveries" ? (
              <div className="mt-1 text-xs text-steel-500">
                Source: delivery-backed live plan (no published blob required).
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={editMode ? "default" : "outline"} onClick={() => setEditMode((value) => !value)} disabled={!canEdit}>
              {editMode ? "Edit Mode On" : "Enable Edit Mode"}
            </Button>
            <Button variant="secondary" onClick={saveChanges} disabled={!canEdit || !editMode || !plan || publish.isPending}>
              {publish.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => planQuery.refetch()}>
              Reload Plan
            </Button>
          </div>
        </div>
        {!canEdit ? (
          <div className="mt-2 text-xs text-steel-500">
            Editing is only enabled for today ({today}). Loaded date: {selectedDate}.
          </div>
        ) : null}
        {saveMessage ? <div className="mt-2 text-xs text-steel-500">{saveMessage}</div> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <RouteBoard editable={editMode && canEdit} />
        </div>
        <div className="space-y-6 xl:col-span-4">
          <MapPanel />
          <UnassignedPanel />
        </div>
      </div>
    </>
  );
}
