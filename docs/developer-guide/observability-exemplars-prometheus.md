# Exemplare Prometheus ↔ trace_id (histograme HTTP)

## Ce este implementat în repo

- Histograma `cerniq_http_request_duration_seconds` și `cerniq_http_client_request_duration_seconds` folosesc `enableExemplars: true` (prom-client 15).
- La observare, dacă există un span activ cu `traceId` valid, se atașează un exemplar cu label `trace_id` (OpenMetrics), pentru corelare cu backend-uri de traces (ex. Tempo/Jaeger) din aceeași observație de bucket.

## Cerințe infrastructură (verificate în mediul vostru)

| Componentă | Versiune minimă orientativă | Notă |
| ---------- | --------------------------- | ---- |
| Prometheus | 2.26+ | suport exemplare pe histograme |
| OpenTelemetry Collector | versiune care expune Prometheus cu exemplare compatibile OpenMetrics 1.0+ | depinde de `exporter` și `metric_expiration` |
| Scraping | `Content-Type` OpenMetrics pentru `/metrics` | prom-client poate emite format cu exemplare |

**ANTI-HALUCINARE:** dacă Prometheus sau scrape-ul sunt mai vechi, exemplarele pot fi ignorate sau omise — comportamentul nu degradează metricile de bază (bucket-uri rămân valide).

## Unde nu folosim aceeași histogramă

- Răspunsuri **SSE** (`text/event-stream`): durata este înregistrată doar în `cerniq_sse_stream_duration_seconds`, nu în histograma HTTP scurtă, pentru a nu contamina SLO-urile de request-uri rapide.
