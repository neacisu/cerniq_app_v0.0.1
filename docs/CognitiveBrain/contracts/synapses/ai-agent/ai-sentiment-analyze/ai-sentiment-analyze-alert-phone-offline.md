# Sinapsă `ai-sentiment-analyze-alert-phone-offline`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-sentiment-analyze-alert-phone-offline` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-sentiment-analyze/ai-sentiment-analyze-alert-phone-offline.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-sentiment-analyze` | Coadă executabilă **`ai:sentiment:analyze`** (`QUEUES.AI_SENTIMENT_ANALYZE`, `workers/shared/src/queue-registry.ts`) — [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). |
| Destinație (graf) | `alert-phone-offline` | Coadă executabilă **`alert:phone:offline`** (`QUEUES.ALERT_PHONE_OFFLINE`) — [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

Dependența **`dependency`** ordonează în planificare analiza de sentiment înaintea alertei de telefon offline. Fără payload în export, nu se afirmă trigger-ul runtime între cele două cozi.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `AI_SENTIMENT_ANALYZE`; `ALERT_PHONE_OFFLINE` → `alert:phone:offline`.
- **Semantic (ADR-0002):** `e2:ai:sentiment-analyze`; `e2:alert:phone-offline` / `alert:phone:offline` — „Alertă telefon WhatsApp deconectat” (~L1369–1377).
- **Planificare:** v2 §7 — `ai-sentiment-analyze` → `alert-phone-offline`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — ambele cozi, `queue_in_registry` = `yes`.

## Limite și reconcilieri

- Reconciliere slug graf vs nume coadă; detalii operaționale în contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-sentiment-analyze-alert-phone-offline\``.
