"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { usePlannerState } from "@/hooks/usePlannerState";
import { useSolveRun, usePublishPlan } from "@/lib/api/planner";
import { useSolvePolling } from "@/hooks/useSolvePolling";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { useState } from "react";

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

  const statusLabel = solveJob?.status || (plan ? "success" : "idle");

  return (
    <section className="card">
      <div className="card-header grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div>
          <div className="text-xl font-semibold">Plan</div>
          <div className="card-subtitle">Draft vs Published planning controls.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <label className="text-xs text-steel-500">Plan Date</label>
          <div className="w-full sm:w-auto">
            <DatePickerInput
              className="w-full sm:w-auto"
              value={selectedDate}
              onChange={(value) => setSelectedDate(value)}
            />
          </div>
          <Badge>{statusLabel}</Badge>
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
            Publish Plan
          </Button>
        </div>
      </div>
      <div className="mt-3">
        <ErrorBanner error={solveRun.error || publish.error} />
        {publishMessage ? (
          <div className="mt-2 text-xs text-steel-500">{publishMessage}</div>
        ) : null}
      </div>
    </section>
  );
}
