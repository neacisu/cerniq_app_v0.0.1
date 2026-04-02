/**
 * i39-alert-payment.ts — I39: alert:payment
 * i40-alert-delivery.ts — I40: alert:delivery
 * i41-alert-credit.ts — I41: alert:credit
 * i42-alert-contract.ts — I42: alert:contract
 * i43-alert-stock.ts — I43: alert:stock
 * i44-alert-dispatch.ts — I44: alert:dispatch
 *
 * AlertNeuron (Plan FAZA 8g §IX I39-I44, swimlane: social-action)
 *
 * Pattern comun: primește alertă din workerul trigger, loghează în audit,
 * incrementează metrică e4AlertsDispatchedTotal.
 *
 * ANTI-HALUCINARE:
 * - NU inventa canale de notificare reale (email/WA/SMS) — logăm alertele
 * - Toate alertele sunt tip "internal" în faza curentă
 * - NU inventa alerte noi — EXACT cele din Plan Alert Rules L2159-2167
 */
import type { Processor } from "bullmq";
import { db, goldAuditLogsEtapa4, setSessionTenantId } from "@cerniq/db";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { v4 as uuidv4 } from "uuid";
import { e4AlertsDispatchedTotal } from "../e4-metrics.js";

// ────────────────────────────────────────────────────────────────────────────
// Tip comun pentru toate job-urile alert
// ────────────────────────────────────────────────────────────────────────────

export interface AlertJobData {
  tenantId: string;
  alertType: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  // Specific per tip alert
  orderId?: string;
  orderNumber?: string;
  productId?: string;
  sku?: string;
  currentStock?: number;
  threshold?: number;
  clientId?: string;
  shipmentId?: string;
  awbNumber?: string;
  reason?: string;
}

export interface AlertResult {
  ok: true;
  alertType: string;
  severity: string;
  logged: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Factory pentru processor alert — reduce duplicarea de cod
// ────────────────────────────────────────────────────────────────────────────

function createAlertProcessor(
  spanName: string,
  defaultEntityType: string,
): Processor<AlertJobData> {
  return async (job): Promise<AlertResult> => {
    return withCognitiveSpan(
      spanName,
      async (_span) => {
        const {
          tenantId,
          alertType,
          severity = "WARNING",
          message,
          entityId,
          entityType,
          metadata,
        } = job.data;
        await setSessionTenantId(tenantId);

        const resolvedEntityType = entityType ?? defaultEntityType;
        const resolvedEntityId =
          entityId ??
          job.data.orderId ??
          job.data.productId ??
          job.data.clientId ??
          job.data.shipmentId ??
          tenantId;

        job.log(
          `[${spanName}] ALERT ${alertType} severity=${severity} entity=${resolvedEntityType}:${resolvedEntityId} — ${message}`,
        );

        // Materializăm metadata opțional fără spread de tip nullable —
        // { ...undefined } produce {} valid fără ternary sau negație.
        const extraFields: Record<string, unknown> = { ...metadata };

        // ── Audit log pentru alertă ─────────────────────────────────────────
        await db.insert(goldAuditLogsEtapa4).values({
          id: uuidv4(),
          tenantId,
          actorId: null,
          actorType: "WORKER",
          eventType: `ALERT_${alertType.toUpperCase().replaceAll(/[^A-Z0-9_]/g, "_")}`,
          entityType: resolvedEntityType,
          entityId: resolvedEntityId,
          newValues: {
            alertType,
            severity,
            message,
            ...extraFields,
            orderId: job.data.orderId,
            orderNumber: job.data.orderNumber,
            productId: job.data.productId,
            sku: job.data.sku,
            currentStock: job.data.currentStock,
            threshold: job.data.threshold,
            clientId: job.data.clientId,
            shipmentId: job.data.shipmentId,
            awbNumber: job.data.awbNumber,
            reason: job.data.reason,
          },
          prevHash: null,
          createdAt: new Date(),
        });

        e4AlertsDispatchedTotal.inc({ tenant_id: tenantId, alert_type: alertType });

        return { ok: true, alertType, severity, logged: true };
      },
      { tenantId: job.data.tenantId },
    );
  };
}

// ────────────────────────────────────────────────────────────────────────────
// I39 — alert:payment (Plan I39)
// Trigger: B11/B12 overdue events, payment reconciliation failures
// ────────────────────────────────────────────────────────────────────────────
export const alertPaymentProcessor = createAlertProcessor("e4:alert:payment", "gold_orders");

// ────────────────────────────────────────────────────────────────────────────
// I40 — alert:delivery (Plan I40)
// Trigger: E24 DELIVERY_FAILED events, H37-H38 return events
// ────────────────────────────────────────────────────────────────────────────
export const alertDeliveryProcessor = createAlertProcessor("e4:alert:delivery", "gold_shipments");

// ────────────────────────────────────────────────────────────────────────────
// I41 — alert:credit (Plan I41)
// Trigger: C17/C18 credit scoring events, credit limit HITL
// ────────────────────────────────────────────────────────────────────────────
export const alertCreditProcessor = createAlertProcessor("e4:alert:credit", "gold_credit_profiles");

// ────────────────────────────────────────────────────────────────────────────
// I42 — alert:contract (Plan I42)
// Trigger: G35 ContractExpirySoon events (Plan Alert L2166)
// ────────────────────────────────────────────────────────────────────────────
export const alertContractProcessor = createAlertProcessor("e4:alert:contract", "gold_contracts");

// ────────────────────────────────────────────────────────────────────────────
// I43 — alert:stock (Plan I43)
// Trigger: F31 low stock events
// ────────────────────────────────────────────────────────────────────────────
export const alertStockProcessor = createAlertProcessor("e4:alert:stock", "gold_products");

// ────────────────────────────────────────────────────────────────────────────
// I44 — alert:dispatch (Plan I44)
// Trigger: E22 AWB create failed events, logistics dispatch failures
// ────────────────────────────────────────────────────────────────────────────
export const alertDispatchProcessor = createAlertProcessor("e4:alert:dispatch", "gold_shipments");
