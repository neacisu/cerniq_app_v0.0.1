# CERNIQ.APP — ETAPA 2: WORKERS CATEGORIILE F-L
## Templates, Webhooks, Sequences, State Machine, AI, Monitoring, Human
### Versiunea 1.1 | 2 Februarie 2026

---

# CATEGORIA F: TEMPLATE & CONTENT (3 Workers)

## Worker #24: template:spintax:process

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `template:spintax:process` |
| **Concurrency** | 100 |
| **Purpose** | Process spintax in templates |

```typescript
// Spintax: {option1|option2|option3}
export function processSpintax(
  template: string, 
  variables: Record<string, string>
): string {
  // Replace variables
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  // Process spintax
  const spintaxRegex = /\{([^{}]+)\}/g;
  result = result.replace(spintaxRegex, (match, options) => {
    const choices = options.split('|');
    return choices[Math.floor(Math.random() * choices.length)];
  });
  
  return result;
}

// Example template:
// "{Bună ziua|Salut|Hello} {{contactName}},
// {Vă contactez|Scriu} {în legătură cu|referitor la} {{companyName}}."
```

## Worker #25: template:personalize

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `template:personalize` |
| **Concurrency** | 100 |
| **Purpose** | Add lead-specific personalization |

```typescript
interface PersonalizeJobData {
  templateId: string;
  leadId: string;
  channel: 'WHATSAPP' | 'EMAIL';
}

export async function personalizeProcessor(
  job: Job<PersonalizeJobData>
): Promise<PersonalizeResult> {
  const { templateId, leadId, channel } = job.data;
  
  const [template, lead] = await Promise.all([
    db.query.outreachTemplates.findFirst({ where: eq(outreachTemplates.id, templateId) }),
    db.query.goldLeadJourney.findFirst({ 
      where: eq(goldLeadJourney.leadId, leadId),
      with: { goldCompany: true },
    }),
  ]);
  
  const variables = {
    companyName: lead.goldCompany.denumire,
    contactName: lead.goldCompany.contactPrincipalNume || '',
    judet: lead.goldCompany.judet || '',
    localitate: lead.goldCompany.localitate || '',
    sector: lead.goldCompany.isAgricultural ? 'agricol' : 'afaceri',
  };
  
  const personalizedContent = processSpintax(template.content, variables);
  
  return {
    templateId,
    leadId,
    originalContent: template.content,
    personalizedContent,
    variablesUsed: Object.keys(variables),
  };
}
```

## Worker #26: template:validate

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `template:validate` |
| **Concurrency** | 50 |
| **Purpose** | Validate template syntax and variables |

---

# CATEGORIA G: WEBHOOK INGEST (4 Workers)

## Worker #27: webhook:timelinesai:ingest

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `webhook:timelinesai:ingest` |
| **Concurrency** | 100 |
| **Purpose** | Process TimelinesAI webhooks |

```typescript
interface TimelinesAIWebhook {
  whatsapp_account: { phone: string; id: string };
  chat: { 
    chat_id: string; 
    chat_url: string; 
    full_name: string;
    is_new_chat: boolean;
    is_group: boolean;
  };
  messages: Array<{
    id: string;
    body: string;
    timestamp: number;
    from_me: boolean;
    type: 'text' | 'image' | 'document';
  }>;
}

export async function timelinesaiIngestProcessor(
  job: Job<TimelinesAIWebhook>
): Promise<SystemEvent[]> {
  const { chat, messages, whatsapp_account } = job.data;
  const events: SystemEvent[] = [];
  
  for (const msg of messages) {
    if (msg.from_me) continue; // Skip outbound
    
    const event: SystemEvent = {
      eventId: `tai-${msg.id}`,
      eventType: 'REPLY',
      channel: 'WHATSAPP',
      source: 'TIMELINESAI',
      externalChatId: chat.chat_id,
      externalMessageId: msg.id,
      content: msg.body,
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
      metadata: { chatUrl: chat.chat_url, isNewChat: chat.is_new_chat },
    };
    
    // Find lead
    const commLog = await db.query.goldCommunicationLog.findFirst({
      where: eq(goldCommunicationLog.threadId, chat.chat_id),
    });
    
    if (commLog) {
      event.leadId = commLog.leadJourneyId;
      
      // Trigger downstream processing
      await triggerQueue('lead:state:transition', {
        leadId: event.leadId,
        newState: 'WARM_REPLY',
        trigger: 'WEBHOOK_REPLY',
      });
      
      await triggerQueue('sequence:stop', { leadId: event.leadId });
      await triggerQueue('ai:sentiment:analyze', { 
        leadId: event.leadId, 
        content: msg.body 
      });
    }
    
    events.push(event);
  }
  
  return events;
}
```

