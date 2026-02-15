# CERNIQ.APP — OpenBao Setup Guide (Infrastructura noua)

> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15  
> **Referinta ADR:** `docs/adr/ADR Etapa 0/ADR-0033-OpenBao-Secrets-Management.md`

## 1) Scope

Acest ghid descrie integrarea OpenBao pentru Cerniq in arhitectura curenta:

- **OpenBao server**: ruleaza centralizat pe orchestrator, acces prin HTTPS :443 (Traefik).
- **CT109/CT110/CT108**: ruleaza doar **OpenBao agents** (template rendering + token renew).
- Secretele sunt consumate ca fisiere runtime (preferabil tmpfs), nu ca “.txt in repo”.

## 2) Endpoint-uri / variabile

- `OPENBAO_ADDR` (exemplu): `https://s3cr3ts.neanelu.ro`
- KV mount: `secret/` (KV v1) cu path-uri sub `secret/cerniq/...`
- Database secrets engine: mount dedicat `cerniq-db/`

## 3) Configurare (orchestrator) — Cerniq-only, aditiv

Configurarea se face folosind scripturile din repo (nu init/unseal local):

- `infra/scripts/openbao-setup-engines.sh`
- `infra/scripts/openbao-setup-database.sh`
- `infra/scripts/openbao-setup-approle.sh`

Politicile sunt in:

- `infra/config/openbao/policies/*.hcl`

Template-urile sunt in:

- `infra/config/openbao/templates/*.tpl`

> Nota: scripturile sunt scrise sa nu modifice mount-uri shared existente (principiu “strict aditiv”).

## 4) Configurare agenti (CT109/CT110)

In stack-ul Docker Cerniq (CT109/CT110) exista:

- `openbao-agent-api`
- `openbao-agent-workers`
- `openbao-agent-infra`

Fisiere:

- agent configs: `infra/config/openbao/agent-*.hcl`
- AppRole credentials: `/opt/cerniq/secrets/*_role_id` si `/opt/cerniq/secrets/*_secret_id`
- output runtime secrets: `/run/cerniq/runtime-secrets/{api,workers,infra}/`

Verificare:

```bash
cd /opt/cerniq
docker compose ps
docker inspect -f '{{.State.Health.Status}}' cerniq-openbao-agent-api cerniq-openbao-agent-workers cerniq-openbao-agent-infra

ls -la /run/cerniq/runtime-secrets/api || true
ls -la /run/cerniq/runtime-secrets/workers || true
ls -la /run/cerniq/runtime-secrets/infra || true
```

## 5) Test rapid (fara expunere de secrete)

- Server health:

```bash
curl -fsS "${OPENBAO_ADDR}/v1/sys/health" >/dev/null
```

- DB dynamic creds (admin pe orchestrator):

```bash
bao read cerniq-db/creds/api-dynamic >/dev/null
```

## 6) Anti-patterns (interzise)

- Nu folosim OpenBao local expus pe porturi gen `64090`.
- Nu stocam `root token` / `unseal keys` in repo.
- Nu hardcodam parole in documentatie; folosim OpenBao + agent templates.

