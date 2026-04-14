# Sinapsă `silver-norm-company-name-enrich-madr-cooperative`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-norm-company-name-enrich-madr-cooperative` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-norm-company-name/silver-norm-company-name-enrich-madr-cooperative.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-norm-company-name` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-norm-company-name` | **Contract:** [`../../../neurons/E1/silver--norm--company-name.md`](../../../neurons/E1/silver--norm--company-name.md). **Runtime (ADR-0001):** `normalize:name` / `e1:normalize:name` — vezi neuron. |
| Destinație (graf) | `enrich-madr-cooperative` | **Contract:** [`../../../neurons/E1/enrich--madr--cooperative.md`](../../../neurons/E1/enrich--madr--cooperative.md). **Semantic:** vezi `NEURON_MATRIX.csv` pentru `enrich:madr:cooperative`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **normalizarea numelui companiei** silver este legată structural de traseul **`enrich-madr-cooperative`**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `silver-norm-company-name` → `enrich-madr-cooperative`.
- **Runtime (ADR-0001):** sursă — normalizare nume companie; ținta — vezi neuronul corespunzător `enrich-*`.
- **Semantic (ADR-0002):** E1 — `normalize` vs `enrichment`; vezi ADR-uri `normalize` și `enrichment`.

## Limite și reconcilieri

- **Destinație:** unele trasee `enrich-*` au **gap** sau mapări parțiale față de registry — **necesită reconciliere graf ↔ registry** pe neuronul destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-norm-company-name-enrich-madr-cooperative\``.
