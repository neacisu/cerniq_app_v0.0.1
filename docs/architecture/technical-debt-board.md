# CERNIQ.APP — Technical Debt Board

## Tracking și Prioritizare Technical Debt

**Versiune:** 1.0  
**Data:** 20 Ianuarie 2026  
**Sursă:** [Risks and Technical Debt](./risks-and-technical-debt.md)

---

## DASHBOARD SUMAR

| Categorie | Open | In Progress | Resolved | Total |
| --------- | ---- | ----------- | -------- | ----- |
| Architecture | 4 | 0 | 0 | 4 |
| Infrastructure | 3 | 0 | 0 | 3 |
| Documentation | 6 | 2 | 0 | 8 |
| Testing | 2 | 1 | 0 | 3 |
| **TOTAL** | **15** | **3** | **0** | **18** |

---

## ITEMS DETALIATE

### ARCHITECTURE (TD-A)

| ID | Descriere | Severitate | Status | Owner | Target | Dependencies |
| -- | --------- | ---------- | ------ | ----- | ------ | ------------ |
| TD-A01 | Provider lock-in (TimelinesAI, Instantly, Resend) | 🟠 Major | Open | - | Q2 2026 | ADR-00XX |
| TD-A02 | Circuit breakers lipsă | 🟠 Major | In Progress | - | Sprint 2 | [circuit-breaker-pattern.md](../developer-guide/circuit-breaker-pattern.md) |
| TD-A03 | Hardcoded configs în workers | 🟡 Medium | Open | - | Q1 2026 | - |
| TD-A04 | PgBouncer nedocumentat | 🟡 Medium | Open | - | Etapa 0 | docker-compose update |

### INFRASTRUCTURE (TD-I)

| ID | Descriere | Severitate | Status | Owner | Target | Dependencies |
| -- | --------- | ---------- | ------ | ----- | ------ | ------------ |
| TD-I01 | CI/CD deployment automated | 🟠 Major | Open | - | Etapa 1 | GitHub Actions |
| TD-I02 | Redis Sentinel/Cluster | 🟡 Medium | Open | - | Q1 2026 | [redis-high-availability.md](../infrastructure/redis-high-availability.md) |
| TD-I03 | Warm standby DB | 🟡 Medium | Open | - | Q2 2026 | PostgreSQL streaming |

### DOCUMENTATION (TD-D)

| ID | Descriere | Severitate | Status | Owner | Target | Dependencies |
| -- | --------- | ---------- | ------ | ----- | ------ | ------------ |
| TD-D01 | OpenAPI spec incomplete | 🟡 Medium | Open | - | Etapa 0 | Audit openapi.yaml |
| TD-D02 | DR Procedures missing | 🟠 Major | Open | - | Sprint 2 | - |
| TD-D03 | Runbooks missing | 🟠 Major | Open | - | Sprint 3 | - |
| TD-D04 | Rate limits incomplete (Oblio N/A) | 🟡 Medium | In Progress | - | Sprint 1 | Provider contact |
| TD-D05 | UI/UX docs unintegrated | 🟢 Minor | Open | - | Sprint 3 | - |
| TD-D06 | GDPR LIA formal | 🔴 Critical | Resolved | - | ✅ Done | [gdpr-legitimate-interest-assessment.md](../governance/gdpr-legitimate-interest-assessment.md) |
| TD-D07 | Testing Strategy | 🔴 Critical | Resolved | - | ✅ Done | [docs/testing/](../testing/) |
| TD-D08 | Master Spec sync | 🟠 Major | In Progress | - | Sprint 1 | - |

### TESTING (TD-T)

| ID | Descriere | Severitate | Status | Owner | Target | Dependencies |
| -- | --------- | ---------- | ------ | ----- | ------ | ------------ |
| TD-T01 | Integration tests coverage < 60% | 🟠 Major | Open | - | Etapa 0 | - |
| TD-T02 | E2E tests missing | 🟠 Major | Open | - | Etapa 1 | Playwright setup |
| TD-T03 | Backup restore testing | 🟠 Major | In Progress | - | Sprint 2 | [backup-setup-guide.md](../infrastructure/backup-setup-guide.md) |

---

## PRIORITIZARE

### 🚨 IMEDIAT (Blochează deployment)

1. ~~TD-D06: GDPR LIA~~ ✅ DONE
2. ~~TD-D07: Testing Strategy~~ ✅ DONE
3. TD-D08: Master Spec sync

### 📅 SPRINT 1-2 (Săptămâna curentă)

1. TD-A02: Circuit breakers
2. TD-D04: Rate limits complete
3. TD-T03: Backup restore testing

### 📅 SPRINT 3-4 (Luna 1)

1. TD-I01: CI/CD automation
2. TD-A04: PgBouncer
3. TD-D02: DR Procedures
4. TD-D03: Runbooks

### 📅 Q1-Q2 2026 (Post-MVP)

1. TD-A01: Provider abstraction
2. TD-I02: Redis HA
3. TD-I03: Warm standby
4. TD-T01/T02: Test coverage

---

## PROCESS

### Adăugare Item Nou

1. Identifică în code review sau audit
2. Creează item în acest document
3. Atribuie severitate și owner
4. Link la ADR dacă necesită decizie arhitecturală

### Tranziție Status

```text
Open → In Progress → Resolved
         ↓
       Blocked
```

### Definiția "Resolved"

- [ ] Cod/documentație implementată
- [ ] Review făcut
- [ ] Merged în main
- [ ] Actualizat acest document

---

## METRICI

### Trend (Ultimele 4 săptămâni)

| Săptămână | Opened | Closed | Net |
| --------- | ------ | ------ | --- |
| W03 | 18 | 0 | +18 |
| W04 | 0 | 2 | -2 |

### Aging

| Age | Count |
| --- | ----- |
| < 1 week | 16 |
| 1-2 weeks | 0 |
| > 2 weeks | 0 |

---

## DOCUMENTE CONEXE

- [Risks and Technical Debt](./risks-and-technical-debt.md) — Sursă originală
- [Master Specification](../specifications/master-specification.md)
- [Architecture Overview](./architecture.md)

---

**Actualizat:** 20 Ianuarie 2026
