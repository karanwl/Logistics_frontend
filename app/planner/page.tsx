"use client";

import { useEffect, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import PlannerHeader from "@/components/planner/PlannerHeader";
import RouteBoard from "@/components/planner/RouteBoard";
import FleetPanel from "@/components/planner/FleetPanel";
import MapPanel from "@/components/planner/MapPanel";
import UnassignedPanel from "@/components/planner/UnassignedPanel";
import { PlannerStateProvider, usePlannerState } from "@/hooks/usePlannerState";
import { usePublishedPlan } from "@/lib/api/planner";
import { normalizePublishedPlan } from "@/lib/planner/normalizePlan";

export default function PlannerPage() {
  return (
    <AppShell>
      <PlannerStateProvider>
        <PlannerWorkspace />
      </PlannerStateProvider>
    </AppShell>
  );
}

function PlannerWorkspace() {
  const { selectedDate, setPlan, plan } = usePlannerState();
  const planQuery = usePublishedPlan(selectedDate);
  const source = useMemo(
    () => String(planQuery.data?.source || "published_plans"),
    [planQuery.data?.source]
  );

  useEffect(() => {
    if (!planQuery.data || !planQuery.data.published) {
      setPlan(null);
      return;
    }
    setPlan(normalizePublishedPlan(planQuery.data));
  }, [planQuery.data, setPlan]);

  return (
    <div className="grid gap-6">
      <PlannerHeader />

      {planQuery.isLoading && !plan ? (
        <section className="card">
          <div className="empty-state">Loading selected date plan...</div>
        </section>
      ) : null}

      {!planQuery.isLoading && !plan ? (
        <section className="card">
          <div className="card-header">
            <div>
              <div className="text-xl font-semibold">No Plan Loaded</div>
              <div className="card-subtitle">
                Click Run Plan to generate routes for {selectedDate}.
              </div>
            </div>
          </div>
          <div className="text-xs text-steel-500">
            No published plan was found for this date.
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {source === "deliveries" ? (
            <section className="card !py-2">
              <div className="text-xs text-steel-500">
                Starting from delivery-backed plan data for {selectedDate}.
              </div>
            </section>
          ) : null}
          <RouteBoard editable />
        </div>
        <div className="space-y-6 xl:col-span-4">
          <FleetPanel />
          <MapPanel />
          <UnassignedPanel editable planDate={selectedDate} />
        </div>
      </div>
    </div>
  );
}
