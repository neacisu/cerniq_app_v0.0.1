import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const insertMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@cerniq/db", () => ({
  insertErrorLogRows: insertMock,
}));

describe("error-log-persist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue(undefined);
    vi.stubEnv("API_ERROR_LOG_IN_TEST", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parseOptionalUuid acceptă UUID valid", async () => {
    const { parseOptionalUuid } = await import("./error-log-persist.js");
    expect(parseOptionalUuid("00000000-0000-4000-8000-000000000001")).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(parseOptionalUuid("not-uuid")).toBeUndefined();
  });

  it("scheduleApiErrorLogPersist trimite rândul către insertErrorLogRows", async () => {
    const { scheduleApiErrorLogPersist } = await import("./error-log-persist.js");
    scheduleApiErrorLogPersist({
      tenantId: "00000000-0000-4000-8000-000000000099",
      correlationHeader: "00000000-0000-4000-8000-0000000000aa",
      traceId: "t1",
      spanId: "s1",
      errorId: "eid",
      enriched: {
        fingerprint: "fp",
        errorType: "permanent",
        causeChain: [{ name: "Error", message: "m" }],
        enrichedMessage: "hello",
      },
    });
    await vi.waitFor(() => expect(insertMock).toHaveBeenCalled());
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        fingerprint: "fp",
        errorType: "permanent",
        traceId: "t1",
        spanId: "s1",
        tenantId: "00000000-0000-4000-8000-000000000099",
        correlationId: "00000000-0000-4000-8000-0000000000aa",
        context: expect.objectContaining({ errorId: "eid" }),
      }),
    ]);
  });
});
