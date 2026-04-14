# Sinapsă `monitor-quota-usage-human-takeover-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-quota-usage-human-takeover-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-quota-usage/monitor-quota-usage-human-takeover-initiate.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-quota-usage` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-quota-usage` | **Contract:** [`../../../neurons/E2/monitor--quota--usage.md`](../../../neurons/E2/monitor--quota--usage.md). **Triplă autoritate:** v2 `monitor:quota:usage`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `human-takeover-initiate` | **Contract:** [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-quota-usage** are dependență canonică de pipeline față de **human-takeover-initiate**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `monitor-quota-usage` → `human-takeover-initiate`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L86**; țintă `human:takeover:initiate` la **L78**.
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Ordinea și condițiile efective de inițiere takeover în raport cu joburile de monitorizare cotă nu sunt encodate în registrul SYNAPSE; verificare în cod/workers.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-quota-usage-human-takeover-initiate\``.
