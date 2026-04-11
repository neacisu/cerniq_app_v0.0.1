# Contracte neuron și sinapsă

## Introducere — încadrare în arhitectura Cognitive Brain

Acest director (`docs/CognitiveBrain/contracts/`) este **punctul în care planificarea cognitivă se traduce în artefacte editabile per unitate**: un fișier Markdown per **neuron** (coadă canonică) și un fișier per **sinapsă** (muchie din registrul de topologie). Scopul nu este doar inventarul, ci **trasabilitatea**: fiecare contract poate fi citit ca „ce se așteaptă de la acest nod sau de la această legătură”, în același timp cu recunoașterea limitelor de evidență acolo unde implementarea nu expune încă handler-ul sau schema completă.

### Legătura cu documentele cadru

Două surse definesc **direcția** și **granularitatea** muncii:

1. [**Planul master**](../cerniq_cognitive_brain_master_implementation_plan.md) — baseline factual conservator: inventar runtime (**358** cozi BullMQ canonic în registry), export de graf (**380** noduri, **324** neuroni, **2305** muchii), implementarea `/brain` (catalog, topologie, SSE, pause/resume), primitive din [`cognitive-helpers.ts`](../../../workers/shared/src/cognitive-helpers.ts) (evenimente, mutații cu redactare PII, span-uri OTel). Planul fixează explicit că **registry-ul** și **exportul de graf nu sunt identice** — reconcilierea este problemă deschisă, nu detaliu ascuns. Infrastructura menționată acolo (ex. Kafka 4.1, Neo4j 5.23 Enterprise, Redis 7, lanț observabilitate Grafana/Loki/Tempo/Prometheus + OpenTelemetry Collector, endpoint-uri AI self-hosted confirmate în CMDB) este **contextul real** în care vor rula neuronii descriși în contracte.
2. [**Baza de cercetare neuronală**](../cerniq_nuronal_research_base.md) — sinteză de arhitectură țintă: model **CoALA** (memorie, acțiune, ciclu decizional), pattern neuro-simbolic cu **BullMQ ca strat simbolic** și procesare neurală în interiorul neuronului, micro-ciclu **OODA** per neuron, autonomie **bounded** pe niveluri, separare **execuție (BullMQ)** vs **evenimente (Kafka)** ca „sistem nervos dublu”, ieșiri structurate și **încredere** ca înveliș determinist în jurul AI, rolul **Neo4j** ca substrat de world-model și **OpenTelemetry** pentru convenții GenAI. Aceste linii sunt **recomandări și racordare la industrie**; în contracte trebuie distins clar ce este deja ancorat în cod/registry față de ce rămâne direcție de evoluție.

### Gândirea informației: trei straturi de „adevăr”

Pentru a evita confuzia între hartă și teren, planul master introduce o ierarhie pe care contractele o **presupun** cititorul:

| Strat | Autoritate | Rol pentru `contracts/` |
| --- | --- | --- |
| **Runtime** | [`queue-registry.ts`](../../../workers/shared/src/queue-registry.ts) (ADR-0001) | Numele de **coadă BullMQ** executabilă; contractul neuron trebuie să fie aliniabil la acest șir sau să documenteze explicit gap-ul. |
| **Semantic** | [`cognitive-node-catalog.ts`](../../../packages/shared/src/cognitive-node-catalog.ts) (ADR-0002) | `nodeKey`, etapă, swimlane, tip neuron, severitate — ceea ce API-ul `/brain` și instrumentarea cognitivă folosesc ca metadate. |
| **Planificare (graf exportat)** | Noduri și familii din exportul de graf | Vizualizare și planificare la scară largă; poate folosi prefixe sau etichete care **nu** coincid cu registry-ul — caz tratat în ADR-urile de familie (ex. [ADR-uri E1](../adr/families/e1/)). |

Contractele din `neurons/` și `synapses/` sunt **ancoră operațională și de integrare**: leagă intenția de la nivel de familie (ADR) de la coadă și de la muchie. Fără această triplă distincție, documentația tinde să „unească” artificial graf cu cod.

### Scopul contractelor față de „neuron conștient operațional”

În planul master, un neuron este tratat ca *operațional conștient* când are, în minimum, identitate canonică, etapă și familie, rol declarat, **înveliș de telemetrie**, **înveliș de politică**, rutare model dacă e cazul, și cale de escaladare. Fișierele din `contracts/neurons/` susțin acest model prin **documentarea contractului per coadă** (registru §6 al planului). Fișierele din `contracts/synapses/` materializează **dependențele și fluxurile** între neuroni (registru §7). Împreună, ele permit auditului și dezvoltării să răspundă la: *ce intră, ce iese, ce nu este încă demonstrat în cod* — fără a pretinde că fiecare rând din graf are deja handler complet verificat (planul afirmă explicit limita acolo unde evidența se oprește).

### Observabilitate și politică (legătură scurtă)

