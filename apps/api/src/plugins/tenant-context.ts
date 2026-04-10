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
  "/documentation",
  "/metrics",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  /** Raportare erori browser — fără JWT; rate-limit per IP în rută. */
  "/api/v1/errors/client",
];

function isPublicRoute(url: string): boolean {
  return url === "/" || PUBLIC_PREFIXES.some((p) => url.startsWith(p));
}

/**
 * EventSource nu poate trimite `Authorization`. Rutele SSE care acceptă `?token=` trebuie
 * mapate la Bearer înainte de `jwtVerify()` din acest hook, altfel `request.tenantId` și RLS
 * nu se aplică corect (handler-ul poate re-verifica JWT, dar contextul deja rulat rămâne gol).
 */
function pathOnlyFromRequestUrl(url: string): string {
  const withoutQuery = url.split("?")[0] ?? "";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

/** Acceptă și variante în spatele unor gateway-uri (path scurt sau trailing slash). */
function isSseTokenQueryPath(pathOnly: string): boolean {
  return (
    pathOnly === "/api/v1/dashboard/kpi-stream" ||
    pathOnly.endsWith("/dashboard/kpi-stream") ||
    pathOnly === "/api/v1/brain/events/stream" ||
    pathOnly.endsWith("/brain/events/stream")
  );
}

/**
 * Mapare `?token=` → Bearer când header-ul lipsește: SSE + întreg namespace JSON `/api/v1/brain/*`
 * (aceleași garanții ca la dashboard kpi-stream; nu suprascrie Authorization existent).
 */
function injectBearerFromTokenQueryWhereAllowed(request: FastifyRequest): void {
  const raw = request.url ?? "";
  const pathOnly = pathOnlyFromRequestUrl(raw);
  const q = raw.indexOf("?");
  if (q === -1) return;
  const token = new URLSearchParams(raw.slice(q + 1)).get("token")?.trim();
  if (!token) return;
  const auth = request.headers.authorization;
  if (typeof auth === "string" && auth.trim().length > 0) return;

  if (isSseTokenQueryPath(pathOnly) || pathOnly.startsWith("/api/v1/brain/")) {
    request.headers.authorization = `Bearer ${token}`;
  }
}

async function tenantContextPlugin(app: FastifyInstance) {
  app.decorateRequest("tenantId", null);

  /** Always apply session GUCs (sentinels when null) so pooled connections are fail-closed for RLS. */
  const SENTINEL = "00000000-0000-0000-0000-000000000000";
  const setRequestContext = async (tenantId: string = SENTINEL, userId: string = SENTINEL) => {
    await db.execute(sql`
      SELECT
        set_config('app.tenant_id', ${tenantId}, false),
        set_config('app.current_user_id', ${userId}, false)
    `);
  };

  app.addHook("onRequest", async (request: FastifyRequest) => {
    if (isPublicRoute(request.url)) {
      // setRequestContext failures on public routes (e.g. DB unavailable) must not block
      // login/logout/register — those handlers manage their own DB errors.
      try {
        await setRequestContext();
      } catch (err) {
        request.log.warn(
          { err, url: request.url },
          "tenant-context: DB unavailable on public route — continuing",
        );
      }
      return;
    }

    injectBearerFromTokenQueryWhereAllowed(request);

    let tenantId: string | null = null;
    let userId: string | null;
    let role: string | undefined;

    try {
      await request.jwtVerify();
      const user = request.user as
        | {
            tenantId?: string;
            tenant_id?: string;
            role?: string;
            id?: string;
            userId?: string;
            sub?: string;
          }
        | undefined;
      if (user?.tenantId) tenantId = user.tenantId;
      else if (user?.tenant_id) tenantId = user.tenant_id;
      let explicitUserId: string | null = null;
      if (typeof user?.id === "string") {
        explicitUserId = user.id;
      } else if (typeof user?.userId === "string") {
        explicitUserId = user.userId;
      }
      userId = explicitUserId ?? (typeof user?.sub === "string" ? user.sub : null);
      role = user?.role;
    } catch {
      request.tenantId = null;
      try {
        await setRequestContext();
      } catch (err) {
        request.log.warn(
          { err },
          "tenant-context: DB unavailable when clearing unauthenticated context",
        );
      }
      return;
    }

    const header = request.headers["x-tenant-id"];
    if (role === "superadmin" && typeof header === "string" && header.trim()) {
      tenantId = header.trim();
    }

    request.tenantId = tenantId;
    try {
      await setRequestContext(tenantId ?? undefined, userId ?? undefined);
    } catch (err) {
      // RLS context could not be applied — fail the request before the handler runs
      // (fail-closed: better to 503 than to serve data without correct tenant isolation).
      request.log.error({ err, tenantId }, "tenant-context: failed to set RLS session context");
      throw err;
    }
  });
}

export const tenantContext = fp(tenantContextPlugin, {
  name: "tenant-context",
  dependencies: ["@fastify/jwt"],
});
