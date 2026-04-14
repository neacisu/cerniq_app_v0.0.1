# Sinapsă `enrich-ai-industry-classify-silver-dedup-entity-resolve`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-ai-industry-classify-silver-dedup-entity-resolve` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-ai-industry-classify/enrich-ai-industry-classify-silver-dedup-entity-resolve.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-ai-industry-classify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-ai-industry-classify` | **Contract:** [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). **Runtime (ADR-0001):** v2 `enrich:ai:industry-classify` fără coadă literală în registry — vezi contract și ADR ai-enrichment. |
| Destinație (graf) | `silver-dedup-entity-resolve` | **Contract (neuron):** [`../../../neurons/E1/silver--dedup--entity-resolve.md`](../../../neurons/E1/silver--dedup--entity-resolve.md). **Traseu sinapse:** [`../silver-dedup-entity-resolve/`](../silver-dedup-entity-resolve/). **Runtime:** vezi contractul țintă (`dedup:exact` vs etichetă v2). **ADR:** [`../../../adr/families/e1/dedup.md`](../../../adr/families/e1/dedup.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **enrich-ai-industry-classify** depinde în planificare de **rezoluție entitate / deduplicare** (`silver-dedup-entity-resolve`). v2: **„sinapsă canonică de pipeline”**; exportul nu leagă explicit CAEN de chei de dedup.

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

- **Runtime (ADR-0001):** decalaj `enrich:ai:*` și `silver:dedup:*` vs cozi reale — vezi ambele contracte.
- **Semantic (ADR-0002):** clasificare industrie (graf) ↔ dedup E1.
- **Planificare:** v2 §7 — `enrich-ai-industry-classify` → `silver-dedup-entity-resolve`.

## Limite și reconcilieri

- Interpretarea „industrie” + „entitate unică” în CRM este în cod; sinapsa doar înregistrează dependența din graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-ai-industry-classify-silver-dedup-entity-resolve\``.
