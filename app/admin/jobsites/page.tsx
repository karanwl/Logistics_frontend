"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import SiteHeader from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobsites, useCreateJobsite } from "@/lib/api/planner";

export default function AdminJobsitesPage() {
  const { data, refetch } = useJobsites();
  const createJobsite = useCreateJobsite();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const onCreate = async () => {
    await createJobsite.mutateAsync({ name, address });
    setName("");
    setAddress("");
    refetch();
  };

  return (
    <AppShell
      header={
        <SiteHeader
          title="Logistics Planner"
          subtitle="Manager/Admin Console"
          links={[
            { href: "/planner", label: "Planner" },
            { href: "/admin", label: "Manager/Admin Home" },
            { href: "/schedule", label: "Schedule" },
            { href: "/api-proxy/logout", label: "Logout" }
          ]}
        />
      }
    >
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Create Jobsite</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Jobsite name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Jobsite address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Button onClick={onCreate} disabled={createJobsite.isPending}>Create</Button>
        </div>
        <div className="mt-2 text-xs text-steel-500">After creation, the server geocodes and updates Latitude/Longitude.</div>
      </div>
      <div className="card mt-6">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Jobsites</div>
          </div>
        </div>
        <div className="space-y-2">
          {(data?.jobsites || []).map((j: any) => (
            <div key={j.id} className="rounded-lg border border-steel-100 p-3">
              <div className="text-sm font-semibold">{j.name}</div>
              <div className="text-xs text-steel-500">{j.address}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
