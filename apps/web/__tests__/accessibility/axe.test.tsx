import React from "react";
import { describe, it, expect, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../src/providers/auth-provider.js";
import { Login } from "../../src/pages/auth/Login.js";
import { Dashboard } from "../../src/pages/dashboard/index.js";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const wrap = (ui: React.ReactElement, withAuth = true) =>
  render(
    <QueryClientProvider
      client={
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
        })
      }
    >
      <MemoryRouter>{withAuth ? <AuthProvider>{ui}</AuthProvider> : ui}</MemoryRouter>
    </QueryClientProvider>,
  );

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
});
