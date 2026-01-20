# ADR-0014: Traefik v3.6.6 ca Reverse Proxy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm reverse proxy pentru:

- SSL/TLS termination cu Let's Encrypt automat
- Docker service discovery
- Rate limiting
- Circuit breakers

## Decizie

Utilizăm **Traefik v3.6.6** cu Docker provider.

## Consecințe

### Pozitive

- Certificate management automat (zero intervenție)
- Docker labels pentru routing
- HTTP/3 (QUIC) support
- Middleware chain (rate limit, auth, compress)

### Configurație CRITICĂ

```yaml
# traefik.yml
global:
  checkNewVersion: false
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ":443"
    http3: {}

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false  # OBLIGATORIU!
    network: cerniq_public

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@cerniq.app
      storage: /acme.json
      httpChallenge:
        entryPoint: web
```

### Restricții

- `exposedByDefault: false` este **OBLIGATORIU**
- Dashboard **NU** expus public fără BasicAuth + IP whitelist
- Rate limiting: 100 req/s average, 200 burst
