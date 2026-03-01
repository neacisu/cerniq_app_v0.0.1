import type { Processor } from "bullmq";
import { insertBronzeRows, triggerNormalizationForContacts } from "./ingest-utils.js";

export type ManualEntryJobData = {
  tenantId: string;
  userId: string;
  formData: Record<string, unknown>;
  formId: string;
  correlationId: string;
};

export const manualEntryProcessor: Processor<ManualEntryJobData> = async (job) => {
  if (!job.data.formData || Object.keys(job.data.formData).length === 0) {
    throw new Error("Manual entry cannot be empty");
  }

  const { rowsInserted, insertedIds } = await insertBronzeRows(
    job.data.tenantId,
    [job.data.formData],
    "manual",
  );
  await triggerNormalizationForContacts(job.data.tenantId, insertedIds, job.data.correlationId);
  return { ok: true, status: rowsInserted > 0 ? "created" : "duplicate", rowsInserted };
};
