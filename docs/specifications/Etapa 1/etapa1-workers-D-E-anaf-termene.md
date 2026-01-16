# CERNIQ.APP — ETAPA 1: WORKERS CATEGORIA D-E
## ANAF API & Termene.ro Integration
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. CATEGORIA D: ANAF API WORKERS

## 1.1 D.1 - ANAF Fiscal Status Worker

```typescript
// apps/workers/src/silver/anaf-fiscal-status.worker.ts

import { createWorker } from '@cerniq/queue';
import { AnafApiClient } from '@cerniq/integrations/anaf';
import { db, silverCompanies } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface AnafFiscalJobData {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId: string;
}

interface AnafFiscalResult {
  status: 'success' | 'not_found' | 'error';
  fieldsUpdated?: string[];
}

// Rate limit: 1 request/second conform ANAF API
export const anafFiscalStatusWorker = createWorker<AnafFiscalJobData, AnafFiscalResult>({
  queueName: 'silver:enrich:anaf-fiscal-status',
  concurrency: 1, // Single thread pentru rate limit
  limiter: {
    max: 1,
    duration: 1000, // 1 per secundă
  },
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000, // Start 2s, then 4s, 8s, 16s, 32s
  },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    logger.info({ cui }, 'Fetching ANAF fiscal status');
    
    const anafClient = new AnafApiClient({
      baseUrl: process.env.ANAF_API_URL || 'https://webservicesp.anaf.ro/AsynchWebService/api/v8',
      timeout: 15000,
    });
    
    try {
      // ANAF API call
      const response = await anafClient.getFiscalStatus(cui);
      
      if (!response || response.cod !== 200) {
        logger.warn({ cui, response }, 'CUI not found in ANAF');
        
        await db.update(silverCompanies)
          .set({
            cuiValidated: false,
            cuiValidationDate: new Date(),
            cuiValidationSource: 'anaf_api',
            enrichmentErrors: db.sql`enrichment_errors || ${JSON.stringify({ anaf_fiscal: 'CUI not found' })}::jsonb`,
          })
          .where(eq(silverCompanies.id, companyId));
        
        return { status: 'not_found' };
      }
      
      const data = response.date_generale;
      const fieldsUpdated: string[] = [];
      
      // Build update object
      const updateData: Partial<typeof silverCompanies.$inferInsert> = {
        cuiValidated: true,
        cuiValidationDate: new Date(),
        cuiValidationSource: 'anaf_api',
        denumire: data.denumire || undefined,
        nrRegCom: data.nrRegCom || undefined,
        statusFirma: mapAnafStatus(data.stare_inregistrare),
        dataInregistrare: data.data_inregistrare ? new Date(data.data_inregistrare) : undefined,
        adresaCompleta: data.adresa || undefined,
        codCaenPrincipal: data.cod_CAEN || undefined,
        updatedAt: new Date(),
      };
      
      // Track updated fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) fieldsUpdated.push(key);
      });
      
      // Update enrichment sources
      updateData.enrichmentSourcesCompleted = db.sql`
        CASE 
          WHEN NOT ('anaf_fiscal' = ANY(enrichment_sources_completed))
          THEN array_append(enrichment_sources_completed, 'anaf_fiscal')
          ELSE enrichment_sources_completed
        END
      `;
      updateData.lastEnrichmentAt = new Date();
      
      await db.update(silverCompanies)
        .set(updateData)
        .where(eq(silverCompanies.id, companyId));
      
      // Log enrichment
      await db.insert(silverEnrichmentLog).values({
        tenantId,
        entityType: 'company',
        entityId: companyId,
        source: 'anaf_fiscal',
        operation: 'fetch',
        status: 'success',
        fieldsUpdated,
        responseData: response,
        durationMs: job.processedOn ? Date.now() - job.processedOn : 0,
      });
      
      logger.info({ cui, fieldsUpdated }, 'ANAF fiscal status updated');
      
      // Trigger next enrichment
      await triggerNextEnrichment(companyId, 'anaf_fiscal');
      
      return { status: 'success', fieldsUpdated };
      
    } catch (error) {
      logger.error({ error, cui }, 'ANAF API error');
      
      // Log error
      await db.insert(silverEnrichmentLog).values({
        tenantId,
        entityType: 'company',
        entityId: companyId,
        source: 'anaf_fiscal',
        operation: 'fetch',
        status: 'error',
        errorMessage: error.message,
      });
      
      throw error; // Re-throw for retry
    }
  },
});

function mapAnafStatus(stare: string): string {
  const statusMap: Record<string, string> = {
    'INREGISTRAT': 'ACTIVA',
    'INREGISTRATA': 'ACTIVA',
    'RADIAT': 'RADIATA',
    'RADIATA': 'RADIATA',
    'INACTIV': 'INACTIVA',
    'INACTIVA': 'INACTIVA',
  };
  return statusMap[stare?.toUpperCase()] || 'UNKNOWN';
}
```

