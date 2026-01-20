# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA F
## Stock Sync Workers - Oblio (4 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Worker #28: stock:sync:oblio (Cron */15min)
```typescript
export async function stockSyncOblioProcessor(job: Job): Promise<{synced: number}> {
  const tenants = await db.query.tenants.findMany({ where: eq(tenants.oblioEnabled, true) });
  
  let totalSynced = 0;
  
  for (const tenant of tenants) {
    const oblioProducts = await oblioClient.getProducts(tenant.oblioApiKey);
    
    for (const product of oblioProducts) {
      await db.update(goldProducts)
        .set({
          stockQuantity: product.stock,
          stockUpdatedAt: new Date()
        })
        .where(and(
          eq(goldProducts.tenantId, tenant.id),
          eq(goldProducts.oblioProductId, product.id)
        ));
      totalSynced++;
    }
  }
  
  metrics.stockSyncCount.set(totalSynced);
  return { synced: totalSynced };
}
```

## Worker #29: stock:reserve:order
```typescript
export async function stockReserveOrderProcessor(
  job: Job<{orderId: string}>
): Promise<{reserved: boolean}> {
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, job.data.orderId),
    with: { items: { with: { product: true } } }
  });
  
  // Check all items have stock
  for (const item of order.items) {
    if (item.product.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${item.product.sku}`);
    }
  }
  
  // Reserve stock
  for (const item of order.items) {
    await db.update(goldProducts)
      .set({ stockReserved: sql`stock_reserved + ${item.quantity}` })
      .where(eq(goldProducts.id, item.productId));
    
    await db.update(goldOrderItems)
      .set({ stockReserved: true })
      .where(eq(goldOrderItems.id, item.id));
  }
  
  return { reserved: true };
}
```

## Worker #30-31: Release & Deduct
```typescript
// Worker #30: stock:release:order
export async function stockReleaseOrderProcessor(job: Job<{orderId: string}>): Promise<void> {
  const items = await db.query.goldOrderItems.findMany({
    where: and(eq(goldOrderItems.orderId, job.data.orderId), eq(goldOrderItems.stockReserved, true))
  });
  
  for (const item of items) {
    await db.update(goldProducts)
      .set({ stockReserved: sql`stock_reserved - ${item.quantity}` })
      .where(eq(goldProducts.id, item.productId));
  }
}

// Worker #31: stock:deduct:delivered
export async function stockDeductDeliveredProcessor(job: Job<{orderId: string}>): Promise<void> {
  const items = await db.query.goldOrderItems.findMany({
    where: eq(goldOrderItems.orderId, job.data.orderId)
  });
  
  for (const item of items) {
    await db.update(goldProducts)
      .set({
        stockQuantity: sql`stock_quantity - ${item.quantity}`,
        stockReserved: sql`stock_reserved - ${item.quantity}`
      })
      .where(eq(goldProducts.id, item.productId));
    
    await db.update(goldOrderItems)
      .set({ stockDeducted: true })
      .where(eq(goldOrderItems.id, item.id));
  }
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
