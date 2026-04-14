# Progres UI (SSE) — A1 CSV ingest

## Rută și filtru

- **API:** ruta cognitive brain SSE (Fastify) — vezi `apps/api/src/routes/cognitive-brain.ts`.
- **Wire:** mesaje JSON în Redis; evaluare în `apps/api/src/lib/cognitive-sse-live-message.ts`.
- **Filtru batch:** query `batchId` opțional: dacă este setat, mesajele fără `batchId` identic sunt respinse (`reason: batch_scope`).

## Gap G1 (documentat)

`csvParserProcessor` apelează `withCognitiveSpan` cu context `{ tenantId }` în loc de `buildCognitiveWorkerEventContext(tenantId, correlationId, job.data)` (pattern J1). Astfel, **`batchId` poate lipsi** din contextul propagat la evenimente, iar clientul SSE cu `?batchId=` nu primește aceste evenimente.

**Remediere:** aliniază A1 la J1; verificare cu test.

## Latență

Nu se afirmă ms fără măsurătoare. Factori: publicare Redis din worker, latență API, rețea, browser `EventSource`.

**Backlog:** histogramă E2E sau test de performanță dedicat (item separat de pilot).

## Surse externe (context)

- [MDN — EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) — acces 2026-04-14.
- [WHATWG — Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) — acces 2026-04-14.
