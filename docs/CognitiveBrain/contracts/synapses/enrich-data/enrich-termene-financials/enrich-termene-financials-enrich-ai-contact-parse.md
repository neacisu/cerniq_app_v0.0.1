# Sinapsă `enrich-termene-financials-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-financials-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-financials/enrich-termene-financials-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-financials` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-financials` | Contract: [`../../../neurons/E1/enrich--termene--financials.md`](../../../neurons/E1/enrich--termene--financials.md). **v2_queue:** `enrich:termene:financials`. |
| Destinație (graf) | `enrich-ai-contact-parse` | Contract: [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). ADR AI: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența leagă în **planificare** traseul «financials» (indicatori financiari în modelul v2) de **enrich-ai-contact-parse**. Interpretare conservatoare: fluxul cognitiv exportat include atât îmbogățirea financiară Termene (conform etichetei de nod), cât și pași AI de contact; **fără** detalii de date transmise între noduri în registrul sinapsei.

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
| **Runtime (ADR-0001)** | Sursă: vezi unificarea cu `enrich:termene:balance` în contract neuron. Pentru țintă: fără literal `enrich:ai:contact-parse` în registry. |
| **Semantic (ADR-0002)** | E1 — familii v2 `enrichment` / `ai-enrichment`. |
| **Planificare** | v2 §7 — `dependency` explicită. |

## Limite și reconcilieri

- Nu se afirmă că «financials» și «balance-sheet» generează job-uri distincte în runtime; vezi contractele neuron Termene.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-financials-enrich-ai-contact-parse\``.
