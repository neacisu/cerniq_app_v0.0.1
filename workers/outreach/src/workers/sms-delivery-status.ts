/**
 * Procesare delivery receipts SMS — `sms:delivery:status` (livrare / bounce / reject).
 */
import type { Job, Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "@cerniq/observability";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { createOutreachJobLogger } from "../lib/outreach-job-logger.js";
import { logSmsJobFailureAndThrow } from "../lib/sms-job-failure-log.js";

const svcLog = createServiceLogger("outreach-sms-delivery-status", { etapa: "e2" });

export interface SmsDeliveryStatusJobData {
  tenantId: string;
  providerMessageId: string;
  /** Livrare finală sau eșec permanent. */
  status: "DELIVERED" | "FAILED" | "REJECTED" | "UNDELIVERABLE";
  timestamp: string;
  failureReason?: string;
  correlationId?: string;
}

function mapSmsTableStatus(
  s: SmsDeliveryStatusJobData["status"],
): "DELIVERED" | "FAILED" | "REJECTED" {
  if (s === "DELIVERED") return "DELIVERED";
  if (s === "REJECTED") return "REJECTED";
  return "FAILED";
}

export function createSmsDeliveryStatusWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.SMS_DELIVERY_STATUS,
    async (job: Job<SmsDeliveryStatusJobData>) => {
      const { tenantId, providerMessageId, status, timestamp, failureReason } = job.data;
      const correlationId = job.data.correlationId?.trim() || uuidv4();

      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-sms-delivery-status",
        queueName: QUEUES.SMS_DELIVERY_STATUS,
        tenantId,
        entityType: "provider_message",
        entityId: providerMessageId,
        correlationId,
      });
      jlog.info("sms_delivery", "start", { status, rawStatus: status });

      try {
        const { db, setSessionTenantId } = await import("@cerniq/db");
        const { smsMessages, communicationLog } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        await setSessionTenantId(tenantId);

        const mapped = mapSmsTableStatus(status);

        await db
          .update(smsMessages)
          .set({
            status: mapped,
            deliveredAt: mapped === "DELIVERED" ? new Date(timestamp) : undefined,
            failedReason:
              mapped === "FAILED" || mapped === "REJECTED"
                ? (failureReason ?? `SMS_${status}`)
                : undefined,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(smsMessages.tenantId, tenantId),
              eq(smsMessages.providerMessageId, providerMessageId),
            ),
          );

        const commStatus = mapped === "DELIVERED" ? "DELIVERED" : "FAILED";

        const commPatch =
          mapped === "DELIVERED"
            ? { deliveredAt: new Date(timestamp) }
            : { errorMessage: failureReason ?? `SMS delivery ${status}` };

        await db
          .update(communicationLog)
          .set({
            status: commStatus,
            statusUpdatedAt: new Date(),
            ...commPatch,
          })
          .where(
            and(
              eq(communicationLog.tenantId, tenantId),
              eq(communicationLog.externalMessageId, providerMessageId),
              eq(communicationLog.channel, "SMS"),
            ),
          );
        jlog.done("sms_delivery", "updated", { mapped, commStatus });
        svcLog.info(
          { tenantId, providerMessageId, mapped, commStatus, correlationId },
          "sms_delivery_receipt_applied",
        );
      } catch (err) {
        logSmsJobFailureAndThrow(
          svcLog.error.bind(svcLog),
          jlog,
          err,
          "sms_delivery_status_failed",
          "sms_delivery",
          { tenantId, providerMessageId },
        );
      }
    },
    { concurrency: 50 },
  );
  return worker;
}
