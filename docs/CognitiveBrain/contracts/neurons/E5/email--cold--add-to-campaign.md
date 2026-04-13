<!-- neuron-contract:author-complete -->

# Neuron `email:cold:add-to-campaign` — instanță v2 E5 (duplicat #2)

> **Status:** audit manual **2026-04-13**. În v2, al doilea antet `### NEURON` (sufix grafic „duplicat #2” în planul master) plasează același **`Confirmed queue field`** `email:cold:add-to-campaign` în **E5 / familia `content`**. În repo **nu** există worker sau coadă BullMQ dedicată E5 pentru acest nume; comportamentul operațional rămâne cel din **E2** pe **`q:email:cold`** — vezi contractul E2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:cold:add-to-campaign` |
| etapa (v2 dup2) | E5 |
| familie (v2 dup2) | `content` |
| contract_path | `contracts/neurons/E5/email--cold--add-to-campaign.md` |
| Implementare runtime partajată | [E2/email--cold--add-to-campaign.md](../E2/email--cold--add-to-campaign.md) |
| ADR familie (indicativ) | [content](../../adr/families/e5/content.md) (graf E5); logică email rece: [email-cold](../../adr/families/e2/email-cold.md) |

## Scop în context real

**v2 (dup2):** neuron operațional E5, `ProceduralNeuron`, criticitate MEDIUM, tier 4, non-AI, spanțintă `cognitive.email.cold.add-to-campaign` — descriere generică „familia content”. **Repo:** căutare în `workers/e5-nurturing` (și restul workerilor E5) **fără** referințe la `q:email:cold`, `EMAIL_COLD` sau `email:cold:add-to-campaign` la auditul din 2026-04-11. **Concluzie:** instanța E5 este **etichetă de graf / registru semantic v2**, nu un al doilea binar de procesare; înrolarea lead în campanie Instantly este **doar** în `createEmailColdSenderWorker` (E2). Orice job pe `q:email:cold` este procesat de workerul **outreach** cu `registerCognitiveWorkerEtapa(2)`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:cold:add-to-campaign\` — duplicat #2` (L7898–7918).
- `docs/CognitiveBrain/contracts/neurons/E2/email--cold--add-to-campaign.md` — mapare v2 ↔ `q:email:cold`, `e2:email:cold-send`.
- `grep` pe `workers/e5-nurturing` pentru `q:email:cold` / `EMAIL_COLD` / `email:cold` — **0 rezultate** la audit.

## Instanțe v2

### Instanță 2 — `content` / E5 (v2 ~L7898)

- **Neuron type (v2):** `ProceduralNeuron` (inferat din graf; diferă de instanța E2 `MotorNeuron` în primul antet).
- **Confirmed queue field:** `email:cold:add-to-campaign` (identic cu E2 în v2).
- **OTel span name (v2):** `cognitive.email.cold.add-to-campaign`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în ambele instanțe v2; fără LLM în implementarea E2 citată.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** `nodeKey` / coadă separată E5. **Singurul** catalog pentru operație: `e2:email:cold-send` ↔ `q:email:cold`. | v2 dup2: aceeași coadă nominală, alt Stage/Family în graf. | Tipuri neuron diferite între instanțele v2 (Motor vs Procedural) vs un singur tip în catalog pentru runtime. |
| 2 | Etapă, familie, swimlane | **Runtime:** etapa **2** (outreach). **v2 dup2:** E5, `content`. | v2 dup2. | Graf E5 nu are swimlane dedicată cold email în cod. |
| 3 | Rol declarat | Partajat cu E2: înrolare lead Instantly — vezi contract E2. | v2: descriere generică E5 content. | — |
| 4 | NeuronType + SOFAI | **Catalog runtime:** `MotorNeuron` (`e2:email:cold-send`). | v2 instanța 1: `MotorNeuron`; v2 dup2: `ProceduralNeuron`. | Contradicție între cele două blocuri v2 pentru același `v2_queue`; repo urmează catalogul E2. |
| 5 | Criticitate | **Catalog:** `HIGH` (nod E2). | v2 dup2: `MEDIUM`. | Criticitate diferită între instanțele v2. |
| 6 | Înveliș telemetrie | Doar **`cognitive:e2:email:cold-send`** când rulează job pe `q:email:cold` (vezi E2). | v2: `cognitive.email.cold.add-to-campaign`. | Fără span separat „E5” pentru această coadă. |
| 7 | Înveliș politică | ADR-0059 și logica din `email.ts` (E2). | v2 dup2: Tier 4, fără HITL obligatoriu în text. | Politici v2 diferă între instanța E2 și dup2. |
| 8 | Rutare model (dacă AI) | N/A. | Non-AI. | — |
| 9 | Guardrails | Rate limit Instantly + gardă stare (E2). | v2 dup2: audit log 90 zile (generic). | — |
| 10 | Escaladare HITL | La fel ca E2 (fără enqueue direct human din addLead). | v2 dup2: „No mandatory HITL”. | E2 v2 spune HITL la anomalie — tensiune între instanțe v2. |
| 11 | Micro-OODA | Implementat doar în calea E2 (`email.ts`). | v2 dup2: OODA generic scurt. | — |
| 12 | Tier + de-escaladare | Retry BullMQ + erori API (E2). | v2 dup2: Tier 4. | Tier diferit față de instanța E2 în v2. |
| 13 | Stack v2 §2.3 (subset) | BullMQ E2 outreach + Instantly (E2). | v2 §2.3. | Stack E5 pentru acest neuron: neinstanțiat. |

### Mapare OTel

- **v2:** `cognitive.email.cold.add-to-campaign` (ambele instanțe).
- **Cod:** doar `cognitive:e2:email:cold-send` pentru execuție reală.
- **Stare:** **duplicat grafic v2** fără duplicare runtime; reconciliere tip/tier între blocurile v2 = în afara repo la data auditului.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
