# CERNIQ.APP — TESTE F1.8: WORKERS CAT. F-H - ONRC, EMAIL, PHONE

## Teste pentru ONRC scraping, Hunter.io, phone validation

**Fază:** F1.8 | **Workeri:** 11

---

## F.1-F.3 ONRC

```typescript
describe('ONRC Worker', () => {
  it('should scrape company data', async () => {
    server.use(http.get('https://portal.onrc.ro/*', () => HttpResponse.html('<html>...</html>')));
    const result = await worker.fetchCompany('12345678');
    expect(result.denumire).toBeDefined();
  });
  
  it('should handle rate limiting', async () => {
    const result = await worker.fetchWithRetry('12345678', { maxRetries: 3 });
    expect(result).toBeDefined();
  });
});
```

## G.1-G.5 EMAIL DISCOVERY

```typescript
describe('Email Discovery', () => {
  it('should generate email patterns', () => {
    const patterns = generateEmailPatterns('Ion', 'Popescu', 'company.ro');
    expect(patterns).toContain('ion.popescu@company.ro');
    expect(patterns).toContain('i.popescu@company.ro');
  });
});

describe('Hunter.io Integration', () => {
  it('should find domain emails', async () => {
    server.use(http.get('https://api.hunter.io/*', () => HttpResponse.json({
      data: { emails: [{ value: 'contact@company.ro' }] }
    })));
    const result = await hunterService.findEmails('company.ro');
    expect(result).toContain('contact@company.ro');
  });
});

describe('Email Verifier', () => {
  it('should verify deliverable email', async () => {
    const result = await verifyEmail('valid@example.com');
    expect(result.deliverable).toBe(true);
  });
});
```

## H.1-H.3 PHONE

```typescript
describe('Phone Validator', () => {
  it('should validate Romanian mobile', () => {
    expect(validatePhone('+40721123456')).toBe(true);
    expect(validatePhone('+40123')).toBe(false);
  });
  
  it('should detect carrier', async () => {
    const result = await getCarrier('+40721123456');
    expect(['Vodafone', 'Orange', 'Telekom', 'Digi']).toContain(result.carrier);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
