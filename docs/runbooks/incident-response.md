# CERNIQ.APP — Incident Response Runbook

> **Clasificare:** OPERAȚIONAL CRITIC  
> **Versiune:** 1.0  
> **Data:** 1 Februarie 2026  
> **Referințe:** [Security Policy](../governance/security-policy.md), [Backup Strategy](../infrastructure/backup-strategy.md)

---

## 📋 CUPRINS

1. [Scopul Documentului](#1-scopul-documentului)
2. [Clasificarea Incidentelor](#2-clasificarea-incidentelor)
3. [Lanțul de Escalare](#3-lanțul-de-escalare)
4. [Procedura de Răspuns](#4-procedura-de-răspuns)
5. [Playbooks Specifice](#5-playbooks-specifice)
6. [Post-Incident](#6-post-incident)
7. [Contacte și Resurse](#7-contacte-și-resurse)

---

## 1. Scopul Documentului

Acest runbook definește procedurile standardizate pentru:
- Detectarea și clasificarea incidentelor
- Escalarea și comunicarea
- Răspunsul și remedierea
- Analiza post-incident

**Audiență:** DevOps, Engineering, Management

---

## 2. Clasificarea Incidentelor

### 2.1 Niveluri de Severitate

| Nivel | Severitate | Descriere | Exemple | RTO |
|-------|------------|-----------|---------|-----|
| **SEV-1** | 🔴 CRITIC | Sistem complet indisponibil | DB down, API unresponsive, data breach | 15 min |
| **SEV-2** | 🟠 MAJOR | Funcționalitate critică afectată | e-Factura fail, payments down, HITL blocked | 1 oră |
| **SEV-3** | 🟡 MODERATE | Funcționalitate secundară afectată | Workers slow, partial outreach failure | 4 ore |
| **SEV-4** | 🟢 MINOR | Impact minimal | Logging gaps, UI glitches | 24 ore |

### 2.2 Criterii de Clasificare

```
┌─────────────────────────────────────────────────────────────────┐
│                    DECISION TREE                                │
└─────────────────────────────────────────────────────────────────┘

        [Incident Detectat]
               │
               ▼
    ┌─────────────────────┐
    │ Date compromise?     │──Yes──▶ SEV-1 + Security Team
    └──────────┬──────────┘
               │No
               ▼
    ┌─────────────────────┐
    │ Revenue impact?      │──Yes──▶ SEV-1 sau SEV-2
    │ (e-Factura, payments)│
    └──────────┬──────────┘
               │No
               ▼
    ┌─────────────────────┐
    │ User-facing down?    │──Yes──▶ SEV-2
    └──────────┬──────────┘
               │No
               ▼
    ┌─────────────────────┐
    │ Background affected? │──Yes──▶ SEV-3
    └──────────┬──────────┘
               │No
               ▼
           SEV-4
```

---

## 3. Lanțul de Escalare

### 3.1 Matrice de Escalare

| Severitate | Primul Răspuns | Escalare 15 min | Escalare 30 min | Escalare 1 oră |
|------------|----------------|-----------------|-----------------|----------------|
| SEV-1 | On-Call Engineer | Tech Lead | CTO | CEO |
| SEV-2 | On-Call Engineer | Tech Lead | CTO | - |
| SEV-3 | On-Call Engineer | Tech Lead | - | - |
| SEV-4 | Ticket în backlog | - | - | - |

### 3.2 Contacte de Urgență

| Rol | Persoană | Contact Primar | Contact Secundar |
|-----|----------|----------------|------------------|
| On-Call Engineer | Rotație | PagerDuty | Slack #incidents |
| Tech Lead | TBD | +40-XXX-XXX-XXX | Slack DM |
| CTO | TBD | +40-XXX-XXX-XXX | Signal |
| CEO | TBD | +40-XXX-XXX-XXX | Signal |

### 3.3 Escalare Externă

| Situație | Contact | Trigger |
|----------|---------|---------|
| Security Breach | CERT-RO | Date personale compromise |
| GDPR Incident | DPO (dpo@cerniq.app) | Breach > 500 subiecți |
| Infrastructure | Hetzner Support | Hardware failure |
| Payment System | Revolut Business | Transaction issues |

---

## 4. Procedura de Răspuns

### 4.1 Fazele Răspunsului (DCERL)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  D ──▶ E ──▶ C ──▶ R ──▶ L                                              │
│  │     │     │     │     │                                              │
│  │     │     │     │     └── Lessons Learned (post-mortem)              │
│  │     │     │     └──────── Recovery (restore normal operations)       │
│  │     │     └────────────── Containment (stop bleeding)                │
│  │     └──────────────────── Eradication (fix root cause)               │
│  └────────────────────────── Detection (identify & classify)            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 FAZA 1: Detectare (D) — Primele 5 minute

**Obiectiv:** Confirmare incident, clasificare severitate

```bash
# 1. Verificare status servicii
docker compose -f /var/www/CerniqAPP/infra/docker/docker-compose.yml ps

# 2. Verificare health endpoints
curl -s http://localhost:64000/health | jq .
curl -s http://localhost:64000/health/db | jq .
curl -s http://localhost:64000/health/redis | jq .

# 3. Verificare logs recente
docker compose logs --tail=100 --since=5m api
docker compose logs --tail=100 --since=5m postgres
docker compose logs --tail=100 --since=5m redis

# 4. Verificare SigNoz pentru erori
# Navighează la: http://localhost:64089/traces?status=error
```

**Checklist Detectare:**
- [ ] Confirmat că problema este reală (nu fals pozitiv)
- [ ] Determinat severitatea (SEV-1 to SEV-4)
- [ ] Identificat scope-ul (ce servicii/date afectate)
- [ ] Creat canal Slack: `#incident-YYYY-MM-DD-HH`
- [ ] Anunțat în canal cu template:

```markdown
🚨 **INCIDENT DECLARAT**

**Severitate:** SEV-X
**Detectat:** HH:MM UTC
**Impact:** [descriere scurtă]
**Afectate:** [servicii/utilizatori]
**Incident Commander:** @nume
**Status:** INVESTIGARE
```

### 4.3 FAZA 2: Containment (C) — Minute 5-15

**Obiectiv:** Oprirea degradării, izolare impact

**Acțiuni Imediate per Tip:**

#### Database Issues
```bash
# Oprire conexiuni noi dacă DB overloaded
docker compose exec postgres psql -U cerniq -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '5 minutes';"

# Verificare locks
docker compose exec postgres psql -U cerniq -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

#### Worker Failures
```bash
# Pause queues dacă jobs cauzează probleme
docker compose exec api npx bullmq pause outreach:whatsapp:send

# Sau stop complet workers
docker compose stop worker-outreach worker-enrichment
```

#### Network/Traffic Issues
```bash
# Activare maintenance mode în Traefik
# Editează dynamic config pentru a returna 503

# Rate limiting de urgență
# Reduce în Traefik la 10 req/sec per IP
```

### 4.4 FAZA 3: Eradicare (E) — Minute 15-60

**Obiectiv:** Identificare și remediere cauză root

```bash
# 1. Colectare diagnostic complet
./scripts/collect-diagnostics.sh > /tmp/incident-$(date +%Y%m%d-%H%M%S).tar.gz

# 2. Analiza logs detaliat
docker compose logs --since=1h --no-color > /tmp/all-logs.txt
grep -i "error\|exception\|fatal" /tmp/all-logs.txt

# 3. Verificare metrici sistem
htop
df -h
free -m
iostat -x 1 5

# 4. Verificare conexiuni
netstat -an | grep ESTABLISHED | wc -l
ss -s
```

**Cauze Comune și Soluții:**

| Simptom | Cauza Probabilă | Soluție |
|---------|-----------------|---------|
| DB timeout | Conexiuni epuizate | Restart PgBouncer, kill idle |
| Redis OOM | BullMQ jobs accumulate | Prune completed jobs |
| API 502 | Container crash | Restart cu `docker compose up -d` |
| Workers stuck | Job deadlock | Retry sau remove job |
| High latency | Query N+1 | Identify și fix query |

### 4.5 FAZA 4: Recovery (R) — Post-remediere

**Obiectiv:** Restaurare servicii la normal

```bash
# 1. Restart servicii în ordine
docker compose up -d postgres
sleep 10
docker compose up -d redis
sleep 5
docker compose up -d api
docker compose up -d worker-enrichment worker-outreach worker-ai

# 2. Verificare health
for i in {1..5}; do
  curl -s http://localhost:64000/health && break
  sleep 10
done

# 3. Resume queues
docker compose exec api npx bullmq resume outreach:whatsapp:send

# 4. Verificare funcționalitate
curl -X POST http://localhost:64000/api/v1/health/deep -H "Content-Type: application/json"
```

**Checklist Recovery:**
- [ ] Toate serviciile healthy
- [ ] Queues processing normal
- [ ] No new errors în logs
- [ ] Metrici revenite la baseline
- [ ] Comunicare: "Incident RESOLVED"

---

## 5. Playbooks Specifice

### 5.1 🔴 SEV-1: Database Down

**Referință completă:** [database-recovery.md](./database-recovery.md)

```bash
# Quick triage
docker compose logs postgres --tail=50
docker compose exec postgres pg_isready

# Dacă corrupt - RESTORE
./scripts/restore-database.sh latest
```

### 5.2 🔴 SEV-1: Redis Down (BullMQ Lost)

**Referință completă:** [redis-failover.md](./redis-failover.md)

```bash
# Quick triage
docker compose logs redis --tail=50
docker compose exec redis redis-cli ping

# Dacă OOM - FLUSH și restart
docker compose exec redis redis-cli FLUSHDB ASYNC
docker compose restart redis
```

### 5.3 🟠 SEV-2: Workers Failing

**Referință completă:** [worker-failure.md](./worker-failure.md)

```bash
# Verificare queue status
docker compose exec api npx bullmq stats

# Retry failed jobs
docker compose exec api npx bullmq retry-all outreach:whatsapp:send
```

### 5.4 🟠 SEV-2: e-Factura Submission Failed

```bash
# Verificare certificat ANAF
openssl s_client -connect ws.anaf.ro:443 -showcerts

# Verificare quota
curl -s http://localhost:64000/api/v1/integrations/anaf/quota

# Manual retry pentru facturi failed
docker compose exec api pnpm run efactura:retry --since "1 hour ago"
```

### 5.5 🟠 SEV-2: Security Incident

```bash
# 1. IMEDIAT: Izolare sistem
iptables -I INPUT -s <suspicious_ip> -j DROP

# 2. Preserve evidence
tar -czf /tmp/evidence-$(date +%Y%m%d).tar.gz \
  /var/log/nginx/ \
  /var/log/auth.log \
  /var/www/CerniqAPP/logs/

# 3. Rotire credențiale
./scripts/rotate-secrets.sh --all

# 4. Notificare DPO
echo "Security incident detected at $(date)" | mail -s "URGENT: Security Incident" dpo@cerniq.app
```

---

## 6. Post-Incident

### 6.1 Timeline Documentation

Imediat după rezolvare, documentează:

```markdown
## Post-Incident Report: [INCIDENT-ID]

**Data:** YYYY-MM-DD
**Severitate:** SEV-X
**Durată:** X ore Y minute
**Incident Commander:** @nume

### Timeline
- HH:MM - Incident detectat
- HH:MM - Escalat la SEV-X
- HH:MM - Containment aplicat
- HH:MM - Root cause identificat
- HH:MM - Fix deployed
- HH:MM - Services restored
- HH:MM - Incident closed

### Root Cause
[Descriere detaliată]

### Impact
- Utilizatori afectați: X
- Tranzacții pierdute: Y
- Revenue impact: €Z

### Actions Taken
1. [Acțiune 1]
2. [Acțiune 2]

### Lessons Learned
- Ce a mers bine: [...]
- Ce poate fi îmbunătățit: [...]

### Action Items
- [ ] [Item 1] - Owner: @nume - Due: DATE
- [ ] [Item 2] - Owner: @nume - Due: DATE
```

### 6.2 Post-Mortem Meeting

**Programare:** În 48 ore după incident SEV-1/SEV-2

**Agendă:**
1. Timeline review (10 min)
2. Root cause analysis (15 min)
3. What went well (10 min)
4. What could improve (15 min)
5. Action items (10 min)

**Output:** Document salvat în `docs/post-mortems/YYYY-MM-DD-[title].md`

---

## 7. Contacte și Resurse

### 7.1 Resurse Interne

| Resursă | Link |
|---------|------|
| SigNoz Dashboard | http://localhost:64089 |
| Traefik Dashboard | http://localhost:64081 |
| Database Recovery | [database-recovery.md](./database-recovery.md) |
| Redis Failover | [redis-failover.md](./redis-failover.md) |
| Worker Failures | [worker-failure.md](./worker-failure.md) |
| Backup Strategy | [backup-strategy.md](../infrastructure/backup-strategy.md) |

### 7.2 Resurse Externe

| Serviciu | Status Page | Support |
|----------|-------------|---------|
| Hetzner | status.hetzner.com | support@hetzner.com |
| GitHub | githubstatus.com | support@github.com |
| Revolut | - | Business Support |
| ANAF | - | Call center ANAF |

### 7.3 Escalare Legală/Compliance

| Situație | Contact | Timeline |
|----------|---------|----------|
| Data Breach | DPO + Legal | 72h GDPR notification |
| Financial Fraud | Legal + Poliția | Immediate |
| Service Outage > 24h | Customers | Proactive communication |

---

## 📝 Changelog

| Data | Versiune | Modificare |
|------|----------|------------|
| 2026-02-01 | 1.0 | Document inițial |

---

**Document Owner:** DevOps Team  
**Review Schedule:** Trimestrial  
**Next Review:** Mai 2026
