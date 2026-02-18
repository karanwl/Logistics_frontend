import { ApiError } from "./model.js";

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function readErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    return (
      readString(obj.message) ||
      readString(obj.detail) ||
      readString(obj.error) ||
      fallback
    );
  }
  return fallback;
}

export function readCorrelationId(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.correlationId;
  if (!error || typeof error !== "object") return undefined;
  const obj = error as Record<string, unknown>;
  return readString(obj.correlationId) || undefined;
}

export function resolveErrorId(error: unknown): string {
  const correlationId = readCorrelationId(error);
  if (correlationId) return correlationId;
  if (error && typeof error === "object") {
    const digest = readString((error as Record<string, unknown>).digest);
    if (digest) return digest;
  }
  return crypto.randomUUID();
}
