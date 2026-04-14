# Sinapsă `ai-sentiment-analyze-alert-bounce-high`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-sentiment-analyze-alert-bounce-high` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-sentiment-analyze/ai-sentiment-analyze-alert-bounce-high.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-sentiment-analyze` | Coadă executabilă **`ai:sentiment:analyze`** (`QUEUES.AI_SENTIMENT_ANALYZE`, `workers/shared/src/queue-registry.ts`) — [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). |
| Destinație (graf) | `alert-bounce-high` | Coadă executabilă **`alert:bounce:high`** (`QUEUES.ALERT_BOUNCE_HIGH`) — [`../../../neurons/E2/alert--bounce--high.md`](../../../neurons/E2/alert--bounce--high.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În graful planificat, **`dependency`** plasează analiza de sentiment înaintea pasului de alertă pentru bounce ridicat: ordonare de proiectare între traseul AI și monitorizarea/alerta pe email. Registrul §7 **nu** specifică dacă worker-ul `ai:sentiment:analyze` produce direct job-uri pe `alert:bounce:high`; mecanismul de propagare rămâne în afara câmpurilor exportului.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `AI_SENTIMENT_ANALYZE` / `ALERT_BOUNCE_HIGH` — bloc J/K în `queue-registry.ts` (comentariu: cozi AI outreach + monitoring).
- **Semantic (ADR-0002):** `e2:ai:sentiment-analyze` — „Analiză sentiment mesaje primite de la lead”; `e2:alert:bounce-high` — „Alertă bounce rate email depășit prag” (AttentionNeuron, swimlane `pipeline-control`, ~L1387–1395).
- **Planificare:** v2 §7 — `Source` `ai-sentiment-analyze` → `Target` `alert-bounce-high`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — rânduri `ai:sentiment:analyze` și `alert:bounce:high` (ambele `queue_in_registry` = `yes`).

## Limite și reconcilieri

- Slug-uri graf (`-`) vs cozi (`:`); fără presupuneri despre payload sau ordinea reală BullMQ dincolo de export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-sentiment-analyze-alert-bounce-high\``.
