import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("drizzle meta _journal.json", () => {
  it("are numărul de migrații din fișierul real _journal.json (idx consecutiv de la 0)", () => {
    const raw = readFileSync(join(__dirname, "../drizzle/meta/_journal.json"), "utf8");
    const j = JSON.parse(raw) as { entries: { idx: number }[] };
    const { entries } = j;
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.idx).toBe(0);
    expect(entries.at(-1)?.idx).toBe(entries.length - 1);
    for (let i = 0; i < entries.length; i++) {
      expect(entries[i]?.idx).toBe(i);
    }
  });
});
