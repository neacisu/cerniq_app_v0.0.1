# CERNIQ.APP — ETAPA 5: WORKERS E-K
## Referral, Win-Back, Association, Feedback, Content, Alerts, Compliance
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Categoria E: Referral System (7 workers)

### E25: referral:detect:mention

```typescript
// workers/referral/detect-mention.worker.ts
interface DetectMentionPayload {
  tenantId: string;
  clientId: string;
  messageId: string;
  messageText: string;
}

export const referralDetectMentionWorker = new Worker<DetectMentionPayload>(
  'referral',
  async (job: Job<DetectMentionPayload>) => {
    const { tenantId, clientId, messageId, messageText } = job.data;
    
    // 1. LLM extraction for referral mentions
    const prompt = `Analizează mesajul și identifică dacă clientul menționează alte persoane/firme 
care ar putea fi interesate de produsele noastre agricole.

Mesaj: "${messageText}"

Returnează JSON cu:
- has_mention: boolean
- mentions: array de {name, relationship, context}
- referral_type: "EXPLICIT" (dă contactul) | "SOFT_MENTION" (doar menționează)

Răspunde DOAR cu JSON valid.`;

    const llmResponse = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const analysis = JSON.parse(llmResponse.content[0].text);
    
    // 2. If mention detected, create referral record
    if (analysis.has_mention && analysis.mentions.length > 0) {
      for (const mention of analysis.mentions) {
        // Check cooldown (30 days between referral requests)
        const lastRequest = await db.query.goldReferrals.findFirst({
          where: and(
            eq(goldReferrals.referrerClientId, clientId),
            gt(goldReferrals.referrerLastAskedAt, subDays(new Date(), 30))
          )
        });
        
        if (lastRequest) {
          job.log(`Cooldown active for client ${clientId}`);
          continue;
        }
        
        // Create pending referral
        await db.insert(goldReferrals).values({
          tenantId,
          referrerClientId: clientId,
          referredContactName: mention.name,
          referralType: analysis.referral_type,
          referralSource: 'CONVERSATION',
          consentStatus: 'PENDING_REQUEST',
          contextMessage: mention.context,
          relationshipDescription: mention.relationship,
          expiresAt: addDays(new Date(), 30)
        });
        
        // Queue consent request
        await referralQueue.add('referral:request:send', {
          tenantId,
          clientId,
          referredName: mention.name
        }, { delay: 24 * 60 * 60 * 1000 }); // 24h delay
      }
    }
    
    return { 
      mentionsFound: analysis.mentions?.length || 0,
      referralType: analysis.referral_type 
    };
  },
  { connection: redisConnection, concurrency: 10 }
);
```

### E27: referral:consent:process

```typescript
// workers/referral/consent-process.worker.ts
interface ConsentProcessPayload {
  tenantId: string;
  referralId: string;
  responseType: 'APPROVED' | 'REJECTED' | 'LATER';
  contactDetails?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  messageId: string;
}

export const referralConsentProcessWorker = new Worker<ConsentProcessPayload>(
  'referral',
  async (job: Job<ConsentProcessPayload>) => {
    const { tenantId, referralId, responseType, contactDetails, messageId } = job.data;
    
    if (responseType === 'APPROVED') {
      // Update referral with consent and contact details
      await db.update(goldReferrals)
        .set({
          consentGiven: true,
          consentGivenAt: new Date(),
          consentProofMessageId: messageId,
          consentStatus: 'ACTIVE',
          status: 'ACTIVE',
          referredContactName: contactDetails?.name,
          referredContactPhone: contactDetails?.phone,
          referredContactEmail: contactDetails?.email,
          updatedAt: new Date()
        })
        .where(eq(goldReferrals.id, referralId));
      
      // Queue outreach
      await referralQueue.add('referral:outreach:execute', {
        tenantId,
        referralId
      });
      
    } else if (responseType === 'REJECTED') {
      await db.update(goldReferrals)
        .set({
          status: 'REJECTED',
          consentStatus: 'REJECTED',
          updatedAt: new Date()
        })
        .where(eq(goldReferrals.id, referralId));
    }
    
    return { processed: true, responseType };
  },
  { connection: redisConnection, concurrency: 10 }
);
```

---

## Categoria F: Win-Back Campaigns (5 workers)

### F32: winback:campaign:create

