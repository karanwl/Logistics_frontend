import AppShell from "@/components/layout/AppShell";

export default function StatusPage() {
  return (
    <AppShell>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Update complete</div>
          </div>
        </div>
        <div className="empty-state">This page will show next-step details after each action.</div>
      </div>
    </AppShell>
  );
}

