import AppShell from "@/components/layout/AppShell";
import SiteHeader from "@/components/layout/SiteHeader";

export default function StatusPage() {
  return (
    <AppShell
      header={
        <SiteHeader
          title="Logistics Planner"
          subtitle="Manager/Admin Console"
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
            <div className="text-xl font-semibold">Action completed</div>
          </div>
        </div>
        <div className="empty-state">Replace with action results page.</div>
      </div>
    </AppShell>
  );
}

