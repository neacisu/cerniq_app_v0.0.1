import type { Processor } from "bullmq";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { insertBronzeRows, triggerNormalizationForContacts } from "./ingest-utils.js";

export type ManualEntryJobData = {
  tenantId: string;
  userId: string;
  formData: Record<string, unknown>;
  formId: string;
  correlationId: string;
};

export const manualEntryProcessor: Processor<ManualEntryJobData> = async (job) => {
  const startedAt = Date.now();
  try {
    if (!job.data.formData || Object.keys(job.data.formData).length === 0) {
      throw new Error("Manual entry cannot be empty");
    }

    const { rowsInserted, insertedIds } = await insertBronzeRows(
      job.data.tenantId,
      [job.data.formData],
      "manual",
    );
    await triggerNormalizationForContacts(job.data.tenantId, insertedIds, job.data.correlationId);
    jobsProcessed.add(1, { worker: "a5-manual-entry", status: "success" });
    jobDuration.record(Date.now() - startedAt, { worker: "a5-manual-entry" });
    await job.updateProgress(100);
    return { ok: true, status: rowsInserted > 0 ? "created" : "duplicate", rowsInserted };
  } catch (error) {
    jobErrors.add(1, { worker: "a5-manual-entry" });
    throw error;
  }
};
