/**
 * K61 — sentiment:analyze (concurrency:20, timeout:10s)
 *
 * Analizează sentimentul unui mesaj din negociere folosind fastClient
 * Qwen2.5-14B-Instruct-AWQ pe infraq.app/llm/v1/fast.
 *
 * Output Zod-validated: sentiment POSITIVE/NEUTRAL/NEGATIVE, score -1..1,
 * emotions (max 5), topics (max 5).
 *
 * Include LLM Guard pre-scan (local + infraq în producție).
 * Stochează rezultatul pe aiConversationMessages pentru K64 trend analysis.
 *
 * ANTI-HALUCINARE: fastClient Qwen2.5-14B (NU reasoning) — §XIII L2599.
 * Output Zod-validated OBLIGATORIU.
 * FAZA 7l — Plan L1901.
 */
import type { Processor } from "bullmq";
import { z } from "zod";
import { db, setSessionTenantId, aiConversationMessages, eq } from "@cerniq/db";
import { e3ScanPromptBeforeLlm } from "../lib/e3-llm-guard.js";
import { fastChat } from "../lib/llm-client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SentimentAnalyzeJobData {
  tenantId: string;
  negotiationId: string;
  /** ID-ul mesajului din ai_conversation_messages pe care se face analiza. */
  messageId: string;
  /** Conținutul mesajului (copie, pentru a evita un SELECT suplimentar). */
  content: string;
}

export interface SentimentAnalyzeResult {
  ok: boolean;
  messageId: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  score: number;
  emotions: string[];
  topics: string[];
  blocked?: boolean;
  reason?: string;
}

// ── Zod Schema ─────────────────────────────────────────────────────────────────

const SentimentSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  score: z.number().min(-1).max(1),
  emotions: z.array(z.string()).max(5).default([]),
  topics: z.array(z.string()).max(5).default([]),
});

// ── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ești un analizor de sentiment pentru mesaje B2B de vânzări în română/engleză.
Analizează mesajul primit și returnează EXCLUSIV un obiect JSON valid cu structura exactă:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "score": <număr între -1.0 (extrem negativ) și 1.0 (extrem pozitiv)>,
  "emotions": ["<emoție1>", "<emoție2>"],
  "topics": ["<topic1>", "<topic2>"]
}
Reguli:
- sentiment POSITIVE dacă score >= 0.2, NEGATIVE dacă score <= -0.2, altfel NEUTRAL
- emotions: max 5, în română, ex: "curios", "frustrat", "mulțumit", "neîncrezător", "interesat"
- topics: max 5 topice business, ex: "preț", "livrare", "calitate", "concurență", "buget"
- NU adăuga text suplimentar, comentarii sau markdown în afara JSON-ului`;

// ── Processor ─────────────────────────────────────────────────────────────────

const LOG = "[k61:sentiment:analyze]";

export const sentimentAnalyzeProcessor: Processor<
  SentimentAnalyzeJobData,
  SentimentAnalyzeResult
> = async (job) => {
  const { tenantId, messageId, content } = job.data;

  await setSessionTenantId(tenantId);

  console.info(`${LOG} tenantId=${tenantId} messageId=${messageId} len=${content.length}`);

  const guard = await e3ScanPromptBeforeLlm(content);
  if (guard.blocked) {
    console.warn(`${LOG} LLM Guard blocked messageId=${messageId}`);
    return {
      ok: true,
      messageId,
      sentiment: "NEUTRAL",
      score: 0,
      emotions: [],
      topics: [],
      blocked: true,
      reason: guard.reason ?? "guard_blocked",
    };
  }

  const raw = await fastChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: content.slice(0, 800) },
    ],
    10_000,
    { tenantId },
  );

  // Strip optional markdown code blocks
  const cleaned = raw.replaceAll(/```(?:json)?/gi, "").trim();

  // Zod-validate OBLIGATORIU
  const parsed = SentimentSchema.parse(JSON.parse(cleaned));

  // Persist pe mesaj pentru K64 trend analysis
  await db
    .update(aiConversationMessages)
    .set({
      sentimentScore: String(parsed.score),
      sentimentLabel: parsed.sentiment,
    })
    .where(eq(aiConversationMessages.id, messageId));

  console.info(
    `${LOG} stored sentiment=${parsed.sentiment} score=${parsed.score} messageId=${messageId}`,
  );

  return {
    ok: true,
    messageId,
    sentiment: parsed.sentiment,
    score: parsed.score,
    emotions: parsed.emotions,
    topics: parsed.topics,
  };
};
