"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import { useCurrentUser } from "@/lib/api/auth";

type RoleKey = "admin" | "manager" | "coordinator";

const ROLE_LINKS: Record<RoleKey, { href: string; label: string }[]> = {
  admin: [
    { href: "/schedule", label: "Delivery Calendar" },
    { href: "/planner", label: "Daily Planning" },
    { href: "/planner/dashboard", label: "Performance" },
    { href: "/planner/live", label: "Live Updates" },
    { href: "/planner/manual", label: "Custom Plans" },
    { href: "/planner/published", label: "Final Plans" },
    { href: "/meeting-intake", label: "New Orders" },
    { href: "/jobsites", label: "Locations" },
    { href: "/users", label: "Team Access" },
    { href: "/admin", label: "Operations Hub" }
  ],
  manager: [
    { href: "/schedule", label: "Delivery Calendar" },
    { href: "/planner", label: "Daily Planning" },
    { href: "/planner/dashboard", label: "Performance" },
    { href: "/planner/live", label: "Live Updates" },
    { href: "/planner/manual", label: "Custom Plans" },
    { href: "/planner/published", label: "Final Plans" },
    { href: "/meeting-intake", label: "New Orders" },
    { href: "/jobsites", label: "Locations" }
  ],
  coordinator: [{ href: "/schedule", label: "Delivery Calendar" }]
};

function resolveRoleKey(rawRole: unknown): RoleKey {
  const role = String(rawRole || "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "manager") return "manager";
  return "coordinator";
}

function subtitleForRole(roleKey: RoleKey): string {
  if (roleKey === "admin") return "Executive Operations View";
  if (roleKey === "manager") return "Management Operations View";
  return "Daily Operations View";
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
      title="Logistics Operations"
      subtitle={isAuthPage ? "Operations Portal" : subtitle}
      links={filteredLinks}
      currentPath={pathname || ""}
    />
  );
}
