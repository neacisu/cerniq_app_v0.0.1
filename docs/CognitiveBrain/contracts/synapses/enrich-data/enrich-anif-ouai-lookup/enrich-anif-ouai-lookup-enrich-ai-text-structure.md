# Sinapsă `enrich-anif-ouai-lookup-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anif-ouai-lookup-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anif-ouai-lookup/enrich-anif-ouai-lookup-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anif-ouai-lookup` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-anif-ouai-lookup` | **Runtime:** **`agri:ouai`** — [`../../../neurons/E1/enrich--anif--ouai-lookup.md`](../../../neurons/E1/enrich--anif--ouai-lookup.md). |
| Destinație (graf) | `enrich-ai-text-structure` | **v2:** `enrich:ai:text-structure`. **Contract:** [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). **ADR:** [`../../../../adr/families/e1/ai-enrichment.md`](../../../../adr/families/e1/ai-enrichment.md). **Apropiere semantică documentată:** `ai:structure:xai` (J1) — fără mapare formală 1:1 în neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf ordonare canonică între **OUAI** și **structurare text (neuron AI în plan)**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime:** sursă `agri:ouai`; destinație — vezi neuron + registry pentru `ai:structure:xai`.
- **Planificare:** dependență structurală export-grounded.

## Limite și reconcilieri

- Etichete `enrich:ai:text-structure` (v2) ≠ nume coadă în worker fără ADR.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anif-ouai-lookup-enrich-ai-text-structure\``.
