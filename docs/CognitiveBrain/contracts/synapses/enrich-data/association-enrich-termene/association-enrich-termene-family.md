# Sinapsă `association-enrich-termene-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-enrich-termene-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-enrich-termene/association-enrich-termene-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-enrich-termene` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `association-enrich-termene` | Traseu în graf; contract neuron: [`../../../neurons/E5/association--enrich--termene.md`](../../../neurons/E5/association--enrich--termene.md). **Triplă autoritate:** v2 **`association:enrich:termene`**; runtime **nu** are același literal în `queue-registry.ts` — vezi neuron (gap / `enrich:termene:*` E1). |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **association-enrich-termene** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`association-enrich-termene-geo-cluster-analyze.md`](association-enrich-termene-geo-cluster-analyze.md), [`association-enrich-termene-geo-delivery-optimize.md`](association-enrich-termene-geo-delivery-optimize.md), [`association-enrich-termene-geo-neighbor-find.md`](association-enrich-termene-geo-neighbor-find.md), [`association-enrich-termene-geo-territory-map.md`](association-enrich-termene-geo-territory-map.md), [`association-enrich-termene-geo-weather-correlate.md`](association-enrich-termene-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; ancorare prin [`association--enrich--termene.md`](../../../neurons/E5/association--enrich--termene.md) și familia ADR.
- **Semantic (ADR-0002):** v2 E5 `graph-community`; catalog pentru acest `nodeKey` — vezi gap în neuron.
- **Planificare:** v2 §7 — `association-enrich-termene` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Muchia [`bronze-ingest-pdf-extractor-association-enrich-termene.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-association-enrich-termene.md) (folder distinct) este intrare spre acest traseu în matrice — nu este manifestul de familie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-enrich-termene-family\``.
