# Sinapsă `e5-content-alerts-familyflow`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e5-content-alerts-familyflow` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/familyflow/e5-content-alerts-familyflow.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `familyflow` (contract în `graph-plan/familyflow/`; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e5-content` | Agregat E5 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e5-alerts` | Agregat E5; fără mapare automată la un singur neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful de planificare, **`e5-content`** alimentează **`e5-alerts`** prin muchie **familyflow** / **`dependency`**. v2: **„alimentează”**; exportul nu fixează payload, ordinea job-urilor sau cozi.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** alimentează
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

- **Planificare:** v2 §7 — `e5-content` → `e5-alerts`.
- **Runtime (ADR-0001):** etichete graf **≠** nume cozi; vezi [`queue-registry.ts`](../../../../../../workers/shared/src/queue-registry.ts) și `NEURON_MATRIX.csv`.
- **Semantic (ADR-0002):** vezi `cognitive-node-catalog.ts`; reconciliere **graf ↔ catalog** fără presupuneri.

## Limite și reconcilieri

- **familyflow** vs **`-stage`** / **`-cross`**: tip de muchie distinct în registrul v2 §7.
- Fără completări fictive la payload / retry / safety / telemetrie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e5-content-alerts-familyflow\``.
