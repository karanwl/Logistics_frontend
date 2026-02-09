"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers, useCreateUser, useUpdateUser } from "@/lib/api/planner";

export default function AdminUsersPage() {
  const { data, refetch } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "coordinator" });
  const [userEdits, setUserEdits] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const users = data?.users || [];
  const roles = data?.roles || ["coordinator", "driver", "manager", "admin"];

  const baseUsers = useMemo(() => {
    const map: Record<string, any> = {};
    users.forEach((u: any) => {
      map[u.record_id] = {
        name: u.name || "",
        email: u.email || "",
        role: u.role || "coordinator",
        active: Boolean(u.active),
        password: ""
      };
    });
    return map;
  }, [users]);

  useEffect(() => {
    if (!isDirty) {
      setUserEdits(baseUsers);
    }
  }, [baseUsers, isDirty]);

  const onCreate = async () => {
    await createUser.mutateAsync({ ...form, active: true });
    setForm({ name: "", email: "", password: "", role: "coordinator" });
    refetch();
  };

  const updateEdit = (record_id: string, patch: any) => {
    setIsDirty(true);
    setUserEdits((prev) => ({
      ...prev,
      [record_id]: { ...(prev[record_id] || baseUsers[record_id] || {}), ...patch }
    }));
  };

  const saveUpdates = async () => {
    const updates = Object.entries(userEdits).map(([record_id, edits]) => {
      const base = baseUsers[record_id] || {};
      const patch: Record<string, any> = {};
      if (edits.name !== base.name) patch.name = edits.name;
      if (edits.role !== base.role) patch.role = edits.role;
      if (Boolean(edits.active) !== Boolean(base.active)) patch.active = Boolean(edits.active);
      if (edits.password) patch.password = edits.password;
      return { record_id, patch };
    });
    const payload = updates.filter((u) => Object.keys(u.patch).length > 0);
    if (payload.length === 0) {
      setSaveStatus("No changes to save.");
      return;
    }
    setSaveStatus("Saving...");
    for (const item of payload) {
      await updateUser.mutateAsync({ record_id: item.record_id, updates: item.patch });
    }
    setIsDirty(false);
    setSaveStatus("Saved.");
    setUserEdits({});
    refetch();
  };

  return (
    <AppShell>
      <div className="admin-section">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Create User</div>
            <div className="card-subtitle">Admin-only user management.</div>
          </div>
        </div>
        <div className="admin-form-grid">
          <div className="admin-field space-y-1.5">
            <label htmlFor="newUserName">Name</label>
            <Input id="newUserName" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="admin-field space-y-1.5">
            <label htmlFor="newUserEmail">Email</label>
            <Input id="newUserEmail" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="admin-field space-y-1.5">
            <label htmlFor="newUserPassword">Password</label>
            <Input id="newUserPassword" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="admin-field space-y-1.5">
            <label htmlFor="newUserRole">Role</label>
            <select
              id="newUserRole"
              className="admin-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={onCreate} disabled={createUser.isPending}>Create User</Button>
        </div>
      </div>
      <div className="admin-section mt-6">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Users</div>
            <div className="card-subtitle">Update roles, activation, or reset passwords.</div>
          </div>
          <div className="page-actions">
            <Button variant="secondary" onClick={saveUpdates} disabled={updateUser.isPending}>
              Save updates
            </Button>
            <div className="text-xs text-steel-500">{saveStatus}</div>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table-head">
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Password</div>
          </div>
          {users.map((u: any) => (
            <div key={u.record_id} className="admin-table-row">
              <Input
                value={userEdits[u.record_id]?.name ?? u.name ?? ""}
                onChange={(e) => updateEdit(u.record_id, { name: e.target.value })}
              />
              <div className="text-sm text-steel-500">{u.email}</div>
              <select
                className="admin-select"
                value={userEdits[u.record_id]?.role ?? u.role}
                onChange={(e) => updateEdit(u.record_id, { role: e.target.value })}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <label className="text-xs text-steel-500 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={userEdits[u.record_id]?.active ?? Boolean(u.active)}
                  onChange={(e) => updateEdit(u.record_id, { active: e.target.checked })}
                />
                Active
              </label>
              <Input
                type="password"
                placeholder="Reset password"
                value={userEdits[u.record_id]?.password ?? ""}
                onChange={(e) => updateEdit(u.record_id, { password: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

