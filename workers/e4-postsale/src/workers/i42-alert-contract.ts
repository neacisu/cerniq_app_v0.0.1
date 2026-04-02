/**
 * I42 — alert:contract
 *
 * AlertNeuron (Plan FAZA 8g §IX I42, swimlane: social-action)
 * Queue: alert:contract
 * Trigger: G35 ContractExpirySoon events (Plan Alert L2166 — expires <24h, status SENT_DOCUSIGN)
 *
 * Procesorul loghează alertele de contract în audit și incrementează metrica
 * e4AlertsDispatchedTotal pentru monitorizare Prometheus.
 */
export { alertContractProcessor } from "./i-alert-workers.js";
export type { AlertJobData, AlertResult } from "./i-alert-workers.js";
