# Sinapsă `nurturing-state-transition-feedback-sentiment-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-state-transition-feedback-sentiment-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-state-transition/nurturing-state-transition-feedback-sentiment-analyze.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-state-transition` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `nurturing-state-transition` | **Contract:** [`../../../neurons/E2/nurturing--state--transition.md`](../../../neurons/E2/nurturing--state--transition.md). **Triplă autoritate:** v2 `nurturing:state:transition`; runtime canonic **`lead:state:transition`** — vezi neuron (**E2**). |
| Destinație (graf) | `feedback-sentiment-analyze` | **Contract:** [`../../../neurons/E2/feedback--sentiment--analyze.md`](../../../neurons/E2/feedback--sentiment--analyze.md). Context: [`../../../../adr/families/e5/feedback.md`](../../../../adr/families/e5/feedback.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **nurturing-state-transition** are dependență canonică de pipeline față de **feedback-sentiment-analyze**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Planificare:** v2 §7 — `nurturing-state-transition` → `feedback-sentiment-analyze`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L311**; **Destinație (coadă):** `feedback:sentiment:analyze` la **L274** (fișier), etapă **E2**.
- **Runtime:** vezi neuronii; nu inferăm ordinea joburilor BullMQ din singurul export.

## Limite și reconcilieri

- Ambele capete mapate la **E2** în registru; traseul este totuși plasat sub **`e5-lifecycle`** în manifest — vezi [`nurturing-state-transition-family.md`](nurturing-state-transition-family.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-state-transition-feedback-sentiment-analyze\``.
