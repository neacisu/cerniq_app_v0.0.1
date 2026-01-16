# CERNIQ.APP — ETAPA 1: WORKERS CATEGORIA I-L
## Scraping, AI Processing, Geocoding & Agricultural Data
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. CATEGORIA I: SCRAPING WORKERS

## 1.1 I.1 - DAJ (Direcția Agricolă Județeană) Scraper

```typescript
// apps/workers/src/silver/daj-scraper.worker.ts

import { createWorker } from '@cerniq/queue';
import { chromium, Browser, Page } from 'playwright';
import { db, silverCompanies } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface DajScraperJobData {
  tenantId: string;
  companyId: string;
  cui: string;
  judet: string;
  correlationId: string;
}

// Rate limit: 0.5 requests/second (2s delay)
export const dajScraperWorker = createWorker<DajScraperJobData, DajScraperResult>({
  queueName: 'silver:enrich:daj-scraper',
  concurrency: 2,
  limiter: { max: 1, duration: 2000 },
  attempts: 2,
  backoff: { type: 'fixed', delay: 5000 },
  timeout: 120000, // 2 minute pentru scraping

  processor: async (job, logger) => {
    const { tenantId, companyId, cui, judet } = job.data;
    
    logger.info({ cui, judet }, 'Scraping DAJ data');
    
    const judetUrls: Record<string, string> = {
      'BR': 'https://daj.braila.ro',
      'GL': 'https://daj.galati.ro',
      'TL': 'https://daj.tulcea.ro',
      'CT': 'https://daj.constanta.ro',
      // ... alte județe
    };
    
    const baseUrl = judetUrls[judet];
    if (!baseUrl) {
      logger.warn({ judet }, 'No DAJ URL for county');
      return { status: 'skipped', reason: 'no_url' };
    }
    
    let browser: Browser | null = null;
    
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });
      
      const page = await context.newPage();
      
      // Navigate to search page
      await page.goto(`${baseUrl}/registrul-fermierilor`, { 
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      
      // Search by CUI
      await page.fill('input[name="cui"]', cui);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      // Check if results found
      const noResults = await page.$('.no-results');
      if (noResults) {
        logger.info({ cui }, 'Company not found in DAJ');
        return { status: 'not_found' };
      }
      
      // Extract data
      const data = await page.evaluate(() => {
        const result: Record<string, any> = {};
        
        // Extract table data
        const rows = document.querySelectorAll('table.fermier-data tr');
        rows.forEach(row => {
          const label = row.querySelector('th')?.textContent?.trim();
          const value = row.querySelector('td')?.textContent?.trim();
          if (label && value) {
            result[label] = value;
          }
        });
        
        return result;
      });
      
      // Update company with agricultural data
      await db.update(silverCompanies)
        .set({
          isAgricultural: true,
          agricultureRegistered: true,
          dajRegistrationNumber: data['Nr. Înregistrare'] || undefined,
          dajRegistrationDate: data['Data Înregistrare'] 
            ? new Date(data['Data Înregistrare']) 
            : undefined,
          suprafataAgricola: parseFloat(data['Suprafață Totală (ha)']) || undefined,
          culturiPrincipale: data['Culturi Principale']?.split(',').map(c => c.trim()) || [],
          categorieExploatatie: data['Categorie Exploatație'] || undefined,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'daj_scraper'),
              'daj_scraper'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, data }, 'DAJ data scraped');
      
      return { status: 'success', data };
      
    } catch (error) {
      logger.error({ error, cui }, 'DAJ scraping error');
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
});
```

## 1.2 I.2 - ANIF (Agenția Națională de Îmbunătățiri Funciare) Scraper

```typescript
// apps/workers/src/silver/anif-scraper.worker.ts

export const anifScraperWorker = createWorker<AnifScraperJobData, AnifScraperResult>({
  queueName: 'silver:enrich:anif-scraper',
  concurrency: 2,
  limiter: { max: 1, duration: 2000 },
  attempts: 2,
  backoff: { type: 'fixed', delay: 5000 },
  timeout: 120000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui, judet } = job.data;
    
    logger.info({ cui }, 'Scraping ANIF irrigation data');
    
    let browser: Browser | null = null;
    
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      // ANIF central registry
      await page.goto('https://www.anif.ro/beneficiari', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      
      // Search by CUI
      await page.fill('#search-cui', cui);
      await page.click('#btn-search');
      await page.waitForTimeout(3000);
      
      // Check results
      const hasResults = await page.$('.result-row');
      if (!hasResults) {
        return { status: 'not_found' };
      }
      
      // Extract irrigation data
      const data = await page.evaluate(() => {
        const result: Record<string, any> = {};
        
        const suprafataEl = document.querySelector('.suprafata-irigata');
        if (suprafataEl) {
          result.suprafataIrigata = parseFloat(suprafataEl.textContent || '0');
        }
        
        const contractEl = document.querySelector('.contract-irigare');
        if (contractEl) {
          result.areContractIrigare = true;
          result.tipContractIrigare = contractEl.getAttribute('data-tip');
        }
        
        const amenajareEl = document.querySelector('.amenajare');
        if (amenajareEl) {
          result.amenajareIrigare = amenajareEl.textContent?.trim();
        }
        
        return result;
      });
      
      await db.update(silverCompanies)
        .set({
          suprafataIrigata: data.suprafataIrigata || undefined,
          areContractIrigare: data.areContractIrigare || false,
          tipContractIrigare: data.tipContractIrigare || undefined,
          amenajareIrigare: data.amenajareIrigare || undefined,
          accesIrigatii: data.suprafataIrigata > 0,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'anif_scraper'),
              'anif_scraper'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, data }, 'ANIF data scraped');
      
      return { status: 'success', data };
      
    } catch (error) {
      logger.error({ error, cui }, 'ANIF scraping error');
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  },
});
```

## 1.3 I.3 - Website Finder Worker

