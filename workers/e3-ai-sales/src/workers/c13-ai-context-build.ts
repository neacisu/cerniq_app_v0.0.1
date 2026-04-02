/**
 * C13 — ai:context:build (concurrency:20, timeout:30s)
 *
 * Construiește contextul complet pentru agentul AI:
 *  - info lead + negociere (goldCompanies, goldNegotiations)
 *  - ultimele 20 mesaje din conversație (aiConversationMessages)
 *  - tool-uri permise în starea FSM curentă (fsmStateAllowedTools)
 * Respectă limita de 24576 tokens (estimare: 1 token ≈ 4 chars).
 * Enqueue downstream: C14 ai:agent:orchestrate.
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  goldCompanies,
  goldNegotiations,
  aiConversationMessages,
  aiConversations,
  fsmStateAllowedTools,
  eq,
  and,
  desc,
} from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";

const LOG = "[c13:ai:context:build]";
const MAX_CONTEXT_TOKENS = 24_576;
const HISTORY_LIMIT = 20;

// ── Job types ─────────────────────────────────────────────────────────────────

export interface AiContextBuildJobData {
  tenantId: string;
  sessionId: string;
  leadId: string;
  negotiationId: string;
  userMessage: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Selectează cele mai recente mesaje din `historyMessages` (oldest-first order)
 * care încap în `budgetTokens`. Traversează de la cel mai nou spre cel mai vechi
 * și oprește când bugetul e epuizat. Returnează array-ul în ordine cronologică.
 */
export function truncateHistoryToTokenBudget(
  historyMessages: Array<{ role: string; content: string }>,
  budgetTokens: number,
): Array<{ role: string; content: string }> {
  if (budgetTokens <= 0) return [];

  let used = 0;
  const result: Array<{ role: string; content: string }> = [];
  for (let i = historyMessages.length - 1; i >= 0; i--) {
    const msg = historyMessages[i];
    if (!msg) continue;
    const t = estimateTokens(`${msg.role}: ${msg.content}`);
    if (used + t > budgetTokens) break;
    result.unshift(msg);
    used += t;
  }
  return result;
}

// ── Downstream queue ──────────────────────────────────────────────────────────

const orchestrateQueue = createQueue(QUEUES.E3_AI_AGENT_ORCHESTRATE);

// ── Processor ─────────────────────────────────────────────────────────────────

