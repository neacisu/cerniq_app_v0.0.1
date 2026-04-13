<!-- neuron-contract:author-complete -->

# Neuron `mcp:session:manage`

> **Status:** audit manual **2026-04-11**. **L68** — `mcpSessionManageProcessor`: acțiuni **`create` | `extend` | `expire`** pe `gold_negotiations.mcp_session_id` / `mcp_session_expires_at` (`l68` L12–13, L144–157).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `mcp:session:manage` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/mcp--session--manage.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**v2** (L4647–4670) descrie **ToolNeuron**, coadă **`mcp:session:manage`**, funcție cognitivă: management sesiune MCP (creare, refresh, închidere); **Non-AI** (L4666). **Repo:** `l68-mcp-session-manage.ts` implementează **create** (ID nou + expirare `getMcpSessionExpiry()` din `mcp-server.js`, L45–68), **extend** (prelungește `mcpSessionExpiresAt` cu `MCP_SESSION_TTL_MS`, L71–107), **expire** (șterge câmpurile sesiune, L110–139). **Nu** există „refresh token” OAuth în cod — doar **prelungire TTL** pe coloane DB. **Worker:** `main.ts` L258. **Registry:** `QUEUES.E3_MCP_SESSION_MANAGE` (`queue-registry.ts` L331, L1036). **Teste:** `l-workers.test.ts` L361+.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`mcp:session:manage\`` (L4647–4670).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:mcp:session-manage` (L2124–2131).
- `workers/shared/src/queue-registry.ts` — L331, L1036.
- `workers/e3-ai-sales/src/main.ts` — L258.
- `workers/e3-ai-sales/src/workers/l68-mcp-session-manage.ts` — procesor + handlers.
- `workers/e3-ai-sales/src/lib/mcp-server.ts` — `generateMcpSessionId`, `getMcpSessionExpiry`, `MCP_SESSION_TTL_MS`.
- `workers/e3-ai-sales/src/__tests__/l-workers.test.ts` — L68.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI; L68 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:mcp:session-manage`**, coadă **`mcp:session:manage`** (catalog L2124–2125). Registry L331. | v2: același nume coadă. | — |
| 2 | Etapă, familie, swimlane | E3; swimlane **`ai-reasoning`** (catalog L2128). | v2: E3, ai-core. | — |
| 3 | Rol declarat | Ciclu sesiune MCP pe rând `gold_negotiations` (`l68` L45–157). | v2: creare / refresh / close. | **„Refresh token”** v2 → în cod **extend** pe dată expirare, fără token JWT. |
| 4 | NeuronType + SOFAI | **ToolNeuron** (catalog L2127). | v2: ToolNeuron. | — |
| 5 | Criticitate | **HIGH** (catalog L2130). | v2: HIGH. | — |
| 6 | Înveliș telemetrie | Fabrică + `withCognitiveSpan` (`factory.ts` L90–107). | v2: `cognitive.e3.mcp.session-manage`. | — |
| 7 | Înveliș politică | Validare acțiune strictă; altfel throw (`l68` L152–156). | v2: Tier 3; HITL cu încredere — nepotrivit literal pentru non-LLM. | — |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2 Non-AI. | — |
| 9 | Guardrails | Tranzacții DB pe tenant + `negotiationId`; fără NeMo. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu în L68. | ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE — payload; ORIENT — stare negociere; DECIDE — ramură acțiune; ACT — `update` (`l68` L144–157). | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | — | v2 Tier 3. | — |
| 13 | Stack (subset) | BullMQ, Drizzle/Postgres, `mcp-server` helpers. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.mcp.session-manage`.
- **Cod:** `cognitive.nodeKey` **`e3:mcp:session-manage`** — **aliniat** cu catalog.

---
*Generator inițial:* înlocuit prin audit manual.