```typescript
// apps/workers/src/silver/website-finder.worker.ts

import axios from 'axios';
import * as cheerio from 'cheerio';

export const websiteFinderWorker = createWorker<WebsiteFinderJobData, WebsiteFinderResult>({
  queueName: 'silver:enrich:website-finder',
  concurrency: 5,
  limiter: { max: 5, duration: 1000 },
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, denumire, cui } = job.data;
    
    logger.info({ denumire }, 'Finding company website');
    
    // Strategy 1: Google Search (via SerpAPI or custom)
    const searchQuery = `${denumire} romania site oficial`;
    
    try {
      // Use Bing search API (free tier)
      const searchResponse = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
        headers: { 'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY },
        params: { q: searchQuery, count: 10 },
      });
      
      const results = searchResponse.data.webPages?.value || [];
      
      // Filter for likely company websites
      const companyUrls = results
        .filter((r: any) => {
          const url = r.url.toLowerCase();
          // Exclude social media, directories, etc.
          const excluded = ['facebook.com', 'linkedin.com', 'twitter.com', 
            'youtube.com', 'listafirme.ro', 'risco.ro', 'termene.ro'];
          return !excluded.some(e => url.includes(e));
        })
        .map((r: any) => ({
          url: r.url,
          title: r.name,
          snippet: r.snippet,
        }));
      
      if (companyUrls.length === 0) {
        return { status: 'not_found' };
      }
      
      // Verify first result is actually company website
      const bestCandidate = companyUrls[0];
      const verified = await verifyCompanyWebsite(bestCandidate.url, denumire, cui);
      
      if (verified.isCompanyWebsite) {
        await db.update(silverCompanies)
          .set({
            website: verified.normalizedUrl,
            websiteVerified: true,
            websiteDomain: extractDomain(verified.normalizedUrl),
            websiteTitle: bestCandidate.title,
            enrichmentSourcesCompleted: db.sql`
              array_append(
                array_remove(enrichment_sources_completed, 'website_finder'),
                'website_finder'
              )
            `,
            lastEnrichmentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(silverCompanies.id, companyId));
        
        // Trigger contact page scraper
        await contactPageScraperQueue.add('scrape', {
          tenantId,
          companyId,
          websiteUrl: verified.normalizedUrl,
        });
        
        logger.info({ denumire, website: verified.normalizedUrl }, 'Website found');
        
        return { status: 'success', website: verified.normalizedUrl };
      }
      
      return { status: 'not_verified' };
      
    } catch (error) {
      logger.error({ error, denumire }, 'Website finder error');
      throw error;
    }
  },
});

async function verifyCompanyWebsite(url: string, denumire: string, cui: string): Promise<{
  isCompanyWebsite: boolean;
  normalizedUrl: string;
}> {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    const pageText = $('body').text().toLowerCase();
    const denumireLower = denumire.toLowerCase();
    
    // Check if company name or CUI appears on page
    const hasCompanyName = pageText.includes(denumireLower) || 
      denumireLower.split(' ').some(word => word.length > 4 && pageText.includes(word));
    const hasCui = pageText.includes(cui);
    
    // Normalize URL
    const urlObj = new URL(url);
    const normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    
    return {
      isCompanyWebsite: hasCompanyName || hasCui,
      normalizedUrl,
    };
  } catch {
    return { isCompanyWebsite: false, normalizedUrl: url };
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}
```

## 1.4 I.4 - Contact Page Scraper Worker

```typescript
// apps/workers/src/silver/contact-page-scraper.worker.ts

export const contactPageScraperWorker = createWorker<ContactPageJobData, ContactPageResult>({
  queueName: 'silver:enrich:contact-page-scraper',
  concurrency: 3,
  limiter: { max: 2, duration: 1000 },
  attempts: 2,
  timeout: 60000,

  processor: async (job, logger) => {
    const { tenantId, companyId, websiteUrl } = job.data;
    
    logger.info({ websiteUrl }, 'Scraping contact page');
    
    try {
      // Find contact page
      const contactUrls = [
        `${websiteUrl}/contact`,
        `${websiteUrl}/contacte`,
        `${websiteUrl}/contact-us`,
        `${websiteUrl}/despre-noi`,
        `${websiteUrl}/about`,
      ];
      
      let contactData: any = {};
      
      for (const url of contactUrls) {
        try {
          const response = await axios.get(url, { timeout: 10000 });
          const $ = cheerio.load(response.data);
          
          // Extract emails
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const pageText = $('body').text();
          const emails = [...new Set(pageText.match(emailRegex) || [])];
          
          // Extract phones
          const phoneRegex = /(?:\+40|0)[2-9]\d{8}|\(?0\d{2,3}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}/g;
          const phones = [...new Set(pageText.match(phoneRegex) || [])];
          
          // Extract address
          const addressPatterns = [
            /str\.?\s+[A-Za-zăâîșțĂÂÎȘȚ\s]+,?\s*nr\.?\s*\d+/gi,
            /[A-Za-zăâîșțĂÂÎȘȚ\s]+,\s*jude[țt]ul?\s+[A-Za-zăâîșțĂÂÎȘȚ\s]+/gi,
          ];
          
          let address = null;
          for (const pattern of addressPatterns) {
            const match = pageText.match(pattern);
            if (match) {
              address = match[0];
              break;
            }
          }
          
          if (emails.length > 0 || phones.length > 0) {
            contactData = {
              emails: emails.filter(e => !e.includes('example.com')),
              phones,
              address,
              sourceUrl: url,
            };
            break;
          }
        } catch {
          // Continue to next URL
        }
      }
      
      if (Object.keys(contactData).length === 0) {
        return { status: 'no_contact_info' };
      }
      
      // Update company
      if (contactData.emails?.length > 0) {
        const mainEmail = contactData.emails.find((e: string) => 
          !e.startsWith('info@') && !e.startsWith('contact@')
        ) || contactData.emails[0];
        
        await db.update(silverCompanies)
          .set({
            emailPrincipal: mainEmail,
            emailuriSecundare: contactData.emails.slice(1),
          })
          .where(eq(silverCompanies.id, companyId));
      }
      
      if (contactData.phones?.length > 0) {
        await db.update(silverCompanies)
          .set({
            telefonPrincipal: contactData.phones[0],
            telefoaneSecundare: contactData.phones.slice(1),
          })
          .where(eq(silverCompanies.id, companyId));
      }
      
      await db.update(silverCompanies)
        .set({
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'contact_scraper'),
              'contact_scraper'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ websiteUrl, contactData }, 'Contact page scraped');
      
      return { status: 'success', ...contactData };
      
    } catch (error) {
      logger.error({ error, websiteUrl }, 'Contact page scraping error');
      throw error;
    }
  },
});
```

