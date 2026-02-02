# Etapa 3 - Workers I: Document Generation & Multi-Channel Delivery

## Document Control
| Metadata | Value |
|----------|-------|
| Document ID | CERNIQ-E3-WORKERS-I |
| Version | 2.0.0 |
| Status | NORMATIV |
| Classification | Internal Use |
| Created | 2026-01-18 |
| Last Updated | 2026-02-01 |
| Author | Cerniq Development Team |
| Reviewers | Technical Lead, DevOps |
| Related Documents | Master Spec, Workers Overview, Schema Negotiations |
| Sprint Plan | E3.S7.PR27, E3.S7.PR28 (vezi [etapa3-sprint-plan.md](etapa3-sprint-plan.md)) |
| Phase | F3.10 Document Generation |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Worker I1: PDF Document Generator](#2-worker-i1-pdf-document-generator)
3. [Worker I2: Email Delivery Service](#3-worker-i2-email-delivery-service)
4. [Worker I3: WhatsApp Business Delivery](#4-worker-i3-whatsapp-business-delivery)
5. [Template System](#5-template-system)
6. [Multi-Channel Orchestration](#6-multi-channel-orchestration)
7. [Error Handling & Retry](#7-error-handling-retry)
8. [Monitoring & Alerts](#8-monitoring-alerts)
9. [Queue Configuration](#9-queue-configuration)
10. [Testing Specification](#10-testing-specification)

---

## 1. Overview

### 1.1 Purpose

Workers I handle document generation and multi-channel delivery for the AI Sales Agent system. This group generates professional PDF documents (offers, invoices, contracts) and delivers them through email and WhatsApp Business channels, ensuring consistent branding and tracking delivery status.

### 1.2 Worker Summary

| Worker ID | Name | Purpose | Priority | SLA |
|-----------|------|---------|----------|-----|
| I1 | pdf-generate | Generate PDF documents from templates | High | < 30s |
| I2 | email-send | Send emails via SMTP/SES | High | < 10s |
| I3 | whatsapp-send | Send WhatsApp Business messages | High | < 15s |

### 1.3 Dependencies

```
External Services:
├── Puppeteer/Chromium (PDF generation)
├── AWS SES / SendGrid (Email delivery)
├── WhatsApp Business API (Meta Cloud API)
└── S3/MinIO (Document storage)

Internal Dependencies:
├── negotiations table (source data)
├── offers table (offer details)
├── invoices table (invoice data)
├── products table (product catalog)
├── contacts_gold table (recipient info)
└── templates table (document templates)

Workers I depends on:
├── Worker D (Negotiation FSM) - triggers document generation
├── Worker E (Pricing) - provides pricing data
├── Worker G (Oblio) - invoice data for PDF
└── Worker H (e-Factura) - fiscal document status
```

### 1.4 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT GENERATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Negotiation FSM ──► Trigger ──► PDF Generator ──┬──► Email Service     │
│       (D4)                          (I1)         │        (I2)          │
│                                                  │                       │
│                                                  └──► WhatsApp Service   │
│                                                          (I3)           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    TEMPLATE RESOLUTION                           │    │
│  │                                                                  │    │
│  │   Request ──► Template Selector ──► Template Engine ──► Output  │    │
│  │                    │                      │                      │    │
│  │                    ▼                      ▼                      │    │
│  │              tenant_config           Handlebars                  │    │
│  │              document_type           + Custom Helpers            │    │
│  │              language                + i18n                      │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    DELIVERY ORCHESTRATION                        │    │
│  │                                                                  │    │
│  │   PDF Ready ──► Channel Selector ──┬──► Primary Channel         │    │
│  │                      │             │        (email/whatsapp)    │    │
│  │                      │             │                             │    │
│  │                      │             └──► Fallback Channel         │    │
│  │                      │                      (if primary fails)   │    │
│  │                      ▼                                           │    │
│  │               contact_preferences                                │    │
│  │               channel_availability                               │    │
│  │               business_rules                                     │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Worker I1: PDF Document Generator

### 2.1 Configuration

```typescript
// src/workers/etapa3/document-generation/pdf-generate.config.ts

import { QueueOptions, WorkerOptions } from 'bullmq';

export const PDF_GENERATE_QUEUE_NAME = 'etapa3:document:pdf:generate';

export const PDF_GENERATE_QUEUE_CONFIG: QueueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,
      count: 5000
    },
    removeOnFail: {
      age: 30 * 24 * 3600
    }
  }
};

export const PDF_GENERATE_WORKER_CONFIG: WorkerOptions = {
  concurrency: 5, // Limited by Chromium instances
  limiter: {
    max: 20,
    duration: 60000 // 20 PDFs per minute
  },
  lockDuration: 120000 // 2 minutes for complex documents
};

export const PDF_CONFIG = {
  // Chromium settings
  chromium: {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none'
    ]
  },
  
  // PDF generation settings
  pdf: {
    format: 'A4',
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    printBackground: true,
    displayHeaderFooter: true,
    preferCSSPageSize: true
  },
  
  // Storage settings
  storage: {
    bucket: process.env.DOCUMENTS_BUCKET || 'cerniq-documents',
    prefix: 'generated/',
    presignedUrlExpiry: 7 * 24 * 3600 // 7 days
  },
  
  // Timeouts
  timeouts: {
    pageLoad: 30000,
    pdfGeneration: 60000,
    upload: 30000
  },
  
  // Document types
  documentTypes: {
    OFFER: {
      template: 'offer',
      watermark: false,
      headerFooter: true
    },
    PROFORMA: {
      template: 'proforma',
      watermark: false,
      headerFooter: true
    },
    INVOICE: {
      template: 'invoice',
      watermark: false,
      headerFooter: true
    },
    CONTRACT: {
      template: 'contract',
      watermark: true,
      headerFooter: true,
      requiresSignature: true
    },
    QUOTE: {
      template: 'quote',
      watermark: false,
      headerFooter: true,
      validityDays: 30
    }
  }
} as const;

// Document type enum
export enum DocumentType {
  OFFER = 'OFFER',
  PROFORMA = 'PROFORMA',
  INVOICE = 'INVOICE',
  CONTRACT = 'CONTRACT',
  QUOTE = 'QUOTE'
}

// PDF generation job interface
export interface PdfGenerateJobData {
  tenantId: string;
  documentType: DocumentType;
  sourceId: string; // negotiation_id, offer_id, or invoice_id
  sourceType: 'negotiation' | 'offer' | 'invoice';
  templateOverride?: string;
  language?: 'ro' | 'en';
  metadata?: {
    contactId?: string;
    requestedBy?: string;
    deliveryChannels?: ('email' | 'whatsapp')[];
    customFields?: Record<string, unknown>;
  };
}

export interface PdfGenerateResult {
  documentId: string;
  filename: string;
  storagePath: string;
  storageUrl: string;
  presignedUrl: string;
  presignedUrlExpiry: Date;
  sizeBytes: number;
  pageCount: number;
  generationTimeMs: number;
  checksum: string;
}
```

### 2.2 Worker Implementation

```typescript
// src/workers/etapa3/document-generation/pdf-generate.worker.ts

import { Worker, Job, DelayedError } from 'bullmq';
import puppeteer, { Browser, Page } from 'puppeteer';
import Handlebars from 'handlebars';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { promisify } from 'util';
import * as pdfLib from 'pdf-lib';

import {
  PDF_GENERATE_QUEUE_NAME,
  PDF_GENERATE_WORKER_CONFIG,
  PDF_CONFIG,
  PdfGenerateJobData,
  PdfGenerateResult,
  DocumentType
} from './pdf-generate.config';
import { getRedisConnection } from '@/lib/redis';
import { db } from '@/db';
import { 
  negotiations, 
  offers, 
  invoices, 
  products, 
  contactsGold,
  documentTemplates,
  generatedDocuments
} from '@/db/schema/etapa3';
import { eq, and } from 'drizzle-orm';
import { pdfGenerateMetrics } from './pdf-generate.metrics';
import { createDocumentLogger } from './document.logger';

const logger = createDocumentLogger('pdf-generate');

// Browser pool for concurrent PDF generation
class BrowserPool {
  private browsers: Browser[] = [];
  private available: Browser[] = [];
  private maxBrowsers: number;
  private creating: boolean = false;

  constructor(maxBrowsers: number = 3) {
    this.maxBrowsers = maxBrowsers;
  }

  async acquire(): Promise<Browser> {
    // Return available browser
    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    // Create new browser if under limit
    if (this.browsers.length < this.maxBrowsers && !this.creating) {
      this.creating = true;
      try {
        const browser = await puppeteer.launch({
          executablePath: PDF_CONFIG.chromium.executablePath,
          headless: true,
          args: PDF_CONFIG.chromium.args
        });
        this.browsers.push(browser);
        return browser;
      } finally {
        this.creating = false;
      }
    }

    // Wait for available browser
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.available.length > 0) {
          clearInterval(checkInterval);
          resolve(this.available.pop()!);
        }
      }, 100);
    });
  }

  release(browser: Browser): void {
    if (browser.isConnected()) {
      this.available.push(browser);
    } else {
      this.browsers = this.browsers.filter(b => b !== browser);
    }
  }

  async shutdown(): Promise<void> {
    for (const browser of this.browsers) {
      await browser.close();
    }
    this.browsers = [];
    this.available = [];
  }
}

const browserPool = new BrowserPool(PDF_GENERATE_WORKER_CONFIG.concurrency);

// S3 client
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!
  },
  forcePathStyle: true // For MinIO compatibility
});

// Handlebars helpers registration
function registerHandlebarsHelpers(): void {
  // Format currency
  Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'RON') => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency
    }).format(amount);
  });

  // Format date
  Handlebars.registerHelper('formatDate', (date: Date | string, format: string = 'long') => {
    const d = new Date(date);
    if (format === 'short') {
      return d.toLocaleDateString('ro-RO');
    }
    return d.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Format number
  Handlebars.registerHelper('formatNumber', (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  });

  // Conditional helper
  Handlebars.registerHelper('ifEquals', function(this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  });

  // Index helper for loops
  Handlebars.registerHelper('addOne', (index: number) => index + 1);

  // VAT calculation
  Handlebars.registerHelper('calculateVat', (amount: number, vatRate: number) => {
    return (amount * vatRate / 100).toFixed(2);
  });

  // Total with VAT
  Handlebars.registerHelper('totalWithVat', (amount: number, vatRate: number) => {
    return (amount * (1 + vatRate / 100)).toFixed(2);
  });

  // Romanian CIF format
  Handlebars.registerHelper('formatCif', (cif: string) => {
    if (!cif) return '';
    // Add RO prefix if not present
    if (!cif.startsWith('RO')) {
      return `RO${cif}`;
    }
    return cif;
  });

  // IBAN format (groups of 4)
  Handlebars.registerHelper('formatIban', (iban: string) => {
    if (!iban) return '';
    return iban.replace(/(.{4})/g, '$1 ').trim();
  });
}

registerHandlebarsHelpers();

// Template loader and compiler
class TemplateEngine {
  private compiledTemplates: Map<string, Handlebars.TemplateDelegate> = new Map();

  async loadTemplate(
    tenantId: string,
    documentType: DocumentType,
    language: string = 'ro'
  ): Promise<Handlebars.TemplateDelegate> {
    const cacheKey = `${tenantId}:${documentType}:${language}`;
    
    if (this.compiledTemplates.has(cacheKey)) {
      return this.compiledTemplates.get(cacheKey)!;
    }

    // Load template from database
    const [template] = await db
      .select()
      .from(documentTemplates)
      .where(
        and(
          eq(documentTemplates.tenantId, tenantId),
          eq(documentTemplates.documentType, documentType),
          eq(documentTemplates.language, language),
          eq(documentTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      // Fall back to default template
      const [defaultTemplate] = await db
        .select()
        .from(documentTemplates)
        .where(
          and(
            eq(documentTemplates.tenantId, 'default'),
            eq(documentTemplates.documentType, documentType),
            eq(documentTemplates.language, language),
            eq(documentTemplates.isActive, true)
          )
        )
        .limit(1);

      if (!defaultTemplate) {
        throw new Error(`No template found for ${documentType} in ${language}`);
      }

      const compiled = Handlebars.compile(defaultTemplate.htmlContent);
      this.compiledTemplates.set(cacheKey, compiled);
      return compiled;
    }

    const compiled = Handlebars.compile(template.htmlContent);
    this.compiledTemplates.set(cacheKey, compiled);
    return compiled;
  }

  clearCache(tenantId?: string): void {
    if (tenantId) {
      for (const key of this.compiledTemplates.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          this.compiledTemplates.delete(key);
        }
      }
    } else {
      this.compiledTemplates.clear();
    }
  }
}

const templateEngine = new TemplateEngine();

// Data fetchers for different source types
async function fetchOfferData(
  tenantId: string, 
  offerId: string
): Promise<Record<string, unknown>> {
  const [offer] = await db
    .select({
      offer: offers,
      negotiation: negotiations,
      contact: contactsGold
    })
    .from(offers)
    .innerJoin(negotiations, eq(offers.negotiationId, negotiations.id))
    .innerJoin(contactsGold, eq(negotiations.contactId, contactsGold.id))
    .where(
      and(
        eq(offers.id, offerId),
        eq(offers.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!offer) {
    throw new Error(`Offer not found: ${offerId}`);
  }

  // Fetch line items with product details
  const lineItems = await db
    .select({
      lineItem: offerLineItems,
      product: products
    })
    .from(offerLineItems)
    .innerJoin(products, eq(offerLineItems.productId, products.id))
    .where(eq(offerLineItems.offerId, offerId));

  // Build document data
  return {
    documentNumber: offer.offer.offerNumber,
    documentDate: offer.offer.createdAt,
    validUntil: offer.offer.validUntil,
    
    supplier: {
      companyName: process.env.COMPANY_NAME || 'Cerniq SRL',
      cui: process.env.COMPANY_CUI || 'RO12345678',
      regCom: process.env.COMPANY_REG_COM || 'J40/1234/2020',
      address: process.env.COMPANY_ADDRESS || 'Str. Exemplu nr. 1, București',
      phone: process.env.COMPANY_PHONE || '+40 21 123 4567',
      email: process.env.COMPANY_EMAIL || 'office@cerniq.ro',
      iban: process.env.COMPANY_IBAN || 'RO12BANK1234567890123456',
      bank: process.env.COMPANY_BANK || 'Banca Transilvania'
    },
    
    customer: {
      companyName: offer.contact.companyName,
      cui: offer.contact.cui,
      regCom: offer.contact.regCom,
      address: formatAddress(offer.contact),
      phone: offer.contact.phone,
      email: offer.contact.email,
      contactPerson: offer.contact.contactPerson
    },
    
    items: lineItems.map((item, index) => ({
      nr: index + 1,
      productCode: item.product.sku,
      productName: item.product.name,
      description: item.lineItem.description || item.product.description,
      unit: item.product.unit,
      quantity: item.lineItem.quantity,
      unitPrice: item.lineItem.unitPrice,
      discount: item.lineItem.discountPercent || 0,
      discountedPrice: item.lineItem.discountedPrice,
      vatRate: item.lineItem.vatRate,
      totalWithoutVat: item.lineItem.totalWithoutVat,
      vatAmount: item.lineItem.vatAmount,
      totalWithVat: item.lineItem.totalWithVat
    })),
    
    totals: {
      subtotal: offer.offer.subtotal,
      totalDiscount: offer.offer.totalDiscount,
      totalWithoutVat: offer.offer.totalWithoutVat,
      totalVat: offer.offer.totalVat,
      grandTotal: offer.offer.grandTotal,
      currency: offer.offer.currency || 'RON'
    },
    
    terms: {
      paymentTerms: offer.offer.paymentTerms || '30 zile de la facturare',
      deliveryTerms: offer.offer.deliveryTerms || 'Franco destinație',
      validity: offer.offer.validityDays || 30,
      notes: offer.offer.notes
    },
    
    metadata: {
      generatedAt: new Date(),
      negotiationId: offer.negotiation.id,
      agentName: offer.negotiation.assignedAgent || 'AI Sales Agent'
    }
  };
}

async function fetchInvoiceData(
  tenantId: string,
  invoiceId: string
): Promise<Record<string, unknown>> {
  const [invoice] = await db
    .select({
      invoice: invoices,
      contact: contactsGold
    })
    .from(invoices)
    .innerJoin(contactsGold, eq(invoices.contactId, contactsGold.id))
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Fetch line items
  const lineItems = await db
    .select({
      lineItem: invoiceLineItems,
      product: products
    })
    .from(invoiceLineItems)
    .leftJoin(products, eq(invoiceLineItems.productId, products.id))
    .where(eq(invoiceLineItems.invoiceId, invoiceId));

  return {
    documentNumber: invoice.invoice.invoiceNumber,
    documentDate: invoice.invoice.issueDate,
    dueDate: invoice.invoice.dueDate,
    
    supplier: {
      companyName: process.env.COMPANY_NAME || 'Cerniq SRL',
      cui: process.env.COMPANY_CUI || 'RO12345678',
      regCom: process.env.COMPANY_REG_COM || 'J40/1234/2020',
      address: process.env.COMPANY_ADDRESS || 'Str. Exemplu nr. 1, București',
      phone: process.env.COMPANY_PHONE || '+40 21 123 4567',
      email: process.env.COMPANY_EMAIL || 'office@cerniq.ro',
      iban: process.env.COMPANY_IBAN || 'RO12BANK1234567890123456',
      bank: process.env.COMPANY_BANK || 'Banca Transilvania'
    },
    
    customer: {
      companyName: invoice.contact.companyName,
      cui: invoice.contact.cui,
      regCom: invoice.contact.regCom,
      address: formatAddress(invoice.contact),
      phone: invoice.contact.phone,
      email: invoice.contact.email,
      contactPerson: invoice.contact.contactPerson
    },
    
    items: lineItems.map((item, index) => ({
      nr: index + 1,
      productCode: item.product?.sku || '',
      productName: item.lineItem.productName,
      description: item.lineItem.description,
      unit: item.lineItem.unit,
      quantity: item.lineItem.quantity,
      unitPrice: item.lineItem.unitPrice,
      vatRate: item.lineItem.vatRate,
      totalWithoutVat: item.lineItem.totalWithoutVat,
      vatAmount: item.lineItem.vatAmount,
      totalWithVat: item.lineItem.totalWithVat
    })),
    
    totals: {
      totalWithoutVat: invoice.invoice.totalWithoutVat,
      totalVat: invoice.invoice.totalVat,
      grandTotal: invoice.invoice.grandTotal,
      currency: invoice.invoice.currency || 'RON'
    },
    
    payment: {
      terms: invoice.invoice.paymentTerms,
      method: invoice.invoice.paymentMethod,
      reference: invoice.invoice.paymentReference
    },
    
    fiscal: {
      seriesPrefix: invoice.invoice.seriesPrefix,
      efacturaStatus: invoice.invoice.efacturaStatus,
      efacturaId: invoice.invoice.efacturaId,
      oblioId: invoice.invoice.oblioId
    },
    
    metadata: {
      generatedAt: new Date(),
      isProforma: invoice.invoice.isProforma,
      relatedOfferId: invoice.invoice.relatedOfferId
    }
  };
}

function formatAddress(contact: {
  street?: string | null;
  city?: string | null;
  county?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string {
  const parts = [
    contact.street,
    contact.city,
    contact.county,
    contact.postalCode,
    contact.country || 'România'
  ].filter(Boolean);
  
  return parts.join(', ');
}

// Main PDF generation process
async function processPdfGeneration(
  job: Job<PdfGenerateJobData>
): Promise<PdfGenerateResult> {
  const { tenantId, documentType, sourceId, sourceType, language = 'ro' } = job.data;
  const startTime = Date.now();
  
  logger.info('Starting PDF generation', {
    jobId: job.id,
    tenantId,
    documentType,
    sourceId,
    sourceType
  });

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // 1. Fetch document data based on source type
    let documentData: Record<string, unknown>;
    
    switch (sourceType) {
      case 'offer':
        documentData = await fetchOfferData(tenantId, sourceId);
        break;
      case 'invoice':
        documentData = await fetchInvoiceData(tenantId, sourceId);
        break;
      case 'negotiation':
        // Fetch latest offer from negotiation
        const [latestOffer] = await db
          .select()
          .from(offers)
          .where(eq(offers.negotiationId, sourceId))
          .orderBy(desc(offers.createdAt))
          .limit(1);
        
        if (!latestOffer) {
          throw new Error(`No offer found for negotiation: ${sourceId}`);
        }
        documentData = await fetchOfferData(tenantId, latestOffer.id);
        break;
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }

    // 2. Load and compile template
    const template = await templateEngine.loadTemplate(tenantId, documentType, language);

    // 3. Render HTML
    const htmlContent = template(documentData);

    // 4. Generate PDF using Puppeteer
    browser = await browserPool.acquire();
    page = await browser.newPage();

    // Set viewport for A4
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels
      deviceScaleFactor: 2 // High resolution
    });

    // Load HTML content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: PDF_CONFIG.timeouts.pageLoad
    });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: PDF_CONFIG.pdf.margin,
      printBackground: true,
      displayHeaderFooter: PDF_CONFIG.documentTypes[documentType].headerFooter,
      headerTemplate: generateHeaderTemplate(documentType, documentData),
      footerTemplate: generateFooterTemplate(documentType),
      preferCSSPageSize: true
    });

    // 5. Post-process PDF (add metadata, watermark if needed)
    const processedPdf = await postProcessPdf(
      pdfBuffer,
      documentType,
      documentData as Record<string, unknown>
    );

    // 6. Calculate checksum
    const checksum = createHash('sha256').update(processedPdf).digest('hex');

    // 7. Get page count
    const pdfDoc = await pdfLib.PDFDocument.load(processedPdf);
    const pageCount = pdfDoc.getPageCount();

    // 8. Generate filename
    const filename = generateFilename(documentType, documentData);

    // 9. Upload to S3
    const storagePath = `${PDF_CONFIG.storage.prefix}${tenantId}/${documentType.toLowerCase()}/${new Date().getFullYear()}/${filename}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: PDF_CONFIG.storage.bucket,
      Key: storagePath,
      Body: processedPdf,
      ContentType: 'application/pdf',
      Metadata: {
        'tenant-id': tenantId,
        'document-type': documentType,
        'source-id': sourceId,
        'source-type': sourceType,
        'checksum': checksum,
        'generated-at': new Date().toISOString()
      }
    }));

    // 10. Generate presigned URL
    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: PDF_CONFIG.storage.bucket,
        Key: storagePath
      }),
      { expiresIn: PDF_CONFIG.storage.presignedUrlExpiry }
    );

    const presignedUrlExpiry = new Date(
      Date.now() + PDF_CONFIG.storage.presignedUrlExpiry * 1000
    );

    // 11. Save document record
    const documentId = crypto.randomUUID();
    await db.insert(generatedDocuments).values({
      id: documentId,
      tenantId,
      documentType,
      sourceType,
      sourceId,
      filename,
      storagePath,
      storageUrl: `s3://${PDF_CONFIG.storage.bucket}/${storagePath}`,
      sizeBytes: processedPdf.length,
      pageCount,
      checksum,
      mimeType: 'application/pdf',
      generatedAt: new Date(),
      presignedUrl,
      presignedUrlExpiry,
      metadata: {
        language,
        generationTimeMs: Date.now() - startTime,
        templateVersion: '1.0.0'
      }
    });

    const generationTimeMs = Date.now() - startTime;

    // Record metrics
    pdfGenerateMetrics.documentsGenerated.inc({
      tenant_id: tenantId,
      document_type: documentType,
      status: 'success'
    });
    pdfGenerateMetrics.generationDuration.observe(
      { document_type: documentType },
      generationTimeMs / 1000
    );
    pdfGenerateMetrics.documentSize.observe(
      { document_type: documentType },
      processedPdf.length
    );

    logger.info('PDF generation completed', {
      jobId: job.id,
      documentId,
      filename,
      sizeBytes: processedPdf.length,
      pageCount,
      generationTimeMs
    });

    return {
      documentId,
      filename,
      storagePath,
      storageUrl: `s3://${PDF_CONFIG.storage.bucket}/${storagePath}`,
      presignedUrl,
      presignedUrlExpiry,
      sizeBytes: processedPdf.length,
      pageCount,
      generationTimeMs,
      checksum
    };

  } catch (error) {
    pdfGenerateMetrics.documentsGenerated.inc({
      tenant_id: tenantId,
      document_type: documentType,
      status: 'failed'
    });

    logger.error('PDF generation failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
      documentType,
      sourceId
    });

    throw error;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      browserPool.release(browser);
    }
  }
}