## 1.2 D.2 - ANAF TVA Status Worker

```typescript
// apps/workers/src/silver/anaf-tva-status.worker.ts

export const anafTvaStatusWorker = createWorker<AnafTvaJobData, AnafTvaResult>({
  queueName: 'silver:enrich:anaf-tva-status',
  concurrency: 1,
  limiter: { max: 1, duration: 1000 },
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    const anafClient = new AnafApiClient();
    
    try {
      const response = await anafClient.getTvaStatus(cui);
      
      if (!response) {
        return { status: 'not_found' };
      }
      
      const tvaData = response.inregistrare_scop_Tva;
      
      await db.update(silverCompanies)
        .set({
          platitorTva: tvaData?.scpTVA === true,
          dataInceputTva: tvaData?.data_inceput_ScpTVA 
            ? new Date(tvaData.data_inceput_ScpTVA) 
            : undefined,
          dataAnulareTva: tvaData?.data_anulare_ScpTVA
            ? new Date(tvaData.data_anulare_ScpTVA)
            : undefined,
          motivAnulareTva: tvaData?.mesaj_ScpTVA || undefined,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'anaf_tva'),
              'anaf_tva'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, platitorTva: tvaData?.scpTVA }, 'TVA status updated');
      
      return { 
        status: 'success', 
        fieldsUpdated: ['platitorTva', 'dataInceputTva'] 
      };
      
    } catch (error) {
      logger.error({ error, cui }, 'ANAF TVA API error');
      throw error;
    }
  },
});
```

## 1.3 D.3 - ANAF e-Factura Status Worker

```typescript
// apps/workers/src/silver/anaf-efactura.worker.ts

export const anafEfacturaWorker = createWorker<AnafEfacturaJobData, AnafEfacturaResult>({
  queueName: 'silver:enrich:anaf-efactura',
  concurrency: 1,
  limiter: { max: 1, duration: 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    const anafClient = new AnafApiClient();
    
    try {
      // Check e-Factura registration via lista_firme_RO_e-Factura
      const response = await anafClient.checkEfacturaRegistration(cui);
      
      const isRegistered = response?.inregistrat === true;
      const dataInregistrare = response?.data_inregistrare;
      
      await db.update(silverCompanies)
        .set({
          inregistratEFactura: isRegistered,
          dataInregistrareEFactura: dataInregistrare 
            ? new Date(dataInregistrare) 
            : undefined,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'anaf_efactura'),
              'anaf_efactura'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, isRegistered }, 'e-Factura status updated');
      
      return { status: 'success', isRegistered };
      
    } catch (error) {
      logger.error({ error, cui }, 'ANAF e-Factura check error');
      throw error;
    }
  },
});
```

## 1.4 D.4 - ANAF Datorii Worker

```typescript
// apps/workers/src/silver/anaf-datorii.worker.ts

export const anafDatoriiWorker = createWorker<AnafDatoriiJobData, AnafDatoriiResult>({
  queueName: 'silver:enrich:anaf-datorii',
  concurrency: 1,
  limiter: { max: 1, duration: 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    const anafClient = new AnafApiClient();
    
    try {
      // Check lista contribuabili inactivi/reactivati
      const statusResponse = await anafClient.checkInactiveStatus(cui);
      
      // Check datorii bugetare (dacă API-ul permite)
      const datoriiResponse = await anafClient.getDatorii(cui);
      
      const hasDebtToState = datoriiResponse?.total_datorii > 0;
      
      await db.update(silverCompanies)
        .set({
          areRestanteBuget: hasDebtToState,
          sumaTotalaDatorii: datoriiResponse?.total_datorii || 0,
          dataUltimaVerificareDatorii: new Date(),
          statusInactiv: statusResponse?.inactiv === true,
          dataInactivare: statusResponse?.data_inactivare 
            ? new Date(statusResponse.data_inactivare) 
            : undefined,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'anaf_datorii'),
              'anaf_datorii'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, hasDebtToState }, 'Datorii status updated');
      
      return { status: 'success', hasDebtToState };
      
    } catch (error) {
      logger.error({ error, cui }, 'ANAF datorii check error');
      throw error;
    }
  },
});
```

