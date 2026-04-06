/**
 * Rutare SPA: parity rute scurte vs /outreach/* (același element),
 * deep link /brain/:batchId → /brain?batch=…, Suspense pe pagina cognitivă.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, waitFor, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { BrainBatchRedirect } from "@/App.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appTsxPath = path.join(__dirname, "../../src/App.tsx");

function LocationProbe() {
  const loc = useLocation();
  return (
    <span data-testid="route-probe">
      {loc.pathname}
      {loc.search}
    </span>
  );
}

describe("App.tsx — outreach parity + brain redirect", () => {
  it("rutele scurte și /outreach/* folosesc aceleași componente de pagină", () => {
    const src = readFileSync(appTsxPath, "utf8");
    const pairs: [string, string, string][] = [
      ["Leads", "/outreach/leads", "/leads"],
      ["Sequences", "/outreach/sequences", "/sequences"],
      ["Templates", "/outreach/templates", "/templates"],
      ["Phones", "/outreach/phones", "/phones"],
      ["Review", "/outreach/review", "/review"],
    ];
    for (const [comp, longPath, shortPath] of pairs) {
      expect(src).toContain(`path="${longPath}" element={<${comp} />}`);
      expect(src).toContain(`path="${shortPath}" element={<${comp} />}`);
    }
  });

  it("/brain folosește Suspense și CognitiveBrainPage lazy", () => {
    const src = readFileSync(appTsxPath, "utf8");
    expect(src).toContain('path="/brain"');
    expect(src).toContain("Suspense");
    expect(src).toContain("CognitiveBrainPage");
    expect(src).toContain('path="/brain/:batchId"');
    expect(src).toContain("BrainBatchRedirect");
  });

  it("BrainBatchRedirect navighează la /brain?batch=<id> (fără stare mock)", async () => {
    const batchToken = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    render(
      <MemoryRouter initialEntries={[`/brain/${batchToken}`]}>
        <Routes>
          <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
          <Route path="/brain" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("route-probe")).toHaveTextContent(`/brain?batch=${batchToken}`);
    });
  });
});
