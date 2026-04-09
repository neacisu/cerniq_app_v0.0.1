import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWaProvider } from "../providers/factory.js";
import { TimelinesAiWaProvider } from "../providers/timelinesai-wa.js";

describe("ADR-0031 provider factories", () => {
  beforeEach(() => {
    process.env.TIMELINESAI_API_URL = "https://api.timelines.ai/v1";
    process.env.TIMELINESAI_API_KEY = "test-key";
    process.env.TIMELINESAI_WEBHOOK_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.TIMELINESAI_API_URL;
    delete process.env.TIMELINESAI_API_KEY;
    delete process.env.TIMELINESAI_WEBHOOK_SECRET;
  });

  it("createWaProvider(timelineai) returnează instanță TimelinesAi", () => {
    const p = createWaProvider("timelinesai");
    expect(p).toBeInstanceOf(TimelinesAiWaProvider);
  });
});
