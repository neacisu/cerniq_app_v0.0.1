# Sinapsă `template-spintax-process-q-wa-reply`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `template-spintax-process-q-wa-reply` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/template-spintax-process/template-spintax-process-q-wa-reply.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `template-spintax-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. |
| Destinație (graf) | `q-wa-reply` | **Contract:** [`../../../neurons/E2/q--wa--reply.md`](../../../neurons/E2/q--wa--reply.md). **Runtime (ADR-0001):** `q:wa:reply` (legacy) — **semantica operațională** poate diferi de „reply outbound”; vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Spintax** depinde în planificare de traseul **`q-wa-reply`**. v2: **„sinapsă canonică de pipeline”**; exportul nu leagă variabilele template de handler-ul cozii.

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

- **Runtime (ADR-0001):** vezi registry pentru ambele capete.
- **Semantic (ADR-0002):** `e2:wa:reply` cu reconciliere — vezi contract neuron.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Trimiterea răspunsurilor generate poate folosi **`q:wa:phone-NN:followup`**, nu `q:wa:reply` — sinapsa rămâne ancorată în nodurile din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`template-spintax-process-q-wa-reply\``.
