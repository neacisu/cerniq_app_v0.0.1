# Sinapsă `graph-full-built-at-geo-weather-correlate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-built-at-geo-weather-correlate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-built-at/graph-full-built-at-geo-weather-correlate.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-built-at` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-full-built-at` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--full--built_at.md`](../../../neurons/E5/graph--full--built_at.md). **v2:** L8410–L8430. |
| Destinație (graf) | `geo-weather-correlate` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--weather--correlate.md`](../../../neurons/E5/geo--weather--correlate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **`dependency`** leagă **`graph-full-built-at`** de **`geo-weather-correlate`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline”. Corelația meteo ↔ entități geografice sau grafice nu este codificată în export; contractul neuron țintă și handlerii stabilesc semantica.

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

| Autoritate | Observație |
| --- | --- |
| **Runtime (ADR-0001)** | Vezi registry și `geo--weather--correlate`; sursă rămâne plan-only pentru coadă dedicată conform neuron. |
| **Semantic (ADR-0002)** | Swimlane / nodeKey din catalog pentru corelație meteo — în contract țintă. |
| **Planificare (export)** | v2 §7 — `graph-full-built-at` → `geo-weather-correlate`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-full-built-at-family.md`](graph-full-built-at-family.md).

## Limite și reconcilieri

- Fără presupuneri despre surse meteo externe sau SLA.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-built-at-geo-weather-correlate\``.
