# CERNIQ.APP — ETAPA 1: WORKERS CATEGORIA M-P
## Deduplication, Quality Scoring, Aggregation & Pipeline Orchestration
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. CATEGORIA M: DEDUPLICARE WORKERS

## 1.1 M.1 - Exact Hash Deduplication Worker

```typescript
// apps/workers/src/silver/dedup-exact-hash.worker.ts

import { createWorker } from '@cerniq/queue';
import { db, silverCompanies } from '@cerniq/db';
import { eq, and, ne, sql } from 'drizzle-orm';
import crypto from 'crypto';

interface DedupExactJobData {
  tenantId: string;
  companyId: string;
  correlationId: string;
}

export const dedupExactHashWorker = createWorker<DedupExactJobData, DedupExactResult>({
  queueName: 'silver:dedup:exact-hash',
  concurrency: 10,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId } = job.data;
    
    logger.info({ companyId }, 'Checking exact duplicates by CUI');
    
    // Get company
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company || !company.cui) {
      return { status: 'skipped', reason: 'no_cui' };
    }
    
    // Find exact duplicates by CUI (same tenant)
    const duplicates = await db.query.silverCompanies.findMany({
      where: and(
        eq(silverCompanies.tenantId, tenantId),
        eq(silverCompanies.cui, company.cui),
        ne(silverCompanies.id, companyId),
        eq(silverCompanies.isMasterRecord, true)
      ),
      orderBy: [asc(silverCompanies.createdAt)],
    });
    
    if (duplicates.length === 0) {
      // No duplicates found - this is the master
      await db.update(silverCompanies)
        .set({
          isMasterRecord: true,
          dedupCheckedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ companyId, cui: company.cui }, 'No duplicates - is master');
      return { status: 'unique', isMaster: true };
    }
    
    // Found duplicates - determine master (oldest record)
    const master = duplicates[0];
    
    logger.info({ 
      companyId, 
      masterId: master.id,
      duplicatesCount: duplicates.length,
    }, 'Exact duplicate found');
    
    // Mark current as duplicate
    await db.update(silverCompanies)
      .set({
        isMasterRecord: false,
        masterRecordId: master.id,
        duplicateConfidence: 1.0, // Exact match
        duplicateMethod: 'exact_cui',
        dedupCheckedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));
    
    // Update master merge history
    await db.update(silverCompanies)
      .set({
        mergeHistory: sql`merge_history || ${JSON.stringify({
          timestamp: new Date().toISOString(),
          mergedId: companyId,
          method: 'exact_cui',
          confidence: 1.0,
        })}::jsonb`,
        lastMergeAt: new Date(),
      })
      .where(eq(silverCompanies.id, master.id));
    
    // Merge data from duplicate to master (fill gaps only)
    await mergeCompanyData(master.id, companyId);
    
    return { 
      status: 'merged',
      masterId: master.id,
      confidence: 1.0,
    };
  },
});

async function mergeCompanyData(masterId: string, duplicateId: string) {
  const [master, duplicate] = await Promise.all([
    db.query.silverCompanies.findFirst({ where: eq(silverCompanies.id, masterId) }),
    db.query.silverCompanies.findFirst({ where: eq(silverCompanies.id, duplicateId) }),
  ]);
  
  if (!master || !duplicate) return;
  
  // Fill gaps in master from duplicate
  const fieldsToMerge = [
    'emailPrincipal', 'telefonPrincipal', 'website', 
    'latitude', 'longitude', 'codCaenPrincipal',
    'cifraAfaceri', 'numarAngajati', 'suprafataAgricola',
  ];
  
  const updates: Record<string, any> = {};
  
  for (const field of fieldsToMerge) {
    if (!master[field] && duplicate[field]) {
      updates[field] = duplicate[field];
    }
  }
  
  // Merge arrays
  if (duplicate.enrichmentSourcesCompleted?.length > 0) {
    updates.enrichmentSourcesCompleted = sql`
      array(SELECT DISTINCT unnest(enrichment_sources_completed || ${duplicate.enrichmentSourcesCompleted}))
    `;
  }
  
  if (Object.keys(updates).length > 0) {
    await db.update(silverCompanies)
      .set(updates)
      .where(eq(silverCompanies.id, masterId));
  }
}
```

## 1.2 M.2 - Fuzzy Deduplication Worker (HITL Integration)

