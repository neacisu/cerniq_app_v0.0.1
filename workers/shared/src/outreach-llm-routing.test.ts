import { describe, it, expect, vi } from "vitest";

vi.mock("./llm-client.js", () => ({
  fastClient: { id: "fast" },
  reasoningClient: { id: "reasoning" },
  INFRAQ_FAST_MODEL: "fast-model",
  INFRAQ_REASONING_MODEL: "reasoning-model",
}));

import { outreachPreferenceToClient } from "./outreach-llm-routing.js";

describe("outreachPreferenceToClient", () => {
  it("VLLM_FAST → fastClient", () => {
    const r = outreachPreferenceToClient("VLLM_FAST");
    expect(r.preference).toBe("VLLM_FAST");
    expect(r.model).toBe("fast-model");
    expect((r.client as unknown as { id: string }).id).toBe("fast");
  });

  it("VLLM_REASONING → reasoningClient", () => {
    const r = outreachPreferenceToClient("VLLM_REASONING");
    expect(r.preference).toBe("VLLM_REASONING");
    expect(r.model).toBe("reasoning-model");
    expect((r.client as unknown as { id: string }).id).toBe("reasoning");
  });

  it("ANTHROPIC → reasoningClient (echivalent calitate pe infra self-hosted)", () => {
    const r = outreachPreferenceToClient("ANTHROPIC");
    expect(r.preference).toBe("ANTHROPIC");
    expect((r.client as unknown as { id: string }).id).toBe("reasoning");
  });

  it("valoare necunoscută → fast", () => {
    const r = outreachPreferenceToClient("OTHER");
    expect(r.preference).toBe("VLLM_FAST");
  });
});
