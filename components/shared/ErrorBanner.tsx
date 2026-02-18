"use client";

import { useState } from "react";
import { readCorrelationId, readErrorMessage } from "@/lib/errors/client";

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  const detail = readErrorMessage(error, "We could not complete this action.");
  const correlationId = readCorrelationId(error);
  const [copied, setCopied] = useState(false);

  const copyCorrelationId = async () => {
    if (!correlationId || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(correlationId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard permission issues.
    }
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/95 px-3 py-2 text-sm text-red-700 shadow-sm">
      <div>{detail}</div>
      {correlationId ? (
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-red-600">
          <span>Error ID: {correlationId}</span>
          <button
            type="button"
            className="rounded border border-red-300 bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-200"
            onClick={copyCorrelationId}
          >
            {copied ? "Copied" : "Copy ID"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
