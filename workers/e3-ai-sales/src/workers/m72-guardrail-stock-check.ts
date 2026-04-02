/**
 * M72 — guardrail:stock:check (concurrency:20, timeout:30s) CRITICAL
 *
 * Verificare DETERMINISTICĂ: AI afirmă disponibilitate stoc vs get_available_stock(sku).
 * Dacă AI spune "avem stoc" / "este disponibil" dar available=0 → FAIL.
 *
 * FAIL: AI face afirmație pozitivă de stoc ȘI gold.get_available_stock(sku) = 0
 *       → insert guardrail_violations + returnează FAIL.
 * PASS: AI nu menționează stoc SAU stocul real este > 0 pentru toate SKU-urile.
 *
 * FAZA 7n — Plan L1914, ADR-0073.
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import {
  runStockCheck,
  persistGuardrailViolation,
  type StockCheckInput,
} from "../lib/guardrails.js";

const LOG = "[m72:guardrail:stock:check]";

export interface GuardrailStockCheckJobData {
  tenantId: string;
  negotiationId: string;
  response: string;
  nodeKey?: string;
}

export const guardrailStockCheckProcessor: Processor<GuardrailStockCheckJobData> = async (job) => {
  const { tenantId, negotiationId, response, nodeKey = `m72:${job.id ?? "unknown"}` } = job.data;

  await setSessionTenantId(tenantId);
  console.info(`${LOG} tenantId=${tenantId} negotiationId=${negotiationId}`);

  const input: StockCheckInput = { tenantId, negotiationId, response };
  const result = await runStockCheck(input);

  if (!result.passed && result.violation) {
    console.warn(`${LOG} FAIL violation=${result.violation}`);
    await persistGuardrailViolation({
      tenantId,
      nodeKey,
      violationType: "stock",
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
