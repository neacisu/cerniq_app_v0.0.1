# Redis Authentication (AUTH)

## Scope
Activarea autentificării Redis folosind Docker secrets pentru Etapa 0.

## Obiective
- Eliminarea accesului neautentificat
- Compatibilitate BullMQ
- Zero expunere publică

## Configurare
1. Creează secret `redis_password.txt` în `/secrets`
2. Actualizează serviciul Redis cu `--requirepass` (via secret file)
3. Actualizează aplicațiile cu `REDIS_PASSWORD_FILE`

## Validare
- `redis-cli ping` fără auth eșuează
- `redis-cli -a <pass> ping` răspunde `PONG`
- Jobs BullMQ rulează normal

## Referințe
- ADR-0006 Redis + BullMQ
- ADR-0017 Secrets Management
- Etapa 0 plan: F0.3.2.T001
