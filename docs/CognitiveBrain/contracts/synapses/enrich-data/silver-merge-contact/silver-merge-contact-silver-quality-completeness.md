# Sinapsă `silver-merge-contact-silver-quality-completeness`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-merge-contact-silver-quality-completeness` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-merge-contact/silver-merge-contact-silver-quality-completeness.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-merge-contact` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-merge-contact` | **Contract:** [`../../../neurons/E1/silver--merge--contact.md`](../../../neurons/E1/silver--merge--contact.md). **Runtime (ADR-0001):** v2 `silver:merge:contact` — **gap** coadă dedicată; vezi neuron. |
| Destinație (graf) | `silver-quality-completeness` | **Contract:** [`../../../neurons/E1/silver--quality--completeness.md`](../../../neurons/E1/silver--quality--completeness.md). Familie **quality** — vezi [`../../../../adr/families/e1/quality.md`](../../../../adr/families/e1/quality.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **silver-merge-contact** are dependență sintactică față de nodul **silver-quality-completeness**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `silver-merge-contact` → `silver-quality-completeness`.
- **Runtime (ADR-0001):** sursă — vezi gap în neuron; ținta — `score:completeness` / `e1:score:completeness` în contractul țintă.
- **Semantic (ADR-0002):** E1 — familii `merge` și `quality`.

## Limite și reconcilieri

- **Sursă:** reconciliere obligatorie **graf ↔ registry** pentru merge contact.
- **Destinație (reconciliere):** denumiri v2 vs cozi runtime (`silver:quality:*` vs `score:*`) — vezi neuronul țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-merge-contact-silver-quality-completeness\``.