Research-ul și planul converg spre **OpenTelemetry** ca fundație de telemetrie, inclusiv direcția convențiilor GenAI; în cod, `cognitive-helpers` deja leagă procesarea de span-uri cu atribute cognitive (`cognitive.nodeKey`, swimlane, etapă, etc.). **Guardrails** și **HITL** sunt planificate ca **plane transversale** (infrastructură, nu logică împrăștiată); contractele de sinapsă și neuron trebuie să rămână **compatibile** cu ideea că acțiunile cu consecințe mari nu ocolesc escaladarea — detaliul de politică este în ADR-uri globale și în familii, nu repetat în fiecare fișier de contract decât prin trimitere.

---

## Structură directoare și regenerare

- **`neurons/E1` … `neurons/E5`** — câte un fișier `.md` per coadă canonică (324 total), extras din registrul §6 al planului master.
- **`synapses/`** — câte un fișier `.md` per identificator de sinapsă din registrul §7 (2305 total).

Numele fișierelor folosesc slug-uri sigure (ex. `:` → `--` în numele cozii).

Regenerare: `python3 docs/CognitiveBrain/_generate_placeholders.py`.

## Matrice ADR-uri familie E1 (sumar)

ADR-urile de familie E1 (decizii de guvernanță și reconciliere registry ↔ export graf) trăiesc în [`../adr/families/e1/`](../adr/families/e1/). Mai jos: legătură rapidă și **sumar** aliniat secțiunii *Context* din fiecare ADR (detaliu complet în fișier).

| Familie (graf) | ADR | Sumar |
| --- | --- | --- |
| `bronze-dedup` | [bronze-dedup.md](../adr/families/e1/bronze-dedup.md) | Deduplicare planificată la nivel bronze; în cod **nu** există încă coadă `bronze:dedup:*` în registry/catalog la documentare — reconciliere deschisă. |
| `hitl` | [hitl.md](../adr/families/e1/hitl.md) | Legătură import ↔ HITL: runtime `hitl:escalate` / `hitl:resume`; graful poate cita `pipeline:approval:pending` — mapare explicită necesară. |
| `ai-enrichment` | [ai-enrichment.md](../adr/families/e1/ai-enrichment.md) | LLM pentru structurare, merge inteligent, încredere, fallback; în catalog swimlane **`ai-analysis`**, cozi `ai:*` (nu neapărat prefix `enrich:ai:*` din graf). |
| `dedup` | [dedup.md](../adr/families/e1/dedup.md) | Deduplicare exactă și fuzzy (`dedup:*`); în catalog același swimlane **`dedup-scoring`** ca scorerii — prefix graf `silver:dedup:*` vs runtime. |
| `ingest` | [ingest.md](../adr/families/e1/ingest.md) | Intrări brute: `ingest:*` (CSV, Excel, webhook, manual, API); graful folosește adesea `bronze:ingest:*` — reconciliere prefix. |
| `normalize` | [normalize.md](../adr/families/e1/normalize.md) | Standardizare nume, adresă, telefon, email (`normalize:*`); graf `silver:norm:*` și denumiri câmpuri (ex. `company-name` vs `name`). |
| `merge` | [merge.md](../adr/families/e1/merge.md) | Fuziune entități în graf (`silver:merge:*`); în runtime apare **`ai:merge:xai`** — gap major documentat pentru merge non-AI. |
| `quality` | [quality.md](../adr/families/e1/quality.md) | Scoruri calitate și rollup (`score:*`, `aggregate:*`); eticheta graf `silver:quality:*` și noduri precum `tier-assign` necesită mapare la catalog. |
| `monitor` | [monitor.md](../adr/families/e1/monitor.md) | Observabilitate pipeline: coadă **`pipeline:monitor`**; graf poate separa `health` / `rate-sync` — clarificare worker vs cozi multiple. |
| `orchestrator` | [orchestrator.md](../adr/families/e1/orchestrator.md) | Orchestrare și promovări (`pipeline:orchestrate`, `promote:*`, `error-handler`); graf `pipeline:orchestrator:*` vs nume runtime. |
| `enrichment` | [enrichment.md](../adr/families/e1/enrichment.md) | Bloc mare ANAF/Termene/ONRC, email, telefon, scrape, geo, agri, validări CUI; swimlane-uri catalog **`enrichment-fiscal`** / **`enrichment-external`**; unificare `enrich:anaf:full` vs cozi ANAF discrete în graf. |

**Autoritate:** pentru nume de cozi executabile, prevalează [`workers/shared/src/queue-registry.ts`](../../../workers/shared/src/queue-registry.ts) și [`packages/shared/src/cognitive-node-catalog.ts`](../../../packages/shared/src/cognitive-node-catalog.ts) (vezi ADR-0001 și ADR-0002 în [planul master](../cerniq_cognitive_brain_master_implementation_plan.md)). Contractele din `neurons/` și `synapses/` rămân **per coadă / per sinapsă**; ADR-urile de familie le **încadrează** semantic.

**Hartă generală Cognitive Brain:** [`../README.md`](../README.md).