## 1.5 D.5 - ANAF CAEN Expansion Worker

```typescript
// apps/workers/src/silver/anaf-caen.worker.ts

export const anafCaenWorker = createWorker<AnafCaenJobData, AnafCaenResult>({
  queueName: 'silver:enrich:anaf-caen',
  concurrency: 1,
  limiter: { max: 1, duration: 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui, codCaenPrincipal } = job.data;
    
    // Get CAEN description from local database
    const caenInfo = await db.query.caenCodes.findFirst({
      where: eq(caenCodes.code, codCaenPrincipal),
    });
    
    // Determine if agricultural based on CAEN
    const isAgricultural = isAgriculturalCaen(codCaenPrincipal);
    
    await db.update(silverCompanies)
      .set({
        denumireCaen: caenInfo?.description || undefined,
        isAgricultural,
        agriculturalCategory: isAgricultural 
          ? getAgriculturalCategory(codCaenPrincipal) 
          : undefined,
        enrichmentSourcesCompleted: db.sql`
          array_append(
            array_remove(enrichment_sources_completed, 'anaf_caen'),
            'anaf_caen'
          )
        `,
        lastEnrichmentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));
    
    logger.info({ cui, isAgricultural }, 'CAEN expanded');
    
    return { status: 'success', isAgricultural };
  },
});

// CAEN agricole: 01xx, 02xx, 03xx
function isAgriculturalCaen(code: string): boolean {
  const prefix = code?.substring(0, 2);
  return ['01', '02', '03'].includes(prefix);
}

function getAgriculturalCategory(code: string): string {
  const prefix = code?.substring(0, 2);
  const categories: Record<string, string> = {
    '01': 'CULTIVARE', // Agricultură, vânătoare
    '02': 'SILVICULTURA', // Silvicultură
    '03': 'PESCUIT', // Pescuit și acvacultură
  };
  return categories[prefix] || 'OTHER';
}
```

---

# 2. CATEGORIA E: TERMENE.RO WORKERS

## 2.1 E.1 - Termene Balance Sheet Worker

```typescript
// apps/workers/src/silver/termene-balance.worker.ts

import { createWorker } from '@cerniq/queue';
import { TermeneApiClient } from '@cerniq/integrations/termene';
import { db, silverCompanies } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface TermeneBalanceJobData {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId: string;
}

// Rate limit: 20 requests/second conform Termene.ro API
export const termeneBalanceWorker = createWorker<TermeneBalanceJobData, TermeneBalanceResult>({
  queueName: 'silver:enrich:termene-balance',
  concurrency: 10, // Higher concurrency due to better rate limit
  limiter: {
    max: 20,
    duration: 1000, // 20 per secundă
  },
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 1000,
  },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    logger.info({ cui }, 'Fetching Termene.ro balance sheet');
    
    const termeneClient = new TermeneApiClient({
      apiKey: process.env.TERMENE_API_KEY!,
      baseUrl: process.env.TERMENE_API_URL || 'https://api.termene.ro/v2',
    });
    
    try {
      const response = await termeneClient.getBalanceSheet(cui);
      
      if (!response || !response.bilant) {
        logger.warn({ cui }, 'No balance sheet found');
        return { status: 'not_found' };
      }
      
      const bilant = response.bilant;
      const latestYear = Math.max(...Object.keys(bilant).map(Number));
      const latestData = bilant[latestYear];
      
      await db.update(silverCompanies)
        .set({
          cifraAfaceri: latestData.cifra_afaceri || undefined,
          profitNet: latestData.profit_net || undefined,
          numarAngajati: latestData.numar_angajati || undefined,
          capitaluriProprii: latestData.capitaluri_proprii || undefined,
          datoriiTotale: latestData.datorii_totale || undefined,
          activeTotale: latestData.active_totale || undefined,
          anBilant: latestYear,
          // Calculate financial health indicators
          rataSolvabilitate: latestData.capitaluri_proprii && latestData.active_totale
            ? (latestData.capitaluri_proprii / latestData.active_totale * 100)
            : undefined,
          rataLichiditate: latestData.active_circulante && latestData.datorii_curente
            ? (latestData.active_circulante / latestData.datorii_curente)
            : undefined,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'termene_balance'),
              'termene_balance'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      // Log enrichment
      await db.insert(silverEnrichmentLog).values({
        tenantId,
        entityType: 'company',
        entityId: companyId,
        source: 'termene_balance',
        operation: 'fetch',
        status: 'success',
        fieldsUpdated: ['cifraAfaceri', 'profitNet', 'numarAngajati', 'anBilant'],
        responseData: { year: latestYear },
      });
      
      logger.info({ cui, year: latestYear, cifraAfaceri: latestData.cifra_afaceri }, 'Balance sheet updated');
      
      return { 
        status: 'success', 
        year: latestYear,
        cifraAfaceri: latestData.cifra_afaceri,
      };
      
    } catch (error) {
      logger.error({ error, cui }, 'Termene.ro balance API error');
      throw error;
    }
  },
});
```

