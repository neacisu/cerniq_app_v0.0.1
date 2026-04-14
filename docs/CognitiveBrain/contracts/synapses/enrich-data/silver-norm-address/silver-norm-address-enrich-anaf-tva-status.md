# Sinapsă `silver-norm-address-enrich-anaf-tva-status`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-norm-address-enrich-anaf-tva-status` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-norm-address/silver-norm-address-enrich-anaf-tva-status.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-norm-address` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-norm-address` | **Contract:** [`../../../neurons/E1/silver--norm--address.md`](../../../neurons/E1/silver--norm--address.md). **Runtime (ADR-0001):** `normalize:address` / `e1:normalize:address` — vezi neuron. |
| Destinație (graf) | `enrich-anaf-tva-status` | **Contract:** [`../../../neurons/E1/enrich--anaf--tva-status.md`](../../../neurons/E1/enrich--anaf--tva-status.md). **Semantic:** vezi `NEURON_MATRIX.csv` pentru `enrich:anaf:tva-status`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **normalizarea adresei** silver este legată structural de traseul **`enrich-anaf-tva-status`**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `silver-norm-address` → `enrich-anaf-tva-status`.
- **Runtime (ADR-0001):** sursă — normalizare adresă; ținta — vezi neuronul corespunzător `enrich-*`.
- **Semantic (ADR-0002):** E1 — `normalize` vs `enrichment`; vezi ADR-uri `normalize` și `enrichment`.

## Limite și reconcilieri

- **Destinație:** unele trasee `enrich-*` au **gap** sau mapări parțiale față de registry — **necesită reconciliere graf ↔ registry** pe neuronul țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-norm-address-enrich-anaf-tva-status\``.
