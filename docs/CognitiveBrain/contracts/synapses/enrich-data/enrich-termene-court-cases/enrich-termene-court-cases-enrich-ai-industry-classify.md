# Sinapsă `enrich-termene-court-cases-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-court-cases-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-court-cases/enrich-termene-court-cases-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-court-cases` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-court-cases` | Contract: [`../../../neurons/E1/enrich--termene--court-cases.md`](../../../neurons/E1/enrich--termene--court-cases.md). **v2_queue:** `enrich:termene:court-cases`. |
| Destinație (graf) | `enrich-ai-industry-classify` | Contract: [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). **v2_queue:** `enrich:ai:industry-classify`. ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** plasează traseul dosarelor Termene în dependență față de **enrich-ai-industry-classify** în modelul de planificare exportat. Interpretare conservatoare: planificatorul prevede că fluxul include și pasul AI de clasificare industrială; ordinea efectivă și datele transmise **nu** sunt codificate în sinapsă.

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
| **Runtime (ADR-0001)** | Vezi maparea sursei în contractul `enrich--termene--court-cases`. Pentru țintă: lipsă literal `enrich:ai:industry-classify` în registry — vezi contract neuron. |
| **Semantic (ADR-0002)** | Instrumentare E1 conform familiilor din v2. |
| **Planificare** | v2 §7 — sursă / țintă / `dependency` ca mai sus. |

## Limite și reconcilieri

- Fără completări despre retry sau safety; statusurile din tabel reflectă exportul.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-court-cases-enrich-ai-industry-classify\``.
