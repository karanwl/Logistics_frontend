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
    if (pathname.startsWith("/admin/users")) return isAdmin ? "" : "Admin access required.";
    if (pathname.startsWith("/admin")) return isManagerOrAdmin ? "" : "Manager or Admin access required.";
    if (pathname.startsWith("/planner/published")) return isManagerOrAdmin ? "" : "Manager or Admin access required.";
    if (pathname.startsWith("/planner")) return isManagerOrAdmin ? "" : "Manager or Admin access required.";
    return "";
  }, [isAdmin, isManagerOrAdmin, isPublic, pathname]);

  if (isPublic) return <>{children}</>;
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Checking access</div>
            <div className="card-subtitle">Loading your permissions.</div>
          </div>
        </div>
        <div className="empty-state">Please wait a moment.</div>
      </div>
    );
  }

  if (denial) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Access restricted</div>
            <div className="card-subtitle">You do not have permission to view this section.</div>
          </div>
        </div>
        <div className="empty-state">{denial}</div>
      </div>
    );
  }

  return <>{children}</>;
}
