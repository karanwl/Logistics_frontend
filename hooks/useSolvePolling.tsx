"use client";

import { useEffect } from "react";
import { api } from "@/lib/api/client";
import { SolveJobDTO } from "@/lib/types/planner";

export function useSolvePolling(
  jobId?: string,
  status?: SolveJobDTO["status"],
  onSuccess?: (job: SolveJobDTO) => void
) {
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
      } catch {
        timer = setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, onSuccess]);
}
