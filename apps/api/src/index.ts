import { buildApp } from "./app.js";
import { envConfig } from "./config.js";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: envConfig.PORT, host: "0.0.0.0" });
    app.log.info(`API server listening on port ${envConfig.PORT}`);
  } catch (err) {
    app.log.fatal(err, "Failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
