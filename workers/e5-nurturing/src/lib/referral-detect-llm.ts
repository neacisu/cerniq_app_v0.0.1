/**
 * referral-detect-llm.ts — Client LLM E5 Referral Detection (Plan §X FAZA 9f)
 *
 * POLITICA LLM (Anti-halucin. F):
 * - EXCLUSIV infraq.app/fast (Qwen2.5-14B) — NU Claude, NU QwQ-32B-AWQ
 * - Detectare mențiuni referral în mesaje client (entitate/persoană menționată)
 * - Returnează JSON structurat cu tip referral și confidence
 * - confidence < 0.6 → hasMention=false (prea incert, NU acționăm)
 * - LLM eșuează → hasMention=false (safe default — GDPR, NU aruncă excepție)
 *
 * Circuit breaker: createCircuitBreaker din @cerniq/worker-shared
 * Metrici: e5LlmRequestsTotal din ./e5-metrics.ts
 */

import OpenAI from "openai";
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";
import { e5LlmRequestsTotal } from "./e5-metrics.js";

// ── Environment ───────────────────────────────────────────────────────────────

const INFRAQ_BASE = process.env.INFRAQ_BASE ?? "https://infraq.app/llm/v1";
const INFRAQ_API_KEY = process.env.INFRAQ_API_KEY ?? "";

const FAST_MODEL = "Qwen/Qwen2.5-14B";

// ── OpenAI-compat client → infraq.app/fast ────────────────────────────────────

const fastClient = new OpenAI({
  baseURL: `${INFRAQ_BASE}/fast`,
  apiKey: INFRAQ_API_KEY || "no-key",
  timeout: 30_000,
  maxRetries: 0,
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReferralDetectionResult {
  hasMention: boolean;
  mentionedCompany?: string;
  mentionedPerson?: string;
  referralType: "EXPLICIT" | "SOFT_MENTION" | "NEIGHBOR_STRATEGY" | "GROUP_DEAL";
  confidence: number;
  context: string;
}

const CONFIDENCE_THRESHOLD = 0.6;

// ── Prompt helpers ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ești un specialist în detectarea referral-urilor în mesaje B2B agricole din România.
Analizează mesajul și detectează dacă clientul menționează o altă companie sau persoană pe care ar putea-o recomanda sau cu care ar putea fi conectat.

Tipuri de referral:
- EXPLICIT: clientul spune direct "vă recomand pe X" sau "știu o firmă interesată"
- SOFT_MENTION: menționează un vecin/prieten/coleg care ar putea fi interesat
- NEIGHBOR_STRATEGY: menționează o companie din zonă/județ cu context similar
- GROUP_DEAL: menționează interes colectiv (asociație, grup, cooperativă)

Returnează EXCLUSIV JSON valid cu structura:
{
  "has_mention": true|false,
  "mentioned_company": "Numele companiei dacă există, altfel null",
  "mentioned_person": "Numele persoanei dacă există, altfel null",
  "referral_type": "EXPLICIT|SOFT_MENTION|NEIGHBOR_STRATEGY|GROUP_DEAL",
  "confidence": <număr între 0.0 și 1.0>,
  "context": "<contextul mențiunii, max 200 caractere>"
}
IMPORTANT: Returnează DOAR JSON valid. Niciun text suplimentar. Dacă nu există nicio mențiune, returnează has_mention: false cu confidence 0.0.`;

function buildUserPrompt(text: string): string {
  const safeText = text.slice(0, 2000);
  return `Analizează dacă există vreo mențiune referral în mesajul următor:\n\n"${safeText}"`;
}

function parseJsonSafely(raw: string): Record<string, unknown> {
  const jsonMatch = /\{[\s\S]*\}/.exec(raw);
  if (!jsonMatch) throw new Error("No JSON block found in LLM response");
  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

function normalizeResult(parsed: Record<string, unknown>): ReferralDetectionResult {
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
  const hasMention = Boolean(parsed.has_mention) && confidence >= CONFIDENCE_THRESHOLD;

  const rawType = parsed.referral_type as string | undefined;
  const validTypes = ["EXPLICIT", "SOFT_MENTION", "NEIGHBOR_STRATEGY", "GROUP_DEAL"] as const;
  const referralType = validTypes.includes(rawType as (typeof validTypes)[number])
    ? (rawType as (typeof validTypes)[number])
    : "SOFT_MENTION";

  const rawContext = String(parsed.context ?? "").slice(0, 200);

  return {
    hasMention,
    mentionedCompany: parsed.mentioned_company ? String(parsed.mentioned_company) : undefined,
    mentionedPerson: parsed.mentioned_person ? String(parsed.mentioned_person) : undefined,
    referralType,
    confidence,
    context: rawContext,
  };
}

// ── Fallback result (safe default — NU aruncă excepție) ───────────────────────

function safeDefault(): ReferralDetectionResult {
  return {
    hasMention: false,
    referralType: "SOFT_MENTION",
    confidence: 0,
    context: "",
  };
}

// ── Core LLM call ─────────────────────────────────────────────────────────────

async function callFastLlm(text: string): Promise<ReferralDetectionResult> {
  if (!INFRAQ_API_KEY) throw new Error("Missing INFRAQ_API_KEY — cannot call infraq.app/fast");

  const response = await fastClient.chat.completions.create(
    {
      model: FAST_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(text) },
      ],
      temperature: 0.1,
      max_tokens: 256,
    },
    { signal: AbortSignal.timeout(25_000) },
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = parseJsonSafely(raw);
  return normalizeResult(parsed);
}

// ── Circuit breaker ───────────────────────────────────────────────────────────

const fastBreaker = createCircuitBreaker(callFastLlm, "infraq-referral-detect-e5", {
  timeout: 30_000,
  errorThresholdPercentage: 50,
  resetTimeout: 60_000,
  volumeThreshold: 3,
});

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * detectReferralMention — Detectează mențiuni referral în text mesaj client.
 * EXCLUSIV infraq.app/fast (Qwen2.5-14B) — NU Claude, NU QwQ-32B-AWQ (Anti-halucin. F).
 * La eșec sau confidence < 0.6 → hasMention=false (safe default, NU excepție).
 */
export async function detectReferralMention(text: string): Promise<ReferralDetectionResult> {
  if (!INFRAQ_API_KEY) {
    return safeDefault();
  }

  try {
    const result = await withExternalApiMetrics("infraq-referral-detect-e5", () =>
      fastBreaker.fire(text),
    );
    e5LlmRequestsTotal.inc({ model: FAST_MODEL, provider: "infraq", status: "success" });
    return result;
  } catch (err) {
    console.warn("[referral-detect-llm] Qwen2.5-14B failed, returning safe default:", err);
    e5LlmRequestsTotal.inc({ model: FAST_MODEL, provider: "infraq", status: "error" });
    return safeDefault();
  }
}
