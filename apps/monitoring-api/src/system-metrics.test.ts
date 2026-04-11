import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

import { systemMetrics } from "./system-metrics.js";

describe("systemMetrics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("collect() agregă CPU, memorie, uptime și platformă", () => {
    vi.spyOn(os, "cpus").mockReturnValue([
      { model: "test-cpu", speed: 2400, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
    ] as ReturnType<typeof os.cpus>);
    vi.spyOn(os, "totalmem").mockReturnValue(1_000_000);
    vi.spyOn(os, "freemem").mockReturnValue(250_000);
    vi.spyOn(os, "loadavg").mockReturnValue([0.1, 0.2, 0.3]);
    vi.spyOn(os, "uptime").mockReturnValue(42);
    vi.spyOn(os, "platform").mockReturnValue("linux");
    vi.spyOn(os, "hostname").mockReturnValue("test-host");

    const { collect } = systemMetrics();
    const out = collect();

    expect(out.cpu.count).toBe(1);
    expect(out.cpu.model).toBe("test-cpu");
    expect(out.cpu.loadAvg).toEqual([0.1, 0.2, 0.3]);
    expect(out.memory.total).toBe(1_000_000);
    expect(out.memory.free).toBe(250_000);
    expect(out.memory.used).toBe(750_000);
    expect(out.memory.usagePercent).toBe("75.0");
    expect(out.uptime).toBe(42);
    expect(out.platform).toBe("linux");
    expect(out.hostname).toBe("test-host");
  });

  it("folosește model unknown când nu există CPU", () => {
    vi.spyOn(os, "cpus").mockReturnValue([]);
    vi.spyOn(os, "totalmem").mockReturnValue(8_000_000);
    vi.spyOn(os, "freemem").mockReturnValue(4_000_000);
    vi.spyOn(os, "loadavg").mockReturnValue([0, 0, 0]);
    vi.spyOn(os, "uptime").mockReturnValue(0);
    vi.spyOn(os, "platform").mockReturnValue("darwin");
    vi.spyOn(os, "hostname").mockReturnValue("h");

    const { collect } = systemMetrics();
    expect(collect().cpu.model).toBe("unknown");
  });
});
