"use client";

import { useEffect, useState } from "react";
import { NOTIFICATION_EVENT, type AppNotification } from "@/lib/ui/notifications";

type LiveNotification = Required<Pick<AppNotification, "id" | "message" | "tone">> &
  Pick<AppNotification, "correlationId">;

const MAX_NOTIFICATIONS = 4;

export default function NotificationCenter() {
  const [items, setItems] = useState<LiveNotification[]>([]);

  useEffect(() => {
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<AppNotification>).detail;
      if (!detail?.message) return;
      const item: LiveNotification = {
        id: detail.id || crypto.randomUUID(),
        message: detail.message,
        tone: detail.tone || "info",
        correlationId: detail.correlationId
      };
      setItems((current) => [item, ...current.filter((row) => row.id !== item.id)].slice(0, MAX_NOTIFICATIONS));
      window.setTimeout(() => {
        setItems((current) => current.filter((row) => row.id !== item.id));
      }, 5000);
    };
    window.addEventListener(NOTIFICATION_EVENT, onNotify);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onNotify);
  }, []);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto rounded-xl border px-3 py-2 text-sm shadow-lg ${
            item.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-steel-200 bg-white text-ink-900"
          }`}
        >
          <div>{item.message}</div>
          {item.correlationId ? <div className="mt-1 text-xs opacity-80">Error ID: {item.correlationId}</div> : null}
        </div>
      ))}
    </div>
  );
}
