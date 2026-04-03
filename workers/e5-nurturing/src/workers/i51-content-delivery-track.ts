/**
 * i51-content-delivery-track.ts — Worker I51: Content Delivery Track (FAZA 9h)
 *
 * Queue: content:delivery:track | Concurrency: 20
 *
 * Responsabilitate:
 *   - Primește eveniment de livrare de la canalul de outreach (EMAIL/WHATSAPP)
 *   - Mapează deliveryStatus extern la statusul intern goldNurturingActions:
 *       DELIVERED | OPENED | CLICKED → DELIVERED
 *       FAILED | BOUNCED             → FAILED
 *   - UPDATE goldNurturingActions SET status=mappedStatus
 */

import type { Job, Worker } from "bullmq";
import { db, goldNurturingActions, eq, and, setSessionTenantId } from "@cerniq/db";
import { createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Queue names (hardcodate)
// ---------------------------------------------------------------------------

const QUEUE_CONTENT_DELIVERY_TRACK = "content:delivery:track";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface DeliveryTrackJobData {
  tenantId: string;
  actionId: string;
  deliveryStatus: "DELIVERED" | "FAILED" | "OPENED" | "CLICKED" | "BOUNCED";
  deliveredAt?: string;
  failureReason?: string;
}

export interface DeliveryTrackResult {
  ok: boolean;
  actionId: string;
  mappedStatus: "DELIVERED" | "FAILED";
}

// ---------------------------------------------------------------------------
// Map status extern → status intern goldNurturingActions
// ---------------------------------------------------------------------------

function mapDeliveryStatus(
  deliveryStatus: DeliveryTrackJobData["deliveryStatus"],
): "DELIVERED" | "FAILED" {
  switch (deliveryStatus) {
    case "DELIVERED":
    case "OPENED":
    case "CLICKED":
      return "DELIVERED";
    case "FAILED":
    case "BOUNCED":
      return "FAILED";
    default: {
      const _exhaustive: never = deliveryStatus;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createContentDeliveryTrackWorker(): Worker {
  const { worker } = createWorker<DeliveryTrackJobData>(
    QUEUE_CONTENT_DELIVERY_TRACK,
    async (job: Job<DeliveryTrackJobData>): Promise<DeliveryTrackResult> => {
      return withCognitiveSpan("e5:content:delivery-track", async () => {
        const { tenantId, actionId, deliveryStatus, failureReason } = job.data;

        await setSessionTenantId(tenantId);

        job.log(`[I51] Delivery track: actionId=${actionId} deliveryStatus=${deliveryStatus}`);

        // ── 1. SELECT acțiunea și verifică existența ──────────────────────
        const actionRows = await db
          .select({ id: goldNurturingActions.id })
          .from(goldNurturingActions)
          .where(
            and(eq(goldNurturingActions.id, actionId), eq(goldNurturingActions.tenantId, tenantId)),
          )
          .limit(1);

        if (actionRows.length === 0) {
          throw new Error(`[I51] Action not found: actionId=${actionId}`, {
            cause: "NOT_FOUND",
          });
        }

        // ── 2. Map deliveryStatus → status intern ─────────────────────────
        const mappedStatus = mapDeliveryStatus(deliveryStatus);

        // ── 3. UPDATE goldNurturingActions ────────────────────────────────
        await db
          .update(goldNurturingActions)
          .set({
            status: mappedStatus,
            updatedAt: new Date(),
          })
          .where(
            and(eq(goldNurturingActions.id, actionId), eq(goldNurturingActions.tenantId, tenantId)),
          );

        if (failureReason) {
          job.log(`[I51] Delivery failure reason: ${failureReason}`);
        }

        job.log(`[I51] Delivery tracked actionId=${actionId} status=${deliveryStatus}`);

        return { ok: true, actionId, mappedStatus };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 20,
    },
  );

  return worker;
}
