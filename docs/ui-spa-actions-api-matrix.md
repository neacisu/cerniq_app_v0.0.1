# Matrice acțiuni SPA (`apps/web`) → HTTP / efect

**Versiune:** 2026-04-05  
**Scop:** Legătură trasabilă între acțiunile utilizatorului în SPA și contractele HTTP (sau lipsa lor), fără presupuneri despre handler-e: path-urile de mai jos provin din **codul client** (`lib/`, `hooks/`, `pages/system/workers-fetch.ts`, string-uri literale în `pages/`). Verificarea finală a semanticii server-side = `apps/api/src/routes/*.ts` + teste contract.

**Anti-halucinare:** Acest document **nu** listează fiecare din ~279 apariții `<Button` / `onClick=` din `apps/web/src/pages` pe rând (vezi §8). Pentru „100% buton cu buton”, folosiți comenzile de audit și completați incremental la PR-uri. **Surse de adevăr pentru path:**

| Sursă | Rol |
| --- | --- |
| `docs/e1-imports-ui-api-matrix.md` | Fluxuri detaliate E1 import / bronze / mapping |
| `apps/web/src/lib/etapa1-api.ts` | Majoritatea apelurilor E1 (59 utilizări `api.*` în fișier) |
| `apps/web/src/lib/etapa2-api.ts` | Outreach E2 |
| `apps/web/src/lib/etapa4-api.ts` | Comenzi, credit, contracte, livrări E4 |
| `apps/web/src/lib/etapa5-api.ts` | Nurturing, churn, graph, referrals, geo E5 |
| `apps/web/src/lib/unified-dashboard-api.ts` | Agregate dashboard principal |
| `apps/web/src/pages/system/workers-fetch.ts` | Admin cozi / live / catalog metrici API |
| `apps/web/src/hooks/use-cognitive-brain.ts` | Brain topology, SSE, pause/resume/config |
| `apps/web/src/pages/etapa3/*.tsx` | Apeluri `api.*` directe (fără modul `etapa3-api` dedicat) |
| `apps/web/src/components/cognitive/BatchSelectorRail.tsx` | GET imports pentru batch brain |

---

## 1. `NotFound.tsx`

| Element | Trigger | HTTP | Path | Efect |
| --- | --- | --- | --- | --- |
| Link „Înapoi la Dashboard” (clase `btn` + `btb`, același aspect ca butonul brand) | click | — | — | Navigare client `react-router-dom` către `/dashboard`; **fără** request la click. |
| Conținut | — | — | — | Text static 404; **fără** KPI, metrici sau date tenant. |

**Test:** `apps/web/__tests__/pages/NotFound.test.tsx`.

---

## 2. Autentificare (`useAuth` / `apps/web/src/lib/api.ts`)

Prefix: `/api/v1/auth`. Apelurile concrete (login, register, refresh, logout, me) sunt în `AuthProvider` / hook-uri; URL-urile includ `AUTH_PREFIX` din `api.ts`. Efect: JWT în storage + redirect după succes real (nu simulare).

---

## 3. Dashboard unificat (`unified-dashboard-api.ts`)

Fiecare funcție = **GET** la path-ul indicat; efect: date agregate pentru carduri secțiuni E2–E5 + brain + fiscal Oblio + alerte compliance.

| Funcție | Method | Path |
| --- | --- | --- |
| `fetchNegotiationStats` | GET | `/api/v1/negotiation/stats` |
| `fetchProductStats` | GET | `/api/v1/products/stats` |
| `fetchOrderStats` | GET | `/api/v1/orders/stats` |
| `fetchCreditStats` | GET | `/api/v1/credit/stats` |
| `fetchContractStats` | GET | `/api/v1/contracts/stats` |
| `fetchShipmentStats` | GET | `/api/v1/shipments/stats` |
| `fetchNurturingStats` | GET | `/api/v1/nurturing/stats` |
| `fetchChurnStats` | GET | `/api/v1/churn/stats` |
| `fetchReferralStats` | GET | `/api/v1/referrals/stats` |
| `fetchGraphStats` | GET | `/api/v1/graph/stats` |
| `fetchBrainCatalog` | GET | `/api/v1/brain/catalog` |
| `fetchBrainTopologyGlobal` | GET | `/api/v1/brain/topology` |
| `fetchFiscalOblioStats` | GET | `/api/v1/fiscal/oblio/stats` |
| `fetchE5ComplianceAlertStats` | GET | `/api/v1/e5/alerts/compliance/stats` |

---

## 4. E1 (`etapa1-api.ts` + matrice imports)

