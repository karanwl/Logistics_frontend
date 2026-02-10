"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { usePublishedPlan, usePublishedPlansList } from "@/lib/api/planner";
import { PlannerStateProvider, usePlannerState } from "@/hooks/usePlannerState";
import UnassignedPanel from "@/components/planner/UnassignedPanel";
import RouteBoard from "@/components/planner/RouteBoard";
import MapPanel from "@/components/planner/MapPanel";
import { RouteDTO, RouteStopItem } from "@/lib/types/planner";

export default function PublishedPlansPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const listQuery = usePublishedPlansList();
  const planQuery = usePublishedPlan(selectedDate || "");
  const items = (listQuery.data?.items || []) as any[];

  return (
    <AppShell>
      <PlannerStateProvider>
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="card xl:col-span-3">
            <div className="card-header">
              <div>
                <div className="text-xl font-semibold">Published Plans</div>
                <div className="card-subtitle">Select a plan to preview routes.</div>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.record_id || item.plan_date}
                  className="w-full text-left rounded-lg border border-steel-100 bg-white/75 px-3 py-2 transition hover:border-ink-900 hover:bg-white"
                  onClick={() => setSelectedDate(item.plan_date)}
                >
                  <div className="text-sm font-semibold">{item.plan_date}</div>
                  <div className="text-xs text-steel-500">{item.published_by || "--"}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="xl:col-span-9">
            <PublishedPlanPreview plan={planQuery.data} />
          </div>
        </div>
      </PlannerStateProvider>
    </AppShell>
  );
}

