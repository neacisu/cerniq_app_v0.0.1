# Sinapsă `ai-feedback-collect-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-feedback-collect-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-feedback-collect/ai-feedback-collect-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-feedback-collect` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `ai-feedback-collect` | Nod de familie/traseu în graf (slug). **Execuție (ADR-0001):** coadă BullMQ canonică **`feedback:collect`** (`QUEUES.E3_FEEDBACK_COLLECT` în `workers/shared/src/queue-registry.ts`). În v2 / matrice apare și eticheta **`ai:feedback:collect`** — nu o confunda cu string-ul cozii din worker; vezi [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). |
| Destinatie (graf) | `e3-ai-core` | Nod de **familie / nucleu** E3 în planificare, nu o singură coadă BullMQ; acoperă swimlane-ul semantic `ai-core` pentru neuroni E3. Nu există un fișier `contracts/neurons/...` unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `queue-registry.ts`):** capătul operațional al sursei este **`feedback:collect`** — contract: [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). **Destinația** din graf, `e3-ai-core`, este un agregat de plan; pentru neuroni concreți din aceeași familie semantică, folosiți [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (filtru etapă E3, familie `ai-core`).
- **Semantic (ADR-0002, `cognitive-node-catalog.ts`):** metadate `nodeKey` / etapă / swimlane pentru colectarea feedback-ului (ex. `e3:feedback:collect` → `feedback:collect`) trebuie luate din catalog și din contractul neuronului — **fără** a echivala automat eticheta de graf `e3-ai-core` cu un singur `nodeKey`.
- **Planificare (graf exportat):** muchie **default** de specializare a familiei; nu presupune handler sau payload dincolo de ce afirmă exportul.

## Limite și reconcilieri

- Reconciliere slug graf **`ai-feedback-collect`** ↔ coadă runtime **`feedback:collect`** ↔ câmpuri v2 / CSV **`ai:feedback:collect`**: pentru **execuție** prevală `queue-registry.ts` și contractul neuron; graful rămâne sursa pentru **topologie planificată**.
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează explicit absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`ai-feedback-collect-family\``.
