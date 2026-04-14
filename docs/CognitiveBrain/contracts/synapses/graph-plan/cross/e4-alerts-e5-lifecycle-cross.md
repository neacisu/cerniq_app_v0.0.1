# Sinapsă `e4-alerts-e5-lifecycle-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e4-alerts-e5-lifecycle-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e4-alerts-e5-lifecycle-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e4-alerts` | Agregat E4 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e5-lifecycle` | Agregat E5 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e4-alerts`** de **`e5-lifecycle`** cu tip **`related`**. În v2, descrierea confirmată este: **„alimentează starea relațională post-livrare”** — legătură planificată între alerte operaționale și lifecycle post-vânzare; fără detaliu de implementare în câmpurile sinapsei.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** alimentează starea relațională post-livrare
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

- **Planificare:** v2 §7 — `e4-alerts` → `e5-lifecycle` (legătură **cross** E4–E5).
- **Runtime (ADR-0001):** alerte vs nurturing/lifecycle în cod — verificare separată; graful nu înlocuiește registry.
- **Semantic (ADR-0002):** reconciliere **graf ↔ catalog** pe E4 și E5.

## Limite și reconcilieri

- **`-cross`**: puntere explicită între etape în registrul v2.
- „Stare relațională” nu este modelată în câmpurile tehnice ale sinapsei; rămâne la nivelul descrierii confirmate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e4-alerts-e5-lifecycle-cross\``.
