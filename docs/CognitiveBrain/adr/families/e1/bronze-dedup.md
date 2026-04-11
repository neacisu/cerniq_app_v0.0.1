# ADR-FAMILY-e1-bronze-dedup

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-bronze-dedup |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `bronze-dedup` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea `### ADR-FAMILY-e1-bronze-dedup` |
| Autoritate runtime | ADR-0001: [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **bronze-dedup** descrie, în planificarea pe graf, neuronii care deduplică intrări la nivel **bronze** (înainte de promovare către straturi superioare). În pipeline-ul E1, obiectivul este reducerea duplicatelor brute fără a pierde proveniența și fără a muta încă decizia în argint (deduplicare semantică).

**Cititorițintă:** ingineri platformă, operațiuni date, auditori cognitive brain.

## Dovezi confirmate în Cerniq

### În cod și registry

- În [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts) **nu** apare, la momentul auditului (2026-04-11), un `nodeKey` sau o coadă BullMQ care să reproducă eticheta familiei `bronze-dedup` sau cozi de forma `bronze:dedup:*`.
- În [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) **nu** există constantă sau înregistrare pentru `bronze:dedup:hash-checker` (căutare în repo: zero potriviri pentru `hash-checker` / `bronze:dedup` în surse TypeScript).

### În exportul de graf (plan master)

- Etapă: E1; familie: `bronze-dedup`; **1** neuron în export.
- Exemplu de coadă în plan: `bronze:dedup:hash-checker`.

### Reconciliere registry / export graf

- **Exportul de graf** și **registry-ul runtime** nu sunt aliniate pentru această familie: numele de coadă din export **nu** apare în `queue-registry.ts`.
- **Consecință:** fie neuronul este planificat dar neînregistrat în cod, fie a fost redenumit/absorbit în alt flux. Orice implementare viitoare trebuie să pornească de la **înregistrare explicită** în registry și intrare în `COGNITIVE_NODE_CATALOG`, nu de la presupunerea că eticheta din graf este activă.

## Decizie de guvernanță familială

1. **Proprietar conceptual (familie):** Platform Data / Cognitive OS (E1).
2. **Capabilitate:** deduplicare la nivel bronze pe hash sau semnătură stabilă, cu trasabilitate batch și fără ștergere silențioasă a surselor.
3. **Telemetrie:** la activare în runtime, același baseline ca restul E1 — span `cognitive:{nodeKey}` cu atribute din [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts) (`cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function`, plus `tenant.id` / `batch.id` când există context).
4. **Anomalii:** rate de coliziuni neașteptate, spike-uri de respingere job, lipsă heartbeat procesor.
5. **Guardrail / HITL:** acțiuni ireversibile (fuziune sau respingere masivă) nu sunt autonome de nivel 4 fără politică explicită (vezi plan global HITL); până la existența cozii în registry, granița rămâne **nedefinită în runtime**.

## Aliniere la cercetare (aplicabil)

Din [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md): deduplicarea precoce reduce propagarea erorilor în downstream; orchestrarea simbolică (BullMQ) trebuie să păstreze **idempotență** și **metadata de autonomie** pe job. Pentru această familie, direcția este aplicabilă **doar după** ce cozile există în registry.

## Observabilitate

- Evenimente cognitive și mutații: contracte în `emitCognitiveEvent` / `recordDataMutation` din `cognitive-helpers.ts` (PII redactat conform allowlist).
- Metrici GenAI: **nu** sunt implicate în mod necesar de familia `bronze-dedup` până la integrare LLM; pentru instrumentare viitoare, convențiile OTel GenAI rămân în stadiu **Development** (vezi secțiunea Research extern).

## Contracte și indexare

- Neuroni placeholder sub [contracts/neurons/](../../contracts/neurons/): căutare după prefix `bronze` / `dedup` la regenerare din plan master; până la reconciliere, contractele pot reflecta doar **planificarea pe graf**, nu handler-ul real.
- Sinapse: depind de ingest și de promovare bronze→silver; se indexează prin [contracts/synapses/](../../contracts/synapses/) după actualizarea planului.

## Criterii de acceptanță

- [ ] Coadă (`bronze:dedup:*` sau echivalent) înregistrată în `queue-registry.ts` și intrare canonică în `COGNITIVE_NODE_CATALOG`.
- [ ] Handler documentat (payload, idempotență, erori) și teste pe workerul care consumă coada.
- [ ] Reconcilierea cu exportul de graf închisă (același nume sau ADR de redenumire).

## Research extern

- Nu este obligatoriu pentru starea curentă (fără citări de versiuni externe pentru dedup hash).

## Limită evidență

- **Handler**, **schema job** și **worker** pentru `bronze:dedup:hash-checker` **nu** sunt confirmate în repo la data documentului; limita este explicită până la audit ulterior sau implementare.
