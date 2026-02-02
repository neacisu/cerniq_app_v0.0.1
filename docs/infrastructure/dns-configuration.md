# DNS Configuration

## Scope
Configurare DNS pentru cerniq.app și subdomenii critice (Etapa 0).

## Records obligatorii
- `cerniq.app` → A/AAAA către IP server
- `www.cerniq.app` → CNAME către cerniq.app
- `api.cerniq.app` → A/AAAA
- `admin.cerniq.app` → A/AAAA
- `monitoring.cerniq.app` → A/AAAA
- `traefik.cerniq.app` → A/AAAA (opțional, acces restricționat)

## Recomandări
- TTL 300-600s pentru flexibilitate inițială
- Verificare propagation globală
- Revizuire după stabilizare (TTL 3600s)

## Validare
- `dig +short` returnează IP corect
- SSL challenge pentru Traefik funcționează

## Referințe
- ADR-0022 Port Allocation Strategy
- Etapa 0 plan: F0.16.1.T001-T003
