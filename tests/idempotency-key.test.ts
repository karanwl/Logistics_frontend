import test from "node:test";
import assert from "node:assert/strict";
import { buildIdempotencyKey } from "../lib/api/idempotency.js";

test("buildIdempotencyKey is stable for equivalent object key order", () => {
  const a = { plan_date: "2026-02-18", fleet: { trucks: 2, vans: 1 } };
  const b = { fleet: { vans: 1, trucks: 2 }, plan_date: "2026-02-18" };

  const keyA = buildIdempotencyKey("plan-publish", a);
  const keyB = buildIdempotencyKey("plan-publish", b);

  assert.equal(keyA, keyB);
});

test("buildIdempotencyKey changes when payload changes", () => {
  const keyA = buildIdempotencyKey("plan-publish", { plan_date: "2026-02-18", routes: [1, 2] });
  const keyB = buildIdempotencyKey("plan-publish", { plan_date: "2026-02-18", routes: [1, 2, 3] });
  assert.notEqual(keyA, keyB);
});
