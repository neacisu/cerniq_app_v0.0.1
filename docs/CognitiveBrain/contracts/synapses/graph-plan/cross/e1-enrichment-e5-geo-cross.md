# Sinapsă `e1-enrichment-e5-geo-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e1-enrichment-e5-geo-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e1-enrichment-e5-geo-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e1-enrichment` | Agregat E1 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e5-geo` | Agregat E5 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e1-enrichment`** de **`e5-geo`** cu tip **`related`**. În v2, descrierea confirmată este: **„alimentează geografia și proximitatea post-vânzare”** — formulare la nivel de planificare, **fără** payload, ordine operațională sau cozi encodate în câmpurile sinapsei.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** alimentează geografia și proximitatea post-vânzare
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

- **Planificare:** v2 §7 — `e1-enrichment` → `e5-geo` (legătură **cross** E1–E5).
- **Runtime (ADR-0001):** capete din etape diferite; **nu** implică o singură coadă sau worker — vezi [`queue-registry.ts`](../../../../../../workers/shared/src/queue-registry.ts) și [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) pe fiecare etapă.
- **Semantic (ADR-0002):** reconciliere **graf ↔ catalog** pe ambele capete; fără potrivire 1:1 impusă de această muchie.

## Limite și reconcilieri

- **`-cross`** vs **`-familyflow`** vs **`-stage`**: această muchie este **cross** (legătură explicită între agregate din registrul v2), nu flux intern familyflow și nu ancorare „operează în etapa”.
- Nu extrapola mecanismul „geografie / proximitate” dincolo de textul confirmat în v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e1-enrichment-e5-geo-cross\``.
