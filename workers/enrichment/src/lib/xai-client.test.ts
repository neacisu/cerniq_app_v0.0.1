import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInfo = vi.fn();
const mockError = vi.fn();

vi.mock("@cerniq/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: mockInfo,
    error: mockError,
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  process.env.XAI_API_KEY = "x-key";
  process.env.XAI_MODEL = "grok-test";
  process.env.XAI_BASE_URL = "https://api.xai.example/v1";
});

describe("xaiStructuredJson", () => {
  it("401 fails with cause and logs http error", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => "unauthorized",
      })),
    );

    const { xaiStructuredJson } = await import("./xai-client.js");
    const err = await xaiStructuredJson("s", "u").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).cause).toBeInstanceOf(Error);
    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ event: "xai_http_error", httpStatus: 401 }),
    );
  });

  it("200 with invalid message JSON throws with cause", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "not-json{" } }],
        }),
      })),
    );

    const { xaiStructuredJson } = await import("./xai-client.js");
    const err = await xaiStructuredJson("s", "u").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).cause).toBeTruthy();
    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ event: "xai_request_error", phase: "content_json_parse" }),
    );
  });

  it("200 valid parses and logs token fields when present", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          choices: [{ message: { content: '{"a":1}' } }],
        }),
      })),
    );

    const { xaiStructuredJson } = await import("./xai-client.js");
    const r = await xaiStructuredJson("sys", "usr");
    expect(r).toEqual({ a: 1 });
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "xai_request_success",
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        endpointPath: "/chat/completions",
      }),
    );
  });

  it("outer response.json failure has cause", async () => {
    vi.doMock("@cerniq/worker-shared", () => ({
      callExternalApi: vi.fn((_p: string, fn: () => unknown) => fn()),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("bad");
        },
      })),
    );

    const { xaiStructuredJson } = await import("./xai-client.js");
    const err = await xaiStructuredJson("s", "u").catch((e: unknown) => e);
    expect((err as Error).cause).toBeInstanceOf(SyntaxError);
  });
});
