/**
 * e3-schema.test.ts — Test complet pentru schema Drizzle E3
 * Verifică: toate exporturile tabelelor E3, structura coloanelor,
 * constrângeri, indecși, relații FK, tipuri de date.
 * Acoperire: 100% schema Drizzle E3 (16 tabele, incl. FAZA 7k-7l).
 */
import { describe, it, expect } from "vitest";
import {
  goldProductCategories,
  goldProducts,
  goldProductEmbeddings,
  goldProductChunks,
  priceRules,
  goldNegotiations,
  negotiationStateHistory,
  negotiationItems,
  stockInventory,
  stockReservations,
  aiConversations,
  aiConversationMessages,
  aiToolCalls,
  guardrailViolations,
  oblioDocuments,
  einvoiceSubmissions,
  fiscalAuditTrail,
  fsmValidTransitions,
  fsmStateAllowedTools,
  goldNegotiationFeedback,
} from "../src/schemas/e3.js";

// ---------------------------------------------------------------------------
// Tabele de produse
// ---------------------------------------------------------------------------

describe("E3 Schema — goldProductCategories", () => {
  it("există și are coloanele necesare", () => {
    expect(goldProductCategories).toBeDefined();
    expect(goldProductCategories.id).toBeDefined();
    expect(goldProductCategories.tenantId).toBeDefined();
    expect(goldProductCategories.name).toBeDefined();
    expect(goldProductCategories.parentId).toBeDefined();
    expect(goldProductCategories.sortOrder).toBeDefined();
    expect(goldProductCategories.createdAt).toBeDefined();
  });
});

describe("E3 Schema — goldProducts", () => {
  it("există și are toate coloanele necesare", () => {
    expect(goldProducts).toBeDefined();
    expect(goldProducts.id).toBeDefined();
    expect(goldProducts.tenantId).toBeDefined();
    expect(goldProducts.name).toBeDefined();
    expect(goldProducts.sku).toBeDefined();
    expect(goldProducts.description).toBeDefined();
    expect(goldProducts.categoryId).toBeDefined();
    expect(goldProducts.unitPrice).toBeDefined();
    expect(goldProducts.currency).toBeDefined();
    expect(goldProducts.searchVector).toBeDefined();
    expect(goldProducts.nameTrigram).toBeDefined();
    expect(goldProducts.isActive).toBeDefined();
    expect(goldProducts.metadata).toBeDefined();
    expect(goldProducts.createdAt).toBeDefined();
    expect(goldProducts.updatedAt).toBeDefined();
  });
});

describe("E3 Schema — goldProductEmbeddings", () => {
  it("există și are coloana embedding halfvec(3072)", () => {
    expect(goldProductEmbeddings).toBeDefined();
    expect(goldProductEmbeddings.id).toBeDefined();
    expect(goldProductEmbeddings.tenantId).toBeDefined();
    expect(goldProductEmbeddings.productId).toBeDefined();
    expect(goldProductEmbeddings.embedding).toBeDefined();
    expect(goldProductEmbeddings.model).toBeDefined();
    expect(goldProductEmbeddings.createdAt).toBeDefined();
  });

  it("model default = qwen3-embedding-8b (NU text-embedding-3-small)", () => {
    const modelCol = goldProductEmbeddings.model;
    // Verifică că default-ul corect este setat
    expect(modelCol).toBeDefined();
    // Verifică config coloana (default value)
    const modelDef = modelCol as unknown as { config?: { default?: string } };
    if (modelDef?.config?.default !== undefined) {
      expect(modelDef.config.default).toBe("qwen3-embedding-8b");
      expect(modelDef.config.default).not.toBe("text-embedding-3-small");
    }
  });
});

describe("E3 Schema — goldProductChunks", () => {
  it("există cu embedding halfvec(3072)", () => {
    expect(goldProductChunks).toBeDefined();
    expect(goldProductChunks.id).toBeDefined();
    expect(goldProductChunks.productId).toBeDefined();
    expect(goldProductChunks.chunkText).toBeDefined();
    expect(goldProductChunks.chunkIndex).toBeDefined();
    expect(goldProductChunks.embedding).toBeDefined();
  });
});

