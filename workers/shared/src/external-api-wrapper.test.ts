import { describe, it, expect, vi, beforeEach } from "vitest";

describe("callExternalApi", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("deschide circuitul după eșecuri repetate și respinge apeluri ulterioare (mesaj circuit deschis)", async () => {
    const { callExternalApi } = await import("./external-api-wrapper.js");
    const provider = `t-open-${Date.now()}`;
    const fail = async () => {
      throw new Error("upstream failure");
    };
    for (let i = 0; i < 6; i++) {
      try {
        await callExternalApi(provider, fail);
      } catch {
        /* așteptăm eșecuri */
      }
    }
    await expect(callExternalApi(provider, async () => "ok")).rejects.toThrow(
      /open|breaker|circuit/i,
    );
  });

  it("expune cerniq_circuit_breaker_state=1 când breaker-ul e deschis", async () => {
    const { callExternalApi } = await import("./external-api-wrapper.js");
    const { metricsRegistry } = await import("./metrics.js");
    const provider = `t-metric-${Date.now()}`;
    const fail = async () => {
      throw new Error("upstream failure");
    };
    for (let i = 0; i < 6; i++) {
      try {
        await callExternalApi(provider, fail);
      } catch {
        /* ignore */
      }
    }
    const metrics = await metricsRegistry.getMetricsAsJSON();
    const gauge = metrics.find((m) => m.name === "cerniq_circuit_breaker_state");
    expect(gauge?.type).toBe("gauge");
    const open = gauge?.values.find((v) => v.labels.provider === provider && Number(v.value) === 1);
    expect(open).toBeDefined();
  });

  it("după resetTimeout, succes închide circuitul (half-open → close)", async () => {
    vi.useFakeTimers();
    try {
      const { callExternalApi } = await import("./external-api-wrapper.js");
      const provider = `t-recover-${Date.now()}`;
      const fail = async () => {
        throw new Error("upstream failure");
      };
      for (let i = 0; i < 6; i++) {
        try {
          await callExternalApi(provider, fail);
        } catch {
          /* ignore */
        }
      }
      await expect(callExternalApi(provider, async () => "skip")).rejects.toThrow(
        /open|breaker|circuit/i,
      );
      await vi.advanceTimersByTimeAsync(31000);
      await expect(callExternalApi(provider, async () => "recovered")).resolves.toBe("recovered");
    } finally {
      vi.useRealTimers();
    }
  });
});
