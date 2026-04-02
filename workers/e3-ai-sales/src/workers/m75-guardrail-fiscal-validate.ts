/**
 * M75 — guardrail:fiscal:validate (concurrency:20, timeout:30s) CRITICAL
 *
 * Verificare DETERMINISTICĂ fiscală:
 *   1. CUI/CIF valid prin algoritmul modulo 11 (legislație românească)
 *   2. Cote TVA valide: 0%, 5%, 9%, 19% (2024-2026)
 *   3. Aritmetică totale: subtotal + TVA = total (toleranță 1%)
 *
 * FAIL: Oricare din cele 3 verificări eșuează
 *       → insert guardrail_violations + returnează FAIL.
 * PASS: Nicio problemă fiscală detectată.
 *
 * FAZA 7n — Plan L1917, ADR-0073.
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import {
  runFiscalValidate,
  persistGuardrailViolation,
  type FiscalValidateInput,
} from "../lib/guardrails.js";

const LOG = "[m75:guardrail:fiscal:validate]";

export interface GuardrailFiscalValidateJobData {
  tenantId: string;
  response: string;
  nodeKey?: string;
}

export const guardrailFiscalValidateProcessor: Processor<GuardrailFiscalValidateJobData> = async (
  job,
) => {
  const { tenantId, response, nodeKey = `m75:${job.id ?? "unknown"}` } = job.data;

  await setSessionTenantId(tenantId);
  console.info(`${LOG} tenantId=${tenantId}`);

  const input: FiscalValidateInput = { response };
  const result = await runFiscalValidate(input);

  if (!result.passed && result.violation) {
    console.warn(`${LOG} FAIL violation=${result.violation}`);
    await persistGuardrailViolation({
      tenantId,
      nodeKey,
      violationType: "fiscal",
      violation: result.violation,
      details: result.details,
      severity: "CRITICAL",
    });
  } else {
    console.info(`${LOG} PASS tenantId=${tenantId}`);
  }

  return {
    ok: true,
    passed: result.passed,
    guardrailType: result.guardrailType,
    violation: result.violation,
  };
};
