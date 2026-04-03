/**
 * ouai-scraper.ts — Node.js → Python3 subprocess bridge pentru PDF Scraping OUAI/MADR (Plan §X FAZA 9g)
 *
 * Protocol:
 *   - Input: fișier JSON temporar cu { pdf_path: "..." }
 *   - Output: fișier JSON temporar cu { entries, error, total_pages }
 *   - Subprocess: python3 workers/e5-nurturing/python/pdf_scraper.py
 *
 * Anti-halucin. FAZA 9g:
 *   (A) PDF scraping via pdfplumber — NU Node.js PDF parsing
 *   (B) Python3 subprocess cu JSON I/O — pattern identic leiden-client.ts
 *   (C) Timeout 660_000ms (600s + 60s buffer) — enforced la nivel subprocess
 *   (D) Temp files cu prefix unic per job — fără coliziuni la concurrency=1
 *
 * Edge cases gestionate:
 *   - stderr Python → logat, nu suprimat
 *   - exit code != 0 → Error cu codul și stderr
 *   - Timeout subprocess → process.kill(SIGKILL) + Error
 *   - Fișiere tmp cleanup în finally (unlink cu allSettled)
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const PDF_SCRAPER_SCRIPT = join(process.cwd(), "workers/e5-nurturing/python/pdf_scraper.py");

// ---------------------------------------------------------------------------
// Tipuri publice
// ---------------------------------------------------------------------------

export interface OuaiEntry {
  ouai_name: string;
  county: string;
  net_area_ha: number;
  hydroamelioration_name?: string;
  page_number?: number;
}

export interface MadrEntry {
  name: string;
  county: string;
  cui?: string;
  association_type: "OUAI" | "COOPERATIVE" | "PRODUCER_GROUP" | "OTHER";
  declared_area_ha?: number;
}

export interface PdfScrapeResult {
  entries: OuaiEntry[] | MadrEntry[];
  error: string | null;
  total_pages: number;
}

export interface OuaiScraperOptions {
  /** Timeout subprocess Python în milisecunde (default: 660_000 = 600s + 60s buffer) */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Funcție helper: fișiere temporare unice
// ---------------------------------------------------------------------------

function makeTmpPaths(label: string): { inputPath: string; outputPath: string } {
  const uid = randomUUID();
  const base = join(tmpdir(), `cerniq_ouai_${label}_${uid}`);
  return {
    inputPath: `${base}_input.json`,
    outputPath: `${base}_output.json`,
  };
}

async function cleanupTmpFiles(...paths: string[]): Promise<void> {
  await Promise.allSettled(paths.map((p) => fs.unlink(p)));
}

// ---------------------------------------------------------------------------
// Funcție internă: spawn Python subprocess
// ---------------------------------------------------------------------------

async function runPythonSubprocess(
  action: "ouai" | "madr",
  inputPath: string,
  outputPath: string,
  options: OuaiScraperOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 660_000;

  const args: string[] = [
    PDF_SCRAPER_SCRIPT,
    "--action",
    action,
    "--input",
    inputPath,
    "--output",
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const stderrChunks: Buffer[] = [];
    let killed = false;

    const proc = spawn("python3", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGKILL");
      reject(
        new Error(
          `[ouai-scraper] Python subprocess timeout after ${timeoutMs}ms (action=${action})`,
        ),
      );
    }, timeoutMs);

    proc.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (!killed) {
        reject(
          new Error(
            `[ouai-scraper] Failed to spawn python3 (action=${action}): ${err.message}. ` +
              `Ensure python3 is installed and pdf_scraper.py is at ${PDF_SCRAPER_SCRIPT}`,
            { cause: err },
          ),
        );
      }
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (killed) return;

      const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();
      if (stderr) {
        console.warn(`[ouai-scraper] Python stderr (action=${action}):\n${stderr}`);
      }

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `[ouai-scraper] Python subprocess exited with code ${code ?? "null"} (action=${action})` +
              (stderr ? `\nStderr: ${stderr.slice(0, 500)}` : ""),
          ),
        );
      }
    });
  });
}

// ---------------------------------------------------------------------------
// API PUBLIC: runPdfScrape
// ---------------------------------------------------------------------------

/**
 * runPdfScrape — Rulează pdf_scraper.py ca subprocess Python3.
 *
 * @param action - "ouai" sau "madr"
 * @param pdfPath - Calea absolută la fișierul PDF descărcat
 * @param options - Opțiuni timeout
 * @returns PdfScrapeResult cu entries, error, total_pages
 */
export async function runPdfScrape(
  action: "ouai" | "madr",
  pdfPath: string,
  options: OuaiScraperOptions = {},
): Promise<PdfScrapeResult> {
  const { inputPath, outputPath } = makeTmpPaths(action);

  try {
    await fs.writeFile(inputPath, JSON.stringify({ pdf_path: pdfPath }), "utf-8");
    await runPythonSubprocess(action, inputPath, outputPath, options);
    const raw = await fs.readFile(outputPath, "utf-8");
    return JSON.parse(raw) as PdfScrapeResult;
  } finally {
    await cleanupTmpFiles(inputPath, outputPath);
  }
}
