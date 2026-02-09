"use client";

import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { useCurrentUser } from "@/lib/api/auth";

export default function AdminHomePage() {
  const { data } = useCurrentUser();
  const role = (data?.user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  return (
    <AppShell>
      <div className="admin-section">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Manager/Admin Tasks</div>
            <div className="card-subtitle">Quick access to daily tools.</div>
          </div>
          <div className="admin-pill">Admin</div>
        </div>
        <div className="admin-grid">
          <div className="admin-tile">
            <div className="admin-tile-title">Create Jobsite</div>
            <div className="admin-tile-subtitle">Add new locations and keep delivery routing accurate.</div>
            <Link href="/jobsites" className="admin-tile-link">
              Open jobsites
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Schedule Board</div>
            <div className="admin-tile-subtitle">Monitor daily flow, backlog, and upcoming deliveries.</div>
            <Link href="/schedule" className="admin-tile-link">
              View schedule
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Published Plans</div>
            <div className="admin-tile-subtitle">Review and share finalized routes.</div>
            <Link href="/planner/published" className="admin-tile-link">
              See published plans
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Meeting Intake</div>
            <div className="admin-tile-subtitle">Capture new orders and publish to the schedule.</div>
            <Link href="/meeting-intake" className="admin-tile-link">
              Start intake
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Manage Users</div>
            <div className="admin-tile-subtitle">Create accounts and control access.</div>
            {isAdmin ? (
              <Link href="/users" className="admin-tile-link">
                Manage users
              </Link>
            ) : (
              <button
                type="button"
                className="admin-tile-link text-steel-400 cursor-not-allowed text-left"
                onClick={() => {
                  window.location.href = "/unauthorized?message=Admin%20access%20required.";
                }}
              >
                Manage users
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

