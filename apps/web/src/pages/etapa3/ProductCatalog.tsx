/**
 * ProductCatalog — E3 Product Knowledge Base
 *
 * Hybrid search: vector (qwen3-embedding-8b 4096-dim) + BM25 (Romanian tsvector) + RRF fusion
 * Embedding status: per produs (current / indexing / stale / error)
 * Plan: §XII L9477 — "hybrid search + embeddings status"
 * Workers: A1-A6 (product knowledge), B7-B12 (hybrid search)
 */
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Input } from "@/components/ui/input.js";
import { SBadge } from "@/components/ui/badge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { Search, Package, Cpu, AlertTriangle, CheckCircle2, Clock, Filter } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmbeddingStatus = "CURRENT" | "INDEXING" | "STALE" | "ERROR";
type ProductStatus = "ACTIVE" | "DRAFT" | "DISCONTINUED" | "OUT_OF_STOCK";
type SearchMode = "hybrid" | "vector" | "bm25";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  stock: number;
  status: ProductStatus;
  embeddingStatus: EmbeddingStatus;
  embeddingDim: number;
  chunkCount: number;
  lastIndexed: string;
  maxDiscount: number;
  score?: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p-001",
    sku: "SEM-GR-2026-001",
    name: "Semințe Grâu PREMIUM Sorin F1",
    category: "Semințe / Grâu",
    unitPrice: 280,
    stock: 1240,
    status: "ACTIVE",
    embeddingStatus: "CURRENT",
    embeddingDim: 4096,
    chunkCount: 8,
    lastIndexed: "2026-04-01T08:30:00Z",
    maxDiscount: 15,
    score: 0.94,
  },
  {
    id: "p-002",
    sku: "SEM-FL-2026-002",
    name: "Semințe Floarea-Soarelui HiSun X12",
    category: "Semințe / Floarea-Soarelui",
    unitPrice: 320,
    stock: 890,
    status: "ACTIVE",
    embeddingStatus: "CURRENT",
    embeddingDim: 4096,
    chunkCount: 6,
    lastIndexed: "2026-04-01T08:30:00Z",
    maxDiscount: 12,
    score: 0.87,
  },
  {
    id: "p-003",
    sku: "FER-NPK-2026-003",
    name: "Îngrășământ NPK 15-15-15 Complex",
    category: "Îngrășăminte / NPK",
    unitPrice: 95,
    stock: 3200,
    status: "ACTIVE",
    embeddingStatus: "INDEXING",
    embeddingDim: 4096,
    chunkCount: 0,
    lastIndexed: "în curs...",
    maxDiscount: 20,
    score: 0.73,
  },
  {
    id: "p-004",
    sku: "PEST-FUN-2026-004",
    name: "Fungicid Topsin M 70 WP",
    category: "Pesticide / Fungicide",
    unitPrice: 185,
    stock: 0,
    status: "OUT_OF_STOCK",
    embeddingStatus: "STALE",
    embeddingDim: 4096,
    chunkCount: 5,
    lastIndexed: "2026-02-15T10:00:00Z",
    maxDiscount: 10,
    score: 0.61,
  },
  {
    id: "p-005",
    sku: "SEM-PB-2026-005",
    name: "Semințe Porumb Daciana 350 FAO",
    category: "Semințe / Porumb",
    unitPrice: 420,
    stock: 560,
    status: "ACTIVE",
    embeddingStatus: "ERROR",
    embeddingDim: 0,
    chunkCount: 0,
    lastIndexed: "EROARE",
    maxDiscount: 18,
    score: undefined,
  },
  {
    id: "p-006",
    sku: "FER-UREA-2026-006",
    name: "Uree Granulată 46% Azot",
    category: "Îngrășăminte / Azotoase",
    unitPrice: 78,
    stock: 5400,
    status: "ACTIVE",
    embeddingStatus: "CURRENT",
    embeddingDim: 4096,
    chunkCount: 4,
    lastIndexed: "2026-04-02T14:00:00Z",
    maxDiscount: 25,
    score: 0.68,
  },
];

// ─── Pure helpers (Sonar: fără ternare imbricate; logică reutilizabilă / testabilă) ─

function searchModeButtonLabel(m: SearchMode): string {
  if (m === "hybrid") return "Hybrid (RRF)";
  if (m === "vector") return "Vector";
  return "BM25";
}

