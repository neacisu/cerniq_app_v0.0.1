/**
 * k-hitl-workers.ts — K48-K53 HumanNeuron HITL E4
 *
 * Responsabilitate (Plan FAZA 8g §IX K48-K53, L2110-2117):
 * Workerul HITL creează approval tasks pentru cazuri care depășesc automationul.
 *
 * MATRICE HITL E4 (Plan L2110-2117):
 * - K48: credit-override → trigger=credit depășit, approver=SALES_MANAGER/CFO, SLA=4h
 * - K49: credit-limit    → trigger=C18 limit >50K, approver=CFO, SLA=4h
 * - K50: refund-large    → trigger=refund >1K RON, approver=FINANCE_MANAGER, SLA=4h
 * - K51: payment-investigation → trigger=B9 Tier 3 no match, approver=ACCOUNTING, SLA=8h
 * - K52: task-resolve    → trigger=UI action (manual resolve), SLA=—
 * - K53: escalation-overdue → trigger=SLA breach → escalateTo chain, severity=CRITICAL
 *
 * Pattern: identic cu B12/C18 din E4 (approvalService.createTask)
 * Pattern escalation: identic cu hitl-escalation.ts din E1 (approvalService.escalate)
 *
 * ANTI-HALUCINARE:
 * - SLA-uri EXACTE din plan: "high"=4h, "critical"=1h (din SLA_HOURS în approval-service.ts)
 * - K51 SLA=8h → priority="normal" (24h) nu este corect — K51 are SLA 8h
 *   → In approval-service, "high"=4h, "normal"=24h, "low"=72h
 *   → 8h nu există ca priority → folosim "high" (4h) cu override în metadata
 */
import type { Processor } from "bullmq";
import { createServiceLogger } from "@cerniq/observability";
import {
  db,
  goldAuditLogsEtapa4,
  approvalService,
  approvalTasks,
  setSessionTenantId,
  sql,
  eq,
  and,
} from "@cerniq/db";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";
import { e4HitlTasksCreatedTotal } from "../e4-metrics.js";

const kHitlLog = createServiceLogger("e4-k-hitl-workers", { etapa: "e4" });

// ────────────────────────────────────────────────────────────────────────────
// K48 — hitl:approval:credit-override
// Trigger: credit depășit (ordinele cu credit utilizat > limită)
// Approver: SALES_MANAGER / CFO, SLA: 4h
// ────────────────────────────────────────────────────────────────────────────

export type HitlCreditOverrideJobData = {
  tenantId: string;
  clientId: string;
  orderId: string;
  orderNumber: string;
  creditUsed: number;
  creditLimit: number;
  currency: string;
  correlationId?: string;
};

export type HitlCreditOverrideResult = {
  ok: true;
  approvalTaskId: string;
  taskType: "credit_override";
};

export const hitlCreditOverrideProcessor: Processor<HitlCreditOverrideJobData> = async (
  job,
): Promise<HitlCreditOverrideResult> => {
  return withCognitiveSpan(
    "e4:hitl:credit:override",
    async (_span) => {
      const { tenantId, clientId, orderId, orderNumber, creditUsed, creditLimit, currency } =
        job.data;
      await setSessionTenantId(tenantId);

      const overLimit = creditUsed - creditLimit;

      const task = await approvalService.createTask({
        tenantId,
        entityType: "gold_orders",
        entityId: orderId,
        approvalType: "manual_verification",
        title: `Override credit: comandă ${orderNumber} depășește limita cu ${overLimit.toLocaleString("ro-RO")} ${currency}`,
        description: [
          `Comanda ${orderNumber} depășește limita de credit a clientului.`,
          `Credit utilizat: ${creditUsed.toLocaleString("ro-RO")} ${currency}`,
          `Limita aprobată: ${creditLimit.toLocaleString("ro-RO")} ${currency}`,
          `Depășire: ${overLimit.toLocaleString("ro-RO")} ${currency}`,
          `Necesită aprobare SALES_MANAGER sau CFO (SLA: 4 ore).`,
        ].join("\n"),
        pipelineStage: "E4",
        etapa: "E4",
        priority: "high",
        createdBy: null,
        metadata: {
          clientId,
          orderId,
          orderNumber,
          creditUsed,
          creditLimit,
          overLimit,
          currency,
          hitlInvestigationType: "credit_override",
          approverRole: "SALES_MANAGER/CFO",
          slaHours: 4,
          workerSource: "k48-hitl-credit-override",
        },
      });

      e4HitlTasksCreatedTotal.inc({
        tenant_id: tenantId,
        task_type: "credit_override",
        priority: "high",
      });
      job.log(
        `[K48] HITL task created: taskId=${task.id} orderId=${orderId} overLimit=${overLimit} ${currency}`,
      );

      return { ok: true, approvalTaskId: task.id, taskType: "credit_override" };
    },
    { tenantId: job.data.tenantId },
  );
};

