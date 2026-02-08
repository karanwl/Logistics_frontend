"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PlanDTO, RouteDTO, SolveJobDTO } from "@/lib/types/planner";

interface PlannerState {
  selectedStopId: string | null;
  setSelectedStopId: (id: string | null) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  trucks: number;
  vans: number;
  setTrucks: (value: number) => void;
  setVans: (value: number) => void;
  plan: PlanDTO | null;
  setPlan: (plan: PlanDTO | null) => void;
  updateRouteStops: (vehicleId: string | number, stops: RouteDTO["stops"], stopNodes: number[]) => void;
  solveJob: SolveJobDTO | null;
  setSolveJob: (job: SolveJobDTO | null) => void;
}

const PlannerStateContext = createContext<PlannerState | null>(null);

export function PlannerStateProvider({ children }: { children: ReactNode }) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [trucks, setTrucks] = useState<number>(2);
  const [vans, setVans] = useState<number>(1);
  const [plan, setPlan] = useState<PlanDTO | null>(null);
  const [solveJob, setSolveJob] = useState<SolveJobDTO | null>(null);

  const updateRouteStops: PlannerState["updateRouteStops"] = (vehicleId, stops, stopNodes) => {
    if (!plan) return;
    const routes = plan.routes.map((route) =>
      route.vehicle_id === vehicleId
        ? { ...route, stops, stop_nodes: stopNodes }
        : route
    );
    setPlan({ ...plan, routes });
  };

  const value = useMemo(
    () => ({
      selectedStopId,
      setSelectedStopId,
      selectedDate,
      setSelectedDate,
      trucks,
      vans,
      setTrucks,
      setVans,
      plan,
      setPlan,
      updateRouteStops,
      solveJob,
      setSolveJob
    }),
    [selectedStopId, selectedDate, trucks, vans, plan, solveJob]
  );

  return <PlannerStateContext.Provider value={value}>{children}</PlannerStateContext.Provider>;
}

export function usePlannerState() {
  const ctx = useContext(PlannerStateContext);
  if (!ctx) throw new Error("usePlannerState must be used within PlannerStateProvider");
  return ctx;
}
