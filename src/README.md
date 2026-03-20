# Bridge `src/` (monorepo root)

- **`App.tsx`** — re-export către `apps/web/src/App.tsx`. Nu folosi symlink: TypeScript rezolvă `./pages/*` relativ la directorul fișierului; un symlink spre `apps/web` rupe toate importurile relative.
- **`pages/**`** — re-export-uri opționale (ex. `etapa2/leads-import`, `etapa1/gold`) pentru analizori care deschid căi sub `src/pages`.
- **`tsconfig.json`** — proiect TS dedicat cu `baseUrl` în `src/` și `@/*` → `apps/web/src/*`. Include explicit și **`../apps/web/src/App.tsx`**, astfel încât re-exportul din `src/App.tsx` să rezolve corect `./pages/...` din App-ul web (evită TS2307 atribuit greșit pe `src/App.tsx`).

Implementările canonice rămân în **`apps/web/src/`**.