// ────────────────────────────────────────────────────────────────────────────
// K49 — hitl:approval:credit-limit
// Trigger: C18 calculează limită >50K RON — necesită confirmare CFO
// (Pattern identic cu c18 — K49 este re-trigger explicit din UI sau alte workeruri)
// Approver: CFO, SLA: 4h
// ────────────────────────────────────────────────────────────────────────────

export type HitlCreditLimitJobData = {
  tenantId: string;
  clientId: string;
  profileId: string;
  creditLimit: number;
  riskTier: string;
  correlationId?: string;
};

export type HitlCreditLimitResult = {
  ok: true;
  approvalTaskId: string;
  taskType: "credit_limit";
};

export const hitlCreditLimitProcessor: Processor<HitlCreditLimitJobData> = async (
  job,
): Promise<HitlCreditLimitResult> => {
  return withCognitiveSpan(
    "e4:hitl:credit:limit",
    async (_span) => {
      const { tenantId, clientId, profileId, creditLimit, riskTier } = job.data;
      await setSessionTenantId(tenantId);

      const task = await approvalService.createTask({
        tenantId,
        entityType: "gold_credit_profiles",
        entityId: profileId,
        approvalType: "manual_verification",
        title: `Aprobare limită credit ${creditLimit.toLocaleString("ro-RO")} RON — client ${clientId}`,
        description: [
          `Profilul de credit a primit risk tier ${riskTier}.`,
          `Limita calculată (${creditLimit.toLocaleString("ro-RO")} RON) depășește pragul de 50.000 RON.`,
          `Necesită aprobare CFO înainte de activare (SLA: 4 ore).`,
          `Profile ID: ${profileId}`,
          `Client ID: ${clientId}`,
        ].join("\n"),
        pipelineStage: "E4",
        etapa: "E4",
        priority: "high",
        createdBy: null,
        metadata: {
          clientId,
          profileId,
          creditLimit,
          riskTier,
          hitlInvestigationType: "credit_limit_approval",
          approverRole: "CFO",
          slaHours: 4,
          workerSource: "k49-hitl-credit-limit",
        },
      });

      e4HitlTasksCreatedTotal.inc({
        tenant_id: tenantId,
        task_type: "credit_limit",
        priority: "high",
      });
      job.log(
        `[K49] HITL task created: taskId=${task.id} clientId=${clientId} creditLimit=${creditLimit} RON`,
      );

      return { ok: true, approvalTaskId: task.id, taskType: "credit_limit" };
    },
    { tenantId: job.data.tenantId },
  );
};

// ────────────────────────────────────────────────────────────────────────────
// K50 — hitl:approval:refund-large
// Trigger: refund >1.000 RON din orice sursă (Revolut, manual)
// Approver: FINANCE_MANAGER, SLA: 4h
// ────────────────────────────────────────────────────────────────────────────

export type HitlRefundLargeJobData = {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  refundAmount: number;
  currency: string;
  refundReason?: string;
  initiatedBy?: string;
  correlationId?: string;
};

