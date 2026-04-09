import { describe, it, expect } from "vitest";
import { getQueueConfig, QUEUES } from "@cerniq/worker-shared";
import { createLeadAssignUserWorker } from "./lead-assign-user.js";

describe("lead-assign-user worker", () => {
  it("coada LEAD_ASSIGN_USER este înregistrată cu concurrency", () => {
    expect(QUEUES.LEAD_ASSIGN_USER).toBe("lead:assign:user");
    expect(getQueueConfig(QUEUES.LEAD_ASSIGN_USER)?.concurrency).toBe(20);
  });

  it("exportă factory de worker", () => {
    expect(typeof createLeadAssignUserWorker).toBe("function");
  });
});
