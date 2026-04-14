# Sinapsă `enrich-termene-risk-score-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-risk-score-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-risk-score/enrich-termene-risk-score-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-risk-score` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-risk-score` | Contract: [`../../../neurons/E1/enrich--termene--risk-score.md`](../../../neurons/E1/enrich--termene--risk-score.md). **v2_queue:** `enrich:termene:risk-score`. |
| Destinație (graf) | `enrich-ai-contact-parse` | Contract: [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența leagă în **graf** traseul scorului de risc Termene de **enrich-ai-contact-parse**. În planificare, fluxul include atât obținerea/normalizarea riscului (conform nodului sursă), cât și extracția de contact prin AI; **fără** schemă de mesaj din export.

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
| **Runtime (ADR-0001)** | Sursă: `enrich:termene:risk` în registry vs `risk-score` v2. Pentru țintă: fără literal `enrich:ai:contact-parse` în registry. |
| **Semantic (ADR-0002)** | E1 — familii `enrichment` / `ai-enrichment`. |
| **Planificare** | v2 §7 — `dependency`. |

## Limite și reconcilieri

- Orice corelație între câmpurile de risc și câmpurile de contact extrase prin AI trebuie dovedită în cod, nu presupusă din sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-risk-score-enrich-ai-contact-parse\``.
