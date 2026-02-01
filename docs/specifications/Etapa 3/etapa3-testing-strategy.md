# CERNIQ.APP — ETAPA 3: TESTING STRATEGY
## Comprehensive Test Plan for AI Sales Agent Module
### Versiunea 1.0 | 19 Ianuarie 2026

---

# TABLE OF CONTENTS

1. [Test Overview](#1-test-overview)
2. [Coverage Requirements](#2-coverage-requirements)
3. [Unit Tests](#3-unit-tests)
4. [Integration Tests](#4-integration-tests)
5. [End-to-End Tests](#5-end-to-end-tests)
6. [Performance Tests](#6-performance-tests)
7. [AI/LLM-Specific Tests](#7-aillm-specific-tests)
8. [Security Tests](#8-security-tests)
9. [Contract Tests](#9-contract-tests)
10. [Test Data Management](#10-test-data-management)
11. [Mocking Strategies](#11-mocking-strategies)
12. [CI/CD Pipeline](#12-cicd-pipeline)
13. [Test Monitoring](#13-test-monitoring)

---

# 1. TEST OVERVIEW

## 1.1 Test Pyramid for AI Sales Agent

```
                        ╱╲
                       ╱  ╲         E2E Tests (3%)
                      ╱    ╲        - Full sales cycle
                     ╱──────╲       - Playwright + API
                    ╱        ╲
                   ╱          ╲     AI Behavior Tests (7%)
                  ╱────────────╲    - Guardrails validation
                 ╱              ╲   - Hallucination detection
                ╱                ╲
               ╱                  ╲  Integration Tests (15%)
              ╱────────────────────╲ - API + Workers + DB
             ╱                      ╲- Real dependencies
            ╱                        ╲
           ╱                          ╲ Unit Tests (75%)
          ╱────────────────────────────╲- Pure functions
         ╱                              ╲- Mocked LLM calls
        ╱────────────────────────────────╲- Vitest
```

## 1.2 Test Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | Fast unit tests, mocked LLM |
| Integration | Vitest + Testcontainers | API/DB/Queue tests |
| E2E | Playwright | Browser + WebSocket |
| Performance | k6 | Load testing, latency |
| AI Behavior | Custom Framework | Guardrails, hallucination |
| Contract | Pact | API contracts |
| Security | OWASP ZAP | Vulnerability scanning |

## 1.3 Test Scope for Etapa 3

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETAPA 3 TEST SCOPE                          │
├─────────────────────────────────────────────────────────────────┤
│ WORKERS (14 Total)                                             │
│ ├── A. Product Knowledge Management                            │
│ ├── B. Hybrid Search Engine                                    │
│ ├── C. AI Agent Core                                           │
│ ├── D. Negotiation FSM                                         │
│ ├── E. Pricing & Discount Engine                               │
│ ├── F. Stock & Inventory                                       │
│ ├── G. Oblio Integration                                       │
│ ├── H. E-Factura SPV                                           │
│ ├── I. Document Generation                                     │
│ ├── J. Handover Channel                                        │
│ ├── K. Sentiment & Intent Analysis                             │
│ ├── L. MCP Server                                              │
│ ├── M. Guardrails & Anti-Hallucination                         │
│ └── N. Human Intervention                                      │
├─────────────────────────────────────────────────────────────────┤
│ API ENDPOINTS                                                   │
│ ├── Products API                                               │
│ ├── Conversations API                                          │
│ ├── Negotiations API                                           │
│ ├── Offers API                                                 │
│ ├── Orders API                                                 │
│ ├── Fiscal Integration API                                     │
│ └── HITL Approval API                                          │
├─────────────────────────────────────────────────────────────────┤
│ FRONTEND                                                        │
│ ├── Conversation Interface                                     │
│ ├── Negotiation Dashboard                                      │
│ ├── Product Catalog Management                                 │
│ ├── Offer Builder                                              │
│ ├── Order Processing                                           │
│ ├── Fiscal Documents                                           │
│ └── HITL Review Interface                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. COVERAGE REQUIREMENTS

## 2.1 Coverage Matrix by Component

| Component | Unit | Integration | E2E | Target | Critical |
|-----------|------|-------------|-----|--------|----------|
| AI Agent Core | 90% | 85% | - | 90% | ✓ |
| Guardrails Workers | 95% | 90% | - | 95% | ✓ |
| Negotiation FSM | 95% | 90% | 80% | 95% | ✓ |
| Pricing Engine | 95% | 90% | - | 95% | ✓ |
| E-Factura/Oblio | 90% | 85% | 75% | 90% | ✓ |
| Product Knowledge | 85% | 80% | - | 85% | - |
| Hybrid Search | 85% | 80% | - | 85% | - |
| Stock & Inventory | 90% | 85% | 70% | 90% | ✓ |
| Document Generation | 85% | 80% | 70% | 85% | - |
| Handover Channel | 85% | 85% | 80% | 85% | - |
| Sentiment Analysis | 85% | 75% | - | 85% | - |
| MCP Server | 90% | 85% | - | 90% | - |
| Human Intervention | 90% | 85% | 80% | 90% | ✓ |
| API Endpoints | 90% | 90% | 80% | 90% | ✓ |
| Frontend Components | 85% | - | 80% | 85% | - |

## 2.2 Critical Path Coverage

```typescript
// test/coverage/critical-paths.ts

export const CRITICAL_PATHS = {
  // Sales completion flow
  salesCompletion: {
    minCoverage: 98,
    paths: [
      'conversation → negotiation → offer → order → invoice',
      'price_calculation → discount_validation → approval',
      'stock_check → reservation → confirmation',
    ],
  },
  
  // Guardrails - anti-hallucination
  guardrails: {
    minCoverage: 99,
    paths: [
      'llm_response → fact_extraction → database_validation',
      'product_claim → product_catalog_check → correction',
      'price_mention → price_list_validation → override',
    ],
  },
  
  // Financial integration
  fiscalIntegration: {
    minCoverage: 98,
    paths: [
      'order → proforma → anaf_validation → efactura',
      'invoice → oblio_sync → xml_generation → spv_upload',
      'payment → reconciliation → status_update',
    ],
  },
  
  // HITL approval flows
  hitlApproval: {
    minCoverage: 97,
    paths: [
      'auto_approval → threshold_check → direct_execution',
      'manual_approval → assignment → decision → execution',
      'sla_breach → escalation → notification → resolution',
    ],
  },
};
```

## 2.3 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/ai-behavior/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/mocks/**',
        '**/fixtures/**',
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
});
```

## 2.4 Test Setup

```typescript
// test/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';

// Environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:64032/cerniq_test';
process.env.REDIS_URL = 'redis://localhost:64039/15';
process.env.LLM_PROVIDER = 'mock';
process.env.ANTHROPIC_API_KEY = 'test-key';

// Global mocks
export const mockDb = mockDeep<PrismaClient>();
export const mockRedis = mockDeep<Redis>();

vi.mock('@/lib/prisma', () => ({
  prisma: mockDb,
}));

vi.mock('@/lib/redis', () => ({
  redis: mockRedis,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// LLM Mock
vi.mock('@/lib/llm', () => ({
  llm: {
    complete: vi.fn().mockResolvedValue({
      content: 'Mock LLM response',
      usage: { input_tokens: 100, output_tokens: 50 },
    }),
    stream: vi.fn(),
  },
}));

beforeEach(() => {
  mockReset(mockDb);
  mockReset(mockRedis);
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

---

# 3. UNIT TESTS

## 3.1 AI Agent Core Tests

```typescript
// tests/unit/workers/ai-agent/core.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIAgentCore } from '@/workers/ai-agent/core';
import { createMockConversation, createMockMessage } from '@test/factories';
import { mockDb, mockRedis } from '@test/setup';

describe('AIAgentCore', () => {
  let agent: AIAgentCore;
  
  beforeEach(() => {
    agent = new AIAgentCore({
      tenantId: 'tenant-123',
      conversationId: 'conv-456',
    });
  });

  describe('processMessage', () => {
    it('should classify message intent correctly', async () => {
      const message = createMockMessage({
        content: 'Vreau să cumpăr 100kg de semințe de porumb',
        direction: 'inbound',
      });

      const result = await agent.processMessage(message);

      expect(result.intent).toBe('PURCHASE_INQUIRY');
      expect(result.entities).toContainEqual({
        type: 'product',
        value: 'semințe de porumb',
        confidence: expect.any(Number),
      });
      expect(result.entities).toContainEqual({
        type: 'quantity',
        value: 100,
        unit: 'kg',
        confidence: expect.any(Number),
      });
    });

    it('should detect negotiation intent', async () => {
      const message = createMockMessage({
        content: 'Puteți face un preț mai bun la 500kg?',
        direction: 'inbound',
      });

      const result = await agent.processMessage(message);

      expect(result.intent).toBe('PRICE_NEGOTIATION');
      expect(result.negotiationSignals).toContain('discount_request');
    });

    it('should handle greeting messages', async () => {
      const message = createMockMessage({
        content: 'Bună ziua!',
        direction: 'inbound',
      });

      const result = await agent.processMessage(message);

      expect(result.intent).toBe('GREETING');
      expect(result.requiresProductInfo).toBe(false);
    });

    it('should detect urgency signals', async () => {
      const message = createMockMessage({
        content: 'Am nevoie urgent de 50 saci de îngrășământ pentru mâine',
        direction: 'inbound',
      });

      const result = await agent.processMessage(message);

      expect(result.urgency).toBe('HIGH');
      expect(result.deliveryRequirement).toBeDefined();
      expect(result.deliveryRequirement?.deadline).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('should generate response within token limits', async () => {
      const context = {
        conversation: createMockConversation(),
        message: createMockMessage({ content: 'Ce produse aveți?' }),
        intent: 'PRODUCT_INQUIRY' as const,
      };

      const response = await agent.generateResponse(context);

      expect(response.content.length).toBeLessThan(2000);
      expect(response.tokensUsed).toBeLessThan(500);
    });

    it('should include product information when requested', async () => {
      mockDb.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Semințe porumb', price: 15.00, stock: 1000 },
        { id: 'prod-2', name: 'Îngrășământ NPK', price: 45.00, stock: 500 },
      ]);

      const context = {
        conversation: createMockConversation(),
        message: createMockMessage({ content: 'Ce produse aveți în stoc?' }),
        intent: 'PRODUCT_INQUIRY' as const,
        requiresProductInfo: true,
      };

      const response = await agent.generateResponse(context);

      expect(response.content).toContain('Semințe porumb');
      expect(response.content).toContain('Îngrășământ NPK');
      expect(response.factChecked).toBe(true);
    });

    it('should respect guardrails for price claims', async () => {
      mockDb.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Semințe porumb',
        price: 15.00,
        currency: 'RON',
      });

      const context = {
        conversation: createMockConversation(),
        message: createMockMessage({ content: 'Cât costă semințele de porumb?' }),
        intent: 'PRICE_INQUIRY' as const,
      };

      const response = await agent.generateResponse(context);

      // Should only mention actual price from database
      expect(response.content).toMatch(/15[,.]00\s*RON/);
      expect(response.guardrailsPassed).toBe(true);
    });

    it('should trigger HITL for uncertain responses', async () => {
      const context = {
        conversation: createMockConversation(),
        message: createMockMessage({
          content: 'Puteți livra în Moldova la același preț?',
        }),
        intent: 'DELIVERY_INQUIRY' as const,
        confidence: 0.45, // Low confidence
      };

      const response = await agent.generateResponse(context);

      expect(response.requiresHITL).toBe(true);
      expect(response.hitlReason).toBe('LOW_CONFIDENCE');
      expect(response.suggestedHITLPriority).toBe('MEDIUM');
    });
  });

  describe('contextManagement', () => {
    it('should maintain conversation context within token limit', async () => {
      const longConversation = createMockConversation({
        messages: Array(50).fill(null).map((_, i) => createMockMessage({
          content: `Mesaj ${i} cu conținut detaliat despre produse și prețuri`,
        })),
      });

      const context = await agent.buildContext(longConversation);

      expect(context.tokenCount).toBeLessThan(8000); // Context window limit
      expect(context.messages.length).toBeLessThan(50); // Trimmed
      expect(context.hasKeyInfo).toBe(true);
    });

    it('should preserve important messages during context trimming', async () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({ content: 'Bună ziua', importance: 'low' }),
          createMockMessage({ content: 'Vreau ofertă pentru 1000kg', importance: 'high' }),
          ...Array(20).fill(null).map(() => createMockMessage({ content: 'Filler' })),
          createMockMessage({ content: 'Acceptăm prețul de 14 RON/kg', importance: 'high' }),
        ],
      });

      const context = await agent.buildContext(conversation);

      const contents = context.messages.map(m => m.content);
      expect(contents).toContain('Vreau ofertă pentru 1000kg');
      expect(contents).toContain('Acceptăm prețul de 14 RON/kg');
    });
  });
});
```

## 3.2 Negotiation FSM Tests

```typescript
// tests/unit/workers/negotiation/fsm.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NegotiationFSM, NegotiationState, NegotiationEvent } from '@/workers/negotiation/fsm';
import { createMockNegotiation } from '@test/factories';
import { mockDb } from '@test/setup';

describe('NegotiationFSM', () => {
  let fsm: NegotiationFSM;
  
  beforeEach(() => {
    fsm = new NegotiationFSM();
  });

  describe('State Transitions', () => {
    it('should transition from INITIATED to ACTIVE on first offer', () => {
      const negotiation = createMockNegotiation({
        state: 'INITIATED',
      });

      const result = fsm.transition(negotiation, {
        type: 'OFFER_CREATED',
        payload: { offerId: 'offer-123', totalValue: 5000 },
      });

      expect(result.newState).toBe('ACTIVE');
      expect(result.sideEffects).toContain('SEND_OFFER_NOTIFICATION');
    });

    it('should transition from ACTIVE to COUNTER_OFFERED on counter', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
        currentOffer: { totalValue: 5000 },
      });

      const result = fsm.transition(negotiation, {
        type: 'COUNTER_OFFER_RECEIVED',
        payload: { requestedValue: 4500, reason: 'Discount pentru volum' },
      });

      expect(result.newState).toBe('COUNTER_OFFERED');
      expect(result.metadata.counterValue).toBe(4500);
      expect(result.sideEffects).toContain('EVALUATE_COUNTER_OFFER');
    });

    it('should transition to WON on acceptance', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
      });

      const result = fsm.transition(negotiation, {
        type: 'OFFER_ACCEPTED',
        payload: { acceptedAt: new Date() },
      });

      expect(result.newState).toBe('WON');
      expect(result.sideEffects).toContain('CREATE_ORDER');
      expect(result.sideEffects).toContain('NOTIFY_SALES_REP');
    });

    it('should transition to LOST on rejection', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
      });

      const result = fsm.transition(negotiation, {
        type: 'OFFER_REJECTED',
        payload: { reason: 'Preț prea mare', canRetry: true },
      });

      expect(result.newState).toBe('LOST');
      expect(result.metadata.canRetry).toBe(true);
      expect(result.sideEffects).toContain('LOG_REJECTION_REASON');
    });

    it('should not allow invalid transitions', () => {
      const negotiation = createMockNegotiation({
        state: 'WON', // Terminal state
      });

      expect(() => {
        fsm.transition(negotiation, {
          type: 'COUNTER_OFFER_RECEIVED',
          payload: { requestedValue: 4000 },
        });
      }).toThrow('Invalid transition from WON via COUNTER_OFFER_RECEIVED');
    });

    it('should handle HITL_REQUIRED transition', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
      });

      const result = fsm.transition(negotiation, {
        type: 'HITL_TRIGGERED',
        payload: { reason: 'HIGH_VALUE_DISCOUNT', discountPercent: 25 },
      });

      expect(result.newState).toBe('PENDING_APPROVAL');
      expect(result.sideEffects).toContain('CREATE_HITL_TASK');
      expect(result.metadata.blockedUntilApproval).toBe(true);
    });
  });

  describe('State Guards', () => {
    it('should enforce minimum offer value', () => {
      const negotiation = createMockNegotiation({
        state: 'INITIATED',
        minimumOrderValue: 500,
      });

      expect(() => {
        fsm.transition(negotiation, {
          type: 'OFFER_CREATED',
          payload: { offerId: 'offer-123', totalValue: 100 }, // Below minimum
        });
      }).toThrow('Order value below minimum threshold');
    });

    it('should enforce maximum discount percentage', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
        maxAutoDiscount: 15,
      });

      const result = fsm.transition(negotiation, {
        type: 'DISCOUNT_REQUESTED',
        payload: { discountPercent: 20 },
      });

      expect(result.newState).toBe('PENDING_APPROVAL');
      expect(result.sideEffects).toContain('CREATE_HITL_TASK');
    });

    it('should allow auto-approval within threshold', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
        maxAutoDiscount: 15,
      });

      const result = fsm.transition(negotiation, {
        type: 'DISCOUNT_REQUESTED',
        payload: { discountPercent: 10 },
      });

      expect(result.newState).toBe('ACTIVE'); // Stays in ACTIVE
      expect(result.sideEffects).toContain('APPLY_DISCOUNT');
      expect(result.sideEffects).not.toContain('CREATE_HITL_TASK');
    });
  });

  describe('Timeout Handling', () => {
    it('should transition to STALE after inactivity', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
        lastActivityAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72h ago
      });

      const result = fsm.checkTimeout(negotiation);

      expect(result.shouldTransition).toBe(true);
      expect(result.newState).toBe('STALE');
      expect(result.sideEffects).toContain('SEND_REACTIVATION_REMINDER');
    });

    it('should not timeout within grace period', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
        lastActivityAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h ago
      });

      const result = fsm.checkTimeout(negotiation);

      expect(result.shouldTransition).toBe(false);
    });

    it('should expire PENDING_APPROVAL after SLA breach', () => {
      const negotiation = createMockNegotiation({
        state: 'PENDING_APPROVAL',
        approvalRequestedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8h ago
        approvalSLA: 4 * 60 * 60 * 1000, // 4h SLA
      });

      const result = fsm.checkTimeout(negotiation);

      expect(result.shouldTransition).toBe(true);
      expect(result.newState).toBe('ESCALATED');
      expect(result.sideEffects).toContain('ESCALATE_APPROVAL');
    });
  });

  describe('History Tracking', () => {
    it('should record all state transitions', () => {
      const negotiation = createMockNegotiation({
        state: 'INITIATED',
        history: [],
      });

      const result = fsm.transition(negotiation, {
        type: 'OFFER_CREATED',
        payload: { offerId: 'offer-123', totalValue: 5000 },
      });

      expect(result.historyEntry).toEqual({
        fromState: 'INITIATED',
        toState: 'ACTIVE',
        event: 'OFFER_CREATED',
        timestamp: expect.any(Date),
        metadata: expect.any(Object),
      });
    });

    it('should calculate time in each state', () => {
      const negotiation = createMockNegotiation({
        state: 'ACTIVE',
        history: [
          { fromState: 'INITIATED', toState: 'ACTIVE', timestamp: new Date('2026-01-15T10:00:00') },
        ],
        currentStateEnteredAt: new Date('2026-01-15T10:00:00'),
      });

      vi.setSystemTime(new Date('2026-01-15T14:00:00'));

      const metrics = fsm.calculateStateMetrics(negotiation);

      expect(metrics.ACTIVE.totalTime).toBe(4 * 60 * 60 * 1000); // 4 hours
    });
  });
});
```

## 3.3 Pricing Engine Tests

```typescript
// tests/unit/workers/pricing/engine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingEngine } from '@/workers/pricing/engine';
import { createMockProduct, createMockCustomer, createMockOffer } from '@test/factories';
import { mockDb } from '@test/setup';

describe('PricingEngine', () => {
  let engine: PricingEngine;
  
  beforeEach(() => {
    engine = new PricingEngine({
      tenantId: 'tenant-123',
    });
  });

  describe('calculatePrice', () => {
    it('should return base price for standard order', async () => {
      const product = createMockProduct({
        basePrice: 100,
        currency: 'RON',
        unit: 'kg',
      });

      const result = await engine.calculatePrice({
        product,
        quantity: 10,
      });

      expect(result.unitPrice).toBe(100);
      expect(result.totalPrice).toBe(1000);
      expect(result.currency).toBe('RON');
    });

    it('should apply volume discount', async () => {
      const product = createMockProduct({
        basePrice: 100,
        volumeDiscounts: [
          { minQuantity: 100, discountPercent: 5 },
          { minQuantity: 500, discountPercent: 10 },
          { minQuantity: 1000, discountPercent: 15 },
        ],
      });

      const result = await engine.calculatePrice({
        product,
        quantity: 600,
      });

      expect(result.discounts).toContainEqual({
        type: 'VOLUME',
        percent: 10,
        reason: 'Discount volum 500+ unități',
      });
      expect(result.unitPrice).toBe(90); // 10% off
      expect(result.totalPrice).toBe(54000); // 600 * 90
    });

    it('should apply customer-specific discount', async () => {
      const product = createMockProduct({ basePrice: 100 });
      const customer = createMockCustomer({
        tier: 'GOLD',
        customDiscounts: {
          'prod-category-seeds': 8, // 8% on seeds
        },
      });

      mockDb.customerDiscount.findFirst.mockResolvedValue({
        productCategory: 'seeds',
        discountPercent: 8,
      });

      const result = await engine.calculatePrice({
        product: { ...product, category: 'seeds' },
        quantity: 10,
        customer,
      });

      expect(result.discounts).toContainEqual({
        type: 'CUSTOMER_TIER',
        percent: 8,
        reason: 'Discount client Gold pentru semințe',
      });
      expect(result.unitPrice).toBe(92);
    });

    it('should stack compatible discounts', async () => {
      const product = createMockProduct({
        basePrice: 100,
        volumeDiscounts: [{ minQuantity: 100, discountPercent: 10 }],
      });
      const customer = createMockCustomer({
        tier: 'GOLD',
        tierDiscount: 5,
      });

      const result = await engine.calculatePrice({
        product,
        quantity: 200,
        customer,
        stackDiscounts: true,
      });

      // 10% volume + 5% tier = 15% total
      expect(result.totalDiscountPercent).toBe(15);
      expect(result.unitPrice).toBe(85);
    });

    it('should respect maximum discount cap', async () => {
      const product = createMockProduct({
        basePrice: 100,
        maxDiscountPercent: 20,
        volumeDiscounts: [{ minQuantity: 100, discountPercent: 15 }],
      });
      const customer = createMockCustomer({
        tier: 'GOLD',
        tierDiscount: 10,
      });

      const result = await engine.calculatePrice({
        product,
        quantity: 200,
        customer,
        stackDiscounts: true,
      });

      // Would be 25% but capped at 20%
      expect(result.totalDiscountPercent).toBe(20);
      expect(result.cappedDiscount).toBe(true);
      expect(result.unitPrice).toBe(80);
    });

    it('should apply seasonal promotion', async () => {
      vi.setSystemTime(new Date('2026-03-15')); // Spring planting season

      const product = createMockProduct({
        basePrice: 100,
        seasonalPromotions: [{
          name: 'Promoție Primăvară',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-04-30'),
          discountPercent: 12,
        }],
      });

      const result = await engine.calculatePrice({
        product,
        quantity: 10,
      });

      expect(result.discounts).toContainEqual({
        type: 'SEASONAL',
        percent: 12,
        reason: 'Promoție Primăvară',
      });
    });
  });

  describe('validateDiscount', () => {
    it('should approve discount within auto-approval threshold', async () => {
      const result = await engine.validateDiscount({
        discountPercent: 10,
        autoApprovalThreshold: 15,
        orderValue: 5000,
      });

      expect(result.approved).toBe(true);
      expect(result.requiresHITL).toBe(false);
    });

    it('should require HITL for discount above threshold', async () => {
      const result = await engine.validateDiscount({
        discountPercent: 20,
        autoApprovalThreshold: 15,
        orderValue: 5000,
      });

      expect(result.approved).toBe(false);
      expect(result.requiresHITL).toBe(true);
      expect(result.hitlPriority).toBe('HIGH');
    });

    it('should require HITL for high-value orders', async () => {
      const result = await engine.validateDiscount({
        discountPercent: 10,
        autoApprovalThreshold: 15,
        orderValue: 100000, // High value
        highValueThreshold: 50000,
      });

      expect(result.requiresHITL).toBe(true);
      expect(result.hitlReason).toBe('HIGH_ORDER_VALUE');
    });
  });

  describe('generateQuote', () => {
    it('should generate complete quote with all line items', async () => {
      const items = [
        { productId: 'prod-1', quantity: 100 },
        { productId: 'prod-2', quantity: 50 },
      ];

      mockDb.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'prod-1', name: 'Semințe', basePrice: 50 }),
        createMockProduct({ id: 'prod-2', name: 'Îngrășământ', basePrice: 80 }),
      ]);

      const quote = await engine.generateQuote({
        items,
        validityDays: 7,
      });

      expect(quote.lineItems).toHaveLength(2);
      expect(quote.subtotal).toBe(5000 + 4000); // 100*50 + 50*80
      expect(quote.validUntil).toBeDefined();
      expect(quote.quoteNumber).toMatch(/^QT-\d{6}$/);
    });

    it('should apply order-level discount to quote', async () => {
      const items = [
        { productId: 'prod-1', quantity: 100 },
      ];

      mockDb.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'prod-1', basePrice: 100 }),
      ]);

      const quote = await engine.generateQuote({
        items,
        orderDiscount: 5, // 5% order-level discount
      });

      expect(quote.subtotal).toBe(10000);
      expect(quote.orderDiscount).toBe(500);
      expect(quote.total).toBe(9500);
    });

    it('should calculate VAT correctly', async () => {
      const items = [{ productId: 'prod-1', quantity: 100 }];

      mockDb.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'prod-1', basePrice: 100, vatRate: 19 }),
      ]);

      const quote = await engine.generateQuote({
        items,
        includeVAT: true,
      });

      expect(quote.subtotal).toBe(10000);
      expect(quote.vatAmount).toBe(1900); // 19%
      expect(quote.total).toBe(11900);
    });
  });
});
```

## 3.4 Guardrails Tests

```typescript
// tests/unit/workers/guardrails/anti-hallucination.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AntiHallucinationGuardrail } from '@/workers/guardrails/anti-hallucination';
import { mockDb } from '@test/setup';

describe('AntiHallucinationGuardrail', () => {
  let guardrail: AntiHallucinationGuardrail;
  
  beforeEach(() => {
    guardrail = new AntiHallucinationGuardrail({
      tenantId: 'tenant-123',
    });
  });

  describe('validateProductClaims', () => {
    it('should pass for accurate product information', async () => {
      mockDb.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Semințe porumb Pioneer P9911',
        price: 850,
        stock: 500,
        specifications: {
          yield: '12-14 tone/ha',
          maturity: '115-120 zile',
        },
      });

      const response = 'Semințele Pioneer P9911 costă 850 RON și au un randament de 12-14 tone/ha.';

      const result = await guardrail.validateProductClaims(response);

      expect(result.valid).toBe(true);
      expect(result.corrections).toHaveLength(0);
    });

    it('should detect incorrect price claim', async () => {
      mockDb.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Semințe porumb Pioneer P9911',
        price: 850,
      });

      const response = 'Semințele Pioneer P9911 costă doar 650 RON.'; // Wrong price

      const result = await guardrail.validateProductClaims(response);

      expect(result.valid).toBe(false);
      expect(result.corrections).toContainEqual({
        type: 'PRICE_MISMATCH',
        claimed: 650,
        actual: 850,
        product: 'Semințe porumb Pioneer P9911',
        severity: 'HIGH',
      });
    });

    it('should detect fabricated product', async () => {
      mockDb.product.findUnique.mockResolvedValue(null);
      mockDb.product.findMany.mockResolvedValue([]); // No similar products

      const response = 'Avem în stoc semințele SuperYield XL500 la 900 RON.';

      const result = await guardrail.validateProductClaims(response);

      expect(result.valid).toBe(false);
      expect(result.corrections).toContainEqual({
        type: 'PRODUCT_NOT_FOUND',
        claimed: 'SuperYield XL500',
        severity: 'CRITICAL',
      });
    });

    it('should detect incorrect stock claim', async () => {
      mockDb.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Semințe porumb',
        stock: 50, // Only 50 in stock
      });

      const response = 'Avem peste 500 unități în stoc, suficient pentru orice comandă.';

      const result = await guardrail.validateProductClaims(response);

      expect(result.valid).toBe(false);
      expect(result.corrections).toContainEqual({
        type: 'STOCK_MISMATCH',
        claimed: '>500',
        actual: 50,
        severity: 'MEDIUM',
      });
    });

    it('should detect incorrect specification claim', async () => {
      mockDb.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Semințe porumb Pioneer',
        specifications: {
          yield: '12-14 tone/ha',
        },
      });

      const response = 'Aceste semințe oferă un randament de 18-20 tone/ha.'; // Wrong yield

      const result = await guardrail.validateProductClaims(response);

      expect(result.valid).toBe(false);
      expect(result.corrections).toContainEqual({
        type: 'SPEC_MISMATCH',
        field: 'yield',
        claimed: '18-20 tone/ha',
        actual: '12-14 tone/ha',
        severity: 'HIGH',
      });
    });
  });

  describe('validatePriceClaims', () => {
    it('should detect discount beyond policy', async () => {
      mockDb.pricingPolicy.findFirst.mockResolvedValue({
        maxAutoDiscount: 15,
      });

      const response = 'Vă putem oferi un discount special de 25%.';

      const result = await guardrail.validatePriceClaims(response, {
        customerId: 'cust-123',
        orderValue: 5000,
      });

      expect(result.valid).toBe(false);
      expect(result.corrections).toContainEqual({
        type: 'DISCOUNT_POLICY_VIOLATION',
        claimed: 25,
        maxAllowed: 15,
        severity: 'HIGH',
      });
    });

    it('should allow discount within policy', async () => {
      mockDb.pricingPolicy.findFirst.mockResolvedValue({
        maxAutoDiscount: 15,
      });

      const response = 'Putem aplica un discount de 10% pentru această comandă.';

      const result = await guardrail.validatePriceClaims(response, {
        customerId: 'cust-123',
        orderValue: 5000,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('validateDeliveryClaims', () => {
    it('should detect unrealistic delivery promise', async () => {
      mockDb.deliveryPolicy.findFirst.mockResolvedValue({
        minDeliveryDays: 3,
        expressAvailable: false,
      });

      const response = 'Putem livra mâine dimineață garantat.';

      const result = await guardrail.validateDeliveryClaims(response);

      expect(result.valid).toBe(false);
      expect(result.corrections).toContainEqual({
        type: 'DELIVERY_PROMISE_VIOLATION',
        claimed: '1 day',
        minPossible: '3 days',
        severity: 'MEDIUM',
      });
    });

    it('should validate against shipping zones', async () => {
      mockDb.shippingZone.findFirst.mockResolvedValue({
        zone: 'zone-moldova',
        minDeliveryDays: 5,
        maxDeliveryDays: 7,
      });

      const response = 'Pentru Iași, livrarea durează 2-3 zile.';

      const result = await guardrail.validateDeliveryClaims(response, {
        destination: 'Iași',
      });

      expect(result.valid).toBe(false);
      expect(result.corrections).toContainEqual({
        type: 'ZONE_DELIVERY_MISMATCH',
        claimed: '2-3 zile',
        actual: '5-7 zile',
        zone: 'Moldova',
        severity: 'MEDIUM',
      });
    });
  });

  describe('correctResponse', () => {
    it('should generate corrected response for price error', async () => {
      const originalResponse = 'Semințele costă 650 RON per sac.';
      const corrections = [{
        type: 'PRICE_MISMATCH',
        claimed: 650,
        actual: 850,
        product: 'Semințe porumb',
      }];

      const corrected = await guardrail.correctResponse(originalResponse, corrections);

      expect(corrected).toContain('850 RON');
      expect(corrected).not.toContain('650 RON');
    });

    it('should remove fabricated product claims', async () => {
      const originalResponse = 'Vă recomand produsul FakeProduct XL care este excelent.';
      const corrections = [{
        type: 'PRODUCT_NOT_FOUND',
        claimed: 'FakeProduct XL',
        severity: 'CRITICAL',
      }];

      const corrected = await guardrail.correctResponse(originalResponse, corrections);

      expect(corrected).not.toContain('FakeProduct XL');
      expect(corrected).toMatch(/nu am găsit|verificați|contactați/i);
    });

    it('should flag response for HITL if too many corrections', async () => {
      const originalResponse = 'Multiple wrong claims here.';
      const corrections = [
        { type: 'PRICE_MISMATCH', severity: 'HIGH' },
        { type: 'STOCK_MISMATCH', severity: 'MEDIUM' },
        { type: 'SPEC_MISMATCH', severity: 'HIGH' },
        { type: 'DELIVERY_PROMISE_VIOLATION', severity: 'MEDIUM' },
      ];

      const result = await guardrail.correctResponse(originalResponse, corrections);

      expect(result.requiresHITL).toBe(true);
      expect(result.hitlReason).toBe('EXCESSIVE_CORRECTIONS');
    });
  });
});
```

## 3.5 Document Generation Tests

```typescript
// tests/unit/workers/document-generation/templates.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentGenerator } from '@/workers/document-generation/generator';
import { createMockOffer, createMockOrder, createMockCustomer } from '@test/factories';

describe('DocumentGenerator', () => {
  let generator: DocumentGenerator;
  
  beforeEach(() => {
    generator = new DocumentGenerator({
      tenantId: 'tenant-123',
      templatesPath: './templates',
    });
  });

  describe('generateOffer', () => {
    it('should generate offer PDF with correct data', async () => {
      const offer = createMockOffer({
        offerNumber: 'OF-2026-001234',
        items: [
          { product: 'Semințe', quantity: 100, unitPrice: 50, total: 5000 },
          { product: 'Îngrășământ', quantity: 50, unitPrice: 80, total: 4000 },
        ],
        subtotal: 9000,
        vatAmount: 1710,
        total: 10710,
        validUntil: new Date('2026-02-01'),
      });

      const customer = createMockCustomer({
        name: 'SC Agro SRL',
        cui: 'RO12345678',
      });

      const result = await generator.generateOffer(offer, customer);

      expect(result.filename).toBe('oferta-OF-2026-001234.pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(result.size).toBeGreaterThan(0);
      expect(result.metadata.documentType).toBe('OFFER');
      expect(result.metadata.totalValue).toBe(10710);
    });

    it('should include all required legal fields', async () => {
      const offer = createMockOffer();
      const customer = createMockCustomer();

      const result = await generator.generateOffer(offer, customer);

      // Verify content includes required fields
      const content = await generator.extractText(result.buffer);
      
      expect(content).toContain('CUI'); // Tax ID
      expect(content).toContain('IBAN'); // Bank account
      expect(content).toContain('valabilitate'); // Validity period
      expect(content).toContain('TVA'); // VAT
    });
  });

  describe('generateProforma', () => {
    it('should generate proforma invoice', async () => {
      const order = createMockOrder({
        orderNumber: 'CMD-2026-001234',
        status: 'CONFIRMED',
      });

      const result = await generator.generateProforma(order);

      expect(result.filename).toMatch(/proforma.*CMD-2026-001234/);
      expect(result.metadata.documentType).toBe('PROFORMA');
    });

    it('should include payment instructions', async () => {
      const order = createMockOrder({
        paymentTerms: 'NET_30',
      });

      const result = await generator.generateProforma(order);
      const content = await generator.extractText(result.buffer);

      expect(content).toContain('30 zile');
      expect(content).toContain('IBAN');
    });
  });

  describe('generateInvoice', () => {
    it('should generate e-factura compliant invoice', async () => {
      const order = createMockOrder({
        invoiceNumber: 'FC-2026-001234',
        items: [
          { product: 'Semințe', quantity: 100, unitPrice: 50, vatRate: 19 },
        ],
      });

      const result = await generator.generateInvoice(order, {
        format: 'UBL',
        includeXML: true,
      });

      expect(result.pdf).toBeDefined();
      expect(result.xml).toBeDefined();
      expect(result.xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
    });

    it('should validate e-factura XML schema', async () => {
      const order = createMockOrder();

      const result = await generator.generateInvoice(order, {
        format: 'UBL',
        includeXML: true,
        validate: true,
      });

      expect(result.validation.valid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
    });

    it('should include mandatory ANAF fields', async () => {
      const order = createMockOrder({
        customer: {
          cui: 'RO12345678',
          regCom: 'J40/1234/2020',
          address: 'Str. Test 123, București',
        },
      });

      const result = await generator.generateInvoice(order, { format: 'UBL' });
      
      expect(result.xml).toContain('RO12345678'); // CUI
      expect(result.xml).toContain('J40/1234/2020'); // Reg. Com.
    });
  });

  describe('template rendering', () => {
    it('should render Romanian date format', async () => {
      const offer = createMockOffer({
        createdAt: new Date('2026-01-15'),
      });

      const result = await generator.generateOffer(offer, createMockCustomer());
      const content = await generator.extractText(result.buffer);

      expect(content).toMatch(/15\s+(ianuarie|ian\.?)\s+2026/i);
    });

    it('should format currency correctly', async () => {
      const offer = createMockOffer({
        total: 12345.67,
        currency: 'RON',
      });

      const result = await generator.generateOffer(offer, createMockCustomer());
      const content = await generator.extractText(result.buffer);

      expect(content).toMatch(/12[.,]345[.,]67\s*RON/);
    });

    it('should handle multi-page documents', async () => {
      const offer = createMockOffer({
        items: Array(50).fill(null).map((_, i) => ({
          product: `Produs ${i + 1}`,
          quantity: 100,
          unitPrice: 50,
          total: 5000,
        })),
      });

      const result = await generator.generateOffer(offer, createMockCustomer());

      expect(result.metadata.pageCount).toBeGreaterThan(1);
    });
  });
});
```

---

