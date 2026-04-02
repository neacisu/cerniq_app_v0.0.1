/**
 * A5 — product:category:sync (concurrency: 5)
 *
 * Sincronizează categorii de produse și propagă price rules.
 * Creează reguli default (category_default, minMarginPct=8%) pentru produse din categorii fără rules.
 *
 * NOTĂ SCHEMA: price_rules.product_id este NOT NULL (FK obligatoriu).
 * "Category-level rules" sunt reprezentate ca rules cu ruleType='category_default'
 * asociate direct produselor din acea categorie.
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  goldProducts,
  goldProductCategories,
  priceRules,
  eq,
  and,
  inArray,
  sql,
} from "@cerniq/db";

const LOG = "[a5-product-category-sync]";

export interface ProductCategorySyncJobData {
  tenantId: string;
  categoryId?: string;
}

export interface ProductCategorySyncResult {
  ok: true;
  categoriesSynced: number;
  rulesCreated: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Construiește o hartă cu toți descendenții (copii + nepoți) pentru o categorie.
 */
function buildDescendantMap(
  categories: Array<{ id: string; parentId: string | null }>,
): Map<string, string[]> {
  const childrenOf = new Map<string, string[]>();
  for (const cat of categories) {
    if (cat.parentId) {
      const list = childrenOf.get(cat.parentId) ?? [];
      list.push(cat.id);
      childrenOf.set(cat.parentId, list);
    }
  }
  return childrenOf;
}

/**
 * Adaugă recursiv toți descendenții unui nod în setul dat.
 */
function collectDescendants(
  catId: string,
  descendantMap: Map<string, string[]>,
  target: Set<string>,
): void {
  const children = descendantMap.get(catId) ?? [];
  for (const child of children) {
    target.add(child);
    collectDescendants(child, descendantMap, target);
  }
}

/**
 * Construiește o hartă category_id → product_ids pentru produsele date.
 */
function buildCategoryProductMap(
  products: Array<{ id: string; categoryId: string | null }>,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const p of products) {
    if (p.categoryId) {
      const list = map.get(p.categoryId) ?? [];
      list.push(p.id);
      map.set(p.categoryId, list);
    }
  }
  return map;
}

/**
 * Propagă margin-ul mediu din categoriile parent la child products fără rules custom.
 * Actualizează category_default rules în DB cu avgMargin calculat.
 */
async function propagateParentMargins(args: {
  tenantId: string;
  allCategories: Array<{ id: string; parentId: string | null }>;
  categoryIdsToSync: Set<string>;
  categoryProductMap: Map<string, string[]>;
  productsWithoutRule: Array<{ id: string }>;
}): Promise<void> {
  const { tenantId, allCategories, categoryIdsToSync, categoryProductMap, productsWithoutRule } =
    args;

  const parentCategoryIds = allCategories
    .filter(
      (c): c is typeof c & { parentId: string } =>
        !!(c.parentId && categoryIdsToSync.has(c.id) && categoryIdsToSync.has(c.parentId)),
    )
    .map((c) => c.parentId);

  if (parentCategoryIds.length === 0) return;

  const parentProductIds = parentCategoryIds.flatMap((pid) => categoryProductMap.get(pid) ?? []);
  if (parentProductIds.length === 0) return;

  const parentRules = await db
    .select({ productId: priceRules.productId, minMarginPct: priceRules.minMarginPct })
    .from(priceRules)
    .where(and(eq(priceRules.tenantId, tenantId), inArray(priceRules.productId, parentProductIds)));

  if (parentRules.length === 0) return;

  const avgMargin =
    parentRules.reduce((sum, r) => sum + Number(r.minMarginPct ?? 8), 0) / parentRules.length;

  const childProductIds = productsWithoutRule.map((p) => p.id);
  if (childProductIds.length === 0) return;

  await db
    .update(priceRules)
    .set({ minMarginPct: sql`${avgMargin.toFixed(2)}` })
    .where(
      and(
        eq(priceRules.tenantId, tenantId),
        inArray(priceRules.productId, childProductIds),
        eq(priceRules.ruleType, "category_default"),
      ),
    );

  console.info(
    `${LOG} propagated margin=${avgMargin.toFixed(2)} to ${childProductIds.length} child products`,
  );
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const productCategorySyncProcessor: Processor<
  ProductCategorySyncJobData,
  ProductCategorySyncResult
> = async (job) => {
  const { tenantId, categoryId } = job.data;
  await setSessionTenantId(tenantId);

  const allCategories = await db
    .select({
      id: goldProductCategories.id,
      parentId: goldProductCategories.parentId,
    })
    .from(goldProductCategories)
    .where(eq(goldProductCategories.tenantId, tenantId));

  const categoriesToProcess = categoryId
    ? allCategories.filter((c) => c.id === categoryId)
    : allCategories;

  if (categoriesToProcess.length === 0) {
    console.info(`${LOG} no categories found tenant=${tenantId}`);
    return { ok: true, categoriesSynced: 0, rulesCreated: 0 };
  }

  const descendantMap = buildDescendantMap(allCategories);
  const categoryIdsToSync = new Set<string>(categoriesToProcess.map((c) => c.id));
  for (const cat of categoriesToProcess) {
    collectDescendants(cat.id, descendantMap, categoryIdsToSync);
  }

  const categoryIdsList = Array.from(categoryIdsToSync);

  const products = await db
    .select({ id: goldProducts.id, categoryId: goldProducts.categoryId })
    .from(goldProducts)
    .where(
      and(eq(goldProducts.tenantId, tenantId), inArray(goldProducts.categoryId, categoryIdsList)),
    );

  if (products.length === 0) {
    console.info(
      `${LOG} no products in categories tenant=${tenantId} categories=${categoryIdsList.length}`,
    );
    return { ok: true, categoriesSynced: categoryIdsList.length, rulesCreated: 0 };
  }

  const productIds = products.map((p) => p.id);

  const existingRules = await db
    .select({ productId: priceRules.productId, ruleType: priceRules.ruleType })
    .from(priceRules)
    .where(and(eq(priceRules.tenantId, tenantId), inArray(priceRules.productId, productIds)));

  const productsWithCategoryDefault = new Set(
    existingRules.filter((r) => r.ruleType === "category_default").map((r) => r.productId),
  );

  const productsWithoutRule = products.filter((p) => !productsWithCategoryDefault.has(p.id));

  let rulesCreated = 0;
  if (productsWithoutRule.length > 0) {
    await db.insert(priceRules).values(
      productsWithoutRule.map((p) => ({
        tenantId,
        productId: p.id,
        ruleType: "category_default",
        minMarginPct: "8.0",
      })),
    );
    rulesCreated = productsWithoutRule.length;
    console.info(`${LOG} created ${rulesCreated} default rules tenant=${tenantId}`);
  }

  await propagateParentMargins({
    tenantId,
    allCategories,
    categoryIdsToSync,
    categoryProductMap: buildCategoryProductMap(products),
    productsWithoutRule,
  });

  return { ok: true, categoriesSynced: categoryIdsList.length, rulesCreated };
};
