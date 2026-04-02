/**
 * E28 — pricing:discount:apply (concurrency:10)
 *
 * Aplică un discount pe un negotiation item, verifică HARD LIMIT margin ≥8%,
 * actualizează DB și inserează fiscal audit trail cu SHA-256 hash chain.
 */
import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import {
  db,
  setSessionTenantId,
  negotiationItems,
  fiscalAuditTrail,
  eq,
  and,
  desc,
  sql,
} from "@cerniq/db";

const LOG = "[e28-pricing-discount-apply]";
const MIN_MARGIN_PCT = 8;

export interface PricingDiscountApplyJobData {
  tenantId: string;
  negotiationItemId: string;
  discountPct: number;
  appliedBy: string;
  approvalRef?: string;
}

export interface PricingDiscountApplyResult {
  ok: true;
  negotiationItemId: string;
  discountPct: number;
  lineTotal: number;
  hash: string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export const pricingDiscountApplyProcessor: Processor<
  PricingDiscountApplyJobData,
  PricingDiscountApplyResult
> = async (job) => {
  const { tenantId, negotiationItemId, discountPct, appliedBy, approvalRef } = job.data;

  await setSessionTenantId(tenantId);

  // Fetch negotiation item
  const items = await db
    .select({
      id: negotiationItems.id,
      productId: negotiationItems.productId,
      quantity: negotiationItems.quantity,
      unitPrice: negotiationItems.unitPrice,
    })
    .from(negotiationItems)
    .where(and(eq(negotiationItems.id, negotiationItemId), eq(negotiationItems.tenantId, tenantId)))
    .limit(1);

  if (items.length === 0) {
    throw new Error(`e28: negotiation item ${negotiationItemId} not found`);
  }

  const item = items[0];
  const productId = item.productId;
  const quantity = item.quantity ?? 1;
  const unitPrice = Number.parseFloat(String(item.unitPrice ?? "0"));

  // E30 margin check SYNC — HARD LIMIT nenegociabil
  const discountCheckExec = await db.execute(
    sql`SELECT gold.get_max_discount(${tenantId}::uuid, ${productId}::uuid)`,
  );
  const discountCheckRows =
    (discountCheckExec as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  const maxAllowed = Number.parseFloat(String(discountCheckRows[0]?.get_max_discount ?? "0"));

  if (discountPct > maxAllowed) {
    throw new Error(
      `MARGIN_VIOLATION: discount ${discountPct}% depășește maxim permis ${maxAllowed}% (min_margin=${MIN_MARGIN_PCT}%) pentru produsul ${productId}`,
    );
  }

  // Calculează lineTotal, rotunjit la 2 zecimale
  const lineTotal = Math.round(unitPrice * quantity * (1 - discountPct / 100) * 100) / 100;

  // UPDATE negotiation item
  await db
    .update(negotiationItems)
    .set({
      discountPct: String(discountPct),
      lineTotal: String(lineTotal),
    })
    .where(
      and(eq(negotiationItems.id, negotiationItemId), eq(negotiationItems.tenantId, tenantId)),
    );

  // Fiscal Audit Trail — SHA-256 hash chain
  const lastEntries = await db
    .select({ hash: fiscalAuditTrail.hash })
    .from(fiscalAuditTrail)
    .where(
      and(
        eq(fiscalAuditTrail.tenantId, tenantId),
        eq(fiscalAuditTrail.entityId, negotiationItemId),
      ),
    )
    .orderBy(desc(fiscalAuditTrail.createdAt))
    .limit(1);

  const prevHash = lastEntries[0]?.hash ?? "GENESIS";
  const data = {
    negotiationItemId,
    discountPct,
    lineTotal,
    appliedBy,
    approvalRef: approvalRef ?? null,
    timestamp: new Date().toISOString(),
  };
  const hash = createHash("sha256")
    .update(prevHash + JSON.stringify(data))
    .digest("hex");

  const actorId = isUuid(appliedBy) ? appliedBy : null;

  await db.insert(fiscalAuditTrail).values({
    tenantId,
    entityType: "negotiation_item",
    entityId: negotiationItemId,
    action: "DISCOUNT_APPLIED",
    actorId,
    prevHash,
    hash,
    data,
  });

  console.info(
    `${LOG} applied discount=${discountPct}% lineTotal=${lineTotal} hash=${hash.slice(0, 12)}... appliedBy=${appliedBy}`,
  );

  return { ok: true, negotiationItemId, discountPct, lineTotal, hash };
};
