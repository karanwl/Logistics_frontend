"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";

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
  const filteredLinks = isAuthPage
    ? links.filter((link) => link.href !== "/api-proxy/logout")
    : links;
  return (
    <SiteHeader
      title="Logistics Planner"
      subtitle="Operations Console"
      links={filteredLinks}
    />
  );
}
