# PgBouncer Connection Pooling

## Scope
Documentează configurarea PgBouncer pentru PostgreSQL (Etapa 0), pentru a limita numărul de conexiuni active și a stabiliza performanța.

## De ce este necesar
- `max_connections` limitat la 200
- Workers și API pot crea spike de conexiuni
- Pooling reduce overhead-ul pe PostgreSQL

## Configurare recomandată
- **Pool mode:** `transaction`
- **Max client conn:** 1000
- **Default pool size:** 50
- **Reserve pool size:** 20
- **Auth type:** `scram-sha-256`

## Pași
1. Adaugă serviciul PgBouncer în docker-compose
2. Creează `pgbouncer.ini` și `userlist.txt`
3. Configurează secrets pentru parole
4. Validează conexiunea API către PgBouncer

## Validare
- Conexiuni active în PostgreSQL scad sub prag
- Aplicația poate executa query-uri prin PgBouncer
- Latency stabil sub load moderat

## Referințe
- ADR-0004 PostgreSQL 18.1
- ADR-0015 Docker Containerization
- Etapa 0 plan: F0.2.2.T004
