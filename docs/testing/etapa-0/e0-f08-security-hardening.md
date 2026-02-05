# CERNIQ.APP — TESTE F0.8: SECURITY HARDENING

## Teste pentru OpenBao și firewall

**Fază:** F0.8 | **Taskuri:** 4  
**Actualizat:** 5 Februarie 2026 (OpenBao înlocuiește Docker secrets)

---

## TESTE

```bash
describe "Security Hardening" {
  it "should have UFW enabled" {
    ufw status | grep -q "Status: active"
  }
  
  it "should only allow ports 80, 443, 22" {
    ufw status | grep -E "80|443|22"
  }
  
  it "should have OpenBao running and unsealed" {
    curl -s http://localhost:64200/v1/sys/health | jq -e '.sealed == false'
  }
  
  it "should have secrets directory protected" {
    perms=$(stat -c %a /var/www/CerniqAPP/secrets)
    [[ "$perms" == "700" ]]
  }
  
  it "should not expose Docker socket" {
    ! curl -s --unix-socket /var/run/docker.sock http://localhost/info
  }
}
```

```typescript
describe('Container Security', () => {
  it('should run as non-root user', async () => {
    const { stdout } = await exec('docker exec cerniq-api id -u');
    expect(parseInt(stdout.trim())).toBeGreaterThan(0);
  });
  
  it('should have read-only filesystem where possible', async () => {
    const inspect = await exec('docker inspect cerniq-api --format "{{.HostConfig.ReadonlyRootfs}}"');
    // Check security options
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
