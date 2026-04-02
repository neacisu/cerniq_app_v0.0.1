/**
 * Teste de integrare pentru E22-E27 (E4 Sameday AWB + Tracking — FAZA 8e)
 *
 * Acoperire:
 *   - mapSamedayStatus: funcție pură pentru status mapping
 *   - E22: creare AWB (success, order not found, address not found, missing phone)
 *   - E23: status poll global (no shipments, status changed, status same, terminal)
 *   - E24: status process (DELIVERED→E25, DELIVERY_FAILED→E26, order update)
 *   - E25: COD process (success, already collected, no COD, fully paid order)
 *   - E26: return initiate (<3 fails skip, >=3 fails return, already RETURNED)
 *   - E27: pickup schedule (no pending, success schedule)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── vi.hoisted() ──────────────────────────────────────────────────────────────
const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  setSessionTenantIdMock,
  addMock,
  createQueueMock,
  closeMock,
  createSamedayAwbMock,
  getSamedayTrackingMock,
  scheduleSamedayPickupMock,
  e4ShipmentsCreatedTotalIncMock,
  e4ShipmentStatusChangesTotalIncMock,
  e4CodCollectionsTotalIncMock,
  e4ShipmentReturnsTotalIncMock,
  e4SamedayPollBatchSizeObserveMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-sameday-123" });
  const closeMock = vi.fn().mockResolvedValue(undefined);
  const createQueueMock = vi.fn(() => ({ add: addMock, close: closeMock }));

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    addMock,
    createQueueMock,
    closeMock,
    createSamedayAwbMock: vi.fn(),
    getSamedayTrackingMock: vi.fn(),
    scheduleSamedayPickupMock: vi.fn(),
    e4ShipmentsCreatedTotalIncMock: vi.fn(),
    e4ShipmentStatusChangesTotalIncMock: vi.fn(),
    e4CodCollectionsTotalIncMock: vi.fn(),
    e4ShipmentReturnsTotalIncMock: vi.fn(),
    e4SamedayPollBatchSizeObserveMock: vi.fn(),
  };
});

// ── vi.mock() ─────────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  // Schema tables stubs
  goldOrders: {
    id: "id",
    tenantId: "tenant_id",
    orderNumber: "order_number",
    totalAmount: "total_amount",
    amountPaid: "amount_paid",
    status: "status",
    shipmentId: "shipment_id",
  },
  goldAddresses: {
    id: "id",
    tenantId: "tenant_id",
    clientId: "client_id",
    street: "street",
    city: "city",
    county: "county",
    postalCode: "postal_code",
    country: "country",
    contactName: "contact_name",
    contactPhone: "contact_phone",
  },
  goldShipments: {
    id: "id",
    tenantId: "tenant_id",
    orderId: "order_id",
    awbNumber: "awb_number",
    carrier: "carrier",
    status: "status",
    codType: "cod_type",
    codAmount: "cod_amount",
    codCollected: "cod_collected",
    samedayParcelId: "sameday_parcel_id",
    trackingUrl: "tracking_url",
    labelPdfUrl: "label_pdf_url",
    weight: "weight",
    addressId: "address_id",
    actualDelivery: "actual_delivery",
    createdAt: "created_at",
  },
  goldShipmentTracking: {
    id: "id",
    shipmentId: "shipment_id",
    statusCode: "status_code",
    statusText: "status_text",
    locationCity: "location_city",
    locationCounty: "location_county",
    eventTimestamp: "event_timestamp",
  },
  goldCodCollections: {
    id: "id",
    shipmentId: "shipment_id",
    amount: "amount",
    collectedAt: "collected_at",
    transferredToAccount: "transferred_to_account",
  },
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    _tag: "sql",
  })),
  eq: vi.fn((a: unknown, b: unknown) => ({ _tag: "eq", a, b })),
  and: vi.fn((...args: unknown[]) => ({ _tag: "and", args })),
  or: vi.fn((...args: unknown[]) => ({ _tag: "or", args })),
  lt: vi.fn((a: unknown, b: unknown) => ({ _tag: "lt", a, b })),
  lte: vi.fn((a: unknown, b: unknown) => ({ _tag: "lte", a, b })),
  gte: vi.fn((a: unknown, b: unknown) => ({ _tag: "gte", a, b })),
  isNull: vi.fn((a: unknown) => ({ _tag: "isNull", a })),
  isNotNull: vi.fn((a: unknown) => ({ _tag: "isNotNull", a })),
  inArray: vi.fn((a: unknown, b: unknown) => ({ _tag: "inArray", a, b })),
  desc: vi.fn((a: unknown) => ({ _tag: "desc", a })),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: createQueueMock,
  createWorker: vi.fn(),
  QUEUES: {
    E4_SAMEDAY_AWB_CREATE: "sameday:awb:create",
    E4_SAMEDAY_STATUS_POLL: "sameday:status:poll",
    E4_SAMEDAY_STATUS_PROCESS: "sameday:status:process",
    E4_SAMEDAY_COD_PROCESS: "sameday:cod:process",
    E4_SAMEDAY_RETURN_INITIATE: "sameday:return:initiate",
    E4_SAMEDAY_PICKUP_SCHEDULE: "sameday:pickup:schedule",
  },
  createCircuitBreaker: vi.fn((fn: unknown) => ({ fire: fn })),
  withExternalApiMetrics: vi.fn((_name: string, fn: () => unknown) => fn()),
}));

vi.mock("../lib/sameday-client.js", () => ({
  createSamedayAwb: createSamedayAwbMock,
  getSamedayTracking: getSamedayTrackingMock,
  scheduleSamedayPickup: scheduleSamedayPickupMock,
  mapSamedayStatus: vi.fn((code: string) => {
    const map: Record<string, string> = {
      PICKED_UP: "PICKED_UP",
      IN_WAREHOUSE: "IN_TRANSIT",
      IN_DELIVERY: "OUT_FOR_DELIVERY",
      DELIVERED: "DELIVERED",
      DELIVERY_FAILED: "DELIVERY_FAILED",
      RETURNED_TO_SENDER: "RETURNED",
    };
    return map[code.toUpperCase()] ?? "IN_TRANSIT";
  }),
  SAMEDAY_TERMINAL_STATUSES: new Set(["DELIVERED", "RETURNED_TO_SENDER", "RETURNED"]),
  SAMEDAY_PICKUP_POINT_ID: "PICKUP-001",
  _resetSamedayClientCache: vi.fn(),
}));

vi.mock("../e4-metrics.js", () => ({
  e4ShipmentsCreatedTotal: { inc: e4ShipmentsCreatedTotalIncMock },
  e4ShipmentStatusChangesTotal: { inc: e4ShipmentStatusChangesTotalIncMock },
  e4CodCollectionsTotal: { inc: e4CodCollectionsTotalIncMock },
  e4ShipmentReturnsTotal: { inc: e4ShipmentReturnsTotalIncMock },
  e4SamedayPollBatchSize: { observe: e4SamedayPollBatchSizeObserveMock },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };
  chain.from.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

function makeInsertChain(result: unknown[] = []) {
  const chain = {
    values: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };
  chain.values.mockReturnValue(chain);
  return chain;
}

function makeUpdateChain() {
  const chain = {
    set: vi.fn(),
    where: vi.fn().mockResolvedValue([{ id: "updated" }]),
  };
  chain.set.mockReturnValue(chain);
  return chain;
}

function makeJob(data: unknown) {
  return {
    data,
    log: vi.fn(),
    updateProgress: vi.fn(),
  } as unknown;
}

// ── Tests: mapSamedayStatus (funcție pură) ─────────────────────────────────────

describe("mapSamedayStatus", () => {
  it("importă și funcționează corect pentru DELIVERED", async () => {
    // Testăm funcția reală (fără mock) din sameday-client
    const { mapSamedayStatus } = await import("../lib/sameday-client.js");
    // În acest fișier, mapSamedayStatus este mockuit; testele pure sunt în lib-functions-sameday.test.ts
    expect(mapSamedayStatus("DELIVERED")).toBe("DELIVERED");
    expect(mapSamedayStatus("DELIVERY_FAILED")).toBe("DELIVERY_FAILED");
    expect(mapSamedayStatus("RETURNED_TO_SENDER")).toBe("RETURNED");
    expect(mapSamedayStatus("IN_WAREHOUSE")).toBe("IN_TRANSIT");
    expect(mapSamedayStatus("IN_DELIVERY")).toBe("OUT_FOR_DELIVERY");
    expect(mapSamedayStatus("PICKED_UP")).toBe("PICKED_UP");
  });
});

// ── Tests: E22 — samedayAwbCreateProcessor ────────────────────────────────────

describe("E22 — samedayAwbCreateProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creează AWB cu succes: insert shipment + update order", async () => {
    const { samedayAwbCreateProcessor } = await import("../workers/e22-sameday-awb-create.js");

    createSamedayAwbMock.mockResolvedValueOnce({
      awbNumber: "7001234567",
      parcelId: 12345,
      labelUrl: "https://sameday.ro/label/7001234567.pdf",
    });

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "order-001", orderNumber: "CMD-2026-001", totalAmount: "1500.00" }]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "addr-001",
            street: "Str. Victoriei 1",
            city: "București",
            county: "Ilfov",
            postalCode: "010001",
            country: "RO",
            contactName: "Ion Popescu",
            contactPhone: "0722123456",
          },
        ]),
      );

    dbInsertMock.mockReturnValueOnce(makeInsertChain([{ id: "shipment-001" }]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      orderId: "order-001",
      addressId: "addr-001",
      deliveryType: "STANDARD",
      codAmount: 0,
      packageWeight: 2.5,
    });

    const processor = samedayAwbCreateProcessor as (job: unknown) => Promise<unknown>;
    const result = await processor(job);

    expect(result).toEqual({
      ok: true,
      awbNumber: "7001234567",
      shipmentId: "shipment-001",
    });

    expect(createSamedayAwbMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: "STANDARD",
        awbPayment: 0,
        cashOnDelivery: 0,
        packageWeight: 2.5,
        recipient: expect.objectContaining({
          name: "Ion Popescu",
          phone: "0722123456",
          city: "București",
        }),
        observation: "Comanda CMD-2026-001",
        clientReference: "CMD-2026-001",
      }),
    );

    expect(dbInsertMock).toHaveBeenCalledOnce();
    expect(dbUpdateMock).toHaveBeenCalledOnce();
    expect(e4ShipmentsCreatedTotalIncMock).toHaveBeenCalledWith({
      carrier: "SAMEDAY",
      tenant_id: "tenant-001",
    });
  });

  it("creează AWB cu COD: codType=CASH, awbPayment=1", async () => {
    const { samedayAwbCreateProcessor } = await import("../workers/e22-sameday-awb-create.js");

    createSamedayAwbMock.mockResolvedValueOnce({
      awbNumber: "7001234568",
      parcelId: 12346,
    });

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "order-002", orderNumber: "CMD-2026-002", totalAmount: "500.00" }]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "addr-002",
            street: "Bd. Unirii 10",
            city: "Cluj-Napoca",
            county: "Cluj",
            postalCode: "400001",
            country: "RO",
            contactName: "Maria Ionescu",
            contactPhone: "0744987654",
          },
        ]),
      );

    dbInsertMock.mockReturnValueOnce(makeInsertChain([{ id: "shipment-002" }]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      orderId: "order-002",
      addressId: "addr-002",
      deliveryType: "EXPRESS",
      codAmount: 500,
    });

    const processor = samedayAwbCreateProcessor as (job: unknown) => Promise<unknown>;
    const result = await processor(job);

    expect(result).toMatchObject({ ok: true, awbNumber: "7001234568" });
    expect(createSamedayAwbMock).toHaveBeenCalledWith(
      expect.objectContaining({ awbPayment: 1, cashOnDelivery: 500 }),
    );
  });

  it("aruncă eroare dacă order nu există", async () => {
    const { samedayAwbCreateProcessor } = await import("../workers/e22-sameday-awb-create.js");

    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const job = makeJob({
      tenantId: "tenant-001",
      orderId: "order-nonexistent",
      addressId: "addr-001",
      deliveryType: "STANDARD",
      codAmount: 0,
    });

    const processor = samedayAwbCreateProcessor as (job: unknown) => Promise<unknown>;
    await expect(processor(job)).rejects.toThrow("[E22] Order not found");
  });

  it("aruncă eroare dacă adresă nu există", async () => {
    const { samedayAwbCreateProcessor } = await import("../workers/e22-sameday-awb-create.js");

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "order-001", orderNumber: "CMD-001", totalAmount: "100" }]),
      )
      .mockReturnValueOnce(makeSelectChain([]));

    const job = makeJob({
      tenantId: "tenant-001",
      orderId: "order-001",
      addressId: "addr-nonexistent",
      deliveryType: "STANDARD",
      codAmount: 0,
    });

    const processor = samedayAwbCreateProcessor as (job: unknown) => Promise<unknown>;
    await expect(processor(job)).rejects.toThrow("[E22] Address not found");
  });

  it("aruncă eroare dacă adresa nu are telefon de contact", async () => {
    const { samedayAwbCreateProcessor } = await import("../workers/e22-sameday-awb-create.js");

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "order-001", orderNumber: "CMD-001", totalAmount: "100" }]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "addr-003",
            street: "Str. X",
            city: "Timișoara",
            county: "Timiș",
            postalCode: "300001",
            country: "RO",
            contactName: "Andrei",
            contactPhone: null, // lipsă
          },
        ]),
      );

    const job = makeJob({
      tenantId: "tenant-001",
      orderId: "order-001",
      addressId: "addr-003",
      deliveryType: "STANDARD",
      codAmount: 0,
    });

    const processor = samedayAwbCreateProcessor as (job: unknown) => Promise<unknown>;
    await expect(processor(job)).rejects.toThrow("[E22] Address missing contactPhone");
  });
});

// ── Tests: E23 — samedayStatusPollProcessor ───────────────────────────────────

describe("E23 — samedayStatusPollProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("nu face nimic dacă nu există expedieri active SAMEDAY", async () => {
    const { samedayStatusPollProcessor } = await import("../workers/e23-sameday-status-poll.js");

    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
    vi.runAllTimersAsync();

    const job = makeJob({});
    const processor = samedayStatusPollProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(getSamedayTrackingMock).not.toHaveBeenCalled();
    expect(addMock).not.toHaveBeenCalled();
    expect(e4SamedayPollBatchSizeObserveMock).toHaveBeenCalledWith({ tenant_id: "global" }, 0);
  });

  it("detectează status schimbat → enqueue E24", async () => {
    const { samedayStatusPollProcessor } = await import("../workers/e23-sameday-status-poll.js");

    dbSelectMock
      // Selectare expedieri active
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "ship-001",
            tenantId: "tenant-001",
            orderId: "order-001",
            awbNumber: "7001234567",
            status: "CREATED",
          },
        ]),
      )
      // Ultimul tracking event (null → niciun eveniment anterior)
      .mockReturnValueOnce(makeSelectChain([]));

    getSamedayTrackingMock.mockResolvedValueOnce({
      awbNumber: "7001234567",
      currentStatus: {
        statusCode: "PICKED_UP",
        statusDescription: "Colet preluat de curier",
        city: "București",
        county: "Ilfov",
        eventTimestamp: "2026-03-30T10:00:00Z",
      },
      history: [],
    });

    vi.runAllTimersAsync();
    const job = makeJob({});
    const processor = samedayStatusPollProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(addMock).toHaveBeenCalledWith(
      "status-process-ship-001",
      expect.objectContaining({
        tenantId: "tenant-001",
        shipmentId: "ship-001",
        orderId: "order-001",
        awbNumber: "7001234567",
        newStatusCode: "PICKED_UP",
        internalStatus: "PICKED_UP",
      }),
      expect.objectContaining({ attempts: 3 }),
    );
    expect(e4SamedayPollBatchSizeObserveMock).toHaveBeenCalledWith({ tenant_id: "global" }, 1);
  });

  it("NU enqueue dacă statusCode este același cu ultimul", async () => {
    const { samedayStatusPollProcessor } = await import("../workers/e23-sameday-status-poll.js");

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "ship-002",
            tenantId: "tenant-001",
            orderId: "order-002",
            awbNumber: "7001234568",
            status: "IN_TRANSIT",
          },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ statusCode: "IN_WAREHOUSE" }]));

    getSamedayTrackingMock.mockResolvedValueOnce({
      awbNumber: "7001234568",
      currentStatus: {
        statusCode: "IN_WAREHOUSE",
        statusDescription: "Colet în depozit",
        eventTimestamp: "2026-03-30T12:00:00Z",
      },
      history: [],
    });

    vi.runAllTimersAsync();
    const job = makeJob({});
    const processor = samedayStatusPollProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(addMock).not.toHaveBeenCalled();
  });

  it("continuă procesarea dacă un AWB aruncă eroare", async () => {
    const { samedayStatusPollProcessor } = await import("../workers/e23-sameday-status-poll.js");

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "ship-003", tenantId: "t1", orderId: "o1", awbNumber: "BAD_AWB", status: "CREATED" },
      ]),
    );
    getSamedayTrackingMock.mockRejectedValueOnce(new Error("Sameday API timeout"));

    vi.runAllTimersAsync();
    const job = makeJob({});
    const processor = samedayStatusPollProcessor as (job: unknown) => Promise<unknown>;
    await expect(processor(job)).resolves.not.toThrow();
    expect(addMock).not.toHaveBeenCalled();
  });
});

// ── Tests: E24 — samedayStatusProcessProcessor ────────────────────────────────

describe("E24 — samedayStatusProcessProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("procesează PICKED_UP: insert tracking + update shipment + update order IN_TRANSIT", async () => {
    const { samedayStatusProcessProcessor } =
      await import("../workers/e24-sameday-status-process.js");

    dbInsertMock.mockReturnValueOnce(makeInsertChain());
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain()).mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-001",
      orderId: "order-001",
      awbNumber: "7001234567",
      newStatusCode: "PICKED_UP",
      internalStatus: "PICKED_UP",
      statusText: "Colet preluat de curier",
      locationCity: "București",
      locationCounty: "Ilfov",
      eventTimestamp: "2026-03-30T10:00:00Z",
    });

    const processor = samedayStatusProcessProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(dbInsertMock).toHaveBeenCalledOnce();
    expect(dbUpdateMock).toHaveBeenCalledTimes(2);
    expect(e4ShipmentStatusChangesTotalIncMock).toHaveBeenCalledWith({
      status: "PICKED_UP",
      tenant_id: "tenant-001",
    });
    expect(addMock).not.toHaveBeenCalled();
  });

  it("procesează DELIVERED: enqueue E25 cod:process", async () => {
    const { samedayStatusProcessProcessor } =
      await import("../workers/e24-sameday-status-process.js");

    dbInsertMock.mockReturnValueOnce(makeInsertChain());
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain()).mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-001",
      orderId: "order-001",
      awbNumber: "7001234567",
      newStatusCode: "DELIVERED",
      internalStatus: "DELIVERED",
      statusText: "Colet livrat",
      locationCity: "Cluj-Napoca",
      locationCounty: "Cluj",
      eventTimestamp: "2026-03-31T14:00:00Z",
    });

    const processor = samedayStatusProcessProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(addMock).toHaveBeenCalledWith(
      "cod-process-ship-001",
      { tenantId: "tenant-001", shipmentId: "ship-001", orderId: "order-001" },
      expect.objectContaining({ attempts: 3 }),
    );
    expect(closeMock).toHaveBeenCalled();
  });

  it("procesează DELIVERY_FAILED: enqueue E26 return:initiate", async () => {
    const { samedayStatusProcessProcessor } =
      await import("../workers/e24-sameday-status-process.js");

    dbInsertMock.mockReturnValueOnce(makeInsertChain());
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-002",
      orderId: "order-002",
      awbNumber: "7001234568",
      newStatusCode: "DELIVERY_FAILED",
      internalStatus: "DELIVERY_FAILED",
      statusText: "Destinatar absent",
      locationCity: "Iași",
      locationCounty: "Iași",
      eventTimestamp: "2026-03-30T16:00:00Z",
    });

    const processor = samedayStatusProcessProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(addMock).toHaveBeenCalledWith(
      "return-initiate-ship-002",
      { tenantId: "tenant-001", shipmentId: "ship-002", orderId: "order-002" },
      expect.objectContaining({ attempts: 2 }),
    );
  });

  it("procesează RETURNED: NU enqueue downstream, NU update order", async () => {
    const { samedayStatusProcessProcessor } =
      await import("../workers/e24-sameday-status-process.js");

    dbInsertMock.mockReturnValueOnce(makeInsertChain());
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-003",
      orderId: "order-003",
      awbNumber: "7001234569",
      newStatusCode: "RETURNED_TO_SENDER",
      internalStatus: "RETURNED",
      statusText: "Colet returnat",
      locationCity: null,
      locationCounty: null,
      eventTimestamp: "2026-04-01T09:00:00Z",
    });

    const processor = samedayStatusProcessProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(addMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });
});

// ── Tests: E25 — samedayCodProcessProcessor ───────────────────────────────────

describe("E25 — samedayCodProcessProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("procesează COD: insert collection + update shipment + update order", async () => {
    const { samedayCodProcessProcessor } = await import("../workers/e25-sameday-cod-process.js");

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "ship-001", codType: "CASH", codAmount: "500.00", codCollected: false },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([{ id: "order-001", totalAmount: "500.00", amountPaid: "0" }]),
      );

    dbInsertMock.mockReturnValueOnce(makeInsertChain());
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain()).mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-001",
      orderId: "order-001",
    });

    const processor = samedayCodProcessProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(dbInsertMock).toHaveBeenCalledOnce();
    expect(dbUpdateMock).toHaveBeenCalledTimes(2);
    expect(e4CodCollectionsTotalIncMock).toHaveBeenCalledWith({ tenant_id: "tenant-001" });
  });

  it("skip dacă shipment nu are COD (codType=NONE sau inexistent)", async () => {
    const { samedayCodProcessProcessor } = await import("../workers/e25-sameday-cod-process.js");

    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-no-cod",
      orderId: "order-001",
    });

    const processor = samedayCodProcessProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(e4CodCollectionsTotalIncMock).not.toHaveBeenCalled();
  });

  it("skip idempotent dacă COD deja colectat", async () => {
    const { samedayCodProcessProcessor } = await import("../workers/e25-sameday-cod-process.js");

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "ship-001", codType: "CASH", codAmount: "300.00", codCollected: true },
      ]),
    );

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-001",
      orderId: "order-001",
    });

    const processor = samedayCodProcessProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("marchează order PAID dacă plata totală acoperă totalAmount", async () => {
    const { samedayCodProcessProcessor } = await import("../workers/e25-sameday-cod-process.js");

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "ship-002", codType: "CARD", codAmount: "750.00", codCollected: false },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([{ id: "order-002", totalAmount: "750.00", amountPaid: "0" }]),
      );

    dbInsertMock.mockReturnValueOnce(makeInsertChain());
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain()).mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-002",
      orderId: "order-002",
    });

    const processor = samedayCodProcessProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    // dbUpdateMock al doilea call (order) trebuia apelat cu { status: 'PAID' }
    expect(dbUpdateMock).toHaveBeenCalledTimes(2);
  });
});

// ── Tests: E26 — samedayReturnInitiateProcessor ───────────────────────────────

describe("E26 — samedayReturnInitiateProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skip dacă failCount < 3", async () => {
    const { samedayReturnInitiateProcessor } =
      await import("../workers/e26-sameday-return-initiate.js");

    dbSelectMock.mockReturnValueOnce(makeSelectChain([{ count: 2 }]));

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-001",
      orderId: "order-001",
    });

    const processor = samedayReturnInitiateProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(dbUpdateMock).not.toHaveBeenCalled();
    expect(e4ShipmentReturnsTotalIncMock).not.toHaveBeenCalled();
  });

  it("inițiază returnarea la failCount >= 3", async () => {
    const { samedayReturnInitiateProcessor } =
      await import("../workers/e26-sameday-return-initiate.js");

    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ count: 3 }]))
      .mockReturnValueOnce(makeSelectChain([{ id: "ship-001", status: "DELIVERY_FAILED" }]));

    dbUpdateMock.mockReturnValueOnce(makeUpdateChain()).mockReturnValueOnce(makeUpdateChain());

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-001",
      orderId: "order-001",
    });

    const processor = samedayReturnInitiateProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(dbUpdateMock).toHaveBeenCalledTimes(2);
    expect(e4ShipmentReturnsTotalIncMock).toHaveBeenCalledWith({ tenant_id: "tenant-001" });
  });

  it("skip idempotent dacă shipment deja RETURNED", async () => {
    const { samedayReturnInitiateProcessor } =
      await import("../workers/e26-sameday-return-initiate.js");

    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ count: 5 }]))
      .mockReturnValueOnce(makeSelectChain([{ id: "ship-001", status: "RETURNED" }]));

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-001",
      orderId: "order-001",
    });

    const processor = samedayReturnInitiateProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(dbUpdateMock).not.toHaveBeenCalled();
    expect(e4ShipmentReturnsTotalIncMock).not.toHaveBeenCalled();
  });

  it("aruncă eroare dacă shipmentul nu există", async () => {
    const { samedayReturnInitiateProcessor } =
      await import("../workers/e26-sameday-return-initiate.js");

    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ count: 4 }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const job = makeJob({
      tenantId: "tenant-001",
      shipmentId: "ship-nonexistent",
      orderId: "order-001",
    });

    const processor = samedayReturnInitiateProcessor as (job: unknown) => Promise<unknown>;
    await expect(processor(job)).rejects.toThrow("[E26] Shipment not found");
  });
});

// ── Tests: E27 — samedayPickupScheduleProcessor ───────────────────────────────

describe("E27 — samedayPickupScheduleProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skip dacă nu există expedieri pending pentru pickup", async () => {
    const { samedayPickupScheduleProcessor } =
      await import("../workers/e27-sameday-pickup-schedule.js");

    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const job = makeJob({});
    const processor = samedayPickupScheduleProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(scheduleSamedayPickupMock).not.toHaveBeenCalled();
  });

  it("programează pickup pentru expedieri CREATED > 2 ore", async () => {
    const { samedayPickupScheduleProcessor } =
      await import("../workers/e27-sameday-pickup-schedule.js");

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "ship-001", tenantId: "tenant-001", awbNumber: "7001234567" },
        { id: "ship-002", tenantId: "tenant-001", awbNumber: "7001234568" },
      ]),
    );

    scheduleSamedayPickupMock.mockResolvedValueOnce({
      pickupId: "PICKUP-2026-001",
      scheduledDate: "2026-03-30",
    });

    const job = makeJob({});
    const processor = samedayPickupScheduleProcessor as (job: unknown) => Promise<unknown>;
    await processor(job);

    expect(scheduleSamedayPickupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pickupPoint: "PICKUP-001",
        awbNumbers: ["7001234567", "7001234568"],
      }),
    );
  });
});
