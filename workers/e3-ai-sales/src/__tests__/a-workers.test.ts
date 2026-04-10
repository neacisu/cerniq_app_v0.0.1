/**
 * Teste complete pentru workers A1-A6 (E3 AI Sales — Product Knowledge).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted() — variabile accesibile în factory-urile vi.mock ───────────────

const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  dbDeleteMock,
  setSessionTenantIdMock,
  embedTextMock,
  addMock,
  createQueueMock,
  e3EmbeddingDimensionRejectIncMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-123" });
  const createQueueMock = vi.fn(() => ({ add: addMock }));

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    dbDeleteMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    embedTextMock: vi.fn(),
    addMock,
    createQueueMock,
    e3EmbeddingDimensionRejectIncMock: vi.fn(),
  };
});

// ── vi.mock() — folosesc variabilele hoistate ──────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
    delete: dbDeleteMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  goldProducts: {
    id: "id",
    tenantId: "tenant_id",
    sku: "sku",
    name: "name",
    description: "description",
    metadata: "metadata",
    categoryId: "category_id",
    updatedAt: "updated_at",
  },
  goldProductEmbeddings: {
    id: "id",
    productId: "product_id",
    tenantId: "tenant_id",
    embedding: "embedding",
    model: "model",
    createdAt: "created_at",
  },
  goldProductChunks: {
    id: "id",
    productId: "product_id",
    tenantId: "tenant_id",
    chunkText: "chunk_text",
    chunkIndex: "chunk_index",
    embedding: "embedding",
  },
  goldProductCategories: {
    id: "id",
    tenantId: "tenant_id",
    parentId: "parent_id",
  },
  priceRules: {
    id: "id",
    tenantId: "tenant_id",
    productId: "product_id",
    ruleType: "rule_type",
    minMarginPct: "min_margin_pct",
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
  isNull: vi.fn((_a: unknown) => ({ type: "isNull" })),
  inArray: vi.fn((_a: unknown, _b: unknown) => ({ type: "inArray" })),
  sql: Object.assign(
    vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({ type: "sql" })),
    { raw: vi.fn((s: string) => ({ type: "sql-raw", s })) },
  ),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: createQueueMock,
  DEFAULT_JOB_OPTIONS: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
}));

vi.mock("../e3-metrics.js", () => ({
  e3EmbeddingDimensionRejectTotal: { inc: e3EmbeddingDimensionRejectIncMock },
}));

vi.mock("../lib/llm-client.js", () => ({
  embedText: embedTextMock,
}));

// ── Helper builders ───────────────────────────────────────────────────────────

/**
 * Creează un mock pentru db.select() care este și thenable (Promise) și chain-able.
 * Suportă: await chain, await chain.where(...), await chain.where(...).limit(n)
 */
function makeSelectChain(rows: unknown[]) {
  const basePromise = Promise.resolve(rows);
  const chain = Object.assign(basePromise, {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain() {
  const setChain = { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  return { set: vi.fn().mockReturnValue(setChain) };
}

function makeDeleteChain() {
  return { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
}

// ── Imports workers ────────────────────────────────────────────────────────────

import { productIngestProcessor } from "../workers/a1-product-ingest.js";
import { productEmbedProcessor } from "../workers/a2-product-embed.js";
import { productChunkProcessor } from "../workers/a3-product-chunk.js";
import { productIndexRebuildProcessor } from "../workers/a4-product-index-rebuild.js";
import { productCategorySyncProcessor } from "../workers/a5-product-category-sync.js";
import { productVariantProcessProcessor } from "../workers/a6-product-variant-process.js";

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  addMock.mockResolvedValue({ id: "job-123" });
  createQueueMock.mockReturnValue({ add: addMock });
});

// ── A1: product:ingest ─────────────────────────────────────────────────────────

describe("A1 — productIngestProcessor", () => {
  it("inserează produs nou (fără SKU)", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "tenant-1", productData: { name: "Produs Test" } },
    } as unknown as Parameters<typeof productIngestProcessor>[0];

    const result = await productIngestProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("inserted");
    expect(typeof result.productId).toBe("string");
    expect(result.productId.length).toBeGreaterThan(0);
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledTimes(2);
  });

  it("inserează produs nou cu SKU inexistent", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "tenant-1", productData: { name: "Produs SKU Nou", sku: "SKU-NEW-001" } },
    } as unknown as Parameters<typeof productIngestProcessor>[0];

    const result = await productIngestProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("inserted");
    expect(dbSelectMock).toHaveBeenCalled();
    expect(dbInsertMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalledTimes(2);
  });

  it("actualizează produs existent (SKU conflict)", async () => {
    const existingId = "prod-existing-uuid";
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: existingId }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "tenant-1", productData: { name: "Updated", sku: "SKU-EXIST" } },
    } as unknown as Parameters<typeof productIngestProcessor>[0];

    const result = await productIngestProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("updated");
    expect(result.productId).toBe(existingId);
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalledTimes(2);
  });

  it("trigger embed și chunk cu datele corecte", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "my-tenant", productData: { name: "Test" } },
    } as unknown as Parameters<typeof productIngestProcessor>[0];

    const result = await productIngestProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledTimes(2);
    const queueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(queueNames).toContain("product:embed");
    expect(queueNames).toContain("product:chunk");
    for (const call of addMock.mock.calls) {
      expect(call[1]).toMatchObject({ tenantId: "my-tenant", productId: result.productId });
    }
  });
});

