export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "BAD_GATEWAY"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT"
  | "INTERNAL_ERROR";

export type ErrorResponseBody = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
  correlationId: string;
};

export type ApiErrorOptions = {
  status: number;
  message: string;
  code?: ApiErrorCode;
  details?: unknown;
  correlationId?: string;
  exposeMessage?: boolean;
};

const STATUS_CODE_MAP: Record<number, ApiErrorCode> = {
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

export function statusToCode(status: number): ApiErrorCode {
  return STATUS_CODE_MAP[status] || "INTERNAL_ERROR";
}

export function normalizeStatus(status: number): number {
  if (!Number.isFinite(status)) return 500;
  const safe = Math.trunc(status);
  if (safe === 422) return 400;
  if (safe >= 400 && safe <= 599) return safe;
  return 500;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;
  readonly correlationId?: string;
  readonly exposeMessage: boolean;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.status = normalizeStatus(options.status);
    this.code = options.code || statusToCode(this.status);
    this.details = options.details;
    this.correlationId = options.correlationId;
    this.exposeMessage = options.exposeMessage ?? this.status < 500;
  }
}
