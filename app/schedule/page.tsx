"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AppShell from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/api/auth";
import {
  useDeliveries,
  useRescheduleDelivery,
  useBulkUpdateDeliveries,
  useUpdateDelivery,
  useDeleteDelivery
} from "@/lib/api/planner";
import { startOfWeek, addDays, formatDate } from "@/lib/utils/dates";

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function compareDate(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function statusColor(dateKey: string, psDelivered: boolean) {
  const today = formatDate(new Date());
  const cmp = compareDate(dateKey, today);
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

const TIME_OPTIONS = [
  "",
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00"
];

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
  const [weekDate, setWeekDate] = useState(() => formatDate(new Date()));
  const [view, setView] = useState<"board" | "calendar" | "list">("calendar");
  const [search, setSearch] = useState("");
  const [listDate, setListDate] = useState("");
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDelivery, setDrawerDelivery] = useState<any | null>(null);
  const [drawerError, setDrawerError] = useState("");
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
  const updateDelivery = useUpdateDelivery();
  const deleteDelivery = useDeleteDelivery();

  const weekStart = useMemo(() => startOfWeek(new Date(weekDate)), [weekDate]);
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
    await reschedule.mutateAsync({
      delivery_id: active.data.current.deliveryId,
      scheduled_date: to === "unscheduled" ? null : to
    });
    refetch();
  };

  const updateEdit = (deliveryId: string, patch: any) => {
    setEdits((prev) => ({
      ...prev,
      [deliveryId]: { ...(prev[deliveryId] || {}), ...patch }
    }));
  };

  const saveChanges = async () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const updates of Object.values(edits)) {
      const scheduled = (updates as any)?.scheduled_date;
      if (scheduled && !dateRegex.test(String(scheduled))) {
        setSaveStatus("Scheduled date must be YYYY-MM-DD.");
        return;
      }
      const ws = (updates as any)?.window_start;
      if (ws && !timeRegex.test(String(ws))) {
        setSaveStatus("Window start must be HH:MM (24h).");
        return;
      }
      const we = (updates as any)?.window_end;
      if (we && !timeRegex.test(String(we))) {
        setSaveStatus("Window end must be HH:MM (24h).");
        return;
      }
    }
    const payload = Object.entries(edits).map(([delivery_id, updates]) => ({
      delivery_id,
      ...updates
    }));
    if (payload.length === 0) {
      setSaveStatus("No changes to save.");
      return;
    }
    setSaveStatus("Saving...");
    await bulkUpdate.mutateAsync({ deliveries: payload });
    setEdits({});
    setSaveStatus("Saved.");
    refetch();
    if (view === "list") {
      setView("calendar");
    }
  };

  const openDrawer = (delivery: any) => {
    setDrawerDelivery({ ...delivery });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerDelivery(null);
  };

  const saveDrawer = async () => {
    if (!drawerDelivery) return;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (drawerDelivery.scheduled_date && !dateRegex.test(String(drawerDelivery.scheduled_date))) {
      setDrawerError("Scheduled date must be YYYY-MM-DD.");
      return;
    }
    if (drawerDelivery.window_start && !timeRegex.test(String(drawerDelivery.window_start))) {
      setDrawerError("Window start must be HH:MM (24h).");
      return;
    }
    if (drawerDelivery.window_end && !timeRegex.test(String(drawerDelivery.window_end))) {
      setDrawerError("Window end must be HH:MM (24h).");
      return;
    }
    setDrawerError("");
    const payload = {
      jobsite_id: drawerDelivery.jobsite_id,
      scheduled_date: drawerDelivery.scheduled_date,
      sales_order: drawerDelivery.sales_order || "",
      med_skid: Number(drawerDelivery.med_skid || 0),
      small_skid: Number(drawerDelivery.small_skid || 0),
      large_skid: Number(drawerDelivery.large_skid || 0),
      door: Number(drawerDelivery.door || 0),
      frame: Number(drawerDelivery.frame || 0),
      exp_frame: Number(drawerDelivery.exp_frame || 0),
      box: Number(drawerDelivery.box || 0),
      pickup: Boolean(drawerDelivery.pickup),
      requires_empty_truck: Boolean(drawerDelivery.requires_empty_truck),
      window_start: drawerDelivery.window_start || "",
      window_end: drawerDelivery.window_end || ""
    };
    await updateDelivery.mutateAsync({ delivery_id: drawerDelivery.delivery_id, updates: payload });
    closeDrawer();
    refetch();
  };

  return (
    <AppShell>
      <section className="card schedule-toolbar" id="scheduleToolbar">
        <div className={view === "board" ? "" : "hidden"} id="boardToolbarControls">
          <div className="flex items-center justify-between gap-4 schedule-toolbar-row">
            <div className="board-field board-search w-72">
              <label htmlFor="boardSearch" className="sr-only">Search deliveries</label>
              <Input id="boardSearch" type="search" placeholder="Search Deliveries" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="board-field board-week w-48 text-center">
              <label htmlFor="boardWeek" className="text-xs text-steel-500 block">Week of</label>
              <DatePickerInput
                id="boardWeek"
                className="h-9"
                value={weekDate}
                onChange={(value) => setWeekDate(value)}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <div className="view-toggle" role="group" aria-label="Schedule view">
                <button className={`toggle-btn ${view === "board" ? "is-active" : ""}`} type="button" onClick={() => setView("board")}>Board</button>
                <button className={`toggle-btn ${view === "calendar" ? "is-active" : ""}`} type="button" onClick={() => setView("calendar")}>Calendar</button>
                <button className={`toggle-btn ${view === "list" ? "is-active" : ""}`} type="button" onClick={() => setView("list")}>List</button>
              </div>
            </div>
          </div>
        </div>

        <div id="calendarToolbarControls" className={view === "calendar" ? "" : "hidden"}>
          <div className="flex items-center justify-between gap-4 schedule-toolbar-row">
            <div className="calendar-filters w-72">
              <label htmlFor="calendarSearch" className="sr-only">Search deliveries</label>
              <Input id="calendarSearch" type="search" placeholder="Search Deliveries" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <div className="view-toggle" role="group" aria-label="Schedule view">
                <button className={`toggle-btn ${view === "board" ? "is-active" : ""}`} type="button" onClick={() => setView("board")}>Board</button>
                <button className={`toggle-btn ${view === "calendar" ? "is-active" : ""}`} type="button" onClick={() => setView("calendar")}>Calendar</button>
                <button className={`toggle-btn ${view === "list" ? "is-active" : ""}`} type="button" onClick={() => setView("list")}>List</button>
              </div>
            </div>
          </div>
        </div>

        <div id="listToolbarControls" className={view === "list" ? "" : "hidden"}>
          <div className="flex items-center justify-between gap-4 schedule-toolbar-row">
            <div className="calendar-filters w-72">
              <label htmlFor="listSearch" className="sr-only">Search deliveries</label>
              <Input id="listSearch" type="search" placeholder="Search Deliveries" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} /> Edit mode
                  </label>
                  <Button variant="secondary" onClick={saveChanges} disabled={bulkUpdate.isPending}>Save changes</Button>
                  <div className="text-xs text-steel-500">{saveStatus}</div>
                </>
              ) : null}
              <div className="view-toggle" role="group" aria-label="Schedule view">
                <button className={`toggle-btn ${view === "board" ? "is-active" : ""}`} type="button" onClick={() => setView("board")}>Board</button>
                <button className={`toggle-btn ${view === "calendar" ? "is-active" : ""}`} type="button" onClick={() => setView("calendar")}>Calendar</button>
                <button className={`toggle-btn ${view === "list" ? "is-active" : ""}`} type="button" onClick={() => setView("list")}>List</button>
              </div>
            </div>
          </div>
        </div>

        <div className="schedule-toggle hidden" />
      </section>

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
                <DroppableColumn columnKey="unscheduled" title="Unscheduled" items={grouped.unscheduled || []} />
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
            <table className="w-full text-sm">
              <thead className="text-xs text-steel-500 sticky top-0 bg-white/90 backdrop-blur z-10">
                <tr>
                {canEdit && editMode && (
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("ps_delivered")}>
                      PS Delivered {sort.key === "ps_delivered" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                )}
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("sales_order")}>
                      Sales Order {sort.key === "sales_order" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("scheduled_date")}>
                      Scheduled Date {sort.key === "scheduled_date" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("job_name")}>
                      Job {sort.key === "job_name" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("window_start")}>
                      Time Window {sort.key === "window_start" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("med_skid")}>
                      Med Skid {sort.key === "med_skid" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("small_skid")}>
                      Small Skid {sort.key === "small_skid" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("large_skid")}>
                      Large Skid {sort.key === "large_skid" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("door")}>
                      Door {sort.key === "door" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("frame")}>
                      Frame {sort.key === "frame" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("exp_frame")}>
                      Exp Frame {sort.key === "exp_frame" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("box")}>
                      Box {sort.key === "box" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("pickup")}>
                      Pickup {sort.key === "pickup" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">
                    <button type="button" className="hover:text-ink-900" onClick={() => toggleSort("requires_empty_truck")}>
                      Empty Truck {sort.key === "requires_empty_truck" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listRows.map((d: any) => (
                  <tr key={d.delivery_id} className="border-t border-steel-100">
                    {canEdit && editMode && (
                      <td className="py-2">
                        <input
                          type="checkbox"
                          defaultChecked={Boolean(d.ps_delivered)}
                          onChange={(e) => updateEdit(d.delivery_id, { ps_delivered: e.target.checked })}
                        />
                      </td>
                    )}
                    <td className="py-2">{d.sales_order || "--"}</td>
                    <td className="py-2">
                      {canEdit && editMode ? (
                        <DatePickerInput
                          className="h-9 text-xs"
                          defaultValue={d.scheduled_date || ""}
                          onChange={(value) => updateEdit(d.delivery_id, { scheduled_date: value })}
                        />
                      ) : (
                        d.scheduled_date || "--"
                      )}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="font-semibold text-left hover:text-ink-900"
                        onClick={() => openDrawer(d)}
                      >
                        {d.job_name}
                      </button>
                    </td>
                    <td className="py-2">
                      {canEdit && editMode ? (
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm"
                            defaultValue={d.window_start || ""}
                            onChange={(e) => updateEdit(d.delivery_id, { window_start: e.target.value })}
                          >
                            <option value="">Start</option>
                            {TIME_OPTIONS.map((t) => (
                              <option key={`start-${t || "any"}`} value={t}>{t || "--"}</option>
                            ))}
                          </select>
                          <select
                            className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm"
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
                    <td className="py-2 w-20">
                      {canEdit && editMode ? (
                        <Input type="number" defaultValue={d.med_skid || 0} onChange={(e) => updateEdit(d.delivery_id, { med_skid: Number(e.target.value) })} />
                      ) : (
                        d.med_skid || 0
                      )}
                    </td>
                    <td className="py-2 w-20">
                      {canEdit && editMode ? (
                        <Input type="number" defaultValue={d.small_skid || 0} onChange={(e) => updateEdit(d.delivery_id, { small_skid: Number(e.target.value) })} />
                      ) : (
                        d.small_skid || 0
                      )}
                    </td>
                    <td className="py-2 w-20">
                      {canEdit && editMode ? (
                        <Input type="number" defaultValue={d.large_skid || 0} onChange={(e) => updateEdit(d.delivery_id, { large_skid: Number(e.target.value) })} />
                      ) : (
                        d.large_skid || 0
                      )}
                    </td>
                    <td className="py-2 w-16">
                      {canEdit && editMode ? (
                        <Input type="number" defaultValue={d.door || 0} onChange={(e) => updateEdit(d.delivery_id, { door: Number(e.target.value) })} />
                      ) : (
                        d.door || 0
                      )}
                    </td>
                    <td className="py-2 w-16">
                      {canEdit && editMode ? (
                        <Input type="number" defaultValue={d.frame || 0} onChange={(e) => updateEdit(d.delivery_id, { frame: Number(e.target.value) })} />
                      ) : (
                        d.frame || 0
                      )}
                    </td>
                    <td className="py-2 w-20">
                      {canEdit && editMode ? (
                        <Input type="number" defaultValue={d.exp_frame || 0} onChange={(e) => updateEdit(d.delivery_id, { exp_frame: Number(e.target.value) })} />
                      ) : (
                        d.exp_frame || 0
                      )}
                    </td>
                    <td className="py-2 w-16">
                      {canEdit && editMode ? (
                        <Input type="number" defaultValue={d.box || 0} onChange={(e) => updateEdit(d.delivery_id, { box: Number(e.target.value) })} />
                      ) : (
                        d.box || 0
                      )}
                    </td>
                    <td className="py-2">
                      {canEdit && editMode ? (
                        <input
                          type="checkbox"
                          defaultChecked={Boolean(d.pickup)}
                          onChange={(e) => updateEdit(d.delivery_id, { pickup: e.target.checked })}
                        />
                      ) : (
                        d.pickup ? "Yes" : "No"
                      )}
                    </td>
                    <td className="py-2">
                      {canEdit && editMode ? (
                        <input
                          type="checkbox"
                          defaultChecked={Boolean(d.requires_empty_truck)}
                          onChange={(e) => updateEdit(d.delivery_id, { requires_empty_truck: e.target.checked })}
                        />
                      ) : (
                        d.requires_empty_truck ? "Yes" : "No"
                      )}
                    </td>
                    <td className="py-2">
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const ok = window.confirm("Delete this delivery?");
                          if (!ok) return;
                          await deleteDelivery.mutateAsync({ delivery_id: d.delivery_id });
                          refetch();
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div id="inlineEditDrawer" className={`drawer ${drawerOpen ? "" : "is-hidden"}`} aria-hidden={!drawerOpen}>
        <div className="drawer-backdrop" data-drawer-close onClick={closeDrawer} />
        <div className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="inlineEditTitle">
          <div className="drawer-header">
            <div>
              <p className="panel-title">Edit</p>
              <h2 id="inlineEditTitle" className="text-xl font-semibold">Delivery</h2>
              <p className="card-subtitle" id="inlineEditSubtitle">Update delivery details.</p>
            </div>
            <button className="btn btn-secondary icon-only" type="button" data-drawer-close aria-label="Close" onClick={closeDrawer}>
              ?
            </button>
          </div>
          <div id="inlineEditBody" className="drawer-body">
            {!drawerDelivery ? (
              <div className="empty-state">No delivery selected.</div>
            ) : (
              <div className="grid gap-3">
                <label className="text-xs text-steel-500">Job</label>
                <div className="text-sm font-semibold">{drawerDelivery.job_name}</div>
                <label className="text-xs text-steel-500">Scheduled Date</label>
                <DatePickerInput
                  className="h-9 text-xs"
                  value={drawerDelivery.scheduled_date || ""}
                  onChange={(value) => setDrawerDelivery({ ...drawerDelivery, scheduled_date: value })}
                />
                <label className="text-xs text-steel-500">Sales Order</label>
                <Input value={drawerDelivery.sales_order || ""} onChange={(e) => setDrawerDelivery({ ...drawerDelivery, sales_order: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Med Skid" value={drawerDelivery.med_skid || 0} onChange={(e) => setDrawerDelivery({ ...drawerDelivery, med_skid: Number(e.target.value) })} />
                  <Input type="number" placeholder="Small Skid" value={drawerDelivery.small_skid || 0} onChange={(e) => setDrawerDelivery({ ...drawerDelivery, small_skid: Number(e.target.value) })} />
                  <Input type="number" placeholder="Large Skid" value={drawerDelivery.large_skid || 0} onChange={(e) => setDrawerDelivery({ ...drawerDelivery, large_skid: Number(e.target.value) })} />
                  <Input type="number" placeholder="Door" value={drawerDelivery.door || 0} onChange={(e) => setDrawerDelivery({ ...drawerDelivery, door: Number(e.target.value) })} />
                  <Input type="number" placeholder="Frame" value={drawerDelivery.frame || 0} onChange={(e) => setDrawerDelivery({ ...drawerDelivery, frame: Number(e.target.value) })} />
                  <Input type="number" placeholder="Exp Frame" value={drawerDelivery.exp_frame || 0} onChange={(e) => setDrawerDelivery({ ...drawerDelivery, exp_frame: Number(e.target.value) })} />
                  <Input type="number" placeholder="Box" value={drawerDelivery.box || 0} onChange={(e) => setDrawerDelivery({ ...drawerDelivery, box: Number(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm"
                    value={drawerDelivery.window_start || ""}
                    onChange={(e) => setDrawerDelivery({ ...drawerDelivery, window_start: e.target.value })}
                  >
                    <option value="">Start</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={`drawer-start-${t || "any"}`} value={t}>{t || "--"}</option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm"
                    value={drawerDelivery.window_end || ""}
                    onChange={(e) => setDrawerDelivery({ ...drawerDelivery, window_end: e.target.value })}
                  >
                    <option value="">End</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={`drawer-end-${t || "any"}`} value={t}>{t || "--"}</option>
                    ))}
                  </select>
                </div>
                <div className="page-actions">
                  <Button onClick={saveDrawer} disabled={updateDelivery.isPending}>Save</Button>
                  <Button variant="secondary" onClick={closeDrawer}>Cancel</Button>
                </div>
                {drawerError ? <div className="text-xs text-red-600">{drawerError}</div> : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="site-footer">
        <div>Logistics Planner</div>
        <div>Internal scheduling tools</div>
      </footer>
    </AppShell>
  );
}

function CalendarDay({
  date,
  dateKey,
  inMonth,
  items,
  expanded,
  onToggleExpand,
  onOpen
}: {
  date: Date;
  dateKey: string;
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
      <div className="text-xs text-steel-500">{date.getDate()}</div>
      <div className="mt-1 space-y-1">
        <SortableContext items={items.map((i: any) => i.delivery_id)} strategy={verticalListSortingStrategy}>
          {visible.map((item) => (
            <CalendarJob key={item.delivery_id} item={item} dateKey={dateKey} onClick={() => onOpen(item)} />
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

function CalendarJob({ item, dateKey, onClick }: { item: any; dateKey: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.delivery_id,
    data: { deliveryId: item.delivery_id, from: dateKey, columnKey: dateKey }
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`text-xs text-ink-900 text-left rounded-md px-2 py-1 w-full ${statusColor(dateKey, Boolean(item.ps_delivered))}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeft: `3px solid ${jobBorderColor(item.job_name || item.delivery_id)}`
      }}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {item.job_name}
    </button>
  );
}

