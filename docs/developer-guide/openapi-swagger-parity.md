# OpenAPI / Swagger — paritate cu contractul API

## Unde este UI-ul și spec-ul

| Resursă | Cale HTTP | Notă |
| ------- | --------- | ---- |
| Swagger UI | `/docs/` | `@fastify/swagger-ui`, `routePrefix: /docs` |
| Redirect alias | `/documentation` | **302** → `/docs/` (vezi `plugins/index.ts`) |
| OpenAPI JSON | `/docs/json` | Generat de `@fastify/swagger` |

## Sursa de adevăr

- **Validare request/response:** scheme **Zod** înregistrate pe rute (`fastify-type-provider-zod` — `validatorCompiler` / `serializerCompiler` în `apps/api/src/app.ts`).
- **OpenAPI:** este **derivat** din aceste scheme; dacă apare divergență, corectați schema Zod din handler, nu „doar” documentația UI.

## Exemple (`example`) și date fictive

- În **`imports-bronze`** (șabloane CSV), obiectele `TEMPLATE_COLUMNS` folosesc câmpul `example` pentru **metadata de import / UI** (denumiri, CUI, email de formă plauzibilă). Acestea **nu** sunt răspunsuri API; sunt ghid pentru utilizatorul care își construiește fișierul.
- Orice `example` din schemă trebuie să rămână **compatibil** cu validatorul Zod atașat (ex. string unde Zod cere string). Nu adăugați exemple numerice sau obiecte care nu trec `safeParse`.

## Rute fără schemă explicită

Rute interne sau foarte dinamice pot apărea în spec fără detaliu complet; în acel caz, documentați excluderea sau completați schema în PR-ul care le modifică.

## Referințe cod

- `apps/api/src/plugins/index.ts` — înregistrare `@fastify/swagger` / `@fastify/swagger-ui`, redirect `/documentation`.
- `apps/api/src/app.ts` — compilatoare Zod.
- `apps/api/__tests__/openapi-docs-redirect.test.ts` — verifică redirect și prezența spec-ului JSON.
