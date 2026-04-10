# Instrumentare HTTP / Fastify cu OpenTelemetry — ghid enterprise (Cerniq, aprilie 2026)

Acest document descrie **implementarea de referință** din monorepo pentru telemetrie pe serverul HTTP principal (`apps/api`): **traces** și **metrici** OTLP, **propagare** standard, **instrumentare oficiale Fastify** (`@fastify/otel`) și **instrumentare HTTP Node** (`@opentelemetry/instrumentation-http`), aliniate la practicile OpenTelemetry și la convențiile semantice stabilizate pentru HTTP. Scopul este **observabilitate producție**: corelare trace ↔ metrică ↔ log, control al costului (sampling, filtre), și absența surprizelor la încărcarea modulelor.

---

## 1. Principii (standarde industrie, 2025–2026)

1. **Un singur SDK per proces** — `NodeSDK` din `@opentelemetry/sdk-node`, pornit **odată**, înainte de încărcarea `fastify`.
2. **Semantic conventions (SemConv)** — span-urile HTTP și Fastify populate de instrumentări oficiale folosesc atribute standard (`http.request.method`, `http.route`, `http.response.status_code`, `url.scheme`, `server.address` unde e cazul). Nu duplicați manual aceste atribute în handler-e decât pentru cazuri excepționale documentate.
3. **Propagare explicită** — `tracecontext` + `baggage` W3C implicit; **B3** opțional pentru ecosisteme legacy (Envoy vechi, unii load balancer-e). Configurare prin `OTEL_PROPAGATORS`.
4. **Cardinalitate controlată** — label-urile Prometheus (`prom-client`) din `plugins/metrics.ts` folosesc **șablonul de rută** (`httpRouteLabel`), nu URL brut. OTel evită ID-uri utilizator în atribute de span.
5. **Două pipeline-uri de metrici conștiente**:
   - **Prometheus** (pull `/metrics`) — RED pe aplicație, compatibil Grafana/Prometheus existent.
   - **OTLP metrics** (push către collector) — același model de serviciu ca traces; aliniere `service.name` / `service.version` / `deployment.environment` pe **Resource**.
6. **Fastify oficial** — `@fastify/otel` înlocuiește pachetul deprecat `@opentelemetry/instrumentation-fastify`. Menținut de echipa Fastify; acoperă hook-uri (`onRequest` … `onError`) și 404-uri custom.
7. **HTTP instrumentation** — necesară pentru legătura span-ului **server HTTP** (socket) cu lumea Node; `@fastify/otel` lucrează împreună cu ea pentru propagare end-to-end.

---

## 2. Flux de pornire obligatoriu (critic pentru corectitudine)

JavaScript evaluează **importurile statice înainte** de codul din fișier. Dacă `index.ts` conține `import { buildApp } from "./app.js"` **înainte** de `initTelemetry()`, modulul `fastify` este încărcat **înainte** ca SDK-ul să înregistreze `FastifyOtelInstrumentation` cu `registerOnInitialization: true` → instrumentarea poate fi **incompletă sau absentă**.

**Soluția din repo:**

<table>
<thead>
<tr><th>Fișier</th><th>Rol</th></tr>
</thead>
<tbody>
<tr>
<td><code>apps/api/src/index.ts</code></td>
<td>Doar <code>config</code>, <code>initTelemetry</code>, migrații dev, apoi <code>await import("./server-runtime.js")</code> (dinamic).</td>
</tr>
<tr>
<td><code>apps/api/src/server-runtime.ts</code></td>
<td>Tot ce trage <code>fastify</code> indirect: <code>buildApp</code>, <code>listen</code>, semnale, reload secrets.</td>
</tr>
</tbody>
</table>

Orice serviciu nou (workers HTTP, `monitoring-api`) trebuie să respecte același pattern: **SDK înainte de primul import static al Fastify**.

---

## 3. Ce face `packages/observability/src/init.ts`

La apel (cu endpoint OTLP configurat și fără `OTEL_SDK_DISABLED=true`):

1. **Resource** — `service.name`, `service.version`, `deployment.environment`.
2. **Trace exporter** — OTLP HTTP, URL rezolvat din `OTEL_EXPORTER_OTLP_ENDPOINT` sau `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` (normalizare `…/v1/traces`).
3. **Metric exporter** — OTLP HTTP către `…/v1/metrics` (override dedicat prin `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` dacă e nevoie).
4. **Metric reader** — `PeriodicExportingMetricReader`, interval `OTEL_METRIC_EXPORT_INTERVAL` (ms, implicit 60000).
5. **Sampler** — `ParentBasedSampler` cu rădăcină conform `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` (vezi tabel).
6. **Propagator** — `CompositePropagator`: W3C Trace Context, Baggage, opțional B3 multi-header dacă `OTEL_PROPAGATORS` conține `b3`.
7. **Instrumentări** (în ordine relevantă):
   - `FastifyOtelInstrumentation({ registerOnInitialization: true, recordExceptions: true, ignorePaths })` — exclude rute infrastructură (`/metrics`, `/health`, `/docs`, `/documentation`, `/`).
   - `HttpInstrumentation` — `ignoreIncomingRequestHook` pentru aceleași căi infrastructură (evită zgomot și cost).
   - `getNodeAutoInstrumentations({ … })` cu **dezactivate** `http` (evită dublare), `fs`, `dns`, `net` (zgomot). Păstrate: **Undici**, **ioredis**, **pg**, etc., după ce librăriile sunt folosite în proces.

