import { describe, it, expect } from "vitest";
import { buildWorkerQueueNamesForProcessors } from "./processor-registry-alignment.js";

describe("buildWorkerQueueNamesForProcessors", () => {
  it("returns one queue name per processor when all keys exist in registry", () => {
    const registry = [{ name: "a" }, { name: "b" }, { name: "other:queue" }];
    const processors = { a: true, b: true };
    const q = buildWorkerQueueNamesForProcessors(registry, processors);
    const sorted = [...q].toSorted((a, b) => a.localeCompare(b));
    expect(sorted).toEqual(["a", "b"]);
    expect(q.length).toBe(Object.keys(processors).length);
  });

  it("throws when a processor key is missing from registry", () => {
    expect(() => buildWorkerQueueNamesForProcessors([{ name: "a" }], { a: true, b: true })).toThrow(
      /not present in queueRegistry/,
    );
  });

  it("throws when duplicate registry rows would shrink worker list below processor count", () => {
    const registry = [{ name: "a" }, { name: "a" }];
    expect(() => buildWorkerQueueNamesForProcessors(registry, { a: true, b: true })).toThrow(
      /not present in queueRegistry/,
    );
  });
});
