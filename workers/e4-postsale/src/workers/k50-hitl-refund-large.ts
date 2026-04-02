/**
 * K50 — hitl:approval:refund-large
 *
 * HumanNeuron (Plan FAZA 8g §IX K50, swimlane: human-oversight-e4)
 * Queue: hitl:approval:refund-large
 * Trigger: refund > 1.000 RON (REFUND_HITL_THRESHOLD_RON)
 * Approver: FINANCE_MANAGER
 * SLA: 4h (priority="high" în approvalService)
 *
 * Creează un approval task HITL pentru validarea manuală a rambursărilor mari.
 * Toate rambursările > 1K RON necesită aprobare manuală pentru control financiar.
 */
export { hitlRefundLargeProcessor, REFUND_HITL_THRESHOLD_RON } from "./k-hitl-workers.js";
export type { HitlRefundLargeJobData, HitlRefundLargeResult } from "./k-hitl-workers.js";
