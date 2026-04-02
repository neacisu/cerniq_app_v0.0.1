/**
 * churn-scoring-engine.ts — Formula ponderată deterministă churn scoring (Plan §X FAZA 9c)
 *
 * ChurnScore = Σ(signal_strength × weight × confidence)
 * Anti-halucin. (B): Churn scoring este DETERMINIST — NU folosește AI.
 * Anti-halucin. (F): Weights EXACTE din plan §X L2255-2259 — NU modifica.
 *
 * DO NOT modify CHURN_WEIGHTS without updating Plan §X and ADR-0098.
 */

// ---------------------------------------------------------------------------
// PONDERILE EXACTE din Plan §X L2255-2259 — immutable
// ---------------------------------------------------------------------------

export const CHURN_WEIGHTS: Readonly<Record<string, number>> = {
  COMMUNICATION_FADE: 0.15,
  NEGATIVE_SENTIMENT: 0.2,
  COMPETITOR_MENTION: 0.15,
  SUPPORT_ESCALATION: 0.1,
  ORDER_FREQUENCY_DROP: 0.15,
  PAYMENT_DELAY: 0.1,
  PRICE_COMPLAINT: 0.1,
  QUALITY_COMPLAINT: 0.05,
} as const;

export type ChurnSignalType = keyof typeof CHURN_WEIGHTS;

// Suma ponderilor trebuie să fie 1.0 — verificare la runtime la import
const weightSum = Object.values(CHURN_WEIGHTS).reduce((acc, w) => acc + w, 0);
if (Math.abs(weightSum - 1) > 0.001) {
  throw new Error(`CHURN_WEIGHTS sum = ${weightSum}, expected 1.0. Do not modify weights.`);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChurnSignalInput {
  signalType: string;
  strength: number; // 0-100
  confidence?: number; // 0.0-1.0 default 1.0 (rule-based = fully confident)
}

export interface ChurnScoreResult {
  score: number; // 0-100 (rounded integer)
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factorBreakdown: Record<string, { strength: number; weight: number; contribution: number }>;
  activeSignalCount: number;
}

// ---------------------------------------------------------------------------
// mapRiskLevel — mapping exact din Plan §X L2712
// 0-25=LOW, 26-50=MEDIUM, 51-75=HIGH, 76-100=CRITICAL
// ---------------------------------------------------------------------------

export function mapRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score <= 25) return "LOW";
  if (score <= 50) return "MEDIUM";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

// ---------------------------------------------------------------------------
// calculateChurnScore — Formula deterministă (fără AI)
// Anti-halucin. (B): NU modifica algoritmul
// ---------------------------------------------------------------------------

export function calculateChurnScore(signals: ChurnSignalInput[]): ChurnScoreResult {
  if (signals.length === 0) {
    return {
      score: 0,
      riskLevel: "LOW",
      factorBreakdown: {},
      activeSignalCount: 0,
    };
  }

  let rawScore = 0;
  const factorBreakdown: Record<
    string,
    { strength: number; weight: number; contribution: number }
  > = {};

  for (const signal of signals) {
    const weight = CHURN_WEIGHTS[signal.signalType];
    if (weight === undefined) continue; // semnal necunoscut — ignorat

    const confidence = signal.confidence ?? 1;
    const clampedStrength = Math.max(0, Math.min(100, signal.strength));
    const normalizedStrength = clampedStrength / 100; // normalizare 0-1

    const contribution = normalizedStrength * weight * confidence * 100;
    rawScore += contribution;

    // Agregare per tip semnal (mai multe semnale de același tip sumează)
    const existing = factorBreakdown[signal.signalType];
    if (existing) {
      existing.strength = Math.max(existing.strength, clampedStrength);
      existing.contribution += contribution;
    } else {
      factorBreakdown[signal.signalType] = {
        strength: clampedStrength,
        weight,
        contribution,
      };
    }
  }

  const score = Math.round(Math.min(100, Math.max(0, rawScore)));

  return {
    score,
    riskLevel: mapRiskLevel(score),
    factorBreakdown,
    activeSignalCount: signals.length,
  };
}

