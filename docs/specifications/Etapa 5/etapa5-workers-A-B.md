# CERNIQ.APP — ETAPA 5: WORKERS A-B
## Nurturing State Machine & Churn Detection
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Categoria A: Nurturing State Machine (8 workers)

### A1: lifecycle:order:completed

```typescript
// workers/lifecycle/order-completed.worker.ts
import { Worker, Job } from 'bullmq';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

interface OrderCompletedPayload {
  tenantId: string;
  orderId: string;
  clientId: string;
  orderValue: number;
  deliveredAt: string;
}

export const orderCompletedWorker = new Worker<OrderCompletedPayload>(
  'lifecycle',
  async (job: Job<OrderCompletedPayload>) => {
    const { tenantId, orderId, clientId, orderValue, deliveredAt } = job.data;
    
    job.log(`Processing completed order ${orderId} for client ${clientId}`);
    
    // 1. Check if nurturing state exists
    let nurturingState = await db.query.goldNurturingState.findFirst({
      where: and(
        eq(goldNurturingState.tenantId, tenantId),
        eq(goldNurturingState.clientId, clientId)
      )
    });
    
    // 2. Create if not exists
    if (!nurturingState) {
      nurturingState = await db.insert(goldNurturingState).values({
        tenantId,
        clientId,
        currentState: 'ONBOARDING',
        onboardingStartedAt: new Date(),
        firstOrderAt: new Date(deliveredAt),
        lastOrderAt: new Date(deliveredAt),
        totalOrders: 1,
        totalRevenue: orderValue
      }).returning();
      
      // Queue onboarding sequence
      await lifecycleQueue.add('onboarding:sequence:start', {
        tenantId,
        clientId,
        nurturingStateId: nurturingState.id
      });
    } else {
      // 3. Update existing state
      const newTotalOrders = nurturingState.totalOrders + 1;
      const newTotalRevenue = Number(nurturingState.totalRevenue) + orderValue;
      
      await db.update(goldNurturingState)
        .set({
          lastOrderAt: new Date(deliveredAt),
          lastInteractionAt: new Date(),
          totalOrders: newTotalOrders,
          totalRevenue: newTotalRevenue,
          averageOrderValue: newTotalRevenue / newTotalOrders,
          updatedAt: new Date()
        })
        .where(eq(goldNurturingState.id, nurturingState.id));
      
      // Queue state evaluation
      await lifecycleQueue.add('lifecycle:state:evaluate', {
        tenantId,
        clientId,
        nurturingStateId: nurturingState.id,
        trigger: 'ORDER_COMPLETED'
      });
    }
    
    // 4. Schedule NPS survey (3 days after delivery)
    await feedbackQueue.add('feedback:nps:send', {
      tenantId,
      clientId,
      orderId,
      surveyType: 'POST_ORDER'
    }, {
      delay: 3 * 24 * 60 * 60 * 1000 // 3 days
    });
    
    return { success: true, nurturingStateId: nurturingState.id };
  },
  {
    connection: redisConnection,
    concurrency: 10
  }
);
```

### A2: lifecycle:state:evaluate

