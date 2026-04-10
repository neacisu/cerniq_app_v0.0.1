import { describe, it, expect } from "vitest";
import { validateJobData } from "@cerniq/worker-shared";
import { orchestratorJobDataSchema } from "./p1-orchestrate.js";
import { promoteToGoldJobDataSchema } from "./p2-promote-to-gold.js";
import { hitlResumeAfterApprovalJobDataSchema } from "./hitl-resume-after-approval.js";
import { promotionBronzeSilverJobDataSchema } from "./promotion-bronze-silver.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TASK = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("F5: payload job cu requestId / httpCorrelationId (Zod enrichment)", () => {
  it("p1 orchestrate — minimal și cu tracing HTTP", () => {
    const minimal = { tenantId: TENANT, companyId: COMPANY, stage: "post_validation" as const };
    expect(
      validateJobData(orchestratorJobDataSchema, minimal, { queueName: "orchestrate", jobId: 1 }),
    ).toMatchObject(minimal);

    const withHttp = {
      ...minimal,
      correlationId: "api-enrich-x",
      traceId: "tr1",
      causationKey: "ck",
      sourceEndpoint: "/api/v1/enrich",
      actorId: TENANT,
      requestId: "req-1",
      httpCorrelationId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(
      validateJobData(orchestratorJobDataSchema, withHttp, { queueName: "orchestrate", jobId: 2 }),
    ).toMatchObject({
      requestId: "req-1",
      httpCorrelationId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("p2 promote-to-gold — cu tracing HTTP", () => {
    const minimal = { tenantId: TENANT, companyId: COMPANY };
    expect(
      validateJobData(promoteToGoldJobDataSchema, minimal, { queueName: "promote", jobId: 1 }),
    ).toMatchObject(minimal);

    const withHttp = {
      ...minimal,
      force: true,
      correlationId: "api-promote",
      requestId: "r2",
      httpCorrelationId: "650e8400-e29b-41d4-a716-446655440001",
    };
    expect(
      validateJobData(promoteToGoldJobDataSchema, withHttp, { queueName: "promote", jobId: 2 }),
    ).toMatchObject({ requestId: "r2" });
  });

  it("hitl resume after approval — cu tracing HTTP", () => {
    const minimal = { tenantId: TENANT, approvalTaskId: TASK };
    expect(
      validateJobData(hitlResumeAfterApprovalJobDataSchema, minimal, {
        queueName: "hitl-resume",
        jobId: 1,
      }),
    ).toMatchObject(minimal);

    const withHttp = {
      ...minimal,
      correlationId: "api-resume",
      requestId: "r3",
      httpCorrelationId: "750e8400-e29b-41d4-a716-446655440002",
      sourceEndpoint: "/api/v1/enrichment/resume",
    };
    expect(
      validateJobData(hitlResumeAfterApprovalJobDataSchema, withHttp, {
        queueName: "hitl-resume",
        jobId: 2,
      }),
    ).toMatchObject({ httpCorrelationId: "750e8400-e29b-41d4-a716-446655440002" });
  });

  it("promotion bronze→silver — batch + tracing HTTP", () => {
    const minimal = { tenantId: TENANT, batchId: COMPANY };
    expect(
      validateJobData(promotionBronzeSilverJobDataSchema, minimal, {
        queueName: "promotion-bronze-silver",
        jobId: 1,
      }),
    ).toMatchObject(minimal);

    const withHttp = {
      ...minimal,
      correlationId: "import-batch",
      requestId: "r4",
      httpCorrelationId: "850e8400-e29b-41d4-a716-446655440003",
      traceId: "t99",
    };
    expect(
      validateJobData(promotionBronzeSilverJobDataSchema, withHttp, {
        queueName: "promotion-bronze-silver",
        jobId: 2,
      }),
    ).toMatchObject({ requestId: "r4" });
  });
});
