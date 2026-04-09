import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "bullmq";
import { processWaDeliveryStatusJob, type WaDeliveryStatusJobData } from "./whatsapp.js";

const retryAdd = vi.fn();

vi.mock("@cerniq/worker-shared", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@cerniq/worker-shared")>();
  return {
    ...mod,
    createQueue: vi.fn(() => ({ add: retryAdd, close: vi.fn() })),
  };
});

const updateWhere = vi.fn().mockResolvedValue(undefined);

vi.mock("@cerniq/db", () => ({
  setSessionTenantId: vi.fn(),
  communicationLog: {},
  eq: vi.fn(),
  and: vi.fn(),
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere,
      })),
    })),
  },
}));

describe("processWaDeliveryStatusJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    retryAdd.mockResolvedValue(undefined);
  });

  it("persists BLOCKED without enqueuing WA_MESSAGE_RETRY", async () => {
    const job = {
      data: {
        tenantId: "t1",
        externalMessageId: "m1",
        chatId: "c1",
        status: "BLOCKED",
        timestamp: new Date().toISOString(),
      } satisfies WaDeliveryStatusJobData,
    } as Job<WaDeliveryStatusJobData>;
    await processWaDeliveryStatusJob(job);
    expect(retryAdd).not.toHaveBeenCalled();
    expect(updateWhere).toHaveBeenCalled();
  });

  it("enqueues retry on FAILED", async () => {
    const job = {
      data: {
        tenantId: "t1",
        externalMessageId: "m2",
        chatId: "c1",
        status: "FAILED",
        timestamp: new Date().toISOString(),
        failureReason: "x",
      } satisfies WaDeliveryStatusJobData,
    } as Job<WaDeliveryStatusJobData>;
    await processWaDeliveryStatusJob(job);
    expect(retryAdd).toHaveBeenCalled();
  });
});