```typescript
// workers/lifecycle/state-evaluate.worker.ts
interface StateEvaluatePayload {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  trigger: 'ORDER_COMPLETED' | 'NPS_RECEIVED' | 'CHURN_SIGNAL' | 'SCHEDULED';
}

export const stateEvaluateWorker = new Worker<StateEvaluatePayload>(
  'lifecycle',
  async (job: Job<StateEvaluatePayload>) => {
    const { tenantId, clientId, nurturingStateId, trigger } = job.data;
    
    // 1. Get current state with all metrics
    const state = await db.query.goldNurturingState.findFirst({
      where: eq(goldNurturingState.id, nurturingStateId)
    });
    
    if (!state) throw new Error(`Nurturing state not found: ${nurturingStateId}`);
    
    // 2. Get churn signals
    const churnSignals = await db.query.goldChurnSignals.findMany({
      where: and(
        eq(goldChurnSignals.clientId, clientId),
        eq(goldChurnSignals.isResolved, false)
      )
    });
    
    // 3. Evaluate transition rules
    const currentState = state.currentState;
    let newState = currentState;
    let reason = '';
    
    // State transition logic
    switch (currentState) {
      case 'ONBOARDING':
        if (state.onboardingCompletedAt) {
          newState = 'NURTURING_ACTIVE';
          reason = 'Onboarding completed';
        }
        break;
        
      case 'NURTURING_ACTIVE':
        // Check for churn risk
        if (churnSignals.length > 0 && state.churnRiskScore >= 50) {
          newState = 'AT_RISK';
          reason = `Churn risk detected: ${state.churnRiskScore}`;
        }
        // Check for loyalty (3+ orders, NPS >= 8)
        else if (state.totalOrders >= 3 && state.npsScore >= 8) {
          newState = 'LOYAL_CLIENT';
          reason = 'Loyalty criteria met';
        }
        break;
        
      case 'AT_RISK':
        // Check if risk resolved
        if (churnSignals.length === 0 && state.churnRiskScore < 30) {
          newState = 'NURTURING_ACTIVE';
          reason = 'Risk resolved';
        }
        // Check for churn
        else if (state.daysSinceLastOrder > 180) {
          newState = 'CHURNED';
          reason = 'Dormant for 180+ days';
        }
        break;
        
      case 'LOYAL_CLIENT':
        // Check for advocate promotion
        if (state.successfulReferrals >= 2 && state.npsScore >= 9) {
          newState = 'ADVOCATE';
          reason = 'Advocate criteria met';
        }
        // Check for risk
        else if (state.churnRiskScore >= 60) {
          newState = 'AT_RISK';
          reason = 'Churn risk increased';
        }
        break;
        
      case 'CHURNED':
        // Handled by win-back
        break;
        
      case 'REACTIVATED':
        // Move back to active after first order
        if (trigger === 'ORDER_COMPLETED') {
          newState = 'NURTURING_ACTIVE';
          reason = 'Reactivation confirmed by order';
        }
        break;
    }
    
    // 4. Execute transition if changed
    if (newState !== currentState) {
      await stateQueue.add('state:transition:execute', {
        tenantId,
        clientId,
        nurturingStateId,
        fromState: currentState,
        toState: newState,
        reason
      });
    }
    
    return { 
      currentState, 
      newState, 
      transitioned: newState !== currentState,
      reason 
    };
  },
  { connection: redisConnection, concurrency: 20 }
);
```

### A6: state:transition:execute

```typescript
// workers/state/transition-execute.worker.ts
interface TransitionPayload {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  fromState: NurturingState;
  toState: NurturingState;
  reason: string;
}

export const transitionExecuteWorker = new Worker<TransitionPayload>(
  'state',
  async (job: Job<TransitionPayload>) => {
    const { tenantId, clientId, nurturingStateId, fromState, toState, reason } = job.data;
    
    // 1. Update state
    await db.update(goldNurturingState)
      .set({
        previousState: fromState,
        currentState: toState,
        stateChangedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(goldNurturingState.id, nurturingStateId));
    
    // 2. Record transition in audit
    await db.insert(goldNurturingActions).values({
      tenantId,
      nurturingStateId,
      clientId,
      actionType: 'STATE_TRANSITION',
      actionCategory: 'SYSTEM',
      triggerType: 'EVENT',
      triggerEvent: `${fromState} -> ${toState}`,
      triggerData: { reason },
      channel: 'SYSTEM',
      status: 'COMPLETED',
      executedAt: new Date()
    });
    
    // 3. State-specific actions
    switch (toState) {
      case 'AT_RISK':
        // Create HITL task for intervention
        await hitlQueue.add('hitl:churn:intervention', {
          tenantId,
          clientId,
          nurturingStateId,
          reason
        });
        break;
        
      case 'LOYAL_CLIENT':
        // Start referral eligibility
        await referralQueue.add('referral:eligibility:check', {
          tenantId,
          clientId
        });
        break;
        
      case 'ADVOCATE':
        // Promote to KOL tracking
        await stateQueue.add('state:advocate:promote', {
          tenantId,
          clientId,
          nurturingStateId
        });
        break;
        
      case 'CHURNED':
        // Start win-back campaign
        await winbackQueue.add('winback:campaign:create', {
          tenantId,
          clientId,
          triggeredBy: 'CHURN_DETECTED'
        });
        break;
    }
    
    return { success: true, fromState, toState };
  },
  { connection: redisConnection, concurrency: 10 }
);
```

---

## Categoria B: Churn Detection (6 workers)

### B9: churn:signal:detect

