import { loadSecretsFromFile } from "@cerniq/worker-shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const healthClose = vi.fn();
  const stopWatching = vi.fn();
  const workerClose = vi.fn().mockResolvedValue(undefined);
  let watchCallback: (() => void | Promise<void>) | undefined;

  return {
    healthClose,
    stopWatching,
    workerClose,
    getWatchCb: () => watchCallback,
    setWatchCb: (v: typeof watchCallback) => {
      watchCallback = v;
    },
  };
});

vi.mock("@cerniq/worker-shared", () => ({
  loadSecretsFromFile: vi.fn(),
  assertQueueRegistryComplete: vi.fn(),
  queueRegistry: [{ name: "ai:smoke" }, { name: "enrichment:j1" }],
  createHealthServer: vi.fn((_port: number, healthFn: () => unknown) => {
    healthFn();
    return { close: mocks.healthClose };
  }),
  watchSecretsFile: vi.fn((_path: string, cb: () => void | Promise<void>) => {
    mocks.setWatchCb(cb);
    return mocks.stopWatching;
  }),
}));

vi.mock("./consensus-vote-worker.js", () => ({
  createConsensusVoteRequestWorker: vi.fn(() => ({ close: mocks.workerClose })),
  createConsensusVoteCollectWorker: vi.fn(() => ({ close: mocks.workerClose })),
  createConsensusVoteDecideWorker: vi.fn(() => ({ close: mocks.workerClose })),
}));

async function flushUntil(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (cond()) return;
    await new Promise<void>((r) => setImmediate(r));
  }
  throw new Error("flushUntil: timeout");
}

describe("main bootstrap", () => {
  const listeners = new Map<string | symbol, Array<(...args: unknown[]) => void>>();

  beforeEach(() => {
    listeners.clear();
    vi.spyOn(process, "on").mockImplementation((event, handler) => {
      const arr = listeners.get(event) ?? [];
      arr.push(handler as (...args: unknown[]) => void);
      listeners.set(event, arr);
      return process;
    });
    vi.spyOn(process, "exit").mockImplementation((() => {
      /* înlocuit în test */
    }) as typeof process.exit);
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.healthClose.mockClear();
    mocks.stopWatching.mockClear();
    mocks.workerClose.mockClear().mockResolvedValue(undefined);
    mocks.setWatchCb(undefined);
    vi.mocked(loadSecretsFromFile).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bootstrap încarcă secrete, pornește health și înregistrează semnale", async () => {
    const { bootstrap } = await import("./main.js");
    await bootstrap();

    expect(loadSecretsFromFile).toHaveBeenCalledWith(false, "/secrets/workers.env");
    expect(listeners.get("SIGTERM")?.length).toBeGreaterThan(0);
    expect(listeners.get("SIGINT")?.length).toBeGreaterThan(0);
    expect(listeners.get("SIGHUP")?.length).toBeGreaterThan(0);
    expect(listeners.get("unhandledRejection")?.length).toBeGreaterThan(0);
    expect(listeners.get("uncaughtException")?.length).toBeGreaterThan(0);
    expect(mocks.getWatchCb()).toBeTypeOf("function");

    await mocks.getWatchCb()?.();
    expect(loadSecretsFromFile).toHaveBeenCalledWith(true, "/secrets/workers.env");

    listeners.get("unhandledRejection")?.[0]?.("x");
    listeners.get("uncaughtException")?.[0]?.(new Error("t"));

    const sighup = listeners.get("SIGHUP")?.[0];
    await Promise.resolve(sighup?.());
    vi.mocked(loadSecretsFromFile).mockImplementationOnce(() => {
      throw new Error("reload fail");
    });
    await Promise.resolve(sighup?.());

    expect(console.error).toHaveBeenCalled();

    listeners.get("SIGTERM")?.[0]?.();
    await flushUntil(() => mocks.healthClose.mock.calls.length > 0);
    expect(mocks.workerClose).toHaveBeenCalled();
    expect(mocks.healthClose).toHaveBeenCalled();
    expect(mocks.stopWatching).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("shutdown prin SIGINT închide worker-ii", async () => {
    const { bootstrap } = await import("./main.js");
    await bootstrap();
    listeners.get("SIGINT")?.[0]?.();
    await flushUntil(() => mocks.healthClose.mock.calls.length > 0);
    expect(mocks.healthClose).toHaveBeenCalled();
  });

  it("SIGTERM ignoră eroarea la close() pe worker", async () => {
    mocks.workerClose.mockRejectedValueOnce(new Error("close failed"));
    const { bootstrap } = await import("./main.js");
    await bootstrap();
    listeners.get("SIGTERM")?.[0]?.();
    await flushUntil(() => mocks.healthClose.mock.calls.length > 0);
    expect(mocks.healthClose).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
