/**
 * K51 — hitl:investigation:payment
 *
 * HumanNeuron (Plan FAZA 8g §IX K51, swimlane: human-oversight-e4)
 * Queue: hitl:investigation:payment
 * Trigger: B9 payment reconcile manual — Tier 3 no match (score < 60)
 * Approver: ACCOUNTING
 * SLA: 8h (priority="high" cu slaHours:8 în metadata — approvalService are 4h/24h/72h nativ)
 *
 * Creează un task de investigare HITL pentru plăți nereconciliate automat.
 * Tier 3 = matching score < 60 — necesită investigare manuală contabilitate.
 * SLA 8h se trackează manual via metadata.slaHours (approvalService "high" = 4h intern,
 * dar K53 verifică dueAt calculat din metadata.slaHours).
 */
export { hitlPaymentInvestigationProcessor } from "./k-hitl-workers.js";
export type {
  HitlPaymentInvestigationJobData,
  HitlPaymentInvestigationResult,
} from "./k-hitl-workers.js";
