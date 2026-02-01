# ADR-0015: Docker Containerization Strategy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Toate serviciile Cerniq.app rulează în containere Docker pe Hetzner bare metal (128GB RAM, 20 cores).

## Decizie

Utilizăm **Docker Engine 29.1.3** cu **Docker Compose v2.40+** pentru orchestrare.

## Consecințe

### Configurație daemon.json

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {"max-size": "50m", "max-file": "5"},
  "live-restore": true,
  "userland-proxy": false,
  "default-ulimits": {
    "nofile": {"Name": "nofile", "Soft": 65536, "Hard": 65536}
  },
  "default-address-pools": [
    {"base": "172.20.0.0/16", "size": 24}
  ],
  "metrics-addr": "0.0.0.0:64093"
}
```

### Network Architecture

```yaml
networks:
  cerniq_public:     # Traefik + servicii expuse
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  cerniq_backend:    # API + Workers (intern)
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/24
  cerniq_data:       # PostgreSQL + Redis (strict intern)
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.22.0.0/24
```
