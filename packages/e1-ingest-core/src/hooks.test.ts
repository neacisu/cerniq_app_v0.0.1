import { beforeEach, describe, expect, it } from "vitest";
import {
  configureE1IngestWorkerHooks,
  getE1IngestWorkerHooks,
  resetE1IngestWorkerHooksForTests,
} from "./hooks.js";

describe("e1-ingest-core hooks", () => {
  beforeEach(() => {
    resetE1IngestWorkerHooksForTests();
  });

  it("throws if hooks are not configured", () => {
    expect(() => getE1IngestWorkerHooks()).toThrow(/configureE1IngestWorkerHooks/);
  });

  it("returns configured hooks", () => {
    const hooks = {
      sanitizeCui: (s: string) => s.trim() || null,
      createHitlApprovalTask: async () => null,
    };
    configureE1IngestWorkerHooks(hooks);
    expect(getE1IngestWorkerHooks()).toBe(hooks);
  });
});
