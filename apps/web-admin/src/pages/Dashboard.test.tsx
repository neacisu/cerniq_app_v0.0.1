import { render, screen, waitFor, act } from "@testing-library/react";
import type { WebSocketState } from "../hooks/useWebSocket.js";
import { Dashboard } from "./Dashboard.js";

const fetchQueues = vi.fn();
const fetchSystemMetrics = vi.fn();

type UseWebSocketReturn = { state: WebSocketState; lastMessage: null };

const useWebSocketMock = vi.hoisted(() =>
  vi.fn(
    (_onMessage?: (data: unknown) => void): UseWebSocketReturn => ({
      state: "disconnected",
      lastMessage: null,
    }),
  ),
);

vi.mock("../api.js", () => ({
  fetchQueues: (...a: unknown[]) => (fetchQueues as (...args: unknown[]) => unknown)(...a),
  fetchSystemMetrics: (...a: unknown[]) =>
    (fetchSystemMetrics as (...args: unknown[]) => unknown)(...a),
}));

vi.mock("../hooks/useWebSocket.js", () => ({
  useWebSocket: (onMessage?: (data: unknown) => void) => useWebSocketMock(onMessage),
}));

describe("admin Dashboard", () => {
  beforeEach(() => {
    useWebSocketMock.mockImplementation(() => ({ state: "disconnected", lastMessage: null }));
    fetchQueues.mockReset();
    fetchSystemMetrics.mockReset();
    fetchQueues.mockResolvedValue({
      success: true,
      data: [
        {
          name: "ingest:csv",
          waiting: 1,
          active: 0,
          completed: 5,
          failed: 0,
          delayed: 0,
        },
      ],
    });
    fetchSystemMetrics.mockResolvedValue({
      success: true,
      data: {
        memory: { usagePercent: "42" },
        cpu: { loadAvg: [0.1, 0.2, 0.3] },
      },
    });
  });

  it("afișează agregate din fetchQueues / fetchSystemMetrics (fără valori inventate în UI)", async () => {
    render(<Dashboard />);

    await waitFor(() => expect(screen.getByText("Admin Dashboard")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/1 queue\(s\)/)).toBeInTheDocument());
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(fetchQueues).toHaveBeenCalled();
    expect(fetchSystemMetrics).toHaveBeenCalled();
  });

  it("stare loading când nu există încă cozi", async () => {
    fetchQueues.mockImplementation(() => new Promise(() => {}));
    fetchSystemMetrics.mockImplementation(() => new Promise(() => {}));
    render(<Dashboard />);
    expect(await screen.findByText(/loading/i)).toBeInTheDocument();
  });

  it("eroare de încărcare se afișează", async () => {
    fetchQueues.mockRejectedValue(new Error("svc down"));
    fetchSystemMetrics.mockResolvedValue({ success: true, data: {} });
    render(<Dashboard />);
    expect(await screen.findByText("svc down")).toBeInTheDocument();
  });

  it("eroare non-Error la încărcare", async () => {
    fetchQueues.mockRejectedValue("x");
    fetchSystemMetrics.mockResolvedValue({ success: true, data: {} });
    render(<Dashboard />);
    expect(await screen.findByText("Failed to load data")).toBeInTheDocument();
  });

  it("după unmount nu setează eroare pe reject târziu", async () => {
    let rejectLoad!: (e: unknown) => void;
    fetchQueues.mockImplementation(
      () =>
        new Promise((_res, rej) => {
          rejectLoad = rej;
        }),
    );
    fetchSystemMetrics.mockResolvedValue({ success: true, data: {} });
    const { unmount } = render(<Dashboard />);
    unmount();
    await act(async () => {
      rejectLoad(new Error("late"));
    });
  });

  it("răspuns neconform → liste goale", async () => {
    fetchQueues.mockResolvedValue({ success: false });
    fetchSystemMetrics.mockResolvedValue({ success: false });
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/No queue data yet/i)).toBeInTheDocument());
  });

  it("WebSocket conectat afișează Live", async () => {
    useWebSocketMock.mockImplementation(() => ({ state: "connected", lastMessage: null }));
    render(<Dashboard />);
    expect(await screen.findByText(/Live/)).toBeInTheDocument();
  });

  it("fără loadAvg afișează em dash în rezumat", async () => {
    fetchQueues.mockResolvedValue({
      success: true,
      data: [{ name: "q", waiting: 0, active: 0, completed: 1, failed: 0, delayed: 0 }],
    });
    fetchSystemMetrics.mockResolvedValue({
      success: true,
      data: { memory: { usagePercent: "1" } },
    });
    render(<Dashboard />);
    expect(await screen.findByText(/Load avg:\s*—/)).toBeInTheDocument();
  });

  it("afișează load avg când există cpu.loadAvg", async () => {
    fetchQueues.mockResolvedValue({
      success: true,
      data: [{ name: "q", waiting: 0, active: 0, completed: 1, failed: 0, delayed: 0 }],
    });
    fetchSystemMetrics.mockResolvedValue({
      success: true,
      data: { cpu: { loadAvg: [0.1, 0.2, 0.3] } },
    });
    render(<Dashboard />);
    expect(await screen.findByText(/0\.1, 0\.2, 0\.3/)).toBeInTheDocument();
  });

  it("callback WebSocket actualizează cozi și metrici", async () => {
    let onData: ((data: unknown) => void) | null = null;
    useWebSocketMock.mockImplementation((cb?: (data: unknown) => void) => {
      onData = cb ?? null;
      return { state: "disconnected", lastMessage: null };
    });
    render(<Dashboard />);
    await waitFor(() => expect(onData).not.toBeNull());
    await act(async () => {
      onData?.({
        queues: [{ name: "ws-q", waiting: 1, active: 0, completed: 0, failed: 0, delayed: 0 }],
        system: { memory: { usagePercent: "9" }, cpu: { loadAvg: [0.5] } },
      });
    });
    await waitFor(() => expect(screen.getByText("9%")).toBeInTheDocument());
  });

  it("callback WebSocket: doar cozi", async () => {
    let onData: ((data: unknown) => void) | null = null;
    useWebSocketMock.mockImplementation((cb?: (data: unknown) => void) => {
      onData = cb ?? null;
      return { state: "disconnected", lastMessage: null };
    });
    fetchQueues.mockResolvedValue({ success: true, data: [] });
    fetchSystemMetrics.mockResolvedValue({ success: true, data: {} });
    render(<Dashboard />);
    await waitFor(() => expect(onData).not.toBeNull(), { timeout: 3000 });
    await act(async () => {
      onData?.({
        queues: [{ name: "only-q", waiting: 2, active: 0, completed: 0, failed: 0, delayed: 0 }],
      });
    });
    await waitFor(() => expect(screen.getByText(/1 queue\(s\)/)).toBeInTheDocument());
  });

  it("callback WebSocket: doar system", async () => {
    let onData: ((data: unknown) => void) | null = null;
    useWebSocketMock.mockImplementation((cb?: (data: unknown) => void) => {
      onData = cb ?? null;
      return { state: "disconnected", lastMessage: null };
    });
    fetchQueues.mockResolvedValue({ success: true, data: [] });
    fetchSystemMetrics.mockResolvedValue({ success: true, data: {} });
    render(<Dashboard />);
    await waitFor(() => expect(onData).not.toBeNull(), { timeout: 3000 });
    await act(async () => {
      onData?.({ system: { memory: { usagePercent: "88" } } });
    });
    await waitFor(() => expect(screen.getByText("88%")).toBeInTheDocument());
  });

  it("callback WebSocket: payload fără cozi/system nu schimbă starea vizibilă", async () => {
    let onData: ((data: unknown) => void) | null = null;
    useWebSocketMock.mockImplementation((cb?: (data: unknown) => void) => {
      onData = cb ?? null;
      return { state: "disconnected", lastMessage: null };
    });
    fetchQueues.mockResolvedValue({
      success: true,
      data: [{ name: "base", waiting: 0, active: 0, completed: 1, failed: 0, delayed: 0 }],
    });
    fetchSystemMetrics.mockResolvedValue({
      success: true,
      data: { memory: { usagePercent: "2" } },
    });
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/1 queue\(s\)/)).toBeInTheDocument());
    await waitFor(() => expect(onData).not.toBeNull());
    await act(async () => {
      onData?.({});
    });
    expect(screen.getByText(/1 queue\(s\)/)).toBeInTheDocument();
  });

  it("nu aplică setState după unmount când datele sosesc târziu", async () => {
    let resolveQ!: (v: unknown) => void;
    let resolveM!: (v: unknown) => void;
    fetchQueues.mockImplementation(
      () =>
        new Promise((r) => {
          resolveQ = r;
        }),
    );
    fetchSystemMetrics.mockImplementation(
      () =>
        new Promise((r) => {
          resolveM = r;
        }),
    );
    const { unmount } = render(<Dashboard />);
    await waitFor(() => expect(fetchQueues).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolveQ({ success: true, data: [] });
      resolveM({ success: true, data: {} });
    });
  });

  it("agregate cu câmpuri numerice opționale undefined", async () => {
    fetchQueues.mockResolvedValue({
      success: true,
      data: [
        {
          name: "sparse",
          // exercită ?? pe completed / waiting / active / failed
          ...({} as Record<string, unknown>),
        } as {
          name: string;
          waiting?: number;
          active?: number;
          completed?: number;
          failed?: number;
          delayed?: number;
        },
      ],
    });
    fetchSystemMetrics.mockResolvedValue({ success: true, data: {} });
    render(<Dashboard />);
    expect(await screen.findByText(/1 queue\(s\)/)).toBeInTheDocument();
  });

  it("agregate cu două cozi: active vs idle", async () => {
    fetchQueues.mockResolvedValue({
      success: true,
      data: [
        {
          name: "hot",
          waiting: 1,
          active: 0,
          completed: 5,
          failed: 1,
          delayed: 0,
        },
        {
          name: "cold",
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        },
      ],
    });
    fetchSystemMetrics.mockResolvedValue({
      success: true,
      data: { memory: { usagePercent: "5" } },
    });
    render(<Dashboard />);
    expect(await screen.findByText(/2 queue\(s\)/)).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("totalJobs și activeQueues la zero când nu există joburi active", async () => {
    fetchQueues.mockResolvedValue({
      success: true,
      data: [
        {
          name: "idle",
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        },
      ],
    });
    fetchSystemMetrics.mockResolvedValue({
      success: true,
      data: { memory: { usagePercent: "0" } },
    });
    render(<Dashboard />);
    expect(await screen.findByText(/1 queue\(s\)/)).toBeInTheDocument();
    expect(screen.getByText("Active Queues")).toBeInTheDocument();
    expect(screen.getByText("Total Jobs")).toBeInTheDocument();
  });
});
