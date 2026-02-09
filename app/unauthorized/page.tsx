export default function UnauthorizedPage({
  searchParams
}: {
  searchParams?: { message?: string };
}) {
  const message = searchParams?.message || "You do not have access to this page.";
  return (
    <div className="page-shell">
      <div className="bg-grid" />
      <div className="bg-glow glow-a" />
      <div className="bg-glow glow-b" />
      <main className="shell">
        <div className="card max-w-xl">
          <div className="card-header">
            <div>
              <div className="text-xl font-semibold">Access restricted</div>
              <div className="card-subtitle">This section is limited to authorized roles.</div>
            </div>
          </div>
          <div className="empty-state">{message}</div>
          <div className="page-actions mt-3">
            <a className="text-xs text-steel-500" href="/planner">Back to Planner</a>
            <a className="text-xs text-steel-500" href="/auth/request-access">Request access</a>
          </div>
        </div>
      </main>
    </div>
  );
}
