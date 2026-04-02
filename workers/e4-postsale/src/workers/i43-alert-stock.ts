/**
 * I43 — alert:stock
 *
 * AlertNeuron (Plan FAZA 8g §IX I43, swimlane: social-action)
 * Queue: alert:stock
 * Trigger: F31 stock:low:alert events (stockCount < lowStockThreshold per produs)
 *
 * Procesorul loghează alertele de stoc scăzut în audit și incrementează metrica
 * e4AlertsDispatchedTotal pentru monitorizare Prometheus.
 */
export { alertStockProcessor } from "./i-alert-workers.js";
export type { AlertJobData, AlertResult } from "./i-alert-workers.js";
