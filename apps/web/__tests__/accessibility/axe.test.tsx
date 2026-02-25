import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/providers/auth-provider.js";
import { Login } from "../../src/pages/auth/Login.js";
import { Dashboard } from "../../src/pages/dashboard/index.js";

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

describe("Accessibility (axe)", () => {
  it("Login page has no critical axe violations", async () => {
    const { container } = wrap(<Login />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Dashboard has no critical axe violations", async () => {
    const { container } = wrap(<Dashboard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
