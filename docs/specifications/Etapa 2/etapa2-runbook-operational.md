# CERNIQ.APP — ETAPA 2: RUNBOOK OPERAȚIONAL
## Procedures for Cold Outreach System Operations
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. DAILY OPERATIONS

## 1.1 Morning Checklist (09:00)

```bash
#!/bin/bash
# daily-morning-check.sh

echo "=== CERNIQ OUTREACH MORNING CHECK ==="

# 1. Check all phones are online
curl -s https://api.cerniq.app/v1/outreach/phones | jq '.[] | select(.status != "ACTIVE") | .label'

# 2. Check quota reset happened
curl -s https://api.cerniq.app/v1/outreach/phones | jq '.[] | .quota.used'

# 3. Check pending reviews
curl -s https://api.cerniq.app/v1/outreach/reviews/stats | jq '.pending'

# 4. Check queue depths
redis-cli -n 2 KEYS "bull:*:waiting" | xargs -I {} redis-cli -n 2 LLEN {}

# 5. Check for SLA breaches overnight
curl -s https://api.cerniq.app/v1/outreach/reviews?slaBreached=true | jq '.meta.total'

# 6. Verify TimelinesAI connection
for i in {1..20}; do
  status=$(redis-cli GET "phone:status:phone_$(printf '%02d' $i)")
  echo "Phone $i: $status"
done
```

## 1.2 Evening Checklist (18:00)

```bash
#!/bin/bash
# daily-evening-check.sh

echo "=== CERNIQ OUTREACH EVENING CHECK ==="

# 1. Daily statistics summary
curl -s https://api.cerniq.app/v1/outreach/analytics/daily | jq '
  {
    contacted: .metrics.contacted[-1],
    replied: .metrics.replied[-1],
    converted: .metrics.converted[-1],
    reviews: .metrics.reviewsResolved[-1]
  }
'

# 2. Check for failed jobs
redis-cli -n 2 LLEN "bull:dlq:outreach"

# 3. Archive communication logs older than 90 days
# (scheduled task, verify it ran)
psql -c "SELECT COUNT(*) FROM gold_communication_log WHERE created_at < NOW() - INTERVAL '90 days'"

# 4. Backup verification
ls -la /backups/daily/$(date +%Y-%m-%d)/

# 5. Generate daily report
curl -X POST https://api.cerniq.app/v1/internal/reports/daily
```

---

# 2. PHONE MANAGEMENT

## 2.1 Phone Goes Offline

**Symptoms:**
- Alert: `phone:offline` triggered
- Dashboard shows phone status OFFLINE
- Messages queued but not sending

**Procedure:**

```bash
# 1. Check TimelinesAI status
curl -s "https://api.timelines.ai/v1/accounts/{account_id}/status" \
  -H "Authorization: Bearer $TIMELINESAI_API_KEY"

# 2. Check phone in database
psql -c "SELECT * FROM wa_phone_numbers WHERE id = '{phone_id}'"

# 3. If phone disconnected from WhatsApp:
#    - Login to TimelinesAI dashboard
#    - Scan QR code to reconnect
#    - Wait 5 minutes for sync

# 4. After reconnection, update status
curl -X PATCH "https://api.cerniq.app/v1/outreach/phones/{phone_id}" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE"}'

# 5. Verify pending messages resume
redis-cli -n 2 LLEN "bull:q:wa:phone_{XX}:waiting"
```

## 2.2 Phone Gets Banned

**Symptoms:**
- Alert: `phone:banned` triggered
- TimelinesAI returns 403/blocked errors
- Leads assigned to phone stuck

**Procedure:**

```bash
# 1. Mark phone as banned (prevents new assignments)
psql -c "UPDATE wa_phone_numbers SET status = 'BANNED', status_changed_at = NOW() WHERE id = '{phone_id}'"

# 2. Reassign leads to other phones
psql -c "
  UPDATE gold_lead_journey 
  SET assigned_phone_id = NULL, assigned_at = NULL
  WHERE assigned_phone_id = '{phone_id}'
    AND engagement_stage IN ('COLD', 'CONTACTED_WA')
"

# 3. Cancel pending jobs for this phone
redis-cli -n 2 DEL "bull:q:wa:phone_{XX}:waiting"
redis-cli -n 2 DEL "bull:q:wa:phone_{XX}:delayed"

# 4. Report to TimelinesAI support
# 5. Prepare replacement phone
# 6. Update phone count in configuration if necessary
```

