# Sinapsă `e2-lead-fsm-e3-negotiation-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e2-lead-fsm-e3-negotiation-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e2-lead-fsm-e3-negotiation-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e2-lead-fsm` | Agregat E2 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e3-negotiation` | Agregat E3 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e2-lead-fsm`** de **`e3-negotiation`** cu tip **`related`**. În v2, descrierea confirmată este: **„deschide negocierile pe lead-uri warm”** — nivel planificare; fără payload/retry/safety/telemetrie în export.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** deschide negocierile pe lead-uri warm
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

- **Planificare:** v2 §7 — `e2-lead-fsm` → `e3-negotiation` (legătură **cross** E2–E3).
- **Runtime (ADR-0001):** vezi cozi/orchestrare reale separat de această muchie structurală.
- **Semantic (ADR-0002):** reconciliere **graf ↔ catalog** pe ambele capete.

## Limite și reconcilieri

- **`-cross`**: nu echivalent cu o muchie `dependency` familyflow între subgrafuri aceleiași etape.
- „Warm” este din lexicul descrierii v2, nu din reguli de business encodate în sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e2-lead-fsm-e3-negotiation-cross\``.
