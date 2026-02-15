# CERNIQ.APP — OpenBao Recovery Runbook (Orchestrator)

> **Clasificare:** OPERATIONAL CRITIC  
> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15  
> **Target:** OpenBao centralizat pe orchestrator (Traefik HTTPS :443)

## 0) Principii (obligatoriu)

- OpenBao **server** ruleaza doar pe orchestrator (nu exista OpenBao server local in stack-ul Cerniq).
- CT109/CT110/CT108 ruleaza doar **OpenBao agents** (template rendering, token renew).
- Unseal keys / root token / passphrase backup **NU se stocheaza in repo**.

## 1) Date utile

- Endpoint: `OPENBAO_ADDR` (ex: `https://s3cr3ts.neanelu.ro`)
- Acces admin: doar prin SSH pe orchestrator + `bao` CLI

## 2) Scenario: OpenBao este sealed

Pe orchestrator:

```bash
export BAO_ADDR="https://s3cr3ts.neanelu.ro"
bao status
```

Daca `Sealed: true`, unseal se face cu pragul configurat (ex: 3-of-5), folosind cheile stocate in afara repo-ului:

```bash
bao operator unseal
bao operator unseal
bao operator unseal
```

Verificare:

```bash
bao status
```

## 3) Scenario: Agentii de pe CT109/CT110 nu mai pot autentifica

Pe CT109/CT110:

```bash
cd /opt/cerniq
docker compose ps
docker logs cerniq-openbao-agent-api --tail 50
docker logs cerniq-openbao-agent-workers --tail 50
docker logs cerniq-openbao-agent-infra --tail 50
```

Semne uzuale:
- `403` / policy mismatch
- `connection refused` / routing (gateway) / DNS
- secrets nu se mai randeaza (`/secrets/api.env` lipsa)

Actiuni sigure:
- verifica conectivitatea la `OPENBAO_ADDR` (HTTPS) din CT:

```bash
curl -fsS "${OPENBAO_ADDR}/v1/sys/health" >/dev/null
```

- restart agentii (fara a atinge serverul OpenBao):

```bash
docker compose restart openbao-agent-api openbao-agent-workers openbao-agent-infra
```

## 4) Scenario: Restaurare din snapshot (Raft)

Acesta este un scenariu de DR pe orchestrator, executat doar daca exista snapshot valid.

Pasii depind de modul concret in care snapshot-urile sunt generate/stocate pe orchestrator.
Recomandare (in spiritul “shared infra”):
- snapshot-urile se fac pe orchestrator si se stocheaza offsite (StorageBox) cu criptare.
- restore se face doar in fereastra de mentenanta, cu impact comunicat.

Verificari post-restore (fara a afisa secrete in log-uri):

```bash
bao status
bao auth list
bao secrets list

# Health checks pentru path-uri Cerniq (doar existence, nu dump valori)
bao read cerniq-db/config/cerniq-postgres >/dev/null
bao kv get -mount=secret cerniq/shared/_bootstrap >/dev/null 2>&1 || true
```

## 5) Verificare post-incident (Cerniq)

Pe CT109/CT110:

```bash
docker inspect -f '{{.State.Health.Status}}' cerniq-openbao-agent-api cerniq-openbao-agent-workers cerniq-openbao-agent-infra
test -f /run/cerniq/runtime-secrets/api/api.env || true
test -f /run/cerniq/runtime-secrets/workers/workers.env || true
test -f /run/cerniq/runtime-secrets/infra/pgbouncer.ini || true
```

