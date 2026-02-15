"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlannerState } from "@/hooks/usePlannerState";
import { api } from "@/lib/api/client";
import { useBulkCreateDeliveries, useJobsites } from "@/lib/api/planner";

function asNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function UnassignedPanel({
  editable = false,
  planDate
}: {
  editable?: boolean;
  planDate?: string;
}) {
  const { plan, setPlan } = usePlannerState();
  const jobsitesQuery = useJobsites();
  const bulkCreate = useBulkCreateDeliveries();

  const [jobsiteId, setJobsiteId] = useState("");
  const [targetVehicleId, setTargetVehicleId] = useState("");
  const [salesOrder, setSalesOrder] = useState("");
  const [medSkid, setMedSkid] = useState("0");
  const [smallSkid, setSmallSkid] = useState("0");
  const [largeSkid, setLargeSkid] = useState("0");
  const [door, setDoor] = useState("0");
  const [frame, setFrame] = useState("0");
  const [expFrame, setExpFrame] = useState("0");
  const [box, setBox] = useState("0");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [pickup, setPickup] = useState(false);
  const [pickupVehicle, setPickupVehicle] = useState("both");
  const [requiresEmptyTruck, setRequiresEmptyTruck] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  const effectivePlanDate = String(
    planDate || (plan as any)?.plan_date || (plan as any)?.target_date || todayIsoDate()
  );

  const jobsites = useMemo(() => {
    const rows = Array.isArray((jobsitesQuery.data as any)?.jobsites)
      ? ([...(jobsitesQuery.data as any).jobsites] as any[])
      : [];
    rows.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" }));
    return rows;
  }, [jobsitesQuery.data]);

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
    const id = String((d as any)?.id || (d as any)?.delivery_id || "");
    return id && !assigned.has(id);
  });

  const selectedJobsite = jobsites.find((j: any) => String(j?.id) === jobsiteId);

  const resetForm = () => {
    setJobsiteId("");
    setSalesOrder("");
    setMedSkid("0");
    setSmallSkid("0");
    setLargeSkid("0");
    setDoor("0");
    setFrame("0");
    setExpFrame("0");
    setBox("0");
    setWindowStart("");
    setWindowEnd("");
    setPickup(false);
    setPickupVehicle("both");
    setRequiresEmptyTruck(false);
  };

  const addUnplannedToRun = async () => {
    if (!editable) return;
    if (!plan) {
      setFormMessage("No plan is loaded.");
      return;
    }
    if (!jobsiteId) {
      setFormMessage("Select an existing jobsite.");
      return;
    }
    if (!selectedJobsite) {
      setFormMessage("Selected jobsite was not found.");
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
    const so = salesOrder.trim();
    if (!so) {
      setFormMessage("Sales order is required.");
      return;
    }

    const payloadItem = {
      jobsite_id: jobsiteId,
      scheduled_date: effectivePlanDate,
      sales_order: so,
      med_skid: asNonNegativeInt(medSkid),
      small_skid: asNonNegativeInt(smallSkid),
      large_skid: asNonNegativeInt(largeSkid),
      door: asNonNegativeInt(door),
      frame: asNonNegativeInt(frame),
      exp_frame: asNonNegativeInt(expFrame),
      box: asNonNegativeInt(box),
      pickup: Boolean(pickup),
      pickup_vehicle: pickup ? pickupVehicle || "both" : "",
      requires_empty_truck: Boolean(pickup && requiresEmptyTruck),
      window_start: windowStart.trim() || null,
      window_end: windowEnd.trim() || null,
    };

    setFormMessage("Adding delivery to DB and route...");
    try {
      const created = await bulkCreate.mutateAsync({ deliveries: [payloadItem] });
      const row = Array.isArray((created as any)?.results) ? (created as any).results[0] : null;
      if (!row || !row.ok) {
        throw new Error(row?.error || "Failed to create delivery.");
      }

      const createdDeliveryId = String(row.record_id || "").trim();
      if (!createdDeliveryId) {
        throw new Error("Delivery was created but no delivery id was returned.");
      }

      const latest = await api.get<{ deliveries: any[] }>("/deliveries/all?refresh=1");
      const fetched = (latest?.deliveries || []).find(
        (delivery: any) => String(delivery?.delivery_id || delivery?.id || "") === createdDeliveryId
      );

      const normalizedDelivery = {
        ...(fetched || {}),
        id: createdDeliveryId,
        delivery_id: createdDeliveryId,
        jobsite_id: jobsiteId,
        job_name: String((fetched as any)?.job_name || selectedJobsite?.name || `Delivery ${createdDeliveryId}`),
        job_address: String((fetched as any)?.job_address || selectedJobsite?.address || ""),
        sales_order: String((fetched as any)?.sales_order || so),
        scheduled_date: String((fetched as any)?.scheduled_date || effectivePlanDate),
        med_skid: (fetched as any)?.med_skid ?? payloadItem.med_skid,
        small_skid: (fetched as any)?.small_skid ?? payloadItem.small_skid,
        large_skid: (fetched as any)?.large_skid ?? payloadItem.large_skid,
        door: (fetched as any)?.door ?? payloadItem.door,
        frame: (fetched as any)?.frame ?? payloadItem.frame,
        exp_frame: (fetched as any)?.exp_frame ?? payloadItem.exp_frame,
        box: (fetched as any)?.box ?? payloadItem.box,
        pickup: (fetched as any)?.pickup ?? payloadItem.pickup,
        pickup_vehicle: (fetched as any)?.pickup_vehicle ?? payloadItem.pickup_vehicle,
        requires_empty_truck: (fetched as any)?.requires_empty_truck ?? payloadItem.requires_empty_truck,
        window_start: (fetched as any)?.window_start ?? windowStart.trim(),
        window_end: (fetched as any)?.window_end ?? windowEnd.trim(),
        status: String((fetched as any)?.status || "pending"),
      };

      const nextRoutes = (plan.routes || []).map((route) => {
        if (String(route.vehicle_id) !== targetVehicleId) return route;

        const stopItem = {
          type: "delivery" as const,
          id: createdDeliveryId,
          job_name: normalizedDelivery.job_name,
          med_skid: asNonNegativeInt(String(normalizedDelivery.med_skid ?? 0)),
          small_skid: asNonNegativeInt(String(normalizedDelivery.small_skid ?? 0)),
          large_skid: asNonNegativeInt(String(normalizedDelivery.large_skid ?? 0)),
          door: asNonNegativeInt(String(normalizedDelivery.door ?? 0)),
          frame: asNonNegativeInt(String(normalizedDelivery.frame ?? 0)),
          exp_frame: asNonNegativeInt(String(normalizedDelivery.exp_frame ?? 0)),
          box: asNonNegativeInt(String(normalizedDelivery.box ?? 0)),
        };

        const nextStops = [...(route.stops || [])];
        nextStops.push([stopItem]);

        const nextStopTimes = [...(route.stop_times || [])];
        nextStopTimes.push({
          arrival_hhmm: normalizedDelivery.window_start || undefined,
          departure_hhmm: normalizedDelivery.window_end || undefined,
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
        const id = String(delivery?.id || delivery?.delivery_id || "");
        return id !== createdDeliveryId;
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

      setFormMessage(
        `Added delivery ${createdDeliveryId} to vehicle ${targetVehicleId}. Click "Save Changes" to publish route updates.`
      );
      resetForm();
    } catch (error: any) {
      setFormMessage(error?.message || "Failed to add unplanned delivery.");
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="text-xl font-semibold">Unscheduled Deliveries</div>
          <div className="card-subtitle">Stops dropped from the solve.</div>
        </div>
        <Badge>{unassigned.length}</Badge>
      </div>

      {editable ? (
        <div className="mb-3 rounded-lg border border-steel-200 bg-steel-50/70 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-steel-600">Add Unplanned Delivery To Run</div>
          <div className="mt-1 text-[11px] text-steel-500">
            Jobsite must already exist in Jobsites. New delivery will be saved to DB immediately for {effectivePlanDate}.
          </div>

          <div className="mt-3 grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase text-steel-500">Jobsite</label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-xs"
                  value={jobsiteId}
                  onChange={(e) => setJobsiteId(e.target.value)}
                  disabled={bulkCreate.isPending || jobsitesQuery.isLoading}
                >
                  <option value="">Select existing jobsite</option>
                  {jobsites.map((jobsite: any) => (
                    <option key={String(jobsite.id)} value={String(jobsite.id)}>
                      {String(jobsite.name || "Jobsite")} {jobsite.address ? `- ${String(jobsite.address)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-steel-500">Vehicle</label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-xs"
                  value={targetVehicleId}
                  onChange={(e) => setTargetVehicleId(e.target.value)}
                  disabled={bulkCreate.isPending || vehicleIds.length === 0}
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

            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold uppercase text-steel-500">Sales Order</label>
                <Input
                  className="mt-1 h-9 text-xs"
                  value={salesOrder}
                  onChange={(e) => setSalesOrder(e.target.value)}
                  placeholder="Required"
                  disabled={bulkCreate.isPending}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-steel-500">Window Start</label>
                <Input
                  className="mt-1 h-9 text-xs"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  placeholder="HH:MM"
                  disabled={bulkCreate.isPending}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-steel-500">Window End</label>
                <Input
                  className="mt-1 h-9 text-xs"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  placeholder="HH:MM"
                  disabled={bulkCreate.isPending}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <Input className="h-9 text-xs" value={medSkid} onChange={(e) => setMedSkid(e.target.value)} placeholder="Med skid" disabled={bulkCreate.isPending} />
              <Input className="h-9 text-xs" value={smallSkid} onChange={(e) => setSmallSkid(e.target.value)} placeholder="Small skid" disabled={bulkCreate.isPending} />
              <Input className="h-9 text-xs" value={largeSkid} onChange={(e) => setLargeSkid(e.target.value)} placeholder="Large skid" disabled={bulkCreate.isPending} />
              <Input className="h-9 text-xs" value={box} onChange={(e) => setBox(e.target.value)} placeholder="Box" disabled={bulkCreate.isPending} />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Input className="h-9 text-xs" value={door} onChange={(e) => setDoor(e.target.value)} placeholder="Door" disabled={bulkCreate.isPending} />
              <Input className="h-9 text-xs" value={frame} onChange={(e) => setFrame(e.target.value)} placeholder="Frame" disabled={bulkCreate.isPending} />
              <Input className="h-9 text-xs" value={expFrame} onChange={(e) => setExpFrame(e.target.value)} placeholder="Exp frame" disabled={bulkCreate.isPending} />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="inline-flex items-center gap-2 rounded-md border border-steel-200 bg-white px-2 py-1 text-xs text-steel-700">
                <input
                  type="checkbox"
                  checked={pickup}
                  onChange={(e) => setPickup(e.target.checked)}
                  disabled={bulkCreate.isPending}
                />
                Pickup
              </label>
              <select
                className="h-9 rounded-md border border-steel-200 bg-white px-2 text-xs"
                value={pickupVehicle}
                onChange={(e) => setPickupVehicle(e.target.value)}
                disabled={!pickup || bulkCreate.isPending}
              >
                <option value="both">Pickup both</option>
                <option value="truck">Pickup truck</option>
                <option value="van">Pickup van</option>
              </select>
              <label className="inline-flex items-center gap-2 rounded-md border border-steel-200 bg-white px-2 py-1 text-xs text-steel-700">
                <input
                  type="checkbox"
                  checked={requiresEmptyTruck}
                  onChange={(e) => setRequiresEmptyTruck(e.target.checked)}
                  disabled={!pickup || bulkCreate.isPending}
                />
                Requires Empty Truck
              </label>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={addUnplannedToRun}
                disabled={bulkCreate.isPending || !plan}
              >
                {bulkCreate.isPending ? "Adding..." : "Add To Run"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                disabled={bulkCreate.isPending}
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
            <div key={String(stop?.id || stop?.delivery_id)} className="rounded-lg border border-steel-100 p-3">
              <div className="text-sm font-medium">{String(stop?.job_name || "Delivery")}</div>
              <div className="text-xs text-steel-500">{String(stop?.job_address || "")}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
