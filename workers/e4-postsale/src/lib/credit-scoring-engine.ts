/**
 * credit-scoring-engine.ts — Formula deterministă 100p pentru credit scoring
 *
 * IMPORTANT: Credit scoring este DETERMINIST — NU se folosește LLM/AI.
 * Formula ponderată (Plan FAZA 8d §IX L2063-2069):
 *
 *   creditScore = anafStatus(15) + financialHealth(30) + bpiStatus(20)
 *               + paymentHistory(25) + litigation(10)
 *   max = 100p
 *
 * Risk tier → Credit limit (Plan L2070):
 *   BLOCKED  (0-19):  0 RON
 *   LOW      (20-39): 5.000 RON
 *   MEDIUM   (40-59): 20.000 RON
 *   HIGH     (60-79): 50.000 RON
 *   PREMIUM  (80-100): 100.000 RON
 */

import type { AnafCreditData } from "./anaf-client.js";
import type { TermeneBilantParsed, TermeneDosareParsed } from "./termene-client.js";

// ── Constante ─────────────────────────────────────────────────────────────────

export const CREDIT_LIMIT_MAP = {
  BLOCKED: 0,
  LOW: 5_000,
  MEDIUM: 20_000,
  HIGH: 50_000,
  PREMIUM: 100_000,
} as const;

export const HITL_THRESHOLD_RON = 50_000;

export type RiskTier = keyof typeof CREDIT_LIMIT_MAP;

// ── Input types ───────────────────────────────────────────────────────────────

export type PaymentHistoryInput = {
  totalOrders: number;
  onTimeOrders: number;
};

export type CreditScoreComponents = {
  anafStatus: number;
  financialHealth: number;
  bpiStatus: number;
  paymentHistory: number;
  litigation: number;
};

export type CreditScoreResult = {
  score: number;
  riskTier: RiskTier;
  creditLimit: number;
  components: CreditScoreComponents;
};

// ── Componenta 1: ANAF Status (max 15p) ──────────────────────────────────────

/**
 * anafStatus (15p):
 *   - activ fiscal: 10p
 *   - TVA activ: 5p
 *   - inactiv/radiat: 0p pentru sub-componentele respective
 */
export function scoreAnafStatus(anaf: AnafCreditData): number {
  const activFiscalPoints = anaf.isActivFiscal ? 10 : 0;
  const tvaPoints = anaf.isTvaActiv ? 5 : 0;
  return activFiscalPoints + tvaPoints;
}

// ── Componenta 2: Financial Health (max 30p) ─────────────────────────────────

/**
 * financialHealth (30p):
 *   - Profit pozitiv ultimii 3 ani: 10p proporțional (fiecare an = 10/3 ≈ 3.33p)
 *   - CA trend crescător (YoY): 10p proporțional (max 2 comparații → 5p fiecare)
 *   - Equity > 0: 5p (cel mai recent an)
 *   - Current ratio > 1: 5p (cel mai recent an)
 */
export function scoreFinancialHealth(bilant: TermeneBilantParsed): number {
  const years = bilant.years.slice(0, 3);
  if (years.length === 0) return 0;

  const profitPoints = scoreProfit(years);
  const caPoints = scoreCaTrend(years);
  const equityPoints = scoreEquity(years);
  const currentRatioPoints = scoreCurrentRatio(years);

  return profitPoints + caPoints + equityPoints + currentRatioPoints;
}

function scoreProfit(years: TermeneBilantParsed["years"]): number {
  const profitableYears = years.filter((y) => y.profitNet !== null && y.profitNet > 0).length;
  if (years.length === 0) return 0;
  return Math.round((profitableYears / Math.min(years.length, 3)) * 10);
}

function scoreCaTrend(years: TermeneBilantParsed["years"]): number {
  const sorted = [...years].sort((a, b) => a.an - b.an);
  if (sorted.length < 2) return 0;

  let growthCount = 0;
  let comparisons = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (
      prev?.cifraAfaceri !== null &&
      prev?.cifraAfaceri !== undefined &&
      curr?.cifraAfaceri !== null &&
      curr?.cifraAfaceri !== undefined
    ) {
      comparisons++;
      if (curr.cifraAfaceri > prev.cifraAfaceri) growthCount++;
    }
  }
  if (comparisons === 0) return 0;
  return Math.round((growthCount / comparisons) * 10);
}

