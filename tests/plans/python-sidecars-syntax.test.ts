/**
 * Guard plan `services-python-sidecars-contract`: fișierele `main.py` din serviciile
 * Python sidecar se compilează cu python3 (fără dependențe runtime instalate în CI
 * pentru FastAPI — doar verificare sintaxă).
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const SERVICES = ["python-mcp", "python-document", "python-graph", "python-pdf"] as const;

describe("services/python-* — sintaxă main.py", () => {
  for (const svc of SERVICES) {
    it(`${svc}/main.py compilează cu python3 -m py_compile`, () => {
      const file = path.join(ROOT, "services", svc, "main.py");
      expect(() => {
        execFileSync("python3", ["-m", "py_compile", file], {
          stdio: "pipe",
          encoding: "utf8",
        });
      }).not.toThrow();
    });
  }
});
