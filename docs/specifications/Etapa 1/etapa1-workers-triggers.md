# CERNIQ.APP — ETAPA 1: WORKERS TRIGGER MATRIX
## Dependențe și Flow între 58 Workers
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. TRIGGER MATRIX COMPLETĂ

## 1.1 Categoria A → B (Ingestie → Normalizare)

```
┌───────────────────────────────────────────────────────────────────┐
│                      INGESTIE → NORMALIZARE                        │
└───────────────────────────────────────────────────────────────────┘

A.1 CSV Parser ──────┐
A.2 Excel Parser ────┼──▶ B.* (Batch Normalization)
A.5 API Ingest ──────┘    ├── B.1 Name Normalizer
                          ├── B.2 Address Normalizer
A.3 Webhook Handler ─┐    ├── B.3 Phone Normalizer
A.4 Manual Entry ────┼──▶ │   └── B.4 Email Normalizer
                     │    │
                     │    └── (Parallel execution)
                     │
                     └── Single Contact Processing
```

## 1.2 Categoria B → C (Normalizare → Validare)

```
B.1 Name Normalizer ────┐
B.2 Address Normalizer ─┼──▶ Wait All ──▶ C.1 CUI Validator (Modulo-11)
B.3 Phone Normalizer ───┤                       │
B.4 Email Normalizer ───┘                       ▼
                                          C.2 CUI ANAF Validator
```

## 1.3 Categoria C → D-L (Validare → Enrichment)

```
                                    ┌──▶ D.1 ANAF Fiscal Status
                                    ├──▶ D.2 ANAF TVA Status
                                    ├──▶ D.3 ANAF e-Factura
                                    ├──▶ D.4 ANAF Datorii
                                    ├──▶ D.5 ANAF CAEN
                                    │
                                    ├──▶ E.1 Termene Balance
                                    ├──▶ E.2 Termene Score
C.1 CUI Validator ──▶ CUI Valid ───┼──▶ E.3 Termene Dosare
C.2 ANAF Validator                  ├──▶ E.4 Termene Actionari
                                    │
                                    ├──▶ F.1 ONRC Data
                                    ├──▶ F.2 ONRC Administratori
                                    ├──▶ F.3 ONRC Sedii Secundare
                                    │
                                    ├──▶ G.1 Hunter Email Discovery
                                    │
                                    ├──▶ K.1 Nominatim Geocoder
                                    │
                                    └──▶ L.1 APIA Subventii

              [TOATE ÎN PARALEL - 15 workers simultani]
```

## 1.4 Enrichment Secondar (Dependent de Rezultate)

```
G.1 Hunter Email Discovery ──▶ G.2 ZeroBounce Verify ──▶ G.3 Email Enricher
                                                              │
K.1 Nominatim Geocoder ──▶ K.2 PostGIS Zone Calculator ──────┤
                                                              │
L.1 APIA Subventii ──▶ L.2 OUAI Membership ──▶ L.3 Cooperative Mapper
                                                              │
I.1 Company Website Finder ──▶ I.2 Contact Page Scraper ─────┤
                                                              │
                                  All Complete ───────────────┘
                                       │
                                       ▼
                              J.1 AI Data Merger
```

## 1.5 Post-Enrichment Flow (M → N → O → P)

```
All Enrichment Complete
         │
         ▼
┌─────────────────┐
│ M.1 Exact Dedup │──▶ Hash-based exact match
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ M.2 Fuzzy Dedup │──▶ Jaro-Winkler + Rules
└────────┬────────┘
         │
         ├──▶ Confidence > 85% ──▶ Auto-merge
         │
         └──▶ Confidence 70-85% ──▶ HITL Review (dedup_review)
                                        │
                                        ▼
                              ┌─────────────────┐
                              │ HITL Approval   │
                              │ (24h SLA)       │
                              └────────┬────────┘
                                       │
         ┌─────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ N.1 Completeness│──▶ Calculate completeness score
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ N.2 Accuracy    │──▶ Calculate accuracy score
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ N.3 Freshness   │──▶ Calculate freshness score
└────────┬────────┘
         │
         ├──▶ Total Score >= 70 ──▶ P.3 Promote to Gold
         │
         └──▶ Total Score 40-70 ──▶ HITL Review (data_quality)
                                        │
                                        ▼
                              ┌─────────────────┐
                              │ HITL Approval   │
                              │ (24h SLA)       │
                              └────────┬────────┘
                                       │
                                       ▼
                              P.3 Promote to Gold
```

