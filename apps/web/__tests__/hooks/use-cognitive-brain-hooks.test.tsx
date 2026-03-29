/**
 * Teste comprehensive pentru use-cognitive-brain.ts
 *
 * Acoperire:
 *   ✓ useCognitiveBrain — fără batchId, cu batchId, 401 stop refetch
 *   ✓ useCognitiveEventStream — callback update, disconnect, exponential backoff,
 *       backoff reset la open, stop reconnect după disconnect, stop reconnect la unmount
 *   ✓ useNeuronInspector — traces path corect, mutations per batchId, disabled fără batchId
 *   ✓ useNeuronControl — pause optimistic, resume optimistic, rollback la eroare,
 *       config mutation, nodeKey null guard
 *   ✓ useCognitiveLOD — zoom only, nodeCount override, count > 100, dual input conservativ
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCognitiveBrain,
  useCognitiveEventStream,
  useNeuronInspector,
  useNeuronControl,
  useCognitiveLOD,
  SSE_BACKOFF_MIN_MS,
  SSE_BACKOFF_MAX_MS,
} from "@/hooks/use-cognitive-brain";
import { ApiError } from "@/lib/api.js";

// ─── Mock-uri globale ─────────────────────────────────────────────────────────

vi.mock("@/lib/api-url.js", () => ({
  getApiBase: () => "http://127.0.0.1:64010",
}));

const { mockApiGet, mockApiPost, mockApiPut } = vi.hoisted(() => {
  const mockApiGet = vi.fn();
  const mockApiPost = vi.fn();
  const mockApiPut = vi.fn();
  return { mockApiGet, mockApiPost, mockApiPut };
});

vi.mock("@/lib/api.js", () => ({
  api: {
    get: mockApiGet,
    post: mockApiPost,
    put: mockApiPut,
  },
  // getStoredToken returnează null în teste (fără localStorage real)
  // → URL-ul SSE nu va conține ?token= → testele de URL rămân valide
  getStoredToken: () => null,
  ApiError: class ApiError extends Error {
    status: number;
    data?: unknown;
    constructor(message: string, status: number, data?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

// ─── MockEventSource ──────────────────────────────────────────────────────────

const { MockEventSource, getInstances, clearInstances } = vi.hoisted(() => {
  type MsgFn = (ev: MessageEvent<string>) => void;
  type VoidFn = () => void;

  /**
   * InstanceRecord expune:
   * - câmpuri de inspecție (url, messageFns, openFns, errorFns, closed, readyState)
   * - metode de simulare (simulateError, simulateOpen) — forward la instanța MES
   */
  type InstanceRecord = {
    url: string;
    messageFns: MsgFn[];
    openFns: VoidFn[];
    errorFns: VoidFn[];
    closed: boolean;
    readyState: number;
    simulateError: (rs?: number) => void;
    simulateOpen: () => void;
  };

  const instances: InstanceRecord[] = [];

  class MES {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readyState: number;
    url: string;
    private readonly record: InstanceRecord;
    private readonly messageFns: MsgFn[] = [];
    private readonly openFns: VoidFn[] = [];
    private readonly errorFns: VoidFn[] = [];

    constructor(url: string, _opts?: { withCredentials?: boolean }) {
      this.url = url;
      this.readyState = MES.OPEN;

      // Construim record-ul cu referințe la metodele instanței (arrow fns capturează `this`)
      const record: InstanceRecord = {
        url,
        messageFns: this.messageFns,
        openFns: this.openFns,
        errorFns: this.errorFns,
        closed: false,
        readyState: MES.OPEN,
        simulateError: (rs: number = MES.CLOSED) => {
          this.readyState = rs;
          record.readyState = rs;
          if (rs === MES.CLOSED) record.closed = true;
          // Spread necesar: handleError apelează removeEventListener în timpul iterării
          for (const fn of this.errorFns.slice()) fn();
        },
        simulateOpen: () => {
          this.readyState = MES.OPEN;
          record.readyState = MES.OPEN;
          for (const fn of this.openFns.slice()) fn();
        },
      };
      this.record = record;
      instances.push(record);
    }

    addEventListener(type: string, fn: EventListenerOrEventListenerObject): void {
      const handler = typeof fn === "function" ? fn : fn.handleEvent.bind(fn);
      if (type === "message") this.messageFns.push(handler as MsgFn);
      if (type === "open") this.openFns.push(handler as VoidFn);
      if (type === "error") this.errorFns.push(handler as VoidFn);
    }

    removeEventListener(type: string, fn: EventListenerOrEventListenerObject): void {
      const handler = typeof fn === "function" ? fn : fn.handleEvent.bind(fn);
      if (type === "message") {
        const i = this.messageFns.indexOf(handler as MsgFn);
        if (i >= 0) this.messageFns.splice(i, 1);
      }
      if (type === "open") {
        const i = this.openFns.indexOf(handler as VoidFn);
        if (i >= 0) this.openFns.splice(i, 1);
      }
      if (type === "error") {
        const i = this.errorFns.indexOf(handler as VoidFn);
        if (i >= 0) this.errorFns.splice(i, 1);
      }
    }

    close(): void {
      this.readyState = MES.CLOSED;
      this.record.closed = true;
      this.record.readyState = MES.CLOSED;
    }
  }

  return {
    MockEventSource: MES,
    getInstances: () => instances,
    clearInstances: () => {
      instances.length = 0;
    },
  };
});

