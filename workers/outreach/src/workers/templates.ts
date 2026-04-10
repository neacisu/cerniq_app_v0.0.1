/**
 * Template workers — Cat F (spintax, personalize, validate)
 * Source: etapa2-workers-F-L-remaining.md
 */
import type { Job, Worker } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { createOutreachJobLogger, OUTREACH_SYSTEM_TENANT } from "../lib/outreach-job-logger.js";

const svcLog = createServiceLogger("outreach-templates", { etapa: "e2" });
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
      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-template-spintax",
        queueName: QUEUES.TEMPLATE_SPINTAX_PROCESS,
        tenantId: OUTREACH_SYSTEM_TENANT,
      });
      jlog.info("template_spintax", "start", { bodyLen: templateBody.length });
      const processed = processSpintax(templateBody, variables);
      jlog.done("template_spintax", "complete", { outLen: processed.length });
      svcLog.debug({ outLen: processed.length }, "template_spintax_processed");
      return { processed };
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
      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-template-personalize",
        queueName: QUEUES.TEMPLATE_PERSONALIZE,
        tenantId,
        entityType: "template",
        entityId: templateId,
      });
      jlog.info("template_personalize", "start", { leadDataKeys: Object.keys(leadData).length });
      await setSessionTenantId(tenantId);
      const [tmpl] = await db
        .select()
        .from(outreachTemplates)
        .where(and(eq(outreachTemplates.id, templateId), eq(outreachTemplates.tenantId, tenantId)))
        .limit(1);
      if (!tmpl) {
        const err = new Error("Template not found");
        const enr = enrichError(err, { tenantId, templateId });
        jlog.error("template_personalize", "not_found", {
          templateId,
          fingerprint: enr.fingerprint,
          errorType: enr.errorType,
        });
        throw err;
      }
      const body = processSpintax(tmpl.bodyTemplate, leadData);
      const subject = tmpl.subject ? processSpintax(tmpl.subject, leadData) : null;
      jlog.done("template_personalize", "complete", { channel: tmpl.channel });
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
      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-template-validate",
        queueName: QUEUES.TEMPLATE_VALIDATE,
        tenantId: OUTREACH_SYSTEM_TENANT,
      });
      jlog.info("template_validate", "start", { maxLength, bodyLen: templateBody.length });
      const vars = detectVariables(templateBody);
      const errors: string[] = [];
      if (templateBody.length > maxLength) errors.push(`length_exceeds_${maxLength}`);
      errors.push(...validateSpintaxBalance(templateBody));
      const valid = errors.length === 0;
      jlog.done("template_validate", "complete", { valid, errorCount: errors.length });
      return {
        valid,
        variables: vars,
        errors: [...new Set(errors)],
      };
    },
    { concurrency: 20 },
  );
  return worker;
}
