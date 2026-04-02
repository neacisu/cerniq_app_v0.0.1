/**
 * E30 — pricing:margin:check (concurrency:50) CRITICAL GUARDRAIL DETERMINISTIC
 *
 * Verifică că discountul propus nu lasă marja sub 8% HARD LIMIT NENEGOCIABIL.
 * Formula: marginPct = ((sellingPrice - costPrice) / sellingPrice) * 100
 * Dacă costPrice nu este furnizat (sau 0), marginPct=null → fără violation (nu știm costul).
 * DETERMINISTIC — fără LLM.
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";

const LOG = "[e30-pricing-margin-check]";
const MIN_MARGIN_PCT = 8; // CONSTANT NENEGOCIABIL

export interface PricingMarginCheckJobData {
  tenantId: string;
  productId: string;
  proposedDiscountPct: number;
  unitPrice: number;
  costPrice?: number;
}

export interface PricingMarginCheckResult {
  ok: true;
  productId: string;
  proposedDiscountPct: number;
  marginPct: number | null;
  minMarginPct: number;
  passed: true;
}

export const pricingMarginCheckProcessor: Processor<
  PricingMarginCheckJobData,
  PricingMarginCheckResult
> = async (job) => {
  const { tenantId, productId, proposedDiscountPct, unitPrice, costPrice } = job.data;

  await setSessionTenantId(tenantId);

  const sellingPrice = unitPrice * (1 - proposedDiscountPct / 100);
  const cost = costPrice ?? 0;
  const marginPct = cost > 0 ? ((sellingPrice - cost) / sellingPrice) * 100 : null;

  console.info(
    `${LOG} productId=${productId} discount=${proposedDiscountPct}% marginPct=${marginPct === null ? "N/A (no costPrice)" : marginPct.toFixed(2) + "%"}`,
  );

  if (marginPct !== null && marginPct < MIN_MARGIN_PCT) {
    throw new Error(
      `MARGIN_VIOLATION: marginea ${marginPct.toFixed(2)}% < minimum ${MIN_MARGIN_PCT}%. Discount ${proposedDiscountPct}% inacceptabil.`,
    );
  }

  return {
    ok: true,
    productId,
    proposedDiscountPct,
    marginPct,
    minMarginPct: MIN_MARGIN_PCT,
    passed: true,
  };
};
