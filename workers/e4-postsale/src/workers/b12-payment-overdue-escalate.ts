/**
 * B12 — payment:overdue:escalate
 *
 * Responsabilitate (plan FAZA 8c §IX B12):
 * Alerte graduated bazate pe numărul de zile restante:
 * - 1-7 zile  → severity='WARNING'  → email warning
 * - 7-14 zile → severity='REMINDER' → WA reminder
 * - 14+ zile  → severity='CRITICAL' → HITL accounting task
 *
 * INSERT gold_audit_logs_etapa4 cu eventType='PAYMENT_OVERDUE_ESCALATED'
 *
 * Anti-halucinare: cozile de email/WA sunt din QUEUES registry existent.
 * CRITICAL HITL folosește approvalService.createTask() identic cu B9.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldAuditLogsEtapa4, approvalService } from "@cerniq/db";
import { v4 as uuidv4 } from "uuid";
import { e4OverdueOrdersEscalatedTotal } from "../e4-metrics.js";

export type OverdueEscalateJobData = {
  orderId: string;
  tenantId: string;
  orderNumber: string;
  overdueByDays: number;
  totalAmount: string;
  amountPaid: string;
  currency: string;
  paymentDueAt: string | null;
};

export type OverdueEscalateResult = {
  ok: true;
  orderId: string;
  severity: "WARNING" | "REMINDER" | "CRITICAL";
  action: string;
};

/** Thresholds zile restante — plan §IX B12 */
const OVERDUE_CRITICAL_DAYS = 14;
const OVERDUE_REMINDER_DAYS = 7;

function resolveSeverity(overdueByDays: number): "WARNING" | "REMINDER" | "CRITICAL" {
  if (overdueByDays >= OVERDUE_CRITICAL_DAYS) return "CRITICAL";
  if (overdueByDays >= OVERDUE_REMINDER_DAYS) return "REMINDER";
  return "WARNING";
}

export const paymentOverdueEscalateProcessor: Processor<OverdueEscalateJobData> = async (
  job,
): Promise<OverdueEscalateResult> => {
  const {
    orderId,
    tenantId,
    orderNumber,
    overdueByDays,
    totalAmount,
    amountPaid,
    currency,
    paymentDueAt,
  } = job.data;

  await setSessionTenantId(tenantId);

  const severity = resolveSeverity(overdueByDays);
  const amountDue = (Number.parseFloat(totalAmount) - Number.parseFloat(amountPaid)).toFixed(2);

  // ── Acțiune per severity ─────────────────────────────────────────────────
  let action: string;

  if (severity === "CRITICAL") {
    // 14+ zile → HITL task ACCOUNTING (approvalService pattern E1/B9)
    const task = await approvalService.createTask({
      tenantId,
      entityType: "gold_orders",
      entityId: orderId,
      approvalType: "manual_verification",
      title: `CRITICAL: Comandă ${orderNumber} restantă ${overdueByDays} zile — ${amountDue} ${currency} neplătit`,
      description: buildCriticalDescription({
        orderNumber,
        overdueByDays,
        totalAmount,
        amountPaid,
        currency,
        paymentDueAt,
      }),
      pipelineStage: "E4",
      etapa: "E4",
      priority: "critical",
      createdBy: null,
      metadata: {
        orderId,
        orderNumber,
        overdueByDays,
        totalAmount,
        amountPaid,
        amountDue,
        currency,
        paymentDueAt,
        escalateTo: "ACCOUNTING",
        severity: "CRITICAL",
        workerSource: "b12-payment-overdue-escalate",
        hitlInvestigationType: "overdue_order",
      },
    });
    action = `hitl_created:${task.id}`;
    job.log(`[B12] CRITICAL HITL task created for order ${orderNumber}: approvalTaskId=${task.id}`);
  } else if (severity === "REMINDER") {
    // 7-14 zile → WA reminder (coada WA din registry existent, enqueue fără blocking)
    // NOTE: coada specifică WA E4 va fi definită în FAZA 8d.
    // Comportament curent: logăm evenimentul (nu failure — task non-blocking).
    action = `wa_reminder_pending_faza8d`;
    job.log(
      `[B12] REMINDER: Order ${orderNumber} overdue ${overdueByDays} days — WA reminder queue pending FAZA 8d`,
    );
  } else {
    // 1-7 zile → email WARNING
    // NOTE: coada de email E4 va fi definită în FAZA 8d.
    action = `email_warning_pending_faza8d`;
    job.log(
      `[B12] WARNING: Order ${orderNumber} overdue ${overdueByDays} days — email warning queue pending FAZA 8d`,
    );
  }

  // ── Audit log PAYMENT_OVERDUE_ESCALATED ───────────────────────────────────
  await db.insert(goldAuditLogsEtapa4).values({
    id: uuidv4(),
    tenantId,
    actorId: null,
    actorType: "WORKER",
    eventType: "PAYMENT_OVERDUE_ESCALATED",
    entityType: "gold_orders",
    entityId: orderId,
    newValues: {
      orderId,
      orderNumber,
      severity,
      overdueByDays,
      totalAmount,
      amountPaid,
      amountDue,
      currency,
      paymentDueAt,
      action,
    },
    prevHash: null,
    createdAt: new Date(),
  });

  e4OverdueOrdersEscalatedTotal.inc({ severity, tenant_id: tenantId });
  job.log(
    `[B12] Escalated order=${orderNumber} severity=${severity} overdueByDays=${overdueByDays} amountDue=${amountDue} ${currency}`,
  );

  return { ok: true, orderId, severity, action };
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildCriticalDescription(params: {
  orderNumber: string;
  overdueByDays: number;
  totalAmount: string;
  amountPaid: string;
  currency: string;
  paymentDueAt: string | null;
}): string {
  const amountDue = (
    Number.parseFloat(params.totalAmount) - Number.parseFloat(params.amountPaid)
  ).toFixed(2);
  return [
    `Comandă ${params.orderNumber} are plata restantă de ${params.overdueByDays} zile.`,
    `Sumă datorată: ${amountDue} ${params.currency}`,
    `Sumă plătită: ${params.amountPaid} ${params.currency} din ${params.totalAmount} ${params.currency}`,
    `Data scadentă: ${params.paymentDueAt ?? "N/A"}`,
    "",
    `Acțiune necesară: Verificare și escalare ACCOUNTING.`,
  ].join("\n");
}