// ── A2: product:embed ──────────────────────────────────────────────────────────

describe("A2 — productEmbedProcessor", () => {
  it("embed success — isFallback=false, INSERT embedding (nu există anterior)", async () => {
    embedTextMock.mockResolvedValue({
      embedding: new Array(3072).fill(0.1),
      model: "qwen3-embedding-8b-q5km",
      dimensions: 3072,
      isFallback: false,
    });

    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([{ name: "Prod A", description: "Desc", metadata: {} }]);
      }
      return makeSelectChain([]); // Nu există embedding anterior
    });
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "t1", productId: "prod-1" },
    } as unknown as Parameters<typeof productEmbedProcessor>[0];

    const result = await productEmbedProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.isFallback).toBe(false);
    expect(result.model).toBe("qwen3-embedding-8b-q5km");
    expect(result.dimensions).toBe(3072);
    expect(dbInsertMock).toHaveBeenCalled();
  });

  it("respinge embedding non-MRL (1536) — incompatibil halfvec(3072)", async () => {
    embedTextMock.mockResolvedValue({
      embedding: new Array(1536).fill(0.2),
      model: "text-embedding-3-small",
      dimensions: 1536,
      isFallback: true,
    });

    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([{ name: "Prod B", description: "Desc B", metadata: {} }]);
      }
      return makeSelectChain([]);
    });
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "t1", productId: "prod-2" },
    } as unknown as Parameters<typeof productEmbedProcessor>[0];

    await expect(productEmbedProcessor(job, {} as never)).rejects.toThrow(
      /invalid embedding for halfvec/,
    );
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(e3EmbeddingDimensionRejectIncMock).toHaveBeenCalledWith({ surface: "product" });
  });

  it("upsert — actualizează embedding existent (UPDATE, nu INSERT)", async () => {
    embedTextMock.mockResolvedValue({
      embedding: new Array(3072).fill(0.5),
      model: "qwen3-embedding-8b-q5km",
      dimensions: 3072,
      isFallback: false,
    });

    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([{ name: "Prod C", description: "Desc C", metadata: {} }]);
      }
      return makeSelectChain([{ id: "embed-existing-id" }]); // Există embedding
    });
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1", productId: "prod-3" },
    } as unknown as Parameters<typeof productEmbedProcessor>[0];

    const result = await productEmbedProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("aruncă eroare dacă produsul nu există", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: { tenantId: "t1", productId: "no-such-prod" },
    } as unknown as Parameters<typeof productEmbedProcessor>[0];

    await expect(productEmbedProcessor(job, {} as never)).rejects.toThrow();
  });

  it("embed chunk cu chunkId — UPDATE pe gold_product_chunks", async () => {
    embedTextMock.mockResolvedValue({
      embedding: new Array(3072).fill(0.3),
      model: "qwen3-embedding-8b-q5km",
      dimensions: 3072,
      isFallback: false,
    });

    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "chunk-uuid", chunkText: "[description] text chunk" }]),
    );
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1", productId: "prod-chunk", chunkId: "chunk-uuid" },
    } as unknown as Parameters<typeof productEmbedProcessor>[0];

    const result = await productEmbedProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(dbUpdateMock).toHaveBeenCalled();
  });
});

// ── A3: product:chunk ──────────────────────────────────────────────────────────

