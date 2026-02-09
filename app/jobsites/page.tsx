"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobsites, useCreateJobsite } from "@/lib/api/planner";

export default function AdminJobsitesPage() {
  const { data, refetch } = useJobsites();
  const createJobsite = useCreateJobsite();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const onCreate = async () => {
    if (!name.trim() || !address.trim()) {
      setError("Jobsite name and address are required.");
      return;
    }
    setError("");
    await createJobsite.mutateAsync({ name, address });
    setName("");
    setAddress("");
    refetch();
  };

  return (
    <AppShell>
      <div className="admin-section">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Create Jobsite</div>
            <div className="card-subtitle">Add a new location to the routing network.</div>
          </div>
        </div>
        <div className="admin-form-grid">
          <div className="admin-field space-y-1.5">
            <label htmlFor="jobsiteName">Jobsite name</label>
            <Input
              id="jobsiteName"
              placeholder="Jobsite name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={error && !name.trim() ? "border-red-400" : ""}
            />
          </div>
          <div className="admin-field space-y-1.5 md:col-span-2">
            <label htmlFor="jobsiteAddress">Jobsite address</label>
            <Input
              id="jobsiteAddress"
              placeholder="Jobsite address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={error && !address.trim() ? "border-red-400" : ""}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onCreate} disabled={createJobsite.isPending}>Create</Button>
          </div>
        </div>
        {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
        <div className="mt-2 text-xs text-steel-500">After creation, the server geocodes and updates Latitude/Longitude.</div>
      </div>
      <div className="admin-section mt-6">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Jobsites</div>
            <div className="card-subtitle">Latest locations available for scheduling.</div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data?.jobsites || []).map((j: any) => (
            <div key={j.id} className="admin-tile">
              <div className="text-sm font-semibold">{j.name}</div>
              <div className="text-xs text-steel-500">{j.address}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
