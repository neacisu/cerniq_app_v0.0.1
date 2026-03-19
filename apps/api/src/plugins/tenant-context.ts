import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { db, sql } from "@cerniq/db";

declare module "fastify" {
  interface FastifyRequest {
    tenantId?: string | null;
  }
}

const PUBLIC_PREFIXES = [
  "/health",
  "/docs",
  "/metrics",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
];

function isPublicRoute(url: string): boolean {
  return url === "/" || PUBLIC_PREFIXES.some((p) => url.startsWith(p));
}

async function tenantContextPlugin(app: FastifyInstance) {
  app.decorateRequest("tenantId", null);

  const setRequestContext = async (tenantId: string | null, userId: string | null) => {
    const tenantValue = tenantId ?? "00000000-0000-0000-0000-000000000000";
    const userValue = userId ?? "00000000-0000-0000-0000-000000000000";
    await db.execute(sql`
      SELECT
        set_config('app.tenant_id', ${tenantValue}, false),
        set_config('app.current_user_id', ${userValue}, false)
    `);
  };

  app.addHook("onRequest", async (request: FastifyRequest) => {
    if (isPublicRoute(request.url)) {
      await setRequestContext(null, null);
      return;
    }

    let tenantId: string | null = null;
    let userId: string | null;
    let role: string | undefined;

    try {
      await request.jwtVerify();
      const user = request.user as
        | { tenantId?: string; tenant_id?: string; role?: string; id?: string; sub?: string }
        | undefined;
      if (user?.tenantId) tenantId = user.tenantId;
      else if (user?.tenant_id) tenantId = user.tenant_id;
      userId =
        typeof user?.id === "string" ? user.id : typeof user?.sub === "string" ? user.sub : null;
      role = user?.role;
    } catch {
      request.tenantId = null;
      await setRequestContext(null, null);
      return;
    }

    const header = request.headers["x-tenant-id"];
    if (role === "superadmin" && typeof header === "string" && header.trim()) {
      tenantId = header.trim();
    }

    request.tenantId = tenantId;
    await setRequestContext(tenantId, userId);
  });
}

export const tenantContext = fp(tenantContextPlugin, {
  name: "tenant-context",
  dependencies: ["@fastify/jwt"],
});
