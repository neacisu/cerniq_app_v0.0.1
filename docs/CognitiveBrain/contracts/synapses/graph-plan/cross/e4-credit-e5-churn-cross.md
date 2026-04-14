# Sinapsă `e4-credit-e5-churn-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e4-credit-e5-churn-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e4-credit-e5-churn-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e4-credit` | Agregat E4 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e5-churn` | Agregat E5 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e4-credit`** de **`e5-churn`** cu tip **`related`**. În v2, descrierea confirmată este: **„comportamentul de plată influențează riscul de churn”** — relație cauzală **declarativă** în planificare, fără encodare metrică sau reguli în export.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** comportamentul de plată influențează riscul de churn
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

- **Planificare:** v2 §7 — `e4-credit` → `e5-churn` (legătură **cross** E4–E5).
- **Runtime (ADR-0001):** modele de risc churn în producție — **nedovedite** de această muchie singură.
- **Semantic (ADR-0002):** reconciliere **graf ↔ catalog** pe credite (E4) și churn (E5).

## Limite și reconcilieri

- **`-cross`**: semantică de produs la nivel înalt; nu impune un singur pipeline în cod.
- Nu extrapola ponderi sau praguri de churn din textul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e4-credit-e5-churn-cross\``.
