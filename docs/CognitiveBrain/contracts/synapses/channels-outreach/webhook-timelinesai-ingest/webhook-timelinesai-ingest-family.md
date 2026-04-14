# Sinapsă `webhook-timelinesai-ingest-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-timelinesai-ingest-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-timelinesai-ingest/webhook-timelinesai-ingest-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-timelinesai-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `webhook-timelinesai-ingest` | Traseu ingest TimelinesAI / WA; [`../../../neurons/E2/webhook--timelinesai--ingest.md`](../../../neurons/E2/webhook--timelinesai--ingest.md). **Runtime (ADR-0001):** `webhook:timelinesai:ingest`. **Semantic (ADR-0002):** `e2:webhook:timelinesai`. |
| Destinație (graf) | `e2-webhooks` | Agregat **familie webhooks** E2; [`../../../../adr/families/e2/webhooks.md`](../../../../adr/families/e2/webhooks.md); v2 `ADR-FAMILY-e2-webhooks`. Nu este o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **ingest webhook TimelinesAI** sub agregatul **`e2-webhooks`**. v2: **„specializează familia”** — fără payload/retry/safety/telemetrie pe muchie; propagarea către `lead:state:transition` / `ai:sentiment:analyze` etc. este în contractul neuron și în `webhooks.ts`, nu în exportul sinapsei.

## Sinapse dependență în același traseu

[`webhook-timelinesai-ingest-lead-assign-user.md`](webhook-timelinesai-ingest-lead-assign-user.md), [`webhook-timelinesai-ingest-lead-state-transition.md`](webhook-timelinesai-ingest-lead-state-transition.md).

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

- **Runtime (ADR-0001):** sursa are coadă în registry; `e2-webhooks` este agregat de familie, nu intrare `QUEUES`.
- **Semantic (ADR-0002):** `SensoryNeuron` / swimlane ingest — vezi catalog pentru `e2:webhook:timelinesai`.
- **Planificare:** v2 §7 — `webhook-timelinesai-ingest` → `e2-webhooks`.

## Limite și reconcilieri

- Detaliile handlerului (filtru `from_me`, ramuri status vs inbound) nu se deduc din muchia `default`; vezi [`webhook--timelinesai--ingest.md`](../../../neurons/E2/webhook--timelinesai--ingest.md).
- Fără inventare de payload sau politici din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-timelinesai-ingest-family\``.
