# CERNIQ.APP — Incident Response Runbook (Infra noua)

> **Clasificare:** OPERATIONAL CRITIC  
> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15

## 0) Scope si principii

- Runbook-ul este pentru Cerniq pe infrastructura noua (CT107/108/109/110 + orchestrator).
- Nu facem actiuni care afecteaza alte proiecte (Redis shared / OpenBao / Traefik / iptables) decat daca sunt aprobate ca interventii de infra.
- Secretele nu se scot din OpenBao si nu se scriu in repo.

## 1) Detectare (primele 5 minute)

### 1.1 Confirmare impact

- Ingress: `https://cerniq.app`, `https://api.cerniq.app/health`, `https://admin.cerniq.app`
- Observability (orchestrator): Grafana/Loki/Tempo (Explore)

### 1.2 Verificare rapida pe CT109/CT110 (stack Docker)

```bash
cd /opt/cerniq
docker compose ps
docker compose logs --tail 200 api
docker compose logs --tail 200 worker-enrichment
```

Dependinte in stack (infra noua):

```bash
docker inspect -f '{{.State.Health.Status}}' cerniq-openbao-agent-api cerniq-openbao-agent-workers cerniq-openbao-agent-infra
docker inspect -f '{{.State.Health.Status}}' cerniq-pgbouncer
```

## 2) Clasificare severitate (SEV)

- **SEV-1:** serviciu indisponibil complet / incident de securitate / DB down
- **SEV-2:** functionalitate critica afectata (e-Factura, plati) / backlog critic
- **SEV-3:** degradare (latenta, erori partiale)
- **SEV-4:** minor (glitch, alarme false)

## 3) Containment (minutele 5-15)

Obiectiv: opreste degradarea, reduce blast radius.

Actiuni tipice (CT109/CT110):

```bash
# Restart controlat un singur serviciu (exemplu)
docker compose restart api

# Daca un worker produce erori in cascada
docker compose stop worker-ai
```

> Nota: nu exista `postgres`/`redis` local in stack-ul Cerniq pe CT109/CT110.

## 4) Eradicare (15-60 min)

1. Strangere dovezi:

```bash
cd /opt/cerniq
docker compose logs --since=1h --no-color > /tmp/cerniq-logs-1h.txt
rg -n "error|exception|fatal|timeout|ECONNREFUSED|403|429" /tmp/cerniq-logs-1h.txt | head -200
```

2. Izolare root cause:
- OpenBao agent/policy/route (erori 403, lipsa secrets)
- PgBouncer/DB (erori DB, timeouts)
- Redis shared (timeouts / WRONGPASS / NOPERM)
- Rate limit extern (429)

## 5) Recovery

- Repornire servicii in ordinea: agenti -> infrastructura stack -> aplicatie/workerii.
- Verificari:
  - `docker compose ps` (healthy)
  - endpoints publice raspund
  - Loki: erorile scad

## 6) Post-incident

- RCA scurt (ce s-a intamplat, ce s-a facut, ce prevenim)
- Actiune preventiva (timeout/backoff/limits/alerts)

