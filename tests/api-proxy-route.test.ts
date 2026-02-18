import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api-proxy/[...path]/route.js";
import { makeTestRequest } from "./helpers/request.js";

test("api proxy callback rejects invalid JSON payload with deterministic 400", async () => {
  const request = makeTestRequest("http://localhost/api-proxy/provider/callback", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: "{invalid-json"
  });

  const response = await POST(request as any, {
    params: { path: ["provider", "callback"] }
  } as any);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(body.message, "Invalid callback payload.");
  assert.ok(typeof body.correlationId === "string" && body.correlationId.length > 0);
  assert.equal(response.headers.get("x-correlation-id"), body.correlationId);
});

test("api proxy webhook rejects invalid signature header", async () => {
  const request = makeTestRequest("http://localhost/api-proxy/provider/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "short"
    },
    body: "{}"
  });

  const response = await POST(request as any, {
    params: { path: ["provider", "webhook"] }
  } as any);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.equal(body.message, "Invalid webhook signature header.");
  assert.ok(typeof body.correlationId === "string" && body.correlationId.length > 0);
  assert.equal(response.headers.get("x-correlation-id"), body.correlationId);
});

test("api proxy preserves upstream nested error envelope and forwards request id header", async () => {
  const originalFetch = globalThis.fetch;
  let forwardedRequestId = "";
  try {
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      forwardedRequestId = headers.get("x-request-id") || "";
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            message: "Upstream conflict.",
            code: "CONFLICT",
            correlationId: "upstream-corr-123",
            details: { reason: "duplicate" }
          }
        }),
        {
          status: 409,
          headers: { "content-type": "application/json", "x-correlation-id": "upstream-corr-123" }
        }
      );
    }) as typeof fetch;

    const request = makeTestRequest("http://localhost/api-proxy/deliveries/bulk-create", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ deliveries: [] })
    });

    const response = await POST(request as any, {
      params: { path: ["deliveries", "bulk-create"] }
    } as any);
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.code, "CONFLICT");
    assert.equal(body.message, "Upstream conflict.");
    assert.equal(body.correlationId, "upstream-corr-123");
    assert.equal(response.headers.get("x-correlation-id"), "upstream-corr-123");
    assert.ok(forwardedRequestId.length > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
