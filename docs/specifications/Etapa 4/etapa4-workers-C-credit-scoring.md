# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA C
## Credit Scoring Workers - Termene.ro (6 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Overview
Workers pentru integrarea cu Termene.ro API și calculul credit score.

## Worker #13: credit:profile:create
```typescript
export async function creditProfileCreateProcessor(
  job: Job<{clientId: string, cui: string, tenantId: string}>
): Promise<void> {
  const { clientId, cui, tenantId } = job.data;
  
  // Create profile
  const [profile] = await db.insert(goldCreditProfiles).values({
    tenantId,
    clientId,
    cui,
    riskTier: 'MEDIUM',
    creditLimit: 0,
    autoRefreshEnabled: true
  }).returning();
  
  // Trigger parallel data fetches
  const children = [
    { queue: 'credit:data:fetch-anaf', data: { profileId: profile.id, cui } },
    { queue: 'credit:data:fetch-bilant', data: { profileId: profile.id, cui } },
    { queue: 'credit:data:fetch-bpi', data: { profileId: profile.id, cui } }
  ];
  
  await flowProducer.addBulk(children.map(c => ({
    queueName: c.queue,
    name: `${c.queue}-${cui}`,
    data: { ...c.data, tenantId, correlationId: job.data.correlationId }
  })));
}
```

## Worker #14-16: Data Fetch Workers
```typescript
// Worker #14: credit:data:fetch-anaf
export async function creditDataFetchAnafProcessor(job: Job): Promise<AnafData> {
  const { cui } = job.data;
  const anafData = await termeneClient.getAnafStatus(cui);
  return {
    status: anafData.stare_firma,
    tvaStatus: anafData.tva,
    inactive: anafData.inactiv,
    tvaAtRisk: anafData.tva_la_incasare
  };
}

// Worker #15: credit:data:fetch-bilant
export async function creditDataFetchBilantProcessor(job: Job): Promise<FinancialData> {
  const { cui } = job.data;
  const bilant = await termeneClient.getBilant(cui);
  return {
    year: bilant.an,
    revenue: bilant.cifra_afaceri,
    profit: bilant.profit,
    employees: bilant.nr_angajati,
    equity: bilant.capitaluri_proprii
  };
}

// Worker #16: credit:data:fetch-bpi
export async function creditDataFetchBpiProcessor(job: Job): Promise<BpiData> {
  const { cui } = job.data;
  const bpi = await termeneClient.getBpi(cui);
  return {
    status: bpi.stare || 'CLEAN',
    procedureDate: bpi.data_deschidere,
    procedureType: bpi.tip_procedura
  };
}
```

## Worker #17: credit:score:calculate
```typescript
export async function creditScoreCalculateProcessor(
  job: Job<{profileId: string, anafData: any, financialData: any, bpiData: any}>
): Promise<{score: number, riskTier: string}> {
  const { profileId, anafData, financialData, bpiData } = job.data;
  
  // Calculate score using weighted formula
  let score = 0;
  
  // ANAF Status (15 points max)
  if (!anafData.inactive) score += 8;
  if (anafData.tvaStatus === 'ACTIVE') score += 7;
  
  // Financial Health (30 points max)
  if (financialData.profit > 0) score += 15;
  if (financialData.revenue > 100000) score += 10;
  if (financialData.equity > 0) score += 5;
  
  // BPI Status (20 points max)
  if (bpiData.status === 'CLEAN') score += 20;
  else if (bpiData.status === 'REORGANIZATION') score += 5;
  
  // Payment History (25 points) - from internal data
  const paymentHistory = await getInternalPaymentHistory(profileId);
  if (paymentHistory.onTimeRate >= 90) score += 25;
  else if (paymentHistory.onTimeRate >= 70) score += 15;
  
  // Litigation (10 points)
  const litigation = await termeneClient.getLitigii(job.data.cui);
  if (litigation.asDefendant === 0) score += 10;
  
  // Determine risk tier
  const riskTier = score < 30 ? 'BLOCKED' :
                   score < 50 ? 'LOW' :
                   score < 70 ? 'MEDIUM' :
                   score < 90 ? 'HIGH' : 'PREMIUM';
  
  // Update profile
  await db.update(goldCreditProfiles)
    .set({
      creditScore: score,
      riskTier,
      scoreComponents: { anafData, financialData, bpiData },
      lastScoredAt: new Date(),
      nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    })
    .where(eq(goldCreditProfiles.id, profileId));
  
  // Queue limit calculation
  await flowProducer.add({
    queueName: 'credit:limit:calculate',
    data: { profileId, score, riskTier }
  });
  
  return { score, riskTier };
}
```

## Worker #18: credit:limit:calculate
```typescript
export async function creditLimitCalculateProcessor(
  job: Job<{profileId: string, score: number, riskTier: string}>
): Promise<{limit: number}> {
  const { profileId, score, riskTier } = job.data;
  
  const limitMap = {
    'BLOCKED': 0,
    'LOW': 5000,
    'MEDIUM': 20000,
    'HIGH': 50000,
    'PREMIUM': 100000
  };
  
  let limit = limitMap[riskTier] || 0;
  
  // HITL for high limits
  if (limit > 50000) {
    await flowProducer.add({
      queueName: 'hitl:approval:credit-limit',
      data: { profileId, proposedLimit: limit, riskTier, score }
    });
    limit = 50000; // Temporary cap until approved
  }
  
  await db.update(goldCreditProfiles)
    .set({ creditLimit: limit })
    .where(eq(goldCreditProfiles.id, profileId));
  
  return { limit };
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
