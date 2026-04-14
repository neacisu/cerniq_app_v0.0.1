# Sinapsă `webhook-instantly-ingest-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-instantly-ingest-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-instantly-ingest/webhook-instantly-ingest-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-instantly-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-instantly-ingest` | **Contract:** [`../../../neurons/E2/webhook--instantly--ingest.md`](../../../neurons/E2/webhook--instantly--ingest.md). **Runtime (ADR-0001):** coada `webhook:instantly:ingest` — vezi contract neuron și `queue-registry.ts`. |
| Destinație (graf) | `e2-webhooks` | **Nod agregat:** familia **webhooks** E2. **ADR:** [`../../../../adr/families/e2/webhooks.md`](../../../../adr/families/e2/webhooks.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează **ingest-ul webhook Instantly** sub subgraful **`e2-webhooks`** în planificare. v2: **„specializează familia”**.

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

- **Runtime:** sursa este coadă/worker E2 outreach; `e2-webhooks` nu este o singură coadă în registry.
- **Semantic:** `e2:webhook:instantly` — catalog.
- **Planificare:** v2 §7 — `webhook-instantly-ingest` → `e2-webhooks`.

## Limite și reconcilieri

- **HTTP ingest vs cozi interne:** contractul sursă descrie enfileierea către tracking — nu înlocuiește acest manifest de familie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-instantly-ingest-family\``.