export type HitlRefundLargeResult = {
  ok: true;
  approvalTaskId: string;
  taskType: "refund_large";
};

/** Prag rambursare HITL — Plan L2113 */
export const REFUND_HITL_THRESHOLD_RON = 1_000;

export const hitlRefundLargeProcessor: Processor<HitlRefundLargeJobData> = async (
  job,
): Promise<HitlRefundLargeResult> => {
  return withCognitiveSpan(
    "e4:hitl:refund:large",
    async (_span) => {
      const { tenantId, orderId, orderNumber, refundAmount, currency, refundReason, initiatedBy } =
        job.data;
      await setSessionTenantId(tenantId);

      const task = await approvalService.createTask({
        tenantId,
        entityType: "gold_orders",
        entityId: orderId,
        approvalType: "manual_verification",
        title: `Aprobare rambursare ${refundAmount.toLocaleString("ro-RO")} ${currency} — comandă ${orderNumber}`,
        description: [
          `Solicitare rambursare depășește pragul de 1.000 RON.`,
          `Sumă rambursare: ${refundAmount.toLocaleString("ro-RO")} ${currency}`,
          `Comandă: ${orderNumber}`,
          `Motiv: ${refundReason ?? "N/A"}`,
          `Inițiat de: ${initiatedBy ?? "SYSTEM"}`,
          `Necesită aprobare FINANCE_MANAGER (SLA: 4 ore).`,
        ].join("\n"),
        pipelineStage: "E4",
        etapa: "E4",
        priority: "high",
        createdBy: null,
        metadata: {
          orderId,
          orderNumber,
          refundAmount,
          currency,
          refundReason,
          initiatedBy,
          hitlThreshold: REFUND_HITL_THRESHOLD_RON,
          hitlInvestigationType: "refund_large",
          approverRole: "FINANCE_MANAGER",
          slaHours: 4,
          workerSource: "k50-hitl-refund-large",
        },
      });

      e4HitlTasksCreatedTotal.inc({
        tenant_id: tenantId,
        task_type: "refund_large",
        priority: "high",
      });
      job.log(
        `[K50] HITL task created: taskId=${task.id} orderId=${orderId} refundAmount=${refundAmount} ${currency}`,
      );

      return { ok: true, approvalTaskId: task.id, taskType: "refund_large" };
    },
    { tenantId: job.data.tenantId },
  );
};

// ────────────────────────────────────────────────────────────────────────────
// K51 — hitl:investigation:payment
// Trigger: B9 Tier 3 no match (reconciliere manuală)
// Approver: ACCOUNTING, SLA: 8h
// NOTE: approval-service SLA_HOURS: high=4h, normal=24h. 8h nu există.
// → Folosim "high" (4h) ca prioritate proxy, cu slaHours=8 în metadata
//   pentru tracking manual de SLA. Această decizie este documentată în metadata.
// ────────────────────────────────────────────────────────────────────────────

export type HitlPaymentInvestigationJobData = {
  tenantId: string;
  paymentId: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  currency: string;
  matchTier: "TIER_3" | "NO_MATCH";
  reconciledBy?: string;
  correlationId?: string;
};

export type HitlPaymentInvestigationResult = {
  ok: true;
  approvalTaskId: string;
  taskType: "payment_investigation";
};

