import type { Counter, Histogram } from "prom-client";

export interface SemanticEntropyConfig {
  temperatures: number[];
  similarityThreshold: number;
  maxRetries: number;
}

export interface CompletionFn {
  (prompt: string, options: { temperature: number; maxTokens: number }): Promise<string>;
}

export interface EmbeddingFn {
  (text: string): Promise<number[]>;
}

export interface EntropyResult {
  isConsistent: boolean;
  entropy: number;
  responses: string[];
  similarities: number[];
  consensusResponse: string | null;
  decision: "consistent" | "uncertain" | "hallucination_risk";
}

const DEFAULT_CONFIG: SemanticEntropyConfig = {
  temperatures: [0.1, 0.3, 0.7],
  similarityThreshold: 0.85,
  maxRetries: 2,
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function selectConsensus(
  responses: string[],
  similarities: number[],
  threshold: number,
): string | null {
  const pairCount = similarities.length;
  const agreeing = similarities.filter((s) => s >= threshold).length;
  if (agreeing >= pairCount * 0.5) {
    return responses[0];
  }
  return null;
}

export function createSemanticEntropyChecker(
  completionFn: CompletionFn,
  embeddingFn: EmbeddingFn,
  config: Partial<SemanticEntropyConfig> = {},
  metricsOpts?: {
    checksTotal?: Counter;
    hallucinationsDetected?: Counter;
    latencySeconds?: Histogram;
  },
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  async function checkWithEntropy(
    prompt: string,
    maxTokens: number = 1024,
  ): Promise<EntropyResult> {
    const startMs = Date.now();
    metricsOpts?.checksTotal?.inc();

    const responses: string[] = [];
    for (const temp of cfg.temperatures) {
      let retries = 0;
      while (retries <= cfg.maxRetries) {
        try {
          const response = await completionFn(prompt, {
            temperature: temp,
            maxTokens,
          });
          responses.push(response);
          break;
        } catch {
          retries++;
          if (retries > cfg.maxRetries) {
            responses.push("");
          }
        }
      }
    }

    const validResponses = responses.filter((r) => r.length > 0);
    if (validResponses.length < 2) {
      metricsOpts?.latencySeconds?.observe((Date.now() - startMs) / 1000);
      return {
        isConsistent: false,
        entropy: 1.0,
        responses,
        similarities: [],
        consensusResponse: validResponses[0] ?? null,
        decision: "uncertain",
      };
    }

    const embeddings = await Promise.all(validResponses.map((r) => embeddingFn(r)));

    const similarities: number[] = [];
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        similarities.push(cosineSimilarity(embeddings[i], embeddings[j]));
      }
    }

    const avgSimilarity =
      similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0;

    const entropy = 1.0 - avgSimilarity;
    const isConsistent = avgSimilarity >= cfg.similarityThreshold;

    let decision: EntropyResult["decision"];
    if (avgSimilarity >= cfg.similarityThreshold) {
      decision = "consistent";
    } else if (avgSimilarity >= cfg.similarityThreshold * 0.7) {
      decision = "uncertain";
    } else {
      decision = "hallucination_risk";
      metricsOpts?.hallucinationsDetected?.inc();
    }

    const consensusResponse = selectConsensus(
      validResponses,
      similarities,
      cfg.similarityThreshold,
    );

    metricsOpts?.latencySeconds?.observe((Date.now() - startMs) / 1000);

    return {
      isConsistent,
      entropy,
      responses: validResponses,
      similarities,
      consensusResponse,
      decision,
    };
  }

  return { checkWithEntropy };
}

export const CRITICAL_DECISION_PATTERNS = [
  "credit_borderline",
  "discount_above_30",
  "negotiation_closing",
  "risk_override",
] as const;

export type CriticalDecisionType = (typeof CRITICAL_DECISION_PATTERNS)[number];

export function isCriticalDecision(decisionType: string): decisionType is CriticalDecisionType {
  return CRITICAL_DECISION_PATTERNS.includes(decisionType as CriticalDecisionType);
}
