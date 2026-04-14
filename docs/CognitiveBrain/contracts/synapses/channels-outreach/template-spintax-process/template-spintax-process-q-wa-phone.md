# Sinapsă `template-spintax-process-q-wa-phone`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `template-spintax-process-q-wa-phone` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/template-spintax-process/template-spintax-process-q-wa-phone.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `template-spintax-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. **Semantic (ADR-0002):** `e2:template:spintax`. |
| Destinație (graf) | `q-wa-phone` | **Contract:** [`../../../neurons/E2/q--wa--phone_.md`](../../../neurons/E2/q--wa--phone_.md). **Runtime:** familie `q:wa:phone-01` … `q:wa:phone-20` — **nu** literal `q:wa:phone_` din v2 ca Redis key; vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Procesarea spintax** depinde în planificare de **familia de cozi WA per-linie** (antet graf `q-wa-phone`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum textul variat alimentează job-urile WA.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime (ADR-0001):** spintax vs cozi WA — distincte; legătura efectivă nu e în câmpurile sinapsei.
- **Semantic (ADR-0002):** vezi contracte.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Nodul graf **`q-wa-phone`** (hyphen) vs **`q:wa:phone_`** (v2) vs **`q:wa:phone-NN`** (runtime) — vezi [`../../../neurons/E2/q--wa--phone_.md`](../../../neurons/E2/q--wa--phone_.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`template-spintax-process-q-wa-phone\``.
