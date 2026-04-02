/**
 * reconciliation-engine.ts — Motor reconciliere plăți Three-Tier
 *
 * Plan FAZA 8c §IX L2037-2047:
 * TIER 1 — B7 Exact Match: reference ILIKE orderNumber AND ABS(total - amount) <= 0.01
 * TIER 2 — B8 Fuzzy Match: pg_trgm similarity(denumire, counterpartyName) + ABS(total-amount)/total <= 5%
 * TIER 3 — B9 Manual (HITL): candidați scorați pentru decizie umană
 *
 * Anti-halucinare:
 * - NU motor custom de fuzzy — EXCLUSIV pg_trgm similarity() din PostgreSQL (deja activat)
 * - Threshold-urile 85% și 5% sunt hardcodate conform planului — NU se modifică
 * - goldOrders.orderNumber este câmpul "reference" (schema nu are câmp `reference`)
 * - goldCompanies.denumire este câmpul "clientName" (schema nu are câmp `clientName`)
 */
import {
  db,
  setSessionTenantId,
  eq,
  and,
  isNull,
  sql,
  goldPayments,
  goldOrders,
  goldPaymentReconciliations,
  goldAuditLogsEtapa4,
} from "@cerniq/db";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export type PaymentForReconciliation = {
  id: string;
  tenantId: string;
  amount: string; // numeric din DB
  currency: string;
  reference: string | null;
  counterpartyName: string | null;
  counterpartyIban: string | null;
  externalId: string | null;
};

export type ReconciliationCandidate = {
  orderId: string;
  orderNumber: string;
  totalAmount: string;
  currency: string;
  nameSimilarity: number;
  amountProximity: number;
  /** score = nameSimilarity * 0.6 + amountProximity * 0.4 (plan §IX) */
  score: number;
};

export type TierOneResult =
  | { tier: 1; matched: true; orderId: string; orderNumber: string }
  | {
      tier: 1;
      matched: false;
      multipleMatches: boolean;
      candidates: { orderId: string; orderNumber: string }[];
    };

export type TierTwoResult =
  | { tier: 2; autoMatch: true; orderId: string; score: number; matchType: "FUZZY_NAME_AMOUNT" }
  | {
      tier: 2;
      autoMatch: false;
      candidates: ReconciliationCandidate[];
      reason: "low_confidence" | "no_candidates";
    };

// ---------------------------------------------------------------------------
// Thresholds (Plan §IX — NU modifica)
// ---------------------------------------------------------------------------

/** Toleranță sumă Tier 1: ABS(total - payment) <= 0.01 RON */
export const TIER1_AMOUNT_TOLERANCE = 0.01;
/** Threshold similarity Tier 2: similarity >= 0.85 */
export const TIER2_SIMILARITY_THRESHOLD = 0.85;
/** Threshold sumă Tier 2: ABS(total - payment) / total <= 5% */
export const TIER2_AMOUNT_THRESHOLD_PCT = 0.05;
/** Threshold score auto-match Tier 2: score >= 0.85 */
export const TIER2_SCORE_AUTO_THRESHOLD = 0.85;
/** Threshold score minim pentru candidat B9: score >= 0.50 */
export const TIER2_SCORE_MIN_CANDIDATE = 0.5;

// ---------------------------------------------------------------------------
// Tier 1 — Exact Reference Match
// ---------------------------------------------------------------------------

/**
 * Caută comenzi pentru care orderNumber ILIKE payment.reference
 * și ABS(totalAmount - paymentAmount) <= 0.01.
 *
 * Returnează:
 * - { matched: true, orderId } dacă exact 1 match
 * - { matched: false, multipleMatches: true/false, candidates } altfel
 *
 * Anti-halucinare: goldOrders NU are câmp `reference` — folosim orderNumber.
 */
