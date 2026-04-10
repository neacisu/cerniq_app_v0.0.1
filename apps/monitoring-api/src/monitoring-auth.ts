/**
 * Autentificare monitoring-api: JWT (același `JWT_SECRET` ca API) sau `x-admin-key` (fallback operațional).
 */
import type { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

const ROLE_RANK: Record<string, number> = {
  viewer: 10,
  operator: 20,
  manager: 30,
  admin: 40,
  owner: 50,
  superadmin: 60,
};

export type MonitoringMinRole = "viewer" | "admin";

function roleRank(role: string | undefined): number {
  if (!role) return 0;
  return ROLE_RANK[role.toLowerCase()] ?? 0;
}

/**
 * Returnează `true` dacă accesul e permis; altfel `false` (apelantul setează 401/403).
 */
export function verifyMonitoringAccess(
  request: FastifyRequest,
  minRole: MonitoringMinRole,
): boolean {
  const adminKey = request.headers["x-admin-key"];
  const expected = process.env.ADMIN_KEY;
  if (typeof adminKey === "string" && expected && adminKey === expected) {
    return true;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return false;
  }

  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return false;
  }
  const token = auth.slice(7).trim();
  if (!token) return false;

  try {
    const payload = jwt.verify(token, secret) as { role?: string };
    const need = minRole === "admin" ? ROLE_RANK.admin : ROLE_RANK.viewer;
    return roleRank(payload.role) >= need;
  } catch {
    return false;
  }
}

export function verifyMonitoringTokenString(token: string, minRole: MonitoringMinRole): boolean {
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    const payload = jwt.verify(token, secret) as { role?: string };
    const need = minRole === "admin" ? ROLE_RANK.admin : ROLE_RANK.viewer;
    return roleRank(payload.role) >= need;
  } catch {
    return false;
  }
}

export function monitoringPathRequiresAdmin(path: string): boolean {
  return /\/api\/queues\/[^/]+\/(pause|resume|retry-failed|drain)$/.test(path);
}
