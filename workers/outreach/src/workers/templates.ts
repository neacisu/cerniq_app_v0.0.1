/**
 * Template workers — Cat F (spintax, personalize, validate)
 * Source: etapa2-workers-F-L-remaining.md
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { and, db, eq, outreachTemplates, setSessionTenantId } from "@cerniq/db";
import { detectVariables, processSpintax } from "../utils/spintax.js";

export interface SpintaxProcessJobData {
  templateBody: string;
  variables?: Record<string, string>;
}

export interface PersonalizeJobData {
  tenantId: string;
  templateId: string;
  /** Valori pentru {{variabile}} */
  leadData: Record<string, string>;
}

export interface ValidateJobData {
  templateBody: string;
  /** Limită caractere (default 4000). */
  maxLength?: number;
}

function validateSpintaxBalance(body: string): string[] {
  const errors: string[] = [];
  let depth = 0;
  for (const ch of body) {
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth < 0) {
      errors.push("unbalanced_braces");
      return errors;
    }
  }
  if (depth !== 0) errors.push("unclosed_spintax");
  return errors;
}

export function createSpintaxProcessWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.TEMPLATE_SPINTAX_PROCESS,
    async (job: Job<SpintaxProcessJobData>) => {
      const { templateBody, variables = {} } = job.data;
      return { processed: processSpintax(templateBody, variables) };
    },
    { concurrency: 100 },
  );
  return worker;
}

export function createPersonalizeWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.TEMPLATE_PERSONALIZE,
    async (job: Job<PersonalizeJobData>) => {
      const { tenantId, templateId, leadData } = job.data;
      await setSessionTenantId(tenantId);
      const [tmpl] = await db
        .select()
        .from(outreachTemplates)
        .where(and(eq(outreachTemplates.id, templateId), eq(outreachTemplates.tenantId, tenantId)))
        .limit(1);
      if (!tmpl) throw new Error("Template not found");
      const body = processSpintax(tmpl.bodyTemplate, leadData);
      const subject = tmpl.subject ? processSpintax(tmpl.subject, leadData) : null;
      return { body, subject, channel: tmpl.channel };
    },
    { concurrency: 50 },
  );
  return worker;
}

export function createValidateWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.TEMPLATE_VALIDATE,
    async (job: Job<ValidateJobData>) => {
      const { templateBody, maxLength = 4000 } = job.data;
      const vars = detectVariables(templateBody);
      const errors: string[] = [];
      if (templateBody.length > maxLength) errors.push(`length_exceeds_${maxLength}`);
      errors.push(...validateSpintaxBalance(templateBody));
      return {
        valid: errors.length === 0,
        variables: vars,
        errors: [...new Set(errors)],
      };
    },
    { concurrency: 20 },
  );
  return worker;
}
