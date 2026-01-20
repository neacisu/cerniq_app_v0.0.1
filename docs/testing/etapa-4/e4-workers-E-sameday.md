# CERNIQ.APP — TESTE E4: SAMEDAY LOGISTICS

## Teste pentru AWB generation și tracking

**Categorie:** E | **Workeri:** 4

---

## TESTE

```typescript
describe('Sameday Integration', () => {
  it('should generate AWB', async () => {
    server.use(http.post('https://api.sameday.ro/*', () => 
      HttpResponse.json({ awbNumber: '1234567890', pdfLink: 'https://...' })
    ));
    const order = await createOrder({ shipping: 'sameday' });
    const awb = await samedayService.generateAWB(order.id);
    expect(awb.awbNumber).toMatch(/^\d{10}$/);
  });
  
  it('should include correct dimensions', async () => {
    const order = await createOrder({
      items: [{ weight: 5, dimensions: { l: 30, w: 20, h: 10 } }],
    });
    const payload = samedayService.buildPayload(order);
    expect(payload.parcelWeight).toBe(5);
  });
  
  it('should track AWB status', async () => {
    server.use(http.get('https://api.sameday.ro/awb/*', () => 
      HttpResponse.json({ status: 'in_transit', lastLocation: 'București' })
    ));
    const status = await samedayService.getStatus('1234567890');
    expect(status.state).toBe('in_transit');
  });
  
  it('should process delivery webhook', async () => {
    const webhook = { awb: '1234567890', event: 'delivered' };
    await samedayService.processWebhook(webhook);
    const order = await getOrderByAWB('1234567890');
    expect(order.deliveryStatus).toBe('delivered');
  });
  
  it('should handle return AWB', async () => {
    const returnAwb = await samedayService.generateReturnAWB('1234567890');
    expect(returnAwb.type).toBe('return');
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
