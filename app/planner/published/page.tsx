"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { usePublishedPlan, usePublishedPlansList } from "@/lib/api/planner";
import { PlannerStateProvider, usePlannerState } from "@/hooks/usePlannerState";
import UnassignedPanel from "@/components/planner/UnassignedPanel";
import RouteBoard from "@/components/planner/RouteBoard";
import MapPanel from "@/components/planner/MapPanel";
import { normalizePublishedPlan } from "@/lib/planner/normalizePlan";
import { formatDate } from "@/lib/utils/dates";

export default function PublishedPlansPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const listQuery = usePublishedPlansList();
  const planQuery = usePublishedPlan(selectedDate || "");
  const items = useMemo(
    () =>
      ((listQuery.data?.items || []) as any[]).filter(
        (item) => String(item?.source || "published_plans") === "published_plans"
      ),
    [listQuery.data?.items]
  );
  const today = useMemo(() => formatDate(new Date()), []);
  const source = String(planQuery.data?.source || "published_plans");

  useEffect(() => {
    if (items.length === 0) {
      if (selectedDate !== null) setSelectedDate(null);
      return;
    }
    const stillValid = selectedDate ? items.some((item) => item.plan_date === selectedDate) : false;
    if (stillValid) return;
    const todayItem = items.find((item) => item.plan_date === today);
    setSelectedDate(todayItem?.plan_date || items[0].plan_date);
  }, [items, selectedDate, today]);

  return (
    <AppShell>
      <PlannerStateProvider>
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="card xl:col-span-3">
            <div className="card-header">
              <div>
                <div className="text-xl font-semibold">Published Plans</div>
                <div className="card-subtitle">Select a plan to preview routes.</div>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.record_id || item.plan_date}
                  className="w-full text-left rounded-lg border border-steel-100 bg-white/75 px-3 py-2 transition hover:border-ink-900 hover:bg-white"
                  onClick={() => {
                    setSelectedDate(item.plan_date);
                  }}
                >
                  <div className="text-sm font-semibold">{item.plan_date}</div>
                  <div className="text-xs text-steel-500">{item.published_by || "--"}</div>
                </button>
              ))}
              {!listQuery.isLoading && items.length === 0 ? (
                <div className="rounded-lg border border-steel-100 bg-white/70 px-3 py-2 text-xs text-steel-500">
                  No published plans found.
                </div>
              ) : null}
            </div>
          </div>
          <div className="xl:col-span-9">
            <PublishedPlanToolbar
              selectedDate={selectedDate}
              today={today}
              source={source}
            />
            <PublishedPlanPreview plan={planQuery.data} source={source} />
          </div>
        </div>
      </PlannerStateProvider>
    </AppShell>
  );
}

function PublishedPlanToolbar({
  selectedDate,
  today,
  source
}: {
  selectedDate: string | null;
  today: string;
  source: string;
}) {
  return (
    <section className="card mb-6">
      <div className="card-header">
        <div>
          <div className="text-lg font-semibold">Published Plan Preview</div>
          <div className="card-subtitle">
            Published plans are view-only here. Use Live Progress to edit today&apos;s plan ({today}).
          </div>
          {source === "deliveries" ? (
            <div className="mt-1 text-xs text-steel-500">
              Source: delivery-backed live plan (no published blob required).
            </div>
          ) : null}
        </div>
      </div>
      <div className="text-xs text-steel-500">
        {selectedDate ? `Selected date ${selectedDate}.` : "Select a published plan date to preview."}
      </div>
    </section>
  );
}

function PublishedPlanPreview({
  plan,
  source
}: {
  plan: any;
  source: string;
}) {
  const { setPlan } = usePlannerState();

  useEffect(() => {
    if (!plan || !plan.published) {
      setPlan(null);
      return;
    }
    setPlan(normalizePublishedPlan(plan));
  }, [plan, setPlan]);

  if (!plan || !plan.published) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Plan Preview</div>
            <div className="card-subtitle">Select a plan to view it.</div>
          </div>
        </div>
        <div className="empty-state">Select a plan to preview.</div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-8">
        {source === "deliveries" ? (
          <div className="card !py-2">
            <div className="text-xs text-steel-500">
              Viewing the live delivery-backed route plan for the selected day.
            </div>
          </div>
        ) : null}
        <RouteBoard editable={false} />
      </div>
      <div className="space-y-6 xl:col-span-4">
        <MapPanel />
        <UnassignedPanel editable={false} />
      </div>
    </div>
  );
}

