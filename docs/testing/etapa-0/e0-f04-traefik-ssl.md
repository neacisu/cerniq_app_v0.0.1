# CERNIQ.APP — TESTE F0.4: TRAEFIK & SSL

## Teste pentru Traefik reverse proxy și TLS

**Fază:** F0.4 | **Taskuri:** 4

---

## TESTE

### TLS Configuration

```bash
#!/bin/bash
# tests/infra/f04-tls.test.sh

describe "TLS Configuration" {
  
  it "should enforce TLS 1.2 minimum" {
    # Test that TLS 1.1 is rejected
    ! openssl s_client -connect api.cerniq.app:443 -tls1_1 2>&1 | grep -q "Protocol  : TLSv1.1"
    assert_success
  }
  
  it "should accept TLS 1.3" {
    openssl s_client -connect api.cerniq.app:443 -tls1_3 2>&1 | grep -q "Protocol  : TLSv1.3"
    assert_success
  }
  
  it "should have valid SSL certificate" {
    curl -sI https://api.cerniq.app | grep -q "HTTP/2 200\|HTTP/1.1 200"
    assert_success
  }
  
  it "should redirect HTTP to HTTPS" {
    response=$(curl -sI http://api.cerniq.app -o /dev/null -w "%{http_code}")
    [[ "$response" == "301" || "$response" == "308" ]]
    assert_success
  }
}
```

### Traefik Dashboard

```typescript
describe('Traefik Configuration', () => {
  
  it('should expose metrics on :64093', async () => {
    const response = await fetch('http://localhost:64093/metrics');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('traefik_');
  });
  
  it('should have API router configured', async () => {
    const response = await fetch('http://localhost:64093/api/http/routers');
    const routers = await response.json();
    
    expect(routers.find(r => r.name.includes('api'))).toBeDefined();
  });
  
  it('should have rate limit middleware', async () => {
    const response = await fetch('http://localhost:64093/api/http/middlewares');
    const middlewares = await response.json();
    
    expect(middlewares.find(m => m.name.includes('ratelimit'))).toBeDefined();
  });
});
```

---

## CHECKLIST

- [ ] TLS 1.2+ enforced
- [ ] HTTP → HTTPS redirect
- [ ] Valid SSL certificate
- [ ] Metrics exposed :64093
- [ ] Rate limit middleware active

---

**Document generat:** 20 Ianuarie 2026
