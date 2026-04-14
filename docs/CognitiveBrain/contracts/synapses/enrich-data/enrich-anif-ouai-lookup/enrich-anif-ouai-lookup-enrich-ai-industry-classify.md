# Sinapsă `enrich-anif-ouai-lookup-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anif-ouai-lookup-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anif-ouai-lookup/enrich-anif-ouai-lookup-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anif-ouai-lookup` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-anif-ouai-lookup` | **Runtime:** **`agri:ouai`** — [`../../../neurons/E1/enrich--anif--ouai-lookup.md`](../../../neurons/E1/enrich--anif--ouai-lookup.md). |
| Destinație (graf) | `enrich-ai-industry-classify` | **v2:** `enrich:ai:industry-classify`. **Contract:** [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). **ADR:** [`../../../../adr/families/e1/ai-enrichment.md`](../../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf ordonare canonică între traseul **OUAI** și **clasificare industrie (etichetă AI în plan)**. v2: **„sinapsă canonică de pipeline”**. În cod, semantica „industrie” apare fragmentat (ex. J1 / `agri:culturi`) — vezi contractul țintă; registrul sinapsei nu fixează maparea.

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

- **Runtime / semantic:** sursă non-AI OUAI; țintă AI — fără coadă v2 literală în registry.
- **Planificare:** v2 §7.

## Limite și reconcilieri

- Nu confundați slug graf cu un singur `nodeKey` pentru „industry” fără ADR + neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anif-ouai-lookup-enrich-ai-industry-classify\``.
