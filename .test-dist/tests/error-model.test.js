import test from "node:test";
import assert from "node:assert/strict";
import { isApiErrorCode, statusToCode } from "../lib/errors/model.js";
test("isApiErrorCode accepts known values and rejects unknown values", () => {
    assert.equal(isApiErrorCode("NOT_FOUND"), true);
    assert.equal(isApiErrorCode("SOMETHING_ELSE"), false);
    assert.equal(isApiErrorCode(undefined), false);
});
test("statusToCode defaults unknown status codes to INTERNAL_ERROR", () => {
    assert.equal(statusToCode(500), "INTERNAL_ERROR");
    assert.equal(statusToCode(404), "NOT_FOUND");
});