---

# 2. TRIGGER CONFIGURATION CODE

```typescript
// /apps/workers/src/config/triggers.ts

export const TRIGGER_MAP: Record<string, TriggerConfig[]> = {
  // ═══════════════════════════════════════════════════════════════
  // CATEGORIA A → B
  // ═══════════════════════════════════════════════════════════════
  'bronze:ingest:csv-parser': [
    { queue: 'bronze:normalize:batch', condition: 'always' },
  ],
  'bronze:ingest:excel-parser': [
    { queue: 'bronze:normalize:batch', condition: 'always' },
  ],
  'bronze:ingest:webhook': [
    { queue: 'bronze:normalize:single', condition: 'always', perEntity: true },
  ],
  'bronze:ingest:manual': [
    { queue: 'bronze:normalize:single', condition: 'always' },
  ],
  'bronze:ingest:api': [
    { queue: 'bronze:normalize:batch', condition: 'always' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // CATEGORIA B → C
  // ═══════════════════════════════════════════════════════════════
  'bronze:normalize:batch': [
    { queue: 'bronze:normalize:name', condition: 'always', parallel: true },
    { queue: 'bronze:normalize:address', condition: 'always', parallel: true },
    { queue: 'bronze:normalize:phone', condition: 'always', parallel: true },
    { queue: 'bronze:normalize:email', condition: 'always', parallel: true },
  ],
  
  // Wait for all B.* to complete before C.*
  'bronze:normalize:complete': [
    { queue: 'silver:validate:cui-modulo11', condition: 'always' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // CATEGORIA C → D-L (PARALLEL ENRICHMENT)
  // ═══════════════════════════════════════════════════════════════
  'silver:validate:cui-anaf': [
    // Only trigger if CUI is valid
    { queue: 'enrich:anaf:fiscal-status', condition: 'cui_valid' },
    { queue: 'enrich:anaf:tva-status', condition: 'cui_valid' },
    { queue: 'enrich:anaf:e-factura', condition: 'cui_valid' },
    { queue: 'enrich:anaf:datorii', condition: 'cui_valid' },
    { queue: 'enrich:anaf:caen', condition: 'cui_valid' },
    
    { queue: 'enrich:termene:balance', condition: 'cui_valid' },
    { queue: 'enrich:termene:score', condition: 'cui_valid' },
    { queue: 'enrich:termene:dosare', condition: 'cui_valid' },
    { queue: 'enrich:termene:actionari', condition: 'cui_valid' },
    
    { queue: 'enrich:onrc:data', condition: 'cui_valid' },
    
    { queue: 'enrich:email:hunter-discovery', condition: 'has_domain' },
    
    { queue: 'enrich:geo:nominatim', condition: 'has_address' },
    
    { queue: 'enrich:agri:apia-subventii', condition: 'is_agricultural' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // ENRICHMENT CHAINS
  // ═══════════════════════════════════════════════════════════════
  'enrich:email:hunter-discovery': [
    { queue: 'enrich:email:zerobounce-verify', condition: 'emails_found' },
  ],
  'enrich:email:zerobounce-verify': [
    { queue: 'enrich:email:enricher', condition: 'valid_emails' },
  ],
  
  'enrich:geo:nominatim': [
    { queue: 'enrich:geo:zone-calculator', condition: 'coords_found' },
  ],
  
  'enrich:agri:apia-subventii': [
    { queue: 'enrich:agri:ouai-membership', condition: 'always' },
  ],
  'enrich:agri:ouai-membership': [
    { queue: 'enrich:agri:cooperative-mapper', condition: 'always' },
  ],
  
  'enrich:scrape:website-finder': [
    { queue: 'enrich:scrape:contact-page', condition: 'website_found' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // ALL ENRICHMENT COMPLETE → DEDUP
  // ═══════════════════════════════════════════════════════════════
  'enrich:complete': [
    { queue: 'silver:dedup:exact-match', condition: 'always' },
  ],
  'silver:dedup:exact-match': [
    { queue: 'silver:dedup:fuzzy-match', condition: 'always' },
  ],
  
  // ═══════════════════════════════════════════════════════════════
  // DEDUP → SCORING
  // ═══════════════════════════════════════════════════════════════
  'silver:dedup:fuzzy-match': [
    { queue: 'silver:score:completeness', condition: 'is_master_record' },
    { queue: 'approval:create', condition: 'needs_hitl_review', metadata: { type: 'dedup_review' } },
  ],
  
  // ═══════════════════════════════════════════════════════════════
  // SCORING → PROMOTION
  // ═══════════════════════════════════════════════════════════════
  'silver:score:completeness': [
    { queue: 'silver:score:accuracy', condition: 'always' },
  ],
  'silver:score:accuracy': [
    { queue: 'silver:score:freshness', condition: 'always' },
  ],
  'silver:score:freshness': [
    { queue: 'pipeline:promote:to-gold', condition: 'score >= 70' },
    { queue: 'approval:create', condition: 'score 40-70', metadata: { type: 'data_quality' } },
    { queue: 'silver:aggregate:stats', condition: 'always' },
  ],
  
  // ═══════════════════════════════════════════════════════════════
  // HITL APPROVAL OUTCOMES
  // ═══════════════════════════════════════════════════════════════
  'approval:completed:dedup_review': [
    { queue: 'silver:dedup:merge', condition: 'approved' },
    { queue: 'silver:score:completeness', condition: 'approved' },
  ],
  'approval:completed:data_quality': [
    { queue: 'pipeline:promote:to-gold', condition: 'approved' },
  ],
};
```

