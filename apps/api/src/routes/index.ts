import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: "/health" });

  app.get("/", async () => ({
    success: true,
    data: {
      name: "Cerniq API",
      version: "0.0.1",
      status: "running",
    },
  }));
}
