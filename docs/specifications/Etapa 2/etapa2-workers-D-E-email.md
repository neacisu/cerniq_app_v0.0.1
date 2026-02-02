# CERNIQ.APP — ETAPA 2: WORKERS CATEGORIA D & E
## Email Workers - Instantly.ai (Cold) & Resend (Warm)
### Versiunea 1.1 | 2 Februarie 2026

---

# PART 1: CATEGORIA D - EMAIL COLD (Instantly.ai)

## 1.1 Overview

Instantly.ai este folosit pentru cold email outreach datorită:
- Inbox rotation automat (50-100 inboxuri)
- Warm-up automat pentru domenii noi
- Bounce handling integrat
- Volume mare de trimitere

## 1.2 Worker Inventory - Cold Email

| # | Queue Name | Purpose | Concurrency |
|---|------------|---------|-------------|
| 16 | `q:email:cold` | Send cold emails | 50 |
| 17 | `email:cold:campaign:create` | Create campaigns | 5 |
| 18 | `email:cold:campaign:pause` | Pause campaigns | 10 |
| 19 | `email:cold:analytics:fetch` | Fetch analytics | 5 |
| 20 | `email:cold:lead:status` | Update lead status | 20 |

## 1.3 Instantly.ai Configuration

```typescript
const INSTANTLY_CONFIG = {
  baseUrl: 'https://api.instantly.ai/api/v2',
  apiKey: process.env.INSTANTLY_API_KEY,
  workspaceId: process.env.INSTANTLY_WORKSPACE_ID,
  
  rateLimits: {
    addLead: 1000,        // per hour
    getAnalytics: 100,    // per minute
    sendEmail: 100,       // per day per inbox
  },
  
  bounceThreshold: 0.03,  // 3% = pause campaign
  
  // Email tracking
  trackOpens: true,
  trackClicks: true,
};
```

---

## 2. WORKER #16: q:email:cold

### 2.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `q:email:cold` |
| **Concurrency** | 50 |
| **Timeout** | 30000ms |
| **Rate Limit** | Managed by Instantly |
| **Purpose** | Add lead to Instantly campaign |

### 2.2 Job Schema

```typescript
interface EmailColdJobData {
  correlationId: string;
  tenantId: string;
  leadId: string;
  recipientEmail: string;
  campaignId: string;
  personalization: {
    companyName: string;
    contactName?: string;
    customFields?: Record<string, string>;
  };
  sequenceId: string;
  sequenceStep: number;
}

interface EmailColdResult {
  success: boolean;
  instantlyLeadId: string;
  campaignId: string;
  scheduledAt: string;
  status: 'ADDED' | 'ALREADY_EXISTS' | 'FAILED';
}
```

### 2.3 Implementation

```typescript
// workers/email/cold-send.worker.ts

import { Job } from 'bullmq';
import axios from 'axios';
import { db } from '@cerniq/db';
import { goldLeadJourney, goldCommunicationLog } from '@cerniq/db/schema';
import { logger } from '@cerniq/logger';

const INSTANTLY_API = 'https://api.instantly.ai/api/v2';

export async function emailColdProcessor(
  job: Job<EmailColdJobData>
): Promise<EmailColdResult> {
  const {
    leadId, recipientEmail, campaignId, personalization,
    correlationId, tenantId, sequenceId, sequenceStep
  } = job.data;

  try {
    // Add lead to Instantly campaign
    const response = await axios.post(
      `${INSTANTLY_API}/lead/add`,
      {
        campaign_id: campaignId,
        email: recipientEmail,
        first_name: personalization.contactName?.split(' ')[0] || '',
        last_name: personalization.contactName?.split(' ').slice(1).join(' ') || '',
        company_name: personalization.companyName,
        custom_variables: {
          lead_id: leadId,
          ...personalization.customFields,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.INSTANTLY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const instantlyLeadId = response.data.lead_id;

    // Update lead state
    await db.update(goldLeadJourney)
      .set({
        currentState: 'CONTACTED_EMAIL',
        lastChannelUsed: 'EMAIL_COLD',
        firstContactAt: sql`COALESCE(first_contact_at, NOW())`,
        lastContactAt: new Date(),
        sequenceStep,
        nextActionAt: await calculateNextFollowUp(sequenceId, sequenceStep),
        updatedAt: new Date(),
      })
      .where(eq(goldLeadJourney.leadId, leadId));

    // Log communication
    await db.insert(goldCommunicationLog).values({
      id: uuidv4(),
      tenantId,
      leadJourneyId: leadId,
      channel: 'EMAIL_COLD',
      direction: 'OUTBOUND',
      status: 'QUEUED',
      externalMessageId: instantlyLeadId,
      sequenceId,
      sequenceStep,
      rawRequest: job.data,
      rawResponse: response.data,
    });

    logger.info({
      leadId,
      instantlyLeadId,
      campaignId,
      email: recipientEmail.replace(/(.{3}).*@/, '$1***@'),
    }, 'Lead added to Instantly campaign');

    return {
      success: true,
      instantlyLeadId,
      campaignId,
      scheduledAt: response.data.scheduled_at,
      status: 'ADDED',
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Lead already in campaign
      if (error.response?.status === 409) {
        return {
          success: true,
          instantlyLeadId: '',
          campaignId,
          scheduledAt: '',
          status: 'ALREADY_EXISTS',
        };
      }

      // Campaign paused or invalid
      if (error.response?.status === 400) {
        logger.warn({ campaignId, error: error.response.data }, 'Campaign issue');
        throw new Error('CAMPAIGN_INVALID');
      }
    }
    throw error;
  }
}
```

