# Sinapsă `ai-sentiment-analyze-monitor-phone-health`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-sentiment-analyze-monitor-phone-health` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-sentiment-analyze/ai-sentiment-analyze-monitor-phone-health.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-sentiment-analyze` | Coadă executabilă **`ai:sentiment:analyze`** (`QUEUES.AI_SENTIMENT_ANALYZE`, `workers/shared/src/queue-registry.ts`) — [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). |
| Țintă | `monitor-phone-health` | Coadă executabilă **`monitor:phone:health`** (`QUEUES.MONITOR_PHONE_HEALTH`) — [`../../../neurons/E2/monitor--phone--health.md`](../../../neurons/E2/monitor--phone--health.md).  |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

**Dependency:** în planificare, monitorizarea sănătății telefoanelor urmează (depinde de) poziția traseului de analiză sentiment în graf. Mecanismul de date între workeri nu este codificat în registrul §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `AI_SENTIMENT_ANALYZE`; `MONITOR_PHONE_HEALTH`.
- **Semantic (ADR-0002):** `e2:ai:sentiment-analyze`; `e2:monitor:phone-health` / `monitor:phone:health` — „Monitorizare sănătate telefoane WhatsApp” (~L1342–1350).
- **Planificare:** v2 §7 — `ai-sentiment-analyze` → `monitor-phone-health`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — ambele cozi, `queue_in_registry` = `yes`.

## Limite și reconcilieri

- Slug-uri graf vs cozi; fără completări speculative despre praguri sau surse de metrici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-sentiment-analyze-monitor-phone-health\``.
