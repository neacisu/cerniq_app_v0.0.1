# Sinapsă `email-warm-proforma-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-proforma-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-proforma/email-warm-proforma-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-proforma` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-proforma` | Traseu în graf; **runtime:** coadă canonică **`email:warm:proforma`** — [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md); **Registry:** `EMAIL_WARM_PROFORMA` (`workers/shared/src/queue-registry.ts`). |
| Destinație (graf) | `e2-email-warm` | Agregat de planificare pentru familia **email-warm** (E2), nu o singură coadă BullMQ; fără fișier neuron unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `email-warm-proforma` în nucleul **`e2-email-warm`**. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`email-warm-proforma-webhook-instantly-ingest.md`](email-warm-proforma-webhook-instantly-ingest.md), [`email-warm-proforma-webhook-resend-ingest.md`](email-warm-proforma-webhook-resend-ingest.md), [`email-warm-proforma-webhook-timelinesai-ingest.md`](email-warm-proforma-webhook-timelinesai-ingest.md) — muchii **dependency** (v2 §7).

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

- **Runtime (ADR-0001):** **`email:warm:proforma`** — vezi registry.
- **Semantic (ADR-0002):** `e2:email:warm-proforma`; **`e2-email-warm`** = agregat plan.
- **Planificare:** muchie de familie.

## Limite și reconcilieri

- Contractul neuron documentează folosirea cozii pentru **reply / click** warm, nu neapărat emiterea unei proforme; muchia `*-family` rămâne ancorată în descrierea v2 „specializează familia”.
- Nu inventa payload / retry / safety / telemetrie din afara v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-proforma-family\``.
