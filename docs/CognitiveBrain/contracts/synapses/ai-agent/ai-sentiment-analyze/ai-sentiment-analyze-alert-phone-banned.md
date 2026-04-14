# Sinapsă `ai-sentiment-analyze-alert-phone-banned`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-sentiment-analyze-alert-phone-banned` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-sentiment-analyze/ai-sentiment-analyze-alert-phone-banned.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-sentiment-analyze` | Coadă executabilă **`ai:sentiment:analyze`** (`QUEUES.AI_SENTIMENT_ANALYZE`, `workers/shared/src/queue-registry.ts`) — [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). |
| Țintă | `alert-phone-banned` | Coadă executabilă **`alert:phone:banned`** (`QUEUES.ALERT_PHONE_BANNED`) — [`../../../neurons/E2/alert--phone--banned.md`](../../../neurons/E2/alert--phone--banned.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

**Dependency** în graf: pasul de analiză sentiment este predecesor planificat al alertei „telefon banat”. Nu se deduce din v2 §7 legătura implementată între procesorul sentiment și coada de alertă; contractele neuron descriu comportamentul separat.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `AI_SENTIMENT_ANALYZE`; `ALERT_PHONE_BANNED` → `alert:phone:banned` (comentariu registry: alertă notificare pentru payload BANNED).
- **Semantic (ADR-0002):** `e2:ai:sentiment-analyze`; `e2:alert:phone-banned` / `alert:phone:banned` — „Alertă telefon WhatsApp banat de Meta” (~L1378–1386).
- **Planificare:** v2 §7 pentru `ai-sentiment-analyze-alert-phone-banned`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `ai:sentiment:analyze`, `alert:phone:banned` (`queue_in_registry` = `yes`).

## Limite și reconcilieri

- `ALERT_PHONE_BANNED` este distinct semantic în registry de `PHONE_QUARANTINE`; această sinapsă nu fuzionează rolurile — vezi `queue-registry.ts` lângă constante.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-sentiment-analyze-alert-phone-banned\``.