```typescript
// apps/workers/src/silver/dedup-fuzzy.worker.ts

import { createWorker } from '@cerniq/queue';
import fuzzball from 'fuzzball';
import { db, silverCompanies, silverDedupCandidates } from '@cerniq/db';
import { eq, and, ne, gt, sql } from 'drizzle-orm';

interface DedupFuzzyJobData {
  tenantId: string;
  companyId: string;
  correlationId: string;
}

// Thresholds
const AUTO_MERGE_THRESHOLD = 0.85;  // >= 85% confidence = auto merge
const HITL_THRESHOLD = 0.70;        // 70-85% = HITL review
const IGNORE_THRESHOLD = 0.70;      // < 70% = not duplicate

export const dedupFuzzyWorker = createWorker<DedupFuzzyJobData, DedupFuzzyResult>({
  queueName: 'silver:dedup:fuzzy-match',
  concurrency: 5,
  attempts: 2,
  timeout: 60000,

  processor: async (job, logger) => {
    const { tenantId, companyId } = job.data;
    
    logger.info({ companyId }, 'Checking fuzzy duplicates');
    
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company || !company.denumireNormalizata) {
      return { status: 'skipped', reason: 'no_name' };
    }
    
    // Find potential duplicates in same county
    const candidates = await db.query.silverCompanies.findMany({
      where: and(
        eq(silverCompanies.tenantId, tenantId),
        ne(silverCompanies.id, companyId),
        eq(silverCompanies.isMasterRecord, true),
        eq(silverCompanies.judet, company.judet)
      ),
      limit: 100, // Performance limit
    });
    
    const duplicateCandidates: Array<{
      candidateId: string;
      confidence: number;
      scores: Record<string, number>;
    }> = [];
    
    for (const candidate of candidates) {
      // Skip if same CUI (handled by exact match)
      if (candidate.cui === company.cui) continue;
      
      // Calculate similarity scores
      const nameSimilarity = fuzzball.token_set_ratio(
        company.denumireNormalizata || '',
        candidate.denumireNormalizata || ''
      ) / 100;
      
      const addressSimilarity = fuzzball.partial_ratio(
        company.adresaNormalizata || '',
        candidate.adresaNormalizata || ''
      ) / 100;
      
      // Phone similarity (if both have phones)
      let phoneSimilarity = 0;
      if (company.telefonPrincipal && candidate.telefonPrincipal) {
        const phoneA = company.telefonPrincipal.replace(/\D/g, '');
        const phoneB = candidate.telefonPrincipal.replace(/\D/g, '');
        phoneSimilarity = phoneA === phoneB ? 1.0 : 
          fuzzball.ratio(phoneA, phoneB) / 100;
      }
      
      // Weighted overall confidence
      const weights = {
        name: 0.50,
        address: 0.30,
        phone: 0.20,
      };
      
      const confidence = 
        (nameSimilarity * weights.name) +
        (addressSimilarity * weights.address) +
        (phoneSimilarity * weights.phone);
      
      if (confidence >= IGNORE_THRESHOLD) {
        duplicateCandidates.push({
          candidateId: candidate.id,
          confidence,
          scores: {
            name: nameSimilarity,
            address: addressSimilarity,
            phone: phoneSimilarity,
          },
        });
      }
    }
    
    if (duplicateCandidates.length === 0) {
      await db.update(silverCompanies)
        .set({
          isMasterRecord: true,
          fuzzyDedupCheckedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ companyId }, 'No fuzzy duplicates found');
      return { status: 'unique' };
    }
    
    // Sort by confidence descending
    duplicateCandidates.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = duplicateCandidates[0];
    
    logger.info({ 
      companyId,
      bestMatchId: bestMatch.candidateId,
      confidence: bestMatch.confidence,
    }, 'Fuzzy duplicate candidate found');
    
    // Store candidate
    await db.insert(silverDedupCandidates).values({
      tenantId,
      companyAId: companyId,
      companyBId: bestMatch.candidateId,
      nameSimilarity: bestMatch.scores.name,
      addressSimilarity: bestMatch.scores.address,
      phoneSimilarity: bestMatch.scores.phone,
      overallConfidence: bestMatch.confidence,
      status: bestMatch.confidence >= AUTO_MERGE_THRESHOLD ? 'auto_merged' : 'pending_review',
    }).onConflictDoNothing();
    
    if (bestMatch.confidence >= AUTO_MERGE_THRESHOLD) {
      // Auto merge high confidence
      await db.update(silverCompanies)
        .set({
          isMasterRecord: false,
          masterRecordId: bestMatch.candidateId,
          duplicateConfidence: bestMatch.confidence,
          duplicateMethod: 'fuzzy_auto',
          dedupCheckedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      // Merge data
      await mergeCompanyData(bestMatch.candidateId, companyId);
      
      logger.info({ confidence: bestMatch.confidence }, 'Auto-merged fuzzy duplicate');
      
      return { 
        status: 'auto_merged',
        masterId: bestMatch.candidateId,
        confidence: bestMatch.confidence,
      };
    }
    
    // HITL review required for medium confidence
    await createApprovalTask({
      tenantId,
      entityType: 'dedup_candidate',
      entityId: companyId,
      approvalType: 'dedup_review',
      pipelineStage: 'E1',
      priority: 'normal',
      metadata: {
        companyAId: companyId,
        companyBId: bestMatch.candidateId,
        companyAName: company.denumire,
        companyBName: candidates.find(c => c.id === bestMatch.candidateId)?.denumire,
        confidence: bestMatch.confidence,
        scores: bestMatch.scores,
      },
    });
    
    logger.info({ confidence: bestMatch.confidence }, 'HITL review created for fuzzy duplicate');
    
    return { 
      status: 'hitl_required',
      confidence: bestMatch.confidence,
      approvalCreated: true,
    };
  },
});
```

---

# 2. CATEGORIA N: QUALITY SCORING WORKERS

## 2.1 N.1 - Completeness Score Worker

