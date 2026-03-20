# Runbook: Etapa 2 — Cold Outreach Multi-Canal

**Versiune:** 1.0  
**Actualizat:** 20 Martie 2026  
**Status:** În remediere continuă (vezi plan audit Etapa 2)

---

## 1. Arhitectura Generală

Etapa 2 implementează un sistem de outreach multi-canal (WhatsApp via TimelinesAI, Cold Email via Instantly.ai, Warm Email via Resend) cu 40+ workers BullMQ, state machine pentru leads, HITL review queue, și un dashboard complet.

### Stack tehnic

- **Backend:** Fastify v5, Drizzle ORM, PostgreSQL (schema `outreach`)
- **Workers:** BullMQ v5, Redis 8.4
- **Canal WA:** TimelinesAI (40 queues individuale, concurrency=1)
- **Canal Email Cold:** Instantly.ai (circuit breaker bounce 3%)
- **Canal Email Warm:** Resend + Svix webhooks
- **Frontend:** React 19, React Query, shadcn/ui, Tailwind CSS v4

---

## 2. Health Checks

### Verificare rapidă worker-i

```bash
# Monitor Bull queues
curl http://localhost:3010/api/monitoring/queues

# Health HTTP — worker outreach (`workers/outreach`, PORT din env, implicit 3000)
curl http://localhost:3000/health

# Health check API Fastify (port dev tipic 3001 — vezi `apps/api`)
curl http://localhost:3001/health

# Redis ping
redis-cli ping
```

### Verificare dashboard

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/outreach/dashboard
```

---

## 3. Phone Quota Alert (ADR-0054)

### Simptom: Telefon cu quota >90%

**Acțiune:**

1. Dashboard → `/outreach/phones` → identificați telefonul cu bara roșie/portocalie
2. Click pe card → health check manual declanșat
3. Dacă `quotaPercentage >= 100%`: telefonul a intrat în stare `PAUSED` automat

**Verificare Redis quota:**

```bash
redis-cli GET "wa_quota:TENANT_ID:PHONE_ID:$(date +%Y-%m-%d)"
```

**Reset manual (urgență):**

```bash
redis-cli DEL "wa_quota:TENANT_ID:PHONE_ID:$(date +%Y-%m-%d)"
```

---

## 4. Phone Banned Alert (ADR-0067)

### Simptom: Telefon în stare `BANNED`

**Acțiune:**

1. Verificați TimelinesAI dashboard pentru status WhatsApp
2. Dacă banat permanent: dezactivați (`isEnabled=false`) via API:

   ```bash
   curl -X PATCH http://localhost:3001/api/v1/outreach/phones/PHONE_ID \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"isEnabled": false}'
   ```

3. Reassignați leads-urile cu `assignedPhoneId = bannedPhoneId` la un telefon activ
4. Deschideți ticket suport TimelinesAI

---

## 5. Bounce Rate Alert (ADR-0066, Circuit Breaker)

### Simptom: Bounce rate Instantly.ai > 3%

**Locație log:**

```bash
grep "CIRCUIT_BREAKER" /var/log/cerniq/workers.log | tail -50
```

**Acțiune:**

1. Verificați starea circuit breaker în Redis:

   ```bash
   redis-cli GET "circuit_breaker:instantly:TENANT_ID"
   ```

2. Dacă `OPEN`: oprirea automată a email cold a intrat în vigoare
3. Verificați Instantly.ai dashboard pentru lista leads cu bounce
4. Resetați circuit breaker după remedierea problemei:

   ```bash
   redis-cli DEL "circuit_breaker:instantly:TENANT_ID"
   ```

---

## 6. Review Queue SLA Breach (ADR-0064)

### Simptom: SLA expired în queue (`/outreach/review`)

**Acțiune:**

1. Navigați la `/outreach/review` — filtrați după `URGENT`
2. Elementele cu timer `⏰ Expirat` în roșu necesită atenție imediată
3. SLA: URGENT=1h, HIGH=4h, MEDIUM=24h
4. Rezolvați cu `ResolveReviewDialog` (Approved/Edited/Rejected)

**Escalare automată:** Worker-ul `sla-enforcer` escaladează automat după expirare.

---

## 7. Lead State Machine Blocaj (ADR-0062)

### Simptom: Lead blocat în stare incorectă

**Verificare tranziții valide:**

- COLD → CONTACTED_WA, CONTACTED_EMAIL, DEAD
- CONTACTED_WA/EMAIL → WARM_REPLY, DEAD, PAUSED
- WARM_REPLY → NEGOTIATION, DEAD, PAUSED
- NEGOTIATION → CONVERTED, DEAD, PAUSED
- DEAD → COLD (reactivare)

**Corectare manuală:**

```bash
curl -X PATCH http://localhost:3001/api/v1/outreach/leads/LEAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"currentState": "COLD"}'
```

---

## 8. Webhook Failures (ADR-0061)

### TimelinesAI webhooks

```bash
# Verificare queue normalizer
redis-cli LLEN "bull:webhook-normalizer:wait"

# Re-procesare manuală eveniment
curl -X POST http://localhost:3001/api/v1/webhooks/timelinesai \
  -H "X-Hub-Signature-256: sha256=..." \
  -d @webhook-payload.json
```

### Instantly.ai webhooks

```bash
curl -X POST http://localhost:3001/api/v1/webhooks/instantly \
  -H "X-Instantly-Signature: ..." \
  -d @webhook-payload.json
```

### Resend webhooks (Svix)

```bash
curl -X POST http://localhost:3001/api/v1/webhooks/resend \
  -H "svix-id: ..." \
  -d @webhook-payload.json
```

---

## 9. Database Maintenance

### Cleanup mesaje vechi (>90 zile)

```bash
# Worker automat: cleanup-worker (cron zilnic)
# Manual forțat:
psql $DATABASE_URL << 'EOF'
DELETE FROM outreach.communication_log
WHERE created_at < NOW() - INTERVAL '90 days';
EOF
```

### Vacuum periodic

```bash
psql $DATABASE_URL -c "VACUUM ANALYZE outreach.lead_journey;"
psql $DATABASE_URL -c "VACUUM ANALYZE outreach.communication_log;"
```

---

## 10. Monitoring Endpoints

| Endpoint | Descriere |
| --- | --- |
| `GET /api/v1/outreach/dashboard` | KPIs generale |
| `GET /api/v1/outreach/analytics/overview?period=7d` | Analytics 7/30/90 zile |
| `GET /api/v1/outreach/reviews/stats` | Stats review queue |
| `GET /api/v1/outreach/phones` | Status toate telefoanele |

---

## 11. Escalare

1. **L1:** Dashboard alertă → verificare runbook secțiunile 3–8
2. **L2:** Telefon banat / circuit breaker open → DevOps
3. **L3:** Date corupte în state machine → Backend Senior + DBA

**Contact:**

- Slack: `#alerts-outreach`
- PagerDuty: `outreach-critical`
