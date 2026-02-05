# CERNIQ.APP — ETAPA 0: INDEX DOCUMENTE COMPLETE

## 5 Februarie 2026

---

## DOCUMENTE LIVRATE

### 1. ARHITECTURĂ & DECIZII TEHNICE

| Fișier | Conținut | Linii |
| :--- | :--- | :--- |
| [ADR-uri Etapa 0](../../adr/ADR%20Etapa%200/) | 33 ADRs în directorul `/docs/adr/ADR Etapa 0/` (incl. ADR-0033 OpenBao) | 33 fișiere |
| [Etapa0 plan implementare complet v2.md](etapa0-plan-implementare-complet-v2.md) | 147 Tasks JSON pentru AI agents (completare 100%) | ~5000 |
| [STRATEGIE MONITORIZARE UI.md](STRATEGIE_MONITORIZARE_UI.md) | Viziune și Arhitectură Sistem Monitorizare (Etapa 0-5) | ~300 |

### 2. DOCUMENTE OPERAȚIONALE

| Fișier | Conținut |
| :--- | :--- |
| `etapa0-runbook-operational.md` | Startup, Shutdown, Daily Ops, Troubleshooting, Emergency |
| `etapa0-backup-restore-procedures.md` | BorgBackup, WAL, PITR, Disaster Recovery |
| ~~`etapa0-docker-secrets-guide.md`~~ | **DEPRECATED** → Vezi [OpenBao Setup Guide](../../infrastructure/openbao-setup-guide.md) |
| `etapa0-environment-variables.md` | All env vars by category |
| `etapa0-port-matrix.md` | Port allocation, network topology, firewall |
| `etapa0-health-check-specs.md` | 3-tier health checks implementation |
| `etapa0-logging-standards.md` | Pino config, PII redaction, SigNoz integration |
| `etapa0-testing-strategy.md` | Unit/Integration/E2E tests, coverage requirements |
| `etapa0-monitoring-api-spec.md` | Technical Specs pentru Monitoring API Sidecar |
| `etapa0-structured-log-schemas.md` | JSON Schemas (Zod) pentru loguri standardizate |
| `../infrastructure/pgbouncer-connection-pooling.md` | PgBouncer pooling și limitare conexiuni |
| `../infrastructure/redis-authentication.md` | Redis AUTH și OpenBao secrets |
| `../infrastructure/dns-configuration.md` | DNS records & subdomenii |
| `../infrastructure/github-repository-setup.md` | Repo setup, CODEOWNERS, templates |
| **`../infrastructure/openbao-setup-guide.md`** | **OpenBao centralized secrets management** 🆕 |
| `../infrastructure/secrets-rotation-procedure.md` | Rotație secrete (automată via OpenBao) |

### 3. FIȘIERE CONFIGURARE (De creat în Etapa Implementare)

> **NOTĂ:** Aceste fișiere vor fi generate în timpul fazei de implementare conform task-urilor din planul de implementare.

| Fișier Target | Utilizare |
| :--- | :--- |
| `infra/docker/docker-compose.yml` | Compose file complet |
| `infra/docker/traefik/traefik.yml` | Traefik static config |
| `infra/docker/traefik/dynamic/middlewares.yml` | Traefik dynamic config |
| `infra/docker/config/postgres/postgresql.conf` | PostgreSQL optimized 128GB |
| `infra/docker/config/postgres/init.sql` | Init (extensions, schemas, RLS) |
| `infra/docker/config/otel/otel-collector-config.yaml` | OTel Collector pentru SigNoz |

---

## STATISTICI

- **Total ADRs:** 32
- **Total Tasks:** 147 (20 faze F0.1 → F0.20)
- **Total Documente:** 24 fișiere
- **Dimensiune Totală:** ~350KB

---

## STRUCTURA DIRECTOARE PENTRU DEPLOY

```text
/var/www/CerniqAPP/
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml          ← etapa0-docker-compose-complete.yaml
│   │   └── config/
│   │       ├── traefik/
│   │       │   ├── traefik.yml         ← etapa0-traefik-config.yaml
│   │       │   └── dynamic/
│   │       │       └── middlewares.yml ← etapa0-traefik-middlewares.yaml
│   │       ├── postgres/
│   │       │   ├── postgresql.conf     ← etapa0-postgresql-config.conf
│   │       │   └── init.sql            ← etapa0-postgresql-init.sql
│   │       └── otel/
│   │           └── otel-collector-config.yaml ← etapa0-otel-collector-config.yaml
│   └── scripts/                         ← De creat în implementare (cu referentiere din runbook.md)
│       ├── startup.sh                  
│       ├── shutdown.sh                 
│       ├── backup-daily.sh             
│       └── generate-secrets.sh
├── docs/
│   ├── adr/
│   │   └── ADR Etapa 0/        ← ADRs numerotate (ADR-0001...ADR-0032)
│   └── specifications/
│       └── Etapa 0/            ← Specificatiile curente
│           ├── etapa0-runbook-operational.md
│           ├── etapa0-port-matrix.md
│           └── ...
└── secrets/                            ← Generate cu scripts
    ├── postgres_password
    ├── jwt_secret
    └── ...
```

---

## NEXT STEPS

1. ✅ **Citește ADRs** pentru context decizii in [/var/www/CerniqAPP/docs/adr]
2. ✅ **Urmează Plan Implementare** task cu task
3. ✅ **Deploy configs** în directoarele corecte
4. ✅ **Generează secrets** cu scripturile din guide
5. ✅ **Start stack** cu procedura din runbook

---

**Document generat:** 1 Februarie 2026  
**Sursă de adevăr:** Master Spec v1.2
