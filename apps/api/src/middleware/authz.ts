import type { FastifyReply, FastifyRequest } from "fastify";

const ROLE_RANK: Record<string, number> = {
  viewer: 10,
  operator: 20,
  manager: 30,
  admin: 40,
  owner: 50,
  superadmin: 60,
};

export const requireRole =
  (...roles: string[]) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role?: string } | undefined;
    const current = user?.role?.toLowerCase();
    if (!current) {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }
    const allowed = roles.map((r) => r.toLowerCase());
    if (allowed.includes(current)) return;

    const currentRank = ROLE_RANK[current] ?? 0;
    const minRequiredRank = Math.min(...allowed.map((r) => ROLE_RANK[r] ?? 999));
    if (currentRank < minRequiredRank) {
      return reply.code(403).send({ success: false, error: "Forbidden" });
    }
  };
