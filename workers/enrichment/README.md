# `@cerniq/worker-enrichment`

Worker BullMQ pentru pipeline-ul de îmbogățire (bronze → silver → gold).

## Development

```bash
pnpm --filter @cerniq/worker-enrichment dev
```

Rulează `tsx watch src/bootstrap.ts` — **nu** `src/main.ts` direct.

### De ce `src/bootstrap.ts`?

`bootstrap.ts` încarcă secretele din fișier (`loadSecretsFromFile(true)`) și **abia apoi** importă `main.js`. Astfel `DATABASE_URL`, `REDIS_URL`, etc. sunt disponibile înainte ca importurile statice din `main.ts` (inclusiv `@cerniq/db`) să fie evaluate.

Dacă `bootstrap.ts` lipsește din working tree, `tsc --noEmit` raportează **TS6053** pentru acel path. Fișierul trebuie să fie prezent în repo (vezi `git ls-files workers/enrichment/src/bootstrap.ts`).

## Producție

```bash
pnpm --filter @cerniq/worker-enrichment build
node dist/main.js
```

Imagine Docker: vezi `Dockerfile` — pornește `dist/main.js`; env vine din orchestrator.

## Typecheck

```bash
pnpm --filter @cerniq/worker-enrichment typecheck
```

Folosește `tsconfig.json` din acest pachet (`include`: `src/**/*.ts`, `vitest.config.ts`).
