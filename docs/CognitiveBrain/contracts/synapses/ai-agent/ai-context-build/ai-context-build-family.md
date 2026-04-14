# Sinapsă `ai-context-build-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-context-build-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-context-build` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-context-build` | Nod de familie/traseu în graf; aliniere runtime: coadă canonică `ai:context:build` (E3), vezi contractul neuron. |
| Destinatie (graf) | `e3-ai-core` | Nod de **familie / nucleu** E3 în planificare, nu o singură coadă BullMQ; acoperă swimlane-ul semantic `ai-core` pentru neuroni E3. Nu există un fișier `contracts/neurons/...` unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Manifestul **`ai-context-build-family`** corespunde în v2 §7 unei muchii **default** de la nodul de graf `ai-context-build` către agregatul de planificare `e3-ai-core`. Rolul declarat este **„specializează familia”**: ancorează traseul `ai-context-build` în nucleul semantic E3 (`ai-core`) din export, **fără** a preciza handler unic sau payload — acestea nu apar în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu (vecini în folder)

Următoarele contracte documentează muchii **dependency** din același traseu `ai-context-build` către neuroni de negociere (sursă unică topologie: v2 §7): [`ai-context-build-negotiation-expire-check.md`](ai-context-build-negotiation-expire-check.md), [`ai-context-build-negotiation-reminder-send.md`](ai-context-build-negotiation-reminder-send.md), [`ai-context-build-negotiation-state-transition.md`](ai-context-build-negotiation-state-transition.md), [`ai-context-build-negotiation-summary-generate.md`](ai-context-build-negotiation-summary-generate.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `queue-registry.ts`):** capătul operațional al sursei este **`ai:context:build`** — contract: [`../../../neurons/E3/ai--context--build.md`](../../../neurons/E3/ai--context--build.md). **Destinatia** din graf, `e3-ai-core`, este un agregat de plan; pentru neuroni concreți din aceeași familie semantică, folosiți [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (filtru etapă E3, familie `ai-core`).
- **Semantic (ADR-0002, `cognitive-node-catalog.ts`):** metadate `nodeKey` / etapă / swimlane pentru `ai:context:build` trebuie luate din catalog și din contractul neuronului — **fără** a echivala automat eticheta de graf `e3-ai-core` cu un singur `nodeKey`.
- **Planificare (graf exportat):** muchie **default** de specializare a familiei; nu presupune handler sau payload dincolo de ce afirmă exportul.

## Limite și reconcilieri

- Dacă între graf și registry apare divergență de denumire (`ai-context-build` vs `ai:context:build`), prevală registry-ul pentru execuție; graful rămâne sursa pentru **topologie planificată**.
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează explicit absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-context-build-family\``.
