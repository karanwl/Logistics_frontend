"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/api/auth";

const publicPrefixes = ["/auth", "/unauthorized"];

export default function AccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const isPublic = publicPrefixes.some((prefix) => pathname.startsWith(prefix));
  const { data, isLoading } = useCurrentUser(!isPublic);
  const role = (data?.user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isManagerOrAdmin = isAdmin || isManager;

  const denial = useMemo(() => {
    if (isPublic) return "";
    if (pathname.startsWith("/admin")) return isAdmin ? "" : "This page is for administrators only.";
    if (pathname.startsWith("/users")) return isAdmin ? "" : "This page is for administrators only.";
    if (pathname.startsWith("/meeting-intake")) return isManagerOrAdmin ? "" : "This page is for managers and administrators.";
    if (pathname.startsWith("/jobsites")) return isManagerOrAdmin ? "" : "This page is for managers and administrators.";
    if (pathname.startsWith("/deliveries")) return isManagerOrAdmin ? "" : "This page is for managers and administrators.";
    if (pathname.startsWith("/planner/published")) return isManagerOrAdmin ? "" : "This page is for managers and administrators.";
    if (pathname.startsWith("/planner")) return isManagerOrAdmin ? "" : "This page is for managers and administrators.";
    return "";
  }, [isAdmin, isManagerOrAdmin, isPublic, pathname]);

  if (isPublic) return <>{children}</>;
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Checking your access</div>
            <div className="card-subtitle">Please wait while we open your workspace.</div>
          </div>
        </div>
        <div className="empty-state">One moment...</div>
      </div>
    );
  }

  if (denial) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">This area is restricted</div>
            <div className="card-subtitle">Your current account does not include this section.</div>
          </div>
        </div>
        <div className="empty-state">{denial}</div>
      </div>
    );
  }

  return <>{children}</>;
}
