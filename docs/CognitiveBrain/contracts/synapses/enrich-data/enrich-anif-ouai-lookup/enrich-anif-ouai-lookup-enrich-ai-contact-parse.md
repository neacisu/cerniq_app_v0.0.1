# Sinapsă `enrich-anif-ouai-lookup-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anif-ouai-lookup-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anif-ouai-lookup/enrich-anif-ouai-lookup-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anif-ouai-lookup` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-anif-ouai-lookup` | **v2:** `enrich:anif:ouai-lookup`. **Runtime:** **`agri:ouai`** — [`../../../neurons/E1/enrich--anif--ouai-lookup.md`](../../../neurons/E1/enrich--anif--ouai-lookup.md). |
| Destinație (graf) | `enrich-ai-contact-parse` | **v2 / Matrix:** `enrich:ai:contact-parse`. **Contract:** [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **ADR:** [`../../../../adr/families/e1/ai-enrichment.md`](../../../../adr/families/e1/ai-enrichment.md) — prefix `enrich:ai:*` vs cozi `ai:*`; fără coadă literală `enrich:ai:contact-parse` în registry la auditul din neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că traseul **OUAI** este ordonat canonic față de neuronul generic **AI contact-parse** din familia `ai-enrichment`. v2: **„sinapsă canonică de pipeline”** — fără schema payload sau lanțul efectiv între `agri:ouai` și ramurile AI documentate în ADR.

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

- **Runtime:** sursă pe **`agri:ouai`**; țintă — reconciliere `enrich:ai:contact-parse` ↔ `ai:structure:xai` (apropiere semantică în neuron, nu identitate forțată).
- **Planificare:** topologie `enrichment` → `ai-enrichment` în export.

## Limite și reconcilieri

- Două familii v2 diferite (`enrichment` vs `ai-enrichment`) — muchia este declarativă în graf; execuția verifică `p1-orchestrate` și workeri.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anif-ouai-lookup-enrich-ai-contact-parse\``.
