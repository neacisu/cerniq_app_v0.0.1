/**
 * Aliniere documentație ↔ deploy.yml: trigger, smoke, Trivy, rollback.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe(".github/workflows/deploy.yml — contract smoke și CD", () => {
  it("declară workflow_dispatch, joburi deploy-staging/deploy-production, smoke și rollback", () => {
    const yml = readFileSync(path.join(ROOT, ".github/workflows/deploy.yml"), "utf-8");
    expect(yml).toMatch(/^\s*workflow_dispatch:\s*$/m);
    expect(yml).not.toMatch(/^\s*push:\s*$/m);
    expect(yml).toContain("deploy-staging:");
    expect(yml).toContain("deploy-production:");
    expect(yml).toContain("rollback:");
    expect(yml).toContain("Verify Staging Deployment (Smoke Tests)");
    expect(yml).toContain("Verify Production Deployment (Smoke Tests)");
    expect(yml).toContain("--exit-code 1");
    expect(yml).toContain("trivy image");
    expect(yml).toContain("aquasecurity/setup-trivy@v0.2.6");
    expect(yml).toContain(".previous_deploy");
  });
});
