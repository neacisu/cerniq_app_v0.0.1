import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { setSessionTenantId } from "@cerniq/db";

declare module "fastify" {
  interface FastifyRequest {
    tenantId?: string | null;
  }
}

const PUBLIC_PREFIXES = ["/health", "/docs", "/metrics", "/auth/login", "/auth/register"];

function isPublicRoute(url: string): boolean {
  return url === "/" || PUBLIC_PREFIXES.some((p) => url.startsWith(p));
}

async function tenantContextPlugin(app: FastifyInstance) {
  app.decorateRequest("tenantId", null);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    if (isPublicRoute(request.url)) {
      return;
    }

    let tenantId: string | null = null;
    let role: string | undefined;

    try {
      await request.jwtVerify();
      const user = request.user as
        | { tenantId?: string; tenant_id?: string; role?: string }
        | undefined;
      if (user?.tenantId) tenantId = user.tenantId;
      else if (user?.tenant_id) tenantId = user.tenant_id;
      role = user?.role;
    } catch {
      request.tenantId = null;
      await setSessionTenantId(null);
      return;
    }

    const header = request.headers["x-tenant-id"];
    if (role === "superadmin" && typeof header === "string" && header.trim()) {
      tenantId = header.trim();
    }

    request.tenantId = tenantId;
    await setSessionTenantId(tenantId);
  });
}

export const tenantContext = fp(tenantContextPlugin, {
  name: "tenant-context",
  dependencies: ["@fastify/jwt"],
});
