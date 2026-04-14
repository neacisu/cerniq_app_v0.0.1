# Sinapsă `geo-territory-map-nurturing-onboarding-step`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-territory-map-nurturing-onboarding-step` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-territory-map/geo-territory-map-nurturing-onboarding-step.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-territory-map` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `geo-territory-map` | **Contract:** [`../../../neurons/E5/geo--territory--map.md`](../../../neurons/E5/geo--territory--map.md). **Runtime (ADR-0001):** `e5:geo:territory-calculate` — vezi neuron. |
| Destinație (graf) | `nurturing-onboarding-step` | **Contract:** [`../../../neurons/E5/nurturing--onboarding--step.md`](../../../neurons/E5/nurturing--onboarding--step.md). **Semantic:** `NEURON_MATRIX.csv` — `e5:onboarding:step-execute`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **geo-territory-map** are dependență sintactică față de **nurturing-onboarding-step**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `geo-territory-map` → `nurturing-onboarding-step`.
- **Runtime (ADR-0001):** vezi neuroni sursă și destinație.
- **Semantic (ADR-0002):** E5 — vezi ADR `geo` și `lifecycle`.

## Limite și reconcilieri

- Reconciliere explicită graf vs cozi — vezi contractele neuronilor.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-territory-map-nurturing-onboarding-step\``.
