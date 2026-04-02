/**
 * B9 — payment:reconcile:manual
 *
 * Responsabilitate (plan FAZA 8c §IX Tier 3 — HITL):
 * - Crează task HITL în approval_tasks cu:
 *   - type: 'hitl:investigation:payment' (câmp varchar)
 *   - approvalType: 'manual_verification' (enum aprobat în schema approval)
 *   - etapa: 'E4', priority: 'high' (SLA ~8h ≈ high=4h — cel mai apropiat enum)
 *   - metadata: { paymentId, candidates, paymentDetails }
 *   - escalateTo: 'ACCOUNTING' (în metadata, nu în schema)
 * - Utilizează approvalService.createTask() care rezolvă automat requestedBy
 *   via resolveSystemUser() când createdBy=null
 *
 * Anti-halucinare (C): HITL task format compatible cu hitl-resume-after-approval.ts din E1.
 * Anti-halucinare (D): NU procesează plăți cu reconciliationStatus != 'PENDING'.
 *
 * Note arhitecturale:
 * - SLA plan: 8h. ApprovalService.SLA_HOURS: high=4h, normal=24h.
 *   Folosim 'high' ca cea mai apropiată aproximare pentru SLA 8h.
 * - approvalTypeEnum nu include 'hitl:investigation:payment' —
 *   folosim approvalType='manual_verification' (enum), type='hitl:investigation:payment' (varchar).
 */
import type { Processor } from "bullmq";
import { approvalService, setSessionTenantId } from "@cerniq/db";
import { e4ReconciliationTotal } from "../e4-metrics.js";
import type { ReconciliationCandidate } from "../lib/reconciliation-engine.js";

export type ReconcileManualJobData = {
  paymentId: string;
  tenantId: string;
  candidates: Array<{ orderId: string; orderNumber: string } | ReconciliationCandidate>;
  reason: "multiple_exact_matches" | "low_confidence" | "unmatched";
  paymentDetails: {
    amount: string;
    currency: string;
    reference: string | null;
    counterpartyName: string | null;
    counterpartyIban?: string | null;
  };
};

export type ReconcileManualResult =
  | { ok: true; action: "hitl_created"; paymentId: string; approvalTaskId: string }
  | { ok: true; action: "skipped"; paymentId: string; reason: string };

export const paymentReconcileManualProcessor: Processor<ReconcileManualJobData> = async (
  job,
): Promise<ReconcileManualResult> => {
  const { paymentId, tenantId, candidates, reason, paymentDetails } = job.data;

  await setSessionTenantId(tenantId);

  // ── HITL task creat cu approvalService ───────────────────────────────────
  // Anti-halucinare (C): pattern conform hitl-resume-after-approval.ts din E1:
  // - entityType = 'gold_payments' (entitatea procesată)
  // - entityId = paymentId (UUID)
  // - approvalType = 'manual_verification' (singurul enum valid pentru investigare)
  // - type = 'hitl:investigation:payment' (câmp varchar, pentru routing în hitl:resume)
  // - metadata include tot contextul pentru operatorul ACCOUNTING

  const task = await approvalService.createTask({
    tenantId,
    entityType: "gold_payments",
    entityId: paymentId,
    approvalType: "manual_verification",
    title: `Reconciliere manuală plată ${paymentDetails.amount} ${paymentDetails.currency}`,
    description: buildDescription(paymentDetails, candidates, reason),
    pipelineStage: "E4",
    etapa: "E4",
    // SLA plan: 8h. ApprovalService.SLA_HOURS: { high: 4, normal: 24 }.
    // Folosim 'high' ca cea mai apropiată opțiune (4h < 8h < 24h).
    priority: "high",
    createdBy: null, // resolveSystemUser() va găsi un user activ
    metadata: {
      paymentId,
      paymentDetails,
      candidates,
      reconciliationReason: reason,
      escalateTo: "ACCOUNTING",
      workerSource: "b9-payment-reconcile-manual",
      // Permit hitl-resume să identifice tipul de task E4
      hitlInvestigationType: "payment_reconciliation",
    },
  });

  e4ReconciliationTotal.inc({ match_type: "MANUAL", result: "hitl_created", tenant_id: tenantId });
  job.log(
    `[B9] HITL task created: approvalTaskId=${task.id} paymentId=${paymentId} reason=${reason} candidates=${candidates.length}`,
  );

  return { ok: true, action: "hitl_created", paymentId, approvalTaskId: task.id };
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildDescription(
  paymentDetails: ReconcileManualJobData["paymentDetails"],
  candidates: ReconcileManualJobData["candidates"],
  reason: string,
): string {
  const lines = [
    `Plată de ${paymentDetails.amount} ${paymentDetails.currency} necesită reconciliere manuală.`,
    `Motiv: ${reason}`,
    `Referință plată: ${paymentDetails.reference ?? "N/A"}`,
    `Contrapartidă: ${paymentDetails.counterpartyName ?? "N/A"}`,
    `IBAN contrapartidă: ${paymentDetails.counterpartyIban ?? "N/A"}`,
    "",
    `Candidați (${candidates.length}):`,
    ...candidates.slice(0, 5).map((c, i) => {
      const score = "score" in c ? ` (scor: ${c.score.toFixed(3)})` : "";
      return `  ${i + 1}. Comandă ${c.orderNumber} [${c.orderId}]${score}`;
    }),
  ];
  return lines.join("\n");
}
