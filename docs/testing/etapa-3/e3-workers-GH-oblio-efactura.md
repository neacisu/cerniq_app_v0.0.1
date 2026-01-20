# CERNIQ.APP — TESTE E3: OBLIO & E-FACTURA

## Teste pentru Oblio și ANAF e-Factura

**Categorii:** G-H | **Workeri:** 12

---

## OBLIO

```typescript
describe('Oblio Integration', () => {
  it('should create invoice', async () => {
    server.use(http.post('https://api.oblio.eu/*', () => 
      HttpResponse.json({ data: { seriesName: 'FCT', number: '001' } })
    ));
    const invoice = await oblioService.createInvoice({
      clientCui: '12345678',
      items: [{ name: 'Produs', price: 100, qty: 1 }],
    });
    expect(invoice.series).toBe('FCT');
    expect(invoice.number).toBe('001');
  });
  
  it('should cancel invoice', async () => {
    const result = await oblioService.cancel('FCT', '001');
    expect(result.cancelled).toBe(true);
  });
});
```

## E-FACTURA ANAF

```typescript
describe('e-Factura ANAF', () => {
  it('should generate UBL XML', () => {
    const xml = eFacturaService.generateUBL(invoiceData);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
  });
  
  it('should submit to SPV', async () => {
    server.use(http.post('https://api.anaf.ro/test/FCTEL/*', () => 
      HttpResponse.json({ id_incarcare: '12345' })
    ));
    const result = await eFacturaService.submit(invoiceXml);
    expect(result.uploadId).toBe('12345');
  });
  
  it('should check status', async () => {
    server.use(http.get('https://api.anaf.ro/test/FCTEL/*', () => 
      HttpResponse.json({ stare: 'ok' })
    ));
    const status = await eFacturaService.checkStatus('12345');
    expect(status).toBe('ok');
  });
  
  it('should validate before submit', async () => {
    const validation = await eFacturaService.validate(invalidXml);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
