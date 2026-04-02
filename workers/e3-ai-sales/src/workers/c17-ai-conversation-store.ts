/**
 * C17 — ai:conversation:store (concurrency:20, timeout:10s)
 *
 * Persistă conversația AI în DB:
 *  - Creare conversație nouă dacă conversationId lipsă
 *  - INSERT mesaje user + assistant în ai_conversation_messages
 *  - UPDATE ai_conversations totalTokens + modelUsed + endedAt
 *  - INSERT ai_tool_calls pentru fiecare tool call
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  aiConversations,
  aiConversationMessages,
  aiToolCalls,
  eq,
  sql,
} from "@cerniq/db";
import { randomUUID } from "node:crypto";

const LOG = "[c17:ai:conversation:store]";

// ── Job types ─────────────────────────────────────────────────────────────────

export interface ToolCallRecord {
  toolName: string;
  input: unknown;
  output: unknown;
  durationMs: number;
  success: boolean;
}

export interface AiConversationStoreJobData {
  tenantId: string;
  sessionId: string;
  conversationId?: string | null;
  leadId?: string | null;
  negotiationId?: string | null;
  userMessage?: string | null;
  assistantResponse?: string | null;
  modelUsed?: string | null;
  tokens?: {
    user: number;
    assistant: number;
    total: number;
  };
  toolCalls?: ToolCallRecord[];
  validated?: boolean;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const aiConversationStoreProcessor: Processor<AiConversationStoreJobData> = async (job) => {
  const {
    tenantId,
    sessionId,
    conversationId: incomingConvId,
    leadId,
    negotiationId,
    userMessage,
    assistantResponse,
    modelUsed,
    tokens,
    toolCalls = [],
    validated = false,
  } = job.data;

  await setSessionTenantId(tenantId);

  console.info(
    `${LOG} tenantId=${tenantId} sessionId=${sessionId} validated=${validated} conversationId=${incomingConvId ?? "NEW"}`,
  );

  // Dacă jobul vine din C16 cu validated=true dar fără mesaje, nu facem nimic special
  if (validated && !userMessage && !assistantResponse) {
    console.info(
      `${LOG} validated=true marker received, no messages to store sessionId=${sessionId}`,
    );
    return { ok: true, conversationId: incomingConvId ?? null, messagesStored: 0 };
  }

  let conversationId = incomingConvId ?? undefined;

  // 1. Creare conversație nouă dacă lipsă
  if (!conversationId) {
    conversationId = randomUUID();
    await db.insert(aiConversations).values({
      id: conversationId,
      tenantId,
      leadId: leadId ?? null,
      negotiationId: negotiationId ?? null,
      sessionId,
      modelUsed: modelUsed ?? null,
      startedAt: new Date(),
      totalTokens: 0,
    });
    console.info(`${LOG} created new conversation id=${conversationId} sessionId=${sessionId}`);
  }

  let messagesStored = 0;

  // 2. INSERT mesaj user
  if (userMessage) {
    const userMsgId = randomUUID();
    await db.insert(aiConversationMessages).values({
      id: userMsgId,
      tenantId,
      conversationId,
      role: "user",
      content: userMessage,
      tokens: tokens?.user ?? Math.ceil(userMessage.length / 4),
    });
    messagesStored++;

    // 3. INSERT mesaj assistant
    if (assistantResponse) {
      const assistantMsgId = randomUUID();
      await db.insert(aiConversationMessages).values({
        id: assistantMsgId,
        tenantId,
        conversationId,
        role: "assistant",
        content: assistantResponse,
        tokens: tokens?.assistant ?? Math.ceil(assistantResponse.length / 4),
      });
      messagesStored++;

      // 4. INSERT tool calls (dacă există)
      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          await db.insert(aiToolCalls).values({
            id: randomUUID(),
            tenantId,
            conversationId,
            messageId: assistantMsgId,
            toolName: tc.toolName,
            input: tc.input as Record<string, unknown>,
            output: tc.output as Record<string, unknown>,
            durationMs: tc.durationMs,
            success: tc.success,
          });
          messagesStored++;
        }
      }
    }
  }

  // 5. UPDATE ai_conversations: totalTokens, modelUsed, endedAt
  const totalTokensToAdd = tokens?.total ?? 0;
  await db
    .update(aiConversations)
    .set({
      totalTokens: sql`${aiConversations.totalTokens} + ${totalTokensToAdd}`,
      modelUsed: modelUsed ?? undefined,
      endedAt: new Date(),
    })
    .where(eq(aiConversations.id, conversationId));

  console.info(
    `${LOG} stored conversationId=${conversationId} messagesStored=${messagesStored} tokens=${totalTokensToAdd}`,
  );

  return { ok: true, conversationId, messagesStored };
};
