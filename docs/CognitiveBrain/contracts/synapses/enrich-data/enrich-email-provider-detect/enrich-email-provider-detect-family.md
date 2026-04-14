# Sinapsă `enrich-email-provider-detect-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-email-provider-detect-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-email-provider-detect/enrich-email-provider-detect-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-email-provider-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-email-provider-detect` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--email--provider-detect.md`](../../../neurons/E1/enrich--email--provider-detect.md). **v2_queue:** `enrich:email:provider-detect`. **Runtime (ADR-0001):** la audit **nu** există coadă BullMQ dedicată cu acest șir; semnale de tip furnizor apar în fluxurile **`discover:email:hunter-verify`** / **`discover:email:zerobounce`** — vezi neuron și `NEURON_MATRIX.csv`. |
| Destinație (graf) | `e1-enrichment` | Agregat familie **enrichment** E1. [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **detectare furnizor email** (`enrich-email-provider-detect`) sub **`e1-enrichment`**. v2: **„specializează familia”**. Modul în care indicatorii de furnizor sunt produși în cod (Hunter / ZeroBounce) este în contractul neuron, nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-email-provider-detect-enrich-ai-contact-parse.md`](enrich-email-provider-detect-enrich-ai-contact-parse.md), [`enrich-email-provider-detect-enrich-ai-industry-classify.md`](enrich-email-provider-detect-enrich-ai-industry-classify.md), [`enrich-email-provider-detect-enrich-ai-text-structure.md`](enrich-email-provider-detect-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** agregat `e1-enrichment` vs cozi concrete de verificare email — vezi neuron.
- **Semantic (ADR-0002):** `e1:discover:email-hunter-verify`, `e1:discover:email-zerobounce` (catalog; potriviri parțiale în matrice).
- **Planificare:** v2 §7 — `enrich-email-provider-detect` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Eticheta graf **nu** implică un worker izolat «doar provider-detect» — dovadă în contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-email-provider-detect-family\``.
