# Sinapsă `geo-neighbor-find-nurturing-engagement-track`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-neighbor-find-nurturing-engagement-track` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-neighbor-find/geo-neighbor-find-nurturing-engagement-track.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-neighbor-find` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `geo-neighbor-find` | **Contract:** [`../../../neurons/E5/geo--neighbor--find.md`](../../../neurons/E5/geo--neighbor--find.md). **Runtime:** **`geo:neighbor:identify`** — vezi neuron față de `geo:neighbor:find` din v2. |
| Destinație (graf) | `nurturing-engagement-track` | **Contract:** [`../../../neurons/E5/nurturing--engagement--track.md`](../../../neurons/E5/nurturing--engagement--track.md). Context: [`../../../../adr/families/e5/lifecycle.md`](../../../../adr/families/e5/lifecycle.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **geo-neighbor-find** are dependență sintactică față de **nurturing-engagement-track**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `geo-neighbor-find` → `nurturing-engagement-track`.
- **Runtime / semantic:** vezi neuronii; ținta **`nurturing:engagement:track`** are **gap** de coadă literală în registry — vezi contractul destinație.

## Limite și reconcilieri

- Mapare operațională pentru destinație: vezi [`../../../neurons/E5/nurturing--engagement--track.md`](../../../neurons/E5/nurturing--engagement--track.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-neighbor-find-nurturing-engagement-track\``.
