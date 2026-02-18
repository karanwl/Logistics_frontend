"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import NotificationCenter from "@/components/shared/NotificationCenter";
import { ApiError } from "@/lib/api/client";
import { readCorrelationId, readErrorMessage } from "@/lib/errors/client";
import { notify } from "@/lib/ui/notifications";

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            const status = error instanceof ApiError ? error.status : null;
            if (status === 401 || status === 403) return;
            notify({
              tone: "error",
              message: readErrorMessage(error, "Could not complete your request."),
              correlationId: readCorrelationId(error)
            });
          }
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            const status = error instanceof ApiError ? error.status : null;
            if (status === 401 || status === 403) return;
            notify({
              tone: "error",
              message: readErrorMessage(error, "Could not complete your request."),
              correlationId: readCorrelationId(error)
            });
          }
        })
      })
  );

  useEffect(() => {
    fetch("/api-proxy/health", { credentials: "include" }).catch(() => null);
  }, []);
  return (
    <QueryClientProvider client={client}>
      <NotificationCenter />
      {children}
    </QueryClientProvider>
  );
}
