/**
 * C15 — ai:response:generate (concurrency:10, timeout:60s)
 *
 * Procesează răspunsul brut din C14:
 *  - Curăță <think>...</think> blocks (QwQ chain-of-thought)
 *  - simple: reformatare cu fastChat; complex: păstrează răspunsul direct
 *  - Detectează limba (RO/EN) și asigură corectitudinea
 * Enqueue paralel: C16 ai:response:validate + C17 ai:conversation:store.
 */
import type { Processor } from "bullmq";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import { fastChat } from "../lib/llm-client.js";

const LOG = "[c15:ai:response:generate]";

// ── Job types ─────────────────────────────────────────────────────────────────

export interface AiResponseGenerateJobData {
  tenantId: string;
  sessionId: string;
  conversationId: string | null;
  leadId: string;
  negotiationId: string;
  rawResponse: string;
  modelUsed: string;
  userMessage: string;
  promptTokens: number;
  responseTokens: number;
  toolCalls?: Array<{ name: string; input: unknown }>;
  complexity?: "simple" | "complex";
  language?: "RO" | "EN";
  attemptNumber?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function removeThinkBlocks(text: string): string {
  return text.replaceAll(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function removeToolCallBlocks(text: string): string {
  return text.replaceAll(/<tool_call>[\s\S]*?<\/tool_call>/gi, "").trim();
}

function detectLanguage(text: string): "RO" | "EN" {
  // Cuvinte comune române
  const roKeywords = /\b(și|sau|că|nu|da|este|sunt|pentru|cu|de|la|în|pe|un|o|al|ai|ale|lui)\b/gi;
  const roMatches = (text.match(roKeywords) ?? []).length;
  return roMatches >= 2 ? "RO" : "EN";
}

async function reformatWithFastChat(rawResponse: string, language: "RO" | "EN"): Promise<string> {
  const langInstr = language === "RO" ? "în română" : "in English";
  try {
    const result = await fastChat(
      [
        {
          role: "system",
          content: `Reformatezi un răspuns de agent AI pentru a fi clar și profesionist ${langInstr}. Păstrează TOATE informațiile importante. Elimină repetițiile și formatează logic. Returnează DOAR răspunsul reformatat, fără explicații suplimentare.`,
        },
        { role: "user", content: rawResponse },
      ],
      10_000,
    );
    return result.trim() || rawResponse;
  } catch (err) {
    console.warn(`${LOG} fastChat reformat failed, returning cleaned response`, err);
    return rawResponse;
  }
}

// ── Downstream queues ─────────────────────────────────────────────────────────

const validateQueue = createQueue(QUEUES.E3_AI_RESPONSE_VALIDATE);
const storeQueue = createQueue(QUEUES.E3_AI_CONVERSATION_STORE);

// ── Processor ─────────────────────────────────────────────────────────────────

export const aiResponseGenerateProcessor: Processor<AiResponseGenerateJobData> = async (job) => {
  const {
    tenantId,
    sessionId,
    conversationId,
    leadId,
    negotiationId,
    rawResponse,
    modelUsed,
    userMessage,
    promptTokens,
    responseTokens,
    toolCalls = [],
    complexity,
    language: requestedLanguage,
    attemptNumber = 1,
  } = job.data;

  console.info(
    `${LOG} tenantId=${tenantId} sessionId=${sessionId} complexity=${complexity ?? "complex"} rawLen=${rawResponse.length}`,
  );

  // 1. Curăță blocks <think> și <tool_call>
  let cleanResponse = removeThinkBlocks(rawResponse);
  cleanResponse = removeToolCallBlocks(cleanResponse);

  // 2. Detectează sau confirmă limba
  const detectedLanguage = requestedLanguage ?? detectLanguage(cleanResponse);

  // 3. simple → reformatare cu fastChat; complex → păstrează (QwQ deja complex)
  if (complexity === "simple") {
    cleanResponse = await reformatWithFastChat(cleanResponse, detectedLanguage);
  }

  // 4. Sanitizare finală: elimină linii goale consecutive
  cleanResponse = cleanResponse.replaceAll(/\n{3,}/g, "\n\n").trim();

  if (!cleanResponse) {
    throw new Error(`${LOG} clean response is empty after processing sessionId=${sessionId}`);
  }

  const totalTokens = promptTokens + responseTokens;

  // 5. Enqueue C16 + C17 în paralel
  const jobTs = Date.now();

  await Promise.all([
    validateQueue.add(
      "ai:response:validate",
      {
        tenantId,
        sessionId,
        conversationId,
        negotiationId,
        response: cleanResponse,
        attemptCount: attemptNumber - 1,
      },
      { ...DEFAULT_JOB_OPTIONS, jobId: `validate:${sessionId}:${jobTs}` },
    ),
    storeQueue.add(
      "ai:conversation:store",
      {
        tenantId,
        sessionId,
        conversationId,
        leadId,
        negotiationId,
        userMessage,
        assistantResponse: cleanResponse,
        modelUsed,
        tokens: {
          user: promptTokens,
          assistant: responseTokens,
          total: totalTokens,
        },
        toolCalls: toolCalls.map((tc) => ({
          toolName: tc.name,
          input: tc.input,
          output: null,
          durationMs: 0,
          success: true,
        })),
        validated: false,
      },
      { ...DEFAULT_JOB_OPTIONS, jobId: `store:${sessionId}:${jobTs}` },
    ),
  ]);

  console.info(
    `${LOG} enqueued C16+C17 sessionId=${sessionId} language=${detectedLanguage} cleanLen=${cleanResponse.length}`,
  );

  return {
    ok: true,
    sessionId,
    cleanResponse,
    language: detectedLanguage,
    totalTokens,
  };
};