## Worker #28: webhook:instantly:ingest

```typescript
type InstantlyEvent = 
  | { event_type: 'email_sent'; lead_email: string; campaign_id: string }
  | { event_type: 'email_opened'; lead_email: string; open_count: number }
  | { event_type: 'reply_received'; lead_email: string; reply_text: string }
  | { event_type: 'email_bounced'; lead_email: string; bounce_type: string }
  | { event_type: 'lead_unsubscribed'; lead_email: string };

export async function instantlyIngestProcessor(
  job: Job<InstantlyEvent>
): Promise<SystemEvent> {
  const payload = job.data;
  
  // Find lead by email
  const lead = await db.query.goldCompanies.findFirst({
    where: eq(goldCompanies.emailPrincipal, payload.lead_email),
  });
  
  const eventTypeMap: Record<string, string> = {
    'email_sent': 'SENT',
    'email_opened': 'OPEN',
    'reply_received': 'REPLY',
    'email_bounced': 'BOUNCE',
    'lead_unsubscribed': 'UNSUBSCRIBE',
  };
  
  const event: SystemEvent = {
    eventId: `ins-${Date.now()}`,
    eventType: eventTypeMap[payload.event_type] as any,
    channel: 'EMAIL_COLD',
    source: 'INSTANTLY',
    leadId: lead?.id,
    metadata: payload,
  };
  
  // Handle specific events
  if (payload.event_type === 'reply_received' && lead) {
    await triggerQueue('lead:state:transition', {
      leadId: lead.id,
      newState: 'WARM_REPLY',
    });
  }
  
  if (payload.event_type === 'email_bounced') {
    await triggerQueue('email:cold:lead:status', {
      email: payload.lead_email,
      status: 'BOUNCED',
      bounceType: payload.bounce_type,
    });
  }
  
  return event;
}
```

## Worker #29: webhook:resend:ingest

```typescript
interface ResendWebhook {
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.opened' | 'email.clicked';
  data: {
    email_id: string;
    to: string[];
    tags?: { name: string; value: string }[];
  };
}

export async function resendIngestProcessor(
  job: Job<ResendWebhook>
): Promise<SystemEvent> {
  const { type, data } = job.data;
  
  // Get lead_id from tags
  const leadIdTag = data.tags?.find(t => t.name === 'lead_id');
  
  const eventTypeMap: Record<string, string> = {
    'email.sent': 'SENT',
    'email.delivered': 'DELIVERED',
    'email.bounced': 'BOUNCE',
    'email.opened': 'OPEN',
    'email.clicked': 'CLICK',
  };
  
  return {
    eventId: `resend-${data.email_id}`,
    eventType: eventTypeMap[type] as any,
    channel: 'EMAIL_WARM',
    source: 'RESEND',
    leadId: leadIdTag?.value,
    externalMessageId: data.email_id,
  };
}
```

## Worker #30: webhook:normalize

| Purpose | Normalize all webhook events to SystemEvent |

---

# CATEGORIA H: SEQUENCE MANAGEMENT (4 Workers)

## Worker #31: sequence:schedule:followup

