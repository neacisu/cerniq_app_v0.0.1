# CERNIQ.APP — Redis Incident / Failover Runbook (Redis shared pe orchestrator)

> **Clasificare:** OPERATIONAL  
> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15  
> **Target:** Redis shared pe orchestrator (izolat prin ACL + prefix `cerniq:`)

## 0) Context

- In infrastructura noua, Cerniq NU ruleaza Redis local pe CT109/CT110.
- Redis ruleaza ca serviciu shared pe orchestrator (fara expunere publica).
- Izolarea intre proiecte se face prin:
  - ACL user dedicat (`cerniq`)
  - key prefix/pattern (ex: `cerniq:*`)

## 1) Diagnosticare rapida (non-destructiv)

Pe CT109/CT110, foloseste `REDIS_URL` randat de OpenBao Agent (nu hardcoda parola):

```bash
cd /opt/cerniq
docker compose ps

# Daca ai REDIS_URL in runtime env (api.env/workers.env), testeaza PING:
redis-cli -u "$REDIS_URL" PING
```

Daca nu ai `redis-cli` pe host, ruleaza dintr-un container care il are (sau foloseste `docker exec` in containerul aplicatiei, daca exista).

## 2) Semne si cauze frecvente

- `ECONNREFUSED` / timeout: problema de conectivitate (gateway/iptables) sau Redis down pe orchestrator
- `WRONGPASS` / `NOPERM`: ACL/credentiale gresite (OpenBao template / secret rotit)
- `OOM`: maxmemory atins pe Redis shared; poate afecta si alte proiecte

## 3) Remediere (siguranta pe shared infra)

### A) Probleme de credentiale (cel mai frecvent)

1. Verifica agentii OpenBao sunt `healthy`:

```bash
docker inspect -f '{{.State.Health.Status}}' cerniq-openbao-agent-api cerniq-openbao-agent-workers
```

2. Re-randeaza secrets (restart agent):

```bash
docker compose restart openbao-agent-api openbao-agent-workers
```

3. Re-test `PING`.

### B) Redis down pe orchestrator

Acesta este un incident de infrastructura shared. Nu executa comenzi destructive din CT-uri.
Escalare: operator orchestrator verifica `redis-shared` si resursele host-ului.

Verificare pe orchestrator (exemple, doar pentru admin):

```bash
docker ps | rg 'redis-shared'
docker logs redis-shared --tail 200
docker exec redis-shared redis-cli PING
```

### C) OOM / maxmemory atins

Evita comenzi de tip `FLUSHDB` / `FLUSHALL` pe Redis shared (ar afecta toate proiectele).

Actiuni recomandate:
- Identificare top keys (prefix `cerniq:`) si reducere retentie in aplicatie/BullMQ.
- Ajustare `maxmemory` si/sau politica (doar prin schimbarea config + restart controlat).
- Daca e necesar cleanup, trebuie facut scoped pe prefix `cerniq:` si doar dupa aprobarea operatorului de infra.

## 4) Post-incident checklist

- [ ] API si workerii nu mai au erori Redis in logs
- [ ] `redis-cli -u "$REDIS_URL" PING` returneaza `PONG`
- [ ] Nu exista spike de `failed` jobs in BullMQ (daca aplicatia e deployata)
- [ ] Observability: verifica Loki pentru erori (labels `project="cerniq"`)