describe("A3 — productChunkProcessor", () => {
  it("chunking — description + specs → N chunks, DELETE + INSERT + enqueue embed per chunk", async () => {
    const longDescription = "A".repeat(3000);
    const specs = "B".repeat(2500);

    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { name: "Test Product", description: longDescription, metadata: { specs } },
      ]),
    );
    dbDeleteMock.mockReturnValue(makeDeleteChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "t1", productId: "prod-chunk-1" },
    } as unknown as Parameters<typeof productChunkProcessor>[0];

    const result = await productChunkProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.chunksCreated).toBeGreaterThan(0);
    expect(dbDeleteMock).toHaveBeenCalled();
    expect(dbInsertMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalledTimes(result.chunksCreated);
    for (const call of addMock.mock.calls) {
      expect(call[1]).toHaveProperty("chunkId");
    }
  });

  it("produs scurt (< maxChars) → un singur chunk", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ name: "Scurt", description: "Descriere scurtă", metadata: {} }]),
    );
    dbDeleteMock.mockReturnValue(makeDeleteChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "t1", productId: "prod-short" },
    } as unknown as Parameters<typeof productChunkProcessor>[0];

    const result = await productChunkProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.chunksCreated).toBe(1);
    expect(addMock).toHaveBeenCalledTimes(1);
  });

  it("metadata.faq → chunk cu prefix [faq]", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          name: "Prod FAQ",
          description: "Desc",
          metadata: { faq: [{ q: "Întrebare?", a: "Răspuns" }] },
        },
      ]),
    );
    dbDeleteMock.mockReturnValue(makeDeleteChain());
    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    const job = {
      data: { tenantId: "t1", productId: "prod-faq" },
    } as unknown as Parameters<typeof productChunkProcessor>[0];

    const result = await productChunkProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.chunksCreated).toBeGreaterThanOrEqual(1);
    // Chunk-urile au prefixuri [description] și [faq]
    const insertedRows = insertChain.values.mock.calls[0]?.[0] as Array<{ chunkText: string }>;
    expect(insertedRows).toBeDefined();
    const hasDescriptionChunk = insertedRows?.some((r) => r.chunkText?.startsWith("[description]"));
    const hasFaqChunk = insertedRows?.some((r) => r.chunkText?.startsWith("[faq]"));
    expect(hasDescriptionChunk).toBe(true);
    expect(hasFaqChunk).toBe(true);
  });

  it("aruncă eroare dacă produsul nu există", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: { tenantId: "t1", productId: "no-prod" },
    } as unknown as Parameters<typeof productChunkProcessor>[0];

    await expect(productChunkProcessor(job, {} as never)).rejects.toThrow();
  });
});

// ── A4: product:index:rebuild ──────────────────────────────────────────────────

describe("A4 — productIndexRebuildProcessor", () => {
  it("rebuild index pentru un produs specific → productsReindexed=1", async () => {
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1", productId: "prod-index-1" },
    } as unknown as Parameters<typeof productIndexRebuildProcessor>[0];

    const result = await productIndexRebuildProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.productsReindexed).toBe(1);
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(dbSelectMock).not.toHaveBeenCalled(); // Nu face count pentru single product
  });

  it("rebuild index pentru toți din tenant (fără productId) → count din DB", async () => {
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbSelectMock.mockReturnValue(makeSelectChain([{ count: 7 }]));

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof productIndexRebuildProcessor>[0];

    const result = await productIndexRebuildProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.productsReindexed).toBe(7);
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(dbSelectMock).toHaveBeenCalled();
  });

  it("count=0 când nu există produse în tenant", async () => {
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbSelectMock.mockReturnValue(makeSelectChain([{ count: 0 }]));

    const job = {
      data: { tenantId: "t-empty" },
    } as unknown as Parameters<typeof productIndexRebuildProcessor>[0];

    const result = await productIndexRebuildProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.productsReindexed).toBe(0);
  });
});

// ── A5: product:category:sync ──────────────────────────────────────────────────

