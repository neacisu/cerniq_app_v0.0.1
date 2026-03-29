import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Brain, CircleCheck, CircleDot, CircleAlert, X } from "lucide-react";
import { api } from "@/lib/api.js";
import type { ApiError } from "@/lib/api.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportBatch = {
  id: string;
  fileName?: string;
  originalName?: string;
  name?: string;
  status: string;
  createdAt: string;
  etapa?: number;
  totalRows?: number;
};

type BatchListResponse = {
  data?: ImportBatch[];
  items?: ImportBatch[];
  total?: number;
};

// ─── Status helpers ───────────────────────────────────────────────────────────

function resolveFileName(b: ImportBatch): string {
  return b.originalName ?? b.fileName ?? b.name ?? b.id.slice(0, 16);
}

function StatusIcon({ status }: Readonly<{ status: string }>) {
  const s = status.toUpperCase();
  if (s === "COMPLETED" || s === "DONE") {
    return <CircleCheck size={13} style={{ color: "var(--color-ok)" }} />;
  }
  if (s === "FAILED" || s === "ERROR") {
    return <CircleAlert size={13} style={{ color: "var(--color-er)" }} />;
  }
  return <CircleDot size={13} style={{ color: "var(--color-in)" }} />;
}

function statusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return "Finalizat";
  if (s === "PROCESSING") return "În curs";
  if (s === "FAILED") return "Eșuat";
  if (s === "PENDING") return "În așteptare";
  return status;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useBatchList() {
  return useQuery({
    queryKey: ["imports", "batch-list"],
    queryFn: async () => {
      const res = await api.get<BatchListResponse>("/api/v1/imports?page=0&limit=30");
      return res.data ?? res.items ?? [];
    },
    staleTime: 30_000,
    retry: (count, err) => {
      const e = err as ApiError;
      if (e && "status" in e && e.status === 401) return false;
      return count < 2;
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BatchSelectorRailProps {
  readonly selectedBatchId: string | null;
  readonly onSelect: (id: string | null) => void;
}

export const BatchSelectorRail = memo(function BatchSelectorRail({
  selectedBatchId,
  onSelect,
}: BatchSelectorRailProps) {
  const [search, setSearch] = useState("");
  const { data: batches, isLoading, error } = useBatchList();

  const filtered = (batches ?? []).filter((b) => {
    const q = search.toLowerCase();
    return resolveFileName(b).toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
  });

  return (
    <aside
      data-testid="batch-selector-rail"
      style={{
        width: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--color-s900)",
        borderRight: "1px solid oklch(0.2 0.018 255 / 60%)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid oklch(0.2 0.018 255 / 40%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Brain size={16} style={{ color: "var(--color-b5)" }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-t1)",
              letterSpacing: "0.04em",
            }}
          >
            Cognitive Brain
          </span>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-t4)",
              pointerEvents: "none",
            }}
          />
          <input
            placeholder="Caută batch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              background: "var(--color-s800)",
              border: "1px solid oklch(0.22 0.018 255 / 50%)",
              borderRadius: 6,
              padding: "5px 8px 5px 26px",
              fontSize: 11,
              color: "var(--color-t1)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Global view option */}
      <button
        onClick={() => onSelect(null)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          background: selectedBatchId === null ? "oklch(0.2 0.025 260 / 50%)" : "transparent",
          border: "none",
          borderBottom: "1px solid oklch(0.2 0.018 255 / 40%)",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        <Brain
          size={13}
          style={{ color: selectedBatchId === null ? "var(--color-b5)" : "var(--color-t3)" }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: selectedBatchId === null ? 700 : 500,
            color: selectedBatchId === null ? "var(--color-t1)" : "var(--color-t2)",
          }}
        >
          Vedere globală
        </span>
        {selectedBatchId === null && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 9,
              color: "var(--color-b5)",
              background: "oklch(0.3 0.06 260 / 30%)",
              borderRadius: 3,
              padding: "1px 5px",
            }}
          >
            ACTIV
          </span>
        )}
      </button>

      {/* Batch list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {isLoading && (
          <div
            style={{
              padding: "20px 16px",
              fontSize: 11,
              color: "var(--color-t4)",
              textAlign: "center",
            }}
          >
            Se încarcă…
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 16px",
              fontSize: 11,
              color: "var(--color-t4)",
            }}
          >
            Istoric indisponibil
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div
            data-testid="batch-empty-state"
            style={{
              padding: "20px 16px",
              fontSize: 11,
              color: "var(--color-t4)",
              textAlign: "center",
            }}
          >
            {search ? "Niciun rezultat" : "Niciun import"}
          </div>
        )}

        {filtered.map((batch) => (
          <BatchItem
            key={batch.id}
            batch={batch}
            selected={selectedBatchId === batch.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Footer — clear selection */}
      {selectedBatchId && (
        <button
          onClick={() => onSelect(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderTop: "1px solid oklch(0.2 0.018 255 / 40%)",
            cursor: "pointer",
            width: "100%",
            fontSize: 11,
            color: "var(--color-t3)",
          }}
        >
          <X size={12} />
          Resetează selecția
        </button>
      )}
    </aside>
  );
});

// ─── BatchItem ────────────────────────────────────────────────────────────────

interface BatchItemProps {
  readonly batch: ImportBatch;
  readonly selected: boolean;
  readonly onSelect: (id: string) => void;
}

function BatchItem({ batch, selected, onSelect }: BatchItemProps) {
  const name = resolveFileName(batch);
  const date = new Date(batch.createdAt);

  return (
    <button
      data-testid={`batch-item-${batch.id}`}
      onClick={() => onSelect(batch.id)}
      style={{
        display: "block",
        width: "100%",
        padding: "9px 16px",
        background: selected ? "oklch(0.2 0.025 260 / 50%)" : "transparent",
        border: "none",
        borderBottom: "1px solid oklch(0.17 0.015 255 / 40%)",
        borderLeft: selected ? "2px solid var(--color-b5)" : "2px solid transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {/* Status row */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
        <StatusIcon status={batch.status} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: selected ? "var(--color-t1)" : "var(--color-t2)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {name.length > 28 ? `${name.slice(0, 28)}…` : name}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9.5, color: "var(--color-t4)" }}>{statusLabel(batch.status)}</span>
        <span style={{ fontSize: 9.5, color: "var(--color-t4)" }}>
          {date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}
        </span>
      </div>

      {batch.totalRows !== undefined && (
        <div style={{ fontSize: 9, color: "var(--color-t4)", marginTop: 1 }}>
          {batch.totalRows.toLocaleString()} rânduri
        </div>
      )}
    </button>
  );
}
