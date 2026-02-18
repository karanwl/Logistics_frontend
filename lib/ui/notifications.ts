export type AppNotification = {
  id?: string;
  message: string;
  correlationId?: string;
  tone?: "error" | "info";
};

export const NOTIFICATION_EVENT = "app:notification";

export function notify(notification: AppNotification): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AppNotification>(NOTIFICATION_EVENT, {
      detail: {
        id: notification.id || crypto.randomUUID(),
        tone: notification.tone || "info",
        ...notification
      }
    })
  );
}
