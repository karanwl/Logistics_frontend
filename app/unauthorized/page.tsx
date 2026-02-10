"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = useMemo(
    () => searchParams.get("message") || "You do not have access to this page.",
    [searchParams]
  );

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/schedule");
  };

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
          <div className="page-actions mt-4">
            <Button type="button" onClick={goBack}>
              Go back
            </Button>
            <Link className="text-xs text-steel-500 hover:text-ink-900" href="/auth/request-access">
              Request access
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
