"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { usePlanDashboard } from "@/lib/api/planner";
import { addDays, formatDate } from "@/lib/utils/dates";

type VehicleFilter = "all" | "truck" | "van";

type PlanMetrics = {
  route_count: number;
  vehicle_count: number;
  delivery_count: number;
  total_distance_m: number;
  total_time_s: number;
  total_stops: number;
  delivery_stops: number;
};

type ImprovementMetrics = {
  distance_saved_m: number;
  distance_saved_pct: number;
  time_saved_s: number;
  time_saved_pct: number;
  routes_saved: number;
  vehicles_saved: number;
  daily_distance_saved_m: number;
  daily_time_saved_s: number;
};

type DashboardRow = {
  date: string;
  manual: PlanMetrics;
  published: PlanMetrics;
  improvements: ImprovementMetrics;
};

const EMPTY_PLAN_METRICS: PlanMetrics = {
  route_count: 0,
  vehicle_count: 0,
  delivery_count: 0,
  total_distance_m: 0,
  total_time_s: 0,
  total_stops: 0,
  delivery_stops: 0
};

const EMPTY_IMPROVEMENTS: ImprovementMetrics = {
  distance_saved_m: 0,
  distance_saved_pct: 0,
  time_saved_s: 0,
  time_saved_pct: 0,
  routes_saved: 0,
  vehicles_saved: 0,
  daily_distance_saved_m: 0,
  daily_time_saved_s: 0
};

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function safeDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function metricsFrom(value: any): PlanMetrics {
  return {
    route_count: asNumber(value?.route_count),
    vehicle_count: asNumber(value?.vehicle_count),
    delivery_count: asNumber(value?.delivery_count),
    total_distance_m: asNumber(value?.total_distance_m),
    total_time_s: asNumber(value?.total_time_s),
    total_stops: asNumber(value?.total_stops),
    delivery_stops: asNumber(value?.delivery_stops)
  };
}

function improvementsFrom(value: any): ImprovementMetrics {
  return {
    distance_saved_m: asNumber(value?.distance_saved_m),
    distance_saved_pct: asNumber(value?.distance_saved_pct),
    time_saved_s: asNumber(value?.time_saved_s),
    time_saved_pct: asNumber(value?.time_saved_pct),
    routes_saved: asNumber(value?.routes_saved),
    vehicles_saved: asNumber(value?.vehicles_saved),
    daily_distance_saved_m: asNumber(value?.daily_distance_saved_m),
    daily_time_saved_s: asNumber(value?.daily_time_saved_s)
  };
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (!Number.isFinite(km) || km <= 0) return "0 km";
  if (km >= 100) return `${Math.round(km)} km`;
  return `${Math.round(km * 10) / 10} km`;
}

