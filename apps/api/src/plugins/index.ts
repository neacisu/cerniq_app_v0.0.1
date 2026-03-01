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

function createRateLimitRedis() {
  return new Redis(envConfig.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 3000)),
  });
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
    contentSecurityPolicy: envConfig.NODE_ENV === "production",
  });

  await app.register(jwt, {
    secret: async (_request: unknown, _tokenOrPayload: unknown) => envConfig.JWT_SECRET,
    sign: { expiresIn: envConfig.JWT_EXPIRES_IN },
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
    nameSpace: `${envConfig.REDIS_PREFIX ?? "cerniq"}:ratelimit:`,
    max: envConfig.RATE_LIMIT_MAX,
    timeWindow: envConfig.RATE_LIMIT_WINDOW,
    redis: rateLimitRedis,
    skipOnError: true,
  });

  await app.register(tenantContext);
  await app.register(requestLoggingPlugin);
  await app.register(metricsPlugin);
}
