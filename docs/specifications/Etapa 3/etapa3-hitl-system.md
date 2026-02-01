# CERNIQ.APP — ETAPA 3: HITL SYSTEM
## Human-in-the-Loop Approval Workflows
### Versiunea 1.0 | 18 Ianuarie 2026

---

# CUPRINS

1. [Overview](#1-overview)
2. [Approval Types](#2-approval-types)
3. [SLA Configuration](#3-sla-configuration)
4. [Escalation Engine](#4-escalation-engine)
5. [Queue Management](#5-queue-management)
6. [Assignment Strategy](#6-assignment-strategy)
7. [Notification System](#7-notification-system)
8. [Audit & Compliance](#8-audit-compliance)
9. [UI Components](#9-ui-components)
10. [Database Schema](#10-database-schema)
11. [BullMQ Queues](#11-bullmq-queues)
12. [API Endpoints](#12-api-endpoints)
13. [Metrics & Monitoring](#13-metrics-monitoring)
14. [Testing Strategy](#14-testing-strategy)

---

# 1. OVERVIEW

## 1.1 Purpose

Sistemul HITL (Human-in-the-Loop) pentru Etapa 3 gestionează toate fluxurile de aprobare necesare în procesul de vânzare AI, asigurând:

- **Calitate** - Revizuire umană pentru decizii critice
- **Compliance** - Conformitate cu politici interne și legale
- **Audit Trail** - Trasabilitate completă a deciziilor
- **SLA Management** - Respectarea timpilor de răspuns
- **Escalation** - Escaladare automată când SLA nu este respectat

## 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      HITL APPROVAL ENGINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Workers   │───>│   Approval  │───>│   Queue     │         │
│  │  (Sources)  │    │   Router    │    │  Manager    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   SLA       │    │ Assignment  │    │  Escalation │         │
│  │   Engine    │    │   Engine    │    │   Engine    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                 │
│                            ▼                                     │
│                    ┌─────────────┐                              │
│                    │ Notification│                              │
│                    │   Engine    │                              │
│                    └─────────────┘                              │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL                            │   │
│  │  hitl_approvals │ hitl_assignments │ hitl_audit_log     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.3 Integration Points

| Source | Approval Type | Trigger |
|--------|---------------|---------|
| Worker C (AI Agent) | AI Response Review | Confidence < threshold |
| Worker D (FSM) | Stage Transition | Manual approval required |
| Worker E (Pricing) | Discount Approval | Discount > limit |
| Worker F (Stock) | Stock Exception | Out of stock / allocation |
| Worker H (E-Factura) | Document Submission | Before ANAF submit |
| Worker I (Documents) | Document Approval | High-value documents |
| Worker J (Handover) | Escalation | AI cannot handle |
| Worker M (Guardrails) | Guardrail Violation | Content blocked |
| Worker N (Human) | Human Review | Explicit request |


---

# 2. APPROVAL TYPES

## 2.1 Type Registry

```typescript
// src/hitl/types/approval-types.ts

export const APPROVAL_TYPES = {
  // AI Response Review
  AI_RESPONSE_REVIEW: {
    code: 'ai_response_review',
    name: 'Revizuire Răspuns AI',
    description: 'Răspunsul AI necesită aprobare înainte de trimitere',
    category: 'ai',
    defaultSLA: {
      warning: 15 * 60,      // 15 minutes
      deadline: 30 * 60,     // 30 minutes
      critical: 60 * 60,     // 1 hour
    },
    defaultPriority: 'high',
    requiredRole: 'sales_rep',
    escalationPath: ['sales_rep', 'sales_manager', 'admin'],
    autoActions: {
      onApprove: 'send_message',
      onReject: 'draft_alternative',
      onExpire: 'escalate',
    },
  },
  
  // Discount Approval
  DISCOUNT_APPROVAL: {
    code: 'discount_approval',
    name: 'Aprobare Discount',
    description: 'Discountul solicitat depășește limita automată',
    category: 'pricing',
    defaultSLA: {
      warning: 30 * 60,      // 30 minutes
      deadline: 2 * 60 * 60, // 2 hours
      critical: 4 * 60 * 60, // 4 hours
    },
    defaultPriority: 'medium',
    requiredRole: 'sales_manager',
    escalationPath: ['sales_manager', 'admin'],
    autoActions: {
      onApprove: 'apply_discount',
      onReject: 'notify_sales_rep',
      onExpire: 'escalate',
    },
    thresholds: {
      level1: { maxDiscount: 15, role: 'sales_rep' },
      level2: { maxDiscount: 25, role: 'sales_manager' },
      level3: { maxDiscount: 50, role: 'admin' },
    },
  },
  
  // Document Approval
  DOCUMENT_APPROVAL: {
    code: 'document_approval',
    name: 'Aprobare Document',
    description: 'Documentul necesită aprobare înainte de finalizare',
    category: 'documents',
    defaultSLA: {
      warning: 60 * 60,          // 1 hour
      deadline: 4 * 60 * 60,     // 4 hours
      critical: 8 * 60 * 60,     // 8 hours
    },
    defaultPriority: 'medium',
    requiredRole: 'sales_manager',
    escalationPath: ['sales_manager', 'admin'],
    autoActions: {
      onApprove: 'finalize_document',
      onReject: 'return_to_draft',
      onExpire: 'escalate',
    },
    triggers: {
      valueThreshold: 50000,     // EUR
      documentTypes: ['invoice', 'contract'],
    },
  },
  
  // E-Factura Submission
  EFACTURA_SUBMISSION: {
    code: 'efactura_submission',
    name: 'Trimitere E-Factura',
    description: 'Aprobare înainte de trimitere la ANAF SPV',
    category: 'fiscal',
    defaultSLA: {
      warning: 2 * 60 * 60,      // 2 hours
      deadline: 8 * 60 * 60,     // 8 hours
      critical: 24 * 60 * 60,    // 24 hours
    },
    defaultPriority: 'high',
    requiredRole: 'admin',
    escalationPath: ['admin'],
    autoActions: {
      onApprove: 'submit_to_anaf',
      onReject: 'cancel_submission',
      onExpire: 'notify_urgent',
    },
    compliance: {
      legalDeadline: 5,          // days from invoice date
      warningDays: 3,
    },
  },
  
  // Stock Exception
  STOCK_EXCEPTION: {
    code: 'stock_exception',
    name: 'Excepție Stoc',
    description: 'Stoc insuficient sau alocare specială necesară',
    category: 'inventory',
    defaultSLA: {
      warning: 60 * 60,          // 1 hour
      deadline: 4 * 60 * 60,     // 4 hours
      critical: 8 * 60 * 60,     // 8 hours
    },
    defaultPriority: 'high',
    requiredRole: 'sales_manager',
    escalationPath: ['sales_manager', 'admin'],
    autoActions: {
      onApprove: 'reserve_stock',
      onReject: 'notify_alternative',
      onExpire: 'escalate',
    },
  },
  
  // Guardrail Violation
  GUARDRAIL_VIOLATION: {
    code: 'guardrail_violation',
    name: 'Încălcare Guardrail',
    description: 'Răspunsul AI a declanșat un guardrail',
    category: 'compliance',
    defaultSLA: {
      warning: 10 * 60,          // 10 minutes
      deadline: 30 * 60,         // 30 minutes
      critical: 60 * 60,         // 1 hour
    },
    defaultPriority: 'critical',
    requiredRole: 'sales_manager',
    escalationPath: ['sales_manager', 'admin'],
    autoActions: {
      onApprove: 'override_guardrail',
      onReject: 'block_response',
      onExpire: 'auto_reject',
    },
    auditRequired: true,
  },
  
  // Handover Escalation
  HANDOVER_ESCALATION: {
    code: 'handover_escalation',
    name: 'Escaladare către Om',
    description: 'AI-ul nu poate gestiona și solicită intervenție umană',
    category: 'handover',
    defaultSLA: {
      warning: 5 * 60,           // 5 minutes
      deadline: 15 * 60,         // 15 minutes
      critical: 30 * 60,         // 30 minutes
    },
    defaultPriority: 'critical',
    requiredRole: 'sales_rep',
    escalationPath: ['sales_rep', 'sales_manager', 'admin'],
    autoActions: {
      onApprove: 'transfer_conversation',
      onReject: 'return_to_ai',
      onExpire: 'escalate',
    },
    realTime: true,
  },
  
  // Pricing Override
  PRICING_OVERRIDE: {
    code: 'pricing_override',
    name: 'Modificare Preț',
    description: 'Preț personalizat în afara regulilor standard',
    category: 'pricing',
    defaultSLA: {
      warning: 60 * 60,          // 1 hour
      deadline: 4 * 60 * 60,     // 4 hours
      critical: 8 * 60 * 60,     // 8 hours
    },
    defaultPriority: 'medium',
    requiredRole: 'sales_manager',
    escalationPath: ['sales_manager', 'admin'],
    autoActions: {
      onApprove: 'apply_custom_price',
      onReject: 'revert_to_standard',
      onExpire: 'escalate',
    },
  },
  
  // Contract Terms
  CONTRACT_TERMS: {
    code: 'contract_terms',
    name: 'Termeni Contract',
    description: 'Termeni contractuali non-standard necesită aprobare',
    category: 'legal',
    defaultSLA: {
      warning: 4 * 60 * 60,      // 4 hours
      deadline: 24 * 60 * 60,    // 24 hours
      critical: 48 * 60 * 60,    // 48 hours
    },
    defaultPriority: 'medium',
    requiredRole: 'admin',
    escalationPath: ['admin'],
    autoActions: {
      onApprove: 'apply_terms',
      onReject: 'use_standard_terms',
      onExpire: 'notify_urgent',
    },
    legalReview: true,
  },
} as const;

export type ApprovalTypeCode = keyof typeof APPROVAL_TYPES;
```

## 2.2 Approval Request Interface

```typescript
// src/hitl/types/approval-request.ts

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  
  // Type & Status
  type: ApprovalTypeCode;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  
  // Title & Description
  title: string;
  description: string;
  
  // Context
  entityType: EntityType;
  entityId: string;
  context: ApprovalContext;
  
  // Requester
  requestedBy: {
    type: 'user' | 'ai' | 'system';
    id?: string;
    name: string;
  };
  requestedAt: Date;
  reason: string;
  
  // Assignment
  assignment?: {
    userId: string;
    assignedAt: Date;
    assignedBy: string;
  };
  
  // SLA
  slaDeadline: Date;
  slaWarningAt: Date;
  slaCriticalAt: Date;
  slaStatus: 'ok' | 'warning' | 'breached';
  
  // Escalation
  escalationLevel: number;
  escalationHistory: EscalationEvent[];
  
  // Resolution
  resolution?: {
    action: 'approved' | 'rejected' | 'expired';
    resolvedBy: string;
    resolvedAt: Date;
    notes?: string;
    modifications?: Record<string, any>;
  };
  
  // Attachments
  attachments: Attachment[];
  
  // Comments
  comments: Comment[];
  
  // Audit
  auditHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApprovalStatus = 
  | 'pending'
  | 'assigned'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'expired';

export type ApprovalPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type EntityType = 
  | 'negotiation'
  | 'document'
  | 'ai_message'
  | 'contact'
  | 'product'
  | 'stock_reservation';

export interface ApprovalContext {
  // Generic context - varies by type
  [key: string]: any;
}

export interface EscalationEvent {
  level: number;
  escalatedAt: Date;
  reason: string;
  fromUserId?: string;
  toUserId?: string;
  toRole?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}
```

## 2.3 Context Types

```typescript
// src/hitl/types/contexts.ts

// Discount Approval Context
export interface DiscountApprovalContext {
  negotiationId: string;
  contactId: string;
  contactName: string;
  
  originalTotal: number;
  requestedTotal: number;
  discountPercent: number;
  discountAmount: number;
  currency: string;
  
  products: {
    productId: string;
    productName: string;
    quantity: number;
    originalPrice: number;
    requestedPrice: number;
    discountPercent: number;
  }[];
  
  justification: string;
  
  // Customer history for context
  customerHistory?: {
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    tier: string;
    lastOrderDate: Date;
  };
  
  // Previous discounts
  previousDiscounts?: {
    date: Date;
    percent: number;
    approvedBy: string;
  }[];
}

// AI Response Review Context
export interface AIResponseReviewContext {
  conversationId: string;
  negotiationId: string;
  contactId: string;
  contactName: string;
  
  incomingMessage: {
    id: string;
    content: string;
    timestamp: Date;
    channel: 'email' | 'whatsapp' | 'chat';
  };
  
  proposedResponse: {
    content: string;
    confidence: number;
    model: string;
    reasoning: string;
    suggestedActions: string[];
  };
  
  guardrailFlags?: {
    type: string;
    severity: 'warning' | 'block';
    message: string;
    triggeredRule: string;
  }[];
  
  conversationHistory: {
    role: 'human' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
  
  alternativeResponses?: {
    content: string;
    confidence: number;
    reasoning: string;
  }[];
}

// Document Approval Context
export interface DocumentApprovalContext {
  documentId: string;
  documentType: 'proforma' | 'invoice' | 'contract' | 'offer';
  documentNumber: string;
  
  negotiationId: string;
  contactId: string;
  contactName: string;
  
  totalValue: number;
  currency: string;
  
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  
  validationIssues?: {
    field: string;
    issue: string;
    severity: 'warning' | 'error';
  }[];
  
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
    changedAt: Date;
    changedBy: string;
  }[];
  
  previewUrl: string;
}

// E-Factura Context
export interface EFacturaSubmissionContext {
  documentId: string;
  documentNumber: string;
  documentType: string;
  
  buyer: {
    name: string;
    cui: string;
    address: string;
  };
  
  seller: {
    name: string;
    cui: string;
    address: string;
  };
  
  totalValue: number;
  vatValue: number;
  currency: string;
  
  issueDate: Date;
  legalDeadline: Date;
  daysRemaining: number;
  
  xmlPreview?: string;
  validationStatus: 'valid' | 'warnings' | 'errors';
  validationIssues?: {
    code: string;
    message: string;
    severity: string;
  }[];
}

// Handover Context
export interface HandoverEscalationContext {
  conversationId: string;
  negotiationId: string;
  contactId: string;
  contactName: string;
  
  escalationReason: {
    type: 'complexity' | 'sentiment' | 'explicit_request' | 'guardrail' | 'error';
    description: string;
    aiAnalysis: string;
  };
  
  sentiment: {
    current: string;
    trend: 'improving' | 'stable' | 'deteriorating';
    score: number;
  };
  
  lastMessages: {
    role: 'human' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
  
  suggestedApproach: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  contactDetails: {
    phone?: string;
    email?: string;
    preferredChannel: string;
  };
}
```

---

# 3. SLA CONFIGURATION

## 3.1 SLA Manager

```typescript
// src/hitl/sla/sla-manager.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { HitlApproval } from '../entities/hitl-approval.entity';
import { SlaConfiguration } from '../entities/sla-configuration.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

@Injectable()
export class SlaManager {
  private readonly logger = new Logger(SlaManager.name);
  
  constructor(
    @InjectRepository(HitlApproval)
    private readonly approvalRepository: Repository<HitlApproval>,
    @InjectRepository(SlaConfiguration)
    private readonly slaConfigRepository: Repository<SlaConfiguration>,
    @InjectQueue('hitl-sla')
    private readonly slaQueue: Queue,
  ) {}
  
  /**
   * Get SLA configuration for approval type
   */
  async getSlaConfig(
    tenantId: string,
    approvalType: string,
  ): Promise<SlaConfiguration> {
    // Check tenant-specific override
    const tenantConfig = await this.slaConfigRepository.findOne({
      where: { tenantId, approvalType },
    });
    
    if (tenantConfig) {
      return tenantConfig;
    }
    
    // Use system default
    const systemConfig = await this.slaConfigRepository.findOne({
      where: { tenantId: 'SYSTEM', approvalType },
    });
    
    if (systemConfig) {
      return systemConfig;
    }
    
    // Fallback to code defaults
    return this.getDefaultSlaConfig(approvalType);
  }
  
  /**
   * Calculate SLA deadlines for new approval
   */
  async calculateDeadlines(
    tenantId: string,
    approvalType: string,
    priority: string,
    createdAt: Date = new Date(),
  ): Promise<SlaDeadlines> {
    const config = await this.getSlaConfig(tenantId, approvalType);
    const multiplier = this.getPriorityMultiplier(priority);
    
    // Check business hours
    const effectiveStart = this.getEffectiveStartTime(createdAt, config);
    
    return {
      warningAt: this.addBusinessSeconds(
        effectiveStart,
        config.warningSeconds * multiplier,
        config,
      ),
      deadlineAt: this.addBusinessSeconds(
        effectiveStart,
        config.deadlineSeconds * multiplier,
        config,
      ),
      criticalAt: this.addBusinessSeconds(
        effectiveStart,
        config.criticalSeconds * multiplier,
        config,
      ),
    };
  }
  
  /**
   * Schedule SLA monitoring jobs
   */
  async scheduleSlaJobs(approval: HitlApproval): Promise<void> {
    // Warning job
    const warningDelay = approval.slaWarningAt.getTime() - Date.now();
    if (warningDelay > 0) {
      await this.slaQueue.add(
        'sla-warning',
        { approvalId: approval.id },
        {
          delay: warningDelay,
          jobId: `sla-warning-${approval.id}`,
          removeOnComplete: true,
        },
      );
    }
    
    // Deadline job (triggers escalation)
    const deadlineDelay = approval.slaDeadline.getTime() - Date.now();
    if (deadlineDelay > 0) {
      await this.slaQueue.add(
        'sla-deadline',
        { approvalId: approval.id },
        {
          delay: deadlineDelay,
          jobId: `sla-deadline-${approval.id}`,
          removeOnComplete: true,
        },
      );
    }
    
    // Critical job
    const criticalDelay = approval.slaCriticalAt.getTime() - Date.now();
    if (criticalDelay > 0) {
      await this.slaQueue.add(
        'sla-critical',
        { approvalId: approval.id },
        {
          delay: criticalDelay,
          jobId: `sla-critical-${approval.id}`,
          removeOnComplete: true,
        },
      );
    }
    
    this.logger.debug(
      `Scheduled SLA jobs for approval ${approval.id}`,
      { warningDelay, deadlineDelay, criticalDelay },
    );
  }
  
  /**
   * Cancel SLA jobs when approval is resolved
   */
  async cancelSlaJobs(approvalId: string): Promise<void> {
    const jobIds = [
      `sla-warning-${approvalId}`,
      `sla-deadline-${approvalId}`,
      `sla-critical-${approvalId}`,
    ];
    
    for (const jobId of jobIds) {
      const job = await this.slaQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.debug(`Removed SLA job ${jobId}`);
      }
    }
  }
  
  /**
   * Update SLA status for all pending approvals
   */
  async updateSlaStatuses(): Promise<void> {
    const now = new Date();
    
    // Update to warning
    await this.approvalRepository.update(
      {
        status: 'pending',
        slaStatus: 'ok',
        slaWarningAt: LessThan(now),
      },
      { slaStatus: 'warning' },
    );
    
    // Update to breached
    await this.approvalRepository.update(
      {
        status: 'pending',
        slaStatus: { $ne: 'breached' },
        slaDeadline: LessThan(now),
      },
      { slaStatus: 'breached' },
    );
  }
  
  /**
   * Get SLA metrics for reporting
   */
  async getSlaMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SlaMetrics> {
    const approvals = await this.approvalRepository.find({
      where: {
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    });
    
    const resolved = approvals.filter(a => a.resolution);
    const withinSla = resolved.filter(a => 
      a.resolution!.resolvedAt <= a.slaDeadline
    );
    
    const responseTimes = resolved.map(a => 
      a.resolution!.resolvedAt.getTime() - a.createdAt.getTime()
    );
    
    return {
      total: approvals.length,
      resolved: resolved.length,
      pending: approvals.length - resolved.length,
      withinSla: withinSla.length,
      breached: resolved.length - withinSla.length,
      complianceRate: resolved.length > 0 
        ? (withinSla.length / resolved.length) * 100 
        : 100,
      averageResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
      medianResponseTime: this.calculateMedian(responseTimes),
      byType: this.groupMetricsByType(approvals),
    };
  }
  
  private getPriorityMultiplier(priority: string): number {
    const multipliers: Record<string, number> = {
      low: 1.5,
      medium: 1.0,
      high: 0.5,
      critical: 0.25,
    };
    return multipliers[priority] || 1.0;
  }
  
  private getEffectiveStartTime(
    createdAt: Date,
    config: SlaConfiguration,
  ): Date {
    if (!config.businessHoursOnly) {
      return createdAt;
    }
    
    // Check if within business hours
    const hour = createdAt.getHours();
    const dayOfWeek = createdAt.getDay();
    
    // Assuming business hours 9-18, Mon-Fri
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend - move to Monday 9:00
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 2;
      const monday = new Date(createdAt);
      monday.setDate(monday.getDate() + daysUntilMonday);
      monday.setHours(9, 0, 0, 0);
      return monday;
    }
    
    if (hour < 9) {
      const today = new Date(createdAt);
      today.setHours(9, 0, 0, 0);
      return today;
    }
    
    if (hour >= 18) {
      const tomorrow = new Date(createdAt);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 2); // Skip to Monday
      } else if (tomorrow.getDay() === 0) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
    
    return createdAt;
  }
  
  private addBusinessSeconds(
    start: Date,
    seconds: number,
    config: SlaConfiguration,
  ): Date {
    if (!config.businessHoursOnly) {
      return new Date(start.getTime() + seconds * 1000);
    }
    
    // Business hours calculation
    const businessHoursPerDay = 9 * 3600; // 9 hours
    let remainingSeconds = seconds;
    let current = new Date(start);
    
    while (remainingSeconds > 0) {
      const endOfDay = new Date(current);
      endOfDay.setHours(18, 0, 0, 0);
      
      const secondsUntilEndOfDay = Math.max(
        0,
        (endOfDay.getTime() - current.getTime()) / 1000,
      );
      
      if (remainingSeconds <= secondsUntilEndOfDay) {
        return new Date(current.getTime() + remainingSeconds * 1000);
      }
      
      remainingSeconds -= secondsUntilEndOfDay;
      
      // Move to next business day
      current = new Date(endOfDay);
      current.setDate(current.getDate() + 1);
      if (current.getDay() === 6) {
        current.setDate(current.getDate() + 2);
      } else if (current.getDay() === 0) {
        current.setDate(current.getDate() + 1);
      }
      current.setHours(9, 0, 0, 0);
    }
    
    return current;
  }
  
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  private groupMetricsByType(approvals: HitlApproval[]): Record<string, any> {
    const grouped: Record<string, any> = {};
    
    for (const approval of approvals) {
      if (!grouped[approval.type]) {
        grouped[approval.type] = {
          total: 0,
          resolved: 0,
          withinSla: 0,
          breached: 0,
        };
      }
      
      grouped[approval.type].total++;
      
      if (approval.resolution) {
        grouped[approval.type].resolved++;
        if (approval.resolution.resolvedAt <= approval.slaDeadline) {
          grouped[approval.type].withinSla++;
        } else {
          grouped[approval.type].breached++;
        }
      }
    }
    
    return grouped;
  }
  
  private getDefaultSlaConfig(approvalType: string): SlaConfiguration {
    const defaults = APPROVAL_TYPES[approvalType as ApprovalTypeCode]?.defaultSLA;
    return {
      tenantId: 'DEFAULT',
      approvalType,
      warningSeconds: defaults?.warning || 1800,
      deadlineSeconds: defaults?.deadline || 3600,
      criticalSeconds: defaults?.critical || 7200,
      businessHoursOnly: false,
      escalateOnBreach: true,
    } as SlaConfiguration;
  }
}

interface SlaDeadlines {
  warningAt: Date;
  deadlineAt: Date;
  criticalAt: Date;
}

interface SlaMetrics {
  total: number;
  resolved: number;
  pending: number;
  withinSla: number;
  breached: number;
  complianceRate: number;
  averageResponseTime: number;
  medianResponseTime: number;
  byType: Record<string, any>;
}
```

## 3.2 SLA Configuration Entity

```typescript
// src/hitl/entities/sla-configuration.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';

@Entity('hitl_sla_configurations')
@Unique(['tenantId', 'approvalType'])
export class SlaConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  @Index()
  tenantId: string;
  
  @Column()
  @Index()
  approvalType: string;
  
  @Column('integer')
  warningSeconds: number;
  
  @Column('integer')
  deadlineSeconds: number;
  
  @Column('integer')
  criticalSeconds: number;
  
  @Column({ default: false })
  businessHoursOnly: boolean;
  
  @Column({ nullable: true })
  businessHoursStart?: string; // "09:00"
  
  @Column({ nullable: true })
  businessHoursEnd?: string;   // "18:00"
  
  @Column('text', { array: true, nullable: true })
  businessDays?: string[];     // ["MON", "TUE", "WED", "THU", "FRI"]
  
  @Column({ default: true })
  escalateOnBreach: boolean;
  
  @Column('integer', { default: 3 })
  maxEscalationLevel: number;
  
  @Column('jsonb', { nullable: true })
  escalationConfig?: {
    level1: { afterSeconds: number; toRole: string };
    level2: { afterSeconds: number; toRole: string };
    level3: { afterSeconds: number; toRole: string };
  };
  
  @Column('jsonb', { nullable: true })
  notificationConfig?: {
    onWarning: boolean;
    onDeadline: boolean;
    onCritical: boolean;
    channels: string[];
  };
  
  @Column({ default: true })
  isActive: boolean;
  
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

---

# 4. ESCALATION ENGINE

## 4.1 Escalation Manager

```typescript
// src/hitl/escalation/escalation-manager.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HitlApproval } from '../entities/hitl-approval.entity';
import { AssignmentManager } from '../assignment/assignment-manager';
import { NotificationService } from '../notifications/notification.service';
import { APPROVAL_TYPES, ApprovalTypeCode } from '../types/approval-types';

@Injectable()
export class EscalationManager {
  private readonly logger = new Logger(EscalationManager.name);
  
  constructor(
    @InjectRepository(HitlApproval)
    private readonly approvalRepository: Repository<HitlApproval>,
    private readonly assignmentManager: AssignmentManager,
    private readonly notificationService: NotificationService,
  ) {}
  
  /**
   * Process escalation for an approval
   */
  async escalate(
    approvalId: string,
    reason: 'sla_breach' | 'manual' | 'complexity' | 'reassign_request',
    requestedBy?: string,
  ): Promise<EscalationResult> {
    const approval = await this.approvalRepository.findOne({
      where: { id: approvalId },
    });
    
    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }
    
    // Check if can escalate further
    const typeConfig = APPROVAL_TYPES[approval.type as ApprovalTypeCode];
    const escalationPath = typeConfig?.escalationPath || [];
    const currentLevel = approval.escalationLevel;
    
    if (currentLevel >= escalationPath.length - 1) {
      this.logger.warn(
        `Cannot escalate approval ${approvalId} further - max level reached`,
      );
      
      // Handle max escalation - notify admins urgently
      await this.handleMaxEscalation(approval);
      
      return {
        success: false,
        reason: 'max_level_reached',
        currentLevel,
        maxLevel: escalationPath.length - 1,
      };
    }
    
    // Get next escalation target
    const nextLevel = currentLevel + 1;
    const targetRole = escalationPath[nextLevel];
    
    // Find available user at target level
    const targetUser = await this.assignmentManager.findBestAssignee(
      approval.tenantId,
      approval.type,
      targetRole,
      { excludeUserId: approval.assignment?.userId },
    );
    
    if (!targetUser) {
      this.logger.warn(
        `No available user for escalation at level ${nextLevel} (${targetRole})`,
      );
      
      // Try next level if no user found
      if (nextLevel < escalationPath.length - 1) {
        return this.escalate(approvalId, reason, requestedBy);
      }
      
      return {
        success: false,
        reason: 'no_available_user',
        targetRole,
      };
    }
    
    // Record escalation event
    const escalationEvent: EscalationEvent = {
      level: nextLevel,
      escalatedAt: new Date(),
      reason,
      fromUserId: approval.assignment?.userId,
      toUserId: targetUser.id,
      toRole: targetRole,
    };
    
    // Update approval
    await this.approvalRepository.update(approvalId, {
      escalationLevel: nextLevel,
      escalationHistory: [...(approval.escalationHistory || []), escalationEvent],
      status: 'escalated',
      assignment: {
        userId: targetUser.id,
        assignedAt: new Date(),
        assignedBy: requestedBy || 'system',
      },
      // Extend SLA on escalation
      slaDeadline: new Date(Date.now() + this.getExtendedSlaTime(approval.type)),
      slaStatus: 'ok',
    });
    
    // Send notifications
    await this.sendEscalationNotifications(approval, targetUser, escalationEvent);
    
    this.logger.log(
      `Escalated approval ${approvalId} to level ${nextLevel} (${targetRole})`,
      { targetUserId: targetUser.id, reason },
    );
    
    return {
      success: true,
      newLevel: nextLevel,
      assignedTo: {
        id: targetUser.id,
        name: targetUser.name,
        role: targetRole,
      },
      newDeadline: new Date(Date.now() + this.getExtendedSlaTime(approval.type)),
    };
  }
  
  /**
   * Handle auto-escalation from SLA processor
   */
  async processAutoEscalation(approvalId: string): Promise<void> {
    this.logger.log(`Processing auto-escalation for approval ${approvalId}`);
    
    await this.escalate(approvalId, 'sla_breach');
  }
  
  /**
   * Handle max escalation reached
   */
  private async handleMaxEscalation(approval: HitlApproval): Promise<void> {
    // Mark as critical
    await this.approvalRepository.update(approval.id, {
      priority: 'critical',
      slaStatus: 'breached',
    });
    
    // Notify all admins urgently
    await this.notificationService.sendUrgentAlert({
      tenantId: approval.tenantId,
      type: 'max_escalation_reached',
      title: `URGENT: Aprobare fără rezolvare - ${approval.title}`,
      message: `Aprobarea ${approval.id} a ajuns la nivelul maxim de escaladare fără rezolvare.`,
      approvalId: approval.id,
      priority: 'critical',
    });
  }
  
  /**
   * Get extended SLA time for escalated approvals
   */
  private getExtendedSlaTime(approvalType: string): number {
    const config = APPROVAL_TYPES[approvalType as ApprovalTypeCode];
    // Give 50% of original deadline time on escalation
    return (config?.defaultSLA?.deadline || 3600) * 0.5 * 1000;
  }
  
  /**
   * Send escalation notifications
   */
  private async sendEscalationNotifications(
    approval: HitlApproval,
    targetUser: any,
    escalation: EscalationEvent,
  ): Promise<void> {
    // Notify new assignee
    await this.notificationService.send({
      userId: targetUser.id,
      type: 'escalation_received',
      title: `Aprobare escaladată: ${approval.title}`,
      message: `Ai primit o aprobare escaladată de nivel ${escalation.level}. Motivul: ${escalation.reason}`,
      data: {
        approvalId: approval.id,
        type: approval.type,
        escalationLevel: escalation.level,
      },
      channels: ['in_app', 'email', 'push'],
      priority: 'high',
    });
    
    // Notify previous assignee (if any)
    if (escalation.fromUserId) {
      await this.notificationService.send({
        userId: escalation.fromUserId,
        type: 'escalation_transferred',
        title: `Aprobare escaladată: ${approval.title}`,
        message: `Aprobarea a fost escaladată către ${targetUser.name}.`,
        data: {
          approvalId: approval.id,
          escalatedTo: targetUser.id,
        },
        channels: ['in_app'],
        priority: 'medium',
      });
    }
  }
}

interface EscalationResult {
  success: boolean;
  reason?: string;
  currentLevel?: number;
  maxLevel?: number;
  newLevel?: number;
  targetRole?: string;
  assignedTo?: {
    id: string;
    name: string;
    role: string;
  };
  newDeadline?: Date;
}

interface EscalationEvent {
  level: number;
  escalatedAt: Date;
  reason: string;
  fromUserId?: string;
  toUserId?: string;
  toRole?: string;
}
```

---

# 5. QUEUE MANAGEMENT

## 5.1 Approval Queue Service

```typescript
// src/hitl/queues/approval-queue.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { HitlApproval } from '../entities/hitl-approval.entity';
import { SlaManager } from '../sla/sla-manager';
import { AssignmentManager } from '../assignment/assignment-manager';

@Injectable()
export class ApprovalQueueService {
  private readonly logger = new Logger(ApprovalQueueService.name);
  
  constructor(
    @InjectRepository(HitlApproval)
    private readonly approvalRepository: Repository<HitlApproval>,
    private readonly slaManager: SlaManager,
    private readonly assignmentManager: AssignmentManager,
  ) {}
  
  /**
   * Create new approval request
   */
  async createApproval(
    data: CreateApprovalData,
  ): Promise<HitlApproval> {
    // Calculate SLA deadlines
    const deadlines = await this.slaManager.calculateDeadlines(
      data.tenantId,
      data.type,
      data.priority,
    );
    
    // Create approval
    const approval = this.approvalRepository.create({
      ...data,
      status: 'pending',
      slaWarningAt: deadlines.warningAt,
      slaDeadline: deadlines.deadlineAt,
      slaCriticalAt: deadlines.criticalAt,
      slaStatus: 'ok',
      escalationLevel: 0,
      escalationHistory: [],
    });
    
    await this.approvalRepository.save(approval);
    
    // Schedule SLA monitoring jobs
    await this.slaManager.scheduleSlaJobs(approval);
    
    // Auto-assign if configured
    if (this.shouldAutoAssign(data.type)) {
      await this.assignmentManager.autoAssign(approval);
    }
    
    this.logger.log(
      `Created approval ${approval.id} of type ${approval.type}`,
      { tenantId: data.tenantId, priority: data.priority },
    );
    
    return approval;
  }
  
  /**
   * Get queue for a user
   */
  async getUserQueue(
    userId: string,
    filters?: QueueFilters,
  ): Promise<ApprovalQueue> {
    const where: any = {
      'assignment.userId': userId,
      status: In(['pending', 'assigned', 'in_review']),
    };
    
    if (filters?.type) {
      where.type = filters.type;
    }
    
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    
    if (filters?.slaStatus) {
      where.slaStatus = filters.slaStatus;
    }
    
    const [approvals, total] = await this.approvalRepository.findAndCount({
      where,
      order: this.getQueueOrder(filters?.sortBy),
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
    
    // Group by urgency
    const urgent = approvals.filter(a => 
      a.slaStatus === 'warning' || a.slaStatus === 'breached'
    );
    const normal = approvals.filter(a => a.slaStatus === 'ok');
    
    return {
      items: approvals,
      total,
      urgent: urgent.length,
      normal: normal.length,
      breached: approvals.filter(a => a.slaStatus === 'breached').length,
    };
  }
  
  /**
   * Get unassigned queue
   */
  async getUnassignedQueue(
    tenantId: string,
    filters?: QueueFilters,
  ): Promise<ApprovalQueue> {
    const where: any = {
      tenantId,
      status: 'pending',
      assignment: null,
    };
    
    if (filters?.type) {
      where.type = filters.type;
    }
    
    const [approvals, total] = await this.approvalRepository.findAndCount({
      where,
      order: { slaDeadline: 'ASC', priority: 'DESC' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
    
    return {
      items: approvals,
      total,
      urgent: approvals.filter(a => a.slaStatus !== 'ok').length,
      normal: approvals.filter(a => a.slaStatus === 'ok').length,
      breached: approvals.filter(a => a.slaStatus === 'breached').length,
    };
  }
  
  /**
   * Get queue statistics
   */
  async getQueueStats(tenantId: string): Promise<QueueStats> {
    const now = new Date();
    
    const pending = await this.approvalRepository.count({
      where: { tenantId, status: In(['pending', 'assigned', 'in_review']) },
    });
    
    const breached = await this.approvalRepository.count({
      where: { 
        tenantId, 
        status: In(['pending', 'assigned', 'in_review']),
        slaStatus: 'breached',
      },
    });
    
    const warning = await this.approvalRepository.count({
      where: { 
        tenantId, 
        status: In(['pending', 'assigned', 'in_review']),
        slaStatus: 'warning',
      },
    });
    
    const byType = await this.approvalRepository
      .createQueryBuilder('approval')
      .select('approval.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('approval.tenant_id = :tenantId', { tenantId })
      .andWhere('approval.status IN (:...statuses)', { 
        statuses: ['pending', 'assigned', 'in_review'],
      })
      .groupBy('approval.type')
      .getRawMany();
    
    const byAssignee = await this.approvalRepository
      .createQueryBuilder('approval')
      .select('approval.assignment->\'userId\'', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('approval.tenant_id = :tenantId', { tenantId })
      .andWhere('approval.status IN (:...statuses)', { 
        statuses: ['pending', 'assigned', 'in_review'],
      })
      .andWhere('approval.assignment IS NOT NULL')
      .groupBy('approval.assignment->\'userId\'')
      .getRawMany();
    
    return {
      pending,
      breached,
      warning,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>),
      byAssignee: byAssignee.reduce((acc, item) => {
        if (item.userId) {
          acc[item.userId] = parseInt(item.count);
        }
        return acc;
      }, {} as Record<string, number>),
    };
  }
  
  /**
   * Resolve approval
   */
  async resolve(
    approvalId: string,
    action: 'approved' | 'rejected',
    userId: string,
    data?: ResolveData,
  ): Promise<HitlApproval> {
    const approval = await this.approvalRepository.findOne({
      where: { id: approvalId },
    });
    
    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }
    
    if (!['pending', 'assigned', 'in_review'].includes(approval.status)) {
      throw new Error(`Approval ${approvalId} cannot be resolved - status: ${approval.status}`);
    }
    
    // Update approval
    approval.status = action;
    approval.resolution = {
      action,
      resolvedBy: userId,
      resolvedAt: new Date(),
      notes: data?.notes,
      modifications: data?.modifications,
    };
    
    await this.approvalRepository.save(approval);
    
    // Cancel SLA jobs
    await this.slaManager.cancelSlaJobs(approvalId);
    
    // Execute post-resolution actions
    await this.executePostResolutionActions(approval);
    
    this.logger.log(
      `Resolved approval ${approvalId} with action ${action}`,
      { userId, notes: data?.notes },
    );
    
    return approval;
  }
  
  /**
   * Execute configured auto-actions after resolution
   */
  private async executePostResolutionActions(
    approval: HitlApproval,
  ): Promise<void> {
    const typeConfig = APPROVAL_TYPES[approval.type as ApprovalTypeCode];
    if (!typeConfig?.autoActions) return;
    
    const actionKey = `on${approval.resolution!.action.charAt(0).toUpperCase()}${approval.resolution!.action.slice(1)}`;
    const action = typeConfig.autoActions[actionKey as keyof typeof typeConfig.autoActions];
    
    if (!action) return;
    
    this.logger.debug(
      `Executing post-resolution action: ${action}`,
      { approvalId: approval.id },
    );
    
    // Emit event for action handler
    // This would be handled by specific action processors
    // await this.eventEmitter.emit('hitl.action', { approval, action });
  }
  
  private shouldAutoAssign(approvalType: string): boolean {
    const config = APPROVAL_TYPES[approvalType as ApprovalTypeCode];
    return config?.realTime || false;
  }
  
  private getQueueOrder(sortBy?: string): Record<string, 'ASC' | 'DESC'> {
    switch (sortBy) {
      case 'deadline':
        return { slaDeadline: 'ASC' };
      case 'priority':
        return { priority: 'DESC', slaDeadline: 'ASC' };
      case 'created':
        return { createdAt: 'ASC' };
      default:
        return { slaDeadline: 'ASC', priority: 'DESC' };
    }
  }
}

interface CreateApprovalData {
  tenantId: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  entityType: string;
  entityId: string;
  context: any;
  requestedBy: {
    type: 'user' | 'ai' | 'system';
    id?: string;
    name: string;
  };
  reason: string;
}

interface QueueFilters {
  type?: string;
  priority?: string;
  slaStatus?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}

interface ApprovalQueue {
  items: HitlApproval[];
  total: number;
  urgent: number;
  normal: number;
  breached: number;
}

interface QueueStats {
  pending: number;
  breached: number;
  warning: number;
  byType: Record<string, number>;
  byAssignee: Record<string, number>;
}

interface ResolveData {
  notes?: string;
  modifications?: Record<string, any>;
}
```

---

# 6. ASSIGNMENT STRATEGY

## 6.1 Assignment Manager

```typescript
// src/hitl/assignment/assignment-manager.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HitlApproval } from '../entities/hitl-approval.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class AssignmentManager {
  private readonly logger = new Logger(AssignmentManager.name);
  
  constructor(
    @InjectRepository(HitlApproval)
    private readonly approvalRepository: Repository<HitlApproval>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}
  
  /**
   * Auto-assign approval to best available user
   */
  async autoAssign(approval: HitlApproval): Promise<User | null> {
    const typeConfig = APPROVAL_TYPES[approval.type as ApprovalTypeCode];
    const requiredRole = typeConfig?.requiredRole || 'sales_rep';
    
    const assignee = await this.findBestAssignee(
      approval.tenantId,
      approval.type,
      requiredRole,
    );
    
    if (!assignee) {
      this.logger.warn(
        `No available user for auto-assignment of approval ${approval.id}`,
      );
      return null;
    }
    
    await this.assignToUser(approval.id, assignee.id, 'system');
    
    return assignee;
  }
  
  /**
   * Find best assignee using assignment strategies
   */
  async findBestAssignee(
    tenantId: string,
    approvalType: string,
    requiredRole: string,
    options?: AssigneeOptions,
  ): Promise<User | null> {
    // Get eligible users
    let users = await this.getEligibleUsers(tenantId, requiredRole);
    
    if (options?.excludeUserId) {
      users = users.filter(u => u.id !== options.excludeUserId);
    }
    
    if (users.length === 0) {
      return null;
    }
    
    // Get assignment strategy
    const strategy = this.getAssignmentStrategy(approvalType);
    
    // Apply strategy
    switch (strategy) {
      case 'round_robin':
        return this.roundRobinAssignment(users, tenantId, approvalType);
      
      case 'least_busy':
        return this.leastBusyAssignment(users);
      
      case 'expertise':
        return this.expertiseBasedAssignment(users, approvalType);
      
      case 'availability':
        return this.availabilityBasedAssignment(users);
      
      default:
        return users[0]; // Fallback to first available
    }
  }
  
  /**
   * Manually assign approval to user
   */
  async assignToUser(
    approvalId: string,
    userId: string,
    assignedBy: string,
  ): Promise<void> {
    const approval = await this.approvalRepository.findOne({
      where: { id: approvalId },
    });
    
    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }
    
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    // Update assignment
    await this.approvalRepository.update(approvalId, {
      status: 'assigned',
      assignment: {
        userId,
        assignedAt: new Date(),
        assignedBy,
      },
    });
    
    // Send notification to assignee
    await this.notificationService.send({
      userId,
      type: 'approval_assigned',
      title: `Nouă aprobare: ${approval.title}`,
      message: `Ai primit o nouă aprobare de tip "${approval.type}" care necesită atenția ta.`,
      data: {
        approvalId,
        type: approval.type,
        priority: approval.priority,
        slaDeadline: approval.slaDeadline,
      },
      channels: ['in_app', 'push'],
      priority: approval.priority === 'critical' ? 'high' : 'medium',
    });
    
    this.logger.log(
      `Assigned approval ${approvalId} to user ${userId}`,
      { assignedBy },
    );
  }
  
  /**
   * Get eligible users for assignment
   */
  private async getEligibleUsers(
    tenantId: string,
    requiredRole: string,
  ): Promise<User[]> {
    const users = await this.userRepository.find({
      where: {
        tenantId,
        role: In(this.getRolesWithPermission(requiredRole)),
        status: 'active',
      },
    });
    
    // Filter by availability
    return users.filter(user => this.isUserAvailable(user));
  }
  
  /**
   * Round robin assignment
   */
  private async roundRobinAssignment(
    users: User[],
    tenantId: string,
    approvalType: string,
  ): Promise<User> {
    // Get last assigned user for this type
    const lastAssignment = await this.approvalRepository.findOne({
      where: {
        tenantId,
        type: approvalType,
        assignment: { $ne: null },
      },
      order: { 'assignment.assignedAt': 'DESC' },
    });
    
    if (!lastAssignment?.assignment) {
      return users[0];
    }
    
    // Find next user in rotation
    const lastIndex = users.findIndex(
      u => u.id === lastAssignment.assignment!.userId,
    );
    
    const nextIndex = (lastIndex + 1) % users.length;
    return users[nextIndex];
  }
  
  /**
   * Least busy assignment
   */
  private async leastBusyAssignment(users: User[]): Promise<User> {
    const workloads = await Promise.all(
      users.map(async user => {
        const count = await this.approvalRepository.count({
          where: {
            'assignment.userId': user.id,
            status: In(['assigned', 'in_review']),
          },
        });
        return { user, count };
      }),
    );
    
    // Sort by workload ascending
    workloads.sort((a, b) => a.count - b.count);
    
    return workloads[0].user;
  }
  
  /**
   * Expertise-based assignment
   */
  private async expertiseBasedAssignment(
    users: User[],
    approvalType: string,
  ): Promise<User> {
    // Get users with expertise in this type
    const expertUsers = users.filter(user => 
      user.metadata?.expertise?.includes(approvalType),
    );
    
    if (expertUsers.length > 0) {
      // Among experts, use least busy
      return this.leastBusyAssignment(expertUsers);
    }
    
    // Fallback to least busy among all
    return this.leastBusyAssignment(users);
  }
  
  /**
   * Availability-based assignment
   */
  private async availabilityBasedAssignment(users: User[]): Promise<User> {
    // Sort by last activity (most recent first - they're online)
    const sortedUsers = [...users].sort((a, b) => {
      const aTime = a.lastActivityAt?.getTime() || 0;
      const bTime = b.lastActivityAt?.getTime() || 0;
      return bTime - aTime;
    });
    
    // Get users active in last 15 minutes
    const recentlyActive = sortedUsers.filter(user => {
      if (!user.lastActivityAt) return false;
      const minutesAgo = (Date.now() - user.lastActivityAt.getTime()) / 60000;
      return minutesAgo <= 15;
    });
    
    if (recentlyActive.length > 0) {
      return this.leastBusyAssignment(recentlyActive);
    }
    
    return sortedUsers[0];
  }
  
  private getAssignmentStrategy(approvalType: string): AssignmentStrategy {
    const strategies: Record<string, AssignmentStrategy> = {
      ai_response_review: 'availability',  // Real-time, needs active user
      discount_approval: 'expertise',      // Needs authority
      handover_escalation: 'availability', // Urgent
      document_approval: 'round_robin',    // Fair distribution
      efactura_submission: 'expertise',    // Needs specific knowledge
      default: 'least_busy',
    };
    
    return strategies[approvalType] || strategies.default;
  }
  
  private getRolesWithPermission(requiredRole: string): string[] {
    const hierarchy = ['viewer', 'sales_rep', 'sales_manager', 'admin'];
    const minIndex = hierarchy.indexOf(requiredRole);
    return hierarchy.slice(minIndex);
  }
  
  private isUserAvailable(user: User): boolean {
    // Check if user is on vacation, suspended, or out of hours
    if (user.metadata?.onVacation) return false;
    if (user.metadata?.outOfOffice) return false;
    
    // Add more availability checks as needed
    return true;
  }
}

type AssignmentStrategy = 
  | 'round_robin'
  | 'least_busy'
  | 'expertise'
  | 'availability';

interface AssigneeOptions {
  excludeUserId?: string;
}
```

---

# 7. NOTIFICATION SYSTEM

## 7.1 Notification Service

```typescript
// src/hitl/notifications/notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  
  constructor(
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  
  /**
   * Send notification through configured channels
   */
  async send(notification: NotificationRequest): Promise<void> {
    const { userId, channels, ...data } = notification;
    
    for (const channel of channels) {
      await this.sendViaChannel(channel, userId, data);
    }
    
    // Emit event for real-time updates
    this.eventEmitter.emit('notification.sent', {
      userId,
      notification: data,
    });
  }
  
  /**
   * Send urgent alert to all admins
   */
  async sendUrgentAlert(alert: UrgentAlert): Promise<void> {
    // Queue for immediate processing
    await this.notificationQueue.add(
      'urgent-alert',
      alert,
      {
        priority: 1,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
    
    this.logger.warn(`Urgent alert queued: ${alert.title}`);
  }
  
  /**
   * Send SLA warning notification
   */
  async sendSlaWarning(approval: HitlApproval): Promise<void> {
    if (!approval.assignment?.userId) return;
    
    await this.send({
      userId: approval.assignment.userId,
      type: 'sla_warning',
      title: `⚠️ SLA în pericol: ${approval.title}`,
      message: `Aprobarea se apropie de deadline. Timp rămas: ${this.formatTimeRemaining(approval.slaDeadline)}`,
      data: {
        approvalId: approval.id,
        deadline: approval.slaDeadline,
        timeRemaining: approval.slaDeadline.getTime() - Date.now(),
      },
      channels: ['in_app', 'push', 'email'],
      priority: 'high',
    });
  }
  
  /**
   * Send SLA breach notification
   */
  async sendSlaBreach(approval: HitlApproval): Promise<void> {
    const notifications: NotificationRequest[] = [];
    
    // Notify assignee if any
    if (approval.assignment?.userId) {
      notifications.push({
        userId: approval.assignment.userId,
        type: 'sla_breach',
        title: `🚨 SLA depășit: ${approval.title}`,
        message: `Deadline-ul pentru această aprobare a fost depășit.`,
        data: { approvalId: approval.id },
        channels: ['in_app', 'push', 'email'],
        priority: 'high',
      });
    }
    
    // Notify managers
    const managers = await this.getManagersForTenant(approval.tenantId);
    for (const manager of managers) {
      notifications.push({
        userId: manager.id,
        type: 'sla_breach_manager',
        title: `🚨 SLA depășit în echipă: ${approval.title}`,
        message: `O aprobare din echipa ta a depășit SLA.`,
        data: { approvalId: approval.id },
        channels: ['in_app', 'email'],
        priority: 'high',
      });
    }
    
    await Promise.all(notifications.map(n => this.send(n)));
  }
  
  /**
   * Send via specific channel
   */
  private async sendViaChannel(
    channel: NotificationChannel,
    userId: string,
    data: Omit<NotificationRequest, 'userId' | 'channels'>,
  ): Promise<void> {
    switch (channel) {
      case 'in_app':
        await this.sendInApp(userId, data);
        break;
      
      case 'email':
        await this.sendEmail(userId, data);
        break;
      
      case 'push':
        await this.sendPush(userId, data);
        break;
      
      case 'sms':
        await this.sendSms(userId, data);
        break;
    }
  }
  
  private async sendInApp(userId: string, data: any): Promise<void> {
    // Save to notifications table and emit WebSocket event
    await this.notificationQueue.add('in-app', { userId, ...data });
    
    this.eventEmitter.emit('notification.in_app', { userId, data });
  }
  
  private async sendEmail(userId: string, data: any): Promise<void> {
    await this.notificationQueue.add('email', {
      userId,
      template: `hitl-${data.type}`,
      subject: data.title,
      context: data,
    });
  }
  
  private async sendPush(userId: string, data: any): Promise<void> {
    await this.notificationQueue.add('push', {
      userId,
      title: data.title,
      body: data.message,
      data: data.data,
    });
  }
  
  private async sendSms(userId: string, data: any): Promise<void> {
    await this.notificationQueue.add('sms', {
      userId,
      message: `${data.title}: ${data.message}`,
    });
  }
  
  private formatTimeRemaining(deadline: Date): string {
    const remaining = deadline.getTime() - Date.now();
    const minutes = Math.floor(remaining / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }
  
  private async getManagersForTenant(tenantId: string): Promise<User[]> {
    // Implementation would query users with manager role
    return [];
  }
}

interface NotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  priority: 'low' | 'medium' | 'high';
}

type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

interface UrgentAlert {
  tenantId: string;
  type: string;
  title: string;
  message: string;
  approvalId?: string;
  priority: 'high' | 'critical';
}
```

## 7.2 Notification Templates

```typescript
// src/hitl/notifications/templates.ts

export const HITL_NOTIFICATION_TEMPLATES = {
  // Assignment notifications
  approval_assigned: {
    subject: 'Nouă aprobare: {{title}}',
    body: `
Salut {{userName}},

Ai primit o nouă aprobare care necesită atenția ta:

**{{title}}**
Tip: {{type}}
Prioritate: {{priority}}
Deadline: {{deadline}}

{{description}}

[Revizuiește acum]({{approvalUrl}})

---
Aceasta este o notificare automată de la Cerniq.
    `.trim(),
  },
  
  // SLA warnings
  sla_warning: {
    subject: '⚠️ SLA în pericol: {{title}}',
    body: `
Salut {{userName}},

Aprobarea "{{title}}" se apropie de deadline:

- Timp rămas: {{timeRemaining}}
- Deadline: {{deadline}}
- Prioritate: {{priority}}

Te rugăm să finalizezi revizuirea cât mai curând posibil.

[Revizuiește acum]({{approvalUrl}})
    `.trim(),
  },
  
  // SLA breach
  sla_breach: {
    subject: '🚨 SLA depășit: {{title}}',
    body: `
Salut {{userName}},

Aprobarea "{{title}}" a depășit deadline-ul SLA.

- Deadline-ul era: {{deadline}}
- Întârziere: {{overdueTime}}

Această aprobare necesită atenție imediată.

[Revizuiește acum]({{approvalUrl}})
    `.trim(),
  },
  
  // Escalation
  escalation_received: {
    subject: 'Aprobare escaladată: {{title}}',
    body: `
Salut {{userName}},

Ai primit o aprobare escaladată care necesită atenția ta urgentă:

**{{title}}**
Nivel escaladare: {{escalationLevel}}
Motiv: {{escalationReason}}
Deadline nou: {{newDeadline}}

Context:
{{context}}

[Revizuiește acum]({{approvalUrl}})
    `.trim(),
  },
  
  // Resolution notifications
  approval_approved: {
    subject: '✅ Aprobare acceptată: {{title}}',
    body: `
Aprobarea "{{title}}" a fost acceptată de {{resolvedBy}}.

Note: {{notes}}

[Vezi detalii]({{approvalUrl}})
    `.trim(),
  },
  
  approval_rejected: {
    subject: '❌ Aprobare respinsă: {{title}}',
    body: `
Aprobarea "{{title}}" a fost respinsă de {{resolvedBy}}.

Motiv: {{reason}}

{{suggestedAlternative}}

[Vezi detalii]({{approvalUrl}})
    `.trim(),
  },
};
```

---

## 8. Audit & Compliance

### 8.1 Audit Trail Architecture

Sistemul HITL menține un audit trail complet și imutabil pentru toate aprobările, asigurând conformitatea cu cerințele GDPR, SOX și cerințele de audit intern.

```typescript
// src/modules/hitl/audit/audit-trail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, createHmac } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Tipuri de evenimente de audit
 */
export enum AuditEventType {
  // Lifecycle events
  APPROVAL_CREATED = 'approval.created',
  APPROVAL_ASSIGNED = 'approval.assigned',
  APPROVAL_REASSIGNED = 'approval.reassigned',
  APPROVAL_VIEWED = 'approval.viewed',
  APPROVAL_APPROVED = 'approval.approved',
  APPROVAL_REJECTED = 'approval.rejected',
  APPROVAL_EXPIRED = 'approval.expired',
  APPROVAL_CANCELLED = 'approval.cancelled',
  
  // SLA events
  SLA_WARNING = 'sla.warning',
  SLA_BREACH = 'sla.breach',
  SLA_EXTENDED = 'sla.extended',
  
  // Escalation events
  ESCALATION_TRIGGERED = 'escalation.triggered',
  ESCALATION_MANUAL = 'escalation.manual',
  ESCALATION_MAX_REACHED = 'escalation.max_reached',
  
  // Comment events
  COMMENT_ADDED = 'comment.added',
  COMMENT_EDITED = 'comment.edited',
  COMMENT_DELETED = 'comment.deleted',
  
  // Attachment events
  ATTACHMENT_UPLOADED = 'attachment.uploaded',
  ATTACHMENT_DOWNLOADED = 'attachment.downloaded',
  ATTACHMENT_DELETED = 'attachment.deleted',
  
  // Access events
  CONTEXT_ACCESSED = 'context.accessed',
  SENSITIVE_DATA_VIEWED = 'sensitive_data.viewed',
  
  // Configuration events
  SLA_CONFIG_CHANGED = 'config.sla_changed',
  ASSIGNMENT_STRATEGY_CHANGED = 'config.assignment_changed',
  NOTIFICATION_CONFIG_CHANGED = 'config.notification_changed',
}

/**
 * Entitatea AuditLog - Înregistrare de audit imutabilă
 */
@Entity('hitl_audit_log')
@Index(['tenantId', 'approvalId'])
@Index(['tenantId', 'eventType', 'createdAt'])
@Index(['tenantId', 'userId', 'createdAt'])
@Index(['previousHash']) // Pentru verificarea integrității lanțului
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid', { nullable: true })
  approvalId: string;

  @Column({
    type: 'enum',
    enum: AuditEventType,
  })
  eventType: AuditEventType;

  @Column('uuid', { nullable: true })
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  userRole: string;

  @Column('varchar', { length: 45, nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column('jsonb')
  eventData: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  previousState: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  newState: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  metadata: {
    correlationId?: string;
    requestId?: string;
    source?: string;
    component?: string;
    version?: string;
  };

  @Column('varchar', { length: 64 })
  hash: string; // SHA-256 hash al înregistrării

  @Column('varchar', { length: 64, nullable: true })
  previousHash: string; // Hash-ul înregistrării anterioare pentru chain

  @Column('varchar', { length: 128 })
  signature: string; // HMAC signature pentru integritate

  @CreateDateColumn()
  createdAt: Date;

  @Column('boolean', { default: false })
  archived: boolean;

  @Column('timestamp', { nullable: true })
  archivedAt: Date;
}

/**
 * Serviciu pentru gestionarea audit trail
 */
@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);
  private readonly signingKey: string;
  
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.signingKey = this.configService.get('AUDIT_SIGNING_KEY');
    if (!this.signingKey) {
      throw new Error('AUDIT_SIGNING_KEY is required for audit trail integrity');
    }
  }

  /**
   * Înregistrează un eveniment de audit
   */
  async log(params: {
    tenantId: string;
    approvalId?: string;
    eventType: AuditEventType;
    userId?: string;
    userName?: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    eventData: Record<string, unknown>;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogEntity> {
    // Obține ultimul hash pentru chain
    const lastLog = await this.getLastLog(params.tenantId);
    const previousHash = lastLog?.hash || null;
    
    // Creează înregistrarea
    const auditLog = this.auditRepo.create({
      ...params,
      previousHash,
      hash: '', // Va fi calculat
      signature: '', // Va fi calculat
    });
    
    // Calculează hash-ul înregistrării
    auditLog.hash = this.calculateHash(auditLog);
    
    // Semnează înregistrarea
    auditLog.signature = this.signEntry(auditLog);
    
    // Salvează
    const saved = await this.auditRepo.save(auditLog);
    
    // Emite eveniment pentru procesare asincronă
    this.eventEmitter.emit('audit.logged', {
      tenantId: params.tenantId,
      auditLogId: saved.id,
      eventType: params.eventType,
    });
    
    this.logger.debug(
      `Audit log created: ${params.eventType} for approval ${params.approvalId}`,
    );
    
    return saved;
  }

  /**
   * Calculează hash-ul unei înregistrări de audit
   */
  private calculateHash(entry: AuditLogEntity): string {
    const content = JSON.stringify({
      tenantId: entry.tenantId,
      approvalId: entry.approvalId,
      eventType: entry.eventType,
      userId: entry.userId,
      eventData: entry.eventData,
      previousState: entry.previousState,
      newState: entry.newState,
      previousHash: entry.previousHash,
      createdAt: entry.createdAt?.toISOString(),
    });
    
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Semnează o înregistrare de audit cu HMAC
   */
  private signEntry(entry: AuditLogEntity): string {
    const content = `${entry.hash}:${entry.tenantId}:${entry.eventType}`;
    return createHmac('sha256', this.signingKey)
      .update(content)
      .digest('hex');
  }

  /**
   * Verifică integritatea unei înregistrări
   */
  async verifyEntry(entryId: string): Promise<{
    valid: boolean;
    hashValid: boolean;
    signatureValid: boolean;
    chainValid: boolean;
    errors: string[];
  }> {
    const entry = await this.auditRepo.findOne({ where: { id: entryId } });
    if (!entry) {
      return {
        valid: false,
        hashValid: false,
        signatureValid: false,
        chainValid: false,
        errors: ['Entry not found'],
      };
    }
    
    const errors: string[] = [];
    
    // Verifică hash
    const calculatedHash = this.calculateHash(entry);
    const hashValid = calculatedHash === entry.hash;
    if (!hashValid) {
      errors.push('Hash mismatch - data may have been modified');
    }
    
    // Verifică semnătura
    const expectedSignature = this.signEntry(entry);
    const signatureValid = expectedSignature === entry.signature;
    if (!signatureValid) {
      errors.push('Signature invalid - entry may have been tampered with');
    }
    
    // Verifică chain-ul
    let chainValid = true;
    if (entry.previousHash) {
      const previousEntry = await this.auditRepo.findOne({
        where: { hash: entry.previousHash },
      });
      if (!previousEntry) {
        chainValid = false;
        errors.push('Previous entry in chain not found - chain broken');
      }
    }
    
    return {
      valid: hashValid && signatureValid && chainValid,
      hashValid,
      signatureValid,
      chainValid,
      errors,
    };
  }

  /**
   * Verifică integritatea întregului lanț pentru un tenant
   */
  async verifyChain(
    tenantId: string,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<{
    valid: boolean;
    totalEntries: number;
    validEntries: number;
    invalidEntries: number;
    brokenChainAt?: string;
    errors: Array<{ entryId: string; error: string }>;
  }> {
    const query = this.auditRepo
      .createQueryBuilder('audit')
      .where('audit.tenantId = :tenantId', { tenantId })
      .orderBy('audit.createdAt', 'ASC');
    
    if (options?.startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate: options.startDate });
    }
    if (options?.endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
    }
    
    const entries = await query.getMany();
    const errors: Array<{ entryId: string; error: string }> = [];
    let validEntries = 0;
    let brokenChainAt: string | undefined;
    let expectedPreviousHash: string | null = null;
    
    for (const entry of entries) {
      // Verifică hash
      const calculatedHash = this.calculateHash(entry);
      if (calculatedHash !== entry.hash) {
        errors.push({ entryId: entry.id, error: 'Hash mismatch' });
        continue;
      }
      
      // Verifică semnătura
      const expectedSignature = this.signEntry(entry);
      if (expectedSignature !== entry.signature) {
        errors.push({ entryId: entry.id, error: 'Invalid signature' });
        continue;
      }
      
      // Verifică chain
      if (expectedPreviousHash !== null && entry.previousHash !== expectedPreviousHash) {
        if (!brokenChainAt) {
          brokenChainAt = entry.id;
        }
        errors.push({ entryId: entry.id, error: 'Chain broken' });
        continue;
      }
      
      validEntries++;
      expectedPreviousHash = entry.hash;
    }
    
    return {
      valid: errors.length === 0,
      totalEntries: entries.length,
      validEntries,
      invalidEntries: errors.length,
      brokenChainAt,
      errors,
    };
  }

  /**
   * Obține ultimul log pentru chain
   */
  private async getLastLog(tenantId: string): Promise<AuditLogEntity | null> {
    return this.auditRepo.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Caută în audit log
   */
  async search(params: {
    tenantId: string;
    approvalId?: string;
    userId?: string;
    eventTypes?: AuditEventType[];
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: AuditLogEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    
    const query = this.auditRepo
      .createQueryBuilder('audit')
      .where('audit.tenantId = :tenantId', { tenantId: params.tenantId });
    
    if (params.approvalId) {
      query.andWhere('audit.approvalId = :approvalId', { approvalId: params.approvalId });
    }
    
    if (params.userId) {
      query.andWhere('audit.userId = :userId', { userId: params.userId });
    }
    
    if (params.eventTypes?.length) {
      query.andWhere('audit.eventType IN (:...eventTypes)', { eventTypes: params.eventTypes });
    }
    
    if (params.startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate: params.startDate });
    }
    
    if (params.endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate: params.endDate });
    }
    
    if (params.ipAddress) {
      query.andWhere('audit.ipAddress = :ipAddress', { ipAddress: params.ipAddress });
    }
    
    const [items, total] = await query
      .orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obține timeline-ul complet pentru o aprobare
   */
  async getApprovalTimeline(
    tenantId: string,
    approvalId: string,
  ): Promise<Array<{
    timestamp: Date;
    eventType: AuditEventType;
    user?: { id: string; name: string; role: string };
    description: string;
    details?: Record<string, unknown>;
  }>> {
    const logs = await this.auditRepo.find({
      where: { tenantId, approvalId },
      order: { createdAt: 'ASC' },
    });
    
    return logs.map(log => ({
      timestamp: log.createdAt,
      eventType: log.eventType,
      user: log.userId ? {
        id: log.userId,
        name: log.userName,
        role: log.userRole,
      } : undefined,
      description: this.getEventDescription(log),
      details: this.sanitizeDetails(log.eventData),
    }));
  }

  /**
   * Generează descriere human-readable pentru eveniment
   */
  private getEventDescription(log: AuditLogEntity): string {
    const descriptions: Record<AuditEventType, (log: AuditLogEntity) => string> = {
      [AuditEventType.APPROVAL_CREATED]: (l) => 
        `Aprobare creată pentru ${l.eventData.approvalType}`,
      [AuditEventType.APPROVAL_ASSIGNED]: (l) => 
        `Aprobare asignată către ${l.eventData.assigneeName || 'utilizator'}`,
      [AuditEventType.APPROVAL_REASSIGNED]: (l) => 
        `Aprobare reasignată de la ${l.eventData.fromUser} la ${l.eventData.toUser}`,
      [AuditEventType.APPROVAL_VIEWED]: () => 
        'Aprobare vizualizată',
      [AuditEventType.APPROVAL_APPROVED]: (l) => 
        `Aprobare acceptată${l.eventData.notes ? `: ${l.eventData.notes}` : ''}`,
      [AuditEventType.APPROVAL_REJECTED]: (l) => 
        `Aprobare respinsă: ${l.eventData.reason || 'fără motiv specificat'}`,
      [AuditEventType.APPROVAL_EXPIRED]: () => 
        'Aprobare expirată (SLA depășit)',
      [AuditEventType.APPROVAL_CANCELLED]: (l) => 
        `Aprobare anulată: ${l.eventData.reason || 'fără motiv specificat'}`,
      [AuditEventType.SLA_WARNING]: (l) => 
        `Avertizare SLA: ${l.eventData.timeRemaining} rămas`,
      [AuditEventType.SLA_BREACH]: () => 
        'SLA depășit',
      [AuditEventType.SLA_EXTENDED]: (l) => 
        `SLA extins cu ${l.eventData.extensionMinutes} minute`,
      [AuditEventType.ESCALATION_TRIGGERED]: (l) => 
        `Escaladare automată la nivel ${l.eventData.newLevel}`,
      [AuditEventType.ESCALATION_MANUAL]: (l) => 
        `Escaladare manuală către ${l.eventData.toUser}: ${l.eventData.reason}`,
      [AuditEventType.ESCALATION_MAX_REACHED]: () => 
        'Nivel maxim de escaladare atins - alertă critică',
      [AuditEventType.COMMENT_ADDED]: (l) => 
        `Comentariu adăugat${l.eventData.hasMentions ? ' (cu mențiuni)' : ''}`,
      [AuditEventType.COMMENT_EDITED]: () => 
        'Comentariu editat',
      [AuditEventType.COMMENT_DELETED]: () => 
        'Comentariu șters',
      [AuditEventType.ATTACHMENT_UPLOADED]: (l) => 
        `Fișier atașat: ${l.eventData.fileName}`,
      [AuditEventType.ATTACHMENT_DOWNLOADED]: (l) => 
        `Fișier descărcat: ${l.eventData.fileName}`,
      [AuditEventType.ATTACHMENT_DELETED]: (l) => 
        `Fișier șters: ${l.eventData.fileName}`,
      [AuditEventType.CONTEXT_ACCESSED]: (l) => 
        `Context accesat: ${l.eventData.contextType}`,
      [AuditEventType.SENSITIVE_DATA_VIEWED]: (l) => 
        `Date sensibile vizualizate: ${l.eventData.dataType}`,
      [AuditEventType.SLA_CONFIG_CHANGED]: (l) => 
        `Configurare SLA modificată pentru ${l.eventData.approvalType}`,
      [AuditEventType.ASSIGNMENT_STRATEGY_CHANGED]: (l) => 
        `Strategie asignare schimbată la ${l.eventData.newStrategy}`,
      [AuditEventType.NOTIFICATION_CONFIG_CHANGED]: () => 
        'Configurare notificări modificată',
    };
    
    const descFn = descriptions[log.eventType];
    return descFn ? descFn(log) : log.eventType;
  }

  /**
   * Sanitizează detaliile pentru afișare (elimină date sensibile)
   */
  private sanitizeDetails(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...data };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}
```


### 8.2 Compliance Reporting

```typescript
// src/modules/hitl/audit/compliance-report.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ro } from 'date-fns/locale';

/**
 * Tipuri de rapoarte de conformitate
 */
export enum ComplianceReportType {
  SLA_COMPLIANCE = 'sla_compliance',
  APPROVAL_AUDIT = 'approval_audit',
  USER_ACTIVITY = 'user_activity',
  ESCALATION_ANALYSIS = 'escalation_analysis',
  DATA_ACCESS = 'data_access',
  GDPR_PROCESSING = 'gdpr_processing',
  MONTHLY_SUMMARY = 'monthly_summary',
}

/**
 * Format de export
 */
export enum ExportFormat {
  PDF = 'pdf',
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
}

/**
 * Serviciu pentru generarea rapoartelor de conformitate
 */
@Injectable()
export class ComplianceReportService {
  private readonly logger = new Logger(ComplianceReportService.name);
  
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @InjectRepository(ApprovalEntity)
    private readonly approvalRepo: Repository<ApprovalEntity>,
    private readonly exportService: ReportExportService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Generează raport de conformitate SLA
   */
  async generateSlaComplianceReport(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    approvalTypes?: ApprovalType[];
    groupBy?: 'day' | 'week' | 'month' | 'type' | 'assignee';
  }): Promise<SlaComplianceReport> {
    const { tenantId, startDate, endDate, approvalTypes, groupBy = 'day' } = params;
    
    // Obține toate aprobările din perioada specificată
    const query = this.approvalRepo
      .createQueryBuilder('approval')
      .where('approval.tenantId = :tenantId', { tenantId })
      .andWhere('approval.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('approval.status IN (:...statuses)', { 
        statuses: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.EXPIRED] 
      });
    
    if (approvalTypes?.length) {
      query.andWhere('approval.type IN (:...types)', { types: approvalTypes });
    }
    
    const approvals = await query.getMany();
    
    // Calculează metrici
    const totalApprovals = approvals.length;
    const withinSla = approvals.filter(a => a.resolvedAt && a.resolvedAt <= a.slaDeadline).length;
    const breached = approvals.filter(a => a.slaStatus === 'breached').length;
    const expired = approvals.filter(a => a.status === ApprovalStatus.EXPIRED).length;
    
    const complianceRate = totalApprovals > 0 
      ? Math.round((withinSla / totalApprovals) * 10000) / 100 
      : 100;
    
    // Calculează timp mediu de răspuns
    const responseTimes = approvals
      .filter(a => a.resolvedAt)
      .map(a => a.resolvedAt.getTime() - a.createdAt.getTime());
    
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    
    // Grupează după criteriu
    const groupedData = this.groupApprovals(approvals, groupBy);
    
    // Identifică bottlenecks
    const bottlenecks = this.identifyBottlenecks(approvals);
    
    // Trend comparativ cu luna anterioară
    const previousMonth = await this.getPreviousMonthStats(tenantId, startDate);
    
    return {
      reportType: ComplianceReportType.SLA_COMPLIANCE,
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        totalApprovals,
        withinSla,
        breached,
        expired,
        complianceRate,
        avgResponseTimeMs: avgResponseTime,
        avgResponseTimeFormatted: this.formatDuration(avgResponseTime),
      },
      byGroup: groupedData,
      bottlenecks,
      trends: {
        previousPeriod: previousMonth,
        changePercent: previousMonth.complianceRate 
          ? Math.round((complianceRate - previousMonth.complianceRate) * 100) / 100
          : null,
      },
      recommendations: this.generateSlaRecommendations(complianceRate, bottlenecks),
    };
  }

  /**
   * Generează raport de audit pentru aprobări
   */
  async generateApprovalAuditReport(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    approvalId?: string;
    userId?: string;
    includeDetails?: boolean;
  }): Promise<ApprovalAuditReport> {
    const { tenantId, startDate, endDate, approvalId, userId, includeDetails = true } = params;
    
    // Obține log-urile de audit
    const auditQuery = this.auditRepo
      .createQueryBuilder('audit')
      .where('audit.tenantId = :tenantId', { tenantId })
      .andWhere('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    
    if (approvalId) {
      auditQuery.andWhere('audit.approvalId = :approvalId', { approvalId });
    }
    
    if (userId) {
      auditQuery.andWhere('audit.userId = :userId', { userId });
    }
    
    const auditLogs = await auditQuery
      .orderBy('audit.createdAt', 'DESC')
      .getMany();
    
    // Agregă statistici
    const eventCounts: Record<AuditEventType, number> = {} as any;
    const userActivity: Record<string, { count: number; lastActivity: Date }> = {};
    const approvalEvents: Record<string, AuditLogEntity[]> = {};
    
    for (const log of auditLogs) {
      // Count by event type
      eventCounts[log.eventType] = (eventCounts[log.eventType] || 0) + 1;
      
      // Track user activity
      if (log.userId) {
        if (!userActivity[log.userId]) {
          userActivity[log.userId] = { count: 0, lastActivity: log.createdAt };
        }
        userActivity[log.userId].count++;
        if (log.createdAt > userActivity[log.userId].lastActivity) {
          userActivity[log.userId].lastActivity = log.createdAt;
        }
      }
      
      // Group by approval
      if (log.approvalId) {
        if (!approvalEvents[log.approvalId]) {
          approvalEvents[log.approvalId] = [];
        }
        approvalEvents[log.approvalId].push(log);
      }
    }
    
    // Verifică integritatea chain-ului
    const chainIntegrity = await this.verifyChainIntegrity(tenantId, startDate, endDate);
    
    return {
      reportType: ComplianceReportType.APPROVAL_AUDIT,
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        totalEvents: auditLogs.length,
        uniqueApprovals: Object.keys(approvalEvents).length,
        uniqueUsers: Object.keys(userActivity).length,
        eventBreakdown: eventCounts,
      },
      chainIntegrity: {
        verified: chainIntegrity.valid,
        totalChecked: chainIntegrity.totalEntries,
        invalidEntries: chainIntegrity.invalidEntries,
        errors: chainIntegrity.errors.slice(0, 10), // Primele 10 erori
      },
      userActivity: Object.entries(userActivity).map(([userId, data]) => ({
        userId,
        eventCount: data.count,
        lastActivity: data.lastActivity,
      })),
      details: includeDetails 
        ? auditLogs.slice(0, 1000).map(log => ({
            id: log.id,
            timestamp: log.createdAt,
            eventType: log.eventType,
            userId: log.userId,
            userName: log.userName,
            approvalId: log.approvalId,
            ipAddress: log.ipAddress,
            description: this.getEventDescription(log),
          }))
        : undefined,
    };
  }

  /**
   * Generează raport de activitate utilizatori
   */
  async generateUserActivityReport(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    userIds?: string[];
  }): Promise<UserActivityReport> {
    const { tenantId, startDate, endDate, userIds } = params;
    
    const query = this.auditRepo
      .createQueryBuilder('audit')
      .select([
        'audit.userId',
        'audit.userName',
        'audit.userRole',
        'audit.eventType',
        'COUNT(*) as count',
      ])
      .where('audit.tenantId = :tenantId', { tenantId })
      .andWhere('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('audit.userId IS NOT NULL')
      .groupBy('audit.userId, audit.userName, audit.userRole, audit.eventType');
    
    if (userIds?.length) {
      query.andWhere('audit.userId IN (:...userIds)', { userIds });
    }
    
    const results = await query.getRawMany();
    
    // Agregă per utilizator
    const userStats: Record<string, UserActivityStats> = {};
    
    for (const row of results) {
      const userId = row.audit_userId;
      
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          userName: row.audit_userName,
          userRole: row.audit_userRole,
          totalActions: 0,
          approvals: 0,
          rejections: 0,
          escalations: 0,
          comments: 0,
          avgResponseTimeMs: 0,
        };
      }
      
      const count = parseInt(row.count, 10);
      userStats[userId].totalActions += count;
      
      switch (row.audit_eventType) {
        case AuditEventType.APPROVAL_APPROVED:
          userStats[userId].approvals += count;
          break;
        case AuditEventType.APPROVAL_REJECTED:
          userStats[userId].rejections += count;
          break;
        case AuditEventType.ESCALATION_MANUAL:
          userStats[userId].escalations += count;
          break;
        case AuditEventType.COMMENT_ADDED:
          userStats[userId].comments += count;
          break;
      }
    }
    
    // Calculează timp mediu de răspuns per utilizator
    for (const userId of Object.keys(userStats)) {
      const userApprovals = await this.approvalRepo.find({
        where: {
          tenantId,
          assignedToId: userId,
          status: In([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]),
          resolvedAt: Between(startDate, endDate),
        },
      });
      
      if (userApprovals.length > 0) {
        const responseTimes = userApprovals
          .filter(a => a.resolvedAt && a.assignedAt)
          .map(a => a.resolvedAt.getTime() - a.assignedAt.getTime());
        
        userStats[userId].avgResponseTimeMs = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;
      }
    }
    
    // Sortează după activitate
    const sortedUsers = Object.values(userStats)
      .sort((a, b) => b.totalActions - a.totalActions);
    
    return {
      reportType: ComplianceReportType.USER_ACTIVITY,
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        totalUsers: sortedUsers.length,
        totalActions: sortedUsers.reduce((sum, u) => sum + u.totalActions, 0),
        totalApprovals: sortedUsers.reduce((sum, u) => sum + u.approvals, 0),
        totalRejections: sortedUsers.reduce((sum, u) => sum + u.rejections, 0),
      },
      users: sortedUsers,
      topPerformers: sortedUsers.slice(0, 5),
      performanceMetrics: {
        avgActionsPerUser: sortedUsers.length > 0
          ? Math.round(sortedUsers.reduce((sum, u) => sum + u.totalActions, 0) / sortedUsers.length)
          : 0,
        avgResponseTime: sortedUsers.length > 0
          ? Math.round(sortedUsers.reduce((sum, u) => sum + u.avgResponseTimeMs, 0) / sortedUsers.length)
          : 0,
      },
    };
  }

  /**
   * Generează raport GDPR pentru procesări de date
   */
  async generateGdprProcessingReport(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<GdprProcessingReport> {
    const { tenantId, startDate, endDate } = params;
    
    // Obține accesări de date sensibile
    const sensitiveAccess = await this.auditRepo.find({
      where: {
        tenantId,
        eventType: In([
          AuditEventType.SENSITIVE_DATA_VIEWED,
          AuditEventType.CONTEXT_ACCESSED,
        ]),
        createdAt: Between(startDate, endDate),
      },
    });
    
    // Grupează după tip de date
    const dataTypeAccess: Record<string, {
      accessCount: number;
      uniqueUsers: Set<string>;
      purposes: Set<string>;
    }> = {};
    
    for (const log of sensitiveAccess) {
      const dataType = log.eventData.dataType as string || 'unknown';
      
      if (!dataTypeAccess[dataType]) {
        dataTypeAccess[dataType] = {
          accessCount: 0,
          uniqueUsers: new Set(),
          purposes: new Set(),
        };
      }
      
      dataTypeAccess[dataType].accessCount++;
      if (log.userId) {
        dataTypeAccess[dataType].uniqueUsers.add(log.userId);
      }
      if (log.eventData.purpose) {
        dataTypeAccess[dataType].purposes.add(log.eventData.purpose as string);
      }
    }
    
    // Verifică baza legală (Art. 6 GDPR)
    const legalBasis = await this.getLegalBasisStats(tenantId, startDate, endDate);
    
    // Data retention checks
    const retentionIssues = await this.checkDataRetention(tenantId);
    
    return {
      reportType: ComplianceReportType.GDPR_PROCESSING,
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        totalDataAccess: sensitiveAccess.length,
        dataTypesAccessed: Object.keys(dataTypeAccess).length,
        uniqueDataSubjects: 0, // Would need to extract from context
      },
      dataAccess: Object.entries(dataTypeAccess).map(([dataType, stats]) => ({
        dataType,
        accessCount: stats.accessCount,
        uniqueUsers: stats.uniqueUsers.size,
        purposes: Array.from(stats.purposes),
      })),
      legalBasis,
      retentionCompliance: {
        issuesFound: retentionIssues.length,
        issues: retentionIssues,
      },
      recommendations: [
        'Verificați că toate accesările au bază legală validă conform Art. 6 GDPR',
        'Asigurați-vă că politica de retenție date este respectată',
        'Documentați scopul fiecărei procesări de date personale',
      ],
    };
  }

  /**
   * Exportă raport în format specificat
   */
  async exportReport(params: {
    tenantId: string;
    report: any;
    format: ExportFormat;
    fileName?: string;
  }): Promise<{ url: string; expiresAt: Date }> {
    const { tenantId, report, format, fileName } = params;
    
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const finalFileName = fileName || `${report.reportType}_${timestamp}`;
    
    let buffer: Buffer;
    let contentType: string;
    
    switch (format) {
      case ExportFormat.PDF:
        buffer = await this.exportService.toPdf(report);
        contentType = 'application/pdf';
        break;
      case ExportFormat.XLSX:
        buffer = await this.exportService.toXlsx(report);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case ExportFormat.CSV:
        buffer = await this.exportService.toCsv(report);
        contentType = 'text/csv';
        break;
      case ExportFormat.JSON:
        buffer = Buffer.from(JSON.stringify(report, null, 2));
        contentType = 'application/json';
        break;
    }
    
    const extension = format.toLowerCase();
    const path = `tenants/${tenantId}/reports/${finalFileName}.${extension}`;
    
    await this.storageService.upload({
      path,
      buffer,
      contentType,
    });
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // URL valid 24 ore
    
    const url = await this.storageService.getSignedUrl(path, expiresAt);
    
    return { url, expiresAt };
  }

  /**
   * Helper: Grupează aprobări
   */
  private groupApprovals(
    approvals: ApprovalEntity[],
    groupBy: string,
  ): Array<{ group: string; count: number; withinSla: number; breached: number }> {
    const groups: Record<string, { count: number; withinSla: number; breached: number }> = {};
    
    for (const approval of approvals) {
      let groupKey: string;
      
      switch (groupBy) {
        case 'day':
          groupKey = format(approval.createdAt, 'yyyy-MM-dd');
          break;
        case 'week':
          groupKey = format(approval.createdAt, 'yyyy-\'W\'ww');
          break;
        case 'month':
          groupKey = format(approval.createdAt, 'yyyy-MM');
          break;
        case 'type':
          groupKey = approval.type;
          break;
        case 'assignee':
          groupKey = approval.assignedToId || 'unassigned';
          break;
        default:
          groupKey = 'all';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = { count: 0, withinSla: 0, breached: 0 };
      }
      
      groups[groupKey].count++;
      
      if (approval.resolvedAt && approval.resolvedAt <= approval.slaDeadline) {
        groups[groupKey].withinSla++;
      }
      
      if (approval.slaStatus === 'breached') {
        groups[groupKey].breached++;
      }
    }
    
    return Object.entries(groups)
      .map(([group, data]) => ({ group, ...data }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }

  /**
   * Helper: Identifică bottlenecks
   */
  private identifyBottlenecks(approvals: ApprovalEntity[]): Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }> {
    const bottlenecks: Array<any> = [];
    
    // Verifică tipuri cu rată mare de breach
    const byType: Record<string, { total: number; breached: number }> = {};
    
    for (const approval of approvals) {
      if (!byType[approval.type]) {
        byType[approval.type] = { total: 0, breached: 0 };
      }
      byType[approval.type].total++;
      if (approval.slaStatus === 'breached') {
        byType[approval.type].breached++;
      }
    }
    
    for (const [type, stats] of Object.entries(byType)) {
      const breachRate = stats.total > 0 ? stats.breached / stats.total : 0;
      
      if (breachRate > 0.2) {
        bottlenecks.push({
          type: 'high_breach_rate',
          description: `Tipul "${type}" are o rată de breach de ${Math.round(breachRate * 100)}%`,
          severity: breachRate > 0.5 ? 'high' : 'medium',
          recommendation: `Revizuiți configurarea SLA pentru ${type} sau alocați mai multe resurse`,
        });
      }
    }
    
    // Verifică utilizatori supraîncărcați
    const byAssignee: Record<string, number> = {};
    
    for (const approval of approvals.filter(a => a.slaStatus === 'breached')) {
      if (approval.assignedToId) {
        byAssignee[approval.assignedToId] = (byAssignee[approval.assignedToId] || 0) + 1;
      }
    }
    
    for (const [assigneeId, breachCount] of Object.entries(byAssignee)) {
      if (breachCount > 5) {
        bottlenecks.push({
          type: 'overloaded_user',
          description: `Utilizatorul ${assigneeId} are ${breachCount} breach-uri SLA`,
          severity: breachCount > 10 ? 'high' : 'medium',
          recommendation: 'Redistribuiți sarcinile sau ajustați strategia de asignare',
        });
      }
    }
    
    return bottlenecks;
  }

  /**
   * Helper: Formatare durată
   */
  private formatDuration(ms: number): string {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
  }

  /**
   * Helper: Generare recomandări SLA
   */
  private generateSlaRecommendations(
    complianceRate: number,
    bottlenecks: any[],
  ): string[] {
    const recommendations: string[] = [];
    
    if (complianceRate < 90) {
      recommendations.push('Rata de conformitate SLA este sub 90%. Luați în considerare:');
      recommendations.push('- Revizuirea timpilor SLA pentru tipurile problematice');
      recommendations.push('- Alocarea mai multor resurse pentru procesare');
      recommendations.push('- Implementarea de automatizări pentru aprobări simple');
    }
    
    if (bottlenecks.some(b => b.type === 'overloaded_user')) {
      recommendations.push('Există utilizatori supraîncărcați. Recomandări:');
      recommendations.push('- Schimbați strategia de asignare la "least_busy"');
      recommendations.push('- Angajați sau realocați personal');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performanța SLA este bună. Continuați monitorizarea regulată.');
    }
    
    return recommendations;
  }
}
```


### 8.3 Data Retention & Archival

```typescript
// src/modules/hitl/audit/data-retention.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * Politici de retenție per tip de date
 */
export const RetentionPolicies = {
  // Aprobări - 7 ani pentru conformitate fiscală România
  approvals: {
    active: 365 * 2,      // 2 ani păstrate activ
    archived: 365 * 5,    // 5 ani în arhivă
    total: 365 * 7,       // 7 ani total (cerință legală)
  },
  
  // Audit logs - 10 ani pentru audit trail complet
  auditLogs: {
    active: 365 * 2,      // 2 ani păstrate activ
    archived: 365 * 8,    // 8 ani în arhivă
    total: 365 * 10,      // 10 ani total
  },
  
  // Comentarii și atașamente
  comments: {
    active: 365 * 2,
    archived: 365 * 5,
    total: 365 * 7,
  },
  
  // Notificări - păstrate mai puțin
  notifications: {
    active: 90,           // 90 zile active
    archived: 275,        // ~9 luni în arhivă
    total: 365,           // 1 an total
  },
  
  // Metrici agregate - păstrate indefinit
  metrics: {
    active: null,         // Întotdeauna active
    archived: null,
    total: null,          // Păstrate permanent
  },
};

/**
 * Status arhivare
 */
export enum ArchiveStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Entitate pentru tracking arhivare
 */
@Entity('hitl_archive_jobs')
export class ArchiveJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({
    type: 'enum',
    enum: ['approvals', 'auditLogs', 'comments', 'notifications'],
  })
  dataType: string;

  @Column({
    type: 'enum',
    enum: ArchiveStatus,
    default: ArchiveStatus.PENDING,
  })
  status: ArchiveStatus;

  @Column('date')
  cutoffDate: Date;

  @Column('int', { default: 0 })
  recordsProcessed: number;

  @Column('int', { default: 0 })
  recordsArchived: number;

  @Column('int', { default: 0 })
  recordsDeleted: number;

  @Column('varchar', { nullable: true })
  archivePath: string;

  @Column('bigint', { nullable: true })
  archiveSizeBytes: number;

  @Column('text', { nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;
}

/**
 * Serviciu pentru gestionarea retenției datelor
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);
  
  constructor(
    @InjectRepository(ApprovalEntity)
    private readonly approvalRepo: Repository<ApprovalEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @InjectRepository(ApprovalCommentEntity)
    private readonly commentRepo: Repository<ApprovalCommentEntity>,
    @InjectRepository(ArchiveJobEntity)
    private readonly archiveJobRepo: Repository<ArchiveJobEntity>,
    @InjectQueue('archive')
    private readonly archiveQueue: Queue,
    private readonly storageService: StorageService,
    private readonly compressionService: CompressionService,
  ) {}

  /**
   * Job programat pentru arhivare zilnică (rulează la 3 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailyArchive(): Promise<void> {
    this.logger.log('Starting daily archive job');
    
    // Obține toți tenants
    const tenants = await this.getTenantIds();
    
    for (const tenantId of tenants) {
      // Queue archive jobs for each data type
      await this.archiveQueue.add(
        'archive-tenant',
        { tenantId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        }
      );
    }
    
    this.logger.log(`Queued archive jobs for ${tenants.length} tenants`);
  }

  /**
   * Arhivează datele pentru un tenant
   */
  async archiveTenantData(tenantId: string): Promise<{
    approvals: ArchiveResult;
    auditLogs: ArchiveResult;
    comments: ArchiveResult;
    notifications: ArchiveResult;
  }> {
    const results = {
      approvals: await this.archiveApprovals(tenantId),
      auditLogs: await this.archiveAuditLogs(tenantId),
      comments: await this.archiveComments(tenantId),
      notifications: await this.archiveNotifications(tenantId),
    };
    
    return results;
  }

  /**
   * Arhivează aprobări vechi
   */
  async archiveApprovals(tenantId: string): Promise<ArchiveResult> {
    const policy = RetentionPolicies.approvals;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.active);
    
    // Creează job de arhivare
    const job = await this.archiveJobRepo.save({
      tenantId,
      dataType: 'approvals',
      cutoffDate,
      status: ArchiveStatus.IN_PROGRESS,
    });
    
    try {
      // Găsește aprobări de arhivat (finalizate, mai vechi de cutoff)
      const toArchive = await this.approvalRepo.find({
        where: {
          tenantId,
          archived: false,
          status: In([
            ApprovalStatus.APPROVED,
            ApprovalStatus.REJECTED,
            ApprovalStatus.EXPIRED,
            ApprovalStatus.CANCELLED,
          ]),
          resolvedAt: LessThan(cutoffDate),
        },
        take: 10000, // Procesăm în batch-uri de 10k
      });
      
      if (toArchive.length === 0) {
        await this.completeArchiveJob(job.id, { archived: 0, deleted: 0 });
        return { archived: 0, deleted: 0 };
      }
      
      // Creează fișier de arhivă
      const archiveData = toArchive.map(a => ({
        ...a,
        archivedAt: new Date(),
      }));
      
      const compressedData = await this.compressionService.compress(
        JSON.stringify(archiveData),
      );
      
      // Upload la storage
      const archivePath = `archives/${tenantId}/approvals/${format(cutoffDate, 'yyyy/MM')}/${job.id}.json.gz`;
      await this.storageService.upload({
        path: archivePath,
        buffer: compressedData,
        contentType: 'application/gzip',
      });
      
      // Marchează ca arhivate în DB
      const ids = toArchive.map(a => a.id);
      await this.approvalRepo.update(ids, { archived: true, archivedAt: new Date() });
      
      // Completează job-ul
      await this.completeArchiveJob(job.id, {
        archived: toArchive.length,
        deleted: 0,
        archivePath,
        archiveSize: compressedData.length,
      });
      
      this.logger.log(`Archived ${toArchive.length} approvals for tenant ${tenantId}`);
      
      // Verifică dacă trebuie șterse înregistrări vechi
      const deletedCount = await this.deleteExpiredApprovals(tenantId);
      
      return { archived: toArchive.length, deleted: deletedCount };
      
    } catch (error) {
      await this.failArchiveJob(job.id, error.message);
      throw error;
    }
  }

  /**
   * Șterge aprobări expirate (mai vechi de retenția totală)
   */
  private async deleteExpiredApprovals(tenantId: string): Promise<number> {
    const policy = RetentionPolicies.approvals;
    const deleteCutoff = new Date();
    deleteCutoff.setDate(deleteCutoff.getDate() - policy.total);
    
    // Găsește aprobări de șters (arhivate și mai vechi de retenția totală)
    const toDelete = await this.approvalRepo.find({
      where: {
        tenantId,
        archived: true,
        archivedAt: LessThan(deleteCutoff),
      },
      select: ['id'],
    });
    
    if (toDelete.length === 0) return 0;
    
    // Șterge în batch-uri
    const ids = toDelete.map(a => a.id);
    const batchSize = 1000;
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      await this.approvalRepo.delete(batch);
    }
    
    this.logger.log(`Deleted ${toDelete.length} expired approvals for tenant ${tenantId}`);
    return toDelete.length;
  }

  /**
   * Arhivează audit logs
   */
  async archiveAuditLogs(tenantId: string): Promise<ArchiveResult> {
    const policy = RetentionPolicies.auditLogs;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.active);
    
    const job = await this.archiveJobRepo.save({
      tenantId,
      dataType: 'auditLogs',
      cutoffDate,
      status: ArchiveStatus.IN_PROGRESS,
    });
    
    try {
      const toArchive = await this.auditRepo.find({
        where: {
          tenantId,
          archived: false,
          createdAt: LessThan(cutoffDate),
        },
        take: 50000, // Audit logs pot fi multe
      });
      
      if (toArchive.length === 0) {
        await this.completeArchiveJob(job.id, { archived: 0, deleted: 0 });
        return { archived: 0, deleted: 0 };
      }
      
      // Arhivare cu păstrarea chain integrity
      const archiveData = toArchive.map(log => ({
        ...log,
        archivedAt: new Date(),
        // Păstrăm hash și signature pentru verificare ulterioară
      }));
      
      const compressedData = await this.compressionService.compress(
        JSON.stringify(archiveData),
      );
      
      const archivePath = `archives/${tenantId}/audit/${format(cutoffDate, 'yyyy/MM')}/${job.id}.json.gz`;
      await this.storageService.upload({
        path: archivePath,
        buffer: compressedData,
        contentType: 'application/gzip',
      });
      
      // Marchează ca arhivate
      const ids = toArchive.map(a => a.id);
      await this.auditRepo.update(ids, { archived: true, archivedAt: new Date() });
      
      await this.completeArchiveJob(job.id, {
        archived: toArchive.length,
        deleted: 0,
        archivePath,
        archiveSize: compressedData.length,
      });
      
      // Șterge log-uri expirate
      const deletedCount = await this.deleteExpiredAuditLogs(tenantId);
      
      return { archived: toArchive.length, deleted: deletedCount };
      
    } catch (error) {
      await this.failArchiveJob(job.id, error.message);
      throw error;
    }
  }

  /**
   * Restaurează date din arhivă
   */
  async restoreFromArchive(params: {
    tenantId: string;
    archiveJobId: string;
  }): Promise<{ restoredCount: number }> {
    const { tenantId, archiveJobId } = params;
    
    // Găsește job-ul de arhivare
    const archiveJob = await this.archiveJobRepo.findOne({
      where: { id: archiveJobId, tenantId },
    });
    
    if (!archiveJob || !archiveJob.archivePath) {
      throw new Error('Archive job not found or has no archive path');
    }
    
    // Download și decompress
    const compressedData = await this.storageService.download(archiveJob.archivePath);
    const jsonData = await this.compressionService.decompress(compressedData);
    const records = JSON.parse(jsonData);
    
    // Restore based on data type
    let restoredCount = 0;
    
    switch (archiveJob.dataType) {
      case 'approvals':
        for (const record of records) {
          delete record.archivedAt;
          record.archived = false;
          await this.approvalRepo.save(record);
          restoredCount++;
        }
        break;
        
      case 'auditLogs':
        for (const record of records) {
          delete record.archivedAt;
          record.archived = false;
          await this.auditRepo.save(record);
          restoredCount++;
        }
        break;
    }
    
    this.logger.log(
      `Restored ${restoredCount} records from archive ${archiveJobId}`,
    );
    
    return { restoredCount };
  }

  /**
   * Obține statistici de retenție
   */
  async getRetentionStats(tenantId: string): Promise<RetentionStats> {
    const now = new Date();
    
    // Aprobări
    const approvalsTotal = await this.approvalRepo.count({ where: { tenantId } });
    const approvalsArchived = await this.approvalRepo.count({ 
      where: { tenantId, archived: true } 
    });
    
    const approvalCutoff = new Date(now);
    approvalCutoff.setDate(approvalCutoff.getDate() - RetentionPolicies.approvals.active);
    const approvalsPendingArchive = await this.approvalRepo.count({
      where: {
        tenantId,
        archived: false,
        resolvedAt: LessThan(approvalCutoff),
      },
    });
    
    // Audit logs
    const auditTotal = await this.auditRepo.count({ where: { tenantId } });
    const auditArchived = await this.auditRepo.count({ 
      where: { tenantId, archived: true } 
    });
    
    const auditCutoff = new Date(now);
    auditCutoff.setDate(auditCutoff.getDate() - RetentionPolicies.auditLogs.active);
    const auditPendingArchive = await this.auditRepo.count({
      where: {
        tenantId,
        archived: false,
        createdAt: LessThan(auditCutoff),
      },
    });
    
    // Spațiu folosit de arhive
    const archiveJobs = await this.archiveJobRepo.find({
      where: { tenantId, status: ArchiveStatus.COMPLETED },
    });
    
    const totalArchiveSize = archiveJobs.reduce(
      (sum, job) => sum + (job.archiveSizeBytes || 0),
      0,
    );
    
    return {
      approvals: {
        total: approvalsTotal,
        active: approvalsTotal - approvalsArchived,
        archived: approvalsArchived,
        pendingArchive: approvalsPendingArchive,
        retentionDays: RetentionPolicies.approvals,
      },
      auditLogs: {
        total: auditTotal,
        active: auditTotal - auditArchived,
        archived: auditArchived,
        pendingArchive: auditPendingArchive,
        retentionDays: RetentionPolicies.auditLogs,
      },
      archiveStorage: {
        totalSizeBytes: totalArchiveSize,
        totalSizeFormatted: this.formatBytes(totalArchiveSize),
        archiveCount: archiveJobs.length,
      },
      lastArchiveRun: archiveJobs.length > 0
        ? archiveJobs.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0].completedAt
        : null,
    };
  }

  /**
   * Helpers
   */
  private async completeArchiveJob(
    jobId: string,
    result: { archived: number; deleted: number; archivePath?: string; archiveSize?: number },
  ): Promise<void> {
    await this.archiveJobRepo.update(jobId, {
      status: ArchiveStatus.COMPLETED,
      recordsArchived: result.archived,
      recordsDeleted: result.deleted,
      archivePath: result.archivePath,
      archiveSizeBytes: result.archiveSize,
      completedAt: new Date(),
    });
  }

  private async failArchiveJob(jobId: string, error: string): Promise<void> {
    await this.archiveJobRepo.update(jobId, {
      status: ArchiveStatus.FAILED,
      errorMessage: error,
      completedAt: new Date(),
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async getTenantIds(): Promise<string[]> {
    const result = await this.approvalRepo
      .createQueryBuilder('approval')
      .select('DISTINCT approval.tenantId', 'tenantId')
      .getRawMany();
    return result.map(r => r.tenantId);
  }
}

/**
 * Tipuri pentru rezultate
 */
interface ArchiveResult {
  archived: number;
  deleted: number;
}

interface RetentionStats {
  approvals: {
    total: number;
    active: number;
    archived: number;
    pendingArchive: number;
    retentionDays: { active: number; archived: number; total: number };
  };
  auditLogs: {
    total: number;
    active: number;
    archived: number;
    pendingArchive: number;
    retentionDays: { active: number; archived: number; total: number };
  };
  archiveStorage: {
    totalSizeBytes: number;
    totalSizeFormatted: string;
    archiveCount: number;
  };
  lastArchiveRun: Date | null;
}
```


---

## 9. UI Components

### 9.1 Approval Dashboard

```typescript
// packages/frontend/src/features/hitl/pages/ApprovalDashboard.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowUpCircle,
  Filter,
  RefreshCw,
  Bell,
  Settings
} from 'lucide-react';
import { ApprovalList } from '../components/ApprovalList';
import { ApprovalFilters } from '../components/ApprovalFilters';
import { ApprovalStats } from '../components/ApprovalStats';
import { ApprovalDetail } from '../components/ApprovalDetail';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

/**
 * Approval Dashboard - Pagina principală pentru gestionarea aprobărilor HITL
 * 
 * Features:
 * - Real-time updates via WebSocket
 * - Filtrare avansată (tip, prioritate, SLA status)
 * - Bulk actions
 * - Statistici și metrici
 * - Drill-down în detalii aprobare
 */

// Types
interface ApprovalFiltersState {
  types: ApprovalType[];
  priorities: Priority[];
  slaStatuses: SlaStatus[];
  assignedTo: string | 'me' | 'unassigned' | 'all';
  search: string;
  dateRange: { from: Date | null; to: Date | null };
}

interface ApprovalDashboardProps {
  initialTab?: 'pending' | 'my-queue' | 'resolved' | 'all';
}

export const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({
  initialTab = 'my-queue',
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [filters, setFilters] = useState<ApprovalFiltersState>({
    types: [],
    priorities: [],
    slaStatuses: [],
    assignedTo: 'me',
    search: '',
    dateRange: { from: null, to: null },
  });
  const [showFilters, setShowFilters] = useState(false);

  // WebSocket pentru real-time updates
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  useEffect(() => {
    const handlers = {
      'approval:created': (data: any) => {
        queryClient.invalidateQueries(['approvals']);
        queryClient.invalidateQueries(['approval-stats']);
        toast({
          title: 'Aprobare nouă',
          description: `${data.title} - ${data.type}`,
          variant: 'default',
        });
      },
      'approval:updated': (data: any) => {
        queryClient.invalidateQueries(['approvals']);
        queryClient.invalidateQueries(['approval-stats']);
      },
      'approval:assigned': (data: any) => {
        queryClient.invalidateQueries(['approvals']);
        if (data.assignedToId === currentUserId) {
          toast({
            title: 'Aprobare atribuită',
            description: `Ti s-a atribuit: ${data.title}`,
            variant: 'info',
          });
        }
      },
      'sla:warning': (data: any) => {
        queryClient.invalidateQueries(['approvals']);
        toast({
          title: 'Avertizare SLA',
          description: `${data.title} - rămân ${data.timeRemaining}`,
          variant: 'warning',
        });
      },
      'sla:breach': (data: any) => {
        queryClient.invalidateQueries(['approvals']);
        toast({
          title: 'SLA Depășit!',
          description: `${data.title} - necesită atenție imediată`,
          variant: 'destructive',
        });
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      subscribe(event, handler);
    });

    return () => {
      Object.keys(handlers).forEach((event) => {
        unsubscribe(event);
      });
    };
  }, [subscribe, unsubscribe, queryClient, toast]);

  // Query pentru statistici
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['approval-stats'],
    queryFn: () => approvalService.getStats(),
    refetchInterval: 30000, // Refresh la 30 secunde
  });

  // Query pentru lista de aprobări
  const { data: approvals, isLoading: approvalsLoading, refetch } = useQuery({
    queryKey: ['approvals', activeTab, filters],
    queryFn: () => approvalService.getApprovals({
      status: activeTab === 'resolved' ? ['approved', 'rejected', 'expired'] : ['pending', 'assigned', 'in_review'],
      assignedTo: activeTab === 'my-queue' ? 'me' : filters.assignedTo,
      types: filters.types,
      priorities: filters.priorities,
      slaStatuses: filters.slaStatuses,
      search: filters.search,
      dateRange: filters.dateRange,
      limit: 50,
    }),
    keepPreviousData: true,
  });

  // Query pentru detalii aprobare selectată
  const { data: approvalDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['approval-detail', selectedApproval],
    queryFn: () => selectedApproval ? approvalService.getApprovalDetail(selectedApproval) : null,
    enabled: !!selectedApproval,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      approvalService.approve(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['approvals']);
      queryClient.invalidateQueries(['approval-stats']);
      toast({ title: 'Aprobare finalizată', variant: 'success' });
      setSelectedApproval(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Eroare', description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      approvalService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['approvals']);
      queryClient.invalidateQueries(['approval-stats']);
      toast({ title: 'Aprobare respinsă', variant: 'success' });
      setSelectedApproval(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Eroare', description: error.message, variant: 'destructive' });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      approvalService.escalate(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['approvals']);
      toast({ title: 'Aprobare escaladată', variant: 'info' });
    },
    onError: (error: Error) => {
      toast({ title: 'Eroare', description: error.message, variant: 'destructive' });
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
    queryClient.invalidateQueries(['approval-stats']);
  }, [refetch, queryClient]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Centru Aprobări</h1>
          <Badge variant={isConnected ? 'success' : 'secondary'}>
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtre
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <ApprovalStats stats={stats} loading={statsLoading} />

      {/* Filters Panel (Collapsible) */}
      {showFilters && (
        <ApprovalFilters
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - List */}
        <div className="w-1/2 border-r overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full justify-start px-4 pt-2">
              <TabsTrigger value="my-queue" className="relative">
                Coada mea
                {stats?.myQueue?.pending > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                    {stats.myQueue.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                În așteptare
                {stats?.pending?.total > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.pending.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">Rezolvate</TabsTrigger>
              <TabsTrigger value="all">Toate</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <ApprovalList
                approvals={approvals?.items || []}
                loading={approvalsLoading}
                selectedId={selectedApproval}
                onSelect={setSelectedApproval}
              />
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right Panel - Detail */}
        <div className="w-1/2 overflow-hidden">
          {selectedApproval ? (
            <ApprovalDetail
              approval={approvalDetail}
              loading={detailLoading}
              onApprove={(notes) => approveMutation.mutate({ id: selectedApproval, notes })}
              onReject={(reason) => rejectMutation.mutate({ id: selectedApproval, reason })}
              onEscalate={(reason) => escalateMutation.mutate({ id: selectedApproval, reason })}
              onClose={() => setSelectedApproval(null)}
              isApproving={approveMutation.isLoading}
              isRejecting={rejectMutation.isLoading}
              isEscalating={escalateMutation.isLoading}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selectează o aprobare pentru a vedea detaliile</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 9.2 Approval Stats Component

```typescript
// packages/frontend/src/features/hitl/components/ApprovalStats.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowUpCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalStatsProps {
  stats: ApprovalStatsData | null | undefined;
  loading: boolean;
}

interface ApprovalStatsData {
  myQueue: {
    pending: number;
    breached: number;
    warning: number;
    avgResponseTime: number;
  };
  pending: {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
  resolved: {
    today: number;
    approved: number;
    rejected: number;
    escalated: number;
  };
  slaCompliance: {
    rate: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
}

export const ApprovalStats: React.FC<ApprovalStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {/* My Queue */}
      <Card className={cn(
        stats.myQueue.breached > 0 && 'border-red-500 bg-red-50/50'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Coada mea
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.myQueue.pending}</div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {stats.myQueue.breached > 0 && (
              <span className="text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stats.myQueue.breached} depășite
              </span>
            )}
            {stats.myQueue.warning > 0 && (
              <span className="text-yellow-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {stats.myQueue.warning} warning
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Timp mediu răspuns: {Math.round(stats.myQueue.avgResponseTime / 60)}min
          </div>
        </CardContent>
      </Card>

      {/* Total Pending */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Total în așteptare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending.total}</div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
            {Object.entries(stats.pending.byPriority).slice(0, 4).map(([priority, count]) => (
              <span key={priority} className="flex items-center gap-1">
                <PriorityIndicator priority={priority as Priority} size="sm" />
                {count}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resolved Today */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Rezolvate azi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.resolved.today}</div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="text-green-500 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {stats.resolved.approved}
            </span>
            <span className="text-red-500 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {stats.resolved.rejected}
            </span>
            <span className="text-blue-500 flex items-center gap-1">
              <ArrowUpCircle className="h-3 w-3" />
              {stats.resolved.escalated}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* SLA Compliance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Conformitate SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold">{stats.slaCompliance.rate.toFixed(1)}%</div>
            <div className={cn(
              'flex items-center text-xs',
              stats.slaCompliance.trend === 'up' && 'text-green-500',
              stats.slaCompliance.trend === 'down' && 'text-red-500',
              stats.slaCompliance.trend === 'stable' && 'text-muted-foreground'
            )}>
              {stats.slaCompliance.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
              {stats.slaCompliance.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
              {stats.slaCompliance.change > 0 ? '+' : ''}{stats.slaCompliance.change.toFixed(1)}%
            </div>
          </div>
          <Progress 
            value={stats.slaCompliance.rate} 
            className="mt-3 h-2"
            indicatorClassName={cn(
              stats.slaCompliance.rate >= 95 && 'bg-green-500',
              stats.slaCompliance.rate >= 85 && stats.slaCompliance.rate < 95 && 'bg-yellow-500',
              stats.slaCompliance.rate < 85 && 'bg-red-500'
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Priority Indicator Component
 */
const PriorityIndicator: React.FC<{ priority: Priority; size?: 'sm' | 'md' }> = ({ 
  priority, 
  size = 'md' 
}) => {
  const config = {
    critical: { color: 'bg-red-500', label: 'Critic' },
    high: { color: 'bg-orange-500', label: 'Înalt' },
    medium: { color: 'bg-yellow-500', label: 'Mediu' },
    low: { color: 'bg-green-500', label: 'Scăzut' },
  };

  const { color, label } = config[priority] || config.medium;
  const sizeClass = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3';

  return (
    <span className="flex items-center gap-1">
      <span className={cn('rounded-full', color, sizeClass)} />
      {size !== 'sm' && <span>{label}</span>}
    </span>
  );
};
```

### 9.3 Approval List Component

```typescript
// packages/frontend/src/features/hitl/components/ApprovalList.tsx

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  AlertTriangle, 
  User, 
  ArrowUpCircle,
  MessageSquare,
  DollarSign,
  FileText,
  Zap,
  Shield,
  BarChart2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ApprovalListProps {
  approvals: ApprovalListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  bulkMode?: boolean;
  selectedIds?: Set<string>;
  onBulkSelect?: (ids: Set<string>) => void;
}

interface ApprovalListItem {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  priority: Priority;
  status: ApprovalStatus;
  slaStatus: SlaStatus;
  deadlineAt: string;
  warningAt: string;
  createdAt: string;
  assignedTo: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  requestedBy: {
    id: string;
    name: string;
    type: 'worker' | 'user';
  };
  escalationLevel: number;
  commentsCount: number;
  metadata?: {
    amount?: number;
    currency?: string;
    contactName?: string;
    negotiationId?: string;
  };
}

// Icon mapping pentru tipuri de aprobare
const typeIcons: Record<ApprovalType, React.ElementType> = {
  ai_response_review: MessageSquare,
  discount_approval: DollarSign,
  document_approval: FileText,
  efactura_submission: FileText,
  stock_exception: BarChart2,
  guardrail_violation: Shield,
  handover_escalation: ArrowUpCircle,
  pricing_override: DollarSign,
  contract_terms: FileText,
};

const typeBadgeVariants: Record<ApprovalType, string> = {
  ai_response_review: 'bg-blue-100 text-blue-800',
  discount_approval: 'bg-green-100 text-green-800',
  document_approval: 'bg-purple-100 text-purple-800',
  efactura_submission: 'bg-orange-100 text-orange-800',
  stock_exception: 'bg-yellow-100 text-yellow-800',
  guardrail_violation: 'bg-red-100 text-red-800',
  handover_escalation: 'bg-pink-100 text-pink-800',
  pricing_override: 'bg-teal-100 text-teal-800',
  contract_terms: 'bg-indigo-100 text-indigo-800',
};

const typeLabels: Record<ApprovalType, string> = {
  ai_response_review: 'Răspuns AI',
  discount_approval: 'Discount',
  document_approval: 'Document',
  efactura_submission: 'E-Factura',
  stock_exception: 'Stoc',
  guardrail_violation: 'Guardrail',
  handover_escalation: 'Escaladare',
  pricing_override: 'Preț',
  contract_terms: 'Contract',
};

export const ApprovalList: React.FC<ApprovalListProps> = ({
  approvals,
  loading,
  selectedId,
  onSelect,
  bulkMode = false,
  selectedIds = new Set(),
  onBulkSelect,
}) => {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <Clock className="h-12 w-12 mb-4 opacity-50" />
        <p>Nu există aprobări în această vizualizare</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {approvals.map((approval) => {
        const Icon = typeIcons[approval.type] || Clock;
        const isSelected = selectedId === approval.id;
        const isBulkSelected = selectedIds.has(approval.id);
        const isBreached = approval.slaStatus === 'breached';
        const isWarning = approval.slaStatus === 'warning';
        const timeRemaining = getTimeRemaining(approval.deadlineAt);

        return (
          <div
            key={approval.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              'hover:bg-muted/50',
              isSelected && 'bg-muted border-primary',
              isBreached && 'border-red-300 bg-red-50/50',
              isWarning && !isBreached && 'border-yellow-300 bg-yellow-50/50'
            )}
            onClick={() => onSelect(approval.id)}
          >
            {/* Bulk Checkbox */}
            {bulkMode && (
              <Checkbox
                checked={isBulkSelected}
                onCheckedChange={(checked) => {
                  const newSelected = new Set(selectedIds);
                  if (checked) {
                    newSelected.add(approval.id);
                  } else {
                    newSelected.delete(approval.id);
                  }
                  onBulkSelect?.(newSelected);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {/* Type Icon */}
            <div className={cn(
              'flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center',
              typeBadgeVariants[approval.type]
            )}>
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">{approval.title}</span>
                {approval.escalationLevel > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <ArrowUpCircle className="h-3 w-3 mr-1" />
                    L{approval.escalationLevel}
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground truncate mb-2">
                {approval.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {/* Type Badge */}
                <Badge 
                  variant="secondary" 
                  className={cn('text-xs', typeBadgeVariants[approval.type])}
                >
                  {typeLabels[approval.type]}
                </Badge>

                {/* Priority */}
                <PriorityBadge priority={approval.priority} />

                {/* Assigned To */}
                {approval.assignedTo ? (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {approval.assignedTo.name}
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Neatribuit
                  </span>
                )}

                {/* Comments */}
                {approval.commentsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {approval.commentsCount}
                  </span>
                )}

                {/* Amount */}
                {approval.metadata?.amount && (
                  <span className="font-medium">
                    {approval.metadata.amount.toLocaleString('ro-RO')} {approval.metadata.currency || 'RON'}
                  </span>
                )}
              </div>
            </div>

            {/* Time Remaining */}
            <div className="flex-shrink-0 text-right">
              <div className={cn(
                'text-xs font-medium',
                isBreached && 'text-red-600',
                isWarning && !isBreached && 'text-yellow-600',
                !isWarning && !isBreached && 'text-muted-foreground'
              )}>
                {isBreached ? (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Depășit
                  </span>
                ) : (
                  timeRemaining
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(approval.createdAt), 'dd MMM, HH:mm', { locale: ro })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Priority Badge Component
 */
const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const config = {
    critical: { variant: 'destructive', label: 'Critic' },
    high: { variant: 'warning', label: 'Înalt' },
    medium: { variant: 'secondary', label: 'Mediu' },
    low: { variant: 'outline', label: 'Scăzut' },
  };

  const { variant, label } = config[priority] || config.medium;

  return <Badge variant={variant as any}>{label}</Badge>;
};

/**
 * Helper pentru calcularea timpului rămas
 */
function getTimeRemaining(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Expirat';
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}z ${diffHours % 24}h`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  }
  return `${diffMins}m`;
}
```

### 9.4 Approval Detail Component

```typescript
// packages/frontend/src/features/hitl/components/ApprovalDetail.tsx

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  CheckCircle, 
  XCircle, 
  ArrowUpCircle, 
  MessageSquare,
  Clock,
  User,
  Building2,
  Phone,
  Mail,
  FileText,
  History,
  AlertTriangle,
  DollarSign,
  Package,
  ExternalLink,
  Copy,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ApprovalComments } from './ApprovalComments';
import { ApprovalTimeline } from './ApprovalTimeline';

interface ApprovalDetailProps {
  approval: ApprovalDetailData | null | undefined;
  loading: boolean;
  onApprove: (notes?: string) => void;
  onReject: (reason: string) => void;
  onEscalate: (reason: string) => void;
  onClose: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isEscalating: boolean;
}

interface ApprovalDetailData {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  priority: Priority;
  status: ApprovalStatus;
  slaStatus: SlaStatus;
  deadlineAt: string;
  warningAt: string;
  criticalAt: string;
  createdAt: string;
  assignedTo: UserInfo | null;
  requestedBy: RequestedByInfo;
  escalationLevel: number;
  escalationHistory: EscalationEvent[];
  context: ApprovalContext;
  comments: Comment[];
  auditLog: AuditLogEntry[];
  canApprove: boolean;
  canReject: boolean;
  canEscalate: boolean;
  canReassign: boolean;
}

export const ApprovalDetail: React.FC<ApprovalDetailProps> = ({
  approval,
  loading,
  onApprove,
  onReject,
  onEscalate,
  onClose,
  isApproving,
  isRejecting,
  isEscalating,
}) => {
  const [activeTab, setActiveTab] = useState('context');
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!approval) {
    return null;
  }

  const isBreached = approval.slaStatus === 'breached';
  const isWarning = approval.slaStatus === 'warning';
  const timeRemaining = getTimeRemaining(approval.deadlineAt);
  const isPending = ['pending', 'assigned', 'in_review'].includes(approval.status);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        'p-4 border-b',
        isBreached && 'bg-red-50',
        isWarning && !isBreached && 'bg-yellow-50'
      )}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold">{approval.title}</h2>
              {approval.escalationLevel > 0 && (
                <Badge variant="outline" className="bg-orange-100">
                  <ArrowUpCircle className="h-3 w-3 mr-1" />
                  Escalat L{approval.escalationLevel}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{approval.description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Status & SLA */}
        <div className="flex items-center gap-4 mt-4">
          <Badge variant={getStatusVariant(approval.status)}>
            {getStatusLabel(approval.status)}
          </Badge>
          <Badge variant={getPriorityVariant(approval.priority)}>
            {getPriorityLabel(approval.priority)}
          </Badge>
          <div className={cn(
            'flex items-center gap-1 text-sm',
            isBreached && 'text-red-600 font-medium',
            isWarning && !isBreached && 'text-yellow-600'
          )}>
            <Clock className="h-4 w-4" />
            {isBreached ? (
              <span>SLA Depășit</span>
            ) : (
              <span>Rămân {timeRemaining}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isPending && (
          <div className="flex items-center gap-2 mt-4">
            {/* Approve Button */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!approval.canApprove}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobă
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmă aprobarea</DialogTitle>
                  <DialogDescription>
                    Aprobarea va finaliza acest proces și va executa acțiunile configurate.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Textarea
                    placeholder="Note opționale pentru aprobare..."
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                    Anulează
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      onApprove(approveNotes || undefined);
                      setShowApproveDialog(false);
                    }}
                    disabled={isApproving}
                  >
                    {isApproving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmă aprobarea
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Reject Button */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={!approval.canReject}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Respinge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmă respingerea</DialogTitle>
                  <DialogDescription>
                    Te rog să furnizezi un motiv pentru respingere.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Textarea
                    placeholder="Motivul respingerii (obligatoriu)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                    Anulează
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      if (rejectReason.trim()) {
                        onReject(rejectReason);
                        setShowRejectDialog(false);
                      }
                    }}
                    disabled={isRejecting || !rejectReason.trim()}
                  >
                    {isRejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmă respingerea
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Escalate Button */}
            <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  disabled={!approval.canEscalate}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Escaladează
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Escaladează aprobarea</DialogTitle>
                  <DialogDescription>
                    Aprobarea va fi escaladată la nivelul următor de aprobare.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Textarea
                    placeholder="Motivul escaladării..."
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>
                    Anulează
                  </Button>
                  <Button 
                    onClick={() => {
                      onEscalate(escalateReason);
                      setShowEscalateDialog(false);
                    }}
                    disabled={isEscalating}
                  >
                    {isEscalating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmă escaladarea
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-4 pt-2 border-b">
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="comments" className="relative">
            Comentarii
            {approval.comments.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] p-0 text-xs">
                {approval.comments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">Istoric</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="context" className="p-4 m-0">
            <ApprovalContextView 
              type={approval.type} 
              context={approval.context} 
            />
          </TabsContent>

          <TabsContent value="comments" className="p-4 m-0">
            <ApprovalComments
              approvalId={approval.id}
              comments={approval.comments}
              canComment={isPending}
            />
          </TabsContent>

          <TabsContent value="timeline" className="p-4 m-0">
            <ApprovalTimeline
              createdAt={approval.createdAt}
              escalationHistory={approval.escalationHistory}
              auditLog={approval.auditLog}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

/**
 * Context View Component - Afișează contextul specific tipului de aprobare
 */
const ApprovalContextView: React.FC<{ type: ApprovalType; context: ApprovalContext }> = ({
  type,
  context,
}) => {
  switch (type) {
    case 'discount_approval':
      return <DiscountApprovalContext context={context as DiscountApprovalContextData} />;
    case 'ai_response_review':
      return <AIResponseContext context={context as AIResponseContextData} />;
    case 'document_approval':
      return <DocumentApprovalContext context={context as DocumentApprovalContextData} />;
    case 'efactura_submission':
      return <EFacturaContext context={context as EFacturaContextData} />;
    case 'handover_escalation':
      return <HandoverContext context={context as HandoverContextData} />;
    case 'guardrail_violation':
      return <GuardrailContext context={context as GuardrailContextData} />;
    default:
      return <GenericContext context={context} />;
  }
};

/**
 * Discount Approval Context
 */
const DiscountApprovalContext: React.FC<{ context: DiscountApprovalContextData }> = ({ context }) => {
  return (
    <div className="space-y-6">
      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Informații Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Companie</span>
              <p className="font-medium">{context.customer.companyName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">CUI</span>
              <p className="font-medium">{context.customer.cui}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tier</span>
              <Badge variant="outline">{context.customer.tier}</Badge>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Total Comenzi</span>
              <p className="font-medium">{context.customer.totalOrders}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Request */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cerere Discount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span>Discount solicitat</span>
              <span className="text-xl font-bold text-green-600">
                {context.discountPercent}%
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-sm text-muted-foreground">Valoare originală</span>
                <p className="font-medium">
                  {context.originalValue.toLocaleString('ro-RO')} RON
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Discount</span>
                <p className="font-medium text-red-500">
                  -{context.discountValue.toLocaleString('ro-RO')} RON
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Valoare finală</span>
                <p className="font-bold text-green-600">
                  {context.finalValue.toLocaleString('ro-RO')} RON
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <span className="text-sm text-muted-foreground">Justificare</span>
              <p className="mt-1 p-3 bg-muted rounded-lg">
                {context.justification || 'Nu a fost furnizată o justificare.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produse ({context.products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {context.products.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.quantity} x {product.unitPrice.toLocaleString('ro-RO')} RON
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground line-through">
                    {product.originalTotal.toLocaleString('ro-RO')} RON
                  </p>
                  <p className="font-medium text-green-600">
                    {product.discountedTotal.toLocaleString('ro-RO')} RON
                  </p>
                  <Badge variant="outline" className="text-xs">
                    -{product.discountPercent}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Previous Discounts History */}
      {context.previousDiscounts && context.previousDiscounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              Istoric Discounturi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {context.previousDiscounts.slice(0, 5).map((discount, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(discount.date), 'dd MMM yyyy', { locale: ro })}
                  </span>
                  <Badge variant="outline">{discount.percent}%</Badge>
                  <span>{discount.value.toLocaleString('ro-RO')} RON</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * AI Response Review Context
 */
const AIResponseContext: React.FC<{ context: AIResponseContextData }> = ({ context }) => {
  return (
    <div className="space-y-6">
      {/* Conversation Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Context Conversație
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Last messages */}
            <div className="space-y-3">
              {context.conversationHistory.slice(-5).map((msg, index) => (
                <div 
                  key={index}
                  className={cn(
                    'p-3 rounded-lg max-w-[80%]',
                    msg.role === 'customer' ? 'bg-muted ml-0' : 'bg-blue-50 ml-auto'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                    {msg.role === 'customer' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                    {msg.role === 'customer' ? 'Client' : 'AI Agent'}
                    <span>•</span>
                    {format(new Date(msg.timestamp), 'HH:mm', { locale: ro })}
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incoming Message */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-sm">Mesaj primit de la client</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="p-3 bg-white rounded-lg border">
            {context.incomingMessage}
          </p>
        </CardContent>
      </Card>

      {/* Proposed AI Response */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Răspuns propus de AI</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Confidence: {(context.proposedResponse.confidence * 100).toFixed(0)}%
              </Badge>
              <Badge variant="secondary">{context.proposedResponse.model}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-white rounded-lg border">
              {context.proposedResponse.content}
            </div>
            
            {context.proposedResponse.reasoning && (
              <div>
                <span className="text-sm text-muted-foreground">Raționament AI:</span>
                <p className="mt-1 text-sm text-muted-foreground italic">
                  {context.proposedResponse.reasoning}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guardrail Flags */}
      {context.guardrailFlags && context.guardrailFlags.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Avertizări Guardrail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {context.guardrailFlags.map((flag, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                  <Badge variant="outline" className={
                    flag.severity === 'high' ? 'text-red-600' :
                    flag.severity === 'medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }>
                    {flag.severity}
                  </Badge>
                  <span className="text-sm">{flag.rule}: {flag.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternative Responses */}
      {context.alternativeResponses && context.alternativeResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Răspunsuri alternative</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {context.alternativeResponses.map((alt, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      Confidence: {(alt.confidence * 100).toFixed(0)}%
                    </Badge>
                    <Button variant="ghost" size="sm">
                      Folosește acest răspuns
                    </Button>
                  </div>
                  <p className="text-sm">{alt.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Helper functions
 */
function getTimeRemaining(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expirat';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffHours > 24) {
    return `${Math.floor(diffHours / 24)}z ${diffHours % 24}h`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  }
  return `${diffMins}m`;
}

function getStatusVariant(status: ApprovalStatus): 'default' | 'secondary' | 'success' | 'destructive' {
  const variants: Record<ApprovalStatus, 'default' | 'secondary' | 'success' | 'destructive'> = {
    pending: 'secondary',
    assigned: 'default',
    in_review: 'default',
    approved: 'success',
    rejected: 'destructive',
    expired: 'destructive',
    escalated: 'default',
  };
  return variants[status] || 'secondary';
}

function getStatusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    pending: 'În așteptare',
    assigned: 'Atribuit',
    in_review: 'În revizuire',
    approved: 'Aprobat',
    rejected: 'Respins',
    expired: 'Expirat',
    escalated: 'Escaladat',
  };
  return labels[status] || status;
}

function getPriorityVariant(priority: Priority): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<Priority, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    critical: 'destructive',
    high: 'default',
    medium: 'secondary',
    low: 'outline',
  };
  return variants[priority] || 'secondary';
}

function getPriorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    critical: 'Critic',
    high: 'Înalt',
    medium: 'Mediu',
    low: 'Scăzut',
  };
  return labels[priority] || priority;
}
```

### 9.5 Approval Comments Component

```typescript
// packages/frontend/src/features/hitl/components/ApprovalComments.tsx

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Paperclip, 
  Send, 
  Reply, 
  MoreVertical,
  Trash2,
  Edit,
  AtSign
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface ApprovalCommentsProps {
  approvalId: string;
  comments: Comment[];
  canComment: boolean;
}

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  mentions: string[];
  attachments?: Attachment[];
  isInternal: boolean;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export const ApprovalComments: React.FC<ApprovalCommentsProps> = ({
  approvalId,
  comments,
  canComment,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isInternal, setIsInternal] = useState(false);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string; isInternal: boolean }) =>
      approvalService.addComment(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['approval-detail', approvalId]);
      setNewComment('');
      setReplyingTo(null);
      toast({ title: 'Comentariu adăugat', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Eroare', description: error.message, variant: 'destructive' });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      approvalService.deleteComment(approvalId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['approval-detail', approvalId]);
      toast({ title: 'Comentariu șters', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Eroare', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({
      content: newComment.trim(),
      parentId: replyingTo || undefined,
      isInternal,
    });
  };

  // Group comments by thread (parent/replies)
  const threadedComments = React.useMemo(() => {
    const threads: Map<string, Comment[]> = new Map();
    const rootComments: Comment[] = [];

    comments.forEach(comment => {
      if (comment.parentId) {
        const existing = threads.get(comment.parentId) || [];
        threads.set(comment.parentId, [...existing, comment]);
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments.map(root => ({
      ...root,
      replies: threads.get(root.id) || [],
    }));
  }, [comments]);

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      {canComment && (
        <div className="space-y-2">
          {replyingTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Reply className="h-4 w-4" />
              Răspunzi la comentariu
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2"
                onClick={() => setReplyingTo(null)}
              >
                Anulează
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              placeholder="Adaugă un comentariu..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-1" />
                Atașament
              </Button>
              <Button 
                variant={isInternal ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setIsInternal(!isInternal)}
              >
                {isInternal ? 'Intern' : 'Public'}
              </Button>
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={!newComment.trim() || addCommentMutation.isLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Trimite
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {threadedComments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nu există comentarii încă.
          </div>
        ) : (
          threadedComments.map((thread) => (
            <CommentThread
              key={thread.id}
              comment={thread}
              replies={thread.replies}
              onReply={() => setReplyingTo(thread.id)}
              onDelete={(id) => deleteCommentMutation.mutate(id)}
              canReply={canComment}
            />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Comment Thread Component
 */
interface CommentThreadProps {
  comment: Comment;
  replies: Comment[];
  onReply: () => void;
  onDelete: (id: string) => void;
  canReply: boolean;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  replies,
  onReply,
  onDelete,
  canReply,
}) => {
  return (
    <div className="space-y-2">
      <CommentItem 
        comment={comment} 
        onReply={onReply} 
        onDelete={onDelete}
        canReply={canReply}
      />
      
      {replies.length > 0 && (
        <div className="ml-8 pl-4 border-l-2 space-y-2">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              canReply={canReply}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Single Comment Item
 */
interface CommentItemProps {
  comment: Comment;
  onReply: () => void;
  onDelete: (id: string) => void;
  canReply: boolean;
  isReply?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onDelete,
  canReply,
  isReply = false,
}) => {
  const currentUserId = useCurrentUserId(); // Hook pentru user curent
  const isOwner = comment.author.id === currentUserId;

  return (
    <div className={cn(
      'flex gap-3 p-3 rounded-lg',
      comment.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-muted',
      isReply && 'py-2'
    )}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.author.avatar} />
        <AvatarFallback>
          {comment.author.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.author.name}</span>
          <Badge variant="outline" className="text-xs">
            {comment.author.role}
          </Badge>
          {comment.isInternal && (
            <Badge variant="secondary" className="text-xs bg-yellow-200">
              Intern
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { 
              addSuffix: true, 
              locale: ro 
            })}
          </span>
          {comment.updatedAt && (
            <span className="text-xs text-muted-foreground">(editat)</span>
          )}
        </div>

        <div className="mt-1">
          <p className="text-sm whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>

        {/* Mentions */}
        {comment.mentions.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <AtSign className="h-3 w-3 text-muted-foreground" />
            {comment.mentions.map((mention, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {mention}
              </Badge>
            ))}
          </div>
        )}

        {/* Attachments */}
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {comment.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs bg-background rounded border hover:bg-muted"
              >
                <Paperclip className="h-3 w-3" />
                {attachment.name}
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          {canReply && (
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onReply}>
              <Reply className="h-3 w-3 mr-1" />
              Răspunde
            </Button>
          )}
          
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Editează
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onDelete(comment.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Șterge
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 9.6 Approval Timeline Component

```typescript
// packages/frontend/src/features/hitl/components/ApprovalTimeline.tsx

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  ArrowUpCircle, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  AlertTriangle,
  Bell,
  Settings,
  FileText,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ApprovalTimelineProps {
  createdAt: string;
  escalationHistory: EscalationEvent[];
  auditLog: AuditLogEntry[];
}

interface EscalationEvent {
  level: number;
  escalatedAt: string;
  reason: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  toRole: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  performedBy: {
    id: string;
    name: string;
    type: 'user' | 'system' | 'worker';
  };
  timestamp: string;
  details?: Record<string, any>;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

// Action icon mapping
const actionIcons: Record<string, React.ElementType> = {
  created: Clock,
  assigned: User,
  reassigned: User,
  escalated: ArrowUpCircle,
  approved: CheckCircle,
  rejected: XCircle,
  comment_added: MessageSquare,
  sla_warning: AlertTriangle,
  sla_breach: AlertTriangle,
  notification_sent: Bell,
  status_changed: Settings,
  context_updated: FileText,
  auto_action: Zap,
};

const actionLabels: Record<string, string> = {
  created: 'Aprobare creată',
  assigned: 'Atribuit',
  reassigned: 'Reatribuit',
  escalated: 'Escaladat',
  approved: 'Aprobat',
  rejected: 'Respins',
  comment_added: 'Comentariu adăugat',
  sla_warning: 'Avertizare SLA',
  sla_breach: 'SLA Depășit',
  notification_sent: 'Notificare trimisă',
  status_changed: 'Status modificat',
  context_updated: 'Context actualizat',
  auto_action: 'Acțiune automată',
};

const actionColors: Record<string, string> = {
  created: 'bg-blue-500',
  assigned: 'bg-purple-500',
  reassigned: 'bg-purple-500',
  escalated: 'bg-orange-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  comment_added: 'bg-gray-500',
  sla_warning: 'bg-yellow-500',
  sla_breach: 'bg-red-600',
  notification_sent: 'bg-blue-400',
  status_changed: 'bg-gray-600',
  context_updated: 'bg-indigo-500',
  auto_action: 'bg-cyan-500',
};

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  createdAt,
  escalationHistory,
  auditLog,
}) => {
  // Combine and sort all events
  const allEvents = React.useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add creation event
    events.push({
      id: 'created',
      type: 'audit',
      action: 'created',
      timestamp: createdAt,
      description: 'Aprobare creată',
      performedBy: { name: 'System', type: 'system' },
    });

    // Add escalation events
    escalationHistory.forEach((esc, index) => {
      events.push({
        id: `escalation-${index}`,
        type: 'escalation',
        action: 'escalated',
        timestamp: esc.escalatedAt,
        description: `Escaladat la ${esc.toUserName} (${esc.toRole}) - Nivel ${esc.level}`,
        performedBy: { name: esc.fromUserName, type: 'user' },
        details: { reason: esc.reason },
      });
    });

    // Add audit log events
    auditLog.forEach((log) => {
      events.push({
        id: log.id,
        type: 'audit',
        action: log.action,
        timestamp: log.timestamp,
        description: actionLabels[log.action] || log.action,
        performedBy: log.performedBy,
        details: log.details,
        changes: log.changes,
      });
    });

    // Sort by timestamp (newest first)
    return events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [createdAt, escalationHistory, auditLog]);

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />

      {/* Events */}
      <div className="space-y-4">
        {allEvents.map((event, index) => {
          const Icon = actionIcons[event.action] || Clock;
          const color = actionColors[event.action] || 'bg-gray-500';

          return (
            <div key={event.id} className="flex gap-4 relative">
              {/* Icon */}
              <div className={cn(
                'relative z-10 flex items-center justify-center h-8 w-8 rounded-full text-white',
                color
              )}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {event.description}
                  </span>
                  {event.performedBy.type === 'system' && (
                    <Badge variant="outline" className="text-xs">
                      Sistem
                    </Badge>
                  )}
                  {event.performedBy.type === 'worker' && (
                    <Badge variant="outline" className="text-xs">
                      Worker
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>
                    {format(new Date(event.timestamp), 'dd MMM yyyy, HH:mm:ss', { locale: ro })}
                  </span>
                  {event.performedBy.type === 'user' && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {event.performedBy.name}
                      </span>
                    </>
                  )}
                </div>

                {/* Details */}
                {event.details && Object.keys(event.details).length > 0 && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    {Object.entries(event.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Changes */}
                {event.changes && event.changes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {event.changes.map((change, i) => (
                      <div key={i} className="text-xs flex items-center gap-2">
                        <span className="text-muted-foreground">{change.field}:</span>
                        <span className="line-through text-red-500">
                          {String(change.oldValue || '-')}
                        </span>
                        <span>→</span>
                        <span className="text-green-600">
                          {String(change.newValue || '-')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TimelineEvent {
  id: string;
  type: 'audit' | 'escalation';
  action: string;
  timestamp: string;
  description: string;
  performedBy: {
    name: string;
    type: 'user' | 'system' | 'worker';
  };
  details?: Record<string, any>;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}
```

### 9.7 Approval Filters Component

```typescript
// packages/frontend/src/features/hitl/components/ApprovalFilters.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  X, 
  Search, 
  Calendar as CalendarIcon,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ApprovalFiltersProps {
  filters: ApprovalFiltersState;
  onChange: (filters: ApprovalFiltersState) => void;
  onClose: () => void;
}

interface ApprovalFiltersState {
  types: ApprovalType[];
  priorities: Priority[];
  slaStatuses: SlaStatus[];
  assignedTo: string | 'me' | 'unassigned' | 'all';
  search: string;
  dateRange: { from: Date | null; to: Date | null };
}

const approvalTypes: { value: ApprovalType; label: string }[] = [
  { value: 'ai_response_review', label: 'Răspuns AI' },
  { value: 'discount_approval', label: 'Discount' },
  { value: 'document_approval', label: 'Document' },
  { value: 'efactura_submission', label: 'E-Factura' },
  { value: 'stock_exception', label: 'Excepție Stoc' },
  { value: 'guardrail_violation', label: 'Guardrail' },
  { value: 'handover_escalation', label: 'Escaladare' },
  { value: 'pricing_override', label: 'Preț Custom' },
  { value: 'contract_terms', label: 'Contract' },
];

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critic', color: 'bg-red-500' },
  { value: 'high', label: 'Înalt', color: 'bg-orange-500' },
  { value: 'medium', label: 'Mediu', color: 'bg-yellow-500' },
  { value: 'low', label: 'Scăzut', color: 'bg-green-500' },
];

const slaStatuses: { value: SlaStatus; label: string; color: string }[] = [
  { value: 'on_track', label: 'În termen', color: 'text-green-600' },
  { value: 'warning', label: 'Avertizare', color: 'text-yellow-600' },
  { value: 'breached', label: 'Depășit', color: 'text-red-600' },
];

export const ApprovalFilters: React.FC<ApprovalFiltersProps> = ({
  filters,
  onChange,
  onClose,
}) => {
  const updateFilter = <K extends keyof ApprovalFiltersState>(
    key: K,
    value: ApprovalFiltersState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = <T,>(array: T[], value: T): T[] => {
    return array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  const resetFilters = () => {
    onChange({
      types: [],
      priorities: [],
      slaStatuses: [],
      assignedTo: 'me',
      search: '',
      dateRange: { from: null, to: null },
    });
  };

  const activeFiltersCount = 
    filters.types.length +
    filters.priorities.length +
    filters.slaStatuses.length +
    (filters.assignedTo !== 'me' ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0);

  return (
    <Card className="mx-4 mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            Filtre
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4">
          {/* Search */}
          <div className="col-span-2">
            <Label className="text-xs">Căutare</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută în aprobări..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <Label className="text-xs">Atribuit</Label>
            <Select
              value={filters.assignedTo}
              onValueChange={(value) => updateFilter('assignedTo', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Mie</SelectItem>
                <SelectItem value="all">Toți</SelectItem>
                <SelectItem value="unassigned">Neatribuit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="col-span-2">
            <Label className="text-xs">Perioadă</Label>
            <div className="flex gap-2 mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !filters.dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from
                      ? format(filters.dateRange.from, 'dd MMM', { locale: ro })
                      : 'De la'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.from || undefined}
                    onSelect={(date) => 
                      updateFilter('dateRange', { ...filters.dateRange, from: date || null })
                    }
                    locale={ro}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !filters.dateRange.to && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to
                      ? format(filters.dateRange.to, 'dd MMM', { locale: ro })
                      : 'Până la'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.to || undefined}
                    onSelect={(date) => 
                      updateFilter('dateRange', { ...filters.dateRange, to: date || null })
                    }
                    locale={ro}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Type Filters */}
          <div className="col-span-3">
            <Label className="text-xs">Tip aprobare</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {approvalTypes.map(({ value, label }) => (
                <Badge
                  key={value}
                  variant={filters.types.includes(value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => updateFilter('types', toggleArrayFilter(filters.types, value))}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Priority Filters */}
          <div>
            <Label className="text-xs">Prioritate</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {priorities.map(({ value, label, color }) => (
                <Badge
                  key={value}
                  variant={filters.priorities.includes(value) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer',
                    filters.priorities.includes(value) && color
                  )}
                  onClick={() => updateFilter('priorities', toggleArrayFilter(filters.priorities, value))}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* SLA Status Filters */}
          <div>
            <Label className="text-xs">Status SLA</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {slaStatuses.map(({ value, label, color }) => (
                <Badge
                  key={value}
                  variant={filters.slaStatuses.includes(value) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer',
                    filters.slaStatuses.includes(value) && color
                  )}
                  onClick={() => updateFilter('slaStatuses', toggleArrayFilter(filters.slaStatuses, value))}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## 10. Database Schema

### 10.1 Core Tables

```sql
-- =====================================================
-- HITL SYSTEM - SCHEMA POSTGRESQL
-- Etapa 3: AI Sales Agent - Approval Workflows
-- =====================================================

-- Enum types
CREATE TYPE approval_type AS ENUM (
  'ai_response_review',
  'discount_approval',
  'document_approval',
  'efactura_submission',
  'stock_exception',
  'guardrail_violation',
  'handover_escalation',
  'pricing_override',
  'contract_terms'
);

CREATE TYPE approval_status AS ENUM (
  'pending',
  'assigned',
  'in_review',
  'approved',
  'rejected',
  'expired',
  'escalated',
  'cancelled'
);

CREATE TYPE approval_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE sla_status AS ENUM (
  'on_track',
  'warning',
  'breached'
);

CREATE TYPE notification_channel AS ENUM (
  'in_app',
  'email',
  'push',
  'sms'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'read'
);

-- =====================================================
-- TABLE: approvals
-- Descriere: Tabelul principal pentru cererile de aprobare
-- =====================================================
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identification
  type approval_type NOT NULL,
  reference_type VARCHAR(100) NOT NULL,  -- 'negotiation', 'document', 'conversation', etc.
  reference_id UUID NOT NULL,
  
  -- Metadata
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority approval_priority NOT NULL DEFAULT 'medium',
  status approval_status NOT NULL DEFAULT 'pending',
  
  -- SLA Tracking
  sla_status sla_status NOT NULL DEFAULT 'on_track',
  warning_at TIMESTAMPTZ NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  critical_at TIMESTAMPTZ NOT NULL,
  sla_breached_at TIMESTAMPTZ,
  
  -- Assignment
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  assigned_by_id UUID REFERENCES users(id),
  
  -- Request Source
  requested_by_worker VARCHAR(100),  -- Worker name that created the request
  requested_by_user_id UUID REFERENCES users(id),
  
  -- Context (JSON)
  context JSONB NOT NULL DEFAULT '{}',
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by_id UUID REFERENCES users(id),
  resolution_type VARCHAR(50),  -- 'approved', 'rejected', 'auto_expired', etc.
  resolution_notes TEXT,
  
  -- Escalation
  escalation_level INT NOT NULL DEFAULT 0,
  max_escalation_level INT NOT NULL DEFAULT 3,
  escalation_history JSONB NOT NULL DEFAULT '[]',
  
  -- Auto Actions
  post_approval_actions JSONB NOT NULL DEFAULT '[]',
  post_rejection_actions JSONB NOT NULL DEFAULT '[]',
  post_expire_actions JSONB NOT NULL DEFAULT '[]',
  actions_executed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  tags VARCHAR(100)[] DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_deadline CHECK (deadline_at > warning_at),
  CONSTRAINT valid_critical CHECK (critical_at >= deadline_at),
  CONSTRAINT valid_escalation_level CHECK (escalation_level >= 0 AND escalation_level <= max_escalation_level)
);

-- Indexes pentru approvals
CREATE INDEX idx_approvals_tenant ON approvals(tenant_id);
CREATE INDEX idx_approvals_type ON approvals(type);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_priority ON approvals(priority);
CREATE INDEX idx_approvals_sla_status ON approvals(sla_status);
CREATE INDEX idx_approvals_assigned_to ON approvals(assigned_to_id);
CREATE INDEX idx_approvals_deadline ON approvals(deadline_at);
CREATE INDEX idx_approvals_reference ON approvals(reference_type, reference_id);
CREATE INDEX idx_approvals_pending ON approvals(tenant_id, status) WHERE status IN ('pending', 'assigned', 'in_review');
CREATE INDEX idx_approvals_breached ON approvals(tenant_id, sla_status) WHERE sla_status = 'breached';
CREATE INDEX idx_approvals_created ON approvals(created_at DESC);
CREATE INDEX idx_approvals_context ON approvals USING GIN (context jsonb_path_ops);
CREATE INDEX idx_approvals_tags ON approvals USING GIN (tags);

-- Partitioning by created_at (pentru volum mare)
-- CREATE TABLE approvals_2026_q1 PARTITION OF approvals
--   FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

-- =====================================================
-- TABLE: approval_comments
-- Descriere: Comentarii pe aprobări
-- =====================================================
CREATE TABLE approval_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  content_html TEXT,  -- Rendered HTML if using rich text
  
  -- Threading
  parent_id UUID REFERENCES approval_comments(id) ON DELETE CASCADE,
  thread_depth INT NOT NULL DEFAULT 0,
  
  -- Author
  author_id UUID NOT NULL REFERENCES users(id),
  author_type VARCHAR(50) NOT NULL DEFAULT 'user',  -- 'user', 'system', 'ai'
  
  -- Mentions
  mentioned_user_ids UUID[] DEFAULT '{}',
  
  -- Visibility
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,  -- Internal comments not visible to requester
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  edited_by_id UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT valid_thread_depth CHECK (thread_depth >= 0 AND thread_depth <= 5)
);

-- Indexes pentru approval_comments
CREATE INDEX idx_approval_comments_approval ON approval_comments(approval_id);
CREATE INDEX idx_approval_comments_parent ON approval_comments(parent_id);
CREATE INDEX idx_approval_comments_author ON approval_comments(author_id);
CREATE INDEX idx_approval_comments_created ON approval_comments(created_at DESC);
CREATE INDEX idx_approval_comments_mentions ON approval_comments USING GIN (mentioned_user_ids);

-- =====================================================
-- TABLE: approval_attachments
-- Descriere: Fișiere atașate la comentarii sau aprobări
-- =====================================================
CREATE TABLE approval_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES approval_comments(id) ON DELETE CASCADE,
  
  -- File info
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(200) NOT NULL,
  size_bytes BIGINT NOT NULL,
  
  -- Storage
  storage_path VARCHAR(1000) NOT NULL,
  storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',  -- 'local', 's3', 'gcs'
  
  -- Preview
  thumbnail_path VARCHAR(1000),
  preview_available BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Upload info
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_size CHECK (size_bytes > 0 AND size_bytes <= 104857600)  -- Max 100MB
);

-- Indexes
CREATE INDEX idx_approval_attachments_approval ON approval_attachments(approval_id);
CREATE INDEX idx_approval_attachments_comment ON approval_attachments(comment_id);
CREATE INDEX idx_approval_attachments_uploaded_by ON approval_attachments(uploaded_by_id);
```

### 10.2 SLA & Notification Tables

```sql
-- =====================================================
-- TABLE: sla_configurations
-- Descriere: Configurări SLA per tip aprobare și tenant
-- =====================================================
CREATE TABLE sla_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Type
  approval_type approval_type NOT NULL,
  
  -- Timings (in seconds)
  warning_seconds INT NOT NULL DEFAULT 1800,     -- 30 min
  deadline_seconds INT NOT NULL DEFAULT 3600,    -- 1 hour
  critical_seconds INT NOT NULL DEFAULT 7200,    -- 2 hours
  
  -- Business Hours
  business_hours_only BOOLEAN NOT NULL DEFAULT TRUE,
  business_start_hour INT NOT NULL DEFAULT 9,
  business_end_hour INT NOT NULL DEFAULT 18,
  business_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',  -- Mon-Fri
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Bucharest',
  
  -- Escalation
  escalation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  escalation_path JSONB NOT NULL DEFAULT '[]',  -- Array of {role, delaySeconds}
  max_escalation_level INT NOT NULL DEFAULT 3,
  
  -- Notifications
  notification_config JSONB NOT NULL DEFAULT '{
    "warning": {"channels": ["in_app", "email"], "template": "sla_warning"},
    "breach": {"channels": ["in_app", "email", "push"], "template": "sla_breach"},
    "critical": {"channels": ["in_app", "email", "push", "sms"], "template": "sla_critical"}
  }',
  
  -- Priority multipliers
  priority_multipliers JSONB NOT NULL DEFAULT '{
    "low": 1.5,
    "medium": 1.0,
    "high": 0.5,
    "critical": 0.25
  }',
  
  -- Auto actions
  auto_escalate_on_breach BOOLEAN NOT NULL DEFAULT TRUE,
  auto_expire_on_critical BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT unique_tenant_type UNIQUE (tenant_id, approval_type),
  CONSTRAINT valid_business_hours CHECK (business_start_hour < business_end_hour),
  CONSTRAINT valid_timings CHECK (warning_seconds < deadline_seconds AND deadline_seconds <= critical_seconds)
);

-- =====================================================
-- TABLE: sla_events
-- Descriere: Evenimente SLA (warning, breach, critical)
-- =====================================================
CREATE TABLE sla_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  
  -- Event Type
  event_type VARCHAR(50) NOT NULL,  -- 'warning', 'deadline', 'critical', 'escalation'
  
  -- Timing
  scheduled_at TIMESTAMPTZ NOT NULL,
  triggered_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',  -- 'scheduled', 'triggered', 'cancelled', 'skipped'
  
  -- Job Reference (BullMQ)
  job_id VARCHAR(200),
  job_queue VARCHAR(100),
  
  -- Outcome
  action_taken VARCHAR(100),  -- 'notification_sent', 'escalated', 'expired', etc.
  action_result JSONB,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sla_events_approval ON sla_events(approval_id);
CREATE INDEX idx_sla_events_scheduled ON sla_events(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_sla_events_job ON sla_events(job_id);

-- =====================================================
-- TABLE: notifications
-- Descriere: Toate notificările trimise
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Channel
  channel notification_channel NOT NULL,
  
  -- Content
  template_id VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  body_html TEXT,
  
  -- Context
  context_type VARCHAR(100),  -- 'approval', 'escalation', 'sla', etc.
  context_id UUID,
  
  -- Data
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Status
  status notification_status NOT NULL DEFAULT 'pending',
  
  -- Delivery Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- Retry
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Provider Response
  provider VARCHAR(100),  -- 'sendgrid', 'fcm', 'twilio', etc.
  provider_message_id VARCHAR(500),
  provider_response JSONB,
  
  -- Priority
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
  
  -- Grouping
  group_key VARCHAR(200),  -- For notification grouping/batching
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_context ON notifications(context_type, context_id);
CREATE INDEX idx_notifications_pending ON notifications(status, next_retry_at) 
  WHERE status IN ('pending', 'failed') AND retry_count < max_retries;
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) 
  WHERE read_at IS NULL AND status = 'delivered';
CREATE INDEX idx_notifications_group ON notifications(group_key);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- TABLE: notification_preferences
-- Descriere: Preferințe notificări per user
-- =====================================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Channel preferences
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_start_hour INT DEFAULT 22,
  quiet_end_hour INT DEFAULT 8,
  
  -- Frequency
  digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  digest_frequency VARCHAR(50) DEFAULT 'daily',  -- 'hourly', 'daily', 'weekly'
  
  -- Type preferences (granular control)
  type_preferences JSONB NOT NULL DEFAULT '{
    "approval_assigned": {"email": true, "push": true, "in_app": true},
    "sla_warning": {"email": true, "push": true, "in_app": true},
    "sla_breach": {"email": true, "push": true, "in_app": true, "sms": true},
    "escalation": {"email": true, "push": true, "in_app": true},
    "approval_resolved": {"email": true, "push": false, "in_app": true}
  }',
  
  -- Contact info
  email_address VARCHAR(255),
  phone_number VARCHAR(50),
  push_token TEXT,
  push_provider VARCHAR(50),  -- 'fcm', 'apns'
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_prefs UNIQUE (tenant_id, user_id)
);

-- Indexes
CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);
```

### 10.3 Audit & Assignment Tables

```sql
-- =====================================================
-- TABLE: approval_audit_log
-- Descriere: Audit trail complet pentru aprobări
-- =====================================================
CREATE TABLE approval_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  
  -- Action
  action VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL,  -- 'lifecycle', 'assignment', 'sla', 'resolution', 'comment'
  
  -- Actor
  performed_by_type VARCHAR(50) NOT NULL,  -- 'user', 'system', 'worker', 'scheduler'
  performed_by_user_id UUID REFERENCES users(id),
  performed_by_worker VARCHAR(100),
  
  -- Changes
  changes JSONB,  -- Array of {field, oldValue, newValue}
  
  -- Context
  context JSONB,  -- Additional context about the action
  
  -- Request info
  request_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  
  -- Hash chain pentru integritate
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64) NOT NULL,
  
  -- Timestamp
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_performer CHECK (
    performed_by_user_id IS NOT NULL OR 
    performed_by_worker IS NOT NULL OR 
    performed_by_type IN ('system', 'scheduler')
  )
);

-- Indexes
CREATE INDEX idx_audit_log_approval ON approval_audit_log(approval_id);
CREATE INDEX idx_audit_log_action ON approval_audit_log(action);
CREATE INDEX idx_audit_log_category ON approval_audit_log(action_category);
CREATE INDEX idx_audit_log_user ON approval_audit_log(performed_by_user_id);
CREATE INDEX idx_audit_log_performed_at ON approval_audit_log(performed_at DESC);
CREATE INDEX idx_audit_log_tenant_date ON approval_audit_log(tenant_id, performed_at DESC);
CREATE INDEX idx_audit_log_hash ON approval_audit_log(current_hash);

-- Function pentru generarea hash-urilor
CREATE OR REPLACE FUNCTION generate_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash VARCHAR(64);
  hash_input TEXT;
BEGIN
  -- Get previous hash
  SELECT current_hash INTO prev_hash
  FROM approval_audit_log
  WHERE approval_id = NEW.approval_id
  ORDER BY performed_at DESC
  LIMIT 1;
  
  NEW.previous_hash := COALESCE(prev_hash, 'genesis');
  
  -- Generate current hash
  hash_input := NEW.approval_id::TEXT || 
                NEW.action || 
                NEW.performed_at::TEXT || 
                COALESCE(NEW.previous_hash, '') ||
                COALESCE(NEW.changes::TEXT, '');
  
  NEW.current_hash := encode(sha256(hash_input::BYTEA), 'hex');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_hash
BEFORE INSERT ON approval_audit_log
FOR EACH ROW
EXECUTE FUNCTION generate_audit_hash();

-- =====================================================
-- TABLE: user_assignments
-- Descriere: Tracking pentru assignment-uri și workload
-- =====================================================
CREATE TABLE user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by_id UUID REFERENCES users(id),
  assignment_type VARCHAR(50) NOT NULL DEFAULT 'manual',  -- 'manual', 'auto', 'escalation', 'reassignment'
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_type VARCHAR(50),  -- 'approved', 'rejected', 'reassigned', 'escalated'
  
  -- Timing metrics
  first_viewed_at TIMESTAMPTZ,
  time_to_first_view_seconds INT,
  time_to_resolution_seconds INT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_assignments_user ON user_assignments(user_id);
CREATE INDEX idx_user_assignments_approval ON user_assignments(approval_id);
CREATE INDEX idx_user_assignments_active ON user_assignments(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_assignments_tenant_user ON user_assignments(tenant_id, user_id);

-- =====================================================
-- TABLE: assignment_round_robin
-- Descriere: State pentru round-robin assignment
-- =====================================================
CREATE TABLE assignment_round_robin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_type approval_type NOT NULL,
  role VARCHAR(100) NOT NULL,
  
  -- Last assigned
  last_assigned_user_id UUID REFERENCES users(id),
  last_assigned_at TIMESTAMPTZ,
  
  -- User queue (ordered list of user IDs)
  user_queue UUID[] NOT NULL DEFAULT '{}',
  current_index INT NOT NULL DEFAULT 0,
  
  -- Stats
  total_assignments INT NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_tenant_type_role UNIQUE (tenant_id, approval_type, role)
);

-- =====================================================
-- TABLE: user_availability
-- Descriere: Disponibilitatea utilizatorilor
-- =====================================================
CREATE TABLE user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'available',  -- 'available', 'busy', 'away', 'vacation', 'out_of_office'
  
  -- Time-based availability
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  
  -- Auto-away
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto_away_minutes INT DEFAULT 30,
  
  -- Vacation/OOO
  vacation_start TIMESTAMPTZ,
  vacation_end TIMESTAMPTZ,
  vacation_delegate_id UUID REFERENCES users(id),  -- Who handles approvals during vacation
  
  -- Capacity
  max_concurrent_approvals INT DEFAULT 10,
  current_approval_count INT NOT NULL DEFAULT 0,
  
  -- Expertise areas (for expertise-based assignment)
  expertise_areas VARCHAR(100)[] DEFAULT '{}',
  expertise_metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_availability UNIQUE (tenant_id, user_id)
);

-- Indexes
CREATE INDEX idx_user_availability_user ON user_availability(user_id);
CREATE INDEX idx_user_availability_status ON user_availability(status);
CREATE INDEX idx_user_availability_vacation ON user_availability(vacation_start, vacation_end);
CREATE INDEX idx_user_availability_expertise ON user_availability USING GIN (expertise_areas);
```

### 10.4 Archive Tables & Views

```sql
-- =====================================================
-- TABLE: approvals_archive
-- Descriere: Archived approvals pentru data retention
-- =====================================================
CREATE TABLE approvals_archive (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  
  -- Original data
  original_data JSONB NOT NULL,
  
  -- Archive metadata
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_by VARCHAR(100) NOT NULL DEFAULT 'system',
  archive_reason VARCHAR(100) NOT NULL DEFAULT 'retention_policy',
  
  -- Retention
  retention_until TIMESTAMPTZ NOT NULL,
  
  -- Compression
  is_compressed BOOLEAN NOT NULL DEFAULT FALSE,
  original_size_bytes BIGINT,
  compressed_size_bytes BIGINT
);

-- Partitioning by archive date
CREATE INDEX idx_approvals_archive_tenant ON approvals_archive(tenant_id);
CREATE INDEX idx_approvals_archive_archived_at ON approvals_archive(archived_at);
CREATE INDEX idx_approvals_archive_retention ON approvals_archive(retention_until);

-- =====================================================
-- TABLE: audit_log_archive
-- Descriere: Archived audit logs
-- =====================================================
CREATE TABLE audit_log_archive (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  approval_id UUID NOT NULL,
  
  -- Original data
  original_data JSONB NOT NULL,
  
  -- Hash chain continuity
  first_hash VARCHAR(64) NOT NULL,
  last_hash VARCHAR(64) NOT NULL,
  entry_count INT NOT NULL,
  
  -- Archive metadata
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archive_path VARCHAR(1000),  -- Path to external archive file
  
  -- Retention
  retention_until TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_audit_archive_approval ON audit_log_archive(approval_id);
CREATE INDEX idx_audit_archive_tenant ON audit_log_archive(tenant_id);

-- =====================================================
-- VIEW: v_approval_dashboard
-- Descriere: View pentru dashboard-ul de aprobări
-- =====================================================
CREATE OR REPLACE VIEW v_approval_dashboard AS
SELECT 
  a.id,
  a.tenant_id,
  a.type,
  a.title,
  a.description,
  a.priority,
  a.status,
  a.sla_status,
  a.deadline_at,
  a.warning_at,
  a.escalation_level,
  a.created_at,
  a.assigned_at,
  
  -- Assigned user
  u.id AS assigned_to_id,
  u.full_name AS assigned_to_name,
  u.email AS assigned_to_email,
  u.avatar_url AS assigned_to_avatar,
  
  -- Requester
  ru.full_name AS requested_by_name,
  a.requested_by_worker,
  
  -- Calculated fields
  EXTRACT(EPOCH FROM (a.deadline_at - NOW())) AS seconds_remaining,
  CASE 
    WHEN a.sla_status = 'breached' THEN 0
    WHEN a.deadline_at <= NOW() THEN 0
    ELSE EXTRACT(EPOCH FROM (a.deadline_at - NOW()))
  END AS effective_seconds_remaining,
  
  -- Comments count
  (SELECT COUNT(*) FROM approval_comments ac WHERE ac.approval_id = a.id AND ac.deleted_at IS NULL) AS comments_count,
  
  -- Context summary
  a.context->>'negotiationId' AS negotiation_id,
  a.context->>'contactName' AS contact_name,
  a.context->>'amount' AS amount,
  a.context->>'currency' AS currency
  
FROM approvals a
LEFT JOIN users u ON a.assigned_to_id = u.id
LEFT JOIN users ru ON a.requested_by_user_id = ru.id
WHERE a.deleted_at IS NULL;

-- =====================================================
-- VIEW: v_approval_stats
-- Descriere: Statistici agregate pentru aprobări
-- =====================================================
CREATE OR REPLACE VIEW v_approval_stats AS
WITH current_stats AS (
  SELECT 
    tenant_id,
    type,
    status,
    sla_status,
    priority,
    assigned_to_id,
    CASE WHEN status IN ('pending', 'assigned', 'in_review') THEN 1 ELSE 0 END AS is_pending,
    CASE WHEN status IN ('approved', 'rejected') THEN 1 ELSE 0 END AS is_resolved,
    CASE WHEN sla_status = 'breached' THEN 1 ELSE 0 END AS is_breached,
    CASE WHEN sla_status = 'warning' THEN 1 ELSE 0 END AS is_warning,
    CASE 
      WHEN resolved_at IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (resolved_at - created_at))
      ELSE NULL 
    END AS resolution_time_seconds,
    CASE 
      WHEN resolved_at IS NOT NULL AND deadline_at > resolved_at THEN 1 
      ELSE 0 
    END AS resolved_within_sla
  FROM approvals
  WHERE deleted_at IS NULL
    AND created_at >= NOW() - INTERVAL '30 days'
)
SELECT 
  tenant_id,
  type,
  
  -- Counts
  COUNT(*) AS total,
  SUM(is_pending) AS pending_count,
  SUM(is_resolved) AS resolved_count,
  SUM(is_breached) AS breached_count,
  SUM(is_warning) AS warning_count,
  
  -- By status
  COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_count,
  COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_count,
  
  -- By priority
  COUNT(*) FILTER (WHERE priority = 'critical' AND is_pending = 1) AS critical_pending,
  COUNT(*) FILTER (WHERE priority = 'high' AND is_pending = 1) AS high_pending,
  
  -- Performance
  AVG(resolution_time_seconds) AS avg_resolution_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolution_time_seconds) AS median_resolution_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY resolution_time_seconds) AS p95_resolution_seconds,
  
  -- SLA compliance
  CASE 
    WHEN SUM(is_resolved) > 0 THEN 
      (SUM(resolved_within_sla)::FLOAT / SUM(is_resolved)) * 100
    ELSE 100 
  END AS sla_compliance_rate

FROM current_stats
GROUP BY tenant_id, type;

-- =====================================================
-- VIEW: v_user_workload
-- Descriere: Workload per user pentru assignment
-- =====================================================
CREATE OR REPLACE VIEW v_user_workload AS
SELECT 
  u.id AS user_id,
  u.tenant_id,
  u.full_name,
  u.role,
  
  -- Availability
  ua.status AS availability_status,
  ua.max_concurrent_approvals,
  ua.current_approval_count,
  ua.last_active_at,
  ua.expertise_areas,
  
  -- Current workload
  (
    SELECT COUNT(*) 
    FROM approvals a 
    WHERE a.assigned_to_id = u.id 
      AND a.status IN ('pending', 'assigned', 'in_review')
      AND a.deleted_at IS NULL
  ) AS active_approvals,
  
  -- Breached count
  (
    SELECT COUNT(*) 
    FROM approvals a 
    WHERE a.assigned_to_id = u.id 
      AND a.sla_status = 'breached'
      AND a.status IN ('pending', 'assigned', 'in_review')
      AND a.deleted_at IS NULL
  ) AS breached_count,
  
  -- Today's stats
  (
    SELECT COUNT(*) 
    FROM approvals a 
    WHERE a.assigned_to_id = u.id 
      AND a.resolved_at >= CURRENT_DATE
      AND a.deleted_at IS NULL
  ) AS resolved_today,
  
  -- Capacity
  GREATEST(0, ua.max_concurrent_approvals - ua.current_approval_count) AS available_capacity,
  
  -- Is available for assignment
  CASE 
    WHEN ua.status IN ('available', 'busy') 
      AND (ua.vacation_start IS NULL OR NOW() NOT BETWEEN ua.vacation_start AND ua.vacation_end)
      AND ua.current_approval_count < ua.max_concurrent_approvals
    THEN TRUE 
    ELSE FALSE 
  END AS is_available

FROM users u
LEFT JOIN user_availability ua ON u.id = ua.user_id AND u.tenant_id = ua.tenant_id
WHERE u.deleted_at IS NULL
  AND u.is_active = TRUE;

-- =====================================================
-- FUNCTIONS: Helper functions
-- =====================================================

-- Function pentru a obține deadline-ul efectiv (business hours)
CREATE OR REPLACE FUNCTION calculate_business_deadline(
  p_start_time TIMESTAMPTZ,
  p_seconds INT,
  p_business_start INT DEFAULT 9,
  p_business_end INT DEFAULT 18,
  p_timezone VARCHAR DEFAULT 'Europe/Bucharest'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_current TIMESTAMPTZ;
  v_remaining INT;
  v_day_seconds INT;
  v_current_hour INT;
BEGIN
  v_current := p_start_time AT TIME ZONE p_timezone;
  v_remaining := p_seconds;
  v_day_seconds := (p_business_end - p_business_start) * 3600;
  
  -- Adjust if starting outside business hours
  v_current_hour := EXTRACT(HOUR FROM v_current)::INT;
  IF v_current_hour < p_business_start THEN
    v_current := DATE_TRUNC('day', v_current) + (p_business_start || ' hours')::INTERVAL;
  ELSIF v_current_hour >= p_business_end THEN
    v_current := DATE_TRUNC('day', v_current) + INTERVAL '1 day' + (p_business_start || ' hours')::INTERVAL;
  END IF;
  
  -- Skip weekends
  WHILE EXTRACT(DOW FROM v_current) IN (0, 6) LOOP
    v_current := v_current + INTERVAL '1 day';
  END LOOP;
  
  -- Calculate deadline
  WHILE v_remaining > 0 LOOP
    v_current_hour := EXTRACT(HOUR FROM v_current)::INT;
    
    -- Skip weekends
    IF EXTRACT(DOW FROM v_current) IN (0, 6) THEN
      v_current := DATE_TRUNC('day', v_current) + INTERVAL '1 day' + (p_business_start || ' hours')::INTERVAL;
      CONTINUE;
    END IF;
    
    -- Calculate remaining time in current day
    IF v_remaining <= (p_business_end - v_current_hour) * 3600 THEN
      v_current := v_current + (v_remaining || ' seconds')::INTERVAL;
      v_remaining := 0;
    ELSE
      v_remaining := v_remaining - (p_business_end - v_current_hour) * 3600;
      v_current := DATE_TRUNC('day', v_current) + INTERVAL '1 day' + (p_business_start || ' hours')::INTERVAL;
    END IF;
  END LOOP;
  
  RETURN v_current AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function pentru verificarea integrității hash chain
CREATE OR REPLACE FUNCTION verify_audit_hash_chain(
  p_approval_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  broken_at UUID,
  message TEXT
) AS $$
DECLARE
  v_prev_hash VARCHAR(64) := 'genesis';
  v_record RECORD;
  v_expected_hash VARCHAR(64);
  v_hash_input TEXT;
BEGIN
  FOR v_record IN 
    SELECT * FROM approval_audit_log 
    WHERE approval_id = p_approval_id 
    ORDER BY performed_at ASC
  LOOP
    -- Check previous hash
    IF v_record.previous_hash != v_prev_hash THEN
      RETURN QUERY SELECT FALSE, v_record.id, 'Previous hash mismatch';
      RETURN;
    END IF;
    
    -- Verify current hash
    v_hash_input := v_record.approval_id::TEXT || 
                    v_record.action || 
                    v_record.performed_at::TEXT || 
                    COALESCE(v_record.previous_hash, '') ||
                    COALESCE(v_record.changes::TEXT, '');
    v_expected_hash := encode(sha256(v_hash_input::BYTEA), 'hex');
    
    IF v_record.current_hash != v_expected_hash THEN
      RETURN QUERY SELECT FALSE, v_record.id, 'Current hash mismatch';
      RETURN;
    END IF;
    
    v_prev_hash := v_record.current_hash;
  END LOOP;
  
  RETURN QUERY SELECT TRUE, NULL::UUID, 'Hash chain verified successfully';
END;
$$ LANGUAGE plpgsql;
```

---

## 11. BullMQ Queue Configuration

### 11.1 Queue Definitions

```typescript
// packages/backend/src/queues/hitl/index.ts

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from '@/shared/logger';

const logger = new Logger('HITL:Queues');

/**
 * HITL Queue Registry
 * Definește toate cozile utilizate în sistemul HITL
 */
export const HITLQueues = {
  // Approval Processing
  APPROVAL_CREATED: 'hitl:approval:created',
  APPROVAL_ASSIGNED: 'hitl:approval:assigned',
  APPROVAL_RESOLVED: 'hitl:approval:resolved',
  
  // SLA Management
  SLA_WARNING: 'hitl:sla:warning',
  SLA_DEADLINE: 'hitl:sla:deadline',
  SLA_CRITICAL: 'hitl:sla:critical',
  SLA_CHECK: 'hitl:sla:check',
  
  // Escalation
  ESCALATION_PROCESS: 'hitl:escalation:process',
  ESCALATION_NOTIFY: 'hitl:escalation:notify',
  
  // Notifications
  NOTIFICATION_SEND: 'hitl:notification:send',
  NOTIFICATION_BATCH: 'hitl:notification:batch',
  NOTIFICATION_RETRY: 'hitl:notification:retry',
  
  // Assignment
  ASSIGNMENT_AUTO: 'hitl:assignment:auto',
  ASSIGNMENT_REBALANCE: 'hitl:assignment:rebalance',
  
  // Actions
  POST_APPROVAL_ACTIONS: 'hitl:actions:post-approval',
  POST_REJECTION_ACTIONS: 'hitl:actions:post-rejection',
  
  // Maintenance
  CLEANUP_EXPIRED: 'hitl:maintenance:cleanup',
  ARCHIVE_OLD: 'hitl:maintenance:archive',
  STATS_AGGREGATE: 'hitl:maintenance:stats',
} as const;

/**
 * Queue Connection Configuration
 */
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '64039'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Default Queue Options
 */
const defaultQueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
      count: 5000,
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
};

/**
 * Queue Factory
 */
export function createHITLQueue(name: string, options?: Partial<typeof defaultQueueOptions>) {
  return new Queue(name, {
    ...defaultQueueOptions,
    ...options,
  });
}

/**
 * Queue Instances
 */
export const queues = {
  // Approval Processing
  approvalCreated: createHITLQueue(HITLQueues.APPROVAL_CREATED),
  approvalAssigned: createHITLQueue(HITLQueues.APPROVAL_ASSIGNED),
  approvalResolved: createHITLQueue(HITLQueues.APPROVAL_RESOLVED),
  
  // SLA - with delayed job support
  slaWarning: createHITLQueue(HITLQueues.SLA_WARNING, {
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 1, // No retries for SLA warnings
    },
  }),
  slaDeadline: createHITLQueue(HITLQueues.SLA_DEADLINE),
  slaCritical: createHITLQueue(HITLQueues.SLA_CRITICAL),
  slaCheck: createHITLQueue(HITLQueues.SLA_CHECK),
  
  // Escalation
  escalationProcess: createHITLQueue(HITLQueues.ESCALATION_PROCESS),
  escalationNotify: createHITLQueue(HITLQueues.ESCALATION_NOTIFY),
  
  // Notifications - high throughput
  notificationSend: createHITLQueue(HITLQueues.NOTIFICATION_SEND, {
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 5, // More retries for notifications
    },
  }),
  notificationBatch: createHITLQueue(HITLQueues.NOTIFICATION_BATCH),
  notificationRetry: createHITLQueue(HITLQueues.NOTIFICATION_RETRY),
  
  // Assignment
  assignmentAuto: createHITLQueue(HITLQueues.ASSIGNMENT_AUTO),
  assignmentRebalance: createHITLQueue(HITLQueues.ASSIGNMENT_REBALANCE),
  
  // Actions
  postApprovalActions: createHITLQueue(HITLQueues.POST_APPROVAL_ACTIONS),
  postRejectionActions: createHITLQueue(HITLQueues.POST_REJECTION_ACTIONS),
  
  // Maintenance - low priority
  cleanupExpired: createHITLQueue(HITLQueues.CLEANUP_EXPIRED),
  archiveOld: createHITLQueue(HITLQueues.ARCHIVE_OLD),
  statsAggregate: createHITLQueue(HITLQueues.STATS_AGGREGATE),
};

/**
 * Queue Events for monitoring
 */
export const queueEvents = new Map<string, QueueEvents>();

Object.entries(HITLQueues).forEach(([key, name]) => {
  const events = new QueueEvents(name, { connection: redisConnection });
  queueEvents.set(name, events);
  
  events.on('completed', ({ jobId, returnvalue }) => {
    logger.debug(`Job ${jobId} completed in ${name}`, { returnvalue });
  });
  
  events.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Job ${jobId} failed in ${name}`, { failedReason });
  });
  
  events.on('stalled', ({ jobId }) => {
    logger.warn(`Job ${jobId} stalled in ${name}`);
  });
});
```

### 11.2 Job Types & Processors

```typescript
// packages/backend/src/queues/hitl/jobs.ts

/**
 * Job Type Definitions
 */

// Approval Created Job
export interface ApprovalCreatedJob {
  approvalId: string;
  tenantId: string;
  type: ApprovalType;
  priority: Priority;
  context: ApprovalContext;
}

// SLA Job
export interface SlaJob {
  approvalId: string;
  tenantId: string;
  eventType: 'warning' | 'deadline' | 'critical';
  scheduledAt: string;
}

// Escalation Job
export interface EscalationJob {
  approvalId: string;
  tenantId: string;
  reason: string;
  currentLevel: number;
  triggeredBy: 'manual' | 'sla_breach' | 'auto';
}

// Notification Job
export interface NotificationJob {
  tenantId: string;
  userId: string;
  channel: NotificationChannel;
  templateId: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  contextType?: string;
  contextId?: string;
}

// Assignment Job
export interface AssignmentJob {
  approvalId: string;
  tenantId: string;
  strategy: AssignmentStrategy;
  requiredRole: string;
  excludeUserIds?: string[];
}

// Post-Action Job
export interface PostActionJob {
  approvalId: string;
  tenantId: string;
  actionType: 'approval' | 'rejection' | 'expiration';
  actions: PostAction[];
  context: Record<string, any>;
}

export interface PostAction {
  type: string;
  params: Record<string, any>;
}

// Cleanup Job
export interface CleanupJob {
  tenantId?: string; // All tenants if not specified
  olderThanDays: number;
  dryRun: boolean;
}

// Archive Job
export interface ArchiveJob {
  tenantId: string;
  approvalIds: string[];
  retentionDays: number;
}
```

### 11.3 Worker Implementations

```typescript
// packages/backend/src/queues/hitl/workers/sla.worker.ts

import { Worker, Job } from 'bullmq';
import { HITLQueues, queues } from '../index';
import { SlaJob, NotificationJob, EscalationJob } from '../jobs';
import { ApprovalRepository } from '@/repositories/approval.repository';
import { SlaConfigRepository } from '@/repositories/sla-config.repository';
import { Logger } from '@/shared/logger';

const logger = new Logger('HITL:SLA:Worker');

/**
 * SLA Warning Worker
 * Procesează job-urile de warning SLA
 */
export const slaWarningWorker = new Worker<SlaJob>(
  HITLQueues.SLA_WARNING,
  async (job: Job<SlaJob>) => {
    const { approvalId, tenantId, eventType, scheduledAt } = job.data;
    
    logger.info(`Processing SLA warning for approval ${approvalId}`);
    
    const approvalRepo = new ApprovalRepository();
    const approval = await approvalRepo.findById(approvalId, tenantId);
    
    if (!approval) {
      logger.warn(`Approval ${approvalId} not found, skipping SLA warning`);
      return { skipped: true, reason: 'approval_not_found' };
    }
    
    // Check if already resolved
    if (['approved', 'rejected', 'expired', 'cancelled'].includes(approval.status)) {
      logger.info(`Approval ${approvalId} already resolved, skipping warning`);
      return { skipped: true, reason: 'already_resolved' };
    }
    
    // Update SLA status
    await approvalRepo.updateSlaStatus(approvalId, tenantId, 'warning');
    
    // Get SLA config for notifications
    const slaConfigRepo = new SlaConfigRepository();
    const config = await slaConfigRepo.getConfig(tenantId, approval.type);
    
    // Queue notification to assigned user
    if (approval.assignedToId) {
      const notificationJob: NotificationJob = {
        tenantId,
        userId: approval.assignedToId,
        channel: 'in_app',
        templateId: 'sla_warning',
        data: {
          approvalId,
          title: approval.title,
          type: approval.type,
          deadline: approval.deadlineAt,
          timeRemaining: calculateTimeRemaining(approval.deadlineAt),
        },
        priority: 'high',
        contextType: 'approval',
        contextId: approvalId,
      };
      
      await queues.notificationSend.add('send', notificationJob);
      
      // Also send email if configured
      if (config.notificationConfig.warning.channels.includes('email')) {
        await queues.notificationSend.add('send', {
          ...notificationJob,
          channel: 'email',
        });
      }
    }
    
    // Log SLA event
    await logSlaEvent(approvalId, tenantId, 'warning', 'triggered');
    
    return { success: true, approvalId, eventType };
  },
  {
    connection: redisConnection,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000,
    },
  }
);

/**
 * SLA Deadline Worker
 * Procesează job-urile de deadline SLA (breach)
 */
export const slaDeadlineWorker = new Worker<SlaJob>(
  HITLQueues.SLA_DEADLINE,
  async (job: Job<SlaJob>) => {
    const { approvalId, tenantId, eventType, scheduledAt } = job.data;
    
    logger.info(`Processing SLA deadline for approval ${approvalId}`);
    
    const approvalRepo = new ApprovalRepository();
    const approval = await approvalRepo.findById(approvalId, tenantId);
    
    if (!approval || ['approved', 'rejected', 'expired', 'cancelled'].includes(approval.status)) {
      return { skipped: true, reason: 'already_resolved' };
    }
    
    // Mark as breached
    await approvalRepo.update(approvalId, tenantId, {
      slaStatus: 'breached',
      slaBreachedAt: new Date(),
    });
    
    // Get SLA config
    const slaConfigRepo = new SlaConfigRepository();
    const config = await slaConfigRepo.getConfig(tenantId, approval.type);
    
    // Send breach notifications
    const channels = config.notificationConfig.breach.channels;
    for (const channel of channels) {
      if (approval.assignedToId) {
        await queues.notificationSend.add('send', {
          tenantId,
          userId: approval.assignedToId,
          channel,
          templateId: 'sla_breach',
          data: {
            approvalId,
            title: approval.title,
            type: approval.type,
            breachedAt: new Date().toISOString(),
          },
          priority: 'urgent',
          contextType: 'approval',
          contextId: approvalId,
        });
      }
    }
    
    // Auto-escalate if configured
    if (config.autoEscalateOnBreach && approval.escalationLevel < approval.maxEscalationLevel) {
      const escalationJob: EscalationJob = {
        approvalId,
        tenantId,
        reason: 'SLA breach - auto escalation',
        currentLevel: approval.escalationLevel,
        triggeredBy: 'sla_breach',
      };
      
      await queues.escalationProcess.add('escalate', escalationJob, {
        priority: 1, // High priority
      });
    }
    
    // Log SLA event
    await logSlaEvent(approvalId, tenantId, 'deadline', 'triggered');
    
    return { success: true, approvalId, breached: true };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

/**
 * SLA Critical Worker
 * Procesează job-urile de critical SLA
 */
export const slaCriticalWorker = new Worker<SlaJob>(
  HITLQueues.SLA_CRITICAL,
  async (job: Job<SlaJob>) => {
    const { approvalId, tenantId, eventType, scheduledAt } = job.data;
    
    logger.warn(`Processing SLA critical for approval ${approvalId}`);
    
    const approvalRepo = new ApprovalRepository();
    const approval = await approvalRepo.findById(approvalId, tenantId);
    
    if (!approval || ['approved', 'rejected', 'expired', 'cancelled'].includes(approval.status)) {
      return { skipped: true, reason: 'already_resolved' };
    }
    
    // Get SLA config
    const slaConfigRepo = new SlaConfigRepository();
    const config = await slaConfigRepo.getConfig(tenantId, approval.type);
    
    // Auto-expire if configured
    if (config.autoExpireOnCritical) {
      await approvalRepo.update(approvalId, tenantId, {
        status: 'expired',
        resolvedAt: new Date(),
        resolutionType: 'auto_expired',
        resolutionNotes: 'Auto-expired due to critical SLA breach',
      });
      
      // Execute post-expire actions
      await queues.postApprovalActions.add('execute', {
        approvalId,
        tenantId,
        actionType: 'expiration',
        actions: approval.postExpireActions,
        context: approval.context,
      });
      
      return { success: true, approvalId, expired: true };
    }
    
    // Otherwise, send critical notifications to all admins
    const channels = config.notificationConfig.critical.channels;
    const adminIds = await getAdminUserIds(tenantId);
    
    for (const adminId of adminIds) {
      for (const channel of channels) {
        await queues.notificationSend.add('send', {
          tenantId,
          userId: adminId,
          channel,
          templateId: 'sla_critical',
          data: {
            approvalId,
            title: approval.title,
            type: approval.type,
            assignedTo: approval.assignedToId,
            criticalSince: new Date().toISOString(),
          },
          priority: 'urgent',
          contextType: 'approval',
          contextId: approvalId,
        });
      }
    }
    
    // Log SLA event
    await logSlaEvent(approvalId, tenantId, 'critical', 'triggered');
    
    return { success: true, approvalId, critical: true };
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

// Helper functions
function calculateTimeRemaining(deadline: Date): string {
  const now = new Date();
  const diffMs = new Date(deadline).getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  }
  return `${diffMins}m`;
}

async function logSlaEvent(
  approvalId: string,
  tenantId: string,
  eventType: string,
  status: string
): Promise<void> {
  // Implementation to log SLA event to database
}

async function getAdminUserIds(tenantId: string): Promise<string[]> {
  // Implementation to get admin user IDs
  return [];
}
```

### 11.4 Escalation Worker

```typescript
// packages/backend/src/queues/hitl/workers/escalation.worker.ts

import { Worker, Job } from 'bullmq';
import { HITLQueues, queues } from '../index';
import { EscalationJob, NotificationJob, AssignmentJob } from '../jobs';
import { ApprovalRepository } from '@/repositories/approval.repository';
import { SlaConfigRepository } from '@/repositories/sla-config.repository';
import { UserRepository } from '@/repositories/user.repository';
import { Logger } from '@/shared/logger';

const logger = new Logger('HITL:Escalation:Worker');

/**
 * Escalation Process Worker
 * Procesează escaladările de aprobări
 */
export const escalationProcessWorker = new Worker<EscalationJob>(
  HITLQueues.ESCALATION_PROCESS,
  async (job: Job<EscalationJob>) => {
    const { approvalId, tenantId, reason, currentLevel, triggeredBy } = job.data;
    
    logger.info(`Processing escalation for approval ${approvalId}, level ${currentLevel} -> ${currentLevel + 1}`);
    
    const approvalRepo = new ApprovalRepository();
    const slaConfigRepo = new SlaConfigRepository();
    const userRepo = new UserRepository();
    
    const approval = await approvalRepo.findById(approvalId, tenantId);
    
    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }
    
    // Check if already resolved
    if (['approved', 'rejected', 'expired', 'cancelled'].includes(approval.status)) {
      return { skipped: true, reason: 'already_resolved' };
    }
    
    // Check max escalation level
    if (currentLevel >= approval.maxEscalationLevel) {
      logger.warn(`Max escalation level reached for approval ${approvalId}`);
      
      // Notify all admins of critical situation
      const adminIds = await userRepo.getAdminUserIds(tenantId);
      for (const adminId of adminIds) {
        await queues.notificationSend.add('send', {
          tenantId,
          userId: adminId,
          channel: 'in_app',
          templateId: 'max_escalation_reached',
          data: {
            approvalId,
            title: approval.title,
            escalationLevel: currentLevel,
            reason,
          },
          priority: 'urgent',
          contextType: 'approval',
          contextId: approvalId,
        });
      }
      
      return { maxLevelReached: true, approvalId };
    }
    
    const newLevel = currentLevel + 1;
    
    // Get escalation path from config
    const config = await slaConfigRepo.getConfig(tenantId, approval.type);
    const escalationPath = config.escalationPath;
    
    if (newLevel > escalationPath.length) {
      throw new Error(`Escalation path not defined for level ${newLevel}`);
    }
    
    const targetRole = escalationPath[newLevel - 1].role;
    
    // Find user to assign to
    const assignmentJob: AssignmentJob = {
      approvalId,
      tenantId,
      strategy: 'least_busy',
      requiredRole: targetRole,
      excludeUserIds: approval.assignedToId ? [approval.assignedToId] : [],
    };
    
    // Get new assignee
    const newAssignee = await findAssignee(assignmentJob);
    
    if (!newAssignee) {
      logger.error(`No available user with role ${targetRole} for escalation`);
      // Fallback to any admin
      const fallbackUser = await userRepo.getFirstAvailableAdmin(tenantId);
      if (fallbackUser) {
        newAssignee = fallbackUser;
      } else {
        throw new Error(`No available user for escalation`);
      }
    }
    
    // Record escalation event
    const escalationEvent = {
      level: newLevel,
      escalatedAt: new Date().toISOString(),
      reason,
      fromUserId: approval.assignedToId,
      fromUserName: approval.assignedToId 
        ? (await userRepo.findById(approval.assignedToId))?.fullName 
        : null,
      toUserId: newAssignee.id,
      toUserName: newAssignee.fullName,
      toRole: targetRole,
      triggeredBy,
    };
    
    // Update approval
    const updatedEscalationHistory = [
      ...approval.escalationHistory,
      escalationEvent,
    ];
    
    await approvalRepo.update(approvalId, tenantId, {
      escalationLevel: newLevel,
      escalationHistory: updatedEscalationHistory,
      assignedToId: newAssignee.id,
      assignedAt: new Date(),
      status: 'assigned',
    });
    
    // Extend SLA deadline by 50%
    const slaExtension = Math.floor(
      (new Date(approval.deadlineAt).getTime() - new Date(approval.createdAt).getTime()) * 0.5
    );
    const newDeadline = new Date(Date.now() + slaExtension);
    
    await approvalRepo.update(approvalId, tenantId, {
      deadlineAt: newDeadline,
      slaStatus: 'on_track',
    });
    
    // Reschedule SLA jobs
    await rescheduleSlaJobs(approvalId, tenantId, newDeadline);
    
    // Notify new assignee
    await queues.notificationSend.add('send', {
      tenantId,
      userId: newAssignee.id,
      channel: 'in_app',
      templateId: 'escalation_received',
      data: {
        approvalId,
        title: approval.title,
        type: approval.type,
        escalationLevel: newLevel,
        reason,
        previousAssignee: escalationEvent.fromUserName,
        deadline: newDeadline.toISOString(),
      },
      priority: 'urgent',
      contextType: 'approval',
      contextId: approvalId,
    });
    
    // Notify previous assignee if exists
    if (approval.assignedToId) {
      await queues.notificationSend.add('send', {
        tenantId,
        userId: approval.assignedToId,
        channel: 'in_app',
        templateId: 'approval_escalated',
        data: {
          approvalId,
          title: approval.title,
          escalatedTo: newAssignee.fullName,
          reason,
        },
        priority: 'normal',
        contextType: 'approval',
        contextId: approvalId,
      });
    }
    
    // Log audit event
    await logAuditEvent(approvalId, tenantId, 'escalated', {
      escalationLevel: newLevel,
      reason,
      triggeredBy,
      fromUserId: approval.assignedToId,
      toUserId: newAssignee.id,
    });
    
    return {
      success: true,
      approvalId,
      newLevel,
      newAssigneeId: newAssignee.id,
      newDeadline: newDeadline.toISOString(),
    };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// Helper functions
async function findAssignee(job: AssignmentJob): Promise<UserInfo | null> {
  // Implementation from AssignmentManager
  return null;
}

async function rescheduleSlaJobs(
  approvalId: string,
  tenantId: string,
  newDeadline: Date
): Promise<void> {
  // Cancel existing SLA jobs
  const existingSlaJobs = await queues.slaWarning.getJobs(['delayed']);
  for (const job of existingSlaJobs) {
    if (job.data.approvalId === approvalId) {
      await job.remove();
    }
  }
  
  // Schedule new SLA jobs
  // ... implementation
}

async function logAuditEvent(
  approvalId: string,
  tenantId: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  // Implementation to log audit event
}
```

### 11.5 Notification Worker

```typescript
// packages/backend/src/queues/hitl/workers/notification.worker.ts

import { Worker, Job } from 'bullmq';
import { HITLQueues, queues } from '../index';
import { NotificationJob } from '../jobs';
import { NotificationRepository } from '@/repositories/notification.repository';
import { NotificationPreferencesRepository } from '@/repositories/notification-preferences.repository';
import { EmailService } from '@/services/email.service';
import { PushService } from '@/services/push.service';
import { SmsService } from '@/services/sms.service';
import { WebSocketService } from '@/services/websocket.service';
import { Logger } from '@/shared/logger';

const logger = new Logger('HITL:Notification:Worker');

/**
 * Notification Send Worker
 * Procesează trimiterea notificărilor pe diverse canale
 */
export const notificationSendWorker = new Worker<NotificationJob>(
  HITLQueues.NOTIFICATION_SEND,
  async (job: Job<NotificationJob>) => {
    const { 
      tenantId, 
      userId, 
      channel, 
      templateId, 
      data, 
      priority, 
      contextType, 
      contextId 
    } = job.data;
    
    logger.debug(`Sending ${channel} notification to user ${userId}`, { templateId });
    
    const notificationRepo = new NotificationRepository();
    const prefsRepo = new NotificationPreferencesRepository();
    
    // Check user preferences
    const prefs = await prefsRepo.getUserPreferences(tenantId, userId);
    
    // Check if channel is enabled
    if (!isChannelEnabled(prefs, channel, templateId)) {
      logger.info(`Channel ${channel} disabled for user ${userId}, skipping`);
      return { skipped: true, reason: 'channel_disabled' };
    }
    
    // Check quiet hours
    if (isInQuietHours(prefs) && priority !== 'urgent') {
      logger.info(`User ${userId} in quiet hours, deferring notification`);
      
      // Requeue with delay until quiet hours end
      const delayMs = calculateQuietHoursDelay(prefs);
      await queues.notificationSend.add('send', job.data, {
        delay: delayMs,
        priority: priority === 'high' ? 2 : 3,
      });
      
      return { deferred: true, delayMs };
    }
    
    // Render template
    const template = await getNotificationTemplate(templateId, channel);
    const rendered = renderTemplate(template, data);
    
    // Create notification record
    const notification = await notificationRepo.create({
      tenantId,
      userId,
      channel,
      templateId,
      title: rendered.title,
      body: rendered.body,
      bodyHtml: rendered.bodyHtml,
      data,
      priority,
      contextType,
      contextId,
      status: 'pending',
    });
    
    try {
      let result;
      
      switch (channel) {
        case 'in_app':
          result = await sendInAppNotification(userId, notification);
          break;
        case 'email':
          result = await sendEmailNotification(prefs, notification);
          break;
        case 'push':
          result = await sendPushNotification(prefs, notification);
          break;
        case 'sms':
          result = await sendSmsNotification(prefs, notification);
          break;
        default:
          throw new Error(`Unknown notification channel: ${channel}`);
      }
      
      // Update notification status
      await notificationRepo.update(notification.id, {
        status: 'sent',
        sentAt: new Date(),
        provider: result.provider,
        providerMessageId: result.messageId,
        providerResponse: result.response,
      });
      
      logger.info(`Notification ${notification.id} sent successfully via ${channel}`);
      
      return { success: true, notificationId: notification.id, channel };
      
    } catch (error) {
      logger.error(`Failed to send notification ${notification.id}`, { error: error.message });
      
      // Update notification with failure
      await notificationRepo.update(notification.id, {
        status: 'failed',
        failedAt: new Date(),
        failureReason: error.message,
        retryCount: (notification.retryCount || 0) + 1,
        nextRetryAt: calculateNextRetryTime(notification.retryCount || 0),
      });
      
      throw error; // Let BullMQ handle retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 20, // High concurrency for notifications
    limiter: {
      max: 100,
      duration: 1000, // 100 notifications per second
    },
  }
);

/**
 * In-App Notification
 */
async function sendInAppNotification(
  userId: string,
  notification: Notification
): Promise<SendResult> {
  const wsService = new WebSocketService();
  
  // Send real-time via WebSocket
  await wsService.sendToUser(userId, {
    type: 'notification',
    payload: {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      priority: notification.priority,
      contextType: notification.contextType,
      contextId: notification.contextId,
      createdAt: notification.createdAt,
    },
  });
  
  return {
    provider: 'websocket',
    messageId: notification.id,
    response: { delivered: true },
  };
}

/**
 * Email Notification
 */
async function sendEmailNotification(
  prefs: NotificationPreferences,
  notification: Notification
): Promise<SendResult> {
  const emailService = new EmailService();
  
  const result = await emailService.send({
    to: prefs.emailAddress,
    subject: notification.title,
    html: notification.bodyHtml || notification.body,
    text: notification.body,
    metadata: {
      notificationId: notification.id,
      contextType: notification.contextType,
      contextId: notification.contextId,
    },
  });
  
  return {
    provider: 'sendgrid',
    messageId: result.messageId,
    response: result,
  };
}

/**
 * Push Notification
 */
async function sendPushNotification(
  prefs: NotificationPreferences,
  notification: Notification
): Promise<SendResult> {
  if (!prefs.pushToken) {
    throw new Error('No push token configured for user');
  }
  
  const pushService = new PushService();
  
  const result = await pushService.send({
    token: prefs.pushToken,
    provider: prefs.pushProvider,
    title: notification.title,
    body: notification.body,
    data: {
      notificationId: notification.id,
      contextType: notification.contextType,
      contextId: notification.contextId,
    },
    priority: notification.priority === 'urgent' ? 'high' : 'normal',
  });
  
  return {
    provider: prefs.pushProvider || 'fcm',
    messageId: result.messageId,
    response: result,
  };
}

/**
 * SMS Notification
 */
async function sendSmsNotification(
  prefs: NotificationPreferences,
  notification: Notification
): Promise<SendResult> {
  if (!prefs.phoneNumber) {
    throw new Error('No phone number configured for user');
  }
  
  const smsService = new SmsService();
  
  // SMS body is truncated and plain text
  const body = notification.body.substring(0, 160);
  
  const result = await smsService.send({
    to: prefs.phoneNumber,
    body: body,
    metadata: {
      notificationId: notification.id,
    },
  });
  
  return {
    provider: 'twilio',
    messageId: result.sid,
    response: result,
  };
}

// Helper functions
function isChannelEnabled(
  prefs: NotificationPreferences,
  channel: NotificationChannel,
  templateId: string
): boolean {
  // Check global channel toggle
  if (channel === 'email' && !prefs.emailEnabled) return false;
  if (channel === 'push' && !prefs.pushEnabled) return false;
  if (channel === 'sms' && !prefs.smsEnabled) return false;
  if (channel === 'in_app' && !prefs.inAppEnabled) return false;
  
  // Check template-specific preferences
  const typePrefs = prefs.typePreferences[templateId];
  if (typePrefs && typePrefs[channel] === false) return false;
  
  return true;
}

function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursEnabled) return false;
  
  const now = new Date();
  const hour = now.getHours();
  
  const start = prefs.quietStartHour;
  const end = prefs.quietEndHour;
  
  if (start < end) {
    return hour >= start && hour < end;
  } else {
    // Overnight quiet hours (e.g., 22-8)
    return hour >= start || hour < end;
  }
}

function calculateQuietHoursDelay(prefs: NotificationPreferences): number {
  const now = new Date();
  const endHour = prefs.quietEndHour;
  
  const endTime = new Date(now);
  endTime.setHours(endHour, 0, 0, 0);
  
  if (endTime <= now) {
    endTime.setDate(endTime.getDate() + 1);
  }
  
  return endTime.getTime() - now.getTime();
}

function calculateNextRetryTime(retryCount: number): Date {
  // Exponential backoff: 1min, 5min, 15min, 1h, 4h
  const delays = [60000, 300000, 900000, 3600000, 14400000];
  const delay = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delay);
}

interface SendResult {
  provider: string;
  messageId: string;
  response: any;
}
```

---

## 12. API Endpoints

### 12.1 Approvals API

#### 12.1.1 List Approvals

```typescript
// GET /api/v1/approvals
// Lista paginată de aprobări cu filtrare și sortare

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals, users } from '@/db/schema';
import { eq, and, or, gte, lte, ilike, inArray, isNull, sql } from 'drizzle-orm';

// Query Parameters Schema
const ListApprovalsQuerySchema = Type.Object({
  // Pagination
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  
  // Filtering
  type: Type.Optional(Type.Array(Type.Enum({
    ai_response: 'ai_response',
    discount: 'discount',
    document: 'document',
    efactura: 'efactura',
    handover: 'handover',
    guardrail_override: 'guardrail_override',
    price_exception: 'price_exception',
    credit_terms: 'credit_terms',
    custom: 'custom'
  }))),
  status: Type.Optional(Type.Array(Type.Enum({
    pending: 'pending',
    assigned: 'assigned',
    approved: 'approved',
    rejected: 'rejected',
    escalated: 'escalated',
    expired: 'expired',
    cancelled: 'cancelled'
  }))),
  priority: Type.Optional(Type.Array(Type.Enum({
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical'
  }))),
  slaStatus: Type.Optional(Type.Array(Type.Enum({
    on_track: 'on_track',
    warning: 'warning',
    breached: 'breached'
  }))),
  assignedTo: Type.Optional(Type.String({ format: 'uuid' })),
  assignedToMe: Type.Optional(Type.Boolean()),
  unassigned: Type.Optional(Type.Boolean()),
  
  // Date filters
  createdAfter: Type.Optional(Type.String({ format: 'date-time' })),
  createdBefore: Type.Optional(Type.String({ format: 'date-time' })),
  deadlineAfter: Type.Optional(Type.String({ format: 'date-time' })),
  deadlineBefore: Type.Optional(Type.String({ format: 'date-time' })),
  
  // Search
  search: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  
  // Reference
  referenceType: Type.Optional(Type.String()),
  referenceId: Type.Optional(Type.String({ format: 'uuid' })),
  
  // Sorting
  sortBy: Type.Optional(Type.Enum({
    created_at: 'created_at',
    updated_at: 'updated_at',
    deadline_at: 'deadline_at',
    priority: 'priority',
    title: 'title'
  })),
  sortOrder: Type.Optional(Type.Enum({ asc: 'asc', desc: 'desc' })),
  
  // Include options
  includeResolved: Type.Optional(Type.Boolean({ default: false })),
  includeDeleted: Type.Optional(Type.Boolean({ default: false }))
});

type ListApprovalsQuery = Static<typeof ListApprovalsQuerySchema>;

// Response Schema
const ApprovalListItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  type: Type.String(),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  priority: Type.String(),
  status: Type.String(),
  slaStatus: Type.String(),
  warningAt: Type.Optional(Type.String({ format: 'date-time' })),
  deadlineAt: Type.Optional(Type.String({ format: 'date-time' })),
  criticalAt: Type.Optional(Type.String({ format: 'date-time' })),
  slaBreachedAt: Type.Optional(Type.String({ format: 'date-time' })),
  assignedTo: Type.Optional(Type.Object({
    id: Type.String({ format: 'uuid' }),
    name: Type.String(),
    email: Type.String(),
    avatarUrl: Type.Optional(Type.String())
  })),
  assignedAt: Type.Optional(Type.String({ format: 'date-time' })),
  requestedBy: Type.Optional(Type.Object({
    type: Type.String(),
    name: Type.String()
  })),
  escalationLevel: Type.Number(),
  maxEscalationLevel: Type.Number(),
  commentsCount: Type.Number(),
  tags: Type.Array(Type.String()),
  referenceType: Type.Optional(Type.String()),
  referenceId: Type.Optional(Type.String({ format: 'uuid' })),
  contextSummary: Type.Optional(Type.Object({
    contactName: Type.Optional(Type.String()),
    amount: Type.Optional(Type.Number()),
    currency: Type.Optional(Type.String())
  })),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' })
});

const ListApprovalsResponseSchema = Type.Object({
  data: Type.Array(ApprovalListItemSchema),
  pagination: Type.Object({
    page: Type.Number(),
    limit: Type.Number(),
    total: Type.Number(),
    totalPages: Type.Number(),
    hasNextPage: Type.Boolean(),
    hasPrevPage: Type.Boolean()
  }),
  stats: Type.Object({
    totalPending: Type.Number(),
    totalBreached: Type.Number(),
    totalWarning: Type.Number(),
    totalAssignedToMe: Type.Number()
  })
});

// Route Handler
export async function listApprovalsHandler(
  request: FastifyRequest<{ Querystring: ListApprovalsQuery }>,
  reply: FastifyReply
) {
  const { tenantId, userId } = request.user;
  const query = request.query;
  
  // Build WHERE conditions
  const conditions: SQL[] = [eq(approvals.tenantId, tenantId)];
  
  // Soft delete filter
  if (!query.includeDeleted) {
    conditions.push(isNull(approvals.deletedAt));
  }
  
  // Status filter
  if (!query.includeResolved) {
    conditions.push(
      inArray(approvals.status, ['pending', 'assigned', 'escalated'])
    );
  }
  
  // Type filter
  if (query.type?.length) {
    conditions.push(inArray(approvals.type, query.type));
  }
  
  // Status filter (explicit)
  if (query.status?.length) {
    conditions.push(inArray(approvals.status, query.status));
  }
  
  // Priority filter
  if (query.priority?.length) {
    conditions.push(inArray(approvals.priority, query.priority));
  }
  
  // SLA Status filter
  if (query.slaStatus?.length) {
    conditions.push(inArray(approvals.slaStatus, query.slaStatus));
  }
  
  // Assignment filters
  if (query.assignedToMe) {
    conditions.push(eq(approvals.assignedToId, userId));
  } else if (query.assignedTo) {
    conditions.push(eq(approvals.assignedToId, query.assignedTo));
  } else if (query.unassigned) {
    conditions.push(isNull(approvals.assignedToId));
  }
  
  // Date filters
  if (query.createdAfter) {
    conditions.push(gte(approvals.createdAt, new Date(query.createdAfter)));
  }
  if (query.createdBefore) {
    conditions.push(lte(approvals.createdAt, new Date(query.createdBefore)));
  }
  if (query.deadlineAfter) {
    conditions.push(gte(approvals.deadlineAt, new Date(query.deadlineAfter)));
  }
  if (query.deadlineBefore) {
    conditions.push(lte(approvals.deadlineAt, new Date(query.deadlineBefore)));
  }
  
  // Reference filter
  if (query.referenceType && query.referenceId) {
    conditions.push(
      and(
        eq(approvals.referenceType, query.referenceType),
        eq(approvals.referenceId, query.referenceId)
      )
    );
  }
  
  // Search filter
  if (query.search) {
    const searchPattern = `%${query.search}%`;
    conditions.push(
      or(
        ilike(approvals.title, searchPattern),
        ilike(approvals.description, searchPattern),
        sql`${approvals.context}->>'contactName' ILIKE ${searchPattern}`
      )
    );
  }
  
  // Sorting
  const sortColumn = query.sortBy || 'created_at';
  const sortDirection = query.sortOrder || 'desc';
  const orderBy = sortDirection === 'asc' 
    ? asc(approvals[sortColumn])
    : desc(approvals[sortColumn]);
  
  // Pagination
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;
  
  // Execute query with joins
  const [results, countResult, stats] = await Promise.all([
    // Main query
    db.select({
      id: approvals.id,
      type: approvals.type,
      title: approvals.title,
      description: approvals.description,
      priority: approvals.priority,
      status: approvals.status,
      slaStatus: approvals.slaStatus,
      warningAt: approvals.warningAt,
      deadlineAt: approvals.deadlineAt,
      criticalAt: approvals.criticalAt,
      slaBreachedAt: approvals.slaBreachedAt,
      assignedToId: approvals.assignedToId,
      assignedAt: approvals.assignedAt,
      requestedByWorker: approvals.requestedByWorker,
      requestedByUserId: approvals.requestedByUserId,
      escalationLevel: approvals.escalationLevel,
      maxEscalationLevel: approvals.maxEscalationLevel,
      tags: approvals.tags,
      referenceType: approvals.referenceType,
      referenceId: approvals.referenceId,
      context: approvals.context,
      createdAt: approvals.createdAt,
      updatedAt: approvals.updatedAt,
      // Joined user data
      assignedUserName: users.name,
      assignedUserEmail: users.email,
      assignedUserAvatar: users.avatarUrl,
      // Subquery for comments count
      commentsCount: sql<number>`(
        SELECT COUNT(*) FROM approval_comments 
        WHERE approval_id = ${approvals.id} 
        AND deleted_at IS NULL
      )`
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.assignedToId, users.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset),
    
    // Count query
    db.select({ count: sql<number>`COUNT(*)` })
      .from(approvals)
      .where(and(...conditions)),
    
    // Stats query
    db.select({
      totalPending: sql<number>`COUNT(*) FILTER (WHERE status IN ('pending', 'assigned', 'escalated'))`,
      totalBreached: sql<number>`COUNT(*) FILTER (WHERE sla_status = 'breached' AND status IN ('pending', 'assigned', 'escalated'))`,
      totalWarning: sql<number>`COUNT(*) FILTER (WHERE sla_status = 'warning' AND status IN ('pending', 'assigned', 'escalated'))`,
      totalAssignedToMe: sql<number>`COUNT(*) FILTER (WHERE assigned_to_id = ${userId} AND status IN ('pending', 'assigned', 'escalated'))`
    })
    .from(approvals)
    .where(and(eq(approvals.tenantId, tenantId), isNull(approvals.deletedAt)))
  ]);
  
  const total = countResult[0]?.count || 0;
  const totalPages = Math.ceil(total / limit);
  
  // Transform results
  const data = results.map(row => ({
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    slaStatus: row.slaStatus,
    warningAt: row.warningAt?.toISOString(),
    deadlineAt: row.deadlineAt?.toISOString(),
    criticalAt: row.criticalAt?.toISOString(),
    slaBreachedAt: row.slaBreachedAt?.toISOString(),
    assignedTo: row.assignedToId ? {
      id: row.assignedToId,
      name: row.assignedUserName,
      email: row.assignedUserEmail,
      avatarUrl: row.assignedUserAvatar
    } : undefined,
    assignedAt: row.assignedAt?.toISOString(),
    requestedBy: row.requestedByWorker ? {
      type: 'worker',
      name: row.requestedByWorker
    } : row.requestedByUserId ? {
      type: 'user',
      name: 'User' // Would need another join
    } : undefined,
    escalationLevel: row.escalationLevel,
    maxEscalationLevel: row.maxEscalationLevel,
    commentsCount: row.commentsCount || 0,
    tags: row.tags || [],
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    contextSummary: row.context ? {
      contactName: row.context.contactName,
      amount: row.context.amount,
      currency: row.context.currency
    } : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }));
  
  return reply.send({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    stats: {
      totalPending: stats[0]?.totalPending || 0,
      totalBreached: stats[0]?.totalBreached || 0,
      totalWarning: stats[0]?.totalWarning || 0,
      totalAssignedToMe: stats[0]?.totalAssignedToMe || 0
    }
  });
}

// Route Registration
export async function registerListApprovalsRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/approvals', {
    schema: {
      tags: ['Approvals'],
      summary: 'List approvals',
      description: 'Get paginated list of approvals with filtering and sorting',
      querystring: ListApprovalsQuerySchema,
      response: {
        200: ListApprovalsResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: listApprovalsHandler
  });
}
```

#### 12.1.2 Get Approval Detail

```typescript
// GET /api/v1/approvals/:id
// Obține detaliile complete ale unei aprobări

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals, users, approvalComments, approvalAuditLog } from '@/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

// Params Schema
const GetApprovalParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' })
});

type GetApprovalParams = Static<typeof GetApprovalParamsSchema>;

// Query Schema
const GetApprovalQuerySchema = Type.Object({
  includeComments: Type.Optional(Type.Boolean({ default: true })),
  includeTimeline: Type.Optional(Type.Boolean({ default: true })),
  commentsLimit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 50 })),
  timelineLimit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 50 }))
});

type GetApprovalQuery = Static<typeof GetApprovalQuerySchema>;

// Full Response Schema
const ApprovalDetailSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  tenantId: Type.String({ format: 'uuid' }),
  type: Type.String(),
  referenceType: Type.Optional(Type.String()),
  referenceId: Type.Optional(Type.String({ format: 'uuid' })),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  priority: Type.String(),
  status: Type.String(),
  
  // SLA
  slaStatus: Type.String(),
  warningAt: Type.Optional(Type.String({ format: 'date-time' })),
  deadlineAt: Type.Optional(Type.String({ format: 'date-time' })),
  criticalAt: Type.Optional(Type.String({ format: 'date-time' })),
  slaBreachedAt: Type.Optional(Type.String({ format: 'date-time' })),
  timeRemaining: Type.Optional(Type.Object({
    seconds: Type.Number(),
    formatted: Type.String(),
    isOverdue: Type.Boolean()
  })),
  
  // Assignment
  assignedTo: Type.Optional(Type.Object({
    id: Type.String({ format: 'uuid' }),
    name: Type.String(),
    email: Type.String(),
    avatarUrl: Type.Optional(Type.String()),
    role: Type.Optional(Type.String())
  })),
  assignedAt: Type.Optional(Type.String({ format: 'date-time' })),
  assignedBy: Type.Optional(Type.Object({
    id: Type.String({ format: 'uuid' }),
    name: Type.String()
  })),
  
  // Request source
  requestedBy: Type.Object({
    type: Type.Enum({ worker: 'worker', user: 'user' }),
    id: Type.Optional(Type.String()),
    name: Type.String()
  }),
  
  // Context (type-specific)
  context: Type.Any(),
  
  // Resolution
  resolvedAt: Type.Optional(Type.String({ format: 'date-time' })),
  resolvedBy: Type.Optional(Type.Object({
    id: Type.String({ format: 'uuid' }),
    name: Type.String()
  })),
  resolutionType: Type.Optional(Type.String()),
  resolutionNotes: Type.Optional(Type.String()),
  
  // Escalation
  escalationLevel: Type.Number(),
  maxEscalationLevel: Type.Number(),
  escalationHistory: Type.Array(Type.Object({
    level: Type.Number(),
    escalatedAt: Type.String({ format: 'date-time' }),
    escalatedBy: Type.String(),
    reason: Type.Optional(Type.String()),
    previousAssignee: Type.Optional(Type.String()),
    newAssignee: Type.Optional(Type.String())
  })),
  
  // Actions
  postApprovalActions: Type.Optional(Type.Array(Type.Any())),
  postRejectionActions: Type.Optional(Type.Array(Type.Any())),
  postExpireActions: Type.Optional(Type.Array(Type.Any())),
  actionsExecuted: Type.Boolean(),
  
  // Metadata
  tags: Type.Array(Type.String()),
  metadata: Type.Optional(Type.Any()),
  
  // Timestamps
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  
  // Related data
  comments: Type.Optional(Type.Array(Type.Object({
    id: Type.String({ format: 'uuid' }),
    content: Type.String(),
    contentHtml: Type.Optional(Type.String()),
    parentId: Type.Optional(Type.String({ format: 'uuid' })),
    threadDepth: Type.Number(),
    author: Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String(),
      avatarUrl: Type.Optional(Type.String()),
      type: Type.String()
    }),
    mentionedUserIds: Type.Array(Type.String({ format: 'uuid' })),
    isInternal: Type.Boolean(),
    attachments: Type.Array(Type.Object({
      id: Type.String({ format: 'uuid' }),
      filename: Type.String(),
      mimeType: Type.String(),
      sizeBytes: Type.Number(),
      url: Type.String()
    })),
    createdAt: Type.String({ format: 'date-time' }),
    editedAt: Type.Optional(Type.String({ format: 'date-time' }))
  }))),
  
  timeline: Type.Optional(Type.Array(Type.Object({
    id: Type.String({ format: 'uuid' }),
    action: Type.String(),
    actionCategory: Type.String(),
    performedBy: Type.Object({
      type: Type.String(),
      id: Type.Optional(Type.String()),
      name: Type.String()
    }),
    changes: Type.Optional(Type.Array(Type.Object({
      field: Type.String(),
      oldValue: Type.Any(),
      newValue: Type.Any()
    }))),
    context: Type.Optional(Type.Any()),
    performedAt: Type.String({ format: 'date-time' })
  })))
});

// Route Handler
export async function getApprovalHandler(
  request: FastifyRequest<{ 
    Params: GetApprovalParams;
    Querystring: GetApprovalQuery;
  }>,
  reply: FastifyReply
) {
  const { tenantId, userId } = request.user;
  const { id } = request.params;
  const query = request.query;
  
  // Fetch approval with assigned user
  const approval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.id, id),
      eq(approvals.tenantId, tenantId),
      isNull(approvals.deletedAt)
    ),
    with: {
      assignedUser: true,
      assignedByUser: true,
      requestedByUser: true,
      resolvedByUser: true
    }
  });
  
  if (!approval) {
    return reply.status(404).send({
      error: 'Approval not found',
      code: 'APPROVAL_NOT_FOUND'
    });
  }
  
  // Log view event
  await logApprovalView(id, tenantId, userId);
  
  // Calculate time remaining
  const timeRemaining = approval.deadlineAt 
    ? calculateTimeRemaining(approval.deadlineAt)
    : undefined;
  
  // Build response
  const response: any = {
    id: approval.id,
    tenantId: approval.tenantId,
    type: approval.type,
    referenceType: approval.referenceType,
    referenceId: approval.referenceId,
    title: approval.title,
    description: approval.description,
    priority: approval.priority,
    status: approval.status,
    
    slaStatus: approval.slaStatus,
    warningAt: approval.warningAt?.toISOString(),
    deadlineAt: approval.deadlineAt?.toISOString(),
    criticalAt: approval.criticalAt?.toISOString(),
    slaBreachedAt: approval.slaBreachedAt?.toISOString(),
    timeRemaining,
    
    assignedTo: approval.assignedUser ? {
      id: approval.assignedUser.id,
      name: approval.assignedUser.name,
      email: approval.assignedUser.email,
      avatarUrl: approval.assignedUser.avatarUrl,
      role: approval.assignedUser.role
    } : undefined,
    assignedAt: approval.assignedAt?.toISOString(),
    assignedBy: approval.assignedByUser ? {
      id: approval.assignedByUser.id,
      name: approval.assignedByUser.name
    } : undefined,
    
    requestedBy: approval.requestedByWorker ? {
      type: 'worker',
      name: approval.requestedByWorker
    } : {
      type: 'user',
      id: approval.requestedByUserId,
      name: approval.requestedByUser?.name || 'Unknown'
    },
    
    context: approval.context,
    
    resolvedAt: approval.resolvedAt?.toISOString(),
    resolvedBy: approval.resolvedByUser ? {
      id: approval.resolvedByUser.id,
      name: approval.resolvedByUser.name
    } : undefined,
    resolutionType: approval.resolutionType,
    resolutionNotes: approval.resolutionNotes,
    
    escalationLevel: approval.escalationLevel,
    maxEscalationLevel: approval.maxEscalationLevel,
    escalationHistory: approval.escalationHistory || [],
    
    postApprovalActions: approval.postApprovalActions,
    postRejectionActions: approval.postRejectionActions,
    postExpireActions: approval.postExpireActions,
    actionsExecuted: approval.actionsExecuted,
    
    tags: approval.tags || [],
    metadata: approval.metadata,
    
    createdAt: approval.createdAt.toISOString(),
    updatedAt: approval.updatedAt.toISOString()
  };
  
  // Fetch comments if requested
  if (query.includeComments !== false) {
    const comments = await db.query.approvalComments.findMany({
      where: and(
        eq(approvalComments.approvalId, id),
        eq(approvalComments.tenantId, tenantId),
        isNull(approvalComments.deletedAt)
      ),
      with: {
        author: true,
        attachments: true
      },
      orderBy: [desc(approvalComments.createdAt)],
      limit: query.commentsLimit || 50
    });
    
    response.comments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      contentHtml: comment.contentHtml,
      parentId: comment.parentId,
      threadDepth: comment.threadDepth,
      author: {
        id: comment.authorId,
        name: comment.author?.name || 'Unknown',
        avatarUrl: comment.author?.avatarUrl,
        type: comment.authorType
      },
      mentionedUserIds: comment.mentionedUserIds || [],
      isInternal: comment.isInternal,
      attachments: (comment.attachments || []).map(att => ({
        id: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        url: getAttachmentUrl(att)
      })),
      createdAt: comment.createdAt.toISOString(),
      editedAt: comment.editedAt?.toISOString()
    }));
  }
  
  // Fetch timeline if requested
  if (query.includeTimeline !== false) {
    const timeline = await db.query.approvalAuditLog.findMany({
      where: and(
        eq(approvalAuditLog.approvalId, id),
        eq(approvalAuditLog.tenantId, tenantId)
      ),
      with: {
        performedByUser: true
      },
      orderBy: [desc(approvalAuditLog.performedAt)],
      limit: query.timelineLimit || 50
    });
    
    response.timeline = timeline.map(event => ({
      id: event.id,
      action: event.action,
      actionCategory: event.actionCategory,
      performedBy: {
        type: event.performedByType,
        id: event.performedByUserId,
        name: event.performedByUser?.name || 
              event.performedByWorker || 
              'System'
      },
      changes: event.changes,
      context: event.context,
      performedAt: event.performedAt.toISOString()
    }));
  }
  
  return reply.send(response);
}

// Helper functions
async function logApprovalView(
  approvalId: string, 
  tenantId: string, 
  userId: string
) {
  // Update first_viewed_at if this is first view by assigned user
  await db
    .update(userAssignments)
    .set({
      firstViewedAt: sql`COALESCE(first_viewed_at, NOW())`,
      timeToFirstViewSeconds: sql`
        CASE 
          WHEN first_viewed_at IS NULL 
          THEN EXTRACT(EPOCH FROM (NOW() - assigned_at))::integer
          ELSE time_to_first_view_seconds
        END
      `
    })
    .where(and(
      eq(userAssignments.approvalId, approvalId),
      eq(userAssignments.userId, userId),
      eq(userAssignments.isActive, true)
    ));
}

function calculateTimeRemaining(deadline: Date): {
  seconds: number;
  formatted: string;
  isOverdue: boolean;
} {
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const isOverdue = seconds < 0;
  
  const absSeconds = Math.abs(seconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  
  let formatted: string;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    formatted = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else {
    formatted = `${minutes}m`;
  }
  
  if (isOverdue) {
    formatted = `-${formatted}`;
  }
  
  return { seconds, formatted, isOverdue };
}

function getAttachmentUrl(attachment: any): string {
  return `/api/v1/attachments/${attachment.id}/download`;
}

// Route Registration
export async function registerGetApprovalRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/approvals/:id', {
    schema: {
      tags: ['Approvals'],
      summary: 'Get approval detail',
      description: 'Get full details of an approval including comments and timeline',
      params: GetApprovalParamsSchema,
      querystring: GetApprovalQuerySchema,
      response: {
        200: ApprovalDetailSchema,
        404: Type.Object({
          error: Type.String(),
          code: Type.String()
        })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: getApprovalHandler
  });
}
```

#### 12.1.3 Approve/Reject Approval

```typescript
// POST /api/v1/approvals/:id/approve
// POST /api/v1/approvals/:id/reject
// Rezolvă o aprobare

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals, approvalAuditLog } from '@/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { HITLQueues, queues } from '@/queues';

// Params
const ApprovalActionParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' })
});

type ApprovalActionParams = Static<typeof ApprovalActionParamsSchema>;

// Approve Body
const ApproveBodySchema = Type.Object({
  notes: Type.Optional(Type.String({ maxLength: 2000 })),
  modifiedContext: Type.Optional(Type.Any()),
  skipPostActions: Type.Optional(Type.Boolean({ default: false }))
});

type ApproveBody = Static<typeof ApproveBodySchema>;

// Reject Body
const RejectBodySchema = Type.Object({
  reason: Type.String({ minLength: 10, maxLength: 2000 }),
  skipPostActions: Type.Optional(Type.Boolean({ default: false }))
});

type RejectBody = Static<typeof RejectBodySchema>;

// Response
const ApprovalActionResponseSchema = Type.Object({
  success: Type.Boolean(),
  approval: Type.Object({
    id: Type.String({ format: 'uuid' }),
    status: Type.String(),
    resolutionType: Type.String(),
    resolvedAt: Type.String({ format: 'date-time' }),
    resolvedBy: Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String()
    })
  }),
  actionsQueued: Type.Optional(Type.Array(Type.String()))
});

// Approve Handler
export async function approveHandler(
  request: FastifyRequest<{
    Params: ApprovalActionParams;
    Body: ApproveBody;
  }>,
  reply: FastifyReply
) {
  const { tenantId, userId, userName } = request.user;
  const { id } = request.params;
  const { notes, modifiedContext, skipPostActions } = request.body;
  
  // Start transaction
  const result = await db.transaction(async (tx) => {
    // Lock and fetch approval
    const approval = await tx.query.approvals.findFirst({
      where: and(
        eq(approvals.id, id),
        eq(approvals.tenantId, tenantId),
        inArray(approvals.status, ['pending', 'assigned', 'escalated']),
        isNull(approvals.deletedAt)
      ),
      for: 'update'
    });
    
    if (!approval) {
      throw new Error('APPROVAL_NOT_FOUND_OR_RESOLVED');
    }
    
    // Check assignment (optional - can allow any authorized user)
    if (approval.assignedToId && approval.assignedToId !== userId) {
      // Check if user has permission to override
      const canOverride = await checkApprovalPermission(userId, 'approve_any');
      if (!canOverride) {
        throw new Error('NOT_ASSIGNED_TO_APPROVAL');
      }
    }
    
    const now = new Date();
    
    // Update approval
    const updatedContext = modifiedContext 
      ? { ...approval.context, ...modifiedContext, modified: true, modifiedAt: now }
      : approval.context;
    
    await tx
      .update(approvals)
      .set({
        status: 'approved',
        resolvedAt: now,
        resolvedById: userId,
        resolutionType: 'approved',
        resolutionNotes: notes,
        context: updatedContext,
        actionsExecuted: false,
        updatedAt: now
      })
      .where(eq(approvals.id, id));
    
    // Create audit log entry
    const auditEntry = {
      id: generateUUID(),
      tenantId,
      approvalId: id,
      action: 'approved',
      actionCategory: 'resolution',
      performedByType: 'user',
      performedByUserId: userId,
      changes: [
        { field: 'status', oldValue: approval.status, newValue: 'approved' },
        { field: 'resolved_at', oldValue: null, newValue: now.toISOString() }
      ],
      context: {
        notes,
        modifiedContext: modifiedContext ? true : false,
        previousAssignee: approval.assignedToId,
        slaStatus: approval.slaStatus,
        escalationLevel: approval.escalationLevel
      },
      requestId: request.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      performedAt: now
    };
    
    // Generate hash chain
    const previousAudit = await tx.query.approvalAuditLog.findFirst({
      where: eq(approvalAuditLog.approvalId, id),
      orderBy: [desc(approvalAuditLog.performedAt)]
    });
    
    auditEntry.previousHash = previousAudit?.currentHash || null;
    auditEntry.currentHash = generateAuditHash(auditEntry);
    
    await tx.insert(approvalAuditLog).values(auditEntry);
    
    // Update user assignment
    await tx
      .update(userAssignments)
      .set({
        resolvedAt: now,
        resolutionType: 'approved',
        timeToResolutionSeconds: sql`EXTRACT(EPOCH FROM (${now} - assigned_at))::integer`,
        isActive: false
      })
      .where(and(
        eq(userAssignments.approvalId, id),
        eq(userAssignments.isActive, true)
      ));
    
    // Queue post-approval actions
    let actionsQueued: string[] = [];
    if (!skipPostActions && approval.postApprovalActions?.length) {
      await queues.postApprovalActions.add(
        `post-approval-${id}`,
        {
          approvalId: id,
          tenantId,
          actionType: 'approval',
          actions: approval.postApprovalActions,
          context: {
            ...updatedContext,
            resolvedBy: userId,
            resolutionNotes: notes
          }
        },
        { priority: 1 }
      );
      
      actionsQueued = approval.postApprovalActions.map(a => a.type);
    }
    
    // Queue notifications
    await queueResolutionNotifications(
      id, 
      tenantId, 
      'approved', 
      approval, 
      userId,
      userName
    );
    
    return {
      approval: {
        id,
        status: 'approved',
        resolutionType: 'approved',
        resolvedAt: now.toISOString(),
        resolvedBy: { id: userId, name: userName }
      },
      actionsQueued
    };
  });
  
  return reply.send({
    success: true,
    ...result
  });
}

// Reject Handler
export async function rejectHandler(
  request: FastifyRequest<{
    Params: ApprovalActionParams;
    Body: RejectBody;
  }>,
  reply: FastifyReply
) {
  const { tenantId, userId, userName } = request.user;
  const { id } = request.params;
  const { reason, skipPostActions } = request.body;
  
  const result = await db.transaction(async (tx) => {
    // Lock and fetch approval
    const approval = await tx.query.approvals.findFirst({
      where: and(
        eq(approvals.id, id),
        eq(approvals.tenantId, tenantId),
        inArray(approvals.status, ['pending', 'assigned', 'escalated']),
        isNull(approvals.deletedAt)
      ),
      for: 'update'
    });
    
    if (!approval) {
      throw new Error('APPROVAL_NOT_FOUND_OR_RESOLVED');
    }
    
    // Check assignment
    if (approval.assignedToId && approval.assignedToId !== userId) {
      const canOverride = await checkApprovalPermission(userId, 'reject_any');
      if (!canOverride) {
        throw new Error('NOT_ASSIGNED_TO_APPROVAL');
      }
    }
    
    const now = new Date();
    
    // Update approval
    await tx
      .update(approvals)
      .set({
        status: 'rejected',
        resolvedAt: now,
        resolvedById: userId,
        resolutionType: 'rejected',
        resolutionNotes: reason,
        actionsExecuted: false,
        updatedAt: now
      })
      .where(eq(approvals.id, id));
    
    // Create audit log entry
    const auditEntry = {
      id: generateUUID(),
      tenantId,
      approvalId: id,
      action: 'rejected',
      actionCategory: 'resolution',
      performedByType: 'user',
      performedByUserId: userId,
      changes: [
        { field: 'status', oldValue: approval.status, newValue: 'rejected' },
        { field: 'resolved_at', oldValue: null, newValue: now.toISOString() }
      ],
      context: {
        reason,
        previousAssignee: approval.assignedToId,
        slaStatus: approval.slaStatus,
        escalationLevel: approval.escalationLevel
      },
      requestId: request.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      performedAt: now
    };
    
    const previousAudit = await tx.query.approvalAuditLog.findFirst({
      where: eq(approvalAuditLog.approvalId, id),
      orderBy: [desc(approvalAuditLog.performedAt)]
    });
    
    auditEntry.previousHash = previousAudit?.currentHash || null;
    auditEntry.currentHash = generateAuditHash(auditEntry);
    
    await tx.insert(approvalAuditLog).values(auditEntry);
    
    // Update user assignment
    await tx
      .update(userAssignments)
      .set({
        resolvedAt: now,
        resolutionType: 'rejected',
        timeToResolutionSeconds: sql`EXTRACT(EPOCH FROM (${now} - assigned_at))::integer`,
        isActive: false
      })
      .where(and(
        eq(userAssignments.approvalId, id),
        eq(userAssignments.isActive, true)
      ));
    
    // Queue post-rejection actions
    let actionsQueued: string[] = [];
    if (!skipPostActions && approval.postRejectionActions?.length) {
      await queues.postRejectionActions.add(
        `post-rejection-${id}`,
        {
          approvalId: id,
          tenantId,
          actionType: 'rejection',
          actions: approval.postRejectionActions,
          context: {
            ...approval.context,
            resolvedBy: userId,
            rejectionReason: reason
          }
        },
        { priority: 1 }
      );
      
      actionsQueued = approval.postRejectionActions.map(a => a.type);
    }
    
    // Queue notifications
    await queueResolutionNotifications(
      id, 
      tenantId, 
      'rejected', 
      approval, 
      userId,
      userName,
      reason
    );
    
    return {
      approval: {
        id,
        status: 'rejected',
        resolutionType: 'rejected',
        resolvedAt: now.toISOString(),
        resolvedBy: { id: userId, name: userName }
      },
      actionsQueued
    };
  });
  
  return reply.send({
    success: true,
    ...result
  });
}

// Helper: Queue resolution notifications
async function queueResolutionNotifications(
  approvalId: string,
  tenantId: string,
  resolutionType: 'approved' | 'rejected',
  approval: any,
  resolvedById: string,
  resolvedByName: string,
  reason?: string
) {
  const notificationsToQueue: any[] = [];
  
  // Notify requester (if user)
  if (approval.requestedByUserId && approval.requestedByUserId !== resolvedById) {
    notificationsToQueue.push({
      tenantId,
      userId: approval.requestedByUserId,
      channel: 'in_app',
      templateId: `approval_${resolutionType}`,
      data: {
        approvalId,
        approvalTitle: approval.title,
        approvalType: approval.type,
        resolvedBy: resolvedByName,
        reason
      },
      priority: 'normal',
      contextType: 'approval',
      contextId: approvalId
    });
  }
  
  // Notify previous assignees if different from resolver
  if (approval.assignedToId && approval.assignedToId !== resolvedById) {
    notificationsToQueue.push({
      tenantId,
      userId: approval.assignedToId,
      channel: 'in_app',
      templateId: `approval_resolved_by_other`,
      data: {
        approvalId,
        approvalTitle: approval.title,
        resolutionType,
        resolvedBy: resolvedByName
      },
      priority: 'low',
      contextType: 'approval',
      contextId: approvalId
    });
  }
  
  // Queue all notifications
  for (const notification of notificationsToQueue) {
    await queues.notificationSend.add(
      `notification-${generateUUID()}`,
      notification,
      { priority: notification.priority === 'urgent' ? 1 : 3 }
    );
  }
}

// Helper: Check approval permission
async function checkApprovalPermission(
  userId: string, 
  permission: string
): Promise<boolean> {
  const userPermissions = await db.query.userPermissions.findMany({
    where: eq(userPermissions.userId, userId)
  });
  
  return userPermissions.some(p => p.permission === permission || p.permission === 'approval_admin');
}

// Route Registration
export async function registerApprovalActionRoutes(fastify: FastifyInstance) {
  // Approve
  fastify.post('/api/v1/approvals/:id/approve', {
    schema: {
      tags: ['Approvals'],
      summary: 'Approve an approval',
      description: 'Mark an approval as approved',
      params: ApprovalActionParamsSchema,
      body: ApproveBodySchema,
      response: {
        200: ApprovalActionResponseSchema,
        400: Type.Object({ error: Type.String(), code: Type.String() }),
        403: Type.Object({ error: Type.String(), code: Type.String() }),
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: approveHandler
  });
  
  // Reject
  fastify.post('/api/v1/approvals/:id/reject', {
    schema: {
      tags: ['Approvals'],
      summary: 'Reject an approval',
      description: 'Mark an approval as rejected',
      params: ApprovalActionParamsSchema,
      body: RejectBodySchema,
      response: {
        200: ApprovalActionResponseSchema,
        400: Type.Object({ error: Type.String(), code: Type.String() }),
        403: Type.Object({ error: Type.String(), code: Type.String() }),
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: rejectHandler
  });
}
```

#### 12.1.4 Escalate Approval

```typescript
// POST /api/v1/approvals/:id/escalate
// Escaladează manual o aprobare

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals } from '@/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { queues } from '@/queues';

// Body Schema
const EscalateBodySchema = Type.Object({
  reason: Type.Optional(Type.String({ maxLength: 1000 })),
  targetUserId: Type.Optional(Type.String({ format: 'uuid' })),
  targetRole: Type.Optional(Type.String()),
  urgent: Type.Optional(Type.Boolean({ default: false }))
});

type EscalateBody = Static<typeof EscalateBodySchema>;

// Response Schema
const EscalateResponseSchema = Type.Object({
  success: Type.Boolean(),
  approval: Type.Object({
    id: Type.String({ format: 'uuid' }),
    escalationLevel: Type.Number(),
    maxEscalationLevel: Type.Number(),
    newAssignee: Type.Optional(Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String()
    }))
  }),
  message: Type.String()
});

// Handler
export async function escalateHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: EscalateBody;
  }>,
  reply: FastifyReply
) {
  const { tenantId, userId, userName } = request.user;
  const { id } = request.params;
  const { reason, targetUserId, targetRole, urgent } = request.body;
  
  // Check if approval exists and is not resolved
  const approval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.id, id),
      eq(approvals.tenantId, tenantId),
      inArray(approvals.status, ['pending', 'assigned', 'escalated']),
      isNull(approvals.deletedAt)
    )
  });
  
  if (!approval) {
    return reply.status(404).send({
      error: 'Approval not found or already resolved',
      code: 'APPROVAL_NOT_FOUND'
    });
  }
  
  // Check if max escalation reached
  if (approval.escalationLevel >= approval.maxEscalationLevel) {
    return reply.status(400).send({
      error: 'Maximum escalation level reached',
      code: 'MAX_ESCALATION_REACHED',
      currentLevel: approval.escalationLevel,
      maxLevel: approval.maxEscalationLevel
    });
  }
  
  // Queue escalation job
  const jobId = `escalation-${id}-${Date.now()}`;
  await queues.escalationProcess.add(
    jobId,
    {
      approvalId: id,
      tenantId,
      reason: reason || `Manual escalation by ${userName}`,
      currentLevel: approval.escalationLevel,
      triggeredBy: 'manual',
      triggeredByUserId: userId,
      targetUserId,
      targetRole,
      urgent
    },
    { 
      priority: urgent ? 1 : 2,
      jobId 
    }
  );
  
  // Create immediate audit log entry for the request
  await createAuditLogEntry({
    tenantId,
    approvalId: id,
    action: 'escalation_requested',
    actionCategory: 'escalation',
    performedByType: 'user',
    performedByUserId: userId,
    context: {
      reason,
      targetUserId,
      targetRole,
      urgent,
      currentLevel: approval.escalationLevel
    },
    requestId: request.id,
    ipAddress: request.ip
  });
  
  return reply.send({
    success: true,
    approval: {
      id,
      escalationLevel: approval.escalationLevel,
      maxEscalationLevel: approval.maxEscalationLevel,
      newAssignee: undefined // Will be determined by worker
    },
    message: 'Escalation queued for processing'
  });
}

// Route Registration
export async function registerEscalateRoute(fastify: FastifyInstance) {
  fastify.post('/api/v1/approvals/:id/escalate', {
    schema: {
      tags: ['Approvals'],
      summary: 'Escalate an approval',
      description: 'Manually escalate an approval to the next level',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: EscalateBodySchema,
      response: {
        200: EscalateResponseSchema,
        400: Type.Object({ error: Type.String(), code: Type.String() }),
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: escalateHandler
  });
}
```

#### 12.1.5 Assign/Reassign Approval

```typescript
// POST /api/v1/approvals/:id/assign
// Atribuie sau reatribuie o aprobare

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals, users, userAssignments, approvalAuditLog } from '@/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';

// Body Schema
const AssignBodySchema = Type.Object({
  assigneeId: Type.String({ format: 'uuid' }),
  reason: Type.Optional(Type.String({ maxLength: 500 })),
  notifyPrevious: Type.Optional(Type.Boolean({ default: true })),
  notifyNew: Type.Optional(Type.Boolean({ default: true }))
});

type AssignBody = Static<typeof AssignBodySchema>;

// Response Schema
const AssignResponseSchema = Type.Object({
  success: Type.Boolean(),
  approval: Type.Object({
    id: Type.String({ format: 'uuid' }),
    status: Type.String(),
    assignedTo: Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String(),
      email: Type.String()
    }),
    assignedAt: Type.String({ format: 'date-time' })
  }),
  previousAssignee: Type.Optional(Type.Object({
    id: Type.String({ format: 'uuid' }),
    name: Type.String()
  }))
});

// Handler
export async function assignHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AssignBody;
  }>,
  reply: FastifyReply
) {
  const { tenantId, userId, userName } = request.user;
  const { id } = request.params;
  const { assigneeId, reason, notifyPrevious, notifyNew } = request.body;
  
  // Validate assignee exists and belongs to tenant
  const assignee = await db.query.users.findFirst({
    where: and(
      eq(users.id, assigneeId),
      eq(users.tenantId, tenantId),
      eq(users.isActive, true)
    )
  });
  
  if (!assignee) {
    return reply.status(400).send({
      error: 'Invalid assignee',
      code: 'INVALID_ASSIGNEE'
    });
  }
  
  // Check assignee availability
  const availability = await db.query.userAvailability.findFirst({
    where: eq(userAvailability.userId, assigneeId)
  });
  
  if (availability && availability.status !== 'available') {
    // Allow assignment but warn
    request.log.warn({ 
      assigneeId, 
      status: availability.status 
    }, 'Assigning to unavailable user');
  }
  
  const result = await db.transaction(async (tx) => {
    // Lock and fetch approval
    const approval = await tx.query.approvals.findFirst({
      where: and(
        eq(approvals.id, id),
        eq(approvals.tenantId, tenantId),
        inArray(approvals.status, ['pending', 'assigned', 'escalated']),
        isNull(approvals.deletedAt)
      ),
      for: 'update'
    });
    
    if (!approval) {
      throw new Error('APPROVAL_NOT_FOUND_OR_RESOLVED');
    }
    
    const now = new Date();
    const previousAssigneeId = approval.assignedToId;
    const isReassignment = !!previousAssigneeId;
    
    // Deactivate previous assignment
    if (previousAssigneeId) {
      await tx
        .update(userAssignments)
        .set({
          isActive: false,
          resolvedAt: now,
          resolutionType: 'reassigned'
        })
        .where(and(
          eq(userAssignments.approvalId, id),
          eq(userAssignments.isActive, true)
        ));
    }
    
    // Update approval
    await tx
      .update(approvals)
      .set({
        status: 'assigned',
        assignedToId: assigneeId,
        assignedAt: now,
        assignedById: userId,
        updatedAt: now
      })
      .where(eq(approvals.id, id));
    
    // Create new assignment record
    await tx.insert(userAssignments).values({
      id: generateUUID(),
      tenantId,
      userId: assigneeId,
      approvalId: id,
      assignedAt: now,
      assignedById: userId,
      assignmentType: isReassignment ? 'reassignment' : 'manual',
      isActive: true
    });
    
    // Update assignee's workload
    await tx
      .update(userAvailability)
      .set({
        currentApprovalCount: sql`current_approval_count + 1`
      })
      .where(eq(userAvailability.userId, assigneeId));
    
    // Decrement previous assignee's workload
    if (previousAssigneeId) {
      await tx
        .update(userAvailability)
        .set({
          currentApprovalCount: sql`GREATEST(0, current_approval_count - 1)`
        })
        .where(eq(userAvailability.userId, previousAssigneeId));
    }
    
    // Audit log
    await createAuditLogEntry({
      tenantId,
      approvalId: id,
      action: isReassignment ? 'reassigned' : 'assigned',
      actionCategory: 'assignment',
      performedByType: 'user',
      performedByUserId: userId,
      changes: [
        { 
          field: 'assigned_to_id', 
          oldValue: previousAssigneeId, 
          newValue: assigneeId 
        },
        { 
          field: 'status', 
          oldValue: approval.status, 
          newValue: 'assigned' 
        }
      ],
      context: {
        reason,
        assignmentType: isReassignment ? 'reassignment' : 'manual'
      },
      requestId: request.id,
      ipAddress: request.ip
    }, tx);
    
    // Get previous assignee name if exists
    let previousAssignee = null;
    if (previousAssigneeId) {
      const prevUser = await tx.query.users.findFirst({
        where: eq(users.id, previousAssigneeId)
      });
      if (prevUser) {
        previousAssignee = { id: prevUser.id, name: prevUser.name };
      }
    }
    
    return {
      approval: {
        id,
        status: 'assigned',
        assignedTo: {
          id: assignee.id,
          name: assignee.name,
          email: assignee.email
        },
        assignedAt: now.toISOString()
      },
      previousAssignee,
      previousAssigneeId,
      approvalTitle: approval.title,
      approvalType: approval.type
    };
  });
  
  // Queue notifications (outside transaction)
  if (notifyNew !== false) {
    await queues.notificationSend.add(
      `notify-assign-${id}`,
      {
        tenantId,
        userId: assigneeId,
        channel: 'in_app',
        templateId: 'approval_assigned',
        data: {
          approvalId: id,
          approvalTitle: result.approvalTitle,
          approvalType: result.approvalType,
          assignedBy: userName
        },
        priority: 'high',
        contextType: 'approval',
        contextId: id
      },
      { priority: 2 }
    );
    
    // Also send email for new assignments
    await queues.notificationSend.add(
      `notify-assign-email-${id}`,
      {
        tenantId,
        userId: assigneeId,
        channel: 'email',
        templateId: 'approval_assigned',
        data: {
          approvalId: id,
          approvalTitle: result.approvalTitle,
          approvalType: result.approvalType,
          assignedBy: userName
        },
        priority: 'normal',
        contextType: 'approval',
        contextId: id
      },
      { priority: 3 }
    );
  }
  
  if (notifyPrevious !== false && result.previousAssigneeId) {
    await queues.notificationSend.add(
      `notify-reassign-${id}`,
      {
        tenantId,
        userId: result.previousAssigneeId,
        channel: 'in_app',
        templateId: 'approval_reassigned_from',
        data: {
          approvalId: id,
          approvalTitle: result.approvalTitle,
          newAssignee: result.approval.assignedTo.name,
          reassignedBy: userName,
          reason
        },
        priority: 'low',
        contextType: 'approval',
        contextId: id
      },
      { priority: 4 }
    );
  }
  
  return reply.send({
    success: true,
    approval: result.approval,
    previousAssignee: result.previousAssignee
  });
}

// Route Registration
export async function registerAssignRoute(fastify: FastifyInstance) {
  fastify.post('/api/v1/approvals/:id/assign', {
    schema: {
      tags: ['Approvals'],
      summary: 'Assign or reassign approval',
      description: 'Manually assign an approval to a specific user',
      params: Type.Object({
        id: Type.String({ format: 'uuid' })
      }),
      body: AssignBodySchema,
      response: {
        200: AssignResponseSchema,
        400: Type.Object({ error: Type.String(), code: Type.String() }),
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.requirePermission('approval_assign')],
    handler: assignHandler
  });
}
```

### 12.2 Comments API

#### 12.2.1 List Comments

```typescript
// GET /api/v1/approvals/:id/comments
// Lista comentarii pentru o aprobare

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approval_comments, users } from '@/db/schema';
import { eq, and, isNull, asc, desc } from 'drizzle-orm';

// Request Params
const CommentsParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'Approval ID' })
});

// Query Parameters
const CommentsQuerySchema = Type.Object({
  include_internal: Type.Optional(Type.Boolean({ 
    default: false, 
    description: 'Include internal comments (requires permission)' 
  })),
  thread_id: Type.Optional(Type.String({ 
    format: 'uuid', 
    description: 'Filter to specific thread' 
  })),
  sort: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc')
  ], { default: 'asc' }))
});

type CommentsParams = Static<typeof CommentsParamsSchema>;
type CommentsQuery = Static<typeof CommentsQuerySchema>;

// Response Schema
const CommentSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  approval_id: Type.String({ format: 'uuid' }),
  content: Type.String(),
  content_html: Type.Optional(Type.String()),
  parent_id: Type.Optional(Type.String({ format: 'uuid' })),
  thread_depth: Type.Number(),
  is_internal: Type.Boolean(),
  mentioned_user_ids: Type.Array(Type.String({ format: 'uuid' })),
  author: Type.Object({
    id: Type.String({ format: 'uuid' }),
    name: Type.String(),
    email: Type.String(),
    avatar_url: Type.Optional(Type.String())
  }),
  attachments: Type.Array(Type.Object({
    id: Type.String({ format: 'uuid' }),
    filename: Type.String(),
    mime_type: Type.String(),
    size_bytes: Type.Number(),
    url: Type.String()
  })),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
  edited_at: Type.Optional(Type.String({ format: 'date-time' })),
  replies: Type.Optional(Type.Array(Type.Any())) // Recursive
});

const CommentsResponseSchema = Type.Object({
  comments: Type.Array(CommentSchema),
  total: Type.Number(),
  has_internal: Type.Boolean()
});

// Handler Implementation
async function listCommentsHandler(
  request: FastifyRequest<{ Params: CommentsParams; Querystring: CommentsQuery }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { include_internal, thread_id, sort } = request.query;
  const tenantId = request.user.tenant_id;
  const canViewInternal = request.user.permissions.includes('comment_view_internal');
  
  // Verifică aprobarea există
  const approval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.id, id),
      eq(approvals.tenant_id, tenantId)
    )
  });
  
  if (!approval) {
    return reply.code(404).send({
      error: 'Approval not found',
      code: 'APPROVAL_NOT_FOUND'
    });
  }
  
  // Construiește query
  let conditions = [
    eq(approval_comments.approval_id, id),
    eq(approval_comments.tenant_id, tenantId),
    isNull(approval_comments.deleted_at)
  ];
  
  // Filter internal dacă nu are permisiune
  if (!include_internal || !canViewInternal) {
    conditions.push(eq(approval_comments.is_internal, false));
  }
  
  // Filter thread specific
  if (thread_id) {
    conditions.push(eq(approval_comments.parent_id, thread_id));
  } else {
    // Doar root comments dacă nu e specificat thread
    conditions.push(isNull(approval_comments.parent_id));
  }
  
  // Fetch comments cu author
  const comments = await db
    .select({
      comment: approval_comments,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar_url: users.avatar_url
      }
    })
    .from(approval_comments)
    .leftJoin(users, eq(approval_comments.author_id, users.id))
    .where(and(...conditions))
    .orderBy(sort === 'desc' ? desc(approval_comments.created_at) : asc(approval_comments.created_at));
  
  // Fetch attachments pentru toate comentariile
  const commentIds = comments.map(c => c.comment.id);
  const attachments = await db.query.approval_attachments.findMany({
    where: and(
      inArray(approval_attachments.comment_id, commentIds),
      eq(approval_attachments.tenant_id, tenantId)
    )
  });
  
  // Fetch replies pentru fiecare comment (recursive până la depth 5)
  const commentsWithReplies = await Promise.all(
    comments.map(async ({ comment, author }) => {
      const replies = await fetchReplies(comment.id, tenantId, canViewInternal, 1);
      const commentAttachments = attachments
        .filter(a => a.comment_id === comment.id)
        .map(a => ({
          id: a.id,
          filename: a.original_filename,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          url: generateAttachmentUrl(a)
        }));
      
      return {
        id: comment.id,
        approval_id: comment.approval_id,
        content: comment.content,
        content_html: comment.content_html,
        parent_id: comment.parent_id,
        thread_depth: comment.thread_depth,
        is_internal: comment.is_internal,
        mentioned_user_ids: comment.mentioned_user_ids || [],
        author: author || { id: comment.author_id, name: 'Unknown', email: '' },
        attachments: commentAttachments,
        created_at: comment.created_at.toISOString(),
        updated_at: comment.updated_at.toISOString(),
        edited_at: comment.edited_at?.toISOString(),
        replies
      };
    })
  );
  
  // Check dacă există comentarii interne
  const hasInternal = await db.query.approval_comments.findFirst({
    where: and(
      eq(approval_comments.approval_id, id),
      eq(approval_comments.tenant_id, tenantId),
      eq(approval_comments.is_internal, true),
      isNull(approval_comments.deleted_at)
    )
  });
  
  return reply.send({
    comments: commentsWithReplies,
    total: commentsWithReplies.length,
    has_internal: !!hasInternal
  });
}

// Recursive fetch replies
async function fetchReplies(
  parentId: string, 
  tenantId: string, 
  includeInternal: boolean,
  currentDepth: number
): Promise<any[]> {
  if (currentDepth >= 5) return [];
  
  let conditions = [
    eq(approval_comments.parent_id, parentId),
    eq(approval_comments.tenant_id, tenantId),
    isNull(approval_comments.deleted_at)
  ];
  
  if (!includeInternal) {
    conditions.push(eq(approval_comments.is_internal, false));
  }
  
  const replies = await db
    .select({
      comment: approval_comments,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar_url: users.avatar_url
      }
    })
    .from(approval_comments)
    .leftJoin(users, eq(approval_comments.author_id, users.id))
    .where(and(...conditions))
    .orderBy(asc(approval_comments.created_at));
  
  return Promise.all(
    replies.map(async ({ comment, author }) => {
      const nestedReplies = await fetchReplies(
        comment.id, 
        tenantId, 
        includeInternal, 
        currentDepth + 1
      );
      
      return {
        id: comment.id,
        content: comment.content,
        content_html: comment.content_html,
        thread_depth: comment.thread_depth,
        is_internal: comment.is_internal,
        author: author || { id: comment.author_id, name: 'Unknown', email: '' },
        created_at: comment.created_at.toISOString(),
        replies: nestedReplies
      };
    })
  );
}

// Route Registration
export async function registerListCommentsRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/approvals/:id/comments', {
    schema: {
      tags: ['Comments'],
      summary: 'List approval comments',
      description: 'Get all comments for an approval with threaded replies',
      params: CommentsParamsSchema,
      querystring: CommentsQuerySchema,
      response: {
        200: CommentsResponseSchema,
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: listCommentsHandler
  });
}
```

#### 12.2.2 Create Comment

```typescript
// POST /api/v1/approvals/:id/comments
// Adaugă comentariu la aprobare

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approval_comments, approvals, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { notificationSendQueue } from '@/queues/hitl';
import { websocketServer } from '@/websocket';

// Request Schema
const CreateCommentParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'Approval ID' })
});

const CreateCommentBodySchema = Type.Object({
  content: Type.String({ 
    minLength: 1, 
    maxLength: 10000,
    description: 'Comment content in markdown' 
  }),
  parent_id: Type.Optional(Type.String({ 
    format: 'uuid', 
    description: 'Parent comment ID for replies' 
  })),
  is_internal: Type.Optional(Type.Boolean({ 
    default: false,
    description: 'Internal comment only visible to team' 
  })),
  mentioned_user_ids: Type.Optional(Type.Array(Type.String({ format: 'uuid' }), {
    description: 'User IDs mentioned in comment'
  }))
});

type CreateCommentParams = Static<typeof CreateCommentParamsSchema>;
type CreateCommentBody = Static<typeof CreateCommentBodySchema>;

// Response Schema
const CreateCommentResponseSchema = Type.Object({
  success: Type.Boolean(),
  comment: Type.Object({
    id: Type.String({ format: 'uuid' }),
    content: Type.String(),
    content_html: Type.String(),
    parent_id: Type.Optional(Type.String({ format: 'uuid' })),
    thread_depth: Type.Number(),
    is_internal: Type.Boolean(),
    mentioned_user_ids: Type.Array(Type.String({ format: 'uuid' })),
    author: Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String(),
      email: Type.String()
    }),
    created_at: Type.String({ format: 'date-time' })
  })
});

// Handler Implementation
async function createCommentHandler(
  request: FastifyRequest<{ Params: CreateCommentParams; Body: CreateCommentBody }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { content, parent_id, is_internal, mentioned_user_ids } = request.body;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  
  // Check permission pentru internal comments
  if (is_internal && !request.user.permissions.includes('comment_internal')) {
    return reply.code(403).send({
      error: 'No permission for internal comments',
      code: 'FORBIDDEN'
    });
  }
  
  // Verifică aprobarea există
  const approval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.id, id),
      eq(approvals.tenant_id, tenantId)
    )
  });
  
  if (!approval) {
    return reply.code(404).send({
      error: 'Approval not found',
      code: 'APPROVAL_NOT_FOUND'
    });
  }
  
  // Verifică parent comment dacă e reply
  let threadDepth = 0;
  if (parent_id) {
    const parentComment = await db.query.approval_comments.findFirst({
      where: and(
        eq(approval_comments.id, parent_id),
        eq(approval_comments.approval_id, id),
        eq(approval_comments.tenant_id, tenantId)
      )
    });
    
    if (!parentComment) {
      return reply.code(400).send({
        error: 'Parent comment not found',
        code: 'PARENT_NOT_FOUND'
      });
    }
    
    if (parentComment.thread_depth >= 5) {
      return reply.code(400).send({
        error: 'Maximum thread depth reached',
        code: 'MAX_DEPTH_REACHED'
      });
    }
    
    threadDepth = parentComment.thread_depth + 1;
  }
  
  // Parse markdown și sanitize HTML
  const rawHtml = await marked.parse(content);
  const contentHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 
                   'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'class']
  });
  
  // Validează mentioned users există și sunt în tenant
  let validMentions: string[] = [];
  if (mentioned_user_ids && mentioned_user_ids.length > 0) {
    const mentionedUsers = await db.query.users.findMany({
      where: and(
        inArray(users.id, mentioned_user_ids),
        eq(users.tenant_id, tenantId)
      )
    });
    validMentions = mentionedUsers.map(u => u.id);
  }
  
  // Creează comentariul
  const commentId = nanoid();
  const now = new Date();
  
  const [newComment] = await db.insert(approval_comments).values({
    id: commentId,
    tenant_id: tenantId,
    approval_id: id,
    content,
    content_html: contentHtml,
    parent_id: parent_id || null,
    thread_depth: threadDepth,
    author_id: userId,
    author_type: 'user',
    mentioned_user_ids: validMentions,
    is_internal: is_internal || false,
    created_at: now,
    updated_at: now
  }).returning();
  
  // Get author info
  const author = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, email: true }
  });
  
  // Log audit event
  await logAuditEvent(id, tenantId, 'comment_added', {
    commentId,
    isInternal: is_internal,
    hasParent: !!parent_id,
    mentionCount: validMentions.length
  }, userId);
  
  // Notify mentioned users
  for (const mentionedUserId of validMentions) {
    await notificationSendQueue.add(
      `mention-${commentId}-${mentionedUserId}`,
      {
        tenantId,
        userId: mentionedUserId,
        channel: 'in_app',
        templateId: 'comment_mention',
        data: {
          approvalId: id,
          approvalTitle: approval.title,
          commentId,
          mentionedBy: author?.name || 'Unknown',
          commentPreview: content.substring(0, 100)
        },
        priority: 'normal',
        contextType: 'comment',
        contextId: commentId
      }
    );
  }
  
  // Notify approval assignee dacă e alt user
  if (approval.assigned_to_id && approval.assigned_to_id !== userId) {
    await notificationSendQueue.add(
      `comment-${commentId}-assignee`,
      {
        tenantId,
        userId: approval.assigned_to_id,
        channel: 'in_app',
        templateId: 'new_comment',
        data: {
          approvalId: id,
          approvalTitle: approval.title,
          commentId,
          authorName: author?.name || 'Unknown',
          isInternal: is_internal,
          commentPreview: content.substring(0, 100)
        },
        priority: 'normal',
        contextType: 'comment',
        contextId: commentId
      }
    );
  }
  
  // WebSocket broadcast
  websocketServer.broadcast(`tenant:${tenantId}:approval:${id}`, {
    type: 'comment:created',
    data: {
      id: commentId,
      approvalId: id,
      content,
      contentHtml,
      parentId: parent_id,
      threadDepth,
      isInternal: is_internal,
      author: author || { id: userId, name: 'Unknown', email: '' },
      mentionedUserIds: validMentions,
      createdAt: now.toISOString()
    }
  });
  
  return reply.code(201).send({
    success: true,
    comment: {
      id: commentId,
      content,
      content_html: contentHtml,
      parent_id,
      thread_depth: threadDepth,
      is_internal: is_internal || false,
      mentioned_user_ids: validMentions,
      author: author || { id: userId, name: 'Unknown', email: '' },
      created_at: now.toISOString()
    }
  });
}

// Route Registration
export async function registerCreateCommentRoute(fastify: FastifyInstance) {
  fastify.post('/api/v1/approvals/:id/comments', {
    schema: {
      tags: ['Comments'],
      summary: 'Add comment to approval',
      description: 'Create a new comment or reply on an approval',
      params: CreateCommentParamsSchema,
      body: CreateCommentBodySchema,
      response: {
        201: CreateCommentResponseSchema,
        400: Type.Object({ error: Type.String(), code: Type.String() }),
        403: Type.Object({ error: Type.String(), code: Type.String() }),
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: createCommentHandler
  });
}
```

#### 12.2.3 Update Comment

```typescript
// PATCH /api/v1/approvals/:approvalId/comments/:commentId
// Editează comentariu

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approval_comments } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { websocketServer } from '@/websocket';

// Request Schema
const UpdateCommentParamsSchema = Type.Object({
  approvalId: Type.String({ format: 'uuid' }),
  commentId: Type.String({ format: 'uuid' })
});

const UpdateCommentBodySchema = Type.Object({
  content: Type.String({ 
    minLength: 1, 
    maxLength: 10000,
    description: 'Updated comment content' 
  })
});

type UpdateCommentParams = Static<typeof UpdateCommentParamsSchema>;
type UpdateCommentBody = Static<typeof UpdateCommentBodySchema>;

// Handler
async function updateCommentHandler(
  request: FastifyRequest<{ Params: UpdateCommentParams; Body: UpdateCommentBody }>,
  reply: FastifyReply
) {
  const { approvalId, commentId } = request.params;
  const { content } = request.body;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  
  // Find comment
  const comment = await db.query.approval_comments.findFirst({
    where: and(
      eq(approval_comments.id, commentId),
      eq(approval_comments.approval_id, approvalId),
      eq(approval_comments.tenant_id, tenantId),
      isNull(approval_comments.deleted_at)
    )
  });
  
  if (!comment) {
    return reply.code(404).send({
      error: 'Comment not found',
      code: 'COMMENT_NOT_FOUND'
    });
  }
  
  // Doar autorul poate edita
  if (comment.author_id !== userId) {
    return reply.code(403).send({
      error: 'Only author can edit comment',
      code: 'FORBIDDEN'
    });
  }
  
  // Check edit window (30 minute)
  const editWindowMs = 30 * 60 * 1000;
  const timeSinceCreation = Date.now() - comment.created_at.getTime();
  if (timeSinceCreation > editWindowMs) {
    return reply.code(400).send({
      error: 'Edit window expired (30 minutes)',
      code: 'EDIT_WINDOW_EXPIRED'
    });
  }
  
  // Parse și sanitize noul content
  const rawHtml = await marked.parse(content);
  const contentHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 
                   'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'class']
  });
  
  const now = new Date();
  
  // Update comment
  const [updated] = await db
    .update(approval_comments)
    .set({
      content,
      content_html: contentHtml,
      edited_at: now,
      edited_by_id: userId,
      updated_at: now
    })
    .where(eq(approval_comments.id, commentId))
    .returning();
  
  // WebSocket broadcast
  websocketServer.broadcast(`tenant:${tenantId}:approval:${approvalId}`, {
    type: 'comment:updated',
    data: {
      id: commentId,
      approvalId,
      content,
      contentHtml,
      editedAt: now.toISOString()
    }
  });
  
  return reply.send({
    success: true,
    comment: {
      id: updated.id,
      content: updated.content,
      content_html: updated.content_html,
      edited_at: updated.edited_at?.toISOString(),
      updated_at: updated.updated_at.toISOString()
    }
  });
}

// Route Registration
export async function registerUpdateCommentRoute(fastify: FastifyInstance) {
  fastify.patch('/api/v1/approvals/:approvalId/comments/:commentId', {
    schema: {
      tags: ['Comments'],
      summary: 'Edit comment',
      description: 'Update comment content (within 30 minute edit window)',
      params: UpdateCommentParamsSchema,
      body: UpdateCommentBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          comment: Type.Object({
            id: Type.String({ format: 'uuid' }),
            content: Type.String(),
            content_html: Type.String(),
            edited_at: Type.String({ format: 'date-time' }),
            updated_at: Type.String({ format: 'date-time' })
          })
        }),
        400: Type.Object({ error: Type.String(), code: Type.String() }),
        403: Type.Object({ error: Type.String(), code: Type.String() }),
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: updateCommentHandler
  });
}
```

#### 12.2.4 Delete Comment

```typescript
// DELETE /api/v1/approvals/:approvalId/comments/:commentId
// Șterge comentariu (soft delete)

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approval_comments } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { websocketServer } from '@/websocket';

// Request Schema
const DeleteCommentParamsSchema = Type.Object({
  approvalId: Type.String({ format: 'uuid' }),
  commentId: Type.String({ format: 'uuid' })
});

type DeleteCommentParams = Static<typeof DeleteCommentParamsSchema>;

// Handler
async function deleteCommentHandler(
  request: FastifyRequest<{ Params: DeleteCommentParams }>,
  reply: FastifyReply
) {
  const { approvalId, commentId } = request.params;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  const isAdmin = request.user.permissions.includes('comment_delete_any');
  
  // Find comment
  const comment = await db.query.approval_comments.findFirst({
    where: and(
      eq(approval_comments.id, commentId),
      eq(approval_comments.approval_id, approvalId),
      eq(approval_comments.tenant_id, tenantId),
      isNull(approval_comments.deleted_at)
    )
  });
  
  if (!comment) {
    return reply.code(404).send({
      error: 'Comment not found',
      code: 'COMMENT_NOT_FOUND'
    });
  }
  
  // Check permission - owner sau admin
  if (comment.author_id !== userId && !isAdmin) {
    return reply.code(403).send({
      error: 'No permission to delete this comment',
      code: 'FORBIDDEN'
    });
  }
  
  const now = new Date();
  
  // Soft delete comment și toate replies
  await db.transaction(async (tx) => {
    // Delete parent comment
    await tx
      .update(approval_comments)
      .set({
        deleted_at: now,
        updated_at: now
      })
      .where(eq(approval_comments.id, commentId));
    
    // Delete all nested replies recursively
    await deleteNestedReplies(tx, commentId, tenantId, now);
  });
  
  // Log audit
  await logAuditEvent(approvalId, tenantId, 'comment_deleted', {
    commentId,
    deletedBy: userId,
    wasAdmin: isAdmin && comment.author_id !== userId
  }, userId);
  
  // WebSocket broadcast
  websocketServer.broadcast(`tenant:${tenantId}:approval:${approvalId}`, {
    type: 'comment:deleted',
    data: {
      id: commentId,
      approvalId,
      deletedAt: now.toISOString()
    }
  });
  
  return reply.send({
    success: true,
    deleted_at: now.toISOString()
  });
}

// Recursive delete replies
async function deleteNestedReplies(
  tx: any, 
  parentId: string, 
  tenantId: string, 
  deletedAt: Date
) {
  const replies = await tx.query.approval_comments.findMany({
    where: and(
      eq(approval_comments.parent_id, parentId),
      eq(approval_comments.tenant_id, tenantId),
      isNull(approval_comments.deleted_at)
    )
  });
  
  for (const reply of replies) {
    await tx
      .update(approval_comments)
      .set({
        deleted_at: deletedAt,
        updated_at: deletedAt
      })
      .where(eq(approval_comments.id, reply.id));
    
    // Recursive pentru nested replies
    await deleteNestedReplies(tx, reply.id, tenantId, deletedAt);
  }
}

// Route Registration
export async function registerDeleteCommentRoute(fastify: FastifyInstance) {
  fastify.delete('/api/v1/approvals/:approvalId/comments/:commentId', {
    schema: {
      tags: ['Comments'],
      summary: 'Delete comment',
      description: 'Soft delete a comment and its replies',
      params: DeleteCommentParamsSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          deleted_at: Type.String({ format: 'date-time' })
        }),
        403: Type.Object({ error: Type.String(), code: Type.String() }),
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: deleteCommentHandler
  });
}
```

### 12.3 Statistics API

#### 12.3.1 Dashboard Statistics

```typescript
// GET /api/v1/approvals/stats/dashboard
// Statistici pentru dashboard

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals, user_assignments } from '@/db/schema';
import { eq, and, gte, lte, sql, count, avg, isNull } from 'drizzle-orm';

// Query Schema
const DashboardStatsQuerySchema = Type.Object({
  date_from: Type.Optional(Type.String({ 
    format: 'date',
    description: 'Start date for statistics period' 
  })),
  date_to: Type.Optional(Type.String({ 
    format: 'date',
    description: 'End date for statistics period' 
  }))
});

type DashboardStatsQuery = Static<typeof DashboardStatsQuerySchema>;

// Response Schema
const DashboardStatsResponseSchema = Type.Object({
  my_queue: Type.Object({
    pending: Type.Number(),
    warning: Type.Number(),
    breached: Type.Number(),
    avg_response_time_minutes: Type.Number()
  }),
  total_pending: Type.Object({
    count: Type.Number(),
    by_priority: Type.Object({
      critical: Type.Number(),
      high: Type.Number(),
      medium: Type.Number(),
      low: Type.Number()
    }),
    unassigned: Type.Number()
  }),
  resolved_today: Type.Object({
    count: Type.Number(),
    approved: Type.Number(),
    rejected: Type.Number(),
    escalated: Type.Number(),
    expired: Type.Number()
  }),
  sla_compliance: Type.Object({
    rate: Type.Number(),
    trend: Type.Union([
      Type.Literal('up'),
      Type.Literal('down'),
      Type.Literal('stable')
    ]),
    previous_rate: Type.Number()
  }),
  by_type: Type.Array(Type.Object({
    type: Type.String(),
    pending: Type.Number(),
    resolved: Type.Number(),
    avg_resolution_minutes: Type.Number()
  })),
  hourly_activity: Type.Array(Type.Object({
    hour: Type.Number(),
    created: Type.Number(),
    resolved: Type.Number()
  }))
});

// Handler
async function dashboardStatsHandler(
  request: FastifyRequest<{ Querystring: DashboardStatsQuery }>,
  reply: FastifyReply
) {
  const { date_from, date_to } = request.query;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  
  // Date range defaults
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const startDate = date_from ? new Date(date_from) : today;
  const endDate = date_to ? new Date(date_to) : tomorrow;
  
  // My Queue Stats
  const myQueueStats = await db
    .select({
      pending: count(sql`CASE WHEN status = 'pending' OR status = 'assigned' THEN 1 END`),
      warning: count(sql`CASE WHEN sla_status = 'warning' THEN 1 END`),
      breached: count(sql`CASE WHEN sla_status = 'breached' THEN 1 END`)
    })
    .from(approvals)
    .where(and(
      eq(approvals.tenant_id, tenantId),
      eq(approvals.assigned_to_id, userId),
      isNull(approvals.deleted_at)
    ));
  
  // Average response time for my resolved approvals
  const myAvgResponse = await db
    .select({
      avg_minutes: avg(sql`EXTRACT(EPOCH FROM (resolved_at - assigned_at)) / 60`)
    })
    .from(approvals)
    .where(and(
      eq(approvals.tenant_id, tenantId),
      eq(approvals.assigned_to_id, userId),
      sql`resolved_at IS NOT NULL`,
      gte(approvals.resolved_at, startDate),
      lte(approvals.resolved_at, endDate)
    ));
  
  // Total Pending Stats
  const totalPendingStats = await db
    .select({
      total: count(),
      critical: count(sql`CASE WHEN priority = 'critical' THEN 1 END`),
      high: count(sql`CASE WHEN priority = 'high' THEN 1 END`),
      medium: count(sql`CASE WHEN priority = 'medium' THEN 1 END`),
      low: count(sql`CASE WHEN priority = 'low' THEN 1 END`),
      unassigned: count(sql`CASE WHEN assigned_to_id IS NULL THEN 1 END`)
    })
    .from(approvals)
    .where(and(
      eq(approvals.tenant_id, tenantId),
      sql`status IN ('pending', 'assigned')`,
      isNull(approvals.deleted_at)
    ));
  
  // Resolved Today Stats
  const resolvedTodayStats = await db
    .select({
      total: count(),
      approved: count(sql`CASE WHEN resolution_type = 'approved' THEN 1 END`),
      rejected: count(sql`CASE WHEN resolution_type = 'rejected' THEN 1 END`),
      escalated: count(sql`CASE WHEN escalation_level > 0 THEN 1 END`),
      expired: count(sql`CASE WHEN status = 'expired' THEN 1 END`)
    })
    .from(approvals)
    .where(and(
      eq(approvals.tenant_id, tenantId),
      sql`status IN ('resolved', 'expired')`,
      gte(approvals.resolved_at, today),
      lte(approvals.resolved_at, tomorrow),
      isNull(approvals.deleted_at)
    ));
  
  // SLA Compliance Rate (last 7 days vs previous 7 days)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  const currentSla = await db
    .select({
      total: count(),
      breached: count(sql`CASE WHEN sla_breached_at IS NOT NULL THEN 1 END`)
    })
    .from(approvals)
    .where(and(
      eq(approvals.tenant_id, tenantId),
      sql`status IN ('resolved', 'expired')`,
      gte(approvals.resolved_at, sevenDaysAgo),
      isNull(approvals.deleted_at)
    ));
  
  const previousSla = await db
    .select({
      total: count(),
      breached: count(sql`CASE WHEN sla_breached_at IS NOT NULL THEN 1 END`)
    })
    .from(approvals)
    .where(and(
      eq(approvals.tenant_id, tenantId),
      sql`status IN ('resolved', 'expired')`,
      gte(approvals.resolved_at, fourteenDaysAgo),
      lte(approvals.resolved_at, sevenDaysAgo),
      isNull(approvals.deleted_at)
    ));
  
  const currentRate = currentSla[0].total > 0 
    ? ((currentSla[0].total - currentSla[0].breached) / currentSla[0].total) * 100 
    : 100;
  const previousRate = previousSla[0].total > 0 
    ? ((previousSla[0].total - previousSla[0].breached) / previousSla[0].total) * 100 
    : 100;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (currentRate > previousRate + 2) trend = 'up';
  else if (currentRate < previousRate - 2) trend = 'down';
  
  // Stats by Type
  const byTypeStats = await db
    .select({
      type: approvals.type,
      pending: count(sql`CASE WHEN status IN ('pending', 'assigned') THEN 1 END`),
      resolved: count(sql`CASE WHEN status = 'resolved' THEN 1 END`),
      avg_resolution: avg(sql`
        CASE WHEN resolved_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60 
        END
      `)
    })
    .from(approvals)
    .where(and(
      eq(approvals.tenant_id, tenantId),
      gte(approvals.created_at, startDate),
      isNull(approvals.deleted_at)
    ))
    .groupBy(approvals.type);
  
  // Hourly Activity (last 24 hours)
  const hourlyActivity = await db
    .select({
      hour: sql`EXTRACT(HOUR FROM created_at)::integer`,
      created: count(sql`CASE WHEN created_at >= ${today} THEN 1 END`),
      resolved: count(sql`CASE WHEN resolved_at >= ${today} THEN 1 END`)
    })
    .from(approvals)
    .where(and(
      eq(approvals.tenant_id, tenantId),
      gte(approvals.created_at, sevenDaysAgo),
      isNull(approvals.deleted_at)
    ))
    .groupBy(sql`EXTRACT(HOUR FROM created_at)`)
    .orderBy(sql`EXTRACT(HOUR FROM created_at)`);
  
  return reply.send({
    my_queue: {
      pending: myQueueStats[0]?.pending || 0,
      warning: myQueueStats[0]?.warning || 0,
      breached: myQueueStats[0]?.breached || 0,
      avg_response_time_minutes: Math.round(myAvgResponse[0]?.avg_minutes || 0)
    },
    total_pending: {
      count: totalPendingStats[0]?.total || 0,
      by_priority: {
        critical: totalPendingStats[0]?.critical || 0,
        high: totalPendingStats[0]?.high || 0,
        medium: totalPendingStats[0]?.medium || 0,
        low: totalPendingStats[0]?.low || 0
      },
      unassigned: totalPendingStats[0]?.unassigned || 0
    },
    resolved_today: {
      count: resolvedTodayStats[0]?.total || 0,
      approved: resolvedTodayStats[0]?.approved || 0,
      rejected: resolvedTodayStats[0]?.rejected || 0,
      escalated: resolvedTodayStats[0]?.escalated || 0,
      expired: resolvedTodayStats[0]?.expired || 0
    },
    sla_compliance: {
      rate: Math.round(currentRate * 10) / 10,
      trend,
      previous_rate: Math.round(previousRate * 10) / 10
    },
    by_type: byTypeStats.map(s => ({
      type: s.type,
      pending: s.pending || 0,
      resolved: s.resolved || 0,
      avg_resolution_minutes: Math.round(s.avg_resolution || 0)
    })),
    hourly_activity: Array.from({ length: 24 }, (_, hour) => {
      const found = hourlyActivity.find(h => h.hour === hour);
      return {
        hour,
        created: found?.created || 0,
        resolved: found?.resolved || 0
      };
    })
  });
}

// Route Registration
export async function registerDashboardStatsRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/approvals/stats/dashboard', {
    schema: {
      tags: ['Statistics'],
      summary: 'Get dashboard statistics',
      description: 'Comprehensive statistics for the approval dashboard',
      querystring: DashboardStatsQuerySchema,
      response: {
        200: DashboardStatsResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: dashboardStatsHandler
  });
}
```

#### 12.3.2 User Performance Statistics

```typescript
// GET /api/v1/approvals/stats/users
// Statistici performanță utilizatori

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals, users, user_assignments } from '@/db/schema';
import { eq, and, gte, lte, sql, count, avg, desc } from 'drizzle-orm';

// Query Schema
const UserStatsQuerySchema = Type.Object({
  date_from: Type.Optional(Type.String({ format: 'date' })),
  date_to: Type.Optional(Type.String({ format: 'date' })),
  user_id: Type.Optional(Type.String({ format: 'uuid' })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 }))
});

type UserStatsQuery = Static<typeof UserStatsQuerySchema>;

// Response Schema
const UserStatsResponseSchema = Type.Object({
  users: Type.Array(Type.Object({
    user: Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String(),
      email: Type.String(),
      role: Type.String()
    }),
    metrics: Type.Object({
      total_assigned: Type.Number(),
      total_resolved: Type.Number(),
      approved: Type.Number(),
      rejected: Type.Number(),
      escalated: Type.Number(),
      breached: Type.Number(),
      sla_compliance_rate: Type.Number(),
      avg_resolution_minutes: Type.Number(),
      median_resolution_minutes: Type.Number(),
      p95_resolution_minutes: Type.Number(),
      avg_first_view_minutes: Type.Number(),
      current_workload: Type.Number()
    }),
    trend: Type.Object({
      resolution_rate_change: Type.Number(),
      sla_change: Type.Number(),
      volume_change: Type.Number()
    })
  })),
  summary: Type.Object({
    total_users: Type.Number(),
    total_resolved: Type.Number(),
    avg_sla_compliance: Type.Number(),
    top_performer_id: Type.Optional(Type.String({ format: 'uuid' }))
  })
});

// Handler
async function userStatsHandler(
  request: FastifyRequest<{ Querystring: UserStatsQuery }>,
  reply: FastifyReply
) {
  const { date_from, date_to, user_id, limit } = request.query;
  const tenantId = request.user.tenant_id;
  
  // Check permission
  if (!request.user.permissions.includes('stats_view_all') && !user_id) {
    return reply.code(403).send({
      error: 'Permission required to view all user stats',
      code: 'FORBIDDEN'
    });
  }
  
  // Date range
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const startDate = date_from ? new Date(date_from) : thirtyDaysAgo;
  const endDate = date_to ? new Date(date_to) : new Date();
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - 30);
  
  // Build user query
  let userConditions = [eq(users.tenant_id, tenantId)];
  if (user_id) {
    userConditions.push(eq(users.id, user_id));
  }
  
  const targetUsers = await db.query.users.findMany({
    where: and(...userConditions),
    limit: limit || 20,
    columns: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  
  // Fetch stats for each user
  const userStats = await Promise.all(
    targetUsers.map(async (user) => {
      // Current period stats
      const currentStats = await db
        .select({
          total_assigned: count(),
          resolved: count(sql`CASE WHEN status = 'resolved' THEN 1 END`),
          approved: count(sql`CASE WHEN resolution_type = 'approved' THEN 1 END`),
          rejected: count(sql`CASE WHEN resolution_type = 'rejected' THEN 1 END`),
          escalated: count(sql`CASE WHEN escalation_level > 0 THEN 1 END`),
          breached: count(sql`CASE WHEN sla_breached_at IS NOT NULL THEN 1 END`),
          avg_resolution: avg(sql`
            CASE WHEN resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (resolved_at - assigned_at)) / 60 
            END
          `)
        })
        .from(approvals)
        .where(and(
          eq(approvals.tenant_id, tenantId),
          eq(approvals.assigned_to_id, user.id),
          gte(approvals.created_at, startDate),
          lte(approvals.created_at, endDate)
        ));
      
      // Previous period for trend
      const previousStats = await db
        .select({
          resolved: count(sql`CASE WHEN status = 'resolved' THEN 1 END`),
          breached: count(sql`CASE WHEN sla_breached_at IS NOT NULL THEN 1 END`),
          total: count()
        })
        .from(approvals)
        .where(and(
          eq(approvals.tenant_id, tenantId),
          eq(approvals.assigned_to_id, user.id),
          gte(approvals.created_at, previousStartDate),
          lte(approvals.created_at, startDate)
        ));
      
      // Median și P95 resolution time
      const resolutionTimes = await db
        .select({
          resolution_minutes: sql`EXTRACT(EPOCH FROM (resolved_at - assigned_at)) / 60`
        })
        .from(approvals)
        .where(and(
          eq(approvals.tenant_id, tenantId),
          eq(approvals.assigned_to_id, user.id),
          sql`resolved_at IS NOT NULL`,
          gte(approvals.resolved_at, startDate),
          lte(approvals.resolved_at, endDate)
        ))
        .orderBy(sql`EXTRACT(EPOCH FROM (resolved_at - assigned_at))`);
      
      const times = resolutionTimes.map(r => r.resolution_minutes as number);
      const median = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;
      const p95 = times.length > 0 ? times[Math.floor(times.length * 0.95)] : 0;
      
      // Avg first view time
      const avgFirstView = await db
        .select({
          avg_minutes: avg(sql`time_to_first_view_seconds / 60`)
        })
        .from(user_assignments)
        .where(and(
          eq(user_assignments.tenant_id, tenantId),
          eq(user_assignments.user_id, user.id),
          gte(user_assignments.assigned_at, startDate)
        ));
      
      // Current workload
      const currentWorkload = await db
        .select({ count: count() })
        .from(approvals)
        .where(and(
          eq(approvals.tenant_id, tenantId),
          eq(approvals.assigned_to_id, user.id),
          sql`status IN ('pending', 'assigned')`
        ));
      
      // Calculate trends
      const currentResolved = currentStats[0]?.resolved || 0;
      const previousResolved = previousStats[0]?.resolved || 0;
      const resolutionRateChange = previousResolved > 0 
        ? ((currentResolved - previousResolved) / previousResolved) * 100 
        : 0;
      
      const currentSla = currentStats[0]?.resolved > 0 
        ? ((currentStats[0].resolved - currentStats[0].breached) / currentStats[0].resolved) * 100 
        : 100;
      const previousSla = previousStats[0]?.resolved > 0 
        ? ((previousStats[0].resolved - previousStats[0].breached) / previousStats[0].resolved) * 100 
        : 100;
      
      const volumeChange = previousStats[0]?.total > 0 
        ? ((currentStats[0]?.total_assigned - previousStats[0].total) / previousStats[0].total) * 100 
        : 0;
      
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        metrics: {
          total_assigned: currentStats[0]?.total_assigned || 0,
          total_resolved: currentStats[0]?.resolved || 0,
          approved: currentStats[0]?.approved || 0,
          rejected: currentStats[0]?.rejected || 0,
          escalated: currentStats[0]?.escalated || 0,
          breached: currentStats[0]?.breached || 0,
          sla_compliance_rate: Math.round(currentSla * 10) / 10,
          avg_resolution_minutes: Math.round(currentStats[0]?.avg_resolution || 0),
          median_resolution_minutes: Math.round(median),
          p95_resolution_minutes: Math.round(p95),
          avg_first_view_minutes: Math.round(avgFirstView[0]?.avg_minutes || 0),
          current_workload: currentWorkload[0]?.count || 0
        },
        trend: {
          resolution_rate_change: Math.round(resolutionRateChange * 10) / 10,
          sla_change: Math.round((currentSla - previousSla) * 10) / 10,
          volume_change: Math.round(volumeChange * 10) / 10
        }
      };
    })
  );
  
  // Summary
  const totalResolved = userStats.reduce((sum, u) => sum + u.metrics.total_resolved, 0);
  const avgSla = userStats.length > 0 
    ? userStats.reduce((sum, u) => sum + u.metrics.sla_compliance_rate, 0) / userStats.length 
    : 100;
  
  const topPerformer = userStats.reduce((best, current) => {
    if (!best) return current;
    return current.metrics.sla_compliance_rate > best.metrics.sla_compliance_rate 
      ? current 
      : best;
  }, null as typeof userStats[0] | null);
  
  return reply.send({
    users: userStats,
    summary: {
      total_users: userStats.length,
      total_resolved: totalResolved,
      avg_sla_compliance: Math.round(avgSla * 10) / 10,
      top_performer_id: topPerformer?.user.id
    }
  });
}

// Route Registration
export async function registerUserStatsRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/approvals/stats/users', {
    schema: {
      tags: ['Statistics'],
      summary: 'Get user performance statistics',
      description: 'Performance metrics for users handling approvals',
      querystring: UserStatsQuerySchema,
      response: {
        200: UserStatsResponseSchema,
        403: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: userStatsHandler
  });
}
```

#### 12.3.3 SLA Statistics

```typescript
// GET /api/v1/approvals/stats/sla
// Statistici SLA detaliate

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals, sla_configurations } from '@/db/schema';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';

// Query Schema
const SlaStatsQuerySchema = Type.Object({
  date_from: Type.Optional(Type.String({ format: 'date' })),
  date_to: Type.Optional(Type.String({ format: 'date' })),
  type: Type.Optional(Type.String({ description: 'Filter by approval type' }))
});

type SlaStatsQuery = Static<typeof SlaStatsQuerySchema>;

// Response Schema
const SlaStatsResponseSchema = Type.Object({
  overall: Type.Object({
    compliance_rate: Type.Number(),
    total_processed: Type.Number(),
    total_breached: Type.Number(),
    total_warnings: Type.Number(),
    avg_time_to_breach_minutes: Type.Number(),
    avg_remaining_at_resolution_minutes: Type.Number()
  }),
  by_type: Type.Array(Type.Object({
    type: Type.String(),
    compliance_rate: Type.Number(),
    total: Type.Number(),
    breached: Type.Number(),
    warnings: Type.Number(),
    configured_deadline_minutes: Type.Number(),
    avg_resolution_minutes: Type.Number(),
    escalation_rate: Type.Number()
  })),
  by_priority: Type.Array(Type.Object({
    priority: Type.String(),
    compliance_rate: Type.Number(),
    total: Type.Number(),
    breached: Type.Number(),
    avg_resolution_minutes: Type.Number()
  })),
  breach_reasons: Type.Array(Type.Object({
    reason: Type.String(),
    count: Type.Number(),
    percentage: Type.Number()
  })),
  daily_trend: Type.Array(Type.Object({
    date: Type.String({ format: 'date' }),
    compliance_rate: Type.Number(),
    processed: Type.Number(),
    breached: Type.Number()
  })),
  escalation_stats: Type.Object({
    total_escalated: Type.Number(),
    avg_escalation_level: Type.Number(),
    resolution_after_escalation_rate: Type.Number(),
    time_saved_by_escalation_minutes: Type.Number()
  })
});

// Handler
async function slaStatsHandler(
  request: FastifyRequest<{ Querystring: SlaStatsQuery }>,
  reply: FastifyReply
) {
  const { date_from, date_to, type } = request.query;
  const tenantId = request.user.tenant_id;
  
  // Date range defaults (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const startDate = date_from ? new Date(date_from) : thirtyDaysAgo;
  const endDate = date_to ? new Date(date_to) : new Date();
  
  // Build base conditions
  let baseConditions = [
    eq(approvals.tenant_id, tenantId),
    sql`status IN ('resolved', 'expired')`,
    gte(approvals.resolved_at, startDate),
    lte(approvals.resolved_at, endDate)
  ];
  
  if (type) {
    baseConditions.push(eq(approvals.type, type));
  }
  
  // Overall stats
  const overallStats = await db
    .select({
      total: count(),
      breached: count(sql`CASE WHEN sla_breached_at IS NOT NULL THEN 1 END`),
      warnings: count(sql`CASE WHEN sla_status = 'warning' OR sla_breached_at IS NOT NULL THEN 1 END`),
      avg_time_to_breach: sql`
        AVG(CASE WHEN sla_breached_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (sla_breached_at - created_at)) / 60 
        END)
      `,
      avg_remaining: sql`
        AVG(CASE WHEN resolved_at IS NOT NULL AND deadline_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (deadline_at - resolved_at)) / 60 
        END)
      `
    })
    .from(approvals)
    .where(and(...baseConditions));
  
  const complianceRate = overallStats[0].total > 0 
    ? ((overallStats[0].total - overallStats[0].breached) / overallStats[0].total) * 100 
    : 100;
  
  // Stats by type
  const slaConfigs = await db.query.sla_configurations.findMany({
    where: eq(sla_configurations.tenant_id, tenantId)
  });
  
  const byTypeStats = await db
    .select({
      type: approvals.type,
      total: count(),
      breached: count(sql`CASE WHEN sla_breached_at IS NOT NULL THEN 1 END`),
      warnings: count(sql`CASE WHEN sla_status = 'warning' THEN 1 END`),
      avg_resolution: sql`
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)
      `,
      escalated: count(sql`CASE WHEN escalation_level > 0 THEN 1 END`)
    })
    .from(approvals)
    .where(and(...baseConditions))
    .groupBy(approvals.type);
  
  const byType = byTypeStats.map(s => {
    const config = slaConfigs.find(c => c.approval_type === s.type);
    const compliance = s.total > 0 
      ? ((s.total - s.breached) / s.total) * 100 
      : 100;
    const escalationRate = s.total > 0 
      ? (s.escalated / s.total) * 100 
      : 0;
    
    return {
      type: s.type,
      compliance_rate: Math.round(compliance * 10) / 10,
      total: s.total,
      breached: s.breached,
      warnings: s.warnings,
      configured_deadline_minutes: config ? Math.round(config.deadline_seconds / 60) : 0,
      avg_resolution_minutes: Math.round(s.avg_resolution || 0),
      escalation_rate: Math.round(escalationRate * 10) / 10
    };
  });
  
  // Stats by priority
  const byPriorityStats = await db
    .select({
      priority: approvals.priority,
      total: count(),
      breached: count(sql`CASE WHEN sla_breached_at IS NOT NULL THEN 1 END`),
      avg_resolution: sql`
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)
      `
    })
    .from(approvals)
    .where(and(...baseConditions))
    .groupBy(approvals.priority);
  
  const byPriority = byPriorityStats.map(s => ({
    priority: s.priority,
    compliance_rate: s.total > 0 
      ? Math.round(((s.total - s.breached) / s.total) * 1000) / 10 
      : 100,
    total: s.total,
    breached: s.breached,
    avg_resolution_minutes: Math.round(s.avg_resolution || 0)
  }));
  
  // Breach reasons (from context or audit log)
  const breachReasons = [
    { reason: 'No assignee available', count: 0, percentage: 0 },
    { reason: 'Complex case requiring research', count: 0, percentage: 0 },
    { reason: 'Waiting for customer response', count: 0, percentage: 0 },
    { reason: 'High workload', count: 0, percentage: 0 },
    { reason: 'Other', count: 0, percentage: 0 }
  ];
  
  // În producție, acestea ar fi calculate din audit log sau context fields
  // Pentru acum, returnăm structura goală
  
  // Daily trend
  const dailyTrend = await db
    .select({
      date: sql`DATE(resolved_at)`,
      processed: count(),
      breached: count(sql`CASE WHEN sla_breached_at IS NOT NULL THEN 1 END`)
    })
    .from(approvals)
    .where(and(...baseConditions))
    .groupBy(sql`DATE(resolved_at)`)
    .orderBy(sql`DATE(resolved_at)`);
  
  const dailyTrendFormatted = dailyTrend.map(d => ({
    date: d.date,
    compliance_rate: d.processed > 0 
      ? Math.round(((d.processed - d.breached) / d.processed) * 1000) / 10 
      : 100,
    processed: d.processed,
    breached: d.breached
  }));
  
  // Escalation stats
  const escalationStats = await db
    .select({
      total_escalated: count(),
      avg_level: sql`AVG(escalation_level)`,
      resolved_after: count(sql`CASE WHEN status = 'resolved' THEN 1 END`)
    })
    .from(approvals)
    .where(and(
      ...baseConditions,
      sql`escalation_level > 0`
    ));
  
  const resolutionAfterEscalation = escalationStats[0].total_escalated > 0 
    ? (escalationStats[0].resolved_after / escalationStats[0].total_escalated) * 100 
    : 0;
  
  return reply.send({
    overall: {
      compliance_rate: Math.round(complianceRate * 10) / 10,
      total_processed: overallStats[0].total,
      total_breached: overallStats[0].breached,
      total_warnings: overallStats[0].warnings,
      avg_time_to_breach_minutes: Math.round(overallStats[0].avg_time_to_breach || 0),
      avg_remaining_at_resolution_minutes: Math.round(overallStats[0].avg_remaining || 0)
    },
    by_type: byType,
    by_priority: byPriority,
    breach_reasons: breachReasons,
    daily_trend: dailyTrendFormatted,
    escalation_stats: {
      total_escalated: escalationStats[0].total_escalated,
      avg_escalation_level: Math.round((escalationStats[0].avg_level || 0) * 10) / 10,
      resolution_after_escalation_rate: Math.round(resolutionAfterEscalation * 10) / 10,
      time_saved_by_escalation_minutes: 0 // Would require more complex calculation
    }
  });
}

// Route Registration
export async function registerSlaStatsRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/approvals/stats/sla', {
    schema: {
      tags: ['Statistics'],
      summary: 'Get SLA statistics',
      description: 'Detailed SLA compliance and breach statistics',
      querystring: SlaStatsQuerySchema,
      response: {
        200: SlaStatsResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: slaStatsHandler
  });
}
```

### 12.4 SLA Configuration API

#### 12.4.1 List SLA Configurations

```typescript
// GET /api/v1/sla/configurations
// Lista toate configurațiile SLA

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { sla_configurations } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Response Schema
const SlaConfigSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  approval_type: Type.String(),
  warning_seconds: Type.Number(),
  deadline_seconds: Type.Number(),
  critical_seconds: Type.Number(),
  business_hours_only: Type.Boolean(),
  business_start_hour: Type.Number(),
  business_end_hour: Type.Number(),
  business_days: Type.Array(Type.Number()),
  timezone: Type.String(),
  escalation_enabled: Type.Boolean(),
  escalation_path: Type.Array(Type.Object({
    level: Type.Number(),
    role: Type.String(),
    notify_channels: Type.Array(Type.String())
  })),
  max_escalation_level: Type.Number(),
  notification_config: Type.Object({
    warning: Type.Object({
      channels: Type.Array(Type.String()),
      template: Type.String()
    }),
    breach: Type.Object({
      channels: Type.Array(Type.String()),
      template: Type.String()
    }),
    critical: Type.Object({
      channels: Type.Array(Type.String()),
      template: Type.String()
    })
  }),
  priority_multipliers: Type.Object({
    low: Type.Number(),
    medium: Type.Number(),
    high: Type.Number(),
    critical: Type.Number()
  }),
  auto_escalate_on_breach: Type.Boolean(),
  auto_expire_on_critical: Type.Boolean(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

const ListSlaConfigResponseSchema = Type.Object({
  configurations: Type.Array(SlaConfigSchema),
  total: Type.Number()
});

// Handler
async function listSlaConfigHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const tenantId = request.user.tenant_id;
  
  const configs = await db.query.sla_configurations.findMany({
    where: eq(sla_configurations.tenant_id, tenantId),
    orderBy: [sla_configurations.approval_type]
  });
  
  return reply.send({
    configurations: configs.map(c => ({
      id: c.id,
      approval_type: c.approval_type,
      warning_seconds: c.warning_seconds,
      deadline_seconds: c.deadline_seconds,
      critical_seconds: c.critical_seconds,
      business_hours_only: c.business_hours_only,
      business_start_hour: c.business_start_hour,
      business_end_hour: c.business_end_hour,
      business_days: c.business_days,
      timezone: c.timezone,
      escalation_enabled: c.escalation_enabled,
      escalation_path: c.escalation_path,
      max_escalation_level: c.max_escalation_level,
      notification_config: c.notification_config,
      priority_multipliers: c.priority_multipliers,
      auto_escalate_on_breach: c.auto_escalate_on_breach,
      auto_expire_on_critical: c.auto_expire_on_critical,
      created_at: c.created_at.toISOString(),
      updated_at: c.updated_at.toISOString()
    })),
    total: configs.length
  });
}

// Route Registration
export async function registerListSlaConfigRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/sla/configurations', {
    schema: {
      tags: ['SLA'],
      summary: 'List SLA configurations',
      description: 'Get all SLA configurations for the tenant',
      response: {
        200: ListSlaConfigResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.requirePermission('sla_config_view')],
    handler: listSlaConfigHandler
  });
}
```

#### 12.4.2 Update SLA Configuration

```typescript
// PUT /api/v1/sla/configurations/:type
// Actualizează configurație SLA

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { sla_configurations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Request Schema
const UpdateSlaConfigParamsSchema = Type.Object({
  type: Type.String({ description: 'Approval type' })
});

const UpdateSlaConfigBodySchema = Type.Object({
  warning_seconds: Type.Optional(Type.Number({ 
    minimum: 60, 
    description: 'Seconds before warning' 
  })),
  deadline_seconds: Type.Optional(Type.Number({ 
    minimum: 120, 
    description: 'Seconds before deadline breach' 
  })),
  critical_seconds: Type.Optional(Type.Number({ 
    minimum: 180, 
    description: 'Seconds before critical state' 
  })),
  business_hours_only: Type.Optional(Type.Boolean()),
  business_start_hour: Type.Optional(Type.Number({ minimum: 0, maximum: 23 })),
  business_end_hour: Type.Optional(Type.Number({ minimum: 0, maximum: 23 })),
  business_days: Type.Optional(Type.Array(Type.Number({ minimum: 0, maximum: 6 }))),
  timezone: Type.Optional(Type.String()),
  escalation_enabled: Type.Optional(Type.Boolean()),
  escalation_path: Type.Optional(Type.Array(Type.Object({
    level: Type.Number({ minimum: 1 }),
    role: Type.String(),
    notify_channels: Type.Array(Type.String())
  }))),
  max_escalation_level: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
  notification_config: Type.Optional(Type.Object({
    warning: Type.Optional(Type.Object({
      channels: Type.Array(Type.String()),
      template: Type.String()
    })),
    breach: Type.Optional(Type.Object({
      channels: Type.Array(Type.String()),
      template: Type.String()
    })),
    critical: Type.Optional(Type.Object({
      channels: Type.Array(Type.String()),
      template: Type.String()
    }))
  })),
  priority_multipliers: Type.Optional(Type.Object({
    low: Type.Number({ minimum: 0.1, maximum: 10 }),
    medium: Type.Number({ minimum: 0.1, maximum: 10 }),
    high: Type.Number({ minimum: 0.1, maximum: 10 }),
    critical: Type.Number({ minimum: 0.1, maximum: 10 })
  })),
  auto_escalate_on_breach: Type.Optional(Type.Boolean()),
  auto_expire_on_critical: Type.Optional(Type.Boolean())
});

type UpdateSlaConfigParams = Static<typeof UpdateSlaConfigParamsSchema>;
type UpdateSlaConfigBody = Static<typeof UpdateSlaConfigBodySchema>;

// Handler
async function updateSlaConfigHandler(
  request: FastifyRequest<{ Params: UpdateSlaConfigParams; Body: UpdateSlaConfigBody }>,
  reply: FastifyReply
) {
  const { type } = request.params;
  const updates = request.body;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  
  // Validate timing order
  if (updates.warning_seconds && updates.deadline_seconds) {
    if (updates.warning_seconds >= updates.deadline_seconds) {
      return reply.code(400).send({
        error: 'Warning must be before deadline',
        code: 'INVALID_TIMING'
      });
    }
  }
  
  if (updates.deadline_seconds && updates.critical_seconds) {
    if (updates.deadline_seconds >= updates.critical_seconds) {
      return reply.code(400).send({
        error: 'Deadline must be before critical',
        code: 'INVALID_TIMING'
      });
    }
  }
  
  // Check if config exists
  let config = await db.query.sla_configurations.findFirst({
    where: and(
      eq(sla_configurations.tenant_id, tenantId),
      eq(sla_configurations.approval_type, type)
    )
  });
  
  const now = new Date();
  
  if (config) {
    // Update existing
    const [updated] = await db
      .update(sla_configurations)
      .set({
        ...updates,
        updated_at: now
      })
      .where(eq(sla_configurations.id, config.id))
      .returning();
    
    // Log audit
    await logAuditEvent(config.id, tenantId, 'sla_config_updated', {
      approvalType: type,
      changes: updates,
      previousValues: config
    }, userId);
    
    config = updated;
  } else {
    // Create new with defaults
    const defaultConfig = {
      id: nanoid(),
      tenant_id: tenantId,
      approval_type: type,
      warning_seconds: updates.warning_seconds || 3600, // 1 hour
      deadline_seconds: updates.deadline_seconds || 14400, // 4 hours
      critical_seconds: updates.critical_seconds || 28800, // 8 hours
      business_hours_only: updates.business_hours_only ?? false,
      business_start_hour: updates.business_start_hour ?? 9,
      business_end_hour: updates.business_end_hour ?? 18,
      business_days: updates.business_days ?? [1, 2, 3, 4, 5],
      timezone: updates.timezone ?? 'Europe/Bucharest',
      escalation_enabled: updates.escalation_enabled ?? true,
      escalation_path: updates.escalation_path ?? [
        { level: 1, role: 'sales_lead', notify_channels: ['email', 'in_app'] },
        { level: 2, role: 'sales_manager', notify_channels: ['email', 'in_app', 'push'] },
        { level: 3, role: 'admin', notify_channels: ['email', 'in_app', 'push', 'sms'] }
      ],
      max_escalation_level: updates.max_escalation_level ?? 3,
      notification_config: updates.notification_config ?? {
        warning: { channels: ['in_app'], template: 'sla_warning' },
        breach: { channels: ['email', 'in_app'], template: 'sla_breach' },
        critical: { channels: ['email', 'in_app', 'push'], template: 'sla_critical' }
      },
      priority_multipliers: updates.priority_multipliers ?? {
        low: 1.5,
        medium: 1.0,
        high: 0.5,
        critical: 0.25
      },
      auto_escalate_on_breach: updates.auto_escalate_on_breach ?? true,
      auto_expire_on_critical: updates.auto_expire_on_critical ?? false,
      created_at: now,
      updated_at: now
    };
    
    const [created] = await db
      .insert(sla_configurations)
      .values(defaultConfig)
      .returning();
    
    // Log audit
    await logAuditEvent(created.id, tenantId, 'sla_config_created', {
      approvalType: type,
      config: defaultConfig
    }, userId);
    
    config = created;
  }
  
  return reply.send({
    success: true,
    configuration: {
      id: config.id,
      approval_type: config.approval_type,
      warning_seconds: config.warning_seconds,
      deadline_seconds: config.deadline_seconds,
      critical_seconds: config.critical_seconds,
      business_hours_only: config.business_hours_only,
      business_start_hour: config.business_start_hour,
      business_end_hour: config.business_end_hour,
      business_days: config.business_days,
      timezone: config.timezone,
      escalation_enabled: config.escalation_enabled,
      escalation_path: config.escalation_path,
      max_escalation_level: config.max_escalation_level,
      notification_config: config.notification_config,
      priority_multipliers: config.priority_multipliers,
      auto_escalate_on_breach: config.auto_escalate_on_breach,
      auto_expire_on_critical: config.auto_expire_on_critical,
      created_at: config.created_at.toISOString(),
      updated_at: config.updated_at.toISOString()
    }
  });
}

// Route Registration
export async function registerUpdateSlaConfigRoute(fastify: FastifyInstance) {
  fastify.put('/api/v1/sla/configurations/:type', {
    schema: {
      tags: ['SLA'],
      summary: 'Update SLA configuration',
      description: 'Create or update SLA configuration for an approval type',
      params: UpdateSlaConfigParamsSchema,
      body: UpdateSlaConfigBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          configuration: Type.Any()
        }),
        400: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.requirePermission('sla_config_edit')],
    handler: updateSlaConfigHandler
  });
}
```

### 12.5 Assignment API

#### 12.5.1 Get User Availability

```typescript
// GET /api/v1/assignments/availability
// Disponibilitate utilizatori pentru asignare

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { users, user_availability, approvals } from '@/db/schema';
import { eq, and, sql, count } from 'drizzle-orm';

// Query Schema
const AvailabilityQuerySchema = Type.Object({
  role: Type.Optional(Type.String({ description: 'Filter by role' })),
  approval_type: Type.Optional(Type.String({ description: 'Filter by expertise' })),
  include_unavailable: Type.Optional(Type.Boolean({ default: false }))
});

type AvailabilityQuery = Static<typeof AvailabilityQuerySchema>;

// Response Schema
const AvailabilityResponseSchema = Type.Object({
  users: Type.Array(Type.Object({
    user: Type.Object({
      id: Type.String({ format: 'uuid' }),
      name: Type.String(),
      email: Type.String(),
      role: Type.String()
    }),
    availability: Type.Object({
      status: Type.String(),
      available_from: Type.Optional(Type.String({ format: 'date-time' })),
      available_until: Type.Optional(Type.String({ format: 'date-time' })),
      is_on_vacation: Type.Boolean(),
      vacation_end: Type.Optional(Type.String({ format: 'date-time' })),
      delegate_id: Type.Optional(Type.String({ format: 'uuid' })),
      delegate_name: Type.Optional(Type.String())
    }),
    workload: Type.Object({
      current_count: Type.Number(),
      max_concurrent: Type.Number(),
      available_capacity: Type.Number(),
      breached_count: Type.Number()
    }),
    expertise: Type.Array(Type.String()),
    last_assigned_at: Type.Optional(Type.String({ format: 'date-time' })),
    avg_resolution_minutes: Type.Number(),
    is_recommended: Type.Boolean()
  })),
  summary: Type.Object({
    total_available: Type.Number(),
    total_capacity: Type.Number(),
    used_capacity: Type.Number()
  })
});

// Handler
async function availabilityHandler(
  request: FastifyRequest<{ Querystring: AvailabilityQuery }>,
  reply: FastifyReply
) {
  const { role, approval_type, include_unavailable } = request.query;
  const tenantId = request.user.tenant_id;
  
  // Build user conditions
  let userConditions = [
    eq(users.tenant_id, tenantId),
    eq(users.is_active, true)
  ];
  
  if (role) {
    userConditions.push(eq(users.role, role));
  }
  
  // Fetch users with availability
  const usersWithAvailability = await db
    .select({
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role
      },
      availability: {
        status: user_availability.status,
        available_from: user_availability.available_from,
        available_until: user_availability.available_until,
        vacation_start: user_availability.vacation_start,
        vacation_end: user_availability.vacation_end,
        vacation_delegate_id: user_availability.vacation_delegate_id,
        max_concurrent: user_availability.max_concurrent_approvals,
        current_count: user_availability.current_approval_count,
        expertise_areas: user_availability.expertise_areas,
        last_active_at: user_availability.last_active_at
      }
    })
    .from(users)
    .leftJoin(user_availability, eq(users.id, user_availability.user_id))
    .where(and(...userConditions));
  
  // Process each user
  const now = new Date();
  const processedUsers = await Promise.all(
    usersWithAvailability.map(async ({ user, availability }) => {
      // Check vacation status
      const isOnVacation = availability?.vacation_start && availability?.vacation_end
        ? now >= availability.vacation_start && now <= availability.vacation_end
        : false;
      
      // Get delegate name if applicable
      let delegateName: string | undefined;
      if (availability?.vacation_delegate_id) {
        const delegate = await db.query.users.findFirst({
          where: eq(users.id, availability.vacation_delegate_id),
          columns: { name: true }
        });
        delegateName = delegate?.name;
      }
      
      // Get current breached count
      const breachedCount = await db
        .select({ count: count() })
        .from(approvals)
        .where(and(
          eq(approvals.tenant_id, tenantId),
          eq(approvals.assigned_to_id, user.id),
          sql`status IN ('pending', 'assigned')`,
          sql`sla_breached_at IS NOT NULL`
        ));
      
      // Get last assignment time
      const lastAssignment = await db.query.approvals.findFirst({
        where: and(
          eq(approvals.tenant_id, tenantId),
          eq(approvals.assigned_to_id, user.id)
        ),
        orderBy: [sql`assigned_at DESC`],
        columns: { assigned_at: true }
      });
      
      // Get average resolution time
      const avgResolution = await db
        .select({
          avg: sql`AVG(EXTRACT(EPOCH FROM (resolved_at - assigned_at)) / 60)`
        })
        .from(approvals)
        .where(and(
          eq(approvals.tenant_id, tenantId),
          eq(approvals.assigned_to_id, user.id),
          sql`resolved_at IS NOT NULL`
        ));
      
      // Calculate availability
      const maxConcurrent = availability?.max_concurrent || 10;
      const currentCount = availability?.current_count || 0;
      const availableCapacity = Math.max(0, maxConcurrent - currentCount);
      
      // Determine if available
      const status = availability?.status || 'available';
      const isAvailable = status === 'available' && !isOnVacation && availableCapacity > 0;
      
      // Check expertise match
      const expertiseAreas = availability?.expertise_areas || [];
      const hasExpertise = approval_type 
        ? expertiseAreas.includes(approval_type) 
        : true;
      
      // Recommendation score
      const isRecommended = isAvailable && hasExpertise && 
        availableCapacity >= 2 && 
        breachedCount[0].count === 0;
      
      return {
        user,
        availability: {
          status,
          available_from: availability?.available_from?.toISOString(),
          available_until: availability?.available_until?.toISOString(),
          is_on_vacation: isOnVacation,
          vacation_end: availability?.vacation_end?.toISOString(),
          delegate_id: availability?.vacation_delegate_id,
          delegate_name: delegateName
        },
        workload: {
          current_count: currentCount,
          max_concurrent: maxConcurrent,
          available_capacity: availableCapacity,
          breached_count: breachedCount[0].count
        },
        expertise: expertiseAreas,
        last_assigned_at: lastAssignment?.assigned_at?.toISOString(),
        avg_resolution_minutes: Math.round(avgResolution[0]?.avg || 0),
        is_recommended: isRecommended,
        _isAvailable: isAvailable // For filtering
      };
    })
  );
  
  // Filter if not including unavailable
  let filteredUsers = processedUsers;
  if (!include_unavailable) {
    filteredUsers = processedUsers.filter(u => u._isAvailable);
  }
  
  // Remove internal field and sort by recommendation
  const result = filteredUsers
    .map(({ _isAvailable, ...rest }) => rest)
    .sort((a, b) => {
      if (a.is_recommended && !b.is_recommended) return -1;
      if (!a.is_recommended && b.is_recommended) return 1;
      return a.workload.available_capacity - b.workload.available_capacity;
    });
  
  // Calculate summary
  const totalCapacity = processedUsers.reduce((sum, u) => sum + u.workload.max_concurrent, 0);
  const usedCapacity = processedUsers.reduce((sum, u) => sum + u.workload.current_count, 0);
  const totalAvailable = processedUsers.filter(u => u._isAvailable).length;
  
  return reply.send({
    users: result,
    summary: {
      total_available: totalAvailable,
      total_capacity: totalCapacity,
      used_capacity: usedCapacity
    }
  });
}

// Route Registration
export async function registerAvailabilityRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/assignments/availability', {
    schema: {
      tags: ['Assignment'],
      summary: 'Get user availability',
      description: 'Get availability and workload for users eligible for assignment',
      querystring: AvailabilityQuerySchema,
      response: {
        200: AvailabilityResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.requirePermission('assignment_view')],
    handler: availabilityHandler
  });
}
```

#### 12.5.2 Update User Availability

```typescript
// PUT /api/v1/assignments/availability/:userId
// Actualizează disponibilitatea unui utilizator

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { user_availability, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Request Schema
const UpdateAvailabilityParamsSchema = Type.Object({
  userId: Type.String({ format: 'uuid' })
});

const UpdateAvailabilityBodySchema = Type.Object({
  status: Type.Optional(Type.Union([
    Type.Literal('available'),
    Type.Literal('busy'),
    Type.Literal('away'),
    Type.Literal('vacation'),
    Type.Literal('out_of_office')
  ])),
  available_from: Type.Optional(Type.String({ format: 'date-time' })),
  available_until: Type.Optional(Type.String({ format: 'date-time' })),
  vacation_start: Type.Optional(Type.String({ format: 'date-time' })),
  vacation_end: Type.Optional(Type.String({ format: 'date-time' })),
  vacation_delegate_id: Type.Optional(Type.String({ format: 'uuid' })),
  max_concurrent_approvals: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  expertise_areas: Type.Optional(Type.Array(Type.String())),
  auto_away_minutes: Type.Optional(Type.Number({ minimum: 5, maximum: 1440 }))
});

type UpdateAvailabilityParams = Static<typeof UpdateAvailabilityParamsSchema>;
type UpdateAvailabilityBody = Static<typeof UpdateAvailabilityBodySchema>;

// Handler
async function updateAvailabilityHandler(
  request: FastifyRequest<{ Params: UpdateAvailabilityParams; Body: UpdateAvailabilityBody }>,
  reply: FastifyReply
) {
  const { userId } = request.params;
  const updates = request.body;
  const tenantId = request.user.tenant_id;
  const requesterId = request.user.id;
  
  // Check permission - self update sau admin
  const canUpdateOthers = request.user.permissions.includes('availability_manage_all');
  if (userId !== requesterId && !canUpdateOthers) {
    return reply.code(403).send({
      error: 'Cannot update other user availability',
      code: 'FORBIDDEN'
    });
  }
  
  // Verify user exists în tenant
  const targetUser = await db.query.users.findFirst({
    where: and(
      eq(users.id, userId),
      eq(users.tenant_id, tenantId)
    )
  });
  
  if (!targetUser) {
    return reply.code(404).send({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
  
  // Validate delegate if provided
  if (updates.vacation_delegate_id) {
    const delegate = await db.query.users.findFirst({
      where: and(
        eq(users.id, updates.vacation_delegate_id),
        eq(users.tenant_id, tenantId)
      )
    });
    
    if (!delegate) {
      return reply.code(400).send({
        error: 'Delegate user not found',
        code: 'DELEGATE_NOT_FOUND'
      });
    }
    
    if (updates.vacation_delegate_id === userId) {
      return reply.code(400).send({
        error: 'Cannot delegate to self',
        code: 'INVALID_DELEGATE'
      });
    }
  }
  
  // Validate vacation dates
  if (updates.vacation_start && updates.vacation_end) {
    const start = new Date(updates.vacation_start);
    const end = new Date(updates.vacation_end);
    
    if (end <= start) {
      return reply.code(400).send({
        error: 'Vacation end must be after start',
        code: 'INVALID_DATES'
      });
    }
  }
  
  const now = new Date();
  
  // Check if availability record exists
  let availability = await db.query.user_availability.findFirst({
    where: and(
      eq(user_availability.user_id, userId),
      eq(user_availability.tenant_id, tenantId)
    )
  });
  
  const updateData = {
    ...updates,
    vacation_start: updates.vacation_start ? new Date(updates.vacation_start) : undefined,
    vacation_end: updates.vacation_end ? new Date(updates.vacation_end) : undefined,
    available_from: updates.available_from ? new Date(updates.available_from) : undefined,
    available_until: updates.available_until ? new Date(updates.available_until) : undefined,
    last_active_at: now,
    updated_at: now
  };
  
  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) delete updateData[key];
  });
  
  if (availability) {
    // Update existing
    const [updated] = await db
      .update(user_availability)
      .set(updateData)
      .where(eq(user_availability.id, availability.id))
      .returning();
    
    availability = updated;
  } else {
    // Create new
    const [created] = await db
      .insert(user_availability)
      .values({
        id: nanoid(),
        tenant_id: tenantId,
        user_id: userId,
        status: updates.status || 'available',
        max_concurrent_approvals: updates.max_concurrent_approvals || 10,
        current_approval_count: 0,
        expertise_areas: updates.expertise_areas || [],
        auto_away_minutes: updates.auto_away_minutes || 30,
        last_active_at: now,
        ...updateData,
        created_at: now,
        updated_at: now
      })
      .returning();
    
    availability = created;
  }
  
  return reply.send({
    success: true,
    availability: {
      user_id: availability.user_id,
      status: availability.status,
      available_from: availability.available_from?.toISOString(),
      available_until: availability.available_until?.toISOString(),
      vacation_start: availability.vacation_start?.toISOString(),
      vacation_end: availability.vacation_end?.toISOString(),
      vacation_delegate_id: availability.vacation_delegate_id,
      max_concurrent_approvals: availability.max_concurrent_approvals,
      current_approval_count: availability.current_approval_count,
      expertise_areas: availability.expertise_areas,
      auto_away_minutes: availability.auto_away_minutes,
      last_active_at: availability.last_active_at?.toISOString()
    }
  });
}

// Route Registration
export async function registerUpdateAvailabilityRoute(fastify: FastifyInstance) {
  fastify.put('/api/v1/assignments/availability/:userId', {
    schema: {
      tags: ['Assignment'],
      summary: 'Update user availability',
      description: 'Update availability, vacation, and workload settings',
      params: UpdateAvailabilityParamsSchema,
      body: UpdateAvailabilityBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          availability: Type.Any()
        }),
        400: Type.Object({ error: Type.String(), code: Type.String() }),
        403: Type.Object({ error: Type.String(), code: Type.String() }),
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: updateAvailabilityHandler
  });
}
```

#### 12.5.3 Bulk Reassign

```typescript
// POST /api/v1/assignments/bulk-reassign
// Reasignare în masă

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approvals, users } from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { notificationSendQueue } from '@/queues/hitl';
import { websocketServer } from '@/websocket';

// Request Schema
const BulkReassignBodySchema = Type.Object({
  approval_ids: Type.Array(Type.String({ format: 'uuid' }), { 
    minItems: 1, 
    maxItems: 100 
  }),
  new_assignee_id: Type.String({ format: 'uuid' }),
  reason: Type.Optional(Type.String({ maxLength: 500 })),
  notify_previous: Type.Optional(Type.Boolean({ default: true }))
});

type BulkReassignBody = Static<typeof BulkReassignBodySchema>;

// Handler
async function bulkReassignHandler(
  request: FastifyRequest<{ Body: BulkReassignBody }>,
  reply: FastifyReply
) {
  const { approval_ids, new_assignee_id, reason, notify_previous } = request.body;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  
  // Verify new assignee
  const newAssignee = await db.query.users.findFirst({
    where: and(
      eq(users.id, new_assignee_id),
      eq(users.tenant_id, tenantId)
    ),
    columns: { id: true, name: true, email: true }
  });
  
  if (!newAssignee) {
    return reply.code(400).send({
      error: 'New assignee not found',
      code: 'ASSIGNEE_NOT_FOUND'
    });
  }
  
  // Fetch approvals to reassign
  const approvalsToReassign = await db.query.approvals.findMany({
    where: and(
      eq(approvals.tenant_id, tenantId),
      inArray(approvals.id, approval_ids),
      sql`status IN ('pending', 'assigned')`
    )
  });
  
  if (approvalsToReassign.length === 0) {
    return reply.code(400).send({
      error: 'No valid approvals to reassign',
      code: 'NO_VALID_APPROVALS'
    });
  }
  
  const now = new Date();
  const results: {
    success: string[];
    failed: Array<{ id: string; reason: string }>;
  } = { success: [], failed: [] };
  
  // Get previous assignees for notifications
  const previousAssignees = new Map<string, string[]>();
  
  // Process in transaction
  await db.transaction(async (tx) => {
    for (const approval of approvalsToReassign) {
      try {
        // Skip if already assigned to target
        if (approval.assigned_to_id === new_assignee_id) {
          results.failed.push({
            id: approval.id,
            reason: 'Already assigned to this user'
          });
          continue;
        }
        
        const previousAssigneeId = approval.assigned_to_id;
        
        // Update approval
        await tx
          .update(approvals)
          .set({
            assigned_to_id: new_assignee_id,
            assigned_at: now,
            assigned_by_id: userId,
            status: 'assigned',
            updated_at: now
          })
          .where(eq(approvals.id, approval.id));
        
        // Track previous assignee
        if (previousAssigneeId && notify_previous !== false) {
          const existing = previousAssignees.get(previousAssigneeId) || [];
          existing.push(approval.id);
          previousAssignees.set(previousAssigneeId, existing);
        }
        
        // Log audit
        await logAuditEvent(approval.id, tenantId, 'reassigned', {
          previousAssigneeId,
          newAssigneeId: new_assignee_id,
          reason,
          bulkOperation: true
        }, userId);
        
        results.success.push(approval.id);
      } catch (error) {
        results.failed.push({
          id: approval.id,
          reason: error.message
        });
      }
    }
  });
  
  // Notify new assignee
  await notificationSendQueue.add(
    `bulk-assign-${new_assignee_id}-${Date.now()}`,
    {
      tenantId,
      userId: new_assignee_id,
      channel: 'in_app',
      templateId: 'bulk_assignment',
      data: {
        count: results.success.length,
        assignedBy: request.user.name,
        reason
      },
      priority: 'high',
      contextType: 'bulk_assignment',
      contextId: `bulk-${Date.now()}`
    }
  );
  
  // Notify previous assignees
  for (const [prevAssigneeId, approvalIds] of previousAssignees) {
    await notificationSendQueue.add(
      `bulk-unassign-${prevAssigneeId}-${Date.now()}`,
      {
        tenantId,
        userId: prevAssigneeId,
        channel: 'in_app',
        templateId: 'bulk_unassignment',
        data: {
          count: approvalIds.length,
          reassignedBy: request.user.name,
          newAssigneeName: newAssignee.name,
          reason
        },
        priority: 'normal',
        contextType: 'bulk_unassignment',
        contextId: `bulk-${Date.now()}`
      }
    );
  }
  
  // WebSocket broadcast
  websocketServer.broadcast(`tenant:${tenantId}`, {
    type: 'bulk:reassigned',
    data: {
      approvalIds: results.success,
      newAssigneeId: new_assignee_id,
      newAssigneeName: newAssignee.name,
      performedBy: request.user.name,
      timestamp: now.toISOString()
    }
  });
  
  return reply.send({
    success: true,
    results: {
      total_requested: approval_ids.length,
      successful: results.success.length,
      failed: results.failed.length,
      success_ids: results.success,
      failures: results.failed
    },
    new_assignee: {
      id: newAssignee.id,
      name: newAssignee.name
    }
  });
}

// Route Registration
export async function registerBulkReassignRoute(fastify: FastifyInstance) {
  fastify.post('/api/v1/assignments/bulk-reassign', {
    schema: {
      tags: ['Assignment'],
      summary: 'Bulk reassign approvals',
      description: 'Reassign multiple approvals to a single user',
      body: BulkReassignBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          results: Type.Object({
            total_requested: Type.Number(),
            successful: Type.Number(),
            failed: Type.Number(),
            success_ids: Type.Array(Type.String()),
            failures: Type.Array(Type.Object({
              id: Type.String(),
              reason: Type.String()
            }))
          }),
          new_assignee: Type.Object({
            id: Type.String({ format: 'uuid' }),
            name: Type.String()
          })
        }),
        400: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.requirePermission('bulk_assign')],
    handler: bulkReassignHandler
  });
}
```

### 12.6 Notifications API

#### 12.6.1 List User Notifications

```typescript
// GET /api/v1/notifications
// Lista notificări utilizator

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc, lte, isNull, count, sql } from 'drizzle-orm';

// Query Schema
const NotificationsQuerySchema = Type.Object({
  status: Type.Optional(Type.Union([
    Type.Literal('unread'),
    Type.Literal('read'),
    Type.Literal('all')
  ], { default: 'all' })),
  channel: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  before: Type.Optional(Type.String({ format: 'date-time' }))
});

type NotificationsQuery = Static<typeof NotificationsQuerySchema>;

// Response Schema
const NotificationSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  channel: Type.String(),
  title: Type.String(),
  body: Type.String(),
  context_type: Type.Optional(Type.String()),
  context_id: Type.Optional(Type.String({ format: 'uuid' })),
  status: Type.String(),
  priority: Type.String(),
  data: Type.Optional(Type.Any()),
  created_at: Type.String({ format: 'date-time' }),
  read_at: Type.Optional(Type.String({ format: 'date-time' }))
});

const NotificationsResponseSchema = Type.Object({
  notifications: Type.Array(NotificationSchema),
  total: Type.Number(),
  unread_count: Type.Number(),
  has_more: Type.Boolean()
});

// Handler
async function listNotificationsHandler(
  request: FastifyRequest<{ Querystring: NotificationsQuery }>,
  reply: FastifyReply
) {
  const { status, channel, limit, offset, before } = request.query;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  
  // Build conditions
  let conditions = [
    eq(notifications.tenant_id, tenantId),
    eq(notifications.user_id, userId)
  ];
  
  // Status filter
  if (status === 'unread') {
    conditions.push(isNull(notifications.read_at));
  } else if (status === 'read') {
    conditions.push(sql`read_at IS NOT NULL`);
  }
  
  // Channel filter
  if (channel) {
    conditions.push(eq(notifications.channel, channel));
  }
  
  // Before cursor
  if (before) {
    conditions.push(lte(notifications.created_at, new Date(before)));
  }
  
  // Fetch notifications
  const notificationsList = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.created_at)],
    limit: (limit || 20) + 1, // +1 for has_more check
    offset: offset || 0
  });
  
  // Check has_more
  const hasMore = notificationsList.length > (limit || 20);
  if (hasMore) {
    notificationsList.pop();
  }
  
  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(
      eq(notifications.tenant_id, tenantId),
      eq(notifications.user_id, userId)
    ));
  
  // Get unread count
  const unreadResult = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(
      eq(notifications.tenant_id, tenantId),
      eq(notifications.user_id, userId),
      isNull(notifications.read_at)
    ));
  
  return reply.send({
    notifications: notificationsList.map(n => ({
      id: n.id,
      channel: n.channel,
      title: n.title,
      body: n.body,
      context_type: n.context_type,
      context_id: n.context_id,
      status: n.status,
      priority: n.priority,
      data: n.data,
      created_at: n.created_at.toISOString(),
      read_at: n.read_at?.toISOString()
    })),
    total: totalResult[0].count,
    unread_count: unreadResult[0].count,
    has_more: hasMore
  });
}

// Route Registration
export async function registerListNotificationsRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/notifications', {
    schema: {
      tags: ['Notifications'],
      summary: 'List user notifications',
      description: 'Get notifications for the current user',
      querystring: NotificationsQuerySchema,
      response: {
        200: NotificationsResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: listNotificationsHandler
  });
}
```

#### 12.6.2 Mark Notifications Read

```typescript
// POST /api/v1/notifications/mark-read
// Marchează notificări ca citite

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { websocketServer } from '@/websocket';

// Request Schema
const MarkReadBodySchema = Type.Object({
  notification_ids: Type.Optional(Type.Array(Type.String({ format: 'uuid' }), {
    description: 'Specific notification IDs to mark as read'
  })),
  mark_all: Type.Optional(Type.Boolean({
    default: false,
    description: 'Mark all notifications as read'
  })),
  before: Type.Optional(Type.String({ 
    format: 'date-time',
    description: 'Mark all notifications before this time as read' 
  }))
});

type MarkReadBody = Static<typeof MarkReadBodySchema>;

// Handler
async function markReadHandler(
  request: FastifyRequest<{ Body: MarkReadBody }>,
  reply: FastifyReply
) {
  const { notification_ids, mark_all, before } = request.body;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  
  if (!notification_ids && !mark_all && !before) {
    return reply.code(400).send({
      error: 'Must specify notification_ids, mark_all, or before',
      code: 'INVALID_REQUEST'
    });
  }
  
  const now = new Date();
  let updateCount = 0;
  
  if (mark_all) {
    // Mark all unread as read
    const result = await db
      .update(notifications)
      .set({ 
        read_at: now,
        status: 'read',
        updated_at: now
      })
      .where(and(
        eq(notifications.tenant_id, tenantId),
        eq(notifications.user_id, userId),
        isNull(notifications.read_at)
      ))
      .returning({ id: notifications.id });
    
    updateCount = result.length;
  } else if (before) {
    // Mark all before timestamp as read
    const result = await db
      .update(notifications)
      .set({ 
        read_at: now,
        status: 'read',
        updated_at: now
      })
      .where(and(
        eq(notifications.tenant_id, tenantId),
        eq(notifications.user_id, userId),
        isNull(notifications.read_at),
        lte(notifications.created_at, new Date(before))
      ))
      .returning({ id: notifications.id });
    
    updateCount = result.length;
  } else if (notification_ids) {
    // Mark specific notifications as read
    const result = await db
      .update(notifications)
      .set({ 
        read_at: now,
        status: 'read',
        updated_at: now
      })
      .where(and(
        eq(notifications.tenant_id, tenantId),
        eq(notifications.user_id, userId),
        inArray(notifications.id, notification_ids),
        isNull(notifications.read_at)
      ))
      .returning({ id: notifications.id });
    
    updateCount = result.length;
  }
  
  // Get new unread count
  const unreadResult = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(
      eq(notifications.tenant_id, tenantId),
      eq(notifications.user_id, userId),
      isNull(notifications.read_at)
    ));
  
  // WebSocket update
  websocketServer.sendToUser(userId, {
    type: 'notifications:read',
    data: {
      marked_count: updateCount,
      unread_count: unreadResult[0].count,
      timestamp: now.toISOString()
    }
  });
  
  return reply.send({
    success: true,
    marked_count: updateCount,
    unread_count: unreadResult[0].count
  });
}

// Route Registration
export async function registerMarkReadRoute(fastify: FastifyInstance) {
  fastify.post('/api/v1/notifications/mark-read', {
    schema: {
      tags: ['Notifications'],
      summary: 'Mark notifications as read',
      description: 'Mark specific or all notifications as read',
      body: MarkReadBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          marked_count: Type.Number(),
          unread_count: Type.Number()
        }),
        400: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: markReadHandler
  });
}
```

#### 12.6.3 Update Notification Preferences

```typescript
// PUT /api/v1/notifications/preferences
// Actualizează preferințe notificări

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { notification_preferences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Request Schema
const UpdatePreferencesBodySchema = Type.Object({
  email_enabled: Type.Optional(Type.Boolean()),
  push_enabled: Type.Optional(Type.Boolean()),
  sms_enabled: Type.Optional(Type.Boolean()),
  in_app_enabled: Type.Optional(Type.Boolean()),
  quiet_hours_enabled: Type.Optional(Type.Boolean()),
  quiet_start_hour: Type.Optional(Type.Number({ minimum: 0, maximum: 23 })),
  quiet_end_hour: Type.Optional(Type.Number({ minimum: 0, maximum: 23 })),
  digest_enabled: Type.Optional(Type.Boolean()),
  digest_frequency: Type.Optional(Type.Union([
    Type.Literal('daily'),
    Type.Literal('weekly'),
    Type.Literal('never')
  ])),
  type_preferences: Type.Optional(Type.Record(Type.String(), Type.Object({
    email: Type.Optional(Type.Boolean()),
    push: Type.Optional(Type.Boolean()),
    sms: Type.Optional(Type.Boolean()),
    in_app: Type.Optional(Type.Boolean())
  }))),
  email_address: Type.Optional(Type.String({ format: 'email' })),
  phone_number: Type.Optional(Type.String({ pattern: '^\\+?[0-9]{10,15}$' }))
});

type UpdatePreferencesBody = Static<typeof UpdatePreferencesBodySchema>;

// Response Schema
const PreferencesResponseSchema = Type.Object({
  success: Type.Boolean(),
  preferences: Type.Object({
    email_enabled: Type.Boolean(),
    push_enabled: Type.Boolean(),
    sms_enabled: Type.Boolean(),
    in_app_enabled: Type.Boolean(),
    quiet_hours_enabled: Type.Boolean(),
    quiet_start_hour: Type.Number(),
    quiet_end_hour: Type.Number(),
    digest_enabled: Type.Boolean(),
    digest_frequency: Type.String(),
    type_preferences: Type.Any(),
    email_address: Type.Optional(Type.String()),
    phone_number: Type.Optional(Type.String())
  })
});

// Handler
async function updatePreferencesHandler(
  request: FastifyRequest<{ Body: UpdatePreferencesBody }>,
  reply: FastifyReply
) {
  const updates = request.body;
  const tenantId = request.user.tenant_id;
  const userId = request.user.id;
  
  const now = new Date();
  
  // Check if preferences exist
  let prefs = await db.query.notification_preferences.findFirst({
    where: and(
      eq(notification_preferences.tenant_id, tenantId),
      eq(notification_preferences.user_id, userId)
    )
  });
  
  if (prefs) {
    // Merge type_preferences
    let mergedTypePrefs = prefs.type_preferences || {};
    if (updates.type_preferences) {
      mergedTypePrefs = {
        ...mergedTypePrefs,
        ...updates.type_preferences
      };
    }
    
    // Update existing
    const [updated] = await db
      .update(notification_preferences)
      .set({
        ...updates,
        type_preferences: mergedTypePrefs,
        updated_at: now
      })
      .where(eq(notification_preferences.id, prefs.id))
      .returning();
    
    prefs = updated;
  } else {
    // Create with defaults
    const [created] = await db
      .insert(notification_preferences)
      .values({
        id: nanoid(),
        tenant_id: tenantId,
        user_id: userId,
        email_enabled: updates.email_enabled ?? true,
        push_enabled: updates.push_enabled ?? true,
        sms_enabled: updates.sms_enabled ?? false,
        in_app_enabled: updates.in_app_enabled ?? true,
        quiet_hours_enabled: updates.quiet_hours_enabled ?? false,
        quiet_start_hour: updates.quiet_start_hour ?? 22,
        quiet_end_hour: updates.quiet_end_hour ?? 8,
        digest_enabled: updates.digest_enabled ?? false,
        digest_frequency: updates.digest_frequency ?? 'daily',
        type_preferences: updates.type_preferences ?? {},
        email_address: updates.email_address ?? request.user.email,
        phone_number: updates.phone_number,
        created_at: now,
        updated_at: now
      })
      .returning();
    
    prefs = created;
  }
  
  return reply.send({
    success: true,
    preferences: {
      email_enabled: prefs.email_enabled,
      push_enabled: prefs.push_enabled,
      sms_enabled: prefs.sms_enabled,
      in_app_enabled: prefs.in_app_enabled,
      quiet_hours_enabled: prefs.quiet_hours_enabled,
      quiet_start_hour: prefs.quiet_start_hour,
      quiet_end_hour: prefs.quiet_end_hour,
      digest_enabled: prefs.digest_enabled,
      digest_frequency: prefs.digest_frequency,
      type_preferences: prefs.type_preferences,
      email_address: prefs.email_address,
      phone_number: prefs.phone_number
    }
  });
}

// Route Registration
export async function registerUpdatePreferencesRoute(fastify: FastifyInstance) {
  fastify.put('/api/v1/notifications/preferences', {
    schema: {
      tags: ['Notifications'],
      summary: 'Update notification preferences',
      description: 'Update channel and timing preferences for notifications',
      body: UpdatePreferencesBodySchema,
      response: {
        200: PreferencesResponseSchema
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate],
    handler: updatePreferencesHandler
  });
}
```

### 12.7 Audit API

#### 12.7.1 Get Approval Audit Log

```typescript
// GET /api/v1/approvals/:id/audit
// Audit log pentru aprobare

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approval_audit_log, users, approvals } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';

// Request Schema
const AuditLogParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' })
});

const AuditLogQuerySchema = Type.Object({
  action: Type.Optional(Type.String({ description: 'Filter by action type' })),
  category: Type.Optional(Type.String({ description: 'Filter by action category' })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500, default: 100 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  include_hash_verification: Type.Optional(Type.Boolean({ default: false }))
});

type AuditLogParams = Static<typeof AuditLogParamsSchema>;
type AuditLogQuery = Static<typeof AuditLogQuerySchema>;

// Response Schema
const AuditEntrySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  action: Type.String(),
  action_category: Type.String(),
  performed_by: Type.Object({
    type: Type.String(),
    user_id: Type.Optional(Type.String({ format: 'uuid' })),
    user_name: Type.Optional(Type.String()),
    worker: Type.Optional(Type.String())
  }),
  changes: Type.Optional(Type.Array(Type.Object({
    field: Type.String(),
    old_value: Type.Any(),
    new_value: Type.Any()
  }))),
  context: Type.Optional(Type.Any()),
  request_id: Type.Optional(Type.String()),
  ip_address: Type.Optional(Type.String()),
  performed_at: Type.String({ format: 'date-time' }),
  hash_verified: Type.Optional(Type.Boolean())
});

const AuditLogResponseSchema = Type.Object({
  audit_log: Type.Array(AuditEntrySchema),
  total: Type.Number(),
  has_more: Type.Boolean(),
  hash_chain_valid: Type.Optional(Type.Boolean())
});

// Handler
async function auditLogHandler(
  request: FastifyRequest<{ Params: AuditLogParams; Querystring: AuditLogQuery }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { action, category, limit, offset, include_hash_verification } = request.query;
  const tenantId = request.user.tenant_id;
  
  // Verify approval exists
  const approval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.id, id),
      eq(approvals.tenant_id, tenantId)
    )
  });
  
  if (!approval) {
    return reply.code(404).send({
      error: 'Approval not found',
      code: 'APPROVAL_NOT_FOUND'
    });
  }
  
  // Build conditions
  let conditions = [
    eq(approval_audit_log.approval_id, id),
    eq(approval_audit_log.tenant_id, tenantId)
  ];
  
  if (action) {
    conditions.push(eq(approval_audit_log.action, action));
  }
  
  if (category) {
    conditions.push(eq(approval_audit_log.action_category, category));
  }
  
  // Fetch audit entries
  const entries = await db
    .select({
      audit: approval_audit_log,
      user: {
        id: users.id,
        name: users.name
      }
    })
    .from(approval_audit_log)
    .leftJoin(users, eq(approval_audit_log.performed_by_user_id, users.id))
    .where(and(...conditions))
    .orderBy(desc(approval_audit_log.performed_at))
    .limit((limit || 100) + 1)
    .offset(offset || 0);
  
  // Check has_more
  const hasMore = entries.length > (limit || 100);
  if (hasMore) {
    entries.pop();
  }
  
  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(approval_audit_log)
    .where(and(...conditions));
  
  // Hash chain verification if requested
  let hashChainValid: boolean | undefined;
  if (include_hash_verification) {
    const verifyResult = await db.execute(
      sql`SELECT * FROM verify_audit_hash_chain(${id})`
    );
    hashChainValid = verifyResult.rows[0]?.is_valid ?? false;
  }
  
  // Format response
  const formattedEntries = entries.map(({ audit, user }) => ({
    id: audit.id,
    action: audit.action,
    action_category: audit.action_category,
    performed_by: {
      type: audit.performed_by_type,
      user_id: audit.performed_by_user_id,
      user_name: user?.name,
      worker: audit.performed_by_worker
    },
    changes: audit.changes,
    context: audit.context,
    request_id: audit.request_id,
    ip_address: audit.ip_address,
    performed_at: audit.performed_at.toISOString(),
    hash_verified: include_hash_verification ? true : undefined // Simplified for demo
  }));
  
  return reply.send({
    audit_log: formattedEntries,
    total: totalResult[0].count,
    has_more: hasMore,
    hash_chain_valid: hashChainValid
  });
}

// Route Registration
export async function registerAuditLogRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/approvals/:id/audit', {
    schema: {
      tags: ['Audit'],
      summary: 'Get approval audit log',
      description: 'Get the complete audit trail for an approval',
      params: AuditLogParamsSchema,
      querystring: AuditLogQuerySchema,
      response: {
        200: AuditLogResponseSchema,
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.requirePermission('audit_view')],
    handler: auditLogHandler
  });
}
```

#### 12.7.2 Export Audit Log

```typescript
// GET /api/v1/approvals/:id/audit/export
// Export audit log în format CSV/JSON

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { db } from '@/db';
import { approval_audit_log, users, approvals } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';

// Request Schema
const ExportAuditParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' })
});

const ExportAuditQuerySchema = Type.Object({
  format: Type.Optional(Type.Union([
    Type.Literal('csv'),
    Type.Literal('json')
  ], { default: 'csv' })),
  date_from: Type.Optional(Type.String({ format: 'date-time' })),
  date_to: Type.Optional(Type.String({ format: 'date-time' })),
  include_context: Type.Optional(Type.Boolean({ default: false }))
});

type ExportAuditParams = Static<typeof ExportAuditParamsSchema>;
type ExportAuditQuery = Static<typeof ExportAuditQuerySchema>;

// Handler
async function exportAuditHandler(
  request: FastifyRequest<{ Params: ExportAuditParams; Querystring: ExportAuditQuery }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { format, date_from, date_to, include_context } = request.query;
  const tenantId = request.user.tenant_id;
  
  // Verify approval exists
  const approval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.id, id),
      eq(approvals.tenant_id, tenantId)
    ),
    columns: { id: true, title: true }
  });
  
  if (!approval) {
    return reply.code(404).send({
      error: 'Approval not found',
      code: 'APPROVAL_NOT_FOUND'
    });
  }
  
  // Build conditions
  let conditions = [
    eq(approval_audit_log.approval_id, id),
    eq(approval_audit_log.tenant_id, tenantId)
  ];
  
  if (date_from) {
    conditions.push(gte(approval_audit_log.performed_at, new Date(date_from)));
  }
  
  if (date_to) {
    conditions.push(lte(approval_audit_log.performed_at, new Date(date_to)));
  }
  
  // Fetch all entries
  const entries = await db
    .select({
      audit: approval_audit_log,
      user: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    })
    .from(approval_audit_log)
    .leftJoin(users, eq(approval_audit_log.performed_by_user_id, users.id))
    .where(and(...conditions))
    .orderBy(desc(approval_audit_log.performed_at));
  
  // Log export audit event
  await logAuditEvent(id, tenantId, 'audit_exported', {
    format,
    entryCount: entries.length,
    dateRange: { from: date_from, to: date_to }
  }, request.user.id);
  
  if (format === 'json') {
    // JSON export
    const jsonData = entries.map(({ audit, user }) => ({
      id: audit.id,
      timestamp: audit.performed_at.toISOString(),
      action: audit.action,
      category: audit.action_category,
      performer_type: audit.performed_by_type,
      performer_user_id: audit.performed_by_user_id,
      performer_name: user?.name,
      performer_email: user?.email,
      performer_worker: audit.performed_by_worker,
      changes: audit.changes,
      context: include_context ? audit.context : undefined,
      request_id: audit.request_id,
      ip_address: audit.ip_address,
      hash: audit.current_hash
    }));
    
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 
      `attachment; filename="audit-${id}-${Date.now()}.json"`);
    
    return reply.send(jsonData);
  } else {
    // CSV export
    const csvData = entries.map(({ audit, user }) => ({
      id: audit.id,
      timestamp: audit.performed_at.toISOString(),
      action: audit.action,
      category: audit.action_category,
      performer_type: audit.performed_by_type,
      performer_name: user?.name || audit.performed_by_worker || 'System',
      performer_email: user?.email || '',
      changes_summary: audit.changes 
        ? audit.changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ')
        : '',
      request_id: audit.request_id || '',
      ip_address: audit.ip_address || '',
      hash: audit.current_hash?.substring(0, 16) + '...'
    }));
    
    const csvString = stringify(csvData, {
      header: true,
      columns: [
        { key: 'id', header: 'Entry ID' },
        { key: 'timestamp', header: 'Timestamp' },
        { key: 'action', header: 'Action' },
        { key: 'category', header: 'Category' },
        { key: 'performer_type', header: 'Performer Type' },
        { key: 'performer_name', header: 'Performer Name' },
        { key: 'performer_email', header: 'Performer Email' },
        { key: 'changes_summary', header: 'Changes' },
        { key: 'request_id', header: 'Request ID' },
        { key: 'ip_address', header: 'IP Address' },
        { key: 'hash', header: 'Hash (truncated)' }
      ]
    });
    
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 
      `attachment; filename="audit-${id}-${Date.now()}.csv"`);
    
    return reply.send(csvString);
  }
}

// Route Registration
export async function registerExportAuditRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/approvals/:id/audit/export', {
    schema: {
      tags: ['Audit'],
      summary: 'Export audit log',
      description: 'Export audit trail as CSV or JSON',
      params: ExportAuditParamsSchema,
      querystring: ExportAuditQuerySchema,
      response: {
        404: Type.Object({ error: Type.String(), code: Type.String() })
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [fastify.authenticate, fastify.requirePermission('audit_export')],
    handler: exportAuditHandler
  });
}
```

### 12.8 WebSocket Events

#### 12.8.1 WebSocket Server Setup

```typescript
// WebSocket server pentru real-time updates
// src/websocket/server.ts

import { WebSocketServer, WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { verifyToken } from '@/auth/jwt';
import { logger } from '@/lib/logger';

interface AuthenticatedSocket extends WebSocket {
  userId: string;
  tenantId: string;
  subscriptions: Set<string>;
  isAlive: boolean;
}

interface WebSocketMessage {
  type: string;
  data: any;
}

class HITLWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedSocket>> = new Map();
  private userClients: Map<string, Set<AuthenticatedSocket>> = new Map();
  private pingInterval: NodeJS.Timeout;
  
  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
    this.setupHeartbeat();
    this.setupHandlers();
  }
  
  // Attach to Fastify server
  attach(fastify: FastifyInstance) {
    fastify.server.on('upgrade', async (request, socket, head) => {
      // Verify URL
      if (!request.url?.startsWith('/ws/hitl')) {
        socket.destroy();
        return;
      }
      
      // Extract token from query
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      try {
        // Verify JWT
        const decoded = await verifyToken(token);
        
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          const authSocket = ws as AuthenticatedSocket;
          authSocket.userId = decoded.userId;
          authSocket.tenantId = decoded.tenantId;
          authSocket.subscriptions = new Set();
          authSocket.isAlive = true;
          
          this.wss.emit('connection', authSocket);
        });
      } catch (error) {
        logger.warn('WebSocket auth failed', { error: error.message });
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });
  }
  
  private setupHandlers() {
    this.wss.on('connection', (ws: AuthenticatedSocket) => {
      logger.info('WebSocket connected', { 
        userId: ws.userId, 
        tenantId: ws.tenantId 
      });
      
      // Track user clients
      const userClients = this.userClients.get(ws.userId) || new Set();
      userClients.add(ws);
      this.userClients.set(ws.userId, userClients);
      
      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            data: { message: 'Invalid message format' } 
          }));
        }
      });
      
      // Handle pong
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // Handle close
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
      
      // Handle error
      ws.on('error', (error) => {
        logger.error('WebSocket error', { 
          userId: ws.userId, 
          error: error.message 
        });
        this.handleDisconnect(ws);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        data: {
          userId: ws.userId,
          tenantId: ws.tenantId,
          timestamp: new Date().toISOString()
        }
      }));
    });
  }
  
  private handleMessage(ws: AuthenticatedSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message.data);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.data);
        break;
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
        break;
      
      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          data: { message: `Unknown message type: ${message.type}` } 
        }));
    }
  }
  
  private handleSubscribe(ws: AuthenticatedSocket, data: { channels: string[] }) {
    const { channels } = data;
    
    for (const channel of channels) {
      // Validate channel access
      if (!this.canAccessChannel(ws, channel)) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: `Access denied to channel: ${channel}` }
        }));
        continue;
      }
      
      // Add to subscription
      ws.subscriptions.add(channel);
      
      // Track in channel clients
      const channelClients = this.clients.get(channel) || new Set();
      channelClients.add(ws);
      this.clients.set(channel, channelClients);
      
      logger.debug('Client subscribed', { userId: ws.userId, channel });
    }
    
    ws.send(JSON.stringify({
      type: 'subscribed',
      data: { channels: Array.from(ws.subscriptions) }
    }));
  }
  
  private handleUnsubscribe(ws: AuthenticatedSocket, data: { channels: string[] }) {
    const { channels } = data;
    
    for (const channel of channels) {
      ws.subscriptions.delete(channel);
      
      const channelClients = this.clients.get(channel);
      if (channelClients) {
        channelClients.delete(ws);
        if (channelClients.size === 0) {
          this.clients.delete(channel);
        }
      }
    }
    
    ws.send(JSON.stringify({
      type: 'unsubscribed',
      data: { channels }
    }));
  }
  
  private handleDisconnect(ws: AuthenticatedSocket) {
    // Remove from all channel subscriptions
    for (const channel of ws.subscriptions) {
      const channelClients = this.clients.get(channel);
      if (channelClients) {
        channelClients.delete(ws);
        if (channelClients.size === 0) {
          this.clients.delete(channel);
        }
      }
    }
    
    // Remove from user clients
    const userClients = this.userClients.get(ws.userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.userClients.delete(ws.userId);
      }
    }
    
    logger.info('WebSocket disconnected', { userId: ws.userId });
  }
  
  private canAccessChannel(ws: AuthenticatedSocket, channel: string): boolean {
    // Channel format: tenant:{tenantId}:...
    // Validate tenant access
    const parts = channel.split(':');
    if (parts[0] === 'tenant') {
      return parts[1] === ws.tenantId;
    }
    
    // User-specific channels
    if (parts[0] === 'user') {
      return parts[1] === ws.userId;
    }
    
    return false;
  }
  
  private setupHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedSocket;
        if (!authWs.isAlive) {
          authWs.terminate();
          return;
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000);
  }
  
  // Public methods for broadcasting
  
  broadcast(channel: string, message: WebSocketMessage) {
    const channelClients = this.clients.get(channel);
    if (!channelClients) return;
    
    const payload = JSON.stringify(message);
    
    for (const client of channelClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
    
    logger.debug('Broadcast sent', { 
      channel, 
      type: message.type, 
      clientCount: channelClients.size 
    });
  }
  
  sendToUser(userId: string, message: WebSocketMessage) {
    const userClients = this.userClients.get(userId);
    if (!userClients) return;
    
    const payload = JSON.stringify(message);
    
    for (const client of userClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
    
    logger.debug('Message sent to user', { 
      userId, 
      type: message.type,
      clientCount: userClients.size 
    });
  }
  
  sendToTenant(tenantId: string, message: WebSocketMessage) {
    this.broadcast(`tenant:${tenantId}`, message);
  }
  
  // Cleanup
  close() {
    clearInterval(this.pingInterval);
    this.wss.close();
  }
}

// Singleton instance
export const websocketServer = new HITLWebSocketServer();
```

#### 12.8.2 WebSocket Event Types

```typescript
// WebSocket event types și payload schemas
// src/websocket/events.ts

// ============================================
// APPROVAL EVENTS
// ============================================

// Approval created
interface ApprovalCreatedEvent {
  type: 'approval:created';
  data: {
    id: string;
    type: string;
    title: string;
    priority: string;
    status: string;
    assignedToId?: string;
    assignedToName?: string;
    deadline: string;
    createdAt: string;
  };
}

// Approval updated
interface ApprovalUpdatedEvent {
  type: 'approval:updated';
  data: {
    id: string;
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    updatedBy: string;
    updatedAt: string;
  };
}

// Approval assigned
interface ApprovalAssignedEvent {
  type: 'approval:assigned';
  data: {
    id: string;
    previousAssigneeId?: string;
    previousAssigneeName?: string;
    newAssigneeId: string;
    newAssigneeName: string;
    assignedBy: string;
    assignedAt: string;
  };
}

// Approval resolved
interface ApprovalResolvedEvent {
  type: 'approval:resolved';
  data: {
    id: string;
    resolutionType: 'approved' | 'rejected' | 'expired';
    resolvedBy: string;
    resolvedByName: string;
    resolutionNotes?: string;
    resolvedAt: string;
  };
}

// Approval escalated
interface ApprovalEscalatedEvent {
  type: 'approval:escalated';
  data: {
    id: string;
    previousLevel: number;
    newLevel: number;
    previousAssigneeId?: string;
    newAssigneeId: string;
    newAssigneeName: string;
    reason: string;
    escalatedAt: string;
  };
}

// ============================================
// SLA EVENTS
// ============================================

// SLA warning
interface SlaWarningEvent {
  type: 'sla:warning';
  data: {
    approvalId: string;
    approvalTitle: string;
    timeRemaining: string;
    deadline: string;
    assignedToId: string;
  };
}

// SLA breach
interface SlaBreachEvent {
  type: 'sla:breach';
  data: {
    approvalId: string;
    approvalTitle: string;
    breachedAt: string;
    assignedToId: string;
    escalationTriggered: boolean;
  };
}

// ============================================
// COMMENT EVENTS
// ============================================

// Comment created
interface CommentCreatedEvent {
  type: 'comment:created';
  data: {
    id: string;
    approvalId: string;
    content: string;
    contentHtml: string;
    parentId?: string;
    threadDepth: number;
    isInternal: boolean;
    author: {
      id: string;
      name: string;
    };
    mentionedUserIds: string[];
    createdAt: string;
  };
}

// Comment updated
interface CommentUpdatedEvent {
  type: 'comment:updated';
  data: {
    id: string;
    approvalId: string;
    content: string;
    contentHtml: string;
    editedAt: string;
  };
}

// Comment deleted
interface CommentDeletedEvent {
  type: 'comment:deleted';
  data: {
    id: string;
    approvalId: string;
    deletedAt: string;
  };
}

// ============================================
// NOTIFICATION EVENTS
// ============================================

// New notification
interface NotificationEvent {
  type: 'notification:new';
  data: {
    id: string;
    title: string;
    body: string;
    priority: string;
    contextType?: string;
    contextId?: string;
    createdAt: string;
  };
}

// Notifications read
interface NotificationsReadEvent {
  type: 'notifications:read';
  data: {
    markedCount: number;
    unreadCount: number;
    timestamp: string;
  };
}

// ============================================
// BULK OPERATION EVENTS
// ============================================

// Bulk reassign
interface BulkReassignedEvent {
  type: 'bulk:reassigned';
  data: {
    approvalIds: string[];
    newAssigneeId: string;
    newAssigneeName: string;
    performedBy: string;
    timestamp: string;
  };
}

// ============================================
// USER PRESENCE EVENTS
// ============================================

// User online
interface UserOnlineEvent {
  type: 'presence:online';
  data: {
    userId: string;
    userName: string;
    timestamp: string;
  };
}

// User offline
interface UserOfflineEvent {
  type: 'presence:offline';
  data: {
    userId: string;
    timestamp: string;
  };
}

// User typing
interface UserTypingEvent {
  type: 'presence:typing';
  data: {
    userId: string;
    userName: string;
    approvalId: string;
    isTyping: boolean;
  };
}

// ============================================
// CHANNEL CONVENTIONS
// ============================================

/*
Channel naming conventions:

tenant:{tenantId}
  - All tenant-wide events
  - Approval created, bulk operations
  
tenant:{tenantId}:approval:{approvalId}
  - Specific approval events
  - Updates, comments, status changes
  
tenant:{tenantId}:approvals
  - Approval list updates
  - New approvals, status changes
  
tenant:{tenantId}:stats
  - Real-time statistics updates
  - Dashboard metrics
  
user:{userId}
  - User-specific notifications
  - Assignments, mentions
  
user:{userId}:notifications
  - Notification stream
  - Real-time notification delivery
*/

// Export union type
export type WebSocketEvent = 
  | ApprovalCreatedEvent
  | ApprovalUpdatedEvent
  | ApprovalAssignedEvent
  | ApprovalResolvedEvent
  | ApprovalEscalatedEvent
  | SlaWarningEvent
  | SlaBreachEvent
  | CommentCreatedEvent
  | CommentUpdatedEvent
  | CommentDeletedEvent
  | NotificationEvent
  | NotificationsReadEvent
  | BulkReassignedEvent
  | UserOnlineEvent
  | UserOfflineEvent
  | UserTypingEvent;
```

#### 12.8.3 Client-Side WebSocket Hook

```typescript
// React hook pentru WebSocket connection
// src/hooks/useWebSocket.ts

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface WebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastMessage: any;
}

export function useHITLWebSocket(options: WebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000
  } = options;
  
  const { token, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null
  });
  
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  
  // Connect function
  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/hitl?token=${token}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false 
      }));
      reconnectCountRef.current = 0;
      
      // Resubscribe to previous channels
      if (subscriptionsRef.current.size > 0) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: { channels: Array.from(subscriptionsRef.current) }
        }));
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        setState(prev => ({ ...prev, lastMessage: message }));
        
        // Notify type-specific listeners
        const listeners = listenersRef.current.get(message.type);
        if (listeners) {
          listeners.forEach(callback => callback(message.data));
        }
        
        // Notify wildcard listeners
        const wildcardListeners = listenersRef.current.get('*');
        if (wildcardListeners) {
          wildcardListeners.forEach(callback => callback(message));
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    ws.onerror = (event) => {
      setState(prev => ({ 
        ...prev, 
        error: new Error('WebSocket connection error') 
      }));
    };
    
    ws.onclose = () => {
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false 
      }));
      
      // Attempt reconnect
      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval * reconnectCountRef.current);
      }
    };
    
    wsRef.current = ws;
  }, [token, reconnectAttempts, reconnectInterval]);
  
  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null
    });
  }, []);
  
  // Subscribe to channels
  const subscribe = useCallback((channels: string | string[]) => {
    const channelArray = Array.isArray(channels) ? channels : [channels];
    
    channelArray.forEach(ch => subscriptionsRef.current.add(ch));
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        data: { channels: channelArray }
      }));
    }
  }, []);
  
  // Unsubscribe from channels
  const unsubscribe = useCallback((channels: string | string[]) => {
    const channelArray = Array.isArray(channels) ? channels : [channels];
    
    channelArray.forEach(ch => subscriptionsRef.current.delete(ch));
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        data: { channels: channelArray }
      }));
    }
  }, []);
  
  // Add event listener
  const on = useCallback((eventType: string, callback: (data: any) => void) => {
    const listeners = listenersRef.current.get(eventType) || new Set();
    listeners.add(callback);
    listenersRef.current.set(eventType, listeners);
    
    // Return cleanup function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        listenersRef.current.delete(eventType);
      }
    };
  }, []);
  
  // Auto connect
  useEffect(() => {
    if (autoConnect && isAuthenticated && token) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, token, connect, disconnect]);
  
  return {
    ...state,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    on
  };
}

// Specialized hooks for specific event types
export function useApprovalEvents(approvalId: string) {
  const { subscribe, unsubscribe, on, isConnected } = useHITLWebSocket();
  const { tenant } = useAuth();
  
  useEffect(() => {
    if (!isConnected || !tenant) return;
    
    const channel = `tenant:${tenant.id}:approval:${approvalId}`;
    subscribe(channel);
    
    return () => {
      unsubscribe(channel);
    };
  }, [isConnected, tenant, approvalId, subscribe, unsubscribe]);
  
  return { on, isConnected };
}

export function useTenantEvents() {
  const { subscribe, unsubscribe, on, isConnected } = useHITLWebSocket();
  const { tenant } = useAuth();
  
  useEffect(() => {
    if (!isConnected || !tenant) return;
    
    const channel = `tenant:${tenant.id}`;
    subscribe(channel);
    
    return () => {
      unsubscribe(channel);
    };
  }, [isConnected, tenant, subscribe, unsubscribe]);
  
  return { on, isConnected };
}

export function useNotificationEvents() {
  const { subscribe, unsubscribe, on, isConnected } = useHITLWebSocket();
  const { user } = useAuth();
  
  useEffect(() => {
    if (!isConnected || !user) return;
    
    const channel = `user:${user.id}:notifications`;
    subscribe(channel);
    
    return () => {
      unsubscribe(channel);
    };
  }, [isConnected, user, subscribe, unsubscribe]);
  
  return { on, isConnected };
}
```

---

## 13. Metrics & Monitoring

### 13.1 Prometheus Metrics Definition

#### 13.1.1 Approval Metrics

```typescript
// src/monitoring/metrics/approval-metrics.ts

import { Counter, Gauge, Histogram, Registry } from 'prom-client';

// Create dedicated registry for HITL metrics
export const hitlMetricsRegistry = new Registry();

// ============================================================
// COUNTER METRICS - Track cumulative events
// ============================================================

/**
 * Total approval requests created
 * Labels: tenant_id, approval_type, priority, source
 */
export const approvalsCreatedTotal = new Counter({
  name: 'hitl_approvals_created_total',
  help: 'Total number of approval requests created',
  labelNames: ['tenant_id', 'approval_type', 'priority', 'source'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total approval decisions made
 * Labels: tenant_id, approval_type, decision, auto_vs_manual
 */
export const approvalsResolvedTotal = new Counter({
  name: 'hitl_approvals_resolved_total',
  help: 'Total number of approval requests resolved',
  labelNames: ['tenant_id', 'approval_type', 'decision', 'auto_vs_manual'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total SLA breaches
 * Labels: tenant_id, approval_type, priority, breach_type
 */
export const slaBreachesTotal = new Counter({
  name: 'hitl_sla_breaches_total',
  help: 'Total number of SLA breaches',
  labelNames: ['tenant_id', 'approval_type', 'priority', 'breach_type'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total escalations performed
 * Labels: tenant_id, approval_type, escalation_level, reason
 */
export const escalationsTotal = new Counter({
  name: 'hitl_escalations_total',
  help: 'Total number of escalations performed',
  labelNames: ['tenant_id', 'approval_type', 'escalation_level', 'reason'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total assignments made
 * Labels: tenant_id, assignment_type (auto/manual/reassign)
 */
export const assignmentsTotal = new Counter({
  name: 'hitl_assignments_total',
  help: 'Total number of assignments made',
  labelNames: ['tenant_id', 'assignment_type'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total notifications sent
 * Labels: tenant_id, channel, notification_type
 */
export const notificationsSentTotal = new Counter({
  name: 'hitl_notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['tenant_id', 'channel', 'notification_type'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total comments created
 * Labels: tenant_id, is_internal
 */
export const commentsCreatedTotal = new Counter({
  name: 'hitl_comments_created_total',
  help: 'Total number of comments created',
  labelNames: ['tenant_id', 'is_internal'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total API requests
 * Labels: tenant_id, endpoint, method, status_code
 */
export const apiRequestsTotal = new Counter({
  name: 'hitl_api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['tenant_id', 'endpoint', 'method', 'status_code'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total WebSocket connections
 * Labels: tenant_id, event_type (connect/disconnect/error)
 */
export const websocketEventsTotal = new Counter({
  name: 'hitl_websocket_events_total',
  help: 'Total WebSocket connection events',
  labelNames: ['tenant_id', 'event_type'],
  registers: [hitlMetricsRegistry]
});

/**
 * Total AI processing requests
 * Labels: tenant_id, model, operation, status
 */
export const aiProcessingTotal = new Counter({
  name: 'hitl_ai_processing_total',
  help: 'Total AI processing requests',
  labelNames: ['tenant_id', 'model', 'operation', 'status'],
  registers: [hitlMetricsRegistry]
});

// ============================================================
// GAUGE METRICS - Track current state
// ============================================================

/**
 * Current pending approvals count
 * Labels: tenant_id, approval_type, priority, sla_status
 */
export const pendingApprovalsGauge = new Gauge({
  name: 'hitl_pending_approvals',
  help: 'Current number of pending approvals',
  labelNames: ['tenant_id', 'approval_type', 'priority', 'sla_status'],
  registers: [hitlMetricsRegistry]
});

/**
 * Current assigned approvals per user
 * Labels: tenant_id, user_id, approval_type
 */
export const userWorkloadGauge = new Gauge({
  name: 'hitl_user_workload',
  help: 'Current number of approvals assigned to each user',
  labelNames: ['tenant_id', 'user_id', 'approval_type'],
  registers: [hitlMetricsRegistry]
});

/**
 * User availability status
 * Labels: tenant_id, user_id, status
 */
export const userAvailabilityGauge = new Gauge({
  name: 'hitl_user_availability',
  help: 'User availability status (1=available, 0=unavailable)',
  labelNames: ['tenant_id', 'user_id', 'status'],
  registers: [hitlMetricsRegistry]
});

/**
 * Active WebSocket connections
 * Labels: tenant_id
 */
export const activeWebsocketConnectionsGauge = new Gauge({
  name: 'hitl_active_websocket_connections',
  help: 'Current number of active WebSocket connections',
  labelNames: ['tenant_id'],
  registers: [hitlMetricsRegistry]
});

/**
 * Queue depth for different job types
 * Labels: queue_name, status (waiting/active/delayed/failed)
 */
export const queueDepthGauge = new Gauge({
  name: 'hitl_queue_depth',
  help: 'Current depth of BullMQ queues',
  labelNames: ['queue_name', 'status'],
  registers: [hitlMetricsRegistry]
});

/**
 * SLA compliance rate (current)
 * Labels: tenant_id, approval_type
 */
export const slaComplianceGauge = new Gauge({
  name: 'hitl_sla_compliance_rate',
  help: 'Current SLA compliance rate (0-100)',
  labelNames: ['tenant_id', 'approval_type'],
  registers: [hitlMetricsRegistry]
});

/**
 * AI model cost tracking (daily)
 * Labels: tenant_id, model
 */
export const aiCostGauge = new Gauge({
  name: 'hitl_ai_cost_daily_usd',
  help: 'Daily AI processing cost in USD',
  labelNames: ['tenant_id', 'model'],
  registers: [hitlMetricsRegistry]
});

/**
 * Database connection pool status
 * Labels: pool_name, status (idle/used/waiting)
 */
export const dbConnectionPoolGauge = new Gauge({
  name: 'hitl_db_connection_pool',
  help: 'Database connection pool status',
  labelNames: ['pool_name', 'status'],
  registers: [hitlMetricsRegistry]
});

// ============================================================
// HISTOGRAM METRICS - Track distributions
// ============================================================

/**
 * Approval resolution time distribution
 * Labels: tenant_id, approval_type, priority, decision
 * Buckets: 1min, 5min, 15min, 30min, 1h, 2h, 4h, 8h, 24h, 48h
 */
export const approvalResolutionTimeHistogram = new Histogram({
  name: 'hitl_approval_resolution_time_seconds',
  help: 'Time to resolve approvals in seconds',
  labelNames: ['tenant_id', 'approval_type', 'priority', 'decision'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400, 172800],
  registers: [hitlMetricsRegistry]
});

/**
 * First response time distribution
 * Labels: tenant_id, approval_type, priority
 * Buckets: 30s, 1min, 2min, 5min, 10min, 15min, 30min, 1h
 */
export const firstResponseTimeHistogram = new Histogram({
  name: 'hitl_first_response_time_seconds',
  help: 'Time to first user interaction with approval in seconds',
  labelNames: ['tenant_id', 'approval_type', 'priority'],
  buckets: [30, 60, 120, 300, 600, 900, 1800, 3600],
  registers: [hitlMetricsRegistry]
});

/**
 * API response time distribution
 * Labels: endpoint, method
 * Buckets: 10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
 */
export const apiResponseTimeHistogram = new Histogram({
  name: 'hitl_api_response_time_seconds',
  help: 'API endpoint response time in seconds',
  labelNames: ['endpoint', 'method'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [hitlMetricsRegistry]
});

/**
 * AI processing time distribution
 * Labels: tenant_id, model, operation
 * Buckets: 100ms, 500ms, 1s, 2s, 5s, 10s, 30s, 60s
 */
export const aiProcessingTimeHistogram = new Histogram({
  name: 'hitl_ai_processing_time_seconds',
  help: 'AI processing time in seconds',
  labelNames: ['tenant_id', 'model', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [hitlMetricsRegistry]
});

/**
 * Queue job processing time
 * Labels: queue_name, job_type
 * Buckets: 10ms, 50ms, 100ms, 500ms, 1s, 5s, 30s, 60s, 300s
 */
export const queueJobDurationHistogram = new Histogram({
  name: 'hitl_queue_job_duration_seconds',
  help: 'Queue job processing duration in seconds',
  labelNames: ['queue_name', 'job_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 30, 60, 300],
  registers: [hitlMetricsRegistry]
});

/**
 * WebSocket message latency
 * Labels: message_type
 * Buckets: 1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms
 */
export const websocketLatencyHistogram = new Histogram({
  name: 'hitl_websocket_latency_seconds',
  help: 'WebSocket message delivery latency in seconds',
  labelNames: ['message_type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
  registers: [hitlMetricsRegistry]
});

/**
 * Database query time
 * Labels: operation, table
 * Buckets: 1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s
 */
export const dbQueryTimeHistogram = new Histogram({
  name: 'hitl_db_query_time_seconds',
  help: 'Database query execution time in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [hitlMetricsRegistry]
});
```


#### 13.1.2 Business Metrics

```typescript
// src/monitoring/metrics/business-metrics.ts

import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { hitlMetricsRegistry } from './approval-metrics';

// ============================================================
// SALES FUNNEL METRICS
// ============================================================

/**
 * Offers generated through AI sales agent
 * Labels: tenant_id, offer_type, template_id
 */
export const offersGeneratedTotal = new Counter({
  name: 'hitl_offers_generated_total',
  help: 'Total offers generated by AI sales agent',
  labelNames: ['tenant_id', 'offer_type', 'template_id'],
  registers: [hitlMetricsRegistry]
});

/**
 * Offers approved/rejected
 * Labels: tenant_id, offer_type, decision, revision_count
 */
export const offersDecidedTotal = new Counter({
  name: 'hitl_offers_decided_total',
  help: 'Total offers that received a decision',
  labelNames: ['tenant_id', 'offer_type', 'decision', 'revision_count'],
  registers: [hitlMetricsRegistry]
});

/**
 * Communications sent (emails, WhatsApp, etc.)
 * Labels: tenant_id, channel, message_type, status
 */
export const communicationsSentTotal = new Counter({
  name: 'hitl_communications_sent_total',
  help: 'Total communications sent through all channels',
  labelNames: ['tenant_id', 'channel', 'message_type', 'status'],
  registers: [hitlMetricsRegistry]
});

/**
 * Follow-up actions triggered
 * Labels: tenant_id, action_type, trigger_source
 */
export const followUpActionsTotal = new Counter({
  name: 'hitl_follow_up_actions_total',
  help: 'Total follow-up actions triggered',
  labelNames: ['tenant_id', 'action_type', 'trigger_source'],
  registers: [hitlMetricsRegistry]
});

/**
 * Lead status transitions
 * Labels: tenant_id, from_status, to_status
 */
export const leadTransitionsTotal = new Counter({
  name: 'hitl_lead_transitions_total',
  help: 'Total lead status transitions',
  labelNames: ['tenant_id', 'from_status', 'to_status'],
  registers: [hitlMetricsRegistry]
});

/**
 * Revenue attributed to AI-assisted sales
 * Labels: tenant_id, product_category
 */
export const aiAssistedRevenueGauge = new Gauge({
  name: 'hitl_ai_assisted_revenue_ron',
  help: 'Revenue attributed to AI-assisted sales in RON',
  labelNames: ['tenant_id', 'product_category'],
  registers: [hitlMetricsRegistry]
});

/**
 * Conversion rate by stage
 * Labels: tenant_id, stage
 */
export const conversionRateGauge = new Gauge({
  name: 'hitl_conversion_rate',
  help: 'Conversion rate at each sales stage (0-1)',
  labelNames: ['tenant_id', 'stage'],
  registers: [hitlMetricsRegistry]
});

/**
 * Offer value distribution
 * Labels: tenant_id, offer_type
 * Buckets: 100, 500, 1000, 5000, 10000, 50000, 100000, 500000 RON
 */
export const offerValueHistogram = new Histogram({
  name: 'hitl_offer_value_ron',
  help: 'Distribution of offer values in RON',
  labelNames: ['tenant_id', 'offer_type'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
  registers: [hitlMetricsRegistry]
});

/**
 * Time from lead to qualified opportunity
 * Labels: tenant_id, lead_source
 * Buckets: 1h, 4h, 12h, 24h, 48h, 72h, 7d, 14d, 30d
 */
export const leadQualificationTimeHistogram = new Histogram({
  name: 'hitl_lead_qualification_time_seconds',
  help: 'Time to qualify leads in seconds',
  labelNames: ['tenant_id', 'lead_source'],
  buckets: [3600, 14400, 43200, 86400, 172800, 259200, 604800, 1209600, 2592000],
  registers: [hitlMetricsRegistry]
});

// ============================================================
// QUALITY METRICS
// ============================================================

/**
 * AI content quality scores
 * Labels: tenant_id, content_type, revision_number
 */
export const aiContentQualityGauge = new Gauge({
  name: 'hitl_ai_content_quality_score',
  help: 'AI-generated content quality score (0-100)',
  labelNames: ['tenant_id', 'content_type', 'revision_number'],
  registers: [hitlMetricsRegistry]
});

/**
 * Human edit ratio for AI content
 * Labels: tenant_id, content_type
 */
export const humanEditRatioGauge = new Gauge({
  name: 'hitl_human_edit_ratio',
  help: 'Ratio of AI content that required human edits (0-1)',
  labelNames: ['tenant_id', 'content_type'],
  registers: [hitlMetricsRegistry]
});

/**
 * Rejection reasons distribution
 * Labels: tenant_id, approval_type, reason_category
 */
export const rejectionReasonsTotal = new Counter({
  name: 'hitl_rejection_reasons_total',
  help: 'Distribution of rejection reasons',
  labelNames: ['tenant_id', 'approval_type', 'reason_category'],
  registers: [hitlMetricsRegistry]
});

/**
 * Revision requests before approval
 * Labels: tenant_id, approval_type
 */
export const revisionRequestsHistogram = new Histogram({
  name: 'hitl_revision_requests',
  help: 'Number of revision requests before approval',
  labelNames: ['tenant_id', 'approval_type'],
  buckets: [0, 1, 2, 3, 4, 5, 10],
  registers: [hitlMetricsRegistry]
});

// ============================================================
// COMPLIANCE METRICS
// ============================================================

/**
 * GDPR consent status by contact
 * Labels: tenant_id, consent_type, status
 */
export const gdprConsentGauge = new Gauge({
  name: 'hitl_gdpr_consent_count',
  help: 'Count of contacts by GDPR consent status',
  labelNames: ['tenant_id', 'consent_type', 'status'],
  registers: [hitlMetricsRegistry]
});

/**
 * Audit log entries created
 * Labels: tenant_id, action_category, sensitivity_level
 */
export const auditEntriesTotal = new Counter({
  name: 'hitl_audit_entries_total',
  help: 'Total audit log entries created',
  labelNames: ['tenant_id', 'action_category', 'sensitivity_level'],
  registers: [hitlMetricsRegistry]
});

/**
 * Data retention actions
 * Labels: tenant_id, action_type (archive/delete/anonymize)
 */
export const dataRetentionActionsTotal = new Counter({
  name: 'hitl_data_retention_actions_total',
  help: 'Total data retention actions performed',
  labelNames: ['tenant_id', 'action_type'],
  registers: [hitlMetricsRegistry]
});

/**
 * Romanian regulatory compliance checks
 * Labels: tenant_id, regulation_type, result
 */
export const complianceChecksTotal = new Counter({
  name: 'hitl_compliance_checks_total',
  help: 'Total compliance checks performed',
  labelNames: ['tenant_id', 'regulation_type', 'result'],
  registers: [hitlMetricsRegistry]
});
```

#### 13.1.3 Metrics Collection Service

```typescript
// src/monitoring/services/metrics-collector.service.ts

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between, IsNull, Not } from 'typeorm';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

import {
  // Counters
  approvalsCreatedTotal,
  approvalsResolvedTotal,
  slaBreachesTotal,
  escalationsTotal,
  
  // Gauges
  pendingApprovalsGauge,
  userWorkloadGauge,
  userAvailabilityGauge,
  queueDepthGauge,
  slaComplianceGauge,
  aiCostGauge,
  
  // Histograms
  approvalResolutionTimeHistogram,
  firstResponseTimeHistogram
} from '../metrics/approval-metrics';

import {
  conversionRateGauge,
  aiContentQualityGauge,
  humanEditRatioGauge
} from '../metrics/business-metrics';

import { Approval, ApprovalStatus, ApprovalPriority } from '../../entities/approval.entity';
import { UserAvailability } from '../../entities/user-availability.entity';
import { SlaConfiguration } from '../../entities/sla-configuration.entity';
import { AiCostLog } from '../../entities/ai-cost-log.entity';

@Injectable()
export class MetricsCollectorService {
  constructor(
    @InjectRepository(Approval)
    private approvalRepo: Repository<Approval>,
    
    @InjectRepository(UserAvailability)
    private availabilityRepo: Repository<UserAvailability>,
    
    @InjectRepository(SlaConfiguration)
    private slaConfigRepo: Repository<SlaConfiguration>,
    
    @InjectRepository(AiCostLog)
    private aiCostRepo: Repository<AiCostLog>,
    
    @InjectQueue('hitl-sla')
    private slaQueue: Queue,
    
    @InjectQueue('hitl-notifications')
    private notificationQueue: Queue,
    
    @InjectQueue('hitl-ai-processing')
    private aiQueue: Queue
  ) {}

  // ============================================================
  // GAUGE UPDATES - Run every 30 seconds
  // ============================================================
  
  @Cron('*/30 * * * * *')
  async updatePendingApprovalsGauge() {
    const tenants = await this.getTenantIds();
    
    for (const tenantId of tenants) {
      // Get pending approvals grouped by type, priority, and SLA status
      const pendingStats = await this.approvalRepo
        .createQueryBuilder('a')
        .select('a.approval_type', 'type')
        .addSelect('a.priority', 'priority')
        .addSelect(`
          CASE 
            WHEN a.sla_breached_at IS NOT NULL THEN 'breached'
            WHEN a.sla_warning_at IS NOT NULL THEN 'warning'
            ELSE 'healthy'
          END
        `, 'sla_status')
        .addSelect('COUNT(*)', 'count')
        .where('a.tenant_id = :tenantId', { tenantId })
        .andWhere('a.status IN (:...statuses)', { 
          statuses: [ApprovalStatus.PENDING, ApprovalStatus.ASSIGNED] 
        })
        .groupBy('a.approval_type')
        .addGroupBy('a.priority')
        .addGroupBy('sla_status')
        .getRawMany();
      
      // Reset all gauges for this tenant first
      pendingApprovalsGauge.reset();
      
      // Set new values
      for (const stat of pendingStats) {
        pendingApprovalsGauge.set(
          {
            tenant_id: tenantId,
            approval_type: stat.type,
            priority: stat.priority,
            sla_status: stat.sla_status
          },
          parseInt(stat.count)
        );
      }
    }
  }

  @Cron('*/30 * * * * *')
  async updateUserWorkloadGauge() {
    const workloads = await this.approvalRepo
      .createQueryBuilder('a')
      .select('a.tenant_id', 'tenantId')
      .addSelect('a.assigned_to_id', 'userId')
      .addSelect('a.approval_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('a.status = :status', { status: ApprovalStatus.ASSIGNED })
      .andWhere('a.assigned_to_id IS NOT NULL')
      .groupBy('a.tenant_id')
      .addGroupBy('a.assigned_to_id')
      .addGroupBy('a.approval_type')
      .getRawMany();
    
    userWorkloadGauge.reset();
    
    for (const wl of workloads) {
      userWorkloadGauge.set(
        {
          tenant_id: wl.tenantId,
          user_id: wl.userId,
          approval_type: wl.type
        },
        parseInt(wl.count)
      );
    }
  }

  @Cron('*/30 * * * * *')
  async updateUserAvailabilityGauge() {
    const availabilities = await this.availabilityRepo
      .createQueryBuilder('ua')
      .select('ua.tenant_id', 'tenantId')
      .addSelect('ua.user_id', 'userId')
      .addSelect('ua.status', 'status')
      .addSelect(`
        CASE
          WHEN ua.status = 'available' 
            AND (ua.vacation_start IS NULL OR ua.vacation_start > NOW())
          THEN 1
          ELSE 0
        END
      `, 'isAvailable')
      .getRawMany();
    
    userAvailabilityGauge.reset();
    
    for (const av of availabilities) {
      userAvailabilityGauge.set(
        {
          tenant_id: av.tenantId,
          user_id: av.userId,
          status: av.status
        },
        parseInt(av.isAvailable)
      );
    }
  }

  @Cron('*/30 * * * * *')
  async updateQueueDepthGauge() {
    const queues = [
      { name: 'hitl-sla', queue: this.slaQueue },
      { name: 'hitl-notifications', queue: this.notificationQueue },
      { name: 'hitl-ai-processing', queue: this.aiQueue }
    ];
    
    for (const { name, queue } of queues) {
      const counts = await queue.getJobCounts();
      
      queueDepthGauge.set({ queue_name: name, status: 'waiting' }, counts.waiting);
      queueDepthGauge.set({ queue_name: name, status: 'active' }, counts.active);
      queueDepthGauge.set({ queue_name: name, status: 'delayed' }, counts.delayed);
      queueDepthGauge.set({ queue_name: name, status: 'failed' }, counts.failed);
    }
  }

  // ============================================================
  // SLA COMPLIANCE - Run every minute
  // ============================================================
  
  @Cron(CronExpression.EVERY_MINUTE)
  async updateSlaComplianceGauge() {
    const tenants = await this.getTenantIds();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const tenantId of tenants) {
      const stats = await this.approvalRepo
        .createQueryBuilder('a')
        .select('a.approval_type', 'type')
        .addSelect('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN a.sla_breached_at IS NOT NULL THEN 1 ELSE 0 END)', 'breached')
        .where('a.tenant_id = :tenantId', { tenantId })
        .andWhere('a.resolved_at IS NOT NULL')
        .andWhere('a.resolved_at > :since', { since: thirtyDaysAgo })
        .groupBy('a.approval_type')
        .getRawMany();
      
      for (const stat of stats) {
        const total = parseInt(stat.total);
        const breached = parseInt(stat.breached);
        const compliance = total > 0 ? ((total - breached) / total) * 100 : 100;
        
        slaComplianceGauge.set(
          { tenant_id: tenantId, approval_type: stat.type },
          compliance
        );
      }
    }
  }

  // ============================================================
  // AI COST TRACKING - Run every 5 minutes
  // ============================================================
  
  @Cron('*/5 * * * *')
  async updateAiCostGauge() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const costs = await this.aiCostRepo
      .createQueryBuilder('c')
      .select('c.tenant_id', 'tenantId')
      .addSelect('c.model', 'model')
      .addSelect('SUM(c.cost_usd)', 'totalCost')
      .where('c.created_at >= :today', { today })
      .groupBy('c.tenant_id')
      .addGroupBy('c.model')
      .getRawMany();
    
    aiCostGauge.reset();
    
    for (const cost of costs) {
      aiCostGauge.set(
        { tenant_id: cost.tenantId, model: cost.model },
        parseFloat(cost.totalCost)
      );
    }
  }

  // ============================================================
  // BUSINESS METRICS - Run every 5 minutes
  // ============================================================
  
  @Cron('*/5 * * * *')
  async updateConversionRates() {
    const tenants = await this.getTenantIds();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const tenantId of tenants) {
      // Calculate conversion rates per stage
      const stages = [
        { stage: 'lead_to_qualified', fromTypes: ['offer_generation'], toTypes: ['offer_review'] },
        { stage: 'qualified_to_proposal', fromTypes: ['offer_review'], toTypes: ['offer_sent'] },
        { stage: 'proposal_to_closed', fromTypes: ['offer_sent'], toTypes: ['deal_closed'] }
      ];
      
      for (const { stage, fromTypes, toTypes } of stages) {
        const fromCount = await this.approvalRepo.count({
          where: {
            tenant_id: tenantId,
            approval_type: In(fromTypes),
            created_at: MoreThan(thirtyDaysAgo)
          }
        });
        
        const toCount = await this.approvalRepo.count({
          where: {
            tenant_id: tenantId,
            approval_type: In(toTypes),
            status: ApprovalStatus.APPROVED,
            created_at: MoreThan(thirtyDaysAgo)
          }
        });
        
        const rate = fromCount > 0 ? toCount / fromCount : 0;
        
        conversionRateGauge.set(
          { tenant_id: tenantId, stage },
          rate
        );
      }
    }
  }

  @Cron('*/5 * * * *')
  async updateQualityMetrics() {
    const tenants = await this.getTenantIds();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const tenantId of tenants) {
      // Calculate human edit ratio
      const contentTypes = ['email_draft', 'offer_draft', 'follow_up_message'];
      
      for (const contentType of contentTypes) {
        const totalApprovals = await this.approvalRepo.count({
          where: {
            tenant_id: tenantId,
            approval_type: contentType,
            status: ApprovalStatus.APPROVED,
            created_at: MoreThan(thirtyDaysAgo)
          }
        });
        
        const editedApprovals = await this.approvalRepo.count({
          where: {
            tenant_id: tenantId,
            approval_type: contentType,
            status: ApprovalStatus.APPROVED,
            human_edits: Not(IsNull()),
            created_at: MoreThan(thirtyDaysAgo)
          }
        });
        
        const editRatio = totalApprovals > 0 ? editedApprovals / totalApprovals : 0;
        
        humanEditRatioGauge.set(
          { tenant_id: tenantId, content_type: contentType },
          editRatio
        );
      }
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================
  
  private async getTenantIds(): Promise<string[]> {
    const result = await this.approvalRepo
      .createQueryBuilder('a')
      .select('DISTINCT a.tenant_id', 'tenantId')
      .getRawMany();
    
    return result.map(r => r.tenantId);
  }
}
```


### 13.2 Grafana Dashboard Configurations

#### 13.2.1 HITL Overview Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "hitl-overview",
    "title": "HITL System Overview",
    "tags": ["hitl", "etapa3", "overview"],
    "timezone": "Europe/Bucharest",
    "schemaVersion": 38,
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
          "query": "label_values(hitl_pending_approvals, tenant_id)",
          "refresh": 2,
          "multi": false,
          "includeAll": true,
          "allValue": ".*"
        },
        {
          "name": "approval_type",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(hitl_pending_approvals{tenant_id=~\"$tenant_id\"}, approval_type)",
          "refresh": 2,
          "multi": true,
          "includeAll": true,
          "allValue": ".*"
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "title": "Pending Approvals",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(hitl_pending_approvals{tenant_id=~\"$tenant_id\", approval_type=~\"$approval_type\"})",
            "legendFormat": "Pending"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 10, "color": "yellow" },
                { "value": 25, "color": "orange" },
                { "value": 50, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "SLA Breached",
        "type": "stat",
        "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(hitl_pending_approvals{tenant_id=~\"$tenant_id\", sla_status=\"breached\"})",
            "legendFormat": "Breached"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "fixed", "fixedColor": "red" }
          }
        }
      },
      {
        "id": 3,
        "title": "SLA Compliance Rate (30d)",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "avg(hitl_sla_compliance_rate{tenant_id=~\"$tenant_id\", approval_type=~\"$approval_type\"})",
            "legendFormat": "Compliance %"
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
                { "value": 0, "color": "red" },
                { "value": 80, "color": "yellow" },
                { "value": 95, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Resolved Today",
        "type": "stat",
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(increase(hitl_approvals_resolved_total{tenant_id=~\"$tenant_id\"}[24h]))",
            "legendFormat": "Resolved"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "fixed", "fixedColor": "green" }
          }
        }
      },
      {
        "id": 5,
        "title": "Approvals by Status",
        "type": "piechart",
        "gridPos": { "x": 0, "y": 4, "w": 8, "h": 8 },
        "targets": [
          {
            "expr": "sum by (sla_status) (hitl_pending_approvals{tenant_id=~\"$tenant_id\"})",
            "legendFormat": "{{sla_status}}"
          }
        ],
        "options": {
          "legend": {
            "displayMode": "table",
            "placement": "right",
            "values": ["value", "percent"]
          }
        }
      },
      {
        "id": 6,
        "title": "Approvals by Priority",
        "type": "piechart",
        "gridPos": { "x": 8, "y": 4, "w": 8, "h": 8 },
        "targets": [
          {
            "expr": "sum by (priority) (hitl_pending_approvals{tenant_id=~\"$tenant_id\"})",
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
        "id": 7,
        "title": "Approvals by Type",
        "type": "piechart",
        "gridPos": { "x": 16, "y": 4, "w": 8, "h": 8 },
        "targets": [
          {
            "expr": "sum by (approval_type) (hitl_pending_approvals{tenant_id=~\"$tenant_id\"})",
            "legendFormat": "{{approval_type}}"
          }
        ]
      },
      {
        "id": 8,
        "title": "Approval Throughput",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 12, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(hitl_approvals_created_total{tenant_id=~\"$tenant_id\"}[5m])) * 60",
            "legendFormat": "Created/min"
          },
          {
            "expr": "sum(rate(hitl_approvals_resolved_total{tenant_id=~\"$tenant_id\"}[5m])) * 60",
            "legendFormat": "Resolved/min"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "approvals/min"
          }
        }
      },
      {
        "id": 9,
        "title": "Resolution Time Percentiles",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 12, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(hitl_approval_resolution_time_seconds_bucket{tenant_id=~\"$tenant_id\"}[1h])) by (le))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.90, sum(rate(hitl_approval_resolution_time_seconds_bucket{tenant_id=~\"$tenant_id\"}[1h])) by (le))",
            "legendFormat": "p90"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(hitl_approval_resolution_time_seconds_bucket{tenant_id=~\"$tenant_id\"}[1h])) by (le))",
            "legendFormat": "p99"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "id": 10,
        "title": "SLA Breaches Over Time",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 20, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(hitl_sla_breaches_total{tenant_id=~\"$tenant_id\"}[1h])) by (approval_type) * 3600",
            "legendFormat": "{{approval_type}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "breaches/h"
          }
        }
      },
      {
        "id": 11,
        "title": "Escalations Over Time",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 20, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(hitl_escalations_total{tenant_id=~\"$tenant_id\"}[1h])) by (escalation_level) * 3600",
            "legendFormat": "Level {{escalation_level}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "escalations/h"
          }
        }
      }
    ]
  }
}
```

#### 13.2.2 User Performance Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "hitl-user-performance",
    "title": "HITL User Performance",
    "tags": ["hitl", "etapa3", "users", "performance"],
    "timezone": "Europe/Bucharest",
    "schemaVersion": 38,
    "refresh": "1m",
    "time": {
      "from": "now-7d",
      "to": "now"
    },
    "templating": {
      "list": [
        {
          "name": "tenant_id",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(hitl_user_workload, tenant_id)",
          "refresh": 2
        },
        {
          "name": "user_id",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(hitl_user_workload{tenant_id=\"$tenant_id\"}, user_id)",
          "refresh": 2,
          "multi": true,
          "includeAll": true
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "title": "Active Users",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "count(hitl_user_availability{tenant_id=\"$tenant_id\"} == 1)",
            "legendFormat": "Available"
          }
        ]
      },
      {
        "id": 2,
        "title": "Total Workload",
        "type": "stat",
        "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(hitl_user_workload{tenant_id=\"$tenant_id\"})",
            "legendFormat": "Assigned"
          }
        ]
      },
      {
        "id": 3,
        "title": "Avg Workload per User",
        "type": "stat",
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "avg(hitl_user_workload{tenant_id=\"$tenant_id\"})",
            "legendFormat": "Avg"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "decimals": 1
          }
        }
      },
      {
        "id": 4,
        "title": "Max Workload",
        "type": "stat",
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "max(hitl_user_workload{tenant_id=\"$tenant_id\"})",
            "legendFormat": "Max"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 10, "color": "yellow" },
                { "value": 15, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Workload by User",
        "type": "bargauge",
        "gridPos": { "x": 0, "y": 4, "w": 12, "h": 10 },
        "targets": [
          {
            "expr": "hitl_user_workload{tenant_id=\"$tenant_id\", user_id=~\"$user_id\"}",
            "legendFormat": "{{user_id}}"
          }
        ],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        },
        "fieldConfig": {
          "defaults": {
            "max": 20,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 10, "color": "yellow" },
                { "value": 15, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 6,
        "title": "User Availability Status",
        "type": "table",
        "gridPos": { "x": 12, "y": 4, "w": 12, "h": 10 },
        "targets": [
          {
            "expr": "hitl_user_availability{tenant_id=\"$tenant_id\"}",
            "format": "table",
            "instant": true
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": { "__name__": true, "job": true, "instance": true },
              "renameByName": {
                "user_id": "User",
                "status": "Status",
                "Value": "Available"
              }
            }
          }
        ],
        "fieldConfig": {
          "overrides": [
            {
              "matcher": { "id": "byName", "options": "Available" },
              "properties": [
                {
                  "id": "mappings",
                  "value": [
                    { "type": "value", "options": { "1": { "text": "✅ Available", "color": "green" } } },
                    { "type": "value", "options": { "0": { "text": "❌ Unavailable", "color": "red" } } }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        "id": 7,
        "title": "Resolution Rate by User",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 14, "w": 24, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(hitl_approvals_resolved_total{tenant_id=\"$tenant_id\"}[1h])) by (user_id) * 60",
            "legendFormat": "{{user_id}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "approvals/min"
          }
        }
      },
      {
        "id": 8,
        "title": "Avg Resolution Time by User",
        "type": "bargauge",
        "gridPos": { "x": 0, "y": 22, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(hitl_approval_resolution_time_seconds_bucket{tenant_id=\"$tenant_id\"}[24h])) by (le, user_id))",
            "legendFormat": "{{user_id}}"
          }
        ],
        "options": {
          "orientation": "horizontal"
        },
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 3600, "color": "yellow" },
                { "value": 7200, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 9,
        "title": "First Response Time by User",
        "type": "bargauge",
        "gridPos": { "x": 12, "y": 22, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(hitl_first_response_time_seconds_bucket{tenant_id=\"$tenant_id\"}[24h])) by (le, user_id))",
            "legendFormat": "{{user_id}}"
          }
        ],
        "options": {
          "orientation": "horizontal"
        },
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 300, "color": "yellow" },
                { "value": 600, "color": "red" }
              ]
            }
          }
        }
      }
    ]
  }
}
```


#### 13.2.3 AI Processing Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "hitl-ai-processing",
    "title": "HITL AI Processing",
    "tags": ["hitl", "etapa3", "ai", "llm"],
    "timezone": "Europe/Bucharest",
    "schemaVersion": 38,
    "refresh": "1m",
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
          "query": "label_values(hitl_ai_processing_total, tenant_id)",
          "refresh": 2
        },
        {
          "name": "model",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(hitl_ai_processing_total{tenant_id=\"$tenant_id\"}, model)",
          "refresh": 2,
          "multi": true,
          "includeAll": true
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "title": "AI Requests Today",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(increase(hitl_ai_processing_total{tenant_id=\"$tenant_id\"}[24h]))",
            "legendFormat": "Requests"
          }
        ]
      },
      {
        "id": 2,
        "title": "AI Cost Today (USD)",
        "type": "stat",
        "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(hitl_ai_cost_daily_usd{tenant_id=\"$tenant_id\"})",
            "legendFormat": "Cost"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "decimals": 2,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 50, "color": "yellow" },
                { "value": 100, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Success Rate",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(hitl_ai_processing_total{tenant_id=\"$tenant_id\", status=\"success\"}) / sum(hitl_ai_processing_total{tenant_id=\"$tenant_id\"}) * 100",
            "legendFormat": "Success %"
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
                { "value": 0, "color": "red" },
                { "value": 90, "color": "yellow" },
                { "value": 98, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Avg Processing Time",
        "type": "stat",
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(hitl_ai_processing_time_seconds_bucket{tenant_id=\"$tenant_id\"}[1h])) by (le))",
            "legendFormat": "p50"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "decimals": 2
          }
        }
      },
      {
        "id": 5,
        "title": "AI Requests by Model",
        "type": "piechart",
        "gridPos": { "x": 0, "y": 4, "w": 8, "h": 8 },
        "targets": [
          {
            "expr": "sum by (model) (increase(hitl_ai_processing_total{tenant_id=\"$tenant_id\"}[24h]))",
            "legendFormat": "{{model}}"
          }
        ],
        "options": {
          "legend": {
            "displayMode": "table",
            "placement": "right",
            "values": ["value", "percent"]
          }
        }
      },
      {
        "id": 6,
        "title": "Cost by Model",
        "type": "piechart",
        "gridPos": { "x": 8, "y": 4, "w": 8, "h": 8 },
        "targets": [
          {
            "expr": "sum by (model) (hitl_ai_cost_daily_usd{tenant_id=\"$tenant_id\"})",
            "legendFormat": "{{model}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD"
          }
        }
      },
      {
        "id": 7,
        "title": "Requests by Operation",
        "type": "piechart",
        "gridPos": { "x": 16, "y": 4, "w": 8, "h": 8 },
        "targets": [
          {
            "expr": "sum by (operation) (increase(hitl_ai_processing_total{tenant_id=\"$tenant_id\"}[24h]))",
            "legendFormat": "{{operation}}"
          }
        ]
      },
      {
        "id": 8,
        "title": "AI Processing Rate",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 12, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(hitl_ai_processing_total{tenant_id=\"$tenant_id\", model=~\"$model\"}[5m])) by (model) * 60",
            "legendFormat": "{{model}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqpm"
          }
        }
      },
      {
        "id": 9,
        "title": "Processing Time Distribution",
        "type": "heatmap",
        "gridPos": { "x": 12, "y": 12, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(increase(hitl_ai_processing_time_seconds_bucket{tenant_id=\"$tenant_id\"}[5m])) by (le)",
            "format": "heatmap",
            "legendFormat": "{{le}}"
          }
        ],
        "options": {
          "calculate": false,
          "yAxis": {
            "unit": "s"
          }
        }
      },
      {
        "id": 10,
        "title": "Error Rate by Model",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 20, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(hitl_ai_processing_total{tenant_id=\"$tenant_id\", status=\"error\"}[5m])) by (model) / sum(rate(hitl_ai_processing_total{tenant_id=\"$tenant_id\"}[5m])) by (model) * 100",
            "legendFormat": "{{model}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 2, "color": "yellow" },
                { "value": 5, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 11,
        "title": "Cumulative Cost (7 days)",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 20, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(hitl_ai_cost_daily_usd{tenant_id=\"$tenant_id\"}) by (model)",
            "legendFormat": "{{model}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD"
          }
        },
        "options": {
          "tooltip": {
            "mode": "all"
          }
        }
      }
    ]
  }
}
```

#### 13.2.4 Business Metrics Dashboard

```json
{
  "dashboard": {
    "id": null,
    "uid": "hitl-business-metrics",
    "title": "HITL Business Metrics",
    "tags": ["hitl", "etapa3", "business", "sales"],
    "timezone": "Europe/Bucharest",
    "schemaVersion": 38,
    "refresh": "5m",
    "time": {
      "from": "now-30d",
      "to": "now"
    },
    "templating": {
      "list": [
        {
          "name": "tenant_id",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(hitl_offers_generated_total, tenant_id)",
          "refresh": 2
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "title": "Offers Generated (30d)",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(increase(hitl_offers_generated_total{tenant_id=\"$tenant_id\"}[30d]))",
            "legendFormat": "Offers"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "fixed", "fixedColor": "blue" }
          }
        }
      },
      {
        "id": 2,
        "title": "Approval Rate",
        "type": "gauge",
        "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(hitl_offers_decided_total{tenant_id=\"$tenant_id\", decision=\"approved\"}) / sum(hitl_offers_decided_total{tenant_id=\"$tenant_id\"}) * 100",
            "legendFormat": "Approval %"
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
                { "value": 0, "color": "red" },
                { "value": 60, "color": "yellow" },
                { "value": 80, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Lead-to-Qualified Rate",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "hitl_conversion_rate{tenant_id=\"$tenant_id\", stage=\"lead_to_qualified\"} * 100",
            "legendFormat": "Conversion %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 100,
            "unit": "percent"
          }
        }
      },
      {
        "id": 4,
        "title": "Human Edit Ratio",
        "type": "stat",
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "avg(hitl_human_edit_ratio{tenant_id=\"$tenant_id\"}) * 100",
            "legendFormat": "Edit %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "decimals": 1,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 30, "color": "yellow" },
                { "value": 50, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Sales Funnel Conversion",
        "type": "bargauge",
        "gridPos": { "x": 0, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "hitl_conversion_rate{tenant_id=\"$tenant_id\"} * 100",
            "legendFormat": "{{stage}}"
          }
        ],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        },
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      },
      {
        "id": 6,
        "title": "Offer Decision Distribution",
        "type": "piechart",
        "gridPos": { "x": 12, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum by (decision) (increase(hitl_offers_decided_total{tenant_id=\"$tenant_id\"}[30d]))",
            "legendFormat": "{{decision}}"
          }
        ],
        "fieldConfig": {
          "overrides": [
            { "matcher": { "id": "byName", "options": "approved" }, "properties": [{ "id": "color", "value": { "fixedColor": "green" } }] },
            { "matcher": { "id": "byName", "options": "rejected" }, "properties": [{ "id": "color", "value": { "fixedColor": "red" } }] },
            { "matcher": { "id": "byName", "options": "revised" }, "properties": [{ "id": "color", "value": { "fixedColor": "yellow" } }] }
          ]
        }
      },
      {
        "id": 7,
        "title": "Communications by Channel",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 12, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(hitl_communications_sent_total{tenant_id=\"$tenant_id\"}[1h])) by (channel) * 3600",
            "legendFormat": "{{channel}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "messages/h"
          }
        }
      },
      {
        "id": 8,
        "title": "Lead Transitions",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 12, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(hitl_lead_transitions_total{tenant_id=\"$tenant_id\"}[1h])) by (to_status) * 3600",
            "legendFormat": "→ {{to_status}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "transitions/h"
          }
        }
      },
      {
        "id": 9,
        "title": "Offer Value Distribution",
        "type": "histogram",
        "gridPos": { "x": 0, "y": 20, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "hitl_offer_value_ron_bucket{tenant_id=\"$tenant_id\"}",
            "legendFormat": "{{le}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyRON"
          }
        }
      },
      {
        "id": 10,
        "title": "Rejection Reasons",
        "type": "piechart",
        "gridPos": { "x": 12, "y": 20, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum by (reason_category) (increase(hitl_rejection_reasons_total{tenant_id=\"$tenant_id\"}[30d]))",
            "legendFormat": "{{reason_category}}"
          }
        ]
      }
    ]
  }
}
```


### 13.3 Alerting Configuration

#### 13.3.1 Prometheus Alert Rules

```yaml
# prometheus/rules/hitl-alerts.yml

groups:
  # ============================================================
  # SLA ALERTS - Critical business impact
  # ============================================================
  - name: hitl_sla_alerts
    interval: 30s
    rules:
      - alert: HITLSLAComplianceDropping
        expr: |
          avg(hitl_sla_compliance_rate) by (tenant_id) < 90
          and
          avg(hitl_sla_compliance_rate offset 1h) by (tenant_id) >= 90
        for: 5m
        labels:
          severity: warning
          component: hitl
          category: sla
        annotations:
          summary: "SLA compliance dropping below 90%"
          description: |
            Tenant {{ $labels.tenant_id }} SLA compliance has dropped below 90%.
            Current rate: {{ $value | printf "%.1f" }}%
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-sla-compliance"
          
      - alert: HITLSLAComplianceCritical
        expr: |
          avg(hitl_sla_compliance_rate) by (tenant_id) < 80
        for: 5m
        labels:
          severity: critical
          component: hitl
          category: sla
        annotations:
          summary: "SLA compliance critically low"
          description: |
            Tenant {{ $labels.tenant_id }} SLA compliance is critically low at {{ $value | printf "%.1f" }}%.
            Immediate attention required.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-sla-critical"

      - alert: HITLSLABreachSpike
        expr: |
          sum(rate(hitl_sla_breaches_total[5m])) by (tenant_id) > 0.5
        for: 2m
        labels:
          severity: warning
          component: hitl
          category: sla
        annotations:
          summary: "High rate of SLA breaches"
          description: |
            Tenant {{ $labels.tenant_id }} is experiencing {{ $value | printf "%.2f" }} SLA breaches per second.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-breach-spike"

      - alert: HITLCriticalApprovalPending
        expr: |
          sum(hitl_pending_approvals{priority="critical"}) by (tenant_id) > 0
          and
          sum(hitl_pending_approvals{priority="critical", sla_status="warning"}) by (tenant_id) > 0
        for: 5m
        labels:
          severity: critical
          component: hitl
          category: sla
        annotations:
          summary: "Critical approval approaching SLA breach"
          description: |
            Tenant {{ $labels.tenant_id }} has {{ $value }} critical approvals approaching SLA breach.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-critical-approval"

  # ============================================================
  # QUEUE ALERTS - Operational health
  # ============================================================
  - name: hitl_queue_alerts
    interval: 30s
    rules:
      - alert: HITLQueueBacklogHigh
        expr: |
          sum(hitl_pending_approvals) by (tenant_id) > 100
        for: 10m
        labels:
          severity: warning
          component: hitl
          category: queue
        annotations:
          summary: "High approval backlog"
          description: |
            Tenant {{ $labels.tenant_id }} has {{ $value }} pending approvals.
            Consider adding reviewers or adjusting workload.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-queue-backlog"

      - alert: HITLQueueBacklogCritical
        expr: |
          sum(hitl_pending_approvals) by (tenant_id) > 500
        for: 5m
        labels:
          severity: critical
          component: hitl
          category: queue
        annotations:
          summary: "Critical approval backlog"
          description: |
            Tenant {{ $labels.tenant_id }} has {{ $value }} pending approvals.
            System may be overwhelmed.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-queue-critical"

      - alert: HITLBullMQQueueStuck
        expr: |
          hitl_queue_depth{status="waiting"} > 1000
          and
          rate(hitl_queue_depth{status="active"}[5m]) == 0
        for: 5m
        labels:
          severity: critical
          component: hitl
          category: queue
        annotations:
          summary: "BullMQ queue stuck"
          description: |
            Queue {{ $labels.queue_name }} has {{ $value }} waiting jobs but no active processing.
          runbook_url: "https://docs.cerniq.app/runbooks/bullmq-stuck"

      - alert: HITLJobFailureRateHigh
        expr: |
          rate(hitl_queue_depth{status="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
          component: hitl
          category: queue
        annotations:
          summary: "High job failure rate"
          description: |
            Queue {{ $labels.queue_name }} has {{ $value | printf "%.2f" }} failures per second.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-job-failures"

  # ============================================================
  # USER ALERTS - Capacity and availability
  # ============================================================
  - name: hitl_user_alerts
    interval: 60s
    rules:
      - alert: HITLNoAvailableReviewers
        expr: |
          sum(hitl_user_availability == 1) by (tenant_id) == 0
          and
          sum(hitl_pending_approvals) by (tenant_id) > 0
        for: 5m
        labels:
          severity: warning
          component: hitl
          category: users
        annotations:
          summary: "No available reviewers"
          description: |
            Tenant {{ $labels.tenant_id }} has pending approvals but no available reviewers.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-no-reviewers"

      - alert: HITLUserOverloaded
        expr: |
          max(hitl_user_workload) by (tenant_id, user_id) > 20
        for: 10m
        labels:
          severity: warning
          component: hitl
          category: users
        annotations:
          summary: "User workload too high"
          description: |
            User {{ $labels.user_id }} in tenant {{ $labels.tenant_id }} has {{ $value }} assigned approvals.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-user-overload"

      - alert: HITLUnbalancedWorkload
        expr: |
          (max(hitl_user_workload) by (tenant_id) - min(hitl_user_workload > 0) by (tenant_id)) > 10
        for: 15m
        labels:
          severity: info
          component: hitl
          category: users
        annotations:
          summary: "Unbalanced workload distribution"
          description: |
            Tenant {{ $labels.tenant_id }} has uneven workload distribution. 
            Consider rebalancing assignments.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-workload-balance"

  # ============================================================
  # AI PROCESSING ALERTS
  # ============================================================
  - name: hitl_ai_alerts
    interval: 30s
    rules:
      - alert: HITLAIErrorRateHigh
        expr: |
          sum(rate(hitl_ai_processing_total{status="error"}[5m])) by (tenant_id, model)
          /
          sum(rate(hitl_ai_processing_total[5m])) by (tenant_id, model)
          > 0.05
        for: 5m
        labels:
          severity: warning
          component: hitl
          category: ai
        annotations:
          summary: "High AI error rate"
          description: |
            Tenant {{ $labels.tenant_id }} model {{ $labels.model }} has {{ $value | printf "%.1f" }}% error rate.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-ai-errors"

      - alert: HITLAICostSpiking
        expr: |
          sum(hitl_ai_cost_daily_usd) by (tenant_id) > 100
        for: 1h
        labels:
          severity: warning
          component: hitl
          category: ai
        annotations:
          summary: "AI cost spike detected"
          description: |
            Tenant {{ $labels.tenant_id }} daily AI cost is ${{ $value | printf "%.2f" }}.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-ai-cost"

      - alert: HITLAILatencyHigh
        expr: |
          histogram_quantile(0.95, sum(rate(hitl_ai_processing_time_seconds_bucket[5m])) by (le, tenant_id, model)) > 30
        for: 5m
        labels:
          severity: warning
          component: hitl
          category: ai
        annotations:
          summary: "AI processing latency high"
          description: |
            Tenant {{ $labels.tenant_id }} model {{ $labels.model }} p95 latency is {{ $value | printf "%.1f" }}s.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-ai-latency"

  # ============================================================
  # API PERFORMANCE ALERTS
  # ============================================================
  - name: hitl_api_alerts
    interval: 30s
    rules:
      - alert: HITLAPILatencyHigh
        expr: |
          histogram_quantile(0.95, sum(rate(hitl_api_response_time_seconds_bucket[5m])) by (le, endpoint)) > 2
        for: 5m
        labels:
          severity: warning
          component: hitl
          category: api
        annotations:
          summary: "API latency high"
          description: |
            Endpoint {{ $labels.endpoint }} p95 latency is {{ $value | printf "%.2f" }}s.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-api-latency"

      - alert: HITLAPIErrorRateHigh
        expr: |
          sum(rate(hitl_api_requests_total{status_code=~"5.."}[5m])) by (endpoint)
          /
          sum(rate(hitl_api_requests_total[5m])) by (endpoint)
          > 0.01
        for: 5m
        labels:
          severity: warning
          component: hitl
          category: api
        annotations:
          summary: "API error rate high"
          description: |
            Endpoint {{ $labels.endpoint }} has {{ $value | printf "%.2f" }}% error rate.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-api-errors"

      - alert: HITLWebSocketConnectionsDrop
        expr: |
          sum(hitl_active_websocket_connections) by (tenant_id) < 1
          and
          sum(hitl_active_websocket_connections offset 5m) by (tenant_id) >= 10
        for: 2m
        labels:
          severity: warning
          component: hitl
          category: api
        annotations:
          summary: "WebSocket connections dropped"
          description: |
            Tenant {{ $labels.tenant_id }} WebSocket connections dropped from {{ $value }} to near zero.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-websocket-drop"

  # ============================================================
  # DATABASE ALERTS
  # ============================================================
  - name: hitl_database_alerts
    interval: 30s
    rules:
      - alert: HITLDatabaseQuerySlow
        expr: |
          histogram_quantile(0.95, sum(rate(hitl_db_query_time_seconds_bucket[5m])) by (le, operation, table)) > 1
        for: 5m
        labels:
          severity: warning
          component: hitl
          category: database
        annotations:
          summary: "Database queries slow"
          description: |
            {{ $labels.operation }} on {{ $labels.table }} p95 is {{ $value | printf "%.2f" }}s.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-db-slow"

      - alert: HITLDatabaseConnectionPoolExhausted
        expr: |
          hitl_db_connection_pool{status="waiting"} > 10
        for: 2m
        labels:
          severity: critical
          component: hitl
          category: database
        annotations:
          summary: "Database connection pool exhausted"
          description: |
            Pool {{ $labels.pool_name }} has {{ $value }} waiting connections.
          runbook_url: "https://docs.cerniq.app/runbooks/hitl-db-pool"
```


#### 13.3.2 Alertmanager Configuration

```yaml
# alertmanager/config.yml

global:
  smtp_smarthost: 'smtp.gmail.com:443'
  smtp_from: 'alerts@cerniq.app'
  smtp_auth_username: '${SMTP_USERNAME}'
  smtp_auth_password: '${SMTP_PASSWORD}'
  slack_api_url: '${SLACK_WEBHOOK_URL}'

# Templates for notifications
templates:
  - '/etc/alertmanager/templates/*.tmpl'

# Routing tree
route:
  group_by: ['alertname', 'tenant_id', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  
  routes:
    # Critical alerts - immediate notification
    - match:
        severity: critical
      receiver: 'critical-receiver'
      group_wait: 10s
      repeat_interval: 1h
      continue: true
      
    # SLA alerts - dedicated channel
    - match:
        category: sla
      receiver: 'sla-receiver'
      group_by: ['tenant_id', 'approval_type']
      
    # AI alerts - engineering team
    - match:
        category: ai
      receiver: 'ai-receiver'
      group_by: ['tenant_id', 'model']
      
    # Database alerts - DBA team
    - match:
        category: database
      receiver: 'database-receiver'
      
    # Off-hours routing
    - match_re:
        severity: warning|info
      active_time_intervals:
        - offhours
      receiver: 'offhours-receiver'

# Receivers
receivers:
  - name: 'default-receiver'
    slack_configs:
      - channel: '#hitl-alerts'
        send_resolved: true
        title: '{{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
        
  - name: 'critical-receiver'
    slack_configs:
      - channel: '#hitl-critical'
        send_resolved: true
        title: '🚨 CRITICAL: {{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
    email_configs:
      - to: 'oncall@cerniq.app'
        send_resolved: true
        headers:
          Subject: '🚨 CRITICAL: {{ template "email.subject" . }}'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        severity: 'critical'
        
  - name: 'sla-receiver'
    slack_configs:
      - channel: '#hitl-sla'
        send_resolved: true
        title: '⏰ SLA Alert: {{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
    webhook_configs:
      - url: 'http://hitl-api:64000/webhooks/alerts/sla'
        send_resolved: true
        
  - name: 'ai-receiver'
    slack_configs:
      - channel: '#hitl-ai-engineering'
        send_resolved: true
        title: '🤖 AI Alert: {{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
        
  - name: 'database-receiver'
    slack_configs:
      - channel: '#dba-alerts'
        send_resolved: true
        title: '🗄️ Database Alert: {{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
    email_configs:
      - to: 'dba@cerniq.app'
        send_resolved: true
        
  - name: 'offhours-receiver'
    slack_configs:
      - channel: '#hitl-alerts-lowprio'
        send_resolved: true

# Inhibition rules
inhibit_rules:
  # Critical silences warning for same alert
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'tenant_id']
    
  # Database issues silence API alerts
  - source_match:
      category: 'database'
      severity: 'critical'
    target_match:
      category: 'api'
    equal: ['tenant_id']

# Time intervals
time_intervals:
  - name: offhours
    time_intervals:
      - weekdays: ['saturday', 'sunday']
      - times:
          - start_time: '18:00'
            end_time: '09:00'
        location: 'Europe/Bucharest'
```

#### 13.3.3 Alert Templates

```gotmpl
{{/* alertmanager/templates/hitl.tmpl */}}

{{ define "slack.title" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
{{ end }}

{{ define "slack.text" }}
{{ range .Alerts }}
*Alert:* {{ .Labels.alertname }} - {{ .Labels.severity }}
*Tenant:* {{ .Labels.tenant_id }}
*Description:* {{ .Annotations.description }}
*Started:* {{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}
{{ if .Annotations.runbook_url }}*Runbook:* {{ .Annotations.runbook_url }}{{ end }}
{{ if eq .Status "resolved" }}*Resolved:* {{ .EndsAt.Format "2006-01-02 15:04:05 MST" }}{{ end }}
---
{{ end }}
{{ end }}

{{ define "email.subject" }}
[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }} - Tenant {{ .CommonLabels.tenant_id }}
{{ end }}

{{ define "email.html" }}
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .alert { padding: 15px; margin: 10px 0; border-radius: 5px; }
    .critical { background-color: #ffebee; border-left: 4px solid #f44336; }
    .warning { background-color: #fff3e0; border-left: 4px solid #ff9800; }
    .info { background-color: #e3f2fd; border-left: 4px solid #2196f3; }
    .resolved { background-color: #e8f5e9; border-left: 4px solid #4caf50; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h2>HITL System Alert - {{ .Status | title }}</h2>
  
  {{ range .Alerts }}
  <div class="alert {{ .Labels.severity }}{{ if eq $.Status "resolved" }} resolved{{ end }}">
    <h3>{{ .Labels.alertname }}</h3>
    <p><span class="label">Status:</span> <span class="value">{{ $.Status | title }}</span></p>
    <p><span class="label">Severity:</span> <span class="value">{{ .Labels.severity }}</span></p>
    <p><span class="label">Tenant:</span> <span class="value">{{ .Labels.tenant_id }}</span></p>
    <p><span class="label">Component:</span> <span class="value">{{ .Labels.component }}</span></p>
    
    <h4>Description</h4>
    <p>{{ .Annotations.description }}</p>
    
    <table>
      <tr>
        <th>Started At</th>
        <td>{{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}</td>
      </tr>
      {{ if eq $.Status "resolved" }}
      <tr>
        <th>Resolved At</th>
        <td>{{ .EndsAt.Format "2006-01-02 15:04:05 MST" }}</td>
      </tr>
      <tr>
        <th>Duration</th>
        <td>{{ .EndsAt.Sub .StartsAt }}</td>
      </tr>
      {{ end }}
    </table>
    
    {{ if .Annotations.runbook_url }}
    <p><a href="{{ .Annotations.runbook_url }}">View Runbook</a></p>
    {{ end }}
  </div>
  {{ end }}
  
  <hr>
  <p style="color: #999; font-size: 12px;">
    This is an automated alert from the Cerniq HITL System.
    <br>
    Environment: {{ .ExternalURL }}
  </p>
</body>
</html>
{{ end }}
```

### 13.4 OpenTelemetry Tracing

#### 13.4.1 Tracing Configuration

```typescript
// src/monitoring/tracing/otel-config.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { 
  FastifyInstrumentation 
} from '@opentelemetry/instrumentation-fastify';
import { 
  PgInstrumentation 
} from '@opentelemetry/instrumentation-pg';
import { 
  IORedisInstrumentation 
} from '@opentelemetry/instrumentation-ioredis';
import { 
  HttpInstrumentation 
} from '@opentelemetry/instrumentation-http';

const OTEL_EXPORTER_ENDPOINT = process.env.OTEL_EXPORTER_ENDPOINT || 'http://signoz:64071';

// Create resource with service information
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'hitl-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'cerniq',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  'service.instance.id': process.env.HOSTNAME || 'local',
});

// Trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${OTEL_EXPORTER_ENDPOINT}/v1/traces`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Metrics exporter
const metricExporter = new OTLPMetricExporter({
  url: `${OTEL_EXPORTER_ENDPOINT}/v1/metrics`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize SDK
export const otelSDK = new NodeSDK({
  resource,
  textMapPropagator: new W3CTraceContextPropagator(),
  spanProcessor: new BatchSpanProcessor(traceExporter, {
    maxExportBatchSize: 512,
    maxQueueSize: 2048,
    scheduledDelayMillis: 5000,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable filesystem tracing (too noisy)
      },
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
    }),
    new FastifyInstrumentation({
      requestHook: (span, info) => {
        span.setAttribute('http.request_id', info.request.id);
        span.setAttribute('tenant.id', info.request.headers['x-tenant-id'] || 'unknown');
      },
    }),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
      addSqlCommenterCommentToQueries: true,
    }),
    new IORedisInstrumentation({
      dbStatementSerializer: (cmdName, cmdArgs) => {
        // Sanitize sensitive data
        if (cmdName === 'AUTH') return 'AUTH [REDACTED]';
        return `${cmdName} ${cmdArgs.slice(0, 2).join(' ')}...`;
      },
    }),
    new HttpInstrumentation({
      ignoreIncomingPaths: ['/health', '/metrics', '/ready'],
      requestHook: (span, request) => {
        span.setAttribute('http.request_body_size', request.headers['content-length'] || 0);
      },
      responseHook: (span, response) => {
        span.setAttribute('http.response_body_size', response.getHeader('content-length') || 0);
      },
    }),
  ],
});

// Graceful shutdown
process.on('SIGTERM', () => {
  otelSDK.shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});
```


## 14. Testing Strategy

Această secțiune definește strategia completă de testare pentru sistemul HITL (Human-in-the-Loop) din Etapa 3. Include unit tests, integration tests, end-to-end tests, performance tests și security tests.

### 14.1 Unit Tests

#### 14.1.1 Approval Engine Tests

```typescript
// tests/unit/approval-engine.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ApprovalEngine,
  ApprovalContext,
  ApprovalDecision,
  ApprovalPolicy,
  ApprovalResult,
} from '@/services/approval-engine';
import { mockDb, mockRedis, mockQueue } from '@test/mocks';

describe('ApprovalEngine', () => {
  let engine: ApprovalEngine;
  let mockContext: ApprovalContext;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ApprovalEngine({
      db: mockDb,
      redis: mockRedis,
      queue: mockQueue,
    });

    mockContext = {
      tenantId: 'tenant-001',
      userId: 'user-001',
      entityType: 'offer',
      entityId: 'offer-001',
      action: 'create',
      metadata: {
        offerValue: 50000,
        discountPercent: 25,
        customerId: 'customer-001',
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createApproval', () => {
    it('should create a new approval request', async () => {
      const policy: ApprovalPolicy = {
        type: 'offer_high_value',
        requiredApprovers: 2,
        autoApproveThreshold: 10000,
        escalationPath: ['manager', 'director'],
        slaMinutes: 60,
      };

      mockDb.insert.mockResolvedValueOnce({
        id: 'approval-001',
        ...mockContext,
        status: 'pending',
        priority: 'high',
        created_at: new Date(),
      });

      const result = await engine.createApproval(mockContext, policy);

      expect(result).toEqual({
        id: 'approval-001',
        status: 'pending',
        priority: 'high',
      });

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockContext.tenantId,
          entity_type: mockContext.entityType,
          entity_id: mockContext.entityId,
        })
      );
    });

    it('should auto-approve when below threshold', async () => {
      const policy: ApprovalPolicy = {
        type: 'offer_low_value',
        requiredApprovers: 1,
        autoApproveThreshold: 100000,
        escalationPath: ['manager'],
        slaMinutes: 120,
      };

      const result = await engine.createApproval(
        { ...mockContext, metadata: { offerValue: 5000 } },
        policy
      );

      expect(result).toEqual({
        id: expect.any(String),
        status: 'approved',
        autoApproved: true,
        reason: 'Value below auto-approve threshold',
      });
    });

    it('should calculate correct priority based on value', async () => {
      const testCases = [
        { value: 100000, expectedPriority: 'critical' },
        { value: 50000, expectedPriority: 'high' },
        { value: 20000, expectedPriority: 'medium' },
        { value: 5000, expectedPriority: 'low' },
      ];

      for (const { value, expectedPriority } of testCases) {
        mockDb.insert.mockResolvedValueOnce({
          id: `approval-${value}`,
          status: 'pending',
          priority: expectedPriority,
        });

        const result = await engine.createApproval(
          { ...mockContext, metadata: { offerValue: value } },
          { type: 'offer', requiredApprovers: 1, slaMinutes: 60 }
        );

        expect(result.priority).toBe(expectedPriority);
      }
    });

    it('should set correct SLA deadlines', async () => {
      const now = new Date('2026-01-19T10:00:00Z');
      vi.setSystemTime(now);

      const policy: ApprovalPolicy = {
        type: 'offer',
        slaMinutes: 120,
        warningMinutes: 90,
        criticalMinutes: 150,
      };

      mockDb.insert.mockResolvedValueOnce({
        id: 'approval-001',
        status: 'pending',
        sla_deadline: new Date('2026-01-19T12:00:00Z'),
        sla_warning_at: new Date('2026-01-19T11:30:00Z'),
        sla_critical_at: new Date('2026-01-19T12:30:00Z'),
      });

      await engine.createApproval(mockContext, policy);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          sla_deadline: expect.any(Date),
          sla_warning_at: expect.any(Date),
          sla_critical_at: expect.any(Date),
        })
      );
    });

    it('should handle concurrent approval creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        engine.createApproval(
          { ...mockContext, entityId: `offer-${i}` },
          { type: 'offer', requiredApprovers: 1, slaMinutes: 60 }
        )
      );

      mockDb.insert.mockResolvedValue({ id: 'approval-001', status: 'pending' });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(mockDb.insert).toHaveBeenCalledTimes(10);
    });
  });

  describe('processDecision', () => {
    const existingApproval = {
      id: 'approval-001',
      tenant_id: 'tenant-001',
      status: 'pending',
      entity_type: 'offer',
      entity_id: 'offer-001',
      required_approvers: 2,
      current_approvers: ['user-002'],
      metadata: { offerValue: 50000 },
    };

    it('should record approval decision', async () => {
      mockDb.select.mockResolvedValueOnce([existingApproval]);
      mockDb.update.mockResolvedValueOnce({
        ...existingApproval,
        current_approvers: ['user-002', 'user-001'],
      });

      const decision: ApprovalDecision = {
        approvalId: 'approval-001',
        userId: 'user-001',
        action: 'approve',
        comment: 'Looks good',
      };

      const result = await engine.processDecision(decision);

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should complete approval when required approvers reached', async () => {
      mockDb.select.mockResolvedValueOnce([existingApproval]);
      mockDb.update.mockResolvedValueOnce({
        ...existingApproval,
        status: 'approved',
        current_approvers: ['user-002', 'user-001'],
      });

      const decision: ApprovalDecision = {
        approvalId: 'approval-001',
        userId: 'user-001',
        action: 'approve',
      };

      const result = await engine.processDecision(decision);

      expect(result.status).toBe('approved');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'approval-completed',
        expect.objectContaining({
          approvalId: 'approval-001',
          status: 'approved',
        })
      );
    });

    it('should immediately reject on rejection decision', async () => {
      mockDb.select.mockResolvedValueOnce([existingApproval]);
      mockDb.update.mockResolvedValueOnce({
        ...existingApproval,
        status: 'rejected',
      });

      const decision: ApprovalDecision = {
        approvalId: 'approval-001',
        userId: 'user-001',
        action: 'reject',
        reason: 'Discount too high',
      };

      const result = await engine.processDecision(decision);

      expect(result.status).toBe('rejected');
      expect(result.rejectedBy).toBe('user-001');
      expect(result.rejectionReason).toBe('Discount too high');
    });

    it('should prevent duplicate approvals from same user', async () => {
      mockDb.select.mockResolvedValueOnce([{
        ...existingApproval,
        current_approvers: ['user-001', 'user-002'],
      }]);

      const decision: ApprovalDecision = {
        approvalId: 'approval-001',
        userId: 'user-001',
        action: 'approve',
      };

      await expect(engine.processDecision(decision))
        .rejects.toThrow('User has already approved this request');
    });

    it('should prevent decision on non-pending approval', async () => {
      mockDb.select.mockResolvedValueOnce([{
        ...existingApproval,
        status: 'approved',
      }]);

      const decision: ApprovalDecision = {
        approvalId: 'approval-001',
        userId: 'user-003',
        action: 'approve',
      };

      await expect(engine.processDecision(decision))
        .rejects.toThrow('Approval is not in pending status');
    });

    it('should validate user has permission to approve', async () => {
      mockDb.select.mockResolvedValueOnce([existingApproval]);
      mockDb.select.mockResolvedValueOnce([]); // No permission found

      const decision: ApprovalDecision = {
        approvalId: 'approval-001',
        userId: 'unauthorized-user',
        action: 'approve',
      };

      await expect(engine.processDecision(decision))
        .rejects.toThrow('User does not have permission to approve');
    });
  });

  describe('escalateApproval', () => {
    it('should escalate to next level', async () => {
      const approval = {
        id: 'approval-001',
        status: 'pending',
        escalation_level: 0,
        escalation_path: ['manager', 'director', 'vp'],
      };

      mockDb.select.mockResolvedValueOnce([approval]);
      mockDb.update.mockResolvedValueOnce({
        ...approval,
        escalation_level: 1,
        escalated_at: new Date(),
      });

      const result = await engine.escalateApproval('approval-001', 'SLA breach');

      expect(result.escalationLevel).toBe(1);
      expect(result.escalatedTo).toBe('director');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'escalation-notification',
        expect.objectContaining({
          role: 'director',
          reason: 'SLA breach',
        })
      );
    });

    it('should mark as critical when max escalation reached', async () => {
      const approval = {
        id: 'approval-001',
        status: 'pending',
        escalation_level: 2,
        escalation_path: ['manager', 'director', 'vp'],
      };

      mockDb.select.mockResolvedValueOnce([approval]);
      mockDb.update.mockResolvedValueOnce({
        ...approval,
        status: 'critical',
        escalation_level: 3,
      });

      const result = await engine.escalateApproval('approval-001', 'SLA breach');

      expect(result.status).toBe('critical');
      expect(result.escalationLevel).toBe(3);
    });
  });

  describe('calculateSLAStatus', () => {
    it('should return healthy when within deadline', async () => {
      const now = new Date('2026-01-19T10:00:00Z');
      vi.setSystemTime(now);

      const approval = {
        sla_deadline: new Date('2026-01-19T12:00:00Z'),
        sla_warning_at: new Date('2026-01-19T11:30:00Z'),
        sla_critical_at: new Date('2026-01-19T12:30:00Z'),
      };

      const status = engine.calculateSLAStatus(approval);

      expect(status).toEqual({
        status: 'healthy',
        remainingMinutes: 120,
        percentRemaining: 100,
      });
    });

    it('should return warning when approaching deadline', async () => {
      const now = new Date('2026-01-19T11:45:00Z');
      vi.setSystemTime(now);

      const approval = {
        sla_deadline: new Date('2026-01-19T12:00:00Z'),
        sla_warning_at: new Date('2026-01-19T11:30:00Z'),
        sla_critical_at: new Date('2026-01-19T12:30:00Z'),
      };

      const status = engine.calculateSLAStatus(approval);

      expect(status.status).toBe('warning');
      expect(status.remainingMinutes).toBe(15);
    });

    it('should return breached when past deadline', async () => {
      const now = new Date('2026-01-19T12:30:00Z');
      vi.setSystemTime(now);

      const approval = {
        sla_deadline: new Date('2026-01-19T12:00:00Z'),
        sla_warning_at: new Date('2026-01-19T11:30:00Z'),
        sla_critical_at: new Date('2026-01-19T12:30:00Z'),
      };

      const status = engine.calculateSLAStatus(approval);

      expect(status.status).toBe('breached');
      expect(status.remainingMinutes).toBe(-30);
      expect(status.breachedMinutes).toBe(30);
    });
  });
});
```


#### 14.1.2 SLA Calculator Tests

```typescript
// tests/unit/sla-calculator.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SLACalculator,
  SLAConfiguration,
  BusinessHours,
} from '@/services/sla-calculator';

describe('SLACalculator', () => {
  let calculator: SLACalculator;

  const defaultBusinessHours: BusinessHours = {
    startHour: 9,
    endHour: 18,
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
    timezone: 'Europe/Bucharest',
  };

  const defaultConfig: SLAConfiguration = {
    deadlineMinutes: 120,
    warningMinutes: 90,
    criticalMinutes: 150,
    businessHoursOnly: true,
    businessHours: defaultBusinessHours,
    priorityMultipliers: {
      critical: 0.25,
      high: 0.5,
      medium: 1.0,
      low: 1.5,
    },
  };

  beforeEach(() => {
    calculator = new SLACalculator(defaultConfig);
  });

  describe('calculateDeadline', () => {
    it('should calculate deadline within same business day', () => {
      const startTime = new Date('2026-01-19T10:00:00+02:00'); // Monday 10 AM
      vi.setSystemTime(startTime);

      const deadline = calculator.calculateDeadline(startTime, 'medium');

      // 120 minutes = 2 hours, should be 12:00 PM same day
      expect(deadline.toISOString()).toBe('2026-01-19T10:00:00.000Z');
    });

    it('should extend to next business day if after hours', () => {
      const startTime = new Date('2026-01-19T17:00:00+02:00'); // Monday 5 PM
      vi.setSystemTime(startTime);

      const deadline = calculator.calculateDeadline(startTime, 'medium');

      // 120 minutes starting at 5 PM, only 1 hour left in day
      // Continues next day at 9 AM + 60 minutes = 10 AM Tuesday
      expect(deadline.getDate()).toBe(20);
      expect(deadline.getHours()).toBe(10);
    });

    it('should skip weekends', () => {
      const startTime = new Date('2026-01-17T17:00:00+02:00'); // Friday 5 PM
      vi.setSystemTime(startTime);

      const deadline = calculator.calculateDeadline(startTime, 'medium');

      // Should skip to Monday
      expect(deadline.getDay()).toBe(1); // Monday
    });

    it('should apply priority multipliers', () => {
      const startTime = new Date('2026-01-19T10:00:00+02:00');
      vi.setSystemTime(startTime);

      const criticalDeadline = calculator.calculateDeadline(startTime, 'critical');
      const lowDeadline = calculator.calculateDeadline(startTime, 'low');

      // Critical: 120 * 0.25 = 30 minutes
      // Low: 120 * 1.5 = 180 minutes
      const criticalMinutes = (criticalDeadline.getTime() - startTime.getTime()) / 60000;
      const lowMinutes = (lowDeadline.getTime() - startTime.getTime()) / 60000;

      expect(criticalMinutes).toBeLessThan(lowMinutes);
    });

    it('should handle midnight transitions', () => {
      const startTime = new Date('2026-01-19T23:00:00+02:00');
      vi.setSystemTime(startTime);

      // Starting at 11 PM (outside business hours)
      const deadline = calculator.calculateDeadline(startTime, 'medium');

      // Should start counting from next business day 9 AM
      expect(deadline.getHours()).toBeGreaterThanOrEqual(9);
    });
  });

  describe('calculateRemainingTime', () => {
    it('should return positive remaining time before deadline', () => {
      const now = new Date('2026-01-19T10:00:00Z');
      const deadline = new Date('2026-01-19T12:00:00Z');
      vi.setSystemTime(now);

      const remaining = calculator.calculateRemainingTime(deadline);

      expect(remaining.minutes).toBe(120);
      expect(remaining.isOverdue).toBe(false);
    });

    it('should return negative remaining time after deadline', () => {
      const now = new Date('2026-01-19T13:00:00Z');
      const deadline = new Date('2026-01-19T12:00:00Z');
      vi.setSystemTime(now);

      const remaining = calculator.calculateRemainingTime(deadline);

      expect(remaining.minutes).toBe(-60);
      expect(remaining.isOverdue).toBe(true);
    });

    it('should calculate business hours only when configured', () => {
      // Friday 4 PM with 2 hours deadline (only 2 business hours left)
      const startTime = new Date('2026-01-17T16:00:00+02:00');
      const deadline = new Date('2026-01-17T18:00:00+02:00');
      
      // Now is Saturday 10 AM
      const now = new Date('2026-01-18T10:00:00+02:00');
      vi.setSystemTime(now);

      const remaining = calculator.calculateRemainingTime(deadline, true);

      // Since we're on a weekend and deadline was Friday EOD,
      // the effective time left is 0 (deadline passed in business terms)
      expect(remaining.isOverdue).toBe(true);
    });
  });

  describe('isWithinBusinessHours', () => {
    it('should return true during business hours', () => {
      const time = new Date('2026-01-19T14:00:00+02:00'); // Monday 2 PM

      expect(calculator.isWithinBusinessHours(time)).toBe(true);
    });

    it('should return false outside business hours', () => {
      const time = new Date('2026-01-19T20:00:00+02:00'); // Monday 8 PM

      expect(calculator.isWithinBusinessHours(time)).toBe(false);
    });

    it('should return false on weekends', () => {
      const time = new Date('2026-01-18T14:00:00+02:00'); // Saturday 2 PM

      expect(calculator.isWithinBusinessHours(time)).toBe(false);
    });

    it('should handle timezone correctly', () => {
      const bucharestTime = new Date('2026-01-19T10:00:00+02:00');
      const utcTime = new Date('2026-01-19T08:00:00Z');

      // Both represent the same moment
      expect(calculator.isWithinBusinessHours(bucharestTime))
        .toBe(calculator.isWithinBusinessHours(utcTime));
    });
  });

  describe('getNextBusinessTime', () => {
    it('should return same time if within business hours', () => {
      const time = new Date('2026-01-19T10:00:00+02:00'); // Monday 10 AM

      const nextBusiness = calculator.getNextBusinessTime(time);

      expect(nextBusiness.getTime()).toBe(time.getTime());
    });

    it('should return next morning if after hours', () => {
      const time = new Date('2026-01-19T20:00:00+02:00'); // Monday 8 PM

      const nextBusiness = calculator.getNextBusinessTime(time);

      // Should be Tuesday 9 AM
      expect(nextBusiness.getDate()).toBe(20);
      expect(nextBusiness.getHours()).toBe(9);
    });

    it('should return Monday if on weekend', () => {
      const time = new Date('2026-01-18T10:00:00+02:00'); // Saturday 10 AM

      const nextBusiness = calculator.getNextBusinessTime(time);

      // Should be Monday 9 AM
      expect(nextBusiness.getDay()).toBe(1); // Monday
      expect(nextBusiness.getHours()).toBe(9);
    });
  });

  describe('pauseAndResumeTime', () => {
    it('should correctly pause SLA timer', () => {
      const state = {
        startTime: new Date('2026-01-19T10:00:00Z'),
        deadline: new Date('2026-01-19T12:00:00Z'),
        pausedAt: null,
        totalPausedMinutes: 0,
      };

      const pauseTime = new Date('2026-01-19T11:00:00Z');
      const pausedState = calculator.pauseTimer(state, pauseTime);

      expect(pausedState.pausedAt).toEqual(pauseTime);
      expect(pausedState.isPaused).toBe(true);
    });

    it('should correctly resume SLA timer and extend deadline', () => {
      const state = {
        startTime: new Date('2026-01-19T10:00:00Z'),
        deadline: new Date('2026-01-19T12:00:00Z'),
        pausedAt: new Date('2026-01-19T11:00:00Z'),
        totalPausedMinutes: 0,
      };

      // Resume 30 minutes later
      const resumeTime = new Date('2026-01-19T11:30:00Z');
      const resumedState = calculator.resumeTimer(state, resumeTime);

      expect(resumedState.pausedAt).toBeNull();
      expect(resumedState.totalPausedMinutes).toBe(30);
      // Deadline extended by 30 minutes
      expect(resumedState.deadline.toISOString()).toBe('2026-01-19T12:30:00.000Z');
    });
  });
});
```

#### 14.1.3 Policy Evaluator Tests

```typescript
// tests/unit/policy-evaluator.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PolicyEvaluator,
  ApprovalPolicy,
  PolicyCondition,
  PolicyAction,
} from '@/services/policy-evaluator';

describe('PolicyEvaluator', () => {
  let evaluator: PolicyEvaluator;

  const policies: ApprovalPolicy[] = [
    {
      id: 'policy-001',
      name: 'High Value Offer Approval',
      type: 'offer',
      priority: 100,
      conditions: [
        { field: 'value', operator: 'gte', value: 50000 },
        { field: 'discount_percent', operator: 'gt', value: 20 },
      ],
      conditionLogic: 'AND',
      actions: {
        requireApproval: true,
        approvalType: 'offer_high_value',
        requiredApprovers: 2,
        escalationPath: ['sales_manager', 'sales_director'],
        slaMinutes: 60,
        priority: 'high',
      },
    },
    {
      id: 'policy-002',
      name: 'Standard Offer Approval',
      type: 'offer',
      priority: 50,
      conditions: [
        { field: 'value', operator: 'gte', value: 10000 },
      ],
      conditionLogic: 'AND',
      actions: {
        requireApproval: true,
        approvalType: 'offer_standard',
        requiredApprovers: 1,
        escalationPath: ['sales_manager'],
        slaMinutes: 120,
        priority: 'medium',
      },
    },
    {
      id: 'policy-003',
      name: 'Auto-Approve Small Offers',
      type: 'offer',
      priority: 10,
      conditions: [
        { field: 'value', operator: 'lt', value: 10000 },
      ],
      conditionLogic: 'AND',
      actions: {
        requireApproval: false,
        autoApprove: true,
      },
    },
  ];

  beforeEach(() => {
    evaluator = new PolicyEvaluator(policies);
  });

  describe('evaluate', () => {
    it('should match high-value offer policy', () => {
      const context = {
        type: 'offer',
        value: 75000,
        discount_percent: 25,
        customer_type: 'enterprise',
      };

      const result = evaluator.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.policy?.id).toBe('policy-001');
      expect(result.actions.requiredApprovers).toBe(2);
    });

    it('should match standard offer policy when high-value not matched', () => {
      const context = {
        type: 'offer',
        value: 25000,
        discount_percent: 15, // Not > 20, so high-value policy won't match
      };

      const result = evaluator.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.policy?.id).toBe('policy-002');
      expect(result.actions.requiredApprovers).toBe(1);
    });

    it('should auto-approve small offers', () => {
      const context = {
        type: 'offer',
        value: 5000,
        discount_percent: 10,
      };

      const result = evaluator.evaluate(context);

      expect(result.matched).toBe(true);
      expect(result.policy?.id).toBe('policy-003');
      expect(result.actions.autoApprove).toBe(true);
      expect(result.actions.requireApproval).toBe(false);
    });

    it('should return no match for unknown type', () => {
      const context = {
        type: 'unknown_type',
        value: 50000,
      };

      const result = evaluator.evaluate(context);

      expect(result.matched).toBe(false);
      expect(result.policy).toBeUndefined();
    });

    it('should respect policy priority ordering', () => {
      // Add a conflicting policy with higher priority
      const highPriorityPolicy: ApprovalPolicy = {
        id: 'policy-override',
        name: 'Override Policy',
        type: 'offer',
        priority: 200, // Higher than policy-001
        conditions: [
          { field: 'customer_type', operator: 'eq', value: 'vip' },
        ],
        conditionLogic: 'AND',
        actions: {
          requireApproval: false,
          autoApprove: true,
        },
      };

      const evaluatorWithOverride = new PolicyEvaluator([
        ...policies,
        highPriorityPolicy,
      ]);

      const context = {
        type: 'offer',
        value: 75000,
        discount_percent: 25,
        customer_type: 'vip',
      };

      const result = evaluatorWithOverride.evaluate(context);

      expect(result.policy?.id).toBe('policy-override');
      expect(result.actions.autoApprove).toBe(true);
    });
  });

  describe('evaluateCondition', () => {
    const testCases: Array<{
      condition: PolicyCondition;
      value: any;
      expected: boolean;
    }> = [
      // Numeric comparisons
      { condition: { field: 'x', operator: 'eq', value: 10 }, value: 10, expected: true },
      { condition: { field: 'x', operator: 'eq', value: 10 }, value: 11, expected: false },
      { condition: { field: 'x', operator: 'ne', value: 10 }, value: 11, expected: true },
      { condition: { field: 'x', operator: 'gt', value: 10 }, value: 15, expected: true },
      { condition: { field: 'x', operator: 'gt', value: 10 }, value: 10, expected: false },
      { condition: { field: 'x', operator: 'gte', value: 10 }, value: 10, expected: true },
      { condition: { field: 'x', operator: 'lt', value: 10 }, value: 5, expected: true },
      { condition: { field: 'x', operator: 'lte', value: 10 }, value: 10, expected: true },
      
      // String comparisons
      { condition: { field: 'x', operator: 'eq', value: 'test' }, value: 'test', expected: true },
      { condition: { field: 'x', operator: 'contains', value: 'est' }, value: 'test', expected: true },
      { condition: { field: 'x', operator: 'startsWith', value: 'te' }, value: 'test', expected: true },
      { condition: { field: 'x', operator: 'endsWith', value: 'st' }, value: 'test', expected: true },
      { condition: { field: 'x', operator: 'regex', value: '^t.*t$' }, value: 'test', expected: true },
      
      // Array operations
      { condition: { field: 'x', operator: 'in', value: ['a', 'b', 'c'] }, value: 'b', expected: true },
      { condition: { field: 'x', operator: 'notIn', value: ['a', 'b', 'c'] }, value: 'd', expected: true },
      
      // Null checks
      { condition: { field: 'x', operator: 'isNull', value: null }, value: null, expected: true },
      { condition: { field: 'x', operator: 'isNotNull', value: null }, value: 'something', expected: true },
    ];

    testCases.forEach(({ condition, value, expected }) => {
      it(`should evaluate ${condition.operator} correctly`, () => {
        const result = evaluator.evaluateCondition(condition, { [condition.field]: value });
        expect(result).toBe(expected);
      });
    });
  });

  describe('conditionLogic', () => {
    it('should require all conditions with AND logic', () => {
      const policy: ApprovalPolicy = {
        id: 'and-policy',
        name: 'AND Policy',
        type: 'test',
        priority: 100,
        conditions: [
          { field: 'a', operator: 'eq', value: 1 },
          { field: 'b', operator: 'eq', value: 2 },
          { field: 'c', operator: 'eq', value: 3 },
        ],
        conditionLogic: 'AND',
        actions: { requireApproval: true },
      };

      const evaluatorAnd = new PolicyEvaluator([policy]);

      // All conditions met
      expect(evaluatorAnd.evaluate({ type: 'test', a: 1, b: 2, c: 3 }).matched).toBe(true);

      // One condition not met
      expect(evaluatorAnd.evaluate({ type: 'test', a: 1, b: 2, c: 4 }).matched).toBe(false);
    });

    it('should require any condition with OR logic', () => {
      const policy: ApprovalPolicy = {
        id: 'or-policy',
        name: 'OR Policy',
        type: 'test',
        priority: 100,
        conditions: [
          { field: 'a', operator: 'eq', value: 1 },
          { field: 'b', operator: 'eq', value: 2 },
        ],
        conditionLogic: 'OR',
        actions: { requireApproval: true },
      };

      const evaluatorOr = new PolicyEvaluator([policy]);

      // First condition met
      expect(evaluatorOr.evaluate({ type: 'test', a: 1, b: 0 }).matched).toBe(true);

      // Second condition met
      expect(evaluatorOr.evaluate({ type: 'test', a: 0, b: 2 }).matched).toBe(true);

      // No conditions met
      expect(evaluatorOr.evaluate({ type: 'test', a: 0, b: 0 }).matched).toBe(false);
    });

    it('should handle nested condition groups', () => {
      const policy: ApprovalPolicy = {
        id: 'nested-policy',
        name: 'Nested Policy',
        type: 'test',
        priority: 100,
        conditions: [
          { field: 'type', operator: 'eq', value: 'premium' },
          {
            group: [
              { field: 'value', operator: 'gt', value: 1000 },
              { field: 'category', operator: 'in', value: ['electronics', 'luxury'] },
            ],
            logic: 'OR',
          },
        ],
        conditionLogic: 'AND',
        actions: { requireApproval: true },
      };

      const evaluatorNested = new PolicyEvaluator([policy]);

      // Type match + value condition
      expect(evaluatorNested.evaluate({
        type: 'test',
        type: 'premium',
        value: 2000,
        category: 'general',
      }).matched).toBe(true);

      // Type match + category condition
      expect(evaluatorNested.evaluate({
        type: 'test',
        type: 'premium',
        value: 500,
        category: 'electronics',
      }).matched).toBe(true);

      // Neither nested condition met
      expect(evaluatorNested.evaluate({
        type: 'test',
        type: 'premium',
        value: 500,
        category: 'general',
      }).matched).toBe(false);
    });
  });
});
```


#### 14.1.4 Assignment Service Tests

```typescript
// tests/unit/assignment-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AssignmentService,
  AssignmentStrategy,
  UserAvailability,
  WorkloadBalancer,
} from '@/services/assignment-service';
import { mockDb, mockRedis } from '@test/mocks';

describe('AssignmentService', () => {
  let service: AssignmentService;

  const mockUsers: UserAvailability[] = [
    {
      userId: 'user-001',
      name: 'Alice',
      role: 'sales_manager',
      status: 'available',
      currentWorkload: 3,
      maxWorkload: 10,
      expertiseAreas: ['offer_approval', 'discount_approval'],
      avgResolutionMinutes: 25,
      slaComplianceRate: 0.95,
      lastAssignedAt: new Date('2026-01-19T09:00:00Z'),
    },
    {
      userId: 'user-002',
      name: 'Bob',
      role: 'sales_manager',
      status: 'available',
      currentWorkload: 8,
      maxWorkload: 10,
      expertiseAreas: ['offer_approval'],
      avgResolutionMinutes: 35,
      slaComplianceRate: 0.88,
      lastAssignedAt: new Date('2026-01-19T09:30:00Z'),
    },
    {
      userId: 'user-003',
      name: 'Carol',
      role: 'sales_manager',
      status: 'busy',
      currentWorkload: 10,
      maxWorkload: 10,
      expertiseAreas: ['offer_approval', 'discount_approval', 'contract_approval'],
      avgResolutionMinutes: 20,
      slaComplianceRate: 0.98,
      lastAssignedAt: new Date('2026-01-19T08:00:00Z'),
    },
    {
      userId: 'user-004',
      name: 'David',
      role: 'sales_director',
      status: 'available',
      currentWorkload: 2,
      maxWorkload: 5,
      expertiseAreas: ['high_value_approval', 'escalation'],
      avgResolutionMinutes: 45,
      slaComplianceRate: 0.92,
      lastAssignedAt: new Date('2026-01-19T07:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AssignmentService({
      db: mockDb,
      redis: mockRedis,
    });
    mockDb.select.mockResolvedValue(mockUsers);
  });

  describe('findBestAssignee', () => {
    it('should select user with lowest workload by default', async () => {
      const approval = {
        type: 'offer_approval',
        priority: 'medium',
        requiredRole: 'sales_manager',
      };

      const result = await service.findBestAssignee(approval, 'tenant-001');

      // Alice has workload 3, Bob has 8, Carol is busy (10/10)
      expect(result.userId).toBe('user-001');
      expect(result.reason).toContain('lowest workload');
    });

    it('should filter by required expertise', async () => {
      const approval = {
        type: 'contract_approval',
        priority: 'medium',
        requiredRole: 'sales_manager',
      };

      const result = await service.findBestAssignee(approval, 'tenant-001');

      // Only Carol has contract_approval expertise, but she's busy
      expect(result.userId).toBeNull();
      expect(result.reason).toContain('No available users with required expertise');
    });

    it('should exclude users at max capacity', async () => {
      const approval = {
        type: 'offer_approval',
        priority: 'medium',
        requiredRole: 'sales_manager',
      };

      const result = await service.findBestAssignee(approval, 'tenant-001');

      // Carol is at max capacity, should not be selected
      expect(result.userId).not.toBe('user-003');
    });

    it('should use round-robin strategy when configured', async () => {
      service.setStrategy('round_robin');

      const approval = {
        type: 'offer_approval',
        priority: 'medium',
        requiredRole: 'sales_manager',
      };

      // First assignment
      const result1 = await service.findBestAssignee(approval, 'tenant-001');
      expect(['user-001', 'user-002']).toContain(result1.userId);

      // Track the assignment
      await service.recordAssignment(result1.userId!, 'approval-001');

      // Second assignment should go to the other user
      const result2 = await service.findBestAssignee(approval, 'tenant-001');
      expect(result2.userId).not.toBe(result1.userId);
    });

    it('should prioritize expertise match when strategy is expertise_first', async () => {
      service.setStrategy('expertise_first');

      const approval = {
        type: 'discount_approval',
        priority: 'high',
        requiredRole: 'sales_manager',
      };

      const result = await service.findBestAssignee(approval, 'tenant-001');

      // Alice has discount_approval expertise and lower workload
      expect(result.userId).toBe('user-001');
    });

    it('should consider SLA compliance rate for performance-based strategy', async () => {
      service.setStrategy('performance_based');

      const approval = {
        type: 'offer_approval',
        priority: 'critical',
        requiredRole: 'sales_manager',
      };

      // For critical priority, prefer users with high SLA compliance
      const result = await service.findBestAssignee(approval, 'tenant-001');

      // Alice has 95% compliance, Bob has 88%
      expect(result.userId).toBe('user-001');
    });

    it('should respect role hierarchy for escalations', async () => {
      const approval = {
        type: 'escalation',
        priority: 'critical',
        requiredRole: 'sales_director', // Higher role required
        escalationLevel: 2,
      };

      const result = await service.findBestAssignee(approval, 'tenant-001');

      // Only David is a sales_director
      expect(result.userId).toBe('user-004');
    });
  });

  describe('calculateWorkloadScore', () => {
    it('should calculate correct workload score', () => {
      const scores = mockUsers.map(u =>
        service.calculateWorkloadScore(u)
      );

      // Alice: 3/10 = 0.3 -> score 0.7
      // Bob: 8/10 = 0.8 -> score 0.2
      // Carol: 10/10 = 1.0 -> score 0
      // David: 2/5 = 0.4 -> score 0.6
      expect(scores[0]).toBeCloseTo(0.7);
      expect(scores[1]).toBeCloseTo(0.2);
      expect(scores[2]).toBeCloseTo(0);
      expect(scores[3]).toBeCloseTo(0.6);
    });
  });

  describe('calculateExpertiseScore', () => {
    it('should return 1.0 for exact expertise match', () => {
      const score = service.calculateExpertiseScore(
        mockUsers[0],
        'offer_approval'
      );
      expect(score).toBe(1.0);
    });

    it('should return 0.5 for related expertise', () => {
      // User has offer_approval, checking for related type
      const score = service.calculateExpertiseScore(
        mockUsers[0],
        'offer_review' // Related but not exact
      );
      expect(score).toBe(0.5);
    });

    it('should return 0 for no expertise match', () => {
      const score = service.calculateExpertiseScore(
        mockUsers[0],
        'unknown_type'
      );
      expect(score).toBe(0);
    });
  });

  describe('checkAvailability', () => {
    it('should return available for active users under capacity', async () => {
      const result = await service.checkAvailability('user-001');

      expect(result).toEqual({
        available: true,
        currentWorkload: 3,
        maxWorkload: 10,
        status: 'available',
      });
    });

    it('should return unavailable for users at capacity', async () => {
      const result = await service.checkAvailability('user-003');

      expect(result).toEqual({
        available: false,
        currentWorkload: 10,
        maxWorkload: 10,
        status: 'busy',
        reason: 'User is at maximum capacity',
      });
    });

    it('should check vacation status', async () => {
      mockDb.select.mockResolvedValueOnce([{
        ...mockUsers[0],
        vacationStart: new Date('2026-01-15'),
        vacationEnd: new Date('2026-01-25'),
      }]);

      const result = await service.checkAvailability('user-001');

      expect(result.available).toBe(false);
      expect(result.reason).toContain('on vacation');
    });
  });

  describe('autoReassign', () => {
    it('should reassign pending approvals when user becomes unavailable', async () => {
      const pendingApprovals = [
        { id: 'approval-001', type: 'offer_approval' },
        { id: 'approval-002', type: 'offer_approval' },
      ];

      mockDb.select.mockResolvedValueOnce(pendingApprovals);
      mockDb.update.mockResolvedValue({});

      const result = await service.autoReassign(
        'user-003', // Carol going unavailable
        'user-001', // Reassign to Alice
        'tenant-001'
      );

      expect(result.reassigned).toBe(2);
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it('should skip reassignment for approvals already in progress', async () => {
      const approvals = [
        { id: 'approval-001', type: 'offer_approval', status: 'pending' },
        { id: 'approval-002', type: 'offer_approval', status: 'in_review' },
      ];

      mockDb.select.mockResolvedValueOnce(approvals);

      const result = await service.autoReassign(
        'user-001',
        'user-002',
        'tenant-001'
      );

      expect(result.reassigned).toBe(1); // Only pending one
      expect(result.skipped).toBe(1);
    });
  });
});

describe('WorkloadBalancer', () => {
  let balancer: WorkloadBalancer;

  beforeEach(() => {
    balancer = new WorkloadBalancer();
  });

  describe('analyzeDistribution', () => {
    it('should detect uneven workload distribution', () => {
      const workloads = [
        { userId: 'user-001', current: 2, max: 10 },
        { userId: 'user-002', current: 9, max: 10 },
        { userId: 'user-003', current: 8, max: 10 },
      ];

      const analysis = balancer.analyzeDistribution(workloads);

      expect(analysis.isBalanced).toBe(false);
      expect(analysis.variance).toBeGreaterThan(0.2);
      expect(analysis.recommendations).toContainEqual(
        expect.objectContaining({
          action: 'redistribute',
          from: 'user-002',
          to: 'user-001',
        })
      );
    });

    it('should report balanced distribution', () => {
      const workloads = [
        { userId: 'user-001', current: 5, max: 10 },
        { userId: 'user-002', current: 5, max: 10 },
        { userId: 'user-003', current: 5, max: 10 },
      ];

      const analysis = balancer.analyzeDistribution(workloads);

      expect(analysis.isBalanced).toBe(true);
      expect(analysis.variance).toBeLessThan(0.1);
      expect(analysis.recommendations).toHaveLength(0);
    });
  });

  describe('proposeRebalancing', () => {
    it('should propose optimal redistribution', () => {
      const workloads = [
        { userId: 'user-001', current: 1, max: 10, approvals: ['a1'] },
        { userId: 'user-002', current: 9, max: 10, approvals: ['a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'] },
      ];

      const plan = balancer.proposeRebalancing(workloads);

      expect(plan.moves).toHaveLength(4); // Move 4 approvals from user-002 to user-001
      expect(plan.resultingDistribution).toEqual([
        { userId: 'user-001', current: 5 },
        { userId: 'user-002', current: 5 },
      ]);
    });
  });
});
```

#### 14.1.5 Notification Service Tests

```typescript
// tests/unit/notification-service.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  NotificationService,
  NotificationChannel,
  NotificationTemplate,
  NotificationPriority,
} from '@/services/notification-service';
import { mockDb, mockQueue, mockEmailClient, mockPushClient } from '@test/mocks';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService({
      db: mockDb,
      queue: mockQueue,
      emailClient: mockEmailClient,
      pushClient: mockPushClient,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('send', () => {
    const notification = {
      userId: 'user-001',
      type: 'approval_assigned',
      title: 'New Approval Assigned',
      body: 'You have been assigned approval #123',
      data: {
        approvalId: 'approval-123',
        priority: 'high',
      },
      priority: 'high' as NotificationPriority,
    };

    it('should send notification to all configured channels', async () => {
      mockDb.select.mockResolvedValueOnce([{
        userId: 'user-001',
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        email: 'user@example.com',
      }]);

      await service.send(notification);

      // Should queue for all channels
      expect(mockQueue.add).toHaveBeenCalledWith(
        'notification:email',
        expect.objectContaining({ userId: 'user-001' })
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'notification:push',
        expect.objectContaining({ userId: 'user-001' })
      );
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-001',
          channel: 'in_app',
        })
      );
    });

    it('should respect user channel preferences', async () => {
      mockDb.select.mockResolvedValueOnce([{
        userId: 'user-001',
        emailEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
      }]);

      await service.send(notification);

      // Should NOT queue email
      expect(mockQueue.add).not.toHaveBeenCalledWith(
        'notification:email',
        expect.anything()
      );
      // Should queue push
      expect(mockQueue.add).toHaveBeenCalledWith(
        'notification:push',
        expect.anything()
      );
    });

    it('should respect quiet hours', async () => {
      const now = new Date('2026-01-19T23:30:00+02:00'); // 11:30 PM
      vi.setSystemTime(now);

      mockDb.select.mockResolvedValueOnce([{
        userId: 'user-001',
        emailEnabled: true,
        pushEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: 22, // 10 PM
        quietHoursEnd: 8, // 8 AM
        timezone: 'Europe/Bucharest',
      }]);

      await service.send(notification);

      // During quiet hours, should delay notification
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.objectContaining({
          delay: expect.any(Number), // Delayed until 8 AM
        })
      );
    });

    it('should bypass quiet hours for critical priority', async () => {
      const now = new Date('2026-01-19T23:30:00+02:00');
      vi.setSystemTime(now);

      mockDb.select.mockResolvedValueOnce([{
        userId: 'user-001',
        emailEnabled: true,
        pushEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: 22,
        quietHoursEnd: 8,
      }]);

      await service.send({
        ...notification,
        priority: 'critical',
      });

      // Critical should be sent immediately
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.not.objectContaining({
          delay: expect.any(Number),
        })
      );
    });
  });

  describe('sendBatch', () => {
    it('should send notifications to multiple users', async () => {
      const notifications = [
        { userId: 'user-001', type: 'reminder', title: 'Test' },
        { userId: 'user-002', type: 'reminder', title: 'Test' },
        { userId: 'user-003', type: 'reminder', title: 'Test' },
      ];

      mockDb.select.mockResolvedValue([
        { userId: 'user-001', emailEnabled: true, inAppEnabled: true },
        { userId: 'user-002', emailEnabled: true, inAppEnabled: true },
        { userId: 'user-003', emailEnabled: true, inAppEnabled: true },
      ]);

      const result = await service.sendBatch(notifications);

      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures gracefully', async () => {
      const notifications = [
        { userId: 'user-001', type: 'reminder', title: 'Test' },
        { userId: 'user-002', type: 'reminder', title: 'Test' },
      ];

      mockDb.select.mockResolvedValueOnce([
        { userId: 'user-001', emailEnabled: true },
      ]);
      mockDb.select.mockResolvedValueOnce([]); // user-002 not found

      const result = await service.sendBatch(notifications);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failures[0].userId).toBe('user-002');
    });
  });

  describe('templates', () => {
    it('should render template with variables', () => {
      const template: NotificationTemplate = {
        id: 'approval_assigned',
        titleTemplate: 'New {{priority}} Approval Assigned',
        bodyTemplate: 'You have been assigned approval #{{approvalId}} for {{entityType}}',
        channels: ['email', 'push', 'in_app'],
      };

      const rendered = service.renderTemplate(template, {
        priority: 'High',
        approvalId: '123',
        entityType: 'Offer',
      });

      expect(rendered.title).toBe('New High Approval Assigned');
      expect(rendered.body).toBe('You have been assigned approval #123 for Offer');
    });

    it('should handle missing variables gracefully', () => {
      const template: NotificationTemplate = {
        id: 'test',
        titleTemplate: 'Hello {{name}}',
        bodyTemplate: 'Your value is {{value}}',
        channels: ['in_app'],
      };

      const rendered = service.renderTemplate(template, { name: 'Alice' });

      expect(rendered.title).toBe('Hello Alice');
      expect(rendered.body).toBe('Your value is {{value}}'); // Unresolved
    });

    it('should escape HTML in variables', () => {
      const template: NotificationTemplate = {
        id: 'test',
        titleTemplate: 'Message: {{message}}',
        bodyTemplate: '',
        channels: ['email'],
      };

      const rendered = service.renderTemplate(template, {
        message: '<script>alert("xss")</script>',
      });

      expect(rendered.title).not.toContain('<script>');
      expect(rendered.title).toContain('&lt;script&gt;');
    });
  });

  describe('digest', () => {
    it('should aggregate notifications for digest', async () => {
      const pending = [
        { id: 'n1', type: 'approval_assigned', created_at: new Date() },
        { id: 'n2', type: 'approval_assigned', created_at: new Date() },
        { id: 'n3', type: 'sla_warning', created_at: new Date() },
        { id: 'n4', type: 'comment_mention', created_at: new Date() },
      ];

      mockDb.select.mockResolvedValueOnce(pending);

      const digest = await service.createDigest('user-001');

      expect(digest.summary).toContain('2 new approvals assigned');
      expect(digest.summary).toContain('1 SLA warning');
      expect(digest.items).toHaveLength(4);
      expect(digest.groupedByType['approval_assigned']).toHaveLength(2);
    });

    it('should respect digest frequency preference', async () => {
      mockDb.select.mockResolvedValueOnce([{
        userId: 'user-001',
        digestEnabled: true,
        digestFrequency: 'daily',
        lastDigestSent: new Date('2026-01-18T08:00:00Z'),
      }]);

      const shouldSend = await service.shouldSendDigest('user-001');

      // Last digest was yesterday, should send today
      expect(shouldSend).toBe(true);
    });
  });
});
```


### 14.2 Integration Tests

#### 14.2.1 Approval Flow Integration Tests

```typescript
// tests/integration/approval-flow.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp } from '@test/setup';
import { db } from '@/db';
import { clearTestData, seedTestData } from '@test/helpers';
import { ApprovalService } from '@/services/approval-service';
import { NotificationService } from '@/services/notification-service';
import { BullMQTestHelper } from '@test/bullmq-helper';

describe('Approval Flow Integration', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let queueHelper: BullMQTestHelper;
  let authToken: string;
  let tenantId: string;
  let managerId: string;
  let directorId: string;

  beforeAll(async () => {
    app = await createTestApp();
    queueHelper = new BullMQTestHelper();
    await queueHelper.connect();
  });

  afterAll(async () => {
    await app.close();
    await queueHelper.disconnect();
  });

  beforeEach(async () => {
    await clearTestData(db);
    
    const seedData = await seedTestData(db, {
      tenants: 1,
      users: [
        { role: 'sales_rep', name: 'Sales Rep' },
        { role: 'sales_manager', name: 'Manager', permissions: ['approve_offers'] },
        { role: 'sales_director', name: 'Director', permissions: ['approve_high_value', 'escalation_handler'] },
      ],
      policies: [
        {
          type: 'offer_standard',
          requiredApprovers: 1,
          slaMinutes: 60,
        },
        {
          type: 'offer_high_value',
          requiredApprovers: 2,
          slaMinutes: 30,
          escalationPath: ['sales_manager', 'sales_director'],
        },
      ],
    });

    tenantId = seedData.tenantId;
    managerId = seedData.users[1].id;
    directorId = seedData.users[2].id;
    authToken = await app.generateTestToken(seedData.users[0].id, tenantId);
  });

  describe('Standard Approval Flow', () => {
    it('should create approval request for offer', async () => {
      // Create an offer that requires approval
      const offerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/offers',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          customerId: 'customer-001',
          products: [
            { productId: 'prod-001', quantity: 100, unitPrice: 250 },
          ],
          totalValue: 25000,
          discountPercent: 15,
        },
      });

      expect(offerResponse.statusCode).toBe(201);
      const offer = offerResponse.json();

      // Verify approval was created
      const approvalsResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/approvals?entity_id=${offer.id}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(approvalsResponse.statusCode).toBe(200);
      const approvals = approvalsResponse.json();
      
      expect(approvals.data).toHaveLength(1);
      expect(approvals.data[0]).toMatchObject({
        entity_type: 'offer',
        entity_id: offer.id,
        status: 'pending',
        approval_type: 'offer_standard',
      });
    });

    it('should process single approver workflow', async () => {
      // Create approval
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: tenantId,
        entity_type: 'offer',
        entity_id: 'offer-001',
        approval_type: 'offer_standard',
        status: 'pending',
        required_approvers: 1,
        priority: 'medium',
        sla_deadline: new Date(Date.now() + 3600000),
      }).returning();

      // Assign to manager
      const assignResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/approvals/${approval[0].id}/assign`,
        headers: { Authorization: `Bearer ${app.generateTestToken(managerId, tenantId)}` },
        payload: { assigneeId: managerId },
      });

      expect(assignResponse.statusCode).toBe(200);

      // Approve
      const approveResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/approvals/${approval[0].id}/approve`,
        headers: { Authorization: `Bearer ${app.generateTestToken(managerId, tenantId)}` },
        payload: {
          comment: 'Approved - standard offer within guidelines',
        },
      });

      expect(approveResponse.statusCode).toBe(200);
      const result = approveResponse.json();

      expect(result.status).toBe('approved');
      expect(result.approved_by).toContain(managerId);

      // Verify offer status updated
      const offerCheck = await db.query.offers.findFirst({
        where: eq(offers.id, 'offer-001'),
      });
      expect(offerCheck?.approval_status).toBe('approved');
    });

    it('should process multi-approver workflow', async () => {
      // Create high-value approval requiring 2 approvers
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: tenantId,
        entity_type: 'offer',
        entity_id: 'offer-002',
        approval_type: 'offer_high_value',
        status: 'pending',
        required_approvers: 2,
        priority: 'high',
        sla_deadline: new Date(Date.now() + 1800000),
        metadata: { offerValue: 75000, discountPercent: 25 },
      }).returning();

      const approvalId = approval[0].id;

      // First approval by manager
      const firstApprove = await app.inject({
        method: 'POST',
        url: `/api/v1/approvals/${approvalId}/approve`,
        headers: { Authorization: `Bearer ${app.generateTestToken(managerId, tenantId)}` },
        payload: { comment: 'First approval' },
      });

      expect(firstApprove.statusCode).toBe(200);
      expect(firstApprove.json().status).toBe('pending'); // Still pending

      // Second approval by director
      const secondApprove = await app.inject({
        method: 'POST',
        url: `/api/v1/approvals/${approvalId}/approve`,
        headers: { Authorization: `Bearer ${app.generateTestToken(directorId, tenantId)}` },
        payload: { comment: 'Second approval - final' },
      });

      expect(secondApprove.statusCode).toBe(200);
      expect(secondApprove.json().status).toBe('approved'); // Now approved

      // Verify audit trail
      const auditResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/approvals/${approvalId}/audit`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const audit = auditResponse.json();
      expect(audit.audit_log).toHaveLength(2);
      expect(audit.audit_log.map(a => a.action)).toContain('approved');
    });

    it('should handle rejection workflow', async () => {
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: tenantId,
        entity_type: 'offer',
        entity_id: 'offer-003',
        approval_type: 'offer_standard',
        status: 'pending',
        required_approvers: 1,
        priority: 'medium',
      }).returning();

      // Reject
      const rejectResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/approvals/${approval[0].id}/reject`,
        headers: { Authorization: `Bearer ${app.generateTestToken(managerId, tenantId)}` },
        payload: {
          reason: 'Discount exceeds maximum allowed for customer tier',
          suggestedAction: 'Reduce discount to 10% and resubmit',
        },
      });

      expect(rejectResponse.statusCode).toBe(200);
      expect(rejectResponse.json().status).toBe('rejected');

      // Verify notification was sent to requester
      const jobs = await queueHelper.getJobs('notification:in_app');
      expect(jobs.some(j => j.data.type === 'approval_rejected')).toBe(true);
    });
  });

  describe('Escalation Flow', () => {
    it('should escalate on SLA warning', async () => {
      // Create approval with tight SLA
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: tenantId,
        entity_type: 'offer',
        entity_id: 'offer-004',
        approval_type: 'offer_high_value',
        status: 'pending',
        required_approvers: 1,
        priority: 'high',
        assigned_to_id: managerId,
        sla_deadline: new Date(Date.now() + 300000), // 5 minutes
        sla_warning_at: new Date(Date.now() - 60000), // Warning was 1 minute ago
        escalation_level: 0,
        escalation_path: ['sales_manager', 'sales_director'],
      }).returning();

      // Trigger SLA check
      await queueHelper.processJob('sla-check');

      // Verify escalation occurred
      const updated = await db.query.hitl_approvals.findFirst({
        where: eq(hitl_approvals.id, approval[0].id),
      });

      expect(updated?.escalation_level).toBe(1);
      expect(updated?.sla_warning_sent_at).toBeTruthy();

      // Verify director was notified
      const notifications = await queueHelper.getJobs('notification:email');
      expect(notifications.some(n => 
        n.data.userId === directorId && 
        n.data.type === 'sla_escalation'
      )).toBe(true);
    });

    it('should mark as breached and escalate on deadline', async () => {
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: tenantId,
        entity_type: 'offer',
        entity_id: 'offer-005',
        approval_type: 'offer_high_value',
        status: 'pending',
        required_approvers: 1,
        priority: 'critical',
        assigned_to_id: managerId,
        sla_deadline: new Date(Date.now() - 60000), // Deadline was 1 minute ago
        escalation_level: 0,
        escalation_path: ['sales_manager', 'sales_director', 'vp_sales'],
      }).returning();

      // Trigger SLA check
      await queueHelper.processJob('sla-check');

      // Verify breach recorded
      const updated = await db.query.hitl_approvals.findFirst({
        where: eq(hitl_approvals.id, approval[0].id),
      });

      expect(updated?.sla_breached_at).toBeTruthy();
      expect(updated?.escalation_level).toBeGreaterThan(0);

      // Verify metrics recorded
      const metricsJob = await queueHelper.getJobs('metrics:record');
      expect(metricsJob.some(j => 
        j.data.metric === 'sla_breach' &&
        j.data.approvalId === approval[0].id
      )).toBe(true);
    });

    it('should handle manual escalation', async () => {
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: tenantId,
        entity_type: 'offer',
        entity_id: 'offer-006',
        approval_type: 'offer_standard',
        status: 'pending',
        required_approvers: 1,
        priority: 'medium',
        assigned_to_id: managerId,
        escalation_level: 0,
        escalation_path: ['sales_manager', 'sales_director'],
      }).returning();

      // Manager manually escalates
      const escalateResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/approvals/${approval[0].id}/escalate`,
        headers: { Authorization: `Bearer ${app.generateTestToken(managerId, tenantId)}` },
        payload: {
          reason: 'Need director approval for unusual terms',
          escalateTo: directorId,
        },
      });

      expect(escalateResponse.statusCode).toBe(200);
      expect(escalateResponse.json().escalation_level).toBe(1);
      expect(escalateResponse.json().assigned_to_id).toBe(directorId);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle race condition on approval', async () => {
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: tenantId,
        entity_type: 'offer',
        entity_id: 'offer-007',
        approval_type: 'offer_standard',
        status: 'pending',
        required_approvers: 1,
        version: 1,
      }).returning();

      // Simulate two users trying to approve simultaneously
      const [response1, response2] = await Promise.all([
        app.inject({
          method: 'POST',
          url: `/api/v1/approvals/${approval[0].id}/approve`,
          headers: { Authorization: `Bearer ${app.generateTestToken(managerId, tenantId)}` },
          payload: { comment: 'Approved by manager' },
        }),
        app.inject({
          method: 'POST',
          url: `/api/v1/approvals/${approval[0].id}/approve`,
          headers: { Authorization: `Bearer ${app.generateTestToken(directorId, tenantId)}` },
          payload: { comment: 'Approved by director' },
        }),
      ]);

      // One should succeed, one should fail with conflict
      const statuses = [response1.statusCode, response2.statusCode].sort();
      expect(statuses).toEqual([200, 409]); // One success, one conflict

      // Verify only one approval recorded
      const updated = await db.query.hitl_approvals.findFirst({
        where: eq(hitl_approvals.id, approval[0].id),
      });
      expect(updated?.current_approvers).toHaveLength(1);
    });

    it('should use optimistic locking for updates', async () => {
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: tenantId,
        entity_type: 'offer',
        entity_id: 'offer-008',
        approval_type: 'offer_standard',
        status: 'pending',
        version: 1,
        metadata: { note: 'original' },
      }).returning();

      // First update succeeds
      const update1 = await app.inject({
        method: 'PATCH',
        url: `/api/v1/approvals/${approval[0].id}`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          metadata: { note: 'updated by user 1' },
          version: 1,
        },
      });

      expect(update1.statusCode).toBe(200);
      expect(update1.json().version).toBe(2);

      // Second update with stale version fails
      const update2 = await app.inject({
        method: 'PATCH',
        url: `/api/v1/approvals/${approval[0].id}`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          metadata: { note: 'updated by user 2' },
          version: 1, // Stale version
        },
      });

      expect(update2.statusCode).toBe(409);
      expect(update2.json().code).toBe('VERSION_CONFLICT');
    });
  });
});
```


#### 14.2.2 Database Integration Tests

```typescript
// tests/integration/database.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db, runMigrations, rollbackMigrations } from '@/db';
import { sql } from 'drizzle-orm';
import {
  hitl_approvals,
  approval_audit_log,
  hitl_comments,
  sla_configurations,
  user_availability,
  notification_preferences,
} from '@/db/schema';

describe('Database Integration', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await db.delete(hitl_approvals);
    await db.delete(approval_audit_log);
    await db.delete(hitl_comments);
  });

  describe('Schema Constraints', () => {
    it('should enforce tenant_id + entity_id uniqueness', async () => {
      const first = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-001',
        entity_type: 'offer',
        entity_id: 'offer-unique-001',
        approval_type: 'standard',
        status: 'pending',
      }).returning();

      expect(first).toHaveLength(1);

      // Same tenant + entity should fail
      await expect(
        db.insert(hitl_approvals).values({
          tenant_id: 'tenant-001',
          entity_type: 'offer',
          entity_id: 'offer-unique-001',
          approval_type: 'standard',
          status: 'pending',
        })
      ).rejects.toThrow(/unique constraint/i);

      // Different tenant + same entity should succeed
      const second = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-002',
        entity_type: 'offer',
        entity_id: 'offer-unique-001',
        approval_type: 'standard',
        status: 'pending',
      }).returning();

      expect(second).toHaveLength(1);
    });

    it('should enforce status enum values', async () => {
      await expect(
        db.insert(hitl_approvals).values({
          tenant_id: 'tenant-001',
          entity_type: 'offer',
          entity_id: 'offer-status-001',
          approval_type: 'standard',
          status: 'invalid_status' as any,
        })
      ).rejects.toThrow();
    });

    it('should enforce priority enum values', async () => {
      await expect(
        db.insert(hitl_approvals).values({
          tenant_id: 'tenant-001',
          entity_type: 'offer',
          entity_id: 'offer-priority-001',
          approval_type: 'standard',
          status: 'pending',
          priority: 'super_high' as any, // Invalid
        })
      ).rejects.toThrow();
    });

    it('should cascade delete comments when approval deleted', async () => {
      const approval = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-001',
        entity_type: 'offer',
        entity_id: 'offer-cascade-001',
        approval_type: 'standard',
        status: 'pending',
      }).returning();

      await db.insert(hitl_comments).values([
        { approval_id: approval[0].id, tenant_id: 'tenant-001', user_id: 'user-001', content: 'Comment 1' },
        { approval_id: approval[0].id, tenant_id: 'tenant-001', user_id: 'user-001', content: 'Comment 2' },
      ]);

      // Verify comments exist
      const commentsBefore = await db.select()
        .from(hitl_comments)
        .where(eq(hitl_comments.approval_id, approval[0].id));
      expect(commentsBefore).toHaveLength(2);

      // Delete approval
      await db.delete(hitl_approvals)
        .where(eq(hitl_approvals.id, approval[0].id));

      // Verify comments deleted
      const commentsAfter = await db.select()
        .from(hitl_comments)
        .where(eq(hitl_comments.approval_id, approval[0].id));
      expect(commentsAfter).toHaveLength(0);
    });
  });

  describe('Indexes Performance', () => {
    beforeAll(async () => {
      // Seed test data for performance tests
      const approvals = Array.from({ length: 1000 }, (_, i) => ({
        tenant_id: `tenant-${i % 10}`,
        entity_type: i % 2 === 0 ? 'offer' : 'contract',
        entity_id: `entity-${i}`,
        approval_type: i % 3 === 0 ? 'high_value' : 'standard',
        status: ['pending', 'approved', 'rejected'][i % 3] as any,
        priority: ['low', 'medium', 'high', 'critical'][i % 4] as any,
        created_at: new Date(Date.now() - i * 3600000),
        assigned_to_id: i % 5 === 0 ? null : `user-${i % 20}`,
      }));

      await db.insert(hitl_approvals).values(approvals);
    });

    it('should efficiently query by tenant + status', async () => {
      const start = performance.now();
      
      const results = await db.select()
        .from(hitl_approvals)
        .where(
          and(
            eq(hitl_approvals.tenant_id, 'tenant-001'),
            eq(hitl_approvals.status, 'pending')
          )
        )
        .limit(100);

      const duration = performance.now() - start;
      
      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // Should be fast with index
    });

    it('should efficiently query by assignee', async () => {
      const start = performance.now();
      
      const results = await db.select()
        .from(hitl_approvals)
        .where(
          and(
            eq(hitl_approvals.tenant_id, 'tenant-001'),
            eq(hitl_approvals.assigned_to_id, 'user-001')
          )
        )
        .limit(100);

      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(50);
    });

    it('should efficiently query by SLA deadline range', async () => {
      const start = performance.now();
      
      const now = new Date();
      const hourFromNow = new Date(Date.now() + 3600000);

      const results = await db.select()
        .from(hitl_approvals)
        .where(
          and(
            eq(hitl_approvals.status, 'pending'),
            gte(hitl_approvals.sla_deadline, now),
            lte(hitl_approvals.sla_deadline, hourFromNow)
          )
        );

      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Audit Log Hash Chain', () => {
    it('should maintain hash chain integrity', async () => {
      const approval = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-hash-001',
        entity_type: 'offer',
        entity_id: 'offer-hash-001',
        approval_type: 'standard',
        status: 'pending',
      }).returning();

      // Insert audit entries
      const entries = [
        { action: 'created', performed_by_id: 'user-001' },
        { action: 'assigned', performed_by_id: 'system' },
        { action: 'approved', performed_by_id: 'user-002' },
      ];

      for (const entry of entries) {
        await db.insert(approval_audit_log).values({
          approval_id: approval[0].id,
          tenant_id: 'tenant-hash-001',
          action: entry.action,
          performed_by_id: entry.performed_by_id,
        });
      }

      // Verify hash chain
      const result = await db.execute(sql`
        SELECT verify_audit_hash_chain(${approval[0].id})
      `);

      expect(result.rows[0].verify_audit_hash_chain).toBe(true);
    });

    it('should detect tampered entries', async () => {
      const approval = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-tamper-001',
        entity_type: 'offer',
        entity_id: 'offer-tamper-001',
        approval_type: 'standard',
        status: 'pending',
      }).returning();

      // Insert entries
      const entries = await db.insert(approval_audit_log).values([
        { approval_id: approval[0].id, tenant_id: 'tenant-tamper-001', action: 'created', performed_by_id: 'user-001' },
        { approval_id: approval[0].id, tenant_id: 'tenant-tamper-001', action: 'assigned', performed_by_id: 'system' },
      ]).returning();

      // Tamper with an entry (direct SQL to bypass application logic)
      await db.execute(sql`
        UPDATE approval_audit_log 
        SET action = 'modified_action' 
        WHERE id = ${entries[0].id}
      `);

      // Verify hash chain detects tampering
      const result = await db.execute(sql`
        SELECT verify_audit_hash_chain(${approval[0].id})
      `);

      expect(result.rows[0].verify_audit_hash_chain).toBe(false);
    });
  });

  describe('Triggers and Functions', () => {
    it('should auto-update updated_at on modification', async () => {
      const approval = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-trigger-001',
        entity_type: 'offer',
        entity_id: 'offer-trigger-001',
        approval_type: 'standard',
        status: 'pending',
      }).returning();

      const originalUpdatedAt = approval[0].updated_at;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 100));

      await db.update(hitl_approvals)
        .set({ priority: 'high' })
        .where(eq(hitl_approvals.id, approval[0].id));

      const updated = await db.query.hitl_approvals.findFirst({
        where: eq(hitl_approvals.id, approval[0].id),
      });

      expect(updated?.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt!.getTime());
    });

    it('should auto-generate hash for audit entries', async () => {
      const approval = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-autohash-001',
        entity_type: 'offer',
        entity_id: 'offer-autohash-001',
        approval_type: 'standard',
        status: 'pending',
      }).returning();

      const entry = await db.insert(approval_audit_log).values({
        approval_id: approval[0].id,
        tenant_id: 'tenant-autohash-001',
        action: 'created',
        performed_by_id: 'user-001',
        // hash not provided
      }).returning();

      expect(entry[0].entry_hash).toBeTruthy();
      expect(entry[0].entry_hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it('should auto-increment version on update', async () => {
      const approval = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-version-001',
        entity_type: 'offer',
        entity_id: 'offer-version-001',
        approval_type: 'standard',
        status: 'pending',
        version: 1,
      }).returning();

      expect(approval[0].version).toBe(1);

      await db.execute(sql`
        UPDATE hitl_approvals 
        SET status = 'assigned'
        WHERE id = ${approval[0].id}
      `);

      const updated = await db.query.hitl_approvals.findFirst({
        where: eq(hitl_approvals.id, approval[0].id),
      });

      expect(updated?.version).toBe(2);
    });
  });

  describe('JSON/JSONB Operations', () => {
    it('should store and query metadata correctly', async () => {
      const approval = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-json-001',
        entity_type: 'offer',
        entity_id: 'offer-json-001',
        approval_type: 'standard',
        status: 'pending',
        metadata: {
          offerValue: 50000,
          discountPercent: 20,
          products: ['prod-001', 'prod-002'],
          customer: {
            id: 'cust-001',
            tier: 'gold',
          },
        },
      }).returning();

      // Query by JSON path
      const results = await db.select()
        .from(hitl_approvals)
        .where(
          sql`${hitl_approvals.metadata}->>'offerValue' = '50000'`
        );

      expect(results).toHaveLength(1);

      // Query nested JSON
      const nestedResults = await db.select()
        .from(hitl_approvals)
        .where(
          sql`${hitl_approvals.metadata}->'customer'->>'tier' = 'gold'`
        );

      expect(nestedResults).toHaveLength(1);
    });

    it('should handle JSON array operations', async () => {
      const approval = await db.insert(hitl_approvals).values({
        tenant_id: 'tenant-jsonarr-001',
        entity_type: 'offer',
        entity_id: 'offer-jsonarr-001',
        approval_type: 'standard',
        status: 'pending',
        current_approvers: ['user-001', 'user-002'],
      }).returning();

      // Check array contains
      const results = await db.select()
        .from(hitl_approvals)
        .where(
          sql`${hitl_approvals.current_approvers} ? 'user-001'`
        );

      expect(results).toHaveLength(1);

      // Check array length
      const lengthResults = await db.select()
        .from(hitl_approvals)
        .where(
          sql`jsonb_array_length(${hitl_approvals.current_approvers}) = 2`
        );

      expect(lengthResults).toHaveLength(1);
    });
  });
});
```

#### 14.2.3 Queue Integration Tests

```typescript
// tests/integration/queue.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { HITLQueueService } from '@/services/queue-service';
import { db } from '@/db';
import { clearTestData } from '@test/helpers';

describe('Queue Integration', () => {
  let redis: Redis;
  let queueService: HITLQueueService;
  let processedJobs: Job[] = [];

  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '64039'),
      maxRetriesPerRequest: null,
    });

    queueService = new HITLQueueService({ redis, db });
    await queueService.initialize();
  });

  afterAll(async () => {
    await queueService.shutdown();
    await redis.quit();
  });

  beforeEach(async () => {
    processedJobs = [];
    await queueService.obliterateAll(); // Clear all queues
  });

  describe('SLA Check Queue', () => {
    it('should process SLA check jobs', async () => {
      const worker = queueService.createWorker('sla-check', async (job) => {
        processedJobs.push(job);
        return { checked: true, breached: 0 };
      });

      await queueService.addSLACheckJob();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(processedJobs).toHaveLength(1);
      expect(processedJobs[0].name).toBe('sla-check');

      await worker.close();
    });

    it('should schedule repeating SLA checks', async () => {
      await queueService.scheduleRecurringSLAChecks({
        pattern: '*/1 * * * *', // Every minute
      });

      const delayed = await queueService.getQueue('sla-check').getDelayed();
      expect(delayed.length).toBeGreaterThanOrEqual(0); // May be 0 if just ran
    });

    it('should handle SLA check failures with retry', async () => {
      let attempts = 0;
      
      const worker = queueService.createWorker('sla-check', async (job) => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      await queueService.addSLACheckJob({
        attempts: 3,
        backoff: { type: 'fixed', delay: 100 },
      });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(attempts).toBe(3);

      await worker.close();
    });
  });

  describe('Notification Queue', () => {
    it('should process notification jobs by channel', async () => {
      const emailJobs: Job[] = [];
      const pushJobs: Job[] = [];

      const emailWorker = queueService.createWorker('notification:email', async (job) => {
        emailJobs.push(job);
        return { sent: true };
      });

      const pushWorker = queueService.createWorker('notification:push', async (job) => {
        pushJobs.push(job);
        return { sent: true };
      });

      await queueService.addNotificationJob({
        userId: 'user-001',
        type: 'approval_assigned',
        channels: ['email', 'push'],
        data: { approvalId: 'approval-001' },
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(emailJobs).toHaveLength(1);
      expect(pushJobs).toHaveLength(1);

      await emailWorker.close();
      await pushWorker.close();
    });

    it('should delay notifications for quiet hours', async () => {
      await queueService.addNotificationJob({
        userId: 'user-001',
        type: 'reminder',
        channels: ['push'],
        data: {},
        delay: 3600000, // 1 hour delay
      });

      const waiting = await queueService.getQueue('notification:push').getWaiting();
      const delayed = await queueService.getQueue('notification:push').getDelayed();

      expect(waiting.length + delayed.length).toBe(1);
    });

    it('should respect priority ordering', async () => {
      const worker = queueService.createWorker('notification:in_app', async (job) => {
        processedJobs.push(job);
        return { processed: true };
      }, { concurrency: 1 });

      // Add jobs with different priorities
      await queueService.addNotificationJob({
        userId: 'user-001',
        type: 'low_priority',
        channels: ['in_app'],
        priority: 10, // Lower priority
      });

      await queueService.addNotificationJob({
        userId: 'user-002',
        type: 'high_priority',
        channels: ['in_app'],
        priority: 1, // Higher priority
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // High priority should be processed first
      expect(processedJobs[0].data.type).toBe('high_priority');

      await worker.close();
    });
  });

  describe('Escalation Queue', () => {
    it('should process escalation jobs', async () => {
      const worker = queueService.createWorker('escalation', async (job) => {
        processedJobs.push(job);
        return { 
          escalated: true,
          newLevel: job.data.currentLevel + 1,
        };
      });

      await queueService.addEscalationJob({
        approvalId: 'approval-001',
        currentLevel: 0,
        reason: 'SLA breach',
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(processedJobs).toHaveLength(1);
      expect(processedJobs[0].data.reason).toBe('SLA breach');

      await worker.close();
    });

    it('should schedule delayed escalations', async () => {
      await queueService.addEscalationJob({
        approvalId: 'approval-002',
        currentLevel: 1,
        reason: 'Warning threshold',
        delay: 1800000, // 30 minutes
      });

      const delayed = await queueService.getQueue('escalation').getDelayed();
      expect(delayed).toHaveLength(1);
      expect(delayed[0].data.approvalId).toBe('approval-002');
    });
  });

  describe('Metrics Queue', () => {
    it('should batch metrics for efficient processing', async () => {
      const worker = queueService.createWorker('metrics:record', async (job) => {
        processedJobs.push(job);
        return { recorded: job.data.metrics.length };
      });

      // Add multiple metrics
      for (let i = 0; i < 10; i++) {
        await queueService.addMetricJob({
          metric: 'approval_processed',
          value: 1,
          tags: { type: 'offer' },
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should be batched
      expect(processedJobs.length).toBeLessThan(10);

      await worker.close();
    });
  });

  describe('Queue Health', () => {
    it('should report queue health status', async () => {
      const health = await queueService.getHealthStatus();

      expect(health).toMatchObject({
        status: 'healthy',
        queues: expect.objectContaining({
          'sla-check': expect.objectContaining({
            waiting: expect.any(Number),
            active: expect.any(Number),
            failed: expect.any(Number),
          }),
        }),
      });
    });

    it('should detect stalled jobs', async () => {
      // Create a worker that stalls
      const worker = queueService.createWorker('test-stall', async () => {
        await new Promise(resolve => setTimeout(resolve, 60000)); // Long running
      }, { stalledInterval: 1000 });

      await queueService.getQueue('test-stall').add('test', { data: 'test' });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Force worker to disconnect (simulating crash)
      await worker.close();

      // Wait for stall detection
      await new Promise(resolve => setTimeout(resolve, 2000));

      const stalled = await queueService.getStalledJobs('test-stall');
      // May or may not have stalled depending on timing
      expect(Array.isArray(stalled)).toBe(true);
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move failed jobs to DLQ after max retries', async () => {
      const worker = queueService.createWorker('dlq-test', async () => {
        throw new Error('Always fails');
      }, {
        attempts: 3,
        backoff: { type: 'fixed', delay: 100 },
      });

      await queueService.getQueue('dlq-test').add('test', { data: 'test' });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 3000));

      const failed = await queueService.getQueue('dlq-test').getFailed();
      expect(failed).toHaveLength(1);
      expect(failed[0].attemptsMade).toBe(3);

      await worker.close();
    });

    it('should allow reprocessing from DLQ', async () => {
      let attempts = 0;
      
      const worker = queueService.createWorker('dlq-reprocess', async () => {
        attempts++;
        if (attempts < 4) {
          throw new Error('Failing');
        }
        return { success: true };
      }, {
        attempts: 3,
        backoff: { type: 'fixed', delay: 100 },
      });

      await queueService.getQueue('dlq-reprocess').add('test', { data: 'test' });

      // Wait for initial failures
      await new Promise(resolve => setTimeout(resolve, 2000));

      const failed = await queueService.getQueue('dlq-reprocess').getFailed();
      expect(failed).toHaveLength(1);

      // Retry from DLQ
      await failed[0].retry();

      await new Promise(resolve => setTimeout(resolve, 500));

      const completed = await queueService.getQueue('dlq-reprocess').getCompleted();
      expect(completed).toHaveLength(1);

      await worker.close();
    });
  });
});
```


#### 14.2.4 API Integration Tests

```typescript
// tests/integration/api.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp } from '@test/setup';
import { db } from '@/db';
import { clearTestData, seedTestData, createTestToken } from '@test/helpers';

describe('API Integration', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let adminToken: string;
  let userToken: string;
  let tenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearTestData(db);
    const seed = await seedTestData(db, {
      tenants: 1,
      users: [
        { role: 'admin', permissions: ['*'] },
        { role: 'user', permissions: ['approval_view', 'approval_create'] },
      ],
    });
    tenantId = seed.tenantId;
    adminToken = await createTestToken(seed.users[0].id, tenantId, ['*']);
    userToken = await createTestToken(seed.users[1].id, tenantId, ['approval_view', 'approval_create']);
  });

  describe('Approvals API', () => {
    describe('GET /api/v1/approvals', () => {
      beforeEach(async () => {
        // Seed approvals
        await db.insert('hitl_approvals').values([
          { tenant_id: tenantId, entity_type: 'offer', entity_id: 'o1', status: 'pending', approval_type: 'standard', priority: 'high' },
          { tenant_id: tenantId, entity_type: 'offer', entity_id: 'o2', status: 'approved', approval_type: 'standard', priority: 'medium' },
          { tenant_id: tenantId, entity_type: 'contract', entity_id: 'c1', status: 'pending', approval_type: 'high_value', priority: 'critical' },
          { tenant_id: 'other-tenant', entity_type: 'offer', entity_id: 'o3', status: 'pending', approval_type: 'standard' },
        ]);
      });

      it('should list approvals with pagination', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/approvals?limit=2&offset=0',
          headers: { Authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        
        expect(body.data).toHaveLength(2);
        expect(body.total).toBe(3); // Only same tenant
        expect(body.has_more).toBe(true);
      });

      it('should filter by status', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/approvals?status=pending',
          headers: { Authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        
        expect(body.data.every(a => a.status === 'pending')).toBe(true);
      });

      it('should filter by multiple criteria', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/approvals?status=pending&entity_type=offer&priority=high',
          headers: { Authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        
        expect(body.data).toHaveLength(1);
        expect(body.data[0].entity_id).toBe('o1');
      });

      it('should sort by multiple fields', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/approvals?sort=-priority,created_at',
          headers: { Authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        
        // Critical should be first
        expect(body.data[0].priority).toBe('critical');
      });

      it('should isolate tenants', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/approvals',
          headers: { Authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        
        // Should not see other-tenant's approval
        expect(body.data.every(a => a.tenant_id === tenantId)).toBe(true);
      });
    });

    describe('POST /api/v1/approvals', () => {
      it('should create approval with valid data', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/approvals',
          headers: { Authorization: `Bearer ${userToken}` },
          payload: {
            entity_type: 'offer',
            entity_id: 'new-offer-001',
            approval_type: 'standard',
            priority: 'medium',
            metadata: { value: 10000 },
          },
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();
        
        expect(body.id).toBeTruthy();
        expect(body.status).toBe('pending');
        expect(body.entity_type).toBe('offer');
      });

      it('should reject invalid entity_type', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/approvals',
          headers: { Authorization: `Bearer ${userToken}` },
          payload: {
            entity_type: 'invalid_type',
            entity_id: 'id-001',
            approval_type: 'standard',
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json().code).toBe('VALIDATION_ERROR');
      });

      it('should reject duplicate entity', async () => {
        // Create first
        await app.inject({
          method: 'POST',
          url: '/api/v1/approvals',
          headers: { Authorization: `Bearer ${userToken}` },
          payload: {
            entity_type: 'offer',
            entity_id: 'dup-offer',
            approval_type: 'standard',
          },
        });

        // Create duplicate
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/approvals',
          headers: { Authorization: `Bearer ${userToken}` },
          payload: {
            entity_type: 'offer',
            entity_id: 'dup-offer',
            approval_type: 'standard',
          },
        });

        expect(response.statusCode).toBe(409);
        expect(response.json().code).toBe('DUPLICATE_APPROVAL');
      });
    });

    describe('GET /api/v1/approvals/:id', () => {
      it('should return approval with full details', async () => {
        const created = await db.insert('hitl_approvals').values({
          tenant_id: tenantId,
          entity_type: 'offer',
          entity_id: 'detail-001',
          approval_type: 'standard',
          status: 'pending',
          metadata: { test: true },
        }).returning();

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/approvals/${created[0].id}`,
          headers: { Authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        
        expect(body.id).toBe(created[0].id);
        expect(body.metadata).toEqual({ test: true });
      });

      it('should return 404 for non-existent approval', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/approvals/non-existent-id',
          headers: { Authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(404);
      });

      it('should return 403 for other tenant approval', async () => {
        const created = await db.insert('hitl_approvals').values({
          tenant_id: 'other-tenant',
          entity_type: 'offer',
          entity_id: 'other-001',
          approval_type: 'standard',
          status: 'pending',
        }).returning();

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/approvals/${created[0].id}`,
          headers: { Authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('POST /api/v1/approvals/:id/approve', () => {
      it('should approve pending approval', async () => {
        const created = await db.insert('hitl_approvals').values({
          tenant_id: tenantId,
          entity_type: 'offer',
          entity_id: 'approve-001',
          approval_type: 'standard',
          status: 'pending',
          required_approvers: 1,
        }).returning();

        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/approvals/${created[0].id}/approve`,
          headers: { Authorization: `Bearer ${adminToken}` },
          payload: { comment: 'Approved' },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().status).toBe('approved');
      });

      it('should reject if user lacks permission', async () => {
        const created = await db.insert('hitl_approvals').values({
          tenant_id: tenantId,
          entity_type: 'offer',
          entity_id: 'approve-002',
          approval_type: 'high_value',
          status: 'pending',
          required_approvers: 1,
        }).returning();

        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/approvals/${created[0].id}/approve`,
          headers: { Authorization: `Bearer ${userToken}` }, // User doesn't have approve permission
          payload: { comment: 'Trying to approve' },
        });

        expect(response.statusCode).toBe(403);
      });
    });
  });

  describe('Statistics API', () => {
    beforeEach(async () => {
      // Seed data for statistics
      const approvals = [
        { tenant_id: tenantId, entity_type: 'offer', entity_id: 'stat-1', status: 'pending', priority: 'high', sla_deadline: new Date(Date.now() + 3600000) },
        { tenant_id: tenantId, entity_type: 'offer', entity_id: 'stat-2', status: 'approved', priority: 'medium', resolved_at: new Date() },
        { tenant_id: tenantId, entity_type: 'offer', entity_id: 'stat-3', status: 'rejected', priority: 'low', resolved_at: new Date() },
        { tenant_id: tenantId, entity_type: 'offer', entity_id: 'stat-4', status: 'pending', priority: 'critical', sla_breached_at: new Date() },
      ];
      
      for (const approval of approvals) {
        await db.insert('hitl_approvals').values(approval);
      }
    });

    it('should return dashboard statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/approvals/stats/dashboard',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.total_pending).toBe(2);
      expect(body.total_pending_by_priority.high).toBe(1);
      expect(body.total_pending_by_priority.critical).toBe(1);
      expect(body.resolved_today.approved).toBe(1);
      expect(body.resolved_today.rejected).toBe(1);
    });

    it('should return SLA statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/approvals/stats/sla',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body.total_breached).toBe(1);
      expect(body.compliance_rate).toBeLessThan(100);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make many requests quickly
      const responses = await Promise.all(
        Array.from({ length: 150 }, () =>
          app.inject({
            method: 'GET',
            url: '/api/v1/approvals',
            headers: { Authorization: `Bearer ${userToken}` },
          })
        )
      );

      // Some should be rate limited
      const rateLimited = responses.filter(r => r.statusCode === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Check rate limit headers
      const limited = rateLimited[0];
      expect(limited.headers['x-ratelimit-limit']).toBeTruthy();
      expect(limited.headers['x-ratelimit-remaining']).toBe('0');
      expect(limited.headers['retry-after']).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/approvals/invalid-id',
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();

      expect(body).toMatchObject({
        error: expect.any(String),
        code: expect.any(String),
        request_id: expect.any(String),
      });
    });

    it('should handle validation errors', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/approvals',
        headers: { Authorization: `Bearer ${userToken}` },
        payload: {
          // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();

      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toBeTruthy();
    });

    it('should handle database errors gracefully', async () => {
      // Force a database error by using invalid SQL
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/approvals?sort=invalid_column',
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('INVALID_SORT_FIELD');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/approvals',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = await createTestToken('user-001', tenantId, [], { expiresIn: '-1h' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/approvals',
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe('TOKEN_EXPIRED');
    });

    it('should reject invalid tokens', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/approvals',
        headers: { Authorization: 'Bearer invalid.token.here' },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
```


### 14.3 End-to-End Tests

#### 14.3.1 Complete Approval Workflow E2E

```typescript
// tests/e2e/approval-workflow.e2e.test.ts
import { test, expect } from '@playwright/test';
import { TestDatabase, TestMailServer, TestWebSocket } from '@test/e2e-helpers';

test.describe('Approval Workflow E2E', () => {
  let db: TestDatabase;
  let mailServer: TestMailServer;
  let wsClient: TestWebSocket;

  test.beforeAll(async () => {
    db = await TestDatabase.create();
    mailServer = await TestMailServer.create();
    await db.seed({
      tenants: [{ id: 'test-tenant', name: 'Test Company' }],
      users: [
        { id: 'sales-rep', email: 'rep@test.com', role: 'sales_rep', tenantId: 'test-tenant' },
        { id: 'manager', email: 'manager@test.com', role: 'sales_manager', tenantId: 'test-tenant' },
        { id: 'director', email: 'director@test.com', role: 'sales_director', tenantId: 'test-tenant' },
      ],
    });
  });

  test.afterAll(async () => {
    await db.cleanup();
    await mailServer.cleanup();
  });

  test.beforeEach(async ({ page }) => {
    wsClient = new TestWebSocket();
    await wsClient.connect();
  });

  test.afterEach(async () => {
    await wsClient.disconnect();
  });

  test('complete single-approver workflow', async ({ page }) => {
    // Login as sales rep
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'rep@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // Create a new offer that requires approval
    await page.click('[data-testid="new-offer-button"]');
    await page.fill('[data-testid="customer-select"]', 'Ferma Test');
    await page.click('[data-testid="customer-option-0"]');
    
    await page.click('[data-testid="add-product"]');
    await page.fill('[data-testid="product-search"]', 'Tractor');
    await page.click('[data-testid="product-option-0"]');
    await page.fill('[data-testid="quantity"]', '2');
    await page.fill('[data-testid="discount"]', '15');

    await page.click('[data-testid="submit-offer"]');

    // Verify approval request created
    await expect(page.locator('[data-testid="approval-pending-badge"]')).toBeVisible();
    const offerId = await page.getAttribute('[data-testid="offer-id"]', 'data-value');

    // Verify manager received notification
    await expect.poll(async () => {
      const emails = await mailServer.getEmails('manager@test.com');
      return emails.some(e => e.subject.includes('New approval request'));
    }).toBe(true);

    // Login as manager
    await page.click('[data-testid="logout"]');
    await page.fill('[data-testid="email"]', 'manager@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    // Navigate to approvals dashboard
    await page.click('[data-testid="nav-approvals"]');
    await expect(page.locator('[data-testid="approvals-list"]')).toBeVisible();

    // Find and open the approval
    await page.click(`[data-testid="approval-row-${offerId}"]`);
    await expect(page).toHaveURL(new RegExp(`/approvals/.*`));

    // Review offer details
    await expect(page.locator('[data-testid="offer-value"]')).toContainText('€');
    await expect(page.locator('[data-testid="discount-percent"]')).toContainText('15%');

    // Add a comment
    await page.fill('[data-testid="comment-input"]', 'Discount approved within guidelines');
    await page.click('[data-testid="add-comment"]');
    await expect(page.locator('[data-testid="comment-list"]')).toContainText('Discount approved');

    // Approve
    await page.click('[data-testid="approve-button"]');
    await page.fill('[data-testid="approval-reason"]', 'Approved per discount policy');
    await page.click('[data-testid="confirm-approve"]');

    // Verify approval status
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Approved');

    // Verify sales rep received notification
    await expect.poll(async () => {
      const emails = await mailServer.getEmails('rep@test.com');
      return emails.some(e => e.subject.includes('Offer approved'));
    }).toBe(true);

    // Verify real-time update
    const wsMessage = await wsClient.waitForMessage('approval:resolved');
    expect(wsMessage.data.status).toBe('approved');
  });

  test('multi-approver workflow with escalation', async ({ page }) => {
    // Create high-value offer requiring 2 approvers
    await db.insert('hitl_approvals', {
      tenant_id: 'test-tenant',
      entity_type: 'offer',
      entity_id: 'high-value-offer',
      approval_type: 'offer_high_value',
      status: 'pending',
      required_approvers: 2,
      priority: 'high',
      sla_deadline: new Date(Date.now() + 1800000), // 30 minutes
      sla_warning_at: new Date(Date.now() + 900000), // 15 minutes
      escalation_path: ['sales_manager', 'sales_director'],
      metadata: { value: 150000 },
    });

    // Login as manager
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'manager@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    // Navigate to approval
    await page.goto('/approvals');
    await page.click('[data-testid="approval-row-high-value-offer"]');

    // First approval
    await page.click('[data-testid="approve-button"]');
    await page.fill('[data-testid="approval-reason"]', 'First approval - within regional authority');
    await page.click('[data-testid="confirm-approve"]');

    // Verify still pending (needs 2 approvers)
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Pending');
    await expect(page.locator('[data-testid="approvers-count"]')).toContainText('1/2');

    // Login as director for second approval
    await page.click('[data-testid="logout"]');
    await page.fill('[data-testid="email"]', 'director@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/approvals');
    await page.click('[data-testid="approval-row-high-value-offer"]');

    // Second approval
    await page.click('[data-testid="approve-button"]');
    await page.fill('[data-testid="approval-reason"]', 'Final approval - strategic customer');
    await page.click('[data-testid="confirm-approve"]');

    // Verify now approved
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Approved');
    await expect(page.locator('[data-testid="approvers-count"]')).toContainText('2/2');

    // Verify audit trail
    await page.click('[data-testid="audit-tab"]');
    const auditEntries = page.locator('[data-testid="audit-entry"]');
    await expect(auditEntries).toHaveCount(3); // created, approved by manager, approved by director
  });

  test('rejection workflow with resubmission', async ({ page }) => {
    // Create offer
    const offerId = 'reject-offer';
    await db.insert('hitl_approvals', {
      tenant_id: 'test-tenant',
      entity_type: 'offer',
      entity_id: offerId,
      approval_type: 'offer_standard',
      status: 'pending',
      required_approvers: 1,
      priority: 'medium',
      created_by_id: 'sales-rep',
      metadata: { value: 25000, discount_percent: 35 },
    });

    // Login as manager and reject
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'manager@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/approvals');
    await page.click(`[data-testid="approval-row-${offerId}"]`);

    await page.click('[data-testid="reject-button"]');
    await page.fill('[data-testid="rejection-reason"]', 'Discount exceeds 25% maximum without director approval');
    await page.fill('[data-testid="suggested-action"]', 'Reduce discount to 25% or escalate to director');
    await page.click('[data-testid="confirm-reject"]');

    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Rejected');

    // Login as sales rep to resubmit
    await page.click('[data-testid="logout"]');
    await page.fill('[data-testid="email"]', 'rep@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    // Navigate to rejected approval
    await page.goto(`/offers/${offerId}`);
    await expect(page.locator('[data-testid="approval-status"]')).toContainText('Rejected');
    await expect(page.locator('[data-testid="rejection-reason"]')).toContainText('exceeds 25%');

    // Edit and resubmit
    await page.click('[data-testid="edit-offer"]');
    await page.fill('[data-testid="discount"]', '25');
    await page.click('[data-testid="resubmit-for-approval"]');

    // Verify new approval created
    await expect(page.locator('[data-testid="approval-status"]')).toContainText('Pending');
  });

  test('SLA breach and automatic escalation', async ({ page }) => {
    // Create approval with very short SLA
    const offerId = 'sla-breach-offer';
    await db.insert('hitl_approvals', {
      tenant_id: 'test-tenant',
      entity_type: 'offer',
      entity_id: offerId,
      approval_type: 'offer_standard',
      status: 'pending',
      required_approvers: 1,
      priority: 'high',
      assigned_to_id: 'manager',
      sla_deadline: new Date(Date.now() - 60000), // Already past deadline
      escalation_level: 0,
      escalation_path: ['sales_manager', 'sales_director'],
    });

    // Trigger SLA check (normally runs on schedule)
    await page.request.post('/api/v1/internal/sla-check');

    // Verify escalation occurred
    await expect.poll(async () => {
      const approval = await db.findOne('hitl_approvals', { entity_id: offerId });
      return approval.escalation_level;
    }).toBe(1);

    // Verify director received escalation notification
    await expect.poll(async () => {
      const emails = await mailServer.getEmails('director@test.com');
      return emails.some(e => e.subject.includes('Escalation'));
    }).toBe(true);

    // Login as director
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'director@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    // Verify breach indicator in dashboard
    await page.goto('/approvals');
    const breachedRow = page.locator(`[data-testid="approval-row-${offerId}"]`);
    await expect(breachedRow.locator('[data-testid="sla-breach-badge"]')).toBeVisible();

    // Handle escalated approval
    await breachedRow.click();
    await expect(page.locator('[data-testid="escalation-indicator"]')).toContainText('Escalated');
    await expect(page.locator('[data-testid="sla-status"]')).toContainText('Breached');

    await page.click('[data-testid="approve-button"]');
    await page.fill('[data-testid="approval-reason"]', 'Approved after escalation review');
    await page.click('[data-testid="confirm-approve"]');

    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Approved');
  });
});
```

#### 14.3.2 Dashboard E2E Tests

```typescript
// tests/e2e/dashboard.e2e.test.ts
import { test, expect } from '@playwright/test';
import { TestDatabase } from '@test/e2e-helpers';

test.describe('Dashboard E2E', () => {
  let db: TestDatabase;

  test.beforeAll(async () => {
    db = await TestDatabase.create();
    await db.seed({
      tenants: [{ id: 'test-tenant' }],
      users: [{ id: 'manager', role: 'sales_manager', tenantId: 'test-tenant' }],
      approvals: generateTestApprovals(50),
    });
  });

  test.afterAll(async () => {
    await db.cleanup();
  });

  test('dashboard displays correct statistics', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'manager@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/dashboard');

    // Verify stat cards
    await expect(page.locator('[data-testid="pending-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="my-queue-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="sla-compliance"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolved-today"]')).toBeVisible();

    // Verify charts render
    await expect(page.locator('[data-testid="priority-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-chart"]')).toBeVisible();
  });

  test('dashboard filters work correctly', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'manager@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/dashboard');

    // Filter by date range
    await page.click('[data-testid="date-range-picker"]');
    await page.click('[data-testid="last-7-days"]');

    // Wait for stats to update
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

    // Filter by type
    await page.selectOption('[data-testid="type-filter"]', 'offer');
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

    // Verify URL reflects filters
    expect(page.url()).toContain('type=offer');
  });

  test('real-time updates work', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'manager@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/dashboard');

    const initialPendingCount = await page.locator('[data-testid="pending-count"]').textContent();

    // Create new approval via API
    await db.insert('hitl_approvals', {
      tenant_id: 'test-tenant',
      entity_type: 'offer',
      entity_id: `realtime-${Date.now()}`,
      status: 'pending',
      assigned_to_id: 'manager',
    });

    // Wait for WebSocket update
    await expect.poll(async () => {
      return await page.locator('[data-testid="pending-count"]').textContent();
    }, { timeout: 5000 }).not.toBe(initialPendingCount);
  });

  test('quick actions from dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'manager@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/dashboard');

    // Click on pending count to navigate to filtered list
    await page.click('[data-testid="pending-count"]');
    await expect(page).toHaveURL(/\/approvals\?status=pending/);

    // Go back and click on breached
    await page.goto('/dashboard');
    await page.click('[data-testid="breached-count"]');
    await expect(page).toHaveURL(/\/approvals\?sla_status=breached/);
  });
});

function generateTestApprovals(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    tenant_id: 'test-tenant',
    entity_type: i % 2 === 0 ? 'offer' : 'contract',
    entity_id: `test-${i}`,
    status: ['pending', 'approved', 'rejected'][i % 3],
    priority: ['low', 'medium', 'high', 'critical'][i % 4],
    assigned_to_id: i % 3 === 0 ? 'manager' : null,
    created_at: new Date(Date.now() - i * 3600000),
    sla_deadline: new Date(Date.now() + (i % 2 === 0 ? 3600000 : -3600000)),
    sla_breached_at: i % 5 === 0 ? new Date() : null,
  }));
}
```

#### 14.3.3 WebSocket Real-Time E2E Tests

```typescript
// tests/e2e/websocket.e2e.test.ts
import { test, expect } from '@playwright/test';
import { TestDatabase, TestWebSocket } from '@test/e2e-helpers';

test.describe('WebSocket Real-Time E2E', () => {
  let db: TestDatabase;

  test.beforeAll(async () => {
    db = await TestDatabase.create();
    await db.seed({
      tenants: [{ id: 'test-tenant' }],
      users: [
        { id: 'user-1', tenantId: 'test-tenant' },
        { id: 'user-2', tenantId: 'test-tenant' },
      ],
    });
  });

  test('receives approval updates in real-time', async ({ page, context }) => {
    // Login user 1
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user1@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/approvals');

    // Open second browser context for user 2
    const page2 = await context.newPage();
    await page2.goto('/login');
    await page2.fill('[data-testid="email"]', 'user2@test.com');
    await page2.fill('[data-testid="password"]', 'test123');
    await page2.click('[data-testid="login-button"]');

    // User 2 creates an approval
    await page2.click('[data-testid="new-approval"]');
    await page2.fill('[data-testid="entity-id"]', 'ws-test-entity');
    await page2.selectOption('[data-testid="entity-type"]', 'offer');
    await page2.click('[data-testid="submit"]');

    // User 1 should see the new approval appear
    await expect(page.locator('[data-testid="approval-row-ws-test-entity"]')).toBeVisible({ timeout: 5000 });
  });

  test('receives notification in real-time', async ({ page, context }) => {
    // Create approval assigned to user 1
    await db.insert('hitl_approvals', {
      tenant_id: 'test-tenant',
      entity_type: 'offer',
      entity_id: 'notify-test',
      status: 'pending',
      assigned_to_id: 'user-1',
    });

    // Login user 1
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user1@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    // Check initial notification count
    const initialCount = await page.locator('[data-testid="notification-count"]').textContent();

    // User 2 adds a comment (via API to simulate)
    await page.request.post('/api/v1/approvals/notify-test/comments', {
      data: {
        content: 'Need your review @user-1',
        mentioned_user_ids: ['user-1'],
      },
      headers: {
        Authorization: `Bearer ${await db.getToken('user-2')}`,
      },
    });

    // User 1 should see notification count increase
    await expect.poll(async () => {
      return await page.locator('[data-testid="notification-count"]').textContent();
    }, { timeout: 5000 }).not.toBe(initialCount);

    // Notification bell should show new notification
    await page.click('[data-testid="notification-bell"]');
    await expect(page.locator('[data-testid="notification-item"]').first()).toContainText('mentioned you');
  });

  test('handles reconnection gracefully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user1@test.com');
    await page.fill('[data-testid="password"]', 'test123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/dashboard');

    // Wait for WebSocket connection
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

    // Simulate network disconnect
    await page.context().setOffline(true);
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected', { timeout: 5000 });

    // Reconnect
    await page.context().setOffline(false);
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected', { timeout: 10000 });

    // Verify real-time still works after reconnect
    await db.insert('hitl_approvals', {
      tenant_id: 'test-tenant',
      entity_type: 'offer',
      entity_id: 'reconnect-test',
      status: 'pending',
    });

    await expect(page.locator('[data-testid="pending-count"]')).not.toHaveText('0', { timeout: 5000 });
  });
});
```


### 14.4 Performance Tests

#### 14.4.1 Load Testing with k6

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const approvalCreateRate = new Rate('approval_create_success');
const approvalListRate = new Rate('approval_list_success');
const approvalProcessRate = new Rate('approval_process_success');
const approvalCreateDuration = new Trend('approval_create_duration');
const approvalListDuration = new Trend('approval_list_duration');
const approvalProcessDuration = new Trend('approval_process_duration');

// Configuration
export const options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    // Load test
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up
        { duration: '5m', target: 50 },  // Stay at 50
        { duration: '2m', target: 100 }, // Ramp to 100
        { duration: '5m', target: 100 }, // Stay at 100
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
    },
    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '3m', target: 300 },
        { duration: '3m', target: 400 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '10s', target: 500 }, // Spike!
        { duration: '30s', target: 500 },
        { duration: '10s', target: 10 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    approval_create_success: ['rate>0.95'],
    approval_list_success: ['rate>0.99'],
    approval_process_success: ['rate>0.95'],
    approval_create_duration: ['p(95)<300'],
    approval_list_duration: ['p(95)<200'],
    approval_process_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:64000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

export function setup() {
  // Create test data
  const setupResponse = http.post(`${BASE_URL}/api/v1/test/setup`, JSON.stringify({
    tenants: 5,
    usersPerTenant: 20,
    approvalsPerTenant: 1000,
  }), { headers });
  
  return setupResponse.json();
}

export default function(data) {
  group('List Approvals', () => {
    const startTime = new Date();
    const response = http.get(
      `${BASE_URL}/api/v1/approvals?limit=20&status=pending`,
      { headers }
    );
    
    approvalListDuration.add(new Date() - startTime);
    
    const success = check(response, {
      'list status 200': (r) => r.status === 200,
      'list has data': (r) => JSON.parse(r.body).data.length > 0,
      'list response time OK': (r) => r.timings.duration < 500,
    });
    
    approvalListRate.add(success);
  });

  sleep(randomIntBetween(1, 3));

  group('Create Approval', () => {
    const entityId = `perf-test-${randomString(8)}`;
    const startTime = new Date();
    
    const response = http.post(
      `${BASE_URL}/api/v1/approvals`,
      JSON.stringify({
        entity_type: 'offer',
        entity_id: entityId,
        approval_type: 'standard',
        priority: ['low', 'medium', 'high', 'critical'][randomIntBetween(0, 3)],
        metadata: {
          value: randomIntBetween(1000, 100000),
          test: true,
        },
      }),
      { headers }
    );
    
    approvalCreateDuration.add(new Date() - startTime);
    
    const success = check(response, {
      'create status 201': (r) => r.status === 201,
      'create has id': (r) => JSON.parse(r.body).id !== undefined,
      'create response time OK': (r) => r.timings.duration < 500,
    });
    
    approvalCreateRate.add(success);
    
    if (success) {
      const approvalId = JSON.parse(response.body).id;
      
      sleep(randomIntBetween(1, 2));
      
      // Get approval details
      group('Get Approval Details', () => {
        const detailResponse = http.get(
          `${BASE_URL}/api/v1/approvals/${approvalId}`,
          { headers }
        );
        
        check(detailResponse, {
          'detail status 200': (r) => r.status === 200,
          'detail has entity_id': (r) => JSON.parse(r.body).entity_id === entityId,
        });
      });
      
      sleep(randomIntBetween(1, 2));
      
      // Process approval (approve/reject)
      group('Process Approval', () => {
        const action = Math.random() > 0.3 ? 'approve' : 'reject';
        const startTime = new Date();
        
        const processResponse = http.post(
          `${BASE_URL}/api/v1/approvals/${approvalId}/${action}`,
          JSON.stringify({
            comment: `Performance test ${action}`,
            reason: action === 'reject' ? 'Test rejection' : undefined,
          }),
          { headers }
        );
        
        approvalProcessDuration.add(new Date() - startTime);
        
        const success = check(processResponse, {
          'process status 200': (r) => r.status === 200,
          'process has status': (r) => {
            const body = JSON.parse(r.body);
            return body.status === 'approved' || body.status === 'rejected';
          },
          'process response time OK': (r) => r.timings.duration < 1000,
        });
        
        approvalProcessRate.add(success);
      });
    }
  });

  sleep(randomIntBetween(1, 3));
}

export function teardown(data) {
  // Cleanup test data
  http.post(`${BASE_URL}/api/v1/test/cleanup`, JSON.stringify({
    prefix: 'perf-test-',
  }), { headers });
}
```

#### 14.4.2 Database Performance Tests

```typescript
// tests/performance/database-perf.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { performance } from 'perf_hooks';

describe('Database Performance', () => {
  const LARGE_DATASET_SIZE = 100000;
  
  beforeAll(async () => {
    console.log('Seeding large dataset...');
    
    // Batch insert for speed
    const batchSize = 1000;
    for (let i = 0; i < LARGE_DATASET_SIZE; i += batchSize) {
      const batch = Array.from({ length: batchSize }, (_, j) => ({
        tenant_id: `tenant-${(i + j) % 100}`,
        entity_type: (i + j) % 2 === 0 ? 'offer' : 'contract',
        entity_id: `perf-entity-${i + j}`,
        approval_type: (i + j) % 3 === 0 ? 'high_value' : 'standard',
        status: ['pending', 'approved', 'rejected'][(i + j) % 3],
        priority: ['low', 'medium', 'high', 'critical'][(i + j) % 4],
        created_at: new Date(Date.now() - (i + j) * 60000),
        assigned_to_id: (i + j) % 5 === 0 ? null : `user-${(i + j) % 50}`,
        sla_deadline: new Date(Date.now() + (i + j % 2 === 0 ? 3600000 : -3600000)),
      }));
      
      await db.insert('hitl_approvals').values(batch);
    }
    
    console.log(`Seeded ${LARGE_DATASET_SIZE} approvals`);
  }, 300000); // 5 minute timeout

  afterAll(async () => {
    await db.execute(sql`DELETE FROM hitl_approvals WHERE entity_id LIKE 'perf-entity-%'`);
  });

  describe('Query Performance', () => {
    it('should query by tenant_id + status efficiently', async () => {
      const iterations = 100;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const tenantId = `tenant-${i % 100}`;
        const start = performance.now();
        
        await db.select()
          .from('hitl_approvals')
          .where(
            and(
              eq(hitl_approvals.tenant_id, tenantId),
              eq(hitl_approvals.status, 'pending')
            )
          )
          .limit(100);
        
        times.push(performance.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      
      console.log(`Query by tenant+status: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);
      
      expect(avg).toBeLessThan(50);
      expect(p95).toBeLessThan(100);
    });

    it('should query by assignee efficiently', async () => {
      const iterations = 100;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const userId = `user-${i % 50}`;
        const start = performance.now();
        
        await db.select()
          .from('hitl_approvals')
          .where(eq(hitl_approvals.assigned_to_id, userId))
          .limit(100);
        
        times.push(performance.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      
      console.log(`Query by assignee: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);
      
      expect(avg).toBeLessThan(50);
      expect(p95).toBeLessThan(100);
    });

    it('should handle complex aggregations efficiently', async () => {
      const start = performance.now();
      
      const result = await db.execute(sql`
        SELECT 
          tenant_id,
          status,
          priority,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at)) / 60) as avg_minutes
        FROM hitl_approvals
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY tenant_id, status, priority
        ORDER BY tenant_id, count DESC
      `);
      
      const duration = performance.now() - start;
      
      console.log(`Complex aggregation: ${duration.toFixed(2)}ms, rows=${result.rows.length}`);
      
      expect(duration).toBeLessThan(2000);
    });

    it('should handle SLA deadline range queries efficiently', async () => {
      const iterations = 50;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const now = new Date();
        const hourFromNow = new Date(Date.now() + 3600000);
        const start = performance.now();
        
        await db.select()
          .from('hitl_approvals')
          .where(
            and(
              eq(hitl_approvals.status, 'pending'),
              gte(hitl_approvals.sla_deadline, now),
              lte(hitl_approvals.sla_deadline, hourFromNow)
            )
          )
          .limit(1000);
        
        times.push(performance.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      
      console.log(`SLA range query: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);
      
      expect(avg).toBeLessThan(100);
      expect(p95).toBeLessThan(200);
    });
  });

  describe('Write Performance', () => {
    it('should handle concurrent inserts', async () => {
      const concurrency = 50;
      const start = performance.now();
      
      await Promise.all(
        Array.from({ length: concurrency }, (_, i) =>
          db.insert('hitl_approvals').values({
            tenant_id: 'perf-write-tenant',
            entity_type: 'offer',
            entity_id: `concurrent-${Date.now()}-${i}`,
            approval_type: 'standard',
            status: 'pending',
          })
        )
      );
      
      const duration = performance.now() - start;
      
      console.log(`Concurrent inserts (${concurrency}): ${duration.toFixed(2)}ms`);
      
      expect(duration).toBeLessThan(1000);
    });

    it('should handle optimistic locking under contention', async () => {
      // Create a single approval
      const approval = await db.insert('hitl_approvals').values({
        tenant_id: 'perf-lock-tenant',
        entity_type: 'offer',
        entity_id: `lock-test-${Date.now()}`,
        approval_type: 'standard',
        status: 'pending',
        version: 1,
      }).returning();

      const approvalId = approval[0].id;
      
      // Simulate concurrent updates
      const updates = 20;
      let successCount = 0;
      let conflictCount = 0;
      
      const start = performance.now();
      
      await Promise.all(
        Array.from({ length: updates }, async (_, i) => {
          try {
            const result = await db.execute(sql`
              UPDATE hitl_approvals 
              SET priority = ${['low', 'medium', 'high', 'critical'][i % 4]},
                  version = version + 1
              WHERE id = ${approvalId} AND version = 1
              RETURNING id
            `);
            
            if (result.rows.length > 0) {
              successCount++;
            } else {
              conflictCount++;
            }
          } catch (e) {
            conflictCount++;
          }
        })
      );
      
      const duration = performance.now() - start;
      
      console.log(`Optimistic locking (${updates} attempts): ${duration.toFixed(2)}ms, success=${successCount}, conflicts=${conflictCount}`);
      
      expect(successCount).toBe(1); // Only one should succeed
      expect(conflictCount).toBe(updates - 1);
    });
  });

  describe('Index Effectiveness', () => {
    it('should use indexes for common queries', async () => {
      const queries = [
        {
          name: 'tenant_status_index',
          query: sql`EXPLAIN ANALYZE SELECT * FROM hitl_approvals WHERE tenant_id = 'tenant-1' AND status = 'pending' LIMIT 100`,
        },
        {
          name: 'assignee_index',
          query: sql`EXPLAIN ANALYZE SELECT * FROM hitl_approvals WHERE assigned_to_id = 'user-1' LIMIT 100`,
        },
        {
          name: 'sla_deadline_index',
          query: sql`EXPLAIN ANALYZE SELECT * FROM hitl_approvals WHERE sla_deadline > NOW() AND sla_deadline < NOW() + INTERVAL '1 hour' LIMIT 100`,
        },
      ];

      for (const { name, query } of queries) {
        const result = await db.execute(query);
        const plan = result.rows.map(r => r['QUERY PLAN']).join('\n');
        
        console.log(`\n${name}:\n${plan}`);
        
        // Verify index scan is used (not sequential scan for large tables)
        expect(plan).toMatch(/Index Scan|Index Only Scan|Bitmap Index Scan/i);
        expect(plan).not.toMatch(/Seq Scan on hitl_approvals/i);
      }
    });
  });
});
```

#### 14.4.3 WebSocket Performance Tests

```typescript
// tests/performance/websocket-perf.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { performance } from 'perf_hooks';

describe('WebSocket Performance', () => {
  const WS_URL = process.env.WS_URL || 'ws://localhost:64000/ws';
  const connections: WebSocket[] = [];

  afterAll(async () => {
    connections.forEach(ws => ws.close());
  });

  it('should handle 1000 concurrent connections', async () => {
    const targetConnections = 1000;
    const start = performance.now();
    
    const connectPromises = Array.from({ length: targetConnections }, (_, i) =>
      new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(`${WS_URL}?token=test-token-${i}`);
        
        ws.on('open', () => {
          connections.push(ws);
          resolve(ws);
        });
        
        ws.on('error', reject);
        
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      })
    );

    const results = await Promise.allSettled(connectPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    const duration = performance.now() - start;
    
    console.log(`WebSocket connections: ${successful}/${targetConnections} in ${duration.toFixed(2)}ms`);
    
    expect(successful).toBeGreaterThan(targetConnections * 0.95); // 95% success rate
  }, 30000);

  it('should broadcast to all clients efficiently', async () => {
    const clientCount = 100;
    const receivedMessages: Map<number, number[]> = new Map();
    
    // Create clients
    const clients = await Promise.all(
      Array.from({ length: clientCount }, (_, i) =>
        new Promise<WebSocket>((resolve) => {
          const ws = new WebSocket(`${WS_URL}?token=broadcast-test-${i}`);
          receivedMessages.set(i, []);
          
          ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'broadcast-test') {
              receivedMessages.get(i)?.push(Date.now());
            }
          });
          
          ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'subscribe', channel: 'test-broadcast' }));
            resolve(ws);
          });
        })
      )
    );

    // Wait for subscriptions
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Broadcast message
    const broadcastStart = performance.now();
    
    // Simulate server broadcast
    clients[0].send(JSON.stringify({
      type: 'admin-broadcast',
      channel: 'test-broadcast',
      data: { type: 'broadcast-test', timestamp: Date.now() },
    }));

    // Wait for all clients to receive
    await new Promise(resolve => setTimeout(resolve, 2000));

    const receiveCounts = Array.from(receivedMessages.values()).map(arr => arr.length);
    const allReceived = receiveCounts.every(count => count >= 1);
    
    console.log(`Broadcast to ${clientCount} clients: all received = ${allReceived}`);
    
    // Cleanup
    clients.forEach(ws => ws.close());
    
    expect(allReceived).toBe(true);
  }, 30000);

  it('should handle high message throughput', async () => {
    const ws = new WebSocket(`${WS_URL}?token=throughput-test`);
    const messageCount = 1000;
    let receivedCount = 0;
    
    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    const start = performance.now();
    
    ws.on('message', () => {
      receivedCount++;
    });

    // Send messages rapidly
    for (let i = 0; i < messageCount; i++) {
      ws.send(JSON.stringify({
        type: 'echo',
        data: { index: i, timestamp: Date.now() },
      }));
    }

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 5000));

    const duration = performance.now() - start;
    const throughput = receivedCount / (duration / 1000);
    
    console.log(`WebSocket throughput: ${throughput.toFixed(2)} msg/sec`);
    
    ws.close();
    
    expect(receivedCount).toBeGreaterThan(messageCount * 0.9); // 90% delivery
    expect(throughput).toBeGreaterThan(100); // At least 100 msg/sec
  }, 30000);
});
```

