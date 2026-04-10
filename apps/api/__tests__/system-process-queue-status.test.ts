import { describe, it, expect } from "vitest";
import { deriveQueueSnapshotStatus } from "../src/lib/system-process-queue-status.js";

describe("deriveQueueSnapshotStatus", () => {
  it("pipeline:monitor-like: delayed + failed istoric → queued (nu FAILED)", () => {
    expect(
      deriveQueueSnapshotStatus({
        waiting: 0,
        active: 0,
        delayed: 153,
        failed: 200,
      }),
    ).toBe("queued");
  });

  it("maintenance cron: delayed + câteva failed → queued", () => {
    expect(
      deriveQueueSnapshotStatus({
        waiting: 0,
        active: 0,
        delayed: 1,
        failed: 3,
      }),
    ).toBe("queued");
  });

  it("fără pending, doar failed rămase → failed", () => {
    expect(
      deriveQueueSnapshotStatus({
        waiting: 0,
        active: 0,
        delayed: 0,
        failed: 5,
      }),
    ).toBe("failed");
  });

  it("active > 0 → running", () => {
    expect(
      deriveQueueSnapshotStatus({
        waiting: 0,
        active: 1,
        delayed: 0,
        failed: 99,
      }),
    ).toBe("running");
  });
});
