/**
 * Gard markdownlint (MD041, MD060, MD040, …) pe fișierele țintă din plan / PR template.
 * Rulează același set ca `pnpm lint:md` (markdownlint-cli2 din devDependencies).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const LITERAL_PATHS = [
  ":.github/PULL_REQUEST_TEMPLATE.md",
  ":README.md",
  ":apps/monitoring-api/README.md",
  ":docs/adr/ADR Etapa 0/ADR-0022-Port-Allocation-Strategy.md",
  ":docs/infrastructure/ci-cd-pipeline.md",
  ":docs/developer-guide/openapi-swagger-parity.md",
  ":docs/developer-guide/supply-chain-dependabot.md",
  ":docs/developer-guide/refine-auth-data-provider.md",
  ":docs/developer-guide/security-sse-brain-token.md",
  ":docs/infrastructure/infra-scripts-inventory.md",
  ":docs/workers/e5-nurturing-python-contract.md",
  ":docs/services/python-sidecars-contract.md",
  ":docs/ui-ux/README.md",
];

describe("markdownlint-cli2 — documentație PR / plan / infra", () => {
  it("0 erori pe setul de fișiere din `pnpm lint:md`", () => {
    const result = spawnSync("pnpm", ["exec", "markdownlint-cli2", ...LITERAL_PATHS], {
      cwd: ROOT,
      encoding: "utf-8",
      shell: false,
    });
    expect(result.error, String(result.error)).toBeUndefined();
    expect(result.status, result.stderr || result.stdout || "markdownlint-cli2").toBe(0);
  });
});
