import type { Processor } from "bullmq";
import {
  withCognitiveSpan,
  hitlTasksResolvedTotal,
  aiGuardrailBreachesTotal,
} from "@cerniq/worker-shared";
import {
  db,
  setSessionTenantId,
  goldNegotiations,
  aiConversations,
  negotiationStateHistory,
  eq,
  and,
  isNull,
} from "@cerniq/db";

export type HumanTakeoverJobData = {
  tenantId: string;
  negotiationId: string;
  conversationId?: string;
  operatorId?: string;
  correlationId?: string;
};

export const humanTakeoverProcessor: Processor<HumanTakeoverJobData> = async (job) => {
  return withCognitiveSpan(
    "e3:human:takeover",
    async (_span) => {
      const { tenantId, negotiationId, conversationId, operatorId, correlationId } = job.data;

      await setSessionTenantId(tenantId);

      // Preluare stare curentă negociere pentru history log
      const [negotiation] = await db
        .select({
          id: goldNegotiations.id,
          currentState: goldNegotiations.currentState,
        })
        .from(goldNegotiations)
        .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)))
        .limit(1);

      if (!negotiation) {
        return { ok: false, status: "negotiation_not_found", negotiationId };
      }

      const now = new Date();

      // (1) Marcare conversație AI ca terminată — AI nu mai participă activ
      if (conversationId) {
        await db
          .update(aiConversations)
          .set({ endedAt: now })
          .where(
            and(
              eq(aiConversations.tenantId, tenantId),
              eq(aiConversations.id, conversationId),
              isNull(aiConversations.endedAt),
            ),
          );
      }

      // (2) Log în negotiation_state_history — eveniment handover (starea nu se schimbă)
      await db.insert(negotiationStateHistory).values({
        tenantId,
        negotiationId,
        fromState: negotiation.currentState,
        toState: negotiation.currentState,
        changedBy: operatorId ?? null,
        reason: `human_takeover: operator=${operatorId ?? "system"}, correlationId=${correlationId ?? "n/a"}`,
      });

      // (3) Metrică: guardrail breach (N77 semnalizează transfer AI→uman)
      aiGuardrailBreachesTotal.inc({
        guardrail_type: "human_takeover",
        severity: "HIGH",
      });

      // (4) Metrică HITL tasks resolved (acțiunea de takeover = task rezolvat implicit)
      hitlTasksResolvedTotal.inc({
        approval_type: "manual_verification",
        decision: "approve",
        tenant_id: tenantId,
      });

      return {
        ok: true,
        status: "handed_off",
        negotiationId,
        conversationId: conversationId ?? null,
        operatorId: operatorId ?? null,
        negotiationState: negotiation.currentState,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
