"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobsites, useCreateJobsite, useUpdateJobsite, useDeleteJobsite } from "@/lib/api/planner";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { useFormError } from "@/hooks/useFormError";

export default function AdminJobsitesPage() {
  const { data, refetch } = useJobsites();
  const createJobsite = useCreateJobsite();
  const updateJobsite = useUpdateJobsite();
  const deleteJobsite = useDeleteJobsite();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const { formError, clearFormError, setFormError } = useFormError("Could not update location data.");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    name: "",
    address: "",
    site_contact: "",
    site_contact_number: ""
  });

  const onCreate = async () => {
    clearFormError();
    if (!name.trim() || !address.trim()) {
      setError("Location name and address are required.");
      return;
    }
    setError("");
    try {
      await createJobsite.mutateAsync({ name, address });
      setName("");
      setAddress("");
      refetch();
    } catch (error) {
      setFormError(error, "Could not create location. Please try again.");
    }
  };

  const startEdit = (jobsite: any) => {
    setEditingId(String(jobsite.id));
    setEditValues({
      name: jobsite.name || "",
      address: jobsite.address || "",
      site_contact: jobsite.site_contact || "",
      site_contact_number: jobsite.site_contact_number || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    clearFormError();
    if (!editingId) return;
    if (!editValues.name.trim() || !editValues.address.trim()) {
      setError("Location name and address are required.");
      return;
    }
    setError("");
    try {
      await updateJobsite.mutateAsync({
        jobsite_id: editingId,
        updates: {
          name: editValues.name.trim(),
          address: editValues.address.trim(),
          site_contact: editValues.site_contact.trim(),
          site_contact_number: editValues.site_contact_number.trim()
        }
      });
      setEditingId(null);
      refetch();
    } catch (error) {
      setFormError(error, "Could not update location. Please try again.");
    }
  };

  const onDelete = async (jobsite: any) => {
    clearFormError();
    const confirmed = window.confirm(`Delete location "${jobsite.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteJobsite.mutateAsync({ jobsite_id: String(jobsite.id) });
      refetch();
    } catch (error) {
      setFormError(error, "Could not delete location. Please try again.");
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const jobsites = (data?.jobsites || [])
    .filter((j: any) => {
      if (!normalizedSearch) return true;
      const nameMatch = String(j.name || "").toLowerCase().includes(normalizedSearch);
      const addressMatch = String(j.address || "").toLowerCase().includes(normalizedSearch);
      return nameMatch || addressMatch;
    })
    .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));

  return (
    <AppShell>
      <div className="admin-section">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Add Location</div>
            <div className="card-subtitle">Create a new delivery location for planning.</div>
          </div>
        </div>
        <div className="admin-form-grid">
          <div className="admin-field space-y-1.5">
            <label htmlFor="jobsiteName">Location name</label>
            <Input
              id="jobsiteName"
              placeholder="Location name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={error && !name.trim() ? "border-red-400" : ""}
            />
          </div>
          <div className="admin-field space-y-1.5 md:col-span-2">
            <label htmlFor="jobsiteAddress">Location address</label>
            <Input
              id="jobsiteAddress"
              placeholder="Location address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={error && !address.trim() ? "border-red-400" : ""}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onCreate} disabled={createJobsite.isPending}>Add location</Button>
          </div>
        </div>
        {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
        {formError ? <div className="mt-2"><ErrorBanner error={formError} /></div> : null}
        <div className="mt-2 text-xs text-steel-500">Coordinates are filled automatically after saving.</div>
      </div>
      <div className="admin-section mt-6">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Locations</div>
            <div className="card-subtitle">All saved locations available for planning.</div>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs text-steel-500" htmlFor="jobsiteSearch">Search locations</label>
          <Input
            id="jobsiteSearch"
            placeholder="Search by name or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {jobsites.map((j: any) => (
            <div key={j.id} className="admin-tile space-y-2">
              {editingId === String(j.id) ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-steel-500" htmlFor={`jobsite-edit-name-${j.id}`}>Name</label>
                    <Input
                      id={`jobsite-edit-name-${j.id}`}
                      value={editValues.name}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-steel-500" htmlFor={`jobsite-edit-address-${j.id}`}>Address</label>
                    <Input
                      id={`jobsite-edit-address-${j.id}`}
                      value={editValues.address}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-steel-500" htmlFor={`jobsite-edit-contact-${j.id}`}>On-site contact</label>
                    <Input
                      id={`jobsite-edit-contact-${j.id}`}
                      value={editValues.site_contact}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, site_contact: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-steel-500" htmlFor={`jobsite-edit-phone-${j.id}`}>Contact number</label>
                    <Input
                      id={`jobsite-edit-phone-${j.id}`}
                      value={editValues.site_contact_number}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, site_contact_number: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} disabled={updateJobsite.isPending}>Save</Button>
                    <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-sm font-semibold">{j.name}</div>
                    <div className="text-xs text-steel-500">{j.address}</div>
                    {j.site_contact ? (
                      <div className="text-xs text-steel-500">Contact: {j.site_contact}</div>
                    ) : null}
                    {j.site_contact_number ? (
                      <div className="text-xs text-steel-500">Phone: {j.site_contact_number}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => startEdit(j)}>Edit</Button>
                    <Button variant="ghost" onClick={() => onDelete(j)} disabled={deleteJobsite.isPending}>
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
