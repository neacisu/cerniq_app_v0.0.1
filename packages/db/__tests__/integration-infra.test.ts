import { afterAll, describe, expect, it } from "vitest";
import { Queue, QueueEvents, Worker } from "bullmq";
import { runAllMigrations, closeMigrationDb } from "../src/migrate.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const hasRedis = Boolean(process.env.REDIS_URL);

const baselineTargets = {
  bronzeInsertsPerSecond: 1000,
  silverEnrichmentsPerSecond: 100,
} as const;

describe("S1.PR8 - Integration test infrastructure", () => {
  it("expune baseline-urile de performanta pentru sprintul 1", () => {
    expect(baselineTargets.bronzeInsertsPerSecond).toBe(1000);
    expect(baselineTargets.silverEnrichmentsPerSecond).toBe(100);
  });
});

describe.skipIf(!hasDatabase)("S1.PR8 - Migrations integration (DB required)", () => {
  afterAll(async () => {
    await closeMigrationDb();
  });

  it("ruleaza migrarile in mod dry-run fara erori", async () => {
    await expect(runAllMigrations({ dryRun: true })).resolves.toBeUndefined();
  });

  it("ruleaza migrarile in mod rollback fara a persista modificarile", async () => {
    await expect(runAllMigrations({ rollback: true })).resolves.toBeUndefined();
  });
});

describe.skipIf(!hasRedis)("S1.PR8 - BullMQ integration (Redis required)", () => {
  const queueName = `s1-pr8-integration-${Date.now()}`;
  const redisUrl = process.env.REDIS_URL as string;
  const connection = {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
  const queue = new Queue<{ input: number }, { doubled: number }, "double-number">(queueName, {
    connection,
  });
  const events = new QueueEvents(queueName, { connection });
  const worker = new Worker<{ input: number }, { doubled: number }, "double-number">(
    queueName,
    async (job) => ({ doubled: job.data.input * 2 }),
    { connection },
  );

  afterAll(async () => {
    await worker.close();
    await events.close();
    await queue.obliterate({ force: true });
    await queue.close();
  });

  it("proceseaza un job complet (enqueue -> process -> complete)", async () => {
    await events.waitUntilReady();
    await worker.waitUntilReady();

    const completed = new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("BullMQ integration timeout")), 15_000);
      const onCompleted = (args: { jobId: string; returnvalue: string }) => {
        clearTimeout(timeout);
        events.off("completed", onCompleted);
        const parsed = JSON.parse(args.returnvalue) as { doubled: number };
        resolve(parsed.doubled);
      };
      events.on("completed", onCompleted);
    });

    await queue.add("double-number", { input: 21 });
    await expect(completed).resolves.toBe(42);
  });
});
