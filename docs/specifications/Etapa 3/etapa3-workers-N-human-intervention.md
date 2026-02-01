# Etapa 3 - Workers N: Human Intervention System

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | CERNIQ-E3-WORKERS-N |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Created** | 2026-01-18 |
| **Last Updated** | 2026-01-18 |
| **Author** | Cerniq Development Team |
| **Reviewers** | Technical Lead, Security Team |

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Worker N1 - Escalation Manager](#2-worker-n1---escalation-manager)
3. [Worker N2 - Takeover Handler](#3-worker-n2---takeover-handler)
4. [Worker N3 - Discount Approval](#4-worker-n3---discount-approval)
5. [Worker N4 - Document Review](#5-worker-n4---document-review)
6. [Unified HITL Queue System](#6-unified-hitl-queue-system)
7. [Real-Time Dashboard](#7-real-time-dashboard)
8. [SLA Management](#8-sla-management)
9. [Notification System](#9-notification-system)
10. [Audit & Compliance](#10-audit--compliance)
11. [Testing & Validation](#11-testing--validation)
12. [Configuration & Deployment](#12-configuration--deployment)
13. [Changelog & References](#13-changelog--references)

---

## 1. Overview & Architecture

### 1.1 Purpose

Workers N implementează sistemul de intervenție umană (Human-in-the-Loop / HITL) pentru platforma Cerniq. Acest sistem gestionează:

- **Escaladări** - Conversații care necesită intervenție umană
- **Preluări** - Transfer control de la AI la operator uman
- **Aprobări** - Discount-uri și oferte care depășesc thresholdurile automate
- **Review-uri** - Documente (proforme, facturi) înainte de emitere

### 1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HUMAN INTERVENTION SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Worker N1  │  │   Worker N2  │  │   Worker N3  │  │   Worker N4  │    │
│  │  Escalation  │  │   Takeover   │  │   Discount   │  │   Document   │    │
│  │   Manager    │  │   Handler    │  │   Approval   │  │    Review    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         └─────────────────┼─────────────────┼─────────────────┘             │
│                           │                 │                               │
│                    ┌──────▼─────────────────▼──────┐                        │
│                    │    Unified HITL Queue         │                        │
│                    │    (BullMQ + PostgreSQL)      │                        │
│                    └──────────────┬────────────────┘                        │
│                                   │                                         │
│         ┌─────────────────────────┼─────────────────────────┐              │
│         │                         │                         │              │
│  ┌──────▼──────┐           ┌──────▼──────┐           ┌──────▼──────┐       │
│  │  Dashboard  │           │   SLA       │           │  Notification│       │
│  │  Real-Time  │           │  Manager    │           │   System     │       │
│  └─────────────┘           └─────────────┘           └──────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Worker Responsibilities

| Worker | ID | Purpose | SLA Default |
|--------|----|---------|-----------  |
| **N1** | `human:escalate` | Escaladare conversație la operator | 15 min |
| **N2** | `human:takeover` | Preluare control de la AI | 5 min |
| **N3** | `human:approve-discount` | Aprobare discount manual | 60 min |
| **N4** | `human:review-proforma` | Review document înainte de emitere | 30 min |

### 1.4 HITL Priority Levels

```typescript
enum HitlPriority {
  CRITICAL = 'critical',   // SLA: 5-15 min, immediate notification
  HIGH = 'high',           // SLA: 30-60 min, push notification
  MEDIUM = 'medium',       // SLA: 2-4 hours, email notification
  LOW = 'low'              // SLA: 24 hours, batch notification
}

const PRIORITY_SLA_MINUTES: Record<HitlPriority, number> = {
  [HitlPriority.CRITICAL]: 15,
  [HitlPriority.HIGH]: 60,
  [HitlPriority.MEDIUM]: 240,
  [HitlPriority.LOW]: 1440
};
```

### 1.5 Database Schema Overview

```sql
-- Central HITL approvals table
CREATE TABLE hitl_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Polymorphic reference
    approval_type VARCHAR(50) NOT NULL,  -- escalation, takeover, discount, document
    reference_id UUID NOT NULL,           -- ID of related entity
    reference_table VARCHAR(100) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    
    -- Context
    conversation_id UUID,
    contact_id UUID,
    negotiation_id UUID,
    
    -- Content
    original_content JSONB,
    processed_content JSONB,
    
    -- Reason & violations
    reason TEXT NOT NULL,
    violations JSONB,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    
    -- SLA
    sla_deadline TIMESTAMPTZ NOT NULL,
    sla_breached BOOLEAN DEFAULT FALSE,
    
    -- Resolution
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution VARCHAR(20),  -- approved, rejected, modified, escalated
    resolution_notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'expired')),
    CONSTRAINT valid_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT valid_resolution CHECK (resolution IS NULL OR resolution IN ('approved', 'rejected', 'modified', 'escalated'))
);

-- Indexes
CREATE INDEX idx_hitl_approvals_tenant ON hitl_approvals(tenant_id);
CREATE INDEX idx_hitl_approvals_status ON hitl_approvals(status) WHERE status != 'resolved';
CREATE INDEX idx_hitl_approvals_priority ON hitl_approvals(priority);
CREATE INDEX idx_hitl_approvals_sla ON hitl_approvals(sla_deadline) WHERE status = 'pending';
CREATE INDEX idx_hitl_approvals_assigned ON hitl_approvals(assigned_to) WHERE status = 'assigned';
CREATE INDEX idx_hitl_approvals_type ON hitl_approvals(approval_type);
CREATE INDEX idx_hitl_approvals_reference ON hitl_approvals(reference_table, reference_id);
```

### 1.6 Shared Types

```typescript
// /packages/workers-n/src/types/shared.ts

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export enum HitlApprovalType {
  ESCALATION = 'escalation',
  TAKEOVER = 'takeover',
  DISCOUNT = 'discount',
  DOCUMENT = 'document',
  GUARDRAIL = 'guardrail'
}

export enum HitlStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  EXPIRED = 'expired'
}

export enum HitlPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum HitlResolution {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MODIFIED = 'modified',
  ESCALATED = 'escalated'
}

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

export const HitlApprovalSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  approvalType: z.nativeEnum(HitlApprovalType),
  referenceId: z.string().uuid(),
  referenceTable: z.string(),
  status: z.nativeEnum(HitlStatus),
  priority: z.nativeEnum(HitlPriority),
  conversationId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  negotiationId: z.string().uuid().optional(),
  originalContent: z.record(z.unknown()).optional(),
  processedContent: z.record(z.unknown()).optional(),
  reason: z.string(),
  violations: z.array(z.object({
    type: z.string(),
    severity: z.string(),
    message: z.string()
  })).optional(),
  assignedTo: z.string().uuid().optional(),
  assignedAt: z.date().optional(),
  slaDeadline: z.date(),
  slaBreached: z.boolean().default(false),
  resolvedBy: z.string().uuid().optional(),
  resolvedAt: z.date().optional(),
  resolution: z.nativeEnum(HitlResolution).optional(),
  resolutionNotes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type HitlApproval = z.infer<typeof HitlApprovalSchema>;

// -----------------------------------------------------------------------------
// Job Payloads
// -----------------------------------------------------------------------------

export interface HitlJobPayload {
  approvalId: string;
  tenantId: string;
  approvalType: HitlApprovalType;
  priority: HitlPriority;
  metadata?: Record<string, unknown>;
}

export interface EscalationPayload extends HitlJobPayload {
  conversationId: string;
  contactId: string;
  reason: string;
  lastMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  sentiment?: {
    score: number;
    label: string;
  };
  triggers: string[];
}

export interface TakeoverPayload extends HitlJobPayload {
  conversationId: string;
  contactId: string;
  requestedBy: 'user' | 'system' | 'guardrail';
  aiState: {
    lastResponse: string;
    confidence: number;
    activeNegotiation?: string;
  };
}

export interface DiscountApprovalPayload extends HitlJobPayload {
  negotiationId: string;
  contactId: string;
  requestedDiscount: number;
  currentPrice: number;
  minimumPrice: number;
  productId: string;
  quantity: number;
  justification?: string;
  discountHistory: Array<{
    discount: number;
    approved: boolean;
    date: Date;
  }>;
}

export interface DocumentReviewPayload extends HitlJobPayload {
  documentId: string;
  documentType: 'proforma' | 'invoice' | 'contract' | 'offer';
  negotiationId?: string;
  contactId: string;
  documentContent: {
    series: string;
    number: string;
    totalValue: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
  validationIssues?: string[];
}

// -----------------------------------------------------------------------------
// Result Types
// -----------------------------------------------------------------------------

export interface HitlResult {
  approvalId: string;
  status: HitlStatus;
  resolution?: HitlResolution;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  modifiedContent?: Record<string, unknown>;
}

export interface EscalationResult extends HitlResult {
  operatorId: string;
  responseToUser?: string;
  actionsTaken: string[];
}

export interface TakeoverResult extends HitlResult {
  operatorId: string;
  takeoverDuration?: number;
  messagesHandled?: number;
  handbackToAi?: boolean;
}

export interface DiscountApprovalResult extends HitlResult {
  approved: boolean;
  approvedDiscount?: number;
  approvedBy?: string;
  validUntil?: Date;
  conditions?: string[];
}

export interface DocumentReviewResult extends HitlResult {
  approved: boolean;
  corrections?: Array<{
    field: string;
    original: string;
    corrected: string;
  }>;
  readyForEmission: boolean;
}
```

---

## 2. Worker N1 - Escalation Manager

### 2.1 Overview

Worker N1 gestionează escaladarea conversațiilor de la AI la operatori umani. Escaladarea poate fi declanșată de:

- **User Request** - Clientul solicită explicit operator uman
- **Sentiment Triggers** - Sentiment negativ persistent
- **Guardrail Triggers** - Conținut blocat sau modificat
- **Complexity Triggers** - Întrebări complexe în afara capabilităților AI
- **Compliance Triggers** - Situații care necesită intervenție umană conform legii

### 2.2 Escalation Triggers

```typescript
// /packages/workers-n/src/n1-escalation/triggers.ts

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Trigger Types
// -----------------------------------------------------------------------------

export enum EscalationTriggerType {
  // User-initiated
  USER_REQUEST = 'user_request',
  USER_EXPLICIT = 'user_explicit',
  
  // Sentiment-based
  NEGATIVE_SENTIMENT = 'negative_sentiment',
  FRUSTRATION_DETECTED = 'frustration_detected',
  ANGER_DETECTED = 'anger_detected',
  
  // Guardrail-based
  CONTENT_BLOCKED = 'content_blocked',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  HALLUCINATION_DETECTED = 'hallucination_detected',
  
  // Complexity-based
  COMPLEX_QUERY = 'complex_query',
  MULTI_PRODUCT = 'multi_product',
  CUSTOM_REQUEST = 'custom_request',
  
  // Business-based
  HIGH_VALUE_DEAL = 'high_value_deal',
  VIP_CUSTOMER = 'vip_customer',
  LEGAL_QUESTION = 'legal_question',
  
  // System-based
  AI_CONFIDENCE_LOW = 'ai_confidence_low',
  REPEATED_FAILURES = 'repeated_failures',
  TIMEOUT = 'timeout'
}

// -----------------------------------------------------------------------------
// Trigger Configuration
// -----------------------------------------------------------------------------

export interface EscalationTriggerConfig {
  type: EscalationTriggerType;
  enabled: boolean;
  priority: HitlPriority;
  conditions: TriggerCondition[];
  cooldownMinutes: number;  // Prevent rapid re-escalation
  autoAssign: boolean;
  notifyChannels: NotifyChannel[];
}

export interface TriggerCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';
  value: string | number | boolean | RegExp;
}

export type NotifyChannel = 'email' | 'slack' | 'sms' | 'push' | 'webhook';

// -----------------------------------------------------------------------------
// Default Trigger Configurations
// -----------------------------------------------------------------------------

export const DEFAULT_ESCALATION_TRIGGERS: EscalationTriggerConfig[] = [
  // User Explicit Request - Highest Priority
  {
    type: EscalationTriggerType.USER_EXPLICIT,
    enabled: true,
    priority: HitlPriority.CRITICAL,
    conditions: [
      { field: 'intent', operator: 'eq', value: 'request_human' },
    ],
    cooldownMinutes: 0,  // No cooldown for explicit requests
    autoAssign: true,
    notifyChannels: ['push', 'slack']
  },
  
  // Negative Sentiment - High Priority
  {
    type: EscalationTriggerType.NEGATIVE_SENTIMENT,
    enabled: true,
    priority: HitlPriority.HIGH,
    conditions: [
      { field: 'sentiment.score', operator: 'lt', value: -0.5 },
      { field: 'sentiment.consecutive', operator: 'gte', value: 3 }
    ],
    cooldownMinutes: 30,
    autoAssign: true,
    notifyChannels: ['push', 'email']
  },
  
  // Frustration Detected - High Priority
  {
    type: EscalationTriggerType.FRUSTRATION_DETECTED,
    enabled: true,
    priority: HitlPriority.HIGH,
    conditions: [
      { field: 'emotion.frustration', operator: 'gt', value: 0.7 }
    ],
    cooldownMinutes: 15,
    autoAssign: true,
    notifyChannels: ['push']
  },
  
  // Content Blocked - Critical
  {
    type: EscalationTriggerType.CONTENT_BLOCKED,
    enabled: true,
    priority: HitlPriority.CRITICAL,
    conditions: [
      { field: 'guardrail.status', operator: 'eq', value: 'block' }
    ],
    cooldownMinutes: 0,
    autoAssign: true,
    notifyChannels: ['push', 'slack', 'email']
  },
  
  // Compliance Violation - Critical
  {
    type: EscalationTriggerType.COMPLIANCE_VIOLATION,
    enabled: true,
    priority: HitlPriority.CRITICAL,
    conditions: [
      { field: 'compliance.violated', operator: 'eq', value: true }
    ],
    cooldownMinutes: 0,
    autoAssign: true,
    notifyChannels: ['push', 'slack', 'email']
  },
  
  // Hallucination Detected - High
  {
    type: EscalationTriggerType.HALLUCINATION_DETECTED,
    enabled: true,
    priority: HitlPriority.HIGH,
    conditions: [
      { field: 'antiHallucination.decision', operator: 'eq', value: 'BLOCK' }
    ],
    cooldownMinutes: 10,
    autoAssign: false,
    notifyChannels: ['email']
  },
  
  // Complex Query - Medium
  {
    type: EscalationTriggerType.COMPLEX_QUERY,
    enabled: true,
    priority: HitlPriority.MEDIUM,
    conditions: [
      { field: 'complexity.score', operator: 'gt', value: 8 },
      { field: 'ai.confidence', operator: 'lt', value: 0.5 }
    ],
    cooldownMinutes: 60,
    autoAssign: false,
    notifyChannels: ['email']
  },
  
  // High Value Deal - High
  {
    type: EscalationTriggerType.HIGH_VALUE_DEAL,
    enabled: true,
    priority: HitlPriority.HIGH,
    conditions: [
      { field: 'negotiation.totalValue', operator: 'gt', value: 50000 }  // 50,000 RON
    ],
    cooldownMinutes: 0,
    autoAssign: true,
    notifyChannels: ['push', 'email']
  },
  
  // VIP Customer - High
  {
    type: EscalationTriggerType.VIP_CUSTOMER,
    enabled: true,
    priority: HitlPriority.HIGH,
    conditions: [
      { field: 'contact.tier', operator: 'eq', value: 'gold' }
    ],
    cooldownMinutes: 0,
    autoAssign: true,
    notifyChannels: ['push']
  },
  
  // AI Confidence Low - Medium
  {
    type: EscalationTriggerType.AI_CONFIDENCE_LOW,
    enabled: true,
    priority: HitlPriority.MEDIUM,
    conditions: [
      { field: 'ai.confidence', operator: 'lt', value: 0.3 },
      { field: 'ai.consecutiveLowConfidence', operator: 'gte', value: 2 }
    ],
    cooldownMinutes: 30,
    autoAssign: false,
    notifyChannels: ['email']
  },
  
  // Repeated Failures - High
  {
    type: EscalationTriggerType.REPEATED_FAILURES,
    enabled: true,
    priority: HitlPriority.HIGH,
    conditions: [
      { field: 'conversation.failedResponses', operator: 'gte', value: 3 }
    ],
    cooldownMinutes: 15,
    autoAssign: true,
    notifyChannels: ['push', 'email']
  }
];

// -----------------------------------------------------------------------------
// Romanian-Specific Patterns
// -----------------------------------------------------------------------------

export const ROMANIAN_ESCALATION_PATTERNS = {
  // Explicit human request patterns (Romanian)
  humanRequestPatterns: [
    /vreau\s+(să\s+vorbesc\s+cu\s+)?(un\s+)?operator/i,
    /doriți?\s+un\s+operator/i,
    /transfer(ați)?\s+(la|către)\s+operator/i,
    /pot\s+vorbi\s+cu\s+cineva/i,
    /un\s+om\s+real/i,
    /persoană\s+reală/i,
    /nu\s+vreau\s+bot/i,
    /destul\s+cu\s+AI/i,
    /vreau\s+ajutor\s+uman/i,
    /operator\s+uman/i,
    /asistent\s+real/i,
    /legătură\s+cu\s+un\s+consultant/i
  ],
  
  // Frustration patterns (Romanian)
  frustrationPatterns: [
    /nu\s+înțelegi/i,
    /nu\s+m-ai\s+înțeles/i,
    /de\s+câte\s+ori\s+să\s+spun/i,
    /iar(ă)?\s+spui\s+prostii/i,
    /nu\s+asta\s+am\s+întrebat/i,
    /răspuns\s+fără\s+sens/i,
    /nu\s+ajută\s+cu\s+nimic/i,
    /sunt\s+frustrat/i,
    /m-am\s+săturat/i,
    /pierd\s+timpul/i,
    /nu\s+funcționează/i
  ],
  
  // Legal/compliance patterns (Romanian)
  legalPatterns: [
    /vreau\s+să\s+fac\s+reclamație/i,
    /anpc/i,
    /protecția\s+consumatorului/i,
    /avocat/i,
    /instanță/i,
    /proces/i,
    /contract(ul)?\s+e\s+ilegal/i,
    /gdpr/i,
    /datele\s+mele\s+personale/i,
    /ștergere\s+date/i,
    /drepturile\s+mele/i
  ],
  
  // Complex query patterns
  complexPatterns: [
    /personalizare\s+specială/i,
    /cerere\s+specială/i,
    /comandă\s+personalizată/i,
    /modificare\s+tehnică/i,
    /specificații\s+custom/i,
    /proiect\s+special/i
  ]
};
```

### 2.3 Escalation Detector

```typescript
// /packages/workers-n/src/n1-escalation/detector.ts

import { db } from '@cerniq/database';
import { eq, and, gte, desc } from 'drizzle-orm';
import {
  conversations,
  messages,
  contacts,
  negotiations
} from '@cerniq/database/schema';
import {
  EscalationTriggerType,
  EscalationTriggerConfig,
  DEFAULT_ESCALATION_TRIGGERS,
  ROMANIAN_ESCALATION_PATTERNS
} from './triggers';
import { HitlPriority } from '../types/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface EscalationContext {
  tenantId: string;
  conversationId: string;
  contactId: string;
  message: {
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
  };
  sentiment?: {
    score: number;
    label: string;
    emotion?: string;
    consecutive?: number;
  };
  intent?: {
    type: string;
    confidence: number;
  };
  guardrail?: {
    status: 'pass' | 'warn' | 'block';
    violations: string[];
  };
  compliance?: {
    violated: boolean;
    regulations: string[];
  };
  antiHallucination?: {
    decision: string;
    confidence: number;
  };
  ai?: {
    confidence: number;
    model: string;
    consecutiveLowConfidence?: number;
  };
  complexity?: {
    score: number;
    factors: string[];
  };
  negotiation?: {
    id: string;
    state: string;
    totalValue: number;
  };
  contact?: {
    tier: 'bronze' | 'silver' | 'gold';
    totalPurchases: number;
  };
  conversation?: {
    messageCount: number;
    duration: number;
    failedResponses: number;
  };
}

export interface EscalationDetectionResult {
  shouldEscalate: boolean;
  triggers: TriggeredEscalation[];
  highestPriority: HitlPriority;
  combinedReason: string;
}

export interface TriggeredEscalation {
  type: EscalationTriggerType;
  priority: HitlPriority;
  reason: string;
  matchedConditions: string[];
  autoAssign: boolean;
  notifyChannels: NotifyChannel[];
}

// -----------------------------------------------------------------------------
// Escalation Detector
// -----------------------------------------------------------------------------

export class EscalationDetector {
  private tenantId: string;
  private triggers: EscalationTriggerConfig[];
  
  constructor(tenantId: string, customTriggers?: EscalationTriggerConfig[]) {
    this.tenantId = tenantId;
    this.triggers = customTriggers || DEFAULT_ESCALATION_TRIGGERS;
  }
  
  /**
   * Detect if escalation is needed based on context
   */
  async detect(context: EscalationContext): Promise<EscalationDetectionResult> {
    const triggeredEscalations: TriggeredEscalation[] = [];
    
    // Check each trigger
    for (const trigger of this.triggers) {
      if (!trigger.enabled) continue;
      
      // Check cooldown
      const inCooldown = await this.checkCooldown(
        context.conversationId,
        trigger.type,
        trigger.cooldownMinutes
      );
      if (inCooldown) continue;
      
      // Check trigger-specific conditions
      const result = this.checkTrigger(trigger, context);
      if (result.triggered) {
        triggeredEscalations.push({
          type: trigger.type,
          priority: trigger.priority,
          reason: result.reason,
          matchedConditions: result.matchedConditions,
          autoAssign: trigger.autoAssign,
          notifyChannels: trigger.notifyChannels
        });
      }
    }
    
    // Also check Romanian-specific patterns
    const patternResult = this.checkRomanianPatterns(context.message.content);
    if (patternResult.triggered) {
      triggeredEscalations.push(...patternResult.escalations);
    }
    
    // Sort by priority
    triggeredEscalations.sort((a, b) => {
      const priorityOrder = ['critical', 'high', 'medium', 'low'];
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    });
    
    // Combine reasons
    const combinedReason = triggeredEscalations
      .map(e => e.reason)
      .join('; ');
    
    return {
      shouldEscalate: triggeredEscalations.length > 0,
      triggers: triggeredEscalations,
      highestPriority: triggeredEscalations[0]?.priority || HitlPriority.LOW,
      combinedReason
    };
  }
  
  /**
   * Check if a specific trigger is activated
   */
  private checkTrigger(
    trigger: EscalationTriggerConfig,
    context: EscalationContext
  ): { triggered: boolean; reason: string; matchedConditions: string[] } {
    const matchedConditions: string[] = [];
    
    for (const condition of trigger.conditions) {
      const value = this.getNestedValue(context, condition.field);
      const matches = this.evaluateCondition(value, condition.operator, condition.value);
      
      if (matches) {
        matchedConditions.push(`${condition.field} ${condition.operator} ${condition.value}`);
      }
    }
    
    // All conditions must match for trigger to activate
    const triggered = matchedConditions.length === trigger.conditions.length;
    
    return {
      triggered,
      reason: triggered ? this.getTriggerReason(trigger.type) : '',
      matchedConditions
    };
  }
  
  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : undefined, obj);
  }
  
  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    value: any,
    operator: string,
    expected: string | number | boolean | RegExp
  ): boolean {
    if (value === undefined) return false;
    
    switch (operator) {
      case 'eq':
        return value === expected;
      case 'neq':
        return value !== expected;
      case 'gt':
        return typeof value === 'number' && value > (expected as number);
      case 'gte':
        return typeof value === 'number' && value >= (expected as number);
      case 'lt':
        return typeof value === 'number' && value < (expected as number);
      case 'lte':
        return typeof value === 'number' && value <= (expected as number);
      case 'contains':
        return typeof value === 'string' && 
               value.toLowerCase().includes((expected as string).toLowerCase());
      case 'matches':
        return expected instanceof RegExp && expected.test(String(value));
      default:
        return false;
    }
  }
  
  /**
   * Check Romanian-specific patterns
   */
  private checkRomanianPatterns(
    content: string
  ): { triggered: boolean; escalations: TriggeredEscalation[] } {
    const escalations: TriggeredEscalation[] = [];
    
    // Check human request patterns
    for (const pattern of ROMANIAN_ESCALATION_PATTERNS.humanRequestPatterns) {
      if (pattern.test(content)) {
        escalations.push({
          type: EscalationTriggerType.USER_EXPLICIT,
          priority: HitlPriority.CRITICAL,
          reason: 'Client a solicitat explicit operator uman',
          matchedConditions: [`message matches ${pattern}`],
          autoAssign: true,
          notifyChannels: ['push', 'slack']
        });
        break;  // Only one match needed
      }
    }
    
    // Check frustration patterns
    for (const pattern of ROMANIAN_ESCALATION_PATTERNS.frustrationPatterns) {
      if (pattern.test(content)) {
        escalations.push({
          type: EscalationTriggerType.FRUSTRATION_DETECTED,
          priority: HitlPriority.HIGH,
          reason: 'Detectată frustrare în mesajul clientului',
          matchedConditions: [`message matches ${pattern}`],
          autoAssign: true,
          notifyChannels: ['push']
        });
        break;
      }
    }
    
    // Check legal patterns
    for (const pattern of ROMANIAN_ESCALATION_PATTERNS.legalPatterns) {
      if (pattern.test(content)) {
        escalations.push({
          type: EscalationTriggerType.LEGAL_QUESTION,
          priority: HitlPriority.CRITICAL,
          reason: 'Întrebare legală sau reclamație detectată',
          matchedConditions: [`message matches ${pattern}`],
          autoAssign: true,
          notifyChannels: ['push', 'slack', 'email']
        });
        break;
      }
    }
    
    // Check complex patterns
    for (const pattern of ROMANIAN_ESCALATION_PATTERNS.complexPatterns) {
      if (pattern.test(content)) {
        escalations.push({
          type: EscalationTriggerType.COMPLEX_QUERY,
          priority: HitlPriority.MEDIUM,
          reason: 'Cerere complexă sau personalizată',
          matchedConditions: [`message matches ${pattern}`],
          autoAssign: false,
          notifyChannels: ['email']
        });
        break;
      }
    }
    
    return {
      triggered: escalations.length > 0,
      escalations
    };
  }
  
  /**
   * Check if escalation is in cooldown
   */
  private async checkCooldown(
    conversationId: string,
    triggerType: EscalationTriggerType,
    cooldownMinutes: number
  ): Promise<boolean> {
    if (cooldownMinutes === 0) return false;
    
    const cooldownKey = `escalation:cooldown:${conversationId}:${triggerType}`;
    const exists = await redis.exists(cooldownKey);
    return exists === 1;
  }
  
  /**
   * Set cooldown after escalation
   */
  async setCooldown(
    conversationId: string,
    triggerType: EscalationTriggerType,
    cooldownMinutes: number
  ): Promise<void> {
    if (cooldownMinutes === 0) return;
    
    const cooldownKey = `escalation:cooldown:${conversationId}:${triggerType}`;
    await redis.setex(cooldownKey, cooldownMinutes * 60, '1');
  }
  
  /**
   * Get human-readable reason for trigger type
   */
  private getTriggerReason(type: EscalationTriggerType): string {
    const reasons: Record<EscalationTriggerType, string> = {
      [EscalationTriggerType.USER_REQUEST]: 'Client a solicitat ajutor',
      [EscalationTriggerType.USER_EXPLICIT]: 'Client a cerut explicit operator uman',
      [EscalationTriggerType.NEGATIVE_SENTIMENT]: 'Sentiment negativ persistent detectat',
      [EscalationTriggerType.FRUSTRATION_DETECTED]: 'Frustrare detectată în conversație',
      [EscalationTriggerType.ANGER_DETECTED]: 'Furie detectată în mesaje',
      [EscalationTriggerType.CONTENT_BLOCKED]: 'Conținut blocat de guardrails',
      [EscalationTriggerType.COMPLIANCE_VIOLATION]: 'Încălcare de conformitate detectată',
      [EscalationTriggerType.HALLUCINATION_DETECTED]: 'Răspuns AI cu informații incorecte',
      [EscalationTriggerType.COMPLEX_QUERY]: 'Întrebare prea complexă pentru AI',
      [EscalationTriggerType.MULTI_PRODUCT]: 'Cerere pentru multiple produse',
      [EscalationTriggerType.CUSTOM_REQUEST]: 'Cerere de personalizare',
      [EscalationTriggerType.HIGH_VALUE_DEAL]: 'Tranzacție de valoare mare',
      [EscalationTriggerType.VIP_CUSTOMER]: 'Client VIP care necesită atenție',
      [EscalationTriggerType.LEGAL_QUESTION]: 'Întrebare legală sau reclamație',
      [EscalationTriggerType.AI_CONFIDENCE_LOW]: 'Încredere AI scăzută în răspuns',
      [EscalationTriggerType.REPEATED_FAILURES]: 'Eșecuri repetate în conversație',
      [EscalationTriggerType.TIMEOUT]: 'Timeout în procesarea mesajului'
    };
    
    return reasons[type] || 'Motiv necunoscut';
  }
}
```

### 2.4 Worker N1 Implementation

```typescript
// /packages/workers-n/src/n1-escalation/worker.ts

import { Worker, Queue, Job } from 'bullmq';
import { db } from '@cerniq/database';
import { eq, and } from 'drizzle-orm';
import {
  hitlApprovals,
  conversations,
  messages,
  contacts,
  users
} from '@cerniq/database/schema';
import { redis } from '@cerniq/redis';
import { aiAgentLogger as logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import {
  HitlApprovalType,
  HitlStatus,
  HitlPriority,
  EscalationPayload,
  EscalationResult
} from '../types/shared';
import { EscalationDetector, EscalationContext } from './detector';
import { NotificationService } from '../services/notification';
import { OperatorAssigner } from '../services/operator-assigner';

// -----------------------------------------------------------------------------
// Queue Configuration
// -----------------------------------------------------------------------------

const QUEUE_NAME = 'human:escalate';

const queueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
};

export const escalationQueue = new Queue<EscalationPayload>(
  QUEUE_NAME,
  queueOptions
);

// -----------------------------------------------------------------------------
// Worker Implementation
// -----------------------------------------------------------------------------

export class WorkerN1Escalation {
  private worker: Worker<EscalationPayload, EscalationResult>;
  private notificationService: NotificationService;
  private operatorAssigner: OperatorAssigner;
  
  constructor() {
    this.notificationService = new NotificationService();
    this.operatorAssigner = new OperatorAssigner();
    
    this.worker = new Worker<EscalationPayload, EscalationResult>(
      QUEUE_NAME,
      this.processEscalation.bind(this),
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
  
  /**
   * Process escalation job
   */
  private async processEscalation(
    job: Job<EscalationPayload>
  ): Promise<EscalationResult> {
    const startTime = Date.now();
    const { data } = job;
    
    logger.info({
      event: 'ESCALATION_START',
      jobId: job.id,
      conversationId: data.conversationId,
      priority: data.priority
    }, 'Processing escalation');
    
    try {
      // 1. Create HITL approval record
      const approval = await this.createApproval(data);
      
      // 2. Update conversation status
      await this.updateConversationStatus(data.conversationId, 'escalated');
      
      // 3. Notify user that escalation is in progress
      await this.notifyUser(data.conversationId, data.contactId);
      
      // 4. Auto-assign operator if configured
      let assignedOperator: string | undefined;
      if (this.shouldAutoAssign(data.priority)) {
        assignedOperator = await this.assignOperator(approval.id, data.tenantId);
      }
      
      // 5. Send notifications to operators
      await this.notifyOperators(approval, data, assignedOperator);
      
      // 6. Store in real-time queue for dashboard
      await this.addToRealtimeQueue(approval);
      
      // Record metrics
      const processingTime = Date.now() - startTime;
      metrics.histogramObserve('escalation_processing_time_ms', processingTime, {
        tenant_id: data.tenantId,
        priority: data.priority
      });
      metrics.counterInc('escalations_created_total', {
        tenant_id: data.tenantId,
        priority: data.priority
      });
      
      logger.info({
        event: 'ESCALATION_COMPLETE',
        approvalId: approval.id,
        assignedTo: assignedOperator,
        processingTime
      }, 'Escalation processed');
      
      return {
        approvalId: approval.id,
        status: assignedOperator ? HitlStatus.ASSIGNED : HitlStatus.PENDING,
        operatorId: assignedOperator || '',
        actionsTaken: [
          'Created HITL approval',
          'Updated conversation status',
          'Notified user',
          assignedOperator ? 'Auto-assigned operator' : 'Added to queue',
          'Notified operators'
        ]
      };
      
    } catch (error) {
      logger.error({
        event: 'ESCALATION_ERROR',
        error: error.message,
        conversationId: data.conversationId
      }, 'Escalation failed');
      
      metrics.counterInc('escalations_failed_total', {
        tenant_id: data.tenantId
      });
      
      throw error;
    }
  }
  
  /**
   * Create HITL approval record
   */
  private async createApproval(data: EscalationPayload): Promise<any> {
    const slaMinutes = PRIORITY_SLA_MINUTES[data.priority];
    const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);
    
    const [approval] = await db.insert(hitlApprovals).values({
      tenantId: data.tenantId,
      approvalType: HitlApprovalType.ESCALATION,
      referenceId: data.conversationId,
      referenceTable: 'conversations',
      status: HitlStatus.PENDING,
      priority: data.priority,
      conversationId: data.conversationId,
      contactId: data.contactId,
      originalContent: {
        lastMessages: data.lastMessages,
        sentiment: data.sentiment,
        triggers: data.triggers
      },
      reason: data.reason,
      slaDeadline
    }).returning();
    
    return approval;
  }
  
  /**
   * Update conversation status
   */
  private async updateConversationStatus(
    conversationId: string,
    status: string
  ): Promise<void> {
    await db.update(conversations)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId));
  }
  
  /**
   * Notify user that their request is being handled
   */
  private async notifyUser(
    conversationId: string,
    contactId: string
  ): Promise<void> {
    const message = `Vă mulțumim pentru răbdare. Un consultant va prelua conversația în curând. ` +
      `Timpul estimat de așteptare este de câteva minute.`;
    
    // Add system message to conversation
    await db.insert(messages).values({
      conversationId,
      contactId,
      role: 'system',
      content: message,
      messageType: 'escalation_notice'
    });
    
    // Also send via original channel if possible
    await this.notificationService.notifyContact(contactId, {
      type: 'escalation_notice',
      message
    });
  }
  
  /**
   * Check if should auto-assign based on priority
   */
  private shouldAutoAssign(priority: HitlPriority): boolean {
    return priority === HitlPriority.CRITICAL || priority === HitlPriority.HIGH;
  }
  
  /**
   * Assign operator to escalation
   */
  private async assignOperator(
    approvalId: string,
    tenantId: string
  ): Promise<string | undefined> {
    const operator = await this.operatorAssigner.findAvailableOperator(tenantId);
    
    if (operator) {
      await db.update(hitlApprovals)
        .set({
          assignedTo: operator.id,
          assignedAt: new Date(),
          status: HitlStatus.ASSIGNED
        })
        .where(eq(hitlApprovals.id, approvalId));
      
      return operator.id;
    }
    
    return undefined;
  }
  
  /**
   * Notify operators about escalation
   */
  private async notifyOperators(
    approval: any,
    data: EscalationPayload,
    assignedOperator?: string
  ): Promise<void> {
    // Get contact info for context
    const [contact] = await db.select()
      .from(contacts)
      .where(eq(contacts.id, data.contactId))
      .limit(1);
    
    const notification = {
      type: 'escalation',
      approvalId: approval.id,
      priority: data.priority,
      reason: data.reason,
      contactName: contact?.companyName || contact?.contactPerson || 'Client',
      conversationId: data.conversationId,
      sentiment: data.sentiment,
      slaDeadline: approval.slaDeadline,
      assignedTo: assignedOperator
    };
    
    if (assignedOperator) {
      // Notify specific operator
      await this.notificationService.notifyUser(assignedOperator, notification);
    } else {
      // Notify all available operators
      await this.notificationService.notifyAvailableOperators(
        data.tenantId,
        notification
      );
    }
    
    // Also notify via Slack for critical/high priority
    if (data.priority === HitlPriority.CRITICAL || data.priority === HitlPriority.HIGH) {
      await this.notificationService.sendSlackNotification(data.tenantId, {
        channel: 'sales-escalations',
        text: `🚨 Escaladare ${data.priority.toUpperCase()}: ${data.reason}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Escaladare ${data.priority.toUpperCase()}*\n` +
                `Client: ${contact?.companyName || 'N/A'}\n` +
                `Motiv: ${data.reason}\n` +
                `SLA: ${approval.slaDeadline.toISOString()}`
            }
          }
        ]
      });
    }
  }
  
  /**
   * Add to real-time queue for dashboard
   */
  private async addToRealtimeQueue(approval: any): Promise<void> {
    const key = `hitl:${approval.tenantId}:pending`;
    await redis.zadd(key, Date.now(), approval.id);
    
    // Also publish event for real-time updates
    await redis.publish(`hitl:${approval.tenantId}:events`, JSON.stringify({
      type: 'escalation_created',
      approval
    }));
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.debug({ jobId: job.id }, 'Escalation job completed');
    });
    
    this.worker.on('failed', (job, err) => {
      logger.error({
        jobId: job?.id,
        error: err.message
      }, 'Escalation job failed');
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn({ jobId }, 'Escalation job stalled');
    });
  }
  
  /**
   * Start the worker
   */
  async start(): Promise<void> {
    logger.info('Worker N1 (Escalation) started');
  }
  
  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    await this.worker.close();
    logger.info('Worker N1 (Escalation) stopped');
  }
}

// -----------------------------------------------------------------------------
// Helper Function: Create Escalation
// -----------------------------------------------------------------------------

export async function createEscalation(
  context: EscalationContext
): Promise<string | null> {
  const detector = new EscalationDetector(context.tenantId);
  const result = await detector.detect(context);
  
  if (!result.shouldEscalate) {
    return null;
  }
  
  // Get last messages
  const lastMessages = await db.select()
    .from(messages)
    .where(eq(messages.conversationId, context.conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(10);
  
  const payload: EscalationPayload = {
    approvalId: '',  // Will be set by worker
    tenantId: context.tenantId,
    approvalType: HitlApprovalType.ESCALATION,
    priority: result.highestPriority,
    conversationId: context.conversationId,
    contactId: context.contactId,
    reason: result.combinedReason,
    lastMessages: lastMessages.reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.createdAt
    })),
    sentiment: context.sentiment,
    triggers: result.triggers.map(t => t.type)
  };
  
  const job = await escalationQueue.add('escalate', payload, {
    priority: getPriorityNumber(result.highestPriority)
  });
  
  // Set cooldown for triggered escalations
  for (const trigger of result.triggers) {
    const config = DEFAULT_ESCALATION_TRIGGERS.find(t => t.type === trigger.type);
    if (config) {
      await detector.setCooldown(
        context.conversationId,
        trigger.type,
        config.cooldownMinutes
      );
    }
  }
  
  return job.id || null;
}

function getPriorityNumber(priority: HitlPriority): number {
  const priorities: Record<HitlPriority, number> = {
    [HitlPriority.CRITICAL]: 1,
    [HitlPriority.HIGH]: 2,
    [HitlPriority.MEDIUM]: 3,
    [HitlPriority.LOW]: 4
  };
  return priorities[priority];
}
```

---

## 3. Worker N2 - Takeover Handler

### 3.1 Overview

Worker N2 gestionează preluarea controlului conversației de la AI de către un operator uman. Aceasta poate fi:

- **User-Requested** - Clientul solicită să vorbească cu un om
- **System-Initiated** - Sistemul detectează necesitatea intervenției
- **Guardrail-Triggered** - Guardrails blochează răspunsul AI
- **Operator-Initiated** - Operatorul decide să preia conversația

### 3.2 Takeover States

```typescript
// /packages/workers-n/src/n2-takeover/states.ts

export enum TakeoverState {
  AI_ACTIVE = 'ai_active',           // AI handles conversation
  TAKEOVER_PENDING = 'takeover_pending', // Waiting for operator
  HUMAN_ACTIVE = 'human_active',     // Human handles conversation
  HANDBACK_PENDING = 'handback_pending', // Human wants to return to AI
  HYBRID = 'hybrid'                  // Both AI and human collaborate
}

export enum TakeoverReason {
  USER_REQUEST = 'user_request',
  ESCALATION = 'escalation',
  GUARDRAIL_BLOCK = 'guardrail_block',
  AI_FAILURE = 'ai_failure',
  COMPLEXITY = 'complexity',
  VIP_CUSTOMER = 'vip_customer',
  SCHEDULED = 'scheduled',
  OPERATOR_DECISION = 'operator_decision'
}

// State transition rules
export const TAKEOVER_TRANSITIONS: Record<TakeoverState, TakeoverState[]> = {
  [TakeoverState.AI_ACTIVE]: [
    TakeoverState.TAKEOVER_PENDING,
    TakeoverState.HYBRID
  ],
  [TakeoverState.TAKEOVER_PENDING]: [
    TakeoverState.HUMAN_ACTIVE,
    TakeoverState.AI_ACTIVE  // Timeout/cancel
  ],
  [TakeoverState.HUMAN_ACTIVE]: [
    TakeoverState.HANDBACK_PENDING,
    TakeoverState.HYBRID
  ],
  [TakeoverState.HANDBACK_PENDING]: [
    TakeoverState.AI_ACTIVE,
    TakeoverState.HUMAN_ACTIVE  // Cancel
  ],
  [TakeoverState.HYBRID]: [
    TakeoverState.AI_ACTIVE,
    TakeoverState.HUMAN_ACTIVE
  ]
};

export function canTransition(from: TakeoverState, to: TakeoverState): boolean {
  return TAKEOVER_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### 3.3 Takeover Context Preservation

```typescript
// /packages/workers-n/src/n2-takeover/context-preserver.ts

import { db } from '@cerniq/database';
import { eq } from 'drizzle-orm';
import {
  conversations,
  messages,
  negotiations,
  contacts
} from '@cerniq/database/schema';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TakeoverContext {
  conversation: {
    id: string;
    status: string;
    channel: string;
    startedAt: Date;
    messageCount: number;
  };
  contact: {
    id: string;
    companyName?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    tier: string;
    totalPurchases: number;
    lastPurchaseDate?: Date;
    preferences?: Record<string, unknown>;
  };
  negotiation?: {
    id: string;
    state: string;
    products: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      discount: number;
    }>;
    totalValue: number;
    discountApplied: number;
  };
  aiState: {
    lastResponse: string;
    confidence: number;
    model: string;
    tokensUsed: number;
    currentIntent?: string;
    extractedEntities?: Record<string, unknown>;
  };
  history: {
    recentMessages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: Date;
    }>;
    sentiment: {
      current: number;
      trend: 'improving' | 'stable' | 'declining';
    };
    keyTopics: string[];
  };
  metadata: {
    language: string;
    timezone: string;
    source: string;
    tags: string[];
  };
}

// -----------------------------------------------------------------------------
// Context Preserver
// -----------------------------------------------------------------------------

export class TakeoverContextPreserver {
  /**
   * Capture full context for human takeover
   */
  async captureContext(
    conversationId: string,
    tenantId: string
  ): Promise<TakeoverContext> {
    // Get conversation
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    
    // Get contact
    const [contact] = await db.select()
      .from(contacts)
      .where(eq(contacts.id, conversation.contactId))
      .limit(1);
    
    // Get negotiation if exists
    let negotiation;
    if (conversation.activeNegotiationId) {
      [negotiation] = await db.select()
        .from(negotiations)
        .where(eq(negotiations.id, conversation.activeNegotiationId))
        .limit(1);
    }
    
    // Get recent messages
    const recentMessages = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(20);
    
    // Get message count
    const [{ count }] = await db.select({ count: sql`count(*)` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));
    
    // Calculate sentiment trend
    const sentimentTrend = this.calculateSentimentTrend(recentMessages);
    
    // Extract key topics
    const keyTopics = this.extractKeyTopics(recentMessages);
    
    // Get AI state from last assistant message
    const lastAiMessage = recentMessages.find(m => m.role === 'assistant');
    
    return {
      conversation: {
        id: conversation.id,
        status: conversation.status,
        channel: conversation.channel,
        startedAt: conversation.createdAt,
        messageCount: Number(count)
      },
      contact: {
        id: contact?.id || '',
        companyName: contact?.companyName,
        contactPerson: contact?.contactPerson,
        email: contact?.email,
        phone: contact?.phone,
        tier: contact?.tier || 'bronze',
        totalPurchases: contact?.totalPurchases || 0,
        lastPurchaseDate: contact?.lastPurchaseDate,
        preferences: contact?.preferences as Record<string, unknown>
      },
      negotiation: negotiation ? {
        id: negotiation.id,
        state: negotiation.state,
        products: negotiation.products as any[],
        totalValue: Number(negotiation.totalValue),
        discountApplied: Number(negotiation.discountApplied)
      } : undefined,
      aiState: {
        lastResponse: lastAiMessage?.content || '',
        confidence: lastAiMessage?.metadata?.confidence || 0,
        model: lastAiMessage?.metadata?.model || 'unknown',
        tokensUsed: lastAiMessage?.metadata?.tokensUsed || 0,
        currentIntent: lastAiMessage?.metadata?.intent,
        extractedEntities: lastAiMessage?.metadata?.entities
      },
      history: {
        recentMessages: recentMessages.reverse().map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          timestamp: m.createdAt
        })),
        sentiment: {
          current: this.getLatestSentiment(recentMessages),
          trend: sentimentTrend
        },
        keyTopics
      },
      metadata: {
        language: conversation.language || 'ro',
        timezone: contact?.timezone || 'Europe/Bucharest',
        source: conversation.source || 'web',
        tags: conversation.tags || []
      }
    };
  }
  
  /**
   * Calculate sentiment trend from messages
   */
  private calculateSentimentTrend(
    messages: any[]
  ): 'improving' | 'stable' | 'declining' {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length < 3) return 'stable';
    
    const sentiments = userMessages
      .slice(0, 5)
      .map(m => m.metadata?.sentiment?.score || 0);
    
    const avgFirst = sentiments.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const avgLast = sentiments.slice(-2).reduce((a, b) => a + b, 0) / 2;
    
    if (avgLast - avgFirst > 0.2) return 'improving';
    if (avgFirst - avgLast > 0.2) return 'declining';
    return 'stable';
  }
  
  /**
   * Get latest sentiment score
   */
  private getLatestSentiment(messages: any[]): number {
    const userMessage = messages.find(m => m.role === 'user');
    return userMessage?.metadata?.sentiment?.score || 0;
  }
  
  /**
   * Extract key topics from conversation
   */
  private extractKeyTopics(messages: any[]): string[] {
    const topics = new Set<string>();
    
    for (const message of messages) {
      if (message.metadata?.entities) {
        for (const entity of Object.values(message.metadata.entities)) {
          if (Array.isArray(entity)) {
            entity.forEach(e => topics.add(String(e)));
          } else if (typeof entity === 'string') {
            topics.add(entity);
          }
        }
      }
      
      if (message.metadata?.intent) {
        topics.add(message.metadata.intent);
      }
    }
    
    return Array.from(topics).slice(0, 10);
  }
  
  /**
   * Generate summary for operator
   */
  async generateSummary(context: TakeoverContext): Promise<string> {
    const parts: string[] = [];
    
    // Contact info
    parts.push(`**Client:** ${context.contact.companyName || context.contact.contactPerson || 'Necunoscut'}`);
    parts.push(`**Tier:** ${context.contact.tier.toUpperCase()}`);
    
    if (context.contact.totalPurchases > 0) {
      parts.push(`**Achiziții anterioare:** ${context.contact.totalPurchases} comenzi`);
    }
    
    // Conversation status
    parts.push(`\n**Canal:** ${context.conversation.channel}`);
    parts.push(`**Mesaje:** ${context.conversation.messageCount}`);
    parts.push(`**Sentiment:** ${context.history.sentiment.current > 0 ? '😊 Pozitiv' : context.history.sentiment.current < 0 ? '😞 Negativ' : '😐 Neutru'} (${context.history.sentiment.trend})`);
    
    // Negotiation status
    if (context.negotiation) {
      parts.push(`\n**Negociere activă:** ${context.negotiation.state}`);
      parts.push(`**Valoare:** ${context.negotiation.totalValue.toLocaleString('ro-RO')} RON`);
      parts.push(`**Discount aplicat:** ${context.negotiation.discountApplied}%`);
      parts.push(`**Produse:** ${context.negotiation.products.length}`);
    }
    
    // Key topics
    if (context.history.keyTopics.length > 0) {
      parts.push(`\n**Subiecte cheie:** ${context.history.keyTopics.join(', ')}`);
    }
    
    // AI state
    parts.push(`\n**AI Confidence:** ${(context.aiState.confidence * 100).toFixed(0)}%`);
    if (context.aiState.currentIntent) {
      parts.push(`**Intent detectat:** ${context.aiState.currentIntent}`);
    }
    
    // Last messages
    parts.push(`\n**Ultimele mesaje:**`);
    const lastMessages = context.history.recentMessages.slice(-5);
    for (const msg of lastMessages) {
      const role = msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🤖' : 'ℹ️';
      const content = msg.content.length > 100 
        ? msg.content.substring(0, 100) + '...' 
        : msg.content;
      parts.push(`${role}: ${content}`);
    }
    
    return parts.join('\n');
  }
}
```

### 3.4 Worker N2 Implementation

```typescript
// /packages/workers-n/src/n2-takeover/worker.ts

import { Worker, Queue, Job } from 'bullmq';
import { db } from '@cerniq/database';
import { eq, and } from 'drizzle-orm';
import {
  hitlApprovals,
  conversations,
  messages,
  takeoverSessions
} from '@cerniq/database/schema';
import { redis } from '@cerniq/redis';
import { aiAgentLogger as logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import {
  HitlApprovalType,
  HitlStatus,
  HitlPriority,
  TakeoverPayload,
  TakeoverResult
} from '../types/shared';
import { TakeoverState, TakeoverReason } from './states';
import { TakeoverContextPreserver, TakeoverContext } from './context-preserver';
import { NotificationService } from '../services/notification';
import { OperatorAssigner } from '../services/operator-assigner';

// -----------------------------------------------------------------------------
// Queue Configuration
// -----------------------------------------------------------------------------

const QUEUE_NAME = 'human:takeover';

export const takeoverQueue = new Queue<TakeoverPayload>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

// -----------------------------------------------------------------------------
// Database Schema for Takeover Sessions
// -----------------------------------------------------------------------------

/*
CREATE TABLE takeover_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    
    -- State
    state VARCHAR(30) NOT NULL DEFAULT 'takeover_pending',
    previous_state VARCHAR(30),
    
    -- Reason
    reason VARCHAR(50) NOT NULL,
    requested_by VARCHAR(20) NOT NULL,  -- user, system, guardrail, operator
    
    -- Operator
    operator_id UUID REFERENCES users(id),
    operator_assigned_at TIMESTAMPTZ,
    
    -- Context
    ai_context JSONB,
    conversation_summary TEXT,
    
    -- Timing
    takeover_started_at TIMESTAMPTZ,
    takeover_ended_at TIMESTAMPTZ,
    
    -- Stats
    messages_handled INT DEFAULT 0,
    duration_seconds INT,
    
    -- Handback
    handback_to_ai BOOLEAN DEFAULT FALSE,
    handback_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_takeover_sessions_conversation ON takeover_sessions(conversation_id);
CREATE INDEX idx_takeover_sessions_operator ON takeover_sessions(operator_id) WHERE state = 'human_active';
CREATE INDEX idx_takeover_sessions_state ON takeover_sessions(state);
*/

// -----------------------------------------------------------------------------
// Worker Implementation
// -----------------------------------------------------------------------------

export class WorkerN2Takeover {
  private worker: Worker<TakeoverPayload, TakeoverResult>;
  private contextPreserver: TakeoverContextPreserver;
  private notificationService: NotificationService;
  private operatorAssigner: OperatorAssigner;
  
  constructor() {
    this.contextPreserver = new TakeoverContextPreserver();
    this.notificationService = new NotificationService();
    this.operatorAssigner = new OperatorAssigner();
    
    this.worker = new Worker<TakeoverPayload, TakeoverResult>(
      QUEUE_NAME,
      this.processTakeover.bind(this),
      {
        connection: redis,
        concurrency: 20,
        limiter: { max: 200, duration: 1000 }
      }
    );
    
    this.setupEventHandlers();
  }
  
  /**
   * Process takeover request
   */
  private async processTakeover(
    job: Job<TakeoverPayload>
  ): Promise<TakeoverResult> {
    const startTime = Date.now();
    const { data } = job;
    
    logger.info({
      event: 'TAKEOVER_START',
      jobId: job.id,
      conversationId: data.conversationId,
      requestedBy: data.requestedBy
    }, 'Processing takeover');
    
    try {
      // 1. Capture AI context before takeover
      const context = await this.contextPreserver.captureContext(
        data.conversationId,
        data.tenantId
      );
      
      // 2. Generate summary for operator
      const summary = await this.contextPreserver.generateSummary(context);
      
      // 3. Create takeover session
      const session = await this.createTakeoverSession(data, context, summary);
      
      // 4. Create HITL approval
      const approval = await this.createApproval(data, session.id);
      
      // 5. Update conversation state
      await this.updateConversationState(data.conversationId, TakeoverState.TAKEOVER_PENDING);
      
      // 6. Disable AI processing for this conversation
      await this.disableAIProcessing(data.conversationId);
      
      // 7. Assign operator
      const operator = await this.operatorAssigner.findBestOperator(
        data.tenantId,
        {
          channel: context.conversation.channel,
          language: context.metadata.language,
          tier: context.contact.tier,
          hasNegotiation: !!context.negotiation
        }
      );
      
      if (operator) {
        await this.assignOperator(session.id, operator.id);
        await this.updateConversationState(data.conversationId, TakeoverState.HUMAN_ACTIVE);
      }
      
      // 8. Notify user
      await this.notifyUser(data.conversationId, operator?.displayName);
      
      // 9. Notify operator(s)
      await this.notifyOperator(operator, session, context, summary);
      
      // 10. Add to real-time tracking
      await this.trackTakeover(session, operator);
      
      const processingTime = Date.now() - startTime;
      
      metrics.histogramObserve('takeover_processing_time_ms', processingTime, {
        tenant_id: data.tenantId
      });
      metrics.counterInc('takeovers_created_total', {
        tenant_id: data.tenantId,
        reason: data.requestedBy
      });
      
      logger.info({
        event: 'TAKEOVER_COMPLETE',
        sessionId: session.id,
        operatorId: operator?.id,
        processingTime
      }, 'Takeover processed');
      
      return {
        approvalId: approval.id,
        status: operator ? HitlStatus.ASSIGNED : HitlStatus.PENDING,
        operatorId: operator?.id || '',
        takeoverDuration: 0,
        messagesHandled: 0,
        handbackToAi: false
      };
      
    } catch (error) {
      logger.error({
        event: 'TAKEOVER_ERROR',
        error: error.message,
        conversationId: data.conversationId
      }, 'Takeover failed');
      
      metrics.counterInc('takeovers_failed_total', {
        tenant_id: data.tenantId
      });
      
      throw error;
    }
  }
  
  /**
   * Create takeover session
   */
  private async createTakeoverSession(
    data: TakeoverPayload,
    context: TakeoverContext,
    summary: string
  ): Promise<any> {
    const [session] = await db.insert(takeoverSessions).values({
      tenantId: data.tenantId,
      conversationId: data.conversationId,
      state: TakeoverState.TAKEOVER_PENDING,
      reason: data.requestedBy,
      requestedBy: data.requestedBy,
      aiContext: context,
      conversationSummary: summary
    }).returning();
    
    return session;
  }
  
  /**
   * Create HITL approval for tracking
   */
  private async createApproval(
    data: TakeoverPayload,
    sessionId: string
  ): Promise<any> {
    const slaMinutes = data.priority === HitlPriority.CRITICAL ? 5 : 15;
    const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);
    
    const [approval] = await db.insert(hitlApprovals).values({
      tenantId: data.tenantId,
      approvalType: HitlApprovalType.TAKEOVER,
      referenceId: sessionId,
      referenceTable: 'takeover_sessions',
      status: HitlStatus.PENDING,
      priority: data.priority,
      conversationId: data.conversationId,
      contactId: data.contactId,
      reason: `Takeover requested by ${data.requestedBy}`,
      slaDeadline
    }).returning();
    
    return approval;
  }
  
  /**
   * Update conversation state
   */
  private async updateConversationState(
    conversationId: string,
    state: TakeoverState
  ): Promise<void> {
    await db.update(conversations)
      .set({
        takeoverState: state,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId));
  }
  
  /**
   * Disable AI processing for conversation
   */
  private async disableAIProcessing(conversationId: string): Promise<void> {
    // Set flag in Redis for fast checking
    await redis.set(
      `conversation:${conversationId}:ai_disabled`,
      '1',
      'EX',
      86400  // 24 hours
    );
    
    // Update database
    await db.update(conversations)
      .set({ aiEnabled: false })
      .where(eq(conversations.id, conversationId));
  }
  
  /**
   * Assign operator to session
   */
  private async assignOperator(
    sessionId: string,
    operatorId: string
  ): Promise<void> {
    await db.update(takeoverSessions)
      .set({
        operatorId,
        operatorAssignedAt: new Date(),
        state: TakeoverState.HUMAN_ACTIVE,
        takeoverStartedAt: new Date()
      })
      .where(eq(takeoverSessions.id, sessionId));
  }
  
  /**
   * Notify user about takeover
   */
  private async notifyUser(
    conversationId: string,
    operatorName?: string
  ): Promise<void> {
    const message = operatorName
      ? `Un consultant, ${operatorName}, va prelua conversația. Vă mulțumim pentru răbdare.`
      : `Un consultant va prelua conversația în curând. Vă mulțumim pentru răbdare.`;
    
    await db.insert(messages).values({
      conversationId,
      role: 'system',
      content: message,
      messageType: 'takeover_notice'
    });
  }
  
  /**
   * Notify operator about takeover
   */
  private async notifyOperator(
    operator: any,
    session: any,
    context: TakeoverContext,
    summary: string
  ): Promise<void> {
    const notification = {
      type: 'takeover',
      sessionId: session.id,
      conversationId: session.conversationId,
      contactName: context.contact.companyName || context.contact.contactPerson,
      tier: context.contact.tier,
      summary,
      channel: context.conversation.channel,
      hasNegotiation: !!context.negotiation,
      negotiationValue: context.negotiation?.totalValue
    };
    
    if (operator) {
      await this.notificationService.notifyUser(operator.id, notification);
    } else {
      await this.notificationService.notifyAvailableOperators(
        session.tenantId,
        notification
      );
    }
  }
  
  /**
   * Track takeover in real-time
   */
  private async trackTakeover(session: any, operator: any): Promise<void> {
    // Add to pending takeovers
    if (!operator) {
      await redis.zadd(
        `takeover:${session.tenantId}:pending`,
        Date.now(),
        session.id
      );
    }
    
    // Add to operator's active sessions
    if (operator) {
      await redis.sadd(
        `operator:${operator.id}:active_sessions`,
        session.id
      );
    }
    
    // Publish event
    await redis.publish(
      `takeover:${session.tenantId}:events`,
      JSON.stringify({
        type: 'takeover_created',
        session,
        operator
      })
    );
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.debug({ jobId: job.id }, 'Takeover job completed');
    });
    
    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'Takeover job failed');
    });
  }
  
  async start(): Promise<void> {
    logger.info('Worker N2 (Takeover) started');
  }
  
  async stop(): Promise<void> {
    await this.worker.close();
    logger.info('Worker N2 (Takeover) stopped');
  }
}

// -----------------------------------------------------------------------------
// Handback Function
// -----------------------------------------------------------------------------

export async function handbackToAI(
  sessionId: string,
  operatorId: string,
  reason?: string
): Promise<void> {
  const [session] = await db.select()
    .from(takeoverSessions)
    .where(eq(takeoverSessions.id, sessionId))
    .limit(1);
  
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  
  // Calculate duration
  const duration = session.takeoverStartedAt
    ? Math.floor((Date.now() - session.takeoverStartedAt.getTime()) / 1000)
    : 0;
  
  // Update session
  await db.update(takeoverSessions)
    .set({
      state: TakeoverState.AI_ACTIVE,
      takeoverEndedAt: new Date(),
      durationSeconds: duration,
      handbackToAi: true,
      handbackReason: reason,
      updatedAt: new Date()
    })
    .where(eq(takeoverSessions.id, sessionId));
  
  // Re-enable AI processing
  await redis.del(`conversation:${session.conversationId}:ai_disabled`);
  
  await db.update(conversations)
    .set({
      aiEnabled: true,
      takeoverState: TakeoverState.AI_ACTIVE
    })
    .where(eq(conversations.id, session.conversationId));
  
  // Add system message
  await db.insert(messages).values({
    conversationId: session.conversationId,
    role: 'system',
    content: 'Conversația a fost predată înapoi asistentului AI.',
    messageType: 'handback_notice'
  });
  
  // Clean up tracking
  await redis.srem(`operator:${operatorId}:active_sessions`, sessionId);
  
  // Publish event
  await redis.publish(`takeover:${session.tenantId}:events`, JSON.stringify({
    type: 'handback_completed',
    sessionId,
    conversationId: session.conversationId,
    duration
  }));
  
  logger.info({
    event: 'HANDBACK_COMPLETE',
    sessionId,
    duration,
    reason
  }, 'Handback to AI completed');
}
```

---

## 4. Worker N3 - Discount Approval

### 4.1 Overview

Worker N3 gestionează aprobarea discount-urilor care depășesc limitele automate. Sistemul implementează:

- **Threshold Validation** - Verificarea dacă discount-ul necesită aprobare
- **Approval Hierarchy** - Nivele diferite de aprobare (Team Lead → Manager → Director)
- **Business Rules** - Reguli de business pentru aprobare automată
- **Audit Trail** - Înregistrarea completă a deciziilor

### 4.2 Discount Rules Engine

```typescript
// /packages/workers-n/src/n3-discount/rules-engine.ts

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export enum DiscountApprovalLevel {
  AUTO = 'auto',           // Automatic approval
  TEAM_LEAD = 'team_lead', // 15-25%
  MANAGER = 'manager',     // 25-35%
  DIRECTOR = 'director',   // 35-50%
  CEO = 'ceo'              // >50%
}

export interface DiscountRequest {
  tenantId: string;
  negotiationId: string;
  contactId: string;
  productId: string;
  productName: string;
  productCategory: string;
  quantity: number;
  listPrice: number;
  requestedDiscount: number;  // percentage
  requestedPrice: number;
  minimumPrice: number;
  costPrice: number;
  justification?: string;
  
  // Context
  contactTier: 'bronze' | 'silver' | 'gold';
  contactTotalPurchases: number;
  previousDiscounts: Array<{
    discount: number;
    approved: boolean;
    date: Date;
  }>;
  
  // Urgency
  dealValue: number;
  deadline?: Date;
  competitorPrice?: number;
}

export interface DiscountApprovalRule {
  id: string;
  name: string;
  priority: number;
  conditions: DiscountCondition[];
  action: DiscountAction;
  enabled: boolean;
}

export interface DiscountCondition {
  field: keyof DiscountRequest | string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in';
  value: any;
}

export interface DiscountAction {
  type: 'auto_approve' | 'require_approval' | 'reject';
  approvalLevel?: DiscountApprovalLevel;
  maxDiscount?: number;
  message?: string;
}

// -----------------------------------------------------------------------------
// Default Rules
// -----------------------------------------------------------------------------

export const DEFAULT_DISCOUNT_RULES: DiscountApprovalRule[] = [
  // Rule 1: Auto-approve small discounts for Gold customers
  {
    id: 'gold-auto-15',
    name: 'Gold Customer Auto Approval',
    priority: 100,
    conditions: [
      { field: 'contactTier', operator: 'eq', value: 'gold' },
      { field: 'requestedDiscount', operator: 'lte', value: 15 }
    ],
    action: {
      type: 'auto_approve',
      message: 'Aprobare automată pentru client Gold cu discount ≤15%'
    },
    enabled: true
  },
  
  // Rule 2: Auto-approve small discounts for any customer
  {
    id: 'any-auto-10',
    name: 'Standard Auto Approval',
    priority: 90,
    conditions: [
      { field: 'requestedDiscount', operator: 'lte', value: 10 }
    ],
    action: {
      type: 'auto_approve',
      message: 'Aprobare automată pentru discount ≤10%'
    },
    enabled: true
  },
  
  // Rule 3: High volume auto-approve
  {
    id: 'volume-auto-20',
    name: 'High Volume Auto Approval',
    priority: 85,
    conditions: [
      { field: 'quantity', operator: 'gte', value: 100 },
      { field: 'requestedDiscount', operator: 'lte', value: 20 }
    ],
    action: {
      type: 'auto_approve',
      message: 'Aprobare automată pentru volum mare (≥100 unități)'
    },
    enabled: true
  },
  
  // Rule 4: Below minimum price - reject
  {
    id: 'below-min-reject',
    name: 'Below Minimum Price',
    priority: 200,
    conditions: [
      { field: 'requestedPrice', operator: 'lt', value: 'minimumPrice' }
    ],
    action: {
      type: 'reject',
      message: 'Prețul solicitat este sub minimul permis'
    },
    enabled: true
  },
  
  // Rule 5: Below cost price - CEO approval
  {
    id: 'below-cost-ceo',
    name: 'Below Cost Approval',
    priority: 190,
    conditions: [
      { field: 'requestedPrice', operator: 'lt', value: 'costPrice' }
    ],
    action: {
      type: 'require_approval',
      approvalLevel: DiscountApprovalLevel.CEO,
      message: 'Vânzare sub cost - necesită aprobare CEO'
    },
    enabled: true
  },
  
  // Rule 6: Team Lead approval (15-25%)
  {
    id: 'team-lead-15-25',
    name: 'Team Lead Approval Required',
    priority: 50,
    conditions: [
      { field: 'requestedDiscount', operator: 'between', value: [15, 25] }
    ],
    action: {
      type: 'require_approval',
      approvalLevel: DiscountApprovalLevel.TEAM_LEAD,
      message: 'Discount 15-25% necesită aprobare Team Lead'
    },
    enabled: true
  },
  
  // Rule 7: Manager approval (25-35%)
  {
    id: 'manager-25-35',
    name: 'Manager Approval Required',
    priority: 40,
    conditions: [
      { field: 'requestedDiscount', operator: 'between', value: [25, 35] }
    ],
    action: {
      type: 'require_approval',
      approvalLevel: DiscountApprovalLevel.MANAGER,
      message: 'Discount 25-35% necesită aprobare Manager'
    },
    enabled: true
  },
  
  // Rule 8: Director approval (35-50%)
  {
    id: 'director-35-50',
    name: 'Director Approval Required',
    priority: 30,
    conditions: [
      { field: 'requestedDiscount', operator: 'between', value: [35, 50] }
    ],
    action: {
      type: 'require_approval',
      approvalLevel: DiscountApprovalLevel.DIRECTOR,
      message: 'Discount 35-50% necesită aprobare Director'
    },
    enabled: true
  },
  
  // Rule 9: CEO approval (>50%)
  {
    id: 'ceo-50-plus',
    name: 'CEO Approval Required',
    priority: 20,
    conditions: [
      { field: 'requestedDiscount', operator: 'gt', value: 50 }
    ],
    action: {
      type: 'require_approval',
      approvalLevel: DiscountApprovalLevel.CEO,
      message: 'Discount >50% necesită aprobare CEO'
    },
    enabled: true
  },
  
  // Rule 10: Competitor match - Manager
  {
    id: 'competitor-match',
    name: 'Competitor Price Match',
    priority: 60,
    conditions: [
      { field: 'competitorPrice', operator: 'gt', value: 0 },
      { field: 'requestedPrice', operator: 'lte', value: 'competitorPrice' }
    ],
    action: {
      type: 'require_approval',
      approvalLevel: DiscountApprovalLevel.MANAGER,
      message: 'Matching competitor price - Manager approval'
    },
    enabled: true
  }
];

// -----------------------------------------------------------------------------
// Rules Engine
// -----------------------------------------------------------------------------

export class DiscountRulesEngine {
  private rules: DiscountApprovalRule[];
  
  constructor(customRules?: DiscountApprovalRule[]) {
    this.rules = customRules || DEFAULT_DISCOUNT_RULES;
    // Sort by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Evaluate discount request against rules
   */
  evaluate(request: DiscountRequest): {
    requiresApproval: boolean;
    approvalLevel?: DiscountApprovalLevel;
    autoApproved: boolean;
    rejected: boolean;
    matchedRule?: DiscountApprovalRule;
    message: string;
  } {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      if (this.matchesConditions(rule.conditions, request)) {
        return {
          requiresApproval: rule.action.type === 'require_approval',
          approvalLevel: rule.action.approvalLevel,
          autoApproved: rule.action.type === 'auto_approve',
          rejected: rule.action.type === 'reject',
          matchedRule: rule,
          message: rule.action.message || ''
        };
      }
    }
    
    // Default: require Team Lead approval
    return {
      requiresApproval: true,
      approvalLevel: DiscountApprovalLevel.TEAM_LEAD,
      autoApproved: false,
      rejected: false,
      message: 'Default: necesită aprobare Team Lead'
    };
  }
  
  /**
   * Check if all conditions match
   */
  private matchesConditions(
    conditions: DiscountCondition[],
    request: DiscountRequest
  ): boolean {
    return conditions.every(cond => this.matchCondition(cond, request));
  }
  
  /**
   * Match a single condition
   */
  private matchCondition(
    condition: DiscountCondition,
    request: DiscountRequest
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, request);
    const compareValue = this.getCompareValue(condition.value, request);
    
    if (fieldValue === undefined) return false;
    
    switch (condition.operator) {
      case 'eq':
        return fieldValue === compareValue;
      case 'neq':
        return fieldValue !== compareValue;
      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > compareValue;
      case 'gte':
        return typeof fieldValue === 'number' && fieldValue >= compareValue;
      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < compareValue;
      case 'lte':
        return typeof fieldValue === 'number' && fieldValue <= compareValue;
      case 'between':
        if (!Array.isArray(compareValue) || compareValue.length !== 2) return false;
        return typeof fieldValue === 'number' &&
               fieldValue >= compareValue[0] &&
               fieldValue <= compareValue[1];
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      default:
        return false;
    }
  }
  
  /**
   * Get field value from request
   */
  private getFieldValue(field: string, request: DiscountRequest): any {
    if (field.includes('.')) {
      return field.split('.').reduce((obj, key) => obj?.[key], request as any);
    }
    return (request as any)[field];
  }
  
  /**
   * Get compare value (may reference another field)
   */
  private getCompareValue(value: any, request: DiscountRequest): any {
    if (typeof value === 'string' && value in request) {
      return (request as any)[value];
    }
    return value;
  }
  
  /**
   * Calculate maximum allowed discount based on context
   */
  calculateMaxDiscount(request: DiscountRequest): {
    maxAuto: number;
    maxTeamLead: number;
    maxManager: number;
    maxDirector: number;
    absolute: number;
  } {
    // Base limits
    let maxAuto = 10;
    let maxTeamLead = 25;
    let maxManager = 35;
    let maxDirector = 50;
    
    // Adjust for customer tier
    if (request.contactTier === 'gold') {
      maxAuto += 5;
      maxTeamLead += 5;
      maxManager += 5;
    } else if (request.contactTier === 'silver') {
      maxAuto += 2;
      maxTeamLead += 2;
    }
    
    // Adjust for volume
    if (request.quantity >= 100) {
      maxAuto += 5;
      maxTeamLead += 5;
    }
    
    // Calculate absolute max (still profitable)
    const marginPercent = ((request.listPrice - request.costPrice) / request.listPrice) * 100;
    const absolute = Math.min(marginPercent - 5, 70);  // Keep at least 5% margin
    
    return {
      maxAuto: Math.min(maxAuto, absolute),
      maxTeamLead: Math.min(maxTeamLead, absolute),
      maxManager: Math.min(maxManager, absolute),
      maxDirector: Math.min(maxDirector, absolute),
      absolute
    };
  }
}
```

### 4.3 Worker N3 Implementation

```typescript
// /packages/workers-n/src/n3-discount/worker.ts

import { Worker, Queue, Job } from 'bullmq';
import { db } from '@cerniq/database';
import { eq, and } from 'drizzle-orm';
import {
  hitlApprovals,
  negotiations,
  discountApprovals,
  users
} from '@cerniq/database/schema';
import { redis } from '@cerniq/redis';
import { aiAgentLogger as logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import {
  HitlApprovalType,
  HitlStatus,
  HitlPriority,
  HitlResolution,
  DiscountApprovalPayload,
  DiscountApprovalResult
} from '../types/shared';
import {
  DiscountRulesEngine,
  DiscountApprovalLevel,
  DiscountRequest
} from './rules-engine';
import { NotificationService } from '../services/notification';

// -----------------------------------------------------------------------------
// Queue Configuration
// -----------------------------------------------------------------------------

const QUEUE_NAME = 'human:approve-discount';

export const discountApprovalQueue = new Queue<DiscountApprovalPayload>(
  QUEUE_NAME,
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000
    }
  }
);

// -----------------------------------------------------------------------------
// Database Schema for Discount Approvals
// -----------------------------------------------------------------------------

/*
CREATE TABLE discount_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    negotiation_id UUID NOT NULL REFERENCES negotiations(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    
    -- Product info
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    
    -- Pricing
    list_price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) NOT NULL,
    minimum_price DECIMAL(12,2) NOT NULL,
    
    -- Request
    requested_discount DECIMAL(5,2) NOT NULL,
    requested_price DECIMAL(12,2) NOT NULL,
    
    -- Approval
    approval_level VARCHAR(20) NOT NULL,
    approved_discount DECIMAL(5,2),
    approved_price DECIMAL(12,2),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    auto_approved BOOLEAN DEFAULT FALSE,
    
    -- Approvers
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Justification
    request_justification TEXT,
    approval_notes TEXT,
    rejection_reason TEXT,
    
    -- Validity
    valid_until TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discount_approvals_negotiation ON discount_approvals(negotiation_id);
CREATE INDEX idx_discount_approvals_status ON discount_approvals(status) WHERE status = 'pending';
CREATE INDEX idx_discount_approvals_level ON discount_approvals(approval_level, status);
*/

// -----------------------------------------------------------------------------
// Worker Implementation
// -----------------------------------------------------------------------------

export class WorkerN3DiscountApproval {
  private worker: Worker<DiscountApprovalPayload, DiscountApprovalResult>;
  private rulesEngine: DiscountRulesEngine;
  private notificationService: NotificationService;
  
  constructor() {
    this.rulesEngine = new DiscountRulesEngine();
    this.notificationService = new NotificationService();
    
    this.worker = new Worker<DiscountApprovalPayload, DiscountApprovalResult>(
      QUEUE_NAME,
      this.processDiscountApproval.bind(this),
      {
        connection: redis,
        concurrency: 20,
        limiter: { max: 100, duration: 1000 }
      }
    );
    
    this.setupEventHandlers();
  }
  
  /**
   * Process discount approval request
   */
  private async processDiscountApproval(
    job: Job<DiscountApprovalPayload>
  ): Promise<DiscountApprovalResult> {
    const startTime = Date.now();
    const { data } = job;
    
    logger.info({
      event: 'DISCOUNT_APPROVAL_START',
      jobId: job.id,
      negotiationId: data.negotiationId,
      requestedDiscount: data.requestedDiscount
    }, 'Processing discount approval');
    
    try {
      // Build request context
      const request = await this.buildDiscountRequest(data);
      
      // Evaluate against rules
      const evaluation = this.rulesEngine.evaluate(request);
      
      // Handle rejected
      if (evaluation.rejected) {
        return this.handleRejection(data, evaluation.message);
      }
      
      // Handle auto-approved
      if (evaluation.autoApproved) {
        return this.handleAutoApproval(data, request, evaluation);
      }
      
      // Handle requires approval
      return this.handleRequiresApproval(data, request, evaluation);
      
    } catch (error) {
      logger.error({
        event: 'DISCOUNT_APPROVAL_ERROR',
        error: error.message,
        negotiationId: data.negotiationId
      }, 'Discount approval failed');
      
      metrics.counterInc('discount_approvals_failed_total', {
        tenant_id: data.tenantId
      });
      
      throw error;
    }
  }
  
  /**
   * Build full discount request from payload
   */
  private async buildDiscountRequest(
    data: DiscountApprovalPayload
  ): Promise<DiscountRequest> {
    // Get product info
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);
    
    // Get contact info
    const [contact] = await db.select()
      .from(contacts)
      .where(eq(contacts.id, data.contactId))
      .limit(1);
    
    // Get negotiation
    const [negotiation] = await db.select()
      .from(negotiations)
      .where(eq(negotiations.id, data.negotiationId))
      .limit(1);
    
    const requestedPrice = data.currentPrice * (1 - data.requestedDiscount / 100);
    
    return {
      tenantId: data.tenantId,
      negotiationId: data.negotiationId,
      contactId: data.contactId,
      productId: data.productId,
      productName: product?.name || 'Unknown',
      productCategory: product?.category || 'general',
      quantity: data.quantity,
      listPrice: data.currentPrice,
      requestedDiscount: data.requestedDiscount,
      requestedPrice,
      minimumPrice: data.minimumPrice,
      costPrice: product?.costPrice || data.minimumPrice,
      justification: data.justification,
      contactTier: contact?.tier || 'bronze',
      contactTotalPurchases: contact?.totalPurchases || 0,
      previousDiscounts: data.discountHistory,
      dealValue: negotiation?.totalValue || data.currentPrice * data.quantity,
      deadline: negotiation?.deadline,
      competitorPrice: undefined  // Could be fetched from negotiation context
    };
  }
  
  /**
   * Handle rejected discount
   */
  private async handleRejection(
    data: DiscountApprovalPayload,
    reason: string
  ): Promise<DiscountApprovalResult> {
    // Create record
    const [approval] = await db.insert(discountApprovals).values({
      tenantId: data.tenantId,
      negotiationId: data.negotiationId,
      contactId: data.contactId,
      productId: data.productId,
      quantity: data.quantity,
      listPrice: data.currentPrice,
      costPrice: data.minimumPrice,
      minimumPrice: data.minimumPrice,
      requestedDiscount: data.requestedDiscount,
      requestedPrice: data.currentPrice * (1 - data.requestedDiscount / 100),
      approvalLevel: 'rejected',
      status: 'rejected',
      autoApproved: false,
      rejectionReason: reason
    }).returning();
    
    metrics.counterInc('discount_approvals_rejected_total', {
      tenant_id: data.tenantId
    });
    
    logger.info({
      event: 'DISCOUNT_REJECTED',
      approvalId: approval.id,
      reason
    }, 'Discount rejected');
    
    return {
      approvalId: approval.id,
      status: HitlStatus.RESOLVED,
      resolution: HitlResolution.REJECTED,
      approved: false,
      resolutionNotes: reason
    };
  }
  
  /**
   * Handle auto-approved discount
   */
  private async handleAutoApproval(
    data: DiscountApprovalPayload,
    request: DiscountRequest,
    evaluation: any
  ): Promise<DiscountApprovalResult> {
    const approvedPrice = request.listPrice * (1 - request.requestedDiscount / 100);
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 days
    
    // Create approval record
    const [approval] = await db.insert(discountApprovals).values({
      tenantId: data.tenantId,
      negotiationId: data.negotiationId,
      contactId: data.contactId,
      productId: data.productId,
      productName: request.productName,
      quantity: data.quantity,
      listPrice: request.listPrice,
      costPrice: request.costPrice,
      minimumPrice: request.minimumPrice,
      requestedDiscount: data.requestedDiscount,
      requestedPrice: request.requestedPrice,
      approvalLevel: 'auto',
      approvedDiscount: data.requestedDiscount,
      approvedPrice,
      status: 'approved',
      autoApproved: true,
      approvedAt: new Date(),
      approvalNotes: evaluation.message,
      validUntil
    }).returning();
    
    // Update negotiation with approved discount
    await this.applyDiscountToNegotiation(
      data.negotiationId,
      data.productId,
      data.requestedDiscount,
      approvedPrice
    );
    
    metrics.counterInc('discount_approvals_auto_total', {
      tenant_id: data.tenantId
    });
    
    logger.info({
      event: 'DISCOUNT_AUTO_APPROVED',
      approvalId: approval.id,
      discount: data.requestedDiscount
    }, 'Discount auto-approved');
    
    return {
      approvalId: approval.id,
      status: HitlStatus.RESOLVED,
      resolution: HitlResolution.APPROVED,
      approved: true,
      approvedDiscount: data.requestedDiscount,
      validUntil,
      resolutionNotes: evaluation.message
    };
  }
  
  /**
   * Handle discount requiring manual approval
   */
  private async handleRequiresApproval(
    data: DiscountApprovalPayload,
    request: DiscountRequest,
    evaluation: any
  ): Promise<DiscountApprovalResult> {
    // Create approval record
    const [approval] = await db.insert(discountApprovals).values({
      tenantId: data.tenantId,
      negotiationId: data.negotiationId,
      contactId: data.contactId,
      productId: data.productId,
      productName: request.productName,
      quantity: data.quantity,
      listPrice: request.listPrice,
      costPrice: request.costPrice,
      minimumPrice: request.minimumPrice,
      requestedDiscount: data.requestedDiscount,
      requestedPrice: request.requestedPrice,
      approvalLevel: evaluation.approvalLevel,
      status: 'pending',
      autoApproved: false,
      requestJustification: data.justification
    }).returning();
    
    // Create HITL approval
    const slaMinutes = this.getSLAForLevel(evaluation.approvalLevel);
    const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);
    
    const [hitlApproval] = await db.insert(hitlApprovals).values({
      tenantId: data.tenantId,
      approvalType: HitlApprovalType.DISCOUNT,
      referenceId: approval.id,
      referenceTable: 'discount_approvals',
      status: HitlStatus.PENDING,
      priority: this.getPriorityForLevel(evaluation.approvalLevel),
      negotiationId: data.negotiationId,
      contactId: data.contactId,
      originalContent: {
        request,
        evaluation,
        maxDiscounts: this.rulesEngine.calculateMaxDiscount(request)
      },
      reason: evaluation.message,
      slaDeadline
    }).returning();
    
    // Find and notify appropriate approver
    const approver = await this.findApprover(data.tenantId, evaluation.approvalLevel);
    if (approver) {
      await this.notifyApprover(approver, approval, request, evaluation);
    }
    
    // Add to real-time queue
    await this.addToApprovalQueue(hitlApproval);
    
    metrics.counterInc('discount_approvals_pending_total', {
      tenant_id: data.tenantId,
      level: evaluation.approvalLevel
    });
    
    logger.info({
      event: 'DISCOUNT_APPROVAL_REQUIRED',
      approvalId: approval.id,
      hitlApprovalId: hitlApproval.id,
      level: evaluation.approvalLevel
    }, 'Discount requires approval');
    
    return {
      approvalId: hitlApproval.id,
      status: HitlStatus.PENDING,
      approved: false
    };
  }
  
  /**
   * Apply approved discount to negotiation
   */
  private async applyDiscountToNegotiation(
    negotiationId: string,
    productId: string,
    discount: number,
    finalPrice: number
  ): Promise<void> {
    const [negotiation] = await db.select()
      .from(negotiations)
      .where(eq(negotiations.id, negotiationId))
      .limit(1);
    
    if (!negotiation) return;
    
    // Update product in negotiation items
    const products = negotiation.products as any[];
    const productIndex = products.findIndex(p => p.productId === productId);
    
    if (productIndex >= 0) {
      products[productIndex].discount = discount;
      products[productIndex].finalPrice = finalPrice;
      products[productIndex].approvedAt = new Date();
    }
    
    // Recalculate total
    const totalValue = products.reduce((sum, p) => {
      return sum + (p.finalPrice || p.unitPrice) * p.quantity;
    }, 0);
    
    await db.update(negotiations)
      .set({
        products,
        totalValue,
        discountApplied: discount,
        updatedAt: new Date()
      })
      .where(eq(negotiations.id, negotiationId));
  }
  
  /**
   * Get SLA for approval level
   */
  private getSLAForLevel(level: DiscountApprovalLevel): number {
    const slaMinutes: Record<DiscountApprovalLevel, number> = {
      [DiscountApprovalLevel.AUTO]: 0,
      [DiscountApprovalLevel.TEAM_LEAD]: 60,
      [DiscountApprovalLevel.MANAGER]: 120,
      [DiscountApprovalLevel.DIRECTOR]: 240,
      [DiscountApprovalLevel.CEO]: 480
    };
    return slaMinutes[level] || 60;
  }
  
  /**
   * Get priority for approval level
   */
  private getPriorityForLevel(level: DiscountApprovalLevel): HitlPriority {
    const priorities: Record<DiscountApprovalLevel, HitlPriority> = {
      [DiscountApprovalLevel.AUTO]: HitlPriority.LOW,
      [DiscountApprovalLevel.TEAM_LEAD]: HitlPriority.MEDIUM,
      [DiscountApprovalLevel.MANAGER]: HitlPriority.HIGH,
      [DiscountApprovalLevel.DIRECTOR]: HitlPriority.HIGH,
      [DiscountApprovalLevel.CEO]: HitlPriority.CRITICAL
    };
    return priorities[level] || HitlPriority.MEDIUM;
  }
  
  /**
   * Find appropriate approver
   */
  private async findApprover(
    tenantId: string,
    level: DiscountApprovalLevel
  ): Promise<any> {
    const roleMap: Record<DiscountApprovalLevel, string[]> = {
      [DiscountApprovalLevel.AUTO]: [],
      [DiscountApprovalLevel.TEAM_LEAD]: ['team_lead', 'manager'],
      [DiscountApprovalLevel.MANAGER]: ['manager', 'director'],
      [DiscountApprovalLevel.DIRECTOR]: ['director', 'ceo'],
      [DiscountApprovalLevel.CEO]: ['ceo']
    };
    
    const roles = roleMap[level];
    if (roles.length === 0) return null;
    
    // Find available user with appropriate role
    const [approver] = await db.select()
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        inArray(users.role, roles),
        eq(users.isActive, true)
      ))
      .limit(1);
    
    return approver;
  }
  
  /**
   * Notify approver
   */
  private async notifyApprover(
    approver: any,
    approval: any,
    request: DiscountRequest,
    evaluation: any
  ): Promise<void> {
    const notification = {
      type: 'discount_approval',
      approvalId: approval.id,
      level: evaluation.approvalLevel,
      productName: request.productName,
      quantity: request.quantity,
      requestedDiscount: request.requestedDiscount,
      listPrice: request.listPrice,
      requestedPrice: request.requestedPrice,
      minimumPrice: request.minimumPrice,
      justification: request.justification,
      contactName: request.contactId,  // Would need to fetch
      dealValue: request.dealValue
    };
    
    await this.notificationService.notifyUser(approver.id, notification);
    
    // Also send email for high-value deals
    if (request.dealValue > 10000) {
      await this.notificationService.sendEmail(approver.email, {
        subject: `Aprobare discount ${request.requestedDiscount}% - ${request.productName}`,
        template: 'discount-approval-request',
        data: notification
      });
    }
  }
  
  /**
   * Add to real-time approval queue
   */
  private async addToApprovalQueue(approval: any): Promise<void> {
    await redis.zadd(
      `discount:${approval.tenantId}:pending`,
      Date.now(),
      approval.id
    );
    
    await redis.publish(
      `discount:${approval.tenantId}:events`,
      JSON.stringify({
        type: 'approval_created',
        approval
      })
    );
  }
  
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.debug({ jobId: job.id }, 'Discount approval job completed');
    });
    
    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'Discount approval job failed');
    });
  }
  
  async start(): Promise<void> {
    logger.info('Worker N3 (Discount Approval) started');
  }
  
  async stop(): Promise<void> {
    await this.worker.close();
    logger.info('Worker N3 (Discount Approval) stopped');
  }
}

// -----------------------------------------------------------------------------
// Approval/Rejection Functions
// -----------------------------------------------------------------------------

export async function approveDiscount(
  approvalId: string,
  approverId: string,
  approvedDiscount?: number,
  notes?: string
): Promise<void> {
  const [approval] = await db.select()
    .from(discountApprovals)
    .where(eq(discountApprovals.id, approvalId))
    .limit(1);
  
  if (!approval) throw new Error(`Approval ${approvalId} not found`);
  
  const finalDiscount = approvedDiscount ?? approval.requestedDiscount;
  const approvedPrice = Number(approval.listPrice) * (1 - finalDiscount / 100);
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  await db.update(discountApprovals)
    .set({
      approvedDiscount: finalDiscount,
      approvedPrice,
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
      approvalNotes: notes,
      validUntil,
      updatedAt: new Date()
    })
    .where(eq(discountApprovals.id, approvalId));
  
  // Update HITL approval
  await db.update(hitlApprovals)
    .set({
      status: HitlStatus.RESOLVED,
      resolvedBy: approverId,
      resolvedAt: new Date(),
      resolution: HitlResolution.APPROVED,
      resolutionNotes: notes
    })
    .where(and(
      eq(hitlApprovals.referenceId, approvalId),
      eq(hitlApprovals.referenceTable, 'discount_approvals')
    ));
  
  // Apply to negotiation
  const workerN3 = new WorkerN3DiscountApproval();
  await workerN3.applyDiscountToNegotiation(
    approval.negotiationId,
    approval.productId,
    finalDiscount,
    approvedPrice
  );
  
  logger.info({
    event: 'DISCOUNT_APPROVED',
    approvalId,
    approverId,
    finalDiscount
  }, 'Discount approved');
}

export async function rejectDiscount(
  approvalId: string,
  rejecterId: string,
  reason: string
): Promise<void> {
  await db.update(discountApprovals)
    .set({
      status: 'rejected',
      approvedBy: rejecterId,
      approvedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date()
    })
    .where(eq(discountApprovals.id, approvalId));
  
  await db.update(hitlApprovals)
    .set({
      status: HitlStatus.RESOLVED,
      resolvedBy: rejecterId,
      resolvedAt: new Date(),
      resolution: HitlResolution.REJECTED,
      resolutionNotes: reason
    })
    .where(and(
      eq(hitlApprovals.referenceId, approvalId),
      eq(hitlApprovals.referenceTable, 'discount_approvals')
    ));
  
  logger.info({
    event: 'DISCOUNT_REJECTED',
    approvalId,
    rejecterId,
    reason
  }, 'Discount rejected');
}
```

---

## Section 5: Worker N4 - Document Review (human:review-document)

### 5.1 Document Types for Review

Worker N4 handles validation and approval of business documents before they are emitted/sent to customers.

```typescript
// =============================================================================
// WORKER N4 - DOCUMENT REVIEW SYSTEM
// =============================================================================
// File: src/workers/etapa3/n4-document-review/types.ts
// Purpose: Document review workflow before emission
// Author: Cerniq Development Team
// Created: 2026-01-18
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Document Types & Categories
// -----------------------------------------------------------------------------

export enum DocumentTypeForReview {
  // Financial Documents
  PROFORMA_INVOICE = 'PROFORMA_INVOICE',
  INVOICE = 'INVOICE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  RECEIPT = 'RECEIPT',
  
  // Commercial Documents
  QUOTATION = 'QUOTATION',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
  RETURN_NOTE = 'RETURN_NOTE',
  
  // Contracts
  CONTRACT = 'CONTRACT',
  CONTRACT_AMENDMENT = 'CONTRACT_AMENDMENT',
  SERVICE_AGREEMENT = 'SERVICE_AGREEMENT',
  
  // Agricultural-Specific (Romania)
  APIA_DECLARATION = 'APIA_DECLARATION',
  SUBSIDY_APPLICATION = 'SUBSIDY_APPLICATION',
  PHYTOSANITARY_CERTIFICATE = 'PHYTOSANITARY_CERTIFICATE'
}

export enum DocumentReviewStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  CORRECTIONS_REQUESTED = 'CORRECTIONS_REQUESTED',
  CORRECTIONS_APPLIED = 'CORRECTIONS_APPLIED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum DocumentReviewPriority {
  URGENT = 'URGENT',        // SLA: 15 min - e-Factura deadline approaching
  HIGH = 'HIGH',            // SLA: 30 min - Large value, important client
  NORMAL = 'NORMAL',        // SLA: 2 hours - Standard documents
  LOW = 'LOW'               // SLA: 24 hours - Internal documents
}

// -----------------------------------------------------------------------------
// Review Triggers & Rules
// -----------------------------------------------------------------------------

export interface DocumentReviewTrigger {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  documentTypes: DocumentTypeForReview[];
  conditions: ReviewCondition[];
  priority: DocumentReviewPriority;
  autoApproveIfClean: boolean;
  requiredReviewerRole?: string;
}

export interface ReviewCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'matches' | 'in' | 'between';
  value: any;
  valueField?: string; // Reference to another field
}

export const DEFAULT_REVIEW_TRIGGERS: DocumentReviewTrigger[] = [
  // Financial thresholds
  {
    id: 'high-value-invoice',
    name: 'High Value Invoice',
    description: 'Invoices exceeding 50,000 RON require manual review',
    enabled: true,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.PROFORMA_INVOICE],
    conditions: [
      { field: 'totalValue', operator: 'gte', value: 50000 }
    ],
    priority: DocumentReviewPriority.HIGH,
    autoApproveIfClean: false,
    requiredReviewerRole: 'manager'
  },
  {
    id: 'first-customer-invoice',
    name: 'First Invoice for Customer',
    description: 'First invoice to a new customer requires review',
    enabled: true,
    documentTypes: [DocumentTypeForReview.INVOICE],
    conditions: [
      { field: 'isFirstInvoice', operator: 'eq', value: true }
    ],
    priority: DocumentReviewPriority.NORMAL,
    autoApproveIfClean: true
  },
  {
    id: 'discount-applied',
    name: 'Discount Applied',
    description: 'Documents with discounts > 15% require review',
    enabled: true,
    documentTypes: [
      DocumentTypeForReview.INVOICE,
      DocumentTypeForReview.PROFORMA_INVOICE,
      DocumentTypeForReview.QUOTATION
    ],
    conditions: [
      { field: 'maxDiscountPercent', operator: 'gt', value: 15 }
    ],
    priority: DocumentReviewPriority.NORMAL,
    autoApproveIfClean: false
  },
  {
    id: 'efactura-submission',
    name: 'e-Factura Submission',
    description: 'All e-Factura documents require review before SPV submission',
    enabled: true,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.CREDIT_NOTE],
    conditions: [
      { field: 'requiresEfactura', operator: 'eq', value: true }
    ],
    priority: DocumentReviewPriority.HIGH,
    autoApproveIfClean: true
  },
  {
    id: 'international-transaction',
    name: 'International Transaction',
    description: 'Cross-border transactions require compliance review',
    enabled: true,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.PROFORMA_INVOICE],
    conditions: [
      { field: 'isInternational', operator: 'eq', value: true }
    ],
    priority: DocumentReviewPriority.HIGH,
    autoApproveIfClean: false,
    requiredReviewerRole: 'compliance'
  },
  {
    id: 'contract-large-value',
    name: 'Large Value Contract',
    description: 'Contracts > 100,000 RON require director approval',
    enabled: true,
    documentTypes: [DocumentTypeForReview.CONTRACT, DocumentTypeForReview.SERVICE_AGREEMENT],
    conditions: [
      { field: 'totalValue', operator: 'gte', value: 100000 }
    ],
    priority: DocumentReviewPriority.HIGH,
    autoApproveIfClean: false,
    requiredReviewerRole: 'director'
  },
  {
    id: 'credit-note',
    name: 'Credit Note Review',
    description: 'All credit notes require manager approval',
    enabled: true,
    documentTypes: [DocumentTypeForReview.CREDIT_NOTE],
    conditions: [],
    priority: DocumentReviewPriority.NORMAL,
    autoApproveIfClean: false,
    requiredReviewerRole: 'manager'
  },
  {
    id: 'apia-documents',
    name: 'APIA Documents',
    description: 'Agricultural subsidy documents require expert review',
    enabled: true,
    documentTypes: [
      DocumentTypeForReview.APIA_DECLARATION,
      DocumentTypeForReview.SUBSIDY_APPLICATION
    ],
    conditions: [],
    priority: DocumentReviewPriority.HIGH,
    autoApproveIfClean: false,
    requiredReviewerRole: 'agricultural_expert'
  }
];
```

### 5.2 Document Validation Rules

```typescript
// File: src/workers/etapa3/n4-document-review/validation-rules.ts

import { DocumentTypeForReview } from './types';

// -----------------------------------------------------------------------------
// Validation Rule Types
// -----------------------------------------------------------------------------

export enum ValidationSeverity {
  ERROR = 'ERROR',      // Must be fixed before approval
  WARNING = 'WARNING',  // Should be reviewed, can be overridden
  INFO = 'INFO'         // Informational only
}

export enum ValidationCategory {
  // Data Integrity
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  DATA_FORMAT = 'DATA_FORMAT',
  DATA_CONSISTENCY = 'DATA_CONSISTENCY',
  
  // Business Rules
  PRICING = 'PRICING',
  DISCOUNT = 'DISCOUNT',
  TAX = 'TAX',
  QUANTITY = 'QUANTITY',
  
  // Romanian Compliance
  FISCAL = 'FISCAL',
  EFACTURA = 'EFACTURA',
  TVA = 'TVA',
  
  // Customer Data
  CUSTOMER = 'CUSTOMER',
  ADDRESS = 'ADDRESS',
  CONTACT = 'CONTACT'
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  documentTypes: DocumentTypeForReview[];
  validate: (document: any, context: ValidationContext) => ValidationResult;
  autoFix?: (document: any) => any;
}

export interface ValidationContext {
  tenantId: string;
  tenantSettings: Record<string, any>;
  customerData: any;
  productCatalog: Map<string, any>;
  taxRates: Map<string, number>;
  exchangeRates: Map<string, number>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  autoFixesApplied: AutoFix[];
}

export interface ValidationIssue {
  ruleId: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  field: string;
  message: string;
  messageRo: string; // Romanian translation
  currentValue?: any;
  expectedValue?: any;
  suggestion?: string;
}

export interface AutoFix {
  ruleId: string;
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

// -----------------------------------------------------------------------------
// Validation Rules Implementation
// -----------------------------------------------------------------------------

export const DOCUMENT_VALIDATION_RULES: ValidationRule[] = [
  // -------------------------------------------------------------------------
  // Required Fields
  // -------------------------------------------------------------------------
  {
    id: 'req-001',
    name: 'Customer CUI Required',
    description: 'Business customers must have CUI for B2B invoices',
    category: ValidationCategory.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.PROFORMA_INVOICE],
    validate: (doc, ctx) => {
      const issues: ValidationIssue[] = [];
      
      if (doc.customerType === 'business' && !doc.customerCui) {
        issues.push({
          ruleId: 'req-001',
          severity: ValidationSeverity.ERROR,
          category: ValidationCategory.REQUIRED_FIELD,
          field: 'customerCui',
          message: 'CUI is required for business customers',
          messageRo: 'CUI-ul este obligatoriu pentru clienții persoane juridice'
        });
      }
      
      return {
        valid: issues.length === 0,
        errors: issues.filter(i => i.severity === ValidationSeverity.ERROR),
        warnings: issues.filter(i => i.severity === ValidationSeverity.WARNING),
        info: issues.filter(i => i.severity === ValidationSeverity.INFO),
        autoFixesApplied: []
      };
    }
  },
  
  {
    id: 'req-002',
    name: 'Invoice Number Required',
    description: 'All invoices must have a unique invoice number',
    category: ValidationCategory.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.CREDIT_NOTE],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      
      if (!doc.invoiceNumber || doc.invoiceNumber.trim() === '') {
        issues.push({
          ruleId: 'req-002',
          severity: ValidationSeverity.ERROR,
          category: ValidationCategory.REQUIRED_FIELD,
          field: 'invoiceNumber',
          message: 'Invoice number is required',
          messageRo: 'Numărul facturii este obligatoriu'
        });
      }
      
      return {
        valid: issues.length === 0,
        errors: issues,
        warnings: [],
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  {
    id: 'req-003',
    name: 'Issue Date Required',
    description: 'Document must have an issue date',
    category: ValidationCategory.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    documentTypes: Object.values(DocumentTypeForReview),
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      
      if (!doc.issueDate) {
        issues.push({
          ruleId: 'req-003',
          severity: ValidationSeverity.ERROR,
          category: ValidationCategory.REQUIRED_FIELD,
          field: 'issueDate',
          message: 'Issue date is required',
          messageRo: 'Data emiterii este obligatorie'
        });
      }
      
      return {
        valid: issues.length === 0,
        errors: issues,
        warnings: [],
        info: [],
        autoFixesApplied: []
      };
    }
  },

  // -------------------------------------------------------------------------
  // Data Format Validation
  // -------------------------------------------------------------------------
  {
    id: 'fmt-001',
    name: 'CUI Format',
    description: 'CUI must be valid Romanian format (RO prefix optional)',
    category: ValidationCategory.DATA_FORMAT,
    severity: ValidationSeverity.ERROR,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.PROFORMA_INVOICE],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      const autoFixes: AutoFix[] = [];
      
      if (doc.customerCui) {
        // Remove RO prefix and spaces for validation
        const cleanCui = doc.customerCui.replace(/^RO/i, '').replace(/\s/g, '');
        
        // CUI must be 2-10 digits
        if (!/^\d{2,10}$/.test(cleanCui)) {
          issues.push({
            ruleId: 'fmt-001',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.DATA_FORMAT,
            field: 'customerCui',
            message: `Invalid CUI format: ${doc.customerCui}`,
            messageRo: `Format CUI invalid: ${doc.customerCui}`,
            currentValue: doc.customerCui,
            suggestion: 'CUI should be 2-10 digits, optionally prefixed with RO'
          });
        }
      }
      
      return {
        valid: issues.length === 0,
        errors: issues,
        warnings: [],
        info: [],
        autoFixesApplied: autoFixes
      };
    },
    autoFix: (doc) => {
      if (doc.customerCui) {
        // Normalize CUI: uppercase RO prefix, no spaces
        const normalized = doc.customerCui
          .toUpperCase()
          .replace(/\s/g, '');
        
        return { ...doc, customerCui: normalized };
      }
      return doc;
    }
  },
  
  {
    id: 'fmt-002',
    name: 'IBAN Format',
    description: 'Bank account must be valid IBAN format',
    category: ValidationCategory.DATA_FORMAT,
    severity: ValidationSeverity.ERROR,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.CONTRACT],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      
      const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;
      
      if (doc.supplierIban && !ibanRegex.test(doc.supplierIban.replace(/\s/g, ''))) {
        issues.push({
          ruleId: 'fmt-002',
          severity: ValidationSeverity.ERROR,
          category: ValidationCategory.DATA_FORMAT,
          field: 'supplierIban',
          message: 'Invalid IBAN format',
          messageRo: 'Format IBAN invalid',
          currentValue: doc.supplierIban
        });
      }
      
      return {
        valid: issues.length === 0,
        errors: issues,
        warnings: [],
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  {
    id: 'fmt-003',
    name: 'Email Format',
    description: 'Email addresses must be valid format',
    category: ValidationCategory.DATA_FORMAT,
    severity: ValidationSeverity.WARNING,
    documentTypes: Object.values(DocumentTypeForReview),
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const emailFields = ['customerEmail', 'contactEmail', 'billingEmail'];
      
      for (const field of emailFields) {
        if (doc[field] && !emailRegex.test(doc[field])) {
          issues.push({
            ruleId: 'fmt-003',
            severity: ValidationSeverity.WARNING,
            category: ValidationCategory.DATA_FORMAT,
            field,
            message: `Invalid email format in ${field}`,
            messageRo: `Format email invalid în câmpul ${field}`,
            currentValue: doc[field]
          });
        }
      }
      
      return {
        valid: true, // Warnings don't make it invalid
        errors: [],
        warnings: issues,
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  // -------------------------------------------------------------------------
  // Pricing & Tax Validation
  // -------------------------------------------------------------------------
  {
    id: 'price-001',
    name: 'Total Calculation',
    description: 'Document total must equal sum of line items',
    category: ValidationCategory.PRICING,
    severity: ValidationSeverity.ERROR,
    documentTypes: [
      DocumentTypeForReview.INVOICE,
      DocumentTypeForReview.PROFORMA_INVOICE,
      DocumentTypeForReview.QUOTATION
    ],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      const autoFixes: AutoFix[] = [];
      
      if (doc.lineItems && Array.isArray(doc.lineItems)) {
        const calculatedSubtotal = doc.lineItems.reduce((sum: number, item: any) => {
          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
          return sum + lineTotal;
        }, 0);
        
        // Allow 0.01 tolerance for rounding
        if (Math.abs(calculatedSubtotal - (doc.subtotal || 0)) > 0.01) {
          issues.push({
            ruleId: 'price-001',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.PRICING,
            field: 'subtotal',
            message: 'Subtotal does not match sum of line items',
            messageRo: 'Subtotalul nu corespunde cu suma articolelor',
            currentValue: doc.subtotal,
            expectedValue: calculatedSubtotal.toFixed(2)
          });
        }
      }
      
      return {
        valid: issues.length === 0,
        errors: issues,
        warnings: [],
        info: [],
        autoFixesApplied: autoFixes
      };
    },
    autoFix: (doc) => {
      if (doc.lineItems && Array.isArray(doc.lineItems)) {
        const calculatedSubtotal = doc.lineItems.reduce((sum: number, item: any) => {
          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
          return sum + lineTotal;
        }, 0);
        
        return { ...doc, subtotal: Number(calculatedSubtotal.toFixed(2)) };
      }
      return doc;
    }
  },
  
  {
    id: 'tax-001',
    name: 'TVA Calculation',
    description: 'TVA must be calculated correctly based on rate',
    category: ValidationCategory.TAX,
    severity: ValidationSeverity.ERROR,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.PROFORMA_INVOICE],
    validate: (doc, ctx) => {
      const issues: ValidationIssue[] = [];
      
      if (doc.lineItems && Array.isArray(doc.lineItems)) {
        for (let i = 0; i < doc.lineItems.length; i++) {
          const item = doc.lineItems[i];
          const tvaRate = item.tvaRate || ctx.taxRates.get('standard') || 19;
          const lineSubtotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
          const expectedTva = lineSubtotal * (tvaRate / 100);
          
          if (item.tvaAmount !== undefined && Math.abs(item.tvaAmount - expectedTva) > 0.01) {
            issues.push({
              ruleId: 'tax-001',
              severity: ValidationSeverity.ERROR,
              category: ValidationCategory.TAX,
              field: `lineItems[${i}].tvaAmount`,
              message: `TVA calculation error on line ${i + 1}`,
              messageRo: `Eroare calcul TVA pe linia ${i + 1}`,
              currentValue: item.tvaAmount,
              expectedValue: expectedTva.toFixed(2)
            });
          }
        }
      }
      
      return {
        valid: issues.length === 0,
        errors: issues,
        warnings: [],
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  {
    id: 'tax-002',
    name: 'Valid TVA Rate',
    description: 'TVA rate must be a valid Romanian rate (0, 5, 9, 19)',
    category: ValidationCategory.TVA,
    severity: ValidationSeverity.WARNING,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.PROFORMA_INVOICE],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      const validRates = [0, 5, 9, 19];
      
      if (doc.lineItems && Array.isArray(doc.lineItems)) {
        for (let i = 0; i < doc.lineItems.length; i++) {
          const item = doc.lineItems[i];
          if (item.tvaRate !== undefined && !validRates.includes(item.tvaRate)) {
            issues.push({
              ruleId: 'tax-002',
              severity: ValidationSeverity.WARNING,
              category: ValidationCategory.TVA,
              field: `lineItems[${i}].tvaRate`,
              message: `Non-standard TVA rate on line ${i + 1}: ${item.tvaRate}%`,
              messageRo: `Cotă TVA nestandard pe linia ${i + 1}: ${item.tvaRate}%`,
              currentValue: item.tvaRate,
              suggestion: 'Valid Romanian TVA rates: 0%, 5%, 9%, 19%'
            });
          }
        }
      }
      
      return {
        valid: true, // Warning only
        errors: [],
        warnings: issues,
        info: [],
        autoFixesApplied: []
      };
    }
  },

  // -------------------------------------------------------------------------
  // e-Factura Compliance
  // -------------------------------------------------------------------------
  {
    id: 'efactura-001',
    name: 'e-Factura Required Fields',
    description: 'All required fields for e-Factura submission must be present',
    category: ValidationCategory.EFACTURA,
    severity: ValidationSeverity.ERROR,
    documentTypes: [DocumentTypeForReview.INVOICE],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      
      if (!doc.requiresEfactura) {
        return { valid: true, errors: [], warnings: [], info: [], autoFixesApplied: [] };
      }
      
      const requiredFields = [
        { field: 'supplierCui', label: 'CUI furnizor' },
        { field: 'supplierName', label: 'Denumire furnizor' },
        { field: 'supplierAddress', label: 'Adresă furnizor' },
        { field: 'supplierRegCom', label: 'Nr. Reg. Com. furnizor' },
        { field: 'customerCui', label: 'CUI client' },
        { field: 'customerName', label: 'Denumire client' },
        { field: 'customerAddress', label: 'Adresă client' },
        { field: 'invoiceNumber', label: 'Număr factură' },
        { field: 'issueDate', label: 'Data emiterii' },
        { field: 'dueDate', label: 'Data scadenței' },
        { field: 'currency', label: 'Monedă' }
      ];
      
      for (const { field, label } of requiredFields) {
        if (!doc[field] || doc[field].toString().trim() === '') {
          issues.push({
            ruleId: 'efactura-001',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.EFACTURA,
            field,
            message: `Required field for e-Factura: ${label}`,
            messageRo: `Câmp obligatoriu pentru e-Factura: ${label}`
          });
        }
      }
      
      return {
        valid: issues.length === 0,
        errors: issues,
        warnings: [],
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  {
    id: 'efactura-002',
    name: 'e-Factura Line Items',
    description: 'Each line item must have required e-Factura fields',
    category: ValidationCategory.EFACTURA,
    severity: ValidationSeverity.ERROR,
    documentTypes: [DocumentTypeForReview.INVOICE],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      
      if (!doc.requiresEfactura || !doc.lineItems) {
        return { valid: true, errors: [], warnings: [], info: [], autoFixesApplied: [] };
      }
      
      for (let i = 0; i < doc.lineItems.length; i++) {
        const item = doc.lineItems[i];
        
        if (!item.description || item.description.trim() === '') {
          issues.push({
            ruleId: 'efactura-002',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.EFACTURA,
            field: `lineItems[${i}].description`,
            message: `Line ${i + 1}: Description required for e-Factura`,
            messageRo: `Linia ${i + 1}: Descrierea este obligatorie pentru e-Factura`
          });
        }
        
        if (!item.unitOfMeasure) {
          issues.push({
            ruleId: 'efactura-002',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.EFACTURA,
            field: `lineItems[${i}].unitOfMeasure`,
            message: `Line ${i + 1}: Unit of measure required`,
            messageRo: `Linia ${i + 1}: Unitatea de măsură este obligatorie`
          });
        }
        
        if (item.quantity === undefined || item.quantity <= 0) {
          issues.push({
            ruleId: 'efactura-002',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.EFACTURA,
            field: `lineItems[${i}].quantity`,
            message: `Line ${i + 1}: Valid quantity required`,
            messageRo: `Linia ${i + 1}: Cantitatea validă este obligatorie`
          });
        }
        
        if (item.unitPrice === undefined || item.unitPrice < 0) {
          issues.push({
            ruleId: 'efactura-002',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.EFACTURA,
            field: `lineItems[${i}].unitPrice`,
            message: `Line ${i + 1}: Valid unit price required`,
            messageRo: `Linia ${i + 1}: Prețul unitar valid este obligatoriu`
          });
        }
        
        // NC8 code for certain product categories (agricultural)
        if (item.requiresNc8Code && !item.nc8Code) {
          issues.push({
            ruleId: 'efactura-002',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.EFACTURA,
            field: `lineItems[${i}].nc8Code`,
            message: `Line ${i + 1}: NC8 code required for this product category`,
            messageRo: `Linia ${i + 1}: Codul NC8 este obligatoriu pentru această categorie de produse`
          });
        }
      }
      
      return {
        valid: issues.length === 0,
        errors: issues,
        warnings: [],
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  {
    id: 'efactura-003',
    name: 'e-Factura Deadline',
    description: 'Invoice must be submitted to SPV within 5 business days',
    category: ValidationCategory.EFACTURA,
    severity: ValidationSeverity.WARNING,
    documentTypes: [DocumentTypeForReview.INVOICE],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      
      if (!doc.requiresEfactura || !doc.issueDate) {
        return { valid: true, errors: [], warnings: [], info: [], autoFixesApplied: [] };
      }
      
      const issueDate = new Date(doc.issueDate);
      const now = new Date();
      const businessDaysPassed = calculateBusinessDays(issueDate, now);
      
      if (businessDaysPassed >= 4) {
        issues.push({
          ruleId: 'efactura-003',
          severity: businessDaysPassed >= 5 ? ValidationSeverity.ERROR : ValidationSeverity.WARNING,
          category: ValidationCategory.EFACTURA,
          field: 'issueDate',
          message: `e-Factura deadline approaching: ${businessDaysPassed} business days since issue`,
          messageRo: `Termenul e-Factura se apropie: ${businessDaysPassed} zile lucrătoare de la emitere`,
          suggestion: 'Submit to SPV immediately'
        });
      }
      
      return {
        valid: businessDaysPassed < 5,
        errors: issues.filter(i => i.severity === ValidationSeverity.ERROR),
        warnings: issues.filter(i => i.severity === ValidationSeverity.WARNING),
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  // -------------------------------------------------------------------------
  // Customer Data Validation
  // -------------------------------------------------------------------------
  {
    id: 'cust-001',
    name: 'Customer Address Complete',
    description: 'Customer address must have all required components',
    category: ValidationCategory.ADDRESS,
    severity: ValidationSeverity.WARNING,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.PROFORMA_INVOICE],
    validate: (doc) => {
      const issues: ValidationIssue[] = [];
      
      if (!doc.customerAddress) {
        issues.push({
          ruleId: 'cust-001',
          severity: ValidationSeverity.WARNING,
          category: ValidationCategory.ADDRESS,
          field: 'customerAddress',
          message: 'Customer address is missing',
          messageRo: 'Adresa clientului lipsește'
        });
      } else {
        // Check for basic address components
        const address = doc.customerAddress.toLowerCase();
        
        if (!doc.customerCity && !address.includes('bucurești') && !address.includes('sector')) {
          issues.push({
            ruleId: 'cust-001',
            severity: ValidationSeverity.WARNING,
            category: ValidationCategory.ADDRESS,
            field: 'customerCity',
            message: 'Customer city/locality may be missing',
            messageRo: 'Localitatea clientului poate lipsi'
          });
        }
        
        if (!doc.customerCounty && !doc.customerCountry) {
          issues.push({
            ruleId: 'cust-001',
            severity: ValidationSeverity.WARNING,
            category: ValidationCategory.ADDRESS,
            field: 'customerCounty',
            message: 'Customer county/country may be missing',
            messageRo: 'Județul/țara clientului poate lipsi'
          });
        }
      }
      
      return {
        valid: true, // Warnings don't invalidate
        errors: [],
        warnings: issues,
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  {
    id: 'cust-002',
    name: 'Customer CUI Verification',
    description: 'Verify customer CUI exists in ANAF database',
    category: ValidationCategory.CUSTOMER,
    severity: ValidationSeverity.WARNING,
    documentTypes: [DocumentTypeForReview.INVOICE, DocumentTypeForReview.CONTRACT],
    validate: async (doc, ctx) => {
      const issues: ValidationIssue[] = [];
      
      // This would typically be async, calling ANAF API
      // For validation, we check cached data
      if (doc.customerCui && ctx.customerData) {
        const cachedAnafData = ctx.customerData.anafData;
        
        if (!cachedAnafData || cachedAnafData.status === 'not_found') {
          issues.push({
            ruleId: 'cust-002',
            severity: ValidationSeverity.WARNING,
            category: ValidationCategory.CUSTOMER,
            field: 'customerCui',
            message: 'CUI not found in ANAF database - verify manually',
            messageRo: 'CUI-ul nu a fost găsit în baza ANAF - verificați manual',
            currentValue: doc.customerCui
          });
        } else if (cachedAnafData.status === 'inactive') {
          issues.push({
            ruleId: 'cust-002',
            severity: ValidationSeverity.ERROR,
            category: ValidationCategory.CUSTOMER,
            field: 'customerCui',
            message: 'Customer company is inactive according to ANAF',
            messageRo: 'Firma clientului este inactivă conform ANAF',
            currentValue: doc.customerCui
          });
        }
      }
      
      return {
        valid: issues.filter(i => i.severity === ValidationSeverity.ERROR).length === 0,
        errors: issues.filter(i => i.severity === ValidationSeverity.ERROR),
        warnings: issues.filter(i => i.severity === ValidationSeverity.WARNING),
        info: [],
        autoFixesApplied: []
      };
    }
  },
  
  // -------------------------------------------------------------------------
  // Discount Validation
  // -------------------------------------------------------------------------
  {
    id: 'disc-001',
    name: 'Discount Within Limits',
    description: 'Discounts must be within approved limits',
    category: ValidationCategory.DISCOUNT,
    severity: ValidationSeverity.WARNING,
    documentTypes: [
      DocumentTypeForReview.INVOICE,
      DocumentTypeForReview.PROFORMA_INVOICE,
      DocumentTypeForReview.QUOTATION
    ],
    validate: (doc, ctx) => {
      const issues: ValidationIssue[] = [];
      const maxAutoDiscount = ctx.tenantSettings?.maxAutoDiscount || 15;
      
      if (doc.lineItems && Array.isArray(doc.lineItems)) {
        for (let i = 0; i < doc.lineItems.length; i++) {
          const item = doc.lineItems[i];
          
          if (item.discount && item.discount > maxAutoDiscount) {
            issues.push({
              ruleId: 'disc-001',
              severity: ValidationSeverity.WARNING,
              category: ValidationCategory.DISCOUNT,
              field: `lineItems[${i}].discount`,
              message: `Line ${i + 1}: Discount ${item.discount}% exceeds auto-approval limit (${maxAutoDiscount}%)`,
              messageRo: `Linia ${i + 1}: Discountul de ${item.discount}% depășește limita de aprobare automată (${maxAutoDiscount}%)`,
              currentValue: item.discount
            });
          }
          
          // Check if discount was approved
          if (item.discount > maxAutoDiscount && !item.discountApprovalId) {
            issues.push({
              ruleId: 'disc-001',
              severity: ValidationSeverity.ERROR,
              category: ValidationCategory.DISCOUNT,
              field: `lineItems[${i}].discountApprovalId`,
              message: `Line ${i + 1}: High discount requires approval`,
              messageRo: `Linia ${i + 1}: Discountul ridicat necesită aprobare`
            });
          }
        }
      }
      
      return {
        valid: issues.filter(i => i.severity === ValidationSeverity.ERROR).length === 0,
        errors: issues.filter(i => i.severity === ValidationSeverity.ERROR),
        warnings: issues.filter(i => i.severity === ValidationSeverity.WARNING),
        info: [],
        autoFixesApplied: []
      };
    }
  }
];

// Helper function
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
```

### 5.3 Document Validator Service

```typescript
// File: src/workers/etapa3/n4-document-review/document-validator.ts

import { 
  DocumentTypeForReview,
  ValidationContext,
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
  AutoFix
} from './types';
import { DOCUMENT_VALIDATION_RULES, ValidationRule } from './validation-rules';
import { db } from '@/db';
import { products, tenants, contacts, anafCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// -----------------------------------------------------------------------------
// Document Validator
// -----------------------------------------------------------------------------

export class DocumentValidator {
  private tenantId: string;
  private rules: ValidationRule[];
  
  constructor(tenantId: string, customRules?: ValidationRule[]) {
    this.tenantId = tenantId;
    this.rules = customRules || DOCUMENT_VALIDATION_RULES;
  }
  
  // ---------------------------------------------------------------------------
  // Main Validation Method
  // ---------------------------------------------------------------------------
  
  async validate(
    document: any,
    documentType: DocumentTypeForReview,
    options: ValidationOptions = {}
  ): Promise<DocumentValidationResult> {
    const startTime = Date.now();
    
    try {
      // Build validation context
      const context = await this.buildValidationContext(document);
      
      // Filter applicable rules
      const applicableRules = this.rules.filter(rule => 
        rule.documentTypes.includes(documentType)
      );
      
      logger.debug({
        event: 'VALIDATION_START',
        documentType,
        ruleCount: applicableRules.length,
        tenantId: this.tenantId
      }, 'Starting document validation');
      
      // Run all validations
      const allErrors: ValidationIssue[] = [];
      const allWarnings: ValidationIssue[] = [];
      const allInfo: ValidationIssue[] = [];
      const allAutoFixes: AutoFix[] = [];
      let currentDocument = { ...document };
      
      for (const rule of applicableRules) {
        try {
          const result = await Promise.resolve(rule.validate(currentDocument, context));
          
          allErrors.push(...result.errors);
          allWarnings.push(...result.warnings);
          allInfo.push(...result.info);
          
          // Apply auto-fixes if enabled
          if (options.applyAutoFixes && rule.autoFix && result.errors.length > 0) {
            const fixedDocument = rule.autoFix(currentDocument);
            
            // Re-validate to see if fix worked
            const revalidation = await Promise.resolve(rule.validate(fixedDocument, context));
            
            if (revalidation.errors.length < result.errors.length) {
              currentDocument = fixedDocument;
              allAutoFixes.push(...result.autoFixesApplied);
              
              logger.info({
                event: 'AUTO_FIX_APPLIED',
                ruleId: rule.id,
                fixCount: result.autoFixesApplied.length
              }, 'Auto-fix applied successfully');
            }
          }
        } catch (ruleError) {
          logger.error({
            event: 'RULE_EXECUTION_ERROR',
            ruleId: rule.id,
            error: ruleError
          }, 'Validation rule failed');
          
          allWarnings.push({
            ruleId: rule.id,
            severity: ValidationSeverity.WARNING,
            category: rule.category,
            field: 'system',
            message: `Validation rule ${rule.id} failed to execute`,
            messageRo: `Regula de validare ${rule.id} nu a putut fi executată`
          });
        }
      }
      
      // Calculate overall validity
      const hasBlockingErrors = allErrors.some(e => e.severity === ValidationSeverity.ERROR);
      
      const duration = Date.now() - startTime;
      
      const result: DocumentValidationResult = {
        valid: !hasBlockingErrors,
        document: currentDocument,
        documentType,
        errors: allErrors,
        warnings: allWarnings,
        info: allInfo,
        autoFixesApplied: allAutoFixes,
        summary: {
          errorCount: allErrors.length,
          warningCount: allWarnings.length,
          infoCount: allInfo.length,
          autoFixCount: allAutoFixes.length,
          validationDurationMs: duration
        },
        canAutoApprove: !hasBlockingErrors && allWarnings.length === 0,
        requiresReview: hasBlockingErrors || allWarnings.length > 0
      };
      
      logger.info({
        event: 'VALIDATION_COMPLETE',
        documentType,
        valid: result.valid,
        errorCount: allErrors.length,
        warningCount: allWarnings.length,
        duration
      }, 'Document validation completed');
      
      return result;
      
    } catch (error) {
      logger.error({
        event: 'VALIDATION_FAILED',
        error,
        tenantId: this.tenantId
      }, 'Document validation failed');
      
      throw error;
    }
  }
  
  // ---------------------------------------------------------------------------
  // Context Building
  // ---------------------------------------------------------------------------
  
  private async buildValidationContext(document: any): Promise<ValidationContext> {
    // Fetch tenant settings
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, this.tenantId))
      .limit(1);
    
    // Fetch customer data if available
    let customerData = null;
    if (document.contactId) {
      const [contact] = await db.select()
        .from(contacts)
        .where(eq(contacts.id, document.contactId))
        .limit(1);
      
      customerData = contact;
      
      // Fetch ANAF cache if CUI exists
      if (contact?.cui) {
        const [anaf] = await db.select()
          .from(anafCache)
          .where(eq(anafCache.cui, contact.cui))
          .limit(1);
        
        if (anaf) {
          customerData = { ...customerData, anafData: anaf };
        }
      }
    }
    
    // Build product catalog from document line items
    const productCatalog = new Map<string, any>();
    if (document.lineItems && Array.isArray(document.lineItems)) {
      const productIds = document.lineItems
        .map((item: any) => item.productId)
        .filter(Boolean);
      
      if (productIds.length > 0) {
        const productList = await db.select()
          .from(products)
          .where(inArray(products.id, productIds));
        
        for (const product of productList) {
          productCatalog.set(product.id, product);
        }
      }
    }
    
    // Tax rates (Romanian)
    const taxRates = new Map<string, number>([
      ['standard', 19],
      ['reduced1', 9],
      ['reduced2', 5],
      ['zero', 0]
    ]);
    
    // Exchange rates (would typically come from BNR API)
    const exchangeRates = new Map<string, number>([
      ['RON', 1],
      ['EUR', 4.97],  // Example rate
      ['USD', 4.58]   // Example rate
    ]);
    
    return {
      tenantId: this.tenantId,
      tenantSettings: tenant?.settings || {},
      customerData,
      productCatalog,
      taxRates,
      exchangeRates
    };
  }
  
  // ---------------------------------------------------------------------------
  // Correction Suggestions
  // ---------------------------------------------------------------------------
  
  generateCorrectionSuggestions(result: DocumentValidationResult): CorrectionSuggestion[] {
    const suggestions: CorrectionSuggestion[] = [];
    
    for (const error of result.errors) {
      suggestions.push({
        field: error.field,
        severity: error.severity,
        issue: error.messageRo || error.message,
        suggestion: error.suggestion || this.getDefaultSuggestion(error),
        currentValue: error.currentValue,
        expectedValue: error.expectedValue,
        autoFixAvailable: this.hasAutoFix(error.ruleId)
      });
    }
    
    for (const warning of result.warnings) {
      suggestions.push({
        field: warning.field,
        severity: warning.severity,
        issue: warning.messageRo || warning.message,
        suggestion: warning.suggestion || this.getDefaultSuggestion(warning),
        currentValue: warning.currentValue,
        expectedValue: warning.expectedValue,
        autoFixAvailable: this.hasAutoFix(warning.ruleId)
      });
    }
    
    return suggestions;
  }
  
  private getDefaultSuggestion(issue: ValidationIssue): string {
    const suggestions: Record<string, string> = {
      'REQUIRED_FIELD': 'Completați câmpul obligatoriu',
      'DATA_FORMAT': 'Corectați formatul datelor',
      'PRICING': 'Verificați calculele de preț',
      'TAX': 'Verificați calculele TVA',
      'EFACTURA': 'Completați câmpurile obligatorii pentru e-Factura',
      'CUSTOMER': 'Verificați datele clientului',
      'ADDRESS': 'Completați adresa clientului',
      'DISCOUNT': 'Verificați aprobarea discount-ului'
    };
    
    return suggestions[issue.category] || 'Verificați și corectați acest câmp';
  }
  
  private hasAutoFix(ruleId: string): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    return !!rule?.autoFix;
  }
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ValidationOptions {
  applyAutoFixes?: boolean;
  skipWarnings?: boolean;
  customRules?: ValidationRule[];
}

export interface DocumentValidationResult {
  valid: boolean;
  document: any;
  documentType: DocumentTypeForReview;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  autoFixesApplied: AutoFix[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    autoFixCount: number;
    validationDurationMs: number;
  };
  canAutoApprove: boolean;
  requiresReview: boolean;
}

export interface CorrectionSuggestion {
  field: string;
  severity: ValidationSeverity;
  issue: string;
  suggestion: string;
  currentValue?: any;
  expectedValue?: any;
  autoFixAvailable: boolean;
}
```

### 5.4 Document Review Database Schema

```typescript
// File: src/db/schema/document-reviews.ts

import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  decimal, 
  boolean,
  integer,
  jsonb,
  index,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { 
  DocumentTypeForReview, 
  DocumentReviewStatus, 
  DocumentReviewPriority 
} from '../types';

// -----------------------------------------------------------------------------
// Document Reviews Table
// -----------------------------------------------------------------------------

export const documentReviews = pgTable('document_reviews', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Multi-tenant
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Document Reference (polymorphic)
  documentType: varchar('document_type', { length: 50 }).notNull().$type<DocumentTypeForReview>(),
  documentId: uuid('document_id').notNull(),
  documentTable: varchar('document_table', { length: 100 }).notNull(),
  documentNumber: varchar('document_number', { length: 100 }),
  
  // Review Status
  status: varchar('status', { length: 50 }).notNull().default('PENDING_REVIEW').$type<DocumentReviewStatus>(),
  priority: varchar('priority', { length: 20 }).notNull().default('NORMAL').$type<DocumentReviewPriority>(),
  
  // SLA
  slaDeadline: timestamp('sla_deadline').notNull(),
  slaBreached: boolean('sla_breached').default(false),
  slaBreachedAt: timestamp('sla_breached_at'),
  
  // Assignment
  assignedTo: uuid('assigned_to').references(() => users.id),
  assignedAt: timestamp('assigned_at'),
  assignedBy: uuid('assigned_by').references(() => users.id),
  
  // Review Trigger
  triggerReason: varchar('trigger_reason', { length: 100 }),
  triggerRuleId: varchar('trigger_rule_id', { length: 100 }),
  
  // Validation Results
  validationResult: jsonb('validation_result').$type<ValidationResultJson>(),
  errorCount: integer('error_count').default(0),
  warningCount: integer('warning_count').default(0),
  
  // Document Content (snapshot)
  originalDocument: jsonb('original_document'),
  currentDocument: jsonb('current_document'),
  
  // Corrections
  correctionsRequested: jsonb('corrections_requested').$type<CorrectionRequest[]>(),
  correctionsApplied: jsonb('corrections_applied').$type<CorrectionApplied[]>(),
  correctionRounds: integer('correction_rounds').default(0),
  
  // Resolution
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  resolution: varchar('resolution', { length: 50 }),
  resolutionNotes: text('resolution_notes'),
  
  // Final Document
  approvedDocument: jsonb('approved_document'),
  
  // Metrics
  reviewDurationSeconds: integer('review_duration_seconds'),
  totalCorrectionTime: integer('total_correction_time_seconds'),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
  version: integer('version').default(1)
}, (table) => ({
  // Performance indexes
  tenantStatusIdx: index('doc_review_tenant_status_idx')
    .on(table.tenantId, table.status),
  tenantPriorityIdx: index('doc_review_tenant_priority_idx')
    .on(table.tenantId, table.priority),
  slaDeadlineIdx: index('doc_review_sla_deadline_idx')
    .on(table.slaDeadline)
    .where(sql`status IN ('PENDING_REVIEW', 'IN_REVIEW', 'CORRECTIONS_REQUESTED')`),
  assignedToIdx: index('doc_review_assigned_to_idx')
    .on(table.assignedTo)
    .where(sql`status IN ('PENDING_REVIEW', 'IN_REVIEW')`),
  documentRefIdx: index('doc_review_document_ref_idx')
    .on(table.documentId, table.documentTable),
  statusCreatedIdx: index('doc_review_status_created_idx')
    .on(table.status, table.createdAt)
}));

// -----------------------------------------------------------------------------
// Document Review History Table
// -----------------------------------------------------------------------------

export const documentReviewHistory = pgTable('document_review_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id').notNull().references(() => documentReviews.id),
  
  // Action
  action: varchar('action', { length: 50 }).notNull(),
  actionDetails: jsonb('action_details'),
  
  // State Change
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  
  // Document Diff
  documentChanges: jsonb('document_changes'),
  
  // Actor
  performedBy: uuid('performed_by').references(() => users.id),
  performedAt: timestamp('performed_at').notNull().defaultNow(),
  
  // Notes
  notes: text('notes')
}, (table) => ({
  reviewIdIdx: index('doc_review_history_review_idx').on(table.reviewId),
  performedAtIdx: index('doc_review_history_performed_at_idx').on(table.performedAt)
}));

// -----------------------------------------------------------------------------
// Review Comments Table
// -----------------------------------------------------------------------------

export const documentReviewComments = pgTable('document_review_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id').notNull().references(() => documentReviews.id),
  
  // Comment Content
  field: varchar('field', { length: 200 }), // Specific field the comment relates to
  comment: text('comment').notNull(),
  commentType: varchar('comment_type', { length: 50 }).default('general'),
  
  // Author
  authorId: uuid('author_id').notNull().references(() => users.id),
  authorName: varchar('author_name', { length: 200 }),
  
  // Resolution
  resolved: boolean('resolved').default(false),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  reviewIdIdx: index('doc_review_comments_review_idx').on(table.reviewId),
  unresolvedIdx: index('doc_review_comments_unresolved_idx')
    .on(table.reviewId)
    .where(sql`resolved = false`)
}));

// -----------------------------------------------------------------------------
// Type Definitions for JSONB Fields
// -----------------------------------------------------------------------------

interface ValidationResultJson {
  valid: boolean;
  errors: Array<{
    ruleId: string;
    field: string;
    message: string;
    messageRo: string;
    currentValue?: any;
    expectedValue?: any;
  }>;
  warnings: Array<{
    ruleId: string;
    field: string;
    message: string;
    messageRo: string;
  }>;
  autoFixesApplied: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  validatedAt: string;
}

interface CorrectionRequest {
  id: string;
  field: string;
  currentValue: any;
  requestedChange: string;
  requestedBy: string;
  requestedAt: string;
  priority: 'required' | 'suggested';
  status: 'pending' | 'applied' | 'rejected';
}

interface CorrectionApplied {
  correctionId: string;
  field: string;
  oldValue: any;
  newValue: any;
  appliedBy: string;
  appliedAt: string;
}

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const documentReviewsRelations = relations(documentReviews, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [documentReviews.tenantId],
    references: [tenants.id]
  }),
  assignee: one(users, {
    fields: [documentReviews.assignedTo],
    references: [users.id]
  }),
  resolver: one(users, {
    fields: [documentReviews.resolvedBy],
    references: [users.id]
  }),
  history: many(documentReviewHistory),
  comments: many(documentReviewComments)
}));
```

### 5.5 Worker N4 Implementation

```typescript
// File: src/workers/etapa3/n4-document-review/worker.ts

import { Worker, Queue, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '@/db';
import { 
  documentReviews, 
  documentReviewHistory,
  hitlApprovals 
} from '@/db/schema';
import { eq, and, lt, inArray } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { 
  DocumentTypeForReview,
  DocumentReviewStatus,
  DocumentReviewPriority,
  DEFAULT_REVIEW_TRIGGERS,
  DocumentReviewTrigger
} from './types';
import { DocumentValidator, DocumentValidationResult } from './document-validator';
import { HitlApprovalType, HitlStatus, HitlPriority } from '../types';
import { v4 as uuidv4 } from 'uuid';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const QUEUE_NAME = 'human:review-document';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:64039';

const CONCURRENCY = parseInt(process.env.N4_CONCURRENCY || '20', 10);
const RATE_LIMIT_MAX = parseInt(process.env.N4_RATE_LIMIT_MAX || '100', 10);
const RATE_LIMIT_DURATION = parseInt(process.env.N4_RATE_LIMIT_DURATION || '1000', 10);

// SLA durations by priority (milliseconds)
const SLA_DURATIONS: Record<DocumentReviewPriority, number> = {
  [DocumentReviewPriority.URGENT]: 15 * 60 * 1000,    // 15 minutes
  [DocumentReviewPriority.HIGH]: 30 * 60 * 1000,      // 30 minutes
  [DocumentReviewPriority.NORMAL]: 2 * 60 * 60 * 1000, // 2 hours
  [DocumentReviewPriority.LOW]: 24 * 60 * 60 * 1000   // 24 hours
};

// Priority mapping to BullMQ priority (lower = higher priority)
const PRIORITY_MAP: Record<DocumentReviewPriority, number> = {
  [DocumentReviewPriority.URGENT]: 1,
  [DocumentReviewPriority.HIGH]: 2,
  [DocumentReviewPriority.NORMAL]: 3,
  [DocumentReviewPriority.LOW]: 4
};

// -----------------------------------------------------------------------------
// Job Payload Types
// -----------------------------------------------------------------------------

export interface DocumentReviewPayload {
  tenantId: string;
  documentType: DocumentTypeForReview;
  documentId: string;
  documentTable: string;
  documentData: any;
  requestedBy: string;
  triggerReason?: string;
  triggerRuleId?: string;
  priority?: DocumentReviewPriority;
  requiresReviewerRole?: string;
  metadata?: Record<string, any>;
}

export interface DocumentReviewResult {
  reviewId: string;
  status: DocumentReviewStatus;
  validationResult: DocumentValidationResult;
  requiresManualReview: boolean;
  autoApproved: boolean;
  assignedTo?: string;
  slaDeadline: Date;
}

// -----------------------------------------------------------------------------
// Document Review Trigger Evaluator
// -----------------------------------------------------------------------------

export class DocumentReviewTriggerEvaluator {
  private triggers: DocumentReviewTrigger[];
  
  constructor(customTriggers?: DocumentReviewTrigger[]) {
    this.triggers = customTriggers || DEFAULT_REVIEW_TRIGGERS;
  }
  
  evaluate(
    document: any,
    documentType: DocumentTypeForReview,
    context: ReviewTriggerContext
  ): DocumentReviewTriggerResult {
    const matchedTriggers: MatchedTrigger[] = [];
    let highestPriority = DocumentReviewPriority.LOW;
    let autoApproveIfClean = true;
    let requiredReviewerRole: string | undefined;
    
    for (const trigger of this.triggers) {
      if (!trigger.enabled) continue;
      if (!trigger.documentTypes.includes(documentType)) continue;
      
      const conditionsMet = this.evaluateConditions(trigger.conditions, document, context);
      
      if (conditionsMet) {
        matchedTriggers.push({
          triggerId: trigger.id,
          triggerName: trigger.name,
          priority: trigger.priority
        });
        
        // Track highest priority
        if (PRIORITY_MAP[trigger.priority] < PRIORITY_MAP[highestPriority]) {
          highestPriority = trigger.priority;
        }
        
        // If any trigger requires manual review, set flag
        if (!trigger.autoApproveIfClean) {
          autoApproveIfClean = false;
        }
        
        // Track required reviewer role (highest privilege wins)
        if (trigger.requiredReviewerRole) {
          requiredReviewerRole = this.getHigherRole(
            requiredReviewerRole, 
            trigger.requiredReviewerRole
          );
        }
      }
    }
    
    return {
      requiresReview: matchedTriggers.length > 0,
      matchedTriggers,
      highestPriority,
      autoApproveIfClean,
      requiredReviewerRole
    };
  }
  
  private evaluateConditions(
    conditions: any[],
    document: any,
    context: ReviewTriggerContext
  ): boolean {
    if (conditions.length === 0) return true;
    
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(condition.field, document, context);
      const compareValue = condition.valueField 
        ? this.getFieldValue(condition.valueField, document, context)
        : condition.value;
      
      if (!this.matchCondition(condition.operator, fieldValue, compareValue)) {
        return false;
      }
    }
    
    return true;
  }
  
  private getFieldValue(field: string, document: any, context: ReviewTriggerContext): any {
    // Special fields from context
    if (field === 'isFirstInvoice') return context.isFirstInvoice;
    if (field === 'maxDiscountPercent') return context.maxDiscountPercent;
    if (field === 'requiresEfactura') return context.requiresEfactura;
    if (field === 'isInternational') return context.isInternational;
    if (field === 'totalValue') return document.totalValue || document.total;
    
    // Navigate nested fields
    return field.split('.').reduce((obj, key) => obj?.[key], document);
  }
  
  private matchCondition(operator: string, fieldValue: any, compareValue: any): boolean {
    switch (operator) {
      case 'eq': return fieldValue === compareValue;
      case 'neq': return fieldValue !== compareValue;
      case 'gt': return Number(fieldValue) > Number(compareValue);
      case 'gte': return Number(fieldValue) >= Number(compareValue);
      case 'lt': return Number(fieldValue) < Number(compareValue);
      case 'lte': return Number(fieldValue) <= Number(compareValue);
      case 'contains': return String(fieldValue).includes(String(compareValue));
      case 'in': return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'between': 
        return Array.isArray(compareValue) && 
               Number(fieldValue) >= Number(compareValue[0]) && 
               Number(fieldValue) <= Number(compareValue[1]);
      default: return false;
    }
  }
  
  private getHigherRole(current?: string, newRole?: string): string | undefined {
    const roleHierarchy = ['operator', 'team_lead', 'manager', 'director', 'compliance', 'agricultural_expert', 'ceo'];
    
    if (!current) return newRole;
    if (!newRole) return current;
    
    const currentIndex = roleHierarchy.indexOf(current);
    const newIndex = roleHierarchy.indexOf(newRole);
    
    return newIndex > currentIndex ? newRole : current;
  }
}

interface ReviewTriggerContext {
  isFirstInvoice: boolean;
  maxDiscountPercent: number;
  requiresEfactura: boolean;
  isInternational: boolean;
}

interface DocumentReviewTriggerResult {
  requiresReview: boolean;
  matchedTriggers: MatchedTrigger[];
  highestPriority: DocumentReviewPriority;
  autoApproveIfClean: boolean;
  requiredReviewerRole?: string;
}

interface MatchedTrigger {
  triggerId: string;
  triggerName: string;
  priority: DocumentReviewPriority;
}

// -----------------------------------------------------------------------------
// Worker N4 - Document Review
// -----------------------------------------------------------------------------

export class WorkerN4DocumentReview {
  private worker: Worker;
  private queue: Queue;
  private redis: Redis;
  private queueEvents: QueueEvents;
  
  constructor() {
    this.redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    
    this.queue = new Queue(QUEUE_NAME, {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 }
      }
    });
    
    this.queueEvents = new QueueEvents(QUEUE_NAME, { connection: this.redis });
    
    this.worker = new Worker(
      QUEUE_NAME,
      this.processJob.bind(this),
      {
        connection: this.redis,
        concurrency: CONCURRENCY,
        limiter: {
          max: RATE_LIMIT_MAX,
          duration: RATE_LIMIT_DURATION
        }
      }
    );
    
    this.setupEventHandlers();
  }
  
  // ---------------------------------------------------------------------------
  // Main Job Processor
  // ---------------------------------------------------------------------------
  
  private async processJob(job: Job<DocumentReviewPayload>): Promise<DocumentReviewResult> {
    const startTime = Date.now();
    const { tenantId, documentType, documentId, documentData, requestedBy } = job.data;
    
    logger.info({
      event: 'DOCUMENT_REVIEW_START',
      jobId: job.id,
      documentType,
      documentId,
      tenantId
    }, 'Starting document review');
    
    try {
      // Step 1: Validate document
      const validator = new DocumentValidator(tenantId);
      const validationResult = await validator.validate(documentData, documentType, {
        applyAutoFixes: true
      });
      
      // Step 2: Evaluate triggers
      const triggerContext: ReviewTriggerContext = {
        isFirstInvoice: await this.checkIsFirstInvoice(tenantId, documentData.customerCui),
        maxDiscountPercent: this.calculateMaxDiscount(documentData),
        requiresEfactura: documentData.requiresEfactura || this.checkEfacturaRequired(documentData),
        isInternational: documentData.isInternational || this.checkIsInternational(documentData)
      };
      
      const triggerEvaluator = new DocumentReviewTriggerEvaluator();
      const triggerResult = triggerEvaluator.evaluate(documentData, documentType, triggerContext);
      
      // Step 3: Determine if manual review is needed
      const requiresManualReview = !validationResult.valid || 
                                   triggerResult.requiresReview ||
                                   validationResult.warnings.length > 0;
      
      const canAutoApprove = validationResult.canAutoApprove && 
                            triggerResult.autoApproveIfClean &&
                            !triggerResult.requiresReview;
      
      // Step 4: Determine priority
      const priority = job.data.priority || 
                       (triggerResult.requiresReview ? triggerResult.highestPriority : DocumentReviewPriority.NORMAL);
      
      const slaDeadline = new Date(Date.now() + SLA_DURATIONS[priority]);
      
      // Step 5: Create review record
      const reviewId = uuidv4();
      
      await db.insert(documentReviews).values({
        id: reviewId,
        tenantId,
        documentType,
        documentId,
        documentTable: job.data.documentTable,
        documentNumber: documentData.invoiceNumber || documentData.documentNumber,
        status: canAutoApprove ? DocumentReviewStatus.APPROVED : DocumentReviewStatus.PENDING_REVIEW,
        priority,
        slaDeadline,
        triggerReason: triggerResult.matchedTriggers.map(t => t.triggerName).join(', ') || job.data.triggerReason,
        triggerRuleId: triggerResult.matchedTriggers.map(t => t.triggerId).join(',') || job.data.triggerRuleId,
        validationResult: {
          valid: validationResult.valid,
          errors: validationResult.errors.map(e => ({
            ruleId: e.ruleId,
            field: e.field,
            message: e.message,
            messageRo: e.messageRo,
            currentValue: e.currentValue,
            expectedValue: e.expectedValue
          })),
          warnings: validationResult.warnings.map(w => ({
            ruleId: w.ruleId,
            field: w.field,
            message: w.message,
            messageRo: w.messageRo
          })),
          autoFixesApplied: validationResult.autoFixesApplied,
          validatedAt: new Date().toISOString()
        },
        errorCount: validationResult.summary.errorCount,
        warningCount: validationResult.summary.warningCount,
        originalDocument: documentData,
        currentDocument: validationResult.document,
        createdBy: requestedBy,
        resolvedAt: canAutoApprove ? new Date() : null,
        resolvedBy: canAutoApprove ? 'system' : null,
        resolution: canAutoApprove ? 'AUTO_APPROVED' : null,
        approvedDocument: canAutoApprove ? validationResult.document : null
      });
      
      // Step 6: If manual review required, create HITL approval
      let assignedTo: string | undefined;
      
      if (!canAutoApprove) {
        // Create HITL approval
        await db.insert(hitlApprovals).values({
          id: uuidv4(),
          tenantId,
          approvalType: HitlApprovalType.DOCUMENT_REVIEW,
          referenceId: reviewId,
          referenceTable: 'document_reviews',
          status: HitlStatus.PENDING,
          priority: this.mapPriorityToHitl(priority),
          slaDeadline,
          contentOriginal: documentData,
          contentProcessed: validationResult.document,
          violations: validationResult.errors.map(e => ({
            type: e.category,
            description: e.messageRo || e.message,
            field: e.field
          })),
          metadata: {
            documentType,
            documentNumber: documentData.invoiceNumber || documentData.documentNumber,
            totalValue: documentData.totalValue || documentData.total,
            customerName: documentData.customerName,
            matchedTriggers: triggerResult.matchedTriggers,
            requiredReviewerRole: triggerResult.requiredReviewerRole
          }
        });
        
        // Assign reviewer
        assignedTo = await this.assignReviewer(
          tenantId,
          priority,
          triggerResult.requiredReviewerRole
        );
        
        if (assignedTo) {
          await db.update(documentReviews)
            .set({
              assignedTo,
              assignedAt: new Date(),
              status: DocumentReviewStatus.PENDING_REVIEW
            })
            .where(eq(documentReviews.id, reviewId));
        }
        
        // Notify reviewer
        await this.notifyReviewer(reviewId, assignedTo, priority, documentData);
        
        // Add to real-time queue
        await this.addToRealtimeQueue(tenantId, reviewId, priority);
      }
      
      // Step 7: Record history
      await db.insert(documentReviewHistory).values({
        reviewId,
        action: canAutoApprove ? 'AUTO_APPROVED' : 'CREATED',
        actionDetails: {
          validationResult: validationResult.summary,
          triggerResult: {
            matchedTriggers: triggerResult.matchedTriggers,
            highestPriority: priority
          }
        },
        newStatus: canAutoApprove ? DocumentReviewStatus.APPROVED : DocumentReviewStatus.PENDING_REVIEW,
        performedBy: canAutoApprove ? null : requestedBy
      });
      
      // Step 8: Metrics
      const duration = Date.now() - startTime;
      
      metrics.histogram('document_review_processing_time_ms', duration, {
        document_type: documentType,
        auto_approved: String(canAutoApprove)
      });
      
      metrics.counter('document_reviews_created_total', 1, {
        document_type: documentType,
        status: canAutoApprove ? 'auto_approved' : 'pending_review',
        tenant_id: tenantId
      });
      
      if (!validationResult.valid) {
        metrics.counter('document_validation_errors_total', validationResult.summary.errorCount, {
          document_type: documentType,
          tenant_id: tenantId
        });
      }
      
      logger.info({
        event: 'DOCUMENT_REVIEW_COMPLETE',
        jobId: job.id,
        reviewId,
        documentType,
        autoApproved: canAutoApprove,
        errorCount: validationResult.summary.errorCount,
        warningCount: validationResult.summary.warningCount,
        duration
      }, 'Document review completed');
      
      return {
        reviewId,
        status: canAutoApprove ? DocumentReviewStatus.APPROVED : DocumentReviewStatus.PENDING_REVIEW,
        validationResult,
        requiresManualReview: !canAutoApprove,
        autoApproved: canAutoApprove,
        assignedTo,
        slaDeadline
      };
      
    } catch (error) {
      logger.error({
        event: 'DOCUMENT_REVIEW_ERROR',
        jobId: job.id,
        documentType,
        documentId,
        error
      }, 'Document review failed');
      
      metrics.counter('document_reviews_failed_total', 1, {
        document_type: documentType,
        tenant_id: tenantId
      });
      
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT REVIEW HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate Document Content
   * 
   * Rulează validări specifice pentru fiecare tip de document
   */
  private async validateDocument(
    documentType: DocumentType,
    documentData: DocumentData,
    contact: ContactInfo,
    tenantId: string
  ): Promise<DocumentValidationResult> {
    const validations: DocumentValidation[] = [];
    
    switch (documentType) {
      case DocumentType.PROFORMA:
        validations.push(
          ...this.validateProforma(documentData as ProformaDocument, contact)
        );
        break;
        
      case DocumentType.INVOICE:
        validations.push(
          ...this.validateInvoice(documentData as InvoiceDocument, contact)
        );
        break;
        
      case DocumentType.CONTRACT:
        validations.push(
          ...this.validateContract(documentData as ContractDocument, contact)
        );
        break;
        
      case DocumentType.ORDER_CONFIRMATION:
        validations.push(
          ...this.validateOrderConfirmation(documentData as OrderDocument, contact)
        );
        break;
    }
    
    // Common validations
    validations.push(...this.validateCommonFields(documentData, contact));
    
    // Tenant-specific validations
    const tenantValidations = await this.getTenantValidations(tenantId, documentType);
    validations.push(...this.runTenantValidations(tenantValidations, documentData));
    
    // Build result
    const errors = validations.filter(v => v.severity === 'ERROR');
    const warnings = validations.filter(v => v.severity === 'WARNING');
    const info = validations.filter(v => v.severity === 'INFO');
    
    return {
      valid: errors.length === 0,
      validations,
      summary: {
        errorCount: errors.length,
        warningCount: warnings.length,
        infoCount: info.length,
        criticalFields: errors.filter(e => e.isCritical).map(e => e.field)
      }
    };
  }

  /**
   * Validate Proforma Document
   */
  private validateProforma(
    proforma: ProformaDocument,
    contact: ContactInfo
  ): DocumentValidation[] {
    const validations: DocumentValidation[] = [];
    
    // Required fields
    if (!proforma.number) {
      validations.push({
        field: 'number',
        code: 'PROFORMA_001',
        message: 'Număr proformă lipsă',
        messageRo: 'Numărul proformei este obligatoriu',
        severity: 'ERROR',
        isCritical: true,
        suggestedValue: this.generateProformaNumber()
      });
    }
    
    // Client CUI validation
    if (!proforma.clientCui) {
      validations.push({
        field: 'clientCui',
        code: 'PROFORMA_002',
        message: 'CUI client lipsă',
        messageRo: 'CUI-ul clientului este obligatoriu',
        severity: 'ERROR',
        isCritical: true,
        suggestedValue: contact.cui
      });
    } else if (!this.validateCUI(proforma.clientCui)) {
      validations.push({
        field: 'clientCui',
        code: 'PROFORMA_003',
        message: 'CUI client invalid',
        messageRo: 'CUI-ul clientului nu este valid',
        severity: 'ERROR',
        isCritical: true,
        currentValue: proforma.clientCui
      });
    }
    
    // Client name match
    if (proforma.clientName !== contact.companyName) {
      validations.push({
        field: 'clientName',
        code: 'PROFORMA_004',
        message: 'Nume client nu corespunde',
        messageRo: 'Numele clientului nu corespunde cu datele din sistem',
        severity: 'WARNING',
        isCritical: false,
        currentValue: proforma.clientName,
        suggestedValue: contact.companyName
      });
    }
    
    // Products validation
    if (!proforma.products || proforma.products.length === 0) {
      validations.push({
        field: 'products',
        code: 'PROFORMA_005',
        message: 'Produse lipsă',
        messageRo: 'Proforma trebuie să conțină cel puțin un produs',
        severity: 'ERROR',
        isCritical: true
      });
    } else {
      proforma.products.forEach((product, index) => {
        // Quantity validation
        if (product.quantity <= 0) {
          validations.push({
            field: `products[${index}].quantity`,
            code: 'PROFORMA_006',
            message: `Cantitate invalidă pentru produs ${index + 1}`,
            messageRo: `Cantitatea pentru produsul ${index + 1} trebuie să fie pozitivă`,
            severity: 'ERROR',
            isCritical: true,
            currentValue: product.quantity
          });
        }
        
        // Unit price validation
        if (product.unitPrice <= 0) {
          validations.push({
            field: `products[${index}].unitPrice`,
            code: 'PROFORMA_007',
            message: `Preț unitar invalid pentru produs ${index + 1}`,
            messageRo: `Prețul unitar pentru produsul ${index + 1} trebuie să fie pozitiv`,
            severity: 'ERROR',
            isCritical: true,
            currentValue: product.unitPrice
          });
        }
        
        // Line total calculation
        const expectedTotal = product.quantity * product.unitPrice;
        if (Math.abs(product.lineTotal - expectedTotal) > 0.01) {
          validations.push({
            field: `products[${index}].lineTotal`,
            code: 'PROFORMA_008',
            message: `Total linie incorect pentru produs ${index + 1}`,
            messageRo: `Totalul liniei pentru produsul ${index + 1} nu este calculat corect`,
            severity: 'ERROR',
            isCritical: true,
            currentValue: product.lineTotal,
            suggestedValue: expectedTotal
          });
        }
        
        // VAT rate validation (Romanian standard rates)
        const validVatRates = [0, 5, 9, 19];
        if (!validVatRates.includes(product.vatRate)) {
          validations.push({
            field: `products[${index}].vatRate`,
            code: 'PROFORMA_009',
            message: `Cotă TVA invalidă pentru produs ${index + 1}`,
            messageRo: `Cota TVA pentru produsul ${index + 1} trebuie să fie 0%, 5%, 9% sau 19%`,
            severity: 'ERROR',
            isCritical: true,
            currentValue: product.vatRate,
            suggestedValue: 19
          });
        }
      });
    }
    
    // Totals validation
    const calculatedSubtotal = proforma.products?.reduce(
      (sum, p) => sum + p.lineTotal, 0
    ) || 0;
    
    if (Math.abs(proforma.subtotal - calculatedSubtotal) > 0.01) {
      validations.push({
        field: 'subtotal',
        code: 'PROFORMA_010',
        message: 'Subtotal incorect',
        messageRo: 'Subtotalul nu corespunde cu suma liniilor',
        severity: 'ERROR',
        isCritical: true,
        currentValue: proforma.subtotal,
        suggestedValue: calculatedSubtotal
      });
    }
    
    // Discount validation
    if (proforma.discountPercent !== undefined) {
      if (proforma.discountPercent < 0 || proforma.discountPercent > 100) {
        validations.push({
          field: 'discountPercent',
          code: 'PROFORMA_011',
          message: 'Discount invalid',
          messageRo: 'Procentul de discount trebuie să fie între 0% și 100%',
          severity: 'ERROR',
          isCritical: true,
          currentValue: proforma.discountPercent
        });
      }
      
      // Check if discount was approved
      if (proforma.discountPercent > 10) {
        validations.push({
          field: 'discountPercent',
          code: 'PROFORMA_012',
          message: 'Discount necesită aprobare',
          messageRo: 'Discountul peste 10% necesită aprobare manuală',
          severity: 'WARNING',
          isCritical: false,
          currentValue: proforma.discountPercent,
          metadata: { requiresApproval: true }
        });
      }
    }
    
    // VAT calculation
    const calculatedVat = proforma.products?.reduce(
      (sum, p) => sum + (p.lineTotal * p.vatRate / 100), 0
    ) || 0;
    
    if (Math.abs(proforma.vatAmount - calculatedVat) > 0.01) {
      validations.push({
        field: 'vatAmount',
        code: 'PROFORMA_013',
        message: 'TVA incorect calculat',
        messageRo: 'Suma TVA nu corespunde cu calculul pe linii',
        severity: 'ERROR',
        isCritical: true,
        currentValue: proforma.vatAmount,
        suggestedValue: calculatedVat
      });
    }
    
    // Total validation
    const expectedTotal = calculatedSubtotal - (proforma.discountAmount || 0) + calculatedVat;
    if (Math.abs(proforma.total - expectedTotal) > 0.01) {
      validations.push({
        field: 'total',
        code: 'PROFORMA_014',
        message: 'Total incorect',
        messageRo: 'Totalul general nu este calculat corect',
        severity: 'ERROR',
        isCritical: true,
        currentValue: proforma.total,
        suggestedValue: expectedTotal
      });
    }
    
    // Validity date
    if (proforma.validUntil) {
      const validUntil = new Date(proforma.validUntil);
      const now = new Date();
      
      if (validUntil < now) {
        validations.push({
          field: 'validUntil',
          code: 'PROFORMA_015',
          message: 'Proformă expirată',
          messageRo: 'Data de valabilitate a proformei a expirat',
          severity: 'ERROR',
          isCritical: true,
          currentValue: proforma.validUntil,
          suggestedValue: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      // Check if validity is too long (> 90 days)
      const daysUntilExpiry = (validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      if (daysUntilExpiry > 90) {
        validations.push({
          field: 'validUntil',
          code: 'PROFORMA_016',
          message: 'Valabilitate prea lungă',
          messageRo: 'Valabilitatea proformei depășește 90 de zile',
          severity: 'WARNING',
          isCritical: false,
          currentValue: proforma.validUntil
        });
      }
    }
    
    // Payment terms
    if (!proforma.paymentTerms) {
      validations.push({
        field: 'paymentTerms',
        code: 'PROFORMA_017',
        message: 'Termeni de plată lipsă',
        messageRo: 'Termenii de plată trebuie specificați',
        severity: 'WARNING',
        isCritical: false,
        suggestedValue: 'Plată în avans sau în termen de 30 zile de la data facturii'
      });
    }
    
    // Bank account (IBAN) validation
    if (proforma.bankAccount && !this.validateIBAN(proforma.bankAccount)) {
      validations.push({
        field: 'bankAccount',
        code: 'PROFORMA_018',
        message: 'IBAN invalid',
        messageRo: 'Contul bancar (IBAN) nu este valid',
        severity: 'ERROR',
        isCritical: true,
        currentValue: proforma.bankAccount
      });
    }
    
    return validations;
  }

  /**
   * Validate Invoice Document
   */
  private validateInvoice(
    invoice: InvoiceDocument,
    contact: ContactInfo
  ): DocumentValidation[] {
    const validations: DocumentValidation[] = [];
    
    // All proforma validations apply
    validations.push(...this.validateProforma(invoice as any, contact));
    
    // Invoice-specific validations
    
    // Invoice series format (Romanian format: ABC + year + number)
    if (!invoice.series || !/^[A-Z]{2,4}$/.test(invoice.series)) {
      validations.push({
        field: 'series',
        code: 'INVOICE_001',
        message: 'Serie factură invalidă',
        messageRo: 'Seria facturii trebuie să conțină 2-4 litere majuscule',
        severity: 'ERROR',
        isCritical: true,
        currentValue: invoice.series
      });
    }
    
    // Invoice number format
    if (!invoice.number || !/^\d+$/.test(invoice.number)) {
      validations.push({
        field: 'number',
        code: 'INVOICE_002',
        message: 'Număr factură invalid',
        messageRo: 'Numărul facturii trebuie să fie numeric',
        severity: 'ERROR',
        isCritical: true,
        currentValue: invoice.number
      });
    }
    
    // Issue date required
    if (!invoice.issueDate) {
      validations.push({
        field: 'issueDate',
        code: 'INVOICE_003',
        message: 'Data emiterii lipsă',
        messageRo: 'Data emiterii facturii este obligatorie',
        severity: 'ERROR',
        isCritical: true,
        suggestedValue: new Date().toISOString().split('T')[0]
      });
    }
    
    // Due date validation
    if (!invoice.dueDate) {
      validations.push({
        field: 'dueDate',
        code: 'INVOICE_004',
        message: 'Data scadenței lipsă',
        messageRo: 'Data scadenței este obligatorie',
        severity: 'ERROR',
        isCritical: true
      });
    } else {
      const issueDate = new Date(invoice.issueDate);
      const dueDate = new Date(invoice.dueDate);
      
      if (dueDate < issueDate) {
        validations.push({
          field: 'dueDate',
          code: 'INVOICE_005',
          message: 'Data scadenței invalidă',
          messageRo: 'Data scadenței nu poate fi înainte de data emiterii',
          severity: 'ERROR',
          isCritical: true,
          currentValue: invoice.dueDate,
          suggestedValue: new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
    }
    
    // e-Factura compliance
    if (invoice.requiresEFactura) {
      // XML ID required
      if (!invoice.eFacturaXmlId) {
        validations.push({
          field: 'eFacturaXmlId',
          code: 'INVOICE_006',
          message: 'ID e-Factura lipsă',
          messageRo: 'Factura necesită trimitere la e-Factura dar ID-ul XML lipsește',
          severity: 'ERROR',
          isCritical: true
        });
      }
      
      // Seller registration check
      if (!invoice.sellerEFacturaRegistered) {
        validations.push({
          field: 'sellerEFacturaRegistered',
          code: 'INVOICE_007',
          message: 'Vânzător neînregistrat e-Factura',
          messageRo: 'Vânzătorul nu este înregistrat în sistemul e-Factura',
          severity: 'ERROR',
          isCritical: true
        });
      }
    }
    
    // TVA la încasare check
    if (invoice.vatOnCollection) {
      validations.push({
        field: 'vatOnCollection',
        code: 'INVOICE_008',
        message: 'TVA la încasare',
        messageRo: 'Factură cu TVA la încasare - verificați mențiunea obligatorie',
        severity: 'INFO',
        isCritical: false
      });
      
      // Must have the legal mention
      if (!invoice.notes?.includes('TVA la încasare')) {
        validations.push({
          field: 'notes',
          code: 'INVOICE_009',
          message: 'Mențiune TVA la încasare lipsă',
          messageRo: 'Mențiunea "TVA la încasare" este obligatorie conform art. 1563 Cod fiscal',
          severity: 'ERROR',
          isCritical: true,
          suggestedValue: 'TVA la încasare conform art. 1563 din Codul fiscal'
        });
      }
    }
    
    // Reverse charge check (for certain categories)
    if (invoice.reverseCharge) {
      if (!invoice.notes?.includes('taxare inversă')) {
        validations.push({
          field: 'notes',
          code: 'INVOICE_010',
          message: 'Mențiune taxare inversă lipsă',
          messageRo: 'Mențiunea "taxare inversă" este obligatorie',
          severity: 'ERROR',
          isCritical: true,
          suggestedValue: 'Taxare inversă conform art. 331 din Codul fiscal'
        });
      }
    }
    
    // Payment status for existing invoice
    if (invoice.paymentStatus) {
      if (invoice.paymentStatus === 'PAID' && !invoice.paymentDate) {
        validations.push({
          field: 'paymentDate',
          code: 'INVOICE_011',
          message: 'Data plății lipsă',
          messageRo: 'Factura este marcată ca plătită dar data plății lipsește',
          severity: 'WARNING',
          isCritical: false
        });
      }
    }
    
    return validations;
  }

  /**
   * Validate Contract Document
   */
  private validateContract(
    contract: ContractDocument,
    contact: ContactInfo
  ): DocumentValidation[] {
    const validations: DocumentValidation[] = [];
    
    // Contract number
    if (!contract.number) {
      validations.push({
        field: 'number',
        code: 'CONTRACT_001',
        message: 'Număr contract lipsă',
        messageRo: 'Numărul contractului este obligatoriu',
        severity: 'ERROR',
        isCritical: true
      });
    }
    
    // Contract date
    if (!contract.date) {
      validations.push({
        field: 'date',
        code: 'CONTRACT_002',
        message: 'Data contract lipsă',
        messageRo: 'Data contractului este obligatorie',
        severity: 'ERROR',
        isCritical: true,
        suggestedValue: new Date().toISOString().split('T')[0]
      });
    }
    
    // Parties validation
    if (!contract.sellerDetails) {
      validations.push({
        field: 'sellerDetails',
        code: 'CONTRACT_003',
        message: 'Date vânzător lipsă',
        messageRo: 'Datele vânzătorului sunt obligatorii',
        severity: 'ERROR',
        isCritical: true
      });
    } else {
      // Seller CUI
      if (!contract.sellerDetails.cui || !this.validateCUI(contract.sellerDetails.cui)) {
        validations.push({
          field: 'sellerDetails.cui',
          code: 'CONTRACT_004',
          message: 'CUI vânzător invalid',
          messageRo: 'CUI-ul vânzătorului nu este valid',
          severity: 'ERROR',
          isCritical: true
        });
      }
      
      // Seller registration number (J number)
      if (!contract.sellerDetails.regCom || !/^J\d{2}\/\d+\/\d{4}$/.test(contract.sellerDetails.regCom)) {
        validations.push({
          field: 'sellerDetails.regCom',
          code: 'CONTRACT_005',
          message: 'Număr registru comerț invalid',
          messageRo: 'Numărul de înregistrare la Registrul Comerțului nu este valid (format: J00/000/0000)',
          severity: 'WARNING',
          isCritical: false
        });
      }
    }
    
    if (!contract.buyerDetails) {
      validations.push({
        field: 'buyerDetails',
        code: 'CONTRACT_006',
        message: 'Date cumpărător lipsă',
        messageRo: 'Datele cumpărătorului sunt obligatorii',
        severity: 'ERROR',
        isCritical: true
      });
    } else {
      // Buyer CUI match with contact
      if (contract.buyerDetails.cui !== contact.cui) {
        validations.push({
          field: 'buyerDetails.cui',
          code: 'CONTRACT_007',
          message: 'CUI cumpărător nu corespunde',
          messageRo: 'CUI-ul cumpărătorului din contract nu corespunde cu datele din sistem',
          severity: 'WARNING',
          isCritical: false,
          currentValue: contract.buyerDetails.cui,
          suggestedValue: contact.cui
        });
      }
    }
    
    // Contract value
    if (!contract.totalValue || contract.totalValue <= 0) {
      validations.push({
        field: 'totalValue',
        code: 'CONTRACT_008',
        message: 'Valoare contract invalidă',
        messageRo: 'Valoarea contractului trebuie să fie pozitivă',
        severity: 'ERROR',
        isCritical: true
      });
    }
    
    // Duration/validity
    if (!contract.validFrom || !contract.validUntil) {
      validations.push({
        field: 'validity',
        code: 'CONTRACT_009',
        message: 'Perioadă contract lipsă',
        messageRo: 'Data de început și de sfârșit a contractului sunt obligatorii',
        severity: 'ERROR',
        isCritical: true
      });
    } else {
      const from = new Date(contract.validFrom);
      const until = new Date(contract.validUntil);
      
      if (until <= from) {
        validations.push({
          field: 'validUntil',
          code: 'CONTRACT_010',
          message: 'Perioadă contract invalidă',
          messageRo: 'Data de sfârșit trebuie să fie după data de început',
          severity: 'ERROR',
          isCritical: true
        });
      }
    }
    
    // Payment terms
    if (!contract.paymentTerms) {
      validations.push({
        field: 'paymentTerms',
        code: 'CONTRACT_011',
        message: 'Condiții plată lipsă',
        messageRo: 'Condițiile de plată trebuie specificate',
        severity: 'WARNING',
        isCritical: false
      });
    }
    
    // Delivery terms
    if (!contract.deliveryTerms) {
      validations.push({
        field: 'deliveryTerms',
        code: 'CONTRACT_012',
        message: 'Condiții livrare lipsă',
        messageRo: 'Condițiile de livrare trebuie specificate',
        severity: 'WARNING',
        isCritical: false
      });
    }
    
    // Signature placeholders
    if (!contract.sellerSignature) {
      validations.push({
        field: 'sellerSignature',
        code: 'CONTRACT_013',
        message: 'Semnătură vânzător lipsă',
        messageRo: 'Contractul necesită semnătura reprezentantului vânzătorului',
        severity: 'WARNING',
        isCritical: false
      });
    }
    
    if (!contract.buyerSignature) {
      validations.push({
        field: 'buyerSignature',
        code: 'CONTRACT_014',
        message: 'Semnătură cumpărător lipsă',
        messageRo: 'Contractul necesită semnătura reprezentantului cumpărătorului',
        severity: 'INFO',
        isCritical: false
      });
    }
    
    // Products/services list
    if (!contract.items || contract.items.length === 0) {
      validations.push({
        field: 'items',
        code: 'CONTRACT_015',
        message: 'Produse/servicii lipsă',
        messageRo: 'Contractul trebuie să conțină lista produselor/serviciilor',
        severity: 'ERROR',
        isCritical: true
      });
    }
    
    // Legal clauses check (force majeure, dispute resolution)
    const requiredClauses = ['forță majoră', 'litigii', 'reziliere'];
    const contractText = JSON.stringify(contract).toLowerCase();
    
    for (const clause of requiredClauses) {
      if (!contractText.includes(clause)) {
        validations.push({
          field: 'clauses',
          code: 'CONTRACT_016',
          message: `Clauză ${clause} lipsă`,
          messageRo: `Contractul ar trebui să conțină o clauză despre ${clause}`,
          severity: 'WARNING',
          isCritical: false,
          metadata: { missingClause: clause }
        });
      }
    }
    
    return validations;
  }

  /**
   * Validate Order Confirmation Document
   */
  private validateOrderConfirmation(
    order: OrderDocument,
    contact: ContactInfo
  ): DocumentValidation[] {
    const validations: DocumentValidation[] = [];
    
    // Order number
    if (!order.orderNumber) {
      validations.push({
        field: 'orderNumber',
        code: 'ORDER_001',
        message: 'Număr comandă lipsă',
        messageRo: 'Numărul comenzii este obligatoriu',
        severity: 'ERROR',
        isCritical: true
      });
    }
    
    // Order date
    if (!order.orderDate) {
      validations.push({
        field: 'orderDate',
        code: 'ORDER_002',
        message: 'Data comandă lipsă',
        messageRo: 'Data comenzii este obligatorie',
        severity: 'ERROR',
        isCritical: true,
        suggestedValue: new Date().toISOString().split('T')[0]
      });
    }
    
    // Client validation
    if (order.clientCui !== contact.cui) {
      validations.push({
        field: 'clientCui',
        code: 'ORDER_003',
        message: 'CUI client nu corespunde',
        messageRo: 'CUI-ul din comandă nu corespunde cu clientul selectat',
        severity: 'WARNING',
        isCritical: false,
        currentValue: order.clientCui,
        suggestedValue: contact.cui
      });
    }
    
    // Products validation
    if (!order.products || order.products.length === 0) {
      validations.push({
        field: 'products',
        code: 'ORDER_004',
        message: 'Produse lipsă',
        messageRo: 'Comanda trebuie să conțină cel puțin un produs',
        severity: 'ERROR',
        isCritical: true
      });
    } else {
      // Stock availability check
      for (const product of order.products) {
        if (product.availableStock !== undefined && product.quantity > product.availableStock) {
          validations.push({
            field: `products.${product.productId}.quantity`,
            code: 'ORDER_005',
            message: `Stoc insuficient pentru ${product.name}`,
            messageRo: `Cantitatea comandată (${product.quantity}) depășește stocul disponibil (${product.availableStock})`,
            severity: 'WARNING',
            isCritical: false,
            currentValue: product.quantity,
            suggestedValue: product.availableStock,
            metadata: {
              productId: product.productId,
              productName: product.name,
              requestedQuantity: product.quantity,
              availableStock: product.availableStock
            }
          });
        }
      }
    }
    
    // Delivery address
    if (!order.deliveryAddress) {
      validations.push({
        field: 'deliveryAddress',
        code: 'ORDER_006',
        message: 'Adresă livrare lipsă',
        messageRo: 'Adresa de livrare este obligatorie',
        severity: 'ERROR',
        isCritical: true,
        suggestedValue: contact.address
      });
    }
    
    // Delivery date
    if (!order.requestedDeliveryDate) {
      validations.push({
        field: 'requestedDeliveryDate',
        code: 'ORDER_007',
        message: 'Data livrare lipsă',
        messageRo: 'Data de livrare solicitată trebuie specificată',
        severity: 'WARNING',
        isCritical: false
      });
    } else {
      const deliveryDate = new Date(order.requestedDeliveryDate);
      const orderDate = new Date(order.orderDate || new Date());
      
      // Delivery must be after order
      if (deliveryDate < orderDate) {
        validations.push({
          field: 'requestedDeliveryDate',
          code: 'ORDER_008',
          message: 'Data livrare invalidă',
          messageRo: 'Data de livrare nu poate fi înainte de data comenzii',
          severity: 'ERROR',
          isCritical: true
        });
      }
      
      // Minimum lead time warning (3 business days)
      const daysDiff = (deliveryDate.getTime() - orderDate.getTime()) / (24 * 60 * 60 * 1000);
      if (daysDiff < 3) {
        validations.push({
          field: 'requestedDeliveryDate',
          code: 'ORDER_009',
          message: 'Termen livrare scurt',
          messageRo: 'Termenul de livrare este mai mic de 3 zile lucrătoare',
          severity: 'WARNING',
          isCritical: false
        });
      }
    }
    
    // Contact person for delivery
    if (!order.deliveryContactPerson) {
      validations.push({
        field: 'deliveryContactPerson',
        code: 'ORDER_010',
        message: 'Persoană contact livrare lipsă',
        messageRo: 'Specificați persoana de contact pentru livrare',
        severity: 'WARNING',
        isCritical: false,
        suggestedValue: contact.contactPerson
      });
    }
    
    // Phone for delivery
    if (!order.deliveryPhone) {
      validations.push({
        field: 'deliveryPhone',
        code: 'ORDER_011',
        message: 'Telefon livrare lipsă',
        messageRo: 'Specificați telefonul pentru livrare',
        severity: 'WARNING',
        isCritical: false,
        suggestedValue: contact.phone
      });
    }
    
    // Referenced proforma/contract
    if (order.proformaReference && !order.proformaId) {
      validations.push({
        field: 'proformaId',
        code: 'ORDER_012',
        message: 'Referință proformă invalidă',
        messageRo: 'Referința la proformă este specificată dar ID-ul lipsește',
        severity: 'WARNING',
        isCritical: false
      });
    }
    
    // Total verification
    const calculatedTotal = order.products?.reduce(
      (sum, p) => sum + (p.quantity * p.unitPrice), 0
    ) || 0;
    
    if (order.total && Math.abs(order.total - calculatedTotal) > 0.01) {
      validations.push({
        field: 'total',
        code: 'ORDER_013',
        message: 'Total comandă incorect',
        messageRo: 'Totalul comenzii nu corespunde cu suma produselor',
        severity: 'ERROR',
        isCritical: true,
        currentValue: order.total,
        suggestedValue: calculatedTotal
      });
    }
    
    return validations;
  }

  /**
   * Validate Common Fields
   * 
   * Validări comune pentru toate tipurile de documente
   */
  private validateCommonFields(
    documentData: DocumentData,
    contact: ContactInfo
  ): DocumentValidation[] {
    const validations: DocumentValidation[] = [];
    
    // Currency validation
    const validCurrencies = ['RON', 'EUR', 'USD'];
    if (documentData.currency && !validCurrencies.includes(documentData.currency)) {
      validations.push({
        field: 'currency',
        code: 'COMMON_001',
        message: 'Monedă invalidă',
        messageRo: 'Moneda trebuie să fie RON, EUR sau USD',
        severity: 'ERROR',
        isCritical: true,
        currentValue: documentData.currency,
        suggestedValue: 'RON'
      });
    }
    
    // Language validation
    const validLanguages = ['ro', 'en'];
    if (documentData.language && !validLanguages.includes(documentData.language)) {
      validations.push({
        field: 'language',
        code: 'COMMON_002',
        message: 'Limbă document invalidă',
        messageRo: 'Limba documentului trebuie să fie română sau engleză',
        severity: 'WARNING',
        isCritical: false,
        currentValue: documentData.language,
        suggestedValue: 'ro'
      });
    }
    
    // Email format in document
    if (documentData.contactEmail && !this.validateEmail(documentData.contactEmail)) {
      validations.push({
        field: 'contactEmail',
        code: 'COMMON_003',
        message: 'Email invalid',
        messageRo: 'Adresa de email din document nu este validă',
        severity: 'WARNING',
        isCritical: false,
        currentValue: documentData.contactEmail,
        suggestedValue: contact.email
      });
    }
    
    // Phone format (Romanian)
    if (documentData.contactPhone && !this.validateRomanianPhone(documentData.contactPhone)) {
      validations.push({
        field: 'contactPhone',
        code: 'COMMON_004',
        message: 'Telefon invalid',
        messageRo: 'Numărul de telefon nu este în format românesc valid',
        severity: 'WARNING',
        isCritical: false,
        currentValue: documentData.contactPhone,
        suggestedValue: contact.phone
      });
    }
    
    // Address completeness
    if (!documentData.clientAddress?.street || !documentData.clientAddress?.city) {
      validations.push({
        field: 'clientAddress',
        code: 'COMMON_005',
        message: 'Adresă client incompletă',
        messageRo: 'Adresa clientului trebuie să conțină strada și orașul',
        severity: 'WARNING',
        isCritical: false,
        suggestedValue: contact.address
      });
    }
    
    // Romanian county validation
    const romanianCounties = [
      'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
      'Brașov', 'Brăila', 'București', 'Buzău', 'Caraș-Severin', 'Călărași',
      'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
      'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș',
      'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Satu Mare', 'Sălaj',
      'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vaslui', 'Vâlcea',
      'Vrancea'
    ];
    
    if (documentData.clientAddress?.county && 
        !romanianCounties.includes(documentData.clientAddress.county)) {
      validations.push({
        field: 'clientAddress.county',
        code: 'COMMON_006',
        message: 'Județ invalid',
        messageRo: 'Județul specificat nu este valid',
        severity: 'WARNING',
        isCritical: false,
        currentValue: documentData.clientAddress.county
      });
    }
    
    // Postal code format (Romanian: 6 digits)
    if (documentData.clientAddress?.postalCode && 
        !/^\d{6}$/.test(documentData.clientAddress.postalCode)) {
      validations.push({
        field: 'clientAddress.postalCode',
        code: 'COMMON_007',
        message: 'Cod poștal invalid',
        messageRo: 'Codul poștal trebuie să aibă 6 cifre',
        severity: 'WARNING',
        isCritical: false,
        currentValue: documentData.clientAddress.postalCode
      });
    }
    
    // Notes length check (for e-Factura compatibility)
    if (documentData.notes && documentData.notes.length > 500) {
      validations.push({
        field: 'notes',
        code: 'COMMON_008',
        message: 'Note prea lungi',
        messageRo: 'Notele depășesc 500 caractere (limita e-Factura)',
        severity: 'WARNING',
        isCritical: false,
        currentValue: `${documentData.notes.length} caractere`
      });
    }
    
    return validations;
  }

  /**
   * Validate CUI (Romanian Tax ID)
   */
  private validateCUI(cui: string): boolean {
    // Remove RO prefix if present
    const cleanCui = cui.replace(/^RO/i, '').trim();
    
    // Must be 2-10 digits
    if (!/^\d{2,10}$/.test(cleanCui)) {
      return false;
    }
    
    // Validate check digit using Luhn-like algorithm
    const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
    const digits = cleanCui.padStart(10, '0').split('').map(Number);
    
    const checkDigit = digits[9];
    const sum = digits.slice(0, 9).reduce(
      (acc, digit, index) => acc + digit * weights[index], 0
    );
    
    const expectedCheck = (sum * 10) % 11 % 10;
    
    return checkDigit === expectedCheck;
  }

  /**
   * Validate IBAN
   */
  private validateIBAN(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Romanian IBAN format: RO + 2 check digits + 4 letter bank code + 16 alphanumeric
    if (!/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(cleanIban)) {
      return false;
    }
    
    // Move first 4 characters to end
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    
    // Convert letters to numbers (A=10, B=11, etc.)
    const numeric = rearranged.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return (code - 55).toString();
      }
      return char;
    }).join('');
    
    // Validate mod 97
    let remainder = 0;
    for (let i = 0; i < numeric.length; i++) {
      remainder = (remainder * 10 + parseInt(numeric[i])) % 97;
    }
    
    return remainder === 1;
  }

  /**
   * Validate Email
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Romanian Phone
   */
  private validateRomanianPhone(phone: string): boolean {
    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Valid formats: 07XXXXXXXX, +407XXXXXXXX, 00407XXXXXXXX
    // Also landlines: 02X XXXXXXX, 03X XXXXXXX
    const patterns = [
      /^07\d{8}$/,              // Mobile: 07XXXXXXXX
      /^\+407\d{8}$/,           // Mobile: +407XXXXXXXX
      /^00407\d{8}$/,           // Mobile: 00407XXXXXXXX
      /^02\d{8}$/,              // Landline: 02XXXXXXXX
      /^03\d{8}$/,              // Landline: 03XXXXXXXX
      /^\+402\d{8}$/,           // Landline: +402XXXXXXXX
      /^\+403\d{8}$/            // Landline: +403XXXXXXXX
    ];
    
    return patterns.some(pattern => pattern.test(cleanPhone));
  }

  /**
   * Generate Proforma Number
   */
  private generateProformaNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PF-${year}${month}-${random}`;
  }

  /**
   * Get Tenant-Specific Validations
   */
  private async getTenantValidations(
    tenantId: string,
    documentType: DocumentType
  ): Promise<TenantValidation[]> {
    const result = await db.select()
      .from(tenantDocumentValidations)
      .where(and(
        eq(tenantDocumentValidations.tenantId, tenantId),
        eq(tenantDocumentValidations.documentType, documentType),
        eq(tenantDocumentValidations.enabled, true)
      ));
    
    return result as TenantValidation[];
  }

  /**
   * Run Tenant-Specific Validations
   */
  private runTenantValidations(
    validations: TenantValidation[],
    documentData: DocumentData
  ): DocumentValidation[] {
    const results: DocumentValidation[] = [];
    
    for (const validation of validations) {
      const fieldValue = this.getNestedValue(documentData, validation.field);
      
      let valid = true;
      
      switch (validation.operator) {
        case 'required':
          valid = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
          break;
        case 'min':
          valid = typeof fieldValue === 'number' && fieldValue >= validation.value;
          break;
        case 'max':
          valid = typeof fieldValue === 'number' && fieldValue <= validation.value;
          break;
        case 'pattern':
          valid = typeof fieldValue === 'string' && new RegExp(validation.value).test(fieldValue);
          break;
        case 'equals':
          valid = fieldValue === validation.value;
          break;
        case 'in':
          valid = Array.isArray(validation.value) && validation.value.includes(fieldValue);
          break;
      }
      
      if (!valid) {
        results.push({
          field: validation.field,
          code: `TENANT_${validation.id}`,
          message: validation.message,
          messageRo: validation.messageRo,
          severity: validation.severity as 'ERROR' | 'WARNING' | 'INFO',
          isCritical: validation.isCritical,
          currentValue: fieldValue,
          suggestedValue: validation.suggestedValue
        });
      }
    }
    
    return results;
  }

  /**
   * Get Nested Object Value
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        // Handle array notation like products[0].name
        const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const [, arrayKey, index] = arrayMatch;
          return current[arrayKey]?.[parseInt(index)];
        }
        return current[key];
      }
      return undefined;
    }, obj);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT REVIEW ACTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Approve Document
   * 
   * Aprobă un document și continuă cu generarea/trimiterea
   */
  async approveDocument(
    reviewId: string,
    approverId: string,
    approvalNotes?: string,
    corrections?: DocumentCorrection[]
  ): Promise<DocumentApprovalResult> {
    const startTime = Date.now();
    
    logger.info({
      event: 'DOCUMENT_APPROVAL_START',
      reviewId,
      approverId,
      hasCorrections: corrections && corrections.length > 0
    }, 'Starting document approval');
    
    try {
      // Fetch review
      const [review] = await db.select()
        .from(documentReviews)
        .where(eq(documentReviews.id, reviewId));
      
      if (!review) {
        throw new Error(`Document review not found: ${reviewId}`);
      }
      
      if (review.status === DocumentReviewStatus.APPROVED) {
        throw new Error('Document already approved');
      }
      
      if (review.status === DocumentReviewStatus.REJECTED) {
        throw new Error('Cannot approve rejected document');
      }
      
      // Apply corrections if any
      let correctedDocument = review.documentData;
      if (corrections && corrections.length > 0) {
        correctedDocument = this.applyCorrections(
          review.documentData as DocumentData,
          corrections
        );
        
        // Re-validate corrected document
        const contact = await this.getContactInfo(review.contactId);
        const revalidation = await this.validateDocument(
          review.documentType as DocumentType,
          correctedDocument,
          contact,
          review.tenantId
        );
        
        if (!revalidation.valid) {
          const criticalErrors = revalidation.validations.filter(
            v => v.severity === 'ERROR' && v.isCritical
          );
          
          if (criticalErrors.length > 0) {
            throw new Error(
              `Document still has critical errors after corrections: ${
                criticalErrors.map(e => e.messageRo).join(', ')
              }`
            );
          }
        }
      }
      
      // Update review status
      await db.update(documentReviews)
        .set({
          status: DocumentReviewStatus.APPROVED,
          reviewedBy: approverId,
          reviewedAt: new Date(),
          approvalNotes,
          correctedDocumentData: corrections ? correctedDocument : null,
          correctionsMade: corrections || [],
          updatedAt: new Date()
        })
        .where(eq(documentReviews.id, reviewId));
      
      // Update HITL approval if exists
      if (review.hitlApprovalId) {
        await db.update(hitlApprovals)
          .set({
            status: HitlStatus.RESOLVED,
            resolution: HitlResolution.APPROVED,
            resolvedAt: new Date(),
            resolvedBy: approverId,
            resolutionNotes: approvalNotes,
            updatedAt: new Date()
          })
          .where(eq(hitlApprovals.id, review.hitlApprovalId));
      }
      
      // Record history
      await db.insert(documentReviewHistory).values({
        reviewId,
        action: 'APPROVED',
        actionDetails: {
          approvalNotes,
          correctionCount: corrections?.length || 0
        },
        newStatus: DocumentReviewStatus.APPROVED,
        performedBy: approverId
      });
      
      // Trigger document generation/sending based on type
      const finalDocument = correctedDocument || review.documentData;
      await this.triggerDocumentAction(
        review.documentType as DocumentType,
        finalDocument as DocumentData,
        review.documentId,
        review.tenantId
      );
      
      // Clean up from real-time queue
      await this.removeFromRealtimeQueue(review.tenantId, reviewId);
      
      // Metrics
      const duration = Date.now() - startTime;
      metrics.histogram('document_approval_time_ms', duration, {
        document_type: review.documentType,
        had_corrections: String(corrections && corrections.length > 0)
      });
      
      metrics.counter('documents_approved_total', 1, {
        document_type: review.documentType,
        tenant_id: review.tenantId
      });
      
      // Publish event
      await eventBus.publish('document.approved', {
        reviewId,
        documentType: review.documentType,
        documentId: review.documentId,
        approvedBy: approverId,
        hadCorrections: corrections && corrections.length > 0,
        tenantId: review.tenantId,
        timestamp: new Date().toISOString()
      });
      
      logger.info({
        event: 'DOCUMENT_APPROVED',
        reviewId,
        documentType: review.documentType,
        approverId,
        duration
      }, 'Document approved successfully');
      
      return {
        success: true,
        reviewId,
        status: DocumentReviewStatus.APPROVED,
        correctionsMade: corrections?.length || 0,
        nextAction: this.getNextAction(review.documentType as DocumentType)
      };
      
    } catch (error) {
      logger.error({
        event: 'DOCUMENT_APPROVAL_ERROR',
        reviewId,
        approverId,
        error
      }, 'Document approval failed');
      
      metrics.counter('document_approval_errors_total', 1);
      
      throw error;
    }
  }

  /**
   * Reject Document
   * 
   * Respinge un document cu motivul specificat
   */
  async rejectDocument(
    reviewId: string,
    rejectorId: string,
    rejectionReason: string,
    requiresResubmission: boolean = true
  ): Promise<DocumentRejectionResult> {
    const startTime = Date.now();
    
    logger.info({
      event: 'DOCUMENT_REJECTION_START',
      reviewId,
      rejectorId,
      requiresResubmission
    }, 'Starting document rejection');
    
    try {
      // Fetch review
      const [review] = await db.select()
        .from(documentReviews)
        .where(eq(documentReviews.id, reviewId));
      
      if (!review) {
        throw new Error(`Document review not found: ${reviewId}`);
      }
      
      if (review.status === DocumentReviewStatus.REJECTED) {
        throw new Error('Document already rejected');
      }
      
      if (review.status === DocumentReviewStatus.APPROVED) {
        throw new Error('Cannot reject approved document');
      }
      
      // Update review status
      await db.update(documentReviews)
        .set({
          status: DocumentReviewStatus.REJECTED,
          reviewedBy: rejectorId,
          reviewedAt: new Date(),
          rejectionReason,
          requiresResubmission,
          updatedAt: new Date()
        })
        .where(eq(documentReviews.id, reviewId));
      
      // Update HITL approval if exists
      if (review.hitlApprovalId) {
        await db.update(hitlApprovals)
          .set({
            status: HitlStatus.RESOLVED,
            resolution: HitlResolution.REJECTED,
            resolvedAt: new Date(),
            resolvedBy: rejectorId,
            resolutionNotes: rejectionReason,
            updatedAt: new Date()
          })
          .where(eq(hitlApprovals.id, review.hitlApprovalId));
      }
      
      // Record history
      await db.insert(documentReviewHistory).values({
        reviewId,
        action: 'REJECTED',
        actionDetails: {
          rejectionReason,
          requiresResubmission
        },
        newStatus: DocumentReviewStatus.REJECTED,
        performedBy: rejectorId
      });
      
      // Notify requestor
      await this.notifyRejection(review, rejectionReason, requiresResubmission);
      
      // Clean up from real-time queue
      await this.removeFromRealtimeQueue(review.tenantId, reviewId);
      
      // If resubmission required, update negotiation status
      if (requiresResubmission && review.negotiationId) {
        await db.update(negotiations)
          .set({
            documentStatus: 'REJECTED_NEEDS_REVISION',
            updatedAt: new Date()
          })
          .where(eq(negotiations.id, review.negotiationId));
      }
      
      // Metrics
      const duration = Date.now() - startTime;
      metrics.histogram('document_rejection_time_ms', duration, {
        document_type: review.documentType
      });
      
      metrics.counter('documents_rejected_total', 1, {
        document_type: review.documentType,
        tenant_id: review.tenantId,
        requires_resubmission: String(requiresResubmission)
      });
      
      // Publish event
      await eventBus.publish('document.rejected', {
        reviewId,
        documentType: review.documentType,
        documentId: review.documentId,
        rejectedBy: rejectorId,
        reason: rejectionReason,
        requiresResubmission,
        tenantId: review.tenantId,
        timestamp: new Date().toISOString()
      });
      
      logger.info({
        event: 'DOCUMENT_REJECTED',
        reviewId,
        documentType: review.documentType,
        rejectorId,
        requiresResubmission,
        duration
      }, 'Document rejected successfully');
      
      return {
        success: true,
        reviewId,
        status: DocumentReviewStatus.REJECTED,
        rejectionReason,
        requiresResubmission,
        nextSteps: requiresResubmission
          ? ['Corectați documentul', 'Retrimiteți pentru aprobare']
          : ['Documentul a fost respins definitiv']
      };
      
    } catch (error) {
      logger.error({
        event: 'DOCUMENT_REJECTION_ERROR',
        reviewId,
        rejectorId,
        error
      }, 'Document rejection failed');
      
      metrics.counter('document_rejection_errors_total', 1);
      
      throw error;
    }
  }

  /**
   * Request Corrections
   * 
   * Solicită corecții fără a respinge documentul complet
   */
  async requestCorrections(
    reviewId: string,
    reviewerId: string,
    requestedCorrections: CorrectionRequest[]
  ): Promise<CorrectionRequestResult> {
    logger.info({
      event: 'CORRECTION_REQUEST_START',
      reviewId,
      reviewerId,
      correctionCount: requestedCorrections.length
    }, 'Starting correction request');
    
    try {
      // Fetch review
      const [review] = await db.select()
        .from(documentReviews)
        .where(eq(documentReviews.id, reviewId));
      
      if (!review) {
        throw new Error(`Document review not found: ${reviewId}`);
      }
      
      // Update review status
      await db.update(documentReviews)
        .set({
          status: DocumentReviewStatus.CORRECTIONS_REQUESTED,
          assignedTo: review.requestedBy, // Return to creator
          requestedCorrections,
          correctionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          updatedAt: new Date()
        })
        .where(eq(documentReviews.id, reviewId));
      
      // Update HITL approval
      if (review.hitlApprovalId) {
        await db.update(hitlApprovals)
          .set({
            status: HitlStatus.CORRECTIONS_REQUESTED,
            notes: `Requested ${requestedCorrections.length} corrections`,
            updatedAt: new Date()
          })
          .where(eq(hitlApprovals.id, review.hitlApprovalId));
      }
      
      // Record history
      await db.insert(documentReviewHistory).values({
        reviewId,
        action: 'CORRECTIONS_REQUESTED',
        actionDetails: {
          corrections: requestedCorrections
        },
        newStatus: DocumentReviewStatus.CORRECTIONS_REQUESTED,
        performedBy: reviewerId
      });
      
      // Notify document creator
      await this.notifyCorrectionRequest(review, requestedCorrections);
      
      // Metrics
      metrics.counter('document_corrections_requested_total', 1, {
        document_type: review.documentType,
        correction_count: String(requestedCorrections.length)
      });
      
      logger.info({
        event: 'CORRECTIONS_REQUESTED',
        reviewId,
        correctionCount: requestedCorrections.length
      }, 'Corrections requested successfully');
      
      return {
        success: true,
        reviewId,
        status: DocumentReviewStatus.CORRECTIONS_REQUESTED,
        corrections: requestedCorrections,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      
    } catch (error) {
      logger.error({
        event: 'CORRECTION_REQUEST_ERROR',
        reviewId,
        reviewerId,
        error
      }, 'Correction request failed');
      
      throw error;
    }
  }

  /**
   * Submit Corrections
   * 
   * Trimite corecturile și retrimite pentru aprobare
   */
  async submitCorrections(
    reviewId: string,
    submitterId: string,
    corrections: DocumentCorrection[]
  ): Promise<CorrectionSubmissionResult> {
    logger.info({
      event: 'CORRECTION_SUBMISSION_START',
      reviewId,
      submitterId,
      correctionCount: corrections.length
    }, 'Starting correction submission');
    
    try {
      // Fetch review
      const [review] = await db.select()
        .from(documentReviews)
        .where(eq(documentReviews.id, reviewId));
      
      if (!review) {
        throw new Error(`Document review not found: ${reviewId}`);
      }
      
      if (review.status !== DocumentReviewStatus.CORRECTIONS_REQUESTED) {
        throw new Error('No corrections were requested for this document');
      }
      
      // Apply corrections
      const correctedDocument = this.applyCorrections(
        review.documentData as DocumentData,
        corrections
      );
      
      // Re-validate
      const contact = await this.getContactInfo(review.contactId);
      const validation = await this.validateDocument(
        review.documentType as DocumentType,
        correctedDocument,
        contact,
        review.tenantId
      );
      
      // Update review
      await db.update(documentReviews)
        .set({
          status: DocumentReviewStatus.PENDING_REVIEW,
          correctedDocumentData: correctedDocument,
          correctionsMade: corrections,
          validationResult: validation,
          assignedTo: review.originalReviewer || null,
          submissionCount: (review.submissionCount || 1) + 1,
          updatedAt: new Date()
        })
        .where(eq(documentReviews.id, reviewId));
      
      // Record history
      await db.insert(documentReviewHistory).values({
        reviewId,
        action: 'CORRECTIONS_SUBMITTED',
        actionDetails: {
          corrections,
          validationResult: validation.summary
        },
        newStatus: DocumentReviewStatus.PENDING_REVIEW,
        performedBy: submitterId
      });
      
      // Re-add to review queue
      await this.addToRealtimeQueue(
        review.tenantId,
        reviewId,
        HitlPriority.HIGH // Higher priority for resubmissions
      );
      
      // Notify reviewer
      await this.notifyResubmission(review);
      
      // Metrics
      metrics.counter('document_corrections_submitted_total', 1, {
        document_type: review.documentType,
        submission_count: String((review.submissionCount || 1) + 1)
      });
      
      logger.info({
        event: 'CORRECTIONS_SUBMITTED',
        reviewId,
        correctionCount: corrections.length,
        newValidationStatus: validation.valid
      }, 'Corrections submitted successfully');
      
      return {
        success: true,
        reviewId,
        status: DocumentReviewStatus.PENDING_REVIEW,
        validationResult: validation,
        submissionNumber: (review.submissionCount || 1) + 1
      };
      
    } catch (error) {
      logger.error({
        event: 'CORRECTION_SUBMISSION_ERROR',
        reviewId,
        submitterId,
        error
      }, 'Correction submission failed');
      
      throw error;
    }
  }

  /**
   * Apply Corrections to Document
   */
  private applyCorrections(
    document: DocumentData,
    corrections: DocumentCorrection[]
  ): DocumentData {
    const corrected = JSON.parse(JSON.stringify(document)); // Deep clone
    
    for (const correction of corrections) {
      this.setNestedValue(corrected, correction.field, correction.newValue);
    }
    
    return corrected;
  }

  /**
   * Set Nested Object Value
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        if (!current[arrayKey]) {
          current[arrayKey] = [];
        }
        if (!current[arrayKey][parseInt(index)]) {
          current[arrayKey][parseInt(index)] = {};
        }
        current = current[arrayKey][parseInt(index)];
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    const arrayMatch = lastPart.match(/^(\w+)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      if (!current[arrayKey]) {
        current[arrayKey] = [];
      }
      current[arrayKey][parseInt(index)] = value;
    } else {
      current[lastPart] = value;
    }
  }

  /**
   * Get Next Action After Approval
   */
  private getNextAction(documentType: DocumentType): string {
    switch (documentType) {
      case DocumentType.PROFORMA:
        return 'SEND_TO_CLIENT';
      case DocumentType.INVOICE:
        return 'SUBMIT_TO_EFACTURA';
      case DocumentType.CONTRACT:
        return 'SEND_FOR_SIGNATURE';
      case DocumentType.ORDER_CONFIRMATION:
        return 'SEND_TO_CLIENT';
      default:
        return 'ARCHIVE';
    }
  }

  /**
   * Trigger Document Action After Approval
   */
  private async triggerDocumentAction(
    documentType: DocumentType,
    documentData: DocumentData,
    documentId: string,
    tenantId: string
  ): Promise<void> {
    switch (documentType) {
      case DocumentType.PROFORMA:
        await proformaQueue.add('send', {
          documentId,
          documentData,
          tenantId,
          action: 'SEND_EMAIL'
        });
        break;
        
      case DocumentType.INVOICE:
        await eFacturaQueue.add('submit', {
          documentId,
          documentData,
          tenantId,
          action: 'SUBMIT_SPV'
        });
        break;
        
      case DocumentType.CONTRACT:
        await contractQueue.add('send', {
          documentId,
          documentData,
          tenantId,
          action: 'SEND_FOR_SIGNATURE'
        });
        break;
        
      case DocumentType.ORDER_CONFIRMATION:
        await orderQueue.add('send', {
          documentId,
          documentData,
          tenantId,
          action: 'SEND_CONFIRMATION'
        });
        break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER N4 TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Document Types Enum
 */
export enum DocumentType {
  PROFORMA = 'PROFORMA',
  INVOICE = 'INVOICE',
  CONTRACT = 'CONTRACT',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT'
}

/**
 * Document Review Status Enum
 */
export enum DocumentReviewStatus {
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  CORRECTIONS_REQUESTED = 'CORRECTIONS_REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_APPROVED = 'AUTO_APPROVED'
}

/**
 * Document Validation Interface
 */
export interface DocumentValidation {
  field: string;
  code: string;
  message: string;
  messageRo: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  isCritical: boolean;
  currentValue?: any;
  suggestedValue?: any;
  metadata?: Record<string, any>;
}

/**
 * Document Validation Result
 */
export interface DocumentValidationResult {
  valid: boolean;
  validations: DocumentValidation[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    criticalFields: string[];
  };
}

/**
 * Proforma Document Interface
 */
export interface ProformaDocument {
  number: string;
  issueDate: string;
  validUntil?: string;
  clientCui: string;
  clientName: string;
  clientAddress?: AddressInfo;
  products: ProductLine[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  vatAmount: number;
  total: number;
  currency: string;
  paymentTerms?: string;
  bankAccount?: string;
  notes?: string;
  contactEmail?: string;
  contactPhone?: string;
  language?: string;
}

/**
 * Invoice Document Interface
 */
export interface InvoiceDocument extends ProformaDocument {
  series: string;
  dueDate: string;
  requiresEFactura?: boolean;
  eFacturaXmlId?: string;
  sellerEFacturaRegistered?: boolean;
  vatOnCollection?: boolean;
  reverseCharge?: boolean;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  paymentDate?: string;
  paidAmount?: number;
}

/**
 * Contract Document Interface
 */
export interface ContractDocument {
  number: string;
  date: string;
  validFrom: string;
  validUntil: string;
  sellerDetails: PartyDetails;
  buyerDetails: PartyDetails;
  items: ContractItem[];
  totalValue: number;
  currency: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  sellerSignature?: string;
  buyerSignature?: string;
  clauses?: string[];
}

/**
 * Order Document Interface
 */
export interface OrderDocument {
  orderNumber: string;
  orderDate: string;
  clientCui: string;
  clientName: string;
  products: OrderProductLine[];
  deliveryAddress: string;
  requestedDeliveryDate?: string;
  deliveryContactPerson?: string;
  deliveryPhone?: string;
  proformaReference?: string;
  proformaId?: string;
  total?: number;
  currency?: string;
  notes?: string;
}

/**
 * Product Line Interface
 */
export interface ProductLine {
  productId: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
  discount?: number;
}

/**
 * Order Product Line with Stock
 */
export interface OrderProductLine extends ProductLine {
  availableStock?: number;
  warehouseId?: string;
  estimatedDelivery?: string;
}

/**
 * Party Details Interface
 */
export interface PartyDetails {
  name: string;
  cui: string;
  regCom?: string;
  address: AddressInfo;
  representativeName?: string;
  representativeRole?: string;
  bankAccount?: string;
  bankName?: string;
}

/**
 * Contract Item Interface
 */
export interface ContractItem {
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalValue?: number;
  deliverySchedule?: string;
}

/**
 * Address Info Interface
 */
export interface AddressInfo {
  street: string;
  city: string;
  county?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Document Correction Interface
 */
export interface DocumentCorrection {
  field: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  correctedBy?: string;
  correctedAt?: string;
}

/**
 * Correction Request Interface
 */
export interface CorrectionRequest {
  field: string;
  currentValue: any;
  issue: string;
  issueRo: string;
  suggestedValue?: any;
  isMandatory: boolean;
}

/**
 * Document Approval Result
 */
export interface DocumentApprovalResult {
  success: boolean;
  reviewId: string;
  status: DocumentReviewStatus;
  correctionsMade: number;
  nextAction: string;
}

/**
 * Document Rejection Result
 */
export interface DocumentRejectionResult {
  success: boolean;
  reviewId: string;
  status: DocumentReviewStatus;
  rejectionReason: string;
  requiresResubmission: boolean;
  nextSteps: string[];
}

/**
 * Correction Request Result
 */
export interface CorrectionRequestResult {
  success: boolean;
  reviewId: string;
  status: DocumentReviewStatus;
  corrections: CorrectionRequest[];
  deadline: Date;
}

/**
 * Correction Submission Result
 */
export interface CorrectionSubmissionResult {
  success: boolean;
  reviewId: string;
  status: DocumentReviewStatus;
  validationResult: DocumentValidationResult;
  submissionNumber: number;
}

/**
 * Review Trigger Configuration
 */
export interface ReviewTriggerConfig {
  type: string;
  enabled: boolean;
  priority: HitlPriority;
  conditions: ReviewCondition[];
  autoApproveIfValid: boolean;
  requiredReviewerRole?: string;
}

/**
 * Review Condition Interface
 */
export interface ReviewCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'matches';
  value: any;
}

/**
 * Tenant Document Validation
 */
export interface TenantValidation {
  id: string;
  tenantId: string;
  documentType: DocumentType;
  field: string;
  operator: 'required' | 'min' | 'max' | 'pattern' | 'equals' | 'in';
  value: any;
  message: string;
  messageRo: string;
  severity: string;
  isCritical: boolean;
  suggestedValue?: any;
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER N4 ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * Document Review Payload Schema
 */
export const DocumentReviewPayloadSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  documentId: z.string().uuid(),
  documentData: z.record(z.any()),
  contactId: z.string().uuid(),
  negotiationId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  requestedBy: z.string().uuid(),
  tenantId: z.string().uuid(),
  priority: z.nativeEnum(HitlPriority).optional(),
  metadata: z.record(z.any()).optional()
});

export type DocumentReviewPayload = z.infer<typeof DocumentReviewPayloadSchema>;

/**
 * Document Approval Request Schema
 */
export const DocumentApprovalRequestSchema = z.object({
  reviewId: z.string().uuid(),
  approverId: z.string().uuid(),
  approvalNotes: z.string().max(1000).optional(),
  corrections: z.array(z.object({
    field: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
    reason: z.string().optional()
  })).optional()
});

export type DocumentApprovalRequest = z.infer<typeof DocumentApprovalRequestSchema>;

/**
 * Document Rejection Request Schema
 */
export const DocumentRejectionRequestSchema = z.object({
  reviewId: z.string().uuid(),
  rejectorId: z.string().uuid(),
  rejectionReason: z.string().min(10).max(1000),
  requiresResubmission: z.boolean().default(true)
});

export type DocumentRejectionRequest = z.infer<typeof DocumentRejectionRequestSchema>;

/**
 * Correction Request Schema
 */
export const CorrectionRequestSchema = z.object({
  reviewId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  corrections: z.array(z.object({
    field: z.string(),
    currentValue: z.any(),
    issue: z.string(),
    issueRo: z.string(),
    suggestedValue: z.any().optional(),
    isMandatory: z.boolean()
  })).min(1)
});

export type CorrectionRequestInput = z.infer<typeof CorrectionRequestSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER N4 DATABASE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Document Reviews Table
 */
export const documentReviews = pgTable('document_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Document reference
  documentType: varchar('document_type', { length: 50 }).notNull(),
  documentId: uuid('document_id').notNull(),
  documentData: jsonb('document_data').notNull(),
  correctedDocumentData: jsonb('corrected_document_data'),
  
  // Related entities
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  negotiationId: uuid('negotiation_id').references(() => negotiations.id),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  hitlApprovalId: uuid('hitl_approval_id').references(() => hitlApprovals.id),
  
  // Status tracking
  status: varchar('status', { length: 50 }).notNull()
    .default(DocumentReviewStatus.PENDING_VALIDATION),
  priority: varchar('priority', { length: 20 }).notNull()
    .default(HitlPriority.MEDIUM),
  
  // Validation
  validationResult: jsonb('validation_result'),
  autoApproved: boolean('auto_approved').default(false),
  
  // Assignment
  requestedBy: uuid('requested_by').notNull().references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  assignedAt: timestamp('assigned_at'),
  originalReviewer: uuid('original_reviewer').references(() => users.id),
  
  // Review outcome
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  approvalNotes: text('approval_notes'),
  rejectionReason: text('rejection_reason'),
  requiresResubmission: boolean('requires_resubmission'),
  
  // Corrections
  requestedCorrections: jsonb('requested_corrections'),
  correctionsMade: jsonb('corrections_made'),
  correctionDeadline: timestamp('correction_deadline'),
  submissionCount: integer('submission_count').default(1),
  
  // SLA
  slaDeadline: timestamp('sla_deadline'),
  slaBreached: boolean('sla_breached').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('document_reviews_tenant_idx').on(table.tenantId),
  statusIdx: index('document_reviews_status_idx').on(table.status),
  typeIdx: index('document_reviews_type_idx').on(table.documentType),
  documentIdx: index('document_reviews_document_idx').on(table.documentId),
  contactIdx: index('document_reviews_contact_idx').on(table.contactId),
  assignedIdx: index('document_reviews_assigned_idx').on(table.assignedTo),
  slaIdx: index('document_reviews_sla_idx').on(table.slaDeadline),
  createdIdx: index('document_reviews_created_idx').on(table.createdAt),
  tenantStatusIdx: index('document_reviews_tenant_status_idx')
    .on(table.tenantId, table.status),
  tenantTypeStatusIdx: index('document_reviews_tenant_type_status_idx')
    .on(table.tenantId, table.documentType, table.status)
}));

/**
 * Document Review History Table
 */
export const documentReviewHistory = pgTable('document_review_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id').notNull().references(() => documentReviews.id),
  
  action: varchar('action', { length: 50 }).notNull(),
  actionDetails: jsonb('action_details'),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  
  performedBy: uuid('performed_by').references(() => users.id),
  performedAt: timestamp('performed_at').defaultNow().notNull(),
  
  // Audit
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent')
}, (table) => ({
  reviewIdx: index('document_review_history_review_idx').on(table.reviewId),
  actionIdx: index('document_review_history_action_idx').on(table.action),
  performedAtIdx: index('document_review_history_performed_at_idx')
    .on(table.performedAt)
}));

/**
 * Tenant Document Validations Table
 */
export const tenantDocumentValidations = pgTable('tenant_document_validations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  documentType: varchar('document_type', { length: 50 }).notNull(),
  field: varchar('field', { length: 200 }).notNull(),
  operator: varchar('operator', { length: 20 }).notNull(),
  value: jsonb('value'),
  
  message: varchar('message', { length: 500 }).notNull(),
  messageRo: varchar('message_ro', { length: 500 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('WARNING'),
  isCritical: boolean('is_critical').default(false),
  suggestedValue: jsonb('suggested_value'),
  
  enabled: boolean('enabled').default(true),
  priority: integer('priority').default(100),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('tenant_doc_validations_tenant_idx').on(table.tenantId),
  typeIdx: index('tenant_doc_validations_type_idx').on(table.documentType),
  tenantTypeIdx: index('tenant_doc_validations_tenant_type_idx')
    .on(table.tenantId, table.documentType),
  uniqueValidation: uniqueIndex('tenant_doc_validations_unique')
    .on(table.tenantId, table.documentType, table.field, table.operator)
}));

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER N4 CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default Review Triggers per Document Type
 */
export const DEFAULT_REVIEW_TRIGGERS: Record<DocumentType, ReviewTriggerConfig[]> = {
  [DocumentType.PROFORMA]: [
    {
      type: 'HIGH_VALUE',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [
        { field: 'total', operator: 'gt', value: 50000 }
      ],
      autoApproveIfValid: false,
      requiredReviewerRole: 'SALES_MANAGER'
    },
    {
      type: 'HIGH_DISCOUNT',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [
        { field: 'discountPercent', operator: 'gt', value: 15 }
      ],
      autoApproveIfValid: false,
      requiredReviewerRole: 'SALES_MANAGER'
    },
    {
      type: 'VIP_CLIENT',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [
        { field: 'contact.tier', operator: 'eq', value: 'GOLD' }
      ],
      autoApproveIfValid: false,
      requiredReviewerRole: 'ACCOUNT_MANAGER'
    },
    {
      type: 'STANDARD',
      enabled: true,
      priority: HitlPriority.MEDIUM,
      conditions: [],
      autoApproveIfValid: true
    }
  ],
  
  [DocumentType.INVOICE]: [
    {
      type: 'EFACTURA_REQUIRED',
      enabled: true,
      priority: HitlPriority.CRITICAL,
      conditions: [
        { field: 'requiresEFactura', operator: 'eq', value: true }
      ],
      autoApproveIfValid: false,
      requiredReviewerRole: 'ACCOUNTANT'
    },
    {
      type: 'HIGH_VALUE',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [
        { field: 'total', operator: 'gt', value: 100000 }
      ],
      autoApproveIfValid: false,
      requiredReviewerRole: 'FINANCE_MANAGER'
    },
    {
      type: 'VAT_ON_COLLECTION',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [
        { field: 'vatOnCollection', operator: 'eq', value: true }
      ],
      autoApproveIfValid: false,
      requiredReviewerRole: 'ACCOUNTANT'
    },
    {
      type: 'STANDARD',
      enabled: true,
      priority: HitlPriority.MEDIUM,
      conditions: [],
      autoApproveIfValid: true
    }
  ],
  
  [DocumentType.CONTRACT]: [
    {
      type: 'ALL_CONTRACTS',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [],
      autoApproveIfValid: false,
      requiredReviewerRole: 'LEGAL'
    }
  ],
  
  [DocumentType.ORDER_CONFIRMATION]: [
    {
      type: 'STOCK_WARNING',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [
        { field: 'hasStockWarning', operator: 'eq', value: true }
      ],
      autoApproveIfValid: false,
      requiredReviewerRole: 'WAREHOUSE_MANAGER'
    },
    {
      type: 'EXPRESS_DELIVERY',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [
        { field: 'isExpressDelivery', operator: 'eq', value: true }
      ],
      autoApproveIfValid: false,
      requiredReviewerRole: 'LOGISTICS_MANAGER'
    },
    {
      type: 'STANDARD',
      enabled: true,
      priority: HitlPriority.LOW,
      conditions: [],
      autoApproveIfValid: true
    }
  ],
  
  [DocumentType.DELIVERY_NOTE]: [
    {
      type: 'STANDARD',
      enabled: true,
      priority: HitlPriority.LOW,
      conditions: [],
      autoApproveIfValid: true
    }
  ],
  
  [DocumentType.CREDIT_NOTE]: [
    {
      type: 'ALL_CREDIT_NOTES',
      enabled: true,
      priority: HitlPriority.HIGH,
      conditions: [],
      autoApproveIfValid: false,
      requiredReviewerRole: 'FINANCE_MANAGER'
    }
  ],
  
  [DocumentType.PAYMENT_RECEIPT]: [
    {
      type: 'STANDARD',
      enabled: true,
      priority: HitlPriority.LOW,
      conditions: [],
      autoApproveIfValid: true
    }
  ]
};

/**
 * SLA Configuration per Priority
 */
export const DOCUMENT_REVIEW_SLA: Record<HitlPriority, number> = {
  [HitlPriority.CRITICAL]: 15 * 60 * 1000,  // 15 minutes
  [HitlPriority.HIGH]: 60 * 60 * 1000,       // 1 hour
  [HitlPriority.MEDIUM]: 4 * 60 * 60 * 1000, // 4 hours
  [HitlPriority.LOW]: 24 * 60 * 60 * 1000    // 24 hours
};

/**
 * Validation Error Code Prefixes
 */
export const VALIDATION_CODE_PREFIXES = {
  PROFORMA: 'PROFORMA_',
  INVOICE: 'INVOICE_',
  CONTRACT: 'CONTRACT_',
  ORDER: 'ORDER_',
  COMMON: 'COMMON_',
  TENANT: 'TENANT_'
} as const;

// Export worker instance
export const workerN4DocumentReview = new WorkerN4DocumentReview();

---

## 5. Unified HITL Queue System

### 5.1 Overview

Sistemul Unificat de Cozi HITL centralizează toate cererile de intervenție umană
într-o singură interfață, permițând operatorilor să gestioneze eficient:
- Escalări de conversații
- Takeover-uri AI → Human
- Aprobări discount
- Review-uri documente

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED HITL QUEUE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Escalations │  │  Takeovers  │  │  Discounts  │  │  Documents  │        │
│  │   Queue     │  │   Queue     │  │   Queue     │  │   Queue     │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │               │
│         └────────────────┴────────────────┴────────────────┘               │
│                                    │                                        │
│                                    ▼                                        │
│                    ┌──────────────────────────────┐                        │
│                    │     UNIFIED QUEUE MANAGER    │                        │
│                    │                              │                        │
│                    │  • Priority Scoring          │                        │
│                    │  • SLA Tracking              │                        │
│                    │  • Assignment Algorithm      │                        │
│                    │  • Load Balancing            │                        │
│                    └──────────────┬───────────────┘                        │
│                                   │                                         │
│         ┌────────────┬────────────┼────────────┬────────────┐              │
│         ▼            ▼            ▼            ▼            ▼              │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│    │Operator1│  │Operator2│  │Operator3│  │Manager1 │  │Director1│        │
│    │ Sales   │  │ Sales   │  │Support  │  │ Sales   │  │Finance  │        │
│    └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                                             │
│    Real-time WebSocket Updates ──────────────────────────────────────────►  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Unified Queue Manager

```typescript
// src/workers/hitl/unified-queue-manager.ts

import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { db } from '@/db';
import { hitlApprovals, operators, operatorSkills, operatorWorkloads } from '@/db/schema';
import { eq, and, or, desc, asc, sql, inArray, isNull, lte } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

/**
 * HITL Approval Types
 */
export enum HitlApprovalType {
  ESCALATION = 'ESCALATION',
  TAKEOVER = 'TAKEOVER',
  DISCOUNT = 'DISCOUNT',
  DOCUMENT = 'DOCUMENT'
}

/**
 * Queue Item Interface
 */
export interface QueueItem {
  id: string;
  type: HitlApprovalType;
  tenantId: string;
  priority: HitlPriority;
  priorityScore: number;
  status: HitlStatus;
  
  // SLA
  slaDeadline: Date;
  slaRemaining: number; // milliseconds
  slaBreached: boolean;
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Date;
  
  // Context
  referenceId: string;
  referenceTable: string;
  summary: string;
  metadata: Record<string, any>;
  
  // Tracking
  createdAt: Date;
  waitTime: number; // milliseconds
  
  // Skills required
  requiredSkills: string[];
  requiredRole?: string;
}

/**
 * Operator Availability Interface
 */
export interface OperatorAvailability {
  operatorId: string;
  tenantId: string;
  status: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE';
  currentLoad: number;
  maxLoad: number;
  skills: string[];
  roles: string[];
  
  // Performance metrics
  avgResolutionTime: number;
  resolutionRate: number;
  currentAssignments: number;
  
  // Preferences
  preferredTypes: HitlApprovalType[];
  excludedTypes: HitlApprovalType[];
}

/**
 * Assignment Result Interface
 */
export interface AssignmentResult {
  success: boolean;
  operatorId?: string;
  reason?: string;
  fallbackToQueue: boolean;
}

/**
 * Unified Queue Manager Class
 */
export class UnifiedQueueManager extends EventEmitter {
  private redis: Redis;
  private pollInterval: NodeJS.Timeout | null = null;
  private slaCheckInterval: NodeJS.Timeout | null = null;
  
  // Queue keys per tenant
  private readonly QUEUE_KEY = 'hitl:queue';
  private readonly OPERATOR_KEY = 'hitl:operators';
  private readonly ASSIGNMENT_KEY = 'hitl:assignments';
  private readonly SLA_ALERTS_KEY = 'hitl:sla:alerts';
  
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '64039'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_HITL_DB || '3'),
      keyPrefix: 'cerniq:hitl:'
    });
  }

  /**
   * Start Queue Manager
   */
  async start(): Promise<void> {
    logger.info({ event: 'QUEUE_MANAGER_START' }, 'Starting Unified Queue Manager');
    
    // Start polling for new items
    this.pollInterval = setInterval(() => {
      this.processQueue().catch(err => {
        logger.error({ event: 'QUEUE_POLL_ERROR', error: err }, 'Queue poll error');
      });
    }, 1000); // Poll every second
    
    // Start SLA checking
    this.slaCheckInterval = setInterval(() => {
      this.checkSlaBreaches().catch(err => {
        logger.error({ event: 'SLA_CHECK_ERROR', error: err }, 'SLA check error');
      });
    }, 10000); // Check every 10 seconds
    
    // Subscribe to queue events
    await this.subscribeToEvents();
    
    logger.info({ event: 'QUEUE_MANAGER_STARTED' }, 'Unified Queue Manager started');
  }

  /**
   * Stop Queue Manager
   */
  async stop(): Promise<void> {
    logger.info({ event: 'QUEUE_MANAGER_STOP' }, 'Stopping Unified Queue Manager');
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    if (this.slaCheckInterval) {
      clearInterval(this.slaCheckInterval);
      this.slaCheckInterval = null;
    }
    
    await this.redis.quit();
    
    logger.info({ event: 'QUEUE_MANAGER_STOPPED' }, 'Unified Queue Manager stopped');
  }

  /**
   * Add Item to Queue
   */
  async addToQueue(item: Omit<QueueItem, 'priorityScore' | 'waitTime' | 'slaRemaining'>): Promise<string> {
    const now = Date.now();
    
    // Calculate priority score
    const priorityScore = this.calculatePriorityScore(item);
    
    // Calculate SLA remaining
    const slaRemaining = item.slaDeadline.getTime() - now;
    
    const queueItem: QueueItem = {
      ...item,
      priorityScore,
      slaRemaining,
      waitTime: 0
    };
    
    // Add to sorted set by priority score
    const queueKey = `${this.QUEUE_KEY}:${item.tenantId}`;
    await this.redis.zadd(queueKey, priorityScore, JSON.stringify(queueItem));
    
    // Set expiry (24 hours)
    await this.redis.expire(queueKey, 24 * 60 * 60);
    
    // Emit event
    this.emit('item:added', queueItem);
    
    // Publish to Redis for real-time updates
    await this.redis.publish(`hitl:updates:${item.tenantId}`, JSON.stringify({
      type: 'ITEM_ADDED',
      item: queueItem
    }));
    
    logger.info({
      event: 'QUEUE_ITEM_ADDED',
      itemId: item.id,
      type: item.type,
      priority: item.priority,
      priorityScore,
      tenantId: item.tenantId
    }, 'Item added to HITL queue');
    
    metrics.counter('hitl_queue_items_added_total', 1, {
      type: item.type,
      priority: item.priority,
      tenant_id: item.tenantId
    });
    
    // Attempt immediate assignment
    await this.attemptAssignment(queueItem);
    
    return item.id;
  }

  /**
   * Calculate Priority Score
   * 
   * Higher score = higher priority
   * Factors:
   * - Base priority (CRITICAL=1000, HIGH=100, MEDIUM=10, LOW=1)
   * - SLA urgency (closer to deadline = higher score)
   * - Wait time bonus
   * - Type multiplier
   */
  private calculatePriorityScore(item: Partial<QueueItem>): number {
    const now = Date.now();
    
    // Base priority score
    const basePriority: Record<HitlPriority, number> = {
      [HitlPriority.CRITICAL]: 10000,
      [HitlPriority.HIGH]: 1000,
      [HitlPriority.MEDIUM]: 100,
      [HitlPriority.LOW]: 10
    };
    
    let score = basePriority[item.priority!] || 100;
    
    // SLA urgency factor (exponential as deadline approaches)
    if (item.slaDeadline) {
      const slaRemaining = item.slaDeadline.getTime() - now;
      const totalSla = this.getSlaForPriority(item.priority!);
      const urgencyRatio = 1 - (slaRemaining / totalSla);
      
      // Exponential urgency: doubles score when 50% of SLA used, quadruples at 75%
      const urgencyMultiplier = Math.pow(2, urgencyRatio * 4);
      score *= Math.min(urgencyMultiplier, 16); // Cap at 16x
      
      // Breached SLA gets maximum boost
      if (slaRemaining < 0) {
        score *= 100;
      }
    }
    
    // Type multiplier
    const typeMultiplier: Record<HitlApprovalType, number> = {
      [HitlApprovalType.TAKEOVER]: 2.0,    // Takeovers are time-sensitive
      [HitlApprovalType.ESCALATION]: 1.5,  // Escalations need quick response
      [HitlApprovalType.DISCOUNT]: 1.0,    // Standard priority
      [HitlApprovalType.DOCUMENT]: 0.8     // Documents can wait slightly longer
    };
    
    score *= typeMultiplier[item.type!] || 1.0;
    
    // Wait time bonus (1 point per minute waiting)
    if (item.createdAt) {
      const waitMinutes = (now - item.createdAt.getTime()) / (60 * 1000);
      score += waitMinutes;
    }
    
    return Math.round(score);
  }

  /**
   * Get SLA Duration for Priority
   */
  private getSlaForPriority(priority: HitlPriority): number {
    const slas: Record<HitlPriority, number> = {
      [HitlPriority.CRITICAL]: 15 * 60 * 1000,  // 15 minutes
      [HitlPriority.HIGH]: 60 * 60 * 1000,       // 1 hour
      [HitlPriority.MEDIUM]: 4 * 60 * 60 * 1000, // 4 hours
      [HitlPriority.LOW]: 24 * 60 * 60 * 1000    // 24 hours
    };
    return slas[priority] || slas[HitlPriority.MEDIUM];
  }

  /**
   * Process Queue
   * 
   * Attempt to assign unassigned items to available operators
   */
  private async processQueue(): Promise<void> {
    // Get all tenants with pending items
    const tenantQueues = await this.redis.keys(`${this.QUEUE_KEY}:*`);
    
    for (const queueKey of tenantQueues) {
      const tenantId = queueKey.split(':').pop()!;
      
      // Get unassigned items ordered by priority score (highest first)
      const items = await this.redis.zrevrange(queueKey, 0, 50, 'WITHSCORES');
      
      for (let i = 0; i < items.length; i += 2) {
        const itemData = items[i];
        const score = parseFloat(items[i + 1]);
        
        try {
          const item: QueueItem = JSON.parse(itemData);
          
          // Skip already assigned items
          if (item.assignedTo) continue;
          
          // Update priority score based on current time
          const newScore = this.calculatePriorityScore(item);
          if (Math.abs(newScore - score) > 10) {
            // Update score if significantly changed
            await this.redis.zadd(queueKey, newScore, itemData);
          }
          
          // Attempt assignment
          await this.attemptAssignment(item);
          
        } catch (err) {
          logger.error({
            event: 'QUEUE_ITEM_PARSE_ERROR',
            itemData,
            error: err
          }, 'Failed to parse queue item');
        }
      }
    }
  }

  /**
   * Attempt Assignment
   * 
   * Find the best available operator for an item
   */
  private async attemptAssignment(item: QueueItem): Promise<AssignmentResult> {
    // Get available operators for tenant
    const operators = await this.getAvailableOperators(item.tenantId);
    
    if (operators.length === 0) {
      logger.debug({
        event: 'NO_AVAILABLE_OPERATORS',
        itemId: item.id,
        tenantId: item.tenantId
      }, 'No available operators for assignment');
      
      return {
        success: false,
        reason: 'NO_AVAILABLE_OPERATORS',
        fallbackToQueue: true
      };
    }
    
    // Score operators
    const scoredOperators = operators.map(op => ({
      operator: op,
      score: this.scoreOperatorForItem(op, item)
    })).filter(s => s.score > 0) // Only consider eligible operators
      .sort((a, b) => b.score - a.score);
    
    if (scoredOperators.length === 0) {
      logger.debug({
        event: 'NO_ELIGIBLE_OPERATORS',
        itemId: item.id,
        tenantId: item.tenantId,
        requiredSkills: item.requiredSkills,
        requiredRole: item.requiredRole
      }, 'No eligible operators for assignment');
      
      return {
        success: false,
        reason: 'NO_ELIGIBLE_OPERATORS',
        fallbackToQueue: true
      };
    }
    
    // Try to assign to best operator
    const bestOperator = scoredOperators[0].operator;
    
    try {
      await this.assignToOperator(item, bestOperator.operatorId);
      
      return {
        success: true,
        operatorId: bestOperator.operatorId,
        fallbackToQueue: false
      };
    } catch (err) {
      logger.error({
        event: 'ASSIGNMENT_ERROR',
        itemId: item.id,
        operatorId: bestOperator.operatorId,
        error: err
      }, 'Failed to assign item to operator');
      
      return {
        success: false,
        reason: 'ASSIGNMENT_ERROR',
        fallbackToQueue: true
      };
    }
  }

  /**
   * Get Available Operators
   */
  private async getAvailableOperators(tenantId: string): Promise<OperatorAvailability[]> {
    // Get from Redis cache first
    const cacheKey = `${this.OPERATOR_KEY}:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query database
    const result = await db.select({
      operatorId: operators.id,
      tenantId: operators.tenantId,
      status: operators.status,
      currentLoad: operatorWorkloads.currentLoad,
      maxLoad: operators.maxConcurrentTasks,
      avgResolutionTime: operatorWorkloads.avgResolutionTime,
      resolutionRate: operatorWorkloads.resolutionRate,
      currentAssignments: operatorWorkloads.activeAssignments
    })
    .from(operators)
    .leftJoin(operatorWorkloads, eq(operators.id, operatorWorkloads.operatorId))
    .where(and(
      eq(operators.tenantId, tenantId),
      inArray(operators.status, ['ONLINE', 'BUSY'])
    ));
    
    // Get skills for each operator
    const operatorIds = result.map(r => r.operatorId);
    const skills = await db.select()
      .from(operatorSkills)
      .where(inArray(operatorSkills.operatorId, operatorIds));
    
    const skillMap = new Map<string, string[]>();
    for (const skill of skills) {
      if (!skillMap.has(skill.operatorId)) {
        skillMap.set(skill.operatorId, []);
      }
      skillMap.get(skill.operatorId)!.push(skill.skillName);
    }
    
    // Get roles
    const roles = await db.select()
      .from(operatorRoles)
      .where(inArray(operatorRoles.operatorId, operatorIds));
    
    const roleMap = new Map<string, string[]>();
    for (const role of roles) {
      if (!roleMap.has(role.operatorId)) {
        roleMap.set(role.operatorId, []);
      }
      roleMap.get(role.operatorId)!.push(role.roleName);
    }
    
    const availability: OperatorAvailability[] = result.map(r => ({
      operatorId: r.operatorId,
      tenantId: r.tenantId,
      status: r.status as 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE',
      currentLoad: r.currentLoad || 0,
      maxLoad: r.maxLoad || 10,
      skills: skillMap.get(r.operatorId) || [],
      roles: roleMap.get(r.operatorId) || [],
      avgResolutionTime: r.avgResolutionTime || 0,
      resolutionRate: r.resolutionRate || 0,
      currentAssignments: r.currentAssignments || 0,
      preferredTypes: [],
      excludedTypes: []
    }));
    
    // Cache for 30 seconds
    await this.redis.setex(cacheKey, 30, JSON.stringify(availability));
    
    return availability;
  }

  /**
   * Score Operator for Item
   * 
   * Returns 0 if operator is not eligible
   * Higher score = better match
   */
  private scoreOperatorForItem(operator: OperatorAvailability, item: QueueItem): number {
    let score = 100; // Base score
    
    // Check capacity
    if (operator.currentLoad >= operator.maxLoad) {
      return 0; // No capacity
    }
    
    // Check required role
    if (item.requiredRole && !operator.roles.includes(item.requiredRole)) {
      return 0; // Missing required role
    }
    
    // Check required skills
    if (item.requiredSkills && item.requiredSkills.length > 0) {
      const hasAllSkills = item.requiredSkills.every(
        skill => operator.skills.includes(skill)
      );
      if (!hasAllSkills) {
        return 0; // Missing required skill
      }
    }
    
    // Check excluded types
    if (operator.excludedTypes.includes(item.type)) {
      return 0; // Type excluded
    }
    
    // Capacity factor (more available capacity = higher score)
    const capacityRatio = 1 - (operator.currentLoad / operator.maxLoad);
    score *= (0.5 + capacityRatio * 0.5); // 50-100% based on capacity
    
    // Status factor
    if (operator.status === 'ONLINE') {
      score *= 1.2; // Prefer fully available
    } else if (operator.status === 'BUSY') {
      score *= 0.8; // Less preferred but acceptable
    }
    
    // Performance factor
    if (operator.resolutionRate > 0) {
      score *= (0.8 + operator.resolutionRate * 0.4); // 80-120% based on resolution rate
    }
    
    // Speed factor (faster resolution = higher score)
    if (operator.avgResolutionTime > 0) {
      const avgMinutes = operator.avgResolutionTime / (60 * 1000);
      if (avgMinutes < 5) score *= 1.2;
      else if (avgMinutes < 15) score *= 1.1;
      else if (avgMinutes > 60) score *= 0.8;
    }
    
    // Preferred type bonus
    if (operator.preferredTypes.includes(item.type)) {
      score *= 1.3; // 30% bonus for preferred type
    }
    
    // Skill match bonus (more matching skills = higher score)
    if (item.requiredSkills && item.requiredSkills.length > 0) {
      const matchingSkills = item.requiredSkills.filter(
        skill => operator.skills.includes(skill)
      ).length;
      const skillRatio = matchingSkills / item.requiredSkills.length;
      score *= (0.8 + skillRatio * 0.4); // 80-120% based on skill match
    }
    
    // Load balancing factor (spread work evenly)
    if (operator.currentAssignments < 3) {
      score *= 1.1; // Slight bonus for low assignment count
    } else if (operator.currentAssignments > 7) {
      score *= 0.9; // Slight penalty for high assignment count
    }
    
    return Math.round(score);
  }

  /**
   * Assign Item to Operator
   */
  async assignToOperator(item: QueueItem, operatorId: string): Promise<void> {
    const now = new Date();
    
    // Update database
    await db.update(hitlApprovals)
      .set({
        assignedTo: operatorId,
        assignedAt: now,
        status: HitlStatus.ASSIGNED,
        updatedAt: now
      })
      .where(eq(hitlApprovals.id, item.id));
    
    // Update Redis queue item
    const queueKey = `${this.QUEUE_KEY}:${item.tenantId}`;
    
    // Remove old item
    await this.redis.zrem(queueKey, JSON.stringify(item));
    
    // Add updated item
    item.assignedTo = operatorId;
    item.assignedAt = now;
    item.status = HitlStatus.ASSIGNED;
    
    await this.redis.zadd(queueKey, item.priorityScore, JSON.stringify(item));
    
    // Track assignment
    const assignmentKey = `${this.ASSIGNMENT_KEY}:${operatorId}`;
    await this.redis.sadd(assignmentKey, item.id);
    await this.redis.expire(assignmentKey, 24 * 60 * 60);
    
    // Update operator workload
    await this.updateOperatorWorkload(operatorId, 1);
    
    // Publish event
    await this.redis.publish(`hitl:updates:${item.tenantId}`, JSON.stringify({
      type: 'ITEM_ASSIGNED',
      itemId: item.id,
      operatorId,
      item
    }));
    
    // Emit event
    this.emit('item:assigned', { item, operatorId });
    
    logger.info({
      event: 'ITEM_ASSIGNED',
      itemId: item.id,
      operatorId,
      type: item.type,
      priority: item.priority
    }, 'Item assigned to operator');
    
    metrics.counter('hitl_items_assigned_total', 1, {
      type: item.type,
      priority: item.priority
    });
  }

  /**
   * Update Operator Workload
   */
  private async updateOperatorWorkload(operatorId: string, delta: number): Promise<void> {
    await db.update(operatorWorkloads)
      .set({
        activeAssignments: sql`active_assignments + ${delta}`,
        currentLoad: sql`current_load + ${delta}`,
        updatedAt: new Date()
      })
      .where(eq(operatorWorkloads.operatorId, operatorId));
    
    // Invalidate cache
    const operator = await db.select({ tenantId: operators.tenantId })
      .from(operators)
      .where(eq(operators.id, operatorId))
      .limit(1);
    
    if (operator.length > 0) {
      await this.redis.del(`${this.OPERATOR_KEY}:${operator[0].tenantId}`);
    }
  }

  /**
   * Remove Item from Queue
   */
  async removeFromQueue(tenantId: string, itemId: string): Promise<void> {
    const queueKey = `${this.QUEUE_KEY}:${tenantId}`;
    
    // Get all items and find the one to remove
    const items = await this.redis.zrange(queueKey, 0, -1);
    
    for (const itemData of items) {
      try {
        const item: QueueItem = JSON.parse(itemData);
        if (item.id === itemId) {
          await this.redis.zrem(queueKey, itemData);
          
          // Publish event
          await this.redis.publish(`hitl:updates:${tenantId}`, JSON.stringify({
            type: 'ITEM_REMOVED',
            itemId
          }));
          
          this.emit('item:removed', { itemId, tenantId });
          
          logger.info({
            event: 'ITEM_REMOVED_FROM_QUEUE',
            itemId,
            tenantId
          }, 'Item removed from HITL queue');
          
          return;
        }
      } catch (err) {
        // Ignore parse errors
      }
    }
  }

  /**
   * Get Queue Items
   */
  async getQueueItems(
    tenantId: string,
    options: {
      status?: HitlStatus[];
      type?: HitlApprovalType[];
      assignedTo?: string;
      unassignedOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<QueueItem[]> {
    const queueKey = `${this.QUEUE_KEY}:${tenantId}`;
    
    // Get all items from sorted set
    const items = await this.redis.zrevrange(queueKey, 0, -1);
    
    let result: QueueItem[] = [];
    
    for (const itemData of items) {
      try {
        const item: QueueItem = JSON.parse(itemData);
        
        // Apply filters
        if (options.status && !options.status.includes(item.status)) continue;
        if (options.type && !options.type.includes(item.type)) continue;
        if (options.assignedTo && item.assignedTo !== options.assignedTo) continue;
        if (options.unassignedOnly && item.assignedTo) continue;
        
        // Update wait time
        item.waitTime = Date.now() - item.createdAt.getTime();
        item.slaRemaining = item.slaDeadline.getTime() - Date.now();
        
        result.push(item);
      } catch (err) {
        // Ignore parse errors
      }
    }
    
    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    
    return result.slice(offset, offset + limit);
  }

  /**
   * Get Queue Statistics
   */
  async getQueueStats(tenantId: string): Promise<QueueStatistics> {
    const items = await this.getQueueItems(tenantId);
    
    const stats: QueueStatistics = {
      total: items.length,
      byStatus: {},
      byType: {},
      byPriority: {},
      unassigned: 0,
      breachedSla: 0,
      nearingSla: 0,
      avgWaitTime: 0,
      oldestItem: null
    };
    
    let totalWaitTime = 0;
    let oldestCreatedAt: Date | null = null;
    
    for (const item of items) {
      // By status
      stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
      
      // By type
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      
      // By priority
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
      
      // Unassigned
      if (!item.assignedTo) {
        stats.unassigned++;
      }
      
      // SLA status
      if (item.slaBreached || item.slaRemaining < 0) {
        stats.breachedSla++;
      } else if (item.slaRemaining < 15 * 60 * 1000) { // Within 15 minutes
        stats.nearingSla++;
      }
      
      // Wait time
      totalWaitTime += item.waitTime;
      
      // Oldest item
      const createdAt = new Date(item.createdAt);
      if (!oldestCreatedAt || createdAt < oldestCreatedAt) {
        oldestCreatedAt = createdAt;
        stats.oldestItem = item;
      }
    }
    
    stats.avgWaitTime = items.length > 0 ? totalWaitTime / items.length : 0;
    
    return stats;
  }

  /**
   * Check SLA Breaches
   */
  private async checkSlaBreaches(): Promise<void> {
    const tenantQueues = await this.redis.keys(`${this.QUEUE_KEY}:*`);
    
    for (const queueKey of tenantQueues) {
      const tenantId = queueKey.split(':').pop()!;
      const items = await this.redis.zrange(queueKey, 0, -1);
      
      for (const itemData of items) {
        try {
          const item: QueueItem = JSON.parse(itemData);
          const now = Date.now();
          const slaRemaining = item.slaDeadline.getTime() - now;
          
          // Check for breaches
          if (slaRemaining < 0 && !item.slaBreached) {
            await this.handleSlaBreach(item, tenantId);
          }
          
          // Check for warnings (50% of SLA used)
          const totalSla = this.getSlaForPriority(item.priority);
          const slaUsed = totalSla - slaRemaining;
          const usageRatio = slaUsed / totalSla;
          
          if (usageRatio > 0.5 && usageRatio < 0.75) {
            await this.sendSlaWarning(item, tenantId, 'WARNING_50');
          } else if (usageRatio >= 0.75 && usageRatio < 1.0) {
            await this.sendSlaWarning(item, tenantId, 'WARNING_75');
          } else if (usageRatio >= 0.9 && slaRemaining > 0) {
            await this.sendSlaWarning(item, tenantId, 'CRITICAL_90');
          }
          
        } catch (err) {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Handle SLA Breach
   */
  private async handleSlaBreach(item: QueueItem, tenantId: string): Promise<void> {
    logger.warn({
      event: 'SLA_BREACH',
      itemId: item.id,
      type: item.type,
      priority: item.priority,
      tenantId
    }, 'SLA breach detected');
    
    // Update database
    await db.update(hitlApprovals)
      .set({
        slaBreached: true,
        updatedAt: new Date()
      })
      .where(eq(hitlApprovals.id, item.id));
    
    // Update Redis item
    item.slaBreached = true;
    const queueKey = `${this.QUEUE_KEY}:${tenantId}`;
    
    // Recalculate priority with breach factor
    const newScore = this.calculatePriorityScore(item);
    
    // Remove old item
    const oldItems = await this.redis.zrange(queueKey, 0, -1);
    for (const oldData of oldItems) {
      try {
        const oldItem: QueueItem = JSON.parse(oldData);
        if (oldItem.id === item.id) {
          await this.redis.zrem(queueKey, oldData);
          break;
        }
      } catch (err) {}
    }
    
    // Add with new score
    await this.redis.zadd(queueKey, newScore, JSON.stringify(item));
    
    // Record alert
    const alertKey = `${this.SLA_ALERTS_KEY}:${tenantId}`;
    await this.redis.lpush(alertKey, JSON.stringify({
      type: 'SLA_BREACH',
      itemId: item.id,
      priority: item.priority,
      timestamp: new Date().toISOString()
    }));
    await this.redis.ltrim(alertKey, 0, 99); // Keep last 100 alerts
    
    // Publish event
    await this.redis.publish(`hitl:updates:${tenantId}`, JSON.stringify({
      type: 'SLA_BREACH',
      itemId: item.id,
      item
    }));
    
    // Emit event
    this.emit('sla:breach', { item, tenantId });
    
    // Notify managers
    await this.notifySlaBreach(item, tenantId);
    
    metrics.counter('hitl_sla_breaches_total', 1, {
      type: item.type,
      priority: item.priority,
      tenant_id: tenantId
    });
  }

  /**
   * Send SLA Warning
   */
  private async sendSlaWarning(
    item: QueueItem,
    tenantId: string,
    level: 'WARNING_50' | 'WARNING_75' | 'CRITICAL_90'
  ): Promise<void> {
    // Check if warning already sent
    const warningKey = `hitl:sla:warning:${item.id}:${level}`;
    const alreadySent = await this.redis.get(warningKey);
    
    if (alreadySent) return;
    
    // Mark warning as sent
    await this.redis.setex(warningKey, 24 * 60 * 60, '1');
    
    logger.info({
      event: 'SLA_WARNING',
      itemId: item.id,
      level,
      tenantId
    }, 'SLA warning sent');
    
    // Publish event
    await this.redis.publish(`hitl:updates:${tenantId}`, JSON.stringify({
      type: 'SLA_WARNING',
      itemId: item.id,
      level,
      item
    }));
    
    // Emit event
    this.emit('sla:warning', { item, tenantId, level });
    
    // For critical warnings, escalate assignment
    if (level === 'CRITICAL_90' && !item.assignedTo) {
      // Try to force-assign to any available operator
      await this.forceAssignment(item);
    }
    
    metrics.counter('hitl_sla_warnings_total', 1, {
      type: item.type,
      priority: item.priority,
      level,
      tenant_id: tenantId
    });
  }

  /**
   * Force Assignment
   * 
   * Assigns to any available operator regardless of load
   */
  private async forceAssignment(item: QueueItem): Promise<void> {
    // Get all operators, including busy ones
    const allOperators = await db.select({
      operatorId: operators.id,
      status: operators.status,
      currentLoad: operatorWorkloads.currentLoad,
      maxLoad: operators.maxConcurrentTasks
    })
    .from(operators)
    .leftJoin(operatorWorkloads, eq(operators.id, operatorWorkloads.operatorId))
    .where(and(
      eq(operators.tenantId, item.tenantId),
      inArray(operators.status, ['ONLINE', 'BUSY'])
    ))
    .orderBy(asc(operatorWorkloads.currentLoad));
    
    if (allOperators.length > 0) {
      const bestOperator = allOperators[0];
      
      // Allow exceeding max load for critical items
      await this.assignToOperator(item, bestOperator.operatorId);
      
      logger.warn({
        event: 'FORCE_ASSIGNMENT',
        itemId: item.id,
        operatorId: bestOperator.operatorId,
        currentLoad: bestOperator.currentLoad,
        maxLoad: bestOperator.maxLoad
      }, 'Force assignment due to SLA critical');
    }
  }

  /**
   * Notify SLA Breach
   */
  private async notifySlaBreach(item: QueueItem, tenantId: string): Promise<void> {
    // Get tenant managers
    const managers = await db.select()
      .from(operators)
      .where(and(
        eq(operators.tenantId, tenantId),
        sql`'MANAGER' = ANY(${operators.roles})`
      ));
    
    for (const manager of managers) {
      // Send notification via notification system
      await notificationQueue.add('send', {
        type: 'SLA_BREACH',
        recipientId: manager.id,
        recipientType: 'OPERATOR',
        tenantId,
        priority: 'CRITICAL',
        title: `SLA Breach: ${item.type} #${item.id.slice(0, 8)}`,
        body: `Cerere ${this.getTypeLabel(item.type)} a depășit SLA. Prioritate: ${item.priority}.`,
        data: {
          itemId: item.id,
          itemType: item.type,
          itemPriority: item.priority
        },
        channels: ['push', 'email', 'slack']
      });
    }
  }

  /**
   * Get Type Label (Romanian)
   */
  private getTypeLabel(type: HitlApprovalType): string {
    const labels: Record<HitlApprovalType, string> = {
      [HitlApprovalType.ESCALATION]: 'de escalare',
      [HitlApprovalType.TAKEOVER]: 'de preluare',
      [HitlApprovalType.DISCOUNT]: 'de aprobare discount',
      [HitlApprovalType.DOCUMENT]: 'de aprobare document'
    };
    return labels[type] || type;
  }

  /**
   * Subscribe to Events
   */
  private async subscribeToEvents(): Promise<void> {
    const subscriber = this.redis.duplicate();
    
    await subscriber.subscribe('hitl:commands');
    
    subscriber.on('message', async (channel, message) => {
      try {
        const command = JSON.parse(message);
        
        switch (command.type) {
          case 'REASSIGN':
            await this.handleReassign(command);
            break;
          case 'ESCALATE':
            await this.handleEscalate(command);
            break;
          case 'REFRESH_OPERATORS':
            await this.refreshOperatorCache(command.tenantId);
            break;
        }
      } catch (err) {
        logger.error({
          event: 'COMMAND_PROCESSING_ERROR',
          message,
          error: err
        }, 'Failed to process command');
      }
    });
  }

  /**
   * Handle Reassign Command
   */
  private async handleReassign(command: {
    itemId: string;
    fromOperator: string;
    toOperator: string;
    tenantId: string;
    reason: string;
  }): Promise<void> {
    // Update assignment
    await db.update(hitlApprovals)
      .set({
        assignedTo: command.toOperator,
        assignedAt: new Date(),
        notes: `Reassigned from ${command.fromOperator}: ${command.reason}`,
        updatedAt: new Date()
      })
      .where(eq(hitlApprovals.id, command.itemId));
    
    // Update operator workloads
    await this.updateOperatorWorkload(command.fromOperator, -1);
    await this.updateOperatorWorkload(command.toOperator, 1);
    
    // Update Redis queue
    const item = await this.getQueueItems(command.tenantId, {
      limit: 1000
    }).then(items => items.find(i => i.id === command.itemId));
    
    if (item) {
      item.assignedTo = command.toOperator;
      item.assignedAt = new Date();
      
      const queueKey = `${this.QUEUE_KEY}:${command.tenantId}`;
      await this.redis.zrem(queueKey, JSON.stringify({ ...item, assignedTo: command.fromOperator }));
      await this.redis.zadd(queueKey, item.priorityScore, JSON.stringify(item));
    }
    
    // Publish event
    await this.redis.publish(`hitl:updates:${command.tenantId}`, JSON.stringify({
      type: 'ITEM_REASSIGNED',
      itemId: command.itemId,
      fromOperator: command.fromOperator,
      toOperator: command.toOperator
    }));
    
    logger.info({
      event: 'ITEM_REASSIGNED',
      itemId: command.itemId,
      fromOperator: command.fromOperator,
      toOperator: command.toOperator,
      reason: command.reason
    }, 'Item reassigned');
  }

  /**
   * Handle Escalate Command
   */
  private async handleEscalate(command: {
    itemId: string;
    tenantId: string;
    newPriority: HitlPriority;
    reason: string;
  }): Promise<void> {
    // Update priority in database
    const newSlaDeadline = new Date(
      Date.now() + this.getSlaForPriority(command.newPriority)
    );
    
    await db.update(hitlApprovals)
      .set({
        priority: command.newPriority,
        slaDeadline: newSlaDeadline,
        notes: `Priority escalated: ${command.reason}`,
        updatedAt: new Date()
      })
      .where(eq(hitlApprovals.id, command.itemId));
    
    // Update Redis queue with new priority
    const items = await this.getQueueItems(command.tenantId, { limit: 1000 });
    const item = items.find(i => i.id === command.itemId);
    
    if (item) {
      const queueKey = `${this.QUEUE_KEY}:${command.tenantId}`;
      
      // Remove old
      await this.redis.zrem(queueKey, JSON.stringify(item));
      
      // Update and re-add
      item.priority = command.newPriority;
      item.slaDeadline = newSlaDeadline;
      item.priorityScore = this.calculatePriorityScore(item);
      
      await this.redis.zadd(queueKey, item.priorityScore, JSON.stringify(item));
      
      // Publish event
      await this.redis.publish(`hitl:updates:${command.tenantId}`, JSON.stringify({
        type: 'ITEM_ESCALATED',
        itemId: command.itemId,
        newPriority: command.newPriority,
        item
      }));
    }
    
    logger.info({
      event: 'ITEM_ESCALATED',
      itemId: command.itemId,
      newPriority: command.newPriority,
      reason: command.reason
    }, 'Item priority escalated');
  }

  /**
   * Refresh Operator Cache
   */
  private async refreshOperatorCache(tenantId: string): Promise<void> {
    await this.redis.del(`${this.OPERATOR_KEY}:${tenantId}`);
    await this.getAvailableOperators(tenantId); // This will repopulate cache
  }
}

/**
 * Queue Statistics Interface
 */
export interface QueueStatistics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  unassigned: number;
  breachedSla: number;
  nearingSla: number;
  avgWaitTime: number;
  oldestItem: QueueItem | null;
}

// Export singleton instance
export const unifiedQueueManager = new UnifiedQueueManager();

### 5.3 Operator Management

```typescript
// src/workers/hitl/operator-manager.ts

import { db } from '@/db';
import { operators, operatorWorkloads, operatorSessions, operatorSkills, operatorRoles } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

/**
 * Operator Status Enum
 */
export enum OperatorStatus {
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE'
}

/**
 * Operator Roles Enum
 */
export enum OperatorRole {
  OPERATOR = 'OPERATOR',
  TEAM_LEAD = 'TEAM_LEAD',
  SALES_MANAGER = 'SALES_MANAGER',
  ACCOUNT_MANAGER = 'ACCOUNT_MANAGER',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  LOGISTICS_MANAGER = 'LOGISTICS_MANAGER',
  LEGAL = 'LEGAL',
  ACCOUNTANT = 'ACCOUNTANT',
  DIRECTOR = 'DIRECTOR',
  CEO = 'CEO'
}

/**
 * Operator Skills Enum
 */
export enum OperatorSkill {
  // Sales skills
  SALES_GENERAL = 'SALES_GENERAL',
  SALES_AGRICULTURAL = 'SALES_AGRICULTURAL',
  SALES_ENTERPRISE = 'SALES_ENTERPRISE',
  NEGOTIATION = 'NEGOTIATION',
  UPSELLING = 'UPSELLING',
  
  // Technical skills
  PRODUCT_KNOWLEDGE = 'PRODUCT_KNOWLEDGE',
  TECHNICAL_SUPPORT = 'TECHNICAL_SUPPORT',
  PRICING = 'PRICING',
  
  // Language skills
  ROMANIAN = 'ROMANIAN',
  ENGLISH = 'ENGLISH',
  HUNGARIAN = 'HUNGARIAN',
  
  // Domain skills
  AGRICULTURE = 'AGRICULTURE',
  IRRIGATION = 'IRRIGATION',
  FINANCE = 'FINANCE',
  LEGAL = 'LEGAL',
  
  // Channel skills
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  CHAT = 'CHAT'
}

/**
 * Operator Manager Class
 */
export class OperatorManager {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '64039'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_HITL_DB || '3'),
      keyPrefix: 'cerniq:hitl:operators:'
    });
  }

  /**
   * Register Operator Online
   */
  async goOnline(
    operatorId: string,
    tenantId: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      device?: string;
    }
  ): Promise<void> {
    const now = new Date();
    
    // Update operator status
    await db.update(operators)
      .set({
        status: OperatorStatus.ONLINE,
        lastActiveAt: now,
        updatedAt: now
      })
      .where(eq(operators.id, operatorId));
    
    // Create session
    const [session] = await db.insert(operatorSessions).values({
      operatorId,
      tenantId,
      startedAt: now,
      status: OperatorStatus.ONLINE,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      device: metadata?.device
    }).returning();
    
    // Initialize or update workload
    await db.insert(operatorWorkloads).values({
      operatorId,
      tenantId,
      activeAssignments: 0,
      currentLoad: 0,
      lastActivityAt: now
    }).onConflictDoUpdate({
      target: operatorWorkloads.operatorId,
      set: {
        lastActivityAt: now,
        updatedAt: now
      }
    });
    
    // Store in Redis for quick lookup
    await this.redis.hset(`status:${tenantId}`, operatorId, JSON.stringify({
      status: OperatorStatus.ONLINE,
      sessionId: session.id,
      since: now.toISOString()
    }));
    
    // Publish status change
    await this.redis.publish(`hitl:operators:${tenantId}`, JSON.stringify({
      type: 'OPERATOR_ONLINE',
      operatorId,
      timestamp: now.toISOString()
    }));
    
    logger.info({
      event: 'OPERATOR_ONLINE',
      operatorId,
      tenantId,
      sessionId: session.id
    }, 'Operator went online');
    
    metrics.gauge('hitl_operators_online', 1, { tenant_id: tenantId });
  }

  /**
   * Register Operator Offline
   */
  async goOffline(operatorId: string, tenantId: string): Promise<void> {
    const now = new Date();
    
    // Update operator status
    await db.update(operators)
      .set({
        status: OperatorStatus.OFFLINE,
        lastActiveAt: now,
        updatedAt: now
      })
      .where(eq(operators.id, operatorId));
    
    // End active session
    await db.update(operatorSessions)
      .set({
        endedAt: now,
        status: OperatorStatus.OFFLINE,
        duration: sql`EXTRACT(EPOCH FROM (${now} - started_at))::integer`
      })
      .where(and(
        eq(operatorSessions.operatorId, operatorId),
        sql`ended_at IS NULL`
      ));
    
    // Remove from Redis
    await this.redis.hdel(`status:${tenantId}`, operatorId);
    
    // Publish status change
    await this.redis.publish(`hitl:operators:${tenantId}`, JSON.stringify({
      type: 'OPERATOR_OFFLINE',
      operatorId,
      timestamp: now.toISOString()
    }));
    
    // Reassign any active items
    await this.reassignOperatorItems(operatorId, tenantId);
    
    logger.info({
      event: 'OPERATOR_OFFLINE',
      operatorId,
      tenantId
    }, 'Operator went offline');
    
    metrics.gauge('hitl_operators_online', -1, { tenant_id: tenantId });
  }

  /**
   * Set Operator Away
   */
  async setAway(operatorId: string, tenantId: string, reason?: string): Promise<void> {
    const now = new Date();
    
    await db.update(operators)
      .set({
        status: OperatorStatus.AWAY,
        awayReason: reason,
        lastActiveAt: now,
        updatedAt: now
      })
      .where(eq(operators.id, operatorId));
    
    // Update session
    await db.update(operatorSessions)
      .set({
        status: OperatorStatus.AWAY,
        awayAt: now,
        awayReason: reason
      })
      .where(and(
        eq(operatorSessions.operatorId, operatorId),
        sql`ended_at IS NULL`
      ));
    
    // Update Redis
    const statusData = await this.redis.hget(`status:${tenantId}`, operatorId);
    if (statusData) {
      const status = JSON.parse(statusData);
      status.status = OperatorStatus.AWAY;
      status.awayReason = reason;
      status.awaySince = now.toISOString();
      await this.redis.hset(`status:${tenantId}`, operatorId, JSON.stringify(status));
    }
    
    // Publish status change
    await this.redis.publish(`hitl:operators:${tenantId}`, JSON.stringify({
      type: 'OPERATOR_AWAY',
      operatorId,
      reason,
      timestamp: now.toISOString()
    }));
    
    logger.info({
      event: 'OPERATOR_AWAY',
      operatorId,
      tenantId,
      reason
    }, 'Operator set to away');
  }

  /**
   * Set Operator Busy
   */
  async setBusy(operatorId: string, tenantId: string): Promise<void> {
    const now = new Date();
    
    await db.update(operators)
      .set({
        status: OperatorStatus.BUSY,
        lastActiveAt: now,
        updatedAt: now
      })
      .where(eq(operators.id, operatorId));
    
    // Update session
    await db.update(operatorSessions)
      .set({
        status: OperatorStatus.BUSY
      })
      .where(and(
        eq(operatorSessions.operatorId, operatorId),
        sql`ended_at IS NULL`
      ));
    
    // Update Redis
    const statusData = await this.redis.hget(`status:${tenantId}`, operatorId);
    if (statusData) {
      const status = JSON.parse(statusData);
      status.status = OperatorStatus.BUSY;
      await this.redis.hset(`status:${tenantId}`, operatorId, JSON.stringify(status));
    }
    
    // Publish status change
    await this.redis.publish(`hitl:operators:${tenantId}`, JSON.stringify({
      type: 'OPERATOR_BUSY',
      operatorId,
      timestamp: now.toISOString()
    }));
    
    logger.debug({
      event: 'OPERATOR_BUSY',
      operatorId,
      tenantId
    }, 'Operator set to busy');
  }

  /**
   * Reassign Operator Items
   */
  private async reassignOperatorItems(operatorId: string, tenantId: string): Promise<void> {
    // Get all items assigned to this operator
    const items = await db.select()
      .from(hitlApprovals)
      .where(and(
        eq(hitlApprovals.assignedTo, operatorId),
        eq(hitlApprovals.tenantId, tenantId),
        sql`status NOT IN ('RESOLVED', 'EXPIRED')`
      ));
    
    for (const item of items) {
      // Unassign
      await db.update(hitlApprovals)
        .set({
          assignedTo: null,
          assignedAt: null,
          status: HitlStatus.PENDING,
          notes: `Reassigned: operator ${operatorId} went offline`,
          updatedAt: new Date()
        })
        .where(eq(hitlApprovals.id, item.id));
      
      // Publish for reassignment
      await this.redis.publish('hitl:commands', JSON.stringify({
        type: 'ITEM_UNASSIGNED',
        itemId: item.id,
        tenantId,
        previousOperator: operatorId
      }));
    }
    
    logger.info({
      event: 'OPERATOR_ITEMS_REASSIGNED',
      operatorId,
      tenantId,
      itemCount: items.length
    }, 'Reassigned items from offline operator');
  }

  /**
   * Get Operator Performance
   */
  async getOperatorPerformance(
    operatorId: string,
    tenantId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<OperatorPerformance> {
    const periodStart = this.getPeriodStart(period);
    
    // Get resolution stats
    const resolutionStats = await db.select({
      total: sql<number>`COUNT(*)`,
      resolved: sql<number>`COUNT(*) FILTER (WHERE status = 'RESOLVED')`,
      avgResolutionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)))`,
      onTimeSla: sql<number>`COUNT(*) FILTER (WHERE sla_breached = false AND status = 'RESOLVED')`
    })
    .from(hitlApprovals)
    .where(and(
      eq(hitlApprovals.assignedTo, operatorId),
      eq(hitlApprovals.tenantId, tenantId),
      sql`assigned_at >= ${periodStart}`
    ));
    
    // Get by type
    const byType = await db.select({
      type: hitlApprovals.approvalType,
      count: sql<number>`COUNT(*)`
    })
    .from(hitlApprovals)
    .where(and(
      eq(hitlApprovals.assignedTo, operatorId),
      eq(hitlApprovals.tenantId, tenantId),
      sql`assigned_at >= ${periodStart}`
    ))
    .groupBy(hitlApprovals.approvalType);
    
    // Get session time
    const sessionStats = await db.select({
      totalTime: sql<number>`SUM(duration)`,
      sessionCount: sql<number>`COUNT(*)`
    })
    .from(operatorSessions)
    .where(and(
      eq(operatorSessions.operatorId, operatorId),
      sql`started_at >= ${periodStart}`
    ));
    
    const stats = resolutionStats[0];
    const sessions = sessionStats[0];
    
    return {
      operatorId,
      period,
      totalAssigned: stats?.total || 0,
      totalResolved: stats?.resolved || 0,
      resolutionRate: stats?.total ? (stats.resolved / stats.total) : 0,
      avgResolutionTime: stats?.avgResolutionTime || 0,
      slaComplianceRate: stats?.total ? (stats.onTimeSla / stats.total) : 0,
      byType: byType.reduce((acc, t) => {
        acc[t.type] = t.count;
        return acc;
      }, {} as Record<string, number>),
      totalSessionTime: sessions?.totalTime || 0,
      sessionCount: sessions?.sessionCount || 0
    };
  }

  /**
   * Get Period Start Date
   */
  private getPeriodStart(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(now.setDate(diff));
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  /**
   * Update Operator Skills
   */
  async updateSkills(
    operatorId: string,
    skills: OperatorSkill[],
    tenantId: string
  ): Promise<void> {
    // Remove existing skills
    await db.delete(operatorSkills)
      .where(eq(operatorSkills.operatorId, operatorId));
    
    // Add new skills
    if (skills.length > 0) {
      await db.insert(operatorSkills).values(
        skills.map(skill => ({
          operatorId,
          tenantId,
          skillName: skill
        }))
      );
    }
    
    // Invalidate cache
    await this.redis.del(`skills:${operatorId}`);
    
    logger.info({
      event: 'OPERATOR_SKILLS_UPDATED',
      operatorId,
      skills
    }, 'Operator skills updated');
  }

  /**
   * Update Operator Roles
   */
  async updateRoles(
    operatorId: string,
    roles: OperatorRole[],
    tenantId: string
  ): Promise<void> {
    // Remove existing roles
    await db.delete(operatorRoles)
      .where(eq(operatorRoles.operatorId, operatorId));
    
    // Add new roles
    if (roles.length > 0) {
      await db.insert(operatorRoles).values(
        roles.map(role => ({
          operatorId,
          tenantId,
          roleName: role
        }))
      );
    }
    
    // Invalidate cache
    await this.redis.del(`roles:${operatorId}`);
    
    logger.info({
      event: 'OPERATOR_ROLES_UPDATED',
      operatorId,
      roles
    }, 'Operator roles updated');
  }
}

/**
 * Operator Performance Interface
 */
export interface OperatorPerformance {
  operatorId: string;
  period: 'day' | 'week' | 'month';
  totalAssigned: number;
  totalResolved: number;
  resolutionRate: number;
  avgResolutionTime: number;
  slaComplianceRate: number;
  byType: Record<string, number>;
  totalSessionTime: number;
  sessionCount: number;
}

// Export singleton
export const operatorManager = new OperatorManager();
```

### 5.4 Queue Database Schema

```typescript
// src/db/schema/hitl-queue.ts

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  numeric
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core';

/**
 * Operators Table
 */
export const operators = pgTable('operators', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  
  // Basic info
  displayName: varchar('display_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  avatar: text('avatar'),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('OFFLINE'),
  awayReason: text('away_reason'),
  lastActiveAt: timestamp('last_active_at'),
  
  // Capacity
  maxConcurrentTasks: integer('max_concurrent_tasks').notNull().default(10),
  
  // Settings
  notificationPreferences: jsonb('notification_preferences').default({}),
  autoAcceptAssignments: boolean('auto_accept_assignments').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('operators_tenant_idx').on(table.tenantId),
  userIdx: index('operators_user_idx').on(table.userId),
  statusIdx: index('operators_status_idx').on(table.status),
  tenantUserUnique: uniqueIndex('operators_tenant_user_unique')
    .on(table.tenantId, table.userId)
}));

/**
 * Operator Skills Table
 */
export const operatorSkills = pgTable('operator_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull().references(() => operators.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  skillName: varchar('skill_name', { length: 50 }).notNull(),
  proficiencyLevel: integer('proficiency_level').default(100), // 0-100
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  operatorIdx: index('operator_skills_operator_idx').on(table.operatorId),
  skillIdx: index('operator_skills_skill_idx').on(table.skillName),
  uniqueSkill: uniqueIndex('operator_skills_unique')
    .on(table.operatorId, table.skillName)
}));

/**
 * Operator Roles Table
 */
export const operatorRoles = pgTable('operator_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull().references(() => operators.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  roleName: varchar('role_name', { length: 50 }).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  operatorIdx: index('operator_roles_operator_idx').on(table.operatorId),
  roleIdx: index('operator_roles_role_idx').on(table.roleName),
  uniqueRole: uniqueIndex('operator_roles_unique')
    .on(table.operatorId, table.roleName)
}));

/**
 * Operator Workloads Table
 */
export const operatorWorkloads = pgTable('operator_workloads', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull().references(() => operators.id).unique(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Current load
  activeAssignments: integer('active_assignments').notNull().default(0),
  currentLoad: integer('current_load').notNull().default(0),
  
  // Performance metrics (rolling averages)
  avgResolutionTime: integer('avg_resolution_time'), // seconds
  resolutionRate: numeric('resolution_rate', { precision: 5, scale: 4 }), // 0.0000-1.0000
  slaComplianceRate: numeric('sla_compliance_rate', { precision: 5, scale: 4 }),
  
  // Daily stats
  todayAssigned: integer('today_assigned').default(0),
  todayResolved: integer('today_resolved').default(0),
  todaySlaBreach: integer('today_sla_breach').default(0),
  
  // Activity tracking
  lastActivityAt: timestamp('last_activity_at'),
  lastAssignmentAt: timestamp('last_assignment_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  operatorIdx: index('operator_workloads_operator_idx').on(table.operatorId),
  tenantIdx: index('operator_workloads_tenant_idx').on(table.tenantId),
  loadIdx: index('operator_workloads_load_idx').on(table.currentLoad)
}));

/**
 * Operator Sessions Table
 */
export const operatorSessions = pgTable('operator_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull().references(() => operators.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Session timing
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'), // seconds
  
  // Status tracking
  status: varchar('status', { length: 20 }).notNull(),
  awayAt: timestamp('away_at'),
  awayReason: text('away_reason'),
  
  // Client info
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  device: varchar('device', { length: 50 }),
  
  // Stats
  assignmentsReceived: integer('assignments_received').default(0),
  assignmentsCompleted: integer('assignments_completed').default(0)
}, (table) => ({
  operatorIdx: index('operator_sessions_operator_idx').on(table.operatorId),
  startedIdx: index('operator_sessions_started_idx').on(table.startedAt),
  tenantDateIdx: index('operator_sessions_tenant_date_idx')
    .on(table.tenantId, table.startedAt)
}));

/**
 * HITL Queue Snapshots Table (for analytics)
 */
export const hitlQueueSnapshots = pgTable('hitl_queue_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Snapshot time
  snapshotAt: timestamp('snapshot_at').notNull(),
  
  // Counts
  totalPending: integer('total_pending').notNull(),
  totalAssigned: integer('total_assigned').notNull(),
  totalInProgress: integer('total_in_progress').notNull(),
  
  // By type
  byType: jsonb('by_type').notNull(), // { ESCALATION: 5, TAKEOVER: 2, ... }
  
  // By priority
  byPriority: jsonb('by_priority').notNull(), // { CRITICAL: 1, HIGH: 3, ... }
  
  // SLA status
  slaBreach: integer('sla_breach').notNull(),
  slaAtRisk: integer('sla_at_risk').notNull(),
  
  // Wait time
  avgWaitTime: integer('avg_wait_time'), // seconds
  maxWaitTime: integer('max_wait_time'), // seconds
  
  // Operators
  operatorsOnline: integer('operators_online').notNull(),
  operatorsBusy: integer('operators_busy').notNull(),
  avgOperatorLoad: numeric('avg_operator_load', { precision: 5, scale: 2 })
}, (table) => ({
  tenantIdx: index('queue_snapshots_tenant_idx').on(table.tenantId),
  snapshotIdx: index('queue_snapshots_snapshot_idx').on(table.snapshotAt),
  tenantSnapshotIdx: index('queue_snapshots_tenant_snapshot_idx')
    .on(table.tenantId, table.snapshotAt)
}));

/**
 * Relations
 */
export const operatorsRelations = relations(operators, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [operators.tenantId],
    references: [tenants.id]
  }),
  user: one(users, {
    fields: [operators.userId],
    references: [users.id]
  }),
  skills: many(operatorSkills),
  roles: many(operatorRoles),
  workload: one(operatorWorkloads),
  sessions: many(operatorSessions)
}));

export const operatorSkillsRelations = relations(operatorSkills, ({ one }) => ({
  operator: one(operators, {
    fields: [operatorSkills.operatorId],
    references: [operators.id]
  })
}));

export const operatorRolesRelations = relations(operatorRoles, ({ one }) => ({
  operator: one(operators, {
    fields: [operatorRoles.operatorId],
    references: [operators.id]
  })
}));
```

### 5.5 Redis Data Structures

```typescript
// src/workers/N-human-intervention/queue/redis-structures.ts

/**
 * Redis Keys and Data Structures for HITL Queue
 * Optimized for real-time operations and high throughput
 */

// ============================================================================
// KEY PATTERNS
// ============================================================================

export const REDIS_KEYS = {
  // Queue sorted set (by priority score)
  QUEUE: (tenantId: string) => `hitl:queue:${tenantId}`,
  
  // Operator status hash
  OPERATOR_STATUS: (tenantId: string) => `hitl:operators:status:${tenantId}`,
  
  // Operator assignments set
  OPERATOR_ASSIGNMENTS: (operatorId: string) => `hitl:assignments:${operatorId}`,
  
  // SLA alerts list
  SLA_ALERTS: (tenantId: string) => `hitl:sla:alerts:${tenantId}`,
  
  // SLA warning flags
  SLA_WARNING: (itemId: string, level: number) => `hitl:sla:warning:${itemId}:${level}`,
  
  // Operator cache
  OPERATOR_CACHE: (tenantId: string) => `hitl:operators:${tenantId}`,
  
  // Queue lock for exclusive operations
  QUEUE_LOCK: (tenantId: string) => `hitl:queue:lock:${tenantId}`,
  
  // Item details hash
  ITEM_DETAILS: (itemId: string) => `hitl:item:${itemId}`,
  
  // Tenant queue stats
  QUEUE_STATS: (tenantId: string) => `hitl:queue:stats:${tenantId}`,
  
  // Operator metrics
  OPERATOR_METRICS: (operatorId: string) => `hitl:operator:metrics:${operatorId}`,
  
  // Active conversations per operator
  ACTIVE_CONVERSATIONS: (operatorId: string) => `hitl:operator:conversations:${operatorId}`,
  
  // Pub/Sub channels
  CHANNEL_UPDATES: (tenantId: string) => `hitl:updates:${tenantId}`,
  CHANNEL_OPERATORS: (tenantId: string) => `hitl:operators:${tenantId}`,
  CHANNEL_COMMANDS: 'hitl:commands',
  
  // Rate limiting
  RATE_LIMIT: (operatorId: string) => `hitl:ratelimit:${operatorId}`,
  
  // Typing indicators
  TYPING: (conversationId: string) => `hitl:typing:${conversationId}`
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Queue Item (stored in sorted set)
 */
export interface RedisQueueItem {
  id: string;
  approvalId: string;
  tenantId: string;
  type: HitlType;
  priority: HitlPriority;
  priorityScore: number;
  
  // Assignment
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS';
  assignedTo: string | null;
  assignedAt: string | null;
  
  // Timing
  createdAt: string;
  slaDeadline: string;
  slaRemaining: number; // milliseconds
  
  // Context
  context: {
    contactId?: string;
    contactName?: string;
    negotiationId?: string;
    conversationId?: string;
    channel?: string;
    documentType?: string;
    requestedBy?: string;
  };
  
  // Requirements
  requiredRole?: OperatorRole;
  requiredSkills?: OperatorSkill[];
  
  // Metadata
  waitTime: number; // milliseconds
  reassignmentCount: number;
  previousAssignees: string[];
}

/**
 * Operator Status (stored in hash)
 */
export interface RedisOperatorStatus {
  status: OperatorStatus;
  sessionId: string;
  since: string;
  awayReason?: string;
  currentLoad: number;
  maxLoad: number;
  lastActivityAt: string;
}

/**
 * SLA Alert (stored in list)
 */
export interface RedisSlaAlert {
  type: 'BREACH' | 'WARNING';
  level?: 50 | 75 | 90;
  itemId: string;
  approvalId: string;
  hitlType: HitlType;
  priority: HitlPriority;
  timestamp: string;
  slaDeadline: string;
  assignedTo?: string;
  contactName?: string;
  message: string;
  messageRo: string;
}

/**
 * Queue Stats (stored as hash)
 */
export interface RedisQueueStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  
  byType: Record<HitlType, number>;
  byPriority: Record<HitlPriority, number>;
  
  slaBreach: number;
  slaAtRisk: number;
  
  avgWaitTime: number;
  maxWaitTime: number;
  
  operatorsOnline: number;
  operatorsBusy: number;
  
  lastUpdated: string;
}

// ============================================================================
// REDIS OPERATIONS
// ============================================================================

export class RedisQueueOperations {
  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger
  ) {}

  // -------------------------------------------------------------------------
  // Queue Operations
  // -------------------------------------------------------------------------

  /**
   * Add item to queue with priority score
   */
  async addToQueue(
    tenantId: string,
    item: RedisQueueItem
  ): Promise<void> {
    const key = REDIS_KEYS.QUEUE(tenantId);
    const itemJson = JSON.stringify(item);
    
    await this.redis
      .multi()
      // Add to sorted set
      .zadd(key, item.priorityScore, item.id)
      // Store item details
      .hset(REDIS_KEYS.ITEM_DETAILS(item.id), 'data', itemJson)
      .hset(REDIS_KEYS.ITEM_DETAILS(item.id), 'tenantId', tenantId)
      // Set expiry (24 hours)
      .expire(key, 86400)
      .expire(REDIS_KEYS.ITEM_DETAILS(item.id), 86400)
      .exec();
  }

  /**
   * Remove item from queue
   */
  async removeFromQueue(
    tenantId: string,
    itemId: string
  ): Promise<void> {
    const key = REDIS_KEYS.QUEUE(tenantId);
    
    await this.redis
      .multi()
      .zrem(key, itemId)
      .del(REDIS_KEYS.ITEM_DETAILS(itemId))
      .exec();
  }

  /**
   * Update item priority score
   */
  async updatePriorityScore(
    tenantId: string,
    itemId: string,
    newScore: number
  ): Promise<void> {
    const key = REDIS_KEYS.QUEUE(tenantId);
    await this.redis.zadd(key, newScore, itemId);
  }

  /**
   * Get top items by priority (highest score first)
   */
  async getTopItems(
    tenantId: string,
    count: number = 10
  ): Promise<RedisQueueItem[]> {
    const key = REDIS_KEYS.QUEUE(tenantId);
    
    // Get item IDs with scores (highest first)
    const itemIds = await this.redis.zrevrange(key, 0, count - 1);
    
    if (itemIds.length === 0) return [];
    
    // Get item details
    const pipeline = this.redis.pipeline();
    for (const id of itemIds) {
      pipeline.hget(REDIS_KEYS.ITEM_DETAILS(id), 'data');
    }
    
    const results = await pipeline.exec();
    
    return results
      .map(([err, data]) => {
        if (err || !data) return null;
        try {
          return JSON.parse(data as string) as RedisQueueItem;
        } catch {
          return null;
        }
      })
      .filter((item): item is RedisQueueItem => item !== null);
  }

  /**
   * Get unassigned items for processing
   */
  async getUnassignedItems(
    tenantId: string,
    count: number = 50
  ): Promise<RedisQueueItem[]> {
    const items = await this.getTopItems(tenantId, count * 2);
    return items.filter(item => item.status === 'PENDING');
  }

  /**
   * Update item in queue
   */
  async updateItem(
    tenantId: string,
    item: RedisQueueItem
  ): Promise<void> {
    const itemJson = JSON.stringify(item);
    
    await this.redis
      .multi()
      .hset(REDIS_KEYS.ITEM_DETAILS(item.id), 'data', itemJson)
      .zadd(REDIS_KEYS.QUEUE(tenantId), item.priorityScore, item.id)
      .exec();
  }

  /**
   * Get item by ID
   */
  async getItem(itemId: string): Promise<RedisQueueItem | null> {
    const data = await this.redis.hget(
      REDIS_KEYS.ITEM_DETAILS(itemId),
      'data'
    );
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as RedisQueueItem;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Operator Operations
  // -------------------------------------------------------------------------

  /**
   * Set operator status
   */
  async setOperatorStatus(
    tenantId: string,
    operatorId: string,
    status: RedisOperatorStatus
  ): Promise<void> {
    const key = REDIS_KEYS.OPERATOR_STATUS(tenantId);
    await this.redis.hset(key, operatorId, JSON.stringify(status));
    await this.redis.expire(key, 86400);
  }

  /**
   * Get operator status
   */
  async getOperatorStatus(
    tenantId: string,
    operatorId: string
  ): Promise<RedisOperatorStatus | null> {
    const key = REDIS_KEYS.OPERATOR_STATUS(tenantId);
    const data = await this.redis.hget(key, operatorId);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as RedisOperatorStatus;
    } catch {
      return null;
    }
  }

  /**
   * Remove operator status (when going offline)
   */
  async removeOperatorStatus(
    tenantId: string,
    operatorId: string
  ): Promise<void> {
    const key = REDIS_KEYS.OPERATOR_STATUS(tenantId);
    await this.redis.hdel(key, operatorId);
  }

  /**
   * Get all online operators
   */
  async getOnlineOperators(
    tenantId: string
  ): Promise<{ operatorId: string; status: RedisOperatorStatus }[]> {
    const key = REDIS_KEYS.OPERATOR_STATUS(tenantId);
    const all = await this.redis.hgetall(key);
    
    const operators: { operatorId: string; status: RedisOperatorStatus }[] = [];
    
    for (const [operatorId, data] of Object.entries(all)) {
      try {
        const status = JSON.parse(data) as RedisOperatorStatus;
        if (status.status !== 'OFFLINE') {
          operators.push({ operatorId, status });
        }
      } catch {
        // Skip invalid entries
      }
    }
    
    return operators;
  }

  /**
   * Add assignment to operator
   */
  async addOperatorAssignment(
    operatorId: string,
    itemId: string
  ): Promise<void> {
    const key = REDIS_KEYS.OPERATOR_ASSIGNMENTS(operatorId);
    await this.redis.sadd(key, itemId);
    await this.redis.expire(key, 86400);
  }

  /**
   * Remove assignment from operator
   */
  async removeOperatorAssignment(
    operatorId: string,
    itemId: string
  ): Promise<void> {
    const key = REDIS_KEYS.OPERATOR_ASSIGNMENTS(operatorId);
    await this.redis.srem(key, itemId);
  }

  /**
   * Get operator assignments
   */
  async getOperatorAssignments(operatorId: string): Promise<string[]> {
    const key = REDIS_KEYS.OPERATOR_ASSIGNMENTS(operatorId);
    return this.redis.smembers(key);
  }

  /**
   * Get operator assignment count
   */
  async getOperatorAssignmentCount(operatorId: string): Promise<number> {
    const key = REDIS_KEYS.OPERATOR_ASSIGNMENTS(operatorId);
    return this.redis.scard(key);
  }

  // -------------------------------------------------------------------------
  // SLA Operations
  // -------------------------------------------------------------------------

  /**
   * Add SLA alert
   */
  async addSlaAlert(
    tenantId: string,
    alert: RedisSlaAlert
  ): Promise<void> {
    const key = REDIS_KEYS.SLA_ALERTS(tenantId);
    
    await this.redis
      .multi()
      .lpush(key, JSON.stringify(alert))
      .ltrim(key, 0, 99) // Keep last 100
      .expire(key, 86400)
      .exec();
  }

  /**
   * Get recent SLA alerts
   */
  async getSlaAlerts(
    tenantId: string,
    count: number = 20
  ): Promise<RedisSlaAlert[]> {
    const key = REDIS_KEYS.SLA_ALERTS(tenantId);
    const alerts = await this.redis.lrange(key, 0, count - 1);
    
    return alerts.map(data => {
      try {
        return JSON.parse(data) as RedisSlaAlert;
      } catch {
        return null;
      }
    }).filter((alert): alert is RedisSlaAlert => alert !== null);
  }

  /**
   * Check if SLA warning was sent
   */
  async wasSlaWarningSent(
    itemId: string,
    level: number
  ): Promise<boolean> {
    const key = REDIS_KEYS.SLA_WARNING(itemId, level);
    return (await this.redis.exists(key)) === 1;
  }

  /**
   * Mark SLA warning as sent
   */
  async markSlaWarningSent(
    itemId: string,
    level: number
  ): Promise<void> {
    const key = REDIS_KEYS.SLA_WARNING(itemId, level);
    await this.redis.set(key, '1', 'EX', 86400);
  }

  // -------------------------------------------------------------------------
  // Stats Operations
  // -------------------------------------------------------------------------

  /**
   * Update queue stats
   */
  async updateQueueStats(
    tenantId: string,
    stats: Partial<RedisQueueStats>
  ): Promise<void> {
    const key = REDIS_KEYS.QUEUE_STATS(tenantId);
    const current = await this.getQueueStats(tenantId);
    
    const updated: RedisQueueStats = {
      ...current,
      ...stats,
      lastUpdated: new Date().toISOString()
    };
    
    await this.redis.set(key, JSON.stringify(updated), 'EX', 300); // 5 min cache
  }

  /**
   * Get queue stats
   */
  async getQueueStats(tenantId: string): Promise<RedisQueueStats> {
    const key = REDIS_KEYS.QUEUE_STATS(tenantId);
    const data = await this.redis.get(key);
    
    if (data) {
      try {
        return JSON.parse(data) as RedisQueueStats;
      } catch {
        // Fall through to default
      }
    }
    
    return {
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      byType: {
        ESCALATION: 0,
        TAKEOVER: 0,
        DISCOUNT_APPROVAL: 0,
        DOCUMENT_APPROVAL: 0
      },
      byPriority: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      },
      slaBreach: 0,
      slaAtRisk: 0,
      avgWaitTime: 0,
      maxWaitTime: 0,
      operatorsOnline: 0,
      operatorsBusy: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  // -------------------------------------------------------------------------
  // Pub/Sub Operations
  // -------------------------------------------------------------------------

  /**
   * Publish queue update
   */
  async publishQueueUpdate(
    tenantId: string,
    event: QueueUpdateEvent
  ): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_UPDATES(tenantId);
    await this.redis.publish(channel, JSON.stringify(event));
  }

  /**
   * Publish operator update
   */
  async publishOperatorUpdate(
    tenantId: string,
    event: OperatorUpdateEvent
  ): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_OPERATORS(tenantId);
    await this.redis.publish(channel, JSON.stringify(event));
  }

  /**
   * Subscribe to queue updates
   */
  async subscribeToQueueUpdates(
    tenantId: string,
    callback: (event: QueueUpdateEvent) => void
  ): Promise<() => void> {
    const subscriber = this.redis.duplicate();
    const channel = REDIS_KEYS.CHANNEL_UPDATES(tenantId);
    
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const event = JSON.parse(message) as QueueUpdateEvent;
          callback(event);
        } catch (err) {
          this.logger.error({ err, message }, 'Failed to parse queue update');
        }
      }
    });
    
    // Return unsubscribe function
    return async () => {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    };
  }

  // -------------------------------------------------------------------------
  // Lock Operations
  // -------------------------------------------------------------------------

  /**
   * Acquire queue lock for exclusive operations
   */
  async acquireQueueLock(
    tenantId: string,
    ttlMs: number = 5000
  ): Promise<string | null> {
    const key = REDIS_KEYS.QUEUE_LOCK(tenantId);
    const lockId = crypto.randomUUID();
    
    const acquired = await this.redis.set(
      key,
      lockId,
      'PX',
      ttlMs,
      'NX'
    );
    
    return acquired ? lockId : null;
  }

  /**
   * Release queue lock
   */
  async releaseQueueLock(
    tenantId: string,
    lockId: string
  ): Promise<boolean> {
    const key = REDIS_KEYS.QUEUE_LOCK(tenantId);
    
    // Use Lua script for atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(script, 1, key, lockId);
    return result === 1;
  }

  /**
   * Execute with lock
   */
  async withLock<T>(
    tenantId: string,
    fn: () => Promise<T>,
    ttlMs: number = 5000
  ): Promise<T | null> {
    const lockId = await this.acquireQueueLock(tenantId, ttlMs);
    
    if (!lockId) {
      this.logger.warn({ tenantId }, 'Failed to acquire queue lock');
      return null;
    }
    
    try {
      return await fn();
    } finally {
      await this.releaseQueueLock(tenantId, lockId);
    }
  }

  // -------------------------------------------------------------------------
  // Typing Indicators
  // -------------------------------------------------------------------------

  /**
   * Set typing indicator
   */
  async setTyping(
    conversationId: string,
    operatorId: string,
    isTyping: boolean
  ): Promise<void> {
    const key = REDIS_KEYS.TYPING(conversationId);
    
    if (isTyping) {
      await this.redis.hset(key, operatorId, Date.now().toString());
      await this.redis.expire(key, 30); // Auto-expire after 30s
    } else {
      await this.redis.hdel(key, operatorId);
    }
  }

  /**
   * Get typing operators
   */
  async getTypingOperators(conversationId: string): Promise<string[]> {
    const key = REDIS_KEYS.TYPING(conversationId);
    const typing = await this.redis.hgetall(key);
    
    const now = Date.now();
    const activeTyping: string[] = [];
    
    for (const [operatorId, timestamp] of Object.entries(typing)) {
      const ts = parseInt(timestamp, 10);
      // Only include if typing started within last 5 seconds
      if (now - ts < 5000) {
        activeTyping.push(operatorId);
      }
    }
    
    return activeTyping;
  }

  // -------------------------------------------------------------------------
  // Rate Limiting
  // -------------------------------------------------------------------------

  /**
   * Check rate limit for operator actions
   */
  async checkRateLimit(
    operatorId: string,
    action: string,
    maxPerMinute: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `${REDIS_KEYS.RATE_LIMIT(operatorId)}:${action}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - 60;
    
    // Remove old entries
    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    
    // Count entries in window
    const count = await this.redis.zcard(key);
    
    if (count >= maxPerMinute) {
      // Get oldest entry to calculate reset time
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetIn = oldest.length > 1 
        ? parseInt(oldest[1], 10) + 60 - now
        : 60;
      
      return {
        allowed: false,
        remaining: 0,
        resetIn
      };
    }
    
    // Add new entry
    await this.redis.zadd(key, now, `${now}:${Math.random()}`);
    await this.redis.expire(key, 120);
    
    return {
      allowed: true,
      remaining: maxPerMinute - count - 1,
      resetIn: 60
    };
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type QueueUpdateEvent = 
  | { type: 'ITEM_ADDED'; item: RedisQueueItem }
  | { type: 'ITEM_ASSIGNED'; itemId: string; operatorId: string }
  | { type: 'ITEM_REMOVED'; itemId: string; reason: string }
  | { type: 'ITEM_REASSIGNED'; itemId: string; fromOperatorId: string; toOperatorId: string }
  | { type: 'ITEM_ESCALATED'; itemId: string; newPriority: HitlPriority }
  | { type: 'SLA_BREACH'; itemId: string; approvalId: string; deadline: string }
  | { type: 'SLA_WARNING'; itemId: string; level: number; slaRemaining: number }
  | { type: 'STATS_UPDATED'; stats: RedisQueueStats };

export type OperatorUpdateEvent =
  | { type: 'OPERATOR_ONLINE'; operatorId: string; displayName: string }
  | { type: 'OPERATOR_OFFLINE'; operatorId: string }
  | { type: 'OPERATOR_AWAY'; operatorId: string; reason?: string }
  | { type: 'OPERATOR_BUSY'; operatorId: string }
  | { type: 'OPERATOR_LOAD_CHANGED'; operatorId: string; currentLoad: number; maxLoad: number }
  | { type: 'TYPING_STARTED'; conversationId: string; operatorId: string }
  | { type: 'TYPING_STOPPED'; conversationId: string; operatorId: string };
```

### 5.6 Real-Time Dashboard WebSocket

```typescript
// src/workers/N-human-intervention/websocket/hitl-websocket.ts

import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket, WebSocketServer } from 'ws';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { Logger } from 'pino';
import { 
  REDIS_KEYS, 
  RedisQueueOperations,
  QueueUpdateEvent,
  OperatorUpdateEvent 
} from '../queue/redis-structures';
import { UnifiedQueueManager } from '../queue/unified-queue-manager';
import { OperatorManager, OperatorStatus } from '../operators/operator-manager';

// ============================================================================
// TYPES
// ============================================================================

interface WebSocketClient {
  ws: WebSocket;
  tenantId: string;
  operatorId: string;
  userId: string;
  subscriptions: Set<string>;
  lastPing: number;
  isAlive: boolean;
}

interface IncomingMessage {
  type: string;
  payload?: Record<string, unknown>;
  requestId?: string;
}

interface OutgoingMessage {
  type: string;
  payload?: Record<string, unknown>;
  requestId?: string;
  error?: string;
  timestamp: string;
}

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

export class HitlWebSocketServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private redisOps: RedisQueueOperations;
  private redisSubscriber: Redis;
  private pingInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly server: FastifyInstance['server'],
    private readonly redis: Redis,
    private readonly queueManager: UnifiedQueueManager,
    private readonly operatorManager: OperatorManager,
    private readonly logger: Logger
  ) {
    super();
    this.redisOps = new RedisQueueOperations(redis, logger);
    this.redisSubscriber = redis.duplicate();
  }

  /**
   * Initialize WebSocket server
   */
  async initialize(): Promise<void> {
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/ws/hitl',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => {
      this.logger.error({ error }, 'WebSocket server error');
    });

    // Start ping interval
    this.pingInterval = setInterval(() => this.pingClients(), 30000);

    // Start stats broadcast interval
    this.statsInterval = setInterval(() => this.broadcastStats(), 5000);

    this.logger.info('HITL WebSocket server initialized');
  }

  /**
   * Verify client connection
   */
  private verifyClient(
    info: { origin: string; req: any },
    callback: (result: boolean, code?: number, message?: string) => void
  ): void {
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      callback(false, 401, 'Missing authentication token');
      return;
    }

    // Verify JWT token (simplified - use proper JWT verification)
    try {
      // const decoded = verifyJwt(token);
      // info.req.user = decoded;
      callback(true);
    } catch (error) {
      callback(false, 401, 'Invalid authentication token');
    }
  }

  /**
   * Handle new connection
   */
  private async handleConnection(ws: WebSocket, req: any): Promise<void> {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tenantId = url.searchParams.get('tenantId') || '';
    const operatorId = url.searchParams.get('operatorId') || '';
    const userId = url.searchParams.get('userId') || '';

    if (!tenantId || !operatorId) {
      this.send(ws, {
        type: 'ERROR',
        error: 'Missing tenantId or operatorId',
        timestamp: new Date().toISOString()
      });
      ws.close(4000, 'Missing required parameters');
      return;
    }

    const clientId = `${tenantId}:${operatorId}`;

    // Close existing connection for same operator
    const existingClient = this.clients.get(clientId);
    if (existingClient) {
      this.send(existingClient.ws, {
        type: 'DISCONNECTED',
        payload: { reason: 'Connected from another location' },
        timestamp: new Date().toISOString()
      });
      existingClient.ws.close(4001, 'Connected from another location');
    }

    // Create client
    const client: WebSocketClient = {
      ws,
      tenantId,
      operatorId,
      userId,
      subscriptions: new Set(['queue', 'operators']),
      lastPing: Date.now(),
      isAlive: true
    };

    this.clients.set(clientId, client);

    // Subscribe to Redis channels
    await this.subscribeToTenantChannels(tenantId);

    // Set up event handlers
    ws.on('message', (data) => this.handleMessage(client, data));
    ws.on('close', () => this.handleDisconnect(client));
    ws.on('pong', () => {
      client.isAlive = true;
      client.lastPing = Date.now();
    });

    // Mark operator as online
    await this.operatorManager.goOnline(operatorId, {
      ipAddress: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      device: 'web'
    });

    // Send welcome message with initial data
    await this.sendInitialData(client);

    this.logger.info(
      { tenantId, operatorId },
      'WebSocket client connected'
    );
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    client: WebSocketClient,
    data: any
  ): Promise<void> {
    try {
      const message: IncomingMessage = JSON.parse(data.toString());

      this.logger.debug(
        { operatorId: client.operatorId, messageType: message.type },
        'WebSocket message received'
      );

      switch (message.type) {
        case 'PING':
          this.send(client.ws, {
            type: 'PONG',
            requestId: message.requestId,
            timestamp: new Date().toISOString()
          });
          break;

        case 'SUBSCRIBE':
          await this.handleSubscribe(client, message);
          break;

        case 'UNSUBSCRIBE':
          await this.handleUnsubscribe(client, message);
          break;

        case 'GET_QUEUE':
          await this.handleGetQueue(client, message);
          break;

        case 'GET_MY_ASSIGNMENTS':
          await this.handleGetMyAssignments(client, message);
          break;

        case 'ACCEPT_ASSIGNMENT':
          await this.handleAcceptAssignment(client, message);
          break;

        case 'DECLINE_ASSIGNMENT':
          await this.handleDeclineAssignment(client, message);
          break;

        case 'START_WORK':
          await this.handleStartWork(client, message);
          break;

        case 'COMPLETE_WORK':
          await this.handleCompleteWork(client, message);
          break;

        case 'SET_STATUS':
          await this.handleSetStatus(client, message);
          break;

        case 'TYPING':
          await this.handleTyping(client, message);
          break;

        case 'SEND_MESSAGE':
          await this.handleSendMessage(client, message);
          break;

        case 'REQUEST_REASSIGNMENT':
          await this.handleRequestReassignment(client, message);
          break;

        case 'ESCALATE':
          await this.handleEscalate(client, message);
          break;

        default:
          this.send(client.ws, {
            type: 'ERROR',
            error: `Unknown message type: ${message.type}`,
            requestId: message.requestId,
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      this.logger.error(
        { error, operatorId: client.operatorId },
        'Error handling WebSocket message'
      );
      this.send(client.ws, {
        type: 'ERROR',
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(client: WebSocketClient): Promise<void> {
    const clientId = `${client.tenantId}:${client.operatorId}`;
    this.clients.delete(clientId);

    // Mark operator as offline
    await this.operatorManager.goOffline(client.operatorId);

    this.logger.info(
      { tenantId: client.tenantId, operatorId: client.operatorId },
      'WebSocket client disconnected'
    );

    // Check if any clients still subscribed to tenant channels
    const tenantClients = Array.from(this.clients.values())
      .filter(c => c.tenantId === client.tenantId);

    if (tenantClients.length === 0) {
      await this.unsubscribeFromTenantChannels(client.tenantId);
    }
  }

  // -------------------------------------------------------------------------
  // Message Handlers
  // -------------------------------------------------------------------------

  private async handleSubscribe(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const channel = message.payload?.channel as string;
    if (channel) {
      client.subscriptions.add(channel);
      this.send(client.ws, {
        type: 'SUBSCRIBED',
        payload: { channel },
        requestId: message.requestId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleUnsubscribe(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const channel = message.payload?.channel as string;
    if (channel) {
      client.subscriptions.delete(channel);
      this.send(client.ws, {
        type: 'UNSUBSCRIBED',
        payload: { channel },
        requestId: message.requestId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleGetQueue(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const { status, type, limit, offset } = message.payload || {};

    const items = await this.queueManager.getQueueItems(client.tenantId, {
      status: status as any,
      type: type as any,
      limit: (limit as number) || 50,
      offset: (offset as number) || 0
    });

    const stats = await this.redisOps.getQueueStats(client.tenantId);

    this.send(client.ws, {
      type: 'QUEUE_DATA',
      payload: { items, stats },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });
  }

  private async handleGetMyAssignments(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const items = await this.queueManager.getQueueItems(client.tenantId, {
      assignedTo: client.operatorId
    });

    this.send(client.ws, {
      type: 'MY_ASSIGNMENTS',
      payload: { items },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });
  }

  private async handleAcceptAssignment(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const itemId = message.payload?.itemId as string;

    if (!itemId) {
      this.sendError(client.ws, 'Missing itemId', message.requestId);
      return;
    }

    // Update item status to IN_PROGRESS
    const item = await this.redisOps.getItem(itemId);
    if (!item) {
      this.sendError(client.ws, 'Item not found', message.requestId);
      return;
    }

    if (item.assignedTo !== client.operatorId) {
      this.sendError(client.ws, 'Not assigned to you', message.requestId);
      return;
    }

    item.status = 'IN_PROGRESS';
    await this.redisOps.updateItem(client.tenantId, item);

    // Update database
    await this.queueManager.updateItemStatus(
      client.tenantId,
      item.approvalId,
      'IN_PROGRESS'
    );

    this.send(client.ws, {
      type: 'ASSIGNMENT_ACCEPTED',
      payload: { itemId, item },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });

    // Broadcast update
    await this.redisOps.publishQueueUpdate(client.tenantId, {
      type: 'ITEM_ASSIGNED',
      itemId,
      operatorId: client.operatorId
    });
  }

  private async handleDeclineAssignment(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const itemId = message.payload?.itemId as string;
    const reason = message.payload?.reason as string;

    if (!itemId) {
      this.sendError(client.ws, 'Missing itemId', message.requestId);
      return;
    }

    const item = await this.redisOps.getItem(itemId);
    if (!item) {
      this.sendError(client.ws, 'Item not found', message.requestId);
      return;
    }

    if (item.assignedTo !== client.operatorId) {
      this.sendError(client.ws, 'Not assigned to you', message.requestId);
      return;
    }

    // Add to previous assignees
    item.previousAssignees.push(client.operatorId);
    item.reassignmentCount++;
    item.assignedTo = null;
    item.assignedAt = null;
    item.status = 'PENDING';

    await this.redisOps.updateItem(client.tenantId, item);
    await this.redisOps.removeOperatorAssignment(client.operatorId, itemId);

    // Update operator workload
    await this.operatorManager.decrementWorkload(client.operatorId);

    // Trigger reassignment
    await this.queueManager.attemptAssignment(client.tenantId, item);

    this.send(client.ws, {
      type: 'ASSIGNMENT_DECLINED',
      payload: { itemId, reason },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });

    this.logger.info(
      { itemId, operatorId: client.operatorId, reason },
      'Assignment declined'
    );
  }

  private async handleStartWork(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const itemId = message.payload?.itemId as string;

    // Mark operator as busy
    await this.operatorManager.setBusy(client.operatorId);

    this.send(client.ws, {
      type: 'WORK_STARTED',
      payload: { itemId },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });
  }

  private async handleCompleteWork(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const itemId = message.payload?.itemId as string;
    const result = message.payload?.result as 'APPROVED' | 'REJECTED';
    const notes = message.payload?.notes as string;

    // This would trigger the appropriate worker to complete the action
    // For now, just acknowledge
    this.send(client.ws, {
      type: 'WORK_COMPLETED',
      payload: { itemId, result },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });
  }

  private async handleSetStatus(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const status = message.payload?.status as OperatorStatus;
    const reason = message.payload?.reason as string;

    switch (status) {
      case 'ONLINE':
        await this.operatorManager.goOnline(client.operatorId, {});
        break;
      case 'AWAY':
        await this.operatorManager.setAway(client.operatorId, reason);
        break;
      case 'BUSY':
        await this.operatorManager.setBusy(client.operatorId);
        break;
      case 'OFFLINE':
        await this.operatorManager.goOffline(client.operatorId);
        break;
    }

    this.send(client.ws, {
      type: 'STATUS_UPDATED',
      payload: { status },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });
  }

  private async handleTyping(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const conversationId = message.payload?.conversationId as string;
    const isTyping = message.payload?.isTyping as boolean;

    await this.redisOps.setTyping(conversationId, client.operatorId, isTyping);

    // Broadcast to other clients watching this conversation
    await this.redisOps.publishQueueUpdate(client.tenantId, {
      type: isTyping ? 'TYPING_STARTED' : 'TYPING_STOPPED',
      conversationId,
      operatorId: client.operatorId
    } as any);
  }

  private async handleSendMessage(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const conversationId = message.payload?.conversationId as string;
    const content = message.payload?.content as string;
    const channel = message.payload?.channel as string;

    // This would integrate with the message sending system
    // For now, acknowledge receipt
    this.send(client.ws, {
      type: 'MESSAGE_SENT',
      payload: { conversationId, messageId: crypto.randomUUID() },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });
  }

  private async handleRequestReassignment(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const itemId = message.payload?.itemId as string;
    const reason = message.payload?.reason as string;
    const targetOperatorId = message.payload?.targetOperatorId as string;

    // Check rate limit
    const rateLimit = await this.redisOps.checkRateLimit(
      client.operatorId,
      'reassignment',
      5 // Max 5 reassignments per minute
    );

    if (!rateLimit.allowed) {
      this.sendError(
        client.ws,
        `Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds`,
        message.requestId
      );
      return;
    }

    // Process reassignment via queue manager
    await this.queueManager.processCommand({
      type: 'REASSIGN',
      itemId,
      fromOperatorId: client.operatorId,
      toOperatorId: targetOperatorId,
      reason
    });

    this.send(client.ws, {
      type: 'REASSIGNMENT_REQUESTED',
      payload: { itemId, targetOperatorId },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });
  }

  private async handleEscalate(
    client: WebSocketClient,
    message: IncomingMessage
  ): Promise<void> {
    const itemId = message.payload?.itemId as string;
    const newPriority = message.payload?.newPriority as HitlPriority;
    const reason = message.payload?.reason as string;

    await this.queueManager.processCommand({
      type: 'ESCALATE',
      itemId,
      newPriority,
      reason
    });

    this.send(client.ws, {
      type: 'ESCALATION_COMPLETE',
      payload: { itemId, newPriority },
      requestId: message.requestId,
      timestamp: new Date().toISOString()
    });
  }

  // -------------------------------------------------------------------------
  // Redis Subscription
  // -------------------------------------------------------------------------

  private async subscribeToTenantChannels(tenantId: string): Promise<void> {
    const queueChannel = REDIS_KEYS.CHANNEL_UPDATES(tenantId);
    const operatorChannel = REDIS_KEYS.CHANNEL_OPERATORS(tenantId);

    await this.redisSubscriber.subscribe(queueChannel, operatorChannel);

    this.redisSubscriber.on('message', (channel, message) => {
      this.handleRedisMessage(tenantId, channel, message);
    });
  }

  private async unsubscribeFromTenantChannels(tenantId: string): Promise<void> {
    const queueChannel = REDIS_KEYS.CHANNEL_UPDATES(tenantId);
    const operatorChannel = REDIS_KEYS.CHANNEL_OPERATORS(tenantId);

    await this.redisSubscriber.unsubscribe(queueChannel, operatorChannel);
  }

  private handleRedisMessage(
    tenantId: string,
    channel: string,
    message: string
  ): void {
    try {
      const event = JSON.parse(message);
      
      // Broadcast to all clients for this tenant
      for (const client of this.clients.values()) {
        if (client.tenantId !== tenantId) continue;

        if (channel.includes('updates') && client.subscriptions.has('queue')) {
          this.send(client.ws, {
            type: 'QUEUE_UPDATE',
            payload: event,
            timestamp: new Date().toISOString()
          });
        }

        if (channel.includes('operators') && client.subscriptions.has('operators')) {
          this.send(client.ws, {
            type: 'OPERATOR_UPDATE',
            payload: event,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      this.logger.error({ error, channel, message }, 'Failed to handle Redis message');
    }
  }

  // -------------------------------------------------------------------------
  // Initial Data
  // -------------------------------------------------------------------------

  private async sendInitialData(client: WebSocketClient): Promise<void> {
    // Queue items
    const queueItems = await this.queueManager.getQueueItems(client.tenantId, {
      limit: 100
    });

    // My assignments
    const myAssignments = await this.queueManager.getQueueItems(client.tenantId, {
      assignedTo: client.operatorId
    });

    // Queue stats
    const stats = await this.redisOps.getQueueStats(client.tenantId);

    // Online operators
    const onlineOperators = await this.redisOps.getOnlineOperators(client.tenantId);

    // SLA alerts
    const slaAlerts = await this.redisOps.getSlaAlerts(client.tenantId, 10);

    // Send welcome message
    this.send(client.ws, {
      type: 'CONNECTED',
      payload: {
        operatorId: client.operatorId,
        tenantId: client.tenantId,
        initialData: {
          queueItems,
          myAssignments,
          stats,
          onlineOperators: onlineOperators.map(o => ({
            operatorId: o.operatorId,
            status: o.status.status,
            currentLoad: o.status.currentLoad,
            maxLoad: o.status.maxLoad
          })),
          slaAlerts
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  private send(ws: WebSocket, message: OutgoingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string, requestId?: string): void {
    this.send(ws, {
      type: 'ERROR',
      error,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  private pingClients(): void {
    for (const [clientId, client] of this.clients) {
      if (!client.isAlive) {
        this.logger.info({ clientId }, 'Terminating unresponsive client');
        client.ws.terminate();
        this.clients.delete(clientId);
        continue;
      }

      client.isAlive = false;
      client.ws.ping();
    }
  }

  private async broadcastStats(): Promise<void> {
    const tenants = new Set(
      Array.from(this.clients.values()).map(c => c.tenantId)
    );

    for (const tenantId of tenants) {
      const stats = await this.queueManager.getQueueStats(tenantId);
      await this.redisOps.updateQueueStats(tenantId, stats);
    }
  }

  /**
   * Shutdown server
   */
  async shutdown(): Promise<void> {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.statsInterval) clearInterval(this.statsInterval);

    // Close all client connections
    for (const client of this.clients.values()) {
      this.send(client.ws, {
        type: 'SERVER_SHUTDOWN',
        timestamp: new Date().toISOString()
      });
      client.ws.close(1001, 'Server shutdown');
    }

    this.clients.clear();

    // Close Redis subscriber
    await this.redisSubscriber.quit();

    // Close WebSocket server
    this.wss.close();

    this.logger.info('HITL WebSocket server shutdown complete');
  }
}
```

### 5.5 Real-time WebSocket Dashboard

```typescript
// src/workers/hitl/websocket-manager.ts

import { WebSocket, WebSocketServer } from 'ws';
import { Redis } from 'ioredis';
import { IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { verify } from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

/**
 * WebSocket Message Types
 */
export enum WsMessageType {
  // Client -> Server
  SUBSCRIBE = 'SUBSCRIBE',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  HEARTBEAT = 'HEARTBEAT',
  ACTION = 'ACTION',
  
  // Server -> Client
  QUEUE_UPDATE = 'QUEUE_UPDATE',
  ITEM_ADDED = 'ITEM_ADDED',
  ITEM_ASSIGNED = 'ITEM_ASSIGNED',
  ITEM_RESOLVED = 'ITEM_RESOLVED',
  ITEM_REMOVED = 'ITEM_REMOVED',
  SLA_WARNING = 'SLA_WARNING',
  SLA_BREACH = 'SLA_BREACH',
  OPERATOR_STATUS = 'OPERATOR_STATUS',
  STATS_UPDATE = 'STATS_UPDATE',
  ERROR = 'ERROR'
}

/**
 * WebSocket Client Interface
 */
interface WsClient {
  ws: WebSocket;
  operatorId: string;
  tenantId: string;
  subscriptions: Set<string>;
  lastHeartbeat: Date;
}

/**
 * WebSocket Manager Class
 */
export class HitlWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WsClient> = new Map();
  private redis: Redis;
  private subscriber: Redis;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '64039'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_HITL_DB || '3')
    });
    
    this.subscriber = this.redis.duplicate();
  }

  /**
   * Initialize WebSocket Server
   */
  async init(server: any): Promise<void> {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/hitl',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start heartbeat checking
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 30000);
    
    // Subscribe to Redis channels
    await this.subscribeToRedis();
    
    logger.info({ event: 'HITL_WS_INIT' }, 'HITL WebSocket server initialized');
  }

  /**
   * Verify Client Authentication
   */
  private verifyClient(
    info: { origin: string; secure: boolean; req: IncomingMessage },
    callback: (result: boolean, code?: number, message?: string) => void
  ): void {
    try {
      const url = parseUrl(info.req.url || '', true);
      const token = url.query.token as string;
      
      if (!token) {
        callback(false, 401, 'Token required');
        return;
      }
      
      // Verify JWT
      const decoded = verify(token, process.env.JWT_SECRET!) as {
        operatorId: string;
        tenantId: string;
      };
      
      // Attach to request for later use
      (info.req as any).auth = decoded;
      
      callback(true);
    } catch (err) {
      logger.warn({ event: 'WS_AUTH_FAILED', error: err }, 'WebSocket auth failed');
      callback(false, 401, 'Invalid token');
    }
  }

  /**
   * Handle New Connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const auth = (req as any).auth as { operatorId: string; tenantId: string };
    const clientId = `${auth.operatorId}-${Date.now()}`;
    
    const client: WsClient = {
      ws,
      operatorId: auth.operatorId,
      tenantId: auth.tenantId,
      subscriptions: new Set(),
      lastHeartbeat: new Date()
    };
    
    this.clients.set(clientId, client);
    
    logger.info({
      event: 'WS_CLIENT_CONNECTED',
      clientId,
      operatorId: auth.operatorId,
      tenantId: auth.tenantId
    }, 'WebSocket client connected');
    
    metrics.gauge('hitl_ws_clients', this.clients.size);
    
    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(clientId, data.toString());
    });
    
    // Handle close
    ws.on('close', () => {
      this.clients.delete(clientId);
      logger.info({ event: 'WS_CLIENT_DISCONNECTED', clientId }, 'WebSocket client disconnected');
      metrics.gauge('hitl_ws_clients', this.clients.size);
    });
    
    // Handle errors
    ws.on('error', (err) => {
      logger.error({ event: 'WS_CLIENT_ERROR', clientId, error: err }, 'WebSocket error');
    });
    
    // Send initial state
    this.sendInitialState(client);
  }

  /**
   * Handle Client Message
   */
  private async handleMessage(clientId: string, data: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case WsMessageType.SUBSCRIBE:
          this.handleSubscribe(client, message.channel);
          break;
          
        case WsMessageType.UNSUBSCRIBE:
          this.handleUnsubscribe(client, message.channel);
          break;
          
        case WsMessageType.HEARTBEAT:
          client.lastHeartbeat = new Date();
          this.send(client, { type: 'HEARTBEAT_ACK', timestamp: Date.now() });
          break;
          
        case WsMessageType.ACTION:
          await this.handleAction(client, message);
          break;
          
        default:
          logger.warn({ event: 'WS_UNKNOWN_MESSAGE', type: message.type }, 'Unknown message type');
      }
    } catch (err) {
      logger.error({ event: 'WS_MESSAGE_ERROR', clientId, error: err }, 'Message handling error');
      this.send(client, { type: WsMessageType.ERROR, error: 'Invalid message format' });
    }
  }

  /**
   * Handle Subscribe
   */
  private handleSubscribe(client: WsClient, channel: string): void {
    // Validate channel belongs to tenant
    if (!channel.includes(client.tenantId)) {
      this.send(client, { type: WsMessageType.ERROR, error: 'Unauthorized channel' });
      return;
    }
    
    client.subscriptions.add(channel);
    logger.debug({ event: 'WS_SUBSCRIBE', channel, operatorId: client.operatorId }, 'Client subscribed');
  }

  /**
   * Handle Unsubscribe
   */
  private handleUnsubscribe(client: WsClient, channel: string): void {
    client.subscriptions.delete(channel);
    logger.debug({ event: 'WS_UNSUBSCRIBE', channel, operatorId: client.operatorId }, 'Client unsubscribed');
  }

  /**
   * Handle Action
   */
  private async handleAction(client: WsClient, message: any): Promise<void> {
    const { action, payload } = message;
    
    // Publish action to Redis for processing
    await this.redis.publish('hitl:actions', JSON.stringify({
      action,
      payload,
      operatorId: client.operatorId,
      tenantId: client.tenantId,
      timestamp: Date.now()
    }));
    
    logger.info({
      event: 'WS_ACTION',
      action,
      operatorId: client.operatorId
    }, 'Action received via WebSocket');
  }

  /**
   * Send Initial State
   */
  private async sendInitialState(client: WsClient): Promise<void> {
    try {
      // Get queue stats
      const statsKey = `hitl:stats:${client.tenantId}`;
      const stats = await this.redis.get(statsKey);
      
      if (stats) {
        this.send(client, {
          type: WsMessageType.STATS_UPDATE,
          stats: JSON.parse(stats)
        });
      }
      
      // Get assigned items for this operator
      const assignmentsKey = `hitl:assignments:${client.operatorId}`;
      const assignments = await this.redis.smembers(assignmentsKey);
      
      if (assignments.length > 0) {
        this.send(client, {
          type: WsMessageType.QUEUE_UPDATE,
          assignments,
          count: assignments.length
        });
      }
      
      // Auto-subscribe to relevant channels
      const channels = [
        `hitl:updates:${client.tenantId}`,
        `hitl:operators:${client.tenantId}`,
        `hitl:personal:${client.operatorId}`
      ];
      
      for (const channel of channels) {
        client.subscriptions.add(channel);
      }
      
    } catch (err) {
      logger.error({ event: 'WS_INITIAL_STATE_ERROR', error: err }, 'Failed to send initial state');
    }
  }

  /**
   * Subscribe to Redis Channels
   */
  private async subscribeToRedis(): Promise<void> {
    await this.subscriber.psubscribe('hitl:*');
    
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.broadcastToSubscribers(channel, message);
    });
  }

  /**
   * Broadcast to Subscribers
   */
  private broadcastToSubscribers(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      for (const [clientId, client] of this.clients) {
        // Check if client is subscribed to this channel
        if (client.subscriptions.has(channel)) {
          this.send(client, {
            channel,
            ...data
          });
        }
        
        // Also check tenant-wide broadcasts
        if (channel.includes(client.tenantId)) {
          this.send(client, {
            channel,
            ...data
          });
        }
      }
    } catch (err) {
      logger.error({ event: 'WS_BROADCAST_ERROR', channel, error: err }, 'Broadcast error');
    }
  }

  /**
   * Send Message to Client
   */
  private send(client: WsClient, data: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast to Tenant
   */
  broadcastToTenant(tenantId: string, data: any): void {
    for (const [clientId, client] of this.clients) {
      if (client.tenantId === tenantId) {
        this.send(client, data);
      }
    }
  }

  /**
   * Broadcast to Operator
   */
  broadcastToOperator(operatorId: string, data: any): void {
    for (const [clientId, client] of this.clients) {
      if (client.operatorId === operatorId) {
        this.send(client, data);
      }
    }
  }

  /**
   * Check Heartbeats
   */
  private checkHeartbeats(): void {
    const timeout = 60000; // 60 seconds
    const now = Date.now();
    
    for (const [clientId, client] of this.clients) {
      if (now - client.lastHeartbeat.getTime() > timeout) {
        logger.info({ event: 'WS_HEARTBEAT_TIMEOUT', clientId }, 'Client heartbeat timeout');
        client.ws.terminate();
        this.clients.delete(clientId);
      }
    }
    
    metrics.gauge('hitl_ws_clients', this.clients.size);
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all client connections
    for (const [clientId, client] of this.clients) {
      client.ws.close(1001, 'Server shutting down');
    }
    
    if (this.wss) {
      this.wss.close();
    }
    
    await this.subscriber.quit();
    await this.redis.quit();
    
    logger.info({ event: 'HITL_WS_SHUTDOWN' }, 'HITL WebSocket server shutdown');
  }
}

// Export singleton
export const hitlWebSocketManager = new HitlWebSocketManager();
```

### 5.6 Real-time Dashboard Frontend Component

```typescript
// src/components/hitl/HitlDashboard.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle,
  Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Progress, Alert, AlertTitle, AlertDescription,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tooltip, TooltipContent, TooltipTrigger
} from '@/components/ui';
import { 
  Clock, AlertTriangle, CheckCircle, User, Phone, Mail, FileText,
  TrendingUp, TrendingDown, Activity, Users, Zap, Timer
} from 'lucide-react';
import { useHitlWebSocket } from '@/hooks/useHitlWebSocket';
import { formatDistanceToNow, format } from 'date-fns';
import { ro } from 'date-fns/locale';

/**
 * Dashboard Props
 */
interface HitlDashboardProps {
  tenantId: string;
  operatorId: string;
}

/**
 * Queue Item Interface
 */
interface QueueItem {
  id: string;
  type: 'ESCALATION' | 'TAKEOVER' | 'DISCOUNT' | 'DOCUMENT';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  summary: string;
  slaDeadline: string;
  slaRemaining: number;
  slaBreached: boolean;
  assignedTo?: string;
  createdAt: string;
  waitTime: number;
  metadata: Record<string, any>;
}

/**
 * Stats Interface
 */
interface QueueStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  unassigned: number;
  breachedSla: number;
  nearingSla: number;
  avgWaitTime: number;
}

/**
 * HITL Dashboard Component
 */
export function HitlDashboard({ tenantId, operatorId }: HitlDashboardProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [filter, setFilter] = useState<{
    type?: string;
    priority?: string;
    status?: string;
    view: 'all' | 'my' | 'unassigned';
  }>({ view: 'my' });
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  
  // WebSocket connection
  const { 
    isConnected, 
    lastMessage, 
    sendMessage 
  } = useHitlWebSocket(tenantId, operatorId);
  
  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    
    switch (lastMessage.type) {
      case 'QUEUE_UPDATE':
        fetchQueueItems();
        break;
        
      case 'ITEM_ADDED':
        setItems(prev => [lastMessage.item, ...prev]);
        break;
        
      case 'ITEM_ASSIGNED':
        setItems(prev => prev.map(item => 
          item.id === lastMessage.itemId 
            ? { ...item, assignedTo: lastMessage.operatorId, status: 'ASSIGNED' }
            : item
        ));
        break;
        
      case 'ITEM_RESOLVED':
      case 'ITEM_REMOVED':
        setItems(prev => prev.filter(item => item.id !== lastMessage.itemId));
        break;
        
      case 'STATS_UPDATE':
        setStats(lastMessage.stats);
        break;
        
      case 'SLA_WARNING':
      case 'SLA_BREACH':
        // Update item SLA status
        setItems(prev => prev.map(item => 
          item.id === lastMessage.itemId 
            ? { ...item, slaBreached: lastMessage.type === 'SLA_BREACH' }
            : item
        ));
        // Show notification
        showSlaNotification(lastMessage);
        break;
    }
  }, [lastMessage]);
  
  // Fetch queue items
  const fetchQueueItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.type) params.set('type', filter.type);
      if (filter.priority) params.set('priority', filter.priority);
      if (filter.status) params.set('status', filter.status);
      if (filter.view === 'my') params.set('assignedTo', operatorId);
      if (filter.view === 'unassigned') params.set('unassignedOnly', 'true');
      
      const response = await fetch(`/api/hitl/queue?${params}`);
      const data = await response.json();
      setItems(data.items);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch queue items:', err);
    }
  }, [filter, operatorId]);
  
  useEffect(() => {
    fetchQueueItems();
  }, [fetchQueueItems]);
  
  // Show SLA notification
  const showSlaNotification = (message: any) => {
    // Use toast or notification system
    console.log('SLA Notification:', message);
  };
  
  // Handle item actions
  const handleAccept = async (itemId: string) => {
    sendMessage({ type: 'ACTION', action: 'ACCEPT', payload: { itemId } });
  };
  
  const handleResolve = async (itemId: string, decision: string, notes?: string) => {
    sendMessage({ 
      type: 'ACTION', 
      action: 'RESOLVE', 
      payload: { itemId, decision, notes } 
    });
  };
  
  const handleEscalate = async (itemId: string, newPriority: string, reason: string) => {
    sendMessage({ 
      type: 'ACTION', 
      action: 'ESCALATE', 
      payload: { itemId, newPriority, reason } 
    });
  };
  
  const handleReassign = async (itemId: string, toOperatorId: string, reason: string) => {
    sendMessage({ 
      type: 'ACTION', 
      action: 'REASSIGN', 
      payload: { itemId, toOperatorId, reason } 
    });
  };
  
  // Priority colors
  const priorityColors: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-green-500'
  };
  
  // Type icons
  const typeIcons: Record<string, React.ReactNode> = {
    ESCALATION: <AlertTriangle className="h-4 w-4" />,
    TAKEOVER: <Phone className="h-4 w-4" />,
    DISCOUNT: <TrendingDown className="h-4 w-4" />,
    DOCUMENT: <FileText className="h-4 w-4" />
  };
  
  // Format SLA remaining
  const formatSlaRemaining = (ms: number): string => {
    if (ms < 0) return 'Depășit';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  };
  
  // Get SLA progress percentage
  const getSlaProgress = (item: QueueItem): number => {
    if (item.slaBreached) return 100;
    const total = new Date(item.slaDeadline).getTime() - new Date(item.createdAt).getTime();
    const used = Date.now() - new Date(item.createdAt).getTime();
    return Math.min((used / total) * 100, 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">HITL Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Conectat' : 'Deconectat'}
          </span>
        </div>
      </div>
      
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total în coadă</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unassigned} neasignate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">SLA Breach</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.breachedSla}</div>
              <p className="text-xs text-muted-foreground">
                {stats.nearingSla} aproape de deadline
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Timp mediu așteptare</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(stats.avgWaitTime / 60000)} min
              </div>
              <p className="text-xs text-muted-foreground">
                în ultimele 24h
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <Zap className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats.byPriority?.CRITICAL || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                necesită atenție imediată
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Tabs value={filter.view} onValueChange={(v) => setFilter(f => ({ ...f, view: v as any }))}>
          <TabsList>
            <TabsTrigger value="my">Sarcinile mele</TabsTrigger>
            <TabsTrigger value="unassigned">Neasignate</TabsTrigger>
            <TabsTrigger value="all">Toate</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Select 
          value={filter.type || 'all'} 
          onValueChange={(v) => setFilter(f => ({ ...f, type: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tip" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate tipurile</SelectItem>
            <SelectItem value="ESCALATION">Escalări</SelectItem>
            <SelectItem value="TAKEOVER">Preluări</SelectItem>
            <SelectItem value="DISCOUNT">Discount-uri</SelectItem>
            <SelectItem value="DOCUMENT">Documente</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={filter.priority || 'all'} 
          onValueChange={(v) => setFilter(f => ({ ...f, priority: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioritate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate prioritățile</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={fetchQueueItems}>
          Reîncarcă
        </Button>
      </div>
      
      {/* Queue Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Tip</TableHead>
              <TableHead>Sumar</TableHead>
              <TableHead className="w-24">Prioritate</TableHead>
              <TableHead className="w-32">SLA</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32">Așteptare</TableHead>
              <TableHead className="w-32">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nu există cereri în coadă
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow 
                  key={item.id}
                  className={item.slaBreached ? 'bg-red-50' : ''}
                  onClick={() => setSelectedItem(item)}
                >
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center">
                          {typeIcons[item.type]}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {item.type === 'ESCALATION' && 'Escalare'}
                        {item.type === 'TAKEOVER' && 'Preluare conversație'}
                        {item.type === 'DISCOUNT' && 'Aprobare discount'}
                        {item.type === 'DOCUMENT' && 'Review document'}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-xs">{item.summary}</span>
                      {item.metadata?.contactName && (
                        <span className="text-xs text-muted-foreground">
                          {item.metadata.contactName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={priorityColors[item.priority]}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className={item.slaBreached ? 'text-red-600 font-bold' : ''}>
                        {formatSlaRemaining(item.slaRemaining)}
                      </span>
                      <Progress 
                        value={getSlaProgress(item)} 
                        className="h-1"
                        indicatorClassName={getSlaProgress(item) > 75 ? 'bg-red-500' : ''}
                      />
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={item.assignedTo ? 'default' : 'outline'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { 
                        addSuffix: true, 
                        locale: ro 
                      })}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex gap-1">
                      {!item.assignedTo && (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(item.id);
                          }}
                        >
                          Accept
                        </Button>
                      )}
                      {item.assignedTo === operatorId && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                        >
                          Deschide
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      
      {/* Item Detail Panel would go here */}
      {selectedItem && (
        <ItemDetailPanel 
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onResolve={handleResolve}
          onEscalate={handleEscalate}
          onReassign={handleReassign}
        />
      )}
    </div>
  );
}

/**
 * Item Detail Panel Component (simplified)
 */
function ItemDetailPanel({ 
  item, 
  onClose, 
  onResolve, 
  onEscalate, 
  onReassign 
}: {
  item: QueueItem;
  onClose: () => void;
  onResolve: (itemId: string, decision: string, notes?: string) => void;
  onEscalate: (itemId: string, newPriority: string, reason: string) => void;
  onReassign: (itemId: string, toOperatorId: string, reason: string) => void;
}) {
  // Render based on item type
  return (
    <Card className="fixed right-0 top-0 h-full w-[500px] shadow-lg z-50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Detalii cerere</CardTitle>
        <Button variant="ghost" onClick={onClose}>×</Button>
      </CardHeader>
      <CardContent>
        {/* Type-specific content */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tip</label>
            <p>{item.type}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Sumar</label>
            <p>{item.summary}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Prioritate</label>
            <Badge className={priorityColors[item.priority]}>{item.priority}</Badge>
          </div>
          <div>
            <label className="text-sm font-medium">Metadata</label>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={() => onResolve(item.id, 'APPROVED')}>
              Aprobă
            </Button>
            <Button variant="destructive" onClick={() => onResolve(item.id, 'REJECTED')}>
              Respinge
            </Button>
            <Button variant="outline" onClick={() => onEscalate(item.id, 'CRITICAL', 'Urgent')}>
              Escalează
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 6. SLA Management System

### 6.1 Overview

Sistemul de Management SLA monitorizează și aplică Service Level Agreements pentru
toate cererile HITL, asigurând rezolvarea la timp și escalarea automată.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SLA MANAGEMENT FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────────┐                                                      │
│    │  HITL Request   │                                                      │
│    │    Created      │                                                      │
│    └────────┬────────┘                                                      │
│             │                                                               │
│             ▼                                                               │
│    ┌─────────────────┐                                                      │
│    │  Calculate SLA  │                                                      │
│    │    Deadline     │                                                      │
│    └────────┬────────┘                                                      │
│             │                                                               │
│    ┌────────┴────────────────────────────────────────────┐                  │
│    │                                                     │                  │
│    ▼                                                     ▼                  │
│  ┌───────────────┐  50%  ┌───────────────┐  75%  ┌───────────────┐         │
│  │   Monitor     │ ────► │   WARNING_50  │ ────► │   WARNING_75  │         │
│  │   Progress    │       │   Notificare  │       │   Notificare  │         │
│  └───────────────┘       └───────────────┘       └───────┬───────┘         │
│                                                          │                  │
│                                                    90%   ▼                  │
│                                                  ┌───────────────┐         │
│                                                  │  CRITICAL_90  │         │
│                                                  │ Force Assign  │         │
│                                                  └───────┬───────┘         │
│                                                          │                  │
│                                                   100%   ▼                  │
│                                                  ┌───────────────┐         │
│                                                  │  SLA BREACH   │         │
│                                                  │   Escalate    │         │
│                                                  └───────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 SLA Configuration

```typescript
// src/workers/hitl/sla/sla-config.ts

/**
 * SLA Priority Configuration
 */
export interface SlaPriorityConfig {
  priority: HitlPriority;
  deadline: number; // milliseconds
  warningThresholds: {
    warning50: number; // 50% of deadline
    warning75: number; // 75% of deadline
    critical90: number; // 90% of deadline
  };
  escalationChain: EscalationLevel[];
  maxEscalations: number;
}

/**
 * Escalation Level Interface
 */
export interface EscalationLevel {
  level: number;
  roles: OperatorRole[];
  timeout: number; // milliseconds until next escalation
  notificationChannels: NotificationChannel[];
  autoReassign: boolean;
}

/**
 * Notification Channel Type
 */
export type NotificationChannel = 'push' | 'email' | 'sms' | 'slack' | 'teams';

/**
 * Default SLA Configuration
 */
export const DEFAULT_SLA_CONFIG: Record<HitlPriority, SlaPriorityConfig> = {
  [HitlPriority.CRITICAL]: {
    priority: HitlPriority.CRITICAL,
    deadline: 15 * 60 * 1000, // 15 minute
    warningThresholds: {
      warning50: 7.5 * 60 * 1000,  // 7.5 minute
      warning75: 11.25 * 60 * 1000, // 11.25 minute
      critical90: 13.5 * 60 * 1000   // 13.5 minute
    },
    escalationChain: [
      {
        level: 1,
        roles: [OperatorRole.TEAM_LEAD],
        timeout: 5 * 60 * 1000, // 5 minute
        notificationChannels: ['push', 'sms', 'slack'],
        autoReassign: true
      },
      {
        level: 2,
        roles: [OperatorRole.SALES_MANAGER, OperatorRole.DIRECTOR],
        timeout: 10 * 60 * 1000, // 10 minute
        notificationChannels: ['push', 'sms', 'email', 'slack'],
        autoReassign: true
      },
      {
        level: 3,
        roles: [OperatorRole.CEO],
        timeout: 0, // No further escalation
        notificationChannels: ['push', 'sms', 'email', 'slack'],
        autoReassign: false
      }
    ],
    maxEscalations: 3
  },
  
  [HitlPriority.HIGH]: {
    priority: HitlPriority.HIGH,
    deadline: 60 * 60 * 1000, // 1 oră
    warningThresholds: {
      warning50: 30 * 60 * 1000,   // 30 minute
      warning75: 45 * 60 * 1000,   // 45 minute
      critical90: 54 * 60 * 1000   // 54 minute
    },
    escalationChain: [
      {
        level: 1,
        roles: [OperatorRole.TEAM_LEAD],
        timeout: 20 * 60 * 1000, // 20 minute
        notificationChannels: ['push', 'slack'],
        autoReassign: true
      },
      {
        level: 2,
        roles: [OperatorRole.SALES_MANAGER],
        timeout: 40 * 60 * 1000, // 40 minute
        notificationChannels: ['push', 'email', 'slack'],
        autoReassign: true
      }
    ],
    maxEscalations: 2
  },
  
  [HitlPriority.MEDIUM]: {
    priority: HitlPriority.MEDIUM,
    deadline: 4 * 60 * 60 * 1000, // 4 ore
    warningThresholds: {
      warning50: 2 * 60 * 60 * 1000,     // 2 ore
      warning75: 3 * 60 * 60 * 1000,     // 3 ore
      critical90: 3.6 * 60 * 60 * 1000   // 3.6 ore
    },
    escalationChain: [
      {
        level: 1,
        roles: [OperatorRole.TEAM_LEAD],
        timeout: 2 * 60 * 60 * 1000, // 2 ore
        notificationChannels: ['push'],
        autoReassign: false
      }
    ],
    maxEscalations: 1
  },
  
  [HitlPriority.LOW]: {
    priority: HitlPriority.LOW,
    deadline: 24 * 60 * 60 * 1000, // 24 ore
    warningThresholds: {
      warning50: 12 * 60 * 60 * 1000,    // 12 ore
      warning75: 18 * 60 * 60 * 1000,    // 18 ore
      critical90: 21.6 * 60 * 60 * 1000  // 21.6 ore
    },
    escalationChain: [],
    maxEscalations: 0
  }
};

/**
 * SLA Configuration per Type Override
 */
export const TYPE_SLA_OVERRIDES: Partial<Record<HitlApprovalType, Partial<SlaPriorityConfig>>> = {
  [HitlApprovalType.TAKEOVER]: {
    // Takeover are SLA mai stricte - conversație live
    deadline: 10 * 60 * 1000, // 10 minute pentru CRITICAL
    warningThresholds: {
      warning50: 5 * 60 * 1000,
      warning75: 7.5 * 60 * 1000,
      critical90: 9 * 60 * 1000
    }
  },
  [HitlApprovalType.DOCUMENT]: {
    // Documentele pot aștepta mai mult
    deadline: 30 * 60 * 1000, // 30 minute pentru CRITICAL
    warningThresholds: {
      warning50: 15 * 60 * 1000,
      warning75: 22.5 * 60 * 1000,
      critical90: 27 * 60 * 1000
    }
  }
};

/**
 * Get SLA Configuration
 */
export function getSlaConfig(
  priority: HitlPriority,
  type?: HitlApprovalType
): SlaPriorityConfig {
  const baseConfig = { ...DEFAULT_SLA_CONFIG[priority] };
  
  if (type && TYPE_SLA_OVERRIDES[type]) {
    return {
      ...baseConfig,
      ...TYPE_SLA_OVERRIDES[type]
    } as SlaPriorityConfig;
  }
  
  return baseConfig;
}
```

### 6.3 SLA Manager Implementation

```typescript
// src/workers/hitl/sla/sla-manager.ts

import { db } from '@/db';
import { hitlApprovals, slaBreaches, escalationHistory } from '@/db/schema';
import { eq, and, sql, lte, isNull } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { notificationService } from '@/services/notification';
import { getSlaConfig, SlaPriorityConfig, EscalationLevel } from './sla-config';

/**
 * SLA Check Result
 */
export interface SlaCheckResult {
  itemId: string;
  status: 'OK' | 'WARNING_50' | 'WARNING_75' | 'CRITICAL_90' | 'BREACHED';
  slaRemaining: number;
  usagePercent: number;
  shouldEscalate: boolean;
  escalationLevel?: number;
}

/**
 * SLA Manager Class
 */
export class SlaManager {
  private redis: Redis;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 10000; // 10 seconds
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '64039'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_HITL_DB || '3'),
      keyPrefix: 'cerniq:hitl:sla:'
    });
  }

  /**
   * Start SLA Monitoring
   */
  async start(): Promise<void> {
    logger.info({ event: 'SLA_MANAGER_START' }, 'Starting SLA Manager');
    
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAllSlas();
      } catch (err) {
        logger.error({ event: 'SLA_CHECK_ERROR', error: err }, 'SLA check error');
      }
    }, this.CHECK_INTERVAL);
    
    logger.info({ event: 'SLA_MANAGER_STARTED' }, 'SLA Manager started');
  }

  /**
   * Stop SLA Monitoring
   */
  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    await this.redis.quit();
    logger.info({ event: 'SLA_MANAGER_STOPPED' }, 'SLA Manager stopped');
  }

  /**
   * Calculate SLA Deadline
   */
  calculateDeadline(
    priority: HitlPriority,
    type: HitlApprovalType,
    createdAt: Date = new Date()
  ): Date {
    const config = getSlaConfig(priority, type);
    return new Date(createdAt.getTime() + config.deadline);
  }

  /**
   * Check All SLAs
   */
  private async checkAllSlas(): Promise<void> {
    const startTime = Date.now();
    
    // Get all pending items
    const pendingItems = await db.select()
      .from(hitlApprovals)
      .where(and(
        sql`status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')`,
        sql`sla_deadline IS NOT NULL`
      ));
    
    let checked = 0;
    let warnings = 0;
    let breaches = 0;
    
    for (const item of pendingItems) {
      const result = await this.checkSla(item);
      checked++;
      
      if (result.status.includes('WARNING')) {
        warnings++;
        await this.handleWarning(item, result);
      } else if (result.status === 'BREACHED') {
        breaches++;
        await this.handleBreach(item, result);
      }
    }
    
    const duration = Date.now() - startTime;
    
    metrics.histogram('hitl_sla_check_duration_ms', duration);
    metrics.gauge('hitl_sla_items_checked', checked);
    metrics.gauge('hitl_sla_warnings_active', warnings);
    metrics.gauge('hitl_sla_breaches_active', breaches);
    
    logger.debug({
      event: 'SLA_CHECK_COMPLETE',
      checked,
      warnings,
      breaches,
      durationMs: duration
    }, 'SLA check completed');
  }

  /**
   * Check Single Item SLA
   */
  async checkSla(item: any): Promise<SlaCheckResult> {
    const now = Date.now();
    const deadline = new Date(item.slaDeadline).getTime();
    const created = new Date(item.createdAt).getTime();
    
    const totalDuration = deadline - created;
    const elapsed = now - created;
    const remaining = deadline - now;
    const usagePercent = (elapsed / totalDuration) * 100;
    
    const config = getSlaConfig(item.priority, item.approvalType);
    
    let status: SlaCheckResult['status'] = 'OK';
    let shouldEscalate = false;
    let escalationLevel: number | undefined;
    
    if (remaining <= 0) {
      status = 'BREACHED';
      shouldEscalate = true;
      escalationLevel = this.calculateEscalationLevel(item, config);
    } else if (elapsed >= config.warningThresholds.critical90) {
      status = 'CRITICAL_90';
      shouldEscalate = !item.assignedTo; // Escalate if unassigned
    } else if (elapsed >= config.warningThresholds.warning75) {
      status = 'WARNING_75';
    } else if (elapsed >= config.warningThresholds.warning50) {
      status = 'WARNING_50';
    }
    
    return {
      itemId: item.id,
      status,
      slaRemaining: remaining,
      usagePercent,
      shouldEscalate,
      escalationLevel
    };
  }

  /**
   * Calculate Escalation Level
   */
  private calculateEscalationLevel(item: any, config: SlaPriorityConfig): number {
    const currentLevel = item.escalationLevel || 0;
    const nextLevel = currentLevel + 1;
    
    if (nextLevel <= config.maxEscalations) {
      return nextLevel;
    }
    
    return currentLevel;
  }

  /**
   * Handle Warning
   */
  private async handleWarning(item: any, result: SlaCheckResult): Promise<void> {
    // Check if warning already sent
    const warningKey = `warning:${item.id}:${result.status}`;
    const alreadySent = await this.redis.get(warningKey);
    
    if (alreadySent) return;
    
    // Mark as sent (24h TTL)
    await this.redis.setex(warningKey, 24 * 60 * 60, '1');
    
    const config = getSlaConfig(item.priority, item.approvalType);
    
    // Determine notification recipients
    const recipients = await this.getWarningRecipients(item, result.status);
    
    // Send notifications
    for (const recipient of recipients) {
      await notificationService.send({
        type: 'SLA_WARNING',
        recipientId: recipient.id,
        tenantId: item.tenantId,
        priority: result.status === 'CRITICAL_90' ? 'HIGH' : 'MEDIUM',
        title: `⚠️ SLA Warning: ${this.getTypeLabel(item.approvalType)}`,
        body: this.getWarningMessage(item, result),
        data: {
          itemId: item.id,
          itemType: item.approvalType,
          warningLevel: result.status,
          slaRemaining: result.slaRemaining,
          usagePercent: result.usagePercent
        },
        channels: result.status === 'CRITICAL_90' ? ['push', 'slack'] : ['push']
      });
    }
    
    // For critical warnings, try force assignment
    if (result.status === 'CRITICAL_90' && !item.assignedTo) {
      await this.forceAssign(item);
    }
    
    // Publish event
    await this.redis.publish(`hitl:updates:${item.tenantId}`, JSON.stringify({
      type: 'SLA_WARNING',
      itemId: item.id,
      warningLevel: result.status,
      slaRemaining: result.slaRemaining
    }));
    
    logger.warn({
      event: 'SLA_WARNING',
      itemId: item.id,
      type: item.approvalType,
      priority: item.priority,
      warningLevel: result.status,
      slaRemaining: result.slaRemaining
    }, 'SLA warning triggered');
    
    metrics.counter('hitl_sla_warnings_total', 1, {
      type: item.approvalType,
      priority: item.priority,
      level: result.status
    });
  }

  /**
   * Handle Breach
   */
  private async handleBreach(item: any, result: SlaCheckResult): Promise<void> {
    // Check if already marked as breached
    if (item.slaBreached) {
      // Check for escalation
      await this.processEscalation(item, result);
      return;
    }
    
    const now = new Date();
    
    // Update database
    await db.update(hitlApprovals)
      .set({
        slaBreached: true,
        slaBreachedAt: now,
        updatedAt: now
      })
      .where(eq(hitlApprovals.id, item.id));
    
    // Record breach
    await db.insert(slaBreaches).values({
      tenantId: item.tenantId,
      hitlApprovalId: item.id,
      approvalType: item.approvalType,
      priority: item.priority,
      breachedAt: now,
      slaDeadline: item.slaDeadline,
      assignedTo: item.assignedTo,
      waitTime: Math.abs(result.slaRemaining),
      resolved: false
    });
    
    const config = getSlaConfig(item.priority, item.approvalType);
    
    // Send breach notifications
    const recipients = await this.getBreachRecipients(item);
    
    for (const recipient of recipients) {
      await notificationService.send({
        type: 'SLA_BREACH',
        recipientId: recipient.id,
        tenantId: item.tenantId,
        priority: 'CRITICAL',
        title: `🚨 SLA Breach: ${this.getTypeLabel(item.approvalType)}`,
        body: this.getBreachMessage(item, result),
        data: {
          itemId: item.id,
          itemType: item.approvalType,
          priority: item.priority,
          breachDuration: Math.abs(result.slaRemaining)
        },
        channels: ['push', 'sms', 'email', 'slack']
      });
    }
    
    // Publish event
    await this.redis.publish(`hitl:updates:${item.tenantId}`, JSON.stringify({
      type: 'SLA_BREACH',
      itemId: item.id,
      priority: item.priority
    }));
    
    // Start escalation chain
    await this.startEscalation(item, config);
    
    logger.error({
      event: 'SLA_BREACH',
      itemId: item.id,
      type: item.approvalType,
      priority: item.priority,
      breachDuration: Math.abs(result.slaRemaining)
    }, 'SLA breach detected');
    
    metrics.counter('hitl_sla_breaches_total', 1, {
      type: item.approvalType,
      priority: item.priority
    });
  }

  /**
   * Start Escalation Chain
   */
  private async startEscalation(item: any, config: SlaPriorityConfig): Promise<void> {
    if (config.escalationChain.length === 0) return;
    
    const firstLevel = config.escalationChain[0];
    
    await this.escalateTo(item, firstLevel, 1);
  }

  /**
   * Process Ongoing Escalation
   */
  private async processEscalation(item: any, result: SlaCheckResult): Promise<void> {
    const config = getSlaConfig(item.priority, item.approvalType);
    const currentLevel = item.escalationLevel || 0;
    
    if (currentLevel >= config.maxEscalations) return;
    
    // Check if timeout for current level has passed
    const lastEscalation = await db.select()
      .from(escalationHistory)
      .where(eq(escalationHistory.hitlApprovalId, item.id))
      .orderBy(sql`escalated_at DESC`)
      .limit(1);
    
    if (lastEscalation.length === 0) {
      // No escalation yet, start chain
      await this.startEscalation(item, config);
      return;
    }
    
    const lastEscalationTime = new Date(lastEscalation[0].escalatedAt).getTime();
    const currentLevelConfig = config.escalationChain[currentLevel - 1];
    
    if (Date.now() - lastEscalationTime > currentLevelConfig.timeout) {
      // Timeout passed, escalate to next level
      const nextLevel = config.escalationChain[currentLevel];
      if (nextLevel) {
        await this.escalateTo(item, nextLevel, currentLevel + 1);
      }
    }
  }

  /**
   * Escalate To Level
   */
  private async escalateTo(
    item: any,
    level: EscalationLevel,
    levelNumber: number
  ): Promise<void> {
    const now = new Date();
    
    // Update item escalation level
    await db.update(hitlApprovals)
      .set({
        escalationLevel: levelNumber,
        updatedAt: now
      })
      .where(eq(hitlApprovals.id, item.id));
    
    // Get operators with required roles
    const eligibleOperators = await db.select()
      .from(operators)
      .innerJoin(operatorRoles, eq(operators.id, operatorRoles.operatorId))
      .where(and(
        eq(operators.tenantId, item.tenantId),
        sql`${operatorRoles.roleName} = ANY(${level.roles})`
      ));
    
    // Record escalation
    await db.insert(escalationHistory).values({
      tenantId: item.tenantId,
      hitlApprovalId: item.id,
      fromLevel: levelNumber - 1,
      toLevel: levelNumber,
      escalatedAt: now,
      escalatedTo: eligibleOperators.map(o => o.operators.id),
      reason: 'SLA breach - automatic escalation'
    });
    
    // Notify eligible operators
    for (const op of eligibleOperators) {
      await notificationService.send({
        type: 'ESCALATION',
        recipientId: op.operators.id,
        tenantId: item.tenantId,
        priority: 'CRITICAL',
        title: `🔥 Escalare Nivel ${levelNumber}: ${this.getTypeLabel(item.approvalType)}`,
        body: `Cerere ${item.id.slice(0, 8)} necesită atenție imediată. SLA depășit.`,
        data: {
          itemId: item.id,
          itemType: item.approvalType,
          escalationLevel: levelNumber
        },
        channels: level.notificationChannels
      });
    }
    
    // Auto-reassign if configured
    if (level.autoReassign && eligibleOperators.length > 0) {
      // Pick operator with lowest load
      const targetOperator = eligibleOperators[0].operators;
      
      await db.update(hitlApprovals)
        .set({
          assignedTo: targetOperator.id,
          assignedAt: now,
          notes: `Auto-reassigned due to escalation level ${levelNumber}`,
          updatedAt: now
        })
        .where(eq(hitlApprovals.id, item.id));
    }
    
    logger.warn({
      event: 'ESCALATION',
      itemId: item.id,
      fromLevel: levelNumber - 1,
      toLevel: levelNumber,
      operators: eligibleOperators.map(o => o.operators.id)
    }, 'Item escalated');
    
    metrics.counter('hitl_escalations_total', 1, {
      type: item.approvalType,
      priority: item.priority,
      level: levelNumber.toString()
    });
  }

  /**
   * Force Assign Item
   */
  private async forceAssign(item: any): Promise<void> {
    // Get any available operator
    const operators = await db.select()
      .from(operators)
      .leftJoin(operatorWorkloads, eq(operators.id, operatorWorkloads.operatorId))
      .where(and(
        eq(operators.tenantId, item.tenantId),
        sql`${operators.status} IN ('ONLINE', 'BUSY')`
      ))
      .orderBy(sql`${operatorWorkloads.currentLoad} ASC NULLS FIRST`)
      .limit(1);
    
    if (operators.length === 0) return;
    
    const targetOperator = operators[0].operators;
    const now = new Date();
    
    await db.update(hitlApprovals)
      .set({
        assignedTo: targetOperator.id,
        assignedAt: now,
        status: HitlStatus.ASSIGNED,
        notes: 'Force assigned due to critical SLA warning',
        updatedAt: now
      })
      .where(eq(hitlApprovals.id, item.id));
    
    // Notify operator
    await notificationService.send({
      type: 'FORCE_ASSIGNMENT',
      recipientId: targetOperator.id,
      tenantId: item.tenantId,
      priority: 'CRITICAL',
      title: `⚡ Asignare Urgentă: ${this.getTypeLabel(item.approvalType)}`,
      body: `Cerere ${item.id.slice(0, 8)} v-a fost asignată automat. SLA critic.`,
      data: {
        itemId: item.id,
        itemType: item.approvalType
      },
      channels: ['push', 'sms']
    });
    
    logger.info({
      event: 'FORCE_ASSIGNMENT',
      itemId: item.id,
      operatorId: targetOperator.id
    }, 'Item force assigned due to critical SLA');
  }

  /**
   * Get Warning Recipients
   */
  private async getWarningRecipients(item: any, warningLevel: string): Promise<any[]> {
    const recipients: any[] = [];
    
    // Always include assigned operator
    if (item.assignedTo) {
      const operator = await db.select()
        .from(operators)
        .where(eq(operators.id, item.assignedTo))
        .limit(1);
      if (operator.length > 0) {
        recipients.push(operator[0]);
      }
    }
    
    // For critical warnings, include team leads
    if (warningLevel === 'CRITICAL_90') {
      const teamLeads = await db.select()
        .from(operators)
        .innerJoin(operatorRoles, eq(operators.id, operatorRoles.operatorId))
        .where(and(
          eq(operators.tenantId, item.tenantId),
          eq(operatorRoles.roleName, OperatorRole.TEAM_LEAD)
        ));
      
      for (const tl of teamLeads) {
        recipients.push(tl.operators);
      }
    }
    
    return recipients;
  }

  /**
   * Get Breach Recipients
   */
  private async getBreachRecipients(item: any): Promise<any[]> {
    // Get all managers
    return db.select()
      .from(operators)
      .innerJoin(operatorRoles, eq(operators.id, operatorRoles.operatorId))
      .where(and(
        eq(operators.tenantId, item.tenantId),
        sql`${operatorRoles.roleName} IN ('TEAM_LEAD', 'SALES_MANAGER', 'DIRECTOR')`
      ))
      .then(results => results.map(r => r.operators));
  }

  /**
   * Get Type Label (Romanian)
   */
  private getTypeLabel(type: HitlApprovalType): string {
    const labels: Record<HitlApprovalType, string> = {
      [HitlApprovalType.ESCALATION]: 'Escalare',
      [HitlApprovalType.TAKEOVER]: 'Preluare',
      [HitlApprovalType.DISCOUNT]: 'Discount',
      [HitlApprovalType.DOCUMENT]: 'Document'
    };
    return labels[type] || type;
  }

  /**
   * Get Warning Message
   */
  private getWarningMessage(item: any, result: SlaCheckResult): string {
    const minutes = Math.round(result.slaRemaining / 60000);
    
    if (result.status === 'WARNING_50') {
      return `Cerere ${item.id.slice(0, 8)} a atins 50% din SLA. Mai sunt ${minutes} minute.`;
    } else if (result.status === 'WARNING_75') {
      return `⚠️ Cerere ${item.id.slice(0, 8)} a atins 75% din SLA. Mai sunt ${minutes} minute!`;
    } else {
      return `🔴 URGENT: Cerere ${item.id.slice(0, 8)} aproape de breach! Mai sunt doar ${minutes} minute!`;
    }
  }

  /**
   * Get Breach Message
   */
  private getBreachMessage(item: any, result: SlaCheckResult): string {
    const minutes = Math.round(Math.abs(result.slaRemaining) / 60000);
    return `❌ Cerere ${item.id.slice(0, 8)} a depășit SLA cu ${minutes} minute! Acțiune imediată necesară.`;
  }
}

// Export singleton
export const slaManager = new SlaManager();
```

### 6.4 SLA Database Schema

```typescript
// src/db/schema/sla.ts

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index
} from 'drizzle-orm/pg-core';
import { tenants } from './core';
import { hitlApprovals } from './hitl';

/**
 * SLA Breaches Table
 */
export const slaBreaches = pgTable('sla_breaches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  hitlApprovalId: uuid('hitl_approval_id').notNull().references(() => hitlApprovals.id),
  
  // Context
  approvalType: varchar('approval_type', { length: 30 }).notNull(),
  priority: varchar('priority', { length: 20 }).notNull(),
  
  // Timing
  breachedAt: timestamp('breached_at').notNull(),
  slaDeadline: timestamp('sla_deadline').notNull(),
  waitTime: integer('wait_time').notNull(), // milliseconds over deadline
  
  // Assignment at breach
  assignedTo: uuid('assigned_to'),
  
  // Resolution
  resolved: boolean('resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by'),
  resolutionTime: integer('resolution_time'), // milliseconds after breach
  
  // Analysis
  rootCause: text('root_cause'),
  preventionAction: text('prevention_action'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('sla_breaches_tenant_idx').on(table.tenantId),
  approvalIdx: index('sla_breaches_approval_idx').on(table.hitlApprovalId),
  breachedAtIdx: index('sla_breaches_breached_at_idx').on(table.breachedAt),
  typeIdx: index('sla_breaches_type_idx').on(table.approvalType),
  priorityIdx: index('sla_breaches_priority_idx').on(table.priority),
  unresolvedIdx: index('sla_breaches_unresolved_idx')
    .on(table.tenantId, table.resolved)
    .where(sql`resolved = false`)
}));

/**
 * Escalation History Table
 */
export const escalationHistory = pgTable('escalation_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  hitlApprovalId: uuid('hitl_approval_id').notNull().references(() => hitlApprovals.id),
  
  // Escalation details
  fromLevel: integer('from_level').notNull(),
  toLevel: integer('to_level').notNull(),
  escalatedAt: timestamp('escalated_at').notNull(),
  escalatedTo: jsonb('escalated_to').notNull(), // array of operator IDs
  
  // Context
  reason: text('reason').notNull(),
  automaticEscalation: boolean('automatic_escalation').default(true),
  escalatedBy: uuid('escalated_by'), // null if automatic
  
  // Response
  respondedAt: timestamp('responded_at'),
  respondedBy: uuid('responded_by'),
  responseTime: integer('response_time'), // milliseconds
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('escalation_history_tenant_idx').on(table.tenantId),
  approvalIdx: index('escalation_history_approval_idx').on(table.hitlApprovalId),
  escalatedAtIdx: index('escalation_history_escalated_at_idx').on(table.escalatedAt),
  levelIdx: index('escalation_history_level_idx').on(table.toLevel)
}));

/**
 * SLA Configuration Table (per tenant override)
 */
export const slaConfigurations = pgTable('sla_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Configuration scope
  approvalType: varchar('approval_type', { length: 30 }),
  priority: varchar('priority', { length: 20 }),
  
  // SLA settings
  deadlineMs: integer('deadline_ms').notNull(),
  warning50ThresholdMs: integer('warning_50_threshold_ms').notNull(),
  warning75ThresholdMs: integer('warning_75_threshold_ms').notNull(),
  critical90ThresholdMs: integer('critical_90_threshold_ms').notNull(),
  
  // Escalation chain
  escalationChain: jsonb('escalation_chain').notNull(),
  maxEscalations: integer('max_escalations').notNull().default(3),
  
  // Active
  enabled: boolean('enabled').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('sla_config_tenant_idx').on(table.tenantId),
  scopeIdx: index('sla_config_scope_idx').on(table.tenantId, table.approvalType, table.priority)
}));
```

---

## 7. Notification System

### 7.1 Overview

Sistemul de notificări oferă comunicare multi-canal către operatori și manageri
pentru evenimente HITL, cu suport pentru push notifications, email, SMS și integrări.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION SYSTEM ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────────┐                             │
│                         │  Notification Event │                             │
│                         │    (from HITL)      │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌─────────────────────┐                             │
│                         │  Notification Queue │                             │
│                         │     (BullMQ)        │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                        │
│                         ┌──────────┴──────────┐                             │
│                         │                     │                             │
│                         ▼                     ▼                             │
│              ┌─────────────────┐   ┌─────────────────┐                      │
│              │  Priority Check  │   │ Preference Check│                      │
│              │  (Critical/High) │   │ (User Settings) │                      │
│              └────────┬────────┘   └────────┬────────┘                      │
│                       │                      │                              │
│                       └──────────┬───────────┘                              │
│                                  │                                          │
│           ┌──────────┬───────────┼───────────┬──────────┐                   │
│           ▼          ▼           ▼           ▼          ▼                   │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│     │   Push   │ │  Email   │ │   SMS    │ │  Slack   │ │  Teams   │       │
│     │  (FCM)   │ │(Resend)  │ │(Twilio)  │ │ Webhook  │ │ Webhook  │       │
│     └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│          │            │            │            │            │              │
│          └────────────┴────────────┴────────────┴────────────┘              │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌─────────────────────┐                             │
│                         │  Delivery Tracking  │                             │
│                         │  (Status + Retry)   │                             │
│                         └─────────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Notification Service Implementation

```typescript
// src/services/notification/notification-service.ts

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { db } from '@/db';
import { notifications, notificationDeliveries, operatorNotificationPreferences } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

// Channel providers
import { FcmProvider } from './providers/fcm';
import { ResendEmailProvider } from './providers/resend';
import { TwilioSmsProvider } from './providers/twilio';
import { SlackProvider } from './providers/slack';
import { TeamsProvider } from './providers/teams';

/**
 * Notification Payload Interface
 */
export interface NotificationPayload {
  type: NotificationType;
  recipientId: string;
  recipientType: 'OPERATOR' | 'USER' | 'CONTACT';
  tenantId: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  
  // Content
  title: string;
  body: string;
  titleRo?: string;
  bodyRo?: string;
  
  // Data
  data?: Record<string, any>;
  
  // Delivery
  channels: NotificationChannel[];
  scheduledFor?: Date;
  
  // Grouping
  groupKey?: string;
  collapseKey?: string;
  
  // Actions
  actions?: NotificationAction[];
}

/**
 * Notification Types
 */
export enum NotificationType {
  // HITL
  ITEM_ASSIGNED = 'ITEM_ASSIGNED',
  ITEM_ESCALATED = 'ITEM_ESCALATED',
  SLA_WARNING = 'SLA_WARNING',
  SLA_BREACH = 'SLA_BREACH',
  FORCE_ASSIGNMENT = 'FORCE_ASSIGNMENT',
  ESCALATION = 'ESCALATION',
  
  // Queue
  QUEUE_ALERT = 'QUEUE_ALERT',
  OPERATOR_OFFLINE = 'OPERATOR_OFFLINE',
  
  // System
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * Notification Channels
 */
export type NotificationChannel = 'push' | 'email' | 'sms' | 'slack' | 'teams' | 'in_app';

/**
 * Notification Action
 */
export interface NotificationAction {
  id: string;
  label: string;
  labelRo?: string;
  action: string; // deep link or action identifier
  destructive?: boolean;
}

/**
 * Delivery Status
 */
export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

/**
 * Notification Service Class
 */
export class NotificationService {
  private queue: Queue;
  private worker: Worker;
  private redis: Redis;
  
  // Providers
  private fcmProvider: FcmProvider;
  private emailProvider: ResendEmailProvider;
  private smsProvider: TwilioSmsProvider;
  private slackProvider: SlackProvider;
  private teamsProvider: TeamsProvider;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '64039'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null
    });
    
    this.queue = new Queue('notifications', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: 100,
        removeOnFail: 1000
      }
    });
    
    // Initialize providers
    this.fcmProvider = new FcmProvider();
    this.emailProvider = new ResendEmailProvider();
    this.smsProvider = new TwilioSmsProvider();
    this.slackProvider = new SlackProvider();
    this.teamsProvider = new TeamsProvider();
    
    // Initialize worker
    this.initWorker();
  }

  /**
   * Initialize Worker
   */
  private initWorker(): void {
    this.worker = new Worker(
      'notifications',
      async (job: Job<NotificationPayload>) => {
        return this.processNotification(job);
      },
      {
        connection: this.redis,
        concurrency: 10
      }
    );
    
    this.worker.on('completed', (job) => {
      logger.debug({ event: 'NOTIFICATION_COMPLETED', jobId: job.id }, 'Notification sent');
    });
    
    this.worker.on('failed', (job, err) => {
      logger.error({ 
        event: 'NOTIFICATION_FAILED', 
        jobId: job?.id, 
        error: err 
      }, 'Notification failed');
      
      metrics.counter('notifications_failed_total', 1, {
        type: job?.data.type || 'unknown'
      });
    });
  }

  /**
   * Send Notification
   */
  async send(payload: NotificationPayload): Promise<string> {
    // Create notification record
    const [notification] = await db.insert(notifications).values({
      tenantId: payload.tenantId,
      recipientId: payload.recipientId,
      recipientType: payload.recipientType,
      type: payload.type,
      priority: payload.priority,
      title: payload.title,
      body: payload.body,
      titleRo: payload.titleRo,
      bodyRo: payload.bodyRo,
      data: payload.data || {},
      channels: payload.channels,
      scheduledFor: payload.scheduledFor,
      groupKey: payload.groupKey,
      collapseKey: payload.collapseKey,
      actions: payload.actions || []
    }).returning();
    
    // Get recipient preferences
    const preferences = await this.getRecipientPreferences(
      payload.recipientId,
      payload.tenantId
    );
    
    // Filter channels based on preferences and priority
    const effectiveChannels = this.filterChannels(
      payload.channels,
      preferences,
      payload.priority
    );
    
    // Add to queue
    const job = await this.queue.add('send', {
      ...payload,
      notificationId: notification.id,
      effectiveChannels
    }, {
      priority: this.getPriorityValue(payload.priority),
      delay: payload.scheduledFor 
        ? new Date(payload.scheduledFor).getTime() - Date.now() 
        : 0
    });
    
    logger.info({
      event: 'NOTIFICATION_QUEUED',
      notificationId: notification.id,
      type: payload.type,
      recipient: payload.recipientId,
      channels: effectiveChannels
    }, 'Notification queued');
    
    metrics.counter('notifications_queued_total', 1, {
      type: payload.type,
      priority: payload.priority
    });
    
    return notification.id;
  }

  /**
   * Process Notification
   */
  private async processNotification(job: Job): Promise<void> {
    const { notificationId, effectiveChannels, ...payload } = job.data;
    
    const results: Map<NotificationChannel, DeliveryStatus> = new Map();
    
    for (const channel of effectiveChannels) {
      try {
        await this.sendToChannel(channel, payload);
        results.set(channel, DeliveryStatus.SENT);
        
        // Record delivery
        await db.insert(notificationDeliveries).values({
          notificationId,
          channel,
          status: DeliveryStatus.SENT,
          sentAt: new Date()
        });
        
        metrics.counter('notifications_sent_total', 1, {
          type: payload.type,
          channel
        });
        
      } catch (err) {
        logger.error({
          event: 'CHANNEL_DELIVERY_FAILED',
          channel,
          notificationId,
          error: err
        }, `Failed to send to ${channel}`);
        
        results.set(channel, DeliveryStatus.FAILED);
        
        await db.insert(notificationDeliveries).values({
          notificationId,
          channel,
          status: DeliveryStatus.FAILED,
          errorMessage: (err as Error).message,
          sentAt: new Date()
        });
      }
    }
    
    // Update notification status
    const allFailed = [...results.values()].every(s => s === DeliveryStatus.FAILED);
    const anySent = [...results.values()].some(s => s === DeliveryStatus.SENT);
    
    await db.update(notifications)
      .set({
        status: allFailed ? 'FAILED' : anySent ? 'SENT' : 'PARTIAL',
        sentAt: new Date(),
        deliveryResults: Object.fromEntries(results)
      })
      .where(eq(notifications.id, notificationId));
  }

  /**
   * Send to Channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload
  ): Promise<void> {
    switch (channel) {
      case 'push':
        await this.fcmProvider.send(payload);
        break;
        
      case 'email':
        await this.emailProvider.send(payload);
        break;
        
      case 'sms':
        await this.smsProvider.send(payload);
        break;
        
      case 'slack':
        await this.slackProvider.send(payload);
        break;
        
      case 'teams':
        await this.teamsProvider.send(payload);
        break;
        
      case 'in_app':
        // In-app notifications are stored in DB, no external delivery
        break;
        
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Get Recipient Preferences
   */
  private async getRecipientPreferences(
    recipientId: string,
    tenantId: string
  ): Promise<OperatorNotificationPrefs | null> {
    const [prefs] = await db.select()
      .from(operatorNotificationPreferences)
      .where(and(
        eq(operatorNotificationPreferences.operatorId, recipientId),
        eq(operatorNotificationPreferences.tenantId, tenantId)
      ))
      .limit(1);
    
    return prefs || null;
  }

  /**
   * Filter Channels Based on Preferences
   */
  private filterChannels(
    requestedChannels: NotificationChannel[],
    preferences: OperatorNotificationPrefs | null,
    priority: string
  ): NotificationChannel[] {
    // Critical notifications always go through all channels
    if (priority === 'CRITICAL') {
      return requestedChannels;
    }
    
    if (!preferences) {
      return requestedChannels;
    }
    
    return requestedChannels.filter(channel => {
      // Check if channel is enabled
      const channelPrefs = preferences.channelSettings?.[channel];
      if (!channelPrefs?.enabled) {
        return false;
      }
      
      // Check quiet hours
      if (preferences.quietHoursEnabled && this.isQuietHours(preferences)) {
        // Only allow push and sms for HIGH priority during quiet hours
        if (priority === 'HIGH') {
          return ['push', 'sms'].includes(channel);
        }
        // Skip medium/low during quiet hours
        return false;
      }
      
      return true;
    });
  }

  /**
   * Check if Currently in Quiet Hours
   */
  private isQuietHours(preferences: OperatorNotificationPrefs): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    const start = preferences.quietHoursStart || 22; // 10 PM
    const end = preferences.quietHoursEnd || 7; // 7 AM
    
    if (start < end) {
      return currentHour >= start && currentHour < end;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return currentHour >= start || currentHour < end;
    }
  }

  /**
   * Get Priority Value for Queue
   */
  private getPriorityValue(priority: string): number {
    const values: Record<string, number> = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 5,
      LOW: 10
    };
    return values[priority] || 5;
  }

  /**
   * Send Batch Notifications
   */
  async sendBatch(payloads: NotificationPayload[]): Promise<string[]> {
    const ids: string[] = [];
    
    for (const payload of payloads) {
      const id = await this.send(payload);
      ids.push(id);
    }
    
    return ids;
  }

  /**
   * Get Notification History
   */
  async getHistory(
    recipientId: string,
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      types?: NotificationType[];
      unreadOnly?: boolean;
    } = {}
  ): Promise<any[]> {
    let query = db.select()
      .from(notifications)
      .where(and(
        eq(notifications.recipientId, recipientId),
        eq(notifications.tenantId, tenantId)
      ))
      .orderBy(sql`created_at DESC`);
    
    if (options.types && options.types.length > 0) {
      query = query.where(sql`type = ANY(${options.types})`);
    }
    
    if (options.unreadOnly) {
      query = query.where(sql`read_at IS NULL`);
    }
    
    return query
      .limit(options.limit || 50)
      .offset(options.offset || 0);
  }

  /**
   * Mark as Read
   */
  async markAsRead(notificationId: string, recipientId: string): Promise<void> {
    await db.update(notifications)
      .set({
        readAt: new Date()
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientId, recipientId)
      ));
  }

  /**
   * Mark All as Read
   */
  async markAllAsRead(recipientId: string, tenantId: string): Promise<number> {
    const result = await db.update(notifications)
      .set({
        readAt: new Date()
      })
      .where(and(
        eq(notifications.recipientId, recipientId),
        eq(notifications.tenantId, tenantId),
        sql`read_at IS NULL`
      ))
      .returning({ id: notifications.id });
    
    return result.length;
  }

  /**
   * Get Unread Count
   */
  async getUnreadCount(recipientId: string, tenantId: string): Promise<number> {
    const [result] = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(notifications)
    .where(and(
      eq(notifications.recipientId, recipientId),
      eq(notifications.tenantId, tenantId),
      sql`read_at IS NULL`
    ));
    
    return result?.count || 0;
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.redis.quit();
  }
}

// Export singleton
export const notificationService = new NotificationService();
```

### 7.3 Channel Providers

```typescript
// src/services/notification/providers/fcm.ts

import * as admin from 'firebase-admin';
import { db } from '@/db';
import { operatorDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * Firebase Cloud Messaging Provider
 */
export class FcmProvider {
  private app: admin.app.App;
  
  constructor() {
    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }

  async send(payload: NotificationPayload): Promise<void> {
    // Get recipient's device tokens
    const devices = await db.select()
      .from(operatorDevices)
      .where(and(
        eq(operatorDevices.operatorId, payload.recipientId),
        eq(operatorDevices.pushEnabled, true)
      ));
    
    if (devices.length === 0) {
      logger.debug({
        event: 'FCM_NO_DEVICES',
        recipientId: payload.recipientId
      }, 'No devices registered for push');
      return;
    }
    
    const tokens = devices.map(d => d.fcmToken).filter(Boolean) as string[];
    
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.titleRo || payload.title,
        body: payload.bodyRo || payload.body
      },
      data: {
        type: payload.type,
        ...Object.fromEntries(
          Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
        )
      },
      android: {
        priority: payload.priority === 'CRITICAL' ? 'high' : 'normal',
        notification: {
          channelId: this.getAndroidChannel(payload.priority),
          priority: payload.priority === 'CRITICAL' ? 'max' : 'high',
          sound: payload.priority === 'CRITICAL' ? 'alarm' : 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.titleRo || payload.title,
              body: payload.bodyRo || payload.body
            },
            sound: payload.priority === 'CRITICAL' ? 'alarm.caf' : 'default',
            'content-available': 1,
            'mutable-content': 1,
            'interruption-level': payload.priority === 'CRITICAL' ? 'critical' : 'active'
          }
        }
      }
    };
    
    // Add actions if present
    if (payload.actions && payload.actions.length > 0) {
      message.android!.notification!.clickAction = 'FLUTTER_NOTIFICATION_CLICK';
      message.data!.actions = JSON.stringify(payload.actions);
    }
    
    const response = await this.app.messaging().sendEachForMulticast(message);
    
    logger.info({
      event: 'FCM_SENT',
      successCount: response.successCount,
      failureCount: response.failureCount,
      recipientId: payload.recipientId
    }, 'FCM notifications sent');
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error?.code === 'messaging/registration-token-not-registered') {
            // Remove invalid token
            this.removeInvalidToken(tokens[idx]);
          }
        }
      });
    }
  }

  private getAndroidChannel(priority: string): string {
    switch (priority) {
      case 'CRITICAL': return 'critical_alerts';
      case 'HIGH': return 'high_priority';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'low_priority';
      default: return 'default';
    }
  }

  private async removeInvalidToken(token: string): Promise<void> {
    await db.delete(operatorDevices)
      .where(eq(operatorDevices.fcmToken, token));
  }
}

// src/services/notification/providers/resend.ts

import { Resend } from 'resend';
import { db } from '@/db';
import { operators } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * Resend Email Provider
 */
export class ResendEmailProvider {
  private client: Resend;
  private fromEmail: string;
  
  constructor() {
    this.client = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'notificari@cerniq.app';
  }

  async send(payload: NotificationPayload): Promise<void> {
    // Get recipient email
    const [operator] = await db.select()
      .from(operators)
      .where(eq(operators.id, payload.recipientId))
      .limit(1);
    
    if (!operator?.email) {
      logger.warn({
        event: 'EMAIL_NO_ADDRESS',
        recipientId: payload.recipientId
      }, 'No email address for recipient');
      return;
    }
    
    const html = this.generateEmailHtml(payload);
    
    const { data, error } = await this.client.emails.send({
      from: this.fromEmail,
      to: operator.email,
      subject: payload.titleRo || payload.title,
      html,
      tags: [
        { name: 'type', value: payload.type },
        { name: 'priority', value: payload.priority },
        { name: 'tenant', value: payload.tenantId }
      ]
    });
    
    if (error) {
      throw error;
    }
    
    logger.info({
      event: 'EMAIL_SENT',
      messageId: data?.id,
      recipientId: payload.recipientId
    }, 'Email notification sent');
  }

  private generateEmailHtml(payload: NotificationPayload): string {
    const priorityColor = {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#22c55e'
    }[payload.priority] || '#6b7280';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${payload.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: ${priorityColor}; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">${payload.titleRo || payload.title}</h1>
      <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 12px; font-size: 12px;">
        Prioritate: ${payload.priority}
      </span>
    </div>
    
    <div style="padding: 24px;">
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        ${payload.bodyRo || payload.body}
      </p>
      
      ${payload.data ? `
        <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #666;">Detalii:</h3>
          ${Object.entries(payload.data)
            .map(([key, value]) => `
              <div style="display: flex; margin-bottom: 8px;">
                <span style="color: #666; min-width: 120px;">${key}:</span>
                <span style="color: #333; font-weight: 500;">${value}</span>
              </div>
            `).join('')}
        </div>
      ` : ''}
      
      ${payload.actions ? `
        <div style="margin-top: 24px; text-align: center;">
          ${payload.actions.map(action => `
            <a href="${action.action}" 
               style="display: inline-block; margin: 4px; padding: 12px 24px; 
                      background: ${action.destructive ? '#ef4444' : '#3b82f6'}; 
                      color: white; text-decoration: none; border-radius: 6px;
                      font-weight: 500;">
              ${action.labelRo || action.label}
            </a>
          `).join('')}
        </div>
      ` : ''}
    </div>
    
    <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #666;">
        Cerniq App - Notificare automată
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

// src/services/notification/providers/twilio.ts

import twilio from 'twilio';
import { db } from '@/db';
import { operators } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * Twilio SMS Provider
 */
export class TwilioSmsProvider {
  private client: twilio.Twilio;
  private fromNumber: string;
  
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  async send(payload: NotificationPayload): Promise<void> {
    // Get recipient phone
    const [operator] = await db.select()
      .from(operators)
      .where(eq(operators.id, payload.recipientId))
      .limit(1);
    
    if (!operator?.phone) {
      logger.warn({
        event: 'SMS_NO_PHONE',
        recipientId: payload.recipientId
      }, 'No phone number for recipient');
      return;
    }
    
    // Format phone for Romanian numbers
    let phone = operator.phone;
    if (phone.startsWith('07')) {
      phone = '+40' + phone.slice(1);
    } else if (!phone.startsWith('+')) {
      phone = '+40' + phone;
    }
    
    const body = this.formatSmsBody(payload);
    
    const message = await this.client.messages.create({
      from: this.fromNumber,
      to: phone,
      body
    });
    
    logger.info({
      event: 'SMS_SENT',
      messageSid: message.sid,
      recipientId: payload.recipientId
    }, 'SMS notification sent');
  }

  private formatSmsBody(payload: NotificationPayload): string {
    const prefix = {
      CRITICAL: '🚨 URGENT',
      HIGH: '⚠️ Important',
      MEDIUM: '📌',
      LOW: 'ℹ️'
    }[payload.priority] || '';
    
    // SMS has 160 char limit for single message
    const title = payload.titleRo || payload.title;
    const body = payload.bodyRo || payload.body;
    
    let message = `${prefix} ${title}\n${body}`;
    
    // Truncate if too long
    if (message.length > 300) {
      message = message.slice(0, 297) + '...';
    }
    
    return message;
  }
}

// src/services/notification/providers/slack.ts

import { WebClient } from '@slack/web-api';
import { db } from '@/db';
import { tenantIntegrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * Slack Provider
 */
export class SlackProvider {
  async send(payload: NotificationPayload): Promise<void> {
    // Get tenant's Slack integration
    const [integration] = await db.select()
      .from(tenantIntegrations)
      .where(and(
        eq(tenantIntegrations.tenantId, payload.tenantId),
        eq(tenantIntegrations.type, 'SLACK'),
        eq(tenantIntegrations.enabled, true)
      ))
      .limit(1);
    
    if (!integration) {
      logger.debug({
        event: 'SLACK_NOT_CONFIGURED',
        tenantId: payload.tenantId
      }, 'Slack not configured for tenant');
      return;
    }
    
    const client = new WebClient(integration.accessToken);
    const channelId = integration.settings?.hitlChannel || integration.settings?.defaultChannel;
    
    if (!channelId) {
      logger.warn({
        event: 'SLACK_NO_CHANNEL',
        tenantId: payload.tenantId
      }, 'No Slack channel configured');
      return;
    }
    
    const blocks = this.buildSlackBlocks(payload);
    
    await client.chat.postMessage({
      channel: channelId,
      text: payload.titleRo || payload.title,
      blocks
    });
    
    logger.info({
      event: 'SLACK_SENT',
      tenantId: payload.tenantId,
      channel: channelId
    }, 'Slack notification sent');
  }

  private buildSlackBlocks(payload: NotificationPayload): any[] {
    const priorityEmoji = {
      CRITICAL: '🚨',
      HIGH: '⚠️',
      MEDIUM: '📌',
      LOW: 'ℹ️'
    }[payload.priority] || '📌';
    
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} ${payload.titleRo || payload.title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.bodyRo || payload.body
        }
      }
    ];
    
    // Add data fields
    if (payload.data && Object.keys(payload.data).length > 0) {
      blocks.push({
        type: 'section',
        fields: Object.entries(payload.data).slice(0, 10).map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:*\n${value}`
        }))
      });
    }
    
    // Add actions
    if (payload.actions && payload.actions.length > 0) {
      blocks.push({
        type: 'actions',
        elements: payload.actions.map(action => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.labelRo || action.label,
            emoji: true
          },
          value: action.id,
          url: action.action,
          style: action.destructive ? 'danger' : 'primary'
        }))
      });
    }
    
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Prioritate: *${payload.priority}* | Tip: *${payload.type}*`
        }
      ]
    });
    
    return blocks;
  }
}
```

### 7.4 Notification Database Schema

```typescript
// src/db/schema/notifications.ts

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index
} from 'drizzle-orm/pg-core';
import { tenants } from './core';

/**
 * Notifications Table
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  recipientId: uuid('recipient_id').notNull(),
  recipientType: varchar('recipient_type', { length: 20 }).notNull(),
  
  // Content
  type: varchar('type', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  titleRo: text('title_ro'),
  bodyRo: text('body_ro'),
  
  // Data
  data: jsonb('data').default({}),
  actions: jsonb('actions').default([]),
  
  // Delivery
  channels: jsonb('channels').notNull(),
  status: varchar('status', { length: 20 }).default('PENDING'),
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  deliveryResults: jsonb('delivery_results'),
  
  // Grouping
  groupKey: varchar('group_key', { length: 100 }),
  collapseKey: varchar('collapse_key', { length: 100 }),
  
  // Read status
  readAt: timestamp('read_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('notifications_tenant_idx').on(table.tenantId),
  recipientIdx: index('notifications_recipient_idx').on(table.recipientId),
  typeIdx: index('notifications_type_idx').on(table.type),
  statusIdx: index('notifications_status_idx').on(table.status),
  createdIdx: index('notifications_created_idx').on(table.createdAt),
  unreadIdx: index('notifications_unread_idx')
    .on(table.recipientId, table.readAt)
    .where(sql`read_at IS NULL`)
}));

/**
 * Notification Deliveries Table
 */
export const notificationDeliveries = pgTable('notification_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull().references(() => notifications.id),
  
  channel: varchar('channel', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  
  // Timing
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  
  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // External reference
  externalId: varchar('external_id', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  notificationIdx: index('deliveries_notification_idx').on(table.notificationId),
  channelIdx: index('deliveries_channel_idx').on(table.channel),
  statusIdx: index('deliveries_status_idx').on(table.status)
}));

/**
 * Operator Notification Preferences Table
 */
export const operatorNotificationPreferences = pgTable('operator_notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Channel settings
  channelSettings: jsonb('channel_settings').default({
    push: { enabled: true },
    email: { enabled: true },
    sms: { enabled: false },
    slack: { enabled: true },
    in_app: { enabled: true }
  }),
  
  // Quiet hours
  quietHoursEnabled: boolean('quiet_hours_enabled').default(false),
  quietHoursStart: integer('quiet_hours_start'), // 0-23
  quietHoursEnd: integer('quiet_hours_end'), // 0-23
  
  // Type preferences
  typePreferences: jsonb('type_preferences').default({}),
  
  // Language
  preferredLanguage: varchar('preferred_language', { length: 5 }).default('ro'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  operatorIdx: index('notif_prefs_operator_idx').on(table.operatorId),
  tenantOperatorUnique: uniqueIndex('notif_prefs_tenant_operator_unique')
    .on(table.tenantId, table.operatorId)
}));

/**
 * Operator Devices Table (for push notifications)
 */
export const operatorDevices = pgTable('operator_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Device info
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  deviceType: varchar('device_type', { length: 20 }).notNull(), // ios, android, web
  deviceName: varchar('device_name', { length: 100 }),
  
  // Push token
  fcmToken: text('fcm_token'),
  apnsToken: text('apns_token'),
  
  // Settings
  pushEnabled: boolean('push_enabled').default(true),
  
  // Activity
  lastActiveAt: timestamp('last_active_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  operatorIdx: index('devices_operator_idx').on(table.operatorId),
  deviceUnique: uniqueIndex('devices_device_unique').on(table.operatorId, table.deviceId)
}));
```

---

## 8. Audit & Compliance System

### 8.1 Overview

Sistemul de Audit oferă logging complet pentru toate acțiunile HITL, cu suport pentru
compliance GDPR, audit trails, hash chains pentru integritate și retenție configurabilă.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUDIT SYSTEM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                    AUDIT EVENT SOURCES                             │   │
│    ├────────────────┬────────────────┬────────────────┬─────────────────┤   │
│    │  HITL Actions  │  Operator Ops  │  System Events │  Data Access    │   │
│    └───────┬────────┴───────┬────────┴───────┬────────┴────────┬────────┘   │
│            │                │                │                 │            │
│            └────────────────┴────────────────┴─────────────────┘            │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌─────────────────────┐                             │
│                         │   Audit Logger      │                             │
│                         │   • Event Capture   │                             │
│                         │   • Hash Chain      │                             │
│                         │   • Encryption      │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                        │
│            ┌───────────────────────┼───────────────────────┐                │
│            ▼                       ▼                       ▼                │
│     ┌─────────────┐        ┌─────────────┐        ┌─────────────┐          │
│     │ PostgreSQL  │        │  Elasticsearch│       │ S3 Archive  │          │
│     │ (Recent)    │        │  (Search)    │        │ (Long-term) │          │
│     └─────────────┘        └─────────────┘        └─────────────┘          │
│                                                                             │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                    COMPLIANCE FEATURES                             │   │
│    ├─────────────┬──────────────┬──────────────┬───────────────────────┤   │
│    │ GDPR Export │ Data Erasure │  Retention   │  Tamper Detection     │   │
│    │   (SAR)     │   (Art. 17)  │   Policy     │   (Hash Chain)        │   │
│    └─────────────┴──────────────┴──────────────┴───────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Audit Logger Implementation

```typescript
// src/services/audit/audit-logger.ts

import { createHash } from 'crypto';
import { db } from '@/db';
import { auditLogs, auditLogHashes } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

/**
 * Audit Event Categories
 */
export enum AuditCategory {
  HITL = 'HITL',
  OPERATOR = 'OPERATOR',
  SYSTEM = 'SYSTEM',
  DATA_ACCESS = 'DATA_ACCESS',
  AUTHENTICATION = 'AUTHENTICATION',
  CONFIGURATION = 'CONFIGURATION'
}

/**
 * Audit Event Types
 */
export enum AuditEventType {
  // HITL Events
  HITL_CREATED = 'HITL_CREATED',
  HITL_ASSIGNED = 'HITL_ASSIGNED',
  HITL_RESOLVED = 'HITL_RESOLVED',
  HITL_ESCALATED = 'HITL_ESCALATED',
  HITL_EXPIRED = 'HITL_EXPIRED',
  HITL_REASSIGNED = 'HITL_REASSIGNED',
  
  // Operator Events
  OPERATOR_LOGIN = 'OPERATOR_LOGIN',
  OPERATOR_LOGOUT = 'OPERATOR_LOGOUT',
  OPERATOR_STATUS_CHANGE = 'OPERATOR_STATUS_CHANGE',
  OPERATOR_PERMISSION_CHANGE = 'OPERATOR_PERMISSION_CHANGE',
  
  // Data Access Events
  DATA_VIEW = 'DATA_VIEW',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_MODIFY = 'DATA_MODIFY',
  DATA_DELETE = 'DATA_DELETE',
  
  // System Events
  SLA_BREACH = 'SLA_BREACH',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIG_CHANGE = 'CONFIG_CHANGE'
}

/**
 * Audit Event Interface
 */
export interface AuditEvent {
  category: AuditCategory;
  eventType: AuditEventType;
  tenantId: string;
  
  // Actor
  actorId?: string;
  actorType: 'OPERATOR' | 'SYSTEM' | 'USER';
  actorName?: string;
  
  // Target
  targetId?: string;
  targetType?: string;
  targetName?: string;
  
  // Details
  description: string;
  descriptionRo?: string;
  metadata?: Record<string, any>;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  
  // Classification
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  
  // Compliance
  gdprRelevant?: boolean;
  retentionDays?: number;
}

/**
 * Audit Log Result
 */
export interface AuditLogResult {
  id: string;
  sequenceNumber: number;
  hash: string;
  previousHash: string;
  timestamp: Date;
}

/**
 * Audit Logger Class
 */
export class AuditLogger {
  private redis: Redis;
  private sequenceCounterKey = 'audit:sequence';
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '64039'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_AUDIT_DB || '4')
    });
  }

  /**
   * Log Audit Event
   */
  async log(event: AuditEvent): Promise<AuditLogResult> {
    const now = new Date();
    
    // Get sequence number atomically
    const sequenceNumber = await this.redis.incr(this.sequenceCounterKey);
    
    // Get previous hash for chain
    const previousHash = await this.getPreviousHash(event.tenantId);
    
    // Prepare event data
    const eventData = {
      ...event,
      timestamp: now.toISOString(),
      sequenceNumber
    };
    
    // Calculate hash (including previous hash for chain)
    const hash = this.calculateHash(eventData, previousHash);
    
    // Store in database
    const [auditLog] = await db.insert(auditLogs).values({
      tenantId: event.tenantId,
      category: event.category,
      eventType: event.eventType,
      
      actorId: event.actorId,
      actorType: event.actorType,
      actorName: event.actorName,
      
      targetId: event.targetId,
      targetType: event.targetType,
      targetName: event.targetName,
      
      description: event.description,
      descriptionRo: event.descriptionRo,
      metadata: event.metadata || {},
      
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      sessionId: event.sessionId,
      
      sensitivity: event.sensitivity,
      gdprRelevant: event.gdprRelevant || false,
      retentionDays: event.retentionDays || this.getDefaultRetention(event.sensitivity),
      
      sequenceNumber,
      hash,
      previousHash,
      
      createdAt: now
    }).returning();
    
    // Store hash for chain verification
    await db.insert(auditLogHashes).values({
      tenantId: event.tenantId,
      sequenceNumber,
      hash,
      previousHash,
      createdAt: now
    });
    
    // Update latest hash in Redis
    await this.redis.set(
      `audit:latest_hash:${event.tenantId}`,
      hash,
      'EX',
      86400 // 24 hours
    );
    
    logger.info({
      event: 'AUDIT_LOG',
      category: event.category,
      eventType: event.eventType,
      actorId: event.actorId,
      targetId: event.targetId,
      sequenceNumber,
      hash
    }, event.description);
    
    metrics.counter('audit_events_total', 1, {
      category: event.category,
      event_type: event.eventType,
      tenant_id: event.tenantId
    });
    
    return {
      id: auditLog.id,
      sequenceNumber,
      hash,
      previousHash,
      timestamp: now
    };
  }

  /**
   * Calculate Hash for Event
   */
  private calculateHash(eventData: any, previousHash: string): string {
    const dataString = JSON.stringify({
      ...eventData,
      previousHash
    });
    
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Get Previous Hash
   */
  private async getPreviousHash(tenantId: string): Promise<string> {
    // Try Redis first
    const cached = await this.redis.get(`audit:latest_hash:${tenantId}`);
    if (cached) return cached;
    
    // Fallback to database
    const [latest] = await db.select({ hash: auditLogHashes.hash })
      .from(auditLogHashes)
      .where(eq(auditLogHashes.tenantId, tenantId))
      .orderBy(desc(auditLogHashes.sequenceNumber))
      .limit(1);
    
    return latest?.hash || '0000000000000000000000000000000000000000000000000000000000000000';
  }

  /**
   * Get Default Retention (days)
   */
  private getDefaultRetention(sensitivity: string): number {
    const retentionMap: Record<string, number> = {
      PUBLIC: 365,
      INTERNAL: 1095, // 3 years
      CONFIDENTIAL: 2555, // 7 years
      RESTRICTED: 3650 // 10 years
    };
    return retentionMap[sensitivity] || 365;
  }

  /**
   * Verify Audit Chain Integrity
   */
  async verifyChainIntegrity(
    tenantId: string,
    startSequence?: number,
    endSequence?: number
  ): Promise<ChainVerificationResult> {
    const query = db.select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(auditLogs.sequenceNumber);
    
    if (startSequence !== undefined) {
      query.where(sql`sequence_number >= ${startSequence}`);
    }
    if (endSequence !== undefined) {
      query.where(sql`sequence_number <= ${endSequence}`);
    }
    
    const logs = await query;
    
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const invalidEntries: number[] = [];
    const missingEntries: number[] = [];
    let expectedSequence = startSequence || 1;
    
    for (const log of logs) {
      // Check for missing sequence numbers
      while (expectedSequence < log.sequenceNumber) {
        missingEntries.push(expectedSequence);
        expectedSequence++;
      }
      
      // Verify hash chain
      const eventData = {
        category: log.category,
        eventType: log.eventType,
        tenantId: log.tenantId,
        actorId: log.actorId,
        actorType: log.actorType,
        targetId: log.targetId,
        description: log.description,
        metadata: log.metadata,
        timestamp: log.createdAt.toISOString(),
        sequenceNumber: log.sequenceNumber
      };
      
      const calculatedHash = this.calculateHash(eventData, log.previousHash);
      
      if (calculatedHash !== log.hash) {
        invalidEntries.push(log.sequenceNumber);
      }
      
      if (log.previousHash !== previousHash && log.sequenceNumber > 1) {
        invalidEntries.push(log.sequenceNumber);
      }
      
      previousHash = log.hash;
      expectedSequence = log.sequenceNumber + 1;
    }
    
    const isValid = invalidEntries.length === 0 && missingEntries.length === 0;
    
    return {
      isValid,
      totalChecked: logs.length,
      invalidEntries,
      missingEntries,
      firstSequence: logs[0]?.sequenceNumber,
      lastSequence: logs[logs.length - 1]?.sequenceNumber,
      verifiedAt: new Date()
    };
  }

  /**
   * Export Audit Logs (GDPR SAR Support)
   */
  async exportForSubject(
    tenantId: string,
    subjectId: string,
    subjectType: 'OPERATOR' | 'USER' | 'CONTACT'
  ): Promise<any[]> {
    return db.select({
      timestamp: auditLogs.createdAt,
      category: auditLogs.category,
      eventType: auditLogs.eventType,
      description: auditLogs.description,
      targetType: auditLogs.targetType,
      targetName: auditLogs.targetName,
      metadata: auditLogs.metadata
    })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.tenantId, tenantId),
      eq(auditLogs.actorId, subjectId),
      eq(auditLogs.actorType, subjectType)
    ))
    .orderBy(desc(auditLogs.createdAt));
  }

  /**
   * Anonymize Subject Data (GDPR Art. 17)
   */
  async anonymizeSubject(
    tenantId: string,
    subjectId: string,
    subjectType: 'OPERATOR' | 'USER' | 'CONTACT'
  ): Promise<number> {
    const anonymizedName = `[DELETED-${subjectId.slice(0, 8)}]`;
    
    // Update actor references
    const actorResult = await db.update(auditLogs)
      .set({
        actorName: anonymizedName,
        metadata: sql`jsonb_set(metadata, '{actorDetails}', '"[DELETED]"')`
      })
      .where(and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.actorId, subjectId),
        eq(auditLogs.actorType, subjectType)
      ))
      .returning({ id: auditLogs.id });
    
    // Update target references
    const targetResult = await db.update(auditLogs)
      .set({
        targetName: anonymizedName,
        metadata: sql`jsonb_set(metadata, '{targetDetails}', '"[DELETED]"')`
      })
      .where(and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.targetId, subjectId)
      ))
      .returning({ id: auditLogs.id });
    
    const total = actorResult.length + targetResult.length;
    
    // Log the anonymization
    await this.log({
      category: AuditCategory.SYSTEM,
      eventType: AuditEventType.DATA_DELETE,
      tenantId,
      actorId: 'SYSTEM',
      actorType: 'SYSTEM',
      targetId: subjectId,
      targetType: subjectType,
      description: `GDPR erasure: ${total} audit records anonymized`,
      sensitivity: 'RESTRICTED',
      gdprRelevant: true
    });
    
    return total;
  }

  /**
   * Apply Retention Policy
   */
  async applyRetentionPolicy(tenantId: string): Promise<RetentionResult> {
    const now = new Date();
    
    // Find expired logs
    const expiredLogs = await db.select({
      id: auditLogs.id,
      retentionDays: auditLogs.retentionDays,
      createdAt: auditLogs.createdAt
    })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.tenantId, tenantId),
      sql`created_at + (retention_days || ' days')::interval < ${now}`
    ));
    
    if (expiredLogs.length === 0) {
      return { archived: 0, deleted: 0 };
    }
    
    // Archive to cold storage first
    const archived = await this.archiveLogs(tenantId, expiredLogs.map(l => l.id));
    
    // Delete from hot storage
    await db.delete(auditLogs)
      .where(sql`id = ANY(${expiredLogs.map(l => l.id)})`);
    
    return {
      archived: archived.length,
      deleted: expiredLogs.length
    };
  }

  /**
   * Archive Logs to Cold Storage
   */
  private async archiveLogs(tenantId: string, logIds: string[]): Promise<any[]> {
    // In production, this would upload to S3/GCS
    // For now, we insert into archive table
    const logs = await db.select()
      .from(auditLogs)
      .where(sql`id = ANY(${logIds})`);
    
    // Insert to archive table
    await db.insert(auditLogsArchive).values(
      logs.map(log => ({
        ...log,
        archivedAt: new Date()
      }))
    );
    
    logger.info({
      event: 'AUDIT_LOGS_ARCHIVED',
      tenantId,
      count: logs.length
    }, 'Audit logs archived');
    
    return logs;
  }
}

/**
 * Chain Verification Result
 */
export interface ChainVerificationResult {
  isValid: boolean;
  totalChecked: number;
  invalidEntries: number[];
  missingEntries: number[];
  firstSequence?: number;
  lastSequence?: number;
  verifiedAt: Date;
}

/**
 * Retention Result
 */
export interface RetentionResult {
  archived: number;
  deleted: number;
}

// Export singleton
export const auditLogger = new AuditLogger();
```

### 8.3 Audit Database Schema

```typescript
// src/db/schema/audit.ts

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  index
} from 'drizzle-orm/pg-core';
import { tenants } from './core';

/**
 * Audit Logs Table
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Event classification
  category: varchar('category', { length: 30 }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  
  // Actor (who performed the action)
  actorId: uuid('actor_id'),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  actorName: varchar('actor_name', { length: 100 }),
  
  // Target (what was affected)
  targetId: uuid('target_id'),
  targetType: varchar('target_type', { length: 50 }),
  targetName: varchar('target_name', { length: 255 }),
  
  // Description
  description: text('description').notNull(),
  descriptionRo: text('description_ro'),
  metadata: jsonb('metadata').default({}),
  
  // Context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }),
  
  // Classification
  sensitivity: varchar('sensitivity', { length: 20 }).notNull().default('INTERNAL'),
  gdprRelevant: boolean('gdpr_relevant').default(false),
  retentionDays: integer('retention_days').notNull().default(365),
  
  // Hash chain
  sequenceNumber: bigint('sequence_number', { mode: 'number' }).notNull(),
  hash: varchar('hash', { length: 64 }).notNull(),
  previousHash: varchar('previous_hash', { length: 64 }).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('audit_logs_tenant_idx').on(table.tenantId),
  categoryIdx: index('audit_logs_category_idx').on(table.category),
  eventTypeIdx: index('audit_logs_event_type_idx').on(table.eventType),
  actorIdx: index('audit_logs_actor_idx').on(table.actorId, table.actorType),
  targetIdx: index('audit_logs_target_idx').on(table.targetId),
  createdIdx: index('audit_logs_created_idx').on(table.createdAt),
  sequenceIdx: index('audit_logs_sequence_idx').on(table.tenantId, table.sequenceNumber),
  hashIdx: index('audit_logs_hash_idx').on(table.hash),
  gdprIdx: index('audit_logs_gdpr_idx')
    .on(table.tenantId, table.gdprRelevant)
    .where(sql`gdpr_relevant = true`),
  retentionIdx: index('audit_logs_retention_idx').on(table.createdAt, table.retentionDays)
}));

/**
 * Audit Log Hashes Table (for chain verification)
 */
export const auditLogHashes = pgTable('audit_log_hashes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  sequenceNumber: bigint('sequence_number', { mode: 'number' }).notNull(),
  hash: varchar('hash', { length: 64 }).notNull(),
  previousHash: varchar('previous_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantSequenceIdx: index('audit_hashes_tenant_seq_idx')
    .on(table.tenantId, table.sequenceNumber),
  hashIdx: index('audit_hashes_hash_idx').on(table.hash)
}));

/**
 * Audit Logs Archive Table (cold storage)
 */
export const auditLogsArchive = pgTable('audit_logs_archive', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  actorId: uuid('actor_id'),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  targetId: uuid('target_id'),
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  sequenceNumber: bigint('sequence_number', { mode: 'number' }).notNull(),
  hash: varchar('hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
  archivedAt: timestamp('archived_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('audit_archive_tenant_idx').on(table.tenantId),
  createdIdx: index('audit_archive_created_idx').on(table.createdAt),
  archivedIdx: index('audit_archive_archived_idx').on(table.archivedAt)
}));

/**
 * GDPR Data Subject Requests Table
 */
export const gdprRequests = pgTable('gdpr_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Request type
  requestType: varchar('request_type', { length: 30 }).notNull(), // SAR, ERASURE, RECTIFICATION, PORTABILITY
  
  // Subject
  subjectId: uuid('subject_id').notNull(),
  subjectType: varchar('subject_type', { length: 20 }).notNull(),
  subjectEmail: varchar('subject_email', { length: 255 }),
  
  // Request details
  requestedAt: timestamp('requested_at').notNull(),
  requestSource: varchar('request_source', { length: 50 }), // EMAIL, FORM, API
  requestDetails: text('request_details'),
  
  // Processing
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  assignedTo: uuid('assigned_to'),
  processedAt: timestamp('processed_at'),
  processedBy: uuid('processed_by'),
  
  // Response
  responseDetails: text('response_details'),
  exportFileUrl: text('export_file_url'),
  
  // Compliance
  deadline: timestamp('deadline').notNull(), // 30 days from request
  deadlineExtended: boolean('deadline_extended').default(false),
  extensionReason: text('extension_reason'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdx: index('gdpr_requests_tenant_idx').on(table.tenantId),
  subjectIdx: index('gdpr_requests_subject_idx').on(table.subjectId),
  statusIdx: index('gdpr_requests_status_idx').on(table.status),
  deadlineIdx: index('gdpr_requests_deadline_idx').on(table.deadline)
}));
```

### 8.4 HITL Audit Helper

```typescript
// src/services/audit/hitl-audit-helper.ts

import { auditLogger, AuditCategory, AuditEventType } from './audit-logger';

/**
 * HITL Audit Helper - simplifies logging HITL events
 */
export class HitlAuditHelper {
  /**
   * Log HITL Creation
   */
  static async logCreation(
    tenantId: string,
    hitlId: string,
    type: string,
    priority: string,
    createdBy: { id: string; type: 'OPERATOR' | 'SYSTEM'; name?: string },
    context?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<void> {
    await auditLogger.log({
      category: AuditCategory.HITL,
      eventType: AuditEventType.HITL_CREATED,
      tenantId,
      actorId: createdBy.id,
      actorType: createdBy.type,
      actorName: createdBy.name,
      targetId: hitlId,
      targetType: 'HITL_APPROVAL',
      description: `HITL request created: ${type} with priority ${priority}`,
      descriptionRo: `Cerere HITL creată: ${type} cu prioritate ${priority}`,
      metadata: { type, priority },
      sensitivity: 'INTERNAL',
      gdprRelevant: true,
      ...context
    });
  }

  /**
   * Log HITL Assignment
   */
  static async logAssignment(
    tenantId: string,
    hitlId: string,
    operatorId: string,
    operatorName: string,
    assignedBy: { id: string; type: 'OPERATOR' | 'SYSTEM'; name?: string },
    context?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<void> {
    await auditLogger.log({
      category: AuditCategory.HITL,
      eventType: AuditEventType.HITL_ASSIGNED,
      tenantId,
      actorId: assignedBy.id,
      actorType: assignedBy.type,
      actorName: assignedBy.name,
      targetId: hitlId,
      targetType: 'HITL_APPROVAL',
      targetName: `Assigned to ${operatorName}`,
      description: `HITL request assigned to operator ${operatorName}`,
      descriptionRo: `Cerere HITL asignată operatorului ${operatorName}`,
      metadata: { operatorId, operatorName },
      sensitivity: 'INTERNAL',
      gdprRelevant: true,
      ...context
    });
  }

  /**
   * Log HITL Resolution
   */
  static async logResolution(
    tenantId: string,
    hitlId: string,
    decision: 'APPROVED' | 'REJECTED' | 'EXPIRED',
    resolvedBy: { id: string; type: 'OPERATOR' | 'SYSTEM'; name?: string },
    details: { notes?: string; reason?: string },
    context?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<void> {
    await auditLogger.log({
      category: AuditCategory.HITL,
      eventType: AuditEventType.HITL_RESOLVED,
      tenantId,
      actorId: resolvedBy.id,
      actorType: resolvedBy.type,
      actorName: resolvedBy.name,
      targetId: hitlId,
      targetType: 'HITL_APPROVAL',
      description: `HITL request resolved with decision: ${decision}`,
      descriptionRo: `Cerere HITL rezolvată cu decizia: ${decision}`,
      metadata: { decision, ...details },
      sensitivity: 'INTERNAL',
      gdprRelevant: true,
      ...context
    });
  }

  /**
   * Log HITL Escalation
   */
  static async logEscalation(
    tenantId: string,
    hitlId: string,
    fromLevel: number,
    toLevel: number,
    escalatedBy: { id: string; type: 'OPERATOR' | 'SYSTEM'; name?: string },
    reason: string,
    context?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<void> {
    await auditLogger.log({
      category: AuditCategory.HITL,
      eventType: AuditEventType.HITL_ESCALATED,
      tenantId,
      actorId: escalatedBy.id,
      actorType: escalatedBy.type,
      actorName: escalatedBy.name,
      targetId: hitlId,
      targetType: 'HITL_APPROVAL',
      description: `HITL request escalated from level ${fromLevel} to ${toLevel}: ${reason}`,
      descriptionRo: `Cerere HITL escaladată de la nivelul ${fromLevel} la ${toLevel}: ${reason}`,
      metadata: { fromLevel, toLevel, reason },
      sensitivity: 'INTERNAL',
      ...context
    });
  }

  /**
   * Log SLA Breach
   */
  static async logSlaBreach(
    tenantId: string,
    hitlId: string,
    type: string,
    priority: string,
    breachDuration: number,
    assignedTo?: string
  ): Promise<void> {
    await auditLogger.log({
      category: AuditCategory.HITL,
      eventType: AuditEventType.SLA_BREACH,
      tenantId,
      actorId: 'SYSTEM',
      actorType: 'SYSTEM',
      targetId: hitlId,
      targetType: 'HITL_APPROVAL',
      description: `SLA breach detected for ${type} request. Overdue by ${Math.round(breachDuration / 60000)} minutes`,
      descriptionRo: `Încălcare SLA detectată pentru cererea ${type}. Depășit cu ${Math.round(breachDuration / 60000)} minute`,
      metadata: { 
        type, 
        priority, 
        breachDurationMs: breachDuration,
        assignedTo 
      },
      sensitivity: 'CONFIDENTIAL'
    });
  }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// src/workers/hitl/__tests__/unified-queue-manager.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedQueueManager, QueueItem, HitlApprovalType, HitlPriority } from '../unified-queue-manager';
import { Redis } from 'ioredis-mock';

describe('UnifiedQueueManager', () => {
  let queueManager: UnifiedQueueManager;
  let mockRedis: Redis;
  
  beforeEach(() => {
    mockRedis = new Redis();
    vi.spyOn(queueManager as any, 'redis', 'get').mockReturnValue(mockRedis);
    queueManager = new UnifiedQueueManager();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculatePriorityScore', () => {
    it('should give CRITICAL higher score than HIGH', () => {
      const criticalItem = {
        priority: HitlPriority.CRITICAL,
        type: HitlApprovalType.ESCALATION,
        slaDeadline: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date()
      };
      
      const highItem = {
        priority: HitlPriority.HIGH,
        type: HitlApprovalType.ESCALATION,
        slaDeadline: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date()
      };
      
      const criticalScore = (queueManager as any).calculatePriorityScore(criticalItem);
      const highScore = (queueManager as any).calculatePriorityScore(highItem);
      
      expect(criticalScore).toBeGreaterThan(highScore);
    });
    
    it('should increase score as SLA deadline approaches', () => {
      const item = {
        priority: HitlPriority.HIGH,
        type: HitlApprovalType.DISCOUNT,
        createdAt: new Date()
      };
      
      const earlyItem = { ...item, slaDeadline: new Date(Date.now() + 60 * 60 * 1000) };
      const lateItem = { ...item, slaDeadline: new Date(Date.now() + 5 * 60 * 1000) };
      
      const earlyScore = (queueManager as any).calculatePriorityScore(earlyItem);
      const lateScore = (queueManager as any).calculatePriorityScore(lateItem);
      
      expect(lateScore).toBeGreaterThan(earlyScore);
    });
    
    it('should apply type multiplier', () => {
      const baseItem = {
        priority: HitlPriority.HIGH,
        slaDeadline: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date()
      };
      
      const takeoverItem = { ...baseItem, type: HitlApprovalType.TAKEOVER };
      const documentItem = { ...baseItem, type: HitlApprovalType.DOCUMENT };
      
      const takeoverScore = (queueManager as any).calculatePriorityScore(takeoverItem);
      const documentScore = (queueManager as any).calculatePriorityScore(documentItem);
      
      expect(takeoverScore).toBeGreaterThan(documentScore);
    });
    
    it('should massively boost breached SLA items', () => {
      const breachedItem = {
        priority: HitlPriority.HIGH,
        type: HitlApprovalType.ESCALATION,
        slaDeadline: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
        createdAt: new Date(Date.now() - 70 * 60 * 1000)
      };
      
      const normalItem = {
        priority: HitlPriority.HIGH,
        type: HitlApprovalType.ESCALATION,
        slaDeadline: new Date(Date.now() + 50 * 60 * 1000),
        createdAt: new Date()
      };
      
      const breachedScore = (queueManager as any).calculatePriorityScore(breachedItem);
      const normalScore = (queueManager as any).calculatePriorityScore(normalItem);
      
      expect(breachedScore).toBeGreaterThan(normalScore * 10);
    });
  });

  describe('scoreOperatorForItem', () => {
    const mockOperator = {
      operatorId: 'op-1',
      tenantId: 'tenant-1',
      status: 'ONLINE' as const,
      currentLoad: 3,
      maxLoad: 10,
      skills: ['SALES_GENERAL', 'NEGOTIATION'],
      roles: ['OPERATOR', 'SALES_MANAGER'],
      avgResolutionTime: 300000, // 5 min
      resolutionRate: 0.95,
      currentAssignments: 3,
      preferredTypes: [HitlApprovalType.DISCOUNT],
      excludedTypes: []
    };
    
    const mockItem: QueueItem = {
      id: 'item-1',
      type: HitlApprovalType.DISCOUNT,
      tenantId: 'tenant-1',
      priority: HitlPriority.HIGH,
      priorityScore: 1000,
      status: 'PENDING',
      slaDeadline: new Date(),
      slaRemaining: 3600000,
      slaBreached: false,
      referenceId: 'ref-1',
      referenceTable: 'negotiations',
      summary: 'Test item',
      metadata: {},
      createdAt: new Date(),
      waitTime: 0,
      requiredSkills: ['SALES_GENERAL'],
      requiredRole: 'OPERATOR'
    };
    
    it('should return 0 for operator at max capacity', () => {
      const fullOperator = { ...mockOperator, currentLoad: 10 };
      const score = (queueManager as any).scoreOperatorForItem(fullOperator, mockItem);
      expect(score).toBe(0);
    });
    
    it('should return 0 for missing required role', () => {
      const itemWithRole = { ...mockItem, requiredRole: 'CEO' };
      const score = (queueManager as any).scoreOperatorForItem(mockOperator, itemWithRole);
      expect(score).toBe(0);
    });
    
    it('should return 0 for missing required skill', () => {
      const itemWithSkill = { ...mockItem, requiredSkills: ['LEGAL'] };
      const score = (queueManager as any).scoreOperatorForItem(mockOperator, itemWithSkill);
      expect(score).toBe(0);
    });
    
    it('should give bonus for preferred type', () => {
      const preferredItem = { ...mockItem, type: HitlApprovalType.DISCOUNT };
      const otherItem = { ...mockItem, type: HitlApprovalType.ESCALATION };
      
      const preferredScore = (queueManager as any).scoreOperatorForItem(mockOperator, preferredItem);
      const otherScore = (queueManager as any).scoreOperatorForItem(mockOperator, otherItem);
      
      expect(preferredScore).toBeGreaterThan(otherScore);
    });
    
    it('should prefer operators with lower load', () => {
      const lowLoadOperator = { ...mockOperator, currentLoad: 2 };
      const highLoadOperator = { ...mockOperator, currentLoad: 8 };
      
      const lowScore = (queueManager as any).scoreOperatorForItem(lowLoadOperator, mockItem);
      const highScore = (queueManager as any).scoreOperatorForItem(highLoadOperator, mockItem);
      
      expect(lowScore).toBeGreaterThan(highScore);
    });
  });
});
```

### 9.2 Integration Tests

```typescript
// src/workers/hitl/__tests__/hitl-integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db, testDb } from '@/db/test-utils';
import { hitlApprovals, operators, operatorWorkloads } from '@/db/schema';
import { unifiedQueueManager } from '../unified-queue-manager';
import { operatorManager } from '../operator-manager';
import { slaManager } from '../sla/sla-manager';
import { setupTestTenant, cleanupTestData } from '@/test/helpers';

describe('HITL Integration Tests', () => {
  let tenantId: string;
  let operatorId: string;
  
  beforeAll(async () => {
    // Setup test tenant and operator
    const testData = await setupTestTenant();
    tenantId = testData.tenantId;
    operatorId = testData.operatorId;
    
    // Start services
    await unifiedQueueManager.start();
    await slaManager.start();
  });
  
  afterAll(async () => {
    await unifiedQueueManager.stop();
    await slaManager.stop();
    await cleanupTestData(tenantId);
  });
  
  beforeEach(async () => {
    // Clean queue between tests
    await db.delete(hitlApprovals).where(eq(hitlApprovals.tenantId, tenantId));
  });

  describe('Full HITL Lifecycle', () => {
    it('should create, assign, and resolve HITL request', async () => {
      // 1. Operator goes online
      await operatorManager.goOnline(operatorId, tenantId);
      
      // 2. Create HITL request
      const hitl = await db.insert(hitlApprovals).values({
        tenantId,
        approvalType: 'DISCOUNT',
        priority: 'HIGH',
        status: 'PENDING',
        referenceId: 'test-ref',
        referenceTable: 'negotiations',
        summary: 'Test discount approval',
        requestedBy: operatorId,
        slaDeadline: new Date(Date.now() + 60 * 60 * 1000)
      }).returning();
      
      // 3. Add to queue
      await unifiedQueueManager.addToQueue({
        id: hitl[0].id,
        type: HitlApprovalType.DISCOUNT,
        tenantId,
        priority: HitlPriority.HIGH,
        status: HitlStatus.PENDING,
        slaDeadline: hitl[0].slaDeadline,
        slaBreached: false,
        referenceId: 'test-ref',
        referenceTable: 'negotiations',
        summary: 'Test discount approval',
        metadata: {},
        createdAt: new Date(),
        requiredSkills: [],
        requiredRole: 'OPERATOR'
      });
      
      // 4. Wait for auto-assignment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 5. Verify assignment
      const updated = await db.select()
        .from(hitlApprovals)
        .where(eq(hitlApprovals.id, hitl[0].id))
        .limit(1);
      
      expect(updated[0].assignedTo).toBe(operatorId);
      expect(updated[0].status).toBe('ASSIGNED');
      
      // 6. Resolve
      await db.update(hitlApprovals)
        .set({
          status: 'RESOLVED',
          decision: 'APPROVED',
          resolvedAt: new Date(),
          resolvedBy: operatorId
        })
        .where(eq(hitlApprovals.id, hitl[0].id));
      
      await unifiedQueueManager.removeFromQueue(tenantId, hitl[0].id);
      
      // 7. Verify resolution
      const resolved = await db.select()
        .from(hitlApprovals)
        .where(eq(hitlApprovals.id, hitl[0].id))
        .limit(1);
      
      expect(resolved[0].status).toBe('RESOLVED');
      expect(resolved[0].decision).toBe('APPROVED');
    });

    it('should escalate after SLA breach', async () => {
      // Create HITL with very short SLA
      const hitl = await db.insert(hitlApprovals).values({
        tenantId,
        approvalType: 'ESCALATION',
        priority: 'CRITICAL',
        status: 'PENDING',
        referenceId: 'test-ref',
        referenceTable: 'conversations',
        summary: 'Test escalation',
        requestedBy: 'SYSTEM',
        slaDeadline: new Date(Date.now() + 1000) // 1 second
      }).returning();
      
      // Wait for SLA to breach
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Trigger SLA check
      await slaManager.checkAllSlas();
      
      // Verify breach
      const breached = await db.select()
        .from(hitlApprovals)
        .where(eq(hitlApprovals.id, hitl[0].id))
        .limit(1);
      
      expect(breached[0].slaBreached).toBe(true);
    });
  });
});
```

### 9.3 E2E Tests

```typescript
// e2e/hitl-dashboard.spec.ts

import { test, expect } from '@playwright/test';

test.describe('HITL Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as operator
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'operator@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to HITL dashboard
    await page.goto('/hitl');
  });

  test('should display queue items', async ({ page }) => {
    // Wait for queue to load
    await page.waitForSelector('[data-testid="queue-table"]');
    
    // Verify table headers
    await expect(page.locator('th:has-text("Tip")')).toBeVisible();
    await expect(page.locator('th:has-text("Prioritate")')).toBeVisible();
    await expect(page.locator('th:has-text("SLA")')).toBeVisible();
  });

  test('should accept assignment', async ({ page }) => {
    // Find unassigned item
    const acceptButton = page.locator('[data-testid="accept-button"]').first();
    
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      
      // Verify status change
      await expect(page.locator('[data-testid="status-badge"]:has-text("ASSIGNED")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should resolve item', async ({ page }) => {
    // Click on assigned item
    await page.click('[data-testid="queue-row"]');
    
    // Wait for detail panel
    await page.waitForSelector('[data-testid="item-detail-panel"]');
    
    // Click approve
    await page.click('[data-testid="approve-button"]');
    
    // Confirm
    await page.click('[data-testid="confirm-button"]');
    
    // Verify removal from queue
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('should show SLA warnings', async ({ page }) => {
    // Look for SLA warning indicators
    const warningItems = page.locator('[data-testid="sla-warning"]');
    
    // If any items have warnings, verify styling
    if (await warningItems.count() > 0) {
      await expect(warningItems.first()).toHaveClass(/text-orange|text-red/);
    }
  });

  test('should filter by type', async ({ page }) => {
    // Open type filter
    await page.click('[data-testid="type-filter"]');
    
    // Select DISCOUNT
    await page.click('text=Discount-uri');
    
    // Verify filtered results
    await page.waitForTimeout(500);
    
    const rows = page.locator('[data-testid="queue-row"]');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const typeIcon = rows.nth(i).locator('[data-testid="type-icon"]');
      await expect(typeIcon).toHaveAttribute('data-type', 'DISCOUNT');
    }
  });
});
```

---

## 10. Configuration & Deployment

### 10.1 Docker Configuration

```yaml
# docker-compose.hitl.yml

version: '3.8'

services:
  hitl-queue-manager:
    build:
      context: .
      dockerfile: Dockerfile.workers
    container_name: cerniq-hitl-queue
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=hitl-queue
      - REDIS_HOST=redis
      - REDIS_PORT=64039
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
    networks:
      - cerniq-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:64000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  hitl-sla-manager:
    build:
      context: .
      dockerfile: Dockerfile.workers
    container_name: cerniq-hitl-sla
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=hitl-sla
      - REDIS_HOST=redis
      - REDIS_PORT=64039
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    networks:
      - cerniq-network

  hitl-websocket:
    build:
      context: .
      dockerfile: Dockerfile.workers
    container_name: cerniq-hitl-ws
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=hitl-websocket
      - REDIS_HOST=redis
      - REDIS_PORT=64039
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "64002:64002"
    depends_on:
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
    networks:
      - cerniq-network

  notification-worker:
    build:
      context: .
      dockerfile: Dockerfile.workers
    container_name: cerniq-notifications
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=notifications
      - REDIS_HOST=redis
      - REDIS_PORT=64039
      - DATABASE_URL=${DATABASE_URL}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    networks:
      - cerniq-network

networks:
  cerniq-network:
    external: true
```

### 10.2 Environment Variables

```bash
# .env.hitl

# Redis
REDIS_HOST=redis
REDIS_PORT=64039
REDIS_PASSWORD=
REDIS_HITL_DB=3
REDIS_AUDIT_DB=4

# Database
DATABASE_URL=postgresql://cerniq:${DB_PASSWORD}@postgres:64032/cerniq

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Notification Providers
RESEND_API_KEY=re_xxxxx
NOTIFICATION_FROM_EMAIL=notificari@cerniq.app

TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+40xxxxx

FIREBASE_PROJECT_ID=cerniq-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@cerniq-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Slack Integration
SLACK_CLIENT_ID=xxxxx
SLACK_CLIENT_SECRET=xxxxx

# SLA Configuration
SLA_CHECK_INTERVAL_MS=10000
SLA_CRITICAL_MINUTES=15
SLA_HIGH_MINUTES=60
SLA_MEDIUM_HOURS=4
SLA_LOW_HOURS=24

# WebSocket
WS_PORT=64002
WS_HEARTBEAT_INTERVAL_MS=30000
WS_HEARTBEAT_TIMEOUT_MS=60000
```

### 10.3 Kubernetes Configuration

```yaml
# k8s/hitl-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: hitl-queue-manager
  namespace: cerniq
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hitl-queue-manager
  template:
    metadata:
      labels:
        app: hitl-queue-manager
    spec:
      containers:
      - name: hitl-queue
        image: cerniq/workers:latest
        env:
        - name: WORKER_TYPE
          value: hitl-queue
        envFrom:
        - secretRef:
            name: cerniq-secrets
        - configMapRef:
            name: cerniq-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
        readinessProbe:
          httpGet:
            path: /health
            port: 64001
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 64001
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: hitl-websocket
  namespace: cerniq
spec:
  selector:
    app: hitl-websocket
  ports:
  - port: 64002
    targetPort: 64002
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hitl-websocket-ingress
  namespace: cerniq
  annotations:
    nginx.ingress.kubernetes.io/websocket-services: "hitl-websocket"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  rules:
  - host: ws.cerniq.app
    http:
      paths:
      - path: /ws/hitl
        pathType: Prefix
        backend:
          service:
            name: hitl-websocket
            port:
              number: 64002
```

---

## 11. Changelog & References

### 11.1 Version History

| Versiune | Data | Modificări |
|----------|------|------------|
| 1.0.0 | 2026-01-18 | Documentație inițială Workers N (Human Intervention) |
| 1.0.1 | 2026-01-18 | Adăugare Worker N1-N4 complet |
| 1.0.2 | 2026-01-18 | Adăugare Unified HITL Queue System |
| 1.0.3 | 2026-01-18 | Adăugare SLA Management, Notifications, Audit |

### 11.2 References

**Documentație Internă:**
- Master Spec: `/mnt/project/__Cerniq_Master_Spec_Normativ_Complet.md`
- Unified HITL System: `/mnt/project/Unified_HITL_Approval_System_for_B2B_Sales_Automation.md`
- Etapa 3 Workers Overview: `/mnt/project/cerniq-workers-etapa3-ai-sales-agent.md`

**Standarde și Best Practices:**
- BullMQ Documentation: https://docs.bullmq.io/
- Redis Sorted Sets: https://redis.io/docs/data-types/sorted-sets/
- WebSocket Protocol: https://tools.ietf.org/html/rfc6455
- GDPR Article 17 (Right to Erasure): https://gdpr-info.eu/art-17-gdpr/

**Librării Utilizate:**
- `bullmq` v5.x - Queue management
- `ioredis` v5.x - Redis client
- `ws` v8.x - WebSocket server
- `firebase-admin` v12.x - Push notifications
- `resend` v2.x - Email delivery
- `twilio` v4.x - SMS delivery
- `@slack/web-api` v7.x - Slack integration

---

## Anexe

### A. Diagrama Completă HITL Flow

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE HITL FLOW DIAGRAM                               │
└───────────────────────────────────────────────────────────────────────────────────┘

                     ┌─────────────────────────────────────┐
                     │         TRIGGER SOURCES             │
                     ├─────────┬─────────┬─────────┬───────┤
                     │ AI Agent│Negotiat.│ Stock   │ Docs  │
                     │ (M-13)  │ FSM (D) │ Check(F)│ Gen(I)│
                     └────┬────┴────┬────┴────┬────┴───┬───┘
                          │         │         │        │
                          ▼         ▼         ▼        ▼
                     ┌────────────────────────────────────┐
                     │           HITL REQUEST             │
                     │  • Type (ESCALATION/TAKEOVER/...)  │
                     │  • Priority (CRITICAL-LOW)         │
                     │  • Context & Metadata              │
                     └──────────────┬─────────────────────┘
                                    │
                                    ▼
                     ┌────────────────────────────────────┐
                     │       UNIFIED QUEUE MANAGER        │
                     │  • Priority Score Calculation      │
                     │  • SLA Deadline Assignment         │
                     │  • Queue Placement (Redis ZSET)    │
                     └──────────────┬─────────────────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
               ▼                    ▼                    ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
     │  SLA MANAGER    │  │ OPERATOR MANAGER│  │  NOTIFICATION   │
     │  • Monitor SLA  │  │ • Availability  │  │  • Alerts       │
     │  • Warnings     │  │ • Skills/Roles  │  │  • Multi-channel│
     │  • Escalation   │  │ • Workload      │  │  • Templates    │
     └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   ▼
                     ┌────────────────────────────────────┐
                     │         OPERATOR DASHBOARD         │
                     │  • Real-time WebSocket Updates     │
                     │  • Queue View & Filtering          │
                     │  • Accept/Resolve/Escalate         │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                     ▼              ▼              ▼
              ┌───────────┐  ┌───────────┐  ┌───────────┐
              │  APPROVE  │  │  REJECT   │  │  ESCALATE │
              └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
                                   ▼
                     ┌────────────────────────────────────┐
                     │         RESOLUTION HANDLER         │
                     │  • Update Source System            │
                     │  • Audit Log                       │
                     │  • Metrics Recording               │
                     │  • Callback Execution              │
                     └────────────────────────────────────┘
```

### B. Environment Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| REDIS_HOST | Yes | localhost | Redis server host |
| REDIS_PORT | No | 64039 | Redis server port |
| REDIS_HITL_DB | No | 3 | Redis database for HITL |
| DATABASE_URL | Yes | - | PostgreSQL connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| SLA_CHECK_INTERVAL_MS | No | 10000 | SLA check frequency |
| WS_PORT | No | 64002 | WebSocket server port |
| RESEND_API_KEY | No* | - | Email provider API key |
| TWILIO_ACCOUNT_SID | No* | - | SMS provider account |
| FIREBASE_PROJECT_ID | No* | - | Push notification project |

*Required if channel is enabled

### C. Metrics Reference

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| hitl_queue_items_added_total | Counter | type, priority, tenant_id | Items added to queue |
| hitl_items_assigned_total | Counter | type, priority | Items assigned |
| hitl_sla_breaches_total | Counter | type, priority, tenant_id | SLA breaches |
| hitl_sla_warnings_total | Counter | type, priority, level | SLA warnings |
| hitl_escalations_total | Counter | type, priority, level | Escalations |
| hitl_operators_online | Gauge | tenant_id | Online operators |
| hitl_ws_clients | Gauge | - | WebSocket connections |
| hitl_sla_check_duration_ms | Histogram | - | SLA check duration |
| notifications_queued_total | Counter | type, priority | Notifications queued |
| notifications_sent_total | Counter | type, channel | Notifications sent |
| audit_events_total | Counter | category, event_type, tenant_id | Audit events |

---

**Document Version:** 1.0.3
**Last Updated:** 2026-01-18
**Author:** Claude AI Assistant
**Status:** Complete - Ready for Implementation