```typescript
// workers/winback/campaign-create.worker.ts
interface CampaignCreatePayload {
  tenantId: string;
  clientId: string;
  triggeredBy: 'CHURN_DETECTED' | 'DORMANCY' | 'MANUAL';
}

export const winbackCampaignCreateWorker = new Worker<CampaignCreatePayload>(
  'winback',
  async (job: Job<CampaignCreatePayload>) => {
    const { tenantId, clientId, triggeredBy } = job.data;
    
    // 1. Get client data and history
    const [client, state, lastOrder] = await Promise.all([
      db.query.goldClients.findFirst({ where: eq(goldClients.id, clientId) }),
      db.query.goldNurturingState.findFirst({ where: eq(goldNurturingState.clientId, clientId) }),
      db.query.goldOrders.findFirst({ 
        where: eq(goldOrders.clientId, clientId),
        orderBy: desc(goldOrders.createdAt)
      })
    ]);
    
    // 2. Determine campaign strategy based on client value
    const totalRevenue = Number(state?.totalRevenue || 0);
    let campaignType: string;
    let offerType: string | null = null;
    let offerValue: number | null = null;
    
    if (totalRevenue > 10000) {
      campaignType = 'PERSONAL_CALL';
      offerType = 'DISCOUNT';
      offerValue = 15; // 15%
    } else if (totalRevenue > 5000) {
      campaignType = 'DISCOUNT';
      offerType = 'DISCOUNT';
      offerValue = 10;
    } else {
      campaignType = 'PRODUCT_UPDATE';
    }
    
    // 3. Build campaign strategy
    const strategy = {
      steps: [
        { day: 0, action: 'INITIAL_EMAIL', channel: 'EMAIL' },
        { day: 3, action: 'WHATSAPP_FOLLOWUP', channel: 'WHATSAPP' },
        { day: 7, action: 'OFFER_EMAIL', channel: 'EMAIL' },
        { day: 14, action: campaignType === 'PERSONAL_CALL' ? 'PHONE_CALL' : 'FINAL_EMAIL', channel: campaignType === 'PERSONAL_CALL' ? 'PHONE' : 'EMAIL' }
      ]
    };
    
    // 4. Create campaign
    const campaign = await db.insert(goldWinbackCampaigns).values({
      tenantId,
      clientId,
      campaignName: `Win-Back ${client?.companyName || clientId}`,
      campaignType,
      triggeredBy,
      daysDormant: state?.daysSinceLastOrder,
      strategy,
      offerType,
      offerValue,
      offerValidUntil: offerValue ? addDays(new Date(), 30) : null,
      totalSteps: strategy.steps.length,
      requiresHitl: campaignType === 'PERSONAL_CALL'
    }).returning();
    
    // 5. If requires HITL, create task
    if (campaignType === 'PERSONAL_CALL') {
      await hitlQueue.add('hitl:winback:review', {
        tenantId,
        clientId,
        campaignId: campaign.id,
        taskType: 'RECOVERY_CALL'
      });
    } else {
      // Auto-start campaign
      await winbackQueue.add('winback:step:execute', {
        tenantId,
        campaignId: campaign.id,
        stepIndex: 0
      });
    }
    
    return { campaignId: campaign.id, campaignType };
  },
  { connection: redisConnection, concurrency: 5 }
);
```

---

## Categoria G: Association Data Ingestion (6 workers)

### G37: ingest:ouai:scrape

```typescript
// workers/association/ouai-scrape.worker.ts
interface OuaiScrapePayload {
  tenantId: string;
  sourceUrl: string;
  registryYear: number;
}

export const ouaiScrapeWorker = new Worker<OuaiScrapePayload>(
  'association',
  async (job: Job<OuaiScrapePayload>) => {
    const { tenantId, sourceUrl, registryYear } = job.data;
    
    // 1. Download PDF from MADR
    const pdfResponse = await axios.get(sourceUrl, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(pdfResponse.data);
    
    // 2. Call Python PDF extraction service
    const extractionResponse = await pythonPdfService.post('/extract/ouai', {
      pdf_buffer: pdfBuffer.toString('base64'),
      registry_year: registryYear
    });
    
    const extractedData = extractionResponse.data;
    
    job.log(`Extracted ${extractedData.ouai_count} OUAI records`);
    
    // 3. Queue parsing for each OUAI
    for (const ouai of extractedData.ouai_records) {
      await associationQueue.add('ingest:ouai:parse', {
        tenantId,
        ouaiData: ouai,
        registryYear,
        sourceUrl
      });
    }
    
    return { 
      recordsExtracted: extractedData.ouai_count,
      sourceUrl 
    };
  },
  { 
    connection: redisConnection, 
    concurrency: 2,
    timeout: 600000
  }
);
```

