# Sinapsă `silver-merge-company-silver-quality-completeness`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-merge-company-silver-quality-completeness` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-merge-company/silver-merge-company-silver-quality-completeness.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-merge-company` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-merge-company` | **Contract:** [`../../../neurons/E1/silver--merge--company.md`](../../../neurons/E1/silver--merge--company.md). **Runtime (ADR-0001):** gap pentru literal v2 — vezi neuron (`pipeline:promote:bronze-silver`, `ai:merge:xai`). |
| Destinație (graf) | `silver-quality-completeness` | **Contract:** [`../../../neurons/E1/silver--quality--completeness.md`](../../../neurons/E1/silver--quality--completeness.md). E1 — vezi [`../../../../adr/families/e1/merge.md`](../../../../adr/families/e1/merge.md) și contractul neuronului țintă. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **silver-merge-company** are dependență sintactică față de **silver-quality-completeness**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `silver-merge-company` → `silver-quality-completeness`.
- **Runtime (ADR-0001):** sursă — vezi gap în neuron; ținta — vezi neuronul de calitate.
- **Semantic (ADR-0002):** E1 — vezi catalog pentru `nodeKey`-ul neuronului țintă.

## Limite și reconcilieri

- **Sursă:** reconciliere obligatorie graf ↔ registry — vezi `silver--merge--company.md`.
- **Țintă:** verificare în contractul `silver--quality--completeness.md` pentru mapare cozi / span.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-merge-company-silver-quality-completeness\``.
