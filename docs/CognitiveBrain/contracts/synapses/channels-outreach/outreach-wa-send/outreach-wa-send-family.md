# Sinapsă `outreach-wa-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-wa-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-wa-send/outreach-wa-send-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-wa-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `outreach-wa-send` | Traseu în graf; [`../../../neurons/E2/outreach--wa--send.md`](../../../neurons/E2/outreach--wa--send.md). **Runtime (ADR-0001):** literal v2 `outreach:wa:send` **nu** apare ca atare; trimiterea WA este pe cozi dinamice `q:wa:phone-*` / follow-up — **divergență documentată** în contract neuron. |
| Destinație (graf) | `e2-orchestrator` | Agregat familie orchestrator E2; [`../../../../adr/families/e2/orchestrator.md`](../../../../adr/families/e2/orchestrator.md); v2 `ADR-FAMILY-e2-orchestrator`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** atașează traseul **trimitere WA (etichetă umbrella în graf)** la **`e2-orchestrator`**. v2: **„specializează familia”**. Implementarea concretă (worker `createWaWorker`, jitter, provider) nu este codificată în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`outreach-wa-send-template-spintax-process.md`](outreach-wa-send-template-spintax-process.md).

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

- **Runtime (ADR-0001):** reconciliere **graf ↔ cozi per-telefon** — vezi contract neuron și `getWaPhoneQueueName` în registry.
- **Semantic (ADR-0002):** gap `nodeKey` pentru eticheta `outreach:wa:send`; neuroni înrudiți diferiți în catalog.
- **Planificare:** v2 §7 — `outreach-wa-send` → `e2-orchestrator`.

## Limite și reconcilieri

- **Slug graf** `outreach-wa-send` nu trebuie confundat cu o singură coadă BullMQ literală; vezi dovezi în [`outreach--wa--send.md`](../../../neurons/E2/outreach--wa--send.md).
- Fără completări speculative despre payload sau retry din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-wa-send-family\``.
