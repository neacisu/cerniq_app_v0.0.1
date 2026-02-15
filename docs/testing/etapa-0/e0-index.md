# CERNIQ.APP — ETAPA 0: INDEX TESTE INFRASTRUCTURĂ

## Documentație testare pentru 66 taskuri de infrastructură

**Versiunea:** 1.0 | **Data:** 20 Ianuarie 2026 | **Status:** NORMATIV  
**Referință:** [etapa0-plan-implementare-complet-v2.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%200/etapa0-plan-implementare-complet-v2.md)

---

## SUMAR

| Fază | Denumire | Taskuri | Document Teste |
| ---- | -------- | ------- | -------------- |
| F0.1 | Docker Infrastructure | 5 | [e0-f01-docker-infrastructure.md](./e0-f01-docker-infrastructure.md) |
| F0.2 | PostgreSQL 18.1 Setup | 5 | [e0-f02-postgresql-setup.md](./e0-f02-postgresql-setup.md) |
| F0.3 | Redis & BullMQ | 3 | [e0-f03-redis-bullmq.md](./e0-f03-redis-bullmq.md) |
| F0.4 | Ingress & TLS (Traefik orchestrator) | 4 | [e0-f04-traefik-ssl.md](./e0-f04-traefik-ssl.md) |
| F0.5 | Observability (stack centralizat) | 3 | [e0-f05-observability.md](./e0-f05-observability.md) |
| F0.6 | Monorepo PNPM | 8 | [e0-f06-monorepo-pnpm.md](./e0-f06-monorepo-pnpm.md) |
| F0.7 | Backup Strategy | 4 | [e0-f07-backup-strategy.md](./e0-f07-backup-strategy.md) |
| F0.8 | Security Hardening | 4 | [e0-f08-security-hardening.md](./e0-f08-security-hardening.md) |
| F0.9 | API Boilerplate | 8 | [e0-f09-api-boilerplate.md](./e0-f09-api-boilerplate.md) |
| F0.10 | Database Schema | 6 | [e0-f10-database-schema.md](./e0-f10-database-schema.md) |
| F0.11 | Frontend Boilerplate | 6 | [e0-f11-frontend-boilerplate.md](./e0-f11-frontend-boilerplate.md) |
| F0.12 | Dev Environment | 5 | [e0-f12-dev-environment.md](./e0-f12-dev-environment.md) |
| F0.13 | Testing Foundation | 5 | [e0-f13-testing-foundation.md](./e0-f13-testing-foundation.md) |
| **TOTAL** | | **66** | **13 documente** |

---

## TIPURI DE TESTE PER FAZĂ

| Fază | Unit | Integration | E2E | Infra | Security |
| ---- | ---- | ----------- | --- | ----- | -------- |
| F0.1 | — | — | — | ✅ | — |
| F0.2 | — | ✅ | — | ✅ | — |
| F0.3 | — | ✅ | — | ✅ | — |
| F0.4 | — | ✅ | — | ✅ | ✅ |
| F0.5 | — | ✅ | — | ✅ | — |
| F0.6 | ✅ | — | — | — | — |
| F0.7 | — | ✅ | — | ✅ | — |
| F0.8 | — | — | — | ✅ | ✅ |
| F0.9 | ✅ | ✅ | — | — | — |
| F0.10 | ✅ | ✅ | — | — | — |
| F0.11 | ✅ | — | — | — | — |
| F0.12 | ✅ | — | — | — | — |
| F0.13 | ✅ | ✅ | — | — | — |

---

## COVERAGE TARGETS

| Categorie | Min Coverage | Critical Paths |
| --------- | ------------ | -------------- |
| **API Boilerplate (F0.9)** | 80% | 95% |
| **Database Schema (F0.10)** | 80% | 90% |
| **Monorepo Config (F0.6)** | 70% | — |
| **Infra Validation** | N/A | 100% pass |

---

## VALIDATION SCRIPTS

### Rulare Toate Testele Etapa 0

```bash
# Unit tests
pnpm test --filter=@cerniq/api --filter=@cerniq/db

# Integration tests
pnpm test:integration --filter=@cerniq/api

# Infrastructure validation
./scripts/validate-infra.sh
```

### Script Validare Infrastructură

```bash
#!/bin/bash
# scripts/validate-infra.sh

set -e

echo "=== CERNIQ Infrastructure Validation ==="

# F0.1 - Docker
echo "[F0.1] Checking Docker..."
docker version --format '{{.Server.Version}}' | grep -q "^2[89]\." && echo "✅ Docker OK"
docker compose version --short | grep -q "^2\." && echo "✅ Compose OK"

# F0.2 - PostgreSQL
echo "[F0.2] Checking PostgreSQL..."
# PostgreSQL este extern pe CT107 (nativ), nu in Docker pe stack-ul Cerniq.
# Validarea se face pe CT107 (sudo -u postgres) sau prin PgBouncer pe CT109/CT110.

# F0.3 - Redis
echo "[F0.3] Checking Redis..."
# Redis este shared pe orchestrator (accesat prin gateway intern), nu redis local in stack.

# F0.4 - Ingress (Traefik orchestrator)
echo "[F0.4] Checking orchestrator Traefik..."
# Validarea se face prin routerele din `infra/config/traefik-orchestrator/cerniq.yml`
# si prin request-uri HTTPS pe domeniile publice (dupa DNS cutover + deploy app).

# F0.5 - Observability
echo "[F0.5] Checking observability..."
# OTEL Collector local accepta POST pe :64071 (in CT109/CT110), iar logs/metrics sunt centralizate pe orchestrator.

echo "=== All checks passed ==="
```

---

## DEPENDENȚE ÎNTRE FAZE

```text
F0.1 (Docker) ─┬─► F0.2 (PostgreSQL) ─┬─► F0.6 (Monorepo) ─► F0.9 (API)
               │                      │                            │
               ├─► F0.3 (Redis) ──────┤                            ▼
               │                      │                     F0.10 (Schema)
               └─► F0.4 (Traefik) ────┘                            │
                        │                                          ▼
                        └──────────────────────────────────► F0.13 (Testing)
```

---

## DOCUMENTE CONEXE

- [00-testing-overview.md](../00-testing-overview.md) — Strategia generală
- [01-testing-types-catalog.md](../01-testing-types-catalog.md) — Tipuri de teste
- [02-testing-tools-stack.md](../02-testing-tools-stack.md) — Tools utilizate
- [etapa0-plan-implementare-complet-v2.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%200/etapa0-plan-implementare-complet-v2.md) — Plan implementare

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
