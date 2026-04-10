import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DesignTokensPreviewPage } from "@/components/ui/design-tokens-preview.js";

describe("DesignTokensPreviewPage", () => {
  it("randează titlul și secțiuni de token-uri", () => {
    render(
      <MemoryRouter>
        <DesignTokensPreviewPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Design tokens" })).toBeInTheDocument();
    expect(screen.getByText("Brand & suprafețe")).toBeInTheDocument();
    expect(screen.getByText("Alias-uri semantice")).toBeInTheDocument();
    expect(screen.getByText("Paletă chart (P3)")).toBeInTheDocument();
    expect(screen.getByText(/design-system\.md/)).toBeInTheDocument();
  });
});
