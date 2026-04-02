/**
 * I41 — alert:credit
 *
 * AlertNeuron (Plan FAZA 8g §IX I41, swimlane: social-action)
 * Queue: alert:credit
 * Trigger: C17/C18 credit scoring anomalies, credit limit HITL approvals (K48/K49)
 *
 * Procesorul loghează alertele de credit în audit și incrementează metrica
 * e4AlertsDispatchedTotal pentru monitorizare Prometheus.
 */
export { alertCreditProcessor } from "./i-alert-workers.js";
export type { AlertJobData, AlertResult } from "./i-alert-workers.js";
