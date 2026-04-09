/**
 * Punct de intrare plan `e3.test.ts` — agregat E3 (detalii în `e3-schema.test.ts`).
 * Verifică că modulul Drizzle `schemas/e3` exportă setul așteptat de tabele Gold/E3.
 */
import { describe, it, expect } from "vitest";
import * as e3 from "../src/schemas/e3.js";

describe("E3 schema module (aggregate)", () => {
  it("exportă tabelele principale documentate în e3-schema.test.ts", () => {
    expect(e3.goldProducts).toBeDefined();
    expect(e3.goldNegotiations).toBeDefined();
    expect(e3.goldProductCategories).toBeDefined();
    expect(e3.aiConversations).toBeDefined();
  });

  it("are cel puțin 16 exporturi de tabele Drizzle (smoke inventar)", () => {
    const keys = Object.keys(e3).filter((k) => /^[a-z]/.test(k) && !k.startsWith("_"));
    expect(keys.length).toBeGreaterThanOrEqual(16);
  });
});
