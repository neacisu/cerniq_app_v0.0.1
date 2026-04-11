import { render, screen, waitFor, act } from "@testing-library/react";
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
        { timestamp: "2026-04-04T10:00:03Z", level: "debug", message: "d" },
      ],
    });
  });

  it("leagă eticheta de filtru de select (accesibilitate)", async () => {
    render(<Logs />);
    await waitFor(() => expect(fetchAdminLogs).toHaveBeenCalled());
    const select = screen.getByRole("combobox", { name: /level/i });
    expect(select).toHaveAttribute("id", "admin-logs-level-filter");
  });

  it("răspuns fără success golește lista", async () => {
    fetchAdminLogs.mockResolvedValue({ success: false });
    render(<Logs />);
    await waitFor(() => expect(screen.getByText(/No log entries/i)).toBeInTheDocument());
  });

  it("eroare la încărcare afișează mesaj", async () => {
    fetchAdminLogs.mockRejectedValue(new Error("log api"));
    render(<Logs />);
    expect(await screen.findByText(/log api/)).toBeInTheDocument();
  });

  it("după unmount ignoră și eroarea târzie", async () => {
    let reject!: (e: unknown) => void;
    fetchAdminLogs.mockImplementation(
      () =>
        new Promise((_r, rej) => {
          reject = rej;
        }),
    );
    const { unmount } = render(<Logs />);
    unmount();
    await act(async () => {
      reject("late");
    });
  });

  it("după unmount nu aplică setState pe răspuns târziu", async () => {
    let resolve!: (v: { success: boolean; data: unknown[] }) => void;
    fetchAdminLogs.mockImplementation(
      () =>
        new Promise<{ success: boolean; data: unknown[] }>((r) => {
          resolve = r;
        }),
    );
    const { unmount } = render(<Logs />);
    unmount();
    await act(async () => {
      resolve({ success: true, data: [] });
    });
  });

  it("eroare non-Error la încărcare", async () => {
    fetchAdminLogs.mockRejectedValue("x");
    render(<Logs />);
    expect(await screen.findByText(/Failed to load logs/)).toBeInTheDocument();
  });

  it("filtru debug poate lăsa lista goală", async () => {
    const user = userEvent.setup();
    fetchAdminLogs.mockResolvedValue({
      success: true,
      data: [{ timestamp: "t", level: "info", message: "only-info" }],
    });
    render(<Logs />);
    await waitFor(() => expect(screen.getByText("only-info")).toBeInTheDocument());
    await user.selectOptions(screen.getByRole("combobox", { name: /level/i }), "debug");
    expect(screen.getByText(/No log entries/i)).toBeInTheDocument();
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
