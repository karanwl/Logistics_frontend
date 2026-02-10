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
    return (
      <div className="grid gap-6">
        <PlannerContent />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <PlannerContent />
      <div className="flex flex-col gap-6">
        <MapPanel />
      </div>
    </div>
  );
}

function PlannerContent() {
  const { plan, solveJob } = usePlannerState();
  const isBuilding = solveJob?.status === "queued" || solveJob?.status === "running";

  if (!plan && !isBuilding) {
    return (
      <div className="flex items-center justify-center">
        <div className="card w-full max-w-2xl">
          <div className="card-header">
            <div>
              <div className="text-xl font-semibold">Fleet Inputs</div>
              <div className="card-subtitle">Set vehicles and run a plan.</div>
            </div>
          </div>
          <FleetPanel />
        </div>
      </div>
    );
  }

  if (isBuilding && !plan) {
    return (
      <div className="flex items-center justify-center">
        <div className="card w-full max-w-2xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-steel-200 border-t-ink-900 animate-spin" />
          <div>
            <div className="text-xl font-semibold">Building plan</div>
            <div className="card-subtitle">Optimizing routes and stop assignments.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <UnassignedPanel />
      <RouteBoard />
    </div>
  );
}

