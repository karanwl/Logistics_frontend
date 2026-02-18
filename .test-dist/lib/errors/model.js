export const API_ERROR_CODES = [
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
];
const API_ERROR_CODE_SET = new Set(API_ERROR_CODES);
const STATUS_CODE_MAP = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    429: "RATE_LIMITED",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
    504: "GATEWAY_TIMEOUT"
};
export function statusToCode(status) {
    return STATUS_CODE_MAP[status] || "INTERNAL_ERROR";
}
export function isApiErrorCode(value) {
    return typeof value === "string" && API_ERROR_CODE_SET.has(value);
}
export function normalizeStatus(status) {
    if (!Number.isFinite(status))
        return 500;
    const safe = Math.trunc(status);
    if (safe === 422)
        return 400;
    if (safe >= 400 && safe <= 599)
        return safe;
    return 500;
}
export class ApiError extends Error {
    status;
    code;
    details;
    correlationId;
    exposeMessage;
    constructor(options) {
        super(options.message);
        this.name = "ApiError";
        this.status = normalizeStatus(options.status);
        this.code = options.code || statusToCode(this.status);
        this.details = options.details;
        this.correlationId = options.correlationId;
        this.exposeMessage = options.exposeMessage ?? this.status < 500;
    }
}
