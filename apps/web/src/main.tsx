import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { initDeferredAnalytics } from "./lib/analytics-guard.js";
import { reportClientError } from "./lib/report-client-error.js";
import "./index.css";

initDeferredAnalytics();

globalThis.addEventListener("error", (ev) => {
  if (!ev.error && !ev.message) return;
  const err = ev.error;
  void reportClientError({
    message: err instanceof Error ? err.message : ev.message || "window.error",
    name: err instanceof Error ? err.name : "Error",
    stack: err instanceof Error ? err.stack : undefined,
    url: ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : globalThis.location.href,
  });
});

globalThis.addEventListener("unhandledrejection", (ev) => {
  const reason = ev.reason;
  void reportClientError({
    message: reason instanceof Error ? reason.message : String(reason),
    name: reason instanceof Error ? reason.name : "UnhandledRejection",
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
