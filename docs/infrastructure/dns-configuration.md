# DNS Configuration

## Scope

Configurare DNS pentru rutarea publica prin Traefik-ul din orchestrator.

## Mandatory Records (`cerniq.app`)

Toate record-urile publice Cerniq trebuie sa pointeze la IP-ul orchestratorului.

| Record | Type | Target |
| --- | --- | --- |
| `cerniq.app` | A | `77.42.76.185` |
| `www.cerniq.app` | CNAME | `cerniq.app` |
| `api.cerniq.app` | A | `77.42.76.185` |
| `admin.cerniq.app` | A | `77.42.76.185` |
| `staging.cerniq.app` | A | `77.42.76.185` |
| `api.staging.cerniq.app` | A | `77.42.76.185` |
| `admin.staging.cerniq.app` | A | `77.42.76.185` |
| `monitoring.cerniq.app` | A | `77.42.76.185` |
| `signoz.cerniq.app` | A | `77.42.76.185` |
| `traefik.cerniq.app` | A | `77.42.76.185` |

## Recommendations

- TTL `60` cu 24h inainte de cutover.
- Dupa stabilizare, creste TTL la `3600`.
- Foloseste `DNS only` (grey cloud) daca TLS este terminat in Traefik orchestrator.

## Validation

- `dig +short cerniq.app` returneaza `77.42.76.185`.
- `dig +short staging.cerniq.app` returneaza `77.42.76.185`.
- `curl -I https://cerniq.app` si `curl -I https://staging.cerniq.app` returneaza raspuns HTTPS valid.