function normalizePublishedPlan(plan: any) {
  if (!plan || !Array.isArray(plan.routes)) return plan;
  const deliveries = Array.isArray(plan.deliveries) ? plan.deliveries : [];
  const deliveriesById = new Map<string, any>(deliveries.map((d: any) => [String(d.id), d]));

  const tokenToItem = (token: any): RouteStopItem => {
    const t = String(token || "").trim();
    if (!t) return { type: "delivery", label: "Stop" };
    if (t.toLowerCase() === "depot") return { type: "depot", label: "Depot" };
    if (t.toLowerCase() === "depot - reload") return { type: "depot", label: "Depot - Reload" };
    const baseId = t.split("_Part")[0].trim();
    const d = deliveriesById.get(baseId);
    const item: RouteStopItem = {
      type: "delivery",
      id: baseId,
      job_name: d?.job_name || `Unknown (${baseId})`
    };
    if (t.includes("_Part")) {
      try {
        const partStr = t.split("_Part", 2)[1] || "";
        const partNo = Number((partStr.split("_", 2)[0] || "").trim());
        if (!Number.isNaN(partNo)) item.part_no = partNo;
      } catch {}
    }
    if (t.includes("_Qty")) {
      try {
        const qtyStr = t.split("_Qty").pop() || "";
        const qty = Number((qtyStr.split("_", 2)[0] || "").trim());
        if (!Number.isNaN(qty)) item.qty = qty;
      } catch {}
    }
    if (t.includes("_Units")) {
      try {
        const unitsStr = t.split("_Units").pop() || "";
        const units = Number((unitsStr.split("_", 2)[0] || "").trim());
        if (!Number.isNaN(units)) item.units = units;
      } catch {}
    }
    if (t.includes("_Med")) {
      try {
        const v = Number((t.split("_Med").pop() || "").split("_", 2)[0]);
        if (!Number.isNaN(v)) item.med_skid = v;
      } catch {}
    }
    if (t.includes("_Large")) {
      try {
        const v = Number((t.split("_Large").pop() || "").split("_", 2)[0]);
        if (!Number.isNaN(v)) item.large_skid = v;
      } catch {}
    }
    if (t.includes("_Small")) {
      try {
        const v = Number((t.split("_Small").pop() || "").split("_", 2)[0]);
        if (!Number.isNaN(v)) item.small_skid = v;
      } catch {}
    }
    if (t.includes("_Frame")) {
      try {
        const v = Number((t.split("_Frame").pop() || "").split("_", 2)[0]);
        if (!Number.isNaN(v)) item.frame = v;
      } catch {}
    }
    if (t.includes("_Exp")) {
      try {
        const v = Number((t.split("_Exp").pop() || "").split("_", 2)[0]);
        if (!Number.isNaN(v)) item.exp_frame = v;
      } catch {}
    }
    if (t.includes("_Door")) {
      try {
        const v = Number((t.split("_Door").pop() || "").split("_", 2)[0]);
        if (!Number.isNaN(v)) item.door = v;
      } catch {}
    }
    if (t.includes("_Box")) {
      try {
        const v = Number((t.split("_Box").pop() || "").split("_", 2)[0]);
        if (!Number.isNaN(v)) item.box = v;
      } catch {}
    }
    return item;
  };

  const normalizeStops = (route: any) => {
    if (Array.isArray(route.stops) && route.stops.length > 0) {
      const first = route.stops[0];
      if (Array.isArray(first)) return route.stops;
      return route.stops.map((stop: any) => {
        if (Array.isArray(stop)) return stop;
        if (typeof stop === "string" || typeof stop === "number") {
          return [tokenToItem(stop)];
        }
        if (stop?.type) return [stop as RouteStopItem];
        const candidateId = stop?.id || stop?.delivery_id || stop?.job_id;
        if (candidateId != null) {
          const d = deliveriesById.get(String(candidateId));
          return [
            {
              type: "delivery",
              id: String(candidateId),
              job_name: d?.job_name || stop?.job_name || `Unknown (${candidateId})`
            }
          ];
        }
        return [{ type: "delivery", label: "Stop" }];
      });
    }
    if (Array.isArray(route.jobs)) {
      return route.jobs.map((job: any[]) => (job || []).map(tokenToItem));
    }
    return [];
  };

  const enrichStops = (stops: RouteStopItem[][]) =>
    stops.map((group) =>
      group.map((item) => {
        if (item.type !== "delivery") return item;
        const id = item.id ? String(item.id) : "";
        if (!id) return item;
        const d = deliveriesById.get(id);
        if (!d) return item;
        return { ...item, job_name: item.job_name || d.job_name };
      })
    );

  const normalizeStopTimes = (route: any) => {
    if (Array.isArray(route.stop_times)) return route.stop_times;
    if (Array.isArray(route.stops) && route.stops.length && route.stops[0]?.arrival_s != null) {
      return route.stops.map((s: any) => ({
        arrival_s: s.arrival_s,
        departure_s: s.departure_s,
        arrival_hhmm: s.arrival_hhmm,
        departure_hhmm: s.departure_hhmm
      }));
    }
    return [];
  };

  const routes: RouteDTO[] = plan.routes.map((route: any) => ({
    vehicle_id: route.vehicle_id ?? route.v_id ?? route.vehicleId ?? route.id,
    vehicle_type: route.vehicle_type ?? route.v_type ?? route.vehicleType ?? "vehicle",
    skids: route.skids,
    total_distance_m: route.total_distance_m ?? route.distance_m ?? route.distance,
    total_time_s: route.total_time_s ?? route.time_s ?? route.duration_s,
    stops: enrichStops(normalizeStops(route)),
    stop_times: normalizeStopTimes(route),
    stop_nodes: route.stop_nodes ?? route.nodes
  }));

  return { ...plan, routes, deliveries };
}

function PublishedPlanPreview({ plan }: { plan: any }) {
  const { setPlan } = usePlannerState();

  useEffect(() => {
    if (!plan || !plan.published) {
      setPlan(null);
      return;
    }
    setPlan(normalizePublishedPlan(plan));
  }, [plan, setPlan]);

  if (!plan || !plan.published) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Plan Preview</div>
            <div className="card-subtitle">Select a plan to view it.</div>
          </div>
        </div>
        <div className="empty-state">Select a plan to preview.</div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-8">
        <RouteBoard />
      </div>
      <div className="space-y-6 xl:col-span-4">
        <MapPanel />
        <UnassignedPanel />
      </div>
    </div>
  );
}

