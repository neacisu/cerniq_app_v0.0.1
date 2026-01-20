# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA B
## Payment Reconciliation Workers (6 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Overview Categoria B

Reconcilierea automată a plăților cu facturile prin three-tier matching.

### Reconciliation Flow
```
Payment Recorded → B7 (Auto Match) → Match Found? 
                        ↓ YES              ↓ NO
                   B10 (Balance)      B8 (Fuzzy Match)
                        ↓                   ↓
                   Order Released    Match Found?
                                         ↓ NO
                                    B51 (HITL Queue)
```

---

## 2. Worker #7: payment:reconcile:auto {#2-worker-7}

### Specificații
| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `payment:reconcile:auto` |
| **Concurrency** | 10 |
| **Timeout** | 15000ms |
| **Critical** | ✅ YES |

### Implementare
```typescript
export async function paymentReconcileAutoProcessor(
  job: Job<ReconcileAutoInput>
): Promise<ReconcileAutoOutput> {
  const { correlationId, tenantId, paymentId, amount, reference, counterpartyName } = job.data;
  
  // Tier 1: Exact match by reference
  if (reference) {
    const exactMatch = await db.query.goldInvoices.findFirst({
      where: and(
        eq(goldInvoices.tenantId, tenantId),
        eq(goldInvoices.invoiceNumber, reference),
        eq(goldInvoices.status, 'PENDING')
      )
    });
    
    if (exactMatch && Math.abs(exactMatch.totalAmount - amount) < 0.01) {
      // Exact match found
      await recordReconciliation(paymentId, exactMatch.id, 'MATCHED_EXACT', 100);
      await updateOrderPayment(exactMatch.orderId, amount);
      await triggerBalanceUpdate(exactMatch.clientId);
      
      return {
        success: true,
        matchType: 'EXACT',
        invoiceId: exactMatch.id,
        confidence: 100
      };
    }
  }
  
  // No exact match - queue for fuzzy
  await flowProducer.add({
    queueName: 'payment:reconcile:fuzzy',
    data: { correlationId, tenantId, paymentId, amount, counterpartyName }
  });
  
  return { success: true, matchType: 'NONE', nextQueue: 'payment:reconcile:fuzzy' };
}
```

---

## 3. Worker #8: payment:reconcile:fuzzy {#3-worker-8}

### Implementare
```typescript
export async function paymentReconcileFuzzyProcessor(
  job: Job<ReconcileFuzzyInput>
): Promise<ReconcileFuzzyOutput> {
  const { correlationId, tenantId, paymentId, amount, counterpartyName } = job.data;
  
  // Find potential matches: amount within 5%, pending status
  const candidates = await db.query.goldInvoices.findMany({
    where: and(
      eq(goldInvoices.tenantId, tenantId),
      eq(goldInvoices.status, 'PENDING'),
      between(goldInvoices.totalAmount, amount * 0.95, amount * 1.05)
    ),
    with: { client: true },
    limit: 10
  });
  
  // Score each candidate
  const scored = candidates.map(invoice => {
    const amountScore = 100 - Math.abs(invoice.totalAmount - amount) / amount * 100;
    const nameScore = fuzzyMatch(counterpartyName, invoice.client.companyName) * 100;
    const totalScore = (amountScore * 0.6) + (nameScore * 0.4);
    
    return { invoice, score: totalScore, amountScore, nameScore };
  });
  
  // Best match
  const bestMatch = scored.sort((a, b) => b.score - a.score)[0];
  
  if (bestMatch && bestMatch.score >= 85) {
    await recordReconciliation(paymentId, bestMatch.invoice.id, 'MATCHED_FUZZY', bestMatch.score);
    await updateOrderPayment(bestMatch.invoice.orderId, amount);
    
    return {
      success: true,
      matchType: 'FUZZY',
      invoiceId: bestMatch.invoice.id,
      confidence: bestMatch.score
    };
  }
  
  // No good match - queue for HITL
  await flowProducer.add({
    queueName: 'hitl:investigation:payment',
    data: {
      correlationId,
      tenantId,
      paymentId,
      amount,
      counterpartyName,
      candidates: scored.slice(0, 5).map(s => ({
        invoiceId: s.invoice.id,
        invoiceNumber: s.invoice.invoiceNumber,
        clientName: s.invoice.client.companyName,
        amount: s.invoice.totalAmount,
        score: s.score
      }))
    }
  });
  
  return { success: true, matchType: 'UNMATCHED', nextQueue: 'hitl:investigation:payment' };
}
```

---

## 4. Worker #9-12: Balance & Overdue

### Worker #10: payment:balance:update
```typescript
export async function paymentBalanceUpdateProcessor(
  job: Job<BalanceUpdateInput>
): Promise<void> {
  const { tenantId, clientId, orderId, amount } = job.data;
  
  // Update order
  await db.update(goldOrders)
    .set({
      amountPaid: sql`amount_paid + ${amount}`,
      status: sql`CASE WHEN amount_paid + ${amount} >= total_amount THEN 'PAYMENT_RECEIVED' ELSE status END`
    })
    .where(eq(goldOrders.id, orderId));
  
  // Update credit used
  await db.update(goldCreditProfiles)
    .set({
      creditUsed: sql`credit_used - ${amount}`
    })
    .where(eq(goldCreditProfiles.clientId, clientId));
}
```

### Worker #11: payment:overdue:detect
```typescript
// Cron: 0 9 * * * (daily at 09:00)
export async function paymentOverdueDetectProcessor(
  job: Job<{correlationId: string}>
): Promise<OverdueDetectOutput> {
  const overdueOrders = await db.query.goldOrders.findMany({
    where: and(
      lt(goldOrders.dueDate, sql`CURRENT_DATE`),
      gt(goldOrders.amountDue, 0),
      notInArray(goldOrders.status, ['COMPLETED', 'CANCELLED'])
    ),
    with: { client: true }
  });
  
  for (const order of overdueOrders) {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(order.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Queue escalation
    await flowProducer.add({
      queueName: 'payment:overdue:escalate',
      data: {
        orderId: order.id,
        clientId: order.clientId,
        amountDue: order.amountDue,
        daysOverdue,
        escalationLevel: daysOverdue > 30 ? 'CRITICAL' : daysOverdue > 14 ? 'HIGH' : 'NORMAL'
      }
    });
  }
  
  return { overdueCount: overdueOrders.length };
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
