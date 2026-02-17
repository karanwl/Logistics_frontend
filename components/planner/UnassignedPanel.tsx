"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlannerState } from "@/hooks/usePlannerState";

function asNonNegativeInt(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function deliveryIdFrom(value: any): string {
  return String(value?.delivery_id || value?.id || "").trim();
}

function buildStopItem(delivery: any, fallbackId: string) {
  return {
    type: "delivery" as const,
    id: fallbackId,
    job_name: String(delivery?.job_name || `Delivery ${fallbackId}`),
    med_skid: asNonNegativeInt(delivery?.med_skid),
    small_skid: asNonNegativeInt(delivery?.small_skid),
    large_skid: asNonNegativeInt(delivery?.large_skid),
    door: asNonNegativeInt(delivery?.door),
    frame: asNonNegativeInt(delivery?.frame),
    exp_frame: asNonNegativeInt(delivery?.exp_frame),
    box: asNonNegativeInt(delivery?.box),
  };
}

function groupKeyForDelivery(delivery: any): string {
  const jobsiteId = String(delivery?.jobsite_id || "").trim();
  if (jobsiteId) return `jobsite:${jobsiteId}`;
  const jobName = String(delivery?.job_name || "").trim().toLowerCase();
  const jobAddress = String(delivery?.job_address || "").trim().toLowerCase();
  return `job:${jobName}|${jobAddress}`;
}

type UnassignedGroup = {
  key: string;
  job_name: string;
  job_address: string;
  deliveries: any[];
  deliveryIds: string[];
  salesOrders: string[];
};

export default function UnassignedPanel({
  editable = false,
  planDate,
  allowAssignToRoute = false
}: {
  editable?: boolean;
  planDate?: string;
  allowAssignToRoute?: boolean;
}) {
  const { plan, setPlan } = usePlannerState();
  const [targetVehicleId, setTargetVehicleId] = useState("");
  const [message, setMessage] = useState("");

  const vehicleIds = useMemo(
    () => (plan?.routes || []).map((route) => String(route.vehicle_id || "")).filter(Boolean),
    [plan?.routes]
  );

  useEffect(() => {
    if (!vehicleIds.length) {
      setTargetVehicleId("");
      return;
    }
    if (!targetVehicleId || !vehicleIds.includes(targetVehicleId)) {
      setTargetVehicleId(vehicleIds[0]);
    }
  }, [vehicleIds, targetVehicleId]);

  const assigned = useMemo(() => {
    const taken = new Set<string>();
    (plan?.routes || []).forEach((route) => {
      (route.stops || []).forEach((group) => {
        (group || []).forEach((item) => {
          if (item?.type === "delivery" && item?.id) {
            taken.add(String(item.id));
          }
        });
      });
    });
    return taken;
  }, [plan?.routes]);

  const unassigned = useMemo(
    () =>
      (plan?.deliveries || []).filter((delivery) => {
        const id = deliveryIdFrom(delivery);
        return Boolean(id) && !assigned.has(id);
      }),
    [plan?.deliveries, assigned]
  );

  const groupedUnassigned = useMemo<UnassignedGroup[]>(() => {
    const byKey = new Map<string, UnassignedGroup>();
    for (const delivery of unassigned) {
      const deliveryId = deliveryIdFrom(delivery);
      if (!deliveryId) continue;
      const key = groupKeyForDelivery(delivery);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          key,
          job_name: String(delivery?.job_name || "Delivery"),
          job_address: String(delivery?.job_address || ""),
          deliveries: [delivery],
          deliveryIds: [deliveryId],
          salesOrders: [String(delivery?.sales_order || "").trim()].filter(Boolean),
        });
        continue;
      }
      existing.deliveries.push(delivery);
      if (!existing.deliveryIds.includes(deliveryId)) existing.deliveryIds.push(deliveryId);
      const salesOrder = String(delivery?.sales_order || "").trim();
      if (salesOrder && !existing.salesOrders.includes(salesOrder)) {
        existing.salesOrders.push(salesOrder);
      }
    }
    return Array.from(byKey.values()).sort((a, b) =>
      `${a.job_name}|${a.job_address}`.localeCompare(`${b.job_name}|${b.job_address}`, undefined, {
        sensitivity: "base"
      })
    );
  }, [unassigned]);

  const assignGroupToVehicle = (group: UnassignedGroup) => {
    if (!editable || !allowAssignToRoute || !plan) return;
    if (!targetVehicleId) {
      setMessage("Select a target vehicle.");
      return;
    }
    const nextRoutes = (plan.routes || []).map((route) => {
      if (String(route.vehicle_id) !== targetVehicleId) return route;
      const stopGroup = group.deliveries.map((delivery) =>
        buildStopItem(delivery, deliveryIdFrom(delivery))
      );
      const nextStops = [...(route.stops || []), stopGroup];
      const firstWindowStart = group.deliveries
        .map((delivery) => String((delivery as any)?.window_start || "").trim())
        .find(Boolean);
      const firstWindowEnd = group.deliveries
        .map((delivery) => String((delivery as any)?.window_end || "").trim())
        .find(Boolean);
      const nextStopTimes = [...(route.stop_times || [])];
      nextStopTimes.push({
        arrival_hhmm: firstWindowStart || undefined,
        departure_hhmm: firstWindowEnd || undefined,
      });
      const nextStopNodes = [...(route.stop_nodes || [])];
      if (nextStopNodes.length > 0) {
        nextStopNodes.push(nextStopNodes[nextStopNodes.length - 1]);
      }
      return {
        ...route,
        stops: nextStops,
        stop_times: nextStopTimes,
        stop_nodes: nextStopNodes,
      };
    });

    setPlan({ ...plan, routes: nextRoutes });
    setMessage(
      `Added ${group.deliveryIds.length} delivery${group.deliveryIds.length === 1 ? "" : "ies"} from ${group.job_name} to vehicle ${targetVehicleId}.`
    );
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="text-xl font-semibold">Unassigned Deliveries</div>
          <div className="card-subtitle">Grouped by job. Each card contains all sales orders for that job.</div>
        </div>
        <Badge>{unassigned.length}</Badge>
      </div>

      {editable && allowAssignToRoute ? (
        <div className="mb-3 rounded-lg border border-steel-200 bg-white/80 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-steel-600">Assign Group To Vehicle</div>
          <div className="mt-1 text-[11px] text-steel-500">
            Plan date: {planDate || (plan as any)?.plan_date || (plan as any)?.target_date || "--"}
          </div>
          <div className="mt-2">
            <label className="text-[11px] font-semibold uppercase text-steel-500">Vehicle</label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-xs"
              value={targetVehicleId}
              onChange={(e) => setTargetVehicleId(e.target.value)}
              disabled={vehicleIds.length === 0}
            >
              {vehicleIds.length === 0 ? <option value="">No routes</option> : null}
              {vehicleIds.map((vehicleId) => (
                <option key={`assign:${vehicleId}`} value={vehicleId}>
                  Vehicle {vehicleId}
                </option>
              ))}
            </select>
          </div>
          {message ? <div className="mt-2 text-xs text-steel-600">{message}</div> : null}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {!plan ? (
          <div className="empty-state">No plan loaded.</div>
        ) : groupedUnassigned.length === 0 ? (
          <div className="empty-state">All deliveries were assigned.</div>
        ) : (
          groupedUnassigned.map((group) => (
            <div key={group.key} className="rounded-lg border border-steel-100 p-3">
              <div className="text-sm font-medium">{group.job_name || "Delivery"}</div>
              <div className="text-xs text-steel-500">{group.job_address}</div>
              <div className="mt-1 text-xs text-steel-500">
                Deliveries: {group.deliveryIds.length}
              </div>
              {group.salesOrders.length > 0 ? (
                <div className="text-xs text-steel-500">SO: {group.salesOrders.join(", ")}</div>
              ) : null}
              {editable && allowAssignToRoute ? (
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => assignGroupToVehicle(group)}
                    disabled={!targetVehicleId}
                  >
                    Add Job Group To Vehicle {targetVehicleId || "--"}
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
