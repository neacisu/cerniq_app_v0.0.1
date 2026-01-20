# CERNIQ.APP — TESTE CROSS-CUTTING: SECURITY

## Security Testing pentru OWASP Top 10 și mai mult

**Scope:** Toate etapele (E0-E5) | **Tools:** Trivy, OWASP ZAP, ESLint Security

---

## OWASP TOP 10 TESTING MATRIX

| ### | Vulnerabilitate | Test Strategy | Tool |
| --- | --------------- | ------------- | ---- |
| A01 | Broken Access Control | RLS bypass, IDOR, privilege escalation | Vitest, Manual |
| A02 | Cryptographic Failures | Password hashing, TLS, secrets | Trivy, Manual |
| A03 | Injection | SQL, XSS, Command, NoSQL | OWASP ZAP, Vitest |
| A04 | Insecure Design | Business logic flaws | Manual, Code Review |
| A05 | Security Misconfiguration | Headers, CORS, defaults | Vitest, ZAP |
| A06 | Vulnerable Components | Dependency scan | Trivy, npm audit |
| A07 | Auth Failures | JWT, session, brute force | Vitest, Manual |
| A08 | Data Integrity | CSRF, request tampering | Vitest |
| A09 | Logging Failures | Audit completeness, PII | Vitest |
| A10 | SSRF | Server-side requests | Vitest, Manual |

---

## 1. A01: BROKEN ACCESS CONTROL TESTS

### 1.1 Row-Level Security (RLS) Bypass

