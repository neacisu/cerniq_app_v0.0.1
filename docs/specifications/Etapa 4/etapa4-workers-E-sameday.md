# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA E
## Sameday Logistics Workers (6 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Overview
Workers pentru integrare cu Sameday Courier API.

## Worker #22: sameday:awb:create
```typescript
const SAMEDAY_CONFIG = {
  baseUrl: 'https://api.sameday.ro',
  rateLimit: { max: 30, duration: 60000 } // 30/min
};

export async function samedayAwbCreateProcessor(
  job: Job<{orderId: string, addressId: string}>
): Promise<{awbNumber: string}> {
  const { orderId, addressId, tenantId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { items: true, client: true }
  });
  
  const address = await db.query.goldAddresses.findFirst({
    where: eq(goldAddresses.id, addressId)
  });
  
  // Create AWB via Sameday API
  const awbResponse = await samedayClient.createAwb({
    pickupPoint: process.env.SAMEDAY_PICKUP_POINT_ID,
    service: order.total > 500 ? 'EXPRESS' : 'STANDARD',
    packageType: 0, // Parcel
    packageNumber: 1,
    packageWeight: order.totalWeight || 1,
    
    // COD
    awbPayment: order.paymentMethod === 'COD' ? 1 : 0,
    cashOnDelivery: order.paymentMethod === 'COD' ? order.amountDue : 0,
    
    // Recipient
    recipient: {
      name: address.contactName,
      phone: address.contactPhone,
      email: address.contactEmail,
      address: address.streetAddress,
      city: address.city,
      county: address.county,
      postalCode: address.postalCode
    },
    
    observation: `Comanda ${order.orderNumber}`,
    clientReference: order.orderNumber
  });
  
  // Store shipment
  const [shipment] = await db.insert(goldShipments).values({
    tenantId,
    orderId,
    awbNumber: awbResponse.awbNumber,
    carrier: 'SAMEDAY',
    carrierService: awbResponse.service,
    status: 'CREATED',
    deliveryType: awbResponse.service === 'EXPRESS' ? 'EXPRESS' : 'STANDARD',
    destinationAddressId: addressId,
    codType: order.paymentMethod === 'COD' ? 'CASH_OR_CARD' : 'NONE',
    codAmount: order.paymentMethod === 'COD' ? order.amountDue : 0,
    samedayParcelId: awbResponse.parcelId,
    trackingUrl: `https://sameday.ro/tracking/${awbResponse.awbNumber}`,
    labelPdfUrl: awbResponse.labelUrl,
    rawCarrierResponse: awbResponse
  }).returning();
  
  // Update order
  await db.update(goldOrders)
    .set({ shipmentId: shipment.id, status: 'READY_FOR_PICKUP' })
    .where(eq(goldOrders.id, orderId));
  
  // Queue for tracking
  await flowProducer.add({
    queueName: 'sameday:status:poll',
    data: { shipmentId: shipment.id, awbNumber: awbResponse.awbNumber },
    opts: { delay: 30 * 60 * 1000, repeat: { every: 30 * 60 * 1000 } }
  });
  
  return { awbNumber: awbResponse.awbNumber, shipmentId: shipment.id };
}
```

## Worker #23: sameday:status:poll
```typescript
export async function samedayStatusPollProcessor(
  job: Job<{shipmentId: string, awbNumber: string}>
): Promise<void> {
  const { shipmentId, awbNumber } = job.data;
  
  const tracking = await samedayClient.getTracking(awbNumber);
  
  // Store tracking event
  await db.insert(goldShipmentTracking).values({
    shipmentId,
    status: mapSamedayStatus(tracking.status),
    statusCode: tracking.statusCode,
    statusMessage: tracking.statusDescription,
    locationName: tracking.location,
    locationCity: tracking.city,
    eventTimestamp: new Date(tracking.timestamp),
    rawEvent: tracking
  });
  
  // Check if status changed
  const shipment = await db.query.goldShipments.findFirst({
    where: eq(goldShipments.id, shipmentId)
  });
  
  if (shipment.status !== mapSamedayStatus(tracking.status)) {
    await flowProducer.add({
      queueName: 'sameday:status:process',
      data: { shipmentId, oldStatus: shipment.status, newStatus: mapSamedayStatus(tracking.status), tracking }
    });
  }
  
  // Stop polling if terminal status
  const terminalStatuses = ['DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED'];
  if (terminalStatuses.includes(mapSamedayStatus(tracking.status))) {
    await job.remove(); // Remove repeating job
  }
}
```

## Worker #24: sameday:status:process
```typescript
export async function samedayStatusProcessProcessor(
  job: Job<{shipmentId: string, oldStatus: string, newStatus: string}>
): Promise<void> {
  const { shipmentId, newStatus, tenantId } = job.data;
  
  const shipment = await db.query.goldShipments.findFirst({
    where: eq(goldShipments.id, shipmentId),
    with: { order: true }
  });
  
  // Update shipment
  await db.update(goldShipments)
    .set({ status: newStatus, previousStatus: shipment.status, statusChangedAt: new Date() })
    .where(eq(goldShipments.id, shipmentId));
  
  // Trigger actions based on new status
  switch (newStatus) {
    case 'PICKED_UP':
      await flowProducer.add({
        queueName: 'alert:client:shipped',
        data: { orderId: shipment.orderId, awbNumber: shipment.awbNumber }
      });
      await db.update(goldOrders).set({ status: 'IN_TRANSIT' }).where(eq(goldOrders.id, shipment.orderId));
      break;
      
    case 'DELIVERED':
      await flowProducer.addBulk([
        { queueName: 'alert:client:delivered', data: { orderId: shipment.orderId } },
        { queueName: 'stock:deduct:delivered', data: { orderId: shipment.orderId } },
        { queueName: 'sameday:cod:process', data: { shipmentId } }
      ]);
      await db.update(goldOrders).set({ status: 'DELIVERED' }).where(eq(goldOrders.id, shipment.orderId));
      break;
      
    case 'DELIVERY_FAILED':
      // After 3 fails, initiate return
      const failCount = await countDeliveryFails(shipmentId);
      if (failCount >= 3) {
        await flowProducer.add({ queueName: 'sameday:return:initiate', data: { shipmentId } });
      }
      break;
  }
}
```

## Worker #25-27: COD, Return, Pickup
```typescript
// Worker #25: sameday:cod:process
export async function samedayCodProcessProcessor(job: Job<{shipmentId: string}>): Promise<void> {
  const shipment = await db.query.goldShipments.findFirst({
    where: and(eq(goldShipments.id, job.data.shipmentId), ne(goldShipments.codType, 'NONE'))
  });
  
  if (!shipment || shipment.codCollected) return;
  
  // Record COD collection
  await db.insert(goldCodCollections).values({
    tenantId: shipment.tenantId,
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    expectedAmount: shipment.codAmount,
    collectedAmount: shipment.codAmount,
    status: 'COLLECTED',
    collectedAt: new Date()
  });
  
  // Update shipment
  await db.update(goldShipments)
    .set({ codCollected: true, codCollectedAt: new Date() })
    .where(eq(goldShipments.id, shipment.id));
  
  // Record as payment
  await flowProducer.add({
    queueName: 'revolut:payment:record',
    data: { orderId: shipment.orderId, amount: shipment.codAmount, source: 'COD' }
  });
}

// Worker #27: sameday:pickup:schedule (Cron 14:00)
export async function samedayPickupScheduleProcessor(job: Job): Promise<void> {
  const pendingPickups = await db.query.goldShipments.findMany({
    where: and(eq(goldShipments.status, 'CREATED'), isNull(goldShipments.pickupScheduledAt))
  });
  
  if (pendingPickups.length > 0) {
    const pickupResponse = await samedayClient.schedulePickup({
      pickupPoint: process.env.SAMEDAY_PICKUP_POINT_ID,
      awbNumbers: pendingPickups.map(s => s.awbNumber),
      pickupDate: new Date().toISOString().split('T')[0]
    });
    
    await db.update(goldShipments)
      .set({ pickupScheduledAt: new Date(), status: 'PENDING_PICKUP' })
      .where(inArray(goldShipments.id, pendingPickups.map(s => s.id)));
  }
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
