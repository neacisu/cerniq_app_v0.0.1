<!-- neuron-contract:author-complete -->

# Neuron `email:cold:add-to-campaign`

> **Status:** audit manual **2026-04-11**. Câmpul canonic v2 `email:cold:add-to-campaign` **nu** există ca nume de coadă BullMQ în runtime; implementarea operațională este **`q:email:cold`** (`QUEUES.EMAIL_COLD`) — vezi tabel.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:cold:add-to-campaign` |
| etapa | E2 |
| familie (v2) | `email-cold` |
| contract_path | `contracts/neurons/E2/email--cold--add-to-campaign.md` |
| ADR familie (indicativ) | [email-cold](../../adr/families/e2/email-cold.md) |

## Scop în context real

În **v2**, neuronul este **MotorNeuron** (HIGH, tier 3) pentru acțiuni eferente în subgraful cold email; coada confirmată în v2 este `email:cold:add-to-campaign`, cu span destinație `cognitive.email.cold.add-to-campaign` și procesare non-AI. În **repo**, același rol operațional — **adăugare lead într-o campanie Instantly** (API `POST /lead/add` prin `addLead`) — este implementat pe coada **`q:email:cold`**: `createEmailColdSenderWorker` în `workers/outreach/src/workers/email.ts` apelează `instantlyClient.addLead({ campaign_id, email, first_name, last_name, variables })`, scrie în `communicationLog` (canal `EMAIL_COLD`), incrementează `outreachMessagesSentTotal`, și poate enfilea `lead:state:transition` către `CONTACTED_EMAIL` dacă starea era `COLD`. **Garda ADR-0059** respinge lead-uri în stări nepermise pentru canalul rece (`WARM_REPLY` / `NEGOTIATION` etc.). Worker-ul outreach folosește **`registerCognitiveWorkerEtapa(2)`** (`workers/outreach/src/index.ts`). **Migrare denumiri:** alinierea v2 §6 ↔ `queue-registry` rămâne deschisă (faza 2 plan).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:cold:add-to-campaign\`` (L3148–3168).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:cold-send` / `q:email:cold` (L1103–1111).
- `workers/shared/src/queue-registry.ts` — `EMAIL_COLD: "q:email:cold"` (L122); concurrency (L793).
- `workers/outreach/src/index.ts` — `registerCognitiveWorkerEtapa(2)` (L27), `createEmailColdSenderWorker` (L81, L191).
- `workers/outreach/src/workers/email.ts` — `createEmailColdSenderWorker`, `EmailColdSendJobData`, `addLead`, ADR-0059 guard, logging (L1–16, L50–65, L125–214).
- `packages/integrations/src/instantly/client.ts` — `addLead` → `POST /lead/add`, rate limit Bottleneck (L67–77, L290–293).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` → `cognitive:${nodeKey}` (L215–234).
- `workers/outreach/src/workers/outreach-metrics.test.ts` — procesor `q:email:cold`, mock `addLead` (L358–384).

## Instanțe v2

### Instanță 1 — `email-cold` (v2 ~L3148)

- **Catalog nodeKey (runtime):** `e2:email:cold-send`
- **Coadă runtime:** `q:email:cold` (nu literalul v2 `email:cold:add-to-campaign`)
- **Neuron type:** `MotorNeuron` (v2 + catalog)
- **OTel span name (v2):** `cognitive.email.cold.add-to-campaign`

### Extras câmpuri v2

- OODA generic, HITL la anomalie, metrici Prometheus — conform blocului v2; în cod: metrici `outreach_messages_sent_total` după trimitere, fără prefix `cerniq_neuron_*` din exemplul v2 în același fișier.

## N/A pe criterii

