# Sinapsă `e1-bronze-dedup-stage`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e1-bronze-dedup-stage` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/stage/e1-bronze-dedup-stage.md` |
| Areal sinaptic | `graph-plan` |
| Traseu sinaptic | `e1-bronze-dedup-stage` |
| Registru topologie | `graph-plan/stage` — muchie cu sufix **`-stage`** în export; **distinct** de `familyflow` și `cross` (vezi [`../../README.md`](../../README.md)). |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `e1-bronze-dedup` | Etichetă **swimlane / subgraf** în planificare; **nu** este prin ea însăși un `v2_queue` unic. **Necesită reconciliere graf ↔** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **/ contracte neuroni / registry** pentru fiecare neuron concret din swimlane. |
| Țintă | `e1` | Nod **agregat etapă** E1 în export; fără rând dedicat „coadă `e1`” în matrice. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

În topologia **graph-plan/stage**, muchia leagă **`e1-bronze-dedup`** de nodul agregat al etapei **`e1`**, cu descrierea confirmată **„operează în etapa”**: poziționare structurală în stratul de etapă, nu contract executabil per muchie. Exportul **nu** encodează payload, retry, clasă de siguranță sau telemetrie pentru această muchie.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** operează în etapa
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

- **Planificare:** v2 §7 — `e1-bronze-dedup` → `e1` (muchie `e1-bronze-dedup-stage`).
- **Semantic (ADR-0002) / runtime (ADR-0001):** această muchie **nu** înlocuiește catalogul sau `queue-registry.ts`; descendenții concreti ai swimlane-ului se mapează separat.

## Limite și reconcilieri

- Tipul **`related`** se interpretează conservativ: nu echivalează cu dependență de execuție (`dependency`) sau specializare familie (`default`) din alte subregistre.
- Orice afirmație despre ordinea runtime a întregii etape E1 necesită dovezi din cozi/workers, nu din această muchie.

## Interpretare etichetă sursă (graf; fără runtime inventat)

`e1-bronze-dedup` indică în graf o swimlane de **deduplicare la nivel „bronz”** (primul val de dedup) în **E1**; legătura `related` spre `e1` este **structurală în planificare**. Nu se deduce din această muchie singură cum rulează dedup-ul în workers sau ce cozi îl implementează.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e1-bronze-dedup-stage\``.
