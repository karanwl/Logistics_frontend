"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ErrorFallback({ title, message, errorId, onRetry }) {
    return (_jsx("div", { className: "shell", children: _jsx("section", { className: "card mx-auto max-w-2xl", children: _jsxs("div", { className: "space-y-3", children: [_jsx("h1", { className: "text-2xl font-semibold", children: title }), _jsx("p", { className: "text-sm text-steel-600", children: message }), _jsxs("p", { className: "text-xs text-steel-500", children: ["Error ID: ", _jsx("span", { className: "font-mono text-steel-600", children: errorId })] }), _jsx("button", { className: "btn btn-primary", onClick: onRetry, type: "button", children: "Try again" })] }) }) }));
}
