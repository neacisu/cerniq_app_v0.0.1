/**
 * Render șabloane SMS — `sms:template:render`
 * Similar `template:personalize`, cu validare segmente vs `max_segments`.
 */
import type { Job, Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "@cerniq/observability";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { and, db, eq, setSessionTenantId, smsTemplates } from "@cerniq/db";
import { createOutreachJobLogger } from "../lib/outreach-job-logger.js";
import { logSmsJobFailureAndThrow } from "../lib/sms-job-failure-log.js";
import { processSpintax } from "../utils/spintax.js";
import { estimateSmsSegments } from "../utils/sms-encoding.js";

const svcLog = createServiceLogger("outreach-sms-template-render", { etapa: "e2" });

export interface SmsTemplateRenderJobData {
  tenantId: string;
  templateId: string;
  variables: Record<string, string>;
  correlationId?: string;
}

export interface SmsTemplateRenderResult {
  body: string;
  segments: number;
  encoding: "GSM7" | "UCS2";
  maxSegmentsAllowed: number;
  valid: boolean;
}

const TEMPLATE_BUSINESS_ERRORS = new Set(["SMS template not found", "SMS template is not active"]);

export function createSmsTemplateRenderWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.SMS_TEMPLATE_RENDER,
    async (job: Job<SmsTemplateRenderJobData>): Promise<SmsTemplateRenderResult> => {
      const { tenantId, templateId, variables } = job.data;
      const correlationId = job.data.correlationId?.trim() || uuidv4();

      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-sms-template-render",
        queueName: QUEUES.SMS_TEMPLATE_RENDER,
        tenantId,
        entityType: "sms_template",
        entityId: templateId,
        correlationId,
      });
      jlog.info("sms_template_render", "start", { varKeys: Object.keys(variables).length });

      try {
        await setSessionTenantId(tenantId);

        const [tmpl] = await db
          .select()
          .from(smsTemplates)
          .where(and(eq(smsTemplates.id, templateId), eq(smsTemplates.tenantId, tenantId)))
          .limit(1);

        if (!tmpl) {
          jlog.error("sms_template_render", "template_not_found", { templateId });
          throw new Error("SMS template not found");
        }
        if (!tmpl.isActive) {
          jlog.warn("sms_template_render", "template_inactive", { templateId });
          throw new Error("SMS template is not active");
        }

        const body = processSpintax(tmpl.bodyTemplate, variables);
        const { segments, encoding } = estimateSmsSegments(body);
        const maxSegmentsAllowed = tmpl.maxSegments;
        const valid = segments <= maxSegmentsAllowed;

        const result: SmsTemplateRenderResult = {
          body,
          segments,
          encoding,
          maxSegmentsAllowed,
          valid,
        };
        jlog.done("sms_template_render", "complete", {
          segments,
          valid,
          encoding,
        });
        svcLog.info(
          { tenantId, templateId, valid, segments, correlationId },
          "sms_template_rendered",
        );
        return result;
      } catch (err) {
        if (err instanceof Error && TEMPLATE_BUSINESS_ERRORS.has(err.message)) {
          throw err;
        }
        logSmsJobFailureAndThrow(
          svcLog.error.bind(svcLog),
          jlog,
          err,
          "sms_template_render_failed",
          "sms_template_render",
          { tenantId, templateId },
        );
      }
    },
    { concurrency: 30 },
  );
  return worker;
}
