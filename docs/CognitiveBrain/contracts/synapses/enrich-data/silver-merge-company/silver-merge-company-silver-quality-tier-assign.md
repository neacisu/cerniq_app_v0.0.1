# Sinapsă `silver-merge-company-silver-quality-tier-assign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-merge-company-silver-quality-tier-assign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-merge-company/silver-merge-company-silver-quality-tier-assign.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-merge-company` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-merge-company` | **Contract:** [`../../../neurons/E1/silver--merge--company.md`](../../../neurons/E1/silver--merge--company.md). **Runtime (ADR-0001):** gap pentru literal v2 — vezi neuron. |
| Destinație (graf) | `silver-quality-tier-assign` | **Contract:** [`../../../neurons/E1/silver--quality--tier-assign.md`](../../../neurons/E1/silver--quality--tier-assign.md). E1 — vezi contractul neuronului destinație. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **silver-merge-company** are dependență sintactică față de **silver-quality-tier-assign**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `silver-merge-company` → `silver-quality-tier-assign`.
- **Runtime (ADR-0001):** sursă — vezi neuron; ținta — vezi neuronul de calitate.
- **Semantic (ADR-0002):** E1 — vezi catalog.

## Limite și reconcilieri

- **Sursă:** `silver:merge:company` fără coadă dedicată în registry — vezi neuron.
- Fără presupuneri despre ordinea execuției merge înainte / după calitate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-merge-company-silver-quality-tier-assign\``.