export const aiContextBuildProcessor: Processor<AiContextBuildJobData> = async (job) => {
  const { tenantId, sessionId, leadId, negotiationId, userMessage } = job.data;

  await setSessionTenantId(tenantId);

  console.info(`${LOG} tenantId=${tenantId} sessionId=${sessionId} negotiationId=${negotiationId}`);

  // 1. Lead info (goldCompanies)
  const leadRows = await db
    .select({
      id: goldCompanies.id,
      denumire: goldCompanies.denumire,
    })
    .from(goldCompanies)
    .where(and(eq(goldCompanies.id, leadId), eq(goldCompanies.tenantId, tenantId)))
    .limit(1);

  const lead = leadRows[0] ?? { id: leadId, denumire: "Lead necunoscut" };

  // 2. Negociere curentă
  const negRows = await db
    .select({
      id: goldNegotiations.id,
      currentState: goldNegotiations.currentState,
      engagementScore: goldNegotiations.engagementScore,
      closeProbability: goldNegotiations.closeProbability,
      totalValue: goldNegotiations.totalValue,
    })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)))
    .limit(1);

  const negotiation = negRows[0];
  if (!negotiation) {
    throw new Error(`${LOG} negotiation not found id=${negotiationId} tenantId=${tenantId}`);
  }

  const currentState = negotiation.currentState;

  // 3. Conversație existentă (dacă există)
  const convRows = await db
    .select({ id: aiConversations.id })
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.tenantId, tenantId),
        eq(aiConversations.negotiationId, negotiationId),
        eq(aiConversations.sessionId, sessionId),
      ),
    )
    .limit(1);

  const conversationId = convRows[0]?.id;

  // 4. Ultimele 20 mesaje din conversație
  let historyMessages: Array<{ role: string; content: string }> = [];
  if (conversationId) {
    const msgRows = await db
      .select({
        role: aiConversationMessages.role,
        content: aiConversationMessages.content,
      })
      .from(aiConversationMessages)
      .where(eq(aiConversationMessages.conversationId, conversationId))
      .orderBy(desc(aiConversationMessages.createdAt))
      .limit(HISTORY_LIMIT);

    historyMessages = msgRows.toReversed().map((m) => ({ role: m.role, content: m.content ?? "" }));
  }

  // 5. Tool-uri permise în starea FSM curentă
  const toolRows = await db
    .select({ toolName: fsmStateAllowedTools.toolName })
    .from(fsmStateAllowedTools)
    .where(
      and(
        eq(fsmStateAllowedTools.fsmType, "negotiation"),
        eq(fsmStateAllowedTools.state, currentState),
      ),
    );

  const allowedTools = toolRows.map((r) => r.toolName);

  // 6. Build system prompt cu context
  const systemPrompt = buildSystemPrompt({
    lead: { id: lead.id, denumire: lead.denumire ?? "N/A" },
    negotiation: {
      id: negotiation.id,
      currentState,
      engagementScore: negotiation.engagementScore ?? null,
      closeProbability: negotiation.closeProbability ?? null,
      totalValue: negotiation.totalValue ?? null,
    },
    allowedTools,
  });

  // 7. Estimare tokens și truncare dacă necesar
  let contextTokens = estimateTokens(systemPrompt);
  let usableHistory = historyMessages;

  const historyText = historyMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const historyTokens = estimateTokens(historyText);
  const userTokens = estimateTokens(userMessage);

  if (contextTokens + historyTokens + userTokens > MAX_CONTEXT_TOKENS) {
    const budgetForHistory = MAX_CONTEXT_TOKENS - contextTokens - userTokens - 512;
    usableHistory = truncateHistoryToTokenBudget(historyMessages, budgetForHistory);
  }

  contextTokens +=
    estimateTokens(usableHistory.map((m) => `${m.role}: ${m.content}`).join("\n")) + userTokens;

  // 8. Enqueue C14
  await orchestrateQueue.add(
    "ai:agent:orchestrate",
    {
      tenantId,
      sessionId,
      leadId,
      negotiationId,
      conversationId: conversationId ?? null,
      systemPrompt,
      userMessage,
      conversationHistory: usableHistory,
      allowedTools,
      attemptNumber: 1,
    },
    { ...DEFAULT_JOB_OPTIONS, jobId: `orchestrate:${sessionId}:${Date.now()}` },
  );

  console.info(
    `${LOG} enqueued C14 sessionId=${sessionId} contextTokens=${contextTokens} historyMsgs=${usableHistory.length}`,
  );

  return { ok: true, sessionId, contextTokens };
};

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(params: {
  lead: { id: string; denumire: string };
  negotiation: {
    id: string;
    currentState: string;
    engagementScore: string | null;
    closeProbability: string | null;
    totalValue: string | null;
  };
  allowedTools: string[];
}): string {
  const { lead, negotiation, allowedTools } = params;

  return `Ești un agent AI specializat în negocieri B2B pentru platforma CerniqAPP E3 AI Sales.

## Informații Lead
- ID: ${lead.id}
- Companie: ${lead.denumire}

## Negociere Curentă
- ID: ${negotiation.id}
- Stare: ${negotiation.currentState}
- Engagement Score: ${negotiation.engagementScore ?? "N/A"}
- Probabilitate Închidere: ${negotiation.closeProbability ?? "N/A"}%
- Valoare Totală: ${negotiation.totalValue ?? "N/A"} RON

## Tool-uri Permise în Starea "${negotiation.currentState}"
${allowedTools.length > 0 ? allowedTools.map((t) => `- ${t}`).join("\n") : "- (niciun tool permis în această stare)"}

## Instrucțiuni
- Răspunde ÎNTOTDEAUNA în limba română dacă nu ți se cere explicit altfel.
- Fii profesionist, empatic și orientat spre închiderea negocierii.
- Respectă STRICT regulile de preț și discount (marja minimă 8%).
- NU oferi prețuri sau discounturi fără a verifica regulile de pricing.
- Dacă trebuie să apelezi un tool, folosește formatul: <tool_call>{"name": "tool_name", "input": {...}}</tool_call>`.trim();
}
