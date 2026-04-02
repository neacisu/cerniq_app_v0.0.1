/**
 * g34-contract-docusign-send.ts — Worker G34: Creare envelope DocuSign + send
 *
 * FLUX:
 * 1. SELECT gold_contracts + gold_orders (pentru orderNumber)
 * 2. SELECT signer din gold_contacts WHERE companyId=clientId AND role='ADMINISTRATOR' LIMIT 1
 * 3. Citește PDF din /LocalStorage/contracts/
 * 4. POST DocuSign /envelopes cu document PDF + signer
 * 5. UPDATE gold_contracts SET docusignEnvelopeId, docusignStatus='sent', status='SENT_DOCUSIGN'
 * 6. INSERT gold_audit_logs_etapa4 cu eventType='CONTRACT_SENT'
 *
 * Subject envelope: "Contract {orderNumber} — Cerniq" (Plan FAZA 8f)
 */
import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import {
  db,
  goldContracts,
  goldOrders,
  goldContacts,
  goldAuditLogsEtapa4,
  setSessionTenantId,
  eq,
  and,
} from "@cerniq/db";
import { createDocuSignEnvelope } from "../lib/docusign-client.js";
import { readContractPdf } from "../lib/contract-generator.js";

export type ContractDocuSignSendJobData = {
  tenantId: string;
  contractId: string;
  clientId: string;
  orderId?: string;
  correlationId?: string;
};

export const contractDocuSignSendProcessor: Processor<ContractDocuSignSendJobData> = async (
  job,
) => {
  return withCognitiveSpan(
    "e4:contract:docusign:send",
    async (_span) => {
      const { tenantId, contractId, clientId, orderId } = job.data;
      await setSessionTenantId(tenantId);

      // ── 1. SELECT contract + PDF url ──────────────────────────────────────
      const contract = await db
        .select({
          id: goldContracts.id,
          pdfUrl: goldContracts.pdfUrl,
          riskTier: goldContracts.riskTier,
          status: goldContracts.status,
          expiresAt: goldContracts.expiresAt,
        })
        .from(goldContracts)
        .where(and(eq(goldContracts.id, contractId), eq(goldContracts.tenantId, tenantId)))
        .limit(1)
        .then((rows) => rows[0]);

      if (!contract) {
        throw new Error(`[G34] Contract not found: contractId=${contractId}`);
      }

      if (!contract.pdfUrl) {
        throw new Error(
          `[G34] Contract has no pdfUrl: contractId=${contractId} (G32 must run first)`,
        );
      }

      // ── 2. SELECT orderNumber ─────────────────────────────────────────────
      let orderNumber = "N/A";
      if (orderId) {
        const order = await db
          .select({ orderNumber: goldOrders.orderNumber })
          .from(goldOrders)
          .where(and(eq(goldOrders.tenantId, tenantId), eq(goldOrders.id, orderId)))
          .limit(1)
          .then((rows) => rows[0]);
        if (order) orderNumber = order.orderNumber;
      }

      // ── 3. SELECT signer: gold_contacts WHERE role='ADMINISTRATOR' ────────
      const signer = await db
        .select({
          id: goldContacts.id,
          email: goldContacts.email,
          numeComplet: goldContacts.numeComplet,
        })
        .from(goldContacts)
        .where(
          and(
            eq(goldContacts.tenantId, tenantId),
            eq(goldContacts.companyId, clientId),
            eq(goldContacts.role, "ADMINISTRATOR"),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!signer?.email) {
        // Fallback: orice contact cu email valid
        const fallback = await db
          .select({
            id: goldContacts.id,
            email: goldContacts.email,
            numeComplet: goldContacts.numeComplet,
          })
          .from(goldContacts)
          .where(and(eq(goldContacts.tenantId, tenantId), eq(goldContacts.companyId, clientId)))
          .limit(1)
          .then((rows) => rows[0]);

        if (!fallback?.email) {
          throw new Error(
            `[G34] No signer with email found for clientId=${clientId} — cannot send DocuSign envelope`,
          );
        }

        job.log(`[G34] No ADMINISTRATOR contact found; using fallback contact: ${fallback.id}`);

        const pdfBuffer = await readContractPdf(contract.pdfUrl);

        return sendEnvelope(
          job,
          tenantId,
          contractId,
          orderNumber,
          fallback.email,
          fallback.numeComplet ?? "Semnatar",
          pdfBuffer,
        );
      }

      // ── 4. Citește PDF ────────────────────────────────────────────────────
      const pdfBuffer = await readContractPdf(contract.pdfUrl);

      return sendEnvelope(
        job,
        tenantId,
        contractId,
        orderNumber,
        signer.email,
        signer.numeComplet ?? "Semnatar",
        pdfBuffer,
      );
    },
    { tenantId: job.data.tenantId },
  );
};

async function sendEnvelope(
  job: { log: (msg: string) => void },
  tenantId: string,
  contractId: string,
  orderNumber: string,
  signerEmail: string,
  signerName: string,
  pdfBuffer: Buffer,
): Promise<{ ok: boolean; contractId: string; envelopeId: string; status: string }> {
  const documentBase64 = pdfBuffer.toString("base64");

  // ── 5. POST DocuSign envelope ─────────────────────────────────────────
  const envelope = await createDocuSignEnvelope({
    emailSubject: `Contract ${orderNumber} — Cerniq`,
    documents: [
      {
        documentBase64,
        documentId: "1",
        fileExtension: "pdf",
        name: `Contract-${orderNumber}.pdf`,
      },
    ],
    signers: [{ email: signerEmail, name: signerName, recipientId: "1" }],
  });

  // ── 6. UPDATE gold_contracts ──────────────────────────────────────────
  await db
    .update(goldContracts)
    .set({
      docusignEnvelopeId: envelope.envelopeId,
      docusignStatus: envelope.status,
      status: "SENT_DOCUSIGN",
      updatedAt: new Date(),
    })
    .where(and(eq(goldContracts.id, contractId), eq(goldContracts.tenantId, tenantId)));

  // ── 7. INSERT audit log ───────────────────────────────────────────────
  await db.insert(goldAuditLogsEtapa4).values({
    tenantId,
    eventType: "CONTRACT_SENT",
    entityType: "gold_contracts",
    entityId: contractId,
    actorType: "WORKER",
    newValues: {
      docusignEnvelopeId: envelope.envelopeId,
      docusignStatus: envelope.status,
      signerEmail,
      signerName,
      orderNumber,
    },
  });

  job.log(
    `[G34] DocuSign envelope sent: contractId=${contractId}, envelopeId=${envelope.envelopeId}, signer=${signerEmail}`,
  );

  return {
    ok: true,
    contractId,
    envelopeId: envelope.envelopeId,
    status: envelope.status,
  };
}
