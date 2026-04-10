/**
 * A4 API poller: fără contoare OTel duplicate față de createWorker (Prometheus).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const A4 = path.join(ROOT, "workers", "enrichment", "src", "workers", "a4-api-poller.ts");

describe("a4-api-poller — metrici", () => {
  it("nu importă și nu incrementează worker-metrics OTel (jobsProcessed / jobDuration / jobErrors)", () => {
    const s = readFileSync(A4, "utf8");
    expect(s).not.toContain('from "../lib/worker-metrics.js"');
    expect(s).not.toContain("jobsProcessed.add");
    expect(s).not.toContain("jobDuration.record");
    expect(s).not.toContain("jobErrors.add");
    expect(s).not.toContain("jobsFailed.add");
  });
});
