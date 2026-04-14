# Sinapsă `enrich-anaf-fiscal-status-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anaf-fiscal-status-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anaf-fiscal-status/enrich-anaf-fiscal-status-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anaf-fiscal-status` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-anaf-fiscal-status` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--anaf--fiscal-status.md`](../../../neurons/E1/enrich--anaf--fiscal-status.md). **v2_queue:** `enrich:anaf:fiscal-status`. **Runtime (ADR-0001):** execuție activă documentată prin **D0** / **`enrich:anaf:full`** (`statusFirma`, `anafFiscalSummary`); procesor dedicat absent din `main.ts`; `d1-anaf-fiscal.ts` deprecat — vezi neuron. **Semantic (ADR-0002):** `e1:enrich:anaf-fiscal` în catalog. |
| Destinație (graf) | `e1-enrichment` | Agregat familie **enrichment** E1. [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-anaf-fiscal-status** sub **`e1-enrichment`**. v2: **„specializează familia”**. Starea fiscală din ANAF este detaliată în contractul neuron (D0), nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-anaf-fiscal-status-enrich-ai-contact-parse.md`](enrich-anaf-fiscal-status-enrich-ai-contact-parse.md), [`enrich-anaf-fiscal-status-enrich-ai-industry-classify.md`](enrich-anaf-fiscal-status-enrich-ai-industry-classify.md), [`enrich-anaf-fiscal-status-enrich-ai-text-structure.md`](enrich-anaf-fiscal-status-enrich-ai-text-structure.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `e1-enrichment` agregat vs `ENRICH_ANAF_FISCAL_STATUS` — tensiune în neuron.
- **Semantic (ADR-0002):** catalog `e1:enrich:anaf-fiscal`.
- **Planificare:** v2 §7 — `enrich-anaf-fiscal-status` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anaf-fiscal-status-family\``.
