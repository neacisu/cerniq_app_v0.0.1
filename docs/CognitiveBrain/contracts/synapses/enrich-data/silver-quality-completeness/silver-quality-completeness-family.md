# Sinapsă `silver-quality-completeness-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-quality-completeness-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-quality-completeness/silver-quality-completeness-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-quality-completeness` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `silver-quality-completeness` | Traseu în graf; contract neuron: [`../../../neurons/E1/silver--quality--completeness.md`](../../../neurons/E1/silver--quality--completeness.md). **Triplă autoritate:** v2 **`silver:quality:completeness`**; runtime **`score:completeness`** / catalog **`e1:score:completeness`** — vezi neuron. |
| Destinație (graf) | `e1-quality` | Agregat **familie quality E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/quality.md`](../../../../adr/families/e1/quality.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **silver-quality-completeness** sub agregatul **`e1-quality`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`silver-quality-completeness-pipeline-orchestrator-advance.md`](silver-quality-completeness-pipeline-orchestrator-advance.md), [`silver-quality-completeness-pipeline-orchestrator-start.md`](silver-quality-completeness-pipeline-orchestrator-start.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `e1-quality` nu este cheie în `QUEUES`; coada pentru scorul de completitudine este documentată ca **`score:completeness`** — vezi neuron și `queue-registry.ts` (`SCORE_COMPLETENESS`).
- **Semantic (ADR-0002):** **`e1:score:completeness`** — vezi `cognitive-node-catalog.ts` citat în contractul neuron.
- **Planificare:** v2 §7 — `silver-quality-completeness` → `e1-quality`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Slug graf** `silver-quality-completeness` vs **coadă** `score:completeness` — **necesită reconciliere graf ↔ registry** (explicit în neuron).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-quality-completeness-family\``.
