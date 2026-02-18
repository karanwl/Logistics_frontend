import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorBanner } from "../components/shared/ErrorBanner.js";

test("error banner shows message and correlation id copy control", () => {
  const html = renderToStaticMarkup(
    React.createElement(ErrorBanner, {
      error: { message: "Save failed.", correlationId: "corr-123" }
    })
  );

  assert.match(html, /Save failed\./);
  assert.match(html, /corr-123/);
  assert.match(html, /Copy ID/);
});
