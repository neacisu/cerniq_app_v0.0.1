/**
 * LLM Guard — scanare pre/post conform gateway infraq.app (Plan §XIII L2576-2592).
 *
 * Contract API: docs/architecture/Self_hosted_LLM_Registry_manifest.md (guardrails)
 * - POST /analyze/prompt  body: { prompt }
 * - POST /analyze/output body: { prompt, output }
 *
 * Business guardrails M71-M75 (deterministe, DB) sunt în workers/e3-ai-sales/src/lib/guardrails.ts;
 * aici expunem callback opțional `runBusinessGuardrails` în `guardedLLMCall` ca să nu importăm @cerniq/db în shared.
 */

import { z } from "zod";
import { infraqGuardFetch, infraqGuardUrl } from "./llm-client.js";
import {
  llmGuardLatencySeconds,
  llmGuardViolationsTotal,
  llmRegenerationAttempts,
} from "./metrics.js";

// ── Schema răspuns (manifest — response_example) ─────────────────────────────

const guardScanResponseSchema = z.object({
  is_valid: z.boolean(),
  scanners: z.record(z.string(), z.number()).optional(),
});

export type LlmGuardScanResult = z.infer<typeof guardScanResponseSchema> & {
  readonly raw?: unknown;
};

export type ScanLlmGuardOptions = {
  /** Dacă false, nu trimite la rețea (teste / dry-run). */
  readonly remote?: boolean;
  /** Timeout HTTP ms (default 10s, Plan guard). */
  readonly timeoutMs?: number;
};

function recordViolationsForInvalidScan(
  scanners: Record<string, number> | undefined,
  isInput: boolean,
): void {
  const label = isInput ? "true" : "false";
  const keys = scanners && Object.keys(scanners).length > 0 ? Object.keys(scanners) : ["unknown"];
  for (const scanner_name of keys) {
    llmGuardViolationsTotal.inc({ scanner_name, is_input: label });
  }
}

