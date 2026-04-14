# Sinapsă `silver-norm-phone-e164-enrich-email-role-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-norm-phone-e164-enrich-email-role-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-norm-phone-e164/silver-norm-phone-e164-enrich-email-role-check.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-norm-phone-e164` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-norm-phone-e164` | **Contract:** [`../../../neurons/E1/silver--norm--phone-e164.md`](../../../neurons/E1/silver--norm--phone-e164.md). **Runtime (ADR-0001):** **două** căi procedurale în cod pentru același neuron v2 (`normalize:phone` / `e1:normalize:phone` și `enrich:phone:normalize` / `e1:enrich:phone-normalize`); vezi neuron — **exportul graf** (`silver-norm-phone-e164`) **nu** selectează automat una dintre cozi. — vezi neuron. |
| Destinație (graf) | `enrich-email-role-check` | **Contract:** [`../../../neurons/E1/enrich--email--role-check.md`](../../../neurons/E1/enrich--email--role-check.md). **Semantic:** vezi `NEURON_MATRIX.csv` pentru `enrich:email:role-check`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **normalizarea telefonului (E.164)** silver este legată structural de traseul **`enrich-email-role-check`**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `silver-norm-phone-e164` → `enrich-email-role-check`.
- **Runtime (ADR-0001):** sursă — normalizare telefon (E.164); ținta — vezi neuronul corespunzător `enrich-*`.
- **Semantic (ADR-0002):** E1 — `normalize` vs `enrichment`; vezi ADR-uri `normalize` și `enrichment`.

## Limite și reconcilieri

- **Destinație:** unele trasee `enrich-*` au **gap** sau mapări parțiale față de registry — **necesită reconciliere graf ↔ registry** pe neuronul destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-norm-phone-e164-enrich-email-role-check\``.
