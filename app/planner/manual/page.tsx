"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import RouteBoard from "@/components/planner/RouteBoard";
import UnassignedPanel from "@/components/planner/UnassignedPanel";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { PlannerStateProvider, usePlannerState } from "@/hooks/usePlannerState";
import { normalizePublishedPlan } from "@/lib/planner/normalizePlan";
import { formatDate } from "@/lib/utils/dates";
import {
  useManualPlan,
  useManualPlansList,
  useManualRecalculate,
  useManualSavePlan
} from "@/lib/api/planner";

function asNumber(value: unknown): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return n;
}

function formatDistance(meters: unknown): string {
  const km = asNumber(meters) / 1000;
  if (!Number.isFinite(km) || km <= 0) return "0 km";
  if (km >= 100) return `${Math.round(km)} km`;
  return `${Math.round(km * 10) / 10} km`;
}

function formatDuration(seconds: unknown): string {
  const totalMinutes = Math.max(0, Math.round(asNumber(seconds) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function routeSummaryFromRoutes(routes: any[]): {
  route_count: number;
  total_distance_m: number;
  total_time_s: number;
  total_stops: number;
} {
  const validRoutes = (routes || []).filter((route) => route && typeof route === "object");
  return {
    route_count: validRoutes.length,
    total_distance_m: validRoutes.reduce((sum, route) => sum + asNumber(route.total_distance_m), 0),
    total_time_s: validRoutes.reduce((sum, route) => sum + asNumber(route.total_time_s), 0),
    total_stops: validRoutes.reduce((sum, route) => sum + ((route.stops || []) as unknown[]).length, 0)
  };
}

function nextVehicleId(routes: any[]): number {
  let highest = 0;
  for (const route of routes || []) {
    const raw = route?.vehicle_id;
    const parsed = Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isNaN(parsed) && parsed > highest) highest = parsed;
  }
  return highest + 1;
}

export default function ManualPlannerPage() {
  return (
    <AppShell>
      <PlannerStateProvider>
        <ManualPlannerWorkspace />
      </PlannerStateProvider>
    </AppShell>
  );
}

function ManualPlannerWorkspace() {
  const { plan, setPlan } = usePlannerState();
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [newVehicleType, setNewVehicleType] = useState("truck");
  const [reloadVehicleId, setReloadVehicleId] = useState("");
  const [message, setMessage] = useState("");

  const planQuery = useManualPlan(selectedDate);
  const listQuery = useManualPlansList();
  const recalcMutation = useManualRecalculate();
  const saveMutation = useManualSavePlan();

  useEffect(() => {
    if (!planQuery.data) {
      setPlan(null);
      return;
    }
    setPlan(normalizePublishedPlan(planQuery.data));
  }, [planQuery.data, setPlan]);

  const vehicleIds = useMemo(
    () => (plan?.routes || []).map((route) => String(route.vehicle_id || "")),
    [plan?.routes]
  );

  useEffect(() => {
    if (!vehicleIds.length) {
      setReloadVehicleId("");
      return;
    }
    if (!reloadVehicleId || !vehicleIds.includes(reloadVehicleId)) {
      setReloadVehicleId(vehicleIds[0]);
    }
  }, [vehicleIds, reloadVehicleId]);

  const savedItems = useMemo(() => {
    const rows = ((listQuery.data?.items || []) as any[]).filter((item) => item?.plan_date);
    return rows.sort((a, b) => String(b.plan_date).localeCompare(String(a.plan_date)));
  }, [listQuery.data?.items]);

  const summary = useMemo(() => {
    const fromMeta = (plan?.meta as any)?.manual_metrics;
    if (fromMeta && typeof fromMeta === "object") {
      return {
        route_count: asNumber((fromMeta as any).route_count),
        total_distance_m: asNumber((fromMeta as any).total_distance_m),
        total_time_s: asNumber((fromMeta as any).total_time_s),
        total_stops: asNumber((fromMeta as any).total_stops),
      };
    }
    return routeSummaryFromRoutes(plan?.routes || []);
  }, [plan?.meta, plan?.routes]);

  const applyRecalculatedRoutes = async (): Promise<any[] | null> => {
    if (!plan) return null;
    const payload = {
      routes: plan.routes || [],
      deliveries: plan.deliveries || [],
      meta: plan.meta || {}
    };
    const recalced = await recalcMutation.mutateAsync(payload);
    const updates = Array.isArray(recalced?.routes) ? recalced.routes : [];
    const updatedRoutes = (plan.routes || []).map((route, index) => {
      const byVehicle = updates.find((u: any) => String(u?.vehicle_id) === String(route.vehicle_id));
      const update = byVehicle || updates[index];
      if (!update) return route;
      return {
        ...route,
        total_distance_m: update.total_distance_m,
        total_time_s: update.total_time_s,
        stop_times: update.stop_times || route.stop_times || [],
        stop_nodes: update.stop_nodes || route.stop_nodes || []
      };
    });

    const nextSummary =
      recalced?.summary && typeof recalced.summary === "object"
        ? recalced.summary
        : routeSummaryFromRoutes(updatedRoutes);
    const nextMeta = {
      ...(plan.meta || {}),
      manual_metrics: nextSummary,
      missing_delivery_coordinates: Array.isArray(recalced?.missing_delivery_coordinates)
        ? recalced.missing_delivery_coordinates
        : []
    };
    setPlan({ ...plan, routes: updatedRoutes, meta: nextMeta });
    return updatedRoutes;
  };

  const handleRecalculate = async () => {
    if (!plan) return;
    setMessage("Recalculating matrix totals...");
    try {
      await applyRecalculatedRoutes();
      setMessage("Matrix totals updated.");
    } catch (error: any) {
      setMessage(error?.message || "Failed to recalculate manual run.");
    }
  };

  const handleSave = async () => {
    if (!plan) return;
    setMessage("Saving manual run...");
    try {
      const currentRoutes = plan.routes || [];
      const fleet = {
        trucks: currentRoutes.filter((route: any) =>
          String(route?.vehicle_type || "").toLowerCase() === "truck"
        ).length,
        vans: currentRoutes.filter((route: any) =>
          String(route?.vehicle_type || "").toLowerCase() === "van"
        ).length
      };
      await saveMutation.mutateAsync({
        plan_date: selectedDate,
        routes: currentRoutes,
        deliveries: plan.deliveries || [],
        meta: plan.meta || {},
        fleet,
        driver_profiles: (plan as any)?.driver_profiles || []
      });
      await Promise.all([listQuery.refetch(), planQuery.refetch()]);
      setMessage(`Manual run saved for ${selectedDate}.`);
    } catch (error: any) {
      setMessage(error?.message || "Failed to save manual run.");
    }
  };

  const handleAddVehicle = () => {
    if (!plan) return;
    const newId = nextVehicleId(plan.routes || []);
    const nextRoutes = [
      ...(plan.routes || []),
      {
        vehicle_id: newId,
        vehicle_type: newVehicleType,
        total_distance_m: 0,
        total_time_s: 0,
        stops: [],
        stop_times: [],
        stop_nodes: []
      }
    ];
    setPlan({ ...plan, routes: nextRoutes });
    setReloadVehicleId(String(newId));
    setMessage(`Added ${newVehicleType.toUpperCase()} vehicle ${newId}.`);
  };

  const handleAddDepotReload = () => {
    if (!plan || !reloadVehicleId) return;
    const nextRoutes = (plan.routes || []).map((route) => {
      if (String(route.vehicle_id) !== reloadVehicleId) return route;
      const nextStops = [...(route.stops || []), [{ type: "depot" as const, label: "Depot - Reload" }]];
      const nextStopNodes = [...(route.stop_nodes || []), 0];
      const nextStopTimes = [...(route.stop_times || []), {}];
      return {
        ...route,
        stops: nextStops,
        stop_nodes: nextStopNodes,
        stop_times: nextStopTimes
      };
    });
    setPlan({ ...plan, routes: nextRoutes });
    setMessage(`Added depot reload to vehicle ${reloadVehicleId}. Recalculate to refresh totals.`);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <section className="card xl:col-span-3">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Manual Runs</div>
            <div className="card-subtitle">Saved human-built runs for comparison.</div>
          </div>
        </div>
        <div className="space-y-2">
          {savedItems.map((item: any) => {
            const runSummary = item?.summary || {};
            return (
              <button
                key={String(item.record_id || item.plan_date)}
                className="w-full rounded-lg border border-steel-100 bg-white/75 px-3 py-2 text-left transition hover:border-ink-900 hover:bg-white"
                onClick={() => setSelectedDate(String(item.plan_date))}
              >
                <div className="text-sm font-semibold">{String(item.plan_date)}</div>
                <div className="text-xs text-steel-500">
                  {formatDistance(runSummary.total_distance_m)} | {formatDuration(runSummary.total_time_s)}
                </div>
              </button>
            );
          })}
          {!listQuery.isLoading && savedItems.length === 0 ? (
            <div className="rounded-lg border border-steel-100 bg-white/70 px-3 py-2 text-xs text-steel-500">
              No manual runs saved yet.
            </div>
          ) : null}
        </div>
      </section>

      <div className="space-y-6 xl:col-span-9">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="text-lg font-semibold">Manual Run Builder</div>
              <div className="card-subtitle">
                Build routes manually from selected-day jobs, then store metrics for dashboards.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DatePickerInput value={selectedDate} onChange={(value) => setSelectedDate(value)} />
              <Button variant="outline" onClick={() => planQuery.refetch()}>
                Load Jobs
              </Button>
              <Button variant="outline" onClick={handleRecalculate} disabled={!plan || recalcMutation.isPending}>
                {recalcMutation.isPending ? "Recalculating..." : "Recalculate"}
              </Button>
              <Button onClick={handleSave} disabled={!plan || saveMutation.isPending || recalcMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Manual Run"}
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-steel-500">Routes</div>
              <div className="text-base font-semibold">{summary.route_count}</div>
            </div>
            <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-steel-500">Distance</div>
              <div className="text-base font-semibold">{formatDistance(summary.total_distance_m)}</div>
            </div>
            <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-steel-500">Duration</div>
              <div className="text-base font-semibold">{formatDuration(summary.total_time_s)}</div>
            </div>
            <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-steel-500">Stops</div>
              <div className="text-base font-semibold">{summary.total_stops}</div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            <div className="rounded-lg border border-steel-100 bg-white p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-steel-500">Add Vehicle</div>
              <div className="mt-2 flex items-center gap-2">
                <select
                  className="h-9 rounded-md border border-steel-200 bg-white px-2 text-xs"
                  value={newVehicleType}
                  onChange={(e) => setNewVehicleType(e.target.value)}
                >
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                </select>
                <Button variant="secondary" size="sm" onClick={handleAddVehicle} disabled={!plan}>
                  Add Vehicle
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-steel-100 bg-white p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-steel-500">Depot Reload</div>
              <div className="mt-2 flex items-center gap-2">
                <select
                  className="h-9 rounded-md border border-steel-200 bg-white px-2 text-xs"
                  value={reloadVehicleId}
                  onChange={(e) => setReloadVehicleId(e.target.value)}
                  disabled={!vehicleIds.length}
                >
                  {!vehicleIds.length ? <option value="">No routes</option> : null}
                  {vehicleIds.map((vehicleId) => (
                    <option key={`reload:${vehicleId}`} value={vehicleId}>
                      Vehicle {vehicleId}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={handleAddDepotReload} disabled={!plan || !reloadVehicleId}>
                  Add Depot Reload
                </Button>
              </div>
            </div>
          </div>

          {message ? <div className="mt-2 text-xs text-steel-500">{message}</div> : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            {planQuery.isLoading ? (
              <section className="card">
                <div className="empty-state">Loading jobs for {selectedDate}...</div>
              </section>
            ) : (
              <RouteBoard editable />
            )}
          </div>
          <div className="space-y-6 xl:col-span-4">
            <UnassignedPanel editable planDate={selectedDate} allowAssignToRoute />
          </div>
        </div>
      </div>
    </div>
  );
}
