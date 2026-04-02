/**
 * J56 — handover:detect (concurrency:10)
 *
 * Detectează intenția de handover folosind fastClient (Qwen2.5-14B) + reguli deterministe.
 * Trigger conditions (oricare din ele):
 *   1. Client cere explicit un om/agent uman
 *   2. Sentiment score < -0.5 (frustrare puternică)
 *   3. Temă sensibilă (datorie, insolvență, dispută legală)
 *   4. Discount > 30% cerut (escaladare director)
 *   5. Confidence < 0.3 (AI nesigur pe răspuns)
 *
 * ANTI-HALUCINARE:
 *   - fastClient NU reasoning — clasificare simplă, max_tokens=256
 *   - LLM Guard pre-scan (injection patterns)
 *   - Rezultat Zod-validated OBLIGATORIU
 *   - Dacă handoverNeeded → enqueue J57 handover:context:load
 */
import type { Processor } from "bullmq";
import { z } from "zod";
import { setSessionTenantId } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import { fastChat } from "../lib/llm-client.js";

const LOG = "[j56-handover-detect]";

// ── LLM Guard ─────────────────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore.*previous.*instruction/i,
  /system.*prompt/i,
  /forget.*everything/i,
  /<script/i,
  /union.*select/i,
  /drop.*table/i,
];

