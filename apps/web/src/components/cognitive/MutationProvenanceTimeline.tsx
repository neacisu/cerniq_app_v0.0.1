import { memo } from "react";
import type { DataMutationRecord } from "@cerniq/shared";

// ─── Intent accent colors ──────────────────────────────────────────────────────

const INTENT_COLORS: Record<string, string> = {
  CREATE: "var(--color-ok)",
  UPDATE: "var(--color-b5)",
  ENRICH: "var(--color-in)",
  PROMOTE: "var(--color-tier-gold)",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MutationProvenanceTimelineProps {
  readonly mutations: DataMutationRecord[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MutationProvenanceTimeline = memo(function MutationProvenanceTimeline({
  mutations,
}: MutationProvenanceTimelineProps) {
  if (mutations.length === 0) {
    return (
      <div
        data-testid="mutation-timeline-empty"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
          fontSize: 12,
          color: "var(--color-t4)",
        }}
      >
        Nicio mutație înregistrată
      </div>
    );
  }

  return (
    <div
      data-testid="mutation-timeline"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {mutations.map((m, i) => (
        <MutationCard key={`${m.batchId}-${m.entityId}-${m.timestamp}-${i}`} mutation={m} />
      ))}
    </div>
  );
});

// ─── Single mutation card ─────────────────────────────────────────────────────

interface MutationCardProps {
  readonly mutation: DataMutationRecord;
}

function MutationCard({ mutation: m }: MutationCardProps) {
  const accent = INTENT_COLORS[m.mutationIntent] ?? "var(--color-t3)";
  const ts = new Date(m.timestamp);

  return (
    <div
      data-testid="mutation-card"
      style={{
        background: "oklch(0.14 0.018 255 / 60%)",
        border: `1px solid oklch(0.22 0.018 255 / 50%)`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 7,
        padding: "9px 12px",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {m.mutationIntent}
        </span>
        <span style={{ fontSize: 10, color: "var(--color-t4)" }}>
          {ts.toLocaleTimeString("ro-RO")}
        </span>
      </div>

      {/* Entity ID */}
      <div
        style={{
          fontSize: 11,
          color: "var(--color-t2)",
          fontFamily: "var(--font-mono)",
          marginBottom: 4,
        }}
      >
        {m.entityId.length > 24 ? `${m.entityId.slice(0, 24)}…` : m.entityId}
      </div>

      {/* Changed fields */}
      {m.changedFields && m.changedFields.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
          {m.changedFields.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 9.5,
                background: "oklch(0.2 0.015 255)",
                color: "var(--color-t3)",
                borderRadius: 3,
                padding: "1px 5px",
                fontFamily: "var(--font-mono)",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Trace ID */}
      {m.traceId && (
        <div
          style={{
            fontSize: 10,
            color: "var(--color-t4)",
            marginTop: 4,
            fontFamily: "var(--font-mono)",
          }}
        >
          trace: {m.traceId.slice(0, 20)}…
        </div>
      )}
    </div>
  );
}
