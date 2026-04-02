/**
 * contract-generator.ts — Generator contracte DOCX → PDF
 *
 * Pipeline (Plan FAZA 8f, anti-halucinare B):
 *   1. Descarcă template DOCX din templateDocxUrl (HTTP sau local)
 *   2. Completează template cu docx-templates (Jinja2-like syntax în DOCX)
 *   3. Scrie DOCX temporar în /tmp
 *   4. Conversie DOCX → PDF cu LibreOffice headless (soffice --headless)
 *      — sincron, durată ~2-5s, timeout worker 30s (anti-halucinare D)
 *   5. Salvare PDF în /LocalStorage/contracts/ (viitor: S3)
 *
 * Anti-halucinare B: NU generăm text inventat — TREBUIE template DOCX predefinit.
 * Template-urile sunt stocate cu URL în gold_contract_templates.template_docx_url.
 *
 * Template variables disponibile (completate de G32):
 *   {clientName}, {cui}, {address}, {orderNumber}, {creditLimit},
 *   {riskTier}, {validForDays}, {contractDate}, {clauses} (array)
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import createReport from "docx-templates";

// ---------------------------------------------------------------------------
// Constante stocare locală
// ---------------------------------------------------------------------------

export const LOCAL_CONTRACTS_DIR = process.env["LOCAL_STORAGE_PATH"]
  ? join(process.env["LOCAL_STORAGE_PATH"], "contracts")
  : "/LocalStorage/contracts";

const SOFFICE_TIMEOUT_MS = 28_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export type ContractTemplateVariables = {
  clientName: string;
  cui: string;
  address: string;
  orderNumber: string;
  creditLimit: number;
  riskTier: string;
  validForDays: number;
  contractDate: string;
  clauses: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true, mode: 0o750 });
  }
}

/**
 * Descarcă template DOCX din URL (HTTP/HTTPS) sau îl citește din cale locală.
 */
async function fetchTemplateDocx(templateDocxUrl: string): Promise<Buffer> {
  if (templateDocxUrl.startsWith("http://") || templateDocxUrl.startsWith("https://")) {
    const response = await fetch(templateDocxUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(
        `[contract-generator] Failed to fetch template: ${response.status} ${templateDocxUrl}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Cale locală (dev / test)
  return readFile(templateDocxUrl);
}

/**
 * Conversie DOCX → PDF cu LibreOffice headless.
 * Returneaza calea fișierului PDF generat.
 * Anti-halucinare D: proces sincron, timeout 28s.
 */
async function convertDocxToPdf(docxPath: string, outputDir: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(
      "soffice",
      ["--headless", "--convert-to", "pdf", "--outdir", outputDir, docxPath],
      { timeout: SOFFICE_TIMEOUT_MS },
    );

    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`[contract-generator] soffice exited with code ${code}: ${stderr}`));
        return;
      }
      // soffice generează fișierul cu același basename dar extensia .pdf
      const pdfName = basename(docxPath).replace(/\.docx$/i, ".pdf");
      const pdfPath = join(outputDir, pdfName);
      resolve(pdfPath);
    });

    proc.on("error", (err) => {
      reject(new Error(`[contract-generator] soffice spawn error: ${err.message}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Funcție publică principală
// ---------------------------------------------------------------------------

/**
 * Generează PDF contract dintr-un template DOCX și variabile.
 *
 * @returns Calea locală a PDF-ului generat + Buffer conținut.
 */
export async function generateContractPdf(
  templateDocxUrl: string,
  variables: ContractTemplateVariables,
  contractId: string,
): Promise<{ pdfPath: string; pdfBuffer: Buffer; pdfUrl: string }> {
  await ensureDir(LOCAL_CONTRACTS_DIR);

  const runId = randomUUID();
  const tmpDocxPath = join(tmpdir(), `contract-${runId}.docx`);
  const tmpPdfDir = tmpdir();

  // 1. Descarcă template DOCX
  const templateBuffer = await fetchTemplateDocx(templateDocxUrl);

  // 2. Completează template cu docx-templates
  const filledDocxBuffer = await createReport({
    template: templateBuffer,
    data: variables,
    cmdDelimiter: ["{{", "}}"],
  });

  // 3. Scrie DOCX temporar
  await writeFile(tmpDocxPath, filledDocxBuffer as Buffer);

  let tmpPdfPath: string | null = null;

  try {
    // 4. Conversie DOCX → PDF
    tmpPdfPath = await convertDocxToPdf(tmpDocxPath, tmpPdfDir);

    // 5. Citește PDF-ul generat
    const pdfBuffer = await readFile(tmpPdfPath);

    // 6. Salvează în /LocalStorage/contracts/
    const pdfFileName = `contract-${contractId}.pdf`;
    const finalPdfPath = join(LOCAL_CONTRACTS_DIR, pdfFileName);
    await writeFile(finalPdfPath, pdfBuffer);

    // URL local (relativ la baza /LocalStorage)
    const pdfUrl = `/LocalStorage/contracts/${pdfFileName}`;

    return { pdfPath: finalPdfPath, pdfBuffer, pdfUrl };
  } finally {
    // Cleanup fișiere temporare
    await unlink(tmpDocxPath).catch(() => undefined);
    if (tmpPdfPath) {
      await unlink(tmpPdfPath).catch(() => undefined);
    }
  }
}

/**
 * Salvează PDF semnat DocuSign în /LocalStorage/contracts/signed/
 */
export async function storeSignedContractPdf(
  pdfBuffer: Buffer,
  contractId: string,
): Promise<{ pdfPath: string; pdfUrl: string }> {
  const signedDir = join(LOCAL_CONTRACTS_DIR, "signed");
  await ensureDir(signedDir);

  const pdfFileName = `contract-${contractId}-signed.pdf`;
  const pdfPath = join(signedDir, pdfFileName);
  await writeFile(pdfPath, pdfBuffer);

  const pdfUrl = `/LocalStorage/contracts/signed/${pdfFileName}`;
  return { pdfPath, pdfUrl };
}

/**
 * Citește un PDF stocat local ca Buffer (pentru upload DocuSign G34).
 */
export async function readContractPdf(pdfPath: string): Promise<Buffer> {
  if (pdfPath.startsWith("/LocalStorage/") || pdfPath.startsWith("./") || pdfPath.startsWith("/")) {
    return readFile(pdfPath);
  }
  // Dacă URL local, construiește calea absolută
  const relativePath = pdfPath.replace(/^\/LocalStorage\//, "/LocalStorage/");
  return readFile(relativePath);
}