```typescript
interface ScheduleFollowupJobData {
  leadId: string;
  sequenceId: string;
  currentStep: number;
}

export async function scheduleFollowupProcessor(
  job: Job<ScheduleFollowupJobData>
): Promise<ScheduleFollowupResult> {
  const { leadId, sequenceId, currentStep } = job.data;
  
  // Get sequence configuration
  const sequence = await db.query.outreachSequences.findFirst({
    where: eq(outreachSequences.id, sequenceId),
    with: { steps: true },
  });
  
  const nextStep = sequence.steps.find(s => s.stepNumber === currentStep + 1);
  
  if (!nextStep) {
    // Sequence complete
    await db.update(sequenceEnrollments)
      .set({ status: 'COMPLETED', completedAt: new Date() })
      .where(eq(sequenceEnrollments.leadId, leadId));
    
    return { scheduled: false, reason: 'SEQUENCE_COMPLETE' };
  }
  
  // Calculate next action time
  const nextActionAt = DateTime.now()
    .plus({ hours: nextStep.delayHours, minutes: nextStep.delayMinutes })
    .toJSDate();
  
  // Skip weekends if configured
  let adjustedDate = DateTime.fromJSDate(nextActionAt);
  if (sequence.respectBusinessHours) {
    while (adjustedDate.weekday > 5) {
      adjustedDate = adjustedDate.plus({ days: 1 });
    }
  }
  
  // Update lead journey
  await db.update(goldLeadJourney)
    .set({
      nextActionAt: adjustedDate.toJSDate(),
      sequenceStep: currentStep + 1,
    })
    .where(eq(goldLeadJourney.leadId, leadId));
  
  return {
    scheduled: true,
    nextStep: currentStep + 1,
    scheduledAt: adjustedDate.toISO(),
    channel: nextStep.channel,
  };
}
```

## Worker #32: sequence:stop

```typescript
export async function sequenceStopProcessor(
  job: Job<{ leadId: string; reason?: string }>
): Promise<void> {
  const { leadId, reason = 'LEAD_REPLIED' } = job.data;
  
  // Update enrollment
  await db.update(sequenceEnrollments)
    .set({
      status: 'STOPPED',
      stoppedAt: new Date(),
      stopReason: reason,
    })
    .where(and(
      eq(sequenceEnrollments.leadId, leadId),
      eq(sequenceEnrollments.status, 'ACTIVE')
    ));
  
  // Clear next action
  await db.update(goldLeadJourney)
    .set({
      nextActionAt: null,
      sequencePaused: true,
    })
    .where(eq(goldLeadJourney.leadId, leadId));
  
  logger.info({ leadId, reason }, 'Sequence stopped');
}
```

## Worker #33: sequence:advance & Worker #34: sequence:create

---

# CATEGORIA I: LEAD STATE MACHINE (3 Workers)

## Worker #35: lead:state:transition

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  'COLD': ['CONTACTED_WA', 'CONTACTED_EMAIL', 'DEAD'],
  'CONTACTED_WA': ['WARM_REPLY', 'CONTACTED_EMAIL', 'DEAD'],
  'CONTACTED_EMAIL': ['WARM_REPLY', 'CONTACTED_WA', 'DEAD'],
  'WARM_REPLY': ['NEGOTIATION', 'DEAD', 'PAUSED'],
  'NEGOTIATION': ['CONVERTED', 'DEAD', 'PAUSED', 'WARM_REPLY'],
  'CONVERTED': [],  // Final state
  'DEAD': ['COLD'],  // Can be resurrected
  'PAUSED': ['COLD', 'WARM_REPLY', 'NEGOTIATION'],
};

interface StateTransitionJobData {
  leadId: string;
  newState: string;
  reason?: string;
  trigger: 'MANUAL' | 'WEBHOOK_REPLY' | 'SEQUENCE_COMPLETE' | 'TIMEOUT';
}

export async function stateTransitionProcessor(
  job: Job<StateTransitionJobData>
): Promise<StateTransitionResult> {
  const { leadId, newState, reason, trigger } = job.data;
  
  const journey = await db.query.goldLeadJourney.findFirst({
    where: eq(goldLeadJourney.leadId, leadId),
  });
  
  const currentState = journey.currentState;
  const validNext = VALID_TRANSITIONS[currentState] || [];
  
  if (!validNext.includes(newState)) {
    logger.warn({ leadId, currentState, newState }, 'Invalid state transition');
    return {
      success: false,
      previousState: currentState,
      newState,
      error: `Invalid transition from ${currentState} to ${newState}`,
    };
  }
  
  // Execute transition
  await db.update(goldLeadJourney)
    .set({
      currentState: newState as any,
      previousState: currentState,
      stateChangedAt: new Date(),
      stateChangeReason: reason,
    })
    .where(eq(goldLeadJourney.leadId, leadId));
  
  // Trigger side effects
  const sideEffects: string[] = [];
  
  if (newState === 'WARM_REPLY') {
    await triggerQueue('sequence:stop', { leadId });
    sideEffects.push('STOPPED_SEQUENCE');
  }
  
  if (newState === 'CONVERTED') {
    await triggerQueue('lead:converted:notify', { leadId });
    sideEffects.push('CONVERSION_NOTIFICATION');
  }
  
  return {
    success: true,
    previousState: currentState,
    newState,
    sideEffects,
    timestamp: new Date().toISOString(),
  };
}
```

## Worker #36: lead:state:validate & Worker #37: lead:assign:user

---

# CATEGORIA J: SENTIMENT & AI ANALYSIS (3 Workers)

## Worker #38: ai:sentiment:analyze

```typescript
interface SentimentJobData {
  leadId: string;
  content: string;
  source: 'WHATSAPP_REPLY' | 'EMAIL_REPLY';
}

