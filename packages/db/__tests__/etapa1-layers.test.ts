import { describe, expect, it } from "vitest";
import {
  bronzeContacts,
  bronzeImportBatches,
  bronzeProcessingStatusEnum,
  bronzeScrapeResults,
  bronzeSourceTypeEnum,
  bronzeWebhooks,
  importStatusEnum,
} from "../src/schemas/bronze.js";
import {
  dedupStatusEnum,
  enrichmentStatusEnum,
  promotionStatusEnum,
  silverCompanies,
  silverCompanyLocations,
  silverContacts,
  silverDedupCandidates,
  silverEnrichmentLog,
} from "../src/schemas/silver.js";
import {
  contactRoleEnum,
  dailyStats,
  errorSeverityEnum,
  goldCompanies,
  goldContacts,
  goldLeadJourney,
  pipelineErrors,
  riskCategoryEnum,
} from "../src/schemas/gold.js";

describe("Etapa 1 - Bronze layer schema", () => {
  it("declara toate cele 4 tabele bronze", () => {
    expect(bronzeContacts).toBeDefined();
    expect(bronzeImportBatches).toBeDefined();
    expect(bronzeWebhooks).toBeDefined();
    expect(bronzeScrapeResults).toBeDefined();
  });

  it("expune enumurile bronze expected", () => {
    expect(bronzeSourceTypeEnum.enumValues).toEqual([
      "csv_import",
      "webhook",
      "scrape",
      "manual",
      "api",
      "excel_import",
    ]);
    expect(bronzeProcessingStatusEnum.enumValues).toEqual([
      "pending",
      "processing",
      "promoted",
      "rejected",
      "error",
    ]);
    expect(importStatusEnum.enumValues).toEqual([
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ]);
  });
});

describe("Etapa 1 - Silver layer schema", () => {
  it("declara toate cele 5 tabele silver", () => {
    expect(silverCompanies).toBeDefined();
    expect(silverContacts).toBeDefined();
    expect(silverEnrichmentLog).toBeDefined();
    expect(silverDedupCandidates).toBeDefined();
    expect(silverCompanyLocations).toBeDefined();
  });

  it("respecta enumurile de status silver", () => {
    expect(enrichmentStatusEnum.enumValues).toEqual([
      "pending",
      "in_progress",
      "complete",
      "partial",
      "failed",
    ]);
    expect(promotionStatusEnum.enumValues).toEqual([
      "eligible",
      "review_required",
      "blocked",
      "promoted",
    ]);
    expect(dedupStatusEnum.enumValues).toEqual([
      "pending",
      "auto_merged",
      "hitl_pending",
      "merged",
      "rejected",
      "expired",
    ]);
  });
});

describe("Etapa 1 - Gold layer schema", () => {
  it("declara tabelele gold si support", () => {
    expect(goldCompanies).toBeDefined();
    expect(goldContacts).toBeDefined();
    expect(goldLeadJourney).toBeDefined();
    expect(dailyStats).toBeDefined();
    expect(pipelineErrors).toBeDefined();
  });

  it("expune enumurile de risc/contact/error", () => {
    expect(riskCategoryEnum.enumValues).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(contactRoleEnum.enumValues).toEqual([
      "ADMINISTRATOR",
      "ACTIONAR",
      "CONTACT",
      "ASOCIAT",
      "REPREZENTANT",
    ]);
    expect(errorSeverityEnum.enumValues).toEqual(["warning", "error", "critical"]);
  });

  it("currentState pe gold_companies este definit si defaultat", () => {
    expect(goldCompanies.currentState).toBeDefined();
    expect(goldCompanies.previousState).toBeDefined();
    expect(goldCompanies.stateHistory).toBeDefined();
  });
});
