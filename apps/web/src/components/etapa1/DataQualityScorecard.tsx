/**
 * Scoruri calitate date din `metadata` companie Gold (best-effort).
 * API-ul poate expune `dataQuality`, `qualityScores`, sau chei `n1`–`n3` în metadata — fără acestea afișăm doar lead score.
 */
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { GaugeChart } from "@/components/charts/GaugeChart.js";
import { cn } from "@/lib/utils.js";

export type DataQualityScorecardProps = Readonly<{
  metadata: Record<string, unknown> | undefined;
  /** Câmp real pe companie Gold */
  leadScore?: number | null;
  className?: string;
}>;

type Triplet = { label: string; value: number; key: string };

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= 1 && n >= 0) return Math.round(n * 100);
  return Math.min(100, Math.max(0, Math.round(n)));
}

function extractFromDataQuality(meta: Record<string, unknown>): Triplet[] {
  const dq = meta.dataQuality;
  if (!dq || typeof dq !== "object") return [];
  const o = dq as Record<string, unknown>;
  const out: Triplet[] = [];
  const c = o.completeness ?? o.completenessScore;
  const a = o.accuracy ?? o.accuracyScore;
  const f = o.freshness ?? o.freshnessScore;
  if (typeof c === "number")
    out.push({ key: "completeness", label: "Completitudine", value: clamp01to100(c) });
  if (typeof a === "number")
    out.push({ key: "accuracy", label: "Acuratețe", value: clamp01to100(a) });
  if (typeof f === "number")
    out.push({ key: "freshness", label: "Prospețime", value: clamp01to100(f) });
  return out;
}

function extractFromQualityScores(meta: Record<string, unknown>): Triplet[] {
  const qs = meta.qualityScores;
  if (!qs || typeof qs !== "object") return [];
  const o = qs as Record<string, unknown>;
  const out: Triplet[] = [];
  for (const label of ["N1", "N2", "N3"] as const) {
    const v = o[label] ?? o[label.toLowerCase()];
    if (typeof v === "number") {
      out.push({ key: label, label: `Tier ${label}`, value: clamp01to100(v) });
    }
  }
  return out;
}

function extractFromNScores(meta: Record<string, unknown>): Triplet[] {
  const out: Triplet[] = [];
  for (const { k, label } of [
    { k: "n1Score", label: "N1" },
    { k: "n2Score", label: "N2" },
    { k: "n3Score", label: "N3" },
  ]) {
    const v = meta[k];
    if (typeof v === "number") {
      out.push({ key: k, label, value: clamp01to100(v) });
    }
  }
  return out;
}

function extractScores(meta: Record<string, unknown>): Triplet[] {
  const fromDq = extractFromDataQuality(meta);
  if (fromDq.length) return fromDq;
  const fromQs = extractFromQualityScores(meta);
  if (fromQs.length) return fromQs;
  return extractFromNScores(meta);
}

export function DataQualityScorecard({
  metadata,
  leadScore,
  className,
}: DataQualityScorecardProps) {
  const meta = metadata ?? {};
  const scores = extractScores(meta);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">Calitate date (metadata)</CardTitle>
        <p className="text-xs text-t3 mt-1">
          Se citesc opțional <code className="font-mono">metadata.dataQuality</code>,{" "}
          <code className="font-mono">metadata.qualityScores</code> sau{" "}
          <code className="font-mono">n1Score</code>… — dacă lipsesc, rămâne doar scorul lead.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {scores.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scores.map((s) => (
              <div
                key={s.key}
                className="flex flex-col items-center rounded-lg border border-[var(--color-s700)] bg-[var(--color-s900)]/80 p-4"
              >
                <GaugeChart value={s.value} size="sm" />
                <p className="mt-2 text-center text-sm font-medium text-t1">{s.label}</p>
                <p className="text-xs text-t3">{s.value}%</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-t3">
            Nu există scoruri structurate în metadata. Completează enrichment-ul sau extinde API-ul
            pentru <code className="font-mono">dataQuality</code>.
          </p>
        )}

        <div className="rounded-lg border border-[var(--color-s700)] p-3">
          <div className="text-xs text-t3">Lead score (câmp Gold)</div>
          <div className="text-2xl font-semibold text-[var(--color-tier-gold)] tabular-nums">
            {leadScore == null || Number.isNaN(Number(leadScore)) ? "—" : Number(leadScore)}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
