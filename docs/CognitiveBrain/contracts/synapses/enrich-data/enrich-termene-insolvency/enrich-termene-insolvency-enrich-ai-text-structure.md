# Sinapsă `enrich-termene-insolvency-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-insolvency-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-insolvency/enrich-termene-insolvency-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-insolvency` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-insolvency` | Contract: [`../../../neurons/E1/enrich--termene--insolvency.md`](../../../neurons/E1/enrich--termene--insolvency.md). **v2_queue:** `enrich:termene:insolvency`. |
| Destinație (graf) | `enrich-ai-text-structure` | Contract: [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența **`dependency`** conectează traseul «insolvency» de **enrich-ai-text-structure** în planul exportat: structurarea AI este parte din același desen topologic cu nodul de insolvență. Nu se afirmă că fiecare eveniment de insolvență declanșează structurare; relația este **strict** cea din câmpurile sinapsei v2.

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Potrivire posibilă a țintei spre `ai:structure:xai` numai unde documentează contractul neuron destinație. |
| **Semantic (ADR-0002)** | E1. |
| **Planificare** | v2 §7 — muchie canonică. |

## Limite și reconcilieri

- **Graf vs runtime:** nodul «insolvency» nu echivalează cu un worker singular — vezi contract sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-insolvency-enrich-ai-text-structure\``.
