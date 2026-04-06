/**
 * Paritate `workers-e5-python-leiden-contract`: requirements.txt listează pachetele
 * importate de leiden_service.py și pdf_scraper.py (fără a rula pip).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REQ = path.join(__dirname, "../../workers/e5-nurturing/python/requirements.txt");

describe("workers/e5-nurturing/python — requirements.txt", () => {
  it("conține dependențele pentru leiden_service.py și pdf_scraper.py", () => {
    const raw = readFileSync(REQ, "utf8");
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    const names = lines.map((l) => l.split(/[>=<]/)[0]?.trim().toLowerCase() ?? "");
    for (const pkg of ["python-igraph", "cdlib", "leidenalg", "networkx", "numpy", "pdfplumber"]) {
      expect(names, `lipsește ${pkg}`).toContain(pkg.toLowerCase());
    }
  });
});
