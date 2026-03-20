import type { FastifyInstance } from "fastify";
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
import { metricsPlugin } from "./metrics.js";
import { requestLoggingPlugin } from "./request-logging.js";
import { tenantContext } from "./tenant-context.js";

function getRateLimitScope(request: { routeOptions?: { url?: string }; url: string }) {
  return request.routeOptions?.url ?? request.url.split("?")[0] ?? "unknown";
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
        description: "Cerniq.app backend API",
        version: "0.0.1",
      },
      servers: [{ url: "/", description: "Current" }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

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
  });

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
              "connect-src": ["'self'"],
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
}
