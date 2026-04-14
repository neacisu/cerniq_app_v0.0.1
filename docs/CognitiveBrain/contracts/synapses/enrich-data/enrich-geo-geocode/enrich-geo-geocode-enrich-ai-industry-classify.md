# Sinapsă `enrich-geo-geocode-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-geo-geocode-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-geo-geocode/enrich-geo-geocode-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-geo-geocode` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-geo-geocode` | **Contract:** [`../../../neurons/E1/enrich--geo--geocode.md`](../../../neurons/E1/enrich--geo--geocode.md). |
| Destinație (graf) | `enrich-ai-industry-classify` | **Contract (neuron):** [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). **ADR:** [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). **Traseu sinapse:** [`../enrich-ai-industry-classify/`](../enrich-ai-industry-classify/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful exportat, **enrich-geo-geocode** depinde de **enrich-ai-industry-classify**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** leagă geocodarea de etichetele de industrie.

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

- **Runtime (ADR-0001):** geo vs ramuri AI — vezi neuroni.
- **Semantic (ADR-0002):** familii `enrichment` / `ai-enrichment`.
- **Planificare:** v2 §7 — `enrich-geo-geocode` → `enrich-ai-industry-classify`.

## Limite și reconcilieri

- Reconciliere `enrich:ai:*` / `ai:*`: ADR `ai-enrichment`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-geo-geocode-enrich-ai-industry-classify\``.
