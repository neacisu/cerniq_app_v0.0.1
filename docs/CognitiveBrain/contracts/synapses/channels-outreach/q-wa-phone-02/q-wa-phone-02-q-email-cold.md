# Sinapsă `q-wa-phone-02-q-email-cold`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-02-q-email-cold` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone-02/q-wa-phone-02-q-email-cold.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone-02` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone-02` | **Contract:** [`../../../neurons/E2/q--wa--phone_02.md`](../../../neurons/E2/q--wa--phone_02.md). **Runtime:** `q:wa:phone-02`. |
| Destinație (graf) | `q-email-cold` | **Contract:** [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). **Runtime (ADR-0001):** `q:email:cold`. **Semantic (ADR-0002):** `e2:email:cold-send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **WA linia 02** depinde în planificare de **pipeline-ul cold email** (`q-email-cold`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie fan-out sau condiții de rutare.

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

- **Runtime (ADR-0001):** `q:wa:phone-02` și `q:email:cold` — documentate în contracte.
- **Semantic (ADR-0002):** whatsapp + email-cold în E2.
- **Planificare:** v2 §7 — `q-wa-phone-02` → `q-email-cold`.

## Limite și reconcilieri

- Muchia nu precizează ordinea temporală în runtime — doar dependența din graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-02-q-email-cold\``.
