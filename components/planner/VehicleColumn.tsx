import { RouteDTO } from "@/lib/types/planner";
import StopCard from "@/components/planner/StopCard";
import { Badge } from "@/components/ui/badge";
import { usePlannerState } from "@/hooks/usePlannerState";
import { useDrivers } from "@/lib/api/planner";
import { useMemo } from "react";

export default function VehicleColumn({ route }: { route: RouteDTO }) {
  const { plan, setPlan } = usePlannerState();
  const driversQuery = useDrivers();
  const deliveriesById = useMemo(() => {
    const map = new Map<string, any>();
    (plan?.deliveries || []).forEach((d) => map.set(String(d.id), d));
    return map;
  }, [plan]);

  const driverOptions = useMemo(() => {
    const drivers = (driversQuery.data as any)?.drivers || [];
    return drivers.map((u: any) => ({
      value: String(u.email || u.name || u.id || ""),
      label: u.name || u.email || String(u.id || "Driver")
    }));
  }, [driversQuery.data]);

  const formatDuration = (seconds?: number) => {
    const totalMinutes = Math.round((seconds || 0) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (meters?: number) => {
    const km = (meters || 0) / 1000;
    if (km >= 100) return `${Math.round(km)} km`;
    return `${Math.round(km * 10) / 10} km`;
  };

  const driverAssignments = (plan?.meta as any)?.driver_assignments || {};
  const selectedDriver = driverAssignments[String(route.vehicle_id)] || "";
  const setDriver = (value: string) => {
    if (!plan) return;
    const nextAssignments = { ...driverAssignments, [String(route.vehicle_id)]: value };
    setPlan({ ...plan, meta: { ...(plan.meta || {}), driver_assignments: nextAssignments } });
  };

  return (
    <div className="rounded-xl border border-steel-100 bg-white p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">
            {(route.vehicle_type || "Vehicle").toString().toUpperCase()}
          </div>
          <div className="text-xs text-steel-500">
            {route.stops.length} stops - {formatDistance(route.total_distance_m)}
          </div>
        </div>
        <Badge>{formatDuration(route.total_time_s)}</Badge>
      </div>
      <div className="mt-2">
        <label className="text-[11px] font-semibold uppercase text-steel-500">Driver</label>
        <select
          className="mt-1 w-full rounded-md border border-steel-200 bg-white px-2 py-1 text-xs"
          value={selectedDriver}
          onChange={(e) => setDriver(e.target.value)}
        >
          <option value="">Unassigned</option>
          {driverOptions.map((opt: any) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 space-y-2">
        {route.stops.map((stop, index) => {
          return (
            <StopCard
              key={`${route.vehicle_id}:${index}`}
              id={`${route.vehicle_id}:${index}`}
              vehicleId={route.vehicle_id}
              index={index}
              stop={stop}
              deliveriesById={deliveriesById}
              stopTime={route.stop_times?.[index]}
            />
          );
        })}
      </div>
    </div>
  );
}