```typescript
// apps/workers/src/silver/score-completeness.worker.ts

import { createWorker } from '@cerniq/queue';
import { db, silverCompanies } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface CompletenessJobData {
  tenantId: string;
  companyId: string;
  correlationId: string;
}

// Field weights for completeness calculation
const FIELD_WEIGHTS: Record<string, { weight: number; required: boolean }> = {
  // Identification (25%)
  cui: { weight: 5, required: true },
  cuiValidated: { weight: 3, required: false },
  denumire: { weight: 5, required: true },
  nrRegCom: { weight: 2, required: false },
  formaJuridica: { weight: 2, required: false },
  
  // Location (20%)
  adresaCompleta: { weight: 3, required: false },
  localitate: { weight: 3, required: true },
  judet: { weight: 3, required: true },
  latitude: { weight: 3, required: false },
  longitude: { weight: 3, required: false },
  codPostal: { weight: 2, required: false },
  
  // Contact (20%)
  emailPrincipal: { weight: 5, required: false },
  emailVerificat: { weight: 3, required: false },
  telefonPrincipal: { weight: 5, required: false },
  telefonValid: { weight: 2, required: false },
  website: { weight: 3, required: false },
  
  // Business (20%)
  statusFirma: { weight: 5, required: false },
  codCaenPrincipal: { weight: 3, required: false },
  platitorTva: { weight: 2, required: false },
  inregistratEFactura: { weight: 3, required: false },
  
  // Financial (10%)
  cifraAfaceri: { weight: 3, required: false },
  profitNet: { weight: 2, required: false },
  numarAngajati: { weight: 2, required: false },
  scorRiscTermene: { weight: 2, required: false },
  
  // Agricultural (5% - bonus for agri companies)
  isAgricultural: { weight: 1, required: false },
  suprafataAgricola: { weight: 2, required: false },
  culturiPrincipale: { weight: 2, required: false },
};

export const scoreCompletenessWorker = createWorker<CompletenessJobData, CompletenessResult>({
  queueName: 'silver:score:completeness',
  concurrency: 20,
  attempts: 2,
  timeout: 15000,

  processor: async (job, logger) => {
    const { tenantId, companyId } = job.data;
    
    logger.info({ companyId }, 'Calculating completeness score');
    
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company) {
      return { status: 'not_found' };
    }
    
    let totalWeight = 0;
    let earnedWeight = 0;
    const missingFields: string[] = [];
    const presentFields: string[] = [];
    
    for (const [field, config] of Object.entries(FIELD_WEIGHTS)) {
      totalWeight += config.weight;
      
      const value = company[field as keyof typeof company];
      const hasValue = value !== null && value !== undefined && value !== '';
      
      if (hasValue) {
        earnedWeight += config.weight;
        presentFields.push(field);
      } else {
        if (config.required) {
          missingFields.push(field);
        } else {
          // Optional field - half penalty
          earnedWeight += config.weight * 0.5;
          missingFields.push(field);
        }
      }
    }
    
    const completenessScore = Math.round((earnedWeight / totalWeight) * 100);
    
    await db.update(silverCompanies)
      .set({
        completenessScore,
        completenessMissingFields: missingFields,
        completenessCalculatedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));
    
    logger.info({ 
      companyId, 
      score: completenessScore,
      missing: missingFields.length,
    }, 'Completeness score calculated');
    
    return { 
      status: 'success',
      score: completenessScore,
      missingFields,
      presentFields,
    };
  },
});
```

## 2.2 N.2 - Accuracy Score Worker

```typescript
// apps/workers/src/silver/score-accuracy.worker.ts

export const scoreAccuracyWorker = createWorker<AccuracyJobData, AccuracyResult>({
  queueName: 'silver:score:accuracy',
  concurrency: 20,
  attempts: 2,
  timeout: 15000,

  processor: async (job, logger) => {
    const { tenantId, companyId } = job.data;
    
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company) {
      return { status: 'not_found' };
    }
    
    let accuracyPoints = 0;
    const accuracyIssues: string[] = [];
    
    // CUI Validation (30 points)
    if (company.cuiValidated) {
      accuracyPoints += 30;
    } else if (company.cui) {
      // Check CUI checksum locally
      if (validateCuiChecksum(company.cui)) {
        accuracyPoints += 15;
      } else {
        accuracyIssues.push('CUI checksum invalid');
      }
    }
    
    // Email Verification (20 points)
    if (company.emailVerificat) {
      accuracyPoints += 20;
    } else if (company.emailPrincipal) {
      if (isValidEmailFormat(company.emailPrincipal)) {
        accuracyPoints += 10;
      } else {
        accuracyIssues.push('Invalid email format');
      }
    }
    
    // Phone Validation (15 points)
    if (company.hlrReachable === true) {
      accuracyPoints += 15;
    } else if (company.telefonValid) {
      accuracyPoints += 10;
    } else if (company.telefonPrincipal) {
      accuracyPoints += 5;
    }
    
    // Geocoding Accuracy (15 points)
    if (company.geocodingAccuracy === 'rooftop') {
      accuracyPoints += 15;
    } else if (company.geocodingAccuracy === 'street') {
      accuracyPoints += 12;
    } else if (company.geocodingAccuracy === 'locality') {
      accuracyPoints += 8;
    } else if (company.latitude && company.longitude) {
      accuracyPoints += 5;
    }
    
    // Data Source Quality (10 points)
    const officialSources = ['anaf_fiscal', 'termene_balance', 'onrc_data'];
    const completedOfficial = company.enrichmentSourcesCompleted?.filter(
      s => officialSources.includes(s)
    ).length || 0;
    accuracyPoints += Math.min(10, completedOfficial * 3);
    
    // Data Consistency (10 points)
    // Check if data from different sources matches
    let consistencyPoints = 10;
    if (company.denumire && company.denumireNormalizata) {
      // Names should normalize consistently
      consistencyPoints -= 0;
    }
    if (company.judet && company.judetGeocoded && 
        company.judet.toLowerCase() !== company.judetGeocoded.toLowerCase()) {
      consistencyPoints -= 3;
      accuracyIssues.push('County mismatch between declared and geocoded');
    }
    accuracyPoints += Math.max(0, consistencyPoints);
    
    const accuracyScore = Math.min(100, accuracyPoints);
    
    await db.update(silverCompanies)
      .set({
        accuracyScore,
        accuracyIssues,
        accuracyCalculatedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));
    
    logger.info({ companyId, score: accuracyScore }, 'Accuracy score calculated');
    
    return { 
      status: 'success',
      score: accuracyScore,
      issues: accuracyIssues,
    };
  },
});
```

