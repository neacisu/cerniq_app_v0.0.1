# CERNIQ.APP — TESTE F1.5: WORKERS CAT. A - INGESTIE

## Teste pentru CSV, Excel, Webhook, Manual, API parsers

**Fază:** F1.5 | **Workeri:** 5

---

## A.1 CSV PARSER

```typescript
describe('CSV Parser Worker', () => {
  it('should parse valid CSV', async () => {
    const csv = 'CUI,Denumire\n12345678,Test SRL';
    const result = await worker.parseCSV(Readable.from(csv));
    expect(result.rows).toHaveLength(1);
  });
  
  it('should handle UTF-8 BOM', async () => {
    const csvWithBOM = '\uFEFFCUI,Denumire\n12345678,Test';
    const result = await worker.parseCSV(Readable.from(csvWithBOM));
    expect(result.rows[0].cui).toBe('12345678');
  });
  
  it('should stream large files', async () => {
    const largeCSV = generateCSV(100000);
    const result = await worker.parseCSV(Readable.from(largeCSV));
    expect(result.rowCount).toBe(100000);
  });
});
```

## A.2 EXCEL PARSER

```typescript
describe('Excel Parser Worker', () => {
  it('should parse XLSX', async () => {
    const buffer = readFileSync('fixtures/valid.xlsx');
    const result = await worker.parseExcel(buffer);
    expect(result.rows.length).toBeGreaterThan(0);
  });
  
  it('should preserve leading zeros in CUI', async () => {
    const buffer = readFileSync('fixtures/numeric-cui.xlsx');
    const result = await worker.parseExcel(buffer);
    expect(result.rows[0].cui).toBe('00012345');
  });
});
```

## A.3 WEBHOOK RECEIVER

```typescript
describe('Webhook Receiver', () => {
  it('should validate HMAC signature', () => {
    const payload = JSON.stringify({ cui: '12345678' });
    const signature = createHmacSignature(payload, secret);
    expect(worker.validateSignature(payload, signature, secret)).toBe(true);
  });
  
  it('should reject duplicates via idempotency key', async () => {
    const result1 = await worker.process({ webhookId: 'wh-1', payload: {} });
    const result2 = await worker.process({ webhookId: 'wh-1', payload: {} });
    expect(result1.status).toBe('processed');
    expect(result2.status).toBe('duplicate');
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