// Header template generator
function generateHeaderTemplate(
  documentType: DocumentType,
  data: Record<string, unknown>
): string {
  const companyName = (data.supplier as Record<string, string>)?.companyName || '';
  
  return `
    <div style="font-size: 8px; width: 100%; padding: 5mm 15mm; color: #666;">
      <span>${companyName}</span>
    </div>
  `;
}

// Footer template generator
function generateFooterTemplate(documentType: DocumentType): string {
  return `
    <div style="font-size: 8px; width: 100%; padding: 5mm 15mm; color: #666; display: flex; justify-content: space-between;">
      <span>Document generat automat</span>
      <span>Pagina <span class="pageNumber"></span> din <span class="totalPages"></span></span>
    </div>
  `;
}

// Post-process PDF (add metadata, watermark)
async function postProcessPdf(
  pdfBuffer: Buffer,
  documentType: DocumentType,
  data: Record<string, unknown>
): Promise<Buffer> {
  const pdfDoc = await pdfLib.PDFDocument.load(pdfBuffer);

  // Set PDF metadata
  pdfDoc.setTitle(`${documentType} - ${(data as Record<string, string>).documentNumber || ''}`);
  pdfDoc.setAuthor(process.env.COMPANY_NAME || 'Cerniq SRL');
  pdfDoc.setSubject(`${documentType} Document`);
  pdfDoc.setCreator('Cerniq Document Generator');
  pdfDoc.setProducer('Cerniq Platform v1.0');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  // Add watermark if required
  if (PDF_CONFIG.documentTypes[documentType].watermark) {
    const pages = pdfDoc.getPages();
    const { width, height } = pages[0].getSize();
    
    for (const page of pages) {
      page.drawText('DRAFT', {
        x: width / 2 - 100,
        y: height / 2,
        size: 72,
        opacity: 0.1,
        rotate: pdfLib.degrees(-45)
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

// Filename generator
function generateFilename(
  documentType: DocumentType,
  data: Record<string, unknown>
): string {
  const documentNumber = (data as Record<string, string>).documentNumber || crypto.randomUUID().substring(0, 8);
  const date = new Date().toISOString().split('T')[0];
  const customerName = ((data.customer as Record<string, string>)?.companyName || 'unknown')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);
  
  return `${documentType}_${documentNumber}_${customerName}_${date}.pdf`;
}

// Create worker
export const pdfGenerateWorker = new Worker<PdfGenerateJobData, PdfGenerateResult>(
  PDF_GENERATE_QUEUE_NAME,
  processPdfGeneration,
  {
    connection: getRedisConnection(),
    ...PDF_GENERATE_WORKER_CONFIG
  }
);

// Worker event handlers
pdfGenerateWorker.on('completed', (job, result) => {
  logger.info('Job completed', {
    jobId: job.id,
    documentId: result.documentId,
    filename: result.filename
  });
});

pdfGenerateWorker.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job?.id,
    error: error.message,
    stack: error.stack
  });
});

pdfGenerateWorker.on('error', (error) => {
  logger.error('Worker error', { error: error.message });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down PDF generate worker');
  await pdfGenerateWorker.close();
  await browserPool.shutdown();
});
```

### 2.3 Metrics

```typescript
// src/workers/etapa3/document-generation/pdf-generate.metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

export const pdfGenerateMetrics = {
  documentsGenerated: new Counter({
    name: 'cerniq_pdf_documents_generated_total',
    help: 'Total number of PDF documents generated',
    labelNames: ['tenant_id', 'document_type', 'status']
  }),

  generationDuration: new Histogram({
    name: 'cerniq_pdf_generation_duration_seconds',
    help: 'PDF generation duration in seconds',
    labelNames: ['document_type'],
    buckets: [1, 2, 5, 10, 15, 30, 60, 120]
  }),

  documentSize: new Histogram({
    name: 'cerniq_pdf_document_size_bytes',
    help: 'PDF document size in bytes',
    labelNames: ['document_type'],
    buckets: [10000, 50000, 100000, 500000, 1000000, 5000000]
  }),

  browserPoolSize: new Gauge({
    name: 'cerniq_pdf_browser_pool_size',
    help: 'Current browser pool size'
  }),

  browserPoolAvailable: new Gauge({
    name: 'cerniq_pdf_browser_pool_available',
    help: 'Available browsers in pool'
  }),

  templateCacheSize: new Gauge({
    name: 'cerniq_pdf_template_cache_size',
    help: 'Number of cached templates'
  }),

  s3UploadDuration: new Histogram({
    name: 'cerniq_pdf_s3_upload_duration_seconds',
    help: 'S3 upload duration in seconds',
    labelNames: ['bucket'],
    buckets: [0.5, 1, 2, 5, 10, 30]
  })
};
```

---

## 3. Worker I2: Email Delivery Service

### 3.1 Configuration

```typescript
// src/workers/etapa3/document-generation/email-send.config.ts

import { QueueOptions, WorkerOptions } from 'bullmq';

export const EMAIL_SEND_QUEUE_NAME = 'etapa3:delivery:email:send';

export const EMAIL_SEND_QUEUE_CONFIG: QueueOptions = {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10000 // 10 seconds
    },
    removeOnComplete: {
      age: 14 * 24 * 3600,
      count: 10000
    },
    removeOnFail: {
      age: 30 * 24 * 3600
    }
  }
};

export const EMAIL_SEND_WORKER_CONFIG: WorkerOptions = {
  concurrency: 10,
  limiter: {
    max: 50,
    duration: 60000 // 50 emails per minute (AWS SES default)
  },
  lockDuration: 60000
};

export const EMAIL_CONFIG = {
  // Provider settings
  provider: process.env.EMAIL_PROVIDER || 'ses', // 'ses' | 'sendgrid' | 'smtp'
  
  // AWS SES settings
  ses: {
    region: process.env.AWS_SES_REGION || 'eu-central-1',
    accessKeyId: process.env.AWS_SES_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SES_SECRET_KEY,
    configurationSetName: process.env.AWS_SES_CONFIG_SET || 'cerniq-transactional'
  },
  
  // SendGrid settings
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    ipPoolName: process.env.SENDGRID_IP_POOL
  },
  
  // SMTP settings (fallback)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '443'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  },
  
  // Default sender
  defaultFrom: {
    email: process.env.EMAIL_FROM || 'no-reply@cerniq.ro',
    name: process.env.EMAIL_FROM_NAME || 'Cerniq Sales'
  },
  
  // Reply-to settings
  defaultReplyTo: process.env.EMAIL_REPLY_TO || 'sales@cerniq.ro',
  
  // Rate limits per provider
  rateLimits: {
    ses: {
      maxPerSecond: 14,
      maxPerDay: 50000
    },
    sendgrid: {
      maxPerSecond: 10,
      maxPerDay: 100000
    },
    smtp: {
      maxPerSecond: 5,
      maxPerDay: 10000
    }
  },
  
  // Attachment settings
  attachments: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg'
    ]
  },
  
  // Tracking settings
  tracking: {
    enabled: true,
    openTracking: true,
    clickTracking: true,
    webhookUrl: process.env.EMAIL_WEBHOOK_URL
  }
} as const;

// Email job data interface
export interface EmailSendJobData {
  tenantId: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  htmlBody?: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: {
    negotiationId?: string;
    contactId?: string;
    documentId?: string;
    campaignId?: string;
    sourceWorker?: string;
  };
  scheduledFor?: Date;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string; // S3 path or URL
  contentType: string;
  encoding?: 'base64' | 'utf8';
}

export interface EmailSendResult {
  messageId: string;
  provider: string;
  status: 'sent' | 'queued' | 'failed';
  recipientCount: number;
  sentAt: Date;
  cost?: number;
  trackingId?: string;
}

// Email template types
export enum EmailTemplateType {
  OFFER_SENT = 'OFFER_SENT',
  PROFORMA_SENT = 'PROFORMA_SENT',
  INVOICE_SENT = 'INVOICE_SENT',
  CONTRACT_SENT = 'CONTRACT_SENT',
  FOLLOWUP = 'FOLLOWUP',
  REMINDER = 'REMINDER',
  WELCOME = 'WELCOME',
  CONFIRMATION = 'CONFIRMATION',
  CUSTOM = 'CUSTOM'
}
```

### 3.2 Worker Implementation

```typescript
// src/workers/etapa3/document-generation/email-send.worker.ts

import { Worker, Job } from 'bullmq';
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Handlebars from 'handlebars';

import {
  EMAIL_SEND_QUEUE_NAME,
  EMAIL_SEND_WORKER_CONFIG,
  EMAIL_CONFIG,
  EmailSendJobData,
  EmailSendResult,
  EmailAttachment
} from './email-send.config';
import { getRedisConnection } from '@/lib/redis';
import { db } from '@/db';
import { emailTemplates, emailLogs, emailEvents } from '@/db/schema/etapa3';
import { eq, and } from 'drizzle-orm';
import { emailMetrics } from './email-send.metrics';
import { createDocumentLogger } from './document.logger';

const logger = createDocumentLogger('email-send');

// Initialize providers
const sesClient = new SESClient({
  region: EMAIL_CONFIG.ses.region,
  credentials: {
    accessKeyId: EMAIL_CONFIG.ses.accessKeyId!,
    secretAccessKey: EMAIL_CONFIG.ses.secretAccessKey!
  }
});

if (EMAIL_CONFIG.sendgrid.apiKey) {
  sgMail.setApiKey(EMAIL_CONFIG.sendgrid.apiKey);
}

const smtpTransporter = nodemailer.createTransport({
  host: EMAIL_CONFIG.smtp.host,
  port: EMAIL_CONFIG.smtp.port,
  secure: EMAIL_CONFIG.smtp.secure,
  auth: EMAIL_CONFIG.smtp.auth
});

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'eu-central-1'
});

// Email template compiler
class EmailTemplateCompiler {
  private compiledTemplates: Map<string, {
    subject: Handlebars.TemplateDelegate;
    html: Handlebars.TemplateDelegate;
    text?: Handlebars.TemplateDelegate;
  }> = new Map();

  async compile(
    tenantId: string,
    templateId: string
  ): Promise<{
    subject: Handlebars.TemplateDelegate;
    html: Handlebars.TemplateDelegate;
    text?: Handlebars.TemplateDelegate;
  }> {
    const cacheKey = `${tenantId}:${templateId}`;
    
    if (this.compiledTemplates.has(cacheKey)) {
      return this.compiledTemplates.get(cacheKey)!;
    }

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.tenantId, tenantId),
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      throw new Error(`Email template not found: ${templateId}`);
    }

    const compiled = {
      subject: Handlebars.compile(template.subjectTemplate),
      html: Handlebars.compile(template.htmlTemplate),
      text: template.textTemplate ? Handlebars.compile(template.textTemplate) : undefined
    };

    this.compiledTemplates.set(cacheKey, compiled);
    return compiled;
  }

  clearCache(): void {
    this.compiledTemplates.clear();
  }
}

const templateCompiler = new EmailTemplateCompiler();

// Provider-specific send functions
async function sendViaSes(
  job: Job<EmailSendJobData>,
  preparedEmail: PreparedEmail
): Promise<EmailSendResult> {
  const toAddresses = Array.isArray(preparedEmail.to) 
    ? preparedEmail.to 
    : [preparedEmail.to];

  // For emails with attachments, use raw email
  if (preparedEmail.attachments && preparedEmail.attachments.length > 0) {
    const rawEmail = await buildRawEmail(preparedEmail);
    
    const command = new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawEmail) },
      ConfigurationSetName: EMAIL_CONFIG.ses.configurationSetName,
      Tags: preparedEmail.tags?.map(tag => ({
        Name: 'tag',
        Value: tag
      }))
    });

    const response = await sesClient.send(command);

    return {
      messageId: response.MessageId!,
      provider: 'ses',
      status: 'sent',
      recipientCount: toAddresses.length,
      sentAt: new Date()
    };
  }

  // Simple email without attachments
  const command = new SendEmailCommand({
    Source: `${EMAIL_CONFIG.defaultFrom.name} <${EMAIL_CONFIG.defaultFrom.email}>`,
    Destination: {
      ToAddresses: toAddresses,
      CcAddresses: preparedEmail.cc ? (Array.isArray(preparedEmail.cc) ? preparedEmail.cc : [preparedEmail.cc]) : undefined,
      BccAddresses: preparedEmail.bcc ? (Array.isArray(preparedEmail.bcc) ? preparedEmail.bcc : [preparedEmail.bcc]) : undefined
    },
    Message: {
      Subject: {
        Data: preparedEmail.subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: preparedEmail.htmlBody ? {
          Data: preparedEmail.htmlBody,
          Charset: 'UTF-8'
        } : undefined,
        Text: preparedEmail.textBody ? {
          Data: preparedEmail.textBody,
          Charset: 'UTF-8'
        } : undefined
      }
    },
    ReplyToAddresses: [EMAIL_CONFIG.defaultReplyTo],
    ConfigurationSetName: EMAIL_CONFIG.ses.configurationSetName,
    Tags: preparedEmail.tags?.map(tag => ({
      Name: 'tag',
      Value: tag
    }))
  });

  const response = await sesClient.send(command);

  return {
    messageId: response.MessageId!,
    provider: 'ses',
    status: 'sent',
    recipientCount: toAddresses.length,
    sentAt: new Date()
  };
}

async function sendViaSendGrid(
  job: Job<EmailSendJobData>,
  preparedEmail: PreparedEmail
): Promise<EmailSendResult> {
  const toAddresses = Array.isArray(preparedEmail.to) 
    ? preparedEmail.to.map(email => ({ email }))
    : [{ email: preparedEmail.to }];

  const msg: sgMail.MailDataRequired = {
    to: toAddresses,
    cc: preparedEmail.cc 
      ? (Array.isArray(preparedEmail.cc) ? preparedEmail.cc.map(e => ({ email: e })) : [{ email: preparedEmail.cc }])
      : undefined,
    bcc: preparedEmail.bcc
      ? (Array.isArray(preparedEmail.bcc) ? preparedEmail.bcc.map(e => ({ email: e })) : [{ email: preparedEmail.bcc }])
      : undefined,
    from: {
      email: EMAIL_CONFIG.defaultFrom.email,
      name: EMAIL_CONFIG.defaultFrom.name
    },
    replyTo: EMAIL_CONFIG.defaultReplyTo,
    subject: preparedEmail.subject,
    html: preparedEmail.htmlBody,
    text: preparedEmail.textBody,
    attachments: preparedEmail.attachments?.map(att => ({
      filename: att.filename,
      content: att.content?.toString('base64') || '',
      type: att.contentType,
      disposition: 'attachment'
    })),
    trackingSettings: {
      clickTracking: { enable: EMAIL_CONFIG.tracking.clickTracking },
      openTracking: { enable: EMAIL_CONFIG.tracking.openTracking }
    },
    customArgs: {
      tenant_id: job.data.tenantId,
      job_id: job.id
    },
    categories: preparedEmail.tags
  };

  const [response] = await sgMail.send(msg);

  return {
    messageId: response.headers['x-message-id'] || crypto.randomUUID(),
    provider: 'sendgrid',
    status: 'sent',
    recipientCount: toAddresses.length,
    sentAt: new Date()
  };
}

async function sendViaSmtp(
  job: Job<EmailSendJobData>,
  preparedEmail: PreparedEmail
): Promise<EmailSendResult> {
  const mailOptions = {
    from: `${EMAIL_CONFIG.defaultFrom.name} <${EMAIL_CONFIG.defaultFrom.email}>`,
    to: Array.isArray(preparedEmail.to) ? preparedEmail.to.join(', ') : preparedEmail.to,
    cc: preparedEmail.cc 
      ? (Array.isArray(preparedEmail.cc) ? preparedEmail.cc.join(', ') : preparedEmail.cc)
      : undefined,
    bcc: preparedEmail.bcc
      ? (Array.isArray(preparedEmail.bcc) ? preparedEmail.bcc.join(', ') : preparedEmail.bcc)
      : undefined,
    replyTo: EMAIL_CONFIG.defaultReplyTo,
    subject: preparedEmail.subject,
    html: preparedEmail.htmlBody,
    text: preparedEmail.textBody,
    attachments: preparedEmail.attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType
    })),
    headers: preparedEmail.headers
  };

  const info = await smtpTransporter.sendMail(mailOptions);

  return {
    messageId: info.messageId,
    provider: 'smtp',
    status: 'sent',
    recipientCount: Array.isArray(preparedEmail.to) ? preparedEmail.to.length : 1,
    sentAt: new Date()
  };
}

// Prepared email interface
interface PreparedEmail {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  attachments?: PreparedAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
}

interface PreparedAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

