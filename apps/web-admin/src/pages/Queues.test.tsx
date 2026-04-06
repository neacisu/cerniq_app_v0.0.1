import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Queues } from "./Queues.js";

const fetchQueues = vi.fn();
const pauseQueue = vi.fn();

vi.mock("../api.js", () => ({
  fetchQueues: (...a: unknown[]) => fetchQueues(...a),
  pauseQueue: (...a: unknown[]) => pauseQueue(...a),
  resumeQueue: vi.fn(),
  retryFailedQueue: vi.fn(),
  drainQueue: vi.fn(),
}));

describe("admin Queues", () => {
  beforeEach(() => {
    fetchQueues.mockReset();
    pauseQueue.mockReset();
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
});
