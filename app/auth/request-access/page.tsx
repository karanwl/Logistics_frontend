import AppShell from "@/components/layout/AppShell";
import SiteHeader from "@/components/layout/SiteHeader";
import { CardHeader, CardTitle } from "@/components/ui/card";

export default function RequestAccessPage() {
  return (
    <AppShell
      header={
        <SiteHeader
          title="Logistics Planner"
          subtitle="Request Access"
          links={[
            { href: "/planner", label: "Planner" },
            { href: "/auth/login", label: "Sign In" }
          ]}
        />
      }
    >
      <div className="max-w-lg">
        <div className="card">
          <CardHeader>
            <CardTitle>Request access</CardTitle>
          </CardHeader>
          <div className="empty-state">
            Account creation is managed by your administrator. Please contact admin to request access.
          </div>
          <div className="page-actions mt-3">
            <a className="text-xs text-steel-500" href="/auth/login">Sign in</a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

