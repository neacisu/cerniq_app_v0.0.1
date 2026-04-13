<!-- neuron-contract:author-complete -->

# Neuron `wa:send:reply`

> **Status:** audit manual **2026-04-13**. **v2** — instanță E5 „duplicat #2” (L7942–L7962): coadă `wa:send:reply`, familia `content`. **Repo:** **fără** literal `wa:send:reply` în registry. Răspunsuri WA și fluxuri înrudite în **E2**: cozi per-telefon (inclusiv variantă **follow-up** `getWaPhoneFollowupQueueName` în `queue-registry.ts` ~L667), `wa:media:send`, `wa:delivery:status`, drain legacy `q:wa:reply` (comentarii în `queue-registry.ts` L14–18 și `whatsapp.ts`). **Concluzie:** la fel ca `wa:send:initial`, neuronul v2 E5 este etichetă de graf; execuția este în **outreach**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:send:reply` |
| etapa (v2 dup2) | E5 |
| familie (v2 dup2) | `content` |
| runtime (efectiv) | E2 — `q:wa:phone-*`, `*:followup`, ingest reply |
| contract_path | `contracts/neurons/E5/wa--send--reply.md` |
| ADR familie (indicativ) | [content](../../adr/families/e5/content.md) |

## Scop în context real

Trimitere mesaj WA (inclusiv reply/follow-up) și procesare status livrare — `workers/outreach/src/workers/whatsapp.ts`; ingest reply poate declanșa `ai:sentiment:analyze` în alte contracte E2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7942–L7962.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneFollowupQueueName` (L667), `LEGACY_WA_REPLY_QUEUE` (L18).
- `workers/outreach/src/workers/whatsapp.ts` — procesatoare livrare/istoric.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7942–L7962:** span `cognitive.wa.send.reply` (L7961).

## N/A pe criterii

- **8 — Rutare model:** N/A pentru trimitere WA de bază (v2 L7958).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** `wa:send:reply`. Cozi **`q:wa:phone-*`** / **`*:followup`**. | v2: `wa:send:reply` (L7956). | — |
| 2 | Etapă, familie, swimlane | Runtime **E2** outreach. | v2: E5 `content`. | — |
| 3 | Rol declarat | Reply outbound + tracking în același strat WA ca initial send. | v2: execuție procedurală (L7954–L7955). | — |
| 4 | NeuronType + SOFAI | — | v2: `ProceduralNeuron` (L7949). | — |
| 5 | Criticitate | — | v2: `MEDIUM` (L7952). | — |
| 6 | Înveliș telemetrie | Spanuri E2 pe workerii WA. | v2 span (L7961). | — |
| 7 | Înveliș politică | Cozi delivery/status pentru feedback canal. | v2 L7959–L7960. | — |
| 8 | Rutare model (dacă AI) | **N/A** pe trimitere; analiza mesajului pe `ai:sentiment:analyze` separat. | v2 non-AI (L7958). | — |
| 9 | Guardrails | Legacy drain + compat istoric (`q:wa:reply`). | v2 L7960. | — |
| 10 | Escaladare HITL | Lanț E2 (sentiment → `human:review:queue` posibil). | v2 L7960. | — |
| 11 | Micro-OODA | Job canal → provider → metrici. | v2 OODA (L7957). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4 (L7953). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E2, TimelinesAI. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.wa.send.reply`.
- **Cod:** spanuri `cognitive:e2:…` pe workerii WA; fără literal v2.

---
*Audit manual 2026-04-13.*
