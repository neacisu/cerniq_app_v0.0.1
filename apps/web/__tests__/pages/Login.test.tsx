/**
 * Login: navigare doar după succes real din useAuth.login; erori afișate fără redirect.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";

const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock("@/providers/auth-provider.js", () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
  }),
}));

import { Login } from "@/pages/auth/Login.js";

function LoginWithRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<div data-testid="post-login-dashboard">Dashboard</div>} />
    </Routes>
  );
}

describe("Login", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockRegister.mockReset();
  });

  it("după login reușit navighează la /dashboard (fără succes simulat înainte de request)", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginWithRoutes />
      </MemoryRouter>,
    );

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "user@tenant.com");
    await user.clear(screen.getByLabelText("Parolă"));
    await user.type(screen.getByLabelText("Parolă"), "Secret123!");
    await user.click(screen.getByRole("button", { name: /Autentificare/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("user@tenant.com", "Secret123!");
    });
    await waitFor(() => {
      expect(screen.getByTestId("post-login-dashboard")).toBeInTheDocument();
    });
  });

  it("la login eșuat afișează mesajul din răspuns și nu navighează", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, error: "Credențiale invalide" });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginWithRoutes />
      </MemoryRouter>,
    );

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "bad@x.com");
    await user.clear(screen.getByLabelText("Parolă"));
    await user.type(screen.getByLabelText("Parolă"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /Autentificare/i }));

    await waitFor(() => {
      expect(screen.getByText("Credențiale invalide")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("post-login-dashboard")).not.toBeInTheDocument();
  });
});
