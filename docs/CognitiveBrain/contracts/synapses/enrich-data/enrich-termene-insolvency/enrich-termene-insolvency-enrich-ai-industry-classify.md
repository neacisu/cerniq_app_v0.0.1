# Sinapsă `enrich-termene-insolvency-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-insolvency-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-insolvency/enrich-termene-insolvency-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-insolvency` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-insolvency` | Contract: [`../../../neurons/E1/enrich--termene--insolvency.md`](../../../neurons/E1/enrich--termene--insolvency.md). **v2_queue:** `enrich:termene:insolvency`. |
| Destinație (graf) | `enrich-ai-industry-classify` | Contract: [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** reflectă ordonarea în **planificare** între traseul «insolvency» și **enrich-ai-industry-classify**. Interpretare: modelul de graf include și pasul AI de clasificare industrială în același lanț cognitiv de îmbogățire; detaliile operaționale depășesc exportul sinapsei.

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
| **Runtime (ADR-0001)** | Vezi distribuirea semnalului de insolvență în contractul sursă; pentru țintă vezi absența literalului în registry. |
| **Semantic (ADR-0002)** | E1 — instrumentare conform ADR familii. |
| **Planificare** | v2 §7 — capetele și `dependency` ca în export. |

## Limite și reconcilieri

- Fără completări privind politica de retry sau clase de siguranță; tabelul de statusuri reflectă exportul.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-insolvency-enrich-ai-industry-classify\``.