## 2.3 N.3 - Freshness Score Worker

```typescript
// apps/workers/src/silver/score-freshness.worker.ts

export const scoreFreshnessWorker = createWorker<FreshnessJobData, FreshnessResult>({
  queueName: 'silver:score:freshness',
  concurrency: 20,
  attempts: 2,
  timeout: 15000,

  processor: async (job, logger) => {
    const { tenantId, companyId } = job.data;
    
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company) {
      return { status: 'not_found' };
    }
    
    const now = new Date();
    let freshnessScore = 100;
    const freshnessIssues: string[] = [];
    
    // Last enrichment age (40 points max deduction)
    if (company.lastEnrichmentAt) {
      const daysSinceEnrichment = Math.floor(
        (now.getTime() - company.lastEnrichmentAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceEnrichment > 180) {
        freshnessScore -= 40;
        freshnessIssues.push('Enrichment data older than 6 months');
      } else if (daysSinceEnrichment > 90) {
        freshnessScore -= 25;
        freshnessIssues.push('Enrichment data older than 3 months');
      } else if (daysSinceEnrichment > 30) {
        freshnessScore -= 10;
      }
    } else {
      freshnessScore -= 40;
      freshnessIssues.push('Never enriched');
    }
    
    // Financial data age (30 points)
    if (company.anBilant) {
      const currentYear = now.getFullYear();
      const yearsOld = currentYear - company.anBilant;
      
      if (yearsOld > 2) {
        freshnessScore -= 30;
        freshnessIssues.push('Financial data older than 2 years');
      } else if (yearsOld > 1) {
        freshnessScore -= 15;
        freshnessIssues.push('Financial data from previous year');
      }
    }
    
    // CUI validation age (15 points)
    if (company.cuiValidationDate) {
      const daysSinceValidation = Math.floor(
        (now.getTime() - company.cuiValidationDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceValidation > 365) {
        freshnessScore -= 15;
        freshnessIssues.push('CUI validation older than 1 year');
      } else if (daysSinceValidation > 180) {
        freshnessScore -= 8;
      }
    }
    
    // Email validation age (15 points)
    if (company.emailValidatedAt) {
      const daysSinceValidation = Math.floor(
        (now.getTime() - company.emailValidatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceValidation > 90) {
        freshnessScore -= 15;
        freshnessIssues.push('Email validation older than 3 months');
      } else if (daysSinceValidation > 30) {
        freshnessScore -= 5;
      }
    }
    
    freshnessScore = Math.max(0, freshnessScore);
    
    await db.update(silverCompanies)
      .set({
        freshnessScore,
        freshnessIssues,
        freshnessCalculatedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));
    
    logger.info({ companyId, score: freshnessScore }, 'Freshness score calculated');
    
    return { 
      status: 'success',
      score: freshnessScore,
      issues: freshnessIssues,
    };
  },
});
```

---

# 3. CATEGORIA O: AGGREGATION WORKERS

## 3.1 O.1 - Daily Stats Aggregation Worker