---

# 2. CATEGORIA J: AI WORKERS

## 2.1 J.1 - xAI Grok Data Structuring Worker

```typescript
// apps/workers/src/silver/grok-structuring.worker.ts

import { createWorker } from '@cerniq/queue';
import OpenAI from 'openai';
import { db, silverCompanies } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface GrokStructuringJobData {
  tenantId: string;
  companyId: string;
  rawData: Record<string, any>;
  correlationId: string;
}

// Rate limit: 60 requests/minute for xAI
export const grokStructuringWorker = createWorker<GrokStructuringJobData, GrokStructuringResult>({
  queueName: 'silver:enrich:grok-structuring',
  concurrency: 5,
  limiter: { max: 60, duration: 60000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 60000,

  processor: async (job, logger) => {
    const { tenantId, companyId, rawData } = job.data;
    
    logger.info({ companyId }, 'Structuring data with xAI Grok');
    
    const xai = new OpenAI({
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.XAI_API_KEY,
    });
    
    try {
      const prompt = buildStructuringPrompt(rawData);
      
      const response = await xai.chat.completions.create({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: `Ești un expert în extragerea și structurarea datelor despre companii românești. 
Extrage informațiile relevante și returnează-le în format JSON strict.
Focusează-te pe: denumire, CUI, adresă, telefon, email, sector de activitate.
Pentru companiile agricole, identifică: suprafață, culturi, animale, echipamente.
Răspunde DOAR cu JSON valid, fără text suplimentar.`
          },
          {
            role: 'user',
            content: prompt,
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
      
      const structured = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate structured data
      const validated = validateStructuredData(structured);
      
      if (!validated.isValid) {
        logger.warn({ errors: validated.errors }, 'Structured data validation failed');
        
        // Trigger HITL for low confidence
        await createApprovalTask({
          tenantId,
          entityType: 'company',
          entityId: companyId,
          approvalType: 'ai_structuring_review',
          pipelineStage: 'E1',
          metadata: {
            rawData,
            structuredData: structured,
            validationErrors: validated.errors,
          },
        });
        
        return { status: 'hitl_required', errors: validated.errors };
      }
      
      // Update company with structured data
      await db.update(silverCompanies)
        .set({
          ...mapStructuredToCompany(validated.data),
          aiStructuringConfidence: validated.confidence,
          aiStructuringModel: 'grok-beta',
          aiStructuredAt: new Date(),
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'ai_structuring'),
              'ai_structuring'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ companyId, confidence: validated.confidence }, 'Data structured with AI');
      
      return { 
        status: 'success', 
        confidence: validated.confidence,
        fieldsExtracted: Object.keys(validated.data),
      };
      
    } catch (error) {
      logger.error({ error, companyId }, 'Grok structuring error');
      throw error;
    }
  },
});

function buildStructuringPrompt(rawData: Record<string, any>): string {
  return `Extrage și structurează informațiile din următoarele date brute despre o companie:

${JSON.stringify(rawData, null, 2)}

Returnează un JSON cu următoarea structură:
{
  "denumire": "string",
  "cui": "string (doar cifre)",
  "adresa": {
    "strada": "string",
    "numar": "string",
    "localitate": "string",
    "judet": "string",
    "cod_postal": "string"
  },
  "contact": {
    "telefon": "string (format +40...)",
    "email": "string",
    "website": "string"
  },
  "activitate": {
    "cod_caen": "string",
    "descriere": "string",
    "is_agricol": boolean
  },
  "date_agricole": {
    "suprafata_ha": number,
    "culturi": ["string"],
    "animale": ["string"],
    "echipamente": ["string"]
  },
  "confidence": number (0-1)
}`;
}

function validateStructuredData(data: any): {
  isValid: boolean;
  errors: string[];
  confidence: number;
  data: any;
} {
  const errors: string[] = [];
  let confidence = data.confidence || 0.5;
  
  // Required fields
  if (!data.denumire) errors.push('Missing denumire');
  if (!data.cui || !/^\d{6,10}$/.test(data.cui)) errors.push('Invalid CUI');
  
  // Validate CUI checksum
  if (data.cui && !validateCuiChecksum(data.cui)) {
    errors.push('CUI checksum invalid');
    confidence *= 0.5;
  }
  
  // Validate phone format
  if (data.contact?.telefon && !/^\+?40?\d{9,10}$/.test(data.contact.telefon.replace(/\D/g, ''))) {
    errors.push('Invalid phone format');
    confidence *= 0.8;
  }
  
  // Validate email format
  if (data.contact?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact.email)) {
    errors.push('Invalid email format');
    confidence *= 0.8;
  }
  
  return {
    isValid: errors.length === 0 && confidence >= 0.7,
    errors,
    confidence,
    data,
  };
}

function validateCuiChecksum(cui: string): boolean {
  const digits = cui.padStart(10, '0').split('').map(Number);
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  
  const checksum = (sum * 10) % 11 % 10;
  return checksum === digits[9];
}
```

## 2.2 J.2 - AI Data Merger Worker

