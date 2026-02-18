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
            <div className="text-xl font-semibold">Delivery #{params.deliveryId}</div>
            <div className="card-subtitle">Delivery details will appear here.</div>
          </div>
          <div className="admin-pill">Delivery Record</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="admin-tile">
            <div className="admin-tile-title">Current status</div>
            <div className="admin-tile-subtitle">Show assignment, timing, and delivery progress.</div>
          </div>
          <div className="admin-tile">
            <div className="admin-tile-title">Notes</div>
            <div className="admin-tile-subtitle">Track updates, changes, and customer communication.</div>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/schedule" className="admin-tile-link">Back to calendar</Link>
        </div>
      </div>
    </AppShell>
  );
}
