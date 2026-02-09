"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import SiteHeader from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers, useCreateUser, useUpdateUser } from "@/lib/api/planner";

export default function AdminUsersPage() {
  const { data, refetch } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "coordinator" });

  const users = data?.users || [];
  const roles = data?.roles || ["coordinator", "driver", "manager", "admin"];

  const onCreate = async () => {
    await createUser.mutateAsync({ ...form, active: true });
    setForm({ name: "", email: "", password: "", role: "coordinator" });
    refetch();
  };

  const onUpdate = async (record_id: string, updates: any) => {
    await updateUser.mutateAsync({ record_id, updates });
    refetch();
  };

  return (
    <AppShell
      header={
        <SiteHeader
          title="Logistics Planner"
          subtitle="Admin Console"
          links={[
            { href: "/planner", label: "Planner" },
            { href: "/admin", label: "Manager/Admin Home" },
            { href: "/api-proxy/logout", label: "Logout" }
          ]}
        />
      }
    >
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Create User</div>
            <div className="card-subtitle">Admin-only user management.</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select
            className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <Button onClick={onCreate} disabled={createUser.isPending}>Create User</Button>
        </div>
      </div>
      <div className="card mt-6">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Users</div>
            <div className="card-subtitle">Update roles, activation, or reset passwords.</div>
          </div>
        </div>
        <div className="space-y-2">
          {users.map((u: any) => (
            <div key={u.record_id} className="grid grid-cols-5 gap-2 items-center">
              <Input defaultValue={u.name || ""} onBlur={(e) => onUpdate(u.record_id, { name: e.target.value })} />
              <div className="text-sm text-steel-500">{u.email}</div>
              <select
                className="h-10 rounded-lg border border-steel-200 bg-white px-2 text-sm"
                defaultValue={u.role}
                onChange={(e) => onUpdate(u.record_id, { role: e.target.value })}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <label className="text-xs text-steel-500">
                <input
                  type="checkbox"
                  defaultChecked={u.active}
                  onChange={(e) => onUpdate(u.record_id, { active: e.target.checked })}
                />
                Active
              </label>
              <Input
                type="password"
                placeholder="Reset password"
                onBlur={(e) => e.target.value && onUpdate(u.record_id, { password: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