## 2.2 E.2 - Termene Risk Score Worker

```typescript
// apps/workers/src/silver/termene-risk.worker.ts

export const termeneRiskWorker = createWorker<TermeneRiskJobData, TermeneRiskResult>({
  queueName: 'silver:enrich:termene-risk',
  concurrency: 10,
  limiter: { max: 20, duration: 1000 },
  attempts: 3,
  backoff: { type: 'fixed', delay: 1000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    const termeneClient = new TermeneApiClient({
      apiKey: process.env.TERMENE_API_KEY!,
    });
    
    try {
      const response = await termeneClient.getRiskScore(cui);
      
      if (!response) {
        return { status: 'not_found' };
      }
      
      // Termene risk score: 0-100 (lower is better)
      const scorRisc = response.scor_risc;
      const categorieRisc = categorizeRisk(scorRisc);
      
      await db.update(silverCompanies)
        .set({
          scorRiscTermene: scorRisc,
          categorieRisc,
          riscDetalii: response.detalii || undefined,
          dataCalculScorRisc: new Date(),
          // Risk factors
          riscFinanciar: response.risc_financiar || undefined,
          riscJuridic: response.risc_juridic || undefined,
          riscOperational: response.risc_operational || undefined,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'termene_risk'),
              'termene_risk'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, scorRisc, categorieRisc }, 'Risk score updated');
      
      return { status: 'success', scorRisc, categorieRisc };
      
    } catch (error) {
      logger.error({ error, cui }, 'Termene.ro risk API error');
      throw error;
    }
  },
});

function categorizeRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  return 'HIGH';
}
```

## 2.3 E.3 - Termene Dosare Worker

```typescript
// apps/workers/src/silver/termene-dosare.worker.ts

export const termeneDosareWorker = createWorker<TermeneDosareJobData, TermeneDosareResult>({
  queueName: 'silver:enrich:termene-dosare',
  concurrency: 10,
  limiter: { max: 20, duration: 1000 },
  attempts: 3,
  backoff: { type: 'fixed', delay: 1000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    const termeneClient = new TermeneApiClient({
      apiKey: process.env.TERMENE_API_KEY!,
    });
    
    try {
      const response = await termeneClient.getDosare(cui);
      
      const dosareActuale = response?.dosare?.filter(d => d.status === 'ACTIV') || [];
      const dosareInchise = response?.dosare?.filter(d => d.status === 'INCHIS') || [];
      
      // Check for insolvency proceedings
      const inInsolventa = dosareActuale.some(d => 
        d.tip_dosar?.toLowerCase().includes('insolventa') ||
        d.tip_dosar?.toLowerCase().includes('faliment')
      );
      
      // Check for execution proceedings
      const areExecutariSilite = dosareActuale.some(d =>
        d.tip_dosar?.toLowerCase().includes('executare')
      );
      
      await db.update(silverCompanies)
        .set({
          numarDosareActuale: dosareActuale.length,
          numarDosareTotal: (dosareActuale.length + dosareInchise.length),
          inInsolventa,
          areExecutariSilite,
          tipuriDosare: [...new Set(dosareActuale.map(d => d.tip_dosar))],
          dataUltimaVerificareDosare: new Date(),
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'termene_dosare'),
              'termene_dosare'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ 
        cui, 
        dosareActuale: dosareActuale.length,
        inInsolventa 
      }, 'Dosare updated');
      
      return { 
        status: 'success', 
        dosareActuale: dosareActuale.length,
        inInsolventa,
      };
      
    } catch (error) {
      logger.error({ error, cui }, 'Termene.ro dosare API error');
      throw error;
    }
  },
});
```

