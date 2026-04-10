import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";

vi.mock("@/index.css", () => ({}));
vi.mock("@/lib/analytics-guard.js", () => ({
  initDeferredAnalytics: vi.fn(),
}));

vi.mock("@/App.js", () => ({
  App: () => <div data-testid="app-root">app</div>,
}));

describe("main.tsx", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("montează aplicația în #root", async () => {
    vi.resetModules();
    await act(async () => {
      await import("@/main.js");
    });
    await waitFor(() => {
      expect(screen.getByTestId("app-root")).toBeInTheDocument();
    });
  });
});
