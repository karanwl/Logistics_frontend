"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import { useCurrentUser } from "@/lib/api/auth";

type RoleKey = "admin" | "manager" | "coordinator";

const ROLE_LINKS: Record<RoleKey, { href: string; label: string }[]> = {
  admin: [
    { href: "/schedule", label: "Schedule" },
    { href: "/planner", label: "Planner" },
    { href: "/planner/dashboard", label: "Dashboard" },
    { href: "/planner/live", label: "Live Progress" },
    { href: "/planner/manual", label: "Manual Runs" },
    { href: "/planner/published", label: "Published" },
    { href: "/meeting-intake", label: "Meeting Intake" },
    { href: "/jobsites", label: "Jobsites" },
    { href: "/users", label: "Users" },
    { href: "/admin", label: "Admin" }
  ],
  manager: [
    { href: "/schedule", label: "Schedule" },
    { href: "/planner", label: "Planner" },
    { href: "/planner/dashboard", label: "Dashboard" },
    { href: "/planner/live", label: "Live Progress" },
    { href: "/planner/manual", label: "Manual Runs" },
    { href: "/planner/published", label: "Published" },
    { href: "/meeting-intake", label: "Meeting Intake" },
    { href: "/jobsites", label: "Jobsites" }
  ],
  coordinator: [{ href: "/schedule", label: "Schedule" }]
};

function resolveRoleKey(rawRole: unknown): RoleKey {
  const role = String(rawRole || "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "manager") return "manager";
  return "coordinator";
}

function subtitleForRole(roleKey: RoleKey): string {
  if (roleKey === "admin") return "Admin Workspace";
  if (roleKey === "manager") return "Manager Workspace";
  return "Coordinator Workspace";
}

export default function AppHeader() {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth") || pathname?.startsWith("/login");
  const { data } = useCurrentUser(!isAuthPage);
  const roleKey = resolveRoleKey(data?.user?.role);
  const subtitle = subtitleForRole(roleKey);

  const filteredLinks = useMemo(() => {
    if (isAuthPage) return [];
    return [
      ...ROLE_LINKS[roleKey],
      {
        href: "/api-proxy/logout",
        label: "Logout",
        onClick: async () => {
          try {
            await fetch("/api-proxy/logout", { credentials: "include" });
          } catch {
            // no-op
          }
          window.location.href = "/auth/login";
        }
      }
    ];
  }, [isAuthPage, roleKey]);

  return (
    <SiteHeader
      title="Logistics Planner"
      subtitle={isAuthPage ? "Operations Console" : subtitle}
      links={filteredLinks}
      currentPath={pathname || ""}
    />
  );
}
