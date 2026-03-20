/**
 * Punct de intrare **doar pentru development** (`pnpm dev`).
 *
 * De ce există acest fișier:
 * - `main.ts` importă static `@cerniq/db`, BullMQ etc. — aceste module citesc `process.env` la încărcare.
 * - În local, secretele pot veni din `/secrets/workers.env` (sau `SECRETS_PATH`).
 * - `loadSecretsFromFile(true)` trebuie rulat **înainte** ca `main.ts` să fie evaluat, deci nu poate fi doar „primul rând” în `main.ts` (importurile sunt hoisted).
 *
 * Producție: `node dist/main.js` — variabilele de mediu sunt injectate de runtime (Docker/K8s), fără acest bootstrap.
 *
 * @see package.json script `dev`
 */
import { loadSecretsFromFile } from "@cerniq/worker-shared";

loadSecretsFromFile(true);
await import("./main.js");
