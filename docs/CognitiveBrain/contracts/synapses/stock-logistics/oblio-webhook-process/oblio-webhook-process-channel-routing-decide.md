# Sinapsă `oblio-webhook-process-channel-routing-decide`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `oblio-webhook-process-channel-routing-decide` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/oblio-webhook-process/oblio-webhook-process-channel-routing-decide.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `oblio-webhook-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `oblio-webhook-process` | **Contract:** [`../../../neurons/E3/oblio--webhook--process.md`](../../../neurons/E3/oblio--webhook--process.md). **Triplă autoritate:** v2 `oblio:webhook:process`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `channel-routing-decide` | **Contract:** [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **oblio-webhook-process** are dependență canonică de pipeline față de **channel-routing-decide**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `oblio-webhook-process` → `channel-routing-decide`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L142**; țintă `channel:routing:decide` la **L131** (`catalog_nodekey_v2` gol — vezi contract neuron).
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Rutarea după procesare webhook este o decizie de implementare; muchia indică doar dependența din graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`oblio-webhook-process-channel-routing-decide\``.
