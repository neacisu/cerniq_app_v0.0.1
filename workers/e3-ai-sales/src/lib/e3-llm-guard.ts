/**
 * Pre/post LLM Guard pentru E3 — Plan §XIII (infraq.app/guard) + strat local rapid.
 *
 * - Strat local (regex): apărare în profunzime + teste Vitest fără INFRAQ_GUARD_TOKEN.
 * - În producție (fără VITEST): după trecerea locală, scanPrompt / scanOutput reale.
 */

import { scanOutput, scanPrompt } from "@cerniq/worker-shared";

/** Pattern-uri aliniate cu vechile verificări B7/K61/J56 (comportament teste păstrat). */
const LOCAL_DENY_PATTERNS: readonly RegExp[] = [
  /ignore.*previous.*instruction/i,
  /system.*prompt.*override/i,
  /system.*prompt/i,
  /forget.*everything/i,
  /<script[\s>]/i,
  /<script/i,
  /union\s+select/i,
  /union.*select/i,
  /drop\s+table/i,
  /drop.*table/i,
  /jailbreak/i,
  /act\s+as\s+if/i,
];

function skipRemoteGuard(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

function localBlocked(text: string): boolean {
  return LOCAL_DENY_PATTERNS.some((p) => p.test(text));
}

export async function e3ScanPromptBeforeLlm(text: string): Promise<{
  blocked: boolean;
  reason?: string;
}> {
  if (localBlocked(text)) {
    return { blocked: true, reason: "guard_blocked" };
  }
  if (skipRemoteGuard()) {
    return { blocked: false };
  }
  const r = await scanPrompt(text.slice(0, 32_000));
  if (!r.is_valid) return { blocked: true, reason: "guard_blocked" };
  return { blocked: false };
}

export async function e3ScanOutputAfterLlm(
  promptForGuard: string,
  modelOutput: string,
): Promise<{ blocked: boolean; reason?: string }> {
  if (skipRemoteGuard()) {
    return { blocked: false };
  }
  const r = await scanOutput(promptForGuard.slice(0, 8000), modelOutput.slice(0, 32_000));
  if (!r.is_valid) return { blocked: true, reason: "guard_blocked_output" };
  return { blocked: false };
}
