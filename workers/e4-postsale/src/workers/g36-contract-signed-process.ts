/**
 * g36-contract-signed-process.ts — Worker G36: Procesare contract semnat
 *
 * FLUX:
 * 1. GET DocuSign /envelopes/{envelopeId}/documents/combined → download signed PDF
 * 2. Salvare PDF semnat în /LocalStorage/contracts/signed/
 * 3. UPDATE gold_contracts SET signedPdfUrl, status='SIGNED', signedAt=NOW()
 * 4. INSERT gold_audit_logs_etapa4 cu eventType='CONTRACT_SIGNED'
 * 5. Log: notificare internă contract semnat
 */
import type { Processor } from "bullmq";
import { createServiceLogger } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, goldContracts, goldAuditLogsEtapa4, setSessionTenantId, eq, and } from "@cerniq/db";
import { downloadDocuSignDocument } from "../lib/docusign-client.js";
import { storeSignedContractPdf } from "../lib/contract-generator.js";
import { e4ContractsSignedTotal } from "../e4-metrics.js";

const g36Log = createServiceLogger("e4-g36-contract-signed-process", { etapa: "e4" });

export type ContractSignedProcessJobData = {
  tenantId: string;
  contractId: string;
  envelopeId: string;
  correlationId?: string;
};

export const contractSignedProcessProcessor: Processor<ContractSignedProcessJobData> = async (
  job,
) => {
  return withCognitiveSpan(
    "e4:contract:signed:process",
    async (_span) => {
      const { tenantId, contractId, envelopeId } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. Verificare contract ─────────────────────────────────────────────
      const contract = await db
        .select({
          id: goldContracts.id,
          status: goldContracts.status,
          signedAt: goldContracts.signedAt,
        })
        .from(goldContracts)
        .where(and(eq(goldContracts.id, contractId), eq(goldContracts.tenantId, tenantId)))
        .limit(1)
        .then((rows) => rows[0]);

      if (!contract) {
        throw new Error(`[G36] Contract not found: contractId=${contractId}`);
      }

      // Idempotentă: dacă deja SIGNED, skip
      if (contract.status === "SIGNED") {
        job.log(`[G36] Contract already SIGNED (idempotent skip): contractId=${contractId}`);
        return { ok: true, contractId, skipped: true };
      }

      // ── 2. Download signed PDF din DocuSign ───────────────────────────────
      const signedPdfBuffer = await downloadDocuSignDocument(envelopeId, "combined");

      // ── 3. Salvare PDF semnat în /LocalStorage/contracts/signed/ ──────────
      const { pdfUrl: signedPdfUrl } = await storeSignedContractPdf(signedPdfBuffer, contractId);

      const signedAt = new Date();

      // ── 4. UPDATE gold_contracts ───────────────────────────────────────────
      await db
        .update(goldContracts)
        .set({
          signedPdfUrl,
          status: "SIGNED",
          docusignStatus: "completed",
          signedAt,
          updatedAt: signedAt,
        })
        .where(and(eq(goldContracts.id, contractId), eq(goldContracts.tenantId, tenantId)));

      // ── 5. INSERT audit log ────────────────────────────────────────────────
      await db.insert(goldAuditLogsEtapa4).values({
        tenantId,
        eventType: "CONTRACT_SIGNED",
        entityType: "gold_contracts",
        entityId: contractId,
        actorType: "WORKER",
        newValues: {
          envelopeId,
          signedPdfUrl,
          signedAt: signedAt.toISOString(),
          previousStatus: contract.status,
        },
      });

      e4ContractsSignedTotal.inc({ tenant_id: tenantId });

      // ── 6. Notificare internă ─────────────────────────────────────────────
      g36Log.info({ contractId, tenantId, envelopeId, signedPdfUrl }, "contract_signed_processed");

      return {
        ok: true,
        contractId,
        envelopeId,
        signedPdfUrl,
        signedAt: signedAt.toISOString(),
        skipped: false,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
