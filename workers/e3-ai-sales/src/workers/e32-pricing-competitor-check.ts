/**
 * E32 — pricing:competitor:check (concurrency:5) CRON '0 6 * * *' INFORMATIV
 *
 * Verifică prețurile concurenților pentru produsele active ale unui tenant.
 * IMPORTANT: NU face ajustări automate de prețuri. Rezultatul este INFORMATIV ONLY.
 * Integrarea externă cu sisteme de competitor pricing este STUB — pending implementare.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldProducts, eq, and, inArray } from "@cerniq/db";

const LOG = "[e32-pricing-competitor-check]";

export interface PricingCompetitorCheckJobData {
  tenantId: string;
  productIds?: string[];
}

export interface PricingCompetitorCheckResult {
  ok: true;
  productsChecked: number;
  competitive: null;
  note: "competitor-check-pending";
}

export const pricingCompetitorCheckProcessor: Processor<
  PricingCompetitorCheckJobData,
  PricingCompetitorCheckResult
> = async (job) => {
  const { tenantId, productIds } = job.data;

  await setSessionTenantId(tenantId);

  let products: Array<{ id: string }>;

  if (productIds && productIds.length > 0) {
    products = await db
      .select({ id: goldProducts.id })
      .from(goldProducts)
      .where(and(eq(goldProducts.tenantId, tenantId), inArray(goldProducts.id, productIds)));
  } else {
    products = await db
      .select({ id: goldProducts.id })
      .from(goldProducts)
      .where(and(eq(goldProducts.tenantId, tenantId), eq(goldProducts.isActive, true)));
  }

  console.info(
    `${LOG} Competitor price check STUB for ${products.length} products - external integration pending`,
  );

  return {
    ok: true,
    productsChecked: products.length,
    competitive: null,
    note: "competitor-check-pending",
  };
};
