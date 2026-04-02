/**
 * E31 — pricing:volume:calculate (concurrency:20)
 *
 * Calculează prețul per unitate și totalul liniei aplicând discount de volum.
 * Volume tiers sunt stocate ca rânduri multiple în price_rules cu ruleType='volume'
 * și minQuantity. Se selectează regula cu cel mai mare minQuantity ≤ cantității cerute.
 * Include inline margin guard: discountul NU poate depăși 100 - MIN_MARGIN_PCT = 92%.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, priceRules, eq, and, lte, desc } from "@cerniq/db";

const LOG = "[e31-pricing-volume-calculate]";
const MIN_MARGIN_PCT = 8;
const MAX_ALLOWED_DISCOUNT = 100 - MIN_MARGIN_PCT; // 92%

export interface PricingVolumeCalculateJobData {
  tenantId: string;
  productId: string;
  quantity: number;
  baseUnitPrice: number;
}

export interface PricingVolumeCalculateResult {
  ok: true;
  productId: string;
  quantity: number;
  baseUnitPrice: number;
  volumeDiscountPct: number;
  pricePerUnit: number;
  lineTotal: number;
}

export const pricingVolumeCalculateProcessor: Processor<
  PricingVolumeCalculateJobData,
  PricingVolumeCalculateResult
> = async (job) => {
  const { tenantId, productId, quantity, baseUnitPrice } = job.data;

  await setSessionTenantId(tenantId);

  // SELECT regula de volum aplicabilă (cel mai mare tier ≤ quantity)
  const volumeRules = await db
    .select({
      discountPct: priceRules.discountPct,
      minQuantity: priceRules.minQuantity,
      minMarginPct: priceRules.minMarginPct,
    })
    .from(priceRules)
    .where(
      and(
        eq(priceRules.tenantId, tenantId),
        eq(priceRules.productId, productId),
        eq(priceRules.ruleType, "volume"),
        lte(priceRules.minQuantity, quantity),
      ),
    )
    .orderBy(desc(priceRules.minQuantity))
    .limit(1);

  const volumeDiscountPct =
    volumeRules.length > 0 ? Number.parseFloat(String(volumeRules[0].discountPct ?? "0")) : 0;

  // Inline margin guard — HARD LIMIT
  if (volumeDiscountPct > MAX_ALLOWED_DISCOUNT) {
    throw new Error(
      `MARGIN_VIOLATION: volumeDiscount ${volumeDiscountPct}% depășește maxim permis ${MAX_ALLOWED_DISCOUNT}% (min_margin=${MIN_MARGIN_PCT}%)`,
    );
  }

  const pricePerUnit = Math.round(baseUnitPrice * (1 - volumeDiscountPct / 100) * 100) / 100;
  const lineTotal = Math.round(pricePerUnit * quantity * 100) / 100;

  console.info(
    `${LOG} productId=${productId} qty=${quantity} discount=${volumeDiscountPct}% pricePerUnit=${pricePerUnit} lineTotal=${lineTotal}`,
  );

  return {
    ok: true,
    productId,
    quantity,
    baseUnitPrice,
    volumeDiscountPct,
    pricePerUnit,
    lineTotal,
  };
};
