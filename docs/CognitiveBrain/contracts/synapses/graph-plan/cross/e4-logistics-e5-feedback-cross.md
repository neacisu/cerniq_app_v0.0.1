# Sinapsă `e4-logistics-e5-feedback-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e4-logistics-e5-feedback-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e4-logistics-e5-feedback-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e4-logistics` | Agregat E4 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e5-feedback` | Agregat E5 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e4-logistics`** de **`e5-feedback`** cu tip **`related`**. În v2, descrierea confirmată este: **„livrarea creează feedback și semnale NPS”** — legătură planificată logistică → feedback; exportul **nu** definește canalul sau schema evenimentelor.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** livrarea creează feedback și semnale NPS
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

- **Planificare:** v2 §7 — `e4-logistics` → `e5-feedback` (legătură **cross** E4–E5).
- **Runtime (ADR-0001):** generarea efectivă de feedback/NPS din evenimente de livrare — verificare în fluxuri operaționale, nu din sinapsă.
- **Semantic (ADR-0002):** reconciliere **graf ↔ catalog** pe logistică și feedback.

## Limite și reconcilieri

- **`-cross`**: distinct de **familyflow** intern E5 (ex. muchii `*-familyflow` din registrul v2 pe subgrafuri E5).
- „NPS” apare în descrierea v2; instrumentarea concretă nu face obiectul câmpurilor sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e4-logistics-e5-feedback-cross\``.
