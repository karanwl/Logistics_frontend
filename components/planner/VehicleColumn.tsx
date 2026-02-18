import { RouteDTO } from "@/lib/types/planner";
import StopCard from "@/components/planner/StopCard";
import { Badge } from "@/components/ui/badge";
import { usePlannerState } from "@/hooks/usePlannerState";
import { useDrivers } from "@/lib/api/planner";
import { useMemo, useState } from "react";
import { api } from "@/lib/api/client";

export default function VehicleColumn({ route, editable = true }: { route: RouteDTO; editable?: boolean }) {
  const { plan, setPlan } = usePlannerState();
  const driversQuery = useDrivers();
  const [recalculating, setRecalculating] = useState(false);
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
  const isTruck = String(route.vehicle_type || "").toLowerCase() === "truck";
  const vehicleShellClass = isTruck
    ? "border-sky-300/90 bg-gradient-to-b from-sky-50/70 to-white"
    : "border-emerald-300/90 bg-gradient-to-b from-emerald-50/70 to-white";
  const vehicleLabel = `${isTruck ? "Truck" : "Van"} ${String(route.vehicle_id || "")}`;
  const setDriver = (value: string) => {
    if (!plan || !editable) return;
    const nextAssignments = { ...driverAssignments, [String(route.vehicle_id)]: value };
    setPlan({ ...plan, meta: { ...(plan.meta || {}), driver_assignments: nextAssignments } });
  };

  const recalculateRouteMetrics = async (nextPlan: any) => {
    setRecalculating(true);
    try {
      const payload = (nextPlan?.routes || []).map((item: RouteDTO) => ({
        vehicle_id: item.vehicle_id,
        vehicle_type: item.vehicle_type,
        stop_nodes: item.stop_nodes || []
      }));
      const recalced = await api.post<{ routes: any[] }>(
        "/plan/recalculate",
        JSON.stringify(payload),
        { "content-type": "application/json" }
      );
      const updatedRoutes = (nextPlan?.routes || []).map((item: RouteDTO) => {
        const update = (recalced?.routes || []).find((u: any) => String(u.vehicle_id) === String(item.vehicle_id));
        if (!update) return item;
        return {
          ...item,
          total_distance_m: update.total_distance_m,
          total_time_s: update.total_time_s,
          stop_times: update.stop_times || item.stop_times || []
        };
      });
      setPlan({ ...nextPlan, routes: updatedRoutes });
    } catch {
      setPlan(nextPlan);
    } finally {
      setRecalculating(false);
    }
  };

  const addPickupCustomStop = async (stopIndex: number, deliveryId: string) => {
    if (!plan || !editable) return;
    const nextRoutes = plan.routes.map((item) => ({ ...item }));
    const routeIndex = nextRoutes.findIndex((item) => String(item.vehicle_id) === String(route.vehicle_id));
    if (routeIndex < 0) return;

    const targetRoute = nextRoutes[routeIndex];
    const sourceDelivery = deliveriesById.get(deliveryId);
    const customStop = [
      {
        type: "delivery" as const,
        id: deliveryId,
        job_name: `Pickup - ${sourceDelivery?.job_name || `Delivery ${deliveryId}`}`,
        label: "Pickup Stop",
        med_skid: 0,
        small_skid: 0,
        large_skid: 0,
        door: 0,
        frame: 0,
        exp_frame: 0,
        box: 0,
        custom_stop: true,
        custom_stop_kind: "pickup" as const,
        custom_parent_delivery_id: deliveryId
      }
    ];

    const nextStops = [...targetRoute.stops];
    nextStops.splice(stopIndex + 1, 0, customStop);
    targetRoute.stops = nextStops;

    if (Array.isArray(targetRoute.stop_nodes) && targetRoute.stop_nodes.length > 0) {
      const nextNodes = [...targetRoute.stop_nodes];
      const sourceNode = nextNodes[Math.min(stopIndex, nextNodes.length - 1)];
      nextNodes.splice(stopIndex + 1, 0, sourceNode);
      targetRoute.stop_nodes = nextNodes;
    }

    if (Array.isArray(targetRoute.stop_times) && targetRoute.stop_times.length > 0) {
      const nextTimes = [...targetRoute.stop_times];
      const sourceTime = nextTimes[Math.min(stopIndex, nextTimes.length - 1)] || {};
      nextTimes.splice(stopIndex + 1, 0, { ...sourceTime });
      targetRoute.stop_times = nextTimes;
    }

    const nextPlan = { ...plan, routes: nextRoutes };
    setPlan(nextPlan);
    await recalculateRouteMetrics(nextPlan);
  };

  return (
    <div className={`rounded-xl border p-3 shadow-soft ${vehicleShellClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="panel-title">{isTruck ? "Truck Route" : "Van Route"}</div>
          <div className="text-sm font-semibold text-ink-900">{vehicleLabel}</div>
          <div className="text-xs text-steel-600">
            {route.stops.length} stops
          </div>
        </div>
        <div className="flex items-center gap-2 text-right">
          {recalculating && <span className="text-[11px] text-steel-500">Recalculating...</span>}
          <Badge className="border-steel-300 bg-white text-steel-700">{formatDuration(route.total_time_s)}</Badge>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge className="border-steel-300 bg-white text-steel-700">{formatDistance(route.total_distance_m)}</Badge>
        <Badge className="border-steel-300 bg-white text-steel-700">{route.stops.length} stops</Badge>
      </div>
      <div className="mt-3 rounded-lg border border-steel-200 bg-white/80 p-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-steel-500">Driver Assignment</label>
        <select
          className="mt-1 w-full rounded-md border border-steel-200 bg-white px-2 py-1.5 text-xs"
          value={selectedDriver}
          disabled={!editable}
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
              editable={editable}
              onAddPickupCustomStop={(deliveryId) => addPickupCustomStop(index, deliveryId)}
            />
          );
        })}
      </div>
    </div>
  );
}