```typescript
// workers/churn/signal-detect.worker.ts
interface SignalDetectPayload {
  tenantId: string;
  clientId: string;
  sourceType: 'MESSAGE' | 'ORDER' | 'PAYMENT' | 'SUPPORT';
  sourceId: string;
  sourceData: Record<string, any>;
}

export const churnSignalDetectWorker = new Worker<SignalDetectPayload>(
  'churn',
  async (job: Job<SignalDetectPayload>) => {
    const { tenantId, clientId, sourceType, sourceId, sourceData } = job.data;
    
    const detectedSignals: ChurnSignal[] = [];
    
    // 1. Rule-based detection
    switch (sourceType) {
      case 'MESSAGE':
        // Check for competitor mention
        if (sourceData.mentionedCompetitors?.length > 0) {
          detectedSignals.push({
            type: 'COMPETITOR_MENTION',
            strength: 70,
            evidence: sourceData.text
          });
        }
        
        // Check for price complaint
        if (sourceData.topics?.includes('PRICE_HIGH')) {
          detectedSignals.push({
            type: 'PRICE_COMPLAINT',
            strength: 50,
            evidence: sourceData.text
          });
        }
        break;
        
      case 'ORDER':
        // Check order frequency drop
        const avgInterval = await getOrderInterval(clientId);
        if (sourceData.daysSinceLastOrder > avgInterval * 1.5) {
          detectedSignals.push({
            type: 'ORDER_FREQUENCY_DROP',
            strength: 40 + (sourceData.daysSinceLastOrder / avgInterval) * 20,
            evidence: `${sourceData.daysSinceLastOrder} days since last order`
          });
        }
        break;
        
      case 'PAYMENT':
        if (sourceData.daysOverdue > 14) {
          detectedSignals.push({
            type: 'PAYMENT_DELAY',
            strength: Math.min(80, 30 + sourceData.daysOverdue * 2),
            evidence: `${sourceData.daysOverdue} days overdue`
          });
        }
        break;
    }
    
    // 2. Save detected signals
    for (const signal of detectedSignals) {
      await db.insert(goldChurnSignals).values({
        tenantId,
        clientId,
        signalType: signal.type,
        signalCategory: getSignalCategory(signal.type),
        strength: signal.strength,
        confidence: 85,
        detectionMethod: 'RULE_BASED',
        detectionSource: sourceType,
        evidenceSourceType: sourceType,
        evidenceSourceId: sourceId,
        evidenceText: signal.evidence
      });
    }
    
    // 3. Queue score recalculation if signals found
    if (detectedSignals.length > 0) {
      await churnQueue.add('churn:score:calculate', {
        tenantId,
        clientId
      });
    }
    
    return { signalsDetected: detectedSignals.length };
  },
  { connection: redisConnection, concurrency: 20 }
);
```

### B10: churn:score:calculate

```typescript
// workers/churn/score-calculate.worker.ts
interface ScoreCalculatePayload {
  tenantId: string;
  clientId: string;
}

const CHURN_WEIGHTS = {
  COMMUNICATION_FADE: 0.15,
  NEGATIVE_SENTIMENT: 0.20,
  COMPETITOR_MENTION: 0.15,
  SUPPORT_ESCALATION: 0.10,
  ORDER_FREQUENCY_DROP: 0.15,
  PAYMENT_DELAY: 0.10,
  PRICE_COMPLAINT: 0.10,
  QUALITY_COMPLAINT: 0.05
};

export const churnScoreCalculateWorker = new Worker<ScoreCalculatePayload>(
  'churn',
  async (job: Job<ScoreCalculatePayload>) => {
    const { tenantId, clientId } = job.data;
    
    // 1. Get all active signals
    const signals = await db.query.goldChurnSignals.findMany({
      where: and(
        eq(goldChurnSignals.clientId, clientId),
        eq(goldChurnSignals.isResolved, false)
      )
    });
    
    // 2. Get client metrics
    const state = await db.query.goldNurturingState.findFirst({
      where: eq(goldNurturingState.clientId, clientId)
    });
    
    // 3. Calculate weighted score
    let weightedSum = 0;
    let totalWeight = 0;
    const factorBreakdown: Record<string, number> = {};
    
    for (const signal of signals) {
      const weight = CHURN_WEIGHTS[signal.signalType] || 0.05;
      const contribution = signal.strength * weight;
      weightedSum += contribution;
      totalWeight += weight;
      factorBreakdown[signal.signalType] = signal.strength;
    }
    
    // 4. Add behavioral factors
    if (state) {
      // Days since last order
      if (state.daysSinceLastOrder > 30) {
        const daysFactor = Math.min(100, (state.daysSinceLastOrder - 30) * 2);
        weightedSum += daysFactor * 0.15;
        totalWeight += 0.15;
        factorBreakdown['DAYS_INACTIVE'] = daysFactor;
      }
      
      // NPS trend
      if (state.satisfactionTrend === 'DECLINING') {
        weightedSum += 30 * 0.10;
        totalWeight += 0.10;
        factorBreakdown['SATISFACTION_DECLINING'] = 30;
      }
    }
    
    // 5. Calculate final score
    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // 6. Determine risk level
    let riskLevel: string;
    if (overallScore >= 75) riskLevel = 'CRITICAL';
    else if (overallScore >= 50) riskLevel = 'HIGH';
    else if (overallScore >= 25) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';
    
    // 7. Upsert churn factors
    await db.insert(goldChurnFactors)
      .values({
        tenantId,
        clientId,
        overallChurnScore: overallScore,
        riskLevel,
        factorBreakdown,
        activeSignalCount: signals.length,
        strongestSignalType: signals[0]?.signalType,
        strongestSignalStrength: signals[0]?.strength,
        calculatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [goldChurnFactors.tenantId, goldChurnFactors.clientId],
        set: {
          overallChurnScore: overallScore,
          riskLevel,
          factorBreakdown,
          activeSignalCount: signals.length,
          calculatedAt: new Date(),
          updatedAt: new Date()
        }
      });
    
    // 8. Update nurturing state
    await db.update(goldNurturingState)
      .set({
        churnRiskScore: overallScore,
        churnRiskLevel: riskLevel,
        isAtRisk: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
        atRiskSince: riskLevel === 'HIGH' || riskLevel === 'CRITICAL' 
          ? state?.atRiskSince || new Date() 
          : null,
        updatedAt: new Date()
      })
      .where(eq(goldNurturingState.clientId, clientId));
    
    // 9. Escalate if needed
    if (riskLevel === 'CRITICAL' || (riskLevel === 'HIGH' && !state?.atRiskSince)) {
      await churnQueue.add('churn:risk:escalate', {
        tenantId,
        clientId,
        score: overallScore,
        riskLevel
      });
    }
    
    return { score: overallScore, riskLevel, signalCount: signals.length };
  },
  { connection: redisConnection, concurrency: 15 }
);
```