## 2.3 Adding New Phone

```bash
# 1. Register phone in TimelinesAI dashboard
#    Get: account_id, phone_id from TimelinesAI

# 2. Insert into database
psql -c "
  INSERT INTO wa_phone_numbers (
    tenant_id, phone_number, phone_label, timelinesai_account_id,
    status, daily_quota_limit, is_enabled
  ) VALUES (
    '{tenant_id}', '+40xxxxxxxxx', 'Sales 21', '{timelinesai_account_id}',
    'ACTIVE', 200, true
  )
"

# 3. Initialize Redis keys
redis-cli SET "phone:status:{phone_id}" "ACTIVE"
redis-cli SET "quota:wa:{phone_id}:$(date +%Y-%m-%d)" "0" EX 172800

# 4. Create BullMQ queue for phone
# (automatic on first job)

# 5. Test with single message
curl -X POST "https://api.cerniq.app/v1/outreach/test/send" \
  -d '{"phoneId": "{phone_id}", "testNumber": "+40xxxxxxxx"}'
```

---

# 3. QUOTA MANAGEMENT

## 3.1 Quota Exhausted Early

**Symptoms:**
- Phones hitting 200 limit before end of day
- Many leads waiting in COLD stage

**Procedure:**

```bash
# 1. Check current usage across all phones
for phone in $(psql -t -c "SELECT id FROM wa_phone_numbers WHERE status = 'ACTIVE'"); do
  usage=$(redis-cli GET "quota:wa:${phone}:$(date +%Y-%m-%d)")
  echo "Phone $phone: $usage/200"
done

# 2. If legitimate high volume:
#    - Review if more phones needed
#    - Adjust dispatch batch size

# 3. Check for quota leak (bug)
psql -c "
  SELECT phone_id, COUNT(*) as messages_today
  FROM gold_communication_log 
  WHERE created_at > CURRENT_DATE 
    AND channel = 'WHATSAPP' 
    AND quota_cost = 1
  GROUP BY phone_id
"

# 4. Manual quota adjustment (emergency only!)
# redis-cli SET "quota:wa:{phone_id}:$(date +%Y-%m-%d)" "150" EX 172800
```

## 3.2 Quota Reset Issue

**Symptoms:**
- Quotas not resetting at midnight
- Redis keys persisting past 24h

**Procedure:**

```bash
# 1. Check cron job status
systemctl status cron
grep quota /var/log/cron.log

# 2. Manual reset if needed
redis-cli KEYS "quota:wa:*:$(date -d 'yesterday' +%Y-%m-%d)" | xargs -r redis-cli DEL

# 3. Verify quota:guardian:reset worker ran
psql -c "
  SELECT * FROM wa_quota_usage 
  WHERE usage_date = '$(date -d 'yesterday' +%Y-%m-%d)'
"

# 4. Restart quota reset cron if needed
docker exec cerniq-workers node -e "
  const { Queue } = require('bullmq');
  const q = new Queue('quota:guardian:reset');
  q.add('reset', {}, { repeat: { pattern: '0 0 * * *' } });
"
```

---

# 4. EMAIL DELIVERABILITY

## 4.1 High Bounce Rate

**Symptoms:**
- Alert: `bounce:high` triggered
- Bounce rate > 3%
- Campaign auto-paused

**Procedure:**

```bash
# 1. Check bounce details
curl -s "https://api.instantly.ai/api/v2/campaign/{campaign_id}/analytics" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY" | jq '.bounced'

# 2. Identify bounced emails
psql -c "
  SELECT email, bounce_reason, COUNT(*)
  FROM gold_communication_log 
  WHERE status = 'BOUNCED' 
    AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY email, bounce_reason
  ORDER BY COUNT(*) DESC
  LIMIT 20
"

# 3. If invalid email data:
#    - Review Etapa 1 email validation
#    - Mark bounced leads as DEAD or remove email

# 4. If domain reputation issue:
#    - Pause all cold email for 24h
#    - Review email content for spam triggers
#    - Contact Instantly.ai support

# 5. Resume campaign after investigation
curl -X POST "https://api.instantly.ai/api/v2/campaign/{campaign_id}/resume" \
  -H "Authorization: Bearer $INSTANTLY_API_KEY"
```

