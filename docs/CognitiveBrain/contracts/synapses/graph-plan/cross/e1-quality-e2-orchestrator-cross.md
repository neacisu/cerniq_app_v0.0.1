# Sinapsă `e1-quality-e2-orchestrator-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e1-quality-e2-orchestrator-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e1-quality-e2-orchestrator-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e1-quality` | Agregat E1 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e2-orchestrator` | Agregat E2 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e1-quality`** de **`e2-orchestrator`** cu tip **`related`**. În v2, descrierea confirmată este: **„promovează lead-uri validate către outreach”** — semantica este la nivel de graf planificat; exportul **nu** encodă payload, cozi sau ordinea execuției.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** promovează lead-uri validate către outreach
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

- **Planificare:** v2 §7 — `e1-quality` → `e2-orchestrator` (legătură **cross** E1–E2).
- **Runtime (ADR-0001):** traversare între etape; implementarea concretă cere mapare separată la cozi — vezi registry și matrice.
- **Semantic (ADR-0002):** vezi `cognitive-node-catalog.ts` pentru neuroni E1/E2; **necesită reconciliere graf ↔ catalog** pe fiecare capăt.

## Limite și reconcilieri

- **`-cross`** vs **`-familyflow`**: muchie **cross**, nu alimentare internă familyflow într-o singură etapă.
- „Lead-uri validate” și „outreach” sunt **concepte din descrierea v2**, nu contracte de payload din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e1-quality-e2-orchestrator-cross\``.
