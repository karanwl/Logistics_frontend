"use client";

import { useEffect, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import PlannerHeader from "@/components/planner/PlannerHeader";
import RouteBoard from "@/components/planner/RouteBoard";
import FleetPanel from "@/components/planner/FleetPanel";
import MapPanel from "@/components/planner/MapPanel";
import UnassignedPanel from "@/components/planner/UnassignedPanel";
import { PlannerStateProvider, usePlannerState } from "@/hooks/usePlannerState";

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
  const previousDateRef = useRef<string>(selectedDate);

  useEffect(() => {
    if (previousDateRef.current !== selectedDate) {
      setPlan(null);
      previousDateRef.current = selectedDate;
    }
  }, [selectedDate, setPlan]);

  return (
    <div className="grid gap-6">
      <PlannerHeader />

      {!plan ? (
        <div className="flex justify-center">
          <div className="w-full max-w-xl">
            <FleetPanel />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <RouteBoard editable />
          </div>
          <div className="space-y-6 xl:col-span-4">
            <MapPanel />
            <UnassignedPanel editable planDate={selectedDate} />
          </div>
        </div>
      )}
    </div>
  );
}