export async function sentimentAnalyzeProcessor(
  job: Job<SentimentJobData>
): Promise<SentimentResult> {
  const { leadId, content, source } = job.data;
  
  // Call LLM for sentiment analysis
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Analizează sentimentul următorului mesaj de business în română și returnează un JSON cu:
- score: număr între -100 (foarte negativ) și 100 (foarte pozitiv)
- intent: 'INTERESTED' | 'NOT_INTERESTED' | 'QUESTION' | 'COMPLAINT' | 'NEUTRAL'
- urgency: 'LOW' | 'MEDIUM' | 'HIGH'
- requiresHuman: boolean (true dacă necesită intervenție umană)

Mesaj: "${content}"

R�spunde doar cu JSON valid.`
    }],
  });
  
  const analysis = JSON.parse(response.content[0].text);
  
  // Update lead
  await db.update(goldLeadJourney)
    .set({
      sentimentScore: analysis.score,
      requiresHumanReview: analysis.requiresHuman,
      humanReviewReason: analysis.requiresHuman ? 'AI_FLAGGED' : null,
      humanReviewPriority: analysis.urgency === 'HIGH' ? 'URGENT' : 'MEDIUM',
    })
    .where(eq(goldLeadJourney.leadId, leadId));
  
  // Route based on sentiment
  if (analysis.score >= 50 && !analysis.requiresHuman) {
    await triggerQueue('ai:response:generate', { leadId, content, analysis });
  } else if (analysis.requiresHuman || analysis.score < 0) {
    await triggerQueue('human:review:queue', { 
      leadId, 
      reason: analysis.score < 0 ? 'NEGATIVE_SENTIMENT' : 'AI_UNCERTAIN',
      priority: analysis.urgency,
    });
  }
  
  return {
    leadId,
    score: analysis.score,
    intent: analysis.intent,
    urgency: analysis.urgency,
    requiresHuman: analysis.requiresHuman,
    routedTo: analysis.requiresHuman ? 'HUMAN' : 'AI',
  };
}
```

## Worker #39: ai:response:generate

```typescript
export async function responseGenerateProcessor(
  job: Job<{ leadId: string; content: string; analysis: any }>
): Promise<ResponseGenerateResult> {
  const { leadId, content, analysis } = job.data;
  
  const journey = await db.query.goldLeadJourney.findFirst({
    where: eq(goldLeadJourney.leadId, leadId),
    with: { goldCompany: true },
  });
  
  // Generate contextual response
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `Ești un reprezentant de vânzări profesionist pentru Cerniq, 
o platformă B2B pentru agricultura din România. 
R�spunzi la mesaje în română, prietenos dar profesional.
Compania prospectului: ${journey.goldCompany.denumire}
Județ: ${journey.goldCompany.judet}`,
    messages: [{
      role: 'user',
      content: `Prospectul a răspuns: "${content}"
Sentiment detectat: ${analysis.intent}
Generează un răspuns scurt (max 2-3 propoziții) care să continue conversația natural.`
    }],
  });
  
  const generatedResponse = response.content[0].text;
  
  // Queue for sending (follow-up, no quota cost)
  if (journey.assignedPhoneId) {
    const phone = await db.query.waPhoneNumbers.findFirst({
      where: eq(waPhoneNumbers.id, journey.assignedPhoneId),
    });
    
    await triggerQueue(`q:wa:phone_${phone.phoneNumber.slice(-2)}:followup`, {
      leadId,
      chatId: journey.lastChatId,
      content: generatedResponse,
      isAiGenerated: true,
    });
  }
  
  return {
    leadId,
    generatedResponse,
    sent: true,
  };
}
```

## Worker #40: ai:intent:classify

---

# CATEGORIA K: HEALTH & MONITORING (6 Workers)

## Worker #41: monitor:phone:health

```typescript
// Cron: */10 * * * * (every 10 min)
export async function phoneHealthProcessor(job: Job): Promise<void> {
  const phones = await db.select().from(waPhoneNumbers);
  
  for (const phone of phones) {
    const status = await checkTimelinesAIStatus(phone.timelinesaiAccountId);
    
    if (!status.connected && phone.status === 'ACTIVE') {
      await db.update(waPhoneNumbers)
        .set({ status: 'OFFLINE', statusChangedAt: new Date() })
        .where(eq(waPhoneNumbers.id, phone.id));
      
      await triggerQueue('alert:phone:offline', { phoneId: phone.id });
    }
  }
}
```

## Workers #42-46: Various Monitoring

| # | Queue | Schedule | Purpose |
|---|-------|----------|---------|
| 42 | `monitor:email:deliverability` | Hourly | Check email metrics |
| 43 | `monitor:quota:usage` | */5 min | Track quota usage |
| 44 | `alert:phone:offline` | On trigger | Phone offline alert |
| 45 | `alert:phone:banned` | On trigger | Phone banned alert |
| 46 | `alert:bounce:high` | On trigger | High bounce alert |

---

# CATEGORIA L: HUMAN INTERVENTION (4 Workers)

## Worker #47: human:review:queue

```typescript
interface ReviewQueueJobData {
  leadId: string;
  reason: 'NEGATIVE_SENTIMENT' | 'KEYWORD_TRIGGER' | 'AI_UNCERTAIN' | 'MANUAL_FLAG';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  content?: string;
}

export async function reviewQueueProcessor(
  job: Job<ReviewQueueJobData>
): Promise<void> {
  const { leadId, reason, priority, content } = job.data;
  
  // Calculate SLA based on priority
  const slaHours = { URGENT: 1, HIGH: 4, MEDIUM: 24, LOW: 72 }[priority];
  
  await db.insert(humanReviewQueue).values({
    tenantId: job.data.tenantId,
    leadJourneyId: leadId,
    reason,
    priority,
    triggerContent: content,
    slaDueAt: DateTime.now().plus({ hours: slaHours }).toJSDate(),
    status: 'PENDING',
  });
  
  // Notify operators
  await sendSlackNotification({
    channel: '#sales-review',
    text: `🚨 New ${priority} review needed for lead`,
    leadId,
  });
}
```

## Workers #48-50: Human Takeover

| # | Queue | Purpose |
|---|-------|---------|
| 48 | `human:takeover:initiate` | Start human control |
| 49 | `human:takeover:complete` | End human control |
| 50 | `human:approve:message` | Approve AI message before send |

---

# PIPELINE WORKERS

## Worker #51: pipeline:outreach:health

```typescript
// Cron: * * * * * (every minute)
export async function pipelineHealthProcessor(job: Job): Promise<void> {
  const metrics = {
    queuesActive: await countActiveQueues(),
    jobsWaiting: await countWaitingJobs(),
    jobsFailed: await countFailedJobs(),
    phonesOnline: await countOnlinePhones(),
  };
  
  // Alert if issues
  if (metrics.phonesOnline < 10) {
    await triggerAlert('pipeline:degraded', { reason: 'LOW_PHONE_COUNT' });
  }
}
```

## Worker #52: pipeline:outreach:metrics

```typescript
// Cron: */5 * * * * (every 5 min)
export async function pipelineMetricsProcessor(job: Job): Promise<void> {
  const stats = await collectPipelineMetrics();
  
  // Export to Prometheus
  gauges.quotaUsage.set(stats.totalQuotaUsed);
  gauges.messagesPerMinute.set(stats.messagesPerMinute);
  gauges.replyRate.set(stats.replyRate);
  
  // Store daily stats
  await db.insert(outreachDailyStats)
    .values(stats)
    .onConflictDoUpdate({ ... });
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total Workers F-L:** 27
**Conformitate:** Master Spec v1.2