async function postGuardJson(
  path: "analyze/prompt" | "analyze/output",
  body: Record<string, string>,
  timeoutMs: number,
): Promise<unknown> {
  const url = infraqGuardUrl(path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await infraqGuardFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`LLM Guard returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      throw new Error(
        `LLM Guard HTTP ${res.status}: ${typeof json === "object" && json && "detail" in json ? String((json as { detail?: unknown }).detail) : text.slice(0, 200)}`,
      );
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Scanare input înainte de apel LLM (PromptInjection, BanTopics, Toxicity, Anonymize).
 */
export async function scanPrompt(
  text: string,
  options: ScanLlmGuardOptions = {},
): Promise<LlmGuardScanResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const phase = "prompt_scan";

  if (options.remote === false) {
    return { is_valid: true, scanners: {}, raw: { skipped: true } };
  }

  const t0 = process.hrtime.bigint();
  try {
    const raw = await postGuardJson("analyze/prompt", { prompt: text }, timeoutMs);
    const parsed = guardScanResponseSchema.safeParse(raw);
    if (!parsed.success) {
      llmGuardViolationsTotal.inc({ scanner_name: "parse_error", is_input: "true" });
      throw new Error(`LLM Guard prompt scan: invalid response shape`);
    }
    const result = { ...parsed.data, raw };
    if (!result.is_valid) {
      recordViolationsForInvalidScan(result.scanners, true);
    }
    return result;
  } finally {
    llmGuardLatencySeconds.observe({ phase }, Number(process.hrtime.bigint() - t0) / 1e9);
  }
}

/**
 * Scanare output după generare (Sensitive, Toxicity, Relevance, Deanonymize).
 */
export async function scanOutput(
  prompt: string,
  output: string,
  options: ScanLlmGuardOptions = {},
): Promise<LlmGuardScanResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const phase = "output_scan";

  if (options.remote === false) {
    return { is_valid: true, scanners: {}, raw: { skipped: true } };
  }

  const t0 = process.hrtime.bigint();
  try {
    const raw = await postGuardJson("analyze/output", { prompt, output }, timeoutMs);
    const parsed = guardScanResponseSchema.safeParse(raw);
    if (!parsed.success) {
      llmGuardViolationsTotal.inc({ scanner_name: "parse_error", is_input: "false" });
      throw new Error(`LLM Guard output scan: invalid response shape`);
    }
    const result = { ...parsed.data, raw };
    if (!result.is_valid) {
      recordViolationsForInvalidScan(result.scanners, false);
    }
    return result;
  } finally {
    llmGuardLatencySeconds.observe({ phase }, Number(process.hrtime.bigint() - t0) / 1e9);
  }
}

// ── guardedLLMCall ───────────────────────────────────────────────────────────

export type GuardedChatMessage = {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
};

export type GuardedLlmCallParams = {
  /** Textul utilizatorului (scanat la prompt). */
  readonly userPrompt: string;
  readonly systemPrompt?: string;
  /** Generează răspunsul modelului; de obicei fastClient / reasoningClient. */
  readonly llmGenerate: (messages: GuardedChatMessage[]) => Promise<string>;
  /** Max regenerări după eșec scan output (Plan: 3). */
  readonly maxOutputRegenerations?: number;
  readonly scanOptions?: ScanLlmGuardOptions;
  /**
   * După succes LLM Guard output — verificări M71-M75 sau alte reguli deterministe.
   * Returnează passed=false pentru a forța regenerare (se numără la același buget maxOutputRegenerations).
   */
  readonly runBusinessGuardrails?: (ctx: {
    readonly userPrompt: string;
    readonly output: string;
  }) => Promise<{ readonly passed: boolean; readonly reason?: string }>;
};

export type GuardedLlmCallOk = {
  readonly ok: true;
  readonly output: string;
  /** Număr total de apeluri llmGenerate (1 + regenerări). */
  readonly llmCalls: number;
  readonly outputRegenerations: number;
};

export type GuardedLlmCallFail = {
  readonly ok: false;
  readonly reason: "prompt_blocked" | "output_blocked" | "business_guardrail_exhausted";
  readonly lastScan?: LlmGuardScanResult;
  readonly businessReason?: string;
  readonly llmCalls: number;
};

export type GuardedLlmCallResult = GuardedLlmCallOk | GuardedLlmCallFail;

function buildMessages(
  systemPrompt: string | undefined,
  userPrompt: string,
  extras: GuardedChatMessage[],
): GuardedChatMessage[] {
  const base: GuardedChatMessage[] = [];
  if (systemPrompt?.trim()) {
    base.push({ role: "system", content: systemPrompt.trim() });
  }
  base.push({ role: "user", content: userPrompt });
  return [...base, ...extras];
}

const OUTPUT_REJECT_USER_MSG =
  "Răspunsul a fost respins de filtrele automate de siguranță. Regenerează un răspuns respectând politicile (fără date sensibile nepermise, fără conținut dăunător). Răspunde doar cu varianta corectată.";

type RoundOutcome =
  | { kind: "success"; output: string }
  | { kind: "retry_output"; output: string; scan: LlmGuardScanResult }
  | { kind: "retry_business"; output: string; reason?: string };

async function runOneGuardedRound(
  params: GuardedLlmCallParams,
  extras: GuardedChatMessage[],
  scanOpts: ScanLlmGuardOptions,
): Promise<RoundOutcome> {
  const messages = buildMessages(params.systemPrompt, params.userPrompt, extras);
  const output = await params.llmGenerate(messages);
  const post = await scanOutput(params.userPrompt, output, scanOpts);
  if (!post.is_valid) {
    return { kind: "retry_output", output, scan: post };
  }
  if (params.runBusinessGuardrails) {
    const biz = await params.runBusinessGuardrails({ userPrompt: params.userPrompt, output });
    if (!biz.passed) {
      return { kind: "retry_business", output, reason: biz.reason };
    }
  }
  return { kind: "success", output };
}

/**
 * Flux: scan prompt → LLM → scan output → (opțional business guardrails) →
 * la eșec: mesaj de corecție + regenerare până la `maxOutputRegenerations`.
 */
export async function guardedLLMCall(params: GuardedLlmCallParams): Promise<GuardedLlmCallResult> {
  const maxOut = params.maxOutputRegenerations ?? 3;
  const scanOpts = params.scanOptions ?? {};

  const pre = await scanPrompt(params.userPrompt, scanOpts);
  if (!pre.is_valid) {
    return { ok: false, reason: "prompt_blocked", lastScan: pre, llmCalls: 0 };
  }

  let extras: GuardedChatMessage[] = [];
  let llmCalls = 0;
  let outputRegenerations = 0;

  for (let attempt = 0; attempt <= maxOut; attempt++) {
    const round = await runOneGuardedRound(params, extras, scanOpts);
    llmCalls += 1;

    if (round.kind === "success") {
      return { ok: true, output: round.output, llmCalls, outputRegenerations };
    }

    if (round.kind === "retry_output") {
      outputRegenerations += 1;
      llmRegenerationAttempts.observe({ guardrail_type: "llm_guard_output" }, outputRegenerations);
      if (attempt >= maxOut) {
        return {
          ok: false,
          reason: "output_blocked",
          lastScan: round.scan,
          llmCalls,
        };
      }
      extras = [
        { role: "assistant", content: round.output },
        { role: "user", content: OUTPUT_REJECT_USER_MSG },
      ];
      continue;
    }

    outputRegenerations += 1;
    llmRegenerationAttempts.observe({ guardrail_type: "business_m71_m75" }, outputRegenerations);
    if (attempt >= maxOut) {
      return {
        ok: false,
        reason: "business_guardrail_exhausted",
        businessReason: round.reason,
        llmCalls,
      };
    }
    extras = [
      { role: "assistant", content: round.output },
      {
        role: "user",
        content: `Validarea business a respins răspunsul: ${round.reason ?? "policy"}. Corectează răspunsul conform datelor oficiale și regulilor de preț/stoc/discount/SKU/fiscal.`,
      },
    ];
  }

  return { ok: false, reason: "output_blocked", llmCalls };
}
