/**
 * K49 — hitl:approval:credit-limit
 *
 * HumanNeuron (Plan FAZA 8g §IX K49, swimlane: human-oversight-e4)
 * Queue: hitl:approval:credit-limit
 * Trigger: C18 calculează limită > 50.000 RON (risc ridicat)
 * Approver: CFO
 * SLA: 4h (priority="high" în approvalService)
 *
 * Creează un approval task HITL pentru validarea manuală a limitelor de credit mari.
 * Limita > 50K RON necesită aprobare CFO pentru conformitate și control financiar.
 */
export { hitlCreditLimitProcessor } from "./k-hitl-workers.js";
export type { HitlCreditLimitJobData, HitlCreditLimitResult } from "./k-hitl-workers.js";
