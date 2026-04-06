# SSE Cognitive Brain — JWT în query string (`?token=`)

## Context

- Browser **`EventSource`** nu permite setarea header-ului `Authorization`.
- Clientul construiește URL-ul [`buildBrainStreamUrl`](../../apps/web/src/hooks/use-cognitive-brain.ts) ca `/api/v1/brain/events/stream?token=<JWT>` (vezi și comentariile din cod).
- API acceptă autentificare SSE prin **header `Authorization`** sau **query `token`**, injectând Bearer pentru verificarea JWT ([`cognitive-brain.ts`](../../apps/api/src/routes/cognitive-brain.ts) — rută `/events/stream`).

## Riscuri operaționale

| Risc | Descriere |
| ---- | --------- |
| Loguri proxy / gateway | URL-ul complet poate fi scris în loguri dacă serverul loghează request line sau query string. |
| Referrer | Navigări ulterioare rare; SSE rămâne deschis pe același origin în mod tipic. |
| Support / training | Capturi de ecran sau exporturi de loguri pot expune tokenul dacă includ URL-ul. |
| Istoric browser | Mai puțin relevant pentru conexiuni long-lived, dar URL-ul apare în DevTools. |

## Mitigări acceptate (operațional + tehnic)

1. **TTL scurt pentru access token** și rotație — limitează fereastra dacă tokenul apare într-un log.
2. **Evitarea logării query string** la nivel de reverse proxy / API gateway pentru path-ul `/api/v1/brain/events/stream` (filtru sau sampling fără `query`).
3. **Domeniu API dedicat** (fără partajare accidentală de referrer cu terți) și HTTPS obligatoriu.
4. **Monitorizare** — alertă dacă loghearea conține pattern `token=` pe rute sensibile.

## Alternative (spike / roadmap)

- **Cookie HttpOnly** + același origin pentru API și SPA (sau BFF) astfel încât `EventSource` trimită cookie fără token în URL — necesită schimbări de deployment și CORS/samesite.
- **Endpoint scurt de schimb** — emite un **ticket SSE** cu viață foarte scurtă, înlocuind JWT-ul în query; cere suport API dedicat.

**Nu** eliminați autentificarea SSE fără un înlocuitor echivalent — stream-ul este tenant-scoped pe server.

## Legături

- [`apps/web/src/hooks/use-cognitive-brain.ts`](../../apps/web/src/hooks/use-cognitive-brain.ts) — `useCognitiveEventStream`, `buildBrainStreamUrl`
- [`apps/api/src/routes/cognitive-brain.ts`](../../apps/api/src/routes/cognitive-brain.ts) — handler SSE + `sseQuerySchema`
