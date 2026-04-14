# Sinapsă `silver-dedup-entity-resolve-silver-merge-company`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-dedup-entity-resolve-silver-merge-company` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-dedup-entity-resolve/silver-dedup-entity-resolve-silver-merge-company.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-dedup-entity-resolve` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-dedup-entity-resolve` | **Contract:** [`../../../neurons/E1/silver--dedup--entity-resolve.md`](../../../neurons/E1/silver--dedup--entity-resolve.md). **Runtime (ADR-0001):** echivalență funcțională documentată ca **`dedup:exact`** — vezi neuron. |
| Destinație (graf) | `silver-merge-company` | **Contract:** [`../../../neurons/E1/silver--merge--company.md`](../../../neurons/E1/silver--merge--company.md). **Runtime:** v2_queue **`silver:merge:company`** cu **gap** în registry — vezi neuron (`pipeline:promote:bronze-silver`, `ai:merge:xai`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **silver-dedup-entity-resolve** are dependență sintactică față de **silver-merge-company**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `silver-dedup-entity-resolve` → `silver-merge-company`.
- **Runtime (ADR-0001):** ambele capete necesită reconciliere cu nume de cozi reale — vezi neuronii.
- **Semantic (ADR-0002):** E1 dedup / merge — vezi `NEURON_MATRIX.csv`.

## Limite și reconcilieri

- **Sursă:** `silver:dedup:entity-resolve` vs **`dedup:exact`**.
- **Țintă:** `silver:merge:company` **fără** coadă 1:1 în registry — vezi neuronul destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-dedup-entity-resolve-silver-merge-company\``.
