# CERNIQ.APP — Tempo restart investigation

> **Clasificare:** OPERATIONAL / OBSERVABILITY  
> **Target:** Orchestrator (Tempo rulează alături de Grafana, Loki, Prometheus)

## Scop

Când se raportează un restart recent al containerului Tempo, urmează pașii de mai jos pe orchestrator (hostul unde rulează stack-ul observability).

## Pași

1. **Conectare pe orchestrator** (ex. hostul unde rulează `traefik`, `grafana`, `loki`, `tempo`).

2. **Status și restarts:**

   ```bash
   docker ps -a --filter name=tempo --format '{{.Names}} {{.Status}}'
   docker inspect tempo -f '{{.State.Status}} restarts={{.RestartCount}}'
   ```

3. **Loguri (ultimele linii, apoi eventual ultimele 500):**

   ```bash
   docker logs tempo --tail 200 2>&1
   docker logs tempo --since 1h 2>&1 | tail -500
   ```

4. **Cauze frecvente:** OOM kill, eroare de configurare, dependență (ex. storage) indisponibilă. Caută în loguri: `OOM`, `error`, `fatal`, `panic`, `connection refused`.

5. **Verificare sănătate:** dacă Tempo expune endpoint de health (ex. `:3200/ready`), testează din rețea internă.

6. **Remediere:** după identificarea cauzei, corectează config/resurse sau repornește: `docker start tempo` sau `docker compose up -d tempo`.

## Referințe

- `infra/scripts/preflight_extins_orchestrator.sh` — listează status pentru tempo și alte containere observability.
- OTEL Collector trimite trace-uri către Tempo; verifică și `docker logs otel-collector` dacă trace-urile nu ajung.
