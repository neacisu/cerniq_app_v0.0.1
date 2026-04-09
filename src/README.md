# Bridge `src/` (monorepo root)

- **`App.tsx`** — re-export către `apps/web/src/App.tsx`. Nu folosi symlink: TypeScript rezolvă `./pages/*` relativ la directorul fișierului; un symlink spre `apps/web` rupe toate importurile relative.
- **`pages/**`** — re-export-uri opționale (ex. `etapa2/leads-import`, `etapa1/gold`) pentru analizori care deschid căi sub `src/pages`.
- **`tsconfig.json`** — `compilerOptions.baseUrl` este **`..`** (rădăcina monorepo), astfel încât mapările din `tsconfig.json` rădăcină (`@/*`, `@cerniq/integrations/*`, etc.) se moștenesc corect. **Nu** suprascrie `paths` doar cu `@/*` — altfel dispar rezolvările pentru `@cerniq/integrations` și apar TS2307.
- **Fără `src/routes/`** — rutele API stau în **`apps/api/src/routes/`**. Re-export `export * from "../../apps/api/..."` trage tot modulul API în proiectul `src/` și poate genera erori de tip (Fastify) sau TS2307 pe integrări; folosește direct căile din `apps/api`.

Implementările canonice: **`apps/web/src/`** (UI), **`apps/api/src/`** (API), **`workers/ai/src/`** (worker AI / consensus). `src/consensus-vote-worker.ts` este doar **re-export** către `workers/ai/src/consensus-vote-worker.ts` (fără logică duplicată); nu copia conținutul workerului aici.
