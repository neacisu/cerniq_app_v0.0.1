import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  embeddingsClient,
  fastClient,
  getInfraqGuardAuthHeaders,
  InfraqTokenBucket,
  INFRAQ_DEFAULT_BASE_URL,
  INFRAQ_EMBEDDINGS_MODEL,
  INFRAQ_FAST_MODEL,
  INFRAQ_REASONING_MODEL,
  infraqGuardFetch,
  infraqGuardUrl,
  reasoningClient,
  resolveInfraqBaseUrl,
} from "./llm-client.js";
import {
  llmCostUsdTotal,
  llmFallbackTotal,
  llmRequestsTotal,
  llmTokensTotal,
  metricsRegistry,
  recordLlmCostUsd,
  recordLlmFallback,
} from "./metrics.js";

describe("resolveInfraqBaseUrl", () => {
  it("folosește INFRAQ_BASE_URL cu prioritate față de INFRAQ_BASE", () => {
    expect(
      resolveInfraqBaseUrl({
        INFRAQ_BASE_URL: "https://x.example/llm/v1/",
        INFRAQ_BASE: "https://ignored/",
      }),
    ).toBe("https://x.example/llm/v1");
  });

  it("fallback la INFRAQ_BASE dacă INFRAQ_BASE_URL lipsește", () => {
    expect(resolveInfraqBaseUrl({ INFRAQ_BASE: "https://y.example/llm/v1" })).toBe(
      "https://y.example/llm/v1",
    );
  });

  it("default https://infraq.app/llm/v1", () => {
    expect(resolveInfraqBaseUrl({})).toBe(INFRAQ_DEFAULT_BASE_URL);
  });
});

describe("infraqGuardUrl", () => {
  it("concatenează corect baza guard cu path relativ", () => {
    expect(infraqGuardUrl("analyze/prompt")).toBe("https://infraq.app/llm/v1/guard/analyze/prompt");
    expect(infraqGuardUrl("/analyze/output")).toBe(
      "https://infraq.app/llm/v1/guard/analyze/output",
    );
  });
});

describe("InfraqTokenBucket", () => {
  it("permite burst până la capacitate apoi reumple în timp", async () => {
    vi.useFakeTimers();
    const b = new InfraqTokenBucket(3, 60);
    await b.acquire(1);
    await b.acquire(1);
    await b.acquire(1);
    expect(b.getAvailableTokensForTest()).toBe(0);
    const next = b.acquire(1);
    vi.advanceTimersByTime(50);
    await next;
    vi.useRealTimers();
  });

  it("aruncă dacă cost > capacity", async () => {
    const b = new InfraqTokenBucket(2, 10);
    await expect(b.acquire(3)).rejects.toThrow(/exceeds capacity/);
  });
});

describe("getInfraqGuardAuthHeaders", () => {
  afterEach(() => {
    delete process.env.INFRAQ_GUARD_TOKEN;
  });

  it("aruncă fără token", () => {
    expect(() => getInfraqGuardAuthHeaders()).toThrow(/INFRAQ_GUARD_TOKEN/);
  });

  it("returnează Bearer când token este setat", () => {
    process.env.INFRAQ_GUARD_TOKEN = "  secret  ";
    expect(getInfraqGuardAuthHeaders()).toEqual({ Authorization: "Bearer secret" });
  });
});

describe("instrumented OpenAI fetch + metrici", () => {
  beforeEach(() => {
    metricsRegistry.resetMetrics();
    process.env.INFRAQ_GUARD_TOKEN = "test-guard";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("înregistrează request, latency și tokeni pentru chat JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const body = JSON.stringify({
          id: "1",
          object: "chat.completion",
          created: 0,
          model: "Qwen/QwQ-32B-AWQ",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "ok" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });
        return new Response(body, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const out = await reasoningClient.chat.completions.create({
      model: INFRAQ_REASONING_MODEL,
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out.choices[0]?.message?.content).toBe("ok");

    expect(await llmRequestsTotal.get()).toMatchObject({
      values: [
        expect.objectContaining({
          value: 1,
          labels: expect.objectContaining({
            model_id: INFRAQ_REASONING_MODEL,
            task_type: "chat_completion",
            status: "success",
            is_selfhosted: "true",
          }),
        }),
      ],
    });
    const tokenVals = await llmTokensTotal.get();
    const input = tokenVals.values.find((v) => v.labels.type === "input");
    const output = tokenVals.values.find((v) => v.labels.type === "output");
    expect(input?.value).toBe(10);
    expect(output?.value).toBe(5);
  });

  it("marchează error la răspuns non-2xx JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "bad" } }), {
            status: 502,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    await expect(
      fastClient.chat.completions.create({
        model: INFRAQ_FAST_MODEL,
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toThrow();

    const req = await llmRequestsTotal.get();
    expect(req.values[0]?.labels.status).toBe("error");
  });

  it("înregistrează embeddings usage (total_tokens)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              object: "list",
              data: [{ object: "embedding", embedding: [0.1, 0.2], index: 0 }],
              model: "qwen3-embedding-8b-q5km",
              usage: { total_tokens: 7 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );

    await embeddingsClient.embeddings.create({
      model: INFRAQ_EMBEDDINGS_MODEL,
      input: "text",
    });

    const t = await llmTokensTotal.get();
    expect(t.values.find((v) => v.labels.type === "input")?.value).toBe(7);
  });

  it("propagă eșec rețea și contorizează error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    await expect(
      fastClient.chat.completions.create({
        model: INFRAQ_FAST_MODEL,
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toThrow(/Connection error/i);

    expect((await llmRequestsTotal.get()).values[0]?.labels.status).toBe("error");
  });
});

describe("infraqGuardFetch", () => {
  beforeEach(() => {
    process.env.INFRAQ_GUARD_TOKEN = "tok";
    metricsRegistry.resetMetrics();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("trimite Authorization Bearer și apelează URL-ul", async () => {
    const mockFetch = vi.fn(
      async () =>
        new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const url = infraqGuardUrl("analyze/prompt");
    await infraqGuardFetch(url, { method: "POST", body: "{}" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[1]).toBeDefined();
    const h = new Headers(call[1].headers);
    expect(h.get("Authorization")).toBe("Bearer tok");
  });
});

describe.sequential("recordLlmFallback / recordLlmCostUsd", () => {
  beforeEach(() => {
    metricsRegistry.resetMetrics();
  });

  it("incrementează fallback și cost", async () => {
    recordLlmFallback("grok-4", "timeout");
    recordLlmCostUsd("xai", "tenant-1", 0.001);
    expect((await llmFallbackTotal.get()).values[0]?.value).toBe(1);
    expect((await llmCostUsdTotal.get()).values[0]?.value).toBeCloseTo(0.001);
  });

  it("ignoră cost 0 pentru provider infraq", async () => {
    recordLlmCostUsd("infraq", "t", 0);
    expect((await llmCostUsdTotal.get()).values.length).toBe(0);
  });
});