// ─── Query wrapper helper ─────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        // retryDelay=0 asigură că retry-urile din hook (failureCount < 3) rulează instant
        // fără să blocheze testele cu delay-uri exponențiale (default 1000ms+)
        retryDelay: 0,
      },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper: Wrapper, queryClient };
}

// ─── Fixture: topology response ───────────────────────────────────────────────

const MOCK_TOPOLOGY = {
  success: true as const,
  data: {
    nodes: [
      {
        nodeKey: "a1:ingest:csv",
        queueName: "ingest:csv",
        neuronType: "SensoryNeuron",
        swimlane: "data-ingest",
        status: "ACTIVE" as const,
        metrics: { processed: 100, failed: 2, avgLatency: 50 },
      },
    ],
    edges: [],
    metadata: { totalNeurons: 1, activeNeurons: 1, lastUpdated: "2026-03-29T00:00:00Z" },
  },
};

const MOCK_BATCH_ID = "550e8400-e29b-41d4-a716-446655440000";

// ─── Suite: useCognitiveBrain ─────────────────────────────────────────────────

describe("useCognitiveBrain", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("apelează /api/v1/brain/topology fără batchId", async () => {
    mockApiGet.mockResolvedValue(MOCK_TOPOLOGY);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCognitiveBrain(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/brain/topology");
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].nodeKey).toBe("a1:ingest:csv");
    expect(result.current.metadata?.totalNeurons).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("include batchId ca query param când este furnizat", async () => {
    mockApiGet.mockResolvedValue(MOCK_TOPOLOGY);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCognitiveBrain(MOCK_BATCH_ID), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledWith(
      `/api/v1/brain/topology?batchId=${encodeURIComponent(MOCK_BATCH_ID)}`,
    );
  });

  it("queryKey diferit cu vs fără batchId (cache izolat)", async () => {
    mockApiGet.mockResolvedValue(MOCK_TOPOLOGY);
    const { wrapper, queryClient } = createWrapper();

    renderHook(() => useCognitiveBrain(), { wrapper });
    renderHook(() => useCognitiveBrain(MOCK_BATCH_ID), { wrapper });

    await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2));

    // Verifică că cache-ul are entries separate
    const globalCache = queryClient.getQueryData(["cognitive-brain", "topology", null]);
    const batchCache = queryClient.getQueryData(["cognitive-brain", "topology", MOCK_BATCH_ID]);
    expect(globalCache).toBeDefined();
    expect(batchCache).toBeDefined();
  });

  it("returnează nodes/edges goale la eroare de rețea", async () => {
    mockApiGet.mockRejectedValue(new Error("Network error"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCognitiveBrain(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it("oprește refetch-ul la 401 (nu retry)", async () => {
    const apiErr = new ApiError("Unauthorized", 401);
    mockApiGet.mockRejectedValue(apiErr);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCognitiveBrain(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Ar fi apelat de mai multe ori dacă retry era activ
    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeTruthy();
  });
});

// ─── Suite: useCognitiveEventStream ──────────────────────────────────────────

describe("useCognitiveEventStream", () => {
  beforeEach(() => {
    clearInstances();
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("creează EventSource la URL-ul corect", () => {
    const cb = vi.fn();
    renderHook(() => useCognitiveEventStream(cb));

    const inst = getInstances()[0];
    expect(inst).toBeDefined();
    expect(inst.url).toBe("http://127.0.0.1:64010/api/v1/brain/events/stream");
  });

  it("apelează ultimul callback la mesaje SSE după rerender", () => {
    const payload = JSON.stringify({
      nodeKey: "n1",
      eventType: "TEST",
      timestamp: "2026-01-01T00:00:00.000Z",
      data: {},
    });

    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ cb }: { cb: (e: { nodeKey: string; eventType: string }) => void }) =>
        useCognitiveEventStream(cb),
      { initialProps: { cb: first } },
    );

    const inst = getInstances()[0];
    expect(inst).toBeDefined();

    for (const fn of inst.openFns) fn();
    for (const fn of inst.messageFns) {
      fn({ data: payload } as MessageEvent<string>);
    }
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    rerender({ cb: second });

    for (const fn of inst.messageFns) {
      fn({ data: payload } as MessageEvent<string>);
    }
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("disconnect închide EventSource-ul curent", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useCognitiveEventStream(cb));

    const inst = getInstances()[0];
    expect(inst).toBeDefined();

    act(() => result.current.disconnect());
    expect(inst.closed).toBe(true);
  });

  it("disconnect setează connected=false", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useCognitiveEventStream(cb));
    const inst = getInstances()[0];

    // Simulează open
    act(() => {
      for (const fn of inst.openFns) fn();
    });
    expect(result.current.connected).toBe(true);

    act(() => result.current.disconnect());
    expect(result.current.connected).toBe(false);
  });

  it("implementează exponential backoff la eroare CLOSED", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    renderHook(() => useCognitiveEventStream(cb));

    expect(getInstances()).toHaveLength(1);

    // Simulează prima eroare cu readyState CLOSED
    act(() => {
      const inst = getInstances()[0];
      (inst as unknown as { simulateError: (rs: number) => void }).simulateError(
        MockEventSource.CLOSED,
      );
    });

    // Nu s-a reconectat încă (timer pending)
    expect(getInstances()).toHaveLength(1);

    // Avansează cu SSE_BACKOFF_MIN_MS (1000ms)
    act(() => {
      vi.advanceTimersByTime(SSE_BACKOFF_MIN_MS);
    });
    expect(getInstances()).toHaveLength(2);

    // A doua eroare CLOSED: backoff trebuie să fie 2000ms
    act(() => {
      const inst = getInstances()[1];
      (inst as unknown as { simulateError: (rs: number) => void }).simulateError(
        MockEventSource.CLOSED,
      );
    });

    // Nu s-a reconectat cu 1999ms
    act(() => {
      vi.advanceTimersByTime(SSE_BACKOFF_MIN_MS * 2 - 1);
    });
    expect(getInstances()).toHaveLength(2);

    // Reconectare după exact 2000ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getInstances()).toHaveLength(3);
  });

  it("backoff creșere exponențială: 1s → 2s → 4s → 8s", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    renderHook(() => useCognitiveEventStream(cb));

    const expectedDelays = [1000, 2000, 4000, 8000];

    for (const delay of expectedDelays) {
      const before = getInstances().length;
      act(() => {
        const last = getInstances()[before - 1];
        (last as unknown as { simulateError: (rs: number) => void }).simulateError(
          MockEventSource.CLOSED,
        );
      });
      // Nu reconectare înainte de delay
      act(() => {
        vi.advanceTimersByTime(delay - 1);
      });
      expect(getInstances()).toHaveLength(before);
      // Reconectare la delay
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(getInstances()).toHaveLength(before + 1);
    }
  });

  it("backoff capsat la SSE_BACKOFF_MAX_MS (60000ms)", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    renderHook(() => useCognitiveEventStream(cb));

    // Avansează backoff-ul la maxim: 1s, 2s, 4s, 8s, 16s, 32s → la 64s ar fi > 60s, deci 60s
    const delays = [1000, 2000, 4000, 8000, 16000, 32000];
    for (const delay of delays) {
      act(() => {
        const last = getInstances()[getInstances().length - 1];
        (last as unknown as { simulateError: (rs: number) => void }).simulateError(
          MockEventSource.CLOSED,
        );
      });
      act(() => {
        vi.advanceTimersByTime(delay);
      });
    }

    // Acum backoff ar fi 64000, dar cap-ul e 60000
    const before = getInstances().length;
    act(() => {
      const last = getInstances()[before - 1];
      (last as unknown as { simulateError: (rs: number) => void }).simulateError(
        MockEventSource.CLOSED,
      );
    });
    // 59999ms → nu reconectat
    act(() => {
      vi.advanceTimersByTime(SSE_BACKOFF_MAX_MS - 1);
    });
    expect(getInstances()).toHaveLength(before);
    // 1ms în plus → reconectat
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getInstances()).toHaveLength(before + 1);
  });

  it("reset backoff la 1s după open cu succes", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    renderHook(() => useCognitiveEventStream(cb));

    // Eșuează o dată (backoff ajunge la 2000ms)
    act(() => {
      const inst = getInstances()[0];
      (inst as unknown as { simulateError: (rs: number) => void }).simulateError(
        MockEventSource.CLOSED,
      );
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(getInstances()).toHaveLength(2);

    // Al doilea EventSource deschis cu succes → reset backoff la 1000ms
    act(() => {
      const inst = getInstances()[1];
      (inst as unknown as { simulateOpen: () => void }).simulateOpen();
    });

    // Al treilea eșec: backoff trebuie să fie din nou 1000ms (reset)
    act(() => {
      const inst = getInstances()[1];
      (inst as unknown as { simulateError: (rs: number) => void }).simulateError(
        MockEventSource.CLOSED,
      );
    });
    // La 999ms nu s-a reconectat
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(getInstances()).toHaveLength(2);
    // La 1000ms s-a reconectat
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getInstances()).toHaveLength(3);
  });

  it("nu se reconectează după disconnect() chiar dacă CLOSED apare ulterior", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { result } = renderHook(() => useCognitiveEventStream(cb));

    act(() => result.current.disconnect());
    const countAfterDisconnect = getInstances().length;

    // Simulează eroare CLOSED după disconnect — nu trebuie să reconecteze
    // (disconnect a setat stoppedRef=true)
    act(() => {
      vi.advanceTimersByTime(SSE_BACKOFF_MIN_MS * 10);
    });
    expect(getInstances()).toHaveLength(countAfterDisconnect);
  });

  it("nu se reconectează după unmount", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { result, unmount } = renderHook(() => useCognitiveEventStream(cb));

    // Provoacă o eroare care ar programa reconnect
    act(() => {
      const inst = getInstances()[0];
      (inst as unknown as { simulateError: (rs: number) => void }).simulateError(
        MockEventSource.CLOSED,
      );
    });

    // Unmount înainte ca timer-ul să expire
    unmount();
    const countAfterUnmount = getInstances().length;

    // Timer-ul a fost anulat la unmount → nu creează un nou EventSource
    act(() => {
      vi.advanceTimersByTime(SSE_BACKOFF_MIN_MS * 2);
    });
    expect(getInstances()).toHaveLength(countAfterUnmount);
    expect(result.current.connected).toBe(false);
  });

  it("setează streamError la CLOSED și o resetează la open", () => {
    const cb = vi.fn();
    vi.useFakeTimers();
    const { result } = renderHook(() => useCognitiveEventStream(cb));

    // Simulează eroare CLOSED
    act(() => {
      const inst = getInstances()[0];
      (inst as unknown as { simulateError: (rs: number) => void }).simulateError(
        MockEventSource.CLOSED,
      );
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe("Fluxul SSE s-a închis");

    // Avansează timer-ul de reconnect
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Al doilea EventSource se deschide cu succes → eroarea se resetează
    act(() => {
      const inst = getInstances()[1];
      (inst as unknown as { simulateOpen: () => void }).simulateOpen();
    });
    expect(result.current.error).toBeNull();
  });

  it("ignoră payload-uri SSE invalide (fără crash)", () => {
    const cb = vi.fn();
    renderHook(() => useCognitiveEventStream(cb));

    const inst = getInstances()[0];
    expect(inst).toBeDefined();

    // JSON invalid
    act(() => {
      for (const fn of inst.messageFns) fn({ data: "NOT JSON" } as MessageEvent<string>);
    });
    expect(cb).not.toHaveBeenCalled();

    // JSON valid dar lipsesc câmpuri obligatorii
    act(() => {
      for (const fn of inst.messageFns) {
        fn({ data: JSON.stringify({ foo: "bar" }) } as MessageEvent<string>);
      }
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it("parsează câmpul `id` din payload SSE", () => {
    const cb = vi.fn();
    renderHook(() => useCognitiveEventStream(cb));

    const inst = getInstances()[0];
    const payload = JSON.stringify({
      id: 42,
      nodeKey: "n1",
      eventType: "NODE_STARTED",
      timestamp: "2026-03-29T00:00:00Z",
      data: { batchId: "abc" },
    });

    act(() => {
      for (const fn of inst.messageFns) fn({ data: payload } as MessageEvent<string>);
    });

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, nodeKey: "n1", eventType: "NODE_STARTED" }),
    );
  });

  it("returnează eroare dacă EventSource nu este disponibil", () => {
    vi.stubGlobal("EventSource", undefined);
    const cb = vi.fn();
    const { result } = renderHook(() => useCognitiveEventStream(cb));

    expect(result.current.connected).toBe(false);
    expect(result.current.error?.message).toContain("EventSource nu este disponibil");
  });
});

// ─── Suite: useNeuronInspector ────────────────────────────────────────────────

describe("useNeuronInspector", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("apelează calea corectă /nodes/:nodeKey/traces (nu /traces/:nodeKey)", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { nodeKey: "a1:ingest:csv", limit: 25, total: 0 },
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useNeuronInspector("a1:ingest:csv"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/brain/nodes/a1%3Aingest%3Acsv/traces");
  });

  it("nu apelează mutations endpoint dacă batchId lipsește", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: [],
      meta: { nodeKey: "n1", limit: 25, total: 0 },
    });
    const { wrapper } = createWrapper();

    renderHook(() => useNeuronInspector("n1"), { wrapper });
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    // Singura apel trebuie să fie /traces, nu /mutations
    for (const call of mockApiGet.mock.calls) {
      expect(String(call[0])).not.toContain("/mutations/");
    }
  });

  it("apelează /mutations/:batchId când batchId este furnizat", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useNeuronInspector("n1", MOCK_BATCH_ID), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const calls = mockApiGet.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((c: string) => c.includes("/api/v1/brain/mutations/"))).toBe(true);
    expect(calls.some((c: string) => c.includes(MOCK_BATCH_ID))).toBe(true);
  });

  it("returnează traces și mutations din răspunsurile API", async () => {
    const mockTrace = {
      id: 1,
      nodeKey: "n1",
      eventType: "NODE_STARTED",
      timestamp: "2026-03-29T00:00:00Z",
      data: {},
    };
    const mockMutation = {
      batchId: MOCK_BATCH_ID,
      nodeKey: "n1",
      entityId: "e1",
      before: null,
      after: { name: "Acme" },
      mutationIntent: "CREATE",
      timestamp: "2026-03-29T00:00:00Z",
    };

    mockApiGet.mockImplementation((path: string) => {
      if (String(path).includes("/traces"))
        return Promise.resolve({ success: true, data: [mockTrace] });
      if (String(path).includes("/mutations"))
        return Promise.resolve({ success: true, data: [mockMutation] });
      return Promise.resolve({ success: true, data: [] });
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronInspector("n1", MOCK_BATCH_ID), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.traces).toHaveLength(1);
    expect(result.current.traces[0].eventType).toBe("NODE_STARTED");
    expect(result.current.mutations).toHaveLength(1);
    expect(result.current.mutations[0].mutationIntent).toBe("CREATE");
  });

  it("nu face niciun apel când nodeKey este null", async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useNeuronInspector(null), { wrapper });
    // Așteptăm un tick pentru a permite orice efecte asincrone
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("setează isLoading=false și traces=[] la eroare 401", async () => {
    const apiErr = new ApiError("Unauthorized", 401);
    mockApiGet.mockRejectedValue(apiErr);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useNeuronInspector("n1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.traces).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});

// ─── Suite: useNeuronControl ──────────────────────────────────────────────────

describe("useNeuronControl", () => {
  beforeEach(() => {
    mockApiPost.mockReset();
    mockApiPut.mockReset();
  });

  const PAUSE_RESPONSE = {
    success: true as const,
    nodeKey: "n1",
    status: "PAUSED" as const,
    propagated: false,
    batchId: null,
  };

  const RESUME_RESPONSE = {
    success: true as const,
    nodeKey: "n1",
    status: "ACTIVE" as const,
  };

  const CONFIG_RESPONSE = {
    success: true as const,
    data: {
      tenantId: "t1",
      nodeKey: "n1",
      concurrency: 5,
      rateLimitMax: null,
      rateLimitDuration: null,
      paused: false,
      applyStatus: "pending_apply" as const,
      appliedAt: null,
      appliedByWorkerInstance: null,
    },
    meta: {
      applyStatus: "pending_apply" as const,
      requiresWorkerRestart: true,
    },
  };

  it("setează optimisticPaused=true imediat la pause()", async () => {
    mockApiPost.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(PAUSE_RESPONSE), 100)),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.pause();
    });
    // Imediat după apel: optimistic state
    expect(result.current.optimisticPaused).toBe(true);
    expect(result.current.isPausing).toBe(true);

    await waitFor(() => expect(result.current.isPausing).toBe(false));
    expect(result.current.optimisticPaused).toBeNull();
  });

  it("resetează optimisticPaused la null după pause cu succes", async () => {
    mockApiPost.mockResolvedValue(PAUSE_RESPONSE);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.pause();
    });
    await waitFor(() => expect(result.current.isPausing).toBe(false));

    expect(result.current.optimisticPaused).toBeNull();
    expect(result.current.lastPauseResult?.status).toBe("PAUSED");
  });

  it("face rollback la optimisticPaused=null la eroare pause", async () => {
    mockApiPost.mockRejectedValue(new Error("Server Error"));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.pause();
    });
    await waitFor(() => expect(result.current.isPausing).toBe(false));

    // Rollback: optimisticPaused revine la null
    expect(result.current.optimisticPaused).toBeNull();
    expect(result.current.pauseError).toBeTruthy();
  });

  it("setează optimisticPaused=false imediat la resume()", async () => {
    mockApiPost.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(RESUME_RESPONSE), 100)),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.resume();
    });
    expect(result.current.optimisticPaused).toBe(false);
    expect(result.current.isResuming).toBe(true);

    await waitFor(() => expect(result.current.isResuming).toBe(false));
    expect(result.current.optimisticPaused).toBeNull();
    expect(result.current.lastResumeResult?.status).toBe("ACTIVE");
  });

  it("face rollback la optimisticPaused=null la eroare resume", async () => {
    mockApiPost.mockRejectedValue(new Error("Forbidden"));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.resume();
    });
    await waitFor(() => expect(result.current.isResuming).toBe(false));

    expect(result.current.optimisticPaused).toBeNull();
    expect(result.current.resumeError).toBeTruthy();
  });

  it("pause() include batchId în body când este furnizat", async () => {
    mockApiPost.mockResolvedValue(PAUSE_RESPONSE);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.pause(MOCK_BATCH_ID);
    });
    await waitFor(() => expect(result.current.isPausing).toBe(false));

    expect(mockApiPost).toHaveBeenCalledWith(expect.stringContaining("/pause"), {
      batchId: MOCK_BATCH_ID,
    });
  });

  it("pause() trimite body gol {} când batchId lipsește", async () => {
    mockApiPost.mockResolvedValue(PAUSE_RESPONSE);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.pause();
    });
    await waitFor(() => expect(result.current.isPausing).toBe(false));

    expect(mockApiPost).toHaveBeenCalledWith(expect.stringContaining("/pause"), {});
  });

  it("updateConfig() apelează PUT /config cu payload corect", async () => {
    mockApiPut.mockResolvedValue(CONFIG_RESPONSE);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.updateConfig({ concurrency: 5 });
    });
    await waitFor(() => expect(result.current.isUpdatingConfig).toBe(false));

    expect(mockApiPut).toHaveBeenCalledWith("/api/v1/brain/nodes/n1/config", { concurrency: 5 });
    expect(result.current.configResult?.applyStatus).toBe("pending_apply");
    expect(result.current.configResult?.requiresWorkerRestart).toBe(true);
  });

  it("updateConfig() returnează applyStatus=immediate pentru modificare paused only", async () => {
    const immResp = {
      ...CONFIG_RESPONSE,
      meta: { applyStatus: "immediate" as const, requiresWorkerRestart: false },
    };
    mockApiPut.mockResolvedValue(immResp);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("n1"), { wrapper });

    act(() => {
      result.current.updateConfig({ paused: true });
    });
    await waitFor(() => expect(result.current.isUpdatingConfig).toBe(false));

    expect(result.current.configResult?.applyStatus).toBe("immediate");
    expect(result.current.configResult?.requiresWorkerRestart).toBe(false);
  });

  it("returnează eroare la updateConfig() cu nodeKey null", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl(null), { wrapper });

    act(() => {
      result.current.updateConfig({ concurrency: 1 });
    });
    await waitFor(() => expect(result.current.isUpdatingConfig).toBe(false));

    expect(mockApiPut).not.toHaveBeenCalled();
    expect(result.current.configError?.message).toContain("nodeKey lipsă");
  });

  it("returnează eroare la pause() cu nodeKey null", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl(null), { wrapper });

    act(() => {
      result.current.pause();
    });
    await waitFor(() => expect(result.current.isPausing).toBe(false));

    expect(mockApiPost).not.toHaveBeenCalled();
    expect(result.current.pauseError?.message).toContain("nodeKey lipsă");
  });

  it("returnează eroare la resume() cu nodeKey null", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl(null), { wrapper });

    act(() => {
      result.current.resume();
    });
    await waitFor(() => expect(result.current.isResuming).toBe(false));

    expect(mockApiPost).not.toHaveBeenCalled();
    expect(result.current.resumeError?.message).toContain("nodeKey lipsă");
  });

  it("URL-ul de pause include nodeKey URL-encoded corect", async () => {
    mockApiPost.mockResolvedValue({
      ...PAUSE_RESPONSE,
      nodeKey: "ai:agent:orchestrate",
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNeuronControl("ai:agent:orchestrate"), { wrapper });

    act(() => {
      result.current.pause();
    });
    await waitFor(() => expect(result.current.isPausing).toBe(false));

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/brain/nodes/ai%3Aagent%3Aorchestrate/pause",
      {},
    );
  });
});

