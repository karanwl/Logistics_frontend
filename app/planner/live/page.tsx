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
  status: ProgressState;
  status_label?: string;
  status_time?: string;
};

type LiveRoute = {
  route_key: string;
  vehicle_id?: string;
  vehicle_type?: string;
  driver_name: string;
  deliveries: LiveDelivery[];
};

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function mergePlanWithLive(planPayload: any, liveRoutes: LiveRoute[]) {
  const normalized = normalizePublishedPlan(planPayload);
  if (!normalized || !Array.isArray(normalized.deliveries)) return normalized;

  const liveByDeliveryId = new Map<
    string,
    {
      status: ProgressState;
      status_label?: string;
      status_time?: string;
      driver_name?: string;
      route_key?: string;
      vehicle_id?: string;
      vehicle_type?: string;
    }
  >();

  for (const route of liveRoutes || []) {
    for (const delivery of route.deliveries || []) {
      const deliveryId = asText(delivery.delivery_id);
      if (!deliveryId) continue;
      liveByDeliveryId.set(deliveryId, {
        status: delivery.status,
        status_label: delivery.status_label,
        status_time: delivery.status_time,
        driver_name: route.driver_name,
        route_key: route.route_key,
        vehicle_id: route.vehicle_id,
        vehicle_type: route.vehicle_type
      });
    }
  }

  const deliveries = normalized.deliveries.map((delivery: any) => {
    const deliveryId = asText(delivery?.id || delivery?.delivery_id);
    if (!deliveryId) return delivery;
    const live = liveByDeliveryId.get(deliveryId);
    if (!live) return delivery;
    return {
      ...delivery,
      id: deliveryId,
      delivery_id: deliveryId,
      status: live.status || delivery.status,
      progress_state: live.status || delivery.progress_state,
      status_label: live.status_label || delivery.status_label,
      status_time: live.status_time || delivery.status_time,
      status_updated_at: live.status_time || delivery.status_updated_at,
      driver_name: live.driver_name || delivery.driver_name || delivery.driver,
      driver: delivery.driver || live.driver_name,
      live_route_key: live.route_key,
      live_vehicle_id: live.vehicle_id,
      live_vehicle_type: live.vehicle_type
    };
  });

  return { ...normalized, deliveries };
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

  return (
    <AppShell>
      <PlannerStateProvider>
        <LivePlannerWorkspace today={today} liveQuery={liveQuery} planQuery={planQuery} />
      </PlannerStateProvider>
    </AppShell>
  );
}

function LivePlannerWorkspace({
  today,
  liveQuery,
  planQuery
}: {
  today: string;
  liveQuery: any;
  planQuery: any;
}) {
  const { plan, setPlan } = usePlannerState();
  const publish = usePublishPlan();
  const [editMode, setEditMode] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");

  const summary = liveQuery.data?.summary || {
    done: 0,
    current: 0,
    upcoming: 0,
    failed: 0,
    total: 0,
    completion_pct: 0
  };
  const liveRoutes: LiveRoute[] = useMemo(
    () => (Array.isArray(liveQuery.data?.routes) ? liveQuery.data.routes : []),
    [liveQuery.data?.routes]
  );
  const selectedDate = String(planQuery.data?.plan_date || today);
  const source = String(planQuery.data?.source || "published_plans");
  const canEdit = Boolean(planQuery.data?.published) && selectedDate === today;

  useEffect(() => {
    if (!planQuery.data || !planQuery.data.published) {
      setPlan(null);
      return;
    }
    setPlan(mergePlanWithLive(planQuery.data, liveRoutes));
  }, [planQuery.data, liveRoutes, setPlan]);

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
            <div className="text-lg font-semibold">Live Planner</div>
            <div className="card-subtitle">
              Same planner board, with live delivery updates shown directly inside each stop card.
            </div>
            <div className="mt-1 text-xs text-steel-500">
              Date {liveQuery.data?.date || today}
              {liveQuery.data?.last_status_update_at ? ` | Last update ${liveQuery.data.last_status_update_at}` : ""}
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
        </div>

        <div className="space-y-6 xl:col-span-4">
          <MapPanel />
          <UnassignedPanel />
        </div>
      </div>
    </div>
  );
}
