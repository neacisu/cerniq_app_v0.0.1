# Sinapsă `monitor-phone-health-human-takeover-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-phone-health-human-takeover-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-phone-health/monitor-phone-health-human-takeover-initiate.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-phone-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-phone-health` | **Contract:** [`../../../neurons/E2/monitor--phone--health.md`](../../../neurons/E2/monitor--phone--health.md). **Triplă autoritate:** v2 `monitor:phone:health`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `human-takeover-initiate` | **Contract:** [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-phone-health** are dependență canonică de pipeline față de **human-takeover-initiate**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `monitor-phone-health` → `human-takeover-initiate`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L85**; **Destinație (coadă):** `human:takeover:initiate` la **L78**.
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Fluxul operațional exact rămâne de verificat în cod; contractul sinapse rămâne export-grounded.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-phone-health-human-takeover-initiate\``.
