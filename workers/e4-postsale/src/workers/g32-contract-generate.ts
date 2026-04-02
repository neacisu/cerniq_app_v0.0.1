/**
 * g32-contract-generate.ts — Worker G32: Generare contract DOCX → PDF
 *
 * FLUX:
 * 1. SELECT gold_contract_templates WHERE applicableRiskTiers @> riskTier AND isActive=true
 * 2. SELECT gold_orders pentru orderNumber, totalAmount, creditLimit
 * 3. Generare DOCX completat cu variabile → conversie PDF (LibreOffice headless)
 * 4. Salvare PDF în /LocalStorage/contracts/
 * 5. INSERT gold_contracts cu status='DRAFT', pdfUrl
 * 6. Enqueue G33 (contract:clauses:select)
 *
 * Input: clientId, orderId, riskTier, templateId (optional — dacă null, SELECT primul activ)
 * Timeout worker: 30s (conversie LibreOffice ~2-5s, anti-halucinare D)
 */
import type { Processor } from "bullmq";
import { createQueue, QUEUES, withCognitiveSpan } from "@cerniq/worker-shared";
import {
  db,
  goldContracts,
  goldContractTemplates,
  goldOrders,
  goldCompanies,
  goldCreditProfiles,
  setSessionTenantId,
  eq,
  and,
  isNotNull,
  sql,
} from "@cerniq/db";
import { e4ContractsGeneratedTotal } from "../e4-metrics.js";
import { generateContractPdf, type ContractTemplateVariables } from "../lib/contract-generator.js";

const REDIS_DB_E4 = Number(process.env["REDIS_DB_E4"] ?? process.env["REDIS_DB"] ?? "4");

export type ContractGenerateJobData = {
  tenantId: string;
  clientId: string;
  orderId: string;
  riskTier: string;
  templateId?: string;
  correlationId?: string;
};

export const contractGenerateProcessor: Processor<ContractGenerateJobData> = async (job) => {
  return withCognitiveSpan(
    "e4:contract:generate",
    async (_span) => {
      const { tenantId, clientId, orderId, riskTier, templateId } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. SELECT template DOCX activ per riskTier ───────────────────────
      let template: { id: string; templateDocxUrl: string | null; name: string } | undefined;

      if (templateId) {
        template = await db
          .select({
            id: goldContractTemplates.id,
            templateDocxUrl: goldContractTemplates.templateDocxUrl,
            name: goldContractTemplates.name,
          })
          .from(goldContractTemplates)
          .where(
            and(
              eq(goldContractTemplates.tenantId, tenantId),
              eq(goldContractTemplates.id, templateId),
              eq(goldContractTemplates.isActive, true),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]);
      } else {
        // SELECT primul template activ cu riskTier inclus în applicableRiskTiers
        const rows = await db
          .select({
            id: goldContractTemplates.id,
            templateDocxUrl: goldContractTemplates.templateDocxUrl,
            name: goldContractTemplates.name,
          })
          .from(goldContractTemplates)
          .where(
            and(
              eq(goldContractTemplates.tenantId, tenantId),
              eq(goldContractTemplates.isActive, true),
              // JSON array @> riskTier: verifică că array-ul conține riskTier
              sql`${goldContractTemplates.applicableRiskTiers} @> ${JSON.stringify([riskTier])}::jsonb`,
            ),
          )
          .limit(1);
        template = rows[0];
      }

      if (!template) {
        throw new Error(
          `[G32] No active contract template found for riskTier=${riskTier}, tenant=${tenantId}`,
        );
      }

      if (!template.templateDocxUrl) {
        throw new Error(`[G32] Template ${template.id} has no templateDocxUrl configured`);
      }

      // ── 2. SELECT date comandă și client ─────────────────────────────────
      const order = await db
        .select({
          id: goldOrders.id,
          orderNumber: goldOrders.orderNumber,
          totalAmount: goldOrders.totalAmount,
        })
        .from(goldOrders)
        .where(and(eq(goldOrders.tenantId, tenantId), eq(goldOrders.id, orderId)))
        .limit(1)
        .then((rows) => rows[0]);

      if (!order) {
        throw new Error(`[G32] Order not found: orderId=${orderId}`);
      }

      const company = await db
        .select({
          denumire: goldCompanies.denumire,
          cui: goldCompanies.cui,
          adresa: goldCompanies.adresa,
        })
        .from(goldCompanies)
        .where(and(eq(goldCompanies.tenantId, tenantId), eq(goldCompanies.id, clientId)))
        .limit(1)
        .then((rows) => rows[0]);

      if (!company) {
        throw new Error(`[G32] Company not found: clientId=${clientId}`);
      }

      // Credit limit din gold_credit_profiles (dacă există)
      const creditProfile = await db
        .select({ creditLimit: goldCreditProfiles.creditLimit })
        .from(goldCreditProfiles)
        .where(
          and(
            eq(goldCreditProfiles.tenantId, tenantId),
            eq(goldCreditProfiles.clientId, clientId),
            isNotNull(goldCreditProfiles.creditLimit),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      const creditLimit = creditProfile?.creditLimit ? Number(creditProfile.creditLimit) : 0;

      const today = new Date();
      const contractDate = today.toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      const templateVariables: ContractTemplateVariables = {
        clientName: company.denumire ?? "Client necunoscut",
        cui: company.cui,
        address: company.adresa ?? "",
        orderNumber: order.orderNumber,
        creditLimit,
        riskTier,
        validForDays: 30,
        contractDate,
        clauses: [],
      };

      // INSERT gold_contracts DRAFT
      const contractId = crypto.randomUUID();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const [contract] = await db
        .insert(goldContracts)
        .values({
          id: contractId,
          tenantId,
          clientId,
          orderId,
          riskTier: riskTier as "BLOCKED" | "LOW" | "MEDIUM" | "HIGH" | "PREMIUM",
          status: "DRAFT",
          clausesUsed: [],
          validForDays: 30,
          expiresAt,
        })
        .returning({ id: goldContracts.id });

      if (!contract) {
        throw new Error("[G32] Failed to insert gold_contracts record");
      }

      // ── 3. Generare DOCX → PDF ───────────────────────────────────────────
      const { pdfUrl } = await generateContractPdf(
        template.templateDocxUrl,
        templateVariables,
        contract.id,
      );

      // ── 4. UPDATE gold_contracts cu pdfUrl ────────────────────────────────
      await db
        .update(goldContracts)
        .set({ pdfUrl, updatedAt: new Date() })
        .where(eq(goldContracts.id, contract.id));

      e4ContractsGeneratedTotal.inc({ tenant_id: tenantId, risk_tier: riskTier });

      job.log(
        `[G32] Contract generated: contractId=${contract.id}, orderNumber=${order.orderNumber}, riskTier=${riskTier}`,
      );

      // ── 5. Enqueue G33 (selecție clauze) ──────────────────────────────────
      const clausesQueue = createQueue(QUEUES.E4_CONTRACT_CLAUSES_SELECT, {
        db: REDIS_DB_E4,
      });

      await clausesQueue.add(
        "clauses:select",
        {
          tenantId,
          contractId: contract.id,
          clientId,
          riskTier,
          correlationId: job.data.correlationId,
        },
        { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
      );
      await clausesQueue.close();

      return {
        ok: true,
        contractId: contract.id,
        pdfUrl,
        riskTier,
        orderNumber: order.orderNumber,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
