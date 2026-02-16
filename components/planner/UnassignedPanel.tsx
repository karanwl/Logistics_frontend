"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlannerState } from "@/hooks/usePlannerState";
import { api } from "@/lib/api/client";
import { useDeliveries, useRescheduleDelivery } from "@/lib/api/planner";

function asNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function deliveryIdFrom(value: any): string {
  return String(value?.delivery_id || value?.id || "").trim();
}

export default function UnassignedPanel({
  editable = false,
  planDate
}: {
  editable?: boolean;
  planDate?: string;
}) {
  const { plan, setPlan } = usePlannerState();
  const deliveriesQuery = useDeliveries();
  const reschedule = useRescheduleDelivery();

  const [targetVehicleId, setTargetVehicleId] = useState("");
  const [selectedUnscheduledId, setSelectedUnscheduledId] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const effectivePlanDate = String(
    planDate || (plan as any)?.plan_date || (plan as any)?.target_date || todayIsoDate()
  );

  const vehicleIds = useMemo(
    () => (plan?.routes || []).map((route) => String(route.vehicle_id)),
    [plan?.routes]
  );

  useEffect(() => {
    if (vehicleIds.length === 0) {
      setTargetVehicleId("");
      return;
    }
    if (!targetVehicleId || !vehicleIds.includes(targetVehicleId)) {
      setTargetVehicleId(vehicleIds[0]);
    }
  }, [targetVehicleId, vehicleIds]);

  const assigned = new Set<string>();
  (plan?.routes || []).forEach((route) => {
    route.stops.forEach((group) => {
      group.forEach((item) => {
        if (item.type === "delivery" && item.id) assigned.add(String(item.id));
      });
    });
  });
  const unassigned = (plan?.deliveries || []).filter((d) => {
    const id = deliveryIdFrom(d);
    return id && !assigned.has(id);
  });

  const unscheduledCandidates = useMemo(() => {
    const rows = Array.isArray((deliveriesQuery.data as any)?.deliveries)
      ? ([...(deliveriesQuery.data as any).deliveries] as any[])
      : [];
    return rows
      .filter((delivery: any) => {
        const deliveryId = deliveryIdFrom(delivery);
        if (!deliveryId) return false;
        const scheduled = String(delivery?.scheduled_date || "").trim();
        return !scheduled;
      })
      .sort((a, b) =>
        String(a?.job_name || "").localeCompare(String(b?.job_name || ""), undefined, { sensitivity: "base" })
      );
  }, [deliveriesQuery.data]);

  useEffect(() => {
    if (unscheduledCandidates.length === 0) {
      setSelectedUnscheduledId("");
      return;
    }
    const stillValid = unscheduledCandidates.some((delivery) => deliveryIdFrom(delivery) === selectedUnscheduledId);
    if (!stillValid) {
      setSelectedUnscheduledId(deliveryIdFrom(unscheduledCandidates[0]));
    }
  }, [selectedUnscheduledId, unscheduledCandidates]);

  const resetForm = () => {
    setSelectedUnscheduledId("");
    setFormMessage("");
  };

  const scheduleUnscheduledToRun = async () => {
    if (!editable) return;
    if (!plan) {
      setFormMessage("No plan is loaded.");
      return;
    }
    if (!selectedUnscheduledId) {
      setFormMessage("Select an unscheduled delivery.");
      return;
    }
    if (!targetVehicleId) {
      setFormMessage("Select a target vehicle.");
      return;
    }
    const routeExists = (plan.routes || []).some((route) => String(route.vehicle_id) === targetVehicleId);
    if (!routeExists) {
      setFormMessage("Target vehicle route was not found.");
      return;
    }
    const alreadyOnRoute = (plan.routes || []).some((route) =>
      (route.stops || []).some((group) =>
        group.some((item) => item.type === "delivery" && deliveryIdFrom(item) === selectedUnscheduledId)
      )
    );
    if (alreadyOnRoute) {
      setFormMessage("This delivery is already on a route.");
      return;
    }

    const selectedCandidate = unscheduledCandidates.find(
      (delivery) => deliveryIdFrom(delivery) === selectedUnscheduledId
    );
    if (!selectedCandidate) {
      setFormMessage("Selected unscheduled delivery was not found.");
      return;
    }

    setFormMessage("Scheduling delivery and adding it to the route...");
    try {
      await reschedule.mutateAsync({
        delivery_id: selectedUnscheduledId,
        scheduled_date: effectivePlanDate
      });

      const latest = await api.get<{ deliveries: any[] }>("/deliveries/all?refresh=1");
      const fetched = (latest?.deliveries || []).find(
        (delivery: any) => deliveryIdFrom(delivery) === selectedUnscheduledId
      );
      const row = fetched || selectedCandidate;
      const normalizedDeliveryId = selectedUnscheduledId;

      const normalizedDelivery = {
        ...(row || {}),
        id: normalizedDeliveryId,
        delivery_id: normalizedDeliveryId,
        scheduled_date: effectivePlanDate,
        job_name: String((row as any)?.job_name || `Delivery ${normalizedDeliveryId}`),
        job_address: String((row as any)?.job_address || ""),
        status: String((row as any)?.status || "pending")
      };

      const nextRoutes = (plan.routes || []).map((route) => {
        if (String(route.vehicle_id) !== targetVehicleId) return route;

        const stopItem = {
          type: "delivery" as const,
          id: normalizedDeliveryId,
          job_name: normalizedDelivery.job_name,
          med_skid: asNonNegativeInt(String((row as any)?.med_skid ?? 0)),
          small_skid: asNonNegativeInt(String((row as any)?.small_skid ?? 0)),
          large_skid: asNonNegativeInt(String((row as any)?.large_skid ?? 0)),
          door: asNonNegativeInt(String((row as any)?.door ?? 0)),
          frame: asNonNegativeInt(String((row as any)?.frame ?? 0)),
          exp_frame: asNonNegativeInt(String((row as any)?.exp_frame ?? 0)),
          box: asNonNegativeInt(String((row as any)?.box ?? 0)),
        };

        const nextStops = [...(route.stops || [])];
        nextStops.push([stopItem]);

        const nextStopTimes = [...(route.stop_times || [])];
        nextStopTimes.push({
          arrival_hhmm: String((row as any)?.window_start || "").trim() || undefined,
          departure_hhmm: String((row as any)?.window_end || "").trim() || undefined,
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

      const filteredDeliveries = (plan.deliveries || []).filter((delivery: any) => {
        const id = deliveryIdFrom(delivery);
        return id !== normalizedDeliveryId;
      });

      const nextPlan = {
        ...plan,
        deliveries: [...filteredDeliveries, normalizedDelivery as any],
        routes: nextRoutes,
      };

      setPlan(nextPlan);

      try {
        const recalcPayload = (nextRoutes || []).map((route) => ({
          vehicle_id: route.vehicle_id,
          vehicle_type: route.vehicle_type,
          stop_nodes: route.stop_nodes || [],
        }));
        const recalced = await api.post<{ routes: any[] }>(
          "/plan/recalculate",
          JSON.stringify(recalcPayload),
          { "content-type": "application/json" }
        );
        const updatedRoutes = (nextRoutes || []).map((route) => {
          const update = (recalced?.routes || []).find(
            (item: any) => String(item?.vehicle_id) === String(route.vehicle_id)
          );
          if (!update) return route;
          return {
            ...route,
            total_distance_m: update.total_distance_m,
            total_time_s: update.total_time_s,
            stop_times: update.stop_times || route.stop_times || [],
          };
        });
        setPlan({ ...nextPlan, routes: updatedRoutes });
      } catch {
        // keep optimistic route change if recalc fails
      }

      await deliveriesQuery.refetch();
      setFormMessage(
        `Scheduled delivery ${normalizedDeliveryId} to ${effectivePlanDate} and added it to vehicle ${targetVehicleId}. Click "Save Changes" to publish route updates.`
      );
      resetForm();
    } catch (error: any) {
      setFormMessage(error?.message || "Failed to schedule unscheduled delivery.");
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="text-xl font-semibold">Unassigned Deliveries</div>
          <div className="card-subtitle">Stops dropped from the solve.</div>
        </div>
        <Badge>{unassigned.length}</Badge>
      </div>

      {editable ? (
        <div className="mb-3 rounded-lg border border-steel-200 bg-steel-50/70 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-steel-600">Schedule Existing Unscheduled Delivery</div>
          <div className="mt-1 text-[11px] text-steel-500">
            Pick an unscheduled delivery and assign it to {effectivePlanDate}, then attach it to a vehicle.
          </div>

          <div className="mt-3 grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase text-steel-500">Unscheduled Delivery</label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-xs"
                  value={selectedUnscheduledId}
                  onChange={(e) => setSelectedUnscheduledId(e.target.value)}
                  disabled={reschedule.isPending || deliveriesQuery.isLoading || unscheduledCandidates.length === 0}
                >
                  {unscheduledCandidates.length === 0 ? <option value="">No unscheduled deliveries</option> : null}
                  {unscheduledCandidates.map((delivery: any) => {
                    const deliveryId = deliveryIdFrom(delivery);
                    const jobName = String(delivery?.job_name || "Delivery");
                    const salesOrder = String(delivery?.sales_order || "").trim();
                    return (
                      <option key={deliveryId} value={deliveryId}>
                        {jobName} ({deliveryId}){salesOrder ? ` - SO ${salesOrder}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-steel-500">Vehicle</label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-xs"
                  value={targetVehicleId}
                  onChange={(e) => setTargetVehicleId(e.target.value)}
                  disabled={reschedule.isPending || vehicleIds.length === 0}
                >
                  {vehicleIds.length === 0 ? <option value="">No routes</option> : null}
                  {vehicleIds.map((vehicleId) => (
                    <option key={vehicleId} value={vehicleId}>
                      Vehicle {vehicleId}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!deliveriesQuery.isLoading && unscheduledCandidates.length === 0 ? (
              <div className="text-xs text-steel-500">No unscheduled deliveries are available.</div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={scheduleUnscheduledToRun}
                disabled={reschedule.isPending || !plan || !selectedUnscheduledId || !targetVehicleId}
              >
                {reschedule.isPending ? "Scheduling..." : "Schedule To Run"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                disabled={reschedule.isPending}
              >
                Reset
              </Button>
            </div>
            {formMessage ? <div className="text-xs text-steel-600">{formMessage}</div> : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {!plan ? (
          <div className="empty-state">No plan loaded.</div>
        ) : unassigned.length === 0 ? (
          <div className="empty-state">All deliveries were assigned.</div>
        ) : (
          unassigned.map((stop: any) => (
            <div key={deliveryIdFrom(stop)} className="rounded-lg border border-steel-100 p-3">
              <div className="text-sm font-medium">{String(stop?.job_name || "Delivery")}</div>
              <div className="text-xs text-steel-500">{String(stop?.job_address || "")}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
