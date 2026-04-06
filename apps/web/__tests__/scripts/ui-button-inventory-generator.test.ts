/**
 * Validează generatorul Python pentru inventar Button/onClick (plan: matrix-buttons-mechanical-json).
 * Rulează în temp — nu modifică JSON-ul din repo la fiecare test.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const repoRoot = join(__dirname, "../../../..");

describe("generate-ui-button-click-inventory.py", () => {
  it("produce JSON valid cu schema așteptată și cel puțin 300 de înregistrări", () => {
    const dir = mkdtempSync(join(tmpdir(), "btn-inv-"));
    const out = join(dir, "out.json");
    try {
      execFileSync(
        "python3",
        [join(repoRoot, "scripts/generate-ui-button-click-inventory.py"), "--output", out],
        { encoding: "utf-8", cwd: repoRoot },
      );
      const raw = readFileSync(out, "utf-8");
      const data = JSON.parse(raw) as {
        schema: string;
        totalMatches: number;
        matches: Array<{
          file: string;
          line: number;
          kind: string;
          snippet: string;
          literal_api_paths_on_line: string[];
          mentions_api_client_method: boolean;
          mentions_navigate: boolean;
          mentions_toast: boolean;
          http_path_resolved: null;
          note: string;
        }>;
      };
      expect(data.schema).toBe("cerniq.ui-button-onclick-inventory.v1");
      expect(Array.isArray(data.matches)).toBe(true);
      expect(data.totalMatches).toBe(data.matches.length);
      expect(data.totalMatches).toBeGreaterThanOrEqual(300);
      const first = data.matches[0];
      expect(first).toMatchObject({
        file: expect.stringContaining("apps/web/src/pages/"),
        line: expect.any(Number),
        kind: expect.stringMatching(/Button_open_tag|onClick_prop/),
        snippet: expect.any(String),
      });
      expect(first?.http_path_resolved).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
