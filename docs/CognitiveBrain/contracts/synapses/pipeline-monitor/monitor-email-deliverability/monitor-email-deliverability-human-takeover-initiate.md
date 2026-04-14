# Sinapsă `monitor-email-deliverability-human-takeover-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-email-deliverability-human-takeover-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-email-deliverability/monitor-email-deliverability-human-takeover-initiate.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-email-deliverability` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-email-deliverability` | **Contract:** [`../../../neurons/E2/monitor--email--deliverability.md`](../../../neurons/E2/monitor--email--deliverability.md). **Triplă autoritate:** v2 `monitor:email:deliverability`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `human-takeover-initiate` | **Contract:** [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-email-deliverability** are dependență canonică de pipeline față de **human-takeover-initiate** (inițiere takeover uman). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `monitor-email-deliverability` → `human-takeover-initiate`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L84**; țintă `human:takeover:initiate` la **L78**.
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Condițiile concrete în care monitorul de deliverability declanșează sau cere takeover nu sunt specificate în blocul SYNAPSE din v2; nu se completează prin presupunere.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-email-deliverability-human-takeover-initiate\``.
