# ADR-0001 — Autoritate runtime neuron

| Câmp | Valoare |
| --- | --- |
| ID | ADR-0001 |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Nivel | Global |
| Plan v2 | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §1 (baseline), §3 «ADR-0001 — Runtime neuron authority» |
| Plan legacy | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — doar dacă v2 nu acoperă; **prevală v2** |
| Research | [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) — BullMQ ca strat de execuție, reconciliere cu registry |

## Context

În arhitectura Cognitive Brain există mai multe artefacte care descriu „neuroni”: exportul de graf de planificare, catalogul semantic și **registrul de cozi BullMQ**. Fără o autoritate runtime clară, documentația și UI-ul riscă să pretindă cozi sau fluxuri care nu există în execuție. Acest ADR fixează autoritatea **în registrul de cozi** folosit de workeri.

## Decizie (canonică din v2)

- **Decizie:** inventarul canonic runtime al neuronilor (în sens executabil BullMQ) este **registrul de cozi**, nu exportul vizual al grafului.
- **Motiv:** registrul afirmă numărul așteptat de cozi și este folosit operațional pentru înregistrarea runtime BullMQ.
- **Consecință:** orice graf, catalog sau anexă pe etapă trebuie **reconciliată** cu registrul runtime.

### Denumire canonică în contracte (v2 §6) vs execuție (registry)

- **Contracte neuron** ([contracts/neurons](../../contracts/neurons/)): **șirul canonic** pentru identificarea fișierului și a rândului din matrice este câmpul **Confirmed queue field** din [v2 §6 Complete neuron contract register](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) (aceeași valoare ca antetul secțiunilor «### NEURON» din v2). Acesta este **sursa de adevăr pentru numele neuronului în documentație**, chiar dacă `queue-registry.ts` sau `cognitive-node-catalog.ts` folosesc încă aliasuri, prefixe diferite (ex. `e3:…`) sau cozi neînregistrate.
- **Execuție BullMQ:** până la **valul1 de migrare** documentat în [migration/wave1-registry-catalog.md](../../migration/wave1-registry-catalog.md), listener-ii reali rămân conectați la numele din **`queueRegistry`**; contractele trebuie să declare **gap** acolo unde `Confirmed queue field` (v2) ≠ `name` din registry sau unde coada lipsește din registry.
- **Reconciliere:** ADR-0002 (semantic) rămâne valabil pentru `nodeKey` / catalog; acest ADR stabilește că **drift-ul documentar** se rezolvă prin migrare coordonată registry ↔ catalog ↔ v2 §6, nu prin rescrierea unilaterală a contractelor departe de v2.

## Dovezi în implementarea Cerniq

### Registru și invariant

- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts):
  - `QUEUES` — constante pentru nume de cozi canonice.
  - `queueRegistry` — lista de `{ name, concurrency, … }` folosită de workeri.
  - `QUEUE_METADATA.expectedQueueCount: 358` și `assertQueueRegistryComplete()` — **358** cozi așteptate; eroare dacă `queueRegistry.length !== 358` (vezi comentariul de audit în același fișier, liniile ~1371–1417).
- Baseline factual din v2 §1 confirmă același ordin de mărime: **358** cozi canonic în registry vs **324** noduri neuron în exportul de graf — diferența este problemă de **reconciliere**, nu de ascundere ([v2 §1](../../v2_cerniq_cognitive_brain_master_implementation_plan.md)).

### Pattern-uri runtime

- Nume dinamice (ex. cozi WA per-telefon) sunt documentate în catalog ca pattern-uri `skippedQueues` ([packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts) — `CATALOG_STATS.skippedQueues`); totuși **autoritatea pentru ce este înregistrat în `queueRegistry`** rămâne acest fișier.

## Aliniere la cercetare

`cerniq_nuronal_research_base.md` plasează **BullMQ** ca strat simbolic de orchestrare a joburilor; decizia acestui ADR este că **numele cozii executabile** trebuie tras la `queue-registry.ts`, nu dedus doar din diagrame mentale sau din exportul de graf.

## Reconciliere graf / catalog / registry

| Sursă | Rol | Risc |
| --- | --- | --- |
| **Registry** | Autoritate runtime — cozi înregistrate în `queueRegistry` | Subset strict al ideilor din graf |
| **Catalog** | Semantic pentru `/brain` — `queueName` + `nodeKey` | Nealiniere posibilă (ex. denumiri `ai:*` E2 vs E3) — vezi ADR-0002 |
| **Graf export (v2)** | Planificare, topologie bogată | Etichete pot diferi de `QUEUES.*` — documentat în ADR-urile de familie |

## Consecințe operaționale

1. Orice neuron nou: intrare în `QUEUES` + `queueRegistry` + actualizare `expectedQueueCount` / `assertQueueRegistryComplete` în același PR (vezi comentariul F9.2 din registry).
2. Documentarea contractelor neuron (`contracts/neurons/`) trebuie să citeze **șirul** din registry sau să declare explicit gap-ul.
3. Metrici sau UI care numără „neuroni” trebuie să specifice dacă numără **noduri graf**, **intrări catalog**, sau **cozi registry**.

## Criterii de acceptanță (documentare)

- [ ] Fiecare afirmație despre număr sau nume de coadă are trimitere la `queue-registry.ts` sau la v2 §1.
- [ ] Diferența registry vs graf este menționată unde se compară cele două lumi.

## Surse externe (versiuni toolchain)

- **BullMQ** folosit în monorepo: `5.73.3` în [package.json](../../../../package.json) (root); v2 menționează `5.73.4` — **reconciliere:** implementarea efectivă este **5.73.3** până la upgrade; deciziile de pattern (FlowProducer etc.) rămân valide. Verificat la **2026-04-11**.

## Limită evidență

- Acest ADR nu garantează că fiecare coadă din registry are handler complet auditat end-to-end (v2 §2.4). Granularitatea handler/payload se tratează în contracte neuron și ADR de familie.
- CMDB sau hostnames pentru Redis nu sunt cerute de acest ADR; infrastructura este în v2 §0.3 ca context, nu ca dovada fiecărui worker.

## Legături

- ADR-0002 (semantic), [README Cognitive Brain](../../README.md), [contracts/README.md](../../contracts/README.md), ADR-uri `ADR-FAMILY-e*`.
