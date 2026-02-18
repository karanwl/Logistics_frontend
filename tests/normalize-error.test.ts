import test from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors/model.js";
import { normalizeError } from "../lib/errors/server.js";

test("normalizeError maps ApiError status and code", () => {
  const normalized = normalizeError(
    new ApiError({ status: 409, message: "Duplicate record." }),
    { correlationId: "corr-1" }
  );
  assert.equal(normalized.status, 409);
  assert.equal(normalized.code, "CONFLICT");
  assert.equal(normalized.message, "Duplicate record.");
  assert.equal(normalized.correlationId, "corr-1");
});

test("normalizeError maps zod validation failures to 400", () => {
  const zodError = new ZodError([
    {
      code: "invalid_type",
      expected: "string",
      received: "number",
      path: ["email"],
      message: "Expected string, received number"
    }
  ]);
  const normalized = normalizeError(zodError, { correlationId: "corr-2" });
  assert.equal(normalized.status, 400);
  assert.equal(normalized.code, "VALIDATION_ERROR");
  assert.equal(normalized.correlationId, "corr-2");
  assert.ok(normalized.details);
});

test("normalizeError defaults unknown errors to internal error", () => {
  const normalized = normalizeError(new Error("top secret"), { correlationId: "corr-3" });
  assert.equal(normalized.status, 500);
  assert.equal(normalized.code, "INTERNAL_ERROR");
  assert.equal(normalized.message, "Something went wrong. Please try again.");
  assert.equal(normalized.correlationId, "corr-3");
});

test("normalizeError supports status/statusCode from unknown objects", () => {
  const normalized = normalizeError(
    {
      statusCode: "422",
      message: "Invalid payload.",
      details: { field: "email" }
    },
    { correlationId: "corr-4" }
  );
  assert.equal(normalized.status, 400);
  assert.equal(normalized.code, "VALIDATION_ERROR");
  assert.equal(normalized.message, "Invalid payload.");
  assert.deepEqual(normalized.details, { field: "email" });
  assert.equal(normalized.correlationId, "corr-4");
});
