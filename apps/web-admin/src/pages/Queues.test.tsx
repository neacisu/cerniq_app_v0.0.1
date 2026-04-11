import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Queues } from "./Queues.js";

const fetchQueues = vi.fn();
const pauseQueue = vi.fn();
const resumeQueue = vi.fn();
const retryFailedQueue = vi.fn();
const drainQueue = vi.fn();

vi.mock("../api.js", () => ({
  fetchQueues: (...a: unknown[]) => fetchQueues(...a),
  pauseQueue: (...a: unknown[]) => pauseQueue(...a),
  resumeQueue: (...a: unknown[]) => resumeQueue(...a),
  retryFailedQueue: (...a: unknown[]) => retryFailedQueue(...a),
  drainQueue: (...a: unknown[]) => drainQueue(...a),
}));

describe("admin Queues", () => {
  beforeEach(() => {
    fetchQueues.mockReset();
    pauseQueue.mockReset();
    resumeQueue.mockReset();
    retryFailedQueue.mockReset();
    drainQueue.mockReset();
    fetchQueues.mockResolvedValue({
      success: true,
      data: [
        {
          name: "ingest:csv",
          waiting: 2,
          active: 1,
          completed: 10,
          failed: 0,
          delayed: 0,
          paused: false,
        },
      ],
    });
    pauseQueue.mockResolvedValue({ success: true });
    resumeQueue.mockResolvedValue({ success: true });
    retryFailedQueue.mockResolvedValue({ success: true });
    drainQueue.mockResolvedValue({ success: true });
  });

  it("randează rânduri din răspunsul API pentru cozi", async () => {
    render(<Queues />);

    await waitFor(() => expect(screen.getByText("ingest:csv")).toBeInTheDocument());
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("apelează pauseQueue la Pause", async () => {
    const user = userEvent.setup();
    render(<Queues />);

    await waitFor(() => expect(screen.getByText("ingest:csv")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() => expect(pauseQueue).toHaveBeenCalledWith("ingest:csv"));
  });

  it("afișează loading inițial", () => {
    fetchQueues.mockImplementation(() => new Promise(() => {}));
    render(<Queues />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("eroare la încărcare", async () => {
    fetchQueues.mockRejectedValue(new Error("redis off"));
    render(<Queues />);
    expect(await screen.findByText("redis off")).toBeInTheDocument();
  });

  it("nu actualizează cozi după unmount când răspunsul sosește târziu", async () => {
    let resolveLoad!: (v: unknown) => void;
    fetchQueues.mockImplementation(
      () =>
        new Promise((r) => {
          resolveLoad = r;
        }),
    );
    const { unmount } = render(<Queues />);
    await waitFor(() => expect(fetchQueues).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolveLoad({
        success: true,
        data: [{ name: "ghost", waiting: 0, active: 0, completed: 0, failed: 0, paused: false }],
      });
    });
  });

  it("nu setează eroare după unmount pe reject târziu", async () => {
    let rejectQ!: (e: unknown) => void;
    fetchQueues.mockImplementation(
      () =>
        new Promise((_r, rej) => {
          rejectQ = rej;
        }),
    );
    const { unmount } = render(<Queues />);
    await waitFor(() => expect(fetchQueues).toHaveBeenCalled());
    unmount();
    await act(async () => {
      rejectQ(new Error("late"));
    });
  });

  it("eroare non-Error la încărcare", async () => {
    fetchQueues.mockRejectedValue("boom");
    render(<Queues />);
    expect(await screen.findByText("Failed to load queues")).toBeInTheDocument();
  });

  it("eroare Error la acțiunea pe coadă afișează mesajul", async () => {
    const user = userEvent.setup();
    pauseQueue.mockRejectedValue(new Error("pause denied"));
    render(<Queues />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(await screen.findByText("pause denied")).toBeInTheDocument();
  });

  it("eroare non-Error la acțiunea pe coadă", async () => {
    const user = userEvent.setup();
    retryFailedQueue.mockRejectedValue("nope");
    render(<Queues />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Queue action failed")).toBeInTheDocument();
  });

  it("success fără array de cozi → listă goală", async () => {
    fetchQueues.mockResolvedValue({ success: true, data: null as unknown as never });
    render(<Queues />);
    await waitFor(() => expect(screen.getByText(/No queues/i)).toBeInTheDocument());
  });

  it("rând gol când nu există cozi", async () => {
    fetchQueues.mockResolvedValue({ success: true, data: [] });
    render(<Queues />);
    expect(await screen.findByText(/No queues/i)).toBeInTheDocument();
  });

  it("failed sub pragul roșu și completed formatat", async () => {
    fetchQueues.mockResolvedValue({
      success: true,
      data: [
        {
          name: "low-fail",
          waiting: 0,
          active: 0,
          completed: 1000,
          failed: 3,
          paused: false,
        },
      ],
    });
    render(<Queues />);
    await waitFor(() => expect(screen.getByText("low-fail")).toBeInTheDocument());
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("câmpuri numerice implicite când lipsesc din API", async () => {
    fetchQueues.mockResolvedValue({
      success: true,
      data: [{ name: "minimal" }],
    });
    render(<Queues />);
    await waitFor(() => expect(screen.getByText("minimal")).toBeInTheDocument());
    const row = screen.getByText("minimal").closest("tr");
    expect(row?.textContent).toMatch(/0/);
  });

  it("coadă fără câmp paused se tratează ca activă", async () => {
    fetchQueues.mockResolvedValue({
      success: true,
      data: [
        {
          name: "no-paused-field",
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 2,
        },
      ],
    });
    render(<Queues />);
    await waitFor(() => expect(screen.getByText("no-paused-field")).toBeInTheDocument());
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("Resume arată … în timpul acțiunii", async () => {
    const user = userEvent.setup();
    resumeQueue.mockImplementation(() => new Promise(() => {}));
    fetchQueues.mockResolvedValue({
      success: true,
      data: [
        {
          name: "paused-q",
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: true,
        },
      ],
    });
    render(<Queues />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(await screen.findByRole("button", { name: "..." })).toBeInTheDocument();
  });

  it("după acțiune, răspuns fără listă validă nu rescrie cozile", async () => {
    const user = userEvent.setup();
    const row = {
      name: "keep",
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      paused: false,
    };
    let loadCalls = 0;
    fetchQueues.mockImplementation(() => {
      loadCalls += 1;
      if (loadCalls === 1) return Promise.resolve({ success: true, data: [row] });
      if (loadCalls === 2)
        return Promise.resolve({ success: true, data: null as unknown as never });
      return Promise.resolve({ success: true, data: [row] });
    });
    pauseQueue.mockResolvedValue({ success: true });
    render(<Queues />);
    await waitFor(() => expect(screen.getByText("keep")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(pauseQueue).toHaveBeenCalled());
    expect(screen.getByText("keep")).toBeInTheDocument();
  });

  it("butonul Pause arată … în timpul acțiunii", async () => {
    const user = userEvent.setup();
    pauseQueue.mockImplementation(() => new Promise(() => {}));
    render(<Queues />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(await screen.findByRole("button", { name: "..." })).toBeInTheDocument();
  });

  it("coadă întreruptă: Resume și acțiuni Retry/Drain", async () => {
    const user = userEvent.setup();
    const pausedRow = {
      name: "q1",
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 12,
      paused: true,
    };
    fetchQueues.mockResolvedValue({ success: true, data: [pausedRow] });
    render(<Queues />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(retryFailedQueue).toHaveBeenCalledWith("q1"));
    await user.click(screen.getByRole("button", { name: "Drain" }));
    await waitFor(() => expect(drainQueue).toHaveBeenCalledWith("q1"));
  });
});
