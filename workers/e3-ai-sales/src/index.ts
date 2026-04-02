import { bootstrap } from "./main.js";

bootstrap().catch((err) => {
  console.error("[e3-ai-sales] fatal startup error", err);
  process.exit(1);
});
