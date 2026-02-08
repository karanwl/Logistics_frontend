"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePlannerState } from "@/hooks/usePlannerState";

export default function FleetPanel() {
  const { trucks, vans, setTrucks, setVans, solveJob } = usePlannerState();

  return (
    <section className="card h-full">
      <div className="card-header">
        <div>
          <div className="text-xl font-semibold">Fleet Inputs</div>
          <div className="card-subtitle">Set available vehicles for tomorrow.</div>
        </div>
        <Badge>Dispatch</Badge>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-steel-500"># Trucks</label>
          <Input type="number" min={0} value={trucks} onChange={(e) => setTrucks(Number(e.target.value))} />
          <label className="text-xs text-steel-500"># Vans</label>
          <Input type="number" min={0} value={vans} onChange={(e) => setVans(Number(e.target.value))} />
          <Button variant="secondary" size="sm" disabled>Add Vehicle</Button>
        </div>
        <div className="rounded-lg border border-steel-100 p-3 bg-steel-50">
          <div className="text-xs font-semibold text-steel-500">Solve Status</div>
          <div className="text-sm text-ink-900">{solveJob?.status || "Idle"}</div>
          <div className="text-xs text-steel-500">Last solve: {solveJob?.finished_at || "--"}</div>
        </div>
      </div>
    </section>
  );
}