function formatSignedDistance(meters: number): string {
  const sign = meters > 0 ? "+" : meters < 0 ? "-" : "";
  return `${sign}${formatDistance(Math.abs(meters))}`;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatSignedDuration(seconds: number): string {
  const sign = seconds > 0 ? "+" : seconds < 0 ? "-" : "";
  return `${sign}${formatDuration(Math.abs(seconds))}`;
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatSignedCount(value: number): string {
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
}

function formatSignedMinutes(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}m`;
}

function formatSignedKm(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)} km`;
}

function metricTone(value: number): string {
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-rose-700";
  return "text-ink-900";
}

function metricToneCard(value: number): string {
  if (value > 0) return "border-emerald-200 bg-emerald-50";
  if (value < 0) return "border-rose-200 bg-rose-50";
  return "border-steel-100 bg-steel-50";
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

function dayResultTone(distanceSavedM: number, timeSavedS: number): number {
  const score = asNumber(distanceSavedM) + asNumber(timeSavedS);
  if (score > 0) return 1;
  if (score < 0) return -1;
  return 0;
}

function dayResultBgClass(distanceSavedM: number, timeSavedS: number): string {
  const tone = dayResultTone(distanceSavedM, timeSavedS);
  if (tone > 0) return "bg-emerald-50/60";
  if (tone < 0) return "bg-rose-50/60";
  return "bg-white";
}

function buildRangeStartDate(endDateIso: string, days: number): string {
  const end = new Date(`${endDateIso}T00:00:00Z`);
  return formatDate(addDays(end, -(Math.max(1, days) - 1)));
}

export default function PlannerDashboardPage() {
  const today = useMemo(() => formatDate(new Date()), []);
  const [startDate, setStartDate] = useState(() => buildRangeStartDate(today, 30));
  const [endDate, setEndDate] = useState(today);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>("all");

  const startIso = safeDate(startDate);
  const endIso = safeDate(endDate);
  const rangeValid = Boolean(startIso && endIso && startIso <= endIso);

  const dashboardQuery = usePlanDashboard({
    start_date: startIso || "",
    end_date: endIso || "",
    vehicle_type: vehicleFilter,
    enabled: rangeValid
  });

  const totalsManual = metricsFrom(dashboardQuery.data?.totals?.manual || EMPTY_PLAN_METRICS);
  const totalsPublished = metricsFrom(dashboardQuery.data?.totals?.published || EMPTY_PLAN_METRICS);
  const totalsImprovements = improvementsFrom(dashboardQuery.data?.totals?.improvements || EMPTY_IMPROVEMENTS);

  const comparedDays = asNumber(dashboardQuery.data?.coverage?.compared_dates);
  const rangeDays = asNumber(dashboardQuery.data?.coverage?.range_days);
  const highlights = Array.isArray(dashboardQuery.data?.highlights)
    ? (dashboardQuery.data?.highlights as unknown[])
        .map((item) =>
          asText(item)
            .replace("compared day(s)", "days compared")
            .replace("Route time", "Drive time")
        )
        .filter(Boolean)
    : [];

  const timeline = useMemo<DashboardRow[]>(() => {
    const rows = Array.isArray(dashboardQuery.data?.timeline) ? dashboardQuery.data.timeline : [];
    return rows
      .map((row: any) => ({
        date: asText(row?.date),
        manual: metricsFrom(row?.manual || EMPTY_PLAN_METRICS),
        published: metricsFrom(row?.published || EMPTY_PLAN_METRICS),
        improvements: improvementsFrom(row?.improvements || EMPTY_IMPROVEMENTS)
      }))
      .filter((row: DashboardRow) => safeDate(row.date))
      .sort((a: DashboardRow, b: DashboardRow) => b.date.localeCompare(a.date));
  }, [dashboardQuery.data?.timeline]);

  const stopsServedChange = totalsPublished.delivery_stops - totalsManual.delivery_stops;
  const stopsServedPct = safeDivide(stopsServedChange, totalsManual.delivery_stops) * 100;

  const manualMinutesPerStop = safeDivide(totalsManual.total_time_s / 60, totalsManual.delivery_stops);
  const publishedMinutesPerStop = safeDivide(totalsPublished.total_time_s / 60, totalsPublished.delivery_stops);
  const minutesPerStopSaved = manualMinutesPerStop - publishedMinutesPerStop;

  const manualKmPerStop = safeDivide(totalsManual.total_distance_m / 1000, totalsManual.delivery_stops);
  const publishedKmPerStop = safeDivide(totalsPublished.total_distance_m / 1000, totalsPublished.delivery_stops);
  const kmPerStopSaved = manualKmPerStop - publishedKmPerStop;

  const improvedDays = timeline.filter((row) => dayResultTone(row.improvements.distance_saved_m, row.improvements.time_saved_s) > 0).length;
  const winRatePct = safeDivide(improvedDays, comparedDays) * 100;
  const winRateTone = comparedDays <= 0 ? 0 : winRatePct >= 50 ? 1 : -1;

  const applyPreset = (days: number) => {
    setEndDate(today);
    setStartDate(buildRangeStartDate(today, days));
  };

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="text-xl font-semibold">Performance Dashboard</div>
              <div className="card-subtitle">
                See how your routes improved in the selected date range.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-steel-500">From</label>
              <DatePickerInput value={startDate} onChange={setStartDate} />
              <label className="text-xs text-steel-500">To</label>
              <DatePickerInput value={endDate} onChange={setEndDate} />
              <label className="text-xs text-steel-500">Vehicle</label>
              <select
                className="h-9 rounded-md border border-steel-200 bg-white px-2 text-xs"
                value={vehicleFilter}
                onChange={(event) => setVehicleFilter(event.target.value as VehicleFilter)}
              >
                <option value="all">All Vehicles</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="h-8 rounded-md border border-steel-200 px-2 text-xs" onClick={() => applyPreset(7)}>
              Last 7 Days
            </button>
            <button className="h-8 rounded-md border border-steel-200 px-2 text-xs" onClick={() => applyPreset(30)}>
              Last 30 Days
            </button>
            <button className="h-8 rounded-md border border-steel-200 px-2 text-xs" onClick={() => applyPreset(90)}>
              Last 90 Days
            </button>
          </div>

          {!rangeValid ? (
            <div className="mt-2 text-xs text-rose-700">Choose a valid date range in YYYY-MM-DD format.</div>
          ) : null}
          {rangeValid ? (
            <div className="mt-2 text-xs text-steel-500">
              Showing {startIso} to {endIso} ({rangeDays} days). Days with both plans: {comparedDays}.
            </div>
          ) : null}
          {rangeValid ? (
            <div className="mt-1 flex items-center gap-3 text-[11px] text-steel-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Better than manual
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Worse than manual
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-steel-400" />
                Same
              </span>
            </div>
          ) : null}
          {dashboardQuery.isLoading ? <div className="mt-2 text-xs text-steel-500">Loading dashboard data...</div> : null}
          {dashboardQuery.error ? (
            <div className="mt-2 text-xs text-rose-700">{(dashboardQuery.error as Error).message}</div>
          ) : null}
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <div className="text-lg font-semibold">Business Impact</div>
              <div className="card-subtitle">
                Clear, sales-ready numbers that show the value of the software.
              </div>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <ImpactCell
              label="Distance Saved"
              value={formatSignedDistance(totalsImprovements.distance_saved_m)}
              toneValue={totalsImprovements.distance_saved_m}
              detail={formatPct(totalsImprovements.distance_saved_pct)}
            />
            <ImpactCell
              label="Time Saved"
              value={formatSignedDuration(totalsImprovements.time_saved_s)}
              toneValue={totalsImprovements.time_saved_s}
              detail={formatPct(totalsImprovements.time_saved_pct)}
            />
            <ImpactCell
              label="Stops Served"
              value={formatSignedCount(stopsServedChange)}
              toneValue={stopsServedChange}
              detail={`${formatPct(stopsServedPct)} | With software: ${Math.round(totalsPublished.delivery_stops)} stops`}
            />
            <ImpactCell
              label="Routes Reduced"
              value={formatSignedCount(totalsImprovements.routes_saved)}
              toneValue={totalsImprovements.routes_saved}
              detail={`Vehicle change: ${formatSignedCount(totalsImprovements.vehicles_saved)}`}
            />
            <ImpactCell
              label="Faster Per Stop"
              value={formatSignedMinutes(minutesPerStopSaved)}
              toneValue={minutesPerStopSaved}
              detail={`Manual ${manualMinutesPerStop.toFixed(1)}m | Software ${publishedMinutesPerStop.toFixed(1)}m`}
            />
            <ImpactCell
              label="Less Travel Per Stop"
              value={formatSignedKm(kmPerStopSaved)}
              toneValue={kmPerStopSaved}
              detail={`Manual ${manualKmPerStop.toFixed(2)} km | Software ${publishedKmPerStop.toFixed(2)} km`}
            />
            <ImpactCell
              label="Better Days"
              value={`${improvedDays}/${Math.round(comparedDays)}`}
              toneValue={winRateTone}
              detail={`${winRatePct.toFixed(1)}% of compared days`}
            />
          </div>

          <div className="mt-3 space-y-1 text-xs text-steel-600">
            {highlights.map((line) => (
              <div key={line}>{line}</div>
            ))}
            {highlights.length === 0 ? <div>No highlights available for the selected range.</div> : null}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card">
            <div className="card-header">
              <div>
                <div className="text-lg font-semibold">Manual Plan Totals</div>
                <div className="card-subtitle">What the team handled without software optimization.</div>
              </div>
            </div>
            <MetricsGrid metrics={totalsManual} />
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <div className="text-lg font-semibold">Software Plan Totals</div>
                <div className="card-subtitle">What the team handled with optimized routes.</div>
              </div>
            </div>
            <MetricsGrid metrics={totalsPublished} />
          </section>
        </div>

        <section className="card">
          <div className="card-header">
            <div>
              <div className="text-lg font-semibold">Daily Results</div>
              <div className="card-subtitle">Color-coded daily impact versus the manual plan.</div>
            </div>
          </div>

          {timeline.length === 0 ? (
            <div className="text-sm text-steel-500">No days in this range have both a manual and software plan yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-steel-100 text-steel-500">
                    <th className="px-2 py-2 text-left font-semibold">Date</th>
                    <th className="px-2 py-2 text-right font-semibold">Manual Stops</th>
                    <th className="px-2 py-2 text-right font-semibold">Software Stops</th>
                    <th className="px-2 py-2 text-right font-semibold">Stops Served</th>
                    <th className="px-2 py-2 text-right font-semibold">Distance Saved</th>
                    <th className="px-2 py-2 text-right font-semibold">Time Saved</th>
                    <th className="px-2 py-2 text-right font-semibold">Routes Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((row) => (
                    <tr
                      key={row.date}
                      className={`border-b border-steel-50 ${dayResultBgClass(row.improvements.distance_saved_m, row.improvements.time_saved_s)}`}
                    >
                      <td className="px-2 py-2 text-left">{row.date}</td>
                      <td className="px-2 py-2 text-right">{Math.round(row.manual.delivery_stops)}</td>
                      <td className="px-2 py-2 text-right">{Math.round(row.published.delivery_stops)}</td>
                      <td
                        className={`px-2 py-2 text-right font-semibold ${metricTone(
                          row.published.delivery_stops - row.manual.delivery_stops
                        )}`}
                      >
                        {formatSignedCount(row.published.delivery_stops - row.manual.delivery_stops)}
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${metricTone(row.improvements.distance_saved_m)}`}>
                        {formatSignedDistance(row.improvements.distance_saved_m)}
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${metricTone(row.improvements.time_saved_s)}`}>
                        {formatSignedDuration(row.improvements.time_saved_s)}
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${metricTone(row.improvements.routes_saved)}`}>
                        {row.improvements.routes_saved > 0 ? "+" : ""}
                        {row.improvements.routes_saved}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function ImpactCell({
  label,
  value,
  detail,
  toneValue
}: {
  label: string;
  value: string;
  detail: string;
  toneValue: number;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${metricToneCard(toneValue)}`}>
      <div className="text-[11px] uppercase tracking-wide text-steel-500">{label}</div>
      <div className={`text-base font-semibold ${metricTone(toneValue)}`}>{value}</div>
      <div className="text-[11px] text-steel-500">{detail}</div>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: PlanMetrics }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCell label="Routes" value={String(metrics.route_count)} />
      <MetricCell label="Vehicles" value={String(metrics.vehicle_count)} />
      <MetricCell label="Deliveries" value={String(metrics.delivery_count)} />
      <MetricCell label="Stops Served" value={String(metrics.delivery_stops)} />
      <MetricCell label="All Stops" value={String(metrics.total_stops)} />
      <MetricCell label="Distance" value={formatDistance(metrics.total_distance_m)} />
      <MetricCell label="Duration" value={formatDuration(metrics.total_time_s)} />
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-steel-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
