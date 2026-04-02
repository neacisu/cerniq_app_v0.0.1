/**
 * B11 — search:filter:apply (concurrency:50)
 *
 * Filtre HARD DETERMINISTICE aplicate pe rezultatele RRF fused.
 * ALWAYS filtrat pe tenant — niciodată cross-tenant.
 */
import type { Processor } from "bullmq";
import { db, sql, setSessionTenantId } from "@cerniq/db";
import type { FusedResult } from "./b10-search-rrf-fuse.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyInStock?: boolean;
  isActive?: boolean;
}

export interface SearchFilterApplyJobData {
  tenantId: string;
  sessionId: string;
  results: FusedResult[];
  filters: SearchFilters;
}

interface ProductPriceRow {
  id: string;
  unit_price: string | null;
  is_active: boolean;
  category_id: string | null;
}

interface StockRow {
  product_id: string;
  total_quantity: number;
  reserved_quantity: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifică dacă un rând de produs trece toate filtrele de preț/activitate/categorie.
 */
function passesProductFilter(row: ProductPriceRow, filters: SearchFilters): boolean {
  const isActiveFilter = filters.isActive ?? true;
  if (row.is_active !== isActiveFilter) return false;
  if (filters.categoryId !== undefined && row.category_id !== filters.categoryId) return false;
  if (
    filters.minPrice !== undefined &&
    row.unit_price !== null &&
    Number(row.unit_price) < filters.minPrice
  )
    return false;
  if (
    filters.maxPrice !== undefined &&
    row.unit_price !== null &&
    Number(row.unit_price) > filters.maxPrice
  )
    return false;
  return true;
}

/**
 * Returnează setul de product_ids care trec filtrele de preț/activitate/categorie din DB.
 * Returnează `null` dacă nu e nevoie de filtrare DB.
 */
async function fetchAllowedProductIds(
  tenantId: string,
  productIds: string[],
  filters: SearchFilters,
): Promise<Set<string> | null> {
  const needsDbFilter =
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    (filters.isActive !== undefined && filters.isActive !== true) ||
    filters.categoryId !== undefined;

  if (!needsDbFilter) return null;

  const productIdList = productIds.map((id) => `'${id}'::uuid`).join(", ");
  const execResult = await db.execute(sql`
    SELECT p.id, p.unit_price, p.is_active, p.category_id
    FROM gold.gold_products p
    WHERE p.tenant_id = ${tenantId}::uuid
      AND p.id = ANY(ARRAY[${sql.raw(productIdList)}])
  `);

  const rows = (
    Array.isArray(execResult)
      ? execResult
      : ((execResult as unknown as { rows: ProductPriceRow[] }).rows ?? [])
  ) as ProductPriceRow[];

  const allowed = new Set<string>();
  for (const row of rows) {
    if (passesProductFilter(row, filters)) {
      allowed.add(row.id);
    }
  }
  return allowed;
}

/**
 * Returnează setul de product_ids disponibile în stoc (total > reserved).
 * Returnează `null` dacă filtrul onlyInStock nu este activ.
 */
async function fetchInStockProductIds(
  tenantId: string,
  productIds: string[],
  onlyInStock: boolean | undefined,
): Promise<Set<string> | null> {
  if (!onlyInStock) return null;

  const productIdList = productIds.map((id) => `'${id}'::uuid`).join(", ");
  const stockExec = await db.execute(sql`
    SELECT si.product_id, si.total_quantity, si.reserved_quantity
    FROM gold.stock_inventory si
    WHERE si.tenant_id = ${tenantId}::uuid
      AND si.product_id = ANY(ARRAY[${sql.raw(productIdList)}])
      AND si.total_quantity > si.reserved_quantity
  `);

  const stockData = (
    Array.isArray(stockExec)
      ? stockExec
      : ((stockExec as unknown as { rows: StockRow[] }).rows ?? [])
  ) as StockRow[];

  const inStock = new Set<string>();
  for (const row of stockData) {
    inStock.add(row.product_id);
  }
  return inStock;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const searchFilterApplyProcessor: Processor<SearchFilterApplyJobData> = async (job) => {
  const { tenantId, sessionId, results, filters } = job.data;
  const startedAt = Date.now();

  await setSessionTenantId(tenantId);

  console.info(
    `[b11:filter:apply] tenantId=${tenantId} sessionId=${sessionId} totalBefore=${results.length} filters=${JSON.stringify(filters)}`,
  );

  const totalBefore = results.length;

  if (results.length === 0) {
    return { ok: true, sessionId, filtered: [], totalBefore, totalAfter: 0, durationMs: 0 };
  }

  const productIds = results.map((r) => r.productId);

  const [allowedProductIds, inStockProductIds] = await Promise.all([
    fetchAllowedProductIds(tenantId, productIds, filters),
    fetchInStockProductIds(tenantId, productIds, filters.onlyInStock),
  ]);

  const filtered = results.filter(
    (item) =>
      (allowedProductIds === null || allowedProductIds.has(item.productId)) &&
      (inStockProductIds === null || inStockProductIds.has(item.productId)),
  );

  const durationMs = Date.now() - startedAt;
  console.info(
    `[b11:filter:apply] tenantId=${tenantId} sessionId=${sessionId} totalAfter=${filtered.length} durationMs=${durationMs}`,
  );

  return { ok: true, sessionId, filtered, totalBefore, totalAfter: filtered.length, durationMs };
};