---

# 3. TRIGGER CONDITIONS

```typescript
// /apps/workers/src/config/conditions.ts

export const TRIGGER_CONDITIONS: Record<string, ConditionFn> = {
  always: () => true,
  
  cui_valid: (result) => result.cuiValid === true,
  
  has_domain: (result) => {
    const email = result.email || result.website;
    return email && email.includes('@');
  },
  
  has_address: (result) => {
    return !!(result.adresa || result.strada || result.localitate);
  },
  
  is_agricultural: (result) => {
    const caen = result.codCaenPrincipal || '';
    return caen.startsWith('01') || caen.startsWith('02') || caen.startsWith('03');
  },
  
  emails_found: (result) => {
    return result.emails && result.emails.length > 0;
  },
  
  valid_emails: (result) => {
    return result.validEmails && result.validEmails.length > 0;
  },
  
  coords_found: (result) => {
    return result.latitude != null && result.longitude != null;
  },
  
  website_found: (result) => {
    return result.websiteUrl != null;
  },
  
  is_master_record: (result) => {
    return result.isMasterRecord === true;
  },
  
  needs_hitl_review: (result) => {
    return result.dedupConfidence >= 0.70 && result.dedupConfidence < 0.85;
  },
  
  'score >= 70': (result) => {
    return result.totalQualityScore >= 70;
  },
  
  'score 40-70': (result) => {
    return result.totalQualityScore >= 40 && result.totalQualityScore < 70;
  },
  
  approved: (result) => {
    return result.decision === 'approved';
  },
};
```

---

# 4. FLOW ORCHESTRATOR

