# Sinapsă `enrich-anaf-address-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anaf-address-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anaf-address/enrich-anaf-address-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anaf-address` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-anaf-address` | **Contract:** [`../../../neurons/E1/enrich--anaf--address.md`](../../../neurons/E1/enrich--anaf--address.md). **Runtime:** vezi D0 / `enrich:anaf:full` în același contract. |
| Destinație (graf) | `enrich-ai-contact-parse` | **Contract (neuron):** [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **ADR:** [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md) — prefix `enrich:ai:*` vs cozi `ai:*`. **Traseu sinapse:** [`../enrich-ai-contact-parse/`](../enrich-ai-contact-parse/). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful exportat, traseul **enrich-anaf-address** are o dependență de planificare față de **enrich-ai-contact-parse**. v2: **„sinapsă canonică de pipeline”**; nu precizează dacă muchia reflectă precedență operațională, date partajate sau doar aliniere la modelul de plan. Interpretarea **Source → Target** rămâne **structurală**; mecanismul concret (enqueue, payload) **nu** este în registrul sinapsei.

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

- **Runtime (ADR-0001):** capătul AI **nu** are coadă literală `enrich:ai:contact-parse` în registry la auditul din neuron; apropiere semantică documentată spre **`ai:structure:xai`** — vezi neuron.
- **Semantic (ADR-0002):** `ai-enrichment` vs `enrichment` — familii distincte în v2.
- **Planificare:** v2 §7 — `enrich-anaf-address` → `enrich-ai-contact-parse`.

## Limite și reconcilieri

- **Risc:** validitate topologică în graf **fără** mapare 1:1 între etichete și cozi; reconciliere obligatorie prin neuroni + ADR `ai-enrichment`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anaf-address-enrich-ai-contact-parse\``.
