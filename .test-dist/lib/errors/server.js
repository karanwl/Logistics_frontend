import { ZodError } from "zod";
import { ApiError, normalizeStatus, statusToCode } from "./model.js";
const DEFAULT_MESSAGE = "Something went wrong. Please try again.";
function safeObject(value) {
    if (!value || typeof value !== "object")
        return null;
    return value;
}
function readRoutePath(request) {
    try {
        return new URL(request.url).pathname;
    }
    catch {
        return "unknown";
    }
}
function readStatusFromUnknown(error) {
    const obj = safeObject(error);
    if (!obj)
        return null;
    const statusValue = obj.status ?? obj.statusCode;
    if (typeof statusValue === "number")
        return normalizeStatus(statusValue);
    if (typeof statusValue === "string" && statusValue.trim()) {
        const parsed = Number.parseInt(statusValue, 10);
        if (!Number.isNaN(parsed))
            return normalizeStatus(parsed);
    }
    return null;
}
function sanitizeCause(error) {
    if (error instanceof Error) {
        return { name: error.name, message: error.message };
    }
    if (typeof error === "string") {
        return { name: "Error", message: error };
    }
    const obj = safeObject(error);
    const message = obj && typeof obj.message === "string" ? obj.message : null;
    if (message)
        return { name: "Error", message };
    return undefined;
}
function isPublicMessage(status) {
    return status < 500;
}
function readObjectMessage(obj) {
    return obj && typeof obj.message === "string" ? obj.message : null;
}
function readObjectDetails(obj) {
    return obj?.details;
}
export function getCorrelationId(request) {
    const incoming = request.headers.get("x-correlation-id")?.trim();
    if (incoming)
        return incoming;
    return crypto.randomUUID();
}
export function normalizeError(error, options) {
    if (error instanceof ApiError) {
        const status = normalizeStatus(error.status);
        return {
            status,
            code: error.code || statusToCode(status),
            message: (error.exposeMessage || isPublicMessage(status)) ? error.message : DEFAULT_MESSAGE,
            details: status < 500 ? error.details : undefined,
            correlationId: error.correlationId || options.correlationId
        };
    }
    if (error instanceof ZodError) {
        return {
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Request validation failed.",
            details: error.flatten(),
            correlationId: options.correlationId
        };
    }
    const status = readStatusFromUnknown(error) ?? 500;
    const obj = safeObject(error);
    const objectMessage = readObjectMessage(obj);
    const objectDetails = readObjectDetails(obj);
    return {
        status,
        code: statusToCode(status),
        message: isPublicMessage(status) && objectMessage ? objectMessage : DEFAULT_MESSAGE,
        details: status < 500 && objectDetails !== undefined ? objectDetails : undefined,
        correlationId: options.correlationId
    };
}
export function toErrorResponse(error, options) {
    const normalized = normalizeError(error, { correlationId: options.correlationId });
    if (normalized.status >= 500) {
        console.error("[api-error]", {
            correlationId: normalized.correlationId,
            route: options.route || "unknown",
            status: normalized.status,
            cause: sanitizeCause(error)
        });
    }
    const body = {
        code: normalized.code,
        message: normalized.message,
        correlationId: normalized.correlationId,
        ...(normalized.details !== undefined ? { details: normalized.details } : {})
    };
    return Response.json(body, {
        status: normalized.status,
        headers: {
            "x-correlation-id": normalized.correlationId
        }
    });
}
function withCorrelationHeader(response, correlationId) {
    const headers = new Headers(response.headers);
    headers.set("x-correlation-id", correlationId);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}
export function withErrorHandling(handler) {
    return async (request, context) => {
        const correlationId = getCorrelationId(request);
        const route = readRoutePath(request);
        try {
            const enrichedContext = {
                ...(context || {}),
                correlationId
            };
            const result = await handler(request, {
                ...enrichedContext
            });
            return withCorrelationHeader(result, correlationId);
        }
        catch (error) {
            return toErrorResponse(error, {
                correlationId,
                route
            });
        }
    };
}
