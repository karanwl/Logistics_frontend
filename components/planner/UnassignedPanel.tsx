"use client";

import { Badge } from "@/components/ui/badge";
import { usePlannerState } from "@/hooks/usePlannerState";

export default function UnassignedPanel() {
  const { plan } = usePlannerState();
  const assigned = new Set<string>();
  (plan?.routes || []).forEach((route) => {
    route.stops.forEach((group) => {
      group.forEach((item) => {
        if (item.type === "delivery" && item.id) assigned.add(item.id);
      });
    });
  });
  const unassigned = (plan?.deliveries || []).filter((d) => !assigned.has(d.id));

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="text-xl font-semibold">Unscheduled Deliveries</div>
          <div className="card-subtitle">Stops dropped from the solve.</div>
        </div>
        <Badge>{unassigned.length}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {!plan ? (
          <div className="empty-state">No plan loaded.</div>
        ) : unassigned.length === 0 ? (
          <div className="empty-state">All deliveries were assigned.</div>
        ) : (
          unassigned.map((stop) => (
            <div key={stop.id} className="rounded-lg border border-steel-100 p-3">
              <div className="text-sm font-medium">{stop.job_name}</div>
              <div className="text-xs text-steel-500">{stop.job_address}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
