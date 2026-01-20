# ADR-0002: Node.js v24 LTS "Krypton"

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Backend API-ul Cerniq.app necesită un runtime JavaScript stabil cu suport long-term. Node.js v24 "Krypton" a intrat în Active LTS pe 28 Octombrie 2025.

## Decizie

Utilizăm **Node.js v24.12.0 LTS** cu V8 13.6 pentru toate serviciile backend TypeScript.

## Consecințe

### Pozitive

- LTS support până **Aprilie 2028**
- ESM ca standard (`type: "module"`)
- Native watch mode (`node --watch`) eliminând nodemon
- npm 11.x bundled
- OpenSSL 3.5 pentru securitate îmbunătățită
- `require(esm)` pentru interoperabilitate

### Negative

- Unele packages legacy pot necesita actualizare

### Configurație Container

```dockerfile
FROM node:24-alpine AS builder
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Tini pentru signal handling
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
```

### Restricții

- **NU** folosi nodemon - utilizează `node --watch`
- **NU** folosi CommonJS - totul în ESM (`type: "module"`)
- Memory limit: 75% din container allocation
