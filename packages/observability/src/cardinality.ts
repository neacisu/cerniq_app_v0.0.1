import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Lungime maximă sigură pentru valori de label Prometheus (evită serii uriașe / payload). */
export const PROM_LABEL_VALUE_MAX_LEN = 256;

const allowlistPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "http-metric-label-allowlist.json",
);

/**
 * Listă albă: nume metrică → label-uri permise (în `apps/api/src/plugins/metrics.ts`).
 * Fișier: `http-metric-label-allowlist.json` lângă acest modul (copiat în `dist/` la build).
 */
export const CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST = JSON.parse(
  readFileSync(allowlistPath, "utf8"),
) as Readonly<Record<string, readonly string[]>>;

/**
 * Verifică că lista de label-uri declarate în cod este subset al allowlist-ului pentru metrica dată.
 */
export function assertHttpMetricLabelsAllowed(
  metricName: string,
  labelNames: readonly string[],
): void {
  const allowed = CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST[metricName];
  if (!allowed) return;
  const bad = labelNames.filter((l) => !allowed.includes(l));
  if (bad.length > 0) {
    throw new Error(
      `Metrică ${metricName}: label-uri nepermise [${bad.join(", ")}]. Actualizare intenționată: extinde CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST + audit CI.`,
    );
  }
}

/**
 * Trunchiere deterministă pentru valori de label (fără hash — predictibil la debugging).
 */
export function clampPromLabelValue(value: string, maxLen = PROM_LABEL_VALUE_MAX_LEN): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 3))}...`;
}
