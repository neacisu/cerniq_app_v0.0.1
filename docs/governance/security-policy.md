# CERNIQ.APP — Security Policy

## Governance Document

### Versiunea 2.0 | 5 Februarie 2026

---

## Security Principles

1. **Defense in Depth** - Multiple layers of security
2. **Least Privilege** - Minimal permissions per service
3. **Centralized Secrets Management** - OpenBao pentru toate secretele
4. **Dynamic Secrets** - Credențiale temporare pentru database
5. **Audit Trail** - Complete logging for security events

## Documentație Detaliată

| Subiect | Document |
| ------- | -------- |
| Secrets Management | [ADR-0033: OpenBao](../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md) |
| OpenBao Setup | [`openbao-setup-guide.md`](../infrastructure/openbao-setup-guide.md) |
| Secrets Rotation | [`secrets-rotation-procedure.md`](../infrastructure/secrets-rotation-procedure.md) |
| Backup & Recovery | [`backup-strategy.md`](../infrastructure/backup-strategy.md) |
| GDPR | [`gdpr-compliance.md`](./gdpr-compliance.md) |
| ~~ADR-0017 Docker Secrets~~ | [Deprecated, see ADR-0033](../adr/ADR%20Etapa%200/ADR-0017-Secrets-Management-Strategy.md) |

## Secrets Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenBao Server                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ KV Engine   │  │ Database    │  │ PKI Engine  │         │
│  │ (static)    │  │ (dynamic)   │  │ (certs)     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────┬───────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │ AppRole Auth  │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │   API   │    │ Workers  │    │ CI/CD    │
    │ Agent   │    │ Agent    │    │ Direct   │
    └─────────┘    └──────────┘    └──────────┘
```

## Access Control

| Rol | Permisiuni |
| --- | ---------- |
| Admin | Full access toate resursele |
| Operator | Read/Write leads, sequences, templates |
| Viewer | Read-only access |

## Security Checklist

- [ ] Secrets în OpenBao (nu .env în production)
- [ ] Dynamic database credentials (auto-rotating)
- [ ] AppRole authentication pentru servicii
- [ ] OpenBao audit logging activ
- [ ] Unseal keys secured în Hetzner Storage Box
- [ ] HTTPS enforced
- [ ] Rate limiting activ
- [ ] Input validation cu Zod
- [ ] SQL injection prevention (prepared statements)
- [ ] XSS prevention (sanitize output)
- [ ] CORS configurat corect
- [ ] Application audit logging activ

## Incident Response

1. **Detectare** → Alerts din monitoring
2. **Containment** → Izolare sistem afectat
3. **Eradication** → Identificare și remediere cauză
4. **Recovery** → Restore din backup dacă necesar
5. **Lessons Learned** → Post-mortem documentat

## Penetration Testing Program

### Testing Schedule

| Tip Test | Frecvență | Trigger Events |
|----------|-----------|----------------|
| **Full External Pentest** | Anual | - |
| **Targeted Application Pentest** | Trimestrial | Major releases |
| **Ad-hoc Pentest** | La nevoie | Schimbări arhitecturale semnificative |
| **Red Team Exercise** | La 18 luni | Milestone-uri de scalare |

### Primul Pentest Planificat

| Aspect | Detalii |
|--------|--------|
| **Termen** | Q1 2026 (înainte de go-live) |
| **Tip** | Full External Pentest |
| **Scope** | Toate aplicațiile publice |
| **Vendor** | TBD (CREST/OSCP certified) |

### Metodologie

**Standard Principal:** OWASP Web Security Testing Guide (WSTG) v4.2

| Fază | Descriere |
|------|----------|
| Phase 1 | Information Gathering |
| Phase 2 | Configuration Management Testing |
| Phase 3 | Identity Management Testing |
| Phase 4 | Authentication Testing |
| Phase 5 | Authorization Testing |
| Phase 6 | Session Management Testing |
| Phase 7 | Input Validation Testing |
| Phase 8 | Error Handling Testing |
| Phase 9 | Cryptography Testing |
| Phase 10 | Business Logic Testing |
| Phase 11 | Client-side Testing |
| Phase 12 | API Testing |

### Scope Definition

| În Scope | Out of Scope |
|----------|-------------|
| api.cerniq.app | Infrastructură third-party (Hetzner) |
| app.cerniq.app | Securitate fizică |
| admin.cerniq.app | Social engineering (fără acord explicit) |
| Toate endpoint-urile API | Denial of Service testing |
| Authentication flows | |
| Multi-tenant isolation | |
| Worker communication | |

### Vendor Requirements

- Certificare CREST sau OSCP pentru testeri
- NDA semnat înainte de engagement
- Asigurare profesională minimum €1M
- Nu se exfiltrează date fără aprobare explicită
- Toate finding-urile raportate în 5 zile lucrătoare
- Raport final în format PDF + bază de date findings

### Remediation SLAs

| Severitate | Timeline Remediere | Retest Window |
|------------|-------------------|---------------|
| 🔴 Critical | 24-72 ore | În 7 zile |
| 🟠 High | 7 zile | În 14 zile |
| 🟡 Medium | 30 zile | Următorul pentest |
| 🟢 Low | 90 zile | Următorul pentest |
| ⚪ Informational | Backlog | După capacitate |

### Documentation Requirements

- Pentest Report (PDF + findings database)
- Evidence screenshots/videos
- Remediation validation certificates
- Year-over-year trend analysis
- Executive summary pentru management

---

## Reporting Vulnerabilities

Email: <security@cerniq.app>

## Vulnerability Disclosure Policy

### Scope

- Web applications, APIs, and workers operated by Cerniq.app
- Infrastructure managed by Cerniq.app (excluding third-party providers)

### Safe Harbor

- Cercetarea de securitate de bună credință este permisă
- Nu inițiem acțiuni legale dacă sunt respectate aceste reguli
- Nu accesați date personale reale și nu degradați serviciile

### SLA Răspuns

- Confirmare primire: **în 2 zile lucrătoare**
- Triage inițial: **în 5 zile lucrătoare**
- Update status: **la fiecare 10 zile lucrătoare**

### Responsible Disclosure

- Nu publicați detaliile înainte de remediere
- Furnizați pași de reproducere clari
- Includeți impactul estimat

---

**Document tip:** Governance Policy  
**Actualizat:** 18 Ianuarie 2026
