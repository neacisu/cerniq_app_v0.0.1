import { loadSecretsFromFile } from "@cerniq/worker-shared";

loadSecretsFromFile();
await import("./main.js");
