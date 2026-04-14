# Sinapsă `sentiment-trend-analyze-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sentiment-trend-analyze-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/sentiment-trend-analyze/sentiment-trend-analyze-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `sentiment-trend-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `sentiment-trend-analyze` | Traseu în graf; [`../../../neurons/E3/sentiment--trend--analyze.md`](../../../neurons/E3/sentiment--trend--analyze.md). **Runtime (ADR-0001):** `sentiment:trend:analyze` (`QUEUES.E3_SENTIMENT_TREND_ANALYZE`, `workers/shared/src/queue-registry.ts`). **Semantic (ADR-0002):** `e3:sentiment:trend-analyze`. |
| Destinație (graf) | `e3-ai-core` | Nod agregat **familie ai-core** E3; nu este o singură coadă executabilă; vezi ADR / catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **analiză trend sentiment (K64)** sub agregatul **`e3-ai-core`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; praguri, surse SQL și enqueue `handover:detect` sunt în contractul neuron și cod, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`sentiment-trend-analyze-negotiation-expire-check.md`](sentiment-trend-analyze-negotiation-expire-check.md), [`sentiment-trend-analyze-negotiation-reminder-send.md`](sentiment-trend-analyze-negotiation-reminder-send.md), [`sentiment-trend-analyze-negotiation-state-transition.md`](sentiment-trend-analyze-negotiation-state-transition.md), [`sentiment-trend-analyze-negotiation-summary-generate.md`](sentiment-trend-analyze-negotiation-summary-generate.md).

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

- **Runtime (ADR-0001):** coadă `sentiment:trend:analyze` în registry — vezi contract neuron.
- **Semantic (ADR-0002):** `e3:sentiment:trend-analyze`.
- **Planificare:** v2 §7 — `sentiment-trend-analyze` → `e3-ai-core`.

## Limite și reconcilieri

- **v2** poate descrie rutare LLM; **implementarea auditată** (K64) este deterministă — vezi [`../../../neurons/E3/sentiment--trend--analyze.md`](../../../neurons/E3/sentiment--trend--analyze.md); sinapsa nu rezolvă acest decalaj.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sentiment-trend-analyze-family\``.
