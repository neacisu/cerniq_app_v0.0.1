/**
 * NotFound: pagină neutră — fără KPI/metrici business; navigare statică la /dashboard.
 * Aliniat la înregistrarea de plan `web-notfound` (UI date reale).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFound } from "@/pages/NotFound.js";

describe("NotFound", () => {
  it("afișează 404 și mesaj generic, fără pattern-uri de date business inventate", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText(/Pagina nu a fost găsită/i)).toBeInTheDocument();
    expect(screen.queryByText(/\bKPI\b|\bchurn\b.*%|\bNPS\b.*\d{2,}/i)).toBeNull();
  });

  it("CTA spre dashboard este Link client-side la /dashboard, fără <button> în anchetă (a11y/HTML)", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /Înapoi la Dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).toHaveClass("btn", "btb");
    expect(screen.queryByRole("button", { name: /Înapoi la Dashboard/i })).toBeNull();
  });

  it("structură ierarhică accesibilă: un singur heading principal pentru 404", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
