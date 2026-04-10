/**
 * Rutare model LLM pentru workerii E2 outreach — citește `cognitive_node_configs.configOverrides`.
 *
 * `configOverrides.preferredModel` sau `preferredOutreachLlmModel`:
 * - `VLLM_FAST` (implicit) → gateway `/fast` (Qwen2.5-14B)
 * - `VLLM_REASONING` → gateway `/reasoning` (QwQ-32B)
 * - `ANTHROPIC` → echivalent calitate ridicată pe infra self-hosted: **reasoning** (nu există apel direct Anthropic în workerii outreach).
 */

import type OpenAI from "openai";
import { resolveNodeConfig } from "./cognitive-helpers.js";
import {
  fastClient,
  reasoningClient,
  INFRAQ_FAST_MODEL,
  INFRAQ_REASONING_MODEL,
} from "./llm-client.js";

/** Chei catalog `packages/shared` — aliniat la cognitive-node-catalog.ts */
export const OUTREACH_NODE_SENTIMENT = "e2:ai:sentiment-analyze" as const;
export const OUTREACH_NODE_RESPONSE = "e2:ai:response-generate" as const;

export type OutreachLlmRoute = {
  readonly client: OpenAI;
  readonly model: string;
  readonly preference: "VLLM_FAST" | "VLLM_REASONING" | "ANTHROPIC";
};

function normalizePreferredModel(raw: unknown): "VLLM_FAST" | "VLLM_REASONING" | "ANTHROPIC" {
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (s === "VLLM_REASONING") return "VLLM_REASONING";
  if (s === "ANTHROPIC") return "ANTHROPIC";
  if (s === "VLLM_FAST" || s === "") return "VLLM_FAST";
  return "VLLM_FAST";
}

/** Pure — util în teste fără DB. */
export function outreachPreferenceToClient(pref: string | undefined): OutreachLlmRoute {
  const p = normalizePreferredModel(pref);
  if (p === "VLLM_REASONING") {
    return { client: reasoningClient, model: INFRAQ_REASONING_MODEL, preference: "VLLM_REASONING" };
  }
  if (p === "ANTHROPIC") {
    return { client: reasoningClient, model: INFRAQ_REASONING_MODEL, preference: "ANTHROPIC" };
  }
  return { client: fastClient, model: INFRAQ_FAST_MODEL, preference: "VLLM_FAST" };
}

export async function resolveOutreachLlmRouting(
  tenantId: string,
  nodeKey: typeof OUTREACH_NODE_SENTIMENT | typeof OUTREACH_NODE_RESPONSE,
): Promise<OutreachLlmRoute> {
  const row = await resolveNodeConfig(nodeKey, tenantId);
  const overrides = (row?.configOverrides ?? {}) as Record<string, unknown>;
  const raw = overrides.preferredModel ?? overrides.preferredOutreachLlmModel;
  return outreachPreferenceToClient(typeof raw === "string" ? raw : undefined);
}
