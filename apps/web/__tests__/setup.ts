import React from "react";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";
import { expect, vi } from "vitest";
import { server } from "../src/test-utils/msw/server.js";

// `@testing-library/jest-dom/vitest` poate intra în conflict cu Vitest 4.x (callCount read-only pe Assertion).
expect.extend(jestDomMatchers);

// jest-axe `expect.extend(toHaveNoViolations)` rămâne incompatibil — axe.test.tsx folosește `results.violations`.

class ResizeObserverMock implements ResizeObserver {
  private readonly observedElements = new Set<Element>();

  public constructor(private readonly callback: ResizeObserverCallback) {}

  public observe(target: Element): void {
    this.observedElements.add(target);
    this.callback([this.createEntry(target)], this);
  }

  public unobserve(target: Element): void {
    this.observedElements.delete(target);
  }

  public disconnect(): void {
    this.observedElements.clear();
  }

  public takeRecords(): ResizeObserverEntry[] {
    return Array.from(this.observedElements, (target) => this.createEntry(target));
  }

  private createEntry(target: Element): ResizeObserverEntry {
    const contentRect = target.getBoundingClientRect();
    const boxSize = [{ inlineSize: contentRect.width, blockSize: contentRect.height }];

    return {
      target,
      contentRect,
      borderBoxSize: boxSize,
      contentBoxSize: boxSize,
      devicePixelContentBoxSize: boxSize,
    } as ResizeObserverEntry;
  }
}

if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverMock as unknown as typeof ResizeObserver,
    writable: true,
    configurable: true,
  });
}

const localStorageMock = (() => {
  let store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store = new Map<string, string>();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

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
