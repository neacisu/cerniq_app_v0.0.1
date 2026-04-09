/**
 * Multi-model consensus voting — Plan §XVI.A (high-stakes).
 * Modele: exclusiv Qwen pe infraq.app (`llm-client.ts` — același contract ca Plan L9498-9503).
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  fastClient,
  INFRAQ_FAST_MODEL,
  INFRAQ_REASONING_MODEL,
  reasoningClient,
} from "./llm-client.js";
import {
  type ConsensusChatMessage,
  type ConsensusModelRunner,
  consensusStructuredVote,
} from "./llm-fallback.js";

export interface VoteRequest {
  taskId: string;
  tenantId: string;
  prompt: string;
  context: Record<string, unknown>;
  /** Ignorat pentru execuție: votul folosește doar runner-ii Qwen infraq (politică anti–vendor-lock). */
  models: Array<{ endpoint: string; model: string; weight: number }>;
  /** Prag majoritate în (0,1]; implicit 2/3. */
  threshold?: number;
  /** Etichetă metrică / audit (ex. discount_gt_30). */
  triggerLabel?: string;
}

export interface VoteResult {
  decision: string;
  confidence: number;
  /** Toate răspunsurile modelelor (inclusiv la divergență) — pentru audit `all_responses`. */
  votes: Array<{ model: string; response: string; latency_ms: number }>;
  consensus: boolean;
  escalateHitl: boolean;
  /** Primul model din bucket-ul majoritar (doar dacă `consensus`). */
  winningModel?: string;
}

const defaultConsensusSchema = z.object({
  decision: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

function openAiMessagesFromConsensus(msgs: ConsensusChatMessage[]): {
  system: string;
  user: string;
} {
  const system = msgs.find((m) => m.role === "system")?.content ?? "";
  const user = msgs
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");
  return { system, user };
}

/**
 * Trei voturi independente: QwQ-32B (reasoning) + Qwen2.5-14B x2 (apeluri distincte).
 * Fără Gemini/DeepSeek/OpenAI — conform planului.
 */
export function buildQwenInfraqConsensusModelRunners(): ConsensusModelRunner[] {
  const runReasoning = async (msgs: ConsensusChatMessage[]): Promise<string> => {
    const { system, user } = openAiMessagesFromConsensus(msgs);
    const res = await reasoningClient.chat.completions.create({
      model: INFRAQ_REASONING_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });
    return res.choices[0]?.message?.content ?? "";
  };

  const runFast = async (msgs: ConsensusChatMessage[]): Promise<string> => {
    const { system, user } = openAiMessagesFromConsensus(msgs);
    const res = await fastClient.chat.completions.create({
      model: INFRAQ_FAST_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });
    return res.choices[0]?.message?.content ?? "";
  };

  return [
    { id: `${INFRAQ_REASONING_MODEL}#1`, generateText: runReasoning },
    { id: `${INFRAQ_FAST_MODEL}#2`, generateText: runFast },
    { id: `${INFRAQ_FAST_MODEL}#3`, generateText: runFast },
  ];
}

function promptHashSha256(prompt: string): string {
  return createHash("sha256").update(prompt, "utf8").digest("hex");
}

/**
 * Rulează votul structurat (Zod + majoritate 2/3) și întoarce rezultatul agregat pentru worker.
 */
export async function runConsensusVotePipeline(params: {
  readonly request: VoteRequest;
  readonly onDivergence?: (detail: string) => Promise<void>;
}): Promise<VoteResult> {
  const { request, onDivergence } = params;
  const trigger = request.triggerLabel ?? "consensus_vote";
  const models = buildQwenInfraqConsensusModelRunners();

  const systemPrompt = `You are a deterministic decision assistant. Reply with a single JSON object only, no markdown, no prose:
{"decision":"<short canonical decision string>","confidence":0.0}
confidence is optional between 0 and 1.`;

  const userBody = `${request.prompt}\n\ncontext_json: ${JSON.stringify(request.context)}`;

  const messages: ConsensusChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userBody },
  ];

  const ratio =
    request.threshold !== undefined && request.threshold > 0 && request.threshold <= 1
      ? request.threshold
      : 2 / 3;

  const outcome = await consensusStructuredVote({
    schema: defaultConsensusSchema,
    messages,
    models,
    triggerLabel: trigger,
    onDivergence,
    majorityRatio: ratio,
  });

  const traceList = outcome.ok ? outcome.modelTraces : (outcome.modelTraces ?? []);
  const votesFromTraces = traceList.map((t) => ({
    model: t.modelId,
    response: t.raw,
    latency_ms: t.latency_ms,
  }));

  if (!outcome.ok) {
    return {
      decision: "",
      confidence: 0,
      votes: votesFromTraces,
      consensus: false,
      escalateHitl: true,
    };
  }

  const confidence = outcome.value.confidence ?? 0.8;

  return {
    decision: outcome.value.decision,
    confidence,
    votes: votesFromTraces,
    consensus: true,
    escalateHitl: false,
    winningModel: outcome.agreeingModelIds[0],
  };
}

export { promptHashSha256 };
