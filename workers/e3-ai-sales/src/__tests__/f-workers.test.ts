/**
 * Teste complete pentru workers F33-F38 (E3 AI Sales — Stock & Inventory).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 * Acoperire:
 *  F33: realtime check via get_available_stock, rezolvare SKU din productId, isOutOfStock
 *  F34: rezervare SERIALIZABLE anti-oversell, OversellPreventionError, TTL per stare, computeExpiresAt
 *  F35: eliberare rezervări expirate, quantity=null guard, releasedCount corect
 *  F36: STUB fără items, UPSERT cu items (UPDATE existent + INSERT nou), syncedCount
 *  F37: detecție LOW_STOCK/OUT_OF_STOCK, threshold default=10, filtrare tenantId
 *  F38: cerere reaprovizionare, requestedQuantity<=0 guard, inventory negăsit, currentAvailable
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted() — variabile accesibile în factory-urile vi.mock ───────────────

const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  dbExecuteMock,
  dbTransactionMock,
  setSessionTenantIdMock,
} = vi.hoisted(() => {
  const dbSelectMock = vi.fn();
  const dbInsertMock = vi.fn();
  const dbUpdateMock = vi.fn();
  const dbExecuteMock = vi.fn();
  const dbTransactionMock = vi.fn();

  return {
    dbSelectMock,
    dbInsertMock,
    dbUpdateMock,
    dbExecuteMock,
    dbTransactionMock,
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
  };
});

// ── vi.mock() ──────────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
    execute: dbExecuteMock,
    transaction: dbTransactionMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  stockInventory: {
    id: "id",
    tenantId: "tenant_id",
    productId: "product_id",
    sku: "sku",
    totalQuantity: "total_quantity",
    reservedQuantity: "reserved_quantity",
    warehouseLocation: "warehouse_location",
    lastSyncAt: "last_sync_at",
  },
  stockReservations: {
    id: "id",
    tenantId: "tenant_id",
    inventoryId: "inventory_id",
    negotiationId: "negotiation_id",
    quantity: "quantity",
    reservationState: "reservation_state",
    expiresAt: "expires_at",
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
  or: vi.fn((..._args: unknown[]) => ({ type: "or" })),
  lt: vi.fn((_a: unknown, _b: unknown) => ({ type: "lt" })),
  lte: vi.fn((_a: unknown, _b: unknown) => ({ type: "lte" })),
  gte: vi.fn((_a: unknown, _b: unknown) => ({ type: "gte" })),
  isNull: vi.fn((_a: unknown) => ({ type: "isNull" })),
  desc: vi.fn((_a: unknown) => ({ type: "desc" })),
  inArray: vi.fn((_a: unknown, _b: unknown) => ({ type: "inArray" })),
  sql: Object.assign(
    vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({ type: "sql" })),
    { raw: vi.fn((s: string) => ({ type: "sql-raw", s })) },
  ),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: vi.fn(() => ({ add: vi.fn(), close: vi.fn() })),
  DEFAULT_JOB_OPTIONS: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
  QUEUES: {
    E3_STOCK_REALTIME_CHECK: "stock:realtime:check",
    E3_STOCK_RESERVE_CREATE: "stock:reserve:create",
    E3_STOCK_RESERVE_RELEASE: "stock:reserve:release",
    E3_STOCK_SYNC_ERP: "stock:sync:erp",
    E3_STOCK_LOW_ALERT: "stock:low:alert",
    E3_STOCK_REPLENISH_REQUEST: "stock:replenish:request",
  },
}));

// ── Helper builders ───────────────────────────────────────────────────────────

/**
 * Creează un lanț thenable compatibil cu: .from().where().limit().for("update")
 * Suportă await direct fără limitări de lant (toate metodele returnează chain).
 */
type RejectCallback = ((reason: unknown) => unknown) | null;

