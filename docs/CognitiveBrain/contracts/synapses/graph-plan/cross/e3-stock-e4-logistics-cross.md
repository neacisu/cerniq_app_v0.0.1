# Sinapsă `e3-stock-e4-logistics-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e3-stock-e4-logistics-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e3-stock-e4-logistics-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e3-stock` | Agregat E3 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e4-logistics` | Agregat E4 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e3-stock`** de **`e4-logistics`** cu tip **`related`**. În v2, descrierea confirmată este: **„transformă stocul rezervat în livrare”** — semantică de planificare; exportul **nu** encodă mecanisme de rezervare sau expediere.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** transformă stocul rezervat în livrare
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

- **Planificare:** v2 §7 — `e3-stock` → `e4-logistics` (legătură **cross** E3–E4).
- **Runtime (ADR-0001):** stoc și logistică sunt domenii operaționale separate în cod; alinierea la această muchie necesită audit de flux, nu se presupune din graf singur.
- **Semantic (ADR-0002):** reconciliere **graf ↔ catalog** pe E3/E4.

## Limite și reconcilieri

- **`-cross`**: legătură între etape; nu înlocuiește contractele operative de inventar sau livrare.
- „Rezervat” și „livrare” sunt termeni din descrierea v2, nu definiții de date din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e3-stock-e4-logistics-cross\``.