export async function runTierOneMatch(payment: PaymentForReconciliation): Promise<TierOneResult> {
  const { tenantId, reference, amount } = payment;

  if (!reference || reference.trim() === "") {
    return { tier: 1, matched: false, multipleMatches: false, candidates: [] };
  }

  const paymentAmount = Number.parseFloat(amount);

  // ILIKE case-insensitive pentru referință; filtrare suplimentară în JS pentru toleranță ±0.01
  const rows = await db
    .select({
      orderId: goldOrders.id,
      orderNumber: goldOrders.orderNumber,
      totalAmount: goldOrders.totalAmount,
    })
    .from(goldOrders)
    .where(
      and(
        eq(goldOrders.tenantId, tenantId),
        isNull(goldOrders.deletedAt),
        sql`LOWER(${goldOrders.orderNumber}) = LOWER(${reference.trim()})`,
      ),
    );

  const matched = rows.filter((r) => {
    const orderTotal = Number.parseFloat(String(r.totalAmount));
    return Math.abs(orderTotal - paymentAmount) <= TIER1_AMOUNT_TOLERANCE;
  });

  if (matched.length === 1) {
    const first = matched[0];
    if (!first) {
      return { tier: 1, matched: false, multipleMatches: false, candidates: [] };
    }
    return {
      tier: 1,
      matched: true,
      orderId: first.orderId,
      orderNumber: first.orderNumber,
    };
  }

  return {
    tier: 1,
    matched: false,
    multipleMatches: matched.length > 1,
    candidates: matched.map((r) => ({ orderId: r.orderId, orderNumber: r.orderNumber })),
  };
}

// ---------------------------------------------------------------------------
// Tier 2 — Fuzzy Match cu pg_trgm
// ---------------------------------------------------------------------------

/**
 * Caută comenzi folosind pg_trgm similarity() între denumire client și counterpartyName.
 * Formula scor: score = nameSimilarity * 0.6 + amountProximity * 0.4 (plan §IX)
 *
 * Anti-halucinare: NU motor custom — EXCLUSIV pg_trgm din PostgreSQL.
 * goldCompanies.denumire = câmpul "clientName" din schema reală.
 */
export async function runTierTwoMatch(payment: PaymentForReconciliation): Promise<TierTwoResult> {
  const { tenantId, counterpartyName, amount } = payment;

  if (!counterpartyName || counterpartyName.trim() === "") {
    return { tier: 2, autoMatch: false, candidates: [], reason: "no_candidates" };
  }

  const paymentAmount = Number.parseFloat(amount);

  // Căutare pg_trgm: similarity >= 0.50 (threshold larg pentru a colecta candidați B9)
  // Filtrarea >= 0.85 se face în JS după scorare compusă
  const rows = await db.execute<{
    order_id: string;
    order_number: string;
    total_amount: string;
    currency: string;
    name_sim: number;
  }>(sql`
    SELECT
      go.id          AS order_id,
      go.order_number,
      go.total_amount,
      go.currency,
      similarity(gc.denumire, ${counterpartyName.trim()}) AS name_sim
    FROM gold.gold_orders go
    INNER JOIN gold.gold_companies gc ON go.lead_id = gc.id
    WHERE go.tenant_id = ${tenantId}::uuid
      AND go.deleted_at IS NULL
      AND go.status NOT IN ('CANCELLED', 'COMPLETED', 'PAID')
      AND gc.denumire IS NOT NULL
      AND similarity(gc.denumire, ${counterpartyName.trim()}) >= ${TIER2_SCORE_MIN_CANDIDATE}
    ORDER BY name_sim DESC
    LIMIT 10
  `);

  // Compatibilitate drizzle: rows poate fi array direct sau { rows: [...] }
  const resultRows: {
    order_id: string;
    order_number: string;
    total_amount: string;
    currency: string;
    name_sim: number;
  }[] = Array.isArray(rows) ? rows : ((rows as { rows: typeof rows }).rows ?? []);

  if (resultRows.length === 0) {
    return { tier: 2, autoMatch: false, candidates: [], reason: "no_candidates" };
  }

  const candidates: ReconciliationCandidate[] = resultRows.map((r) => {
    const orderTotal = Number.parseFloat(r.total_amount);
    const nameSimilarity = Number(r.name_sim);
    const amountDiff = orderTotal > 0 ? Math.abs(orderTotal - paymentAmount) / orderTotal : 1; // dacă orderTotal = 0 → proximitate 0
    const amountProximity = Math.max(0, 1 - amountDiff / TIER2_AMOUNT_THRESHOLD_PCT);
    // Verifică că suma este în limita de 5%
    const amountInThreshold = amountDiff <= TIER2_AMOUNT_THRESHOLD_PCT;
    const score = amountInThreshold
      ? nameSimilarity * 0.6 + amountProximity * 0.4
      : nameSimilarity * 0.6; // fără bonus amount dacă depășește 5%

    return {
      orderId: r.order_id,
      orderNumber: r.order_number,
      totalAmount: r.total_amount,
      currency: r.currency,
      nameSimilarity,
      amountProximity: amountInThreshold ? amountProximity : 0,
      score,
    };
  });

  // Sortare descrescătoare după score
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (!best) {
    return { tier: 2, autoMatch: false, candidates: [], reason: "no_candidates" };
  }

  if (best.score >= TIER2_SCORE_AUTO_THRESHOLD) {
    return {
      tier: 2,
      autoMatch: true,
      orderId: best.orderId,
      score: best.score,
      matchType: "FUZZY_NAME_AMOUNT",
    };
  }

  return {
    tier: 2,
    autoMatch: false,
    candidates,
    reason: "low_confidence",
  };
}

