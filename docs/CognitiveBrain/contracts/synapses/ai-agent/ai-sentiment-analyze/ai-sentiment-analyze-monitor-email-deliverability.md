# Sinapsă `ai-sentiment-analyze-monitor-email-deliverability`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-sentiment-analyze-monitor-email-deliverability` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-sentiment-analyze/ai-sentiment-analyze-monitor-email-deliverability.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-sentiment-analyze` | Coadă executabilă **`ai:sentiment:analyze`** (`QUEUES.AI_SENTIMENT_ANALYZE`, `workers/shared/src/queue-registry.ts`) — [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). |
| Destinație (graf) | `monitor-email-deliverability` | Coadă executabilă **`monitor:email:deliverability`** (`QUEUES.MONITOR_EMAIL_DELIVERABILITY`) — [`../../../neurons/E2/monitor--email--deliverability.md`](../../../neurons/E2/monitor--email--deliverability.md).  |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În topologia exportată, monitorizarea deliverability email este dependentă (planificare) de traseul `ai-sentiment-analyze`. Aceasta nu implică din registrul §7 că analiza de sentiment alimentează direct job-uri de monitor, ci doar ordinea de dependență declarată în graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `AI_SENTIMENT_ANALYZE`; `MONITOR_EMAIL_DELIVERABILITY`.
- **Semantic (ADR-0002):** `e2:ai:sentiment-analyze`; `e2:monitor:email-deliverability` / `monitor:email:deliverability` — „Monitorizare deliverability domenii email” (~L1351–1359).
- **Planificare:** v2 §7 — `ai-sentiment-analyze` → `monitor-email-deliverability`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `queue_in_registry` = `yes` pentru ambele.

## Limite și reconcilieri

- Concurrency pentru aceste cozi este configurată în `queue-registry.ts` (secțiune outreach); nu face parte din câmpurile sinapsei v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-sentiment-analyze-monitor-email-deliverability\``.
