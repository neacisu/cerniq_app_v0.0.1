import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { envConfig } from "../config.js";
import { metricsPlugin } from "./metrics.js";
import { requestLoggingPlugin } from "./request-logging.js";

export async function registerPlugins(app: FastifyInstance) {
  await app.register(cors, {
    origin:
      envConfig.CORS_ORIGIN === "*" ? true : envConfig.CORS_ORIGIN.split(","),
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: envConfig.NODE_ENV === "production",
  });

  await app.register(jwt, {
    secret: envConfig.JWT_SECRET,
    sign: { expiresIn: envConfig.JWT_EXPIRES_IN },
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    max: envConfig.RATE_LIMIT_MAX,
    timeWindow: envConfig.RATE_LIMIT_WINDOW,
  });

  await app.register(requestLoggingPlugin);
  await app.register(metricsPlugin);
}
