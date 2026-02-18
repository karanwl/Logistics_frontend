"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api/client";
import { readErrorMessage } from "@/lib/errors/client";
import { SolveJobDTO } from "@/lib/types/planner";

export function useSolvePolling(
  jobId?: string,
  status?: SolveJobDTO["status"],
  onSuccess?: (job: SolveJobDTO) => void
) {
  const router = useRouter();

  useEffect(() => {
    if (!jobId) return;
    if (status === "success" || status === "failed") return;
    let timer: NodeJS.Timeout;
    let active = true;

    const poll = async () => {
      try {
        const job = await api.get<SolveJobDTO>(`/solve/${jobId}`);
        if (!active) return;
        if (job.status === "success" || job.status === "failed") {
          if (job.status === "success") onSuccess?.(job);
          active = false;
          if (timer) clearTimeout(timer);
          return;
        }
        timer = setTimeout(poll, 2000);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          active = false;
          if (timer) clearTimeout(timer);
          router.replace("/schedule");
          return;
        }
        // Keep polling unless we hit terminal 404.
        void readErrorMessage(error, "Solve status polling failed.");
        timer = setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, status, onSuccess, router]);
}
