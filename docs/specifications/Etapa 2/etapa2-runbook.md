# CERNIQ.APP — ETAPA 2: RUNBOOK OPERATIONAL
## Procedures, Troubleshooting & Emergency Response
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. DAILY OPERATIONS

## 1.1 Morning Checklist (09:00)

```bash
#!/bin/bash
# scripts/daily-morning-check.sh

echo "=== CERNIQ Etapa 2 Morning Check ==="
echo "Date: $(date)"

# 1. Check all phones online
echo -e "\n[1/6] WhatsApp Phones Status:"
curl -s http://localhost:3000/api/v1/outreach/phones | jq '.phones[] | {label, status, quotaUsed: .quota.used}'

# 2. Check quota reset
echo -e "\n[2/6] Quota Reset Verification:"
redis-cli KEYS "quota:wa:*:$(date +%Y-%m-%d)" | wc -l
echo "Active quota keys for today"

# 3. Check queue health
echo -e "\n[3/6] BullMQ Queue Health:"
curl -s http://localhost:3000/api/admin/queues/health | jq '.queues | to_entries[] | {name: .key, waiting: .value.waiting, active: .value.active, failed: .value.failed}'

# 4. Check pending reviews
echo -e "\n[4/6] Pending Reviews:"
curl -s http://localhost:3000/api/v1/outreach/reviews?status=PENDING | jq '.counts'

# 5. Check yesterday's metrics
echo -e "\n[5/6] Yesterday's Metrics:"
curl -s "http://localhost:3000/api/v1/outreach/analytics/daily-stats?date=$(date -d 'yesterday' +%Y-%m-%d)" | jq '.stats'

# 6. Check disk space
echo -e "\n[6/6] Disk Space:"
df -h /var/lib/postgresql/data
df -h /var/lib/redis

echo -e "\n=== Morning Check Complete ==="
```

## 1.2 Evening Checklist (18:00)

```bash
#!/bin/bash
# scripts/daily-evening-check.sh

echo "=== CERNIQ Etapa 2 Evening Check ==="

# 1. Day's performance summary
echo -e "\n[1/4] Today's Performance:"
curl -s http://localhost:3000/api/v1/outreach/analytics/dashboard | jq '.today'

# 2. Quota usage summary
echo -e "\n[2/4] Quota Usage Summary:"
curl -s http://localhost:3000/api/v1/outreach/phones | jq '[.phones[].quota.used] | add' 
echo "/ 4000 total capacity used"

# 3. Unresolved reviews
echo -e "\n[3/4] Unresolved Reviews (SLA risk):"
curl -s http://localhost:3000/api/v1/outreach/reviews?status=PENDING | jq '.reviews | map(select(.slaBrached == true or (.slaDueAt | fromdate) < now)) | length'
echo "reviews at SLA risk"

# 4. Failed jobs
echo -e "\n[4/4] Failed Jobs Today:"
curl -s http://localhost:3000/api/admin/queues/failed | jq 'length'
echo "failed jobs"

echo -e "\n=== Evening Check Complete ==="
```

---

# 2. PHONE MANAGEMENT PROCEDURES

## 2.1 Phone Goes Offline

**Symptoms:**
- Alert: `phone:offline` triggered
- Messages queuing but not sending
- TimelinesAI dashboard shows disconnected

**Procedure:**

```bash
# 1. Check phone status
curl -s http://localhost:3000/api/v1/outreach/phones/{phoneId} | jq '.status'

# 2. Check TimelinesAI connection
curl -s https://api.timelines.ai/v1/accounts/{timelinesaiAccountId}/status \
  -H "Authorization: Bearer $TIMELINESAI_API_KEY"

# 3. If reconnectable, trigger reconnect
curl -X POST http://localhost:3000/api/v1/outreach/phones/{phoneId}/reconnect

# 4. If requires manual action:
# - Login to TimelinesAI dashboard
# - Scan QR code on physical phone
# - Verify connection

# 5. Resume phone after reconnection
curl -X POST http://localhost:3000/api/v1/outreach/phones/{phoneId}/resume

# 6. Check pending messages are processing
curl -s http://localhost:3000/api/admin/queues/q:wa:phone_{XX}/waiting | jq 'length'
```

## 2.2 Phone Gets Banned

**Symptoms:**
- Alert: `phone:banned` triggered
- TimelinesAI returns 403/banned error
- Phone status = BANNED

**Procedure:**

