# Etapa 1 Load Testing (1000 contacts/min)

## Scop

Validare throughput pentru pipeline-ul Etapa 1 la o tinta de **1000 requests/minut** pe trigger-ul de enrichment.

## Prerequisite

- `k6` instalat local sau in CI runner
- API pornit si accesibil (ex: `http://localhost:64010`)
- token JWT valid exportat in `AUTH_TOKEN`

## Rulare

```bash
API_BASE_URL=http://localhost:64010 AUTH_TOKEN="<jwt>" pnpm test:load:etapa1
```

## Praguri

- `http_req_failed < 1%`
- `p95 < 1200ms`
- `p99 < 2500ms`

## Interpretare

- Daca pragurile sunt depasite, investigheaza:
  - rate limiting pe queue-uri externe
  - latenta DB/Redis
  - worker concurrency (`cerniq-worker-enrichment`)
  - backlog pe `pipeline:orchestrate`

## Follow-up recomandat

- ruleaza in staging cu date realiste (batch-uri mari)
- captureaza grafana snapshots pentru queue depth + error rate
- compara baseline la fiecare release major
