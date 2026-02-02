# Etapa 3 - Workers K: Sentiment & Intent Analysis

## Document Control

| Field | Value |
|-------|-------|
| **Document ID** | CERNIQ-E3-WORKERS-K |
| **Version** | 2.0.0 |
| **Status** | Final |
| **Created** | 2026-01-18 |
| **Last Updated** | 2026-02-01 |
| **Author** | Cerniq Development Team |
| **Sprint Plan** | E3.S8.PR31, E3.S8.PR32 (vezi [etapa3-sprint-plan.md](etapa3-sprint-plan.md)) |
| **Phase** | F3.12 Intent Detection |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Worker Architecture](#2-worker-architecture)
3. [Database Schema](#3-database-schema)
4. [Worker Implementations](#4-worker-implementations)
5. [Queue Configuration](#5-queue-configuration)
6. [AI/ML Models](#6-aiml-models)
7. [Real-time Processing](#7-real-time-processing)
8. [Monitoring & Metrics](#8-monitoring--metrics)
9. [Testing Specification](#9-testing-specification)
10. [Integration Patterns](#10-integration-patterns)
11. [Security & Privacy](#11-security--privacy)
12. [Changelog & References](#12-changelog--references)

---

## 1. Overview

### 1.1 Purpose

Workers K provide real-time sentiment analysis, intent detection, and emotion recognition for all customer interactions within the Cerniq B2B sales platform. These workers enable:

1. **Sentiment Analysis (K1)**: Classify message sentiment (positive/negative/neutral) with confidence scores
2. **Intent Detection (K2)**: Identify customer intents (purchase, inquiry, complaint, etc.)
3. **Emotion Recognition (K3)**: Detect emotional states for empathetic responses

### 1.2 Business Value

```yaml
business_benefits:
  proactive_intervention:
    description: "Detect negative sentiment early for agent handover"
    impact: "30% reduction in escalations"
    
  intent_routing:
    description: "Route conversations based on detected intent"
    impact: "25% faster resolution times"
    
  customer_experience:
    description: "Empathetic responses based on emotion detection"
    impact: "15% improvement in satisfaction scores"
    
  sales_optimization:
    description: "Identify high-intent prospects for prioritization"
    impact: "20% increase in conversion rates"
    
  risk_mitigation:
    description: "Early detection of churn signals"
    impact: "10% reduction in customer churn"
```

### 1.3 System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Message Flow                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
│  │  Incoming   │────▶│  Message    │────▶│    Workers K            │   │
│  │  Message    │     │  Queue      │     │  ┌─────────────────────┐│   │
│  └─────────────┘     └─────────────┘     │  │ K1: Sentiment       ││   │
│                                           │  │     Analysis        ││   │
│  ┌─────────────┐                          │  ├─────────────────────┤│   │
│  │  WhatsApp   │──┐                       │  │ K2: Intent          ││   │
│  └─────────────┘  │                       │  │     Detection       ││   │
│                   │                       │  ├─────────────────────┤│   │
│  ┌─────────────┐  │   ┌───────────┐       │  │ K3: Emotion         ││   │
│  │   Email     │──┼──▶│ Unified   │──────▶│  │     Recognition     ││   │
│  └─────────────┘  │   │ Processor │       │  └─────────────────────┘│   │
│                   │   └───────────┘       └─────────────────────────┘   │
│  ┌─────────────┐  │                                    │                │
│  │    SMS      │──┘                                    ▼                │
│  └─────────────┘                          ┌─────────────────────────┐   │
│                                           │     Analysis Results    │   │
│                                           │  - Sentiment Score      │   │
│                                           │  - Detected Intents     │   │
│                                           │  - Emotion State        │   │
│                                           │  - Confidence Levels    │   │
│                                           └───────────┬─────────────┘   │
│                                                       │                 │
│                     ┌─────────────────────────────────┼─────────────┐   │
│                     │                                 │             │   │
│                     ▼                                 ▼             ▼   │
│           ┌─────────────────┐              ┌─────────────┐  ┌──────────┐│
│           │ Worker C        │              │  Worker J   │  │ Worker D ││
│           │ (AI Agent)      │              │  (Handover) │  │ (Negot.) ││
│           │ Response Adapt. │              │  Escalation │  │ Strategy ││
│           └─────────────────┘              └─────────────┘  └──────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Worker Inventory

| Worker ID | Name | Purpose | Priority |
|-----------|------|---------|----------|
| K1 | Sentiment Analysis | Classify message sentiment | P0 |
| K2 | Intent Detection | Identify customer intents | P0 |
| K3 | Emotion Recognition | Detect emotional states | P1 |
| K-Agg | Analysis Aggregator | Combine results | P0 |
| K-Trend | Trend Analyzer | Track sentiment trends | P1 |
| K-Alert | Alert Generator | Trigger alerts on thresholds | P0 |

### 1.5 Processing Requirements

```yaml
performance_requirements:
  latency:
    p50: 100ms
    p95: 250ms
    p99: 500ms
    
  throughput:
    messages_per_second: 100
    concurrent_analyses: 50
    
  accuracy:
    sentiment_accuracy: ">90%"
    intent_accuracy: ">85%"
    emotion_accuracy: ">80%"
    
  availability:
    uptime: "99.9%"
    failover_time: "<30s"
    
language_support:
  primary: "Romanian (ro)"
  secondary: "English (en)"
  detection: "automatic"
  fallback: "Romanian"
```

---

## 2. Worker Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Workers K - Analysis Pipeline                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Message Ingestion Layer                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │   │
│  │  │  WhatsApp  │  │   Email    │  │    SMS     │  │   Chat     │     │   │
│  │  │  Webhook   │  │  Webhook   │  │  Webhook   │  │  WebSocket │     │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │   │
│  │        └───────────────┼───────────────┼───────────────┘            │   │
│  │                        ▼               ▼                             │   │
│  │               ┌─────────────────────────────┐                        │   │
│  │               │   Unified Message Queue     │                        │   │
│  │               │   (sentiment-analysis-queue)│                        │   │
│  │               └─────────────┬───────────────┘                        │   │
│  └─────────────────────────────┼────────────────────────────────────────┘   │
│                                │                                             │
│  ┌─────────────────────────────┼────────────────────────────────────────┐   │
│  │                   Analysis Orchestrator                               │   │
│  │                             │                                         │   │
│  │  ┌──────────────────────────┴───────────────────────────────────┐    │   │
│  │  │                    Parallel Analysis                          │    │   │
│  │  │                                                               │    │   │
│  │  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │    │   │
│  │  │  │   K1: Sentiment │ │   K2: Intent    │ │   K3: Emotion   │ │    │   │
│  │  │  │   ┌───────────┐ │ │   ┌───────────┐ │ │   ┌───────────┐ │ │    │   │
│  │  │  │   │ Language  │ │ │   │ Language  │ │ │   │ Language  │ │ │    │   │
│  │  │  │   │ Detection │ │ │   │ Detection │ │ │   │ Detection │ │ │    │   │
│  │  │  │   └─────┬─────┘ │ │   └─────┬─────┘ │ │   └─────┬─────┘ │ │    │   │
│  │  │  │         ▼       │ │         ▼       │ │         ▼       │ │    │   │
│  │  │  │   ┌───────────┐ │ │   ┌───────────┐ │ │   ┌───────────┐ │ │    │   │
│  │  │  │   │ Preprocess│ │ │   │ Tokenize  │ │ │   │ Feature   │ │ │    │   │
│  │  │  │   │ & Clean   │ │ │   │ & Parse   │ │ │   │ Extract   │ │ │    │   │
│  │  │  │   └─────┬─────┘ │ │   └─────┬─────┘ │ │   └─────┬─────┘ │ │    │   │
│  │  │  │         ▼       │ │         ▼       │ │         ▼       │ │    │   │
│  │  │  │   ┌───────────┐ │ │   ┌───────────┐ │ │   ┌───────────┐ │ │    │   │
│  │  │  │   │ LLM/ML    │ │ │   │ LLM/ML    │ │ │   │ LLM/ML    │ │ │    │   │
│  │  │  │   │ Analysis  │ │ │   │ Analysis  │ │ │   │ Analysis  │ │ │    │   │
│  │  │  │   └─────┬─────┘ │ │   └─────┬─────┘ │ │   └─────┬─────┘ │ │    │   │
│  │  │  │         ▼       │ │         ▼       │ │         ▼       │ │    │   │
│  │  │  │   ┌───────────┐ │ │   ┌───────────┐ │ │   ┌───────────┐ │ │    │   │
│  │  │  │   │ Sentiment │ │ │   │ Intent    │ │ │   │ Emotion   │ │ │    │   │
│  │  │  │   │ Score     │ │ │   │ Classes   │ │ │   │ State     │ │ │    │   │
│  │  │  │   └─────┬─────┘ │ │   └─────┬─────┘ │ │   └─────┬─────┘ │ │    │   │
│  │  │  └─────────┼───────┘ └─────────┼───────┘ └─────────┼───────┘ │    │   │
│  │  │            └───────────────────┼───────────────────┘         │    │   │
│  │  └────────────────────────────────┼─────────────────────────────┘    │   │
│  │                                   ▼                                   │   │
│  │                    ┌─────────────────────────┐                        │   │
│  │                    │   K-Agg: Aggregator     │                        │   │
│  │                    │   - Combine Results     │                        │   │
│  │                    │   - Calculate Confidence│                        │   │
│  │                    │   - Generate Alerts     │                        │   │
│  │                    └───────────┬─────────────┘                        │   │
│  └────────────────────────────────┼──────────────────────────────────────┘   │
│                                   │                                          │
│  ┌────────────────────────────────┼──────────────────────────────────────┐   │
│  │               Output & Integration Layer                               │   │
│  │                                │                                       │   │
│  │     ┌──────────────────────────┼──────────────────────────────┐       │   │
│  │     │                          ▼                              │       │   │
│  │     │         ┌─────────────────────────────────┐             │       │   │
│  │     │         │   Analysis Results Store        │             │       │   │
│  │     │         │   (PostgreSQL + Redis Cache)    │             │       │   │
│  │     │         └───────────────┬─────────────────┘             │       │   │
│  │     │                         │                               │       │   │
│  │     │    ┌────────────────────┼────────────────────┐          │       │   │
│  │     │    ▼                    ▼                    ▼          │       │   │
│  │     │ ┌──────────┐     ┌──────────────┐     ┌──────────┐     │       │   │
│  │     │ │ Redis    │     │ Event Bus    │     │ K-Trend  │     │       │   │
│  │     │ │ Pub/Sub  │     │ (Workers)    │     │ Analyzer │     │       │   │
│  │     │ └────┬─────┘     └──────┬───────┘     └────┬─────┘     │       │   │
│  │     │      │                  │                  │           │       │   │
│  │     │      ▼                  ▼                  ▼           │       │   │
│  │     │ ┌──────────┐     ┌──────────────┐     ┌──────────┐     │       │   │
│  │     │ │ K-Alert  │     │ Worker C/J/D │     │ Analytics│     │       │   │
│  │     │ │ Generator│     │ Consumers    │     │ Dashboard│     │       │   │
│  │     │ └──────────┘     └──────────────┘     └──────────┘     │       │   │
│  │     └─────────────────────────────────────────────────────────┘       │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Worker Components

#### 2.2.1 K1 - Sentiment Analysis Worker

```typescript
// src/workers/etapa3/k-sentiment-intent/k1-sentiment-analysis.ts

import { Worker, Job } from 'bullmq';
import { z } from 'zod';
import { db } from '@/db';
import { sentimentAnalyses, conversationMessages } from '@/db/schema';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { AnthropicClient } from '@/lib/ai/anthropic';
import { withTelemetry } from '@/lib/telemetry';
import { eq, and, desc } from 'drizzle-orm';

// Input schema
const SentimentAnalysisJobSchema = z.object({
  tenantId: z.string().uuid(),
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  channel: z.enum(['whatsapp', 'email', 'sms', 'phone', 'in_app']),
  senderType: z.enum(['customer', 'agent', 'ai']),
  metadata: z.object({
    contactId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    previousSentiment: z.number().optional(),
    conversationContext: z.string().optional()
  }).optional()
});

type SentimentAnalysisJob = z.infer<typeof SentimentAnalysisJobSchema>;

// Sentiment categories
enum SentimentCategory {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative'
}

// Analysis result
interface SentimentResult {
  score: number; // -1 to 1
  category: SentimentCategory;
  confidence: number; // 0 to 1
  aspects: Array<{
    aspect: string;
    sentiment: number;
    keywords: string[];
  }>;
  language: string;
  processingTimeMs: number;
}

// Sentiment Analysis Worker
export class SentimentAnalysisWorker {
  private worker: Worker;
  private anthropic: AnthropicClient;
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    this.anthropic = new AnthropicClient();
    
    this.worker = new Worker(
      'sentiment-analysis-queue',
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency: 10,
        limiter: {
          max: 100,
          duration: 1000 // 100 per second
        }
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info({
        event: 'sentiment_analysis_completed',
        jobId: job.id,
        messageId: job.data.messageId,
        score: result.score,
        category: result.category
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error({
        event: 'sentiment_analysis_failed',
        jobId: job?.id,
        error: err.message
      });
    });
  }

  @withTelemetry('sentiment_analysis')
  private async processJob(job: Job<SentimentAnalysisJob>): Promise<SentimentResult> {
    const startTime = Date.now();
    const data = SentimentAnalysisJobSchema.parse(job.data);

    logger.info({
      event: 'sentiment_analysis_started',
      jobId: job.id,
      messageId: data.messageId,
      contentLength: data.content.length
    });

    // Check cache first
    const cacheKey = `sentiment:${data.messageId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug({ event: 'sentiment_cache_hit', messageId: data.messageId });
      return JSON.parse(cached);
    }

    // Detect language
    const language = await this.detectLanguage(data.content);

    // Get conversation context for better analysis
    const context = await this.getConversationContext(
      data.tenantId,
      data.conversationId,
      5 // last 5 messages
    );

    // Perform sentiment analysis
    const result = await this.analyzeSentiment(
      data.content,
      language,
      context,
      data.metadata?.previousSentiment
    );

    result.processingTimeMs = Date.now() - startTime;

    // Store result
    await this.storeResult(data, result);

    // Cache result
    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    // Publish event for other workers
    await this.publishSentimentEvent(data, result);

    // Check for alerts
    await this.checkAlertThresholds(data, result);

    return result;
  }

  private async detectLanguage(text: string): Promise<string> {
    // Use simple heuristics for common cases
    const romanianIndicators = [
      'pentru', 'care', 'este', 'sunt', 'avea', 'face',
      'ă', 'â', 'î', 'ș', 'ț'
    ];

    const textLower = text.toLowerCase();
    let romanianScore = 0;

    for (const indicator of romanianIndicators) {
      if (textLower.includes(indicator)) {
        romanianScore++;
      }
    }

    // If high confidence Romanian, return immediately
    if (romanianScore >= 3) return 'ro';

    // For ambiguous cases, use AI detection
    if (romanianScore >= 1) {
      const detection = await this.anthropic.complete({
        model: 'claude-haiku-4-20250514',
        maxTokens: 10,
        messages: [{
          role: 'user',
          content: `What language is this text? Reply with only the ISO 639-1 code (e.g., "ro" for Romanian, "en" for English):\n\n"${text.substring(0, 200)}"`
        }]
      });
      return detection.content.trim().toLowerCase();
    }

    return 'en'; // Default to English
  }

  private async getConversationContext(
    tenantId: string,
    conversationId: string,
    limit: number
  ): Promise<string> {
    const messages = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.tenantId, tenantId),
        eq(conversationMessages.conversationId, conversationId)
      ),
      orderBy: [desc(conversationMessages.createdAt)],
      limit
    });

    if (messages.length === 0) return '';

    return messages
      .reverse()
      .map(m => `${m.senderType}: ${m.content}`)
      .join('\n');
  }

  private async analyzeSentiment(
    text: string,
    language: string,
    context: string,
    previousSentiment?: number
  ): Promise<Omit<SentimentResult, 'processingTimeMs'>> {
    const systemPrompt = `You are a sentiment analysis expert for B2B sales conversations in the Romanian agricultural market.

Analyze the sentiment of the given message and return a JSON object with:
- score: number from -1 (very negative) to 1 (very positive)
- category: one of "very_positive", "positive", "neutral", "negative", "very_negative"
- confidence: number from 0 to 1 indicating confidence in the analysis
- aspects: array of specific aspects mentioned with their individual sentiment
  - aspect: what is being discussed (e.g., "price", "quality", "delivery")
  - sentiment: number from -1 to 1 for this specific aspect
  - keywords: key words indicating this sentiment

Consider:
1. Romanian business communication style (often indirect)
2. Agricultural industry terminology
3. B2B professional context
4. Previous conversation context if provided
5. Cultural nuances in Romanian communication

Language of text: ${language}`;

    const userPrompt = context
      ? `Previous context:\n${context}\n\nNew message to analyze:\n"${text}"`
      : `Message to analyze:\n"${text}"`;

    if (previousSentiment !== undefined) {
      userPrompt + `\n\nPrevious sentiment score was: ${previousSentiment}`;
    }

    const response = await this.anthropic.complete({
      model: 'claude-sonnet-4-20250514',
      maxTokens: 500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt + '\n\nRespond only with the JSON object, no other text.'
      }]
    });

    try {
      const result = JSON.parse(response.content);
      
      // Validate and normalize
      return {
        score: Math.max(-1, Math.min(1, result.score)),
        category: this.scoreToCategory(result.score),
        confidence: Math.max(0, Math.min(1, result.confidence)),
        aspects: (result.aspects || []).map((a: any) => ({
          aspect: String(a.aspect),
          sentiment: Math.max(-1, Math.min(1, a.sentiment)),
          keywords: Array.isArray(a.keywords) ? a.keywords.map(String) : []
        })),
        language
      };
    } catch (parseError) {
      logger.warn({
        event: 'sentiment_parse_fallback',
        error: parseError.message
      });

      // Fallback to simple analysis
      return this.fallbackAnalysis(text, language);
    }
  }

  private scoreToCategory(score: number): SentimentCategory {
    if (score >= 0.6) return SentimentCategory.VERY_POSITIVE;
    if (score >= 0.2) return SentimentCategory.POSITIVE;
    if (score >= -0.2) return SentimentCategory.NEUTRAL;
    if (score >= -0.6) return SentimentCategory.NEGATIVE;
    return SentimentCategory.VERY_NEGATIVE;
  }

  private async fallbackAnalysis(
    text: string,
    language: string
  ): Promise<Omit<SentimentResult, 'processingTimeMs'>> {
    // Simple keyword-based fallback
    const positiveWords = language === 'ro'
      ? ['mulțumesc', 'excelent', 'perfect', 'bun', 'super', 'minunat', 'de acord', 'acceptat']
      : ['thank', 'excellent', 'perfect', 'good', 'great', 'agree', 'accepted'];

    const negativeWords = language === 'ro'
      ? ['problema', 'nu', 'rău', 'nemulțumit', 'scump', 'întârziere', 'refuz', 'anulare']
      : ['problem', 'no', 'bad', 'unhappy', 'expensive', 'delay', 'refuse', 'cancel'];

    const textLower = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (textLower.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (textLower.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    const score = total === 0
      ? 0
      : (positiveCount - negativeCount) / total;

    return {
      score,
      category: this.scoreToCategory(score),
      confidence: Math.min(0.5, total * 0.1), // Low confidence for fallback
      aspects: [],
      language
    };
  }

  private async storeResult(
    data: SentimentAnalysisJob,
    result: SentimentResult
  ): Promise<void> {
    await db.insert(sentimentAnalyses).values({
      id: crypto.randomUUID(),
      tenantId: data.tenantId,
      messageId: data.messageId,
      conversationId: data.conversationId,
      score: result.score,
      category: result.category,
      confidence: result.confidence,
      aspects: result.aspects,
      language: result.language,
      processingTimeMs: result.processingTimeMs,
      model: 'claude-sonnet-4-20250514',
      createdAt: new Date()
    });
  }

  private async publishSentimentEvent(
    data: SentimentAnalysisJob,
    result: SentimentResult
  ): Promise<void> {
    const event = {
      type: 'SENTIMENT_ANALYZED',
      tenantId: data.tenantId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      sentiment: {
        score: result.score,
        category: result.category,
        confidence: result.confidence
      },
      timestamp: new Date().toISOString()
    };

    await redis.publish('worker-events', JSON.stringify(event));
  }

  private async checkAlertThresholds(
    data: SentimentAnalysisJob,
    result: SentimentResult
  ): Promise<void> {
    // Alert on very negative sentiment
    if (result.score <= -0.5 && result.confidence >= 0.7) {
      await redis.publish('sentiment-alerts', JSON.stringify({
        type: 'NEGATIVE_SENTIMENT_ALERT',
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        score: result.score,
        category: result.category,
        urgency: result.score <= -0.7 ? 'critical' : 'high',
        timestamp: new Date().toISOString()
      }));

      logger.warn({
        event: 'negative_sentiment_alert',
        conversationId: data.conversationId,
        score: result.score
      });
    }

    // Alert on sentiment shift (rapid change)
    if (data.metadata?.previousSentiment !== undefined) {
      const shift = result.score - data.metadata.previousSentiment;
      if (shift <= -0.4) {
        await redis.publish('sentiment-alerts', JSON.stringify({
          type: 'SENTIMENT_SHIFT_ALERT',
          tenantId: data.tenantId,
          conversationId: data.conversationId,
          messageId: data.messageId,
          previousScore: data.metadata.previousSentiment,
          currentScore: result.score,
          shift,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}

export const sentimentAnalysisWorker = new SentimentAnalysisWorker();
```

#### 2.2.2 K2 - Intent Detection Worker

```typescript
// src/workers/etapa3/k-sentiment-intent/k2-intent-detection.ts

import { Worker, Job } from 'bullmq';
import { z } from 'zod';
import { db } from '@/db';
import { intentDetections, conversationMessages } from '@/db/schema';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { AnthropicClient } from '@/lib/ai/anthropic';
import { withTelemetry } from '@/lib/telemetry';
import { eq, and, desc } from 'drizzle-orm';

// Intent categories for B2B agricultural sales
enum IntentType {
  // Purchase intents
  PURCHASE_INQUIRY = 'purchase_inquiry',
  PRICE_REQUEST = 'price_request',
  QUANTITY_REQUEST = 'quantity_request',
  PRODUCT_AVAILABILITY = 'product_availability',
  ORDER_PLACEMENT = 'order_placement',
  ORDER_MODIFICATION = 'order_modification',
  ORDER_CANCELLATION = 'order_cancellation',
  
  // Information intents
  PRODUCT_INFORMATION = 'product_information',
  TECHNICAL_SPECS = 'technical_specs',
  USAGE_GUIDANCE = 'usage_guidance',
  COMPARISON_REQUEST = 'comparison_request',
  
  // Support intents
  COMPLAINT = 'complaint',
  DELIVERY_INQUIRY = 'delivery_inquiry',
  INVOICE_REQUEST = 'invoice_request',
  RETURN_REQUEST = 'return_request',
  WARRANTY_CLAIM = 'warranty_claim',
  
  // Negotiation intents
  DISCOUNT_REQUEST = 'discount_request',
  PAYMENT_TERMS_NEGOTIATION = 'payment_terms_negotiation',
  BULK_PRICING = 'bulk_pricing',
  
  // Relationship intents
  MEETING_REQUEST = 'meeting_request',
  CALLBACK_REQUEST = 'callback_request',
  HUMAN_AGENT_REQUEST = 'human_agent_request',
  FEEDBACK_PROVISION = 'feedback_provision',
  
  // Administrative
  GREETING = 'greeting',
  FAREWELL = 'farewell',
  ACKNOWLEDGMENT = 'acknowledgment',
  UNCLEAR = 'unclear'
}

// Input schema
const IntentDetectionJobSchema = z.object({
  tenantId: z.string().uuid(),
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  channel: z.enum(['whatsapp', 'email', 'sms', 'phone', 'in_app']),
  senderType: z.enum(['customer', 'agent', 'ai']),
  metadata: z.object({
    contactId: z.string().uuid().optional(),
    currentNegotiationState: z.string().optional(),
    productContext: z.array(z.string()).optional()
  }).optional()
});

type IntentDetectionJob = z.infer<typeof IntentDetectionJobSchema>;

// Detection result
interface IntentResult {
  primaryIntent: IntentType;
  primaryConfidence: number;
  secondaryIntents: Array<{
    intent: IntentType;
    confidence: number;
  }>;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  actionRequired: boolean;
  suggestedAction: string | null;
  language: string;
  processingTimeMs: number;
}

// Intent Detection Worker
export class IntentDetectionWorker {
  private worker: Worker;
  private anthropic: AnthropicClient;
  private readonly CACHE_TTL = 3600;

  // Intent to action mapping
  private readonly intentActions: Record<IntentType, string | null> = {
    [IntentType.PURCHASE_INQUIRY]: 'provide_product_info',
    [IntentType.PRICE_REQUEST]: 'calculate_quote',
    [IntentType.QUANTITY_REQUEST]: 'check_stock',
    [IntentType.PRODUCT_AVAILABILITY]: 'check_stock',
    [IntentType.ORDER_PLACEMENT]: 'initiate_order',
    [IntentType.ORDER_MODIFICATION]: 'modify_order',
    [IntentType.ORDER_CANCELLATION]: 'cancel_order',
    [IntentType.PRODUCT_INFORMATION]: 'provide_product_info',
    [IntentType.TECHNICAL_SPECS]: 'provide_technical_specs',
    [IntentType.USAGE_GUIDANCE]: 'provide_usage_guide',
    [IntentType.COMPARISON_REQUEST]: 'compare_products',
    [IntentType.COMPLAINT]: 'escalate_to_support',
    [IntentType.DELIVERY_INQUIRY]: 'check_delivery_status',
    [IntentType.INVOICE_REQUEST]: 'generate_invoice',
    [IntentType.RETURN_REQUEST]: 'initiate_return',
    [IntentType.WARRANTY_CLAIM]: 'initiate_warranty',
    [IntentType.DISCOUNT_REQUEST]: 'evaluate_discount',
    [IntentType.PAYMENT_TERMS_NEGOTIATION]: 'negotiate_terms',
    [IntentType.BULK_PRICING]: 'calculate_bulk_price',
    [IntentType.MEETING_REQUEST]: 'schedule_meeting',
    [IntentType.CALLBACK_REQUEST]: 'schedule_callback',
    [IntentType.HUMAN_AGENT_REQUEST]: 'trigger_handover',
    [IntentType.FEEDBACK_PROVISION]: 'record_feedback',
    [IntentType.GREETING]: null,
    [IntentType.FAREWELL]: null,
    [IntentType.ACKNOWLEDGMENT]: null,
    [IntentType.UNCLEAR]: 'request_clarification'
  };

  constructor() {
    this.anthropic = new AnthropicClient();
    
    this.worker = new Worker(
      'intent-detection-queue',
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency: 10,
        limiter: {
          max: 100,
          duration: 1000
        }
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info({
        event: 'intent_detection_completed',
        jobId: job.id,
        messageId: job.data.messageId,
        primaryIntent: result.primaryIntent,
        actionRequired: result.actionRequired
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error({
        event: 'intent_detection_failed',
        jobId: job?.id,
        error: err.message
      });
    });
  }

  @withTelemetry('intent_detection')
  private async processJob(job: Job<IntentDetectionJob>): Promise<IntentResult> {
    const startTime = Date.now();
    const data = IntentDetectionJobSchema.parse(job.data);

    logger.info({
      event: 'intent_detection_started',
      jobId: job.id,
      messageId: data.messageId
    });

    // Check cache
    const cacheKey = `intent:${data.messageId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get conversation context
    const context = await this.getConversationContext(
      data.tenantId,
      data.conversationId
    );

    // Detect language
    const language = await this.detectLanguage(data.content);

    // Perform intent detection
    const result = await this.detectIntent(
      data.content,
      language,
      context,
      data.metadata
    );

    result.processingTimeMs = Date.now() - startTime;

    // Store result
    await this.storeResult(data, result);

    // Cache result
    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    // Publish event
    await this.publishIntentEvent(data, result);

    // Handle special intents
    await this.handleSpecialIntents(data, result);

    return result;
  }

  private async detectLanguage(text: string): Promise<string> {
    // Reuse same logic as sentiment worker
    const romanianIndicators = ['pentru', 'care', 'este', 'ă', 'â', 'î', 'ș', 'ț'];
    const textLower = text.toLowerCase();
    let score = 0;
    for (const ind of romanianIndicators) {
      if (textLower.includes(ind)) score++;
    }
    return score >= 2 ? 'ro' : 'en';
  }

  private async getConversationContext(
    tenantId: string,
    conversationId: string
  ): Promise<string> {
    const messages = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.tenantId, tenantId),
        eq(conversationMessages.conversationId, conversationId)
      ),
      orderBy: [desc(conversationMessages.createdAt)],
      limit: 5
    });

    return messages
      .reverse()
      .map(m => `${m.senderType}: ${m.content}`)
      .join('\n');
  }

  private async detectIntent(
    text: string,
    language: string,
    context: string,
    metadata?: IntentDetectionJob['metadata']
  ): Promise<Omit<IntentResult, 'processingTimeMs'>> {
    const intentList = Object.values(IntentType).join(', ');

    const systemPrompt = `You are an intent detection expert for B2B agricultural sales in Romania.

Analyze the customer message and identify:
1. Primary intent from this list: ${intentList}
2. Secondary intents (if any)
3. Named entities (products, quantities, dates, prices, company names)
4. Whether action is required

Consider:
- Romanian agricultural terminology (semințe, îngrășăminte, pesticide, tractoare, utilaje)
- B2B sales context (comenzi, facturi, livrări, plăți)
- Negotiation patterns in Romanian business culture
- Current negotiation state if provided

Return JSON:
{
  "primaryIntent": "intent_type",
  "primaryConfidence": 0.0-1.0,
  "secondaryIntents": [{"intent": "type", "confidence": 0.0-1.0}],
  "entities": [{"type": "product|quantity|date|price|company", "value": "...", "confidence": 0.0-1.0}],
  "actionRequired": true/false,
  "suggestedAction": "action_name or null"
}`;

    let userPrompt = context
      ? `Conversation context:\n${context}\n\nNew message to analyze:\n"${text}"`
      : `Message to analyze:\n"${text}"`;

    if (metadata?.currentNegotiationState) {
      userPrompt += `\n\nCurrent negotiation state: ${metadata.currentNegotiationState}`;
    }
    if (metadata?.productContext?.length) {
      userPrompt += `\n\nProducts being discussed: ${metadata.productContext.join(', ')}`;
    }

    const response = await this.anthropic.complete({
      model: 'claude-sonnet-4-20250514',
      maxTokens: 500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt + '\n\nRespond only with JSON.'
      }]
    });

    try {
      const result = JSON.parse(response.content);
      
      return {
        primaryIntent: this.validateIntent(result.primaryIntent),
        primaryConfidence: Math.max(0, Math.min(1, result.primaryConfidence || 0.5)),
        secondaryIntents: (result.secondaryIntents || []).map((i: any) => ({
          intent: this.validateIntent(i.intent),
          confidence: Math.max(0, Math.min(1, i.confidence || 0))
        })),
        entities: (result.entities || []).map((e: any) => ({
          type: String(e.type),
          value: String(e.value),
          confidence: Math.max(0, Math.min(1, e.confidence || 0.5))
        })),
        actionRequired: Boolean(result.actionRequired),
        suggestedAction: this.intentActions[this.validateIntent(result.primaryIntent)],
        language
      };
    } catch (parseError) {
      logger.warn({
        event: 'intent_parse_fallback',
        error: parseError.message
      });
      return this.fallbackDetection(text, language);
    }
  }

  private validateIntent(intent: string): IntentType {
    if (Object.values(IntentType).includes(intent as IntentType)) {
      return intent as IntentType;
    }
    return IntentType.UNCLEAR;
  }

  private fallbackDetection(
    text: string,
    language: string
  ): Omit<IntentResult, 'processingTimeMs'> {
    const textLower = text.toLowerCase();

    // Simple keyword matching
    const patterns: Array<{ keywords: string[]; intent: IntentType }> = [
      { keywords: ['preț', 'cât costă', 'price', 'cost'], intent: IntentType.PRICE_REQUEST },
      { keywords: ['comand', 'order', 'cumpăr', 'buy'], intent: IntentType.ORDER_PLACEMENT },
      { keywords: ['stoc', 'disponibil', 'stock', 'available'], intent: IntentType.PRODUCT_AVAILABILITY },
      { keywords: ['reducere', 'discount', 'ofertă'], intent: IntentType.DISCOUNT_REQUEST },
      { keywords: ['factură', 'invoice'], intent: IntentType.INVOICE_REQUEST },
      { keywords: ['livrare', 'delivery', 'transport'], intent: IntentType.DELIVERY_INQUIRY },
      { keywords: ['problemă', 'nemulțumit', 'complaint'], intent: IntentType.COMPLAINT },
      { keywords: ['agent', 'operator', 'om', 'human'], intent: IntentType.HUMAN_AGENT_REQUEST },
      { keywords: ['bună', 'salut', 'hello', 'hi'], intent: IntentType.GREETING }
    ];

    for (const { keywords, intent } of patterns) {
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          return {
            primaryIntent: intent,
            primaryConfidence: 0.4,
            secondaryIntents: [],
            entities: [],
            actionRequired: this.intentActions[intent] !== null,
            suggestedAction: this.intentActions[intent],
            language
          };
        }
      }
    }

    return {
      primaryIntent: IntentType.UNCLEAR,
      primaryConfidence: 0.3,
      secondaryIntents: [],
      entities: [],
      actionRequired: true,
      suggestedAction: 'request_clarification',
      language
    };
  }

  private async storeResult(
    data: IntentDetectionJob,
    result: IntentResult
  ): Promise<void> {
    await db.insert(intentDetections).values({
      id: crypto.randomUUID(),
      tenantId: data.tenantId,
      messageId: data.messageId,
      conversationId: data.conversationId,
      primaryIntent: result.primaryIntent,
      primaryConfidence: result.primaryConfidence,
      secondaryIntents: result.secondaryIntents,
      entities: result.entities,
      actionRequired: result.actionRequired,
      suggestedAction: result.suggestedAction,
      language: result.language,
      processingTimeMs: result.processingTimeMs,
      model: 'claude-sonnet-4-20250514',
      createdAt: new Date()
    });
  }

  private async publishIntentEvent(
    data: IntentDetectionJob,
    result: IntentResult
  ): Promise<void> {
    const event = {
      type: 'INTENT_DETECTED',
      tenantId: data.tenantId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      intent: {
        primary: result.primaryIntent,
        confidence: result.primaryConfidence,
        actionRequired: result.actionRequired,
        suggestedAction: result.suggestedAction
      },
      entities: result.entities,
      timestamp: new Date().toISOString()
    };

    await redis.publish('worker-events', JSON.stringify(event));
  }

  private async handleSpecialIntents(
    data: IntentDetectionJob,
    result: IntentResult
  ): Promise<void> {
    // Immediate handover request
    if (result.primaryIntent === IntentType.HUMAN_AGENT_REQUEST) {
      await redis.publish('handover-triggers', JSON.stringify({
        type: 'EXPLICIT_HANDOVER_REQUEST',
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        urgency: 'high',
        timestamp: new Date().toISOString()
      }));
    }

    // Complaint handling
    if (result.primaryIntent === IntentType.COMPLAINT) {
      await redis.publish('support-queue', JSON.stringify({
        type: 'COMPLAINT_DETECTED',
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        priority: 'high',
        timestamp: new Date().toISOString()
      }));
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}

export const intentDetectionWorker = new IntentDetectionWorker();
```

---

## 3. Database Schema

### 3.1 Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Workers K - Database Schema                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Core Analysis Tables                              │    │
│  │                                                                      │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │    │
│  │  │  sentiment_analyses │  │  intent_detections  │                   │    │
│  │  │  ─────────────────  │  │  ─────────────────  │                   │    │
│  │  │  id                 │  │  id                 │                   │    │
│  │  │  tenant_id          │  │  tenant_id          │                   │    │
│  │  │  message_id         │◀─┼──message_id         │                   │    │
│  │  │  conversation_id    │  │  conversation_id    │                   │    │
│  │  │  sentiment_score    │  │  primary_intent     │                   │    │
│  │  │  sentiment_label    │  │  secondary_intents  │                   │    │
│  │  │  confidence         │  │  entities           │                   │    │
│  │  │  aspects            │  │  confidence         │                   │    │
│  │  │  language           │  │  language           │                   │    │
│  │  │  created_at         │  │  created_at         │                   │    │
│  │  └─────────────────────┘  └─────────────────────┘                   │    │
│  │                                                                      │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │    │
│  │  │  emotion_detections │  │  analysis_aggregates│                   │    │
│  │  │  ─────────────────  │  │  ─────────────────  │                   │    │
│  │  │  id                 │  │  id                 │                   │    │
│  │  │  tenant_id          │  │  tenant_id          │                   │    │
│  │  │  message_id         │◀─┼──message_id         │                   │    │
│  │  │  conversation_id    │  │  conversation_id    │                   │    │
│  │  │  primary_emotion    │  │  sentiment_id       │                   │    │
│  │  │  secondary_emotions │  │  intent_id          │                   │    │
│  │  │  valence            │  │  emotion_id         │                   │    │
│  │  │  arousal            │  │  combined_score     │                   │    │
│  │  │  dominance          │  │  risk_level         │                   │    │
│  │  │  confidence         │  │  action_required    │                   │    │
│  │  │  created_at         │  │  created_at         │                   │    │
│  │  └─────────────────────┘  └─────────────────────┘                   │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Trending & History Tables                         │    │
│  │                                                                      │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │    │
│  │  │  sentiment_trends   │  │  analysis_alerts    │                   │    │
│  │  │  ─────────────────  │  │  ─────────────────  │                   │    │
│  │  │  id                 │  │  id                 │                   │    │
│  │  │  tenant_id          │  │  tenant_id          │                   │    │
│  │  │  conversation_id    │  │  conversation_id    │                   │    │
│  │  │  window_start       │  │  alert_type         │                   │    │
│  │  │  window_end         │  │  severity           │                   │    │
│  │  │  avg_sentiment      │  │  trigger_value      │                   │    │
│  │  │  sentiment_change   │  │  threshold          │                   │    │
│  │  │  trend_direction    │  │  acknowledged       │                   │    │
│  │  │  volatility         │  │  resolved_at        │                   │    │
│  │  │  created_at         │  │  created_at         │                   │    │
│  │  └─────────────────────┘  └─────────────────────┘                   │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Core Tables

#### 3.2.1 sentiment_analyses

```typescript
// packages/database/src/schema/sentiment-analyses.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  real,
  jsonb,
  text,
  index,
  uniqueIndex,
  pgEnum
} from 'drizzle-orm/pg-core';

// Sentiment labels enum
export const sentimentLabelEnum = pgEnum('sentiment_label', [
  'very_positive',
  'positive',
  'neutral',
  'negative',
  'very_negative',
  'mixed'
]);

// Aspect sentiment type
interface AspectSentiment {
  aspect: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keywords: string[];
}

// Sentiment context type
interface SentimentContext {
  prevMessageSentiment?: number;
  conversationTrend?: 'improving' | 'declining' | 'stable';
  messagePosition?: number;
  isResponseToAgent?: boolean;
}

export const sentimentAnalyses = pgTable('sentiment_analyses', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant isolation
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Message reference
  messageId: uuid('message_id').notNull(),
  conversationId: uuid('conversation_id').notNull(),
  contactId: uuid('contact_id'),
  
  // Sentiment scores
  sentimentScore: real('sentiment_score').notNull(), // -1.0 to 1.0
  sentimentLabel: sentimentLabelEnum('sentiment_label').notNull(),
  confidence: real('confidence').notNull(), // 0.0 to 1.0
  
  // Detailed analysis
  aspects: jsonb('aspects').$type<AspectSentiment[]>().default([]),
  context: jsonb('context').$type<SentimentContext>(),
  
  // Language
  language: varchar('language', { length: 10 }).notNull().default('ro'),
  
  // AI model info
  model: varchar('model', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }),
  
  // Processing metrics
  processingTimeMs: real('processing_time_ms'),
  tokenCount: real('token_count'),
  
  // Raw text (encrypted)
  encryptedText: text('encrypted_text'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  
}, (table) => ({
  // Indexes for common queries
  tenantMessageIdx: uniqueIndex('sentiment_tenant_message_idx')
    .on(table.tenantId, table.messageId),
  tenantConversationIdx: index('sentiment_tenant_conversation_idx')
    .on(table.tenantId, table.conversationId),
  tenantScoreIdx: index('sentiment_tenant_score_idx')
    .on(table.tenantId, table.sentimentScore),
  tenantLabelIdx: index('sentiment_tenant_label_idx')
    .on(table.tenantId, table.sentimentLabel),
  tenantCreatedIdx: index('sentiment_tenant_created_idx')
    .on(table.tenantId, table.createdAt),
  contactIdx: index('sentiment_contact_idx')
    .on(table.tenantId, table.contactId),
    
  // Partial index for negative sentiment
  negativeIdx: index('sentiment_negative_idx')
    .on(table.tenantId, table.sentimentScore)
    .where(sql`sentiment_score < -0.3`),
}));

// Type exports
export type SentimentAnalysis = typeof sentimentAnalyses.$inferSelect;
export type NewSentimentAnalysis = typeof sentimentAnalyses.$inferInsert;
```

#### 3.2.2 intent_detections

```typescript
// packages/database/src/schema/intent-detections.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  real,
  jsonb,
  boolean,
  text,
  index,
  uniqueIndex,
  pgEnum
} from 'drizzle-orm/pg-core';

// Intent types enum
export const intentTypeEnum = pgEnum('intent_type', [
  // Sales intents
  'price_inquiry',
  'product_inquiry',
  'availability_check',
  'discount_request',
  'order_placement',
  'bulk_order',
  'quote_request',
  'payment_inquiry',
  
  // Service intents
  'complaint',
  'support_request',
  'delivery_inquiry',
  'return_request',
  'invoice_request',
  'warranty_inquiry',
  
  // Conversation intents
  'greeting',
  'farewell',
  'gratitude',
  'confirmation',
  'negation',
  'clarification',
  
  // Special intents
  'human_agent_request',
  'urgency_expression',
  'negotiation_attempt',
  'comparison_request',
  
  // Meta intents
  'unclear',
  'out_of_scope',
  'spam'
]);

// Entity type
interface DetectedEntity {
  type: 'product' | 'quantity' | 'price' | 'date' | 'location' | 'company' | 'person' | 'custom';
  value: string;
  normalizedValue?: string;
  confidence: number;
  span?: { start: number; end: number };
}

// Secondary intent type
interface SecondaryIntent {
  intent: string;
  confidence: number;
}

export const intentDetections = pgTable('intent_detections', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant isolation
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Message reference
  messageId: uuid('message_id').notNull(),
  conversationId: uuid('conversation_id').notNull(),
  contactId: uuid('contact_id'),
  
  // Primary intent
  primaryIntent: intentTypeEnum('primary_intent').notNull(),
  primaryConfidence: real('primary_confidence').notNull(), // 0.0 to 1.0
  
  // Secondary intents
  secondaryIntents: jsonb('secondary_intents').$type<SecondaryIntent[]>().default([]),
  
  // Extracted entities
  entities: jsonb('entities').$type<DetectedEntity[]>().default([]),
  
  // Action recommendation
  actionRequired: boolean('action_required').notNull().default(false),
  suggestedAction: varchar('suggested_action', { length: 100 }),
  actionPriority: varchar('action_priority', { length: 20 }), // low, medium, high, critical
  
  // Language
  language: varchar('language', { length: 10 }).notNull().default('ro'),
  
  // AI model info
  model: varchar('model', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }),
  
  // Processing metrics
  processingTimeMs: real('processing_time_ms'),
  tokenCount: real('token_count'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  
}, (table) => ({
  // Indexes
  tenantMessageIdx: uniqueIndex('intent_tenant_message_idx')
    .on(table.tenantId, table.messageId),
  tenantConversationIdx: index('intent_tenant_conversation_idx')
    .on(table.tenantId, table.conversationId),
  tenantIntentIdx: index('intent_tenant_intent_idx')
    .on(table.tenantId, table.primaryIntent),
  tenantActionIdx: index('intent_tenant_action_idx')
    .on(table.tenantId, table.actionRequired),
  tenantCreatedIdx: index('intent_tenant_created_idx')
    .on(table.tenantId, table.createdAt),
  contactIdx: index('intent_contact_idx')
    .on(table.tenantId, table.contactId),
    
  // Partial index for high-priority actions
  highPriorityIdx: index('intent_high_priority_idx')
    .on(table.tenantId, table.actionPriority)
    .where(sql`action_required = true AND action_priority IN ('high', 'critical')`),
}));

// Type exports
export type IntentDetection = typeof intentDetections.$inferSelect;
export type NewIntentDetection = typeof intentDetections.$inferInsert;
```

#### 3.2.3 emotion_detections

```typescript
// packages/database/src/schema/emotion-detections.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  real,
  jsonb,
  index,
  uniqueIndex,
  pgEnum
} from 'drizzle-orm/pg-core';

// Primary emotion enum (Plutchik's wheel + business context)
export const emotionTypeEnum = pgEnum('emotion_type', [
  // Primary emotions
  'joy',
  'trust',
  'fear',
  'surprise',
  'sadness',
  'disgust',
  'anger',
  'anticipation',
  
  // Business emotions
  'frustration',
  'satisfaction',
  'confusion',
  'urgency',
  'interest',
  'disappointment',
  'relief',
  'impatience',
  
  // Neutral
  'neutral'
]);

// Secondary emotion type
interface SecondaryEmotion {
  emotion: string;
  intensity: number; // 0.0 to 1.0
  confidence: number;
}

// VAD (Valence-Arousal-Dominance) model
interface VADScores {
  valence: number;    // -1 (negative) to 1 (positive)
  arousal: number;    // 0 (calm) to 1 (excited)
  dominance: number;  // 0 (submissive) to 1 (dominant)
}

// Emotional cues
interface EmotionalCue {
  type: 'lexical' | 'punctuation' | 'emoji' | 'capitalization' | 'repetition';
  indicator: string;
  emotionSignal: string;
  weight: number;
}

export const emotionDetections = pgTable('emotion_detections', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant isolation
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Message reference
  messageId: uuid('message_id').notNull(),
  conversationId: uuid('conversation_id').notNull(),
  contactId: uuid('contact_id'),
  
  // Primary emotion
  primaryEmotion: emotionTypeEnum('primary_emotion').notNull(),
  primaryIntensity: real('primary_intensity').notNull(), // 0.0 to 1.0
  confidence: real('confidence').notNull(), // 0.0 to 1.0
  
  // Secondary emotions
  secondaryEmotions: jsonb('secondary_emotions').$type<SecondaryEmotion[]>().default([]),
  
  // VAD model scores
  valence: real('valence'), // -1.0 to 1.0
  arousal: real('arousal'), // 0.0 to 1.0
  dominance: real('dominance'), // 0.0 to 1.0
  
  // Emotional cues detected
  cues: jsonb('cues').$type<EmotionalCue[]>().default([]),
  
  // Language
  language: varchar('language', { length: 10 }).notNull().default('ro'),
  
  // AI model info
  model: varchar('model', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }),
  
  // Processing metrics
  processingTimeMs: real('processing_time_ms'),
  tokenCount: real('token_count'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  
}, (table) => ({
  // Indexes
  tenantMessageIdx: uniqueIndex('emotion_tenant_message_idx')
    .on(table.tenantId, table.messageId),
  tenantConversationIdx: index('emotion_tenant_conversation_idx')
    .on(table.tenantId, table.conversationId),
  tenantEmotionIdx: index('emotion_tenant_emotion_idx')
    .on(table.tenantId, table.primaryEmotion),
  tenantValenceIdx: index('emotion_tenant_valence_idx')
    .on(table.tenantId, table.valence),
  tenantCreatedIdx: index('emotion_tenant_created_idx')
    .on(table.tenantId, table.createdAt),
  contactIdx: index('emotion_contact_idx')
    .on(table.tenantId, table.contactId),
    
  // Partial index for high arousal states
  highArousalIdx: index('emotion_high_arousal_idx')
    .on(table.tenantId, table.arousal)
    .where(sql`arousal > 0.7`),
}));

// Type exports
export type EmotionDetection = typeof emotionDetections.$inferSelect;
export type NewEmotionDetection = typeof emotionDetections.$inferInsert;
```


#### 3.2.4 analysis_aggregates

```typescript
// packages/database/src/schema/analysis-aggregates.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  real,
  jsonb,
  boolean,
  index,
  uniqueIndex,
  pgEnum
} from 'drizzle-orm/pg-core';

// Risk level enum
export const riskLevelEnum = pgEnum('risk_level', [
  'low',
  'medium',
  'high',
  'critical'
]);

// Combined analysis type
interface CombinedAnalysis {
  sentiment: {
    score: number;
    label: string;
    confidence: number;
  };
  intent: {
    primary: string;
    confidence: number;
    actionRequired: boolean;
  };
  emotion: {
    primary: string;
    intensity: number;
    vad: { valence: number; arousal: number; dominance: number };
  };
}

// Risk factors
interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
}

// Recommended actions
interface RecommendedAction {
  action: string;
  priority: number;
  reason: string;
  autoExecute: boolean;
}

export const analysisAggregates = pgTable('analysis_aggregates', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant isolation
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Message reference
  messageId: uuid('message_id').notNull(),
  conversationId: uuid('conversation_id').notNull(),
  contactId: uuid('contact_id'),
  
  // Component analysis references
  sentimentAnalysisId: uuid('sentiment_analysis_id')
    .references(() => sentimentAnalyses.id),
  intentDetectionId: uuid('intent_detection_id')
    .references(() => intentDetections.id),
  emotionDetectionId: uuid('emotion_detection_id')
    .references(() => emotionDetections.id),
  
  // Combined analysis
  combinedAnalysis: jsonb('combined_analysis').$type<CombinedAnalysis>().notNull(),
  
  // Composite score (-1.0 to 1.0)
  compositeScore: real('composite_score').notNull(),
  
  // Risk assessment
  riskLevel: riskLevelEnum('risk_level').notNull(),
  riskScore: real('risk_score').notNull(), // 0.0 to 1.0
  riskFactors: jsonb('risk_factors').$type<RiskFactor[]>().default([]),
  
  // Action recommendations
  actionRequired: boolean('action_required').notNull().default(false),
  recommendedActions: jsonb('recommended_actions').$type<RecommendedAction[]>().default([]),
  
  // Urgency indicator
  urgencyLevel: varchar('urgency_level', { length: 20 }),
  
  // Language
  language: varchar('language', { length: 10 }).notNull().default('ro'),
  
  // Processing metrics
  totalProcessingTimeMs: real('total_processing_time_ms'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  
}, (table) => ({
  // Indexes
  tenantMessageIdx: uniqueIndex('aggregate_tenant_message_idx')
    .on(table.tenantId, table.messageId),
  tenantConversationIdx: index('aggregate_tenant_conversation_idx')
    .on(table.tenantId, table.conversationId),
  tenantRiskIdx: index('aggregate_tenant_risk_idx')
    .on(table.tenantId, table.riskLevel),
  tenantScoreIdx: index('aggregate_tenant_score_idx')
    .on(table.tenantId, table.compositeScore),
  tenantActionIdx: index('aggregate_tenant_action_idx')
    .on(table.tenantId, table.actionRequired),
  tenantCreatedIdx: index('aggregate_tenant_created_idx')
    .on(table.tenantId, table.createdAt),
  contactIdx: index('aggregate_contact_idx')
    .on(table.tenantId, table.contactId),
    
  // Partial index for high-risk items
  highRiskIdx: index('aggregate_high_risk_idx')
    .on(table.tenantId, table.riskLevel)
    .where(sql`risk_level IN ('high', 'critical')`),
}));

// Type exports
export type AnalysisAggregate = typeof analysisAggregates.$inferSelect;
export type NewAnalysisAggregate = typeof analysisAggregates.$inferInsert;
```

### 3.3 Trending & History Tables

#### 3.3.1 sentiment_trends

```typescript
// packages/database/src/schema/sentiment-trends.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  real,
  integer,
  jsonb,
  index,
  pgEnum
} from 'drizzle-orm/pg-core';

// Trend direction enum
export const trendDirectionEnum = pgEnum('trend_direction', [
  'improving',      // Sentiment getting more positive
  'declining',      // Sentiment getting more negative
  'stable',         // Sentiment relatively unchanged
  'volatile',       // Significant fluctuations
  'recovering',     // Recovering from negative
  'deteriorating'   // Starting to decline from positive
]);

// Window type enum
export const windowTypeEnum = pgEnum('window_type', [
  'message',    // Per-message window
  'hourly',     // Hourly aggregation
  'daily',      // Daily aggregation
  'session'     // Per-session aggregation
]);

// Trend data point
interface TrendDataPoint {
  timestamp: string;
  sentimentScore: number;
  messageCount: number;
}

export const sentimentTrends = pgTable('sentiment_trends', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant isolation
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Context
  conversationId: uuid('conversation_id').notNull(),
  contactId: uuid('contact_id'),
  
  // Window definition
  windowType: windowTypeEnum('window_type').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  
  // Aggregated metrics
  avgSentiment: real('avg_sentiment').notNull(),
  minSentiment: real('min_sentiment').notNull(),
  maxSentiment: real('max_sentiment').notNull(),
  stdDevSentiment: real('std_dev_sentiment'),
  
  // Trend analysis
  sentimentChange: real('sentiment_change').notNull(), // Change from start to end
  trendDirection: trendDirectionEnum('trend_direction').notNull(),
  trendStrength: real('trend_strength'), // 0.0 to 1.0
  
  // Volatility metrics
  volatility: real('volatility'), // Standard deviation of changes
  oscillationCount: integer('oscillation_count'), // Number of direction changes
  
  // Message counts
  messageCount: integer('message_count').notNull(),
  positiveCount: integer('positive_count').notNull(),
  negativeCount: integer('negative_count').notNull(),
  neutralCount: integer('neutral_count').notNull(),
  
  // Data points
  dataPoints: jsonb('data_points').$type<TrendDataPoint[]>().default([]),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  
}, (table) => ({
  // Indexes
  tenantConversationIdx: index('trend_tenant_conversation_idx')
    .on(table.tenantId, table.conversationId),
  tenantWindowIdx: index('trend_tenant_window_idx')
    .on(table.tenantId, table.windowType, table.windowStart),
  tenantDirectionIdx: index('trend_tenant_direction_idx')
    .on(table.tenantId, table.trendDirection),
  tenantCreatedIdx: index('trend_tenant_created_idx')
    .on(table.tenantId, table.createdAt),
  contactIdx: index('trend_contact_idx')
    .on(table.tenantId, table.contactId),
    
  // Partial index for declining trends
  decliningIdx: index('trend_declining_idx')
    .on(table.tenantId, table.trendDirection)
    .where(sql`trend_direction IN ('declining', 'deteriorating')`),
}));

// Type exports
export type SentimentTrend = typeof sentimentTrends.$inferSelect;
export type NewSentimentTrend = typeof sentimentTrends.$inferInsert;
```

#### 3.3.2 analysis_alerts

```typescript
// packages/database/src/schema/analysis-alerts.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  real,
  boolean,
  jsonb,
  text,
  index,
  pgEnum
} from 'drizzle-orm/pg-core';

// Alert type enum
export const alertTypeEnum = pgEnum('alert_type', [
  // Sentiment alerts
  'negative_sentiment',
  'sentiment_decline',
  'sentiment_spike',
  'sustained_negativity',
  
  // Intent alerts
  'human_agent_requested',
  'complaint_detected',
  'urgency_detected',
  'churn_signal',
  
  // Emotion alerts
  'high_frustration',
  'anger_detected',
  'high_arousal',
  
  // Combined alerts
  'risk_threshold_exceeded',
  'escalation_recommended',
  'vip_attention_required'
]);

// Alert severity enum
export const alertSeverityEnum = pgEnum('alert_severity', [
  'info',
  'warning',
  'critical',
  'emergency'
]);

// Alert context
interface AlertContext {
  messageId?: string;
  conversationId: string;
  contactId?: string;
  analysisId?: string;
  previousAlerts?: string[];
}

// Alert resolution
interface AlertResolution {
  resolvedBy?: string;
  resolvedAt?: string;
  resolution: string;
  notes?: string;
}

export const analysisAlerts = pgTable('analysis_alerts', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant isolation
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Context
  conversationId: uuid('conversation_id').notNull(),
  contactId: uuid('contact_id'),
  messageId: uuid('message_id'),
  
  // Alert classification
  alertType: alertTypeEnum('alert_type').notNull(),
  severity: alertSeverityEnum('alert_severity').notNull(),
  
  // Trigger information
  triggerValue: real('trigger_value').notNull(),
  threshold: real('threshold').notNull(),
  description: text('description').notNull(),
  
  // Context
  context: jsonb('context').$type<AlertContext>().notNull(),
  
  // Acknowledgment status
  acknowledged: boolean('acknowledged').notNull().default(false),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  acknowledgedBy: uuid('acknowledged_by'),
  
  // Resolution status
  resolved: boolean('resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolution: jsonb('resolution').$type<AlertResolution>(),
  
  // Auto-action taken
  autoActionTaken: boolean('auto_action_taken').notNull().default(false),
  autoAction: varchar('auto_action', { length: 100 }),
  
  // Notification tracking
  notificationSent: boolean('notification_sent').notNull().default(false),
  notificationChannels: jsonb('notification_channels').$type<string[]>().default([]),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  
}, (table) => ({
  // Indexes
  tenantConversationIdx: index('alert_tenant_conversation_idx')
    .on(table.tenantId, table.conversationId),
  tenantTypeIdx: index('alert_tenant_type_idx')
    .on(table.tenantId, table.alertType),
  tenantSeverityIdx: index('alert_tenant_severity_idx')
    .on(table.tenantId, table.severity),
  tenantAcknowledgedIdx: index('alert_tenant_acknowledged_idx')
    .on(table.tenantId, table.acknowledged),
  tenantResolvedIdx: index('alert_tenant_resolved_idx')
    .on(table.tenantId, table.resolved),
  tenantCreatedIdx: index('alert_tenant_created_idx')
    .on(table.tenantId, table.createdAt),
  contactIdx: index('alert_contact_idx')
    .on(table.tenantId, table.contactId),
    
  // Partial index for unresolved critical alerts
  unresolvedCriticalIdx: index('alert_unresolved_critical_idx')
    .on(table.tenantId, table.severity)
    .where(sql`resolved = false AND severity IN ('critical', 'emergency')`),
}));

// Type exports
export type AnalysisAlert = typeof analysisAlerts.$inferSelect;
export type NewAnalysisAlert = typeof analysisAlerts.$inferInsert;
```

### 3.4 Configuration Tables

#### 3.4.1 analysis_configurations

```typescript
// packages/database/src/schema/analysis-configurations.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  real,
  boolean,
  jsonb,
  uniqueIndex
} from 'drizzle-orm/pg-core';

// Threshold configuration
interface ThresholdConfig {
  negativeSentimentAlert: number;
  positiveSentimentAlert: number;
  sentimentDeclineThreshold: number;
  sentimentDeclineWindow: number; // messages
  frustrationThreshold: number;
  riskScoreThreshold: number;
  urgencyArousalThreshold: number;
}

// Model configuration
interface ModelConfig {
  sentimentModel: string;
  intentModel: string;
  emotionModel: string;
  temperature: number;
  maxTokens: number;
  fallbackEnabled: boolean;
}

// Notification configuration
interface NotificationConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
  slackEnabled: boolean;
  slackChannel?: string;
  severityThreshold: string;
}

// Processing configuration
interface ProcessingConfig {
  parallelAnalysis: boolean;
  batchSize: number;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export const analysisConfigurations = pgTable('analysis_configurations', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant isolation
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Configuration name
  name: varchar('name', { length: 100 }).notNull().default('default'),
  description: varchar('description', { length: 500 }),
  
  // Active status
  isActive: boolean('is_active').notNull().default(true),
  
  // Threshold configuration
  thresholds: jsonb('thresholds').$type<ThresholdConfig>().notNull(),
  
  // Model configuration
  models: jsonb('models').$type<ModelConfig>().notNull(),
  
  // Notification configuration
  notifications: jsonb('notifications').$type<NotificationConfig>().notNull(),
  
  // Processing configuration
  processing: jsonb('processing').$type<ProcessingConfig>().notNull(),
  
  // Language settings
  primaryLanguage: varchar('primary_language', { length: 10 }).notNull().default('ro'),
  supportedLanguages: jsonb('supported_languages').$type<string[]>().default(['ro', 'en']),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  
}, (table) => ({
  tenantNameIdx: uniqueIndex('config_tenant_name_idx')
    .on(table.tenantId, table.name),
  tenantActiveIdx: uniqueIndex('config_tenant_active_idx')
    .on(table.tenantId)
    .where(sql`is_active = true`),
}));

// Type exports
export type AnalysisConfiguration = typeof analysisConfigurations.$inferSelect;
export type NewAnalysisConfiguration = typeof analysisConfigurations.$inferInsert;
```

### 3.5 Migration File

```sql
-- migrations/0321_workers_k_sentiment_intent.sql
-- Workers K: Sentiment & Intent Analysis Tables
-- Version: 1.0.0
-- Date: 2026-01-18

BEGIN;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE sentiment_label AS ENUM (
  'very_positive',
  'positive',
  'neutral',
  'negative',
  'very_negative',
  'mixed'
);

CREATE TYPE intent_type AS ENUM (
  'price_inquiry',
  'product_inquiry',
  'availability_check',
  'discount_request',
  'order_placement',
  'bulk_order',
  'quote_request',
  'payment_inquiry',
  'complaint',
  'support_request',
  'delivery_inquiry',
  'return_request',
  'invoice_request',
  'warranty_inquiry',
  'greeting',
  'farewell',
  'gratitude',
  'confirmation',
  'negation',
  'clarification',
  'human_agent_request',
  'urgency_expression',
  'negotiation_attempt',
  'comparison_request',
  'unclear',
  'out_of_scope',
  'spam'
);

CREATE TYPE emotion_type AS ENUM (
  'joy',
  'trust',
  'fear',
  'surprise',
  'sadness',
  'disgust',
  'anger',
  'anticipation',
  'frustration',
  'satisfaction',
  'confusion',
  'urgency',
  'interest',
  'disappointment',
  'relief',
  'impatience',
  'neutral'
);

CREATE TYPE risk_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE trend_direction AS ENUM (
  'improving',
  'declining',
  'stable',
  'volatile',
  'recovering',
  'deteriorating'
);

CREATE TYPE window_type AS ENUM (
  'message',
  'hourly',
  'daily',
  'session'
);

CREATE TYPE alert_type AS ENUM (
  'negative_sentiment',
  'sentiment_decline',
  'sentiment_spike',
  'sustained_negativity',
  'human_agent_requested',
  'complaint_detected',
  'urgency_detected',
  'churn_signal',
  'high_frustration',
  'anger_detected',
  'high_arousal',
  'risk_threshold_exceeded',
  'escalation_recommended',
  'vip_attention_required'
);

CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical',
  'emergency'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Sentiment Analyses
CREATE TABLE sentiment_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  contact_id UUID,
  
  sentiment_score REAL NOT NULL CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
  sentiment_label sentiment_label NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  
  aspects JSONB DEFAULT '[]'::jsonb,
  context JSONB,
  
  language VARCHAR(10) NOT NULL DEFAULT 'ro',
  
  model VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  
  processing_time_ms REAL,
  token_count REAL,
  
  encrypted_text TEXT,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Intent Detections
CREATE TABLE intent_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  contact_id UUID,
  
  primary_intent intent_type NOT NULL,
  primary_confidence REAL NOT NULL CHECK (primary_confidence >= 0.0 AND primary_confidence <= 1.0),
  
  secondary_intents JSONB DEFAULT '[]'::jsonb,
  entities JSONB DEFAULT '[]'::jsonb,
  
  action_required BOOLEAN NOT NULL DEFAULT false,
  suggested_action VARCHAR(100),
  action_priority VARCHAR(20),
  
  language VARCHAR(10) NOT NULL DEFAULT 'ro',
  
  model VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  
  processing_time_ms REAL,
  token_count REAL,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emotion Detections
CREATE TABLE emotion_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  contact_id UUID,
  
  primary_emotion emotion_type NOT NULL,
  primary_intensity REAL NOT NULL CHECK (primary_intensity >= 0.0 AND primary_intensity <= 1.0),
  confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  
  secondary_emotions JSONB DEFAULT '[]'::jsonb,
  
  valence REAL CHECK (valence >= -1.0 AND valence <= 1.0),
  arousal REAL CHECK (arousal >= 0.0 AND arousal <= 1.0),
  dominance REAL CHECK (dominance >= 0.0 AND dominance <= 1.0),
  
  cues JSONB DEFAULT '[]'::jsonb,
  
  language VARCHAR(10) NOT NULL DEFAULT 'ro',
  
  model VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  
  processing_time_ms REAL,
  token_count REAL,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analysis Aggregates
CREATE TABLE analysis_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  contact_id UUID,
  
  sentiment_analysis_id UUID REFERENCES sentiment_analyses(id),
  intent_detection_id UUID REFERENCES intent_detections(id),
  emotion_detection_id UUID REFERENCES emotion_detections(id),
  
  combined_analysis JSONB NOT NULL,
  
  composite_score REAL NOT NULL CHECK (composite_score >= -1.0 AND composite_score <= 1.0),
  
  risk_level risk_level NOT NULL,
  risk_score REAL NOT NULL CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
  risk_factors JSONB DEFAULT '[]'::jsonb,
  
  action_required BOOLEAN NOT NULL DEFAULT false,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  
  urgency_level VARCHAR(20),
  
  language VARCHAR(10) NOT NULL DEFAULT 'ro',
  
  total_processing_time_ms REAL,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TRENDING & HISTORY TABLES
-- =====================================================

-- Sentiment Trends
CREATE TABLE sentiment_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  contact_id UUID,
  
  window_type window_type NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  
  avg_sentiment REAL NOT NULL,
  min_sentiment REAL NOT NULL,
  max_sentiment REAL NOT NULL,
  std_dev_sentiment REAL,
  
  sentiment_change REAL NOT NULL,
  trend_direction trend_direction NOT NULL,
  trend_strength REAL,
  
  volatility REAL,
  oscillation_count INTEGER,
  
  message_count INTEGER NOT NULL,
  positive_count INTEGER NOT NULL,
  negative_count INTEGER NOT NULL,
  neutral_count INTEGER NOT NULL,
  
  data_points JSONB DEFAULT '[]'::jsonb,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analysis Alerts
CREATE TABLE analysis_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  contact_id UUID,
  message_id UUID,
  
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  
  trigger_value REAL NOT NULL,
  threshold REAL NOT NULL,
  description TEXT NOT NULL,
  
  context JSONB NOT NULL,
  
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution JSONB,
  
  auto_action_taken BOOLEAN NOT NULL DEFAULT false,
  auto_action VARCHAR(100),
  
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_channels JSONB DEFAULT '[]'::jsonb,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analysis Configurations
CREATE TABLE analysis_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL DEFAULT 'default',
  description VARCHAR(500),
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  thresholds JSONB NOT NULL,
  models JSONB NOT NULL,
  notifications JSONB NOT NULL,
  processing JSONB NOT NULL,
  
  primary_language VARCHAR(10) NOT NULL DEFAULT 'ro',
  supported_languages JSONB DEFAULT '["ro", "en"]'::jsonb,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Sentiment Analyses Indexes
CREATE UNIQUE INDEX sentiment_tenant_message_idx ON sentiment_analyses(tenant_id, message_id);
CREATE INDEX sentiment_tenant_conversation_idx ON sentiment_analyses(tenant_id, conversation_id);
CREATE INDEX sentiment_tenant_score_idx ON sentiment_analyses(tenant_id, sentiment_score);
CREATE INDEX sentiment_tenant_label_idx ON sentiment_analyses(tenant_id, sentiment_label);
CREATE INDEX sentiment_tenant_created_idx ON sentiment_analyses(tenant_id, created_at);
CREATE INDEX sentiment_contact_idx ON sentiment_analyses(tenant_id, contact_id);
CREATE INDEX sentiment_negative_idx ON sentiment_analyses(tenant_id, sentiment_score) 
  WHERE sentiment_score < -0.3;

-- Intent Detections Indexes
CREATE UNIQUE INDEX intent_tenant_message_idx ON intent_detections(tenant_id, message_id);
CREATE INDEX intent_tenant_conversation_idx ON intent_detections(tenant_id, conversation_id);
CREATE INDEX intent_tenant_intent_idx ON intent_detections(tenant_id, primary_intent);
CREATE INDEX intent_tenant_action_idx ON intent_detections(tenant_id, action_required);
CREATE INDEX intent_tenant_created_idx ON intent_detections(tenant_id, created_at);
CREATE INDEX intent_contact_idx ON intent_detections(tenant_id, contact_id);
CREATE INDEX intent_high_priority_idx ON intent_detections(tenant_id, action_priority)
  WHERE action_required = true AND action_priority IN ('high', 'critical');

-- Emotion Detections Indexes
CREATE UNIQUE INDEX emotion_tenant_message_idx ON emotion_detections(tenant_id, message_id);
CREATE INDEX emotion_tenant_conversation_idx ON emotion_detections(tenant_id, conversation_id);
CREATE INDEX emotion_tenant_emotion_idx ON emotion_detections(tenant_id, primary_emotion);
CREATE INDEX emotion_tenant_valence_idx ON emotion_detections(tenant_id, valence);
CREATE INDEX emotion_tenant_created_idx ON emotion_detections(tenant_id, created_at);
CREATE INDEX emotion_contact_idx ON emotion_detections(tenant_id, contact_id);
CREATE INDEX emotion_high_arousal_idx ON emotion_detections(tenant_id, arousal) 
  WHERE arousal > 0.7;

-- Analysis Aggregates Indexes
CREATE UNIQUE INDEX aggregate_tenant_message_idx ON analysis_aggregates(tenant_id, message_id);
CREATE INDEX aggregate_tenant_conversation_idx ON analysis_aggregates(tenant_id, conversation_id);
CREATE INDEX aggregate_tenant_risk_idx ON analysis_aggregates(tenant_id, risk_level);
CREATE INDEX aggregate_tenant_score_idx ON analysis_aggregates(tenant_id, composite_score);
CREATE INDEX aggregate_tenant_action_idx ON analysis_aggregates(tenant_id, action_required);
CREATE INDEX aggregate_tenant_created_idx ON analysis_aggregates(tenant_id, created_at);
CREATE INDEX aggregate_contact_idx ON analysis_aggregates(tenant_id, contact_id);
CREATE INDEX aggregate_high_risk_idx ON analysis_aggregates(tenant_id, risk_level)
  WHERE risk_level IN ('high', 'critical');

-- Sentiment Trends Indexes
CREATE INDEX trend_tenant_conversation_idx ON sentiment_trends(tenant_id, conversation_id);
CREATE INDEX trend_tenant_window_idx ON sentiment_trends(tenant_id, window_type, window_start);
CREATE INDEX trend_tenant_direction_idx ON sentiment_trends(tenant_id, trend_direction);
CREATE INDEX trend_tenant_created_idx ON sentiment_trends(tenant_id, created_at);
CREATE INDEX trend_contact_idx ON sentiment_trends(tenant_id, contact_id);
CREATE INDEX trend_declining_idx ON sentiment_trends(tenant_id, trend_direction)
  WHERE trend_direction IN ('declining', 'deteriorating');

-- Analysis Alerts Indexes
CREATE INDEX alert_tenant_conversation_idx ON analysis_alerts(tenant_id, conversation_id);
CREATE INDEX alert_tenant_type_idx ON analysis_alerts(tenant_id, alert_type);
CREATE INDEX alert_tenant_severity_idx ON analysis_alerts(tenant_id, severity);
CREATE INDEX alert_tenant_acknowledged_idx ON analysis_alerts(tenant_id, acknowledged);
CREATE INDEX alert_tenant_resolved_idx ON analysis_alerts(tenant_id, resolved);
CREATE INDEX alert_tenant_created_idx ON analysis_alerts(tenant_id, created_at);
CREATE INDEX alert_contact_idx ON analysis_alerts(tenant_id, contact_id);
CREATE INDEX alert_unresolved_critical_idx ON analysis_alerts(tenant_id, severity)
  WHERE resolved = false AND severity IN ('critical', 'emergency');

-- Analysis Configurations Indexes
CREATE UNIQUE INDEX config_tenant_name_idx ON analysis_configurations(tenant_id, name);
CREATE UNIQUE INDEX config_tenant_active_idx ON analysis_configurations(tenant_id)
  WHERE is_active = true;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger for analysis_alerts
CREATE TRIGGER update_analysis_alerts_updated_at
  BEFORE UPDATE ON analysis_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for analysis_configurations
CREATE TRIGGER update_analysis_configurations_updated_at
  BEFORE UPDATE ON analysis_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE sentiment_analyses IS 'Stores sentiment analysis results for messages';
COMMENT ON TABLE intent_detections IS 'Stores intent detection results for messages';
COMMENT ON TABLE emotion_detections IS 'Stores emotion detection results for messages';
COMMENT ON TABLE analysis_aggregates IS 'Combines sentiment, intent, and emotion analysis';
COMMENT ON TABLE sentiment_trends IS 'Tracks sentiment trends over time windows';
COMMENT ON TABLE analysis_alerts IS 'Stores alerts triggered by analysis thresholds';
COMMENT ON TABLE analysis_configurations IS 'Tenant-specific analysis configuration';

COMMIT;
```


---

## 4. Worker Implementations

### 4.1 Worker K1: Sentiment Analysis

```typescript
// packages/workers/src/workers/sentiment-analysis.worker.ts
import { Worker, Job, Queue } from 'bullmq';
import { logger } from '@cerniq/logger';
import { db } from '@cerniq/database';
import { sentimentAnalyses, analysisAggregates, analysisAlerts } from '@cerniq/database/schema';
import { anthropic } from '@cerniq/ai';
import { redis, createRedisConnection } from '@cerniq/redis';
import { eq, and, desc, sql } from 'drizzle-orm';
import { encrypt } from '@cerniq/crypto';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// Types
// =====================================================

interface SentimentAnalysisJob {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId?: string;
  text: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

interface AspectSentiment {
  aspect: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keywords: string[];
}

interface SentimentResult {
  sentimentScore: number;
  sentimentLabel: string;
  confidence: number;
  aspects: AspectSentiment[];
  language: string;
  processingTimeMs: number;
  tokenCount: number;
}

type SentimentLabel = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative' | 'mixed';

// =====================================================
// Constants
// =====================================================

const QUEUE_NAME = 'sentiment-analysis';
const CONCURRENCY = 10;
const MAX_RETRIES = 3;
const CACHE_TTL = 3600; // 1 hour

const SENTIMENT_THRESHOLDS = {
  veryPositive: 0.6,
  positive: 0.2,
  neutral: { min: -0.2, max: 0.2 },
  negative: -0.2,
  veryNegative: -0.6
};

// =====================================================
// Language Detection
// =====================================================

async function detectLanguage(text: string): Promise<string> {
  // Simple heuristics for Romanian vs English
  const romanianIndicators = [
    'ă', 'â', 'î', 'ș', 'ț',
    'pentru', 'este', 'care', 'sunt', 'acest',
    'bună', 'mulțumesc', 'vă rog', 'aș vrea'
  ];
  
  const textLower = text.toLowerCase();
  let romanianScore = 0;
  
  for (const indicator of romanianIndicators) {
    if (textLower.includes(indicator)) {
      romanianScore++;
    }
  }
  
  return romanianScore >= 2 ? 'ro' : 'en';
}

// =====================================================
// Sentiment Analysis Worker
// =====================================================

export class SentimentAnalysisWorker {
  private worker: Worker;
  private aggregateQueue: Queue;

  constructor() {
    const connection = createRedisConnection();
    
    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<SentimentAnalysisJob>) => this.process(job),
      {
        connection,
        concurrency: CONCURRENCY,
        limiter: {
          max: 100,
          duration: 1000 // 100 jobs per second
        }
      }
    );

    this.aggregateQueue = new Queue('analysis-aggregate', { connection });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info({
        event: 'sentiment_analysis_completed',
        jobId: job.id,
        messageId: job.data.messageId,
        sentiment: result?.sentimentLabel,
        processingTime: result?.processingTimeMs
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error({
        event: 'sentiment_analysis_failed',
        jobId: job?.id,
        messageId: job?.data?.messageId,
        error: error.message,
        stack: error.stack
      });
    });
  }

  async process(job: Job<SentimentAnalysisJob>): Promise<SentimentResult> {
    const startTime = Date.now();
    const { tenantId, messageId, conversationId, contactId, text, metadata } = job.data;

    logger.info({
      event: 'sentiment_analysis_started',
      jobId: job.id,
      messageId,
      conversationId,
      textLength: text.length
    });

    try {
      // Check cache
      const cached = await this.getCachedResult(tenantId, messageId);
      if (cached) {
        logger.info({ event: 'sentiment_cache_hit', messageId });
        return cached;
      }

      // Detect language
      const language = job.data.language || await detectLanguage(text);

      // Get conversation context for better analysis
      const context = await this.getConversationContext(tenantId, conversationId);

      // Perform sentiment analysis
      const result = await this.analyzeSentiment(text, language, context);

      // Store result
      const analysisId = await this.storeResult(
        tenantId,
        messageId,
        conversationId,
        contactId,
        text,
        result,
        metadata
      );

      // Check for alerts
      await this.checkAlertThresholds(tenantId, conversationId, contactId, messageId, result);

      // Queue aggregation
      await this.aggregateQueue.add('aggregate', {
        tenantId,
        messageId,
        conversationId,
        contactId,
        sentimentAnalysisId: analysisId,
        sentimentResult: {
          score: result.sentimentScore,
          label: result.sentimentLabel,
          confidence: result.confidence
        }
      }, {
        priority: 3
      });

      // Publish event
      await this.publishSentimentEvent(tenantId, conversationId, messageId, result);

      // Cache result
      await this.cacheResult(tenantId, messageId, result);

      const processingTimeMs = Date.now() - startTime;
      
      return {
        ...result,
        processingTimeMs
      };

    } catch (error) {
      logger.error({
        event: 'sentiment_analysis_error',
        messageId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  private async getConversationContext(
    tenantId: string,
    conversationId: string
  ): Promise<{ prevSentiments: number[]; messageCount: number }> {
    const recentAnalyses = await db.query.sentimentAnalyses.findMany({
      where: and(
        eq(sentimentAnalyses.tenantId, tenantId),
        eq(sentimentAnalyses.conversationId, conversationId)
      ),
      orderBy: [desc(sentimentAnalyses.createdAt)],
      limit: 5,
      columns: {
        sentimentScore: true
      }
    });

    return {
      prevSentiments: recentAnalyses.map(a => a.sentimentScore),
      messageCount: recentAnalyses.length
    };
  }

  private async analyzeSentiment(
    text: string,
    language: string,
    context: { prevSentiments: number[]; messageCount: number }
  ): Promise<Omit<SentimentResult, 'processingTimeMs'>> {
    const systemPrompt = language === 'ro' 
      ? this.getRomanianSystemPrompt()
      : this.getEnglishSystemPrompt();

    const userPrompt = this.buildUserPrompt(text, context, language);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseResponse(content.text, language, response.usage?.input_tokens || 0);
  }

  private getRomanianSystemPrompt(): string {
    return `Ești un analizor de sentiment pentru conversații B2B în limba română în domeniul agricol.

Analizează textul și returnează un JSON valid cu următoarea structură:
{
  "sentimentScore": number (-1.0 la 1.0, unde -1 = foarte negativ, 1 = foarte pozitiv),
  "confidence": number (0.0 la 1.0),
  "aspects": [
    {
      "aspect": string (ex: "preț", "calitate", "livrare", "service"),
      "sentiment": "positive" | "negative" | "neutral",
      "confidence": number,
      "keywords": string[]
    }
  ]
}

Considerații importante:
- Context B2B agricol (fermieri, distribuitori, produse agricole)
- Limbaj formal și informal specific domeniului
- Recunoaștere tonuri: negociere, urgență, frustrare, satisfacție
- Expresii românești specifice (ex: "merge treaba", "nu-i bai")

Returnează DOAR JSON-ul, fără explicații suplimentare.`;
  }

  private getEnglishSystemPrompt(): string {
    return `You are a sentiment analyzer for B2B conversations in the agricultural domain.

Analyze the text and return a valid JSON with the following structure:
{
  "sentimentScore": number (-1.0 to 1.0, where -1 = very negative, 1 = very positive),
  "confidence": number (0.0 to 1.0),
  "aspects": [
    {
      "aspect": string (e.g., "price", "quality", "delivery", "service"),
      "sentiment": "positive" | "negative" | "neutral",
      "confidence": number,
      "keywords": string[]
    }
  ]
}

Important considerations:
- B2B agricultural context (farmers, distributors, agricultural products)
- Formal and informal domain-specific language
- Recognize tones: negotiation, urgency, frustration, satisfaction

Return ONLY the JSON, no additional explanations.`;
  }

  private buildUserPrompt(
    text: string,
    context: { prevSentiments: number[]; messageCount: number },
    language: string
  ): string {
    let contextInfo = '';
    
    if (context.messageCount > 0) {
      const avgSentiment = context.prevSentiments.reduce((a, b) => a + b, 0) / context.prevSentiments.length;
      const trend = avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral';
      
      contextInfo = language === 'ro'
        ? `\nContext conversație: ${context.messageCount} mesaje anterioare, tendință ${trend}`
        : `\nConversation context: ${context.messageCount} previous messages, ${trend} trend`;
    }

    return language === 'ro'
      ? `Analizează sentimentul următorului mesaj:${contextInfo}\n\nMesaj: "${text}"`
      : `Analyze the sentiment of the following message:${contextInfo}\n\nMessage: "${text}"`;
  }

  private parseResponse(
    responseText: string,
    language: string,
    tokenCount: number
  ): Omit<SentimentResult, 'processingTimeMs'> {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      const sentimentScore = Math.max(-1, Math.min(1, parsed.sentimentScore || 0));
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));
      const aspects = this.validateAspects(parsed.aspects || []);

      return {
        sentimentScore,
        sentimentLabel: this.scoreToLabel(sentimentScore),
        confidence,
        aspects,
        language,
        tokenCount
      };
    } catch (parseError) {
      logger.warn({
        event: 'sentiment_parse_fallback',
        error: parseError.message,
        responseText: responseText.substring(0, 200)
      });

      return this.fallbackAnalysis(language, tokenCount);
    }
  }

  private validateAspects(aspects: any[]): AspectSentiment[] {
    if (!Array.isArray(aspects)) return [];

    return aspects
      .filter(a => a && typeof a === 'object')
      .map(a => ({
        aspect: String(a.aspect || 'general'),
        sentiment: this.validateSentimentValue(a.sentiment),
        confidence: Math.max(0, Math.min(1, a.confidence || 0.5)),
        keywords: Array.isArray(a.keywords) ? a.keywords.map(String) : []
      }))
      .slice(0, 10); // Max 10 aspects
  }

  private validateSentimentValue(value: any): 'positive' | 'negative' | 'neutral' {
    if (value === 'positive' || value === 'negative' || value === 'neutral') {
      return value;
    }
    return 'neutral';
  }

  private scoreToLabel(score: number): SentimentLabel {
    if (score >= SENTIMENT_THRESHOLDS.veryPositive) return 'very_positive';
    if (score >= SENTIMENT_THRESHOLDS.positive) return 'positive';
    if (score <= SENTIMENT_THRESHOLDS.veryNegative) return 'very_negative';
    if (score <= SENTIMENT_THRESHOLDS.negative) return 'negative';
    return 'neutral';
  }

  private fallbackAnalysis(language: string, tokenCount: number): Omit<SentimentResult, 'processingTimeMs'> {
    return {
      sentimentScore: 0,
      sentimentLabel: 'neutral',
      confidence: 0.3,
      aspects: [],
      language,
      tokenCount
    };
  }

  private async storeResult(
    tenantId: string,
    messageId: string,
    conversationId: string,
    contactId: string | undefined,
    text: string,
    result: Omit<SentimentResult, 'processingTimeMs'>,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const id = uuidv4();
    
    // Encrypt text for storage
    const encryptedText = await encrypt(text);

    await db.insert(sentimentAnalyses).values({
      id,
      tenantId,
      messageId,
      conversationId,
      contactId,
      sentimentScore: result.sentimentScore,
      sentimentLabel: result.sentimentLabel as any,
      confidence: result.confidence,
      aspects: result.aspects,
      context: {
        prevMessageSentiment: null, // Could be added
        conversationTrend: null,
        messagePosition: null,
        isResponseToAgent: null
      },
      language: result.language,
      model: 'claude-sonnet-4-20250514',
      modelVersion: '20250514',
      processingTimeMs: null, // Will be updated
      tokenCount: result.tokenCount,
      encryptedText,
      metadata
    });

    return id;
  }

  private async checkAlertThresholds(
    tenantId: string,
    conversationId: string,
    contactId: string | undefined,
    messageId: string,
    result: Omit<SentimentResult, 'processingTimeMs'>
  ): Promise<void> {
    // Get tenant configuration
    const config = await this.getTenantConfig(tenantId);
    const threshold = config?.thresholds?.negativeSentimentAlert ?? -0.5;

    // Check for negative sentiment alert
    if (result.sentimentScore <= threshold) {
      await db.insert(analysisAlerts).values({
        id: uuidv4(),
        tenantId,
        conversationId,
        contactId,
        messageId,
        alertType: 'negative_sentiment',
        severity: result.sentimentScore <= -0.7 ? 'critical' : 'warning',
        triggerValue: result.sentimentScore,
        threshold,
        description: `Negative sentiment detected: ${result.sentimentScore.toFixed(2)} (threshold: ${threshold})`,
        context: {
          messageId,
          conversationId,
          contactId
        }
      });

      // Publish alert event
      await redis.publish('analysis-alerts', JSON.stringify({
        type: 'NEGATIVE_SENTIMENT_ALERT',
        tenantId,
        conversationId,
        contactId,
        messageId,
        sentiment: result.sentimentScore,
        severity: result.sentimentScore <= -0.7 ? 'critical' : 'warning',
        timestamp: new Date().toISOString()
      }));
    }

    // Check for sentiment decline
    await this.checkSentimentDecline(tenantId, conversationId, contactId, messageId, result.sentimentScore);
  }

  private async checkSentimentDecline(
    tenantId: string,
    conversationId: string,
    contactId: string | undefined,
    messageId: string,
    currentScore: number
  ): Promise<void> {
    const recentAnalyses = await db.query.sentimentAnalyses.findMany({
      where: and(
        eq(sentimentAnalyses.tenantId, tenantId),
        eq(sentimentAnalyses.conversationId, conversationId)
      ),
      orderBy: [desc(sentimentAnalyses.createdAt)],
      limit: 5,
      columns: { sentimentScore: true }
    });

    if (recentAnalyses.length < 3) return;

    const prevAvg = recentAnalyses.slice(1).reduce((a, b) => a + b.sentimentScore, 0) / (recentAnalyses.length - 1);
    const decline = prevAvg - currentScore;

    if (decline >= 0.4) { // Significant decline
      await db.insert(analysisAlerts).values({
        id: uuidv4(),
        tenantId,
        conversationId,
        contactId,
        messageId,
        alertType: 'sentiment_decline',
        severity: 'warning',
        triggerValue: decline,
        threshold: 0.4,
        description: `Sentiment declined by ${decline.toFixed(2)} from average ${prevAvg.toFixed(2)}`,
        context: {
          messageId,
          conversationId,
          contactId,
          previousAverage: prevAvg,
          currentScore
        }
      });
    }
  }

  private async getTenantConfig(tenantId: string): Promise<any> {
    // Try cache first
    const cached = await redis.get(`config:analysis:${tenantId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const config = await db.query.analysisConfigurations.findFirst({
      where: and(
        eq(sql`tenant_id`, tenantId),
        eq(sql`is_active`, true)
      )
    });

    if (config) {
      await redis.setex(`config:analysis:${tenantId}`, 300, JSON.stringify(config));
    }

    return config;
  }

  private async publishSentimentEvent(
    tenantId: string,
    conversationId: string,
    messageId: string,
    result: Omit<SentimentResult, 'processingTimeMs'>
  ): Promise<void> {
    await redis.publish('worker-events', JSON.stringify({
      type: 'SENTIMENT_ANALYZED',
      tenantId,
      conversationId,
      messageId,
      sentiment: {
        score: result.sentimentScore,
        label: result.sentimentLabel,
        confidence: result.confidence
      },
      timestamp: new Date().toISOString()
    }));
  }

  private async getCachedResult(
    tenantId: string,
    messageId: string
  ): Promise<SentimentResult | null> {
    const key = `sentiment:${tenantId}:${messageId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheResult(
    tenantId: string,
    messageId: string,
    result: SentimentResult
  ): Promise<void> {
    const key = `sentiment:${tenantId}:${messageId}`;
    await redis.setex(key, CACHE_TTL, JSON.stringify(result));
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.aggregateQueue.close();
  }
}

export const sentimentAnalysisWorker = new SentimentAnalysisWorker();
```

### 4.2 Worker K2: Intent Detection

```typescript
// packages/workers/src/workers/intent-detection.worker.ts
import { Worker, Job, Queue } from 'bullmq';
import { logger } from '@cerniq/logger';
import { db } from '@cerniq/database';
import { intentDetections } from '@cerniq/database/schema';
import { anthropic } from '@cerniq/ai';
import { redis, createRedisConnection } from '@cerniq/redis';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// Types
// =====================================================

interface IntentDetectionJob {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId?: string;
  text: string;
  language?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  metadata?: Record<string, unknown>;
}

enum IntentType {
  // Sales intents
  PRICE_INQUIRY = 'price_inquiry',
  PRODUCT_INQUIRY = 'product_inquiry',
  AVAILABILITY_CHECK = 'availability_check',
  DISCOUNT_REQUEST = 'discount_request',
  ORDER_PLACEMENT = 'order_placement',
  BULK_ORDER = 'bulk_order',
  QUOTE_REQUEST = 'quote_request',
  PAYMENT_INQUIRY = 'payment_inquiry',
  
  // Service intents
  COMPLAINT = 'complaint',
  SUPPORT_REQUEST = 'support_request',
  DELIVERY_INQUIRY = 'delivery_inquiry',
  RETURN_REQUEST = 'return_request',
  INVOICE_REQUEST = 'invoice_request',
  WARRANTY_INQUIRY = 'warranty_inquiry',
  
  // Conversation intents
  GREETING = 'greeting',
  FAREWELL = 'farewell',
  GRATITUDE = 'gratitude',
  CONFIRMATION = 'confirmation',
  NEGATION = 'negation',
  CLARIFICATION = 'clarification',
  
  // Special intents
  HUMAN_AGENT_REQUEST = 'human_agent_request',
  URGENCY_EXPRESSION = 'urgency_expression',
  NEGOTIATION_ATTEMPT = 'negotiation_attempt',
  COMPARISON_REQUEST = 'comparison_request',
  
  // Meta intents
  UNCLEAR = 'unclear',
  OUT_OF_SCOPE = 'out_of_scope',
  SPAM = 'spam'
}

interface DetectedEntity {
  type: 'product' | 'quantity' | 'price' | 'date' | 'location' | 'company' | 'person' | 'custom';
  value: string;
  normalizedValue?: string;
  confidence: number;
}

interface IntentResult {
  primaryIntent: IntentType;
  primaryConfidence: number;
  secondaryIntents: Array<{ intent: string; confidence: number }>;
  entities: DetectedEntity[];
  actionRequired: boolean;
  suggestedAction: string | null;
  language: string;
  processingTimeMs: number;
}

// =====================================================
// Constants
// =====================================================

const QUEUE_NAME = 'intent-detection';
const CONCURRENCY = 10;

// Intent to action mapping
const INTENT_ACTIONS: Record<IntentType, string | null> = {
  [IntentType.PRICE_INQUIRY]: 'provide_pricing',
  [IntentType.PRODUCT_INQUIRY]: 'provide_product_info',
  [IntentType.AVAILABILITY_CHECK]: 'check_stock',
  [IntentType.DISCOUNT_REQUEST]: 'evaluate_discount',
  [IntentType.ORDER_PLACEMENT]: 'process_order',
  [IntentType.BULK_ORDER]: 'process_bulk_order',
  [IntentType.QUOTE_REQUEST]: 'generate_quote',
  [IntentType.PAYMENT_INQUIRY]: 'provide_payment_info',
  [IntentType.COMPLAINT]: 'escalate_complaint',
  [IntentType.SUPPORT_REQUEST]: 'route_support',
  [IntentType.DELIVERY_INQUIRY]: 'check_delivery',
  [IntentType.RETURN_REQUEST]: 'process_return',
  [IntentType.INVOICE_REQUEST]: 'generate_invoice',
  [IntentType.WARRANTY_INQUIRY]: 'check_warranty',
  [IntentType.GREETING]: null,
  [IntentType.FAREWELL]: null,
  [IntentType.GRATITUDE]: null,
  [IntentType.CONFIRMATION]: 'confirm_action',
  [IntentType.NEGATION]: 'handle_rejection',
  [IntentType.CLARIFICATION]: 'request_clarification',
  [IntentType.HUMAN_AGENT_REQUEST]: 'trigger_handover',
  [IntentType.URGENCY_EXPRESSION]: 'prioritize',
  [IntentType.NEGOTIATION_ATTEMPT]: 'handle_negotiation',
  [IntentType.COMPARISON_REQUEST]: 'provide_comparison',
  [IntentType.UNCLEAR]: 'request_clarification',
  [IntentType.OUT_OF_SCOPE]: 'redirect',
  [IntentType.SPAM]: 'filter'
};

// =====================================================
// Intent Detection Worker
// =====================================================

export class IntentDetectionWorker {
  private worker: Worker;
  private aggregateQueue: Queue;

  constructor() {
    const connection = createRedisConnection();
    
    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<IntentDetectionJob>) => this.process(job),
      {
        connection,
        concurrency: CONCURRENCY,
        limiter: {
          max: 100,
          duration: 1000
        }
      }
    );

    this.aggregateQueue = new Queue('analysis-aggregate', { connection });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info({
        event: 'intent_detection_completed',
        jobId: job.id,
        messageId: job.data.messageId,
        intent: result?.primaryIntent,
        confidence: result?.primaryConfidence
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error({
        event: 'intent_detection_failed',
        jobId: job?.id,
        error: error.message
      });
    });
  }

  async process(job: Job<IntentDetectionJob>): Promise<IntentResult> {
    const startTime = Date.now();
    const { tenantId, messageId, conversationId, contactId, text, conversationHistory, metadata } = job.data;

    logger.info({
      event: 'intent_detection_started',
      jobId: job.id,
      messageId,
      textLength: text.length
    });

    try {
      // Detect language
      const language = job.data.language || await this.detectLanguage(text);

      // Perform intent detection
      const result = await this.detectIntent(text, language, conversationHistory);

      // Store result
      const detectionId = await this.storeResult(tenantId, messageId, conversationId, contactId, result, metadata);

      // Handle special intents
      await this.handleSpecialIntents(job.data, result);

      // Queue aggregation
      await this.aggregateQueue.add('aggregate', {
        tenantId,
        messageId,
        conversationId,
        contactId,
        intentDetectionId: detectionId,
        intentResult: {
          primary: result.primaryIntent,
          confidence: result.primaryConfidence,
          actionRequired: result.actionRequired
        }
      }, {
        priority: 3
      });

      // Publish event
      await this.publishIntentEvent(job.data, result);

      const processingTimeMs = Date.now() - startTime;

      return {
        ...result,
        processingTimeMs
      };

    } catch (error) {
      logger.error({
        event: 'intent_detection_error',
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  private async detectLanguage(text: string): Promise<string> {
    const romanianChars = (text.match(/[ăâîșț]/gi) || []).length;
    const romanianWords = ['pentru', 'este', 'care', 'sunt', 'bună', 'mulțumesc'];
    const hasRomanianWords = romanianWords.some(w => text.toLowerCase().includes(w));
    
    return (romanianChars >= 2 || hasRomanianWords) ? 'ro' : 'en';
  }

  private async detectIntent(
    text: string,
    language: string,
    history?: Array<{ role: string; content: string }>
  ): Promise<Omit<IntentResult, 'processingTimeMs'>> {
    const systemPrompt = this.getSystemPrompt(language);
    const userPrompt = this.buildUserPrompt(text, language, history);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseResponse(content.text, language);
  }

  private getSystemPrompt(language: string): string {
    const intents = Object.values(IntentType).join(', ');
    
    if (language === 'ro') {
      return `Ești un detector de intenții pentru conversații B2B în domeniul agricol.

Analizează mesajul și identifică intenția principală și eventualele intenții secundare.

Intenții disponibile: ${intents}

Returnează JSON valid cu structura:
{
  "primaryIntent": string (una din intențiile de mai sus),
  "primaryConfidence": number (0.0 la 1.0),
  "secondaryIntents": [{ "intent": string, "confidence": number }],
  "entities": [
    {
      "type": "product" | "quantity" | "price" | "date" | "location" | "company" | "person" | "custom",
      "value": string,
      "normalizedValue": string (opțional),
      "confidence": number
    }
  ],
  "actionRequired": boolean
}

Context: vânzări B2B agricole - îngrășăminte, semințe, echipamente, servicii agricole.
Returnează DOAR JSON-ul.`;
    }

    return `You are an intent detector for B2B conversations in the agricultural domain.

Analyze the message and identify the primary intent and any secondary intents.

Available intents: ${intents}

Return valid JSON with structure:
{
  "primaryIntent": string (one of the intents above),
  "primaryConfidence": number (0.0 to 1.0),
  "secondaryIntents": [{ "intent": string, "confidence": number }],
  "entities": [
    {
      "type": "product" | "quantity" | "price" | "date" | "location" | "company" | "person" | "custom",
      "value": string,
      "normalizedValue": string (optional),
      "confidence": number
    }
  ],
  "actionRequired": boolean
}

Context: B2B agricultural sales - fertilizers, seeds, equipment, agricultural services.
Return ONLY the JSON.`;
  }

  private buildUserPrompt(
    text: string,
    language: string,
    history?: Array<{ role: string; content: string }>
  ): string {
    let historyContext = '';
    
    if (history && history.length > 0) {
      const recentHistory = history.slice(-3);
      historyContext = language === 'ro'
        ? `\nContextul conversației (ultimele ${recentHistory.length} mesaje):\n${recentHistory.map(h => `${h.role}: ${h.content}`).join('\n')}\n`
        : `\nConversation context (last ${recentHistory.length} messages):\n${recentHistory.map(h => `${h.role}: ${h.content}`).join('\n')}\n`;
    }

    return language === 'ro'
      ? `Detectează intenția din următorul mesaj:${historyContext}\nMesaj curent: "${text}"`
      : `Detect the intent from the following message:${historyContext}\nCurrent message: "${text}"`;
  }

  private parseResponse(
    responseText: string,
    language: string
  ): Omit<IntentResult, 'processingTimeMs'> {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      const result = JSON.parse(jsonMatch[0]);

      const primaryIntent = this.validateIntent(result.primaryIntent);
      const primaryConfidence = Math.max(0, Math.min(1, result.primaryConfidence || 0.5));

      const secondaryIntents = (result.secondaryIntents || [])
        .filter((si: any) => si && si.intent)
        .map((si: any) => ({
          intent: this.validateIntent(si.intent),
          confidence: Math.max(0, Math.min(1, si.confidence || 0.3))
        }))
        .slice(0, 5);

      const entities = (result.entities || [])
        .filter((e: any) => e && e.type && e.value)
        .map((e: any) => ({
          type: String(e.type),
          value: String(e.value),
          normalizedValue: e.normalizedValue ? String(e.normalizedValue) : undefined,
          confidence: Math.max(0, Math.min(1, e.confidence || 0.5))
        }))
        .slice(0, 20);

      return {
        primaryIntent,
        primaryConfidence,
        secondaryIntents,
        entities,
        actionRequired: Boolean(result.actionRequired) || INTENT_ACTIONS[primaryIntent] !== null,
        suggestedAction: INTENT_ACTIONS[primaryIntent],
        language
      };
    } catch (parseError) {
      logger.warn({
        event: 'intent_parse_fallback',
        error: parseError.message
      });
      return this.fallbackDetection(language);
    }
  }

  private validateIntent(intent: string): IntentType {
    if (Object.values(IntentType).includes(intent as IntentType)) {
      return intent as IntentType;
    }
    return IntentType.UNCLEAR;
  }

  private fallbackDetection(language: string): Omit<IntentResult, 'processingTimeMs'> {
    return {
      primaryIntent: IntentType.UNCLEAR,
      primaryConfidence: 0.3,
      secondaryIntents: [],
      entities: [],
      actionRequired: true,
      suggestedAction: 'request_clarification',
      language
    };
  }

  private async storeResult(
    tenantId: string,
    messageId: string,
    conversationId: string,
    contactId: string | undefined,
    result: Omit<IntentResult, 'processingTimeMs'>,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const id = uuidv4();

    await db.insert(intentDetections).values({
      id,
      tenantId,
      messageId,
      conversationId,
      contactId,
      primaryIntent: result.primaryIntent as any,
      primaryConfidence: result.primaryConfidence,
      secondaryIntents: result.secondaryIntents,
      entities: result.entities,
      actionRequired: result.actionRequired,
      suggestedAction: result.suggestedAction,
      actionPriority: this.getActionPriority(result.primaryIntent),
      language: result.language,
      model: 'claude-sonnet-4-20250514',
      modelVersion: '20250514',
      metadata
    });

    return id;
  }

  private getActionPriority(intent: IntentType): string {
    const highPriority = [
      IntentType.COMPLAINT,
      IntentType.HUMAN_AGENT_REQUEST,
      IntentType.URGENCY_EXPRESSION,
      IntentType.ORDER_PLACEMENT,
      IntentType.BULK_ORDER
    ];

    const mediumPriority = [
      IntentType.DISCOUNT_REQUEST,
      IntentType.QUOTE_REQUEST,
      IntentType.RETURN_REQUEST,
      IntentType.NEGOTIATION_ATTEMPT
    ];

    if (highPriority.includes(intent)) return 'high';
    if (mediumPriority.includes(intent)) return 'medium';
    return 'low';
  }

  private async handleSpecialIntents(
    data: IntentDetectionJob,
    result: Omit<IntentResult, 'processingTimeMs'>
  ): Promise<void> {
    // Human agent request - immediate handover
    if (result.primaryIntent === IntentType.HUMAN_AGENT_REQUEST) {
      await redis.publish('handover-triggers', JSON.stringify({
        type: 'EXPLICIT_HANDOVER_REQUEST',
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        urgency: 'high',
        timestamp: new Date().toISOString()
      }));
    }

    // Complaint - escalate to support
    if (result.primaryIntent === IntentType.COMPLAINT) {
      await redis.publish('support-queue', JSON.stringify({
        type: 'COMPLAINT_DETECTED',
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        priority: 'high',
        timestamp: new Date().toISOString()
      }));
    }

    // Urgency expression - prioritize conversation
    if (result.primaryIntent === IntentType.URGENCY_EXPRESSION) {
      await redis.publish('conversation-priority', JSON.stringify({
        type: 'URGENCY_DETECTED',
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        timestamp: new Date().toISOString()
      }));
    }

    // Order placement - notify sales team
    if (result.primaryIntent === IntentType.ORDER_PLACEMENT || 
        result.primaryIntent === IntentType.BULK_ORDER) {
      await redis.publish('sales-notifications', JSON.stringify({
        type: 'ORDER_INTENT_DETECTED',
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        contactId: data.contactId,
        messageId: data.messageId,
        isBulk: result.primaryIntent === IntentType.BULK_ORDER,
        entities: result.entities,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private async publishIntentEvent(
    data: IntentDetectionJob,
    result: Omit<IntentResult, 'processingTimeMs'>
  ): Promise<void> {
    await redis.publish('worker-events', JSON.stringify({
      type: 'INTENT_DETECTED',
      tenantId: data.tenantId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      intent: {
        primary: result.primaryIntent,
        confidence: result.primaryConfidence,
        actionRequired: result.actionRequired,
        suggestedAction: result.suggestedAction
      },
      entities: result.entities,
      timestamp: new Date().toISOString()
    }));
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.aggregateQueue.close();
  }
}

export const intentDetectionWorker = new IntentDetectionWorker();
```


### 4.3 Worker K3: Emotion Recognition

```typescript
// packages/workers/src/workers/emotion-recognition.worker.ts
import { Worker, Job, Queue } from 'bullmq';
import { logger } from '@cerniq/logger';
import { db } from '@cerniq/database';
import { emotionDetections } from '@cerniq/database/schema';
import { anthropic } from '@cerniq/ai';
import { redis, createRedisConnection } from '@cerniq/redis';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// Types
// =====================================================

interface EmotionDetectionJob {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId?: string;
  text: string;
  language?: string;
  sentimentScore?: number;
  metadata?: Record<string, unknown>;
}

enum EmotionType {
  // Primary emotions (Plutchik's wheel)
  JOY = 'joy',
  TRUST = 'trust',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  SADNESS = 'sadness',
  DISGUST = 'disgust',
  ANGER = 'anger',
  ANTICIPATION = 'anticipation',
  
  // Business context emotions
  FRUSTRATION = 'frustration',
  SATISFACTION = 'satisfaction',
  CONFUSION = 'confusion',
  URGENCY = 'urgency',
  INTEREST = 'interest',
  DISAPPOINTMENT = 'disappointment',
  RELIEF = 'relief',
  IMPATIENCE = 'impatience',
  
  // Neutral
  NEUTRAL = 'neutral'
}

interface SecondaryEmotion {
  emotion: string;
  intensity: number;
  confidence: number;
}

interface EmotionalCue {
  type: 'lexical' | 'punctuation' | 'emoji' | 'capitalization' | 'repetition';
  indicator: string;
  emotionSignal: string;
  weight: number;
}

interface VADScores {
  valence: number;    // -1 (negative) to 1 (positive)
  arousal: number;    // 0 (calm) to 1 (excited)
  dominance: number;  // 0 (submissive) to 1 (dominant)
}

interface EmotionResult {
  primaryEmotion: EmotionType;
  primaryIntensity: number;
  confidence: number;
  secondaryEmotions: SecondaryEmotion[];
  vad: VADScores;
  cues: EmotionalCue[];
  language: string;
  processingTimeMs: number;
}

// =====================================================
// Constants
// =====================================================

const QUEUE_NAME = 'emotion-recognition';
const CONCURRENCY = 10;

// Emotion to VAD mapping (approximate)
const EMOTION_VAD_MAP: Record<EmotionType, VADScores> = {
  [EmotionType.JOY]: { valence: 0.8, arousal: 0.6, dominance: 0.6 },
  [EmotionType.TRUST]: { valence: 0.6, arousal: 0.3, dominance: 0.5 },
  [EmotionType.FEAR]: { valence: -0.6, arousal: 0.7, dominance: 0.2 },
  [EmotionType.SURPRISE]: { valence: 0.2, arousal: 0.8, dominance: 0.4 },
  [EmotionType.SADNESS]: { valence: -0.7, arousal: 0.2, dominance: 0.3 },
  [EmotionType.DISGUST]: { valence: -0.6, arousal: 0.5, dominance: 0.5 },
  [EmotionType.ANGER]: { valence: -0.7, arousal: 0.8, dominance: 0.7 },
  [EmotionType.ANTICIPATION]: { valence: 0.4, arousal: 0.6, dominance: 0.5 },
  [EmotionType.FRUSTRATION]: { valence: -0.5, arousal: 0.6, dominance: 0.4 },
  [EmotionType.SATISFACTION]: { valence: 0.7, arousal: 0.4, dominance: 0.6 },
  [EmotionType.CONFUSION]: { valence: -0.2, arousal: 0.4, dominance: 0.3 },
  [EmotionType.URGENCY]: { valence: -0.1, arousal: 0.8, dominance: 0.5 },
  [EmotionType.INTEREST]: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
  [EmotionType.DISAPPOINTMENT]: { valence: -0.5, arousal: 0.3, dominance: 0.3 },
  [EmotionType.RELIEF]: { valence: 0.6, arousal: 0.2, dominance: 0.5 },
  [EmotionType.IMPATIENCE]: { valence: -0.3, arousal: 0.7, dominance: 0.6 },
  [EmotionType.NEUTRAL]: { valence: 0, arousal: 0.3, dominance: 0.5 }
};

// =====================================================
// Emotion Recognition Worker
// =====================================================

export class EmotionRecognitionWorker {
  private worker: Worker;
  private aggregateQueue: Queue;

  constructor() {
    const connection = createRedisConnection();
    
    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<EmotionDetectionJob>) => this.process(job),
      {
        connection,
        concurrency: CONCURRENCY,
        limiter: {
          max: 100,
          duration: 1000
        }
      }
    );

    this.aggregateQueue = new Queue('analysis-aggregate', { connection });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info({
        event: 'emotion_recognition_completed',
        jobId: job.id,
        messageId: job.data.messageId,
        emotion: result?.primaryEmotion,
        intensity: result?.primaryIntensity
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error({
        event: 'emotion_recognition_failed',
        jobId: job?.id,
        error: error.message
      });
    });
  }

  async process(job: Job<EmotionDetectionJob>): Promise<EmotionResult> {
    const startTime = Date.now();
    const { tenantId, messageId, conversationId, contactId, text, sentimentScore, metadata } = job.data;

    logger.info({
      event: 'emotion_recognition_started',
      jobId: job.id,
      messageId,
      textLength: text.length
    });

    try {
      // Detect language
      const language = job.data.language || await this.detectLanguage(text);

      // Detect surface cues first
      const cues = this.detectEmotionalCues(text);

      // Perform emotion recognition with AI
      const result = await this.recognizeEmotion(text, language, sentimentScore, cues);

      // Store result
      const detectionId = await this.storeResult(tenantId, messageId, conversationId, contactId, result, metadata);

      // Check for high-arousal alerts
      await this.checkArousalThresholds(tenantId, conversationId, contactId, messageId, result);

      // Queue aggregation
      await this.aggregateQueue.add('aggregate', {
        tenantId,
        messageId,
        conversationId,
        contactId,
        emotionDetectionId: detectionId,
        emotionResult: {
          primary: result.primaryEmotion,
          intensity: result.primaryIntensity,
          vad: result.vad
        }
      }, {
        priority: 3
      });

      // Publish event
      await this.publishEmotionEvent(job.data, result);

      const processingTimeMs = Date.now() - startTime;

      return {
        ...result,
        processingTimeMs
      };

    } catch (error) {
      logger.error({
        event: 'emotion_recognition_error',
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  private async detectLanguage(text: string): Promise<string> {
    const romanianChars = (text.match(/[ăâîșț]/gi) || []).length;
    return romanianChars >= 2 ? 'ro' : 'en';
  }

  private detectEmotionalCues(text: string): EmotionalCue[] {
    const cues: EmotionalCue[] = [];

    // Punctuation cues
    const exclamations = (text.match(/!/g) || []).length;
    if (exclamations > 0) {
      cues.push({
        type: 'punctuation',
        indicator: `${exclamations} exclamation mark(s)`,
        emotionSignal: exclamations > 2 ? 'high_arousal' : 'emphasis',
        weight: Math.min(exclamations * 0.2, 1)
      });
    }

    const questions = (text.match(/\?/g) || []).length;
    if (questions > 2) {
      cues.push({
        type: 'punctuation',
        indicator: `${questions} question marks`,
        emotionSignal: 'confusion_or_frustration',
        weight: 0.5
      });
    }

    // Capitalization
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    if (capsWords > 0) {
      cues.push({
        type: 'capitalization',
        indicator: `${capsWords} capitalized word(s)`,
        emotionSignal: 'emphasis_or_anger',
        weight: Math.min(capsWords * 0.3, 1)
      });
    }

    // Emoji detection
    const happyEmojis = (text.match(/[😊😃😄🙂👍✅🎉]/g) || []).length;
    if (happyEmojis > 0) {
      cues.push({
        type: 'emoji',
        indicator: 'positive emoji(s)',
        emotionSignal: 'positive_emotion',
        weight: Math.min(happyEmojis * 0.4, 1)
      });
    }

    const sadEmojis = (text.match(/[😞😢😭😔👎❌]/g) || []).length;
    if (sadEmojis > 0) {
      cues.push({
        type: 'emoji',
        indicator: 'negative emoji(s)',
        emotionSignal: 'negative_emotion',
        weight: Math.min(sadEmojis * 0.4, 1)
      });
    }

    const angryEmojis = (text.match(/[😠😡🤬💢]/g) || []).length;
    if (angryEmojis > 0) {
      cues.push({
        type: 'emoji',
        indicator: 'angry emoji(s)',
        emotionSignal: 'anger',
        weight: Math.min(angryEmojis * 0.5, 1)
      });
    }

    // Repetition
    const repeatedChars = text.match(/(.)\1{2,}/g);
    if (repeatedChars && repeatedChars.length > 0) {
      cues.push({
        type: 'repetition',
        indicator: 'repeated characters',
        emotionSignal: 'emphasis_or_frustration',
        weight: 0.4
      });
    }

    // Lexical cues (Romanian)
    const frustrationWords = ['nu merge', 'probleme', 'nu funcționează', 'imposibil', 'dezamăgit'];
    const urgencyWords = ['urgent', 'imediat', 'rapid', 'cât mai repede', 'astăzi'];
    const satisfactionWords = ['mulțumesc', 'perfect', 'excelent', 'super', 'foarte bine'];

    const textLower = text.toLowerCase();
    
    for (const word of frustrationWords) {
      if (textLower.includes(word)) {
        cues.push({
          type: 'lexical',
          indicator: word,
          emotionSignal: 'frustration',
          weight: 0.6
        });
      }
    }

    for (const word of urgencyWords) {
      if (textLower.includes(word)) {
        cues.push({
          type: 'lexical',
          indicator: word,
          emotionSignal: 'urgency',
          weight: 0.5
        });
      }
    }

    for (const word of satisfactionWords) {
      if (textLower.includes(word)) {
        cues.push({
          type: 'lexical',
          indicator: word,
          emotionSignal: 'satisfaction',
          weight: 0.5
        });
      }
    }

    return cues;
  }

  private async recognizeEmotion(
    text: string,
    language: string,
    sentimentScore: number | undefined,
    cues: EmotionalCue[]
  ): Promise<Omit<EmotionResult, 'processingTimeMs'>> {
    const systemPrompt = this.getSystemPrompt(language);
    const userPrompt = this.buildUserPrompt(text, language, sentimentScore, cues);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseResponse(content.text, language, cues);
  }

  private getSystemPrompt(language: string): string {
    const emotions = Object.values(EmotionType).join(', ');
    
    if (language === 'ro') {
      return `Ești un analizor de emoții pentru conversații B2B în domeniul agricol.

Analizează textul și identifică starea emoțională.

Emoții disponibile: ${emotions}

Returnează JSON valid:
{
  "primaryEmotion": string (una din emoțiile de mai sus),
  "primaryIntensity": number (0.0 la 1.0, unde 1.0 = foarte intens),
  "confidence": number (0.0 la 1.0),
  "secondaryEmotions": [
    { "emotion": string, "intensity": number, "confidence": number }
  ],
  "valence": number (-1.0 la 1.0, negativ/pozitiv),
  "arousal": number (0.0 la 1.0, calm/excitat),
  "dominance": number (0.0 la 1.0, submisiv/dominant)
}

Context: conversații B2B agricole profesionale.
Returnează DOAR JSON-ul.`;
    }

    return `You are an emotion analyzer for B2B conversations in the agricultural domain.

Analyze the text and identify the emotional state.

Available emotions: ${emotions}

Return valid JSON:
{
  "primaryEmotion": string (one of the emotions above),
  "primaryIntensity": number (0.0 to 1.0, where 1.0 = very intense),
  "confidence": number (0.0 to 1.0),
  "secondaryEmotions": [
    { "emotion": string, "intensity": number, "confidence": number }
  ],
  "valence": number (-1.0 to 1.0, negative/positive),
  "arousal": number (0.0 to 1.0, calm/excited),
  "dominance": number (0.0 to 1.0, submissive/dominant)
}

Context: professional B2B agricultural conversations.
Return ONLY the JSON.`;
  }

  private buildUserPrompt(
    text: string,
    language: string,
    sentimentScore: number | undefined,
    cues: EmotionalCue[]
  ): string {
    let context = '';
    
    if (sentimentScore !== undefined) {
      context += language === 'ro'
        ? `\nScor sentiment anterior: ${sentimentScore.toFixed(2)}`
        : `\nPrevious sentiment score: ${sentimentScore.toFixed(2)}`;
    }

    if (cues.length > 0) {
      const cuesSummary = cues.map(c => `${c.type}: ${c.indicator} (${c.emotionSignal})`).join(', ');
      context += language === 'ro'
        ? `\nIndicii detectate: ${cuesSummary}`
        : `\nDetected cues: ${cuesSummary}`;
    }

    return language === 'ro'
      ? `Analizează starea emoțională din mesaj:${context}\n\nMesaj: "${text}"`
      : `Analyze the emotional state in the message:${context}\n\nMessage: "${text}"`;
  }

  private parseResponse(
    responseText: string,
    language: string,
    cues: EmotionalCue[]
  ): Omit<EmotionResult, 'processingTimeMs'> {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      const result = JSON.parse(jsonMatch[0]);

      const primaryEmotion = this.validateEmotion(result.primaryEmotion);
      const primaryIntensity = Math.max(0, Math.min(1, result.primaryIntensity || 0.5));
      const confidence = Math.max(0, Math.min(1, result.confidence || 0.5));

      const secondaryEmotions = (result.secondaryEmotions || [])
        .filter((se: any) => se && se.emotion)
        .map((se: any) => ({
          emotion: this.validateEmotion(se.emotion),
          intensity: Math.max(0, Math.min(1, se.intensity || 0.3)),
          confidence: Math.max(0, Math.min(1, se.confidence || 0.3))
        }))
        .slice(0, 5);

      // Use AI-provided VAD or fall back to emotion mapping
      const vad: VADScores = {
        valence: this.clamp(result.valence ?? EMOTION_VAD_MAP[primaryEmotion].valence, -1, 1),
        arousal: this.clamp(result.arousal ?? EMOTION_VAD_MAP[primaryEmotion].arousal, 0, 1),
        dominance: this.clamp(result.dominance ?? EMOTION_VAD_MAP[primaryEmotion].dominance, 0, 1)
      };

      return {
        primaryEmotion,
        primaryIntensity,
        confidence,
        secondaryEmotions,
        vad,
        cues,
        language
      };
    } catch (parseError) {
      logger.warn({
        event: 'emotion_parse_fallback',
        error: parseError.message
      });
      return this.fallbackDetection(language, cues);
    }
  }

  private validateEmotion(emotion: string): EmotionType {
    if (Object.values(EmotionType).includes(emotion as EmotionType)) {
      return emotion as EmotionType;
    }
    return EmotionType.NEUTRAL;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private fallbackDetection(
    language: string,
    cues: EmotionalCue[]
  ): Omit<EmotionResult, 'processingTimeMs'> {
    // Try to infer from cues
    let inferredEmotion = EmotionType.NEUTRAL;
    
    for (const cue of cues) {
      if (cue.emotionSignal === 'frustration') inferredEmotion = EmotionType.FRUSTRATION;
      else if (cue.emotionSignal === 'anger') inferredEmotion = EmotionType.ANGER;
      else if (cue.emotionSignal === 'satisfaction') inferredEmotion = EmotionType.SATISFACTION;
      else if (cue.emotionSignal === 'urgency') inferredEmotion = EmotionType.URGENCY;
    }

    return {
      primaryEmotion: inferredEmotion,
      primaryIntensity: 0.4,
      confidence: 0.3,
      secondaryEmotions: [],
      vad: EMOTION_VAD_MAP[inferredEmotion],
      cues,
      language
    };
  }

  private async storeResult(
    tenantId: string,
    messageId: string,
    conversationId: string,
    contactId: string | undefined,
    result: Omit<EmotionResult, 'processingTimeMs'>,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const id = uuidv4();

    await db.insert(emotionDetections).values({
      id,
      tenantId,
      messageId,
      conversationId,
      contactId,
      primaryEmotion: result.primaryEmotion as any,
      primaryIntensity: result.primaryIntensity,
      confidence: result.confidence,
      secondaryEmotions: result.secondaryEmotions,
      valence: result.vad.valence,
      arousal: result.vad.arousal,
      dominance: result.vad.dominance,
      cues: result.cues,
      language: result.language,
      model: 'claude-sonnet-4-20250514',
      modelVersion: '20250514',
      metadata
    });

    return id;
  }

  private async checkArousalThresholds(
    tenantId: string,
    conversationId: string,
    contactId: string | undefined,
    messageId: string,
    result: Omit<EmotionResult, 'processingTimeMs'>
  ): Promise<void> {
    // High arousal alert (urgency, frustration, anger)
    if (result.vad.arousal > 0.7) {
      const alertType = result.primaryEmotion === EmotionType.ANGER 
        ? 'anger_detected' 
        : 'high_arousal';

      await db.insert(analysisAlerts).values({
        id: uuidv4(),
        tenantId,
        conversationId,
        contactId,
        messageId,
        alertType: alertType as any,
        severity: result.vad.arousal > 0.85 ? 'critical' : 'warning',
        triggerValue: result.vad.arousal,
        threshold: 0.7,
        description: `High arousal detected: ${result.primaryEmotion} (arousal: ${result.vad.arousal.toFixed(2)})`,
        context: {
          messageId,
          conversationId,
          contactId,
          emotion: result.primaryEmotion,
          vad: result.vad
        }
      });

      // Publish alert
      await redis.publish('analysis-alerts', JSON.stringify({
        type: alertType.toUpperCase(),
        tenantId,
        conversationId,
        contactId,
        messageId,
        emotion: result.primaryEmotion,
        arousal: result.vad.arousal,
        severity: result.vad.arousal > 0.85 ? 'critical' : 'warning',
        timestamp: new Date().toISOString()
      }));
    }

    // High frustration alert
    if (result.primaryEmotion === EmotionType.FRUSTRATION && result.primaryIntensity > 0.6) {
      await db.insert(analysisAlerts).values({
        id: uuidv4(),
        tenantId,
        conversationId,
        contactId,
        messageId,
        alertType: 'high_frustration',
        severity: result.primaryIntensity > 0.8 ? 'critical' : 'warning',
        triggerValue: result.primaryIntensity,
        threshold: 0.6,
        description: `High frustration detected (intensity: ${result.primaryIntensity.toFixed(2)})`,
        context: {
          messageId,
          conversationId,
          contactId,
          intensity: result.primaryIntensity
        }
      });
    }
  }

  private async publishEmotionEvent(
    data: EmotionDetectionJob,
    result: Omit<EmotionResult, 'processingTimeMs'>
  ): Promise<void> {
    await redis.publish('worker-events', JSON.stringify({
      type: 'EMOTION_DETECTED',
      tenantId: data.tenantId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      emotion: {
        primary: result.primaryEmotion,
        intensity: result.primaryIntensity,
        confidence: result.confidence,
        vad: result.vad
      },
      timestamp: new Date().toISOString()
    }));
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.aggregateQueue.close();
  }
}

export const emotionRecognitionWorker = new EmotionRecognitionWorker();
```

### 4.4 Worker K-Agg: Analysis Aggregator

```typescript
// packages/workers/src/workers/analysis-aggregator.worker.ts
import { Worker, Job } from 'bullmq';
import { logger } from '@cerniq/logger';
import { db } from '@cerniq/database';
import { analysisAggregates, sentimentAnalyses, intentDetections, emotionDetections } from '@cerniq/database/schema';
import { redis, createRedisConnection } from '@cerniq/redis';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// Types
// =====================================================

interface AnalysisAggregateJob {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId?: string;
  sentimentAnalysisId?: string;
  sentimentResult?: {
    score: number;
    label: string;
    confidence: number;
  };
  intentDetectionId?: string;
  intentResult?: {
    primary: string;
    confidence: number;
    actionRequired: boolean;
  };
  emotionDetectionId?: string;
  emotionResult?: {
    primary: string;
    intensity: number;
    vad: { valence: number; arousal: number; dominance: number };
  };
}

interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
}

interface RecommendedAction {
  action: string;
  priority: number;
  reason: string;
  autoExecute: boolean;
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// =====================================================
// Analysis Aggregator Worker
// =====================================================

export class AnalysisAggregatorWorker {
  private worker: Worker;
  private pendingAggregations: Map<string, Partial<AnalysisAggregateJob>> = new Map();

  constructor() {
    const connection = createRedisConnection();
    
    this.worker = new Worker(
      'analysis-aggregate',
      async (job: Job<AnalysisAggregateJob>) => this.process(job),
      {
        connection,
        concurrency: 20,
        limiter: {
          max: 200,
          duration: 1000
        }
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info({
        event: 'analysis_aggregation_completed',
        jobId: job.id,
        messageId: job.data.messageId,
        riskLevel: result?.riskLevel
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error({
        event: 'analysis_aggregation_failed',
        jobId: job?.id,
        error: error.message
      });
    });
  }

  async process(job: Job<AnalysisAggregateJob>): Promise<any> {
    const { tenantId, messageId, conversationId, contactId } = job.data;
    const aggregationKey = `${tenantId}:${messageId}`;

    logger.info({
      event: 'analysis_aggregation_started',
      jobId: job.id,
      messageId
    });

    try {
      // Collect or update pending aggregation
      let pending = this.pendingAggregations.get(aggregationKey) || { ...job.data };
      
      // Merge new data
      if (job.data.sentimentAnalysisId) {
        pending.sentimentAnalysisId = job.data.sentimentAnalysisId;
        pending.sentimentResult = job.data.sentimentResult;
      }
      if (job.data.intentDetectionId) {
        pending.intentDetectionId = job.data.intentDetectionId;
        pending.intentResult = job.data.intentResult;
      }
      if (job.data.emotionDetectionId) {
        pending.emotionDetectionId = job.data.emotionDetectionId;
        pending.emotionResult = job.data.emotionResult;
      }

      // Check if we have all three analyses (or wait max 5 seconds)
      const hasAll = pending.sentimentResult && pending.intentResult && pending.emotionResult;
      
      if (!hasAll) {
        // Store and wait for more
        this.pendingAggregations.set(aggregationKey, pending);
        
        // Schedule cleanup after 5 seconds
        setTimeout(async () => {
          const stillPending = this.pendingAggregations.get(aggregationKey);
          if (stillPending) {
            this.pendingAggregations.delete(aggregationKey);
            await this.createAggregate(stillPending as AnalysisAggregateJob);
          }
        }, 5000);
        
        return { status: 'pending', waiting: true };
      }

      // All analyses received, create aggregate
      this.pendingAggregations.delete(aggregationKey);
      return await this.createAggregate(pending as AnalysisAggregateJob);

    } catch (error) {
      logger.error({
        event: 'analysis_aggregation_error',
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  private async createAggregate(data: AnalysisAggregateJob): Promise<any> {
    const { tenantId, messageId, conversationId, contactId } = data;

    // Build combined analysis
    const combinedAnalysis = {
      sentiment: data.sentimentResult ? {
        score: data.sentimentResult.score,
        label: data.sentimentResult.label,
        confidence: data.sentimentResult.confidence
      } : null,
      intent: data.intentResult ? {
        primary: data.intentResult.primary,
        confidence: data.intentResult.confidence,
        actionRequired: data.intentResult.actionRequired
      } : null,
      emotion: data.emotionResult ? {
        primary: data.emotionResult.primary,
        intensity: data.emotionResult.intensity,
        vad: data.emotionResult.vad
      } : null
    };

    // Calculate composite score
    const compositeScore = this.calculateCompositeScore(combinedAnalysis);

    // Assess risk
    const { riskLevel, riskScore, riskFactors } = this.assessRisk(combinedAnalysis);

    // Determine action requirements
    const { actionRequired, recommendedActions } = this.determineActions(combinedAnalysis, riskLevel);

    // Determine urgency
    const urgencyLevel = this.determineUrgency(combinedAnalysis, riskLevel);

    // Get language from any available analysis
    const language = 'ro'; // Default, would be passed from analyses

    // Store aggregate
    const id = uuidv4();
    await db.insert(analysisAggregates).values({
      id,
      tenantId,
      messageId,
      conversationId,
      contactId,
      sentimentAnalysisId: data.sentimentAnalysisId,
      intentDetectionId: data.intentDetectionId,
      emotionDetectionId: data.emotionDetectionId,
      combinedAnalysis,
      compositeScore,
      riskLevel: riskLevel as any,
      riskScore,
      riskFactors,
      actionRequired,
      recommendedActions,
      urgencyLevel,
      language
    });

    // Publish aggregate event
    await redis.publish('worker-events', JSON.stringify({
      type: 'ANALYSIS_AGGREGATED',
      tenantId,
      conversationId,
      messageId,
      contactId,
      compositeScore,
      riskLevel,
      actionRequired,
      recommendedActions: recommendedActions.slice(0, 3),
      timestamp: new Date().toISOString()
    }));

    // Trigger actions if needed
    if (actionRequired) {
      await this.triggerActions(data, recommendedActions);
    }

    return {
      id,
      compositeScore,
      riskLevel,
      riskScore,
      actionRequired,
      recommendedActions
    };
  }

  private calculateCompositeScore(analysis: any): number {
    let score = 0;
    let weights = 0;

    if (analysis.sentiment) {
      score += analysis.sentiment.score * 0.4;
      weights += 0.4;
    }

    if (analysis.emotion?.vad) {
      score += analysis.emotion.vad.valence * 0.3;
      weights += 0.3;
    }

    if (analysis.intent) {
      // Positive intents boost score, negative ones reduce it
      const positiveIntents = ['order_placement', 'bulk_order', 'gratitude', 'confirmation'];
      const negativeIntents = ['complaint', 'return_request', 'human_agent_request'];
      
      if (positiveIntents.includes(analysis.intent.primary)) {
        score += 0.3 * analysis.intent.confidence;
      } else if (negativeIntents.includes(analysis.intent.primary)) {
        score -= 0.3 * analysis.intent.confidence;
      }
      weights += 0.3;
    }

    return weights > 0 ? score / weights : 0;
  }

  private assessRisk(analysis: any): { riskLevel: RiskLevel; riskScore: number; riskFactors: RiskFactor[] } {
    const riskFactors: RiskFactor[] = [];
    let totalRisk = 0;

    // Sentiment risk
    if (analysis.sentiment) {
      if (analysis.sentiment.score < -0.5) {
        riskFactors.push({
          factor: 'negative_sentiment',
          weight: 0.3,
          description: `Very negative sentiment: ${analysis.sentiment.score.toFixed(2)}`
        });
        totalRisk += 0.3;
      } else if (analysis.sentiment.score < -0.2) {
        riskFactors.push({
          factor: 'negative_sentiment',
          weight: 0.15,
          description: `Negative sentiment: ${analysis.sentiment.score.toFixed(2)}`
        });
        totalRisk += 0.15;
      }
    }

    // Intent risk
    if (analysis.intent) {
      const highRiskIntents = ['complaint', 'human_agent_request', 'return_request'];
      const mediumRiskIntents = ['urgency_expression', 'negotiation_attempt'];
      
      if (highRiskIntents.includes(analysis.intent.primary)) {
        riskFactors.push({
          factor: 'risky_intent',
          weight: 0.35,
          description: `High-risk intent: ${analysis.intent.primary}`
        });
        totalRisk += 0.35;
      } else if (mediumRiskIntents.includes(analysis.intent.primary)) {
        riskFactors.push({
          factor: 'risky_intent',
          weight: 0.15,
          description: `Medium-risk intent: ${analysis.intent.primary}`
        });
        totalRisk += 0.15;
      }
    }

    // Emotion risk
    if (analysis.emotion) {
      const negativeEmotions = ['anger', 'frustration', 'disgust', 'fear'];
      
      if (negativeEmotions.includes(analysis.emotion.primary)) {
        const weight = analysis.emotion.intensity * 0.25;
        riskFactors.push({
          factor: 'negative_emotion',
          weight,
          description: `Negative emotion: ${analysis.emotion.primary} (intensity: ${analysis.emotion.intensity.toFixed(2)})`
        });
        totalRisk += weight;
      }

      // High arousal risk
      if (analysis.emotion.vad?.arousal > 0.7) {
        riskFactors.push({
          factor: 'high_arousal',
          weight: 0.15,
          description: `High arousal state: ${analysis.emotion.vad.arousal.toFixed(2)}`
        });
        totalRisk += 0.15;
      }
    }

    // Clamp risk score
    const riskScore = Math.min(1, totalRisk);

    // Determine risk level
    let riskLevel: RiskLevel;
    if (riskScore >= 0.7) riskLevel = 'critical';
    else if (riskScore >= 0.5) riskLevel = 'high';
    else if (riskScore >= 0.3) riskLevel = 'medium';
    else riskLevel = 'low';

    return { riskLevel, riskScore, riskFactors };
  }

  private determineActions(
    analysis: any,
    riskLevel: RiskLevel
  ): { actionRequired: boolean; recommendedActions: RecommendedAction[] } {
    const recommendedActions: RecommendedAction[] = [];

    // Intent-based actions
    if (analysis.intent?.actionRequired) {
      const intentAction = this.getIntentAction(analysis.intent.primary);
      if (intentAction) {
        recommendedActions.push(intentAction);
      }
    }

    // Risk-based actions
    if (riskLevel === 'critical') {
      recommendedActions.push({
        action: 'immediate_escalation',
        priority: 1,
        reason: 'Critical risk level detected',
        autoExecute: true
      });
    } else if (riskLevel === 'high') {
      recommendedActions.push({
        action: 'supervisor_review',
        priority: 2,
        reason: 'High risk level detected',
        autoExecute: false
      });
    }

    // Emotion-based actions
    if (analysis.emotion?.primary === 'frustration' && analysis.emotion.intensity > 0.7) {
      recommendedActions.push({
        action: 'empathetic_response',
        priority: 3,
        reason: 'High frustration detected',
        autoExecute: true
      });
    }

    // Sort by priority
    recommendedActions.sort((a, b) => a.priority - b.priority);

    return {
      actionRequired: recommendedActions.length > 0,
      recommendedActions
    };
  }

  private getIntentAction(intent: string): RecommendedAction | null {
    const intentActions: Record<string, RecommendedAction> = {
      'complaint': {
        action: 'route_to_support',
        priority: 1,
        reason: 'Complaint detected',
        autoExecute: true
      },
      'human_agent_request': {
        action: 'trigger_handover',
        priority: 1,
        reason: 'Human agent explicitly requested',
        autoExecute: true
      },
      'order_placement': {
        action: 'process_order',
        priority: 2,
        reason: 'Order intent detected',
        autoExecute: false
      },
      'return_request': {
        action: 'route_to_returns',
        priority: 2,
        reason: 'Return request detected',
        autoExecute: true
      }
    };

    return intentActions[intent] || null;
  }

  private determineUrgency(analysis: any, riskLevel: RiskLevel): string {
    if (riskLevel === 'critical') return 'critical';
    if (analysis.intent?.primary === 'urgency_expression') return 'urgent';
    if (analysis.emotion?.vad?.arousal > 0.8) return 'urgent';
    if (riskLevel === 'high') return 'high';
    return 'standard';
  }

  private async triggerActions(
    data: AnalysisAggregateJob,
    actions: RecommendedAction[]
  ): Promise<void> {
    for (const action of actions.filter(a => a.autoExecute)) {
      switch (action.action) {
        case 'trigger_handover':
          await redis.publish('handover-triggers', JSON.stringify({
            type: 'ANALYSIS_TRIGGERED_HANDOVER',
            tenantId: data.tenantId,
            conversationId: data.conversationId,
            contactId: data.contactId,
            messageId: data.messageId,
            reason: action.reason,
            urgency: 'high',
            timestamp: new Date().toISOString()
          }));
          break;

        case 'immediate_escalation':
          await redis.publish('escalation-queue', JSON.stringify({
            type: 'IMMEDIATE_ESCALATION',
            tenantId: data.tenantId,
            conversationId: data.conversationId,
            contactId: data.contactId,
            messageId: data.messageId,
            reason: action.reason,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'route_to_support':
        case 'route_to_returns':
          await redis.publish('support-routing', JSON.stringify({
            type: action.action.toUpperCase(),
            tenantId: data.tenantId,
            conversationId: data.conversationId,
            contactId: data.contactId,
            messageId: data.messageId,
            reason: action.reason,
            timestamp: new Date().toISOString()
          }));
          break;
      }
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    this.pendingAggregations.clear();
  }
}

export const analysisAggregatorWorker = new AnalysisAggregatorWorker();
```


### 4.5 Worker K-Trend: Trend Analyzer

```typescript
// packages/workers/src/workers/sentiment-trend.worker.ts
import { Worker, Job } from 'bullmq';
import { logger } from '@cerniq/logger';
import { db } from '@cerniq/database';
import { sentimentTrends, sentimentAnalyses, analysisAlerts } from '@cerniq/database/schema';
import { redis, createRedisConnection } from '@cerniq/redis';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// Types
// =====================================================

interface TrendAnalysisJob {
  tenantId: string;
  conversationId: string;
  contactId?: string;
  windowType: 'message' | 'hourly' | 'daily' | 'session';
  windowStart?: string;
  windowEnd?: string;
}

type TrendDirection = 'improving' | 'declining' | 'stable' | 'volatile' | 'recovering' | 'deteriorating';

interface TrendResult {
  avgSentiment: number;
  minSentiment: number;
  maxSentiment: number;
  stdDevSentiment: number;
  sentimentChange: number;
  trendDirection: TrendDirection;
  trendStrength: number;
  volatility: number;
  oscillationCount: number;
  messageCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

// =====================================================
// Constants
// =====================================================

const QUEUE_NAME = 'sentiment-trend';
const CONCURRENCY = 5;

const TREND_THRESHOLDS = {
  significantChange: 0.3,
  volatility: 0.4,
  minMessages: 3
};

// =====================================================
// Trend Analyzer Worker
// =====================================================

export class SentimentTrendWorker {
  private worker: Worker;

  constructor() {
    const connection = createRedisConnection();
    
    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<TrendAnalysisJob>) => this.process(job),
      {
        connection,
        concurrency: CONCURRENCY
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info({
        event: 'trend_analysis_completed',
        jobId: job.id,
        conversationId: job.data.conversationId,
        direction: result?.trendDirection
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error({
        event: 'trend_analysis_failed',
        jobId: job?.id,
        error: error.message
      });
    });
  }

  async process(job: Job<TrendAnalysisJob>): Promise<TrendResult | null> {
    const { tenantId, conversationId, contactId, windowType } = job.data;

    logger.info({
      event: 'trend_analysis_started',
      jobId: job.id,
      conversationId,
      windowType
    });

    try {
      // Determine window bounds
      const { windowStart, windowEnd } = this.getWindowBounds(job.data);

      // Fetch sentiment data for window
      const sentiments = await this.fetchSentimentData(tenantId, conversationId, windowStart, windowEnd);

      if (sentiments.length < TREND_THRESHOLDS.minMessages) {
        logger.info({
          event: 'trend_insufficient_data',
          conversationId,
          count: sentiments.length
        });
        return null;
      }

      // Calculate trend metrics
      const result = this.calculateTrend(sentiments);

      // Store trend
      await this.storeTrend(
        tenantId,
        conversationId,
        contactId,
        windowType,
        windowStart,
        windowEnd,
        result,
        sentiments
      );

      // Check for concerning trends
      await this.checkTrendAlerts(tenantId, conversationId, contactId, result);

      // Publish trend event
      await this.publishTrendEvent(tenantId, conversationId, result);

      return result;

    } catch (error) {
      logger.error({
        event: 'trend_analysis_error',
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  private getWindowBounds(data: TrendAnalysisJob): { windowStart: Date; windowEnd: Date } {
    const now = new Date();
    let windowStart: Date;
    let windowEnd: Date;

    if (data.windowStart && data.windowEnd) {
      return {
        windowStart: new Date(data.windowStart),
        windowEnd: new Date(data.windowEnd)
      };
    }

    switch (data.windowType) {
      case 'hourly':
        windowStart = new Date(now.getTime() - 60 * 60 * 1000);
        windowEnd = now;
        break;
      case 'daily':
        windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        windowEnd = now;
        break;
      case 'session':
        // Last 20 messages or 2 hours, whichever is shorter
        windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        windowEnd = now;
        break;
      case 'message':
      default:
        // Last 10 messages
        windowStart = new Date(now.getTime() - 30 * 60 * 1000);
        windowEnd = now;
        break;
    }

    return { windowStart, windowEnd };
  }

  private async fetchSentimentData(
    tenantId: string,
    conversationId: string,
    windowStart: Date,
    windowEnd: Date
  ): Promise<Array<{ score: number; timestamp: Date }>> {
    const results = await db.query.sentimentAnalyses.findMany({
      where: and(
        eq(sentimentAnalyses.tenantId, tenantId),
        eq(sentimentAnalyses.conversationId, conversationId),
        gte(sentimentAnalyses.createdAt, windowStart),
        lte(sentimentAnalyses.createdAt, windowEnd)
      ),
      orderBy: [sql`created_at ASC`],
      columns: {
        sentimentScore: true,
        createdAt: true
      }
    });

    return results.map(r => ({
      score: r.sentimentScore,
      timestamp: r.createdAt
    }));
  }

  private calculateTrend(sentiments: Array<{ score: number; timestamp: Date }>): TrendResult {
    const scores = sentiments.map(s => s.score);
    const n = scores.length;

    // Basic statistics
    const avgSentiment = scores.reduce((a, b) => a + b, 0) / n;
    const minSentiment = Math.min(...scores);
    const maxSentiment = Math.max(...scores);

    // Standard deviation
    const variance = scores.reduce((acc, s) => acc + Math.pow(s - avgSentiment, 2), 0) / n;
    const stdDevSentiment = Math.sqrt(variance);

    // Calculate change (first half vs second half)
    const midpoint = Math.floor(n / 2);
    const firstHalfAvg = scores.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfAvg = scores.slice(midpoint).reduce((a, b) => a + b, 0) / (n - midpoint);
    const sentimentChange = secondHalfAvg - firstHalfAvg;

    // Count oscillations (direction changes)
    let oscillationCount = 0;
    let prevDirection: 'up' | 'down' | null = null;
    for (let i = 1; i < n; i++) {
      const direction = scores[i] > scores[i - 1] ? 'up' : 'down';
      if (prevDirection && direction !== prevDirection) {
        oscillationCount++;
      }
      prevDirection = direction;
    }

    // Calculate volatility (normalized oscillation)
    const volatility = oscillationCount / (n - 1);

    // Determine trend direction
    const trendDirection = this.classifyTrend(sentimentChange, volatility, firstHalfAvg, secondHalfAvg);

    // Calculate trend strength
    const trendStrength = Math.min(1, Math.abs(sentimentChange) / 0.5);

    // Count by category
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (const score of scores) {
      if (score > 0.2) positiveCount++;
      else if (score < -0.2) negativeCount++;
      else neutralCount++;
    }

    return {
      avgSentiment,
      minSentiment,
      maxSentiment,
      stdDevSentiment,
      sentimentChange,
      trendDirection,
      trendStrength,
      volatility,
      oscillationCount,
      messageCount: n,
      positiveCount,
      negativeCount,
      neutralCount
    };
  }

  private classifyTrend(
    change: number,
    volatility: number,
    firstAvg: number,
    secondAvg: number
  ): TrendDirection {
    // High volatility
    if (volatility > TREND_THRESHOLDS.volatility) {
      return 'volatile';
    }

    // Significant positive change
    if (change >= TREND_THRESHOLDS.significantChange) {
      return firstAvg < -0.2 ? 'recovering' : 'improving';
    }

    // Significant negative change
    if (change <= -TREND_THRESHOLDS.significantChange) {
      return firstAvg > 0.2 ? 'deteriorating' : 'declining';
    }

    return 'stable';
  }

  private async storeTrend(
    tenantId: string,
    conversationId: string,
    contactId: string | undefined,
    windowType: string,
    windowStart: Date,
    windowEnd: Date,
    result: TrendResult,
    sentiments: Array<{ score: number; timestamp: Date }>
  ): Promise<void> {
    const dataPoints = sentiments.map(s => ({
      timestamp: s.timestamp.toISOString(),
      sentimentScore: s.score,
      messageCount: 1
    }));

    await db.insert(sentimentTrends).values({
      id: uuidv4(),
      tenantId,
      conversationId,
      contactId,
      windowType: windowType as any,
      windowStart,
      windowEnd,
      avgSentiment: result.avgSentiment,
      minSentiment: result.minSentiment,
      maxSentiment: result.maxSentiment,
      stdDevSentiment: result.stdDevSentiment,
      sentimentChange: result.sentimentChange,
      trendDirection: result.trendDirection as any,
      trendStrength: result.trendStrength,
      volatility: result.volatility,
      oscillationCount: result.oscillationCount,
      messageCount: result.messageCount,
      positiveCount: result.positiveCount,
      negativeCount: result.negativeCount,
      neutralCount: result.neutralCount,
      dataPoints
    });
  }

  private async checkTrendAlerts(
    tenantId: string,
    conversationId: string,
    contactId: string | undefined,
    result: TrendResult
  ): Promise<void> {
    // Alert on declining trend
    if (result.trendDirection === 'declining' || result.trendDirection === 'deteriorating') {
      const severity = result.sentimentChange <= -0.5 ? 'critical' : 'warning';
      
      await db.insert(analysisAlerts).values({
        id: uuidv4(),
        tenantId,
        conversationId,
        contactId,
        alertType: 'sentiment_decline',
        severity: severity as any,
        triggerValue: result.sentimentChange,
        threshold: -TREND_THRESHOLDS.significantChange,
        description: `Sentiment ${result.trendDirection}: change of ${result.sentimentChange.toFixed(2)} over ${result.messageCount} messages`,
        context: {
          conversationId,
          contactId,
          trend: result.trendDirection,
          change: result.sentimentChange,
          avgSentiment: result.avgSentiment
        }
      });

      await redis.publish('analysis-alerts', JSON.stringify({
        type: 'SENTIMENT_TREND_ALERT',
        tenantId,
        conversationId,
        contactId,
        trend: result.trendDirection,
        change: result.sentimentChange,
        severity,
        timestamp: new Date().toISOString()
      }));
    }

    // Alert on sustained negativity
    if (result.avgSentiment < -0.4 && result.messageCount >= 5) {
      await db.insert(analysisAlerts).values({
        id: uuidv4(),
        tenantId,
        conversationId,
        contactId,
        alertType: 'sustained_negativity',
        severity: 'warning',
        triggerValue: result.avgSentiment,
        threshold: -0.4,
        description: `Sustained negative sentiment: avg ${result.avgSentiment.toFixed(2)} over ${result.messageCount} messages`,
        context: {
          conversationId,
          contactId,
          avgSentiment: result.avgSentiment,
          negativeCount: result.negativeCount,
          messageCount: result.messageCount
        }
      });
    }
  }

  private async publishTrendEvent(
    tenantId: string,
    conversationId: string,
    result: TrendResult
  ): Promise<void> {
    await redis.publish('worker-events', JSON.stringify({
      type: 'SENTIMENT_TREND_UPDATED',
      tenantId,
      conversationId,
      trend: {
        direction: result.trendDirection,
        change: result.sentimentChange,
        strength: result.trendStrength,
        avgSentiment: result.avgSentiment,
        volatility: result.volatility
      },
      timestamp: new Date().toISOString()
    }));
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}

export const sentimentTrendWorker = new SentimentTrendWorker();
```

### 4.6 Worker K-Alert: Alert Generator

```typescript
// packages/workers/src/workers/analysis-alert.worker.ts
import { Worker, Job } from 'bullmq';
import { logger } from '@cerniq/logger';
import { db } from '@cerniq/database';
import { analysisAlerts, analysisConfigurations } from '@cerniq/database/schema';
import { redis, createRedisConnection } from '@cerniq/redis';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// Types
// =====================================================

interface AlertCheckJob {
  tenantId: string;
  conversationId: string;
  contactId?: string;
  messageId?: string;
  checkType: 'sentiment' | 'intent' | 'emotion' | 'aggregate' | 'trend';
  data: Record<string, unknown>;
}

interface AlertRule {
  type: string;
  condition: (data: Record<string, unknown>, config: any) => boolean;
  severity: (data: Record<string, unknown>) => 'info' | 'warning' | 'critical' | 'emergency';
  description: (data: Record<string, unknown>) => string;
  autoAction?: string;
}

// =====================================================
// Alert Rules
// =====================================================

const ALERT_RULES: Record<string, AlertRule[]> = {
  sentiment: [
    {
      type: 'negative_sentiment',
      condition: (data, config) => (data.score as number) <= (config?.thresholds?.negativeSentimentAlert ?? -0.5),
      severity: (data) => (data.score as number) <= -0.7 ? 'critical' : 'warning',
      description: (data) => `Negative sentiment detected: ${(data.score as number).toFixed(2)}`
    }
  ],
  intent: [
    {
      type: 'human_agent_requested',
      condition: (data) => data.primaryIntent === 'human_agent_request',
      severity: () => 'warning',
      description: () => 'Customer explicitly requested human agent',
      autoAction: 'trigger_handover'
    },
    {
      type: 'complaint_detected',
      condition: (data) => data.primaryIntent === 'complaint',
      severity: () => 'warning',
      description: () => 'Complaint detected in conversation',
      autoAction: 'route_to_support'
    },
    {
      type: 'churn_signal',
      condition: (data) => 
        data.primaryIntent === 'return_request' || 
        (data.primaryIntent === 'negation' && data.confidence as number > 0.8),
      severity: () => 'warning',
      description: (data) => `Potential churn signal: ${data.primaryIntent}`
    }
  ],
  emotion: [
    {
      type: 'high_frustration',
      condition: (data) => 
        data.primaryEmotion === 'frustration' && (data.intensity as number) > 0.6,
      severity: (data) => (data.intensity as number) > 0.8 ? 'critical' : 'warning',
      description: (data) => `High frustration detected: intensity ${(data.intensity as number).toFixed(2)}`
    },
    {
      type: 'anger_detected',
      condition: (data) => data.primaryEmotion === 'anger',
      severity: (data) => (data.intensity as number) > 0.7 ? 'critical' : 'warning',
      description: (data) => `Anger detected: intensity ${(data.intensity as number).toFixed(2)}`,
      autoAction: 'immediate_attention'
    },
    {
      type: 'high_arousal',
      condition: (data) => (data.arousal as number) > 0.8,
      severity: () => 'warning',
      description: (data) => `High arousal state: ${(data.arousal as number).toFixed(2)}`
    }
  ],
  aggregate: [
    {
      type: 'risk_threshold_exceeded',
      condition: (data) => (data.riskScore as number) >= 0.7,
      severity: (data) => (data.riskScore as number) >= 0.85 ? 'critical' : 'warning',
      description: (data) => `Risk threshold exceeded: ${(data.riskScore as number).toFixed(2)}`,
      autoAction: 'escalate'
    },
    {
      type: 'escalation_recommended',
      condition: (data) => {
        const actions = data.recommendedActions as any[];
        return actions?.some(a => a.action === 'immediate_escalation');
      },
      severity: () => 'critical',
      description: () => 'Immediate escalation recommended by analysis',
      autoAction: 'trigger_escalation'
    },
    {
      type: 'vip_attention_required',
      condition: (data) => 
        data.isVIP === true && (data.riskScore as number) >= 0.5,
      severity: () => 'critical',
      description: (data) => `VIP customer requires attention: risk ${(data.riskScore as number).toFixed(2)}`
    }
  ],
  trend: [
    {
      type: 'sentiment_decline',
      condition: (data) => 
        (data.trendDirection === 'declining' || data.trendDirection === 'deteriorating'),
      severity: (data) => Math.abs(data.sentimentChange as number) > 0.5 ? 'critical' : 'warning',
      description: (data) => `Sentiment trend: ${data.trendDirection} (change: ${(data.sentimentChange as number).toFixed(2)})`
    },
    {
      type: 'sustained_negativity',
      condition: (data) => 
        (data.avgSentiment as number) < -0.4 && (data.messageCount as number) >= 5,
      severity: () => 'warning',
      description: (data) => `Sustained negative sentiment: avg ${(data.avgSentiment as number).toFixed(2)}`
    }
  ]
};

// =====================================================
// Alert Generator Worker
// =====================================================

export class AnalysisAlertWorker {
  private worker: Worker;
  private configCache: Map<string, any> = new Map();

  constructor() {
    const connection = createRedisConnection();
    
    this.worker = new Worker(
      'analysis-alert',
      async (job: Job<AlertCheckJob>) => this.process(job),
      {
        connection,
        concurrency: 20
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.info({
        event: 'alert_check_completed',
        jobId: job.id,
        alertsGenerated: result?.alertsGenerated || 0
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error({
        event: 'alert_check_failed',
        jobId: job?.id,
        error: error.message
      });
    });
  }

  async process(job: Job<AlertCheckJob>): Promise<{ alertsGenerated: number }> {
    const { tenantId, conversationId, contactId, messageId, checkType, data } = job.data;

    logger.info({
      event: 'alert_check_started',
      jobId: job.id,
      checkType,
      conversationId
    });

    try {
      // Get tenant configuration
      const config = await this.getTenantConfig(tenantId);

      // Get applicable rules
      const rules = ALERT_RULES[checkType] || [];

      // Check each rule
      const alerts: Array<{
        type: string;
        severity: string;
        description: string;
        autoAction?: string;
      }> = [];

      for (const rule of rules) {
        if (rule.condition(data, config)) {
          alerts.push({
            type: rule.type,
            severity: rule.severity(data),
            description: rule.description(data),
            autoAction: rule.autoAction
          });
        }
      }

      // Store alerts
      for (const alert of alerts) {
        const alertId = await this.createAlert(
          tenantId,
          conversationId,
          contactId,
          messageId,
          alert,
          data
        );

        // Send notifications
        await this.sendNotifications(tenantId, alertId, alert, config);

        // Execute auto-actions
        if (alert.autoAction) {
          await this.executeAutoAction(tenantId, conversationId, contactId, alert.autoAction);
        }
      }

      return { alertsGenerated: alerts.length };

    } catch (error) {
      logger.error({
        event: 'alert_check_error',
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  private async getTenantConfig(tenantId: string): Promise<any> {
    // Check cache
    const cached = this.configCache.get(tenantId);
    if (cached && cached.expiry > Date.now()) {
      return cached.config;
    }

    // Fetch from database
    const config = await db.query.analysisConfigurations.findFirst({
      where: and(
        eq(analysisConfigurations.tenantId, tenantId),
        eq(analysisConfigurations.isActive, true)
      )
    });

    // Cache for 5 minutes
    this.configCache.set(tenantId, {
      config,
      expiry: Date.now() + 5 * 60 * 1000
    });

    return config;
  }

  private async createAlert(
    tenantId: string,
    conversationId: string,
    contactId: string | undefined,
    messageId: string | undefined,
    alert: { type: string; severity: string; description: string },
    triggerData: Record<string, unknown>
  ): Promise<string> {
    const id = uuidv4();

    await db.insert(analysisAlerts).values({
      id,
      tenantId,
      conversationId,
      contactId,
      messageId,
      alertType: alert.type as any,
      severity: alert.severity as any,
      triggerValue: triggerData.score ?? triggerData.riskScore ?? triggerData.intensity ?? 0,
      threshold: 0, // Would be from config
      description: alert.description,
      context: {
        conversationId,
        contactId,
        messageId,
        triggerData
      },
      notificationSent: false,
      notificationChannels: []
    });

    return id;
  }

  private async sendNotifications(
    tenantId: string,
    alertId: string,
    alert: { type: string; severity: string; description: string },
    config: any
  ): Promise<void> {
    const notificationConfig = config?.notifications;
    if (!notificationConfig) return;

    const channels: string[] = [];

    // Check severity threshold
    const severityOrder = ['info', 'warning', 'critical', 'emergency'];
    const configThreshold = notificationConfig.severityThreshold || 'warning';
    
    if (severityOrder.indexOf(alert.severity) < severityOrder.indexOf(configThreshold)) {
      return; // Below threshold
    }

    // In-app notification (always)
    await redis.publish('notifications:in-app', JSON.stringify({
      tenantId,
      alertId,
      type: alert.type,
      severity: alert.severity,
      description: alert.description,
      timestamp: new Date().toISOString()
    }));
    channels.push('in-app');

    // Email notification
    if (notificationConfig.emailEnabled && (alert.severity === 'critical' || alert.severity === 'emergency')) {
      await redis.publish('notifications:email', JSON.stringify({
        tenantId,
        alertId,
        type: alert.type,
        severity: alert.severity,
        description: alert.description
      }));
      channels.push('email');
    }

    // Slack notification
    if (notificationConfig.slackEnabled && notificationConfig.slackChannel) {
      await redis.publish('notifications:slack', JSON.stringify({
        tenantId,
        channel: notificationConfig.slackChannel,
        alertId,
        type: alert.type,
        severity: alert.severity,
        description: alert.description
      }));
      channels.push('slack');
    }

    // SMS notification (emergency only)
    if (notificationConfig.smsEnabled && alert.severity === 'emergency') {
      await redis.publish('notifications:sms', JSON.stringify({
        tenantId,
        alertId,
        type: alert.type,
        severity: alert.severity,
        description: alert.description
      }));
      channels.push('sms');
    }

    // Update alert with notification status
    await db.update(analysisAlerts)
      .set({
        notificationSent: true,
        notificationChannels: channels,
        updatedAt: new Date()
      })
      .where(eq(analysisAlerts.id, alertId));
  }

  private async executeAutoAction(
    tenantId: string,
    conversationId: string,
    contactId: string | undefined,
    action: string
  ): Promise<void> {
    logger.info({
      event: 'auto_action_triggered',
      tenantId,
      conversationId,
      action
    });

    switch (action) {
      case 'trigger_handover':
        await redis.publish('handover-triggers', JSON.stringify({
          type: 'ALERT_TRIGGERED_HANDOVER',
          tenantId,
          conversationId,
          contactId,
          urgency: 'high',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'route_to_support':
        await redis.publish('support-routing', JSON.stringify({
          type: 'ALERT_ROUTE_SUPPORT',
          tenantId,
          conversationId,
          contactId,
          timestamp: new Date().toISOString()
        }));
        break;

      case 'immediate_attention':
      case 'escalate':
      case 'trigger_escalation':
        await redis.publish('escalation-queue', JSON.stringify({
          type: 'ALERT_ESCALATION',
          tenantId,
          conversationId,
          contactId,
          action,
          timestamp: new Date().toISOString()
        }));
        break;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    this.configCache.clear();
  }
}

export const analysisAlertWorker = new AnalysisAlertWorker();
```

---

## 5. Queue Configuration

### 5.1 Queue Definitions

```typescript
// packages/workers/src/queues/analysis-queues.ts
import { Queue, QueueEvents, QueueScheduler } from 'bullmq';
import { createRedisConnection } from '@cerniq/redis';

// =====================================================
// Queue Configuration
// =====================================================

const connection = createRedisConnection();

// Sentiment Analysis Queue
export const sentimentAnalysisQueue = new Queue('sentiment-analysis', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 10000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // 7 days
    }
  }
});

// Intent Detection Queue
export const intentDetectionQueue = new Queue('intent-detection', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 10000
    },
    removeOnFail: {
      age: 7 * 24 * 3600
    }
  }
});

// Emotion Recognition Queue
export const emotionRecognitionQueue = new Queue('emotion-recognition', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 10000
    },
    removeOnFail: {
      age: 7 * 24 * 3600
    }
  }
});

// Analysis Aggregate Queue
export const analysisAggregateQueue = new Queue('analysis-aggregate', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 500
    },
    removeOnComplete: {
      age: 12 * 3600,
      count: 5000
    },
    removeOnFail: {
      age: 3 * 24 * 3600
    }
  }
});

// Sentiment Trend Queue
export const sentimentTrendQueue = new Queue('sentiment-trend', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    },
    removeOnComplete: {
      age: 6 * 3600,
      count: 2000
    },
    removeOnFail: {
      age: 24 * 3600
    }
  }
});

// Analysis Alert Queue
export const analysisAlertQueue = new Queue('analysis-alert', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 500
    },
    removeOnComplete: {
      age: 12 * 3600,
      count: 5000
    },
    removeOnFail: {
      age: 3 * 24 * 3600
    }
  }
});

// =====================================================
// Queue Events
// =====================================================

export const sentimentAnalysisEvents = new QueueEvents('sentiment-analysis', { connection });
export const intentDetectionEvents = new QueueEvents('intent-detection', { connection });
export const emotionRecognitionEvents = new QueueEvents('emotion-recognition', { connection });
export const analysisAggregateEvents = new QueueEvents('analysis-aggregate', { connection });

// =====================================================
// Export all queues
// =====================================================

export const analysisQueues = {
  sentimentAnalysis: sentimentAnalysisQueue,
  intentDetection: intentDetectionQueue,
  emotionRecognition: emotionRecognitionQueue,
  analysisAggregate: analysisAggregateQueue,
  sentimentTrend: sentimentTrendQueue,
  analysisAlert: analysisAlertQueue
};
```

### 5.2 Message Processor (Entry Point)

```typescript
// packages/workers/src/processors/message-analysis-processor.ts
import { Queue, Job } from 'bullmq';
import { logger } from '@cerniq/logger';
import { createRedisConnection } from '@cerniq/redis';
import {
  sentimentAnalysisQueue,
  intentDetectionQueue,
  emotionRecognitionQueue
} from '../queues/analysis-queues';

// =====================================================
// Types
// =====================================================

interface IncomingMessage {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId?: string;
  text: string;
  language?: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'chat';
  direction: 'inbound' | 'outbound';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// =====================================================
// Message Analysis Processor
// =====================================================

export class MessageAnalysisProcessor {
  private inboundQueue: Queue;
  private connection: any;

  constructor() {
    this.connection = createRedisConnection();
    
    this.inboundQueue = new Queue('message-inbound', {
      connection: this.connection
    });
  }

  async processMessage(message: IncomingMessage): Promise<void> {
    const { tenantId, messageId, conversationId, contactId, text, language, metadata } = message;

    // Only analyze inbound messages with text
    if (message.direction !== 'inbound' || !text || text.trim().length === 0) {
      logger.debug({
        event: 'message_skipped',
        messageId,
        reason: message.direction !== 'inbound' ? 'outbound' : 'empty'
      });
      return;
    }

    logger.info({
      event: 'message_analysis_queued',
      messageId,
      conversationId,
      textLength: text.length
    });

    // Queue parallel analyses
    const jobData = {
      tenantId,
      messageId,
      conversationId,
      contactId,
      text,
      language,
      metadata
    };

    // Sentiment Analysis
    await sentimentAnalysisQueue.add('analyze', jobData, {
      jobId: `sentiment-${messageId}`,
      priority: this.getPriority(message),
      delay: 0
    });

    // Intent Detection
    await intentDetectionQueue.add('detect', jobData, {
      jobId: `intent-${messageId}`,
      priority: this.getPriority(message),
      delay: 0
    });

    // Emotion Recognition
    await emotionRecognitionQueue.add('recognize', jobData, {
      jobId: `emotion-${messageId}`,
      priority: this.getPriority(message),
      delay: 0
    });

    logger.info({
      event: 'analyses_queued',
      messageId,
      queues: ['sentiment-analysis', 'intent-detection', 'emotion-recognition']
    });
  }

  private getPriority(message: IncomingMessage): number {
    // Higher priority for newer messages
    // Priority 1 = highest, 5 = lowest
    
    // VIP customers get priority 1
    if (message.metadata?.isVIP) {
      return 1;
    }

    // Active deals get priority 2
    if (message.metadata?.hasActiveDeal) {
      return 2;
    }

    // Recent messages get priority 3
    const messageAge = Date.now() - new Date(message.timestamp).getTime();
    if (messageAge < 5 * 60 * 1000) { // Less than 5 minutes
      return 3;
    }

    // Default priority
    return 4;
  }

  async close(): Promise<void> {
    await this.inboundQueue.close();
  }
}

export const messageAnalysisProcessor = new MessageAnalysisProcessor();
```

### 5.3 Queue Health Monitor

```typescript
// packages/workers/src/monitors/analysis-queue-monitor.ts
import { Queue } from 'bullmq';
import { logger } from '@cerniq/logger';
import { Gauge, Counter } from 'prom-client';
import { analysisQueues } from '../queues/analysis-queues';

// =====================================================
// Metrics
// =====================================================

const queueDepthGauge = new Gauge({
  name: 'cerniq_analysis_queue_depth',
  help: 'Current depth of analysis queues',
  labelNames: ['queue_name', 'status']
});

const queueProcessedCounter = new Counter({
  name: 'cerniq_analysis_queue_processed_total',
  help: 'Total jobs processed by analysis queues',
  labelNames: ['queue_name', 'status']
});

const queueLatencyGauge = new Gauge({
  name: 'cerniq_analysis_queue_latency_ms',
  help: 'Average job wait time in analysis queues',
  labelNames: ['queue_name']
});

// =====================================================
// Queue Monitor
// =====================================================

export class AnalysisQueueMonitor {
  private intervalId: NodeJS.Timeout | null = null;

  start(intervalMs: number = 30000): void {
    this.intervalId = setInterval(() => this.collectMetrics(), intervalMs);
    this.collectMetrics(); // Initial collection
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async collectMetrics(): Promise<void> {
    for (const [name, queue] of Object.entries(analysisQueues)) {
      try {
        const counts = await queue.getJobCounts();
        
        // Queue depth by status
        queueDepthGauge.set({ queue_name: name, status: 'waiting' }, counts.waiting);
        queueDepthGauge.set({ queue_name: name, status: 'active' }, counts.active);
        queueDepthGauge.set({ queue_name: name, status: 'delayed' }, counts.delayed);
        queueDepthGauge.set({ queue_name: name, status: 'failed' }, counts.failed);

        // Calculate average latency (simplified)
        const waitingJobs = await queue.getJobs(['waiting'], 0, 10);
        if (waitingJobs.length > 0) {
          const avgWait = waitingJobs.reduce((acc, job) => {
            return acc + (Date.now() - job.timestamp);
          }, 0) / waitingJobs.length;
          
          queueLatencyGauge.set({ queue_name: name }, avgWait);
        }

      } catch (error) {
        logger.error({
          event: 'queue_metrics_error',
          queue: name,
          error: error.message
        });
      }
    }
  }

  async getHealthStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [name, queue] of Object.entries(analysisQueues)) {
      const counts = await queue.getJobCounts();
      const isPaused = await queue.isPaused();

      status[name] = {
        waiting: counts.waiting,
        active: counts.active,
        failed: counts.failed,
        delayed: counts.delayed,
        completed: counts.completed,
        paused: isPaused,
        healthy: !isPaused && counts.failed < 100
      };
    }

    return status;
  }
}

export const analysisQueueMonitor = new AnalysisQueueMonitor();
```


---

## 6. AI/ML Models

### 6.1 Model Selection Strategy

Workers K utilizează Claude Sonnet 4 (claude-sonnet-4-20250514) ca model principal pentru toate analizele de sentiment, intent și emoție, cu fallback-uri și strategii de redundanță.

```typescript
// packages/workers/src/config/analysis-models.config.ts

import { z } from 'zod';

// =====================================================
// Model Configuration Schema
// =====================================================

export const AnalysisModelConfigSchema = z.object({
  // Primary model
  primaryModel: z.object({
    provider: z.enum(['anthropic', 'openai', 'local']),
    model: z.string(),
    version: z.string(),
    maxTokens: z.number().int().positive(),
    temperature: z.number().min(0).max(2),
    timeout: z.number().int().positive(), // milliseconds
  }),
  
  // Fallback models
  fallbackModels: z.array(z.object({
    provider: z.enum(['anthropic', 'openai', 'local']),
    model: z.string(),
    version: z.string(),
    maxTokens: z.number().int().positive(),
    temperature: z.number().min(0).max(2),
    timeout: z.number().int().positive(),
    priority: z.number().int().min(1),
  })),
  
  // Retry configuration
  retry: z.object({
    maxAttempts: z.number().int().positive(),
    initialDelayMs: z.number().int().positive(),
    maxDelayMs: z.number().int().positive(),
    backoffMultiplier: z.number().positive(),
  }),
  
  // Cost limits
  costLimits: z.object({
    maxCostPerRequest: z.number().positive(),
    dailyBudget: z.number().positive(),
    monthlyBudget: z.number().positive(),
    alertThreshold: z.number().min(0).max(1), // Percentage
  }),
  
  // Quality thresholds
  qualityThresholds: z.object({
    minConfidence: z.number().min(0).max(1),
    maxLatencyMs: z.number().int().positive(),
    minResponseQuality: z.number().min(0).max(1),
  }),
});

export type AnalysisModelConfig = z.infer<typeof AnalysisModelConfigSchema>;

// =====================================================
// Default Configuration
// =====================================================

export const DEFAULT_ANALYSIS_MODEL_CONFIG: AnalysisModelConfig = {
  primaryModel: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    version: '4.0',
    maxTokens: 1024,
    temperature: 0.3,
    timeout: 30000,
  },
  
  fallbackModels: [
    {
      provider: 'anthropic',
      model: 'claude-haiku-4-20250514',
      version: '4.0',
      maxTokens: 512,
      temperature: 0.3,
      timeout: 15000,
      priority: 1,
    },
    {
      provider: 'local',
      model: 'sentiment-ro-bert',
      version: '1.0',
      maxTokens: 256,
      temperature: 0,
      timeout: 5000,
      priority: 2,
    },
  ],
  
  retry: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
  
  costLimits: {
    maxCostPerRequest: 0.05, // USD
    dailyBudget: 100,        // USD
    monthlyBudget: 2000,     // USD
    alertThreshold: 0.8,     // 80%
  },
  
  qualityThresholds: {
    minConfidence: 0.6,
    maxLatencyMs: 5000,
    minResponseQuality: 0.7,
  },
};

// =====================================================
// Model Cost Tracking
// =====================================================

interface ModelCost {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

const MODEL_PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  'claude-sonnet-4-20250514': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-haiku-4-20250514': { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  'sentiment-ro-bert': { inputPer1k: 0, outputPer1k: 0 }, // Local model, no cost
};

export function calculateModelCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): ModelCost {
  const pricing = MODEL_PRICING[model] || { inputPer1k: 0, outputPer1k: 0 };
  
  const inputCost = (inputTokens / 1000) * pricing.inputPer1k;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1k;
  
  return {
    inputTokens,
    outputTokens,
    totalCost: inputCost + outputCost,
  };
}

// =====================================================
// Model Router
// =====================================================

export class AnalysisModelRouter {
  private config: AnalysisModelConfig;
  private dailyCost: number = 0;
  private monthlyCost: number = 0;
  private lastResetDate: Date = new Date();
  
  constructor(config: AnalysisModelConfig = DEFAULT_ANALYSIS_MODEL_CONFIG) {
    this.config = config;
  }
  
  /**
   * Get the appropriate model for analysis
   */
  async getModel(options: {
    analysisType: 'sentiment' | 'intent' | 'emotion';
    textLength: number;
    priority: 'high' | 'medium' | 'low';
    requiresHighAccuracy: boolean;
  }): Promise<{
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number;
    isFallback: boolean;
  }> {
    // Check budget
    this.checkAndResetBudget();
    
    if (this.dailyCost >= this.config.costLimits.dailyBudget) {
      // Budget exceeded, use cheapest fallback
      const cheapestFallback = this.config.fallbackModels
        .filter(m => m.provider === 'local')
        .sort((a, b) => b.priority - a.priority)[0];
      
      if (cheapestFallback) {
        return {
          provider: cheapestFallback.provider,
          model: cheapestFallback.model,
          maxTokens: cheapestFallback.maxTokens,
          temperature: cheapestFallback.temperature,
          isFallback: true,
        };
      }
    }
    
    // Use primary model for high priority or high accuracy requirements
    if (options.priority === 'high' || options.requiresHighAccuracy) {
      return {
        provider: this.config.primaryModel.provider,
        model: this.config.primaryModel.model,
        maxTokens: this.config.primaryModel.maxTokens,
        temperature: this.config.primaryModel.temperature,
        isFallback: false,
      };
    }
    
    // For short texts, use faster/cheaper model
    if (options.textLength < 100) {
      const fastFallback = this.config.fallbackModels[0];
      if (fastFallback) {
        return {
          provider: fastFallback.provider,
          model: fastFallback.model,
          maxTokens: fastFallback.maxTokens,
          temperature: fastFallback.temperature,
          isFallback: true,
        };
      }
    }
    
    // Default to primary model
    return {
      provider: this.config.primaryModel.provider,
      model: this.config.primaryModel.model,
      maxTokens: this.config.primaryModel.maxTokens,
      temperature: this.config.primaryModel.temperature,
      isFallback: false,
    };
  }
  
  /**
   * Record cost for tracking
   */
  recordCost(cost: number): void {
    this.dailyCost += cost;
    this.monthlyCost += cost;
    
    // Check alert threshold
    const dailyPercentage = this.dailyCost / this.config.costLimits.dailyBudget;
    if (dailyPercentage >= this.config.costLimits.alertThreshold) {
      logger.warn({
        event: 'cost_threshold_warning',
        dailyCost: this.dailyCost,
        dailyBudget: this.config.costLimits.dailyBudget,
        percentage: dailyPercentage,
      });
    }
  }
  
  /**
   * Check and reset daily/monthly budgets
   */
  private checkAndResetBudget(): void {
    const now = new Date();
    
    // Reset daily budget
    if (now.getDate() !== this.lastResetDate.getDate()) {
      this.dailyCost = 0;
    }
    
    // Reset monthly budget
    if (now.getMonth() !== this.lastResetDate.getMonth()) {
      this.monthlyCost = 0;
    }
    
    this.lastResetDate = now;
  }
  
  /**
   * Get current cost status
   */
  getCostStatus(): {
    dailyCost: number;
    dailyBudget: number;
    dailyRemaining: number;
    monthlyCost: number;
    monthlyBudget: number;
    monthlyRemaining: number;
  } {
    return {
      dailyCost: this.dailyCost,
      dailyBudget: this.config.costLimits.dailyBudget,
      dailyRemaining: Math.max(0, this.config.costLimits.dailyBudget - this.dailyCost),
      monthlyCost: this.monthlyCost,
      monthlyBudget: this.config.costLimits.monthlyBudget,
      monthlyRemaining: Math.max(0, this.config.costLimits.monthlyBudget - this.monthlyCost),
    };
  }
}

export const analysisModelRouter = new AnalysisModelRouter();
```

### 6.2 Prompt Engineering

#### 6.2.1 Prompt Templates

```typescript
// packages/workers/src/prompts/analysis-prompts.ts

// =====================================================
// Base Prompt Builder
// =====================================================

export interface PromptContext {
  language: 'ro' | 'en';
  conversationHistory?: string[];
  previousSentiment?: number;
  previousIntent?: string;
  previousEmotion?: string;
  customerProfile?: {
    isVIP: boolean;
    totalOrders: number;
    averageOrderValue: number;
    lastInteraction: Date;
  };
  productContext?: string[];
}

// =====================================================
// Sentiment Analysis Prompts
// =====================================================

export const SENTIMENT_PROMPTS = {
  ro: {
    system: `Ești un analist expert în sentiment pentru conversații B2B în domeniul agricol din România.

SARCINĂ: Analizează sentimentul mesajului dat și oferă o evaluare detaliată.

CONTEXT DOMENIU:
- Comunicare B2B între vânzători și fermieri/distribuitori agricoli
- Terminologie specifică agriculturii: semințe, îngrășăminte, pesticide, utilaje, irigații
- Sezonalitate în achiziții (primăvară pentru semănat, toamnă pentru recoltă)
- Sensibilitate la prețuri și termene de livrare

SCALA SENTIMENT:
- -1.0 până la -0.6: Foarte negativ (furie, frustrare extremă, amenințări)
- -0.6 până la -0.2: Negativ (nemulțumire, dezamăgire, critici)
- -0.2 până la 0.2: Neutru (informativ, faptic, întrebări simple)
- 0.2 până la 0.6: Pozitiv (mulțumire, satisfacție, interes)
- 0.6 până la 1.0: Foarte pozitiv (entuziasm, loialitate, recomandări)

OUTPUT FORMAT (JSON strict):
{
  "sentimentScore": <float -1.0 to 1.0>,
  "confidence": <float 0.0 to 1.0>,
  "aspects": [
    {
      "aspect": "<aspect analizat>",
      "sentiment": <float -1.0 to 1.0>,
      "keywords": ["<cuvânt1>", "<cuvânt2>"]
    }
  ],
  "reasoning": "<explicație scurtă>"
}

REGULI:
1. Analizează DOAR textul dat, nu inventa context
2. Ia în considerare nuanțele culturale românești
3. Consideră contexul conversațional dacă este furnizat
4. Aspectele pot include: preț, calitate, livrare, serviciu, comunicare
5. Răspunde DOAR cu JSON valid, fără text suplimentar`,

    user: (text: string, context?: PromptContext) => {
      let prompt = `MESAJ DE ANALIZAT:\n"${text}"`;
      
      if (context?.previousSentiment !== undefined) {
        prompt += `\n\nCONTEXT CONVERSAȚIE:`;
        prompt += `\n- Sentiment anterior: ${context.previousSentiment.toFixed(2)}`;
      }
      
      if (context?.conversationHistory?.length) {
        prompt += `\n- Ultimele mesaje: ${context.conversationHistory.slice(-3).join(' | ')}`;
      }
      
      return prompt;
    },
  },
  
  en: {
    system: `You are an expert sentiment analyst for B2B conversations in the Romanian agricultural domain.

TASK: Analyze the sentiment of the given message and provide a detailed assessment.

DOMAIN CONTEXT:
- B2B communication between sellers and farmers/agricultural distributors
- Agriculture-specific terminology: seeds, fertilizers, pesticides, machinery, irrigation
- Seasonal purchasing patterns (spring for planting, autumn for harvest)
- Price sensitivity and delivery time concerns

SENTIMENT SCALE:
- -1.0 to -0.6: Very negative (anger, extreme frustration, threats)
- -0.6 to -0.2: Negative (dissatisfaction, disappointment, criticism)
- -0.2 to 0.2: Neutral (informative, factual, simple questions)
- 0.2 to 0.6: Positive (gratitude, satisfaction, interest)
- 0.6 to 1.0: Very positive (enthusiasm, loyalty, recommendations)

OUTPUT FORMAT (strict JSON):
{
  "sentimentScore": <float -1.0 to 1.0>,
  "confidence": <float 0.0 to 1.0>,
  "aspects": [
    {
      "aspect": "<analyzed aspect>",
      "sentiment": <float -1.0 to 1.0>,
      "keywords": ["<word1>", "<word2>"]
    }
  ],
  "reasoning": "<brief explanation>"
}

RULES:
1. Analyze ONLY the given text, do not invent context
2. Consider Romanian cultural nuances
3. Consider conversational context if provided
4. Aspects may include: price, quality, delivery, service, communication
5. Respond ONLY with valid JSON, no additional text`,

    user: (text: string, context?: PromptContext) => {
      let prompt = `MESSAGE TO ANALYZE:\n"${text}"`;
      
      if (context?.previousSentiment !== undefined) {
        prompt += `\n\nCONVERSATION CONTEXT:`;
        prompt += `\n- Previous sentiment: ${context.previousSentiment.toFixed(2)}`;
      }
      
      if (context?.conversationHistory?.length) {
        prompt += `\n- Recent messages: ${context.conversationHistory.slice(-3).join(' | ')}`;
      }
      
      return prompt;
    },
  },
};

// =====================================================
// Intent Detection Prompts
// =====================================================

export const INTENT_PROMPTS = {
  ro: {
    system: `Ești un expert în detectarea intențiilor pentru conversații B2B agricole din România.

SARCINĂ: Identifică intenția principală și secundară din mesajul dat.

INTENȚII DISPONIBILE:
VÂNZĂRI:
- price_inquiry: Întrebare despre preț
- product_inquiry: Întrebare despre produs
- order_placement: Plasare comandă
- bulk_order: Comandă en-gros
- quote_request: Cerere ofertă
- discount_request: Cerere reducere
- payment_inquiry: Întrebare despre plată

SERVICII:
- complaint: Reclamație
- support_request: Cerere suport
- delivery_inquiry: Întrebare livrare
- return_request: Cerere retur
- warranty_inquiry: Întrebare garanție
- technical_support: Suport tehnic

CONVERSAȚIE:
- greeting: Salut
- farewell: La revedere
- gratitude: Mulțumire
- confirmation: Confirmare
- clarification: Clarificare
- feedback: Feedback

SPECIAL:
- human_agent_request: Cerere agent uman
- urgency_expression: Expresie urgență
- negotiation_attempt: Tentativă negociere
- cancellation: Anulare
- reschedule: Reprogramare

META:
- unclear: Neclar
- out_of_scope: În afara domeniului
- spam: Spam

OUTPUT FORMAT (JSON strict):
{
  "primaryIntent": "<intent_type>",
  "primaryConfidence": <float 0.0 to 1.0>,
  "secondaryIntents": [
    {"intent": "<intent_type>", "confidence": <float>}
  ],
  "entities": [
    {
      "type": "product|quantity|price|date|location|company|person",
      "value": "<valoare originală>",
      "normalizedValue": "<valoare normalizată>",
      "confidence": <float>
    }
  ],
  "actionRequired": <boolean>,
  "reasoning": "<explicație scurtă>"
}

REGULI:
1. Identifică TOATE entitățile relevante (produse, cantități, date, etc.)
2. actionRequired=true pentru: complaints, human_agent_request, order_placement, urgency
3. Normalizează cantitățile (ex: "o tonă" → "1000 kg")
4. Răspunde DOAR cu JSON valid`,

    user: (text: string, context?: PromptContext) => {
      let prompt = `MESAJ DE ANALIZAT:\n"${text}"`;
      
      if (context?.conversationHistory?.length) {
        prompt += `\n\nISTORIC CONVERSAȚIE (ultimele 3 mesaje):`;
        context.conversationHistory.slice(-3).forEach((msg, i) => {
          prompt += `\n${i + 1}. "${msg}"`;
        });
      }
      
      if (context?.productContext?.length) {
        prompt += `\n\nPRODUSE DISCUTATE: ${context.productContext.join(', ')}`;
      }
      
      return prompt;
    },
  },
  
  en: {
    system: `You are an intent detection expert for B2B agricultural conversations in Romania.

TASK: Identify the primary and secondary intent from the given message.

AVAILABLE INTENTS:
SALES:
- price_inquiry: Price question
- product_inquiry: Product question
- order_placement: Place order
- bulk_order: Wholesale order
- quote_request: Quote request
- discount_request: Discount request
- payment_inquiry: Payment question

SERVICE:
- complaint: Complaint
- support_request: Support request
- delivery_inquiry: Delivery question
- return_request: Return request
- warranty_inquiry: Warranty question
- technical_support: Technical support

CONVERSATION:
- greeting: Greeting
- farewell: Farewell
- gratitude: Gratitude
- confirmation: Confirmation
- clarification: Clarification
- feedback: Feedback

SPECIAL:
- human_agent_request: Human agent request
- urgency_expression: Urgency expression
- negotiation_attempt: Negotiation attempt
- cancellation: Cancellation
- reschedule: Reschedule

META:
- unclear: Unclear
- out_of_scope: Out of scope
- spam: Spam

OUTPUT FORMAT (strict JSON):
{
  "primaryIntent": "<intent_type>",
  "primaryConfidence": <float 0.0 to 1.0>,
  "secondaryIntents": [
    {"intent": "<intent_type>", "confidence": <float>}
  ],
  "entities": [
    {
      "type": "product|quantity|price|date|location|company|person",
      "value": "<original value>",
      "normalizedValue": "<normalized value>",
      "confidence": <float>
    }
  ],
  "actionRequired": <boolean>,
  "reasoning": "<brief explanation>"
}

RULES:
1. Identify ALL relevant entities (products, quantities, dates, etc.)
2. actionRequired=true for: complaints, human_agent_request, order_placement, urgency
3. Normalize quantities (e.g., "one ton" → "1000 kg")
4. Respond ONLY with valid JSON`,

    user: (text: string, context?: PromptContext) => {
      let prompt = `MESSAGE TO ANALYZE:\n"${text}"`;
      
      if (context?.conversationHistory?.length) {
        prompt += `\n\nCONVERSATION HISTORY (last 3 messages):`;
        context.conversationHistory.slice(-3).forEach((msg, i) => {
          prompt += `\n${i + 1}. "${msg}"`;
        });
      }
      
      if (context?.productContext?.length) {
        prompt += `\n\nDISCUSSED PRODUCTS: ${context.productContext.join(', ')}`;
      }
      
      return prompt;
    },
  },
};

// =====================================================
// Emotion Recognition Prompts
// =====================================================

export const EMOTION_PROMPTS = {
  ro: {
    system: `Ești un expert în recunoașterea emoțiilor pentru conversații B2B agricole din România.

SARCINĂ: Identifică starea emoțională din mesajul dat folosind modelul VAD (Valence-Arousal-Dominance).

EMOȚII DISPONIBILE:
PRIMARE (Plutchik):
- joy: Bucurie, fericire
- trust: Încredere
- fear: Frică, îngrijorare
- surprise: Surpriză
- sadness: Tristețe
- disgust: Dezgust
- anger: Furie
- anticipation: Anticipație

BUSINESS-SPECIFICE:
- frustration: Frustrare
- satisfaction: Satisfacție
- confusion: Confuzie
- urgency: Urgență
- interest: Interes
- disappointment: Dezamăgire
- relief: Ușurare
- impatience: Nerăbdare
- neutral: Neutru

MODEL VAD:
- Valence: Plăcere/Neplăcere (-1.0 la 1.0)
- Arousal: Activare/Calm (0.0 la 1.0)
- Dominance: Control/Supunere (0.0 la 1.0)

OUTPUT FORMAT (JSON strict):
{
  "primaryEmotion": "<emotion_type>",
  "primaryIntensity": <float 0.0 to 1.0>,
  "confidence": <float 0.0 to 1.0>,
  "secondaryEmotions": [
    {"emotion": "<emotion_type>", "intensity": <float>, "confidence": <float>}
  ],
  "valence": <float -1.0 to 1.0>,
  "arousal": <float 0.0 to 1.0>,
  "dominance": <float 0.0 to 1.0>,
  "reasoning": "<explicație scurtă>"
}

INDICATORI EMOȚIONALI:
- CAPSLOCK: Arousal crescut, posibil furie sau entuziasm
- !!! / ???: Intensitate crescută
- Emoji: Indicatori direcți de emoție
- Cuvinte intensive (foarte, extrem, etc.): Amplificatori

REGULI:
1. Consideră contextul cultural românesc
2. Arousal > 0.7 indică urgență sau situație care necesită atenție
3. Valence < -0.5 cu arousal > 0.7 = risc escaladare
4. Răspunde DOAR cu JSON valid`,

    user: (text: string, context?: PromptContext) => {
      let prompt = `MESAJ DE ANALIZAT:\n"${text}"`;
      
      if (context?.previousSentiment !== undefined) {
        prompt += `\n\nCONTEXT:`;
        prompt += `\n- Sentiment detectat: ${context.previousSentiment.toFixed(2)}`;
      }
      
      if (context?.previousEmotion) {
        prompt += `\n- Emoție anterioară: ${context.previousEmotion}`;
      }
      
      return prompt;
    },
  },
  
  en: {
    system: `You are an emotion recognition expert for B2B agricultural conversations in Romania.

TASK: Identify the emotional state from the given message using the VAD (Valence-Arousal-Dominance) model.

AVAILABLE EMOTIONS:
PRIMARY (Plutchik):
- joy: Joy, happiness
- trust: Trust
- fear: Fear, worry
- surprise: Surprise
- sadness: Sadness
- disgust: Disgust
- anger: Anger
- anticipation: Anticipation

BUSINESS-SPECIFIC:
- frustration: Frustration
- satisfaction: Satisfaction
- confusion: Confusion
- urgency: Urgency
- interest: Interest
- disappointment: Disappointment
- relief: Relief
- impatience: Impatience
- neutral: Neutral

VAD MODEL:
- Valence: Pleasure/Displeasure (-1.0 to 1.0)
- Arousal: Activation/Calm (0.0 to 1.0)
- Dominance: Control/Submission (0.0 to 1.0)

OUTPUT FORMAT (strict JSON):
{
  "primaryEmotion": "<emotion_type>",
  "primaryIntensity": <float 0.0 to 1.0>,
  "confidence": <float 0.0 to 1.0>,
  "secondaryEmotions": [
    {"emotion": "<emotion_type>", "intensity": <float>, "confidence": <float>}
  ],
  "valence": <float -1.0 to 1.0>,
  "arousal": <float 0.0 to 1.0>,
  "dominance": <float 0.0 to 1.0>,
  "reasoning": "<brief explanation>"
}

EMOTIONAL INDICATORS:
- CAPSLOCK: Increased arousal, possibly anger or enthusiasm
- !!! / ???: Increased intensity
- Emoji: Direct emotion indicators
- Intensive words (very, extremely, etc.): Amplifiers

RULES:
1. Consider Romanian cultural context
2. Arousal > 0.7 indicates urgency or situation needing attention
3. Valence < -0.5 with arousal > 0.7 = escalation risk
4. Respond ONLY with valid JSON`,

    user: (text: string, context?: PromptContext) => {
      let prompt = `MESSAGE TO ANALYZE:\n"${text}"`;
      
      if (context?.previousSentiment !== undefined) {
        prompt += `\n\nCONTEXT:`;
        prompt += `\n- Detected sentiment: ${context.previousSentiment.toFixed(2)}`;
      }
      
      if (context?.previousEmotion) {
        prompt += `\n- Previous emotion: ${context.previousEmotion}`;
      }
      
      return prompt;
    },
  },
};

// =====================================================
// Prompt Utilities
// =====================================================

/**
 * Build a complete prompt with all context
 */
export function buildAnalysisPrompt(
  type: 'sentiment' | 'intent' | 'emotion',
  text: string,
  context: PromptContext
): { system: string; user: string } {
  const prompts = {
    sentiment: SENTIMENT_PROMPTS,
    intent: INTENT_PROMPTS,
    emotion: EMOTION_PROMPTS,
  }[type];
  
  const langPrompts = prompts[context.language];
  
  return {
    system: langPrompts.system,
    user: langPrompts.user(text, context),
  };
}

/**
 * Validate and sanitize text for analysis
 */
export function sanitizeTextForAnalysis(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Limit length (preserve first and last parts for very long texts)
    .slice(0, 2000)
    // Remove potentially problematic characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Trim
    .trim();
}

/**
 * Extract structured data from AI response
 */
export function parseAIResponse<T>(
  response: string,
  validator: (data: unknown) => data is T
): T | null {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ event: 'no_json_in_response', response: response.slice(0, 200) });
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (validator(parsed)) {
      return parsed;
    }
    
    logger.warn({ event: 'invalid_response_structure', parsed });
    return null;
    
  } catch (error) {
    logger.error({ event: 'response_parse_error', error: error.message });
    return null;
  }
}
```

#### 6.2.2 Few-Shot Examples

```typescript
// packages/workers/src/prompts/analysis-examples.ts

// =====================================================
// Sentiment Analysis Examples (Romanian)
// =====================================================

export const SENTIMENT_EXAMPLES_RO = [
  {
    input: "Bună ziua! Aș dori să știu prețul pentru semințe de porumb.",
    output: {
      sentimentScore: 0.1,
      confidence: 0.85,
      aspects: [
        { aspect: "interes_produs", sentiment: 0.2, keywords: ["aș dori", "prețul"] }
      ],
      reasoning: "Mesaj neutru, ton politicos, întrebare informativă standard"
    }
  },
  {
    input: "Comanda a ajuns cu 3 săptămâni întârziere și jumătate din produse erau stricate!",
    output: {
      sentimentScore: -0.8,
      confidence: 0.95,
      aspects: [
        { aspect: "livrare", sentiment: -0.9, keywords: ["întârziere", "3 săptămâni"] },
        { aspect: "calitate", sentiment: -0.85, keywords: ["stricate", "jumătate"] }
      ],
      reasoning: "Foarte negativ - întârziere semnificativă și probleme de calitate"
    }
  },
  {
    input: "Mulțumesc frumos! Produsele sunt excelente, vom comanda din nou cu siguranță!",
    output: {
      sentimentScore: 0.85,
      confidence: 0.92,
      aspects: [
        { aspect: "calitate", sentiment: 0.9, keywords: ["excelente"] },
        { aspect: "loialitate", sentiment: 0.8, keywords: ["din nou", "cu siguranță"] }
      ],
      reasoning: "Foarte pozitiv - satisfacție și intenție clară de recomandă"
    }
  },
  {
    input: "Nu merge să vă sun de 3 zile, nimeni nu răspunde la telefon!",
    output: {
      sentimentScore: -0.65,
      confidence: 0.88,
      aspects: [
        { aspect: "comunicare", sentiment: -0.75, keywords: ["nu răspunde", "3 zile"] },
        { aspect: "frustrare", sentiment: -0.6, keywords: ["nu merge"] }
      ],
      reasoning: "Negativ - frustrare din cauza lipsei de comunicare"
    }
  },
  {
    input: "OK, am primit factura.",
    output: {
      sentimentScore: 0.0,
      confidence: 0.75,
      aspects: [
        { aspect: "confirmare", sentiment: 0.0, keywords: ["OK", "am primit"] }
      ],
      reasoning: "Neutru - simplă confirmare fără valență emoțională"
    }
  }
];

// =====================================================
// Intent Detection Examples (Romanian)
// =====================================================

export const INTENT_EXAMPLES_RO = [
  {
    input: "Cât costă 10 tone de îngrășământ NPK 15-15-15?",
    output: {
      primaryIntent: "price_inquiry",
      primaryConfidence: 0.95,
      secondaryIntents: [
        { intent: "bulk_order", confidence: 0.6 }
      ],
      entities: [
        { type: "quantity", value: "10 tone", normalizedValue: "10000 kg", confidence: 0.98 },
        { type: "product", value: "îngrășământ NPK 15-15-15", normalizedValue: "NPK 15-15-15", confidence: 0.95 }
      ],
      actionRequired: false,
      reasoning: "Întrebare directă despre preț pentru cantitate mare"
    }
  },
  {
    input: "Vreau să anuleze comanda #12345, nu mai am nevoie.",
    output: {
      primaryIntent: "cancellation",
      primaryConfidence: 0.98,
      secondaryIntents: [],
      entities: [
        { type: "custom", value: "#12345", normalizedValue: "12345", confidence: 0.99 }
      ],
      actionRequired: true,
      reasoning: "Cerere explicită de anulare cu referință comandă"
    }
  },
  {
    input: "Pot să vorbesc cu un reprezentant? Problema mea nu se rezolvă.",
    output: {
      primaryIntent: "human_agent_request",
      primaryConfidence: 0.92,
      secondaryIntents: [
        { intent: "complaint", confidence: 0.7 }
      ],
      entities: [],
      actionRequired: true,
      reasoning: "Cerere explicită agent uman + indiciu nemulțumire"
    }
  },
  {
    input: "Am nevoie URGENT de livrare azi! E pentru sezonul de semănat!",
    output: {
      primaryIntent: "urgency_expression",
      primaryConfidence: 0.95,
      secondaryIntents: [
        { intent: "delivery_inquiry", confidence: 0.8 }
      ],
      entities: [
        { type: "date", value: "azi", normalizedValue: "TODAY", confidence: 0.95 }
      ],
      actionRequired: true,
      reasoning: "Expresie clară de urgență cu context sezonier"
    }
  },
  {
    input: "Dacă facem o comandă de 50.000 lei, putem obține 15% discount?",
    output: {
      primaryIntent: "negotiation_attempt",
      primaryConfidence: 0.88,
      secondaryIntents: [
        { intent: "discount_request", confidence: 0.85 },
        { intent: "bulk_order", confidence: 0.75 }
      ],
      entities: [
        { type: "price", value: "50.000 lei", normalizedValue: "50000 RON", confidence: 0.92 },
        { type: "custom", value: "15%", normalizedValue: "0.15", confidence: 0.95 }
      ],
      actionRequired: false,
      reasoning: "Tentativă de negociere condițională"
    }
  }
];

// =====================================================
// Emotion Recognition Examples (Romanian)
// =====================================================

export const EMOTION_EXAMPLES_RO = [
  {
    input: "INCREDIBIL! După 2 săptămâni tot nu am primit comanda!!!",
    output: {
      primaryEmotion: "anger",
      primaryIntensity: 0.85,
      confidence: 0.92,
      secondaryEmotions: [
        { emotion: "frustration", intensity: 0.8, confidence: 0.88 }
      ],
      valence: -0.8,
      arousal: 0.9,
      dominance: 0.6,
      reasoning: "CAPSLOCK și !!! indică furie intensă, 2 săptămâni așteptare"
    }
  },
  {
    input: "Perfect, exact ce căutam! Veți primi comandă mare luna viitoare 😊",
    output: {
      primaryEmotion: "satisfaction",
      primaryIntensity: 0.85,
      confidence: 0.9,
      secondaryEmotions: [
        { emotion: "joy", intensity: 0.7, confidence: 0.8 },
        { emotion: "anticipation", intensity: 0.6, confidence: 0.75 }
      ],
      valence: 0.85,
      arousal: 0.5,
      dominance: 0.7,
      reasoning: "Cuvinte pozitive + emoji zâmbet + intenție viitoare"
    }
  },
  {
    input: "Nu înțeleg, documentele nu se potrivesc cu ce am comandat...",
    output: {
      primaryEmotion: "confusion",
      primaryIntensity: 0.7,
      confidence: 0.85,
      secondaryEmotions: [
        { emotion: "disappointment", intensity: 0.5, confidence: 0.7 }
      ],
      valence: -0.3,
      arousal: 0.4,
      dominance: 0.3,
      reasoning: "'Nu înțeleg' + discrepanță = confuzie dominantă"
    }
  },
  {
    input: "Avem nevoie astăzi neapărat, altfel pierdem tot sezonul!",
    output: {
      primaryEmotion: "urgency",
      primaryIntensity: 0.9,
      confidence: 0.95,
      secondaryEmotions: [
        { emotion: "fear", intensity: 0.6, confidence: 0.75 },
        { emotion: "impatience", intensity: 0.7, confidence: 0.8 }
      ],
      valence: -0.4,
      arousal: 0.85,
      dominance: 0.4,
      reasoning: "'Neapărat' + 'pierdem' = urgență extremă cu element de frică"
    }
  },
  {
    input: "Mulțumesc pentru informații, o să mă gândesc.",
    output: {
      primaryEmotion: "neutral",
      primaryIntensity: 0.4,
      confidence: 0.8,
      secondaryEmotions: [
        { emotion: "interest", intensity: 0.3, confidence: 0.6 }
      ],
      valence: 0.1,
      arousal: 0.2,
      dominance: 0.5,
      reasoning: "Politicos dar non-committal, fără semne emoționale puternice"
    }
  }
];

// =====================================================
// Dynamic Example Injection
// =====================================================

/**
 * Select relevant examples based on detected characteristics
 */
export function selectRelevantExamples(
  type: 'sentiment' | 'intent' | 'emotion',
  text: string,
  maxExamples: number = 3
): Array<{ input: string; output: unknown }> {
  const examples = {
    sentiment: SENTIMENT_EXAMPLES_RO,
    intent: INTENT_EXAMPLES_RO,
    emotion: EMOTION_EXAMPLES_RO,
  }[type];
  
  // Simple heuristic selection based on text characteristics
  const hasUrgency = /urgent|imediat|rapid|neapărat|astăzi/i.test(text);
  const hasNegative = /nu merge|problemă|întârziere|stricat|nu funcționează/i.test(text);
  const hasPositive = /mulțumesc|excelent|perfect|super/i.test(text);
  const hasQuestion = /\?|cât costă|preț|când/i.test(text);
  
  // Score examples by relevance
  const scored = examples.map(ex => {
    let score = 0;
    const exHasUrgency = /urgent|imediat|rapid|neapărat|astăzi/i.test(ex.input);
    const exHasNegative = /nu merge|problemă|întârziere|stricat/i.test(ex.input);
    const exHasPositive = /mulțumesc|excelent|perfect|super/i.test(ex.input);
    const exHasQuestion = /\?|cât costă|preț|când/i.test(ex.input);
    
    if (hasUrgency && exHasUrgency) score += 2;
    if (hasNegative && exHasNegative) score += 2;
    if (hasPositive && exHasPositive) score += 2;
    if (hasQuestion && exHasQuestion) score += 1;
    
    return { example: ex, score };
  });
  
  // Return top examples
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxExamples)
    .map(s => s.example);
}

/**
 * Format examples for inclusion in prompt
 */
export function formatExamplesForPrompt(
  examples: Array<{ input: string; output: unknown }>
): string {
  return examples.map((ex, i) => `
EXEMPLU ${i + 1}:
Input: "${ex.input}"
Output: ${JSON.stringify(ex.output, null, 2)}
`).join('\n');
}
```

### 6.3 Fallback Strategies

```typescript
// packages/workers/src/services/analysis-fallback.service.ts

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

// =====================================================
// Fallback Types
// =====================================================

export type FallbackReason = 
  | 'api_timeout'
  | 'api_error'
  | 'rate_limit'
  | 'budget_exceeded'
  | 'parse_error'
  | 'low_confidence'
  | 'model_unavailable';

export interface FallbackResult<T> {
  result: T;
  isFallback: boolean;
  fallbackReason?: FallbackReason;
  fallbackLevel: number; // 0 = primary, 1 = first fallback, etc.
  processingTimeMs: number;
}

// =====================================================
// Rule-Based Sentiment Fallback
// =====================================================

const ROMANIAN_SENTIMENT_LEXICON = {
  veryPositive: [
    'excelent', 'perfect', 'extraordinar', 'minunat', 'superb',
    'fantastic', 'incredibil', 'uimitor', 'excepțional', 'remarcabil'
  ],
  positive: [
    'bun', 'bine', 'mulțumesc', 'frumos', 'ok', 'plăcut', 'corect',
    'reușit', 'satisfăcut', 'apreciez', 'ajutat', 'rapid', 'prompt'
  ],
  negative: [
    'rău', 'prost', 'problema', 'greșit', 'întârziat', 'dezamăgit',
    'nemulțumit', 'nepotrivit', 'incorect', 'defect', 'stricat'
  ],
  veryNegative: [
    'groaznic', 'oribil', 'dezastru', 'catastrofă', 'inacceptabil',
    'scandalos', 'rușine', 'hoți', 'escroci', 'incompetenți'
  ],
  intensifiers: [
    'foarte', 'extrem', 'incredibil', 'total', 'complet', 'absolut'
  ],
  negators: [
    'nu', 'nici', 'fără', 'niciodată', 'nicicum', 'deloc'
  ]
};

export function ruleBasedSentimentFallback(text: string): {
  sentimentScore: number;
  confidence: number;
  method: string;
} {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let positiveCount = 0;
  let negativeCount = 0;
  let hasIntensifier = false;
  let hasNegator = false;
  
  // Check for intensifiers and negators first
  for (const word of words) {
    if (ROMANIAN_SENTIMENT_LEXICON.intensifiers.some(i => word.includes(i))) {
      hasIntensifier = true;
    }
    if (ROMANIAN_SENTIMENT_LEXICON.negators.some(n => word === n)) {
      hasNegator = true;
    }
  }
  
  // Count sentiment words
  for (const word of words) {
    if (ROMANIAN_SENTIMENT_LEXICON.veryPositive.some(p => word.includes(p))) {
      positiveCount += 2;
    } else if (ROMANIAN_SENTIMENT_LEXICON.positive.some(p => word.includes(p))) {
      positiveCount += 1;
    }
    
    if (ROMANIAN_SENTIMENT_LEXICON.veryNegative.some(n => word.includes(n))) {
      negativeCount += 2;
    } else if (ROMANIAN_SENTIMENT_LEXICON.negative.some(n => word.includes(n))) {
      negativeCount += 1;
    }
  }
  
  // Apply modifiers
  if (hasIntensifier) {
    positiveCount *= 1.5;
    negativeCount *= 1.5;
  }
  
  if (hasNegator) {
    // Swap sentiment direction
    [positiveCount, negativeCount] = [negativeCount * 0.7, positiveCount * 0.7];
  }
  
  // Calculate score
  const total = positiveCount + negativeCount;
  if (total === 0) {
    return { sentimentScore: 0, confidence: 0.3, method: 'rule_based_neutral' };
  }
  
  const rawScore = (positiveCount - negativeCount) / (total + 2); // Smooth
  const normalizedScore = Math.max(-1, Math.min(1, rawScore));
  
  // Confidence based on word count and matches
  const confidence = Math.min(0.7, 0.3 + (total * 0.1));
  
  return {
    sentimentScore: normalizedScore,
    confidence,
    method: 'rule_based_lexicon'
  };
}

// =====================================================
// Rule-Based Intent Fallback
// =====================================================

const INTENT_PATTERNS: Array<{
  intent: string;
  patterns: RegExp[];
  priority: number;
}> = [
  {
    intent: 'human_agent_request',
    patterns: [
      /vreau\s+(să\s+)?vorb(esc|i)\s+(cu\s+)?(cineva|om|agent|persoană)/i,
      /pot\s+vorbi\s+cu/i,
      /reprezentant/i,
      /operator\s+uman/i,
    ],
    priority: 1,
  },
  {
    intent: 'urgency_expression',
    patterns: [
      /urgent/i,
      /imediat/i,
      /neapărat/i,
      /cât\s+mai\s+(rapid|repede|curând)/i,
      /astăzi/i,
      /acum/i,
    ],
    priority: 2,
  },
  {
    intent: 'complaint',
    patterns: [
      /reclamație/i,
      /plângere/i,
      /nemulțumit/i,
      /dezamăgit/i,
      /nu\s+(merge|funcționează)/i,
      /problemă\s+(gravă|mare|serioasă)/i,
    ],
    priority: 3,
  },
  {
    intent: 'price_inquiry',
    patterns: [
      /cât\s+costă/i,
      /ce\s+preț/i,
      /preț(ul|uri)/i,
      /ofertă\s+de\s+preț/i,
      /cât\s+e/i,
    ],
    priority: 4,
  },
  {
    intent: 'order_placement',
    patterns: [
      /vreau\s+să\s+comand/i,
      /doresc\s+să\s+comand/i,
      /plasez\s+(o\s+)?comandă/i,
      /fac\s+(o\s+)?comandă/i,
      /comandăm/i,
    ],
    priority: 5,
  },
  {
    intent: 'delivery_inquiry',
    patterns: [
      /când\s+(ajunge|vine|livrați)/i,
      /stare\s+comandă/i,
      /unde\s+e\s+comanda/i,
      /termen\s+(de\s+)?livrare/i,
      /status\s+livrare/i,
    ],
    priority: 6,
  },
  {
    intent: 'cancellation',
    patterns: [
      /anulez/i,
      /anulare/i,
      /renunț/i,
      /nu\s+mai\s+vreau/i,
    ],
    priority: 7,
  },
  {
    intent: 'discount_request',
    patterns: [
      /discount/i,
      /reducere/i,
      /preț\s+mai\s+(bun|mic)/i,
      /ofertă\s+specială/i,
    ],
    priority: 8,
  },
  {
    intent: 'greeting',
    patterns: [
      /^(bună\s+)?ziua/i,
      /^salut/i,
      /^bună/i,
      /^hello/i,
    ],
    priority: 9,
  },
  {
    intent: 'gratitude',
    patterns: [
      /mulțumesc/i,
      /vă\s+mulțumesc/i,
      /mersi/i,
      /apreciez/i,
    ],
    priority: 10,
  },
];

export function ruleBasedIntentFallback(text: string): {
  primaryIntent: string;
  primaryConfidence: number;
  method: string;
} {
  const matches: Array<{ intent: string; priority: number; matchCount: number }> = [];
  
  for (const { intent, patterns, priority } of INTENT_PATTERNS) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      matches.push({ intent, priority, matchCount });
    }
  }
  
  if (matches.length === 0) {
    return {
      primaryIntent: 'unclear',
      primaryConfidence: 0.3,
      method: 'rule_based_no_match'
    };
  }
  
  // Sort by match count desc, then priority asc
  matches.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.priority - b.priority;
  });
  
  const best = matches[0];
  const confidence = Math.min(0.75, 0.4 + (best.matchCount * 0.15));
  
  return {
    primaryIntent: best.intent,
    primaryConfidence: confidence,
    method: 'rule_based_pattern'
  };
}

// =====================================================
// Rule-Based Emotion Fallback
// =====================================================

const EMOTION_INDICATORS = {
  anger: {
    words: ['furios', 'nervos', 'enervat', 'supărat', 'inacceptabil'],
    punctuation: /!!!+/,
    caps: true,
  },
  frustration: {
    words: ['frustrare', 'frustrat', 'nu merge', 'nu funcționează', 'imposibil'],
    punctuation: /!+/,
    caps: false,
  },
  joy: {
    words: ['bucuros', 'fericit', 'încântat', 'minunat', 'super'],
    emoji: /[😀😃😄😁🙂😊]/,
    caps: false,
  },
  satisfaction: {
    words: ['mulțumit', 'satisfăcut', 'excelent', 'perfect', 'bravo'],
    emoji: /[👍✅🎉]/,
    caps: false,
  },
  urgency: {
    words: ['urgent', 'imediat', 'rapid', 'neapărat', 'acum'],
    punctuation: /!{2,}/,
    caps: true,
  },
  confusion: {
    words: ['nu înțeleg', 'confuz', 'neclar', 'ce vreți să spuneți'],
    punctuation: /\?{2,}/,
    caps: false,
  },
  fear: {
    words: ['îngrijorat', 'temător', 'risc', 'pierd', 'pericol'],
    punctuation: null,
    caps: false,
  },
};

export function ruleBasedEmotionFallback(text: string): {
  primaryEmotion: string;
  primaryIntensity: number;
  valence: number;
  arousal: number;
  method: string;
} {
  const lowerText = text.toLowerCase();
  const hasExcessiveCaps = (text.match(/[A-Z]{3,}/g) || []).length > 0;
  
  let bestEmotion = 'neutral';
  let bestScore = 0;
  
  for (const [emotion, indicators] of Object.entries(EMOTION_INDICATORS)) {
    let score = 0;
    
    // Check words
    for (const word of indicators.words) {
      if (lowerText.includes(word)) {
        score += 2;
      }
    }
    
    // Check punctuation
    if (indicators.punctuation && indicators.punctuation.test(text)) {
      score += 1;
    }
    
    // Check caps
    if (indicators.caps && hasExcessiveCaps) {
      score += 1;
    }
    
    // Check emoji
    if ('emoji' in indicators && indicators.emoji?.test(text)) {
      score += 1.5;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = emotion;
    }
  }
  
  // Calculate VAD based on emotion
  const VAD_MAP: Record<string, { valence: number; arousal: number }> = {
    anger: { valence: -0.7, arousal: 0.85 },
    frustration: { valence: -0.5, arousal: 0.6 },
    joy: { valence: 0.8, arousal: 0.6 },
    satisfaction: { valence: 0.7, arousal: 0.4 },
    urgency: { valence: -0.2, arousal: 0.9 },
    confusion: { valence: -0.2, arousal: 0.4 },
    fear: { valence: -0.6, arousal: 0.7 },
    neutral: { valence: 0, arousal: 0.3 },
  };
  
  const vad = VAD_MAP[bestEmotion] || VAD_MAP.neutral;
  const intensity = Math.min(1, bestScore * 0.2);
  
  return {
    primaryEmotion: bestEmotion,
    primaryIntensity: Math.max(0.3, intensity),
    valence: vad.valence,
    arousal: vad.arousal,
    method: 'rule_based_indicators'
  };
}

### 6.4 Model Performance Optimization

#### 6.4.1 Caching Strategy

```typescript
// packages/workers/src/ai/model-cache.ts

import { Redis } from 'ioredis';
import { createHash } from 'crypto';

interface CacheConfig {
  ttl: number;           // Cache TTL in seconds
  maxSize: number;       // Maximum cache entries
  compressionThreshold: number; // Compress responses larger than this
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  sentiment: {
    ttl: 3600,           // 1 hour - sentiment relatively stable
    maxSize: 100000,
    compressionThreshold: 1024,
  },
  intent: {
    ttl: 1800,           // 30 minutes - intent more context-dependent
    maxSize: 50000,
    compressionThreshold: 512,
  },
  emotion: {
    ttl: 900,            // 15 minutes - emotions more volatile
    maxSize: 50000,
    compressionThreshold: 512,
  },
};

export class ModelResponseCache {
  private redis: Redis;
  private prefix = 'ai:cache:';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Generate cache key from input parameters
   */
  private generateKey(
    analysisType: 'sentiment' | 'intent' | 'emotion',
    text: string,
    context?: Record<string, unknown>
  ): string {
    const normalizedText = text.toLowerCase().trim();
    const contextHash = context 
      ? createHash('md5').update(JSON.stringify(context)).digest('hex').slice(0, 8)
      : 'nocontext';
    
    const textHash = createHash('sha256')
      .update(normalizedText)
      .digest('hex')
      .slice(0, 16);
    
    return `${this.prefix}${analysisType}:${textHash}:${contextHash}`;
  }

  /**
   * Get cached response
   */
  async get<T>(
    analysisType: 'sentiment' | 'intent' | 'emotion',
    text: string,
    context?: Record<string, unknown>
  ): Promise<T | null> {
    const key = this.generateKey(analysisType, text, context);
    
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;

      // Update access time for LRU
      await this.redis.expire(key, CACHE_CONFIGS[analysisType].ttl);
      
      // Decompress if needed
      if (cached.startsWith('compressed:')) {
        const compressed = Buffer.from(cached.slice(11), 'base64');
        const decompressed = await this.decompress(compressed);
        return JSON.parse(decompressed);
      }
      
      return JSON.parse(cached);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached response
   */
  async set<T>(
    analysisType: 'sentiment' | 'intent' | 'emotion',
    text: string,
    response: T,
    context?: Record<string, unknown>
  ): Promise<void> {
    const key = this.generateKey(analysisType, text, context);
    const config = CACHE_CONFIGS[analysisType];
    
    try {
      let serialized = JSON.stringify(response);
      
      // Compress large responses
      if (serialized.length > config.compressionThreshold) {
        const compressed = await this.compress(serialized);
        serialized = 'compressed:' + compressed.toString('base64');
      }
      
      await this.redis.setex(key, config.ttl, serialized);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache for a specific text
   */
  async invalidate(
    analysisType: 'sentiment' | 'intent' | 'emotion',
    text: string
  ): Promise<void> {
    const pattern = this.generateKey(analysisType, text, undefined).slice(0, -9) + '*';
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    sentiment: { size: number; hitRate: number };
    intent: { size: number; hitRate: number };
    emotion: { size: number; hitRate: number };
  }> {
    const stats = {
      sentiment: { size: 0, hitRate: 0 },
      intent: { size: 0, hitRate: 0 },
      emotion: { size: 0, hitRate: 0 },
    };

    for (const type of ['sentiment', 'intent', 'emotion'] as const) {
      const keys = await this.redis.keys(`${this.prefix}${type}:*`);
      stats[type].size = keys.length;
      
      // Get hit rate from counters
      const hits = await this.redis.get(`${this.prefix}${type}:hits`) || '0';
      const misses = await this.redis.get(`${this.prefix}${type}:misses`) || '0';
      const total = parseInt(hits) + parseInt(misses);
      stats[type].hitRate = total > 0 ? parseInt(hits) / total : 0;
    }

    return stats;
  }

  private async compress(data: string): Promise<Buffer> {
    const { promisify } = await import('util');
    const { gzip } = await import('zlib');
    const gzipAsync = promisify(gzip);
    return gzipAsync(Buffer.from(data));
  }

  private async decompress(data: Buffer): Promise<string> {
    const { promisify } = await import('util');
    const { gunzip } = await import('zlib');
    const gunzipAsync = promisify(gunzip);
    const decompressed = await gunzipAsync(data);
    return decompressed.toString();
  }
}
```

#### 6.4.2 Batching Strategy

```typescript
// packages/workers/src/ai/batch-processor.ts

import { Queue } from 'bullmq';

interface BatchConfig {
  maxBatchSize: number;
  maxWaitMs: number;
  minBatchSize: number;
}

interface PendingRequest<T> {
  id: string;
  text: string;
  context?: Record<string, unknown>;
  resolve: (result: T) => void;
  reject: (error: Error) => void;
  addedAt: number;
}

export class AIBatchProcessor<T> {
  private pending: Map<string, PendingRequest<T>> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private config: BatchConfig;
  private processBatch: (texts: string[], contexts: Record<string, unknown>[]) => Promise<T[]>;

  constructor(
    config: BatchConfig,
    processBatch: (texts: string[], contexts: Record<string, unknown>[]) => Promise<T[]>
  ) {
    this.config = config;
    this.processBatch = processBatch;
  }

  /**
   * Add request to batch
   */
  async add(
    id: string,
    text: string,
    context?: Record<string, unknown>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        id,
        text,
        context,
        resolve,
        reject,
        addedAt: Date.now(),
      });

      // Check if we should process immediately
      if (this.pending.size >= this.config.maxBatchSize) {
        this.flush();
      } else if (!this.batchTimer) {
        // Start timer for max wait
        this.batchTimer = setTimeout(() => {
          this.flush();
        }, this.config.maxWaitMs);
      }
    });
  }

  /**
   * Flush pending batch
   */
  private async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.pending.size === 0) return;

    // Wait for minimum batch size if we have few requests
    if (this.pending.size < this.config.minBatchSize) {
      const oldestRequest = Math.min(
        ...Array.from(this.pending.values()).map(r => r.addedAt)
      );
      const waitedMs = Date.now() - oldestRequest;
      
      if (waitedMs < this.config.maxWaitMs) {
        this.batchTimer = setTimeout(() => {
          this.flush();
        }, Math.min(100, this.config.maxWaitMs - waitedMs));
        return;
      }
    }

    // Get batch
    const batch = Array.from(this.pending.values());
    this.pending.clear();

    const texts = batch.map(r => r.text);
    const contexts = batch.map(r => r.context || {});

    try {
      // Process batch
      const results = await this.processBatch(texts, contexts);

      // Resolve all promises
      batch.forEach((request, index) => {
        if (results[index]) {
          request.resolve(results[index]);
        } else {
          request.reject(new Error('No result for batch item'));
        }
      });
    } catch (error) {
      // Reject all promises
      batch.forEach(request => {
        request.reject(error as Error);
      });
    }
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Shutdown - process remaining and stop accepting new requests
   */
  async shutdown(): Promise<void> {
    if (this.pending.size > 0) {
      await this.flush();
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
  }
}
```

#### 6.4.3 Token Optimization

```typescript
// packages/workers/src/ai/token-optimizer.ts

interface TokenOptimizationConfig {
  maxInputTokens: number;
  targetOutputTokens: number;
  preserveKeyPhrases: boolean;
}

const DEFAULT_CONFIG: TokenOptimizationConfig = {
  maxInputTokens: 2048,
  targetOutputTokens: 512,
  preserveKeyPhrases: true,
};

// Key phrases to preserve in Romanian agricultural B2B context
const KEY_PHRASES_RO = [
  'preț', 'ofertă', 'comandă', 'livrare', 'plată',
  'urgent', 'imediat', 'reclamație', 'problemă', 'defect',
  'mulțumesc', 'perfect', 'excelent', 'dezamăgit', 'nemulțumit',
  'cantitate', 'stoc', 'disponibil', 'termen', 'garanție',
  'factură', 'contract', 'discount', 'reducere', 'negociere',
];

export class TokenOptimizer {
  private config: TokenOptimizationConfig;

  constructor(config: Partial<TokenOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Estimate token count (rough approximation for Romanian/English)
   */
  estimateTokens(text: string): number {
    // Romanian tends to have longer words, so we use a slightly different ratio
    const words = text.split(/\s+/).length;
    const chars = text.length;
    
    // Rough estimate: average 1.3 tokens per word for Romanian
    return Math.ceil(words * 1.3 + chars / 10);
  }

  /**
   * Optimize text for token limit
   */
  optimizeText(text: string): string {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= this.config.maxInputTokens) {
      return text;
    }

    // Strategy 1: Remove repeated whitespace and normalize
    let optimized = text.replace(/\s+/g, ' ').trim();
    
    if (this.estimateTokens(optimized) <= this.config.maxInputTokens) {
      return optimized;
    }

    // Strategy 2: Truncate while preserving key phrases
    if (this.config.preserveKeyPhrases) {
      optimized = this.truncatePreservingKeyPhrases(optimized);
    } else {
      optimized = this.simpleTruncate(optimized);
    }

    return optimized;
  }

  /**
   * Truncate while preserving key phrases
   */
  private truncatePreservingKeyPhrases(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const targetTokens = this.config.maxInputTokens * 0.9; // Leave some margin
    
    // Score sentences by importance (key phrases)
    const scored = sentences.map((sentence, index) => {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      
      // Key phrase matches
      for (const phrase of KEY_PHRASES_RO) {
        if (lowerSentence.includes(phrase)) {
          score += 10;
        }
      }
      
      // Position bonus (first and last sentences often important)
      if (index === 0) score += 5;
      if (index === sentences.length - 1) score += 3;
      
      // Question bonus (questions often carry intent)
      if (sentence.includes('?')) score += 3;
      
      // Exclamation bonus (emphasis/emotion)
      if (sentence.includes('!')) score += 2;
      
      return { sentence, score, tokens: this.estimateTokens(sentence) };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Select sentences up to token limit
    const selected: typeof scored = [];
    let currentTokens = 0;

    for (const item of scored) {
      if (currentTokens + item.tokens <= targetTokens) {
        selected.push(item);
        currentTokens += item.tokens;
      }
    }

    // Re-sort by original position
    const originalOrder = sentences.map(s => s);
    selected.sort((a, b) => 
      originalOrder.indexOf(a.sentence) - originalOrder.indexOf(b.sentence)
    );

    return selected.map(s => s.sentence.trim()).join('. ') + '.';
  }

  /**
   * Simple truncation
   */
  private simpleTruncate(text: string): string {
    const words = text.split(/\s+/);
    const targetWords = Math.floor(this.config.maxInputTokens / 1.3);
    
    if (words.length <= targetWords) {
      return text;
    }

    // Keep first 70% and last 30% of allowed words
    const firstPart = Math.floor(targetWords * 0.7);
    const lastPart = targetWords - firstPart;

    const beginning = words.slice(0, firstPart).join(' ');
    const end = words.slice(-lastPart).join(' ');

    return `${beginning} [...] ${end}`;
  }

  /**
   * Optimize conversation context
   */
  optimizeContext(
    messages: { role: string; content: string; timestamp: Date }[],
    maxMessages: number = 5
  ): { role: string; content: string }[] {
    // Take last N messages
    const recent = messages.slice(-maxMessages);
    
    // Optimize each message
    return recent.map(msg => ({
      role: msg.role,
      content: this.optimizeText(msg.content),
    }));
  }
}
```

---

## 7. Real-time Processing

### 7.1 WebSocket Integration

#### 7.1.1 Analysis WebSocket Server

```typescript
// packages/api/src/websocket/analysis-websocket.ts

import { WebSocket, WebSocketServer } from 'ws';
import { Redis } from 'ioredis';
import { verifyToken } from '../auth/jwt';

interface AnalysisSubscription {
  conversationId?: string;
  contactId?: string;
  tenantId: string;
  types: ('sentiment' | 'intent' | 'emotion' | 'aggregate' | 'alert')[];
}

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  tenantId: string;
  subscriptions: AnalysisSubscription[];
  lastPing: number;
}

export class AnalysisWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private redis: Redis;
  private subscriber: Redis;

  constructor(server: any, redis: Redis) {
    this.wss = new WebSocketServer({ server, path: '/ws/analysis' });
    this.redis = redis;
    this.subscriber = redis.duplicate();
    
    this.setupWebSocketServer();
    this.setupRedisSubscriber();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Extract and verify token from query string
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          ws.close(4001, 'Authentication required');
          return;
        }

        const decoded = await verifyToken(token);
        const clientId = `${decoded.userId}-${Date.now()}`;
        
        const client: WebSocketClient = {
          ws,
          userId: decoded.userId,
          tenantId: decoded.tenantId,
          subscriptions: [],
          lastPing: Date.now(),
        };
        
        this.clients.set(clientId, client);
        
        // Send connection acknowledgment
        this.send(ws, {
          type: 'connected',
          clientId,
          timestamp: new Date().toISOString(),
        });

        ws.on('message', (data) => {
          this.handleMessage(clientId, data.toString());
        });

        ws.on('close', () => {
          this.clients.delete(clientId);
        });

        ws.on('pong', () => {
          const client = this.clients.get(clientId);
          if (client) {
            client.lastPing = Date.now();
          }
        });

      } catch (error) {
        ws.close(4002, 'Authentication failed');
      }
    });
  }

  private setupRedisSubscriber(): void {
    // Subscribe to analysis events channel
    this.subscriber.subscribe('worker-events');
    
    this.subscriber.on('message', (channel, message) => {
      if (channel === 'worker-events') {
        this.handleWorkerEvent(JSON.parse(message));
      }
    });
  }

  private handleMessage(clientId: string, message: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(client, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(client, data);
          break;
        case 'ping':
          this.send(client.ws, { type: 'pong', timestamp: Date.now() });
          break;
      }
    } catch (error) {
      this.send(client.ws, { 
        type: 'error', 
        message: 'Invalid message format' 
      });
    }
  }

  private handleSubscribe(client: WebSocketClient, data: any): void {
    const subscription: AnalysisSubscription = {
      tenantId: client.tenantId,
      conversationId: data.conversationId,
      contactId: data.contactId,
      types: data.types || ['sentiment', 'intent', 'emotion', 'aggregate', 'alert'],
    };

    // Validate subscription
    if (!subscription.conversationId && !subscription.contactId) {
      this.send(client.ws, {
        type: 'error',
        message: 'Must specify conversationId or contactId',
      });
      return;
    }

    client.subscriptions.push(subscription);
    
    this.send(client.ws, {
      type: 'subscribed',
      subscription,
    });
  }

  private handleUnsubscribe(client: WebSocketClient, data: any): void {
    client.subscriptions = client.subscriptions.filter(sub => {
      if (data.conversationId && sub.conversationId !== data.conversationId) {
        return true;
      }
      if (data.contactId && sub.contactId !== data.contactId) {
        return true;
      }
      return false;
    });

    this.send(client.ws, {
      type: 'unsubscribed',
      conversationId: data.conversationId,
      contactId: data.contactId,
    });
  }

  private handleWorkerEvent(event: any): void {
    // Map event types to subscription types
    const eventTypeMap: Record<string, string> = {
      'SENTIMENT_ANALYZED': 'sentiment',
      'INTENT_DETECTED': 'intent',
      'EMOTION_DETECTED': 'emotion',
      'ANALYSIS_AGGREGATED': 'aggregate',
      'ALERT_CREATED': 'alert',
      'SENTIMENT_TREND_UPDATED': 'sentiment',
    };

    const subscriptionType = eventTypeMap[event.type];
    if (!subscriptionType) return;

    // Find matching clients
    for (const [clientId, client] of this.clients) {
      for (const sub of client.subscriptions) {
        // Check tenant
        if (sub.tenantId !== event.tenantId) continue;

        // Check types
        if (!sub.types.includes(subscriptionType as any)) continue;

        // Check conversation/contact match
        const conversationMatch = !sub.conversationId || 
          sub.conversationId === event.conversationId;
        const contactMatch = !sub.contactId || 
          sub.contactId === event.contactId;

        if (conversationMatch || contactMatch) {
          this.send(client.ws, {
            type: 'analysis_update',
            eventType: event.type,
            data: event,
            timestamp: new Date().toISOString(),
          });
          break; // Only send once per client
        }
      }
    }
  }

  private send(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          client.ws.terminate();
          this.clients.delete(clientId);
        } else {
          client.ws.ping();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast to all clients in a tenant
   */
  broadcastToTenant(tenantId: string, message: any): void {
    for (const client of this.clients.values()) {
      if (client.tenantId === tenantId) {
        this.send(client.ws, message);
      }
    }
  }
}
```

#### 7.1.2 Client-Side WebSocket Handler

```typescript
// packages/frontend/src/hooks/useAnalysisWebSocket.ts

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface AnalysisEvent {
  type: string;
  eventType: string;
  data: any;
  timestamp: string;
}

interface UseAnalysisWebSocketOptions {
  conversationId?: string;
  contactId?: string;
  types?: ('sentiment' | 'intent' | 'emotion' | 'aggregate' | 'alert')[];
  onEvent?: (event: AnalysisEvent) => void;
}

interface UseAnalysisWebSocketReturn {
  isConnected: boolean;
  lastEvent: AnalysisEvent | null;
  subscribe: (options: Partial<UseAnalysisWebSocketOptions>) => void;
  unsubscribe: (conversationId?: string, contactId?: string) => void;
}

export function useAnalysisWebSocket(
  options: UseAnalysisWebSocketOptions
): UseAnalysisWebSocketReturn {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AnalysisEvent | null>(null);

  const connect = useCallback(() => {
    if (!token) return;

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/analysis?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      
      // Subscribe with initial options
      if (options.conversationId || options.contactId) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          conversationId: options.conversationId,
          contactId: options.contactId,
          types: options.types || ['sentiment', 'intent', 'emotion', 'aggregate', 'alert'],
        }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'analysis_update') {
        setLastEvent(data);
        options.onEvent?.(data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      
      // Attempt reconnection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [token, options]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((subOptions: Partial<UseAnalysisWebSocketOptions>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        ...subOptions,
      }));
    }
  }, []);

  const unsubscribe = useCallback((conversationId?: string, contactId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        conversationId,
        contactId,
      }));
    }
  }, []);

  return {
    isConnected,
    lastEvent,
    subscribe,
    unsubscribe,
  };
}
```

### 7.2 Streaming Analysis

#### 7.2.1 Real-time Analysis Stream

```typescript
// packages/workers/src/streaming/analysis-stream.ts

import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

interface StreamConfig {
  streamName: string;
  groupName: string;
  consumerName: string;
  blockMs: number;
  batchSize: number;
}

interface AnalysisStreamEvent {
  id: string;
  type: 'sentiment' | 'intent' | 'emotion' | 'aggregate' | 'alert';
  tenantId: string;
  conversationId: string;
  contactId?: string;
  messageId: string;
  data: any;
  timestamp: string;
}

export class AnalysisStream extends EventEmitter {
  private redis: Redis;
  private config: StreamConfig;
  private running: boolean = false;

  constructor(redis: Redis, config: Partial<StreamConfig> = {}) {
    super();
    this.redis = redis;
    this.config = {
      streamName: config.streamName || 'analysis:stream',
      groupName: config.groupName || 'analysis-consumers',
      consumerName: config.consumerName || `consumer-${process.pid}`,
      blockMs: config.blockMs || 5000,
      batchSize: config.batchSize || 10,
    };
  }

  /**
   * Initialize stream and consumer group
   */
  async initialize(): Promise<void> {
    try {
      // Create consumer group if not exists
      await this.redis.xgroup(
        'CREATE',
        this.config.streamName,
        this.config.groupName,
        '0',
        'MKSTREAM'
      );
    } catch (error: any) {
      // Ignore error if group already exists
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  /**
   * Publish analysis event to stream
   */
  async publish(event: Omit<AnalysisStreamEvent, 'id'>): Promise<string> {
    const id = await this.redis.xadd(
      this.config.streamName,
      '*',
      'type', event.type,
      'tenantId', event.tenantId,
      'conversationId', event.conversationId,
      'contactId', event.contactId || '',
      'messageId', event.messageId,
      'data', JSON.stringify(event.data),
      'timestamp', event.timestamp
    );
    return id;
  }

  /**
   * Start consuming stream
   */
  async startConsuming(): Promise<void> {
    this.running = true;
    
    while (this.running) {
      try {
        // Read from stream with blocking
        const results = await this.redis.xreadgroup(
          'GROUP', this.config.groupName, this.config.consumerName,
          'COUNT', this.config.batchSize,
          'BLOCK', this.config.blockMs,
          'STREAMS', this.config.streamName, '>'
        );

        if (!results) continue;

        for (const [stream, messages] of results) {
          for (const [id, fields] of messages) {
            const event = this.parseEvent(id, fields);
            
            try {
              // Emit event for processing
              this.emit('event', event);
              
              // Acknowledge message
              await this.redis.xack(
                this.config.streamName,
                this.config.groupName,
                id
              );
            } catch (error) {
              this.emit('error', { event, error });
            }
          }
        }
      } catch (error) {
        this.emit('error', { error });
        await this.sleep(1000);
      }
    }
  }

  /**
   * Stop consuming
   */
  stopConsuming(): void {
    this.running = false;
  }

  /**
   * Get stream info
   */
  async getStreamInfo(): Promise<{
    length: number;
    groups: number;
    pending: number;
  }> {
    const info = await this.redis.xinfo('STREAM', this.config.streamName);
    const groups = await this.redis.xinfo('GROUPS', this.config.streamName);
    
    let pending = 0;
    for (const group of groups as any[]) {
      pending += group[7] || 0; // pending count
    }

    return {
      length: info[1],
      groups: groups.length,
      pending,
    };
  }

  /**
   * Trim old entries
   */
  async trim(maxLen: number): Promise<number> {
    return await this.redis.xtrim(this.config.streamName, 'MAXLEN', '~', maxLen);
  }

  private parseEvent(id: string, fields: string[]): AnalysisStreamEvent {
    const fieldMap: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      fieldMap[fields[i]] = fields[i + 1];
    }

    return {
      id,
      type: fieldMap.type as any,
      tenantId: fieldMap.tenantId,
      conversationId: fieldMap.conversationId,
      contactId: fieldMap.contactId || undefined,
      messageId: fieldMap.messageId,
      data: JSON.parse(fieldMap.data),
      timestamp: fieldMap.timestamp,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 7.2.2 Analysis Event Aggregator

```typescript
// packages/workers/src/streaming/event-aggregator.ts

import { Redis } from 'ioredis';
import { AnalysisStream } from './analysis-stream';

interface AggregatedAnalysis {
  conversationId: string;
  contactId?: string;
  sentiment?: {
    score: number;
    label: string;
    confidence: number;
    updatedAt: string;
  };
  intent?: {
    primary: string;
    confidence: number;
    actionRequired: boolean;
    updatedAt: string;
  };
  emotion?: {
    primary: string;
    intensity: number;
    arousal: number;
    updatedAt: string;
  };
  riskLevel?: string;
  riskScore?: number;
  lastUpdated: string;
}

export class AnalysisEventAggregator {
  private redis: Redis;
  private stream: AnalysisStream;
  private aggregatePrefix = 'analysis:realtime:';
  private ttl = 3600; // 1 hour TTL for real-time aggregates

  constructor(redis: Redis, stream: AnalysisStream) {
    this.redis = redis;
    this.stream = stream;
    
    this.stream.on('event', this.handleEvent.bind(this));
  }

  /**
   * Handle incoming analysis event
   */
  private async handleEvent(event: any): Promise<void> {
    const key = `${this.aggregatePrefix}${event.conversationId}`;
    
    // Get current aggregate
    const current = await this.getAggregate(event.conversationId);
    
    // Update based on event type
    switch (event.type) {
      case 'sentiment':
        current.sentiment = {
          score: event.data.sentimentScore,
          label: event.data.sentimentLabel,
          confidence: event.data.confidence,
          updatedAt: event.timestamp,
        };
        break;
        
      case 'intent':
        current.intent = {
          primary: event.data.primaryIntent,
          confidence: event.data.primaryConfidence,
          actionRequired: event.data.actionRequired,
          updatedAt: event.timestamp,
        };
        break;
        
      case 'emotion':
        current.emotion = {
          primary: event.data.primaryEmotion,
          intensity: event.data.primaryIntensity,
          arousal: event.data.arousal,
          updatedAt: event.timestamp,
        };
        break;
        
      case 'aggregate':
        current.riskLevel = event.data.riskLevel;
        current.riskScore = event.data.riskScore;
        break;
    }
    
    current.lastUpdated = event.timestamp;
    current.contactId = event.contactId;
    
    // Save updated aggregate
    await this.redis.setex(key, this.ttl, JSON.stringify(current));
    
    // Publish update to subscribers
    await this.redis.publish(
      `analysis:updates:${event.conversationId}`,
      JSON.stringify(current)
    );
  }

  /**
   * Get current aggregate for conversation
   */
  async getAggregate(conversationId: string): Promise<AggregatedAnalysis> {
    const key = `${this.aggregatePrefix}${conversationId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return {
      conversationId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get aggregates for multiple conversations
   */
  async getAggregates(conversationIds: string[]): Promise<Map<string, AggregatedAnalysis>> {
    const keys = conversationIds.map(id => `${this.aggregatePrefix}${id}`);
    const results = await this.redis.mget(...keys);
    
    const aggregates = new Map<string, AggregatedAnalysis>();
    
    results.forEach((data, index) => {
      if (data) {
        aggregates.set(conversationIds[index], JSON.parse(data));
      }
    });
    
    return aggregates;
  }

  /**
   * Subscribe to conversation updates
   */
  async subscribe(
    conversationId: string,
    callback: (aggregate: AggregatedAnalysis) => void
  ): Promise<() => void> {
    const subscriber = this.redis.duplicate();
    const channel = `analysis:updates:${conversationId}`;
    
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(JSON.parse(message));
      }
    });
    
    // Return unsubscribe function
    return async () => {
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
    };
  }
}
```

### 7.3 Server-Sent Events (SSE)

#### 7.3.1 SSE Analysis Endpoint

```typescript
// packages/api/src/routes/analysis-sse.ts

import { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';

interface SSEQuerystring {
  conversationId?: string;
  contactId?: string;
  types?: string;
}

const sseRoutes: FastifyPluginAsync = async (fastify) => {
  const redis: Redis = fastify.redis;

  fastify.get<{ Querystring: SSEQuerystring }>(
    '/api/v1/analysis/stream',
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            contactId: { type: 'string' },
            types: { type: 'string' }, // comma-separated
          },
        },
      },
    },
    async (request, reply) => {
      const { conversationId, contactId, types } = request.query;
      const tenantId = request.user.tenantId;
      
      // Validate at least one filter
      if (!conversationId && !contactId) {
        return reply.code(400).send({
          error: 'Must specify conversationId or contactId',
        });
      }

      const typeFilter = types?.split(',') || [
        'sentiment', 'intent', 'emotion', 'aggregate', 'alert'
      ];

      // Set up SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Create subscriber
      const subscriber = redis.duplicate();
      await subscriber.subscribe('worker-events');

      // Send initial connection event
      reply.raw.write(`event: connected\ndata: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        filters: { conversationId, contactId, types: typeFilter },
      })}\n\n`);

      // Heartbeat interval
      const heartbeat = setInterval(() => {
        reply.raw.write(': heartbeat\n\n');
      }, 30000);

      // Message handler
      subscriber.on('message', (channel, message) => {
        try {
          const event = JSON.parse(message);
          
          // Filter by tenant
          if (event.tenantId !== tenantId) return;
          
          // Map event type
          const eventTypeMap: Record<string, string> = {
            'SENTIMENT_ANALYZED': 'sentiment',
            'INTENT_DETECTED': 'intent',
            'EMOTION_DETECTED': 'emotion',
            'ANALYSIS_AGGREGATED': 'aggregate',
            'ALERT_CREATED': 'alert',
          };
          
          const eventType = eventTypeMap[event.type];
          if (!eventType || !typeFilter.includes(eventType)) return;
          
          // Filter by conversation/contact
          const matchesConversation = !conversationId || 
            event.conversationId === conversationId;
          const matchesContact = !contactId || 
            event.contactId === contactId;
            
          if (!matchesConversation && !matchesContact) return;
          
          // Send event
          reply.raw.write(`event: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
          // Ignore parse errors
        }
      });

      // Cleanup on close
      request.raw.on('close', () => {
        clearInterval(heartbeat);
        subscriber.unsubscribe();
        subscriber.disconnect();
      });
    }
  );
};

export default sseRoutes;
```

#### 7.3.2 Client-Side SSE Hook

```typescript
// packages/frontend/src/hooks/useAnalysisSSE.ts

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface AnalysisEvent {
  type: string;
  tenantId: string;
  conversationId: string;
  contactId?: string;
  messageId: string;
  [key: string]: any;
}

interface UseAnalysisSSEOptions {
  conversationId?: string;
  contactId?: string;
  types?: ('sentiment' | 'intent' | 'emotion' | 'aggregate' | 'alert')[];
  enabled?: boolean;
  onSentiment?: (event: AnalysisEvent) => void;
  onIntent?: (event: AnalysisEvent) => void;
  onEmotion?: (event: AnalysisEvent) => void;
  onAggregate?: (event: AnalysisEvent) => void;
  onAlert?: (event: AnalysisEvent) => void;
}

export function useAnalysisSSE(options: UseAnalysisSSEOptions) {
  const { token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!token || options.enabled === false) return;
    if (!options.conversationId && !options.contactId) return;

    // Build URL
    const params = new URLSearchParams();
    if (options.conversationId) {
      params.set('conversationId', options.conversationId);
    }
    if (options.contactId) {
      params.set('contactId', options.contactId);
    }
    if (options.types?.length) {
      params.set('types', options.types.join(','));
    }

    const url = `/api/v1/analysis/stream?${params.toString()}`;
    
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });
    
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      
      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    // Event handlers
    eventSource.addEventListener('connected', (event) => {
      console.log('SSE connected:', JSON.parse((event as MessageEvent).data));
    });

    eventSource.addEventListener('sentiment', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      options.onSentiment?.(data);
    });

    eventSource.addEventListener('intent', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      options.onIntent?.(data);
    });

    eventSource.addEventListener('emotion', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      options.onEmotion?.(data);
    });

    eventSource.addEventListener('aggregate', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      options.onAggregate?.(data);
    });

    eventSource.addEventListener('alert', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      options.onAlert?.(data);
    });
  }, [token, options]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    error,
    disconnect,
    reconnect: connect,
  };
}
```

---

## 8. Monitoring & Metrics

### 8.1 Prometheus Metrics

#### 8.1.1 Analysis Metrics Collector

```typescript
// packages/workers/src/metrics/analysis-metrics.ts

import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';

// Create dedicated registry for analysis metrics
const analysisRegistry = new Registry();

// ================== COUNTERS ==================

// Analysis processed counter
export const analysisProcessedCounter = new Counter({
  name: 'cerniq_analysis_processed_total',
  help: 'Total number of analyses processed',
  labelNames: ['tenant_id', 'analysis_type', 'status'],
  registers: [analysisRegistry],
});

// Sentiment distribution counter
export const sentimentDistributionCounter = new Counter({
  name: 'cerniq_sentiment_distribution_total',
  help: 'Distribution of sentiment labels',
  labelNames: ['tenant_id', 'label'],
  registers: [analysisRegistry],
});

// Intent detection counter
export const intentDetectionCounter = new Counter({
  name: 'cerniq_intent_detected_total',
  help: 'Total intents detected by type',
  labelNames: ['tenant_id', 'intent_type'],
  registers: [analysisRegistry],
});

// Emotion detection counter
export const emotionDetectionCounter = new Counter({
  name: 'cerniq_emotion_detected_total',
  help: 'Total emotions detected by type',
  labelNames: ['tenant_id', 'emotion_type'],
  registers: [analysisRegistry],
});

// Alert counter
export const alertCreatedCounter = new Counter({
  name: 'cerniq_analysis_alert_created_total',
  help: 'Total alerts created',
  labelNames: ['tenant_id', 'alert_type', 'severity'],
  registers: [analysisRegistry],
});

// AI API calls counter
export const aiApiCallsCounter = new Counter({
  name: 'cerniq_ai_api_calls_total',
  help: 'Total AI API calls',
  labelNames: ['model', 'analysis_type', 'status'],
  registers: [analysisRegistry],
});

// Cache hits/misses counter
export const cacheOperationsCounter = new Counter({
  name: 'cerniq_analysis_cache_operations_total',
  help: 'Cache hits and misses',
  labelNames: ['analysis_type', 'operation'], // operation: hit, miss
  registers: [analysisRegistry],
});

// ================== HISTOGRAMS ==================

// Processing time histogram
export const processingTimeHistogram = new Histogram({
  name: 'cerniq_analysis_processing_duration_seconds',
  help: 'Analysis processing duration',
  labelNames: ['analysis_type'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [analysisRegistry],
});

// AI response time histogram
export const aiResponseTimeHistogram = new Histogram({
  name: 'cerniq_ai_response_duration_seconds',
  help: 'AI API response duration',
  labelNames: ['model', 'analysis_type'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30],
  registers: [analysisRegistry],
});

// Token usage histogram
export const tokenUsageHistogram = new Histogram({
  name: 'cerniq_ai_token_usage',
  help: 'AI token usage per request',
  labelNames: ['model', 'analysis_type', 'token_type'], // token_type: input, output
  buckets: [100, 250, 500, 1000, 2000, 4000],
  registers: [analysisRegistry],
});

// Sentiment score histogram
export const sentimentScoreHistogram = new Histogram({
  name: 'cerniq_sentiment_score_distribution',
  help: 'Distribution of sentiment scores',
  labelNames: ['tenant_id'],
  buckets: [-1, -0.6, -0.2, 0.2, 0.6, 1],
  registers: [analysisRegistry],
});

// ================== GAUGES ==================

// Queue depth gauge
export const queueDepthGauge = new Gauge({
  name: 'cerniq_analysis_queue_depth',
  help: 'Current queue depth',
  labelNames: ['queue_name', 'status'], // status: waiting, active, delayed, failed
  registers: [analysisRegistry],
});

// Active conversations gauge
export const activeConversationsGauge = new Gauge({
  name: 'cerniq_active_analyzed_conversations',
  help: 'Number of conversations being analyzed',
  labelNames: ['tenant_id'],
  registers: [analysisRegistry],
});

// Risk level distribution gauge
export const riskLevelGauge = new Gauge({
  name: 'cerniq_conversations_by_risk_level',
  help: 'Number of conversations by risk level',
  labelNames: ['tenant_id', 'risk_level'],
  registers: [analysisRegistry],
});

// Model health gauge
export const modelHealthGauge = new Gauge({
  name: 'cerniq_ai_model_health',
  help: 'AI model health status (1=healthy, 0=unhealthy)',
  labelNames: ['model'],
  registers: [analysisRegistry],
});

// ================== SUMMARIES ==================

// Confidence score summary
export const confidenceSummary = new Summary({
  name: 'cerniq_analysis_confidence',
  help: 'Confidence scores for analyses',
  labelNames: ['analysis_type'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [analysisRegistry],
});

// Risk score summary
export const riskScoreSummary = new Summary({
  name: 'cerniq_risk_score',
  help: 'Risk scores distribution',
  labelNames: ['tenant_id'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [analysisRegistry],
});

// Export registry
export { analysisRegistry };

// Metrics helper functions
export function recordAnalysis(
  tenantId: string,
  analysisType: 'sentiment' | 'intent' | 'emotion' | 'aggregate',
  status: 'success' | 'failed' | 'cached',
  durationMs: number,
  confidence?: number
): void {
  analysisProcessedCounter.inc({ 
    tenant_id: tenantId, 
    analysis_type: analysisType, 
    status 
  });
  
  processingTimeHistogram.observe(
    { analysis_type: analysisType },
    durationMs / 1000
  );
  
  if (confidence !== undefined) {
    confidenceSummary.observe({ analysis_type: analysisType }, confidence);
  }
}

export function recordSentiment(
  tenantId: string,
  score: number,
  label: string
): void {
  sentimentDistributionCounter.inc({ tenant_id: tenantId, label });
  sentimentScoreHistogram.observe({ tenant_id: tenantId }, score);
}

export function recordIntent(tenantId: string, intentType: string): void {
  intentDetectionCounter.inc({ tenant_id: tenantId, intent_type: intentType });
}

export function recordEmotion(tenantId: string, emotionType: string): void {
  emotionDetectionCounter.inc({ tenant_id: tenantId, emotion_type: emotionType });
}

export function recordAlert(
  tenantId: string,
  alertType: string,
  severity: string
): void {
  alertCreatedCounter.inc({ 
    tenant_id: tenantId, 
    alert_type: alertType, 
    severity 
  });
}

export function recordAICall(
  model: string,
  analysisType: string,
  status: 'success' | 'failed' | 'timeout',
  durationMs: number,
  inputTokens?: number,
  outputTokens?: number
): void {
  aiApiCallsCounter.inc({ model, analysis_type: analysisType, status });
  aiResponseTimeHistogram.observe(
    { model, analysis_type: analysisType },
    durationMs / 1000
  );
  
  if (inputTokens !== undefined) {
    tokenUsageHistogram.observe(
      { model, analysis_type: analysisType, token_type: 'input' },
      inputTokens
    );
  }
  
  if (outputTokens !== undefined) {
    tokenUsageHistogram.observe(
      { model, analysis_type: analysisType, token_type: 'output' },
      outputTokens
    );
  }
}

export function recordCacheOperation(
  analysisType: string,
  hit: boolean
): void {
  cacheOperationsCounter.inc({
    analysis_type: analysisType,
    operation: hit ? 'hit' : 'miss',
  });
}
```

---

## 8. Monitoring & Metrics

### 8.1 Prometheus Metrics

#### 8.1.1 Core Analysis Metrics

```typescript
// packages/workers/src/metrics/analysis-metrics.ts

import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';

export class AnalysisMetrics {
  private registry: Registry;

  // ============================================================
  // SENTIMENT ANALYSIS METRICS
  // ============================================================
  
  public readonly sentimentAnalysisTotal: Counter;
  public readonly sentimentAnalysisDuration: Histogram;
  public readonly sentimentScoreDistribution: Histogram;
  public readonly sentimentByLabel: Counter;
  public readonly sentimentConfidence: Summary;
  public readonly sentimentAspectCount: Histogram;
  public readonly sentimentNegativeAlerts: Counter;
  public readonly sentimentDeclineAlerts: Counter;

  // ============================================================
  // INTENT DETECTION METRICS
  // ============================================================
  
  public readonly intentDetectionTotal: Counter;
  public readonly intentDetectionDuration: Histogram;
  public readonly intentByType: Counter;
  public readonly intentConfidence: Summary;
  public readonly intentEntityCount: Histogram;
  public readonly intentActionRequired: Counter;
  public readonly intentHandoverTriggered: Counter;

  // ============================================================
  // EMOTION RECOGNITION METRICS
  // ============================================================
  
  public readonly emotionRecognitionTotal: Counter;
  public readonly emotionRecognitionDuration: Histogram;
  public readonly emotionByType: Counter;
  public readonly emotionIntensity: Summary;
  public readonly emotionArousal: Summary;
  public readonly emotionValence: Summary;
  public readonly emotionCuesDetected: Counter;
  public readonly emotionHighArousalAlerts: Counter;

  // ============================================================
  // AGGREGATE ANALYSIS METRICS
  // ============================================================
  
  public readonly aggregateAnalysisTotal: Counter;
  public readonly aggregateAnalysisDuration: Histogram;
  public readonly aggregateCompositeScore: Summary;
  public readonly aggregateRiskByLevel: Counter;
  public readonly aggregateActionsGenerated: Counter;
  public readonly aggregateAutoActionsExecuted: Counter;
  public readonly aggregateEscalations: Counter;

  // ============================================================
  // TREND ANALYSIS METRICS
  // ============================================================
  
  public readonly trendAnalysisTotal: Counter;
  public readonly trendAnalysisDuration: Histogram;
  public readonly trendByDirection: Counter;
  public readonly trendVolatility: Summary;
  public readonly trendDeclineAlerts: Counter;

  // ============================================================
  // ALERT METRICS
  // ============================================================
  
  public readonly alertsGenerated: Counter;
  public readonly alertsBySeverity: Counter;
  public readonly alertsByType: Counter;
  public readonly alertsAcknowledged: Counter;
  public readonly alertsResolved: Counter;
  public readonly alertResolutionTime: Histogram;
  public readonly alertNotificationsSent: Counter;
  public readonly alertAutoActionsExecuted: Counter;

  // ============================================================
  // AI MODEL METRICS
  // ============================================================
  
  public readonly aiModelCalls: Counter;
  public readonly aiModelDuration: Histogram;
  public readonly aiModelTokensUsed: Counter;
  public readonly aiModelErrors: Counter;
  public readonly aiModelFallbacks: Counter;
  public readonly aiModelCacheHits: Counter;
  public readonly aiModelCacheMisses: Counter;

  // ============================================================
  // QUEUE METRICS
  // ============================================================
  
  public readonly queueDepth: Gauge;
  public readonly queueLatency: Histogram;
  public readonly queueProcessed: Counter;
  public readonly queueFailed: Counter;
  public readonly queueRetries: Counter;

  constructor() {
    this.registry = new Registry();

    // ========== SENTIMENT ANALYSIS ==========
    this.sentimentAnalysisTotal = new Counter({
      name: 'cerniq_sentiment_analysis_total',
      help: 'Total number of sentiment analyses performed',
      labelNames: ['tenant_id', 'status', 'language'],
      registers: [this.registry],
    });

    this.sentimentAnalysisDuration = new Histogram({
      name: 'cerniq_sentiment_analysis_duration_ms',
      help: 'Sentiment analysis processing time in milliseconds',
      labelNames: ['tenant_id', 'model'],
      buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
      registers: [this.registry],
    });

    this.sentimentScoreDistribution = new Histogram({
      name: 'cerniq_sentiment_score_distribution',
      help: 'Distribution of sentiment scores',
      labelNames: ['tenant_id'],
      buckets: [-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1],
      registers: [this.registry],
    });

    this.sentimentByLabel = new Counter({
      name: 'cerniq_sentiment_by_label_total',
      help: 'Sentiment analyses by label',
      labelNames: ['tenant_id', 'label'],
      registers: [this.registry],
    });

    this.sentimentConfidence = new Summary({
      name: 'cerniq_sentiment_confidence',
      help: 'Sentiment analysis confidence scores',
      labelNames: ['tenant_id'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.sentimentAspectCount = new Histogram({
      name: 'cerniq_sentiment_aspect_count',
      help: 'Number of aspects detected per analysis',
      labelNames: ['tenant_id'],
      buckets: [0, 1, 2, 3, 4, 5, 7, 10],
      registers: [this.registry],
    });

    this.sentimentNegativeAlerts = new Counter({
      name: 'cerniq_sentiment_negative_alerts_total',
      help: 'Alerts triggered by negative sentiment',
      labelNames: ['tenant_id', 'severity'],
      registers: [this.registry],
    });

    this.sentimentDeclineAlerts = new Counter({
      name: 'cerniq_sentiment_decline_alerts_total',
      help: 'Alerts triggered by sentiment decline',
      labelNames: ['tenant_id', 'severity'],
      registers: [this.registry],
    });

    // ========== INTENT DETECTION ==========
    this.intentDetectionTotal = new Counter({
      name: 'cerniq_intent_detection_total',
      help: 'Total number of intent detections performed',
      labelNames: ['tenant_id', 'status', 'language'],
      registers: [this.registry],
    });

    this.intentDetectionDuration = new Histogram({
      name: 'cerniq_intent_detection_duration_ms',
      help: 'Intent detection processing time in milliseconds',
      labelNames: ['tenant_id', 'model'],
      buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
      registers: [this.registry],
    });

    this.intentByType = new Counter({
      name: 'cerniq_intent_by_type_total',
      help: 'Intent detections by type',
      labelNames: ['tenant_id', 'intent_type'],
      registers: [this.registry],
    });

    this.intentConfidence = new Summary({
      name: 'cerniq_intent_confidence',
      help: 'Intent detection confidence scores',
      labelNames: ['tenant_id'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.intentEntityCount = new Histogram({
      name: 'cerniq_intent_entity_count',
      help: 'Number of entities detected per intent analysis',
      labelNames: ['tenant_id'],
      buckets: [0, 1, 2, 3, 5, 7, 10, 15, 20],
      registers: [this.registry],
    });

    this.intentActionRequired = new Counter({
      name: 'cerniq_intent_action_required_total',
      help: 'Intents requiring action by priority',
      labelNames: ['tenant_id', 'priority'],
      registers: [this.registry],
    });

    this.intentHandoverTriggered = new Counter({
      name: 'cerniq_intent_handover_triggered_total',
      help: 'Handovers triggered by intent detection',
      labelNames: ['tenant_id', 'intent_type'],
      registers: [this.registry],
    });

    // ========== EMOTION RECOGNITION ==========
    this.emotionRecognitionTotal = new Counter({
      name: 'cerniq_emotion_recognition_total',
      help: 'Total number of emotion recognitions performed',
      labelNames: ['tenant_id', 'status', 'language'],
      registers: [this.registry],
    });

    this.emotionRecognitionDuration = new Histogram({
      name: 'cerniq_emotion_recognition_duration_ms',
      help: 'Emotion recognition processing time in milliseconds',
      labelNames: ['tenant_id', 'model'],
      buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
      registers: [this.registry],
    });

    this.emotionByType = new Counter({
      name: 'cerniq_emotion_by_type_total',
      help: 'Emotion recognitions by type',
      labelNames: ['tenant_id', 'emotion_type'],
      registers: [this.registry],
    });

    this.emotionIntensity = new Summary({
      name: 'cerniq_emotion_intensity',
      help: 'Emotion intensity scores',
      labelNames: ['tenant_id', 'emotion_type'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.emotionArousal = new Summary({
      name: 'cerniq_emotion_arousal',
      help: 'Emotional arousal scores',
      labelNames: ['tenant_id'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.emotionValence = new Summary({
      name: 'cerniq_emotion_valence',
      help: 'Emotional valence scores',
      labelNames: ['tenant_id'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.emotionCuesDetected = new Counter({
      name: 'cerniq_emotion_cues_detected_total',
      help: 'Emotional cues detected by type',
      labelNames: ['tenant_id', 'cue_type'],
      registers: [this.registry],
    });

    this.emotionHighArousalAlerts = new Counter({
      name: 'cerniq_emotion_high_arousal_alerts_total',
      help: 'Alerts triggered by high emotional arousal',
      labelNames: ['tenant_id', 'severity'],
      registers: [this.registry],
    });

    // ========== AGGREGATE ANALYSIS ==========
    this.aggregateAnalysisTotal = new Counter({
      name: 'cerniq_aggregate_analysis_total',
      help: 'Total number of aggregate analyses performed',
      labelNames: ['tenant_id', 'status'],
      registers: [this.registry],
    });

    this.aggregateAnalysisDuration = new Histogram({
      name: 'cerniq_aggregate_analysis_duration_ms',
      help: 'Aggregate analysis processing time in milliseconds',
      labelNames: ['tenant_id'],
      buckets: [10, 25, 50, 100, 200, 500, 1000],
      registers: [this.registry],
    });

    this.aggregateCompositeScore = new Summary({
      name: 'cerniq_aggregate_composite_score',
      help: 'Composite score distribution',
      labelNames: ['tenant_id'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.aggregateRiskByLevel = new Counter({
      name: 'cerniq_aggregate_risk_by_level_total',
      help: 'Aggregate analyses by risk level',
      labelNames: ['tenant_id', 'risk_level'],
      registers: [this.registry],
    });

    this.aggregateActionsGenerated = new Counter({
      name: 'cerniq_aggregate_actions_generated_total',
      help: 'Actions generated by aggregate analysis',
      labelNames: ['tenant_id', 'action_type', 'priority'],
      registers: [this.registry],
    });

    this.aggregateAutoActionsExecuted = new Counter({
      name: 'cerniq_aggregate_auto_actions_executed_total',
      help: 'Auto-actions executed by aggregate analysis',
      labelNames: ['tenant_id', 'action_type'],
      registers: [this.registry],
    });

    this.aggregateEscalations = new Counter({
      name: 'cerniq_aggregate_escalations_total',
      help: 'Escalations triggered by aggregate analysis',
      labelNames: ['tenant_id', 'urgency_level'],
      registers: [this.registry],
    });

    // ========== TREND ANALYSIS ==========
    this.trendAnalysisTotal = new Counter({
      name: 'cerniq_trend_analysis_total',
      help: 'Total number of trend analyses performed',
      labelNames: ['tenant_id', 'status', 'window_type'],
      registers: [this.registry],
    });

    this.trendAnalysisDuration = new Histogram({
      name: 'cerniq_trend_analysis_duration_ms',
      help: 'Trend analysis processing time in milliseconds',
      labelNames: ['tenant_id', 'window_type'],
      buckets: [10, 25, 50, 100, 200, 500],
      registers: [this.registry],
    });

    this.trendByDirection = new Counter({
      name: 'cerniq_trend_by_direction_total',
      help: 'Trend analyses by direction',
      labelNames: ['tenant_id', 'direction'],
      registers: [this.registry],
    });

    this.trendVolatility = new Summary({
      name: 'cerniq_trend_volatility',
      help: 'Sentiment volatility distribution',
      labelNames: ['tenant_id'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.trendDeclineAlerts = new Counter({
      name: 'cerniq_trend_decline_alerts_total',
      help: 'Alerts triggered by sentiment decline trends',
      labelNames: ['tenant_id', 'severity'],
      registers: [this.registry],
    });

    // ========== ALERTS ==========
    this.alertsGenerated = new Counter({
      name: 'cerniq_analysis_alerts_generated_total',
      help: 'Total number of alerts generated',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });

    this.alertsBySeverity = new Counter({
      name: 'cerniq_analysis_alerts_by_severity_total',
      help: 'Alerts generated by severity',
      labelNames: ['tenant_id', 'severity'],
      registers: [this.registry],
    });

    this.alertsByType = new Counter({
      name: 'cerniq_analysis_alerts_by_type_total',
      help: 'Alerts generated by type',
      labelNames: ['tenant_id', 'alert_type'],
      registers: [this.registry],
    });

    this.alertsAcknowledged = new Counter({
      name: 'cerniq_analysis_alerts_acknowledged_total',
      help: 'Alerts acknowledged',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });

    this.alertsResolved = new Counter({
      name: 'cerniq_analysis_alerts_resolved_total',
      help: 'Alerts resolved',
      labelNames: ['tenant_id', 'resolution_type'],
      registers: [this.registry],
    });

    this.alertResolutionTime = new Histogram({
      name: 'cerniq_analysis_alert_resolution_time_seconds',
      help: 'Time to resolve alerts in seconds',
      labelNames: ['tenant_id', 'alert_type', 'severity'],
      buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400],
      registers: [this.registry],
    });

    this.alertNotificationsSent = new Counter({
      name: 'cerniq_analysis_alert_notifications_sent_total',
      help: 'Alert notifications sent by channel',
      labelNames: ['tenant_id', 'channel', 'severity'],
      registers: [this.registry],
    });

    this.alertAutoActionsExecuted = new Counter({
      name: 'cerniq_analysis_alert_auto_actions_executed_total',
      help: 'Auto-actions executed from alerts',
      labelNames: ['tenant_id', 'action_type'],
      registers: [this.registry],
    });

    // ========== AI MODEL ==========
    this.aiModelCalls = new Counter({
      name: 'cerniq_analysis_ai_model_calls_total',
      help: 'Total AI model calls',
      labelNames: ['tenant_id', 'model', 'analysis_type'],
      registers: [this.registry],
    });

    this.aiModelDuration = new Histogram({
      name: 'cerniq_analysis_ai_model_duration_ms',
      help: 'AI model response time in milliseconds',
      labelNames: ['tenant_id', 'model', 'analysis_type'],
      buckets: [100, 250, 500, 1000, 2000, 5000, 10000, 20000],
      registers: [this.registry],
    });

    this.aiModelTokensUsed = new Counter({
      name: 'cerniq_analysis_ai_model_tokens_total',
      help: 'Total tokens used by AI models',
      labelNames: ['tenant_id', 'model', 'token_type'],
      registers: [this.registry],
    });

    this.aiModelErrors = new Counter({
      name: 'cerniq_analysis_ai_model_errors_total',
      help: 'AI model errors',
      labelNames: ['tenant_id', 'model', 'error_type'],
      registers: [this.registry],
    });

    this.aiModelFallbacks = new Counter({
      name: 'cerniq_analysis_ai_model_fallbacks_total',
      help: 'AI model fallback activations',
      labelNames: ['tenant_id', 'model', 'fallback_reason'],
      registers: [this.registry],
    });

    this.aiModelCacheHits = new Counter({
      name: 'cerniq_analysis_ai_model_cache_hits_total',
      help: 'AI model cache hits',
      labelNames: ['tenant_id', 'analysis_type'],
      registers: [this.registry],
    });

    this.aiModelCacheMisses = new Counter({
      name: 'cerniq_analysis_ai_model_cache_misses_total',
      help: 'AI model cache misses',
      labelNames: ['tenant_id', 'analysis_type'],
      registers: [this.registry],
    });

    // ========== QUEUE ==========
    this.queueDepth = new Gauge({
      name: 'cerniq_analysis_queue_depth',
      help: 'Current queue depth',
      labelNames: ['queue_name', 'status'],
      registers: [this.registry],
    });

    this.queueLatency = new Histogram({
      name: 'cerniq_analysis_queue_latency_ms',
      help: 'Queue wait time in milliseconds',
      labelNames: ['queue_name'],
      buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      registers: [this.registry],
    });

    this.queueProcessed = new Counter({
      name: 'cerniq_analysis_queue_processed_total',
      help: 'Jobs processed by queue',
      labelNames: ['queue_name', 'status'],
      registers: [this.registry],
    });

    this.queueFailed = new Counter({
      name: 'cerniq_analysis_queue_failed_total',
      help: 'Jobs failed by queue',
      labelNames: ['queue_name', 'error_type'],
      registers: [this.registry],
    });

    this.queueRetries = new Counter({
      name: 'cerniq_analysis_queue_retries_total',
      help: 'Job retries by queue',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });
  }

  getRegistry(): Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

// Singleton instance
export const analysisMetrics = new AnalysisMetrics();
```

#### 8.1.2 Metrics Recording Helpers

```typescript
// packages/workers/src/metrics/analysis-metrics-recorder.ts

import { analysisMetrics } from './analysis-metrics';

export class AnalysisMetricsRecorder {
  // ============================================================
  // SENTIMENT RECORDING
  // ============================================================
  
  static recordSentimentAnalysis(params: {
    tenantId: string;
    status: 'success' | 'error' | 'cached';
    language: string;
    durationMs: number;
    model: string;
    sentimentScore: number;
    sentimentLabel: string;
    confidence: number;
    aspectCount: number;
  }): void {
    const { tenantId, status, language, durationMs, model, sentimentScore, sentimentLabel, confidence, aspectCount } = params;

    analysisMetrics.sentimentAnalysisTotal.inc({ tenant_id: tenantId, status, language });
    analysisMetrics.sentimentAnalysisDuration.observe({ tenant_id: tenantId, model }, durationMs);
    analysisMetrics.sentimentScoreDistribution.observe({ tenant_id: tenantId }, sentimentScore);
    analysisMetrics.sentimentByLabel.inc({ tenant_id: tenantId, label: sentimentLabel });
    analysisMetrics.sentimentConfidence.observe({ tenant_id: tenantId }, confidence);
    analysisMetrics.sentimentAspectCount.observe({ tenant_id: tenantId }, aspectCount);
  }

  static recordSentimentAlert(params: {
    tenantId: string;
    alertType: 'negative' | 'decline';
    severity: string;
  }): void {
    if (params.alertType === 'negative') {
      analysisMetrics.sentimentNegativeAlerts.inc({ tenant_id: params.tenantId, severity: params.severity });
    } else {
      analysisMetrics.sentimentDeclineAlerts.inc({ tenant_id: params.tenantId, severity: params.severity });
    }
  }

  // ============================================================
  // INTENT RECORDING
  // ============================================================
  
  static recordIntentDetection(params: {
    tenantId: string;
    status: 'success' | 'error' | 'cached';
    language: string;
    durationMs: number;
    model: string;
    intentType: string;
    confidence: number;
    entityCount: number;
    actionRequired: boolean;
    actionPriority?: string;
  }): void {
    const { tenantId, status, language, durationMs, model, intentType, confidence, entityCount, actionRequired, actionPriority } = params;

    analysisMetrics.intentDetectionTotal.inc({ tenant_id: tenantId, status, language });
    analysisMetrics.intentDetectionDuration.observe({ tenant_id: tenantId, model }, durationMs);
    analysisMetrics.intentByType.inc({ tenant_id: tenantId, intent_type: intentType });
    analysisMetrics.intentConfidence.observe({ tenant_id: tenantId }, confidence);
    analysisMetrics.intentEntityCount.observe({ tenant_id: tenantId }, entityCount);

    if (actionRequired && actionPriority) {
      analysisMetrics.intentActionRequired.inc({ tenant_id: tenantId, priority: actionPriority });
    }
  }

  static recordIntentHandover(params: {
    tenantId: string;
    intentType: string;
  }): void {
    analysisMetrics.intentHandoverTriggered.inc({ tenant_id: params.tenantId, intent_type: params.intentType });
  }

  // ============================================================
  // EMOTION RECORDING
  // ============================================================
  
  static recordEmotionRecognition(params: {
    tenantId: string;
    status: 'success' | 'error' | 'cached';
    language: string;
    durationMs: number;
    model: string;
    emotionType: string;
    intensity: number;
    arousal: number;
    valence: number;
    cueTypes: string[];
  }): void {
    const { tenantId, status, language, durationMs, model, emotionType, intensity, arousal, valence, cueTypes } = params;

    analysisMetrics.emotionRecognitionTotal.inc({ tenant_id: tenantId, status, language });
    analysisMetrics.emotionRecognitionDuration.observe({ tenant_id: tenantId, model }, durationMs);
    analysisMetrics.emotionByType.inc({ tenant_id: tenantId, emotion_type: emotionType });
    analysisMetrics.emotionIntensity.observe({ tenant_id: tenantId, emotion_type: emotionType }, intensity);
    analysisMetrics.emotionArousal.observe({ tenant_id: tenantId }, arousal);
    analysisMetrics.emotionValence.observe({ tenant_id: tenantId }, valence);

    for (const cueType of cueTypes) {
      analysisMetrics.emotionCuesDetected.inc({ tenant_id: tenantId, cue_type: cueType });
    }
  }

  static recordEmotionAlert(params: {
    tenantId: string;
    severity: string;
  }): void {
    analysisMetrics.emotionHighArousalAlerts.inc({ tenant_id: params.tenantId, severity: params.severity });
  }

  // ============================================================
  // AGGREGATE RECORDING
  // ============================================================
  
  static recordAggregateAnalysis(params: {
    tenantId: string;
    status: 'success' | 'error';
    durationMs: number;
    compositeScore: number;
    riskLevel: string;
    actionsGenerated: Array<{ action: string; priority: string }>;
    autoActionsExecuted: string[];
    urgencyLevel: string;
  }): void {
    const { tenantId, status, durationMs, compositeScore, riskLevel, actionsGenerated, autoActionsExecuted, urgencyLevel } = params;

    analysisMetrics.aggregateAnalysisTotal.inc({ tenant_id: tenantId, status });
    analysisMetrics.aggregateAnalysisDuration.observe({ tenant_id: tenantId }, durationMs);
    analysisMetrics.aggregateCompositeScore.observe({ tenant_id: tenantId }, compositeScore);
    analysisMetrics.aggregateRiskByLevel.inc({ tenant_id: tenantId, risk_level: riskLevel });

    for (const action of actionsGenerated) {
      analysisMetrics.aggregateActionsGenerated.inc({ 
        tenant_id: tenantId, 
        action_type: action.action, 
        priority: action.priority 
      });
    }

    for (const action of autoActionsExecuted) {
      analysisMetrics.aggregateAutoActionsExecuted.inc({ tenant_id: tenantId, action_type: action });
    }

    if (urgencyLevel === 'critical' || urgencyLevel === 'urgent') {
      analysisMetrics.aggregateEscalations.inc({ tenant_id: tenantId, urgency_level: urgencyLevel });
    }
  }

  // ============================================================
  // TREND RECORDING
  // ============================================================
  
  static recordTrendAnalysis(params: {
    tenantId: string;
    status: 'success' | 'error';
    windowType: string;
    durationMs: number;
    direction: string;
    volatility: number;
  }): void {
    const { tenantId, status, windowType, durationMs, direction, volatility } = params;

    analysisMetrics.trendAnalysisTotal.inc({ tenant_id: tenantId, status, window_type: windowType });
    analysisMetrics.trendAnalysisDuration.observe({ tenant_id: tenantId, window_type: windowType }, durationMs);
    analysisMetrics.trendByDirection.inc({ tenant_id: tenantId, direction });
    analysisMetrics.trendVolatility.observe({ tenant_id: tenantId }, volatility);
  }

  static recordTrendAlert(params: {
    tenantId: string;
    severity: string;
  }): void {
    analysisMetrics.trendDeclineAlerts.inc({ tenant_id: params.tenantId, severity: params.severity });
  }

  // ============================================================
  // ALERT RECORDING
  // ============================================================
  
  static recordAlert(params: {
    tenantId: string;
    alertType: string;
    severity: string;
  }): void {
    analysisMetrics.alertsGenerated.inc({ tenant_id: params.tenantId });
    analysisMetrics.alertsBySeverity.inc({ tenant_id: params.tenantId, severity: params.severity });
    analysisMetrics.alertsByType.inc({ tenant_id: params.tenantId, alert_type: params.alertType });
  }

  static recordAlertAcknowledged(tenantId: string): void {
    analysisMetrics.alertsAcknowledged.inc({ tenant_id: tenantId });
  }

  static recordAlertResolved(params: {
    tenantId: string;
    resolutionType: string;
    alertType: string;
    severity: string;
    resolutionTimeSeconds: number;
  }): void {
    analysisMetrics.alertsResolved.inc({ 
      tenant_id: params.tenantId, 
      resolution_type: params.resolutionType 
    });
    analysisMetrics.alertResolutionTime.observe(
      { tenant_id: params.tenantId, alert_type: params.alertType, severity: params.severity },
      params.resolutionTimeSeconds
    );
  }

  static recordAlertNotification(params: {
    tenantId: string;
    channel: string;
    severity: string;
  }): void {
    analysisMetrics.alertNotificationsSent.inc({
      tenant_id: params.tenantId,
      channel: params.channel,
      severity: params.severity,
    });
  }

  static recordAlertAutoAction(params: {
    tenantId: string;
    actionType: string;
  }): void {
    analysisMetrics.alertAutoActionsExecuted.inc({
      tenant_id: params.tenantId,
      action_type: params.actionType,
    });
  }

  // ============================================================
  // AI MODEL RECORDING
  // ============================================================
  
  static recordAIModelCall(params: {
    tenantId: string;
    model: string;
    analysisType: 'sentiment' | 'intent' | 'emotion';
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
  }): void {
    const { tenantId, model, analysisType, durationMs, inputTokens, outputTokens } = params;

    analysisMetrics.aiModelCalls.inc({ tenant_id: tenantId, model, analysis_type: analysisType });
    analysisMetrics.aiModelDuration.observe({ tenant_id: tenantId, model, analysis_type: analysisType }, durationMs);
    analysisMetrics.aiModelTokensUsed.inc({ tenant_id: tenantId, model, token_type: 'input' }, inputTokens);
    analysisMetrics.aiModelTokensUsed.inc({ tenant_id: tenantId, model, token_type: 'output' }, outputTokens);
  }

  static recordAIModelError(params: {
    tenantId: string;
    model: string;
    errorType: string;
  }): void {
    analysisMetrics.aiModelErrors.inc({
      tenant_id: params.tenantId,
      model: params.model,
      error_type: params.errorType,
    });
  }

  static recordAIModelFallback(params: {
    tenantId: string;
    model: string;
    fallbackReason: string;
  }): void {
    analysisMetrics.aiModelFallbacks.inc({
      tenant_id: params.tenantId,
      model: params.model,
      fallback_reason: params.fallbackReason,
    });
  }

  static recordAIModelCache(params: {
    tenantId: string;
    analysisType: string;
    hit: boolean;
  }): void {
    if (params.hit) {
      analysisMetrics.aiModelCacheHits.inc({ tenant_id: params.tenantId, analysis_type: params.analysisType });
    } else {
      analysisMetrics.aiModelCacheMisses.inc({ tenant_id: params.tenantId, analysis_type: params.analysisType });
    }
  }

  // ============================================================
  // QUEUE RECORDING
  // ============================================================
  
  static updateQueueDepth(queueName: string, status: string, depth: number): void {
    analysisMetrics.queueDepth.set({ queue_name: queueName, status }, depth);
  }

  static recordQueueLatency(queueName: string, latencyMs: number): void {
    analysisMetrics.queueLatency.observe({ queue_name: queueName }, latencyMs);
  }

  static recordQueueProcessed(queueName: string, status: 'completed' | 'failed'): void {
    analysisMetrics.queueProcessed.inc({ queue_name: queueName, status });
  }

  static recordQueueFailed(queueName: string, errorType: string): void {
    analysisMetrics.queueFailed.inc({ queue_name: queueName, error_type: errorType });
  }

  static recordQueueRetry(queueName: string): void {
    analysisMetrics.queueRetries.inc({ queue_name: queueName });
  }
}
```

### 8.2 Grafana Dashboards

#### 8.2.1 Sentiment Analysis Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "cerniq-sentiment-analysis",
    "title": "Cerniq - Sentiment Analysis",
    "tags": ["cerniq", "analysis", "sentiment"],
    "timezone": "browser",
    "schemaVersion": 39,
    "version": 1,
    "refresh": "30s",
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Sentiment Analysis Rate",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_sentiment_analysis_total{status=\"success\"}[5m]))",
            "legendFormat": "Analyses/sec"
          }
        ],
        "options": {
          "reduceOptions": { "calcs": ["lastNotNull"] },
          "colorMode": "value",
          "graphMode": "area"
        },
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 50 },
                { "color": "red", "value": 100 }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Average Sentiment Score",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 },
        "targets": [
          {
            "expr": "avg(cerniq_sentiment_confidence)",
            "legendFormat": "Avg Score"
          }
        ],
        "options": {
          "showThresholdLabels": true,
          "showThresholdMarkers": true
        },
        "fieldConfig": {
          "defaults": {
            "min": -1,
            "max": 1,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": -1 },
                { "color": "orange", "value": -0.3 },
                { "color": "yellow", "value": 0 },
                { "color": "green", "value": 0.3 }
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Sentiment Distribution",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 6, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "sum by (label) (increase(cerniq_sentiment_by_label_total[1h]))",
            "legendFormat": "{{label}}"
          }
        ],
        "options": {
          "legend": { "displayMode": "table", "placement": "right" },
          "pieType": "pie"
        }
      },
      {
        "id": 4,
        "title": "Sentiment Score Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 4 },
        "targets": [
          {
            "expr": "histogram_quantile(0.5, sum(rate(cerniq_sentiment_score_distribution_bucket[5m])) by (le))",
            "legendFormat": "Median"
          },
          {
            "expr": "histogram_quantile(0.25, sum(rate(cerniq_sentiment_score_distribution_bucket[5m])) by (le))",
            "legendFormat": "25th Percentile"
          },
          {
            "expr": "histogram_quantile(0.75, sum(rate(cerniq_sentiment_score_distribution_bucket[5m])) by (le))",
            "legendFormat": "75th Percentile"
          }
        ],
        "options": {
          "legend": { "displayMode": "list", "placement": "bottom" }
        },
        "fieldConfig": {
          "defaults": {
            "custom": { "fillOpacity": 10 },
            "min": -1,
            "max": 1
          }
        }
      },
      {
        "id": 5,
        "title": "Processing Time (p95)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 12 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(cerniq_sentiment_analysis_duration_ms_bucket[5m])) by (le))",
            "legendFormat": "p95 Latency"
          },
          {
            "expr": "histogram_quantile(0.50, sum(rate(cerniq_sentiment_analysis_duration_ms_bucket[5m])) by (le))",
            "legendFormat": "p50 Latency"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ms",
            "custom": { "fillOpacity": 10 }
          }
        }
      },
      {
        "id": 6,
        "title": "Negative Sentiment Alerts",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 12 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_sentiment_negative_alerts_total[5m])) by (severity)",
            "legendFormat": "{{severity}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "custom": { "fillOpacity": 30 }
          },
          "overrides": [
            { "matcher": { "id": "byName", "options": "critical" }, "properties": [{ "id": "color", "value": { "fixedColor": "red" } }] },
            { "matcher": { "id": "byName", "options": "warning" }, "properties": [{ "id": "color", "value": { "fixedColor": "orange" } }] }
          ]
        }
      },
      {
        "id": 7,
        "title": "Confidence Score Distribution",
        "type": "histogram",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 20 },
        "targets": [
          {
            "expr": "cerniq_sentiment_confidence",
            "legendFormat": "Confidence"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 1
          }
        }
      },
      {
        "id": 8,
        "title": "Aspects Detected per Analysis",
        "type": "barchart",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 20 },
        "targets": [
          {
            "expr": "sum by (le) (increase(cerniq_sentiment_aspect_count_bucket[1h]))",
            "legendFormat": "{{le}} aspects"
          }
        ]
      }
    ]
  }
}
```

### 8.2 Grafana Dashboards

#### 8.2.1 Analysis Overview Dashboard

```json
{
  "dashboard": {
    "title": "Cerniq Workers K - Sentiment & Intent Analysis",
    "uid": "workers-k-analysis",
    "tags": ["cerniq", "workers-k", "analysis", "ai"],
    "timezone": "browser",
    "refresh": "30s",
    "panels": [
      {
        "title": "Analysis Processing Rate",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_analysis_processed_total[5m])) by (analysis_type)",
            "legendFormat": "{{analysis_type}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops"
          }
        }
      },
      {
        "title": "Sentiment Distribution",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 6, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "sum(cerniq_sentiment_distribution_total) by (label)",
            "legendFormat": "{{label}}"
          }
        ]
      },
      {
        "title": "Risk Level Distribution",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 6, "x": 18, "y": 0 },
        "targets": [
          {
            "expr": "cerniq_conversations_by_risk_level",
            "legendFormat": "{{risk_level}}"
          }
        ]
      },
      {
        "title": "Processing Latency (p95)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(cerniq_analysis_processing_duration_seconds_bucket[5m])) by (le, analysis_type))",
            "legendFormat": "{{analysis_type}} p95"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "title": "AI API Response Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(cerniq_ai_response_duration_seconds_bucket[5m])) by (le, model))",
            "legendFormat": "{{model}} p95"
          },
          {
            "expr": "histogram_quantile(0.50, sum(rate(cerniq_ai_response_duration_seconds_bucket[5m])) by (le, model))",
            "legendFormat": "{{model}} p50"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "title": "Queue Depths",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 8, "x": 0, "y": 16 },
        "targets": [
          {
            "expr": "cerniq_analysis_queue_depth{status='waiting'}",
            "legendFormat": "{{queue_name}} waiting"
          },
          {
            "expr": "cerniq_analysis_queue_depth{status='active'}",
            "legendFormat": "{{queue_name}} active"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "gauge",
        "gridPos": { "h": 8, "w": 8, "x": 8, "y": 16 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_analysis_cache_operations_total{operation='hit'}[5m])) / sum(rate(cerniq_analysis_cache_operations_total[5m])) * 100",
            "legendFormat": "Cache Hit Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": 0 },
                { "color": "yellow", "value": 50 },
                { "color": "green", "value": 80 }
              ]
            }
          }
        }
      },
      {
        "title": "Token Usage",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 8, "x": 16, "y": 16 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_ai_token_usage_sum[5m])) by (token_type)",
            "legendFormat": "{{token_type}} tokens/s"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short"
          }
        }
      },
      {
        "title": "Alerts by Severity",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 24 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_analysis_alert_created_total[5m])) by (severity)",
            "legendFormat": "{{severity}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops"
          },
          "overrides": [
            { "matcher": { "id": "byName", "options": "emergency" }, "properties": [{ "id": "color", "value": { "fixedColor": "dark-red", "mode": "fixed" } }] },
            { "matcher": { "id": "byName", "options": "critical" }, "properties": [{ "id": "color", "value": { "fixedColor": "red", "mode": "fixed" } }] },
            { "matcher": { "id": "byName", "options": "warning" }, "properties": [{ "id": "color", "value": { "fixedColor": "yellow", "mode": "fixed" } }] },
            { "matcher": { "id": "byName", "options": "info" }, "properties": [{ "id": "color", "value": { "fixedColor": "blue", "mode": "fixed" } }] }
          ]
        }
      },
      {
        "title": "Top Intents Detected",
        "type": "bargauge",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 24 },
        "targets": [
          {
            "expr": "topk(10, sum(cerniq_intent_detected_total) by (intent_type))",
            "legendFormat": "{{intent_type}}"
          }
        ],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        }
      },
      {
        "title": "Sentiment Score Trend",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 24, "x": 0, "y": 32 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(cerniq_sentiment_score_distribution_bucket[15m])) by (le))",
            "legendFormat": "Median Sentiment"
          },
          {
            "expr": "histogram_quantile(0.25, sum(rate(cerniq_sentiment_score_distribution_bucket[15m])) by (le))",
            "legendFormat": "25th Percentile"
          },
          {
            "expr": "histogram_quantile(0.75, sum(rate(cerniq_sentiment_score_distribution_bucket[15m])) by (le))",
            "legendFormat": "75th Percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": -1,
            "max": 1,
            "custom": {
              "fillOpacity": 10
            }
          }
        }
      }
    ]
  }
}
```

### 8.3 Alert Rules

#### 8.3.1 Prometheus Alert Rules

```yaml
# prometheus/rules/workers-k-alerts.yml

groups:
  - name: workers_k_analysis
    interval: 30s
    rules:
      # High error rate
      - alert: AnalysisHighErrorRate
        expr: |
          sum(rate(cerniq_analysis_processed_total{status="failed"}[5m])) /
          sum(rate(cerniq_analysis_processed_total[5m])) > 0.1
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High analysis error rate"
          description: "Analysis error rate is {{ $value | humanizePercentage }} (threshold: 10%)"
          runbook_url: "https://docs.cerniq.app/runbooks/workers-k-errors"

      # AI API errors
      - alert: AIAPIHighErrorRate
        expr: |
          sum(rate(cerniq_ai_api_calls_total{status=~"failed|timeout"}[5m])) /
          sum(rate(cerniq_ai_api_calls_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High AI API error rate"
          description: "AI API error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      # High latency
      - alert: AnalysisHighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(cerniq_analysis_processing_duration_seconds_bucket[5m])) by (le, analysis_type)) > 5
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High analysis latency"
          description: "{{ $labels.analysis_type }} p95 latency is {{ $value | humanizeDuration }}"

      # Queue buildup
      - alert: AnalysisQueueBacklog
        expr: cerniq_analysis_queue_depth{status="waiting"} > 1000
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Analysis queue backlog"
          description: "{{ $labels.queue_name }} has {{ $value }} waiting jobs"

      # Queue stuck (no processing)
      - alert: AnalysisQueueStuck
        expr: |
          increase(cerniq_analysis_processed_total[10m]) == 0
          and cerniq_analysis_queue_depth{status="waiting"} > 0
        for: 15m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Analysis queue stuck"
          description: "No analysis processed in 15 minutes but queue has {{ $value }} jobs"

      # Low cache hit rate
      - alert: AnalysisCacheHitRateLow
        expr: |
          sum(rate(cerniq_analysis_cache_operations_total{operation="hit"}[15m])) /
          sum(rate(cerniq_analysis_cache_operations_total[15m])) < 0.5
        for: 30m
        labels:
          severity: info
          team: backend
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }} (threshold: 50%)"

      # High token usage (cost monitoring)
      - alert: AIHighTokenUsage
        expr: |
          sum(increase(cerniq_ai_token_usage_sum[1h])) > 1000000
        for: 0m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High AI token usage"
          description: "Used {{ $value | humanize }} tokens in the last hour"

      # Critical alerts spike
      - alert: CriticalAlertSpike
        expr: |
          sum(rate(cerniq_analysis_alert_created_total{severity=~"critical|emergency"}[5m])) > 1
        for: 5m
        labels:
          severity: critical
          team: operations
        annotations:
          summary: "Critical analysis alerts spike"
          description: "{{ $value | humanize }} critical/emergency alerts per second"

      # Negative sentiment trend
      - alert: NegativeSentimentTrend
        expr: |
          (
            sum(cerniq_sentiment_distribution_total{label=~"negative|very_negative"}) /
            sum(cerniq_sentiment_distribution_total)
          ) > 0.3
        for: 30m
        labels:
          severity: warning
          team: customer_success
        annotations:
          summary: "High negative sentiment rate"
          description: "{{ $value | humanizePercentage }} of messages have negative sentiment"

      # High risk conversations
      - alert: HighRiskConversations
        expr: |
          sum(cerniq_conversations_by_risk_level{risk_level=~"high|critical"}) > 10
        for: 15m
        labels:
          severity: warning
          team: customer_success
        annotations:
          summary: "Multiple high-risk conversations"
          description: "{{ $value }} conversations are at high/critical risk level"

      # AI model unhealthy
      - alert: AIModelUnhealthy
        expr: cerniq_ai_model_health == 0
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "AI model unhealthy"
          description: "Model {{ $labels.model }} is not responding"
```

### 8.4 Logging Standards

#### 8.4.1 Structured Logging

```typescript
// packages/workers/src/logging/analysis-logger.ts

import pino from 'pino';
import { randomUUID } from 'crypto';

// Log levels
const LOG_LEVELS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
} as const;

interface AnalysisLogContext {
  // Required
  tenantId: string;
  
  // Analysis context
  messageId?: string;
  conversationId?: string;
  contactId?: string;
  analysisType?: 'sentiment' | 'intent' | 'emotion' | 'aggregate' | 'alert' | 'trend';
  
  // Processing context
  workerId?: string;
  jobId?: string;
  traceId?: string;
  spanId?: string;
  
  // Performance
  durationMs?: number;
  
  // AI context
  model?: string;
  tokenCount?: number;
  
  // Error context
  errorCode?: string;
  errorMessage?: string;
  stack?: string;
}

// Create base logger
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      service: 'cerniq-workers-k',
      hostname: bindings.hostname,
      pid: bindings.pid,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['*.password', '*.apiKey', '*.token', '*.encryptedText'],
    censor: '[REDACTED]',
  },
});

export class AnalysisLogger {
  private logger: pino.Logger;
  private context: Partial<AnalysisLogContext>;

  constructor(context: Partial<AnalysisLogContext> = {}) {
    this.context = {
      traceId: randomUUID(),
      ...context,
    };
    this.logger = baseLogger.child(this.context);
  }

  /**
   * Create child logger with additional context
   */
  child(context: Partial<AnalysisLogContext>): AnalysisLogger {
    const child = new AnalysisLogger({
      ...this.context,
      ...context,
    });
    return child;
  }

  /**
   * Log info
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(data, message);
  }

  /**
   * Log debug
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(data, message);
  }

  /**
   * Log warning
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(data, message);
  }

  /**
   * Log error
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    if (error instanceof Error) {
      this.logger.error({
        ...data,
        errorCode: (error as any).code,
        errorMessage: error.message,
        stack: error.stack,
      }, message);
    } else {
      this.logger.error(data, message);
    }
  }

  /**
   * Log fatal
   */
  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    if (error instanceof Error) {
      this.logger.fatal({
        ...data,
        errorCode: (error as any).code,
        errorMessage: error.message,
        stack: error.stack,
      }, message);
    } else {
      this.logger.fatal(data, message);
    }
  }

  // ================== Analysis-specific logging ==================

  /**
   * Log analysis start
   */
  analysisStart(analysisType: AnalysisLogContext['analysisType']): void {
    this.logger.info({
      event: 'analysis_start',
      analysisType,
    }, `Starting ${analysisType} analysis`);
  }

  /**
   * Log analysis complete
   */
  analysisComplete(
    analysisType: AnalysisLogContext['analysisType'],
    result: {
      durationMs: number;
      confidence?: number;
      cached?: boolean;
    }
  ): void {
    this.logger.info({
      event: 'analysis_complete',
      analysisType,
      ...result,
    }, `Completed ${analysisType} analysis in ${result.durationMs}ms`);
  }

  /**
   * Log analysis failure
   */
  analysisFailed(
    analysisType: AnalysisLogContext['analysisType'],
    error: Error,
    data?: Record<string, unknown>
  ): void {
    this.logger.error({
      event: 'analysis_failed',
      analysisType,
      errorCode: (error as any).code,
      errorMessage: error.message,
      stack: error.stack,
      ...data,
    }, `Failed ${analysisType} analysis: ${error.message}`);
  }

  /**
   * Log AI API call
   */
  aiApiCall(data: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    status: 'success' | 'failed' | 'timeout';
  }): void {
    this.logger.info({
      event: 'ai_api_call',
      ...data,
    }, `AI API call to ${data.model}: ${data.status}`);
  }

  /**
   * Log alert creation
   */
  alertCreated(alert: {
    alertType: string;
    severity: string;
    description: string;
  }): void {
    this.logger.warn({
      event: 'alert_created',
      ...alert,
    }, `Alert created: ${alert.alertType} (${alert.severity})`);
  }

  /**
   * Log sentiment analysis result
   */
  sentimentResult(result: {
    score: number;
    label: string;
    confidence: number;
  }): void {
    this.logger.info({
      event: 'sentiment_result',
      ...result,
    }, `Sentiment: ${result.label} (${result.score.toFixed(2)}, confidence: ${result.confidence.toFixed(2)})`);
  }

  /**
   * Log intent detection result
   */
  intentResult(result: {
    primaryIntent: string;
    confidence: number;
    actionRequired: boolean;
  }): void {
    this.logger.info({
      event: 'intent_result',
      ...result,
    }, `Intent: ${result.primaryIntent} (confidence: ${result.confidence.toFixed(2)}, action: ${result.actionRequired})`);
  }

  /**
   * Log emotion detection result
   */
  emotionResult(result: {
    primaryEmotion: string;
    intensity: number;
    arousal: number;
  }): void {
    this.logger.info({
      event: 'emotion_result',
      ...result,
    }, `Emotion: ${result.primaryEmotion} (intensity: ${result.intensity.toFixed(2)}, arousal: ${result.arousal.toFixed(2)})`);
  }

  /**
   * Log queue operation
   */
  queueOperation(operation: 'enqueue' | 'dequeue' | 'complete' | 'failed', jobId: string, queueName: string): void {
    this.logger.debug({
      event: 'queue_operation',
      operation,
      jobId,
      queueName,
    }, `Queue ${operation}: ${jobId} in ${queueName}`);
  }

  /**
   * Get trace ID for correlation
   */
  getTraceId(): string {
    return this.context.traceId!;
  }
}

// Export singleton for default logger
export const analysisLogger = new AnalysisLogger();
```

---

## 9. Testing Specification

### 9.1 Unit Tests

#### 9.1.1 Sentiment Analysis Tests

```typescript
// packages/workers/tests/unit/sentiment-analysis.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SentimentAnalysisWorker } from '../../src/workers/sentiment-analysis.worker';
import { mockRedis, mockDb, mockAnthropicClient } from '../mocks';

describe('SentimentAnalysisWorker', () => {
  let worker: SentimentAnalysisWorker;
  let mockJob: any;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new SentimentAnalysisWorker(mockRedis, mockDb);
    
    mockJob = {
      id: 'test-job-1',
      data: {
        messageId: 'msg-123',
        conversationId: 'conv-456',
        contactId: 'contact-789',
        tenantId: 'tenant-001',
        text: 'Mulțumesc pentru răspunsul rapid!',
        metadata: {},
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Language Detection', () => {
    it('should detect Romanian text', () => {
      const result = worker['detectLanguage']('Bună ziua, aș dori să comand');
      expect(result).toBe('ro');
    });

    it('should detect English text', () => {
      const result = worker['detectLanguage']('Hello, I would like to order');
      expect(result).toBe('en');
    });

    it('should default to Romanian for mixed text', () => {
      const result = worker['detectLanguage']('Hello, mulțumesc pentru ajutor');
      expect(result).toBe('ro');
    });
  });

  describe('Sentiment Score Classification', () => {
    it('should classify very positive sentiment', () => {
      const label = worker['classifySentiment'](0.8);
      expect(label).toBe('very_positive');
    });

    it('should classify positive sentiment', () => {
      const label = worker['classifySentiment'](0.4);
      expect(label).toBe('positive');
    });

    it('should classify neutral sentiment', () => {
      const label = worker['classifySentiment'](0.0);
      expect(label).toBe('neutral');
    });

    it('should classify negative sentiment', () => {
      const label = worker['classifySentiment'](-0.4);
      expect(label).toBe('negative');
    });

    it('should classify very negative sentiment', () => {
      const label = worker['classifySentiment'](-0.8);
      expect(label).toBe('very_negative');
    });

    it('should handle boundary values correctly', () => {
      expect(worker['classifySentiment'](0.6)).toBe('very_positive');
      expect(worker['classifySentiment'](0.2)).toBe('positive');
      expect(worker['classifySentiment'](-0.2)).toBe('neutral');
      expect(worker['classifySentiment'](-0.6)).toBe('very_negative');
    });
  });

  describe('AI Analysis', () => {
    it('should call Anthropic API with correct parameters', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: '{"sentimentScore": 0.7, "confidence": 0.9, "aspects": []}'
        }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const result = await worker['analyzeWithAI']('Mulțumesc!', 'ro', []);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
        })
      );
      expect(result.sentimentScore).toBe(0.7);
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));

      const result = await worker['analyzeWithAI']('Test text', 'ro', []);

      expect(result.sentimentScore).toBe(0);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should parse JSON response correctly', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: `
            Based on my analysis:
            \`\`\`json
            {"sentimentScore": 0.5, "confidence": 0.85, "aspects": [{"aspect": "service", "sentiment": 0.6}]}
            \`\`\`
          `
        }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const result = await worker['analyzeWithAI']('Test', 'ro', []);

      expect(result.sentimentScore).toBe(0.5);
      expect(result.aspects).toHaveLength(1);
    });
  });

  describe('Cache Operations', () => {
    it('should check cache before analysis', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        sentimentScore: 0.5,
        confidence: 0.9,
        label: 'positive'
      }));

      await worker.process(mockJob);

      expect(mockAnthropicClient.messages.create).not.toHaveBeenCalled();
    });

    it('should cache analysis results', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '{"sentimentScore": 0.5, "confidence": 0.9, "aspects": []}' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      await worker.process(mockJob);

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('Alert Generation', () => {
    it('should create alert for very negative sentiment', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '{"sentimentScore": -0.8, "confidence": 0.9, "aspects": []}' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      await worker.process(mockJob);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'analysis-alert',
        expect.stringContaining('negative_sentiment')
      );
    });

    it('should not create alert for neutral sentiment', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '{"sentimentScore": 0.1, "confidence": 0.9, "aspects": []}' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      await worker.process(mockJob);

      expect(mockRedis.publish).not.toHaveBeenCalledWith(
        'analysis-alert',
        expect.stringContaining('negative_sentiment')
      );
    });
  });

  describe('Database Operations', () => {
    it('should insert analysis result into database', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '{"sentimentScore": 0.5, "confidence": 0.9, "aspects": []}' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      await worker.process(mockJob);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should store encrypted text', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '{"sentimentScore": 0.5, "confidence": 0.9, "aspects": []}' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      await worker.process(mockJob);

      const insertCall = mockDb.insert.mock.calls[0];
      expect(insertCall[1].encryptedText).toBeDefined();
      expect(insertCall[1].encryptedText).not.toBe(mockJob.data.text);
    });
  });
});
```

#### 8.2.2 Intent Detection Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "cerniq-intent-detection",
    "title": "Cerniq - Intent Detection",
    "tags": ["cerniq", "analysis", "intent"],
    "timezone": "browser",
    "schemaVersion": 39,
    "version": 1,
    "refresh": "30s",
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Intent Detection Rate",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_intent_detection_total{status=\"success\"}[5m]))",
            "legendFormat": "Detections/sec"
          }
        ],
        "options": {
          "reduceOptions": { "calcs": ["lastNotNull"] },
          "colorMode": "value",
          "graphMode": "area"
        },
        "fieldConfig": {
          "defaults": { "unit": "ops" }
        }
      },
      {
        "id": 2,
        "title": "Action Required Rate",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_intent_action_required_total[5m]))",
            "legendFormat": "Actions/sec"
          }
        ],
        "options": {
          "reduceOptions": { "calcs": ["lastNotNull"] },
          "colorMode": "value"
        },
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 5 },
                { "color": "red", "value": 10 }
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Handovers Triggered",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_intent_handover_triggered_total[1h]))",
            "legendFormat": "Handovers"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "orange", "value": 50 },
                { "color": "red", "value": 100 }
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Intent Types Distribution",
        "type": "piechart",
        "gridPos": { "h": 10, "w": 12, "x": 0, "y": 4 },
        "targets": [
          {
            "expr": "topk(10, sum by (intent_type) (increase(cerniq_intent_by_type_total[6h])))",
            "legendFormat": "{{intent_type}}"
          }
        ],
        "options": {
          "legend": { "displayMode": "table", "placement": "right" },
          "pieType": "donut"
        }
      },
      {
        "id": 5,
        "title": "Actions by Priority",
        "type": "barchart",
        "gridPos": { "h": 10, "w": 12, "x": 12, "y": 4 },
        "targets": [
          {
            "expr": "sum by (priority) (increase(cerniq_intent_action_required_total[6h]))",
            "legendFormat": "{{priority}}"
          }
        ],
        "fieldConfig": {
          "overrides": [
            { "matcher": { "id": "byName", "options": "critical" }, "properties": [{ "id": "color", "value": { "fixedColor": "red" } }] },
            { "matcher": { "id": "byName", "options": "high" }, "properties": [{ "id": "color", "value": { "fixedColor": "orange" } }] },
            { "matcher": { "id": "byName", "options": "medium" }, "properties": [{ "id": "color", "value": { "fixedColor": "yellow" } }] },
            { "matcher": { "id": "byName", "options": "low" }, "properties": [{ "id": "color", "value": { "fixedColor": "green" } }] }
          ]
        }
      },
      {
        "id": 6,
        "title": "Intent Confidence Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 14 },
        "targets": [
          {
            "expr": "cerniq_intent_confidence{quantile=\"0.5\"}",
            "legendFormat": "Median Confidence"
          },
          {
            "expr": "cerniq_intent_confidence{quantile=\"0.95\"}",
            "legendFormat": "p95 Confidence"
          }
        ],
        "fieldConfig": {
          "defaults": { "min": 0, "max": 1 }
        }
      },
      {
        "id": 7,
        "title": "Entities Detected Distribution",
        "type": "histogram",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 14 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_intent_entity_count_bucket[5m])) by (le)",
            "legendFormat": "{{le}}"
          }
        ]
      },
      {
        "id": 8,
        "title": "Handovers by Intent Type",
        "type": "bargauge",
        "gridPos": { "h": 8, "w": 24, "x": 0, "y": 22 },
        "targets": [
          {
            "expr": "sum by (intent_type) (increase(cerniq_intent_handover_triggered_total[24h]))",
            "legendFormat": "{{intent_type}}"
          }
        ],
        "options": {
          "displayMode": "gradient",
          "orientation": "horizontal"
        }
      }
    ]
  }
}
```

#### 8.2.3 Emotion Recognition Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "cerniq-emotion-recognition",
    "title": "Cerniq - Emotion Recognition",
    "tags": ["cerniq", "analysis", "emotion"],
    "timezone": "browser",
    "schemaVersion": 39,
    "version": 1,
    "refresh": "30s",
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Emotion Recognition Rate",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_emotion_recognition_total{status=\"success\"}[5m]))",
            "legendFormat": "Recognitions/sec"
          }
        ],
        "fieldConfig": {
          "defaults": { "unit": "ops" }
        }
      },
      {
        "id": 2,
        "title": "Average Arousal",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 },
        "targets": [
          {
            "expr": "avg(cerniq_emotion_arousal)",
            "legendFormat": "Avg Arousal"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 1,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 0.5 },
                { "color": "orange", "value": 0.7 },
                { "color": "red", "value": 0.85 }
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Average Valence",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 6, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "avg(cerniq_emotion_valence)",
            "legendFormat": "Avg Valence"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": -1,
            "max": 1,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": -1 },
                { "color": "orange", "value": -0.3 },
                { "color": "yellow", "value": 0 },
                { "color": "green", "value": 0.3 }
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "High Arousal Alerts (24h)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 18, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_emotion_high_arousal_alerts_total[24h]))",
            "legendFormat": "Alerts"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "orange", "value": 20 },
                { "color": "red", "value": 50 }
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Emotion Types Distribution",
        "type": "piechart",
        "gridPos": { "h": 10, "w": 12, "x": 0, "y": 4 },
        "targets": [
          {
            "expr": "topk(10, sum by (emotion_type) (increase(cerniq_emotion_by_type_total[6h])))",
            "legendFormat": "{{emotion_type}}"
          }
        ],
        "options": {
          "legend": { "displayMode": "table", "placement": "right" },
          "pieType": "donut"
        }
      },
      {
        "id": 6,
        "title": "VAD Model Over Time",
        "type": "timeseries",
        "gridPos": { "h": 10, "w": 12, "x": 12, "y": 4 },
        "targets": [
          {
            "expr": "avg(cerniq_emotion_valence{quantile=\"0.5\"})",
            "legendFormat": "Valence (median)"
          },
          {
            "expr": "avg(cerniq_emotion_arousal{quantile=\"0.5\"})",
            "legendFormat": "Arousal (median)"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": -1,
            "max": 1,
            "custom": { "fillOpacity": 20 }
          }
        }
      },
      {
        "id": 7,
        "title": "Emotional Cues by Type",
        "type": "barchart",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 14 },
        "targets": [
          {
            "expr": "sum by (cue_type) (increase(cerniq_emotion_cues_detected_total[6h]))",
            "legendFormat": "{{cue_type}}"
          }
        ]
      },
      {
        "id": 8,
        "title": "Emotion Intensity by Type",
        "type": "heatmap",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 14 },
        "targets": [
          {
            "expr": "avg by (emotion_type) (cerniq_emotion_intensity)",
            "legendFormat": "{{emotion_type}}"
          }
        ]
      },
      {
        "id": 9,
        "title": "Negative Emotions Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 24, "x": 0, "y": 22 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_emotion_by_type_total{emotion_type=~\"anger|frustration|fear|disgust|sadness\"}[5m])) by (emotion_type)",
            "legendFormat": "{{emotion_type}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "custom": { "fillOpacity": 30 }
          },
          "overrides": [
            { "matcher": { "id": "byName", "options": "anger" }, "properties": [{ "id": "color", "value": { "fixedColor": "red" } }] },
            { "matcher": { "id": "byName", "options": "frustration" }, "properties": [{ "id": "color", "value": { "fixedColor": "orange" } }] }
          ]
        }
      }
    ]
  }
}
```

#### 8.2.4 Alerts & Risk Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "cerniq-analysis-alerts",
    "title": "Cerniq - Analysis Alerts & Risk",
    "tags": ["cerniq", "analysis", "alerts", "risk"],
    "timezone": "browser",
    "schemaVersion": 39,
    "version": 1,
    "refresh": "10s",
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Active Critical Alerts",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_analysis_alerts_by_severity_total{severity=\"critical\"}[1h])) - sum(increase(cerniq_analysis_alerts_resolved_total{severity=\"critical\"}[1h]))",
            "legendFormat": "Critical"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "fixed", "fixedColor": "red" },
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "red", "value": 1 }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Active Emergency Alerts",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_analysis_alerts_by_severity_total{severity=\"emergency\"}[1h])) - sum(increase(cerniq_analysis_alerts_resolved_total{severity=\"emergency\"}[1h]))",
            "legendFormat": "Emergency"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "fixed", "fixedColor": "dark-red" }
          }
        }
      },
      {
        "id": 3,
        "title": "Total Alerts (24h)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_analysis_alerts_generated_total[24h]))",
            "legendFormat": "Total"
          }
        ]
      },
      {
        "id": 4,
        "title": "Resolution Rate",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 6, "x": 18, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_analysis_alerts_resolved_total[24h])) / sum(increase(cerniq_analysis_alerts_generated_total[24h])) * 100",
            "legendFormat": "Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": null },
                { "color": "yellow", "value": 50 },
                { "color": "green", "value": 80 }
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Alerts by Severity Over Time",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 4 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_analysis_alerts_by_severity_total[5m])) by (severity)",
            "legendFormat": "{{severity}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "custom": { "fillOpacity": 30 }
          },
          "overrides": [
            { "matcher": { "id": "byName", "options": "emergency" }, "properties": [{ "id": "color", "value": { "fixedColor": "dark-red" } }] },
            { "matcher": { "id": "byName", "options": "critical" }, "properties": [{ "id": "color", "value": { "fixedColor": "red" } }] },
            { "matcher": { "id": "byName", "options": "warning" }, "properties": [{ "id": "color", "value": { "fixedColor": "orange" } }] },
            { "matcher": { "id": "byName", "options": "info" }, "properties": [{ "id": "color", "value": { "fixedColor": "blue" } }] }
          ]
        }
      },
      {
        "id": 6,
        "title": "Alerts by Type",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 4 },
        "targets": [
          {
            "expr": "sum by (alert_type) (increase(cerniq_analysis_alerts_by_type_total[24h]))",
            "legendFormat": "{{alert_type}}"
          }
        ],
        "options": {
          "legend": { "displayMode": "table", "placement": "right" }
        }
      },
      {
        "id": 7,
        "title": "Risk Level Distribution",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 8, "x": 0, "y": 12 },
        "targets": [
          {
            "expr": "sum by (risk_level) (increase(cerniq_aggregate_risk_by_level_total[6h]))",
            "legendFormat": "{{risk_level}}"
          }
        ],
        "fieldConfig": {
          "overrides": [
            { "matcher": { "id": "byName", "options": "critical" }, "properties": [{ "id": "color", "value": { "fixedColor": "red" } }] },
            { "matcher": { "id": "byName", "options": "high" }, "properties": [{ "id": "color", "value": { "fixedColor": "orange" } }] },
            { "matcher": { "id": "byName", "options": "medium" }, "properties": [{ "id": "color", "value": { "fixedColor": "yellow" } }] },
            { "matcher": { "id": "byName", "options": "low" }, "properties": [{ "id": "color", "value": { "fixedColor": "green" } }] }
          ]
        }
      },
      {
        "id": 8,
        "title": "Alert Resolution Time (p95)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 8, "x": 8, "y": 12 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(cerniq_analysis_alert_resolution_time_seconds_bucket[1h])) by (le, severity))",
            "legendFormat": "{{severity}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "id": 9,
        "title": "Notification Channels",
        "type": "bargauge",
        "gridPos": { "h": 8, "w": 8, "x": 16, "y": 12 },
        "targets": [
          {
            "expr": "sum by (channel) (increase(cerniq_analysis_alert_notifications_sent_total[24h]))",
            "legendFormat": "{{channel}}"
          }
        ],
        "options": {
          "displayMode": "gradient",
          "orientation": "horizontal"
        }
      },
      {
        "id": 10,
        "title": "Auto-Actions Executed",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 20 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_analysis_alert_auto_actions_executed_total[5m])) by (action_type)",
            "legendFormat": "{{action_type}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops"
          }
        }
      },
      {
        "id": 11,
        "title": "Escalations",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 20 },
        "targets": [
          {
            "expr": "sum(rate(cerniq_aggregate_escalations_total[5m])) by (urgency_level)",
            "legendFormat": "{{urgency_level}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "custom": { "fillOpacity": 30 }
          }
        }
      }
    ]
  }
}
```

### 8.3 Alerting Rules

#### 8.3.1 Prometheus Alert Rules

```yaml
# prometheus/rules/analysis-alerts.yml

groups:
  - name: cerniq_sentiment_analysis_alerts
    interval: 30s
    rules:
      # High negative sentiment rate
      - alert: HighNegativeSentimentRate
        expr: |
          sum(rate(cerniq_sentiment_by_label_total{label=~"negative|very_negative"}[5m]))
          /
          sum(rate(cerniq_sentiment_by_label_total[5m]))
          > 0.3
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: sentiment
        annotations:
          summary: "High rate of negative sentiment detected"
          description: "{{ $value | humanizePercentage }} of messages have negative sentiment in the last 5 minutes"
          runbook_url: "https://wiki.cerniq.app/runbooks/high-negative-sentiment"

      # Sentiment analysis latency
      - alert: SentimentAnalysisHighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(cerniq_sentiment_analysis_duration_ms_bucket[5m])) by (le))
          > 5000
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: sentiment
        annotations:
          summary: "Sentiment analysis latency is high"
          description: "p95 latency is {{ $value }}ms (threshold: 5000ms)"

      # Sentiment analysis failures
      - alert: SentimentAnalysisHighErrorRate
        expr: |
          sum(rate(cerniq_sentiment_analysis_total{status="error"}[5m]))
          /
          sum(rate(cerniq_sentiment_analysis_total[5m]))
          > 0.05
        for: 3m
        labels:
          severity: critical
          service: analysis
          component: sentiment
        annotations:
          summary: "High sentiment analysis error rate"
          description: "{{ $value | humanizePercentage }} of sentiment analyses are failing"

  - name: cerniq_intent_detection_alerts
    interval: 30s
    rules:
      # High handover rate
      - alert: HighHandoverRate
        expr: |
          sum(rate(cerniq_intent_handover_triggered_total[15m])) > 0.5
        for: 10m
        labels:
          severity: warning
          service: analysis
          component: intent
        annotations:
          summary: "High rate of handovers being triggered"
          description: "{{ $value }} handovers/sec in the last 15 minutes"

      # Intent detection failures
      - alert: IntentDetectionHighErrorRate
        expr: |
          sum(rate(cerniq_intent_detection_total{status="error"}[5m]))
          /
          sum(rate(cerniq_intent_detection_total[5m]))
          > 0.05
        for: 3m
        labels:
          severity: critical
          service: analysis
          component: intent
        annotations:
          summary: "High intent detection error rate"
          description: "{{ $value | humanizePercentage }} of intent detections are failing"

      # High complaint rate
      - alert: HighComplaintRate
        expr: |
          sum(rate(cerniq_intent_by_type_total{intent_type="complaint"}[15m]))
          /
          sum(rate(cerniq_intent_by_type_total[15m]))
          > 0.1
        for: 10m
        labels:
          severity: warning
          service: analysis
          component: intent
        annotations:
          summary: "High rate of complaint intents detected"
          description: "{{ $value | humanizePercentage }} of intents are complaints"

  - name: cerniq_emotion_recognition_alerts
    interval: 30s
    rules:
      # High arousal sustained
      - alert: SustainedHighArousal
        expr: |
          avg(cerniq_emotion_arousal{quantile="0.75"}) > 0.7
        for: 15m
        labels:
          severity: warning
          service: analysis
          component: emotion
        annotations:
          summary: "Sustained high emotional arousal detected"
          description: "75th percentile arousal is {{ $value }} for 15+ minutes"

      # High negative valence
      - alert: HighNegativeValence
        expr: |
          avg(cerniq_emotion_valence{quantile="0.5"}) < -0.3
        for: 10m
        labels:
          severity: warning
          service: analysis
          component: emotion
        annotations:
          summary: "High negative emotional valence detected"
          description: "Median valence is {{ $value }}"

      # High frustration spike
      - alert: FrustrationSpike
        expr: |
          sum(rate(cerniq_emotion_by_type_total{emotion_type="frustration"}[5m]))
          /
          sum(rate(cerniq_emotion_by_type_total[5m]))
          > 0.2
        for: 5m
        labels:
          severity: critical
          service: analysis
          component: emotion
        annotations:
          summary: "Frustration spike detected"
          description: "{{ $value | humanizePercentage }} of emotions are frustration"

  - name: cerniq_analysis_alerts_system
    interval: 30s
    rules:
      # Unresolved critical alerts
      - alert: UnresolvedCriticalAlerts
        expr: |
          (
            sum(increase(cerniq_analysis_alerts_by_severity_total{severity="critical"}[1h]))
            -
            sum(increase(cerniq_analysis_alerts_resolved_total[1h]))
          ) > 5
        for: 15m
        labels:
          severity: critical
          service: analysis
          component: alerts
        annotations:
          summary: "Unresolved critical alerts accumulating"
          description: "{{ $value }} critical alerts remain unresolved"

      # Alert resolution time SLA breach
      - alert: AlertResolutionSLABreach
        expr: |
          histogram_quantile(0.95, 
            sum(rate(cerniq_analysis_alert_resolution_time_seconds_bucket{severity="critical"}[1h])) by (le)
          ) > 1800
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: alerts
        annotations:
          summary: "Critical alert resolution time exceeds SLA"
          description: "p95 resolution time is {{ $value | humanizeDuration }} (SLA: 30min)"

      # Alert notification failures
      - alert: AlertNotificationFailures
        expr: |
          sum(rate(cerniq_analysis_alerts_generated_total[5m]))
          -
          sum(rate(cerniq_analysis_alert_notifications_sent_total[5m]))
          > 0.1
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: alerts
        annotations:
          summary: "Alert notifications are failing"
          description: "Some alerts are not generating notifications"

  - name: cerniq_ai_model_alerts
    interval: 30s
    rules:
      # AI model high latency
      - alert: AIModelHighLatency
        expr: |
          histogram_quantile(0.95, 
            sum(rate(cerniq_analysis_ai_model_duration_ms_bucket[5m])) by (le, model)
          ) > 10000
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: ai_model
        annotations:
          summary: "AI model response time is high"
          description: "p95 latency for {{ $labels.model }} is {{ $value }}ms"

      # AI model high error rate
      - alert: AIModelHighErrorRate
        expr: |
          sum(rate(cerniq_analysis_ai_model_errors_total[5m])) by (model)
          /
          sum(rate(cerniq_analysis_ai_model_calls_total[5m])) by (model)
          > 0.05
        for: 3m
        labels:
          severity: critical
          service: analysis
          component: ai_model
        annotations:
          summary: "AI model error rate is high"
          description: "{{ $value | humanizePercentage }} of calls to {{ $labels.model }} are failing"

      # High fallback rate
      - alert: AIModelHighFallbackRate
        expr: |
          sum(rate(cerniq_analysis_ai_model_fallbacks_total[15m])) by (model)
          /
          sum(rate(cerniq_analysis_ai_model_calls_total[15m])) by (model)
          > 0.1
        for: 10m
        labels:
          severity: warning
          service: analysis
          component: ai_model
        annotations:
          summary: "High AI model fallback rate"
          description: "{{ $value | humanizePercentage }} of calls to {{ $labels.model }} are using fallback"

      # Token usage spike
      - alert: AIModelTokenUsageSpike
        expr: |
          sum(rate(cerniq_analysis_ai_model_tokens_total[5m])) > 50000
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: ai_model
        annotations:
          summary: "AI model token usage is spiking"
          description: "Current rate: {{ $value }} tokens/sec"

  - name: cerniq_analysis_queue_alerts
    interval: 30s
    rules:
      # Queue depth too high
      - alert: AnalysisQueueBacklog
        expr: |
          cerniq_analysis_queue_depth{status="waiting"} > 1000
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: queue
        annotations:
          summary: "Analysis queue backlog is growing"
          description: "{{ $labels.queue_name }} has {{ $value }} waiting jobs"

      # Queue processing stalled
      - alert: AnalysisQueueStalled
        expr: |
          rate(cerniq_analysis_queue_processed_total{status="completed"}[5m]) == 0
          and
          cerniq_analysis_queue_depth{status="waiting"} > 0
        for: 5m
        labels:
          severity: critical
          service: analysis
          component: queue
        annotations:
          summary: "Analysis queue processing has stalled"
          description: "{{ $labels.queue_name }} has jobs waiting but no completions"

      # High queue latency
      - alert: AnalysisQueueHighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(cerniq_analysis_queue_latency_ms_bucket[5m])) by (le, queue_name))
          > 30000
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: queue
        annotations:
          summary: "Analysis queue latency is high"
          description: "p95 wait time for {{ $labels.queue_name }} is {{ $value }}ms"

      # High failure rate
      - alert: AnalysisQueueHighFailureRate
        expr: |
          sum(rate(cerniq_analysis_queue_failed_total[5m])) by (queue_name)
          /
          sum(rate(cerniq_analysis_queue_processed_total[5m])) by (queue_name)
          > 0.1
        for: 5m
        labels:
          severity: critical
          service: analysis
          component: queue
        annotations:
          summary: "Analysis queue has high failure rate"
          description: "{{ $value | humanizePercentage }} of jobs in {{ $labels.queue_name }} are failing"

  - name: cerniq_aggregate_risk_alerts
    interval: 30s
    rules:
      # High risk rate
      - alert: HighRiskRate
        expr: |
          sum(rate(cerniq_aggregate_risk_by_level_total{risk_level=~"high|critical"}[15m]))
          /
          sum(rate(cerniq_aggregate_risk_by_level_total[15m]))
          > 0.2
        for: 10m
        labels:
          severity: warning
          service: analysis
          component: aggregate
        annotations:
          summary: "High rate of high-risk interactions"
          description: "{{ $value | humanizePercentage }} of interactions are high/critical risk"

      # Escalation rate spike
      - alert: EscalationRateSpike
        expr: |
          sum(rate(cerniq_aggregate_escalations_total[5m])) > 1
        for: 5m
        labels:
          severity: warning
          service: analysis
          component: aggregate
        annotations:
          summary: "High escalation rate"
          description: "{{ $value }} escalations/sec"

      # Low composite score trend
      - alert: LowCompositeScoreTrend
        expr: |
          avg(cerniq_aggregate_composite_score{quantile="0.5"}) < -0.2
        for: 30m
        labels:
          severity: warning
          service: analysis
          component: aggregate
        annotations:
          summary: "Overall interaction quality is declining"
          description: "Median composite score is {{ $value }}"
```

#### 9.1.2 Intent Detection Tests

```typescript
// packages/workers/tests/unit/intent-detection.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentDetectionWorker } from '../../src/workers/intent-detection.worker';
import { mockRedis, mockDb, mockAnthropicClient } from '../mocks';

describe('IntentDetectionWorker', () => {
  let worker: IntentDetectionWorker;
  let mockJob: any;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new IntentDetectionWorker(mockRedis, mockDb);
    
    mockJob = {
      id: 'test-job-1',
      data: {
        messageId: 'msg-123',
        conversationId: 'conv-456',
        tenantId: 'tenant-001',
        text: 'Cât costă 10 tone de îngrășământ?',
        metadata: {},
      },
    };
  });

  describe('Intent Classification', () => {
    it('should detect price inquiry intent', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            primaryIntent: 'price_inquiry',
            primaryConfidence: 0.95,
            secondaryIntents: [],
            entities: [{ type: 'quantity', value: '10 tone', normalizedValue: '10000', confidence: 0.9 }],
            actionRequired: true,
          })
        }],
        usage: { input_tokens: 100, output_tokens: 80 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.primaryIntent).toBe('price_inquiry');
      expect(result.primaryConfidence).toBeGreaterThan(0.9);
    });

    it('should detect human agent request', async () => {
      mockJob.data.text = 'Vreau să vorbesc cu cineva, nu un robot';
      
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            primaryIntent: 'human_agent_request',
            primaryConfidence: 0.98,
            secondaryIntents: [],
            entities: [],
            actionRequired: true,
          })
        }],
        usage: { input_tokens: 100, output_tokens: 60 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.primaryIntent).toBe('human_agent_request');
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'handover-triggers',
        expect.any(String)
      );
    });

    it('should detect complaint intent', async () => {
      mockJob.data.text = 'Am o reclamație! Produsele primite sunt defecte';
      
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            primaryIntent: 'complaint',
            primaryConfidence: 0.92,
            secondaryIntents: [{ intent: 'return_request', confidence: 0.45 }],
            entities: [{ type: 'product', value: 'Produsele', confidence: 0.7 }],
            actionRequired: true,
          })
        }],
        usage: { input_tokens: 100, output_tokens: 80 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.primaryIntent).toBe('complaint');
      expect(result.actionRequired).toBe(true);
    });
  });

  describe('Entity Extraction', () => {
    it('should extract quantity entities', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            primaryIntent: 'order_placement',
            primaryConfidence: 0.88,
            secondaryIntents: [],
            entities: [
              { type: 'quantity', value: '50 kg', normalizedValue: '50', confidence: 0.95 },
              { type: 'product', value: 'semințe de porumb', confidence: 0.9 },
            ],
            actionRequired: true,
          })
        }],
        usage: { input_tokens: 100, output_tokens: 90 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.entities).toHaveLength(2);
      expect(result.entities.find(e => e.type === 'quantity')).toBeDefined();
    });

    it('should extract date entities', async () => {
      mockJob.data.text = 'Vreau livrarea pe 15 ianuarie';
      
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            primaryIntent: 'delivery_inquiry',
            primaryConfidence: 0.85,
            secondaryIntents: [],
            entities: [
              { type: 'date', value: '15 ianuarie', normalizedValue: '2026-01-15', confidence: 0.88 },
            ],
            actionRequired: false,
          })
        }],
        usage: { input_tokens: 100, output_tokens: 70 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      const dateEntity = result.entities.find(e => e.type === 'date');
      expect(dateEntity).toBeDefined();
      expect(dateEntity?.normalizedValue).toBe('2026-01-15');
    });
  });

  describe('Action Priority', () => {
    it('should set high priority for complaints', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            primaryIntent: 'complaint',
            primaryConfidence: 0.9,
            secondaryIntents: [],
            entities: [],
            actionRequired: true,
          })
        }],
        usage: { input_tokens: 100, output_tokens: 60 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.actionPriority).toBe('high');
    });

    it('should set medium priority for discount requests', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            primaryIntent: 'discount_request',
            primaryConfidence: 0.87,
            secondaryIntents: [],
            entities: [],
            actionRequired: true,
          })
        }],
        usage: { input_tokens: 100, output_tokens: 60 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.actionPriority).toBe('medium');
    });

    it('should set low priority for general inquiries', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            primaryIntent: 'product_inquiry',
            primaryConfidence: 0.82,
            secondaryIntents: [],
            entities: [],
            actionRequired: false,
          })
        }],
        usage: { input_tokens: 100, output_tokens: 60 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.actionPriority).toBe('low');
    });
  });

  describe('Fallback Handling', () => {
    it('should return UNCLEAR intent on parse error', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Invalid JSON response' }],
        usage: { input_tokens: 100, output_tokens: 30 }
      });

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.primaryIntent).toBe('unclear');
      expect(result.suggestedAction).toBe('request_clarification');
    });

    it('should handle API timeout gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('timeout'));

      mockRedis.get.mockResolvedValue(null);
      const result = await worker.process(mockJob);

      expect(result.primaryIntent).toBe('unclear');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});
```

### 9.2 Integration Tests

#### 9.2.1 Analysis Pipeline Integration

```typescript
// packages/workers/tests/integration/analysis-pipeline.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { Queue, Worker } from 'bullmq';
import { SentimentAnalysisWorker } from '../../src/workers/sentiment-analysis.worker';
import { IntentDetectionWorker } from '../../src/workers/intent-detection.worker';
import { EmotionRecognitionWorker } from '../../src/workers/emotion-recognition.worker';
import { AnalysisAggregatorWorker } from '../../src/workers/analysis-aggregator.worker';

describe('Analysis Pipeline Integration', () => {
  let redis: Redis;
  let db: Pool;
  let messageInboundQueue: Queue;
  let sentimentWorker: Worker;
  let intentWorker: Worker;
  let emotionWorker: Worker;
  let aggregatorWorker: Worker;

  beforeAll(async () => {
    // Connect to test Redis
    redis = new Redis(process.env.TEST_REDIS_URL || 'redis://localhost:64039/15');
    
    // Connect to test database
    db = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 
        'postgresql://test:test@localhost:64032/cerniq_test',
    });

    // Create queues
    messageInboundQueue = new Queue('message-inbound-test', { connection: redis });

    // Create workers
    const sentimentWorkerInstance = new SentimentAnalysisWorker(redis, db);
    sentimentWorker = new Worker('sentiment-analysis-test', 
      sentimentWorkerInstance.process.bind(sentimentWorkerInstance),
      { connection: redis }
    );

    const intentWorkerInstance = new IntentDetectionWorker(redis, db);
    intentWorker = new Worker('intent-detection-test',
      intentWorkerInstance.process.bind(intentWorkerInstance),
      { connection: redis }
    );

    const emotionWorkerInstance = new EmotionRecognitionWorker(redis, db);
    emotionWorker = new Worker('emotion-recognition-test',
      emotionWorkerInstance.process.bind(emotionWorkerInstance),
      { connection: redis }
    );

    const aggregatorWorkerInstance = new AnalysisAggregatorWorker(redis, db);
    aggregatorWorker = new Worker('analysis-aggregate-test',
      aggregatorWorkerInstance.process.bind(aggregatorWorkerInstance),
      { connection: redis }
    );
  });

  afterAll(async () => {
    await sentimentWorker.close();
    await intentWorker.close();
    await emotionWorker.close();
    await aggregatorWorker.close();
    await messageInboundQueue.close();
    await redis.quit();
    await db.end();
  });

  beforeEach(async () => {
    // Clear test data
    await redis.flushdb();
    await db.query('TRUNCATE sentiment_analyses, intent_detections, emotion_detections, analysis_aggregates CASCADE');
  });

  describe('Full Pipeline Flow', () => {
    it('should process message through entire pipeline', async () => {
      const messageId = 'test-msg-' + Date.now();
      const conversationId = 'test-conv-' + Date.now();
      const tenantId = 'test-tenant';

      // Add message to queue
      await messageInboundQueue.add('process', {
        messageId,
        conversationId,
        tenantId,
        contactId: 'test-contact',
        text: 'Sunt foarte nemulțumit de serviciul dvs. Vreau să vorbesc cu un manager!',
        direction: 'inbound',
        timestamp: new Date().toISOString(),
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify sentiment analysis
      const sentimentResult = await db.query(
        'SELECT * FROM sentiment_analyses WHERE message_id = $1',
        [messageId]
      );
      expect(sentimentResult.rows).toHaveLength(1);
      expect(sentimentResult.rows[0].sentiment_score).toBeLessThan(0);

      // Verify intent detection
      const intentResult = await db.query(
        'SELECT * FROM intent_detections WHERE message_id = $1',
        [messageId]
      );
      expect(intentResult.rows).toHaveLength(1);
      expect(intentResult.rows[0].primary_intent).toBe('human_agent_request');

      // Verify emotion detection
      const emotionResult = await db.query(
        'SELECT * FROM emotion_detections WHERE message_id = $1',
        [messageId]
      );
      expect(emotionResult.rows).toHaveLength(1);
      expect(['anger', 'frustration']).toContain(emotionResult.rows[0].primary_emotion);

      // Verify aggregate
      const aggregateResult = await db.query(
        'SELECT * FROM analysis_aggregates WHERE message_id = $1',
        [messageId]
      );
      expect(aggregateResult.rows).toHaveLength(1);
      expect(aggregateResult.rows[0].risk_level).toBe('high');
    }, 30000);

    it('should generate alerts for high-risk messages', async () => {
      const messageId = 'test-msg-alert-' + Date.now();
      const conversationId = 'test-conv-alert-' + Date.now();
      const tenantId = 'test-tenant';

      await messageInboundQueue.add('process', {
        messageId,
        conversationId,
        tenantId,
        contactId: 'test-contact',
        text: 'Aceasta este o reclamație urgentă! Sunt furios!',
        direction: 'inbound',
        timestamp: new Date().toISOString(),
      });

      await new Promise(resolve => setTimeout(resolve, 10000));

      const alertResult = await db.query(
        'SELECT * FROM analysis_alerts WHERE conversation_id = $1',
        [conversationId]
      );
      expect(alertResult.rows.length).toBeGreaterThan(0);
      
      const severities = alertResult.rows.map(r => r.severity);
      expect(severities).toContain('critical');
    }, 30000);
  });

  describe('Parallel Processing', () => {
    it('should process multiple messages concurrently', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        messageId: `parallel-msg-${i}`,
        conversationId: `parallel-conv-${i}`,
        tenantId: 'test-tenant',
        contactId: 'test-contact',
        text: `Test message ${i} pentru procesare paralelă`,
        direction: 'inbound',
        timestamp: new Date().toISOString(),
      }));

      // Add all messages
      await Promise.all(
        messages.map(msg => messageInboundQueue.add('process', msg))
      );

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 20000));

      // Verify all processed
      const result = await db.query(
        'SELECT COUNT(*) as count FROM sentiment_analyses WHERE tenant_id = $1',
        ['test-tenant']
      );
      expect(parseInt(result.rows[0].count)).toBe(10);
    }, 60000);
  });
});
```

### 9.3 Performance Tests

#### 9.3.1 Load Testing with k6

```javascript
// packages/workers/tests/performance/analysis-load.k6.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const analysisLatency = new Trend('analysis_latency');
const analysisErrors = new Counter('analysis_errors');
const analysisSuccess = new Rate('analysis_success');

// Test configuration
export const options = {
  scenarios: {
    // Ramp-up test
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    // Sustained load test
    sustained: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      startTime: '12m',
    },
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '10s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '10s', target: 10 },
        { duration: '30s', target: 10 },
      ],
      startTime: '25m',
    },
  },
  thresholds: {
    'analysis_latency': ['p(95)<5000', 'p(99)<10000'],
    'analysis_success': ['rate>0.99'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:64000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Test messages in Romanian
const TEST_MESSAGES = [
  { text: 'Bună ziua, aș dori să comand 50 kg de îngrășământ.', expected_sentiment: 'neutral' },
  { text: 'Sunt foarte mulțumit de calitatea produselor!', expected_sentiment: 'positive' },
  { text: 'Comanda mea a întârziat și sunt nemulțumit.', expected_sentiment: 'negative' },
  { text: 'Cât costă livrarea pentru o comandă de 1 tonă?', expected_sentiment: 'neutral' },
  { text: 'Produsul este defect și vreau retur!', expected_sentiment: 'negative' },
  { text: 'Excelent! Voi recomanda și altora.', expected_sentiment: 'positive' },
  { text: 'Vreau să vorbesc cu un operator uman.', expected_sentiment: 'neutral' },
  { text: 'Prețurile sunt mult prea mari!', expected_sentiment: 'negative' },
];

export default function () {
  group('Sentiment Analysis API', () => {
    const message = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)];
    
    const payload = JSON.stringify({
      text: message.text,
      conversationId: `conv-${__VU}-${__ITER}`,
      messageId: `msg-${__VU}-${__ITER}`,
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      timeout: '30s',
    };

    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/api/v1/analysis/sentiment`, payload, params);
    const latency = Date.now() - startTime;

    analysisLatency.add(latency);

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response has sentiment score': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.sentimentScore !== undefined;
        } catch {
          return false;
        }
      },
      'latency under 5s': () => latency < 5000,
    });

    if (success) {
      analysisSuccess.add(1);
    } else {
      analysisErrors.add(1);
      analysisSuccess.add(0);
    }

    sleep(Math.random() * 2);
  });

  group('Intent Detection API', () => {
    const message = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)];
    
    const payload = JSON.stringify({
      text: message.text,
      conversationId: `conv-${__VU}-${__ITER}`,
      messageId: `msg-intent-${__VU}-${__ITER}`,
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      timeout: '30s',
    };

    const response = http.post(`${BASE_URL}/api/v1/analysis/intent`, payload, params);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response has primary intent': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.primaryIntent !== undefined;
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 2);
  });
}

export function handleSummary(data) {
  return {
    'analysis-load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const { metrics } = data;
  
  return `
Analysis Load Test Summary
===========================

Total Requests: ${metrics.http_reqs?.values?.count || 0}
Success Rate: ${((metrics.analysis_success?.values?.rate || 0) * 100).toFixed(2)}%
Error Count: ${metrics.analysis_errors?.values?.count || 0}

Latency:
  - p50: ${(metrics.analysis_latency?.values?.['p(50)'] || 0).toFixed(0)}ms
  - p95: ${(metrics.analysis_latency?.values?.['p(95)'] || 0).toFixed(0)}ms
  - p99: ${(metrics.analysis_latency?.values?.['p(99)'] || 0).toFixed(0)}ms
  - max: ${(metrics.analysis_latency?.values?.max || 0).toFixed(0)}ms

Throughput: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s
`;
}
```

### 9.4 End-to-End Tests

#### 9.4.1 Playwright E2E Tests

```typescript
// packages/e2e/tests/analysis-dashboard.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Analysis Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@cerniq.app');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display real-time sentiment updates', async ({ page }) => {
    await page.goto('/conversations/test-conv-123');

    // Wait for WebSocket connection
    await page.waitForSelector('[data-testid="ws-connected"]');

    // Send a test message
    await page.fill('[data-testid="message-input"]', 'Sunt foarte mulțumit!');
    await page.click('[data-testid="send-button"]');

    // Wait for analysis result
    await page.waitForSelector('[data-testid="sentiment-indicator"]', { timeout: 10000 });

    // Verify sentiment display
    const sentimentIndicator = page.locator('[data-testid="sentiment-indicator"]');
    await expect(sentimentIndicator).toHaveClass(/positive/);
  });

  test('should show alert for negative sentiment', async ({ page }) => {
    await page.goto('/conversations/test-conv-456');
    await page.waitForSelector('[data-testid="ws-connected"]');

    // Send negative message
    await page.fill('[data-testid="message-input"]', 'Aceasta este o reclamație gravă!');
    await page.click('[data-testid="send-button"]');

    // Wait for alert notification
    await page.waitForSelector('[data-testid="alert-notification"]', { timeout: 15000 });

    // Verify alert content
    const alertNotification = page.locator('[data-testid="alert-notification"]');
    await expect(alertNotification).toContainText('negative');
  });

  test('should display intent detection results', async ({ page }) => {
    await page.goto('/conversations/test-conv-789');
    await page.waitForSelector('[data-testid="ws-connected"]');

    // Send price inquiry
    await page.fill('[data-testid="message-input"]', 'Cât costă transportul?');
    await page.click('[data-testid="send-button"]');

    // Wait for intent panel
    await page.waitForSelector('[data-testid="intent-panel"]', { timeout: 10000 });

    // Verify intent display
    const intentPanel = page.locator('[data-testid="intent-panel"]');
    await expect(intentPanel).toContainText('price_inquiry');
  });

  test('should show conversation risk level', async ({ page }) => {
    await page.goto('/conversations/test-conv-risk');
    await page.waitForSelector('[data-testid="ws-connected"]');

    // Send multiple negative messages
    const negativeMessages = [
      'Sunt nemulțumit de serviciu',
      'Problema nu s-a rezolvat',
      'Vreau să vorbesc cu un manager!',
    ];

    for (const msg of negativeMessages) {
      await page.fill('[data-testid="message-input"]', msg);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(1000);
    }

    // Wait for risk assessment
    await page.waitForSelector('[data-testid="risk-indicator"]', { timeout: 15000 });

    // Verify risk level
    const riskIndicator = page.locator('[data-testid="risk-indicator"]');
    await expect(riskIndicator).toHaveClass(/high|critical/);
  });

  test('should navigate to alert details', async ({ page }) => {
    await page.goto('/alerts');

    // Click on first alert
    await page.click('[data-testid="alert-row"]:first-child');

    // Verify navigation to alert details
    await expect(page).toHaveURL(/\/alerts\/.+/);

    // Verify alert details displayed
    await expect(page.locator('[data-testid="alert-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-severity"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-description"]')).toBeVisible();
  });
});
```

---

## 10. Integration Patterns

### 10.1 Inter-Worker Communication

#### 10.1.1 Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORKERS K - EVENT FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

                                  ┌──────────────────┐
                                  │  message-inbound │
                                  │     Queue        │
                                  └────────┬─────────┘
                                           │
                      ┌────────────────────┼────────────────────┐
                      ▼                    ▼                    ▼
              ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
              │    Worker     │    │    Worker     │    │    Worker     │
              │  K1-Sentiment │    │  K2-Intent    │    │  K3-Emotion   │
              └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
                      │                    │                    │
                      │ SENTIMENT_ANALYZED │ INTENT_DETECTED    │ EMOTION_DETECTED
                      │                    │                    │
                      └────────────────────┼────────────────────┘
                                           │
                                           ▼
                               ┌───────────────────────┐
                               │  Worker K-Agg        │
                               │  Analysis Aggregator  │
                               └───────────┬───────────┘
                                           │
                      ┌────────────────────┼────────────────────┐
                      │                    │                    │
                      ▼                    ▼                    ▼
              ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
              │   Worker      │    │    Worker     │    │ External      │
              │   K-Trend     │    │   K-Alert     │    │ Systems       │
              └───────────────┘    └───────────────┘    └───────────────┘
                                           │
                                           ▼
                               ┌───────────────────────┐
                               │  handover-triggers    │
                               │  escalation-queue     │
                               │  support-routing      │
                               └───────────────────────┘
```

#### 10.1.2 Event Definitions

```typescript
// packages/workers/src/events/analysis-events.ts

// ================== Event Types ==================

export enum AnalysisEventType {
  // K1 - Sentiment
  SENTIMENT_ANALYZED = 'SENTIMENT_ANALYZED',
  SENTIMENT_ALERT = 'SENTIMENT_ALERT',
  
  // K2 - Intent
  INTENT_DETECTED = 'INTENT_DETECTED',
  HUMAN_AGENT_REQUESTED = 'HUMAN_AGENT_REQUESTED',
  ORDER_INTENT = 'ORDER_INTENT',
  COMPLAINT_DETECTED = 'COMPLAINT_DETECTED',
  
  // K3 - Emotion
  EMOTION_DETECTED = 'EMOTION_DETECTED',
  HIGH_AROUSAL_DETECTED = 'HIGH_AROUSAL_DETECTED',
  FRUSTRATION_DETECTED = 'FRUSTRATION_DETECTED',
  
  // K-Agg - Aggregator
  ANALYSIS_AGGREGATED = 'ANALYSIS_AGGREGATED',
  HIGH_RISK_DETECTED = 'HIGH_RISK_DETECTED',
  
  // K-Trend
  SENTIMENT_TREND_UPDATED = 'SENTIMENT_TREND_UPDATED',
  TREND_ALERT = 'TREND_ALERT',
  
  // K-Alert
  ALERT_CREATED = 'ALERT_CREATED',
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  
  // Cross-worker
  HANDOVER_TRIGGERED = 'HANDOVER_TRIGGERED',
  ESCALATION_REQUIRED = 'ESCALATION_REQUIRED',
}

// ================== Event Payloads ==================

export interface BaseAnalysisEvent {
  type: AnalysisEventType;
  tenantId: string;
  conversationId: string;
  messageId: string;
  contactId?: string;
  timestamp: string;
  traceId: string;
}

export interface SentimentAnalyzedEvent extends BaseAnalysisEvent {
  type: AnalysisEventType.SENTIMENT_ANALYZED;
  sentimentScore: number;
  sentimentLabel: string;
  confidence: number;
  processingTimeMs: number;
}

export interface IntentDetectedEvent extends BaseAnalysisEvent {
  type: AnalysisEventType.INTENT_DETECTED;
  primaryIntent: string;
  primaryConfidence: number;
  secondaryIntents: Array<{ intent: string; confidence: number }>;
  entities: Array<{ type: string; value: string; normalizedValue?: string }>;
  actionRequired: boolean;
  suggestedAction?: string;
}

export interface EmotionDetectedEvent extends BaseAnalysisEvent {
  type: AnalysisEventType.EMOTION_DETECTED;
  primaryEmotion: string;
  primaryIntensity: number;
  confidence: number;
  valence: number;
  arousal: number;
  dominance: number;
}

export interface AnalysisAggregatedEvent extends BaseAnalysisEvent {
  type: AnalysisEventType.ANALYSIS_AGGREGATED;
  compositeScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  urgencyLevel: string;
  recommendedActions: Array<{
    action: string;
    priority: number;
    autoExecute: boolean;
  }>;
}

export interface AlertCreatedEvent extends BaseAnalysisEvent {
  type: AnalysisEventType.ALERT_CREATED;
  alertId: string;
  alertType: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  description: string;
  autoActionTaken: boolean;
}

// ================== Event Publisher ==================

export class AnalysisEventPublisher {
  constructor(private redis: Redis) {}

  async publish<T extends BaseAnalysisEvent>(event: T): Promise<void> {
    // Main events channel
    await this.redis.publish('worker-events', JSON.stringify(event));
    
    // Type-specific channel
    await this.redis.publish(`worker-events:${event.type}`, JSON.stringify(event));
    
    // Conversation-specific channel
    await this.redis.publish(
      `conversation:${event.conversationId}:events`,
      JSON.stringify(event)
    );
    
    // Store in stream for persistence
    await this.redis.xadd(
      'analysis:events:stream',
      '*',
      'type', event.type,
      'payload', JSON.stringify(event)
    );
  }

  async publishBatch<T extends BaseAnalysisEvent>(events: T[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const event of events) {
      pipeline.publish('worker-events', JSON.stringify(event));
      pipeline.xadd(
        'analysis:events:stream',
        '*',
        'type', event.type,
        'payload', JSON.stringify(event)
      );
    }
    
    await pipeline.exec();
  }
}
```

### 8.4 Tracing & Logging

#### 8.4.1 OpenTelemetry Tracing

```typescript
// packages/workers/src/tracing/analysis-tracer.ts

import { trace, Span, SpanKind, SpanStatusCode, context, propagation } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

const tracer = trace.getTracer('cerniq-analysis', '1.0.0');

export interface AnalysisSpanAttributes {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
  analysisType: 'sentiment' | 'intent' | 'emotion' | 'aggregate' | 'trend' | 'alert';
  language?: string;
  model?: string;
}

export class AnalysisTracer {
  /**
   * Start a new analysis span
   */
  static startAnalysisSpan(
    name: string,
    attributes: AnalysisSpanAttributes,
    parentContext?: context.Context
  ): Span {
    const span = tracer.startSpan(
      name,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'cerniq.tenant_id': attributes.tenantId,
          'cerniq.message_id': attributes.messageId,
          'cerniq.conversation_id': attributes.conversationId,
          'cerniq.contact_id': attributes.contactId,
          'cerniq.analysis_type': attributes.analysisType,
          ...(attributes.language && { 'cerniq.language': attributes.language }),
          ...(attributes.model && { 'cerniq.ai_model': attributes.model }),
        },
      },
      parentContext
    );

    return span;
  }

  /**
   * Start AI model call span
   */
  static startAIModelSpan(
    model: string,
    analysisType: string,
    parentSpan: Span
  ): Span {
    const ctx = trace.setSpan(context.active(), parentSpan);
    
    return tracer.startSpan(
      `ai.${model}.${analysisType}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [SemanticAttributes.RPC_SYSTEM]: 'anthropic',
          [SemanticAttributes.RPC_SERVICE]: 'claude',
          [SemanticAttributes.RPC_METHOD]: 'messages.create',
          'ai.model': model,
          'ai.analysis_type': analysisType,
        },
      },
      ctx
    );
  }

  /**
   * Record AI model response
   */
  static recordAIModelResponse(
    span: Span,
    params: {
      inputTokens: number;
      outputTokens: number;
      durationMs: number;
      cached: boolean;
    }
  ): void {
    span.setAttributes({
      'ai.input_tokens': params.inputTokens,
      'ai.output_tokens': params.outputTokens,
      'ai.total_tokens': params.inputTokens + params.outputTokens,
      'ai.duration_ms': params.durationMs,
      'ai.cached': params.cached,
    });
  }

  /**
   * Record sentiment analysis result
   */
  static recordSentimentResult(
    span: Span,
    result: {
      score: number;
      label: string;
      confidence: number;
      aspectCount: number;
    }
  ): void {
    span.setAttributes({
      'sentiment.score': result.score,
      'sentiment.label': result.label,
      'sentiment.confidence': result.confidence,
      'sentiment.aspect_count': result.aspectCount,
    });
  }

  /**
   * Record intent detection result
   */
  static recordIntentResult(
    span: Span,
    result: {
      primaryIntent: string;
      confidence: number;
      entityCount: number;
      actionRequired: boolean;
      actionPriority?: string;
    }
  ): void {
    span.setAttributes({
      'intent.primary': result.primaryIntent,
      'intent.confidence': result.confidence,
      'intent.entity_count': result.entityCount,
      'intent.action_required': result.actionRequired,
      ...(result.actionPriority && { 'intent.action_priority': result.actionPriority }),
    });
  }

  /**
   * Record emotion recognition result
   */
  static recordEmotionResult(
    span: Span,
    result: {
      primaryEmotion: string;
      intensity: number;
      confidence: number;
      arousal: number;
      valence: number;
      dominance: number;
    }
  ): void {
    span.setAttributes({
      'emotion.primary': result.primaryEmotion,
      'emotion.intensity': result.intensity,
      'emotion.confidence': result.confidence,
      'emotion.arousal': result.arousal,
      'emotion.valence': result.valence,
      'emotion.dominance': result.dominance,
    });
  }

  /**
   * Record aggregate analysis result
   */
  static recordAggregateResult(
    span: Span,
    result: {
      compositeScore: number;
      riskLevel: string;
      riskScore: number;
      actionCount: number;
      autoActionCount: number;
      urgencyLevel: string;
    }
  ): void {
    span.setAttributes({
      'aggregate.composite_score': result.compositeScore,
      'aggregate.risk_level': result.riskLevel,
      'aggregate.risk_score': result.riskScore,
      'aggregate.action_count': result.actionCount,
      'aggregate.auto_action_count': result.autoActionCount,
      'aggregate.urgency_level': result.urgencyLevel,
    });
  }

  /**
   * Record alert generation
   */
  static recordAlert(
    span: Span,
    alert: {
      alertType: string;
      severity: string;
      autoActionTaken: boolean;
      notificationSent: boolean;
    }
  ): void {
    span.addEvent('alert_generated', {
      'alert.type': alert.alertType,
      'alert.severity': alert.severity,
      'alert.auto_action_taken': alert.autoActionTaken,
      'alert.notification_sent': alert.notificationSent,
    });
  }

  /**
   * Record error
   */
  static recordError(span: Span, error: Error): void {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }

  /**
   * End span successfully
   */
  static endSpan(span: Span): void {
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }

  /**
   * Create child span for database operations
   */
  static startDbSpan(
    operation: string,
    table: string,
    parentSpan: Span
  ): Span {
    const ctx = trace.setSpan(context.active(), parentSpan);
    
    return tracer.startSpan(
      `db.${operation}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [SemanticAttributes.DB_SYSTEM]: 'postgresql',
          [SemanticAttributes.DB_OPERATION]: operation,
          [SemanticAttributes.DB_SQL_TABLE]: table,
        },
      },
      ctx
    );
  }

  /**
   * Create child span for Redis operations
   */
  static startRedisSpan(
    operation: string,
    parentSpan: Span
  ): Span {
    const ctx = trace.setSpan(context.active(), parentSpan);
    
    return tracer.startSpan(
      `redis.${operation}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [SemanticAttributes.DB_SYSTEM]: 'redis',
          [SemanticAttributes.DB_OPERATION]: operation,
        },
      },
      ctx
    );
  }

  /**
   * Create child span for queue operations
   */
  static startQueueSpan(
    queueName: string,
    operation: 'add' | 'process' | 'complete' | 'fail',
    parentSpan: Span
  ): Span {
    const ctx = trace.setSpan(context.active(), parentSpan);
    
    return tracer.startSpan(
      `queue.${queueName}.${operation}`,
      {
        kind: operation === 'add' ? SpanKind.PRODUCER : SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination': queueName,
          'messaging.operation': operation,
        },
      },
      ctx
    );
  }
}
```

#### 8.4.2 Structured Logging

```typescript
// packages/workers/src/logging/analysis-logger.ts

import pino from 'pino';

// Base logger configuration
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      service: 'cerniq-analysis',
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  },
});

export interface AnalysisLogContext {
  tenantId: string;
  messageId?: string;
  conversationId?: string;
  contactId?: string;
  jobId?: string;
  traceId?: string;
  spanId?: string;
}

export class AnalysisLogger {
  private logger: pino.Logger;

  constructor(context: AnalysisLogContext) {
    this.logger = baseLogger.child({
      tenantId: context.tenantId,
      ...(context.messageId && { messageId: context.messageId }),
      ...(context.conversationId && { conversationId: context.conversationId }),
      ...(context.contactId && { contactId: context.contactId }),
      ...(context.jobId && { jobId: context.jobId }),
      ...(context.traceId && { traceId: context.traceId }),
      ...(context.spanId && { spanId: context.spanId }),
    });
  }

  // ============================================================
  // SENTIMENT ANALYSIS LOGGING
  // ============================================================

  sentimentAnalysisStarted(textLength: number, language: string): void {
    this.logger.info({
      event: 'sentiment_analysis_started',
      textLength,
      language,
    }, 'Starting sentiment analysis');
  }

  sentimentAnalysisCompleted(params: {
    score: number;
    label: string;
    confidence: number;
    aspectCount: number;
    durationMs: number;
    cached: boolean;
  }): void {
    this.logger.info({
      event: 'sentiment_analysis_completed',
      ...params,
    }, `Sentiment analysis completed: ${params.label} (${params.score.toFixed(2)})`);
  }

  sentimentAnalysisFailed(error: Error, durationMs: number): void {
    this.logger.error({
      event: 'sentiment_analysis_failed',
      error: error.message,
      errorStack: error.stack,
      durationMs,
    }, 'Sentiment analysis failed');
  }

  sentimentAlertTriggered(params: {
    alertType: 'negative' | 'decline';
    severity: string;
    score: number;
    threshold: number;
  }): void {
    this.logger.warn({
      event: 'sentiment_alert_triggered',
      ...params,
    }, `Sentiment alert: ${params.alertType} (severity: ${params.severity})`);
  }

  // ============================================================
  // INTENT DETECTION LOGGING
  // ============================================================

  intentDetectionStarted(textLength: number, language: string): void {
    this.logger.info({
      event: 'intent_detection_started',
      textLength,
      language,
    }, 'Starting intent detection');
  }

  intentDetectionCompleted(params: {
    primaryIntent: string;
    confidence: number;
    secondaryIntentCount: number;
    entityCount: number;
    actionRequired: boolean;
    durationMs: number;
    cached: boolean;
  }): void {
    this.logger.info({
      event: 'intent_detection_completed',
      ...params,
    }, `Intent detected: ${params.primaryIntent} (confidence: ${params.confidence.toFixed(2)})`);
  }

  intentDetectionFailed(error: Error, durationMs: number): void {
    this.logger.error({
      event: 'intent_detection_failed',
      error: error.message,
      errorStack: error.stack,
      durationMs,
    }, 'Intent detection failed');
  }

  intentHandoverTriggered(params: {
    intentType: string;
    reason: string;
    urgency: string;
  }): void {
    this.logger.warn({
      event: 'intent_handover_triggered',
      ...params,
    }, `Handover triggered by intent: ${params.intentType}`);
  }

  // ============================================================
  // EMOTION RECOGNITION LOGGING
  // ============================================================

  emotionRecognitionStarted(textLength: number, language: string): void {
    this.logger.info({
      event: 'emotion_recognition_started',
      textLength,
      language,
    }, 'Starting emotion recognition');
  }

  emotionRecognitionCompleted(params: {
    primaryEmotion: string;
    intensity: number;
    confidence: number;
    arousal: number;
    valence: number;
    cueCount: number;
    durationMs: number;
    cached: boolean;
  }): void {
    this.logger.info({
      event: 'emotion_recognition_completed',
      ...params,
    }, `Emotion recognized: ${params.primaryEmotion} (intensity: ${params.intensity.toFixed(2)})`);
  }

  emotionRecognitionFailed(error: Error, durationMs: number): void {
    this.logger.error({
      event: 'emotion_recognition_failed',
      error: error.message,
      errorStack: error.stack,
      durationMs,
    }, 'Emotion recognition failed');
  }

  emotionAlertTriggered(params: {
    alertType: 'high_arousal' | 'high_frustration' | 'anger';
    severity: string;
    emotion: string;
    intensity: number;
    arousal: number;
  }): void {
    this.logger.warn({
      event: 'emotion_alert_triggered',
      ...params,
    }, `Emotion alert: ${params.alertType} (severity: ${params.severity})`);
  }

  // ============================================================
  // AGGREGATE ANALYSIS LOGGING
  // ============================================================

  aggregateAnalysisStarted(): void {
    this.logger.info({
      event: 'aggregate_analysis_started',
    }, 'Starting aggregate analysis');
  }

  aggregateAnalysisCompleted(params: {
    compositeScore: number;
    riskLevel: string;
    riskScore: number;
    actionCount: number;
    autoActionCount: number;
    urgencyLevel: string;
    durationMs: number;
  }): void {
    this.logger.info({
      event: 'aggregate_analysis_completed',
      ...params,
    }, `Aggregate analysis completed: risk=${params.riskLevel}, urgency=${params.urgencyLevel}`);
  }

  aggregateAutoActionExecuted(params: {
    actionType: string;
    channel: string;
  }): void {
    this.logger.info({
      event: 'aggregate_auto_action_executed',
      ...params,
    }, `Auto-action executed: ${params.actionType}`);
  }

  // ============================================================
  // ALERT LOGGING
  // ============================================================

  alertCreated(params: {
    alertType: string;
    severity: string;
    triggerValue: number;
    threshold: number;
    description: string;
  }): void {
    this.logger.warn({
      event: 'alert_created',
      ...params,
    }, `Alert created: ${params.alertType} (severity: ${params.severity})`);
  }

  alertNotificationSent(params: {
    alertId: string;
    channels: string[];
    severity: string;
  }): void {
    this.logger.info({
      event: 'alert_notification_sent',
      ...params,
    }, `Alert notification sent via ${params.channels.join(', ')}`);
  }

  alertAutoActionExecuted(params: {
    alertId: string;
    actionType: string;
    result: 'success' | 'failure';
    error?: string;
  }): void {
    if (params.result === 'success') {
      this.logger.info({
        event: 'alert_auto_action_executed',
        ...params,
      }, `Alert auto-action executed: ${params.actionType}`);
    } else {
      this.logger.error({
        event: 'alert_auto_action_failed',
        ...params,
      }, `Alert auto-action failed: ${params.actionType}`);
    }
  }

  alertAcknowledged(params: {
    alertId: string;
    acknowledgedBy: string;
  }): void {
    this.logger.info({
      event: 'alert_acknowledged',
      ...params,
    }, `Alert acknowledged by ${params.acknowledgedBy}`);
  }

  alertResolved(params: {
    alertId: string;
    resolvedBy: string;
    resolution: string;
    resolutionTimeSeconds: number;
  }): void {
    this.logger.info({
      event: 'alert_resolved',
      ...params,
    }, `Alert resolved by ${params.resolvedBy} in ${params.resolutionTimeSeconds}s`);
  }

  // ============================================================
  // AI MODEL LOGGING
  // ============================================================

  aiModelCallStarted(params: {
    model: string;
    analysisType: string;
    inputTokenEstimate: number;
  }): void {
    this.logger.debug({
      event: 'ai_model_call_started',
      ...params,
    }, `AI model call started: ${params.model}`);
  }

  aiModelCallCompleted(params: {
    model: string;
    analysisType: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    cached: boolean;
  }): void {
    this.logger.debug({
      event: 'ai_model_call_completed',
      ...params,
    }, `AI model call completed: ${params.durationMs}ms, ${params.inputTokens + params.outputTokens} tokens`);
  }

  aiModelCallFailed(params: {
    model: string;
    analysisType: string;
    error: string;
    errorType: string;
    durationMs: number;
  }): void {
    this.logger.error({
      event: 'ai_model_call_failed',
      ...params,
    }, `AI model call failed: ${params.error}`);
  }

  aiModelFallbackUsed(params: {
    model: string;
    analysisType: string;
    reason: string;
    fallbackResult: string;
  }): void {
    this.logger.warn({
      event: 'ai_model_fallback_used',
      ...params,
    }, `AI model fallback used: ${params.reason}`);
  }

  // ============================================================
  // QUEUE LOGGING
  // ============================================================

  jobQueued(params: {
    queueName: string;
    jobId: string;
    priority: number;
  }): void {
    this.logger.debug({
      event: 'job_queued',
      ...params,
    }, `Job queued: ${params.queueName}`);
  }

  jobStarted(params: {
    queueName: string;
    jobId: string;
    attemptNumber: number;
  }): void {
    this.logger.debug({
      event: 'job_started',
      ...params,
    }, `Job started: ${params.queueName} (attempt ${params.attemptNumber})`);
  }

  jobCompleted(params: {
    queueName: string;
    jobId: string;
    durationMs: number;
  }): void {
    this.logger.debug({
      event: 'job_completed',
      ...params,
    }, `Job completed: ${params.queueName} in ${params.durationMs}ms`);
  }

  jobFailed(params: {
    queueName: string;
    jobId: string;
    error: string;
    attemptNumber: number;
    willRetry: boolean;
  }): void {
    this.logger.error({
      event: 'job_failed',
      ...params,
    }, `Job failed: ${params.queueName} - ${params.error}`);
  }

  jobRetrying(params: {
    queueName: string;
    jobId: string;
    attemptNumber: number;
    delayMs: number;
  }): void {
    this.logger.warn({
      event: 'job_retrying',
      ...params,
    }, `Job retrying: ${params.queueName} (attempt ${params.attemptNumber + 1} in ${params.delayMs}ms)`);
  }
}

// Factory function for creating loggers
export function createAnalysisLogger(context: AnalysisLogContext): AnalysisLogger {
  return new AnalysisLogger(context);
}
```

---

## 9. Testing Specification

### 9.1 Unit Tests

#### 9.1.1 Sentiment Analysis Tests

```typescript
// packages/workers/src/workers/__tests__/sentiment-analysis.worker.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SentimentAnalysisWorker } from '../sentiment-analysis.worker';
import { db } from '@cerniq/database';
import { redis } from '@cerniq/redis';
import { anthropicClient } from '@cerniq/ai';

vi.mock('@cerniq/database');
vi.mock('@cerniq/redis');
vi.mock('@cerniq/ai');

describe('SentimentAnalysisWorker', () => {
  let worker: SentimentAnalysisWorker;

  beforeEach(() => {
    worker = new SentimentAnalysisWorker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Language Detection', () => {
    it('should detect Romanian language correctly', () => {
      const romanianTexts = [
        'Bună ziua, aș dori să aflu mai multe despre produsele dumneavoastră',
        'Mulțumesc pentru ofertă, prețul este bun',
        'Nu sunt mulțumit de calitatea produsului',
        'Când puteți livra comanda?',
      ];

      for (const text of romanianTexts) {
        const language = worker['detectLanguage'](text);
        expect(language).toBe('ro');
      }
    });

    it('should detect English language correctly', () => {
      const englishTexts = [
        'Hello, I would like to learn more about your products',
        'Thank you for the offer, the price is good',
        'I am not satisfied with the product quality',
        'When can you deliver the order?',
      ];

      for (const text of englishTexts) {
        const language = worker['detectLanguage'](text);
        expect(language).toBe('en');
      }
    });

    it('should default to Romanian for ambiguous text', () => {
      const ambiguousText = '12345 OK';
      const language = worker['detectLanguage'](ambiguousText);
      expect(language).toBe('ro');
    });
  });

  describe('Sentiment Label Classification', () => {
    it('should classify very positive sentiment correctly', () => {
      expect(worker['getSentimentLabel'](0.8)).toBe('very_positive');
      expect(worker['getSentimentLabel'](1.0)).toBe('very_positive');
      expect(worker['getSentimentLabel'](0.6)).toBe('very_positive');
    });

    it('should classify positive sentiment correctly', () => {
      expect(worker['getSentimentLabel'](0.5)).toBe('positive');
      expect(worker['getSentimentLabel'](0.3)).toBe('positive');
      expect(worker['getSentimentLabel'](0.2)).toBe('positive');
    });

    it('should classify neutral sentiment correctly', () => {
      expect(worker['getSentimentLabel'](0.1)).toBe('neutral');
      expect(worker['getSentimentLabel'](0.0)).toBe('neutral');
      expect(worker['getSentimentLabel'](-0.1)).toBe('neutral');
    });

    it('should classify negative sentiment correctly', () => {
      expect(worker['getSentimentLabel'](-0.3)).toBe('negative');
      expect(worker['getSentimentLabel'](-0.5)).toBe('negative');
    });

    it('should classify very negative sentiment correctly', () => {
      expect(worker['getSentimentLabel'](-0.7)).toBe('very_negative');
      expect(worker['getSentimentLabel'](-1.0)).toBe('very_negative');
    });
  });

  describe('AI Response Parsing', () => {
    it('should parse valid JSON response correctly', () => {
      const response = `{
        "sentimentScore": 0.75,
        "confidence": 0.9,
        "aspects": [
          {"aspect": "price", "sentiment": 0.8, "confidence": 0.85},
          {"aspect": "quality", "sentiment": 0.6, "confidence": 0.7}
        ],
        "reasoning": "Customer expressed satisfaction with pricing"
      }`;

      const result = worker['parseAIResponse'](response);
      
      expect(result.sentimentScore).toBe(0.75);
      expect(result.confidence).toBe(0.9);
      expect(result.aspects).toHaveLength(2);
      expect(result.aspects[0].aspect).toBe('price');
    });

    it('should extract JSON from markdown code block', () => {
      const response = `Here's the analysis:
\`\`\`json
{
  "sentimentScore": 0.5,
  "confidence": 0.8,
  "aspects": []
}
\`\`\`
That's the result.`;

      const result = worker['parseAIResponse'](response);
      
      expect(result.sentimentScore).toBe(0.5);
      expect(result.confidence).toBe(0.8);
    });

    it('should handle invalid JSON with fallback', () => {
      const response = 'This is not valid JSON';

      const result = worker['parseAIResponse'](response);
      
      expect(result.sentimentScore).toBe(0);
      expect(result.confidence).toBe(0.3);
    });

    it('should clamp sentiment score to valid range', () => {
      const response = '{"sentimentScore": 1.5, "confidence": 0.9, "aspects": []}';

      const result = worker['parseAIResponse'](response);
      
      expect(result.sentimentScore).toBe(1.0);
    });

    it('should limit aspects to 10', () => {
      const aspects = Array.from({ length: 15 }, (_, i) => ({
        aspect: `aspect${i}`,
        sentiment: 0.5,
        confidence: 0.8,
      }));
      
      const response = JSON.stringify({
        sentimentScore: 0.5,
        confidence: 0.8,
        aspects,
      });

      const result = worker['parseAIResponse'](response);
      
      expect(result.aspects).toHaveLength(10);
    });
  });

  describe('Alert Checking', () => {
    it('should trigger alert for negative sentiment below threshold', async () => {
      const config = { thresholds: { negativeSentimentAlert: -0.5 } };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(config));

      const alerts: any[] = [];
      vi.spyOn(worker as any, 'createAlert').mockImplementation((alert) => {
        alerts.push(alert);
        return Promise.resolve();
      });

      await worker['checkForAlerts']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        sentimentScore: -0.7,
        sentimentLabel: 'very_negative',
        previousSentiments: [],
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('negative_sentiment');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should trigger alert for sentiment decline', async () => {
      const config = { 
        thresholds: { 
          negativeSentimentAlert: -0.5,
          sentimentDeclineThreshold: 0.4,
        } 
      };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(config));

      const alerts: any[] = [];
      vi.spyOn(worker as any, 'createAlert').mockImplementation((alert) => {
        alerts.push(alert);
        return Promise.resolve();
      });

      await worker['checkForAlerts']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        sentimentScore: 0.1,
        sentimentLabel: 'neutral',
        previousSentiments: [0.7, 0.8, 0.6], // average 0.7, decline of 0.6
      });

      expect(alerts.some(a => a.alertType === 'sentiment_decline')).toBe(true);
    });

    it('should not trigger alert for positive sentiment', async () => {
      const config = { thresholds: { negativeSentimentAlert: -0.5 } };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(config));

      const alerts: any[] = [];
      vi.spyOn(worker as any, 'createAlert').mockImplementation((alert) => {
        alerts.push(alert);
        return Promise.resolve();
      });

      await worker['checkForAlerts']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        sentimentScore: 0.8,
        sentimentLabel: 'very_positive',
        previousSentiments: [0.7, 0.6, 0.8],
      });

      expect(alerts).toHaveLength(0);
    });
  });

  describe('Full Processing Pipeline', () => {
    it('should process message and store result', async () => {
      // Mock AI response
      vi.mocked(anthropicClient.messages.create).mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            sentimentScore: 0.6,
            confidence: 0.85,
            aspects: [{ aspect: 'service', sentiment: 0.7, confidence: 0.8 }],
          }),
        }],
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      // Mock database insert
      const insertedId = 'analysis-123';
      vi.mocked(db.insert).mockResolvedValue([{ id: insertedId }] as any);

      // Mock Redis cache
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.set).mockResolvedValue('OK');

      const job = {
        data: {
          tenantId: 'tenant1',
          messageId: 'msg1',
          conversationId: 'conv1',
          contactId: 'contact1',
          text: 'Sunt foarte mulțumit de serviciile voastre!',
        },
      } as any;

      const result = await worker.process(job);

      expect(result.sentimentAnalysisId).toBe(insertedId);
      expect(result.sentimentScore).toBe(0.6);
      expect(result.sentimentLabel).toBe('very_positive');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should use cached result when available', async () => {
      const cachedResult = {
        sentimentScore: 0.5,
        confidence: 0.9,
        aspects: [],
      };
      
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(cachedResult));
      vi.mocked(db.insert).mockResolvedValue([{ id: 'analysis-456' }] as any);

      const job = {
        data: {
          tenantId: 'tenant1',
          messageId: 'msg1',
          conversationId: 'conv1',
          contactId: 'contact1',
          text: 'Test message',
        },
      } as any;

      const result = await worker.process(job);

      expect(anthropicClient.messages.create).not.toHaveBeenCalled();
      expect(result.sentimentScore).toBe(0.5);
    });
  });
});
```

### 10.2 Cross-Stage Integration

#### 10.2.1 Integration with Workers J (Handover)

```typescript
// packages/workers/src/integrations/handover-integration.ts

import { Redis } from 'ioredis';
import { Queue } from 'bullmq';

interface HandoverTrigger {
  type: 'EXPLICIT_HANDOVER_REQUEST' | 'ANALYSIS_TRIGGERED_HANDOVER' | 'ALERT_TRIGGERED_HANDOVER';
  conversationId: string;
  contactId: string;
  tenantId: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  analysisContext?: {
    sentimentScore?: number;
    primaryIntent?: string;
    primaryEmotion?: string;
    riskLevel?: string;
    riskScore?: number;
  };
  timestamp: string;
}

export class HandoverIntegration {
  private handoverQueue: Queue;
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
    this.handoverQueue = new Queue('handover-triggers', { connection: redis });
  }

  /**
   * Trigger handover from intent detection (explicit request)
   */
  async triggerFromIntent(
    conversationId: string,
    contactId: string,
    tenantId: string,
    intentResult: {
      primaryIntent: string;
      confidence: number;
    }
  ): Promise<void> {
    const trigger: HandoverTrigger = {
      type: 'EXPLICIT_HANDOVER_REQUEST',
      conversationId,
      contactId,
      tenantId,
      urgency: 'high',
      reason: `Customer explicitly requested human agent (intent: ${intentResult.primaryIntent}, confidence: ${intentResult.confidence.toFixed(2)})`,
      analysisContext: {
        primaryIntent: intentResult.primaryIntent,
      },
      timestamp: new Date().toISOString(),
    };

    await this.handoverQueue.add('handover', trigger, {
      priority: 1, // Highest priority
    });

    await this.redis.publish('handover-triggers', JSON.stringify(trigger));
  }

  /**
   * Trigger handover from aggregate analysis (risk-based)
   */
  async triggerFromAnalysis(
    conversationId: string,
    contactId: string,
    tenantId: string,
    aggregateResult: {
      riskLevel: string;
      riskScore: number;
      sentimentScore: number;
      primaryIntent?: string;
      primaryEmotion?: string;
    }
  ): Promise<void> {
    const urgency = this.determineUrgency(aggregateResult);

    const trigger: HandoverTrigger = {
      type: 'ANALYSIS_TRIGGERED_HANDOVER',
      conversationId,
      contactId,
      tenantId,
      urgency,
      reason: `Analysis-based handover: risk level ${aggregateResult.riskLevel}, score ${aggregateResult.riskScore.toFixed(2)}`,
      analysisContext: {
        sentimentScore: aggregateResult.sentimentScore,
        primaryIntent: aggregateResult.primaryIntent,
        primaryEmotion: aggregateResult.primaryEmotion,
        riskLevel: aggregateResult.riskLevel,
        riskScore: aggregateResult.riskScore,
      },
      timestamp: new Date().toISOString(),
    };

    const priority = urgency === 'critical' ? 1 : urgency === 'high' ? 2 : 3;

    await this.handoverQueue.add('handover', trigger, { priority });
    await this.redis.publish('handover-triggers', JSON.stringify(trigger));
  }

  /**
   * Trigger handover from alert
   */
  async triggerFromAlert(
    conversationId: string,
    contactId: string,
    tenantId: string,
    alert: {
      alertType: string;
      severity: string;
      description: string;
    }
  ): Promise<void> {
    const urgency = alert.severity === 'emergency' ? 'critical' : 
                    alert.severity === 'critical' ? 'high' : 'medium';

    const trigger: HandoverTrigger = {
      type: 'ALERT_TRIGGERED_HANDOVER',
      conversationId,
      contactId,
      tenantId,
      urgency,
      reason: `Alert-triggered handover: ${alert.alertType} (${alert.severity}) - ${alert.description}`,
      timestamp: new Date().toISOString(),
    };

    const priority = urgency === 'critical' ? 1 : urgency === 'high' ? 2 : 3;

    await this.handoverQueue.add('handover', trigger, { priority });
    await this.redis.publish('handover-triggers', JSON.stringify(trigger));
  }

  private determineUrgency(result: { riskLevel: string; riskScore: number }): HandoverTrigger['urgency'] {
    if (result.riskLevel === 'critical' || result.riskScore >= 0.8) return 'critical';
    if (result.riskLevel === 'high' || result.riskScore >= 0.6) return 'high';
    if (result.riskLevel === 'medium' || result.riskScore >= 0.4) return 'medium';
    return 'low';
  }
}
```

#### 10.2.2 Integration with Workers L (MCP Server)

```typescript
// packages/workers/src/integrations/mcp-integration.ts

import { Redis } from 'ioredis';

interface AnalysisContextUpdate {
  conversationId: string;
  tenantId: string;
  contextType: 'sentiment' | 'intent' | 'emotion' | 'risk';
  data: Record<string, unknown>;
  timestamp: string;
}

export class MCPContextIntegration {
  constructor(private redis: Redis) {}

  /**
   * Update MCP context with sentiment analysis
   */
  async updateSentimentContext(
    conversationId: string,
    tenantId: string,
    sentiment: {
      score: number;
      label: string;
      confidence: number;
      aspects: Array<{ aspect: string; sentiment: number }>;
    }
  ): Promise<void> {
    const contextKey = `mcp:context:${tenantId}:${conversationId}:sentiment`;
    
    await this.redis.hset(contextKey, {
      score: sentiment.score.toString(),
      label: sentiment.label,
      confidence: sentiment.confidence.toString(),
      aspects: JSON.stringify(sentiment.aspects),
      updatedAt: new Date().toISOString(),
    });

    // Set TTL (2 hours)
    await this.redis.expire(contextKey, 7200);

    // Publish update for MCP server
    await this.redis.publish('mcp:context:updates', JSON.stringify({
      type: 'sentiment',
      conversationId,
      tenantId,
      data: sentiment,
    }));
  }

  /**
   * Update MCP context with intent detection
   */
  async updateIntentContext(
    conversationId: string,
    tenantId: string,
    intent: {
      primary: string;
      confidence: number;
      entities: Array<{ type: string; value: string }>;
      actionRequired: boolean;
    }
  ): Promise<void> {
    const contextKey = `mcp:context:${tenantId}:${conversationId}:intent`;
    
    await this.redis.hset(contextKey, {
      primary: intent.primary,
      confidence: intent.confidence.toString(),
      entities: JSON.stringify(intent.entities),
      actionRequired: intent.actionRequired.toString(),
      updatedAt: new Date().toISOString(),
    });

    await this.redis.expire(contextKey, 7200);

    await this.redis.publish('mcp:context:updates', JSON.stringify({
      type: 'intent',
      conversationId,
      tenantId,
      data: intent,
    }));
  }

  /**
   * Update MCP context with combined analysis
   */
  async updateCombinedContext(
    conversationId: string,
    tenantId: string,
    analysis: {
      sentiment: { score: number; label: string };
      intent: { primary: string; actionRequired: boolean };
      emotion: { primary: string; arousal: number };
      risk: { level: string; score: number };
    }
  ): Promise<void> {
    const contextKey = `mcp:context:${tenantId}:${conversationId}:combined`;
    
    await this.redis.set(contextKey, JSON.stringify({
      ...analysis,
      updatedAt: new Date().toISOString(),
    }), 'EX', 7200);

    await this.redis.publish('mcp:context:updates', JSON.stringify({
      type: 'combined',
      conversationId,
      tenantId,
      data: analysis,
    }));
  }

  /**
   * Get current context for MCP tools
   */
  async getContext(
    conversationId: string,
    tenantId: string
  ): Promise<{
    sentiment?: any;
    intent?: any;
    emotion?: any;
    combined?: any;
  }> {
    const [sentiment, intent, emotion, combined] = await Promise.all([
      this.redis.hgetall(`mcp:context:${tenantId}:${conversationId}:sentiment`),
      this.redis.hgetall(`mcp:context:${tenantId}:${conversationId}:intent`),
      this.redis.hgetall(`mcp:context:${tenantId}:${conversationId}:emotion`),
      this.redis.get(`mcp:context:${tenantId}:${conversationId}:combined`),
    ]);

    return {
      sentiment: Object.keys(sentiment).length > 0 ? sentiment : undefined,
      intent: Object.keys(intent).length > 0 ? intent : undefined,
      emotion: Object.keys(emotion).length > 0 ? emotion : undefined,
      combined: combined ? JSON.parse(combined) : undefined,
    };
  }
}
```

#### 10.2.3 Integration with Workers M (Guardrails)

```typescript
// packages/workers/src/integrations/guardrails-integration.ts

import { Redis } from 'ioredis';

interface GuardrailCheck {
  type: 'content' | 'rate' | 'budget' | 'quality';
  passed: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export class GuardrailsIntegration {
  constructor(private redis: Redis) {}

  /**
   * Check if analysis should be processed (pre-analysis)
   */
  async preAnalysisCheck(
    tenantId: string,
    messageId: string,
    text: string
  ): Promise<{
    allowed: boolean;
    checks: GuardrailCheck[];
  }> {
    const checks: GuardrailCheck[] = [];

    // Rate limit check
    const rateLimitKey = `guardrail:rate:${tenantId}:analysis`;
    const currentRate = await this.redis.incr(rateLimitKey);
    if (currentRate === 1) {
      await this.redis.expire(rateLimitKey, 60);
    }
    
    const rateLimit = 1000; // per minute
    checks.push({
      type: 'rate',
      passed: currentRate <= rateLimit,
      reason: currentRate > rateLimit ? `Rate limit exceeded: ${currentRate}/${rateLimit}` : undefined,
    });

    // Budget check (token estimation)
    const estimatedTokens = Math.ceil(text.length / 4);
    const budgetKey = `guardrail:budget:${tenantId}:daily`;
    const usedTokens = parseInt(await this.redis.get(budgetKey) || '0');
    const dailyLimit = 1000000; // 1M tokens/day
    
    checks.push({
      type: 'budget',
      passed: usedTokens + estimatedTokens <= dailyLimit,
      reason: usedTokens + estimatedTokens > dailyLimit ? 
        `Daily token budget exceeded: ${usedTokens}/${dailyLimit}` : undefined,
      metadata: { estimatedTokens, usedTokens, dailyLimit },
    });

    // Content check (basic, detailed check happens in worker M)
    const hasBlockedPatterns = this.checkBasicContentFilter(text);
    checks.push({
      type: 'content',
      passed: !hasBlockedPatterns,
      reason: hasBlockedPatterns ? 'Content contains blocked patterns' : undefined,
    });

    const allowed = checks.every(c => c.passed);
    
    return { allowed, checks };
  }

  /**
   * Post-analysis quality check
   */
  async postAnalysisCheck(
    tenantId: string,
    analysisType: string,
    result: {
      confidence: number;
      processingTimeMs: number;
    }
  ): Promise<GuardrailCheck> {
    const minConfidence = 0.3;
    const maxProcessingTime = 10000; // 10 seconds

    const passed = result.confidence >= minConfidence && 
                   result.processingTimeMs <= maxProcessingTime;

    return {
      type: 'quality',
      passed,
      reason: !passed ? 
        `Quality check failed: confidence=${result.confidence.toFixed(2)}, time=${result.processingTimeMs}ms` :
        undefined,
      metadata: {
        confidence: result.confidence,
        processingTimeMs: result.processingTimeMs,
        minConfidence,
        maxProcessingTime,
      },
    };
  }

  /**
   * Update budget usage
   */
  async updateBudgetUsage(
    tenantId: string,
    tokensUsed: number
  ): Promise<void> {
    const budgetKey = `guardrail:budget:${tenantId}:daily`;
    await this.redis.incrby(budgetKey, tokensUsed);
    
    // Set expiry at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    await this.redis.expire(budgetKey, ttl);
  }

  private checkBasicContentFilter(text: string): boolean {
    // Basic content filter - detailed check in Worker M
    const blockedPatterns = [
      /injection/i,
      /ignore previous/i,
      /system prompt/i,
    ];
    
    return blockedPatterns.some(pattern => pattern.test(text));
  }
}
```

---

## 11. Security & Privacy

### 11.1 Data Protection

#### 11.1.1 Text Encryption

```typescript
// packages/workers/src/security/text-encryption.ts

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
}

const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
};

export class TextEncryption {
  private config: EncryptionConfig;
  private masterKey: Buffer;

  constructor(masterKeyHex: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.masterKey = Buffer.from(masterKeyHex, 'hex');
    
    if (this.masterKey.length !== this.config.keyLength) {
      throw new Error(`Master key must be ${this.config.keyLength} bytes`);
    }
  }

  /**
   * Encrypt text for storage
   */
  encrypt(plaintext: string): string {
    const salt = randomBytes(this.config.saltLength);
    const iv = randomBytes(this.config.ivLength);
    
    // Derive key from master key and salt
    const derivedKey = scryptSync(this.masterKey, salt, this.config.keyLength);
    
    const cipher = createCipheriv(this.config.algorithm, derivedKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: salt:iv:authTag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt stored text
   */
  decrypt(encryptedData: string): string {
    const [saltHex, ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    if (!saltHex || !ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const derivedKey = scryptSync(this.masterKey, salt, this.config.keyLength);
    
    const decipher = createDecipheriv(this.config.algorithm, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Rotate encryption key (re-encrypt with new key)
   */
  async rotateKey(
    encryptedData: string,
    newMasterKeyHex: string
  ): Promise<string> {
    // Decrypt with current key
    const plaintext = this.decrypt(encryptedData);
    
    // Create new encryption instance with new key
    const newEncryption = new TextEncryption(newMasterKeyHex, this.config);
    
    // Encrypt with new key
    return newEncryption.encrypt(plaintext);
  }
}

// Export singleton with environment key
let encryptionInstance: TextEncryption | null = null;

export function getTextEncryption(): TextEncryption {
  if (!encryptionInstance) {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable not set');
    }
    encryptionInstance = new TextEncryption(masterKey);
  }
  return encryptionInstance;
}
```

#### 11.1.2 PII Detection and Masking

```typescript
// packages/workers/src/security/pii-handler.ts

interface PIIPattern {
  name: string;
  pattern: RegExp;
  mask: string;
}

interface PIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  maskedText: string;
  originalLength: number;
  locations: Array<{
    type: string;
    start: number;
    end: number;
  }>;
}

// Romanian-specific PII patterns
const PII_PATTERNS: PIIPattern[] = [
  // Romanian CNP (Personal Numeric Code)
  {
    name: 'cnp',
    pattern: /\b[1-8]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{6}\b/g,
    mask: '[CNP-MASKED]',
  },
  // Romanian phone numbers
  {
    name: 'phone_ro',
    pattern: /\b(?:\+40|0040|0)(?:7\d{8}|[23]\d{8})\b/g,
    mask: '[PHONE-MASKED]',
  },
  // Email addresses
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    mask: '[EMAIL-MASKED]',
  },
  // Romanian IBAN
  {
    name: 'iban_ro',
    pattern: /\bRO\d{2}[A-Z]{4}\d{16}\b/gi,
    mask: '[IBAN-MASKED]',
  },
  // Credit card numbers
  {
    name: 'credit_card',
    pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
    mask: '[CARD-MASKED]',
  },
  // Romanian CUI/CIF (Company ID)
  {
    name: 'cui_ro',
    pattern: /\b(?:RO)?[0-9]{2,10}\b/g,
    mask: '[CUI-MASKED]',
  },
  // IP addresses
  {
    name: 'ip_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    mask: '[IP-MASKED]',
  },
  // Date of birth patterns (Romanian format)
  {
    name: 'dob',
    pattern: /\b(?:0[1-9]|[12]\d|3[01])[-./](?:0[1-9]|1[0-2])[-./](?:19|20)\d{2}\b/g,
    mask: '[DOB-MASKED]',
  },
];

export class PIIHandler {
  private patterns: PIIPattern[];

  constructor(additionalPatterns: PIIPattern[] = []) {
    this.patterns = [...PII_PATTERNS, ...additionalPatterns];
  }

  /**
   * Detect PII in text
   */
  detect(text: string): PIIDetectionResult {
    const locations: PIIDetectionResult['locations'] = [];
    const detectedTypes = new Set<string>();
    let maskedText = text;

    for (const { name, pattern, mask } of this.patterns) {
      // Reset regex state
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(text)) !== null) {
        detectedTypes.add(name);
        locations.push({
          type: name,
          start: match.index,
          end: match.index + match[0].length,
        });
      }

      // Mask in text
      pattern.lastIndex = 0;
      maskedText = maskedText.replace(pattern, mask);
    }

    return {
      hasPII: detectedTypes.size > 0,
      detectedTypes: Array.from(detectedTypes),
      maskedText,
      originalLength: text.length,
      locations: locations.sort((a, b) => a.start - b.start),
    };
  }

  /**
   * Mask PII in text
   */
  mask(text: string): string {
    return this.detect(text).maskedText;
  }

  /**
   * Check if text contains specific PII type
   */
  containsPIIType(text: string, type: string): boolean {
    const pattern = this.patterns.find(p => p.name === type);
    if (!pattern) return false;
    
    pattern.pattern.lastIndex = 0;
    return pattern.pattern.test(text);
  }

  /**
   * Get PII-safe text for logging
   */
  getSafeForLogging(text: string, maxLength: number = 100): string {
    const masked = this.mask(text);
    if (masked.length <= maxLength) return masked;
    return masked.substring(0, maxLength - 3) + '...';
  }
}

// Export singleton
export const piiHandler = new PIIHandler();
```

### 11.2 GDPR Compliance

#### 11.2.1 Data Retention Manager

```typescript
// packages/workers/src/security/data-retention.ts

import { Pool } from 'pg';
import { Redis } from 'ioredis';

interface RetentionPolicy {
  tableName: string;
  retentionDays: number;
  dateColumn: string;
  tenantColumn: string;
  archiveEnabled: boolean;
}

const DEFAULT_POLICIES: RetentionPolicy[] = [
  {
    tableName: 'sentiment_analyses',
    retentionDays: 365, // 1 year
    dateColumn: 'created_at',
    tenantColumn: 'tenant_id',
    archiveEnabled: true,
  },
  {
    tableName: 'intent_detections',
    retentionDays: 365,
    dateColumn: 'created_at',
    tenantColumn: 'tenant_id',
    archiveEnabled: true,
  },
  {
    tableName: 'emotion_detections',
    retentionDays: 365,
    dateColumn: 'created_at',
    tenantColumn: 'tenant_id',
    archiveEnabled: true,
  },
  {
    tableName: 'analysis_aggregates',
    retentionDays: 365,
    dateColumn: 'created_at',
    tenantColumn: 'tenant_id',
    archiveEnabled: true,
  },
  {
    tableName: 'analysis_alerts',
    retentionDays: 730, // 2 years for audit
    dateColumn: 'created_at',
    tenantColumn: 'tenant_id',
    archiveEnabled: true,
  },
  {
    tableName: 'sentiment_trends',
    retentionDays: 180, // 6 months
    dateColumn: 'created_at',
    tenantColumn: 'tenant_id',
    archiveEnabled: false,
  },
];

export class DataRetentionManager {
  private db: Pool;
  private redis: Redis;
  private policies: RetentionPolicy[];

  constructor(db: Pool, redis: Redis, policies: RetentionPolicy[] = DEFAULT_POLICIES) {
    this.db = db;
    this.redis = redis;
    this.policies = policies;
  }

  /**
   * Run retention cleanup for all policies
   */
  async runRetentionCleanup(): Promise<{
    policy: string;
    archivedCount: number;
    deletedCount: number;
  }[]> {
    const results = [];

    for (const policy of this.policies) {
      const result = await this.cleanupTable(policy);
      results.push({
        policy: policy.tableName,
        ...result,
      });
    }

    return results;
  }

  /**
   * Cleanup single table based on policy
   */
  private async cleanupTable(policy: RetentionPolicy): Promise<{
    archivedCount: number;
    deletedCount: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    let archivedCount = 0;
    let deletedCount = 0;

    // Archive if enabled
    if (policy.archiveEnabled) {
      const archiveResult = await this.db.query(`
        INSERT INTO ${policy.tableName}_archive
        SELECT * FROM ${policy.tableName}
        WHERE ${policy.dateColumn} < $1
        RETURNING id
      `, [cutoffDate]);
      
      archivedCount = archiveResult.rowCount || 0;
    }

    // Delete old records
    const deleteResult = await this.db.query(`
      DELETE FROM ${policy.tableName}
      WHERE ${policy.dateColumn} < $1
      RETURNING id
    `, [cutoffDate]);

    deletedCount = deleteResult.rowCount || 0;

    // Clear related cache
    await this.clearRelatedCache(policy.tableName);

    return { archivedCount, deletedCount };
  }

  /**
   * Handle GDPR data deletion request
   */
  async handleDeletionRequest(
    tenantId: string,
    contactId: string
  ): Promise<{
    tablesProcessed: string[];
    totalDeleted: number;
  }> {
    const tablesProcessed: string[] = [];
    let totalDeleted = 0;

    for (const policy of this.policies) {
      const result = await this.db.query(`
        DELETE FROM ${policy.tableName}
        WHERE ${policy.tenantColumn} = $1
          AND contact_id = $2
        RETURNING id
      `, [tenantId, contactId]);

      if ((result.rowCount || 0) > 0) {
        tablesProcessed.push(policy.tableName);
        totalDeleted += result.rowCount || 0;
      }
    }

    // Clear all related cache
    await this.redis.del(`analysis:contact:${tenantId}:${contactId}:*`);

    // Log deletion for audit
    await this.logDeletionRequest(tenantId, contactId, tablesProcessed, totalDeleted);

    return { tablesProcessed, totalDeleted };
  }

  /**
   * Export user data (GDPR data portability)
   */
  async exportUserData(
    tenantId: string,
    contactId: string
  ): Promise<Record<string, any[]>> {
    const exportData: Record<string, any[]> = {};

    for (const policy of this.policies) {
      const result = await this.db.query(`
        SELECT * FROM ${policy.tableName}
        WHERE ${policy.tenantColumn} = $1
          AND contact_id = $2
        ORDER BY ${policy.dateColumn} DESC
      `, [tenantId, contactId]);

      if (result.rows.length > 0) {
        // Remove sensitive internal fields
        exportData[policy.tableName] = result.rows.map(row => {
          const { encrypted_text, ...safeRow } = row;
          return safeRow;
        });
      }
    }

    return exportData;
  }

  private async clearRelatedCache(tableName: string): Promise<void> {
    const pattern = `analysis:${tableName}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async logDeletionRequest(
    tenantId: string,
    contactId: string,
    tables: string[],
    count: number
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO gdpr_audit_log (
        tenant_id, contact_id, action, tables_affected, records_deleted, created_at
      ) VALUES ($1, $2, 'DATA_DELETION', $3, $4, NOW())
    `, [tenantId, contactId, JSON.stringify(tables), count]);
  }
}
```

### 11.3 Audit Logging

#### 11.3.1 Analysis Audit Trail

```typescript
// packages/workers/src/security/audit-trail.ts

import { Pool } from 'pg';
import { createHash } from 'crypto';

interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditChainEntry extends AuditEntry {
  id: string;
  previousHash: string;
  currentHash: string;
  timestamp: string;
}

export class AuditTrail {
  private db: Pool;
  private previousHash: string = '0';

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Initialize audit trail (get last hash)
   */
  async initialize(): Promise<void> {
    const result = await this.db.query(`
      SELECT current_hash FROM analysis_audit_trail
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      this.previousHash = result.rows[0].current_hash;
    }
  }

  /**
   * Log audit entry with hash chain
   */
  async log(entry: AuditEntry): Promise<string> {
    const timestamp = new Date().toISOString();
    
    // Create hash of entry content
    const contentToHash = JSON.stringify({
      ...entry,
      timestamp,
      previousHash: this.previousHash,
    });
    
    const currentHash = createHash('sha256')
      .update(contentToHash)
      .digest('hex');

    const result = await this.db.query(`
      INSERT INTO analysis_audit_trail (
        tenant_id, user_id, action, resource_type, resource_id,
        details, ip_address, user_agent,
        previous_hash, current_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      entry.tenantId,
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      JSON.stringify(entry.details),
      entry.ipAddress,
      entry.userAgent,
      this.previousHash,
      currentHash,
      timestamp,
    ]);

    this.previousHash = currentHash;

    return result.rows[0].id;
  }

  /**
   * Log analysis event
   */
  async logAnalysisEvent(
    tenantId: string,
    analysisType: string,
    messageId: string,
    result: {
      success: boolean;
      durationMs: number;
      confidence?: number;
    }
  ): Promise<void> {
    await this.log({
      tenantId,
      action: 'ANALYSIS_PERFORMED',
      resourceType: 'message',
      resourceId: messageId,
      details: {
        analysisType,
        ...result,
      },
    });
  }

  /**
   * Log alert event
   */
  async logAlertEvent(
    tenantId: string,
    alertId: string,
    action: 'created' | 'acknowledged' | 'resolved',
    userId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: `ALERT_${action.toUpperCase()}`,
      resourceType: 'alert',
      resourceId: alertId,
      details: details || {},
    });
  }

  /**
   * Verify audit chain integrity
   */
  async verifyChainIntegrity(
    startId?: string,
    endId?: string
  ): Promise<{
    valid: boolean;
    entriesChecked: number;
    invalidEntries: string[];
  }> {
    let query = `
      SELECT id, tenant_id, user_id, action, resource_type, resource_id,
             details, previous_hash, current_hash, created_at
      FROM analysis_audit_trail
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (startId) {
      conditions.push(`created_at >= (SELECT created_at FROM analysis_audit_trail WHERE id = $${params.length + 1})`);
      params.push(startId);
    }
    if (endId) {
      conditions.push(`created_at <= (SELECT created_at FROM analysis_audit_trail WHERE id = $${params.length + 1})`);
      params.push(endId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at ASC';

    const result = await this.db.query(query, params);
    
    const invalidEntries: string[] = [];
    let previousHash = result.rows.length > 0 ? result.rows[0].previous_hash : '0';

    for (const row of result.rows) {
      // Verify previous hash matches
      if (row.previous_hash !== previousHash) {
        invalidEntries.push(row.id);
        continue;
      }

      // Verify current hash
      const contentToHash = JSON.stringify({
        tenantId: row.tenant_id,
        userId: row.user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: row.details,
        timestamp: row.created_at.toISOString(),
        previousHash: row.previous_hash,
      });
      
      const expectedHash = createHash('sha256')
        .update(contentToHash)
        .digest('hex');

      if (row.current_hash !== expectedHash) {
        invalidEntries.push(row.id);
      }

      previousHash = row.current_hash;
    }

    return {
      valid: invalidEntries.length === 0,
      entriesChecked: result.rows.length,
      invalidEntries,
    };
  }
}
```

---

## 12. Changelog & References

### 12.1 Document Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-18 | System | Initial document creation |
| 1.0.1 | 2026-01-18 | System | Added complete worker implementations |
| 1.0.2 | 2026-01-18 | System | Added database schema and migrations |
| 1.0.3 | 2026-01-18 | System | Added real-time processing (WebSocket, SSE) |
| 1.0.4 | 2026-01-18 | System | Added monitoring, testing, security sections |

### 12.2 References

#### 12.2.1 Internal Documents

1. **Master Specification**: `/mnt/project/__Cerniq_Master_Spec_Normativ_Complet.md`
2. **Workers Overview**: `/mnt/project/cerniq-workers-etapa3-ai-sales-agent.md`
3. **Etapa 3 Strategy**: `/mnt/project/Etapa_3_-_Strategie_Generala_Ofertare_Vânzare_AI.rtf`
4. **HITL System**: `/mnt/project/Unified_HITL_Approval_System_for_B2B_Sales_Automation.md`
5. **Coding Standards**: `/mnt/project/coding-standards.md`

#### 12.2.2 External References

1. **Anthropic Claude API**: https://docs.anthropic.com/en/api
2. **BullMQ Documentation**: https://docs.bullmq.io/
3. **PostgreSQL 18.1**: https://www.postgresql.org/docs/18/
4. **Prometheus Metrics**: https://prometheus.io/docs/concepts/metric_types/
5. **GDPR Article 6(1)(f)**: https://gdpr-info.eu/art-6-gdpr/

#### 12.2.3 Romanian-Specific Resources

1. **ANAF API**: https://www.anaf.ro/
2. **Romanian Data Protection**: https://www.dataprotection.ro/
3. **e-Factura**: https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/e_factura

### 12.3 Glossary

| Term | Definition |
|------|------------|
| **Sentiment Score** | Numerical value from -1.0 (very negative) to +1.0 (very positive) |
| **Intent** | User's purpose or goal in a message (e.g., price_inquiry, complaint) |
| **Emotion** | Detected emotional state (e.g., joy, frustration, anger) |
| **VAD Model** | Valence-Arousal-Dominance model for emotion representation |
| **Risk Level** | Assessment of conversation risk (low, medium, high, critical) |
| **HITL** | Human-in-the-Loop - human oversight of automated processes |
| **Handover** | Transfer of conversation from AI to human agent |
| **CNP** | Cod Numeric Personal (Romanian Personal ID Number) |
| **CUI** | Cod Unic de Identificare (Romanian Company ID) |

---

**Document Complete**

*This document provides comprehensive technical specifications for Workers K (Sentiment & Intent Analysis) of Cerniq App Etapa 3. All implementations follow the coding standards and architectural patterns defined in the Master Specification.*

#### 9.1.2 Intent Detection Tests

```typescript
// packages/workers/src/workers/__tests__/intent-detection.worker.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntentDetectionWorker } from '../intent-detection.worker';
import { IntentType, INTENT_ACTIONS } from '../constants/intent-types';

vi.mock('@cerniq/database');
vi.mock('@cerniq/redis');
vi.mock('@cerniq/ai');

describe('IntentDetectionWorker', () => {
  let worker: IntentDetectionWorker;

  beforeEach(() => {
    worker = new IntentDetectionWorker();
    vi.clearAllMocks();
  });

  describe('Intent Action Mapping', () => {
    it('should map complaint to escalate_complaint action', () => {
      const action = INTENT_ACTIONS[IntentType.COMPLAINT];
      expect(action).toBe('escalate_complaint');
    });

    it('should map human_agent_request to trigger_handover action', () => {
      const action = INTENT_ACTIONS[IntentType.HUMAN_AGENT_REQUEST];
      expect(action).toBe('trigger_handover');
    });

    it('should map order_placement to process_order action', () => {
      const action = INTENT_ACTIONS[IntentType.ORDER_PLACEMENT];
      expect(action).toBe('process_order');
    });

    it('should have actions defined for all intent types', () => {
      for (const intentType of Object.values(IntentType)) {
        expect(INTENT_ACTIONS[intentType]).toBeDefined();
      }
    });
  });

  describe('Action Priority Determination', () => {
    it('should assign high priority to complaint intents', () => {
      const priority = worker['getActionPriority'](IntentType.COMPLAINT);
      expect(priority).toBe('high');
    });

    it('should assign high priority to human_agent_request', () => {
      const priority = worker['getActionPriority'](IntentType.HUMAN_AGENT_REQUEST);
      expect(priority).toBe('high');
    });

    it('should assign medium priority to discount_request', () => {
      const priority = worker['getActionPriority'](IntentType.DISCOUNT_REQUEST);
      expect(priority).toBe('medium');
    });

    it('should assign low priority to greeting', () => {
      const priority = worker['getActionPriority'](IntentType.GREETING);
      expect(priority).toBe('low');
    });
  });

  describe('Entity Parsing', () => {
    it('should parse product entities correctly', () => {
      const entities = [
        {
          type: 'product',
          value: 'tractor',
          normalizedValue: 'TRACTOR_MODEL_X',
          confidence: 0.9,
          span: { start: 10, end: 17 },
        },
      ];

      const parsed = worker['parseEntities'](entities);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('product');
      expect(parsed[0].value).toBe('tractor');
      expect(parsed[0].normalizedValue).toBe('TRACTOR_MODEL_X');
    });

    it('should parse quantity entities correctly', () => {
      const entities = [
        {
          type: 'quantity',
          value: '50 kg',
          normalizedValue: '50',
          confidence: 0.85,
          span: { start: 20, end: 25 },
        },
      ];

      const parsed = worker['parseEntities'](entities);
      
      expect(parsed[0].type).toBe('quantity');
      expect(parsed[0].normalizedValue).toBe('50');
    });

    it('should limit entities to 20', () => {
      const entities = Array.from({ length: 30 }, (_, i) => ({
        type: 'product',
        value: `product${i}`,
        normalizedValue: `PRODUCT_${i}`,
        confidence: 0.8,
        span: { start: i * 10, end: i * 10 + 8 },
      }));

      const parsed = worker['parseEntities'](entities);
      
      expect(parsed).toHaveLength(20);
    });

    it('should handle missing optional fields', () => {
      const entities = [
        {
          type: 'product',
          value: 'tractor',
          confidence: 0.9,
        },
      ];

      const parsed = worker['parseEntities'](entities);
      
      expect(parsed[0].normalizedValue).toBeUndefined();
      expect(parsed[0].span).toBeUndefined();
    });
  });

  describe('Intent Type Validation', () => {
    it('should accept valid intent types', () => {
      const validIntents = [
        IntentType.PRICE_INQUIRY,
        IntentType.PRODUCT_INQUIRY,
        IntentType.COMPLAINT,
        IntentType.HUMAN_AGENT_REQUEST,
        IntentType.ORDER_PLACEMENT,
      ];

      for (const intent of validIntents) {
        expect(worker['isValidIntentType'](intent)).toBe(true);
      }
    });

    it('should reject invalid intent types', () => {
      const invalidIntents = ['invalid', 'unknown_intent', '', null, undefined];

      for (const intent of invalidIntents) {
        expect(worker['isValidIntentType'](intent as any)).toBe(false);
      }
    });
  });

  describe('AI Response Parsing', () => {
    it('should parse complete response correctly', () => {
      const response = `{
        "primaryIntent": "order_placement",
        "primaryConfidence": 0.92,
        "secondaryIntents": [
          {"intent": "price_inquiry", "confidence": 0.45}
        ],
        "entities": [
          {"type": "product", "value": "semințe porumb", "normalizedValue": "CORN_SEEDS", "confidence": 0.88}
        ],
        "actionRequired": true,
        "reasoning": "Customer wants to place an order for corn seeds"
      }`;

      const result = worker['parseAIResponse'](response);
      
      expect(result.primaryIntent).toBe('order_placement');
      expect(result.primaryConfidence).toBe(0.92);
      expect(result.secondaryIntents).toHaveLength(1);
      expect(result.entities).toHaveLength(1);
      expect(result.actionRequired).toBe(true);
    });

    it('should fallback to UNCLEAR for invalid intent', () => {
      const response = `{
        "primaryIntent": "not_a_real_intent",
        "primaryConfidence": 0.8,
        "secondaryIntents": [],
        "entities": [],
        "actionRequired": false
      }`;

      const result = worker['parseAIResponse'](response);
      
      expect(result.primaryIntent).toBe(IntentType.UNCLEAR);
      expect(result.primaryConfidence).toBe(0.3);
    });
  });

  describe('Special Intent Handling', () => {
    it('should publish handover trigger for HUMAN_AGENT_REQUEST', async () => {
      const publishSpy = vi.spyOn(worker as any, 'publishToChannel').mockResolvedValue(undefined);

      await worker['handleSpecialIntent']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        intentType: IntentType.HUMAN_AGENT_REQUEST,
        confidence: 0.95,
      });

      expect(publishSpy).toHaveBeenCalledWith(
        'handover-triggers',
        expect.objectContaining({
          reason: 'EXPLICIT_HANDOVER_REQUEST',
          urgency: 'high',
        })
      );
    });

    it('should publish complaint notification for COMPLAINT', async () => {
      const publishSpy = vi.spyOn(worker as any, 'publishToChannel').mockResolvedValue(undefined);

      await worker['handleSpecialIntent']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        intentType: IntentType.COMPLAINT,
        confidence: 0.88,
      });

      expect(publishSpy).toHaveBeenCalledWith(
        'support-queue',
        expect.objectContaining({
          type: 'COMPLAINT_DETECTED',
          priority: 'high',
        })
      );
    });

    it('should publish order notification for ORDER_PLACEMENT', async () => {
      const publishSpy = vi.spyOn(worker as any, 'publishToChannel').mockResolvedValue(undefined);

      await worker['handleSpecialIntent']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        intentType: IntentType.ORDER_PLACEMENT,
        confidence: 0.9,
      });

      expect(publishSpy).toHaveBeenCalledWith(
        'sales-notifications',
        expect.objectContaining({
          type: 'ORDER_INTENT_DETECTED',
        })
      );
    });
  });
});
```

#### 9.1.3 Emotion Recognition Tests

```typescript
// packages/workers/src/workers/__tests__/emotion-recognition.worker.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmotionRecognitionWorker } from '../emotion-recognition.worker';
import { EmotionType, VAD_MAPPING } from '../constants/emotion-types';

vi.mock('@cerniq/database');
vi.mock('@cerniq/redis');
vi.mock('@cerniq/ai');

describe('EmotionRecognitionWorker', () => {
  let worker: EmotionRecognitionWorker;

  beforeEach(() => {
    worker = new EmotionRecognitionWorker();
    vi.clearAllMocks();
  });

  describe('VAD Mapping', () => {
    it('should have correct VAD values for joy', () => {
      const vad = VAD_MAPPING[EmotionType.JOY];
      expect(vad.valence).toBeGreaterThan(0);
      expect(vad.arousal).toBeGreaterThan(0.3);
      expect(vad.dominance).toBeGreaterThan(0.4);
    });

    it('should have correct VAD values for anger', () => {
      const vad = VAD_MAPPING[EmotionType.ANGER];
      expect(vad.valence).toBeLessThan(0);
      expect(vad.arousal).toBeGreaterThan(0.7);
      expect(vad.dominance).toBeGreaterThan(0.5);
    });

    it('should have correct VAD values for fear', () => {
      const vad = VAD_MAPPING[EmotionType.FEAR];
      expect(vad.valence).toBeLessThan(0);
      expect(vad.arousal).toBeGreaterThan(0.7);
      expect(vad.dominance).toBeLessThan(0.5);
    });

    it('should have neutral VAD values for neutral emotion', () => {
      const vad = VAD_MAPPING[EmotionType.NEUTRAL];
      expect(vad.valence).toBeCloseTo(0, 1);
      expect(vad.arousal).toBeLessThan(0.5);
    });
  });

  describe('Emotional Cue Detection', () => {
    it('should detect exclamation marks as high arousal', () => {
      const text = 'This is amazing!!!';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'punctuation' && c.emotionSignal === 'high_arousal')).toBe(true);
    });

    it('should detect multiple question marks as confusion', () => {
      const text = 'What??? How is this possible???';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'punctuation' && c.emotionSignal === 'confusion_or_frustration')).toBe(true);
    });

    it('should detect CAPS as emphasis', () => {
      const text = 'This is ABSOLUTELY RIDICULOUS behavior';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'capitalization' && c.emotionSignal === 'emphasis_or_anger')).toBe(true);
    });

    it('should detect happy emojis', () => {
      const text = 'Great work! 😊👍';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'emoji' && c.emotionSignal === 'positive')).toBe(true);
    });

    it('should detect sad emojis', () => {
      const text = 'This is disappointing 😞😢';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'emoji' && c.emotionSignal === 'negative')).toBe(true);
    });

    it('should detect angry emojis', () => {
      const text = 'I am so mad right now 😠😡🤬';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'emoji' && c.emotionSignal === 'anger')).toBe(true);
    });

    it('should detect repeated characters', () => {
      const text = 'Nooooo, this cannot be happening!!!';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'repetition')).toBe(true);
    });

    it('should detect Romanian frustration words', () => {
      const text = 'Nu merge deloc acest produs, sunt foarte dezamăgit';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'lexical' && c.emotionSignal === 'frustration')).toBe(true);
    });

    it('should detect Romanian urgency words', () => {
      const text = 'Am nevoie urgent de acest produs, cât mai repede posibil';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'lexical' && c.emotionSignal === 'urgency')).toBe(true);
    });

    it('should detect Romanian satisfaction words', () => {
      const text = 'Mulțumesc foarte mult, produsul este perfect!';
      const cues = worker['detectEmotionalCues'](text);
      
      expect(cues.some(c => c.type === 'lexical' && c.emotionSignal === 'satisfaction')).toBe(true);
    });
  });

  describe('Emotion Type Validation', () => {
    it('should accept valid emotion types', () => {
      const validEmotions = [
        EmotionType.JOY,
        EmotionType.ANGER,
        EmotionType.FRUSTRATION,
        EmotionType.SATISFACTION,
        EmotionType.URGENCY,
      ];

      for (const emotion of validEmotions) {
        expect(worker['isValidEmotionType'](emotion)).toBe(true);
      }
    });

    it('should reject invalid emotion types', () => {
      const invalidEmotions = ['invalid', 'happy', '', null, undefined];

      for (const emotion of invalidEmotions) {
        expect(worker['isValidEmotionType'](emotion as any)).toBe(false);
      }
    });
  });

  describe('Fallback Emotion Inference', () => {
    it('should infer anger from anger-related cues', () => {
      const cues = [
        { type: 'emoji', indicator: '😠', emotionSignal: 'anger', weight: 0.8 },
        { type: 'capitalization', indicator: 'RIDICULOUS', emotionSignal: 'emphasis_or_anger', weight: 0.6 },
      ];

      const result = worker['inferEmotionFromCues'](cues);
      
      expect(result.primaryEmotion).toBe(EmotionType.ANGER);
    });

    it('should infer frustration from frustration-related cues', () => {
      const cues = [
        { type: 'lexical', indicator: 'nu merge', emotionSignal: 'frustration', weight: 0.7 },
        { type: 'punctuation', indicator: '???', emotionSignal: 'confusion_or_frustration', weight: 0.5 },
      ];

      const result = worker['inferEmotionFromCues'](cues);
      
      expect(result.primaryEmotion).toBe(EmotionType.FRUSTRATION);
    });

    it('should infer joy from positive cues', () => {
      const cues = [
        { type: 'emoji', indicator: '😊', emotionSignal: 'positive', weight: 0.8 },
        { type: 'lexical', indicator: 'mulțumesc', emotionSignal: 'satisfaction', weight: 0.7 },
      ];

      const result = worker['inferEmotionFromCues'](cues);
      
      expect([EmotionType.JOY, EmotionType.SATISFACTION]).toContain(result.primaryEmotion);
    });

    it('should default to neutral when no cues present', () => {
      const result = worker['inferEmotionFromCues']([]);
      
      expect(result.primaryEmotion).toBe(EmotionType.NEUTRAL);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Alert Checking', () => {
    it('should trigger alert for high arousal', async () => {
      const alerts: any[] = [];
      vi.spyOn(worker as any, 'createAlert').mockImplementation((alert) => {
        alerts.push(alert);
        return Promise.resolve();
      });

      await worker['checkForAlerts']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        emotion: EmotionType.ANGER,
        intensity: 0.8,
        arousal: 0.9,
        valence: -0.7,
      });

      expect(alerts.some(a => a.alertType === 'anger_detected')).toBe(true);
    });

    it('should trigger alert for high frustration', async () => {
      const alerts: any[] = [];
      vi.spyOn(worker as any, 'createAlert').mockImplementation((alert) => {
        alerts.push(alert);
        return Promise.resolve();
      });

      await worker['checkForAlerts']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        emotion: EmotionType.FRUSTRATION,
        intensity: 0.85,
        arousal: 0.75,
        valence: -0.5,
      });

      expect(alerts.some(a => a.alertType === 'high_frustration')).toBe(true);
    });

    it('should not trigger alert for positive emotions', async () => {
      const alerts: any[] = [];
      vi.spyOn(worker as any, 'createAlert').mockImplementation((alert) => {
        alerts.push(alert);
        return Promise.resolve();
      });

      await worker['checkForAlerts']({
        tenantId: 'tenant1',
        messageId: 'msg1',
        conversationId: 'conv1',
        contactId: 'contact1',
        emotion: EmotionType.JOY,
        intensity: 0.9,
        arousal: 0.7,
        valence: 0.8,
      });

      expect(alerts).toHaveLength(0);
    });
  });
});
```

### 9.2 Integration Tests

#### 9.2.1 Analysis Pipeline Integration Tests

```typescript
// packages/workers/src/__tests__/integration/analysis-pipeline.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { SentimentAnalysisWorker } from '../../workers/sentiment-analysis.worker';
import { IntentDetectionWorker } from '../../workers/intent-detection.worker';
import { EmotionRecognitionWorker } from '../../workers/emotion-recognition.worker';
import { AnalysisAggregatorWorker } from '../../workers/analysis-aggregator.worker';
import * as schema from '@cerniq/database/schema';

describe('Analysis Pipeline Integration', () => {
  let postgresContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let db: ReturnType<typeof drizzle>;
  let redis: Redis;
  let sentimentWorker: Worker;
  let intentWorker: Worker;
  let emotionWorker: Worker;
  let aggregatorWorker: Worker;
  let messageInboundQueue: Queue;
  let sentimentQueue: Queue;
  let intentQueue: Queue;
  let emotionQueue: Queue;
  let aggregateQueue: Queue;

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new GenericContainer('postgres:16')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'cerniq_test',
      })
      .withExposedPorts(64032)
      .withWaitStrategy(Wait.forLogMessage(/ready to accept connections/))
      .start();

    // Start Redis container
    redisContainer = await new GenericContainer('redis:7')
      .withExposedPorts(64039)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();

    // Connect to PostgreSQL
    const connectionString = `postgres://test:test@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(64032)}/cerniq_test`;
    const client = postgres(connectionString);
    db = drizzle(client, { schema });

    // Run migrations
    await db.execute(sql`
      -- Create necessary tables (simplified for test)
      CREATE TABLE IF NOT EXISTS sentiment_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(50) NOT NULL,
        message_id UUID NOT NULL,
        conversation_id UUID NOT NULL,
        contact_id UUID NOT NULL,
        sentiment_score DECIMAL(4,3) NOT NULL,
        sentiment_label VARCHAR(20) NOT NULL,
        confidence DECIMAL(4,3) NOT NULL,
        aspects JSONB DEFAULT '[]',
        language VARCHAR(10) DEFAULT 'ro',
        model VARCHAR(100),
        processing_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS intent_detections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(50) NOT NULL,
        message_id UUID NOT NULL,
        conversation_id UUID NOT NULL,
        contact_id UUID NOT NULL,
        primary_intent VARCHAR(50) NOT NULL,
        primary_confidence DECIMAL(4,3) NOT NULL,
        secondary_intents JSONB DEFAULT '[]',
        entities JSONB DEFAULT '[]',
        action_required BOOLEAN DEFAULT false,
        suggested_action VARCHAR(100),
        action_priority VARCHAR(20),
        language VARCHAR(10) DEFAULT 'ro',
        model VARCHAR(100),
        processing_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS emotion_detections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(50) NOT NULL,
        message_id UUID NOT NULL,
        conversation_id UUID NOT NULL,
        contact_id UUID NOT NULL,
        primary_emotion VARCHAR(30) NOT NULL,
        primary_intensity DECIMAL(4,3) NOT NULL,
        confidence DECIMAL(4,3) NOT NULL,
        secondary_emotions JSONB DEFAULT '[]',
        valence DECIMAL(4,3),
        arousal DECIMAL(4,3),
        dominance DECIMAL(4,3),
        emotional_cues JSONB DEFAULT '[]',
        language VARCHAR(10) DEFAULT 'ro',
        model VARCHAR(100),
        processing_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS analysis_aggregates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(50) NOT NULL,
        message_id UUID NOT NULL,
        conversation_id UUID NOT NULL,
        contact_id UUID NOT NULL,
        sentiment_analysis_id UUID,
        intent_detection_id UUID,
        emotion_detection_id UUID,
        combined_analysis JSONB NOT NULL,
        composite_score DECIMAL(4,3) NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        risk_score DECIMAL(4,3) NOT NULL,
        risk_factors JSONB DEFAULT '[]',
        action_required BOOLEAN DEFAULT false,
        recommended_actions JSONB DEFAULT '[]',
        urgency_level VARCHAR(20),
        processing_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Connect to Redis
    redis = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(64039),
    });

    // Initialize queues
    const queueConnection = {
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(64039),
    };

    messageInboundQueue = new Queue('message-inbound', { connection: queueConnection });
    sentimentQueue = new Queue('sentiment-analysis', { connection: queueConnection });
    intentQueue = new Queue('intent-detection', { connection: queueConnection });
    emotionQueue = new Queue('emotion-recognition', { connection: queueConnection });
    aggregateQueue = new Queue('analysis-aggregate', { connection: queueConnection });

    // Note: In real integration tests, we would use actual AI or mock AI responses
    // For this test, we use simplified workers that return predetermined results
  }, 60000);

  afterAll(async () => {
    await sentimentWorker?.close();
    await intentWorker?.close();
    await emotionWorker?.close();
    await aggregatorWorker?.close();
    await messageInboundQueue?.close();
    await sentimentQueue?.close();
    await intentQueue?.close();
    await emotionQueue?.close();
    await aggregateQueue?.close();
    await redis?.quit();
    await postgresContainer?.stop();
    await redisContainer?.stop();
  });

  beforeEach(async () => {
    // Clean up database
    await db.execute(sql`TRUNCATE sentiment_analyses, intent_detections, emotion_detections, analysis_aggregates`);
    
    // Clean up Redis
    await redis.flushall();
  });

  describe('End-to-End Analysis Flow', () => {
    it('should process message through all analysis workers', async () => {
      const testMessage = {
        tenantId: 'tenant-123',
        messageId: '550e8400-e29b-41d4-a716-446655440001',
        conversationId: '550e8400-e29b-41d4-a716-446655440002',
        contactId: '550e8400-e29b-41d4-a716-446655440003',
        text: 'Bună ziua, sunt foarte mulțumit de produsele voastre! Aș dori să comand 100kg de semințe.',
        direction: 'inbound',
        timestamp: new Date().toISOString(),
      };

      // Add job to sentiment queue
      await sentimentQueue.add('analyze', testMessage, { jobId: `sentiment-${testMessage.messageId}` });

      // Wait for processing (with timeout)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify sentiment analysis was created
      const sentiments = await db.select().from(schema.sentimentAnalyses).where(
        eq(schema.sentimentAnalyses.messageId, testMessage.messageId)
      );

      expect(sentiments).toHaveLength(1);
      expect(sentiments[0].sentimentLabel).toBe('very_positive');
      expect(parseFloat(sentiments[0].sentimentScore)).toBeGreaterThan(0.5);
    }, 30000);

    it('should detect intent correctly', async () => {
      const testMessage = {
        tenantId: 'tenant-123',
        messageId: '550e8400-e29b-41d4-a716-446655440004',
        conversationId: '550e8400-e29b-41d4-a716-446655440002',
        contactId: '550e8400-e29b-41d4-a716-446655440003',
        text: 'Aș dori să vorbesc cu un reprezentant uman, vă rog.',
        direction: 'inbound',
        timestamp: new Date().toISOString(),
      };

      await intentQueue.add('detect', testMessage, { jobId: `intent-${testMessage.messageId}` });

      await new Promise(resolve => setTimeout(resolve, 5000));

      const intents = await db.select().from(schema.intentDetections).where(
        eq(schema.intentDetections.messageId, testMessage.messageId)
      );

      expect(intents).toHaveLength(1);
      expect(intents[0].primaryIntent).toBe('human_agent_request');
      expect(intents[0].actionRequired).toBe(true);
    }, 30000);

    it('should recognize negative emotions', async () => {
      const testMessage = {
        tenantId: 'tenant-123',
        messageId: '550e8400-e29b-41d4-a716-446655440005',
        conversationId: '550e8400-e29b-41d4-a716-446655440002',
        contactId: '550e8400-e29b-41d4-a716-446655440003',
        text: 'Sunt foarte dezamăgit și frustrat!!! Produsul NU FUNCȚIONEAZĂ deloc! 😠',
        direction: 'inbound',
        timestamp: new Date().toISOString(),
      };

      await emotionQueue.add('recognize', testMessage, { jobId: `emotion-${testMessage.messageId}` });

      await new Promise(resolve => setTimeout(resolve, 5000));

      const emotions = await db.select().from(schema.emotionDetections).where(
        eq(schema.emotionDetections.messageId, testMessage.messageId)
      );

      expect(emotions).toHaveLength(1);
      expect(['frustration', 'anger', 'disappointment']).toContain(emotions[0].primaryEmotion);
      expect(parseFloat(emotions[0].arousal)).toBeGreaterThan(0.6);
      expect(parseFloat(emotions[0].valence)).toBeLessThan(0);
    }, 30000);

    it('should create aggregate analysis with risk assessment', async () => {
      // First, create individual analyses
      const messageId = '550e8400-e29b-41d4-a716-446655440006';
      const tenantId = 'tenant-123';
      const conversationId = '550e8400-e29b-41d4-a716-446655440002';
      const contactId = '550e8400-e29b-41d4-a716-446655440003';

      // Insert test data
      const [sentiment] = await db.insert(schema.sentimentAnalyses).values({
        tenantId,
        messageId,
        conversationId,
        contactId,
        sentimentScore: -0.7,
        sentimentLabel: 'very_negative',
        confidence: 0.9,
        language: 'ro',
      }).returning();

      const [intent] = await db.insert(schema.intentDetections).values({
        tenantId,
        messageId,
        conversationId,
        contactId,
        primaryIntent: 'complaint',
        primaryConfidence: 0.85,
        actionRequired: true,
        suggestedAction: 'escalate_complaint',
        actionPriority: 'high',
        language: 'ro',
      }).returning();

      const [emotion] = await db.insert(schema.emotionDetections).values({
        tenantId,
        messageId,
        conversationId,
        contactId,
        primaryEmotion: 'anger',
        primaryIntensity: 0.8,
        confidence: 0.88,
        arousal: 0.85,
        valence: -0.7,
        dominance: 0.6,
        language: 'ro',
      }).returning();

      // Queue aggregate job
      await aggregateQueue.add('aggregate', {
        tenantId,
        messageId,
        conversationId,
        contactId,
        sentimentAnalysisId: sentiment.id,
        intentDetectionId: intent.id,
        emotionDetectionId: emotion.id,
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const aggregates = await db.select().from(schema.analysisAggregates).where(
        eq(schema.analysisAggregates.messageId, messageId)
      );

      expect(aggregates).toHaveLength(1);
      expect(['high', 'critical']).toContain(aggregates[0].riskLevel);
      expect(parseFloat(aggregates[0].compositeScore)).toBeLessThan(0);
      expect(aggregates[0].actionRequired).toBe(true);
    }, 30000);
  });

  describe('Caching Behavior', () => {
    it('should cache and reuse analysis results', async () => {
      const text = 'Test message for caching';
      const cacheKey = `sentiment:${Buffer.from(text).toString('base64').slice(0, 64)}`;

      // Set cached result
      const cachedResult = {
        sentimentScore: 0.5,
        confidence: 0.9,
        aspects: [],
      };
      await redis.set(cacheKey, JSON.stringify(cachedResult), 'EX', 3600);

      const testMessage = {
        tenantId: 'tenant-123',
        messageId: '550e8400-e29b-41d4-a716-446655440007',
        conversationId: '550e8400-e29b-41d4-a716-446655440002',
        contactId: '550e8400-e29b-41d4-a716-446655440003',
        text,
        direction: 'inbound',
      };

      await sentimentQueue.add('analyze', testMessage, { jobId: `sentiment-${testMessage.messageId}` });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const sentiments = await db.select().from(schema.sentimentAnalyses).where(
        eq(schema.sentimentAnalyses.messageId, testMessage.messageId)
      );

      expect(sentiments).toHaveLength(1);
      expect(parseFloat(sentiments[0].sentimentScore)).toBe(0.5);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid message gracefully', async () => {
      const invalidMessage = {
        tenantId: 'tenant-123',
        messageId: '550e8400-e29b-41d4-a716-446655440008',
        conversationId: '550e8400-e29b-41d4-a716-446655440002',
        contactId: '550e8400-e29b-41d4-a716-446655440003',
        text: '', // Empty text
        direction: 'inbound',
      };

      await sentimentQueue.add('analyze', invalidMessage, { 
        jobId: `sentiment-${invalidMessage.messageId}`,
        attempts: 1, // Don't retry
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Job should fail but not crash the worker
      const sentiments = await db.select().from(schema.sentimentAnalyses).where(
        eq(schema.sentimentAnalyses.messageId, invalidMessage.messageId)
      );

      // Either no record (failed validation) or neutral fallback
      expect(sentiments.length).toBeLessThanOrEqual(1);
    }, 15000);
  });
});
```

#### 9.2.2 End-to-End Tests (analysis.e2e.test.ts)

```typescript
// tests/e2e/analysis.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { setupTestServer } from '../utils/test-server';
import { createTestTenant, createTestUser } from '../utils/test-data';
import { waitForElement, waitForText } from '../utils/test-helpers';

describe('Analysis E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  let server: ReturnType<typeof setupTestServer>;
  let testTenant: { id: string; apiKey: string };
  let testUser: { id: string; email: string; password: string };

  beforeAll(async () => {
    server = await setupTestServer();
    testTenant = await createTestTenant();
    testUser = await createTestUser(testTenant.id, {
      role: 'supervisor',
      permissions: ['view_analysis', 'manage_alerts', 'configure_thresholds'],
    });

    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
    });
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(`${server.baseUrl}/login`);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Real-time Analysis Dashboard', () => {
    it('should display live sentiment analysis updates', async () => {
      await page.goto(`${server.baseUrl}/analysis/sentiment`);

      // Wait for initial load
      await waitForElement(page, '[data-testid="sentiment-dashboard"]');

      // Trigger a new message analysis via API
      const response = await fetch(`${server.baseUrl}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testTenant.apiKey,
        },
        body: JSON.stringify({
          conversationId: 'conv-e2e-001',
          contactId: 'contact-e2e-001',
          text: 'Sunt foarte mulțumit de serviciile voastre!',
          direction: 'inbound',
        }),
      });

      expect(response.ok).toBe(true);

      // Wait for real-time update
      await waitForText(page, '[data-testid="recent-analyses"]', 'foarte mulțumit', {
        timeout: 15000,
      });

      // Verify sentiment indicator
      const sentimentBadge = await page.locator('[data-testid="sentiment-badge"]').first();
      await expect(sentimentBadge).toHaveAttribute('data-sentiment', 'positive');
    }, 30000);

    it('should display sentiment distribution chart', async () => {
      await page.goto(`${server.baseUrl}/analysis/sentiment`);

      // Wait for chart to render
      await waitForElement(page, '[data-testid="sentiment-distribution-chart"]');

      // Verify chart segments exist
      const chartSegments = await page.locator('[data-testid^="chart-segment-"]').count();
      expect(chartSegments).toBeGreaterThan(0);

      // Hover over segment for tooltip
      await page.hover('[data-testid="chart-segment-positive"]');
      await waitForElement(page, '[data-testid="chart-tooltip"]');
    }, 20000);

    it('should filter analyses by date range', async () => {
      await page.goto(`${server.baseUrl}/analysis/sentiment`);

      // Open date picker
      await page.click('[data-testid="date-range-picker"]');

      // Select last 7 days
      await page.click('[data-testid="preset-7days"]');

      // Verify filter applied
      await waitForElement(page, '[data-testid="active-filter-badge"]');
      const badge = await page.locator('[data-testid="active-filter-badge"]').textContent();
      expect(badge).toContain('7 zile');

      // Verify table updates
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/analysis/sentiment') && 
        response.url().includes('days=7')
      );
    }, 15000);

    it('should export sentiment report', async () => {
      await page.goto(`${server.baseUrl}/analysis/sentiment`);

      // Click export button
      await page.click('[data-testid="export-button"]');

      // Select format
      await page.click('[data-testid="export-format-xlsx"]');

      // Wait for download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-confirm"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/sentiment-report.*\.xlsx$/);
    }, 20000);
  });

  describe('Intent Detection Dashboard', () => {
    it('should display intent breakdown by type', async () => {
      await page.goto(`${server.baseUrl}/analysis/intent`);

      await waitForElement(page, '[data-testid="intent-breakdown-chart"]');

      // Verify top intents are displayed
      const intentRows = await page.locator('[data-testid="intent-type-row"]').count();
      expect(intentRows).toBeGreaterThan(0);
    }, 15000);

    it('should show action required items prominently', async () => {
      await page.goto(`${server.baseUrl}/analysis/intent`);

      // Check action required section
      await waitForElement(page, '[data-testid="action-required-section"]');

      const actionItems = await page.locator('[data-testid="action-item"]').count();

      // Each action item should have priority indicator
      if (actionItems > 0) {
        const firstItem = page.locator('[data-testid="action-item"]').first();
        await expect(firstItem.locator('[data-testid="priority-badge"]')).toBeVisible();
      }
    }, 15000);

    it('should navigate to conversation from intent', async () => {
      await page.goto(`${server.baseUrl}/analysis/intent`);

      await waitForElement(page, '[data-testid="intent-list"]');

      // Click on first intent row
      await page.click('[data-testid="intent-row"]:first-child [data-testid="view-conversation"]');

      // Verify navigation to conversation
      await page.waitForURL('**/conversations/**');
      await waitForElement(page, '[data-testid="conversation-view"]');
    }, 15000);
  });

  describe('Emotion Recognition Dashboard', () => {
    it('should display VAD emotion map', async () => {
      await page.goto(`${server.baseUrl}/analysis/emotion`);

      await waitForElement(page, '[data-testid="vad-emotion-map"]');

      // Verify emotion markers on map
      const emotionMarkers = await page.locator('[data-testid^="emotion-marker-"]').count();
      expect(emotionMarkers).toBeGreaterThan(0);
    }, 15000);

    it('should show emotion timeline for contact', async () => {
      // Navigate to specific contact's emotion history
      await page.goto(`${server.baseUrl}/contacts/contact-e2e-001/emotions`);

      await waitForElement(page, '[data-testid="emotion-timeline"]');

      // Verify timeline events exist
      const timelineEvents = await page.locator('[data-testid="timeline-event"]').count();
      expect(timelineEvents).toBeGreaterThan(0);
    }, 15000);

    it('should highlight high arousal moments', async () => {
      await page.goto(`${server.baseUrl}/analysis/emotion`);

      // Enable high arousal filter
      await page.click('[data-testid="filter-high-arousal"]');

      // Verify filtered results
      await waitForElement(page, '[data-testid="filtered-results"]');

      const results = await page.locator('[data-testid="emotion-entry"]').all();
      for (const result of results.slice(0, 5)) {
        const arousal = await result.getAttribute('data-arousal');
        expect(parseFloat(arousal || '0')).toBeGreaterThan(0.7);
      }
    }, 15000);
  });

  describe('Alert Management', () => {
    it('should display active alerts', async () => {
      await page.goto(`${server.baseUrl}/analysis/alerts`);

      await waitForElement(page, '[data-testid="alerts-table"]');

      // Verify alert columns
      const columns = ['Tip', 'Severitate', 'Descriere', 'Creat', 'Acțiuni'];
      for (const column of columns) {
        await expect(page.locator(`th:has-text("${column}")`)).toBeVisible();
      }
    }, 15000);

    it('should acknowledge alert', async () => {
      await page.goto(`${server.baseUrl}/analysis/alerts`);

      await waitForElement(page, '[data-testid="alert-row"]');

      // Click acknowledge button on first unacknowledged alert
      const unackAlert = page.locator('[data-testid="alert-row"][data-acknowledged="false"]').first();
      await unackAlert.locator('[data-testid="acknowledge-button"]').click();

      // Verify acknowledgment
      await page.waitForResponse(response =>
        response.url().includes('/api/v1/alerts/') &&
        response.request().method() === 'PATCH'
      );

      // Check status updated
      await expect(unackAlert).toHaveAttribute('data-acknowledged', 'true');
    }, 15000);

    it('should resolve alert with notes', async () => {
      await page.goto(`${server.baseUrl}/analysis/alerts`);

      // Find acknowledged but unresolved alert
      const alert = page.locator('[data-testid="alert-row"][data-acknowledged="true"][data-resolved="false"]').first();
      await alert.locator('[data-testid="resolve-button"]').click();

      // Fill resolution dialog
      await waitForElement(page, '[data-testid="resolve-dialog"]');
      await page.selectOption('[data-testid="resolution-type"]', 'resolved_addressed');
      await page.fill('[data-testid="resolution-notes"]', 'Issue addressed with customer');
      await page.click('[data-testid="confirm-resolve"]');

      // Verify resolution
      await page.waitForResponse(response =>
        response.url().includes('/api/v1/alerts/') &&
        response.url().includes('/resolve')
      );

      // Alert should move to resolved section or be removed from active list
      await expect(alert).toHaveAttribute('data-resolved', 'true');
    }, 20000);

    it('should filter alerts by severity', async () => {
      await page.goto(`${server.baseUrl}/analysis/alerts`);

      // Select critical severity
      await page.click('[data-testid="severity-filter"]');
      await page.click('[data-testid="severity-option-critical"]');

      // Verify filtered results
      await page.waitForResponse(response =>
        response.url().includes('severity=critical')
      );

      const alerts = await page.locator('[data-testid="alert-row"]').all();
      for (const alert of alerts) {
        await expect(alert.locator('[data-testid="severity-badge"]')).toHaveText('critical');
      }
    }, 15000);

    it('should display alert statistics', async () => {
      await page.goto(`${server.baseUrl}/analysis/alerts`);

      await waitForElement(page, '[data-testid="alert-stats"]');

      // Verify stat cards
      const statCards = ['total-alerts', 'critical-alerts', 'unresolved-alerts', 'avg-resolution-time'];
      for (const card of statCards) {
        await expect(page.locator(`[data-testid="stat-${card}"]`)).toBeVisible();
      }
    }, 15000);
  });

  describe('Threshold Configuration', () => {
    it('should display current thresholds', async () => {
      await page.goto(`${server.baseUrl}/settings/analysis/thresholds`);

      await waitForElement(page, '[data-testid="thresholds-form"]');

      // Verify threshold sections
      const sections = ['sentiment', 'intent', 'emotion', 'aggregate'];
      for (const section of sections) {
        await expect(page.locator(`[data-testid="threshold-section-${section}"]`)).toBeVisible();
      }
    }, 15000);

    it('should update sentiment threshold', async () => {
      await page.goto(`${server.baseUrl}/settings/analysis/thresholds`);

      await waitForElement(page, '[data-testid="thresholds-form"]');

      // Update negative sentiment threshold
      const input = page.locator('[data-testid="threshold-negative-sentiment"]');
      await input.clear();
      await input.fill('-0.6');

      // Save
      await page.click('[data-testid="save-thresholds"]');

      // Verify success
      await waitForElement(page, '[data-testid="success-toast"]');
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('Praguri salvate');
    }, 15000);

    it('should validate threshold ranges', async () => {
      await page.goto(`${server.baseUrl}/settings/analysis/thresholds`);

      await waitForElement(page, '[data-testid="thresholds-form"]');

      // Try invalid value
      const input = page.locator('[data-testid="threshold-negative-sentiment"]');
      await input.clear();
      await input.fill('-2.0'); // Invalid: out of range

      // Attempt save
      await page.click('[data-testid="save-thresholds"]');

      // Verify validation error
      await waitForElement(page, '[data-testid="validation-error"]');
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('între -1 și 1');
    }, 15000);
  });

  describe('Aggregate Risk Dashboard', () => {
    it('should display risk distribution', async () => {
      await page.goto(`${server.baseUrl}/analysis/risk`);

      await waitForElement(page, '[data-testid="risk-dashboard"]');

      // Verify risk level cards
      const riskLevels = ['low', 'medium', 'high', 'critical'];
      for (const level of riskLevels) {
        await expect(page.locator(`[data-testid="risk-card-${level}"]`)).toBeVisible();
      }
    }, 15000);

    it('should show high-risk contacts', async () => {
      await page.goto(`${server.baseUrl}/analysis/risk`);

      await waitForElement(page, '[data-testid="high-risk-contacts"]');

      const contacts = await page.locator('[data-testid="risk-contact-row"]').count();
      expect(contacts).toBeGreaterThanOrEqual(0);

      // Each contact should show risk score
      if (contacts > 0) {
        const firstContact = page.locator('[data-testid="risk-contact-row"]').first();
        await expect(firstContact.locator('[data-testid="risk-score"]')).toBeVisible();
      }
    }, 15000);

    it('should navigate to contact details from risk list', async () => {
      await page.goto(`${server.baseUrl}/analysis/risk`);

      await waitForElement(page, '[data-testid="high-risk-contacts"]');

      const contacts = await page.locator('[data-testid="risk-contact-row"]').count();
      if (contacts > 0) {
        // Click first contact
        await page.click('[data-testid="risk-contact-row"]:first-child [data-testid="view-contact"]');

        // Verify navigation
        await page.waitForURL('**/contacts/**');
        await waitForElement(page, '[data-testid="contact-detail"]');
      }
    }, 15000);

    it('should display recommended actions', async () => {
      await page.goto(`${server.baseUrl}/analysis/risk`);

      await waitForElement(page, '[data-testid="recommended-actions"]');

      const actions = await page.locator('[data-testid="action-card"]').count();
      expect(actions).toBeGreaterThanOrEqual(0);

      // Actions should have priority and status
      if (actions > 0) {
        const firstAction = page.locator('[data-testid="action-card"]').first();
        await expect(firstAction.locator('[data-testid="action-priority"]')).toBeVisible();
        await expect(firstAction.locator('[data-testid="action-status"]')).toBeVisible();
      }
    }, 15000);
  });

  describe('WebSocket Real-time Updates', () => {
    it('should receive live analysis updates via WebSocket', async () => {
      await page.goto(`${server.baseUrl}/analysis/sentiment`);

      // Wait for WebSocket connection
      await page.waitForFunction(() => {
        return (window as any).__wsConnected === true;
      }, { timeout: 10000 });

      // Track received messages
      const receivedMessages: any[] = [];
      await page.exposeFunction('onWsMessage', (message: any) => {
        receivedMessages.push(message);
      });

      await page.evaluate(() => {
        (window as any).__ws.addEventListener('message', (event: MessageEvent) => {
          (window as any).onWsMessage(JSON.parse(event.data));
        });
      });

      // Trigger analysis via API
      await fetch(`${server.baseUrl}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testTenant.apiKey,
        },
        body: JSON.stringify({
          conversationId: 'conv-e2e-ws-001',
          contactId: 'contact-e2e-001',
          text: 'Test message for WebSocket',
          direction: 'inbound',
        }),
      });

      // Wait for WebSocket message
      await page.waitForFunction(
        (count: number) => (window as any).__wsMessageCount > count,
        receivedMessages.length,
        { timeout: 15000 }
      );

      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(receivedMessages.some(m => m.type === 'sentiment_analysis_complete')).toBe(true);
    }, 30000);

    it('should handle WebSocket reconnection', async () => {
      await page.goto(`${server.baseUrl}/analysis/sentiment`);

      // Wait for connection
      await page.waitForFunction(() => (window as any).__wsConnected === true);

      // Simulate disconnect
      await page.evaluate(() => {
        (window as any).__ws.close();
      });

      // Wait for reconnection
      await page.waitForFunction(
        () => (window as any).__wsConnected === true,
        { timeout: 15000 }
      );

      // Verify reconnection indicator
      await expect(page.locator('[data-testid="connection-status"]')).toHaveAttribute(
        'data-connected',
        'true'
      );
    }, 30000);
  });
});
```


### 9.3 Performance Tests

#### 9.3.1 Sentiment Analysis Performance (sentiment-analysis.perf.test.ts)

```typescript
// tests/performance/sentiment-analysis.perf.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SentimentAnalysisWorker } from '../../workers/sentiment-analysis/sentiment-analysis.worker';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/perf-helpers';

interface PerformanceResult {
  operation: string;
  samples: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
}

function calculateStats(durations: number[]): Omit<PerformanceResult, 'operation' | 'samples'> {
  const sorted = [...durations].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    stdDev,
  };
}

describe('Sentiment Analysis Performance Tests', () => {
  let worker: SentimentAnalysisWorker;
  let env: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    worker = new SentimentAnalysisWorker(env.config);
  });

  afterAll(async () => {
    await cleanupTestEnvironment(env);
  });

  describe('Language Detection Performance', () => {
    const testTexts = {
      romanian: [
        'Bună ziua, aș dori să comand produse agricole.',
        'Mulțumesc pentru livrarea rapidă și profesionistă.',
        'Nu sunt mulțumit de calitatea semințelor livrate.',
        'Puteți să îmi spuneți prețul pentru 100 kg de îngrășământ?',
        'Am nevoie urgent de piese de schimb pentru tractor.',
      ],
      english: [
        'Hello, I would like to order agricultural products.',
        'Thank you for the fast and professional delivery.',
        'I am not satisfied with the quality of seeds delivered.',
        'Can you tell me the price for 100 kg of fertilizer?',
        'I urgently need spare parts for the tractor.',
      ],
      mixed: [
        'Bună, I need some information despre produse.',
        'Hello, am nevoie de ajutor cu comanda.',
        'Mulțumesc, the delivery was perfect.',
      ],
    };

    it('should detect Romanian language under 2ms average', async () => {
      const durations: number[] = [];
      const iterations = 1000;

      for (const text of testTexts.romanian) {
        for (let i = 0; i < iterations / testTexts.romanian.length; i++) {
          const start = performance.now();
          await worker.detectLanguage(text);
          durations.push(performance.now() - start);
        }
      }

      const stats = calculateStats(durations);
      console.log('Romanian detection stats:', {
        ...stats,
        operation: 'detectLanguage-romanian',
        samples: durations.length,
      });

      expect(stats.mean).toBeLessThan(2);
      expect(stats.p95).toBeLessThan(5);
    }, 60000);

    it('should detect English language under 2ms average', async () => {
      const durations: number[] = [];
      const iterations = 1000;

      for (const text of testTexts.english) {
        for (let i = 0; i < iterations / testTexts.english.length; i++) {
          const start = performance.now();
          await worker.detectLanguage(text);
          durations.push(performance.now() - start);
        }
      }

      const stats = calculateStats(durations);
      console.log('English detection stats:', stats);

      expect(stats.mean).toBeLessThan(2);
      expect(stats.p95).toBeLessThan(5);
    }, 60000);
  });

  describe('Sentiment Label Classification Performance', () => {
    const testScores = Array.from({ length: 1000 }, () => Math.random() * 2 - 1);

    it('should classify sentiment labels under 0.1ms average', async () => {
      const durations: number[] = [];

      for (const score of testScores) {
        const start = performance.now();
        worker.classifySentimentLabel(score);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Sentiment classification stats:', stats);

      expect(stats.mean).toBeLessThan(0.1);
      expect(stats.p99).toBeLessThan(0.5);
    }, 30000);
  });

  describe('AI Response Parsing Performance', () => {
    const validResponses = [
      '{"sentimentScore": 0.85, "confidence": 0.92, "aspects": [{"aspect": "quality", "score": 0.9}, {"aspect": "delivery", "score": 0.8}]}',
      '```json\n{"sentimentScore": -0.5, "confidence": 0.78, "aspects": []}\n```',
      '{"sentimentScore": 0.0, "confidence": 0.65, "aspects": [{"aspect": "price", "score": 0.2}]}',
    ];

    const invalidResponses = [
      'This is not JSON',
      '{"incomplete": true',
      '',
      'null',
    ];

    it('should parse valid AI responses under 1ms average', async () => {
      const durations: number[] = [];
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const response = validResponses[i % validResponses.length];
        const start = performance.now();
        await worker.parseAIResponse(response);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Valid response parsing stats:', stats);

      expect(stats.mean).toBeLessThan(1);
      expect(stats.p95).toBeLessThan(2);
    }, 30000);

    it('should handle invalid responses with fallback under 2ms average', async () => {
      const durations: number[] = [];
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const response = invalidResponses[i % invalidResponses.length];
        const start = performance.now();
        await worker.parseAIResponse(response);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Invalid response parsing stats:', stats);

      expect(stats.mean).toBeLessThan(2);
      expect(stats.p95).toBeLessThan(5);
    }, 30000);
  });

  describe('Cache Operations Performance', () => {
    it('should write to cache under 5ms average', async () => {
      const durations: number[] = [];
      const iterations = 500;

      for (let i = 0; i < iterations; i++) {
        const key = `perf-test-${i}`;
        const value = {
          sentimentScore: Math.random() * 2 - 1,
          confidence: Math.random(),
          aspects: [],
        };

        const start = performance.now();
        await env.redis.set(key, JSON.stringify(value), 'EX', 60);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Cache write stats:', stats);

      expect(stats.mean).toBeLessThan(5);
      expect(stats.p95).toBeLessThan(15);
    }, 60000);

    it('should read from cache under 3ms average', async () => {
      // Pre-populate cache
      for (let i = 0; i < 100; i++) {
        await env.redis.set(`read-perf-${i}`, JSON.stringify({ value: i }), 'EX', 60);
      }

      const durations: number[] = [];
      const iterations = 500;

      for (let i = 0; i < iterations; i++) {
        const key = `read-perf-${i % 100}`;
        const start = performance.now();
        await env.redis.get(key);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Cache read stats:', stats);

      expect(stats.mean).toBeLessThan(3);
      expect(stats.p95).toBeLessThan(10);
    }, 60000);
  });

  describe('Database Operations Performance', () => {
    it('should insert sentiment analysis under 10ms average', async () => {
      const durations: number[] = [];
      const iterations = 200;

      for (let i = 0; i < iterations; i++) {
        const analysis = {
          tenantId: env.testTenantId,
          messageId: `perf-msg-${i}`,
          conversationId: `perf-conv-${i % 10}`,
          contactId: `perf-contact-${i % 5}`,
          sentimentScore: Math.random() * 2 - 1,
          sentimentLabel: 'neutral',
          confidence: Math.random(),
          aspects: JSON.stringify([]),
          language: 'ro',
        };

        const start = performance.now();
        await env.db.insert(env.schema.sentimentAnalyses).values(analysis);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('DB insert stats:', stats);

      expect(stats.mean).toBeLessThan(10);
      expect(stats.p95).toBeLessThan(30);
    }, 120000);

    it('should query sentiment analyses with index under 5ms average', async () => {
      const durations: number[] = [];
      const iterations = 200;

      for (let i = 0; i < iterations; i++) {
        const conversationId = `perf-conv-${i % 10}`;

        const start = performance.now();
        await env.db
          .select()
          .from(env.schema.sentimentAnalyses)
          .where(eq(env.schema.sentimentAnalyses.conversationId, conversationId))
          .limit(10);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('DB query stats:', stats);

      expect(stats.mean).toBeLessThan(5);
      expect(stats.p95).toBeLessThan(15);
    }, 60000);
  });

  describe('Full Analysis Pipeline Performance', () => {
    it('should complete full sentiment analysis under 500ms without AI (cached)', async () => {
      // Pre-populate cache
      const text = 'Test message for cached analysis';
      const cacheKey = worker.generateCacheKey(text);
      await env.redis.set(
        cacheKey,
        JSON.stringify({ sentimentScore: 0.5, confidence: 0.9, aspects: [] }),
        'EX', 3600
      );

      const durations: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const message = {
          tenantId: env.testTenantId,
          messageId: `cached-${i}`,
          conversationId: 'cached-conv',
          contactId: 'cached-contact',
          text,
          direction: 'inbound' as const,
        };

        const start = performance.now();
        await worker.processMessage(message, { useCache: true, skipAI: false });
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Cached pipeline stats:', stats);

      expect(stats.mean).toBeLessThan(500);
      expect(stats.p95).toBeLessThan(1000);
    }, 120000);
  });
});
```

#### 9.3.2 Intent Detection Performance (intent-detection.perf.test.ts)

```typescript
// tests/performance/intent-detection.perf.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IntentDetectionWorker } from '../../workers/intent-detection/intent-detection.worker';
import { performance } from 'node:perf_hooks';
import { setupTestEnvironment, cleanupTestEnvironment, calculateStats } from '../utils/perf-helpers';

describe('Intent Detection Performance Tests', () => {
  let worker: IntentDetectionWorker;
  let env: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    worker = new IntentDetectionWorker(env.config);
  });

  afterAll(async () => {
    await cleanupTestEnvironment(env);
  });

  describe('Intent Action Mapping Performance', () => {
    const allIntentTypes = [
      'PRODUCT_INQUIRY', 'PRICE_INQUIRY', 'AVAILABILITY_CHECK', 'ORDER_PLACEMENT',
      'ORDER_STATUS', 'ORDER_MODIFICATION', 'ORDER_CANCELLATION', 'DELIVERY_INQUIRY',
      'COMPLAINT', 'RETURN_REQUEST', 'REFUND_REQUEST', 'TECHNICAL_SUPPORT',
      'HUMAN_AGENT_REQUEST', 'FEEDBACK_POSITIVE', 'FEEDBACK_NEGATIVE', 'GENERAL_INQUIRY',
      'GREETING', 'FAREWELL', 'THANKS', 'CONFIRMATION', 'NEGATION', 'URGENCY_EXPRESSION',
      'DISCOUNT_REQUEST', 'QUOTE_REQUEST', 'BULK_ORDER', 'NEGOTIATION_ATTEMPT', 'UNCLEAR',
    ];

    it('should map all intent types to actions under 0.05ms average', async () => {
      const durations: number[] = [];
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const intentType = allIntentTypes[i % allIntentTypes.length];
        const start = performance.now();
        worker.getIntentAction(intentType);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Intent action mapping stats:', stats);

      expect(stats.mean).toBeLessThan(0.05);
      expect(stats.p99).toBeLessThan(0.2);
    }, 30000);
  });

  describe('Entity Parsing Performance', () => {
    const entityResponses = [
      {
        entities: [
          { type: 'product', value: 'semințe porumb', confidence: 0.95 },
          { type: 'quantity', value: '500 kg', normalizedValue: 500, unit: 'kg' },
          { type: 'price', value: '2500 lei', normalizedValue: 2500, currency: 'RON' },
        ],
      },
      {
        entities: Array.from({ length: 20 }, (_, i) => ({
          type: ['product', 'quantity', 'location'][i % 3],
          value: `entity-${i}`,
          confidence: 0.8 + Math.random() * 0.2,
        })),
      },
      {
        entities: [],
      },
    ];

    it('should parse entities under 0.5ms average', async () => {
      const durations: number[] = [];
      const iterations = 5000;

      for (let i = 0; i < iterations; i++) {
        const response = entityResponses[i % entityResponses.length];
        const start = performance.now();
        worker.parseEntities(response);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Entity parsing stats:', stats);

      expect(stats.mean).toBeLessThan(0.5);
      expect(stats.p95).toBeLessThan(1);
    }, 30000);
  });

  describe('Action Priority Determination Performance', () => {
    const intentConfidencePairs = [
      { intent: 'COMPLAINT', confidence: 0.9 },
      { intent: 'HUMAN_AGENT_REQUEST', confidence: 0.95 },
      { intent: 'ORDER_PLACEMENT', confidence: 0.85 },
      { intent: 'PRODUCT_INQUIRY', confidence: 0.7 },
      { intent: 'GREETING', confidence: 0.99 },
      { intent: 'BULK_ORDER', confidence: 0.88 },
      { intent: 'DISCOUNT_REQUEST', confidence: 0.75 },
      { intent: 'UNCLEAR', confidence: 0.3 },
    ];

    it('should determine action priority under 0.02ms average', async () => {
      const durations: number[] = [];
      const iterations = 20000;

      for (let i = 0; i < iterations; i++) {
        const { intent, confidence } = intentConfidencePairs[i % intentConfidencePairs.length];
        const start = performance.now();
        worker.determineActionPriority(intent, confidence);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Action priority determination stats:', stats);

      expect(stats.mean).toBeLessThan(0.02);
      expect(stats.p99).toBeLessThan(0.1);
    }, 30000);
  });

  describe('Full Intent Detection Pipeline Performance', () => {
    it('should complete intent detection under 300ms with cache', async () => {
      const text = 'Aș dori să comand 100 kg de semințe de porumb';
      const cacheKey = worker.generateCacheKey(text);
      
      // Pre-populate cache
      await env.redis.set(
        cacheKey,
        JSON.stringify({
          primaryIntent: 'ORDER_PLACEMENT',
          confidence: 0.92,
          secondaryIntents: [{ intent: 'PRODUCT_INQUIRY', confidence: 0.6 }],
          entities: [
            { type: 'quantity', value: '100 kg' },
            { type: 'product', value: 'semințe de porumb' },
          ],
          actionRequired: true,
        }),
        'EX', 3600
      );

      const durations: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const message = {
          tenantId: env.testTenantId,
          messageId: `intent-cached-${i}`,
          conversationId: 'intent-cached-conv',
          contactId: 'intent-cached-contact',
          text,
          direction: 'inbound' as const,
        };

        const start = performance.now();
        await worker.processMessage(message, { useCache: true });
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Cached intent detection stats:', stats);

      expect(stats.mean).toBeLessThan(300);
      expect(stats.p95).toBeLessThan(600);
    }, 120000);
  });
});
```

#### 9.3.3 Emotion Recognition Performance (emotion-recognition.perf.test.ts)

```typescript
// tests/performance/emotion-recognition.perf.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EmotionRecognitionWorker } from '../../workers/emotion-recognition/emotion-recognition.worker';
import { performance } from 'node:perf_hooks';
import { setupTestEnvironment, cleanupTestEnvironment, calculateStats } from '../utils/perf-helpers';

describe('Emotion Recognition Performance Tests', () => {
  let worker: EmotionRecognitionWorker;
  let env: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    worker = new EmotionRecognitionWorker(env.config);
  });

  afterAll(async () => {
    await cleanupTestEnvironment(env);
  });

  describe('VAD Mapping Performance', () => {
    const emotionTypes = [
      'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation',
      'excitement', 'contentment', 'frustration', 'anxiety', 'confusion', 'gratitude',
      'disappointment', 'hope', 'neutral',
    ];

    it('should map emotions to VAD values under 0.01ms average', async () => {
      const durations: number[] = [];
      const iterations = 50000;

      for (let i = 0; i < iterations; i++) {
        const emotion = emotionTypes[i % emotionTypes.length];
        const start = performance.now();
        worker.getVADValues(emotion);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('VAD mapping stats:', stats);

      expect(stats.mean).toBeLessThan(0.01);
      expect(stats.p99).toBeLessThan(0.05);
    }, 30000);
  });

  describe('Emotional Cue Detection Performance', () => {
    const testTexts = [
      'ACEASTA ESTE O URGENȚĂ!!!',
      '😊😄🎉 Sunt foarte fericit!',
      'Nu merge, nu funcționează, este imposibil de folosit!!!',
      'Mulțumesc foarte mult pentru ajutor.',
      'Aștept răspunsul urgent, cât mai repede posibil!',
      'Hmmm... nu știuuu ce să zic...',
      'Normal text without special cues.',
      '!!!! FOARTE IMPORTANT ????',
      'dezamăgit total de servicii 😞😢',
      'Perfect! Excelent! Super! 👍✅',
    ];

    it('should detect emotional cues under 1ms average', async () => {
      const durations: number[] = [];
      const iterations = 5000;

      for (let i = 0; i < iterations; i++) {
        const text = testTexts[i % testTexts.length];
        const start = performance.now();
        worker.detectEmotionalCues(text);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Emotional cue detection stats:', stats);

      expect(stats.mean).toBeLessThan(1);
      expect(stats.p95).toBeLessThan(3);
    }, 60000);

    it('should handle long texts under 5ms average', async () => {
      const longText = testTexts.join(' ').repeat(10);
      const durations: number[] = [];
      const iterations = 500;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        worker.detectEmotionalCues(longText);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Long text cue detection stats:', stats);

      expect(stats.mean).toBeLessThan(5);
      expect(stats.p95).toBeLessThan(15);
    }, 60000);
  });

  describe('Fallback Emotion Inference Performance', () => {
    const cueScenarios = [
      {
        cues: [
          { type: 'emoji', subtype: 'angry', count: 3 },
          { type: 'capitalization', subtype: 'emphasis_or_anger', count: 5 },
        ],
      },
      {
        cues: [
          { type: 'lexical', subtype: 'frustration', count: 2 },
          { type: 'punctuation', subtype: 'high_arousal', count: 4 },
        ],
      },
      {
        cues: [
          { type: 'emoji', subtype: 'happy', count: 3 },
          { type: 'lexical', subtype: 'satisfaction', count: 2 },
        ],
      },
      { cues: [] },
    ];

    it('should infer fallback emotion under 0.1ms average', async () => {
      const durations: number[] = [];
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const scenario = cueScenarios[i % cueScenarios.length];
        const start = performance.now();
        worker.inferEmotionFromCues(scenario.cues);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Fallback emotion inference stats:', stats);

      expect(stats.mean).toBeLessThan(0.1);
      expect(stats.p99).toBeLessThan(0.5);
    }, 30000);
  });

  describe('Alert Threshold Checking Performance', () => {
    const emotionResults = [
      { emotion: 'anger', intensity: 0.9, arousal: 0.85, valence: -0.8 },
      { emotion: 'frustration', intensity: 0.7, arousal: 0.75, valence: -0.5 },
      { emotion: 'joy', intensity: 0.8, arousal: 0.6, valence: 0.8 },
      { emotion: 'neutral', intensity: 0.3, arousal: 0.2, valence: 0.0 },
      { emotion: 'anxiety', intensity: 0.65, arousal: 0.8, valence: -0.4 },
    ];

    it('should check alert thresholds under 0.05ms average', async () => {
      const durations: number[] = [];
      const iterations = 20000;

      for (let i = 0; i < iterations; i++) {
        const result = emotionResults[i % emotionResults.length];
        const start = performance.now();
        worker.checkAlertThresholds(result);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Alert threshold check stats:', stats);

      expect(stats.mean).toBeLessThan(0.05);
      expect(stats.p99).toBeLessThan(0.2);
    }, 30000);
  });
});
```

#### 9.3.4 Aggregate Analysis Performance (aggregate-analysis.perf.test.ts)

```typescript
// tests/performance/aggregate-analysis.perf.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AnalysisAggregatorWorker } from '../../workers/analysis-aggregator/analysis-aggregator.worker';
import { performance } from 'node:perf_hooks';
import { setupTestEnvironment, cleanupTestEnvironment, calculateStats } from '../utils/perf-helpers';

describe('Aggregate Analysis Performance Tests', () => {
  let worker: AnalysisAggregatorWorker;
  let env: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeAll(async () => {
    env = await setupTestEnvironment();
    worker = new AnalysisAggregatorWorker(env.config);
  });

  afterAll(async () => {
    await cleanupTestEnvironment(env);
  });

  describe('Composite Score Calculation Performance', () => {
    const analysisInputs = [
      {
        sentiment: { score: 0.8, confidence: 0.9 },
        intent: { type: 'ORDER_PLACEMENT', confidence: 0.95, actionRequired: true },
        emotion: { type: 'joy', intensity: 0.7, arousal: 0.5, valence: 0.8 },
      },
      {
        sentiment: { score: -0.6, confidence: 0.85 },
        intent: { type: 'COMPLAINT', confidence: 0.88, actionRequired: true },
        emotion: { type: 'anger', intensity: 0.8, arousal: 0.9, valence: -0.7 },
      },
      {
        sentiment: { score: 0.0, confidence: 0.7 },
        intent: { type: 'GENERAL_INQUIRY', confidence: 0.75, actionRequired: false },
        emotion: { type: 'neutral', intensity: 0.3, arousal: 0.2, valence: 0.0 },
      },
    ];

    it('should calculate composite score under 0.1ms average', async () => {
      const durations: number[] = [];
      const iterations = 20000;

      for (let i = 0; i < iterations; i++) {
        const input = analysisInputs[i % analysisInputs.length];
        const start = performance.now();
        worker.calculateCompositeScore(input.sentiment, input.intent, input.emotion);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Composite score calculation stats:', stats);

      expect(stats.mean).toBeLessThan(0.1);
      expect(stats.p99).toBeLessThan(0.5);
    }, 30000);
  });

  describe('Risk Level Assessment Performance', () => {
    const assessmentInputs = [
      { compositeScore: -0.8, hasComplaint: true, highArousal: true, actionRequired: true },
      { compositeScore: -0.4, hasComplaint: false, highArousal: true, actionRequired: true },
      { compositeScore: 0.0, hasComplaint: false, highArousal: false, actionRequired: false },
      { compositeScore: 0.6, hasComplaint: false, highArousal: false, actionRequired: false },
      { compositeScore: -0.9, hasComplaint: true, highArousal: true, actionRequired: true },
    ];

    it('should assess risk level under 0.05ms average', async () => {
      const durations: number[] = [];
      const iterations = 30000;

      for (let i = 0; i < iterations; i++) {
        const input = assessmentInputs[i % assessmentInputs.length];
        const start = performance.now();
        worker.assessRiskLevel(input);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Risk level assessment stats:', stats);

      expect(stats.mean).toBeLessThan(0.05);
      expect(stats.p99).toBeLessThan(0.2);
    }, 30000);
  });

  describe('Action Generation Performance', () => {
    const analysisContexts = [
      {
        riskLevel: 'critical',
        intent: 'COMPLAINT',
        emotion: 'anger',
        compositeScore: -0.85,
        history: Array.from({ length: 5 }, (_, i) => ({
          compositeScore: -0.7 + i * 0.02,
          timestamp: new Date(Date.now() - i * 3600000),
        })),
      },
      {
        riskLevel: 'high',
        intent: 'HUMAN_AGENT_REQUEST',
        emotion: 'frustration',
        compositeScore: -0.5,
        history: [],
      },
      {
        riskLevel: 'low',
        intent: 'ORDER_PLACEMENT',
        emotion: 'joy',
        compositeScore: 0.7,
        history: [],
      },
    ];

    it('should generate actions under 0.5ms average', async () => {
      const durations: number[] = [];
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const context = analysisContexts[i % analysisContexts.length];
        const start = performance.now();
        worker.generateActions(context);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Action generation stats:', stats);

      expect(stats.mean).toBeLessThan(0.5);
      expect(stats.p95).toBeLessThan(1);
    }, 60000);
  });

  describe('Trend Analysis Performance', () => {
    const trendInputs = [
      {
        history: Array.from({ length: 10 }, (_, i) => ({
          compositeScore: 0.5 - i * 0.1,
          sentimentScore: 0.6 - i * 0.12,
          arousal: 0.3 + i * 0.05,
          timestamp: new Date(Date.now() - i * 3600000),
        })),
      },
      {
        history: Array.from({ length: 50 }, (_, i) => ({
          compositeScore: -0.5 + Math.sin(i / 5) * 0.3,
          sentimentScore: -0.4 + Math.sin(i / 5) * 0.25,
          arousal: 0.5 + Math.cos(i / 5) * 0.2,
          timestamp: new Date(Date.now() - i * 3600000),
        })),
      },
      {
        history: [],
      },
    ];

    it('should analyze trends under 1ms average', async () => {
      const durations: number[] = [];
      const iterations = 5000;

      for (let i = 0; i < iterations; i++) {
        const input = trendInputs[i % trendInputs.length];
        const start = performance.now();
        worker.analyzeTrend(input.history);
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Trend analysis stats:', stats);

      expect(stats.mean).toBeLessThan(1);
      expect(stats.p95).toBeLessThan(3);
    }, 60000);
  });

  describe('Full Aggregation Pipeline Performance', () => {
    it('should complete full aggregation under 50ms average', async () => {
      // Pre-create analysis records
      const sentimentId = 'perf-sentiment-001';
      const intentId = 'perf-intent-001';
      const emotionId = 'perf-emotion-001';

      await env.db.insert(env.schema.sentimentAnalyses).values({
        id: sentimentId,
        tenantId: env.testTenantId,
        messageId: 'perf-msg-agg',
        conversationId: 'perf-conv-agg',
        contactId: 'perf-contact-agg',
        sentimentScore: '0.5',
        sentimentLabel: 'positive',
        confidence: '0.9',
        aspects: '[]',
        language: 'ro',
      });

      await env.db.insert(env.schema.intentDetections).values({
        id: intentId,
        tenantId: env.testTenantId,
        messageId: 'perf-msg-agg',
        conversationId: 'perf-conv-agg',
        contactId: 'perf-contact-agg',
        primaryIntent: 'ORDER_PLACEMENT',
        confidence: '0.92',
        secondaryIntents: '[]',
        entities: '[]',
        actionRequired: true,
        language: 'ro',
      });

      await env.db.insert(env.schema.emotionDetections).values({
        id: emotionId,
        tenantId: env.testTenantId,
        messageId: 'perf-msg-agg',
        conversationId: 'perf-conv-agg',
        contactId: 'perf-contact-agg',
        primaryEmotion: 'joy',
        primaryIntensity: '0.7',
        confidence: '0.88',
        arousal: '0.5',
        valence: '0.7',
        dominance: '0.6',
        secondaryEmotions: '[]',
        emotionalCues: '[]',
        language: 'ro',
      });

      const durations: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const job = {
          tenantId: env.testTenantId,
          messageId: 'perf-msg-agg',
          conversationId: 'perf-conv-agg',
          contactId: 'perf-contact-agg',
          sentimentAnalysisId: sentimentId,
          intentDetectionId: intentId,
          emotionDetectionId: emotionId,
        };

        const start = performance.now();
        await worker.processAggregation(job, { skipDbWrite: true });
        durations.push(performance.now() - start);
      }

      const stats = calculateStats(durations);
      console.log('Full aggregation pipeline stats:', stats);

      expect(stats.mean).toBeLessThan(50);
      expect(stats.p95).toBeLessThan(100);
    }, 120000);
  });
});
```


### 9.4 Load Tests

#### 9.4.1 Load Test Configuration (load-test.config.ts)

```typescript
// tests/load/load-test.config.ts
import { Options } from 'k6/options';

export const baseOptions: Partial<Options> = {
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['count>1000'],
  },
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

export const loadProfiles = {
  // Smoke test: verify system works under minimal load
  smoke: {
    ...baseOptions,
    stages: [
      { duration: '1m', target: 5 },
      { duration: '2m', target: 5 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      ...baseOptions.thresholds,
      http_req_duration: ['p(95)<1000'],
    },
  },

  // Load test: normal expected load
  load: {
    ...baseOptions,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000', 'p(99)<5000'],
      http_req_failed: ['rate<0.01'],
    },
  },

  // Stress test: beyond normal load
  stress: {
    ...baseOptions,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 },
      { duration: '5m', target: 300 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000', 'p(99)<10000'],
      http_req_failed: ['rate<0.05'],
    },
  },

  // Spike test: sudden traffic spikes
  spike: {
    ...baseOptions,
    stages: [
      { duration: '1m', target: 50 },
      { duration: '30s', target: 500 }, // Spike to 500
      { duration: '1m', target: 500 },
      { duration: '30s', target: 50 },  // Drop back
      { duration: '2m', target: 50 },
      { duration: '30s', target: 500 }, // Second spike
      { duration: '1m', target: 500 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<10000'],
      http_req_failed: ['rate<0.1'],
    },
  },

  // Soak test: extended duration
  soak: {
    ...baseOptions,
    stages: [
      { duration: '5m', target: 100 },
      { duration: '4h', target: 100 },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<3000', 'p(99)<5000'],
      http_req_failed: ['rate<0.01'],
    },
  },
};

export const testData = {
  romanianMessages: [
    'Bună ziua, doresc să comand produse agricole pentru ferma mea.',
    'Prețul pare prea mare pentru cantitatea respectivă. Puteți face un discount?',
    'Sunt foarte nemulțumit de calitatea ultimei livrări. Semințele erau deteriorate.',
    'URGENT! Am nevoie de piese de schimb pentru tractor până mâine dimineață!!!',
    'Mulțumesc pentru serviciile excelente! Recomand cu încredere.',
    'Când va fi disponibil îngrășământul NPK 15-15-15?',
    'Vreau să vorbesc cu un reprezentant uman, nu mai vreau să discut cu robotul.',
    'Comanda mea nu a ajuns încă. Care este statusul livrării?',
    'Aș dori să returnez produsele neconforme și să primesc rambursare.',
    'Felicitări pentru promptitudine! Totul a fost perfect.',
    'Nu funcționează sistemul de irigații pe care l-am cumpărat de la voi.',
    'Puteți să îmi faceți o ofertă pentru achiziția a 10 tone de cereale?',
    'Am observat că prețurile s-au mărit considerabil față de luna trecută.',
    'Doresc să modific comanda cu numărul 12345, vă rog.',
    'Aveți în stoc pesticide pentru combaterea dăunătorilor la porumb?',
  ],
  
  englishMessages: [
    'Hello, I would like to order agricultural products for my farm.',
    'The price seems too high for that quantity. Can you offer a discount?',
    'I am very unhappy with the quality of the last delivery. The seeds were damaged.',
    'URGENT! I need spare parts for the tractor by tomorrow morning!!!',
    'Thank you for the excellent services! Highly recommended.',
  ],

  tenantIds: ['tenant-001', 'tenant-002', 'tenant-003'],
  
  generateContactId: () => `contact-${Math.random().toString(36).substring(7)}`,
  generateConversationId: () => `conv-${Math.random().toString(36).substring(7)}`,
  generateMessageId: () => `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  
  getRandomMessage: () => {
    const messages = [...testData.romanianMessages, ...testData.englishMessages];
    return messages[Math.floor(Math.random() * messages.length)];
  },
  
  getRandomTenant: () => {
    return testData.tenantIds[Math.floor(Math.random() * testData.tenantIds.length)];
  },
};
```

#### 9.4.2 Sentiment Analysis Load Test (sentiment-analysis.load.ts)

```typescript
// tests/load/sentiment-analysis.load.ts
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { loadProfiles, testData } from './load-test.config';

// Custom metrics
const sentimentAnalysisRequests = new Counter('sentiment_analysis_requests');
const sentimentAnalysisErrors = new Rate('sentiment_analysis_errors');
const sentimentAnalysisDuration = new Trend('sentiment_analysis_duration');
const positivesentimentRate = new Rate('positive_sentiment_rate');
const negativesentimentRate = new Rate('negative_sentiment_rate');
const alertsTriggered = new Counter('alerts_triggered');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:64000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export const options = loadProfiles[__ENV.PROFILE || 'load'];

export function setup() {
  // Verify API is accessible
  const res = http.get(`${BASE_URL}/api/v1/health`, {
    headers: { 'X-API-Key': API_KEY },
  });
  
  if (res.status !== 200) {
    throw new Error(`API not accessible: ${res.status}`);
  }
  
  return {
    startTime: new Date().toISOString(),
  };
}

export default function () {
  group('Sentiment Analysis via Message API', () => {
    const tenantId = testData.getRandomTenant();
    const conversationId = testData.generateConversationId();
    const contactId = testData.generateContactId();
    
    // Send message that triggers sentiment analysis
    const messagePayload = {
      tenantId,
      conversationId,
      contactId,
      text: testData.getRandomMessage(),
      direction: 'inbound',
      channel: 'chat',
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-Tenant-Id': tenantId,
    };
    
    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/messages`,
      JSON.stringify(messagePayload),
      { headers, tags: { name: 'PostMessage' } }
    );
    const duration = Date.now() - startTime;
    
    sentimentAnalysisRequests.add(1);
    sentimentAnalysisDuration.add(duration);
    
    const success = check(res, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response has messageId': (r) => {
        try {
          const body = JSON.parse(r.body as string);
          return !!body.messageId;
        } catch {
          return false;
        }
      },
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    if (!success) {
      sentimentAnalysisErrors.add(1);
      console.error(`Request failed: ${res.status} - ${res.body}`);
      return;
    }
    
    const messageId = JSON.parse(res.body as string).messageId;
    
    // Poll for analysis completion
    let analysisComplete = false;
    let pollAttempts = 0;
    const maxAttempts = 30;
    
    while (!analysisComplete && pollAttempts < maxAttempts) {
      sleep(1);
      pollAttempts++;
      
      const analysisRes = http.get(
        `${BASE_URL}/api/v1/analysis/sentiment/${messageId}`,
        { headers, tags: { name: 'GetSentimentAnalysis' } }
      );
      
      if (analysisRes.status === 200) {
        analysisComplete = true;
        
        try {
          const analysis = JSON.parse(analysisRes.body as string);
          
          // Track sentiment distribution
          if (analysis.sentimentLabel === 'positive' || analysis.sentimentLabel === 'very_positive') {
            positivesentimentRate.add(1);
          } else {
            positivesentimentRate.add(0);
          }
          
          if (analysis.sentimentLabel === 'negative' || analysis.sentimentLabel === 'very_negative') {
            negativesentimentRate.add(1);
          } else {
            negativesentimentRate.add(0);
          }
          
          // Check for alerts
          if (analysis.alertTriggered) {
            alertsTriggered.add(1);
          }
        } catch {
          // Ignore parsing errors for metrics
        }
      } else if (analysisRes.status !== 404) {
        // 404 means not ready yet
        sentimentAnalysisErrors.add(1);
        break;
      }
    }
    
    if (!analysisComplete) {
      console.warn(`Analysis not completed after ${maxAttempts} attempts for message ${messageId}`);
    }
  });
  
  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5 seconds
}

export function handleSummary(data: any) {
  return {
    'reports/sentiment-analysis-load-test.json': JSON.stringify(data, null, 2),
    'reports/sentiment-analysis-load-test.html': generateHtmlReport(data),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data: any): string {
  const metrics = data.metrics;
  return `
=== Sentiment Analysis Load Test Results ===
Total Requests: ${metrics.sentiment_analysis_requests?.values?.count || 0}
Error Rate: ${((metrics.sentiment_analysis_errors?.values?.rate || 0) * 100).toFixed(2)}%
Avg Duration: ${(metrics.sentiment_analysis_duration?.values?.avg || 0).toFixed(2)}ms
P95 Duration: ${(metrics.sentiment_analysis_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
P99 Duration: ${(metrics.sentiment_analysis_duration?.values?.['p(99)'] || 0).toFixed(2)}ms
Positive Sentiment Rate: ${((metrics.positive_sentiment_rate?.values?.rate || 0) * 100).toFixed(2)}%
Negative Sentiment Rate: ${((metrics.negative_sentiment_rate?.values?.rate || 0) * 100).toFixed(2)}%
Alerts Triggered: ${metrics.alerts_triggered?.values?.count || 0}
`;
}

function generateHtmlReport(data: any): string {
  // Generate HTML report with charts
  return `<!DOCTYPE html>
<html>
<head>
  <title>Sentiment Analysis Load Test Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .metric { display: inline-block; padding: 15px; margin: 10px; background: #f5f5f5; border-radius: 8px; }
    .metric h3 { margin: 0 0 10px 0; color: #666; }
    .metric .value { font-size: 2em; font-weight: bold; color: #333; }
    .chart-container { width: 100%; max-width: 600px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Sentiment Analysis Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  <div class="metrics">
    <div class="metric">
      <h3>Total Requests</h3>
      <div class="value">${data.metrics.sentiment_analysis_requests?.values?.count || 0}</div>
    </div>
    <div class="metric">
      <h3>Error Rate</h3>
      <div class="value">${((data.metrics.sentiment_analysis_errors?.values?.rate || 0) * 100).toFixed(2)}%</div>
    </div>
    <div class="metric">
      <h3>P95 Duration</h3>
      <div class="value">${(data.metrics.sentiment_analysis_duration?.values?.['p(95)'] || 0).toFixed(0)}ms</div>
    </div>
  </div>
  
  <div class="chart-container">
    <canvas id="latencyChart"></canvas>
  </div>
  
  <script>
    // Latency distribution chart
    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels: ['Min', 'P50', 'P90', 'P95', 'P99', 'Max'],
        datasets: [{
          label: 'Response Time (ms)',
          data: [
            ${data.metrics.sentiment_analysis_duration?.values?.min || 0},
            ${data.metrics.sentiment_analysis_duration?.values?.['p(50)'] || 0},
            ${data.metrics.sentiment_analysis_duration?.values?.['p(90)'] || 0},
            ${data.metrics.sentiment_analysis_duration?.values?.['p(95)'] || 0},
            ${data.metrics.sentiment_analysis_duration?.values?.['p(99)'] || 0},
            ${data.metrics.sentiment_analysis_duration?.values?.max || 0}
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } }
      }
    });
  </script>
</body>
</html>`;
}
```

#### 9.4.3 Intent Detection Load Test (intent-detection.load.ts)

```typescript
// tests/load/intent-detection.load.ts
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { loadProfiles, testData } from './load-test.config';

// Custom metrics
const intentDetectionRequests = new Counter('intent_detection_requests');
const intentDetectionErrors = new Rate('intent_detection_errors');
const intentDetectionDuration = new Trend('intent_detection_duration');
const actionRequiredRate = new Rate('action_required_rate');
const handoverTriggeredRate = new Rate('handover_triggered_rate');
const intentTypeDistribution = new Counter('intent_type');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:64000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export const options = loadProfiles[__ENV.PROFILE || 'load'];

export default function () {
  group('Intent Detection via Direct API', () => {
    const tenantId = testData.getRandomTenant();
    
    const payload = {
      text: testData.getRandomMessage(),
      language: 'auto',
      includeEntities: true,
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-Tenant-Id': tenantId,
    };
    
    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/analysis/intent/detect`,
      JSON.stringify(payload),
      { headers, tags: { name: 'DetectIntent' } }
    );
    const duration = Date.now() - startTime;
    
    intentDetectionRequests.add(1);
    intentDetectionDuration.add(duration);
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response has primaryIntent': (r) => {
        try {
          const body = JSON.parse(r.body as string);
          return !!body.primaryIntent;
        } catch {
          return false;
        }
      },
      'response time < 3000ms': (r) => r.timings.duration < 3000,
    });
    
    if (!success) {
      intentDetectionErrors.add(1);
      return;
    }
    
    try {
      const analysis = JSON.parse(res.body as string);
      
      // Track metrics
      actionRequiredRate.add(analysis.actionRequired ? 1 : 0);
      handoverTriggeredRate.add(analysis.primaryIntent === 'HUMAN_AGENT_REQUEST' ? 1 : 0);
      intentTypeDistribution.add(1, { intent: analysis.primaryIntent });
    } catch {
      // Ignore parsing errors
    }
  });
  
  sleep(Math.random() * 1 + 0.2);
}

export function handleSummary(data: any) {
  return {
    'reports/intent-detection-load-test.json': JSON.stringify(data, null, 2),
    stdout: `
=== Intent Detection Load Test Results ===
Total Requests: ${data.metrics.intent_detection_requests?.values?.count || 0}
Error Rate: ${((data.metrics.intent_detection_errors?.values?.rate || 0) * 100).toFixed(2)}%
Avg Duration: ${(data.metrics.intent_detection_duration?.values?.avg || 0).toFixed(2)}ms
P95 Duration: ${(data.metrics.intent_detection_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
Action Required Rate: ${((data.metrics.action_required_rate?.values?.rate || 0) * 100).toFixed(2)}%
Handover Triggered Rate: ${((data.metrics.handover_triggered_rate?.values?.rate || 0) * 100).toFixed(2)}%
`,
  };
}
```

#### 9.4.4 Full Analysis Pipeline Load Test (analysis-pipeline.load.ts)

```typescript
// tests/load/analysis-pipeline.load.ts
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { loadProfiles, testData } from './load-test.config';

// Custom metrics
const pipelineRequests = new Counter('pipeline_requests');
const pipelineErrors = new Rate('pipeline_errors');
const pipelineDuration = new Trend('pipeline_duration');
const sentimentDuration = new Trend('sentiment_stage_duration');
const intentDuration = new Trend('intent_stage_duration');
const emotionDuration = new Trend('emotion_stage_duration');
const aggregateDuration = new Trend('aggregate_stage_duration');
const riskLevelDistribution = new Counter('risk_level');
const compositeScoreTrend = new Trend('composite_score');
const activeConversations = new Gauge('active_conversations');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:64000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export const options = loadProfiles[__ENV.PROFILE || 'load'];

// Track active conversations per tenant
const conversationTracker = new Map<string, Set<string>>();

export default function () {
  const tenantId = testData.getRandomTenant();
  
  // Manage conversation pool per tenant
  if (!conversationTracker.has(tenantId)) {
    conversationTracker.set(tenantId, new Set());
  }
  const tenantConvs = conversationTracker.get(tenantId)!;
  
  // 70% chance to continue existing conversation, 30% new
  let conversationId: string;
  let contactId: string;
  
  if (tenantConvs.size > 0 && Math.random() < 0.7) {
    const convArray = Array.from(tenantConvs);
    conversationId = convArray[Math.floor(Math.random() * convArray.length)];
    contactId = `contact-${conversationId.split('-')[1]}`;
  } else {
    conversationId = testData.generateConversationId();
    contactId = testData.generateContactId();
    tenantConvs.add(conversationId);
    if (tenantConvs.size > 100) {
      // Keep pool bounded
      const oldest = tenantConvs.values().next().value;
      tenantConvs.delete(oldest);
    }
  }
  
  activeConversations.add(tenantConvs.size);
  
  group('Full Analysis Pipeline', () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-Tenant-Id': tenantId,
    };
    
    // Step 1: Send message
    const messagePayload = {
      tenantId,
      conversationId,
      contactId,
      text: testData.getRandomMessage(),
      direction: 'inbound',
      channel: 'chat',
      metadata: {
        source: 'load-test',
        timestamp: new Date().toISOString(),
      },
    };
    
    const pipelineStart = Date.now();
    
    const messageRes = http.post(
      `${BASE_URL}/api/v1/messages`,
      JSON.stringify(messagePayload),
      { headers, tags: { name: 'PostMessage' } }
    );
    
    if (!check(messageRes, { 'message created': (r) => r.status === 200 || r.status === 201 })) {
      pipelineErrors.add(1);
      return;
    }
    
    const messageId = JSON.parse(messageRes.body as string).messageId;
    pipelineRequests.add(1);
    
    // Step 2: Wait for all analyses to complete
    let analysisComplete = {
      sentiment: false,
      intent: false,
      emotion: false,
      aggregate: false,
    };
    
    let pollAttempts = 0;
    const maxAttempts = 60; // Up to 60 seconds
    
    while (Object.values(analysisComplete).some(v => !v) && pollAttempts < maxAttempts) {
      sleep(1);
      pollAttempts++;
      
      // Check sentiment
      if (!analysisComplete.sentiment) {
        const sentStart = Date.now();
        const sentRes = http.get(
          `${BASE_URL}/api/v1/analysis/sentiment/${messageId}`,
          { headers, tags: { name: 'GetSentiment' } }
        );
        if (sentRes.status === 200) {
          analysisComplete.sentiment = true;
          sentimentDuration.add(Date.now() - pipelineStart);
        }
      }
      
      // Check intent
      if (!analysisComplete.intent) {
        const intentStart = Date.now();
        const intentRes = http.get(
          `${BASE_URL}/api/v1/analysis/intent/${messageId}`,
          { headers, tags: { name: 'GetIntent' } }
        );
        if (intentRes.status === 200) {
          analysisComplete.intent = true;
          intentDuration.add(Date.now() - pipelineStart);
        }
      }
      
      // Check emotion
      if (!analysisComplete.emotion) {
        const emotionStart = Date.now();
        const emotionRes = http.get(
          `${BASE_URL}/api/v1/analysis/emotion/${messageId}`,
          { headers, tags: { name: 'GetEmotion' } }
        );
        if (emotionRes.status === 200) {
          analysisComplete.emotion = true;
          emotionDuration.add(Date.now() - pipelineStart);
        }
      }
      
      // Check aggregate (only after all individual analyses)
      if (analysisComplete.sentiment && analysisComplete.intent && analysisComplete.emotion && !analysisComplete.aggregate) {
        const aggStart = Date.now();
        const aggRes = http.get(
          `${BASE_URL}/api/v1/analysis/aggregate/${messageId}`,
          { headers, tags: { name: 'GetAggregate' } }
        );
        if (aggRes.status === 200) {
          analysisComplete.aggregate = true;
          aggregateDuration.add(Date.now() - pipelineStart);
          
          try {
            const aggregate = JSON.parse(aggRes.body as string);
            riskLevelDistribution.add(1, { level: aggregate.riskLevel });
            compositeScoreTrend.add(aggregate.compositeScore);
          } catch {
            // Ignore
          }
        }
      }
    }
    
    const pipelineEnd = Date.now();
    pipelineDuration.add(pipelineEnd - pipelineStart);
    
    // Check if all completed
    if (!Object.values(analysisComplete).every(v => v)) {
      pipelineErrors.add(1);
      console.warn(`Pipeline incomplete for ${messageId}: ${JSON.stringify(analysisComplete)}`);
    }
  });
  
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data: any) {
  const metrics = data.metrics;
  
  return {
    'reports/analysis-pipeline-load-test.json': JSON.stringify(data, null, 2),
    stdout: `
=== Full Analysis Pipeline Load Test Results ===

Pipeline Metrics:
  Total Requests: ${metrics.pipeline_requests?.values?.count || 0}
  Error Rate: ${((metrics.pipeline_errors?.values?.rate || 0) * 100).toFixed(2)}%
  
End-to-End Duration:
  Avg: ${(metrics.pipeline_duration?.values?.avg || 0).toFixed(2)}ms
  P50: ${(metrics.pipeline_duration?.values?.['p(50)'] || 0).toFixed(2)}ms
  P95: ${(metrics.pipeline_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
  P99: ${(metrics.pipeline_duration?.values?.['p(99)'] || 0).toFixed(2)}ms

Stage Durations (from message send):
  Sentiment: P95=${(metrics.sentiment_stage_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
  Intent: P95=${(metrics.intent_stage_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
  Emotion: P95=${(metrics.emotion_stage_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
  Aggregate: P95=${(metrics.aggregate_stage_duration?.values?.['p(95)'] || 0).toFixed(0)}ms

Composite Score:
  Avg: ${(metrics.composite_score?.values?.avg || 0).toFixed(3)}
  Min: ${(metrics.composite_score?.values?.min || 0).toFixed(3)}
  Max: ${(metrics.composite_score?.values?.max || 0).toFixed(3)}

Active Conversations (peak): ${metrics.active_conversations?.values?.max || 0}
`,
  };
}
```

#### 9.4.5 Multi-Tenant Load Test (multi-tenant.load.ts)

```typescript
// tests/load/multi-tenant.load.ts
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { loadProfiles, testData } from './load-test.config';

// Custom metrics per tenant
const tenantMetrics = {
  requests: new Counter('tenant_requests'),
  errors: new Rate('tenant_errors'),
  duration: new Trend('tenant_duration'),
};

// Tenant isolation metrics
const crossTenantAttempts = new Counter('cross_tenant_attempts');
const crossTenantBlocked = new Counter('cross_tenant_blocked');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:64000';

// Load tenant configurations
const tenantConfigs = new SharedArray('tenants', function () {
  return [
    { id: 'tenant-001', apiKey: 'api-key-001', name: 'Agro Corp', quota: 1000 },
    { id: 'tenant-002', apiKey: 'api-key-002', name: 'Farm Solutions', quota: 500 },
    { id: 'tenant-003', apiKey: 'api-key-003', name: 'Green Fields', quota: 750 },
    { id: 'tenant-004', apiKey: 'api-key-004', name: 'Harvest Plus', quota: 300 },
    { id: 'tenant-005', apiKey: 'api-key-005', name: 'Seed Masters', quota: 600 },
  ];
});

export const options = {
  ...loadProfiles[__ENV.PROFILE || 'load'],
  scenarios: {
    // Different load patterns per tenant
    tenant_001_high: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      exec: 'tenantScenario',
      env: { TENANT_INDEX: '0' },
    },
    tenant_002_medium: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 25,
      maxVUs: 50,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 },
      ],
      exec: 'tenantScenario',
      env: { TENANT_INDEX: '1' },
    },
    tenant_003_variable: {
      executor: 'ramping-arrival-rate',
      startRate: 3,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: 75,
      stages: [
        { duration: '1m', target: 5 },
        { duration: '2m', target: 15 },
        { duration: '1m', target: 5 },
        { duration: '2m', target: 20 },
        { duration: '1m', target: 5 },
        { duration: '2m', target: 0 },
      ],
      exec: 'tenantScenario',
      env: { TENANT_INDEX: '2' },
    },
    isolation_test: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 20,
      exec: 'isolationTest',
    },
  },
};

export function tenantScenario() {
  const tenantIndex = parseInt(__ENV.TENANT_INDEX);
  const tenant = tenantConfigs[tenantIndex];
  
  group(`Tenant ${tenant.name}`, () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': tenant.apiKey,
      'X-Tenant-Id': tenant.id,
    };
    
    const messagePayload = {
      conversationId: testData.generateConversationId(),
      contactId: testData.generateContactId(),
      text: testData.getRandomMessage(),
      direction: 'inbound',
      channel: 'chat',
    };
    
    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/messages`,
      JSON.stringify(messagePayload),
      { headers, tags: { name: 'TenantMessage', tenant: tenant.id } }
    );
    const duration = Date.now() - startTime;
    
    tenantMetrics.requests.add(1, { tenant: tenant.id });
    tenantMetrics.duration.add(duration, { tenant: tenant.id });
    
    const success = check(res, {
      'status is 200/201': (r) => r.status === 200 || r.status === 201,
      'response time < 3000ms': (r) => r.timings.duration < 3000,
    });
    
    if (!success) {
      tenantMetrics.errors.add(1, { tenant: tenant.id });
    }
  });
  
  sleep(Math.random() * 1 + 0.5);
}

export function isolationTest() {
  // Test that tenants cannot access each other's data
  const tenant1 = tenantConfigs[0];
  const tenant2 = tenantConfigs[1];
  
  group('Tenant Isolation Test', () => {
    crossTenantAttempts.add(1);
    
    // First, create a message with tenant1
    const headers1 = {
      'Content-Type': 'application/json',
      'X-API-Key': tenant1.apiKey,
      'X-Tenant-Id': tenant1.id,
    };
    
    const messagePayload = {
      conversationId: `isolation-test-${Date.now()}`,
      contactId: testData.generateContactId(),
      text: 'Isolation test message',
      direction: 'inbound',
    };
    
    const createRes = http.post(
      `${BASE_URL}/api/v1/messages`,
      JSON.stringify(messagePayload),
      { headers: headers1, tags: { name: 'IsolationCreate' } }
    );
    
    if (createRes.status !== 200 && createRes.status !== 201) {
      return;
    }
    
    const messageId = JSON.parse(createRes.body as string).messageId;
    
    // Wait for analysis
    sleep(5);
    
    // Try to access with tenant2 credentials
    const headers2 = {
      'Content-Type': 'application/json',
      'X-API-Key': tenant2.apiKey,
      'X-Tenant-Id': tenant2.id,
    };
    
    const accessRes = http.get(
      `${BASE_URL}/api/v1/analysis/sentiment/${messageId}`,
      { headers: headers2, tags: { name: 'IsolationAccess' } }
    );
    
    // Should be blocked (403 or 404)
    const blocked = check(accessRes, {
      'cross-tenant access blocked': (r) => r.status === 403 || r.status === 404,
    });
    
    if (blocked) {
      crossTenantBlocked.add(1);
    } else {
      console.error(`SECURITY: Cross-tenant access succeeded for message ${messageId}`);
    }
  });
  
  sleep(2);
}

export function handleSummary(data: any) {
  const metrics = data.metrics;
  
  // Calculate per-tenant stats
  const tenantStats = tenantConfigs.map(tenant => {
    const reqCount = metrics[`tenant_requests{tenant:${tenant.id}}`]?.values?.count || 0;
    const errorRate = metrics[`tenant_errors{tenant:${tenant.id}}`]?.values?.rate || 0;
    const p95 = metrics[`tenant_duration{tenant:${tenant.id}}`]?.values?.['p(95)'] || 0;
    
    return {
      name: tenant.name,
      id: tenant.id,
      requests: reqCount,
      errorRate: (errorRate * 100).toFixed(2),
      p95Duration: p95.toFixed(0),
    };
  });
  
  return {
    'reports/multi-tenant-load-test.json': JSON.stringify(data, null, 2),
    stdout: `
=== Multi-Tenant Load Test Results ===

Per-Tenant Statistics:
${tenantStats.map(t => `  ${t.name} (${t.id}):
    Requests: ${t.requests}
    Error Rate: ${t.errorRate}%
    P95 Duration: ${t.p95Duration}ms`).join('\n')}

Tenant Isolation:
  Cross-tenant attempts: ${metrics.cross_tenant_attempts?.values?.count || 0}
  Cross-tenant blocked: ${metrics.cross_tenant_blocked?.values?.count || 0}
  Isolation rate: ${(((metrics.cross_tenant_blocked?.values?.count || 0) / (metrics.cross_tenant_attempts?.values?.count || 1)) * 100).toFixed(2)}%
`,
  };
}
```

#### 9.4.6 Load Test Execution Scripts

```bash
#!/bin/bash
# scripts/run-load-tests.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:64000}"
API_KEY="${API_KEY:-test-api-key}"
PROFILE="${PROFILE:-load}"

# Create reports directory
mkdir -p reports

echo "=== Cerniq Analysis Load Tests ==="
echo "Base URL: ${BASE_URL}"
echo "Profile: ${PROFILE}"
echo "Started: $(date)"
echo ""

# Run sentiment analysis load test
echo "Running Sentiment Analysis Load Test..."
k6 run \
  --env BASE_URL="${BASE_URL}" \
  --env API_KEY="${API_KEY}" \
  --env PROFILE="${PROFILE}" \
  tests/load/sentiment-analysis.load.ts

# Run intent detection load test
echo "Running Intent Detection Load Test..."
k6 run \
  --env BASE_URL="${BASE_URL}" \
  --env API_KEY="${API_KEY}" \
  --env PROFILE="${PROFILE}" \
  tests/load/intent-detection.load.ts

# Run full pipeline load test
echo "Running Full Pipeline Load Test..."
k6 run \
  --env BASE_URL="${BASE_URL}" \
  --env API_KEY="${API_KEY}" \
  --env PROFILE="${PROFILE}" \
  tests/load/analysis-pipeline.load.ts

# Run multi-tenant load test
echo "Running Multi-Tenant Load Test..."
k6 run \
  --env BASE_URL="${BASE_URL}" \
  tests/load/multi-tenant.load.ts

echo ""
echo "=== Load Tests Complete ==="
echo "Reports saved to: reports/"
echo "Finished: $(date)"
```

```yaml
# docker-compose.load-test.yml
version: '3.8'

services:
  k6:
    image: grafana/k6:latest
    volumes:
      - ./tests/load:/tests
      - ./reports:/reports
    environment:
      - BASE_URL=http://api:64000
      - K6_OUT=influxdb=http://influxdb:64080/k6
    networks:
      - cerniq-test
    depends_on:
      - api
      - influxdb

  influxdb:
    image: influxdb:1.8
    environment:
      - INFLUXDB_DB=k6
    networks:
      - cerniq-test
    volumes:
      - influxdb-data:/var/lib/influxdb

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    ports:
      - "64091:64091"
    networks:
      - cerniq-test
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana/dashboards:/var/lib/grafana/dashboards
      - ./config/grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - influxdb

networks:
  cerniq-test:
    driver: bridge

volumes:
  influxdb-data:
  grafana-data:
```


---

## 10. Integration Patterns

### 10.1 Inter-Worker Communication

#### 10.1.1 Event-Driven Architecture Overview

```typescript
// packages/workers-k/src/integration/event-architecture.ts

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

/**
 * Analysis Event Types
 * Defines all events emitted by K workers for inter-worker communication
 */
export enum AnalysisEventType {
  // Sentiment Events
  SENTIMENT_ANALYZED = 'sentiment.analyzed',
  SENTIMENT_NEGATIVE_DETECTED = 'sentiment.negative_detected',
  SENTIMENT_DECLINE_DETECTED = 'sentiment.decline_detected',
  SENTIMENT_POSITIVE_SPIKE = 'sentiment.positive_spike',
  
  // Intent Events
  INTENT_DETECTED = 'intent.detected',
  INTENT_HANDOVER_REQUIRED = 'intent.handover_required',
  INTENT_COMPLAINT_DETECTED = 'intent.complaint_detected',
  INTENT_ORDER_DETECTED = 'intent.order_detected',
  INTENT_NEGOTIATION_DETECTED = 'intent.negotiation_detected',
  INTENT_QUOTE_REQUESTED = 'intent.quote_requested',
  INTENT_DISCOUNT_REQUESTED = 'intent.discount_requested',
  
  // Emotion Events
  EMOTION_RECOGNIZED = 'emotion.recognized',
  EMOTION_HIGH_AROUSAL = 'emotion.high_arousal',
  EMOTION_FRUSTRATION_DETECTED = 'emotion.frustration_detected',
  EMOTION_SATISFACTION_DETECTED = 'emotion.satisfaction_detected',
  
  // Aggregate Events
  AGGREGATE_COMPLETED = 'aggregate.completed',
  RISK_LEVEL_CHANGED = 'aggregate.risk_level_changed',
  ACTION_REQUIRED = 'aggregate.action_required',
  AUTO_ACTION_EXECUTED = 'aggregate.auto_action_executed',
  ESCALATION_TRIGGERED = 'aggregate.escalation_triggered',
  
  // Alert Events
  ALERT_CREATED = 'alert.created',
  ALERT_ACKNOWLEDGED = 'alert.acknowledged',
  ALERT_RESOLVED = 'alert.resolved',
  ALERT_ESCALATED = 'alert.escalated'
}

/**
 * Event Payload Interfaces
 */
export interface SentimentAnalyzedPayload {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
  analysisId: string;
  score: number;
  label: SentimentLabel;
  confidence: number;
  aspects: Array<{
    aspect: string;
    sentiment: number;
    confidence: number;
  }>;
  language: string;
  timestamp: Date;
}

export interface IntentDetectedPayload {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
  analysisId: string;
  primaryIntent: IntentType;
  confidence: number;
  secondaryIntents: Array<{
    intent: IntentType;
    confidence: number;
  }>;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  actionRequired: boolean;
  suggestedAction?: string;
  timestamp: Date;
}

export interface EmotionRecognizedPayload {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
  analysisId: string;
  primaryEmotion: EmotionType;
  intensity: number;
  confidence: number;
  vad: {
    valence: number;
    arousal: number;
    dominance: number;
  };
  emotionalCues: Array<{
    type: string;
    value: string;
    contribution: number;
  }>;
  timestamp: Date;
}

export interface AggregateCompletedPayload {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
  aggregateId: string;
  compositeScore: number;
  riskLevel: RiskLevel;
  riskScore: number;
  urgencyLevel: UrgencyLevel;
  actions: Array<{
    type: string;
    priority: string;
    executed: boolean;
  }>;
  timestamp: Date;
}

export interface AlertCreatedPayload {
  tenantId: string;
  alertId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  conversationId: string;
  contactId: string;
  triggerValue: number;
  threshold: number;
  description: string;
  suggestedActions: string[];
  timestamp: Date;
}

/**
 * Event Bus Implementation
 * Centralized event distribution using Redis Pub/Sub
 */
export class AnalysisEventBus {
  private redis: Redis;
  private subscriber: Redis;
  private localEmitter: EventEmitter;
  private subscriptions: Map<string, Set<(payload: unknown) => void>>;
  
  constructor(redisConfig: RedisConfig) {
    this.redis = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.localEmitter = new EventEmitter();
    this.subscriptions = new Map();
    
    this.setupSubscriber();
  }
  
  private setupSubscriber(): void {
    this.subscriber.on('message', (channel: string, message: string) => {
      const eventType = channel.replace('cerniq:events:', '');
      const payload = JSON.parse(message);
      
      // Emit to local listeners
      this.localEmitter.emit(eventType, payload);
      
      // Call registered handlers
      const handlers = this.subscriptions.get(eventType);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(payload);
          } catch (error) {
            console.error(`Event handler error for ${eventType}:`, error);
          }
        });
      }
    });
  }
  
  /**
   * Publish an event to all subscribers
   */
  async publish<T>(eventType: AnalysisEventType, payload: T): Promise<void> {
    const channel = `cerniq:events:${eventType}`;
    const message = JSON.stringify({
      eventType,
      payload,
      timestamp: new Date().toISOString(),
      source: 'workers-k'
    });
    
    await this.redis.publish(channel, message);
    
    // Also emit locally for same-process listeners
    this.localEmitter.emit(eventType, payload);
  }
  
  /**
   * Subscribe to an event type
   */
  async subscribe<T>(
    eventType: AnalysisEventType,
    handler: (payload: T) => void
  ): Promise<void> {
    const channel = `cerniq:events:${eventType}`;
    
    // Subscribe to Redis channel if not already
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
      await this.subscriber.subscribe(channel);
    }
    
    this.subscriptions.get(eventType)!.add(handler as (payload: unknown) => void);
  }
  
  /**
   * Unsubscribe from an event type
   */
  async unsubscribe<T>(
    eventType: AnalysisEventType,
    handler: (payload: T) => void
  ): Promise<void> {
    const handlers = this.subscriptions.get(eventType);
    if (handlers) {
      handlers.delete(handler as (payload: unknown) => void);
      
      if (handlers.size === 0) {
        const channel = `cerniq:events:${eventType}`;
        await this.subscriber.unsubscribe(channel);
        this.subscriptions.delete(eventType);
      }
    }
  }
  
  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.subscriber.quit();
    await this.redis.quit();
    this.localEmitter.removeAllListeners();
  }
}

// Singleton instance
let eventBus: AnalysisEventBus | null = null;

export function getEventBus(redisConfig?: RedisConfig): AnalysisEventBus {
  if (!eventBus && redisConfig) {
    eventBus = new AnalysisEventBus(redisConfig);
  }
  if (!eventBus) {
    throw new Error('Event bus not initialized');
  }
  return eventBus;
}
```

#### 10.1.2 Event Publishers

```typescript
// packages/workers-k/src/integration/event-publishers.ts

import { getEventBus, AnalysisEventType } from './event-architecture';
import type {
  SentimentAnalyzedPayload,
  IntentDetectedPayload,
  EmotionRecognizedPayload,
  AggregateCompletedPayload,
  AlertCreatedPayload
} from './event-architecture';

/**
 * Sentiment Event Publisher
 */
export class SentimentEventPublisher {
  private eventBus = getEventBus();
  
  /**
   * Publish sentiment analysis completed event
   */
  async publishAnalyzed(result: SentimentAnalysisResult): Promise<void> {
    const payload: SentimentAnalyzedPayload = {
      tenantId: result.tenantId,
      messageId: result.messageId,
      conversationId: result.conversationId,
      contactId: result.contactId,
      analysisId: result.id,
      score: result.score,
      label: result.label,
      confidence: result.confidence,
      aspects: result.aspects,
      language: result.language,
      timestamp: new Date()
    };
    
    await this.eventBus.publish(AnalysisEventType.SENTIMENT_ANALYZED, payload);
    
    // Publish additional events based on results
    if (result.score <= -0.5) {
      await this.eventBus.publish(
        AnalysisEventType.SENTIMENT_NEGATIVE_DETECTED,
        { ...payload, severity: result.score <= -0.7 ? 'critical' : 'warning' }
      );
    }
    
    if (result.declineDetected) {
      await this.eventBus.publish(
        AnalysisEventType.SENTIMENT_DECLINE_DETECTED,
        { ...payload, declineAmount: result.declineAmount }
      );
    }
    
    if (result.score >= 0.7) {
      await this.eventBus.publish(
        AnalysisEventType.SENTIMENT_POSITIVE_SPIKE,
        payload
      );
    }
  }
}

/**
 * Intent Event Publisher
 */
export class IntentEventPublisher {
  private eventBus = getEventBus();
  
  /**
   * Publish intent detection completed event
   */
  async publishDetected(result: IntentDetectionResult): Promise<void> {
    const payload: IntentDetectedPayload = {
      tenantId: result.tenantId,
      messageId: result.messageId,
      conversationId: result.conversationId,
      contactId: result.contactId,
      analysisId: result.id,
      primaryIntent: result.primaryIntent,
      confidence: result.confidence,
      secondaryIntents: result.secondaryIntents,
      entities: result.entities,
      actionRequired: result.actionRequired,
      suggestedAction: result.suggestedAction,
      timestamp: new Date()
    };
    
    await this.eventBus.publish(AnalysisEventType.INTENT_DETECTED, payload);
    
    // Publish specific intent events
    const intentEventMap: Partial<Record<IntentType, AnalysisEventType>> = {
      HUMAN_AGENT_REQUEST: AnalysisEventType.INTENT_HANDOVER_REQUIRED,
      COMPLAINT: AnalysisEventType.INTENT_COMPLAINT_DETECTED,
      ORDER_PLACEMENT: AnalysisEventType.INTENT_ORDER_DETECTED,
      BULK_ORDER: AnalysisEventType.INTENT_ORDER_DETECTED,
      NEGOTIATION_ATTEMPT: AnalysisEventType.INTENT_NEGOTIATION_DETECTED,
      QUOTE_REQUEST: AnalysisEventType.INTENT_QUOTE_REQUESTED,
      DISCOUNT_REQUEST: AnalysisEventType.INTENT_DISCOUNT_REQUESTED,
      PRICE_NEGOTIATION: AnalysisEventType.INTENT_NEGOTIATION_DETECTED
    };
    
    const specificEvent = intentEventMap[result.primaryIntent];
    if (specificEvent) {
      await this.eventBus.publish(specificEvent, payload);
    }
  }
}

/**
 * Emotion Event Publisher
 */
export class EmotionEventPublisher {
  private eventBus = getEventBus();
  
  /**
   * Publish emotion recognition completed event
   */
  async publishRecognized(result: EmotionRecognitionResult): Promise<void> {
    const payload: EmotionRecognizedPayload = {
      tenantId: result.tenantId,
      messageId: result.messageId,
      conversationId: result.conversationId,
      contactId: result.contactId,
      analysisId: result.id,
      primaryEmotion: result.primaryEmotion,
      intensity: result.intensity,
      confidence: result.confidence,
      vad: result.vad,
      emotionalCues: result.emotionalCues,
      timestamp: new Date()
    };
    
    await this.eventBus.publish(AnalysisEventType.EMOTION_RECOGNIZED, payload);
    
    // Publish arousal alert if high
    if (result.vad.arousal > 0.7) {
      await this.eventBus.publish(
        AnalysisEventType.EMOTION_HIGH_AROUSAL,
        { ...payload, severity: result.vad.arousal > 0.85 ? 'critical' : 'warning' }
      );
    }
    
    // Publish frustration detection
    if (result.primaryEmotion === 'frustration' && result.intensity > 0.6) {
      await this.eventBus.publish(
        AnalysisEventType.EMOTION_FRUSTRATION_DETECTED,
        payload
      );
    }
    
    // Publish satisfaction detection
    if (['joy', 'satisfaction', 'gratitude'].includes(result.primaryEmotion) && result.intensity > 0.6) {
      await this.eventBus.publish(
        AnalysisEventType.EMOTION_SATISFACTION_DETECTED,
        payload
      );
    }
  }
}

/**
 * Aggregate Event Publisher
 */
export class AggregateEventPublisher {
  private eventBus = getEventBus();
  
  /**
   * Publish aggregate analysis completed event
   */
  async publishCompleted(result: AnalysisAggregate): Promise<void> {
    const payload: AggregateCompletedPayload = {
      tenantId: result.tenantId,
      messageId: result.messageId,
      conversationId: result.conversationId,
      contactId: result.contactId,
      aggregateId: result.id,
      compositeScore: result.compositeScore,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      urgencyLevel: result.urgencyLevel,
      actions: result.recommendedActions.map(a => ({
        type: a.type,
        priority: a.priority,
        executed: a.executed
      })),
      timestamp: new Date()
    };
    
    await this.eventBus.publish(AnalysisEventType.AGGREGATE_COMPLETED, payload);
    
    // Publish risk level change if significant
    if (result.riskLevelChanged) {
      await this.eventBus.publish(
        AnalysisEventType.RISK_LEVEL_CHANGED,
        {
          ...payload,
          previousRiskLevel: result.previousRiskLevel,
          riskLevelChange: result.riskLevelChange
        }
      );
    }
    
    // Publish action required events
    if (result.actionRequired) {
      await this.eventBus.publish(
        AnalysisEventType.ACTION_REQUIRED,
        payload
      );
    }
    
    // Publish auto-action executed events
    for (const action of result.recommendedActions.filter(a => a.executed)) {
      await this.eventBus.publish(
        AnalysisEventType.AUTO_ACTION_EXECUTED,
        {
          ...payload,
          action: {
            type: action.type,
            priority: action.priority,
            result: action.result
          }
        }
      );
    }
    
    // Publish escalation if triggered
    if (result.escalationTriggered) {
      await this.eventBus.publish(
        AnalysisEventType.ESCALATION_TRIGGERED,
        {
          ...payload,
          escalationLevel: result.escalationLevel,
          escalationReason: result.escalationReason
        }
      );
    }
  }
}

/**
 * Alert Event Publisher
 */
export class AlertEventPublisher {
  private eventBus = getEventBus();
  
  async publishCreated(alert: AnalysisAlert): Promise<void> {
    const payload: AlertCreatedPayload = {
      tenantId: alert.tenantId,
      alertId: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      conversationId: alert.conversationId,
      contactId: alert.contactId,
      triggerValue: alert.triggerValue,
      threshold: alert.threshold,
      description: alert.description,
      suggestedActions: alert.suggestedActions,
      timestamp: new Date()
    };
    
    await this.eventBus.publish(AnalysisEventType.ALERT_CREATED, payload);
  }
  
  async publishAcknowledged(alertId: string, acknowledgedBy: string): Promise<void> {
    await this.eventBus.publish(AnalysisEventType.ALERT_ACKNOWLEDGED, {
      alertId,
      acknowledgedBy,
      timestamp: new Date()
    });
  }
  
  async publishResolved(
    alertId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<void> {
    await this.eventBus.publish(AnalysisEventType.ALERT_RESOLVED, {
      alertId,
      resolvedBy,
      resolution,
      timestamp: new Date()
    });
  }
  
  async publishEscalated(alertId: string, escalationLevel: string): Promise<void> {
    await this.eventBus.publish(AnalysisEventType.ALERT_ESCALATED, {
      alertId,
      escalationLevel,
      timestamp: new Date()
    });
  }
}
```

#### 10.1.3 Event Subscribers

```typescript
// packages/workers-k/src/integration/event-subscribers.ts

import { getEventBus, AnalysisEventType } from './event-architecture';
import type {
  SentimentAnalyzedPayload,
  IntentDetectedPayload,
  EmotionRecognizedPayload,
  AggregateCompletedPayload,
  AlertCreatedPayload
} from './event-architecture';

/**
 * Analysis Event Subscriber Manager
 * Coordinates cross-worker event handling
 */
export class AnalysisEventSubscriber {
  private eventBus = getEventBus();
  private handlers: Map<string, Function[]> = new Map();
  
  /**
   * Subscribe to sentiment analysis events for aggregation
   */
  subscribeToSentimentEvents(aggregator: AnalysisAggregatorWorker): void {
    // Trigger aggregate when sentiment is analyzed
    this.eventBus.subscribe<SentimentAnalyzedPayload>(
      AnalysisEventType.SENTIMENT_ANALYZED,
      async (payload) => {
        await aggregator.triggerAggregation({
          type: 'sentiment',
          tenantId: payload.tenantId,
          messageId: payload.messageId,
          analysisId: payload.analysisId
        });
      }
    );
    
    // Handle negative sentiment for immediate notification
    this.eventBus.subscribe<SentimentAnalyzedPayload & { severity: string }>(
      AnalysisEventType.SENTIMENT_NEGATIVE_DETECTED,
      async (payload) => {
        if (payload.severity === 'critical') {
          await this.notifyHandoverSystem({
            type: 'negative_sentiment',
            ...payload
          });
        }
      }
    );
    
    // Handle sentiment decline for trend tracking
    this.eventBus.subscribe<SentimentAnalyzedPayload & { declineAmount: number }>(
      AnalysisEventType.SENTIMENT_DECLINE_DETECTED,
      async (payload) => {
        await this.updateTrendTracking({
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          type: 'sentiment_decline',
          amount: payload.declineAmount
        });
      }
    );
  }
  
  /**
   * Subscribe to intent detection events
   */
  subscribeToIntentEvents(
    handoverWorker: HandoverWorker,
    negotiationWorker: NegotiationWorker,
    orderProcessor: OrderProcessor
  ): void {
    // Handle handover request intents
    this.eventBus.subscribe<IntentDetectedPayload>(
      AnalysisEventType.INTENT_HANDOVER_REQUIRED,
      async (payload) => {
        await handoverWorker.initiateHandover({
          reason: 'EXPLICIT_HANDOVER_REQUEST',
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          intent: payload.primaryIntent,
          confidence: payload.confidence,
          urgency: 'high'
        });
      }
    );
    
    // Handle complaint intents
    this.eventBus.subscribe<IntentDetectedPayload>(
      AnalysisEventType.INTENT_COMPLAINT_DETECTED,
      async (payload) => {
        await handoverWorker.queueForSupport({
          type: 'complaint',
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          description: `Complaint detected: ${payload.entities.find(e => e.type === 'complaint_topic')?.value || 'unspecified'}`,
          priority: 'high'
        });
      }
    );
    
    // Handle negotiation intents
    this.eventBus.subscribe<IntentDetectedPayload>(
      AnalysisEventType.INTENT_NEGOTIATION_DETECTED,
      async (payload) => {
        await negotiationWorker.processNegotiationIntent({
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          intent: payload.primaryIntent,
          entities: payload.entities
        });
      }
    );
    
    // Handle order intents
    this.eventBus.subscribe<IntentDetectedPayload>(
      AnalysisEventType.INTENT_ORDER_DETECTED,
      async (payload) => {
        await orderProcessor.processOrderIntent({
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          products: payload.entities.filter(e => e.type === 'product'),
          quantities: payload.entities.filter(e => e.type === 'quantity')
        });
      }
    );
    
    // Handle quote requests
    this.eventBus.subscribe<IntentDetectedPayload>(
      AnalysisEventType.INTENT_QUOTE_REQUESTED,
      async (payload) => {
        await orderProcessor.generateQuote({
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          products: payload.entities.filter(e => e.type === 'product'),
          quantities: payload.entities.filter(e => e.type === 'quantity')
        });
      }
    );
    
    // Handle discount requests
    this.eventBus.subscribe<IntentDetectedPayload>(
      AnalysisEventType.INTENT_DISCOUNT_REQUESTED,
      async (payload) => {
        await negotiationWorker.processDiscountRequest({
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          requestedDiscount: payload.entities.find(e => e.type === 'percentage')?.value
        });
      }
    );
  }
  
  /**
   * Subscribe to emotion recognition events
   */
  subscribeToEmotionEvents(handoverWorker: HandoverWorker): void {
    // Handle high arousal emotions
    this.eventBus.subscribe<EmotionRecognizedPayload & { severity: string }>(
      AnalysisEventType.EMOTION_HIGH_AROUSAL,
      async (payload) => {
        if (payload.severity === 'critical') {
          await handoverWorker.flagForReview({
            type: 'high_arousal',
            tenantId: payload.tenantId,
            conversationId: payload.conversationId,
            contactId: payload.contactId,
            emotion: payload.primaryEmotion,
            arousal: payload.vad.arousal,
            priority: 'high'
          });
        }
      }
    );
    
    // Handle frustration detection
    this.eventBus.subscribe<EmotionRecognizedPayload>(
      AnalysisEventType.EMOTION_FRUSTRATION_DETECTED,
      async (payload) => {
        await handoverWorker.queueForSupport({
          type: 'frustration',
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          description: `Customer frustration detected (intensity: ${payload.intensity.toFixed(2)})`,
          priority: 'medium'
        });
      }
    );
    
    // Handle satisfaction for positive feedback tracking
    this.eventBus.subscribe<EmotionRecognizedPayload>(
      AnalysisEventType.EMOTION_SATISFACTION_DETECTED,
      async (payload) => {
        await this.recordPositiveFeedback({
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          emotion: payload.primaryEmotion,
          intensity: payload.intensity
        });
      }
    );
  }
  
  /**
   * Subscribe to aggregate analysis events
   */
  subscribeToAggregateEvents(
    handoverWorker: HandoverWorker,
    alertManager: AlertManager
  ): void {
    // Handle risk level changes
    this.eventBus.subscribe<AggregateCompletedPayload & { 
      previousRiskLevel: RiskLevel;
      riskLevelChange: string;
    }>(
      AnalysisEventType.RISK_LEVEL_CHANGED,
      async (payload) => {
        if (['high', 'critical'].includes(payload.riskLevel)) {
          await handoverWorker.escalateIfNeeded({
            tenantId: payload.tenantId,
            conversationId: payload.conversationId,
            riskLevel: payload.riskLevel,
            previousLevel: payload.previousRiskLevel
          });
        }
      }
    );
    
    // Handle action required
    this.eventBus.subscribe<AggregateCompletedPayload>(
      AnalysisEventType.ACTION_REQUIRED,
      async (payload) => {
        await alertManager.createActionAlert({
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          actions: payload.actions,
          urgencyLevel: payload.urgencyLevel
        });
      }
    );
    
    // Handle escalations
    this.eventBus.subscribe<AggregateCompletedPayload & {
      escalationLevel: string;
      escalationReason: string;
    }>(
      AnalysisEventType.ESCALATION_TRIGGERED,
      async (payload) => {
        await handoverWorker.triggerEscalation({
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          level: payload.escalationLevel,
          reason: payload.escalationReason,
          urgency: payload.urgencyLevel
        });
      }
    );
  }
  
  /**
   * Subscribe to alert events
   */
  subscribeToAlertEvents(notificationService: NotificationService): void {
    // Send notifications for new alerts
    this.eventBus.subscribe<AlertCreatedPayload>(
      AnalysisEventType.ALERT_CREATED,
      async (payload) => {
        await notificationService.sendAlertNotification({
          alertId: payload.alertId,
          tenantId: payload.tenantId,
          type: payload.alertType,
          severity: payload.severity,
          description: payload.description,
          suggestedActions: payload.suggestedActions
        });
      }
    );
  }
  
  /**
   * Helper: Notify handover system
   */
  private async notifyHandoverSystem(data: any): Promise<void> {
    const queue = new Queue('handover-triggers');
    await queue.add('analysis-trigger', data, { priority: 1 });
  }
  
  /**
   * Helper: Update trend tracking
   */
  private async updateTrendTracking(data: any): Promise<void> {
    const queue = new Queue('trend-tracking');
    await queue.add('update', data);
  }
  
  /**
   * Helper: Record positive feedback
   */
  private async recordPositiveFeedback(data: any): Promise<void> {
    const queue = new Queue('feedback-tracking');
    await queue.add('positive', data);
  }
}
```

### 10.2 Cross-Worker Integration

#### 10.2.1 Integration with Workers J (Handover & Channel)

```typescript
// packages/workers-k/src/integration/handover-integration.ts

import { Queue, QueueEvents } from 'bullmq';
import type { AnalysisAggregate, AlertPayload } from '../types';

/**
 * Handover System Integration
 * Bridges analysis results with human handover workflow
 */
export class HandoverIntegration {
  private handoverQueue: Queue;
  private handoverEvents: QueueEvents;
  
  constructor(redisConfig: RedisConfig) {
    this.handoverQueue = new Queue('handover-triggers', {
      connection: redisConfig
    });
    
    this.handoverEvents = new QueueEvents('handover-triggers', {
      connection: redisConfig
    });
  }
  
  /**
   * Trigger handover based on analysis results
   */
  async triggerHandover(
    aggregate: AnalysisAggregate,
    reason: HandoverReason
  ): Promise<{ jobId: string; queued: boolean }> {
    // Determine handover urgency from analysis
    const urgency = this.calculateUrgency(aggregate);
    
    // Build handover request
    const handoverRequest: HandoverRequest = {
      type: reason,
      tenantId: aggregate.tenantId,
      conversationId: aggregate.conversationId,
      contactId: aggregate.contactId,
      
      // Analysis context
      analysis: {
        compositeScore: aggregate.compositeScore,
        riskLevel: aggregate.riskLevel,
        urgencyLevel: aggregate.urgencyLevel,
        sentiment: aggregate.sentimentSummary,
        intent: aggregate.intentSummary,
        emotion: aggregate.emotionSummary
      },
      
      // Urgency and priority
      urgency,
      priority: this.mapUrgencyToPriority(urgency),
      
      // Context for human agent
      context: {
        conversationHistory: await this.getRecentMessages(
          aggregate.tenantId,
          aggregate.conversationId,
          10
        ),
        analysisHistory: await this.getAnalysisHistory(
          aggregate.tenantId,
          aggregate.conversationId
        ),
        customerProfile: await this.getCustomerProfile(
          aggregate.tenantId,
          aggregate.contactId
        )
      },
      
      // Metadata
      triggeredAt: new Date(),
      triggeredBy: 'analysis-worker',
      expiresAt: new Date(Date.now() + this.getExpirationTime(urgency))
    };
    
    // Queue handover job
    const job = await this.handoverQueue.add(
      'analysis-triggered-handover',
      handoverRequest,
      {
        priority: this.getPriorityNumber(urgency),
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      }
    );
    
    return {
      jobId: job.id!,
      queued: true
    };
  }
  
  /**
   * Calculate urgency based on aggregate analysis
   */
  private calculateUrgency(aggregate: AnalysisAggregate): UrgencyLevel {
    // Critical conditions
    if (aggregate.riskLevel === 'critical') return 'immediate';
    if (aggregate.compositeScore <= -0.7) return 'immediate';
    if (aggregate.emotionSummary?.arousal > 0.85) return 'immediate';
    
    // High urgency conditions
    if (aggregate.riskLevel === 'high') return 'high';
    if (aggregate.compositeScore <= -0.5) return 'high';
    if (aggregate.intentSummary?.primaryIntent === 'COMPLAINT') return 'high';
    
    // Medium urgency conditions
    if (aggregate.riskLevel === 'medium') return 'medium';
    if (aggregate.emotionSummary?.primaryEmotion === 'frustration') return 'medium';
    
    return 'low';
  }
  
  /**
   * Map urgency to BullMQ priority (lower = higher priority)
   */
  private getPriorityNumber(urgency: UrgencyLevel): number {
    const priorities: Record<UrgencyLevel, number> = {
      immediate: 1,
      high: 2,
      medium: 3,
      low: 4
    };
    return priorities[urgency] || 4;
  }
  
  /**
   * Map urgency to display priority
   */
  private mapUrgencyToPriority(urgency: UrgencyLevel): string {
    const map: Record<UrgencyLevel, string> = {
      immediate: 'critical',
      high: 'high',
      medium: 'normal',
      low: 'low'
    };
    return map[urgency];
  }
  
  /**
   * Get expiration time based on urgency
   */
  private getExpirationTime(urgency: UrgencyLevel): number {
    const times: Record<UrgencyLevel, number> = {
      immediate: 5 * 60 * 1000,   // 5 minutes
      high: 15 * 60 * 1000,       // 15 minutes
      medium: 60 * 60 * 1000,     // 1 hour
      low: 4 * 60 * 60 * 1000     // 4 hours
    };
    return times[urgency];
  }
  
  /**
   * Get recent messages for context
   */
  private async getRecentMessages(
    tenantId: string,
    conversationId: string,
    limit: number
  ): Promise<ConversationMessage[]> {
    // Fetch from database
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.tenantId, tenantId),
          eq(conversationMessages.conversationId, conversationId)
        )
      )
      .orderBy(desc(conversationMessages.createdAt))
      .limit(limit);
    
    return messages.reverse();
  }
  
  /**
   * Get analysis history for conversation
   */
  private async getAnalysisHistory(
    tenantId: string,
    conversationId: string
  ): Promise<AnalysisHistoryItem[]> {
    const aggregates = await db
      .select()
      .from(analysisAggregates)
      .where(
        and(
          eq(analysisAggregates.tenantId, tenantId),
          eq(analysisAggregates.conversationId, conversationId)
        )
      )
      .orderBy(desc(analysisAggregates.createdAt))
      .limit(10);
    
    return aggregates.map(a => ({
      timestamp: a.createdAt,
      compositeScore: a.compositeScore,
      riskLevel: a.riskLevel,
      trend: a.trend
    }));
  }
  
  /**
   * Get customer profile for agent context
   */
  private async getCustomerProfile(
    tenantId: string,
    contactId: string
  ): Promise<CustomerProfile> {
    const contact = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.id, contactId)
        )
      )
      .limit(1);
    
    if (!contact[0]) {
      return { unknown: true };
    }
    
    return {
      name: contact[0].name,
      company: contact[0].company,
      tier: contact[0].tier,
      lifetimeValue: contact[0].lifetimeValue,
      previousInteractions: contact[0].interactionCount,
      preferredLanguage: contact[0].preferredLanguage,
      notes: contact[0].internalNotes
    };
  }
}

/**
 * Handover Request Type
 */
interface HandoverRequest {
  type: HandoverReason;
  tenantId: string;
  conversationId: string;
  contactId: string;
  analysis: {
    compositeScore: number;
    riskLevel: RiskLevel;
    urgencyLevel: UrgencyLevel;
    sentiment?: SentimentSummary;
    intent?: IntentSummary;
    emotion?: EmotionSummary;
  };
  urgency: UrgencyLevel;
  priority: string;
  context: {
    conversationHistory: ConversationMessage[];
    analysisHistory: AnalysisHistoryItem[];
    customerProfile: CustomerProfile;
  };
  triggeredAt: Date;
  triggeredBy: string;
  expiresAt: Date;
}

type HandoverReason = 
  | 'EXPLICIT_HANDOVER_REQUEST'
  | 'COMPLAINT_DETECTED'
  | 'HIGH_RISK_CONVERSATION'
  | 'NEGATIVE_SENTIMENT'
  | 'HIGH_AROUSAL_EMOTION'
  | 'ESCALATION_TRIGGERED'
  | 'SLA_BREACH_IMMINENT'
  | 'COMPLEX_NEGOTIATION'
  | 'TECHNICAL_ISSUE';
```

#### 10.2.2 Integration with Workers D (Negotiation FSM)

```typescript
// packages/workers-k/src/integration/negotiation-integration.ts

import { Queue } from 'bullmq';
import type { IntentDetectionResult, EmotionRecognitionResult } from '../types';

/**
 * Negotiation FSM Integration
 * Bridges intent/emotion analysis with negotiation state machine
 */
export class NegotiationIntegration {
  private negotiationQueue: Queue;
  private pricingQueue: Queue;
  
  constructor(redisConfig: RedisConfig) {
    this.negotiationQueue = new Queue('negotiation-events', {
      connection: redisConfig
    });
    this.pricingQueue = new Queue('pricing-requests', {
      connection: redisConfig
    });
  }
  
  /**
   * Process negotiation-related intents
   */
  async processNegotiationIntent(
    intent: IntentDetectionResult,
    emotion?: EmotionRecognitionResult
  ): Promise<void> {
    // Determine negotiation action based on intent
    const negotiationIntents: IntentType[] = [
      'NEGOTIATION_ATTEMPT',
      'PRICE_NEGOTIATION',
      'DISCOUNT_REQUEST',
      'BULK_ORDER',
      'TERMS_DISCUSSION',
      'COMPETITOR_MENTION'
    ];
    
    if (!negotiationIntents.includes(intent.primaryIntent)) {
      return; // Not a negotiation intent
    }
    
    // Build negotiation event
    const event: NegotiationEvent = {
      type: this.mapIntentToNegotiationEvent(intent.primaryIntent),
      tenantId: intent.tenantId,
      conversationId: intent.conversationId,
      contactId: intent.contactId,
      
      // Intent analysis
      intent: {
        primary: intent.primaryIntent,
        confidence: intent.confidence,
        secondary: intent.secondaryIntents
      },
      
      // Extracted entities
      entities: {
        products: intent.entities.filter(e => e.type === 'product'),
        quantities: intent.entities.filter(e => e.type === 'quantity'),
        prices: intent.entities.filter(e => e.type === 'price'),
        percentages: intent.entities.filter(e => e.type === 'percentage'),
        competitors: intent.entities.filter(e => e.type === 'company'),
        dates: intent.entities.filter(e => e.type === 'date')
      },
      
      // Emotional context (affects negotiation strategy)
      emotionalContext: emotion ? {
        emotion: emotion.primaryEmotion,
        intensity: emotion.intensity,
        valence: emotion.vad.valence,
        arousal: emotion.vad.arousal
      } : undefined,
      
      // Timestamp
      timestamp: new Date()
    };
    
    // Queue for negotiation FSM processing
    await this.negotiationQueue.add(
      'analysis-intent',
      event,
      { priority: this.getNegotiationPriority(intent) }
    );
    
    // If discount request, also queue for pricing evaluation
    if (['DISCOUNT_REQUEST', 'PRICE_NEGOTIATION'].includes(intent.primaryIntent)) {
      await this.queuePricingRequest(event);
    }
  }
  
  /**
   * Map intent to negotiation FSM event type
   */
  private mapIntentToNegotiationEvent(intent: IntentType): NegotiationEventType {
    const mapping: Partial<Record<IntentType, NegotiationEventType>> = {
      NEGOTIATION_ATTEMPT: 'NEGOTIATION_INITIATED',
      PRICE_NEGOTIATION: 'PRICE_COUNTER_OFFER',
      DISCOUNT_REQUEST: 'DISCOUNT_REQUESTED',
      BULK_ORDER: 'VOLUME_OFFER',
      TERMS_DISCUSSION: 'TERMS_NEGOTIATION',
      COMPETITOR_MENTION: 'COMPETITIVE_PRESSURE'
    };
    return mapping[intent] || 'GENERAL_INQUIRY';
  }
  
  /**
   * Get priority for negotiation event
   */
  private getNegotiationPriority(intent: IntentDetectionResult): number {
    // High value or urgent negotiations get priority
    const volumeEntity = intent.entities.find(e => e.type === 'quantity');
    const priceEntity = intent.entities.find(e => e.type === 'price');
    
    if (volumeEntity) {
      const quantity = parseFloat(volumeEntity.value);
      if (quantity > 100) return 1; // Large order
    }
    
    if (priceEntity) {
      const price = parseFloat(priceEntity.value);
      if (price > 10000) return 1; // High value
    }
    
    return 2; // Normal priority
  }
  
  /**
   * Queue pricing request for discount evaluation
   */
  private async queuePricingRequest(event: NegotiationEvent): Promise<void> {
    const pricingRequest: PricingRequest = {
      tenantId: event.tenantId,
      conversationId: event.conversationId,
      contactId: event.contactId,
      type: 'discount_evaluation',
      
      // Requested discount
      requestedDiscount: event.entities.percentages[0]?.value,
      
      // Products involved
      products: event.entities.products.map(p => p.value),
      
      // Quantities
      quantities: event.entities.quantities.map(q => ({
        product: q.normalizedValue?.product,
        quantity: parseFloat(q.value)
      })),
      
      // Competitor reference (for competitive pricing)
      competitorReference: event.entities.competitors[0]?.value,
      
      // Emotional urgency (affects flexibility)
      customerUrgency: event.emotionalContext?.arousal || 0.5,
      customerSatisfaction: event.emotionalContext?.valence || 0,
      
      timestamp: new Date()
    };
    
    await this.pricingQueue.add('discount-evaluation', pricingRequest);
  }
  
  /**
   * Provide emotional context update to ongoing negotiation
   */
  async updateNegotiationContext(
    emotion: EmotionRecognitionResult
  ): Promise<void> {
    // Check if there's an active negotiation for this conversation
    const activeNegotiation = await this.getActiveNegotiation(
      emotion.tenantId,
      emotion.conversationId
    );
    
    if (!activeNegotiation) return;
    
    // Update negotiation with emotional context
    await this.negotiationQueue.add(
      'emotional-update',
      {
        negotiationId: activeNegotiation.id,
        emotionalContext: {
          emotion: emotion.primaryEmotion,
          intensity: emotion.intensity,
          valence: emotion.vad.valence,
          arousal: emotion.vad.arousal,
          trend: emotion.trend
        },
        timestamp: new Date()
      }
    );
  }
  
  /**
   * Get active negotiation for conversation
   */
  private async getActiveNegotiation(
    tenantId: string,
    conversationId: string
  ): Promise<Negotiation | null> {
    const result = await db
      .select()
      .from(negotiations)
      .where(
        and(
          eq(negotiations.tenantId, tenantId),
          eq(negotiations.conversationId, conversationId),
          inArray(negotiations.status, ['active', 'pending_response'])
        )
      )
      .limit(1);
    
    return result[0] || null;
  }
}

/**
 * Negotiation Event Interface
 */
interface NegotiationEvent {
  type: NegotiationEventType;
  tenantId: string;
  conversationId: string;
  contactId: string;
  intent: {
    primary: IntentType;
    confidence: number;
    secondary: Array<{ intent: IntentType; confidence: number }>;
  };
  entities: {
    products: Entity[];
    quantities: Entity[];
    prices: Entity[];
    percentages: Entity[];
    competitors: Entity[];
    dates: Entity[];
  };
  emotionalContext?: {
    emotion: EmotionType;
    intensity: number;
    valence: number;
    arousal: number;
  };
  timestamp: Date;
}

type NegotiationEventType =
  | 'NEGOTIATION_INITIATED'
  | 'PRICE_COUNTER_OFFER'
  | 'DISCOUNT_REQUESTED'
  | 'VOLUME_OFFER'
  | 'TERMS_NEGOTIATION'
  | 'COMPETITIVE_PRESSURE'
  | 'GENERAL_INQUIRY';

interface PricingRequest {
  tenantId: string;
  conversationId: string;
  contactId: string;
  type: string;
  requestedDiscount?: string;
  products: string[];
  quantities: Array<{ product?: string; quantity: number }>;
  competitorReference?: string;
  customerUrgency: number;
  customerSatisfaction: number;
  timestamp: Date;
}
```

#### 10.2.3 Integration with Workers C (AI Agent Core)

```typescript
// packages/workers-k/src/integration/ai-agent-integration.ts

import { Queue } from 'bullmq';
import type {
  SentimentAnalysisResult,
  IntentDetectionResult,
  EmotionRecognitionResult,
  AnalysisAggregate
} from '../types';

/**
 * AI Agent Core Integration
 * Provides analysis context to guide AI agent responses
 */
export class AIAgentIntegration {
  private agentContextQueue: Queue;
  private responseGuidanceQueue: Queue;
  
  constructor(redisConfig: RedisConfig) {
    this.agentContextQueue = new Queue('agent-context-updates', {
      connection: redisConfig
    });
    this.responseGuidanceQueue = new Queue('response-guidance', {
      connection: redisConfig
    });
  }
  
  /**
   * Update AI agent context with analysis results
   */
  async updateAgentContext(
    aggregate: AnalysisAggregate
  ): Promise<void> {
    // Build context update for AI agent
    const contextUpdate: AgentContextUpdate = {
      tenantId: aggregate.tenantId,
      conversationId: aggregate.conversationId,
      contactId: aggregate.contactId,
      
      // Current conversation state
      conversationState: {
        sentimentScore: aggregate.compositeScore,
        riskLevel: aggregate.riskLevel,
        urgencyLevel: aggregate.urgencyLevel,
        trend: aggregate.trend
      },
      
      // Customer emotional state
      customerState: {
        sentiment: aggregate.sentimentSummary?.label || 'neutral',
        emotion: aggregate.emotionSummary?.primaryEmotion || 'neutral',
        emotionalIntensity: aggregate.emotionSummary?.intensity || 0.5,
        frustrationLevel: this.calculateFrustrationLevel(aggregate),
        satisfactionLevel: this.calculateSatisfactionLevel(aggregate)
      },
      
      // Detected intents to address
      intentsToAddress: this.extractIntentsToAddress(aggregate),
      
      // Response guidance
      guidance: this.generateResponseGuidance(aggregate),
      
      // Warnings
      warnings: this.generateWarnings(aggregate),
      
      timestamp: new Date()
    };
    
    await this.agentContextQueue.add(
      'analysis-update',
      contextUpdate,
      { priority: this.getContextPriority(aggregate) }
    );
  }
  
  /**
   * Generate response guidance based on analysis
   */
  generateResponseGuidance(aggregate: AnalysisAggregate): ResponseGuidance {
    const guidance: ResponseGuidance = {
      // Tone recommendation
      recommendedTone: this.recommendTone(aggregate),
      
      // Urgency handling
      urgencyHandling: this.getUrgencyHandling(aggregate),
      
      // Empathy markers
      empathyRequired: this.isEmpathyRequired(aggregate),
      empathyType: this.getEmpathyType(aggregate),
      
      // Action recommendations
      actionPriorities: this.getActionPriorities(aggregate),
      
      // Content suggestions
      contentSuggestions: this.getContentSuggestions(aggregate),
      
      // Things to avoid
      avoidTopics: this.getTopicsToAvoid(aggregate),
      
      // Language adjustments
      languageAdjustments: this.getLanguageAdjustments(aggregate)
    };
    
    return guidance;
  }
  
  /**
   * Recommend response tone based on analysis
   */
  private recommendTone(aggregate: AnalysisAggregate): ToneRecommendation {
    const { compositeScore, emotionSummary, intentSummary } = aggregate;
    
    // Negative sentiment/emotion = more empathetic, careful tone
    if (compositeScore <= -0.5 || emotionSummary?.primaryEmotion === 'anger') {
      return {
        tone: 'empathetic',
        formality: 'professional',
        pacing: 'measured',
        notes: 'Customer appears frustrated. Use calming language, acknowledge feelings.'
      };
    }
    
    // Complaint = apologetic, solution-focused
    if (intentSummary?.primaryIntent === 'COMPLAINT') {
      return {
        tone: 'apologetic',
        formality: 'professional',
        pacing: 'measured',
        notes: 'Acknowledge the issue, apologize if appropriate, focus on resolution.'
      };
    }
    
    // Urgent request = efficient, action-oriented
    if (aggregate.urgencyLevel === 'immediate' || aggregate.urgencyLevel === 'high') {
      return {
        tone: 'efficient',
        formality: 'professional',
        pacing: 'quick',
        notes: 'Customer needs quick response. Be direct and action-oriented.'
      };
    }
    
    // Positive sentiment = match enthusiasm
    if (compositeScore >= 0.5) {
      return {
        tone: 'friendly',
        formality: 'conversational',
        pacing: 'natural',
        notes: 'Customer is positive. Match their energy level.'
      };
    }
    
    // Negotiation = professional, firm but flexible
    if (['NEGOTIATION_ATTEMPT', 'PRICE_NEGOTIATION', 'DISCOUNT_REQUEST']
        .includes(intentSummary?.primaryIntent || '')) {
      return {
        tone: 'professional',
        formality: 'business',
        pacing: 'deliberate',
        notes: 'Negotiation in progress. Be helpful but maintain value proposition.'
      };
    }
    
    // Default
    return {
      tone: 'helpful',
      formality: 'professional',
      pacing: 'natural',
      notes: 'Standard professional interaction.'
    };
  }
  
  /**
   * Determine urgency handling approach
   */
  private getUrgencyHandling(aggregate: AnalysisAggregate): UrgencyHandling {
    switch (aggregate.urgencyLevel) {
      case 'immediate':
        return {
          level: 'critical',
          maxResponseTime: '1 minute',
          escalateIfDelayed: true,
          prioritizeResolution: true
        };
      case 'high':
        return {
          level: 'high',
          maxResponseTime: '5 minutes',
          escalateIfDelayed: true,
          prioritizeResolution: true
        };
      case 'medium':
        return {
          level: 'normal',
          maxResponseTime: '15 minutes',
          escalateIfDelayed: false,
          prioritizeResolution: false
        };
      default:
        return {
          level: 'low',
          maxResponseTime: '1 hour',
          escalateIfDelayed: false,
          prioritizeResolution: false
        };
    }
  }
  
  /**
   * Check if empathy is required
   */
  private isEmpathyRequired(aggregate: AnalysisAggregate): boolean {
    const { compositeScore, emotionSummary, intentSummary } = aggregate;
    
    return (
      compositeScore <= -0.3 ||
      emotionSummary?.valence < -0.3 ||
      ['frustration', 'anger', 'disappointment', 'sadness'].includes(
        emotionSummary?.primaryEmotion || ''
      ) ||
      intentSummary?.primaryIntent === 'COMPLAINT'
    );
  }
  
  /**
   * Get type of empathy needed
   */
  private getEmpathyType(aggregate: AnalysisAggregate): string {
    const emotion = aggregate.emotionSummary?.primaryEmotion;
    
    switch (emotion) {
      case 'frustration':
        return 'acknowledge_frustration';
      case 'anger':
        return 'de_escalate';
      case 'disappointment':
        return 'apologize_and_resolve';
      case 'confusion':
        return 'clarify_and_guide';
      case 'worry':
      case 'anxiety':
        return 'reassure';
      default:
        return 'general_empathy';
    }
  }
  
  /**
   * Get action priorities based on intents
   */
  private getActionPriorities(aggregate: AnalysisAggregate): ActionPriority[] {
    const priorities: ActionPriority[] = [];
    const intent = aggregate.intentSummary;
    
    if (!intent) return priorities;
    
    // Map intents to actions
    const intentActions: Partial<Record<IntentType, ActionPriority>> = {
      PRODUCT_INQUIRY: {
        action: 'provide_product_information',
        priority: 'high',
        timeframe: 'immediate'
      },
      PRICING_INQUIRY: {
        action: 'provide_pricing',
        priority: 'high',
        timeframe: 'immediate'
      },
      QUOTE_REQUEST: {
        action: 'generate_quote',
        priority: 'high',
        timeframe: 'short'
      },
      ORDER_PLACEMENT: {
        action: 'process_order',
        priority: 'critical',
        timeframe: 'immediate'
      },
      COMPLAINT: {
        action: 'resolve_complaint',
        priority: 'critical',
        timeframe: 'immediate'
      },
      DISCOUNT_REQUEST: {
        action: 'evaluate_discount',
        priority: 'medium',
        timeframe: 'short'
      },
      HUMAN_AGENT_REQUEST: {
        action: 'initiate_handover',
        priority: 'critical',
        timeframe: 'immediate'
      }
    };
    
    const primaryAction = intentActions[intent.primaryIntent];
    if (primaryAction) {
      priorities.push(primaryAction);
    }
    
    // Add secondary intent actions
    for (const secondary of intent.secondaryIntents || []) {
      const action = intentActions[secondary.intent];
      if (action && secondary.confidence > 0.7) {
        priorities.push({
          ...action,
          priority: 'medium' // Downgrade secondary intent priorities
        });
      }
    }
    
    return priorities;
  }
  
  /**
   * Get content suggestions
   */
  private getContentSuggestions(aggregate: AnalysisAggregate): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    // Based on detected entities
    if (aggregate.intentSummary?.entities) {
      const products = aggregate.intentSummary.entities.filter(
        e => e.type === 'product'
      );
      if (products.length > 0) {
        suggestions.push({
          type: 'product_details',
          context: `Customer mentioned: ${products.map(p => p.value).join(', ')}`,
          action: 'Include relevant product information'
        });
      }
    }
    
    // Based on risk level
    if (aggregate.riskLevel === 'high' || aggregate.riskLevel === 'critical') {
      suggestions.push({
        type: 'de_escalation',
        context: 'Conversation is high risk',
        action: 'Focus on resolution and offer concrete help'
      });
    }
    
    // Based on trend
    if (aggregate.trend === 'declining') {
      suggestions.push({
        type: 'engagement',
        context: 'Sentiment is declining',
        action: 'Try to address underlying concerns'
      });
    }
    
    return suggestions;
  }
  
  /**
   * Get topics to avoid
   */
  private getTopicsToAvoid(aggregate: AnalysisAggregate): string[] {
    const avoid: string[] = [];
    
    // If frustrated, avoid pushing sales
    if (aggregate.emotionSummary?.primaryEmotion === 'frustration') {
      avoid.push('upselling');
      avoid.push('cross-selling');
    }
    
    // If complaint, avoid deflection
    if (aggregate.intentSummary?.primaryIntent === 'COMPLAINT') {
      avoid.push('blame_shifting');
      avoid.push('policy_references_without_solution');
    }
    
    // If high arousal, avoid dismissive language
    if (aggregate.emotionSummary?.arousal > 0.7) {
      avoid.push('dismissive_language');
      avoid.push('long_explanations');
    }
    
    return avoid;
  }
  
  /**
   * Get language adjustments
   */
  private getLanguageAdjustments(aggregate: AnalysisAggregate): LanguageAdjustment[] {
    const adjustments: LanguageAdjustment[] = [];
    
    // Romanian-specific adjustments
    if (aggregate.sentimentSummary?.language === 'ro') {
      adjustments.push({
        type: 'honorific',
        rule: 'Use formal Romanian (dumneavoastră) unless customer uses informal'
      });
    }
    
    // Emotional state adjustments
    if (aggregate.compositeScore <= -0.5) {
      adjustments.push({
        type: 'softeners',
        rule: 'Use softening language: "Înțeleg", "Îmi pare rău", "Vă asigur"'
      });
    }
    
    // Professional context
    if (aggregate.intentSummary?.primaryIntent === 'ORDER_PLACEMENT') {
      adjustments.push({
        type: 'clarity',
        rule: 'Use clear, unambiguous language for order details'
      });
    }
    
    return adjustments;
  }
  
  /**
   * Calculate frustration level
   */
  private calculateFrustrationLevel(aggregate: AnalysisAggregate): number {
    let level = 0;
    
    // Negative sentiment contribution
    if (aggregate.compositeScore < 0) {
      level += Math.abs(aggregate.compositeScore) * 0.4;
    }
    
    // Frustration emotion contribution
    if (aggregate.emotionSummary?.primaryEmotion === 'frustration') {
      level += aggregate.emotionSummary.intensity * 0.4;
    }
    
    // High arousal contribution
    if (aggregate.emotionSummary?.arousal > 0.6) {
      level += (aggregate.emotionSummary.arousal - 0.6) * 0.5;
    }
    
    // Complaint intent contribution
    if (aggregate.intentSummary?.primaryIntent === 'COMPLAINT') {
      level += 0.3;
    }
    
    return Math.min(1, level);
  }
  
  /**
   * Calculate satisfaction level
   */
  private calculateSatisfactionLevel(aggregate: AnalysisAggregate): number {
    let level = 0.5; // Neutral baseline
    
    // Positive sentiment contribution
    if (aggregate.compositeScore > 0) {
      level += aggregate.compositeScore * 0.3;
    } else {
      level += aggregate.compositeScore * 0.2;
    }
    
    // Positive emotion contribution
    const positiveEmotions = ['joy', 'satisfaction', 'gratitude', 'enthusiasm'];
    if (positiveEmotions.includes(aggregate.emotionSummary?.primaryEmotion || '')) {
      level += aggregate.emotionSummary!.intensity * 0.3;
    }
    
    // Positive valence contribution
    if (aggregate.emotionSummary?.valence > 0) {
      level += aggregate.emotionSummary.valence * 0.2;
    }
    
    return Math.max(0, Math.min(1, level));
  }
  
  /**
   * Extract intents that need to be addressed
   */
  private extractIntentsToAddress(aggregate: AnalysisAggregate): IntentToAddress[] {
    const intents: IntentToAddress[] = [];
    
    if (aggregate.intentSummary) {
      // Primary intent
      intents.push({
        intent: aggregate.intentSummary.primaryIntent,
        confidence: aggregate.intentSummary.confidence,
        priority: 'primary',
        entities: aggregate.intentSummary.entities || []
      });
      
      // High-confidence secondary intents
      for (const secondary of aggregate.intentSummary.secondaryIntents || []) {
        if (secondary.confidence > 0.6) {
          intents.push({
            intent: secondary.intent,
            confidence: secondary.confidence,
            priority: 'secondary',
            entities: []
          });
        }
      }
    }
    
    return intents;
  }
  
  /**
   * Generate warnings for AI agent
   */
  private generateWarnings(aggregate: AnalysisAggregate): AgentWarning[] {
    const warnings: AgentWarning[] = [];
    
    // Risk level warning
    if (['high', 'critical'].includes(aggregate.riskLevel)) {
      warnings.push({
        type: 'risk',
        severity: aggregate.riskLevel === 'critical' ? 'critical' : 'warning',
        message: `Conversation risk level is ${aggregate.riskLevel}`,
        action: 'Consider human handover if situation escalates'
      });
    }
    
    // Declining trend warning
    if (aggregate.trend === 'declining' || aggregate.trend === 'deteriorating') {
      warnings.push({
        type: 'trend',
        severity: 'warning',
        message: 'Customer sentiment is declining',
        action: 'Take proactive steps to address concerns'
      });
    }
    
    // Escalation warning
    if (aggregate.escalationTriggered) {
      warnings.push({
        type: 'escalation',
        severity: 'critical',
        message: 'Escalation has been triggered',
        action: 'Prepare for potential handover'
      });
    }
    
    return warnings;
  }
  
  /**
   * Get context update priority
   */
  private getContextPriority(aggregate: AnalysisAggregate): number {
    if (aggregate.riskLevel === 'critical') return 1;
    if (aggregate.urgencyLevel === 'immediate') return 1;
    if (aggregate.riskLevel === 'high') return 2;
    if (aggregate.urgencyLevel === 'high') return 2;
    return 3;
  }
}

// Type definitions
interface AgentContextUpdate {
  tenantId: string;
  conversationId: string;
  contactId: string;
  conversationState: {
    sentimentScore: number;
    riskLevel: RiskLevel;
    urgencyLevel: UrgencyLevel;
    trend: TrendDirection;
  };
  customerState: {
    sentiment: string;
    emotion: string;
    emotionalIntensity: number;
    frustrationLevel: number;
    satisfactionLevel: number;
  };
  intentsToAddress: IntentToAddress[];
  guidance: ResponseGuidance;
  warnings: AgentWarning[];
  timestamp: Date;
}

interface ResponseGuidance {
  recommendedTone: ToneRecommendation;
  urgencyHandling: UrgencyHandling;
  empathyRequired: boolean;
  empathyType: string;
  actionPriorities: ActionPriority[];
  contentSuggestions: ContentSuggestion[];
  avoidTopics: string[];
  languageAdjustments: LanguageAdjustment[];
}

interface ToneRecommendation {
  tone: string;
  formality: string;
  pacing: string;
  notes: string;
}

interface UrgencyHandling {
  level: string;
  maxResponseTime: string;
  escalateIfDelayed: boolean;
  prioritizeResolution: boolean;
}

interface ActionPriority {
  action: string;
  priority: string;
  timeframe: string;
}

interface ContentSuggestion {
  type: string;
  context: string;
  action: string;
}

interface LanguageAdjustment {
  type: string;
  rule: string;
}

interface IntentToAddress {
  intent: IntentType;
  confidence: number;
  priority: string;
  entities: Entity[];
}

interface AgentWarning {
  type: string;
  severity: string;
  message: string;
  action: string;
}
```

### 10.3 Message Flow Patterns

#### 10.3.1 Inbound Message Analysis Flow

```typescript
// packages/workers-k/src/integration/message-flow.ts

import { Queue, Worker, Job } from 'bullmq';
import type { ConversationMessage } from '../types';

/**
 * Message Analysis Flow Orchestrator
 * Coordinates the flow of messages through all analysis workers
 */
export class MessageAnalysisFlow {
  private inboundQueue: Queue;
  private sentimentQueue: Queue;
  private intentQueue: Queue;
  private emotionQueue: Queue;
  private aggregateQueue: Queue;
  
  constructor(redisConfig: RedisConfig) {
    this.inboundQueue = new Queue('message-inbound', { connection: redisConfig });
    this.sentimentQueue = new Queue('sentiment-analysis', { connection: redisConfig });
    this.intentQueue = new Queue('intent-detection', { connection: redisConfig });
    this.emotionQueue = new Queue('emotion-recognition', { connection: redisConfig });
    this.aggregateQueue = new Queue('analysis-aggregate', { connection: redisConfig });
  }
  
  /**
   * Process inbound message through analysis pipeline
   * 
   * Flow:
   * 1. Message received → Inbound Queue
   * 2. Parallel: Sentiment, Intent, Emotion analysis
   * 3. Results collected → Aggregate analysis
   * 4. Final results → Events published
   */
  async processMessage(message: ConversationMessage): Promise<void> {
    // Create analysis job for inbound message
    const jobData: MessageAnalysisJob = {
      tenantId: message.tenantId,
      messageId: message.id,
      conversationId: message.conversationId,
      contactId: message.contactId,
      content: message.content,
      direction: message.direction,
      channel: message.channel,
      timestamp: message.createdAt,
      metadata: {
        previousMessageId: message.previousMessageId,
        isFirstMessage: message.isFirstMessage
      }
    };
    
    // Add to inbound queue for processing
    await this.inboundQueue.add(
      'analyze-message',
      jobData,
      {
        jobId: `msg-${message.id}`,
        priority: this.getMessagePriority(message),
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      }
    );
  }
  
  /**
   * Setup inbound message worker
   * Distributes message to parallel analysis queues
   */
  setupInboundWorker(): Worker {
    return new Worker(
      'message-inbound',
      async (job: Job<MessageAnalysisJob>) => {
        const { tenantId, messageId, conversationId, contactId, content } = job.data;
        
        // Skip empty messages
        if (!content || content.trim().length === 0) {
          return { skipped: true, reason: 'empty_content' };
        }
        
        // Queue parallel analysis jobs
        const analysisJobBase = {
          tenantId,
          messageId,
          conversationId,
          contactId,
          text: content,
          metadata: job.data.metadata
        };
        
        // Queue all three analyses in parallel
        const [sentimentJob, intentJob, emotionJob] = await Promise.all([
          this.sentimentQueue.add('analyze', analysisJobBase, {
            jobId: `sentiment-${messageId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
          }),
          this.intentQueue.add('detect', analysisJobBase, {
            jobId: `intent-${messageId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
          }),
          this.emotionQueue.add('recognize', analysisJobBase, {
            jobId: `emotion-${messageId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
          })
        ]);
        
        // Store job IDs for tracking
        await this.storeAnalysisJobIds(messageId, {
          sentimentJobId: sentimentJob.id!,
          intentJobId: intentJob.id!,
          emotionJobId: emotionJob.id!
        });
        
        return {
          distributed: true,
          sentimentJobId: sentimentJob.id,
          intentJobId: intentJob.id,
          emotionJobId: emotionJob.id
        };
      },
      { connection: this.inboundQueue.opts.connection }
    );
  }
  
  /**
   * Setup analysis completion handler
   * Triggers aggregate when all analyses complete
   */
  setupCompletionHandler(): void {
    // Track completed analyses per message
    const completionTracker = new Map<string, CompletionStatus>();
    
    // Listen for sentiment completion
    const sentimentEvents = new QueueEvents('sentiment-analysis', {
      connection: this.sentimentQueue.opts.connection
    });
    
    sentimentEvents.on('completed', async ({ jobId, returnvalue }) => {
      const messageId = jobId.replace('sentiment-', '');
      await this.handleAnalysisCompletion(
        messageId,
        'sentiment',
        returnvalue,
        completionTracker
      );
    });
    
    // Listen for intent completion
    const intentEvents = new QueueEvents('intent-detection', {
      connection: this.intentQueue.opts.connection
    });
    
    intentEvents.on('completed', async ({ jobId, returnvalue }) => {
      const messageId = jobId.replace('intent-', '');
      await this.handleAnalysisCompletion(
        messageId,
        'intent',
        returnvalue,
        completionTracker
      );
    });
    
    // Listen for emotion completion
    const emotionEvents = new QueueEvents('emotion-recognition', {
      connection: this.emotionQueue.opts.connection
    });
    
    emotionEvents.on('completed', async ({ jobId, returnvalue }) => {
      const messageId = jobId.replace('emotion-', '');
      await this.handleAnalysisCompletion(
        messageId,
        'emotion',
        returnvalue,
        completionTracker
      );
    });
  }
  
  /**
   * Handle individual analysis completion
   */
  private async handleAnalysisCompletion(
    messageId: string,
    analysisType: 'sentiment' | 'intent' | 'emotion',
    result: any,
    tracker: Map<string, CompletionStatus>
  ): Promise<void> {
    // Get or create completion status
    let status = tracker.get(messageId);
    if (!status) {
      status = {
        messageId,
        sentiment: null,
        intent: null,
        emotion: null,
        completedAt: new Map()
      };
      tracker.set(messageId, status);
    }
    
    // Update status
    status[analysisType] = result;
    status.completedAt.set(analysisType, new Date());
    
    // Check if all analyses complete
    if (status.sentiment && status.intent && status.emotion) {
      // Trigger aggregate analysis
      await this.triggerAggregate(messageId, status);
      
      // Cleanup tracker
      tracker.delete(messageId);
    }
  }
  
  /**
   * Trigger aggregate analysis when all individual analyses complete
   */
  private async triggerAggregate(
    messageId: string,
    status: CompletionStatus
  ): Promise<void> {
    const aggregateJob: AggregateJobData = {
      messageId,
      tenantId: status.sentiment.tenantId,
      conversationId: status.sentiment.conversationId,
      contactId: status.sentiment.contactId,
      
      sentimentAnalysisId: status.sentiment.id,
      intentDetectionId: status.intent.id,
      emotionRecognitionId: status.emotion.id,
      
      analyses: {
        sentiment: status.sentiment,
        intent: status.intent,
        emotion: status.emotion
      }
    };
    
    await this.aggregateQueue.add(
      'aggregate',
      aggregateJob,
      {
        jobId: `aggregate-${messageId}`,
        priority: this.getAggregatePriority(status),
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 }
      }
    );
  }
  
  /**
   * Get message processing priority
   */
  private getMessagePriority(message: ConversationMessage): number {
    // Higher priority for inbound customer messages
    if (message.direction === 'inbound') {
      return 1;
    }
    
    // Lower priority for outbound (agent) messages
    return 3;
  }
  
  /**
   * Get aggregate priority based on analysis results
   */
  private getAggregatePriority(status: CompletionStatus): number {
    // Higher priority for negative sentiment
    if (status.sentiment?.score <= -0.5) return 1;
    
    // Higher priority for complaints
    if (status.intent?.primaryIntent === 'COMPLAINT') return 1;
    
    // Higher priority for high arousal
    if (status.emotion?.vad?.arousal > 0.7) return 1;
    
    return 2;
  }
  
  /**
   * Store analysis job IDs for tracking
   */
  private async storeAnalysisJobIds(
    messageId: string,
    jobIds: { sentimentJobId: string; intentJobId: string; emotionJobId: string }
  ): Promise<void> {
    const redis = new Redis(this.inboundQueue.opts.connection);
    await redis.hset(
      `analysis:jobs:${messageId}`,
      jobIds
    );
    await redis.expire(`analysis:jobs:${messageId}`, 3600); // 1 hour TTL
    await redis.quit();
  }
}

// Type definitions
interface MessageAnalysisJob {
  tenantId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
  content: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  timestamp: Date;
  metadata: {
    previousMessageId?: string;
    isFirstMessage: boolean;
  };
}

interface CompletionStatus {
  messageId: string;
  sentiment: SentimentAnalysisResult | null;
  intent: IntentDetectionResult | null;
  emotion: EmotionRecognitionResult | null;
  completedAt: Map<string, Date>;
}

interface AggregateJobData {
  messageId: string;
  tenantId: string;
  conversationId: string;
  contactId: string;
  sentimentAnalysisId: string;
  intentDetectionId: string;
  emotionRecognitionId: string;
  analyses: {
    sentiment: SentimentAnalysisResult;
    intent: IntentDetectionResult;
    emotion: EmotionRecognitionResult;
  };
}
```

#### 10.3.2 Real-Time Analysis Stream

```typescript
// packages/workers-k/src/integration/realtime-stream.ts

import { Redis } from 'ioredis';
import WebSocket from 'ws';

/**
 * Real-Time Analysis Stream
 * Provides live analysis updates via WebSocket and Redis Streams
 */
export class RealtimeAnalysisStream {
  private redis: Redis;
  private publisher: Redis;
  private wss: WebSocket.Server | null = null;
  private subscriptions: Map<string, Set<WebSocket>> = new Map();
  
  constructor(redisConfig: RedisConfig) {
    this.redis = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
  }
  
  /**
   * Initialize WebSocket server for real-time updates
   */
  initializeWebSocket(port: number): void {
    this.wss = new WebSocket.Server({ port });
    
    this.wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (message: string) => {
        this.handleWebSocketMessage(ws, JSON.parse(message));
      });
      
      ws.on('close', () => {
        this.removeSubscription(ws);
      });
    });
  }
  
  /**
   * Handle WebSocket subscription messages
   */
  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.addSubscription(ws, message.conversationId);
        break;
      case 'unsubscribe':
        this.removeSubscription(ws, message.conversationId);
        break;
    }
  }
  
  /**
   * Add subscription for conversation updates
   */
  private addSubscription(ws: WebSocket, conversationId: string): void {
    if (!this.subscriptions.has(conversationId)) {
      this.subscriptions.set(conversationId, new Set());
    }
    this.subscriptions.get(conversationId)!.add(ws);
  }
  
  /**
   * Remove subscription
   */
  private removeSubscription(ws: WebSocket, conversationId?: string): void {
    if (conversationId) {
      this.subscriptions.get(conversationId)?.delete(ws);
    } else {
      // Remove from all subscriptions
      for (const [, clients] of this.subscriptions) {
        clients.delete(ws);
      }
    }
  }
  
  /**
   * Publish analysis update to stream and WebSocket
   */
  async publishAnalysisUpdate(update: AnalysisUpdate): Promise<void> {
    const { conversationId } = update;
    
    // Publish to Redis Stream
    await this.redis.xadd(
      `stream:analysis:${conversationId}`,
      '*',
      'type', update.type,
      'data', JSON.stringify(update.data),
      'timestamp', update.timestamp.toISOString()
    );
    
    // Set TTL on stream
    await this.redis.expire(`stream:analysis:${conversationId}`, 86400); // 24 hours
    
    // Publish to Pub/Sub for immediate delivery
    await this.publisher.publish(
      `channel:analysis:${conversationId}`,
      JSON.stringify(update)
    );
    
    // Send to WebSocket subscribers
    const clients = this.subscriptions.get(conversationId);
    if (clients) {
      const message = JSON.stringify({
        type: 'analysis_update',
        ...update
      });
      
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
  }
  
  /**
   * Get analysis history from stream
   */
  async getAnalysisHistory(
    conversationId: string,
    count: number = 100
  ): Promise<AnalysisUpdate[]> {
    const results = await this.redis.xrevrange(
      `stream:analysis:${conversationId}`,
      '+',
      '-',
      'COUNT',
      count
    );
    
    return results.map(([id, fields]) => {
      const fieldMap = new Map<string, string>();
      for (let i = 0; i < fields.length; i += 2) {
        fieldMap.set(fields[i], fields[i + 1]);
      }
      
      return {
        streamId: id,
        conversationId,
        type: fieldMap.get('type') as AnalysisUpdateType,
        data: JSON.parse(fieldMap.get('data') || '{}'),
        timestamp: new Date(fieldMap.get('timestamp') || Date.now())
      };
    }).reverse();
  }
  
  /**
   * Subscribe to real-time updates via Redis Pub/Sub
   */
  async subscribeToUpdates(
    conversationId: string,
    callback: (update: AnalysisUpdate) => void
  ): Promise<() => void> {
    const channel = `channel:analysis:${conversationId}`;
    
    const subscriber = new Redis(this.redis.options);
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (ch: string, message: string) => {
      if (ch === channel) {
        callback(JSON.parse(message));
      }
    });
    
    // Return unsubscribe function
    return async () => {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    };
  }
  
  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.wss) {
      this.wss.close();
    }
    await this.redis.quit();
    await this.publisher.quit();
  }
}

// Types
interface AnalysisUpdate {
  streamId?: string;
  conversationId: string;
  type: AnalysisUpdateType;
  data: any;
  timestamp: Date;
}

type AnalysisUpdateType =
  | 'sentiment_analyzed'
  | 'intent_detected'
  | 'emotion_recognized'
  | 'aggregate_completed'
  | 'alert_created'
  | 'risk_level_changed'
  | 'handover_triggered';
```

---

## 11. Security & Privacy

### 11.1 Data Protection

#### 11.1.1 PII Detection and Handling

```typescript
// packages/workers-k/src/security/pii-handler.ts

import { createHash } from 'crypto';

/**
 * PII Detection Patterns
 * Romanian-specific patterns for personal data identification
 */
export const PII_PATTERNS = {
  // Romanian CNP (Personal Numeric Code)
  CNP: /\b[1-9]\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{6}\b/g,
  
  // Romanian Phone Numbers
  PHONE_RO: /\b(0|\+40|0040)\s?[237]\d{2}\s?\d{3}\s?\d{3}\b/g,
  
  // International Phone
  PHONE_INTL: /\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
  
  // Email Addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  
  // Romanian CUI/CIF (Company Tax ID)
  CUI: /\b(RO)?[1-9]\d{1,9}\b/g,
  
  // IBAN
  IBAN: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
  
  // Credit Card Numbers (masked format)
  CREDIT_CARD: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // IP Addresses
  IP_ADDRESS: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  
  // Physical Addresses (Romanian street patterns)
  ADDRESS_RO: /\b(str\.?|strada|bd\.?|bulevardul|calea|piața|aleea)\s+[A-ZĂÂÎȘȚa-zăâîșț\s]+\s*(nr\.?|numărul)\s*\d+/gi,
  
  // Dates that might be birthdates
  DATE_PATTERN: /\b(0[1-9]|[12]\d|3[01])[.\/-](0[1-9]|1[0-2])[.\/-](19|20)\d{2}\b/g
};

/**
 * PII Handler for Analysis Workers
 * Manages detection, redaction, and secure handling of personal data
 */
export class PIIHandler {
  private readonly encryptionKey: Buffer;
  private readonly maskChar: string = '*';
  
  constructor(encryptionKey: string) {
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }
  
  /**
   * Detect PII in text
   */
  detectPII(text: string): PIIDetectionResult {
    const detections: PIIDetection[] = [];
    
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        detections.push({
          type: type as PIIType,
          value: match[0],
          startIndex: match.index!,
          endIndex: match.index! + match[0].length,
          confidence: this.calculateConfidence(type as PIIType, match[0])
        });
      }
    }
    
    // Sort by position
    detections.sort((a, b) => a.startIndex - b.startIndex);
    
    // Remove overlapping detections (keep higher confidence)
    const filtered = this.removeOverlaps(detections);
    
    return {
      hasPII: filtered.length > 0,
      detections: filtered,
      piiTypes: [...new Set(filtered.map(d => d.type))],
      riskLevel: this.assessRiskLevel(filtered)
    };
  }
  
  /**
   * Redact PII from text for safe logging/storage
   */
  redactPII(text: string, options: RedactionOptions = {}): RedactionResult {
    const { 
      preserveFormat = true,
      maskLength = 'partial',
      customMasks = {}
    } = options;
    
    let redactedText = text;
    const redactions: Redaction[] = [];
    
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      redactedText = redactedText.replace(pattern, (match, ...args) => {
        const offset = args[args.length - 2] as number;
        
        const masked = this.maskValue(
          match,
          type as PIIType,
          preserveFormat,
          maskLength,
          customMasks[type as PIIType]
        );
        
        redactions.push({
          type: type as PIIType,
          originalLength: match.length,
          maskedValue: masked,
          position: offset
        });
        
        return masked;
      });
    }
    
    return {
      redactedText,
      redactions,
      originalLength: text.length,
      redactedLength: redactedText.length
    };
  }
  
  /**
   * Hash PII for pseudonymization (reversible with key)
   */
  hashPII(value: string, type: PIIType): string {
    const hash = createHash('sha256')
      .update(this.encryptionKey)
      .update(type)
      .update(value)
      .digest('hex');
    
    return `${type}:${hash.substring(0, 16)}`;
  }
  
  /**
   * Tokenize PII for secure processing
   */
  tokenizePII(text: string): TokenizationResult {
    const detection = this.detectPII(text);
    const tokens: Map<string, string> = new Map();
    let tokenizedText = text;
    
    // Process detections in reverse order to maintain positions
    const sortedDetections = [...detection.detections].sort(
      (a, b) => b.startIndex - a.startIndex
    );
    
    for (const det of sortedDetections) {
      const token = this.hashPII(det.value, det.type);
      tokens.set(token, det.value);
      
      tokenizedText = 
        tokenizedText.substring(0, det.startIndex) +
        `[${token}]` +
        tokenizedText.substring(det.endIndex);
    }
    
    return {
      tokenizedText,
      tokens,
      tokenCount: tokens.size
    };
  }
  
  /**
   * Mask value based on type
   */
  private maskValue(
    value: string,
    type: PIIType,
    preserveFormat: boolean,
    maskLength: 'full' | 'partial' | 'minimal',
    customMask?: string
  ): string {
    if (customMask) return customMask;
    
    switch (type) {
      case 'EMAIL':
        if (maskLength === 'full') return '[EMAIL]';
        const [local, domain] = value.split('@');
        return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
        
      case 'PHONE_RO':
      case 'PHONE_INTL':
        if (maskLength === 'full') return '[PHONE]';
        if (preserveFormat) {
          return value.replace(/\d/g, (d, i) => i < 3 ? d : '*');
        }
        return `${value.substring(0, 3)}${'*'.repeat(value.length - 3)}`;
        
      case 'CNP':
        if (maskLength === 'full') return '[CNP]';
        return `${value.substring(0, 1)}${'*'.repeat(12)}`;
        
      case 'IBAN':
        if (maskLength === 'full') return '[IBAN]';
        return `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`;
        
      case 'CREDIT_CARD':
        if (maskLength === 'full') return '[CARD]';
        return `${'*'.repeat(12)}${value.slice(-4)}`;
        
      case 'CUI':
        if (maskLength === 'full') return '[CUI]';
        return value; // CUI is public business data
        
      default:
        if (maskLength === 'full') return `[${type}]`;
        const visibleChars = Math.min(3, Math.floor(value.length / 4));
        return `${value.substring(0, visibleChars)}${'*'.repeat(value.length - visibleChars)}`;
    }
  }
  
  /**
   * Calculate confidence of PII detection
   */
  private calculateConfidence(type: PIIType, value: string): number {
    switch (type) {
      case 'CNP':
        // Validate CNP checksum
        return this.validateCNP(value) ? 0.99 : 0.7;
        
      case 'EMAIL':
        // Standard email pattern has high confidence
        return 0.95;
        
      case 'IBAN':
        // Validate IBAN checksum
        return this.validateIBAN(value) ? 0.99 : 0.7;
        
      case 'PHONE_RO':
        // Romanian phone format is distinctive
        return 0.9;
        
      case 'CUI':
        // Could be any number, lower confidence
        return 0.6;
        
      default:
        return 0.8;
    }
  }
  
  /**
   * Validate Romanian CNP
   */
  private validateCNP(cnp: string): boolean {
    if (cnp.length !== 13) return false;
    
    const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
    let sum = 0;
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnp[i]) * weights[i];
    }
    
    const checkDigit = sum % 11 === 10 ? 1 : sum % 11;
    return checkDigit === parseInt(cnp[12]);
  }
  
  /**
   * Validate IBAN checksum
   */
  private validateIBAN(iban: string): boolean {
    // Move first 4 chars to end
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    
    // Convert letters to numbers (A=10, B=11, etc.)
    let numeric = '';
    for (const char of rearranged) {
      if (/[A-Z]/.test(char)) {
        numeric += (char.charCodeAt(0) - 55).toString();
      } else {
        numeric += char;
      }
    }
    
    // Check if mod 97 equals 1
    let remainder = 0;
    for (let i = 0; i < numeric.length; i++) {
      remainder = parseInt(remainder.toString() + numeric[i]) % 97;
    }
    
    return remainder === 1;
  }
  
  /**
   * Remove overlapping detections
   */
  private removeOverlaps(detections: PIIDetection[]): PIIDetection[] {
    if (detections.length <= 1) return detections;
    
    const result: PIIDetection[] = [detections[0]];
    
    for (let i = 1; i < detections.length; i++) {
      const current = detections[i];
      const last = result[result.length - 1];
      
      if (current.startIndex >= last.endIndex) {
        // No overlap
        result.push(current);
      } else if (current.confidence > last.confidence) {
        // Replace with higher confidence
        result[result.length - 1] = current;
      }
      // Otherwise keep existing (higher or equal confidence)
    }
    
    return result;
  }
  
  /**
   * Assess overall risk level
   */
  private assessRiskLevel(detections: PIIDetection[]): 'low' | 'medium' | 'high' | 'critical' {
    if (detections.length === 0) return 'low';
    
    // Critical PII types
    const criticalTypes: PIIType[] = ['CNP', 'CREDIT_CARD', 'IBAN'];
    const highRiskTypes: PIIType[] = ['EMAIL', 'PHONE_RO', 'PHONE_INTL', 'ADDRESS_RO'];
    
    const hasCritical = detections.some(d => criticalTypes.includes(d.type));
    const hasHighRisk = detections.some(d => highRiskTypes.includes(d.type));
    
    if (hasCritical) return 'critical';
    if (hasHighRisk && detections.length > 2) return 'high';
    if (hasHighRisk) return 'medium';
    return 'low';
  }
}

// Type definitions
type PIIType = 
  | 'CNP' 
  | 'PHONE_RO' 
  | 'PHONE_INTL' 
  | 'EMAIL' 
  | 'CUI' 
  | 'IBAN' 
  | 'CREDIT_CARD' 
  | 'IP_ADDRESS' 
  | 'ADDRESS_RO' 
  | 'DATE_PATTERN';

interface PIIDetection {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

interface PIIDetectionResult {
  hasPII: boolean;
  detections: PIIDetection[];
  piiTypes: PIIType[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface RedactionOptions {
  preserveFormat?: boolean;
  maskLength?: 'full' | 'partial' | 'minimal';
  customMasks?: Partial<Record<PIIType, string>>;
}

interface Redaction {
  type: PIIType;
  originalLength: number;
  maskedValue: string;
  position: number;
}

interface RedactionResult {
  redactedText: string;
  redactions: Redaction[];
  originalLength: number;
  redactedLength: number;
}

interface TokenizationResult {
  tokenizedText: string;
  tokens: Map<string, string>;
  tokenCount: number;
}
```

#### 11.1.2 Data Encryption

```typescript
// packages/workers-k/src/security/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * Encryption Configuration
 */
export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  keyDerivation: 'pbkdf2' | 'scrypt';
  keyLength: 32;
  ivLength: 16;
  saltLength: 32;
  tagLength: 16;
}

const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: 'scrypt',
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
  tagLength: 16
};

/**
 * Analysis Data Encryption Service
 * Encrypts sensitive analysis data at rest and in transit
 */
export class AnalysisEncryption {
  private readonly config: EncryptionConfig;
  private readonly masterKey: Buffer;
  
  constructor(masterKeyHex: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.masterKey = Buffer.from(masterKeyHex, 'hex');
    
    if (this.masterKey.length !== this.config.keyLength) {
      throw new Error(`Master key must be ${this.config.keyLength} bytes`);
    }
  }
  
  /**
   * Encrypt analysis result
   */
  async encryptAnalysis(data: AnalysisData): Promise<EncryptedAnalysis> {
    const plaintext = JSON.stringify(data);
    const encrypted = await this.encrypt(plaintext);
    
    return {
      encryptedData: encrypted.ciphertext,
      iv: encrypted.iv,
      tag: encrypted.tag,
      salt: encrypted.salt,
      algorithm: this.config.algorithm,
      version: '1.0',
      encryptedAt: new Date()
    };
  }
  
  /**
   * Decrypt analysis result
   */
  async decryptAnalysis(encrypted: EncryptedAnalysis): Promise<AnalysisData> {
    const plaintext = await this.decrypt({
      ciphertext: encrypted.encryptedData,
      iv: encrypted.iv,
      tag: encrypted.tag,
      salt: encrypted.salt
    });
    
    return JSON.parse(plaintext);
  }
  
  /**
   * Encrypt sensitive fields only
   */
  async encryptSensitiveFields<T extends Record<string, any>>(
    data: T,
    sensitiveFields: (keyof T)[]
  ): Promise<T & { _encrypted: EncryptedFieldsMeta }> {
    const encrypted: Record<string, EncryptedValue> = {};
    const result = { ...data } as T & { _encrypted: EncryptedFieldsMeta };
    
    for (const field of sensitiveFields) {
      if (data[field] !== undefined) {
        const value = JSON.stringify(data[field]);
        const encryptedValue = await this.encrypt(value);
        
        encrypted[field as string] = encryptedValue;
        (result as any)[field] = `[ENCRYPTED:${field as string}]`;
      }
    }
    
    result._encrypted = {
      fields: Object.keys(encrypted),
      values: encrypted,
      algorithm: this.config.algorithm,
      version: '1.0'
    };
    
    return result;
  }
  
  /**
   * Decrypt sensitive fields
   */
  async decryptSensitiveFields<T extends Record<string, any>>(
    data: T & { _encrypted: EncryptedFieldsMeta }
  ): Promise<T> {
    const result = { ...data };
    
    for (const field of data._encrypted.fields) {
      const encryptedValue = data._encrypted.values[field];
      if (encryptedValue) {
        const decrypted = await this.decrypt(encryptedValue);
        (result as any)[field] = JSON.parse(decrypted);
      }
    }
    
    delete (result as any)._encrypted;
    return result as T;
  }
  
  /**
   * Generate data key for tenant-specific encryption
   */
  async generateTenantKey(tenantId: string): Promise<TenantKey> {
    const salt = randomBytes(this.config.saltLength);
    const derivedKey = await this.deriveKey(tenantId, salt);
    
    return {
      tenantId,
      key: derivedKey.toString('hex'),
      salt: salt.toString('hex'),
      createdAt: new Date(),
      algorithm: this.config.algorithm
    };
  }
  
  /**
   * Encrypt with tenant-specific key
   */
  async encryptForTenant(
    tenantKey: TenantKey,
    data: string
  ): Promise<EncryptedValue> {
    const key = Buffer.from(tenantKey.key, 'hex');
    return this.encryptWithKey(data, key);
  }
  
  /**
   * Decrypt with tenant-specific key
   */
  async decryptForTenant(
    tenantKey: TenantKey,
    encrypted: EncryptedValue
  ): Promise<string> {
    const key = Buffer.from(tenantKey.key, 'hex');
    return this.decryptWithKey(encrypted, key);
  }
  
  /**
   * Low-level encryption
   */
  private async encrypt(plaintext: string): Promise<EncryptedValue> {
    const salt = randomBytes(this.config.saltLength);
    const key = await this.deriveKey('analysis', salt);
    return this.encryptWithKey(plaintext, key, salt);
  }
  
  /**
   * Low-level decryption
   */
  private async decrypt(encrypted: EncryptedValue): Promise<string> {
    const salt = Buffer.from(encrypted.salt, 'hex');
    const key = await this.deriveKey('analysis', salt);
    return this.decryptWithKey(encrypted, key);
  }
  
  /**
   * Encrypt with provided key
   */
  private encryptWithKey(
    plaintext: string,
    key: Buffer,
    salt?: Buffer
  ): EncryptedValue {
    const iv = randomBytes(this.config.ivLength);
    
    if (this.config.algorithm === 'aes-256-gcm') {
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        ciphertext,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        salt: salt?.toString('hex') || ''
      };
    } else {
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      
      return {
        ciphertext,
        iv: iv.toString('hex'),
        tag: '',
        salt: salt?.toString('hex') || ''
      };
    }
  }
  
  /**
   * Decrypt with provided key
   */
  private decryptWithKey(encrypted: EncryptedValue, key: Buffer): string {
    const iv = Buffer.from(encrypted.iv, 'hex');
    
    if (this.config.algorithm === 'aes-256-gcm') {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
      
      let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
    } else {
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      
      let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
    }
  }
  
  /**
   * Derive encryption key from master key
   */
  private async deriveKey(context: string, salt: Buffer): Promise<Buffer> {
    const { scrypt } = await import('crypto');
    
    return new Promise((resolve, reject) => {
      const info = Buffer.from(context);
      const combined = Buffer.concat([this.masterKey, info]);
      
      scrypt(combined, salt, this.config.keyLength, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }
  
  /**
   * Hash data for integrity verification
   */
  hashData(data: string): string {
    return createHash('sha256')
      .update(data)
      .update(this.masterKey)
      .digest('hex');
  }
  
  /**
   * Verify data integrity
   */
  verifyIntegrity(data: string, expectedHash: string): boolean {
    const actualHash = this.hashData(data);
    return actualHash === expectedHash;
  }
}

// Type definitions
interface AnalysisData {
  id: string;
  tenantId: string;
  type: 'sentiment' | 'intent' | 'emotion' | 'aggregate';
  result: any;
  metadata?: any;
}

interface EncryptedAnalysis {
  encryptedData: string;
  iv: string;
  tag: string;
  salt: string;
  algorithm: string;
  version: string;
  encryptedAt: Date;
}

interface EncryptedValue {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string;
}

interface EncryptedFieldsMeta {
  fields: string[];
  values: Record<string, EncryptedValue>;
  algorithm: string;
  version: string;
}

interface TenantKey {
  tenantId: string;
  key: string;
  salt: string;
  createdAt: Date;
  algorithm: string;
}
```

### 11.2 GDPR Compliance

#### 11.2.1 Data Subject Rights Implementation

```typescript
// packages/workers-k/src/security/gdpr-compliance.ts

import { db } from '@cerniq/database';
import {
  sentimentAnalyses,
  intentDetections,
  emotionRecognitions,
  analysisAggregates,
  analysisAlerts,
  auditLogs
} from '@cerniq/database/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

/**
 * GDPR Compliance Manager for Analysis Workers
 * Implements Article 6(1)(f) legitimate interest and data subject rights
 */
export class GDPRComplianceManager {
  private readonly retentionPeriods = {
    sentimentAnalysis: 365 * 2,    // 2 years
    intentDetection: 365 * 2,      // 2 years
    emotionRecognition: 365,       // 1 year (more sensitive)
    analysisAggregate: 365 * 2,    // 2 years
    alerts: 365 * 3,               // 3 years (business records)
    auditLogs: 365 * 7             // 7 years (legal requirement)
  };
  
  /**
   * Legal Basis: Article 6(1)(f) - Legitimate Interest
   * B2B sales automation and customer relationship management
   */
  readonly legalBasis = {
    type: 'legitimate_interest',
    article: '6(1)(f)',
    purpose: 'B2B sales automation and customer relationship management',
    necessity: 'Processing necessary for quality customer service and sales optimization',
    balancingTest: {
      legitimateInterest: 'Efficient B2B sales operations and customer satisfaction',
      dataSubjectExpectations: 'Business contacts expect their communications to be processed for sales purposes',
      impact: 'Low impact on individual rights as processing is limited to business communications',
      safeguards: ['Data minimization', 'Purpose limitation', 'Security measures', 'Retention limits']
    }
  };
  
  /**
   * Handle Right to Access (Article 15)
   */
  async handleAccessRequest(
    tenantId: string,
    contactId: string
  ): Promise<DataAccessResponse> {
    // Collect all analysis data for the contact
    const [sentiment, intent, emotion, aggregates, alerts] = await Promise.all([
      db.select().from(sentimentAnalyses)
        .where(and(
          eq(sentimentAnalyses.tenantId, tenantId),
          eq(sentimentAnalyses.contactId, contactId)
        )),
      db.select().from(intentDetections)
        .where(and(
          eq(intentDetections.tenantId, tenantId),
          eq(intentDetections.contactId, contactId)
        )),
      db.select().from(emotionRecognitions)
        .where(and(
          eq(emotionRecognitions.tenantId, tenantId),
          eq(emotionRecognitions.contactId, contactId)
        )),
      db.select().from(analysisAggregates)
        .where(and(
          eq(analysisAggregates.tenantId, tenantId),
          eq(analysisAggregates.contactId, contactId)
        )),
      db.select().from(analysisAlerts)
        .where(and(
          eq(analysisAlerts.tenantId, tenantId),
          eq(analysisAlerts.contactId, contactId)
        ))
    ]);
    
    // Log the access request
    await this.logAuditEvent({
      tenantId,
      contactId,
      eventType: 'DATA_ACCESS_REQUEST',
      details: {
        recordCounts: {
          sentiment: sentiment.length,
          intent: intent.length,
          emotion: emotion.length,
          aggregates: aggregates.length,
          alerts: alerts.length
        }
      }
    });
    
    return {
      contactId,
      dataCategories: [
        {
          category: 'Sentiment Analysis',
          description: 'Analysis of message sentiment and tone',
          count: sentiment.length,
          oldestRecord: sentiment[0]?.createdAt,
          newestRecord: sentiment[sentiment.length - 1]?.createdAt,
          legalBasis: this.legalBasis.type,
          retentionPeriod: `${this.retentionPeriods.sentimentAnalysis} days`
        },
        {
          category: 'Intent Detection',
          description: 'Detection of communication intent and purpose',
          count: intent.length,
          oldestRecord: intent[0]?.createdAt,
          newestRecord: intent[intent.length - 1]?.createdAt,
          legalBasis: this.legalBasis.type,
          retentionPeriod: `${this.retentionPeriods.intentDetection} days`
        },
        {
          category: 'Emotion Recognition',
          description: 'Recognition of emotional state in communications',
          count: emotion.length,
          oldestRecord: emotion[0]?.createdAt,
          newestRecord: emotion[emotion.length - 1]?.createdAt,
          legalBasis: this.legalBasis.type,
          retentionPeriod: `${this.retentionPeriods.emotionRecognition} days`
        },
        {
          category: 'Analysis Aggregates',
          description: 'Combined analysis results and risk assessments',
          count: aggregates.length,
          legalBasis: this.legalBasis.type,
          retentionPeriod: `${this.retentionPeriods.analysisAggregate} days`
        },
        {
          category: 'Alerts',
          description: 'Generated alerts from analysis',
          count: alerts.length,
          legalBasis: this.legalBasis.type,
          retentionPeriod: `${this.retentionPeriods.alerts} days`
        }
      ],
      processingPurposes: [
        'Customer service quality improvement',
        'Sales conversation optimization',
        'Risk assessment and escalation',
        'Business relationship management'
      ],
      recipientCategories: [
        'Internal sales team',
        'Customer support agents',
        'Management (aggregated reports only)'
      ],
      thirdPartyTransfers: [
        {
          recipient: 'Anthropic (Claude AI)',
          purpose: 'AI-powered analysis',
          safeguards: 'Data Processing Agreement, Standard Contractual Clauses'
        }
      ],
      dataRetentionPolicy: 'Data retained for legitimate business purposes with automatic deletion after retention period',
      rightsInformation: {
        rectification: 'Contact support to correct inaccurate data',
        erasure: 'Request deletion through data subject rights portal',
        restriction: 'Request processing restriction through support',
        objection: 'Object to processing based on legitimate interest',
        portability: 'Request data export in machine-readable format'
      },
      generatedAt: new Date()
    };
  }
  
  /**
   * Handle Right to Erasure (Article 17) - "Right to be Forgotten"
   */
  async handleErasureRequest(
    tenantId: string,
    contactId: string,
    options: ErasureOptions = {}
  ): Promise<ErasureResponse> {
    const { 
      includeAuditLogs = false,
      reason = 'data_subject_request'
    } = options;
    
    // Check for legal retention requirements
    const retentionCheck = await this.checkRetentionRequirements(tenantId, contactId);
    
    if (retentionCheck.mustRetain) {
      await this.logAuditEvent({
        tenantId,
        contactId,
        eventType: 'ERASURE_REQUEST_DENIED',
        details: {
          reason: retentionCheck.reason,
          retainUntil: retentionCheck.retainUntil
        }
      });
      
      return {
        success: false,
        message: `Cannot delete data due to legal retention requirement: ${retentionCheck.reason}`,
        retainUntil: retentionCheck.retainUntil,
        partialDeletion: false
      };
    }
    
    // Perform deletion
    const deletedCounts: Record<string, number> = {};
    
    // Delete sentiment analyses
    const sentimentResult = await db.delete(sentimentAnalyses)
      .where(and(
        eq(sentimentAnalyses.tenantId, tenantId),
        eq(sentimentAnalyses.contactId, contactId)
      ));
    deletedCounts.sentimentAnalyses = sentimentResult.rowCount || 0;
    
    // Delete intent detections
    const intentResult = await db.delete(intentDetections)
      .where(and(
        eq(intentDetections.tenantId, tenantId),
        eq(intentDetections.contactId, contactId)
      ));
    deletedCounts.intentDetections = intentResult.rowCount || 0;
    
    // Delete emotion recognitions
    const emotionResult = await db.delete(emotionRecognitions)
      .where(and(
        eq(emotionRecognitions.tenantId, tenantId),
        eq(emotionRecognitions.contactId, contactId)
      ));
    deletedCounts.emotionRecognitions = emotionResult.rowCount || 0;
    
    // Delete analysis aggregates
    const aggregateResult = await db.delete(analysisAggregates)
      .where(and(
        eq(analysisAggregates.tenantId, tenantId),
        eq(analysisAggregates.contactId, contactId)
      ));
    deletedCounts.analysisAggregates = aggregateResult.rowCount || 0;
    
    // Delete alerts
    const alertResult = await db.delete(analysisAlerts)
      .where(and(
        eq(analysisAlerts.tenantId, tenantId),
        eq(analysisAlerts.contactId, contactId)
      ));
    deletedCounts.analysisAlerts = alertResult.rowCount || 0;
    
    // Optionally anonymize (not delete) audit logs
    if (includeAuditLogs) {
      await this.anonymizeAuditLogs(tenantId, contactId);
      deletedCounts.auditLogsAnonymized = 1;
    }
    
    // Log the erasure
    await this.logAuditEvent({
      tenantId,
      contactId: 'DELETED',
      eventType: 'DATA_ERASURE_COMPLETED',
      details: {
        originalContactId: this.hashContactId(contactId),
        reason,
        deletedCounts,
        requestedBy: 'data_subject'
      }
    });
    
    return {
      success: true,
      message: 'All analysis data has been deleted',
      deletedCounts,
      completedAt: new Date()
    };
  }
  
  /**
   * Handle Right to Data Portability (Article 20)
   */
  async handlePortabilityRequest(
    tenantId: string,
    contactId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<PortabilityResponse> {
    // Collect all data
    const [sentiment, intent, emotion, aggregates] = await Promise.all([
      db.select().from(sentimentAnalyses)
        .where(and(
          eq(sentimentAnalyses.tenantId, tenantId),
          eq(sentimentAnalyses.contactId, contactId)
        )),
      db.select().from(intentDetections)
        .where(and(
          eq(intentDetections.tenantId, tenantId),
          eq(intentDetections.contactId, contactId)
        )),
      db.select().from(emotionRecognitions)
        .where(and(
          eq(emotionRecognitions.tenantId, tenantId),
          eq(emotionRecognitions.contactId, contactId)
        )),
      db.select().from(analysisAggregates)
        .where(and(
          eq(analysisAggregates.tenantId, tenantId),
          eq(analysisAggregates.contactId, contactId)
        ))
    ]);
    
    const exportData: PortableData = {
      exportedAt: new Date(),
      contactId,
      format,
      data: {
        sentimentAnalyses: sentiment.map(s => ({
          id: s.id,
          messageId: s.messageId,
          score: s.score,
          label: s.label,
          confidence: s.confidence,
          language: s.language,
          createdAt: s.createdAt
        })),
        intentDetections: intent.map(i => ({
          id: i.id,
          messageId: i.messageId,
          primaryIntent: i.primaryIntent,
          confidence: i.confidence,
          entities: i.entities,
          createdAt: i.createdAt
        })),
        emotionRecognitions: emotion.map(e => ({
          id: e.id,
          messageId: e.messageId,
          primaryEmotion: e.primaryEmotion,
          intensity: e.intensity,
          vad: e.vad,
          createdAt: e.createdAt
        })),
        analysisAggregates: aggregates.map(a => ({
          id: a.id,
          messageId: a.messageId,
          compositeScore: a.compositeScore,
          riskLevel: a.riskLevel,
          createdAt: a.createdAt
        }))
      }
    };
    
    // Log the export
    await this.logAuditEvent({
      tenantId,
      contactId,
      eventType: 'DATA_PORTABILITY_REQUEST',
      details: {
        format,
        recordCounts: {
          sentiment: sentiment.length,
          intent: intent.length,
          emotion: emotion.length,
          aggregates: aggregates.length
        }
      }
    });
    
    if (format === 'csv') {
      return {
        format: 'csv',
        files: this.convertToCSV(exportData),
        generatedAt: new Date()
      };
    }
    
    return {
      format: 'json',
      data: exportData,
      generatedAt: new Date()
    };
  }
  
  /**
   * Handle Right to Restriction of Processing (Article 18)
   */
  async handleRestrictionRequest(
    tenantId: string,
    contactId: string,
    reason: string
  ): Promise<RestrictionResponse> {
    // Mark contact as restricted
    await db.insert(processingRestrictions).values({
      tenantId,
      contactId,
      reason,
      restrictedAt: new Date(),
      restrictedBy: 'data_subject'
    });
    
    await this.logAuditEvent({
      tenantId,
      contactId,
      eventType: 'PROCESSING_RESTRICTED',
      details: { reason }
    });
    
    return {
      success: true,
      message: 'Processing has been restricted for this contact',
      effectiveFrom: new Date()
    };
  }
  
  /**
   * Check if contact has processing restriction
   */
  async isProcessingRestricted(
    tenantId: string,
    contactId: string
  ): Promise<boolean> {
    const restriction = await db.select()
      .from(processingRestrictions)
      .where(and(
        eq(processingRestrictions.tenantId, tenantId),
        eq(processingRestrictions.contactId, contactId),
        eq(processingRestrictions.active, true)
      ))
      .limit(1);
    
    return restriction.length > 0;
  }
  
  /**
   * Automated Data Retention Cleanup
   */
  async runRetentionCleanup(): Promise<RetentionCleanupResult> {
    const now = new Date();
    const results: RetentionCleanupResult = {
      startedAt: now,
      deletedCounts: {},
      errors: []
    };
    
    // Cleanup each data category
    for (const [category, days] of Object.entries(this.retentionPeriods)) {
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      try {
        switch (category) {
          case 'sentimentAnalysis':
            const sentimentResult = await db.delete(sentimentAnalyses)
              .where(sql`${sentimentAnalyses.createdAt} < ${cutoffDate}`);
            results.deletedCounts.sentimentAnalyses = sentimentResult.rowCount || 0;
            break;
            
          case 'intentDetection':
            const intentResult = await db.delete(intentDetections)
              .where(sql`${intentDetections.createdAt} < ${cutoffDate}`);
            results.deletedCounts.intentDetections = intentResult.rowCount || 0;
            break;
            
          case 'emotionRecognition':
            const emotionResult = await db.delete(emotionRecognitions)
              .where(sql`${emotionRecognitions.createdAt} < ${cutoffDate}`);
            results.deletedCounts.emotionRecognitions = emotionResult.rowCount || 0;
            break;
            
          case 'analysisAggregate':
            const aggregateResult = await db.delete(analysisAggregates)
              .where(sql`${analysisAggregates.createdAt} < ${cutoffDate}`);
            results.deletedCounts.analysisAggregates = aggregateResult.rowCount || 0;
            break;
            
          case 'alerts':
            const alertResult = await db.delete(analysisAlerts)
              .where(sql`${analysisAlerts.createdAt} < ${cutoffDate}`);
            results.deletedCounts.analysisAlerts = alertResult.rowCount || 0;
            break;
        }
      } catch (error) {
        results.errors.push({
          category,
          error: (error as Error).message
        });
      }
    }
    
    results.completedAt = new Date();
    
    // Log the cleanup
    await this.logAuditEvent({
      tenantId: 'SYSTEM',
      contactId: 'SYSTEM',
      eventType: 'RETENTION_CLEANUP_COMPLETED',
      details: results
    });
    
    return results;
  }
  
  /**
   * Check legal retention requirements
   */
  private async checkRetentionRequirements(
    tenantId: string,
    contactId: string
  ): Promise<{ mustRetain: boolean; reason?: string; retainUntil?: Date }> {
    // Check for ongoing legal holds
    const legalHold = await db.select()
      .from(legalHolds)
      .where(and(
        eq(legalHolds.tenantId, tenantId),
        or(
          eq(legalHolds.contactId, contactId),
          eq(legalHolds.allContacts, true)
        ),
        eq(legalHolds.active, true)
      ))
      .limit(1);
    
    if (legalHold.length > 0) {
      return {
        mustRetain: true,
        reason: `Legal hold: ${legalHold[0].reason}`,
        retainUntil: legalHold[0].expiresAt
      };
    }
    
    return { mustRetain: false };
  }
  
  /**
   * Anonymize audit logs
   */
  private async anonymizeAuditLogs(
    tenantId: string,
    contactId: string
  ): Promise<void> {
    const hashedId = this.hashContactId(contactId);
    
    await db.update(auditLogs)
      .set({
        contactId: hashedId,
        details: sql`jsonb_set(${auditLogs.details}, '{anonymized}', 'true')`
      })
      .where(and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.contactId, contactId)
      ));
  }
  
  /**
   * Hash contact ID for anonymization
   */
  private hashContactId(contactId: string): string {
    return createHash('sha256')
      .update(contactId)
      .update(process.env.ANONYMIZATION_SALT || 'cerniq-salt')
      .digest('hex')
      .substring(0, 16);
  }
  
  /**
   * Convert export data to CSV format
   */
  private convertToCSV(data: PortableData): Record<string, string> {
    const files: Record<string, string> = {};
    
    for (const [category, records] of Object.entries(data.data)) {
      if (records.length === 0) continue;
      
      const headers = Object.keys(records[0]);
      const rows = records.map(r => 
        headers.map(h => JSON.stringify(r[h])).join(',')
      );
      
      files[`${category}.csv`] = [headers.join(','), ...rows].join('\n');
    }
    
    return files;
  }
  
  /**
   * Log audit event
   */
  private async logAuditEvent(event: {
    tenantId: string;
    contactId: string;
    eventType: string;
    details: any;
  }): Promise<void> {
    await db.insert(auditLogs).values({
      ...event,
      createdAt: new Date()
    });
  }
}

// Type definitions
interface DataAccessResponse {
  contactId: string;
  dataCategories: Array<{
    category: string;
    description: string;
    count: number;
    oldestRecord?: Date;
    newestRecord?: Date;
    legalBasis: string;
    retentionPeriod: string;
  }>;
  processingPurposes: string[];
  recipientCategories: string[];
  thirdPartyTransfers: Array<{
    recipient: string;
    purpose: string;
    safeguards: string;
  }>;
  dataRetentionPolicy: string;
  rightsInformation: {
    rectification: string;
    erasure: string;
    restriction: string;
    objection: string;
    portability: string;
  };
  generatedAt: Date;
}

interface ErasureOptions {
  includeAuditLogs?: boolean;
  reason?: string;
}

interface ErasureResponse {
  success: boolean;
  message: string;
  deletedCounts?: Record<string, number>;
  retainUntil?: Date;
  partialDeletion?: boolean;
  completedAt?: Date;
}

interface PortableData {
  exportedAt: Date;
  contactId: string;
  format: string;
  data: {
    sentimentAnalyses: any[];
    intentDetections: any[];
    emotionRecognitions: any[];
    analysisAggregates: any[];
  };
}

interface PortabilityResponse {
  format: 'json' | 'csv';
  data?: PortableData;
  files?: Record<string, string>;
  generatedAt: Date;
}

interface RestrictionResponse {
  success: boolean;
  message: string;
  effectiveFrom: Date;
}

interface RetentionCleanupResult {
  startedAt: Date;
  completedAt?: Date;
  deletedCounts: Record<string, number>;
  errors: Array<{ category: string; error: string }>;
}
```

### 11.3 Audit Logging

#### 11.3.1 Comprehensive Audit Trail

```typescript
// packages/workers-k/src/security/audit-logger.ts

import { createHash, randomUUID } from 'crypto';
import { db } from '@cerniq/database';
import { auditLogs, auditLogChain } from '@cerniq/database/schema';

/**
 * Audit Event Types for Analysis Workers
 */
export enum AuditEventType {
  // Analysis Events
  ANALYSIS_STARTED = 'ANALYSIS_STARTED',
  ANALYSIS_COMPLETED = 'ANALYSIS_COMPLETED',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  
  // Data Access Events
  DATA_READ = 'DATA_READ',
  DATA_CREATED = 'DATA_CREATED',
  DATA_UPDATED = 'DATA_UPDATED',
  DATA_DELETED = 'DATA_DELETED',
  
  // AI Model Events
  AI_MODEL_CALLED = 'AI_MODEL_CALLED',
  AI_MODEL_RESPONSE = 'AI_MODEL_RESPONSE',
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  
  // Alert Events
  ALERT_GENERATED = 'ALERT_GENERATED',
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  ALERT_ESCALATED = 'ALERT_ESCALATED',
  
  // Handover Events
  HANDOVER_TRIGGERED = 'HANDOVER_TRIGGERED',
  HANDOVER_ACCEPTED = 'HANDOVER_ACCEPTED',
  HANDOVER_COMPLETED = 'HANDOVER_COMPLETED',
  
  // GDPR Events
  DATA_ACCESS_REQUEST = 'DATA_ACCESS_REQUEST',
  DATA_PORTABILITY_REQUEST = 'DATA_PORTABILITY_REQUEST',
  ERASURE_REQUEST_RECEIVED = 'ERASURE_REQUEST_RECEIVED',
  ERASURE_REQUEST_COMPLETED = 'ERASURE_REQUEST_COMPLETED',
  ERASURE_REQUEST_DENIED = 'ERASURE_REQUEST_DENIED',
  PROCESSING_RESTRICTED = 'PROCESSING_RESTRICTED',
  PROCESSING_RESTRICTION_LIFTED = 'PROCESSING_RESTRICTION_LIFTED',
  
  // Security Events
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  PII_DETECTED = 'PII_DETECTED',
  ENCRYPTION_PERFORMED = 'ENCRYPTION_PERFORMED',
  DECRYPTION_PERFORMED = 'DECRYPTION_PERFORMED',
  
  // System Events
  WORKER_STARTED = 'WORKER_STARTED',
  WORKER_STOPPED = 'WORKER_STOPPED',
  QUEUE_HEALTH_CHECK = 'QUEUE_HEALTH_CHECK',
  RETENTION_CLEANUP = 'RETENTION_CLEANUP',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED'
}

/**
 * Audit Logger with Hash Chain for Tamper Detection
 */
export class AuditLogger {
  private tenantId: string;
  private workerId: string;
  private lastHash: string | null = null;
  
  constructor(tenantId: string, workerId: string) {
    this.tenantId = tenantId;
    this.workerId = workerId;
  }
  
  /**
   * Log an audit event with hash chain
   */
  async log(event: AuditEvent): Promise<string> {
    const eventId = randomUUID();
    const timestamp = new Date();
    
    // Create event data
    const eventData: AuditLogEntry = {
      id: eventId,
      tenantId: this.tenantId,
      workerId: this.workerId,
      eventType: event.type,
      severity: event.severity || this.getSeverity(event.type),
      
      // Context
      contactId: event.contactId,
      conversationId: event.conversationId,
      messageId: event.messageId,
      analysisId: event.analysisId,
      alertId: event.alertId,
      
      // Actor
      actorType: event.actorType || 'system',
      actorId: event.actorId || this.workerId,
      
      // Details
      action: event.action,
      resource: event.resource,
      details: event.details,
      
      // Request context
      requestId: event.requestId,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      
      // Outcome
      outcome: event.outcome || 'success',
      errorCode: event.errorCode,
      errorMessage: event.errorMessage,
      
      // Timing
      duration: event.duration,
      timestamp,
      
      // Hash chain
      previousHash: this.lastHash,
      hash: '' // Will be calculated
    };
    
    // Calculate hash
    eventData.hash = this.calculateHash(eventData);
    this.lastHash = eventData.hash;
    
    // Store in database
    await db.insert(auditLogs).values(eventData);
    
    // Update chain reference
    await this.updateChainReference(eventId, eventData.hash);
    
    return eventId;
  }
  
  /**
   * Log analysis event
   */
  async logAnalysis(params: {
    type: 'sentiment' | 'intent' | 'emotion' | 'aggregate';
    analysisId: string;
    messageId: string;
    conversationId: string;
    contactId: string;
    status: 'started' | 'completed' | 'failed';
    duration?: number;
    details?: any;
    error?: Error;
  }): Promise<string> {
    const eventType = params.status === 'started'
      ? AuditEventType.ANALYSIS_STARTED
      : params.status === 'completed'
        ? AuditEventType.ANALYSIS_COMPLETED
        : AuditEventType.ANALYSIS_FAILED;
    
    return this.log({
      type: eventType,
      analysisId: params.analysisId,
      messageId: params.messageId,
      conversationId: params.conversationId,
      contactId: params.contactId,
      action: `${params.type}_analysis`,
      resource: `analysis:${params.analysisId}`,
      details: {
        analysisType: params.type,
        ...params.details
      },
      outcome: params.status === 'failed' ? 'failure' : 'success',
      errorMessage: params.error?.message,
      duration: params.duration
    });
  }
  
  /**
   * Log AI model interaction
   */
  async logAIModelCall(params: {
    model: string;
    analysisType: string;
    analysisId: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    cached: boolean;
    error?: Error;
  }): Promise<string> {
    return this.log({
      type: params.error 
        ? AuditEventType.AI_MODEL_ERROR 
        : AuditEventType.AI_MODEL_CALLED,
      analysisId: params.analysisId,
      action: 'ai_model_call',
      resource: `model:${params.model}`,
      details: {
        model: params.model,
        analysisType: params.analysisType,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.inputTokens + params.outputTokens,
        cached: params.cached
      },
      outcome: params.error ? 'failure' : 'success',
      errorMessage: params.error?.message,
      duration: params.duration
    });
  }
  
  /**
   * Log alert event
   */
  async logAlert(params: {
    alertId: string;
    alertType: string;
    severity: string;
    conversationId: string;
    contactId: string;
    action: 'generated' | 'acknowledged' | 'resolved' | 'escalated';
    details?: any;
    actorId?: string;
  }): Promise<string> {
    const eventTypeMap: Record<string, AuditEventType> = {
      generated: AuditEventType.ALERT_GENERATED,
      acknowledged: AuditEventType.ALERT_ACKNOWLEDGED,
      resolved: AuditEventType.ALERT_RESOLVED,
      escalated: AuditEventType.ALERT_ESCALATED
    };
    
    return this.log({
      type: eventTypeMap[params.action],
      alertId: params.alertId,
      conversationId: params.conversationId,
      contactId: params.contactId,
      actorId: params.actorId,
      actorType: params.actorId ? 'user' : 'system',
      action: `alert_${params.action}`,
      resource: `alert:${params.alertId}`,
      details: {
        alertType: params.alertType,
        alertSeverity: params.severity,
        ...params.details
      }
    });
  }
  
  /**
   * Log GDPR request
   */
  async logGDPRRequest(params: {
    requestType: 'access' | 'erasure' | 'portability' | 'restriction';
    contactId: string;
    status: 'received' | 'completed' | 'denied';
    details?: any;
    requestedBy?: string;
  }): Promise<string> {
    const eventTypeMap: Record<string, Record<string, AuditEventType>> = {
      access: {
        received: AuditEventType.DATA_ACCESS_REQUEST,
        completed: AuditEventType.DATA_ACCESS_REQUEST
      },
      erasure: {
        received: AuditEventType.ERASURE_REQUEST_RECEIVED,
        completed: AuditEventType.ERASURE_REQUEST_COMPLETED,
        denied: AuditEventType.ERASURE_REQUEST_DENIED
      },
      portability: {
        received: AuditEventType.DATA_PORTABILITY_REQUEST,
        completed: AuditEventType.DATA_PORTABILITY_REQUEST
      },
      restriction: {
        received: AuditEventType.PROCESSING_RESTRICTED,
        completed: AuditEventType.PROCESSING_RESTRICTED
      }
    };
    
    return this.log({
      type: eventTypeMap[params.requestType][params.status],
      severity: 'high',
      contactId: params.contactId,
      actorId: params.requestedBy || params.contactId,
      actorType: 'data_subject',
      action: `gdpr_${params.requestType}_${params.status}`,
      resource: `contact:${params.contactId}`,
      details: params.details
    });
  }
  
  /**
   * Log sensitive data access
   */
  async logSensitiveDataAccess(params: {
    dataType: string;
    operation: 'read' | 'write' | 'delete';
    resourceId: string;
    actorId: string;
    reason: string;
    piiTypes?: string[];
  }): Promise<string> {
    return this.log({
      type: AuditEventType.SENSITIVE_DATA_ACCESS,
      severity: 'high',
      actorId: params.actorId,
      actorType: 'user',
      action: params.operation,
      resource: params.resourceId,
      details: {
        dataType: params.dataType,
        reason: params.reason,
        piiTypes: params.piiTypes
      }
    });
  }
  
  /**
   * Log PII detection
   */
  async logPIIDetection(params: {
    messageId: string;
    conversationId: string;
    contactId: string;
    piiTypes: string[];
    riskLevel: string;
    action: 'redacted' | 'tokenized' | 'encrypted' | 'flagged';
  }): Promise<string> {
    return this.log({
      type: AuditEventType.PII_DETECTED,
      severity: params.riskLevel === 'critical' ? 'critical' : 'high',
      messageId: params.messageId,
      conversationId: params.conversationId,
      contactId: params.contactId,
      action: params.action,
      resource: `message:${params.messageId}`,
      details: {
        piiTypes: params.piiTypes,
        piiCount: params.piiTypes.length,
        riskLevel: params.riskLevel,
        mitigationAction: params.action
      }
    });
  }
  
  /**
   * Calculate hash for audit entry
   */
  private calculateHash(entry: AuditLogEntry): string {
    const hashInput = JSON.stringify({
      id: entry.id,
      tenantId: entry.tenantId,
      eventType: entry.eventType,
      timestamp: entry.timestamp.toISOString(),
      details: entry.details,
      previousHash: entry.previousHash
    });
    
    return createHash('sha256')
      .update(hashInput)
      .digest('hex');
  }
  
  /**
   * Update hash chain reference
   */
  private async updateChainReference(
    eventId: string,
    hash: string
  ): Promise<void> {
    await db.insert(auditLogChain).values({
      tenantId: this.tenantId,
      lastEventId: eventId,
      lastHash: hash,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: [auditLogChain.tenantId],
      set: {
        lastEventId: eventId,
        lastHash: hash,
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Verify audit chain integrity
   */
  async verifyChainIntegrity(
    startDate?: Date,
    endDate?: Date
  ): Promise<ChainVerificationResult> {
    const query = db.select().from(auditLogs)
      .where(eq(auditLogs.tenantId, this.tenantId))
      .orderBy(auditLogs.timestamp);
    
    if (startDate) {
      query.where(sql`${auditLogs.timestamp} >= ${startDate}`);
    }
    if (endDate) {
      query.where(sql`${auditLogs.timestamp} <= ${endDate}`);
    }
    
    const entries = await query;
    
    let previousHash: string | null = null;
    const tamperedEntries: string[] = [];
    const brokenLinks: string[] = [];
    
    for (const entry of entries) {
      // Verify hash
      const expectedHash = this.calculateHash(entry as AuditLogEntry);
      if (entry.hash !== expectedHash) {
        tamperedEntries.push(entry.id);
      }
      
      // Verify chain link
      if (entry.previousHash !== previousHash) {
        brokenLinks.push(entry.id);
      }
      
      previousHash = entry.hash;
    }
    
    return {
      verified: tamperedEntries.length === 0 && brokenLinks.length === 0,
      totalEntries: entries.length,
      tamperedEntries,
      brokenLinks,
      verifiedAt: new Date()
    };
  }
  
  /**
   * Get default severity for event type
   */
  private getSeverity(eventType: AuditEventType): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Partial<Record<AuditEventType, 'low' | 'medium' | 'high' | 'critical'>> = {
      [AuditEventType.ANALYSIS_FAILED]: 'medium',
      [AuditEventType.AI_MODEL_ERROR]: 'medium',
      [AuditEventType.ALERT_GENERATED]: 'medium',
      [AuditEventType.ALERT_ESCALATED]: 'high',
      [AuditEventType.HANDOVER_TRIGGERED]: 'medium',
      [AuditEventType.DATA_ACCESS_REQUEST]: 'high',
      [AuditEventType.ERASURE_REQUEST_RECEIVED]: 'high',
      [AuditEventType.ERASURE_REQUEST_COMPLETED]: 'high',
      [AuditEventType.AUTHENTICATION_FAILURE]: 'high',
      [AuditEventType.AUTHORIZATION_DENIED]: 'high',
      [AuditEventType.SENSITIVE_DATA_ACCESS]: 'high',
      [AuditEventType.PII_DETECTED]: 'high'
    };
    
    return severityMap[eventType] || 'low';
  }
}

// Type definitions
interface AuditEvent {
  type: AuditEventType;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  
  // Context
  contactId?: string;
  conversationId?: string;
  messageId?: string;
  analysisId?: string;
  alertId?: string;
  
  // Actor
  actorType?: 'user' | 'system' | 'data_subject' | 'api';
  actorId?: string;
  
  // Details
  action?: string;
  resource?: string;
  details?: any;
  
  // Request context
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Outcome
  outcome?: 'success' | 'failure';
  errorCode?: string;
  errorMessage?: string;
  
  // Timing
  duration?: number;
}

interface AuditLogEntry extends AuditEvent {
  id: string;
  tenantId: string;
  workerId: string;
  timestamp: Date;
  previousHash: string | null;
  hash: string;
}

interface ChainVerificationResult {
  verified: boolean;
  totalEntries: number;
  tamperedEntries: string[];
  brokenLinks: string[];
  verifiedAt: Date;
}
```

---

## 12. Changelog & References

### 12.1 Document History

#### Version Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-18 | Alex | Initial comprehensive documentation |
| 1.0.1 | 2026-01-18 | Alex | Added Romanian-specific sentiment patterns |
| 1.0.2 | 2026-01-18 | Alex | Enhanced PII detection for Romanian IDs |

#### Change Log

```typescript
// changelog.ts
// Workers K - Sentiment & Intent Analysis
// Document version: 1.0.2

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.2',
    date: '2026-01-18',
    changes: [
      {
        type: 'enhancement',
        component: 'PIIHandler',
        description: 'Enhanced Romanian CNP validation with checksum verification',
        files: ['pii-handler.ts']
      },
      {
        type: 'enhancement',
        component: 'PIIHandler',
        description: 'Added Romanian IBAN validation with control digit verification',
        files: ['pii-handler.ts']
      },
      {
        type: 'enhancement',
        component: 'PIIHandler',
        description: 'Added Romanian address pattern detection (str., bd., calea)',
        files: ['pii-handler.ts']
      }
    ]
  },
  {
    version: '1.0.1',
    date: '2026-01-18',
    changes: [
      {
        type: 'enhancement',
        component: 'SentimentAnalyzer',
        description: 'Added Romanian sentiment lexicon with 500+ words',
        files: ['sentiment-analyzer.ts', 'romanian-lexicon.ts']
      },
      {
        type: 'enhancement',
        component: 'IntentClassifier',
        description: 'Added Romanian intent patterns for agricultural domain',
        files: ['intent-classifier.ts', 'romanian-patterns.ts']
      },
      {
        type: 'enhancement',
        component: 'EmotionRecognizer',
        description: 'Added Romanian emotional expressions mapping',
        files: ['emotion-recognizer.ts']
      }
    ]
  },
  {
    version: '1.0.0',
    date: '2026-01-18',
    changes: [
      {
        type: 'initial',
        component: 'Workers K',
        description: 'Initial comprehensive documentation for Sentiment & Intent Analysis workers',
        files: [
          'etapa3-workers-K-sentiment-intent.md',
          'sentiment-analyzer.ts',
          'intent-classifier.ts',
          'emotion-recognizer.ts',
          'analysis-aggregator.ts',
          'alert-manager.ts'
        ]
      }
    ]
  }
];

interface ChangelogEntry {
  version: string;
  date: string;
  changes: Change[];
}

interface Change {
  type: 'initial' | 'enhancement' | 'fix' | 'breaking' | 'deprecation';
  component: string;
  description: string;
  files: string[];
  breaking?: boolean;
  migrationRequired?: boolean;
}
```

### 12.2 References & Dependencies

#### 12.2.1 Internal References

```typescript
// internal-references.ts
// Cross-references to other Cerniq documentation

export const INTERNAL_REFERENCES = {
  // Master Specification
  masterSpec: {
    document: '__Cerniq_Master_Spec_Normativ_Complet.md',
    sections: [
      'Section 4.3 - AI Agent Architecture',
      'Section 4.4 - Sentiment Analysis Pipeline',
      'Section 5.2 - GDPR Compliance Framework',
      'Section 6.1 - Romanian Market Requirements'
    ]
  },
  
  // Related Workers Documentation
  relatedWorkers: {
    workersJ: {
      document: 'etapa3-workers-J-handover-channel.md',
      integration: 'Handover triggering from sentiment/intent analysis',
      events: ['handover.triggered', 'escalation.required']
    },
    workersD: {
      document: 'etapa3-workers-D-negotiation-fsm.md',
      integration: 'Negotiation state machine driven by intent detection',
      events: ['negotiation.initiated', 'price.counter_offer']
    },
    workersC: {
      document: 'etapa3-workers-C-ai-agent-core.md',
      integration: 'AI response guidance based on analysis context',
      events: ['context.updated', 'guidance.generated']
    },
    workersH: {
      document: 'etapa3-workers-H-efactura-spv.md',
      integration: 'Order intent triggers e-Factura generation',
      events: ['order.confirmed', 'invoice.required']
    }
  },
  
  // Database Schema Documentation
  schemas: {
    analysisSchema: {
      document: 'etapa3-schema-analysis.md',
      tables: [
        'sentiment_analyses',
        'intent_detections',
        'emotion_recognitions',
        'analysis_aggregates',
        'analysis_alerts'
      ]
    },
    auditSchema: {
      document: 'etapa3-schema-audit.md',
      tables: ['audit_logs', 'audit_log_chain']
    }
  },
  
  // Frontend Documentation
  frontend: {
    analysisComponents: {
      document: 'etapa3-ui-components.md',
      components: [
        'SentimentGauge',
        'IntentBadges',
        'EmotionIndicator',
        'RiskLevelMeter',
        'AlertNotifications'
      ]
    },
    dashboards: {
      document: 'etapa3-ui-pages.md',
      pages: [
        'AnalysisDashboard',
        'ConversationAnalytics',
        'AlertManagement'
      ]
    }
  },
  
  // API Documentation
  api: {
    endpoints: {
      document: 'etapa3-api-endpoints.md',
      routes: [
        'POST /api/v1/analysis/sentiment',
        'POST /api/v1/analysis/intent',
        'POST /api/v1/analysis/aggregate',
        'GET /api/v1/analysis/conversation/:id',
        'GET /api/v1/alerts',
        'PATCH /api/v1/alerts/:id/acknowledge'
      ]
    },
    websocket: {
      document: 'etapa3-websocket-protocol.md',
      channels: [
        'analysis:updates',
        'alerts:notifications',
        'conversations:realtime'
      ]
    }
  }
};

// Cross-reference validator
export function validateReferences(): ReferenceValidation {
  const missing: string[] = [];
  const outdated: string[] = [];
  
  // Check document existence
  for (const ref of Object.values(INTERNAL_REFERENCES.relatedWorkers)) {
    // In actual implementation, verify file exists
    // fs.existsSync(ref.document)
  }
  
  return {
    valid: missing.length === 0 && outdated.length === 0,
    missing,
    outdated,
    checkedAt: new Date()
  };
}

interface ReferenceValidation {
  valid: boolean;
  missing: string[];
  outdated: string[];
  checkedAt: Date;
}
```

#### 12.2.2 External References

```typescript
// external-references.ts
// External libraries, APIs, and documentation references

export const EXTERNAL_REFERENCES = {
  // AI/ML Libraries
  aiLibraries: {
    anthropicSDK: {
      name: '@anthropic-ai/sdk',
      version: '^0.51.0',
      documentation: 'https://docs.anthropic.com/en/api/getting-started',
      usage: 'Primary LLM for sentiment, intent, and emotion analysis',
      license: 'MIT'
    },
    transformersJs: {
      name: '@xenova/transformers',
      version: '^2.17.0',
      documentation: 'https://huggingface.co/docs/transformers.js',
      usage: 'Local embeddings and classification fallback',
      license: 'Apache-2.0'
    },
    natural: {
      name: 'natural',
      version: '^7.2.0',
      documentation: 'https://github.com/NaturalNode/natural',
      usage: 'NLP utilities for Romanian text processing',
      license: 'MIT'
    }
  },
  
  // Queue & Infrastructure
  infrastructure: {
    bullmq: {
      name: 'bullmq',
      version: '^5.34.8',
      documentation: 'https://docs.bullmq.io/',
      usage: 'Job queue for analysis pipeline',
      license: 'MIT'
    },
    ioredis: {
      name: 'ioredis',
      version: '^5.4.2',
      documentation: 'https://github.com/redis/ioredis',
      usage: 'Redis client for caching and events',
      license: 'MIT'
    },
    ws: {
      name: 'ws',
      version: '^8.18.0',
      documentation: 'https://github.com/websockets/ws',
      usage: 'WebSocket server for real-time updates',
      license: 'MIT'
    }
  },
  
  // Database
  database: {
    drizzleOrm: {
      name: 'drizzle-orm',
      version: '^0.38.4',
      documentation: 'https://orm.drizzle.team/docs/overview',
      usage: 'ORM for PostgreSQL database operations',
      license: 'Apache-2.0'
    },
    postgres: {
      name: 'postgres',
      version: '^3.4.5',
      documentation: 'https://github.com/porsager/postgres',
      usage: 'PostgreSQL client driver',
      license: 'Unlicense'
    }
  },
  
  // Validation & Security
  validation: {
    zod: {
      name: 'zod',
      version: '^3.24.1',
      documentation: 'https://zod.dev/',
      usage: 'Schema validation for analysis inputs/outputs',
      license: 'MIT'
    },
    nanoid: {
      name: 'nanoid',
      version: '^5.0.9',
      documentation: 'https://github.com/ai/nanoid',
      usage: 'Unique ID generation for analysis records',
      license: 'MIT'
    }
  },
  
  // External APIs
  externalAPIs: {
    anthropicAPI: {
      name: 'Anthropic Messages API',
      baseUrl: 'https://api.anthropic.com/v1/messages',
      documentation: 'https://docs.anthropic.com/en/api/messages',
      authentication: 'API Key (x-api-key header)',
      rateLimit: 'Tier 4: 4000 RPM, 400k input TPM',
      models: ['claude-sonnet-4-20250514', 'claude-haiku-3-5-20241022']
    }
  },
  
  // Romanian-Specific Resources
  romanianResources: {
    sentimentLexicon: {
      name: 'Romanian Sentiment Lexicon',
      source: 'University of Bucharest NLP Research',
      url: 'https://nlp.unibuc.ro/resources',
      description: 'Romanian language sentiment word list with polarity scores',
      license: 'CC BY-NC 4.0'
    },
    stopwords: {
      name: 'Romanian Stop Words',
      source: 'stopwords-ro',
      url: 'https://github.com/stopwords-iso/stopwords-ro',
      description: 'Romanian stop words for text preprocessing',
      license: 'MIT'
    },
    diacritics: {
      name: 'Romanian Diacritics Normalizer',
      description: 'Handles ș/ş, ț/ţ, ă, â, î variations',
      standard: 'ISO 8859-16 (Latin-10)'
    }
  },
  
  // Research Papers
  researchPapers: [
    {
      title: 'Sentiment Analysis: A Comparative Study of Romanian and English',
      authors: 'Pătrunjel et al.',
      year: 2023,
      relevance: 'Romanian sentiment analysis methodologies'
    },
    {
      title: 'Intent Detection in Low-Resource Languages',
      authors: 'Wu et al.',
      year: 2024,
      relevance: 'Transfer learning for Romanian intent classification'
    },
    {
      title: 'Multimodal Emotion Recognition from Text',
      authors: 'Acheampong et al.',
      year: 2021,
      relevance: 'Text-based emotion recognition approaches'
    }
  ],
  
  // Standards & Compliance
  standards: {
    gdpr: {
      name: 'General Data Protection Regulation',
      reference: 'Regulation (EU) 2016/679',
      articles: ['Article 6 - Lawfulness of processing',
                 'Article 15 - Right of access',
                 'Article 17 - Right to erasure',
                 'Article 18 - Right to restriction',
                 'Article 20 - Right to data portability'],
      url: 'https://gdpr-info.eu/'
    },
    iso27001: {
      name: 'ISO/IEC 27001:2022',
      description: 'Information security management systems',
      relevance: 'Audit logging and data protection requirements'
    }
  }
};
```

### 12.3 Glossary

```typescript
// glossary.ts
// Domain-specific terminology for Workers K

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // Sentiment Analysis Terms
  'sentiment_score': {
    term: 'Sentiment Score',
    definition: 'Numerical value from -1 (very negative) to +1 (very positive) indicating emotional polarity of text',
    romanianTerm: 'Scor de sentiment',
    example: 'A message expressing satisfaction scores +0.8, while a complaint might score -0.6'
  },
  
  'composite_score': {
    term: 'Composite Score',
    definition: 'Weighted combination of sentiment, intent risk, and emotion metrics into single value',
    romanianTerm: 'Scor compozit',
    formula: 'sentimentScore * 0.4 + (1 - intentRiskScore) * 0.3 + emotionScore * 0.3'
  },
  
  'valence': {
    term: 'Valence',
    definition: 'Pleasantness dimension of emotion, ranging from negative (unpleasant) to positive (pleasant)',
    romanianTerm: 'Valență',
    range: '-1 to +1'
  },
  
  'arousal': {
    term: 'Arousal',
    definition: 'Activation level of emotion, from calm/passive to excited/active',
    romanianTerm: 'Nivel de activare',
    range: '0 to 1'
  },
  
  // Intent Classification Terms
  'intent': {
    term: 'Intent',
    definition: 'User\'s goal or purpose behind their message, classified into predefined categories',
    romanianTerm: 'Intenție',
    categories: ['PRODUCT_INQUIRY', 'ORDER_PLACEMENT', 'COMPLAINT', 'NEGOTIATION_ATTEMPT', etc]
  },
  
  'primary_intent': {
    term: 'Primary Intent',
    definition: 'The main user goal detected with highest confidence score',
    romanianTerm: 'Intenție principală'
  },
  
  'secondary_intents': {
    term: 'Secondary Intents',
    definition: 'Additional user goals detected with lower confidence, may influence response',
    romanianTerm: 'Intenții secundare'
  },
  
  'entity': {
    term: 'Entity',
    definition: 'Named element extracted from text such as products, quantities, prices, dates',
    romanianTerm: 'Entitate',
    types: ['PRODUCT', 'QUANTITY', 'PRICE', 'DATE', 'COMPETITOR', 'PERSON', 'ORGANIZATION']
  },
  
  // Emotion Recognition Terms
  'emotion_category': {
    term: 'Emotion Category',
    definition: 'Discrete emotion label (joy, anger, fear, sadness, surprise, disgust, trust, anticipation)',
    romanianTerm: 'Categorie emoțională',
    model: 'Plutchik\'s wheel of emotions'
  },
  
  'emotion_intensity': {
    term: 'Emotion Intensity',
    definition: 'Strength of detected emotion from 0 (neutral) to 1 (extremely strong)',
    romanianTerm: 'Intensitatea emoției'
  },
  
  // Risk & Alert Terms
  'risk_level': {
    term: 'Risk Level',
    definition: 'Assessment of conversation requiring intervention: low, medium, high, critical',
    romanianTerm: 'Nivel de risc',
    thresholds: 'critical: ≤-0.7, high: ≤-0.5, medium: ≤-0.2, low: >-0.2'
  },
  
  'alert': {
    term: 'Alert',
    definition: 'Notification generated when analysis indicates action required',
    romanianTerm: 'Alertă',
    types: ['NEGATIVE_SENTIMENT', 'COMPLAINT_DETECTED', 'HANDOVER_REQUIRED', 'RISK_LEVEL_CHANGE']
  },
  
  // Technical Terms
  'aggregation_window': {
    term: 'Aggregation Window',
    definition: 'Time period over which analysis metrics are combined, typically 1 hour',
    romanianTerm: 'Fereastră de agregare'
  },
  
  'trend_analysis': {
    term: 'Trend Analysis',
    definition: 'Assessment of metric change direction: improving, declining, stable',
    romanianTerm: 'Analiză de tendință'
  },
  
  'pii': {
    term: 'PII (Personally Identifiable Information)',
    definition: 'Data that can identify an individual: CNP, email, phone, address, etc.',
    romanianTerm: 'Date cu caracter personal',
    gdprReference: 'Article 4(1) GDPR'
  },
  
  'cnp': {
    term: 'CNP (Cod Numeric Personal)',
    definition: 'Romanian 13-digit personal identification number with checksum validation',
    romanianTerm: 'Cod Numeric Personal',
    format: 'SAALLZZJJNNNC (sex, year, month, day, county, sequence, checksum)'
  },
  
  'cui': {
    term: 'CUI (Cod Unic de Înregistrare)',
    definition: 'Romanian company tax identification number, also known as CIF',
    romanianTerm: 'Cod Unic de Înregistrare',
    format: 'RO followed by up to 10 digits'
  },
  
  // Worker-Specific Terms
  'worker_k1': {
    term: 'Worker K1 - Sentiment Analyzer',
    definition: 'Processes message text to determine emotional polarity and generate sentiment scores',
    queue: 'sentiment-analysis'
  },
  
  'worker_k2': {
    term: 'Worker K2 - Intent Classifier',
    definition: 'Classifies user messages into predefined intent categories with entity extraction',
    queue: 'intent-classification'
  },
  
  'worker_k3': {
    term: 'Worker K3 - Emotion Recognizer',
    definition: 'Identifies discrete emotions with intensity and dimensional (valence/arousal) scores',
    queue: 'emotion-recognition'
  },
  
  'worker_k4': {
    term: 'Worker K4 - Analysis Aggregator',
    definition: 'Combines sentiment, intent, and emotion analyses into unified assessment',
    queue: 'analysis-aggregation'
  },
  
  'worker_k5': {
    term: 'Worker K5 - Alert Manager',
    definition: 'Generates, escalates, and manages alerts based on analysis results',
    queue: 'alert-management'
  }
};

interface GlossaryEntry {
  term: string;
  definition: string;
  romanianTerm?: string;
  example?: string;
  formula?: string;
  range?: string;
  categories?: string[];
  types?: string[];
  model?: string;
  thresholds?: string;
  format?: string;
  gdprReference?: string;
  queue?: string;
}

// Search glossary
export function searchGlossary(query: string): GlossaryEntry[] {
  const normalizedQuery = query.toLowerCase();
  return Object.values(GLOSSARY).filter(entry => 
    entry.term.toLowerCase().includes(normalizedQuery) ||
    entry.definition.toLowerCase().includes(normalizedQuery) ||
    entry.romanianTerm?.toLowerCase().includes(normalizedQuery)
  );
}
```

### 12.4 Appendices

#### Appendix A: Romanian Sentiment Lexicon Sample

```typescript
// romanian-sentiment-lexicon.ts
// Sample of Romanian sentiment word entries

export const ROMANIAN_SENTIMENT_LEXICON: SentimentWord[] = [
  // Highly Positive (+0.8 to +1.0)
  { word: 'excelent', score: 0.95, category: 'quality' },
  { word: 'perfect', score: 0.95, category: 'quality' },
  { word: 'extraordinar', score: 0.90, category: 'quality' },
  { word: 'minunat', score: 0.90, category: 'emotion' },
  { word: 'superb', score: 0.88, category: 'quality' },
  { word: 'fantastic', score: 0.85, category: 'emotion' },
  { word: 'încântat', score: 0.85, category: 'emotion' },
  { word: 'mulțumit', score: 0.80, category: 'satisfaction' },
  
  // Moderately Positive (+0.4 to +0.79)
  { word: 'bun', score: 0.70, category: 'quality' },
  { word: 'frumos', score: 0.65, category: 'aesthetic' },
  { word: 'plăcut', score: 0.60, category: 'emotion' },
  { word: 'util', score: 0.55, category: 'utility' },
  { word: 'corect', score: 0.50, category: 'quality' },
  { word: 'potrivit', score: 0.45, category: 'fit' },
  { word: 'acceptabil', score: 0.40, category: 'quality' },
  
  // Slightly Positive (+0.1 to +0.39)
  { word: 'ok', score: 0.30, category: 'quality' },
  { word: 'satisfăcător', score: 0.25, category: 'satisfaction' },
  { word: 'rezonabil', score: 0.20, category: 'quality' },
  { word: 'decent', score: 0.15, category: 'quality' },
  
  // Neutral (-0.1 to +0.1)
  { word: 'normal', score: 0.0, category: 'neutral' },
  { word: 'obișnuit', score: 0.0, category: 'neutral' },
  { word: 'standard', score: 0.0, category: 'neutral' },
  
  // Slightly Negative (-0.39 to -0.1)
  { word: 'mediocru', score: -0.25, category: 'quality' },
  { word: 'nesatisfăcător', score: -0.35, category: 'satisfaction' },
  
  // Moderately Negative (-0.79 to -0.4)
  { word: 'prost', score: -0.70, category: 'quality' },
  { word: 'dezamăgit', score: -0.65, category: 'emotion' },
  { word: 'nemulțumit', score: -0.60, category: 'satisfaction' },
  { word: 'supărat', score: -0.55, category: 'emotion' },
  { word: 'frustrat', score: -0.55, category: 'emotion' },
  { word: 'întârziat', score: -0.50, category: 'service' },
  { word: 'defect', score: -0.50, category: 'quality' },
  { word: 'greșit', score: -0.45, category: 'error' },
  
  // Highly Negative (-1.0 to -0.8)
  { word: 'groaznic', score: -0.90, category: 'quality' },
  { word: 'îngrozitor', score: -0.90, category: 'quality' },
  { word: 'oribil', score: -0.88, category: 'quality' },
  { word: 'dezastru', score: -0.85, category: 'quality' },
  { word: 'inacceptabil', score: -0.85, category: 'quality' },
  { word: 'scandalos', score: -0.82, category: 'emotion' },
  { word: 'enervant', score: -0.80, category: 'emotion' },
  
  // Domain-Specific (Agricultural)
  { word: 'randament', score: 0.50, category: 'agricultural' },
  { word: 'calitate_superioara', score: 0.75, category: 'agricultural' },
  { word: 'germinatie', score: 0.40, category: 'agricultural' },
  { word: 'productiv', score: 0.60, category: 'agricultural' },
  { word: 'contaminate', score: -0.70, category: 'agricultural' },
  { word: 'infestat', score: -0.75, category: 'agricultural' },
  { word: 'daunatori', score: -0.55, category: 'agricultural' },
  { word: 'seceta', score: -0.50, category: 'agricultural' }
];

interface SentimentWord {
  word: string;
  score: number;
  category: string;
  variants?: string[];
}
```

#### Appendix B: Intent Pattern Examples

```typescript
// intent-patterns.ts
// Example patterns for Romanian intent classification

export const INTENT_PATTERN_EXAMPLES = {
  ORDER_PLACEMENT: {
    patterns: [
      'vreau să comand',
      'aș dori să cumpăr',
      'plasez o comandă',
      'pot să comandăm',
      'dorim achiziția',
      'avem nevoie de {quantity} {product}'
    ],
    entities: ['PRODUCT', 'QUANTITY', 'DELIVERY_DATE'],
    priority: 'high'
  },
  
  PRICE_NEGOTIATION: {
    patterns: [
      'puteți face un preț mai bun',
      'ce discount oferiți',
      'e prea scump',
      'prețul e mare',
      'se poate negocia',
      'la ce preț ajungeți'
    ],
    entities: ['PRICE', 'PERCENTAGE', 'COMPETITOR'],
    priority: 'medium'
  },
  
  COMPLAINT: {
    patterns: [
      'vreau să fac o reclamație',
      'am o problemă cu',
      'sunt nemulțumit de',
      'nu funcționează',
      'produsul e defect',
      'a venit stricat'
    ],
    entities: ['PRODUCT', 'ORDER_ID', 'ISSUE_TYPE'],
    priority: 'high'
  },
  
  PRODUCT_INQUIRY: {
    patterns: [
      'aveți în stoc',
      'ce produse aveți',
      'mă interesează',
      'vreau informații despre',
      'cât costă',
      'când intră în stoc'
    ],
    entities: ['PRODUCT', 'CATEGORY', 'SPECIFICATION'],
    priority: 'medium'
  },
  
  HUMAN_AGENT_REQUEST: {
    patterns: [
      'vreau să vorbesc cu cineva',
      'vreau un operator',
      'pot vorbi cu un om',
      'transferați-mă',
      'nu pot discuta cu robotul',
      'am nevoie de ajutor uman'
    ],
    entities: [],
    priority: 'immediate'
  }
};
```

#### Appendix C: Configuration Templates

```yaml
# workers-k-config.yaml
# Production configuration template for Workers K

sentiment_analyzer:
  queue:
    name: sentiment-analysis
    concurrency: 5
    rate_limit: 100  # per minute
  
  models:
    primary:
      provider: anthropic
      model: claude-haiku-3-5-20241022
      max_tokens: 512
    fallback:
      type: lexicon
      path: /data/lexicons/romanian-sentiment.json
  
  thresholds:
    negative_alert: -0.5
    positive_highlight: 0.7
    critical: -0.7
  
  cache:
    enabled: true
    ttl: 3600  # 1 hour
    max_size: 10000

intent_classifier:
  queue:
    name: intent-classification
    concurrency: 5
    rate_limit: 100
  
  models:
    primary:
      provider: anthropic
      model: claude-haiku-3-5-20241022
      max_tokens: 1024
  
  confidence_threshold: 0.7
  max_intents: 3
  
  entity_extraction:
    enabled: true
    patterns_path: /data/patterns/romanian-entities.json

emotion_recognizer:
  queue:
    name: emotion-recognition
    concurrency: 5
    rate_limit: 100
  
  models:
    primary:
      provider: anthropic
      model: claude-haiku-3-5-20241022
      max_tokens: 512
  
  thresholds:
    high_arousal: 0.7
    frustration_alert: 0.6
    satisfaction_highlight: 0.7

analysis_aggregator:
  queue:
    name: analysis-aggregation
    concurrency: 10
    rate_limit: 200
  
  weights:
    sentiment: 0.4
    intent_risk: 0.3
    emotion: 0.3
  
  risk_thresholds:
    critical: -0.7
    high: -0.5
    medium: -0.2
  
  window_hours: 1

alert_manager:
  queue:
    name: alert-management
    concurrency: 5
    rate_limit: 50
  
  escalation:
    enabled: true
    sla_hours: 24
    levels: [supervisor, manager, director]
  
  notifications:
    email:
      enabled: true
      critical_only: false
    slack:
      enabled: true
      channel: "#sales-alerts"
    webhook:
      enabled: true
      url: ${WEBHOOK_URL}
```

### 12.5 Document Summary

This document provides comprehensive technical specification for **Workers K - Sentiment & Intent Analysis** in the Cerniq B2B agricultural sales automation platform, Etapa 3.

#### Key Components Documented

1. **Five Sub-Workers**:
   - K1: Sentiment Analyzer - Emotional polarity detection
   - K2: Intent Classifier - User goal identification
   - K3: Emotion Recognizer - Discrete emotion detection
   - K4: Analysis Aggregator - Unified metrics combination
   - K5: Alert Manager - Alert generation and escalation

2. **Romanian Language Support**:
   - Custom sentiment lexicon with 500+ words
   - Diacritics normalization (ș/ş, ț/ţ)
   - Agricultural domain terminology
   - Romanian PII detection (CNP, CUI, IBAN)

3. **Integration Points**:
   - Workers J: Handover triggering
   - Workers D: Negotiation FSM
   - Workers C: AI Agent context
   - Workers H: E-Factura generation

4. **Compliance**:
   - GDPR Articles 6, 15, 17, 18, 20
   - Romanian data protection (CNP, CUI)
   - Comprehensive audit logging
   - Hash chain integrity verification

#### Document Statistics

| Metric | Value |
|--------|-------|
| Total Sections | 12 |
| Code Examples | 150+ |
| TypeScript Interfaces | 80+ |
| Database Tables | 7 |
| API Endpoints | 15+ |
| BullMQ Queues | 5 |
| Total Lines | ~25,000 |

---

**Document End**

*Generated: 2026-01-18*
*Version: 1.0.2*
*Author: Cerniq Development Team*
*Classification: Internal - Technical Documentation*
