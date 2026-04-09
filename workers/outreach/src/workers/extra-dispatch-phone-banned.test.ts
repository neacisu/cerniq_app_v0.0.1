import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isPhoneBannedAlertPayload,
  isPhoneQuarantineLegacyOnBannedQueue,
} from "./phone-monitoring.js";

const addMock = vi.fn(async () => ({ id: "j1" }));
const closeMock = vi.fn(async () => undefined);

vi.mock("@cerniq/worker-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cerniq/worker-shared")>();
  return {
    ...actual,
    createQueue: vi.fn(() => ({ add: addMock, close: closeMock })),
    createWorker: vi.fn((_queueName: string, processor: unknown) => ({
      worker: { processor, close: vi.fn(async () => undefined) },
    })),
  };
});

describe("alert:phone:banned — tipuri + legacy quarantine", () => {
  beforeEach(() => {
    addMock.mockClear();
    closeMock.mockClear();
  });

  it("isPhoneBannedAlertPayload acceptă forma canonică BANNED", () => {
    const p = {
      tenantId: "t",
      phoneId: "p",
      phoneNumber: "+40",
      reason: "BANNED" as const,
      bannedAt: new Date().toISOString(),
    };
    expect(isPhoneBannedAlertPayload(p)).toBe(true);
  });

  it("isPhoneQuarantineLegacyOnBannedQueue detectează payload vechi reputație", () => {
    expect(
      isPhoneQuarantineLegacyOnBannedQueue({
        tenantId: "t",
        phoneId: "p",
        reason: "Low reputation score",
        score: 12,
        threshold: 20,
      }),
    ).toBe(true);
  });

  it("legacy quarantine pe coada banned → forwardează către PHONE_QUARANTINE", async () => {
    const { createWorker } = await import("@cerniq/worker-shared");
    const { createAlertPhoneBannedWorker } = await import("./extra-dispatch.js");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const w = createAlertPhoneBannedWorker();
    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: { data: unknown }) => Promise<unknown>,
    ];

    const out = await processor({
      data: {
        tenantId: "t",
        phoneId: "p",
        reason: "Low reputation score",
        score: 10,
        threshold: 20,
      },
    });
    expect(out).toMatchObject({ forwarded: true });
    expect(addMock).toHaveBeenCalled();
    await w.close();
  });
});
