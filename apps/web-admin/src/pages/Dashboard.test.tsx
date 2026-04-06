import { render, screen, waitFor } from "@testing-library/react";
import { Dashboard } from "./Dashboard.js";

const fetchQueues = vi.fn();
const fetchSystemMetrics = vi.fn();

vi.mock("../api.js", () => ({
  fetchQueues: (...a: unknown[]) => fetchQueues(...a),
  fetchSystemMetrics: (...a: unknown[]) => fetchSystemMetrics(...a),
}));

vi.mock("../hooks/useWebSocket.js", () => ({
  useWebSocket: () => ({ state: "disconnected" as const }),
}));

describe("admin Dashboard", () => {
  beforeEach(() => {
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
});
