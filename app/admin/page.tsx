import AppShell from "@/components/layout/AppShell";
import Link from "next/link";

export default function AdminHomePage() {
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
            <Link href="/admin/jobsites" className="admin-tile-link">
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
            <Link href="/admin/meeting-intake" className="admin-tile-link">
              Start intake
            </Link>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Manage Users</div>
            <div className="admin-tile-subtitle">Create accounts and control access.</div>
            <Link href="/admin/users" className="admin-tile-link">
              Manage users
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

