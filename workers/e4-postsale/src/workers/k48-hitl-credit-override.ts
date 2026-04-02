/**
 * K48 — hitl:approval:credit-override
 *
 * HumanNeuron (Plan FAZA 8g §IX K48, swimlane: human-oversight-e4)
 * Queue: hitl:approval:credit-override
 * Trigger: creditUsed > creditLimit (credit depășit)
 * Approver: SALES_MANAGER / CFO
 * SLA: 4h (priority="high" în approvalService)
 *
 * Creează un approval task HITL pentru validarea manuală a comenzilor cu credit depășit.
 * Escalation chain: SALES_MANAGER → CFO (via K53 dacă SLA breached).
 */
export { hitlCreditOverrideProcessor } from "./k-hitl-workers.js";
export type { HitlCreditOverrideJobData, HitlCreditOverrideResult } from "./k-hitl-workers.js";