export const hitlPaymentInvestigationProcessor: Processor<HitlPaymentInvestigationJobData> = async (
  job,
): Promise<HitlPaymentInvestigationResult> => {
  return withCognitiveSpan(
    "e4:hitl:payment:investigation",
    async (_span) => {
      const { tenantId, paymentId, orderId, orderNumber, amount, currency, matchTier } = job.data;
      await setSessionTenantId(tenantId);

      const task = await approvalService.createTask({
        tenantId,
        entityType: "gold_revolut_payments",
        entityId: paymentId,
        approvalType: "manual_verification",
        title: `Investigare plată ${matchTier}: ${amount.toLocaleString("ro-RO")} ${currency} — comandă ${orderNumber ?? "N/A"}`,
        description: [
          `Plata nu a putut fi reconciliată automat (${matchTier}).`,
          `Sumă: ${amount.toLocaleString("ro-RO")} ${currency}`,
          `Payment ID: ${paymentId}`,
          `Comandă: ${orderNumber ?? "N/A"}`,
          `Necesită investigare ACCOUNTING (SLA: 8 ore).`,
        ].join("\n"),
        pipelineStage: "E4",
        etapa: "E4",
        priority: "high",
        createdBy: null,
        metadata: {
          paymentId,
          orderId,
          orderNumber,
          amount,
          currency,
          matchTier,
          hitlInvestigationType: "payment_investigation",
          approverRole: "ACCOUNTING",
          slaHours: 8,
          slaNote: "SLA 8h; approval-service priority=high (4h) folosit ca proxy",
          workerSource: "k51-hitl-payment-investigation",
        },
      });

      e4HitlTasksCreatedTotal.inc({
        tenant_id: tenantId,
        task_type: "payment_investigation",
        priority: "high",
      });
      job.log(
        `[K51] HITL task created: taskId=${task.id} paymentId=${paymentId} matchTier=${matchTier}`,
      );

      return { ok: true, approvalTaskId: task.id, taskType: "payment_investigation" };
    },
    { tenantId: job.data.tenantId },
  );
};

// ────────────────────────────────────────────────────────────────────────────
// K52 — hitl:task:resolve
// Trigger: UI action (manual resolve) — utilizatorul rezolvă manual un task
// SLA: — (fără SLA, rezolvare imediată)
// ────────────────────────────────────────────────────────────────────────────

export type HitlTaskResolveJobData = {
  tenantId: string;
  approvalTaskId: string;
  resolvedBy: string;
  decision: "approve" | "reject" | "skip";
  reason?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
};

export type HitlTaskResolveResult = {
  ok: true;
  approvalTaskId: string;
  decision: string;
  taskType: "task_resolve";
};

export const hitlTaskResolveProcessor: Processor<HitlTaskResolveJobData> = async (
  job,
): Promise<HitlTaskResolveResult> => {
  return withCognitiveSpan(
    "e4:hitl:task:resolve",
    async (_span) => {
      const { tenantId, approvalTaskId, resolvedBy, decision, reason } = job.data;
      await setSessionTenantId(tenantId);

      // Decide pe task-ul existent
      await approvalService.decide({
        tenantId,
        taskId: approvalTaskId,
        actorId: resolvedBy,
        decision,
        reason,
        metadata: job.data.metadata,
      });

      // Audit log rezolvare HITL
      await db.insert(goldAuditLogsEtapa4).values({
        id: uuidv4(),
        tenantId,
        actorId: resolvedBy,
        actorType: "USER",
        eventType: "HITL_TASK_RESOLVED",
        entityType: "approval_tasks",
        entityId: approvalTaskId,
        newValues: {
          approvalTaskId,
          resolvedBy,
          decision,
          reason,
          workerSource: "k52-hitl-task-resolve",
        },
        prevHash: null,
        createdAt: new Date(),
      });

      e4HitlTasksCreatedTotal.inc({
        tenant_id: tenantId,
        task_type: "task_resolve",
        priority: "normal",
      });
      job.log(
        `[K52] HITL task resolved: taskId=${approvalTaskId} decision=${decision} resolvedBy=${resolvedBy}`,
      );

      return { ok: true, approvalTaskId, decision, taskType: "task_resolve" };
    },
    { tenantId: job.data.tenantId },
  );
};

// ────────────────────────────────────────────────────────────────────────────
// K53 — hitl:escalation:overdue
// Trigger: SLA breach → escalateTo chain, severity=CRITICAL
// Pattern: identic cu hitl-escalation.ts din E1 (approvalService.escalate)
// ────────────────────────────────────────────────────────────────────────────

export type HitlEscalationOverdueJobData = {
  tenantId: string;
  correlationId?: string;
};

export type HitlEscalationOverdueResult = {
  ok: true;
  tenantId: string;
  warningCount: number;
  escalatedCount: number;
};

