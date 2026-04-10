/**
 * Screening opțional entropie semantică pentru reasoning E3 (multi-eșantion + embeddings).
 * Activare: CERNIQ_SEMANTIC_ENTROPY_ENABLED=true — cost suplimentar (N apeluri reasoning).
 */
import {
  createSemanticEntropyChecker,
  embeddingsClient,
  hallucinationFlaggedTotal,
  INFRAQ_EMBEDDINGS_MODEL,
  INFRAQ_REASONING_MODEL,
  reasoningClient,
  semanticEntropyScore,
} from "@cerniq/worker-shared";

const EMBED_DIM = 3072;

export async function runOptionalSemanticEntropyReasoningScreen(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<void> {
  if (process.env.CERNIQ_SEMANTIC_ENTROPY_ENABLED !== "true") return;

  const maxTokens = Math.min(options.maxTokens ?? 512, 1024);
  const checker = createSemanticEntropyChecker(
    async (_prompt, opts) => {
      const response = await reasoningClient.chat.completions.create(
        {
          model: INFRAQ_REASONING_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: opts.temperature,
          max_tokens: opts.maxTokens,
        },
        { signal: AbortSignal.timeout(options.timeoutMs ?? 90_000) },
      );
      return response.choices[0]?.message?.content ?? "";
    },
    async (text: string) => {
      const response = await embeddingsClient.embeddings.create({
        model: INFRAQ_EMBEDDINGS_MODEL,
        input: text,
      });
      const embedding = response.data[0]?.embedding;
      if (embedding?.length !== EMBED_DIM) {
        throw new Error(`embeddings for entropy: expected ${EMBED_DIM} dims`);
      }
      return embedding;
    },
    { temperatures: [0.1, 0.3, 0.7], similarityThreshold: 0.85, maxRetries: 1 },
    {
      entropyHistogram: semanticEntropyScore,
      entropyLabels: { model: INFRAQ_REASONING_MODEL, task_type: "e3_reasoning" },
      hallucinationFlagged: hallucinationFlaggedTotal,
      hallucinationLabels: { model: INFRAQ_REASONING_MODEL, action: "log" },
    },
  );

  const prompt = `${systemPrompt.slice(0, 4000)}\n---\n${userPrompt.slice(0, 8000)}`;
  const result = await checker.checkWithEntropy(prompt, maxTokens);
  if (result.decision === "hallucination_risk") {
    console.warn("[e3-semantic-entropy] hallucination_risk", {
      entropy: result.entropy,
      model: INFRAQ_REASONING_MODEL,
    });
  }
}