- **Detaliu flux import → POST/GET:** `docs/e1-imports-ui-api-matrix.md`.
- **Restul E1** (dashboard stats/activity/daily-stats, bronze/silver/gold, approvals, cozi, dedupe, etc.): fiecare `export async function` din `etapa1-api.ts` mapează la `api.get` / `api.post` / `api.patch` / `api.delete` cu path sub `/api/v1/` (imports, silver, gold, enrichment, dashboard, …). Lista completă = **citire integrală fișier** (prea lungă pentru a duplica aici fără risc de drift).

---

## 5. E2 Outreach (`etapa2-api.ts`)

Toate exporturile publice folosesc prefix `/api/v1/outreach/...` (leads, sequences, templates, phones, reviews, settings, notifications, dashboard, analytics, campaigns, …). Butoanele din `pages/etapa2/*` invocă aceste funcții sau hook-uri care le înfășoară → efect: CRUD / acțiuni outreach + invalidare cache TanStack Query unde e cazul.

---

## 6. E3 — apeluri directe în `pages/etapa3`

| Fișier | Method | Path (sau pattern) | Note |
| --- | --- | --- | --- |
| `ai-dashboard.tsx` | GET | `/api/v1/negotiation/stats` | |
| `ProductCatalog.tsx` | GET | `/api/v1/products/categories`, `/api/v1/products/stats`, `/api/v1/products?{query}` | |
| `ProductCatalog.tsx` | POST | `/api/v1/products/search` | |
| `guardrails.tsx` | GET | `/api/v1/negotiation/guardrails?limit=100` | |
| `invoices.tsx` | GET | `/api/v1/fiscal/oblio/documents?...`, `/api/v1/fiscal/einvoice/submissions?...` | Text UI menționează POST retransmitere Oblio — acțiunea în SPA poate fi doar ghid; verificați handler-ul dacă adăugați buton. |
| `negotiations.tsx` | GET | `/api/v1/negotiation?page=1&limit=100`, `/api/v1/negotiation/:id/messages?limit=80` | |
| `offers.tsx` | GET | `/api/v1/negotiation?page=1&limit=100`, `/api/v1/negotiation/:id` | |
| `NegotiationConversation.tsx` | GET | `/api/v1/negotiation?page=1&limit=100`, `/api/v1/negotiation/:id`, `.../messages`, `.../guardrails` | Alte mutații (dacă există) pot fi în același fișier sub formă dinamică — re-rulați comanda rg din §12.2 pentru `api.post` / `patch` / `put` / `delete` sub `pages/etapa3`. |
| `FiscalDocuments.tsx` | GET | `/api/v1/fiscal/oblio/documents?...`, `/api/v1/fiscal/einvoice/submissions?...` | |

---

## 7. E4 (`etapa4-api.ts`)

| Funcție | Method | Path |
| --- | --- | --- |
| `fetchOrdersList` | GET | `/api/v1/orders?{query}` |
| `fetchOrderStats` | GET | `/api/v1/orders/stats` |
| `fetchTenantPayments` | GET | `/api/v1/orders/payments?{query}` |
| `fetchShipmentsList` | GET | `/api/v1/shipments?{query}` |
| `fetchShipmentDetail` | GET | `/api/v1/shipments/:id` |
| `fetchCreditProfiles` | GET | `/api/v1/credit/profiles?{query}` |
| `fetchCreditStats` | GET | `/api/v1/credit/stats` |
| `fetchCreditHistory` | GET | `/api/v1/credit/profiles/:clientId/history?limit=` |
| `fetchContractsList` | GET | `/api/v1/contracts?{query}` |
| `postContractSendDocusign` | POST | `/api/v1/contracts/:contractId/send-docusign` |

---

## 8. E5 (`etapa5-api.ts`)

| Funcție | Method | Path |
| --- | --- | --- |
| `fetchNurturingStates` | GET | `/api/v1/nurturing/states?{query}` |
| `postNurturingEvaluate` | POST | `/api/v1/nurturing/states/:leadId/evaluate` |
| `fetchChurnFactors` | GET | `/api/v1/churn/factors?{query}` |
| `fetchChurnFactorsBatched` | GET | (iterare paginată `fetchChurnFactors`) |
| `fetchChurnStats` | GET | `/api/v1/churn/stats` |
| `postChurnEvaluate` | POST | `/api/v1/churn/:leadId/evaluate` |
| `fetchGraphKolProfiles` | GET | `/api/v1/graph/kol-profiles?{query}` |
| `fetchGraphRelationships` | GET | `/api/v1/graph/relationships?{query}` |
| `fetchReferralsList` | GET | `/api/v1/referrals?{query}` |
| `fetchGraphGeoSummary` | GET | `/api/v1/graph/geo-summary` |

