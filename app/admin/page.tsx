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
            <div className="text-xl font-semibold">Operations Shortcuts</div>
            <div className="card-subtitle">Quick access to the tools your team uses every day.</div>
          </div>
          <div className="admin-pill">Leadership</div>
        </div>
        <div className="admin-grid">
          <div className="admin-tile">
            <div className="admin-tile-title">Manage Locations</div>
            <div className="admin-tile-subtitle">Add and update customer locations to keep daily plans accurate.</div>
            <Link href="/jobsites" className="admin-tile-link">
              Open locations
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Delivery Calendar</div>
            <div className="admin-tile-subtitle">Review today&apos;s work, upcoming deliveries, and pending items.</div>
            <Link href="/schedule" className="admin-tile-link">
              Open calendar
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Final Plans</div>
            <div className="admin-tile-subtitle">Review finalized trip plans before execution.</div>
            <Link href="/planner/published" className="admin-tile-link">
              Open final plans
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">New Orders</div>
            <div className="admin-tile-subtitle">Enter new orders and send them to the calendar.</div>
            <Link href="/meeting-intake" className="admin-tile-link">
              Add orders
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Team Access</div>
            <div className="admin-tile-subtitle">Create accounts and manage who can view each area.</div>
            {isAdmin ? (
              <Link href="/users" className="admin-tile-link">
                Manage access
              </Link>
            ) : (
              <button
                type="button"
                className="admin-tile-link text-steel-400 cursor-not-allowed text-left"
                onClick={() => {
                  window.location.href = "/unauthorized?message=This%20section%20is%20for%20administrators%20only.";
                }}
              >
                Manage access
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

