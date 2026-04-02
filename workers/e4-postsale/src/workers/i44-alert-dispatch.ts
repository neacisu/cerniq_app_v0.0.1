/**
 * I44 — alert:dispatch
 *
 * AlertNeuron (Plan FAZA 8g §IX I44, swimlane: social-action)
 * Queue: alert:dispatch
 * Trigger: E22 AWB create failures, logistics dispatch errors, expediere blocată
 *
 * Procesorul loghează alertele de expediere în audit și incrementează metrica
 * e4AlertsDispatchedTotal pentru monitorizare Prometheus.
 */
export { alertDispatchProcessor } from "./i-alert-workers.js";
export type { AlertJobData, AlertResult } from "./i-alert-workers.js";
