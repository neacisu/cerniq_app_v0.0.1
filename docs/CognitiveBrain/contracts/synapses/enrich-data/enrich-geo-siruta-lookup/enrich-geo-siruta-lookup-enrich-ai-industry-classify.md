# Sinapsă `enrich-geo-siruta-lookup-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-geo-siruta-lookup-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-geo-siruta-lookup/enrich-geo-siruta-lookup-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-geo-siruta-lookup` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-geo-siruta-lookup` | **Contract:** [`../../../neurons/E1/enrich--geo--siruta-lookup.md`](../../../neurons/E1/enrich--geo--siruta-lookup.md). |
| Destinație (graf) | `enrich-ai-industry-classify` | **Contract (neuron):** [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). **ADR:** [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). **Traseu sinapse:** [`../enrich-ai-industry-classify/`](../enrich-ai-industry-classify/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful exportat, **enrich-geo-siruta-lookup** depinde de **enrich-ai-industry-classify**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** leagă nomenclatorul administrativ de clasificarea industriei. Sursa **SIRUTA** are gap de implementare E1 documentat în neuron.

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

- **Runtime (ADR-0001):** sursă fără coadă dedicată vs ramuri AI — vezi neuroni.
- **Semantic (ADR-0002):** familii `enrichment` / `ai-enrichment`.
- **Planificare:** v2 §7 — `enrich-geo-siruta-lookup` → `enrich-ai-industry-classify`.

## Limite și reconcilieri

- Reconciliere `enrich:ai:*` / `ai:*`: ADR `ai-enrichment`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-geo-siruta-lookup-enrich-ai-industry-classify\``.