8. **Diag** — dacă `OTEL_LOG_LEVEL` este setat, logger de diagnostic OTel pe consolă (util la depanarea exportului).

---

## 4. Variabile de mediu (referință)

<table>
<thead>
<tr><th>Variabilă</th><th>Rol</th><th>Note</th></tr>
</thead>
<tbody>
<tr>
<td><code>OTEL_EXPORTER_OTLP_ENDPOINT</code></td>
<td>Bază OTLP (HTTP)</td>
<td>Ex: <code>https://otel-cerniq.example:4318</code> — fără <code>/v1/traces</code>.</td>
</tr>
<tr>
<td><code>OTEL_EXPORTER_OTLP_TRACES_ENDPOINT</code></td>
<td>URL complet sau bază traces</td>
<td>Dacă nu conține <code>/v1/traces</code>, se concatenează.</td>
</tr>
<tr>
<td><code>OTEL_EXPORTER_OTLP_METRICS_ENDPOINT</code></td>
<td>URL metrics</td>
<td>Idem pentru <code>/v1/metrics</code>.</td>
</tr>
<tr>
<td><code>OTEL_METRIC_EXPORT_INTERVAL</code></td>
<td>Interval export metrici (ms)</td>
<td>Implicit 60000.</td>
</tr>
<tr>
<td><code>OTEL_SDK_DISABLED</code></td>
<td><code>true</code> → fără SDK</td>
<td>Teste locale, debugging.</td>
</tr>
<tr>
<td><code>OTEL_PROPAGATORS</code></td>
<td>Listă separată prin virgulă</td>
<td>Ex: <code>tracecontext,baggage,b3multi</code> (B3 dacă e cazul).</td>
</tr>
<tr>
<td><code>OTEL_TRACES_SAMPLER</code></td>
<td><code>always_on</code>, <code>always_off</code>, <code>traceidratio</code>, <code>parentbased_traceidratio</code></td>
<td>Aliniat uzului comun OTel.</td>
</tr>
<tr>
<td><code>HOSTNAME</code></td>
<td>Identitate gazdă (opțional)</td>
<td>Folosit pe Resource ca <code>host.name</code> dacă e setat; altfel <code>os.hostname()</code>.</td>
</tr>
<tr>
<td><code>OTEL_SEMCONV_HTTP_SERVER_ADDRESS</code></td>
<td>Adresă logică server HTTP</td>
<td>Trecut la <code>HttpInstrumentation({ serverName })</code> pentru atribute tip <code>server.address</code> pe span-uri de intrare.</td>
</tr>
<tr>
<td><code>OTEL_TRACES_SAMPLER_ARG</code></td>
<td>Rata pentru sampler ratio</td>
<td>String numeric 0–1.</td>
</tr>
<tr>
<td><code>OTEL_LOG_LEVEL</code></td>
<td><code>none</code>, <code>error</code>, <code>warn</code>, <code>info</code>, <code>debug</code>, <code>verbose</code></td>
<td>Diagnostic SDK.</td>
</tr>
<tr>
<td><code>APP_VERSION</code></td>
<td><code>service.version</code> pe resource</td>
<td>Versiune deploy.</td>
</tr>
<tr>
<td><code>NODE_ENV</code></td>
<td><code>deployment.environment</code></td>
<td></td>
</tr>
</tbody>
</table>

---

## 5. Integrare cu loguri și erori (API)

- **Log acces** (`plugins/request-logging.ts`) — include `traceId` / `spanId` din contextul activ (`trace.getActiveSpan()`), `httpRoute` din șablon, `correlationId` (`x-correlation-id`).
- **Handler erori** (`errors/handler.ts`) — `enrichError` din `@cerniq/observability`, `span.setStatus(ERROR)`, `span.recordException`, câmpuri structurate (`errorFingerprint`, `causeChain`).

Corelare în backend (Grafana / Tempo / Loki): filtrați după `trace_id` din logs sau după `errorFingerprint` pentru agregări.

---

## 5b. Manifest rute HTTP (audit CI)

