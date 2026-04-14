# Sinapsă `q-wa-phone-xx-q-email-cold`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-xx-q-email-cold` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone-xx/q-wa-phone-xx-q-email-cold.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone-xx` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone-xx` | **Contract:** [`../../../neurons/E2/q--wa--phone_xx.md`](../../../neurons/E2/q--wa--phone_xx.md). **Runtime:** pattern `q:wa:phone-NN` — vezi contract neuron. |
| Destinație (graf) | `q-email-cold` | **Contract:** [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). **Runtime (ADR-0001):** `q:email:cold` (`QUEUES.EMAIL_COLD`). **Semantic (ADR-0002):** `e2:email:cold-send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Linia WA** depinde în planificare de **coada de trimitere email cold** (motor outreach comun). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie când un job WA enfilează sau consumă `q:email:cold`.

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

- **Runtime (ADR-0001):** WA per-telefon vs `q:email:cold` — cozi diferite; sinapsa nu dovedește apeluri încrucișate.
- **Semantic (ADR-0002):** vezi contracte.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Nodul graf `q-email-cold` corespunde **`q:email:cold`** în runtime — vezi [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-xx-q-email-cold\``.
