"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
      <div className="card-header grid grid-cols-3 items-center gap-4">
        <div>
          <div className="text-xl font-semibold">Plan</div>
          <div className="card-subtitle">Draft vs Published planning controls.</div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <label className="text-xs text-steel-500">Plan Date</label>
          <DatePickerInput
            className="w-40"
            value={selectedDate}
            onChange={(value) => setSelectedDate(value)}
          />
        </div>
        <div className="page-actions justify-self-end">
          <Badge>{statusLabel}</Badge>
          <Button onClick={runSolve} disabled={solveRun.isPending}>
            Run Plan
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