export const hitlEscalationOverdueProcessor: Processor<HitlEscalationOverdueJobData> = async (
  job,
): Promise<HitlEscalationOverdueResult> => {
  return withCognitiveSpan(
    "e4:hitl:escalation:overdue",
    async (_span) => {
      const { tenantId } = job.data;
      await setSessionTenantId(tenantId);

      const now = new Date();

      // ── Warning la 80% din fereastra SLA ───────────────────────────────────
      const warningCandidates = await db.query.approvalTasks.findMany({
        where: sql`${approvalTasks.tenantId} = ${tenantId}
          AND ${approvalTasks.status} IN ('pending', 'assigned', 'escalated')
          AND ${approvalTasks.pipelineStage} = 'E4'
          AND ${approvalTasks.createdAt} IS NOT NULL
          AND ${approvalTasks.dueAt} IS NOT NULL
          AND NOW() >= (${approvalTasks.createdAt} + ((${approvalTasks.dueAt} - ${approvalTasks.createdAt}) * 0.8))
          AND NOW() < ${approvalTasks.dueAt}
          AND COALESCE((${approvalTasks.metadata} ->> 'slaWarningSent')::boolean, false) = false`,
        limit: 100,
        orderBy: [approvalTasks.dueAt],
      });

      for (const task of warningCandidates) {
        await db
          .update(approvalTasks)
          .set({
            metadata: sql`jsonb_set(
              jsonb_set(COALESCE(${approvalTasks.metadata}, '{}'::jsonb),
                '{slaWarningSent}', 'true'::jsonb),
              '{slaWarningAt}', ${JSON.stringify(now.toISOString())}::jsonb
            )`,
            updatedAt: now,
          })
          .where(and(eq(approvalTasks.tenantId, tenantId), eq(approvalTasks.id, task.id)));
      }

      // ── Escalare task-uri la SLA breach ────────────────────────────────────
      const breached = await db.query.approvalTasks.findMany({
        where: sql`${approvalTasks.tenantId} = ${tenantId}
          AND ${approvalTasks.status} IN ('pending', 'assigned', 'escalated')
          AND ${approvalTasks.pipelineStage} = 'E4'
          AND ${approvalTasks.dueAt} < ${now}`,
        limit: 100,
        orderBy: [approvalTasks.dueAt],
      });

      const escalatedIds: string[] = [];

      for (const task of breached) {
        try {
          const escalated = await approvalService.escalate({
            tenantId,
            taskId: task.id,
            reason: "SLA breach — E4 escalation overdue (K53)",
          });
          escalatedIds.push(escalated.id);

          // Audit log escalare CRITICAL
          await db.insert(goldAuditLogsEtapa4).values({
            id: uuidv4(),
            tenantId,
            actorId: null,
            actorType: "CRON",
            eventType: "HITL_ESCALATION_SLA_BREACH",
            entityType: "approval_tasks",
            entityId: task.id,
            newValues: {
              taskId: task.id,
              severity: "CRITICAL",
              escalatedTo: escalated.id,
              reason: "SLA breach E4",
              workerSource: "k53-hitl-escalation-overdue",
            },
            prevHash: null,
            createdAt: new Date(),
          });
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          kHitlLog.warn({ err: e, taskId: task.id, tenantId }, "k53_hitl_escalation_task_failed");
          job.log(`[K53] Eroare escalare task ${task.id}: ${String(err)}`);
        }
      }

      if (escalatedIds.length > 0) {
        e4HitlTasksCreatedTotal.inc(
          { tenant_id: tenantId, task_type: "escalation_overdue", priority: "critical" },
          escalatedIds.length,
        );
      }

      job.log(
        `[K53] Escalare SLA breach: tenant=${tenantId} warnings=${warningCandidates.length} escalated=${escalatedIds.length}`,
      );

      return {
        ok: true,
        tenantId,
        warningCount: warningCandidates.length,
        escalatedCount: escalatedIds.length,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
