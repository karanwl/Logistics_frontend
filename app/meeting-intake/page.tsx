"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useJobsites, useBulkCreateDeliveries, useCreateJobsite } from "@/lib/api/planner";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { useFormError } from "@/hooks/useFormError";

interface IntakeRow {
  sales_order: string;
  jobsite_id: string;
  jobsite_query: string;
  scheduled_date: string;
  door: number;
  frame: number;
  med_skid: number;
  small_skid: number;
  large_skid: number;
  box: number;
  exp_frame: number;
}

export default function MeetingIntakePage() {
  const { data, refetch } = useJobsites();
  const bulkCreate = useBulkCreateDeliveries();
  const createJobsite = useCreateJobsite();
  const [rows, setRows] = useState<IntakeRow[]>([
    {
      sales_order: "",
      jobsite_id: "",
      jobsite_query: "",
      scheduled_date: "",
      door: 0,
      frame: 0,
      med_skid: 0,
      small_skid: 0,
      large_skid: 0,
      box: 0,
      exp_frame: 0
    }
  ]);
  const [jobsiteName, setJobsiteName] = useState("");
  const [jobsiteAddress, setJobsiteAddress] = useState("");
  const [showJobsiteForm, setShowJobsiteForm] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [openJobsiteIndex, setOpenJobsiteIndex] = useState<number | null>(null);
  const [publishMessage, setPublishMessage] = useState("");
  const { formError, clearFormError, setFormError } = useFormError("Could not publish. Please try again.");
  const [jobsiteFormError, setJobsiteFormError] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<number, { sales_order?: boolean; jobsite?: boolean; date?: boolean }>>({});
  const jobsites = data?.jobsites || [];
  const normalizedJobsites = useMemo(
    () =>
      (jobsites || [])
        .map((jobsite: any) => ({
          id: String(jobsite?.id ?? jobsite?.jobsite_id ?? "").trim(),
          name: String(jobsite?.name ?? "").trim(),
        }))
        .filter((jobsite) => Boolean(jobsite.id) && Boolean(jobsite.name)),
    [jobsites]
  );
  const jobsiteRefs = useRef<Array<HTMLDivElement | null>>([]);

  const findJobsiteByName = (query: string) => {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return null;
    return (
      normalizedJobsites.find(
        (jobsite) => jobsite.name.toLowerCase() === normalized
      ) || null
    );
  };

  const selectJobsite = (index: number, jobsite: { id: string; name: string }) => {
    updateRow(index, { jobsite_id: String(jobsite.id), jobsite_query: String(jobsite.name) });
    setOpenJobsiteIndex(null);
  };

  const enforceJobsiteValue = (index: number) => {
    setRows((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      const row = next[index];
      const query = String(row.jobsite_query || "").trim();

      if (!query) {
        if (row.jobsite_id) {
          next[index] = { ...row, jobsite_id: "" };
        }
        return next;
      }

      const match = findJobsiteByName(query);
      if (match) {
        next[index] = { ...row, jobsite_id: String(match.id), jobsite_query: String(match.name || query) };
        return next;
      }

      // Prevent arbitrary values from persisting; user must pick from jobsite list.
      next[index] = { ...row, jobsite_id: "", jobsite_query: "" };
      return next;
    });
  };

  const emptyRow = useMemo(
    () => ({
      sales_order: "",
      jobsite_id: "",
      jobsite_query: "",
      scheduled_date: "",
      door: 0,
      frame: 0,
      med_skid: 0,
      small_skid: 0,
      large_skid: 0,
      box: 0,
      exp_frame: 0
    }),
    []
  );

  const isRowEmpty = (row: IntakeRow) =>
    !row.sales_order &&
    !row.jobsite_id &&
    !row.jobsite_query &&
    !row.scheduled_date &&
    !row.door &&
    !row.frame &&
    !row.med_skid &&
    !row.small_skid &&
    !row.large_skid &&
    !row.box &&
    !row.exp_frame;

  const updateRow = (index: number, patch: Partial<IntakeRow>) => {
    setRows((prev) => {
      const next = prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row));
      const lastIndex = next.length - 1;
      const updatedRow = next[index];
      if (index === lastIndex && !isRowEmpty(updatedRow)) {
        next.push({ ...emptyRow });
      }
      return next;
    });
    setActiveRowIndex(index);
  };

  const removeRow = (index: number) => {
    setRows((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length === 0) return [{ ...emptyRow }];
      if (next.every((row) => !isRowEmpty(row))) {
        next.push({ ...emptyRow });
      }
      return next;
    });
  };

  useEffect(() => {
    if (openJobsiteIndex === null) return;
    const handleClick = (event: MouseEvent) => {
      const container = jobsiteRefs.current[openJobsiteIndex];
      if (!container) return;
      if (!container.contains(event.target as Node)) {
        enforceJobsiteValue(openJobsiteIndex);
        setOpenJobsiteIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openJobsiteIndex, normalizedJobsites]);

  const publish = async () => {
    clearFormError();
    const errors: Record<number, { sales_order?: boolean; jobsite?: boolean; date?: boolean }> = {};
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    rows.forEach((row, idx) => {
      if (isRowEmpty(row)) return;
      const rowError: { sales_order?: boolean; jobsite?: boolean; date?: boolean } = {};
      if (!row.sales_order.trim()) rowError.sales_order = true;
      if (!row.jobsite_id) rowError.jobsite = true;
      if (!row.scheduled_date || !dateRegex.test(row.scheduled_date)) rowError.date = true;
      if (Object.keys(rowError).length) errors[idx] = rowError;
    });
    if (Object.keys(errors).length) {
      setRowErrors(errors);
      setPublishMessage("Please complete the highlighted rows (location, date, and sales order are required).");
      return;
    }
    setRowErrors({});
    const deliveries = rows
      .filter((row) => !isRowEmpty(row))
      .map((row) => ({
      jobsite_id: row.jobsite_id,
      scheduled_date: row.scheduled_date,
      sales_order: row.sales_order,
      door: row.door,
      frame: row.frame,
      med_skid: row.med_skid,
      small_skid: row.small_skid,
      large_skid: row.large_skid,
      box: row.box,
      exp_frame: row.exp_frame
    }));
    if (deliveries.length === 0) {
      setPublishMessage("There are no rows to publish.");
      return;
    }
    setPublishMessage("Saving and publishing...");
    try {
      await bulkCreate.mutateAsync({ deliveries });
      setPublishMessage("Published successfully.");
      window.location.href = "/schedule?view=calendar";
    } catch (error: unknown) {
      setPublishMessage("");
      setFormError(error, "Could not publish. Please try again.");
    }
  };

  return (
    <AppShell>
      <div className="admin-section overflow-visible" id="meetingIntake" style={{ overflow: "visible" }}>
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">New Orders Entry</div>
            <div className="card-subtitle">Add new orders and send them to the delivery calendar.</div>
          </div>
          <div className="page-actions">
            <div className="flex flex-wrap items-center gap-2">
              {!showJobsiteForm ? (
                <Button variant="secondary" onClick={() => setShowJobsiteForm(true)}>
                  Add location
                </Button>
              ) : (
                <>
                  <Input
                    className="min-w-[12rem] flex-1"
                    placeholder="Location name"
                    value={jobsiteName}
                    onChange={(e) => setJobsiteName(e.target.value)}
                  />
                  <Input
                    className="min-w-[12rem] flex-1"
                    placeholder="Location address"
                    value={jobsiteAddress}
                    onChange={(e) => setJobsiteAddress(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!jobsiteName.trim() || !jobsiteAddress.trim()) {
                        setJobsiteFormError("Location name and address are required.");
                        return;
                      }
                      setJobsiteFormError("");
                      clearFormError();
                      createJobsite.mutate(
                        { name: jobsiteName, address: jobsiteAddress },
                        {
                          onSuccess: (data: any) => {
                            const createdId = data?.jobsite?.id;
                            setJobsiteName("");
                            setJobsiteAddress("");
                            setShowJobsiteForm(false);
                            refetch();
                            if (createdId != null) {
                              updateRow(activeRowIndex, {
                                jobsite_id: String(createdId),
                                jobsite_query: jobsiteName
                              });
                            }
                          },
                          onError: (error: unknown) => {
                            setFormError(error, "Could not create location. Please try again.");
                          }
                        }
                      );
                    }}
                  >
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => setShowJobsiteForm(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
            {jobsiteFormError ? <div className="text-xs text-red-600">{jobsiteFormError}</div> : null}
            {formError ? <ErrorBanner error={formError} /> : null}
            <Button onClick={publish} disabled={bulkCreate.isPending}>Publish to calendar</Button>
          </div>
        </div>
        <div className="meeting-table-wrap">
          <div className="meeting-grid-head text-xs font-semibold text-steel-600">
            <div>Date</div>
            <div>Location</div>
            <div>Sales Order #</div>
            <div>Large Skids</div>
            <div>Medium Skids</div>
            <div>Small Skids</div>
            <div>Doors</div>
            <div>Frames</div>
            <div>Other Frames</div>
            <div>Boxes</div>
            <div>Remove</div>
          </div>
          <div className="mt-3 space-y-2">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className={`meeting-grid-row ${openJobsiteIndex === idx ? "z-20" : "z-0"}`}
              >
                <DatePickerInput
                  className={`h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0 ${rowErrors[idx]?.date ? "bg-red-50" : ""}`}
                  value={row.scheduled_date}
                  onChange={(value) => updateRow(idx, { scheduled_date: value })}
                />
                <div
                  className="relative"
                  ref={(el) => {
                    jobsiteRefs.current[idx] = el;
                  }}
                >
                  <Input
                    className={`h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0 ${rowErrors[idx]?.jobsite ? "bg-red-50" : ""}`}
                    placeholder="Type location name"
                    value={row.jobsite_query}
                    onChange={(e) => {
                      const value = e.target.value;
                      const match = findJobsiteByName(value);
                      updateRow(idx, {
                        jobsite_query: value,
                        jobsite_id: match ? String(match.id) : ""
                      });
                      setOpenJobsiteIndex(idx);
                    }}
                    onFocus={() => {
                      setActiveRowIndex(idx);
                      setOpenJobsiteIndex(idx);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        enforceJobsiteValue(idx);
                        setOpenJobsiteIndex((prev) => (prev === idx ? null : prev));
                      }, 120);
                    }}
                  />
                  {openJobsiteIndex === idx ? (
                    <div className="absolute z-30 mt-1 max-h-40 w-full overflow-auto rounded-md border border-steel-200 bg-white text-xs shadow-soft">
                      {normalizedJobsites
                        .filter((jobsite) =>
                          jobsite.name.toLowerCase().includes(row.jobsite_query.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((jobsite) => (
                          <button
                            type="button"
                            key={jobsite.id}
                            className="block w-full px-2 py-1 text-left hover:bg-steel-50"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectJobsite(idx, jobsite);
                            }}
                          >
                            {jobsite.name}
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
                <Input
                  className={`h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0 ${rowErrors[idx]?.sales_order ? "bg-red-50" : ""}`}
                  value={row.sales_order}
                  onChange={(e) => updateRow(idx, { sales_order: e.target.value })}
                  onFocus={() => setActiveRowIndex(idx)}
                />
                <Input
                  className="h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0"
                  type="number"
                  value={row.large_skid}
                  onChange={(e) => updateRow(idx, { large_skid: Number(e.target.value) })}
                  onFocus={() => setActiveRowIndex(idx)}
                />
                <Input
                  className="h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0"
                  type="number"
                  value={row.med_skid}
                  onChange={(e) => updateRow(idx, { med_skid: Number(e.target.value) })}
                  onFocus={() => setActiveRowIndex(idx)}
                />
                <Input
                  className="h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0"
                  type="number"
                  value={row.small_skid}
                  onChange={(e) => updateRow(idx, { small_skid: Number(e.target.value) })}
                  onFocus={() => setActiveRowIndex(idx)}
                />
                <Input
                  className="h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0"
                  type="number"
                  value={row.door}
                  onChange={(e) => updateRow(idx, { door: Number(e.target.value) })}
                  onFocus={() => setActiveRowIndex(idx)}
                />
                <Input
                  className="h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0"
                  type="number"
                  value={row.frame}
                  onChange={(e) => updateRow(idx, { frame: Number(e.target.value) })}
                  onFocus={() => setActiveRowIndex(idx)}
                />
                <Input
                  className="h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0"
                  type="number"
                  value={row.exp_frame}
                  onChange={(e) => updateRow(idx, { exp_frame: Number(e.target.value) })}
                  onFocus={() => setActiveRowIndex(idx)}
                />
                <Input
                  className="h-11 md:h-9 text-xs rounded-none border-0 shadow-none focus:ring-0"
                  type="number"
                  value={row.box}
                  onChange={(e) => updateRow(idx, { box: Number(e.target.value) })}
                  onFocus={() => setActiveRowIndex(idx)}
                />
                <button
                  type="button"
                  className="h-11 md:h-9 w-full rounded-none border-0 text-xs text-steel-500 hover:bg-steel-100 hover:text-ink-900"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1 && isRowEmpty(row)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
        {publishMessage ? (
          <div className="mt-3 text-xs text-steel-500">{publishMessage}</div>
        ) : null}
      </div>
    </AppShell>
  );
}