---

# 5. HUMAN REVIEW QUEUE

## 5.1 SLA Breach Accumulation

**Symptoms:**
- Multiple SLA breaches
- Review queue growing

**Procedure:**

```bash
# 1. Check queue depth by priority
psql -c "
  SELECT priority, status, COUNT(*)
  FROM human_review_queue
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY priority, status
  ORDER BY priority
"

# 2. Identify bottleneck
# - Too many URGENT items?
# - Users not assigned?
# - Specific reason type?

# 3. Emergency assignment (if users available)
psql -c "
  UPDATE human_review_queue
  SET assigned_to = '{available_user_id}', 
      assigned_at = NOW(),
      status = 'ASSIGNED'
  WHERE status = 'PENDING'
    AND priority = 'URGENT'
  LIMIT 10
"

# 4. Adjust AI thresholds if too many false positives
# Review sentiment threshold in ai:sentiment:analyze worker

# 5. Consider temporary auto-approve for low priority
```

---

# 6. DISASTER RECOVERY

## 6.1 Database Recovery

```bash
# 1. Stop all workers
docker compose -f infra/docker/docker-compose.yml stop workers

# 2. Restore from backup
pg_restore -d cerniq_production /backups/daily/latest/cerniq.dump

# 3. Verify data integrity
psql -c "SELECT COUNT(*) FROM gold_lead_journey"
psql -c "SELECT COUNT(*) FROM gold_communication_log"

# 4. Resync Redis quota counters from database
psql -c "
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

## 6.2 Redis Recovery

```bash
# 1. If Redis crashed, queues are lost
# Restart Redis
docker compose restart redis

# 2. Regenerate quota counters from database
# (see script above)

# 3. Regenerate phone status keys
psql -c "SELECT id, status FROM wa_phone_numbers" | while read id status; do
  redis-cli SET "phone:status:${id}" "$status"
done

# 4. Reschedule pending follow-ups
psql -c "
  SELECT lead_id, next_action_at
  FROM gold_lead_journey
  WHERE next_action_at IS NOT NULL
    AND next_action_at > NOW()
    AND sequence_paused = FALSE
" | while read lead_id next_action; do
  # Re-add to delayed queue
  delay_ms=$(($(date -d "$next_action" +%s) - $(date +%s)))000
  echo "Rescheduling $lead_id for $next_action"
done

# 5. BullMQ will auto-recover active jobs on restart
```

---

# 7. MONITORING ALERTS

## 7.1 Alert Response Matrix

| Alert | Severity | Response Time | Procedure |
|-------|----------|---------------|-----------|
| `phone:offline` | HIGH | 15 min | Section 2.1 |
| `phone:banned` | CRITICAL | Immediate | Section 2.2 |
| `bounce:high` | HIGH | 30 min | Section 4.1 |
| `sla:breach` | MEDIUM | 1 hour | Section 5.1 |
| `quota:exhausted` | MEDIUM | 1 hour | Section 3.1 |
| `dlq:overflow` | HIGH | 15 min | Check DLQ, fix errors |
| `timelinesai:down` | CRITICAL | Immediate | Check vendor status |

---

# 8. MAINTENANCE WINDOWS

## 8.1 Weekly Maintenance (Sunday 02:00-04:00)

```bash
# 1. Database vacuum
psql -c "VACUUM ANALYZE gold_communication_log"
psql -c "VACUUM ANALYZE gold_lead_journey"

# 2. Archive old data
psql -c "
  INSERT INTO gold_communication_log_archive
  SELECT * FROM gold_communication_log 
  WHERE created_at < NOW() - INTERVAL '90 days'
"
psql -c "
  DELETE FROM gold_communication_log 
  WHERE created_at < NOW() - INTERVAL '90 days'
"

# 3. Clear old DLQ entries
redis-cli -n 2 KEYS "bull:dlq:*" | xargs -I {} redis-cli -n 2 LTRIM {} 0 999

# 4. Rotate logs
logrotate /etc/logrotate.d/cerniq

# 5. Update system packages (if no critical updates)
apt update && apt upgrade -y
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