```typescript
// apps/workers/src/silver/stats-aggregation.worker.ts

export const statsAggregationWorker = createWorker<StatsAggregationJobData, StatsAggregationResult>({
  queueName: 'silver:aggregate:daily-stats',
  concurrency: 1, // Single execution
  attempts: 3,
  timeout: 300000, // 5 minutes

  processor: async (job, logger) => {
    const { tenantId, date } = job.data;
    
    logger.info({ tenantId, date }, 'Aggregating daily stats');
    
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    // Bronze stats
    const bronzeStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE processing_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE processing_status = 'promoted') as promoted,
        COUNT(*) FILTER (WHERE processing_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE created_at >= ${startOfDay}) as today_ingested
      FROM bronze_contacts
      WHERE tenant_id = ${tenantId}
    `);
    
    // Silver stats
    const silverStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE cui_validated = true) as validated,
        COUNT(*) FILTER (WHERE enrichment_status = 'complete') as enriched,
        COUNT(*) FILTER (WHERE promotion_status = 'eligible') as eligible,
        AVG(total_quality_score) as avg_quality,
        COUNT(*) FILTER (WHERE total_quality_score >= 70) as high_quality,
        COUNT(*) FILTER (WHERE total_quality_score >= 40 AND total_quality_score < 70) as medium_quality,
        COUNT(*) FILTER (WHERE total_quality_score < 40) as low_quality
      FROM silver_companies
      WHERE tenant_id = ${tenantId}
        AND is_master_record = true
    `);
    
    // Gold stats
    const goldStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= ${startOfDay}) as today_promoted,
        AVG(lead_score) as avg_lead_score,
        COUNT(*) FILTER (WHERE current_state = 'COLD') as cold,
        COUNT(*) FILTER (WHERE current_state LIKE 'CONTACTED%') as contacted,
        COUNT(*) FILTER (WHERE current_state = 'CONVERTED') as converted
      FROM gold_companies
      WHERE tenant_id = ${tenantId}
    `);
    
    // Enrichment queue stats
    const queueStats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE enrichment_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE enrichment_status = 'in_progress') as processing,
        COUNT(*) FILTER (WHERE enrichment_status = 'failed') as failed
      FROM silver_companies
      WHERE tenant_id = ${tenantId}
    `);
    
    // HITL stats
    const hitlStats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_at < NOW()) as overdue,
        AVG(EXTRACT(EPOCH FROM (decided_at - created_at))/3600) 
          FILTER (WHERE status IN ('approved', 'rejected')) as avg_resolution_hours
      FROM approval_tasks
      WHERE tenant_id = ${tenantId}
        AND pipeline_stage = 'E1'
    `);
    
    // Store aggregated stats
    await db.insert(dailyStats).values({
      tenantId,
      date: startOfDay,
      bronzeTotal: bronzeStats[0].total,
      bronzePending: bronzeStats[0].pending,
      bronzePromoted: bronzeStats[0].promoted,
      bronzeTodayIngested: bronzeStats[0].today_ingested,
      silverTotal: silverStats[0].total,
      silverValidated: silverStats[0].validated,
      silverEnriched: silverStats[0].enriched,
      silverEligible: silverStats[0].eligible,
      silverAvgQuality: silverStats[0].avg_quality,
      goldTotal: goldStats[0].total,
      goldTodayPromoted: goldStats[0].today_promoted,
      goldAvgLeadScore: goldStats[0].avg_lead_score,
      queuePending: queueStats[0].pending,
      queueProcessing: queueStats[0].processing,
      hitlPending: hitlStats[0].pending,
      hitlOverdue: hitlStats[0].overdue,
      hitlAvgResolutionHours: hitlStats[0].avg_resolution_hours,
    }).onConflictDoUpdate({
      target: [dailyStats.tenantId, dailyStats.date],
      set: {
        // Update all fields
        bronzeTotal: bronzeStats[0].total,
        // ... etc
        updatedAt: new Date(),
      },
    });
    
    logger.info({ tenantId, date: startOfDay }, 'Daily stats aggregated');
    
    return { 
      status: 'success',
      stats: {
        bronze: bronzeStats[0],
        silver: silverStats[0],
        gold: goldStats[0],
      },
    };
  },
});
```

## 3.2 O.2 - Quality Rollup Worker

```typescript
// apps/workers/src/silver/quality-rollup.worker.ts

export const qualityRollupWorker = createWorker<QualityRollupJobData, QualityRollupResult>({
  queueName: 'silver:aggregate:quality-rollup',
  concurrency: 10,
  attempts: 2,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId } = job.data;
    
    logger.info({ companyId }, 'Rolling up quality scores');
    
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company) {
      return { status: 'not_found' };
    }
    
    // Calculate total quality score
    // Weights: Completeness 40%, Accuracy 35%, Freshness 25%
    const totalQualityScore = Math.round(
      (company.completenessScore || 0) * 0.40 +
      (company.accuracyScore || 0) * 0.35 +
      (company.freshnessScore || 0) * 0.25
    );
    
    // Collect all quality issues
    const allQualityIssues = [
      ...(company.completenessMissingFields || []).map(f => `Missing: ${f}`),
      ...(company.accuracyIssues || []),
      ...(company.freshnessIssues || []),
    ];
    
    // Determine promotion eligibility
    const isEligibleForPromotion = 
      totalQualityScore >= 70 &&
      company.cuiValidated === true &&
      !company.inInsolventa &&
      company.statusFirma === 'ACTIVA';
    
    const promotionStatus = isEligibleForPromotion ? 'eligible' : 
      totalQualityScore >= 40 ? 'review_required' : 'blocked';
    
    const promotionBlockedReason = !isEligibleForPromotion
      ? getBlockedReason(company, totalQualityScore)
      : null;
    
    await db.update(silverCompanies)
      .set({
        totalQualityScore,
        qualityIssues: allQualityIssues,
        promotionStatus,
        promotionBlockedReason,
        qualityRollupAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));
    
    // Create HITL task if review required
    if (promotionStatus === 'review_required') {
      await createApprovalTask({
        tenantId,
        entityType: 'company',
        entityId: companyId,
        approvalType: 'quality_review',
        pipelineStage: 'E1',
        priority: 'normal',
        metadata: {
          totalQualityScore,
          completenessScore: company.completenessScore,
          accuracyScore: company.accuracyScore,
          freshnessScore: company.freshnessScore,
          issues: allQualityIssues,
        },
      });
    }
    
    // Trigger promotion if eligible
    if (promotionStatus === 'eligible') {
      await promotionQueue.add('promote', {
        tenantId,
        companyId,
      });
    }
    
    logger.info({ 
      companyId, 
      totalQualityScore,
      promotionStatus,
    }, 'Quality rollup complete');
    
    return { 
      status: 'success',
      totalQualityScore,
      promotionStatus,
    };
  },
});

function getBlockedReason(company: any, score: number): string {
  if (score < 40) return 'Quality score too low (< 40)';
  if (!company.cuiValidated) return 'CUI not validated';
  if (company.inInsolventa) return 'Company in insolvency';
  if (company.statusFirma !== 'ACTIVA') return `Company status: ${company.statusFirma}`;
  return 'Does not meet promotion criteria';
}
```

---

# 4. CATEGORIA P: PIPELINE ORCHESTRATION WORKERS

## 4.1 P.1 - Pipeline Orchestrator Worker

```typescript
// apps/workers/src/pipeline/orchestrator.worker.ts

