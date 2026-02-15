# CERNIQ.APP — TESTE F0.4: INGRESS & TLS (TRAEFIK ORCHESTRATOR)

## Teste pentru ingress centralizat si TLS

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
    # Nota: necesita DNS cutover + deploy aplicatie
    curl -sI https://api.cerniq.app | grep -q "HTTP/"
    assert_success
  }

  it "should redirect HTTP to HTTPS" {
    response=$(curl -sI http://api.cerniq.app -o /dev/null -w "%{http_code}")
    [[ "$response" == "301" || "$response" == "308" ]]
    assert_success
  }
}
```

### Verificare configuratie Traefik (file provider)

Traefik este centralizat pe orchestrator; nu exista Traefik local in stack-ul aplicatiei.

Validare recomandata (orchestrator):

- `sha256sum` pentru `infra/config/traefik-orchestrator/cerniq.yml` vs `/opt/traefik/dynamic/cerniq.yml`
- `curl -k -I -H 'Host: staging.cerniq.app' https://77.42.76.185` (dupa deploy app)

---

## CHECKLIST

- [ ] TLS 1.2+ enforced
- [ ] HTTP → HTTPS redirect
- [ ] Valid SSL certificate
- [ ] Config Traefik (orchestrator) contine routerele Cerniq

---

**Document generat:** 20 Ianuarie 2026
