import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/providers/auth-provider";
import { Dashboard } from "@/pages/dashboard/index";
import { Login } from "@/pages/auth/Login";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );

describe("Page Rendering", () => {
  it("Login page renders without error", () => {
    wrap(<Login />);
    expect(screen.getByRole("heading", { name: "Autentificare" })).toBeInTheDocument();
  });
  it("Login has email field", () => {
    wrap(<Login />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });
  it("ForgotPassword renders", () => {
    wrap(<ForgotPassword />);
    expect(screen.getByText(/Resetare Parolă/i)).toBeInTheDocument();
  });
  it("Dashboard renders KPIs", () => {
    wrap(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
  it("Dashboard shows Bronze KPI", () => {
    wrap(<Dashboard />);
    expect(screen.getByText("47,382")).toBeInTheDocument();
  });
  it("Dashboard shows Silver KPI", () => {
    wrap(<Dashboard />);
    expect(screen.getByText("8,941")).toBeInTheDocument();
  });
  it("Dashboard shows Gold KPI", () => {
    wrap(<Dashboard />);
    expect(screen.getByText("1,247")).toBeInTheDocument();
  });
  it("Dashboard shows Revenue KPI", () => {
    wrap(<Dashboard />);
    expect(screen.getByText("184K")).toBeInTheDocument();
  });
});