function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    for: vi.fn(),
    orderBy: vi.fn(),
    // thenable — await chain rezolvă la rows
    then: (resolve?: ((value: unknown[]) => unknown) | null, reject?: RejectCallback) =>
      Promise.resolve(rows).then(resolve ?? undefined, reject ?? undefined),
    catch: (onRejected?: RejectCallback) => Promise.resolve(rows).catch(onRejected ?? undefined),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.for.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain() {
  const setChain = { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  return { set: vi.fn().mockReturnValue(setChain) };
}

// ── Imports workers ────────────────────────────────────────────────────────────

import { stockRealtimeCheckProcessor } from "../workers/f33-stock-realtime-check.js";
import {
  stockReserveCreateProcessor,
  OversellPreventionError,
  computeExpiresAt,
  RESERVATION_TTL_MS,
} from "../workers/f34-stock-reserve-create.js";
import { stockReserveReleaseProcessor } from "../workers/f35-stock-reserve-release.js";
import { stockSyncErpProcessor } from "../workers/f36-stock-sync-erp.js";
import { stockLowAlertProcessor } from "../workers/f37-stock-low-alert.js";
import { stockReplenishRequestProcessor } from "../workers/f38-stock-replenish-request.js";

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);

  // Re-inițializare dbTransactionMock după clearAllMocks
  dbTransactionMock.mockImplementation(
    async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
      return await callback({
        select: dbSelectMock,
        insert: dbInsertMock,
        update: dbUpdateMock,
        execute: dbExecuteMock,
      });
    },
  );
});

// ── helpers job factory ────────────────────────────────────────────────────────

function makeF33Job(data: { tenantId: string; productId?: string; sku?: string }) {
  return { data } as unknown as Parameters<typeof stockRealtimeCheckProcessor>[0];
}

function makeF34Job(data: {
  tenantId: string;
  inventoryId: string;
  negotiationId: string;
  quantity: number;
  negotiationState: string;
}) {
  return { data } as unknown as Parameters<typeof stockReserveCreateProcessor>[0];
}

function makeF35Job(data: { tenantId?: string }) {
  return { data } as unknown as Parameters<typeof stockReserveReleaseProcessor>[0];
}

function makeF36Job(data: {
  tenantId: string;
  items?: { sku: string; productId: string; totalQuantity: number; warehouseLocation?: string }[];
}) {
  return { data } as unknown as Parameters<typeof stockSyncErpProcessor>[0];
}

function makeF37Job(data: { tenantId?: string; lowStockThreshold?: number }) {
  return { data } as unknown as Parameters<typeof stockLowAlertProcessor>[0];
}

function makeF38Job(data: {
  tenantId: string;
  inventoryId: string;
  requestedQuantity: number;
  requestedBy: string;
  reason?: string;
}) {
  return { data } as unknown as Parameters<typeof stockReplenishRequestProcessor>[0];
}

// =============================================================================
// F33 — stock:realtime:check
// =============================================================================

describe("F33 — stockRealtimeCheckProcessor", () => {
  it("sku direct furnizat → sare fetch-ul din DB, apelează get_available_stock", async () => {
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "25" }] });

    const result = await stockRealtimeCheckProcessor(
      makeF33Job({ tenantId: "t1", sku: "SKU-001" }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.sku).toBe("SKU-001");
    expect(result.available).toBe(25);
    // SELECT din DB nu trebuie apelat (sku deja cunoscut)
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("productId furnizat fără sku → fetch sku din DB, apelează get_available_stock", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ sku: "SKU-002" }]));
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "10" }] });

    const result = await stockRealtimeCheckProcessor(
      makeF33Job({ tenantId: "t1", productId: "prod-1" }),
      {} as never,
    );

    expect(result.sku).toBe("SKU-002");
    expect(result.available).toBe(10);
    expect(dbSelectMock).toHaveBeenCalledTimes(1);
  });

  it("available=0 → isOutOfStock=true", async () => {
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "0" }] });

    const result = await stockRealtimeCheckProcessor(
      makeF33Job({ tenantId: "t1", sku: "SKU-X" }),
      {} as never,
    );

    expect(result.isOutOfStock).toBe(true);
    expect(result.available).toBe(0);
  });

  it("available>0 → isOutOfStock=false", async () => {
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "5" }] });

    const result = await stockRealtimeCheckProcessor(
      makeF33Job({ tenantId: "t1", sku: "SKU-Y" }),
      {} as never,
    );

    expect(result.isOutOfStock).toBe(false);
    expect(result.available).toBe(5);
  });

  it("nici productId nici sku → throw fără DB calls", async () => {
    await expect(
      stockRealtimeCheckProcessor(makeF33Job({ tenantId: "t1" }), {} as never),
    ).rejects.toThrow("productId sau sku sunt obligatorii");

    expect(dbSelectMock).not.toHaveBeenCalled();
    expect(dbExecuteMock).not.toHaveBeenCalled();
  });

  it("productId furnizat, inventory negăsit (rows=[]) → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      stockRealtimeCheckProcessor(
        makeF33Job({ tenantId: "t1", productId: "prod-missing" }),
        {} as never,
      ),
    ).rejects.toThrow("SKU negăsit pentru productId=prod-missing");
  });

  it("productId furnizat, sku=null în DB → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ sku: null }]));

    await expect(
      stockRealtimeCheckProcessor(
        makeF33Job({ tenantId: "t1", productId: "prod-nosku" }),
        {} as never,
      ),
    ).rejects.toThrow("SKU negăsit");
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "3" }] });

    await stockRealtimeCheckProcessor(
      makeF33Job({ tenantId: "tenant-xyz", sku: "SKU-T" }),
      {} as never,
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-xyz");
  });
});