```typescript
// apps/workers/src/silver/ai-data-merger.worker.ts

export const aiDataMergerWorker = createWorker<AiMergerJobData, AiMergerResult>({
  queueName: 'silver:enrich:ai-data-merger',
  concurrency: 5,
  limiter: { max: 60, duration: 60000 },
  attempts: 2,
  timeout: 60000,

  processor: async (job, logger) => {
    const { tenantId, companyId, dataSources } = job.data;
    
    logger.info({ companyId, sources: Object.keys(dataSources) }, 'Merging data with AI');
    
    const xai = new OpenAI({
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.XAI_API_KEY,
    });
    
    try {
      const prompt = `Analizează următoarele date despre aceeași companie din surse diferite și unifică-le:

${JSON.stringify(dataSources, null, 2)}

Pentru fiecare câmp, alege valoarea cea mai probabil corectă și explică de ce.
Rezolvă conflictele astfel:
- ANAF > Termene.ro > ONRC > Scraping pentru date fiscale
- Ultima dată pentru date care se schimbă frecvent
- Sursă oficială > sursă terță

Returnează JSON cu:
{
  "merged_data": { ... datele unificate ... },
  "conflicts_resolved": [
    { "field": "...", "chosen_value": "...", "reason": "...", "alternatives": [...] }
  ],
  "confidence": 0-1
}`;

      const response = await xai.chat.completions.create({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: 'Ești un expert în reconcilierea datelor din surse multiple.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      if (result.confidence < 0.7 && result.conflicts_resolved?.length > 0) {
        // Create HITL task for low confidence merges
        await createApprovalTask({
          tenantId,
          entityType: 'company',
          entityId: companyId,
          approvalType: 'ai_merge_review',
          pipelineStage: 'E1',
          metadata: {
            dataSources,
            mergedData: result.merged_data,
            conflicts: result.conflicts_resolved,
            confidence: result.confidence,
          },
        });
        
        return { status: 'hitl_required', confidence: result.confidence };
      }
      
      // Apply merged data
      await db.update(silverCompanies)
        .set({
          ...result.merged_data,
          aiMergeConfidence: result.confidence,
          aiMergedAt: new Date(),
          mergeHistory: db.sql`merge_history || ${JSON.stringify({
            timestamp: new Date(),
            sources: Object.keys(dataSources),
            conflicts: result.conflicts_resolved,
          })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ companyId, confidence: result.confidence }, 'Data merged');
      
      return { status: 'success', confidence: result.confidence };
      
    } catch (error) {
      logger.error({ error, companyId }, 'AI merger error');
      throw error;
    }
  },
});
```

## 2.3 J.3 - AI Confidence Scorer Worker

```typescript
// apps/workers/src/silver/ai-confidence-scorer.worker.ts

export const aiConfidenceScorerWorker = createWorker<AiConfidenceJobData, AiConfidenceResult>({
  queueName: 'silver:enrich:ai-confidence-scorer',
  concurrency: 10,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId } = job.data;
    
    // Get company data
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company) {
      return { status: 'not_found' };
    }
    
    // Calculate confidence scores for each field
    const fieldConfidences: Record<string, number> = {};
    
    // CUI confidence
    if (company.cuiValidated) {
      fieldConfidences.cui = 1.0;
    } else if (company.cui) {
      fieldConfidences.cui = validateCuiChecksum(company.cui) ? 0.8 : 0.3;
    }
    
    // Denumire confidence
    if (company.denumire && company.cuiValidated) {
      fieldConfidences.denumire = 1.0;
    } else if (company.denumire) {
      fieldConfidences.denumire = 0.7;
    }
    
    // Address confidence
    if (company.latitude && company.longitude && company.geocodingAccuracy === 'rooftop') {
      fieldConfidences.adresa = 1.0;
    } else if (company.localitate && company.judet) {
      fieldConfidences.adresa = 0.7;
    } else if (company.adresaCompleta) {
      fieldConfidences.adresa = 0.4;
    }
    
    // Email confidence
    if (company.emailVerificat) {
      fieldConfidences.email = 1.0;
    } else if (company.emailPrincipal && company.emailConfidence) {
      fieldConfidences.email = company.emailConfidence / 100;
    } else if (company.emailPrincipal) {
      fieldConfidences.email = 0.5;
    }
    
    // Phone confidence
    if (company.hlrReachable === true) {
      fieldConfidences.telefon = 1.0;
    } else if (company.telefonValid) {
      fieldConfidences.telefon = 0.8;
    } else if (company.telefonPrincipal) {
      fieldConfidences.telefon = 0.5;
    }
    
    // Calculate overall confidence
    const values = Object.values(fieldConfidences);
    const overallConfidence = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
    
    // Determine if HITL needed
    const lowConfidenceFields = Object.entries(fieldConfidences)
      .filter(([_, conf]) => conf < 0.5)
      .map(([field, _]) => field);
    
    if (lowConfidenceFields.length > 2 || overallConfidence < 0.5) {
      await createApprovalTask({
        tenantId,
        entityType: 'company',
        entityId: companyId,
        approvalType: 'low_confidence_review',
        pipelineStage: 'E1',
        metadata: {
          fieldConfidences,
          overallConfidence,
          lowConfidenceFields,
        },
      });
    }
    
    await db.update(silverCompanies)
      .set({
        aiConfidenceScores: fieldConfidences,
        aiOverallConfidence: overallConfidence,
        aiConfidenceScoredAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));
    
    logger.info({ companyId, overallConfidence }, 'Confidence scored');
    
    return { 
      status: 'success', 
      overallConfidence,
      fieldConfidences,
      hitlRequired: lowConfidenceFields.length > 2,
    };
  },
});
```

## 2.4 J.4 - AI Fallback Enrichment Worker

```typescript
// apps/workers/src/silver/ai-fallback-enrichment.worker.ts

