/**
 * Render șabloane SMS — `sms:template:render`
 * Similar `template:personalize`, cu validare segmente vs `max_segments`.
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { and, db, eq, setSessionTenantId, smsTemplates } from "@cerniq/db";
import { processSpintax } from "../utils/spintax.js";
import { estimateSmsSegments } from "../utils/sms-encoding.js";

export interface SmsTemplateRenderJobData {
  tenantId: string;
  templateId: string;
  variables: Record<string, string>;
}

export interface SmsTemplateRenderResult {
  body: string;
  segments: number;
  encoding: "GSM7" | "UCS2";
  maxSegmentsAllowed: number;
  valid: boolean;
}

export function createSmsTemplateRenderWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.SMS_TEMPLATE_RENDER,
    async (job: Job<SmsTemplateRenderJobData>): Promise<SmsTemplateRenderResult> => {
      const { tenantId, templateId, variables } = job.data;
      await setSessionTenantId(tenantId);

      const [tmpl] = await db
        .select()
        .from(smsTemplates)
        .where(and(eq(smsTemplates.id, templateId), eq(smsTemplates.tenantId, tenantId)))
        .limit(1);

      if (!tmpl) {
        throw new Error("SMS template not found");
      }
      if (!tmpl.isActive) {
        throw new Error("SMS template is not active");
      }

      const body = processSpintax(tmpl.bodyTemplate, variables);
      const { segments, encoding } = estimateSmsSegments(body);
      const maxSegmentsAllowed = tmpl.maxSegments;
      const valid = segments <= maxSegmentsAllowed;

      return {
        body,
        segments,
        encoding,
        maxSegmentsAllowed,
        valid,
      };
    },
    { concurrency: 30 },
  );
  return worker;
}
