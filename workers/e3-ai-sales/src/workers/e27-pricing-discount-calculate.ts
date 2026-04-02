/**
 * E27 — pricing:discount:calculate (concurrency:20) CRITICAL DETERMINISTIC
 *
 * Calculează discountul maxim permis pentru un produs via SQL function get_max_discount.
 * Dacă requestedDiscountPct este furnizat, verifică că nu depășește maximul permis.
 * DETERMINISTIC — fără LLM, fără randomness.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, sql } from "@cerniq/db";

const LOG = "[e27-pricing-discount-calculate]";

export interface PricingDiscountCalculateJobData {
  tenantId: string;
  productId: string;
  requestedDiscountPct?: number;
  quantity?: number;
}

export interface PricingDiscountCalculateResult {
  ok: true;
  productId: string;
  maxAllowedDiscount: number;
  requestedDiscount?: number;
  approved?: boolean;
}

export const pricingDiscountCalculateProcessor: Processor<
  PricingDiscountCalculateJobData,
  PricingDiscountCalculateResult
> = async (job) => {
  const { tenantId, productId, requestedDiscountPct } = job.data;

  await setSessionTenantId(tenantId);

  const execResult = await db.execute(
    sql`SELECT gold.get_max_discount(${tenantId}::uuid, ${productId}::uuid)`,
  );
  const rows = (execResult as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  const maxAllowedDiscount = Number.parseFloat(String(rows[0]?.get_max_discount ?? "0"));

  console.info(
    `${LOG} tenantId=${tenantId} productId=${productId} maxAllowedDiscount=${maxAllowedDiscount}%`,
  );

  if (requestedDiscountPct !== undefined) {
    if (requestedDiscountPct > maxAllowedDiscount) {
      throw new Error(
        `Discount ${requestedDiscountPct}% depășește maxim permis ${maxAllowedDiscount}% pentru produsul ${productId}`,
      );
    }
    return {
      ok: true,
      productId,
      maxAllowedDiscount,
      requestedDiscount: requestedDiscountPct,
      approved: requestedDiscountPct <= maxAllowedDiscount,
    };
  }

  return { ok: true, productId, maxAllowedDiscount };
};