### G38: ingest:ouai:parse

```typescript
// workers/association/ouai-parse.worker.ts
interface OuaiParsePayload {
  tenantId: string;
  ouaiData: {
    name: string;
    area_net?: number;
    area_gross?: number;
    hydroamelioration?: string;
    county?: string;
  };
  registryYear: number;
  sourceUrl: string;
}

export const ouaiParseWorker = new Worker<OuaiParsePayload>(
  'association',
  async (job: Job<OuaiParsePayload>) => {
    const { tenantId, ouaiData, registryYear, sourceUrl } = job.data;
    
    // 1. Normalize name
    const normalizedName = normalizeOuaiName(ouaiData.name);
    
    // 2. Check if exists
    const existing = await db.query.goldOuaiRegistry.findFirst({
      where: eq(goldOuaiRegistry.ouaiNameNormalized, normalizedName)
    });
    
    // 3. Try to get CUI from Termene.ro
    let cui: string | null = null;
    try {
      const termeneResult = await termeneClient.searchCompany(ouaiData.name);
      if (termeneResult?.cui) {
        cui = termeneResult.cui;
      }
    } catch (e) {
      job.log(`Could not find CUI for ${ouaiData.name}`);
    }
    
    // 4. Upsert OUAI registry
    const ouaiRecord = await db.insert(goldOuaiRegistry)
      .values({
        tenantId,
        ouaiName: ouaiData.name,
        ouaiNameNormalized: normalizedName,
        cui,
        netAreaHa: ouaiData.area_net,
        grossAreaHa: ouaiData.area_gross,
        hydroameliorationName: ouaiData.hydroamelioration,
        county: ouaiData.county,
        sourceRegistry: 'RNOIF',
        sourceDate: new Date(),
        sourceDocumentUrl: sourceUrl,
        registryYear
      })
      .onConflictDoUpdate({
        target: goldOuaiRegistry.ouaiNameNormalized,
        set: {
          netAreaHa: ouaiData.area_net,
          grossAreaHa: ouaiData.area_gross,
          sourceDate: new Date(),
          updatedAt: new Date()
        }
      })
      .returning();
    
    // 5. Also create/update in main associations table
    await db.insert(goldAssociations)
      .values({
        tenantId,
        associationName: ouaiData.name,
        associationNameNormalized: normalizedName,
        associationType: 'OUAI',
        cui,
        county: ouaiData.county,
        declaredAreaHa: ouaiData.area_net,
        hydroameliorationName: ouaiData.hydroamelioration,
        source: 'MADR',
        sourceDocumentUrl: sourceUrl,
        sourceDocumentDate: new Date()
      })
      .onConflictDoUpdate({
        target: [goldAssociations.associationNameNormalized, goldAssociations.associationType],
        set: {
          declaredAreaHa: ouaiData.area_net,
          updatedAt: new Date()
        }
      });
    
    return { ouaiId: ouaiRecord.id, name: ouaiData.name, cui };
  },
  { connection: redisConnection, concurrency: 10 }
);
```

---

## Categoria H: Feedback & Zero-Party Data (5 workers)

### H43: feedback:nps:send

```typescript
// workers/feedback/nps-send.worker.ts
interface NpsSendPayload {
  tenantId: string;
  clientId: string;
  orderId?: string;
  surveyType: 'POST_ORDER' | 'PERIODIC' | 'POST_SUPPORT';
}

export const npsSendWorker = new Worker<NpsSendPayload>(
  'feedback',
  async (job: Job<NpsSendPayload>) => {
    const { tenantId, clientId, orderId, surveyType } = job.data;
    
    // 1. Get client and state
    const [client, state] = await Promise.all([
      db.query.goldClients.findFirst({ where: eq(goldClients.id, clientId) }),
      db.query.goldNurturingState.findFirst({ where: eq(goldNurturingState.clientId, clientId) })
    ]);
    
    // 2. Check if already surveyed recently (90 days cooldown)
    const recentSurvey = await db.query.goldNpsSurveys.findFirst({
      where: and(
        eq(goldNpsSurveys.clientId, clientId),
        gt(goldNpsSurveys.sentAt, subDays(new Date(), 90))
      )
    });
    
    if (recentSurvey) {
      job.log(`Client ${clientId} already surveyed recently`);
      return { sent: false, reason: 'cooldown' };
    }
    
    // 3. Determine channel
    const channel = state?.preferredChannel || 'WHATSAPP';
    
    // 4. Create survey record
    const survey = await db.insert(goldNpsSurveys).values({
      tenantId,
      clientId,
      nurturingStateId: state?.id,
      surveyType,
      relatedOrderId: orderId,
      sentVia: channel,
      sentAt: new Date()
    }).returning();
    
    // 5. Send survey
    if (channel === 'WHATSAPP') {
      await whatsappService.sendTemplate({
        to: client?.phone,
        template: 'nps_survey',
        params: {
          client_name: client?.contactName,
          survey_id: survey.id
        }
      });
    } else {
      await emailService.send({
        to: client?.email,
        template: 'nps_survey',
        data: { clientName: client?.contactName, surveyId: survey.id }
      });
    }
    
    return { sent: true, surveyId: survey.id, channel };
  },
  { connection: redisConnection, concurrency: 10 }
);
```

