import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("drizzle meta _journal.json", () => {
  it("are numărul de migrații așteptat (idx 0..69 = 70 intrări)", () => {
    const raw = readFileSync(join(__dirname, "../drizzle/meta/_journal.json"), "utf8");
    const j = JSON.parse(raw) as { entries: { idx: number }[] };
    expect(j.entries).toHaveLength(70);
    expect(j.entries[0]?.idx).toBe(0);
    expect(j.entries[69]?.idx).toBe(69);
  });
});
