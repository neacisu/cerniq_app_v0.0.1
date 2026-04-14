# Sinapsă `silver-dedup-fuzzy-match-silver-merge-contact`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-dedup-fuzzy-match-silver-merge-contact` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-dedup-fuzzy-match/silver-dedup-fuzzy-match-silver-merge-contact.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-dedup-fuzzy-match` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-dedup-fuzzy-match` | **Contract:** [`../../../neurons/E1/silver--dedup--fuzzy-match.md`](../../../neurons/E1/silver--dedup--fuzzy-match.md). **Runtime (ADR-0001):** **`dedup:fuzzy`** — vezi neuron. |
| Destinație (graf) | `silver-merge-contact` | **Contract:** [`../../../neurons/E1/silver--merge--contact.md`](../../../neurons/E1/silver--merge--contact.md). **Runtime:** gap pentru literal v2 — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **silver-dedup-fuzzy-match** are dependență sintactică față de **silver-merge-contact**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `silver-dedup-fuzzy-match` → `silver-merge-contact`.
- **Runtime (ADR-0001):** sursă — `dedup:fuzzy`; destinație — gap — vezi neuronii.
- **Semantic (ADR-0002):** E1 — vezi `NEURON_MATRIX.csv`.

## Limite și reconcilieri

- **Țintă:** fără `nodeKey` operațional dedicat la audit neuron — vezi contractul destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-dedup-fuzzy-match-silver-merge-contact\``.
