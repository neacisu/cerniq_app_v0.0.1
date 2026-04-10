import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { insertBronzeRows, triggerNormalizationForContacts } from "./ingest-utils.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("a5-manual-entry", { etapa: "e1" });

export type ManualEntryJobData = {
  tenantId: string;
  userId: string;
  formData: Record<string, unknown>;
  formId: string;
  correlationId: string;
};

export const manualEntryProcessor: Processor<ManualEntryJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ingest:manual",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "A5:manual-entry",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
      });

      try {
        svcLog.info(
          {
            tenantId: job.data.tenantId,
            correlationId: job.data.correlationId,
            formId: job.data.formId,
          },
          "A5 manual-entry job",
        );
        log.step(
          "start",
          `Intrare manuală: formular ${job.data.formId}, utilizator ${job.data.userId}`,
          {
            formId: job.data.formId,
            userId: job.data.userId,
            fieldCount: Object.keys(job.data.formData ?? {}).length,
          },
        );

        if (!job.data.formData || Object.keys(job.data.formData).length === 0) {
          log.error(
            "empty_form",
            `Formularul de intrare manuală este gol — contactul nu poate fi creat`,
            {
              formId: job.data.formId,
              userId: job.data.userId,
            },
          );
          throw new Error("Manual entry cannot be empty", { cause: new Error("empty_form") });
        }

        const { rowsInserted, insertedIds } = await insertBronzeRows(
          job.data.tenantId,
          [job.data.formData],
          "manual",
        );
        await triggerNormalizationForContacts(
          job.data.tenantId,
          insertedIds,
          job.data.correlationId,
        );

        const status = rowsInserted > 0 ? "created" : "duplicate";
        if (status === "duplicate") {
          log.warn(
            "duplicate",
            `Contact manual duplicat — un contact identic există deja în bronze`,
            {
              formId: job.data.formId,
            },
          );
        } else {
          log.step("done", `Contact manual creat în bronze, normalizare declanșată`, {
            rowsInserted,
            insertedIds: insertedIds.length,
            durationMs: Date.now() - startedAt,
          });
        }

        jobsProcessed.add(1, { worker: "a5-manual-entry", status: "success" });
        jobDuration.record(Date.now() - startedAt, { worker: "a5-manual-entry" });
        await job.updateProgress(100);
        return { ok: true, status, rowsInserted };
      } catch (error) {
        jobErrors.add(1, { worker: "a5-manual-entry" });
        const enriched = enrichError(error, {
          tenantId: job.data.tenantId,
          formId: job.data.formId,
          userId: job.data.userId,
        });
        log.error("fatal", `Eroare la salvare intrare manuală`, {
          ...enriched,
          formId: job.data.formId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