// =============================================================================
// F34 — stock:reserve:create (SERIALIZABLE)
// =============================================================================

describe("F34 — stockReserveCreateProcessor", () => {
  it("rezervare reușită: available >= quantity → INSERT rezervare + UPDATE inventar", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", totalQuantity: 100, reservedQuantity: 20 }]),
    );
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbExecuteMock.mockResolvedValue(undefined); // SET LOCAL

    const result = await stockReserveCreateProcessor(
      makeF34Job({
        tenantId: "t1",
        inventoryId: "inv-1",
        negotiationId: "neg-1",
        quantity: 10,
        negotiationState: "PROPOSAL",
      }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.inventoryId).toBe("inv-1");
    expect(result.quantity).toBe(10);
    expect(result.reservationId).toBeTruthy();
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("OversellPreventionError: available < quantity → throw anti-oversell", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", totalQuantity: 5, reservedQuantity: 3 }]),
    );
    dbExecuteMock.mockResolvedValue(undefined);

    await expect(
      stockReserveCreateProcessor(
        makeF34Job({
          tenantId: "t1",
          inventoryId: "inv-1",
          negotiationId: "neg-1",
          quantity: 10, // 10 > available=2 → OVERSELL
          negotiationState: "PROPOSAL",
        }),
        {} as never,
      ),
    ).rejects.toThrow(OversellPreventionError);
  });

  it("OversellPreventionError message conține disponibil și solicitat", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", totalQuantity: 5, reservedQuantity: 3 }]),
    );
    dbExecuteMock.mockResolvedValue(undefined);

    await expect(
      stockReserveCreateProcessor(
        makeF34Job({
          tenantId: "t1",
          inventoryId: "inv-1",
          negotiationId: "neg-1",
          quantity: 10,
          negotiationState: "PROPOSAL",
        }),
        {} as never,
      ),
    ).rejects.toThrow("OVERSELL_PREVENTED");
  });

  it("quantity <= 0 → throw fără DB calls", async () => {
    await expect(
      stockReserveCreateProcessor(
        makeF34Job({
          tenantId: "t1",
          inventoryId: "inv-1",
          negotiationId: "neg-1",
          quantity: 0,
          negotiationState: "PROPOSAL",
        }),
        {} as never,
      ),
    ).rejects.toThrow("quantity trebuie să fie > 0");

    expect(dbTransactionMock).not.toHaveBeenCalled();
  });

  it("inventory negăsit în tranzacție → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    dbExecuteMock.mockResolvedValue(undefined);

    await expect(
      stockReserveCreateProcessor(
        makeF34Job({
          tenantId: "t1",
          inventoryId: "inv-missing",
          negotiationId: "neg-1",
          quantity: 5,
          negotiationState: "PROPOSAL",
        }),
        {} as never,
      ),
    ).rejects.toThrow("inventory inv-missing negăsit");
  });

  it("db.transaction apelat cu isolationLevel: serializable", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", totalQuantity: 50, reservedQuantity: 0 }]),
    );
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbExecuteMock.mockResolvedValue(undefined);

    await stockReserveCreateProcessor(
      makeF34Job({
        tenantId: "t1",
        inventoryId: "inv-1",
        negotiationId: "neg-1",
        quantity: 5,
        negotiationState: "NEGOTIATION",
      }),
      {} as never,
    );

    expect(dbTransactionMock).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "serializable",
    });
  });

  it("PROPOSAL state → expiresAt ≈ 30 min de acum", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", totalQuantity: 100, reservedQuantity: 0 }]),
    );
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbExecuteMock.mockResolvedValue(undefined);

    const before = Date.now();
    const result = await stockReserveCreateProcessor(
      makeF34Job({
        tenantId: "t1",
        inventoryId: "inv-1",
        negotiationId: "neg-1",
        quantity: 1,
        negotiationState: "PROPOSAL",
      }),
      {} as never,
    );
    const after = Date.now();

    expect(result.expiresAt).toBeTruthy();
    const expiresTs = result.expiresAt ? new Date(result.expiresAt).getTime() : 0;
    const expectedMin = before + RESERVATION_TTL_MS.PROPOSAL - 1000;
    const expectedMax = after + RESERVATION_TTL_MS.PROPOSAL + 1000;
    expect(expiresTs).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresTs).toBeLessThanOrEqual(expectedMax);
  });

  it("PROFORMA_SENT state → expiresAt ≈ 7 zile de acum", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-2", totalQuantity: 100, reservedQuantity: 0 }]),
    );
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbExecuteMock.mockResolvedValue(undefined);

    const before = Date.now();
    const result = await stockReserveCreateProcessor(
      makeF34Job({
        tenantId: "t1",
        inventoryId: "inv-2",
        negotiationId: "neg-2",
        quantity: 1,
        negotiationState: "PROFORMA_SENT",
      }),
      {} as never,
    );

    const expiresTs = result.expiresAt ? new Date(result.expiresAt).getTime() : 0;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresTs).toBeGreaterThan(before + sevenDaysMs - 2000);
  });

  it("reservationId returnat este UUID valid", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", totalQuantity: 100, reservedQuantity: 0 }]),
    );
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbExecuteMock.mockResolvedValue(undefined);

    const result = await stockReserveCreateProcessor(
      makeF34Job({
        tenantId: "t1",
        inventoryId: "inv-1",
        negotiationId: "neg-1",
        quantity: 1,
        negotiationState: "NEGOTIATION",
      }),
      {} as never,
    );

    expect(result.reservationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("available exact egal cu quantity → rezervare permisă (nu oversell)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", totalQuantity: 10, reservedQuantity: 0 }]),
    );
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbExecuteMock.mockResolvedValue(undefined);

    const result = await stockReserveCreateProcessor(
      makeF34Job({
        tenantId: "t1",
        inventoryId: "inv-1",
        negotiationId: "neg-1",
        quantity: 10, // exact cât e disponibil
        negotiationState: "CLOSING",
      }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.quantity).toBe(10);
  });
});

