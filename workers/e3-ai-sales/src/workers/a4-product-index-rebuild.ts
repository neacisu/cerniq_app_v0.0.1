/**
 * A4 — product:index:rebuild (concurrency: 1, SINGLETON)
 *
 * Reconstruiește search_vector (tsvector romanian) și name_trigram pentru produse.
 * Dacă productId absent → rebuild pentru toți produsii tenantului.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldProducts, eq, and, sql } from "@cerniq/db";

const LOG = "[a4-product-index-rebuild]";

export interface ProductIndexRebuildJobData {
  tenantId: string;
  productId?: string;
}

export interface ProductIndexRebuildResult {
  ok: true;
  productsReindexed: number;
}

export const productIndexRebuildProcessor: Processor<
  ProductIndexRebuildJobData,
  ProductIndexRebuildResult
> = async (job) => {
  const { tenantId, productId } = job.data;
  await setSessionTenantId(tenantId);

  const whereClause = productId
    ? and(eq(goldProducts.tenantId, tenantId), eq(goldProducts.id, productId))
    : eq(goldProducts.tenantId, tenantId);

  // UPDATE search_vector cu to_tsvector('romanian', ...)
  await db
    .update(goldProducts)
    .set({
      searchVector: sql`to_tsvector('romanian', COALESCE(${goldProducts.name}, '') || ' ' || COALESCE(${goldProducts.description}, ''))`,
      nameTrigram: goldProducts.name,
    })
    .where(whereClause);

  // Drizzle nu returnează rowCount direct pentru toate driverele;
  // pentru single product returnăm 1, pentru bulk facem count separat.
  let productsReindexed: number;
  if (productId) {
    productsReindexed = 1;
    console.info(`${LOG} reindexed productId=${productId} tenant=${tenantId}`);
  } else {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(goldProducts)
      .where(eq(goldProducts.tenantId, tenantId));
    productsReindexed = Number(countResult[0]?.count ?? 0);
    console.info(`${LOG} reindexed all=${productsReindexed} tenant=${tenantId}`);
  }

  return { ok: true, productsReindexed };
};
