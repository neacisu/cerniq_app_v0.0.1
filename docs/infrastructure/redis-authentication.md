# Redis Authentication (AUTH)

## Scope
Activarea autentificării Redis folosind **OpenBao** pentru gestionarea parolelor.

> **Actualizat:** 5 Februarie 2026 - Migrare de la Docker secrets la OpenBao

## Obiective
- Eliminarea accesului neautentificat
- Compatibilitate BullMQ
- Zero expunere publică
- Rotație automată via OpenBao

## Configurare (OpenBao)

### 1. Parola Redis în OpenBao
```bash
bao kv put secret/cerniq/api/config \
    redis_password="$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 64)"
```

### 2. Template OpenBao Agent
```gotemplate
{{- with secret "secret/data/cerniq/api/config" -}}
REDIS_URL=redis://:{{ .Data.data.redis_password }}@redis:64039/0
{{- end -}}
```

### 3. Serviciul Redis
Redis primește parola din variabila de environment care e injectată prin Agent template.

## Validare
- `redis-cli ping` fără auth eșuează
- `redis-cli -a <pass> ping` răspunde `PONG`
- Jobs BullMQ rulează normal
- Parola există în OpenBao: `bao kv get secret/cerniq/api/config`

## Rotație
Parola Redis se rotește trimestrial via script:
```bash
./infra/scripts/openbao-rotate-static-secrets.sh
```

## Referințe
- ADR-0006 Redis + BullMQ
- **ADR-0033 OpenBao Secrets Management** (înlocuiește ADR-0017)
- [OpenBao Setup Guide](./openbao-setup-guide.md)
- [Secrets Rotation Procedure](./secrets-rotation-procedure.md)
- Etapa 0 plan: F0.3.2.T001
