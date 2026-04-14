# Sinapsă `enrich-geo-geocode-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-geo-geocode-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-geo-geocode/enrich-geo-geocode-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-geo-geocode` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-geo-geocode` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--geo--geocode.md`](../../../neurons/E1/enrich--geo--geocode.md). **v2_queue:** `enrich:geo:geocode`. **Runtime (ADR-0001):** string-ul literal **`enrich:geo:geocode`** **nu** apare în `queue-registry.ts`; execuția documentată este **`geo:geocode:nominatim`** (`GEO_GEOCODE_NOMINATIM`) — **reconciliere graf ↔ registry** în neuron și catalog (`e1:geo:geocode-nominatim`). |
| Destinație (graf) | `e1-enrichment` | Agregat familie **enrichment** E1. [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **geocodare** (`enrich-geo-geocode`) sub **`e1-enrichment`**. v2: **„specializează familia”**. Fluxul Nominatim, rate limiting și enfilearea către zone PostGIS sunt în contractul neuron, nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`enrich-geo-geocode-enrich-ai-contact-parse.md`](enrich-geo-geocode-enrich-ai-contact-parse.md), [`enrich-geo-geocode-enrich-ai-industry-classify.md`](enrich-geo-geocode-enrich-ai-industry-classify.md), [`enrich-geo-geocode-enrich-ai-text-structure.md`](enrich-geo-geocode-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** agregat `e1-enrichment` vs `geo:geocode:nominatim` — vezi neuron.
- **Semantic (ADR-0002):** `e1:geo:geocode-nominatim`.
- **Planificare:** v2 §7 — `enrich-geo-geocode` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs coadă:** nu confunda `enrich-geo-geocode` cu numele cozii din registry fără neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-geo-geocode-family\``.
