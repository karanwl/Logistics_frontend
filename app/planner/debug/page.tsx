"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { usePlanMatrixDebug } from "@/lib/api/planner";
import { formatDate } from "@/lib/utils/dates";

type DebugNode = {
  node: number;
  label?: string;
  tokens?: Array<{
    token?: string;
    delivery_id?: string;
    job_name?: string;
    job_address?: string;
  }>;
};

function formatNumber(value: unknown): string {
  if (value == null || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString();
}

function normalizeNodes(data: any): DebugNode[] {
  if (Array.isArray(data?.matrix_index)) return data.matrix_index;
  if (Array.isArray(data?.nodes)) return data.nodes;
  return [];
}

function nodeHeading(node: DebugNode) {
  return `${node.node}: ${String(node.label || `Node ${node.node}`)}`;
}

function MatrixTable({
  title,
  matrix,
  nodes,
  unit
}: {
  title: string;
  matrix: unknown[][];
  nodes: DebugNode[];
  unit: string;
}) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return (
      <section className="card">
        <div className="card-header">
          <div>
            <div className="text-lg font-semibold">{title}</div>
            <div className="card-subtitle">No matrix data was returned.</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="card-subtitle">
            {matrix.length} x {matrix.length} ({unit})
          </div>
        </div>
      </div>
      <div className="overflow-auto max-h-[70vh] rounded-lg border border-steel-100">
        <table className="min-w-max w-full text-xs">
          <thead>
            <tr className="bg-steel-50">
              <th className="sticky left-0 z-20 border-b border-r border-steel-200 bg-steel-50 px-2 py-1 text-left">
                From \ To
              </th>
              {nodes.map((node) => (
                <th key={`col-${node.node}`} className="border-b border-steel-200 px-2 py-1 text-left whitespace-nowrap">
                  {nodeHeading(node)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIdx) => (
              <tr key={`row-${rowIdx}`} className="odd:bg-white even:bg-steel-50/40">
                <th className="sticky left-0 z-10 border-r border-steel-200 bg-white px-2 py-1 text-left whitespace-nowrap">
                  {nodeHeading(nodes[rowIdx] || { node: rowIdx, label: `Node ${rowIdx}` })}
                </th>
                {Array.isArray(row)
                  ? row.map((cell, colIdx) => (
                      <td key={`cell-${rowIdx}-${colIdx}`} className="border-l border-steel-100 px-2 py-1 text-right">
                        {formatNumber(cell)}
                      </td>
                    ))
                  : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PlannerMatrixDebugPage() {
  const today = useMemo(() => formatDate(new Date()), []);
  const [date, setDate] = useState(today);
  const [trucks, setTrucks] = useState(2);
  const [vans, setVans] = useState(1);
  const [routeNodes, setRouteNodes] = useState("");
  const [compareNodes, setCompareNodes] = useState("");
  const [submitted, setSubmitted] = useState<{
    date: string;
    trucks: number;
    vans: number;
    route_nodes: string;
    compare_nodes: string;
  } | null>(null);

  const debugQuery = usePlanMatrixDebug({
    date: submitted?.date || "",
    trucks: submitted?.trucks ?? trucks,
    vans: submitted?.vans ?? vans,
    route_nodes: submitted?.route_nodes || "",
    compare_nodes: submitted?.compare_nodes || "",
    enabled: Boolean(submitted?.date)
  });

  const data = debugQuery.data;
  const nodes = normalizeNodes(data);
  const distanceMatrix = (data?.distance_matrix_m || []) as unknown[][];
  const durationMatrix = (data?.duration_matrix_s || []) as unknown[][];
  const dropped = (data?.run_debug?.dropped_nodes || []) as Array<any>;
  const routes = (data?.run_debug?.routes || []) as Array<any>;

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="text-xl font-semibold">Planner Matrix Debug</div>
              <div className="card-subtitle">
                Inspect matrix indices by job names and solver diagnostics to understand dropped nodes.
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-6">
            <div>
              <label className="text-xs text-steel-500">Plan Date</label>
              <DatePickerInput className="mt-1 h-9" value={date} onChange={setDate} />
            </div>
            <div>
              <label className="text-xs text-steel-500">Trucks</label>
              <Input
                className="mt-1 h-9"
                type="number"
                min={0}
                value={trucks}
                onChange={(e) => setTrucks(Math.max(0, Number(e.target.value || 0)))}
              />
            </div>
            <div>
              <label className="text-xs text-steel-500">Vans</label>
              <Input
                className="mt-1 h-9"
                type="number"
                min={0}
                value={vans}
                onChange={(e) => setVans(Math.max(0, Number(e.target.value || 0)))}
              />
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-steel-500">Primary Route Nodes (optional comma list)</label>
              <Input
                className="mt-1 h-9"
                value={routeNodes}
                onChange={(e) => setRouteNodes(e.target.value)}
                placeholder="Example: 4,7,9,3"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-steel-500">Compare Route Nodes (optional comma list)</label>
              <Input
                className="mt-1 h-9"
                value={compareNodes}
                onChange={(e) => setCompareNodes(e.target.value)}
                placeholder="Example: 4,9,7,3"
              />
            </div>
            <div className="flex items-end gap-2 lg:col-span-3">
              <Button
                onClick={() =>
                  setSubmitted({
                    date,
                    trucks,
                    vans,
                    route_nodes: routeNodes,
                    compare_nodes: compareNodes
                  })
                }
                disabled={debugQuery.isFetching}
              >
                {debugQuery.isFetching ? "Loading..." : "Load Debug Data"}
              </Button>
              <Button variant="outline" onClick={() => debugQuery.refetch()} disabled={debugQuery.isFetching}>
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {debugQuery.error ? (
          <section className="card">
            <div className="empty-state">{String((debugQuery.error as any)?.message || "Failed to load debug data.")}</div>
          </section>
        ) : null}

        {data ? (
          <>
            <section className="card">
              <div className="card-header">
                <div>
                  <div className="text-lg font-semibold">Run Diagnostics</div>
                  <div className="card-subtitle">
                    Date {String(data?.target_date || "-")} | Nodes {formatNumber(data?.node_count)} | Deliveries {formatNumber(data?.delivery_count)}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-steel-100 bg-steel-50/60 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-steel-500">Routes</div>
                  <div className="text-base font-semibold">{formatNumber(data?.run_debug?.route_count)}</div>
                </div>
                <div className="rounded-lg border border-steel-100 bg-steel-50/60 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-steel-500">Dropped Nodes</div>
                  <div className="text-base font-semibold">{formatNumber(data?.run_debug?.dropped_count)}</div>
                </div>
                <div className="rounded-lg border border-steel-100 bg-steel-50/60 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-steel-500">Max Distance Leg</div>
                  <div className="text-sm font-semibold">
                    {formatNumber(data?.matrix_extremes?.max_distance?.distance_m)} m
                  </div>
                </div>
                <div className="rounded-lg border border-steel-100 bg-steel-50/60 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-steel-500">Max Duration Leg</div>
                  <div className="text-sm font-semibold">
                    {formatNumber(data?.matrix_extremes?.max_duration?.duration_s)} s
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <div className="rounded-lg border border-steel-100 p-3">
                  <div className="text-sm font-semibold">Dropped Node Details</div>
                  {dropped.length === 0 ? (
                    <div className="mt-2 text-xs text-steel-500">No dropped nodes for this run.</div>
                  ) : (
                    <div className="mt-2 space-y-2 text-xs">
                      {dropped.map((item: any) => (
                        <div key={`drop-${item.node}`} className="rounded-md border border-steel-100 px-2 py-2">
                          <div className="font-semibold">
                            Node {item.node}: {String(item.label || "")}
                          </div>
                          <div className="text-steel-500">
                            {Array.isArray(item.tokens) && item.tokens.length > 0
                              ? item.tokens.map((t: any) => t.job_name || t.delivery_id || t.token).join(" | ")
                              : "No token details"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-steel-100 p-3">
                  <div className="text-sm font-semibold">Route Breakdown</div>
                  {routes.length === 0 ? (
                    <div className="mt-2 text-xs text-steel-500">No route output for this run.</div>
                  ) : (
                    <div className="mt-2 space-y-2 text-xs">
                      {routes.map((route: any, idx: number) => (
                        <div key={`route-${idx}`} className="rounded-md border border-steel-100 px-2 py-2">
                          <div className="font-semibold">
                            Vehicle {String(route.vehicle_id || idx + 1)} ({String(route.vehicle_type || "")})
                          </div>
                          <div className="text-steel-500">
                            Distance {formatNumber(route?.matrix_breakdown?.total_distance_m)} m | Time {formatNumber(route?.matrix_breakdown?.total_duration_s)} s
                          </div>
                          <div className="text-steel-500">
                            {Array.isArray(route?.matrix_stop_labels) ? route.matrix_stop_labels.join(" -> ") : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <div>
                  <div className="text-lg font-semibold">Node Index</div>
                  <div className="card-subtitle">Node number to job name/address mapping used by matrix rows/columns.</div>
                </div>
              </div>
              <div className="overflow-auto max-h-[40vh] rounded-lg border border-steel-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-steel-50">
                      <th className="px-2 py-1 text-left">Node</th>
                      <th className="px-2 py-1 text-left">Label</th>
                      <th className="px-2 py-1 text-left">Tokens / Jobs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((node) => (
                      <tr key={`node-${node.node}`} className="border-t border-steel-100">
                        <td className="px-2 py-1">{node.node}</td>
                        <td className="px-2 py-1">{String(node.label || "")}</td>
                        <td className="px-2 py-1 text-steel-600">
                          {Array.isArray(node.tokens) && node.tokens.length > 0
                            ? node.tokens.map((t) => t.job_name || t.delivery_id || t.token).join(" | ")
                            : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <MatrixTable title="Distance Matrix" matrix={distanceMatrix} nodes={nodes} unit="meters" />
            <MatrixTable title="Duration Matrix" matrix={durationMatrix} nodes={nodes} unit="seconds" />
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
