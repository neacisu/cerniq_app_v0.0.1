# Domeniu SPA: compliance (`compliance.ts`) și webhook-uri inbound (`webhooks.ts`)

**Data audit:** 2026-04-03  
**Scop:** Îndeplinirea cerinței din plan — *dacă nu există consumator în SPA, documentare explicită* pentru a evita gap-uri nedeclarate și reintroducerea de mock-uri.

## Registru rute API (sursă: `apps/api/src/routes/index.ts`)

| Modul | Prefix înregistrat | Rol |
| ----- | ------------------ | --- |
| `complianceRoutes` | `/api/v1/ai` | GET explicabilitate decizie credit (date din `goldCompanies` per tenant) |
| `webhooksRoutes` | `/api/v1/webhooks` | POST inbound (TimelinesAI, Instantly, Resend) — semnătură + coadă BullMQ |

Detalii implementare: `apps/api/src/routes/compliance.ts` (ex. `GET /decisions/:id/explanation`), `apps/api/src/routes/webhooks.ts`.

## Verificare consumatori în `apps/web`

Căutare pe cod sursă (pattern-uri: `webhooks`, `/api/v1/webhooks`, `/api/v1/ai/`, `decisions/`):

- **Nu există** apeluri către `/api/v1/webhooks/*` din SPA — așteptat: webhook-urile sunt endpoint-uri server-to-server pentru integratori, nu pentru browser.
- **Nu există** apeluri către `/api/v1/ai/decisions/` sau prefix echivalent pentru explicabilitate compliance din fișierele `.ts`/`.tsx` ale SPA-ului principal.

Alte mențiuni „compliance” în `apps/web` (ex. dashboard E5, neuroni cognitive, token CSS) **nu** consumă `compliance.ts`; se referă la alte domenii (alerte E5, UI).

## Concluzie trasabilă

- **Scope UI actual:** fără ecrane obligatorii în `apps/web` pentru `compliance.ts` sau pentru webhook-uri inbound.
- **Recomandare la feature nou:** orice pagină viitoare care citește explicabilitatea trebuie să folosească explicit contractul `GET /api/v1/ai/decisions/:id/explanation` (sau succesor documentat) și să fie adăugată în matricea de butoane din plan.
