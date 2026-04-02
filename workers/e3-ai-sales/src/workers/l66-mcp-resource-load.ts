/**
 * L66 — mcp:resource:load (concurrency:20, timeout:30s)
 *
 * Încarcă un MCP Resource (product, client, conversation, catalog category)
 * cu cache Redis TTL 5min. La cache MISS, citește din DB și stochează în Redis.
 * La cache HIT, returnează direct din Redis.
 *
 * Invalidare cache: action='invalidate' șterge cheia Redis pentru resource-ul dat.
 *
 * Resource URI-uri suportate (exact din plan L8509-8512):
 *   product://{sku}           → gold_products WHERE sku
 *   client://{cif}            → gold_companies WHERE cui / cui_ro (CIF)
 *   conversation://{lead_id}  → ai_conversations WHERE lead_id, ultima conversație activă
 *   catalog://category/{cat}  → gold_product_categories WHERE name sau id(UUID)
 *
 * FAZA 7m — Plan L1907.
 */
import type { Processor } from "bullmq";
import Redis from "ioredis";
import {
  db,
  setSessionTenantId,
  goldProducts,
  goldCompanies,
  aiConversations,
  goldProductCategories,
  eq,
  and,
  or,
  desc,
} from "@cerniq/db";
import { getRedisConnectionOptions } from "@cerniq/worker-shared";
import {
  parseResourceUri,
  buildResourceCacheKey,
  MCP_RESOURCE_CACHE_TTL_S,
} from "../lib/mcp-server.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface McpResourceLoadJobData {
  tenantId: string;
  /** URI complet, e.g. "product://SKU-123", "catalog://category/electronice" */
  resourceUri: string;
  /** Dacă 'invalidate', șterge cache-ul (fără a reîncărca). */
  action?: "load" | "invalidate";
}

export interface McpResourceLoadResult {
  ok: boolean;
  resourceUri: string;
  action: "load" | "invalidate";
  cacheHit?: boolean;
  data?: Record<string, unknown> | null;
}

// ── Redis — lazy singleton ────────────────────────────────────────────────────

let _redis: Redis | null = null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getRedis(): Redis {
  _redis ??= new Redis(getRedisConnectionOptions());
  return _redis;
}

function normalizeCifLookup(rawCif: string): { cui: string; cuiRo: string } {
  const trimmed = rawCif.trim().toUpperCase();
  const cui = trimmed.startsWith("RO") ? trimmed.slice(2) : trimmed;
  return { cui, cuiRo: `RO${cui}` };
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

// ── DB loaders ────────────────────────────────────────────────────────────────

async function loadProductResource(
  tenantId: string,
  sku: string,
): Promise<Record<string, unknown> | null> {
  const rows = await db
    .select({
      id: goldProducts.id,
      sku: goldProducts.sku,
      name: goldProducts.name,
      description: goldProducts.description,
      unitPrice: goldProducts.unitPrice,
      currency: goldProducts.currency,
      isActive: goldProducts.isActive,
    })
    .from(goldProducts)
    .where(and(eq(goldProducts.tenantId, tenantId), eq(goldProducts.sku, sku)))
    .limit(1);

  return rows[0] ?? null;
}

async function loadClientResource(
  tenantId: string,
  cif: string,
): Promise<Record<string, unknown> | null> {
  const lookup = normalizeCifLookup(cif);
  const rows = await db
    .select({
      id: goldCompanies.id,
      denumire: goldCompanies.denumire,
      cui: goldCompanies.cui,
      cuiRo: goldCompanies.cuiRo,
      nrRegCom: goldCompanies.nrRegCom,
      judet: goldCompanies.judet,
    })
    .from(goldCompanies)
    .where(
      and(
        eq(goldCompanies.tenantId, tenantId),
        or(eq(goldCompanies.cui, lookup.cui), eq(goldCompanies.cuiRo, lookup.cuiRo)),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

async function loadConversationResource(
  tenantId: string,
  leadId: string,
): Promise<Record<string, unknown> | null> {
  const rows = await db
    .select({
      id: aiConversations.id,
      leadId: aiConversations.leadId,
      negotiationId: aiConversations.negotiationId,
      sessionId: aiConversations.sessionId,
      mcpSessionId: aiConversations.mcpSessionId,
      modelUsed: aiConversations.modelUsed,
      startedAt: aiConversations.startedAt,
      totalTokens: aiConversations.totalTokens,
    })
    .from(aiConversations)
    .where(and(eq(aiConversations.tenantId, tenantId), eq(aiConversations.leadId, leadId)))
    .orderBy(desc(aiConversations.startedAt))
    .limit(1);

  return rows[0] ?? null;
}

async function loadCatalogResource(
  tenantId: string,
  category: string,
): Promise<Record<string, unknown> | null> {
  const categoryId = category.trim();
  const rows = await db
    .select({
      id: goldProductCategories.id,
      name: goldProductCategories.name,
      parentId: goldProductCategories.parentId,
      sortOrder: goldProductCategories.sortOrder,
    })
    .from(goldProductCategories)
    .where(
      and(
        eq(goldProductCategories.tenantId, tenantId),
        isUuid(categoryId)
          ? or(eq(goldProductCategories.name, category), eq(goldProductCategories.id, categoryId))
          : eq(goldProductCategories.name, category),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const mcpResourceLoadProcessor: Processor<
  McpResourceLoadJobData,
  McpResourceLoadResult
> = async (job) => {
  const { tenantId, resourceUri, action = "load" } = job.data;

  await setSessionTenantId(tenantId);

  const parsed = parseResourceUri(resourceUri);
  if (!parsed) {
    throw new Error(
      `L66: URI resource invalid: ${resourceUri}. ` +
        "Formate acceptate: product://{sku}, client://{cif}, " +
        "conversation://{lead_id}, catalog://category/{cat}",
    );
  }

  const redis = getRedis();
  const cacheKey = buildResourceCacheKey(parsed.type, tenantId, parsed.id);

  // ── Invalidate ──────────────────────────────────────────────────────────────
  if (action === "invalidate") {
    await redis.del(cacheKey);
    console.info(`[L66:mcp:resource:load] invalidated cacheKey=${cacheKey}`);
    return { ok: true, resourceUri, action: "invalidate" };
  }

  // ── Load: cache check ───────────────────────────────────────────────────────
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.info(`[L66:mcp:resource:load] HIT type=${parsed.type} id=${parsed.id}`);
    return {
      ok: true,
      resourceUri,
      action: "load",
      cacheHit: true,
      data: JSON.parse(cached) as Record<string, unknown>,
    };
  }

  // ── Load: DB fetch ──────────────────────────────────────────────────────────
  let data: Record<string, unknown> | null = null;

  if (parsed.type === "product") data = await loadProductResource(tenantId, parsed.id);
  else if (parsed.type === "client") data = await loadClientResource(tenantId, parsed.id);
  else if (parsed.type === "conversation")
    data = await loadConversationResource(tenantId, parsed.id);
  else if (parsed.type === "catalog") data = await loadCatalogResource(tenantId, parsed.id);

  // ── Cache set (chiar și pentru null — evităm DB storms) ────────────────────
  await redis.set(cacheKey, JSON.stringify(data), "EX", MCP_RESOURCE_CACHE_TTL_S);

  console.info(
    `[L66:mcp:resource:load] MISS type=${parsed.type} id=${parsed.id} found=${data !== null}`,
  );

  return { ok: true, resourceUri, action: "load", cacheHit: false, data };
};
