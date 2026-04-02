/**
 * M74 — guardrail:sku:validate (concurrency:20, timeout:30s) CRITICAL
 *
 * Verificare DETERMINISTICĂ: SKU-uri menționate explicit de AI vs gold_products.
 * Detectează pattern-uri "SKU: XYZ", "cod produs: ABC" și validează contra DB.
 *
 * FAIL: AI menționează un SKU care nu există în catalogul activ al tenant-ului
 *       → insert guardrail_violations + returnează FAIL.
 * PASS: Niciun SKU explicit detectat SAU toate SKU-urile există în catalog.
 *
 * FAZA 7n — Plan L1916, ADR-0073.
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import {
  runSkuValidate,
  persistGuardrailViolation,
  type SkuValidateInput,
} from "../lib/guardrails.js";

const LOG = "[m74:guardrail:sku:validate]";

export interface GuardrailSkuValidateJobData {
  tenantId: string;
  negotiationId: string;
  response: string;
  nodeKey?: string;
}

export const guardrailSkuValidateProcessor: Processor<GuardrailSkuValidateJobData> = async (
  job,
) => {
  const { tenantId, negotiationId, response, nodeKey = `m74:${job.id ?? "unknown"}` } = job.data;

  await setSessionTenantId(tenantId);
  console.info(`${LOG} tenantId=${tenantId} negotiationId=${negotiationId}`);

  const input: SkuValidateInput = { tenantId, negotiationId, response };
  const result = await runSkuValidate(input);

  if (!result.passed && result.violation) {
    console.warn(`${LOG} FAIL violation=${result.violation}`);
    await persistGuardrailViolation({
      tenantId,
      nodeKey,
      violationType: "sku",
      violation: result.violation,
      details: result.details,
      severity: "HIGH",
    });
  } else {
    console.info(`${LOG} PASS negotiationId=${negotiationId}`);
  }

  return {
    ok: true,
    passed: result.passed,
    guardrailType: result.guardrailType,
    violation: result.violation,
  };
};