// ---------------------------------------------------------------------------
// computeSignalStrengths — calculează strength EXACT per tip semnal (Plan §X L2697-2704)
// Anti-halucin. (C): Signal detection este RULE-BASED — NU AI
// ---------------------------------------------------------------------------

export interface SignalStrengthInputs {
  daysSinceLastInteraction?: number;
  sentimentScore?: number; // -1.0..1.0
  mentionedCompetitors?: string[];
  escalationCountLast30d?: number;
  currentOrderFrequencyPerMonth?: number;
  averageOrderFrequencyPerMonth?: number;
  overdueDays?: number;
  topics?: string[];
}

export interface DetectedSignal {
  signalType: ChurnSignalType;
  strength: number;
  confidence: number;
}

/**
 * SIGNAL_DETECTORS — tabel data-driven pentru detecția deterministă a semnalelor.
 * Fiecare entry returnează strength (0-100) dacă condiția e îndeplinită, sau null.
 * Anti-halucin. (C): RULE-BASED, fără AI — formule EXACTE din Plan §X L2697-2704.
 * Pattern data-driven reduce cognitive complexity (SonarLint S3776 ≤15).
 */
const SIGNAL_DETECTORS: ReadonlyArray<{
  readonly signalType: ChurnSignalType;
  readonly detect: (i: SignalStrengthInputs) => number | null;
}> = [
  {
    signalType: "COMMUNICATION_FADE",
    detect: (i) =>
      i.daysSinceLastInteraction !== undefined && i.daysSinceLastInteraction > 30
        ? Math.min(100, i.daysSinceLastInteraction * 2)
        : null,
  },
  {
    signalType: "NEGATIVE_SENTIMENT",
    detect: (i) =>
      i.sentimentScore !== undefined && i.sentimentScore < -0.3
        ? Math.round(Math.abs(i.sentimentScore) * 100)
        : null,
  },
  {
    signalType: "COMPETITOR_MENTION",
    detect: (i) => (i.mentionedCompetitors && i.mentionedCompetitors.length > 0 ? 75 : null),
  },
  {
    signalType: "SUPPORT_ESCALATION",
    detect: (i) =>
      i.escalationCountLast30d !== undefined && i.escalationCountLast30d > 2
        ? Math.min(100, 50 + i.escalationCountLast30d * 10)
        : null,
  },
  {
    signalType: "ORDER_FREQUENCY_DROP",
    detect: (i) => {
      if (
        i.currentOrderFrequencyPerMonth === undefined ||
        i.averageOrderFrequencyPerMonth === undefined ||
        i.averageOrderFrequencyPerMonth <= 0
      )
        return null;
      const ratio = i.currentOrderFrequencyPerMonth / i.averageOrderFrequencyPerMonth;
      return ratio < 0.5 ? Math.round(Math.min(100, (1 - ratio) * 100)) : null;
    },
  },
  {
    signalType: "PAYMENT_DELAY",
    detect: (i) =>
      i.overdueDays !== undefined && i.overdueDays > 0 ? Math.min(100, i.overdueDays * 5) : null,
  },
  {
    signalType: "PRICE_COMPLAINT",
    detect: (i) => (i.topics?.includes("price") ? 60 : null),
  },
  {
    signalType: "QUALITY_COMPLAINT",
    detect: (i) => (i.topics?.includes("quality") ? 50 : null),
  },
] as const;

export function computeSignalStrengths(inputs: SignalStrengthInputs): DetectedSignal[] {
  return SIGNAL_DETECTORS.flatMap((detector) => {
    const strength = detector.detect(inputs);
    return strength === null ? [] : [{ signalType: detector.signalType, strength, confidence: 1 }];
  });
}
