"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { usePlannerState } from "@/hooks/usePlannerState";
import { useSolveRun, usePublishPlan } from "@/lib/api/planner";
import { useSolvePolling } from "@/hooks/useSolvePolling";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { useMemo, useState } from "react";

export default function PlannerHeader() {
  const {
    selectedDate,
    setSelectedDate,
    trucks,
    vans,
    plan,
    setPlan,
    solveJob,
    setSolveJob
  } = usePlannerState();
  const solveRun = useSolveRun();
  const publish = usePublishPlan();
  const [publishMessage, setPublishMessage] = useState("");
  const isSolveActive =
    solveRun.isPending || solveJob?.status === "queued" || solveJob?.status === "running";
  const statusLabel = solveJob?.status || (plan ? "success" : "idle");
  const routeCount = plan?.routes?.length || 0;
  const stopCount = useMemo(
    () => (plan?.routes || []).reduce((sum, route) => sum + (route.stops?.length || 0), 0),
    [plan?.routes]
  );
  const totalDistanceKm = useMemo(
    () =>
      ((plan?.routes || []).reduce((sum, route) => sum + Number(route.total_distance_m || 0), 0) / 1000).toFixed(1),
    [plan?.routes]
  );
  const totalMinutes = useMemo(
    () => Math.round((plan?.routes || []).reduce((sum, route) => sum + Number(route.total_time_s || 0), 0) / 60),
    [plan?.routes]
  );
  const statusToneClass =
    statusLabel === "failed"
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : statusLabel === "running" || statusLabel === "queued"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : statusLabel === "success"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-steel-200 bg-steel-50 text-steel-700";

  useSolvePolling(solveJob?.job_id, solveJob?.status, (job) => {
    if (job.result) {
      setPlan(job.result);
    }
    setSolveJob(job);
  });

  const runSolve = async () => {
    try {
      const job = await solveRun.mutateAsync({ trucks, vans, plan_date: selectedDate });
      setSolveJob(job);
    } catch (e) {
      setSolveJob(null);
    }
  };

  const runPublish = async () => {
    if (!plan) return;
    setPublishMessage("Publishing...");
    try {
      await publish.mutateAsync({
        routes: plan.routes,
        deliveries: plan.deliveries,
        meta: { ...(plan.meta || {}), plan_date: selectedDate },
        fleet: (plan.meta as any)?.fleet || { trucks, vans },
        plan_date: selectedDate
      });
      setPublishMessage("Plan published successfully.");
    } catch (e: any) {
      setPublishMessage(e?.message || "Publish failed.");
    }
  };

  return (
    <section className="card overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500/90 via-sky-500/75 to-amber-400/85" />
      <div className="card-header grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="space-y-2">
          <div className="panel-title">Planning Controls</div>
          <div className="text-2xl font-semibold tracking-tight">Dispatch Plan Console</div>
          <div className="card-subtitle">
            Solve, review, and publish route plans with date-locked operational metadata.
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge className="border-steel-300 bg-white text-steel-700">
              Fleet {trucks}T / {vans}V
            </Badge>
            <Badge className="border-steel-300 bg-white text-steel-700">{routeCount} routes</Badge>
            <Badge className="border-steel-300 bg-white text-steel-700">{stopCount} stops</Badge>
            <Badge className="border-steel-300 bg-white text-steel-700">{totalDistanceKm} km</Badge>
            <Badge className="border-steel-300 bg-white text-steel-700">{totalMinutes} min</Badge>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 rounded-xl border border-steel-200 bg-white/75 p-3 xl:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-steel-500">Plan Date</label>
            <div className="w-full sm:w-auto">
              <DatePickerInput
                className="w-full sm:w-auto"
                value={selectedDate}
                onChange={(value) => setSelectedDate(value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Badge className={statusToneClass}>{statusLabel}</Badge>
            <Button onClick={runSolve} disabled={isSolveActive}>
              {isSolveActive ? (
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
                  aria-hidden="true"
                />
              ) : null}
              {isSolveActive ? "Running..." : "Run Plan"}
            </Button>
            <Button variant="outline" onClick={runPublish} disabled={!plan || publish.isPending}>
              {publish.isPending ? "Publishing..." : "Publish Plan"}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-steel-200/80 bg-steel-50/70 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-steel-500">Execution</div>
        <div className="mt-1 text-sm text-steel-600">
          Solver output remains editable before publish. Publish writes the current route state and meta snapshot.
        </div>
      </div>
      <div className="mt-3">
        <ErrorBanner error={solveRun.error || publish.error} />
        {publishMessage ? (
          <div className="mt-2 text-xs text-steel-600">{publishMessage}</div>
        ) : null}
      </div>
    </section>
  );
}
