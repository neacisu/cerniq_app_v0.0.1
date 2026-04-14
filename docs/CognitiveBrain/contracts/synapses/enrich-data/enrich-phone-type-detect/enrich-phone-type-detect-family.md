# Sinapsă `enrich-phone-type-detect-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-phone-type-detect-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-phone-type-detect/enrich-phone-type-detect-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-phone-type-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-phone-type-detect` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--phone--type-detect.md`](../../../neurons/E1/enrich--phone--type-detect.md). **Triplă autoritate:** v2 **`enrich:phone:type-detect`**; la audit neuron **fără** coadă dedicată 1:1 în registry — semnale parțiale în **`enrich:phone:carrier`** / **`enrich:phone:hlr`**; vezi neuron și `NEURON_MATRIX.csv` (semantic parțial). |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-phone-type-detect** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`enrich-phone-type-detect-enrich-ai-contact-parse.md`](enrich-phone-type-detect-enrich-ai-contact-parse.md), [`enrich-phone-type-detect-enrich-ai-industry-classify.md`](enrich-phone-type-detect-enrich-ai-industry-classify.md), [`enrich-phone-type-detect-enrich-ai-text-structure.md`](enrich-phone-type-detect-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; **nu** există literal `enrich:phone:type-detect` în registry la audit neuron — vezi contractul neuronului și cozile `enrich:phone:carrier` / `enrich:phone:hlr` pentru câmpuri derivate.
- **Semantic (ADR-0002):** CSV indică legături parțiale `e1:enrich:phone-carrier|e1:enrich:phone-hlr` — **nu** înlocuiesc un `nodeKey` izolat pentru «type-detect»; vezi `NEURON_MATRIX.csv`.
- **Planificare:** v2 §7 — `enrich-phone-type-detect` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Gap planificare vs runtime:** nod graf dedicat **type-detect** fără procesor/coadă cu același nume — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-phone-type-detect-family\``.