```bash
# CRITICAL: DO NOT attempt to reconnect banned phone!

# 1. Confirm ban status
curl -s http://localhost:3000/api/v1/outreach/phones/{phoneId} | jq '.status'

# 2. Reassign leads from banned phone
curl -X POST http://localhost:3000/api/v1/outreach/phones/{phoneId}/reassign-leads

# 3. Update phone number in system (after obtaining replacement)
# This requires manual database update and TimelinesAI reconfiguration

# 4. Review messaging patterns that may have caused ban
curl -s "http://localhost:3000/api/v1/outreach/analytics/phones/{phoneId}/history?days=7" | jq '.dailyStats'

# 5. Document incident in runbook
echo "$(date): Phone {phoneId} banned. Reason: {suspected_reason}" >> /var/log/cerniq/phone-incidents.log
```

## 2.3 Adding New Phone

```bash
# 1. Configure in TimelinesAI first
# - Add new WhatsApp account
# - Get account_id from dashboard

# 2. Add to database
psql -U cerniq cerniq_production << EOF
INSERT INTO wa_phone_numbers (
  tenant_id, phone_number, phone_label, timelinesai_account_id, status
) VALUES (
  '{tenant_uuid}', '+40712345678', 'Sales 21', '{timelinesai_account_id}', 'ACTIVE'
);
EOF

# 3. Verify health check
curl -X POST http://localhost:3000/api/admin/phones/health-check

# 4. Add queue worker
# Update workers/whatsapp/index.ts to include new phone queue
```

---

# 3. QUOTA MANAGEMENT

## 3.1 Quota Exceeded Mid-Day

**Symptoms:**
- All phones at 200/200
- New leads queuing but not sending
- Dashboard shows 100% quota

**Response:**

```bash
# 1. Verify actual usage
for i in {01..20}; do
  usage=$(redis-cli GET "quota:wa:phone_$i:$(date +%Y-%m-%d)" || echo "0")
  echo "Phone $i: $usage/200"
done

# 2. Check for incorrect quota consumption
# (e.g., follow-ups incorrectly counted as new)
psql -U cerniq << EOF
SELECT quota_cost, COUNT(*) 
FROM gold_communication_log 
WHERE DATE(sent_at) = CURRENT_DATE 
  AND channel = 'WHATSAPP'
GROUP BY quota_cost;
EOF

# 3. If legitimate, no action needed - messages will queue for tomorrow

# 4. If urgent leads need contact, use email channel as fallback
curl -X POST http://localhost:3000/api/v1/outreach/leads/{leadId}/send-message \
  -H "Content-Type: application/json" \
  -d '{"channel": "EMAIL_WARM", "content": "..."}'
```

## 3.2 Manual Quota Reset (Emergency Only)

```bash
# WARNING: Only use in case of confirmed bug causing incorrect quota

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

# 4. QUEUE TROUBLESHOOTING

## 4.1 Queue Backlog Growing

**Symptoms:**
- `waiting` count increasing
- Jobs not being processed
- Workers showing low/no activity

**Diagnosis:**

```bash
# 1. Check worker status
pm2 status

# 2. Check specific queue
curl -s http://localhost:3000/api/admin/queues/outreach:orchestrator:dispatch | jq '{waiting, active, completed, failed}'

# 3. Check worker logs
pm2 logs workers --lines 100 | grep -E "(error|Error|ERROR)"

# 4. Check Redis connection
redis-cli PING

# 5. Check if workers are stuck on a job
curl -s http://localhost:3000/api/admin/queues/q:wa:phone_01/active | jq '.[0]'
```

**Resolution:**

```bash
# If workers crashed
pm2 restart workers

# If single job is stuck (>5 min active)
curl -X POST http://localhost:3000/api/admin/queues/{queueName}/jobs/{jobId}/retry

# If Redis overloaded
# Check memory usage
redis-cli INFO memory | grep used_memory_human

# If queue needs draining (lost cause)
curl -X POST http://localhost:3000/api/admin/queues/{queueName}/drain
# WARNING: This loses all waiting jobs!
```

## 4.2 High Failed Job Count

**Symptoms:**
- Failed count > 100 in any queue
- Repeated errors in logs
- Same job failing multiple times

**Procedure:**

```bash
# 1. Identify failure pattern
curl -s http://localhost:3000/api/admin/queues/{queueName}/failed?limit=50 | \
  jq '.[].failedReason' | sort | uniq -c | sort -rn

# 2. Check specific failed job
curl -s http://localhost:3000/api/admin/queues/{queueName}/jobs/{jobId} | jq '.stacktrace'

# 3. Common fixes:
# - API rate limited: Reduce concurrency
# - Invalid data: Fix source data
# - Network error: Retry jobs
# - Code bug: Fix and redeploy