## 2.4 E.4 - Termene Actionari Worker

```typescript
// apps/workers/src/silver/termene-actionari.worker.ts

export const termeneActionariWorker = createWorker<TermeneActionariJobData, TermeneActionariResult>({
  queueName: 'silver:enrich:termene-actionari',
  concurrency: 10,
  limiter: { max: 20, duration: 1000 },
  attempts: 3,
  backoff: { type: 'fixed', delay: 1000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    const termeneClient = new TermeneApiClient({
      apiKey: process.env.TERMENE_API_KEY!,
    });
    
    try {
      const response = await termeneClient.getActionari(cui);
      
      if (!response || !response.actionari) {
        return { status: 'not_found' };
      }
      
      const actionari = response.actionari;
      const administratori = response.administratori || [];
      
      // Store in silver_contacts
      for (const actionar of actionari) {
        if (actionar.tip === 'PERSOANA_FIZICA') {
          await db.insert(silverContacts).values({
            tenantId,
            silverCompanyId: companyId,
            fullName: actionar.nume,
            role: 'ACTIONAR',
            ownershipPercent: actionar.procent_detineri,
            sourceData: actionar,
          }).onConflictDoUpdate({
            target: [silverContacts.silverCompanyId, silverContacts.fullName, silverContacts.role],
            set: { 
              ownershipPercent: actionar.procent_detineri,
              updatedAt: new Date(),
            },
          });
        }
      }
      
      for (const admin of administratori) {
        await db.insert(silverContacts).values({
          tenantId,
          silverCompanyId: companyId,
          fullName: admin.nume,
          role: admin.functie || 'ADMINISTRATOR',
          sourceData: admin,
        }).onConflictDoUpdate({
          target: [silverContacts.silverCompanyId, silverContacts.fullName, silverContacts.role],
          set: { updatedAt: new Date() },
        });
      }
      
      // Update company with summary
      await db.update(silverCompanies)
        .set({
          numarActionari: actionari.length,
          numarAdministratori: administratori.length,
          areActionarMajoritar: actionari.some(a => a.procent_detineri > 50),
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'termene_actionari'),
              'termene_actionari'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ 
        cui, 
        actionari: actionari.length,
        administratori: administratori.length,
      }, 'Actionari/Administratori updated');
      
      return { 
        status: 'success',
        actionariCount: actionari.length,
        administratoriCount: administratori.length,
      };
      
    } catch (error) {
      logger.error({ error, cui }, 'Termene.ro actionari API error');
      throw error;
    }
  },
});
```

---

# 3. ANAF API CLIENT

```typescript
// packages/integrations/src/anaf/client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from 'pino';
import { CircuitBreaker } from 'opossum';

interface AnafApiConfig {
  baseUrl?: string;
  timeout?: number;
  logger?: Logger;
}

export class AnafApiClient {
  private client: AxiosInstance;
  private breaker: CircuitBreaker;
  private logger?: Logger;

  constructor(config: AnafApiConfig = {}) {
    this.logger = config.logger;
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://webservicesp.anaf.ro/AsynchWebService/api/v8',
      timeout: config.timeout || 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    // Circuit breaker for resilience
    this.breaker = new CircuitBreaker(
      (cui: string) => this.fetchFiscalStatusInternal(cui),
      {
        timeout: 15000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 5,
      }
    );
    
    this.breaker.on('open', () => {
      this.logger?.warn('ANAF circuit breaker OPEN');
    });
    
    this.breaker.on('halfOpen', () => {
      this.logger?.info('ANAF circuit breaker HALF-OPEN');
    });
    
    this.breaker.on('close', () => {
      this.logger?.info('ANAF circuit breaker CLOSED');
    });
  }

  async getFiscalStatus(cui: string): Promise<AnafFiscalResponse | null> {
    try {
      return await this.breaker.fire(cui);
    } catch (error) {
      if (error.message === 'Breaker is open') {
        throw new Error('ANAF API temporarily unavailable (circuit open)');
      }
      throw error;
    }
  }

  private async fetchFiscalStatusInternal(cui: string): Promise<AnafFiscalResponse | null> {
    // ANAF expects array of CUI
    const payload = [cui.replace(/^RO/i, '')];
    
    const response = await this.client.post('/nif', payload);
    
    if (response.data?.found && response.data.found.length > 0) {
      return response.data.found[0];
    }
    
    return null;
  }

  async getTvaStatus(cui: string): Promise<AnafTvaResponse | null> {
    const payload = [{ cui: cui.replace(/^RO/i, ''), data: new Date().toISOString().split('T')[0] }];
    
    const response = await this.client.post('/listplTVA', payload);
    
    if (response.data?.found && response.data.found.length > 0) {
      return response.data.found[0];
    }
    
    return null;
  }

  async checkEfacturaRegistration(cui: string): Promise<AnafEfacturaResponse | null> {
    // API endpoint pentru verificare e-Factura
    const response = await this.client.get(`/listeRO_e_Factura`, {
      params: { cui: cui.replace(/^RO/i, '') },
    });
    
    return response.data || null;
  }

  async checkInactiveStatus(cui: string): Promise<AnafInactiveResponse | null> {
    const payload = [{ cui: cui.replace(/^RO/i, ''), data: new Date().toISOString().split('T')[0] }];
    
    const response = await this.client.post('/listInactivi', payload);
    
    if (response.data?.found && response.data.found.length > 0) {
      return response.data.found[0];
    }
    
    return null;
  }
}
```