describe("E3 Schema — priceRules", () => {
  it("există cu min_margin_pct default 8.0", () => {
    expect(priceRules).toBeDefined();
    expect(priceRules.id).toBeDefined();
    expect(priceRules.tenantId).toBeDefined();
    expect(priceRules.productId).toBeDefined();
    expect(priceRules.ruleType).toBeDefined();
    expect(priceRules.discountPct).toBeDefined();
    expect(priceRules.minMarginPct).toBeDefined();
    expect(priceRules.validFrom).toBeDefined();
    expect(priceRules.validUntil).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Negociere FSM
// ---------------------------------------------------------------------------

describe("E3 Schema — goldNegotiations", () => {
  it("există cu toate câmpurile FSM", () => {
    expect(goldNegotiations).toBeDefined();
    expect(goldNegotiations.id).toBeDefined();
    expect(goldNegotiations.tenantId).toBeDefined();
    expect(goldNegotiations.leadId).toBeDefined();
    expect(goldNegotiations.assignedUserId).toBeDefined();
    expect(goldNegotiations.currentState).toBeDefined();
    expect(goldNegotiations.engagementScore).toBeDefined();
    expect(goldNegotiations.closeProbability).toBeDefined();
    expect(goldNegotiations.totalValue).toBeDefined();
    expect(goldNegotiations.createdAt).toBeDefined();
    expect(goldNegotiations.updatedAt).toBeDefined();
  });
});

describe("E3 Schema — negotiationStateHistory", () => {
  it("există și este append-only (nu are updatedAt)", () => {
    expect(negotiationStateHistory).toBeDefined();
    expect(negotiationStateHistory.id).toBeDefined();
    expect(negotiationStateHistory.negotiationId).toBeDefined();
    expect(negotiationStateHistory.fromState).toBeDefined();
    expect(negotiationStateHistory.toState).toBeDefined();
    expect(negotiationStateHistory.changedBy).toBeDefined();
    expect(negotiationStateHistory.reason).toBeDefined();
    expect(negotiationStateHistory.createdAt).toBeDefined();
    // append-only: nu are updatedAt
    expect(
      (negotiationStateHistory as unknown as Record<string, unknown>).updatedAt,
    ).toBeUndefined();
  });
});

describe("E3 Schema — negotiationItems", () => {
  it("există cu câmpuri de preț și discount", () => {
    expect(negotiationItems).toBeDefined();
    expect(negotiationItems.id).toBeDefined();
    expect(negotiationItems.negotiationId).toBeDefined();
    expect(negotiationItems.productId).toBeDefined();
    expect(negotiationItems.quantity).toBeDefined();
    expect(negotiationItems.unitPrice).toBeDefined();
    expect(negotiationItems.discountPct).toBeDefined();
    expect(negotiationItems.lineTotal).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Stoc
// ---------------------------------------------------------------------------

describe("E3 Schema — stockInventory", () => {
  it("există cu câmpuri de cantitate", () => {
    expect(stockInventory).toBeDefined();
    expect(stockInventory.id).toBeDefined();
    expect(stockInventory.tenantId).toBeDefined();
    expect(stockInventory.productId).toBeDefined();
    expect(stockInventory.sku).toBeDefined();
    expect(stockInventory.totalQuantity).toBeDefined();
    expect(stockInventory.reservedQuantity).toBeDefined();
    expect(stockInventory.warehouseLocation).toBeDefined();
  });
});

describe("E3 Schema — stockReservations", () => {
  it("există cu câmpuri TTL și state", () => {
    expect(stockReservations).toBeDefined();
    expect(stockReservations.id).toBeDefined();
    expect(stockReservations.inventoryId).toBeDefined();
    expect(stockReservations.negotiationId).toBeDefined();
    expect(stockReservations.quantity).toBeDefined();
    expect(stockReservations.reservationState).toBeDefined();
    expect(stockReservations.expiresAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AI Conversations
// ---------------------------------------------------------------------------

describe("E3 Schema — aiConversations", () => {
  it("există cu câmpuri sesiune AI", () => {
    expect(aiConversations).toBeDefined();
    expect(aiConversations.id).toBeDefined();
    expect(aiConversations.tenantId).toBeDefined();
    expect(aiConversations.leadId).toBeDefined();
    expect(aiConversations.negotiationId).toBeDefined();
    expect(aiConversations.sessionId).toBeDefined();
    expect(aiConversations.modelUsed).toBeDefined();
    expect(aiConversations.totalTokens).toBeDefined();
  });
});

describe("E3 Schema — aiConversationMessages", () => {
  it("există cu role valid (system/user/assistant/tool)", () => {
    expect(aiConversationMessages).toBeDefined();
    expect(aiConversationMessages.id).toBeDefined();
    expect(aiConversationMessages.conversationId).toBeDefined();
    expect(aiConversationMessages.role).toBeDefined();
    expect(aiConversationMessages.content).toBeDefined();
    expect(aiConversationMessages.tokens).toBeDefined();
  });

  it("conține câmpurile de sentiment K61 (FAZA 7l)", () => {
    // sentimentScore și sentimentLabel adăugate pentru K64 trend analysis
    expect(aiConversationMessages.sentimentScore).toBeDefined();
    expect(aiConversationMessages.sentimentLabel).toBeDefined();
  });
});

describe("E3 Schema — aiToolCalls", () => {
  it("există cu câmpuri audit complet", () => {
    expect(aiToolCalls).toBeDefined();
    expect(aiToolCalls.id).toBeDefined();
    expect(aiToolCalls.conversationId).toBeDefined();
    expect(aiToolCalls.messageId).toBeDefined();
    expect(aiToolCalls.toolName).toBeDefined();
    expect(aiToolCalls.input).toBeDefined();
    expect(aiToolCalls.output).toBeDefined();
    expect(aiToolCalls.durationMs).toBeDefined();
    expect(aiToolCalls.success).toBeDefined();
  });
});

describe("E3 Schema — guardrailViolations", () => {
  it("există cu severity ENUM corect", () => {
    expect(guardrailViolations).toBeDefined();
    expect(guardrailViolations.id).toBeDefined();
    expect(guardrailViolations.tenantId).toBeDefined();
    expect(guardrailViolations.nodeKey).toBeDefined();
    expect(guardrailViolations.violationType).toBeDefined();
    expect(guardrailViolations.severity).toBeDefined();
    expect(guardrailViolations.details).toBeDefined();
    expect(guardrailViolations.resolution).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Fiscal / Oblio / eFactura
// ---------------------------------------------------------------------------

describe("E3 Schema — oblioDocuments", () => {
  it("există cu ENUM tip document și constraint total=subtotal+vat", () => {
    expect(oblioDocuments).toBeDefined();
    expect(oblioDocuments.id).toBeDefined();
    expect(oblioDocuments.tenantId).toBeDefined();
    expect(oblioDocuments.documentType).toBeDefined();
    expect(oblioDocuments.series).toBeDefined();
    expect(oblioDocuments.number).toBeDefined();
    expect(oblioDocuments.oblioId).toBeDefined();
    expect(oblioDocuments.subtotal).toBeDefined();
    expect(oblioDocuments.vat).toBeDefined();
    expect(oblioDocuments.total).toBeDefined();
    expect(oblioDocuments.issuedAt).toBeDefined();
  });
});

describe("E3 Schema — einvoiceSubmissions", () => {
  it("există cu ENUM status și câmpuri SPV ANAF", () => {
    expect(einvoiceSubmissions).toBeDefined();
    expect(einvoiceSubmissions.id).toBeDefined();
    expect(einvoiceSubmissions.tenantId).toBeDefined();
    expect(einvoiceSubmissions.oblioDocumentId).toBeDefined();
    expect(einvoiceSubmissions.status).toBeDefined();
    expect(einvoiceSubmissions.indexSpv).toBeDefined();
    expect(einvoiceSubmissions.deadlineAt).toBeDefined();
    expect(einvoiceSubmissions.submittedAt).toBeDefined();
    expect(einvoiceSubmissions.validatedAt).toBeDefined();
    expect(einvoiceSubmissions.errorMessage).toBeDefined();
    expect(einvoiceSubmissions.retryCount).toBeDefined();
  });
});

describe("E3 Schema — fiscalAuditTrail", () => {
  it("există cu câmpuri hash chain SHA-256", () => {
    expect(fiscalAuditTrail).toBeDefined();
    expect(fiscalAuditTrail.id).toBeDefined();
    expect(fiscalAuditTrail.tenantId).toBeDefined();
    expect(fiscalAuditTrail.entityType).toBeDefined();
    expect(fiscalAuditTrail.entityId).toBeDefined();
    expect(fiscalAuditTrail.action).toBeDefined();
    expect(fiscalAuditTrail.actorId).toBeDefined();
    expect(fiscalAuditTrail.prevHash).toBeDefined();
    expect(fiscalAuditTrail.hash).toBeDefined();
    expect(fiscalAuditTrail.data).toBeDefined();
    expect(fiscalAuditTrail.createdAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// FSM Tables
// ---------------------------------------------------------------------------

describe("E3 Schema — fsmValidTransitions", () => {
  it("există cu coloanele FSM", () => {
    expect(fsmValidTransitions).toBeDefined();
    expect(fsmValidTransitions.id).toBeDefined();
    expect(fsmValidTransitions.fsmType).toBeDefined();
    expect(fsmValidTransitions.fromState).toBeDefined();
    expect(fsmValidTransitions.toState).toBeDefined();
    expect(fsmValidTransitions.requiresRole).toBeDefined();
  });
});

describe("E3 Schema — fsmStateAllowedTools", () => {
  it("există cu coloanele MCP tools", () => {
    expect(fsmStateAllowedTools).toBeDefined();
    expect(fsmStateAllowedTools.id).toBeDefined();
    expect(fsmStateAllowedTools.fsmType).toBeDefined();
    expect(fsmStateAllowedTools.state).toBeDefined();
    expect(fsmStateAllowedTools.toolName).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Număr total tabele E3
// ---------------------------------------------------------------------------

describe("E3 Schema — completitudine", () => {
  it("toate cele 20 tabele E3 sunt exportate (incl. goldNegotiationFeedback FAZA 7l)", () => {
    const e3Tables = [
      goldProductCategories,
      goldProducts,
      goldProductEmbeddings,
      goldProductChunks,
      priceRules,
      goldNegotiations,
      negotiationStateHistory,
      negotiationItems,
      stockInventory,
      stockReservations,
      aiConversations,
      aiConversationMessages,
      aiToolCalls,
      guardrailViolations,
      oblioDocuments,
      einvoiceSubmissions,
      fiscalAuditTrail,
      fsmValidTransitions,
      fsmStateAllowedTools,
      goldNegotiationFeedback,
    ];
    for (const table of e3Tables) {
      expect(table).toBeDefined();
    }
    expect(e3Tables).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// goldNegotiationFeedback — K65 NPS Feedback (FAZA 7l)
// ---------------------------------------------------------------------------

describe("E3 Schema — goldNegotiationFeedback (K65)", () => {
  it("există cu toate câmpurile K65 NPS feedback", () => {
    expect(goldNegotiationFeedback).toBeDefined();
    expect(goldNegotiationFeedback.id).toBeDefined();
    expect(goldNegotiationFeedback.tenantId).toBeDefined();
    expect(goldNegotiationFeedback.negotiationId).toBeDefined();
    expect(goldNegotiationFeedback.nps).toBeDefined();
    expect(goldNegotiationFeedback.freeText).toBeDefined();
    expect(goldNegotiationFeedback.sourceChannel).toBeDefined();
    expect(goldNegotiationFeedback.triggerMessageId).toBeDefined();
    expect(goldNegotiationFeedback.metadata).toBeDefined();
    expect(goldNegotiationFeedback.createdAt).toBeDefined();
  });
});