# 4. Retry all failed jobs (after fix)
curl -X POST http://localhost:3000/api/admin/queues/{queueName}/retry-failed

# 5. Clean old failed jobs
curl -X POST http://localhost:3000/api/admin/queues/{queueName}/clean-failed?age=86400
```

---

# 5. HITL ESCALATIONS

## 5.1 SLA Breach Handling

**When SLA is breached:**

```bash
# 1. Get all breached reviews
curl -s http://localhost:3000/api/v1/outreach/reviews?slaBrached=true

# 2. Prioritize by original priority
# URGENT breaches -> Manager notification
# HIGH breaches -> Team lead assignment
# MEDIUM/LOW -> Auto-assign to available agent

# 3. For URGENT breaches without response in 2 hours:
curl -X POST http://localhost:3000/api/v1/outreach/reviews/{reviewId}/escalate \
  -d '{"escalateTo": "manager", "reason": "SLA_BREACH_UNRESPONDED"}'

# 4. Track SLA metrics
curl -s http://localhost:3000/api/v1/outreach/analytics/sla-performance
```

## 5.2 Human Takeover Issues

**Operator cannot send message:**

```bash
# 1. Verify takeover is active
curl -s http://localhost:3000/api/v1/outreach/leads/{leadId} | jq '.isHumanControlled'

# 2. Check assigned phone status
curl -s http://localhost:3000/api/v1/outreach/leads/{leadId} | jq '.assignedPhone.status'

# 3. If phone offline during takeover, temporarily assign different phone
curl -X POST http://localhost:3000/api/v1/outreach/leads/{leadId}/reassign-phone
```

---

# 6. EMAIL DELIVERABILITY ISSUES

## 6.1 High Bounce Rate (>3%)

**Symptoms:**
- Alert: `bounce:high` triggered
- Campaign auto-paused
- Instantly dashboard shows high bounces

**Procedure:**

```bash
# 1. Check bounce rate
curl -s http://localhost:3000/api/v1/outreach/analytics/email-deliverability | jq '.bounceRate'

# 2. Identify bounced emails
curl -s http://localhost:3000/api/v1/outreach/analytics/bounces?limit=100 | jq '.bounces[] | {email, bounceType, timestamp}'

# 3. Check for patterns
# - Same domain bouncing? Domain issue
# - Random bounces? List quality issue
# - Soft bounces? Temporary, may retry

# 4. Clean bounced emails from future campaigns
curl -X POST http://localhost:3000/api/v1/outreach/email/clean-bounces

# 5. Resume campaign after investigation
curl -X POST http://localhost:3000/api/v1/outreach/campaigns/{campaignId}/resume
```

---

# 7. EMERGENCY PROCEDURES

## 7.1 Full System Stop

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
curl -X POST http://localhost:3000/api/admin/phones/pause-all

# 4. Clear scheduled jobs
curl -X POST http://localhost:3000/api/admin/queues/outreach:orchestrator:dispatch/pause

# 5. Notify team
curl -X POST https://hooks.slack.com/services/XXX \
  -d '{"text":"🚨 EMERGENCY STOP: Outreach system halted. Reason: '"$1"'"}'

echo "=== System Stopped ==="
echo "To resume, run: ./scripts/emergency-resume.sh"
```

## 7.2 Emergency Resume

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
curl -X POST http://localhost:3000/api/admin/queues/outreach:orchestrator:dispatch/resume

# 4. Reactivate sequences (manual per sequence)
echo "Sequences must be manually reactivated"

# 5. Resume phones one by one (monitor each)
for phone in $(curl -s http://localhost:3000/api/v1/outreach/phones | jq -r '.phones[].id'); do
  curl -X POST http://localhost:3000/api/v1/outreach/phones/$phone/resume
  sleep 5  # Wait between resumes
done

# 6. Notify team
curl -X POST https://hooks.slack.com/services/XXX \
  -d '{"text":"✅ Outreach system resumed"}'

echo "=== System Resumed ==="
```

---

# 8. MAINTENANCE WINDOWS

## 8.1 Weekly Maintenance (Sunday 02:00-04:00)

```bash
#!/bin/bash
# scripts/weekly-maintenance.sh

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
curl -X POST http://localhost:3000/api/admin/queues/clean-completed?maxAge=604800

# 4. Rotate logs
logrotate /etc/logrotate.d/cerniq

# 5. Health report
./scripts/generate-health-report.sh > /var/log/cerniq/weekly-report-$(date +%Y%m%d).txt
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
