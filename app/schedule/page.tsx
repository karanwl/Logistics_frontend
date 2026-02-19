"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AppShell from "@/components/layout/AppShell";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Button } from "@/components/ui/button";
import { useFormError } from "@/hooks/useFormError";
import { useCurrentUser } from "@/lib/api/auth";
import { api } from "@/lib/api/client";
import {
  useDeliveries,
  useRescheduleDelivery,
  useBulkUpdateDeliveries,
  useDeleteDelivery
} from "@/lib/api/planner";
import { startOfWeek, addDays, formatDate } from "@/lib/utils/dates";
import { readErrorMessage } from "@/lib/errors/client";
import { normalizePhotoUrls, resolvePhotoUrl } from "@/lib/utils/photos";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, count: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

function monthLabel(date: Date) {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function compareDate(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function statusColor(dateKey: string, psDelivered: boolean, todayKey: string) {
  const cmp = compareDate(dateKey, todayKey);
  if (cmp >= 0) return "bg-orange-200";
  return psDelivered ? "bg-green-200" : "bg-red-200";
}

function getCalendarGrid(date: Date) {
  const first = startOfMonth(date);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function matchesSearch(delivery: any, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  return [delivery.job_name, delivery.sales_order]
    .filter(Boolean)
    .some((v: string) => v.toLowerCase().includes(q));
}

function jobColorKey(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function jobBorderColor(label: string) {
  const palette = ["#1d4ed8", "#0f766e", "#a21caf", "#b45309", "#16a34a", "#be123c"];
  const idx = jobColorKey(label) % palette.length;
  return palette[idx];
}

function buildTimeOptions(startHour: number, endHour: number, stepMinutes: number) {
  const options: string[] = [];
  const start = startHour * 60;
  const end = endHour * 60;
  for (let minutes = start; minutes <= end; minutes += stepMinutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return options;
}

const TIME_OPTIONS = ["", ...buildTimeOptions(6, 18, 15)];

const PICKUP_VEHICLE_OPTIONS = [
  { value: "both", label: "Both" },
  { value: "van", label: "Van preferred" },
  { value: "truck", label: "Truck preferred" }
];

function pickupVehicleLabel(value: string | undefined | null) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "--";
  const match = PICKUP_VEHICLE_OPTIONS.find((opt) => opt.value === normalized);
  return match ? match.label : normalized;
}

function DeliveryCard({ delivery, columnKey, index }: { delivery: any; columnKey: string; index: number }) {
  const id = `${delivery.delivery_id}`;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data: { deliveryId: delivery.delivery_id, from: columnKey, columnKey, index }
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-lg border border-steel-100 bg-white px-3 py-2 shadow-sm"
      {...attributes}
      {...listeners}
    >
      <div className="text-sm font-semibold">{delivery.job_name}</div>
      <div className="text-xs text-steel-500">{delivery.sales_order ? `SO #${delivery.sales_order}` : "SO --"}</div>
    </div>
  );
}

function DroppableColumn({ columnKey, title, items }: { columnKey: string; title: string; items: any[] }) {
  const { setNodeRef } = useDroppable({ id: columnKey, data: { columnKey } });
  return (
    <div ref={setNodeRef} className="card">
      <div className="text-sm font-semibold">{title}</div>
      <SortableContext items={items.map((i) => i.delivery_id)} strategy={verticalListSortingStrategy}>
        <div className="mt-3 space-y-2">
          {items.map((delivery: any, index: number) => (
            <DeliveryCard key={delivery.delivery_id} delivery={delivery} columnKey={columnKey} index={index} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function SchedulePage() {
  const [todayKey] = useState(() => formatDate(new Date()));
  const [weekDate, setWeekDate] = useState(todayKey);
  const [view, setView] = useState<"board" | "calendar" | "list">("calendar");
  const [search, setSearch] = useState("");
  const [listDate, setListDate] = useState("");
  const [monthDate, setMonthDate] = useState(() => startOfMonth(parseDateKey(todayKey)));
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDelivery, setDrawerDelivery] = useState<any | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const { formError, clearFormError, setFormError } = useFormError("Could not save schedule changes.");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({
    key: "scheduled_date",
    dir: "asc"
  });
  const { data: currentUser } = useCurrentUser();
  const role = (currentUser?.user?.role || "").toLowerCase();
  const canEdit = role === "admin" || role === "manager";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextView = params.get("view");
    if (nextView === "board" || nextView === "calendar" || nextView === "list") {
      setView(nextView);
    }
  }, []);

  const { data, refetch } = useDeliveries();
  const reschedule = useRescheduleDelivery();
  const bulkUpdate = useBulkUpdateDeliveries();
  const deleteDelivery = useDeleteDelivery();

  const weekStart = useMemo(() => startOfWeek(parseDateKey(weekDate)), [weekDate]);
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const filtered = useMemo(() => {
    return (data?.deliveries || []).filter((d: any) => matchesSearch(d, search));
  }, [data, search]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = { unscheduled: [] };
    const weekKeys = new Set(days.map((d) => formatDate(d)));
    weekKeys.forEach((key) => {
      map[key] = [];
    });
    filtered.forEach((d: any) => {
      if (!d.scheduled_date) {
        map.unscheduled.push(d);
        return;
      }
      if (weekKeys.has(d.scheduled_date)) {
        map[d.scheduled_date].push(d);
      }
    });
    return map;
  }, [filtered, days]);

  const calendarDays = useMemo(() => getCalendarGrid(monthDate), [monthDate]);
  const calendarGroups = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((d: any) => {
      const key = d.scheduled_date || "unscheduled";
      map[key] = map[key] || [];
      map[key].push(d);
    });
    return map;
  }, [filtered]);

  const listRows = useMemo(() => {
    const base = filtered.filter((d: any) => (listDate ? d.scheduled_date === listDate : true));
    const valueFor = (row: any, key: string) => {
      switch (key) {
        case "ps_delivered":
          return row.ps_delivered ? 1 : 0;
        case "scheduled_date":
          return row.scheduled_date || "";
        case "sales_order":
          return row.sales_order || "";
        case "job_name":
          return row.job_name || "";
        case "window_start":
          return row.window_start || "";
        case "window_end":
          return row.window_end || "";
        case "med_skid":
        case "small_skid":
        case "large_skid":
        case "door":
        case "frame":
        case "exp_frame":
        case "box":
          return Number(row[key] || 0);
        case "pickup":
          return row.pickup ? 1 : 0;
        case "pickup_vehicle":
          return row.pickup_vehicle || "";
        case "requires_empty_truck":
          return row.requires_empty_truck ? 1 : 0;
        default:
          return row[key] ?? "";
      }
    };
    const sorted = [...base].sort((a, b) => {
      const av = valueFor(a, sort.key);
      const bv = valueFor(b, sort.key);
      if (av === bv) return 0;
      const order = av > bv ? 1 : -1;
      return sort.dir === "asc" ? order : -order;
    });
    return sorted;
  }, [filtered, listDate, sort.key, sort.dir]);

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const onDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!active || !over) return;
    const from = active.data.current?.from;
    const to = over.data.current?.columnKey || over.id;
    if (!from || !to || from === to) return;
    clearFormError();
    try {
      await reschedule.mutateAsync({
        delivery_id: active.data.current.deliveryId,
        scheduled_date: to === "unscheduled" ? null : to
      });
      refetch();
    } catch (error: unknown) {
      setFormError(error, "Could not reschedule delivery.");
    }
  };

  const updateEdit = (deliveryId: string, patch: any) => {
    setEdits((prev) => ({
      ...prev,
      [deliveryId]: { ...(prev[deliveryId] || {}), ...patch }
    }));
  };

  const saveChanges = async () => {
    clearFormError();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const updates of Object.values(edits)) {
      const scheduled = (updates as any)?.scheduled_date;
      if (scheduled && !dateRegex.test(String(scheduled))) {
        setSaveStatus("Please enter a valid scheduled date.");
        return;
      }
      const ws = (updates as any)?.window_start;
      if (ws && !timeRegex.test(String(ws))) {
        setSaveStatus("Please enter a valid start time.");
        return;
      }
      const we = (updates as any)?.window_end;
      if (we && !timeRegex.test(String(we))) {
        setSaveStatus("Please enter a valid end time.");
        return;
      }
    }
    const payload = Object.entries(edits).map(([delivery_id, updates]) => ({
      delivery_id,
      ...updates
    }));
    if (payload.length === 0) {
      setSaveStatus("There are no changes to save.");
      return;
    }
    setSaveStatus("Saving updates...");
    let result: any;
    try {
      result = await bulkUpdate.mutateAsync({ deliveries: payload });
    } catch (error: unknown) {
      setSaveStatus("");
      setFormError(error, "Could not save updates.");
      return;
    }
    const updated = Number(result?.updated || 0);
    const errors = Array.isArray(result?.errors) ? result.errors : [];
    if (errors.length > 0) {
      const first = errors[0] || {};
      setSaveStatus(
        `Updated ${updated}. ${errors.length} failed${first.error ? `: ${first.error}` : "."}`
      );
      if (updated > 0) {
        refetch();
      }
      return;
    }

    setEdits({});
    setSaveStatus(updated > 0 ? `Saved ${updated} change${updated === 1 ? "" : "s"}.` : "No rows were updated.");
    refetch();
    if (view === "list") {
      setView("calendar");
    }
  };

  const openDrawer = (delivery: any) => {
    const deliveryId = String(delivery?.delivery_id || "").trim();
    setDrawerDelivery({ ...delivery, delivery_id: deliveryId });
    setDrawerDetail(null);
    setDrawerError("");
    setDrawerLoading(true);
    setDrawerOpen(true);
    if (!deliveryId) {
      setDrawerLoading(false);
      setDrawerError("Missing delivery id.");
      return;
    }
    api
      .get<Record<string, any>>(`/api/driver/deliveries/${encodeURIComponent(deliveryId)}`)
      .then((detail) => {
        setDrawerDetail(detail || null);
      })
      .catch((err: unknown) => {
        const message = readErrorMessage(err, "Could not load delivery details.");
        setDrawerError(message);
      })
      .finally(() => {
        setDrawerLoading(false);
      });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerDelivery(null);
    setDrawerDetail(null);
    setDrawerLoading(false);
    setDrawerError("");
  };
  const drawerData = drawerDetail || drawerDelivery;
  const drawerPhotoUrls = normalizePhotoUrls(drawerData?.photo_urls).map(resolvePhotoUrl);
  const listCellClass = canEdit && editMode ? "py-2 text-center align-middle" : "py-2";
  const listNumberInputClass = "hide-number-spin text-center";

  return (
    <AppShell>
      <section className="card schedule-toolbar" id="scheduleToolbar">
        <div className={view === "board" ? "" : "hidden"} id="boardToolbarControls">
          <div className="flex items-center justify-between gap-4 schedule-toolbar-row">
            <div className="board-field board-search w-72">
              <label htmlFor="boardSearch" className="sr-only">Search deliveries</label>
              <Input id="boardSearch" type="search" placeholder="Search deliveries" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="board-field board-week w-48 text-center">
              <label htmlFor="boardWeek" className="text-xs text-steel-500 block">Week starting</label>
              <DatePickerInput
                id="boardWeek"
                className="h-9"
                value={weekDate}
                onChange={(value) => setWeekDate(value)}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <div className="view-toggle" role="group" aria-label="View type">
                <button className={`toggle-btn ${view === "board" ? "is-active" : ""}`} type="button" onClick={() => setView("board")}>Board view</button>
                <button className={`toggle-btn ${view === "calendar" ? "is-active" : ""}`} type="button" onClick={() => setView("calendar")}>Calendar view</button>
                <button className={`toggle-btn ${view === "list" ? "is-active" : ""}`} type="button" onClick={() => setView("list")}>List view</button>
              </div>
            </div>
          </div>
        </div>

        <div id="calendarToolbarControls" className={view === "calendar" ? "" : "hidden"}>
          <div className="flex items-center justify-between gap-4 schedule-toolbar-row">
            <div className="calendar-filters w-72">
              <label htmlFor="calendarSearch" className="sr-only">Search deliveries</label>
              <Input id="calendarSearch" type="search" placeholder="Search deliveries" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="calendar-title-wrap flex items-center gap-3 justify-center w-64">
              <button className="btn btn-secondary icon-only" type="button" onClick={() => setMonthDate(addMonths(monthDate, -1))} aria-label="Previous month">
                {"<"}
              </button>
              <div className="calendar-title text-sm text-steel-600">{monthLabel(monthDate)}</div>
              <button className="btn btn-secondary icon-only" type="button" onClick={() => setMonthDate(addMonths(monthDate, 1))} aria-label="Next month">
                {">"}
              </button>
            </div>
            <div className="flex items-center justify-end gap-3">
              <div className="view-toggle" role="group" aria-label="View type">
                <button className={`toggle-btn ${view === "board" ? "is-active" : ""}`} type="button" onClick={() => setView("board")}>Board view</button>
                <button className={`toggle-btn ${view === "calendar" ? "is-active" : ""}`} type="button" onClick={() => setView("calendar")}>Calendar view</button>
                <button className={`toggle-btn ${view === "list" ? "is-active" : ""}`} type="button" onClick={() => setView("list")}>List view</button>
              </div>
            </div>
          </div>
        </div>

        <div id="listToolbarControls" className={view === "list" ? "" : "hidden"}>
          <div className="flex items-center justify-between gap-4 schedule-toolbar-row">
            <div className="calendar-filters w-72">
              <label htmlFor="listSearch" className="sr-only">Search deliveries</label>
              <Input id="listSearch" type="search" placeholder="Search deliveries" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 justify-center w-64">
              <label htmlFor="listDate" className="text-xs text-steel-500">Date</label>
                <DatePickerInput
                  id="listDate"
                  className="h-9"
                  value={listDate}
                  onChange={(value) => setListDate(value)}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                {canEdit ? (
                  <>
                    <label className="text-xs text-steel-500">
                    <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} /> Editing
                    </label>
                  <Button variant="secondary" onClick={saveChanges} disabled={bulkUpdate.isPending}>Save updates</Button>
                  <div className="text-xs text-steel-500">{saveStatus}</div>
                </>
              ) : null}
              <div className="view-toggle" role="group" aria-label="View type">
                <button className={`toggle-btn ${view === "board" ? "is-active" : ""}`} type="button" onClick={() => setView("board")}>Board view</button>
                <button className={`toggle-btn ${view === "calendar" ? "is-active" : ""}`} type="button" onClick={() => setView("calendar")}>Calendar view</button>
                <button className={`toggle-btn ${view === "list" ? "is-active" : ""}`} type="button" onClick={() => setView("list")}>List view</button>
              </div>
            </div>
          </div>
        </div>

        <div className="schedule-toggle hidden" />
      </section>
      {formError ? <ErrorBanner error={formError} /> : null}

      <div id="boardView" className={view === "board" ? "" : "hidden"}>
        <section className="board-shell">
          <div id="scheduleBoard" className="planner-board scroll-area">
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <div className="grid grid-cols-[repeat(6,minmax(220px,1fr))] gap-4 p-4">
                {days.map((d) => {
                  const key = formatDate(d);
                  return (
                    <DroppableColumn key={key} columnKey={key} title={key} items={grouped[key] || []} />
                  );
                })}
                <DroppableColumn columnKey="unscheduled" title="Not Scheduled" items={grouped.unscheduled || []} />
              </div>
            </DndContext>
          </div>
        </section>
      </div>

      <div id="calendarView" className={view === "calendar" ? "" : "hidden"}>
        <section className="calendar-shell">
          <div id="scheduleCalendar" className="planner-calendar scroll-area p-4">
            <div className="grid grid-cols-7 gap-2 text-xs text-steel-500">
              {"Mon Tue Wed Thu Fri Sat Sun".split(" ").map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarDays.map((d) => {
                const key = formatDate(d);
                const inMonth = toMonthKey(d) === toMonthKey(monthDate);
                const items = calendarGroups[key] || [];
                return (
                  <CalendarDay
                    key={key}
                    date={d}
                    dateKey={key}
                    todayKey={todayKey}
                    inMonth={inMonth}
                    items={items}
                    expanded={Boolean(expandedDays[key])}
                    onToggleExpand={() => setExpandedDays((prev) => ({ ...prev, [key]: !prev[key] }))}
                    onOpen={(item) => openDrawer(item)}
                  />
                );
              })}
            </div>
          </div>
          <div id="calendarUnscheduled" className="calendar-unscheduled scroll-area hidden" />
        </section>
      </div>

      <div id="listView" className={view === "list" ? "" : "hidden"}>
        <section className="card">
          <div id="scheduleList" className="table-wrap table-full p-4 max-h-[70vh] overflow-auto">
            <table className="w-full text-sm border-collapse [&_th]:border [&_th]:border-steel-200 [&_th]:bg-white/95 [&_th]:px-2 [&_th]:py-2 [&_td]:border [&_td]:border-steel-100 [&_td]:px-2 [&_td]:py-2">
              <thead className="text-xs text-steel-500 sticky top-0 bg-white/90 backdrop-blur z-10">
                <tr>
                {canEdit && editMode && (
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("ps_delivered")}>
                      Packing Slip Sent {sort.key === "ps_delivered" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                )}
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("scheduled_date")}>
                      Scheduled Date {sort.key === "scheduled_date" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("job_name")}>
                      Location {sort.key === "job_name" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("sales_order")}>
                      Sales Order # {sort.key === "sales_order" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("window_start")}>
                      Delivery Window {sort.key === "window_start" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("pickup")}>
                      Pickup? {sort.key === "pickup" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("pickup_vehicle")}>
                      Pickup Vehicle {sort.key === "pickup_vehicle" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("requires_empty_truck")}>
                      Needs Empty Truck {sort.key === "requires_empty_truck" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("large_skid")}>
                      Large Skids {sort.key === "large_skid" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("med_skid")}>
                      Medium Skids {sort.key === "med_skid" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("small_skid")}>
                      Small Skids {sort.key === "small_skid" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("door")}>
                      Doors {sort.key === "door" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("frame")}>
                      Frames {sort.key === "frame" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("exp_frame")}>
                      Express Frames {sort.key === "exp_frame" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("box")}>
                      Boxes {sort.key === "box" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  {!editMode && <th className="text-left py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {listRows.map((d: any) => (
                  <tr key={d.delivery_id} className="border-t border-steel-100">
                    {canEdit && editMode && (
                      <td className={listCellClass}>
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            defaultChecked={Boolean(d.ps_delivered)}
                            onChange={(e) => updateEdit(d.delivery_id, { ps_delivered: e.target.checked })}
                          />
                        </div>
                      </td>
                    )}
                    <td className={listCellClass}>
                      {canEdit && editMode ? (
                        <DatePickerInput
                          className="h-9 text-xs mx-auto text-center"
                          defaultValue={d.scheduled_date || ""}
                          onChange={(value) => updateEdit(d.delivery_id, { scheduled_date: value })}
                        />
                      ) : (
                        d.scheduled_date || "--"
                      )}
                    </td>
                    <td className={listCellClass}>
                      <button
                        type="button"
                        className={`font-semibold hover:text-ink-900 ${canEdit && editMode ? "mx-auto block text-center" : "text-left"}`}
                        onClick={() => openDrawer(d)}
                      >
                        {d.job_name}
                      </button>
                    </td>
                    <td className={listCellClass}>{d.sales_order || "--"}</td>
                    <td className={listCellClass}>
                      {canEdit && editMode ? (
                        <div className="grid grid-cols-2 gap-2 justify-center">
                          <select
                            className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm text-center"
                            defaultValue={d.window_start || ""}
                            onChange={(e) => updateEdit(d.delivery_id, { window_start: e.target.value })}
                          >
                            <option value="">Start</option>
                            {TIME_OPTIONS.map((t) => (
                              <option key={`start-${t || "any"}`} value={t}>{t || "--"}</option>
                            ))}
                          </select>
                          <select
                            className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm text-center"
                            defaultValue={d.window_end || ""}
                            onChange={(e) => updateEdit(d.delivery_id, { window_end: e.target.value })}
                          >
                            <option value="">End</option>
                            {TIME_OPTIONS.map((t) => (
                              <option key={`end-${t || "any"}`} value={t}>{t || "--"}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        `${d.window_start || "--"} - ${d.window_end || "--"}`
                      )}
                    </td>
                    <td className={listCellClass}>
                      {canEdit && editMode ? (
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            defaultChecked={Boolean(d.pickup)}
                            onChange={(e) => updateEdit(d.delivery_id, { pickup: e.target.checked })}
                          />
                        </div>
                      ) : (
                        d.pickup ? "Yes" : "No"
                      )}
                    </td>
                    <td className={listCellClass}>
                      {canEdit && editMode ? (
                        <select
                          className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm text-center"
                          defaultValue={d.pickup ? (d.pickup_vehicle || "both") : ""}
                          onChange={(e) => updateEdit(d.delivery_id, { pickup_vehicle: e.target.value })}
                        >
                          <option value="">--</option>
                          {PICKUP_VEHICLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        d.pickup ? pickupVehicleLabel(d.pickup_vehicle || "both") : "--"
                      )}
                    </td>
                    <td className={listCellClass}>
                      {canEdit && editMode ? (
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            defaultChecked={Boolean(d.requires_empty_truck)}
                            onChange={(e) => updateEdit(d.delivery_id, { requires_empty_truck: e.target.checked })}
                          />
                        </div>
                      ) : (
                        d.requires_empty_truck ? "Yes" : "No"
                      )}
                    </td>
                    <td className={`${listCellClass} w-20`}>
                      {canEdit && editMode ? (
                        <Input className={listNumberInputClass} type="number" defaultValue={d.large_skid || 0} onChange={(e) => updateEdit(d.delivery_id, { large_skid: Number(e.target.value) })} />
                      ) : (
                        d.large_skid || 0
                      )}
                    </td>
                    <td className={`${listCellClass} w-20`}>
                      {canEdit && editMode ? (
                        <Input className={listNumberInputClass} type="number" defaultValue={d.med_skid || 0} onChange={(e) => updateEdit(d.delivery_id, { med_skid: Number(e.target.value) })} />
                      ) : (
                        d.med_skid || 0
                      )}
                    </td>
                    <td className={`${listCellClass} w-20`}>
                      {canEdit && editMode ? (
                        <Input className={listNumberInputClass} type="number" defaultValue={d.small_skid || 0} onChange={(e) => updateEdit(d.delivery_id, { small_skid: Number(e.target.value) })} />
                      ) : (
                        d.small_skid || 0
                      )}
                    </td>
                    <td className={`${listCellClass} w-16`}>
                      {canEdit && editMode ? (
                        <Input className={listNumberInputClass} type="number" defaultValue={d.door || 0} onChange={(e) => updateEdit(d.delivery_id, { door: Number(e.target.value) })} />
                      ) : (
                        d.door || 0
                      )}
                    </td>
                    <td className={`${listCellClass} w-16`}>
                      {canEdit && editMode ? (
                        <Input className={listNumberInputClass} type="number" defaultValue={d.frame || 0} onChange={(e) => updateEdit(d.delivery_id, { frame: Number(e.target.value) })} />
                      ) : (
                        d.frame || 0
                      )}
                    </td>
                    <td className={`${listCellClass} w-20`}>
                      {canEdit && editMode ? (
                        <Input className={listNumberInputClass} type="number" defaultValue={d.exp_frame || 0} onChange={(e) => updateEdit(d.delivery_id, { exp_frame: Number(e.target.value) })} />
                      ) : (
                        d.exp_frame || 0
                      )}
                    </td>
                    <td className={`${listCellClass} w-16`}>
                      {canEdit && editMode ? (
                        <Input className={listNumberInputClass} type="number" defaultValue={d.box || 0} onChange={(e) => updateEdit(d.delivery_id, { box: Number(e.target.value) })} />
                      ) : (
                        d.box || 0
                      )}
                    </td>
                    {!editMode && (
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary icon-only inline-flex items-center justify-center"
                            aria-label="View details"
                            onClick={() => openDrawer(d)}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
                              <circle cx="12" cy="12" r="2.5" />
                            </svg>
                            <span className="sr-only">View details</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary icon-only inline-flex items-center justify-center"
                            aria-label="Delete delivery"
                            onClick={async () => {
                              const ok = window.confirm("Delete this delivery?");
                              if (!ok) return;
                              clearFormError();
                              try {
                                await deleteDelivery.mutateAsync({ delivery_id: d.delivery_id });
                                refetch();
                              } catch (error: unknown) {
                                setFormError(error, "Could not delete delivery.");
                              }
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                            <span className="sr-only">Delete delivery</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div id="inlineEditDrawer" className={`delivery-popup ${drawerOpen ? "" : "is-hidden"}`} aria-hidden={!drawerOpen}>
        <div className="delivery-popup-backdrop" onClick={closeDrawer} />
        <div className="delivery-popup-panel" role="dialog" aria-modal="true" aria-labelledby="inlineEditTitle">
          <div className="delivery-popup-header">
            <div>
              <p className="panel-title">Delivery Snapshot</p>
              <h2 id="inlineEditTitle" className="text-xl font-semibold">Delivery Details</h2>
              <p className="card-subtitle" id="inlineEditSubtitle">Status, notes, and POD in one place.</p>
            </div>
            <button className="btn btn-secondary icon-only" type="button" aria-label="Close" onClick={closeDrawer}>
              X
            </button>
          </div>

          <div id="inlineEditBody" className="delivery-popup-body">
            {!drawerData ? (
              <div className="empty-state">No delivery selected.</div>
            ) : drawerLoading ? (
              <div className="empty-state">Loading delivery details...</div>
            ) : (
              <div className="delivery-popup-layout">
                <div className="delivery-popup-left">
                  <div className="delivery-popup-summary">
                    <div>
                      <div className="text-xs text-steel-500">Delivery ID</div>
                      <div className="text-sm font-semibold">{drawerData.delivery_id || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Sales Order</div>
                      <div className="text-sm">{drawerData.sales_order || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Location</div>
                      <div className="text-sm font-semibold">{drawerData.job_name || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Address</div>
                      <div className="text-sm">{drawerData.job_address || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Site Contact</div>
                      <div className="text-sm">{drawerData.site_contact || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Contact Number</div>
                      <div className="text-sm">{drawerData.site_contact_number || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Status</div>
                      <div className="text-sm">{drawerData.status || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Assigned Driver</div>
                      <div className="text-sm">{drawerData.assigned_driver || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Date</div>
                      <div className="text-sm">{drawerData.scheduled_date || "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Window</div>
                      <div className="text-sm">{`${drawerData.window_start || "--"} - ${drawerData.window_end || "--"}`}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Status Updated</div>
                      <div className="text-sm">{drawerData.status_updated_at || "--"}</div>
                    </div>
                  </div>

                  <div className="delivery-popup-summary">
                    <div>
                      <div className="text-xs text-steel-500">Large Skids</div>
                      <div className="text-sm">{Number(drawerData.large_skid || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Medium Skids</div>
                      <div className="text-sm">{Number(drawerData.med_skid || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Small Skids</div>
                      <div className="text-sm">{Number(drawerData.small_skid || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Doors</div>
                      <div className="text-sm">{Number(drawerData.door || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Frames</div>
                      <div className="text-sm">{Number(drawerData.frame || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Express Frames</div>
                      <div className="text-sm">{Number(drawerData.exp_frame || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Boxes</div>
                      <div className="text-sm">{Number(drawerData.box || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Pickup</div>
                      <div className="text-sm">{drawerData.pickup ? "Yes" : "No"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Pickup Vehicle</div>
                      <div className="text-sm">
                        {drawerData.pickup ? pickupVehicleLabel(drawerData.pickup_vehicle || "both") : "--"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-steel-500">Requires Empty Truck</div>
                      <div className="text-sm">{drawerData.requires_empty_truck ? "Yes" : "No"}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-steel-500">Driver Notes</div>
                    <div className="delivery-popup-notes">{drawerData.driver_notes || "No notes"}</div>
                  </div>
                </div>

                <div className="delivery-popup-right">
                  <div className="text-xs text-steel-500">POD Photos</div>
                  {drawerPhotoUrls.length > 0 ? (
                    <div className="delivery-popup-pod-stack">
                      {drawerPhotoUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="delivery-popup-pod-link">
                          <img src={url} alt="POD" className="delivery-popup-pod-image" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-steel-500">No POD photos uploaded yet.</div>
                  )}
                </div>
              </div>
            )}
            {drawerError ? <div className="mt-2 text-xs text-red-600">{drawerError}</div> : null}
          </div>
        </div>
      </div>

      <footer className="site-footer">
        <div>Logistics Operations</div>
        <div>Delivery planning workspace</div>
      </footer>
    </AppShell>
  );
}

function CalendarDay({
  date,
  dateKey,
  todayKey,
  inMonth,
  items,
  expanded,
  onToggleExpand,
  onOpen
}: {
  date: Date;
  dateKey: string;
  todayKey: string;
  inMonth: boolean;
  items: any[];
  expanded: boolean;
  onToggleExpand: () => void;
  onOpen: (item: any) => void;
}) {
  const { setNodeRef } = useDroppable({ id: dateKey, data: { columnKey: dateKey } });
  const visible = expanded ? items : items.slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border border-steel-100 p-2 min-h-[110px] ${inMonth ? "bg-white" : "bg-steel-50"}`}
    >
      <div className="text-xs text-steel-500">{date.getUTCDate()}</div>
      <div className="mt-1 space-y-1">
        <SortableContext items={items.map((i: any) => i.delivery_id)} strategy={verticalListSortingStrategy}>
          {visible.map((item) => (
            <CalendarJob
              key={item.delivery_id}
              item={item}
              dateKey={dateKey}
              todayKey={todayKey}
              onClick={() => onOpen(item)}
            />
          ))}
        </SortableContext>
        {items.length > 3 && (
          <button type="button" className="text-[10px] text-steel-500 underline" onClick={onToggleExpand}>
            {expanded ? "Show less" : `+${items.length - 3} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function CalendarJob({
  item,
  dateKey,
  todayKey,
  onClick
}: {
  item: any;
  dateKey: string;
  todayKey: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.delivery_id,
    data: { deliveryId: item.delivery_id, from: dateKey, columnKey: dateKey }
  });

  return (
    <div
      ref={setNodeRef}
      className={`text-xs text-ink-900 text-left rounded-md px-2 py-1 w-full flex items-center justify-between gap-2 cursor-pointer ${statusColor(dateKey, Boolean(item.ps_delivered), todayKey)}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeft: `3px solid ${jobBorderColor(item.job_name || item.delivery_id)}`
      }}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <span className="truncate">{item.job_name}</span>
      <button
        type="button"
        className="btn btn-secondary icon-only h-7 w-7 inline-flex items-center justify-center shrink-0"
        aria-label="View details"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
        <span className="sr-only">View details</span>
      </button>
    </div>
  );
}