Lista canonică **metodă + cale + fișier sursă** (inclusiv alias `/negotiation` / `/negotiations`) este generată din cod: `docs/generated/api-http-route-manifest.json`. Regenerare: `pnpm audit:http-route-manifest:write`. **Definition of Done** pe tier-uri (T1–T3): [`http-route-manifest-dod.md`](http-route-manifest-dod.md).

---

## 6. Prometheus (`prom-client`) vs OTLP metrics

<table>
<thead>
<tr><th>Aspect</th><th><code>cerniq_http_*</code> (Fastify)</th><th>OTLP (SDK)</th></tr>
</thead>
<tbody>
<tr>
<td>Scop</td>
<td>Scraping intern, alerte existente</td>
<td>Export către collector / vendor</td>
</tr>
<tr>
<td>Cardinalitate</td>
<td>Controlată (<code>route</code> = șablon)</td>
<td>Depinde de instrumentări; evitați atribute cu ID-uri</td>
</tr>
<tr>
<td>Service identity</td>
<td>Nu (doar proces)</td>
<td>Da — Resource identic cu traces</td>
</tr>
</tbody>
</table>

**Recomandare:** păstrați ambele până la o decizie ADR explicită de unificare prin collector (remote write / exemplars). Documentați costul dublu de serie temporară dacă păstrați ambele pe termen lung.

---

## 7. Exemplare (exemplars) și histogramă

Detalii despre implementarea din repo (`enableExemplars`, label `trace_id`, cerințe Prometheus 2.26+): [`observability-exemplars-prometheus.md`](./observability-exemplars-prometheus.md).

Legătura **Prometheus exemplars** ↔ **trace_id** depinde de versiunea Prometheus și de modul în care `prom-client` expune exemplars pentru histogramă. Înainte de a promite exemplars în producție: validați stack-ul (Prometheus 2.x+, config scrape) și versiunea `prom-client`. OTel Metrics OTLP poate transporta exemplare către un backend compatibil — verificați suportul în collectorul vostru.

---

## 8. Securitate și conformitate

- Nu injectați token-uri sau PII în atribute de span sau în `baggage`.
- Header-e de propagare (`traceparent`) sunt **opace** pentru aplicație; nu le logați la nivel debug în medii partajate fără politică.
- **CSP** — dacă adăugați domenii noi pentru export OTLP din browser (rar pentru API), actualizați `CSP_CONNECT_SRC_EXTRA` (vezi `config.ts`).

---

## 9. Performanță

- Auto-instrumentările au cost non-nul; setul din `init.ts` exclude `fs`/`dns`/`net` pentru a reduce overhead-ul.
- Creșteți `OTEL_METRIC_EXPORT_INTERVAL` în medii cu foarte multe serii dacă collectorul este sensibil la volum.
- Folosiți **sampling** în producție pentru trafic mare; păstrați **100%** pe rute critice prin politici dedicate (head-based + reguli collector sau viitor `Sampler` custom).

---

## 10. Troubleshooting

<table>
<thead>
<tr><th>Simptom</th><th>Verificare</th></tr>
</thead>
<tbody>
<tr>
<td>Nu apar span-uri în Tempo</td>
<td><code>OTEL_EXPORTER_OTLP_ENDPOINT</code>, firewall, TLS, <code>OTEL_SDK_DISABLED</code>, ordinea bootstrap</td>
</tr>
<tr>
<td>Span-uri duble sau lipsă pe Fastify</td>
<td>Asigurați-vă că **nu** există import static <code>fastify</code> înainte de <code>initTelemetry</code></td>
</tr>
<tr>
<td>Lipsă părinte pentru outbound HTTP</td>
<td>Verificați că Undici/fetch rulează în același context async; propagator W3C activ</td>
</tr>
<tr>
<td>Prea multe span-uri pe <code>/health</code></td>
<td>Ar trebui filtrate de <code>ignorePaths</code> / <code>ignoreIncomingRequestHook</code>; verificați prefixele</td>
</tr>
</tbody>
</table>

---

## 11. Referințe oficiale (actualizate continuu)

- [OpenTelemetry — Instrumenting Node.js](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [Semantic Conventions — HTTP](https://opentelemetry.io/docs/specs/semconv/http/)
- [Fastify — @fastify/otel](https://github.com/fastify/fastify-otel)
- [Environment specification](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)

---

## 12. Legătură cu infrastructura Cerniq

Stack-ul orchestrator (Grafana, Prometheus, Loki, Tempo, collector OTLP) este sumarizat în [`docs/infrastructure/observability-stack.md`](../infrastructure/observability-stack.md). Endpoint-urile OTLP locale (gRPC/HTTP) trebuie să corespundă cu valorile din `OTEL_EXPORTER_OTLP_*` pentru fiecare mediu.

---

*Ultima actualizare: aliniat la implementarea din `packages/observability/src/init.ts`, `apps/api/src/index.ts` și `apps/api/src/server-runtime.ts`.*
