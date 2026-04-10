import { describe, it, expect, afterEach } from "vitest";
import { Writable } from "node:stream";
import { createServiceLogger } from "./logger.js";

function captureDestination(): { chunks: string[]; dest: Writable } {
  const chunks: string[] = [];
  const dest = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  return { chunks, dest };
}

describe("createServiceLogger", () => {
  afterEach(() => {
    delete process.env.LOG_PRETTY;
  });

  it("redacts nested email paths", async () => {
    process.env.LOG_PRETTY = "false";
    const { chunks, dest } = captureDestination();
    const log = createServiceLogger("test-svc", { destination: dest, level: "debug" });
    log.info({ user: { email: "secret@example.com" } }, "hello");
    await new Promise<void>((r) => setImmediate(r));
    const line = chunks.join("").trim();
    const row = JSON.parse(line) as { user?: { email?: string }; service?: string };
    expect(row.user?.email).toBe("[REDACTED]");
    expect(row.service).toBe("test-svc");
  });

  it("serializer includes cause chain and pg-like fields", async () => {
    process.env.LOG_PRETTY = "false";
    const { chunks, dest } = captureDestination();
    const log = createServiceLogger("test-svc", { destination: dest, level: "debug" });
    const inner = Object.assign(new Error("inner"), {
      code: "23505",
      detail: "key",
      constraint: "uq_x",
    });
    const outer = new Error("outer");
    outer.cause = inner;
    log.error({ err: outer }, "boom");
    await new Promise<void>((r) => setImmediate(r));
    const line = chunks.join("").trim();
    const row = JSON.parse(line) as { err?: { code?: string; cause?: unknown[] } };
    expect(row.err?.code).toBe("23505");
    expect(Array.isArray(row.err?.cause)).toBe(true);
  });
});
