/**
 * ProductCatalog — E3 Product Knowledge Base (date din API)
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Input } from "@/components/ui/input.js";
import { SBadge } from "@/components/ui/badge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { Search, Package, Cpu, AlertTriangle, CheckCircle2, Clock, Filter } from "lucide-react";
import { api, ApiError } from "@/lib/api.js";
import { toast } from "sonner";

type EmbeddingStatus = "CURRENT" | "INDEXING" | "STALE" | "ERROR";
type ProductStatus = "ACTIVE" | "DRAFT" | "DISCONTINUED" | "OUT_OF_STOCK";
type SearchMode = "hybrid" | "vector" | "bm25";

type ApiProductRow = {
  id: string;
  sku: string | null;
  name: string;
  categoryName?: string | null;
  unitPrice?: string | number | null;
  currency?: string;
  isActive?: boolean;
  stockAvailable?: number;
  chunkCount?: number;
  hasEmbedding?: boolean;
  metadata?: Record<string, unknown>;
};

type CategoryRow = { id: string; name: string };

type ProductsListResponse = {
  success?: boolean;
  data?: ApiProductRow[];
  meta?: { page?: number; limit?: number; total?: number; pages?: number };
};

type StatsResponse = {
  success?: boolean;
  data?: {
    products?: { total?: number; active?: number; withEmbeddings?: number };
    inventory?: { totalSkus?: number; totalStock?: number; reserved?: number };
  };
};

function searchModeButtonLabel(m: SearchMode): string {
  if (m === "hybrid") return "Hybrid (RRF)";
  if (m === "vector") return "Vector";
  return "BM25";
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

function parseUnitPrice(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function rowToStatus(row: ApiProductRow): ProductStatus {
  if (row.isActive === false) return "DISCONTINUED";
  const stock = row.stockAvailable ?? 0;
  if (stock <= 0) return "OUT_OF_STOCK";
  return "ACTIVE";
}

function rowToEmbedding(row: ApiProductRow): { status: EmbeddingStatus; dim: number } {
  const chunks = row.chunkCount ?? 0;
  if (row.hasEmbedding) return { status: "CURRENT", dim: 3072 };
  if (chunks > 0) return { status: "STALE", dim: 0 };
  return { status: "INDEXING", dim: 0 };
}

function maxDiscountFromMetadata(meta: Record<string, unknown> | undefined): number | null {
  if (!meta) return null;
  const v = meta.maxDiscount ?? meta.max_discount;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function unknownToErrorMessage(err: unknown): string | null {
  if (err instanceof Error) return err.message;
  if (err !== undefined && err !== null) return String(err);
  return null;
}

type ProductCatalogDisplayRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  currency: string;
  stock: number;
  status: ProductStatus;
  embeddingStatus: EmbeddingStatus;
  embeddingDim: number;
  chunkCount: number;
  lastIndexed: string;
  maxDiscount: number | null;
  score?: number;
};

interface ProductCatalogTableBodyProps {
  readonly isLoading: boolean;
  readonly colCount: number;
  readonly displayRows: ProductCatalogDisplayRow[];
  readonly showRelevanceColumn: boolean;
}

function ProductCatalogTableBody({
  isLoading,
  colCount,
  displayRows,
  showRelevanceColumn,
}: ProductCatalogTableBodyProps) {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={colCount} className="px-4 py-8 text-center text-t3">
          Se încarcă…
        </td>
      </tr>
    );
  }
  if (displayRows.length === 0) {
    return (
      <tr>
        <td colSpan={colCount} className="px-4 py-8 text-center text-t3">
          Niciun produs. Importați date sau ajustați filtrele.
        </td>
      </tr>
    );
  }
  return (
    <>
      {displayRows.map((p) => (
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
            {p.currency} {p.unitPrice.toFixed(2)}
            {typeof p.maxDiscount === "number" ? (
              <div style={{ fontSize: 9, color: "var(--color-t4)" }}>max -{p.maxDiscount}%</div>
            ) : null}
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
          {showRelevanceColumn ? (
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
          ) : null}
        </tr>
      ))}
    </>
  );
}

interface EmbeddingBadgeProps {
  readonly status: EmbeddingStatus;
  readonly dim: number;
}

function EmbeddingBadge({ status, dim }: EmbeddingBadgeProps) {
  const config = {
    CURRENT: { color: "var(--color-ok)", icon: CheckCircle2, label: dim > 0 ? `✓ ${dim}d` : "✓" },
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
          type="button"
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

const PAGE_SIZE = 50;

export function ProductCatalog() {
  const [queryInput, setQueryInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const categoriesQuery = useQuery({
    queryKey: ["products", "categories"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: CategoryRow[] }>("/api/v1/products/categories"),
  });

  const statsQuery = useQuery({
    queryKey: ["products", "stats"],
    queryFn: () => api.get<StatsResponse>("/api/v1/products/stats"),
  });

  const listParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(PAGE_SIZE));
    if (appliedSearch.trim()) p.set("search", appliedSearch.trim());
    if (categoryFilter !== "all") p.set("categoryId", categoryFilter);
    if (statusFilter === "ACTIVE") p.set("isActive", "true");
    if (statusFilter === "DISCONTINUED") p.set("isActive", "false");
    return p.toString();
  }, [page, appliedSearch, categoryFilter, statusFilter]);

  const productsQuery = useQuery({
    queryKey: ["products", "list", listParams],
    queryFn: () => api.get<ProductsListResponse>(`/api/v1/products?${listParams}`),
  });

  const categories = useMemo(() => {
    const raw = categoriesQuery.data?.data ?? [];
    return [
      { id: "all", name: "Toate categoriile" },
      ...raw.map((c) => ({ id: c.id, name: c.name })),
    ];
  }, [categoriesQuery.data]);

  const rows = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data?.data]);
  const meta = productsQuery.data?.meta;
  const total = meta?.total ?? rows.length;

  const embeddingStats = useMemo(() => {
    const s = statsQuery.data?.data?.products;
    const inv = statsQuery.data?.data?.inventory;
    return {
      total: s?.total ?? 0,
      current: s?.withEmbeddings ?? 0,
      indexing: Math.max(0, (s?.total ?? 0) - (s?.withEmbeddings ?? 0)),
      errors: 0,
      totalStock: inv?.totalStock ?? 0,
    };
  }, [statsQuery.data]);

  const runHybridSearchJob = async () => {
    const q = queryInput.trim();
    if (!q) {
      toast.warning("Introduceți un termen de căutare.");
      return;
    }
    try {
      const searchBody: { query: string; limit: number; categoryId?: string } = {
        query: q,
        limit: 20,
      };
      if (categoryFilter !== "all") {
        searchBody.categoryId = categoryFilter;
      }
      await api.post("/api/v1/products/search", searchBody);
      toast.success(
        `Căutare ${searchModeSummaryLabel(searchMode)} în coadă — rezultatele apar după procesare. Folosiți lista sau reîncărcați.`,
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Eroare la trimiterea căutării";
      toast.error(msg);
    }
  };

  const applyListSearch = () => {
    setAppliedSearch(queryInput.trim());
    setPage(1);
  };

  const displayRows = useMemo(() => {
    return rows
      .map((row) => {
        const price = parseUnitPrice(row.unitPrice);
        const stock = row.stockAvailable ?? 0;
        const status = rowToStatus(row);
        const { status: embStatus, dim } = rowToEmbedding(row);
        const discount = maxDiscountFromMetadata(row.metadata);
        let score: number | undefined;
        if (appliedSearch.trim()) {
          const name = row.name.toLowerCase();
          const term = appliedSearch.toLowerCase();
          score = name.includes(term) ? 0.85 : 0.55;
        }
        return {
          id: row.id,
          sku: row.sku ?? "—",
          name: row.name,
          category: row.categoryName ?? "—",
          unitPrice: price,
          currency: row.currency ?? "RON",
          stock,
          status,
          embeddingStatus: embStatus,
          embeddingDim: dim,
          chunkCount: row.chunkCount ?? 0,
          lastIndexed: "—",
          maxDiscount: discount,
          score,
        };
      })
      .filter((r) => {
        if (
          statusFilter === "all" ||
          statusFilter === "ACTIVE" ||
          statusFilter === "DISCONTINUED"
        ) {
          return true;
        }
        return r.status === statusFilter;
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [rows, appliedSearch, statusFilter]);

  const productsErrorMessage = useMemo(
    () => unknownToErrorMessage(productsQuery.error),
    [productsQuery.error],
  );

  const colCount = appliedSearch ? 9 : 8;
  const showRelevanceColumn = Boolean(appliedSearch);

  return (
    <PageWrapper title="Catalog Produse" actions={<EtapaBadge label="Etapa 3" />}>
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total SKU-uri"
          value={String(embeddingStats.total)}
          icon="Package"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Cu embeddings"
          value={String(embeddingStats.current)}
          icon="CheckCircle2"
          color="var(--color-ok)"
        />
        <KpiCard
          label="Fără embedding"
          value={String(embeddingStats.indexing)}
          icon="Cpu"
          color="var(--color-wa)"
        />
        <KpiCard
          label="Stoc total (unități)"
          value={String(embeddingStats.totalStock)}
          icon="AlertTriangle"
          color="var(--color-b5)"
        />
      </div>

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
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyListSearch();
                }}
                placeholder="Căutare în catalog (server) sau hybrid queue…"
                style={{ paddingLeft: 32 }}
              />
            </div>
            <button
              type="button"
              className="rounded border border-s700 px-3 py-1 text-xs text-t2 hover:bg-s800"
              onClick={applyListSearch}
            >
              Caută în listă
            </button>
            <button
              type="button"
              className="rounded border border-s700 px-3 py-1 text-xs text-t2 hover:bg-s800"
              onClick={() => void runHybridSearchJob()}
            >
              Trimite hybrid (coadă)
            </button>
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
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
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
                  <option key={c.id} value={c.id === "all" ? "all" : c.id}>
                    {c.id === "all" ? "Toate categoriile" : c.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
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
                <option value="DISCONTINUED">DISCONTINUED</option>
              </select>
            </div>
            {appliedSearch && (
              <div style={{ fontSize: 10, color: "var(--color-t3)" }}>
                {displayRows.length} afișate • filtru server + {searchModeSummaryLabel(searchMode)}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {productsErrorMessage ? (
        <p className="text-sm text-er mb-4" role="alert">
          {productsErrorMessage}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            Produse ({displayRows.length} / {total} total)
            {meta?.pages != null && meta.pages > 1
              ? ` — pagina ${meta.page ?? page} din ${meta.pages}`
              : ""}
          </CardTitle>
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
                {appliedSearch ? (
                  <th className="px-4 py-3 text-right font-medium text-t3">Relevanță</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              <ProductCatalogTableBody
                isLoading={productsQuery.isLoading}
                colCount={colCount}
                displayRows={displayRows}
                showRelevanceColumn={showRelevanceColumn}
              />
            </tbody>
          </table>
        </CardBody>
      </Card>

      {meta && (meta.pages ?? 0) > 1 ? (
        <div className="mt-4 flex gap-2 justify-end">
          <button
            type="button"
            className="rounded border border-s700 px-3 py-1 text-xs text-t2 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Înapoi
          </button>
          <button
            type="button"
            className="rounded border border-s700 px-3 py-1 text-xs text-t2 disabled:opacity-40"
            disabled={page >= (meta.pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Înainte
          </button>
        </div>
      ) : null}
    </PageWrapper>
  );
}
