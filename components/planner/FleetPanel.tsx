"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePlannerState } from "@/hooks/usePlannerState";

export default function FleetPanel() {
  const { trucks, vans, setTrucks, setVans, solveJob } = usePlannerState();
  const totalVehicles = Math.max(0, Number(trucks || 0)) + Math.max(0, Number(vans || 0));
  const solveState = String(solveJob?.status || "idle").toLowerCase();
  const solveToneClass =
    solveState === "failed"
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : solveState === "queued" || solveState === "running"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : solveState === "success"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-steel-200 bg-steel-50 text-steel-700";

  return (
    <section className="card h-full">
      <div className="card-header">
        <div>
          <div className="panel-title">Fleet Setup</div>
          <div className="text-xl font-semibold">Vehicle Availability</div>
          <div className="card-subtitle">Set available trucks and vans before running the solver.</div>
        </div>
        <Badge className="border-steel-300 bg-white text-steel-700">{totalVehicles} total</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-steel-200 bg-white/80 p-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-steel-500">Trucks</label>
          <Input type="number" min={0} value={trucks} onChange={(e) => setTrucks(Number(e.target.value))} />
          <div className="text-xs text-steel-500">Used for higher-capacity and truck-required stops.</div>
        </div>
        <div className="space-y-2 rounded-xl border border-steel-200 bg-white/80 p-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-steel-500">Vans</label>
          <Input type="number" min={0} value={vans} onChange={(e) => setVans(Number(e.target.value))} />
          <div className="text-xs text-steel-500">Preferred for light stops and short service time.</div>
        </div>
        <div className="rounded-xl border border-steel-200 bg-steel-50/80 p-3 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-steel-500">Solve Status</div>
            <Badge className={solveToneClass}>{solveJob?.status || "idle"}</Badge>
          </div>
          <div className="mt-2 text-xs text-steel-600">
            Last solve finished: {solveJob?.finished_at || "--"}
          </div>
          <div className="mt-1 text-xs text-steel-500">
            Recommended: keep this aligned with actual on-road vehicle availability.
          </div>
        </div>
      </div>
    </section>
  );
}
