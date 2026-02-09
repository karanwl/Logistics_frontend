"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import { useCurrentUser } from "@/lib/api/auth";

const links = [
  { href: "/planner", label: "Planner" },
  { href: "/schedule", label: "Schedule" },
  { href: "/planner/published", label: "Published" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/meeting-intake", label: "Meeting Intake" },
  { href: "/api-proxy/logout", label: "Logout" }
];

export default function AppHeader() {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth");
  const { data } = useCurrentUser(!isAuthPage);
  const role = (data?.user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isManagerOrAdmin = isAdmin || isManager;

  const filteredLinks = useMemo(() => {
    const base = isAuthPage ? links.filter((link) => link.href !== "/api-proxy/logout") : links;
    return base.map((link) => {
      let requiresAdmin = false;
      let requiresManager = false;
      if (link.href === "/planner") {
        requiresManager = true;
      } else if (link.href.startsWith("/admin/users")) {
        requiresAdmin = true;
      } else if (link.href.startsWith("/admin") || link.href.startsWith("/planner/published")) {
        requiresManager = true;
      }

      if (requiresAdmin && !isAdmin) {
        return {
          ...link,
          blocked: true,
          onClick: () => {
            window.location.href = "/unauthorized?message=Admin%20access%20required.";
          }
        };
      }
      if (requiresManager && !isManagerOrAdmin) {
        return {
          ...link,
          blocked: true,
          onClick: () => {
            window.location.href = "/unauthorized?message=Manager%20or%20Admin%20access%20required.";
          }
        };
      }
      return link;
    });
  }, [isAdmin, isManagerOrAdmin, isAuthPage]);
  return (
    <SiteHeader
      title="Logistics Planner"
      subtitle="Operations Console"
      links={filteredLinks}
    />
  );
}
