"use client";

import { useEffect, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import RouteBoard from "@/components/planner/RouteBoard";
import MapPanel from "@/components/planner/MapPanel";
import UnassignedPanel from "@/components/planner/UnassignedPanel";
import { PlannerStateProvider, usePlannerState } from "@/hooks/usePlannerState";
import { usePublishedPlan } from "@/lib/api/planner";
import { normalizePublishedPlan } from "@/lib/planner/normalizePlan";
import { formatDate } from "@/lib/utils/dates";

export default function PlannerPage() {
  return (
    <AppShell>
      <PlannerStateProvider>
        <PlannerReadOnlyContent />
      </PlannerStateProvider>
    </AppShell>
  );
}

function PlannerReadOnlyContent() {
  const { setPlan } = usePlannerState();
  const today = useMemo(() => formatDate(new Date()), []);
  const planQuery = usePublishedPlan(today);

  useEffect(() => {
    if (!planQuery.data || !planQuery.data.published) {
      setPlan(null);
      return;
    }
    setPlan(normalizePublishedPlan(planQuery.data));
  }, [planQuery.data, setPlan]);

  return (
    <div className="grid gap-6">
      <section className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Planner (View Only)</div>
            <div className="card-subtitle">
              Planning edits are moved to Live Progress. This page is read-only for today&apos;s plan ({today}).
            </div>
          </div>
        </div>
      </section>

      {planQuery.isLoading ? (
        <section className="card">
          <div className="empty-state">Loading today&apos;s plan...</div>
        </section>
      ) : null}

      {!planQuery.isLoading && !planQuery.data?.published ? (
        <section className="card">
          <div className="empty-state">No published/live plan found for today.</div>
        </section>
      ) : null}

      {!planQuery.isLoading && planQuery.data?.published ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <RouteBoard editable={false} />
          </div>
          <div className="space-y-6 xl:col-span-4">
            <MapPanel />
            <UnassignedPanel />
          </div>
        </div>
      ) : null}
    </div>
  );
}
