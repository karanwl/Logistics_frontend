import Link from "next/link";
import UnauthorizedBackButton from "@/app/unauthorized/UnauthorizedBackButton";

export default function UnauthorizedPage({
  searchParams
}: {
  searchParams?: { message?: string };
}) {
  const message = searchParams?.message || "Your account does not currently include this page.";

  return (
    <div className="page-shell">
      <div className="bg-grid" />
      <div className="bg-glow glow-a" />
      <div className="bg-glow glow-b" />
      <main className="shell">
        <div className="card max-w-xl">
          <div className="card-header">
            <div>
              <div className="text-xl font-semibold">Page not available</div>
              <div className="card-subtitle">This section is limited to specific team roles.</div>
            </div>
          </div>
          <div className="empty-state">{message}</div>
          <div className="page-actions mt-4">
            <UnauthorizedBackButton />
            <Link className="text-xs text-steel-500 hover:text-ink-900" href="/auth/request-access">
              Request access
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
