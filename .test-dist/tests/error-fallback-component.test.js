import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorFallback } from "../components/shared/ErrorFallback.js";
test("error fallback renders message, try-again action, and error id", () => {
    const html = renderToStaticMarkup(React.createElement(ErrorFallback, {
        title: "Something broke",
        message: "Please retry this operation.",
        errorId: "corr-ui-123",
        onRetry: () => undefined
    }));
    assert.match(html, /Something broke/);
    assert.match(html, /Please retry this operation\./);
    assert.match(html, /Try again/);
    assert.match(html, /corr-ui-123/);
});
