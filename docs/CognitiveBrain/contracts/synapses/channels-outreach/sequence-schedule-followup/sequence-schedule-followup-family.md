# Sinapsă `sequence-schedule-followup-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sequence-schedule-followup-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/sequence-schedule-followup/sequence-schedule-followup-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `sequence-schedule-followup` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `sequence-schedule-followup` | Traseu în graf; [`../../../neurons/E2/sequence--schedule--followup.md`](../../../neurons/E2/sequence--schedule--followup.md). **Runtime (ADR-0001):** `sequence:schedule:followup` (`QUEUES.SEQUENCE_SCHEDULE_FOLLOWUP`). **Semantic (ADR-0002):** `e2:sequence:schedule-followup`. |
| Destinație (graf) | `e2-sequences` | Nod agregat **familie sequences** E2; nu este o singură coadă executabilă; vezi ADR / catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **programare follow-up în secvență** (scheduler) sub agregatul **`e2-sequences`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; calcul `nextActionAt`, ore lucrătoare și enqueue `sequence:advance` cu delay sunt în contractul neuron și `sequences.ts`, nu în exportul muchiei.

## Sinapse dependență în același traseu

*Nu există alte sinapse `.md` în acest subdirector la livrarea curentă; dependențe planificate în v2 pentru alte noduri se documentează în alte traseuri sinaptice.*

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

- **Runtime (ADR-0001):** coadă `sequence:schedule:followup` în registry — vezi contract neuron.
- **Semantic (ADR-0002):** `e2:sequence:schedule-followup`.
- **Planificare:** v2 §7 — `sequence-schedule-followup` → `e2-sequences`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sequence-schedule-followup-family\``.
