"use client";

import { useMemo } from "react";
import { usePlannerState } from "@/hooks/usePlannerState";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StopInspector() {
  const { selectedStopId, plan } = usePlannerState();

  const stopGroup = useMemo(() => {
    if (!selectedStopId || !plan) return null;
    const [vehicleId, indexStr] = selectedStopId.split(":");
    const index = Number(indexStr);
    const route = plan.routes.find((r) => String(r.vehicle_id) === vehicleId);
    if (!route || Number.isNaN(index)) return null;
    return route.stops[index] || null;
  }, [selectedStopId, plan]);

  const delivery = stopGroup?.find((s) => s.type === "delivery");

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Stop Inspector</CardTitle>
          <CardDescription>Details and adjustments.</CardDescription>
        </div>
      </CardHeader>
      {!stopGroup ? (
        <div className="text-sm text-steel-500">Select a stop to view details.</div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-steel-500">Stop</div>
            <div className="text-sm font-semibold">{delivery?.job_name || "Depot"}</div>
          </div>
          <div className="text-xs text-steel-500">Items in stop: {stopGroup.length}</div>
          <Button variant="secondary" size="sm" disabled>
            Edit Stop
          </Button>
        </div>
      )}
    </Card>
  );
}