// =============================================================================
// computeExpiresAt — funcție pură exportată
// =============================================================================

describe("computeExpiresAt (F34 — funcție pură)", () => {
  it("PROPOSAL → ~30 min de acum", () => {
    const before = Date.now();
    const expires = computeExpiresAt("PROPOSAL");
    const after = Date.now();
    const expiresMs = expires.getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + RESERVATION_TTL_MS.PROPOSAL - 100);
    expect(expiresMs).toBeLessThanOrEqual(after + RESERVATION_TTL_MS.PROPOSAL + 100);
  });

  it("NEGOTIATION → ~2h de acum", () => {
    const expires = computeExpiresAt("NEGOTIATION");
    const twoHoursMs = 2 * 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThan(Date.now() + twoHoursMs - 1000);
  });

  it("CLOSING → ~24h de acum", () => {
    const expires = computeExpiresAt("CLOSING");
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThan(Date.now() + oneDayMs - 1000);
  });

  it("stare necunoscută → 1h fallback (defensiv)", () => {
    const expires = computeExpiresAt("DISCOVERY");
    const oneHourMs = 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThan(Date.now() + oneHourMs - 1000);
    expect(expires.getTime()).toBeLessThan(Date.now() + oneHourMs + 5000);
  });

  it("RESERVATION_TTL_MS export conține toate 4 stările din plan", () => {
    expect(RESERVATION_TTL_MS.PROPOSAL).toBe(30 * 60 * 1000);
    expect(RESERVATION_TTL_MS.NEGOTIATION).toBe(2 * 60 * 60 * 1000);
    expect(RESERVATION_TTL_MS.CLOSING).toBe(24 * 60 * 60 * 1000);
    expect(RESERVATION_TTL_MS.PROFORMA_SENT).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

// =============================================================================
// F35 — stock:reserve:release
// =============================================================================

describe("F35 — stockReserveReleaseProcessor", () => {
  it("1 rezervare expirată → UPDATE EXPIRED + UPDATE inventar, releasedCount=1", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "res-1",
          tenantId: "t1",
          inventoryId: "inv-1",
          quantity: 5,
        },
      ]),
    );
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const result = await stockReserveReleaseProcessor(makeF35Job({ tenantId: "t1" }), {} as never);

    expect(result.ok).toBe(true);
    expect(result.releasedCount).toBe(1);
    // UPDATE EXPIRED (1) + UPDATE inventar (1) = 2 UPDATE-uri
    expect(dbUpdateMock).toHaveBeenCalledTimes(2);
  });

  it("nicio rezervare expirată → releasedCount=0, fără UPDATE-uri", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const result = await stockReserveReleaseProcessor(makeF35Job({ tenantId: "t1" }), {} as never);

    expect(result.ok).toBe(true);
    expect(result.releasedCount).toBe(0);
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("quantity=null în rezervare → UPDATE EXPIRED dar fără UPDATE inventar", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "res-null",
          tenantId: "t1",
          inventoryId: "inv-1",
          quantity: null, // null → qty=0 → skip UPDATE inventar
        },
      ]),
    );
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const result = await stockReserveReleaseProcessor(makeF35Job({ tenantId: "t1" }), {} as never);

    expect(result.releasedCount).toBe(1);
    // Doar UPDATE EXPIRED (1), fără UPDATE inventar
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("2 rezervări expirate → releasedCount=2, 4 UPDATE-uri total", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { id: "res-1", tenantId: "t1", inventoryId: "inv-1", quantity: 3 },
        { id: "res-2", tenantId: "t1", inventoryId: "inv-2", quantity: 7 },
      ]),
    );
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const result = await stockReserveReleaseProcessor(makeF35Job({ tenantId: "t1" }), {} as never);

    expect(result.releasedCount).toBe(2);
    expect(dbUpdateMock).toHaveBeenCalledTimes(4); // 2 EXPIRED + 2 inventar
  });

  it("tenantId furnizat → setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await stockReserveReleaseProcessor(makeF35Job({ tenantId: "t-abc" }), {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-abc");
  });

  it("fără tenantId → setSessionTenantId NU e apelat", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await stockReserveReleaseProcessor(makeF35Job({}), {} as never);

    expect(setSessionTenantIdMock).not.toHaveBeenCalled();
  });
});

