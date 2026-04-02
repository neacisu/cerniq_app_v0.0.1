/**
 * G43 — oblio:client:validate (concurrency:3, rate:1/sec)
 *
 * Verifică/creează un client în Oblio pe baza CUI-ului din goldCompanies.
 * Date sensibile (CUI, denumire) — procesate EXCLUSIV pe self-hosted (Regula 6).
 *
 * ANTI-HALUCINARE:
 *   - CUI din goldCompanies.cui (câmp obligatoriu în schema gold.ts L70)
 *   - Negocierea trebuie să existe și să aibă leadId valid
 *   - oblioClient.validateClient este STUB — NU face apel HTTP real
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldNegotiations, goldCompanies, eq, and } from "@cerniq/db";
import { oblioClient } from "../lib/oblio-client.js";

const LOG = "[g43-oblio-client-validate]";

export interface OblioClientValidateJobData {
  tenantId: string;
  negotiationId: string;
}

export interface OblioClientValidateResult {
  ok: true;
  oblioClientId: string;
  clientName: string;
  cui: string;
  isNew: boolean;
}

export const oblioClientValidateProcessor: Processor<
  OblioClientValidateJobData,
  OblioClientValidateResult
> = async (job) => {
  const { tenantId, negotiationId } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Fetch negociere → leadId
  const negotiations = await db
    .select({ id: goldNegotiations.id, leadId: goldNegotiations.leadId })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)))
    .limit(1);

  if (negotiations.length === 0) {
    throw new Error(`g43: negociere ${negotiationId} negăsită`);
  }

  const leadId = negotiations[0].leadId;

  // 2. Fetch goldCompanies — date sensibile (CUI, denumire) pe self-hosted
  const companies = await db
    .select({
      id: goldCompanies.id,
      cui: goldCompanies.cui,
      denumire: goldCompanies.denumire,
      platitorTva: goldCompanies.platitorTva,
    })
    .from(goldCompanies)
    .where(and(eq(goldCompanies.id, leadId), eq(goldCompanies.tenantId, tenantId)))
    .limit(1);

  if (companies.length === 0) {
    throw new Error(`g43: company ${leadId} negăsită pentru tenantId=${tenantId}`);
  }

  const company = companies[0];

  // 3. Apel Oblio API — validare/creare client (STUB)
  // REGULA 6: CUI și denumire procesate EXCLUSIV pe self-hosted
  const clientResult = await oblioClient.validateClient({
    tenantId,
    cui: company.cui,
    name: company.denumire ?? company.cui,
    platitorTva: company.platitorTva ?? false,
  });

  console.info(
    `${LOG} tenantId=${tenantId} negotiationId=${negotiationId} cui=${company.cui} oblioClientId=${clientResult.oblioClientId} isNew=${clientResult.isNew}`,
  );

  return {
    ok: true,
    oblioClientId: clientResult.oblioClientId,
    clientName: clientResult.clientName,
    cui: company.cui,
    isNew: clientResult.isNew,
  };
};