function scoreEquity(years: TermeneBilantParsed["years"]): number {
  const recent = [...years].sort((a, b) => b.an - a.an)[0];
  if (!recent) return 0;
  if (recent.capitaluriProprii === null) return 0;
  return recent.capitaluriProprii > 0 ? 5 : 0;
}

function scoreCurrentRatio(years: TermeneBilantParsed["years"]): number {
  const recent = [...years].sort((a, b) => b.an - a.an)[0];
  if (!recent) return 0;
  if (recent.activeCirculante === null || recent.datoriiCurente === null) return 0;
  if (recent.datoriiCurente === 0) return 5;
  return recent.activeCirculante / recent.datoriiCurente > 1 ? 5 : 0;
}

// ── Componenta 3: BPI Status (max 20p) ───────────────────────────────────────

/**
 * bpiStatus (20p):
 *   - Zero proceduri insolvență: 20p
 *   - Proceduri închise: 10p
 *   - Proceduri active: 0p
 */
export function scoreBpiStatus(dosare: TermeneDosareParsed): number {
  if (dosare.proceduri_insolventa_active > 0) return 0;
  if (dosare.proceduri_insolventa_inchise > 0) return 10;
  return 20;
}

// ── Componenta 4: Payment History (max 25p) ───────────────────────────────────

/**
 * paymentHistory (25p):
 *   - On-time rate >95%: 25p
 *   - 85-95%: 20p
 *   - 70-85%: 10p
 *   - <70%: 0p
 *   - New client (no history): 12p (neutral)
 */
export function scorePaymentHistory(history: PaymentHistoryInput): number {
  if (history.totalOrders === 0) return 12;
  const rate = history.onTimeOrders / history.totalOrders;
  if (rate > 0.95) return 25;
  if (rate >= 0.85) return 20;
  if (rate >= 0.7) return 10;
  return 0;
}

// ── Componenta 5: Litigation (max 10p) ────────────────────────────────────────

/**
 * litigation (10p):
 *   - Zero dosare ca pârât: 10p
 *   - Dosare inactive: 5p
 *   - Dosare active: 0p
 */
export function scoreLitigation(dosare: TermeneDosareParsed): number {
  if (dosare.dosare_parat_active > 0) return 0;
  if (dosare.dosare_parat_inactive > 0) return 5;
  return 10;
}

// ── Risk Tier ─────────────────────────────────────────────────────────────────

/**
 * Mapare scor → risk tier (Plan L2070).
 *   0-19  → BLOCKED
 *   20-39 → LOW
 *   40-59 → MEDIUM
 *   60-79 → HIGH
 *   80-100 → PREMIUM
 */
export function resolveRiskTier(score: number): RiskTier {
  if (score >= 80) return "PREMIUM";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "LOW";
  return "BLOCKED";
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Calculează scorul de credit complet (100p) pe baza celor 5 componente.
 * Returnează scorul, risk tier-ul și limita de credit corespunzătoare.
 */
export function calculateCreditScore(
  anaf: AnafCreditData,
  bilant: TermeneBilantParsed,
  dosare: TermeneDosareParsed,
  history: PaymentHistoryInput,
): CreditScoreResult {
  const components: CreditScoreComponents = {
    anafStatus: scoreAnafStatus(anaf),
    financialHealth: scoreFinancialHealth(bilant),
    bpiStatus: scoreBpiStatus(dosare),
    paymentHistory: scorePaymentHistory(history),
    litigation: scoreLitigation(dosare),
  };

  const raw =
    components.anafStatus +
    components.financialHealth +
    components.bpiStatus +
    components.paymentHistory +
    components.litigation;

  const score = Math.max(0, Math.min(100, raw));
  const riskTier = resolveRiskTier(score);
  const creditLimit = CREDIT_LIMIT_MAP[riskTier];

  return { score, riskTier, creditLimit, components };
}