describe("A5 — productCategorySyncProcessor", () => {
  it("creează default rules pentru produse fără rules (2 produse → 2 reguli)", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1:
          return makeSelectChain([{ id: "cat-1", parentId: null }]);
        case 2:
          return makeSelectChain([
            { id: "prod-1", categoryId: "cat-1" },
            { id: "prod-2", categoryId: "cat-1" },
          ]);
        case 3:
          return makeSelectChain([]); // Nicio regulă existentă
        default:
          return makeSelectChain([]);
      }
    });
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof productCategorySyncProcessor>[0];

    const result = await productCategorySyncProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.rulesCreated).toBe(2);
    expect(dbInsertMock).toHaveBeenCalled();
  });

  it("nu creează duplicate pentru produse cu category_default existent", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1:
          return makeSelectChain([{ id: "cat-1", parentId: null }]);
        case 2:
          return makeSelectChain([{ id: "prod-1", categoryId: "cat-1" }]);
        case 3:
          return makeSelectChain([{ productId: "prod-1", ruleType: "category_default" }]);
        default:
          return makeSelectChain([]);
      }
    });

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof productCategorySyncProcessor>[0];

    const result = await productCategorySyncProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.rulesCreated).toBe(0);
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("fără categorii → return early (categoriesSynced=0, rulesCreated=0)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof productCategorySyncProcessor>[0];

    const result = await productCategorySyncProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.categoriesSynced).toBe(0);
    expect(result.rulesCreated).toBe(0);
  });

  it("fără produse în categorie → categoriesSynced=1, rulesCreated=0", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return makeSelectChain([{ id: "cat-empty", parentId: null }]);
      return makeSelectChain([]);
    });

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof productCategorySyncProcessor>[0];

    const result = await productCategorySyncProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.categoriesSynced).toBe(1);
    expect(result.rulesCreated).toBe(0);
  });

  it("sync cu categoryId specific — procesează doar acea categorie", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1:
          return makeSelectChain([
            { id: "cat-1", parentId: null },
            { id: "cat-2", parentId: null },
          ]);
        case 2:
          return makeSelectChain([{ id: "prod-1", categoryId: "cat-1" }]);
        case 3:
          return makeSelectChain([]);
        default:
          return makeSelectChain([]);
      }
    });
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: { tenantId: "t1", categoryId: "cat-1" },
    } as unknown as Parameters<typeof productCategorySyncProcessor>[0];

    const result = await productCategorySyncProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.categoriesSynced).toBe(1); // Doar cat-1
  });

  it("propagare price rules — child categories moștenesc margin din parent", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      switch (selectCallCount) {
        case 1:
          return makeSelectChain([
            { id: "cat-1", parentId: null },
            { id: "cat-2", parentId: "cat-1" },
          ]);
        case 2:
          return makeSelectChain([
            { id: "prod-parent", categoryId: "cat-1" },
            { id: "prod-child", categoryId: "cat-2" },
          ]);
        case 3:
          return makeSelectChain([{ productId: "prod-parent", ruleType: "category_default" }]);
        case 4:
          return makeSelectChain([{ productId: "prod-parent", minMarginPct: "10.0" }]);
        default:
          return makeSelectChain([]);
      }
    });
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof productCategorySyncProcessor>[0];

    const result = await productCategorySyncProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.rulesCreated).toBe(1); // Doar prod-child
  });
});

// ── A6: product:variant:process ────────────────────────────────────────────────

describe("A6 — productVariantProcessProcessor", () => {
  it("update metadata.variants — varianți simpli (fără variantAsSeparateProduct)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "prod-v1", metadata: {} }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: {
        tenantId: "t1",
        productId: "prod-v1",
        variants: [
          { sku: "V-001", name: "Roșu M", attributes: { color: "rosu", size: "M" } },
          { sku: "V-002", name: "Albastru L", attributes: { color: "albastru", size: "L" } },
        ],
      },
    } as unknown as Parameters<typeof productVariantProcessProcessor>[0];

    const result = await productVariantProcessProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.variantsProcessed).toBe(2);
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(addMock).not.toHaveBeenCalled();
  });

  it("variantă cu variantAsSeparateProduct=true → trigger product:ingest", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "prod-v2", metadata: {} }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: {
        tenantId: "t1",
        productId: "prod-v2",
        variants: [
          {
            sku: "V-SEP",
            name: "Variantă Separată",
            attributes: { weight: "1kg" },
            unitPrice: "99.00",
            variantAsSeparateProduct: true,
          },
        ],
      },
    } as unknown as Parameters<typeof productVariantProcessProcessor>[0];

    const result = await productVariantProcessProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.variantsProcessed).toBe(1);
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalledTimes(1);
    const payload = addMock.mock.calls[0]?.[1] as {
      tenantId: string;
      productData: { sku: string; metadata: { isVariant: boolean } };
    };
    expect(payload.productData.sku).toBe("V-SEP");
    expect(payload.tenantId).toBe("t1");
    expect(payload.productData.metadata.isVariant).toBe(true);
  });

  it("mix — 2 separate, 1 normal → enqueue 2 ingest jobs", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "prod-v3", metadata: {} }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: {
        tenantId: "t1",
        productId: "prod-v3",
        variants: [
          { sku: "V-A", name: "A", attributes: {}, variantAsSeparateProduct: true },
          { sku: "V-B", name: "B", attributes: {} },
          { sku: "V-C", name: "C", attributes: {}, variantAsSeparateProduct: true },
        ],
      },
    } as unknown as Parameters<typeof productVariantProcessProcessor>[0];

    const result = await productVariantProcessProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.variantsProcessed).toBe(3);
    expect(addMock).toHaveBeenCalledTimes(2);
  });

  it("aruncă eroare dacă produsul nu există", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: {
        tenantId: "t1",
        productId: "no-prod",
        variants: [{ sku: "V", name: "V", attributes: {} }],
      },
    } as unknown as Parameters<typeof productVariantProcessProcessor>[0];

    await expect(productVariantProcessProcessor(job, {} as never)).rejects.toThrow();
  });

  it("fără variante → return timpuriu (variantsProcessed=0, fără DB calls)", async () => {
    const job = {
      data: { tenantId: "t1", productId: "prod-v4", variants: [] },
    } as unknown as Parameters<typeof productVariantProcessProcessor>[0];

    const result = await productVariantProcessProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.variantsProcessed).toBe(0);
    expect(dbSelectMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });
});
