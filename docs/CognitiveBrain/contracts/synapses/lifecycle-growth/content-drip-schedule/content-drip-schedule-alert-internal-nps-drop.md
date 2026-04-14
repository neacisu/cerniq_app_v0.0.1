# Sinapsă `content-drip-schedule-alert-internal-nps-drop`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `content-drip-schedule-alert-internal-nps-drop` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/content-drip-schedule/content-drip-schedule-alert-internal-nps-drop.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `content-drip-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `content-drip-schedule` | **Contract:** [`../../../neurons/E5/content--drip--schedule.md`](../../../neurons/E5/content--drip--schedule.md). **Runtime:** **`content:drip:schedule`** — vezi neuron. |
| Destinație (graf) | `alert-internal-nps-drop` | **Contract:** [`../../../neurons/E5/alert--internal--nps-drop.md`](../../../neurons/E5/alert--internal--nps-drop.md). Context: [`../../../../adr/families/e5/alerts.md`](../../../../adr/families/e5/alerts.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **content-drip-schedule** are dependență sintactică față de **alert-internal-nps-drop**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `content-drip-schedule` → `alert-internal-nps-drop`.
- **Runtime / semantic:** vezi neuronii.

## Limite și reconcilieri

- Praguri NPS — în contractul neuronului alertă, dacă documentate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`content-drip-schedule-alert-internal-nps-drop\``.
