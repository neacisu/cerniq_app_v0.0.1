import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardKpiStream } from "@/hooks/use-dashboard-kpi-stream.js";

vi.mock("@/lib/api.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/api.js")>();
  return {
    ...mod,
    getStoredToken: vi.fn(() => "tok"),
  };
});

describe("useDashboardKpiStream", () => {
  const EsInstances: {
    url: string;
    close: ReturnType<typeof vi.fn>;
    onopen?: () => void;
    onmessage?: (ev: { data: string }) => void;
    onerror?: () => void;
  }[] = [];

  beforeEach(() => {
    EsInstances.length = 0;
    class EventSourceMock {
      url: string;
      onopen?: () => void;
      onmessage?: (ev: { data: string }) => void;
      onerror?: () => void;
      close = vi.fn();
      constructor(url: string) {
        this.url = url;
        EsInstances.push(this);
        queueMicrotask(() => this.onopen?.());
      }
    }
    vi.stubGlobal("EventSource", EventSourceMock as unknown as typeof EventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deschide EventSource și scrie KPI în cache la mesaj valid", async () => {
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDashboardKpiStream(true), { wrapper });

    await waitFor(() => {
      expect(result.current.sseConnected).toBe(true);
    });

    expect(EsInstances.length).toBeGreaterThan(0);
    const es = EsInstances[0];
    expect(es.url).toContain("kpi-stream");
    expect(es.url).toContain("token=");

    const payload = {
      type: "kpi",
      data: {
        bronze: { total: 0, pending: 0, processing: 0, promoted: 0 },
        silver: { total: 0, pending: 0, inProgress: 0, complete: 0, eligible: 0 },
        gold: { total: 0, cold: 0, engaged: 0, converted: 0 },
        approvals: { pending: 0, overdue: 0 },
        errors: { last24h: 0, critical: 0 },
        pipeline: { queueDepth: 0, failingQueues: 0 },
        hitl: { pending: 0, resolvedToday: 0, overdue: 0 },
        quality: { avgScore: 0, eligible: 0, blocked: 0 },
      },
    };
    es.onmessage?.({ data: JSON.stringify(payload) });

    await waitFor(() => {
      const cached = qc.getQueryData(["etapa1", "dashboard", "stats"]);
      expect(cached).toMatchObject({ success: true, data: payload.data });
    });

    es.onerror?.();
    await waitFor(() => {
      expect(result.current.sseConnected).toBe(false);
    });
  });

  it("nu deschide fără token", async () => {
    const { getStoredToken } = await import("@/lib/api.js");
    vi.mocked(getStoredToken).mockReturnValueOnce(null);

    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    renderHook(() => useDashboardKpiStream(true), { wrapper });
    expect(EsInstances.length).toBe(0);
  });
});
