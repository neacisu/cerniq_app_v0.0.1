/**
 * Bootstrap development — încarcă secretele ÎNAINTE de importul main.ts.
 * Producție: `node dist/main.js` cu env injectat de Docker/K8s.
 */
import { loadSecretsFromFile } from "@cerniq/worker-shared";

loadSecretsFromFile(true);
await import("./main.js");
