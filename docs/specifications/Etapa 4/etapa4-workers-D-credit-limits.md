# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA D
## Credit Limit Workers (3 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Worker #19: credit:limit:check
```typescript
export async function creditLimitCheckProcessor(
  job: Job<{orderId: string, clientId: string, orderTotal: number}>
): Promise<CreditCheckResult> {
  const { orderId, clientId, orderTotal, tenantId } = job.data;
  
  const profile = await db.query.goldCreditProfiles.findFirst({
    where: eq(goldCreditProfiles.clientId, clientId)
  });
  
  if (!profile) {
    return { result: 'ERROR', reason: 'NO_CREDIT_PROFILE' };
  }
  
  if (profile.isBlocked) {
    return { result: 'BLOCKED_CLIENT', reason: profile.blockedReason };
  }
  
  // Check if score is expired (> 30 days old)
  if (profile.lastScoredAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
    await flowProducer.add({ queueName: 'credit:score:refresh', data: { profileId: profile.id } });
    return { result: 'SCORE_EXPIRED', reason: 'Credit score needs refresh' };
  }
  
  if (profile.creditAvailable >= orderTotal) {
    // Approved - queue reservation
    await flowProducer.add({
      queueName: 'credit:limit:reserve',
      data: { orderId, profileId: profile.id, amount: orderTotal }
    });
    return { result: 'APPROVED', availableCredit: profile.creditAvailable };
  }
  
  // Insufficient credit - queue for HITL
  const overage = orderTotal - profile.creditAvailable;
  await flowProducer.add({
    queueName: 'hitl:approval:credit-override',
    data: { orderId, clientId, profileId: profile.id, orderTotal, available: profile.creditAvailable, overage }
  });
  
  return { result: 'PENDING_APPROVAL', overage };
}
```

## Worker #20: credit:limit:reserve
```typescript
export async function creditLimitReserveProcessor(
  job: Job<{orderId: string, profileId: string, amount: number}>
): Promise<{reservationId: string}> {
  const { orderId, profileId, amount, tenantId } = job.data;
  
  const [reservation] = await db.insert(goldCreditReservations).values({
    tenantId,
    creditProfileId: profileId,
    orderId,
    amount,
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
  }).returning();
  
  // Update order status
  await db.update(goldOrders)
    .set({ status: 'CREDIT_APPROVED', creditApproved: true, creditLimitUsed: amount })
    .where(eq(goldOrders.id, orderId));
  
  return { reservationId: reservation.id };
}
```

## Worker #21: credit:limit:release
```typescript
export async function creditLimitReleaseProcessor(
  job: Job<{orderId: string, reason: 'PAID' | 'CANCELLED'}>
): Promise<void> {
  const { orderId, reason } = job.data;
  
  const reservation = await db.query.goldCreditReservations.findFirst({
    where: eq(goldCreditReservations.orderId, orderId)
  });
  
  if (!reservation) return;
  
  await db.update(goldCreditReservations)
    .set({
      status: reason === 'PAID' ? 'CONVERTED' : 'CANCELLED',
      resolvedAt: new Date()
    })
    .where(eq(goldCreditReservations.id, reservation.id));
  
  // If paid, convert to actual credit used (already in use)
  // If cancelled, release the reserved credit
  if (reason === 'CANCELLED') {
    await db.update(goldCreditProfiles)
      .set({ creditReserved: sql`credit_reserved - ${reservation.amount}` })
      .where(eq(goldCreditProfiles.id, reservation.creditProfileId));
  }
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
