import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateJobData } from "./job-validation.js";

describe("validateJobData", () => {
  it("returns parsed data when the payload is valid", () => {
    const schema = z.object({
      tenantId: z.uuid(),
      force: z.boolean().optional(),
    });

    const payload = validateJobData(
      schema,
      {
        tenantId: "00000000-0000-4000-8000-000000000001",
        force: true,
      },
      { queueName: "pipeline:test", jobId: "job-1" },
    );

    expect(payload).toEqual({
      tenantId: "00000000-0000-4000-8000-000000000001",
      force: true,
    });
  });

  it("throws a readable error when the payload is invalid", () => {
    const schema = z.object({
      tenantId: z.uuid(),
      companyId: z.uuid(),
    });

    expect(() =>
      validateJobData(schema, { tenantId: "invalid" }, { queueName: "pipeline:test", jobId: 42 }),
    ).toThrow(
      "Invalid job payload for queue pipeline:test (job 42): tenantId: Invalid UUID; companyId: Invalid input: expected string, received undefined",
    );
  });
});
