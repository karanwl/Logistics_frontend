import { z } from "zod";
import { ApiError } from "../../../lib/errors/model.js";
import { withErrorHandling } from "../../../lib/errors/server.js";

const DEFAULT_BASE_URL = "https://logistics-backend-6f0pea.fly.dev";

function resolveBaseUrl(rawBaseUrl: string | undefined): string {
  const trimmed = (rawBaseUrl || "").trim();
  const unquoted = trimmed.replace(/^['"]|['"]$/g, "").trim();
  return unquoted || DEFAULT_BASE_URL;
}

const BASE_URL = resolveBaseUrl(process.env.FASTAPI_BASE_URL);

const callbackPayloadSchema = z.record(z.string(), z.unknown());
const signatureSchema = z.string().min(8).max(2048);

function isCallbackPath(path: string[]): boolean {
  return path.some((segment) => /(callback|webhook)/i.test(segment));
}

function isWebhookPath(path: string[]): boolean {
  return path.some((segment) => /webhook/i.test(segment));
}

function readMessage(payload: unknown): string {
  if (typeof payload === "string") return payload || "Request failed.";
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
    if (typeof obj.detail === "string" && obj.detail.trim()) return obj.detail;
    if (typeof obj.error === "string" && obj.error.trim()) return obj.error;
  }
  return "Request failed.";
}

async function parsePayload(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return { message: "Invalid JSON response from upstream service." };
    }
  }
  try {
    return await res.text();
  } catch {
    return "Unexpected upstream response.";
  }
}

function validateWebhookSignatureIfPresent(req: Request, path: string[]) {
  if (!isWebhookPath(path)) return;
  const signature =
    req.headers.get("stripe-signature") ||
    req.headers.get("x-webhook-signature") ||
    req.headers.get("x-signature");
  if (signature == null) return;
  const parsed = signatureSchema.safeParse(signature);
  if (!parsed.success) {
    throw new ApiError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid webhook signature header.",
      details: parsed.error.flatten()
    });
  }
}

async function readBody(req: Request, path: string[]): Promise<BodyInit | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const contentType = req.headers.get("content-type") || "";
  if (!isCallbackPath(path) || !contentType.includes("application/json")) {
    return req.arrayBuffer();
  }
  const raw = await req.text();
  if (!raw.trim()) return raw;
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new ApiError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid callback payload."
    });
  }
  const validated = callbackPayloadSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new ApiError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid callback payload.",
      details: validated.error.flatten()
    });
  }
  return JSON.stringify(validated.data);
}

async function proxyRequest(req: Request, params: { path: string[] }, correlationId: string) {
  const targetUrl = new URL(req.url);
  const path = params.path.join("/");
  const url = `${BASE_URL.replace(/\/$/, "")}/${path}${targetUrl.search}`;

  validateWebhookSignatureIfPresent(req, params.path);

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  headers.set("x-correlation-id", correlationId);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    redirect: "manual"
  };

  init.body = await readBody(req, params.path);

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "We could not connect to the service right now. Please try again in a moment."
    });
  }

  if (res.status >= 400) {
    const payload = await parsePayload(res);
    throw new ApiError({
      status: res.status,
      message: readMessage(payload),
      details: typeof payload === "string" ? undefined : payload
    });
  }

  const responseHeaders = new Headers();
  const setCookie = (res.headers as any).getSetCookie?.() ?? [];
  if (Array.isArray(setCookie)) {
    for (const cookie of setCookie) {
      responseHeaders.append("set-cookie", cookie);
    }
  } else if (typeof setCookie === "string" && setCookie.length > 0) {
    responseHeaders.append("set-cookie", setCookie);
  }
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "set-cookie") {
      // Handled via getSetCookie() above.
      return;
    }
    if (lower === "content-encoding" || lower === "content-length" || lower === "transfer-encoding") {
      // Let Next/Fetch handle encoding/length for the proxied response.
      return;
    }
    responseHeaders.set(key, value);
  });

  responseHeaders.set("x-correlation-id", correlationId);

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders
  });
}

const routeHandler = withErrorHandling<{ params: { path: string[] } }>(async (req, context) =>
  proxyRequest(req, context.params, context.correlationId)
);

export const GET = routeHandler;
export const POST = routeHandler;
export const PATCH = routeHandler;
export const PUT = routeHandler;
export const DELETE = routeHandler;