---

## 3. WORKER #17: email:cold:campaign:create

### 3.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `email:cold:campaign:create` |
| **Concurrency** | 5 |
| **Rate Limit** | 10/min |
| **Purpose** | Create new Instantly campaigns |

### 3.2 Implementation

```typescript
interface CampaignCreateJobData {
  tenantId: string;
  name: string;
  sequences: Array<{
    subject: string;
    body: string;
    delayDays: number;
  }>;
  dailyLimit: number;
}

export async function campaignCreateProcessor(
  job: Job<CampaignCreateJobData>
): Promise<CampaignCreateResult> {
  const { name, sequences, dailyLimit } = job.data;

  const response = await axios.post(
    `${INSTANTLY_API}/campaign/create`,
    {
      name,
      email_list: [],
      sequences: sequences.map((seq, idx) => ({
        step: idx + 1,
        subject: seq.subject,
        body: seq.body,
        delay: seq.delayDays * 24 * 60, // Convert to minutes
      })),
      settings: {
        daily_limit: dailyLimit,
        track_opens: true,
        track_clicks: true,
        stop_on_reply: true,
      },
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.INSTANTLY_API_KEY}`,
      },
    }
  );

  return {
    campaignId: response.data.campaign_id,
    name,
    status: 'CREATED',
  };
}
```

---

## 4. WORKER #18: email:cold:campaign:pause

### 4.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `email:cold:campaign:pause` |
| **Concurrency** | 10 |
| **Purpose** | Pause campaign (usually due to high bounce) |

### 4.2 Implementation

```typescript
export async function campaignPauseProcessor(
  job: Job<{ campaignId: string; reason: string }>
): Promise<void> {
  const { campaignId, reason } = job.data;

  await axios.post(
    `${INSTANTLY_API}/campaign/${campaignId}/pause`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${process.env.INSTANTLY_API_KEY}`,
      },
    }
  );

  // Alert team
  await triggerAlert('email:campaign:paused', {
    campaignId,
    reason,
    severity: 'HIGH',
  });

  logger.warn({ campaignId, reason }, 'Campaign paused');
}
```

---

## 5. WORKER #19: email:cold:analytics:fetch

### 5.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `email:cold:analytics:fetch` |
| **Concurrency** | 5 |
| **Schedule** | Cron: `0 * * * *` (hourly) |
| **Purpose** | Fetch analytics and check bounce rates |

### 5.2 Implementation

```typescript
export async function analyticsProcessor(
  job: Job<{ tenantId: string }>
): Promise<AnalyticsResult> {
  const { tenantId } = job.data;

  // Get all active campaigns
  const response = await axios.get(
    `${INSTANTLY_API}/campaign/list`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.INSTANTLY_API_KEY}`,
      },
    }
  );

  const campaigns = response.data.campaigns;
  const results: CampaignAnalytics[] = [];

  for (const campaign of campaigns) {
    const analytics = await axios.get(
      `${INSTANTLY_API}/campaign/${campaign.id}/analytics`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.INSTANTLY_API_KEY}`,
        },
      }
    );

    const stats = analytics.data;
    const bounceRate = stats.bounced / (stats.sent || 1);

    results.push({
      campaignId: campaign.id,
      sent: stats.sent,
      opened: stats.opened,
      clicked: stats.clicked,
      replied: stats.replied,
      bounced: stats.bounced,
      bounceRate,
    });

    // Check bounce threshold
    if (bounceRate > INSTANTLY_CONFIG.bounceThreshold) {
      await triggerQueue('email:cold:campaign:pause', {
        campaignId: campaign.id,
        reason: `Bounce rate ${(bounceRate * 100).toFixed(1)}% exceeds 3% threshold`,
      });

      await triggerAlert('bounce:high', {
        campaignId: campaign.id,
        bounceRate,
      });
    }
  }

  // Store daily stats
  await db.insert(outreachDailyStats).values({
    tenantId,
    statDate: new Date().toISOString().split('T')[0],
    emailColdSent: results.reduce((sum, r) => sum + r.sent, 0),
    emailColdOpens: results.reduce((sum, r) => sum + r.opened, 0),
    emailColdClicks: results.reduce((sum, r) => sum + r.clicked, 0),
    emailColdReplies: results.reduce((sum, r) => sum + r.replied, 0),
    emailColdBounces: results.reduce((sum, r) => sum + r.bounced, 0),
  }).onConflictDoUpdate({
    target: [outreachDailyStats.tenantId, outreachDailyStats.statDate],
    set: {
      emailColdSent: sql`excluded.email_cold_sent`,
      // ... other fields
    },
  });

  return { campaigns: results };
}
```

---

# PART 2: CATEGORIA E - EMAIL WARM (Resend)

## 6.1 Overview

Resend este folosit DOAR pentru leads calde deoarece:
- Deliverability excelent (domeniul principal)
- Inbox placement garantat
- Transactional-grade reliability
- Costuri reduse ($0.0025/email)

**CRITICAL**: Nu trimite NICIODATĂ cold emails prin Resend!

## 6.2 Worker Inventory - Warm Email

| # | Queue Name | Purpose | Concurrency |
|---|------------|---------|-------------|
| 21 | `q:email:warm` | Send warm emails | 50 |
| 22 | `email:warm:proforma` | Send proforma invoices | 20 |
| 23 | `email:warm:document` | Send documents | 20 |

## 6.3 Resend Configuration

```typescript
const RESEND_CONFIG = {
  apiKey: process.env.RESEND_API_KEY,
  fromEmail: 'sales@cerniq.app',
  fromName: 'Cerniq Sales',
  replyTo: 'reply@cerniq.app',
  
  rateLimits: {
    sendEmail: 100,  // per second (very high)
  },
  
  // Only warm stages allowed
  allowedStages: ['WARM_REPLY', 'NEGOTIATION'],
};
```

---

## 7. WORKER #21: q:email:warm

### 7.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `q:email:warm` |
| **Concurrency** | 50 |
| **Rate Limit** | 100/sec |
| **Purpose** | Send warm follow-up emails |

### 7.2 Implementation

```typescript
// workers/email/warm-send.worker.ts

import { Resend } from 'resend';
import { Job } from 'bullmq';
import { db } from '@cerniq/db';
import { goldLeadJourney, goldCommunicationLog } from '@cerniq/db/schema';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailWarmJobData {
  tenantId: string;
  leadId: string;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyToMessageId?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export async function emailWarmProcessor(
  job: Job<EmailWarmJobData>
): Promise<EmailWarmResult> {
  const { tenantId, leadId, recipientEmail, subject, htmlContent, textContent } = job.data;

  // CRITICAL: Verify lead is warm
  const journey = await db.query.goldLeadJourney.findFirst({
    where: eq(goldLeadJourney.leadId, leadId),
  });

  if (!RESEND_CONFIG.allowedStages.includes(journey?.currentState || '')) {
    logger.error({ leadId, stage: journey?.currentState }, 
      'Attempted to send warm email to non-warm lead');
    throw new Error('LEAD_NOT_WARM');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
      to: recipientEmail,
      subject,
      html: htmlContent,
      text: textContent,
      reply_to: RESEND_CONFIG.replyTo,
      tags: [
        { name: 'lead_id', value: leadId },
        { name: 'tenant_id', value: tenantId },
      ],
    });

    if (error) {
      throw new Error(error.message);
    }

    // Log communication
    await db.insert(goldCommunicationLog).values({
      id: uuidv4(),
      tenantId,
      leadJourneyId: leadId,
      channel: 'EMAIL_WARM',
      direction: 'OUTBOUND',
      subject,
      content: htmlContent,
      externalMessageId: data.id,
      status: 'SENT',
      sentAt: new Date(),
    });

    // Update lead
    await db.update(goldLeadJourney)
      .set({
        lastContactAt: new Date(),
        lastChannelUsed: 'EMAIL_WARM',
      })
      .where(eq(goldLeadJourney.leadId, leadId));

    return {
      success: true,
      emailId: data.id,
      status: 'SENT',
    };

  } catch (error) {
    logger.error({ leadId, error }, 'Failed to send warm email');
    throw error;
  }
}
```

---

## 8. WORKER #22: email:warm:proforma

### 8.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `email:warm:proforma` |
| **Concurrency** | 20 |
| **Purpose** | Send proforma invoices to warm leads |

### 8.2 Implementation

```typescript
interface ProformaJobData {
  tenantId: string;
  leadId: string;
  recipientEmail: string;
  proformaData: {
    items: Array<{ name: string; quantity: number; price: number }>;
    validUntil: string;
    notes?: string;
  };
}

export async function proformaProcessor(
  job: Job<ProformaJobData>
): Promise<void> {
  const { leadId, recipientEmail, proformaData } = job.data;

  // Generate PDF
  const pdfBuffer = await generateProformaPDF(proformaData);

  // Send via Resend with attachment
  await resend.emails.send({
    from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
    to: recipientEmail,
    subject: 'Ofertă de preț - Cerniq',
    html: renderProformaEmailTemplate(proformaData),
    attachments: [
      {
        filename: `proforma_${leadId.slice(0, 8)}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  // Update lead to NEGOTIATION
  await db.update(goldLeadJourney)
    .set({
      currentState: 'NEGOTIATION',
      stateChangedAt: new Date(),
    })
    .where(eq(goldLeadJourney.leadId, leadId));
}
```

---

## 9. WORKER #23: email:warm:document

### 9.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `email:warm:document` |
| **Concurrency** | 20 |
| **Purpose** | Send documents (contracts, catalogs) |

### 9.2 Implementation

```typescript
interface DocumentJobData {
  tenantId: string;
  leadId: string;
  recipientEmail: string;
  documentType: 'CONTRACT' | 'CATALOG' | 'TECHNICAL_SPEC';
  documentUrl: string;
  subject: string;
  message: string;
}

export async function documentProcessor(
  job: Job<DocumentJobData>
): Promise<void> {
  const { recipientEmail, documentType, documentUrl, subject, message } = job.data;

  // Download document
  const documentBuffer = await downloadDocument(documentUrl);

  // Send via Resend
  await resend.emails.send({
    from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
    to: recipientEmail,
    subject,
    html: message,
    attachments: [
      {
        filename: getDocumentFilename(documentType),
        content: documentBuffer,
      },
    ],
  });
}
```

---

# 10. CHANNEL SEGREGATION ENFORCEMENT

```typescript
// Middleware to prevent misuse
export function validateChannelUsage(
  channel: 'EMAIL_COLD' | 'EMAIL_WARM',
  leadStage: string
): boolean {
  if (channel === 'EMAIL_WARM') {
    // Only warm stages allowed
    return ['WARM_REPLY', 'NEGOTIATION'].includes(leadStage);
  }
  
  if (channel === 'EMAIL_COLD') {
    // Only cold stages allowed
    return ['COLD', 'CONTACTED_WA', 'CONTACTED_EMAIL'].includes(leadStage);
  }
  
  return false;
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total Workers:** 8 (5 Cold + 3 Warm)
**Conformitate:** Master Spec v1.2
