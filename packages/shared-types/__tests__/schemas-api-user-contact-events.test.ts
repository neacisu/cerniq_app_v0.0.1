import { describe, expect, it } from "vitest";
import {
  ApiErrorResponseSchema,
  ApiErrorSchema,
  ApiResponseSchema,
  PaginationSchema,
} from "../src/schemas/api-response.js";
import { ApprovalTaskSchema } from "../src/schemas/approval.js";
import { CompanyCreateSchema, CompanySchema } from "../src/schemas/company.js";
import { ContactCreateSchema, ContactSchema } from "../src/schemas/contact.js";
import { EventBaseSchema, EventTypes } from "../src/schemas/events.js";
import { LeadCreateSchema, LeadSchema } from "../src/schemas/lead.js";
import { LogLevelSchema, StructuredLogSchema } from "../src/schemas/structured-logs.js";
import { UserCreateSchema, UserSchema } from "../src/schemas/user.js";

const TID = "123e4567-e89b-12d3-a456-426614174000";
const CID = "223e4567-e89b-12d3-a456-426614174001";
const UID = "323e4567-e89b-12d3-a456-426614174002";
const EID = "423e4567-e89b-12d3-a456-426614174003";
const REQ = "523e4567-e89b-12d3-a456-426614174004";

describe("api-response schemas", () => {
  it("validează ApiErrorSchema și factory-urile de răspuns", () => {
    const err = {
      statusCode: 400,
      error: "Bad Request",
      message: "invalid",
      code: "E1",
      details: { field: "x" },
    };
    expect(ApiErrorSchema.parse(err)).toEqual(err);

    const ok = ApiResponseSchema(ApiErrorSchema).parse({
      success: true,
      data: err,
      meta: { trace: "1" },
    });
    expect(ok.success).toBe(true);

    const fail = ApiErrorResponseSchema().parse({
      success: false,
      error: err,
    });
    expect(fail.success).toBe(false);
  });

  it("validează PaginationSchema cu valori implicite", () => {
    const p = PaginationSchema.parse({
      total: 40,
      totalPages: 2,
    });
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.total).toBe(40);
  });
});

describe("approval ApprovalTaskSchema", () => {
  it("acceptă un task minimal valid", () => {
    const task = {
      id: EID,
      tenantId: TID,
      type: "review",
      approvalType: "dedup_review" as const,
      entityType: "company",
      entityId: CID,
      title: "Verificare deduplicare",
      requestedBy: REQ,
      etapa: "E1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    };
    const parsed = ApprovalTaskSchema.parse(task);
    expect(parsed.status).toBe("pending");
    expect(parsed.urgency).toBe("medium");
  });
});

describe("company / lead / contact / user", () => {
  it("CompanySchema și CompanyCreateSchema", () => {
    const row = {
      id: CID,
      tenantId: TID,
      cui: "RO18547290",
      name: "ACME",
      status: "validated" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(CompanySchema.parse(row).tier).toBe("bronze");
    const create = CompanyCreateSchema.parse({
      tenantId: TID,
      cui: "RO18547290",
      name: "ACME",
      status: "raw",
    });
    expect(create.anafValid).toBe(false);
  });

  it("LeadSchema și LeadCreateSchema", () => {
    const row = {
      id: EID,
      tenantId: TID,
      companyId: CID,
      status: "cold" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(LeadSchema.parse(row).score).toBe(0);
    expect(LeadCreateSchema.parse({ tenantId: TID, companyId: CID, status: "dead" }).status).toBe(
      "dead",
    );
  });

  it("ContactSchema și ContactCreateSchema", () => {
    const row = {
      id: UID,
      tenantId: TID,
      companyId: CID,
      firstName: "Ion",
      lastName: "Pop",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(ContactSchema.parse(row).source).toBe("import");
    expect(
      ContactCreateSchema.parse({
        tenantId: TID,
        companyId: CID,
        firstName: "A",
        lastName: "B",
      }).lastName,
    ).toBe("B");
  });

  it("UserSchema și UserCreateSchema", () => {
    const row = {
      id: UID,
      tenantId: TID,
      email: "user@example.com",
      name: "User",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(UserSchema.parse(row).role).toBe("viewer");
    expect(
      UserCreateSchema.parse({
        tenantId: TID,
        email: "x@example.com",
        name: "Y",
      }).status,
    ).toBe("pending");
  });
});

describe("events", () => {
  it("EventBaseSchema și constantele EventTypes", () => {
    const ev = {
      eventId: EID,
      eventType: EventTypes.LEAD_CREATED,
      tenantId: TID,
      timestamp: new Date(),
      source: "api",
      payload: { ok: true },
    };
    const parsed = EventBaseSchema.parse(ev);
    expect(parsed.version).toBe("1.0");
    expect(Object.values(EventTypes).every((v) => typeof v === "string")).toBe(true);
  });
});

describe("structured logs", () => {
  it("LogLevelSchema și StructuredLogSchema", () => {
    expect(LogLevelSchema.parse("info")).toBe("info");
    const log = StructuredLogSchema.parse({
      level: "warn",
      time: Date.now(),
      msg: "hello",
      service: "api",
      error: { message: "e", code: "E" },
    });
    expect(log.level).toBe("warn");
    expect(log.error?.message).toBe("e");
  });
});