// =============================================================================
// F36 — stock:sync:erp
// =============================================================================

describe("F36 — stockSyncErpProcessor", () => {
  it("fără items (CRON STUB) → syncedCount=0, note=erp-sync-stub", async () => {
    const result = await stockSyncErpProcessor(makeF36Job({ tenantId: "t1" }), {} as never);

    expect(result.ok).toBe(true);
    expect(result.syncedCount).toBe(0);
    expect(result.note).toBe("erp-sync-stub");
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("items=[] → syncedCount=0, stub", async () => {
    const result = await stockSyncErpProcessor(
      makeF36Job({ tenantId: "t1", items: [] }),
      {} as never,
    );

    expect(result.syncedCount).toBe(0);
    expect(result.note).toBe("erp-sync-stub");
  });

  it("item existent → UPDATE (nu INSERT)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "inv-existing" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const result = await stockSyncErpProcessor(
      makeF36Job({
        tenantId: "t1",
        items: [{ sku: "SKU-X", productId: "prod-1", totalQuantity: 50 }],
      }),
      {} as never,
    );

    expect(result.syncedCount).toBe(1);
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("item nou → INSERT (nu UPDATE)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([])); // inexistent
    dbInsertMock.mockReturnValue(makeInsertChain());

    const result = await stockSyncErpProcessor(
      makeF36Job({
        tenantId: "t1",
        items: [{ sku: "SKU-NEW", productId: "prod-new", totalQuantity: 30 }],
      }),
      {} as never,
    );

    expect(result.syncedCount).toBe(1);
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("2 items (1 existent + 1 nou) → syncedCount=2, 1 UPDATE + 1 INSERT", async () => {
    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ id: "inv-1" }])) // existent
      .mockReturnValueOnce(makeSelectChain([])); // nou
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const result = await stockSyncErpProcessor(
      makeF36Job({
        tenantId: "t1",
        items: [
          { sku: "SKU-A", productId: "prod-A", totalQuantity: 20 },
          { sku: "SKU-B", productId: "prod-B", totalQuantity: 10 },
        ],
      }),
      {} as never,
    );

    expect(result.syncedCount).toBe(2);
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    await stockSyncErpProcessor(makeF36Job({ tenantId: "t-sync" }), {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-sync");
  });
});

// =============================================================================
// F37 — stock:low:alert
// =============================================================================

describe("F37 — stockLowAlertProcessor", () => {
  it("niciun produs cu stoc scăzut → alerts=[], 0 counts", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const result = await stockLowAlertProcessor(makeF37Job({}), {} as never);

    expect(result.ok).toBe(true);
    expect(result.alerts).toHaveLength(0);
    expect(result.lowStockCount).toBe(0);
    expect(result.outOfStockCount).toBe(0);
  });

  it("produs cu stoc disponibil=3, threshold=10 → LOW_STOCK", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "inv-1",
          tenantId: "t1",
          productId: "prod-1",
          sku: "SKU-001",
          totalQuantity: 8,
          reservedQuantity: 5,
        },
      ]),
    );

    const result = await stockLowAlertProcessor(makeF37Job({ tenantId: "t1" }), {} as never);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].status).toBe("LOW_STOCK");
    expect(result.alerts[0].available).toBe(3);
    expect(result.lowStockCount).toBe(1);
    expect(result.outOfStockCount).toBe(0);
  });

  it("produs cu available=0 → OUT_OF_STOCK", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "inv-2",
          tenantId: "t1",
          productId: "prod-2",
          sku: "SKU-002",
          totalQuantity: 5,
          reservedQuantity: 5,
        },
      ]),
    );

    const result = await stockLowAlertProcessor(makeF37Job({ tenantId: "t1" }), {} as never);

    expect(result.alerts[0].status).toBe("OUT_OF_STOCK");
    expect(result.alerts[0].available).toBe(0);
    expect(result.outOfStockCount).toBe(1);
    expect(result.lowStockCount).toBe(0);
  });

  it("produse mixte (LOW_STOCK + OUT_OF_STOCK) → contorizate separat", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "inv-1",
          tenantId: "t1",
          productId: "p1",
          sku: "S1",
          totalQuantity: 3,
          reservedQuantity: 0,
        }, // LOW_STOCK
        {
          id: "inv-2",
          tenantId: "t1",
          productId: "p2",
          sku: "S2",
          totalQuantity: 5,
          reservedQuantity: 5,
        }, // OUT_OF_STOCK
      ]),
    );

    const result = await stockLowAlertProcessor(
      makeF37Job({ tenantId: "t1", lowStockThreshold: 5 }),
      {} as never,
    );

    expect(result.lowStockCount).toBe(1);
    expect(result.outOfStockCount).toBe(1);
    expect(result.alerts).toHaveLength(2);
  });

  it("DEFAULT_LOW_STOCK_THRESHOLD = 10", async () => {
    // Verificăm că threshold implicit este 10 (din plan)
    const { DEFAULT_LOW_STOCK_THRESHOLD } = await import("../workers/f37-stock-low-alert.js");
    expect(DEFAULT_LOW_STOCK_THRESHOLD).toBe(10);
  });

  it("tenantId furnizat → setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await stockLowAlertProcessor(makeF37Job({ tenantId: "t-alert" }), {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-alert");
  });

  it("fără tenantId → setSessionTenantId NU e apelat", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await stockLowAlertProcessor(makeF37Job({}), {} as never);

    expect(setSessionTenantIdMock).not.toHaveBeenCalled();
  });

  it("available negativ (reserved > total) → clampat la 0 → OUT_OF_STOCK", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "inv-3",
          tenantId: "t1",
          productId: "p3",
          sku: "S3",
          totalQuantity: 2,
          reservedQuantity: 10, // rezervat > total (inconsistență DB)
        },
      ]),
    );

    const result = await stockLowAlertProcessor(makeF37Job({}), {} as never);

    expect(result.alerts[0].available).toBe(0); // clampat la 0
    expect(result.alerts[0].status).toBe("OUT_OF_STOCK");
  });
});

