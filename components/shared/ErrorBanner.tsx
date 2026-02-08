"use client";

import { ApiError } from "@/lib/api/client";

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  const err = error as ApiError & { payload?: any };
  const detail = err?.payload?.detail || err?.payload?.error || err?.message || "Request failed";
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {detail}
    </div>
  );
}
