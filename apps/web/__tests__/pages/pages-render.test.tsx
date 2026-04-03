import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/providers/auth-provider.js";
import { Dashboard } from "@/pages/dashboard/index.js";
import { Login } from "@/pages/auth/Login.js";
import { ForgotPassword } from "@/pages/auth/ForgotPassword.js";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
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
    expect(screen.getByRole("heading", { name: /Resetare Parolă/i })).toBeInTheDocument();
  });
  it("Dashboard renders title", () => {
    wrap(<Dashboard />);
    expect(screen.getByRole("heading", { name: /Dashboard general/i })).toBeInTheDocument();
  });
  it("Dashboard shows loading state", () => {
    wrap(<Dashboard />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