---

# 4. TERMENE.RO API CLIENT

```typescript
// packages/integrations/src/termene/client.ts

import axios, { AxiosInstance } from 'axios';
import { Logger } from 'pino';

interface TermeneApiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  logger?: Logger;
}

export class TermeneApiClient {
  private client: AxiosInstance;
  private logger?: Logger;

  constructor(config: TermeneApiConfig) {
    this.logger = config.logger;
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.termene.ro/v2',
      timeout: config.timeout || 15000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          this.logger?.warn('Termene.ro rate limit hit');
          throw new Error('RATE_LIMITED');
        }
        if (error.response?.status === 401) {
          this.logger?.error('Termene.ro API key invalid');
          throw new Error('UNAUTHORIZED');
        }
        throw error;
      }
    );
  }

  async getBalanceSheet(cui: string): Promise<TermeneBalanceResponse | null> {
    try {
      const response = await this.client.get(`/firme/${cui}/bilant`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getRiskScore(cui: string): Promise<TermeneRiskResponse | null> {
    try {
      const response = await this.client.get(`/firme/${cui}/scor-risc`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getDosare(cui: string): Promise<TermeneDosareResponse | null> {
    try {
      const response = await this.client.get(`/firme/${cui}/dosare`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getActionari(cui: string): Promise<TermeneActionariResponse | null> {
    try {
      const response = await this.client.get(`/firme/${cui}/actionari`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}
```

---

# 5. QUEUE CONFIGURATION SUMMARY

| Worker | Queue Name | Concurrency | Rate Limit | Attempts | Backoff |
|--------|-----------|-------------|------------|----------|---------|
| D.1 ANAF Fiscal | `silver:enrich:anaf-fiscal-status` | 1 | 1/s | 5 | Exponential 2s |
| D.2 ANAF TVA | `silver:enrich:anaf-tva-status` | 1 | 1/s | 5 | Exponential 2s |
| D.3 ANAF e-Factura | `silver:enrich:anaf-efactura` | 1 | 1/s | 3 | Exponential 2s |
| D.4 ANAF Datorii | `silver:enrich:anaf-datorii` | 1 | 1/s | 3 | Exponential 2s |
| D.5 ANAF CAEN | `silver:enrich:anaf-caen` | 1 | 1/s | 3 | Exponential 2s |
| E.1 Termene Balance | `silver:enrich:termene-balance` | 10 | 20/s | 3 | Fixed 1s |
| E.2 Termene Risk | `silver:enrich:termene-risk` | 10 | 20/s | 3 | Fixed 1s |
| E.3 Termene Dosare | `silver:enrich:termene-dosare` | 10 | 20/s | 3 | Fixed 1s |
| E.4 Termene Actionari | `silver:enrich:termene-actionari` | 10 | 20/s | 3 | Fixed 1s |

---

**Document generat:** 15 Ianuarie 2026
**Total workers:** 9 (D.1-D.5, E.1-E.4)
**Conformitate:** Master Spec v1.2