// Build raw email for SES (with attachments)
async function buildRawEmail(preparedEmail: PreparedEmail): Promise<string> {
  const boundary = `----=_Part_${crypto.randomUUID()}`;
  const toAddresses = Array.isArray(preparedEmail.to) 
    ? preparedEmail.to.join(', ')
    : preparedEmail.to;

  let rawEmail = '';
  rawEmail += `From: ${EMAIL_CONFIG.defaultFrom.name} <${EMAIL_CONFIG.defaultFrom.email}>\r\n`;
  rawEmail += `To: ${toAddresses}\r\n`;
  if (preparedEmail.cc) {
    rawEmail += `Cc: ${Array.isArray(preparedEmail.cc) ? preparedEmail.cc.join(', ') : preparedEmail.cc}\r\n`;
  }
  rawEmail += `Reply-To: ${EMAIL_CONFIG.defaultReplyTo}\r\n`;
  rawEmail += `Subject: =?UTF-8?B?${Buffer.from(preparedEmail.subject).toString('base64')}?=\r\n`;
  rawEmail += `MIME-Version: 1.0\r\n`;
  rawEmail += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  rawEmail += `\r\n`;

  // HTML body
  if (preparedEmail.htmlBody) {
    rawEmail += `--${boundary}\r\n`;
    rawEmail += `Content-Type: text/html; charset=UTF-8\r\n`;
    rawEmail += `Content-Transfer-Encoding: base64\r\n`;
    rawEmail += `\r\n`;
    rawEmail += Buffer.from(preparedEmail.htmlBody).toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
    rawEmail += `\r\n`;
  }

  // Attachments
  if (preparedEmail.attachments) {
    for (const attachment of preparedEmail.attachments) {
      rawEmail += `--${boundary}\r\n`;
      rawEmail += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`;
      rawEmail += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
      rawEmail += `Content-Transfer-Encoding: base64\r\n`;
      rawEmail += `\r\n`;
      rawEmail += attachment.content.toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
      rawEmail += `\r\n`;
    }
  }

  rawEmail += `--${boundary}--\r\n`;

  return rawEmail;
}

// Fetch attachment content from S3 or URL
async function fetchAttachment(attachment: EmailAttachment): Promise<PreparedAttachment> {
  if (attachment.content) {
    return {
      filename: attachment.filename,
      content: Buffer.isBuffer(attachment.content) 
        ? attachment.content 
        : Buffer.from(attachment.content, attachment.encoding || 'base64'),
      contentType: attachment.contentType
    };
  }

  if (attachment.path) {
    // Check if S3 path
    if (attachment.path.startsWith('s3://')) {
      const [bucket, ...keyParts] = attachment.path.replace('s3://', '').split('/');
      const key = keyParts.join('/');

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToByteArray();

      if (!content) {
        throw new Error(`Failed to fetch attachment from S3: ${attachment.path}`);
      }

      return {
        filename: attachment.filename,
        content: Buffer.from(content),
        contentType: attachment.contentType
      };
    }

    // HTTP URL
    if (attachment.path.startsWith('http')) {
      const response = await fetch(attachment.path);
      const content = await response.arrayBuffer();

      return {
        filename: attachment.filename,
        content: Buffer.from(content),
        contentType: attachment.contentType
      };
    }
  }

  throw new Error(`Invalid attachment configuration: ${attachment.filename}`);
}

// Main email send process
async function processEmailSend(
  job: Job<EmailSendJobData>
): Promise<EmailSendResult> {
  const { tenantId, templateId, templateData } = job.data;
  const startTime = Date.now();

  logger.info('Starting email send', {
    jobId: job.id,
    tenantId,
    to: job.data.to,
    templateId
  });

  try {
    // 1. Prepare email content
    let subject = job.data.subject;
    let htmlBody = job.data.htmlBody;
    let textBody = job.data.textBody;

    // Use template if provided
    if (templateId && templateData) {
      const templates = await templateCompiler.compile(tenantId, templateId);
      subject = templates.subject(templateData);
      htmlBody = templates.html(templateData);
      textBody = templates.text ? templates.text(templateData) : undefined;
    }

    // 2. Prepare attachments
    const preparedAttachments: PreparedAttachment[] = [];
    if (job.data.attachments && job.data.attachments.length > 0) {
      for (const attachment of job.data.attachments) {
        // Validate attachment
        if (!EMAIL_CONFIG.attachments.allowedMimeTypes.includes(attachment.contentType)) {
          throw new Error(`Invalid attachment type: ${attachment.contentType}`);
        }

        const prepared = await fetchAttachment(attachment);
        
        if (prepared.content.length > EMAIL_CONFIG.attachments.maxSizeBytes) {
          throw new Error(`Attachment too large: ${attachment.filename}`);
        }

        preparedAttachments.push(prepared);
      }
    }

    // 3. Build prepared email
    const preparedEmail: PreparedEmail = {
      to: job.data.to,
      cc: job.data.cc,
      bcc: job.data.bcc,
      subject,
      htmlBody,
      textBody,
      attachments: preparedAttachments,
      headers: job.data.headers,
      tags: job.data.tags
    };

    // 4. Send via configured provider with fallback
    let result: EmailSendResult;
    const provider = EMAIL_CONFIG.provider;

    try {
      switch (provider) {
        case 'ses':
          result = await sendViaSes(job, preparedEmail);
          break;
        case 'sendgrid':
          result = await sendViaSendGrid(job, preparedEmail);
          break;
        case 'smtp':
          result = await sendViaSmtp(job, preparedEmail);
          break;
        default:
          throw new Error(`Unknown email provider: ${provider}`);
      }
    } catch (providerError) {
      // Fallback to SMTP if primary fails
      logger.warn('Primary provider failed, falling back to SMTP', {
        jobId: job.id,
        provider,
        error: providerError instanceof Error ? providerError.message : 'Unknown'
      });

      if (provider !== 'smtp') {
        result = await sendViaSmtp(job, preparedEmail);
      } else {
        throw providerError;
      }
    }

    // 5. Log email
    await db.insert(emailLogs).values({
      id: crypto.randomUUID(),
      tenantId,
      messageId: result.messageId,
      provider: result.provider,
      toAddresses: Array.isArray(job.data.to) ? job.data.to : [job.data.to],
      ccAddresses: job.data.cc ? (Array.isArray(job.data.cc) ? job.data.cc : [job.data.cc]) : null,
      bccAddresses: job.data.bcc ? (Array.isArray(job.data.bcc) ? job.data.bcc : [job.data.bcc]) : null,
      subject,
      templateId,
      status: result.status,
      sentAt: result.sentAt,
      metadata: {
        jobId: job.id,
        negotiationId: job.data.metadata?.negotiationId,
        contactId: job.data.metadata?.contactId,
        documentId: job.data.metadata?.documentId,
        attachmentCount: preparedAttachments.length,
        processingTimeMs: Date.now() - startTime
      }
    });

    // Record metrics
    emailMetrics.emailsSent.inc({
      tenant_id: tenantId,
      provider: result.provider,
      status: 'success'
    });
    emailMetrics.sendDuration.observe(
      { provider: result.provider },
      (Date.now() - startTime) / 1000
    );

    logger.info('Email sent successfully', {
      jobId: job.id,
      messageId: result.messageId,
      provider: result.provider,
      recipientCount: result.recipientCount
    });

    return result;

  } catch (error) {
    emailMetrics.emailsSent.inc({
      tenant_id: tenantId,
      provider: EMAIL_CONFIG.provider,
      status: 'failed'
    });

    logger.error('Email send failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

// Create worker
export const emailSendWorker = new Worker<EmailSendJobData, EmailSendResult>(
  EMAIL_SEND_QUEUE_NAME,
  processEmailSend,
  {
    connection: getRedisConnection(),
    ...EMAIL_SEND_WORKER_CONFIG
  }
);

// Worker event handlers
emailSendWorker.on('completed', (job, result) => {
  logger.info('Email job completed', {
    jobId: job.id,
    messageId: result.messageId
  });
});

emailSendWorker.on('failed', (job, error) => {
  logger.error('Email job failed', {
    jobId: job?.id,
    error: error.message
  });
});
```

### 3.3 Email Webhook Handler

```typescript
// src/workers/etapa3/document-generation/email-webhook.handler.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@/db';
import { emailLogs, emailEvents } from '@/db/schema/etapa3';
import { eq } from 'drizzle-orm';
import { createDocumentLogger } from './document.logger';

const logger = createDocumentLogger('email-webhook');

// SES notification types
interface SesNotification {
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  mail: {
    messageId: string;
    timestamp: string;
    source: string;
    destination: string[];
  };
  bounce?: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: { emailAddress: string; status: string }[];
  };
  complaint?: {
    complainedRecipients: { emailAddress: string }[];
    complaintFeedbackType: string;
  };
  delivery?: {
    timestamp: string;
    recipients: string[];
  };
}

// SendGrid event types
interface SendGridEvent {
  email: string;
  timestamp: number;
  event: 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spamreport' | 'unsubscribe';
  sg_message_id: string;
  url?: string;
  useragent?: string;
}

export function registerEmailWebhooks(app: FastifyInstance): void {
  // AWS SES webhook
  app.post('/webhooks/email/ses', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { Type?: string; Message?: string } | SesNotification;
    
    // Handle SNS subscription confirmation
    if ('Type' in body && body.Type === 'SubscriptionConfirmation') {
      const subscribeUrl = (body as { SubscribeURL: string }).SubscribeURL;
      await fetch(subscribeUrl);
      return reply.send({ status: 'subscribed' });
    }

    // Parse notification
    const notification: SesNotification = 'Message' in body && body.Message
      ? JSON.parse(body.Message)
      : body as SesNotification;

    await processEmailEvent({
      provider: 'ses',
      messageId: notification.mail.messageId,
      eventType: mapSesEventType(notification),
      timestamp: new Date(notification.mail.timestamp),
      recipients: getAffectedRecipients(notification),
      metadata: notification
    });

    return reply.send({ status: 'ok' });
  });

  // SendGrid webhook
  app.post('/webhooks/email/sendgrid', async (request: FastifyRequest, reply: FastifyReply) => {
    const events = request.body as SendGridEvent[];

    for (const event of events) {
      await processEmailEvent({
        provider: 'sendgrid',
        messageId: event.sg_message_id,
        eventType: event.event,
        timestamp: new Date(event.timestamp * 1000),
        recipients: [event.email],
        metadata: {
          url: event.url,
          userAgent: event.useragent
        }
      });
    }

    return reply.send({ status: 'ok' });
  });
}

function mapSesEventType(notification: SesNotification): string {
  switch (notification.notificationType) {
    case 'Bounce':
      return notification.bounce?.bounceType === 'Permanent' ? 'hard_bounce' : 'soft_bounce';
    case 'Complaint':
      return 'complaint';
    case 'Delivery':
      return 'delivered';
    default:
      return 'unknown';
  }
}

function getAffectedRecipients(notification: SesNotification): string[] {
  if (notification.bounce) {
    return notification.bounce.bouncedRecipients.map(r => r.emailAddress);
  }
  if (notification.complaint) {
    return notification.complaint.complainedRecipients.map(r => r.emailAddress);
  }
  if (notification.delivery) {
    return notification.delivery.recipients;
  }
  return notification.mail.destination;
}

interface EmailEventData {
  provider: string;
  messageId: string;
  eventType: string;
  timestamp: Date;
  recipients: string[];
  metadata?: Record<string, unknown>;
}

async function processEmailEvent(event: EmailEventData): Promise<void> {
  logger.info('Processing email event', {
    provider: event.provider,
    messageId: event.messageId,
    eventType: event.eventType
  });

  // Find email log
  const [emailLog] = await db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.messageId, event.messageId))
    .limit(1);

  if (!emailLog) {
    logger.warn('Email log not found for event', { messageId: event.messageId });
    return;
  }

  // Insert event
  await db.insert(emailEvents).values({
    id: crypto.randomUUID(),
    emailLogId: emailLog.id,
    eventType: event.eventType,
    timestamp: event.timestamp,
    recipients: event.recipients,
    metadata: event.metadata
  });

  // Update email log status for terminal events
  if (['delivered', 'hard_bounce', 'complaint'].includes(event.eventType)) {
    await db
      .update(emailLogs)
      .set({
        status: event.eventType === 'delivered' ? 'delivered' : 'failed',
        updatedAt: new Date()
      })
      .where(eq(emailLogs.id, emailLog.id));
  }

  // Handle bounces and complaints
  if (event.eventType === 'hard_bounce' || event.eventType === 'complaint') {
    // Update contact suppression list
    for (const email of event.recipients) {
      await handleEmailSuppression(emailLog.tenantId, email, event.eventType);
    }
  }
}

async function handleEmailSuppression(
  tenantId: string,
  email: string,
  reason: string
): Promise<void> {
  // Add to suppression list
  await db.insert(emailSuppressions).values({
    id: crypto.randomUUID(),
    tenantId,
    email: email.toLowerCase(),
    reason,
    suppressedAt: new Date()
  }).onConflictDoUpdate({
    target: [emailSuppressions.tenantId, emailSuppressions.email],
    set: {
      reason,
      suppressedAt: new Date()
    }
  });

  logger.info('Email suppressed', { tenantId, email, reason });
}
```

### 3.4 Metrics

```typescript
// src/workers/etapa3/document-generation/email-send.metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

export const emailMetrics = {
  emailsSent: new Counter({
    name: 'cerniq_emails_sent_total',
    help: 'Total number of emails sent',
    labelNames: ['tenant_id', 'provider', 'status']
  }),

  sendDuration: new Histogram({
    name: 'cerniq_email_send_duration_seconds',
    help: 'Email send duration in seconds',
    labelNames: ['provider'],
    buckets: [0.5, 1, 2, 5, 10, 30]
  }),

  emailEvents: new Counter({
    name: 'cerniq_email_events_total',
    help: 'Total email events received',
    labelNames: ['provider', 'event_type']
  }),

  bounceRate: new Gauge({
    name: 'cerniq_email_bounce_rate',
    help: 'Email bounce rate (24h rolling)',
    labelNames: ['tenant_id', 'bounce_type']
  }),

  complaintRate: new Gauge({
    name: 'cerniq_email_complaint_rate',
    help: 'Email complaint rate (24h rolling)',
    labelNames: ['tenant_id']
  }),

  suppressionListSize: new Gauge({
    name: 'cerniq_email_suppression_list_size',
    help: 'Size of email suppression list',
    labelNames: ['tenant_id']
  }),

  attachmentSize: new Histogram({
    name: 'cerniq_email_attachment_size_bytes',
    help: 'Email attachment size in bytes',
    buckets: [10000, 100000, 500000, 1000000, 5000000, 10000000]
  })
};
```

---

## 4. Worker I3: WhatsApp Business Delivery

### 4.1 Configuration

```typescript
// src/workers/etapa3/document-generation/whatsapp-send.config.ts

import { QueueOptions, WorkerOptions } from 'bullmq';

export const WHATSAPP_SEND_QUEUE_NAME = 'etapa3:delivery:whatsapp:send';

export const WHATSAPP_SEND_QUEUE_CONFIG: QueueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000 // 30 seconds (WhatsApp rate limits)
    },
    removeOnComplete: {
      age: 14 * 24 * 3600,
      count: 10000
    },
    removeOnFail: {
      age: 30 * 24 * 3600
    }
  }
};

export const WHATSAPP_SEND_WORKER_CONFIG: WorkerOptions = {
  concurrency: 5,
  limiter: {
    max: 80, // WhatsApp Business API limit
    duration: 60000
  },
  lockDuration: 60000
};

export const WHATSAPP_CONFIG = {
  // Meta Cloud API settings
  api: {
    version: 'v18.0',
    baseUrl: 'https://graph.facebook.com',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN
  },
  
  // Message settings
  messaging: {
    defaultLanguage: 'ro',
    messagingServiceWindow: 24 * 3600, // 24 hours
    maxTemplateParams: 10,
    maxMediaSizeBytes: 16 * 1024 * 1024 // 16 MB
  },
  
  // Rate limits (per phone number)
  rateLimits: {
    tier1: {
      messagesPerDay: 1000,
      uniqueUsersPerDay: 1000
    },
    tier2: {
      messagesPerDay: 10000,
      uniqueUsersPerDay: 10000
    },
    tier3: {
      messagesPerDay: 100000,
      uniqueUsersPerDay: 100000
    }
  },
  
  // Webhook settings
  webhook: {
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    secret: process.env.WHATSAPP_WEBHOOK_SECRET
  },
  
  // Template settings
  templates: {
    namespace: process.env.WHATSAPP_TEMPLATE_NAMESPACE || 'cerniq_sales',
    approvalRequired: true
  },
  
  // Media settings
  media: {
    supportedImageTypes: ['image/jpeg', 'image/png'],
    supportedDocumentTypes: ['application/pdf'],
    maxImageSize: 5 * 1024 * 1024, // 5 MB
    maxDocumentSize: 100 * 1024 * 1024 // 100 MB
  }
} as const;

// WhatsApp message types
export enum WhatsAppMessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  IMAGE = 'image',
  DOCUMENT = 'document',
  INTERACTIVE = 'interactive'
}

// Job data interface
export interface WhatsAppSendJobData {
  tenantId: string;
  to: string; // Phone number in E.164 format
  messageType: WhatsAppMessageType;
  
  // For text messages
  text?: {
    body: string;
    previewUrl?: boolean;
  };
  
  // For template messages
  template?: {
    name: string;
    language: string;
    components?: WhatsAppTemplateComponent[];
  };
  
  // For media messages
  media?: {
    type: 'image' | 'document';
    url?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
  
  // For interactive messages
  interactive?: {
    type: 'button' | 'list';
    header?: WhatsAppInteractiveHeader;
    body: { text: string };
    footer?: { text: string };
    action: WhatsAppInteractiveAction;
  };
  
  // Metadata
  metadata?: {
    negotiationId?: string;
    contactId?: string;
    documentId?: string;
    conversationId?: string;
    sourceWorker?: string;
  };
  
  // Reply context
  replyTo?: string; // Message ID to reply to
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename: string;
  };
}

export interface WhatsAppInteractiveHeader {
  type: 'text' | 'image' | 'document';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename: string };
}

export interface WhatsAppInteractiveAction {
  buttons?: Array<{
    type: 'reply';
    reply: { id: string; title: string };
  }>;
  button?: string;
  sections?: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface WhatsAppSendResult {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  conversationId?: string;
  pricing?: {
    category: string;
    model: string;
  };
}
```

### 4.2 Worker Implementation

```typescript
// src/workers/etapa3/document-generation/whatsapp-send.worker.ts

import { Worker, Job } from 'bullmq';
import crypto from 'crypto';

import {
  WHATSAPP_SEND_QUEUE_NAME,
  WHATSAPP_SEND_WORKER_CONFIG,
  WHATSAPP_CONFIG,
  WhatsAppSendJobData,
  WhatsAppSendResult,
  WhatsAppMessageType
} from './whatsapp-send.config';
import { getRedisConnection } from '@/lib/redis';
import { db } from '@/db';
import { whatsappMessages, whatsappConversations } from '@/db/schema/etapa3';
import { eq, and } from 'drizzle-orm';
import { whatsappMetrics } from './whatsapp-send.metrics';
import { createDocumentLogger } from './document.logger';

const logger = createDocumentLogger('whatsapp-send');

// WhatsApp Cloud API client
class WhatsAppApiClient {
  private baseUrl: string;
  private phoneNumberId: string;
  private accessToken: string;

  constructor() {
    this.baseUrl = `${WHATSAPP_CONFIG.api.baseUrl}/${WHATSAPP_CONFIG.api.version}`;
    this.phoneNumberId = WHATSAPP_CONFIG.api.phoneNumberId!;
    this.accessToken = WHATSAPP_CONFIG.api.accessToken!;
  }

  // Send message
  async sendMessage(payload: Record<string, unknown>): Promise<WhatsAppApiResponse> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new WhatsAppApiError(
        error.error?.message || 'Unknown error',
        error.error?.code,
        response.status
      );
    }

    return response.json();
  }

  // Upload media
  async uploadMedia(
    file: Buffer,
    mimeType: string,
    filename: string
  ): Promise<string> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/media`;

    const formData = new FormData();
    formData.append('file', new Blob([file], { type: mimeType }), filename);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new WhatsAppApiError(
        error.error?.message || 'Media upload failed',
        error.error?.code,
        response.status
      );
    }

    const result = await response.json();
    return result.id;
  }

  // Get media URL
  async getMediaUrl(mediaId: string): Promise<string> {
    const url = `${this.baseUrl}/${mediaId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new WhatsAppApiError('Failed to get media URL', undefined, response.status);
    }

    const result = await response.json();
    return result.url;
  }

  // Mark message as read
  async markAsRead(messageId: string): Promise<void> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    });
  }
}

interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{ wa_id: string }>;
  messages: Array<{ id: string }>;
}

class WhatsAppApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

const whatsappClient = new WhatsAppApiClient();

// Build message payload based on type
function buildMessagePayload(job: Job<WhatsAppSendJobData>): Record<string, unknown> {
  const { to, messageType, text, template, media, interactive, replyTo } = job.data;

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhoneNumber(to)
  };

  // Add reply context
  if (replyTo) {
    payload.context = { message_id: replyTo };
  }

  switch (messageType) {
    case WhatsAppMessageType.TEXT:
      payload.type = 'text';
      payload.text = {
        body: text?.body,
        preview_url: text?.previewUrl ?? false
      };
      break;

    case WhatsAppMessageType.TEMPLATE:
      payload.type = 'template';
      payload.template = {
        name: template?.name,
        language: { code: template?.language || 'ro' },
        components: template?.components
      };
      break;

    case WhatsAppMessageType.IMAGE:
      payload.type = 'image';
      payload.image = {
        link: media?.url,
        id: media?.id,
        caption: media?.caption
      };
      break;

    case WhatsAppMessageType.DOCUMENT:
      payload.type = 'document';
      payload.document = {
        link: media?.url,
        id: media?.id,
        caption: media?.caption,
        filename: media?.filename
      };
      break;

    case WhatsAppMessageType.INTERACTIVE:
      payload.type = 'interactive';
      payload.interactive = {
        type: interactive?.type,
        header: interactive?.header,
        body: interactive?.body,
        footer: interactive?.footer,
        action: interactive?.action
      };
      break;
  }

  return payload;
}

// Normalize phone number to E.164 format
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');

  // Handle Romanian numbers
  if (normalized.startsWith('0')) {
    normalized = '40' + normalized.substring(1);
  }

  // Ensure starts with country code
  if (!normalized.startsWith('40') && normalized.length === 9) {
    normalized = '40' + normalized;
  }

  return normalized;
}

// Check if within messaging window
async function isWithinMessagingWindow(
  tenantId: string,
  phoneNumber: string
): Promise<boolean> {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const [lastIncoming] = await db
    .select()
    .from(whatsappMessages)
    .where(
      and(
        eq(whatsappMessages.tenantId, tenantId),
        eq(whatsappMessages.phoneNumber, normalizedPhone),
        eq(whatsappMessages.direction, 'incoming')
      )
    )
    .orderBy(desc(whatsappMessages.timestamp))
    .limit(1);

  if (!lastIncoming) {
    return false;
  }

  const windowEnd = new Date(lastIncoming.timestamp.getTime() + WHATSAPP_CONFIG.messaging.messagingServiceWindow * 1000);
  return new Date() < windowEnd;
}

---

## 5. Queue Configuration

### 5.1 BullMQ Queue Definitions

```typescript
// src/workers/etapa3/document-generation/queues/index.ts
import { Queue, QueueOptions, Worker, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';

// Redis connection for document generation queues
const documentRedisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '64039'),
  db: 3, // Separate DB for document generation
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => Math.min(times * 100, 3000)
});

