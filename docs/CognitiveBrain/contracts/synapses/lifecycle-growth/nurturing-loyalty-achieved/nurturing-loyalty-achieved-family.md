# Sinapsă `nurturing-loyalty-achieved-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-loyalty-achieved-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-loyalty-achieved/nurturing-loyalty-achieved-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-loyalty-achieved` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `nurturing-loyalty-achieved` | Traseu în graf; contract neuron: [`../../../neurons/E5/nurturing--loyalty--achieved.md`](../../../neurons/E5/nurturing--loyalty--achieved.md). **Triplă autoritate:** v2 **`nurturing:loyalty:achieved`**; semantic raportat `e5:state:advocate-promote` în `NEURON_MATRIX.csv` — vezi neuron. |
| Destinație (graf) | `e5-lifecycle` | Agregat **familie lifecycle E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/lifecycle.md`](../../../../adr/families/e5/lifecycle.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **nurturing-loyalty-achieved** sub agregatul **`e5-lifecycle`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`nurturing-loyalty-achieved-feedback-competitor-log.md`](nurturing-loyalty-achieved-feedback-competitor-log.md), [`nurturing-loyalty-achieved-feedback-conversation-analyze.md`](nurturing-loyalty-achieved-feedback-conversation-analyze.md), [`nurturing-loyalty-achieved-feedback-entity-store.md`](nurturing-loyalty-achieved-feedback-entity-store.md), [`nurturing-loyalty-achieved-feedback-nps-aggregate.md`](nurturing-loyalty-achieved-feedback-nps-aggregate.md), [`nurturing-loyalty-achieved-feedback-sentiment-analyze.md`](nurturing-loyalty-achieved-feedback-sentiment-analyze.md), [`nurturing-loyalty-achieved-feedback-writeback-crm.md`](nurturing-loyalty-achieved-feedback-writeback-crm.md).

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

- **Planificare:** v2 §7 — `nurturing-loyalty-achieved` → `e5-lifecycle`.
- **Runtime (ADR-0001):** `e5-lifecycle` nu este cheie în `QUEUES`; vezi neuronul sursă și ADR familie.
- **Semantic (ADR-0002):** lifecycle E5 — vezi catalog și `NEURON_MATRIX.csv`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Orice gap sursă vs registry — vezi contractul neuron `nurturing--loyalty--achieved`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-loyalty-achieved-family\``.