export const aiFallbackEnrichmentWorker = createWorker<AiFallbackJobData, AiFallbackResult>({
  queueName: 'silver:enrich:ai-fallback',
  concurrency: 3,
  limiter: { max: 30, duration: 60000 },
  attempts: 2,
  timeout: 90000,

  processor: async (job, logger) => {
    const { tenantId, companyId, missingFields } = job.data;
    
    logger.info({ companyId, missingFields }, 'AI fallback enrichment');
    
    // Get company data
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company) {
      return { status: 'not_found' };
    }
    
    const xai = new OpenAI({
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.XAI_API_KEY,
    });
    
    try {
      // Use AI with web search capability to find missing data
      const prompt = `Găsește informații lipsă despre compania:
Denumire: ${company.denumire}
CUI: ${company.cui}
Județ: ${company.judet}

Câmpuri lipsă necesare: ${missingFields.join(', ')}

Caută pe web informații despre această companie și completează câmpurile lipsă.
Indică sursa fiecărei informații găsite.

Returnează JSON:
{
  "found_data": { "field": { "value": "...", "source": "...", "confidence": 0-1 } },
  "not_found": ["field1", "field2"]
}`;

      const response = await xai.chat.completions.create({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: 'Ești un asistent de cercetare business cu acces la web.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Apply found data with appropriate confidence markers
      const updateData: Record<string, any> = {
        aiFallbackAt: new Date(),
      };
      
      for (const [field, data] of Object.entries(result.found_data || {})) {
        if ((data as any).confidence >= 0.6) {
          updateData[field] = (data as any).value;
          updateData[`${field}_source`] = `ai_fallback: ${(data as any).source}`;
        }
      }
      
      if (Object.keys(updateData).length > 1) {
        await db.update(silverCompanies)
          .set(updateData)
          .where(eq(silverCompanies.id, companyId));
      }
      
      logger.info({ 
        companyId, 
        found: Object.keys(result.found_data || {}),
        notFound: result.not_found,
      }, 'AI fallback complete');
      
      return { 
        status: 'success',
        foundFields: Object.keys(result.found_data || {}),
        notFoundFields: result.not_found || [],
      };
      
    } catch (error) {
      logger.error({ error, companyId }, 'AI fallback error');
      throw error;
    }
  },
});
```

---

# 3. CATEGORIA K: GEOCODING WORKERS

## 3.1 K.1 - Nominatim Geocoding Worker

```typescript
// apps/workers/src/silver/nominatim-geocoding.worker.ts

import { createWorker } from '@cerniq/queue';
import axios from 'axios';
import { db, silverCompanies } from '@cerniq/db';
import { eq, sql } from 'drizzle-orm';

export const nominatimGeocodingWorker = createWorker<GeocodingJobData, GeocodingResult>({
  queueName: 'silver:enrich:nominatim-geocoding',
  concurrency: 1, // Nominatim: 1 request/second
  limiter: { max: 1, duration: 1000 },
  attempts: 3,
  backoff: { type: 'fixed', delay: 2000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, adresa, localitate, judet } = job.data;
    
    if (!adresa && !localitate) {
      return { status: 'skipped', reason: 'no_address' };
    }
    
    logger.info({ adresa, localitate }, 'Geocoding address with Nominatim');
    
    // Build search query
    const searchParts = [adresa, localitate, judet, 'Romania'].filter(Boolean);
    const query = searchParts.join(', ');
    
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 1,
          countrycodes: 'ro',
        },
        headers: {
          'User-Agent': 'CerniqApp/1.0 (contact@cerniq.app)',
        },
      });
      
      if (!response.data || response.data.length === 0) {
        // Try fallback with just locality
        if (localitate) {
          const fallbackResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
              q: `${localitate}, ${judet}, Romania`,
              format: 'json',
              limit: 1,
              countrycodes: 'ro',
            },
            headers: {
              'User-Agent': 'CerniqApp/1.0 (contact@cerniq.app)',
            },
          });
          
          if (fallbackResponse.data?.length > 0) {
            const result = fallbackResponse.data[0];
            await updateGeocodingResult(companyId, result, 'locality');
            return { status: 'success', accuracy: 'locality' };
          }
        }
        
        return { status: 'not_found' };
      }
      
      const result = response.data[0];
      const accuracy = determineAccuracy(result);
      
      await updateGeocodingResult(companyId, result, accuracy);
      
      logger.info({ 
        latitude: result.lat, 
        longitude: result.lon,
        accuracy,
      }, 'Address geocoded');
      
      // Trigger PostGIS zone calculation
      await postgisZonesQueue.add('calculate', {
        tenantId,
        companyId,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      });
      
      return { 
        status: 'success',
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        accuracy,
      };
      
    } catch (error) {
      logger.error({ error, query }, 'Nominatim geocoding error');
      throw error;
    }
  },
});

