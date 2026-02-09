"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useJobsites, useBulkCreateDeliveries, useCreateJobsite } from "@/lib/api/planner";

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
  const [jobsiteFormError, setJobsiteFormError] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<number, { sales_order?: boolean; jobsite?: boolean; date?: boolean }>>({});
  const jobsites = data?.jobsites || [];
  const jobsiteRefs = useRef<Array<HTMLDivElement | null>>([]);

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
        setOpenJobsiteIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openJobsiteIndex]);

  const publish = async () => {
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
      setPublishMessage("Fix highlighted rows (jobsite, date, and sales order are required).");
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
      setPublishMessage("Nothing to publish.");
      return;
    }
    setPublishMessage("Publishing...");
    try {
      await bulkCreate.mutateAsync({ deliveries });
      setPublishMessage("Published successfully.");
      window.location.href = "/schedule?view=calendar";
    } catch (e: any) {
      setPublishMessage(e?.message || "Publish failed.");
    }
  };

  return (
    <AppShell>
      <div className="admin-section" id="meetingIntake">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Morning Meeting Intake</div>
            <div className="card-subtitle">Add sales orders after the meeting, then publish to the schedule.</div>
          </div>
          <div className="page-actions">
            <div className="flex items-center gap-2">
              {!showJobsiteForm ? (
                <Button variant="secondary" onClick={() => setShowJobsiteForm(true)}>
                  Add Jobsite
                </Button>
              ) : (
                <>
                  <Input
                    placeholder="Jobsite name"
                    value={jobsiteName}
                    onChange={(e) => setJobsiteName(e.target.value)}
                  />
                  <Input
                    placeholder="Jobsite address"
                    value={jobsiteAddress}
                    onChange={(e) => setJobsiteAddress(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!jobsiteName.trim() || !jobsiteAddress.trim()) {
                        setJobsiteFormError("Jobsite name and address are required.");
                        return;
                      }
                      setJobsiteFormError("");
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
                          }
                        }
                      );
                    }}
                  >
                    Create
                  </Button>
                  <Button variant="ghost" onClick={() => setShowJobsiteForm(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
            {jobsiteFormError ? <div className="text-xs text-red-600">{jobsiteFormError}</div> : null}
            <Button onClick={publish} disabled={bulkCreate.isPending}>Publish</Button>
          </div>
        </div>
        <div className="grid grid-cols-[minmax(90px,0.8fr)_minmax(260px,2.6fr)_minmax(120px,1fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(70px,0.7fr)_minmax(40px,0.35fr)] gap-2 text-xs font-semibold text-steel-500">
          <div>Sales Order</div>
          <div>Jobsite</div>
          <div>Date</div>
          <div>Door</div>
          <div>Frame</div>
          <div>Med</div>
          <div>Small</div>
          <div>Large</div>
          <div>Box</div>
          <div>Exp Frame</div>
          <div></div>
        </div>
        <div className="mt-3 space-y-2">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[minmax(90px,0.8fr)_minmax(260px,2.6fr)_minmax(120px,1fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(60px,0.6fr)_minmax(70px,0.7fr)_minmax(40px,0.35fr)] gap-2"
            >
              <Input
                className={`h-9 text-xs ${rowErrors[idx]?.sales_order ? "border-red-400" : ""}`}
                value={row.sales_order}
                onChange={(e) => updateRow(idx, { sales_order: e.target.value })}
                onFocus={() => setActiveRowIndex(idx)}
              />
              <div
                className="relative"
                ref={(el) => {
                  jobsiteRefs.current[idx] = el;
                }}
              >
                <Input
                  className={`h-9 text-xs ${rowErrors[idx]?.jobsite ? "border-red-400" : ""}`}
                  placeholder="Type jobsite name"
                  value={row.jobsite_query}
                  onChange={(e) => {
                    const value = e.target.value;
                    const match = jobsites.find((j: any) => (j.name || "").toLowerCase() === value.toLowerCase());
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
                />
                {openJobsiteIndex === idx && row.jobsite_query ? (
                  <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-steel-200 bg-white text-xs shadow-soft">
                    {jobsites
                      .filter((j: any) =>
                        (j.name || "").toLowerCase().includes(row.jobsite_query.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((j: any) => (
                        <button
                          type="button"
                          key={j.id}
                          className="block w-full px-2 py-1 text-left hover:bg-steel-50"
                          onClick={() => {
                            updateRow(idx, { jobsite_id: String(j.id), jobsite_query: j.name });
                            setOpenJobsiteIndex(null);
                          }}
                        >
                          {j.name}
                        </button>
                      ))}
                  </div>
                ) : null}
              </div>
              <DatePickerInput
                className={`h-9 text-xs ${rowErrors[idx]?.date ? "border-red-400" : ""}`}
                value={row.scheduled_date}
                onChange={(value) => updateRow(idx, { scheduled_date: value })}
              />
              <Input
                className="h-9 text-xs"
                type="number"
                value={row.door}
                onChange={(e) => updateRow(idx, { door: Number(e.target.value) })}
                onFocus={() => setActiveRowIndex(idx)}
              />
              <Input
                className="h-9 text-xs"
                type="number"
                value={row.frame}
                onChange={(e) => updateRow(idx, { frame: Number(e.target.value) })}
                onFocus={() => setActiveRowIndex(idx)}
              />
              <Input
                className="h-9 text-xs"
                type="number"
                value={row.med_skid}
                onChange={(e) => updateRow(idx, { med_skid: Number(e.target.value) })}
                onFocus={() => setActiveRowIndex(idx)}
              />
              <Input
                className="h-9 text-xs"
                type="number"
                value={row.small_skid}
                onChange={(e) => updateRow(idx, { small_skid: Number(e.target.value) })}
                onFocus={() => setActiveRowIndex(idx)}
              />
              <Input
                className="h-9 text-xs"
                type="number"
                value={row.large_skid}
                onChange={(e) => updateRow(idx, { large_skid: Number(e.target.value) })}
                onFocus={() => setActiveRowIndex(idx)}
              />
              <Input
                className="h-9 text-xs"
                type="number"
                value={row.box}
                onChange={(e) => updateRow(idx, { box: Number(e.target.value) })}
                onFocus={() => setActiveRowIndex(idx)}
              />
              <Input
                className="h-9 text-xs"
                type="number"
                value={row.exp_frame}
                onChange={(e) => updateRow(idx, { exp_frame: Number(e.target.value) })}
                onFocus={() => setActiveRowIndex(idx)}
              />
              <button
                type="button"
                className="h-9 rounded-md border border-steel-200 text-xs text-steel-500 hover:border-ink-900 hover:text-ink-900"
                onClick={() => removeRow(idx)}
                disabled={rows.length === 1 && isRowEmpty(row)}
              >
                X
              </button>
            </div>
          ))}
        </div>
        {publishMessage ? (
          <div className="mt-3 text-xs text-steel-500">{publishMessage}</div>
        ) : null}
      </div>
    </AppShell>
  );
}

