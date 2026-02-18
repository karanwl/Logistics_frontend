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
