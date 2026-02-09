import AppShell from "@/components/layout/AppShell";
import Link from "next/link";

export default function DeliveryDetailPage({
  params
}: {
  params: { deliveryId: string };
}) {
  return (
    <AppShell>
      <div className="admin-section">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Delivery {params.deliveryId}</div>
            <div className="card-subtitle">This page is ready for delivery details.</div>
          </div>
          <div className="admin-pill">Delivery</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="admin-tile">
            <div className="admin-tile-title">Status</div>
            <div className="admin-tile-subtitle">Add delivery status, driver assignment, and timeline details here.</div>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Notes</div>
            <div className="admin-tile-subtitle">Capture exceptions, ETA changes, and customer updates.</div>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/admin" className="admin-tile-link">Back to Admin</Link>
        </div>
      </div>
    </AppShell>
  );
}