function isInjectionAttempt(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

// ── Zod schema for LLM output ─────────────────────────────────────────────────

const HandoverDetectionSchema = z.object({
  handoverNeeded: z.boolean(),
  reason: z.enum([
    "CLIENT_REQUESTS_HUMAN",
    "HIGH_FRUSTRATION",
    "SENSITIVE_TOPIC",
    "DISCOUNT_ESCALATION",
    "AI_LOW_CONFIDENCE",
    "COMPETITOR_MENTION",
    "LEGAL_DISPUTE",
    "NONE",
  ]),
  confidence: z.number().min(0).max(1),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  triggers: z.array(z.string()).max(5),
});

type HandoverDetection = z.infer<typeof HandoverDetectionSchema>;

// ── Rule-based overrides (deterministe — fără LLM) ────────────────────────────

const HUMAN_REQUEST_PATTERNS = [
  /vreau.*om\b/i,
  /vreau.*uman/i,
  /vreau.*agent/i,
  /vreau.*persoana/i,
  /vreau.*consultant/i,
  /vorbesc.*cineva/i,
  /transfer.*agent/i,
  /vorbeste.*uman/i,
  /give me.*human/i,
  /talk to.*human/i,
  /speak.*agent/i,
  /operator.*uman/i,
  /nu.*vreau.*robot/i,
  /nu.*cu.*bot/i,
];

const SENSITIVE_TOPIC_PATTERNS = [
  /insolventa/i,
  /faliment/i,
  /executare.*silita/i,
  /tribunal/i,
  /judecata/i,
  /litigiu/i,
  /tribunal/i,
  /frauda/i,
  /reclamatie.*formala/i,
];

function applyDeterministicRules(
  lastMessage: string,
  sentimentScore: number | undefined,
  discountPct: number | undefined,
  aiConfidenceScore: number | undefined,
): Partial<HandoverDetection> | null {
  if (HUMAN_REQUEST_PATTERNS.some((p) => p.test(lastMessage))) {
    return {
      handoverNeeded: true,
      reason: "CLIENT_REQUESTS_HUMAN",
      confidence: 1,
      urgency: "HIGH",
      triggers: ["client_explicit_request"],
    };
  }
  if (sentimentScore !== undefined && sentimentScore < -0.5) {
    return {
      handoverNeeded: true,
      reason: "HIGH_FRUSTRATION",
      confidence: 0.95,
      urgency: "HIGH",
      triggers: [`sentiment_score:${sentimentScore.toFixed(2)}`],
    };
  }
  if (SENSITIVE_TOPIC_PATTERNS.some((p) => p.test(lastMessage))) {
    return {
      handoverNeeded: true,
      reason: "SENSITIVE_TOPIC",
      confidence: 0.9,
      urgency: "HIGH",
      triggers: ["sensitive_topic_detected"],
    };
  }
  if (discountPct !== undefined && discountPct > 30) {
    return {
      handoverNeeded: true,
      reason: "DISCOUNT_ESCALATION",
      confidence: 0.9,
      urgency: "MEDIUM",
      triggers: [`discount_pct:${discountPct.toFixed(1)}`],
    };
  }
  if (aiConfidenceScore !== undefined && aiConfidenceScore < 0.3) {
    return {
      handoverNeeded: true,
      reason: "AI_LOW_CONFIDENCE",
      confidence: 0.85,
      urgency: "MEDIUM",
      triggers: [`ai_confidence:${aiConfidenceScore.toFixed(4)}`],
    };
  }
  return null;
}

// ── Queues ────────────────────────────────────────────────────────────────────

const contextLoadQueue = createQueue(QUEUES.E3_HANDOVER_CONTEXT_LOAD);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HandoverDetectJobData {
  tenantId: string;
  negotiationId: string;
  conversationId?: string;
  lastMessage: string;
  /** Sentiment score [-1..1] din K61 (dacă e disponibil). */
  sentimentScore?: number;
  /** Discount cerut de client în ultimul mesaj (procent). */
  currentDiscountPct?: number;
  /** AI confidence din C15 ai:response:generate (dacă e disponibil). */
  aiConfidenceScore?: number;
  actorId?: string;
}

export interface HandoverDetectResult {
  ok: true;
  handoverNeeded: boolean;
  reason: HandoverDetection["reason"];
  confidence: number;
  urgency: HandoverDetection["urgency"];
  triggers: string[];
  detectionMethod: "deterministic" | "llm" | "llm_fallback";
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const handoverDetectProcessor: Processor<
  HandoverDetectJobData,
  HandoverDetectResult
> = async (job) => {
  const {
    tenantId,
    negotiationId,
    conversationId,
    lastMessage,
    sentimentScore,
    currentDiscountPct,
    aiConfidenceScore,
  } = job.data;

  await setSessionTenantId(tenantId);

  console.info(
    `${LOG} tenantId=${tenantId} negotiationId=${negotiationId} msgLen=${lastMessage.length}`,
  );

  // 1. LLM Guard — detecție injection
  if (isInjectionAttempt(lastMessage)) {
    console.warn(`${LOG} injection detected tenantId=${tenantId} negotiationId=${negotiationId}`);
    return {
      ok: true,
      handoverNeeded: false,
      reason: "NONE",
      confidence: 1,
      urgency: "LOW",
      triggers: ["guard_blocked_injection"],
      detectionMethod: "deterministic",
    };
  }

  // 2. Reguli deterministe — prioritate maximă, fără latență LLM
  const deterministicResult = applyDeterministicRules(
    lastMessage,
    sentimentScore,
    currentDiscountPct,
    aiConfidenceScore,
  );

  if (deterministicResult?.handoverNeeded) {
    const result = deterministicResult as HandoverDetection;
    console.info(
      `${LOG} deterministic handover: reason=${result.reason} urgency=${result.urgency}`,
    );
    await contextLoadQueue.add(
      `handover:ctx:${negotiationId}`,
      {
        tenantId,
        negotiationId,
        conversationId,
        handoverReason: result.reason,
        handoverTriggers: result.triggers,
        urgency: result.urgency,
      },
      DEFAULT_JOB_OPTIONS,
    );
    return {
      ok: true,
      handoverNeeded: true,
      reason: result.reason,
      confidence: result.confidence,
      urgency: result.urgency,
      triggers: result.triggers,
      detectionMethod: "deterministic",
    };
  }

  // 3. LLM clasificare fastClient (Qwen2.5-14B) — pentru cazuri ambigue
  const systemPrompt = `Ești un detector de intenție handover pentru un agent AI de vânzări B2B.
Analizează mesajul clientului și determină dacă este nevoie de preluare de către un agent uman.

Returnează EXCLUSIV un obiect JSON valid, fără text extra:
{
  "handoverNeeded": boolean,
  "reason": "CLIENT_REQUESTS_HUMAN" | "HIGH_FRUSTRATION" | "SENSITIVE_TOPIC" | "DISCOUNT_ESCALATION" | "AI_LOW_CONFIDENCE" | "COMPETITOR_MENTION" | "LEGAL_DISPUTE" | "NONE",
  "confidence": number (0.0-1.0),
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "triggers": [string] (max 3 elemente descriptive scurte)
}

Criterii handover:
- CLIENT_REQUESTS_HUMAN: clientul cere explicit un agent/om/consultant uman
- HIGH_FRUSTRATION: ton agresiv, nemulțumire puternică, amenințări
- SENSITIVE_TOPIC: insolvență, litigiu, fraudă, reclamație formală
- DISCOUNT_ESCALATION: discount > 30% solicitat repetat
- COMPETITOR_MENTION: clientul menționează concurent cu ofertă mai bună (risc pierdere)
- LEGAL_DISPUTE: referire la aspecte juridice, contracte neonorate
- NONE: conversație normală, AI poate continua`;

  let detection: HandoverDetection;
  let detectionMethod: HandoverDetectResult["detectionMethod"] = "llm";

  try {
    const raw = await fastChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: lastMessage.slice(0, 1000) },
      ],
      5_000,
    );
    const parsed = JSON.parse(raw.trim()) as unknown;
    detection = HandoverDetectionSchema.parse(parsed);
  } catch (err) {
    console.warn(`${LOG} LLM classification failed, defaulting to no handover`, err);
    detectionMethod = "llm_fallback";
    detection = {
      handoverNeeded: false,
      reason: "NONE",
      confidence: 0.5,
      urgency: "LOW",
      triggers: ["llm_error_fallback"],
    };
  }

  if (detection.handoverNeeded) {
    console.info(
      `${LOG} LLM handover: reason=${detection.reason} confidence=${detection.confidence}`,
    );
    await contextLoadQueue.add(
      `handover:ctx:${negotiationId}`,
      {
        tenantId,
        negotiationId,
        conversationId,
        handoverReason: detection.reason,
        handoverTriggers: detection.triggers,
        urgency: detection.urgency,
      },
      DEFAULT_JOB_OPTIONS,
    );
  }

  return {
    ok: true,
    handoverNeeded: detection.handoverNeeded,
    reason: detection.reason,
    confidence: detection.confidence,
    urgency: detection.urgency,
    triggers: detection.triggers,
    detectionMethod,
  };
};
