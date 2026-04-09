# Chaos Engineering — Playbook Cerniq (Pumba)

**Scop:** validare empirică a rezilienței (Redis HA, PgBouncer, latență rețea, presiune worker) pe **staging** sau mediu dedicat — **nu pe producție** fără Game Day aprobat.

## Instalare Pumba

1. **Binar** (recomandat pe host-ul care rulează Docker): [gaia-adm/pumba](https://github.com/gaia-adm/pumba) — `pumba` în `PATH`.
2. **Docker** (fără binar local): imaginea `gaiaadm/pumba`; scriptul `tests/chaos/run-chaos-test.sh` montează `docker.sock` și folosește `--entrypoint /pumba` (compatibil cu CLI 1.0.x).
3. **Verificare:** `docker run --rm --entrypoint /pumba gaiaadm/pumba --version`

## Artefacte repo

| Artefact | Rol |
|----------|-----|
| `tests/chaos/pumba-scenarios.yml` | Metadate scenarii + `container_name` aliniat cu `infra/docker/docker-compose.yml` |
| `tests/chaos/run-chaos-test.sh` | Precondiții Docker, execuție scenariu, snapshot opțional Prometheus |
| `workers/shared/src/circuit-breaker.ts` | Metrici `cerniq_circuit_breaker_*` (corelate cu latență / eșecuri upstream) |
| `infra/config/prometheus/infra-cerniq-alerts.yml` | Alerte de monitorizat în timpul / după injecție |
| `infra/scripts/disaster_recovery_full.sh` | Rollback / recovery la nivel infrastructură (folosit post-incident, nu înlocuiește unpause automat) |

## Game Day — procedură

1. **Planificare:** fereastră de mentenanță, echipă on-call, acces la Grafana/Prometheus și la Docker pe host.
2. **Baseline:** export snapshot metrici (`up`, cozi BullMQ, latență API, `cerniq_circuit_breaker_open`).
3. **Comunicare:** canal dedicat (status page intern dacă există).
4. **Execuție:** un singur scenariu per rundă; rulare din repo:
   ```bash
   chmod +x tests/chaos/run-chaos-test.sh
   ./tests/chaos/run-chaos-test.sh redis-kill
   ```
5. **Observație:** corelare timp injecție ↔ spike metrici ↔ alerte (vezi `infra-cerniq-alerts.yml`).
6. **Post-verificare:** health containere, probe API, cozi goale sau lag acceptabil, fără date pierdute.
7. **Post-mortem:** documentare durată indisponibilitate, acțiuni corrective (thresholds, retry, circuit breaker).

Variabilă opțională: `PROMETHEUS_URL` (implicit `http://localhost:9090`) pentru `curl` în script.

## Blast radius pe scenariu

| ID | Țintă | Impact principal | Mitigare |
|----|--------|------------------|----------|
| `redis-kill` | `cerniq-redis-master` | Pierdere temporară cache/queue; failover Sentinel | Politici restart compose; worker reconnect BullMQ |
| `pgbouncer-pause` | `cerniq-pgbouncer` | API/DB prin pool indisponibil | Unpause automat la sfârșitul duratei Pumba; verificare conexii |
| `worker-enrichment-net-delay` | `cerniq-worker-enrichment` | Joburi lente, timeouts | Circuit breaker, retry idempotent |
| `worker-enrichment-stress` | `cerniq-worker-enrichment` | CPU/mem ridicat, posibil restart | Healthcheck, scalare orizontală dacă e cazul |

**Notă:** „disk full” și „network partition” complete între zone nu sunt acoperite de scenariile curente YAML — pot fi adăugate ca Game Day separat (ex. volum test, iptables — vezi `pumba iptables` în upstream).

## Rollback / recuperare

1. **Pauză PgBouncer:** Pumba oprește pauza după `--duration`; dacă stă agățat: `docker unpause cerniq-pgbouncer` (vezi și `docs/testing/cross-cutting/cc-chaos-tests.md`).
2. **Netem:** expiră după durată; verifică conectivitate: `docker exec` + `ping` între servicii.
3. **Redis kill:** lăsați Sentinel/replica să refacă topologia; verificați `docker ps` și loguri Redis.
4. **Stress:** oprește după durată; dacă containerul e neregulat: `docker compose restart cerniq-worker-enrichment` (din directorul compose corect).
5. **DR complet:** `infra/scripts/disaster_recovery_full.sh` conform runbook-ului intern (backup/restore).

## Anti-patterns

- Rulare chaos pe producție fără aprobare și fără observabilitate.
- Presupunerea că reconectarea workerilor este mereu `<10s` — măsurați pe staging.
- Lipsa unui baseline Prometheus înainte de injecție (imposibil de demonstrat „spike” fără).

---

*Ultima actualizare: aprilie 2026 — aliniat la Pumba CLI 1.0.x și `container_name` din `docker-compose.yml`.*
