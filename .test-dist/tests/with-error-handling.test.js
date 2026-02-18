import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../lib/errors/model.js";
import { withErrorHandling } from "../lib/errors/server.js";
import { makeTestRequest } from "./helpers/request.js";
test("withErrorHandling returns normalized error body and correlation id header", async () => {
    const handler = withErrorHandling(async () => {
        throw new ApiError({ status: 404, message: "Plan not found." });
    });
    const request = makeTestRequest("http://localhost/api-proxy/plan/abc", {
        headers: { "x-correlation-id": "corr-header" }
    });
    const response = await handler(request, {});
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-correlation-id"), "corr-header");
    assert.equal(body.code, "NOT_FOUND");
    assert.equal(body.message, "Plan not found.");
    assert.equal(body.correlationId, "corr-header");
});
