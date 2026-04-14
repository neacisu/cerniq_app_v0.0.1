# Sinapsă `email-warm-proforma-webhook-timelinesai-ingest`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-warm-proforma-webhook-timelinesai-ingest` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-warm-proforma/email-warm-proforma-webhook-timelinesai-ingest.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-warm-proforma` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-warm-proforma` | **Runtime:** **`email:warm:proforma`** — [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md); **Registry:** `EMAIL_WARM_PROFORMA`. |
| Destinație | `webhook-timelinesai-ingest` | **Runtime:** **`webhook:timelinesai:ingest`** — [`../../../neurons/E2/webhook--timelinesai--ingest.md`](../../../neurons/E2/webhook--timelinesai--ingest.md); **Registry:** `WEBHOOK_TIMELINESAI_INGEST`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** din export între **`email-warm-proforma`** și **`webhook-timelinesai-ingest`**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. Comportamentul TimelinesAI (livrabile, stări) — în contractul ingest, nu inventat aici.

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

- **Runtime (ADR-0001):** `EMAIL_WARM_PROFORMA` → `WEBHOOK_TIMELINESAI_INGEST`.
- **Semantic (ADR-0002):** `e2:email:warm-proforma` → `e2:webhook:timelinesai`.
- **Planificare:** noduri din export.

## Limite și reconcilieri

- Dacă graful sugerează o dependență pe care rutarea runtime o realizează altfel, conflictul se urcă la nivel de ADR / reconciliere neuron, nu se maschează în textul sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-warm-proforma-webhook-timelinesai-ingest\``.