// ============================================================
// PDF Generation Queue
// ============================================================
export const pdfGenerationQueue = new Queue('document:pdf:generate', {
  connection: documentRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,  // 7 days
      count: 5000
    },
    removeOnFail: {
      age: 30 * 24 * 3600  // 30 days for audit
    },
    priority: 3 // Normal priority
  }
});

// PDF queue worker options
export const pdfWorkerOptions: WorkerOptions = {
  connection: documentRedisConnection,
  concurrency: 5, // Limited due to Puppeteer memory usage
  limiter: {
    max: 20,
    duration: 60000 // 20 PDFs per minute max
  },
  lockDuration: 120000, // 2 minutes for complex PDFs
  stalledInterval: 60000,
  maxStalledCount: 2
};

// ============================================================
// Email Delivery Queue
// ============================================================
export const emailDeliveryQueue = new Queue('document:email:send', {
  connection: documentRedisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: {
      age: 14 * 24 * 3600, // 14 days
      count: 10000
    },
    removeOnFail: {
      age: 30 * 24 * 3600 // 30 days
    },
    priority: 2 // Higher priority for emails
  }
});

// Email queue worker options
export const emailWorkerOptions: WorkerOptions = {
  connection: documentRedisConnection,
  concurrency: 20, // Higher concurrency for emails
  limiter: {
    max: 100,
    duration: 60000 // 100 emails per minute
  },
  lockDuration: 30000, // 30 seconds
  stalledInterval: 30000,
  maxStalledCount: 3
};

// ============================================================
// WhatsApp Delivery Queue
// ============================================================
export const whatsappDeliveryQueue = new Queue('document:whatsapp:send', {
  connection: documentRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'custom',
      delay: (attemptsMade: number) => {
        // WhatsApp rate limits require careful backoff
        const delays = [5000, 30000, 120000]; // 5s, 30s, 2min
        return delays[attemptsMade - 1] || 120000;
      }
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,
      count: 5000
    },
    removeOnFail: {
      age: 30 * 24 * 3600
    },
    priority: 2
  }
});

// WhatsApp queue worker options
export const whatsappWorkerOptions: WorkerOptions = {
  connection: documentRedisConnection,
  concurrency: 10, // Limited by WhatsApp API
  limiter: {
    max: 80, // WhatsApp Business API: ~80 messages/second tier
    duration: 1000
  },
  lockDuration: 60000, // 1 minute
  stalledInterval: 30000,
  maxStalledCount: 2
};

// ============================================================
// Attachment Processing Queue (Sub-queue for large files)
// ============================================================
export const attachmentProcessingQueue = new Queue('document:attachment:process', {
  connection: documentRedisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 10000
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600
    }
  }
});

// Attachment worker options
export const attachmentWorkerOptions: WorkerOptions = {
  connection: documentRedisConnection,
  concurrency: 3, // Limited for large file processing
  limiter: {
    max: 10,
    duration: 60000
  },
  lockDuration: 300000, // 5 minutes for large files
  stalledInterval: 120000,
  maxStalledCount: 1
};
```

### 5.2 Job Priorities

```typescript
// src/workers/etapa3/document-generation/queues/priorities.ts

export enum DocumentJobPriority {
  // Critical - time-sensitive documents
  URGENT_INVOICE = 1,        // Legal deadline approaching
  URGENT_CONTRACT = 1,       // Time-sensitive contract
  
  // High - customer-facing communications
  CUSTOMER_EMAIL = 2,        // Direct customer communication
  WHATSAPP_REPLY = 2,        // WhatsApp conversation reply
  
  // Normal - standard operations
  STANDARD_PDF = 3,          // Regular document generation
  BULK_EMAIL = 3,            // Bulk email campaigns
  SCHEDULED_MESSAGE = 3,     // Scheduled WhatsApp messages
  
  // Low - background tasks
  REPORT_GENERATION = 4,     // Background reports
  ARCHIVE_CREATION = 4,      // Archive/backup documents
  TEMPLATE_PREVIEW = 5       // Preview generation
}

// Priority assignment function
export function assignDocumentPriority(
  documentType: string,
  context: {
    hasDeadline?: boolean;
    deadlineHours?: number;
    isCustomerFacing?: boolean;
    isBulk?: boolean;
    isPreview?: boolean;
  }
): number {
  // Urgent deadline handling
  if (context.hasDeadline && context.deadlineHours !== undefined) {
    if (context.deadlineHours <= 4) return DocumentJobPriority.URGENT_INVOICE;
    if (context.deadlineHours <= 24) return DocumentJobPriority.CUSTOMER_EMAIL;
  }
  
  // Document type mapping
  const typeMapping: Record<string, number> = {
    'invoice': DocumentJobPriority.STANDARD_PDF,
    'proforma': DocumentJobPriority.STANDARD_PDF,
    'contract': context.hasDeadline 
      ? DocumentJobPriority.URGENT_CONTRACT 
      : DocumentJobPriority.STANDARD_PDF,
    'offer': DocumentJobPriority.CUSTOMER_EMAIL,
    'report': DocumentJobPriority.REPORT_GENERATION,
    'archive': DocumentJobPriority.ARCHIVE_CREATION
  };
  
  // Context adjustments
  if (context.isPreview) return DocumentJobPriority.TEMPLATE_PREVIEW;
  if (context.isBulk) return DocumentJobPriority.BULK_EMAIL;
  if (context.isCustomerFacing) return DocumentJobPriority.CUSTOMER_EMAIL;
  
  return typeMapping[documentType] || DocumentJobPriority.STANDARD_PDF;
}

// Job data interfaces
export interface PdfGenerationJobData {
  tenantId: string;
  documentType: DocumentType;
  templateId: string;
  data: Record<string, unknown>;
  options?: PdfGenerationOptions;
  metadata?: {
    negotiationId?: string;
    invoiceId?: string;
    orderId?: string;
    requestedBy?: string;
    deadline?: Date;
  };
}

export interface EmailDeliveryJobData {
  tenantId: string;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  metadata?: {
    campaignId?: string;
    negotiationId?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
  };
}

export interface WhatsAppDeliveryJobData {
  tenantId: string;
  phoneNumber: string;
  messageType: WhatsAppMessageType;
  content: {
    text?: { body: string; previewUrl?: boolean };
    template?: { name: string; language?: string; components?: unknown[] };
    media?: { url?: string; id?: string; caption?: string; filename?: string };
    interactive?: WhatsAppInteractiveContent;
  };
  replyTo?: string;
  metadata?: {
    negotiationId?: string;
    contactId?: string;
    conversationId?: string;
  };
}
```

### 5.3 Queue Events & Monitoring

```typescript
// src/workers/etapa3/document-generation/queues/events.ts
import { QueueEvents } from 'bullmq';
import { logger } from '@/lib/logger';
import { documentMetrics } from '../monitoring/metrics';

// PDF Queue Events
const pdfQueueEvents = new QueueEvents('document:pdf:generate', {
  connection: documentRedisConnection
});

pdfQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info('PDF generation completed', { jobId, returnvalue });
  documentMetrics.pdfJobsCompleted.inc({ status: 'success' });
});

pdfQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('PDF generation failed', { jobId, failedReason });
  documentMetrics.pdfJobsCompleted.inc({ status: 'failed' });
  documentMetrics.pdfErrors.inc({ error_type: categorizeError(failedReason) });
});

pdfQueueEvents.on('stalled', ({ jobId }) => {
  logger.warn('PDF generation stalled', { jobId });
  documentMetrics.pdfJobsStalled.inc();
});

pdfQueueEvents.on('progress', ({ jobId, data }) => {
  logger.debug('PDF generation progress', { jobId, progress: data });
});

// Email Queue Events
const emailQueueEvents = new QueueEvents('document:email:send', {
  connection: documentRedisConnection
});

emailQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  const result = JSON.parse(returnvalue || '{}');
  logger.info('Email delivery completed', { 
    jobId, 
    messageId: result.messageId,
    accepted: result.accepted?.length,
    rejected: result.rejected?.length
  });
  documentMetrics.emailJobsCompleted.inc({ status: 'success' });
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Email delivery failed', { jobId, failedReason });
  documentMetrics.emailJobsCompleted.inc({ status: 'failed' });
  documentMetrics.emailErrors.inc({ error_type: categorizeEmailError(failedReason) });
});

emailQueueEvents.on('stalled', ({ jobId }) => {
  logger.warn('Email delivery stalled', { jobId });
  documentMetrics.emailJobsStalled.inc();
});

// WhatsApp Queue Events
const whatsappQueueEvents = new QueueEvents('document:whatsapp:send', {
  connection: documentRedisConnection
});

whatsappQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  const result = JSON.parse(returnvalue || '{}');
  logger.info('WhatsApp delivery completed', {
    jobId,
    waMessageId: result.waMessageId,
    status: result.status
  });
  documentMetrics.whatsappJobsCompleted.inc({ status: 'success' });
});

whatsappQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('WhatsApp delivery failed', { jobId, failedReason });
  documentMetrics.whatsappJobsCompleted.inc({ status: 'failed' });
  documentMetrics.whatsappErrors.inc({ error_type: categorizeWhatsAppError(failedReason) });
});

// Helper functions
function categorizeError(reason: string): string {
  if (reason.includes('timeout')) return 'timeout';
  if (reason.includes('memory')) return 'memory';
  if (reason.includes('template')) return 'template';
  if (reason.includes('puppeteer')) return 'browser';
  return 'unknown';
}

function categorizeEmailError(reason: string): string {
  if (reason.includes('SMTP')) return 'smtp';
  if (reason.includes('rate')) return 'rate_limit';
  if (reason.includes('bounce')) return 'bounce';
  if (reason.includes('auth')) return 'auth';
  if (reason.includes('connection')) return 'connection';
  return 'unknown';
}

function categorizeWhatsAppError(reason: string): string {
  if (reason.includes('rate')) return 'rate_limit';
  if (reason.includes('window')) return 'messaging_window';
  if (reason.includes('blocked')) return 'blocked';
  if (reason.includes('template')) return 'template';
  if (reason.includes('media')) return 'media';
  return 'unknown';
}
```

### 5.4 Queue Health Checks

```typescript
// src/workers/etapa3/document-generation/queues/health.ts
import { Queue } from 'bullmq';

interface QueueHealthStatus {
  name: string;
  isHealthy: boolean;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  workers: number;
  issues: string[];
}

interface QueueHealthThresholds {
  maxWaiting: number;
  maxFailed: number;
  maxDelayed: number;
  minWorkers: number;
}

const DOCUMENT_QUEUE_THRESHOLDS: Record<string, QueueHealthThresholds> = {
  'document:pdf:generate': {
    maxWaiting: 50,
    maxFailed: 10,
    maxDelayed: 20,
    minWorkers: 1
  },
  'document:email:send': {
    maxWaiting: 200,
    maxFailed: 20,
    maxDelayed: 50,
    minWorkers: 1
  },
  'document:whatsapp:send': {
    maxWaiting: 100,
    maxFailed: 15,
    maxDelayed: 30,
    minWorkers: 1
  },
  'document:attachment:process': {
    maxWaiting: 20,
    maxFailed: 5,
    maxDelayed: 10,
    minWorkers: 1
  }
};

export async function checkDocumentQueueHealth(
  queue: Queue
): Promise<QueueHealthStatus> {
  const [waiting, active, delayed, failed, completed, workers] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getFailedCount(),
    queue.getCompletedCount(),
    queue.getWorkersCount()
  ]);

  const thresholds = DOCUMENT_QUEUE_THRESHOLDS[queue.name] || {
    maxWaiting: 100,
    maxFailed: 20,
    maxDelayed: 50,
    minWorkers: 1
  };

  const issues: string[] = [];

  if (waiting > thresholds.maxWaiting) {
    issues.push(`High waiting count: ${waiting} (threshold: ${thresholds.maxWaiting})`);
  }
  if (failed > thresholds.maxFailed) {
    issues.push(`High failed count: ${failed} (threshold: ${thresholds.maxFailed})`);
  }
  if (delayed > thresholds.maxDelayed) {
    issues.push(`High delayed count: ${delayed} (threshold: ${thresholds.maxDelayed})`);
  }
  if (workers < thresholds.minWorkers) {
    issues.push(`Insufficient workers: ${workers} (minimum: ${thresholds.minWorkers})`);
  }

  return {
    name: queue.name,
    isHealthy: issues.length === 0,
    waiting,
    active,
    delayed,
    failed,
    completed,
    workers,
    issues
  };
}

// Aggregate health check for all document queues
export async function checkAllDocumentQueuesHealth(): Promise<{
  overall: boolean;
  queues: QueueHealthStatus[];
}> {
  const queues = [
    pdfGenerationQueue,
    emailDeliveryQueue,
    whatsappDeliveryQueue,
    attachmentProcessingQueue
  ];

  const healthStatuses = await Promise.all(
    queues.map(q => checkDocumentQueueHealth(q))
  );

  return {
    overall: healthStatuses.every(s => s.isHealthy),
    queues: healthStatuses
  };
}
```

---

## 6. Retry & Error Handling

### 6.1 Error Classification

```typescript
// src/workers/etapa3/document-generation/errors/classification.ts

export enum DocumentErrorType {
  // Retryable errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  BROWSER_CRASH = 'BROWSER_CRASH',
  SMTP_TEMP_FAILURE = 'SMTP_TEMP_FAILURE',
  WHATSAPP_TEMP_FAILURE = 'WHATSAPP_TEMP_FAILURE',
  
  // Non-retryable errors
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_SYNTAX_ERROR = 'TEMPLATE_SYNTAX_ERROR',
  INVALID_DATA = 'INVALID_DATA',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  BLOCKED_RECIPIENT = 'BLOCKED_RECIPIENT',
  MESSAGING_WINDOW_CLOSED = 'MESSAGING_WINDOW_CLOSED',
  MEDIA_TOO_LARGE = 'MEDIA_TOO_LARGE',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export interface DocumentErrorConfig {
  retryable: boolean;
  maxRetries: number;
  backoffMultiplier: number;
  requiresHitl: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'pdf' | 'email' | 'whatsapp' | 'general';
}

export const DOCUMENT_ERROR_CLASSIFICATION: Record<DocumentErrorType, DocumentErrorConfig> = {
  // Retryable
  [DocumentErrorType.NETWORK_ERROR]: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
    category: 'general'
  },
  [DocumentErrorType.TIMEOUT]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
    category: 'general'
  },
  [DocumentErrorType.RATE_LIMIT]: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 3,
    requiresHitl: false,
    severity: 'low',
    category: 'general'
  },
  [DocumentErrorType.SERVER_ERROR]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'high',
    category: 'general'
  },
  [DocumentErrorType.BROWSER_CRASH]: {
    retryable: true,
    maxRetries: 2,
    backoffMultiplier: 2,
    requiresHitl: true,
    severity: 'high',
    category: 'pdf'
  },
  [DocumentErrorType.SMTP_TEMP_FAILURE]: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
    category: 'email'
  },
  [DocumentErrorType.WHATSAPP_TEMP_FAILURE]: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    requiresHitl: false,
    severity: 'medium',
    category: 'whatsapp'
  },
  
  // Non-retryable
  [DocumentErrorType.TEMPLATE_NOT_FOUND]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'high',
    category: 'general'
  },
  [DocumentErrorType.TEMPLATE_SYNTAX_ERROR]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'high',
    category: 'general'
  },
  [DocumentErrorType.INVALID_DATA]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'medium',
    category: 'general'
  },
  [DocumentErrorType.INVALID_EMAIL]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: false,
    severity: 'low',
    category: 'email'
  },
  [DocumentErrorType.INVALID_PHONE]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: false,
    severity: 'low',
    category: 'whatsapp'
  },
  [DocumentErrorType.BLOCKED_RECIPIENT]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'medium',
    category: 'general'
  },
  [DocumentErrorType.MESSAGING_WINDOW_CLOSED]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'medium',
    category: 'whatsapp'
  },
  [DocumentErrorType.MEDIA_TOO_LARGE]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'medium',
    category: 'general'
  },
  [DocumentErrorType.AUTHENTICATION_ERROR]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'critical',
    category: 'general'
  },
  [DocumentErrorType.PERMISSION_DENIED]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'high',
    category: 'general'
  },
  [DocumentErrorType.QUOTA_EXCEEDED]: {
    retryable: false,
    maxRetries: 0,
    backoffMultiplier: 1,
    requiresHitl: true,
    severity: 'critical',
    category: 'general'
  }
};

// Error classification function
export function classifyDocumentError(error: Error | unknown): DocumentErrorType {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as any)?.code;

  // Network errors
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ENETUNREACH') {
    return DocumentErrorType.NETWORK_ERROR;
  }
  if (message.includes('timeout') || code === 'ETIMEDOUT') {
    return DocumentErrorType.TIMEOUT;
  }
  if (message.includes('rate limit') || message.includes('too many requests') || code === 'RATE_LIMIT') {
    return DocumentErrorType.RATE_LIMIT;
  }

  // PDF specific
  if (message.includes('browser') && (message.includes('crash') || message.includes('disconnect'))) {
    return DocumentErrorType.BROWSER_CRASH;
  }

  // Email specific
  if (message.includes('smtp') && (message.includes('temporary') || message.includes('try again'))) {
    return DocumentErrorType.SMTP_TEMP_FAILURE;
  }
  if (message.includes('invalid') && message.includes('email')) {
    return DocumentErrorType.INVALID_EMAIL;
  }

  // WhatsApp specific
  if (message.includes('messaging window') || message.includes('24 hour')) {
    return DocumentErrorType.MESSAGING_WINDOW_CLOSED;
  }
  if (message.includes('invalid') && (message.includes('phone') || message.includes('number'))) {
    return DocumentErrorType.INVALID_PHONE;
  }
  if (message.includes('blocked') || message.includes('blacklist')) {
    return DocumentErrorType.BLOCKED_RECIPIENT;
  }

  // Template errors
  if (message.includes('template') && message.includes('not found')) {
    return DocumentErrorType.TEMPLATE_NOT_FOUND;
  }
  if (message.includes('template') && (message.includes('syntax') || message.includes('parse'))) {
    return DocumentErrorType.TEMPLATE_SYNTAX_ERROR;
  }

  // Data errors
  if (message.includes('invalid') && message.includes('data')) {
    return DocumentErrorType.INVALID_DATA;
  }
  if (message.includes('too large') || message.includes('size limit')) {
    return DocumentErrorType.MEDIA_TOO_LARGE;
  }

  // Auth errors
  if (message.includes('auth') || message.includes('unauthorized') || code === 401) {
    return DocumentErrorType.AUTHENTICATION_ERROR;
  }
  if (message.includes('permission') || message.includes('forbidden') || code === 403) {
    return DocumentErrorType.PERMISSION_DENIED;
  }
  if (message.includes('quota') || message.includes('limit exceeded')) {
    return DocumentErrorType.QUOTA_EXCEEDED;
  }

  // Server errors
  if ((error as any)?.statusCode >= 500 || message.includes('internal server error')) {
    return DocumentErrorType.SERVER_ERROR;
  }

  // Default to non-retryable for unknown errors
  return DocumentErrorType.INVALID_DATA;
}
```

### 6.2 Document Error Class

```typescript
// src/workers/etapa3/document-generation/errors/document-error.ts
import { DocumentErrorType, DOCUMENT_ERROR_CLASSIFICATION, classifyDocumentError } from './classification';

export class DocumentError extends Error {
  readonly errorType: DocumentErrorType;
  readonly isRetryable: boolean;
  readonly maxRetries: number;
  readonly backoffMultiplier: number;
  readonly requiresHitl: boolean;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'pdf' | 'email' | 'whatsapp' | 'general';
  readonly originalError?: Error;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    errorType?: DocumentErrorType,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DocumentError';
    this.originalError = originalError;
    this.context = context;

    // Classify error if not provided
    this.errorType = errorType || classifyDocumentError(originalError || message);

