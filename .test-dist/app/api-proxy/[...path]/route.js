import { z } from "zod";
import { ApiError } from "../../../lib/errors/model.js";
import { withErrorHandling } from "../../../lib/errors/server.js";
const DEFAULT_BASE_URL = "https://logistics-backend-6f0pea.fly.dev";
const WEBHOOK_SIGNATURE_HEADERS = [
    "stripe-signature",
    "x-webhook-signature",
    "x-signature"
];
const PASS_THROUGH_REQUEST_HEADER_DENYLIST = new Set([
    "host",
    "content-length",
    "accept-encoding"
]);
const PASS_THROUGH_RESPONSE_HEADER_DENYLIST = new Set([
    "set-cookie",
    "content-encoding",
    "content-length",
    "transfer-encoding"
]);
const CALLBACK_PATH_PATTERN = /(callback|webhook)/i;
const WEBHOOK_PATH_PATTERN = /webhook/i;
function resolveBaseUrl(rawBaseUrl) {
    const trimmed = (rawBaseUrl || "").trim();
    const unquoted = trimmed.replace(/^['"]|['"]$/g, "").trim();
    return unquoted || DEFAULT_BASE_URL;
}
const BASE_URL = resolveBaseUrl(process.env.FASTAPI_BASE_URL);
const callbackPayloadSchema = z.record(z.string(), z.unknown());
const signatureSchema = z.string().min(8).max(2048);
function pathMatches(path, pattern) {
    return path.some((segment) => pattern.test(segment));
}
function isCallbackPath(path) {
    return pathMatches(path, CALLBACK_PATH_PATTERN);
}
function isWebhookPath(path) {
    return pathMatches(path, WEBHOOK_PATH_PATTERN);
}
function readMessage(payload) {
    if (typeof payload === "string")
        return payload || "Request failed.";
    if (payload && typeof payload === "object") {
        const obj = payload;
        if (typeof obj.message === "string" && obj.message.trim())
            return obj.message;
        if (typeof obj.detail === "string" && obj.detail.trim())
            return obj.detail;
        if (typeof obj.error === "string" && obj.error.trim())
            return obj.error;
    }
    return "Request failed.";
}
async function parsePayload(res) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        try {
            return await res.json();
        }
        catch {
            return { message: "Invalid JSON response from upstream service." };
        }
    }
    try {
        return await res.text();
    }
    catch {
        return "Unexpected upstream response.";
    }
}
function readWebhookSignature(headers) {
    for (const header of WEBHOOK_SIGNATURE_HEADERS) {
        const value = headers.get(header);
        if (value != null)
            return value;
    }
    return null;
}
function validateWebhookSignatureIfPresent(req, path) {
    if (!isWebhookPath(path))
        return;
    const signature = readWebhookSignature(req.headers);
    if (signature == null)
        return;
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
function getProxyUrl(req, path) {
    const requestUrl = new URL(req.url);
    const proxyPath = path.join("/");
    return `${BASE_URL.replace(/\/$/, "")}/${proxyPath}${requestUrl.search}`;
}
function cloneRequestHeaders(req, correlationId) {
    const headers = new Headers(req.headers);
    for (const header of PASS_THROUGH_REQUEST_HEADER_DENYLIST) {
        headers.delete(header);
    }
    headers.set("x-correlation-id", correlationId);
    return headers;
}
async function readBody(req, path) {
    if (req.method === "GET" || req.method === "HEAD")
        return undefined;
    const contentType = req.headers.get("content-type") || "";
    if (!isCallbackPath(path) || !contentType.includes("application/json")) {
        return req.arrayBuffer();
    }
    const raw = await req.text();
    if (!raw.trim())
        return raw;
    let parsedJson;
    try {
        parsedJson = JSON.parse(raw);
    }
    catch {
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
function appendSetCookieHeaders(source, target) {
    const rawSetCookie = source.getSetCookie?.();
    if (Array.isArray(rawSetCookie)) {
        for (const cookie of rawSetCookie) {
            target.append("set-cookie", cookie);
        }
        return;
    }
    if (typeof rawSetCookie === "string" && rawSetCookie.length > 0) {
        target.append("set-cookie", rawSetCookie);
    }
}
function copyResponseHeaders(source, target) {
    source.forEach((value, key) => {
        if (PASS_THROUGH_RESPONSE_HEADER_DENYLIST.has(key.toLowerCase()))
            return;
        target.set(key, value);
    });
}
async function proxyRequest(req, params, correlationId) {
    const url = getProxyUrl(req, params.path);
    validateWebhookSignatureIfPresent(req, params.path);
    const headers = cloneRequestHeaders(req, correlationId);
    const init = {
        method: req.method,
        headers,
        cache: "no-store",
        redirect: "manual"
    };
    init.body = await readBody(req, params.path);
    let res;
    try {
        res = await fetch(url, init);
    }
    catch {
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
    appendSetCookieHeaders(res.headers, responseHeaders);
    copyResponseHeaders(res.headers, responseHeaders);
    responseHeaders.set("x-correlation-id", correlationId);
    return new Response(res.body, {
        status: res.status,
        headers: responseHeaders
    });
}
const routeHandler = withErrorHandling(async (req, context) => proxyRequest(req, context.params, context.correlationId));
export const GET = routeHandler;
export const POST = routeHandler;
export const PATCH = routeHandler;
export const PUT = routeHandler;
export const DELETE = routeHandler;
