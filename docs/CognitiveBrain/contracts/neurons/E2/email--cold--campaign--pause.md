<!-- neuron-contract:author-complete -->

# Neuron `email:cold:campaign:pause`

> **Status:** audit manual **2026-04-11**. Pauză campanie Instantly; același procesor poate fi alimentat din **bounce monitor** (ADR-0066) cu payload extins.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:cold:campaign:pause` |
| etapa | E2 |
| familie (v2) | `email-cold` |
| contract_path | `contracts/neurons/E2/email--cold--campaign--pause.md` |
| ADR familie (indicativ) | [email-cold](../../adr/families/e2/email-cold.md) |

## Scop în context real

**v2:** `ExecutiveNeuron`, pauză campanie cold. **Repo:** `createEmailColdCampaignPauseWorker` în `workers/outreach/src/workers/extra-dispatch.ts` (L56–66): pentru `job.data.campaignId` apelează `getInstantlyClient().pauseCampaign(campaignId)` (`POST /campaign/{id}/pause`). **Producători:** (1) fluxuri care pun job explicit cu `{ campaignId }`; (2) `createBounceRateMonitorWorker` în `email.ts` (L404–452) când bounce rate &gt; `BOUNCE_THRESHOLD` (3%): enfilează job `"pause"` cu `campaignId`, `tenantId`, `bounceRate`, `bounced`, `total` — procesorul folosește **doar** `campaignId` pentru API (câmpuri extra ignorate).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:cold:campaign:pause\`` (~L3219+).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:cold-campaign-pause` (L1121–1128).
- `workers/shared/src/queue-registry.ts` — `EMAIL_COLD_CAMPAIGN_PAUSE` (L124, L795).
- `workers/outreach/src/workers/extra-dispatch.ts` — worker pause (L56–66).
- `workers/outreach/src/workers/email.ts` — `createBounceRateMonitorWorker` enqueue pause (L404–452).
- `packages/integrations/src/instantly/client.ts` — `pauseCampaign` (L327–330).

## Instanțe v2

- **Catalog nodeKey:** `e2:email:cold-campaign-pause`
- **OTel (v2):** `cognitive.e2.email.cold-campaign-pause`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog + registry + worker** — coadă `email:cold:campaign:pause`, `e2:email:cold-campaign-pause`. | v2. | — |
| 2 | Etapă, familie, swimlane | **Catalog:** etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Pauză campanie Instantly; legătură operațională cu monitorizare bounce. | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `ExecutiveNeuron`. | v2: `ExecutiveNeuron`. | — |
| 5 | Criticitate | **Catalog:** `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` → span `cognitive:e2:email:cold-campaign-pause` dacă rezolvare + `tenantId` pe job; bounce monitor pune `tenantId` în payload (`email.ts` L441–451). | v2 notație puncte. | Job minimalist `{ campaignId }` fără tenant: același risc ca la create. |
| 7 | Înveliș politică | **ADR-0066** declanșare automată din monitor (prag 3%). | v2 HITL la eșecuri repetate. | Două motoare politică (tehnic vs organizațional). |
| 8 | Rutare model (dacă AI) | N/A. | Non-AI. | — |
| 9 | Guardrails | Client Instantly + prag bounce în worker separat. | ADR-0007. | — |
| 10 | Escaladare HITL | După pauză, `alert:bounce:high` poate fi enfileat din monitor (`email.ts` L453–463). | v2 + ADR-0008. | — |
| 11 | Micro-OODA | Monitor: Observe (statistici DB), Decide (bounce &gt; prag), Act (enqueue pause). Procesor pause: Act (API). | v2. | — |
| 12 | Tier + de-escaladare | Automat la depășire prag bounce. | v2. | — |
| 13 | Stack | BullMQ, Instantly, Postgres (indirect, prin monitor). | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.email.cold-campaign-pause`.
- **Cod:** `cognitive:e2:email:cold-campaign-pause`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
