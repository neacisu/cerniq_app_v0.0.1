/**
 * I40 — alert:delivery
 *
 * AlertNeuron (Plan FAZA 8g §IX I40, swimlane: social-action)
 * Queue: alert:delivery
 * Trigger: E24 DELIVERY_FAILED events, H37-H38 return processing events
 *
 * Procesorul loghează alertele de livrare în audit și incrementează metrica
 * e4AlertsDispatchedTotal pentru monitorizare Prometheus.
 */
export { alertDeliveryProcessor } from "./i-alert-workers.js";
export type { AlertJobData, AlertResult } from "./i-alert-workers.js";