// ---------------------------------------------------------------------------
// DB Operations — INSERT reconciliere + UPDATE payment/order
// ---------------------------------------------------------------------------

/**
 * INSERT gold_payment_reconciliations + UPDATE gold_payments status.
 * Apelat de B7 (Tier 1) sau B8 (Tier 2 auto-match).
 */

function resolvePaymentStatus(
  matchType: "EXACT_REFERENCE" | "FUZZY_NAME_AMOUNT" | "MANUAL",
): "MATCHED_EXACT" | "MATCHED_FUZZY" | "MANUAL_MATCHED" {
  if (matchType === "EXACT_REFERENCE") return "MATCHED_EXACT";
  if (matchType === "FUZZY_NAME_AMOUNT") return "MATCHED_FUZZY";
  return "MANUAL_MATCHED";
}

export async function insertReconciliation(params: {
  tenantId: string;
  paymentId: string;
  orderId: string;
  matchType: "EXACT_REFERENCE" | "FUZZY_NAME_AMOUNT" | "MANUAL";
  confidence: number;
  matchedBy: string;
}): Promise<string> {
  const reconciliationId = uuidv4();
  const now = new Date();

  await setSessionTenantId(params.tenantId);

  await db.insert(goldPaymentReconciliations).values({
    id: reconciliationId,
    paymentId: params.paymentId,
    orderId: params.orderId,
    matchType: params.matchType,
    confidence: String(params.confidence),
    matchedBy: params.matchedBy,
    matchedAt: now,
  });

  const newStatus = resolvePaymentStatus(params.matchType);
  await db
    .update(goldPayments)
    .set({
      reconciliationStatus: newStatus,
      orderId: params.orderId,
      processedAt: now,
      updatedAt: now,
    })
    .where(eq(goldPayments.id, params.paymentId));

  return reconciliationId;
}

/**
 * INSERT audit log pentru eveniment reconciliere.
 */
export async function insertReconciliationAuditLog(params: {
  tenantId: string;
  paymentId: string;
  orderId: string;
  eventType: string;
  matchType: string;
  confidence: number;
  reconciliationId: string;
}): Promise<void> {
  const auditId = uuidv4();
  await db.insert(goldAuditLogsEtapa4).values({
    id: auditId,
    tenantId: params.tenantId,
    actorId: null,
    actorType: "WORKER",
    eventType: params.eventType,
    entityType: "gold_payment_reconciliations",
    entityId: params.reconciliationId,
    newValues: {
      paymentId: params.paymentId,
      orderId: params.orderId,
      matchType: params.matchType,
      confidence: params.confidence,
    },
    prevHash: null,
    createdAt: new Date(),
  });
}

/**
 * Citește plata din DB și verifică că reconciliationStatus = 'PENDING' (idempotency).
 * Anti-halucinare (D): NU procesamplăți cu reconciliationStatus != 'PENDING'.
 */
export async function loadPendingPayment(
  tenantId: string,
  paymentId: string,
): Promise<PaymentForReconciliation | null> {
  const rows = await db
    .select({
      id: goldPayments.id,
      tenantId: goldPayments.tenantId,
      amount: goldPayments.amount,
      currency: goldPayments.currency,
      reference: goldPayments.reference,
      counterpartyName: goldPayments.counterpartyName,
      counterpartyIban: goldPayments.counterpartyIban,
      externalId: goldPayments.externalId,
      reconciliationStatus: goldPayments.reconciliationStatus,
    })
    .from(goldPayments)
    .where(and(eq(goldPayments.id, paymentId), eq(goldPayments.tenantId, tenantId)))
    .limit(1);

  const payment = rows[0];
  if (!payment) return null;
  // Idempotency: skip dacă deja reconciliat
  if (payment.reconciliationStatus !== "PENDING") return null;

  return payment;
}
