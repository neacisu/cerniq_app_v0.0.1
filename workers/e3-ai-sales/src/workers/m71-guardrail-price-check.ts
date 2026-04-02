/**
 * M71 — guardrail:price:check (concurrency:20, timeout:30s) CRITICAL
 *
 * Verificare DETERMINISTICĂ: prețul menționat de AI vs gold_products.unit_price.
 * Parsare preț regex din răspunsul AI → comparare contra DB (toleranță 2%).
 *
 * FAIL: AI menționează preț care deviază cu >2% față de prețul oficial al
 *       oricărui produs din negociere → insert guardrail_violations + returnează FAIL.
 * PASS: Niciun preț menționat SAU toate prețurile în limite.
 *
 * FAZA 7n — Plan L1913, ADR-0073.
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import {
  runPriceCheck,
  persistGuardrailViolation,
  type PriceCheckInput,
} from "../lib/guardrails.js";

const LOG = "[m71:guardrail:price:check]";

export interface GuardrailPriceCheckJobData {
  tenantId: string;
  negotiationId: string;
  response: string;
  /** Toleranță față de prețul oficial (default 2%) */
  tolerancePercent?: number;
  /** Origine job — pentru audit (ex: "c16:session:xyz") */
  nodeKey?: string;
}

export const guardrailPriceCheckProcessor: Processor<GuardrailPriceCheckJobData> = async (job) => {
  const {
    tenantId,
    negotiationId,
    response,
    tolerancePercent = 2,
    nodeKey = `m71:${job.id ?? "unknown"}`,
  } = job.data;

  await setSessionTenantId(tenantId);
  console.info(`${LOG} tenantId=${tenantId} negotiationId=${negotiationId}`);

  const input: PriceCheckInput = { tenantId, negotiationId, response, tolerancePercent };
  const result = await runPriceCheck(input);

  if (!result.passed && result.violation) {
    console.warn(`${LOG} FAIL violation=${result.violation}`);
    await persistGuardrailViolation({
      tenantId,
      nodeKey,
      violationType: "price",
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
