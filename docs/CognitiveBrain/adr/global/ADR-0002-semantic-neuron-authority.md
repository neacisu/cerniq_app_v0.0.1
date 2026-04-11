# ADR-0002 — Autoritate semantică neuron

| Câmp | Valoare |
| --- | --- |
| ID | ADR-0002 |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Nivel | Global |
| Plan v2 | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §3 «ADR-0002 — Semantic neuron authority» |
| Plan legacy | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — doar cu reconciliere explicită; **prevală v2** |
| Research | [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) — taxonomii neuron / orchestrare; metadata UI |
| Fișiere autoritate | [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts), [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) |

## Context

Pentru API-ul «brain» și instrumentarea workerilor trebuie stabilit **unde trăiesc** etichetele semantice: tip neuron, swimlane, etapă, analogii biologice, `nodeKey` vs `queueName`. Fără această autoritate, documentația și UI-ul amestecă denumiri din graf cu cele din execuție.

## Decizie (canonică din v2)

- **Decizie:** sursa de metadata semantică pentru `/brain` este **catalogul de noduri cognitive** (`COGNITIVE_NODE_CATALOG`) acolo unde există.
- **Motiv:** API-ul și helperii folosesc direct acest catalog (`getNodeByKey`, iterare pe catalog).
- **Consecință:** etichetele semantice (inclusiv swimlane-uri, tipuri de neuron, analogii) sunt **guvernate de catalog**, până la înlocuire explicită printr-un registru mai nou; **nu** se deduc exclusiv din exportul de graf.

### Aliniere la v2 §6 (Confirmed queue field)

- **Nume neuron în contracte:** registrul **§6** din [v2](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) fixează **Confirmed queue field** ca etichetă canonică a cozii în **documentația** de contract; `queueName` din catalog și `QUEUES.*` din registry trebuie **migrate** spre acel șir (vezi [ADR-0001](ADR-0001-runtime-neuron-authority.md) și [migration/wave1-registry-catalog.md](../../migration/wave1-registry-catalog.md)).
- **Gap catalog:** intrările lipsă din `COGNITIVE_NODE_CATALOG` pentru o coadă din v2 §6 se documentează în contract ca **gap explicit**, nu se completează prin deducție din familie; `nodeKey` se ia din v2 când câmpul **Catalog nodeKey** este prezent, altfel rămâne necompletat până la audit.

## Dovezi în implementarea Cerniq

### Catalog și statistici

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts):
  - `COGNITIVE_NODE_CATALOG` — tablou de intrări `CognitiveNodeEntry` (`nodeKey`, `queueName`, `neuronType`, `swimlane`, `etapa`, `cognitiveFunction`, `biologicalAnalogy`, …).
  - `NeuronType` — enum extins (inclusiv tipuri E4).
  - `Swimlane` — uniune literală + `SWIMLANES`.
  - `getNodeByKey`, `getNodeByQueue`, `resolveNodeKeyFromQueueName`, `resolveNodeKeyFromQueueNameAndEtapa` — rezolvare chei și **ambiguitate E2 vs E3** pe același `queueName` (comentariu în cod: exemplu `ai:*`).
  - `CATALOG_STATS` — `total`, `byEtapa`, `skippedQueues` (cozi WA dinamice, pipeline E4 neregistrate în registry), `skippedTotal`.

### API `/api/v1/brain/*`

- [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) — înregistrat cu prefix `/api/v1/brain` în [apps/api/src/routes/index.ts](../../../../apps/api/src/routes/index.ts):
  - `GET /catalog` — returnează `nodes: COGNITIVE_NODE_CATALOG` și `stats` derivate (inclusiv `CATALOG_STATS.skipped*`).
  - `GET /topology` — îmbogățește intrările din catalog cu stare Redis/DB per `batchId` opțional; muchiile de bază provin din fluxul între swimlane-uri în același fișier.
  - `GET /events/stream` — SSE; constantă `SSE_ROUTE_COGNITIVE_EVENTS = "/api/v1/brain/events/stream"`.
  - Validare `nodeKey` pentru rute parametrizate: `getNodeByKey(k) !== undefined` ([apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) — `nodeKeyParamsSchema`).

### Instrumentare și evenimente

- [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts) — `withCognitiveSpan` apelează `getNodeByKey(nodeKey)` pentru atribute OTel (`cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function`) — deci **rezolvarea semantică** pentru span-uri pornește din catalog (vezi ADR-0003).

## Aliniere la cercetare

Research-ul descrie taxonomii și straturi de orchestrare; **implementarea** fixează taxonomia UI/OTel prin `NeuronType` / `Swimlane` din pachetul shared, nu prin documente externe.

## Reconciliere catalog ↔ registry ↔ graf

| Aspect | Observație |
| --- | --- |
| **Număr intrări** | La audit2026-04-11, numărul de apeluri `n(` în `COGNITIVE_NODE_CATALOG` este **310**; comentariul «118 cognitive neurons» din același fișier este **depășit** — prevală lungimea tabloului / `CATALOG_STATS.total`. |
| **OpenAPI summary** | Schema rutei `GET /catalog` menționează încă «118 neurons E1+E2» — **drift** față de catalogul extins; actualizarea schemei este recomandată separat. |
| **Nealiniere nume coadă** | README și ADR-urile de familie documentează gap-uri (ex. `e3:ai:response-generate` vs `ai:e3:response:generate`) — **registry** (ADR-0001) vs **catalog** trebuie reconciliate în PR-uri de infrastructură, nu ascunse în doc. |
| **skippedQueues** | Catalogul declară explicit cozi dinamice / neregistrate; registry-ul rămâne autoritate pentru ce e în `queueRegistry`. |

## Consecințe operaționale

1. Orice neuron nou în UI trebuie să aibă intrare în `COGNITIVE_NODE_CATALOG` înainte de a expune `nodeKey` în API.
2. Modificări de `queueName` în registry impun actualizare sincronă a `queueName` din catalog (sau ADR de familie cu gap explicite).
3. Testele care validează `nodeKey` trebuie să folosească chei prezente în catalog (schema API respinge necunoscutele).

## Criterii de acceptanță (documentare)

- [ ] Tabel sau script de reconciliere periodică catalog vs `queue-registry.ts` pentru cozi statice.
- [ ] Schema OpenAPI `GET /catalog` aliniată la `CATALOG_STATS.total` și etape reale.

## Surse externe

- Nu există o spec externă obligatorie pentru «cognitive node catalog»; modelul de date este intern. Verificat la **2026-04-11**.

## Limită evidență

- Acest ADR nu enumeră fiecare pereche catalog/registry în conflict; detaliul stă în ADR-urile `ADR-FAMILY-e*` și în README.
- Câmpuri opționale ale `CognitiveNodeEntry` (ex. API externe declarate) nu sunt auditate aici per intrare.

## Legături

- ADR-0001 (runtime), ADR-0003 (telemetrie), [README Cognitive Brain](../../README.md), [contracts/README.md](../../contracts/README.md).
