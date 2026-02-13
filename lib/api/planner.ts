import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { PlanDTO, SolveJobDTO } from "@/lib/types/planner";

export const useSolveRun = () =>
  useMutation({
    mutationFn: (payload: { trucks: number; vans: number; force_refresh?: boolean; plan_date?: string }) =>
      api.post<SolveJobDTO>(
        "/solve/run",
        JSON.stringify(payload),
        { "content-type": "application/json" }
      )
  });

export const useSolveStatus = (jobId: string | null) =>
  useQuery({
    queryKey: ["solve", jobId],
    queryFn: () => api.get<SolveJobDTO>(`/solve/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: 2000
  });

export const useRecomputeMetrics = () =>
  useMutation({
    mutationFn: (payload: { routes: unknown[] }) =>
      api.post<PlanDTO>(
        "/plan/recalculate",
        JSON.stringify(payload.routes),
        { "content-type": "application/json" }
      )
  });

export const usePublishPlan = () =>
  useMutation({
    mutationFn: (payload: {
      routes: unknown[];
      deliveries: unknown[];
      meta?: unknown;
      fleet?: unknown;
      plan_date?: string;
      driver_profiles?: unknown[];
    }) =>
      api.post(
        "/plan/publish",
        JSON.stringify(payload),
        { "content-type": "application/json" }
      )
  });

export const usePublishedPlan = (date: string) =>
  useQuery({
    queryKey: ["plan", "published", date],
    queryFn: () => api.get<any>(`/plan/published?date=${encodeURIComponent(date)}`),
    staleTime: 15000,
    enabled: Boolean(date)
  });

export const usePublishedPlansList = () =>
  useQuery({
    queryKey: ["plan", "published", "list"],
    queryFn: () => api.get<{ items: unknown[] }>("/plan/published/list"),
    staleTime: 15000
  });

export const useDeliveries = () =>
  useQuery({
    queryKey: ["deliveries"],
    queryFn: () => api.get<{ deliveries: any[] }>("/deliveries/all"),
    staleTime: 10000
  });

export const useLiveToday = (date: string) =>
  useQuery({
    queryKey: ["live", "today", date],
    queryFn: () => api.get<any>(`/live/today?date=${encodeURIComponent(date)}`),
    staleTime: 10000,
    enabled: Boolean(date)
  });

export const useRescheduleDelivery = () =>
  useMutation({
    mutationFn: (payload: { delivery_id: string; scheduled_date?: string | null }) =>
      api.post(
        `/deliveries/${payload.delivery_id}/reschedule`,
        JSON.stringify({ scheduled_date: payload.scheduled_date || null }),
        { "content-type": "application/json" }
      )
  });

export const useJobsites = () =>
  useQuery({
    queryKey: ["jobsites"],
    queryFn: () => api.get<{ jobsites: any[] }>("/jobsites/list"),
    staleTime: 30000
  });

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<{ users: any[]; roles: string[] }>("/users/list"),
    staleTime: 10000
  });

export const useDrivers = () =>
  useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.get<{ drivers: any[] }>("/drivers/list-full"),
    staleTime: 30000
  });

export const useCreateUser = () =>
  useMutation({
    mutationFn: (payload: any) =>
      api.post("/users/create", JSON.stringify(payload), { "content-type": "application/json" })
  });

export const useUpdateUser = () =>
  useMutation({
    mutationFn: (payload: { record_id: string; updates: any }) =>
      api.patch(`/users/${payload.record_id}`, JSON.stringify(payload.updates), { "content-type": "application/json" })
  });

export const useDelivery = (deliveryId: string) =>
  useQuery({
    queryKey: ["delivery", deliveryId],
    queryFn: () => api.get(`/deliveries/${deliveryId}`),
    enabled: Boolean(deliveryId)
  });

export const useUpdateDelivery = () =>
  useMutation({
    mutationFn: (payload: { delivery_id: string; updates: any }) =>
      api.patch(`/deliveries/${payload.delivery_id}`, JSON.stringify(payload.updates), { "content-type": "application/json" })
  });

export const useBulkCreateDeliveries = () =>
  useMutation({
    mutationFn: (payload: { deliveries: any[] }) =>
      api.post(
        "/deliveries/bulk-create",
        JSON.stringify(payload),
        { "content-type": "application/json" }
      )
  });

export const useCreateJobsite = () =>
  useMutation({
    mutationFn: (payload: { name: string; address: string }) =>
      api.post(
        "/jobsites/create-json",
        new URLSearchParams(payload as any).toString(),
        { "content-type": "application/x-www-form-urlencoded" }
      )
  });

export const useUpdateJobsite = () =>
  useMutation({
    mutationFn: (payload: { jobsite_id: string; updates: any }) =>
      api.patch(
        `/jobsites/${payload.jobsite_id}`,
        JSON.stringify(payload.updates),
        { "content-type": "application/json" }
      )
  });

export const useDeleteJobsite = () =>
  useMutation({
    mutationFn: (payload: { jobsite_id: string }) =>
      api.delete(`/jobsites/${payload.jobsite_id}`)
  });
export const useBulkUpdateDeliveries = () =>
  useMutation({
    mutationFn: (payload: { deliveries: any[] }) =>
      api.post(
        "/deliveries/bulk-update",
        JSON.stringify(payload),
        { "content-type": "application/json" }
      )
  });

export const useDeleteDelivery = () =>
  useMutation({
    mutationFn: (payload: { delivery_id: string }) =>
      api.delete(`/deliveries/${payload.delivery_id}`)
  });
