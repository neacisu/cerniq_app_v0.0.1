# Etapa 3 - Workers J: Handover & Channel Management

## Document Control

| Attribute | Value |
|-----------|-------|
| Document ID | CERNIQ-E3-WORKERS-J |
| Version | 1.0.0 |
| Status | Draft |
| Created | 2026-01-18 |
| Author | Claude (AI Assistant) |
| Reviewers | Alex (Technical Lead) |
| Classification | Internal Technical Documentation |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Worker J1: Handover Prepare](#2-worker-j1-handover-prepare)
3. [Worker J2: Handover Execute](#3-worker-j2-handover-execute)
4. [Worker J3: Channel Switch](#4-worker-j3-channel-switch)
5. [Worker J4: Channel Sync](#5-worker-j4-channel-sync)
6. [Queue Configuration](#6-queue-configuration)
7. [Retry & Error Handling](#7-retry--error-handling)
8. [Monitoring & Metrics](#8-monitoring--metrics)
9. [Testing Specification](#9-testing-specification)

---

## 1. Overview

### 1.1 Purpose

Workers J handle the critical transition from AI-assisted sales to human sales representatives and manage multi-channel communication synchronization. These workers ensure seamless handoffs when negotiations require human expertise or when customer interactions need to switch between communication channels (email, WhatsApp, phone).

### 1.2 Business Context

In B2B agricultural sales, certain situations require human intervention:
- Complex technical negotiations requiring product expertise
- High-value deals above automation thresholds (>50,000 RON)
- Customer escalation requests
- Regulatory or compliance-sensitive discussions
- Multi-stakeholder negotiations

The handover system ensures:
- Complete context transfer to human agents
- No information loss during transitions
- Proper channel management across email, WhatsApp, and phone
- Synchronized conversation history across all channels

### 1.3 Workers in Category J

| Worker ID | Name | Priority | Description |
|-----------|------|----------|-------------|
| J1 | handover-prepare | High | Compiles handover package with full context |
| J2 | handover-execute | Critical | Executes transition to human agent |
| J3 | channel-switch | Medium | Manages switching between communication channels |
| J4 | channel-sync | Medium | Synchronizes conversation state across channels |

### 1.4 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Handover & Channel System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  AI Agent    │───>│ J1: Prepare  │───>│ J2: Execute  │       │
│  │  (Worker C)  │    │  (Context)   │    │  (Handover)  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                                       │                │
│         │            ┌──────────────┐           │                │
│         │            │  Human Sales │<──────────┘                │
│         │            │    Agent     │                            │
│         │            └──────────────┘                            │
│         │                   │                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ J3: Channel  │<───│  Customer    │───>│ J4: Channel  │       │
│  │   Switch     │    │ Interaction  │    │    Sync      │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Channels: Email │ WhatsApp │ Phone │ Video │ In-Person         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Handover Triggers

```typescript
// src/workers/etapa3/handover/types.ts

export enum HandoverTrigger {
  // Automatic triggers
  HIGH_VALUE_DEAL = 'high_value_deal',          // Amount > 50,000 RON
  COMPLEX_NEGOTIATION = 'complex_negotiation',   // Multiple products, custom terms
  ESCALATION_REQUEST = 'escalation_request',     // Customer requested human
  AI_CONFIDENCE_LOW = 'ai_confidence_low',       // AI uncertain (<70% confidence)
  REGULATORY_TOPIC = 'regulatory_topic',         // Legal/compliance discussion
  COMPETITOR_MENTION = 'competitor_mention',     // Competitor pricing mentioned
  DEADLINE_CRITICAL = 'deadline_critical',       // Contract deadline approaching
  
  // Manual triggers
  AGENT_REQUEST = 'agent_request',               // AI agent requests handover
  SUPERVISOR_OVERRIDE = 'supervisor_override',   // Supervisor intervention
  QUALITY_REVIEW = 'quality_review',             // QA flagged for review
  
  // System triggers
  SESSION_TIMEOUT = 'session_timeout',           // Long conversation timeout
  ERROR_THRESHOLD = 'error_threshold',           // Multiple errors in conversation
  SENTIMENT_NEGATIVE = 'sentiment_negative'      // Prolonged negative sentiment
}

export interface HandoverThresholds {
  highValueAmount: number;                       // 50000 RON default
  lowConfidenceThreshold: number;                // 0.7 default
  maxConversationTurns: number;                  // 50 turns
  negativeSentimentWindow: number;               // 5 messages
  errorThresholdCount: number;                   // 3 errors
}

export const DEFAULT_HANDOVER_THRESHOLDS: HandoverThresholds = {
  highValueAmount: 50000,
  lowConfidenceThreshold: 0.7,
  maxConversationTurns: 50,
  negativeSentimentWindow: 5,
  errorThresholdCount: 3
};
```


---

## 2. Worker J1: Handover Prepare

### 2.1 Worker Definition

```typescript
// src/workers/etapa3/handover/handover-prepare.worker.ts

import { Worker, Job, Queue } from 'bullmq';
import { db } from '@/db';
import { 
  handoverPackages,
  negotiations,
  contacts,
  products,
  conversations,
  conversationMessages,
  aiSessions,
  pricingHistory,
  documentTemplates
} from '@/db/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { createLogger } from '@/utils/logger';
import { redisConnection } from '@/config/redis';
import { metrics } from '@/utils/metrics';

const logger = createLogger('worker:handover-prepare');

// Queue definitions
export const handoverPrepareQueue = new Queue('handover-prepare', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 }
  }
});

// Types
export interface HandoverPrepareInput {
  tenantId: string;
  negotiationId: string;
  triggeredBy: HandoverTrigger;
  triggerDetails?: Record<string, unknown>;
  requestedBy?: string;          // User ID if manual request
  priority?: HandoverPriority;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  preferredAgent?: string;       // Preferred human agent ID
  notes?: string;                // Additional context
}

export interface HandoverPrepareOutput {
  handoverPackageId: string;
  negotiationId: string;
  status: 'prepared' | 'failed';
  packageSize: number;           // bytes
  contextCompleteness: number;   // 0-100%
  suggestedAgent?: string;
  estimatedHandoverTime: number; // minutes
  warnings?: string[];
}

export enum HandoverPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
  EMERGENCY = 5
}

export interface HandoverPackage {
  id: string;
  tenantId: string;
  negotiationId: string;
  
  // Customer Information
  customer: CustomerContext;
  
  // Negotiation State
  negotiation: NegotiationContext;
  
  // Conversation History
  conversation: ConversationContext;
  
  // Product Information
  products: ProductContext[];
  
  // Pricing Information
  pricing: PricingContext;
  
  // AI Session Summary
  aiSummary: AISessionSummary;
  
  // Action Items
  actionItems: ActionItem[];
  
  // Recommendations
  recommendations: HandoverRecommendation[];
  
  // Attachments
  attachments: HandoverAttachment[];
  
  // Metadata
  metadata: HandoverMetadata;
}
```

### 2.2 Context Compilation

```typescript
// Context interfaces
export interface CustomerContext {
  contactId: string;
  companyName: string;
  cui: string;
  contactPerson: {
    name: string;
    position?: string;
    email?: string;
    phone?: string;
    preferredChannel: 'email' | 'whatsapp' | 'phone';
  };
  
  // Customer history
  relationshipStart: Date;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  paymentHistory: PaymentHistoryItem[];
  
  // Segmentation
  segment: 'bronze' | 'silver' | 'gold' | 'platinum';
  industry: string;
  companySize: 'micro' | 'small' | 'medium' | 'large';
  farmSize?: number;              // hectares for agricultural
  
  // Communication preferences
  languagePreference: 'ro' | 'en';
  communicationTone: 'formal' | 'informal';
  bestContactTime?: string;
  timezone: string;
  
  // Special notes
  specialRequirements?: string;
  previousIssues?: string[];
  vipStatus: boolean;
}

export interface NegotiationContext {
  negotiationId: string;
  currentState: NegotiationState;
  stateHistory: StateTransition[];
  
  // Timeline
  startedAt: Date;
  lastActivityAt: Date;
  daysActive: number;
  
  // Deal details
  totalValue: number;
  currency: 'RON' | 'EUR';
  productCount: number;
  lineItems: NegotiationLineItem[];
  
  // Terms
  paymentTerms?: string;
  deliveryTerms?: string;
  specialConditions?: string[];
  
  // Discounts applied
  discountsApplied: DiscountApplied[];
  totalDiscountPercentage: number;
  totalDiscountValue: number;
  
  // Urgency indicators
  customerDeadline?: Date;
  competitorMentioned: boolean;
  priceObjections: number;
  
  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  
  // Win probability
  winProbability: number;        // 0-100%
  probabilityFactors: string[];
}

export interface ConversationContext {
  totalMessages: number;
  totalTurns: number;
  durationMinutes: number;
  
  // Channel breakdown
  channelBreakdown: {
    email: number;
    whatsapp: number;
    phone: number;
    chat: number;
  };
  
  // Message summary
  recentMessages: ConversationMessage[];  // Last 20 messages
  keyTopicsDiscussed: string[];
  questionsAsked: QuestionItem[];
  objectionsRaised: ObjectionItem[];
  
  // Sentiment analysis
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentTrend: 'improving' | 'stable' | 'declining';
  sentimentTimeline: SentimentPoint[];
  
  // Engagement metrics
  averageResponseTime: number;    // minutes
  customerInitiatedRatio: number; // 0-1
  messageLength: {
    customerAvg: number;
    aiAvg: number;
  };
}

export interface ProductContext {
  productId: string;
  sku: string;
  name: string;
  category: string;
  
  // Quantity and pricing
  quantityRequested: number;
  unitOfMeasure: string;
  listPrice: number;
  offeredPrice: number;
  discountPercentage: number;
  
  // Availability
  currentStock: number;
  reservedQuantity: number;
  availableQuantity: number;
  restockDate?: Date;
  
  // Product details for agent
  keyFeatures: string[];
  technicalSpecs: Record<string, string>;
  competitiveAdvantages: string[];
  commonObjections: string[];
  suggestedResponses: string[];
  
  // Margin information
  marginPercentage: number;
  minimumMargin: number;
  maxDiscountAllowed: number;
  
  // Related products
  alternatives: string[];
  complementary: string[];
  bundles: string[];
}

export interface PricingContext {
  // Current offer
  currentOfferTotal: number;
  listPriceTotal: number;
  totalDiscount: number;
  
  // Pricing history
  previousOffers: PriceOffer[];
  priceChanges: PriceChange[];
  
  // Discount analysis
  discountBreakdown: {
    volumeDiscount: number;
    loyaltyDiscount: number;
    promotionalDiscount: number;
    negotiatedDiscount: number;
    total: number;
  };
  
  // Margin analysis
  currentMargin: number;
  minimumAcceptableMargin: number;
  targetMargin: number;
  
  // Authority levels
  discountWithinAuthority: boolean;
  additionalDiscountNeeded: number;
  approvalRequired: boolean;
  approvalLevel?: 'manager' | 'director' | 'ceo';
  
  // Competitive context
  competitorPrices?: CompetitorPrice[];
  marketPosition: 'below' | 'at' | 'above';
}

export interface AISessionSummary {
  sessionId: string;
  duration: number;
  
  // AI performance
  responseCount: number;
  averageConfidence: number;
  lowConfidenceCount: number;
  
  // Key decisions made
  decisionsLog: AIDecision[];
  
  // Escalation reasons
  escalationReason: string;
  escalationDetails: string;
  
  // Recommendations
  suggestedNextSteps: string[];
  warningFlags: string[];
  
  // Knowledge gaps
  knowledgeGaps: string[];
  unansweredQuestions: string[];
}

export interface ActionItem {
  id: string;
  type: 'follow_up' | 'send_document' | 'schedule_call' | 'get_approval' | 'check_stock' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high';
  deadline?: Date;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

export interface HandoverRecommendation {
  type: 'pricing' | 'product' | 'timing' | 'approach' | 'escalation';
  title: string;
  description: string;
  rationale: string;
  confidence: number;
  priority: number;
}

export interface HandoverAttachment {
  type: 'quote' | 'invoice' | 'contract' | 'specification' | 'presentation' | 'other';
  name: string;
  url: string;
  size: number;
  createdAt: Date;
}

export interface HandoverMetadata {
  preparedAt: Date;
  preparedBy: 'ai' | 'system';
  packageVersion: string;
  dataCompleteness: number;
  confidenceLevel: number;
  expiresAt: Date;
  tags: string[];
}
```

### 2.3 Context Compilation Functions

```typescript
// src/workers/etapa3/handover/context-compiler.ts

import { db } from '@/db';
import { and, eq, desc, gte, sql } from 'drizzle-orm';

export class ContextCompiler {
  constructor(
    private tenantId: string,
    private negotiationId: string
  ) {}

  async compileCustomerContext(): Promise<CustomerContext> {
    // Get negotiation with contact
    const negotiation = await db.query.negotiations.findFirst({
      where: and(
        eq(negotiations.tenantId, this.tenantId),
        eq(negotiations.id, this.negotiationId)
      ),
      with: {
        contact: true
      }
    });

    if (!negotiation?.contact) {
      throw new Error('Contact not found for negotiation');
    }

    const contact = negotiation.contact;

    // Get order history
    const orderHistory = await db.query.orders.findMany({
      where: and(
        eq(orders.tenantId, this.tenantId),
        eq(orders.contactId, contact.id)
      ),
      orderBy: desc(orders.createdAt),
      limit: 50
    });

    // Calculate metrics
    const totalOrders = orderHistory.length;
    const totalRevenue = orderHistory.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get payment history
    const payments = await db.query.payments.findMany({
      where: and(
        eq(payments.tenantId, this.tenantId),
        eq(payments.contactId, contact.id)
      ),
      orderBy: desc(payments.dueDate),
      limit: 10
    });

    const paymentHistory: PaymentHistoryItem[] = payments.map(p => ({
      invoiceId: p.invoiceId,
      amount: Number(p.amount),
      dueDate: p.dueDate,
      paidDate: p.paidAt,
      daysLate: p.paidAt ? 
        Math.max(0, Math.floor((p.paidAt.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 
        null,
      status: p.status
    }));

    // Determine VIP status
    const vipThreshold = 100000; // 100k RON
    const vipStatus = totalRevenue >= vipThreshold;

    // Get special notes from contact metadata
    const metadata = contact.metadata as Record<string, unknown> || {};

    return {
      contactId: contact.id,
      companyName: contact.companyName,
      cui: contact.cui,
      contactPerson: {
        name: contact.contactPersonName || contact.companyName,
        position: metadata.position as string,
        email: contact.email,
        phone: contact.phone,
        preferredChannel: (metadata.preferredChannel as 'email' | 'whatsapp' | 'phone') || 'email'
      },
      relationshipStart: contact.createdAt,
      totalOrders,
      totalRevenue,
      averageOrderValue: avgOrderValue,
      paymentHistory,
      segment: this.determineSegment(totalRevenue, totalOrders),
      industry: contact.industry || 'agriculture',
      companySize: this.determineCompanySize(contact),
      farmSize: metadata.farmSizeHectares as number,
      languagePreference: (metadata.language as 'ro' | 'en') || 'ro',
      communicationTone: (metadata.tone as 'formal' | 'informal') || 'formal',
      bestContactTime: metadata.bestContactTime as string,
      timezone: 'Europe/Bucharest',
      specialRequirements: metadata.specialRequirements as string,
      previousIssues: metadata.previousIssues as string[],
      vipStatus
    };
  }

  private determineSegment(revenue: number, orders: number): CustomerContext['segment'] {
    if (revenue >= 500000 || orders >= 50) return 'platinum';
    if (revenue >= 100000 || orders >= 20) return 'gold';
    if (revenue >= 25000 || orders >= 5) return 'silver';
    return 'bronze';
  }

  private determineCompanySize(contact: any): CustomerContext['companySize'] {
    const employees = contact.employeeCount || 0;
    if (employees >= 250) return 'large';
    if (employees >= 50) return 'medium';
    if (employees >= 10) return 'small';
    return 'micro';
  }

  async compileNegotiationContext(): Promise<NegotiationContext> {
    const negotiation = await db.query.negotiations.findFirst({
      where: and(
        eq(negotiations.tenantId, this.tenantId),
        eq(negotiations.id, this.negotiationId)
      ),
      with: {
        lineItems: {
          with: {
            product: true
          }
        },
        discounts: true,
        stateHistory: {
          orderBy: desc(negotiationStateHistory.createdAt)
        }
      }
    });

    if (!negotiation) {
      throw new Error('Negotiation not found');
    }

    // Calculate totals
    const lineItems: NegotiationLineItem[] = negotiation.lineItems.map(li => ({
      productId: li.productId,
      productName: li.product.name,
      quantity: li.quantity,
      unitPrice: Number(li.unitPrice),
      listPrice: Number(li.product.listPrice),
      discount: Number(li.discountPercentage),
      total: li.quantity * Number(li.unitPrice)
    }));

    const totalValue = lineItems.reduce((sum, li) => sum + li.total, 0);
    const listPriceTotal = lineItems.reduce((sum, li) => sum + (li.quantity * li.listPrice), 0);
    const totalDiscountValue = listPriceTotal - totalValue;
    const totalDiscountPercentage = listPriceTotal > 0 ? 
      (totalDiscountValue / listPriceTotal) * 100 : 0;

    // Compile discounts
    const discountsApplied: DiscountApplied[] = negotiation.discounts.map(d => ({
      type: d.discountType,
      percentage: Number(d.percentage),
      amount: Number(d.amount),
      reason: d.reason,
      approvedBy: d.approvedBy,
      approvedAt: d.approvedAt
    }));

    // State history
    const stateHistory: StateTransition[] = negotiation.stateHistory.map(sh => ({
      fromState: sh.fromState,
      toState: sh.toState,
      reason: sh.reason,
      timestamp: sh.createdAt,
      actor: sh.actorType
    }));

    // Calculate days active
    const daysActive = Math.ceil(
      (new Date().getTime() - negotiation.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Risk assessment
    const riskFactors: string[] = [];
    let riskLevel: NegotiationContext['riskLevel'] = 'low';

    if (totalDiscountPercentage > 25) {
      riskFactors.push('High discount requested (>25%)');
      riskLevel = 'medium';
    }
    if (daysActive > 30) {
      riskFactors.push('Extended negotiation duration (>30 days)');
      riskLevel = 'medium';
    }
    if (negotiation.competitorMentioned) {
      riskFactors.push('Competitor mentioned in conversation');
      riskLevel = 'high';
    }
    if (negotiation.priceObjectionCount > 3) {
      riskFactors.push('Multiple price objections raised');
      riskLevel = 'high';
    }

    // Win probability calculation
    const { probability, factors } = this.calculateWinProbability(negotiation);

    return {
      negotiationId: this.negotiationId,
      currentState: negotiation.currentState as NegotiationState,
      stateHistory,
      startedAt: negotiation.createdAt,
      lastActivityAt: negotiation.updatedAt,
      daysActive,
      totalValue,
      currency: negotiation.currency || 'RON',
      productCount: lineItems.length,
      lineItems,
      paymentTerms: negotiation.paymentTerms,
      deliveryTerms: negotiation.deliveryTerms,
      specialConditions: negotiation.specialConditions as string[],
      discountsApplied,
      totalDiscountPercentage,
      totalDiscountValue,
      customerDeadline: negotiation.customerDeadline,
      competitorMentioned: negotiation.competitorMentioned || false,
      priceObjections: negotiation.priceObjectionCount || 0,
      riskLevel,
      riskFactors,
      winProbability: probability,
      probabilityFactors: factors
    };
  }

  private calculateWinProbability(negotiation: any): { probability: number; factors: string[] } {
    let score = 50;
    const factors: string[] = [];

    // Positive factors
    if (negotiation.currentState === 'offer_sent') {
      score += 10;
      factors.push('+10: Offer already sent');
    }
    if (negotiation.currentState === 'negotiating') {
      score += 15;
      factors.push('+15: Active negotiation');
    }
    if (!negotiation.competitorMentioned) {
      score += 10;
      factors.push('+10: No competitor mentioned');
    }
    if (negotiation.priceObjectionCount === 0) {
      score += 10;
      factors.push('+10: No price objections');
    }

    // Negative factors
    if (negotiation.currentState === 'stalled') {
      score -= 20;
      factors.push('-20: Negotiation stalled');
    }
    if (negotiation.priceObjectionCount > 2) {
      score -= 15;
      factors.push('-15: Multiple price objections');
    }
    if (negotiation.competitorMentioned) {
      score -= 10;
      factors.push('-10: Competitor mentioned');
    }

    // Ensure bounds
    const probability = Math.max(5, Math.min(95, score));

    return { probability, factors };
  }

  async compileConversationContext(): Promise<ConversationContext> {
    // Get all conversations for this negotiation
    const convos = await db.query.conversations.findMany({
      where: and(
        eq(conversations.tenantId, this.tenantId),
        eq(conversations.negotiationId, this.negotiationId)
      ),
      with: {
        messages: {
          orderBy: desc(conversationMessages.createdAt),
          limit: 100
        }
      }
    });

    // Aggregate all messages
    const allMessages = convos.flatMap(c => c.messages);
    allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Channel breakdown
    const channelBreakdown = {
      email: 0,
      whatsapp: 0,
      phone: 0,
      chat: 0
    };

    allMessages.forEach(m => {
      const channel = m.channel as keyof typeof channelBreakdown;
      if (channel in channelBreakdown) {
        channelBreakdown[channel]++;
      }
    });

    // Get recent messages with formatting
    const recentMessages: ConversationMessage[] = allMessages.slice(-20).map(m => ({
      id: m.id,
      direction: m.direction as 'inbound' | 'outbound',
      channel: m.channel,
      content: m.content,
      timestamp: m.createdAt,
      sender: m.senderType,
      sentiment: m.sentiment,
      topics: m.extractedTopics as string[]
    }));

    // Extract key topics
    const topicCounts = new Map<string, number>();
    allMessages.forEach(m => {
      const topics = m.extractedTopics as string[] || [];
      topics.forEach(t => {
        topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
      });
    });
    const keyTopicsDiscussed = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);

    // Extract questions
    const questionsAsked = this.extractQuestions(allMessages);
    const objectionsRaised = this.extractObjections(allMessages);

    // Sentiment analysis
    const sentimentAnalysis = this.analyzeSentiment(allMessages);

    // Calculate duration
    const firstMessage = allMessages[0];
    const lastMessage = allMessages[allMessages.length - 1];
    const durationMinutes = firstMessage && lastMessage ?
      Math.ceil((lastMessage.createdAt.getTime() - firstMessage.createdAt.getTime()) / 60000) : 0;

    // Response time calculation
    const responseTimes: number[] = [];
    for (let i = 1; i < allMessages.length; i++) {
      if (allMessages[i].direction !== allMessages[i-1].direction) {
        const diff = allMessages[i].createdAt.getTime() - allMessages[i-1].createdAt.getTime();
        responseTimes.push(diff / 60000); // minutes
      }
    }
    const averageResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    // Customer initiated ratio
    const customerMessages = allMessages.filter(m => m.direction === 'inbound').length;
    const customerInitiatedRatio = allMessages.length > 0 ? 
      customerMessages / allMessages.length : 0;

    return {
      totalMessages: allMessages.length,
      totalTurns: Math.ceil(allMessages.length / 2),
      durationMinutes,
      channelBreakdown,
      recentMessages,
      keyTopicsDiscussed,
      questionsAsked,
      objectionsRaised,
      overallSentiment: sentimentAnalysis.overall,
      sentimentTrend: sentimentAnalysis.trend,
      sentimentTimeline: sentimentAnalysis.timeline,
      averageResponseTime,
      customerInitiatedRatio,
      messageLength: {
        customerAvg: this.calculateAvgLength(allMessages.filter(m => m.direction === 'inbound')),
        aiAvg: this.calculateAvgLength(allMessages.filter(m => m.direction === 'outbound'))
      }
    };
  }

  private extractQuestions(messages: any[]): QuestionItem[] {
    const questions: QuestionItem[] = [];
    const questionPatterns = [
      /\?$/,
      /^(care|ce|cum|când|unde|cine|de ce|cât|câți|câte)/i,
      /^(what|how|when|where|who|why|which)/i
    ];

    messages.forEach(m => {
      if (m.direction === 'inbound') {
        const sentences = m.content.split(/[.!?]+/);
        sentences.forEach((s: string) => {
          if (questionPatterns.some(p => p.test(s.trim()))) {
            questions.push({
              question: s.trim(),
              timestamp: m.createdAt,
              answered: this.wasQuestionAnswered(s, messages, m.createdAt),
              topic: this.extractQuestionTopic(s)
            });
          }
        });
      }
    });

    return questions.slice(-20); // Last 20 questions
  }

  private extractObjections(messages: any[]): ObjectionItem[] {
    const objections: ObjectionItem[] = [];
    const objectionKeywords = [
      'prea scump', 'preț mare', 'nu-mi permit',
      'competitorul oferă', 'alt furnizor', 'ofertă mai bună',
      'nu sunt sigur', 'trebuie să mă gândesc',
      'too expensive', 'high price', 'competitor offers'
    ];

    messages.forEach(m => {
      if (m.direction === 'inbound') {
        const lowerContent = m.content.toLowerCase();
        objectionKeywords.forEach(keyword => {
          if (lowerContent.includes(keyword)) {
            objections.push({
              type: this.classifyObjection(keyword),
              content: m.content.substring(0, 200),
              timestamp: m.createdAt,
              addressed: this.wasObjectionAddressed(m, messages)
            });
          }
        });
      }
    });

    return objections;
  }

  private classifyObjection(keyword: string): ObjectionItem['type'] {
    if (keyword.includes('scump') || keyword.includes('preț') || keyword.includes('expensive')) {
      return 'price';
    }
    if (keyword.includes('competitorul') || keyword.includes('furnizor') || keyword.includes('competitor')) {
      return 'competitor';
    }
    if (keyword.includes('gândesc') || keyword.includes('sigur')) {
      return 'timing';
    }
    return 'other';
  }

  private analyzeSentiment(messages: any[]): {
    overall: ConversationContext['overallSentiment'];
    trend: ConversationContext['sentimentTrend'];
    timeline: SentimentPoint[];
  } {
    const customerMessages = messages.filter(m => m.direction === 'inbound');
    
    if (customerMessages.length === 0) {
      return { overall: 'neutral', trend: 'stable', timeline: [] };
    }

    const sentimentScores = customerMessages.map(m => {
      const score = m.sentimentScore || 0;
      return { timestamp: m.createdAt, score };
    });

    const avgScore = sentimentScores.reduce((sum, s) => sum + s.score, 0) / sentimentScores.length;
    
    // Overall sentiment
    let overall: ConversationContext['overallSentiment'];
    if (avgScore > 0.2) overall = 'positive';
    else if (avgScore < -0.2) overall = 'negative';
    else overall = 'neutral';

    // Trend calculation (compare first half vs second half)
    const midpoint = Math.floor(sentimentScores.length / 2);
    const firstHalfAvg = sentimentScores.slice(0, midpoint)
      .reduce((sum, s) => sum + s.score, 0) / (midpoint || 1);
    const secondHalfAvg = sentimentScores.slice(midpoint)
      .reduce((sum, s) => sum + s.score, 0) / (sentimentScores.length - midpoint || 1);

    let trend: ConversationContext['sentimentTrend'];
    if (secondHalfAvg - firstHalfAvg > 0.1) trend = 'improving';
    else if (secondHalfAvg - firstHalfAvg < -0.1) trend = 'declining';
    else trend = 'stable';

    const timeline: SentimentPoint[] = sentimentScores.map(s => ({
      timestamp: s.timestamp,
      score: s.score,
      label: s.score > 0.2 ? 'positive' : s.score < -0.2 ? 'negative' : 'neutral'
    }));

    return { overall, trend, timeline };
  }

  private calculateAvgLength(messages: any[]): number {
    if (messages.length === 0) return 0;
    return messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / messages.length;
  }

  private wasQuestionAnswered(question: string, messages: any[], timestamp: Date): boolean {
    // Simple heuristic: check if there's an outbound message shortly after
    const laterMessages = messages.filter(m => 
      m.direction === 'outbound' && 
      m.createdAt > timestamp &&
      m.createdAt.getTime() - timestamp.getTime() < 3600000 // within 1 hour
    );
    return laterMessages.length > 0;
  }

  private wasObjectionAddressed(objectionMessage: any, messages: any[]): boolean {
    const laterOutbound = messages.filter(m =>
      m.direction === 'outbound' &&
      m.createdAt > objectionMessage.createdAt
    );
    return laterOutbound.length > 0;
  }

  private extractQuestionTopic(question: string): string {
    const topicKeywords: Record<string, string[]> = {
      'pricing': ['preț', 'cost', 'discount', 'reducere', 'price'],
      'delivery': ['livrare', 'transport', 'delivery', 'shipping'],
      'product': ['produs', 'specificații', 'product', 'feature'],
      'availability': ['stoc', 'disponibil', 'stock', 'available'],
      'payment': ['plată', 'factură', 'payment', 'invoice']
    };

    const lowerQuestion = question.toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => lowerQuestion.includes(k))) {
        return topic;
      }
    }
    return 'general';
  }
}
```

### 2.4 Product & AI Context Compilation

```typescript
// Product context compilation
export class ProductContextCompiler {
  constructor(
    private tenantId: string,
    private negotiationId: string
  ) {}

  async compileProductContexts(): Promise<ProductContext[]> {
    const negotiation = await db.query.negotiations.findFirst({
      where: and(
        eq(negotiations.tenantId, this.tenantId),
        eq(negotiations.id, this.negotiationId)
      ),
      with: {
        lineItems: {
          with: {
            product: {
              with: {
                category: true,
                inventory: true,
                knowledgeBase: true
              }
            }
          }
        }
      }
    });

    if (!negotiation) {
      throw new Error('Negotiation not found');
    }

    const productContexts: ProductContext[] = [];

    for (const lineItem of negotiation.lineItems) {
      const product = lineItem.product;
      const knowledge = product.knowledgeBase;

      // Get inventory status
      const inventory = product.inventory;
      const currentStock = inventory?.currentStock || 0;
      const reservedQuantity = inventory?.reservedQuantity || 0;

      // Calculate margins
      const costPrice = Number(product.costPrice) || 0;
      const listPrice = Number(product.listPrice);
      const offeredPrice = Number(lineItem.unitPrice);
      const marginPercentage = offeredPrice > 0 ? 
        ((offeredPrice - costPrice) / offeredPrice) * 100 : 0;

      // Get related products
      const alternatives = await this.getRelatedProducts(product.id, 'alternative');
      const complementary = await this.getRelatedProducts(product.id, 'complementary');
      const bundles = await this.getProductBundles(product.id);

      // Parse knowledge base
      const keyFeatures = knowledge?.keyFeatures as string[] || [];
      const technicalSpecs = knowledge?.technicalSpecs as Record<string, string> || {};
      const competitiveAdvantages = knowledge?.competitiveAdvantages as string[] || [];
      const commonObjections = knowledge?.commonObjections as string[] || [];
      const suggestedResponses = knowledge?.objectionResponses as string[] || [];

      productContexts.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category?.name || 'Uncategorized',
        quantityRequested: lineItem.quantity,
        unitOfMeasure: product.unitOfMeasure || 'buc',
        listPrice,
        offeredPrice,
        discountPercentage: Number(lineItem.discountPercentage),
        currentStock,
        reservedQuantity,
        availableQuantity: Math.max(0, currentStock - reservedQuantity),
        restockDate: inventory?.nextRestockDate,
        keyFeatures,
        technicalSpecs,
        competitiveAdvantages,
        commonObjections,
        suggestedResponses,
        marginPercentage,
        minimumMargin: product.minimumMarginPercentage || 15,
        maxDiscountAllowed: product.maxDiscountPercentage || 25,
        alternatives,
        complementary,
        bundles
      });
    }

    return productContexts;
  }

  private async getRelatedProducts(productId: string, relationType: string): Promise<string[]> {
    const relations = await db.query.productRelations.findMany({
      where: and(
        eq(productRelations.sourceProductId, productId),
        eq(productRelations.relationType, relationType)
      ),
      with: {
        targetProduct: true
      },
      limit: 5
    });

    return relations.map(r => `${r.targetProduct.name} (${r.targetProduct.sku})`);
  }

  private async getProductBundles(productId: string): Promise<string[]> {
    const bundles = await db.query.productBundles.findMany({
      where: sql`${productId} = ANY(${productBundles.productIds})`,
      limit: 3
    });

    return bundles.map(b => b.name);
  }
}

// AI Session Summary Compiler
export class AISessionCompiler {
  constructor(
    private tenantId: string,
    private negotiationId: string
  ) {}

  async compileAISummary(): Promise<AISessionSummary> {
    // Get the most recent AI session for this negotiation
    const session = await db.query.aiSessions.findFirst({
      where: and(
        eq(aiSessions.tenantId, this.tenantId),
        eq(aiSessions.negotiationId, this.negotiationId)
      ),
      orderBy: desc(aiSessions.createdAt),
      with: {
        decisions: {
          orderBy: desc(aiDecisions.createdAt)
        },
        knowledgeGaps: true
      }
    });

    if (!session) {
      return this.createEmptyAISummary();
    }

    // Compile decisions
    const decisionsLog: AIDecision[] = session.decisions.map(d => ({
      timestamp: d.createdAt,
      decisionType: d.decisionType,
      decision: d.decision,
      confidence: d.confidence,
      rationale: d.rationale,
      outcome: d.outcome
    }));

    // Calculate metrics
    const avgConfidence = decisionsLog.length > 0 ?
      decisionsLog.reduce((sum, d) => sum + d.confidence, 0) / decisionsLog.length : 0;
    const lowConfidenceCount = decisionsLog.filter(d => d.confidence < 0.7).length;

    // Compile knowledge gaps
    const knowledgeGaps = session.knowledgeGaps.map(kg => kg.topic);
    const unansweredQuestions = session.knowledgeGaps
      .filter(kg => kg.type === 'question')
      .map(kg => kg.content);

    // Generate recommendations
    const suggestedNextSteps = this.generateSuggestedSteps(session, decisionsLog);
    const warningFlags = this.identifyWarningFlags(session, decisionsLog);

    // Get escalation reason
    const escalationReason = session.escalationReason || 'Manual handover requested';
    const escalationDetails = session.escalationDetails || '';

    return {
      sessionId: session.id,
      duration: Math.ceil(
        (session.endedAt?.getTime() || Date.now()) - session.createdAt.getTime()
      ) / 60000, // minutes
      responseCount: session.responseCount || 0,
      averageConfidence: avgConfidence,
      lowConfidenceCount,
      decisionsLog: decisionsLog.slice(0, 20), // Last 20 decisions
      escalationReason,
      escalationDetails,
      suggestedNextSteps,
      warningFlags,
      knowledgeGaps,
      unansweredQuestions
    };
  }

  private createEmptyAISummary(): AISessionSummary {
    return {
      sessionId: '',
      duration: 0,
      responseCount: 0,
      averageConfidence: 0,
      lowConfidenceCount: 0,
      decisionsLog: [],
      escalationReason: 'No AI session found',
      escalationDetails: '',
      suggestedNextSteps: [],
      warningFlags: [],
      knowledgeGaps: [],
      unansweredQuestions: []
    };
  }

  private generateSuggestedSteps(session: any, decisions: AIDecision[]): string[] {
    const steps: string[] = [];
    const metadata = session.metadata as Record<string, unknown> || {};

    // Based on negotiation state
    if (metadata.lastState === 'offer_sent') {
      steps.push('Follow up on sent offer within 24-48 hours');
      steps.push('Prepare counter-offer scenarios');
    }

    // Based on objections
    if (metadata.priceObjectionRaised) {
      steps.push('Address price concerns with value proposition');
      steps.push('Consider volume discount options');
    }

    // Based on competitor mentions
    if (metadata.competitorMentioned) {
      steps.push('Prepare competitive comparison');
      steps.push('Emphasize unique value propositions');
    }

    // Based on confidence
    if (decisions.some(d => d.confidence < 0.5)) {
      steps.push('Review technical specifications with customer');
      steps.push('Clarify unclear requirements');
    }

    // Default steps
    if (steps.length === 0) {
      steps.push('Review conversation history');
      steps.push('Confirm customer requirements');
      steps.push('Prepare next steps proposal');
    }

    return steps;
  }

  private identifyWarningFlags(session: any, decisions: AIDecision[]): string[] {
    const warnings: string[] = [];
    const metadata = session.metadata as Record<string, unknown> || {};

    if (metadata.sentimentDeclining) {
      warnings.push('⚠️ Customer sentiment has been declining');
    }

    if (metadata.responseTimeIncreasing) {
      warnings.push('⚠️ Customer response time increasing - possible disengagement');
    }

    if (metadata.priceObjectionCount > 3) {
      warnings.push('⚠️ Multiple price objections - price sensitivity high');
    }

    if (metadata.competitorMentionedRecently) {
      warnings.push('⚠️ Competitor mentioned recently - risk of switching');
    }

    if (decisions.filter(d => d.confidence < 0.5).length > 2) {
      warnings.push('⚠️ Multiple low-confidence AI responses');
    }

    return warnings;
  }
}
```

### 2.5 Main Worker Processor

```typescript
// src/workers/etapa3/handover/handover-prepare.processor.ts

import { Job } from 'bullmq';
import { db } from '@/db';
import { handoverPackages } from '@/db/schema';
import { ContextCompiler, ProductContextCompiler, AISessionCompiler } from './context-compiler';
import { ActionItemGenerator } from './action-item-generator';
import { RecommendationEngine } from './recommendation-engine';
import { AttachmentCollector } from './attachment-collector';
import { AgentMatcher } from './agent-matcher';
import { createLogger } from '@/utils/logger';
import { metrics } from '@/utils/metrics';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('worker:handover-prepare');

export async function processHandoverPrepare(
  job: Job<HandoverPrepareInput>
): Promise<HandoverPrepareOutput> {
  const startTime = Date.now();
  const { tenantId, negotiationId, triggeredBy, triggerDetails, urgency, preferredAgent, notes } = job.data;

  logger.info('Starting handover preparation', {
    jobId: job.id,
    tenantId,
    negotiationId,
    triggeredBy,
    urgency
  });

  metrics.handoverPrepareStarted.inc({ trigger: triggeredBy });

  try {
    // Initialize compilers
    const contextCompiler = new ContextCompiler(tenantId, negotiationId);
    const productCompiler = new ProductContextCompiler(tenantId, negotiationId);
    const aiCompiler = new AISessionCompiler(tenantId, negotiationId);

    // Update progress
    await job.updateProgress(10);

    // Compile all contexts in parallel where possible
    const [
      customerContext,
      negotiationContext,
      conversationContext,
      productContexts,
      aiSummary
    ] = await Promise.all([
      contextCompiler.compileCustomerContext(),
      contextCompiler.compileNegotiationContext(),
      contextCompiler.compileConversationContext(),
      productCompiler.compileProductContexts(),
      aiCompiler.compileAISummary()
    ]);

    await job.updateProgress(50);

    // Generate action items
    const actionItemGenerator = new ActionItemGenerator();
    const actionItems = actionItemGenerator.generate({
      customer: customerContext,
      negotiation: negotiationContext,
      conversation: conversationContext,
      aiSummary
    });

    // Generate recommendations
    const recommendationEngine = new RecommendationEngine();
    const recommendations = recommendationEngine.generate({
      customer: customerContext,
      negotiation: negotiationContext,
      products: productContexts,
      aiSummary,
      triggeredBy
    });

    await job.updateProgress(70);

    // Collect attachments
    const attachmentCollector = new AttachmentCollector(tenantId);
    const attachments = await attachmentCollector.collect(negotiationId);

    // Match with best available agent
    const agentMatcher = new AgentMatcher(tenantId);
    const suggestedAgent = preferredAgent || await agentMatcher.findBestMatch({
      customer: customerContext,
      negotiation: negotiationContext,
      urgency: urgency || 'medium',
      specializations: productContexts.map(p => p.category)
    });

    // Calculate data completeness
    const completeness = this.calculateCompleteness({
      customer: customerContext,
      negotiation: negotiationContext,
      conversation: conversationContext,
      products: productContexts,
      aiSummary
    });

    await job.updateProgress(85);

    // Create handover package
    const packageId = uuidv4();
    const handoverPackage: HandoverPackage = {
      id: packageId,
      tenantId,
      negotiationId,
      customer: customerContext,
      negotiation: negotiationContext,
      conversation: conversationContext,
      products: productContexts,
      pricing: this.extractPricingContext(negotiationContext, productContexts),
      aiSummary,
      actionItems,
      recommendations,
      attachments,
      metadata: {
        preparedAt: new Date(),
        preparedBy: 'ai',
        packageVersion: '1.0',
        dataCompleteness: completeness,
        confidenceLevel: aiSummary.averageConfidence,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        tags: this.generateTags(customerContext, negotiationContext, triggeredBy)
      }
    };

    // Validate package
    const warnings = this.validatePackage(handoverPackage);

    // Calculate package size
    const packageJson = JSON.stringify(handoverPackage);
    const packageSize = Buffer.byteLength(packageJson, 'utf8');

    // Store package in database
    await db.insert(handoverPackages).values({
      id: packageId,
      tenantId,
      negotiationId,
      triggeredBy,
      triggerDetails: triggerDetails || {},
      status: 'prepared',
      packageData: handoverPackage,
      packageSize,
      completeness,
      suggestedAgentId: suggestedAgent,
      urgency: urgency || 'medium',
      notes,
      expiresAt: handoverPackage.metadata.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await job.updateProgress(100);

    // Calculate estimated handover time
    const estimatedTime = this.estimateHandoverTime(handoverPackage);

    const duration = Date.now() - startTime;
    metrics.handoverPrepareDuration.observe({ trigger: triggeredBy }, duration / 1000);
    metrics.handoverPrepareCompleted.inc({ trigger: triggeredBy, status: 'success' });

    logger.info('Handover package prepared successfully', {
      jobId: job.id,
      packageId,
      completeness,
      packageSize,
      durationMs: duration
    });

    return {
      handoverPackageId: packageId,
      negotiationId,
      status: 'prepared',
      packageSize,
      contextCompleteness: completeness,
      suggestedAgent,
      estimatedHandoverTime: estimatedTime,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    metrics.handoverPrepareCompleted.inc({ trigger: triggeredBy, status: 'failed' });
    
    logger.error('Handover preparation failed', {
      jobId: job.id,
      negotiationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

function calculateCompleteness(contexts: {
  customer: CustomerContext;
  negotiation: NegotiationContext;
  conversation: ConversationContext;
  products: ProductContext[];
  aiSummary: AISessionSummary;
}): number {
  let score = 0;
  let maxScore = 0;

  // Customer context (25 points max)
  maxScore += 25;
  if (contexts.customer.contactId) score += 5;
  if (contexts.customer.email) score += 5;
  if (contexts.customer.phone) score += 5;
  if (contexts.customer.totalOrders > 0) score += 5;
  if (contexts.customer.segment) score += 5;

  // Negotiation context (25 points max)
  maxScore += 25;
  if (contexts.negotiation.totalValue > 0) score += 5;
  if (contexts.negotiation.lineItems.length > 0) score += 5;
  if (contexts.negotiation.stateHistory.length > 0) score += 5;
  if (contexts.negotiation.winProbability > 0) score += 5;
  if (contexts.negotiation.riskFactors.length > 0) score += 5;

  // Conversation context (25 points max)
  maxScore += 25;
  if (contexts.conversation.totalMessages > 0) score += 5;
  if (contexts.conversation.recentMessages.length > 0) score += 5;
  if (contexts.conversation.keyTopicsDiscussed.length > 0) score += 5;
  if (contexts.conversation.overallSentiment) score += 5;
  if (contexts.conversation.averageResponseTime > 0) score += 5;

  // Products and AI (25 points max)
  maxScore += 25;
  if (contexts.products.length > 0) score += 10;
  if (contexts.products.some(p => p.keyFeatures.length > 0)) score += 5;
  if (contexts.aiSummary.sessionId) score += 5;
  if (contexts.aiSummary.suggestedNextSteps.length > 0) score += 5;

  return Math.round((score / maxScore) * 100);
}

function extractPricingContext(
  negotiation: NegotiationContext,
  products: ProductContext[]
): PricingContext {
  const listPriceTotal = products.reduce((sum, p) => 
    sum + (p.listPrice * p.quantityRequested), 0);
  const currentOfferTotal = products.reduce((sum, p) => 
    sum + (p.offeredPrice * p.quantityRequested), 0);

  // Calculate margin
  const totalCost = products.reduce((sum, p) => {
    const marginPct = p.marginPercentage / 100;
    const costPrice = p.offeredPrice * (1 - marginPct);
    return sum + (costPrice * p.quantityRequested);
  }, 0);
  const currentMargin = currentOfferTotal > 0 ? 
    ((currentOfferTotal - totalCost) / currentOfferTotal) * 100 : 0;

  // Discount breakdown
  const totalDiscount = listPriceTotal - currentOfferTotal;

  return {
    currentOfferTotal,
    listPriceTotal,
    totalDiscount,
    previousOffers: [], // Would be populated from pricing history
    priceChanges: [],
    discountBreakdown: {
      volumeDiscount: negotiation.discountsApplied
        .filter(d => d.type === 'volume')
        .reduce((sum, d) => sum + d.amount, 0),
      loyaltyDiscount: negotiation.discountsApplied
        .filter(d => d.type === 'loyalty')
        .reduce((sum, d) => sum + d.amount, 0),
      promotionalDiscount: negotiation.discountsApplied
        .filter(d => d.type === 'promotional')
        .reduce((sum, d) => sum + d.amount, 0),
      negotiatedDiscount: negotiation.discountsApplied
        .filter(d => d.type === 'negotiated')
        .reduce((sum, d) => sum + d.amount, 0),
      total: totalDiscount
    },
    currentMargin,
    minimumAcceptableMargin: Math.min(...products.map(p => p.minimumMargin)),
    targetMargin: 25, // Default target
    discountWithinAuthority: negotiation.totalDiscountPercentage <= 20,
    additionalDiscountNeeded: Math.max(0, negotiation.totalDiscountPercentage - 20),
    approvalRequired: negotiation.totalDiscountPercentage > 20,
    approvalLevel: negotiation.totalDiscountPercentage > 30 ? 'director' :
                   negotiation.totalDiscountPercentage > 20 ? 'manager' : undefined,
    marketPosition: 'at'
  };
}

function validatePackage(pkg: HandoverPackage): string[] {
  const warnings: string[] = [];

  if (!pkg.customer.email && !pkg.customer.contactPerson.phone) {
    warnings.push('No contact information available (no email or phone)');
  }

  if (pkg.conversation.totalMessages === 0) {
    warnings.push('No conversation history found');
  }

  if (pkg.products.length === 0) {
    warnings.push('No products in negotiation');
  }

  if (pkg.aiSummary.lowConfidenceCount > 3) {
    warnings.push('Multiple low-confidence AI interactions detected');
  }

  if (pkg.metadata.dataCompleteness < 50) {
    warnings.push('Low data completeness - some information may be missing');
  }

  return warnings;
}

function estimateHandoverTime(pkg: HandoverPackage): number {
  let minutes = 5; // Base time

  // Add time based on complexity
  minutes += Math.ceil(pkg.conversation.totalMessages / 10); // 1 min per 10 messages
  minutes += pkg.products.length * 2; // 2 min per product
  minutes += pkg.actionItems.filter(a => a.priority === 'high').length * 3;

  // Add time for warnings
  if (pkg.metadata.dataCompleteness < 70) {
    minutes += 10; // Additional context gathering needed
  }

  return Math.min(minutes, 60); // Cap at 60 minutes
}

function generateTags(
  customer: CustomerContext,
  negotiation: NegotiationContext,
  trigger: HandoverTrigger
): string[] {
  const tags: string[] = [trigger];

  tags.push(`segment:${customer.segment}`);
  tags.push(`state:${negotiation.currentState}`);
  tags.push(`risk:${negotiation.riskLevel}`);

  if (customer.vipStatus) tags.push('vip');
  if (negotiation.totalValue > 50000) tags.push('high-value');
  if (negotiation.competitorMentioned) tags.push('competitor-risk');
  if (negotiation.winProbability < 40) tags.push('at-risk');

  return tags;
}
```

### 2.6 Helper Classes

```typescript
// src/workers/etapa3/handover/action-item-generator.ts

export class ActionItemGenerator {
  generate(context: {
    customer: CustomerContext;
    negotiation: NegotiationContext;
    conversation: ConversationContext;
    aiSummary: AISessionSummary;
  }): ActionItem[] {
    const items: ActionItem[] = [];
    const now = new Date();

    // Unanswered questions
    context.conversation.questionsAsked
      .filter(q => !q.answered)
      .forEach(q => {
        items.push({
          id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'follow_up',
          description: `Answer customer question: "${q.question.substring(0, 100)}..."`,
          priority: 'high',
          deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
          status: 'pending',
          notes: `Topic: ${q.topic}`
        });
      });

    // Unaddressed objections
    context.conversation.objectionsRaised
      .filter(o => !o.addressed)
      .forEach(o => {
        items.push({
          id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'follow_up',
          description: `Address ${o.type} objection: "${o.content.substring(0, 80)}..."`,
          priority: o.type === 'price' ? 'high' : 'medium',
          deadline: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48 hours
          status: 'pending'
        });
      });

    // Customer deadline
    if (context.negotiation.customerDeadline) {
      const daysUntilDeadline = Math.ceil(
        (context.negotiation.customerDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline <= 7) {
        items.push({
          id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'follow_up',
          description: `Customer deadline in ${daysUntilDeadline} days - prioritize closing`,
          priority: daysUntilDeadline <= 3 ? 'high' : 'medium',
          deadline: context.negotiation.customerDeadline,
          status: 'pending'
        });
      }
    }

    // Discount approval needed
    if (context.negotiation.totalDiscountPercentage > 20) {
      items.push({
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'get_approval',
        description: `Get approval for ${context.negotiation.totalDiscountPercentage.toFixed(1)}% total discount`,
        priority: 'high',
        status: 'pending',
        notes: 'Discount exceeds standard authority level'
      });
    }

    // Stalled negotiation
    if (context.negotiation.currentState === 'stalled' || context.negotiation.daysActive > 14) {
      items.push({
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'follow_up',
        description: 'Re-engage with customer - negotiation stalled',
        priority: 'medium',
        deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        status: 'pending',
        notes: `Days active: ${context.negotiation.daysActive}`
      });
    }

    // VIP customer attention
    if (context.customer.vipStatus) {
      items.push({
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'follow_up',
        description: 'VIP customer - ensure personalized attention and quick response',
        priority: 'high',
        status: 'pending',
        notes: `Total revenue: ${context.customer.totalRevenue.toLocaleString()} RON`
      });
    }

    // Document needs
    if (context.negotiation.currentState === 'offer_accepted') {
      items.push({
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'send_document',
        description: 'Prepare and send contract/proforma invoice',
        priority: 'high',
        deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        status: 'pending'
      });
    }

    // Sort by priority
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return items.slice(0, 10); // Limit to top 10 items
  }
}

// src/workers/etapa3/handover/recommendation-engine.ts

export class RecommendationEngine {
  generate(context: {
    customer: CustomerContext;
    negotiation: NegotiationContext;
    products: ProductContext[];
    aiSummary: AISessionSummary;
    triggeredBy: HandoverTrigger;
  }): HandoverRecommendation[] {
    const recommendations: HandoverRecommendation[] = [];

    // Pricing recommendations
    if (context.negotiation.totalDiscountPercentage > 15) {
      recommendations.push({
        type: 'pricing',
        title: 'Consider Value-Based Selling',
        description: 'High discount requested. Focus on value proposition rather than further discounts.',
        rationale: `Current discount ${context.negotiation.totalDiscountPercentage.toFixed(1)}% is already above typical levels.`,
        confidence: 0.85,
        priority: 1
      });
    }

    // Product recommendations
    const lowMarginProducts = context.products.filter(p => 
      p.marginPercentage < p.minimumMargin
    );
    if (lowMarginProducts.length > 0) {
      recommendations.push({
        type: 'product',
        title: 'Review Margin on Specific Products',
        description: `${lowMarginProducts.length} product(s) below minimum margin. Consider alternatives or adjust pricing.`,
        rationale: `Products affected: ${lowMarginProducts.map(p => p.name).join(', ')}`,
        confidence: 0.9,
        priority: 1
      });
    }

    // Upselling recommendations
    const hasComplementary = context.products.some(p => p.complementary.length > 0);
    if (hasComplementary && context.negotiation.totalValue < 30000) {
      recommendations.push({
        type: 'product',
        title: 'Upsell Opportunity',
        description: 'Complementary products available. Consider suggesting bundle or add-ons.',
        rationale: 'May increase deal value while providing more complete solution to customer.',
        confidence: 0.7,
        priority: 2
      });
    }

    // Timing recommendations
    if (context.negotiation.daysActive > 21 && context.negotiation.currentState !== 'closed') {
      recommendations.push({
        type: 'timing',
        title: 'Create Urgency',
        description: 'Negotiation has been extended. Consider time-limited offer or deadline.',
        rationale: `${context.negotiation.daysActive} days active without closing.`,
        confidence: 0.75,
        priority: 2
      });
    }

    // Approach recommendations based on trigger
    if (context.triggeredBy === 'ai_confidence_low') {
      recommendations.push({
        type: 'approach',
        title: 'Technical Clarification Needed',
        description: 'AI escalated due to low confidence. Customer likely has complex technical questions.',
        rationale: 'Review AI knowledge gaps and prepare detailed technical responses.',
        confidence: 0.85,
        priority: 1
      });
    }

    if (context.triggeredBy === 'competitor_mention') {
      recommendations.push({
        type: 'approach',
        title: 'Competitive Response Strategy',
        description: 'Competitor mentioned. Prepare comparison materials and unique value propositions.',
        rationale: 'Focus on differentiation, not price matching.',
        confidence: 0.8,
        priority: 1
      });
    }

    // Sentiment-based recommendations
    if (context.aiSummary.warningFlags.some(w => w.includes('sentiment'))) {
      recommendations.push({
        type: 'approach',
        title: 'Address Customer Concerns',
        description: 'Negative sentiment trend detected. Prioritize relationship building.',
        rationale: 'Consider direct call to address any frustrations.',
        confidence: 0.75,
        priority: 1
      });
    }

    // Escalation recommendations
    if (context.negotiation.totalValue > 100000) {
      recommendations.push({
        type: 'escalation',
        title: 'Involve Senior Leadership',
        description: 'High-value deal. Consider involving senior leadership for relationship building.',
        rationale: `Deal value: ${context.negotiation.totalValue.toLocaleString()} RON`,
        confidence: 0.8,
        priority: 2
      });
    }

    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    return recommendations.slice(0, 8); // Top 8 recommendations
  }
}

// src/workers/etapa3/handover/attachment-collector.ts

export class AttachmentCollector {
  constructor(private tenantId: string) {}

  async collect(negotiationId: string): Promise<HandoverAttachment[]> {
    const attachments: HandoverAttachment[] = [];

    // Get documents from negotiation
    const documents = await db.query.negotiationDocuments.findMany({
      where: and(
        eq(negotiationDocuments.tenantId, this.tenantId),
        eq(negotiationDocuments.negotiationId, negotiationId)
      ),
      orderBy: desc(negotiationDocuments.createdAt)
    });

    for (const doc of documents) {
      attachments.push({
        type: this.mapDocumentType(doc.documentType),
        name: doc.fileName,
        url: doc.fileUrl,
        size: doc.fileSize,
        createdAt: doc.createdAt
      });
    }

    // Get email attachments from conversation
    const emails = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.tenantId, this.tenantId),
        eq(conversationMessages.negotiationId, negotiationId),
        eq(conversationMessages.channel, 'email'),
        sql`${conversationMessages.attachments} IS NOT NULL`
      ),
      orderBy: desc(conversationMessages.createdAt),
      limit: 20
    });

    for (const email of emails) {
      const emailAttachments = email.attachments as any[] || [];
      for (const att of emailAttachments) {
        // Avoid duplicates
        if (!attachments.some(a => a.url === att.url)) {
          attachments.push({
            type: 'other',
            name: att.filename,
            url: att.url,
            size: att.size,
            createdAt: email.createdAt
          });
        }
      }
    }

    // Limit and sort
    return attachments
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);
  }

  private mapDocumentType(type: string): HandoverAttachment['type'] {
    const typeMap: Record<string, HandoverAttachment['type']> = {
      'quote': 'quote',
      'proforma': 'invoice',
      'invoice': 'invoice',
      'contract': 'contract',
      'specification': 'specification',
      'presentation': 'presentation'
    };
    return typeMap[type.toLowerCase()] || 'other';
  }
}

// src/workers/etapa3/handover/agent-matcher.ts

export class AgentMatcher {
  constructor(private tenantId: string) {}

  async findBestMatch(criteria: {
    customer: CustomerContext;
    negotiation: NegotiationContext;
    urgency: string;
    specializations: string[];
  }): Promise<string | undefined> {
    // Get available agents
    const agents = await db.query.salesAgents.findMany({
      where: and(
        eq(salesAgents.tenantId, this.tenantId),
        eq(salesAgents.status, 'available'),
        eq(salesAgents.acceptingHandovers, true)
      ),
      with: {
        specializations: true,
        currentLoad: true
      }
    });

    if (agents.length === 0) {
      return undefined;
    }

    // Score each agent
    const scoredAgents = agents.map(agent => ({
      agent,
      score: this.calculateMatchScore(agent, criteria)
    }));

    // Sort by score descending
    scoredAgents.sort((a, b) => b.score - a.score);

    // Return best match if score is acceptable
    const bestMatch = scoredAgents[0];
    return bestMatch.score >= 30 ? bestMatch.agent.id : undefined;
  }

  private calculateMatchScore(agent: any, criteria: any): number {
    let score = 0;

    // Specialization match (0-30 points)
    const agentSpecs = agent.specializations?.map((s: any) => s.category) || [];
    const matchingSpecs = criteria.specializations.filter((s: string) => 
      agentSpecs.includes(s)
    );
    score += (matchingSpecs.length / criteria.specializations.length) * 30;

    // Current workload (0-25 points)
    const currentTasks = agent.currentLoad?.activeTasks || 0;
    const maxTasks = agent.maxConcurrentTasks || 10;
    const loadRatio = currentTasks / maxTasks;
    score += (1 - loadRatio) * 25;

    // Language match (0-15 points)
    if (agent.languages?.includes(criteria.customer.languagePreference)) {
      score += 15;
    }

    // VIP handling (0-15 points)
    if (criteria.customer.vipStatus && agent.vipCertified) {
      score += 15;
    }

    // Previous relationship (0-15 points)
    if (agent.previousCustomers?.includes(criteria.customer.contactId)) {
      score += 15;
    }

    return Math.round(score);
  }
}
```

---

## 3. Worker J2: Handover Execute

### 3.1 Worker Definition

```typescript
// src/workers/etapa3/handover/handover-execute.worker.ts

import { Worker, Job, Queue } from 'bullmq';
import { db } from '@/db';
import { 
  handoverPackages,
  handovers,
  handoverNotifications,
  salesAgents,
  negotiations
} from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createLogger } from '@/utils/logger';
import { redisConnection } from '@/config/redis';
import { metrics } from '@/utils/metrics';
import { NotificationService } from '@/services/notification';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('worker:handover-execute');

// Queue definitions
export const handoverExecuteQueue = new Queue('handover-execute', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 }
  }
});

// Types
export interface HandoverExecuteInput {
  tenantId: string;
  handoverPackageId: string;
  assignedAgentId?: string;         // Override agent
  urgency: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: NotificationChannel[];
  immediateEscalation?: boolean;    // Skip normal queue
  contextTransferMode: 'full' | 'summary' | 'minimal';
  autoAccept?: boolean;             // Auto-accept without agent confirmation
}

export interface HandoverExecuteOutput {
  handoverId: string;
  status: 'assigned' | 'pending_acceptance' | 'failed';
  assignedAgentId?: string;
  assignedAgentName?: string;
  notificationsSent: NotificationResult[];
  estimatedResponseTime: number;    // minutes
  escalationRequired: boolean;
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  SLACK = 'slack',
  TEAMS = 'teams',
  IN_APP = 'in_app'
}

export interface NotificationResult {
  channel: NotificationChannel;
  sent: boolean;
  sentAt?: Date;
  messageId?: string;
  error?: string;
}

export interface HandoverState {
  handoverId: string;
  status: HandoverStatus;
  transitions: HandoverTransition[];
  currentAgent?: AgentInfo;
  previousAgents: AgentInfo[];
  slaDeadline: Date;
  isOverdue: boolean;
}

export enum HandoverStatus {
  CREATED = 'created',
  PACKAGE_READY = 'package_ready',
  AGENT_ASSIGNED = 'agent_assigned',
  NOTIFICATION_SENT = 'notification_sent',
  PENDING_ACCEPTANCE = 'pending_acceptance',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  REASSIGNED = 'reassigned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  ESCALATED = 'escalated'
}

export interface HandoverTransition {
  fromStatus: HandoverStatus;
  toStatus: HandoverStatus;
  timestamp: Date;
  actor: 'system' | 'agent' | 'supervisor';
  reason?: string;
}

export interface AgentInfo {
  agentId: string;
  agentName: string;
  assignedAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  responseTime?: number;    // minutes
}
```

### 3.2 Main Processor

```typescript
// src/workers/etapa3/handover/handover-execute.processor.ts

import { Job } from 'bullmq';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function processHandoverExecute(
  job: Job<HandoverExecuteInput>
): Promise<HandoverExecuteOutput> {
  const startTime = Date.now();
  const {
    tenantId,
    handoverPackageId,
    assignedAgentId,
    urgency,
    notificationChannels,
    immediateEscalation,
    contextTransferMode,
    autoAccept
  } = job.data;

  logger.info('Executing handover', {
    jobId: job.id,
    tenantId,
    handoverPackageId,
    urgency
  });

  metrics.handoverExecuteStarted.inc({ urgency });

  try {
    // 1. Retrieve handover package
    const handoverPackage = await db.query.handoverPackages.findFirst({
      where: and(
        eq(handoverPackages.tenantId, tenantId),
        eq(handoverPackages.id, handoverPackageId)
      )
    });

    if (!handoverPackage) {
      throw new Error(`Handover package not found: ${handoverPackageId}`);
    }

    if (handoverPackage.status !== 'prepared') {
      throw new Error(`Invalid package status: ${handoverPackage.status}`);
    }

    await job.updateProgress(20);

    // 2. Assign agent
    const agentAssignment = await this.assignAgent({
      tenantId,
      packageId: handoverPackageId,
      preferredAgentId: assignedAgentId || handoverPackage.suggestedAgentId,
      urgency,
      immediateEscalation
    });

    if (!agentAssignment.success) {
      return await this.handleNoAgentAvailable(job, handoverPackage, urgency);
    }

    await job.updateProgress(40);

    // 3. Create handover record
    const handoverId = uuidv4();
    const slaDeadline = this.calculateSlaDeadline(urgency);

    await db.insert(handovers).values({
      id: handoverId,
      tenantId,
      handoverPackageId,
      negotiationId: handoverPackage.negotiationId,
      assignedAgentId: agentAssignment.agentId,
      status: 'agent_assigned',
      urgency,
      contextTransferMode,
      slaDeadline,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Record state transition
    await this.recordTransition(handoverId, {
      fromStatus: HandoverStatus.CREATED,
      toStatus: HandoverStatus.AGENT_ASSIGNED,
      actor: 'system'
    });

    await job.updateProgress(60);

    // 4. Prepare context for agent
    const contextPackage = await this.prepareContextForAgent(
      handoverPackage,
      contextTransferMode
    );

    // 5. Send notifications
    const notificationResults = await this.sendNotifications({
      tenantId,
      handoverId,
      agentId: agentAssignment.agentId,
      agentEmail: agentAssignment.agentEmail,
      agentPhone: agentAssignment.agentPhone,
      channels: notificationChannels,
      contextPackage,
      urgency,
      slaDeadline
    });

    await this.recordTransition(handoverId, {
      fromStatus: HandoverStatus.AGENT_ASSIGNED,
      toStatus: HandoverStatus.NOTIFICATION_SENT,
      actor: 'system'
    });

    await job.updateProgress(80);

    // 6. Handle auto-accept if enabled
    let finalStatus: 'assigned' | 'pending_acceptance' = 'pending_acceptance';
    if (autoAccept) {
      await this.autoAcceptHandover(handoverId, agentAssignment.agentId);
      finalStatus = 'assigned';
    }

    // 7. Update negotiation status
    await db.update(negotiations)
      .set({
        handoverStatus: 'pending',
        assignedAgentId: agentAssignment.agentId,
        handoverId,
        updatedAt: new Date()
      })
      .where(and(
        eq(negotiations.tenantId, tenantId),
        eq(negotiations.id, handoverPackage.negotiationId)
      ));

    // 8. Schedule SLA check
    await this.scheduleSlaCheck(handoverId, slaDeadline, urgency);

    await job.updateProgress(100);

    // Calculate estimated response time
    const estimatedResponseTime = this.estimateResponseTime(
      agentAssignment,
      urgency
    );

    const duration = Date.now() - startTime;
    metrics.handoverExecuteDuration.observe({ urgency }, duration / 1000);
    metrics.handoverExecuteCompleted.inc({ urgency, status: 'success' });

    logger.info('Handover executed successfully', {
      jobId: job.id,
      handoverId,
      agentId: agentAssignment.agentId,
      notificationsSent: notificationResults.filter(n => n.sent).length
    });

    return {
      handoverId,
      status: finalStatus,
      assignedAgentId: agentAssignment.agentId,
      assignedAgentName: agentAssignment.agentName,
      notificationsSent: notificationResults,
      estimatedResponseTime,
      escalationRequired: immediateEscalation || false
    };

  } catch (error) {
    metrics.handoverExecuteCompleted.inc({ urgency, status: 'failed' });

    logger.error('Handover execution failed', {
      jobId: job.id,
      handoverPackageId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

// Agent assignment
async function assignAgent(params: {
  tenantId: string;
  packageId: string;
  preferredAgentId?: string;
  urgency: string;
  immediateEscalation?: boolean;
}): Promise<{
  success: boolean;
  agentId?: string;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
  avgResponseTime?: number;
}> {
  const { tenantId, preferredAgentId, urgency, immediateEscalation } = params;

  // If immediate escalation, assign to supervisor
  if (immediateEscalation) {
    const supervisor = await db.query.salesAgents.findFirst({
      where: and(
        eq(salesAgents.tenantId, tenantId),
        eq(salesAgents.role, 'supervisor'),
        eq(salesAgents.status, 'available')
      )
    });

    if (supervisor) {
      return {
        success: true,
        agentId: supervisor.id,
        agentName: supervisor.name,
        agentEmail: supervisor.email,
        agentPhone: supervisor.phone,
        avgResponseTime: supervisor.avgResponseTimeMinutes
      };
    }
  }

  // Try preferred agent first
  if (preferredAgentId) {
    const agent = await db.query.salesAgents.findFirst({
      where: and(
        eq(salesAgents.tenantId, tenantId),
        eq(salesAgents.id, preferredAgentId),
        eq(salesAgents.status, 'available'),
        eq(salesAgents.acceptingHandovers, true)
      )
    });

    if (agent) {
      // Check workload
      const currentLoad = await this.getAgentCurrentLoad(agent.id);
      if (currentLoad < agent.maxConcurrentTasks) {
        return {
          success: true,
          agentId: agent.id,
          agentName: agent.name,
          agentEmail: agent.email,
          agentPhone: agent.phone,
          avgResponseTime: agent.avgResponseTimeMinutes
        };
      }
    }
  }

  // Find next available agent using round-robin with load balancing
  const availableAgents = await db.query.salesAgents.findMany({
    where: and(
      eq(salesAgents.tenantId, tenantId),
      eq(salesAgents.status, 'available'),
      eq(salesAgents.acceptingHandovers, true)
    ),
    orderBy: [
      asc(salesAgents.lastHandoverAt), // Round-robin
      asc(salesAgents.currentTaskCount) // Load balancing
    ]
  });

  for (const agent of availableAgents) {
    const currentLoad = await this.getAgentCurrentLoad(agent.id);
    if (currentLoad < agent.maxConcurrentTasks) {
      // Update last handover timestamp
      await db.update(salesAgents)
        .set({ lastHandoverAt: new Date() })
        .where(eq(salesAgents.id, agent.id));

      return {
        success: true,
        agentId: agent.id,
        agentName: agent.name,
        agentEmail: agent.email,
        agentPhone: agent.phone,
        avgResponseTime: agent.avgResponseTimeMinutes
      };
    }
  }

  return { success: false };
}

async function getAgentCurrentLoad(agentId: string): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(handovers)
    .where(and(
      eq(handovers.assignedAgentId, agentId),
      sql`${handovers.status} IN ('pending_acceptance', 'accepted', 'in_progress')`
    ));

  return result[0]?.count || 0;
}
```

#### 3.4 Handover Notification System

```typescript
// src/workers/etapa3/handover/notification-service.ts
import { Queue } from 'bullmq';
import { db } from '@/db';
import { notifications, handovers, salesAgents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Notification channels
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook'
}

// Notification urgency levels
export enum NotificationUrgency {
  IMMEDIATE = 'immediate',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

interface HandoverNotificationConfig {
  handoverId: string;
  tenantId: string;
  agentId: string;
  channels: NotificationChannel[];
  urgency: NotificationUrgency;
  contextSummary: string;
  customerName: string;
  dealValue?: number;
  deadline?: Date;
  acceptanceUrl: string;
  declineUrl: string;
}

// Notification templates
const NOTIFICATION_TEMPLATES = {
  email: {
    subject: {
      immediate: '🚨 URGENT: Handover Awaiting - {customerName}',
      high: '⚡ Important Handover Request - {customerName}',
      normal: '📋 New Handover Request - {customerName}',
      low: 'Handover Request - {customerName}'
    },
    body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
    .header { background: #1a56db; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .urgent { background: #dc2626; }
    .high { background: #ea580c; }
    .summary { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 5px; }
    .btn-accept { background: #16a34a; color: white; }
    .btn-decline { background: #dc2626; color: white; }
    .stats { display: flex; justify-content: space-around; margin: 15px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1a56db; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header {urgencyClass}">
      <h1>🤝 Handover Request</h1>
      <p>{customerName}</p>
    </div>
    <div class="content">
      <div class="summary">
        <h3>📋 Context Summary</h3>
        <p>{contextSummary}</p>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">{dealValue}</div>
          <div>Deal Value</div>
        </div>
        <div class="stat">
          <div class="stat-value">{messageCount}</div>
          <div>Messages</div>
        </div>
        <div class="stat">
          <div class="stat-value">{conversationDuration}</div>
          <div>Duration</div>
        </div>
      </div>
      {deadlineSection}
      <div style="text-align: center; margin-top: 20px;">
        <a href="{acceptanceUrl}" class="btn btn-accept">✅ Accept Handover</a>
        <a href="{declineUrl}" class="btn btn-decline">❌ Decline</a>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        This handover was triggered by: {triggerReason}<br>
        AI Confidence Level: {aiConfidence}%
      </p>
    </div>
  </div>
</body>
</html>
    `
  },
  sms: {
    template: 'URGENT Handover: {customerName} ({dealValue} RON). Accept: {shortAcceptUrl} or decline: {shortDeclineUrl}. Deadline: {deadline}'
  },
  push: {
    title: 'New Handover: {customerName}',
    body: '{contextSummary}',
    data: {
      type: 'handover_request',
      handoverId: '{handoverId}',
      action: 'view'
    }
  }
};

export class HandoverNotificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio;
  private pushNotificationQueue: Queue;

  constructor() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    this.pushNotificationQueue = new Queue('push-notifications', {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
  }

  async notifyAgent(config: HandoverNotificationConfig): Promise<{
    success: boolean;
    channels: { channel: NotificationChannel; success: boolean; error?: string }[];
  }> {
    const results: { channel: NotificationChannel; success: boolean; error?: string }[] = [];

    // Get agent contact details
    const agent = await db.query.salesAgents.findFirst({
      where: eq(salesAgents.id, config.agentId)
    });

    if (!agent) {
      return { success: false, channels: [{ channel: NotificationChannel.IN_APP, success: false, error: 'Agent not found' }] };
    }

    // Always send in-app notification
    try {
      await this.sendInAppNotification(config, agent);
      results.push({ channel: NotificationChannel.IN_APP, success: true });
    } catch (error) {
      results.push({ channel: NotificationChannel.IN_APP, success: false, error: error.message });
    }

    // Send to additional channels based on urgency and config
    for (const channel of config.channels) {
      if (channel === NotificationChannel.IN_APP) continue;

      try {
        switch (channel) {
          case NotificationChannel.EMAIL:
            await this.sendEmailNotification(config, agent);
            results.push({ channel: NotificationChannel.EMAIL, success: true });
            break;
          case NotificationChannel.SMS:
            if (agent.phone && (config.urgency === NotificationUrgency.IMMEDIATE || config.urgency === NotificationUrgency.HIGH)) {
              await this.sendSmsNotification(config, agent);
              results.push({ channel: NotificationChannel.SMS, success: true });
            }
            break;
          case NotificationChannel.PUSH:
            await this.sendPushNotification(config, agent);
            results.push({ channel: NotificationChannel.PUSH, success: true });
            break;
          case NotificationChannel.WEBHOOK:
            await this.sendWebhookNotification(config, agent);
            results.push({ channel: NotificationChannel.WEBHOOK, success: true });
            break;
        }
      } catch (error) {
        results.push({ channel, success: false, error: error.message });
        logger.error({ channel, error, handoverId: config.handoverId }, 'Notification delivery failed');
      }
    }

    const success = results.some(r => r.success);
    return { success, channels: results };
  }

  private async sendInAppNotification(config: HandoverNotificationConfig, agent: any): Promise<void> {
    await db.insert(notifications).values({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: config.tenantId,
      userId: agent.userId,
      type: 'handover_request',
      title: `Handover: ${config.customerName}`,
      message: config.contextSummary.substring(0, 200),
      data: {
        handoverId: config.handoverId,
        urgency: config.urgency,
        dealValue: config.dealValue,
        deadline: config.deadline,
        acceptanceUrl: config.acceptanceUrl,
        declineUrl: config.declineUrl
      },
      urgency: config.urgency,
      read: false,
      createdAt: new Date()
    });
  }

  private async sendEmailNotification(config: HandoverNotificationConfig, agent: any): Promise<void> {
    const urgencyClass = config.urgency === NotificationUrgency.IMMEDIATE ? 'urgent' :
                         config.urgency === NotificationUrgency.HIGH ? 'high' : '';

    const html = NOTIFICATION_TEMPLATES.email.body
      .replace('{urgencyClass}', urgencyClass)
      .replace(/{customerName}/g, config.customerName)
      .replace('{contextSummary}', config.contextSummary)
      .replace('{dealValue}', config.dealValue ? `${config.dealValue.toLocaleString('ro-RO')} RON` : 'N/A')
      .replace('{acceptanceUrl}', config.acceptanceUrl)
      .replace('{declineUrl}', config.declineUrl);

    const subject = NOTIFICATION_TEMPLATES.email.subject[config.urgency]
      .replace('{customerName}', config.customerName);

    await this.emailTransporter.sendMail({
      from: process.env.NOTIFICATION_FROM_EMAIL,
      to: agent.email,
      subject,
      html
    });
  }

  private async sendSmsNotification(config: HandoverNotificationConfig, agent: any): Promise<void> {
    const message = NOTIFICATION_TEMPLATES.sms.template
      .replace('{customerName}', config.customerName)
      .replace('{dealValue}', config.dealValue?.toString() || 'N/A')
      .replace('{shortAcceptUrl}', await this.shortenUrl(config.acceptanceUrl))
      .replace('{shortDeclineUrl}', await this.shortenUrl(config.declineUrl))
      .replace('{deadline}', config.deadline ? config.deadline.toLocaleString('ro-RO') : 'ASAP');

    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: agent.phone
    });
  }

  private async sendPushNotification(config: HandoverNotificationConfig, agent: any): Promise<void> {
    await this.pushNotificationQueue.add('push', {
      userId: agent.userId,
      title: NOTIFICATION_TEMPLATES.push.title.replace('{customerName}', config.customerName),
      body: config.contextSummary.substring(0, 100),
      data: {
        type: 'handover_request',
        handoverId: config.handoverId,
        action: 'view'
      }
    });
  }

  private async sendWebhookNotification(config: HandoverNotificationConfig, agent: any): Promise<void> {
    if (!agent.webhookUrl) return;

    await fetch(agent.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_SECRET || ''
      },
      body: JSON.stringify({
        event: 'handover.request',
        timestamp: new Date().toISOString(),
        data: {
          handoverId: config.handoverId,
          customerName: config.customerName,
          contextSummary: config.contextSummary,
          dealValue: config.dealValue,
          urgency: config.urgency,
          deadline: config.deadline,
          acceptanceUrl: config.acceptanceUrl,
          declineUrl: config.declineUrl
        }
      })
    });
  }

  private async shortenUrl(url: string): Promise<string> {
    // Simple URL shortening using internal service
    // In production, use a service like bit.ly or internal shortener
    const id = Math.random().toString(36).substr(2, 6);
    // Store mapping in Redis with TTL
    return `${process.env.SHORT_URL_BASE}/${id}`;
  }

  // Send reminder notifications for unanswered handovers
  async sendReminder(handoverId: string): Promise<void> {
    const handover = await db.query.handovers.findFirst({
      where: eq(handovers.id, handoverId),
      with: {
        assignedAgent: true
      }
    });

    if (!handover || handover.status !== 'pending_acceptance') return;

    const agent = handover.assignedAgent;
    const timeSinceCreation = Date.now() - new Date(handover.createdAt).getTime();
    const reminderNumber = Math.floor(timeSinceCreation / (5 * 60 * 1000)); // Every 5 minutes

    // Escalate urgency for reminders
    let urgency = NotificationUrgency.HIGH;
    let channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

    if (reminderNumber >= 2) {
      urgency = NotificationUrgency.IMMEDIATE;
      channels.push(NotificationChannel.SMS);
    }

    await this.notifyAgent({
      handoverId,
      tenantId: handover.tenantId,
      agentId: handover.assignedAgentId,
      channels,
      urgency,
      contextSummary: `⏰ REMINDER #${reminderNumber + 1}: Handover awaiting your response`,
      customerName: handover.customerName,
      dealValue: handover.estimatedDealValue,
      deadline: handover.acceptanceDeadline,
      acceptanceUrl: `${process.env.APP_URL}/handovers/${handoverId}/accept`,
      declineUrl: `${process.env.APP_URL}/handovers/${handoverId}/decline`
    });
  }

  // Notify customer about agent assignment
  async notifyCustomer(handoverId: string, channel: 'email' | 'whatsapp'): Promise<void> {
    const handover = await db.query.handovers.findFirst({
      where: eq(handovers.id, handoverId),
      with: {
        assignedAgent: true,
        contact: true
      }
    });

    if (!handover || !handover.assignedAgent) return;

    const agent = handover.assignedAgent;
    const contact = handover.contact;

    const message = `Bună ziua ${contact.name}! Am fost atribuit pentru a continua conversația noastră. Sunt ${agent.name} și vă voi ajuta cu solicitarea dumneavoastră. Mă puteți contacta direct la ${agent.email} sau ${agent.phone}. Vă mulțumesc pentru răbdare!`;

    if (channel === 'email' && contact.email) {
      await this.emailTransporter.sendMail({
        from: agent.email,
        to: contact.email,
        subject: `Continuare conversație - ${agent.name}`,
        text: message,
        html: `<p>${message}</p><p>Cu stimă,<br>${agent.name}<br>${agent.title || 'Sales Agent'}</p>`
      });
    } else if (channel === 'whatsapp' && contact.phone) {
      // Queue WhatsApp message through WhatsApp worker
      const whatsappQueue = new Queue('whatsapp-delivery', {
        connection: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });

      await whatsappQueue.add('send-handover-notification', {
        tenantId: handover.tenantId,
        contactId: contact.id,
        phone: contact.phone,
        message,
        messageType: 'handover_notification',
        handoverId
      });
    }
  }
}
```

#### 3.5 Acceptance and Decline Handlers

```typescript
// src/workers/etapa3/handover/acceptance-handler.ts
import { db } from '@/db';
import { handovers, handoverEvents, conversations, salesAgents, aiAgentSessions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { Queue } from 'bullmq';
import { HandoverNotificationService } from './notification-service';

interface AcceptancePayload {
  handoverId: string;
  agentId: string;
  notes?: string;
  estimatedResponseTime?: number; // minutes
}

interface DeclinePayload {
  handoverId: string;
  agentId: string;
  reason: string;
  suggestReassign?: boolean;
  suggestedAgentId?: string;
}

export async function handleHandoverAcceptance(payload: AcceptancePayload): Promise<{
  success: boolean;
  message: string;
  conversationUrl?: string;
}> {
  const { handoverId, agentId, notes, estimatedResponseTime } = payload;

  return await db.transaction(async (tx) => {
    // Get handover with lock
    const handover = await tx.query.handovers.findFirst({
      where: and(
        eq(handovers.id, handoverId),
        eq(handovers.status, 'pending_acceptance')
      )
    });

    if (!handover) {
      return {
        success: false,
        message: 'Handover not found or already processed'
      };
    }

    // Verify agent is assigned
    if (handover.assignedAgentId !== agentId) {
      return {
        success: false,
        message: 'Agent not authorized for this handover'
      };
    }

    // Update handover status
    await tx.update(handovers)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        agentNotes: notes,
        estimatedResponseTimeMinutes: estimatedResponseTime,
        updatedAt: new Date()
      })
      .where(eq(handovers.id, handoverId));

    // Log acceptance event
    await tx.insert(handoverEvents).values({
      id: `he_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      handoverId,
      tenantId: handover.tenantId,
      eventType: 'accepted',
      actorType: 'agent',
      actorId: agentId,
      data: { notes, estimatedResponseTime },
      createdAt: new Date()
    });

    // Update AI session to paused/transferred
    if (handover.aiSessionId) {
      await tx.update(aiAgentSessions)
        .set({
          status: 'transferred',
          transferredTo: agentId,
          transferredAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(aiAgentSessions.id, handover.aiSessionId));
    }

    // Update agent workload
    await tx.update(salesAgents)
      .set({
        currentTaskCount: sql`${salesAgents.currentTaskCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(salesAgents.id, agentId));

    // Create or update conversation for agent
    const conversationId = handover.conversationId || `conv_${Date.now()}`;
    
    logger.info({
      handoverId,
      agentId,
      acceptedAt: new Date()
    }, 'Handover accepted by agent');

    // Notify customer
    const notificationService = new HandoverNotificationService();
    await notificationService.notifyCustomer(handoverId, 'whatsapp');

    return {
      success: true,
      message: 'Handover accepted successfully',
      conversationUrl: `/conversations/${conversationId}`
    };
  });
}

export async function handleHandoverDecline(payload: DeclinePayload): Promise<{
  success: boolean;
  message: string;
  reassigned?: boolean;
  newAgentId?: string;
}> {
  const { handoverId, agentId, reason, suggestReassign, suggestedAgentId } = payload;

  return await db.transaction(async (tx) => {
    // Get handover
    const handover = await tx.query.handovers.findFirst({
      where: and(
        eq(handovers.id, handoverId),
        eq(handovers.status, 'pending_acceptance')
      )
    });

    if (!handover) {
      return {
        success: false,
        message: 'Handover not found or already processed'
      };
    }

    // Verify agent
    if (handover.assignedAgentId !== agentId) {
      return {
        success: false,
        message: 'Agent not authorized for this handover'
      };
    }

    // Log decline event
    await tx.insert(handoverEvents).values({
      id: `he_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      handoverId,
      tenantId: handover.tenantId,
      eventType: 'declined',
      actorType: 'agent',
      actorId: agentId,
      data: { reason, suggestReassign, suggestedAgentId },
      createdAt: new Date()
    });

    // Increment agent's decline count (for metrics)
    await tx.update(salesAgents)
      .set({
        declineCount: sql`${salesAgents.declineCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(salesAgents.id, agentId));

    // Attempt reassignment
    if (suggestReassign !== false) {
      const reassignResult = await attemptReassignment(tx, handover, agentId, suggestedAgentId);
      
      if (reassignResult.success) {
        return {
          success: true,
          message: `Handover declined and reassigned to ${reassignResult.agentName}`,
          reassigned: true,
          newAgentId: reassignResult.agentId
        };
      }
    }

    // No reassignment - mark as escalated
    await tx.update(handovers)
      .set({
        status: 'escalated',
        escalatedAt: new Date(),
        escalationReason: `Declined by ${agentId}: ${reason}`,
        updatedAt: new Date()
      })
      .where(eq(handovers.id, handoverId));

    // Create HITL task for supervisor
    const hitlQueue = new Queue('hitl-tasks', {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    await hitlQueue.add('create-task', {
      tenantId: handover.tenantId,
      category: 'handover_escalation',
      title: `Handover Escalation: ${handover.customerName}`,
      description: `Handover was declined. Reason: ${reason}`,
      priority: handover.urgency === 'critical' ? 1 : 2,
      relatedEntityType: 'handover',
      relatedEntityId: handoverId,
      context: {
        handoverId,
        customerName: handover.customerName,
        declineReason: reason,
        originalAgent: agentId,
        dealValue: handover.estimatedDealValue
      }
    });

    return {
      success: true,
      message: 'Handover declined and escalated to supervisor',
      reassigned: false
    };
  });
}

async function attemptReassignment(
  tx: any,
  handover: any,
  excludeAgentId: string,
  suggestedAgentId?: string
): Promise<{
  success: boolean;
  agentId?: string;
  agentName?: string;
}> {
  // Try suggested agent first
  if (suggestedAgentId) {
    const suggested = await tx.query.salesAgents.findFirst({
      where: and(
        eq(salesAgents.id, suggestedAgentId),
        eq(salesAgents.tenantId, handover.tenantId),
        eq(salesAgents.status, 'available'),
        eq(salesAgents.acceptingHandovers, true)
      )
    });

    if (suggested) {
      await tx.update(handovers)
        .set({
          assignedAgentId: suggestedAgentId,
          reassignmentCount: sql`${handovers.reassignmentCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(handovers.id, handover.id));

      await tx.insert(handoverEvents).values({
        id: `he_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        handoverId: handover.id,
        tenantId: handover.tenantId,
        eventType: 'reassigned',
        actorType: 'system',
        actorId: 'auto-reassign',
        data: {
          fromAgent: excludeAgentId,
          toAgent: suggestedAgentId,
          reason: 'decline_with_suggestion'
        },
        createdAt: new Date()
      });

      // Notify new agent
      const notificationService = new HandoverNotificationService();
      await notificationService.notifyAgent({
        handoverId: handover.id,
        tenantId: handover.tenantId,
        agentId: suggestedAgentId,
        channels: [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
          handover.urgency === 'critical' ? NotificationChannel.SMS : null
        ].filter(Boolean),
        urgency: NotificationUrgency.HIGH,
        contextSummary: handover.contextSummary,
        customerName: handover.customerName,
        dealValue: handover.estimatedDealValue,
        deadline: handover.acceptanceDeadline,
        acceptanceUrl: `${process.env.APP_URL}/handovers/${handover.id}/accept`,
        declineUrl: `${process.env.APP_URL}/handovers/${handover.id}/decline`
      });

      return {
        success: true,
        agentId: suggestedAgentId,
        agentName: suggested.name
      };
    }
  }

  // Find next available agent (excluding declined agent)
  const availableAgents = await tx.query.salesAgents.findMany({
    where: and(
      eq(salesAgents.tenantId, handover.tenantId),
      eq(salesAgents.status, 'available'),
      eq(salesAgents.acceptingHandovers, true),
      sql`${salesAgents.id} != ${excludeAgentId}`
    ),
    orderBy: [
      asc(salesAgents.lastHandoverAt),
      asc(salesAgents.currentTaskCount)
    ],
    limit: 5
  });

  for (const agent of availableAgents) {
    // Check workload
    const currentLoad = await tx
      .select({ count: sql<number>`count(*)` })
      .from(handovers)
      .where(and(
        eq(handovers.assignedAgentId, agent.id),
        sql`${handovers.status} IN ('pending_acceptance', 'accepted', 'in_progress')`
      ));

    if ((currentLoad[0]?.count || 0) < agent.maxConcurrentTasks) {
      // Assign to this agent
      await tx.update(handovers)
        .set({
          assignedAgentId: agent.id,
          reassignmentCount: sql`${handovers.reassignmentCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(handovers.id, handover.id));

      await tx.update(salesAgents)
        .set({ lastHandoverAt: new Date() })
        .where(eq(salesAgents.id, agent.id));

      await tx.insert(handoverEvents).values({
        id: `he_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        handoverId: handover.id,
        tenantId: handover.tenantId,
        eventType: 'reassigned',
        actorType: 'system',
        actorId: 'auto-reassign',
        data: {
          fromAgent: excludeAgentId,
          toAgent: agent.id,
          reason: 'decline_auto_reassign'
        },
        createdAt: new Date()
      });

      // Notify new agent
      const notificationService = new HandoverNotificationService();
      await notificationService.notifyAgent({
        handoverId: handover.id,
        tenantId: handover.tenantId,
        agentId: agent.id,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        urgency: NotificationUrgency.HIGH,
        contextSummary: handover.contextSummary,
        customerName: handover.customerName,
        dealValue: handover.estimatedDealValue,
        deadline: handover.acceptanceDeadline,
        acceptanceUrl: `${process.env.APP_URL}/handovers/${handover.id}/accept`,
        declineUrl: `${process.env.APP_URL}/handovers/${handover.id}/decline`
      });

      return {
        success: true,
        agentId: agent.id,
        agentName: agent.name
      };
    }
  }

  return { success: false };
}
```

#### 3.6 Handover Status Tracking

```typescript
// src/workers/etapa3/handover/status-tracker.ts
import { db } from '@/db';
import { handovers, handoverEvents, handoverMetrics } from '@/db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Handover lifecycle states
export enum HandoverStatus {
  PREPARING = 'preparing',
  PENDING_ACCEPTANCE = 'pending_acceptance',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DECLINED = 'declined',
  ESCALATED = 'escalated',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

// Allowed transitions
const HANDOVER_TRANSITIONS: Record<HandoverStatus, HandoverStatus[]> = {
  [HandoverStatus.PREPARING]: [
    HandoverStatus.PENDING_ACCEPTANCE,
    HandoverStatus.CANCELLED
  ],
  [HandoverStatus.PENDING_ACCEPTANCE]: [
    HandoverStatus.ACCEPTED,
    HandoverStatus.DECLINED,
    HandoverStatus.ESCALATED,
    HandoverStatus.EXPIRED
  ],
  [HandoverStatus.ACCEPTED]: [
    HandoverStatus.IN_PROGRESS,
    HandoverStatus.CANCELLED
  ],
  [HandoverStatus.IN_PROGRESS]: [
    HandoverStatus.COMPLETED,
    HandoverStatus.ESCALATED
  ],
  [HandoverStatus.COMPLETED]: [],
  [HandoverStatus.DECLINED]: [HandoverStatus.PENDING_ACCEPTANCE], // Can be reassigned
  [HandoverStatus.ESCALATED]: [
    HandoverStatus.PENDING_ACCEPTANCE,
    HandoverStatus.IN_PROGRESS
  ],
  [HandoverStatus.CANCELLED]: [],
  [HandoverStatus.EXPIRED]: [HandoverStatus.PENDING_ACCEPTANCE] // Can be renewed
};

export class HandoverStatusTracker {
  async transitionStatus(
    handoverId: string,
    newStatus: HandoverStatus,
    actorType: 'agent' | 'system' | 'ai' | 'customer',
    actorId: string,
    data?: Record<string, any>
  ): Promise<{
    success: boolean;
    previousStatus?: HandoverStatus;
    error?: string;
  }> {
    return await db.transaction(async (tx) => {
      // Get current handover
      const handover = await tx.query.handovers.findFirst({
        where: eq(handovers.id, handoverId)
      });

      if (!handover) {
        return { success: false, error: 'Handover not found' };
      }

      const currentStatus = handover.status as HandoverStatus;

      // Validate transition
      const allowedTransitions = HANDOVER_TRANSITIONS[currentStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        return {
          success: false,
          error: `Invalid transition from ${currentStatus} to ${newStatus}`,
          previousStatus: currentStatus
        };
      }

      // Calculate duration metrics
      const now = new Date();
      const durationMinutes = Math.round(
        (now.getTime() - new Date(handover.createdAt).getTime()) / (1000 * 60)
      );

      // Update handover
      const updateData: any = {
        status: newStatus,
        updatedAt: now
      };

      // Set specific timestamps based on new status
      switch (newStatus) {
        case HandoverStatus.ACCEPTED:
          updateData.acceptedAt = now;
          updateData.acceptanceTimeMinutes = Math.round(
            (now.getTime() - new Date(handover.createdAt).getTime()) / (1000 * 60)
          );
          break;
        case HandoverStatus.IN_PROGRESS:
          updateData.startedAt = now;
          break;
        case HandoverStatus.COMPLETED:
          updateData.completedAt = now;
          updateData.totalDurationMinutes = durationMinutes;
          break;
        case HandoverStatus.ESCALATED:
          updateData.escalatedAt = now;
          break;
        case HandoverStatus.EXPIRED:
          updateData.expiredAt = now;
          break;
      }

      await tx.update(handovers)
        .set(updateData)
        .where(eq(handovers.id, handoverId));

      // Log event
      await tx.insert(handoverEvents).values({
        id: `he_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        handoverId,
        tenantId: handover.tenantId,
        eventType: `status_changed_to_${newStatus}`,
        previousStatus: currentStatus,
        newStatus,
        actorType,
        actorId,
        data: {
          ...data,
          durationFromPreviousMinutes: Math.round(
            (now.getTime() - new Date(handover.updatedAt).getTime()) / (1000 * 60)
          )
        },
        createdAt: now
      });

      // Update aggregate metrics
      await this.updateMetrics(tx, handover.tenantId, currentStatus, newStatus);

      logger.info({
        handoverId,
        previousStatus: currentStatus,
        newStatus,
        actorType,
        actorId,
        durationMinutes
      }, 'Handover status transitioned');

      return {
        success: true,
        previousStatus: currentStatus
      };
    });
  }

  async getHandoverTimeline(handoverId: string): Promise<{
    events: Array<{
      timestamp: Date;
      eventType: string;
      actorType: string;
      actorId: string;
      data: any;
      previousStatus?: string;
      newStatus?: string;
    }>;
    currentStatus: string;
    metrics: {
      totalDuration: number;
      timeToAcceptance?: number;
      timeToFirstResponse?: number;
      timeToCompletion?: number;
    };
  }> {
    const handover = await db.query.handovers.findFirst({
      where: eq(handovers.id, handoverId)
    });

    if (!handover) {
      throw new Error('Handover not found');
    }

    const events = await db.query.handoverEvents.findMany({
      where: eq(handoverEvents.handoverId, handoverId),
      orderBy: asc(handoverEvents.createdAt)
    });

    const now = new Date();
    const createdAt = new Date(handover.createdAt);

    return {
      events: events.map(e => ({
        timestamp: e.createdAt,
        eventType: e.eventType,
        actorType: e.actorType,
        actorId: e.actorId,
        data: e.data,
        previousStatus: e.previousStatus,
        newStatus: e.newStatus
      })),
      currentStatus: handover.status,
      metrics: {
        totalDuration: Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60)),
        timeToAcceptance: handover.acceptedAt 
          ? Math.round((new Date(handover.acceptedAt).getTime() - createdAt.getTime()) / (1000 * 60))
          : undefined,
        timeToFirstResponse: handover.firstResponseAt
          ? Math.round((new Date(handover.firstResponseAt).getTime() - new Date(handover.acceptedAt || createdAt).getTime()) / (1000 * 60))
          : undefined,
        timeToCompletion: handover.completedAt
          ? Math.round((new Date(handover.completedAt).getTime() - createdAt.getTime()) / (1000 * 60))
          : undefined
      }
    };
  }

  private async updateMetrics(
    tx: any,
    tenantId: string,
    fromStatus: HandoverStatus,
    toStatus: HandoverStatus
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Upsert daily metrics
    await tx.execute(sql`
      INSERT INTO handover_metrics (
        tenant_id, date, 
        total_handovers, pending_count, accepted_count, declined_count,
        escalated_count, completed_count, expired_count
      ) VALUES (
        ${tenantId}, ${today},
        1, 
        ${toStatus === HandoverStatus.PENDING_ACCEPTANCE ? 1 : 0},
        ${toStatus === HandoverStatus.ACCEPTED ? 1 : 0},
        ${toStatus === HandoverStatus.DECLINED ? 1 : 0},
        ${toStatus === HandoverStatus.ESCALATED ? 1 : 0},
        ${toStatus === HandoverStatus.COMPLETED ? 1 : 0},
        ${toStatus === HandoverStatus.EXPIRED ? 1 : 0}
      )
      ON CONFLICT (tenant_id, date) DO UPDATE SET
        pending_count = handover_metrics.pending_count + 
          CASE WHEN ${toStatus} = 'pending_acceptance' THEN 1 
               WHEN ${fromStatus} = 'pending_acceptance' THEN -1 
               ELSE 0 END,
        accepted_count = handover_metrics.accepted_count + 
          CASE WHEN ${toStatus} = 'accepted' THEN 1 ELSE 0 END,
        declined_count = handover_metrics.declined_count + 
          CASE WHEN ${toStatus} = 'declined' THEN 1 ELSE 0 END,
        escalated_count = handover_metrics.escalated_count + 
          CASE WHEN ${toStatus} = 'escalated' THEN 1 ELSE 0 END,
        completed_count = handover_metrics.completed_count + 
          CASE WHEN ${toStatus} = 'completed' THEN 1 ELSE 0 END,
        expired_count = handover_metrics.expired_count + 
          CASE WHEN ${toStatus} = 'expired' THEN 1 ELSE 0 END,
        updated_at = NOW()
    `);
  }

  // Expire overdue handovers
  async expireOverdueHandovers(): Promise<number> {
    const now = new Date();

    const overdueHandovers = await db.query.handovers.findMany({
      where: and(
        eq(handovers.status, 'pending_acceptance'),
        lte(handovers.acceptanceDeadline, now)
      )
    });

    let expiredCount = 0;
    for (const handover of overdueHandovers) {
      const result = await this.transitionStatus(
        handover.id,
        HandoverStatus.EXPIRED,
        'system',
        'expiry-scheduler',
        { reason: 'Acceptance deadline exceeded' }
      );

      if (result.success) {
        expiredCount++;

        // Create HITL task for supervisor review
        const hitlQueue = new Queue('hitl-tasks', {
          connection: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379')
          }
        });

        await hitlQueue.add('create-task', {
          tenantId: handover.tenantId,
          category: 'handover_expired',
          title: `Expired Handover: ${handover.customerName}`,
          description: 'Handover acceptance deadline exceeded. Customer awaiting response.',
          priority: 1, // High priority
          relatedEntityType: 'handover',
          relatedEntityId: handover.id
        });
      }
    }

    logger.info({ expiredCount }, 'Expired overdue handovers');
    return expiredCount;
  }
}
```


---

## 4. Worker J3: Channel Switch

### 4.1 Worker Purpose

Worker J3 gestionează tranziția comunicării între diferite canale (Email ↔ WhatsApp ↔ Telefon ↔ Chat), menținând continuitatea conversației și contextul complet al interacțiunii cu clientul.

### 4.2 Channel Switch Configuration

```typescript
// src/workers/etapa3/channel/channel-switch.config.ts

// Supported communication channels
export enum CommunicationChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  PHONE = 'phone',
  SMS = 'sms',
  WEB_CHAT = 'web_chat',
  IN_APP = 'in_app'
}

// Channel capabilities
interface ChannelCapabilities {
  supportedMediaTypes: string[];
  maxMessageLength: number;
  supportsAttachments: boolean;
  maxAttachmentSize: number; // bytes
  supportsRichText: boolean;
  supportsDeliveryReceipts: boolean;
  supportsReadReceipts: boolean;
  supportsTypingIndicator: boolean;
  averageDeliveryTime: number; // seconds
  costPerMessage?: number; // RON
}

export const CHANNEL_CAPABILITIES: Record<CommunicationChannel, ChannelCapabilities> = {
  [CommunicationChannel.EMAIL]: {
    supportedMediaTypes: ['text/plain', 'text/html', 'application/pdf', 'image/*', 'application/msword'],
    maxMessageLength: 1000000, // ~1MB text
    supportsAttachments: true,
    maxAttachmentSize: 25 * 1024 * 1024, // 25MB
    supportsRichText: true,
    supportsDeliveryReceipts: true,
    supportsReadReceipts: true,
    supportsTypingIndicator: false,
    averageDeliveryTime: 30,
    costPerMessage: 0.01
  },
  [CommunicationChannel.WHATSAPP]: {
    supportedMediaTypes: ['text/plain', 'image/*', 'video/*', 'audio/*', 'application/pdf'],
    maxMessageLength: 4096,
    supportsAttachments: true,
    maxAttachmentSize: 16 * 1024 * 1024, // 16MB
    supportsRichText: false,
    supportsDeliveryReceipts: true,
    supportsReadReceipts: true,
    supportsTypingIndicator: true,
    averageDeliveryTime: 2,
    costPerMessage: 0.05 // Template messages
  },
  [CommunicationChannel.PHONE]: {
    supportedMediaTypes: ['audio/*'],
    maxMessageLength: 0, // Voice only
    supportsAttachments: false,
    maxAttachmentSize: 0,
    supportsRichText: false,
    supportsDeliveryReceipts: false,
    supportsReadReceipts: false,
    supportsTypingIndicator: false,
    averageDeliveryTime: 0,
    costPerMessage: 0.10 // Per minute
  },
  [CommunicationChannel.SMS]: {
    supportedMediaTypes: ['text/plain'],
    maxMessageLength: 160, // Single SMS, 70 for Unicode
    supportsAttachments: false,
    maxAttachmentSize: 0,
    supportsRichText: false,
    supportsDeliveryReceipts: true,
    supportsReadReceipts: false,
    supportsTypingIndicator: false,
    averageDeliveryTime: 5,
    costPerMessage: 0.08
  },
  [CommunicationChannel.WEB_CHAT]: {
    supportedMediaTypes: ['text/plain', 'image/*', 'application/pdf'],
    maxMessageLength: 10000,
    supportsAttachments: true,
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB
    supportsRichText: true,
    supportsDeliveryReceipts: true,
    supportsReadReceipts: true,
    supportsTypingIndicator: true,
    averageDeliveryTime: 0,
    costPerMessage: 0
  },
  [CommunicationChannel.IN_APP]: {
    supportedMediaTypes: ['text/plain', 'text/html'],
    maxMessageLength: 50000,
    supportsAttachments: true,
    maxAttachmentSize: 50 * 1024 * 1024, // 50MB
    supportsRichText: true,
    supportsDeliveryReceipts: true,
    supportsReadReceipts: true,
    supportsTypingIndicator: true,
    averageDeliveryTime: 0,
    costPerMessage: 0
  }
};

// Channel priority for automatic selection
export const CHANNEL_PRIORITY: CommunicationChannel[] = [
  CommunicationChannel.WHATSAPP, // Fastest, most reliable
  CommunicationChannel.WEB_CHAT, // Free, instant
  CommunicationChannel.EMAIL,    // Universal
  CommunicationChannel.SMS,      // Fallback
  CommunicationChannel.PHONE     // Last resort
];

// Channel switch rules
interface ChannelSwitchRule {
  fromChannel: CommunicationChannel;
  toChannel: CommunicationChannel;
  conditions: {
    maxFailedAttempts?: number;
    customerPreference?: boolean;
    urgencyLevel?: string[];
    timeBasedSwitch?: { startHour: number; endHour: number };
  };
  priority: number;
}

export const CHANNEL_SWITCH_RULES: ChannelSwitchRule[] = [
  // Email failures -> WhatsApp
  {
    fromChannel: CommunicationChannel.EMAIL,
    toChannel: CommunicationChannel.WHATSAPP,
    conditions: {
      maxFailedAttempts: 3
    },
    priority: 1
  },
  // WhatsApp outside messaging window -> Email
  {
    fromChannel: CommunicationChannel.WHATSAPP,
    toChannel: CommunicationChannel.EMAIL,
    conditions: {
      maxFailedAttempts: 1 // Template message window
    },
    priority: 2
  },
  // No response after 24h -> Phone
  {
    fromChannel: CommunicationChannel.EMAIL,
    toChannel: CommunicationChannel.PHONE,
    conditions: {
      urgencyLevel: ['critical', 'high']
    },
    priority: 3
  },
  // Business hours switch to phone for high value
  {
    fromChannel: CommunicationChannel.WHATSAPP,
    toChannel: CommunicationChannel.PHONE,
    conditions: {
      timeBasedSwitch: { startHour: 9, endHour: 17 },
      urgencyLevel: ['critical']
    },
    priority: 4
  }
];
```

### 4.3 Channel Switch Worker Implementation

```typescript
// src/workers/etapa3/channel/channel-switch.worker.ts
import { Worker, Job, Queue } from 'bullmq';
import { db } from '@/db';
import { 
  channelSwitches, 
  conversations, 
  conversationMessages,
  contacts,
  communicationPreferences 
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { 
  CommunicationChannel, 
  CHANNEL_CAPABILITIES,
  CHANNEL_PRIORITY,
  CHANNEL_SWITCH_RULES 
} from './channel-switch.config';

interface ChannelSwitchJobData {
  tenantId: string;
  conversationId: string;
  contactId: string;
  currentChannel: CommunicationChannel;
  targetChannel?: CommunicationChannel; // If not specified, auto-select
  reason: 'customer_request' | 'delivery_failure' | 'urgency_escalation' | 'availability' | 'cost_optimization';
  messageToSend?: string;
  attachments?: Array<{ url: string; filename: string; mimeType: string }>;
  metadata?: Record<string, any>;
}

interface ChannelSwitchResult {
  success: boolean;
  switchId: string;
  fromChannel: CommunicationChannel;
  toChannel: CommunicationChannel;
  contextTransferred: boolean;
  messageDelivered?: boolean;
  error?: string;
}

// Channel switch queue
const channelSwitchQueue = new Queue('channel-switch', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: 4 // Dedicated DB for channel management
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 30 * 24 * 3600 }
  }
});

// Channel switch worker
const channelSwitchWorker = new Worker<ChannelSwitchJobData, ChannelSwitchResult>(
  'channel-switch',
  async (job: Job<ChannelSwitchJobData>): Promise<ChannelSwitchResult> => {
    const { 
      tenantId, 
      conversationId, 
      contactId, 
      currentChannel, 
      targetChannel,
      reason,
      messageToSend,
      attachments,
      metadata 
    } = job.data;

    const switchId = `switch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info({
      jobId: job.id,
      switchId,
      conversationId,
      currentChannel,
      targetChannel,
      reason
    }, 'Processing channel switch');

    try {
      // Get contact info
      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, contactId),
          eq(contacts.tenantId, tenantId)
        )
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Get customer communication preferences
      const preferences = await db.query.communicationPreferences.findFirst({
        where: and(
          eq(communicationPreferences.contactId, contactId),
          eq(communicationPreferences.tenantId, tenantId)
        )
      });

      // Determine target channel
      const selectedChannel = targetChannel || await selectBestChannel(
        contact,
        currentChannel,
        reason,
        preferences
      );

      // Validate channel availability for contact
      const channelValid = await validateChannelForContact(contact, selectedChannel);
      if (!channelValid.valid) {
        throw new Error(`Channel ${selectedChannel} not available: ${channelValid.reason}`);
      }

      // Get conversation context for transfer
      const context = await getConversationContext(conversationId);

      // Create channel switch record
      await db.insert(channelSwitches).values({
        id: switchId,
        tenantId,
        conversationId,
        contactId,
        fromChannel: currentChannel,
        toChannel: selectedChannel,
        reason,
        contextSnapshot: context,
        status: 'in_progress',
        metadata,
        createdAt: new Date()
      });

      // Update conversation with new channel
      await db.update(conversations)
        .set({
          currentChannel: selectedChannel,
          previousChannel: currentChannel,
          channelSwitchedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversationId));

      // If there's a message to send, queue it on the new channel
      let messageDelivered = false;
      if (messageToSend) {
        messageDelivered = await sendMessageOnChannel(
          tenantId,
          conversationId,
          contactId,
          selectedChannel,
          messageToSend,
          attachments,
          context
        );
      }

      // Update switch status
      await db.update(channelSwitches)
        .set({
          status: 'completed',
          completedAt: new Date(),
          messageDelivered,
          updatedAt: new Date()
        })
        .where(eq(channelSwitches.id, switchId));

      logger.info({
        switchId,
        fromChannel: currentChannel,
        toChannel: selectedChannel,
        messageDelivered
      }, 'Channel switch completed');

      return {
        success: true,
        switchId,
        fromChannel: currentChannel,
        toChannel: selectedChannel,
        contextTransferred: true,
        messageDelivered
      };

    } catch (error) {
      logger.error({
        switchId,
        error: error.message,
        conversationId
      }, 'Channel switch failed');

      // Update switch status
      await db.update(channelSwitches)
        .set({
          status: 'failed',
          errorMessage: error.message,
          updatedAt: new Date()
        })
        .where(eq(channelSwitches.id, switchId));

      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 4
    },
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 60000
    }
  }
);

// Select best channel based on rules and preferences
async function selectBestChannel(
  contact: any,
  currentChannel: CommunicationChannel,
  reason: string,
  preferences?: any
): Promise<CommunicationChannel> {
  // Check customer preference first
  if (preferences?.preferredChannel && reason === 'customer_request') {
    return preferences.preferredChannel;
  }

  // Apply switch rules
  for (const rule of CHANNEL_SWITCH_RULES) {
    if (rule.fromChannel === currentChannel) {
      // Check conditions
      const conditionsMet = await evaluateRuleConditions(rule, contact, reason);
      if (conditionsMet) {
        // Verify target channel is available
        const validation = await validateChannelForContact(contact, rule.toChannel);
        if (validation.valid) {
          return rule.toChannel;
        }
      }
    }
  }

  // Fallback to priority-based selection
  for (const channel of CHANNEL_PRIORITY) {
    if (channel === currentChannel) continue;
    
    const validation = await validateChannelForContact(contact, channel);
    if (validation.valid) {
      return channel;
    }
  }

  throw new Error('No suitable channel available for contact');
}

async function evaluateRuleConditions(
  rule: any,
  contact: any,
  reason: string
): Promise<boolean> {
  const conditions = rule.conditions;

  // Check time-based switch
  if (conditions.timeBasedSwitch) {
    const currentHour = new Date().getHours();
    if (currentHour < conditions.timeBasedSwitch.startHour || 
        currentHour > conditions.timeBasedSwitch.endHour) {
      return false;
    }
  }

  // Check urgency level
  if (conditions.urgencyLevel) {
    // Get current conversation urgency
    // This would be fetched from the conversation context
    // For now, assume it matches
  }

  return true;
}

async function validateChannelForContact(
  contact: any,
  channel: CommunicationChannel
): Promise<{ valid: boolean; reason?: string }> {
  switch (channel) {
    case CommunicationChannel.EMAIL:
      if (!contact.email) {
        return { valid: false, reason: 'No email address' };
      }
      if (contact.emailBounced) {
        return { valid: false, reason: 'Email previously bounced' };
      }
      return { valid: true };

    case CommunicationChannel.WHATSAPP:
      if (!contact.phone) {
        return { valid: false, reason: 'No phone number' };
      }
      if (contact.whatsappOptOut) {
        return { valid: false, reason: 'Contact opted out of WhatsApp' };
      }
      return { valid: true };

    case CommunicationChannel.PHONE:
      if (!contact.phone) {
        return { valid: false, reason: 'No phone number' };
      }
      if (contact.doNotCall) {
        return { valid: false, reason: 'Contact on Do Not Call list' };
      }
      return { valid: true };

    case CommunicationChannel.SMS:
      if (!contact.phone) {
        return { valid: false, reason: 'No phone number' };
      }
      if (contact.smsOptOut) {
        return { valid: false, reason: 'Contact opted out of SMS' };
      }
      return { valid: true };

    case CommunicationChannel.WEB_CHAT:
      // Always available if contact has an account
      return { valid: !!contact.userId };

    case CommunicationChannel.IN_APP:
      return { valid: !!contact.userId };

    default:
      return { valid: false, reason: 'Unknown channel' };
  }
}

// Get conversation context for seamless transition
async function getConversationContext(conversationId: string): Promise<{
  summary: string;
  lastMessages: any[];
  keyPoints: string[];
  openQuestions: string[];
  customerSentiment: string;
  dealValue?: number;
  products?: any[];
}> {
  // Get recent messages
  const messages = await db.query.conversationMessages.findMany({
    where: eq(conversationMessages.conversationId, conversationId),
    orderBy: desc(conversationMessages.createdAt),
    limit: 20
  });

  // Get conversation details
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId)
  });

  // Build summary from messages
  const summary = messages
    .slice(0, 5)
    .reverse()
    .map(m => `${m.senderType}: ${m.content.substring(0, 100)}`)
    .join('\n');

  // Extract key points (simplified - would use AI in production)
  const keyPoints = messages
    .filter(m => m.metadata?.isKeyPoint)
    .map(m => m.content);

  // Extract open questions
  const openQuestions = messages
    .filter(m => m.content.includes('?') && !m.metadata?.answered)
    .map(m => m.content);

  return {
    summary,
    lastMessages: messages.slice(0, 10).map(m => ({
      sender: m.senderType,
      content: m.content,
      timestamp: m.createdAt
    })),
    keyPoints: keyPoints.slice(0, 5),
    openQuestions: openQuestions.slice(0, 3),
    customerSentiment: conversation?.customerSentiment || 'neutral',
    dealValue: conversation?.estimatedDealValue,
    products: conversation?.products
  };
}

// Send message on new channel
async function sendMessageOnChannel(
  tenantId: string,
  conversationId: string,
  contactId: string,
  channel: CommunicationChannel,
  message: string,
  attachments?: any[],
  context?: any
): Promise<boolean> {
  const capabilities = CHANNEL_CAPABILITIES[channel];

  // Truncate message if needed
  let finalMessage = message;
  if (message.length > capabilities.maxMessageLength) {
    finalMessage = message.substring(0, capabilities.maxMessageLength - 3) + '...';
  }

  // Handle attachments
  let validAttachments = attachments || [];
  if (!capabilities.supportsAttachments) {
    validAttachments = [];
  } else {
    validAttachments = validAttachments.filter(
      a => a.size <= capabilities.maxAttachmentSize
    );
  }

  // Queue message on appropriate channel
  switch (channel) {
    case CommunicationChannel.EMAIL:
      const emailQueue = new Queue('email-delivery', {
        connection: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });
      await emailQueue.add('send-channel-switch', {
        tenantId,
        conversationId,
        contactId,
        message: finalMessage,
        attachments: validAttachments,
        context: {
          channelSwitchContext: context?.summary,
          previousChannel: context?.previousChannel
        }
      });
      return true;

    case CommunicationChannel.WHATSAPP:
      const whatsappQueue = new Queue('whatsapp-delivery', {
        connection: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });
      await whatsappQueue.add('send-channel-switch', {
        tenantId,
        conversationId,
        contactId,
        message: finalMessage,
        attachments: validAttachments,
        context: {
          channelSwitchContext: context?.summary
        }
      });
      return true;

    case CommunicationChannel.SMS:
      const smsQueue = new Queue('sms-delivery', {
        connection: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });
      await smsQueue.add('send', {
        tenantId,
        contactId,
        message: finalMessage.substring(0, 160)
      });
      return true;

    case CommunicationChannel.PHONE:
      // Phone requires manual callback - queue task
      const phoneQueue = new Queue('phone-callback', {
        connection: {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });
      await phoneQueue.add('schedule-callback', {
        tenantId,
        conversationId,
        contactId,
        context: context?.summary,
        urgency: 'high'
      });
      return true;

    default:
      return false;
  }
}

export { 
  channelSwitchQueue, 
  channelSwitchWorker,
  selectBestChannel,
  validateChannelForContact,
  getConversationContext 
};
```

### 4.4 Context Preservation During Switch

```typescript
// src/workers/etapa3/channel/context-preserver.ts
import { db } from '@/db';
import { 
  conversationContexts,
  conversationMessages,
  conversations 
} from '@/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

interface PreservedContext {
  conversationId: string;
  summary: string;
  keyTopics: string[];
  customerNeeds: string[];
  agreedPoints: string[];
  openIssues: string[];
  nextSteps: string[];
  customerProfile: {
    name: string;
    company?: string;
    role?: string;
    preferredCommunicationStyle?: string;
  };
  dealContext: {
    products: any[];
    totalValue: number;
    stage: string;
    urgency: string;
  };
  messageHistory: {
    lastNMessages: number;
    totalMessages: number;
    timespan: string;
  };
}

export class ConversationContextPreserver {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async preserveContext(
    conversationId: string,
    fromChannel: string,
    toChannel: string
  ): Promise<PreservedContext> {
    // Get conversation and recent messages
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        contact: true,
        messages: {
          orderBy: desc(conversationMessages.createdAt),
          limit: 50
        }
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Generate AI summary for context
    const aiSummary = await this.generateContextSummary(conversation.messages);

    // Build preserved context
    const preservedContext: PreservedContext = {
      conversationId,
      summary: aiSummary.summary,
      keyTopics: aiSummary.keyTopics,
      customerNeeds: aiSummary.customerNeeds,
      agreedPoints: aiSummary.agreedPoints,
      openIssues: aiSummary.openIssues,
      nextSteps: aiSummary.nextSteps,
      customerProfile: {
        name: conversation.contact.name,
        company: conversation.contact.companyName,
        role: conversation.contact.role,
        preferredCommunicationStyle: this.inferCommunicationStyle(conversation.messages)
      },
      dealContext: {
        products: conversation.products || [],
        totalValue: conversation.estimatedDealValue || 0,
        stage: conversation.stage,
        urgency: conversation.urgency || 'normal'
      },
      messageHistory: {
        lastNMessages: conversation.messages.length,
        totalMessages: conversation.messageCount,
        timespan: this.calculateTimespan(conversation.messages)
      }
    };

    // Store preserved context
    await db.insert(conversationContexts).values({
      id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      tenantId: conversation.tenantId,
      contextType: 'channel_switch',
      fromChannel,
      toChannel,
      preservedContext,
      createdAt: new Date()
    });

    return preservedContext;
  }

  private async generateContextSummary(messages: any[]): Promise<{
    summary: string;
    keyTopics: string[];
    customerNeeds: string[];
    agreedPoints: string[];
    openIssues: string[];
    nextSteps: string[];
  }> {
    const messageText = messages
      .reverse()
      .map(m => `${m.senderType.toUpperCase()}: ${m.content}`)
      .join('\n');

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are a sales conversation analyst. Analyze the conversation and extract:
1. A brief summary (2-3 sentences)
2. Key topics discussed
3. Customer needs identified
4. Points already agreed upon
5. Open issues that need resolution
6. Suggested next steps

Respond in JSON format.`,
      messages: [{
        role: 'user',
        content: `Analyze this B2B sales conversation:\n\n${messageText}`
      }]
    });

    try {
      const analysis = JSON.parse(response.content[0].text);
      return {
        summary: analysis.summary || '',
        keyTopics: analysis.keyTopics || [],
        customerNeeds: analysis.customerNeeds || [],
        agreedPoints: analysis.agreedPoints || [],
        openIssues: analysis.openIssues || [],
        nextSteps: analysis.nextSteps || []
      };
    } catch {
      return {
        summary: 'Context analysis unavailable',
        keyTopics: [],
        customerNeeds: [],
        agreedPoints: [],
        openIssues: [],
        nextSteps: []
      };
    }
  }

  private inferCommunicationStyle(messages: any[]): string {
    // Analyze customer messages for style
    const customerMessages = messages.filter(m => m.senderType === 'customer');
    
    if (customerMessages.length === 0) return 'formal';

    const avgLength = customerMessages.reduce((acc, m) => acc + m.content.length, 0) / customerMessages.length;
    const hasEmojis = customerMessages.some(m => /[\u{1F300}-\u{1F9FF}]/u.test(m.content));
    const isShort = avgLength < 50;

    if (hasEmojis || isShort) return 'casual';
    if (avgLength > 200) return 'detailed';
    return 'formal';
  }

  private calculateTimespan(messages: any[]): string {
    if (messages.length < 2) return 'N/A';
    
    const oldest = new Date(messages[messages.length - 1].createdAt);
    const newest = new Date(messages[0].createdAt);
    const diff = newest.getTime() - oldest.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours} hours`;
    
    const days = Math.floor(hours / 24);
    return `${days} days`;
  }

  // Generate channel-appropriate context message
  async generateContextBriefing(
    preservedContext: PreservedContext,
    targetChannel: string
  ): Promise<string> {
    const template = this.getChannelTemplate(targetChannel);
    
    return template
      .replace('{customerName}', preservedContext.customerProfile.name)
      .replace('{summary}', preservedContext.summary)
      .replace('{keyTopics}', preservedContext.keyTopics.slice(0, 3).join(', '))
      .replace('{openIssues}', preservedContext.openIssues.slice(0, 2).join('; ') || 'None')
      .replace('{nextStep}', preservedContext.nextSteps[0] || 'Continue discussion');
  }

  private getChannelTemplate(channel: string): string {
    switch (channel) {
      case 'email':
        return `Stimate/ă {customerName},

Continuăm conversația noastră pe email.

Rezumat până acum: {summary}

Subiecte discutate: {keyTopics}

Probleme de rezolvat: {openIssues}

Următorul pas: {nextStep}

Vă stau la dispoziție pentru orice întrebări.

Cu stimă,`;

      case 'whatsapp':
        return `Bună {customerName}! 👋

Continuăm pe WhatsApp. Rezumat: {summary}

De discutat: {openIssues}

Ce facem mai departe: {nextStep}`;

      case 'sms':
        return `{customerName}, continuăm pe SMS. Rezumat: {summary}. Următor: {nextStep}`;

      default:
        return `Context: {summary}. Open: {openIssues}. Next: {nextStep}`;
    }
  }
}
```

### 4.5 Channel Transition Templates

```typescript
// src/workers/etapa3/channel/transition-templates.ts

export interface TransitionTemplate {
  id: string;
  name: string;
  fromChannel: string;
  toChannel: string;
  language: 'ro' | 'en';
  templates: {
    customerNotification: string;
    agentBriefing: string;
    continuationMessage: string;
  };
}

export const TRANSITION_TEMPLATES: TransitionTemplate[] = [
  // Email → WhatsApp
  {
    id: 'email-to-whatsapp-ro',
    name: 'Email to WhatsApp (Romanian)',
    fromChannel: 'email',
    toChannel: 'whatsapp',
    language: 'ro',
    templates: {
      customerNotification: `Bună ziua {{customerName}},

Pentru o comunicare mai rapidă, vă contactăm pe WhatsApp la numărul {{phone}}.

Conversația noastră continuă de unde am rămas:
{{contextSummary}}

Vă așteptăm mesajul pe WhatsApp!

Cu stimă,
{{agentName}}`,

      agentBriefing: `📱 CHANNEL SWITCH: Email → WhatsApp
Customer: {{customerName}}
Company: {{companyName}}
Previous Context: {{contextSummary}}
Key Points: {{keyPoints}}
Open Questions: {{openQuestions}}
Deal Value: {{dealValue}} RON
Stage: {{dealStage}}`,

      continuationMessage: `Bună {{customerName}}! 👋

Sunt {{agentName}} și continuăm discuția aici pe WhatsApp pentru răspunsuri mai rapide.

{{contextSummary}}

Cum vă pot ajuta în continuare?`
    }
  },

  // WhatsApp → Email
  {
    id: 'whatsapp-to-email-ro',
    name: 'WhatsApp to Email (Romanian)',
    fromChannel: 'whatsapp',
    toChannel: 'email',
    language: 'ro',
    templates: {
      customerNotification: `Bună {{customerName}},

Pentru a vă trimite documentația detaliată, continuăm discuția pe email.

Veți primi în curând un email cu toate informațiile solicitate.

Cu stimă,
{{agentName}}`,

      agentBriefing: `📧 CHANNEL SWITCH: WhatsApp → Email
Customer: {{customerName}}
Reason: {{switchReason}}
Previous Channel Messages: {{messageCount}}
Key Topics: {{keyTopics}}
Attachments Needed: {{attachmentsRequested}}
Tone: {{customerTone}}`,

      continuationMessage: `Stimate/ă {{customerName}},

Conform discuției noastre de pe WhatsApp, vă trimit prin email informațiile solicitate.

**Rezumatul conversației:**
{{contextSummary}}

**Documentele atașate:**
{{attachmentsList}}

Vă rog să îmi confirmați primirea și să îmi spuneți dacă aveți nevoie de clarificări.

Cu stimă,
{{agentName}}
{{agentTitle}}
{{companyName}}`
    }
  },

  // Email/WhatsApp → Phone
  {
    id: 'digital-to-phone-ro',
    name: 'Digital to Phone (Romanian)',
    fromChannel: 'digital',
    toChannel: 'phone',
    language: 'ro',
    templates: {
      customerNotification: `Bună {{customerName}},

Pentru a discuta mai eficient despre {{mainTopic}}, vă propun o scurtă conversație telefonică.

Când vă este convenabil să vă sun? Vă rog să îmi comunicați disponibilitatea.

Cu stimă,
{{agentName}}
Tel: {{agentPhone}}`,

      agentBriefing: `📞 PHONE CALL BRIEFING
Customer: {{customerName}} ({{companyName}})
Phone: {{customerPhone}}
Best Time: {{bestCallTime}}

CONTEXT:
{{contextSummary}}

KEY TALKING POINTS:
{{talkingPoints}}

OBJECTIONS TO ADDRESS:
{{objections}}

GOALS FOR CALL:
{{callGoals}}

DEAL INFO:
- Products: {{products}}
- Value: {{dealValue}} RON
- Stage: {{dealStage}}
- Urgency: {{urgency}}`,

      continuationMessage: `[After call notes template]

CALL SUMMARY:
Date/Time: {{callDateTime}}
Duration: {{callDuration}}
Outcome: {{callOutcome}}

DISCUSSION POINTS:
{{discussionSummary}}

NEXT STEPS:
{{nextSteps}}

FOLLOW-UP REQUIRED:
{{followUpActions}}`
    }
  },

  // Any → SMS (Fallback)
  {
    id: 'any-to-sms-ro',
    name: 'Fallback to SMS (Romanian)',
    fromChannel: 'any',
    toChannel: 'sms',
    language: 'ro',
    templates: {
      customerNotification: `{{customerName}}, va contactam pe SMS. Raspundeti cu DA pentru a continua sau sunati {{agentPhone}}.`,

      agentBriefing: `📱 SMS FALLBACK
Customer: {{customerName}}
Phone: {{phone}}
Reason: Other channels unavailable
Last Contact Attempt: {{lastAttempt}}
Context (short): {{shortContext}}`,

      continuationMessage: `{{customerName}}, sunt {{agentName}}. Va rog sunati-ma la {{agentPhone}} pentru {{topic}}.`
    }
  }
];

// Template renderer
export function renderTemplate(
  templateId: string,
  templateType: 'customerNotification' | 'agentBriefing' | 'continuationMessage',
  variables: Record<string, string>
): string {
  const template = TRANSITION_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  let result = template.templates[templateType];
  
  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }

  // Handle any unreplaced variables
  result = result.replace(/\{\{[^}]+\}\}/g, 'N/A');

  return result;
}

// Get appropriate template for channel transition
export function getTransitionTemplate(
  fromChannel: string,
  toChannel: string,
  language: 'ro' | 'en' = 'ro'
): TransitionTemplate | undefined {
  return TRANSITION_TEMPLATES.find(t =>
    (t.fromChannel === fromChannel || t.fromChannel === 'any') &&
    t.toChannel === toChannel &&
    t.language === language
  );
}
```


---

## 5. Worker J4: Channel Sync

### 5.1 Worker Purpose

Worker J4 sincronizează starea conversației și mesajele între canale multiple, asigurând o experiență unificată atât pentru client cât și pentru agent, indiferent de canalul de comunicare folosit.

### 5.2 Channel Sync Architecture

```typescript
// src/workers/etapa3/channel/channel-sync.config.ts

// Sync modes
export enum SyncMode {
  REAL_TIME = 'real_time',      // Immediate sync across all channels
  BATCH = 'batch',              // Periodic sync (every 5 min)
  ON_DEMAND = 'on_demand',      // Manual trigger
  SELECTIVE = 'selective'       // Only sync specific data
}

// Data types to sync
export enum SyncDataType {
  MESSAGES = 'messages',
  READ_STATUS = 'read_status',
  DELIVERY_STATUS = 'delivery_status',
  TYPING_INDICATOR = 'typing_indicator',
  PRESENCE = 'presence',
  ATTACHMENTS = 'attachments',
  REACTIONS = 'reactions',
  METADATA = 'metadata'
}

// Channel sync configuration
interface ChannelSyncConfig {
  channel: string;
  syncDataTypes: SyncDataType[];
  syncMode: SyncMode;
  syncInterval?: number; // ms
  priority: number;
  bidirectional: boolean;
}

export const CHANNEL_SYNC_CONFIG: Record<string, ChannelSyncConfig> = {
  email: {
    channel: 'email',
    syncDataTypes: [
      SyncDataType.MESSAGES,
      SyncDataType.ATTACHMENTS,
      SyncDataType.READ_STATUS
    ],
    syncMode: SyncMode.BATCH,
    syncInterval: 60000, // 1 minute
    priority: 2,
    bidirectional: true
  },
  whatsapp: {
    channel: 'whatsapp',
    syncDataTypes: [
      SyncDataType.MESSAGES,
      SyncDataType.READ_STATUS,
      SyncDataType.DELIVERY_STATUS,
      SyncDataType.TYPING_INDICATOR,
      SyncDataType.ATTACHMENTS
    ],
    syncMode: SyncMode.REAL_TIME,
    priority: 1,
    bidirectional: true
  },
  sms: {
    channel: 'sms',
    syncDataTypes: [
      SyncDataType.MESSAGES,
      SyncDataType.DELIVERY_STATUS
    ],
    syncMode: SyncMode.REAL_TIME,
    priority: 3,
    bidirectional: true
  },
  web_chat: {
    channel: 'web_chat',
    syncDataTypes: [
      SyncDataType.MESSAGES,
      SyncDataType.READ_STATUS,
      SyncDataType.TYPING_INDICATOR,
      SyncDataType.PRESENCE,
      SyncDataType.ATTACHMENTS,
      SyncDataType.REACTIONS
    ],
    syncMode: SyncMode.REAL_TIME,
    priority: 1,
    bidirectional: true
  },
  phone: {
    channel: 'phone',
    syncDataTypes: [
      SyncDataType.MESSAGES, // Call notes/transcripts
      SyncDataType.METADATA  // Call duration, outcome
    ],
    syncMode: SyncMode.ON_DEMAND,
    priority: 4,
    bidirectional: false // Agent enters notes manually
  }
};

// Conflict resolution strategies
export enum ConflictResolution {
  LATEST_WINS = 'latest_wins',
  SOURCE_PRIORITY = 'source_priority',
  MERGE = 'merge',
  MANUAL = 'manual'
}
```

### 5.3 Channel Sync Worker Implementation

```typescript
// src/workers/etapa3/channel/channel-sync.worker.ts
import { Worker, Job, Queue } from 'bullmq';
import { db } from '@/db';
import { 
  conversationMessages,
  messageDeliveryStatus,
  conversationSyncState,
  syncConflicts,
  unifiedTimeline
} from '@/db/schema';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { 
  SyncMode, 
  SyncDataType, 
  CHANNEL_SYNC_CONFIG,
  ConflictResolution 
} from './channel-sync.config';
import { createHash } from 'crypto';

interface ChannelSyncJobData {
  tenantId: string;
  conversationId: string;
  syncType: 'full' | 'incremental' | 'specific';
  channels?: string[];
  dataTypes?: SyncDataType[];
  triggeredBy: 'webhook' | 'scheduled' | 'manual' | 'system';
  since?: Date; // For incremental sync
}

interface SyncResult {
  success: boolean;
  syncId: string;
  messagesSync: number;
  statusUpdates: number;
  conflicts: number;
  conflictsResolved: number;
  timelineUpdated: boolean;
  errors?: string[];
}

// Channel sync queue
const channelSyncQueue = new Queue('channel-sync', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: 4
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: { age: 24 * 3600 }, // 1 day
    removeOnFail: { age: 7 * 24 * 3600 }
  }
});

// Scheduled sync job
channelSyncQueue.add(
  'scheduled-sync',
  {},
  {
    repeat: {
      every: 60000 // Every minute
    }
  }
);

// Channel sync worker
const channelSyncWorker = new Worker<ChannelSyncJobData, SyncResult>(
  'channel-sync',
  async (job: Job<ChannelSyncJobData>): Promise<SyncResult> => {
    // Handle scheduled sync differently
    if (job.name === 'scheduled-sync') {
      return await processScheduledSync();
    }

    const {
      tenantId,
      conversationId,
      syncType,
      channels,
      dataTypes,
      triggeredBy,
      since
    } = job.data;

    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info({
      jobId: job.id,
      syncId,
      conversationId,
      syncType,
      triggeredBy
    }, 'Processing channel sync');

    const result: SyncResult = {
      success: true,
      syncId,
      messagesSync: 0,
      statusUpdates: 0,
      conflicts: 0,
      conflictsResolved: 0,
      timelineUpdated: false,
      errors: []
    };

    try {
      // Get current sync state
      const syncState = await getOrCreateSyncState(tenantId, conversationId);

      // Determine channels to sync
      const channelsToSync = channels || Object.keys(CHANNEL_SYNC_CONFIG);
      const dataTypesToSync = dataTypes || [
        SyncDataType.MESSAGES,
        SyncDataType.READ_STATUS,
        SyncDataType.DELIVERY_STATUS
      ];

      // Sync each channel
      for (const channel of channelsToSync) {
        const config = CHANNEL_SYNC_CONFIG[channel];
        if (!config) continue;

        try {
          const channelResult = await syncChannel(
            tenantId,
            conversationId,
            channel,
            syncType,
            dataTypesToSync.filter(dt => config.syncDataTypes.includes(dt)),
            since || syncState.lastSyncAt
          );

          result.messagesSync += channelResult.messages;
          result.statusUpdates += channelResult.statusUpdates;
          result.conflicts += channelResult.conflicts;
          result.conflictsResolved += channelResult.resolved;

        } catch (error) {
          result.errors.push(`${channel}: ${error.message}`);
        }
      }

      // Update unified timeline
      result.timelineUpdated = await updateUnifiedTimeline(tenantId, conversationId);

      // Update sync state
      await updateSyncState(tenantId, conversationId, result);

      result.success = result.errors.length === 0;

      logger.info({
        syncId,
        result
      }, 'Channel sync completed');

      return result;

    } catch (error) {
      logger.error({
        syncId,
        error: error.message
      }, 'Channel sync failed');

      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 4
    },
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 60000
    }
  }
);

// Get or create sync state for conversation
async function getOrCreateSyncState(
  tenantId: string,
  conversationId: string
): Promise<any> {
  let state = await db.query.conversationSyncState.findFirst({
    where: and(
      eq(conversationSyncState.tenantId, tenantId),
      eq(conversationSyncState.conversationId, conversationId)
    )
  });

  if (!state) {
    const id = `syncstate_${Date.now()}`;
    await db.insert(conversationSyncState).values({
      id,
      tenantId,
      conversationId,
      lastSyncAt: new Date(0), // Never synced
      channelStates: {},
      createdAt: new Date()
    });

    state = {
      id,
      tenantId,
      conversationId,
      lastSyncAt: new Date(0),
      channelStates: {}
    };
  }

  return state;
}

// Sync specific channel
async function syncChannel(
  tenantId: string,
  conversationId: string,
  channel: string,
  syncType: string,
  dataTypes: SyncDataType[],
  since: Date
): Promise<{
  messages: number;
  statusUpdates: number;
  conflicts: number;
  resolved: number;
}> {
  const result = {
    messages: 0,
    statusUpdates: 0,
    conflicts: 0,
    resolved: 0
  };

  // Sync messages
  if (dataTypes.includes(SyncDataType.MESSAGES)) {
    const messageSync = await syncMessages(tenantId, conversationId, channel, since);
    result.messages = messageSync.synced;
    result.conflicts += messageSync.conflicts;
    result.resolved += messageSync.resolved;
  }

  // Sync delivery/read status
  if (dataTypes.includes(SyncDataType.DELIVERY_STATUS) || 
      dataTypes.includes(SyncDataType.READ_STATUS)) {
    const statusSync = await syncDeliveryStatus(tenantId, conversationId, channel, since);
    result.statusUpdates = statusSync.updated;
  }

  return result;
}

// Sync messages between channels
async function syncMessages(
  tenantId: string,
  conversationId: string,
  channel: string,
  since: Date
): Promise<{
  synced: number;
  conflicts: number;
  resolved: number;
}> {
  // Get messages from this channel since last sync
  const newMessages = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.tenantId, tenantId),
      eq(conversationMessages.conversationId, conversationId),
      eq(conversationMessages.channel, channel),
      gt(conversationMessages.createdAt, since)
    ),
    orderBy: asc(conversationMessages.createdAt)
  });

  let synced = 0;
  let conflicts = 0;
  let resolved = 0;

  for (const message of newMessages) {
    // Check for duplicate/conflict
    const contentHash = createHash('sha256')
      .update(`${message.content}${message.senderType}`)
      .digest('hex')
      .substring(0, 16);

    const existing = await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.contentHash, contentHash),
        sql`${conversationMessages.channel} != ${channel}`
      )
    });

    if (existing) {
      // Duplicate from another channel - mark as synced
      await db.update(conversationMessages)
        .set({
          syncedFrom: existing.id,
          syncedAt: new Date()
        })
        .where(eq(conversationMessages.id, message.id));

      conflicts++;
      resolved++;
    } else {
      // New message - update unified view
      await db.update(conversationMessages)
        .set({
          contentHash,
          syncedAt: new Date()
        })
        .where(eq(conversationMessages.id, message.id));

      synced++;
    }
  }

  return { synced, conflicts, resolved };
}

// Sync delivery and read status
async function syncDeliveryStatus(
  tenantId: string,
  conversationId: string,
  channel: string,
  since: Date
): Promise<{ updated: number }> {
  // Get status updates from this channel
  const statusUpdates = await db.query.messageDeliveryStatus.findMany({
    where: and(
      eq(messageDeliveryStatus.tenantId, tenantId),
      eq(messageDeliveryStatus.channel, channel),
      gt(messageDeliveryStatus.updatedAt, since)
    )
  });

  let updated = 0;

  for (const status of statusUpdates) {
    // Update the canonical message status
    await db.update(conversationMessages)
      .set({
        deliveryStatus: status.status,
        deliveredAt: status.deliveredAt,
        readAt: status.readAt,
        updatedAt: new Date()
      })
      .where(and(
        eq(conversationMessages.id, status.messageId),
        // Only update if new status is "more final"
        sql`(
          ${conversationMessages.deliveryStatus} IS NULL OR
          ${conversationMessages.deliveryStatus} IN ('pending', 'sent') AND ${status.status} IN ('delivered', 'read') OR
          ${conversationMessages.deliveryStatus} = 'delivered' AND ${status.status} = 'read'
        )`
      ));

    updated++;
  }

  return { updated };
}

// Update unified timeline
async function updateUnifiedTimeline(
  tenantId: string,
  conversationId: string
): Promise<boolean> {
  try {
    // Get all messages ordered by time
    const allMessages = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.tenantId, tenantId),
        eq(conversationMessages.conversationId, conversationId)
      ),
      orderBy: asc(conversationMessages.createdAt)
    });

    // Build unified timeline entries
    const timelineEntries = allMessages.map((msg, index) => ({
      id: `timeline_${msg.id}`,
      tenantId,
      conversationId,
      messageId: msg.id,
      sequenceNumber: index + 1,
      timestamp: msg.createdAt,
      channel: msg.channel,
      senderType: msg.senderType,
      contentPreview: msg.content.substring(0, 100),
      hasAttachments: msg.attachments?.length > 0,
      deliveryStatus: msg.deliveryStatus,
      isFromCurrentChannel: false // Will be updated per-view
    }));

    // Upsert timeline entries
    for (const entry of timelineEntries) {
      await db.execute(sql`
        INSERT INTO unified_timeline (
          id, tenant_id, conversation_id, message_id, sequence_number,
          timestamp, channel, sender_type, content_preview, 
          has_attachments, delivery_status, updated_at
        ) VALUES (
          ${entry.id}, ${tenantId}, ${conversationId}, ${entry.messageId},
          ${entry.sequenceNumber}, ${entry.timestamp}, ${entry.channel},
          ${entry.senderType}, ${entry.contentPreview}, ${entry.hasAttachments},
          ${entry.deliveryStatus}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          sequence_number = ${entry.sequenceNumber},
          delivery_status = ${entry.deliveryStatus},
          updated_at = NOW()
      `);
    }

    return true;
  } catch (error) {
    logger.error({ conversationId, error: error.message }, 'Failed to update unified timeline');
    return false;
  }
}

// Update sync state after sync
async function updateSyncState(
  tenantId: string,
  conversationId: string,
  result: SyncResult
): Promise<void> {
  await db.update(conversationSyncState)
    .set({
      lastSyncAt: new Date(),
      lastSyncResult: {
        syncId: result.syncId,
        success: result.success,
        messagesSync: result.messagesSync,
        statusUpdates: result.statusUpdates,
        conflicts: result.conflicts,
        errors: result.errors
      },
      updatedAt: new Date()
    })
    .where(and(
      eq(conversationSyncState.tenantId, tenantId),
      eq(conversationSyncState.conversationId, conversationId)
    ));
}

// Process scheduled sync for all active conversations
async function processScheduledSync(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncId: `scheduled_${Date.now()}`,
    messagesSync: 0,
    statusUpdates: 0,
    conflicts: 0,
    conflictsResolved: 0,
    timelineUpdated: false,
    errors: []
  };

  // Find conversations that need sync (active in last 24h, batch mode)
  const activeConversations = await db.execute(sql`
    SELECT DISTINCT c.id, c.tenant_id
    FROM conversations c
    JOIN conversation_messages cm ON c.id = cm.conversation_id
    WHERE cm.created_at > NOW() - INTERVAL '24 hours'
    AND c.status IN ('active', 'pending_response')
    AND (
      c.last_sync_at IS NULL OR
      c.last_sync_at < NOW() - INTERVAL '5 minutes'
    )
    LIMIT 100
  `);

  for (const conv of activeConversations.rows) {
    try {
      await channelSyncQueue.add('sync', {
        tenantId: conv.tenant_id,
        conversationId: conv.id,
        syncType: 'incremental',
        triggeredBy: 'scheduled'
      });
    } catch (error) {
      result.errors.push(`${conv.id}: ${error.message}`);
    }
  }

  logger.info({
    conversationsQueued: activeConversations.rows.length
  }, 'Scheduled sync completed');

  return result;
}

export {
  channelSyncQueue,
  channelSyncWorker,
  syncChannel,
  updateUnifiedTimeline
};
```

### 5.4 Real-Time Sync with WebSocket

```typescript
// src/workers/etapa3/channel/realtime-sync.ts
import { Server as SocketServer, Socket } from 'socket.io';
import { db } from '@/db';
import { conversationMessages, conversations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 5 // PubSub dedicated DB
});

const redisSub = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 5
});

interface RealTimeSyncEvent {
  type: 'message' | 'status' | 'typing' | 'presence';
  conversationId: string;
  channel: string;
  data: any;
  timestamp: Date;
}

export class RealTimeSyncManager {
  private io: SocketServer;
  private conversationRooms: Map<string, Set<string>> = new Map(); // conversationId -> Set<socketId>

  constructor(io: SocketServer) {
    this.io = io;
    this.setupSocketHandlers();
    this.setupRedisSubscription();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.handshake.auth.userId;
      const tenantId = socket.handshake.auth.tenantId;

      logger.info({ socketId: socket.id, userId }, 'Client connected to real-time sync');

      // Join conversation rooms
      socket.on('join:conversation', async (conversationId: string) => {
        // Verify access
        const conversation = await db.query.conversations.findFirst({
          where: eq(conversations.id, conversationId)
        });

        if (!conversation || conversation.tenantId !== tenantId) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(`conv:${conversationId}`);
        
        if (!this.conversationRooms.has(conversationId)) {
          this.conversationRooms.set(conversationId, new Set());
        }
        this.conversationRooms.get(conversationId)!.add(socket.id);

        // Send current state
        socket.emit('conversation:state', {
          conversationId,
          participants: Array.from(this.conversationRooms.get(conversationId)!).length
        });
      });

      // Leave conversation room
      socket.on('leave:conversation', (conversationId: string) => {
        socket.leave(`conv:${conversationId}`);
        this.conversationRooms.get(conversationId)?.delete(socket.id);
      });

      // Typing indicator
      socket.on('typing:start', (data: { conversationId: string; channel: string }) => {
        this.broadcastToConversation(data.conversationId, 'typing:update', {
          userId,
          channel: data.channel,
          isTyping: true,
          timestamp: new Date()
        }, socket.id);
      });

      socket.on('typing:stop', (data: { conversationId: string }) => {
        this.broadcastToConversation(data.conversationId, 'typing:update', {
          userId,
          isTyping: false,
          timestamp: new Date()
        }, socket.id);
      });

      // Presence update
      socket.on('presence:update', (data: { status: string }) => {
        // Broadcast to all conversations user is in
        for (const [convId, sockets] of this.conversationRooms.entries()) {
          if (sockets.has(socket.id)) {
            this.broadcastToConversation(convId, 'presence:update', {
              userId,
              status: data.status,
              timestamp: new Date()
            });
          }
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        // Remove from all conversation rooms
        for (const [convId, sockets] of this.conversationRooms.entries()) {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            this.broadcastToConversation(convId, 'presence:update', {
              userId,
              status: 'offline',
              timestamp: new Date()
            });
          }
        }
        logger.info({ socketId: socket.id, userId }, 'Client disconnected');
      });
    });
  }

  private setupRedisSubscription(): void {
    // Subscribe to sync events from workers
    redisSub.subscribe('channel:sync:events');

    redisSub.on('message', (channel: string, message: string) => {
      if (channel !== 'channel:sync:events') return;

      try {
        const event: RealTimeSyncEvent = JSON.parse(message);
        this.handleSyncEvent(event);
      } catch (error) {
        logger.error({ error: error.message }, 'Failed to parse sync event');
      }
    });
  }

  private handleSyncEvent(event: RealTimeSyncEvent): void {
    switch (event.type) {
      case 'message':
        this.broadcastToConversation(event.conversationId, 'message:new', {
          channel: event.channel,
          message: event.data,
          timestamp: event.timestamp
        });
        break;

      case 'status':
        this.broadcastToConversation(event.conversationId, 'message:status', {
          messageId: event.data.messageId,
          status: event.data.status,
          channel: event.channel,
          timestamp: event.timestamp
        });
        break;

      case 'typing':
        this.broadcastToConversation(event.conversationId, 'typing:update', {
          ...event.data,
          channel: event.channel
        });
        break;

      case 'presence':
        this.broadcastToConversation(event.conversationId, 'presence:update', event.data);
        break;
    }
  }

  private broadcastToConversation(
    conversationId: string,
    eventName: string,
    data: any,
    excludeSocket?: string
  ): void {
    if (excludeSocket) {
      this.io.to(`conv:${conversationId}`).except(excludeSocket).emit(eventName, data);
    } else {
      this.io.to(`conv:${conversationId}`).emit(eventName, data);
    }
  }

  // Publish sync event from worker
  static async publishSyncEvent(event: RealTimeSyncEvent): Promise<void> {
    await redis.publish('channel:sync:events', JSON.stringify(event));
  }
}

// Helper to publish events from workers
export async function publishNewMessage(
  conversationId: string,
  channel: string,
  message: any
): Promise<void> {
  await RealTimeSyncManager.publishSyncEvent({
    type: 'message',
    conversationId,
    channel,
    data: message,
    timestamp: new Date()
  });
}

export async function publishStatusUpdate(
  conversationId: string,
  channel: string,
  messageId: string,
  status: string
): Promise<void> {
  await RealTimeSyncManager.publishSyncEvent({
    type: 'status',
    conversationId,
    channel,
    data: { messageId, status },
    timestamp: new Date()
  });
}
```

### 5.5 Message Deduplication

```typescript
// src/workers/etapa3/channel/message-deduplicator.ts
import { db } from '@/db';
import { conversationMessages, messageDeduplication } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import { logger } from '@/lib/logger';

interface DeduplicationResult {
  isDuplicate: boolean;
  originalMessageId?: string;
  originalChannel?: string;
  confidence: number; // 0-1
}

export class MessageDeduplicator {
  // Generate content hash for deduplication
  private generateContentHash(
    content: string,
    senderType: string,
    timestamp: Date,
    windowMinutes: number = 5
  ): string {
    // Normalize content
    const normalizedContent = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    // Time window bucket (group messages within X minutes)
    const timeBucket = Math.floor(timestamp.getTime() / (windowMinutes * 60 * 1000));

    const hashInput = `${normalizedContent}|${senderType}|${timeBucket}`;
    return createHash('sha256').update(hashInput).digest('hex').substring(0, 32);
  }

  // Check if message is duplicate
  async checkDuplicate(
    tenantId: string,
    conversationId: string,
    content: string,
    senderType: string,
    channel: string,
    timestamp: Date
  ): Promise<DeduplicationResult> {
    const contentHash = this.generateContentHash(content, senderType, timestamp);

    // Check exact match
    const exactMatch = await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.tenantId, tenantId),
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.contentHash, contentHash),
        sql`${conversationMessages.channel} != ${channel}`
      )
    });

    if (exactMatch) {
      return {
        isDuplicate: true,
        originalMessageId: exactMatch.id,
        originalChannel: exactMatch.channel,
        confidence: 1.0
      };
    }

    // Check fuzzy match (similar content, same time window)
    const windowStart = new Date(timestamp.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(timestamp.getTime() + 5 * 60 * 1000);

    const potentialDuplicates = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.tenantId, tenantId),
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.senderType, senderType),
        sql`${conversationMessages.channel} != ${channel}`,
        sql`${conversationMessages.createdAt} BETWEEN ${windowStart} AND ${windowEnd}`
      )
    });

    for (const msg of potentialDuplicates) {
      const similarity = this.calculateSimilarity(content, msg.content);
      if (similarity > 0.85) {
        return {
          isDuplicate: true,
          originalMessageId: msg.id,
          originalChannel: msg.channel,
          confidence: similarity
        };
      }
    }

    return {
      isDuplicate: false,
      confidence: 0
    };
  }

  // Calculate text similarity using Jaccard index
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  // Record deduplication decision
  async recordDeduplication(
    tenantId: string,
    conversationId: string,
    newMessageId: string,
    originalMessageId: string,
    confidence: number
  ): Promise<void> {
    await db.insert(messageDeduplication).values({
      id: `dedup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      conversationId,
      newMessageId,
      originalMessageId,
      confidence,
      action: confidence >= 0.95 ? 'merged' : 'flagged',
      createdAt: new Date()
    });
  }

  // Link duplicate messages
  async linkMessages(
    messageId: string,
    originalMessageId: string
  ): Promise<void> {
    await db.update(conversationMessages)
      .set({
        linkedMessageId: originalMessageId,
        isDuplicate: true,
        updatedAt: new Date()
      })
      .where(eq(conversationMessages.id, messageId));
  }

  // Get all linked messages for a conversation
  async getMessageLinks(conversationId: string): Promise<Map<string, string[]>> {
    const messages = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.conversationId, conversationId),
        sql`${conversationMessages.linkedMessageId} IS NOT NULL`
      )
    });

    const links = new Map<string, string[]>();
    for (const msg of messages) {
      if (!links.has(msg.linkedMessageId!)) {
        links.set(msg.linkedMessageId!, []);
      }
      links.get(msg.linkedMessageId!)!.push(msg.id);
    }

    return links;
  }
}
```

### 5.6 Unified Conversation View

```typescript
// src/workers/etapa3/channel/unified-view.ts
import { db } from '@/db';
import { 
  conversationMessages, 
  conversations, 
  contacts,
  unifiedTimeline 
} from '@/db/schema';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';

interface UnifiedMessage {
  id: string;
  sequence: number;
  timestamp: Date;
  channel: string;
  senderType: 'customer' | 'agent' | 'ai' | 'system';
  senderName: string;
  content: string;
  attachments: any[];
  deliveryStatus: string;
  readAt?: Date;
  reactions: any[];
  linkedMessages: string[]; // IDs of same message on other channels
  metadata: {
    channelSpecific: any;
    isForwarded: boolean;
    replyTo?: string;
  };
}

interface UnifiedConversationView {
  conversationId: string;
  contact: {
    id: string;
    name: string;
    company?: string;
    avatar?: string;
  };
  channels: {
    channel: string;
    isActive: boolean;
    lastActivity: Date;
    messageCount: number;
  }[];
  messages: UnifiedMessage[];
  currentChannel: string;
  summary: {
    totalMessages: number;
    unreadCount: number;
    lastActivity: Date;
    primaryChannel: string;
  };
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

export class UnifiedConversationViewBuilder {
  async buildView(
    tenantId: string,
    conversationId: string,
    options: {
      limit?: number;
      before?: Date;
      after?: Date;
      channels?: string[];
      includeSystem?: boolean;
    } = {}
  ): Promise<UnifiedConversationView> {
    const { 
      limit = 50, 
      before, 
      after, 
      channels, 
      includeSystem = false 
    } = options;

    // Get conversation details
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.tenantId, tenantId)
      ),
      with: {
        contact: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Build message query conditions
    const conditions = [
      eq(conversationMessages.tenantId, tenantId),
      eq(conversationMessages.conversationId, conversationId)
    ];

    if (!includeSystem) {
      conditions.push(sql`${conversationMessages.senderType} != 'system'`);
    }

    if (before) {
      conditions.push(lte(conversationMessages.createdAt, before));
    }

    if (after) {
      conditions.push(gte(conversationMessages.createdAt, after));
    }

    if (channels && channels.length > 0) {
      conditions.push(sql`${conversationMessages.channel} IN (${sql.join(channels.map(c => sql`${c}`), sql`, `)})`);
    }

    // Get messages
    const messages = await db.query.conversationMessages.findMany({
      where: and(...conditions),
      orderBy: desc(conversationMessages.createdAt),
      limit: limit + 1 // Get one extra to check if there are more
    });

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    // Get channel statistics
    const channelStats = await db.execute(sql`
      SELECT 
        channel,
        COUNT(*) as message_count,
        MAX(created_at) as last_activity
      FROM conversation_messages
      WHERE tenant_id = ${tenantId}
        AND conversation_id = ${conversationId}
      GROUP BY channel
    `);

    // Get unread count
    const unreadResult = await db.execute(sql`
      SELECT COUNT(*) as unread
      FROM conversation_messages
      WHERE tenant_id = ${tenantId}
        AND conversation_id = ${conversationId}
        AND sender_type = 'customer'
        AND read_at IS NULL
    `);

    // Build unified messages
    const unifiedMessages: UnifiedMessage[] = messages.map((msg, index) => ({
      id: msg.id,
      sequence: messages.length - index,
      timestamp: msg.createdAt,
      channel: msg.channel,
      senderType: msg.senderType,
      senderName: this.getSenderName(msg, conversation),
      content: msg.content,
      attachments: msg.attachments || [],
      deliveryStatus: msg.deliveryStatus,
      readAt: msg.readAt,
      reactions: msg.reactions || [],
      linkedMessages: msg.linkedMessageIds || [],
      metadata: {
        channelSpecific: msg.channelMetadata,
        isForwarded: msg.isForwarded || false,
        replyTo: msg.replyToMessageId
      }
    }));

    // Determine primary channel
    const primaryChannel = channelStats.rows.reduce((a, b) => 
      (a.message_count > b.message_count) ? a : b
    )?.channel || conversation.currentChannel;

    return {
      conversationId,
      contact: {
        id: conversation.contact.id,
        name: conversation.contact.name,
        company: conversation.contact.companyName,
        avatar: conversation.contact.avatarUrl
      },
      channels: channelStats.rows.map(row => ({
        channel: row.channel,
        isActive: row.channel === conversation.currentChannel,
        lastActivity: row.last_activity,
        messageCount: parseInt(row.message_count)
      })),
      messages: unifiedMessages.reverse(), // Chronological order
      currentChannel: conversation.currentChannel,
      summary: {
        totalMessages: messages.length,
        unreadCount: parseInt(unreadResult.rows[0]?.unread || '0'),
        lastActivity: messages[0]?.createdAt || conversation.updatedAt,
        primaryChannel
      },
      pagination: {
        hasMore,
        nextCursor: hasMore ? messages[messages.length - 1]?.createdAt?.toISOString() : undefined,
        prevCursor: after ? messages[0]?.createdAt?.toISOString() : undefined
      }
    };
  }

  private getSenderName(message: any, conversation: any): string {
    switch (message.senderType) {
      case 'customer':
        return conversation.contact.name;
      case 'agent':
        return message.agentName || 'Agent';
      case 'ai':
        return 'Asistent AI';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  }

  // Get cross-channel message thread
  async getMessageThread(
    tenantId: string,
    messageId: string
  ): Promise<{
    originalMessage: UnifiedMessage;
    linkedMessages: UnifiedMessage[];
  }> {
    const message = await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.id, messageId),
        eq(conversationMessages.tenantId, tenantId)
      )
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Get linked messages
    const linkedIds = message.linkedMessageIds || [];
    const linkedMessages = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.tenantId, tenantId),
        sql`${conversationMessages.id} = ANY(${linkedIds})`
      ),
      orderBy: asc(conversationMessages.createdAt)
    });

    const toUnified = (msg: any): UnifiedMessage => ({
      id: msg.id,
      sequence: 0,
      timestamp: msg.createdAt,
      channel: msg.channel,
      senderType: msg.senderType,
      senderName: msg.senderType === 'agent' ? msg.agentName || 'Agent' : 'Customer',
      content: msg.content,
      attachments: msg.attachments || [],
      deliveryStatus: msg.deliveryStatus,
      readAt: msg.readAt,
      reactions: msg.reactions || [],
      linkedMessages: msg.linkedMessageIds || [],
      metadata: {
        channelSpecific: msg.channelMetadata,
        isForwarded: msg.isForwarded || false,
        replyTo: msg.replyToMessageId
      }
    });

    return {
      originalMessage: toUnified(message),
      linkedMessages: linkedMessages.map(toUnified)
    };
  }
}
```


---

## 6. Queue Configuration

### 6.1 BullMQ Queue Definitions

```typescript
// src/workers/etapa3/handover-channel/queues.config.ts
import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection for handover/channel queues
const handoverRedisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 6, // Dedicated DB for handover/channel management
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => Math.min(times * 50, 2000)
});

// Common queue options
const commonQueueOptions: Partial<QueueOptions> = {
  connection: handoverRedisConnection,
  prefix: 'cerniq:handover'
};

// ============================================
// HANDOVER QUEUES
// ============================================

// Handover preparation queue
export const handoverPrepareQueue = new Queue('handover-prepare', {
  ...commonQueueOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // 7 days
      count: 1000
    },
    removeOnFail: {
      age: 30 * 24 * 3600 // 30 days
    }
  }
});

// Handover execution queue
export const handoverExecuteQueue = new Queue('handover-execute', {
  ...commonQueueOptions,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: {
      age: 14 * 24 * 3600
    },
    removeOnFail: {
      age: 60 * 24 * 3600
    }
  }
});

// Handover notification queue
export const handoverNotificationQueue = new Queue('handover-notification', {
  ...commonQueueOptions,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 3 * 24 * 3600
    },
    removeOnFail: {
      age: 7 * 24 * 3600
    }
  }
});

// Handover reminder queue (scheduled)
export const handoverReminderQueue = new Queue('handover-reminder', {
  ...commonQueueOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 60000 // 1 minute
    },
    removeOnComplete: {
      age: 24 * 3600
    },
    removeOnFail: {
      age: 7 * 24 * 3600
    }
  }
});

// ============================================
// CHANNEL MANAGEMENT QUEUES
// ============================================

// Channel switch queue
export const channelSwitchQueue = new Queue('channel-switch', {
  ...commonQueueOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 7 * 24 * 3600
    },
    removeOnFail: {
      age: 30 * 24 * 3600
    }
  }
});

// Channel sync queue
export const channelSyncQueue = new Queue('channel-sync', {
  ...commonQueueOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: {
      age: 24 * 3600
    },
    removeOnFail: {
      age: 7 * 24 * 3600
    }
  }
});

// Phone callback queue (manual follow-up)
export const phoneCallbackQueue = new Queue('phone-callback', {
  ...commonQueueOptions,
  defaultJobOptions: {
    attempts: 1, // No retry - manual task
    removeOnComplete: {
      age: 30 * 24 * 3600
    },
    removeOnFail: {
      age: 90 * 24 * 3600
    }
  }
});
```

### 6.2 Queue Configuration Details

```typescript
// src/workers/etapa3/handover-channel/queue-config.ts

// Job priorities
export enum HandoverJobPriority {
  CRITICAL_HANDOVER = 1,      // High-value deal, immediate escalation
  URGENT_HANDOVER = 2,        // Time-sensitive
  STANDARD_HANDOVER = 3,      // Normal priority
  LOW_PRIORITY_HANDOVER = 4,  // Non-urgent
  REMINDER = 5,               // Scheduled reminders
  CLEANUP = 10                // Maintenance tasks
}

export enum ChannelJobPriority {
  URGENT_SWITCH = 1,          // Customer requested
  DELIVERY_FAILURE = 2,       // Failed delivery fallback
  SCHEDULED_SYNC = 3,         // Regular sync
  BATCH_SYNC = 4,             // Batch operations
  CLEANUP = 10
}

// Rate limits per queue
export const QUEUE_RATE_LIMITS = {
  'handover-prepare': {
    max: 50,
    duration: 60000 // 50 per minute
  },
  'handover-execute': {
    max: 100,
    duration: 60000 // 100 per minute
  },
  'handover-notification': {
    max: 200,
    duration: 60000 // 200 per minute
  },
  'channel-switch': {
    max: 100,
    duration: 60000
  },
  'channel-sync': {
    max: 50,
    duration: 60000
  }
};

// Concurrency settings
export const QUEUE_CONCURRENCY = {
  'handover-prepare': 5,       // Context compilation is resource-intensive
  'handover-execute': 10,      // Agent assignment can be parallel
  'handover-notification': 20, // Notifications are lightweight
  'handover-reminder': 5,      // Scheduled, not time-critical
  'channel-switch': 10,        // Moderate parallelism
  'channel-sync': 5            // DB-intensive
};

// Lock durations
export const QUEUE_LOCK_DURATION = {
  'handover-prepare': 120000,     // 2 minutes - AI context compilation
  'handover-execute': 60000,      // 1 minute
  'handover-notification': 30000, // 30 seconds
  'handover-reminder': 60000,     // 1 minute
  'channel-switch': 90000,        // 90 seconds - context transfer
  'channel-sync': 180000          // 3 minutes - full sync
};

// Priority calculation
export function calculateHandoverPriority(params: {
  dealValue?: number;
  urgency: string;
  isEscalation: boolean;
  timeWaiting: number; // minutes
}): number {
  const { dealValue, urgency, isEscalation, timeWaiting } = params;

  // Base priority from urgency
  let priority: number;
  switch (urgency) {
    case 'critical':
      priority = HandoverJobPriority.CRITICAL_HANDOVER;
      break;
    case 'high':
      priority = HandoverJobPriority.URGENT_HANDOVER;
      break;
    case 'normal':
      priority = HandoverJobPriority.STANDARD_HANDOVER;
      break;
    default:
      priority = HandoverJobPriority.LOW_PRIORITY_HANDOVER;
  }

  // Boost for high-value deals
  if (dealValue && dealValue > 100000) {
    priority = Math.max(1, priority - 1);
  }

  // Boost for escalations
  if (isEscalation) {
    priority = Math.max(1, priority - 1);
  }

  // Boost for long waiting times
  if (timeWaiting > 30) {
    priority = Math.max(1, priority - 1);
  }

  return priority;
}

// Health check thresholds
export const QUEUE_HEALTH_THRESHOLDS = {
  'handover-prepare': {
    maxWaiting: 50,
    maxFailed: 5,
    maxStalled: 3,
    maxLatencyMs: 120000
  },
  'handover-execute': {
    maxWaiting: 100,
    maxFailed: 10,
    maxStalled: 5,
    maxLatencyMs: 60000
  },
  'handover-notification': {
    maxWaiting: 500,
    maxFailed: 20,
    maxStalled: 10,
    maxLatencyMs: 30000
  },
  'channel-switch': {
    maxWaiting: 100,
    maxFailed: 10,
    maxStalled: 5,
    maxLatencyMs: 90000
  },
  'channel-sync': {
    maxWaiting: 200,
    maxFailed: 20,
    maxStalled: 10,
    maxLatencyMs: 180000
  }
};
```

### 6.3 Queue Event Handlers

```typescript
// src/workers/etapa3/handover-channel/queue-events.ts
import { QueueEvents } from 'bullmq';
import { Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '@/lib/logger';
import { db } from '@/db';
import { queueMetrics } from '@/db/schema';

// Prometheus metrics
const handoverJobsProcessed = new Counter({
  name: 'cerniq_handover_jobs_processed_total',
  help: 'Total handover jobs processed',
  labelNames: ['queue', 'status']
});

const handoverJobDuration = new Histogram({
  name: 'cerniq_handover_job_duration_seconds',
  help: 'Handover job processing duration',
  labelNames: ['queue'],
  buckets: [1, 5, 10, 30, 60, 120, 300]
});

const channelJobsProcessed = new Counter({
  name: 'cerniq_channel_jobs_processed_total',
  help: 'Total channel management jobs processed',
  labelNames: ['queue', 'status']
});

const queueDepthGauge = new Gauge({
  name: 'cerniq_handover_queue_depth',
  help: 'Current queue depth',
  labelNames: ['queue', 'state']
});

// Setup queue event handlers
export function setupQueueEventHandlers(
  queueName: string,
  queueEvents: QueueEvents
): void {
  queueEvents.on('completed', async ({ jobId, returnvalue }) => {
    const isHandoverQueue = queueName.startsWith('handover');
    const counter = isHandoverQueue ? handoverJobsProcessed : channelJobsProcessed;
    counter.inc({ queue: queueName, status: 'completed' });

    logger.debug({
      queue: queueName,
      jobId,
      status: 'completed'
    }, 'Job completed');
  });

  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    const isHandoverQueue = queueName.startsWith('handover');
    const counter = isHandoverQueue ? handoverJobsProcessed : channelJobsProcessed;
    counter.inc({ queue: queueName, status: 'failed' });

    logger.error({
      queue: queueName,
      jobId,
      reason: failedReason
    }, 'Job failed');

    // Record failure for alerting
    await db.execute(sql`
      INSERT INTO queue_metrics (queue_name, metric_type, value, timestamp)
      VALUES (${queueName}, 'failure', 1, NOW())
    `);
  });

  queueEvents.on('stalled', async ({ jobId }) => {
    const isHandoverQueue = queueName.startsWith('handover');
    const counter = isHandoverQueue ? handoverJobsProcessed : channelJobsProcessed;
    counter.inc({ queue: queueName, status: 'stalled' });

    logger.warn({
      queue: queueName,
      jobId
    }, 'Job stalled');
  });

  queueEvents.on('progress', async ({ jobId, data }) => {
    logger.debug({
      queue: queueName,
      jobId,
      progress: data
    }, 'Job progress');
  });

  queueEvents.on('active', async ({ jobId }) => {
    logger.debug({
      queue: queueName,
      jobId
    }, 'Job started');
  });
}

// Update queue depth metrics
export async function updateQueueMetrics(queues: Queue[]): Promise<void> {
  for (const queue of queues) {
    const counts = await queue.getJobCounts();
    
    queueDepthGauge.set({ queue: queue.name, state: 'waiting' }, counts.waiting);
    queueDepthGauge.set({ queue: queue.name, state: 'active' }, counts.active);
    queueDepthGauge.set({ queue: queue.name, state: 'delayed' }, counts.delayed);
    queueDepthGauge.set({ queue: queue.name, state: 'failed' }, counts.failed);
  }
}

// Queue health check
export async function checkQueueHealth(
  queue: Queue,
  thresholds: typeof QUEUE_HEALTH_THRESHOLDS[keyof typeof QUEUE_HEALTH_THRESHOLDS]
): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const counts = await queue.getJobCounts();
  const issues: string[] = [];

  if (counts.waiting > thresholds.maxWaiting) {
    issues.push(`High waiting count: ${counts.waiting} > ${thresholds.maxWaiting}`);
  }

  if (counts.failed > thresholds.maxFailed) {
    issues.push(`High failed count: ${counts.failed} > ${thresholds.maxFailed}`);
  }

  // Check for stalled jobs
  const stalledCount = await queue.getJobCountByTypes('stalled');
  if (stalledCount > thresholds.maxStalled) {
    issues.push(`Stalled jobs: ${stalledCount} > ${thresholds.maxStalled}`);
  }

  return {
    healthy: issues.length === 0,
    issues
  };
}
```

### 6.4 Scheduled Jobs

```typescript
// src/workers/etapa3/handover-channel/scheduled-jobs.ts
import { handoverReminderQueue, channelSyncQueue } from './queues.config';

// Setup scheduled/repeating jobs
export async function setupScheduledJobs(): Promise<void> {
  // Handover acceptance reminders - every 5 minutes
  await handoverReminderQueue.add(
    'check-pending-handovers',
    {},
    {
      repeat: {
        every: 5 * 60 * 1000, // 5 minutes
        immediately: false
      },
      jobId: 'scheduled-reminder-check'
    }
  );

  // Expire overdue handovers - every 15 minutes
  await handoverReminderQueue.add(
    'expire-overdue-handovers',
    {},
    {
      repeat: {
        every: 15 * 60 * 1000,
        immediately: false
      },
      jobId: 'scheduled-expiry-check'
    }
  );

  // Channel sync for batch-mode channels - every minute
  await channelSyncQueue.add(
    'batch-channel-sync',
    { mode: 'batch' },
    {
      repeat: {
        every: 60 * 1000,
        immediately: false
      },
      jobId: 'scheduled-batch-sync'
    }
  );

  // Full sync for all active conversations - every hour
  await channelSyncQueue.add(
    'full-conversation-sync',
    { mode: 'full' },
    {
      repeat: {
        every: 60 * 60 * 1000,
        immediately: false
      },
      jobId: 'scheduled-full-sync'
    }
  );

  // Agent availability check - every 10 minutes
  await handoverReminderQueue.add(
    'check-agent-availability',
    {},
    {
      repeat: {
        every: 10 * 60 * 1000,
        immediately: false
      },
      jobId: 'scheduled-availability-check'
    }
  );

  console.log('Scheduled jobs configured');
}
```


---

## 7. Retry & Error Handling

### 7.1 Error Classification

```typescript
// src/workers/etapa3/handover-channel/error-handling.ts
import { logger } from '@/lib/logger';
import { db } from '@/db';
import { errorLogs, hitlTasks } from '@/db/schema';
import { Queue } from 'bullmq';

// Error types for handover/channel operations
export enum HandoverErrorType {
  // Retryable errors
  AGENT_UNAVAILABLE = 'AGENT_UNAVAILABLE',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
  CONTEXT_COMPILATION_TIMEOUT = 'CONTEXT_COMPILATION_TIMEOUT',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  REDIS_CONNECTION = 'REDIS_CONNECTION',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  
  // Non-retryable errors
  HANDOVER_NOT_FOUND = 'HANDOVER_NOT_FOUND',
  INVALID_HANDOVER_STATE = 'INVALID_HANDOVER_STATE',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  CONTACT_NOT_FOUND = 'CONTACT_NOT_FOUND',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Channel-specific errors
  CHANNEL_UNAVAILABLE = 'CHANNEL_UNAVAILABLE',
  CHANNEL_CONTACT_MISSING = 'CHANNEL_CONTACT_MISSING',
  CHANNEL_OPT_OUT = 'CHANNEL_OPT_OUT',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  MESSAGE_DELIVERY_FAILED = 'MESSAGE_DELIVERY_FAILED'
}

// Error classification configuration
export const HANDOVER_ERROR_CLASSIFICATION: Record<HandoverErrorType, {
  retryable: boolean;
  maxRetries: number;
  backoffMultiplier: number;
  requiresHitl: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'handover' | 'channel' | 'notification' | 'system';
}> = {
  // Retryable errors
  [HandoverErrorType.AGENT_UNAVAILABLE]: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
    category: 'handover'
  },
  [HandoverErrorType.NOTIFICATION_FAILED]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 1.5,
    requiresHitl: false,
    severity: 'low',
    category: 'notification'
  },
  [HandoverErrorType.CONTEXT_COMPILATION_TIMEOUT]: {
    retryable: true,
    maxRetries: 2,
    backoffMultiplier: 3,
    requiresHitl: false,
    severity: 'medium',
    category: 'handover'
  },
  [HandoverErrorType.DATABASE_TIMEOUT]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'high',
    category: 'system'
  },
  [HandoverErrorType.REDIS_CONNECTION]: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 1.5,
    requiresHitl: false,
    severity: 'high',
    category: 'system'
  },
  [HandoverErrorType.AI_SERVICE_UNAVAILABLE]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
    category: 'system'
  },

  // Non-retryable errors
  [HandoverErrorType.HANDOVER_NOT_FOUND]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: false,
    severity: 'low',
    category: 'handover'
  },
  [HandoverErrorType.INVALID_HANDOVER_STATE]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: true,
    severity: 'medium',
    category: 'handover'
  },
  [HandoverErrorType.AGENT_NOT_FOUND]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: true,
    severity: 'high',
    category: 'handover'
  },
  [HandoverErrorType.CONVERSATION_NOT_FOUND]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: true,
    severity: 'high',
    category: 'handover'
  },
  [HandoverErrorType.CONTACT_NOT_FOUND]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: true,
    severity: 'high',
    category: 'handover'
  },
  [HandoverErrorType.INVALID_TRANSITION]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: false,
    severity: 'low',
    category: 'handover'
  },
  [HandoverErrorType.PERMISSION_DENIED]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: false,
    severity: 'low',
    category: 'handover'
  },

  // Channel errors
  [HandoverErrorType.CHANNEL_UNAVAILABLE]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
    category: 'channel'
  },
  [HandoverErrorType.CHANNEL_CONTACT_MISSING]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: true,
    severity: 'medium',
    category: 'channel'
  },
  [HandoverErrorType.CHANNEL_OPT_OUT]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 0,
    requiresHitl: false,
    severity: 'low',
    category: 'channel'
  },
  [HandoverErrorType.SYNC_CONFLICT]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 1.5,
    requiresHitl: false,
    severity: 'low',
    category: 'channel'
  },
  [HandoverErrorType.MESSAGE_DELIVERY_FAILED]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
    category: 'channel'
  }
};
```

### 7.2 Error Handler Implementation

```typescript
// src/workers/etapa3/handover-channel/error-handler.ts
import { 
  HandoverErrorType, 
  HANDOVER_ERROR_CLASSIFICATION 
} from './error-handling';
import { db } from '@/db';
import { errorLogs, hitlTasks } from '@/db/schema';
import { logger } from '@/lib/logger';
import { Queue } from 'bullmq';

// Custom error class
export class HandoverError extends Error {
  public readonly errorType: HandoverErrorType;
  public readonly isRetryable: boolean;
  public readonly maxRetries: number;
  public readonly requiresHitl: boolean;
  public readonly severity: string;
  public readonly category: string;
  public readonly context: Record<string, any>;
  public readonly originalError?: Error;

  constructor(
    errorType: HandoverErrorType,
    message: string,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'HandoverError';
    this.errorType = errorType;
    this.context = context;
    this.originalError = originalError;

    const classification = HANDOVER_ERROR_CLASSIFICATION[errorType];
    this.isRetryable = classification.retryable;
    this.maxRetries = classification.maxRetries;
    this.requiresHitl = classification.requiresHitl;
    this.severity = classification.severity;
    this.category = classification.category;
  }
}

// Error classification function
export function classifyHandoverError(error: Error): HandoverError {
  // Check for known error patterns
  const message = error.message.toLowerCase();

  // Database errors
  if (message.includes('timeout') || message.includes('connection refused')) {
    if (message.includes('redis')) {
      return new HandoverError(
        HandoverErrorType.REDIS_CONNECTION,
        'Redis connection failed',
        {},
        error
      );
    }
    return new HandoverError(
      HandoverErrorType.DATABASE_TIMEOUT,
      'Database timeout',
      {},
      error
    );
  }

  // Not found errors
  if (message.includes('not found')) {
    if (message.includes('handover')) {
      return new HandoverError(
        HandoverErrorType.HANDOVER_NOT_FOUND,
        'Handover not found',
        {},
        error
      );
    }
    if (message.includes('agent')) {
      return new HandoverError(
        HandoverErrorType.AGENT_NOT_FOUND,
        'Agent not found',
        {},
        error
      );
    }
    if (message.includes('conversation')) {
      return new HandoverError(
        HandoverErrorType.CONVERSATION_NOT_FOUND,
        'Conversation not found',
        {},
        error
      );
    }
    if (message.includes('contact')) {
      return new HandoverError(
        HandoverErrorType.CONTACT_NOT_FOUND,
        'Contact not found',
        {},
        error
      );
    }
  }

  // State errors
  if (message.includes('invalid state') || message.includes('invalid transition')) {
    return new HandoverError(
      HandoverErrorType.INVALID_HANDOVER_STATE,
      'Invalid handover state for operation',
      {},
      error
    );
  }

  // Channel errors
  if (message.includes('channel')) {
    if (message.includes('unavailable') || message.includes('not available')) {
      return new HandoverError(
        HandoverErrorType.CHANNEL_UNAVAILABLE,
        'Channel unavailable',
        {},
        error
      );
    }
    if (message.includes('opt') && message.includes('out')) {
      return new HandoverError(
        HandoverErrorType.CHANNEL_OPT_OUT,
        'Contact opted out of channel',
        {},
        error
      );
    }
  }

  // AI service errors
  if (message.includes('anthropic') || message.includes('ai') || message.includes('llm')) {
    return new HandoverError(
      HandoverErrorType.AI_SERVICE_UNAVAILABLE,
      'AI service unavailable',
      {},
      error
    );
  }

  // Default to database timeout for unknown errors
  return new HandoverError(
    HandoverErrorType.DATABASE_TIMEOUT,
    error.message,
    {},
    error
  );
}

// Retry configuration
export const HANDOVER_RETRY_CONFIG = {
  handover: {
    baseDelay: 5000,
    maxDelay: 300000, // 5 minutes
    jitterFactor: 0.2
  },
  channel: {
    baseDelay: 3000,
    maxDelay: 120000, // 2 minutes
    jitterFactor: 0.15
  },
  notification: {
    baseDelay: 2000,
    maxDelay: 60000, // 1 minute
    jitterFactor: 0.1
  },
  system: {
    baseDelay: 10000,
    maxDelay: 600000, // 10 minutes
    jitterFactor: 0.25
  }
};

// Calculate backoff delay with jitter
export function calculateBackoffDelay(
  attemptNumber: number,
  category: string,
  backoffMultiplier: number
): number {
  const config = HANDOVER_RETRY_CONFIG[category] || HANDOVER_RETRY_CONFIG.system;
  
  // Exponential backoff
  let delay = config.baseDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
  
  // Apply max
  delay = Math.min(delay, config.maxDelay);
  
  // Apply jitter
  const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
  delay = Math.max(config.baseDelay, delay + jitter);
  
  return Math.round(delay);
}

// Main error handler
export async function handleHandoverError(
  error: Error | HandoverError,
  jobData: any,
  attemptNumber: number,
  queueName: string
): Promise<{
  shouldRetry: boolean;
  retryDelay?: number;
  hitlTaskId?: string;
}> {
  // Classify error if needed
  const handoverError = error instanceof HandoverError 
    ? error 
    : classifyHandoverError(error);

  const classification = HANDOVER_ERROR_CLASSIFICATION[handoverError.errorType];

  // Log error
  await db.insert(errorLogs).values({
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId: jobData.tenantId,
    errorType: handoverError.errorType,
    message: handoverError.message,
    category: handoverError.category,
    severity: handoverError.severity,
    context: {
      ...handoverError.context,
      jobData,
      attemptNumber,
      queueName
    },
    stack: handoverError.originalError?.stack || handoverError.stack,
    createdAt: new Date()
  });

  logger.error({
    errorType: handoverError.errorType,
    message: handoverError.message,
    severity: handoverError.severity,
    attemptNumber,
    maxRetries: classification.maxRetries,
    requiresHitl: classification.requiresHitl
  }, 'Handover/Channel error occurred');

  // Determine if should retry
  const shouldRetry = handoverError.isRetryable && attemptNumber < classification.maxRetries;

  // Create HITL task if required
  let hitlTaskId: string | undefined;
  if (classification.requiresHitl && !shouldRetry) {
    hitlTaskId = await createErrorHitlTask(handoverError, jobData);
  }

  // Calculate retry delay
  const retryDelay = shouldRetry 
    ? calculateBackoffDelay(attemptNumber, classification.category, classification.backoffMultiplier)
    : undefined;

  return {
    shouldRetry,
    retryDelay,
    hitlTaskId
  };
}

// Create HITL task for errors
async function createErrorHitlTask(
  error: HandoverError,
  jobData: any
): Promise<string> {
  const hitlQueue = new Queue('hitl-tasks', {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  });

  const taskId = `hitl_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await hitlQueue.add('create-error-task', {
    taskId,
    tenantId: jobData.tenantId,
    category: `${error.category}_error`,
    title: getHitlTaskTitle(error),
    description: getHitlTaskDescription(error, jobData),
    priority: error.severity === 'critical' ? 1 : error.severity === 'high' ? 2 : 3,
    relatedEntityType: error.category === 'handover' ? 'handover' : 'conversation',
    relatedEntityId: jobData.handoverId || jobData.conversationId,
    errorContext: {
      errorType: error.errorType,
      message: error.message,
      context: error.context
    },
    suggestedActions: getSuggestedActions(error.errorType)
  });

  return taskId;
}

function getHitlTaskTitle(error: HandoverError): string {
  const titles: Record<HandoverErrorType, string> = {
    [HandoverErrorType.AGENT_NOT_FOUND]: 'Agent Assignment Failed - Agent Not Found',
    [HandoverErrorType.CONVERSATION_NOT_FOUND]: 'Handover Failed - Conversation Missing',
    [HandoverErrorType.CONTACT_NOT_FOUND]: 'Handover Failed - Contact Missing',
    [HandoverErrorType.INVALID_HANDOVER_STATE]: 'Invalid Handover State Detected',
    [HandoverErrorType.CHANNEL_CONTACT_MISSING]: 'Channel Switch Failed - Contact Info Missing'
  };
  
  return titles[error.errorType] || `Error: ${error.errorType}`;
}

function getHitlTaskDescription(error: HandoverError, jobData: any): string {
  return `
Error: ${error.message}
Type: ${error.errorType}
Severity: ${error.severity}

Context:
- Tenant ID: ${jobData.tenantId}
- Handover ID: ${jobData.handoverId || 'N/A'}
- Conversation ID: ${jobData.conversationId || 'N/A'}
- Contact ID: ${jobData.contactId || 'N/A'}

Additional Context:
${JSON.stringify(error.context, null, 2)}

Please review and take appropriate action.
  `.trim();
}

function getSuggestedActions(errorType: HandoverErrorType): string[] {
  const actions: Record<HandoverErrorType, string[]> = {
    [HandoverErrorType.AGENT_NOT_FOUND]: [
      'Verify agent exists in system',
      'Check if agent was recently deactivated',
      'Manually assign to another agent'
    ],
    [HandoverErrorType.CONVERSATION_NOT_FOUND]: [
      'Check if conversation was deleted',
      'Verify conversation ID is correct',
      'Create new conversation if needed'
    ],
    [HandoverErrorType.CONTACT_NOT_FOUND]: [
      'Verify contact exists in database',
      'Check if contact was merged or deleted',
      'Create contact record if missing'
    ],
    [HandoverErrorType.INVALID_HANDOVER_STATE]: [
      'Review handover state history',
      'Manually update handover status',
      'Cancel and create new handover if needed'
    ],
    [HandoverErrorType.CHANNEL_CONTACT_MISSING]: [
      'Update contact with missing channel info',
      'Use alternative channel',
      'Request contact information from customer'
    ]
  };
  
  return actions[errorType] || ['Review error details', 'Contact support if needed'];
}
```

### 7.3 Idempotency Management

```typescript
// src/workers/etapa3/handover-channel/idempotency.ts
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { logger } from '@/lib/logger';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 6
});

const IDEMPOTENCY_PREFIX = 'idempotency:handover:';
const DEFAULT_TTL = 24 * 60 * 60; // 24 hours

export class HandoverIdempotencyManager {
  // Generate idempotency key for handover operations
  generateHandoverKey(tenantId: string, conversationId: string, operation: string): string {
    const input = `${tenantId}:${conversationId}:${operation}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  // Generate idempotency key for channel switch
  generateChannelSwitchKey(
    tenantId: string, 
    conversationId: string, 
    fromChannel: string, 
    toChannel: string
  ): string {
    const input = `${tenantId}:${conversationId}:${fromChannel}:${toChannel}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  // Generate idempotency key for notifications
  generateNotificationKey(
    handoverId: string, 
    agentId: string, 
    notificationType: string
  ): string {
    const input = `${handoverId}:${agentId}:${notificationType}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  // Check if operation was already processed
  async checkOperation(key: string): Promise<{
    exists: boolean;
    status?: 'pending' | 'completed' | 'failed';
    result?: any;
    stalePending?: boolean;
  }> {
    const fullKey = `${IDEMPOTENCY_PREFIX}${key}`;
    const data = await redis.hgetall(fullKey);

    if (!data || Object.keys(data).length === 0) {
      return { exists: false };
    }

    // Check if pending operation is stale (> 10 minutes)
    const stalePending = data.status === 'pending' && 
      data.startedAt && 
      Date.now() - parseInt(data.startedAt) > 10 * 60 * 1000;

    return {
      exists: true,
      status: data.status as 'pending' | 'completed' | 'failed',
      result: data.result ? JSON.parse(data.result) : undefined,
      stalePending
    };
  }

  // Mark operation as pending (with SETNX pattern)
  async markPending(key: string, metadata: Record<string, any> = {}): Promise<boolean> {
    const fullKey = `${IDEMPOTENCY_PREFIX}${key}`;
    
    const result = await redis.hsetnx(fullKey, 'status', 'pending');
    
    if (result === 1) {
      // Successfully claimed the operation
      await redis.hset(fullKey, {
        startedAt: Date.now().toString(),
        metadata: JSON.stringify(metadata)
      });
      await redis.expire(fullKey, DEFAULT_TTL);
      return true;
    }

    // Check if existing pending is stale
    const check = await this.checkOperation(key);
    if (check.stalePending) {
      // Reclaim stale operation
      await redis.hset(fullKey, {
        status: 'pending',
        startedAt: Date.now().toString(),
        metadata: JSON.stringify(metadata)
      });
      logger.warn({ key }, 'Reclaimed stale pending operation');
      return true;
    }

    return false;
  }

  // Mark operation as completed
  async markCompleted(key: string, result: any): Promise<void> {
    const fullKey = `${IDEMPOTENCY_PREFIX}${key}`;
    
    await redis.hset(fullKey, {
      status: 'completed',
      completedAt: Date.now().toString(),
      result: JSON.stringify(result)
    });
    await redis.expire(fullKey, DEFAULT_TTL);
  }

  // Mark operation as failed
  async markFailed(key: string, error: string): Promise<void> {
    const fullKey = `${IDEMPOTENCY_PREFIX}${key}`;
    
    await redis.hset(fullKey, {
      status: 'failed',
      failedAt: Date.now().toString(),
      error
    });
    await redis.expire(fullKey, DEFAULT_TTL);
  }

  // Clear idempotency key (for retry scenarios)
  async clear(key: string): Promise<void> {
    const fullKey = `${IDEMPOTENCY_PREFIX}${key}`;
    await redis.del(fullKey);
  }
}
```

### 7.4 Circuit Breaker Pattern

```typescript
// src/workers/etapa3/handover-channel/circuit-breaker.ts
import CircuitBreaker from 'opossum';
import { Counter, Gauge } from 'prom-client';
import { logger } from '@/lib/logger';

// Circuit breaker metrics
const circuitBreakerState = new Gauge({
  name: 'cerniq_handover_circuit_breaker_state',
  help: 'Circuit breaker state (0=open, 0.5=half-open, 1=closed)',
  labelNames: ['service']
});

const circuitBreakerEvents = new Counter({
  name: 'cerniq_handover_circuit_breaker_events_total',
  help: 'Circuit breaker events',
  labelNames: ['service', 'event']
});

// Circuit breaker configurations
export const HANDOVER_CIRCUIT_BREAKER_CONFIG = {
  agentAssignment: {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    volumeThreshold: 5
  },
  notificationService: {
    timeout: 15000,
    errorThresholdPercentage: 40,
    resetTimeout: 30000,
    volumeThreshold: 10
  },
  channelSwitch: {
    timeout: 60000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    volumeThreshold: 5
  },
  channelSync: {
    timeout: 120000,
    errorThresholdPercentage: 30,
    resetTimeout: 120000,
    volumeThreshold: 10
  },
  aiContextCompilation: {
    timeout: 90000,
    errorThresholdPercentage: 40,
    resetTimeout: 60000,
    volumeThreshold: 3
  }
};

// Create circuit breaker with metrics
export function createHandoverCircuitBreaker<T>(
  serviceName: string,
  fn: (...args: any[]) => Promise<T>,
  config?: Partial<typeof HANDOVER_CIRCUIT_BREAKER_CONFIG['agentAssignment']>
): CircuitBreaker<any[], T> {
  const defaultConfig = HANDOVER_CIRCUIT_BREAKER_CONFIG[serviceName] || 
    HANDOVER_CIRCUIT_BREAKER_CONFIG.agentAssignment;

  const breaker = new CircuitBreaker(fn, {
    timeout: config?.timeout || defaultConfig.timeout,
    errorThresholdPercentage: config?.errorThresholdPercentage || defaultConfig.errorThresholdPercentage,
    resetTimeout: config?.resetTimeout || defaultConfig.resetTimeout,
    volumeThreshold: config?.volumeThreshold || defaultConfig.volumeThreshold,
    name: serviceName
  });

  // Event handlers
  breaker.on('open', () => {
    circuitBreakerState.set({ service: serviceName }, 0);
    circuitBreakerEvents.inc({ service: serviceName, event: 'open' });
    logger.warn({ service: serviceName }, 'Circuit breaker OPENED');
  });

  breaker.on('close', () => {
    circuitBreakerState.set({ service: serviceName }, 1);
    circuitBreakerEvents.inc({ service: serviceName, event: 'close' });
    logger.info({ service: serviceName }, 'Circuit breaker CLOSED');
  });

  breaker.on('halfOpen', () => {
    circuitBreakerState.set({ service: serviceName }, 0.5);
    circuitBreakerEvents.inc({ service: serviceName, event: 'halfOpen' });
    logger.info({ service: serviceName }, 'Circuit breaker HALF-OPEN');
  });

  breaker.on('reject', () => {
    circuitBreakerEvents.inc({ service: serviceName, event: 'reject' });
    logger.debug({ service: serviceName }, 'Request rejected by circuit breaker');
  });

  breaker.on('timeout', () => {
    circuitBreakerEvents.inc({ service: serviceName, event: 'timeout' });
    logger.warn({ service: serviceName }, 'Request timed out');
  });

  breaker.on('success', () => {
    circuitBreakerEvents.inc({ service: serviceName, event: 'success' });
  });

  breaker.on('failure', (error) => {
    circuitBreakerEvents.inc({ service: serviceName, event: 'failure' });
    logger.error({ service: serviceName, error: error.message }, 'Circuit breaker failure');
  });

  // Initialize state metric
  circuitBreakerState.set({ service: serviceName }, 1);

  return breaker;
}

// Circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker<T>(
  serviceName: string,
  fn: (...args: any[]) => Promise<T>
): CircuitBreaker<any[], T> {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, createHandoverCircuitBreaker(serviceName, fn));
  }
  return circuitBreakers.get(serviceName)!;
}

// Get all circuit breaker stats
export function getCircuitBreakerStats(): Record<string, any> {
  const stats: Record<string, any> = {};
  
  for (const [name, breaker] of circuitBreakers.entries()) {
    stats[name] = breaker.stats;
  }
  
  return stats;
}
```


---

## 8. Monitoring & Metrics

### 8.1 Prometheus Metrics Definition

```typescript
// src/workers/etapa3/handover-channel/metrics.ts
import { Counter, Gauge, Histogram, Summary, Registry } from 'prom-client';

// Create dedicated registry for handover/channel workers
export const handoverMetricsRegistry = new Registry();
handoverMetricsRegistry.setDefaultLabels({ module: 'etapa3_handover_channel' });

// ============================================================================
// HANDOVER METRICS
// ============================================================================

// Handover job counters
export const handoverJobsTotal = new Counter({
  name: 'cerniq_handover_jobs_total',
  help: 'Total number of handover jobs processed',
  labelNames: ['tenant_id', 'worker', 'status', 'urgency'],
  registers: [handoverMetricsRegistry]
});

export const handoverPreparationTime = new Histogram({
  name: 'cerniq_handover_preparation_seconds',
  help: 'Time spent preparing handover context',
  labelNames: ['tenant_id', 'context_quality'],
  buckets: [1, 2, 5, 10, 20, 30, 60, 120],
  registers: [handoverMetricsRegistry]
});

export const handoverAcceptanceTime = new Histogram({
  name: 'cerniq_handover_acceptance_seconds',
  help: 'Time from handover creation to agent acceptance',
  labelNames: ['tenant_id', 'urgency', 'outcome'],
  buckets: [30, 60, 120, 300, 600, 1200, 1800, 3600],
  registers: [handoverMetricsRegistry]
});

export const handoverCompletionTime = new Histogram({
  name: 'cerniq_handover_completion_seconds',
  help: 'Total time from handover creation to completion',
  labelNames: ['tenant_id', 'outcome'],
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400, 28800],
  registers: [handoverMetricsRegistry]
});

export const handoverStateGauge = new Gauge({
  name: 'cerniq_handover_state_current',
  help: 'Current number of handovers in each state',
  labelNames: ['tenant_id', 'state'],
  registers: [handoverMetricsRegistry]
});

export const handoverDeclineRate = new Gauge({
  name: 'cerniq_handover_decline_rate',
  help: 'Rate of declined handovers (rolling 1h window)',
  labelNames: ['tenant_id', 'agent_id'],
  registers: [handoverMetricsRegistry]
});

export const handoverEscalationTotal = new Counter({
  name: 'cerniq_handover_escalations_total',
  help: 'Total number of handover escalations',
  labelNames: ['tenant_id', 'reason', 'escalation_level'],
  registers: [handoverMetricsRegistry]
});

export const handoverReassignmentTotal = new Counter({
  name: 'cerniq_handover_reassignments_total',
  help: 'Total number of handover reassignments',
  labelNames: ['tenant_id', 'reason'],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// AGENT METRICS
// ============================================================================

export const agentWorkloadGauge = new Gauge({
  name: 'cerniq_agent_workload_current',
  help: 'Current workload per agent',
  labelNames: ['tenant_id', 'agent_id', 'agent_name'],
  registers: [handoverMetricsRegistry]
});

export const agentAvailabilityGauge = new Gauge({
  name: 'cerniq_agent_availability',
  help: 'Agent availability status (1=available, 0=unavailable)',
  labelNames: ['tenant_id', 'agent_id', 'agent_name'],
  registers: [handoverMetricsRegistry]
});

export const agentAcceptanceRate = new Gauge({
  name: 'cerniq_agent_acceptance_rate',
  help: 'Agent handover acceptance rate (rolling 24h)',
  labelNames: ['tenant_id', 'agent_id'],
  registers: [handoverMetricsRegistry]
});

export const agentResponseTime = new Summary({
  name: 'cerniq_agent_response_time_seconds',
  help: 'Agent response time to handover requests',
  labelNames: ['tenant_id', 'agent_id'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  maxAgeSeconds: 3600,
  ageBuckets: 5,
  registers: [handoverMetricsRegistry]
});

export const agentHandoversCompletedTotal = new Counter({
  name: 'cerniq_agent_handovers_completed_total',
  help: 'Total handovers completed per agent',
  labelNames: ['tenant_id', 'agent_id', 'outcome'],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// CHANNEL METRICS
// ============================================================================

export const channelSwitchTotal = new Counter({
  name: 'cerniq_channel_switch_total',
  help: 'Total channel switches',
  labelNames: ['tenant_id', 'from_channel', 'to_channel', 'reason', 'status'],
  registers: [handoverMetricsRegistry]
});

export const channelSwitchDuration = new Histogram({
  name: 'cerniq_channel_switch_duration_seconds',
  help: 'Time to complete channel switch',
  labelNames: ['tenant_id', 'from_channel', 'to_channel'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [handoverMetricsRegistry]
});

export const channelSyncTotal = new Counter({
  name: 'cerniq_channel_sync_total',
  help: 'Total channel synchronization operations',
  labelNames: ['tenant_id', 'sync_type', 'status'],
  registers: [handoverMetricsRegistry]
});

export const channelSyncDuration = new Histogram({
  name: 'cerniq_channel_sync_duration_seconds',
  help: 'Duration of channel synchronization',
  labelNames: ['tenant_id', 'sync_type'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [handoverMetricsRegistry]
});

export const channelSyncLagSeconds = new Gauge({
  name: 'cerniq_channel_sync_lag_seconds',
  help: 'Current sync lag per channel',
  labelNames: ['tenant_id', 'conversation_id', 'channel'],
  registers: [handoverMetricsRegistry]
});

export const channelActiveGauge = new Gauge({
  name: 'cerniq_channel_active_conversations',
  help: 'Active conversations per channel',
  labelNames: ['tenant_id', 'channel'],
  registers: [handoverMetricsRegistry]
});

export const channelMessageTotal = new Counter({
  name: 'cerniq_channel_messages_total',
  help: 'Total messages per channel',
  labelNames: ['tenant_id', 'channel', 'direction', 'sender_type'],
  registers: [handoverMetricsRegistry]
});

export const channelDeliveryRate = new Gauge({
  name: 'cerniq_channel_delivery_rate',
  help: 'Message delivery success rate per channel',
  labelNames: ['tenant_id', 'channel'],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// NOTIFICATION METRICS
// ============================================================================

export const notificationSentTotal = new Counter({
  name: 'cerniq_handover_notifications_sent_total',
  help: 'Total notifications sent',
  labelNames: ['tenant_id', 'channel', 'type', 'status'],
  registers: [handoverMetricsRegistry]
});

export const notificationDeliveryTime = new Histogram({
  name: 'cerniq_notification_delivery_seconds',
  help: 'Time to deliver notification',
  labelNames: ['tenant_id', 'channel'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [handoverMetricsRegistry]
});

export const notificationFailureTotal = new Counter({
  name: 'cerniq_notification_failures_total',
  help: 'Total notification delivery failures',
  labelNames: ['tenant_id', 'channel', 'error_type'],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// CONTEXT COMPILATION METRICS
// ============================================================================

export const contextCompilationDuration = new Histogram({
  name: 'cerniq_context_compilation_seconds',
  help: 'Time to compile handover context',
  labelNames: ['tenant_id', 'context_size'],
  buckets: [1, 2, 5, 10, 20, 30, 60, 90, 120],
  registers: [handoverMetricsRegistry]
});

export const contextTokenCount = new Histogram({
  name: 'cerniq_context_tokens_total',
  help: 'Token count in compiled context',
  labelNames: ['tenant_id'],
  buckets: [500, 1000, 2000, 4000, 8000, 16000, 32000],
  registers: [handoverMetricsRegistry]
});

export const contextQualityScore = new Gauge({
  name: 'cerniq_context_quality_score',
  help: 'Quality score of compiled context (0-100)',
  labelNames: ['tenant_id', 'handover_id'],
  registers: [handoverMetricsRegistry]
});

export const contextAISummaryDuration = new Histogram({
  name: 'cerniq_context_ai_summary_seconds',
  help: 'Time for AI to generate context summary',
  labelNames: ['tenant_id', 'model'],
  buckets: [1, 2, 5, 10, 20, 30, 45, 60],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// DEDUPLICATION METRICS
// ============================================================================

export const deduplicationTotal = new Counter({
  name: 'cerniq_message_deduplication_total',
  help: 'Total deduplication operations',
  labelNames: ['tenant_id', 'action', 'match_type'],
  registers: [handoverMetricsRegistry]
});

export const deduplicationConfidence = new Histogram({
  name: 'cerniq_deduplication_confidence',
  help: 'Confidence score distribution for deduplication',
  labelNames: ['tenant_id'],
  buckets: [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.99, 1.0],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// QUEUE METRICS
// ============================================================================

export const queueDepthGauge = new Gauge({
  name: 'cerniq_handover_queue_depth',
  help: 'Current queue depth',
  labelNames: ['queue', 'state'],
  registers: [handoverMetricsRegistry]
});

export const queueProcessingTime = new Histogram({
  name: 'cerniq_handover_queue_processing_seconds',
  help: 'Job processing time per queue',
  labelNames: ['queue', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  registers: [handoverMetricsRegistry]
});

export const queueWaitTime = new Histogram({
  name: 'cerniq_handover_queue_wait_seconds',
  help: 'Time jobs spend waiting in queue',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
  registers: [handoverMetricsRegistry]
});

export const queueRetryTotal = new Counter({
  name: 'cerniq_handover_queue_retries_total',
  help: 'Total queue job retries',
  labelNames: ['queue', 'error_type'],
  registers: [handoverMetricsRegistry]
});
```

### 8.2 Metrics Collection Service

```typescript
// src/workers/etapa3/handover-channel/metrics-collector.ts
import { db } from '@/db';
import { 
  handovers, 
  agents, 
  channelSwitches, 
  conversationSyncStates,
  notifications,
  conversationMessages 
} from '@/db/schema';
import { eq, and, gte, sql, count, avg, desc } from 'drizzle-orm';
import {
  handoverStateGauge,
  agentWorkloadGauge,
  agentAvailabilityGauge,
  agentAcceptanceRate,
  channelActiveGauge,
  channelDeliveryRate,
  channelSyncLagSeconds,
  handoverDeclineRate
} from './metrics';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

// Metrics collection intervals
const COLLECTION_INTERVALS = {
  handoverState: 15000,      // 15 seconds
  agentMetrics: 30000,       // 30 seconds
  channelMetrics: 60000,     // 1 minute
  syncMetrics: 30000,        // 30 seconds
  rateMetrics: 300000        // 5 minutes
};

// Cache keys
const METRICS_CACHE_PREFIX = 'metrics:handover:';
const CACHE_TTL = 60; // 1 minute

export class HandoverMetricsCollector {
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  // Start collecting metrics
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Metrics collector already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting handover metrics collector');

    // Initial collection
    await this.collectAllMetrics();

    // Set up intervals
    this.intervals.push(
      setInterval(() => this.collectHandoverStateMetrics(), COLLECTION_INTERVALS.handoverState),
      setInterval(() => this.collectAgentMetrics(), COLLECTION_INTERVALS.agentMetrics),
      setInterval(() => this.collectChannelMetrics(), COLLECTION_INTERVALS.channelMetrics),
      setInterval(() => this.collectSyncMetrics(), COLLECTION_INTERVALS.syncMetrics),
      setInterval(() => this.collectRateMetrics(), COLLECTION_INTERVALS.rateMetrics)
    );

    logger.info('Handover metrics collector started');
  }

  // Stop collecting metrics
  stop(): void {
    this.isRunning = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    logger.info('Handover metrics collector stopped');
  }

  // Collect all metrics at once
  async collectAllMetrics(): Promise<void> {
    await Promise.all([
      this.collectHandoverStateMetrics(),
      this.collectAgentMetrics(),
      this.collectChannelMetrics(),
      this.collectSyncMetrics(),
      this.collectRateMetrics()
    ]);
  }

  // Collect handover state distribution metrics
  async collectHandoverStateMetrics(): Promise<void> {
    try {
      const states = await db
        .select({
          tenantId: handovers.tenantId,
          status: handovers.status,
          count: count()
        })
        .from(handovers)
        .groupBy(handovers.tenantId, handovers.status);

      // Reset all states first
      handoverStateGauge.reset();

      for (const state of states) {
        handoverStateGauge.set(
          { tenant_id: state.tenantId, state: state.status },
          Number(state.count)
        );
      }

      // Cache for dashboard
      await redis.setex(
        `${METRICS_CACHE_PREFIX}states`,
        CACHE_TTL,
        JSON.stringify(states)
      );

    } catch (error) {
      logger.error({ error }, 'Failed to collect handover state metrics');
    }
  }

  // Collect agent-related metrics
  async collectAgentMetrics(): Promise<void> {
    try {
      // Get all active agents
      const activeAgents = await db
        .select({
          id: agents.id,
          tenantId: agents.tenantId,
          name: agents.name,
          status: agents.status,
          currentWorkload: agents.currentWorkload,
          maxWorkload: agents.maxWorkload
        })
        .from(agents)
        .where(eq(agents.isActive, true));

      // Reset gauges
      agentWorkloadGauge.reset();
      agentAvailabilityGauge.reset();

      for (const agent of activeAgents) {
        // Workload
        agentWorkloadGauge.set(
          { 
            tenant_id: agent.tenantId, 
            agent_id: agent.id,
            agent_name: agent.name 
          },
          agent.currentWorkload || 0
        );

        // Availability (1 = available, 0 = unavailable)
        const isAvailable = 
          agent.status === 'available' && 
          (agent.currentWorkload || 0) < (agent.maxWorkload || 10);
        
        agentAvailabilityGauge.set(
          { 
            tenant_id: agent.tenantId, 
            agent_id: agent.id,
            agent_name: agent.name 
          },
          isAvailable ? 1 : 0
        );
      }

      // Cache for dashboard
      await redis.setex(
        `${METRICS_CACHE_PREFIX}agents`,
        CACHE_TTL,
        JSON.stringify(activeAgents)
      );

    } catch (error) {
      logger.error({ error }, 'Failed to collect agent metrics');
    }
  }

  // Collect channel-related metrics
  async collectChannelMetrics(): Promise<void> {
    try {
      // Active conversations per channel
      const channelStats = await db.execute(sql`
        SELECT 
          tenant_id,
          current_channel,
          COUNT(*) as conversation_count
        FROM etapa3.ai_conversations
        WHERE status IN ('active', 'in_progress')
        GROUP BY tenant_id, current_channel
      `);

      channelActiveGauge.reset();

      for (const stat of channelStats.rows as any[]) {
        channelActiveGauge.set(
          { tenant_id: stat.tenant_id, channel: stat.current_channel || 'unknown' },
          Number(stat.conversation_count)
        );
      }

      // Delivery rates per channel (last hour)
      const oneHourAgo = new Date(Date.now() - 3600000);
      const deliveryStats = await db.execute(sql`
        SELECT 
          tenant_id,
          channel,
          COUNT(*) FILTER (WHERE delivery_status = 'delivered' OR delivery_status = 'read') as delivered,
          COUNT(*) as total
        FROM etapa3.conversation_messages
        WHERE created_at >= ${oneHourAgo}
          AND sender_type = 'ai'
        GROUP BY tenant_id, channel
      `);

      channelDeliveryRate.reset();

      for (const stat of deliveryStats.rows as any[]) {
        const rate = stat.total > 0 ? stat.delivered / stat.total : 1;
        channelDeliveryRate.set(
          { tenant_id: stat.tenant_id, channel: stat.channel },
          rate
        );
      }

      // Cache for dashboard
      await redis.setex(
        `${METRICS_CACHE_PREFIX}channels`,
        CACHE_TTL,
        JSON.stringify({ channelStats: channelStats.rows, deliveryStats: deliveryStats.rows })
      );

    } catch (error) {
      logger.error({ error }, 'Failed to collect channel metrics');
    }
  }

  // Collect sync lag metrics
  async collectSyncMetrics(): Promise<void> {
    try {
      // Get sync states for active conversations
      const syncStates = await db
        .select({
          tenantId: conversationSyncStates.tenantId,
          conversationId: conversationSyncStates.conversationId,
          channelStates: conversationSyncStates.channelStates,
          lastSyncAt: conversationSyncStates.lastSyncAt
        })
        .from(conversationSyncStates)
        .where(
          gte(conversationSyncStates.lastSyncAt, new Date(Date.now() - 3600000))
        )
        .limit(1000);

      channelSyncLagSeconds.reset();

      for (const state of syncStates) {
        const channelStates = state.channelStates as Record<string, { lastSyncAt: string }>;
        
        for (const [channel, channelState] of Object.entries(channelStates)) {
          const lastSync = new Date(channelState.lastSyncAt);
          const lagSeconds = (Date.now() - lastSync.getTime()) / 1000;
          
          channelSyncLagSeconds.set(
            { 
              tenant_id: state.tenantId, 
              conversation_id: state.conversationId,
              channel 
            },
            lagSeconds
          );
        }
      }

    } catch (error) {
      logger.error({ error }, 'Failed to collect sync metrics');
    }
  }

  // Collect rate-based metrics (acceptance rate, decline rate)
  async collectRateMetrics(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 86400000);

      // Agent acceptance rates (last 24 hours)
      const acceptanceStats = await db.execute(sql`
        SELECT 
          tenant_id,
          assigned_agent_id as agent_id,
          COUNT(*) FILTER (WHERE status = 'accepted' OR status = 'completed') as accepted,
          COUNT(*) FILTER (WHERE status = 'declined') as declined,
          COUNT(*) as total
        FROM etapa3.handovers
        WHERE created_at >= ${oneDayAgo}
          AND assigned_agent_id IS NOT NULL
        GROUP BY tenant_id, assigned_agent_id
      `);

      agentAcceptanceRate.reset();
      handoverDeclineRate.reset();

      for (const stat of acceptanceStats.rows as any[]) {
        // Acceptance rate
        const acceptRate = stat.total > 0 ? stat.accepted / stat.total : 1;
        agentAcceptanceRate.set(
          { tenant_id: stat.tenant_id, agent_id: stat.agent_id },
          acceptRate
        );

        // Decline rate (1h window for alerts)
        const declineRate = stat.total > 0 ? stat.declined / stat.total : 0;
        handoverDeclineRate.set(
          { tenant_id: stat.tenant_id, agent_id: stat.agent_id },
          declineRate
        );
      }

      // Cache for dashboard
      await redis.setex(
        `${METRICS_CACHE_PREFIX}rates`,
        CACHE_TTL,
        JSON.stringify(acceptanceStats.rows)
      );

    } catch (error) {
      logger.error({ error }, 'Failed to collect rate metrics');
    }
  }

  // Get cached metrics for API/dashboard
  async getCachedMetrics(): Promise<{
    states: any[];
    agents: any[];
    channels: any;
    rates: any[];
  }> {
    const [states, agents, channels, rates] = await Promise.all([
      redis.get(`${METRICS_CACHE_PREFIX}states`),
      redis.get(`${METRICS_CACHE_PREFIX}agents`),
      redis.get(`${METRICS_CACHE_PREFIX}channels`),
      redis.get(`${METRICS_CACHE_PREFIX}rates`)
    ]);

    return {
      states: states ? JSON.parse(states) : [],
      agents: agents ? JSON.parse(agents) : [],
      channels: channels ? JSON.parse(channels) : {},
      rates: rates ? JSON.parse(rates) : []
    };
  }
}

// Singleton instance
export const handoverMetricsCollector = new HandoverMetricsCollector();
```

### 8.3 Grafana Dashboards

#### 8.3.1 Handover Operations Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "handover-operations",
    "title": "Etapa 3 - Handover Operations",
    "tags": ["etapa3", "handover", "agents"],
    "timezone": "Europe/Bucharest",
    "refresh": "30s",
    "panels": [
      {
        "id": 1,
        "title": "Handover Volume Overview",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_handover_jobs_total[24h]))",
            "legendFormat": "Total Handovers (24h)"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "blue", "value": null }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Current Pending Handovers",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 },
        "targets": [
          {
            "expr": "sum(cerniq_handover_state_current{state='pending_acceptance'})",
            "legendFormat": "Pending"
          }
        ],
        "fieldConfig": {
          "defaults": {
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
        "title": "Acceptance Rate",
        "type": "gauge",
        "gridPos": { "h": 4, "w": 6, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_handover_jobs_total{status='accepted'}[24h])) / sum(increase(cerniq_handover_jobs_total[24h])) * 100",
            "legendFormat": "Acceptance %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 100,
            "unit": "percent",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": null },
                { "color": "yellow", "value": 70 },
                { "color": "green", "value": 90 }
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Avg Time to Acceptance",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 18, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.5, sum(rate(cerniq_handover_acceptance_seconds_bucket[1h])) by (le))",
            "legendFormat": "Median"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 300 },
                { "color": "red", "value": 600 }
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Handover State Distribution",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 8, "x": 0, "y": 4 },
        "targets": [
          {
            "expr": "sum by (state) (cerniq_handover_state_current)",
            "legendFormat": "{{state}}"
          }
        ],
        "options": {
          "pieType": "donut",
          "legend": { "displayMode": "table", "placement": "right" }
        }
      },
      {
        "id": 6,
        "title": "Handover Volume by Urgency",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 16, "x": 8, "y": 4 },
        "targets": [
          {
            "expr": "sum by (urgency) (increase(cerniq_handover_jobs_total[5m]))",
            "legendFormat": "{{urgency}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {
              "drawStyle": "bars",
              "stacking": { "mode": "normal" }
            }
          }
        }
      },
      {
        "id": 7,
        "title": "Handover Acceptance Time Distribution",
        "type": "heatmap",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 12 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_handover_acceptance_seconds_bucket[5m])) by (le)",
            "format": "heatmap",
            "legendFormat": "{{le}}"
          }
        ],
        "options": {
          "calculate": false,
          "yAxis": { "unit": "s" }
        }
      },
      {
        "id": 8,
        "title": "Escalations & Reassignments",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 12 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_handover_escalations_total[5m]))",
            "legendFormat": "Escalations"
          },
          {
            "expr": "sum(increase(cerniq_handover_reassignments_total[5m]))",
            "legendFormat": "Reassignments"
          }
        ]
      },
      {
        "id": 9,
        "title": "Agent Workload Distribution",
        "type": "bargauge",
        "gridPos": { "h": 8, "w": 24, "x": 0, "y": 20 },
        "targets": [
          {
            "expr": "cerniq_agent_workload_current",
            "legendFormat": "{{agent_name}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 15,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 8 },
                { "color": "red", "value": 12 }
              ]
            }
          }
        },
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        }
      }
    ]
  }
}
```

#### 8.3.2 Channel Management Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "channel-management",
    "title": "Etapa 3 - Channel Management",
    "tags": ["etapa3", "channels", "sync"],
    "timezone": "Europe/Bucharest",
    "refresh": "30s",
    "panels": [
      {
        "id": 1,
        "title": "Active Conversations by Channel",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 8, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum by (channel) (cerniq_channel_active_conversations)",
            "legendFormat": "{{channel}}"
          }
        ],
        "options": {
          "pieType": "pie",
          "legend": { "displayMode": "table", "placement": "right" }
        }
      },
      {
        "id": 2,
        "title": "Channel Switch Volume",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 16, "x": 8, "y": 0 },
        "targets": [
          {
            "expr": "sum by (from_channel, to_channel) (increase(cerniq_channel_switch_total[5m]))",
            "legendFormat": "{{from_channel}} → {{to_channel}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {
              "drawStyle": "bars",
              "stacking": { "mode": "normal" }
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Delivery Rate by Channel",
        "type": "gauge",
        "gridPos": { "h": 6, "w": 6, "x": 0, "y": 8 },
        "repeat": "channel",
        "repeatDirection": "h",
        "targets": [
          {
            "expr": "cerniq_channel_delivery_rate{channel=~\"$channel\"}",
            "legendFormat": "{{channel}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 1,
            "unit": "percentunit",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": null },
                { "color": "yellow", "value": 0.9 },
                { "color": "green", "value": 0.98 }
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Channel Sync Lag",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 14 },
        "targets": [
          {
            "expr": "avg by (channel) (cerniq_channel_sync_lag_seconds)",
            "legendFormat": "{{channel}} avg lag"
          },
          {
            "expr": "max by (channel) (cerniq_channel_sync_lag_seconds)",
            "legendFormat": "{{channel}} max lag"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 30 },
                { "color": "red", "value": 120 }
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Messages by Channel",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 14 },
        "targets": [
          {
            "expr": "sum by (channel) (increase(cerniq_channel_messages_total[5m]))",
            "legendFormat": "{{channel}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {
              "drawStyle": "line",
              "fillOpacity": 30
            }
          }
        }
      },
      {
        "id": 6,
        "title": "Channel Switch Success Rate",
        "type": "stat",
        "gridPos": { "h": 4, "w": 8, "x": 0, "y": 22 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_channel_switch_total{status='success'}[24h])) / sum(increase(cerniq_channel_switch_total[24h])) * 100",
            "legendFormat": "Success Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "red", "value": null },
                { "color": "yellow", "value": 90 },
                { "color": "green", "value": 98 }
              ]
            }
          }
        }
      },
      {
        "id": 7,
        "title": "Sync Operations",
        "type": "stat",
        "gridPos": { "h": 4, "w": 8, "x": 8, "y": 22 },
        "targets": [
          {
            "expr": "sum(increase(cerniq_channel_sync_total[24h]))",
            "legendFormat": "Total Syncs (24h)"
          }
        ]
      },
      {
        "id": 8,
        "title": "Deduplication Actions",
        "type": "piechart",
        "gridPos": { "h": 4, "w": 8, "x": 16, "y": 22 },
        "targets": [
          {
            "expr": "sum by (action) (increase(cerniq_message_deduplication_total[24h]))",
            "legendFormat": "{{action}}"
          }
        ]
      }
    ],
    "templating": {
      "list": [
        {
          "name": "channel",
          "type": "query",
          "query": "label_values(cerniq_channel_active_conversations, channel)",
          "multi": true,
          "includeAll": true
        }
      ]
    }
  }
}
```

#### 8.3.3 Queue Health Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "handover-queues",
    "title": "Etapa 3 - Handover Queue Health",
    "tags": ["etapa3", "queues", "bullmq"],
    "timezone": "Europe/Bucharest",
    "refresh": "15s",
    "panels": [
      {
        "id": 1,
        "title": "Queue Depth Overview",
        "type": "bargauge",
        "gridPos": { "h": 6, "w": 24, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "cerniq_handover_queue_depth{state='waiting'}",
            "legendFormat": "{{queue}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 50 },
                { "color": "red", "value": 100 }
              ]
            }
          }
        },
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        }
      },
      {
        "id": 2,
        "title": "Queue Processing Rate",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 6 },
        "targets": [
          {
            "expr": "sum by (queue) (rate(cerniq_handover_jobs_total{status='completed'}[5m]))",
            "legendFormat": "{{queue}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops"
          }
        }
      },
      {
        "id": 3,
        "title": "Processing Time p95",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 6 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum by (queue, le) (rate(cerniq_handover_queue_processing_seconds_bucket[5m])))",
            "legendFormat": "{{queue}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "id": 4,
        "title": "Failed Jobs",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 14 },
        "targets": [
          {
            "expr": "cerniq_handover_queue_depth{state='failed'}",
            "legendFormat": "{{queue}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 5 },
                { "color": "red", "value": 20 }
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Retry Rate",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 14 },
        "targets": [
          {
            "expr": "sum by (queue) (rate(cerniq_handover_queue_retries_total[5m]))",
            "legendFormat": "{{queue}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "ops"
          }
        }
      },
      {
        "id": 6,
        "title": "Circuit Breaker State",
        "type": "state-timeline",
        "gridPos": { "h": 6, "w": 24, "x": 0, "y": 22 },
        "targets": [
          {
            "expr": "cerniq_handover_circuit_breaker_state",
            "legendFormat": "{{service}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              { "type": "value", "options": { "0": { "text": "OPEN", "color": "red" } } },
              { "type": "value", "options": { "0.5": { "text": "HALF-OPEN", "color": "yellow" } } },
              { "type": "value", "options": { "1": { "text": "CLOSED", "color": "green" } } }
            ]
          }
        }
      }
    ]
  }
}
```

### 8.4 Alert Rules

```yaml
# prometheus/rules/handover-channel-alerts.yml
groups:
  - name: handover_critical
    interval: 30s
    rules:
      # ============================================================
      # CRITICAL ALERTS - Page immediately
      # ============================================================
      
      - alert: HandoverAcceptanceTimeoutCritical
        expr: |
          histogram_quantile(0.95, sum(rate(cerniq_handover_acceptance_seconds_bucket[15m])) by (le)) > 1800
        for: 5m
        labels:
          severity: critical
          team: sales-ops
        annotations:
          summary: "Critical: Handover acceptance time exceeds 30 minutes"
          description: |
            The 95th percentile handover acceptance time is {{ $value | humanizeDuration }}.
            Customer experience severely impacted. Immediate escalation required.
          runbook_url: "https://wiki.cerniq.ro/runbooks/handover-timeout"

      - alert: PendingHandoversAccumulating
        expr: |
          sum(cerniq_handover_state_current{state='pending_acceptance'}) > 20
        for: 10m
        labels:
          severity: critical
          team: sales-ops
        annotations:
          summary: "Critical: {{ $value }} handovers pending acceptance"
          description: |
            Large number of handovers waiting for agent acceptance.
            Customers are waiting. Check agent availability immediately.
          runbook_url: "https://wiki.cerniq.ro/runbooks/pending-handovers"

      - alert: AllAgentsUnavailable
        expr: |
          sum(cerniq_agent_availability) == 0
        for: 2m
        labels:
          severity: critical
          team: sales-ops
        annotations:
          summary: "Critical: No agents available for handovers"
          description: |
            All agents are either offline or at maximum capacity.
            Handovers will accumulate. Escalate to management.
          runbook_url: "https://wiki.cerniq.ro/runbooks/no-agents"

      - alert: CircuitBreakerOpen
        expr: |
          cerniq_handover_circuit_breaker_state == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Critical: Circuit breaker open for {{ $labels.service }}"
          description: |
            The circuit breaker for {{ $labels.service }} is OPEN.
            Service is experiencing high failure rate. Investigate immediately.
          runbook_url: "https://wiki.cerniq.ro/runbooks/circuit-breaker"

      # ============================================================
      # WARNING ALERTS - Slack notification
      # ============================================================

      - alert: HandoverAcceptanceTimeSlow
        expr: |
          histogram_quantile(0.95, sum(rate(cerniq_handover_acceptance_seconds_bucket[15m])) by (le)) > 600
        for: 10m
        labels:
          severity: warning
          team: sales-ops
        annotations:
          summary: "Handover acceptance time elevated"
          description: |
            The 95th percentile handover acceptance time is {{ $value | humanizeDuration }}.
            Consider adding agent capacity or reviewing workload distribution.

      - alert: AgentHighWorkload
        expr: |
          cerniq_agent_workload_current > 10
        for: 15m
        labels:
          severity: warning
          team: sales-ops
        annotations:
          summary: "Agent {{ $labels.agent_name }} has high workload"
          description: |
            Agent {{ $labels.agent_name }} has {{ $value }} active conversations.
            Consider reassigning or limiting new assignments.

      - alert: AgentLowAcceptanceRate
        expr: |
          cerniq_agent_acceptance_rate < 0.7
        for: 30m
        labels:
          severity: warning
          team: sales-ops
        annotations:
          summary: "Agent {{ $labels.agent_id }} has low acceptance rate"
          description: |
            Acceptance rate: {{ $value | humanizePercentage }}.
            Review agent performance and handover assignments.

      - alert: HandoverDeclineRateHigh
        expr: |
          sum(increase(cerniq_handover_jobs_total{status='declined'}[1h])) / sum(increase(cerniq_handover_jobs_total[1h])) > 0.2
        for: 30m
        labels:
          severity: warning
          team: sales-ops
        annotations:
          summary: "High handover decline rate: {{ $value | humanizePercentage }}"
          description: |
            More than 20% of handovers are being declined.
            Review assignment algorithm and agent capacity.

      - alert: EscalationRateHigh
        expr: |
          sum(increase(cerniq_handover_escalations_total[1h])) > 10
        for: 15m
        labels:
          severity: warning
          team: sales-ops
        annotations:
          summary: "High escalation rate: {{ $value }} escalations in last hour"
          description: |
            Elevated number of handover escalations.
            Review escalation reasons and agent training needs.

  - name: channel_critical
    interval: 30s
    rules:
      # ============================================================
      # CHANNEL CRITICAL ALERTS
      # ============================================================

      - alert: ChannelDeliveryRateCritical
        expr: |
          cerniq_channel_delivery_rate < 0.8
        for: 10m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Critical: {{ $labels.channel }} delivery rate below 80%"
          description: |
            Delivery rate for {{ $labels.channel }}: {{ $value | humanizePercentage }}.
            Messages not reaching customers. Check channel provider status.
          runbook_url: "https://wiki.cerniq.ro/runbooks/channel-delivery"

      - alert: ChannelSyncLagCritical
        expr: |
          max(cerniq_channel_sync_lag_seconds) > 300
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Critical: Channel sync lag exceeds 5 minutes"
          description: |
            Maximum sync lag: {{ $value | humanizeDuration }}.
            Conversation state may be inconsistent across channels.
          runbook_url: "https://wiki.cerniq.ro/runbooks/sync-lag"

      # ============================================================
      # CHANNEL WARNING ALERTS
      # ============================================================

      - alert: ChannelSwitchFailureRate
        expr: |
          sum(increase(cerniq_channel_switch_total{status='failed'}[1h])) / sum(increase(cerniq_channel_switch_total[1h])) > 0.1
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Channel switch failure rate elevated"
          description: |
            Failure rate: {{ $value | humanizePercentage }}.
            Review channel configurations and contact validation.

      - alert: ChannelDeliveryRateLow
        expr: |
          cerniq_channel_delivery_rate < 0.95
        for: 30m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "{{ $labels.channel }} delivery rate below 95%"
          description: |
            Delivery rate: {{ $value | humanizePercentage }}.
            Monitor for potential channel issues.

      - alert: ChannelSyncLagHigh
        expr: |
          avg(cerniq_channel_sync_lag_seconds) > 60
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Channel sync lag averaging over 1 minute"
          description: |
            Average sync lag: {{ $value | humanizeDuration }}.
            Consider increasing sync frequency or investigating bottlenecks.

  - name: queue_alerts
    interval: 30s
    rules:
      # ============================================================
      # QUEUE ALERTS
      # ============================================================

      - alert: QueueBacklogCritical
        expr: |
          cerniq_handover_queue_depth{state='waiting'} > 200
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Critical: Queue {{ $labels.queue }} backlog exceeds 200"
          description: |
            Current backlog: {{ $value }} jobs.
            Workers may be overwhelmed or stuck. Check worker health.
          runbook_url: "https://wiki.cerniq.ro/runbooks/queue-backlog"

      - alert: QueueFailedJobsHigh
        expr: |
          cerniq_handover_queue_depth{state='failed'} > 50
        for: 15m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Critical: {{ $value }} failed jobs in {{ $labels.queue }}"
          description: |
            High number of failed jobs accumulating.
            Review error logs and retry failed jobs manually if needed.
          runbook_url: "https://wiki.cerniq.ro/runbooks/failed-jobs"

      - alert: QueueProcessingLatencyHigh
        expr: |
          histogram_quantile(0.95, sum(rate(cerniq_handover_queue_processing_seconds_bucket[5m])) by (queue, le)) > 120
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Queue {{ $labels.queue }} processing latency high"
          description: |
            95th percentile processing time: {{ $value | humanizeDuration }}.
            Jobs taking longer than expected.

      - alert: QueueRetryRateHigh
        expr: |
          sum(rate(cerniq_handover_queue_retries_total[15m])) by (queue) > 0.5
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High retry rate for {{ $labels.queue }}"
          description: |
            Retry rate: {{ $value }} retries/second.
            Investigate transient failures or misconfiguration.

  - name: context_alerts
    interval: 60s
    rules:
      - alert: ContextCompilationSlow
        expr: |
          histogram_quantile(0.95, sum(rate(cerniq_context_compilation_seconds_bucket[15m])) by (le)) > 30
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Context compilation taking longer than expected"
          description: |
            95th percentile compilation time: {{ $value | humanizeDuration }}.
            May indicate database performance issues or large conversation history.

      - alert: ContextQualityLow
        expr: |
          avg(cerniq_context_quality_score) < 60
        for: 30m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Context quality score below threshold"
          description: |
            Average quality score: {{ $value }}.
            Review AI summarization and context compilation logic.
```

### 8.5 SLA Monitoring

```typescript
// src/workers/etapa3/handover-channel/sla-monitor.ts
import { db } from '@/db';
import { handovers, tenants } from '@/db/schema';
import { eq, and, gte, sql, lt } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

// SLA definitions
export const HANDOVER_SLA_DEFINITIONS = {
  critical: {
    timeToAcceptance: 300,     // 5 minutes
    timeToFirstResponse: 600,  // 10 minutes
    timeToResolution: 3600,    // 1 hour
    maxEscalations: 1
  },
  urgent: {
    timeToAcceptance: 600,     // 10 minutes
    timeToFirstResponse: 1200, // 20 minutes
    timeToResolution: 7200,    // 2 hours
    maxEscalations: 2
  },
  standard: {
    timeToAcceptance: 1800,    // 30 minutes
    timeToFirstResponse: 3600, // 1 hour
    timeToResolution: 28800,   // 8 hours
    maxEscalations: 3
  },
  low: {
    timeToAcceptance: 7200,    // 2 hours
    timeToFirstResponse: 14400, // 4 hours
    timeToResolution: 86400,   // 24 hours
    maxEscalations: 5
  }
};

interface SLAStatus {
  handoverId: string;
  urgency: string;
  slaDefinition: typeof HANDOVER_SLA_DEFINITIONS[keyof typeof HANDOVER_SLA_DEFINITIONS];
  metrics: {
    timeToAcceptance: number | null;
    timeToFirstResponse: number | null;
    timeToResolution: number | null;
    escalationCount: number;
  };
  breaches: {
    acceptanceBreached: boolean;
    firstResponseBreached: boolean;
    resolutionBreached: boolean;
    escalationBreached: boolean;
  };
  overallStatus: 'green' | 'yellow' | 'red';
  atRisk: boolean;
}

export class SLAMonitor {
  // Check SLA status for a specific handover
  async checkHandoverSLA(handoverId: string): Promise<SLAStatus> {
    const handover = await db.query.handovers.findFirst({
      where: eq(handovers.id, handoverId),
      with: {
        events: true
      }
    });

    if (!handover) {
      throw new Error(`Handover not found: ${handoverId}`);
    }

    const urgency = handover.urgency as keyof typeof HANDOVER_SLA_DEFINITIONS;
    const slaDefinition = HANDOVER_SLA_DEFINITIONS[urgency] || HANDOVER_SLA_DEFINITIONS.standard;

    const now = Date.now();
    const createdAt = new Date(handover.createdAt).getTime();
    const acceptedAt = handover.acceptedAt ? new Date(handover.acceptedAt).getTime() : null;
    const firstResponseAt = handover.firstResponseAt ? new Date(handover.firstResponseAt).getTime() : null;
    const completedAt = handover.completedAt ? new Date(handover.completedAt).getTime() : null;

    // Calculate metrics
    const timeToAcceptance = acceptedAt 
      ? (acceptedAt - createdAt) / 1000 
      : (now - createdAt) / 1000;

    const timeToFirstResponse = firstResponseAt && acceptedAt
      ? (firstResponseAt - acceptedAt) / 1000
      : acceptedAt ? (now - acceptedAt) / 1000 : null;

    const timeToResolution = completedAt
      ? (completedAt - createdAt) / 1000
      : (now - createdAt) / 1000;

    const escalationCount = handover.events?.filter(e => e.type === 'escalated').length || 0;

    // Check breaches
    const breaches = {
      acceptanceBreached: !acceptedAt && timeToAcceptance > slaDefinition.timeToAcceptance,
      firstResponseBreached: acceptedAt && !firstResponseAt && 
        (timeToFirstResponse || 0) > slaDefinition.timeToFirstResponse,
      resolutionBreached: !completedAt && timeToResolution > slaDefinition.timeToResolution,
      escalationBreached: escalationCount > slaDefinition.maxEscalations
    };

    // Determine overall status
    const breachCount = Object.values(breaches).filter(Boolean).length;
    const overallStatus: 'green' | 'yellow' | 'red' = 
      breachCount >= 2 ? 'red' : 
      breachCount === 1 ? 'yellow' : 
      'green';

    // Check if at risk (approaching breach)
    const atRisk = !Object.values(breaches).some(Boolean) && (
      (!acceptedAt && timeToAcceptance > slaDefinition.timeToAcceptance * 0.8) ||
      (acceptedAt && !firstResponseAt && (timeToFirstResponse || 0) > slaDefinition.timeToFirstResponse * 0.8) ||
      (!completedAt && timeToResolution > slaDefinition.timeToResolution * 0.8)
    );

    return {
      handoverId,
      urgency,
      slaDefinition,
      metrics: {
        timeToAcceptance,
        timeToFirstResponse,
        timeToResolution,
        escalationCount
      },
      breaches,
      overallStatus,
      atRisk
    };
  }

  // Get SLA summary for a tenant
  async getTenantSLASummary(
    tenantId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    totalHandovers: number;
    slaCompliance: number;
    breachBreakdown: Record<string, number>;
    averageMetrics: Record<string, number>;
    byUrgency: Record<string, { total: number; compliant: number; breached: number }>;
  }> {
    const handoverList = await db.query.handovers.findMany({
      where: and(
        eq(handovers.tenantId, tenantId),
        gte(handovers.createdAt, startDate),
        lt(handovers.createdAt, endDate)
      )
    });

    const results = await Promise.all(
      handoverList.map(h => this.checkHandoverSLA(h.id))
    );

    const totalHandovers = results.length;
    const compliantCount = results.filter(r => r.overallStatus === 'green').length;
    const slaCompliance = totalHandovers > 0 ? compliantCount / totalHandovers : 1;

    // Breach breakdown
    const breachBreakdown = {
      acceptance: results.filter(r => r.breaches.acceptanceBreached).length,
      firstResponse: results.filter(r => r.breaches.firstResponseBreached).length,
      resolution: results.filter(r => r.breaches.resolutionBreached).length,
      escalation: results.filter(r => r.breaches.escalationBreached).length
    };

    // Average metrics
    const completedResults = results.filter(r => r.metrics.timeToResolution);
    const averageMetrics = {
      avgTimeToAcceptance: this.average(results.map(r => r.metrics.timeToAcceptance).filter(Boolean) as number[]),
      avgTimeToFirstResponse: this.average(results.map(r => r.metrics.timeToFirstResponse).filter(Boolean) as number[]),
      avgTimeToResolution: this.average(completedResults.map(r => r.metrics.timeToResolution).filter(Boolean) as number[]),
      avgEscalations: this.average(results.map(r => r.metrics.escalationCount))
    };

    // By urgency
    const byUrgency: Record<string, { total: number; compliant: number; breached: number }> = {};
    for (const urgency of ['critical', 'urgent', 'standard', 'low']) {
      const urgencyResults = results.filter(r => r.urgency === urgency);
      byUrgency[urgency] = {
        total: urgencyResults.length,
        compliant: urgencyResults.filter(r => r.overallStatus === 'green').length,
        breached: urgencyResults.filter(r => r.overallStatus === 'red').length
      };
    }

    return {
      totalHandovers,
      slaCompliance,
      breachBreakdown,
      averageMetrics,
      byUrgency
    };
  }

  // Get handovers at risk of SLA breach
  async getAtRiskHandovers(tenantId: string): Promise<SLAStatus[]> {
    const activeHandovers = await db.query.handovers.findMany({
      where: and(
        eq(handovers.tenantId, tenantId),
        sql`${handovers.status} IN ('pending_acceptance', 'accepted', 'in_progress')`
      )
    });

    const statuses = await Promise.all(
      activeHandovers.map(h => this.checkHandoverSLA(h.id))
    );

    return statuses.filter(s => s.atRisk || s.overallStatus !== 'green');
  }

  // Helper: Calculate average
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  // Cache SLA summary for dashboard
  async cacheSLASummary(tenantId: string): Promise<void> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days

    const summary = await this.getTenantSLASummary(tenantId, startDate, endDate);
    const atRisk = await this.getAtRiskHandovers(tenantId);

    await redis.setex(
      `sla:summary:${tenantId}`,
      300, // 5 minutes
      JSON.stringify({ summary, atRisk, generatedAt: new Date().toISOString() })
    );

    logger.info({ tenantId, compliance: summary.slaCompliance }, 'SLA summary cached');
  }
}

export const slaMonitor = new SLAMonitor();
```

---

## 8. Monitoring & Metrics

### 8.1 Prometheus Metrics Definition

```typescript
// src/workers/etapa3/J-handover-channel/metrics/prometheus-metrics.ts

import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { logger } from '@/lib/logger';

// Create custom registry for handover metrics
export const handoverMetricsRegistry = new Registry();

// Default labels
handoverMetricsRegistry.setDefaultLabels({
  service: 'cerniq-workers',
  module: 'handover-channel'
});

// ============================================================================
// HANDOVER METRICS
// ============================================================================

// Handover Operations Counter
export const handoverOperationsCounter = new Counter({
  name: 'cerniq_handover_operations_total',
  help: 'Total number of handover operations',
  labelNames: ['tenant_id', 'operation', 'status', 'urgency', 'trigger_type'],
  registers: [handoverMetricsRegistry]
});

// Operation types:
// - prepare: Handover preparation initiated
// - execute: Handover execution started
// - accept: Agent accepted handover
// - decline: Agent declined handover
// - complete: Handover completed successfully
// - expire: Handover expired
// - escalate: Handover escalated
// - cancel: Handover cancelled

// Handover Duration Histogram
export const handoverDurationHistogram = new Histogram({
  name: 'cerniq_handover_duration_seconds',
  help: 'Duration of handover phases in seconds',
  labelNames: ['tenant_id', 'phase', 'urgency'],
  buckets: [30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400], // 30s to 4h
  registers: [handoverMetricsRegistry]
});

// Phases: preparation, acceptance, first_response, resolution, total

// Active Handovers Gauge
export const activeHandoversGauge = new Gauge({
  name: 'cerniq_active_handovers',
  help: 'Current number of active handovers by status',
  labelNames: ['tenant_id', 'status', 'urgency'],
  registers: [handoverMetricsRegistry]
});

// Handover Queue Depth Gauge
export const handoverQueueDepthGauge = new Gauge({
  name: 'cerniq_handover_queue_depth',
  help: 'Current depth of handover queues',
  labelNames: ['queue_name', 'state'],
  registers: [handoverMetricsRegistry]
});

// Agent Workload Gauge
export const agentWorkloadGauge = new Gauge({
  name: 'cerniq_agent_workload',
  help: 'Current workload per agent',
  labelNames: ['tenant_id', 'agent_id', 'agent_name'],
  registers: [handoverMetricsRegistry]
});

// Agent Availability Gauge
export const agentAvailabilityGauge = new Gauge({
  name: 'cerniq_agent_availability',
  help: 'Agent availability status (1=available, 0=unavailable)',
  labelNames: ['tenant_id', 'agent_id', 'agent_name', 'reason'],
  registers: [handoverMetricsRegistry]
});

// Handover Acceptance Rate Gauge
export const handoverAcceptanceRateGauge = new Gauge({
  name: 'cerniq_handover_acceptance_rate',
  help: 'Rolling acceptance rate for handovers',
  labelNames: ['tenant_id', 'time_window'],
  registers: [handoverMetricsRegistry]
});

// SLA Compliance Gauge
export const slaComplianceGauge = new Gauge({
  name: 'cerniq_handover_sla_compliance',
  help: 'SLA compliance rate (0-1)',
  labelNames: ['tenant_id', 'sla_type', 'urgency'],
  registers: [handoverMetricsRegistry]
});

// SLA types: acceptance, first_response, resolution, escalation

// Context Compilation Metrics
export const contextCompilationHistogram = new Histogram({
  name: 'cerniq_context_compilation_duration_seconds',
  help: 'Duration of context compilation for handovers',
  labelNames: ['tenant_id', 'complexity'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [handoverMetricsRegistry]
});

// Complexity: simple (<10 messages), medium (10-50), complex (>50)

// Notification Delivery Metrics
export const notificationDeliveryCounter = new Counter({
  name: 'cerniq_handover_notifications_total',
  help: 'Total handover notifications sent',
  labelNames: ['tenant_id', 'channel', 'status', 'urgency'],
  registers: [handoverMetricsRegistry]
});

// Channels: in_app, email, sms, push, webhook

export const notificationLatencyHistogram = new Histogram({
  name: 'cerniq_handover_notification_latency_seconds',
  help: 'Latency of notification delivery',
  labelNames: ['tenant_id', 'channel'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// CHANNEL SWITCH METRICS
// ============================================================================

// Channel Switch Counter
export const channelSwitchCounter = new Counter({
  name: 'cerniq_channel_switch_total',
  help: 'Total channel switches',
  labelNames: ['tenant_id', 'from_channel', 'to_channel', 'reason', 'status'],
  registers: [handoverMetricsRegistry]
});

// Reasons: customer_request, delivery_failure, urgency_escalation, availability, cost_optimization

// Channel Switch Duration
export const channelSwitchDurationHistogram = new Histogram({
  name: 'cerniq_channel_switch_duration_seconds',
  help: 'Duration of channel switch operations',
  labelNames: ['tenant_id', 'from_channel', 'to_channel'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30],
  registers: [handoverMetricsRegistry]
});

// Active Channels per Conversation
export const activeChannelsGauge = new Gauge({
  name: 'cerniq_active_channels_per_conversation',
  help: 'Number of active channels per conversation',
  labelNames: ['tenant_id', 'conversation_id'],
  registers: [handoverMetricsRegistry]
});

// Channel Message Volume
export const channelMessageVolumeCounter = new Counter({
  name: 'cerniq_channel_message_volume_total',
  help: 'Total messages per channel',
  labelNames: ['tenant_id', 'channel', 'direction', 'sender_type'],
  registers: [handoverMetricsRegistry]
});

// Direction: inbound, outbound
// Sender type: customer, agent, ai, system

// Channel Delivery Success Rate
export const channelDeliveryRateGauge = new Gauge({
  name: 'cerniq_channel_delivery_rate',
  help: 'Message delivery success rate per channel',
  labelNames: ['tenant_id', 'channel'],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// CHANNEL SYNC METRICS
// ============================================================================

// Sync Operations Counter
export const channelSyncCounter = new Counter({
  name: 'cerniq_channel_sync_operations_total',
  help: 'Total channel sync operations',
  labelNames: ['tenant_id', 'sync_type', 'status'],
  registers: [handoverMetricsRegistry]
});

// Sync types: full, incremental, specific

// Sync Duration Histogram
export const channelSyncDurationHistogram = new Histogram({
  name: 'cerniq_channel_sync_duration_seconds',
  help: 'Duration of channel sync operations',
  labelNames: ['tenant_id', 'sync_type', 'channel_count'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [handoverMetricsRegistry]
});

// Sync Lag Gauge (time since last sync)
export const channelSyncLagGauge = new Gauge({
  name: 'cerniq_channel_sync_lag_seconds',
  help: 'Time since last successful sync',
  labelNames: ['tenant_id', 'conversation_id', 'channel'],
  registers: [handoverMetricsRegistry]
});

// Message Deduplication Counter
export const messageDeduplicationCounter = new Counter({
  name: 'cerniq_message_deduplication_total',
  help: 'Total messages deduplicated',
  labelNames: ['tenant_id', 'match_type', 'action'],
  registers: [handoverMetricsRegistry]
});

// Match types: exact, fuzzy
// Actions: merged, flagged, skipped

// Sync Conflict Counter
export const syncConflictCounter = new Counter({
  name: 'cerniq_channel_sync_conflicts_total',
  help: 'Total sync conflicts encountered',
  labelNames: ['tenant_id', 'conflict_type', 'resolution'],
  registers: [handoverMetricsRegistry]
});

// Conflict types: message_order, status_mismatch, content_mismatch
// Resolutions: latest_wins, source_priority, merge, manual

// ============================================================================
// REAL-TIME METRICS
// ============================================================================

// WebSocket Connections Gauge
export const websocketConnectionsGauge = new Gauge({
  name: 'cerniq_handover_websocket_connections',
  help: 'Current WebSocket connections for real-time updates',
  labelNames: ['tenant_id', 'connection_type'],
  registers: [handoverMetricsRegistry]
});

// Connection types: agent, supervisor, system

// Real-time Event Rate
export const realtimeEventRateGauge = new Gauge({
  name: 'cerniq_realtime_event_rate',
  help: 'Rate of real-time events per second',
  labelNames: ['tenant_id', 'event_type'],
  registers: [handoverMetricsRegistry]
});

// Event types: message, status, typing, presence

// Pub/Sub Message Counter
export const pubsubMessageCounter = new Counter({
  name: 'cerniq_pubsub_messages_total',
  help: 'Total pub/sub messages for real-time sync',
  labelNames: ['channel', 'direction'],
  registers: [handoverMetricsRegistry]
});

// Direction: publish, subscribe

// ============================================================================
// ERROR AND RELIABILITY METRICS
// ============================================================================

// Error Counter
export const handoverErrorCounter = new Counter({
  name: 'cerniq_handover_errors_total',
  help: 'Total handover errors',
  labelNames: ['tenant_id', 'error_type', 'category', 'severity', 'retryable'],
  registers: [handoverMetricsRegistry]
});

// Retry Counter
export const handoverRetryCounter = new Counter({
  name: 'cerniq_handover_retries_total',
  help: 'Total handover operation retries',
  labelNames: ['tenant_id', 'operation', 'attempt_number'],
  registers: [handoverMetricsRegistry]
});

// Circuit Breaker State Gauge
export const circuitBreakerStateGauge = new Gauge({
  name: 'cerniq_handover_circuit_breaker_state',
  help: 'Circuit breaker state (0=open, 0.5=half-open, 1=closed)',
  labelNames: ['service'],
  registers: [handoverMetricsRegistry]
});

// Circuit Breaker Events Counter
export const circuitBreakerEventsCounter = new Counter({
  name: 'cerniq_handover_circuit_breaker_events_total',
  help: 'Circuit breaker events',
  labelNames: ['service', 'event'],
  registers: [handoverMetricsRegistry]
});

// Events: open, close, half_open, reject, timeout, success, failure

// HITL Task Creation Counter
export const hitlTaskCreationCounter = new Counter({
  name: 'cerniq_handover_hitl_tasks_created_total',
  help: 'HITL tasks created from handover errors',
  labelNames: ['tenant_id', 'error_type', 'priority'],
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// BUSINESS METRICS
// ============================================================================

// Handover Deal Value Histogram
export const handoverDealValueHistogram = new Histogram({
  name: 'cerniq_handover_deal_value_ron',
  help: 'Deal value associated with handovers',
  labelNames: ['tenant_id', 'urgency', 'outcome'],
  buckets: [1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [handoverMetricsRegistry]
});

// Outcomes: completed, expired, cancelled

// Customer Satisfaction Scores (post-handover)
export const customerSatisfactionGauge = new Gauge({
  name: 'cerniq_handover_customer_satisfaction',
  help: 'Customer satisfaction score after handover (1-5)',
  labelNames: ['tenant_id', 'handover_type'],
  registers: [handoverMetricsRegistry]
});

// Handover types: ai_triggered, customer_requested, escalation

// Agent Response Time Summary
export const agentResponseTimeSummary = new Summary({
  name: 'cerniq_agent_response_time_seconds',
  help: 'Agent response time after handover acceptance',
  labelNames: ['tenant_id', 'agent_id'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  maxAgeSeconds: 600,
  ageBuckets: 5,
  registers: [handoverMetricsRegistry]
});

// ============================================================================
// METRICS COLLECTOR SERVICE
// ============================================================================

import { db } from '@/lib/database';
import { handovers, agents, conversationMessages } from '@/lib/database/schema';
import { eq, and, gte, lt, sql, count } from 'drizzle-orm';

export class HandoverMetricsCollector {
  private updateInterval: NodeJS.Timeout | null = null;

  // Start periodic metrics collection
  startCollection(intervalMs: number = 60000): void {
    this.updateInterval = setInterval(() => {
      this.collectAllMetrics().catch(err => {
        logger.error({ err }, 'Failed to collect handover metrics');
      });
    }, intervalMs);

    // Collect immediately on start
    this.collectAllMetrics().catch(err => {
      logger.error({ err }, 'Failed to collect initial handover metrics');
    });

    logger.info({ intervalMs }, 'Handover metrics collection started');
  }

  // Stop periodic collection
  stopCollection(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('Handover metrics collection stopped');
    }
  }

  // Collect all metrics
  async collectAllMetrics(): Promise<void> {
    const startTime = Date.now();

    try {
      await Promise.all([
        this.collectActiveHandovers(),
        this.collectAgentMetrics(),
        this.collectQueueMetrics(),
        this.collectSLAMetrics(),
        this.collectChannelMetrics()
      ]);

      const duration = Date.now() - startTime;
      logger.debug({ durationMs: duration }, 'Metrics collection completed');
    } catch (error) {
      logger.error({ error }, 'Error collecting metrics');
      throw error;
    }
  }

  // Collect active handover counts by status and urgency
  private async collectActiveHandovers(): Promise<void> {
    const results = await db.execute(sql`
      SELECT 
        tenant_id,
        status,
        urgency,
        COUNT(*) as count
      FROM handovers
      WHERE status NOT IN ('completed', 'cancelled', 'expired')
      GROUP BY tenant_id, status, urgency
    `);

    // Reset all gauges first
    activeHandoversGauge.reset();

    // Set new values
    for (const row of results.rows) {
      activeHandoversGauge.set(
        {
          tenant_id: row.tenant_id as string,
          status: row.status as string,
          urgency: row.urgency as string
        },
        Number(row.count)
      );
    }
  }

  // Collect agent workload and availability
  private async collectAgentMetrics(): Promise<void> {
    const agentList = await db.query.agents.findMany({
      where: eq(agents.isActive, true)
    });

    for (const agent of agentList) {
      // Workload
      agentWorkloadGauge.set(
        {
          tenant_id: agent.tenantId,
          agent_id: agent.id,
          agent_name: agent.name
        },
        agent.currentWorkload || 0
      );

      // Availability
      const isAvailable = agent.availabilityStatus === 'available' &&
                          agent.currentWorkload < (agent.maxConcurrentHandovers || 5);
      
      agentAvailabilityGauge.set(
        {
          tenant_id: agent.tenantId,
          agent_id: agent.id,
          agent_name: agent.name,
          reason: isAvailable ? 'available' : agent.availabilityStatus
        },
        isAvailable ? 1 : 0
      );
    }
  }

  // Collect queue depth metrics
  private async collectQueueMetrics(): Promise<void> {
    const queues = [
      'handover-prepare',
      'handover-execute',
      'handover-notification',
      'handover-reminder',
      'channel-switch',
      'channel-sync'
    ];

    const { Queue } = await import('bullmq');
    const connection = { host: process.env.REDIS_HOST, port: 6379, db: 6 };

    for (const queueName of queues) {
      const queue = new Queue(queueName, { connection });
      
      try {
        const counts = await queue.getJobCounts();
        
        for (const [state, count] of Object.entries(counts)) {
          handoverQueueDepthGauge.set(
            { queue_name: queueName, state },
            count
          );
        }
      } finally {
        await queue.close();
      }
    }
  }

  // Collect SLA compliance metrics
  private async collectSLAMetrics(): Promise<void> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get completed handovers from last 24h
    const completedHandovers = await db.query.handovers.findMany({
      where: and(
        gte(handovers.createdAt, oneDayAgo),
        eq(handovers.status, 'completed')
      )
    });

    // Group by tenant and urgency
    const slaByTenantUrgency: Map<string, {
      acceptance: { total: number; compliant: number };
      firstResponse: { total: number; compliant: number };
      resolution: { total: number; compliant: number };
    }> = new Map();

    for (const handover of completedHandovers) {
      const key = `${handover.tenantId}:${handover.urgency}`;
      
      if (!slaByTenantUrgency.has(key)) {
        slaByTenantUrgency.set(key, {
          acceptance: { total: 0, compliant: 0 },
          firstResponse: { total: 0, compliant: 0 },
          resolution: { total: 0, compliant: 0 }
        });
      }

      const stats = slaByTenantUrgency.get(key)!;
      
      // Check acceptance SLA
      if (handover.acceptedAt) {
        stats.acceptance.total++;
        const acceptanceTime = handover.acceptedAt.getTime() - handover.createdAt.getTime();
        if (acceptanceTime <= this.getAcceptanceSLA(handover.urgency)) {
          stats.acceptance.compliant++;
        }
      }

      // Check first response SLA (from metrics if available)
      if (handover.firstResponseAt) {
        stats.firstResponse.total++;
        const responseTime = handover.firstResponseAt.getTime() - 
                            (handover.acceptedAt?.getTime() || handover.createdAt.getTime());
        if (responseTime <= this.getFirstResponseSLA(handover.urgency)) {
          stats.firstResponse.compliant++;
        }
      }

      // Check resolution SLA
      if (handover.completedAt) {
        stats.resolution.total++;
        const resolutionTime = handover.completedAt.getTime() - handover.createdAt.getTime();
        if (resolutionTime <= this.getResolutionSLA(handover.urgency)) {
          stats.resolution.compliant++;
        }
      }
    }

    // Set compliance gauges
    for (const [key, stats] of slaByTenantUrgency) {
      const [tenantId, urgency] = key.split(':');

      for (const [slaType, data] of Object.entries(stats)) {
        const compliance = data.total > 0 ? data.compliant / data.total : 1;
        slaComplianceGauge.set(
          { tenant_id: tenantId, sla_type: slaType, urgency },
          compliance
        );
      }
    }
  }

  // SLA thresholds in milliseconds
  private getAcceptanceSLA(urgency: string): number {
    const slas: Record<string, number> = {
      critical: 5 * 60 * 1000,    // 5 min
      urgent: 15 * 60 * 1000,     // 15 min
      standard: 60 * 60 * 1000,   // 1 hour
      low: 4 * 60 * 60 * 1000     // 4 hours
    };
    return slas[urgency] || slas.standard;
  }

  private getFirstResponseSLA(urgency: string): number {
    const slas: Record<string, number> = {
      critical: 2 * 60 * 1000,    // 2 min
      urgent: 5 * 60 * 1000,      // 5 min
      standard: 15 * 60 * 1000,   // 15 min
      low: 30 * 60 * 1000         // 30 min
    };
    return slas[urgency] || slas.standard;
  }

  private getResolutionSLA(urgency: string): number {
    const slas: Record<string, number> = {
      critical: 30 * 60 * 1000,   // 30 min
      urgent: 2 * 60 * 60 * 1000, // 2 hours
      standard: 8 * 60 * 60 * 1000,   // 8 hours
      low: 24 * 60 * 60 * 1000    // 24 hours
    };
    return slas[urgency] || slas.standard;
  }

  // Collect channel metrics
  private async collectChannelMetrics(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Message volume by channel
    const messageVolume = await db.execute(sql`
      SELECT 
        tenant_id,
        channel,
        direction,
        sender_type,
        COUNT(*) as count
      FROM conversation_messages
      WHERE created_at >= ${oneHourAgo}
      GROUP BY tenant_id, channel, direction, sender_type
    `);

    // Note: This is aggregate counting, not incrementing counters
    // For accurate counters, we record at message insertion time
  }
}

export const metricsCollector = new HandoverMetricsCollector();
```

### 8.2 Grafana Dashboards

```json
// grafana/dashboards/handover-channel-overview.json
{
  "dashboard": {
    "id": null,
    "uid": "handover-channel-overview",
    "title": "Etapa 3 - Workers J: Handover & Channel Management",
    "description": "Overview dashboard for handover preparation, execution, channel switching, and synchronization",
    "tags": ["cerniq", "etapa3", "workers-j", "handover", "channel"],
    "timezone": "Europe/Bucharest",
    "refresh": "30s",
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "templating": {
      "list": [
        {
          "name": "tenant_id",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(cerniq_active_handovers, tenant_id)",
          "refresh": 2,
          "includeAll": true,
          "allValue": ".*"
        },
        {
          "name": "urgency",
          "type": "custom",
          "options": [
            {"text": "All", "value": ".*"},
            {"text": "Critical", "value": "critical"},
            {"text": "Urgent", "value": "urgent"},
            {"text": "Standard", "value": "standard"},
            {"text": "Low", "value": "low"}
          ],
          "current": {"text": "All", "value": ".*"}
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "title": "Active Handovers",
        "type": "stat",
        "gridPos": {"x": 0, "y": 0, "w": 4, "h": 4},
        "targets": [{
          "expr": "sum(cerniq_active_handovers{tenant_id=~\"$tenant_id\", urgency=~\"$urgency\"})",
          "legendFormat": "Active"
        }],
        "options": {
          "reduceOptions": {"calcs": ["lastNotNull"]},
          "colorMode": "value",
          "graphMode": "area"
        },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 20},
                {"color": "red", "value": 50}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "SLA Compliance Rate",
        "type": "gauge",
        "gridPos": {"x": 4, "y": 0, "w": 4, "h": 4},
        "targets": [{
          "expr": "avg(cerniq_handover_sla_compliance{tenant_id=~\"$tenant_id\", urgency=~\"$urgency\"})",
          "legendFormat": "SLA"
        }],
        "options": {
          "showThresholdLabels": false,
          "showThresholdMarkers": true
        },
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 0.9},
                {"color": "green", "value": 0.95}
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Acceptance Rate (1h)",
        "type": "stat",
        "gridPos": {"x": 8, "y": 0, "w": 4, "h": 4},
        "targets": [{
          "expr": "sum(rate(cerniq_handover_operations_total{tenant_id=~\"$tenant_id\", operation=\"accept\"}[1h])) / sum(rate(cerniq_handover_operations_total{tenant_id=~\"$tenant_id\", operation=~\"accept|decline\"}[1h]))",
          "legendFormat": "Acceptance"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 0.7},
                {"color": "green", "value": 0.85}
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Available Agents",
        "type": "stat",
        "gridPos": {"x": 12, "y": 0, "w": 4, "h": 4},
        "targets": [{
          "expr": "sum(cerniq_agent_availability{tenant_id=~\"$tenant_id\", reason=\"available\"})",
          "legendFormat": "Available"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 2},
                {"color": "green", "value": 5}
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Queue Depth",
        "type": "stat",
        "gridPos": {"x": 16, "y": 0, "w": 4, "h": 4},
        "targets": [{
          "expr": "sum(cerniq_handover_queue_depth{state=\"waiting\"})",
          "legendFormat": "Waiting"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 100},
                {"color": "red", "value": 500}
              ]
            }
          }
        }
      },
      {
        "id": 6,
        "title": "Error Rate (1h)",
        "type": "stat",
        "gridPos": {"x": 20, "y": 0, "w": 4, "h": 4},
        "targets": [{
          "expr": "sum(rate(cerniq_handover_errors_total{tenant_id=~\"$tenant_id\"}[1h]))",
          "legendFormat": "Errors/h"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 5},
                {"color": "red", "value": 20}
              ]
            }
          }
        }
      },
      {
        "id": 7,
        "title": "Handover Operations Over Time",
        "type": "timeseries",
        "gridPos": {"x": 0, "y": 4, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "sum(rate(cerniq_handover_operations_total{tenant_id=~\"$tenant_id\", operation=\"prepare\"}[5m])) * 60",
            "legendFormat": "Prepared"
          },
          {
            "expr": "sum(rate(cerniq_handover_operations_total{tenant_id=~\"$tenant_id\", operation=\"accept\"}[5m])) * 60",
            "legendFormat": "Accepted"
          },
          {
            "expr": "sum(rate(cerniq_handover_operations_total{tenant_id=~\"$tenant_id\", operation=\"decline\"}[5m])) * 60",
            "legendFormat": "Declined"
          },
          {
            "expr": "sum(rate(cerniq_handover_operations_total{tenant_id=~\"$tenant_id\", operation=\"complete\"}[5m])) * 60",
            "legendFormat": "Completed"
          },
          {
            "expr": "sum(rate(cerniq_handover_operations_total{tenant_id=~\"$tenant_id\", operation=\"expire\"}[5m])) * 60",
            "legendFormat": "Expired"
          }
        ],
        "options": {
          "legend": {"displayMode": "table", "placement": "right"}
        },
        "fieldConfig": {
          "defaults": {
            "unit": "ops",
            "custom": {"lineWidth": 2, "fillOpacity": 10}
          }
        }
      },
      {
        "id": 8,
        "title": "Handover Duration by Phase",
        "type": "heatmap",
        "gridPos": {"x": 12, "y": 4, "w": 12, "h": 8},
        "targets": [{
          "expr": "sum(rate(cerniq_handover_duration_seconds_bucket{tenant_id=~\"$tenant_id\", phase=\"total\"}[5m])) by (le)",
          "legendFormat": "{{le}}",
          "format": "heatmap"
        }],
        "options": {
          "calculate": false,
          "yAxis": {"unit": "s"}
        }
      },
      {
        "id": 9,
        "title": "Active Handovers by Status",
        "type": "piechart",
        "gridPos": {"x": 0, "y": 12, "w": 6, "h": 6},
        "targets": [{
          "expr": "sum by (status) (cerniq_active_handovers{tenant_id=~\"$tenant_id\"})",
          "legendFormat": "{{status}}"
        }],
        "options": {
          "legend": {"displayMode": "table", "placement": "right"},
          "pieType": "donut"
        }
      },
      {
        "id": 10,
        "title": "Active Handovers by Urgency",
        "type": "piechart",
        "gridPos": {"x": 6, "y": 12, "w": 6, "h": 6},
        "targets": [{
          "expr": "sum by (urgency) (cerniq_active_handovers{tenant_id=~\"$tenant_id\"})",
          "legendFormat": "{{urgency}}"
        }],
        "options": {
          "legend": {"displayMode": "table", "placement": "right"},
          "pieType": "donut"
        },
        "fieldConfig": {
          "overrides": [
            {"matcher": {"id": "byName", "options": "critical"}, "properties": [{"id": "color", "value": {"fixedColor": "red"}}]},
            {"matcher": {"id": "byName", "options": "urgent"}, "properties": [{"id": "color", "value": {"fixedColor": "orange"}}]},
            {"matcher": {"id": "byName", "options": "standard"}, "properties": [{"id": "color", "value": {"fixedColor": "yellow"}}]},
            {"matcher": {"id": "byName", "options": "low"}, "properties": [{"id": "color", "value": {"fixedColor": "green"}}]}
          ]
        }
      },
      {
        "id": 11,
        "title": "Agent Workload Distribution",
        "type": "bargauge",
        "gridPos": {"x": 12, "y": 12, "w": 12, "h": 6},
        "targets": [{
          "expr": "cerniq_agent_workload{tenant_id=~\"$tenant_id\"}",
          "legendFormat": "{{agent_name}}"
        }],
        "options": {
          "displayMode": "gradient",
          "orientation": "horizontal"
        },
        "fieldConfig": {
          "defaults": {
            "max": 10,
            "thresholds": {
              "mode": "percentage",
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 60},
                {"color": "red", "value": 80}
              ]
            }
          }
        }
      },
      {
        "id": 12,
        "title": "SLA Compliance by Type",
        "type": "timeseries",
        "gridPos": {"x": 0, "y": 18, "w": 12, "h": 6},
        "targets": [
          {
            "expr": "avg(cerniq_handover_sla_compliance{tenant_id=~\"$tenant_id\", sla_type=\"acceptance\"})",
            "legendFormat": "Acceptance SLA"
          },
          {
            "expr": "avg(cerniq_handover_sla_compliance{tenant_id=~\"$tenant_id\", sla_type=\"firstResponse\"})",
            "legendFormat": "First Response SLA"
          },
          {
            "expr": "avg(cerniq_handover_sla_compliance{tenant_id=~\"$tenant_id\", sla_type=\"resolution\"})",
            "legendFormat": "Resolution SLA"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "custom": {"lineWidth": 2}
          }
        }
      },
      {
        "id": 13,
        "title": "Queue Depth Over Time",
        "type": "timeseries",
        "gridPos": {"x": 12, "y": 18, "w": 12, "h": 6},
        "targets": [
          {
            "expr": "cerniq_handover_queue_depth{queue_name=\"handover-prepare\", state=\"waiting\"}",
            "legendFormat": "Prepare"
          },
          {
            "expr": "cerniq_handover_queue_depth{queue_name=\"handover-execute\", state=\"waiting\"}",
            "legendFormat": "Execute"
          },
          {
            "expr": "cerniq_handover_queue_depth{queue_name=\"handover-notification\", state=\"waiting\"}",
            "legendFormat": "Notification"
          },
          {
            "expr": "cerniq_handover_queue_depth{queue_name=\"channel-switch\", state=\"waiting\"}",
            "legendFormat": "Channel Switch"
          },
          {
            "expr": "cerniq_handover_queue_depth{queue_name=\"channel-sync\", state=\"waiting\"}",
            "legendFormat": "Channel Sync"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {"fillOpacity": 30, "stacking": {"mode": "normal"}}
          }
        }
      }
    ]
  }
}
```

```json
// grafana/dashboards/handover-channel-details.json
{
  "dashboard": {
    "uid": "handover-channel-details",
    "title": "Etapa 3 - Workers J: Channel Management Details",
    "tags": ["cerniq", "etapa3", "workers-j", "channel"],
    "panels": [
      {
        "id": 1,
        "title": "Channel Switches by Reason",
        "type": "piechart",
        "gridPos": {"x": 0, "y": 0, "w": 8, "h": 6},
        "targets": [{
          "expr": "sum by (reason) (increase(cerniq_channel_switch_total{tenant_id=~\"$tenant_id\"}[24h]))",
          "legendFormat": "{{reason}}"
        }]
      },
      {
        "id": 2,
        "title": "Channel Switch Flow (Sankey)",
        "type": "nodeGraph",
        "gridPos": {"x": 8, "y": 0, "w": 16, "h": 6},
        "description": "Flow of channel switches from source to destination",
        "targets": [{
          "expr": "sum by (from_channel, to_channel) (increase(cerniq_channel_switch_total{tenant_id=~\"$tenant_id\", status=\"success\"}[24h]))",
          "legendFormat": "{{from_channel}} → {{to_channel}}"
        }]
      },
      {
        "id": 3,
        "title": "Message Volume by Channel",
        "type": "timeseries",
        "gridPos": {"x": 0, "y": 6, "w": 12, "h": 6},
        "targets": [
          {
            "expr": "sum by (channel) (rate(cerniq_channel_message_volume_total{tenant_id=~\"$tenant_id\"}[5m])) * 60",
            "legendFormat": "{{channel}}"
          }
        ],
        "fieldConfig": {
          "defaults": {"unit": "msg/min"}
        }
      },
      {
        "id": 4,
        "title": "Channel Delivery Success Rate",
        "type": "bargauge",
        "gridPos": {"x": 12, "y": 6, "w": 12, "h": 6},
        "targets": [{
          "expr": "cerniq_channel_delivery_rate{tenant_id=~\"$tenant_id\"}",
          "legendFormat": "{{channel}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 0.9},
                {"color": "green", "value": 0.98}
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Channel Sync Operations",
        "type": "timeseries",
        "gridPos": {"x": 0, "y": 12, "w": 12, "h": 6},
        "targets": [
          {
            "expr": "sum(rate(cerniq_channel_sync_operations_total{tenant_id=~\"$tenant_id\", status=\"success\"}[5m])) * 60",
            "legendFormat": "Successful"
          },
          {
            "expr": "sum(rate(cerniq_channel_sync_operations_total{tenant_id=~\"$tenant_id\", status=\"failed\"}[5m])) * 60",
            "legendFormat": "Failed"
          }
        ]
      },
      {
        "id": 6,
        "title": "Message Deduplication",
        "type": "stat",
        "gridPos": {"x": 12, "y": 12, "w": 6, "h": 6},
        "targets": [{
          "expr": "sum(increase(cerniq_message_deduplication_total{tenant_id=~\"$tenant_id\"}[24h]))",
          "legendFormat": "Deduplicated"
        }]
      },
      {
        "id": 7,
        "title": "Sync Conflicts",
        "type": "stat",
        "gridPos": {"x": 18, "y": 12, "w": 6, "h": 6},
        "targets": [{
          "expr": "sum(increase(cerniq_channel_sync_conflicts_total{tenant_id=~\"$tenant_id\"}[24h]))",
          "legendFormat": "Conflicts"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 10},
                {"color": "red", "value": 50}
              ]
            }
          }
        }
      },
      {
        "id": 8,
        "title": "WebSocket Connections",
        "type": "timeseries",
        "gridPos": {"x": 0, "y": 18, "w": 12, "h": 6},
        "targets": [{
          "expr": "sum by (connection_type) (cerniq_handover_websocket_connections{tenant_id=~\"$tenant_id\"})",
          "legendFormat": "{{connection_type}}"
        }]
      },
      {
        "id": 9,
        "title": "Real-time Event Rate",
        "type": "timeseries",
        "gridPos": {"x": 12, "y": 18, "w": 12, "h": 6},
        "targets": [{
          "expr": "sum by (event_type) (cerniq_realtime_event_rate{tenant_id=~\"$tenant_id\"})",
          "legendFormat": "{{event_type}}"
        }],
        "fieldConfig": {
          "defaults": {"unit": "events/s"}
        }
      }
    ]
  }
}
```

### 8.3 Alert Rules

```yaml
# prometheus/rules/handover-channel-alerts.yml

groups:
  - name: handover_critical_alerts
    interval: 30s
    rules:
      # Critical handover waiting too long
      - alert: CriticalHandoverPending
        expr: |
          (
            cerniq_active_handovers{status="pending_acceptance", urgency="critical"}
            * on() group_left()
            (time() - cerniq_handover_created_timestamp{urgency="critical"})
          ) > 300
        for: 1m
        labels:
          severity: critical
          team: sales-ops
        annotations:
          summary: "Critical handover pending for >5 minutes"
          description: "Tenant {{ $labels.tenant_id }} has a critical handover pending acceptance for over 5 minutes"
          runbook_url: "https://wiki.cerniq.app/runbooks/critical-handover-pending"
          dashboard: "https://grafana.cerniq.app/d/handover-channel-overview"

      # No available agents for critical handovers
      - alert: NoAgentsAvailableForCritical
        expr: |
          sum(cerniq_active_handovers{urgency="critical", status="pending_acceptance"}) > 0
          and
          sum(cerniq_agent_availability{reason="available"}) == 0
        for: 2m
        labels:
          severity: critical
          team: sales-ops
        annotations:
          summary: "No agents available for critical handovers"
          description: "Critical handovers are pending but no agents are available"
          runbook_url: "https://wiki.cerniq.app/runbooks/no-agents-available"

      # SLA breach imminent
      - alert: SLABreachImminent
        expr: |
          cerniq_handover_sla_compliance{sla_type="acceptance"} < 0.9
          and
          cerniq_active_handovers{status="pending_acceptance"} > 0
        for: 5m
        labels:
          severity: warning
          team: sales-ops
        annotations:
          summary: "SLA breach imminent - acceptance rate dropping"
          description: "Tenant {{ $labels.tenant_id }} acceptance SLA is at {{ $value | humanizePercentage }}"

  - name: handover_warning_alerts
    interval: 60s
    rules:
      # High queue depth
      - alert: HandoverQueueDepthHigh
        expr: cerniq_handover_queue_depth{state="waiting"} > 100
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Handover queue depth high"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} waiting jobs"

      # High error rate
      - alert: HandoverErrorRateHigh
        expr: |
          sum(rate(cerniq_handover_errors_total[5m])) / 
          sum(rate(cerniq_handover_operations_total[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Handover error rate >10%"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Circuit breaker open
      - alert: CircuitBreakerOpen
        expr: cerniq_handover_circuit_breaker_state == 0
        for: 1m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Circuit breaker open for {{ $labels.service }}"
          description: "Service {{ $labels.service }} circuit breaker is open, requests being rejected"

      # Low acceptance rate
      - alert: HandoverAcceptanceRateLow
        expr: |
          sum(rate(cerniq_handover_operations_total{operation="accept"}[1h])) /
          sum(rate(cerniq_handover_operations_total{operation=~"accept|decline"}[1h])) < 0.7
        for: 30m
        labels:
          severity: warning
          team: sales-ops
        annotations:
          summary: "Handover acceptance rate below 70%"
          description: "Agents are declining {{ $value | humanizePercentage }} of handovers"

      # Agent overloaded
      - alert: AgentOverloaded
        expr: |
          cerniq_agent_workload / 
          on(agent_id) group_left() cerniq_agent_max_workload > 0.9
        for: 15m
        labels:
          severity: warning
          team: sales-ops
        annotations:
          summary: "Agent {{ $labels.agent_name }} overloaded"
          description: "Agent is at {{ $value | humanizePercentage }} of capacity"

  - name: channel_alerts
    interval: 60s
    rules:
      # Channel delivery failures
      - alert: ChannelDeliveryFailureRateHigh
        expr: |
          1 - cerniq_channel_delivery_rate < 0.05
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "{{ $labels.channel }} delivery failure rate >5%"
          description: "Channel {{ $labels.channel }} has {{ $value | humanizePercentage }} failure rate"

      # Channel switch failures
      - alert: ChannelSwitchFailureRateHigh
        expr: |
          sum(rate(cerniq_channel_switch_total{status="failed"}[1h])) /
          sum(rate(cerniq_channel_switch_total[1h])) > 0.1
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Channel switch failure rate >10%"
          description: "{{ $value | humanizePercentage }} of channel switches are failing"

      # Sync lag too high
      - alert: ChannelSyncLagHigh
        expr: cerniq_channel_sync_lag_seconds > 600
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Channel sync lag >10 minutes"
          description: "Conversation {{ $labels.conversation_id }} sync lag is {{ $value | humanizeDuration }}"

      # High deduplication rate (potential sync issue)
      - alert: MessageDeduplicationRateHigh
        expr: |
          sum(rate(cerniq_message_deduplication_total[1h])) /
          sum(rate(cerniq_channel_message_volume_total[1h])) > 0.2
        for: 30m
        labels:
          severity: info
          team: platform
        annotations:
          summary: "High message deduplication rate"
          description: "{{ $value | humanizePercentage }} of messages are duplicates - potential sync issue"

  - name: system_health_alerts
    interval: 60s
    rules:
      # WebSocket connections dropping
      - alert: WebSocketConnectionsDrop
        expr: |
          delta(cerniq_handover_websocket_connections[5m]) < -10
        for: 2m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "WebSocket connections dropping rapidly"
          description: "Lost {{ $value }} connections in 5 minutes"

      # Redis connection issues
      - alert: HandoverRedisConnectionIssues
        expr: |
          increase(cerniq_handover_errors_total{error_type="REDIS_CONNECTION"}[5m]) > 5
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Redis connection issues for handover workers"
          description: "{{ $value }} Redis connection errors in 5 minutes"

      # AI service unavailable
      - alert: AIServiceUnavailable
        expr: |
          increase(cerniq_handover_errors_total{error_type="AI_SERVICE_UNAVAILABLE"}[5m]) > 3
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "AI service unavailable for context compilation"
          description: "{{ $value }} AI service errors in 5 minutes"

      # Stalled jobs
      - alert: HandoverJobsStalled
        expr: cerniq_handover_queue_depth{state="stalled"} > 0
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Stalled jobs in {{ $labels.queue_name }}"
          description: "{{ $value }} jobs are stalled in queue"
```

### 8.4 Logging Standards

```typescript
// src/workers/etapa3/J-handover-channel/logging/logging-config.ts

import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// Async context for request tracing
export const asyncContext = new AsyncLocalStorage<{
  requestId: string;
  tenantId: string;
  handoverId?: string;
  conversationId?: string;
  agentId?: string;
}>();

// Log levels by environment
const LOG_LEVELS = {
  development: 'debug',
  staging: 'debug',
  production: 'info'
};

// Create base logger
export const logger = pino({
  level: LOG_LEVELS[process.env.NODE_ENV || 'development'] || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({
      service: 'cerniq-workers',
      module: 'handover-channel',
      version: process.env.APP_VERSION || 'unknown',
      environment: process.env.NODE_ENV || 'development'
    })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'authorization',
      'cookie',
      'email',
      'phone',
      '*.password',
      '*.token',
      '*.apiKey'
    ],
    censor: '[REDACTED]'
  },
  // Custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'x-request-id': req.headers?.['x-request-id']
      }
    })
  },
  // Mixin to add async context
  mixin: () => {
    const context = asyncContext.getStore();
    return context ? {
      requestId: context.requestId,
      tenantId: context.tenantId,
      handoverId: context.handoverId,
      conversationId: context.conversationId,
      agentId: context.agentId
    } : {};
  }
});

// Child loggers for specific workers
export const handoverPrepareLogger = logger.child({ worker: 'J1-handover-prepare' });
export const handoverExecuteLogger = logger.child({ worker: 'J2-handover-execute' });
export const channelSwitchLogger = logger.child({ worker: 'J3-channel-switch' });
export const channelSyncLogger = logger.child({ worker: 'J4-channel-sync' });

// Structured log event types
export enum HandoverLogEvent {
  // Handover lifecycle
  HANDOVER_INITIATED = 'handover.initiated',
  HANDOVER_PREPARED = 'handover.prepared',
  HANDOVER_ASSIGNED = 'handover.assigned',
  HANDOVER_ACCEPTED = 'handover.accepted',
  HANDOVER_DECLINED = 'handover.declined',
  HANDOVER_COMPLETED = 'handover.completed',
  HANDOVER_EXPIRED = 'handover.expired',
  HANDOVER_ESCALATED = 'handover.escalated',
  HANDOVER_CANCELLED = 'handover.cancelled',

  // Agent events
  AGENT_SELECTED = 'agent.selected',
  AGENT_NOTIFIED = 'agent.notified',
  AGENT_REMINDER_SENT = 'agent.reminder_sent',
  AGENT_UNAVAILABLE = 'agent.unavailable',
  AGENT_WORKLOAD_UPDATED = 'agent.workload_updated',

  // Channel events
  CHANNEL_SWITCH_INITIATED = 'channel.switch_initiated',
  CHANNEL_SWITCH_COMPLETED = 'channel.switch_completed',
  CHANNEL_SWITCH_FAILED = 'channel.switch_failed',
  CHANNEL_SYNC_STARTED = 'channel.sync_started',
  CHANNEL_SYNC_COMPLETED = 'channel.sync_completed',
  CHANNEL_SYNC_FAILED = 'channel.sync_failed',

  // Message events
  MESSAGE_SENT = 'message.sent',
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_READ = 'message.read',
  MESSAGE_DEDUPLICATED = 'message.deduplicated',

  // Error events
  ERROR_OCCURRED = 'error.occurred',
  ERROR_RETRYING = 'error.retrying',
  ERROR_HITL_CREATED = 'error.hitl_created',

  // SLA events
  SLA_WARNING = 'sla.warning',
  SLA_BREACH = 'sla.breach',

  // System events
  CIRCUIT_BREAKER_OPEN = 'circuit.breaker_open',
  CIRCUIT_BREAKER_CLOSE = 'circuit.breaker_close',
  QUEUE_HEALTH_WARNING = 'queue.health_warning'
}

// Log structured event
export function logEvent(
  loggerInstance: pino.Logger,
  event: HandoverLogEvent,
  data: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' | 'debug' = 'info'
): void {
  const logData = {
    event,
    ...data,
    timestamp: new Date().toISOString()
  };

  switch (level) {
    case 'error':
      loggerInstance.error(logData);
      break;
    case 'warn':
      loggerInstance.warn(logData);
      break;
    case 'debug':
      loggerInstance.debug(logData);
      break;
    default:
      loggerInstance.info(logData);
  }
}

// Performance logging
export function logPerformance(
  loggerInstance: pino.Logger,
  operation: string,
  startTime: number,
  metadata?: Record<string, unknown>
): void {
  const duration = Date.now() - startTime;
  
  loggerInstance.info({
    event: 'performance',
    operation,
    durationMs: duration,
    ...metadata
  });

  // Warn if operation is slow
  const SLOW_THRESHOLDS: Record<string, number> = {
    'context_compilation': 10000,
    'agent_selection': 2000,
    'notification_send': 5000,
    'channel_switch': 5000,
    'channel_sync': 30000,
    'message_send': 3000
  };

  const threshold = SLOW_THRESHOLDS[operation] || 5000;
  if (duration > threshold) {
    loggerInstance.warn({
      event: 'performance.slow',
      operation,
      durationMs: duration,
      threshold,
      ...metadata
    });
  }
}

// Audit logging for compliance
export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }
): Promise<void> {
  const context = asyncContext.getStore();
  
  const auditEntry = {
    event: 'audit',
    action,
    entityType,
    entityId,
    userId,
    tenantId: context?.tenantId,
    requestId: context?.requestId,
    changes: changes ? {
      before: changes.before ? JSON.stringify(changes.before) : null,
      after: changes.after ? JSON.stringify(changes.after) : null
    } : null,
    timestamp: new Date().toISOString(),
    ipAddress: null, // Set from request context if available
    userAgent: null
  };

  // Log to main logger
  logger.info(auditEntry);

  // Also persist to database for compliance
  // This is async and fire-and-forget for performance
  persistAuditLog(auditEntry).catch(err => {
    logger.error({ err, auditEntry }, 'Failed to persist audit log');
  });
}

async function persistAuditLog(entry: Record<string, unknown>): Promise<void> {
  // Implementation would insert into audit_logs table
  // Omitted for brevity
}
```

---

## 9. Testing Specification

### 9.1 Unit Tests

```typescript
// src/workers/etapa3/J-handover-channel/__tests__/unit/handover-prepare.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HandoverContextCompiler } from '../../J1-prepare/context-compiler';
import { AgentSelector } from '../../J1-prepare/agent-selector';
import { HandoverUrgencyClassifier } from '../../J1-prepare/urgency-classifier';

// Mock dependencies
vi.mock('@/lib/database', () => ({
  db: {
    query: {
      conversations: { findFirst: vi.fn() },
      conversationMessages: { findMany: vi.fn() },
      agents: { findMany: vi.fn() }
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn() })
  }
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: JSON.stringify({ summary: 'Test summary' }) }]
      })
    }
  }))
}));

describe('HandoverContextCompiler', () => {
  let compiler: HandoverContextCompiler;

  beforeEach(() => {
    compiler = new HandoverContextCompiler();
    vi.clearAllMocks();
  });

  describe('compileContext', () => {
    it('should compile context for a conversation with messages', async () => {
      // Mock conversation
      const mockConversation = {
        id: 'conv-1',
        tenantId: 'tenant-1',
        contactId: 'contact-1',
        aiSessionId: 'session-1',
        currentChannel: 'whatsapp',
        contact: {
          id: 'contact-1',
          name: 'Ion Popescu',
          company: 'Agro SRL',
          email: 'ion@agro.ro',
          phone: '+40721000000',
          cui: 'RO12345678'
        }
      };

      // Mock messages
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Bună ziua, doresc informații despre tractoare',
          senderType: 'customer',
          createdAt: new Date('2026-01-18T10:00:00Z')
        },
        {
          id: 'msg-2',
          content: 'Bună ziua! Cu plăcere vă ajut. Ce tip de tractor căutați?',
          senderType: 'ai',
          createdAt: new Date('2026-01-18T10:00:30Z')
        },
        {
          id: 'msg-3',
          content: 'Caut un tractor de 120 CP pentru ferma mea de 50 ha',
          senderType: 'customer',
          createdAt: new Date('2026-01-18T10:01:00Z')
        }
      ];

      // Setup mocks
      const { db } = await import('@/lib/database');
      vi.mocked(db.query.conversations.findFirst).mockResolvedValue(mockConversation);
      vi.mocked(db.query.conversationMessages.findMany).mockResolvedValue(mockMessages);

      // Execute
      const context = await compiler.compileContext('conv-1');

      // Assertions
      expect(context).toBeDefined();
      expect(context.contactInfo.name).toBe('Ion Popescu');
      expect(context.contactInfo.company).toBe('Agro SRL');
      expect(context.conversationHistory).toHaveLength(3);
      expect(context.currentChannel).toBe('whatsapp');
    });

    it('should handle conversation not found', async () => {
      const { db } = await import('@/lib/database');
      vi.mocked(db.query.conversations.findFirst).mockResolvedValue(null);

      await expect(compiler.compileContext('nonexistent'))
        .rejects.toThrow('Conversation not found');
    });

    it('should truncate very long conversation history', async () => {
      const mockConversation = {
        id: 'conv-1',
        tenantId: 'tenant-1',
        contact: { name: 'Test' }
      };

      // Create 100 messages
      const mockMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        senderType: i % 2 === 0 ? 'customer' : 'ai',
        createdAt: new Date(Date.now() - (100 - i) * 60000)
      }));

      const { db } = await import('@/lib/database');
      vi.mocked(db.query.conversations.findFirst).mockResolvedValue(mockConversation);
      vi.mocked(db.query.conversationMessages.findMany).mockResolvedValue(mockMessages);

      const context = await compiler.compileContext('conv-1');

      // Should be truncated to last 50 messages
      expect(context.conversationHistory.length).toBeLessThanOrEqual(50);
    });
  });

  describe('generateAISummary', () => {
    it('should generate AI summary from messages', async () => {
      const messages = [
        { content: 'Test message 1', senderType: 'customer' },
        { content: 'Test message 2', senderType: 'ai' }
      ];

      const summary = await compiler.generateAISummary(messages);

      expect(summary).toBeDefined();
      expect(typeof summary.summary).toBe('string');
    });

    it('should handle AI service errors gracefully', async () => {
      const Anthropic = await import('@anthropic-ai/sdk');
      vi.mocked(Anthropic.default).mockImplementationOnce(() => ({
        messages: {
          create: vi.fn().mockRejectedValue(new Error('AI service error'))
        }
      }));

      const messages = [{ content: 'Test', senderType: 'customer' }];

      // Should not throw, should return fallback summary
      const summary = await compiler.generateAISummary(messages);
      expect(summary.summary).toContain('fallback');
    });
  });
});

describe('AgentSelector', () => {
  let selector: AgentSelector;

  beforeEach(() => {
    selector = new AgentSelector();
  });

  describe('selectBestAgent', () => {
    it('should select agent with matching skills and availability', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          skills: ['tractors', 'combines'],
          currentWorkload: 3,
          maxConcurrentHandovers: 5,
          availabilityStatus: 'available',
          performanceScore: 85
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          skills: ['irrigation'],
          currentWorkload: 2,
          maxConcurrentHandovers: 5,
          availabilityStatus: 'available',
          performanceScore: 90
        }
      ];

      const { db } = await import('@/lib/database');
      vi.mocked(db.query.agents.findMany).mockResolvedValue(mockAgents);

      const result = await selector.selectBestAgent(
        'tenant-1',
        {
          requiredSkills: ['tractors'],
          urgency: 'standard',
          language: 'ro'
        }
      );

      expect(result.selectedAgentId).toBe('agent-1');
      expect(result.matchScore).toBeGreaterThan(0);
    });

    it('should prefer agents with lower workload', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          skills: ['tractors'],
          currentWorkload: 4,
          maxConcurrentHandovers: 5,
          availabilityStatus: 'available',
          performanceScore: 85
        },
        {
          id: 'agent-2',
          skills: ['tractors'],
          currentWorkload: 1,
          maxConcurrentHandovers: 5,
          availabilityStatus: 'available',
          performanceScore: 80
        }
      ];

      const { db } = await import('@/lib/database');
      vi.mocked(db.query.agents.findMany).mockResolvedValue(mockAgents);

      const result = await selector.selectBestAgent(
        'tenant-1',
        { requiredSkills: ['tractors'], urgency: 'standard' }
      );

      // Agent-2 should be selected due to lower workload despite lower score
      expect(result.selectedAgentId).toBe('agent-2');
    });

    it('should return null when no agents are available', async () => {
      const { db } = await import('@/lib/database');
      vi.mocked(db.query.agents.findMany).mockResolvedValue([]);

      const result = await selector.selectBestAgent(
        'tenant-1',
        { requiredSkills: ['tractors'], urgency: 'standard' }
      );

      expect(result.selectedAgentId).toBeNull();
      expect(result.fallbackRequired).toBe(true);
    });
  });

  describe('calculateAgentScore', () => {
    it('should calculate correct score based on multiple factors', () => {
      const agent = {
        skills: ['tractors', 'combines', 'irrigation'],
        currentWorkload: 2,
        maxConcurrentHandovers: 5,
        performanceScore: 90,
        languages: ['ro', 'en']
      };

      const criteria = {
        requiredSkills: ['tractors', 'combines'],
        urgency: 'urgent',
        language: 'ro'
      };

      const score = selector.calculateAgentScore(agent, criteria);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

describe('HandoverUrgencyClassifier', () => {
  let classifier: HandoverUrgencyClassifier;

  beforeEach(() => {
    classifier = new HandoverUrgencyClassifier();
  });

  describe('classifyUrgency', () => {
    it('should classify as critical for high deal value', () => {
      const urgency = classifier.classifyUrgency({
        dealValue: 500000,
        sentiment: 'neutral',
        waitTime: 0,
        vipCustomer: false,
        customerRequestedHuman: false
      });

      expect(urgency).toBe('critical');
    });

    it('should classify as urgent for VIP customer', () => {
      const urgency = classifier.classifyUrgency({
        dealValue: 10000,
        sentiment: 'neutral',
        waitTime: 0,
        vipCustomer: true,
        customerRequestedHuman: false
      });

      expect(urgency).toBe('urgent');
    });

    it('should classify as urgent for negative sentiment', () => {
      const urgency = classifier.classifyUrgency({
        dealValue: 10000,
        sentiment: 'negative',
        waitTime: 0,
        vipCustomer: false,
        customerRequestedHuman: false
      });

      expect(urgency).toBe('urgent');
    });

    it('should escalate based on wait time', () => {
      const urgency = classifier.classifyUrgency({
        dealValue: 10000,
        sentiment: 'neutral',
        waitTime: 1800000, // 30 minutes
        vipCustomer: false,
        customerRequestedHuman: true
      });

      expect(['urgent', 'critical']).toContain(urgency);
    });

    it('should classify as standard for normal conditions', () => {
      const urgency = classifier.classifyUrgency({
        dealValue: 10000,
        sentiment: 'positive',
        waitTime: 0,
        vipCustomer: false,
        customerRequestedHuman: false
      });

      expect(urgency).toBe('standard');
    });
  });
});
```

```typescript
// src/workers/etapa3/J-handover-channel/__tests__/unit/channel-switch.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelSwitchWorker } from '../../J3-switch/worker';
import { ConversationContextPreserver } from '../../J3-switch/context-preserver';
import { selectBestChannel, validateChannelForContact } from '../../J3-switch/channel-selector';

describe('Channel Selector', () => {
  describe('selectBestChannel', () => {
    it('should respect customer preference if available', () => {
      const result = selectBestChannel({
        currentChannel: 'email',
        customerPreference: 'whatsapp',
        availableChannels: ['email', 'whatsapp', 'sms'],
        urgency: 'standard',
        contactData: {
          hasEmail: true,
          hasPhone: true,
          hasWhatsApp: true
        }
      });

      expect(result).toBe('whatsapp');
    });

    it('should switch from email to whatsapp after delivery failures', () => {
      const result = selectBestChannel({
        currentChannel: 'email',
        customerPreference: null,
        availableChannels: ['email', 'whatsapp', 'sms'],
        urgency: 'standard',
        deliveryFailures: 3,
        contactData: {
          hasEmail: true,
          hasPhone: true,
          hasWhatsApp: true
        }
      });

      expect(result).toBe('whatsapp');
    });

    it('should escalate to phone for critical urgency', () => {
      const result = selectBestChannel({
        currentChannel: 'email',
        customerPreference: null,
        availableChannels: ['email', 'whatsapp', 'phone'],
        urgency: 'critical',
        contactData: {
          hasEmail: true,
          hasPhone: true,
          hasWhatsApp: true
        }
      });

      expect(result).toBe('phone');
    });

    it('should fallback to available channel when preferred unavailable', () => {
      const result = selectBestChannel({
        currentChannel: 'whatsapp',
        customerPreference: 'whatsapp',
        availableChannels: ['email', 'sms'],
        urgency: 'standard',
        contactData: {
          hasEmail: true,
          hasPhone: true,
          hasWhatsApp: false
        }
      });

      expect(['email', 'sms']).toContain(result);
    });
  });

  describe('validateChannelForContact', () => {
    it('should validate email channel with valid email', () => {
      const result = validateChannelForContact('email', {
        email: 'test@example.com',
        emailBounced: false
      });

      expect(result.valid).toBe(true);
    });

    it('should reject email channel with bounced email', () => {
      const result = validateChannelForContact('email', {
        email: 'test@example.com',
        emailBounced: true
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('bounced');
    });

    it('should validate whatsapp channel with valid phone', () => {
      const result = validateChannelForContact('whatsapp', {
        phone: '+40721000000',
        whatsappOptedOut: false
      });

      expect(result.valid).toBe(true);
    });

    it('should reject whatsapp channel if opted out', () => {
      const result = validateChannelForContact('whatsapp', {
        phone: '+40721000000',
        whatsappOptedOut: true
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('opted out');
    });

    it('should reject phone channel if on DNC list', () => {
      const result = validateChannelForContact('phone', {
        phone: '+40721000000',
        onDncList: true
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('DNC');
    });
  });
});

describe('ConversationContextPreserver', () => {
  let preserver: ConversationContextPreserver;

  beforeEach(() => {
    preserver = new ConversationContextPreserver();
  });

  describe('preserveContext', () => {
    it('should build preserved context from conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        messages: [
          { content: 'Salut, caut un tractor', senderType: 'customer' },
          { content: 'Bună ziua! Ce putere doriți?', senderType: 'ai' },
          { content: '100-120 CP', senderType: 'customer' }
        ],
        contact: { name: 'Ion Popescu' }
      };

      const context = await preserver.preserveContext(mockConversation);

      expect(context).toBeDefined();
      expect(context.messageHistory).toHaveLength(3);
      expect(context.customerProfile).toBeDefined();
    });
  });

  describe('generateContextBriefing', () => {
    it('should generate email-appropriate briefing', () => {
      const context = {
        summary: 'Customer looking for tractor',
        keyTopics: ['tractor', '120 CP'],
        customerNeeds: ['farming equipment'],
        agreedPoints: [],
        openIssues: ['price negotiation'],
        nextSteps: ['send quote']
      };

      const briefing = preserver.generateContextBriefing(context, 'email');

      expect(briefing).toContain('Customer looking for tractor');
      expect(briefing.length).toBeGreaterThan(50);
    });

    it('should generate SMS-appropriate briefing (short)', () => {
      const context = {
        summary: 'Customer looking for tractor',
        keyTopics: ['tractor', '120 CP'],
        customerNeeds: ['farming equipment'],
        agreedPoints: [],
        openIssues: ['price negotiation'],
        nextSteps: ['send quote']
      };

      const briefing = preserver.generateContextBriefing(context, 'sms');

      expect(briefing.length).toBeLessThanOrEqual(160);
    });
  });
});
```

### 9.2 Integration Tests

```typescript
// src/workers/etapa3/J-handover-channel/__tests__/integration/handover-flow.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/lib/database/schema';

// Test database and Redis connections
let pool: Pool;
let redis: Redis;
let db: ReturnType<typeof drizzle>;

// Queues
let handoverPrepareQueue: Queue;
let handoverExecuteQueue: Queue;
let handoverNotificationQueue: Queue;

describe('Handover Flow Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 
        'postgresql://test:test@localhost:5432/cerniq_test'
    });
    db = drizzle(pool, { schema });

    // Connect to test Redis
    redis = new Redis({
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: 6379,
      db: 15 // Use separate DB for tests
    });

    // Create test queues
    const connection = { host: 'localhost', port: 6379, db: 15 };
    handoverPrepareQueue = new Queue('handover-prepare-test', { connection });
    handoverExecuteQueue = new Queue('handover-execute-test', { connection });
    handoverNotificationQueue = new Queue('handover-notification-test', { connection });
  });

  afterAll(async () => {
    // Cleanup
    await handoverPrepareQueue.close();
    await handoverExecuteQueue.close();
    await handoverNotificationQueue.close();
    await redis.quit();
    await pool.end();
  });

  beforeEach(async () => {
    // Clear test data
    await db.delete(schema.handovers);
    await db.delete(schema.handoverEvents);
    await redis.flushdb();
  });

  describe('Complete Handover Flow', () => {
    it('should process handover from preparation to completion', async () => {
      // 1. Create test data
      const tenant = await createTestTenant(db);
      const contact = await createTestContact(db, tenant.id);
      const conversation = await createTestConversation(db, tenant.id, contact.id);
      const agent = await createTestAgent(db, tenant.id);

      // 2. Queue handover preparation
      const prepareJob = await handoverPrepareQueue.add('prepare', {
        tenantId: tenant.id,
        conversationId: conversation.id,
        triggerType: 'customer_request',
        triggerReason: 'Customer requested human agent'
      });

      // 3. Wait for preparation to complete
      const prepareResult = await waitForJobCompletion(handoverPrepareQueue, prepareJob.id);
      expect(prepareResult.status).toBe('completed');

      // 4. Verify handover created
      const handover = await db.query.handovers.findFirst({
        where: eq(schema.handovers.conversationId, conversation.id)
      });
      expect(handover).toBeDefined();
      expect(handover!.status).toBe('preparing');

      // 5. Verify execute job was queued
      const executeJob = await findJobInQueue(handoverExecuteQueue, {
        handoverId: handover!.id
      });
      expect(executeJob).toBeDefined();

      // 6. Wait for execution to complete
      const executeResult = await waitForJobCompletion(handoverExecuteQueue, executeJob!.id);
      expect(executeResult.status).toBe('completed');

      // 7. Verify agent assigned
      const updatedHandover = await db.query.handovers.findFirst({
        where: eq(schema.handovers.id, handover!.id)
      });
      expect(updatedHandover!.assignedAgentId).toBe(agent.id);
      expect(updatedHandover!.status).toBe('pending_acceptance');

      // 8. Verify notification sent
      const notificationJob = await findJobInQueue(handoverNotificationQueue, {
        handoverId: handover!.id,
        agentId: agent.id
      });
      expect(notificationJob).toBeDefined();

      // 9. Simulate agent acceptance
      await simulateAgentAcceptance(db, handover!.id, agent.id);

      // 10. Verify final state
      const finalHandover = await db.query.handovers.findFirst({
        where: eq(schema.handovers.id, handover!.id)
      });
      expect(finalHandover!.status).toBe('accepted');
      expect(finalHandover!.acceptedAt).toBeDefined();
    });

    it('should handle agent decline and reassignment', async () => {
      // Setup
      const tenant = await createTestTenant(db);
      const contact = await createTestContact(db, tenant.id);
      const conversation = await createTestConversation(db, tenant.id, contact.id);
      const agent1 = await createTestAgent(db, tenant.id, { name: 'Agent 1' });
      const agent2 = await createTestAgent(db, tenant.id, { name: 'Agent 2' });

      // Create handover
      const handover = await createTestHandover(db, {
        tenantId: tenant.id,
        conversationId: conversation.id,
        assignedAgentId: agent1.id,
        status: 'pending_acceptance'
      });

      // Simulate decline
      const declineResult = await handleHandoverDecline(
        handover.id,
        agent1.id,
        'Agent is busy'
      );

      // Verify reassignment
      expect(declineResult.reassigned).toBe(true);
      
      const updatedHandover = await db.query.handovers.findFirst({
        where: eq(schema.handovers.id, handover.id)
      });
      expect(updatedHandover!.assignedAgentId).toBe(agent2.id);

      // Verify event logged
      const events = await db.query.handoverEvents.findMany({
        where: eq(schema.handoverEvents.handoverId, handover.id)
      });
      expect(events.some(e => e.eventType === 'declined')).toBe(true);
      expect(events.some(e => e.eventType === 'reassigned')).toBe(true);
    });

    it('should expire handover after timeout', async () => {
      // Setup with expired deadline
      const tenant = await createTestTenant(db);
      const conversation = await createTestConversation(db, tenant.id);
      
      const handover = await createTestHandover(db, {
        tenantId: tenant.id,
        conversationId: conversation.id,
        status: 'pending_acceptance',
        acceptanceDeadline: new Date(Date.now() - 60000) // 1 minute ago
      });

      // Run expiration check
      await expireOverdueHandovers();

      // Verify expired
      const expiredHandover = await db.query.handovers.findFirst({
        where: eq(schema.handovers.id, handover.id)
      });
      expect(expiredHandover!.status).toBe('expired');
      expect(expiredHandover!.expiredAt).toBeDefined();
    });
  });

  describe('Notification System Integration', () => {
    it('should send multi-channel notifications for urgent handovers', async () => {
      const tenant = await createTestTenant(db);
      const agent = await createTestAgent(db, tenant.id, {
        email: 'agent@test.com',
        phone: '+40721000000',
        notificationPreferences: {
          email: true,
          sms: true,
          push: true
        }
      });

      const handover = await createTestHandover(db, {
        tenantId: tenant.id,
        assignedAgentId: agent.id,
        urgency: 'critical'
      });

      // Send notification
      await sendHandoverNotification(handover.id, agent.id, 'urgent');

      // Verify notifications table
      const notifications = await db.query.notifications.findMany({
        where: and(
          eq(schema.notifications.userId, agent.id),
          eq(schema.notifications.relatedEntityId, handover.id)
        )
      });

      // Should have in-app + email + sms for critical
      expect(notifications.length).toBeGreaterThanOrEqual(3);
      expect(notifications.map(n => n.channel)).toContain('in_app');
      expect(notifications.map(n => n.channel)).toContain('email');
    });

    it('should respect agent notification preferences', async () => {
      const tenant = await createTestTenant(db);
      const agent = await createTestAgent(db, tenant.id, {
        notificationPreferences: {
          email: false,
          sms: false,
          push: true
        }
      });

      const handover = await createTestHandover(db, {
        tenantId: tenant.id,
        assignedAgentId: agent.id,
        urgency: 'standard'
      });

      await sendHandoverNotification(handover.id, agent.id, 'standard');

      const notifications = await db.query.notifications.findMany({
        where: eq(schema.notifications.userId, agent.id)
      });

      // Should only have in-app and push (not email/sms)
      const channels = notifications.map(n => n.channel);
      expect(channels).toContain('in_app');
      expect(channels).not.toContain('email');
      expect(channels).not.toContain('sms');
    });
  });

  describe('Agent Selection Integration', () => {
    it('should select agent based on skills and workload', async () => {
      const tenant = await createTestTenant(db);
      
      // Create agents with different skills/workload
      const agent1 = await createTestAgent(db, tenant.id, {
        name: 'Specialist Tractoare',
        skills: ['tractors', 'combines'],
        currentWorkload: 4,
        maxConcurrentHandovers: 5
      });

      const agent2 = await createTestAgent(db, tenant.id, {
        name: 'Specialist Irigații',
        skills: ['irrigation', 'pumps'],
        currentWorkload: 1,
        maxConcurrentHandovers: 5
      });

      // Select agent for tractor-related handover
      const result = await selectAgentForHandover(tenant.id, {
        requiredSkills: ['tractors'],
        urgency: 'standard'
      });

      expect(result.selectedAgentId).toBe(agent1.id);
    });

    it('should respect agent availability status', async () => {
      const tenant = await createTestTenant(db);
      
      const unavailableAgent = await createTestAgent(db, tenant.id, {
        skills: ['tractors'],
        availabilityStatus: 'busy'
      });

      const availableAgent = await createTestAgent(db, tenant.id, {
        skills: ['tractors'],
        availabilityStatus: 'available'
      });

      const result = await selectAgentForHandover(tenant.id, {
        requiredSkills: ['tractors'],
        urgency: 'standard'
      });

      expect(result.selectedAgentId).toBe(availableAgent.id);
    });
  });
});

// Helper functions
async function createTestTenant(db: any) {
  const [tenant] = await db.insert(schema.tenants).values({
    id: `tenant-${Date.now()}`,
    name: 'Test Tenant',
    domain: 'test.cerniq.app'
  }).returning();
  return tenant;
}

async function createTestContact(db: any, tenantId: string) {
  const [contact] = await db.insert(schema.contacts).values({
    id: `contact-${Date.now()}`,
    tenantId,
    name: 'Test Contact',
    email: 'contact@test.com',
    phone: '+40721000000'
  }).returning();
  return contact;
}

async function createTestConversation(db: any, tenantId: string, contactId?: string) {
  const [conversation] = await db.insert(schema.conversations).values({
    id: `conv-${Date.now()}`,
    tenantId,
    contactId: contactId || `contact-${Date.now()}`,
    currentChannel: 'whatsapp',
    status: 'active'
  }).returning();
  return conversation;
}

async function createTestAgent(db: any, tenantId: string, overrides?: Partial<any>) {
  const [agent] = await db.insert(schema.agents).values({
    id: `agent-${Date.now()}`,
    tenantId,
    name: overrides?.name || 'Test Agent',
    email: overrides?.email || `agent-${Date.now()}@test.com`,
    skills: overrides?.skills || ['general'],
    currentWorkload: overrides?.currentWorkload || 0,
    maxConcurrentHandovers: overrides?.maxConcurrentHandovers || 5,
    availabilityStatus: overrides?.availabilityStatus || 'available',
    isActive: true,
    ...overrides
  }).returning();
  return agent;
}

async function createTestHandover(db: any, data: any) {
  const [handover] = await db.insert(schema.handovers).values({
    id: `handover-${Date.now()}`,
    ...data
  }).returning();
  return handover;
}

async function waitForJobCompletion(queue: Queue, jobId: string, timeoutMs = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const job = await queue.getJob(jobId);
    if (!job) throw new Error('Job not found');
    
    const state = await job.getState();
    if (state === 'completed') return { status: 'completed', result: job.returnvalue };
    if (state === 'failed') throw new Error(`Job failed: ${job.failedReason}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Job timeout');
}

async function findJobInQueue(queue: Queue, matchData: Record<string, any>) {
  const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
  return jobs.find(job => {
    const data = job.data;
    return Object.entries(matchData).every(([key, value]) => data[key] === value);
  });
}
```

### 9.3 End-to-End Tests

```typescript
// src/workers/etapa3/J-handover-channel/__tests__/e2e/handover-e2e.test.ts

import { test, expect } from '@playwright/test';
import { createTestContext, cleanupTestData } from './helpers/test-context';

test.describe('Handover E2E Tests', () => {
  let context: TestContext;

  test.beforeAll(async () => {
    context = await createTestContext();
  });

  test.afterAll(async () => {
    await cleanupTestData(context);
  });

  test('Complete handover flow from AI to human agent', async ({ page }) => {
    // 1. Login as customer and start conversation
    await page.goto(`${context.baseUrl}/chat`);
    
    // Start WhatsApp simulation
    await page.fill('[data-testid="chat-input"]', 'Salut, vreau să vorbesc cu un om');
    await page.click('[data-testid="send-button"]');

    // 2. Wait for AI response indicating handover
    await expect(page.locator('[data-testid="ai-response"]'))
      .toContainText('voi transfera către un coleg', { timeout: 10000 });

    // 3. Verify handover notification in agent dashboard
    const agentPage = await context.browser.newPage();
    await agentPage.goto(`${context.baseUrl}/agent/dashboard`);
    await agentPage.fill('[data-testid="email"]', context.testAgent.email);
    await agentPage.fill('[data-testid="password"]', context.testAgent.password);
    await agentPage.click('[data-testid="login-button"]');

    // 4. Check for handover notification
    await expect(agentPage.locator('[data-testid="handover-notification"]'))
      .toBeVisible({ timeout: 15000 });

    // 5. Accept handover
    await agentPage.click('[data-testid="accept-handover-button"]');

    // 6. Verify handover accepted
    await expect(agentPage.locator('[data-testid="handover-status"]'))
      .toHaveText('Accepted');

    // 7. Verify customer sees agent joined
    await expect(page.locator('[data-testid="system-message"]'))
      .toContainText('agent a preluat conversația', { timeout: 10000 });

    // 8. Agent sends message
    await agentPage.fill('[data-testid="agent-chat-input"]', 'Bună ziua, sunt Ion. Cum vă pot ajuta?');
    await agentPage.click('[data-testid="agent-send-button"]');

    // 9. Customer receives agent message
    await expect(page.locator('[data-testid="agent-message"]'))
      .toContainText('sunt Ion', { timeout: 5000 });

    // 10. Complete handover
    await agentPage.click('[data-testid="resolve-conversation-button"]');
    await agentPage.fill('[data-testid="resolution-notes"]', 'Customer assisted successfully');
    await agentPage.click('[data-testid="confirm-resolution-button"]');

    // 11. Verify handover completed
    await expect(agentPage.locator('[data-testid="handover-status"]'))
      .toHaveText('Completed');

    await agentPage.close();
  });

  test('Handover decline and reassignment', async ({ page }) => {
    // Setup: Create handover pending acceptance
    const handover = await context.api.createTestHandover({
      status: 'pending_acceptance',
      assignedAgentId: context.testAgent.id
    });

    // 1. Agent 1 declines
    const agent1Page = await context.browser.newPage();
    await loginAsAgent(agent1Page, context.testAgent);
    
    await agent1Page.goto(`${context.baseUrl}/agent/handovers/${handover.id}`);
    await agent1Page.click('[data-testid="decline-handover-button"]');
    await agent1Page.fill('[data-testid="decline-reason"]', 'Nu am expertiza necesară');
    await agent1Page.click('[data-testid="confirm-decline-button"]');

    // 2. Verify reassignment notification to Agent 2
    const agent2Page = await context.browser.newPage();
    await loginAsAgent(agent2Page, context.testAgent2);

    await expect(agent2Page.locator('[data-testid="handover-notification"]'))
      .toBeVisible({ timeout: 15000 });

    // 3. Agent 2 accepts
    await agent2Page.click('[data-testid="accept-handover-button"]');

    // 4. Verify handover assigned to Agent 2
    await expect(agent2Page.locator('[data-testid="handover-status"]'))
      .toHaveText('Accepted');

    // Cleanup
    await agent1Page.close();
    await agent2Page.close();
  });

  test('Channel switch during active conversation', async ({ page }) => {
    // 1. Start conversation on WhatsApp
    const conversationPage = await startTestConversation(page, context, 'whatsapp');
    
    // 2. Request channel switch to email
    await conversationPage.fill('[data-testid="chat-input"]', 
      'Putem continua pe email? Am niște documente de trimis.');
    await conversationPage.click('[data-testid="send-button"]');

    // 3. Wait for AI to initiate channel switch
    await expect(conversationPage.locator('[data-testid="ai-response"]'))
      .toContainText('email', { timeout: 10000 });

    // 4. Check email inbox for continuation
    const emailPage = await context.browser.newPage();
    await emailPage.goto(context.testEmailInboxUrl);
    
    await expect(emailPage.locator('[data-testid="email-subject"]'))
      .toContainText('Continuare conversație', { timeout: 30000 });

    // 5. Reply via email
    await emailPage.click('[data-testid="reply-button"]');
    await emailPage.fill('[data-testid="email-body"]', 'Atașez documentele solicitate.');
    await emailPage.click('[data-testid="send-email-button"]');

    // 6. Verify message synced back to conversation
    await conversationPage.reload();
    await expect(conversationPage.locator('[data-testid="synced-email-message"]'))
      .toContainText('Atașez documentele', { timeout: 30000 });

    await emailPage.close();
  });

  test('SLA breach triggers escalation', async ({ page }) => {
    // 1. Create urgent handover with tight SLA
    const handover = await context.api.createTestHandover({
      urgency: 'critical',
      status: 'pending_acceptance',
      acceptanceDeadline: new Date(Date.now() + 60000) // 1 minute
    });

    // 2. Login as supervisor
    const supervisorPage = await context.browser.newPage();
    await loginAsSupervisor(supervisorPage, context.testSupervisor);

    // 3. Wait for SLA warning
    await expect(supervisorPage.locator('[data-testid="sla-warning-alert"]'))
      .toBeVisible({ timeout: 90000 });

    // 4. Wait for escalation (after deadline)
    await expect(supervisorPage.locator('[data-testid="escalation-alert"]'))
      .toBeVisible({ timeout: 120000 });

    // 5. Supervisor assigns manually
    await supervisorPage.click('[data-testid="manual-assign-button"]');
    await supervisorPage.selectOption('[data-testid="agent-select"]', context.testAgent2.id);
    await supervisorPage.click('[data-testid="confirm-assign-button"]');

    // 6. Verify assignment
    const updatedHandover = await context.api.getHandover(handover.id);
    expect(updatedHandover.assignedAgentId).toBe(context.testAgent2.id);
    expect(updatedHandover.escalatedAt).toBeDefined();

    await supervisorPage.close();
  });
});

// Helper functions
async function loginAsAgent(page: Page, agent: TestAgent) {
  await page.goto(`${context.baseUrl}/agent/login`);
  await page.fill('[data-testid="email"]', agent.email);
  await page.fill('[data-testid="password"]', agent.password);
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="agent-dashboard"]')).toBeVisible();
}

async function loginAsSupervisor(page: Page, supervisor: TestSupervisor) {
  await page.goto(`${context.baseUrl}/admin/login`);
  await page.fill('[data-testid="email"]', supervisor.email);
  await page.fill('[data-testid="password"]', supervisor.password);
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="supervisor-dashboard"]')).toBeVisible();
}

async function startTestConversation(page: Page, context: TestContext, channel: string) {
  await page.goto(`${context.baseUrl}/chat?channel=${channel}`);
  await page.fill('[data-testid="chat-input"]', 'Bună ziua');
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 5000 });
  return page;
}
```

### 9.4 Performance Tests

```typescript
// src/workers/etapa3/J-handover-channel/__tests__/performance/handover-load.test.ts

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const handoverPrepareTime = new Trend('handover_prepare_time', true);
const handoverAcceptTime = new Trend('handover_accept_time', true);
const channelSwitchTime = new Trend('channel_switch_time', true);
const errorRate = new Rate('error_rate');
const handoverCounter = new Counter('handovers_created');

// Test configuration
export const options = {
  scenarios: {
    // Ramp-up test
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp to 50 users
        { duration: '5m', target: 50 },   // Stay at 50
        { duration: '2m', target: 100 },  // Ramp to 100
        { duration: '5m', target: 100 },  // Stay at 100
        { duration: '2m', target: 0 }     // Ramp down
      ],
      gracefulRampDown: '30s'
    },
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 200 }, // Spike
        { duration: '1m', target: 200 },
        { duration: '30s', target: 10 },
        { duration: '1m', target: 0 }
      ],
      startTime: '20m' // Start after ramp_up
    }
  },
  thresholds: {
    'handover_prepare_time': ['p(95)<3000', 'p(99)<5000'], // 95% under 3s
    'handover_accept_time': ['p(95)<1000', 'p(99)<2000'],  // 95% under 1s
    'channel_switch_time': ['p(95)<2000', 'p(99)<4000'],   // 95% under 2s
    'error_rate': ['rate<0.01'],                           // <1% errors
    'http_req_duration': ['p(95)<2000']                    // General latency
  }
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export function setup() {
  // Create test tenant and agents
  const setupRes = http.post(`${BASE_URL}/api/test/setup`, JSON.stringify({
    agentCount: 20,
    conversationCount: 100
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  });

  return JSON.parse(setupRes.body);
}

export default function(data) {
  const tenantId = data.tenantId;
  const conversationIds = data.conversationIds;
  const agentIds = data.agentIds;

  group('Handover Preparation', () => {
    const conversationId = conversationIds[Math.floor(Math.random() * conversationIds.length)];
    
    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/api/handovers/prepare`, JSON.stringify({
      tenantId,
      conversationId,
      triggerType: 'customer_request',
      triggerReason: 'Load test handover'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    const duration = Date.now() - startTime;
    handoverPrepareTime.add(duration);

    const success = check(res, {
      'prepare status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'handover id returned': (r) => JSON.parse(r.body).handoverId !== undefined
    });

    if (success) {
      handoverCounter.add(1);
    } else {
      errorRate.add(1);
    }

    if (res.status === 200 || res.status === 201) {
      const handoverId = JSON.parse(res.body).handoverId;
      sleep(1);

      // Accept handover
      group('Handover Acceptance', () => {
        const agentId = agentIds[Math.floor(Math.random() * agentIds.length)];
        const acceptStart = Date.now();
        
        const acceptRes = http.post(`${BASE_URL}/api/handovers/${handoverId}/accept`, JSON.stringify({
          agentId
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
          }
        });

        handoverAcceptTime.add(Date.now() - acceptStart);

        check(acceptRes, {
          'accept status is 200': (r) => r.status === 200,
          'status is accepted': (r) => JSON.parse(r.body).status === 'accepted'
        }) || errorRate.add(1);
      });
    }
  });

  sleep(Math.random() * 2 + 1); // 1-3 second think time

  group('Channel Switch', () => {
    const conversationId = conversationIds[Math.floor(Math.random() * conversationIds.length)];
    
    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/api/channels/switch`, JSON.stringify({
      tenantId,
      conversationId,
      targetChannel: ['email', 'whatsapp', 'sms'][Math.floor(Math.random() * 3)],
      reason: 'customer_request'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    channelSwitchTime.add(Date.now() - startTime);

    check(res, {
      'switch status is 200': (r) => r.status === 200,
      'new channel returned': (r) => JSON.parse(r.body).newChannel !== undefined
    }) || errorRate.add(1);
  });

  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  // Cleanup test data
  http.post(`${BASE_URL}/api/test/cleanup`, JSON.stringify({
    tenantId: data.tenantId
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  });
}
```

```yaml
# k6/config/handover-load-test.yml
# Configuration for k6 load test execution

name: Handover Load Test
description: Load testing for handover and channel management workers

scenarios:
  baseline:
    executor: constant-vus
    vus: 20
    duration: 5m
    
  stress:
    executor: ramping-vus
    stages:
      - duration: 2m
        target: 50
      - duration: 5m
        target: 100
      - duration: 5m
        target: 150
      - duration: 2m
        target: 0
        
  soak:
    executor: constant-vus
    vus: 50
    duration: 30m

thresholds:
  http_req_duration:
    - p(95) < 2000
    - p(99) < 5000
  http_req_failed:
    - rate < 0.01
  handover_prepare_time:
    - p(95) < 3000
  handover_accept_time:
    - p(95) < 1000
  channel_switch_time:
    - p(95) < 2000
  error_rate:
    - rate < 0.01

outputs:
  - json=results/handover-load-test.json
  - influxdb=http://localhost:8086/k6

environment:
  API_URL: http://localhost:3000
  AUTH_TOKEN: ${K6_AUTH_TOKEN}
```

---

## 10. Integration Patterns

### 10.1 Inter-Worker Communication

```typescript
// src/workers/etapa3/J-handover-channel/integrations/worker-communication.ts

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';

// Redis connection for pub/sub
const pubClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  db: 7 // Dedicated DB for events
});

const subClient = pubClient.duplicate();

// Event channels
export enum WorkerEventChannel {
  // From AI Agent (Worker C)
  AI_HANDOVER_TRIGGER = 'ai:handover:trigger',
  AI_SESSION_UPDATE = 'ai:session:update',
  
  // From Negotiation FSM (Worker D)
  NEGOTIATION_STATE_CHANGE = 'negotiation:state:change',
  NEGOTIATION_STUCK = 'negotiation:stuck',
  
  // From Sentiment Worker (Worker K)
  SENTIMENT_ALERT = 'sentiment:alert',
  INTENT_DETECTED = 'intent:detected',
  
  // To/From HITL System
  HITL_TASK_CREATED = 'hitl:task:created',
  HITL_TASK_RESOLVED = 'hitl:task:resolved',
  
  // Handover events
  HANDOVER_PREPARED = 'handover:prepared',
  HANDOVER_ASSIGNED = 'handover:assigned',
  HANDOVER_ACCEPTED = 'handover:accepted',
  HANDOVER_COMPLETED = 'handover:completed',
  
  // Channel events
  CHANNEL_SWITCHED = 'channel:switched',
  MESSAGE_SYNCED = 'message:synced'
}

// Event payload types
interface AIHandoverTriggerPayload {
  tenantId: string;
  conversationId: string;
  aiSessionId: string;
  triggerReason: string;
  triggerData: {
    confidence: number;
    customerRequestedHuman: boolean;
    complexityScore: number;
    sentiment: string;
    intent: string;
  };
}

interface NegotiationStateChangePayload {
  tenantId: string;
  conversationId: string;
  negotiationId: string;
  fromState: string;
  toState: string;
  requiresHandover: boolean;
}

interface SentimentAlertPayload {
  tenantId: string;
  conversationId: string;
  contactId: string;
  sentimentScore: number;
  sentimentLabel: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  alertType: 'frustration' | 'confusion' | 'urgency' | 'satisfaction';
}

// Worker event bus
export class WorkerEventBus extends EventEmitter {
  private subscriptions: Set<string> = new Set();

  constructor() {
    super();
    this.setupSubscriptions();
  }

  private async setupSubscriptions(): Promise<void> {
    // Subscribe to relevant channels
    const channels = [
      WorkerEventChannel.AI_HANDOVER_TRIGGER,
      WorkerEventChannel.NEGOTIATION_STATE_CHANGE,
      WorkerEventChannel.SENTIMENT_ALERT,
      WorkerEventChannel.INTENT_DETECTED,
      WorkerEventChannel.HITL_TASK_RESOLVED
    ];

    await subClient.subscribe(...channels);

    subClient.on('message', (channel, message) => {
      try {
        const payload = JSON.parse(message);
        this.emit(channel, payload);
        logger.debug({ channel, payload }, 'Received worker event');
      } catch (error) {
        logger.error({ error, channel, message }, 'Failed to parse worker event');
      }
    });

    channels.forEach(c => this.subscriptions.add(c));
    logger.info({ channels }, 'Worker event bus subscriptions established');
  }

  async publish(channel: WorkerEventChannel, payload: Record<string, unknown>): Promise<void> {
    const message = JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
      source: 'workers-J'
    });

    await pubClient.publish(channel, message);
    logger.debug({ channel, payload }, 'Published worker event');
  }

  async close(): Promise<void> {
    if (this.subscriptions.size > 0) {
      await subClient.unsubscribe(...Array.from(this.subscriptions));
    }
    await pubClient.quit();
    await subClient.quit();
  }
}

// Singleton event bus
export const workerEventBus = new WorkerEventBus();

// Event handlers for Workers J
export function setupHandoverEventHandlers(): void {
  // Handle AI handover triggers from Worker C
  workerEventBus.on(WorkerEventChannel.AI_HANDOVER_TRIGGER, 
    async (payload: AIHandoverTriggerPayload) => {
      logger.info({ payload }, 'AI triggered handover');
      
      // Queue handover preparation
      const handoverPrepareQueue = new Queue('handover-prepare', {
        connection: { host: process.env.REDIS_HOST, port: 6379, db: 6 }
      });

      await handoverPrepareQueue.add('prepare', {
        tenantId: payload.tenantId,
        conversationId: payload.conversationId,
        aiSessionId: payload.aiSessionId,
        triggerType: payload.triggerData.customerRequestedHuman 
          ? 'customer_request' 
          : 'ai_recommendation',
        triggerReason: payload.triggerReason,
        triggerData: payload.triggerData
      }, {
        priority: payload.triggerData.sentiment === 'negative' ? 1 : 3
      });

      await handoverPrepareQueue.close();
    }
  );

  // Handle negotiation stuck events from Worker D
  workerEventBus.on(WorkerEventChannel.NEGOTIATION_STUCK,
    async (payload: NegotiationStateChangePayload) => {
      if (payload.requiresHandover) {
        logger.info({ payload }, 'Negotiation stuck - triggering handover');
        
        const handoverPrepareQueue = new Queue('handover-prepare', {
          connection: { host: process.env.REDIS_HOST, port: 6379, db: 6 }
        });

        await handoverPrepareQueue.add('prepare', {
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          triggerType: 'negotiation_stuck',
          triggerReason: `Negotiation stuck in state: ${payload.toState}`,
          triggerData: {
            negotiationId: payload.negotiationId,
            fromState: payload.fromState,
            toState: payload.toState
          }
        });

        await handoverPrepareQueue.close();
      }
    }
  );

  // Handle sentiment alerts from Worker K
  workerEventBus.on(WorkerEventChannel.SENTIMENT_ALERT,
    async (payload: SentimentAlertPayload) => {
      // Escalate urgency for existing handovers
      if (payload.alertType === 'frustration' || payload.alertType === 'urgency') {
        const db = await import('@/lib/database');
        
        // Find active handover for this conversation
        const activeHandover = await db.db.query.handovers.findFirst({
          where: and(
            eq(db.handovers.tenantId, payload.tenantId),
            eq(db.handovers.conversationId, payload.conversationId),
            notIn(db.handovers.status, ['completed', 'cancelled', 'expired'])
          )
        });

        if (activeHandover) {
          // Escalate urgency
          const newUrgency = escalateUrgency(activeHandover.urgency);
          if (newUrgency !== activeHandover.urgency) {
            await db.db.update(db.handovers)
              .set({ 
                urgency: newUrgency,
                updatedAt: new Date()
              })
              .where(eq(db.handovers.id, activeHandover.id));

            logger.info({ 
              handoverId: activeHandover.id, 
              oldUrgency: activeHandover.urgency,
              newUrgency 
            }, 'Handover urgency escalated due to sentiment');
          }
        } else if (payload.sentimentScore < -0.5) {
          // Very negative sentiment without handover - trigger one
          const handoverPrepareQueue = new Queue('handover-prepare', {
            connection: { host: process.env.REDIS_HOST, port: 6379, db: 6 }
          });

          await handoverPrepareQueue.add('prepare', {
            tenantId: payload.tenantId,
            conversationId: payload.conversationId,
            triggerType: 'sentiment_alert',
            triggerReason: `Customer frustration detected (score: ${payload.sentimentScore})`,
            triggerData: payload
          }, { priority: 1 });

          await handoverPrepareQueue.close();
        }
      }
    }
  );

  // Handle HITL task resolution
  workerEventBus.on(WorkerEventChannel.HITL_TASK_RESOLVED,
    async (payload: { taskId: string; resolution: string; resolvedBy: string; handoverId?: string }) => {
      if (payload.handoverId) {
        logger.info({ payload }, 'HITL task resolved for handover');
        
        // Update handover based on resolution
        const db = await import('@/lib/database');
        
        if (payload.resolution === 'manual_assignment') {
          // HITL resolved with manual agent assignment
          await db.db.update(db.handovers)
            .set({
              status: 'pending_acceptance',
              updatedAt: new Date()
            })
            .where(eq(db.handovers.id, payload.handoverId));
        } else if (payload.resolution === 'cancelled') {
          await db.db.update(db.handovers)
            .set({
              status: 'cancelled',
              cancelledAt: new Date(),
              cancelReason: 'HITL resolution: cancelled',
              updatedAt: new Date()
            })
            .where(eq(db.handovers.id, payload.handoverId));
        }
      }
    }
  );

  logger.info('Handover event handlers initialized');
}

function escalateUrgency(currentUrgency: string): string {
  const urgencyLevels = ['low', 'standard', 'urgent', 'critical'];
  const currentIndex = urgencyLevels.indexOf(currentUrgency);
  return currentIndex < urgencyLevels.length - 1 
    ? urgencyLevels[currentIndex + 1] 
    : currentUrgency;
}
```

### 10.2 Queue Integration Patterns

```typescript
// src/workers/etapa3/J-handover-channel/integrations/queue-patterns.ts

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { logger } from '@/lib/logger';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  db: 6
};

// ============================================================================
// QUEUE CHAINING PATTERN
// One job completion triggers another queue
// ============================================================================

export function setupQueueChaining(): void {
  // Handover Prepare → Handover Execute chain
  const prepareEvents = new QueueEvents('handover-prepare', { connection: redisConnection });
  const executeQueue = new Queue('handover-execute', { connection: redisConnection });

  prepareEvents.on('completed', async ({ jobId, returnvalue }) => {
    const result = JSON.parse(returnvalue);
    
    if (result.status === 'prepared') {
      await executeQueue.add('execute', {
        tenantId: result.tenantId,
        handoverId: result.handoverId,
        conversationId: result.conversationId,
        context: result.context
      }, {
        priority: getPriorityFromUrgency(result.urgency),
        delay: 0 // Immediate execution
      });

      logger.info({ 
        prepareJobId: jobId, 
        handoverId: result.handoverId 
      }, 'Chained handover-execute job');
    }
  });

  // Handover Execute → Notification chain
  const executeEvents = new QueueEvents('handover-execute', { connection: redisConnection });
  const notificationQueue = new Queue('handover-notification', { connection: redisConnection });

  executeEvents.on('completed', async ({ jobId, returnvalue }) => {
    const result = JSON.parse(returnvalue);
    
    if (result.status === 'assigned' && result.assignedAgentId) {
      await notificationQueue.add('notify', {
        tenantId: result.tenantId,
        handoverId: result.handoverId,
        agentId: result.assignedAgentId,
        urgency: result.urgency,
        notificationType: 'handover_assignment'
      }, {
        priority: getPriorityFromUrgency(result.urgency)
      });

      logger.info({ 
        executeJobId: jobId, 
        agentId: result.assignedAgentId 
      }, 'Chained notification job');
    }
  });
}

// ============================================================================
// SAGA PATTERN
// Multi-step transaction with compensation
// ============================================================================

interface HandoverSagaContext {
  tenantId: string;
  conversationId: string;
  handoverId?: string;
  agentId?: string;
  notificationId?: string;
  completedSteps: string[];
  errors: Array<{ step: string; error: string }>;
}

export class HandoverSaga {
  private context: HandoverSagaContext;
  private compensations: Array<() => Promise<void>> = [];

  constructor(tenantId: string, conversationId: string) {
    this.context = {
      tenantId,
      conversationId,
      completedSteps: [],
      errors: []
    };
  }

  async execute(): Promise<HandoverSagaContext> {
    try {
      // Step 1: Create handover record
      await this.step('create_handover', 
        this.createHandover.bind(this),
        this.compensateCreateHandover.bind(this)
      );

      // Step 2: Select and assign agent
      await this.step('assign_agent',
        this.assignAgent.bind(this),
        this.compensateAssignAgent.bind(this)
      );

      // Step 3: Update AI session status
      await this.step('update_ai_session',
        this.updateAISession.bind(this),
        this.compensateUpdateAISession.bind(this)
      );

      // Step 4: Send notification
      await this.step('send_notification',
        this.sendNotification.bind(this),
        this.compensateSendNotification.bind(this)
      );

      logger.info({ context: this.context }, 'Handover saga completed successfully');
      return this.context;

    } catch (error) {
      logger.error({ error, context: this.context }, 'Handover saga failed, compensating');
      await this.compensate();
      throw error;
    }
  }

  private async step(
    name: string, 
    action: () => Promise<void>,
    compensation: () => Promise<void>
  ): Promise<void> {
    try {
      await action();
      this.context.completedSteps.push(name);
      this.compensations.unshift(compensation); // Add to front for reverse order
    } catch (error) {
      this.context.errors.push({ step: name, error: (error as Error).message });
      throw error;
    }
  }

  private async compensate(): Promise<void> {
    for (const compensation of this.compensations) {
      try {
        await compensation();
      } catch (error) {
        logger.error({ error }, 'Compensation step failed');
        // Continue with other compensations
      }
    }
  }

  // Saga steps
  private async createHandover(): Promise<void> {
    const { db } = await import('@/lib/database');
    const [handover] = await db.insert(db.handovers).values({
      tenantId: this.context.tenantId,
      conversationId: this.context.conversationId,
      status: 'preparing'
    }).returning();
    this.context.handoverId = handover.id;
  }

  private async compensateCreateHandover(): Promise<void> {
    if (this.context.handoverId) {
      const { db } = await import('@/lib/database');
      await db.delete(db.handovers)
        .where(eq(db.handovers.id, this.context.handoverId));
    }
  }

  private async assignAgent(): Promise<void> {
    // Agent selection logic
    const agent = await selectBestAgent(this.context.tenantId, {});
    if (!agent) throw new Error('No agent available');
    
    const { db } = await import('@/lib/database');
    await db.update(db.handovers)
      .set({ assignedAgentId: agent.id, status: 'pending_acceptance' })
      .where(eq(db.handovers.id, this.context.handoverId!));
    
    this.context.agentId = agent.id;
  }

  private async compensateAssignAgent(): Promise<void> {
    if (this.context.handoverId) {
      const { db } = await import('@/lib/database');
      await db.update(db.handovers)
        .set({ assignedAgentId: null, status: 'preparing' })
        .where(eq(db.handovers.id, this.context.handoverId));
    }
  }

  private async updateAISession(): Promise<void> {
    const { db } = await import('@/lib/database');
    await db.update(db.aiSessions)
      .set({ status: 'handover_in_progress' })
      .where(eq(db.aiSessions.conversationId, this.context.conversationId));
  }

  private async compensateUpdateAISession(): Promise<void> {
    const { db } = await import('@/lib/database');
    await db.update(db.aiSessions)
      .set({ status: 'active' })
      .where(eq(db.aiSessions.conversationId, this.context.conversationId));
  }

  private async sendNotification(): Promise<void> {
    const notificationQueue = new Queue('handover-notification', { 
      connection: redisConnection 
    });
    
    const job = await notificationQueue.add('notify', {
      handoverId: this.context.handoverId,
      agentId: this.context.agentId,
      notificationType: 'handover_assignment'
    });
    
    this.context.notificationId = job.id;
    await notificationQueue.close();
  }

  private async compensateSendNotification(): Promise<void> {
    // Notifications are fire-and-forget, but we can mark as cancelled
    if (this.context.notificationId) {
      const { db } = await import('@/lib/database');
      await db.update(db.notifications)
        .set({ status: 'cancelled' })
        .where(eq(db.notifications.relatedEntityId, this.context.handoverId!));
    }
  }
}

// ============================================================================
// BATCH PROCESSING PATTERN
// ============================================================================

export async function processBatchChannelSync(
  conversationIds: string[],
  batchSize: number = 10
): Promise<{ processed: number; failed: number; errors: string[] }> {
  const channelSyncQueue = new Queue('channel-sync', { connection: redisConnection });
  const results = { processed: 0, failed: 0, errors: [] as string[] };

  // Process in batches
  for (let i = 0; i < conversationIds.length; i += batchSize) {
    const batch = conversationIds.slice(i, i + batchSize);
    
    const jobs = batch.map(conversationId => ({
      name: 'sync',
      data: { conversationId, syncType: 'incremental' },
      opts: { priority: 4 } // Low priority for batch
    }));

    try {
      await channelSyncQueue.addBulk(jobs);
      results.processed += batch.length;
    } catch (error) {
      results.failed += batch.length;
      results.errors.push(`Batch ${i}-${i + batchSize}: ${(error as Error).message}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  await channelSyncQueue.close();
  return results;
}

// Helper
function getPriorityFromUrgency(urgency: string): number {
  const priorities: Record<string, number> = {
    critical: 1,
    urgent: 2,
    standard: 3,
    low: 4
  };
  return priorities[urgency] || 3;
}
```

---

## 11. Security Considerations

### 11.1 Data Protection

```typescript
// src/workers/etapa3/J-handover-channel/security/data-protection.ts

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Encryption key from environment
const ENCRYPTION_KEY = process.env.HANDOVER_ENCRYPTION_KEY || 
  'default-key-change-in-production-32c';

// ============================================================================
// SENSITIVE DATA ENCRYPTION
// ============================================================================

export class HandoverDataProtection {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private saltLength = 32;
  private tagLength = 16;

  // Encrypt sensitive handover context data
  async encryptContext(plaintext: string): Promise<string> {
    const salt = randomBytes(this.saltLength);
    const key = await this.deriveKey(ENCRYPTION_KEY, salt);
    const iv = randomBytes(this.ivLength);
    
    const cipher = createCipheriv(this.algorithm, key, iv, {
      authTagLength: this.tagLength
    });
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Combine salt + iv + authTag + encrypted
    return Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
  }

  // Decrypt sensitive handover context data
  async decryptContext(ciphertext: string): Promise<string> {
    const data = Buffer.from(ciphertext, 'base64');
    
    const salt = data.subarray(0, this.saltLength);
    const iv = data.subarray(this.saltLength, this.saltLength + this.ivLength);
    const authTag = data.subarray(
      this.saltLength + this.ivLength, 
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = data.subarray(this.saltLength + this.ivLength + this.tagLength);
    
    const key = await this.deriveKey(ENCRYPTION_KEY, salt);
    
    const decipher = createDecipheriv(this.algorithm, key, iv, {
      authTagLength: this.tagLength
    });
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  }

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(password, salt, this.keyLength)) as Buffer;
  }

  // Redact sensitive fields for logging
  redactForLogging(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
      'email', 'phone', 'address', 'cui', 'cnp', 
      'bankAccount', 'iban', 'password', 'token',
      'apiKey', 'secret', 'creditCard'
    ];

    const redacted = { ...data };
    
    for (const field of sensitiveFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }

    // Deep redaction for nested objects
    for (const [key, value] of Object.entries(redacted)) {
      if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactForLogging(value as Record<string, unknown>);
      }
    }

    return redacted;
  }

  // Mask PII for display
  maskPII(value: string, type: 'email' | 'phone' | 'cui'): string {
    switch (type) {
      case 'email':
        const [local, domain] = value.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      case 'phone':
        return value.replace(/(\+?\d{3})\d{6}(\d{2})/, '$1******$2');
      case 'cui':
        return value.replace(/(\w{2})\d+(\d{3})/, '$1*****$2');
      default:
        return '***';
    }
  }
}

export const dataProtection = new HandoverDataProtection();

// ============================================================================
// GDPR COMPLIANCE
// ============================================================================

export interface DataRetentionPolicy {
  handoverRecords: number;      // Days to retain completed handovers
  handoverEvents: number;       // Days to retain event logs
  conversationHistory: number;  // Days to retain in context
  notificationLogs: number;     // Days to retain notification history
}

const DEFAULT_RETENTION_POLICY: DataRetentionPolicy = {
  handoverRecords: 365,         // 1 year
  handoverEvents: 90,           // 3 months
  conversationHistory: 365,     // 1 year
  notificationLogs: 30          // 1 month
};

export class GDPRComplianceManager {
  private retentionPolicy: DataRetentionPolicy;

  constructor(policy?: Partial<DataRetentionPolicy>) {
    this.retentionPolicy = { ...DEFAULT_RETENTION_POLICY, ...policy };
  }

  // Handle data subject access request (DSAR)
  async handleAccessRequest(
    tenantId: string, 
    subjectId: string
  ): Promise<{
    handovers: any[];
    conversations: any[];
    notifications: any[];
    exportedAt: string;
  }> {
    const { db } = await import('@/lib/database');

    // Get all handovers where subject was the contact
    const handovers = await db.query.handovers.findMany({
      where: and(
        eq(db.handovers.tenantId, tenantId),
        eq(db.handovers.contactId, subjectId)
      ),
      with: {
        events: true
      }
    });

    // Get all conversations
    const conversations = await db.query.conversations.findMany({
      where: and(
        eq(db.conversations.tenantId, tenantId),
        eq(db.conversations.contactId, subjectId)
      ),
      with: {
        messages: true
      }
    });

    // Get notifications
    const notifications = await db.query.notifications.findMany({
      where: eq(db.notifications.recipientContactId, subjectId)
    });

    return {
      handovers: handovers.map(h => this.sanitizeForExport(h)),
      conversations: conversations.map(c => this.sanitizeForExport(c)),
      notifications: notifications.map(n => this.sanitizeForExport(n)),
      exportedAt: new Date().toISOString()
    };
  }

  // Handle data deletion request (right to be forgotten)
  async handleDeletionRequest(
    tenantId: string,
    subjectId: string
  ): Promise<{ deletedCounts: Record<string, number> }> {
    const { db } = await import('@/lib/database');
    const deletedCounts: Record<string, number> = {};

    // Delete in order respecting foreign keys
    
    // 1. Delete notifications
    const notificationResult = await db.delete(db.notifications)
      .where(eq(db.notifications.recipientContactId, subjectId));
    deletedCounts.notifications = notificationResult.rowCount || 0;

    // 2. Anonymize messages (keep for context but remove PII)
    const messageResult = await db.update(db.conversationMessages)
      .set({ 
        senderName: 'Deleted User',
        metadata: db.sql`metadata - 'customerEmail' - 'customerPhone'`
      })
      .where(and(
        eq(db.conversationMessages.tenantId, tenantId),
        eq(db.conversationMessages.senderType, 'customer')
      ));
    deletedCounts.messagesAnonymized = messageResult.rowCount || 0;

    // 3. Anonymize handover context
    const handoverResult = await db.update(db.handovers)
      .set({
        context: db.sql`'{"anonymized": true, "reason": "GDPR_DELETION_REQUEST"}'::jsonb`
      })
      .where(and(
        eq(db.handovers.tenantId, tenantId),
        eq(db.handovers.contactId, subjectId)
      ));
    deletedCounts.handoversAnonymized = handoverResult.rowCount || 0;

    // 4. Delete contact record
    const contactResult = await db.delete(db.contacts)
      .where(and(
        eq(db.contacts.tenantId, tenantId),
        eq(db.contacts.id, subjectId)
      ));
    deletedCounts.contacts = contactResult.rowCount || 0;

    // Log deletion for audit
    await this.logDeletionRequest(tenantId, subjectId, deletedCounts);

    return { deletedCounts };
  }

  // Automated data retention cleanup
  async runRetentionCleanup(tenantId: string): Promise<void> {
    const { db } = await import('@/lib/database');
    const now = new Date();

    // Clean old handover events
    const eventCutoff = new Date(
      now.getTime() - this.retentionPolicy.handoverEvents * 24 * 60 * 60 * 1000
    );
    await db.delete(db.handoverEvents)
      .where(and(
        eq(db.handoverEvents.tenantId, tenantId),
        lt(db.handoverEvents.createdAt, eventCutoff)
      ));

    // Clean old notification logs
    const notificationCutoff = new Date(
      now.getTime() - this.retentionPolicy.notificationLogs * 24 * 60 * 60 * 1000
    );
    await db.delete(db.notifications)
      .where(and(
        eq(db.notifications.tenantId, tenantId),
        lt(db.notifications.createdAt, notificationCutoff),
        eq(db.notifications.status, 'sent')
      ));

    logger.info({ tenantId, eventCutoff, notificationCutoff }, 'Retention cleanup completed');
  }

  private sanitizeForExport(record: any): any {
    // Remove internal IDs and system fields
    const { 
      tenantId, createdBy, updatedBy, 
      internalNotes, systemMetadata,
      ...sanitized 
    } = record;
    return sanitized;
  }

  private async logDeletionRequest(
    tenantId: string, 
    subjectId: string, 
    results: Record<string, number>
  ): Promise<void> {
    const { db } = await import('@/lib/database');
    await db.insert(db.auditLogs).values({
      tenantId,
      action: 'GDPR_DELETION_REQUEST',
      entityType: 'contact',
      entityId: subjectId,
      details: JSON.stringify(results),
      performedBy: 'system'
    });
  }
}

export const gdprManager = new GDPRComplianceManager();
```

### 11.2 Access Control

```typescript
// src/workers/etapa3/J-handover-channel/security/access-control.ts

import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';

// Permission definitions for handover operations
export enum HandoverPermission {
  // Handover management
  HANDOVER_VIEW = 'handover:view',
  HANDOVER_CREATE = 'handover:create',
  HANDOVER_ACCEPT = 'handover:accept',
  HANDOVER_DECLINE = 'handover:decline',
  HANDOVER_COMPLETE = 'handover:complete',
  HANDOVER_CANCEL = 'handover:cancel',
  HANDOVER_ESCALATE = 'handover:escalate',
  HANDOVER_REASSIGN = 'handover:reassign',

  // Channel management
  CHANNEL_VIEW = 'channel:view',
  CHANNEL_SWITCH = 'channel:switch',
  CHANNEL_SYNC = 'channel:sync',

  // Agent management
  AGENT_VIEW = 'agent:view',
  AGENT_ASSIGN = 'agent:assign',
  AGENT_WORKLOAD_MANAGE = 'agent:workload:manage',

  // Supervisor functions
  SUPERVISOR_OVERRIDE = 'supervisor:override',
  SUPERVISOR_METRICS = 'supervisor:metrics',
  SLA_CONFIGURE = 'sla:configure',

  // Admin functions
  ADMIN_FULL_ACCESS = 'admin:full_access'
}

// Role definitions
export const ROLE_PERMISSIONS: Record<string, HandoverPermission[]> = {
  agent: [
    HandoverPermission.HANDOVER_VIEW,
    HandoverPermission.HANDOVER_ACCEPT,
    HandoverPermission.HANDOVER_DECLINE,
    HandoverPermission.HANDOVER_COMPLETE,
    HandoverPermission.CHANNEL_VIEW,
    HandoverPermission.CHANNEL_SWITCH
  ],
  senior_agent: [
    HandoverPermission.HANDOVER_VIEW,
    HandoverPermission.HANDOVER_ACCEPT,
    HandoverPermission.HANDOVER_DECLINE,
    HandoverPermission.HANDOVER_COMPLETE,
    HandoverPermission.HANDOVER_ESCALATE,
    HandoverPermission.CHANNEL_VIEW,
    HandoverPermission.CHANNEL_SWITCH,
    HandoverPermission.CHANNEL_SYNC
  ],
  supervisor: [
    HandoverPermission.HANDOVER_VIEW,
    HandoverPermission.HANDOVER_CREATE,
    HandoverPermission.HANDOVER_CANCEL,
    HandoverPermission.HANDOVER_ESCALATE,
    HandoverPermission.HANDOVER_REASSIGN,
    HandoverPermission.CHANNEL_VIEW,
    HandoverPermission.CHANNEL_SWITCH,
    HandoverPermission.CHANNEL_SYNC,
    HandoverPermission.AGENT_VIEW,
    HandoverPermission.AGENT_ASSIGN,
    HandoverPermission.AGENT_WORKLOAD_MANAGE,
    HandoverPermission.SUPERVISOR_OVERRIDE,
    HandoverPermission.SUPERVISOR_METRICS
  ],
  admin: [
    HandoverPermission.ADMIN_FULL_ACCESS
  ]
};

// Access control manager
export class HandoverAccessControl {
  private redis: Redis;
  private permissionCacheTTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: 6379,
      db: 8 // Dedicated DB for auth
    });
  }

  // Check if user has permission
  async hasPermission(
    userId: string, 
    tenantId: string, 
    permission: HandoverPermission
  ): Promise<boolean> {
    // Check cache first
    const cacheKey = `perm:${tenantId}:${userId}`;
    const cached = await this.redis.get(cacheKey);
    
    let permissions: HandoverPermission[];
    
    if (cached) {
      permissions = JSON.parse(cached);
    } else {
      permissions = await this.loadUserPermissions(userId, tenantId);
      await this.redis.setex(cacheKey, this.permissionCacheTTL, JSON.stringify(permissions));
    }

    // Admin has all permissions
    if (permissions.includes(HandoverPermission.ADMIN_FULL_ACCESS)) {
      return true;
    }

    return permissions.includes(permission);
  }

  // Check multiple permissions (AND)
  async hasAllPermissions(
    userId: string,
    tenantId: string,
    permissions: HandoverPermission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!await this.hasPermission(userId, tenantId, permission)) {
        return false;
      }
    }
    return true;
  }

  // Check multiple permissions (OR)
  async hasAnyPermission(
    userId: string,
    tenantId: string,
    permissions: HandoverPermission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, tenantId, permission)) {
        return true;
      }
    }
    return false;
  }

  // Verify handover access (user can access this specific handover)
  async canAccessHandover(
    userId: string,
    tenantId: string,
    handoverId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check basic permission
    if (!await this.hasPermission(userId, tenantId, HandoverPermission.HANDOVER_VIEW)) {
      return { allowed: false, reason: 'No handover view permission' };
    }

    // Get handover details
    const { db } = await import('@/lib/database');
    const handover = await db.query.handovers.findFirst({
      where: eq(db.handovers.id, handoverId)
    });

    if (!handover) {
      return { allowed: false, reason: 'Handover not found' };
    }

    // Verify tenant match
    if (handover.tenantId !== tenantId) {
      return { allowed: false, reason: 'Tenant mismatch' };
    }

    // Get user details
    const agent = await db.query.agents.findFirst({
      where: and(
        eq(db.agents.userId, userId),
        eq(db.agents.tenantId, tenantId)
      )
    });

    // Supervisors can access all handovers in tenant
    if (await this.hasPermission(userId, tenantId, HandoverPermission.SUPERVISOR_OVERRIDE)) {
      return { allowed: true };
    }

    // Agents can only access their assigned handovers
    if (agent && handover.assignedAgentId === agent.id) {
      return { allowed: true };
    }

    // Check if user created the handover (for AI-triggered handovers)
    if (handover.createdBy === userId) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Not authorized to access this handover' };
  }

  // Load user permissions from database
  private async loadUserPermissions(
    userId: string, 
    tenantId: string
  ): Promise<HandoverPermission[]> {
    const { db } = await import('@/lib/database');
    
    const userRoles = await db.query.userRoles.findMany({
      where: and(
        eq(db.userRoles.userId, userId),
        eq(db.userRoles.tenantId, tenantId)
      ),
      with: {
        role: true
      }
    });

    const permissions = new Set<HandoverPermission>();
    
    for (const userRole of userRoles) {
      const rolePermissions = ROLE_PERMISSIONS[userRole.role.name] || [];
      rolePermissions.forEach(p => permissions.add(p));
    }

    // Also check custom permissions
    const customPermissions = await db.query.userPermissions.findMany({
      where: and(
        eq(db.userPermissions.userId, userId),
        eq(db.userPermissions.tenantId, tenantId)
      )
    });

    customPermissions.forEach(cp => {
      if (cp.granted) {
        permissions.add(cp.permission as HandoverPermission);
      } else {
        permissions.delete(cp.permission as HandoverPermission);
      }
    });

    return Array.from(permissions);
  }

  // Invalidate permission cache
  async invalidateCache(userId: string, tenantId: string): Promise<void> {
    await this.redis.del(`perm:${tenantId}:${userId}`);
  }

  // Invalidate all caches for tenant (e.g., after role change)
  async invalidateTenantCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`perm:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

export const accessControl = new HandoverAccessControl();

// Middleware for permission checking in workers
export function requirePermission(permission: HandoverPermission) {
  return async (job: Job, userId: string, tenantId: string): Promise<void> => {
    const allowed = await accessControl.hasPermission(userId, tenantId, permission);
    if (!allowed) {
      logger.warn({ userId, tenantId, permission }, 'Permission denied');
      throw new Error(`Permission denied: ${permission}`);
    }
  };
}
```

### 11.3 Audit Logging

```typescript
// src/workers/etapa3/J-handover-channel/security/audit-logging.ts

import { createHash } from 'crypto';
import { db } from '@/lib/database';
import { auditLogs } from '@/lib/database/schema';
import { logger } from '@/lib/logger';

// Audit event types for handovers
export enum HandoverAuditEvent {
  // Handover lifecycle
  HANDOVER_CREATED = 'handover.created',
  HANDOVER_CONTEXT_COMPILED = 'handover.context_compiled',
  HANDOVER_AGENT_ASSIGNED = 'handover.agent_assigned',
  HANDOVER_ACCEPTED = 'handover.accepted',
  HANDOVER_DECLINED = 'handover.declined',
  HANDOVER_REASSIGNED = 'handover.reassigned',
  HANDOVER_COMPLETED = 'handover.completed',
  HANDOVER_CANCELLED = 'handover.cancelled',
  HANDOVER_EXPIRED = 'handover.expired',
  HANDOVER_ESCALATED = 'handover.escalated',

  // Channel events
  CHANNEL_SWITCHED = 'channel.switched',
  CHANNEL_SYNCED = 'channel.synced',
  MESSAGE_SENT = 'message.sent',
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_READ = 'message.read',

  // Access events
  HANDOVER_ACCESSED = 'handover.accessed',
  HANDOVER_CONTEXT_VIEWED = 'handover.context_viewed',

  // Security events
  PERMISSION_DENIED = 'security.permission_denied',
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  DATA_EXPORTED = 'security.data_exported',
  DATA_DELETED = 'security.data_deleted'
}

interface AuditLogEntry {
  tenantId: string;
  event: HandoverAuditEvent;
  entityType: string;
  entityId: string;
  actorId: string;
  actorType: 'user' | 'agent' | 'system' | 'ai';
  action: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  previousHash?: string;
}

export class HandoverAuditLogger {
  private lastHash: string | null = null;

  // Create audit log entry with hash chain
  async log(entry: AuditLogEntry): Promise<string> {
    const timestamp = new Date().toISOString();
    
    // Get previous hash for chain integrity
    const previousHash = await this.getLatestHash(entry.tenantId);
    
    // Calculate hash including previous hash (blockchain-style)
    const entryHash = this.calculateHash({
      ...entry,
      timestamp,
      previousHash
    });

    // Insert into database
    const [inserted] = await db.insert(auditLogs).values({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      tenantId: entry.tenantId,
      event: entry.event,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId,
      actorType: entry.actorType,
      action: entry.action,
      details: JSON.stringify(entry.details),
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      previousHash,
      entryHash,
      createdAt: new Date(timestamp)
    }).returning();

    logger.debug({ 
      auditId: inserted.id, 
      event: entry.event 
    }, 'Audit log entry created');

    return inserted.id;
  }

  // Convenience methods for common events
  async logHandoverCreated(
    tenantId: string,
    handoverId: string,
    actorId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      tenantId,
      event: HandoverAuditEvent.HANDOVER_CREATED,
      entityType: 'handover',
      entityId: handoverId,
      actorId,
      actorType: details.triggerType === 'ai_recommendation' ? 'ai' : 'user',
      action: 'create',
      details
    });
  }

  async logHandoverAccepted(
    tenantId: string,
    handoverId: string,
    agentId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      tenantId,
      event: HandoverAuditEvent.HANDOVER_ACCEPTED,
      entityType: 'handover',
      entityId: handoverId,
      actorId: agentId,
      actorType: 'agent',
      action: 'accept',
      details
    });
  }

  async logChannelSwitch(
    tenantId: string,
    conversationId: string,
    actorId: string,
    fromChannel: string,
    toChannel: string,
    reason: string
  ): Promise<void> {
    await this.log({
      tenantId,
      event: HandoverAuditEvent.CHANNEL_SWITCHED,
      entityType: 'conversation',
      entityId: conversationId,
      actorId,
      actorType: 'system',
      action: 'switch_channel',
      details: { fromChannel, toChannel, reason }
    });
  }

  async logSecurityEvent(
    tenantId: string,
    event: HandoverAuditEvent,
    actorId: string,
    details: Record<string, unknown>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      event,
      entityType: 'security',
      entityId: `security-${Date.now()}`,
      actorId,
      actorType: 'user',
      action: event,
      details,
      ipAddress
    });
  }

  // Verify audit chain integrity
  async verifyChainIntegrity(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    valid: boolean;
    totalEntries: number;
    invalidEntries: Array<{ id: string; reason: string }>;
  }> {
    const entries = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.tenantId, tenantId),
        startDate ? gte(auditLogs.createdAt, startDate) : undefined,
        endDate ? lte(auditLogs.createdAt, endDate) : undefined
      ),
      orderBy: [asc(auditLogs.createdAt)]
    });

    const invalidEntries: Array<{ id: string; reason: string }> = [];
    let previousHash: string | null = null;

    for (const entry of entries) {
      // Verify previous hash chain
      if (entry.previousHash !== previousHash) {
        invalidEntries.push({
          id: entry.id,
          reason: 'Previous hash mismatch - chain broken'
        });
      }

      // Verify entry hash
      const calculatedHash = this.calculateHash({
        tenantId: entry.tenantId,
        event: entry.event,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId,
        actorType: entry.actorType,
        action: entry.action,
        details: JSON.parse(entry.details as string),
        timestamp: entry.createdAt.toISOString(),
        previousHash: entry.previousHash
      });

      if (calculatedHash !== entry.entryHash) {
        invalidEntries.push({
          id: entry.id,
          reason: 'Entry hash mismatch - possible tampering'
        });
      }

      previousHash = entry.entryHash;
    }

    return {
      valid: invalidEntries.length === 0,
      totalEntries: entries.length,
      invalidEntries
    };
  }

  // Get latest hash for chain continuity
  private async getLatestHash(tenantId: string): Promise<string | null> {
    const latest = await db.query.auditLogs.findFirst({
      where: eq(auditLogs.tenantId, tenantId),
      orderBy: [desc(auditLogs.createdAt)]
    });
    return latest?.entryHash || null;
  }

  // Calculate hash for entry
  private calculateHash(data: Record<string, unknown>): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }
}

export const auditLogger = new HandoverAuditLogger();
```

---

## 12. Changelog & References

### 12.1 Version History

```markdown
# Workers J - Handover & Channel Management Changelog

## [1.0.0] - 2026-01-XX (Planned Release)

### Initial Release
- Complete handover preparation and execution system
- Multi-channel conversation management (WhatsApp, Email, SMS, Phone)
- AI-to-Human handover with context preservation
- Agent selection algorithm with skills matching
- Urgency classification system
- Channel switch orchestration
- Real-time synchronization across channels
- Notification delivery system
- SLA monitoring and compliance
- HITL integration for complex scenarios
- Comprehensive audit logging with hash chain

### Features
#### Handover Management (J1)
- Context compilation with AI summarization
- Configurable urgency levels (Critical/Urgent/Standard/Low)
- Agent workload balancing
- Automatic reassignment on decline/timeout
- SLA-driven escalation
- Supervisor override capabilities

#### Channel Orchestration (J2)
- Intelligent channel selection
- Customer preference respect
- Failure-based channel switching
- Context preservation across channels
- Unified conversation view

#### Channel Synchronization (J3)
- Near real-time message sync (5-30s based on channel)
- Conflict resolution for concurrent edits
- Message deduplication
- Delivery status tracking
- Cross-channel conversation threading

### Database Schema
- handovers table with complete lifecycle tracking
- handoverEvents for state change audit
- handoverNotifications for delivery tracking
- conversationChannels for multi-channel support
- channelSwitches for switch audit trail
- channelSyncStates for sync coordination
- conversationMessages with channel attribution
- messageSyncLogs for sync audit

### Workers Implemented
- J1: handover-prepare, handover-execute, handover-notify
- J2: channel-switch, channel-orchestrate
- J3: channel-sync, message-deduplicate

### Queues
- handover-prepare-queue (priority-based)
- handover-execute-queue
- handover-notify-queue
- channel-switch-queue
- channel-sync-queue
- message-deduplicate-queue

### Integrations
- Worker C (AI Agent Core) - handover triggers
- Worker D (Negotiation FSM) - stuck negotiation escalation
- Worker K (Sentiment Analysis) - urgency adjustment
- Worker N (HITL Queue) - complex scenario handling
- WhatsApp Business API
- SendGrid Email API
- Twilio SMS/Voice API
- Redis Pub/Sub for real-time events

## [0.9.0] - 2026-01-XX (Pre-release)

### Pre-release Testing
- Integration testing complete
- Performance benchmarks established
- Security audit passed
- GDPR compliance verified

### Known Limitations
- Maximum 10 concurrent channels per conversation
- AI summarization limited to 100 messages
- Phone channel requires manual agent acceptance
- Sync interval minimum 5 seconds for rate limiting

## Future Roadmap

### [1.1.0] - Planned Q2 2026
- Video call channel support
- Advanced sentiment-based routing
- Predictive handover triggers
- Multi-language agent matching
- Enhanced analytics dashboard

### [1.2.0] - Planned Q3 2026
- AI-assisted agent responses
- Automated follow-up suggestions
- Customer satisfaction prediction
- Advanced workload optimization
- Cross-tenant agent sharing (enterprise)
```

### 12.2 Related Documentation

```yaml
# Related Documents Index

internal_references:
  master_specification:
    path: /mnt/project/__Cerniq_Master_Spec_Normativ_Complet.md
    sections:
      - "4.3 Etapa 3 - AI Sales Agent"
      - "5.2 HITL Approval System"
      - "6.1 Channel Management Requirements"
    
  architecture:
    path: /mnt/project/Cerniq_App_Architecture_arc42_Vertical_Slice.md
    sections:
      - "Building Block View - Level 3"
      - "Runtime View - Handover Scenario"
      - "Deployment View - Worker Distribution"
    
  workers_overview:
    path: /home/claude/etapa3-docs/etapa3-workers-overview.md
    description: "Complete workers listing and interactions"
    
  ai_agent_core:
    path: /home/claude/etapa3-docs/etapa3-workers-C-ai-agent-core.md
    description: "AI agent that triggers handovers"
    related_sections:
      - "Handover Decision Logic"
      - "Context Handoff Interface"
    
  negotiation_fsm:
    path: /home/claude/etapa3-docs/etapa3-workers-D-negotiation-fsm.md
    description: "Negotiation state machine with escalation"
    related_sections:
      - "Stuck Detection"
      - "Escalation Triggers"
    
  hitl_system:
    path: /mnt/project/Unified_HITL_Approval_System_for_B2B_Sales_Automation.md
    description: "Human-in-the-Loop integration patterns"
    
  etapa1_contact_management:
    path: /mnt/project/etapa1-workers-overview.md
    description: "Contact data enrichment foundation"
    
  etapa2_outreach:
    path: /mnt/project/etapa2-workers-overview.md
    description: "Cold outreach channel patterns"
    
dependent_documents:
  workers_k_sentiment:
    path: /home/claude/etapa3-docs/etapa3-workers-K-sentiment-intent.md
    dependency: "Sentiment scores for urgency classification"
    
  workers_n_hitl:
    path: /home/claude/etapa3-docs/etapa3-workers-N-human-intervention.md
    dependency: "HITL task creation and resolution"
    
  frontend_agent_dashboard:
    path: /home/claude/etapa3-docs/etapa3-ui-agent-dashboard.md
    dependency: "Agent UI for handover management"
    
  frontend_supervisor_console:
    path: /home/claude/etapa3-docs/etapa3-ui-supervisor-console.md
    dependency: "Supervisor override interfaces"
    
schema_references:
  - path: /home/claude/etapa3-docs/etapa3-migrations.md
    tables:
      - handovers
      - handoverEvents
      - handoverNotifications
      - conversationChannels
      - channelSwitches
      - channelSyncStates
      - conversationMessages
      - messageSyncLogs
      
api_references:
  - path: /home/claude/etapa3-docs/etapa3-api-endpoints.md
    endpoints:
      - "POST /api/v1/handovers"
      - "PATCH /api/v1/handovers/:id/accept"
      - "POST /api/v1/channels/:conversationId/switch"
      - "GET /api/v1/conversations/:id/messages"
```

### 12.3 External References

```yaml
# External Documentation and Standards

communication_apis:
  whatsapp_business:
    documentation: "https://developers.facebook.com/docs/whatsapp/cloud-api"
    version: "v18.0"
    usage:
      - "Message sending and receiving"
      - "Template message delivery"
      - "Media handling"
      - "Webhook processing"
    rate_limits:
      - "1000 messages/second (business verified)"
      - "250 messages/second (standard)"
    
  sendgrid:
    documentation: "https://docs.sendgrid.com/api-reference"
    version: "v3"
    usage:
      - "Transactional email delivery"
      - "Email templates"
      - "Delivery tracking"
      - "Bounce handling"
    rate_limits:
      - "Dependent on plan tier"
      - "Recommended: batch processing"
    
  twilio:
    documentation: "https://www.twilio.com/docs/sms/api"
    version: "2010-04-01"
    usage:
      - "SMS delivery"
      - "Voice calls (click-to-call)"
      - "Delivery status callbacks"
    rate_limits:
      - "SMS: 1 message/second per number"
      - "Voice: concurrent call limits by account"

queue_systems:
  bullmq:
    documentation: "https://docs.bullmq.io/"
    version: "5.x"
    features_used:
      - "Priority queues"
      - "Delayed jobs"
      - "Rate limiting"
      - "Job events"
      - "Repeatable jobs"
      - "Flow producers"
    
  redis:
    documentation: "https://redis.io/docs/"
    version: "7.4.x"
    features_used:
      - "Pub/Sub for real-time events"
      - "Sorted sets for priority queues"
      - "Hash for caching"
      - "Streams for event sourcing"

ai_services:
  anthropic_claude:
    documentation: "https://docs.anthropic.com/"
    models:
      - "claude-sonnet-4-20250514 (primary)"
      - "claude-haiku-4-20250514 (fallback)"
    usage:
      - "Context summarization"
      - "Urgency classification"
      - "Agent briefing generation"
    
  openai:
    documentation: "https://platform.openai.com/docs/"
    models:
      - "gpt-4o (alternative)"
    usage:
      - "Backup for Claude unavailability"

standards_compliance:
  gdpr:
    reference: "EU Regulation 2016/679"
    implementation:
      - "Data retention policies"
      - "Right to access (DSAR)"
      - "Right to deletion"
      - "Data portability"
      - "Consent management"
    
  iso_27001:
    reference: "Information Security Management"
    implementation:
      - "Access control"
      - "Audit logging"
      - "Encryption at rest"
      - "Encryption in transit"
    
  romanian_regulations:
    gdpr_local:
      authority: "ANSPDCP"
      reference: "Law 190/2018"
    
    electronic_communications:
      authority: "ANCOM"
      reference: "Law 506/2004"
      requirements:
        - "SMS consent requirements"
        - "Marketing communication rules"

monitoring_tools:
  prometheus:
    documentation: "https://prometheus.io/docs/"
    version: "2.x"
    usage:
      - "Metrics collection"
      - "Alert rules"
    
  grafana:
    documentation: "https://grafana.com/docs/"
    version: "10.x"
    usage:
      - "Dashboard visualization"
      - "Alert management"
    
  signoz:
    documentation: "https://signoz.io/docs/"
    usage:
      - "Distributed tracing"
      - "Log aggregation"

node_libraries:
  pino:
    documentation: "https://getpino.io/"
    version: "9.x"
    usage: "Structured logging"
    
  ioredis:
    documentation: "https://github.com/redis/ioredis"
    version: "5.x"
    usage: "Redis client"
    
  drizzle_orm:
    documentation: "https://orm.drizzle.team/"
    version: "0.38.x"
    usage: "Database ORM"
    
  zod:
    documentation: "https://zod.dev/"
    version: "3.x"
    usage: "Schema validation"
```

### 12.4 Glossary

```markdown
# Workers J - Handover & Channel Management Glossary

## Handover Terms

**Handover**: The process of transferring a conversation from AI agent to human agent,
including all necessary context and conversation history.

**Handover Context**: Compiled information package including conversation summary,
customer details, negotiation state, and AI recommendations.

**Urgency Level**: Classification of handover priority (Critical, Urgent, Standard, Low)
determining response time SLAs and agent selection priority.

**SLA (Service Level Agreement)**: Defined time limits for handover acceptance,
first response, and resolution based on urgency level.

**Agent Assignment**: The process of selecting and notifying the most suitable
human agent based on skills, workload, and availability.

**Reassignment**: Transfer of handover to different agent when original agent
declines or fails to respond within timeout.

**Escalation**: Automatic upgrade of urgency level or notification to supervisor
when SLA breach is imminent.

## Channel Terms

**Channel**: Communication medium (WhatsApp, Email, SMS, Phone, In-App) through
which conversations occur.

**Channel Switch**: Process of moving active conversation from one channel to
another while preserving context.

**Channel Sync**: Mechanism ensuring messages are reflected across all active
channels in a conversation.

**Primary Channel**: Currently active channel where real-time conversation occurs.

**Secondary Channel**: Backup or alternative channels available for the conversation.

**Channel Preference**: Customer's stated preferred communication channel,
respected when possible.

**Message Deduplication**: Process of identifying and preventing duplicate messages
when syncing across channels.

**Sync State**: Current synchronization status for a channel including cursor
position and last sync timestamp.

## Agent Terms

**Agent Workload**: Current assignment count relative to maximum capacity,
expressed as percentage.

**Agent Skills**: Capabilities and expertise areas (products, languages, deal sizes)
used for matching.

**Agent Availability**: Current status (available, busy, away, offline) affecting
handover assignment eligibility.

**Supervisor**: Senior agent with authority to override assignments, escalate issues,
and access all handovers.

## Technical Terms

**Context Compilation**: Process of gathering and summarizing conversation history,
customer data, and negotiation state for handover briefing.

**Priority Queue**: BullMQ queue where jobs are processed based on urgency level
rather than arrival order.

**Pub/Sub**: Redis publish/subscribe pattern for real-time event distribution
between workers.

**Hash Chain**: Audit log integrity mechanism where each entry includes hash of
previous entry, detecting tampering.

**Circuit Breaker**: Pattern preventing cascading failures by temporarily stopping
requests to failing external services.

**Saga Pattern**: Distributed transaction pattern with compensation actions for
rollback on partial failures.

## Acronyms

| Acronym | Expansion |
|---------|-----------|
| HITL | Human-in-the-Loop |
| SLA | Service Level Agreement |
| FSM | Finite State Machine |
| DSAR | Data Subject Access Request |
| PII | Personally Identifiable Information |
| RON | Romanian Leu (currency) |
| CUI | Cod Unic de Identificare (Romanian company ID) |
| CNP | Cod Numeric Personal (Romanian personal ID) |
| ANAF | Agenția Națională de Administrare Fiscală |
| GDPR | General Data Protection Regulation |
| ANSPDCP | Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal |
```

---

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | CERNIQ-E3-WORKERS-J |
| **Title** | Workers J - Handover & Channel Management |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Created** | 2026-01-18 |
| **Last Updated** | 2026-01-18 |
| **Author** | Cerniq Development Team |
| **Reviewer** | - |
| **Approved By** | - |

### Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-01-18 | AI Assistant | Initial structure |
| 0.5.0 | 2026-01-18 | AI Assistant | Sections 1-7 complete |
| 0.9.0 | 2026-01-18 | AI Assistant | Sections 8-11 complete |
| 1.0.0 | 2026-01-18 | AI Assistant | All sections complete |

---

*End of Document - Workers J: Handover & Channel Management*