import { createWorker } from '@cerniq/queue';
import { Queue } from 'bullmq';
import { db, silverCompanies } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface OrchestratorJobData {
  tenantId: string;
  companyId: string;
  stage: 'post_validation' | 'post_enrichment' | 'post_scoring';
  correlationId: string;
}

export const pipelineOrchestratorWorker = createWorker<OrchestratorJobData, OrchestratorResult>({
  queueName: 'pipeline:orchestrate',
  concurrency: 20,
  attempts: 3,
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, stage } = job.data;
    
    logger.info({ companyId, stage }, 'Orchestrating pipeline stage');
    
    const company = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!company) {
      return { status: 'not_found' };
    }
    
    const jobsTriggered: string[] = [];
    
    switch (stage) {
      case 'post_validation':
        // CUI is validated - trigger parallel enrichment
        if (company.cuiValidated) {
          // ANAF enrichment
          await anafQueues.fiscalStatus.add('enrich', { tenantId, companyId, cui: company.cui });
          await anafQueues.tvaStatus.add('enrich', { tenantId, companyId, cui: company.cui });
          await anafQueues.efactura.add('enrich', { tenantId, companyId, cui: company.cui });
          jobsTriggered.push('anaf_fiscal', 'anaf_tva', 'anaf_efactura');
          
          // Termene.ro enrichment
          await termeneQueues.balance.add('enrich', { tenantId, companyId, cui: company.cui });
          await termeneQueues.risk.add('enrich', { tenantId, companyId, cui: company.cui });
          await termeneQueues.dosare.add('enrich', { tenantId, companyId, cui: company.cui });
          jobsTriggered.push('termene_balance', 'termene_risk', 'termene_dosare');
          
          // ONRC enrichment
          await onrcQueues.data.add('enrich', { tenantId, companyId, cui: company.cui });
          jobsTriggered.push('onrc_data');
          
          // Geocoding (if address available)
          if (company.adresaCompleta || company.localitate) {
            await geocodingQueue.add('geocode', { 
              tenantId, 
              companyId, 
              adresa: company.adresaCompleta,
              localitate: company.localitate,
              judet: company.judet,
            });
            jobsTriggered.push('geocoding');
          }
          
          // Website finder
          if (company.denumire) {
            await websiteFinderQueue.add('find', { tenantId, companyId, denumire: company.denumire });
            jobsTriggered.push('website_finder');
          }
        }
        break;
        
      case 'post_enrichment':
        // Check if all enrichment sources complete
        const requiredSources = ['anaf_fiscal', 'termene_balance'];
        const completedSources = company.enrichmentSourcesCompleted || [];
        const allRequired = requiredSources.every(s => completedSources.includes(s));
        
        if (allRequired) {
          // Trigger deduplication
          await dedupQueue.exactHash.add('check', { tenantId, companyId });
          jobsTriggered.push('dedup_exact');
          
          // Trigger quality scoring
          await scoreQueues.completeness.add('score', { tenantId, companyId });
          await scoreQueues.accuracy.add('score', { tenantId, companyId });
          await scoreQueues.freshness.add('score', { tenantId, companyId });
          jobsTriggered.push('score_completeness', 'score_accuracy', 'score_freshness');
          
          // Update enrichment status
          await db.update(silverCompanies)
            .set({ enrichmentStatus: 'complete' })
            .where(eq(silverCompanies.id, companyId));
        }
        break;
        
      case 'post_scoring':
        // All scores calculated - trigger rollup
        if (company.completenessScore !== null && 
            company.accuracyScore !== null && 
            company.freshnessScore !== null) {
          await qualityRollupQueue.add('rollup', { tenantId, companyId });
          jobsTriggered.push('quality_rollup');
        }
        break;
    }
    
    logger.info({ companyId, stage, triggered: jobsTriggered }, 'Pipeline orchestration complete');
    
    return { 
      status: 'success',
      stage,
      jobsTriggered,
    };
  },
});
```

## 4.2 P.2 - Promotion Worker (Silver → Gold)

```typescript
// apps/workers/src/pipeline/promoter.worker.ts

