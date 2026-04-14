# Sinapsă `email-warm-proforma-webhook-instantly-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-proforma-webhook-instantly-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-proforma/email-warm-proforma-webhook-instantly-ingest.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-proforma` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-proforma` | **Runtime:** **`email:warm:proforma`** — [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md); **Registry:** `EMAIL_WARM_PROFORMA`. |
| Destinație | `webhook-instantly-ingest` | **Runtime:** **`webhook:instantly:ingest`** — [`../../../neurons/E2/webhook--instantly--ingest.md`](../../../neurons/E2/webhook--instantly--ingest.md); **Registry:** `WEBHOOK_INSTANTLY_INGEST`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** între lane-ul **`email-warm-proforma`** și **`webhook-instantly-ingest`** în graful de planificare. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. Legătura operațională Instantly ↔ cozi outreach este în workers + contracte neuron, nu dedusă aici.

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

- **Runtime (ADR-0001):** `EMAIL_WARM_PROFORMA` → `WEBHOOK_INSTANTLY_INGEST`.
- **Semantic (ADR-0002):** `e2:email:warm-proforma` → `e2:webhook:instantly`.
- **Planificare:** noduri `email-warm-proforma`, `webhook-instantly-ingest`.

## Limite și reconcilieri

- Webhook Instantly este în primul rând pe traseul cold în implementare; muchia rămâne **export-grounded** — orice diferențiere între plan și rutare efectivă se documentează la nivel de neuron, nu prin completări fictive aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-proforma-webhook-instantly-ingest\``.
