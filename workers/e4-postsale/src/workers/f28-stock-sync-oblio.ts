/**
 * F28 — stock:sync:oblio
 *
 * Responsabilitate (Plan FAZA 8g §IX F28):
 * Cron (every 15 min) — sincronizare stoc Oblio ERP → goldProducts.metadata.stockCount
 *
 * Logica:
 * 1. SELECT goldProducts WHERE isActive=true AND sku IS NOT NULL (pentru tenant)
 * 2. Cheamă oblioClient.syncStock() cu lista de SKU-uri (STUB → returnează qty simulate)
 * 3. UPDATE goldProducts.metadata.stockCount pentru fiecare produs din răspuns
 * 4. Incrementează metrica e4StockSyncTotal
 *
 * ANTI-HALUCINARE:
 * - oblioClient.syncStock() este STUB — nu face apel HTTP real
 * - Stock count se stochează în goldProducts.metadata.stockCount (JSONB)
 * - NU inventăm tabel dedicat stock_inventory E4
 */
import type { Processor } from "bullmq";
import { db, goldProducts, setSessionTenantId, sql, eq, isNotNull, and } from "@cerniq/db";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { e4StockSyncTotal } from "../e4-metrics.js";
import { oblioClient } from "../lib/oblio-client-e4.js";

export type StockSyncOblioJobData = {
  tenantId: string;
  correlationId?: string;
};

export type StockSyncOblioResult = {
  ok: true;
  tenantId: string;
  syncedCount: number;
  errorCount: number;
};

export const stockSyncOblioProcessor: Processor<StockSyncOblioJobData> = async (
  job,
): Promise<StockSyncOblioResult> => {
  return withCognitiveSpan(
    "e4:stock:sync:oblio",
    async (_span) => {
      const { tenantId } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. Obține lista produselor active cu SKU ──────────────────────────
      const products = await db
        .select({
          id: goldProducts.id,
          sku: goldProducts.sku,
          name: goldProducts.name,
        })
        .from(goldProducts)
        .where(
          and(
            eq(goldProducts.tenantId, tenantId),
            eq(goldProducts.isActive, true),
            isNotNull(goldProducts.sku),
          ),
        );

      if (products.length === 0) {
        job.log(`[F28] Niciun produs activ cu SKU pentru tenant ${tenantId}`);
        return { ok: true, tenantId, syncedCount: 0, errorCount: 0 };
      }

      // ── 2. Sync cu Oblio ERP (STUB) ───────────────────────────────────────
      // Filter defensiv: WHERE isNotNull(sku) garantează la nivel DB, dar
      // type predicate îngustează corect tipul și protejează față de edge cases.
      const oblioItems = products
        .filter((p): p is typeof p & { sku: string } => p.sku !== null)
        .map((p) => ({
          sku: p.sku,
          name: p.name,
          quantity: 0,
        }));

      const syncResult = await oblioClient.syncStock(tenantId, oblioItems);
      job.log(
        `[F28] Oblio sync: ${syncResult.synced} synced, ${syncResult.errors} errors — ${syncResult.note}`,
      );

      // ── 3. UPDATE goldProducts.metadata.stockCount pentru fiecare produs ──
      let syncedCount = 0;
      let errorCount = syncResult.errors;

      for (const oblioItem of oblioItems) {
        const product = products.find((p) => p.sku === oblioItem.sku);
        if (!product) continue;

        try {
          await db
            .update(goldProducts)
            .set({
              metadata: sql`jsonb_set(
                COALESCE(${goldProducts.metadata}, '{}'::jsonb),
                '{stockCount}',
                ${JSON.stringify(oblioItem.quantity)}::jsonb
              )`,
              updatedAt: new Date(),
            })
            .where(eq(goldProducts.id, product.id));
          syncedCount++;
        } catch (err) {
          errorCount++;
          job.log(
            `[F28] Eroare update stoc produs ${product.id} (sku=${oblioItem.sku}): ${String(err)}`,
          );
        }
      }

      e4StockSyncTotal.inc({ tenant_id: tenantId }, syncedCount);
      job.log(`[F28] Sync complet: tenant=${tenantId} synced=${syncedCount} errors=${errorCount}`);

      return { ok: true, tenantId, syncedCount, errorCount };
    },
    { tenantId: job.data.tenantId },
  );
};
