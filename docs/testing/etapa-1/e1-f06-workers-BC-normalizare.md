# CERNIQ.APP — TESTE F1.6: WORKERS CAT. B-C - NORMALIZARE

## Teste pentru CUI, Email, Phone normalization și validation

**Fază:** F1.6 | **Workeri:** 6

---

## B.1-B.4 NORMALIZATION

```typescript
describe('CUI Normalizer', () => {
  it('should strip RO prefix', () => {
    expect(normalizeCUI('RO12345678')).toBe('12345678');
  });
  
  it('should strip leading zeros', () => {
    expect(normalizeCUI('0012345678')).toBe('12345678');
  });
});

describe('Email Normalizer', () => {
  it('should lowercase', () => {
    expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
  });
  
  it('should trim whitespace', () => {
    expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
  });
});

describe('Phone Normalizer', () => {
  it('should add +40 prefix', () => {
    expect(normalizePhone('0721123456')).toBe('+40721123456');
  });
  
  it('should remove spaces', () => {
    expect(normalizePhone('0721 123 456')).toBe('+40721123456');
  });
});

describe('Name Normalizer', () => {
  it('should uppercase', () => {
    expect(normalizeName('agro test srl')).toBe('AGRO TEST SRL');
  });
});
```

## C.1-C.2 VALIDATION

```typescript
describe('CUI Validator', () => {
  it('should validate checksum', () => {
    expect(validateCUI('12345678')).toBe(true);
    expect(validateCUI('12345679')).toBe(false);
  });
});

describe('Email Validator', () => {
  it('should validate syntax', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
  });
  
  it('should check MX record', async () => {
    const result = await validateEmailMX('test@example.com');
    expect(result.hasMX).toBe(true);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
