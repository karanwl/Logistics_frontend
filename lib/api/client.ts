export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function parsePayload(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  if (!headers.has("X-CSRF-Token")) {
    const method = (init.method || "GET").toUpperCase();
    let csrf = getCookie("csrf_token");
    if (!csrf && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      csrf = await ensureCsrfCookie();
    }
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetch(`/api-proxy${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store"
  });

  if (res.status === 403 && typeof window !== "undefined") {
    try {
      fetch("/api-proxy/logout", { method: "GET", credentials: "include" }).catch(() => null);
    } catch {
      // no-op
    }
    window.location.href = "/auth/login";
  }

  if (res.status === 303) {
    return parsePayload(res) as Promise<T>;
  }

  if (!res.ok) {
    const payload = await parsePayload(res);
    const message =
      typeof payload === "string"
        ? payload
        : (payload as any)?.detail || (payload as any)?.error || "Request failed";
    throw new ApiError(message, res.status, payload);
  }

  return parsePayload(res) as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: BodyInit, headers?: HeadersInit) =>
    apiFetch<T>(path, { method: "POST", body, headers }),
  patch: <T>(path: string, body?: BodyInit, headers?: HeadersInit) =>
    apiFetch<T>(path, { method: "PATCH", body, headers }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" })
};
