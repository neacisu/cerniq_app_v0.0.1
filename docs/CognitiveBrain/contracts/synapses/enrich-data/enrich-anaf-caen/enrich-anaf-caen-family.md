# Sinapsă `enrich-anaf-caen-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anaf-caen-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anaf-caen/enrich-anaf-caen-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anaf-caen` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-anaf-caen` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--anaf--caen.md`](../../../neurons/E1/enrich--anaf--caen.md). **v2_queue:** `enrich:anaf:caen`. **Runtime (ADR-0001):** catalog poate declara coadă; **execuție activă** pentru CAEN este documentată în **D0** pe **`enrich:anaf:full`** — fără procesor dedicat `enrich:anaf:caen` în `main.ts` la auditul din neuron. **Semantic (ADR-0002):** `e1:enrich:anaf-caen` în catalog vs `e1:enrich:anaf-full-fetch` pentru D0 — vezi neuron. |
| Destinație (graf) | `e1-enrichment` | Agregat familie **enrichment** E1. [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-anaf-caen** sub **`e1-enrichment`**. v2: **„specializează familia”**. Datele CAEN (`codCaen`, `isAgricultural`, metadata `anafCaen`) sunt extrase în fluxul D0 conform contractului neuron, nu prin câmpurile acestei sinapse.

## Sinapse dependență în același traseu

[`enrich-anaf-caen-enrich-ai-contact-parse.md`](enrich-anaf-caen-enrich-ai-contact-parse.md), [`enrich-anaf-caen-enrich-ai-industry-classify.md`](enrich-anaf-caen-enrich-ai-industry-classify.md), [`enrich-anaf-caen-enrich-ai-text-structure.md`](enrich-anaf-caen-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` agregat; cozi concrete în neuron + registry.
- **Semantic (ADR-0002):** enrichment ANAF — catalog.
- **Planificare:** v2 §7 — `enrich-anaf-caen` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Prezența simbolului `ENRICH_ANAF_CAEN` în registry **nu** înlocuiește dovada procesorului — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anaf-caen-family\``.
