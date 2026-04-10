import type { FastifyInstance, FastifyRequest } from "fastify";
import Redis from "ioredis";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import multipart from "@fastify/multipart";
import { envConfig } from "../config.js";
import {
  metricsPlugin,
  rateLimitExceededTotal,
  httpRouteLabel,
  httpRequestSurface,
} from "./metrics.js";
import { requestLoggingPlugin } from "./request-logging.js";
import { tenantContext } from "./tenant-context.js";
import { auditTrailPlugin } from "./audit-trail.js";

function getRateLimitScope(request: { routeOptions?: { url?: string }; url: string }) {
  return request.routeOptions?.url ?? request.url.split("?")[0] ?? "unknown";
}

function rateLimitMetricLabels(request: FastifyRequest) {
  return { route: httpRouteLabel(request), surface: httpRequestSurface(request) };
}

function createRateLimitRedis() {
  const client = new Redis(envConfig.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 10000),
  });
  client.on("error", () => {
    // Rate-limit Redis errors are handled via skipOnError:true; suppress unhandled event.
  });
  return client;
}

let rateLimitRedis = createRateLimitRedis();

export async function refreshRateLimitRedis() {
  try {
    await rateLimitRedis.quit();
  } catch {
    // Ignore disconnect errors and replace client.
  }
  rateLimitRedis = createRateLimitRedis();
}

export async function registerPlugins(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Cerniq API",
        description:
          "Cerniq.app backend API. Schema OpenAPI este generată din **Zod** (`fastify-type-provider-zod`); " +
          "handler-ele rămân sursa de adevăr pentru validare. " +
          "**UI Swagger:** `/docs` (redirect canonic de la `/documentation`). **Spec JSON:** `/docs/json`. " +
          "Valorile `example` din unele scheme (ex. coloane șablon import) sunt **metadata pentru UI** — nu sunt răspunsuri API reale; " +
          "nu trebuie confundate cu payload-uri de runtime. Vezi `docs/developer-guide/openapi-swagger-parity.md`.",
        version: "0.0.1",
      },
      servers: [{ url: "/", description: "Current" }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  /** Alias documentat în planuri ADR / interne (`/documentation` → UI real `/docs/`). */
  app.get("/documentation", (_request, reply) => reply.redirect("/docs/", 302));

  const corsOrigins =
    envConfig.CORS_ORIGIN === "*"
      ? [
          "https://cerniq.app",
          "https://dev.cerniq.app",
          "https://staging.cerniq.app",
          "https://admin.cerniq.app",
          "https://admin.dev.cerniq.app",
          "https://admin.staging.cerniq.app",
          "http://localhost:64000",
          "http://localhost:5173",
        ]
      : envConfig.CORS_ORIGIN.split(",")
          .map((o) => o.trim())
          .filter(Boolean);

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    /** Browser cross-origin poate citi headerul pentru corelare cu loguri / suport. */
    exposedHeaders: ["x-correlation-id", "x-request-id"],
  });

  const connectSrcExtra =
    envConfig.CSP_CONNECT_SRC_EXTRA?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  await app.register(helmet, {
    contentSecurityPolicy:
      envConfig.NODE_ENV === "development"
        ? false
        : {
            directives: {
              "default-src": ["'self'"],
              "script-src": ["'self'"],
              "style-src": ["'self'", "'unsafe-inline'"],
              "img-src": ["'self'", "data:", "blob:"],
              "connect-src": ["'self'", "wss:", "https://infraq.app", ...connectSrcExtra],
              "font-src": ["'self'"],
              "object-src": ["'none'"],
              "frame-ancestors": ["'none'"],
              "base-uri": ["'self'"],
            },
          },
  });

  await app.register(jwt, {
    secret: envConfig.JWT_SECRET,
    sign: {
      expiresIn: envConfig.JWT_EXPIRES_IN,
    },
    verify: {
      allowedIss: "cerniq.app",
      allowedAud: "cerniq-api",
    },
    messages: {
      authorizationTokenExpiredMessage: "Token expired",
      authorizationTokenInvalid: "Invalid token",
      authorizationTokenUntrusted: "Untrusted authorization token",
    },
  });

  await app.register(cookie);
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 100 * 1024 * 1024,
    },
  });

  app.addHook("onClose", (_instance, done) => {
    if (rateLimitRedis.status === "ready" || rateLimitRedis.status === "connect") {
      rateLimitRedis
        .quit()
        .catch(() => {})
        .finally(done);
    } else {
      done();
    }
  });
  await app.register(rateLimit, {
    hook: "preHandler",
    nameSpace: `${envConfig.REDIS_PREFIX ?? "cerniq"}:ratelimit:`,
    max: envConfig.RATE_LIMIT_MAX,
    timeWindow: envConfig.RATE_LIMIT_WINDOW,
    redis: rateLimitRedis,
    skipOnError: true,
    onExceeded: (request) => {
      rateLimitExceededTotal.inc(rateLimitMetricLabels(request));
    },
    keyGenerator: (request) => {
      const scope = getRateLimitScope(request);
      const tenantId =
        typeof request.tenantId === "string" && request.tenantId.trim().length > 0
          ? request.tenantId.trim()
          : null;
      return tenantId ? `tenant:${tenantId}:${scope}` : `ip:${request.ip}:${scope}`;
    },
  });

  await app.register(tenantContext);
  await app.register(requestLoggingPlugin);
  await app.register(metricsPlugin);
  await app.register(auditTrailPlugin);
}
