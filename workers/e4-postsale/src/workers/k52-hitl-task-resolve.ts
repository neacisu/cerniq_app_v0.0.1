/**
 * K52 — hitl:task:resolve
 *
 * HumanNeuron (Plan FAZA 8g §IX K52, swimlane: human-oversight-e4)
 * Queue: hitl:task:resolve
 * Trigger: UI action — utilizatorul (SALES_MANAGER/CFO/ACCOUNTING) rezolvă manual un task
 * SLA: N/A (rezolvare manuală)
 *
 * Aplică decizia (approve/reject) pe un task HITL existent via approvalService.decide.
 * Loghează decizia în audit cu actorId = resolvedBy pentru trasabilitate completă.
 */
export { hitlTaskResolveProcessor } from "./k-hitl-workers.js";
export type { HitlTaskResolveJobData, HitlTaskResolveResult } from "./k-hitl-workers.js";