```typescript
// /apps/workers/src/orchestrator/flow-orchestrator.ts

import { FlowProducer, Queue, Job } from 'bullmq';
import { TRIGGER_MAP, TRIGGER_CONDITIONS } from '../config';
import { logger } from '@cerniq/logger';

export class FlowOrchestrator {
  private flowProducer: FlowProducer;
  
  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }
  
  async triggerNext(
    completedJob: Job,
    result: Record<string, unknown>
  ): Promise<void> {
    const queueName = completedJob.queueName;
    const triggers = TRIGGER_MAP[queueName];
    
    if (!triggers || triggers.length === 0) {
      return;
    }
    
    const correlationId = completedJob.data.correlationId;
    const tenantId = completedJob.data.tenantId;
    const entityId = completedJob.data.entityId || result.entityId;
    
    const log = logger.child({ 
      sourceQueue: queueName, 
      correlationId,
      entityId,
    });
    
    for (const trigger of triggers) {
      const conditionFn = TRIGGER_CONDITIONS[trigger.condition];
      
      if (!conditionFn || !conditionFn(result)) {
        log.debug({ trigger: trigger.queue, condition: trigger.condition }, 
          'Trigger condition not met');
        continue;
      }
      
      const targetQueue = new Queue(trigger.queue, { 
        connection: this.flowProducer.opts.connection 
      });
      
      const jobData = {
        tenantId,
        entityId,
        correlationId,
        sourceQueue: queueName,
        sourceJobId: completedJob.id,
        previousResult: result,
        ...trigger.metadata,
      };
      
      const jobId = `${trigger.queue}-${entityId}-${Date.now()}`;
      
      await targetQueue.add(trigger.queue.split(':').pop()!, jobData, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
      
      log.info({ targetQueue: trigger.queue, jobId }, 'Triggered next worker');
    }
  }
  
  // Parallel enrichment flow
  async triggerParallelEnrichment(
    tenantId: string,
    entityId: string,
    correlationId: string,
    validationResult: Record<string, unknown>
  ): Promise<void> {
    const triggers = TRIGGER_MAP['silver:validate:cui-anaf'];
    const parallelJobs: Promise<void>[] = [];
    
    for (const trigger of triggers) {
      const conditionFn = TRIGGER_CONDITIONS[trigger.condition];
      
      if (conditionFn && conditionFn(validationResult)) {
        const queue = new Queue(trigger.queue, { 
          connection: this.flowProducer.opts.connection 
        });
        
        parallelJobs.push(
          queue.add('enrich', {
            tenantId,
            entityId,
            correlationId,
            companyData: validationResult,
          }).then(() => {})
        );
      }
    }
    
    // Toate pornesc în paralel
    await Promise.all(parallelJobs);
    
    logger.info({ 
      entityId, 
      triggeredCount: parallelJobs.length 
    }, 'Parallel enrichment triggered');
  }
}
```

---

# 5. COMPLETION TRACKER

```typescript
// /apps/workers/src/orchestrator/completion-tracker.ts

import { Redis } from 'ioredis';

const ENRICHMENT_STAGES = [
  'anaf:fiscal-status',
  'anaf:tva-status',
  'anaf:e-factura',
  'anaf:datorii',
  'anaf:caen',
  'termene:balance',
  'termene:score',
  'termene:dosare',
  'onrc:data',
  'email:enricher',
  'geo:zone-calculator',
  'agri:cooperative-mapper',
];

export class CompletionTracker {
  constructor(private redis: Redis) {}
  
  async markStageComplete(
    entityId: string,
    stage: string,
    success: boolean
  ): Promise<boolean> {
    const key = `enrich:progress:${entityId}`;
    
    await this.redis.hset(key, stage, success ? 'success' : 'failed');
    await this.redis.expire(key, 86400); // 24h TTL
    
    return this.checkAllComplete(entityId);
  }
  
  async checkAllComplete(entityId: string): Promise<boolean> {
    const key = `enrich:progress:${entityId}`;
    const progress = await this.redis.hgetall(key);
    
    const completedStages = Object.keys(progress);
    const requiredStages = await this.getRequiredStages(entityId);
    
    return requiredStages.every(stage => completedStages.includes(stage));
  }
  
  async getRequiredStages(entityId: string): Promise<string[]> {
    // Stages required based on entity data
    // Some stages may be skipped based on conditions
    const entityFlags = await this.redis.hgetall(`entity:flags:${entityId}`);
    
    return ENRICHMENT_STAGES.filter(stage => {
      if (stage.startsWith('agri:') && !entityFlags.isAgricultural) {
        return false;
      }
      if (stage.startsWith('email:') && !entityFlags.hasDomain) {
        return false;
      }
      return true;
    });
  }
  
  async triggerPostEnrichment(entityId: string): Promise<void> {
    const queue = new Queue('enrich:complete', { connection: this.redis });
    await queue.add('complete', { entityId });
  }
}
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2, ADR-0042 (Pipeline Orchestration)
