/**
 * C14 — ai:agent:orchestrate (concurrency:10, timeout:120s) CRITICAL
 *
 * Orchestrare principală a agentului AI:
 *  - LLM Guard pre/post (local + infraq guard în producție)
 *  - Apel QwQ-32B-AWQ via reasoningChat (fallback: Grok-4 → GPT-4o)
 *  - Extrage tool_call patterns din răspuns
 *  - Enqueue downstream: C15 ai:e3:response:generate
 */
import type { Processor } from "bullmq";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import { e3ScanOutputAfterLlm, e3ScanPromptBeforeLlm } from "../lib/e3-llm-guard.js";
import { reasoningChat } from "../lib/llm-client.js";

const LOG = "[c14:ai:agent:orchestrate]";

// ── Job types ─────────────────────────────────────────────────────────────────

export interface AiAgentOrchestrateJobData {
  tenantId: string;
  sessionId: string;
  leadId: string;
  negotiationId: string;
  conversationId: string | null;
  systemPrompt: string;
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  allowedTools: string[];
  attemptNumber?: number;
  correctionNote?: string;
}

export interface ExtractedToolCall {
  name: string;
  input: unknown;
}

// ── Tool call extraction ──────────────────────────────────────────────────────

const TOOL_CALL_REGEX = /<tool_call>([\s\S]*?)<\/tool_call>/g;

function extractToolCalls(response: string): ExtractedToolCall[] {
  const calls: ExtractedToolCall[] = [];
  let match: RegExpExecArray | null;

  while ((match = TOOL_CALL_REGEX.exec(response)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { name?: string; input?: unknown };
      if (parsed.name && typeof parsed.name === "string") {
        calls.push({ name: parsed.name, input: parsed.input ?? {} });
      }
    } catch {
      console.warn(`${LOG} failed to parse tool_call JSON`, raw?.slice(0, 100));
    }
  }

  return calls;
}

// ── Downstream queues ─────────────────────────────────────────────────────────

const responseGenerateQueue = createQueue(QUEUES.E3_AI_RESPONSE_GENERATE);

// ── Processor ─────────────────────────────────────────────────────────────────

export const aiAgentOrchestrateProcessor: Processor<AiAgentOrchestrateJobData> = async (job) => {
  const {
    tenantId,
    sessionId,
    leadId,
    negotiationId,
    conversationId,
    systemPrompt,
    userMessage,
    conversationHistory,
    allowedTools,
    attemptNumber = 1,
    correctionNote,
  } = job.data;

  console.info(
    `${LOG} tenantId=${tenantId} sessionId=${sessionId} attempt=${attemptNumber} tools=${allowedTools.length}`,
  );

  // 1. Build user prompt complet
  const historyText = conversationHistory
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join("\n\n");

  let fullUserPrompt = historyText
    ? `${historyText}\n\n[USER]: ${userMessage}`
    : `[USER]: ${userMessage}`;

  if (correctionNote) {
    fullUserPrompt = `${correctionNote}\n\n${fullUserPrompt}`;
  }

  // 2. LLM Guard — scanare prompt complet înainte de model
  const preGuard = await e3ScanPromptBeforeLlm(fullUserPrompt);
  if (preGuard.blocked) {
    console.warn(`${LOG} [GUARD-PRE] blocked sessionId=${sessionId}`);
    return {
      ok: true,
      sessionId,
      guardBlocked: true,
      reason: preGuard.reason ?? "guard_blocked",
      modelUsed: "",
      responseText: "",
      toolCallsCount: 0,
    };
  }

  // 3. Call reasoningChat cu QwQ-32B-AWQ (fallback: Grok-4 → GPT-4o)
  const { text: responseText, modelUsed } = await reasoningChat(systemPrompt, fullUserPrompt, {
    temperature: 0.3,
    maxTokens: 4096,
    timeoutMs: 90_000,
    tenantId,
  });

  // 4. LLM Guard — scanare output
  const postGuard = await e3ScanOutputAfterLlm(fullUserPrompt, responseText);
  if (postGuard.blocked) {
    console.warn(`${LOG} [GUARD-POST] blocked sessionId=${sessionId}`);
    return {
      ok: true,
      sessionId,
      guardBlocked: true,
      reason: postGuard.reason ?? "guard_blocked_output",
      modelUsed,
      responseText: "",
      toolCallsCount: 0,
    };
  }

  // 5. Extrage tool calls din răspuns
  const toolCalls = extractToolCalls(responseText);
  if (toolCalls.length > 0) {
    console.info(`${LOG} detected ${toolCalls.length} tool_call(s) sessionId=${sessionId}`);
  }

  // 6. Estimare tokens (simplistic: 1 token ≈ 4 chars)
  const promptTokens = Math.ceil((systemPrompt.length + fullUserPrompt.length) / 4);
  const responseTokens = Math.ceil(responseText.length / 4);

  // 7. Enqueue C15
  await responseGenerateQueue.add(
    "ai:e3:response:generate",
    {
      tenantId,
      sessionId,
      conversationId,
      leadId,
      negotiationId,
      rawResponse: responseText,
      modelUsed,
      userMessage,
      promptTokens,
      responseTokens,
      toolCalls,
      attemptNumber,
    },
    { ...DEFAULT_JOB_OPTIONS, jobId: `response:gen:${sessionId}:${Date.now()}` },
  );

  console.info(
    `${LOG} enqueued C15 sessionId=${sessionId} modelUsed=${modelUsed} tokens=${promptTokens + responseTokens}`,
  );

  return {
    ok: true,
    sessionId,
    modelUsed,
    responseText,
    toolCallsCount: toolCalls.length,
  };
};
