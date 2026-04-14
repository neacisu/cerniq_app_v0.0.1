# Sinapsă `enrich-termene-financials-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-financials-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-financials/enrich-termene-financials-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-financials` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-financials` | Contract: [`../../../neurons/E1/enrich--termene--financials.md`](../../../neurons/E1/enrich--termene--financials.md). **v2_queue:** `enrich:termene:financials`. |
| Destinație (graf) | `enrich-ai-industry-classify` | Contract: [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** plasează traseul financiar Termene (în sensul nodului de graf) în dependență de **enrich-ai-industry-classify**. La nivel de planificare, acest lucru exprimă că pipeline-ul include și clasificare industrială AI; datele financiare ar putea informa sau coexista cu această etapă — **fără** a fi specificat în câmpurile sinapsei din export.

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
| **Runtime (ADR-0001)** | Ambele capete: potriviri indirecte sau absențe în registry — contracte neuron. |
| **Semantic (ADR-0002)** | E1; verificare catalog unde există intrări. |
| **Planificare** | v2 §7 — topologie `dependency`. |

## Limite și reconcilieri

- **Export-grounded:** fără inventarea unui flux de date bilanț → LLM industry fără dovadă din altă sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-financials-enrich-ai-industry-classify\``.
