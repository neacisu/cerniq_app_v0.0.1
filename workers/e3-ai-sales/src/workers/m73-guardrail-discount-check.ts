/**
 * M73 — guardrail:discount:check (concurrency:20, timeout:30s) CRITICAL
 *
 * Verificare DETERMINISTICĂ: discountul menționat de AI vs get_max_discount + margin ≥8%.
 * Dacă discount > limita DB SAU marja netă < 8% → FAIL.
 *
 * FAIL: discount AI > gold.get_max_discount(tenantId, productId) SAU
 *       marja netă rezultată < 8% (MIN_MARGIN_PERCENT din plan)
 *       → insert guardrail_violations + returnează FAIL.
 * PASS: Niciun discount menționat SAU discount în limite.
 *
 * FAZA 7n — Plan L1915, ADR-0073.
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import {
  runDiscountCheck,
  persistGuardrailViolation,
  type DiscountCheckInput,
} from "../lib/guardrails.js";

const LOG = "[m73:guardrail:discount:check]";

export interface GuardrailDiscountCheckJobData {
  tenantId: string;
  negotiationId: string;
  response: string;
  nodeKey?: string;
}

export const guardrailDiscountCheckProcessor: Processor<GuardrailDiscountCheckJobData> = async (
  job,
) => {
  const { tenantId, negotiationId, response, nodeKey = `m73:${job.id ?? "unknown"}` } = job.data;

  await setSessionTenantId(tenantId);
  console.info(`${LOG} tenantId=${tenantId} negotiationId=${negotiationId}`);

  const input: DiscountCheckInput = { tenantId, negotiationId, response };
  const result = await runDiscountCheck(input);

  if (!result.passed && result.violation) {
    console.warn(`${LOG} FAIL violation=${result.violation}`);
    await persistGuardrailViolation({
      tenantId,
      nodeKey,
      violationType: "discount",
      violation: result.violation,
      details: result.details,
      severity: "CRITICAL",
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
