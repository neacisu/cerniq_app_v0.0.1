/**
 * Validare structurată JSON pentru răspunsuri LLM (Plan anti-hallucination / ADR-0073).
 * Complementar față de `llm-guard.ts` (scan infraq) — aici Zod + regenerare cu mesaj de corecție.
 */

import type { ZodType } from "zod";
import { llmRegenerationAttempts } from "./metrics.js";

const GUARD_LABEL = "structured_json" as const;

/** Eșec după `maxAttempts` runde de apel LLM + validare (workerul poate escalada la HUMAN_REVIEW). */
export class LlmStructuredOutputExhaustedError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly lastRawSnippet?: string,
  ) {
    super(message);
    this.name = "LlmStructuredOutputExhaustedError";
  }
}

export function stripLlmJsonFences(text: string): string {
  return text.replaceAll(/```(?:json)?/gi, "").trim();
}

/**
 * Parse JSON din text (opțional în fence-uri); aruncă dacă nu e obiect JSON.
 */
export function parseJsonObjectFromLlmText(text: string): unknown {
  const cleaned = stripLlmJsonFences(text);
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("LLM output: no JSON object found");
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  }
}

export type ValidatedJsonAttemptResult<T> =
  | { ok: true; data: T; raw: string }
  | { ok: false; error: string; raw: string };

/**
 * O singură încercare: extrage JSON, validează cu Zod.
 */
export function tryParseAndValidateJson<T>(
  raw: string,
  schema: ZodType<T>,
): ValidatedJsonAttemptResult<T> {
  let parsed: unknown;
  try {
    parsed = parseJsonObjectFromLlmText(raw);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      raw: raw.slice(0, 500),
    };
  }
  const r = schema.safeParse(parsed);
  if (!r.success) {
    return { ok: false, error: r.error.message, raw: raw.slice(0, 500) };
  }
  return { ok: true, data: r.data, raw };
}

/** Alias plan `validateLLMOutput` — o singură rundă, fără retry. */
export function validateLlmJsonOutput<T>(raw: string, schema: ZodType<T>): T {
  const res = tryParseAndValidateJson(raw, schema);
  if (!res.ok) {
    throw new Error(res.error);
  }
  return res.data;
}

export type GenerateValidatedJsonParams<T> = {
  readonly schema: ZodType<T>;
  /** Număr maxim de runde LLM (implicit 3 — Plan M71-M75). */
  readonly maxAttempts?: number;
  /** Prima rundă fără sufix; rundele următoare primesc `correctionHint` din eșecul anterior. */
  readonly generateRaw: (ctx: { attempt: number; correctionHint?: string }) => Promise<string>;
};

/**
 * Buclă: generează text → parse+Zod; la eșec, reîncearcă cu hint de corecție (max N).
 */
export async function generateValidatedJsonWithRetries<T>(
  params: GenerateValidatedJsonParams<T>,
): Promise<T> {
  const max = params.maxAttempts ?? 3;
  let lastErr = "unknown";
  let lastSnippet = "";

  for (let attempt = 1; attempt <= max; attempt++) {
    const correctionHint = attempt > 1 ? lastErr : undefined;
    const raw = await params.generateRaw({ attempt, correctionHint });
    lastSnippet = raw.slice(0, 800);
    const res = tryParseAndValidateJson(raw, params.schema);
    if (res.ok) {
      if (attempt > 1) {
        llmRegenerationAttempts.observe({ guardrail_type: GUARD_LABEL }, attempt - 1);
      }
      return res.data;
    }
    lastErr = res.error;
  }

  llmRegenerationAttempts.observe({ guardrail_type: GUARD_LABEL }, max - 1);
  throw new LlmStructuredOutputExhaustedError(
    `LLM JSON validation exhausted after ${max} attempts: ${lastErr}`,
    max,
    lastSnippet,
  );
}
