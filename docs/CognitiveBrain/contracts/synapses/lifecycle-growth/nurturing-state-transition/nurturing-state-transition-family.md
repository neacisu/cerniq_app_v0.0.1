# Sinapsă `nurturing-state-transition-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-state-transition-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-state-transition/nurturing-state-transition-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-state-transition` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `nurturing-state-transition` | **Graf:** tranziție de stare în journey (etichetă `nurturing:*`). Contract neuron: [`../../../neurons/E2/nurturing--state--transition.md`](../../../neurons/E2/nurturing--state--transition.md). **Triplă autoritate:** v2 `nurturing:state:transition`; runtime canonic **`lead:state:transition`** / catalog `e2:lead:state-transition` — vezi neuron (E2, nu E5). |
| Destinație (graf) | `e5-lifecycle` | Agregat **`e5-lifecycle`**. v2: [`### ADR-FAMILY-e5-lifecycle`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../../adr/families/e5/lifecycle.md`](../../../../adr/families/e5/lifecycle.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **nurturing-state-transition** sub **`e5-lifecycle`**, descriere v2 **„specializează familia”**: în planificare, acest nod este grupat în containerul grafic lifecycle, deși implementarea neuronului este ancorată în **E2** / FSM lead — reconcilierea este documentată în contractul neuron, nu negată aici.

## Sinapse dependență în același traseu

[`nurturing-state-transition-feedback-competitor-log.md`](nurturing-state-transition-feedback-competitor-log.md), [`nurturing-state-transition-feedback-conversation-analyze.md`](nurturing-state-transition-feedback-conversation-analyze.md), [`nurturing-state-transition-feedback-entity-store.md`](nurturing-state-transition-feedback-entity-store.md), [`nurturing-state-transition-feedback-nps-aggregate.md`](nurturing-state-transition-feedback-nps-aggregate.md), [`nurturing-state-transition-feedback-sentiment-analyze.md`](nurturing-state-transition-feedback-sentiment-analyze.md), [`nurturing-state-transition-feedback-writeback-crm.md`](nurturing-state-transition-feedback-writeback-crm.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | `lead:state:transition` — vezi neuron și `queue-registry.ts`. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `nurturing:state:transition` la **L311** (fișier), etapă **E2**. |
| **Planificare** | v2 §7 — `nurturing-state-transition` → `e5-lifecycle`. |

## Limite și reconcilieri

- **Graf vs etapă:** agregatul planificat **`e5-lifecycle`** nu înlocuiește faptul că neuronul este **E2**; orice rutare operațională trebuie citită din contractul neuron și din codul FSM.
- Inconsistențe text v2 (ex. mențiune „E5” în descriere) sunt tratate în [`../../../neurons/E2/nurturing--state--transition.md`](../../../neurons/E2/nurturing--state--transition.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-state-transition-family\``.
