# Sinapsă `geo-territory-map-nurturing-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `geo-territory-map-nurturing-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/geo-territory-map/geo-territory-map-nurturing-state-transition.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `geo-territory-map` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `geo-territory-map` | **Contract:** [`../../../neurons/E5/geo--territory--map.md`](../../../neurons/E5/geo--territory--map.md). **Runtime (ADR-0001):** `e5:geo:territory-calculate` — vezi neuron. |
| Destinație (graf) | `nurturing-state-transition` | **Contract:** [`../../../neurons/E2/nurturing--state--transition.md`](../../../neurons/E2/nurturing--state--transition.md). **Semantic:** `NEURON_MATRIX.csv` — `e2:lead:state-transition` (etapă **E2** pentru neuron, față de majoritatea nurturing E5). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **geo-territory-map** are dependență sintactică față de **nurturing-state-transition**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `geo-territory-map` → `nurturing-state-transition`.
- **Runtime (ADR-0001):** sursă E5 geo; țintă **E2** — vezi contractul țintă pentru cozi.
- **Semantic (ADR-0002):** traversare etape **E5 → E2** pe muchie — **necesită reconciliere** explicită în operație (nu echivalare automată).

## Limite și reconcilieri

- **Destinație (etapă E2):** diferă de alte noduri `nurturing-*` din același fan-out (E5) — documentat din `NEURON_MATRIX.csv`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`geo-territory-map-nurturing-state-transition\``.
