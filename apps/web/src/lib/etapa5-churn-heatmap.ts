/**
 * Agregare heatmap churn: rânduri = nivel risc (HIGH→LOW), coloane = județ (top N după volum).
 * Surse: rânduri `GET /churn/factors` (câmpuri reale `judet`, `riskLevel`).
 */
import type { ChurnFactorRow } from "./etapa5-api.js";

export const CHURN_HEATMAP_RISK_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

type HeatmapRiskLevel = (typeof CHURN_HEATMAP_RISK_ORDER)[number];

const HEATMAP_RISK_SET: ReadonlySet<string> = new Set(CHURN_HEATMAP_RISK_ORDER);

function isHeatmapRiskLevel(value: string): value is HeatmapRiskLevel {
  return HEATMAP_RISK_SET.has(value);
}

export type ChurnHeatmapModel = {
  columnKeys: string[];
  rowKeys: readonly string[];
  matrix: number[][];
  maxCell: number;
};

function normalizeJudet(j: string | null | undefined): string {
  const t = (j ?? "").trim();
  return t.length > 0 ? t : "Necunoscut";
}

/** Construiește matricea judet × riskLevel din factori churn (fără date fictive). */
export function buildChurnJudetRiskHeatmap(
  rows: readonly ChurnFactorRow[],
  maxColumns = 10,
): ChurnHeatmapModel {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const judet = normalizeJudet(r.judet);
    const risk = r.riskLevel;
    if (!isHeatmapRiskLevel(risk)) {
      continue;
    }
    const key = `${risk}\t${judet}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const judetTotals = new Map<string, number>();
  for (const r of rows) {
    const judet = normalizeJudet(r.judet);
    judetTotals.set(judet, (judetTotals.get(judet) ?? 0) + 1);
  }

  const columnKeys = [...judetTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([j]) => j)
    .slice(0, maxColumns);

  if (columnKeys.length === 0) {
    return { columnKeys: [], rowKeys: CHURN_HEATMAP_RISK_ORDER, matrix: [], maxCell: 0 };
  }

  const matrix: number[][] = CHURN_HEATMAP_RISK_ORDER.map((risk) =>
    columnKeys.map((judet) => counts.get(`${risk}\t${judet}`) ?? 0),
  );
  let maxCell = 0;
  for (const row of matrix) {
    for (const v of row) {
      if (v > maxCell) maxCell = v;
    }
  }
  return { columnKeys, rowKeys: CHURN_HEATMAP_RISK_ORDER, matrix, maxCell };
}

export function churnCountIntensityColor(value: number, maxCell: number): string {
  if (maxCell <= 0 || value <= 0) return "oklch(0.22 0.02 250)";
  const ratio = value / maxCell;
  if (ratio < 0.25) return "oklch(0.32 0.06 145)";
  if (ratio < 0.5) return "oklch(0.48 0.12 80)";
  if (ratio < 0.75) return "oklch(0.52 0.16 45)";
  return "oklch(0.55 0.2 27)";
}

export function churnCountLabel(value: number, maxCell: number): string {
  if (value <= 0) return "—";
  if (maxCell <= 0) return String(value);
  const ratio = value / maxCell;
  if (ratio < 0.25) return "Scăzut";
  if (ratio < 0.5) return "Mediu";
  if (ratio < 0.75) return "Ridicat";
  return "Max în eșantion";
}
