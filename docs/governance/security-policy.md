# CERNIQ.APP — Security Policy

## Governance Document

### Versiunea 1.0 | 18 Ianuarie 2026

---

## Security Principles

1. **Defense in Depth** - Multiple layers of security
2. **Least Privilege** - Minimal permissions per service
3. **Secrets Management** - Docker secrets, never env vars in production
4. **Audit Trail** - Complete logging for security events

## Documentație Detaliată

| Subiect | Document |
| ------- | -------- |
| Secrets Management | [`etapa0-docker-secrets-guide.md`](../specifications/Etapa%200/etapa0-docker-secrets-guide.md) |
| ADR Secrets | [ADR-0017: Secrets Management](../adr/ADR%20Etapa%200/ADR-0017-Secrets-Management-Strategy.md) |
| Backup & Recovery | [`backup-strategy.md`](../infrastructure/backup-strategy.md) |
| GDPR | [`gdpr-compliance.md`](./gdpr-compliance.md) |

## Access Control

| Rol | Permisiuni |
| --- | ---------- |
| Admin | Full access toate resursele |
| Operator | Read/Write leads, sequences, templates |
| Viewer | Read-only access |

## Security Checklist

- [ ] Secrets în Docker secrets (nu .env în production)
- [ ] HTTPS enforced
- [ ] Rate limiting activ
- [ ] Input validation cu Zod
- [ ] SQL injection prevention (prepared statements)
- [ ] XSS prevention (sanitize output)
- [ ] CORS configurat corect
- [ ] Audit logging activ

## Incident Response

1. **Detectare** → Alerts din monitoring
2. **Containment** → Izolare sistem afectat
3. **Eradication** → Identificare și remediere cauză
4. **Recovery** → Restore din backup dacă necesar
5. **Lessons Learned** → Post-mortem documentat

## Reporting Vulnerabilities

Email: <security@cerniq.app>

---

**Document tip:** Governance Policy  
**Actualizat:** 18 Ianuarie 2026
