import AppShell from "@/components/layout/AppShell";
import SiteHeader from "@/components/layout/SiteHeader";
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <AppShell
      header={
        <SiteHeader
          title="Logistics Planner"
          subtitle="Manager/Admin Console"
          links={[
            { href: "/planner", label: "Planner" },
            { href: "/schedule", label: "Schedule" },
            { href: "/admin/jobsites", label: "Create Jobsite" },
            { href: "/admin/meeting-intake", label: "Meeting Intake" },
            { href: "/admin/users", label: "Manage Users" },
            { href: "/api-proxy/logout", label: "Logout" }
          ]}
        />
      }
    >
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Manager/Admin Tasks</div>
            <div className="card-subtitle">Quick access to daily tools.</div>
          </div>
        </div>
        <div className="grid gap-3 text-sm">
          <Link href="/admin/jobsites" className="text-ink-900">Create Jobsite</Link>
          <Link href="/schedule" className="text-ink-900">Schedule Board</Link>
          <Link href="/planner/published" className="text-ink-900">Published Plans</Link>
          <Link href="/admin/meeting-intake" className="text-ink-900">Meeting Intake</Link>
          <Link href="/admin/users" className="text-ink-900">Manage Users</Link>
        </div>
      </div>
    </AppShell>
  );
}

