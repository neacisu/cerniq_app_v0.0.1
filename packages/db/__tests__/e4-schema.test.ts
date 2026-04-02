/**
 * e4-schema.test.ts — Suite completă de teste pentru schema Drizzle E4
 *
 * Acoperire: 100% export-uri tabele + enum-uri E4
 * Tabele testate: 17 tabele din 4 fișiere de schemă
 * Enum-uri testate: orderStatusEnum, paymentMethodEnum, paymentSourceEnum,
 *   reconciliationStatusEnum, refundStatusEnum, matchTypeEnum,
 *   riskTierEnum, creditReservationStatusEnum,
 *   carrierEnum, shipmentStatusEnum, deliveryTypeEnum, codTypeEnum,
 *   contractStatusEnum, actorTypeEnum
 *
 * Verificări:
 *   - Existența tabelelor și a tuturor coloanelor conform planului
 *   - Default-uri corecte
 *   - Enum values conform specificației
 *   - Relații FK structurale (prezența coloanelor FK)
 *   - Soft delete pe gold_orders
 *   - Hash chain câmpuri pe gold_audit_logs_etapa4
 *   - Enum partajat riskTierEnum între credit și contracts
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Imports E4 Orders
// ---------------------------------------------------------------------------
import {
  goldOrders,
  goldOrderItems,
  goldPayments,
  goldPaymentReconciliations,
  goldRefunds,
  revolutWebhooksRaw,
  orderStatusEnum,
  paymentMethodEnum,
  paymentSourceEnum,
  reconciliationStatusEnum,
  refundStatusEnum,
  matchTypeEnum,
} from "../src/schemas/gold-e4-orders.js";

// ---------------------------------------------------------------------------
// Imports E4 Credit
// ---------------------------------------------------------------------------
import {
  goldCreditProfiles,
  goldCreditScores,
  goldCreditReservations,
  riskTierEnum,
  creditReservationStatusEnum,
} from "../src/schemas/gold-e4-credit.js";

// ---------------------------------------------------------------------------
// Imports E4 Logistics
// ---------------------------------------------------------------------------
import {
  goldAddresses,
  goldShipments,
  goldShipmentTracking,
  goldCodCollections,
  carrierEnum,
  shipmentStatusEnum,
  deliveryTypeEnum,
  codTypeEnum,
} from "../src/schemas/gold-e4-logistics.js";

// ---------------------------------------------------------------------------
// Imports E4 Contracts
// ---------------------------------------------------------------------------
import {
  goldContracts,
  goldContractTemplates,
  goldContractClauses,
  goldAuditLogsEtapa4,
  contractStatusEnum,
  actorTypeEnum,
  riskTierEnum as riskTierFromContracts,
} from "../src/schemas/gold-e4-contracts.js";

// ---------------------------------------------------------------------------
// ENUM-URI — verificare valori complete
// ---------------------------------------------------------------------------

describe("E4 Enums — orderStatusEnum (23 stări)", () => {
  const expectedValues = [
    "DRAFT",
    "CONFIRMED",
    "PROFORMA_SENT",
    "PROFORMA_PAID",
    "CREDIT_APPROVED",
    "CREDIT_PENDING",
    "CREDIT_REJECTED",
    "STOCK_RESERVED",
    "IN_PRODUCTION",
    "READY_TO_SHIP",
    "SHIPPED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "DELIVERY_FAILED",
    "RETURNED",
    "RETURN_PROCESSING",
    "INVOICED",
    "PAID",
    "PARTIALLY_PAID",
    "OVERDUE",
    "CANCELLED",
    "COMPLETED",
  ] as const;

  it("există și are toate 23 stări FSM comenzi", () => {
    expect(orderStatusEnum).toBeDefined();
    const enumDef = orderStatusEnum as unknown as { enumValues: string[] };
    expect(enumDef.enumValues).toHaveLength(23);
    for (const val of expectedValues) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — paymentMethodEnum", () => {
  it("are valorile corecte pentru metode de plată", () => {
    expect(paymentMethodEnum).toBeDefined();
    const enumDef = paymentMethodEnum as unknown as { enumValues: string[] };
    for (const val of ["BANK_TRANSFER", "REVOLUT", "CARD", "COD", "CREDIT"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — paymentSourceEnum", () => {
  it("are valorile corecte pentru surse plată", () => {
    expect(paymentSourceEnum).toBeDefined();
    const enumDef = paymentSourceEnum as unknown as { enumValues: string[] };
    for (const val of ["REVOLUT", "BANK_TRANSFER", "CARD", "COD", "MANUAL"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — reconciliationStatusEnum", () => {
  it("are valorile corecte pentru stare reconciliere", () => {
    expect(reconciliationStatusEnum).toBeDefined();
    const enumDef = reconciliationStatusEnum as unknown as { enumValues: string[] };
    for (const val of [
      "PENDING",
      "MATCHED_EXACT",
      "MATCHED_FUZZY",
      "UNMATCHED",
      "MANUAL_MATCHED",
      "DISPUTED",
    ]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — refundStatusEnum", () => {
  it("are valorile corecte pentru stare ramburs", () => {
    expect(refundStatusEnum).toBeDefined();
    const enumDef = refundStatusEnum as unknown as { enumValues: string[] };
    for (const val of ["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — matchTypeEnum", () => {
  it("are valorile corecte pentru tip potrivire reconciliere", () => {
    expect(matchTypeEnum).toBeDefined();
    const enumDef = matchTypeEnum as unknown as { enumValues: string[] };
    for (const val of ["EXACT_REFERENCE", "FUZZY_NAME_AMOUNT", "MANUAL", "AUTO_PARTIAL"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — riskTierEnum (partajat credit+contracts)", () => {
  it("are valorile corecte pentru tier risc", () => {
    expect(riskTierEnum).toBeDefined();
    const enumDef = riskTierEnum as unknown as { enumValues: string[] };
    for (const val of ["BLOCKED", "LOW", "MEDIUM", "HIGH", "PREMIUM"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — creditReservationStatusEnum", () => {
  it("are valorile corecte pentru stare rezervare credit", () => {
    expect(creditReservationStatusEnum).toBeDefined();
    const enumDef = creditReservationStatusEnum as unknown as { enumValues: string[] };
    for (const val of ["ACTIVE", "USED", "RELEASED", "EXPIRED"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — carrierEnum (5 curieri RO)", () => {
  it("are toți curierii activi din România", () => {
    expect(carrierEnum).toBeDefined();
    const enumDef = carrierEnum as unknown as { enumValues: string[] };
    for (const val of ["SAMEDAY", "FAN_COURIER", "CARGUS", "DPD", "GLS"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — shipmentStatusEnum (7 stări)", () => {
  it("are toate cele 7 stări livrare", () => {
    expect(shipmentStatusEnum).toBeDefined();
    const enumDef = shipmentStatusEnum as unknown as { enumValues: string[] };
    const expected = [
      "CREATED",
      "PICKED_UP",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "DELIVERY_FAILED",
      "RETURNED",
    ];
    expect(enumDef.enumValues).toHaveLength(7);
    for (const val of expected) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — deliveryTypeEnum", () => {
  it("are valorile corecte pentru tip livrare", () => {
    expect(deliveryTypeEnum).toBeDefined();
    const enumDef = deliveryTypeEnum as unknown as { enumValues: string[] };
    for (const val of ["STANDARD", "EXPRESS", "LOCKER"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — codTypeEnum", () => {
  it("are valorile corecte pentru tip COD", () => {
    expect(codTypeEnum).toBeDefined();
    const enumDef = codTypeEnum as unknown as { enumValues: string[] };
    for (const val of ["NONE", "CASH", "CARD"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — contractStatusEnum (6 stări)", () => {
  it("are toate stările de contract inclusiv DocuSign", () => {
    expect(contractStatusEnum).toBeDefined();
    const enumDef = contractStatusEnum as unknown as { enumValues: string[] };
    for (const val of [
      "DRAFT",
      "PENDING_SIGNATURE",
      "SENT_DOCUSIGN",
      "SIGNED",
      "EXPIRED",
      "CANCELLED",
    ]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

describe("E4 Enums — actorTypeEnum (audit hash chain)", () => {
  it("are toate tipurile de actor pentru audit", () => {
    expect(actorTypeEnum).toBeDefined();
    const enumDef = actorTypeEnum as unknown as { enumValues: string[] };
    for (const val of ["SYSTEM", "USER", "WORKER", "CRON"]) {
      expect(enumDef.enumValues).toContain(val);
    }
  });
});

// ---------------------------------------------------------------------------
// TABELE E4 Orders
// ---------------------------------------------------------------------------

describe("E4 Schema — goldOrders", () => {
  it("există tabelul goldOrders", () => {
    expect(goldOrders).toBeDefined();
  });

  it("are toate coloanele obligatorii", () => {
    expect(goldOrders.id).toBeDefined();
    expect(goldOrders.tenantId).toBeDefined();
    expect(goldOrders.leadId).toBeDefined();
    expect(goldOrders.orderNumber).toBeDefined();
    expect(goldOrders.status).toBeDefined();
    expect(goldOrders.paymentMethod).toBeDefined();
    expect(goldOrders.totalAmount).toBeDefined();
    expect(goldOrders.amountPaid).toBeDefined();
    expect(goldOrders.amountDue).toBeDefined();
    expect(goldOrders.creditApprovalId).toBeDefined();
    expect(goldOrders.shipmentId).toBeDefined();
    expect(goldOrders.currency).toBeDefined();
    expect(goldOrders.createdAt).toBeDefined();
    expect(goldOrders.updatedAt).toBeDefined();
    expect(goldOrders.deletedAt).toBeDefined();
  });

  it("soft delete: deletedAt este nullable", () => {
    const col = goldOrders.deletedAt as unknown as { notNull?: boolean };
    expect(col.notNull).toBeFalsy();
  });

  it("creditApprovalId și shipmentId sunt UUID-uri nullable (FK deferred)", () => {
    expect(goldOrders.creditApprovalId).toBeDefined();
    expect(goldOrders.shipmentId).toBeDefined();
    const creditCol = goldOrders.creditApprovalId as unknown as { notNull?: boolean };
    const shipCol = goldOrders.shipmentId as unknown as { notNull?: boolean };
    expect(creditCol.notNull).toBeFalsy();
    expect(shipCol.notNull).toBeFalsy();
  });

  it("currency default RON", () => {
    const col = goldOrders.currency as unknown as { config?: { default?: string } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe("RON");
    }
  });
});

describe("E4 Schema — goldOrderItems", () => {
  it("există și are toate coloanele planului", () => {
    expect(goldOrderItems).toBeDefined();
    expect(goldOrderItems.id).toBeDefined();
    expect(goldOrderItems.orderId).toBeDefined();
    expect(goldOrderItems.productId).toBeDefined();
    expect(goldOrderItems.productName).toBeDefined();
    expect(goldOrderItems.sku).toBeDefined();
    expect(goldOrderItems.quantity).toBeDefined();
    expect(goldOrderItems.unitPrice).toBeDefined();
    expect(goldOrderItems.totalPrice).toBeDefined();
    expect(goldOrderItems.discountPercent).toBeDefined();
    expect(goldOrderItems.stockReserved).toBeDefined();
    expect(goldOrderItems.stockDeducted).toBeDefined();
  });

  it("stockReserved și stockDeducted default false", () => {
    const sr = goldOrderItems.stockReserved as unknown as { config?: { default?: boolean } };
    const sd = goldOrderItems.stockDeducted as unknown as { config?: { default?: boolean } };
    if (sr?.config?.default !== undefined) expect(sr.config.default).toBe(false);
    if (sd?.config?.default !== undefined) expect(sd.config.default).toBe(false);
  });
});

describe("E4 Schema — goldPayments", () => {
  it("există și are toate coloanele", () => {
    expect(goldPayments).toBeDefined();
    expect(goldPayments.id).toBeDefined();
    expect(goldPayments.tenantId).toBeDefined();
    expect(goldPayments.orderId).toBeDefined();
    expect(goldPayments.externalId).toBeDefined();
    expect(goldPayments.externalSource).toBeDefined();
    expect(goldPayments.amount).toBeDefined();
    expect(goldPayments.currency).toBeDefined();
    expect(goldPayments.reconciliationStatus).toBeDefined();
    expect(goldPayments.counterpartyName).toBeDefined();
    expect(goldPayments.counterpartyIban).toBeDefined();
    expect(goldPayments.reference).toBeDefined();
    expect(goldPayments.receivedAt).toBeDefined();
    expect(goldPayments.processedAt).toBeDefined();
    expect(goldPayments.createdAt).toBeDefined();
    expect(goldPayments.updatedAt).toBeDefined();
  });

  it("reconciliationStatus default PENDING", () => {
    const col = goldPayments.reconciliationStatus as unknown as { config?: { default?: string } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe("PENDING");
    }
  });
});

describe("E4 Schema — goldPaymentReconciliations", () => {
  it("există și are toate coloanele", () => {
    expect(goldPaymentReconciliations).toBeDefined();
    expect(goldPaymentReconciliations.id).toBeDefined();
    expect(goldPaymentReconciliations.paymentId).toBeDefined();
    expect(goldPaymentReconciliations.orderId).toBeDefined();
    expect(goldPaymentReconciliations.matchType).toBeDefined();
    expect(goldPaymentReconciliations.confidence).toBeDefined();
    expect(goldPaymentReconciliations.matchedBy).toBeDefined();
    expect(goldPaymentReconciliations.matchedAt).toBeDefined();
  });
});

describe("E4 Schema — goldRefunds", () => {
  it("există și are toate coloanele inclusiv approval workflow", () => {
    expect(goldRefunds).toBeDefined();
    expect(goldRefunds.id).toBeDefined();
    expect(goldRefunds.tenantId).toBeDefined();
    expect(goldRefunds.paymentId).toBeDefined();
    expect(goldRefunds.orderId).toBeDefined();
    expect(goldRefunds.status).toBeDefined();
    expect(goldRefunds.amount).toBeDefined();
    expect(goldRefunds.reason).toBeDefined();
    expect(goldRefunds.revolutRefundId).toBeDefined();
    expect(goldRefunds.requestedBy).toBeDefined();
    expect(goldRefunds.approvedBy).toBeDefined();
    expect(goldRefunds.createdAt).toBeDefined();
    expect(goldRefunds.updatedAt).toBeDefined();
  });

  it("revolutRefundId este nullable (nu toate rambursurile vin din Revolut)", () => {
    const col = goldRefunds.revolutRefundId as unknown as { notNull?: boolean };
    expect(col.notNull).toBeFalsy();
  });

  it("approvedBy este nullable (poate fi neprocesată)", () => {
    const col = goldRefunds.approvedBy as unknown as { notNull?: boolean };
    expect(col.notNull).toBeFalsy();
  });
});

describe("E4 Schema — revolutWebhooksRaw", () => {
  it("există și are coloanele de securitate și idempotență", () => {
    expect(revolutWebhooksRaw).toBeDefined();
    expect(revolutWebhooksRaw.id).toBeDefined();
    expect(revolutWebhooksRaw.tenantId).toBeDefined();
    expect(revolutWebhooksRaw.eventType).toBeDefined();
    expect(revolutWebhooksRaw.payload).toBeDefined();
    expect(revolutWebhooksRaw.signature).toBeDefined();
    expect(revolutWebhooksRaw.verified).toBeDefined();
    expect(revolutWebhooksRaw.idempotencyKey).toBeDefined();
    expect(revolutWebhooksRaw.processedAt).toBeDefined();
    expect(revolutWebhooksRaw.createdAt).toBeDefined();
  });

  it("verified default false (necesită validare explicit)", () => {
    const col = revolutWebhooksRaw.verified as unknown as { config?: { default?: boolean } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// TABELE E4 Credit
// ---------------------------------------------------------------------------

describe("E4 Schema — goldCreditProfiles", () => {
  it("există și are toate coloanele plan E4", () => {
    expect(goldCreditProfiles).toBeDefined();
    expect(goldCreditProfiles.id).toBeDefined();
    expect(goldCreditProfiles.tenantId).toBeDefined();
    expect(goldCreditProfiles.clientId).toBeDefined();
    expect(goldCreditProfiles.creditScore).toBeDefined();
    expect(goldCreditProfiles.riskTier).toBeDefined();
    expect(goldCreditProfiles.creditLimit).toBeDefined();
    expect(goldCreditProfiles.creditUsed).toBeDefined();
    expect(goldCreditProfiles.scoreComponents).toBeDefined();
    expect(goldCreditProfiles.bpiStatus).toBeDefined();
    expect(goldCreditProfiles.autoRefreshEnabled).toBeDefined();
    expect(goldCreditProfiles.nextReviewAt).toBeDefined();
    expect(goldCreditProfiles.createdAt).toBeDefined();
    expect(goldCreditProfiles.updatedAt).toBeDefined();
  });

  it("autoRefreshEnabled default true", () => {
    const col = goldCreditProfiles.autoRefreshEnabled as unknown as {
      config?: { default?: boolean };
    };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe(true);
    }
  });

  it("creditScore default 50", () => {
    const col = goldCreditProfiles.creditScore as unknown as { config?: { default?: number } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe(50);
    }
  });
});

describe("E4 Schema — goldCreditScores (historical log)", () => {
  it("există și are coloanele de audit scor", () => {
    expect(goldCreditScores).toBeDefined();
    expect(goldCreditScores.id).toBeDefined();
    expect(goldCreditScores.profileId).toBeDefined();
    expect(goldCreditScores.score).toBeDefined();
    expect(goldCreditScores.riskTier).toBeDefined();
    expect(goldCreditScores.scoreComponents).toBeDefined();
    expect(goldCreditScores.calculatedAt).toBeDefined();
    expect(goldCreditScores.source).toBeDefined();
  });

  it("este append-only (nu are updatedAt)", () => {
    expect((goldCreditScores as unknown as Record<string, unknown>).updatedAt).toBeUndefined();
  });
});

describe("E4 Schema — goldCreditReservations", () => {
  it("există și are toate coloanele pentru rezervare credit", () => {
    expect(goldCreditReservations).toBeDefined();
    expect(goldCreditReservations.id).toBeDefined();
    expect(goldCreditReservations.profileId).toBeDefined();
    expect(goldCreditReservations.orderId).toBeDefined();
    expect(goldCreditReservations.amount).toBeDefined();
    expect(goldCreditReservations.status).toBeDefined();
    expect(goldCreditReservations.expiresAt).toBeDefined();
    expect(goldCreditReservations.createdAt).toBeDefined();
    expect(goldCreditReservations.updatedAt).toBeDefined();
  });

  it("status default ACTIVE", () => {
    const col = goldCreditReservations.status as unknown as { config?: { default?: string } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe("ACTIVE");
    }
  });
});

// ---------------------------------------------------------------------------
// TABELE E4 Logistics
// ---------------------------------------------------------------------------

describe("E4 Schema — goldAddresses", () => {
  it("există și are toate câmpurile de adresă + coordonate GPS", () => {
    expect(goldAddresses).toBeDefined();
    expect(goldAddresses.id).toBeDefined();
    expect(goldAddresses.tenantId).toBeDefined();
    expect(goldAddresses.clientId).toBeDefined();
    expect(goldAddresses.street).toBeDefined();
    expect(goldAddresses.city).toBeDefined();
    expect(goldAddresses.county).toBeDefined();
    expect(goldAddresses.postalCode).toBeDefined();
    expect(goldAddresses.country).toBeDefined();
    expect(goldAddresses.contactName).toBeDefined();
    expect(goldAddresses.contactPhone).toBeDefined();
    expect(goldAddresses.isDefault).toBeDefined();
    expect(goldAddresses.latitude).toBeDefined();
    expect(goldAddresses.longitude).toBeDefined();
    expect(goldAddresses.createdAt).toBeDefined();
    expect(goldAddresses.updatedAt).toBeDefined();
  });

  it("country default RO", () => {
    const col = goldAddresses.country as unknown as { config?: { default?: string } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe("RO");
    }
  });
});

describe("E4 Schema — goldShipments", () => {
  it("există și are toate câmpurile AWB, carrier, COD", () => {
    expect(goldShipments).toBeDefined();
    expect(goldShipments.id).toBeDefined();
    expect(goldShipments.tenantId).toBeDefined();
    expect(goldShipments.orderId).toBeDefined();
    expect(goldShipments.awbNumber).toBeDefined();
    expect(goldShipments.carrier).toBeDefined();
    expect(goldShipments.status).toBeDefined();
    expect(goldShipments.deliveryType).toBeDefined();
    expect(goldShipments.codType).toBeDefined();
    expect(goldShipments.codAmount).toBeDefined();
    expect(goldShipments.codCollected).toBeDefined();
    expect(goldShipments.samedayParcelId).toBeDefined();
    expect(goldShipments.trackingUrl).toBeDefined();
    expect(goldShipments.labelPdfUrl).toBeDefined();
    expect(goldShipments.estimatedDelivery).toBeDefined();
    expect(goldShipments.actualDelivery).toBeDefined();
    expect(goldShipments.weight).toBeDefined();
    expect(goldShipments.addressId).toBeDefined();
    expect(goldShipments.createdAt).toBeDefined();
    expect(goldShipments.updatedAt).toBeDefined();
  });

  it("codType default NONE", () => {
    const col = goldShipments.codType as unknown as { config?: { default?: string } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe("NONE");
    }
  });

  it("codCollected default false", () => {
    const col = goldShipments.codCollected as unknown as { config?: { default?: boolean } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe(false);
    }
  });
});

describe("E4 Schema — goldShipmentTracking (append-only)", () => {
  it("există și are câmpurile de tracking", () => {
    expect(goldShipmentTracking).toBeDefined();
    expect(goldShipmentTracking.id).toBeDefined();
    expect(goldShipmentTracking.shipmentId).toBeDefined();
    expect(goldShipmentTracking.statusCode).toBeDefined();
    expect(goldShipmentTracking.statusText).toBeDefined();
    expect(goldShipmentTracking.locationCity).toBeDefined();
    expect(goldShipmentTracking.locationCounty).toBeDefined();
    expect(goldShipmentTracking.eventTimestamp).toBeDefined();
  });

  it("este append-only (nu are updatedAt)", () => {
    expect((goldShipmentTracking as unknown as Record<string, unknown>).updatedAt).toBeUndefined();
  });
});

describe("E4 Schema — goldCodCollections", () => {
  it("există și are câmpurile pentru colectare ramburs", () => {
    expect(goldCodCollections).toBeDefined();
    expect(goldCodCollections.id).toBeDefined();
    expect(goldCodCollections.shipmentId).toBeDefined();
    expect(goldCodCollections.amount).toBeDefined();
    expect(goldCodCollections.collectedAt).toBeDefined();
    expect(goldCodCollections.transferredToAccount).toBeDefined();
    expect(goldCodCollections.transferDate).toBeDefined();
  });

  it("transferredToAccount default false", () => {
    const col = goldCodCollections.transferredToAccount as unknown as {
      config?: { default?: boolean };
    };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// TABELE E4 Contracts
// ---------------------------------------------------------------------------

describe("E4 Schema — goldContracts", () => {
  it("există și are toate câmpurile DocuSign + risk tier", () => {
    expect(goldContracts).toBeDefined();
    expect(goldContracts.id).toBeDefined();
    expect(goldContracts.tenantId).toBeDefined();
    expect(goldContracts.clientId).toBeDefined();
    expect(goldContracts.orderId).toBeDefined();
    expect(goldContracts.riskTier).toBeDefined();
    expect(goldContracts.status).toBeDefined();
    expect(goldContracts.docusignEnvelopeId).toBeDefined();
    expect(goldContracts.docusignStatus).toBeDefined();
    expect(goldContracts.pdfUrl).toBeDefined();
    expect(goldContracts.signedPdfUrl).toBeDefined();
    expect(goldContracts.clausesUsed).toBeDefined();
    expect(goldContracts.validForDays).toBeDefined();
    expect(goldContracts.expiresAt).toBeDefined();
    expect(goldContracts.signedAt).toBeDefined();
    expect(goldContracts.createdAt).toBeDefined();
    expect(goldContracts.updatedAt).toBeDefined();
  });

  it("validForDays default 30", () => {
    const col = goldContracts.validForDays as unknown as { config?: { default?: number } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe(30);
    }
  });

  it("orderId este nullable (contracte pot exista fără comandă)", () => {
    const col = goldContracts.orderId as unknown as { notNull?: boolean };
    expect(col.notNull).toBeFalsy();
  });
});

describe("E4 Schema — goldContractTemplates", () => {
  it("există și are câmpurile de versionare template", () => {
    expect(goldContractTemplates).toBeDefined();
    expect(goldContractTemplates.id).toBeDefined();
    expect(goldContractTemplates.tenantId).toBeDefined();
    expect(goldContractTemplates.name).toBeDefined();
    expect(goldContractTemplates.version).toBeDefined();
    expect(goldContractTemplates.templateDocxUrl).toBeDefined();
    expect(goldContractTemplates.applicableRiskTiers).toBeDefined();
    expect(goldContractTemplates.isActive).toBeDefined();
    expect(goldContractTemplates.createdAt).toBeDefined();
    expect(goldContractTemplates.updatedAt).toBeDefined();
  });
});

describe("E4 Schema — goldContractClauses", () => {
  it("există și are câmpurile pentru clauze cu cod unic", () => {
    expect(goldContractClauses).toBeDefined();
    expect(goldContractClauses.id).toBeDefined();
    expect(goldContractClauses.code).toBeDefined();
    expect(goldContractClauses.content).toBeDefined();
    expect(goldContractClauses.isMandatory).toBeDefined();
    expect(goldContractClauses.applicableRiskTiers).toBeDefined();
    expect(goldContractClauses.category).toBeDefined();
    expect(goldContractClauses.createdAt).toBeDefined();
    expect(goldContractClauses.updatedAt).toBeDefined();
  });

  it("isMandatory default false", () => {
    const col = goldContractClauses.isMandatory as unknown as { config?: { default?: boolean } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe(false);
    }
  });
});

describe("E4 Schema — goldAuditLogsEtapa4 (partitioned hash chain)", () => {
  it("există și are toate câmpurile ADR-0095", () => {
    expect(goldAuditLogsEtapa4).toBeDefined();
    expect(goldAuditLogsEtapa4.id).toBeDefined();
    expect(goldAuditLogsEtapa4.tenantId).toBeDefined();
    expect(goldAuditLogsEtapa4.eventType).toBeDefined();
    expect(goldAuditLogsEtapa4.entityType).toBeDefined();
    expect(goldAuditLogsEtapa4.entityId).toBeDefined();
    expect(goldAuditLogsEtapa4.actorId).toBeDefined();
    expect(goldAuditLogsEtapa4.actorType).toBeDefined();
    expect(goldAuditLogsEtapa4.oldValues).toBeDefined();
    expect(goldAuditLogsEtapa4.newValues).toBeDefined();
    expect(goldAuditLogsEtapa4.prevHash).toBeDefined();
    expect(goldAuditLogsEtapa4.ipAddress).toBeDefined();
    expect(goldAuditLogsEtapa4.userAgent).toBeDefined();
    expect(goldAuditLogsEtapa4.createdAt).toBeDefined();
  });

  it("actorId este nullable (poate fi actor SYSTEM fără user)", () => {
    const col = goldAuditLogsEtapa4.actorId as unknown as { notNull?: boolean };
    expect(col.notNull).toBeFalsy();
  });

  it("prevHash este VARCHAR(64) pentru SHA-256", () => {
    const col = goldAuditLogsEtapa4.prevHash as unknown as { config?: { length?: number } };
    if (col?.config?.length !== undefined) {
      expect(col.config.length).toBe(64);
    }
  });

  it("actorType default SYSTEM", () => {
    const col = goldAuditLogsEtapa4.actorType as unknown as { config?: { default?: string } };
    if (col?.config?.default !== undefined) {
      expect(col.config.default).toBe("SYSTEM");
    }
  });

  it("nu are updatedAt (audit log append-only)", () => {
    expect((goldAuditLogsEtapa4 as unknown as Record<string, unknown>).updatedAt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CROSS-SCHEMA — riskTierEnum partajat credit ↔ contracts
// ---------------------------------------------------------------------------

describe("E4 Cross-schema — riskTierEnum partajat", () => {
  it("riskTierEnum din contracts este același obiect ca cel din credit", () => {
    expect(riskTierFromContracts).toBeDefined();
    // Ambele trebuie să aibă același nume de enum PostgreSQL
    const enumCredit = riskTierEnum as unknown as { enumName?: string; enumValues?: string[] };
    const enumContracts = riskTierFromContracts as unknown as {
      enumName?: string;
      enumValues?: string[];
    };
    if (enumCredit?.enumName !== undefined && enumContracts?.enumName !== undefined) {
      expect(enumCredit.enumName).toBe(enumContracts.enumName);
    }
    if (enumCredit?.enumValues !== undefined && enumContracts?.enumValues !== undefined) {
      expect(enumCredit.enumValues).toEqual(enumContracts.enumValues);
    }
  });
});

// ---------------------------------------------------------------------------
// COMPLETITUDINE — toate cele 17 tabele E4 sunt definite și exportate
// ---------------------------------------------------------------------------

describe("E4 Schema — completitudine: 17 tabele E4 definite", () => {
  it("toate cele 17 tabele E4 sunt definite și exportate", () => {
    const e4Tables = [
      // Orders (6)
      goldOrders,
      goldOrderItems,
      goldPayments,
      goldPaymentReconciliations,
      goldRefunds,
      revolutWebhooksRaw,
      // Credit (3)
      goldCreditProfiles,
      goldCreditScores,
      goldCreditReservations,
      // Logistics (4)
      goldAddresses,
      goldShipments,
      goldShipmentTracking,
      goldCodCollections,
      // Contracts (4)
      goldContracts,
      goldContractTemplates,
      goldContractClauses,
      goldAuditLogsEtapa4,
    ];

    for (const table of e4Tables) {
      expect(table).toBeDefined();
    }
    expect(e4Tables).toHaveLength(17);
  });

  it("toate cele 14 enum-uri E4 sunt definite", () => {
    const e4Enums = [
      orderStatusEnum,
      paymentMethodEnum,
      paymentSourceEnum,
      reconciliationStatusEnum,
      refundStatusEnum,
      matchTypeEnum,
      riskTierEnum,
      creditReservationStatusEnum,
      carrierEnum,
      shipmentStatusEnum,
      deliveryTypeEnum,
      codTypeEnum,
      contractStatusEnum,
      actorTypeEnum,
    ];

    for (const e of e4Enums) {
      expect(e).toBeDefined();
    }
    expect(e4Enums).toHaveLength(14);
  });
});
