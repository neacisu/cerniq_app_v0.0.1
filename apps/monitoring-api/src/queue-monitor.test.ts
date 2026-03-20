import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

type AsyncVoidMock = Mock<() => Promise<void>>;
type AsyncNumberMock = Mock<() => Promise<number>>;

const queueInstances = new Map<
  string,
  {
    pause: AsyncVoidMock;
    resume: AsyncVoidMock;
    retryJobs: AsyncNumberMock;
    drain: AsyncVoidMock;
  }
>();

vi.mock("@cerniq/worker-shared", () => ({
  getQueuePrefix: () => "cerniq",
  getRedisConnectionOptions: () => ({ host: "localhost", port: 6379, maxRetriesPerRequest: null }),
  isKnownQueueName: (name: string) => ["pipeline:orchestrate", "ingest:csv"].includes(name),
  queueRegistry: [{ name: "pipeline:orchestrate" }, { name: "ingest:csv" }],
}));

vi.mock("bullmq", () => ({
  Queue: class {
    name: string;

    constructor(name: string) {
      this.name = name;
      queueInstances.set(name, {
        pause: vi.fn(async () => undefined),
        resume: vi.fn(async () => undefined),
        retryJobs: vi.fn(async () => 1),
        drain: vi.fn(async () => undefined),
      });
    }

    async getJobCounts() {
      return { waiting: 1, active: 2, completed: 3, failed: 0, delayed: 0 };
    }

    async isPaused() {
      return false;
    }

    async getMetrics() {
      return { data: [10, 8, 12], count: 3, meta: { count: 3, prevTS: 0, prevCount: 0 } };
    }

    async getJobs() {
      return [
        { processedOn: 100, finishedOn: 400 },
        { processedOn: 500, finishedOn: 900 },
      ];
    }

    async pause() {
      return queueInstances.get(this.name)?.pause();
    }

    async resume() {
      return queueInstances.get(this.name)?.resume();
    }

    async retryJobs() {
      return queueInstances.get(this.name)?.retryJobs();
    }

    async drain() {
      return queueInstances.get(this.name)?.drain();
    }
  },
}));

describe("queueMonitor", () => {
  beforeEach(() => {
    queueInstances.clear();
  });

  it("builds queue snapshots from the canonical registry", async () => {
    const { queueMonitor } = await import("./queue-monitor.js");
    const monitor = queueMonitor("redis://localhost:6379/0");

    const data = await monitor.getAllQueues();

    expect(data).toHaveLength(2);
    expect(data[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        waiting: 1,
        active: 2,
        completed: 3,
        throughput: 10,
        latency: 350,
      }),
    );
  });

  it("supports control operations for canonical queue names", async () => {
    const { queueMonitor } = await import("./queue-monitor.js");
    const monitor = queueMonitor("redis://localhost:6379/0");

    await monitor.controlQueue("pipeline:orchestrate", "retry-failed");
    await monitor.controlQueue("pipeline:orchestrate", "drain");

    const instance = queueInstances.get("pipeline:orchestrate");
    expect(instance?.retryJobs).toHaveBeenCalled();
    expect(instance?.drain).toHaveBeenCalled();
  });
});