### B12: sentiment:analyze

```typescript
// workers/sentiment/analyze.worker.ts
interface SentimentAnalyzePayload {
  tenantId: string;
  clientId: string;
  sourceType: string;
  sourceId: string;
  text: string;
  language?: string;
}

export const sentimentAnalyzeWorker = new Worker<SentimentAnalyzePayload>(
  'sentiment',
  async (job: Job<SentimentAnalyzePayload>) => {
    const { tenantId, clientId, sourceType, sourceId, text, language = 'ro' } = job.data;
    
    // 1. Call LLM for sentiment analysis
    const prompt = `Analizează următorul mesaj în română și returnează un JSON cu:
- sentiment: "POSITIVE", "NEUTRAL", sau "NEGATIVE"
- score: un număr de la -1.0 la 1.0
- emotions: obiect cu emoțiile detectate și intensitatea (0-1)
- topics: array cu topicurile menționate
- churn_indicators: array cu indicatorii de churn detectați
- mentioned_competitors: array cu competitorii menționați

Mesaj: "${text.substring(0, 2000)}"

Răspunde DOAR cu JSON valid.`;

    const llmResponse = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const analysis = JSON.parse(llmResponse.content[0].text);
    
    // 2. Save sentiment analysis
    const sentimentRecord = await db.insert(goldSentimentAnalysis).values({
      tenantId,
      sourceType,
      sourceId,
      clientId,
      originalText: text,
      language,
      sentimentLabel: analysis.sentiment,
      sentimentScore: analysis.score,
      confidence: 0.85,
      emotions: analysis.emotions,
      dominantEmotion: Object.entries(analysis.emotions)
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0],
      topics: analysis.topics,
      mentionedCompetitors: analysis.mentioned_competitors,
      churnIndicators: analysis.churn_indicators,
      churnSignalStrength: analysis.churn_indicators?.length > 0 
        ? Math.min(100, analysis.churn_indicators.length * 25) 
        : 0,
      modelName: 'claude-sonnet-4-20250514',
      modelVersion: '2025-05-14'
    }).returning();
    
    // 3. Generate churn signal if negative
    if (analysis.sentiment === 'NEGATIVE' || analysis.churn_indicators?.length > 0) {
      await churnQueue.add('churn:signal:detect', {
        tenantId,
        clientId,
        sourceType: 'MESSAGE',
        sourceId,
        sourceData: {
          sentiment: analysis.sentiment,
          score: analysis.score,
          text: text.substring(0, 500),
          topics: analysis.topics,
          mentionedCompetitors: analysis.mentioned_competitors
        }
      });
    }
    
    // 4. Check for competitor intel
    if (analysis.mentioned_competitors?.length > 0) {
      await feedbackQueue.add('feedback:competitor:detect', {
        tenantId,
        clientId,
        sourceId,
        competitors: analysis.mentioned_competitors,
        context: text.substring(0, 500)
      });
    }
    
    return { 
      sentiment: analysis.sentiment, 
      score: analysis.score,
      competitorsMentioned: analysis.mentioned_competitors?.length || 0
    };
  },
  { 
    connection: redisConnection, 
    concurrency: 5,
    limiter: { max: 100, duration: 60000 }
  }
);
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
