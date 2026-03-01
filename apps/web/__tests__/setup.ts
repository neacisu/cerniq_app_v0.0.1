import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";
import React from "react";
import { expect, vi } from "vitest";
import { server } from "../src/test-utils/msw/server.js";

expect.extend(toHaveNoViolations);

class ResizeObserverMock {
  constructor(_callback: ResizeObserverCallback) {}
  observe(_target: Element, _options?: ResizeObserverOptions) {}
  unobserve(_target: Element) {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverMock as unknown as typeof ResizeObserver,
    writable: true,
    configurable: true,
  });
}

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { style: { width: 600, height: 300 } }, children),
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
