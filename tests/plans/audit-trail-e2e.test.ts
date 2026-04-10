import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "../..");

/**
 * Smoke contract F8: ruta publică client-errors e înregistrată și scutită de JWT în tenant-context.
 * Integrare HTTP completă → apps/api/__tests__/client-errors-route.test.ts.
 */
describe("audit trail / client-errors (contract monorepo)", () => {
  it("tenant-context marchează POST /api/v1/errors/client ca rută publică", () => {
    const p = path.join(REPO, "apps/api/src/plugins/tenant-context.ts");
    const src = readFileSync(p, "utf-8");
    expect(src).toContain('"/api/v1/errors/client"');
  });

  it("registerRoutes include clientErrorsRoutes sub prefix /api/v1", () => {
    const p = path.join(REPO, "apps/api/src/routes/index.ts");
    const src = readFileSync(p, "utf-8");
    expect(src).toContain("clientErrorsRoutes");
    expect(src).toContain('prefix: "/api/v1"');
    expect(src).toContain("await app.register(clientErrorsRoutes");
  });
});
