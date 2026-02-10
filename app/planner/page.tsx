"use client";

import AppShell from "@/components/layout/AppShell";
import PlannerHeader from "@/components/planner/PlannerHeader";
import FleetPanel from "@/components/planner/FleetPanel";
import RouteBoard from "@/components/planner/RouteBoard";
import UnassignedPanel from "@/components/planner/UnassignedPanel";
import MapPanel from "@/components/planner/MapPanel";
import { PlannerStateProvider } from "@/hooks/usePlannerState";
import { usePlannerState } from "@/hooks/usePlannerState";

export default function PlannerPage() {
  return (
    <AppShell>
      <PlannerStateProvider>
        <div className="grid gap-6">
          <PlannerHeader />
          <PlannerLayout />
        </div>
      </PlannerStateProvider>
    </AppShell>
  );
}

function PlannerLayout() {
  const { plan } = usePlannerState();
  if (!plan) {
    return <PlannerContent />;
  }

  return (
    <PlannerContent />
  );
}

function PlannerContent() {
  const { plan, solveJob } = usePlannerState();
  const isBuilding = solveJob?.status === "queued" || solveJob?.status === "running";

  if (!plan && !isBuilding) {
    return (
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <FleetPanel />
        </div>
        <div className="card xl:col-span-7">
          <div className="panel-title mb-2">Ready To Plan</div>
          <div className="text-xl font-semibold">Configure fleet and run solve</div>
          <p className="card-subtitle mt-2">
            Set truck and van counts, choose the plan date, and run a solve to generate route assignments.
          </p>
          <div className="mt-4 text-sm text-steel-500">
            Routes, map, and unscheduled deliveries will appear automatically after the solve completes.
          </div>
        </div>
      </div>
    );
  }

  if (isBuilding && !plan) {
    return (
      <div className="card flex items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-steel-200 border-t-ink-900 animate-spin" />
          <div>
            <div className="text-xl font-semibold">Building plan</div>
            <div className="card-subtitle">Optimizing routes and stop assignments.</div>
          </div>
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