function adjustedScoreForMode(
  mode: SearchMode,
  vectorScore: number,
  bm25Score: number,
  hybridScore: number,
): number {
  if (mode === "vector") return vectorScore;
  if (mode === "bm25") return bm25Score;
  return hybridScore;
}

function searchModeSummaryLabel(mode: SearchMode): string {
  if (mode === "hybrid") return "RRF(60%v+40%BM25)";
  if (mode === "vector") return "vector cosine";
  return "BM25 romanian";
}

function stockDisplayColor(stock: number): string {
  if (stock === 0) return "var(--color-er)";
  if (stock < 100) return "var(--color-wa)";
  return "var(--color-ok)";
}

function scoreDisplayColor(score: number): string {
  if (score > 0.8) return "var(--color-ok)";
  if (score > 0.6) return "var(--color-wa)";
  return "var(--color-t3)";
}

// ─── Embedding Status Badge ────────────────────────────────────────────────────

interface EmbeddingBadgeProps {
  readonly status: EmbeddingStatus;
  readonly dim: number;
}

function EmbeddingBadge({ status, dim }: EmbeddingBadgeProps) {
  const config = {
    CURRENT: { color: "var(--color-ok)", icon: CheckCircle2, label: `✓ ${dim}d` },
    INDEXING: { color: "var(--color-wa)", icon: Cpu, label: "indexing..." },
    STALE: { color: "var(--color-wa)", icon: Clock, label: "stale" },
    ERROR: { color: "var(--color-er)", icon: AlertTriangle, label: "ERR" },
  };
  const cfg = config[status];
  const Icon = cfg.icon;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 6px",
        background: `color-mix(in oklch, ${cfg.color} 12%, transparent)`,
        border: `1px solid color-mix(in oklch, ${cfg.color} 35%, transparent)`,
        borderRadius: 4,
        fontSize: 9.5,
        color: cfg.color,
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
      }}
    >
      <Icon size={9} strokeWidth={2.5} />
      {cfg.label}
    </div>
  );
}

// ─── Search Mode Toggle ───────────────────────────────────────────────────────

interface SearchModeToggleProps {
  readonly mode: SearchMode;
  readonly onChange: (m: SearchMode) => void;
}