export const promoterWorker = createWorker<PromoterJobData, PromoterResult>({
  queueName: 'pipeline:promote-to-gold',
  concurrency: 10,
  attempts: 3,
  timeout: 60000,

  processor: async (job, logger) => {
    const { tenantId, companyId, force = false } = job.data;
    
    logger.info({ companyId, force }, 'Promoting company to Gold');
    
    const silverCompany = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, companyId),
    });
    
    if (!silverCompany) {
      return { status: 'not_found' };
    }
    
    // Check eligibility (unless forced)
    if (!force) {
      if (silverCompany.promotionStatus !== 'eligible') {
        logger.warn({ 
          companyId, 
          status: silverCompany.promotionStatus,
          reason: silverCompany.promotionBlockedReason,
        }, 'Company not eligible for promotion');
        
        return { 
          status: 'not_eligible',
          reason: silverCompany.promotionBlockedReason,
        };
      }
    }
    
    // Check if already promoted
    if (silverCompany.promotedToGoldId) {
      return { 
        status: 'already_promoted',
        goldId: silverCompany.promotedToGoldId,
      };
    }
    
    // Create Gold company
    const [goldCompany] = await db.insert(goldCompanies).values({
      tenantId,
      silverId: companyId,
      bronzeIds: [silverCompany.sourceBronzeId].filter(Boolean),
      
      // Copy core data
      cui: silverCompany.cui,
      cuiRo: silverCompany.cuiRo,
      denumire: silverCompany.denumire,
      denumireNormalizata: silverCompany.denumireNormalizata,
      formaJuridica: silverCompany.formaJuridica,
      
      // Location
      adresaCompleta: silverCompany.adresaCompleta,
      localitate: silverCompany.localitate,
      judet: silverCompany.judet,
      judetCod: silverCompany.judetCod,
      latitude: silverCompany.latitude,
      longitude: silverCompany.longitude,
      locationGeography: silverCompany.locationGeography,
      
      // Fiscal
      statusFirma: silverCompany.statusFirma,
      platitorTva: silverCompany.platitorTva,
      inregistratEFactura: silverCompany.inregistratEFactura,
      codCaenPrincipal: silverCompany.codCaenPrincipal,
      denumireCaen: silverCompany.denumireCaen,
      
      // Financial
      cifraAfaceri: silverCompany.cifraAfaceri,
      profitNet: silverCompany.profitNet,
      numarAngajati: silverCompany.numarAngajati,
      scorRiscTermene: silverCompany.scorRiscTermene,
      categorieRisc: silverCompany.categorieRisc,
      
      // Contact
      emailPrincipal: silverCompany.emailPrincipal,
      telefonPrincipal: silverCompany.telefonPrincipal,
      website: silverCompany.website,
      
      // Agricultural
      isAgricultural: silverCompany.isAgricultural,
      suprafataAgricola: silverCompany.suprafataAgricola,
      culturiPrincipale: silverCompany.culturiPrincipale,
      
      // Quality
      qualityScoreAtPromotion: silverCompany.totalQualityScore,
      
      // Lead scoring (initial)
      currentState: 'COLD',
      fitScore: calculateInitialFitScore(silverCompany),
      engagementScore: 0,
      intentScore: 0,
      
      // Timestamps
      promotedAt: new Date(),
    }).returning();
    
    // Update Silver company
    await db.update(silverCompanies)
      .set({
        promotionStatus: 'promoted',
        promotedToGoldId: goldCompany.id,
        promotedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));
    
    // Calculate initial lead score
    await leadScoreQueue.add('calculate', { 
      tenantId, 
      goldCompanyId: goldCompany.id,
    });
    
    logger.info({ 
      silverCompanyId: companyId, 
      goldCompanyId: goldCompany.id,
    }, 'Company promoted to Gold');
    
    return { 
      status: 'success',
      goldId: goldCompany.id,
    };
  },
});

function calculateInitialFitScore(company: any): number {
  let score = 0;
  
  // Size (30 points)
  if (company.numarAngajati >= 50) score += 30;
  else if (company.numarAngajati >= 10) score += 20;
  else if (company.numarAngajati >= 1) score += 10;
  
  // Agricultural (25 points)
  if (company.isAgricultural) score += 25;
  
  // Financial health (25 points)
  if (company.categorieRisc === 'LOW') score += 25;
  else if (company.categorieRisc === 'MEDIUM') score += 15;
  
  // e-Factura (10 points)
  if (company.inregistratEFactura) score += 10;
  
  // Geography (10 points) - Romanian market focus
  if (company.judet) score += 10;
  
  return Math.min(100, score);
}
```

## 4.3 P.3 - Pipeline Monitor Worker

```typescript
// apps/workers/src/pipeline/monitor.worker.ts

export const pipelineMonitorWorker = createWorker<MonitorJobData, MonitorResult>({
  queueName: 'pipeline:monitor',
  concurrency: 1,
  attempts: 2,
  timeout: 120000,

  processor: async (job, logger) => {
    const { tenantId } = job.data;
    
    logger.info({ tenantId }, 'Running pipeline monitor');
    
    // Find stalled companies (enrichment started but not completed)
    const stalledCompanies = await db.execute(sql`
      SELECT id, enrichment_status, last_enrichment_at
      FROM silver_companies
      WHERE tenant_id = ${tenantId}
        AND enrichment_status = 'in_progress'
        AND last_enrichment_at < NOW() - INTERVAL '1 hour'
    `);
    
    for (const company of stalledCompanies) {
      logger.warn({ companyId: company.id }, 'Stalled enrichment detected');
      
      // Re-trigger orchestration
      await pipelineOrchestratorQueue.add('orchestrate', {
        tenantId,
        companyId: company.id,
        stage: 'post_validation',
      });
    }
    
    // Find companies stuck in Silver (eligible but not promoted)
    const stuckCompanies = await db.execute(sql`
      SELECT id, promotion_status, quality_rollup_at
      FROM silver_companies
      WHERE tenant_id = ${tenantId}
        AND promotion_status = 'eligible'
        AND promoted_to_gold_id IS NULL
        AND quality_rollup_at < NOW() - INTERVAL '30 minutes'
    `);
    
    for (const company of stuckCompanies) {
      logger.warn({ companyId: company.id }, 'Stuck promotion detected');
      
      // Trigger promotion
      await promoterQueue.add('promote', {
        tenantId,
        companyId: company.id,
      });
    }
    
    // Check for HITL SLA breaches
    const breachedApprovals = await db.execute(sql`
      SELECT id, entity_id, due_at
      FROM approval_tasks
      WHERE tenant_id = ${tenantId}
        AND pipeline_stage = 'E1'
        AND status = 'pending'
        AND due_at < NOW()
    `);
    
    for (const approval of breachedApprovals) {
      logger.error({ approvalId: approval.id }, 'HITL SLA breached');
      
      // Trigger escalation
      await escalationQueue.add('escalate', {
        tenantId,
        approvalId: approval.id,
      });
    }
    
    logger.info({ 
      stalled: stalledCompanies.length,
      stuck: stuckCompanies.length,
      breached: breachedApprovals.length,
    }, 'Pipeline monitor complete');
    
    return { 
      status: 'success',
      stalledCount: stalledCompanies.length,
      stuckCount: stuckCompanies.length,
      breachedCount: breachedApprovals.length,
    };
  },
});
```

## 4.4 P.4 - Error Handler Worker

```typescript
// apps/workers/src/pipeline/error-handler.worker.ts

