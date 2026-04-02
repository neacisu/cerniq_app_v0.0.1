/**
 * K53 — hitl:escalation:overdue
 *
 * HumanNeuron (Plan FAZA 8g §IX K53, swimlane: human-oversight-e4)
 * Queue: hitl:escalation:overdue
 * Cron: rulat frecvent (ex: fiecare 5 minute) — detectează SLA breach-uri
 * Trigger: task HITL cu dueAt < NOW() (SLA breached)
 * Severity: CRITICAL
 *
 * Logica duală:
 * 1. WARNING (80% SLA consumat): setează slaWarningSent=true în metadata
 * 2. BREACH (100% SLA): escalare via approvalService.escalate
 *    → Chain escalation: ACCOUNTING → FINANCE_MANAGER → CFO
 *
 * Metrică: e4HitlTasksCreatedTotal.inc({ task_type: "escalation_overdue", priority: "critical" })
 */
export { hitlEscalationOverdueProcessor } from "./k-hitl-workers.js";
export type {
  HitlEscalationOverdueJobData,
  HitlEscalationOverdueResult,
} from "./k-hitl-workers.js";
