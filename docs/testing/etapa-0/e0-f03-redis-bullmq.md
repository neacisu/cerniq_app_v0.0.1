# CERNIQ.APP — TESTE F0.3: REDIS + BULLMQ (Infra noua)

> **Ultima actualizare:** 2026-02-15  
> **Context:** In infrastructura noua, Redis este shared pe orchestrator; nu exista container `cerniq-redis` pe CT109/CT110.

## T001: Redis este extern/shared (nu local)

**Scop:** Verifica ca stack-ul Cerniq nu porneste Redis local in staging/prod.

```bash
docker ps --format '{{.Names}}' | rg '^cerniq-redis$' && exit 1 || true
```

## T002: Conectivitate (REDIS_URL)

**Scop:** Verifica ca serviciile pot face `PING` catre Redis shared folosind `REDIS_URL` (din OpenBao Agent templates).

```bash
redis-cli -u "$REDIS_URL" PING
```

## T003: Izolare BullMQ (prefix)

**Scop:** cheile BullMQ trebuie sa aiba prefix dedicat Cerniq (ex: `cerniq:`), pentru a evita coliziuni pe Redis shared.

- `BULLMQ_PREFIX` recomandat: `cerniq:e0` (sau `cerniq:<env>`)

## Checklist

- [ ] Nu exista container `cerniq-redis` in staging/prod
- [ ] `redis-cli -u "$REDIS_URL" PING` returneaza `PONG`
- [ ] BullMQ foloseste prefix `cerniq:`
- [ ] Nu expunem `:6379` public

# CERNIQ.APP — TESTE F0.3: REDIS + BULLMQ (Infra noua)

> **Ultima actualizare:** 2026-02-15  
> **Context:** In infrastructura noua, Redis este shared pe orchestrator; nu exista container `cerniq-redis` pe CT109/CT110.

## T001: Redis este extern/shared (nu local)

**Scop:** Verifica ca stack-ul Cerniq nu porneste Redis local in staging/prod.

```bash
docker ps --format '{{.Names}}' | rg '^cerniq-redis$' && exit 1 || true
```

## T002: Conectivitate (REDIS_URL)

**Scop:** Verifica ca serviciile pot face `PING` catre Redis shared folosind `REDIS_URL` (din OpenBao Agent templates).

```bash
# Exemplu: ruleaza in containerul API (daca are redis-cli) sau din host (daca ai redis-cli instalat)
redis-cli -u "$REDIS_URL" PING
```

## T003: Izolare BullMQ (prefix)

**Scop:** cheile BullMQ trebuie sa aiba prefix dedicat Cerniq (ex: `cerniq:`), pentru a evita coliziuni pe Redis shared.

- `BULLMQ_PREFIX` recomandat: `cerniq:e0` (sau `cerniq:<env>`)

## Checklist

- [ ] Nu exista container `cerniq-redis` in staging/prod
- [ ] `redis-cli -u "$REDIS_URL" PING` returneaza `PONG`
- [ ] BullMQ foloseste prefix `cerniq:`
- [ ] Nu expunem `:6379` public

