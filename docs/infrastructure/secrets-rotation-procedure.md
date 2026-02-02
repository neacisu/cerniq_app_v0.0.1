# Secrets Rotation Procedure

## Scope
Procedură standard de rotație a secretelor (trimestrial) pentru Etapa 0.

## Secrete acoperite
- PostgreSQL password
- Redis password
- JWT private/public keys
- API keys pentru provideri externi

## Pași
1. Generează secrete noi (script `generate-secrets.sh`)
2. Actualizează Docker secrets
3. Redeploy servicii în ordine controlată
4. Revocă secretele vechi
5. Validează funcționarea

## Frecvență
- Trimestrial (Q1, Q2, Q3, Q4)
- Imediat după incident de securitate

## Validare
- Conexiuni active cu noile secrete
- CI/CD utilizează noile secrets

## Referințe
- ADR-0017 Secrets Management
- Etapa 0 plan: F0.8.2.T002
