import AppShell from "@/components/layout/AppShell";
import { CardHeader, CardTitle } from "@/components/ui/card";

export default function RequestAccessPage() {
  return (
    <AppShell>
      <div className="max-w-lg">
        <div className="card">
          <CardHeader>
            <CardTitle>Request an account</CardTitle>
          </CardHeader>
          <div className="empty-state">
            Account setup is managed by your company administrator. Please contact them to request access.
          </div>
          <div className="page-actions mt-3">
            <a className="text-xs text-steel-500" href="/auth/login">Sign in</a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

