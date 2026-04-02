/**
 * C14 — ai:agent:orchestrate (concurrency:10, timeout:120s) CRITICAL
 *
 * Orchestrare principală a agentului AI:
 *  - LLM Guard pre/post (STUB — e3-guardrails pending)
 *  - Apel QwQ-32B-AWQ via reasoningChat (fallback: Grok-4 → GPT-4o)
 *  - Extrage tool_call patterns din răspuns
 *  - Enqueue downstream: C15 ai:e3:response:generate
 */
import type { Processor } from "bullmq";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
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

// ── LLM Guard (STUB — e3-guardrails pending) ─────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore.*previous.*instruction/i,
  /system.*prompt.*override/i,
  /forget.*everything/i,
  /<script[\s>]/i,
  /union\s+select/i,
  /drop\s+table/i,
];

function guardPreScan(text: string, sessionId: string): void {
  const suspicious = INJECTION_PATTERNS.some((p) => p.test(text));
  if (suspicious) {
    console.warn(`${LOG} [GUARD-PRE] possible injection attempt sessionId=${sessionId}`);
  } else {
    console.info(`${LOG} [GUARD-PRE] STUB pass sessionId=${sessionId}`);
  }
}

function guardPostScan(text: string, sessionId: string): void {
  console.info(
    `${LOG} [GUARD-POST] STUB pass sessionId=${sessionId} responseLength=${text.length}`,
  );
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

  // 1. LLM Guard pre-scan
  guardPreScan(userMessage, sessionId);

  // 2. Build user prompt complet
  const historyText = conversationHistory
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join("\n\n");

  let fullUserPrompt = historyText
    ? `${historyText}\n\n[USER]: ${userMessage}`
    : `[USER]: ${userMessage}`;

  if (correctionNote) {
    fullUserPrompt = `${correctionNote}\n\n${fullUserPrompt}`;
  }

  // 3. Call reasoningChat cu QwQ-32B-AWQ (fallback: Grok-4 → GPT-4o)
  const { text: responseText, modelUsed } = await reasoningChat(systemPrompt, fullUserPrompt, {
    temperature: 0.3,
    maxTokens: 4096,
    timeoutMs: 90_000,
  });

  // 4. LLM Guard post-scan
  guardPostScan(responseText, sessionId);

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
