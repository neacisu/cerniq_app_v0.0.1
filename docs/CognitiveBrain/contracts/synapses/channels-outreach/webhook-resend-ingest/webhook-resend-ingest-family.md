# Sinapsă `webhook-resend-ingest-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-resend-ingest-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-resend-ingest/webhook-resend-ingest-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-resend-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-resend-ingest` | **Contract:** [`../../../neurons/E2/webhook--resend--ingest.md`](../../../neurons/E2/webhook--resend--ingest.md). **Runtime:** `webhook:resend:ingest` — vezi contract neuron și registry. |
| Destinație (graf) | `e2-webhooks` | **Nod agregat:** familia **webhooks** E2. **ADR:** [`../../../../adr/families/e2/webhooks.md`](../../../../adr/families/e2/webhooks.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează **ingest-ul webhook Resend** sub **`e2-webhooks`**. v2: **„specializează familia”**.

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

- **Runtime / Semantic:** `e2:webhook:resend` — catalog.
- **Planificare:** v2 §7 — `webhook-resend-ingest` → `e2-webhooks`.

## Limite și reconcilieri

- Contractul sursă descrie enfileiere către cozi **email warm** — separat de acest nod agregat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-resend-ingest-family\``.
