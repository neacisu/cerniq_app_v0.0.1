/**
 * Contract UI pentru rândurile `silver_enrichment_log` (GET /api/v1/silver/enrichment-log).
 * Câmpurile reflectă schema Drizzle din `packages/db/src/schemas/silver.ts` și inserările din
 * `workers/enrichment` (ex. `logEnrichmentAudit` — status implicit `success`).
 */

/** Valori întâlnite în codul worker; coloana DB este varchar — orice alt string rămâne afișat ca atare. */
export const SILVER_ENRICHMENT_LOG_STATUSES_KNOWN = ["success", "failed", "skipped"] as const;
export type SilverEnrichmentLogKnownStatus = (typeof SILVER_ENRICHMENT_LOG_STATUSES_KNOWN)[number];

export function isSilverEnrichmentLogKnownStatus(s: string): s is SilverEnrichmentLogKnownStatus {
  return (SILVER_ENRICHMENT_LOG_STATUSES_KNOWN as readonly string[]).includes(s);
}

/**
 * Variantă Badge aliniată semantic la statusul din DB (nu etichete UI inventate).
 */
export function enrichmentLogStatusBadgeVariant(
  status: string | null | undefined,
): "brand" | "warning" | "error" | "info" | "neutral" {
  const s = (status ?? "").toLowerCase();
  if (s === "success") return "brand";
  if (s === "failed") return "error";
  if (s === "skipped") return "info";
  if (!status) return "neutral";
  return "neutral";
}

export type SilverEnrichmentLogRowView = Readonly<{
  id: string;
  createdAt?: string;
  entityId?: string;
  entityType?: string;
  /** Coloana DB `operation` (nu „stepName”). */
  operation: string;
  status: string;
  source?: string;
  jobId?: string | null;
  errorMessage?: string | null;
  /** Rezumat audit: preferă `responsePayload`, altfel `requestPayload`. */
  details: unknown;
}>;

export function mapSilverEnrichmentLogApiRow(
  raw: Record<string, unknown>,
): SilverEnrichmentLogRowView {
  const statusRaw = raw.status;
  const status = typeof statusRaw === "string" && statusRaw.length > 0 ? statusRaw : "unknown";

  return {
    id: String(raw.id ?? ""),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    entityId: typeof raw.entityId === "string" ? raw.entityId : undefined,
    entityType: typeof raw.entityType === "string" ? raw.entityType : undefined,
    operation: typeof raw.operation === "string" ? raw.operation : "—",
    status,
    source: typeof raw.source === "string" ? raw.source : undefined,
    jobId: raw.jobId != null && raw.jobId !== "" ? String(raw.jobId) : null,
    errorMessage: typeof raw.errorMessage === "string" ? raw.errorMessage : null,
    details: raw.responsePayload ?? raw.requestPayload ?? null,
  };
}
