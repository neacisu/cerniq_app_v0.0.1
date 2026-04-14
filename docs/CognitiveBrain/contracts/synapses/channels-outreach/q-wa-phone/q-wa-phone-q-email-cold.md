# Sinapsă `q-wa-phone-q-email-cold`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-q-email-cold` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone/q-wa-phone-q-email-cold.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-wa-phone` | **Contract:** [`../../../neurons/E2/q--wa--phone_.md`](../../../neurons/E2/q--wa--phone_.md). **Runtime:** cozi `q:wa:phone-NN` — vezi contract. |
| Destinație (graf) | `q-email-cold` | **Contract:** [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). **Runtime (ADR-0001):** `q:email:cold` (`QUEUES.EMAIL_COLD`) — vezi registry și contract. **Semantic (ADR-0002):** `e2:email:cold-send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **WA generic** depinde în planificare de **coada / neuronul cold email** (`q-email-cold`) — orchestrare în care acțiunile WA sunt modelate după sau în cuplaj cu pipeline-ul de cold email. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie ordinea job-urilor sau fan-out.

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

- **Runtime (ADR-0001):** sursă abstractă `q-wa-phone_` vs cozi `q:wa:phone-NN`; țintă `q:email:cold` documentată.
- **Semantic (ADR-0002):** ambele familii E2 (whatsapp vs email-cold) — vezi v2 și catalog.
- **Planificare:** v2 §7 — `q-wa-phone` → `q-email-cold`.

## Limite și reconcilieri

- Muchia **nu** spune dacă dependența este „WA înainte de cold” sau invers în timp real — doar relație structurală în graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-q-email-cold\``.
