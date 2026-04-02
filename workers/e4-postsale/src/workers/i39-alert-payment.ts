/**
 * I39 — alert:payment
 *
 * AlertNeuron (Plan FAZA 8g §IX I39, swimlane: social-action)
 * Queue: alert:payment
 * Trigger: B11 overdue detect, B12 overdue escalate, payment reconciliation failures
 *
 * Procesorul loghează alertele de plată în audit și incrementează metrica
 * e4AlertsDispatchedTotal pentru monitorizare Prometheus.
 */
export { alertPaymentProcessor } from "./i-alert-workers.js";
export type { AlertJobData, AlertResult } from "./i-alert-workers.js";
