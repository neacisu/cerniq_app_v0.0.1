# Sinapsă `enrich-termene-court-cases-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-court-cases-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-court-cases/enrich-termene-court-cases-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-court-cases` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-court-cases` | Contract: [`../../../neurons/E1/enrich--termene--court-cases.md`](../../../neurons/E1/enrich--termene--court-cases.md). **v2_queue:** `enrich:termene:court-cases`. |
| Destinație (graf) | `enrich-ai-text-structure` | Contract: [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). **v2_queue:** `enrich:ai:text-structure`. ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența **`dependency`** reflectă faptul că, în planul exportat, traseul dosarelor Termene este ordonat în raport cu **enrich-ai-text-structure** (structurare AI a conținutului neuniform). Nu se afirmă că fiecare job dosar declanșează automat structurare; doar că **graful** include această relație.

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
| **Runtime (ADR-0001)** | Potrivire semantică posibilă spre `ai:structure:xai` pentru țintă — doar unde documentează contractul neuron, nu aici. |
| **Semantic (ADR-0002)** | E1, familii `enrichment` / `ai-enrichment`. |
| **Planificare** | v2 §7 — muchie canonică de pipeline. |

## Limite și reconcilieri

- Orice descriere a conținutului dosarului ca intrare LLM depășește câmpurile exportului sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-court-cases-enrich-ai-text-structure\``.
