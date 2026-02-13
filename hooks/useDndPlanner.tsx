"use client";

import { useMemo } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { usePlannerState } from "@/hooks/usePlannerState";
import { RouteDTO } from "@/lib/types/planner";
import { api } from "@/lib/api/client";

export function useDndPlanner(editable = true) {
  const { plan, setPlan } = usePlannerState();

  const routes = useMemo(() => plan?.routes || [], [plan]);

  const onDragEnd = async (event: any) => {
    if (!editable) return;
    const { active, over } = event;
    if (!active || !over) return;

    const from = active.data.current as { vehicleId: RouteDTO["vehicle_id"]; index: number } | undefined;
    const to = over.data.current as { vehicleId: RouteDTO["vehicle_id"]; index: number } | undefined;
    if (!from || !to || !plan) return;

    if (from.vehicleId === to.vehicleId && from.index === to.index) return;

    const newRoutes = plan.routes.map((route) => ({ ...route }));
    const source = newRoutes.find((r) => r.vehicle_id === from.vehicleId);
    const target = newRoutes.find((r) => r.vehicle_id === to.vehicleId);
    if (!source || !target) return;

    const sourceStops = [...source.stops];
    const sourceNodes = [...(source.stop_nodes || [])];

    if (from.vehicleId === to.vehicleId) {
      const updatedStops = arrayMove(sourceStops, from.index, to.index);
      const updatedNodes = arrayMove(sourceNodes, from.index, to.index);
      source.stops = updatedStops;
      source.stop_nodes = updatedNodes;
    } else {
      const [movedStop] = sourceStops.splice(from.index, 1);
      const [movedNode] = sourceNodes.splice(from.index, 1);
      const targetStops = [...target.stops];
      const targetNodes = [...(target.stop_nodes || [])];
      targetStops.splice(to.index, 0, movedStop);
      targetNodes.splice(to.index, 0, movedNode);
      source.stops = sourceStops;
      source.stop_nodes = sourceNodes;
      target.stops = targetStops;
      target.stop_nodes = targetNodes;
    }

    setPlan({ ...plan, routes: newRoutes });

    try {
      const payload = newRoutes.map((route) => ({
        vehicle_id: route.vehicle_id,
        vehicle_type: route.vehicle_type,
        stop_nodes: route.stop_nodes || []
      }));
      const recalced = await api.post<{ routes: any[] }>(
        "/plan/recalculate",
        JSON.stringify(payload),
        { "content-type": "application/json" }
      );
      const updatedRoutes = newRoutes.map((route) => {
        const update = recalced.routes.find((u) => String(u.vehicle_id) === String(route.vehicle_id));
        if (!update) return route;
        return {
          ...route,
          total_distance_m: update.total_distance_m,
          total_time_s: update.total_time_s,
          stop_times: update.stop_times || []
        };
      });
      setPlan({ ...plan, routes: updatedRoutes });
    } catch {
      // leave existing metrics if recalc fails
    }
  };

  return { routes, onDragEnd };
}
