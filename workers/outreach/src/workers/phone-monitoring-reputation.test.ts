import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Job } from "bullmq";
import * as workerShared from "@cerniq/worker-shared";

const quarantineAdd = vi.fn();

const dbMocks = vi.hoisted(() => ({
  selectWhereMock: vi.fn(),
}));

vi.mock("@cerniq/db", () => ({
  phoneStatusEnum: { enumValues: ["ACTIVE", "BANNED", "PAUSED", "OFFLINE", "RECONNECTING"] },
  setSessionTenantId: vi.fn(),
  communicationLog: {},
  waPhoneNumbers: {},
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  sql: vi.fn(),
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: dbMocks.selectWhereMock,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

import { executePhoneReputationJob } from "./phone-monitoring.js";

describe("executePhoneReputationJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quarantineAdd.mockResolvedValue(undefined);
    vi.spyOn(workerShared, "createQueue").mockReturnValue({
      add: quarantineAdd,
      close: vi.fn(),
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies blockRate to score and records cerniq_phone_block_rate", async () => {
    dbMocks.selectWhereMock.mockResolvedValueOnce([
      { total: 10, delivered: 10, replied: 0, bounced: 0, blocked: 5 },
    ]);
    const setSpy = vi.spyOn(workerShared.phoneBlockRateGauge, "set");
    const job = {
      data: { tenantId: "t1", phoneId: "p1", windowHours: 24 },
    } as Job<{ tenantId: string; phoneId: string; windowHours?: number }>;
    const r = await executePhoneReputationJob(null, job);
    expect(r.factors.blockRate).toBe(0.5);
    expect(setSpy).toHaveBeenCalledWith({ tenant_id: "t1", phone_id: "p1" }, 0.5);
    expect(r.score).toBe(10);
    expect(quarantineAdd).toHaveBeenCalled();
  });

  it("when total=0, score 100 and block gauge 0", async () => {
    dbMocks.selectWhereMock.mockResolvedValueOnce([
      { total: 0, delivered: 0, replied: 0, bounced: 0, blocked: 0 },
    ]);
    const setSpy = vi.spyOn(workerShared.phoneBlockRateGauge, "set");
    const job = { data: { tenantId: "t1", phoneId: "p1" } } as Job<{
      tenantId: string;
      phoneId: string;
    }>;
    const r = await executePhoneReputationJob(null, job);
    expect(r.score).toBe(100);
    expect(setSpy).toHaveBeenCalledWith({ tenant_id: "t1", phone_id: "p1" }, 0);
    expect(quarantineAdd).not.toHaveBeenCalled();
  });
});
