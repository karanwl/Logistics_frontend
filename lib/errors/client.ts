import { ApiError } from "./model";

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function readErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  const obj = readObject(error);
  if (obj) {
    const nestedError = readObject(obj.error);
    return (
      readString(obj.message) ||
      readString(obj.detail) ||
      readString(obj.error) ||
      readString(nestedError?.message) ||
      readString(nestedError?.detail) ||
      readString(nestedError?.error) ||
      fallback
    );
  }
  return fallback;
}

export function readCorrelationId(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.correlationId;
  const obj = readObject(error);
  const nestedError = readObject(obj?.error);
  return (
    readString(obj?.correlationId) ||
    readString(nestedError?.correlationId) ||
    readString(obj?.requestId) ||
    undefined
  );
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
