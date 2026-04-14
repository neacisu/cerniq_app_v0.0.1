# Sinapsă `enrich-anaf-tva-status-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anaf-tva-status-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anaf-tva-status/enrich-anaf-tva-status-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anaf-tva-status` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-anaf-tva-status` | **Contract:** [`../../../neurons/E1/enrich--anaf--tva-status.md`](../../../neurons/E1/enrich--anaf--tva-status.md). |
| Destinație (graf) | `enrich-ai-contact-parse` | **Contract (neuron):** [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **ADR:** [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). **Traseu sinapse:** [`../enrich-ai-contact-parse/`](../enrich-ai-contact-parse/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful exportat, **enrich-anaf-tva-status** depinde de **enrich-ai-contact-parse**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** D0 TVA vs AI — vezi neuroni.
- **Semantic (ADR-0002):** familii `enrichment` / `ai-enrichment`.
- **Planificare:** v2 §7 — `enrich-anaf-tva-status` → `enrich-ai-contact-parse`.

## Limite și reconcilieri

- Reconciliere `enrich:ai:*` / `ai:*`: ADR `ai-enrichment`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anaf-tva-status-enrich-ai-contact-parse\``.
