import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { scheduleMock } = vi.hoisted(() => ({
  scheduleMock: vi.fn(),
}));

vi.mock("./error-log-persist.js", () => ({
  scheduleApiErrorLogPersist: scheduleMock,
}));

import { errorHandler } from "./handler.js";
import { AppError } from "./app-error.js";

function mockReqReply() {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };
  const request = {
    log: { error: vi.fn() },
    headers: {} as Record<string, string | undefined>,
    tenantId: null as string | null,
  };
  return { request, reply };
}

describe("errorHandler — error_log pe ramura generică", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("API_ERROR_LOG_IN_TEST", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("nu apelează scheduleApiErrorLogPersist pentru AppError", () => {
    const { request, reply } = mockReqReply();
    const err = new AppError("msg", 400, "BAD");
    errorHandler(err, request as never, reply as never);
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it("apelează scheduleApiErrorLogPersist pentru eroare generică cu status >= 500", () => {
    const { request, reply } = mockReqReply();
    const err = Object.assign(new Error("boom"), { statusCode: 500 });
    errorHandler(err as never, request as never, reply as never);
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(reply.status).toHaveBeenCalledWith(500);
  });

  it("nu apelează scheduleApiErrorLogPersist pentru 4xx generic (ex. 418)", () => {
    const { request, reply } = mockReqReply();
    const err = Object.assign(new Error("teapot"), { statusCode: 418 });
    errorHandler(err as never, request as never, reply as never);
    expect(scheduleMock).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(418);
  });
});
