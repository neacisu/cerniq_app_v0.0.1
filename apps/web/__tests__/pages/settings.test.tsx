/**
 * Settings: persistență locală (localStorage), fără date business mock; toast pentru feedback.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import React from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { Settings } from "@/pages/system/settings.js";
import { toast } from "sonner";

describe("Settings (system)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("tab General: salvează în localStorage și confirmă prin toast (fără API tenant)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Settings/i })).toBeInTheDocument();
    const company = screen.getByPlaceholderText("Company Name");
    await user.clear(company);
    await user.type(company, "Tenant Test SRL");
    await user.click(screen.getByRole("button", { name: /Salvează local \(browser\)/i }));

    expect(localStorage.getItem("cerniq_settings_general_v1")).toContain("Tenant Test SRL");
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(expect.stringMatching(/localStorage/i));
  });

  it("tab Integrations: afișează ghidul OpenBao (fără chei reale)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("tab", { name: /integrations/i }));
    expect(screen.getByText(/Secrets & integrări \(OpenBao\)/i)).toBeInTheDocument();
    expect(screen.getByText(/etapa1\/settings-integrations/i)).toBeInTheDocument();
  });
});
