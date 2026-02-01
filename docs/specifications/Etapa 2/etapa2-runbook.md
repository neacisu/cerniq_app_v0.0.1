# CERNIQ.APP — ETAPA 2: RUNBOOK OPERAȚIONAL COMPLET

## Procedures, Troubleshooting, Emergency Response & Disaster Recovery

### Versiunea 1.1 | 18 Ianuarie 2026

> **Notă:** Acest document consolidează `etapa2-runbook.md` și `etapa2-runbook-operational.md` într-un singur runbook complet.

---

## CUPRINS

1. [Daily Operations](#1-daily-operations)
2. [Phone Management Procedures](#2-phone-management-procedures)
3. [Quota Management](#3-quota-management)
4. [Queue Troubleshooting](#4-queue-troubleshooting)
5. [HITL Escalations & Human Review](#5-hitl-escalations--human-review)
6. [Email Deliverability Issues](#6-email-deliverability-issues)
7. [Emergency Procedures](#7-emergency-procedures)
8. [Disaster Recovery](#8-disaster-recovery)
9. [Monitoring Alerts](#9-monitoring-alerts)
10. [Maintenance Windows](#10-maintenance-windows)

---

## 1. DAILY OPERATIONS

### 1.1 Morning Checklist (09:00)

```bash
#!/bin/bash
# scripts/daily-morning-check.sh

echo "=== CERNIQ Etapa 2 Morning Check ==="
echo "Date: $(date)"

# 1. Check all phones online (API method)
echo -e "\n[1/8] WhatsApp Phones Status:"
curl -s http://localhost:64000/api/v1/outreach/phones | jq '.phones[] | {label, status, quotaUsed: .quota.used}'

# 2. Check phones not ACTIVE (alternate check)
echo -e "\n[2/8] Phones Not Active:"
curl -s http://localhost:64000/api/v1/outreach/phones | jq '.phones[] | select(.status != "ACTIVE") | .label'

# 3. Check quota reset happened
echo -e "\n[3/8] Quota Reset Verification:"
redis-cli KEYS "quota:wa:*:$(date +%Y-%m-%d)" | wc -l
echo "Active quota keys for today"

# 4. Check queue health
echo -e "\n[4/8] BullMQ Queue Health:"
curl -s http://localhost:64000/api/admin/queues/health | jq '.queues | to_entries[] | {name: .key, waiting: .value.waiting, active: .value.active, failed: .value.failed}'

# 5. Check pending reviews
echo -e "\n[5/8] Pending Reviews:"
curl -s http://localhost:64000/api/v1/outreach/reviews?status=PENDING | jq '.counts'

# 6. Check for SLA breaches overnight
echo -e "\n[6/8] SLA Breaches Overnight:"
curl -s http://localhost:64000/api/v1/outreach/reviews?slaBreached=true | jq '.meta.total'

# 7. Check yesterday's metrics
echo -e "\n[7/8] Yesterday's Metrics:"
curl -s "http://localhost:64000/api/v1/outreach/analytics/daily-stats?date=$(date -d 'yesterday' +%Y-%m-%d)" | jq '.stats'

# 8. Check disk space
echo -e "\n[8/8] Disk Space:"
df -h /var/lib/postgresql/data
df -h /var/lib/redis

# 9. Verify TimelinesAI connection per phone (Redis status)
echo -e "\n[EXTRA] Per-Phone TimelinesAI Status:"
for i in {1..20}; do
  status=$(redis-cli GET "phone:status:phone_$(printf '%02d' $i)")
  echo "Phone $i: $status"
done

echo -e "\n=== Morning Check Complete ==="
```

### 1.2 Evening Checklist (18:00)

```bash
#!/bin/bash
# scripts/daily-evening-check.sh

echo "=== CERNIQ Etapa 2 Evening Check ==="
echo "Date: $(date)"

# 1. Day's performance summary
echo -e "\n[1/7] Today's Performance:"
curl -s http://localhost:64000/api/v1/outreach/analytics/dashboard | jq '.today'

# 2. Daily statistics detailed
echo -e "\n[2/7] Daily Statistics:"
curl -s http://localhost:64000/api/v1/outreach/analytics/daily | jq '
  {
    contacted: .metrics.contacted[-1],
    replied: .metrics.replied[-1],
    converted: .metrics.converted[-1],
    reviews: .metrics.reviewsResolved[-1]
  }
'

# 3. Quota usage summary
echo -e "\n[3/7] Quota Usage Summary:"
curl -s http://localhost:64000/api/v1/outreach/phones | jq '[.phones[].quota.used] | add' 
echo "/ 4000 total capacity used"

# 4. Unresolved reviews (SLA risk)
echo -e "\n[4/7] Unresolved Reviews (SLA risk):"
curl -s http://localhost:64000/api/v1/outreach/reviews?status=PENDING | jq '.reviews | map(select(.slaBreached == true or (.slaDueAt | fromdate) < now)) | length'
echo "reviews at SLA risk"

# 5. Failed jobs
echo -e "\n[5/7] Failed Jobs Today:"
curl -s http://localhost:64000/api/admin/queues/failed | jq 'length'
redis-cli -n 2 LLEN "bull:dlq:outreach"
echo "failed jobs (API + DLQ)"

# 6. Archive verification (scheduled task check)
echo -e "\n[6/7] Pending Archive Records:"
psql -U cerniq -c "SELECT COUNT(*) FROM gold_communication_log WHERE created_at < NOW() - INTERVAL '90 days'"

# 7. Backup verification
echo -e "\n[7/7] Today's Backup:"
ls -la /backups/daily/$(date +%Y-%m-%d)/ 2>/dev/null || echo "Backup not found!"

# 8. Generate daily report
echo -e "\n[EXTRA] Generating Daily Report..."
curl -X POST http://localhost:64000/api/v1/internal/reports/daily

echo -e "\n=== Evening Check Complete ==="
```

---

## 2. PHONE MANAGEMENT PROCEDURES

### 2.1 Phone Goes Offline

**Symptoms:**

- Alert: `phone:offline` triggered
- Dashboard shows phone status OFFLINE
- Messages queuing but not sending
- TimelinesAI dashboard shows disconnected

**Procedure:**

```bash
# 1. Check phone status (API)
curl -s http://localhost:64000/api/v1/outreach/phones/{phoneId} | jq '.status'

# 2. Check phone in database (direct)
psql -U cerniq -c "SELECT id, phone_label, status, status_changed_at FROM wa_phone_numbers WHERE id = '{phone_id}'"

# 3. Check TimelinesAI connection
curl -s "https://api.timelines.ai/v1/accounts/{timelinesai_account_id}/status" \
  -H "Authorization: Bearer $TIMELINESAI_API_KEY"

# 4. If reconnectable via API, trigger reconnect
curl -X POST http://localhost:64000/api/v1/outreach/phones/{phoneId}/reconnect

# 5. If requires manual action:
#    - Login to TimelinesAI dashboard
#    - Scan QR code on physical phone
#    - Wait 5 minutes for sync

# 6. After reconnection, update status (if needed)
curl -X PATCH "http://localhost:64000/api/v1/outreach/phones/{phone_id}" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE"}'

# 7. Resume phone after reconnection
curl -X POST http://localhost:64000/api/v1/outreach/phones/{phoneId}/resume

# 8. Check pending messages are processing
curl -s http://localhost:64000/api/admin/queues/q:wa:phone_{XX}/waiting | jq 'length'
redis-cli -n 2 LLEN "bull:q:wa:phone_{XX}:waiting"
```

### 2.2 Phone Gets Banned

**Symptoms:**

- Alert: `phone:banned` triggered
- TimelinesAI returns 403/banned/blocked errors
- Phone status = BANNED
- Leads assigned to phone stuck

**Procedure:**

```bash
# ⚠️ CRITICAL: DO NOT attempt to reconnect banned phone!

# 1. Confirm ban status (API)
curl -s http://localhost:64000/api/v1/outreach/phones/{phoneId} | jq '.status'

# 2. Mark phone as banned in database (prevents new assignments)
psql -U cerniq -c "UPDATE wa_phone_numbers SET status = 'BANNED', status_changed_at = NOW() WHERE id = '{phone_id}'"

# 3. Reassign leads from banned phone (API method)
curl -X POST http://localhost:64000/api/v1/outreach/phones/{phoneId}/reassign-leads

# 4. Or reassign leads via SQL (direct method)
psql -U cerniq -c "
  UPDATE gold_lead_journey 
  SET assigned_phone_id = NULL, assigned_at = NULL
  WHERE assigned_phone_id = '{phone_id}'
    AND engagement_stage IN ('COLD', 'CONTACTED_WA')
"

# 5. Cancel pending jobs for this phone
redis-cli -n 2 DEL "bull:q:wa:phone_{XX}:waiting"
redis-cli -n 2 DEL "bull:q:wa:phone_{XX}:delayed"

# 6. Review messaging patterns that may have caused ban
curl -s "http://localhost:64000/api/v1/outreach/analytics/phones/{phoneId}/history?days=7" | jq '.dailyStats'

# 7. Document incident
echo "$(date): Phone {phoneId} banned. Reason: {suspected_reason}" >> /var/log/cerniq/phone-incidents.log

# 8. Next steps:
#    - Report to TimelinesAI support
#    - Prepare replacement phone (see 2.3)
#    - Update phone count in configuration if necessary
```

### 2.3 Adding New Phone

```bash
# 1. Register phone in TimelinesAI dashboard first
#    - Add new WhatsApp account
#    - Get account_id from TimelinesAI dashboard

# 2. Insert into database
psql -U cerniq -c "
  INSERT INTO wa_phone_numbers (
    tenant_id, phone_number, phone_label, timelinesai_account_id,
    status, daily_quota_limit, is_enabled
  ) VALUES (
    '{tenant_uuid}', '+40712345678', 'Sales 21', '{timelinesai_account_id}',
    'ACTIVE', 200, true
  )
"

# 3. Initialize Redis keys
redis-cli SET "phone:status:{phone_id}" "ACTIVE"
redis-cli SET "quota:wa:{phone_id}:$(date +%Y-%m-%d)" "0" EX 172800

# 4. Create BullMQ queue for phone (automatic on first job)
# Update workers/whatsapp/index.ts to include new phone queue if needed

# 5. Verify health check
curl -X POST http://localhost:64000/api/admin/phones/health-check

# 6. Test with single message
curl -X POST "http://localhost:64000/api/v1/outreach/test/send" \
  -H "Content-Type: application/json" \
  -d '{"phoneId": "{phone_id}", "testNumber": "+40xxxxxxxx"}'
```

---

## 3. QUOTA MANAGEMENT

### 3.1 Quota Exceeded / Exhausted Mid-Day

**Symptoms:**

- All phones at 200/200
- New leads queuing but not sending
- Dashboard shows 100% quota
- Many leads waiting in COLD stage

**Response:**

```bash
# 1. Verify actual usage (Redis method)
for i in {01..20}; do
  usage=$(redis-cli GET "quota:wa:phone_$i:$(date +%Y-%m-%d)" || echo "0")
  echo "Phone $i: $usage/200"
done

# 2. Verify usage (Database method)
for phone in $(psql -t -U cerniq -c "SELECT id FROM wa_phone_numbers WHERE status = 'ACTIVE'"); do
  usage=$(redis-cli GET "quota:wa:${phone}:$(date +%Y-%m-%d)")
  echo "Phone $phone: $usage/200"
done

# 3. Check for incorrect quota consumption (follow-ups incorrectly counted as new)
psql -U cerniq << EOF
SELECT quota_cost, COUNT(*) 
FROM gold_communication_log 
WHERE DATE(sent_at) = CURRENT_DATE 
  AND channel = 'WHATSAPP'
GROUP BY quota_cost;
EOF

# 4. Check for quota leak (bug) - compare DB vs Redis
psql -U cerniq -c "
  SELECT phone_id, COUNT(*) as messages_today
  FROM gold_communication_log 
  WHERE created_at > CURRENT_DATE 
    AND channel = 'WHATSAPP' 
    AND quota_cost = 1
  GROUP BY phone_id
"

# 5. If legitimate high volume:
#    - Review if more phones needed (see 2.3)
#    - Adjust dispatch batch size in config
#    - Messages will queue for tomorrow automatically

# 6. If urgent leads need contact, use email channel as fallback
curl -X POST http://localhost:64000/api/v1/outreach/leads/{leadId}/send-message \
  -H "Content-Type: application/json" \
  -d '{"channel": "EMAIL_WARM", "content": "..."}'
```

### 3.2 Quota Reset Issue

**Symptoms:**

- Quotas not resetting at midnight
- Redis keys persisting past 24h

**Procedure:**

```bash
# 1. Check cron job status
systemctl status cron
grep quota /var/log/cron.log

# 2. Verify quota:guardian:reset worker ran
psql -U cerniq -c "
  SELECT * FROM wa_quota_usage 
  WHERE usage_date = '$(date -d 'yesterday' +%Y-%m-%d)'
"

# 3. Manual reset if needed - delete yesterday's keys
redis-cli KEYS "quota:wa:*:$(date -d 'yesterday' +%Y-%m-%d)" | xargs -r redis-cli DEL

# 4. Restart quota reset cron if needed
docker exec cerniq-workers node -e "
  const { Queue } = require('bullmq');
  const q = new Queue('quota:guardian:reset');
  q.add('reset', {}, { repeat: { pattern: '0 0 * * *' } });
"
```

### 3.3 Manual Quota Reset (Emergency Only)

```bash
# ⚠️ WARNING: Only use in case of confirmed bug causing incorrect quota

# 1. Backup current quota values
redis-cli --scan --pattern "quota:wa:*:$(date +%Y-%m-%d)" | \
  xargs -I {} redis-cli GET {} > /tmp/quota-backup-$(date +%Y%m%d-%H%M%S).txt

# 2. Reset specific phone quota
redis-cli SET "quota:wa:{phoneId}:$(date +%Y-%m-%d)" "0"
redis-cli EXPIRE "quota:wa:{phoneId}:$(date +%Y-%m-%d)" 172800

# 3. Document incident
echo "$(date): Manual quota reset for phone {phoneId}. Reason: {reason}" >> /var/log/cerniq/quota-resets.log

# 4. Monitor for 30 minutes to ensure normal operation
watch -n 60 'redis-cli GET "quota:wa:{phoneId}:$(date +%Y-%m-%d)"'
```

---

## 4. QUEUE TROUBLESHOOTING

### 4.1 Queue Backlog Growing

**Symptoms:**

- `waiting` count increasing
- Jobs not being processed
- Workers showing low/no activity

**Diagnosis:**

```bash
# 1. Check worker status
pm2 status

# 2. Check specific queue
curl -s http://localhost:64000/api/admin/queues/outreach:orchestrator:dispatch | jq '{waiting, active, completed, failed}'

# 3. Check worker logs
pm2 logs workers --lines 100 | grep -E "(error|Error|ERROR)"

# 4. Check Redis connection
redis-cli PING

# 5. Check if workers are stuck on a job
curl -s http://localhost:64000/api/admin/queues/q:wa:phone_01/active | jq '.[0]'
```

**Resolution:**

```bash
# If workers crashed
pm2 restart workers

# If single job is stuck (>5 min active)
curl -X POST http://localhost:64000/api/admin/queues/{queueName}/jobs/{jobId}/retry

# If Redis overloaded
redis-cli INFO memory | grep used_memory_human

# If queue needs draining (lost cause)
# ⚠️ WARNING: This loses all waiting jobs!
curl -X POST http://localhost:64000/api/admin/queues/{queueName}/drain
```

### 4.2 High Failed Job Count

**Symptoms:**

- Failed count > 100 in any queue
- Repeated errors in logs
- Same job failing multiple times

**Procedure:**

```bash
# 1. Identify failure pattern
curl -s http://localhost:64000/api/admin/queues/{queueName}/failed?limit=50 | \
  jq '.[].failedReason' | sort | uniq -c | sort -rn

# 2. Check specific failed job
curl -s http://localhost:64000/api/admin/queues/{queueName}/jobs/{jobId} | jq '.stacktrace'

# 3. Common fixes:
# - API rate limited: Reduce concurrency
# - Invalid data: Fix source data
# - Network error: Retry jobs
# - Code bug: Fix and redeploy

# 4. Retry all failed jobs (after fix)
curl -X POST http://localhost:64000/api/admin/queues/{queueName}/retry-failed

# 5. Clean old failed jobs
curl -X POST http://localhost:64000/api/admin/queues/{queueName}/clean-failed?age=86400
```

---

## 5. HITL ESCALATIONS & HUMAN REVIEW

### 5.1 SLA Breach Handling

**When SLA is breached:**

```bash
# 1. Get all breached reviews
curl -s http://localhost:64000/api/v1/outreach/reviews?slaBreached=true

# 2. Check queue depth by priority
psql -U cerniq -c "
  SELECT priority, status, COUNT(*)
  FROM human_review_queue
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY priority, status
  ORDER BY priority
"

# 3. Prioritize by original priority:
#    - URGENT breaches -> Manager notification
#    - HIGH breaches -> Team lead assignment
#    - MEDIUM/LOW -> Auto-assign to available agent

# 4. For URGENT breaches without response in 2 hours:
curl -X POST http://localhost:64000/api/v1/outreach/reviews/{reviewId}/escalate \
  -H "Content-Type: application/json" \
  -d '{"escalateTo": "manager", "reason": "SLA_BREACH_UNRESPONDED"}'

# 5. Track SLA metrics
curl -s http://localhost:64000/api/v1/outreach/analytics/sla-performance
```

### 5.2 SLA Breach Accumulation

**Symptoms:**

- Multiple SLA breaches
- Review queue growing

**Procedure:**

```bash
# 1. Identify bottleneck
# - Too many URGENT items?
# - Users not assigned?
# - Specific reason type?

# 2. Emergency assignment (if users available)
psql -U cerniq -c "
  UPDATE human_review_queue
  SET assigned_to = '{available_user_id}', 
      assigned_at = NOW(),
      status = 'ASSIGNED'
  WHERE status = 'PENDING'
    AND priority = 'URGENT'
  LIMIT 10
"

# 3. Adjust AI thresholds if too many false positives
# Review sentiment threshold in ai:sentiment:analyze worker

# 4. Consider temporary auto-approve for low priority
```

### 5.3 Human Takeover Issues

**Operator cannot send message:**

```bash
# 1. Verify takeover is active
curl -s http://localhost:64000/api/v1/outreach/leads/{leadId} | jq '.isHumanControlled'

# 2. Check assigned phone status
curl -s http://localhost:64000/api/v1/outreach/leads/{leadId} | jq '.assignedPhone.status'

# 3. If phone offline during takeover, temporarily assign different phone
curl -X POST http://localhost:64000/api/v1/outreach/leads/{leadId}/reassign-phone
```

---

## 6. EMAIL DELIVERABILITY ISSUES

### 6.1 High Bounce Rate (>3%)

**Symptoms:**

- Alert: `bounce:high` triggered
- Bounce rate > 3%
- Campaign auto-paused
- Instantly dashboard shows high bounces

**Procedure:**

```bash
# 1. Check bounce rate (internal API)
curl -s http://localhost:64000/api/v1/outreach/analytics/email-deliverability | jq '.bounceRate'

# 2. Check bounce details (Instantly API)
curl -s "https://api.instantly.ai/api/v2/campaign/{campaign_id}/analytics" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" | jq '.bounced'

# 3. Identify bounced emails (internal)
curl -s http://localhost:64000/api/v1/outreach/analytics/bounces?limit=100 | jq '.bounces[] | {email, bounceType, timestamp}'

# 4. Identify bounced emails (database)
psql -U cerniq -c "
  SELECT email, bounce_reason, COUNT(*)
  FROM gold_communication_log 
  WHERE status = 'BOUNCED' 
    AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY email, bounce_reason
  ORDER BY COUNT(*) DESC
  LIMIT 20
"

# 5. Check for patterns:
#    - Same domain bouncing? Domain issue
#    - Random bounces? List quality issue
#    - Soft bounces? Temporary, may retry

# 6. If invalid email data:
#    - Review Etapa 1 email validation
#    - Mark bounced leads as DEAD or remove email

# 7. If domain reputation issue:
#    - Pause all cold email for 24h
#    - Review email content for spam triggers
#    - Contact Instantly.ai support

# 8. Clean bounced emails from future campaigns
curl -X POST http://localhost:64000/api/v1/outreach/email/clean-bounces

# 9. Resume campaign after investigation
curl -X POST http://localhost:64000/api/v1/outreach/campaigns/{campaignId}/resume
curl -X POST "https://api.instantly.ai/api/v2/campaign/{campaign_id}/resume" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY"
```

---

## 7. EMERGENCY PROCEDURES

### 7.1 Full System Stop

**When to use:** Security incident, legal requirement, major bug

```bash
#!/bin/bash
# scripts/emergency-stop.sh

echo "!!! EMERGENCY STOP INITIATED !!!"
echo "Time: $(date)"
echo "Reason: $1"

# 1. Stop all outreach workers
pm2 stop workers-outreach

# 2. Pause all sequences
psql -U cerniq << EOF
UPDATE outreach_sequences SET is_active = FALSE WHERE is_active = TRUE;
EOF

# 3. Pause all phones
curl -X POST http://localhost:64000/api/admin/phones/pause-all

# 4. Clear scheduled jobs
curl -X POST http://localhost:64000/api/admin/queues/outreach:orchestrator:dispatch/pause

# 5. Notify team
curl -X POST https://hooks.slack.com/services/XXX \
  -d '{"text":"🚨 EMERGENCY STOP: Outreach system halted. Reason: '"$1"'"}'

echo "=== System Stopped ==="
echo "To resume, run: ./scripts/emergency-resume.sh"
```

### 7.2 Emergency Resume

```bash
#!/bin/bash
# scripts/emergency-resume.sh

echo "=== Resuming Outreach System ==="

# 1. Verify all clear
read -p "Has the issue been resolved? (yes/no): " confirmed
if [ "$confirmed" != "yes" ]; then
  echo "Resume cancelled"
  exit 1
fi

# 2. Resume workers
pm2 start workers-outreach

# 3. Resume dispatcher
curl -X POST http://localhost:64000/api/admin/queues/outreach:orchestrator:dispatch/resume

# 4. Reactivate sequences (manual per sequence)
echo "Sequences must be manually reactivated"

# 5. Resume phones one by one (monitor each)
for phone in $(curl -s http://localhost:64000/api/v1/outreach/phones | jq -r '.phones[].id'); do
  curl -X POST http://localhost:64000/api/v1/outreach/phones/$phone/resume
  sleep 5  # Wait between resumes
done

# 6. Notify team
curl -X POST https://hooks.slack.com/services/XXX \
  -d '{"text":"✅ Outreach system resumed"}'

echo "=== System Resumed ==="
```

---

## 8. DISASTER RECOVERY

### 8.1 Database Recovery

```bash
# 1. Stop all workers
docker compose -f infra/docker/docker-compose.yml stop workers

# 2. Restore from backup
pg_restore -d cerniq_production /backups/daily/latest/cerniq.dump

# 3. Verify data integrity
psql -U cerniq -c "SELECT COUNT(*) FROM gold_lead_journey"
psql -U cerniq -c "SELECT COUNT(*) FROM gold_communication_log"

# 4. Resync Redis quota counters from database
psql -U cerniq -c "
  SELECT phone_id, COUNT(*) as count
  FROM gold_communication_log 
  WHERE quota_cost = 1 
    AND created_at > CURRENT_DATE
    AND channel = 'WHATSAPP'
  GROUP BY phone_id
" | while read phone count; do
  redis-cli SET "quota:wa:${phone}:$(date +%Y-%m-%d)" "$count" EX 172800
done

# 5. Restart workers
docker compose -f infra/docker/docker-compose.yml start workers

# 6. Verify queues processing
redis-cli -n 2 INFO | grep -A5 "# Keyspace"
```

### 8.2 Redis Recovery

```bash
# 1. If Redis crashed, queues are lost
# Restart Redis
docker compose restart redis

# 2. Regenerate quota counters from database
psql -U cerniq -c "
  SELECT phone_id, COUNT(*) as count
  FROM gold_communication_log 
  WHERE quota_cost = 1 
    AND created_at > CURRENT_DATE
    AND channel = 'WHATSAPP'
  GROUP BY phone_id
" | while read phone count; do
  redis-cli SET "quota:wa:${phone}:$(date +%Y-%m-%d)" "$count" EX 172800
done

# 3. Regenerate phone status keys
psql -U cerniq -c "SELECT id, status FROM wa_phone_numbers" | while read id status; do
  redis-cli SET "phone:status:${id}" "$status"
done

# 4. Reschedule pending follow-ups
psql -U cerniq -c "
  SELECT lead_id, next_action_at
  FROM gold_lead_journey
  WHERE next_action_at IS NOT NULL
    AND next_action_at > NOW()
    AND sequence_paused = FALSE
" | while read lead_id next_action; do
  # Re-add to delayed queue
  delay_ms=$(($(date -d "$next_action" +%s) - $(date +%s)))000
  echo "Rescheduling $lead_id for $next_action (delay: ${delay_ms}ms)"
  # Actual reschedule via API would go here
done

# 5. BullMQ will auto-recover active jobs on restart
```

---

## 9. MONITORING ALERTS

### 9.1 Alert Response Matrix

| Alert | Severity | Response Time | Procedure |
| ----- | -------- | ------------- | --------- |
| `phone:offline` | HIGH | 15 min | Section 2.1 |
| `phone:banned` | CRITICAL | Immediate | Section 2.2 |
| `bounce:high` | HIGH | 30 min | Section 6.1 |
| `sla:breach` | MEDIUM | 1 hour | Section 5.1 |
| `quota:exhausted` | MEDIUM | 1 hour | Section 3.1 |
| `dlq:overflow` | HIGH | 15 min | Section 4.2 |
| `timelinesai:down` | CRITICAL | Immediate | Check vendor status |
| `queue:backlog` | MEDIUM | 30 min | Section 4.1 |

### 9.2 Escalation Path

1. **L1 (On-call Engineer)**: All HIGH/CRITICAL alerts
2. **L2 (Team Lead)**: Unresolved after 30 min
3. **L3 (Manager)**: Unresolved after 2 hours or major incident

---

## 10. MAINTENANCE WINDOWS

### 10.1 Weekly Maintenance (Sunday 02:00-04:00)

```bash
#!/bin/bash
# scripts/weekly-maintenance.sh

echo "=== CERNIQ Weekly Maintenance ==="
echo "Date: $(date)"

# 1. Archive old communication logs
psql -U cerniq << EOF
INSERT INTO gold_communication_log_archive
SELECT * FROM gold_communication_log
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM gold_communication_log
WHERE created_at < NOW() - INTERVAL '90 days';
EOF

# 2. Vacuum analyze
psql -U cerniq -c "VACUUM ANALYZE gold_communication_log;"
psql -U cerniq -c "VACUUM ANALYZE gold_lead_journey;"

# 3. Clear completed jobs older than 7 days
curl -X POST http://localhost:64000/api/admin/queues/clean-completed?maxAge=604800

# 4. Clear old DLQ entries (keep last 1000)
redis-cli -n 2 KEYS "bull:dlq:*" | xargs -I {} redis-cli -n 2 LTRIM {} 0 999

# 5. Rotate logs
logrotate /etc/logrotate.d/cerniq

# 6. Health report
./scripts/generate-health-report.sh > /var/log/cerniq/weekly-report-$(date +%Y%m%d).txt

# 7. Update system packages (if no critical updates)
# apt update && apt upgrade -y

echo "=== Weekly Maintenance Complete ==="
```

---

## Document History

| Versiune | Data | Modificări |
| -------- | ---- | ---------- |
| 1.0 | 15 Ianuarie 2026 | Versiune inițială (2 documente separate) |
| 1.1 | 18 Ianuarie 2026 | Consolidare `etapa2-runbook.md` + `etapa2-runbook-operational.md` |

---

**Document generat:** 18 Ianuarie 2026  
**Consolidat din:** `etapa2-runbook.md` + `etapa2-runbook-operational.md`  
**Conformitate:** Master Spec v1.2