async function updateGeocodingResult(companyId: string, result: any, accuracy: string) {
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  
  await db.update(silverCompanies)
    .set({
      latitude: lat,
      longitude: lon,
      // Update PostGIS geography
      locationGeography: sql`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography`,
      geocodingAccuracy: accuracy,
      geocodingSource: 'nominatim',
      geocodedAt: new Date(),
      // Extract address components
      localitateGeocoded: result.address?.city || result.address?.town || result.address?.village,
      judetGeocoded: result.address?.county,
      codPostalGeocoded: result.address?.postcode,
      enrichmentSourcesCompleted: sql`
        array_append(
          array_remove(enrichment_sources_completed, 'geocoding'),
          'geocoding'
        )
      `,
      lastEnrichmentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(silverCompanies.id, companyId));
}

function determineAccuracy(result: any): string {
  const placeRank = result.place_rank;
  
  if (placeRank >= 26) return 'street'; // Street level
  if (placeRank >= 22) return 'locality';
  if (placeRank >= 16) return 'county';
  if (placeRank >= 12) return 'region';
  return 'country';
}
```

## 3.2 K.2 - PostGIS Zones Calculator Worker

```typescript
// apps/workers/src/silver/postgis-zones.worker.ts

export const postgisZonesWorker = createWorker<PostgisZonesJobData, PostgisZonesResult>({
  queueName: 'silver:enrich:postgis-zones',
  concurrency: 10,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, latitude, longitude } = job.data;
    
    logger.info({ latitude, longitude }, 'Calculating PostGIS zones');
    
    try {
      // Find nearest OUAI (irrigation zone)
      const ouaiResult = await db.execute(sql`
        SELECT 
          o.id,
          o.denumire,
          o.judet,
          ST_Distance(
            o.location_geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) as distance_meters
        FROM ouai_zones o
        WHERE ST_DWithin(
          o.location_geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          50000  -- 50km radius
        )
        ORDER BY distance_meters
        LIMIT 1
      `);
      
      // Find county and commune
      const adminResult = await db.execute(sql`
        SELECT 
          a.judet_cod,
          a.judet_nume,
          a.comuna_cod,
          a.comuna_nume,
          a.cod_siruta
        FROM administrative_units a
        WHERE ST_Contains(
          a.geometry,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
        )
        AND a.type = 'comuna'
        LIMIT 1
      `);
      
      // Calculate distance to nearest city
      const cityResult = await db.execute(sql`
        SELECT 
          c.name,
          c.population,
          ST_Distance(
            c.location_geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) / 1000 as distance_km
        FROM cities c
        WHERE c.population > 50000
        ORDER BY c.location_geography <-> ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        LIMIT 1
      `);
      
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };
      
      if (ouaiResult[0]) {
        updateData.ouaiZoneId = ouaiResult[0].id;
        updateData.ouaiZoneName = ouaiResult[0].denumire;
        updateData.distanceToOuai = ouaiResult[0].distance_meters;
        updateData.isInOuaiZone = ouaiResult[0].distance_meters < 10000; // Within 10km
      }
      
      if (adminResult[0]) {
        updateData.judetCod = adminResult[0].judet_cod;
        updateData.comunaCod = adminResult[0].comuna_cod;
        updateData.comunaNume = adminResult[0].comuna_nume;
        updateData.codSiruta = adminResult[0].cod_siruta;
      }
      
      if (cityResult[0]) {
        updateData.nearestCityName = cityResult[0].name;
        updateData.nearestCityDistance = cityResult[0].distance_km;
        updateData.isRuralArea = cityResult[0].distance_km > 30;
      }
      
      await db.update(silverCompanies)
        .set(updateData)
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ companyId, updateData }, 'PostGIS zones calculated');
      
      return { status: 'success', ...updateData };
      
    } catch (error) {
      logger.error({ error, latitude, longitude }, 'PostGIS zones error');
      throw error;
    }
  },
});
```

## 3.3 K.3 - Proximity Calculator Worker

```typescript
// apps/workers/src/silver/proximity-calculator.worker.ts

export const proximityCalculatorWorker = createWorker<ProximityJobData, ProximityResult>({
  queueName: 'silver:enrich:proximity-calculator',
  concurrency: 10,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, latitude, longitude } = job.data;
    
    logger.info({ companyId }, 'Calculating proximity metrics');
    
    try {
      // Find nearby companies (potential partners/competitors)
      const nearbyCompanies = await db.execute(sql`
        SELECT 
          gc.id,
          gc.denumire,
          gc.cod_caen_principal,
          gc.is_agricultural,
          ST_Distance(
            gc.location_geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) / 1000 as distance_km
        FROM gold_companies gc
        WHERE gc.tenant_id = ${tenantId}
          AND gc.id != ${companyId}
          AND gc.location_geography IS NOT NULL
          AND ST_DWithin(
            gc.location_geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            50000  -- 50km
          )
        ORDER BY distance_km
        LIMIT 20
      `);
      
      // Find nearby agricultural cooperatives
      const nearbyCoops = await db.execute(sql`
        SELECT 
          c.id,
          c.denumire,
          c.tip_cooperativa,
          ST_Distance(
            c.location_geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) / 1000 as distance_km
        FROM cooperative_agricole c
        WHERE ST_DWithin(
          c.location_geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          30000  -- 30km
        )
        ORDER BY distance_km
        LIMIT 10
      `);
      
      // Find agricultural input suppliers nearby
      const nearbySuppliers = await db.execute(sql`
        SELECT 
          s.id,
          s.denumire,
          s.tip_furnizor,
          ST_Distance(
            s.location_geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) / 1000 as distance_km
        FROM furnizori_agricoli s
        WHERE ST_DWithin(
          s.location_geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          100000  -- 100km
        )
        ORDER BY distance_km
        LIMIT 10
      `);
      
      await db.update(silverCompanies)
        .set({
          nearbyCompaniesCount: nearbyCompanies.length,
          nearbyCoopsCount: nearbyCoops.length,
          nearbySuppliersCount: nearbySuppliers.length,
          nearestCoopId: nearbyCoops[0]?.id,
          nearestCoopDistance: nearbyCoops[0]?.distance_km,
          proximityCalculatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ 
        companyId,
        nearbyCompanies: nearbyCompanies.length,
        nearbyCoops: nearbyCoops.length,
      }, 'Proximity calculated');
      
      return {
        status: 'success',
        nearbyCompanies: nearbyCompanies.length,
        nearbyCoops: nearbyCoops.length,
        nearbySuppliers: nearbySuppliers.length,
      };
      
    } catch (error) {
      logger.error({ error, companyId }, 'Proximity calculation error');
      throw error;
    }
  },
});
```

---

# 4. CATEGORIA L: AGRICULTURAL DATA WORKERS

## 4.1 L.1 - APIA Data Worker

```typescript
// apps/workers/src/silver/apia-data.worker.ts