    // Get configuration
    const config = DOCUMENT_ERROR_CLASSIFICATION[this.errorType];
    this.isRetryable = config.retryable;
    this.maxRetries = config.maxRetries;
    this.backoffMultiplier = config.backoffMultiplier;
    this.requiresHitl = config.requiresHitl;
    this.severity = config.severity;
    this.category = config.category;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DocumentError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      errorType: this.errorType,
      isRetryable: this.isRetryable,
      maxRetries: this.maxRetries,
      requiresHitl: this.requiresHitl,
      severity: this.severity,
      category: this.category,
      context: this.context,
      stack: this.stack
    };
  }

  static fromError(error: Error, context?: Record<string, unknown>): DocumentError {
    if (error instanceof DocumentError) {
      return error;
    }
    return new DocumentError(error.message, undefined, error, context);
  }
}
```

### 6.3 Retry Handler

```typescript
// src/workers/etapa3/document-generation/errors/retry-handler.ts
import { Job, DelayedError, UnrecoverableError } from 'bullmq';
import { DocumentError, DocumentErrorType } from './document-error';
import { createDocumentHitlTask } from '../hitl/create-task';
import { logger } from '@/lib/logger';
import { documentMetrics } from '../monitoring/metrics';

// Retry configuration per queue type
export const DOCUMENT_RETRY_CONFIG = {
  pdf: {
    baseDelay: 5000,
    maxDelay: 120000,
    jitterFactor: 0.1
  },
  email: {
    baseDelay: 3000,
    maxDelay: 60000,
    jitterFactor: 0.15
  },
  whatsapp: {
    baseDelay: 5000,
    maxDelay: 120000,
    jitterFactor: 0.2
  }
};

// Calculate backoff delay with jitter
function calculateBackoffDelay(
  attemptsMade: number,
  category: 'pdf' | 'email' | 'whatsapp' | 'general',
  multiplier: number
): number {
  const config = DOCUMENT_RETRY_CONFIG[category as keyof typeof DOCUMENT_RETRY_CONFIG] 
    || DOCUMENT_RETRY_CONFIG.email;
  
  const exponentialDelay = config.baseDelay * Math.pow(multiplier, attemptsMade - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * (Math.random() * 2 - 1);
  
  return Math.round(cappedDelay + jitter);
}

// Main retry handler
export async function handleDocumentRetry<T extends { tenantId: string }>(
  job: Job<T>,
  error: Error,
  category: 'pdf' | 'email' | 'whatsapp'
): Promise<void> {
  const docError = DocumentError.fromError(error, {
    jobId: job.id,
    jobName: job.name,
    attemptsMade: job.attemptsMade,
    data: job.data
  });

  logger.error('Document job error', {
    jobId: job.id,
    errorType: docError.errorType,
    isRetryable: docError.isRetryable,
    attemptsMade: job.attemptsMade,
    maxRetries: docError.maxRetries,
    error: docError.message
  });

  // Record metrics
  documentMetrics.documentErrors.inc({
    category,
    error_type: docError.errorType,
    severity: docError.severity
  });

  // Non-retryable error
  if (!docError.isRetryable) {
    if (docError.requiresHitl) {
      await createDocumentHitlTask(job.data.tenantId, {
        category,
        errorType: docError.errorType,
        errorMessage: docError.message,
        jobId: job.id!,
        jobData: job.data,
        severity: docError.severity
      });
      
      documentMetrics.hitlTasksCreated.inc({ category, error_type: docError.errorType });
    }

    throw new UnrecoverableError(docError.message);
  }

  // Check if max retries exceeded
  if (job.attemptsMade >= docError.maxRetries) {
    logger.warn('Document job max retries exceeded', {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      maxRetries: docError.maxRetries
    });

    // Create HITL task for manual intervention
    await createDocumentHitlTask(job.data.tenantId, {
      category,
      errorType: docError.errorType,
      errorMessage: `Max retries (${docError.maxRetries}) exceeded: ${docError.message}`,
      jobId: job.id!,
      jobData: job.data,
      severity: 'high'
    });

    documentMetrics.hitlTasksCreated.inc({ 
      category, 
      error_type: 'max_retries_exceeded' 
    });

    throw new UnrecoverableError(`Max retries exceeded: ${docError.message}`);
  }

  // Calculate backoff delay
  const delay = calculateBackoffDelay(
    job.attemptsMade,
    docError.category,
    docError.backoffMultiplier
  );

  logger.info('Document job retry scheduled', {
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    nextAttempt: job.attemptsMade + 1,
    delayMs: delay,
    errorType: docError.errorType
  });

  documentMetrics.retriesScheduled.inc({ category, error_type: docError.errorType });

  // Throw delayed error for retry
  throw new DelayedError(`Retry scheduled in ${delay}ms`);
}
```

### 6.4 Idempotency Manager

```typescript
// src/workers/etapa3/document-generation/errors/idempotency.ts
import Redis from 'ioredis';
import crypto from 'crypto';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '64039'),
  db: 3
});

const IDEMPOTENCY_PREFIX = 'doc:idempotency:';
const IDEMPOTENCY_TTL = 24 * 3600; // 24 hours

export interface IdempotencyResult {
  isDuplicate: boolean;
  previousResult?: unknown;
  key: string;
}

