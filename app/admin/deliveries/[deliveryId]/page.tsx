import AppShell from "@/components/layout/AppShell";
import SiteHeader from "@/components/layout/SiteHeader";
import Link from "next/link";

export default function DeliveryDetailPage({
  params
}: {
  params: { deliveryId: string };
}) {
  return (
    <AppShell
      header={
        <SiteHeader
          title="Logistics Planner"
          subtitle="Delivery Detail"
          links={[
            { href: "/planner", label: "Planner" },
            { href: "/admin", label: "Manager/Admin Home" },
            { href: "/schedule", label: "Schedule" },
            { href: "/api-proxy/logout", label: "Logout" }
          ]}
        />
      }
    >
      <div className="card">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Delivery {params.deliveryId}</div>
            <div className="card-subtitle">This page is ready for delivery details.</div>
          </div>
        </div>
        <div className="text-sm text-steel-600">
          Add delivery status, driver assignment, and timeline details here.
        </div>
        <div className="mt-4">
          <Link href="/admin" className="text-ink-900">Back to Admin</Link>
        </div>
      </div>
    </AppShell>
  );
}
