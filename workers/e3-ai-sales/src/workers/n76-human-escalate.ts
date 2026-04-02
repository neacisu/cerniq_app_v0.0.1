import type { Processor } from "bullmq";
import { withCognitiveSpan, aiGuardrailBreachesTotal } from "@cerniq/worker-shared";
import { approvalService, db, setSessionTenantId, goldNegotiations, eq, and } from "@cerniq/db";

export type HumanEscalateJobData = {
  tenantId: string;
  negotiationId: string;
  conversationId?: string;
  /**
   * Motivul escaladării:
   *   - guardrail_3x_fail  — M71-M75 au eșuat de 3 ori consecutiv (plan L1924)
   *   - discount_director  — discount >30% necesită aprobare director (plan L1850)
   *   - sentiment_negative — sentiment <-0.5 persistent (plan L1916)
   *   - client_requested   — clientul a cerut explicit operator uman
   *   - low_confidence     — AI confidence <0.3 (plan L1916)
   */
  escalateReason:
    | "guardrail_3x_fail"
    | "discount_director"
    | "sentiment_negative"
    | "client_requested"
    | "low_confidence";
  context?: {
    guardrailFailCount?: number;
    discountPct?: number;
    sentimentScore?: number;
    aiConfidence?: number;
    lastMessage?: string;
    guardrailType?: string;
  };
  correlationId?: string;
};

/** Matrice prioritate E3 HITL: mapare motiv → prioritate (SLA 4h = high, conform plan L1604) */
function resolvePriority(
  reason: HumanEscalateJobData["escalateReason"],
): "critical" | "high" | "normal" {
  if (reason === "guardrail_3x_fail" || reason === "discount_director") return "critical";
  return "high";
}

function buildEscalationTitle(reason: HumanEscalateJobData["escalateReason"]): string {
  const labels: Record<HumanEscalateJobData["escalateReason"], string> = {
    guardrail_3x_fail: "Escaladare CRITICĂ — Guardrail AI a eșuat de 3 ori consecutiv",
    discount_director: "Aprobare discount >30% necesită decizie director",
    sentiment_negative: "Sentiment negativ persistent — client necesită suport uman",
    client_requested: "Clientul a cerut explicit operator uman",
    low_confidence: "Confidență AI scăzută (<30%) — necesită revizuire umană",
  };
  return labels[reason];
}

export const humanEscalateProcessor: Processor<HumanEscalateJobData> = async (job) => {
  return withCognitiveSpan(
    "e3:human:escalate",
    async (_span) => {
      const { tenantId, negotiationId, conversationId, escalateReason, context, correlationId } =
        job.data;

      await setSessionTenantId(tenantId);

      // Preluare negociere pentru contextul complet al task-ului
      const [negotiation] = await db
        .select({
          id: goldNegotiations.id,
          currentState: goldNegotiations.currentState,
          assignedUserId: goldNegotiations.assignedUserId,
        })
        .from(goldNegotiations)
        .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)))
        .limit(1);

      if (!negotiation) {
        return { ok: false, status: "negotiation_not_found", negotiationId };
      }

      const priority = resolvePriority(escalateReason);
      const title = buildEscalationTitle(escalateReason);

      const task = await approvalService.createTask({
        tenantId,
        entityType: "negotiation",
        entityId: negotiationId,
        approvalType: "manual_verification",
        etapa: "E3",
        pipelineStage: "E3",
        priority,
        title,
        description: `Negociere ${negotiationId} necesită intervenție umană. Motiv: ${escalateReason}. Stare: ${negotiation.currentState}.`,
        metadata: {
          escalateReason,
          negotiationId,
          conversationId: conversationId ?? null,
          negotiationState: negotiation.currentState,
          correlationId: correlationId ?? null,
          context: context ?? {},
        },
        blockedJobId: job.id ?? undefined,
        blockedQueueName: "human:escalate",
      });

      // Actualizare negociere: marcare updatedAt la escaladare HITL
      await db
        .update(goldNegotiations)
        .set({
          updatedAt: new Date(),
          assignedUserId: negotiation.assignedUserId,
        })
        .where(
          and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)),
        );

      // Metrică Prometheus — guardrail breach dacă motivul este guardrail
      if (escalateReason === "guardrail_3x_fail" && context?.guardrailType) {
        aiGuardrailBreachesTotal.inc({
          guardrail_type: context.guardrailType,
          severity: "CRITICAL",
        });
      }

      return {
        ok: true,
        status: "escalated",
        approvalTaskId: task.id,
        negotiationId,
        priority,
        escalateReason,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