// =============================================================================
// F38 — stock:replenish:request
// =============================================================================

describe("F38 — stockReplenishRequestProcessor", () => {
  it("cerere reaprovizionare reușită → ok=true, inventoryId și requestedQuantity returnate", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "inv-1",
          sku: "SKU-001",
          totalQuantity: 5,
          reservedQuantity: 3,
        },
      ]),
    );
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "2" }] });

    const result = await stockReplenishRequestProcessor(
      makeF38Job({
        tenantId: "t1",
        inventoryId: "inv-1",
        requestedQuantity: 50,
        requestedBy: "user-manager",
        reason: "Stoc epuizat în 2 zile",
      }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.inventoryId).toBe("inv-1");
    expect(result.requestedQuantity).toBe(50);
    expect(result.note).toBe("replenish-request-stub");
  });

  it("inventory negăsit → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      stockReplenishRequestProcessor(
        makeF38Job({
          tenantId: "t1",
          inventoryId: "inv-missing",
          requestedQuantity: 20,
          requestedBy: "user-1",
        }),
        {} as never,
      ),
    ).rejects.toThrow("inventory inv-missing negăsit");
  });

  it("requestedQuantity <= 0 → throw fără DB calls", async () => {
    await expect(
      stockReplenishRequestProcessor(
        makeF38Job({
          tenantId: "t1",
          inventoryId: "inv-1",
          requestedQuantity: 0,
          requestedBy: "user-1",
        }),
        {} as never,
      ),
    ).rejects.toThrow("requestedQuantity trebuie să fie > 0");

    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", sku: "SKU-T", totalQuantity: 10, reservedQuantity: 2 }]),
    );
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "8" }] });

    await stockReplenishRequestProcessor(
      makeF38Job({
        tenantId: "t-replenish",
        inventoryId: "inv-1",
        requestedQuantity: 100,
        requestedBy: "admin",
      }),
      {} as never,
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-replenish");
  });

  it("currentAvailable calculat corect din totalQuantity - reservedQuantity", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", sku: "SKU-C", totalQuantity: 20, reservedQuantity: 8 }]),
    );
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "12" }] });

    const result = await stockReplenishRequestProcessor(
      makeF38Job({
        tenantId: "t1",
        inventoryId: "inv-1",
        requestedQuantity: 30,
        requestedBy: "user-1",
      }),
      {} as never,
    );

    // confirmedAvailable vine din get_available_stock (dacă sku există)
    expect(result.currentAvailable).toBe(12);
  });

  it("sku=null în DB → currentAvailable din calcul direct, fără get_available_stock", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "inv-1", sku: null, totalQuantity: 15, reservedQuantity: 3 }]),
    );
    dbExecuteMock.mockResolvedValue({ rows: [{ get_available_stock: "0" }] });

    const result = await stockReplenishRequestProcessor(
      makeF38Job({
        tenantId: "t1",
        inventoryId: "inv-1",
        requestedQuantity: 50,
        requestedBy: "user-1",
      }),
      {} as never,
    );

    // Când sku=null, confirmedAvailable = currentAvailable = 15-3=12
    expect(result.currentAvailable).toBe(12);
  });
});
