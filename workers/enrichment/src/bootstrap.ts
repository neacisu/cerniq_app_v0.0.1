import { loadSecretsFromFile } from "@cerniq/worker-shared";

loadSecretsFromFile(true);
await import("./main.js");
