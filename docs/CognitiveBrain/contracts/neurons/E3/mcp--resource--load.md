<!-- neuron-contract:author-complete -->

# Neuron `mcp:resource:load`

> **Status:** audit manual **2026-04-11**. **L66** — `mcpResourceLoadProcessor`: încărcare resurse MCP din Postgres cu cache Redis (TTL din `MCP_RESOURCE_CACHE_TTL_S` în `mcp-server.js`), acțiune `invalidate` opțională.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `mcp:resource:load` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/mcp--resource--load.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**v2** (L4622–4645) definește **ToolNeuron**, coadă **`mcp:resource:load`**, scop: încărcare resurse MCP (produs, client, conversație) cu cache Redis 5 min, **Non-AI** la rutare model. **Repo:** `workers/e3-ai-sales/src/workers/l66-mcp-resource-load.ts` parsează `resourceUri` prin `parseResourceUri` (`mcp-server.js`), construiește cheie cache `buildResourceCacheKey`, citește Redis, la MISS încarcă din `goldProducts` / `goldCompanies` / `aiConversations` / `goldProductCategories` (`l66` L80–227), apoi `SET` cu TTL. **`action: "invalidate"`** șterge cheia (`l66` L198–203). **Înregistrare:** `main.ts` L256. **Registry:** `QUEUES.E3_MCP_RESOURCE_LOAD` (`queue-registry.ts` L329, L1034). **Teste:** `l-workers.test.ts` (L156+), `mcp-server.test.ts` (prefix cache).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`mcp:resource:load\`` (L4622–4645).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:mcp:resource-load` (L2106–2113).
- `workers/shared/src/queue-registry.ts` — `E3_MCP_RESOURCE_LOAD` (L329, L1034).
- `workers/e3-ai-sales/src/main.ts` — procesor L256.
- `workers/e3-ai-sales/src/workers/l66-mcp-resource-load.ts` — procesor complet.
- `workers/e3-ai-sales/src/lib/mcp-server.ts` — `parseResourceUri`, `buildResourceCacheKey`, `MCP_RESOURCE_CACHE_TTL_S`.
- `workers/e3-ai-sales/src/__tests__/l-workers.test.ts` — L66.
- `workers/e3-ai-sales/src/__tests__/mcp-server.test.ts` — chei cache.
- `workers/shared/src/factory.ts` — instrumentare cognitivă.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 marchează **Non-AI** pentru acest neuron (L4641); `l66` fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:mcp:resource-load`**, coadă **`mcp:resource:load`** (`cognitive-node-catalog.ts` L2106–2107). `QUEUES.E3_MCP_RESOURCE_LOAD` (`queue-registry.ts` L329). | v2: același `Confirmed queue field`. | — |
| 2 | Etapă, familie, swimlane | E3 worker; swimlane catalog **`ai-reasoning`** (`cognitive-node-catalog.ts` L2110). | v2: E3, ai-core, swimlane `ai-reasoning`. | — |
| 3 | Rol declarat | Încărcare resurse tip product/client/conversation/catalog + cache (`l66` L1–16, L180–235). | v2: funcție cognitivă din catalog; analogie premotor. | — |
| 4 | NeuronType + SOFAI | **`ToolNeuron`** (`cognitive-node-catalog.ts` L2109). | v2: ToolNeuron. | Clasificare SOFAI: din v2 §2.1 ca reper. |
| 5 | Criticitate | **`HIGH`** (`cognitive-node-catalog.ts` L2112). | v2: HIGH. | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan` când `tenantId` valid (`factory.ts` L90–107). | v2: `cognitive.e3.mcp.resource-load`. | Nume span export vs `nodeKey`: ADR-0003. |
| 7 | Înveliș politică | Fără Cedar/OPA în L66; validare URI strictă (eroare dacă invalid — `l66` L186–193). | v2: Tier 3; text HITL cu „confidence” — **decalaj** (neuron non-LLM). | v2 menționează încredere; L66 nu are scor încredere. |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI (L4641). | — |
| 9 | Guardrails | Validare structură URI + tipuri resursă; fără NeMo. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu în L66. | v2 / ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE — job + URI; ORIENT — cache; DECIDE — HIT/MISS; ACT — DB/Redis (`l66` L205–234). Aliniat pragmatic cu v2 fără API extern. | v2: „API call vs cache hit” — aici DB intern, nu HTTP extern. | — |
| 12 | Tier + de-escaladare | Fără tier în cod. | v2 Tier 3. | — |
| 13 | Stack (subset) | BullMQ, ioredis, Drizzle/Postgres, `mcp-server` helpers. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.mcp.resource-load`.
- **Cod:** `cognitive.nodeKey` **`e3:mcp:resource-load`** via rezolvare coadă + etapă 3 + `withCognitiveSpan` — **aliniat** cu catalog pentru `mcp:resource:load`.

---
*Generator inițial:* înlocuit prin audit manual.
