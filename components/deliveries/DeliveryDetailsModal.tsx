"use client";

import type { RefObject } from "react";
import { normalizePhotoUrls, resolvePhotoUrl } from "@/lib/utils/photos";

type Props = {
  open: boolean;
  deliveryId?: string;
  data: Record<string, any> | null;
  loading: boolean;
  error?: string;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
  titleId?: string;
  containerId?: string;
  bodyId?: string;
};

export default function DeliveryDetailsModal({
  open,
  deliveryId = "",
  data,
  loading,
  error = "",
  onClose,
  panelRef,
  closeRef,
  titleId = "deliveryDetailsTitle",
  containerId,
  bodyId
}: Props) {
  const normalizedDeliveryId = String(deliveryId || "").trim();
  const drawerPhotoUrls = normalizePhotoUrls(data?.photo_urls).map(resolvePhotoUrl);
  const deliveryLoads = [
    { label: "Large Skids", value: Number(data?.large_skid || 0) },
    { label: "Medium Skids", value: Number(data?.med_skid || 0) },
    { label: "Small Skids", value: Number(data?.small_skid || 0) },
    { label: "Doors", value: Number(data?.door || 0) },
    { label: "Frames", value: Number(data?.frame || 0) },
    { label: "Express Frames", value: Number(data?.exp_frame || 0) },
    { label: "Boxes", value: Number(data?.box || 0) }
  ].filter((item) => item.value > 0);

  return (
    <div id={containerId} className={`delivery-popup ${open ? "" : "is-hidden"}`} aria-hidden={!open}>
      <div className="delivery-popup-backdrop" onClick={onClose} />
      <div
        className="delivery-popup-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="delivery-popup-header">
          <div>
            <h2 id={titleId} className="text-xl font-semibold">Delivery Details</h2>
            {normalizedDeliveryId ? <div className="text-xs text-steel-500">Delivery #{normalizedDeliveryId}</div> : null}
          </div>
          <button
            className="btn btn-secondary icon-only"
            type="button"
            aria-label="Close"
            onClick={onClose}
            ref={closeRef}
          >
            X
          </button>
        </div>

        <div id={bodyId} className="delivery-popup-body">
          {!normalizedDeliveryId && !data ? (
            <div className="empty-state">No delivery selected.</div>
          ) : loading ? (
            <div className="empty-state">Loading delivery details...</div>
          ) : !data ? (
            <div className="empty-state">Could not load delivery details.</div>
          ) : (
            <div className="delivery-popup-layout">
              <div className="delivery-popup-left">
                <div className="delivery-popup-summary">
                  <div>
                    <div className="text-xs text-steel-500">Location</div>
                    <div className="text-sm font-semibold">{data.job_name || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-steel-500">Sales Order</div>
                    <div className="text-sm">{data.sales_order || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-steel-500">Date</div>
                    <div className="text-sm">{data.scheduled_date || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-steel-500">Window</div>
                    <div className="text-sm">{`${data.window_start || "--"} - ${data.window_end || "--"}`}</div>
                  </div>
                  <div>
                    <div className="text-xs text-steel-500">Status</div>
                    <div className="text-sm">{data.status || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-steel-500">Assigned Driver</div>
                    <div className="text-sm">{data.assigned_driver || "--"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-steel-500">Address</div>
                    <div className="text-sm">{data.job_address || "--"}</div>
                  </div>
                </div>

                <div className="delivery-popup-summary">
                  {deliveryLoads.length > 0 ? (
                    deliveryLoads.map((item) => (
                      <div key={item.label}>
                        <div className="text-xs text-steel-500">{item.label}</div>
                        <div className="text-sm">{item.value}</div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <div className="text-xs text-steel-500">Load</div>
                      <div className="text-sm">No load items</div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-steel-500">Driver Notes</div>
                  <div className="delivery-popup-notes">{data.driver_notes || "No notes"}</div>
                </div>
              </div>

              <div className="delivery-popup-right">
                <div className="text-xs text-steel-500">POD Photos</div>
                {drawerPhotoUrls.length > 0 ? (
                  <div className="delivery-popup-pod-stack">
                    {drawerPhotoUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="delivery-popup-pod-link">
                        <img src={url} alt="POD" className="delivery-popup-pod-image" loading="lazy" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-steel-500">No POD photos uploaded yet.</div>
                )}
              </div>
            </div>
          )}
          {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}

