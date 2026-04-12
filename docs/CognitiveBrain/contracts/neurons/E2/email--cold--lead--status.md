<!-- neuron-contract:author-complete -->

# Neuron `email:cold:lead:status`

> **Status:** audit manual **2026-04-11**. Procesare **deterministă** a evenimentelor Instantly; **v2** menționează rutare LLM pentru acest neuron — **nu** există în codul citat.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:cold:lead:status` |
| etapa | E2 |
| familie (v2) | `email-cold` |
| contract_path | `contracts/neurons/E2/email--cold--lead--status.md` |
| ADR familie (indicativ) | [email-cold](../../adr/families/e2/email-cold.md) |

## Scop în context real

**v2:** `AssociativeNeuron`, sincronizare status lead din platforma email; blocul v2 include **Model routing** cu vLLM/SGLang (posibil eroare de copiere din alt neuron). **Repo:** `createEmailColdTrackingWorker` pe `QUEUES.EMAIL_COLD_LEAD_STATUS` (`email:cold:lead:status`) în `workers/outreach/src/workers/email.ts`: `switch` pe `eventType` (`email_sent`, `email_opened`, `reply_received`, `email_bounced`, `lead_unsubscribed`) — actualizări `communicationLog` / `leadJourney`, inserare inbound la reply, enfilează `lead:state:transition`, `ai:sentiment:analyze`, `sequence:schedule:stop` (coadă `SEQUENCE_STOP`), `monitor:email:deliverability` la bounce. **Producător:** `createInstantlyEventProcessorWorker` (`webhooks.ts` L320–411) după rezolvare `journeyId` din email; altfel skip logat. Fără apel LLM în acest procesor.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:cold:lead:status\`` (~L3220–3268).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:cold-lead-status` (L1139–1146).
- `workers/shared/src/queue-registry.ts` — `EMAIL_COLD_LEAD_STATUS` (L126, L797).
- `workers/outreach/src/workers/email.ts` — `createEmailColdTrackingWorker` (L217–395).
- `workers/outreach/src/workers/webhooks.ts` — enqueue tracking (L320–411).
- `workers/outreach/src/index.ts` — bootstrap outreach etapa 2.

## Instanțe v2

- **Catalog nodeKey:** `e2:email:cold-lead-status`
- **OTel (v2):** `cognitive.e2.email.cold-lead-status`

## N/A pe criterii

- **Rând 8:** **N/A** — implementare fără LLM; textul v2 care cere vLLM/SGLang nu se aplică repo-ului la audit.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog + registry + worker** — `e2:email:cold-lead-status`, coadă `email:cold:lead:status`. | v2. | — |
| 2 | Etapă, familie, swimlane | **Catalog:** etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Sincronizare stare cold email din evenimente Instantly → DB + cozi downstream. | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `AssociativeNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + etapa 2 → `cognitive:e2:email:cold-lead-status` (cu `tenantId` în `job.data`). | v2 puncte vs cod. | — |
| 7 | Înveliș politică | Early return dacă lipsește `journeyId` (L234–244). | v2 HITL la eșecuri repetate. | — |
| 8 | Rutare model (dacă AI) | N/A în cod. | v2: mențiune LLM — **contradicție** față de implementare. | Tratați ca **decalaj v2** până la corecție document master. |
| 9 | Guardrails | Logică pe enum `eventType`; **fără** NeMo. | ADR-0007. | — |
| 10 | Escaladare HITL | Enfilează **`ai:sentiment:analyze`** și tranziții stare, nu direct `human:review:queue` aici. | v2 + lanț indirect HITL prin sentiment. | — |
| 11 | Micro-OODA | Observe (eveniment normalizat), Orient (rezolvare journey), Decide (switch), Act (DB + cozi). | v2. | — |
| 12 | Tier + de-escaladare | Erori rezolvare journey → skip procesare parțială. | v2. | — |
| 13 | Stack | BullMQ, Postgres, webhook ingest separat. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.email.cold-lead-status`.
- **Cod:** `cognitive:e2:email:cold-lead-status`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
