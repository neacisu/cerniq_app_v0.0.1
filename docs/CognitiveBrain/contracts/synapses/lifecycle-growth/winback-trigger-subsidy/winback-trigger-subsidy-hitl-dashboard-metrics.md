# Sinapsă `winback-trigger-subsidy-hitl-dashboard-metrics`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-trigger-subsidy-hitl-dashboard-metrics` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-trigger-subsidy/winback-trigger-subsidy-hitl-dashboard-metrics.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-trigger-subsidy` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `winback-trigger-subsidy` | **Contract:** [`../../../neurons/E5/winback--trigger--subsidy.md`](../../../neurons/E5/winback--trigger--subsidy.md). **Runtime:** fără coadă cu acest slug — vezi neuron (lanț J54/J55). |
| Destinație (graf) | `hitl-dashboard-metrics` | **Contract:** [`../../../neurons/E5/hitl--dashboard--metrics.md`](../../../neurons/E5/hitl--dashboard--metrics.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **winback-trigger-subsidy** are dependență sintactică față de **hitl-dashboard-metrics**. v2: **sinapsă canonică de pipeline**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `winback-trigger-subsidy` → `hitl-dashboard-metrics`.
- **Runtime:** sursă — vezi `winback--trigger--subsidy.md`; țintă — `hitl--dashboard--metrics.md`.

## Limite și reconcilieri

- **Sursă:** nu presupunem un singur worker „winback-trigger-subsidy”; maparea operațională este contextuală (alerte APIA), nu derivată din numele muchiei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-trigger-subsidy-hitl-dashboard-metrics\``.
