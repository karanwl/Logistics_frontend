"use client";

import { useMemo } from "react";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { resolveErrorId } from "@/lib/errors/client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorId = useMemo(() => resolveErrorId(error), [error]);
  return (
    <html lang="en">
      <body>
        <ErrorFallback
          title="Application error"
          message="An unexpected app-level error occurred. Please try again."
          errorId={errorId}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
