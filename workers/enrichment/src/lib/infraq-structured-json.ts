/**
 * Apel JSON structurat pe infraq.app reasoning (QwQ-32B), cu lanț frontier complet (Plan §XIII).
 * Date companie pot include CUI — rămân pe self-hosted cât timp primarul reușește.
 *
 * I14 — Observabilitate: `createServiceLogger` + `callExternalApi("infraq-reasoning")` (metrici/breaker).
 */
import { createServiceLogger } from "@cerniq/observability";
import {
  INFRAQ_REASONING_MODEL,
  reasoningClient,
  withLlmFallbackChain,
  buildFrontierStructuredJsonRecordFallbackSteps,
  callExternalApi,
} from "@cerniq/worker-shared";

const log = createServiceLogger("infraq-structured-json", { etapa: "e1" });

function stripJsonMarkdown(raw: string): string {
  return raw.replaceAll(/```(?:json)?/gi, "").trim();
}

/**
 * Încearcă QwQ-32B pe infraq (response JSON); la eșec, factory frontier (xAI → … → DeepSeek).
 */
export async function infraqStructuredJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  const frontier = buildFrontierStructuredJsonRecordFallbackSteps(systemPrompt, userPrompt).map(
    (f) => ({
      name: f.name,
      run: f.run,
    }),
  );

  return withLlmFallbackChain({
    primary: async () =>
      callExternalApi("infraq-reasoning", async () => {
        const t0 = performance.now();
        log.info({ event: "infraq_reasoning_start", model: INFRAQ_REASONING_MODEL });
        try {
          const response = await reasoningClient.chat.completions.create(
            {
              model: INFRAQ_REASONING_MODEL,
              temperature: 0.1,
              max_tokens: 3000,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            },
            { signal: AbortSignal.timeout(120_000) },
          );
          const content = response.choices[0]?.message?.content ?? "{}";
          const cleaned = stripJsonMarkdown(content);
          const parsed = JSON.parse(cleaned) as Record<string, unknown>;
          const usage = response.usage;
          log.info({
            event: "infraq_reasoning_success",
            latencyMs: Math.round(performance.now() - t0),
            promptTokens: usage?.prompt_tokens,
            completionTokens: usage?.completion_tokens,
          });
          return parsed;
        } catch (err) {
          log.error({
            event: "infraq_reasoning_failed",
            latencyMs: Math.round(performance.now() - t0),
            err,
          });
          throw err;
        }
      }),
    fallbacks: frontier,
    dataSensitivity: "non_sensitive",
  });
}
