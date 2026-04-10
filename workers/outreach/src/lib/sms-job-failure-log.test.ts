import { describe, it, expect, vi } from "vitest";
import { logSmsJobFailureAndThrow } from "./sms-job-failure-log.js";

describe("logSmsJobFailureAndThrow", () => {
  it("înregistrează context + enrichError și re-aruncă eroarea", () => {
    const svcLogError = vi.fn();
    const jlog = { error: vi.fn() };
    const err = new Error("provider_timeout");
    expect(() =>
      logSmsJobFailureAndThrow(svcLogError, jlog, err, "SMS fatal", "sms_send", {
        tenantId: "t1",
        journeyId: "j1",
      }),
    ).toThrow("provider_timeout");

    expect(svcLogError).toHaveBeenCalledTimes(1);
    const [svcPayload] = svcLogError.mock.calls[0] as [Record<string, unknown>, string];
    expect(svcPayload.tenantId).toBe("t1");
    expect(svcPayload.journeyId).toBe("j1");
    expect(typeof svcPayload.fingerprint).toBe("string");
    expect(svcPayload.errorType).toBeDefined();

    expect(jlog.error).toHaveBeenCalledWith(
      "sms_send",
      "failed",
      expect.objectContaining({
        tenantId: "t1",
        journeyId: "j1",
        fingerprint: svcPayload.fingerprint,
      }),
    );
  });
});
