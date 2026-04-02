/**
 * D24 — negotiation:close:execute (concurrency: 5)
 *
 * Execută acțiunile de closing:
 * - "to-proforma": CLOSING → PROFORMA_SENT + STUB oblio:proforma:create
 * - "to-invoice": PROFORMA_SENT → INVOICED + STUB oblio:invoice:convert + efactura:spv:send
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  goldNegotiations,
  negotiationItems,
  goldProducts,
  eq,
  and,
  inArray,
} from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";

const LOG = "[d24-negotiation-close-execute]";

export interface NegotiationCloseExecuteJobData {
  tenantId: string;
  negotiationId: string;
  action: "to-proforma" | "to-invoice";
}

export interface NegotiationCloseExecuteResult {
  ok: true;
  negotiationId: string;
  action: "to-proforma" | "to-invoice";
  queued: true;
}

export const negotiationCloseExecuteProcessor: Processor<
  NegotiationCloseExecuteJobData,
  NegotiationCloseExecuteResult
> = async (job) => {
  const { tenantId, negotiationId, action } = job.data;
  await setSessionTenantId(tenantId);

  const negotiations = await db
    .select({
      id: goldNegotiations.id,
      currentState: goldNegotiations.currentState,
      totalValue: goldNegotiations.totalValue,
    })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)))
    .limit(1);

  const negotiation = negotiations[0];
  if (!negotiation) {
    throw new Error(`Negotiation not found: ${negotiationId}`);
  }

  const items = await db
    .select({
      id: negotiationItems.id,
      productId: negotiationItems.productId,
      quantity: negotiationItems.quantity,
      unitPrice: negotiationItems.unitPrice,
      lineTotal: negotiationItems.lineTotal,
    })
    .from(negotiationItems)
    .where(
      and(
        eq(negotiationItems.tenantId, tenantId),
        eq(negotiationItems.negotiationId, negotiationId),
      ),
    );

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products =
    productIds.length > 0
      ? await db
          .select({ id: goldProducts.id, name: goldProducts.name, sku: goldProducts.sku })
          .from(goldProducts)
          .where(and(eq(goldProducts.tenantId, tenantId), inArray(goldProducts.id, productIds)))
      : [];

  const productMap = new Map(products.map((p) => [p.id, p]));
  const enrichedItems = items.map((item) => ({
    ...item,
    productName: productMap.get(item.productId)?.name ?? null,
    productSku: productMap.get(item.productId)?.sku ?? null,
  }));

  const transitionQueue = createQueue("negotiation:state:transition", {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  if (action === "to-proforma") {
    await transitionQueue.add("negotiation:state:transition", {
      tenantId,
      negotiationId,
      toState: "PROFORMA_SENT",
      reason: "close:execute to-proforma",
    });

    console.info(
      `${LOG} [STUB] oblio:proforma:create intent: negotiation=${negotiationId} items=${enrichedItems.length} products=${products.length} totalValue=${negotiation.totalValue}`,
    );
  } else {
    await transitionQueue.add("negotiation:state:transition", {
      tenantId,
      negotiationId,
      toState: "INVOICED",
      reason: "close:execute to-invoice",
    });

    console.info(
      `${LOG} [STUB] oblio:invoice:convert intent: negotiation=${negotiationId} items=${enrichedItems.length} totalValue=${negotiation.totalValue}`,
    );
    console.info(
      `${LOG} [STUB] efactura:spv:send intent: negotiation=${negotiationId} totalValue=${negotiation.totalValue}`,
    );
  }

  await transitionQueue.close();

  console.info(`${LOG} action=${action} negotiation=${negotiationId} tenant=${tenantId}`);
  return { ok: true, negotiationId, action, queued: true };
};
