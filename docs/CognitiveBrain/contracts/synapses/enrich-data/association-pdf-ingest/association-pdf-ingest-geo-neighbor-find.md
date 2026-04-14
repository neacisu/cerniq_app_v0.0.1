# Sinapsă `association-pdf-ingest-geo-neighbor-find`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-pdf-ingest-geo-neighbor-find` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-pdf-ingest/association-pdf-ingest-geo-neighbor-find.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-pdf-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `association-pdf-ingest` | **Contract:** [`../../../neurons/E5/association--pdf--ingest.md`](../../../neurons/E5/association--pdf--ingest.md). **Runtime (ADR-0001):** gap nume coadă — vezi neuron. |
| Destinație (graf) | `geo-neighbor-find` | **Contract:** [`../../../neurons/E5/geo--neighbor--find.md`](../../../neurons/E5/geo--neighbor--find.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **association-pdf-ingest** are dependență sintactică față de nodul **geo-neighbor-find**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie criterii de vecinătate.

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

- **Planificare:** v2 §7 — `association-pdf-ingest` → `geo-neighbor-find`.
- **Runtime (ADR-0001):** vezi neuroni sursă și țintă.
- **Semantic (ADR-0002):** E5 geo — vezi neuron țintă.

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe capătul sursă — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-pdf-ingest-geo-neighbor-find\``.
