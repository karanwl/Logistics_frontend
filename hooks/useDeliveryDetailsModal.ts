"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { readErrorMessage } from "@/lib/errors/client";

type OpenDeliveryDetailsOptions = {
  deliveryId: string;
  preview?: Record<string, any> | null;
};

export function useDeliveryDetailsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [deliveryId, setDeliveryId] = useState("");
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
  const [detailData, setDetailData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const requestSeq = useRef(0);

  const close = useCallback(() => {
    requestSeq.current += 1;
    setIsOpen(false);
    setDeliveryId("");
    setPreviewData(null);
    setDetailData(null);
    setLoading(false);
    setError("");
  }, []);

  const open = useCallback(({ deliveryId: rawDeliveryId, preview = null }: OpenDeliveryDetailsOptions) => {
    const normalizedId = String(rawDeliveryId || "").trim();
    setIsOpen(true);
    setDeliveryId(normalizedId);
    setPreviewData(preview);
    setDetailData(null);
    setError("");
    setLoading(true);

    if (!normalizedId) {
      setLoading(false);
      setError("Missing delivery id.");
      return;
    }

    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    api
      .get<Record<string, any>>(`/deliveries/${encodeURIComponent(normalizedId)}/details`)
      .then((detail) => {
        if (requestSeq.current !== seq) return;
        setDetailData(detail || null);
      })
      .catch((err: unknown) => {
        if (requestSeq.current !== seq) return;
        setError(readErrorMessage(err, "Could not load delivery details."));
      })
      .finally(() => {
        if (requestSeq.current !== seq) return;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previouslyLocked = document.body.style.overflow;

    const getFocusable = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          )
        : [];

    window.setTimeout(() => {
      closeRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previouslyLocked;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [close, isOpen]);

  return {
    isOpen,
    deliveryId,
    data: detailData || previewData,
    loading,
    error,
    panelRef,
    closeRef,
    open,
    close
  };
}