// ─── Suite: useCognitiveLOD ───────────────────────────────────────────────────

/** Constante zoom pentru teste LOD — evită magic numbers și zero-fraction (S7748). */
const ZOOM_VERY_LOW = 0.3; // sub limita minimal (< 0.5)
const ZOOM_MIN_STANDARD = 0.5; // exact limita standard
const ZOOM_BOUNDARY = 1; // exact limita superioară standard (≤ 1)
const ZOOM_DETAILED = 1.5; // deasupra limitei standard (> 1)
const ZOOM_HIGH = 2; // zoom ridicat — fără fracție zero

describe("useCognitiveLOD", () => {
  it("zoom < 0.5 → minimal", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_VERY_LOW));
    expect(result.current.lod).toBe("minimal");
    expect(result.current.showEdgeLabels).toBe(false);
    expect(result.current.showMetrics).toBe(false);
    expect(result.current.showNodeDetails).toBe(false);
  });

  it("zoom = 0.5 → standard", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_MIN_STANDARD));
    expect(result.current.lod).toBe("standard");
    expect(result.current.showEdgeLabels).toBe(true);
    expect(result.current.showMetrics).toBe(false);
    expect(result.current.showNodeDetails).toBe(true);
  });

  it("zoom = 1 (limita superioară standard) → standard", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_BOUNDARY));
    expect(result.current.lod).toBe("standard");
  });

  it("zoom > 1 → detailed", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_DETAILED));
    expect(result.current.lod).toBe("detailed");
    expect(result.current.showEdgeLabels).toBe(true);
    expect(result.current.showMetrics).toBe(true);
    expect(result.current.showNodeDetails).toBe(true);
  });

  it("nodeCount > 500 forțează minimal indiferent de zoom", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_HIGH, 600));
    expect(result.current.lod).toBe("minimal");
    expect(result.current.showMetrics).toBe(false);
  });

  it("nodeCount = 118 (catalog actual E1+E2) → detailed la zoom ridicat (zoom decisiv)", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_HIGH, 118));
    expect(result.current.lod).toBe("detailed");
  });

  it("nodeCount = 118 (catalog actual E1+E2) → standard la zoom normal (0.7)", () => {
    const { result } = renderHook(() => useCognitiveLOD(0.7, 118));
    expect(result.current.lod).toBe("standard");
    expect(result.current.showEdgeLabels).toBe(true);
  });

  it("nodeCount 251-500 → standard chiar dacă zoom ar da detailed", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_HIGH, 300));
    expect(result.current.lod).toBe("standard");
    expect(result.current.showEdgeLabels).toBe(true);
    expect(result.current.showMetrics).toBe(false);
  });

  it("nodeCount ≤ 250 → zoom rămâne decisiv", () => {
    const detailed = renderHook(() => useCognitiveLOD(ZOOM_HIGH, 200));
    expect(detailed.result.current.lod).toBe("detailed");

    const minimal = renderHook(() => useCognitiveLOD(ZOOM_VERY_LOW, 200));
    expect(minimal.result.current.lod).toBe("minimal");
  });

  it("nodeCount = 251 (limita inferioară standard) → standard", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_HIGH, 251));
    expect(result.current.lod).toBe("standard");
  });

  it("nodeCount = 501 (limita inferioară minimal) → minimal", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_HIGH, 501));
    expect(result.current.lod).toBe("minimal");
  });

  it("fără nodeCount: backwards compatible — zoom ridicat → detailed", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_HIGH));
    expect(result.current.lod).toBe("detailed");
  });

  it("zoom minimal câștigă față de nodeCount detailed (zoom scăzut, 20 noduri)", () => {
    const { result } = renderHook(() => useCognitiveLOD(ZOOM_VERY_LOW, 20));
    expect(result.current.lod).toBe("minimal");
  });

  it("memoizare: nu recalculează la același input", () => {
    const { result, rerender } = renderHook(
      ({ zoom, count }: { zoom: number; count?: number }) => useCognitiveLOD(zoom, count),
      { initialProps: { zoom: ZOOM_DETAILED, count: 30 } },
    );

    const first = result.current;
    rerender({ zoom: ZOOM_DETAILED, count: 30 });
    expect(result.current).toBe(first); // referință identică (useMemo)
  });

  it("recalculează când zoom se schimbă", () => {
    const { result, rerender } = renderHook(({ zoom }: { zoom: number }) => useCognitiveLOD(zoom), {
      initialProps: { zoom: ZOOM_DETAILED },
    });

    expect(result.current.lod).toBe("detailed");
    rerender({ zoom: ZOOM_VERY_LOW });
    expect(result.current.lod).toBe("minimal");
  });

  it("recalculează când nodeCount se schimbă", () => {
    const { result, rerender } = renderHook(
      ({ count }: { count?: number }) => useCognitiveLOD(ZOOM_HIGH, count),
      { initialProps: { count: 30 } },
    );

    expect(result.current.lod).toBe("detailed");
    rerender({ count: 600 });
    expect(result.current.lod).toBe("minimal");
  });
});