function SearchModeToggle({ mode, onChange }: SearchModeToggleProps) {
  return (
    <div
      style={{
        display: "flex",
        border: "1px solid var(--color-s700)",
        borderRadius: 6,
        overflow: "hidden",
        fontSize: 11,
      }}
    >
      {(["hybrid", "vector", "bm25"] as SearchMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: "4px 10px",
            background: mode === m ? "var(--color-s700)" : "transparent",
            border: "none",
            color: mode === m ? "var(--color-t1)" : "var(--color-t3)",
            cursor: "pointer",
            fontWeight: mode === m ? 600 : 400,
            fontSize: 11,
            transition: "background 0.15s",
          }}
        >
          {searchModeButtonLabel(m)}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProductCatalog() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const categories = [
    "all",
    ...Array.from(new Set(MOCK_PRODUCTS.map((p) => p.category.split("/")[0].trim()))),
  ];

  const filtered = MOCK_PRODUCTS.filter((p) => {
    const matchQuery =
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category.startsWith(categoryFilter);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchQuery && matchCat && matchStatus;
  })
    .map((p) => {
      // Simulare scoring diferențiat per mod (mock — demonstrează logica RRF/vector/BM25)
      if (!query || p.score === undefined) return p;
      const vectorScore = p.score;
      // BM25 favorizează match exact la termen întreg (token = cuvânt din nume)
      const q = query.toLowerCase();
      const termInName = p.name.toLowerCase().split(" ").includes(q);
      const bm25Score = termInName ? Math.min(1, p.score + 0.08) : Math.max(0, p.score - 0.05);
      const hybridScore = 0.6 * vectorScore + 0.4 * bm25Score;
      const adjustedScore = adjustedScoreForMode(searchMode, vectorScore, bm25Score, hybridScore);
      return { ...p, score: Number.parseFloat(adjustedScore.toFixed(3)) };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const embeddingStats = {
    current: MOCK_PRODUCTS.filter((p) => p.embeddingStatus === "CURRENT").length,
    indexing: MOCK_PRODUCTS.filter((p) => p.embeddingStatus === "INDEXING").length,
    errors: MOCK_PRODUCTS.filter((p) => p.embeddingStatus === "ERROR").length,
    total: MOCK_PRODUCTS.length,
  };

  return (
    <PageWrapper title="Catalog Produse" actions={<EtapaBadge label="Etapa 3" />}>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total SKU-uri"
          value={String(embeddingStats.total)}
          icon="Package"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Embeddings OK"
          value={String(embeddingStats.current)}
          icon="CheckCircle2"
          color="var(--color-ok)"
        />
        <KpiCard
          label="În Indexare"
          value={String(embeddingStats.indexing)}
          icon="Cpu"
          color="var(--color-wa)"
        />
        <KpiCard
          label="Erori Index"
          value={String(embeddingStats.errors)}
          icon="AlertTriangle"
          color="var(--color-er)"
        />
      </div>

      {/* Search bar */}
      <Card className="mb-4">
        <CardBody className="py-3 px-4">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <Search
                size={14}
                color="var(--color-t3)"
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Căutare hibridă: semințe grâu, NPK, fungicid..."
                style={{ paddingLeft: 32 }}
              />
            </div>
            <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                fontSize: 11,
                color: "var(--color-t3)",
              }}
            >
              <Filter size={12} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  background: "var(--color-s800)",
                  border: "1px solid var(--color-s700)",
                  borderRadius: 4,
                  color: "var(--color-t2)",
                  padding: "3px 6px",
                  fontSize: 11,
                }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "Toate categoriile" : c}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  background: "var(--color-s800)",
                  border: "1px solid var(--color-s700)",
                  borderRadius: 4,
                  color: "var(--color-t2)",
                  padding: "3px 6px",
                  fontSize: 11,
                }}
              >
                <option value="all">Toate statusurile</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                <option value="DRAFT">DRAFT</option>
                <option value="DISCONTINUED">DISCONTINUED</option>
              </select>
            </div>
            {query && (
              <div style={{ fontSize: 10, color: "var(--color-t3)" }}>
                {filtered.length} rezultate • {searchModeSummaryLabel(searchMode)}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Products table */}
      <Card>
        <CardHeader>
          <CardTitle>Produse ({filtered.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="px-4 py-3 text-left font-medium text-t3">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Produs</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Categorie</th>
                <th className="px-4 py-3 text-right font-medium text-t3">Preț/UM</th>
                <th className="px-4 py-3 text-right font-medium text-t3">Stoc</th>
                <th className="px-4 py-3 text-center font-medium text-t3">Status</th>
                <th className="px-4 py-3 text-center font-medium text-t3">Embedding</th>
                <th className="px-4 py-3 text-center font-medium text-t3">Chunks</th>
                {query && <th className="px-4 py-3 text-right font-medium text-t3">Score</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-s800 hover:bg-s800/50">
                  <td
                    className="px-4 py-3"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--color-t3)",
                    }}
                  >
                    {p.sku}
                  </td>
                  <td className="px-4 py-3">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Package size={14} color="var(--color-neuron-knowledge)" />
                      <span style={{ fontWeight: 500, color: "var(--color-t1)" }}>{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-t3 text-xs">{p.category}</td>
                  <td className="px-4 py-3 text-right font-mono text-t2">
                    RON {p.unitPrice.toFixed(2)}
                    <div style={{ fontSize: 9, color: "var(--color-t4)" }}>
                      max -{p.maxDiscount}%
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono"
                    style={{ color: stockDisplayColor(p.stock) }}
                  >
                    {p.stock.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EmbeddingBadge status={p.embeddingStatus} dim={p.embeddingDim} />
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-t3">{p.chunkCount || "—"}</td>
                  {query && (
                    <td className="px-4 py-3 text-right">
                      {p.score === undefined ? (
                        <span style={{ color: "var(--color-t4)", fontSize: 10 }}>N/A</span>
                      ) : (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: scoreDisplayColor(p.score),
                          }}
                        >
                          {p.score.toFixed(2)}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={query ? 9 : 8} className="px-4 py-8 text-center text-t3 text-sm">
                    Niciun produs găsit pentru „{query}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Search info */}
      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: "var(--color-t4)",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>Vector: qwen3-embedding-8b-q5km • {4096}d halfvec_cosine_ops • HNSW m=16 ef=64</span>
        <span>BM25: tsvector config „romanian" • ts_rank_cd</span>
        <span>RRF: 1.0/(60+rank) • 60% vector + 40% BM25 • target &lt;150ms</span>
      </div>
    </PageWrapper>
  );
}