- **Rând 8 (Rutare model):** **N/A** — fără apel LLM în procesor; doar Instantly HTTP + DB (v2: Non-AI).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap nume coadă v2:** în registry **nu** există `email:cold:add-to-campaign`. **Catalog + runtime:** `nodeKey` **`e2:email:cold-send`**, coadă **`q:email:cold`**. **Worker:** `createEmailColdSenderWorker` + `QUEUES.EMAIL_COLD` (`email.ts` L125–129). | v2 confirmă câmp `email:cold:add-to-campaign`; status v2: ne-reconciliat cu registry. | Numele canonic v2 ≠ `queueName` actual — documentat pentru migrare. |
| 2 | Etapă, familie, swimlane | **Catalog:** `etapa: 2`, `swimlane: "fiscal-execution"`. **Bootstrap:** `registerCognitiveWorkerEtapa(2)`. | v2: E2, familie `email-cold`; swimlane în bloc: implicit `email-cold` din metrici, fără câmp catalog separat în v2 pentru acest neuron. | Swimlane catalog `fiscal-execution` vs etichetă graf `email-cold` în v2 — ambele citate. |
| 3 | Rol declarat | Înrolare lead în campanie Instantly + jurnal outreach + tranziție stare opțională (`email.ts` L157–207). **Catalog:** „Trimitere email cold outreach via Instantly” (addLead = Instantly gestionează trimiterea). | v2: motor, acțiune eferentă, cold email + analytics (descriere agregată). | — |
| 4 | NeuronType + SOFAI | **Catalog:** `NeuronType.MotorNeuron`. | v2: `MotorNeuron`. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2: `HIGH`. | — |
| 6 | Înveliș telemetrie | **`createWorker`** rezolvă `nodeKey` pentru `q:email:cold` + etapa 2 → **`e2:email:cold-send`**; span activ **`cognitive:e2:email:cold-send`** (`factory.ts` L96–106; `cognitive-helpers.ts` L226). **v2:** `cognitive.email.cold.add-to-campaign`. | ADR-0003. | Notație puncte vs `cognitive:${nodeKey}`; `nodeKey` diferă de slug-ul din numele v2 al cozii. |
| 7 | Înveliș politică | **ADR-0059:** verificare `currentState` ∈ `COLD_EMAIL_ALLOWED_STATES`; altfel `throw` (`email.ts` L146–155). **Fără** Cedar/OPA în fișier. | v2: Tier 3, HITL la încredere &lt; 0.80, SLA 4h. | Prag „încredere” și SLA 4h nu apar în acest worker; garda e pe starea lead-ului. |
| 8 | Rutare model (dacă AI) | N/A — fără LLM. | v2: Non-AI. | — |
| 9 | Guardrails | Validare st canal (ADR-0059); rate limiting client Instantly (`Bottleneck` pe `addLead` în `client.ts` L76–77). **Fără** NeMo în aceste fișiere. | v2 + ADR-0007. | NeMo: destinație arhitecturală. |
| 10 | Escaladare HITL | **Nu** enfilează direct `human:*` din acest procesor; eșecul jobului BullMQ poate declanșa retry generic. Tranziții separate pe alte cozi. | v2: HITL la anomalie. | Lanț HITL explicit pentru addLead: neaudit în fragmentul citat. |
| 11 | Micro-OODA | Observe (payload job + tenant), Orient (garda stării + sesiune DB), Decide (apel addLead), Act (insert `communicationLog`, metrici, opțional `lead:state:transition`). **Fără** Neo4j/GraphRAG. | v2 OODA generic. | GraphRAG: destinație ADR-0005. |
| 12 | Tier + de-escaladare | Eșec = excepție API Instantly sau încălcare ADR-0059 (reject imediat). **Fără** trigger „încredere &lt; 0.80” sau „2σ” în cod. | v2 §2.2. | Trigger-e statistice v2 neimplementate aici. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis, Postgres `communicationLog`, client HTTP Instantly (`callExternalApi`), OTel prin `createWorker`. | v2 §2.3. | Kafka/SGLang etc.: nelegate de acest worker. |

### Mapare OTel

- **v2:** `cognitive.email.cold.add-to-campaign`.
- **Cod:** `cognitive:e2:email:cold-send` + atribute `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` din catalog.
- **Stare la 2026-04-11:** **divergență** — aliniere necesită fie redenumire coadă/registry, fie intrare catalog dedicată pentru aliasul v2.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