export class DocumentIdempotencyManager {
  // Generate idempotency key for PDF
  generatePdfKey(tenantId: string, templateId: string, dataHash: string): string {
    const input = `pdf:${tenantId}:${templateId}:${dataHash}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  // Generate idempotency key for email
  generateEmailKey(
    tenantId: string,
    to: string | string[],
    subject: string,
    templateId?: string
  ): string {
    const recipients = Array.isArray(to) ? to.sort().join(',') : to;
    const input = `email:${tenantId}:${recipients}:${subject}:${templateId || 'custom'}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  // Generate idempotency key for WhatsApp
  generateWhatsAppKey(
    tenantId: string,
    phoneNumber: string,
    messageType: string,
    contentHash: string
  ): string {
    const input = `whatsapp:${tenantId}:${phoneNumber}:${messageType}:${contentHash}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  // Check for duplicate operation
  async checkOperation(key: string): Promise<IdempotencyResult> {
    const fullKey = IDEMPOTENCY_PREFIX + key;
    const existing = await redis.get(fullKey);

    if (existing) {
      const data = JSON.parse(existing);
      
      // Check if operation is still pending
      if (data.status === 'pending') {
        const pendingTime = Date.now() - data.startedAt;
        
        // Consider stale after 10 minutes
        if (pendingTime > 10 * 60 * 1000) {
          // Allow retry for stale pending
          return { isDuplicate: false, key };
        }
        
        // Still processing
        return {
          isDuplicate: true,
          previousResult: { status: 'pending', startedAt: data.startedAt },
          key
        };
      }

      // Completed operation
      return {
        isDuplicate: true,
        previousResult: data.result,
        key
      };
    }

    return { isDuplicate: false, key };
  }

  // Mark operation as started
  async markPending(key: string): Promise<boolean> {
    const fullKey = IDEMPOTENCY_PREFIX + key;
    const data = JSON.stringify({
      status: 'pending',
      startedAt: Date.now()
    });

    // SETNX pattern for atomicity
    const result = await redis.set(fullKey, data, 'EX', IDEMPOTENCY_TTL, 'NX');
    return result === 'OK';
  }

  // Mark operation as completed
  async markCompleted(key: string, result: unknown): Promise<void> {
    const fullKey = IDEMPOTENCY_PREFIX + key;
    const data = JSON.stringify({
      status: 'completed',
      result,
      completedAt: Date.now()
    });

    await redis.set(fullKey, data, 'EX', IDEMPOTENCY_TTL);
  }

  // Mark operation as failed
  async markFailed(key: string, error: string): Promise<void> {
    const fullKey = IDEMPOTENCY_PREFIX + key;
    const data = JSON.stringify({
      status: 'failed',
      error,
      failedAt: Date.now()
    });

    // Shorter TTL for failures to allow retry
    await redis.set(fullKey, data, 'EX', 300); // 5 minutes
  }

  // Clear idempotency record
  async clear(key: string): Promise<void> {
    await redis.del(IDEMPOTENCY_PREFIX + key);
  }

  // Generate content hash for comparison
  static hashContent(content: unknown): string {
    const serialized = JSON.stringify(content, Object.keys(content as object).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
  }
}

export const documentIdempotency = new DocumentIdempotencyManager();
```

### 6.5 Circuit Breaker

```typescript
// src/workers/etapa3/document-generation/errors/circuit-breaker.ts
import CircuitBreaker from 'opossum';
import { logger } from '@/lib/logger';
import { documentMetrics } from '../monitoring/metrics';

// Circuit breaker configurations
const CIRCUIT_BREAKER_CONFIGS = {
  pdf: {
    timeout: 120000, // 2 minutes
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    volumeThreshold: 5
  },
  email: {
    timeout: 30000, // 30 seconds
    errorThresholdPercentage: 40,
    resetTimeout: 30000,
    volumeThreshold: 10
  },
  whatsapp: {
    timeout: 30000,
    errorThresholdPercentage: 40,
    resetTimeout: 30000,
    volumeThreshold: 10
  },
  smtp: {
    timeout: 60000,
    errorThresholdPercentage: 30,
    resetTimeout: 120000,
    volumeThreshold: 5
  },
  whatsappApi: {
    timeout: 30000,
    errorThresholdPercentage: 30,
    resetTimeout: 60000,
    volumeThreshold: 10
  }
};

type CircuitBreakerCategory = keyof typeof CIRCUIT_BREAKER_CONFIGS;

// Create circuit breaker with monitoring
export function createDocumentCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  category: CircuitBreakerCategory,
  name: string
): CircuitBreaker<Parameters<T>, Awaited<ReturnType<T>>> {
  const config = CIRCUIT_BREAKER_CONFIGS[category];

  const breaker = new CircuitBreaker(fn, {
    name: `document:${category}:${name}`,
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    volumeThreshold: config.volumeThreshold,
    rollingCountTimeout: 60000,
    rollingCountBuckets: 10
  });

  // Event handlers
  breaker.on('open', () => {
    logger.warn('Document circuit breaker opened', { category, name });
    documentMetrics.circuitBreakerState.set({ category, name }, 0); // 0 = open
  });

  breaker.on('close', () => {
    logger.info('Document circuit breaker closed', { category, name });
    documentMetrics.circuitBreakerState.set({ category, name }, 1); // 1 = closed
  });

  breaker.on('halfOpen', () => {
    logger.info('Document circuit breaker half-open', { category, name });
    documentMetrics.circuitBreakerState.set({ category, name }, 0.5); // 0.5 = half-open
  });

  breaker.on('reject', () => {
    logger.debug('Document circuit breaker rejected request', { category, name });
    documentMetrics.circuitBreakerRejections.inc({ category, name });
  });

  breaker.on('timeout', () => {
    logger.warn('Document circuit breaker timeout', { category, name });
    documentMetrics.circuitBreakerTimeouts.inc({ category, name });
  });

  breaker.on('success', (result) => {
    documentMetrics.circuitBreakerSuccess.inc({ category, name });
  });

  breaker.on('failure', (error) => {
    documentMetrics.circuitBreakerFailures.inc({ category, name });
  });

  // Initialize state metric
  documentMetrics.circuitBreakerState.set({ category, name }, 1);

  return breaker;
}

// Circuit breakers for external services
export const circuitBreakers = {
  puppeteer: createDocumentCircuitBreaker(
    async (fn: () => Promise<any>) => fn(),
    'pdf',
    'puppeteer'
  ),
  
  smtp: createDocumentCircuitBreaker(
    async (fn: () => Promise<any>) => fn(),
    'smtp',
    'smtp-server'
  ),
  
  whatsappApi: createDocumentCircuitBreaker(
    async (fn: () => Promise<any>) => fn(),
    'whatsappApi',
    'meta-api'
  )
};
```

---

## 7. Monitoring & Metrics

### 7.1 Prometheus Metrics

```typescript
// src/workers/etapa3/document-generation/monitoring/metrics.ts
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

const register = new Registry();

// ============================================================
// PDF Generation Metrics
// ============================================================
export const pdfGenerationsTotal = new Counter({
  name: 'document_pdf_generations_total',
  help: 'Total PDF documents generated',
  labelNames: ['tenant_id', 'document_type', 'template_id', 'status'],
  registers: [register]
});

export const pdfGenerationDuration = new Histogram({
  name: 'document_pdf_generation_duration_seconds',
  help: 'PDF generation duration in seconds',
  labelNames: ['tenant_id', 'document_type', 'template_id'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 120],
  registers: [register]
});

export const pdfFileSizeBytes = new Histogram({
  name: 'document_pdf_file_size_bytes',
  help: 'Generated PDF file size in bytes',
  labelNames: ['document_type'],
  buckets: [10000, 50000, 100000, 500000, 1000000, 5000000, 10000000],
  registers: [register]
});

export const pdfPageCount = new Histogram({
  name: 'document_pdf_page_count',
  help: 'Number of pages in generated PDF',
  labelNames: ['document_type'],
  buckets: [1, 2, 3, 5, 10, 20, 50, 100],
  registers: [register]
});

export const pdfBrowserInstances = new Gauge({
  name: 'document_pdf_browser_instances',
  help: 'Number of active Puppeteer browser instances',
  registers: [register]
});

export const pdfMemoryUsage = new Gauge({
  name: 'document_pdf_memory_usage_bytes',
  help: 'Memory usage of PDF generation process',
  registers: [register]
});

// ============================================================
// Email Delivery Metrics
// ============================================================
export const emailsSentTotal = new Counter({
  name: 'document_emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['tenant_id', 'template_id', 'status', 'provider'],
  registers: [register]
});

export const emailDeliveryDuration = new Histogram({
  name: 'document_email_delivery_duration_seconds',
  help: 'Email delivery duration in seconds',
  labelNames: ['tenant_id', 'provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

export const emailRecipientsCount = new Histogram({
  name: 'document_email_recipients_count',
  help: 'Number of recipients per email',
  buckets: [1, 2, 5, 10, 20, 50, 100],
  registers: [register]
});

export const emailAttachmentsCount = new Histogram({
  name: 'document_email_attachments_count',
  help: 'Number of attachments per email',
  buckets: [0, 1, 2, 3, 5, 10],
  registers: [register]
});

export const emailAttachmentsSizeBytes = new Histogram({
  name: 'document_email_attachments_size_bytes',
  help: 'Total size of email attachments in bytes',
  buckets: [0, 10000, 100000, 1000000, 5000000, 10000000, 25000000],
  registers: [register]
});

export const emailBounceRate = new Gauge({
  name: 'document_email_bounce_rate',
  help: 'Email bounce rate (last hour)',
  labelNames: ['tenant_id'],
  registers: [register]
});

export const emailOpenRate = new Gauge({
  name: 'document_email_open_rate',
  help: 'Email open rate (last 24 hours)',
  labelNames: ['tenant_id', 'campaign_id'],
  registers: [register]
});

export const emailClickRate = new Gauge({
  name: 'document_email_click_rate',
  help: 'Email click rate (last 24 hours)',
  labelNames: ['tenant_id', 'campaign_id'],
  registers: [register]
});

// ============================================================
// WhatsApp Delivery Metrics
// ============================================================
export const whatsappMessagesSentTotal = new Counter({
  name: 'document_whatsapp_messages_sent_total',
  help: 'Total WhatsApp messages sent',
  labelNames: ['tenant_id', 'message_type', 'status'],
  registers: [register]
});

export const whatsappDeliveryDuration = new Histogram({
  name: 'document_whatsapp_delivery_duration_seconds',
  help: 'WhatsApp message delivery duration in seconds',
  labelNames: ['tenant_id', 'message_type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [register]
});

export const whatsappMediaUploadDuration = new Histogram({
  name: 'document_whatsapp_media_upload_duration_seconds',
  help: 'WhatsApp media upload duration in seconds',
  labelNames: ['media_type'],
  buckets: [1, 2, 5, 10, 30, 60, 120],
  registers: [register]
});

export const whatsappTemplateUsage = new Counter({
  name: 'document_whatsapp_template_usage_total',
  help: 'WhatsApp template usage count',
  labelNames: ['tenant_id', 'template_name', 'language'],
  registers: [register]
});

export const whatsappMessagingWindowStatus = new Gauge({
  name: 'document_whatsapp_messaging_window_active',
  help: 'Number of active messaging windows per tenant',
  labelNames: ['tenant_id'],
  registers: [register]
});

export const whatsappRateLimitRemaining = new Gauge({
  name: 'document_whatsapp_rate_limit_remaining',
  help: 'Remaining WhatsApp API rate limit',
  labelNames: ['tenant_id'],
  registers: [register]
});

// ============================================================
// Queue Metrics
// ============================================================
export const documentQueueDepth = new Gauge({
  name: 'document_queue_depth',
  help: 'Number of jobs in document queues',
  labelNames: ['queue_name', 'state'],
  registers: [register]
});

export const documentJobsProcessed = new Counter({
  name: 'document_jobs_processed_total',
  help: 'Total document jobs processed',
  labelNames: ['queue_name', 'status'],
  registers: [register]
});

export const documentJobWaitTime = new Histogram({
  name: 'document_job_wait_time_seconds',
  help: 'Time jobs wait in queue before processing',
  labelNames: ['queue_name'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register]
});

export const documentJobsStalled = new Counter({
  name: 'document_jobs_stalled_total',
  help: 'Total stalled document jobs',
  labelNames: ['queue_name'],
  registers: [register]
});

// ============================================================
// Error Metrics
// ============================================================
export const documentErrors = new Counter({
  name: 'document_errors_total',
  help: 'Total document processing errors',
  labelNames: ['category', 'error_type', 'severity'],
  registers: [register]
});

export const documentRetries = new Counter({
  name: 'document_retries_total',
  help: 'Total document job retries',
  labelNames: ['category', 'error_type'],
  registers: [register]
});

export const hitlTasksCreated = new Counter({
  name: 'document_hitl_tasks_created_total',
  help: 'Total HITL tasks created for documents',
  labelNames: ['category', 'error_type'],
  registers: [register]
});

// ============================================================
// Circuit Breaker Metrics
// ============================================================
export const circuitBreakerState = new Gauge({
  name: 'document_circuit_breaker_state',
  help: 'Circuit breaker state (0=open, 0.5=half-open, 1=closed)',
  labelNames: ['category', 'name'],
  registers: [register]
});

export const circuitBreakerRejections = new Counter({
  name: 'document_circuit_breaker_rejections_total',
  help: 'Total circuit breaker rejections',
  labelNames: ['category', 'name'],
  registers: [register]
});

export const circuitBreakerTimeouts = new Counter({
  name: 'document_circuit_breaker_timeouts_total',
  help: 'Total circuit breaker timeouts',
  labelNames: ['category', 'name'],
  registers: [register]
});

export const circuitBreakerSuccess = new Counter({
  name: 'document_circuit_breaker_success_total',
  help: 'Total successful circuit breaker calls',
  labelNames: ['category', 'name'],
  registers: [register]
});

export const circuitBreakerFailures = new Counter({
  name: 'document_circuit_breaker_failures_total',
  help: 'Total failed circuit breaker calls',
  labelNames: ['category', 'name'],
  registers: [register]
});

// Export combined metrics object
export const documentMetrics = {
  // PDF
  pdfGenerationsTotal,
  pdfGenerationDuration,
  pdfFileSizeBytes,
  pdfPageCount,
  pdfBrowserInstances,
  pdfMemoryUsage,
  pdfJobsCompleted: documentJobsProcessed,
  pdfErrors: documentErrors,
  pdfJobsStalled: documentJobsStalled,
  
  // Email
  emailsSentTotal,
  emailDeliveryDuration,
  emailRecipientsCount,
  emailAttachmentsCount,
  emailAttachmentsSizeBytes,
  emailBounceRate,
  emailOpenRate,
  emailClickRate,
  emailJobsCompleted: documentJobsProcessed,
  emailErrors: documentErrors,
  emailJobsStalled: documentJobsStalled,
  
  // WhatsApp
  whatsappMessagesSentTotal,
  whatsappDeliveryDuration,
  whatsappMediaUploadDuration,
  whatsappTemplateUsage,
  whatsappMessagingWindowStatus,
  whatsappRateLimitRemaining,
  whatsappJobsCompleted: documentJobsProcessed,
  whatsappErrors: documentErrors,
  whatsappJobsStalled: documentJobsStalled,
  
  // Queue
  documentQueueDepth,
  documentJobsProcessed,
  documentJobWaitTime,
  documentJobsStalled,
  
  // Errors
  documentErrors,
  documentRetries,
  retriesScheduled: documentRetries,
  hitlTasksCreated,
  
  // Circuit Breakers
  circuitBreakerState,
  circuitBreakerRejections,
  circuitBreakerTimeouts,
  circuitBreakerSuccess,
  circuitBreakerFailures,
  
  // Registry
  register
};
```

### 7.2 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Etapa 3 - Document Generation",
    "uid": "etapa3-documents",
    "tags": ["etapa3", "documents", "pdf", "email", "whatsapp"],
    "timezone": "Europe/Bucharest",
    "refresh": "30s",
    "panels": [
      {
        "title": "Overview",
        "type": "row",
        "gridPos": { "x": 0, "y": 0, "w": 24, "h": 1 }
      },
      {
        "title": "PDFs Generated Today",
        "type": "stat",
        "gridPos": { "x": 0, "y": 1, "w": 4, "h": 4 },
        "targets": [{
          "expr": "sum(increase(document_pdf_generations_total{status=\"success\"}[24h]))",
          "legendFormat": "PDFs"
        }],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      },
      {
        "title": "Emails Sent Today",
        "type": "stat",
        "gridPos": { "x": 4, "y": 1, "w": 4, "h": 4 },
        "targets": [{
          "expr": "sum(increase(document_emails_sent_total{status=\"success\"}[24h]))",
          "legendFormat": "Emails"
        }],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      },
      {
        "title": "WhatsApp Messages Today",
        "type": "stat",
        "gridPos": { "x": 8, "y": 1, "w": 4, "h": 4 },
        "targets": [{
          "expr": "sum(increase(document_whatsapp_messages_sent_total{status=\"success\"}[24h]))",
          "legendFormat": "Messages"
        }],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      },
      {
        "title": "Overall Success Rate",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 1, "w": 4, "h": 4 },
        "targets": [{
          "expr": "sum(rate(document_jobs_processed_total{status=\"success\"}[1h])) / sum(rate(document_jobs_processed_total[1h])) * 100"
        }],
        "options": {
          "min": 0,
          "max": 100,
          "thresholds": {
            "steps": [
              { "value": 0, "color": "red" },
              { "value": 90, "color": "yellow" },
              { "value": 98, "color": "green" }
            ]
          }
        }
      },
      {
        "title": "Active Errors",
        "type": "stat",
        "gridPos": { "x": 16, "y": 1, "w": 4, "h": 4 },
        "targets": [{
          "expr": "sum(increase(document_errors_total[1h]))",
          "legendFormat": "Errors"
        }],
        "options": {
          "colorMode": "value",
          "graphMode": "none",
          "thresholds": {
            "steps": [
              { "value": 0, "color": "green" },
              { "value": 10, "color": "yellow" },
              { "value": 50, "color": "red" }
            ]
          }
        }
      },
      {
        "title": "HITL Tasks Pending",
        "type": "stat",
        "gridPos": { "x": 20, "y": 1, "w": 4, "h": 4 },
        "targets": [{
          "expr": "sum(increase(document_hitl_tasks_created_total[24h]))",
          "legendFormat": "HITL Tasks"
        }],
        "options": {
          "colorMode": "value",
          "thresholds": {
            "steps": [
              { "value": 0, "color": "green" },
              { "value": 5, "color": "yellow" },
              { "value": 20, "color": "red" }
            ]
          }
        }
      },
      {
        "title": "PDF Generation",
        "type": "row",
        "gridPos": { "x": 0, "y": 5, "w": 24, "h": 1 }
      },
      {
        "title": "PDF Generation Rate",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 6, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(document_pdf_generations_total{status=\"success\"}[5m])) * 60",
            "legendFormat": "Success"
          },
          {
            "expr": "sum(rate(document_pdf_generations_total{status=\"failed\"}[5m])) * 60",
            "legendFormat": "Failed"
          }
        ],
        "options": {
          "legend": { "displayMode": "table" }
        }
      },
      {
        "title": "PDF Generation Duration (P95)",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 6, "w": 12, "h": 8 },
        "targets": [{
          "expr": "histogram_quantile(0.95, sum(rate(document_pdf_generation_duration_seconds_bucket[5m])) by (le, document_type))",
          "legendFormat": "{{document_type}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "title": "PDF by Document Type",
        "type": "piechart",
        "gridPos": { "x": 0, "y": 14, "w": 6, "h": 6 },
        "targets": [{
          "expr": "sum(increase(document_pdf_generations_total[24h])) by (document_type)",
          "legendFormat": "{{document_type}}"
        }]
      },
      {
        "title": "PDF File Size Distribution",
        "type": "histogram",
        "gridPos": { "x": 6, "y": 14, "w": 6, "h": 6 },
        "targets": [{
          "expr": "sum(rate(document_pdf_file_size_bytes_bucket[1h])) by (le)",
          "legendFormat": "{{le}}"
        }]
      },
      {
        "title": "Browser Instances",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 14, "w": 6, "h": 6 },
        "targets": [{
          "expr": "document_pdf_browser_instances"
        }],
        "options": {
          "min": 0,
          "max": 10,
          "thresholds": {
            "steps": [
              { "value": 0, "color": "green" },
              { "value": 7, "color": "yellow" },
              { "value": 9, "color": "red" }
            ]
          }
        }
      },
      {
        "title": "PDF Memory Usage",
        "type": "timeseries",
        "gridPos": { "x": 18, "y": 14, "w": 6, "h": 6 },
        "targets": [{
          "expr": "document_pdf_memory_usage_bytes"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "bytes"
          }
        }
      },
      {
        "title": "Email Delivery",
        "type": "row",
        "gridPos": { "x": 0, "y": 20, "w": 24, "h": 1 }
      },
      {
        "title": "Email Delivery Rate",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 21, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(document_emails_sent_total{status=\"success\"}[5m])) * 60",
            "legendFormat": "Delivered"
          },
          {
            "expr": "sum(rate(document_emails_sent_total{status=\"failed\"}[5m])) * 60",
            "legendFormat": "Failed"
          },
          {
            "expr": "sum(rate(document_emails_sent_total{status=\"bounced\"}[5m])) * 60",
            "legendFormat": "Bounced"
          }
        ]
      },
      {
        "title": "Email Bounce Rate",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 21, "w": 12, "h": 8 },
        "targets": [{
          "expr": "document_email_bounce_rate",
          "legendFormat": "{{tenant_id}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 0.02, "color": "yellow" },
                { "value": 0.05, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "title": "WhatsApp Delivery",
        "type": "row",
        "gridPos": { "x": 0, "y": 29, "w": 24, "h": 1 }
      },
      {
        "title": "WhatsApp Message Rate",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 30, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(document_whatsapp_messages_sent_total{status=\"success\"}[5m])) * 60",
            "legendFormat": "Sent"
          },
          {
            "expr": "sum(rate(document_whatsapp_messages_sent_total{status=\"delivered\"}[5m])) * 60",
            "legendFormat": "Delivered"
          },
          {
            "expr": "sum(rate(document_whatsapp_messages_sent_total{status=\"read\"}[5m])) * 60",
            "legendFormat": "Read"
          },
          {
            "expr": "sum(rate(document_whatsapp_messages_sent_total{status=\"failed\"}[5m])) * 60",
            "legendFormat": "Failed"
          }
        ]
      },
      {
        "title": "WhatsApp Rate Limit",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 30, "w": 12, "h": 8 },
        "targets": [{
          "expr": "document_whatsapp_rate_limit_remaining",
          "legendFormat": "{{tenant_id}}"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 10, "color": "yellow" },
                { "value": 50, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "title": "Queue Health",
        "type": "row",
        "gridPos": { "x": 0, "y": 38, "w": 24, "h": 1 }
      },
      {
        "title": "Queue Depths",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 39, "w": 12, "h": 8 },
        "targets": [{
          "expr": "document_queue_depth",
          "legendFormat": "{{queue_name}} - {{state}}"
        }]
      },
      {
        "title": "Circuit Breaker Status",
        "type": "stat",
        "gridPos": { "x": 12, "y": 39, "w": 12, "h": 8 },
        "targets": [{
          "expr": "document_circuit_breaker_state",
          "legendFormat": "{{category}} - {{name}}"
        }],
        "options": {
          "colorMode": "value",
          "graphMode": "none",
          "textMode": "value_and_name"
        },
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

### 7.3 Alert Rules

```yaml
# /etc/prometheus/rules/document-alerts.yml
groups:
  - name: document_critical
    interval: 30s
    rules:
      - alert: DocumentHighErrorRate
        expr: |
          sum(rate(document_errors_total[5m])) 
          / sum(rate(document_jobs_processed_total[5m])) > 0.1
        for: 5m
        labels:
          severity: critical
          team: operations
        annotations:
          summary: "High document processing error rate"
          description: "Error rate is {{ $value | humanizePercentage }} over last 5 minutes"
          runbook: "https://wiki.cerniq.app/runbooks/document-errors"

      - alert: PDFBrowserCrash
        expr: increase(document_errors_total{error_type="BROWSER_CRASH"}[15m]) > 3
        for: 5m
        labels:
          severity: critical
          team: operations
        annotations:
          summary: "Multiple Puppeteer browser crashes"
          description: "{{ $value }} browser crashes in last 15 minutes"
          runbook: "https://wiki.cerniq.app/runbooks/pdf-browser-crash"

      - alert: EmailDeliveryDown
        expr: |
          sum(rate(document_emails_sent_total{status="success"}[10m])) == 0
          and sum(document_queue_depth{queue_name="document:email:send",state="waiting"}) > 10
        for: 10m
        labels:
          severity: critical
          team: operations
        annotations:
          summary: "Email delivery appears to be down"
          description: "No successful email deliveries in 10 minutes with {{ $value }} waiting"

      - alert: WhatsAppAPIDown
        expr: document_circuit_breaker_state{category="whatsappApi"} == 0
        for: 5m
        labels:
          severity: critical
          team: operations
        annotations:
          summary: "WhatsApp API circuit breaker open"
          description: "WhatsApp API is unavailable"

  - name: document_warnings
    interval: 60s
    rules:
      - alert: HighQueueBacklog
        expr: document_queue_depth{state="waiting"} > 100
        for: 10m
        labels:
          severity: warning
          team: operations
        annotations:
          summary: "High document queue backlog"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} waiting jobs"

      - alert: SlowPDFGeneration
        expr: |
          histogram_quantile(0.95, 
            sum(rate(document_pdf_generation_duration_seconds_bucket[5m])) by (le)
          ) > 60
        for: 15m
        labels:
          severity: warning
          team: operations
        annotations:
          summary: "Slow PDF generation"
          description: "P95 PDF generation time is {{ $value | humanizeDuration }}"

      - alert: HighEmailBounceRate
        expr: document_email_bounce_rate > 0.05
        for: 30m
        labels:
          severity: warning
          team: operations
        annotations:
          summary: "High email bounce rate"
          description: "Bounce rate for {{ $labels.tenant_id }} is {{ $value | humanizePercentage }}"

      - alert: WhatsAppRateLimitLow
        expr: document_whatsapp_rate_limit_remaining < 10
        for: 5m
        labels:
          severity: warning
          team: operations
        annotations:
          summary: "WhatsApp rate limit approaching"
          description: "Only {{ $value }} API calls remaining for {{ $labels.tenant_id }}"

      - alert: HighRetryRate
        expr: |
          sum(rate(document_retries_total[10m])) 
          / sum(rate(document_jobs_processed_total[10m])) > 0.2
        for: 15m
        labels:
          severity: warning
          team: operations
        annotations:
          summary: "High document retry rate"
          description: "{{ $value | humanizePercentage }} of jobs require retries"

      - alert: CircuitBreakerTripped
        expr: document_circuit_breaker_state < 1
        for: 2m
        labels:
          severity: warning
          team: operations
        annotations:
          summary: "Circuit breaker not fully closed"
          description: "{{ $labels.category }}/{{ $labels.name }} circuit breaker is {{ if eq $value 0.0 }}OPEN{{ else }}HALF-OPEN{{ end }}"

  - name: document_info
    interval: 300s
    rules:
      - alert: DocumentDailySummary
        expr: hour() == 8 and minute() < 5 and day_of_week() >= 1 and day_of_week() <= 5
        labels:
          severity: info
          team: operations
        annotations:
          summary: "Daily document processing summary"
          description: |
            PDFs: {{ with query "sum(increase(document_pdf_generations_total{status='success'}[24h]))" }}{{ . | first | value | humanize }}{{ end }}
            Emails: {{ with query "sum(increase(document_emails_sent_total{status='success'}[24h]))" }}{{ . | first | value | humanize }}{{ end }}
            WhatsApp: {{ with query "sum(increase(document_whatsapp_messages_sent_total{status='success'}[24h]))" }}{{ . | first | value | humanize }}{{ end }}
```

### 7.4 Structured Logging

```typescript
// src/workers/etapa3/document-generation/monitoring/logger.ts
import { logger } from '@/lib/logger';

export interface DocumentLogContext {
  tenantId: string;
  jobId?: string;
  documentType?: string;
  templateId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  negotiationId?: string;
  errorType?: string;
  errorMessage?: string;
  duration?: number;
  fileSize?: number;
  pageCount?: number;
}

export function createDocumentLogger(category: 'pdf' | 'email' | 'whatsapp') {
  const baseContext = { category, component: 'document-generation' };

  return {
    jobStarted(ctx: DocumentLogContext): void {
      logger.info('Document job started', {
        ...baseContext,
        ...ctx,
        event: 'job_started'
      });
    },

    jobCompleted(ctx: DocumentLogContext & { result?: unknown }): void {
      logger.info('Document job completed', {
        ...baseContext,
        ...ctx,
        event: 'job_completed'
      });
    },

    jobFailed(ctx: DocumentLogContext): void {
      logger.error('Document job failed', {
        ...baseContext,
        ...ctx,
        event: 'job_failed'
      });
    },

    templateRendered(ctx: DocumentLogContext & { templateName?: string }): void {
      logger.debug('Template rendered', {
        ...baseContext,
        ...ctx,
        event: 'template_rendered'
      });
    },

    deliveryAttempt(ctx: DocumentLogContext & { attempt?: number }): void {
      logger.info('Delivery attempt', {
        ...baseContext,
        ...ctx,
        event: 'delivery_attempt'
      });
    },

    deliverySuccess(ctx: DocumentLogContext & { messageId?: string }): void {
      logger.info('Delivery successful', {
        ...baseContext,
        ...ctx,
        event: 'delivery_success'
      });
    },

    deliveryFailed(ctx: DocumentLogContext): void {
      logger.error('Delivery failed', {
        ...baseContext,
        ...ctx,
        event: 'delivery_failed'
      });
    },

    retryScheduled(ctx: DocumentLogContext & { delay?: number; attempt?: number }): void {
      logger.info('Retry scheduled', {
        ...baseContext,
        ...ctx,
        event: 'retry_scheduled'
      });
    },

    hitlCreated(ctx: DocumentLogContext & { taskId?: string; priority?: number }): void {
      logger.warn('HITL task created', {
        ...baseContext,
        ...ctx,
        event: 'hitl_created'
      });
    },

    circuitBreakerEvent(ctx: { state: string; service: string }): void {
      logger.warn('Circuit breaker event', {
        ...baseContext,
        ...ctx,
        event: 'circuit_breaker'
      });
    },

    rateLimitApproaching(ctx: DocumentLogContext & { remaining?: number }): void {
      logger.warn('Rate limit approaching', {
        ...baseContext,
        ...ctx,
        event: 'rate_limit_warning'
      });
    }
  };
}

// Pre-configured loggers
export const pdfLogger = createDocumentLogger('pdf');
export const emailLogger = createDocumentLogger('email');
export const whatsappLogger = createDocumentLogger('whatsapp');
```

---

## 8. Testing Specification

### 8.1 Unit Tests

```typescript
// tests/unit/workers/etapa3/document-generation/pdf-generator.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PdfDocumentGenerator } from '@/workers/etapa3/document-generation/pdf/generator';
import { DocumentType } from '@/workers/etapa3/document-generation/types';
import * as puppeteer from 'puppeteer';

vi.mock('puppeteer');

describe('PdfDocumentGenerator', () => {
  let generator: PdfDocumentGenerator;

  beforeEach(() => {
    generator = new PdfDocumentGenerator();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePdf', () => {
    it('should generate PDF with valid invoice data', async () => {
      const mockPage = {
        setContent: vi.fn(),
        pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
        close: vi.fn()
      };
      
      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn()
      };

      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      const result = await generator.generatePdf({
        templateId: 'invoice-default',
        documentType: DocumentType.INVOICE,
        data: {
          invoiceNumber: 'INV-2026-001',
          date: '2026-01-18',
          customer: { name: 'Test SRL', cui: 'RO12345678' },
          items: [{ name: 'Product A', quantity: 10, price: 100 }],
          total: 1000
        }
      });

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalled();
    });

    it('should throw error for invalid template', async () => {
      await expect(
        generator.generatePdf({
          templateId: 'non-existent-template',
          documentType: DocumentType.INVOICE,
          data: {}
        })
      ).rejects.toThrow('Template not found');
    });

    it('should apply custom PDF options', async () => {
      const mockPage = {
        setContent: vi.fn(),
        pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
        close: vi.fn()
      };
      
      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn()
      };

      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      await generator.generatePdf({
        templateId: 'invoice-default',
        documentType: DocumentType.INVOICE,
        data: { invoiceNumber: 'TEST-001' },
        options: {
          format: 'A4',
          landscape: true,
          margin: { top: '2cm', bottom: '2cm' }
        }
      });

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          landscape: true
        })
      );
    });
  });

  describe('renderTemplate', () => {
    it('should render Handlebars template with data', async () => {
      const template = '<h1>{{title}}</h1>';
      const data = { title: 'Test Invoice' };

      const result = await generator.renderTemplate(template, data);

      expect(result).toContain('<h1>Test Invoice</h1>');
    });

    it('should handle Romanian characters correctly', async () => {
      const template = '<p>{{message}}</p>';
      const data = { message: 'Factura pentru produse agricole - țară, județ' };

      const result = await generator.renderTemplate(template, data);

      expect(result).toContain('țară');
      expect(result).toContain('județ');
    });

    it('should format currency values', async () => {
      const template = '<span>{{formatCurrency total}}</span>';
      const data = { total: 1234.56 };

      const result = await generator.renderTemplate(template, data);

      expect(result).toContain('1.234,56');
    });
  });
});

// tests/unit/workers/etapa3/document-generation/email-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmailRecipient, validateEmailContent } from '@/workers/etapa3/document-generation/email/validator';

describe('Email Validator', () => {
  describe('validateEmailRecipient', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.ro',
        'user+tag@subdomain.example.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmailRecipient(email).isValid).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@nodomain.com',
        'spaces in@email.com',
        'missing@tld'
      ];

      invalidEmails.forEach(email => {
        expect(validateEmailRecipient(email).isValid).toBe(false);
      });
    });

    it('should detect disposable email domains', () => {
      const disposableEmails = [
        'test@tempmail.com',
        'user@guerrillamail.com',
        'fake@10minutemail.com'
      ];

      disposableEmails.forEach(email => {
        const result = validateEmailRecipient(email);
        expect(result.warnings).toContain('disposable_domain');
      });
    });
  });

  describe('validateEmailContent', () => {
    it('should accept valid email content', () => {
      const result = validateEmailContent({
        subject: 'Test Subject',
        html: '<p>Valid HTML content</p>',
        text: 'Plain text fallback'
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty subject', () => {
      const result = validateEmailContent({
        subject: '',
        html: '<p>Content</p>'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('empty_subject');
    });

    it('should warn about missing text fallback', () => {
      const result = validateEmailContent({
        subject: 'Test',
        html: '<p>HTML only</p>'
      });

      expect(result.warnings).toContain('missing_text_fallback');
    });

    it('should detect spam-like content', () => {
      const result = validateEmailContent({
        subject: 'FREE MONEY!!! URGENT!!!',
        html: '<p>Click here to WIN BIG</p>'
      });

      expect(result.warnings).toContain('spam_likelihood_high');
    });
  });
});

// tests/unit/workers/etapa3/document-generation/whatsapp-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validatePhoneNumber, validateWhatsAppMessage } from '@/workers/etapa3/document-generation/whatsapp/validator';

describe('WhatsApp Validator', () => {
  describe('validatePhoneNumber', () => {
    it('should accept valid Romanian phone numbers', () => {
      const validNumbers = [
        '+40722123456',
        '0722123456',
        '40722123456',
        '+40 722 123 456'
      ];

      validNumbers.forEach(number => {
        expect(validatePhoneNumber(number).isValid).toBe(true);
      });
    });

    it('should normalize phone numbers to E.164 format', () => {
      expect(validatePhoneNumber('0722123456').normalized).toBe('40722123456');
      expect(validatePhoneNumber('+40722123456').normalized).toBe('40722123456');
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '123',
        'not-a-number',
        '+40123' // too short
      ];

      invalidNumbers.forEach(number => {
        expect(validatePhoneNumber(number).isValid).toBe(false);
      });
    });
  });

  describe('validateWhatsAppMessage', () => {
    it('should accept valid text message', () => {
      const result = validateWhatsAppMessage({
        type: 'text',
        content: { text: { body: 'Hello, this is a test message' } }
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject text message exceeding limit', () => {
      const result = validateWhatsAppMessage({
        type: 'text',
        content: { text: { body: 'a'.repeat(4097) } } // Exceeds 4096 limit
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('text_too_long');
    });

    it('should validate template parameters', () => {
      const result = validateWhatsAppMessage({
        type: 'template',
        content: {
          template: {
            name: 'order_confirmation',
            language: 'ro',
            components: [
              { type: 'body', parameters: [{ type: 'text', text: 'Order #123' }] }
            ]
          }
        }
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid media URL', () => {
      const result = validateWhatsAppMessage({
        type: 'image',
        content: {
          media: { url: 'not-a-valid-url' }
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid_media_url');
    });
  });
});

// tests/unit/workers/etapa3/document-generation/idempotency.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentIdempotencyManager } from '@/workers/etapa3/document-generation/errors/idempotency';
import Redis from 'ioredis';

vi.mock('ioredis');

describe('DocumentIdempotencyManager', () => {
  let manager: DocumentIdempotencyManager;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn()
    };
    vi.mocked(Redis).mockImplementation(() => mockRedis);
    manager = new DocumentIdempotencyManager();
  });

  describe('generatePdfKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = manager.generatePdfKey('tenant-1', 'template-1', 'hash-1');
      const key2 = manager.generatePdfKey('tenant-1', 'template-1', 'hash-1');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = manager.generatePdfKey('tenant-1', 'template-1', 'hash-1');
      const key2 = manager.generatePdfKey('tenant-1', 'template-1', 'hash-2');

      expect(key1).not.toBe(key2);
    });
  });

  describe('checkOperation', () => {
    it('should return isDuplicate=false for new operation', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await manager.checkOperation('new-key');

      expect(result.isDuplicate).toBe(false);
    });

    it('should return isDuplicate=true for completed operation', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        status: 'completed',
        result: { success: true }
      }));

      const result = await manager.checkOperation('existing-key');

      expect(result.isDuplicate).toBe(true);
      expect(result.previousResult).toEqual({ success: true });
    });

    it('should allow retry for stale pending operation', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        status: 'pending',
        startedAt: Date.now() - 15 * 60 * 1000 // 15 minutes ago
      }));

      const result = await manager.checkOperation('stale-key');

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('markPending', () => {
    it('should use SETNX pattern', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await manager.markPending('new-key');

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        expect.any(Number),
        'NX'
      );
    });

    it('should return false if key already exists', async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await manager.markPending('existing-key');

      expect(result).toBe(false);
    });
  });
});

// tests/unit/workers/etapa3/document-generation/error-classification.test.ts
import { describe, it, expect } from 'vitest';
import { classifyDocumentError, DocumentErrorType } from '@/workers/etapa3/document-generation/errors/classification';

describe('Error Classification', () => {
  it('should classify network errors', () => {
    const error = new Error('ECONNREFUSED');
    (error as any).code = 'ECONNREFUSED';

    expect(classifyDocumentError(error)).toBe(DocumentErrorType.NETWORK_ERROR);
  });

  it('should classify timeout errors', () => {
    const error = new Error('Connection timeout after 30000ms');

    expect(classifyDocumentError(error)).toBe(DocumentErrorType.TIMEOUT);
  });

  it('should classify rate limit errors', () => {
    const error = new Error('Rate limit exceeded. Too many requests.');

    expect(classifyDocumentError(error)).toBe(DocumentErrorType.RATE_LIMIT);
  });

  it('should classify browser crash errors', () => {
    const error = new Error('Browser disconnected unexpectedly');

    expect(classifyDocumentError(error)).toBe(DocumentErrorType.BROWSER_CRASH);
  });

  it('should classify invalid email errors', () => {
    const error = new Error('Invalid email address format');

    expect(classifyDocumentError(error)).toBe(DocumentErrorType.INVALID_EMAIL);
  });

  it('should classify messaging window errors', () => {
    const error = new Error('Cannot send message: 24 hour messaging window closed');

    expect(classifyDocumentError(error)).toBe(DocumentErrorType.MESSAGING_WINDOW_CLOSED);
  });

  it('should classify authentication errors', () => {
    const error = new Error('Unauthorized');
    (error as any).statusCode = 401;

    expect(classifyDocumentError(error)).toBe(DocumentErrorType.AUTHENTICATION_ERROR);
  });
});
```

### 8.2 Integration Tests

```typescript
// tests/integration/workers/etapa3/document-generation/pdf-worker.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestContainer, TestContainer } from '@/tests/utils/container';
import { pdfGenerationQueue } from '@/workers/etapa3/document-generation/queues';
import { db } from '@/db';
import { documents, documentTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('PDF Generation Worker Integration', () => {
  let container: TestContainer;
  let tenantId: string;
  let templateId: string;

  beforeAll(async () => {
    container = await createTestContainer();
    tenantId = container.tenantId;

    // Create test template
    const [template] = await db.insert(documentTemplates).values({
      tenantId,
      name: 'Test Invoice Template',
      type: 'INVOICE',
      content: '<html><body><h1>Invoice {{invoiceNumber}}</h1></body></html>',
      isActive: true
    }).returning();
    templateId = template.id;
  });

  afterAll(async () => {
    await container.cleanup();
  });

  beforeEach(async () => {
    await pdfGenerationQueue.drain();
  });

  it('should generate PDF and store in database', async () => {
    const job = await pdfGenerationQueue.add('generate', {
      tenantId,
      documentType: 'INVOICE',
      templateId,
      data: {
        invoiceNumber: 'INV-2026-TEST-001',
        date: '2026-01-18',
        customer: { name: 'Test SRL' },
        total: 1000
      }
    });

    const result = await job.waitUntilFinished(pdfGenerationQueue.queueEvents);

    expect(result).toBeDefined();
    expect(result.documentId).toBeDefined();
    expect(result.fileUrl).toBeDefined();

    // Verify document record created
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, result.documentId));

    expect(document).toBeDefined();
    expect(document.type).toBe('INVOICE');
    expect(document.status).toBe('GENERATED');
  });

  it('should handle template not found error', async () => {
    const job = await pdfGenerationQueue.add('generate', {
      tenantId,
      documentType: 'INVOICE',
      templateId: 'non-existent-template-id',
      data: { invoiceNumber: 'TEST-001' }
    });

    await expect(
      job.waitUntilFinished(pdfGenerationQueue.queueEvents)
    ).rejects.toThrow();

    const failedJob = await pdfGenerationQueue.getJob(job.id!);
    expect(failedJob?.failedReason).toContain('Template not found');
  });

  it('should deduplicate identical PDF requests', async () => {
    const data = {
      tenantId,
      documentType: 'INVOICE',
      templateId,
      data: {
        invoiceNumber: 'INV-DEDUP-001',
        date: '2026-01-18'
      }
    };

    // Add same job twice
    const job1 = await pdfGenerationQueue.add('generate', data);
    const job2 = await pdfGenerationQueue.add('generate', data);

    const result1 = await job1.waitUntilFinished(pdfGenerationQueue.queueEvents);
    const result2 = await job2.waitUntilFinished(pdfGenerationQueue.queueEvents);

    // Both should return same document
    expect(result1.documentId).toBe(result2.documentId);
  });
});

// tests/integration/workers/etapa3/document-generation/email-worker.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createTestContainer, TestContainer } from '@/tests/utils/container';
import { emailDeliveryQueue } from '@/workers/etapa3/document-generation/queues';
import { createMockSmtpServer, MockSmtpServer } from '@/tests/utils/mock-smtp';
import { db } from '@/db';
import { emailLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Email Delivery Worker Integration', () => {
  let container: TestContainer;
  let mockSmtp: MockSmtpServer;
  let tenantId: string;

  beforeAll(async () => {
    container = await createTestContainer();
    tenantId = container.tenantId;
    mockSmtp = await createMockSmtpServer(2525);
  });

  afterAll(async () => {
    await mockSmtp.close();
    await container.cleanup();
  });

  beforeEach(async () => {
    await emailDeliveryQueue.drain();
    mockSmtp.reset();
  });

  it('should send email and log result', async () => {
    const job = await emailDeliveryQueue.add('send', {
      tenantId,
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
      text: 'Test content'
    });

    const result = await job.waitUntilFinished(emailDeliveryQueue.queueEvents);

    expect(result.messageId).toBeDefined();
    expect(result.accepted).toContain('recipient@example.com');

    // Verify email was received
    const emails = mockSmtp.getReceivedEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toContain('recipient@example.com');

    // Verify log entry
    const [log] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.messageId, result.messageId));

    expect(log).toBeDefined();
    expect(log.status).toBe('sent');
  });

  it('should handle multiple recipients', async () => {
    const job = await emailDeliveryQueue.add('send', {
      tenantId,
      to: ['user1@example.com', 'user2@example.com'],
      cc: ['cc@example.com'],
      subject: 'Multi-recipient Test',
      html: '<p>Content</p>'
    });

    const result = await job.waitUntilFinished(emailDeliveryQueue.queueEvents);

    expect(result.accepted).toHaveLength(3);
  });

  it('should handle SMTP temporary failure with retry', async () => {
    mockSmtp.setFailureMode('temporary', 2); // Fail first 2 attempts

    const job = await emailDeliveryQueue.add('send', {
      tenantId,
      to: 'retry@example.com',
      subject: 'Retry Test',
      html: '<p>Should succeed after retries</p>'
    });

    const result = await job.waitUntilFinished(emailDeliveryQueue.queueEvents, 60000);

    expect(result.messageId).toBeDefined();
    expect(job.attemptsMade).toBeGreaterThan(1);
  });

  it('should track email opens when enabled', async () => {
    const job = await emailDeliveryQueue.add('send', {
      tenantId,
      to: 'tracked@example.com',
      subject: 'Tracked Email',
      html: '<p>Content with tracking</p>',
      metadata: {
        trackOpens: true,
        campaignId: 'campaign-001'
      }
    });

    const result = await job.waitUntilFinished(emailDeliveryQueue.queueEvents);

    // Verify tracking pixel was added
    const emails = mockSmtp.getReceivedEmails();
    expect(emails[0].html).toContain('tracking');
  });
});

// tests/integration/workers/etapa3/document-generation/whatsapp-worker.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createTestContainer, TestContainer } from '@/tests/utils/container';
import { whatsappDeliveryQueue } from '@/workers/etapa3/document-generation/queues';
import { createWhatsAppMockServer, WhatsAppMockServer } from '@/tests/utils/mock-whatsapp';
import { db } from '@/db';
import { whatsappMessages, whatsappConversations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

describe('WhatsApp Delivery Worker Integration', () => {
  let container: TestContainer;
  let mockWhatsApp: WhatsAppMockServer;
  let tenantId: string;

  beforeAll(async () => {
    container = await createTestContainer();
    tenantId = container.tenantId;
    mockWhatsApp = await createWhatsAppMockServer(64001);
  });

  afterAll(async () => {
    await mockWhatsApp.close();
    await container.cleanup();
  });

  beforeEach(async () => {
    await whatsappDeliveryQueue.drain();
    mockWhatsApp.reset();
  });

  it('should send text message successfully', async () => {
    const job = await whatsappDeliveryQueue.add('send', {
      tenantId,
      phoneNumber: '+40722123456',
      messageType: 'text',
      content: {
        text: { body: 'Hello from integration test' }
      }
    });

    const result = await job.waitUntilFinished(whatsappDeliveryQueue.queueEvents);

    expect(result.waMessageId).toBeDefined();
    expect(result.status).toBe('sent');

    // Verify message logged
    const [message] = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.waMessageId, result.waMessageId));

    expect(message).toBeDefined();
    expect(message.direction).toBe('outgoing');
  });

  it('should send template message', async () => {
    const job = await whatsappDeliveryQueue.add('send', {
      tenantId,
      phoneNumber: '+40722123456',
      messageType: 'template',
      content: {
        template: {
          name: 'order_confirmation',
          language: 'ro',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'ORD-12345' },
                { type: 'text', text: '1,234.56 RON' }
              ]
            }
          ]
        }
      }
    });

    const result = await job.waitUntilFinished(whatsappDeliveryQueue.queueEvents);

    expect(result.waMessageId).toBeDefined();
  });

  it('should handle messaging window closed', async () => {
    // Simulate closed messaging window (no recent incoming message)
    mockWhatsApp.setMessagingWindowClosed('+40722000000');

    const job = await whatsappDeliveryQueue.add('send', {
      tenantId,
      phoneNumber: '+40722000000',
      messageType: 'text',
      content: {
        text: { body: 'This should fail - window closed' }
      }
    });

    await expect(
      job.waitUntilFinished(whatsappDeliveryQueue.queueEvents)
    ).rejects.toThrow();

    const failedJob = await whatsappDeliveryQueue.getJob(job.id!);
    expect(failedJob?.failedReason).toContain('messaging window');
  });

  it('should create/update conversation record', async () => {
    const phoneNumber = '+40722999999';

    const job = await whatsappDeliveryQueue.add('send', {
      tenantId,
      phoneNumber,
      messageType: 'text',
      content: {
        text: { body: 'Conversation test' }
      }
    });

    await job.waitUntilFinished(whatsappDeliveryQueue.queueEvents);

    // Verify conversation created
    const [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.tenantId, tenantId),
          eq(whatsappConversations.phoneNumber, phoneNumber.replace('+', ''))
        )
      );

    expect(conversation).toBeDefined();
    expect(conversation.lastMessageAt).toBeDefined();
  });

  it('should handle rate limiting gracefully', async () => {
    mockWhatsApp.setRateLimitRemaining(0);

    const job = await whatsappDeliveryQueue.add('send', {
      tenantId,
      phoneNumber: '+40722123456',
      messageType: 'text',
      content: {
        text: { body: 'Rate limited message' }
      }
    });

    // Should be delayed and retried
    await expect(
      job.waitUntilFinished(whatsappDeliveryQueue.queueEvents, 5000)
    ).rejects.toThrow();

    // Job should be delayed, not failed
    const jobState = await job.getState();
    expect(jobState).toBe('delayed');
  });
});
```

### 8.3 E2E Tests

```typescript
// tests/e2e/etapa3/document-generation.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from '../utils/auth';
import { createTestNegotiation } from '../utils/data';

test.describe('Document Generation E2E', () => {
  test.describe('PDF Generation', () => {
    test('should generate invoice PDF from negotiation', async ({ page }) => {
      await loginAsUser(page);

      // Navigate to negotiations
      await page.goto('/negotiations');
      await page.getByTestId('negotiations-table').waitFor();

      // Find accepted negotiation
      await page.getByPlaceholder('Caută negocieri...').fill('ACCEPTED');
      await page.keyboard.press('Enter');

      // Click on first result
      await page.getByTestId('negotiation-row').first().click();

      // Click generate invoice
      await page.getByRole('button', { name: 'Generează Factură' }).click();

      // Verify invoice dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Generare Factură')).toBeVisible();

      // Fill invoice details
      await page.getByLabel('Serie factură').fill('CRN');
      await page.getByLabel('Număr factură').fill('2026001');

      // Generate
      await page.getByRole('button', { name: 'Generează' }).click();

      // Wait for success
      await expect(page.getByText('Factură generată cu succes')).toBeVisible({ timeout: 30000 });

      // Verify download link appears
      await expect(page.getByRole('link', { name: /Descarcă PDF/i })).toBeVisible();
    });

    test('should preview document before generation', async ({ page }) => {
      await loginAsUser(page);
      await page.goto('/negotiations');

      await page.getByTestId('negotiation-row').first().click();
      await page.getByRole('button', { name: 'Generează Ofertă' }).click();

      // Click preview
      await page.getByRole('button', { name: 'Previzualizare' }).click();

      // Verify preview modal
      await expect(page.getByTestId('pdf-preview')).toBeVisible();
      await expect(page.frameLocator('iframe').getByText(/Ofertă/i)).toBeVisible();
    });
  });

  test.describe('Email Delivery', () => {
    test('should send offer email from negotiation', async ({ page }) => {
      await loginAsUser(page);
      await page.goto('/negotiations');

      await page.getByTestId('negotiation-row').first().click();

      // Click send offer
      await page.getByRole('button', { name: 'Trimite Ofertă' }).click();

      // Verify email dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      // Email should be pre-filled
      const emailInput = page.getByLabel('Email destinatar');
      await expect(emailInput).not.toBeEmpty();

      // Customize subject
      await page.getByLabel('Subiect').fill('Ofertă personalizată - Test E2E');

      // Add message
      await page.getByLabel('Mesaj').fill('Vă transmitem oferta noastră personalizată.');

      // Send
      await page.getByRole('button', { name: 'Trimite' }).click();

      // Wait for success
      await expect(page.getByText('Email trimis cu succes')).toBeVisible({ timeout: 15000 });
    });

    test('should handle invalid email address', async ({ page }) => {
      await loginAsUser(page);
      await page.goto('/negotiations');

      await page.getByTestId('negotiation-row').first().click();
      await page.getByRole('button', { name: 'Trimite Ofertă' }).click();

      // Enter invalid email
      await page.getByLabel('Email destinatar').fill('invalid-email');

      // Try to send
      await page.getByRole('button', { name: 'Trimite' }).click();

      // Verify validation error
      await expect(page.getByText('Adresă de email invalidă')).toBeVisible();
    });
  });

  test.describe('WhatsApp Messaging', () => {
    test('should send WhatsApp message from contact', async ({ page }) => {
      await loginAsUser(page);
      await page.goto('/contacts');

      // Find contact with phone
      await page.getByPlaceholder('Caută contacte...').fill('+40722');
      await page.keyboard.press('Enter');

      await page.getByTestId('contact-row').first().click();

      // Open WhatsApp panel
      await page.getByRole('tab', { name: 'WhatsApp' }).click();

      // Type message
      await page.getByPlaceholder('Scrie un mesaj...').fill('Bună ziua! Aceasta este un test E2E.');

      // Send
      await page.getByRole('button', { name: 'Trimite' }).click();

      // Verify message appears in chat
      await expect(page.getByText('Aceasta este un test E2E')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('message-status-sent')).toBeVisible();
    });

    test('should show messaging window warning', async ({ page }) => {
      await loginAsUser(page);
      await page.goto('/contacts');

      // Find contact without recent message
      await page.getByTestId('contact-row').last().click();
      await page.getByRole('tab', { name: 'WhatsApp' }).click();

      // Verify warning shown
      await expect(page.getByText(/fereastră de mesagerie/i)).toBeVisible();
      await expect(page.getByText(/Folosiți un șablon/i)).toBeVisible();
    });

    test('should send template message', async ({ page }) => {
      await loginAsUser(page);
      await page.goto('/contacts');

      await page.getByTestId('contact-row').last().click();
      await page.getByRole('tab', { name: 'WhatsApp' }).click();

      // Select template
      await page.getByRole('button', { name: 'Șabloane' }).click();
      await page.getByText('order_confirmation').click();

      // Fill parameters
      await page.getByLabel('Număr comandă').fill('CMD-12345');
      await page.getByLabel('Sumă').fill('1,234.56 RON');

      // Send template
      await page.getByRole('button', { name: 'Trimite șablon' }).click();

      // Verify success
      await expect(page.getByText('Șablon trimis cu succes')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Document HITL Resolution', () => {
    test('should resolve document generation error via HITL', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/hitl');

      // Filter for document errors
      await page.getByLabel('Categorie').selectOption('document');
      await page.getByRole('button', { name: 'Aplică' }).click();

      // Open first task
      await page.getByTestId('hitl-task-row').first().click();

      // Verify error details shown
      await expect(page.getByText(/Eroare generare document/i)).toBeVisible();
      await expect(page.getByTestId('error-details')).toBeVisible();

      // Fix and retry
      await page.getByRole('button', { name: 'Reîncearcă' }).click();

      // Confirm
      await page.getByRole('button', { name: 'Confirmă' }).click();

      // Verify task resolved
      await expect(page.getByText('Task rezolvat')).toBeVisible({ timeout: 15000 });
    });
  });
});
```

### 8.4 Test Utilities

```typescript
// tests/utils/mock-smtp.ts
import { SMTPServer } from 'smtp-server';

export interface MockSmtpServer {
  port: number;
  getReceivedEmails(): ReceivedEmail[];
  reset(): void;
  setFailureMode(mode: 'none' | 'temporary' | 'permanent', count?: number): void;
  close(): Promise<void>;
}

interface ReceivedEmail {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments: Array<{ filename: string; size: number }>;
}

export async function createMockSmtpServer(port: number): Promise<MockSmtpServer> {
  const receivedEmails: ReceivedEmail[] = [];
  let failureMode: 'none' | 'temporary' | 'permanent' = 'none';
  let failureCount = 0;
  let currentFailures = 0;

  const server = new SMTPServer({
    secure: false,
    authOptional: true,
    onData(stream, session, callback) {
      if (failureMode === 'permanent') {
        return callback(new Error('SMTP service unavailable'));
      }
      
      if (failureMode === 'temporary' && currentFailures < failureCount) {
        currentFailures++;
        return callback(new Error('Temporary failure, try again'));
      }

      let emailData = '';
      stream.on('data', (chunk) => {
        emailData += chunk.toString();
      });
      stream.on('end', () => {
        // Parse email data
        const email = parseEmail(emailData, session);
        receivedEmails.push(email);
        callback();
      });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  return {
    port,
    getReceivedEmails: () => [...receivedEmails],
    reset: () => {
      receivedEmails.length = 0;
      failureMode = 'none';
      failureCount = 0;
      currentFailures = 0;
    },
    setFailureMode: (mode, count = 1) => {
      failureMode = mode;
      failureCount = count;
      currentFailures = 0;
    },
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

// tests/utils/mock-whatsapp.ts
import express from 'express';
import { Server } from 'http';

export interface WhatsAppMockServer {
  port: number;
  getSentMessages(): SentMessage[];
  reset(): void;
  setMessagingWindowClosed(phoneNumber: string): void;
  setRateLimitRemaining(remaining: number): void;
  close(): Promise<void>;
}

interface SentMessage {
  to: string;
  type: string;
  content: any;
  timestamp: Date;
}

export async function createWhatsAppMockServer(port: number): Promise<WhatsAppMockServer> {
  const sentMessages: SentMessage[] = [];
  const closedWindows = new Set<string>();
  let rateLimitRemaining = 1000;

  const app = express();
  app.use(express.json());

  // WhatsApp Cloud API mock endpoint
  app.post('/v17.0/:phoneNumberId/messages', (req, res) => {
    const { to, type } = req.body;

    // Check rate limit
    if (rateLimitRemaining <= 0) {
      return res.status(429).json({
        error: {
          message: 'Rate limit exceeded',
          type: 'OAuthException',
          code: 80007
        }
      });
    }

    // Check messaging window
    if (type !== 'template' && closedWindows.has(to)) {
      return res.status(400).json({
        error: {
          message: 'Cannot send message outside 24 hour messaging window',
          type: 'GraphMethodException',
          code: 131026
        }
      });
    }

    rateLimitRemaining--;

    const messageId = `wamid.${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    
    sentMessages.push({
      to,
      type,
      content: req.body,
      timestamp: new Date()
    });

    res.json({
      messaging_product: 'whatsapp',
      contacts: [{ input: to, wa_id: to }],
      messages: [{ id: messageId }]
    });
  });

  let server: Server;
  await new Promise<void>((resolve) => {
    server = app.listen(port, resolve);
  });

  return {
    port,
    getSentMessages: () => [...sentMessages],
    reset: () => {
      sentMessages.length = 0;
      closedWindows.clear();
      rateLimitRemaining = 1000;
    },
    setMessagingWindowClosed: (phoneNumber) => {
      closedWindows.add(phoneNumber.replace('+', ''));
    },
    setRateLimitRemaining: (remaining) => {
      rateLimitRemaining = remaining;
    },
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
```

---

## 9. Integration Patterns

### 9.1 Inter-Worker Communication

```typescript
// src/workers/etapa3/document-generation/integration/triggers.ts
import { pdfGenerationQueue, emailDeliveryQueue, whatsappDeliveryQueue } from '../queues';
import { logger } from '@/lib/logger';

/**
 * Document Generation Triggers from Other Workers
 * 
 * Flow patterns:
 * 1. Negotiation → Invoice PDF → Email with attachment
 * 2. AI Agent → Offer PDF → WhatsApp with document
 * 3. HITL Approval → Confirmation PDF → Multi-channel delivery
 */

// Trigger PDF generation from negotiation worker
export async function triggerInvoiceGeneration(
  tenantId: string,
  negotiationId: string,
  invoiceData: {
    invoiceNumber: string;
    customerCui: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
    total: number;
    vatAmount: number;
  }
): Promise<string> {
  const job = await pdfGenerationQueue.add(
    'generate-invoice',
    {
      tenantId,
      documentType: 'INVOICE',
      templateId: 'invoice-default',
      data: {
        ...invoiceData,
        generatedAt: new Date().toISOString()
      },
      metadata: {
        negotiationId,
        triggeredBy: 'negotiation-worker'
      }
    },
    {
      priority: 2,
      jobId: `invoice-${negotiationId}-${Date.now()}`
    }
  );

  logger.info('Invoice generation triggered', {
    jobId: job.id,
    negotiationId,
    invoiceNumber: invoiceData.invoiceNumber
  });

  return job.id!;
}

// Trigger offer PDF generation from AI agent
export async function triggerOfferGeneration(
  tenantId: string,
  conversationId: string,
  offerData: {
    contactId: string;
    products: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    validUntil: Date;
    terms?: string;
  }
): Promise<string> {
  const job = await pdfGenerationQueue.add(
    'generate-offer',
    {
      tenantId,
      documentType: 'OFFER',
      templateId: 'offer-default',
      data: offerData,
      metadata: {
        conversationId,
        contactId: offerData.contactId,
        triggeredBy: 'ai-agent'
      }
    },
    {
      priority: 2
    }
  );

  return job.id!;
}

// Trigger email after PDF generation
export async function triggerEmailWithAttachment(
  tenantId: string,
  documentId: string,
  documentUrl: string,
  emailDetails: {
    to: string;
    subject: string;
    templateId?: string;
    templateData?: Record<string, unknown>;
  },
  metadata?: Record<string, unknown>
): Promise<string> {
  const job = await emailDeliveryQueue.add(
    'send-with-attachment',
    {
      tenantId,
      ...emailDetails,
      attachments: [
        {
          filename: `document-${documentId}.pdf`,
          path: documentUrl,
          contentType: 'application/pdf'
        }
      ],
      metadata: {
        documentId,
        ...metadata
      }
    },
    {
      priority: 2
    }
  );

  return job.id!;
}

// Trigger WhatsApp with document
export async function triggerWhatsAppWithDocument(
  tenantId: string,
  phoneNumber: string,
  documentId: string,
  documentUrl: string,
  message?: string
): Promise<string> {
  const job = await whatsappDeliveryQueue.add(
    'send-document',
    {
      tenantId,
      phoneNumber,
      messageType: 'document',
      content: {
        media: {
          url: documentUrl,
          caption: message || 'Documentul solicitat',
          filename: `document-${documentId}.pdf`
        }
      },
      metadata: {
        documentId
      }
    },
    {
      priority: 2
    }
  );

  return job.id!;
}

// Chained document workflow
export async function executeDocumentWorkflow(
  tenantId: string,
  workflow: {
    generatePdf: {
      documentType: string;
      templateId: string;
      data: Record<string, unknown>;
    };
    deliveryChannels: Array<{
      channel: 'email' | 'whatsapp';
      recipient: string;
      message?: string;
    }>;
  }
): Promise<{ pdfJobId: string; deliveryJobIds: string[] }> {
  // Step 1: Generate PDF
  const pdfJob = await pdfGenerationQueue.add(
    'generate',
    {
      tenantId,
      documentType: workflow.generatePdf.documentType,
      templateId: workflow.generatePdf.templateId,
      data: workflow.generatePdf.data,
      options: {
        waitForDelivery: true
      }
    },
    {
      priority: 2
    }
  );

  // Wait for PDF completion
  const pdfResult = await pdfJob.waitUntilFinished(
    pdfGenerationQueue.queueEvents,
    120000
  );

  // Step 2: Trigger deliveries
  const deliveryJobIds: string[] = [];

  for (const delivery of workflow.deliveryChannels) {
    if (delivery.channel === 'email') {
      const emailJobId = await triggerEmailWithAttachment(
        tenantId,
        pdfResult.documentId,
        pdfResult.fileUrl,
        {
          to: delivery.recipient,
          subject: `Document: ${workflow.generatePdf.documentType}`,
          templateId: 'document-delivery'
        }
      );
      deliveryJobIds.push(emailJobId);
    } else if (delivery.channel === 'whatsapp') {
      const whatsappJobId = await triggerWhatsAppWithDocument(
        tenantId,
        delivery.recipient,
        pdfResult.documentId,
        pdfResult.fileUrl,
        delivery.message
      );
      deliveryJobIds.push(whatsappJobId);
    }
  }

  return {
    pdfJobId: pdfJob.id!,
    deliveryJobIds
  };
}
```

### 9.2 Event-Driven Architecture

```typescript
// src/workers/etapa3/document-generation/integration/events.ts
import { EventEmitter } from 'events';
import { db } from '@/db';
import { documentEvents } from '@/db/schema';

export enum DocumentEventType {
  // PDF Events
  PDF_GENERATION_STARTED = 'pdf.generation.started',
  PDF_GENERATION_COMPLETED = 'pdf.generation.completed',
  PDF_GENERATION_FAILED = 'pdf.generation.failed',
  
  // Email Events
  EMAIL_QUEUED = 'email.queued',
  EMAIL_SENT = 'email.sent',
  EMAIL_DELIVERED = 'email.delivered',
  EMAIL_OPENED = 'email.opened',
  EMAIL_CLICKED = 'email.clicked',
  EMAIL_BOUNCED = 'email.bounced',
  EMAIL_FAILED = 'email.failed',
  
  // WhatsApp Events
  WHATSAPP_QUEUED = 'whatsapp.queued',
  WHATSAPP_SENT = 'whatsapp.sent',
  WHATSAPP_DELIVERED = 'whatsapp.delivered',
  WHATSAPP_READ = 'whatsapp.read',
  WHATSAPP_FAILED = 'whatsapp.failed'
}

export interface DocumentEvent {
  type: DocumentEventType;
  tenantId: string;
  documentId?: string;
  jobId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

class DocumentEventBus extends EventEmitter {
  async emit(event: DocumentEventType, payload: Omit<DocumentEvent, 'type' | 'timestamp'>): Promise<boolean> {
    const fullEvent: DocumentEvent = {
      type: event,
      ...payload,
      timestamp: new Date()
    };

    // Persist event
    await db.insert(documentEvents).values({
      tenantId: payload.tenantId,
      eventType: event,
      documentId: payload.documentId,
      jobId: payload.jobId,
      data: payload.data,
      createdAt: fullEvent.timestamp
    });

    // Emit for local subscribers
    return super.emit(event, fullEvent);
  }

  subscribe(event: DocumentEventType, handler: (event: DocumentEvent) => void): void {
    this.on(event, handler);
  }

  unsubscribe(event: DocumentEventType, handler: (event: DocumentEvent) => void): void {
    this.off(event, handler);
  }
}

export const documentEventBus = new DocumentEventBus();

// Event handlers for cross-worker communication
documentEventBus.subscribe(DocumentEventType.PDF_GENERATION_COMPLETED, async (event) => {
  // Auto-trigger delivery if configured
  if (event.data.autoDelivery) {
    const { deliveryChannel, recipient } = event.data.autoDelivery as {
      deliveryChannel: 'email' | 'whatsapp';
      recipient: string;
    };

    if (deliveryChannel === 'email') {
      await emailDeliveryQueue.add('auto-send', {
        tenantId: event.tenantId,
        to: recipient,
        subject: `Document generat: ${event.data.documentType}`,
        attachments: [{
          path: event.data.fileUrl as string
        }]
      });
    }
  }
});

documentEventBus.subscribe(DocumentEventType.EMAIL_BOUNCED, async (event) => {
  // Update contact status
  const { recipientEmail, bounceType } = event.data as {
    recipientEmail: string;
    bounceType: 'hard' | 'soft';
  };

  if (bounceType === 'hard') {
    // Mark email as invalid in contacts
    await db.execute(sql`
      UPDATE contacts 
      SET email_status = 'invalid', email_invalid_reason = ${event.data.bounceReason}
      WHERE tenant_id = ${event.tenantId} AND email = ${recipientEmail}
    `);
  }
});

documentEventBus.subscribe(DocumentEventType.WHATSAPP_FAILED, async (event) => {
  // Create HITL task for manual review
  if ((event.data.errorCode as number) >= 400) {
    await createDocumentHitlTask(event.tenantId, {
      category: 'whatsapp',
      errorType: 'delivery_failed',
      errorMessage: event.data.errorMessage as string,
      jobId: event.jobId!,
      jobData: event.data,
      severity: 'medium'
    });
  }
});
```

### 9.3 HITL Integration

```typescript
// src/workers/etapa3/document-generation/hitl/create-task.ts
import { db } from '@/db';
import { hitlTasks } from '@/db/schema';
import { hitlEventBus, HitlEventType } from '@/workers/etapa3/hitl/events';
import { logger } from '@/lib/logger';

export interface DocumentHitlTaskData {
  category: 'pdf' | 'email' | 'whatsapp';
  errorType: string;
  errorMessage: string;
  jobId: string;
  jobData: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction?: string;
  relatedDocumentId?: string;
  relatedNegotiationId?: string;
  relatedContactId?: string;
}

const SEVERITY_TO_PRIORITY: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4
};

const SEVERITY_TO_SLA_HOURS: Record<string, number> = {
  critical: 1,
  high: 4,
  medium: 24,
  low: 72
};

export async function createDocumentHitlTask(
  tenantId: string,
  data: DocumentHitlTaskData
): Promise<string> {
  const slaDeadline = new Date();
  slaDeadline.setHours(
    slaDeadline.getHours() + SEVERITY_TO_SLA_HOURS[data.severity]
  );

  const [task] = await db.insert(hitlTasks).values({
    tenantId,
    taskType: `document_${data.category}_error`,
    priority: SEVERITY_TO_PRIORITY[data.severity],
    status: 'PENDING',
    payload: {
      category: data.category,
      errorType: data.errorType,
      errorMessage: data.errorMessage,
      jobId: data.jobId,
      jobData: data.jobData,
      suggestedAction: getSuggestedAction(data.errorType),
      ...data.relatedDocumentId && { documentId: data.relatedDocumentId },
      ...data.relatedNegotiationId && { negotiationId: data.relatedNegotiationId },
      ...data.relatedContactId && { contactId: data.relatedContactId }
    },
    slaDeadline,
    createdAt: new Date()
  }).returning();

  logger.info('Document HITL task created', {
    taskId: task.id,
    tenantId,
    category: data.category,
    errorType: data.errorType,
    priority: task.priority,
    slaDeadline: slaDeadline.toISOString()
  });

  // Emit event for dashboard notifications
  await hitlEventBus.emit(HitlEventType.TASK_CREATED, {
    taskId: task.id,
    tenantId,
    taskType: task.taskType,
    priority: task.priority
  });

  return task.id;
}

function getSuggestedAction(errorType: string): string {
  const actions: Record<string, string> = {
    TEMPLATE_NOT_FOUND: 'Verificați dacă șablonul există și este activ în sistem.',
    TEMPLATE_SYNTAX_ERROR: 'Verificați sintaxa șablonului și corectați erorile.',
    INVALID_DATA: 'Verificați datele de intrare și corectați valorile invalide.',
    INVALID_EMAIL: 'Verificați și actualizați adresa de email a contactului.',
    INVALID_PHONE: 'Verificați și actualizați numărul de telefon al contactului.',
    BLOCKED_RECIPIENT: 'Contactați destinatarul pentru a verifica dacă dorește să primească mesaje.',
    MESSAGING_WINDOW_CLOSED: 'Folosiți un șablon aprobat WhatsApp pentru a iniția conversația.',
    MEDIA_TOO_LARGE: 'Reduceți dimensiunea fișierului sau folosiți o metodă alternativă de livrare.',
    AUTHENTICATION_ERROR: 'Verificați credențialele de autentificare pentru serviciul extern.',
    QUOTA_EXCEEDED: 'Așteptați resetarea cotei sau contactați furnizorul pentru creșterea limitelor.',
    BROWSER_CRASH: 'Reporniți serviciul de generare PDF și reîncercați operația.'
  };

  return actions[errorType] || 'Analizați eroarea și efectuați acțiunile necesare.';
}

// Handle HITL task resolution
export async function handleDocumentHitlResolution(
  taskId: string,
  resolution: {
    action: 'retry' | 'skip' | 'manual_fix';
    fixedData?: Record<string, unknown>;
    notes?: string;
  }
): Promise<void> {
  const [task] = await db
    .select()
    .from(hitlTasks)
    .where(eq(hitlTasks.id, taskId));

  if (!task) {
    throw new Error(`HITL task not found: ${taskId}`);
  }

  const { category, jobId, jobData } = task.payload as DocumentHitlTaskData;

  switch (resolution.action) {
    case 'retry':
      // Re-queue the job
      const queue = getQueueByCategory(category);
      await queue.add(
        'retry-from-hitl',
        {
          ...jobData,
          ...(resolution.fixedData || {}),
          _hitlTaskId: taskId
        },
        {
          priority: 1, // High priority for retries
          jobId: `hitl-retry-${jobId}-${Date.now()}`
        }
      );
      break;

    case 'skip':
      // Mark as skipped, no retry
      logger.info('Document job skipped via HITL', { taskId, jobId });
      break;

    case 'manual_fix':
      // Mark as manually resolved
      logger.info('Document job manually fixed via HITL', { taskId, jobId });
      break;
  }

  // Update task status
  await db
    .update(hitlTasks)
    .set({
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolution: {
        action: resolution.action,
        notes: resolution.notes
      }
    })
    .where(eq(hitlTasks.id, taskId));
}

function getQueueByCategory(category: string): Queue {
  switch (category) {
    case 'pdf':
      return pdfGenerationQueue;
    case 'email':
      return emailDeliveryQueue;
    case 'whatsapp':
      return whatsappDeliveryQueue;
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}
```

---

## 10. Security Considerations

### 10.1 Data Protection

```typescript
// src/workers/etapa3/document-generation/security/data-protection.ts

/**
 * Data Protection for Document Generation
 * 
 * GDPR Compliance:
 * - Personal data minimization in documents
 * - Encryption at rest for generated documents
 * - Audit logging for all document operations
 * - Data retention policies
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';

// PII Detection and Masking
const PII_PATTERNS = {
  cnp: /\b[1-9]\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{6}\b/g, // Romanian CNP
  cui: /\bRO?\d{2,10}\b/gi, // Romanian CUI
  iban: /\bRO\d{2}[A-Z]{4}\d{16}\b/gi,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+40|0)?[0-9]{9,10}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g
};

export function detectPII(text: string): Array<{ type: string; value: string; position: number }> {
  const findings: Array<{ type: string; value: string; position: number }> = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      findings.push({
        type,
        value: match[0],
        position: match.index
      });
    }
  }

  return findings;
}

export function maskPII(text: string, typesToMask: string[] = ['cnp', 'creditCard']): string {
  let masked = text;

  for (const type of typesToMask) {
    const pattern = PII_PATTERNS[type as keyof typeof PII_PATTERNS];
    if (pattern) {
      masked = masked.replace(pattern, (match) => {
        const visibleChars = Math.min(4, Math.floor(match.length / 4));
        return match.slice(0, visibleChars) + '*'.repeat(match.length - visibleChars);
      });
    }
  }

  return masked;
}

// Document Encryption
export class DocumentEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  constructor(private readonly masterKey: Buffer) {
    if (masterKey.length !== this.keyLength) {
      throw new Error(`Master key must be ${this.keyLength} bytes`);
    }
  }

  encrypt(data: Buffer): { encrypted: Buffer; iv: Buffer; tag: Buffer } {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return { encrypted, iv, tag };
  }

  decrypt(encrypted: Buffer, iv: Buffer, tag: Buffer): Buffer {
    const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  static fromEnv(): DocumentEncryption {
    const key = process.env.DOCUMENT_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('DOCUMENT_ENCRYPTION_KEY environment variable not set');
    }
    return new DocumentEncryption(Buffer.from(key, 'hex'));
  }
}

// Audit Logging
export interface DocumentAuditEntry {
  timestamp: Date;
  tenantId: string;
  userId?: string;
  action: 'generate' | 'view' | 'download' | 'send' | 'delete';
  documentId: string;
  documentType: string;
  recipientInfo?: string; // Masked
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export async function logDocumentAudit(entry: DocumentAuditEntry): Promise<void> {
  // Mask sensitive data before logging
  const maskedEntry = {
    ...entry,
    recipientInfo: entry.recipientInfo ? maskPII(entry.recipientInfo) : undefined
  };

  logger.info('Document audit', maskedEntry);

  // Also persist to database for compliance
  await db.insert(documentAuditLogs).values({
    tenantId: entry.tenantId,
    userId: entry.userId,
    action: entry.action,
    documentId: entry.documentId,
    documentType: entry.documentType,
    metadata: {
      recipientInfo: maskedEntry.recipientInfo,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent
    },
    success: entry.success,
    errorMessage: entry.errorMessage,
    createdAt: entry.timestamp
  });
}
```

### 10.2 Access Control

```typescript
// src/workers/etapa3/document-generation/security/access-control.ts

import { db } from '@/db';
import { documents, userPermissions } from '@/db/schema';

export enum DocumentPermission {
  VIEW = 'document:view',
  DOWNLOAD = 'document:download',
  GENERATE = 'document:generate',
  SEND = 'document:send',
  DELETE = 'document:delete',
  MANAGE_TEMPLATES = 'document:manage_templates'
}

export async function checkDocumentAccess(
  userId: string,
  tenantId: string,
  documentId: string,
  requiredPermission: DocumentPermission
): Promise<{ allowed: boolean; reason?: string }> {
  // Check user permissions
  const [userPerm] = await db
    .select()
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.tenantId, tenantId)
      )
    );

  if (!userPerm) {
    return { allowed: false, reason: 'User not found in tenant' };
  }

  const permissions = userPerm.permissions as string[];
  
  // Check if user has required permission
  if (!permissions.includes(requiredPermission) && !permissions.includes('document:*')) {
    return { allowed: false, reason: `Missing permission: ${requiredPermission}` };
  }

  // Check document ownership/access
  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.tenantId, tenantId)
      )
    );

  if (!document) {
    return { allowed: false, reason: 'Document not found' };
  }

  return { allowed: true };
}

// Rate limiting for document operations
export const DOCUMENT_RATE_LIMITS = {
  generate: {
    pdf: { max: 100, window: 3600 }, // 100 PDFs per hour
    email: { max: 500, window: 3600 }, // 500 emails per hour
    whatsapp: { max: 200, window: 3600 } // 200 WhatsApp per hour
  },
  download: {
    default: { max: 1000, window: 3600 } // 1000 downloads per hour
  }
};
```

---

## 11. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-18 | Claude | Initial comprehensive documentation |
| 1.0.1 | 2026-01-18 | Claude | Added Queue Configuration, Retry & Error Handling |
| 1.0.2 | 2026-01-18 | Claude | Added Monitoring & Metrics, Testing Specification |
| 1.0.3 | 2026-01-18 | Claude | Added Integration Patterns, Security Considerations |

---

## 12. References

- [Puppeteer Documentation](https://pptr.dev/)
- [Nodemailer Documentation](https://nodemailer.com/)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Handlebars Documentation](https://handlebarsjs.com/)
- [GDPR Compliance for Document Processing](https://gdpr.eu/article-6-how-to-process-personal-data-legally/)
- [Romanian e-Factura Technical Specifications](https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_it/efactura)
