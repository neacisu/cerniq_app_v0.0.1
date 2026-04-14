<!-- neuron-contract:author-complete -->

# Neuron `mcp:tool:register`

> **Status:** audit manual **2026-04-11**. **L67** — `mcpToolRegisterProcessor`: citește `fsm_state_allowed_tools` pentru FSM `negotiation` + `currentState`, filtrează prin `filterMcpTools` (`mcp-server.ts`), persistă lista în Redis (`e3:mcp:tools:{negotiationId}`, TTL `MCP_SESSION_TTL_S`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `mcp:tool:register` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/mcp--tool--register.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**v2** (L4672–4695) plasează neuronul ca **ToolNeuron**, coadă **`mcp:tool:register`**, scop: înregistrare tool-uri MCP pentru agent; **Non-AI** (L4691). **Repo:** `l67-mcp-tool-register.ts` nu scrie un „registry” HTTP separat: **încarcă permisiunile din Postgres** și le **cache-uiește în Redis** pentru runtime (`l67` L71–104). Comentariul sursă interzice halucinarea listei de tool-uri (L13–14). **Înregistrare worker:** `main.ts` L257. **Registry cozi:** `QUEUES.E3_MCP_TOOL_REGISTER` (`queue-registry.ts` L330, L1035). **Teste:** `l-workers.test.ts` L280+.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`mcp:tool:register\`` (L4672–4695).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:mcp:tool-register` (L2115–2122).
- `workers/shared/src/queue-registry.ts` — L330, L1035.
- `workers/e3-ai-sales/src/main.ts` — L257.
- `workers/e3-ai-sales/src/workers/l67-mcp-tool-register.ts` — procesor.
- `workers/e3-ai-sales/src/lib/mcp-server.ts` — `filterMcpTools`, `MCP_SESSION_TTL_S` (import în `l67-mcp-tool-register.ts` L22).
- `workers/e3-ai-sales/src/__tests__/l-workers.test.ts` — L67.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4691); L67 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:mcp:tool-register`**, coadă **`mcp:tool:register`** (`cognitive-node-catalog.ts` L2115–2116). Registry L330. | v2: același nume coadă. | — |
| 2 | Etapă, familie, swimlane | E3; swimlane **`ai-reasoning`** (catalog L2119). | v2: E3, ai-core. | — |
| 3 | Rol declarat | Sincronizare tool-uri permise FSM → Redis (`l67` L1–15, L71–112). | v2: registry pentru agent. | „Registry” în cod = **Redis + FSM DB**, nu serviciu MCP extern dedicat în acest fișier. |
| 4 | NeuronType + SOFAI | **ToolNeuron** (catalog L2118). | v2: ToolNeuron. | — |
| 5 | Criticitate | **HIGH** (catalog L2121). | v2: HIGH. | — |
| 6 | Înveliș telemetrie | Fabrică worker + `withCognitiveSpan` dacă `tenantId` valid (`factory.ts` L90–107). | v2: `cognitive.e3.mcp.tool-register`. | — |
| 7 | Înveliș politică | Sursă unică `fsm_state_allowed_tools`; listă goală → `[]` (`l67` L13–14, L71–88). | v2: Tier3; text HITL cu încredere — neaplicabil direct. | — |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2 Non-AI. | — |
| 9 | Guardrails | Filtrare `filterMcpTools`; fără NeMo. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu în L67. | ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE — job + stare FSM; ORIENT — query DB; DECIDE — filtru; ACT — `SET` Redis (`l67` L66–104). | v2 OODA generic (enrichment/cache) — aproximare. | v2 menționează „API call”; aici DB+Redis. |
| 12 | Tier + de-escaladare | — | v2 Tier 3. | — |
| 13 | Stack (subset) | BullMQ, ioredis, Drizzle, `mcp-server`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.mcp.tool-register`.
- **Cod:** `cognitive.nodeKey` **`e3:mcp:tool-register`** + etapă 3 — **aliniat** cu catalog.

---
*Generator inițial:* înlocuit prin audit manual.
