/**
 * Worker outreach/ai: entrypoint canonic dist/index.js (nu worker.js legacy).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

describe("Dockerfile worker outreach / ai", () => {
  it("CMD rulează dist/index.js", () => {
    const outreach = readFileSync(path.join(ROOT, "workers", "outreach", "Dockerfile"), "utf8");
    const ai = readFileSync(path.join(ROOT, "workers", "ai", "Dockerfile"), "utf8");
    expect(outreach).toMatch(/CMD\s*\[[^\]]*dist\/index\.js/);
    expect(ai).toMatch(/CMD\s*\[[^\]]*dist\/index\.js/);
    expect(outreach).not.toContain("worker.js");
    expect(ai).not.toContain("worker.js");
  });
});