export const apiaDataWorker = createWorker<ApiaDataJobData, ApiaDataResult>({
  queueName: 'silver:enrich:apia-data',
  concurrency: 2,
  limiter: { max: 1, duration: 2000 },
  attempts: 2,
  timeout: 120000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui, judet } = job.data;
    
    logger.info({ cui }, 'Fetching APIA subsidy data');
    
    let browser: Browser | null = null;
    
    try {
      // APIA has public registry of subsidy beneficiaries
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto('https://www.apia.org.ro/registru-beneficiari', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      
      // Search by CUI
      await page.fill('#cui-search', cui);
      await page.click('#btn-search');
      await page.waitForTimeout(3000);
      
      const hasResults = await page.$('.beneficiar-row');
      if (!hasResults) {
        return { status: 'not_found' };
      }
      
      const data = await page.evaluate(() => {
        const result: Record<string, any> = {};
        
        // Extract subsidy data
        const subsidyRows = document.querySelectorAll('.subsidy-row');
        result.subsidies = Array.from(subsidyRows).map(row => ({
          year: row.querySelector('.year')?.textContent,
          amount: parseFloat(row.querySelector('.amount')?.textContent?.replace(/[^\d.]/g, '') || '0'),
          type: row.querySelector('.type')?.textContent,
        }));
        
        // Extract farm data
        result.suprafataTotala = parseFloat(
          document.querySelector('.suprafata-totala')?.textContent?.replace(/[^\d.]/g, '') || '0'
        );
        result.categorieExploatatie = document.querySelector('.categorie')?.textContent;
        
        return result;
      });
      
      // Calculate total subsidies
      const totalSubsidies = data.subsidies?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0;
      const lastSubsidyYear = Math.max(...(data.subsidies?.map((s: any) => parseInt(s.year) || 0) || [0]));
      
      await db.update(silverCompanies)
        .set({
          isAgricultural: true,
          apiaRegistered: true,
          suprafataAgricola: data.suprafataTotala,
          categorieExploatatie: data.categorieExploatatie,
          totalSubsidiiPrimite: totalSubsidies,
          ultimulAnSubventie: lastSubsidyYear,
          subsidiiDetalii: data.subsidies,
          apiaDataAt: new Date(),
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'apia_data'),
              'apia_data'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, totalSubsidies }, 'APIA data fetched');
      
      return { 
        status: 'success',
        suprafata: data.suprafataTotala,
        totalSubsidies,
      };
      
    } catch (error) {
      logger.error({ error, cui }, 'APIA scraping error');
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  },
});
```

## 4.2-4.5 L.2-L.5 - OUAI, Cooperative, Culturi, Animale Workers

```typescript
// apps/workers/src/silver/ouai-membership.worker.ts

export const ouaiMembershipWorker = createWorker<OuaiJobData, OuaiResult>({
  queueName: 'silver:enrich:ouai-membership',
  concurrency: 5,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui, ouaiZoneId } = job.data;
    
    if (!ouaiZoneId) {
      return { status: 'skipped', reason: 'no_ouai_zone' };
    }
    
    // Check OUAI membership
    const membership = await db.query.ouaiMemberships.findFirst({
      where: and(
        eq(ouaiMemberships.cui, cui),
        eq(ouaiMemberships.ouaiId, ouaiZoneId)
      ),
    });
    
    if (membership) {
      await db.update(silverCompanies)
        .set({
          isOuaiMember: true,
          ouaiMembershipId: membership.id,
          suprafataIrigataDeclarat: membership.suprafataIrigata,
          contributieOuai: membership.contributieAnuala,
          statusMembru: membership.status,
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, ouaiId: ouaiZoneId }, 'OUAI membership found');
      
      return { status: 'success', isMember: true };
    }
    
    return { status: 'success', isMember: false };
  },
});

// apps/workers/src/silver/cooperative-membership.worker.ts
export const cooperativeMembershipWorker = createWorker<CoopJobData, CoopResult>({
  queueName: 'silver:enrich:cooperative-membership',
  concurrency: 5,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui, nearbyCoopId } = job.data;
    
    // Search for cooperative memberships
    const memberships = await db.query.cooperativeMemberships.findMany({
      where: eq(cooperativeMemberships.memberCui, cui),
      with: { cooperative: true },
    });
    
    if (memberships.length > 0) {
      await db.update(silverCompanies)
        .set({
          isCooperativeMember: true,
          cooperativeCount: memberships.length,
          cooperativeIds: memberships.map(m => m.cooperativeId),
          primaryCooperativeId: memberships[0].cooperativeId,
          primaryCooperativeName: memberships[0].cooperative.denumire,
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, coops: memberships.length }, 'Cooperative memberships found');
    }
    
    return { 
      status: 'success', 
      isMember: memberships.length > 0,
      count: memberships.length,
    };
  },
});