export const errorHandlerWorker = createWorker<ErrorHandlerJobData, ErrorHandlerResult>({
  queueName: 'pipeline:error-handler',
  concurrency: 10,
  attempts: 1, // No retry for error handler
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, errorType, errorMessage, sourceWorker, jobId } = job.data;
    
    logger.info({ companyId, errorType, sourceWorker }, 'Handling pipeline error');
    
    // Log error
    await db.insert(pipelineErrors).values({
      tenantId,
      entityType: 'company',
      entityId: companyId,
      errorType,
      errorMessage,
      sourceWorker,
      sourceJobId: jobId,
      stackTrace: job.data.stackTrace,
    });
    
    // Determine recovery action
    let recoveryAction: string | null = null;
    
    switch (errorType) {
      case 'API_TIMEOUT':
      case 'RATE_LIMITED':
        // Schedule retry with backoff
        recoveryAction = 'scheduled_retry';
        await retryQueue.add('retry', {
          tenantId,
          companyId,
          sourceWorker,
          originalJobId: jobId,
        }, { delay: 60000 }); // 1 minute delay
        break;
        
      case 'VALIDATION_ERROR':
        // Create HITL task for manual review
        recoveryAction = 'hitl_review';
        await createApprovalTask({
          tenantId,
          entityType: 'company',
          entityId: companyId,
          approvalType: 'error_review',
          pipelineStage: 'E1',
          priority: 'high',
          metadata: {
            errorType,
            errorMessage,
            sourceWorker,
          },
        });
        break;
        
      case 'DATA_NOT_FOUND':
        // Mark source as unavailable, continue pipeline
        recoveryAction = 'skip_source';
        await db.update(silverCompanies)
          .set({
            enrichmentErrors: sql`enrichment_errors || ${JSON.stringify({
              [sourceWorker]: { error: errorMessage, skippedAt: new Date() }
            })}::jsonb`,
          })
          .where(eq(silverCompanies.id, companyId));
        
        // Trigger next stage
        await pipelineOrchestratorQueue.add('orchestrate', {
          tenantId,
          companyId,
          stage: 'post_enrichment',
        });
        break;
        
      case 'PERMANENT_FAILURE':
        // Mark company as blocked
        recoveryAction = 'blocked';
        await db.update(silverCompanies)
          .set({
            enrichmentStatus: 'failed',
            promotionStatus: 'blocked',
            promotionBlockedReason: `Pipeline error: ${errorMessage}`,
          })
          .where(eq(silverCompanies.id, companyId));
        break;
        
      default:
        // Log and alert
        recoveryAction = 'alert_only';
        await alertQueue.add('alert', {
          type: 'pipeline_error',
          severity: 'warning',
          message: `Unhandled error type: ${errorType}`,
          context: { tenantId, companyId, errorMessage },
        });
    }
    
    logger.info({ 
      companyId, 
      errorType, 
      recoveryAction,
    }, 'Error handled');
    
    return { 
      status: 'handled',
      errorType,
      recoveryAction,
    };
  },
});
```

---

# 5. QUEUE CONFIGURATION SUMMARY

| Worker | Queue Name | Concurrency | Timeout | Notes |
|--------|-----------|-------------|---------|-------|
| M.1 Dedup Exact | `silver:dedup:exact-hash` | 10 | 30s | Per-tenant CUI match |
| M.2 Dedup Fuzzy | `silver:dedup:fuzzy-match` | 5 | 60s | Jaro-Winkler, HITL |
| N.1 Completeness | `silver:score:completeness` | 20 | 15s | Field weights |
| N.2 Accuracy | `silver:score:accuracy` | 20 | 15s | Validation checks |
| N.3 Freshness | `silver:score:freshness` | 20 | 15s | Age penalties |
| O.1 Stats Aggreg | `silver:aggregate:daily-stats` | 1 | 300s | Daily cron |
| O.2 Quality Rollup | `silver:aggregate:quality-rollup` | 10 | 30s | 40/35/25 weights |
| P.1 Orchestrator | `pipeline:orchestrate` | 20 | 30s | Stage router |
| P.2 Promoter | `pipeline:promote-to-gold` | 10 | 60s | Silver→Gold |
| P.3 Monitor | `pipeline:monitor` | 1 | 120s | Hourly cron |
| P.4 Error Handler | `pipeline:error-handler` | 10 | 30s | Recovery logic |

---

**Document generat:** 15 Ianuarie 2026
**Total workers:** 11 (M.1-M.2, N.1-N.3, O.1-O.2, P.1-P.4)
**Conformitate:** Master Spec v1.2
