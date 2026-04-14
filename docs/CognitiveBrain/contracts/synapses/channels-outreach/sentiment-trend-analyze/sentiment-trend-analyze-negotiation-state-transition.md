# Sinapsă `sentiment-trend-analyze-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sentiment-trend-analyze-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/sentiment-trend-analyze/sentiment-trend-analyze-negotiation-state-transition.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `sentiment-trend-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sentiment-trend-analyze` | **Contract:** [`../../../neurons/E3/sentiment--trend--analyze.md`](../../../neurons/E3/sentiment--trend--analyze.md). **Runtime:** `sentiment:trend:analyze` — vezi contract neuron. |
| Destinație (graf) | `negotiation-state-transition` | **Contract:** [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). **Runtime / semantic:** vezi contract neuron + registry. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Analiza sentimentului** depinde în planificare de **tranzițiile de stare ale negocierii**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie graful de stări sau guard-uri.

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

- **Runtime (ADR-0001):** vezi contracte + registry.
- **Semantic (ADR-0002):** vezi catalog E3.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; ordinea cauzală (sentiment înainte/după tranziție) nu este în exportul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sentiment-trend-analyze-negotiation-state-transition\``.
