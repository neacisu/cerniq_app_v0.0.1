# ADR-0017: Secrets Management Strategy

**Status:** ⚠️ **SUPERSEDED** by [ADR-0033: OpenBao Secrets Management](./ADR-0033-OpenBao-Secrets-Management.md)  
**Data:** 2026-01-15  
**Superseded Date:** 2026-02-05  
**Deciders:** Alex (1-Person-Team)

> **Notă:** Această strategie a fost înlocuită cu OpenBao pentru management centralizat și automatizat al secretelor.
> Docker secrets rămân disponibile ca fallback pentru development local.

## Context

Credențiale sensibile (database passwords, API keys, JWT secrets) trebuie gestionate securizat.

## Decizie

Utilizăm **Docker secrets** pentru production, **.env** pentru development.

## Consecințe

### Implementare

```yaml
# docker-compose.yml
services:
  api:
    secrets:
      - postgres_password
      - jwt_secret
      - anaf_client_secret
    environment:
      - DATABASE_URL_FILE=/run/secrets/postgres_password

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### Pattern `_FILE` Suffix

```typescript
// Citire secret din file
function readSecret(name: string): string {
  const filePath = process.env[`${name}_FILE`];
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8').trim();
  }
  return process.env[name] ?? '';
}

const dbPassword = readSecret('DATABASE_PASSWORD');
```

### Restricții

- **NICIODATĂ** commit secrets în git
- Permissions 600 pe secret files
- Rotation quarterly pentru API keys

## Documentație Detaliată

Pentru ghid complet cu scripturi, proceduri de rotație și security audit, vezi:
**[`docs/specifications/Etapa 0/etapa0-docker-secrets-guide.md`](../../specifications/Etapa%200/etapa0-docker-secrets-guide.md)**

## Compliance

- **GDPR Art. 32** - Măsuri tehnice pentru securitatea datelor
- **ISO 27001** - Control acces și management credențiale
