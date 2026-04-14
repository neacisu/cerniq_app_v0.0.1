# Sinapsă `geo-territory-map-nurturing-engagement-track`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-territory-map-nurturing-engagement-track` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-territory-map/geo-territory-map-nurturing-engagement-track.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-territory-map` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `geo-territory-map` | **Contract:** [`../../../neurons/E5/geo--territory--map.md`](../../../neurons/E5/geo--territory--map.md). **Runtime (ADR-0001):** `e5:geo:territory-calculate` — vezi neuron. |
| Destinație (graf) | `nurturing-engagement-track` | **Contract:** [`../../../neurons/E5/nurturing--engagement--track.md`](../../../neurons/E5/nurturing--engagement--track.md). **Semantic:** `NEURON_MATRIX.csv` — `e5:feedback:satisfaction-track` (analog raportat); **fără** coadă literală v2 în registry — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **geo-territory-map** are dependență sintactică față de **nurturing-engagement-track**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri. În lanț de business, poziționare teritoriu poate alimenta context pentru nurturing/feedback — doar ca structură de graf, fără detaliu operațional din export.

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

- **Planificare:** v2 §7 — `geo-territory-map` → `nurturing-engagement-track`.
- **Runtime (ADR-0001):** ambele capete — vezi contractele neuronilor; reconciliere posibilă între etichete graf și cozi.
- **Semantic (ADR-0002):** E5 geo vs E5 lifecycle — vezi ADR [`geo`](../../../../adr/families/e5/geo.md) și [`lifecycle`](../../../../adr/families/e5/lifecycle.md).

## Limite și reconcilieri

- **Destinație:** gap-uri runtime documentate în neuron — **necesită reconciliere graf ↔ registry**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-territory-map-nurturing-engagement-track\``.
