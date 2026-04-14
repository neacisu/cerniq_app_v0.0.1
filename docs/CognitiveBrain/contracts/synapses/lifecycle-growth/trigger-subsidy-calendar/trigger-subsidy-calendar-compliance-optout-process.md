# Sinapsă `trigger-subsidy-calendar-compliance-optout-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `trigger-subsidy-calendar-compliance-optout-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/trigger-subsidy-calendar/trigger-subsidy-calendar-compliance-optout-process.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `trigger-subsidy-calendar` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `trigger-subsidy-calendar` | **Contract:** [`../../../neurons/E5/trigger--subsidy--calendar.md`](../../../neurons/E5/trigger--subsidy--calendar.md). **Runtime:** `alerts:apia:seasonal` (J54). |
| Destinație (graf) | `compliance-optout-process` | **Contract:** [`../../../neurons/E5/compliance--optout--process.md`](../../../neurons/E5/compliance--optout--process.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **trigger-subsidy-calendar** are dependență sintactică față de **compliance-optout-process**. v2: **sinapsă canonică de pipeline**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `trigger-subsidy-calendar` → `compliance-optout-process`.
- **Runtime:** sursă — J54; destinație — vezi neuron `compliance-optout-process`.

## Limite și reconcilieri

- Muchia exprimă **topologie planificată**; implementarea efectivă a opt-out în lanțul APIA nu este derivată aici din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`trigger-subsidy-calendar-compliance-optout-process\``.
