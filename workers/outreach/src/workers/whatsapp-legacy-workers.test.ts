/**
 * Workeri legacy: aceleași procesoare ca cozile canonice, nume de coadă vechi pentru drain Redis.
 * Bootstrap în `index.ts` trebuie să înregistreze acești workeri alături de cei canonici.
 */
import { describe, it, expect, vi } from "vitest";
import { LEGACY_WA_REPLY_QUEUE, QUEUES } from "@cerniq/worker-shared";
import {
  createWaLegacyChatHistoryReadReceiptWorker,
  createWaLegacyReplyDeliveryStatusWorker,
} from "./whatsapp.js";

const createWorkerMock = vi.fn();

vi.mock("@cerniq/worker-shared", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@cerniq/worker-shared")>();
  return {
    ...mod,
    createWorker: (...args: unknown[]) => {
      createWorkerMock(...args);
      return { worker: { close: vi.fn() } };
    },
  };
});

describe("WA legacy queue workers (drain / compat)", () => {
  it("createWaLegacyReplyDeliveryStatusWorker ascultă LEGACY_WA_REPLY_QUEUE (drain q:wa:reply)", () => {
    createWorkerMock.mockClear();
    const w = createWaLegacyReplyDeliveryStatusWorker();
    expect(w).toBeDefined();
    expect(createWorkerMock).toHaveBeenCalledTimes(1);
    const [queueName, , opts] = createWorkerMock.mock.calls[0] as [
      string,
      unknown,
      { concurrency?: number },
    ];
    expect(queueName).toBe(LEGACY_WA_REPLY_QUEUE);
    expect(LEGACY_WA_REPLY_QUEUE).toBe("q:wa:reply");
    expect(opts?.concurrency).toBe(100);
  });

  it("createWaLegacyChatHistoryReadReceiptWorker ascultă WA_CHAT_HISTORY_FETCH (read receipt)", () => {
    createWorkerMock.mockClear();
    const w = createWaLegacyChatHistoryReadReceiptWorker();
    expect(w).toBeDefined();
    expect(createWorkerMock).toHaveBeenCalledTimes(1);
    const [queueName, , opts] = createWorkerMock.mock.calls[0] as [
      string,
      unknown,
      { concurrency?: number },
    ];
    expect(queueName).toBe(QUEUES.WA_CHAT_HISTORY_FETCH);
    expect(opts?.concurrency).toBe(100);
  });
});
