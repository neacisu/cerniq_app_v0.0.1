/**
 * K62 — intent:classify (concurrency:20, timeout:10s)
 *
 * Clasifică intenția clientului dintr-un mesaj de negociere.
 * Folosește fastClient Qwen2.5-14B — task simplu, NU reasoning (§XIII L2599).
 *
 * Intenții exacte din plan (ZERO inventii extra):
 *   PRODUCT_INQUIRY | PRICE_REQUEST | DISCOUNT_REQUEST | STOCK_CHECK |
 *   ORDER_INTENT | COMPLAINT | HANDOVER_REQUEST | GENERAL_QUESTION | COMPETITOR_MENTION
 *
 * Dacă intent = HANDOVER_REQUEST → auto-enqueue J56 handover:detect.
 *
 * Output Zod-validated OBLIGATORIU.
 * FAZA 7l — Plan L1902.
 */
import type { Processor } from "bullmq";
import { z } from "zod";
import { setSessionTenantId } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import { fastChat } from "../lib/llm-client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export const INTENT_VALUES = [
  "PRODUCT_INQUIRY",
  "PRICE_REQUEST",
  "DISCOUNT_REQUEST",
  "STOCK_CHECK",
  "ORDER_INTENT",
  "COMPLAINT",
  "HANDOVER_REQUEST",
  "GENERAL_QUESTION",
  "COMPETITOR_MENTION",
] as const;

export type IntentValue = (typeof INTENT_VALUES)[number];

export interface IntentClassifyJobData {
  tenantId: string;
  negotiationId: string;
  messageId?: string;
  content: string;
}

export interface IntentClassifyResult {
  ok: boolean;
  intent: IntentValue;
  confidence: number;
  handoverTriggered: boolean;
}

// ── Zod Schema ─────────────────────────────────────────────────────────────────

const IntentSchema = z.object({
  intent: z.enum(INTENT_VALUES),
  confidence: z.number().min(0).max(1),
});

// ── System Prompt ─────────────────────────────────────────────────────────────

const INTENTS_LIST = INTENT_VALUES.join(" | ");

const SYSTEM_PROMPT = `Ești un clasificator de intenții pentru mesaje B2B de vânzări.
Clasifică mesajul primit în EXACT una din intențiile de mai jos și returnează EXCLUSIV JSON valid:
{
  "intent": "<una din intențiile de mai jos>",
  "confidence": <număr 0.0-1.0>
}
Intenții permise (STRICT, fără alte valori):
${INTENTS_LIST}
Definiții:
- PRODUCT_INQUIRY: întrebări despre produs/caracteristici
- PRICE_REQUEST: cerere preț
- DISCOUNT_REQUEST: cerere reducere/discount
- STOCK_CHECK: verificare stoc/disponibilitate
- ORDER_INTENT: intenție de comandă/achiziție
- COMPLAINT: reclamație/nemulțumire
- HANDOVER_REQUEST: cerere explicită de agent uman
- GENERAL_QUESTION: întrebare generală
- COMPETITOR_MENTION: menționare competitor
NU adăuga text suplimentar în afara JSON-ului.`;

// ── Queues ────────────────────────────────────────────────────────────────────

const handoverQueue = createQueue(QUEUES.E3_HANDOVER_DETECT);

// ── Processor ─────────────────────────────────────────────────────────────────

const LOG = "[k62:intent:classify]";

export const intentClassifyProcessor: Processor<
  IntentClassifyJobData,
  IntentClassifyResult
> = async (job) => {
  const { tenantId, negotiationId, messageId, content } = job.data;

  await setSessionTenantId(tenantId);

  console.info(`${LOG} tenantId=${tenantId} negotiationId=${negotiationId} len=${content.length}`);

  const raw = await fastChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: content.slice(0, 800) },
    ],
    10_000,
  );

  const cleaned = raw.replaceAll(/```(?:json)?/gi, "").trim();
  const parsed = IntentSchema.parse(JSON.parse(cleaned));

  console.info(
    `${LOG} intent=${parsed.intent} confidence=${parsed.confidence} negotiationId=${negotiationId}`,
  );

  // HANDOVER_REQUEST → auto-trigger J56 handover:detect (chain natural)
  let handoverTriggered = false;
  if (parsed.intent === "HANDOVER_REQUEST") {
    await handoverQueue.add(
      "handover:detect",
      { tenantId, negotiationId, messageId, triggerReason: "EXPLICIT_HANDOVER_REQUEST" },
      { ...DEFAULT_JOB_OPTIONS, priority: 1 },
    );
    handoverTriggered = true;
    console.info(`${LOG} HANDOVER_REQUEST detected — J56 enqueued negotiationId=${negotiationId}`);
  }

  return {
    ok: true,
    intent: parsed.intent,
    confidence: parsed.confidence,
    handoverTriggered,
  };
};
