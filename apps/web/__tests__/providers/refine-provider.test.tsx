import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetIdentity, useIsAuthenticated, useLogin, useLogout } from "@refinedev/core";
import { AuthProvider } from "@/providers/auth-provider.js";
import { CerniqRefineProvider } from "@/providers/refine-provider.js";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

function RefineAuthProbe() {
  useGetIdentity();
  useIsAuthenticated();
  const { mutate: login } = useLogin();
  const { mutate: logout } = useLogout();

  return (
    <button
      type="button"
      onClick={() => {
        login({});
        logout();
      }}
    >
      probe
    </button>
  );
}

function setup() {
  localStorage.clear();
  localStorage.setItem("cerniq_token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.test");
  localStorage.setItem(
    "cerniq_user",
    JSON.stringify({
      id: "u1",
      email: "a@b.c",
      name: "Test User",
      tenantId: "t1",
      role: "admin",
    }),
  );

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <CerniqRefineProvider>
            <RefineAuthProbe />
          </CerniqRefineProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CerniqRefineProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("montează Refine cu authProvider (identitate, check, login, logout)", async () => {
    const { getByRole } = setup();

    await waitFor(() => {
      expect(getByRole("button", { name: "probe" })).toBeInTheDocument();
    });

    await act(async () => {
      getByRole("button", { name: "probe" }).click();
    });

    await waitFor(() => {
      expect(localStorage.getItem("cerniq_token")).toBeNull();
    });
  });
});
