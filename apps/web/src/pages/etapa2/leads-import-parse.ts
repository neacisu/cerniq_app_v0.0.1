import type { OutreachImportLeadRow } from "@/lib/etapa2-api.js";

/** Elimină ghilimele RFC-4180 și dublează ghilimele escapate în interior. */
function stripCsvCellQuotes(cell: string): string {
  const t = cell.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replaceAll('""', '"');
  }
  return t;
}

function splitCsvLine(line: string): string[] {
  const sep = line.includes(";") ? ";" : ",";
  return line.split(sep).map((c) => stripCsvCellQuotes(c));
}

function colIndex(headers: string[], ...candidates: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    for (const c of candidates) {
      if (h === c || h.includes(c)) return i;
    }
  }
  return -1;
}

function buildOutreachRowFromCells(
  line: string,
  idx: { denI: number; emailI: number; telI: number; judI: number; cuiI: number },
): OutreachImportLeadRow | null {
  const cells = splitCsvLine(line);
  const denumire = cells[idx.denI]?.trim();
  if (!denumire) return null;
  const row: OutreachImportLeadRow = { denumire };
  const { emailI, telI, judI, cuiI } = idx;
  if (emailI >= 0 && cells[emailI]?.trim()) row.email = cells[emailI].trim();
  if (telI >= 0 && cells[telI]?.trim()) row.telefon = cells[telI].trim();
  if (judI >= 0 && cells[judI]?.trim()) row.judet = cells[judI].trim();
  if (cuiI >= 0 && cells[cuiI]?.trim()) row.cui = cells[cuiI].trim();
  return row;
}

/** Parse minim: header pe primul rând; coloane: denumire/companie, email, telefon, judet, cui. */
export function parseLeadsCsv(text: string): OutreachImportLeadRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const denI = colIndex(headers, "denumire", "companie", "nume", "company");
  const emailI = colIndex(headers, "email", "mail");
  const telI = colIndex(headers, "telefon", "phone", "tel", "mobil");
  const judI = colIndex(headers, "judet", "județ", "county");
  const cuiI = colIndex(headers, "cui", "cif");
  if (denI < 0) {
    throw new Error("Lipsește coloana denumire / companie în primul rând.");
  }
  const rows: OutreachImportLeadRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = buildOutreachRowFromCells(lines[i], {
      denI,
      emailI,
      telI,
      judI,
      cuiI,
    });
    if (row) rows.push(row);
  }
  return rows;
}
