# Sinapsă `enrich-ai-text-structure-silver-dedup-entity-resolve`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-ai-text-structure-silver-dedup-entity-resolve` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-ai-text-structure/enrich-ai-text-structure-silver-dedup-entity-resolve.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-ai-text-structure` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-ai-text-structure` | **Contract:** [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). **Runtime (ADR-0001):** v2 `enrich:ai:text-structure` fără coadă literală în registry — vezi contract și ADR ai-enrichment. |
| Destinație (graf) | `silver-dedup-entity-resolve` | **Contract (neuron):** [`../../../neurons/E1/silver--dedup--entity-resolve.md`](../../../neurons/E1/silver--dedup--entity-resolve.md). **Traseu sinapse:** [`../silver-dedup-entity-resolve/`](../silver-dedup-entity-resolve/). **Runtime:** vezi contract destinație. **ADR:** [`../../../adr/families/e1/dedup.md`](../../../adr/families/e1/dedup.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **enrich-ai-text-structure** depinde în planificare de **rezoluție entitate / deduplicare** (`silver-dedup-entity-resolve`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum structura JSON influențează cheile de dedup.

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

- **Runtime (ADR-0001):** vezi contracte sursă și destinație — ambele cu decalaj v2 vs registry.
- **Semantic (ADR-0002):** structurare AI (graf) ↔ dedup E1.
- **Planificare:** v2 §7 — `enrich-ai-text-structure` → `silver-dedup-entity-resolve`.

## Limite și reconcilieri

- Legătura planificată nu înlocuiește politica HITL din J1 dacă e cazul — vezi contract sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-ai-text-structure-silver-dedup-entity-resolve\``.
