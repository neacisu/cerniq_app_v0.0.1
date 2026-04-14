# Sinapsă `enrich-phone-carrier-detect-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-phone-carrier-detect-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-phone-carrier-detect/enrich-phone-carrier-detect-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-phone-carrier-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-phone-carrier-detect` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--phone--carrier-detect.md`](../../../neurons/E1/enrich--phone--carrier-detect.md). **Triplă autoritate:** v2 **`enrich:phone:carrier-detect`**; runtime **`enrich:phone:carrier`** — vezi neuron (`ENRICH_PHONE_CARRIER`). |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-phone-carrier-detect** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-phone-carrier-detect-enrich-ai-contact-parse.md`](enrich-phone-carrier-detect-enrich-ai-contact-parse.md), [`enrich-phone-carrier-detect-enrich-ai-industry-classify.md`](enrich-phone-carrier-detect-enrich-ai-industry-classify.md), [`enrich-phone-carrier-detect-enrich-ai-text-structure.md`](enrich-phone-carrier-detect-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; coada documentată pentru capabilitate: **`enrich:phone:carrier`** — vezi neuron și `queue-registry.ts`.
- **Semantic (ADR-0002):** `e1:enrich:phone-carrier` — vezi neuron.
- **Planificare:** v2 §7 — `enrich-phone-carrier-detect` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Sufix graf **`-detect`** vs șir coadă **`enrich:phone:carrier`**: **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-phone-carrier-detect-family\``.
