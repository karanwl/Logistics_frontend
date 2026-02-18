import { ApiError, type ApiErrorCode, statusToCode } from "@/lib/errors/model";

const TRANSIENT_STATUS = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [250, 500, 1000];

export { ApiError };

type ErrorPayload = {
  code?: string;
  message?: string;
  detail?: string;
  error?: string;
  details?: unknown;
  correlationId?: string;
};

async function parsePayload(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return { message: "Invalid JSON response from server." };
    }
  }
  return res.text();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms: number): number {
  return ms + Math.floor(Math.random() * 120);
}

function isGetRequest(init: RequestInit): boolean {
  return (init.method || "GET").toUpperCase() === "GET";
}

function shouldRetryGetResponse(init: RequestInit, res: Response, attempt: number): boolean {
  return isGetRequest(init) && attempt < RETRY_DELAYS_MS.length && TRANSIENT_STATUS.has(res.status);
}

function shouldRetryGetNetworkError(init: RequestInit, attempt: number): boolean {
  return isGetRequest(init) && attempt < RETRY_DELAYS_MS.length;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseErrorPayload(payload: unknown, status: number, correlationId?: string): ApiError {
  if (typeof payload === "string") {
    return new ApiError({
      status,
      code: statusToCode(status),
      message: payload || "Request failed.",
      correlationId
    });
  }

  const obj = payload as ErrorPayload | null;
  const message =
    readString(obj?.message) ||
    readString(obj?.detail) ||
    readString(obj?.error) ||
    "Request failed.";
  const codeFromBody = readString(obj?.code);
  const code =
    codeFromBody &&
    [
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "RATE_LIMITED",
      "BAD_GATEWAY",
      "SERVICE_UNAVAILABLE",
      "GATEWAY_TIMEOUT",
      "INTERNAL_ERROR"
    ].includes(codeFromBody)
      ? (codeFromBody as ApiErrorCode)
      : statusToCode(status);

  return new ApiError({
    status,
    code,
    message,
    details: obj?.details ?? obj?.detail,
    correlationId: readString(obj?.correlationId) || correlationId,
    exposeMessage: status < 500
  });
}

function applyAuthRedirects(error: ApiError) {
  if (typeof window === "undefined") return;
  if (error.status === 401) {
    window.location.href = "/auth/login";
    return;
  }
  if (error.status === 403) {
    const encoded = encodeURIComponent(error.message || "Access denied.");
    window.location.href = `/unauthorized?message=${encoded}`;
  }
}

async function fetchWithRetry(path: string, init: RequestInit): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(`/api-proxy${path}`, {
        ...init,
        credentials: "include",
        cache: "no-store"
      });
      if (!shouldRetryGetResponse(init, res, attempt)) {
        return res;
      }
    } catch (error) {
      if (!shouldRetryGetNetworkError(init, attempt)) {
        throw new ApiError({
          status: 503,
          code: "SERVICE_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Network request failed."
        });
      }
    }
    const delay = withJitter(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
    await wait(delay);
    attempt += 1;
  }
}

export function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export async function ensureCsrfCookie(): Promise<string> {
  let csrf = getCookie("csrf_token");
  if (csrf) return csrf;
  try {
    await fetch("/api-proxy/health", { method: "GET", credentials: "include", cache: "no-store" });
  } catch {
    // no-op
  }
  csrf = getCookie("csrf_token");
  return csrf;
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const method = (init.method || "GET").toUpperCase();
  if (!headers.has("X-CSRF-Token")) {
    let csrf = getCookie("csrf_token");
    if (!csrf && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      csrf = await ensureCsrfCookie();
    }
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetchWithRetry(path, {
    ...init,
    method,
    headers
  });

  if (res.status === 303) {
    return parsePayload(res) as Promise<T>;
  }

  if (!res.ok) {
    const payload = await parsePayload(res);
    const correlationId = res.headers.get("x-correlation-id") || undefined;
    const error = parseErrorPayload(payload, res.status, correlationId);
    applyAuthRedirects(error);
    throw error;
  }

  return parsePayload(res) as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiClient<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: BodyInit, headers?: HeadersInit) =>
    apiClient<T>(path, { method: "POST", body, headers }),
  patch: <T>(path: string, body?: BodyInit, headers?: HeadersInit) =>
    apiClient<T>(path, { method: "PATCH", body, headers }),
  delete: <T>(path: string) => apiClient<T>(path, { method: "DELETE" })
};
