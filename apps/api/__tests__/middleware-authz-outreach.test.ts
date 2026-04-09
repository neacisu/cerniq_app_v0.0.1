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

describe("requireRole — aliniere outreach (operator pentru mutații)", () => {
  it("viewer → 403 când e cerut operator", async () => {
    const request = { user: { role: "viewer" } } as FastifyRequest;
    const reply = mockReply();
    await requireRole("operator")(request, reply);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it("operator → nu trimite 403", async () => {
    const request = { user: { role: "operator" } } as FastifyRequest;
    const reply = mockReply();
    await requireRole("operator")(request, reply);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("admin → nu trimite 403 (rank >= operator)", async () => {
    const request = { user: { role: "admin" } } as FastifyRequest;
    const reply = mockReply();
    await requireRole("operator")(request, reply);
    expect(reply.code).not.toHaveBeenCalled();
  });
});
