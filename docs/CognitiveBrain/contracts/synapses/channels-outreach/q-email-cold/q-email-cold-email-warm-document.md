# Sinapsă `q-email-cold-email-warm-document`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-email-cold-email-warm-document` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-email-cold/q-email-cold-email-warm-document.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-email-cold` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `q-email-cold` | **Contract:** [`../../../neurons/E2/q--email--cold.md`](../../../neurons/E2/q--email--cold.md). **Runtime (ADR-0001):** `q:email:cold`. **Semantic (ADR-0002):** `e2:email:cold-send`. |
| Destinație (graf) | `email-warm-document` | **Contract:** [`../../../neurons/E2/email--warm--document.md`](../../../neurons/E2/email--warm--document.md). **Runtime (ADR-0001):** `email:warm:document` (`QUEUES.EMAIL_WARM_DOCUMENT`). **Semantic (ADR-0002):** `e2:email:warm-document`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **q-email-cold** are dependență canonică spre nodul **`email-warm-document`**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie conținutul job-urilor sau ordinea efectivă între cold și acest nod.

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

- **Runtime (ADR-0001):** ambele cozi apar în `queue-registry.ts` — vezi contracte neuron.
- **Semantic (ADR-0002):** familie `email-cold` (sursă) → familie `email-warm` (țintă) în v2 antete neuron.
- **Planificare:** `q-email-cold` → `email-warm-document`.

## Limite și reconcilieri

- Dependența este **declarativă** în graf; execuția efectivă se verifică în cod și orchestrare.
- **Semantică runtime vs etichetă:** contractul neuron [`email--warm--document.md`](../../../neurons/E2/email--warm--document.md) documentează că `email:warm:document` procesează **tracking** Resend, nu emiterea de documente ca atașament — fără a contrazice muchia structurală din export.
- Fără completări fictive pentru payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-email-cold-email-warm-document\``.
