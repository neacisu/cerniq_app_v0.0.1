# Sinapsă `association-members-link-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `association-members-link-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/association-members-link/association-members-link-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `association-members-link` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `association-members-link` | Traseu în graf; contract neuron: [`../../../neurons/E5/association--members--link.md`](../../../neurons/E5/association--members--link.md). **Triplă autoritate:** v2 **`association:members:link`**; runtime **`association:member:match`** — vezi neuron (inclusiv bootstrap G41). |
| Destinație (graf) | `e5-graph-community` | Agregat **familie graph-community E5** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **association-members-link** sub agregatul **`e5-graph-community`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`association-members-link-geo-cluster-analyze.md`](association-members-link-geo-cluster-analyze.md), [`association-members-link-geo-delivery-optimize.md`](association-members-link-geo-delivery-optimize.md), [`association-members-link-geo-neighbor-find.md`](association-members-link-geo-neighbor-find.md), [`association-members-link-geo-territory-map.md`](association-members-link-geo-territory-map.md), [`association-members-link-geo-weather-correlate.md`](association-members-link-geo-weather-correlate.md).

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

- **Runtime (ADR-0001):** `e5-graph-community` nu este cheie în `QUEUES`; ancorare prin [`association--members--link.md`](../../../neurons/E5/association--members--link.md).
- **Semantic (ADR-0002):** `e5:association:member-match` — vezi neuron și catalog.
- **Planificare:** v2 §7 — `association-members-link` → `e5-graph-community`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Intrarea [`bronze-ingest-pdf-extractor-association-members-link.md`](../bronze-ingest-pdf-extractor/bronze-ingest-pdf-extractor-association-members-link.md) este pe alt traseu — nu este manifestul de familie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`association-members-link-family\``.
