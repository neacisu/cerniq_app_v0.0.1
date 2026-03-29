import { bootstrap } from "./main.js";

try {
  await bootstrap();
} catch (err) {
  console.error("[worker-ai] fatal", err);
  process.exit(1);
}
