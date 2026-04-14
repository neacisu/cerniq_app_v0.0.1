# Sinapsă `sentiment-trend-analyze-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sentiment-trend-analyze-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/sentiment-trend-analyze/sentiment-trend-analyze-negotiation-expire-check.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `sentiment-trend-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sentiment-trend-analyze` | **Contract:** [`../../../neurons/E3/sentiment--trend--analyze.md`](../../../neurons/E3/sentiment--trend--analyze.md). **Runtime:** `sentiment:trend:analyze` — vezi contract neuron. |
| Destinație (graf) | `negotiation-expire-check` | **Contract:** [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). **Runtime / semantic:** vezi contract neuron + registry. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Analiza trendului de sentiment** depinde în planificare de **verificarea expirării negocierii**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum scorurile de sentiment declanșează sau filtrează expirarea.

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

- **Runtime (ADR-0001):** E3 sursă vs E3 destinație — vezi cozi în contractele neuron.
- **Semantic (ADR-0002):** vezi catalog în fișierele neuron.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; wiring-ul efectiv între K64 și neuronii de negociere necesită audit de cod — **nu** din v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sentiment-trend-analyze-negotiation-expire-check\``.
