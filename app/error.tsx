"use client";

import { useMemo } from "react";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { resolveErrorId } from "@/lib/errors/client";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorId = useMemo(() => resolveErrorId(error), [error]);
  return (
    <ErrorFallback
      title="Something went wrong"
      message="The page could not load correctly. Please try again."
      errorId={errorId}
      onRetry={reset}
    />
  );
}
