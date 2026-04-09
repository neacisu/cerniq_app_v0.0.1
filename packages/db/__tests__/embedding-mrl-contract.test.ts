/**
 * Contract MRL halfvec(3072) — Plan FAZA 13 (anti 1536/4096 în codul activ).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbRoot = join(__dirname, "..");

describe("embedding MRL / halfvec(3072) — contract repo", () => {
  it("packages/db/src/schemas/e3.ts — embeddings produse/chunks halfvec(3072)", () => {
    const p = join(dbRoot, "src/schemas/e3.ts");
    const t = readFileSync(p, "utf-8");
    expect(t).toContain('halfvec("embedding", { dimensions: 3072 })');
    expect(t).not.toContain("dimensions: 1536");
    expect(t).not.toContain("dimensions: 4096");
  });

  it("packages/db/src/schemas/gold.ts — ai_embedding halfvec(3072)", () => {
    const p = join(dbRoot, "src/schemas/gold.ts");
    const t = readFileSync(p, "utf-8");
    expect(t).toContain('halfvec("ai_embedding", { dimensions: 3072 })');
  });

  it("0038_e3_sql_functions.sql — query_embedding halfvec(3072), fără vector(1536)", () => {
    const sqlPath = join(dbRoot, "drizzle/0038_e3_sql_functions.sql");
    const content = readFileSync(sqlPath, "utf-8");
    expect(content).toContain("halfvec(3072)");
    expect(content).not.toContain("vector(1536)");
    expect(content).not.toContain("halfvec(4096)");
  });

  it("0056_pgvector_hnsw_plan_params.sql — HNSW m=16, ef_construction=200 pe halfvec", () => {
    const sqlPath = join(dbRoot, "drizzle/0056_pgvector_hnsw_plan_params.sql");
    const content = readFileSync(sqlPath, "utf-8");
    expect(content).toContain("m = 16");
    expect(content).toContain("ef_construction = 200");
    expect(content).toContain("halfvec_cosine_ops");
  });
});
