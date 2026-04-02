/**
 * g33-contract-clauses-select.ts — Worker G33: Selecție clauze per riskTier
 *
 * FLUX:
 * 1. SELECT gold_contract_clauses WHERE applicableRiskTiers @> riskTier OR isMandatory=true
 * 2. Clauze per riskTier (Plan FAZA 8f L2099 — EXACTE, fără adăugiri):
 *    BLOCKED  → prepayment_100
 *    LOW      → prepayment_50, standard_warranty
 *    MEDIUM   → payment_30d, standard_warranty
 *    HIGH     → payment_30d, extended_warranty, penalty_clause
 *    PREMIUM  → payment_60d, extended_warranty, volume_discount, priority_support
 * 3. UPDATE gold_contracts SET clausesUsed = codes array
 * 4. Enqueue G34 (contract:docusign:send)
 *
 * Anti-halucinare C: clauze per riskTier sunt EXACTE din plan L2099.
 */
import type { Processor } from "bullmq";
import { createQueue, QUEUES, withCognitiveSpan } from "@cerniq/worker-shared";
import {
  db,
  goldContracts,
  goldContractClauses,
  setSessionTenantId,
  eq,
  and,
  sql,
} from "@cerniq/db";

const REDIS_DB_E4 = Number(process.env["REDIS_DB_E4"] ?? process.env["REDIS_DB"] ?? "4");

// ---------------------------------------------------------------------------
// Mapping riskTier → coduri clauze (Plan L2099 — EXACTE)
// ---------------------------------------------------------------------------

const RISK_TIER_CLAUSE_CODES: Record<string, string[]> = {
  BLOCKED: ["prepayment_100"],
  LOW: ["prepayment_50", "standard_warranty"],
  MEDIUM: ["payment_30d", "standard_warranty"],
  HIGH: ["payment_30d", "extended_warranty", "penalty_clause"],
  PREMIUM: ["payment_60d", "extended_warranty", "volume_discount", "priority_support"],
};

export type ContractClausesSelectJobData = {
  tenantId: string;
  contractId: string;
  clientId: string;
  riskTier: string;
  correlationId?: string;
};

export const contractClausesSelectProcessor: Processor<ContractClausesSelectJobData> = async (
  job,
) => {
  return withCognitiveSpan(
    "e4:contract:clauses:select",
    async (_span) => {
      const { tenantId, contractId, riskTier } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. Determinare coduri clauze per riskTier ─────────────────────────
      const riskTierCodes = RISK_TIER_CLAUSE_CODES[riskTier] ?? RISK_TIER_CLAUSE_CODES["MEDIUM"];

      // ── 2. SELECT clauze: (applicableRiskTiers @> riskTier) OR isMandatory=true
      const clauses = await db
        .select({
          id: goldContractClauses.id,
          code: goldContractClauses.code,
          content: goldContractClauses.content,
          isMandatory: goldContractClauses.isMandatory,
        })
        .from(goldContractClauses)
        .where(
          sql`(${goldContractClauses.applicableRiskTiers} @> ${JSON.stringify([riskTier])}::jsonb OR ${goldContractClauses.isMandatory} = true)`,
        );

      // Combinăm: codurile per riskTier + orice clauze mandatory din DB
      const dbClauseCodes = clauses.map((c) => c.code);
      const mandatoryDbCodes = clauses.filter((c) => c.isMandatory).map((c) => c.code);

      // Union: coduri planificate + coduri mandatory din DB (deduplicare)
      const allCodes = [...new Set([...riskTierCodes, ...mandatoryDbCodes, ...dbClauseCodes])];

      // ── 3. UPDATE gold_contracts.clausesUsed ─────────────────────────────
      await db
        .update(goldContracts)
        .set({
          clausesUsed: allCodes,
          updatedAt: new Date(),
        })
        .where(and(eq(goldContracts.id, contractId), eq(goldContracts.tenantId, tenantId)));

      job.log(
        `[G33] Clauses selected: contractId=${contractId}, riskTier=${riskTier}, codes=[${allCodes.join(",")}]`,
      );

      // ── 4. Enqueue G34 (DocuSign send) ────────────────────────────────────
      const contract = await db
        .select({
          id: goldContracts.id,
          clientId: goldContracts.clientId,
          orderId: goldContracts.orderId,
        })
        .from(goldContracts)
        .where(and(eq(goldContracts.id, contractId), eq(goldContracts.tenantId, tenantId)))
        .limit(1)
        .then((rows) => rows[0]);

      if (!contract) {
        throw new Error(`[G33] Contract not found: contractId=${contractId}`);
      }

      const docuSignQueue = createQueue(QUEUES.E4_CONTRACT_DOCUSIGN_SEND, {
        db: REDIS_DB_E4,
      });

      await docuSignQueue.add(
        "docusign:send",
        {
          tenantId,
          contractId,
          clientId: contract.clientId,
          orderId: contract.orderId ?? undefined,
          correlationId: job.data.correlationId,
        },
        { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
      );
      await docuSignQueue.close();

      return {
        ok: true,
        contractId,
        riskTier,
        clauseCount: allCodes.length,
        codes: allCodes,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
