import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../src/providers/auth-provider.js";
import { ThemeProvider } from "../../src/providers/theme-provider.js";
import { Login } from "../../src/pages/auth/Login.js";
import { Dashboard } from "../../src/pages/dashboard/index.js";
import { Payments } from "../../src/pages/etapa4/payments.js";
import { Negotiations } from "../../src/pages/etapa3/negotiations.js";
import { Guardrails } from "../../src/pages/etapa3/guardrails.js";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../../src/providers/auth-provider.js", () => ({
  useAuth: () => ({
    token: "jwt-msw-axe",
    user: { id: "u1", email: "a@b.c", role: "admin", tenantId: "tenant-1" },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const queryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });

const wrap = (ui: React.ReactElement, withAuth = true) =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <ThemeProvider>{withAuth ? <AuthProvider>{ui}</AuthProvider> : ui}</ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  globalThis.localStorage.setItem("cerniq_token", "jwt-msw-axe");
});

describe("Accessibility (axe)", () => {
  it("Login page has no critical axe violations", async () => {
    const { container } = wrap(<Login />);
    const results = await act(async () => axe(container));
    expect(results.violations).toEqual([]);
  });

  it("Dashboard has no critical axe violations", async () => {
    const { container } = wrap(<Dashboard />, false);
    await waitFor(() => {
      expect(container.querySelector("h1")).toBeTruthy();
    });
    const results = await act(async () => axe(container));
    expect(results.violations).toEqual([]);
  });

  it("Payments (MSW) has no critical axe violations", async () => {
    const { container } = wrap(<Payments />);
    await waitFor(() => {
      expect(container.textContent).toMatch(/SC Plăți MSW SRL/);
    });
    const results = await act(async () => axe(container));
    expect(results.violations).toEqual([]);
  });

  it("Negotiations (MSW) has no critical axe violations", async () => {
    const { container } = wrap(<Negotiations />);
    await waitFor(() => {
      expect(container.textContent).toMatch(/SC AgroSud SRL/);
    });
    const results = await act(async () => axe(container));
    expect(results.violations).toEqual([]);
  });

  it("Guardrails (MSW) has no critical axe violations", async () => {
    const { container } = wrap(<Guardrails />);
    await waitFor(() => {
      expect(container.textContent).toMatch(/Discount Guard/);
    });
    const results = await act(async () => axe(container));
    expect(results.violations).toEqual([]);
  });
});
