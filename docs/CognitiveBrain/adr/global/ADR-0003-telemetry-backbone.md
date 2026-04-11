# ADR-0003 — Coloană vertebrală telemetrie

| Câmp | Valoare |
| --- | --- |
| ID | ADR-0003 |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Nivel | Global |
| Plan v2 | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §3 «ADR-0003 — Telemetry backbone» |
| Plan legacy | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — reconciliere dacă e gap |
| Research | [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) — observabilitate, corelare trace–metrică |
| Fișiere autoritate | [packages/observability/src/init.ts](../../../../packages/observability/src/init.ts), [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts), [apps/api/src/config.ts](../../../../apps/api/src/config.ts) |

## Context

Telemetria neuronală trebuie să rămână **compatibilă** cu stack-ul OpenTelemetry existent (export OTLP, semantica atributelor) și să gestioneze **cardinalitatea** atunci când sute de noduri emit semnale.

## Decizie (canonică din v2)

- **Decizie:** **OpenTelemetry** rămâne fundația canonică pentru contractele de telemetrie ale neuronilor și sinapselor.
- **Motiv (v2):** convențiile GenAI OTel definesc atribute și metrici standard pentru LLM; v2 propune în plus atribute `cognitive.*`, strategie de cardinalitate (agregări pe tip+etapă, evitarea `neuron_id` pe histograme frevente), recording rules și exemplare.
- **Consecință:** îmbunătățiri viitoare trebuie să rămână aliniate către **același traseu collector** (OTLP HTTP/gRPC către backend-uri operaționale).

## Dovezi în implementarea Cerniq

### SDK și export OTLP

- [packages/observability/src/init.ts](../../../../packages/observability/src/init.ts):
  - `NodeSDK`, `OTLPTraceExporter`, `OTLPMetricExporter` — export **HTTP** OTLP (`/v1/traces`, `/v1/metrics`); comentariu: instrumentare Fastify oficială + auto-instrumentări selectate.
- Dependențe declarate în [package.json](../../../../package.json) (root): `@opentelemetry/api` **1.9.1**, `@opentelemetry/auto-instrumentations-node`, instrumentări HTTP, etc.

### Endpoint și configurare API

- [apps/api/src/config.ts](../../../../apps/api/src/config.ts) — `OTEL_EXPORTER_OTLP_ENDPOINT` cu default `https://otel-cerniq.neanelu.ro` (exemplu de traseu organizațional; nu înlocuiește CMDB-ul din v2 §0).

### Span-uri cognitive (implementat)

- [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts) — `withCognitiveSpan`:
  - Nume span: `` `cognitive:${nodeKey}` ``.
  - Atribute setate când există intrare în catalog: `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function`.
  - Context execuție: `tenant.id`, `batch.id` când prezente în `ctx`.
  - Evenimente aferente: `emitCognitiveEvent` pentru `node_started` / `node_completed` / `node_failed` (corelare cu DB/Redis — același fișier).

### GenAI / `gen_ai.*` în cod

- Căutare în repo (`*.ts`) pentru `gen_ai` — **fără potriviri** la audit2026-04-11. Apelurile LLM trec prin [workers/shared/src/llm-client.ts](../../../../workers/shared/src/llm-client.ts) cu metrici custom (`llmLatencySeconds`, `llmRequestsTotal`, `llmTokensTotal` din `./metrics.js`) — **nu** s-a confirmat mapare automată la semconv `gen_ai.*` în acest audit.

## Aliniere la cercetare

Research-ul recomandă trasabilitate end-to-end; span-urile `cognitive:*` + evenimentele `cognitiveEvents` realizează o parte din lanț; **nu** echivalează încă pe deplin pachetul de metrici GenAI enumerat în v2.

## Reconciliere v2 ↔ cod

| Temă v2 | În repo (audit2026-04-11) |
| --- | --- |
| Atribute `cognitive.neuron.id`, `cognitive.autonomy.tier`, `cognitive.confidence.score`, … | **Parțial:** implementat `cognitive.nodeKey`, tip, swimlane, etapă, funcție; **lipsă confirmată** pentru tier/autonomy/confidence ca atribute standardizate pe span. |
| Metrici GenAI (`gen_ai.client.token.usage`, durate, TTFT, …) | **Nu confirmat** pe codul citit; există metrici custom LLM în worker-shared. |
| Cardinalitate / recording rules Prometheus | **Direcție v2**; configurarea Prometheus/Tempo/Grafana nu face obiectul acestui ADR. |
| Porturi collector 4317/4318 | Implicite în ecosistem OTLP; în [infra/config](../../../../infra/config) există referințe Traefik pentru OTLP HTTP (ex. `4318`) — detaliu infrastructură, nu dovada fiecărui span. |

## Consecințe operaționale

1. Noi instrumentări LLM ar trebui să evalueze adoptarea atributelor `gen_ai.*` din specificația curentă, în paralel cu păstrarea `cognitive.*` pentru domeniul Cerniq.
2. Orice histogramă nouă pe identificatori de nod trebuie revizuită pentru cardinalitate (conform strategiei v2).

## Criterii de acceptanță (documentare)

- [ ] Matrice atribut: coloană «v2», «cod», «planificat» pentru fiecare cheie `cognitive.*` și `gen_ai.*` relevantă.
- [ ] Verificare după introducerea instrumentării GenAI oficiale (dacă se adoptă).

## Surse externe

- **Semantic Conventions — Gen AI attributes (registry):** [https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) — verificat la **2026-04-11**.
- **OpenTelemetry Specification (overview):** [https://opentelemetry.io/docs/specs/otel/](https://opentelemetry.io/docs/specs/otel/) — verificat la **2026-04-11**.
- **Notă:** v2 citează «semconv v1.40.0»; repo-ul nu declară explicit pachetul `@opentelemetry/semantic-conventions` în `package.json`; **reconciliere:** versiunea efectivă urmează SDK-ul/auto-instrumentări până la pin explicit — v2 rămânețintă de aliniere documentară.

## Limită evidență

- Nu s-au citit configurațiile Grafana/Tempo/Prometheus din mediul de producție; traseul exact «4317/4318 → backend» este **context operațional**, nu extras integral aici.
- Nu s-a auditat fiecare worker pentru apeluri `withCognitiveSpan` vs procesori fără instrumentare.

## Legături

- ADR-0002 (catalog), ADR-0004 (evenimente), [README Cognitive Brain](../../README.md).