// apps/workers/src/silver/culturi-classifier.worker.ts
export const culturiClassifierWorker = createWorker<CulturiJobData, CulturiResult>({
  queueName: 'silver:enrich:culturi-classifier',
  concurrency: 10,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, culturiRaw, codCaen } = job.data;
    
    // Classify crops based on CAEN and raw data
    const culturesMap: Record<string, string[]> = {
      '0111': ['cereale', 'grâu', 'porumb', 'orz', 'ovăz'],
      '0112': ['orez'],
      '0113': ['legume', 'cartofi', 'roșii', 'castraveți'],
      '0114': ['trestie zahăr', 'sfeclă'],
      '0116': ['plante textile', 'bumbac', 'in', 'cânepă'],
      '0121': ['struguri', 'viță de vie'],
      '0122': ['fructe tropicale', 'citrice'],
      '0123': ['fructe', 'mere', 'pere', 'prune'],
      '0124': ['fructe sâmburoase', 'cireșe', 'piersici'],
      '0125': ['fructe pădure', 'nuci'],
      '0126': ['oleaginoase', 'floarea soarelui', 'rapiță'],
      '0127': ['cafea', 'cacao', 'condimente'],
      '0128': ['plante medicinale'],
    };
    
    let classifiedCrops: string[] = [];
    
    // From CAEN code
    if (codCaen && culturesMap[codCaen]) {
      classifiedCrops = culturesMap[codCaen];
    }
    
    // From raw data (if available)
    if (culturiRaw && Array.isArray(culturiRaw)) {
      classifiedCrops = [...new Set([...classifiedCrops, ...culturiRaw])];
    }
    
    // Determine primary category
    const categories = {
      CEREALE: ['cereale', 'grâu', 'porumb', 'orz'],
      LEGUME: ['legume', 'cartofi', 'roșii'],
      FRUCTE: ['fructe', 'mere', 'struguri'],
      OLEAGINOASE: ['floarea soarelui', 'rapiță'],
      INDUSTRIAL: ['plante textile', 'sfeclă'],
    };
    
    let primaryCategory = 'DIVERSE';
    for (const [cat, keywords] of Object.entries(categories)) {
      if (classifiedCrops.some(c => keywords.some(k => c.toLowerCase().includes(k)))) {
        primaryCategory = cat;
        break;
      }
    }
    
    await db.update(silverCompanies)
      .set({
        culturiPrincipale: classifiedCrops.slice(0, 10),
        categorieAgricola: primaryCategory,
        tipProducator: determineTipProducator(classifiedCrops),
      })
      .where(eq(silverCompanies.id, companyId));
    
    logger.info({ companyId, crops: classifiedCrops.length }, 'Crops classified');
    
    return { 
      status: 'success',
      crops: classifiedCrops,
      category: primaryCategory,
    };
  },
});

function determineTipProducator(culturi: string[]): string {
  if (culturi.length === 0) return 'NECUNOSCUT';
  if (culturi.length === 1) return 'MONO_CULTURA';
  if (culturi.length <= 3) return 'DIVERSIFICAT';
  return 'FOARTE_DIVERSIFICAT';
}

// apps/workers/src/silver/animale-classifier.worker.ts
export const animaleClassifierWorker = createWorker<AnimaleJobData, AnimaleResult>({
  queueName: 'silver:enrich:animale-classifier',
  concurrency: 10,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, animaleRaw, codCaen } = job.data;
    
    const animalsCaen: Record<string, { type: string; category: string }> = {
      '0141': { type: 'bovine', category: 'ZOOTEHNIE_MARE' },
      '0142': { type: 'bovine_lapte', category: 'LAPTE' },
      '0143': { type: 'cabaline', category: 'ZOOTEHNIE_MARE' },
      '0145': { type: 'ovine_caprine', category: 'ZOOTEHNIE_MICA' },
      '0146': { type: 'porcine', category: 'ZOOTEHNIE_MARE' },
      '0147': { type: 'pasari', category: 'AVICULTURA' },
      '0149': { type: 'diverse', category: 'ALTA_ZOOTEHNIE' },
    };
    
    let animalTypes: string[] = [];
    let category = 'FARA_ANIMALE';
    
    if (codCaen && animalsCaen[codCaen]) {
      animalTypes = [animalsCaen[codCaen].type];
      category = animalsCaen[codCaen].category;
    }
    
    if (animaleRaw && Array.isArray(animaleRaw)) {
      animalTypes = [...new Set([...animalTypes, ...animaleRaw])];
    }
    
    await db.update(silverCompanies)
      .set({
        tipuriAnimale: animalTypes,
        categorieZootehnica: animalTypes.length > 0 ? category : 'FARA_ANIMALE',
        esteFermaZootehnica: animalTypes.length > 0,
      })
      .where(eq(silverCompanies.id, companyId));
    
    logger.info({ companyId, animals: animalTypes }, 'Animals classified');
    
    return { 
      status: 'success',
      animals: animalTypes,
      category,
    };
  },
});
```

---

# 5. QUEUE CONFIGURATION SUMMARY

| Worker | Queue Name | Concurrency | Rate Limit | Timeout |
|--------|-----------|-------------|------------|---------|
| I.1 DAJ Scraper | `silver:enrich:daj-scraper` | 2 | 0.5/s | 120s |
| I.2 ANIF Scraper | `silver:enrich:anif-scraper` | 2 | 0.5/s | 120s |
| I.3 Website Finder | `silver:enrich:website-finder` | 5 | 5/s | 30s |
| I.4 Contact Scraper | `silver:enrich:contact-page-scraper` | 3 | 2/s | 60s |
| J.1 Grok Structuring | `silver:enrich:grok-structuring` | 5 | 60/min | 60s |
| J.2 AI Merger | `silver:enrich:ai-data-merger` | 5 | 60/min | 60s |
| J.3 Confidence Scorer | `silver:enrich:ai-confidence-scorer` | 10 | - | 30s |
| J.4 AI Fallback | `silver:enrich:ai-fallback` | 3 | 30/min | 90s |
| K.1 Nominatim | `silver:enrich:nominatim-geocoding` | 1 | 1/s | 30s |
| K.2 PostGIS Zones | `silver:enrich:postgis-zones` | 10 | - | 30s |
| K.3 Proximity | `silver:enrich:proximity-calculator` | 10 | - | 30s |
| L.1 APIA | `silver:enrich:apia-data` | 2 | 0.5/s | 120s |
| L.2 OUAI | `silver:enrich:ouai-membership` | 5 | - | 30s |
| L.3 Cooperative | `silver:enrich:cooperative-membership` | 5 | - | 30s |
| L.4 Culturi | `silver:enrich:culturi-classifier` | 10 | - | 30s |
| L.5 Animale | `silver:enrich:animale-classifier` | 10 | - | 30s |

---

**Document generat:** 15 Ianuarie 2026
**Total workers:** 16 (I.1-I.4, J.1-J.4, K.1-K.3, L.1-L.5)
**Conformitate:** Master Spec v1.2