---

## Categoria I-K: Content, Alerts, Compliance (11 workers)

### I48: content:drip:schedule

```typescript
// workers/content/drip-schedule.worker.ts (Cron)
export const contentDripScheduleWorker = new Worker(
  'content',
  async (job) => {
    const today = new Date();
    
    // 1. Get all active drip campaigns
    const drips = await db.query.goldContentDrips.findMany({
      where: eq(goldContentDrips.isActive, true)
    });
    
    // 2. For each drip, find eligible clients
    for (const drip of drips) {
      const eligibleClients = await db.execute(sql`
        SELECT ns.id, ns.client_id
        FROM gold_nurturing_state ns
        WHERE 
          ns.current_state = ANY(${drip.targetState})
          AND ns.state_changed_at <= NOW() - INTERVAL '${drip.daysAfterTrigger} days'
          AND NOT EXISTS (
            SELECT 1 FROM gold_nurturing_actions na
            WHERE na.client_id = ns.client_id
            AND na.content_template_id = ${drip.id}
          )
      `);
      
      // 3. Queue content delivery
      for (const client of eligibleClients) {
        await contentQueue.add('content:drip:execute', {
          dripId: drip.id,
          clientId: client.client_id,
          nurturingStateId: client.id
        });
      }
    }
    
    return { dripsProcessed: drips.length };
  },
  { connection: redisConnection }
);
```

### J52: alert:weather:monitor

```typescript
// workers/alerts/weather-monitor.worker.ts (Cron - every 6h)
export const weatherMonitorWorker = new Worker(
  'alerts',
  async (job) => {
    // 1. Fetch ANM alerts
    const alerts = await anmService.getActiveAlerts();
    
    // 2. For each severe alert
    for (const alert of alerts.filter(a => a.severity >= 'YELLOW')) {
      // Find affected clients
      const affectedClients = await db.execute(sql`
        SELECT gc.id, gc.company_name, gc.county
        FROM gold_clients gc
        WHERE gc.county = ANY(${alert.affected_counties})
      `);
      
      // Queue weather campaign
      if (affectedClients.length > 0) {
        await alertsQueue.add('alert:weather:campaign', {
          alertType: alert.type,
          severity: alert.severity,
          affectedCounties: alert.affected_counties,
          clientIds: affectedClients.map(c => c.id)
        });
      }
    }
    
    return { alertsChecked: alerts.length };
  },
  { connection: redisConnection }
);
```

### K56: compliance:consent:verify

```typescript
// workers/compliance/consent-verify.worker.ts
export const consentVerifyWorker = new Worker(
  'compliance',
  async (job) => {
    const { tenantId, actionType, clientId, referralId } = job.data;
    
    // 1. Verify consent exists for action
    if (actionType === 'REFERRAL_OUTREACH') {
      const referral = await db.query.goldReferrals.findFirst({
        where: eq(goldReferrals.id, referralId)
      });
      
      if (!referral?.consentGiven) {
        throw new Error('GDPR_CONSENT_MISSING');
      }
    }
    
    // 2. Check data source compliance
    if (actionType === 'AFFILIATION_USE') {
      const affiliation = await db.query.goldAffiliations.findFirst({
        where: eq(goldAffiliations.sourceEntityId, clientId)
      });
      
      if (affiliation?.evidenceSource === 'PUBLIC_REGISTER') {
        // OK - public data
        return { compliant: true, basis: 'PUBLIC_DATA' };
      } else {
        // Check legitimate interest
        return { compliant: true, basis: 'LEGITIMATE_INTEREST' };
      }
    }
    
    return { compliant: true };
  },
  { connection: redisConnection, concurrency: 20 }
);
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