```typescript
// tests/security/rls-bypass.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db, setTenantContext } from '@cerniq/db';

describe('RLS Security Tests', () => {
  
  describe('Cross-Tenant Data Access', () => {
    let tenantACompanyId: string;
    let tenantBCompanyId: string;
    
    beforeAll(async () => {
      // Seed data for two tenants
      await setTenantContext('tenant-A');
      const [compA] = await db.insert(goldCompanies).values({
        tenantId: 'tenant-A',
        cui: '12345678',
        denumire: 'Company A',
      }).returning();
      tenantACompanyId = compA.id;
      
      await setTenantContext('tenant-B');
      const [compB] = await db.insert(goldCompanies).values({
        tenantId: 'tenant-B',
        cui: '87654321',
        denumire: 'Company B',
      }).returning();
      tenantBCompanyId = compB.id;
    });
    
    it('should block cross-tenant SELECT', async () => {
      await setTenantContext('tenant-A');
      
      const result = await db.select()
        .from(goldCompanies)
        .where(eq(goldCompanies.id, tenantBCompanyId));
      
      expect(result).toHaveLength(0); // Cannot see tenant B data
    });
    
    it('should block cross-tenant UPDATE', async () => {
      await setTenantContext('tenant-A');
      
      const updated = await db.update(goldCompanies)
        .set({ denumire: 'Hacked' })
        .where(eq(goldCompanies.id, tenantBCompanyId))
        .returning();
      
      expect(updated).toHaveLength(0); // No rows affected
    });
    
    it('should block cross-tenant DELETE', async () => {
      await setTenantContext('tenant-A');
      
      const deleted = await db.delete(goldCompanies)
        .where(eq(goldCompanies.id, tenantBCompanyId))
        .returning();
      
      expect(deleted).toHaveLength(0);
    });
    
    it('should prevent RLS bypass via raw SQL', async () => {
      await setTenantContext('tenant-A');
      
      // Attempt to bypass with raw SQL
      const result = await db.execute(
        sql`SELECT * FROM gold_companies WHERE id = ${tenantBCompanyId}`
      );
      
      expect(result).toHaveLength(0);
    });
    
    it('should block access when tenant context not set', async () => {
      await db.execute(sql`RESET app.current_tenant_id`);
      
      await expect(
        db.select().from(goldCompanies)
      ).rejects.toThrow(); // RLS should block
    });
  });
  
  describe('IDOR (Insecure Direct Object Reference)', () => {
    
    it('should prevent accessing other user tasks via ID guessing', async () => {
      // Create task for user A
      const taskId = await createApprovalTask({ assignedTo: 'user-A' });
      
      // Try to access as user B via API
      const response = await api
        .get(`/api/v1/approvals/${taskId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      
      expect(response.status).toBe(403);
    });
    
    it('should prevent UUID enumeration', async () => {
      const responses = await Promise.all(
        Array.from({ length: 100 }, () => 
          api.get(`/api/v1/companies/${uuidv4()}`)
            .set('Authorization', `Bearer ${token}`)
        )
      );
      
      // All should be 404, not 403 (to prevent enumeration)
      responses.forEach(r => {
        expect([404, 200]).toContain(r.status);
      });
    });
  });
  
  describe('Privilege Escalation', () => {
    
    it('should prevent user from assigning admin role to self', async () => {
      const response = await api
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ role: 'admin' });
      
      expect(response.status).toBe(403);
    });
    
    it('should prevent accessing admin endpoints', async () => {
      const adminEndpoints = [
        '/api/v1/admin/users',
        '/api/v1/admin/tenants',
        '/api/v1/admin/audit-logs',
      ];
      
      for (const endpoint of adminEndpoints) {
        const response = await api
          .get(endpoint)
          .set('Authorization', `Bearer ${regularUserToken}`);
        
        expect(response.status).toBe(403);
      }
    });
  });
});
```

---

## 2. A03: INJECTION TESTS

### 2.1 SQL Injection

```typescript
// tests/security/sql-injection.test.ts
describe('SQL Injection Prevention', () => {
  
  const maliciousInputs = [
    "'; DROP TABLE companies; --",
    "1' OR '1'='1",
    "1; SELECT * FROM users WHERE '1'='1",
    "1 UNION SELECT password FROM users--",
    "admin'--",
    "1' AND SLEEP(5)#",
    "'; WAITFOR DELAY '00:00:05'--",
  ];
  
  it.each(maliciousInputs)('should sanitize: %s', async (malicious) => {
    const response = await api
      .get(`/api/v1/companies`)
      .query({ search: malicious })
      .set('Authorization', `Bearer ${token}`);
    
    // Should not error or expose data
    expect(response.status).toBe(200);
    expect(response.body.data).not.toContain('password');
  });
  
  it('should use parameterized queries (no string interpolation)', async () => {
    // Verify Drizzle ORM is used correctly
    const spy = vi.spyOn(db, 'execute');
    
    await api
      .get('/api/v1/companies')
      .query({ cui: "12345678' OR '1'='1" })
      .set('Authorization', `Bearer ${token}`);
    
    const [call] = spy.mock.calls;
    // Should be parameterized, not string interpolation
    expect(call[0].sql).not.toContain("' OR '1'='1");
  });
});
```

### 2.2 XSS Prevention

```typescript
// tests/security/xss.test.ts
describe('XSS Prevention', () => {
  
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    '"><script>alert("xss")</script>',
    "javascript:alert('xss')",
    '<svg onload=alert("xss")>',
    '{{constructor.constructor("alert(1)")()}}',
  ];
  
  describe('Stored XSS', () => {
    it.each(xssPayloads)('should escape output: %s', async (payload) => {
      // Store malicious data
      await api
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${token}`)
        .send({ denumire: payload });
      
      // Retrieve and verify escaped
      const response = await api
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${token}`);
      
      const html = JSON.stringify(response.body);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('onerror=');
      expect(html).not.toContain('javascript:');
    });
  });
  
  describe('Reflected XSS', () => {
    it.each(xssPayloads)('should escape in error messages: %s', async (payload) => {
      const response = await api
        .get('/api/v1/companies')
        .query({ search: payload })
        .set('Authorization', `Bearer ${token}`);
      
      // Error message should not reflect unescaped
      const body = JSON.stringify(response.body);
      expect(body).not.toContain('<script>');
    });
  });
});
```

### 2.3 Command Injection

```typescript
// tests/security/command-injection.test.ts
describe('Command Injection Prevention', () => {
  
  const commandInjectionPayloads = [
    '; rm -rf /',
    '| cat /etc/passwd',
    '`whoami`',
    '$(cat /etc/passwd)',
    '\n/bin/bash -i',
  ];
  
  it.each(commandInjectionPayloads)('should prevent: %s', async (payload) => {
    // Test any endpoint that might execute commands (e.g., file processing)
    const response = await api
      .post('/api/v1/import/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('test'), `test${payload}.csv`);
    
    // Should reject or sanitize filename
    expect(response.status).not.toBe(500);
  });
});
```

---

## 3. A05: SECURITY MISCONFIGURATION

### 3.1 Security Headers

```typescript
// tests/security/headers.test.ts
describe('Security Headers', () => {
  let response: Response;
  
  beforeAll(async () => {
    response = await fetch(`${BASE_URL}/api/v1/health`);
  });
  
  it('should have X-Content-Type-Options: nosniff', () => {
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
  
  it('should have X-Frame-Options: DENY', () => {
    const value = response.headers.get('x-frame-options');
    expect(['DENY', 'SAMEORIGIN']).toContain(value);
  });
  
  it('should have Strict-Transport-Security', () => {
    const hsts = response.headers.get('strict-transport-security');
    expect(hsts).toContain('max-age=');
    expect(parseInt(hsts.match(/max-age=(\d+)/)?.[1] || '0')).toBeGreaterThan(31536000);
  });
  
  it('should have Content-Security-Policy', () => {
    expect(response.headers.get('content-security-policy')).toBeDefined();
  });
  
  it('should NOT expose server version', () => {
    expect(response.headers.get('server')).not.toContain('Express');
    expect(response.headers.get('x-powered-by')).toBeNull();
  });
  
  it('should have proper CORS headers', async () => {
    const corsResponse = await fetch(`${BASE_URL}/api/v1/health`, {
      headers: { Origin: 'https://evil.com' },
    });
    
    // Should NOT allow arbitrary origins
    expect(corsResponse.headers.get('access-control-allow-origin'))
      .not.toBe('https://evil.com');
  });
});
```

---

## 4. A06: VULNERABLE COMPONENTS

### 4.1 Dependency Scanning

```bash
#!/bin/bash
# tests/security/dependency-scan.sh

echo "=== Dependency Security Scan ==="

# Trivy FS scan
echo "[1/3] Running Trivy filesystem scan..."
trivy fs --exit-code 1 --severity HIGH,CRITICAL .

if [ $? -ne 0 ]; then
  echo "❌ HIGH/CRITICAL vulnerabilities found!"
  exit 1
fi

# npm audit
echo "[2/3] Running npm audit..."
npm audit --audit-level=high

if [ $? -ne 0 ]; then
  echo "❌ npm audit found high severity issues!"
  exit 1
fi

# Check for outdated packages
echo "[3/3] Checking for outdated packages..."
pnpm outdated --format json > outdated.json

critical_outdated=$(jq '[.[] | select(.current != .latest)] | length' outdated.json)
if [ "$critical_outdated" -gt 50 ]; then
  echo "⚠️ Many outdated packages: $critical_outdated"
fi

echo "✅ All security scans passed"
```

---

## 5. A07: AUTHENTICATION TESTS

### 5.1 JWT Security

```typescript
// tests/security/jwt.test.ts
describe('JWT Security', () => {
  
  it('should reject expired tokens', async () => {
    const expiredToken = createJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
    
    const response = await api
      .get('/api/v1/companies')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('expired');
  });
  
  it('should reject tampered tokens', async () => {
    const token = createValidJwt();
    const tamperedToken = token.slice(0, -1) + 'X'; // Modify last char
    
    const response = await api
      .get('/api/v1/companies')
      .set('Authorization', `Bearer ${tamperedToken}`);
    
    expect(response.status).toBe(401);
  });
  
  it('should reject tokens with wrong algorithm (algorithm confusion)', async () => {
    // Attempt to use 'none' algorithm
    const noneAlgToken = jwt.sign({ sub: 'admin' }, '', { algorithm: 'none' });
    
    const response = await api
      .get('/api/v1/companies')
      .set('Authorization', `Bearer ${noneAlgToken}`);
    
    expect(response.status).toBe(401);
  });
  
  it('should reject tokens signed with wrong secret', async () => {
    const wrongSecretToken = jwt.sign({ sub: 'user' }, 'wrong-secret');
    
    const response = await api
      .get('/api/v1/companies')
      .set('Authorization', `Bearer ${wrongSecretToken}`);
    
    expect(response.status).toBe(401);
  });
  
  it('should have short token lifetime (< 1 hour)', () => {
    const token = createValidJwt();
    const decoded = jwt.decode(token) as { exp: number; iat: number };
    
    const lifetime = decoded.exp - decoded.iat;
    expect(lifetime).toBeLessThan(3600); // < 1 hour
  });
});
```

### 5.2 Brute Force Protection

```typescript
// tests/security/brute-force.test.ts
describe('Brute Force Protection', () => {
  
  it('should rate limit login attempts', async () => {
    const attempts = 15;
    let blockedCount = 0;
    
    for (let i = 0; i < attempts; i++) {
      const response = await api
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
      
      if (response.status === 429) {
        blockedCount++;
      }
    }
    
    // Should start blocking after ~10 attempts
    expect(blockedCount).toBeGreaterThan(0);
  });
  
  it('should not reveal if email exists', async () => {
    const existingEmail = 'existing@cerniq.app';
    const nonExistingEmail = 'nonexistent@cerniq.app';
    
    const [existingResponse, nonExistingResponse] = await Promise.all([
      api.post('/api/v1/auth/login').send({ email: existingEmail, password: 'wrong' }),
      api.post('/api/v1/auth/login').send({ email: nonExistingEmail, password: 'wrong' }),
    ]);
    
    // Same response to prevent enumeration
    expect(existingResponse.status).toBe(nonExistingResponse.status);
    expect(existingResponse.body.message).toBe(nonExistingResponse.body.message);
  });
});
```

---

## 6. A10: SSRF TESTS

```typescript
// tests/security/ssrf.test.ts
describe('SSRF Prevention', () => {
  
  const ssrfPayloads = [
    'http://localhost/admin',
    'http://127.0.0.1:22',
    'http://169.254.169.254/latest/meta-data/', // AWS metadata
    'http://[::1]/',
    'http://0.0.0.0/',
    'http://internal-service.local/',
    'file:///etc/passwd',
    'dict://localhost:6379/INFO',
  ];
  
  it.each(ssrfPayloads)('should block: %s', async (url) => {
    // Test any endpoint that accepts URLs (e.g., webhook config, scraping)
    const response = await api
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({ callbackUrl: url });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('invalid');
  });
  
  it('should only allow HTTPS for external webhooks', async () => {
    const response = await api
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({ callbackUrl: 'http://example.com/webhook' });
    
    expect(response.status).toBe(400);
  });
});
```

---

## CI INTEGRATION

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 3 * * *' # Daily at 3 AM

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy FS Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif

  zap:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Run OWASP ZAP Baseline
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'https://staging.cerniq.app'
          fail_action: true

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test:security
```

---

## CHECKLIST VALIDARE

- [ ] RLS blocks cross-tenant access
- [ ] No SQL injection vulnerabilities
- [ ] XSS payloads are escaped
- [ ] Security headers configured
- [ ] No HIGH/CRITICAL dependencies
- [ ] JWT properly validated
- [ ] Brute force protection active
- [ ] SSRF blocked

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2, OWASP ASVS 4.0
