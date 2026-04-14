# Sinapsă `association-pdf-ingest-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-pdf-ingest-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-pdf-ingest/association-pdf-ingest-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-pdf-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `association-pdf-ingest` | Traseu în graf; contract neuron: [`../../../neurons/E5/association--pdf--ingest.md`](../../../neurons/E5/association--pdf--ingest.md). **Triplă autoritate:** v2 **`association:pdf:ingest`**; runtime **fără** literal același în registry — vezi neuron (gap; posibil pipeline PDF sub alt contract). |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **association-pdf-ingest** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`association-pdf-ingest-geo-cluster-analyze.md`](association-pdf-ingest-geo-cluster-analyze.md), [`association-pdf-ingest-geo-delivery-optimize.md`](association-pdf-ingest-geo-delivery-optimize.md), [`association-pdf-ingest-geo-neighbor-find.md`](association-pdf-ingest-geo-neighbor-find.md), [`association-pdf-ingest-geo-territory-map.md`](association-pdf-ingest-geo-territory-map.md), [`association-pdf-ingest-geo-weather-correlate.md`](association-pdf-ingest-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; ancorare prin [`association--pdf--ingest.md`](../../../neurons/E5/association--pdf--ingest.md) în limitele documentate acolo.
- **Semantic (ADR-0002):** v2 E5 `graph-community` — vezi gap catalog în neuron.
- **Planificare:** v2 §7 — `association-pdf-ingest` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Intrarea [`bronze-ingest-pdf-extractor-association-pdf-ingest.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-association-pdf-ingest.md) este pe alt traseu — nu este manifestul de familie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-pdf-ingest-family\``.