Pagini precum `ReferralManager.tsx` pot afișa acțiuni care **doar** deschid ghid / toast fără nou path — verificați handler-ul `onClick` în fișier.

---

## 9. System — Workers (`workers-fetch.ts` + `workers.tsx`)

| Funcție | Method | Path | Efect |
| --- | --- | --- | --- |
| `fetchAdminLive` | GET | `/api/admin/live` | Snapshot cozi + sistem (proxy către monitoring). |
| `fetchQueueDetail` | GET | `/api/admin/queues/:name` | Detaliu coadă. |
| `postQueueControl` | POST | `/api/admin/queues/:name/{action}` unde `action` ∈ pause, resume, retry-failed, drain | Control coadă BullMQ (confirm UI pentru acțiuni distructive unde e cazul). |
| `fetchApiPluginPrometheusCatalog` | GET | `/api/admin/prometheus/api-plugin-catalog` | Catalog metrici plugin API (read-only). |

---

## 10. Cognitive Brain (`use-cognitive-brain.ts` + componente)

| Acțiune | Method | Path / transport | Efect |
| --- | --- | --- | --- |
| Topology | GET | `/api/v1/brain/topology` sau `...?batchId=` | Graf noduri/muchii. |
| Evenimente live | SSE | `/api/v1/brain/events/stream` | Stream (nu REST clasic). |
| Traces nod | GET | `/api/v1/brain/nodes/:nodeKey/traces` | |
| Mutations batch | GET | `/api/v1/brain/mutations/:batchId` | |
| Pause | POST | `/api/v1/brain/nodes/:nodeKey/pause` | Body opțional `{ batchId }` pentru propagare. |
| Resume | POST | `/api/v1/brain/nodes/:nodeKey/resume` | |
| Config | PUT | `/api/v1/brain/nodes/:nodeKey/config` | |

**Batch rail:** `BatchSelectorRail` — GET `/api/v1/imports?page=0&limit=30`.

---

## 11. Settings (`settings.tsx`)

- **Salvează local:** `localStorage` — fără HTTP tenant-wide (mesaj explicit în UI).
- **Invitație echipă / remove:** toast informativ — fără persistență API (comportament documentat în pagină).

---

## 12. Comenzi audit (regenerare fără presupuneri)

### 12.1 Inventar mecanic JSON (Button + onClick pe linie)

```bash
pnpm audit:ui-button-inventory:write
# → docs/generated/ui-button-onclick-inventory.json
```

Generator: `scripts/generate-ui-button-click-inventory.py` (Python 3). Fiecare intrare: `file`, `line`, `kind` (`Button_open_tag` | `onClick_prop`), `snippet`, `literal_api_paths_on_line` (doar string-uri `/api/...` pe aceeași linie), flag-uri `mentions_*`, **`http_path_resolved`: mereu `null`**. Regenerați după modificări în `apps/web/src/pages`. Test Vitest: `apps/web/__tests__/scripts/ui-button-inventory-generator.test.ts`.

### 12.2 Grep complementar

```bash
# Inventar brut acțiuni UI în pagini
rg '<Button|onClick=' apps/web/src/pages --glob '*.tsx' -n

# Path-uri API literale în pagini E3
rg '/api/v1/' apps/web/src/pages/etapa3 --glob '*.tsx' -n

# Client E1–E5 + dashboard + workers
rg 'api\\.(get|post|patch|put|delete)\\(' apps/web/src/lib apps/web/src/pages/system/workers-fetch.ts -n

# Brain
rg '/api/v1/brain' apps/web/src/hooks/use-cognitive-brain.ts -n
```

---

## 13. SonarCloud / Quality Gate

Verificarea **Quality Gate** pe „new code” rulează în **CI** când job-ul SonarCloud + `SONAR_TOKEN` sunt configurate (`sonar-project.properties`). Acest document nu înlocuiește raportul Sonar.

---

## 14. Limită declarată (conform planului ~200+ butoane)

Matricea **exhaustivă** „fișier → label buton → handler → method + path” este **incrementală**: un singur buton poate declanșa o mutație care apelează un wrapper din `lib/` sau `useMutation` cu URL construit dinamic. **Dovada de paritate** pentru o PR: (1) rând în acest document sau în `e1-imports-ui-api-matrix.md` pentru zona atinsă, (2) test RTL/contract care asertează path-ul sau mock-ul MSW aliniat la handler real.
