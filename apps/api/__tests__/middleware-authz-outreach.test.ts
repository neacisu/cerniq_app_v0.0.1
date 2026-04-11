/**
 * Contract RBAC: `requireRole("operator")` blochează rolul viewer (fără stack API / DB).
 */
import { describe, it, expect, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireRole } from "../src/middleware/authz.js";

function mockReply() {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as unknown as FastifyReply;
}

function mockRequest(partial: { user?: { role: string } }): FastifyRequest {
  const log = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  log.child.mockReturnValue(log);
  return {
    method: "GET",
    url: "/test",
    headers: {},
    log,
    ...partial,
  } as unknown as FastifyRequest;
}

describe("requireRole — aliniere outreach (operator pentru mutații)", () => {
  it("viewer → 403 când e cerut operator", async () => {
    const request = mockRequest({ user: { role: "viewer" } });
    const reply = mockReply();
    await requireRole("operator")(request, reply);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it("operator → nu trimite 403", async () => {
    const request = mockRequest({ user: { role: "operator" } });
    const reply = mockReply();
    await requireRole("operator")(request, reply);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("admin → nu trimite 403 (rank >= operator)", async () => {
    const request = mockRequest({ user: { role: "admin" } });
    const reply = mockReply();
    await requireRole("operator")(request, reply);
    expect(reply.code).not.toHaveBeenCalled();
  });
});
