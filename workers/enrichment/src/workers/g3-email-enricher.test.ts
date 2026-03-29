import { describe, it, expect, vi, beforeEach } from "vitest";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const CONTACT_ID = "33333333-3333-4333-8333-333333333333";
const EMAIL = "john.doe@example.com";

// ── DB mock ───────────────────────────────────────────────────────────────────

function createDbMock(contactOverrides: Record<string, unknown> = {}) {
  const whereFn = vi.fn(async () => undefined);
  const setFn = vi.fn((_v: unknown) => ({ where: whereFn }));
  const insertValuesFn = vi.fn(async () => undefined);
  return {
    query: {
      silverContacts: {
        findFirst: vi.fn(async () => ({
          id: CONTACT_ID,
          tenantId: TENANT_ID,
          email: EMAIL,
          prenume: null,
          nume: null,
          functie: null,
          ...contactOverrides,
        })),
      },
    },
    update: vi.fn(() => ({ set: setFn })),
    insert: vi.fn(() => ({ values: insertValuesFn })),
    _setFn: setFn,
    _insertValues: insertValuesFn,
  };
}

// ── Shared module mocks ───────────────────────────────────────────────────────

function mockWorkerShared(
  withExternalApiMetricsImpl?: (provider: string, fn: () => unknown) => unknown,
) {
  const withExternalApiMetrics =
    withExternalApiMetricsImpl ?? vi.fn(async (_provider: string, fn: () => unknown) => fn());

  vi.doMock("@cerniq/worker-shared", () => ({
    createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
      fire: (...args: unknown[]) => fn(...args),
      on: vi.fn(),
    })),
    withExternalApiMetrics,
    withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
    importMutationTotal: { inc: vi.fn() },
  }));
  return withExternalApiMetrics;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("g3-email-enricher: withExternalApiMetrics wrapping", () => {
  it("wraps Clearbit fetch with withExternalApiMetrics('clearbit', ...)", async () => {
    const dbMock = createDbMock();
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverContacts: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
        parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
    }));

    const callsRecorded: string[] = [];
    const withExternalApiMetrics = vi.fn(async (provider: string, fn: () => unknown) => {
      callsRecorded.push(provider);
      return fn();
    });

    vi.doMock("@cerniq/worker-shared", () => ({
      createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
        fire: (...args: unknown[]) => fn(...args),
        on: vi.fn(),
      })),
      withExternalApiMetrics,
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
      importMutationTotal: { inc: vi.fn() },
    }));

    process.env.CLEARBIT_API_KEY = "test-clearbit-key";
    process.env.FULLCONTACT_API_KEY = "test-fullcontact-key";

    // Mock fetch globally to return stub responses
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("clearbit")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              person: {
                name: { givenName: "John", familyName: "Doe" },
                employment: { title: "CTO" },
              },
            }),
          };
        }
        if (String(url).includes("fullcontact")) {
          return { ok: true, status: 200, json: async () => ({ details: { title: "CTO" } }) };
        }
        return { ok: false, status: 500 };
      }),
    );

    const { emailEnricherProcessor } = await import("./g3-email-enricher.js");
    await emailEnricherProcessor({
      id: "g3-j1",
      data: { tenantId: TENANT_ID, contactId: CONTACT_ID, email: EMAIL },
    } as never);

    expect(callsRecorded).toContain("clearbit");
    expect(callsRecorded).toContain("fullcontact");
    expect(withExternalApiMetrics).toHaveBeenCalledWith("clearbit", expect.any(Function));
    expect(withExternalApiMetrics).toHaveBeenCalledWith("fullcontact", expect.any(Function));

    vi.unstubAllGlobals();
    delete process.env.CLEARBIT_API_KEY;
    delete process.env.FULLCONTACT_API_KEY;
  });

  it("skips Clearbit fetch when CLEARBIT_API_KEY is not set", async () => {
    const dbMock = createDbMock();
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverContacts: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
        parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
    }));

    const callsRecorded: string[] = [];
    const withExternalApiMetrics = vi.fn(async (provider: string, fn: () => unknown) => {
      callsRecorded.push(provider);
      return fn();
    });
    vi.doMock("@cerniq/worker-shared", () => ({
      createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
        fire: (...args: unknown[]) => fn(...args),
        on: vi.fn(),
      })),
      withExternalApiMetrics,
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
      importMutationTotal: { inc: vi.fn() },
    }));

    delete process.env.CLEARBIT_API_KEY;
    delete process.env.FULLCONTACT_API_KEY;

    const { emailEnricherProcessor } = await import("./g3-email-enricher.js");
    const result = await emailEnricherProcessor({
      id: "g3-j2",
      data: { tenantId: TENANT_ID, contactId: CONTACT_ID, email: EMAIL },
    } as never);

    // Neither API should have been called
    expect(callsRecorded).not.toContain("clearbit");
    expect(callsRecorded).not.toContain("fullcontact");
    expect(result).toMatchObject({ ok: true, status: "success" });
    // Gravatar is always populated (local — no API call)
    expect((result as Record<string, unknown>).sources).toContain("gravatar");
  });

  it("still succeeds and updates DB when both APIs fail (circuit breaker tripped)", async () => {
    const dbMock = createDbMock();
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverContacts: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
        parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
    }));

    vi.doMock("@cerniq/worker-shared", () => ({
      createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
        fire: (...args: unknown[]) => fn(...args),
        on: vi.fn(),
      })),
      withExternalApiMetrics: vi.fn(async () => {
        throw new Error("Circuit breaker open");
      }),
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
      importMutationTotal: { inc: vi.fn() },
    }));

    process.env.CLEARBIT_API_KEY = "test-key";
    process.env.FULLCONTACT_API_KEY = "test-key";

    const { emailEnricherProcessor } = await import("./g3-email-enricher.js");
    const result = await emailEnricherProcessor({
      id: "g3-j3",
      data: { tenantId: TENANT_ID, contactId: CONTACT_ID, email: EMAIL },
    } as never);

    // Errors are caught per-try-block; Gravatar still added; DB still updated
    expect(result).toMatchObject({ ok: true, status: "success" });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect((result as Record<string, unknown>).sources).toContain("gravatar");

    delete process.env.CLEARBIT_API_KEY;
    delete process.env.FULLCONTACT_API_KEY;
  });

  it("returns skipped when email is missing", async () => {
    const dbMock = createDbMock({ email: null });
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverContacts: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
        parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
    }));
    mockWorkerShared();

    const { emailEnricherProcessor } = await import("./g3-email-enricher.js");
    const result = await emailEnricherProcessor({
      id: "g3-j4",
      data: { tenantId: TENANT_ID, contactId: CONTACT_ID },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "skipped", reason: "missing_email" });
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it("returns not_found when contact does not exist", async () => {
    const dbMock = createDbMock();
    dbMock.query.silverContacts.findFirst.mockResolvedValueOnce(undefined as never);
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverContacts: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
        parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
    }));
    mockWorkerShared();

    const { emailEnricherProcessor } = await import("./g3-email-enricher.js");
    const result = await emailEnricherProcessor({
      id: "g3-j5",
      data: { tenantId: TENANT_ID, contactId: "non-existent" },
    } as never);

    expect(result).toMatchObject({ ok: false, status: "not_found" });
  });

  it("increments importMutationTotal after DB update", async () => {
    const dbMock = createDbMock();
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverContacts: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
        parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
    }));

    const incMock = vi.fn();
    vi.doMock("@cerniq/worker-shared", () => ({
      createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
        fire: (...args: unknown[]) => fn(...args),
        on: vi.fn(),
      })),
      withExternalApiMetrics: vi.fn(async (_p: string, fn: () => unknown) => fn()),
      withCognitiveSpan: vi.fn(async (_n: string, fn: (s: null) => unknown) => fn(null)),
      importMutationTotal: { inc: incMock },
    }));

    delete process.env.CLEARBIT_API_KEY;
    delete process.env.FULLCONTACT_API_KEY;

    const { emailEnricherProcessor } = await import("./g3-email-enricher.js");
    await emailEnricherProcessor({
      id: "g3-j6",
      data: { tenantId: TENANT_ID, contactId: CONTACT_ID, email: EMAIL },
    } as never);

    expect(incMock).toHaveBeenCalledWith({
      operation: "update",
      table: "silver_contacts",
      tenant_id: TENANT_ID,
    });
  });

  it("Gravatar hash is computed locally without withExternalApiMetrics", async () => {
    const dbMock = createDbMock();
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverContacts: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
        parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
    }));

    const withExternalApiMetrics = vi.fn(async (_p: string, fn: () => unknown) => fn());
    vi.doMock("@cerniq/worker-shared", () => ({
      createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
        fire: (...args: unknown[]) => fn(...args),
        on: vi.fn(),
      })),
      withExternalApiMetrics,
      withCognitiveSpan: vi.fn(async (_n: string, fn: (s: null) => unknown) => fn(null)),
      importMutationTotal: { inc: vi.fn() },
    }));

    delete process.env.CLEARBIT_API_KEY;
    delete process.env.FULLCONTACT_API_KEY;

    const { emailEnricherProcessor } = await import("./g3-email-enricher.js");
    await emailEnricherProcessor({
      id: "g3-j7",
      data: { tenantId: TENANT_ID, contactId: CONTACT_ID, email: EMAIL },
    } as never);

    // Gravatar does NOT go through withExternalApiMetrics — only clearbit and fullcontact do
    const apiCalls = withExternalApiMetrics.mock.calls.map((c) => c[0]);
    expect(apiCalls).not.toContain("gravatar");
  });
});
