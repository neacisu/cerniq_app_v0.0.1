import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Logs } from "./Logs.js";

const fetchAdminLogs = vi.fn();

vi.mock("../api.js", () => ({
  fetchAdminLogs: (...a: unknown[]) => fetchAdminLogs(...a),
}));

describe("admin Logs", () => {
  beforeEach(() => {
    fetchAdminLogs.mockReset();
    fetchAdminLogs.mockResolvedValue({
      success: true,
      data: [
        { timestamp: "2026-04-04T10:00:00Z", level: "info", message: "a" },
        { timestamp: "2026-04-04T10:00:01Z", level: "error", message: "b" },
        { timestamp: "2026-04-04T10:00:02Z", level: "warn", message: "c" },
      ],
    });
  });

  it("leagă eticheta de filtru de select (accesibilitate)", async () => {
    render(<Logs />);
    await waitFor(() => expect(fetchAdminLogs).toHaveBeenCalled());
    const select = screen.getByRole("combobox", { name: /level/i });
    expect(select).toHaveAttribute("id", "admin-logs-level-filter");
  });

  it("randează intrările și aplică filtrul pe nivel", async () => {
    const user = userEvent.setup();
    render(<Logs />);
    await waitFor(() => expect(screen.getByText("a")).toBeInTheDocument());
    expect(screen.getByText("b")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: /level/i }), "error");
    expect(screen.queryByText("a")).not.toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
  });
});
