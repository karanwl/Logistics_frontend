"use client";

import { readCorrelationId, readErrorMessage } from "@/lib/errors/client";

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  const detail = readErrorMessage(error, "We could not complete this action.");
  const correlationId = readCorrelationId(error);
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/95 px-3 py-2 text-sm text-red-700 shadow-sm">
      {detail}
      {correlationId ? <div className="mt-1 text-xs text-red-600">Error ID: {correlationId}</div> : null}
    </div>
  );
}
