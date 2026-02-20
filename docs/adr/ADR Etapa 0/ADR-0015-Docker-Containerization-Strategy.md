# ADR-0015: Docker Containerization Strategy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Serviciile Cerniq.app ruleaza in containere Docker in LXCs dedicate (CT109/CT110/CT108), iar resursele shared (Traefik, OpenBao, Redis, Observability) ruleaza pe orchestrator.

## Decizie

Utilizam Docker Engine si Docker Compose v2 pentru orchestrare (versiuni curente in momentul instalarii pe hosturile/LXC-urile dedicate).

## Consecințe

### Configurație daemon.json

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" },
  "live-restore": true,
  "userland-proxy": false,
  "default-ulimits": {
    "nofile": { "Name": "nofile", "Soft": 65536, "Hard": 65536 }
  },
  "default-address-pools": [{ "base": "172.29.0.0/16", "size": 24 }],
  "metrics-addr": "127.0.0.1:9323"
}
```

### Network Architecture

```yaml
networks:
  cerniq_public: # Servicii expuse (prin Traefik orchestrator)
    driver: bridge
    ipam:
      config:
        - subnet: 172.29.10.0/24
  cerniq_backend: # API + Workers (intern logic)
    driver: bridge
    ipam:
      config:
        - subnet: 172.29.20.0/24
  cerniq_data: # PgBouncer + agenti + collectors (intern logic)
    driver: bridge
    ipam:
      config:
        - subnet: 172.29.30.0/24
```

Nota: In implementarea curenta pe CT-uri, retelele Docker nu sunt marcate `internal: true`.
Controlul de egress (trafic extern) este realizat la nivel de infrastructura (iptables pe `hz.247`), pentru a evita edge-case-uri in LXC si pentru a pastra networking-ul simplu si predictibil.
