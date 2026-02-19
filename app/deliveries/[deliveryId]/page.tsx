"use client";

import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { normalizePhotoUrls, toPhotoSource, type PhotoSource } from "@/lib/utils/photos";

export default function DeliveryDetailPage({
  params
}: {
  params: { deliveryId: string };
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["delivery-detail", params.deliveryId],
    queryFn: () => api.get<Record<string, any>>(`/api/deliveries/${encodeURIComponent(params.deliveryId)}/details`),
    enabled: Boolean(params.deliveryId)
  });
  const delivery = data || {};
  const photoUrls = normalizePhotoUrls(delivery.photo_urls);
  const photoSources = photoUrls.map(toPhotoSource);

  return (
    <AppShell>
      <div className="admin-section">
        <div className="card-header">
          <div>
            <div className="text-xl font-semibold">Delivery #{params.deliveryId}</div>
            <div className="card-subtitle">Live delivery details and completion photos.</div>
          </div>
          <div className="admin-pill">Delivery Record</div>
        </div>

        {isLoading ? (
          <div className="admin-tile">Loading delivery details...</div>
        ) : error ? (
          <div className="admin-tile">
            <div className="admin-tile-title">Could not load this delivery.</div>
            <div className="admin-tile-subtitle">{error.message || "Unknown error"}</div>
            <button type="button" className="admin-tile-link mt-2" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="admin-tile">
                <div className="admin-tile-title">Current status</div>
                <div className="admin-tile-subtitle">{delivery.status || "Not set"}</div>
              </div>
              <div className="admin-tile">
                <div className="admin-tile-title">Driver notes</div>
                <div className="admin-tile-subtitle">{delivery.driver_notes || "No notes"}</div>
              </div>
            </div>

            <div className="admin-tile mt-3">
              <div className="admin-tile-title">Proof Photos</div>
              <div className="admin-tile-subtitle">
                {photoUrls.length > 0 ? `${photoUrls.length} photo(s)` : "No photos uploaded yet."}
              </div>
              {photoSources.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {photoSources.map((photo: PhotoSource) => (
                    <a
                      key={photo.raw}
                      href={photo.primary}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-tile-link"
                      title="Open full photo"
                    >
                      <img
                        src={photo.primary}
                        alt={`Delivery ${params.deliveryId} proof photo`}
                        className="h-40 w-full rounded-md object-cover"
                        loading="lazy"
                        onError={(event) => {
                          const img = event.currentTarget;
                          const fallback = img.dataset.fallback || "";
                          if (fallback && img.src !== fallback) {
                            img.src = fallback;
                          }
                        }}
                        data-fallback={photo.fallback || ""}
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}

        <div className="mt-4">
          <Link href="/schedule" className="admin-tile-link">Back to calendar</Link>
        </div>
      </div>
    </AppShell>
  );
}
